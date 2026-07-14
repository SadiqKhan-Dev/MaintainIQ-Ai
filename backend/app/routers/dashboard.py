from collections import Counter, defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.asset import Asset, AssetStatus
from app.models.issue import Issue, IssueStatus, IssuePriority
from app.models.maintenance_record import MaintenanceRecord
from app.models.asset_history import AssetHistory
from app.middleware.auth import require_technician_or_admin

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _status(i: Issue) -> str:
    return i.status.value if hasattr(i.status, "value") else i.status


@router.get("/cost-analytics")
def cost_analytics(request: Request, db: Session = Depends(get_db)):
    require_technician_or_admin(request)
    maint = db.query(MaintenanceRecord).all()
    issues = db.query(Issue).all()
    assets = db.query(Asset).all()
    asset_map = {a.id: a for a in assets}
    issue_map = {i.id: i for i in issues}

    total_cost = sum(float(m.cost or 0) for m in maint)

    cost_by_asset = {}
    cost_by_location = defaultdict(float)
    for m in maint:
        issue = issue_map.get(m.issue_id)
        if not issue:
            continue
        asset = asset_map.get(issue.asset_id)
        if not asset:
            continue
        amt = float(m.cost or 0)
        if asset.asset_code not in cost_by_asset:
            cost_by_asset[asset.asset_code] = {"asset_code": asset.asset_code, "name": asset.name, "cost": 0.0}
        cost_by_asset[asset.asset_code]["cost"] += amt
        cost_by_location[asset.location] += amt

    top_assets = sorted(cost_by_asset.values(), key=lambda x: -x["cost"])[:5]
    top_locations = [{"location": loc, "cost": round(c, 2)} for loc, c in sorted(cost_by_location.items(), key=lambda x: -x[1])[:5]]

    resolved = [i for i in issues if _status(i) in ("resolved", "closed")]
    mttr_hours = 0.0
    if resolved:
        total_sec = sum((i.updated_at - i.created_at).total_seconds() for i in resolved)
        mttr_hours = round((total_sec / len(resolved)) / 3600.0, 1)

    issues_with_cost = {m.issue_id for m in maint}
    avg_cost_per_issue = round(total_cost / len(issues_with_cost), 2) if issues_with_cost else 0.0

    open_count = sum(1 for i in issues if _status(i) in ("reported", "assigned", "inspection_started", "maintenance_in_progress", "waiting_for_parts", "reopened"))

    return {
        "total_maintenance_cost": round(total_cost, 2),
        "avg_cost_per_issue": avg_cost_per_issue,
        "mttr_hours": mttr_hours,
        "resolved_count": len(resolved),
        "open_count": open_count,
        "top_assets_by_cost": [{"asset_code": a["asset_code"], "name": a["name"], "cost": round(a["cost"], 2)} for a in top_assets],
        "top_locations_by_cost": top_locations,
    }


@router.get("/summary")
def dashboard_summary(request: Request, db: Session = Depends(get_db)):
    require_technician_or_admin(request)

    assets = db.query(Asset).all()
    issues = db.query(Issue).all()

    assets_by_status = Counter(a.status.value if hasattr(a.status, "value") else a.status for a in assets)
    issues_by_status = Counter(i.status.value if hasattr(i.status, "value") else i.status for i in issues)
    issues_by_priority = Counter(i.priority.value if hasattr(i.priority, "value") else i.priority for i in issues)

    open_statuses = ["reported", "assigned", "inspection_started", "maintenance_in_progress", "waiting_for_parts", "reopened"]
    open_issues = [i for i in issues if (i.status.value if hasattr(i.status, "value") else i.status) in open_statuses]
    critical_issues = [i for i in open_issues if (i.priority.value if hasattr(i.priority, "value") else i.priority) == "critical"]
    high_issues = [i for i in open_issues if (i.priority.value if hasattr(i.priority, "value") else i.priority) == "high"]

    total_cost = sum(float(m.cost) for m in db.query(MaintenanceRecord).all())

    today = date.today()
    due_soon = []
    for a in assets:
        if a.status.value if hasattr(a.status, "value") else a.status == "retired":
            continue
        if a.next_service_date:
            days = (a.next_service_date - today).days
            if days <= 30:
                due_soon.append({
                    "asset_code": a.asset_code,
                    "name": a.name,
                    "next_service_date": str(a.next_service_date),
                    "days_left": days,
                    "status": a.status.value if hasattr(a.status, "value") else a.status,
                })
    due_soon.sort(key=lambda x: x["days_left"])

    by_asset = Counter(i.asset_id for i in issues)
    asset_map = {a.id: a for a in assets}
    recurring = []
    for asset_id, count in by_asset.most_common(6):
        a = asset_map.get(asset_id)
        if a and count >= 2:
            recurring.append({
                "asset_code": a.asset_code,
                "name": a.name,
                "issue_count": count,
                "open": sum(1 for i in issues if i.asset_id == asset_id and (i.status.value if hasattr(i.status, "value") else i.status) in open_statuses),
            })

    tech_workload = defaultdict(lambda: {"open": 0, "critical": 0})
    for i in open_issues:
        tid = i.assigned_technician_id
        if not tid:
            continue
        tech_workload[tid]["open"] += 1
        if (i.priority.value if hasattr(i.priority, "value") else i.priority) == "critical":
            tech_workload[tid]["critical"] += 1
    technician_workload = [
        {"technician_id": tid, **vals} for tid, vals in sorted(tech_workload.items(), key=lambda x: -x[1]["open"])
    ]

    recent = (
        db.query(AssetHistory)
        .order_by(AssetHistory.created_at.desc())
        .limit(12)
        .all()
    )
    recent_activity = []
    for h in recent:
        a = asset_map.get(h.asset_id)
        recent_activity.append({
            "id": str(h.id),
            "action": h.action,
            "description": h.description,
            "actor_role": h.actor_role,
            "asset_code": a.asset_code if a else None,
            "asset_name": a.name if a else None,
            "created_at": h.created_at.isoformat(),
        })

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "kpis": {
            "total_assets": len(assets),
            "operational": assets_by_status.get("operational", 0),
            "issue_reported": assets_by_status.get("issue_reported", 0),
            "under_maintenance": assets_by_status.get("under_maintenance", 0) + assets_by_status.get("under_inspection", 0),
            "out_of_service": assets_by_status.get("out_of_service", 0),
            "retired": assets_by_status.get("retired", 0),
            "open_issues": len(open_issues),
            "critical_issues": len(critical_issues),
            "high_issues": len(high_issues),
            "resolved_total": issues_by_status.get("resolved", 0) + issues_by_status.get("closed", 0),
            "total_maintenance_cost": round(total_cost, 2),
            "due_for_service": len(due_soon),
        },
        "assets_by_status": dict(assets_by_status),
        "issues_by_status": dict(issues_by_status),
        "issues_by_priority": dict(issues_by_priority),
        "due_soon": due_soon,
        "recurring_assets": recurring,
        "technician_workload": technician_workload,
        "recent_activity": recent_activity,
    }
