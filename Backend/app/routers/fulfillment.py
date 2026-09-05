from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date, timedelta
import uuid
from app.database import get_db
from app.models.quotation import Quotation, QuotationLine
from app.models.warehouse import Warehouse, Stock, StockMovement
from app.models.fulfillment import FulfillmentOrder, FulfillmentSplitLine, BackorderLine
from app.models.billing import Invoice, InvoiceLine
from app.models.user import User
from app.schemas.fulfillment import (
    FulfillmentSuggestionOut, FulfillmentOrderOut, FulfillmentOverrideRequest
)
from app.routers.auth import get_current_user, require_role
from app.core.warehouse_split import calculate_warehouse_split
from app.core.audit import create_audit_log
from app.core.timeutils import utcnow

router = APIRouter(prefix="/fulfillment", tags=["Fulfillment & Warehouse Split"])

def _format_order_out(fo: FulfillmentOrder) -> FulfillmentOrderOut:
    splits_out = []
    for s in fo.split_lines:
        splits_out.append({
            "id": s.id,
            "warehouse_id": s.warehouse_id,
            "warehouse_name": s.warehouse.name if s.warehouse else "",
            "product_id": s.product_id,
            "product_name": s.product.name if s.product else "",
            "qty_allocated": s.qty_allocated,
            "status": s.status
        })
    backorders_out = []
    for b in fo.backorders:
        backorders_out.append({
            "id": b.id,
            "product_id": b.product_id,
            "product_name": b.product.name if b.product else "",
            "qty_backordered": b.qty_backordered,
            "is_consolidated": b.is_consolidated,
            "created_at": b.created_at
        })
    
    return FulfillmentOrderOut(
        id=fo.id,
        order_number=fo.order_number,
        quotation_id=fo.quotation_id,
        quote_number=fo.quotation.quote_number if fo.quotation else "",
        status=fo.status,
        est_ship_date=fo.est_ship_date,
        actual_ship_date=fo.actual_ship_date,
        total_shipments=fo.total_shipments,
        total_shipping_cost=fo.total_shipping_cost,
        is_split=fo.is_split,
        override_reason=fo.override_reason,
        created_at=fo.created_at,
        split_lines=splits_out,
        backorders=backorders_out
    )

@router.get("/quotation/{quotation_id}/suggestion", response_model=FulfillmentSuggestionOut)
async def get_fulfillment_suggestion(quotation_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.lines).selectinload(QuotationLine.product))
        .where(Quotation.id == quotation_id)
    )
    quote = res.scalars().first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    physical_items = []
    for l in quote.lines:
        if not l.is_recurring and l.product and l.product.category.lower() == "hardware":
            physical_items.append({
                "product_id": l.product_id,
                "product_name": l.product.name,
                "qty": l.qty
            })

    suggestion = await calculate_warehouse_split(db, physical_items)
    suggestion["quotation_id"] = quotation_id
    return suggestion

@router.post("/quotation/{quotation_id}/accept", response_model=FulfillmentOrderOut)
async def accept_suggested_split(
    quotation_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    res = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.lines).selectinload(QuotationLine.product))
        .where(Quotation.id == quotation_id)
    )
    quote = res.scalars().first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    physical_items = []
    line_map = {}
    for l in quote.lines:
        if not l.is_recurring and l.product and l.product.category.lower() == "hardware":
            physical_items.append({
                "product_id": l.product_id,
                "product_name": l.product.name,
                "qty": l.qty
            })
            line_map[l.product_id] = l.id

    suggestion = await calculate_warehouse_split(db, physical_items)

    fo = FulfillmentOrder(
        order_number=f"FO-{int(utcnow().timestamp())}-{uuid.uuid4().hex[:6].upper()}",
        quotation_id=quote.id,
        status="accepted",
        est_ship_date=date.today() + timedelta(days=2),
        total_shipments=suggestion["total_shipments"],
        total_shipping_cost=suggestion["estimated_shipping_cost"],
        is_split=suggestion["is_split"]
    )
    db.add(fo)
    await db.flush()

    for alloc in suggestion["allocations"]:
        q_line_id = line_map.get(alloc["product_id"])
        split_line = FulfillmentSplitLine(
            fulfillment_order_id=fo.id,
            quotation_line_id=q_line_id,
            warehouse_id=alloc["warehouse_id"],
            product_id=alloc["product_id"],
            qty_allocated=alloc["qty_allocated"],
            status="allocated"
        )
        db.add(split_line)

        # Reserve stock
        s_res = await db.execute(
            select(Stock).where(
                Stock.warehouse_id == alloc["warehouse_id"],
                Stock.product_id == alloc["product_id"]
            )
        )
        st = s_res.scalars().first()
        if st:
            st.qty_available -= alloc["qty_allocated"]
            st.qty_reserved += alloc["qty_allocated"]

    for bo in suggestion["backorders"]:
        q_line_id = line_map.get(bo["product_id"])
        backorder_line = BackorderLine(
            fulfillment_order_id=fo.id,
            quotation_line_id=q_line_id,
            product_id=bo["product_id"],
            qty_backordered=bo["qty_backordered"],
            is_consolidated=False
        )
        db.add(backorder_line)

    quote.status = "confirmed"
    await db.commit()

    await create_audit_log(
        db, "fulfillment", fo.id, "accept_split", user,
        f"Accepted split with {fo.total_shipments} shipment(s). Estimated shipping ${fo.total_shipping_cost}."
    )

    # Reload
    res = await db.execute(
        select(FulfillmentOrder)
        .options(
            selectinload(FulfillmentOrder.quotation),
            selectinload(FulfillmentOrder.split_lines).selectinload(FulfillmentSplitLine.warehouse),
            selectinload(FulfillmentOrder.split_lines).selectinload(FulfillmentSplitLine.product),
            selectinload(FulfillmentOrder.backorders).selectinload(BackorderLine.product)
        )
        .where(FulfillmentOrder.id == fo.id)
    )
    return _format_order_out(res.scalars().first())

@router.post("/quotation/{quotation_id}/override", response_model=FulfillmentOrderOut)
async def override_fulfillment_split(
    quotation_id: str,
    req: FulfillmentOverrideRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(["finance_ops", "admin"]))
):
    res = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.lines).selectinload(QuotationLine.product))
        .where(Quotation.id == quotation_id)
    )
    quote = res.scalars().first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    line_map = {l.product_id: l.id for l in quote.lines}
    warehouses_used = {a.warehouse_id for a in req.allocations}

    fo = FulfillmentOrder(
        order_number=f"FO-OVR-{int(utcnow().timestamp())}-{uuid.uuid4().hex[:6].upper()}",
        quotation_id=quote.id,
        status="accepted",
        est_ship_date=date.today() + timedelta(days=2),
        total_shipments=len(warehouses_used),
        total_shipping_cost=round(15.0 * len(warehouses_used), 2),
        is_split=len(warehouses_used) > 1,
        override_reason=req.reason
    )
    db.add(fo)
    await db.flush()

    for a in req.allocations:
        split_line = FulfillmentSplitLine(
            fulfillment_order_id=fo.id,
            quotation_line_id=line_map.get(a.product_id, quote.lines[0].id),
            warehouse_id=a.warehouse_id,
            product_id=a.product_id,
            qty_allocated=a.qty_allocated,
            status="allocated"
        )
        db.add(split_line)

    quote.status = "confirmed"
    await db.commit()

    await create_audit_log(
        db, "fulfillment", fo.id, "override_split", user,
        f"Manual split override applied by {user.full_name}. Reason: {req.reason}"
    )

    res = await db.execute(
        select(FulfillmentOrder)
        .options(
            selectinload(FulfillmentOrder.quotation),
            selectinload(FulfillmentOrder.split_lines).selectinload(FulfillmentSplitLine.warehouse),
            selectinload(FulfillmentOrder.split_lines).selectinload(FulfillmentSplitLine.product),
            selectinload(FulfillmentOrder.backorders).selectinload(BackorderLine.product)
        )
        .where(FulfillmentOrder.id == fo.id)
    )
    return _format_order_out(res.scalars().first())

@router.get("/orders", response_model=List[FulfillmentOrderOut])
async def list_fulfillment_orders(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(FulfillmentOrder)
        .options(
            selectinload(FulfillmentOrder.quotation),
            selectinload(FulfillmentOrder.split_lines).selectinload(FulfillmentSplitLine.warehouse),
            selectinload(FulfillmentOrder.split_lines).selectinload(FulfillmentSplitLine.product),
            selectinload(FulfillmentOrder.backorders).selectinload(BackorderLine.product)
        )
        .order_by(FulfillmentOrder.created_at.desc())
    )
    return [_format_order_out(fo) for fo in res.scalars().all()]

@router.post("/orders/{order_id}/ship")
async def ship_fulfillment_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Marks order as shipped.
    CRITICAL RULE from §4 row B7 & §5.3:
    'Invoice per shipment — nothing billed before ship!'
    This endpoint creates the invoice for the physical shipped goods.
    """
    res = await db.execute(
        select(FulfillmentOrder)
        .options(
            selectinload(FulfillmentOrder.quotation),
            selectinload(FulfillmentOrder.split_lines).selectinload(FulfillmentSplitLine.product)
        )
        .where(FulfillmentOrder.id == order_id)
    )
    fo = res.scalars().first()
    if not fo:
        raise HTTPException(status_code=404, detail="Fulfillment order not found")

    fo.status = "shipped"
    fo.actual_ship_date = utcnow()

    # Create Invoice for this shipment
    quote = fo.quotation
    inv_num = f"INV-SHIP-{int(utcnow().timestamp())}-{uuid.uuid4().hex[:6].upper()}"
    
    subtotal = 0.0
    invoice = Invoice(
        invoice_number=inv_num,
        quotation_id=quote.id,
        customer_id=quote.customer_id,
        fulfillment_order_id=fo.id,
        invoice_type="shipment_goods",
        status="issued",
        due_date=date.today() + timedelta(days=30)
    )
    db.add(invoice)
    await db.flush()

    for sl in fo.split_lines:
        prod = sl.product
        line_price = prod.base_price * sl.qty_allocated
        subtotal += line_price
        inv_line = InvoiceLine(
            invoice_id=invoice.id,
            product_id=prod.id,
            description=f"Shipped {prod.name} (Qty: {sl.qty_allocated})",
            qty=sl.qty_allocated,
            unit_price=prod.base_price,
            line_total=line_price,
            is_recurring=False
        )
        db.add(inv_line)

    invoice.subtotal = round(subtotal, 2)
    invoice.tax_amount = round(subtotal * 0.10, 2)
    invoice.total_amount = round(subtotal * 1.10, 2)

    await db.commit()
    await create_audit_log(
        db, "fulfillment", fo.id, "shipped", user,
        f"Fulfillment #{fo.order_number} marked as shipped. Generated Invoice #{invoice.invoice_number}."
    )
    return {"status": "shipped", "invoice_id": invoice.id, "invoice_number": invoice.invoice_number}

@router.post("/orders/{order_id}/consolidate-backorders")
async def consolidate_backorders(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Auto-triggered or manually clicked when stock arrives:
    Checks if stock has arrived to satisfy backordered lines and consolidates.
    """
    res = await db.execute(
        select(FulfillmentOrder)
        .options(
            selectinload(FulfillmentOrder.backorders).selectinload(BackorderLine.product),
            selectinload(FulfillmentOrder.split_lines)
        )
        .where(FulfillmentOrder.id == order_id)
    )
    fo = res.scalars().first()
    if not fo:
        raise HTTPException(status_code=404, detail="Fulfillment order not found")

    consolidated_count = 0
    for bo in fo.backorders:
        if not bo.is_consolidated:
            # Check stock
            st_res = await db.execute(
                select(Stock)
                .where(Stock.product_id == bo.product_id, Stock.qty_available >= bo.qty_backordered)
            )
            st = st_res.scalars().first()
            if st:
                bo.is_consolidated = True
                st.qty_available -= bo.qty_backordered
                st.qty_reserved += bo.qty_backordered
                
                # Add a new split line for the consolidated shipment
                split_line = FulfillmentSplitLine(
                    fulfillment_order_id=fo.id,
                    quotation_line_id=bo.quotation_line_id,
                    warehouse_id=st.warehouse_id,
                    product_id=bo.product_id,
                    qty_allocated=bo.qty_backordered,
                    status="allocated"
                )
                db.add(split_line)
                fo.total_shipments += 1
                consolidated_count += 1

    await db.commit()
    return {
        "status": "success",
        "consolidated_items": consolidated_count,
        "message": f"Consolidated {consolidated_count} backordered items into order shipments."
    }
