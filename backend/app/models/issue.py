import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Enum as SAEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class IssuePriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class IssueStatus(str, enum.Enum):
    reported = "reported"
    assigned = "assigned"
    inspection_started = "inspection_started"
    maintenance_in_progress = "maintenance_in_progress"
    waiting_for_parts = "waiting_for_parts"
    resolved = "resolved"
    closed = "closed"
    reopened = "reopened"


ALLOWED_TRANSITIONS = {
    "reported": ["assigned"],
    "assigned": ["inspection_started"],
    "inspection_started": ["maintenance_in_progress"],
    "maintenance_in_progress": ["waiting_for_parts", "resolved"],
    "waiting_for_parts": ["maintenance_in_progress", "resolved"],
    "resolved": ["closed", "reopened"],
    "closed": ["reopened"],
    "reopened": ["assigned", "inspection_started", "maintenance_in_progress"],
}


class Issue(Base):
    __tablename__ = "issues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    issue_number = Column(String(20), unique=True, nullable=False, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    priority = Column(
        SAEnum(IssuePriority, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=IssuePriority.medium,
    )
    status = Column(
        SAEnum(IssueStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=IssueStatus.reported,
    )
    reporter_name = Column(String(255), nullable=True)
    reporter_contact = Column(String(255), nullable=True)
    ai_suggested = Column(Boolean, default=False, nullable=False)
    ai_edited = Column(Boolean, default=False, nullable=False)
    assigned_technician_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    asset = relationship("Asset", back_populates="issues")
    maintenance_records = relationship("MaintenanceRecord", back_populates="issue", lazy="selectin")
