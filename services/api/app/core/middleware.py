import hashlib
import logging
import time
import uuid
from collections import defaultdict
from threading import Lock
from fastapi import Request
from starlette.responses import JSONResponse
from app.config import settings

logger = logging.getLogger("arise.http")
_counts = defaultdict(lambda: [0, 0])
_lock = Lock()

class BodyLimitMiddleware:
    def __init__(self, app, max_bytes=1048576):
        self.app, self.max_bytes = app, max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("method") in ("GET", "HEAD", "OPTIONS"):
            return await self.app(scope, receive, send)
        chunks, size = [], 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            size += len(message.get("body", b""))
            if size > self.max_bytes:
                return await JSONResponse({"detail": "Request body exceeds 1 MiB"}, status_code=413)(scope, receive, send)
            chunks.append(message.get("body", b""))
            if not message.get("more_body", False):
                break
        consumed = False
        async def replay():
            nonlocal consumed
            if not consumed:
                consumed = True
                return {"type": "http.request", "body": b"".join(chunks), "more_body": False}
            return await receive()
        await self.app(scope, replay, send)


def allow_request(key: str, limit: int) -> bool:
    minute = int(time.time() // 60)
    if settings.REDIS_URL:
        import redis
        client = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
        with client.pipeline() as pipe:
            pipe.incr(f"rate:{key}:{minute}")
            pipe.expire(f"rate:{key}:{minute}", 120)
            count, _ = pipe.execute()
        return count <= limit
    # shortcut: process-local limits for standalone development; production requires Redis.
    with _lock:
        if len(_counts) > 10000:
            _counts.clear()
        if _counts[key][0] != minute:
            _counts[key] = [minute, 0]
        _counts[key][1] += 1
        return _counts[key][1] <= limit


async def security_middleware(request: Request, call_next):
    request_id = uuid.uuid4().hex
    start = time.monotonic()
    path = request.url.path
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin")
        if (request.cookies.get("arise_session") or path in ("/api/v1/auth/login", "/api/v1/auth/register")) and origin not in settings.ALLOWED_ORIGINS:
            return JSONResponse({"detail": "Request origin is not allowed"}, status_code=403)
    if path.startswith("/api/"):
        limit = 300
        if "/auth/login" in path or "/auth/register" in path:
            limit = 10
        elif "/public/orders" in path:
            limit = 30
        address = request.client.host if request.client else "unknown"
        key = hashlib.sha256(f"{address}:{path.split('/api/v1/')[-1].split('/')[0]}:{limit}".encode()).hexdigest()
        try:
            allowed = allow_request(key, limit)
        except Exception:
            logger.exception("Rate limiter unavailable request_id=%s", request_id)
            return JSONResponse({"detail": "Service temporarily unavailable"}, status_code=503)
        if not allowed:
            return JSONResponse({"detail": "Too many requests. Try again shortly."}, status_code=429, headers={"Retry-After": "60"})
    response = await call_next(request)
    response.headers.update({
        "X-Request-ID": request_id,
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Frame-Options": "DENY",
    })
    if path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    logger.info("request_id=%s method=%s path=%s status=%s duration_ms=%.1f", request_id, request.method, path, response.status_code, (time.monotonic() - start) * 1000)
    return response
