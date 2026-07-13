import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    issue_id = Column(UUID(as_uuid=True), ForeignKey("issues.id"), nullable=False)
    technician_id = Column(String(100), nullable=False)
    inspection_notes = Column(Text, nullable=True)
    work_performed = Column(Text, nullable=True)
    parts_replaced = Column(JSON, nullable=True, default=list)
    cost = Column(Numeric(10, 2), nullable=False, default=0)
    evidence_urls = Column(JSON, nullable=True, default=list)
    final_condition = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    issue = relationship("Issue", back_populates="maintenance_records")
