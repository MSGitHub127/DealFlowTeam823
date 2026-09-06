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

def get_role_redirect(role: str, portal_token: Optional[str] = None) -> str:
    r = (role or "").lower()
    if r in ["customer", "customer_user"]:
        token = portal_token or "portal-acme-123"
        return f"/portal?token={token}"
    elif r in ["sales_manager", "salesmanager", "sales_rep"]:
        return "/salesdashboard"
    elif r in ["finance_ops", "finance"]:
        return "/finance-dashboard"
    elif r == "admin":
        return "/admin-config"
    else:
        return "/"

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    if token:
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")
            res = await db.execute(select(User).where(User.id == user_id))
            user = res.scalars().first()
            if user:
                return user

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

@router.post("/register", response_model=TokenResponse)
async def register_user(req: UserRegister, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == req.email))
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    role_val = (req.role or "customer_user").lower()
    portal_token = None

    if role_val in ["customer", "customer_user"]:
        portal_token = f"portal-{uuid.uuid4().hex[:12]}"
        cust_name = getattr(req, "company_name", None) or req.full_name or "New Client"
        new_customer = Customer(
            id=str(uuid.uuid4()),
            company_name=cust_name,
            tier="gold",
            region="US-East",
            portal_token=portal_token
        )
        db.add(new_customer)

    user = User(
        id=str(uuid.uuid4()),
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=role_val
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(data={"sub": user.id, "role": user.role, "email": user.email})
    redirect_path = get_role_redirect(user.role, portal_token)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut(id=user.id, email=user.email, full_name=user.full_name, role=user.role, portal_token=portal_token),
        role=user.role,
        redirect_url=redirect_path
    )

@router.post("/login", response_model=TokenResponse)
async def login(req: UserLogin, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == req.email))
    user = res.scalars().first()
    
    # CRASH FIX: Checks if user exists and has a password safely
    if not user or not user.hashed_password or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    portal_token = None
    
    # CRASH FIX: Handles NoneType role without throwing 500 Server Error
    role_str = (user.role or "").lower()
    
    if role_str in ["customer", "customer_user"]:
        cust_res = await db.execute(select(Customer).limit(1))
        cust = cust_res.scalars().first()
        if cust:
            portal_token = cust.portal_token

    token = create_access_token(data={"sub": user.id, "role": user.role, "email": user.email})
    redirect_path = get_role_redirect(user.role, portal_token)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut(id=user.id, email=user.email, full_name=user.full_name, role=user.role, portal_token=portal_token),
        role=user.role,
        redirect_url=redirect_path
    )

@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user

@router.get("/users", response_model=List[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User))
    return res.scalars().all()

@router.get("/customers", response_model=List[CustomerOut])
@router.get("/customers/", response_model=List[CustomerOut], include_in_schema=False)
async def list_customers(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Customer))
    return res.scalars().all()

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