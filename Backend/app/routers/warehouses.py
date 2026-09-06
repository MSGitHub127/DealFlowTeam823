from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.warehouse import Warehouse, Stock, StockMovement
from app.models.product import Product
from app.schemas.fulfillment import StockReplenishRequest
from app.routers.auth import require_role
from app.core.audit import create_audit_log

router = APIRouter(prefix="/warehouses", tags=["Warehouses & Stock"])

class WarehouseCreate(BaseModel):
    name: str
    code: str
    location: Optional[str] = None
    shipping_cost_weight: float = 1.0

class StockItemOut(BaseModel):
    id: str
    warehouse_id: str
    warehouse_name: str
    product_id: str
    product_name: str
    qty_available: int
    qty_reserved: int
    reorder_level: int

class WarehouseOut(BaseModel):
    id: str
    name: str
    code: str
    location: Optional[str] = None
    shipping_cost_weight: float
    is_active: bool

@router.get("", response_model=List[WarehouseOut])
async def list_warehouses(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Warehouse).where(Warehouse.is_active == True))
    return res.scalars().all()

@router.post("", response_model=WarehouseOut)
async def create_warehouse(
    req: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(["admin", "finance_ops"]))
):
    wh = Warehouse(
        name=req.name,
        code=req.code,
        location=req.location,
        shipping_cost_weight=req.shipping_cost_weight
    )
    db.add(wh)
    await db.commit()
    await db.refresh(wh)
    await create_audit_log(db, "warehouse", wh.id, "create", user, f"Created warehouse {req.name}")
    return wh

@router.get("/stocks", response_model=List[StockItemOut])
async def list_stocks(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Stock)
        .options(selectinload(Stock.warehouse), selectinload(Stock.product))
    )
    stocks = res.scalars().all()
    out = []
    for s in stocks:
        out.append(StockItemOut(
            id=s.id,
            warehouse_id=s.warehouse_id,
            warehouse_name=s.warehouse.name if s.warehouse else "",
            product_id=s.product_id,
            product_name=s.product.name if s.product else "",
            qty_available=s.qty_available,
            qty_reserved=s.qty_reserved,
            reorder_level=s.reorder_level
        ))
    return out

@router.post("/replenish")
async def replenish_stock(
    req: StockReplenishRequest,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(["admin", "finance_ops"]))
):
    res = await db.execute(
        select(Stock).where(
            Stock.warehouse_id == req.warehouse_id,
            Stock.product_id == req.product_id
        )
    )
    stock = res.scalars().first()
    if stock:
        stock.qty_available += req.qty_added
    else:
        stock = Stock(
            warehouse_id=req.warehouse_id,
            product_id=req.product_id,
            qty_available=req.qty_added,
            qty_reserved=0
        )
        db.add(stock)

    # Record movement
    movement = StockMovement(
        warehouse_id=req.warehouse_id,
        product_id=req.product_id,
        qty_delta=req.qty_added,
        movement_type="replenish"
    )
    db.add(movement)
    await db.commit()
    await create_audit_log(db, "stock", stock.id, "replenish", user, f"Added {req.qty_added} units to stock")
    return {"status": "success", "qty_available": stock.qty_available}
