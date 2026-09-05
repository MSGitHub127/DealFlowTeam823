from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, timedelta
from app.database import get_db
from app.models.quotation import Quotation, QuotationLine
from app.models.product import Product
from app.services.export_service import generate_excel_report, generate_pdf_report
from app.core.timeutils import utcnow

router = APIRouter(prefix="/reports", tags=["Reporting & Performance Analytics"])

async def _fetch_report_data(
    db: AsyncSession,
    period: Optional[str] = None,
    rep_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None
):
    query = select(Quotation).options(
        selectinload(Quotation.customer),
        selectinload(Quotation.rep),
        selectinload(Quotation.lines).selectinload(QuotationLine.product)
    ).order_by(Quotation.created_at.desc())

    if status:
        query = query.where(Quotation.status == status)
    if rep_id:
        query = query.where(Quotation.rep_id == rep_id)
    if period:
        now = utcnow()
        if period == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            query = query.where(Quotation.created_at >= start_date)
        elif period == "week":
            start_date = now - timedelta(days=7)
            query = query.where(Quotation.created_at >= start_date)
        elif period == "month":
            start_date = now - timedelta(days=30)
            query = query.where(Quotation.created_at >= start_date)

    res = await db.execute(query)
    quotes = res.scalars().all()

    data = []
    for q in quotes:
        if category:
            # Check if any line matches category
            has_cat = any(l.product and l.product.category.lower() == category.lower() for l in q.lines)
            if not has_cat:
                continue

        data.append({
            "quote_number": q.quote_number,
            "customer": q.customer.company_name if q.customer else "Unknown",
            "rep": q.rep.full_name if q.rep else "Rep",
            "total_amount": q.total_amount,
            "margin_pct": q.total_margin_pct,
            "risk": q.blended_risk,
            "status": q.status,
            "created_at": q.created_at.strftime("%Y-%m-%d %H:%M")
        })
    return data

@router.get("")
async def get_reports_summary(
    period: Optional[str] = Query(None, description="today, week, month, all"),
    rep_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    data = await _fetch_report_data(db, period, rep_id, status, category)
    total_rev = sum(d["total_amount"] for d in data)
    avg_margin = (sum(d["margin_pct"] for d in data) / len(data)) if data else 0.0

    return {
        "summary": {
            "total_deals": len(data),
            "total_pipeline_value": round(total_rev, 2),
            "average_margin_pct": round(avg_margin, 1),
            "approved_deals": sum(1 for d in data if d["status"] in ["approved", "confirmed", "fulfilled"]),
            "pending_approval": sum(1 for d in data if d["status"] == "pending_approval"),
            "under_negotiation": sum(1 for d in data if d["status"] == "negotiation"),
        },
        "deals": data
    }

@router.get("/export.xlsx")
async def export_excel(
    period: Optional[str] = None,
    rep_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    data = await _fetch_report_data(db, period, rep_id, status, category)
    filters = f"Period: {period or 'All'}, Status: {status or 'All'}, Category: {category or 'All'}"
    excel_bytes = generate_excel_report(data, filters)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=DealFlow360_Report.xlsx"}
    )

@router.get("/export.pdf")
async def export_pdf(
    period: Optional[str] = None,
    rep_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    data = await _fetch_report_data(db, period, rep_id, status, category)
    filters = f"Period: {period or 'All'}, Status: {status or 'All'}, Category: {category or 'All'}"
    pdf_bytes = generate_pdf_report(data, filters)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=DealFlow360_Report.pdf"}
    )
