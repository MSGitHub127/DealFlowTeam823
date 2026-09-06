from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.approval import AuditLog
from app.models.user import User

async def create_audit_log(
    db: AsyncSession,
    entity_type: str,
    entity_id: str,
    action: str,
    user: Optional[User] = None,
    reason: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """
    Creates an immutable audit log entry.
    """
    log_entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user.id if user else None,
        user_email=user.email if user else "system",
        user_role=user.role if user else "system",
        action=action,
        reason=reason,
        old_values=old_values,
        new_values=new_values
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)
    return log_entry
