from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime

class ChatHistoryItem(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="The user query or instruction")
    history: Optional[List[ChatHistoryItem]] = Field(default=[], description="Recent conversation turns")
    session_id: Optional[str] = Field(default=None, description="Optional chat session identifier")

class SourceCitation(BaseModel):
    title: str
    section: str
    score: float

class ChatResponse(BaseModel):
    answer: str
    language: str
    grounded: bool
    confidence: float
    response_type: Literal[
        "knowledge", "business_data", "mixed",
        "greeting", "fallback", "insufficient_context"
    ]
    sources: List[SourceCitation] = []
    latency_ms: int = 0

class ChatMessageOut(BaseModel):
    id: str
    user_id: str
    session_id: Optional[str] = None
    role: str
    content: str
    language: str
    response_type: str
    confidence: float
    grounded: bool
    sources: List[SourceCitation] = []
    created_at: datetime
