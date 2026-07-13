import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.asset import Asset, AssetStatus
from app.models.issue import Issue, IssueStatus, IssuePriority, ALLOWED_TRANSITIONS
from app.models.asset_history import AssetHistory
from app.models.maintenance_record import MaintenanceRecord
from app.schemas.issue import (
    IssueCreate, IssueReport, IssueAssign, IssueStatusUpdate,
    IssueResponse, IssueWithAssetResponse, AITriageResponse,
)
from app.middleware.auth import require_admin, require_technician_or_admin, require_auth
from app.services.ai_triage import call_ai_triage
from app.services.email_service import notify_assigned, notify_resolved
from app.routers.realtime import broadcast

router = APIRouter(prefix="/api/issues", tags=["issues"])


def generate_issue_number(db: Session) -> str:
    last = db.query(Issue).order_by(Issue.created_at.desc()).first()
    if last:
        try:
            num = int(last.issue_number.split("-")[1]) + 1
        except (IndexError, ValueError):
            num = 1
    else:
        num = 1
    return f"ISS-{num:05d}"


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


@router.get("", response_model=list[IssueWithAssetResponse])
def list_issues(
    request: Request,
    db: Session = Depends(get_db),
    status: str = None,
    priority: str = None,
    asset_id: str = None,
    assigned_to: str = None,
    search: str = None,
):
    user = require_technician_or_admin(request)
    q = db.query(Issue)
    if status:
        q = q.filter(Issue.status == status)
    if priority:
        q = q.filter(Issue.priority == priority)
    if asset_id:
        q = q.filter(Issue.asset_id == uuid.UUID(asset_id))
    if assigned_to:
        q = q.filter(Issue.assigned_technician_id == assigned_to)
    if search:
        q = q.filter(
            (Issue.title.ilike(f"%{search}%"))
            | (Issue.issue_number.ilike(f"%{search}%"))
            | (Issue.description.ilike(f"%{search}%"))
        )
    issues = q.order_by(Issue.created_at.desc()).all()
    result = []
    for issue in issues:
        asset = db.query(Asset).filter(Asset.id == issue.asset_id).first()
        data = IssueWithAssetResponse(
            id=str(issue.id),
            issue_number=issue.issue_number,
            asset_id=str(issue.asset_id),
            title=issue.title,
            description=issue.description,
            category=issue.category,
            priority=issue.priority.value if hasattr(issue.priority, "value") else issue.priority,
            status=issue.status.value if hasattr(issue.status, "value") else issue.status,
            reporter_name=issue.reporter_name,
            reporter_contact=issue.reporter_contact,
            ai_suggested=issue.ai_suggested,
            ai_edited=issue.ai_edited,
            assigned_technician_id=issue.assigned_technician_id,
            created_at=issue.created_at,
            updated_at=issue.updated_at,
            asset_code=asset.asset_code if asset else None,
            asset_name=asset.name if asset else None,
        )
        result.append(data)
    return result


@router.post("/report")
async def report_issue(payload: IssueReport, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.asset_code == payload.asset_code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    issue_number = generate_issue_number(db)
    recent_history = (
        db.query(AssetHistory)
        .filter(AssetHistory.asset_id == asset.id)
        .order_by(AssetHistory.created_at.desc())
        .limit(5)
        .all()
    )
    history_summary = "\n".join([f"- {h.action}: {h.description}" for h in recent_history]) or "No recent history"

    triage_result = None
    ai_suggested = False
    try:
        triage_result = await call_ai_triage(
            asset_category=asset.category,
            asset_name=asset.name,
            asset_condition=asset.condition,
            asset_location=asset.location,
            recent_history=history_summary,
            description=payload.description,
        )
        if triage_result:
            ai_suggested = True
    except Exception:
        triage_result = None

    if triage_result:
        title = triage_result.get("title", "Reported Issue")
        category = triage_result.get("category", "Other")
        try:
            priority_val = triage_result.get("priority", "medium")
            if priority_val not in [e.value for e in IssuePriority]:
                priority_val = "medium"
        except Exception:
            priority_val = "medium"
    else:
        title = payload.description[:200]
        category = "Other"
        priority_val = "medium"

    issue = Issue(
        issue_number=issue_number,
        asset_id=asset.id,
        title=title,
        description=payload.description,
        category=category,
        priority=priority_val,
        status=IssueStatus.reported,
        reporter_name=payload.reporter_name,
        reporter_contact=payload.reporter_contact,
        ai_suggested=ai_suggested,
        ai_edited=False,
    )
    db.add(issue)
    db.flush()

    asset.status = AssetStatus.issue_reported
    asset.updated_at = datetime.utcnow()

    _write_history(
        db, asset.id, issue.id, payload.reporter_name or "public", "reporter",
        "issue_reported", f"Issue {issue_number} reported: {title}"
    )
    db.commit()
    db.refresh(issue)

    response = {
        "id": str(issue.id),
        "issue_number": issue.issue_number,
        "title": issue.title,
        "description": issue.description,
        "category": issue.category,
        "priority": issue.priority.value if hasattr(issue.priority, "value") else issue.priority,
        "status": issue.status.value if hasattr(issue.status, "value") else issue.status,
        "ai_suggested": issue.ai_suggested,
        "ai_triage": triage_result,
    }
    return response


@router.post("/{issue_id}/confirm")
def confirm_issue(issue_id: str, payload: IssueCreate, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == uuid.UUID(issue_id)).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    issue.title = payload.title
    issue.description = payload.description
    if payload.category:
        issue.category = payload.category
    if payload.priority:
        issue.priority = IssuePriority(payload.priority)
    if payload.reporter_name:
        issue.reporter_name = payload.reporter_name
    issue.ai_edited = True
    issue.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(issue)
    return {"id": str(issue.id), "issue_number": issue.issue_number, "status": "confirmed"}


@router.patch("/{issue_id}/assign")
def assign_issue(issue_id: str, payload: IssueAssign, request: Request, db: Session = Depends(get_db)):
    user = require_admin(request)
    issue = db.query(Issue).filter(Issue.id == uuid.UUID(issue_id)).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    current_status = issue.status.value if hasattr(issue.status, "value") else issue.status
    if current_status not in ["reported", "reopened"]:
        raise HTTPException(status_code=400, detail=f"Cannot assign issue in '{current_status}' status")
    issue.assigned_technician_id = payload.technician_id
    issue.status = IssueStatus.assigned
    issue.updated_at = datetime.utcnow()
    _write_history(
        db, issue.asset_id, issue.id, user["user_id"], user["role"],
        "issue_assigned", f"Issue assigned to technician {payload.technician_id}"
    )
    db.commit()
    db.refresh(issue)
    asset = db.query(Asset).filter(Asset.id == issue.asset_id).first()
    notify_assigned(issue.issue_number, asset.name if asset else "", payload.technician_id, issue.reporter_contact)
    return {"id": str(issue.id), "status": "assigned"}


@router.patch("/{issue_id}/status")
def update_issue_status(issue_id: str, payload: IssueStatusUpdate, request: Request, db: Session = Depends(get_db)):
    user = require_auth(request)
    issue = db.query(Issue).filter(Issue.id == uuid.UUID(issue_id)).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    current_status = issue.status.value if hasattr(issue.status, "value") else issue.status

    if user["role"] == "technician":
        if issue.assigned_technician_id != user["user_id"]:
            raise HTTPException(status_code=403, detail="Technicians can only update their own assigned issues")

    new_status = payload.status
    if new_status not in [s.value for s in IssueStatus]:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")

    if current_status == new_status:
        return {"id": str(issue.id), "status": current_status, "message": "No change"}

    allowed = ALLOWED_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current_status}' to '{new_status}'. Allowed: {allowed}",
        )

    if new_status == "resolved":
        has_maintenance = db.query(MaintenanceRecord).filter(MaintenanceRecord.issue_id == issue.id).count()
        if has_maintenance == 0:
            raise HTTPException(status_code=400, detail="Cannot resolve issue without at least one maintenance record")

    issue.status = new_status
    issue.updated_at = datetime.utcnow()

    if new_status == "resolved":
        asset = db.query(Asset).filter(Asset.id == issue.asset_id).first()
        if asset:
            asset.status = AssetStatus.operational
            asset.updated_at = datetime.utcnow()
        notify_resolved(issue.issue_number, asset.name if asset else "", issue.reporter_contact)

    _write_history(
        db, issue.asset_id, issue.id, user["user_id"], user["role"],
        "status_changed", f"Status: {current_status} → {new_status}"
    )
    db.commit()
    db.refresh(issue)
    import asyncio
    asyncio.create_task(broadcast({"type": "issue_status", "issue_number": issue.issue_number, "status": new_status, "asset": asset.asset_code if asset else None}))
    return {"id": str(issue.id), "status": new_status}


@router.get("/{issue_id}", response_model=IssueResponse)
def get_issue(issue_id: str, request: Request, db: Session = Depends(get_db)):
    user = require_technician_or_admin(request)
    issue = db.query(Issue).filter(Issue.id == uuid.UUID(issue_id)).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@router.get("/track/{issue_number}")
def track_issue(issue_number: str, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.issue_number == issue_number).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    asset = db.query(Asset).filter(Asset.id == issue.asset_id).first()
    return {
        "issue_number": issue.issue_number,
        "title": issue.title,
        "status": issue.status.value if hasattr(issue.status, "value") else issue.status,
        "priority": issue.priority.value if hasattr(issue.priority, "value") else issue.priority,
        "category": issue.category,
        "created_at": issue.created_at.isoformat(),
        "updated_at": issue.updated_at.isoformat(),
        "asset_code": asset.asset_code if asset else None,
        "asset_name": asset.name if asset else None,
    }
