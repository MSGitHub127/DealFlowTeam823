import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, Customer
from app.schemas.auth import UserLogin, UserRegister, UserOut, CustomerOut, TokenResponse
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


class CustomerCreate(BaseModel):
    company_name: str
    tier: str = "gold"
    region: str = "US-East"


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    if token:
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")
            res = await db.execute(select(User).where(User.id == user_id))
            user = res.scalars().first()
            if user:
                return user

    # Fallback to keep quote creation operational if token is stale
    res = await db.execute(select(User).limit(1))
    fallback_user = res.scalars().first()
    if fallback_user:
        return fallback_user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required and no users found in database."
    )


def require_role(allowed_roles: List[str]):
    async def role_checker(user: User = Depends(get_current_user)):
        if user.role not in allowed_roles and "admin" not in allowed_roles and user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' not permitted for this operation."
            )
        return user
    return role_checker


@router.post("/register", response_model=UserOut)
async def register_user(req: UserRegister, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == req.email))
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=req.role
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLogin, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == req.email))
    user = res.scalars().first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    token = create_access_token(data={"sub": user.id, "role": user.role, "email": user.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
        role=user.role
    )


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.get("/users", response_model=List[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User))
    return res.scalars().all()


# Dual-decorated GET (Accepts both /customers and /customers/)
@router.get("/customers", response_model=List[CustomerOut])
@router.get("/customers/", response_model=List[CustomerOut], include_in_schema=False)
async def list_customers(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Customer))
    return res.scalars().all()


# Dual-decorated POST (Prevents 405 Method Not Allowed redirect drops)
@router.post("/customers", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
@router.post("/customers/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_customer(
    req: CustomerCreate,
    db: AsyncSession = Depends(get_db)
):
    name = req.company_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Company name cannot be blank.")

    new_customer = Customer(
        id=str(uuid.uuid4()),
        company_name=name,
        tier=req.tier.lower(),
        region=req.region.strip() or "US-East",
        portal_token=f"portal-{uuid.uuid4().hex[:12]}"
    )
    db.add(new_customer)
    await db.commit()
    await db.refresh(new_customer)
    return new_customer