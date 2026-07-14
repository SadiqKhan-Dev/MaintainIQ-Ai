import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Date, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class AssetStatus(str, enum.Enum):
    operational = "operational"
    issue_reported = "issue_reported"
    under_inspection = "under_inspection"
    under_maintenance = "under_maintenance"
    out_of_service = "out_of_service"
    retired = "retired"


class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    location = Column(String(255), nullable=False)
    condition = Column(String(50), nullable=False, default="good")
    status = Column(
        SAEnum(AssetStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AssetStatus.operational,
    )
    last_service_date = Column(Date, nullable=True)
    next_service_date = Column(Date, nullable=True)
    assigned_technician_id = Column(String(100), nullable=True)
    parent_asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    issues = relationship("Issue", back_populates="asset", lazy="selectin")
    history = relationship("AssetHistory", back_populates="asset", lazy="selectin")
    children = relationship("Asset", backref="parent", remote_side=[id])
