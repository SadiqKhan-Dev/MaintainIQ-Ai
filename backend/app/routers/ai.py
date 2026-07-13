from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.asset import Asset
from app.models.asset_history import AssetHistory
from app.models.issue import Issue
from app.services.ai_triage import call_ai_triage
from app.services.ai_enhancements import (
    maintenance_summary,
    asset_health_analysis,
    preventive_recommendation,
    translate_to_english,
)
from app.services.cloudinary_service import upload_image

router = APIRouter(prefix="/api", tags=["ai"])


class MaintenanceSummaryIn(BaseModel):
    asset_name: str
    technician_notes: str = ""
    parts_replaced: list[str] = []
    cost: float = 0


class TranslateIn(BaseModel):
    text: str


def _history_text(db: Session, asset_id) -> str:
    rows = (
        db.query(AssetHistory)
        .filter(AssetHistory.asset_id == asset_id)
        .order_by(AssetHistory.created_at.desc())
        .limit(15)
        .all()
    )
    return "\n".join([f"- {h.action}: {h.description}" for h in rows]) or "No recent history"


@router.post("/ai/triage")
async def ai_triage(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    asset_code = body.get("asset_code", "")
    description = body.get("description", "")

    asset = db.query(Asset).filter(Asset.asset_code == asset_code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    recent_history = (
        db.query(AssetHistory)
        .filter(AssetHistory.asset_id == asset.id)
        .order_by(AssetHistory.created_at.desc())
        .limit(5)
        .all()
    )
    history_text = "\n".join([f"- {h.action}: {h.description}" for h in recent_history]) or "No recent history"

    result = await call_ai_triage(
        asset_category=asset.category,
        asset_name=asset.name,
        asset_condition=asset.condition,
        asset_location=asset.location,
        recent_history=history_text,
        description=description,
    )
    return result or {"error": "AI triage unavailable", "title": description[:200], "category": "Other", "priority": "medium", "possible_causes": [], "initial_checks": [], "recurring_pattern_warning": None}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    url = upload_image(contents)
    return {"url": url}


@router.post("/ai/maintenance-summary")
async def ai_maintenance_summary(payload: MaintenanceSummaryIn):
    summary = await maintenance_summary(
        asset_name=payload.asset_name,
        technician_notes=payload.technician_notes,
        parts_replaced=payload.parts_replaced,
        cost=payload.cost,
    )
    return {"summary": summary or "AI summary unavailable. Please write a manual note."}


@router.post("/ai/health-analysis")
async def ai_health_analysis(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    asset_code = body.get("asset_code", "")
    asset = db.query(Asset).filter(Asset.asset_code == asset_code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    result = await asset_health_analysis(
        asset_name=asset.name,
        category=asset.category,
        history_summary=_history_text(db, asset.id),
    )
    return result or {"health_score": 70, "recurring_issues": [], "risk_level": "medium", "analysis": "Insufficient data"}


@router.post("/ai/preventive")
async def ai_preventive(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    asset_code = body.get("asset_code", "")
    asset = db.query(Asset).filter(Asset.asset_code == asset_code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    result = await preventive_recommendation(
        asset_name=asset.name,
        category=asset.category,
        condition=asset.condition,
        last_service_date=str(asset.last_service_date) if asset.last_service_date else None,
        next_service_date=str(asset.next_service_date) if asset.next_service_date else None,
        history_summary=_history_text(db, asset.id),
    )
    return result or {"recommended_action": "Schedule a routine inspection", "suggested_next_service": "within 30 days", "priority": "medium", "rationale": "Insufficient data"}


@router.post("/ai/translate")
async def ai_translate(payload: TranslateIn):
    translated = await translate_to_english(payload.text)
    return {"translated": translated or payload.text}
