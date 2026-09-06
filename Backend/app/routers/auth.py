from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.database import get_db
from app.models.user import User, Customer
from app.schemas.auth import UserLogin, UserRegister, UserOut, CustomerOut, TokenResponse
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    if not token:
        # Fallback for dev convenience: lookup first user or admin
        res = await db.execute(select(User).limit(1))
        user = res.scalars().first()
        if user:
            return user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user_id = payload.get("sub")
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def require_role(allowed_roles: List[str]):
    async def role_checker(user: User = Depends(get_current_user)):
        if user.role not in allowed_roles and "admin" not in allowed_roles and user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Role '{user.role}' not permitted for this operation.")
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

@router.get("/customers", response_model=List[CustomerOut])
async def list_customers(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Customer))
    return res.scalars().all()
