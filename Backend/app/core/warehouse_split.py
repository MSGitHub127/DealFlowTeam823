from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.warehouse import Warehouse, Stock
from app.models.product import Product

async def calculate_warehouse_split(
    db: AsyncSession,
    items_to_fulfill: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Greedy, cost-weighted warehouse split algorithm.
    items_to_fulfill: list of {"product_id": str, "product_name": str, "qty": int}
    """
    if not items_to_fulfill:
        return {
            "can_fulfill_completely": True,
            "is_split": False,
            "total_shipments": 0,
            "estimated_shipping_cost": 0.0,
            "allocations": [],
            "backorders": [],
            "message": "No physical items to fulfill."
        }

    # Fetch active warehouses ordered by shipping_cost_weight ASC (cheapest first)
    wh_query = await db.execute(
        select(Warehouse)
        .where(Warehouse.is_active == True)
        .order_by(Warehouse.shipping_cost_weight.asc())
    )
    warehouses = wh_query.scalars().all()

    # Fetch current stock mapping: (warehouse_id, product_id) -> available_qty
    stock_query = await db.execute(select(Stock))
    all_stocks = stock_query.scalars().all()
    stock_map = {(s.warehouse_id, s.product_id): (s.qty_available - s.qty_reserved) for s in all_stocks}

    # 1. First attempt: Can a single warehouse fulfill ALL required quantities?
    for wh in warehouses:
        can_fulfill_all = True
        for item in items_to_fulfill:
            p_id = item["product_id"]
            needed = item["qty"]
            avail = stock_map.get((wh.id, p_id), 0)
            if avail < needed:
                can_fulfill_all = False
                break
        
        if can_fulfill_all:
            # Single warehouse satisfies the complete order!
            allocations = []
            for item in items_to_fulfill:
                allocations.append({
                    "product_id": item["product_id"],
                    "product_name": item["product_name"],
                    "warehouse_id": wh.id,
                    "warehouse_name": wh.name,
                    "qty_allocated": item["qty"],
                    "shipping_cost_weight": wh.shipping_cost_weight
                })
            
            base_shipment_rate = 15.0  # Base standard shipping cost
            est_cost = round(base_shipment_rate * wh.shipping_cost_weight, 2)
            
            return {
                "can_fulfill_completely": True,
                "is_split": False,
                "total_shipments": 1,
                "estimated_shipping_cost": est_cost,
                "allocations": allocations,
                "backorders": [],
                "message": f"Optimal fulfillment from single warehouse '{wh.name}' (1 shipment)."
            }

    # 2. Greedy split across warehouses (ordered by cheapest shipping cost weight)
    allocations = []
    backorders = []
    shipment_warehouses = set()

    for item in items_to_fulfill:
        p_id = item["product_id"]
        qty_needed = item["qty"]
        qty_remaining = qty_needed

        for wh in warehouses:
            avail = stock_map.get((wh.id, p_id), 0)
            if avail > 0:
                take_qty = min(avail, qty_remaining)
                allocations.append({
                    "product_id": p_id,
                    "product_name": item["product_name"],
                    "warehouse_id": wh.id,
                    "warehouse_name": wh.name,
                    "qty_allocated": take_qty,
                    "shipping_cost_weight": wh.shipping_cost_weight
                })
                shipment_warehouses.add(wh.id)
                qty_remaining -= take_qty
                # Update simulated stock
                stock_map[(wh.id, p_id)] = avail - take_qty
                if qty_remaining <= 0:
                    break

        if qty_remaining > 0:
            backorders.append({
                "product_id": p_id,
                "product_name": item["product_name"],
                "qty_backordered": qty_remaining
            })

    num_shipments = len(shipment_warehouses)
    total_cost = 0.0
    for wh_id in shipment_warehouses:
        wh_obj = next((w for w in warehouses if w.id == wh_id), None)
        weight = wh_obj.shipping_cost_weight if wh_obj else 1.0
        total_cost += 15.0 * weight

    is_split = num_shipments > 1
    can_fulfill_completely = len(backorders) == 0

    msg = f"Order fulfilled via {num_shipments} shipment(s) across {len(shipment_warehouses)} warehouse(s)."
    if backorders:
        msg += f" {sum(b['qty_backordered'] for b in backorders)} item(s) on backorder."

    return {
        "can_fulfill_completely": can_fulfill_completely,
        "is_split": is_split,
        "total_shipments": num_shipments,
        "estimated_shipping_cost": round(total_cost, 2),
        "allocations": allocations,
        "backorders": backorders,
        "message": msg
    }
