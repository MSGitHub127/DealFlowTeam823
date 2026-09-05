import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.database import AsyncSessionLocal
from app.core.deal_health_engine import scan_deal_health

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

async def scheduled_deal_health_scan():
    try:
        async with AsyncSessionLocal() as session:
            alerts = await scan_deal_health(session)
            if alerts:
                logger.info(f"Scheduled scan created {len(alerts)} deal health alerts.")
    except Exception as e:
        logger.error(f"Error during deal health scan: {e}")

def start_scheduler():
    if not scheduler.running:
        # Runs deal health scan every 5 minutes
        scheduler.add_job(
            scheduled_deal_health_scan,
            trigger=IntervalTrigger(minutes=5),
            id="deal_health_scan",
            replace_existing=True
        )
        scheduler.start()
        logger.info("APScheduler started successfully.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler shut down.")
