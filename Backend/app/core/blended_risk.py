from typing import List, Dict, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.rules import DiscountTierConfig, CategoryDiscountConfig, ApprovalRule

async def calculate_blended_risk(
    db: AsyncSession,
    customer_tier: str,
    lines_data: List[Dict]
) -> Tuple[str, List[Dict], float, float]:
    """
    Computes per-line discount limits and blended risk band.
    Returns: (blended_risk_band, updated_lines_data, max_excess, total_excess)
    """
    # 1. Fetch DB discount tier configs
    tier_res = await db.execute(select(DiscountTierConfig))
    tier_configs = {t.tier.lower(): t.max_discount_pct for t in tier_res.scalars().all()}
    
    # 2. Fetch DB category configs
    cat_res = await db.execute(select(CategoryDiscountConfig))
    cat_configs = {c.category.lower(): c.max_discount_pct for c in cat_res.scalars().all()}
    
    # Fallback defaults if DB not yet seeded
    tier_ceiling = tier_configs.get(customer_tier.lower(), 5.0)
    
    default_cat_ceilings = {
        "hardware": 15.0,
        "services": 10.0,
        "subscriptions": 12.0
    }

    max_excess = 0.0
    total_excess = 0.0
    evaluated_lines = []

    for line in lines_data:
        cat_key = line.get("category", "hardware").lower()
        cat_ceiling = cat_configs.get(cat_key, default_cat_ceilings.get(cat_key, 10.0))
        
        # Allowed is the stricter ceiling
        allowed = min(tier_ceiling, cat_ceiling)
        discount_pct = float(line.get("discount_pct", 0.0))
        
        excess = max(0.0, round(discount_pct - allowed, 2))
        status = "OVER" if excess > 0 else "OK"
        
        if excess > max_excess:
            max_excess = excess
        total_excess += excess
        
        updated_line = dict(line)
        updated_line["limit_pct"] = allowed
        updated_line["line_excess"] = excess
        updated_line["line_status"] = status
        evaluated_lines.append(updated_line)

    total_excess = round(total_excess, 2)
    max_excess = round(max_excess, 2)

    # 3. Lookup Approval Rules from DB
    rules_res = await db.execute(select(ApprovalRule))
    rules = rules_res.scalars().all()

    risk_band = "NONE"
    if max_excess == 0 and total_excess == 0:
        risk_band = "NONE"
    elif rules:
        # Check high rules first
        high_matched = False
        medium_matched = False
        for r in rules:
            if r.risk_band == "HIGH":
                if max_excess > r.min_excess or (r.min_total_excess > 0 and total_excess >= r.min_total_excess):
                    high_matched = True
            elif r.risk_band == "MEDIUM":
                if max_excess > r.min_excess or (r.min_total_excess > 0 and total_excess >= r.min_total_excess):
                    medium_matched = True
        
        if high_matched:
            risk_band = "HIGH"
        elif medium_matched:
            risk_band = "MEDIUM"
        else:
            risk_band = "MEDIUM"
    else:
        # Standard default logic if table empty
        if max_excess > 5.0 or total_excess > 8.0:
            risk_band = "HIGH"
        elif max_excess > 0.0 or total_excess > 0.0:
            risk_band = "MEDIUM"
        else:
            risk_band = "NONE"

    return risk_band, evaluated_lines, max_excess, total_excess
