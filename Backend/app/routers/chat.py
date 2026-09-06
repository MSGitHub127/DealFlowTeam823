import json
import re
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database import get_db
from app.models.user import User
from app.models.chat import ChatMessage
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessageOut, SourceCitation
from app.core.security import decode_access_token
from app.services.multilingual import expand_query_for_retrieval
from app.services.rag_engine import retrieve_knowledge
from app.services.business_engine import retrieve_authorized_business_data
from app.services.gemini_service import generate_grounded_response, INSUFFICIENT_CONTEXT_FALLBACK

router = APIRouter(prefix="/chat", tags=["Multilingual RAG Chatbot"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Strict JWT Authentication Dependency - Never allows unauthenticated fallback
async def get_authenticated_chat_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is required to access DealFlow360 Chatbot",
            headers={"WWW-Authenticate": "Bearer"}
        )
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    return user

PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"reveal\s+(the\s+)?system\s+prompt",
    r"disclose\s+(all\s+)?(passwords|secrets|api_key)",
    r"you\s+are\s+now\s+dan",
    r"jailbreak",
    r"bypass\s+(all\s+)?(security|authorization|rbac)",
]

def check_prompt_injection(query: str) -> bool:
    lower_q = query.lower()
    for pattern in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, lower_q):
            return True
    return False

# --- Input sanity / intent gate -------------------------------------------------
# Greetings/small-talk should never trigger RAG, DB lookups, or a Gemini call.
GREETING_PATTERNS = [
    r"^(hi|hello|hey|yo|namaste|namaskar)[\s!.,]*$",
    r"^(good\s?(morning|afternoon|evening|night))[\s!.,]*$",
    r"^(kem\s?cho|kaise\s?ho|kaisa\s?hai|thanks?|thank\s?you|dhanyavad|shukriya)[\s!.,]*$",
    r"^(હેલો|નમસ્તે|હાય)[\s!.,]*$",
    r"^(हेलो|नमस्ते|हाय)[\s!.,]*$",
    r"^(bye|goodbye|ok|okay|good)[\s!.,]*$",
]

DOMAIN_HINT_WORDS = re.compile(
    r"quot|invoic|approv|fulfil|shipment|dispatch|bill|payment|stock|warehouse|"
    r"product|catalog|customer|portal|discount|margin|risk|report|deal|order|"
    r"rbac|role|permission|cpq|subscription|proration|"
    r"bhav|chalan|manzoori|swikriti|godown|godam|graahak|grahak|choot|paise|"
    r"[\u0900-\u097F]|[\u0A80-\u0AFF]",
    re.IGNORECASE,
)

FALLBACK_SCOPE_MESSAGE = (
    "I can help with DealFlow360 quotations, approvals, fulfillment, billing, "
    "reports, and customer portal questions."
)


def is_greeting(query: str) -> bool:
    stripped = query.strip().lower()
    return any(re.match(p, stripped, re.IGNORECASE) for p in GREETING_PATTERNS)


def is_meaningless_input(query: str) -> bool:
    """
    Lightweight, deterministic sanity gate. Flags input that is too short/random
    to be a real question AND has no relationship to DealFlow360 domain terms.
    This avoids burning a RAG lookup / Gemini call on noise like 'asdfgh' or 'qwerty'.
    """
    stripped = query.strip()
    if not stripped:
        return True
    if DOMAIN_HINT_WORDS.search(stripped):
        return False
    # Contains real, space-separated words (a plausible natural-language sentence)
    words = re.findall(r"[a-zA-Z]{2,}", stripped)
    if len(words) >= 3:
        return False
    # Single "word" that's just keyboard-mash / gibberish (no vowels, or a long
    # random alnum blob) and not a recognizable domain term.
    single = stripped.lower()
    if re.fullmatch(r"[a-z0-9]{3,}", single) and not re.search(r"[aeiou]", single):
        return True
    if re.fullmatch(r"[a-z]{4,}", single) and len(words) <= 1:
        # Very short, single nonsense token with no domain relevance
        return True
    return False

@router.post("", response_model=ChatResponse)
async def post_chat_message(
    req: ChatRequest,
    user: User = Depends(get_authenticated_chat_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Multilingual RAG Chatbot query endpoint:
    1. Authenticates via trusted JWT/RBAC.
    2. Protects against prompt injection.
    3. Detects language and expands multilingual terms for retrieval.
    4. Retrieves RAG knowledge chunks and authorized business database data.
    5. Generates grounded response with citations and anti-hallucination guarantees.
    6. Persists conversation history.
    """
    start_time = time.perf_counter()
    raw_query = req.message.strip()

    def _with_latency(payload: dict) -> dict:
        payload["latency_ms"] = int((time.perf_counter() - start_time) * 1000)
        return payload

    # Prompt injection resistance
    if check_prompt_injection(raw_query):
        return ChatResponse(**_with_latency({
            "answer": "I cannot fulfill requests that attempt to override DealFlow360 security protocols or access unauthorized information.",
            "language": "en",
            "grounded": True,
            "confidence": 0.99,
            "response_type": "insufficient_context",
            "sources": []
        }))

    # Detect language early (cheap, deterministic) so gates below can respond
    # in the user's language without needing RAG/DB/Gemini.
    _, detected_lang = expand_query_for_retrieval(raw_query)

    # --- Lightweight paths: never trigger RAG, DB lookups, or a Gemini call ---
    if is_greeting(raw_query):
        greeting_answer = {
            "hi": "नमस्ते! मैं DealFlow360 सहायक हूँ। मैं आपकी quotations, approvals, billing, fulfillment और reports से जुड़े सवालों में मदद कर सकता हूँ।",
            "gu": "નમસ્તે! હું DealFlow360 સહાયક છું. હું તમારા quotations, approvals, billing, fulfillment અને reports સંબંધિત પ્રશ્નોમાં મદદ કરી શકું છું.",
            "gu_latn": "Kem cho! Hu DealFlow360 Assistant chu. Hu tamara quotations, approvals, billing, fulfillment ane reports vishe madad kari shaku chu.",
            "hinglish": "Namaste! Main DealFlow360 Assistant hoon. Main aapki quotations, approvals, billing, fulfillment aur reports se juda sawaalon mein madad kar sakta hoon.",
        }.get(detected_lang, "Hello! I'm the DealFlow360 Assistant. I can help with your quotations, approvals, billing, fulfillment, and reports.")
        return ChatResponse(**_with_latency({
            "answer": greeting_answer,
            "language": detected_lang,
            "grounded": True,
            "confidence": 1.0,
            "response_type": "greeting",
            "sources": []
        }))

    if is_meaningless_input(raw_query):
        return ChatResponse(**_with_latency({
            "answer": FALLBACK_SCOPE_MESSAGE,
            "language": detected_lang,
            "grounded": False,
            "confidence": 0.0,
            "response_type": "fallback",
            "sources": []
        }))

    # Expand query for retrieval (adds English domain synonyms for non-English input)
    expanded_query, detected_lang = expand_query_for_retrieval(raw_query)

    # 1. RAG Knowledge retrieval (targeted, deduplicated, top-K, thresholded)
    rag_result = retrieve_knowledge(query=expanded_query)
    rag_context = rag_result["context"]
    citations = rag_result["citations"]

    # 2. Authorized Business Database retrieval (Strict RBAC & Isolation) -
    #    only runs the DB queries actually implied by the question's intent.
    biz_result = await retrieve_authorized_business_data(query=raw_query, user=user, db=db)
    biz_context = biz_result["context"]

    # Convert history items to dicts
    hist_list = [{"role": h.role, "content": h.content} for h in (req.history or [])]

    # 3. Grounded response generation (single Gemini Flash call max)
    response_payload = await generate_grounded_response(
        query=raw_query,
        rag_context=rag_context,
        business_context=biz_context,
        citations=citations,
        language=detected_lang,
        history=hist_list
    )
    response_payload["latency_ms"] = int((time.perf_counter() - start_time) * 1000)

    # 4. Save history to database
    try:
        # Save user message
        user_msg = ChatMessage(
            user_id=user.id,
            session_id=req.session_id,
            role="user",
            content=raw_query,
            language=detected_lang
        )
        db.add(user_msg)

        # Save assistant message
        assistant_msg = ChatMessage(
            user_id=user.id,
            session_id=req.session_id,
            role="assistant",
            content=response_payload["answer"],
            language=response_payload["language"],
            response_type=response_payload["response_type"],
            confidence=response_payload["confidence"],
            grounded=response_payload["grounded"],
            sources_json=json.dumps(response_payload.get("sources", []))
        )
        db.add(assistant_msg)
        await db.commit()
    except Exception:
        # Non-fatal if history persistence encounters a commit issue
        await db.rollback()

    formatted_sources = [
        SourceCitation(
            title=s["title"],
            section=s["section"],
            score=s["score"]
        ) for s in response_payload.get("sources", [])
    ]

    return ChatResponse(
        answer=response_payload["answer"],
        language=response_payload["language"],
        grounded=response_payload["grounded"],
        confidence=response_payload["confidence"],
        response_type=response_payload["response_type"],
        sources=formatted_sources,
        latency_ms=response_payload.get("latency_ms", 0)
    )

@router.get("/history", response_model=List[ChatMessageOut])
async def get_chat_history(
    session_id: Optional[str] = None,
    limit: int = 50,
    user: User = Depends(get_authenticated_chat_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves chat history for the authenticated user only.
    """
    stmt = select(ChatMessage).where(ChatMessage.user_id == user.id)
    if session_id:
        stmt = stmt.where(ChatMessage.session_id == session_id)
    stmt = stmt.order_by(ChatMessage.created_at.asc()).limit(limit)

    res = await db.execute(stmt)
    messages = res.scalars().all()

    output = []
    for m in messages:
        sources = []
        if m.sources_json:
            try:
                sources_data = json.loads(m.sources_json)
                sources = [SourceCitation(**s) for s in sources_data]
            except Exception:
                sources = []

        output.append(
            ChatMessageOut(
                id=m.id,
                user_id=m.user_id,
                session_id=m.session_id,
                role=m.role,
                content=m.content,
                language=m.language or "en",
                response_type=m.response_type or "knowledge",
                confidence=m.confidence or 1.0,
                grounded=m.grounded if m.grounded is not None else True,
                sources=sources,
                created_at=m.created_at
            )
        )
    return output

@router.delete("/history/{message_id}")
async def delete_chat_message(
    message_id: str,
    user: User = Depends(get_authenticated_chat_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes a specific chat history message belonging to the authenticated user.
    """
    res = await db.execute(select(ChatMessage).where(ChatMessage.id == message_id))
    msg = res.scalars().first()
    if not msg:
        raise HTTPException(status_code=404, detail="Chat message not found")

    if msg.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized to delete another user's chat history")

    await db.delete(msg)
    await db.commit()
    return {"success": True, "message": "Chat message deleted"}
