import base64
import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
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
from app.services.email_service import notify_assigned, notify_resolved, notify_status_change, notify_reported
from app.services.sla import compute_sla_due, sla_status
from app.services.notifications import send_webhook
from app.config import FRONTEND_URL
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
            sla_due_at=issue.sla_due_at,
            work_order_type=issue.work_order_type,
            generated_by=issue.generated_by,
            sla_status=sla_status(issue.sla_due_at),
            created_at=issue.created_at,
            updated_at=issue.updated_at,
            asset_code=asset.asset_code if asset else None,
            asset_name=asset.name if asset else None,
        )
        result.append(data)
    return result


async def _create_issue_from_report(db, asset, description, reporter_name, reporter_contact):
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
            description=description,
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
        title = description[:200]
        category = "Other"
        priority_val = "medium"

    issue = Issue(
        issue_number=issue_number,
        asset_id=asset.id,
        title=title,
        description=description,
        category=category,
        priority=priority_val,
        status=IssueStatus.reported,
        reporter_name=reporter_name,
        reporter_contact=reporter_contact,
        ai_suggested=ai_suggested,
        ai_edited=False,
        work_order_type="reactive",
    )
    db.add(issue)
    db.flush()

    asset.status = AssetStatus.issue_reported
    asset.updated_at = datetime.utcnow()

    _write_history(
        db, asset.id, issue.id, reporter_name or "public", "reporter",
        "issue_reported", f"Issue {issue_number} reported: {title}"
    )
    db.commit()
    db.refresh(issue)

    tracking_url = f"{FRONTEND_URL}/track/{issue.issue_number}"
    notify_reported(issue.issue_number, asset.name, reporter_contact, tracking_url)
    if priority_val == "critical":
        send_webhook(
            f":rotating_light: New CRITICAL issue {issue.issue_number} for {asset.name} ({asset.asset_code}) at {asset.location}",
            extra={"blocks": [{"type": "section", "text": {"type": "mrkdwn", "text": f"*Critical issue* {issue.issue_number}\n*{asset.name}* ({asset.asset_code})\nLocation: {asset.location}\n{description}"}}]},
        )

    return issue, triage_result


@router.post("/report")
async def report_issue(payload: IssueReport, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.asset_code == payload.asset_code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    issue, triage_result = await _create_issue_from_report(
        db, asset, payload.description, payload.reporter_name, payload.reporter_contact
    )
    return {
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


class IssueReportMedia(BaseModel):
    asset_code: str
    description: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None
    media_data: Optional[str] = None
    media_type: Optional[str] = None


def _upload_media(media_data: str, media_type: str) -> Optional[str]:
    try:
        from app.services.cloudinary_service import upload_image, upload_video
    except Exception:
        return None
    try:
        if "," in media_data:
            media_data = media_data.split(",", 1)[1]
        raw = base64.b64decode(media_data)
        if media_type == "audio":
            return upload_video(raw)
        return upload_image(raw)
    except Exception:
        return None


@router.post("/report-media")
async def report_issue_media(payload: IssueReportMedia, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.asset_code == payload.asset_code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    media_url = None
    if payload.media_data:
        media_url = _upload_media(payload.media_data, payload.media_type or "image")

    description = payload.description or ""
    if not description:
        description = f"Reported via {'voice' if payload.media_type == 'audio' else 'photo'} on {asset.name}."
    if media_url:
        description = f"{description}\n[Attached media: {media_url}]"

    issue, triage_result = await _create_issue_from_report(
        db, asset, description, payload.reporter_name, payload.reporter_contact
    )
    return {
        "id": str(issue.id),
        "issue_number": issue.issue_number,
        "title": issue.title,
        "media_url": media_url,
        "priority": issue.priority.value if hasattr(issue.priority, "value") else issue.priority,
        "status": issue.status.value if hasattr(issue.status, "value") else issue.status,
        "ai_triage": triage_result,
    }


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
    issue.sla_due_at = compute_sla_due(
        issue.priority.value if hasattr(issue.priority, "value") else issue.priority,
        datetime.utcnow(),
    )
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

    asset = db.query(Asset).filter(Asset.id == issue.asset_id).first()
    if new_status == "resolved" and asset:
        asset.status = AssetStatus.operational
        asset.updated_at = datetime.utcnow()
        notify_resolved(issue.issue_number, asset.name, issue.reporter_contact)

    notify_status_change(
        issue.issue_number,
        asset.name if asset else "",
        new_status,
        issue.reporter_contact,
        f"{FRONTEND_URL}/track/{issue.issue_number}",
    )
    if new_status == "resolved":
        send_webhook(f":white_check_mark: Issue {issue.issue_number} for {asset.name if asset else 'asset'} resolved")

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
        "work_order_type": issue.work_order_type,
        "created_at": issue.created_at.isoformat(),
        "updated_at": issue.updated_at.isoformat(),
        "asset_code": asset.asset_code if asset else None,
        "asset_name": asset.name if asset else None,
    }


OPEN_STATUSES = [
    "reported", "assigned", "inspection_started", "maintenance_in_progress",
    "waiting_for_parts", "reopened",
]


@router.post("/generate-preventive")
def generate_preventive_work_orders(
    request: Request,
    db: Session = Depends(get_db),
    lookahead_days: int = 14,
):
    user = require_admin(request)
    today = datetime.utcnow().date()
    cutoff = today + timedelta(days=lookahead_days)

    due_assets = (
        db.query(Asset)
        .filter(
            Asset.next_service_date.isnot(None),
            Asset.next_service_date <= cutoff,
            Asset.status != AssetStatus.retired,
        )
        .all()
    )

    created = 0
    skipped = 0
    for asset in due_assets:
        existing = (
            db.query(Issue)
            .filter(
                Issue.asset_id == asset.id,
                Issue.work_order_type == "preventive",
                Issue.status.in_(OPEN_STATUSES),
            )
            .first()
        )
        if existing:
            skipped += 1
            continue

        issue_number = generate_issue_number(db)
        due_dt = datetime(asset.next_service_date.year, asset.next_service_date.month, asset.next_service_date.day)
        issue = Issue(
            issue_number=issue_number,
            asset_id=asset.id,
            title=f"Preventive maintenance: {asset.name}",
            description=f"Scheduled preventive maintenance due {asset.next_service_date}.",
            category="Preventive",
            priority="medium",
            status=IssueStatus.reported,
            ai_suggested=False,
            ai_edited=False,
            work_order_type="preventive",
            generated_by="system",
            sla_due_at=due_dt,
        )
        db.add(issue)
        db.flush()
        _write_history(
            db, asset.id, issue.id, user["user_id"], user["role"],
            "preventive_generated", f"Preventive work order {issue_number} generated (due {asset.next_service_date})",
        )
        created += 1

    db.commit()
    return {"created": created, "skipped": skipped, "lookahead_days": lookahead_days}


@router.get("/sla-breach")
def list_sla_breaches(request: Request, db: Session = Depends(get_db)):
    user = require_technician_or_admin(request)
    now = datetime.utcnow()
    breached = (
        db.query(Issue)
        .filter(
            Issue.sla_due_at.isnot(None),
            Issue.sla_due_at <= now,
            Issue.status.in_(OPEN_STATUSES),
        )
        .all()
    )
    result = []
    for issue in breached:
        asset = db.query(Asset).filter(Asset.id == issue.asset_id).first()
        result.append({
            "issue_number": issue.issue_number,
            "title": issue.title,
            "priority": issue.priority.value if hasattr(issue.priority, "value") else issue.priority,
            "sla_due_at": issue.sla_due_at.isoformat(),
            "asset_code": asset.asset_code if asset else None,
            "asset_name": asset.name if asset else None,
        })
    if result:
        send_webhook(f":warning: {len(result)} issue(s) have breached SLA")
    return result
