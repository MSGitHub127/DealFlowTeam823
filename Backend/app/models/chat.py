import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Float
from app.database import Base
from app.core.timeutils import utcnow

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), index=True, nullable=False)
    session_id = Column(String(36), index=True, nullable=True)
    role = Column(String(20), nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)
    language = Column(String(10), default="en")
    response_type = Column(String(30), default="knowledge")
    confidence = Column(Float, default=1.0)
    grounded = Column(Boolean, default=True)
    sources_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
