from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.database import get_db
from app.models.product import Product, ProductVariant, PriceListEntry
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductOut,
    ProductVariantCreate, ProductVariantOut,
    PriceListEntryCreate, PriceListEntryOut
)
from app.routers.auth import require_role
from app.core.audit import create_audit_log

router = APIRouter(prefix="/products", tags=["Products & Pricing"])

@router.get("", response_model=List[ProductOut])
async def list_products(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Product).options(
        selectinload(Product.variants),
        selectinload(Product.price_entries)
    ).where(Product.is_active == True)
    
    if category:
        query = query.where(Product.category == category)
        
    res = await db.execute(query)
    return res.scalars().all()

@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Product)
        .options(selectinload(Product.variants), selectinload(Product.price_entries))
        .where(Product.id == product_id)
    )
    prod = res.scalars().first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return prod

@router.post("", response_model=ProductOut)
async def create_product(
    req: ProductCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(["admin", "sales_manager"]))
):
    prod = Product(
        name=req.name,
        sku=req.sku,
        category=req.category,
        base_price=req.base_price,
        cost_price=req.cost_price,
        unit=req.unit,
        tax_rate=req.tax_rate,
        description=req.description,
        is_subscription=req.is_subscription
    )
    db.add(prod)
    await db.flush()

    if req.variants:
        for v in req.variants:
            var_obj = ProductVariant(
                product_id=prod.id,
                attribute_name=v.attribute_name,
                attribute_value=v.attribute_value,
                extra_price=v.extra_price
            )
            db.add(var_obj)

    if req.price_entries:
        for p in req.price_entries:
            pe_obj = PriceListEntry(
                product_id=prod.id,
                customer_tier=p.customer_tier,
                currency=p.currency,
                custom_price=p.custom_price,
                min_qty=p.min_qty
            )
            db.add(pe_obj)

    await db.commit()
    await create_audit_log(db, "product", prod.id, "create", user, f"Created product {req.name}")
    
    # Reload with relationships
    res = await db.execute(
        select(Product)
        .options(selectinload(Product.variants), selectinload(Product.price_entries))
        .where(Product.id == prod.id)
    )
    return res.scalars().first()

@router.post("/{product_id}/variants", response_model=ProductVariantOut)
async def add_variant(
    product_id: str,
    req: ProductVariantCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(["admin", "sales_manager"]))
):
    var_obj = ProductVariant(
        product_id=product_id,
        attribute_name=req.attribute_name,
        attribute_value=req.attribute_value,
        extra_price=req.extra_price
    )
    db.add(var_obj)
    await db.commit()
    await db.refresh(var_obj)
    return var_obj

@router.post("/{product_id}/pricelist", response_model=PriceListEntryOut)
async def add_or_update_price_entry(
    product_id: str,
    req: PriceListEntryCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(["admin", "sales_manager"]))
):
    res = await db.execute(
        select(PriceListEntry).where(
            PriceListEntry.product_id == product_id,
            PriceListEntry.customer_tier == req.customer_tier,
            PriceListEntry.currency == req.currency
        )
    )
    pe = res.scalars().first()
    if pe:
        pe.custom_price = req.custom_price
        pe.min_qty = req.min_qty
    else:
        pe = PriceListEntry(
            product_id=product_id,
            customer_tier=req.customer_tier,
            currency=req.currency,
            custom_price=req.custom_price,
            min_qty=req.min_qty
        )
        db.add(pe)
    await db.commit()
    await db.refresh(pe)
    return pe
