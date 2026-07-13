import time
from collections import defaultdict, deque
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

_LIMITS = {
    "/api/issues/report": (10, 60),
    "/api/ai/triage": (20, 60),
    "/api/ai/translate": (20, 60),
    "/api/ai/preventive": (20, 60),
    "/api/ai/health-analysis": (20, 60),
    "/api/ai/maintenance-summary": (20, 60),
    "/api/upload": (30, 60),
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.hits: dict[str, deque] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        limit = _LIMITS.get(path)
        if limit:
            max_hits, window = limit
            client = request.client.host if request.client else "unknown"
            key = f"{client}:{path}"
            now = time.time()
            dq = self.hits[key]
            while dq and dq[0] < now - window:
                dq.popleft()
            if len(dq) >= max_hits:
                retry = int(window - (now - dq[0])) + 1
                return Response(
                    content=f'{{"detail":"Rate limit exceeded. Try again in {retry}s"}}',
                    status_code=429,
                    media_type="application/json",
                )
            dq.append(now)
        return await call_next(request)
