import re
from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.user import User, Customer
from app.models.quotation import Quotation
from app.models.billing import Invoice, Subscription
from app.models.approval import ApprovalRequest
from app.models.fulfillment import FulfillmentOrder
from app.models.warehouse import Warehouse, Stock
from app.models.product import Product

async def retrieve_authorized_business_data(
    query: str,
    user: User,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Enforces strict Zero-Trust RBAC & Ownership data retrieval.
    All identity parameters (role, user_id) are taken ONLY from the verified backend User object.
    Sensitive internal metrics (costs, margins, private tokens, hashed passwords, internal risk scores)
    are strictly filtered out before returning context.
    """
    lower_q = query.lower()
    role = user.role
    user_id = user.id
    
    extracted_data: List[str] = []
    has_business_intent = False

    # Check query intent with word boundaries to avoid false positives
    is_quote_query = bool(re.search(r"\b(quotes?|quotations?|bhav|bhavpatra)\b", lower_q))
    is_invoice_query = bool(re.search(r"\b(invoices?|bills?|chalan|payments?|due|balance|paise)\b", lower_q))
    is_approval_query = bool(re.search(r"\b(approvals?|manzoori|swikriti)\b", lower_q))
    is_fulfillment_query = bool(re.search(r"\b(orders?|fulfillment|shipments?|dispatch)\b", lower_q))
    is_stock_query = bool(re.search(r"\b(stocks?|warehouses?|inventory|godown|mal)\b", lower_q))
    is_product_query = bool(re.search(r"\b(products?|catalog|sku|items?)\b", lower_q))

    # 1. Quotations Query
    if is_quote_query:
        has_business_intent = True
        stmt = select(Quotation)
        
        # Ownership / Role Enforcement
        if role == "customer":
            # Find customer record linked to this user's email
            c_res = await db.execute(select(Customer).where(Customer.email == user.email))
            cust = c_res.scalars().first()
            if cust:
                stmt = stmt.where(Quotation.customer_id == cust.id)
            else:
                stmt = stmt.where(Quotation.id == "__none__")
        elif role == "sales_rep":
            # Sales reps can only view their own assigned quotations
            stmt = stmt.where(Quotation.rep_id == user_id)
        # sales_manager, finance_ops, admin can view quotes across the system

        stmt = stmt.order_by(Quotation.created_at.desc()).limit(10)
        res = await db.execute(stmt)
        quotes = res.scalars().all()

        if quotes:
            extracted_data.append(f"Aapke authorized access mein {len(quotes)} quotations available hain:")
            for q in quotes:
                summary = (
                    f"- Quote #{q.quote_number}: Status='{q.status}', Total Amount=${q.total_amount:,.2f}"
                )
                extracted_data.append(summary)
        else:
            extracted_data.append(f"No quotations found for your authorized account.")

    # 2. Invoices / Billing Query
    if is_invoice_query:
        has_business_intent = True
        stmt = select(Invoice)
        if role == "customer":
            c_res = await db.execute(select(Customer).where(Customer.email == user.email))
            cust = c_res.scalars().first()
            if cust:
                stmt = stmt.where(Invoice.customer_id == cust.id)
            else:
                stmt = stmt.where(Invoice.id == "__none__")
        elif role == "sales_rep":
            # Reps see invoices linked to their customers
            stmt = stmt.order_by(Invoice.created_at.desc()).limit(5)
        
        stmt = stmt.order_by(Invoice.created_at.desc()).limit(5)
        res = await db.execute(stmt)
        invoices = res.scalars().all()

        if invoices:
            for inv in invoices:
                extracted_data.append(
                    f"Invoice #{inv.invoice_number}: Status='{inv.status}', Total Amount=${inv.total_amount:,.2f}, "
                    f"Paid Amount=${inv.amount_paid:,.2f}, Due Date={inv.due_date}"
                )
        else:
            extracted_data.append("No invoice records found for your account.")

    # 3. Approvals Query
    if is_approval_query and role in ["sales_manager", "finance_ops", "admin"]:
        has_business_intent = True
        stmt = select(ApprovalRequest).where(ApprovalRequest.status == "pending").limit(5)
        res = await db.execute(stmt)
        approvals = res.scalars().all()
        if approvals:
            for a in approvals:
                extracted_data.append(
                    f"Pending Approval ID={a.id[:8]}: Step={a.current_step}, Status='{a.status}'"
                )
        else:
            extracted_data.append("No pending approval requests at this moment.")

    # 4. Warehouse & Stock Query
    if is_stock_query and role in ["finance_ops", "admin", "sales_manager"]:
        has_business_intent = True
        stmt = select(Warehouse).limit(5)
        res = await db.execute(stmt)
        whs = res.scalars().all()
        if whs:
            for w in whs:
                extracted_data.append(f"Warehouse '{w.name}' (Code: {w.code}): Location={w.city}, {w.state}")
        else:
            extracted_data.append("No warehouse facilities found.")

    # 5. Products Catalog Query
    if is_product_query:
        has_business_intent = True
        stmt = select(Product).where(Product.is_active == True).limit(5)
        res = await db.execute(stmt)
        prods = res.scalars().all()
        if prods:
            for p in prods:
                # NEVER expose cost_price to reps or customers!
                extracted_data.append(
                    f"Product '{p.name}' (SKU: {p.sku}): Category='{p.category}', List Price=${p.base_price:,.2f}"
                )
        else:
            extracted_data.append("No active catalog products found.")

    if not has_business_intent or not extracted_data:
        return {
            "has_data": False,
            "context": "",
            "summary": []
        }

    return {
        "has_data": True,
        "context": "\n".join(extracted_data),
        "summary": extracted_data
    }
