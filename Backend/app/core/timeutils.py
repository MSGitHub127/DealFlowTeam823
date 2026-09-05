from datetime import datetime, timezone


def utcnow() -> datetime:
    """
    Current UTC time, produced via the non-deprecated `datetime.now(timezone.utc)`
    API (datetime.utcnow() is deprecated since Python 3.12 and slated for removal).

    Returned value is naive (tzinfo stripped) on purpose: SQLAlchemy's SQLite
    DateTime column does not round-trip tzinfo, so every timestamp already
    stored via the old datetime.utcnow() calls is naive-UTC. Returning an aware
    datetime here would make new values incomparable (TypeError) against
    existing naive values already in the DB (e.g. deal-health "created more
    than N days ago" scans, portal token issue-time checks). Postgres deploys
    should switch these columns to `DateTime(timezone=True)` and drop the
    `.replace(tzinfo=None)` below in the same migration.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
