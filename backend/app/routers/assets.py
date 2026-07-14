import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.asset import Asset, AssetStatus
from app.models.asset_history import AssetHistory
from app.models.issue import Issue
from app.models.maintenance_record import MaintenanceRecord
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse, AssetPublicResponse
from app.middleware.auth import require_admin, require_technician_or_admin, extract_user_from_request
from app.services.qr_service import generate_qr_code
from app.config import FRONTEND_URL

router = APIRouter(prefix="/api/assets", tags=["assets"])


def _write_history(db: Session, asset_id, issue_id, actor_id, actor_role, action, description):
    h = AssetHistory(
        asset_id=asset_id,
        issue_id=issue_id,
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        description=description,
    )
    db.add(h)


@router.post("", response_model=AssetResponse)
def create_asset(payload: AssetCreate, request: Request, db: Session = Depends(get_db)):
    user = require_admin(request)
    existing = db.query(Asset).filter(Asset.asset_code == payload.asset_code).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Asset code '{payload.asset_code}' already exists")
    data = payload.model_dump()
    if data.get("parent_asset_id"):
        data["parent_asset_id"] = uuid.UUID(data["parent_asset_id"])
    asset = Asset(**data)
    db.add(asset)
    db.flush()
    _write_history(db, asset.id, None, user["user_id"], user["role"], "asset_created", f"Asset '{asset.name}' created with code {asset.asset_code}")
    db.commit()
    db.refresh(asset)
    return asset


@router.get("", response_model=list[AssetResponse])
def list_assets(
    request: Request,
    db: Session = Depends(get_db),
    status: str = None,
    category: str = None,
    location: str = None,
    search: str = None,
):
    user = require_technician_or_admin(request)
    q = db.query(Asset)
    if status:
        q = q.filter(Asset.status == status)
    if category:
        q = q.filter(Asset.category == category)
    if location:
        q = q.filter(Asset.location.ilike(f"%{location}%"))
    if search:
        q = q.filter(
            (Asset.name.ilike(f"%{search}%"))
            | (Asset.asset_code.ilike(f"%{search}%"))
            | (Asset.category.ilike(f"%{search}%"))
        )
    return q.order_by(Asset.created_at.desc()).all()


@router.get("/qr/{code}")
def get_asset_qr(code: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.asset_code == code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    url = f"{FRONTEND_URL}/assets/{code}"
    qr_bytes = generate_qr_code(url)
    from fastapi.responses import Response
    return Response(content=qr_bytes, media_type="image/png")


@router.get("/code/{code}", response_model=AssetResponse)
def get_asset_by_code(code: str, request: Request, db: Session = Depends(get_db)):
    require_technician_or_admin(request)
    asset = db.query(Asset).filter(Asset.asset_code == code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.get("/{code}")
def get_asset_public(code: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.asset_code == code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    recent_history = (
        db.query(AssetHistory)
        .filter(AssetHistory.asset_id == asset.id)
        .order_by(AssetHistory.created_at.desc())
        .limit(10)
        .all()
    )
    return {
        "asset_code": asset.asset_code,
        "name": asset.name,
        "category": asset.category,
        "location": asset.location,
        "condition": asset.condition,
        "status": asset.status.value if hasattr(asset.status, 'value') else asset.status,
        "last_service_date": asset.last_service_date,
        "next_service_date": asset.next_service_date,
        "is_retired": (asset.status.value if hasattr(asset.status, 'value') else asset.status) == "retired",
        "recent_activity": [
            {
                "action": h.action,
                "description": h.description,
                "created_at": h.created_at.isoformat(),
            }
            for h in recent_history
        ],
    }


@router.patch("/{asset_id}")
def update_asset(asset_id: str, payload: AssetUpdate, request: Request, db: Session = Depends(get_db)):
    user = require_admin(request)
    asset = db.query(Asset).filter(Asset.id == uuid.UUID(asset_id)).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("parent_asset_id"):
        update_data["parent_asset_id"] = uuid.UUID(update_data["parent_asset_id"])
    if "next_service_date" in update_data and "last_service_date" in update_data:
        if update_data["next_service_date"] and update_data["last_service_date"]:
            if update_data["next_service_date"] < update_data["last_service_date"]:
                raise HTTPException(status_code=400, detail="next_service_date cannot precede last_service_date")
    if "next_service_date" in update_data and update_data["next_service_date"] and not update_data.get("last_service_date"):
        if asset.last_service_date and update_data["next_service_date"] < asset.last_service_date:
            raise HTTPException(status_code=400, detail="next_service_date cannot precede last_service_date")
    for key, value in update_data.items():
        setattr(asset, key, value)
    asset.updated_at = datetime.utcnow()
    _write_history(db, asset.id, None, user["user_id"], user["role"], "asset_updated", f"Asset updated: {', '.join(update_data.keys())}")
    db.commit()
    db.refresh(asset)
    return asset


@router.post("/{asset_id}/retire")
def retire_asset(asset_id: str, request: Request, db: Session = Depends(get_db)):
    user = require_admin(request)
    asset = db.query(Asset).filter(Asset.id == uuid.UUID(asset_id)).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset.status = AssetStatus.retired
    asset.updated_at = datetime.utcnow()
    _write_history(db, asset.id, None, user["user_id"], user["role"], "asset_retired", f"Asset '{asset.name}' marked as retired")
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: str, request: Request, db: Session = Depends(get_db)):
    user = require_admin(request)
    asset = db.query(Asset).filter(Asset.id == uuid.UUID(asset_id)).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    issues = db.query(Issue).filter(Issue.asset_id == asset.id).all()
    issue_ids = [i.id for i in issues]
    if issue_ids:
        db.query(MaintenanceRecord).filter(MaintenanceRecord.issue_id.in_(issue_ids)).delete(synchronize_session=False)
        db.query(AssetHistory).filter(AssetHistory.issue_id.in_(issue_ids)).delete(synchronize_session=False)
    db.query(AssetHistory).filter(AssetHistory.asset_id == asset.id).delete(synchronize_session=False)
    if issue_ids:
        db.query(Issue).filter(Issue.id.in_(issue_ids)).delete(synchronize_session=False)

    db.delete(asset)
    db.commit()
    return Response(status_code=204)


@router.get("/{code}/label")
def get_asset_label(code: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.asset_code == code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    url = f"{FRONTEND_URL}/assets/{code}"
    qr_bytes = generate_qr_code(url)
    from fastapi.responses import Response
    return Response(content=qr_bytes, media_type="image/png")
