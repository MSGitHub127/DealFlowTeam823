from datetime import date
from typing import Dict, Any

def calculate_mid_cycle_proration(
    plan_price: float,
    billing_cycle_days: int,
    cycle_start: date,
    cycle_end: date,
    as_of_date: date,
    old_qty: int,
    new_qty: int
) -> Dict[str, Any]:
    """
    Computes proration delta when subscription quantity or tier changes mid-cycle.
    """
    total_cycle_days = max(1, (cycle_end - cycle_start).days)
    remaining_days = max(0, (cycle_end - as_of_date).days)
    
    daily_rate_per_unit = plan_price / total_cycle_days
    old_daily_rate = daily_rate_per_unit * old_qty
    new_daily_rate = daily_rate_per_unit * new_qty

    daily_diff = new_daily_rate - old_daily_rate
    delta_amount = round(daily_diff * remaining_days, 2)

    return {
        "daily_rate_per_unit": round(daily_rate_per_unit, 4),
        "total_cycle_days": total_cycle_days,
        "remaining_days": remaining_days,
        "old_qty": old_qty,
        "new_qty": new_qty,
        "old_daily_rate": round(old_daily_rate, 2),
        "new_daily_rate": round(new_daily_rate, 2),
        "credit_or_charge": delta_amount,  # positive = additional charge, negative = credit
        "explanation": f"{remaining_days} days remaining out of {total_cycle_days}. Qty changed from {old_qty} to {new_qty}. {'Charge' if delta_amount >= 0 else 'Credit'} of ${abs(delta_amount):.2f} applied."
    }

def calculate_cancellation_refund(
    plan_price: float,
    cycle_start: date,
    cycle_end: date,
    cancelled_on: date,
    qty: int = 1
) -> Dict[str, Any]:
    """
    Computes prorated refund / credit note when subscription is cancelled mid-cycle.
    """
    total_cycle_days = max(1, (cycle_end - cycle_start).days)
    unused_days = max(0, (cycle_end - cancelled_on).days)
    daily_rate = (plan_price * qty) / total_cycle_days
    refund_amount = round(unused_days * daily_rate, 2)

    return {
        "total_cycle_days": total_cycle_days,
        "unused_days": unused_days,
        "daily_rate": round(daily_rate, 4),
        "refund_amount": refund_amount,
        "explanation": f"Subscription cancelled with {unused_days} unused days. Prorated refund credit of ${refund_amount:.2f} generated."
    }
