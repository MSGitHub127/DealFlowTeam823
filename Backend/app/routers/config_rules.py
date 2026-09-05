from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models.rules import DiscountTierConfig, CategoryDiscountConfig, ApprovalRule, UpsellRule
from app.models.product import Product
from app.schemas.rules import (
    DiscountTierConfigCreate, DiscountTierConfigOut,
    CategoryDiscountConfigCreate, CategoryDiscountConfigOut,
    ApprovalRuleCreate, ApprovalRuleOut,
    UpsellRuleCreate, UpsellRuleOut
)
from app.routers.auth import require_role
from app.core.audit import create_audit_log

router = APIRouter(prefix="/config", tags=["Configuration & Rules"])

# --- Discount Tier Ceilings ---
@router.get("/discount-tiers", response_model=List[DiscountTierConfigOut])
async def get_discount_tiers(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DiscountTierConfig))
    return res.scalars().all()

@router.post("/discount-tiers", response_model=DiscountTierConfigOut)
async def create_or_update_discount_tier(
    req: DiscountTierConfigCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(["sales_manager", "admin"]))
):
    res = await db.execute(select(DiscountTierConfig).where(DiscountTierConfig.tier == req.tier))
    tier = res.scalars().first()
    if tier:
        old_val = {"max_discount_pct": tier.max_discount_pct}
        tier.max_discount_pct = req.max_discount_pct
        await create_audit_log(db, "discount_tier", tier.id, "update", user, f"Updated ceiling for {req.tier}", old_val, {"max_discount_pct": req.max_discount_pct})
    else:
        tier = DiscountTierConfig(tier=req.tier, max_discount_pct=req.max_discount_pct)
        db.add(tier)
        await db.flush()
        await create_audit_log(db, "discount_tier", tier.id, "create", user, f"Created ceiling for {req.tier}", None, {"max_discount_pct": req.max_discount_pct})
    await db.commit()
    await db.refresh(tier)
    return tier

# --- Category Ceilings ---
@router.get("/category-ceilings", response_model=List[CategoryDiscountConfigOut])
async def get_category_ceilings(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CategoryDiscountConfig))
    return res.scalars().all()

@router.post("/category-ceilings", response_model=CategoryDiscountConfigOut)
async def create_or_update_category_ceiling(
    req: CategoryDiscountConfigCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(["sales_manager", "admin"]))
):
    res = await db.execute(select(CategoryDiscountConfig).where(CategoryDiscountConfig.category == req.category))
    cat = res.scalars().first()
    if cat:
        old_val = {"max_discount_pct": cat.max_discount_pct}
        cat.max_discount_pct = req.max_discount_pct
        await create_audit_log(db, "category_ceiling", cat.id, "update", user, f"Updated ceiling for {req.category}", old_val, {"max_discount_pct": req.max_discount_pct})
    else:
        cat = CategoryDiscountConfig(category=req.category, max_discount_pct=req.max_discount_pct)
        db.add(cat)
        await db.flush()
        await create_audit_log(db, "category_ceiling", cat.id, "create", user, f"Created ceiling for {req.category}", None, {"max_discount_pct": req.max_discount_pct})
    await db.commit()
    await db.refresh(cat)
    return cat

# --- Approval Rules ---
@router.get("/approval-rules", response_model=List[ApprovalRuleOut])
async def get_approval_rules(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ApprovalRule))
    return res.scalars().all()

@router.post("/approval-rules", response_model=ApprovalRuleOut)
async def create_approval_rule(
    req: ApprovalRuleCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(["sales_manager", "admin"]))
):
    rule = ApprovalRule(
        name=req.name,
        risk_band=req.risk_band,
        min_excess=req.min_excess,
        max_excess=req.max_excess,
        min_total_excess=req.min_total_excess,
        approvers=req.approvers,
        description=req.description
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    await create_audit_log(db, "approval_rule", rule.id, "create", user, f"Created approval rule {req.name}")
    return rule

# --- Upsell Rules ---
@router.get("/upsell-rules", response_model=List[UpsellRuleOut])
async def get_upsell_rules(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(UpsellRule))
    rules = res.scalars().all()
    out = []
    for r in rules:
        p_res = await db.execute(select(Product).where(Product.id == r.primary_product_id))
        primary = p_res.scalars().first()
        s_res = await db.execute(select(Product).where(Product.id == r.suggested_product_id))
        suggested = s_res.scalars().first()
        out.append(UpsellRuleOut(
            id=r.id,
            primary_product_id=r.primary_product_id,
            suggested_product_id=r.suggested_product_id,
            primary_product_name=primary.name if primary else None,
            suggested_product_name=suggested.name if suggested else None,
            co_purchase_score=r.co_purchase_score,
            is_promoted=r.is_promoted,
            min_margin_pct=r.min_margin_pct,
            reason=r.reason
        ))
    return out

@router.post("/upsell-rules", response_model=UpsellRuleOut)
async def create_upsell_rule(
    req: UpsellRuleCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(["sales_manager", "admin"]))
):
    rule = UpsellRule(
        primary_product_id=req.primary_product_id,
        suggested_product_id=req.suggested_product_id,
        co_purchase_score=req.co_purchase_score,
        is_promoted=req.is_promoted,
        min_margin_pct=req.min_margin_pct,
        reason=req.reason
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return UpsellRuleOut(
        id=rule.id,
        primary_product_id=rule.primary_product_id,
        suggested_product_id=rule.suggested_product_id,
        co_purchase_score=rule.co_purchase_score,
        is_promoted=rule.is_promoted,
        min_margin_pct=rule.min_margin_pct,
        reason=rule.reason
    )
