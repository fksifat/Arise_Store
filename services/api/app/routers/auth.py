from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from datetime import timedelta
from app.config import settings
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token, session_revoked
from app.core.tenant import get_current_user
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )
    
    user = User(
        name=req.name.strip(),
        email=req.email.lower(),
        phone=req.phone.strip() if req.phone else None,
        password_hash=hash_password(req.password),
        role="merchant"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role)
    set_session(response, token)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated"
        )
    
    duration = timedelta(days=7) if req.remember_me else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(subject=user.id, role=user.role, expires_delta=duration)
    set_session(response, token, max_age=int(duration.total_seconds()))
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

def set_session(response: Response, token: str, max_age: int | None = None):
    response.set_cookie("arise_session", token, httponly=True, secure=settings.COOKIE_SECURE, samesite="lax", max_age=max_age if max_age is not None else settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, path="/")

@router.post("/logout", status_code=204)
def logout(request: Request, response: Response):
    token = request.cookies.get("arise_session")
    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        token = authorization[7:]
    payload = decode_access_token(token) if token else None
    if payload:
        session_revoked(payload, revoke=True)
    response.delete_cookie("arise_session", path="/", secure=settings.COOKIE_SECURE, httponly=True, samesite="lax")

