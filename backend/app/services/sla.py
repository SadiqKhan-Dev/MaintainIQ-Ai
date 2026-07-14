from datetime import datetime, timedelta
from typing import Optional

SLA_HOURS = {
    "critical": 4,
    "high": 8,
    "medium": 24,
    "low": 72,
}


def compute_sla_due(priority: str, base_time: Optional[datetime] = None) -> datetime:
    base = base_time or datetime.utcnow()
    hours = SLA_HOURS.get(priority, 24)
    return base + timedelta(hours=hours)


def sla_status(sla_due_at: Optional[datetime], now: Optional[datetime] = None) -> str:
    if not sla_due_at:
        return "none"
    now = now or datetime.utcnow()
    if sla_due_at <= now:
        return "breached"
    if sla_due_at - now <= timedelta(hours=4):
        return "due_soon"
    return "ok"
