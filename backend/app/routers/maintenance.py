import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.issue import Issue, IssueStatus
from app.models.maintenance_record import MaintenanceRecord
from app.models.asset import Asset, AssetStatus
from app.schemas.maintenance import MaintenanceRecordCreate, MaintenanceRecordResponse
from app.middleware.auth import require_technician_or_admin
from app.models.asset_history import AssetHistory
from app.routers.realtime import broadcast

router = APIRouter(prefix="/api", tags=["maintenance"])


def _write_history(db, asset_id, issue_id, actor_id, actor_role, action, description):
    h = AssetHistory(
        asset_id=asset_id, issue_id=issue_id, actor_id=actor_id,
        actor_role=actor_role, action=action, description=description,
    )
    db.add(h)


@router.get("/issues/{issue_id}/maintenance", response_model=list[MaintenanceRecordResponse])
def list_maintenance_records(issue_id: str, request: Request, db: Session = Depends(get_db)):
    require_technician_or_admin(request)
    uuid.UUID(issue_id)
    records = (
        db.query(MaintenanceRecord)
        .filter(MaintenanceRecord.issue_id == uuid.UUID(issue_id))
        .order_by(MaintenanceRecord.created_at.asc())
        .all()
    )
    return records


@router.post("/issues/{issue_id}/maintenance", response_model=MaintenanceRecordResponse)
def create_maintenance_record(
    issue_id: str,
    payload: MaintenanceRecordCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    user = require_technician_or_admin(request)
    issue = db.query(Issue).filter(Issue.id == uuid.UUID(issue_id)).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if user["role"] == "technician":
        if issue.assigned_technician_id != user["user_id"]:
            raise HTTPException(status_code=403, detail="Technicians can only add records to their own assigned issues")

    if payload.cost < 0:
        raise HTTPException(status_code=400, detail="Cost cannot be negative")

    record = MaintenanceRecord(
        issue_id=issue.id,
        technician_id=user["user_id"],
        inspection_notes=payload.inspection_notes,
        work_performed=payload.work_performed,
        parts_replaced=payload.parts_replaced,
        cost=payload.cost,
        evidence_urls=payload.evidence_urls,
        final_condition=payload.final_condition,
    )
    db.add(record)
    db.flush()

    current_status = issue.status.value if hasattr(issue.status, "value") else issue.status
    if current_status == "reported":
        issue.status = IssueStatus.inspection_started
    issue.updated_at = datetime.utcnow()

    if payload.final_condition:
        asset = db.query(Asset).filter(Asset.id == issue.asset_id).first()
        if asset:
            asset.condition = payload.final_condition
            asset.last_service_date = datetime.utcnow().date()
            asset.updated_at = datetime.utcnow()

    _write_history(
        db, issue.asset_id, issue.id, user["user_id"], user["role"],
        "maintenance_record_added", f"Maintenance record added: {payload.work_performed or 'No details'}"
    )
    db.commit()
    db.refresh(record)
    import asyncio
    asyncio.create_task(broadcast({"type": "maintenance", "issue_number": issue.issue_number, "asset": asset.asset_code if asset else None}))
    return record


@router.get("/assets/{asset_id}/history")
def get_asset_history(asset_id: str, request: Request, db: Session = Depends(get_db)):
    user = require_technician_or_admin(request)
    asset_uuid = uuid.UUID(asset_id)
    asset = db.query(Asset).filter(Asset.id == asset_uuid).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    history = (
        db.query(AssetHistory)
        .filter(AssetHistory.asset_id == asset_uuid)
        .order_by(AssetHistory.created_at.desc())
        .all()
    )
    return [
        {
            "id": str(h.id),
            "asset_id": str(h.asset_id),
            "issue_id": str(h.issue_id) if h.issue_id else None,
            "actor_id": h.actor_id,
            "actor_role": h.actor_role,
            "action": h.action,
            "description": h.description,
            "created_at": h.created_at.isoformat(),
        }
        for h in history
    ]
