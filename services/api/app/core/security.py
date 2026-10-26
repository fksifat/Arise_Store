from datetime import datetime, timedelta, timezone
from typing import Optional, Any
import jwt
import secrets
import time
import math
from threading import Lock
from fastapi import HTTPException
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
from app.config import settings

ph = PasswordHasher()
_revocations = {}
_revocation_lock = Lock()

def session_revoked(payload: dict, revoke=False) -> bool:
    if settings.REDIS_URL:
        import redis
        try:
            client = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
            key = f"revoked:{payload['jti']}"
            if revoke:
                client.setex(key, max(1, math.ceil(payload["exp"] - time.time())), "1")
                return True
            return bool(client.exists(key))
        except redis.RedisError:
            raise HTTPException(503, "Session verification temporarily unavailable")
    # shortcut: standalone development revocations last until restart; production uses Redis.
    with _revocation_lock:
        for key, expiry in list(_revocations.items()):
            if expiry < time.time():
                del _revocations[key]
        if revoke:
            _revocations[payload["jti"]] = payload["exp"]
        return payload["jti"] in _revocations

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError):
        return False

def create_access_token(subject: str, role: str = "merchant", expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "iat": datetime.now(timezone.utc),
        "jti": secrets.token_urlsafe(24)
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"require": ["exp", "iat", "sub", "jti"]})
        if session_revoked(payload):
            return None
        return payload
    except jwt.PyJWTError:
        return None

