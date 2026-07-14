from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import assets, issues, maintenance, ai, realtime, dashboard
from app.middleware.rate_limit import RateLimitMiddleware
from app.config import FRONTEND_URL

app = FastAPI(title="MaintainIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)

app.include_router(assets.router)
app.include_router(issues.router)
app.include_router(maintenance.router)
app.include_router(ai.router)
app.include_router(realtime.router)
app.include_router(dashboard.router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"status": "ok", "service": "MaintainIQ API"}


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MaintainIQ API"}
