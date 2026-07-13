from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MaintenanceRecordCreate(BaseModel):
    inspection_notes: Optional[str] = None
    work_performed: Optional[str] = None
    parts_replaced: list[str] = []
    cost: float = Field(0, ge=0)
    evidence_urls: list[str] = []
    final_condition: Optional[str] = None


class MaintenanceRecordResponse(BaseModel):
    id: UUID
    issue_id: UUID
    technician_id: str
    inspection_notes: Optional[str] = None
    work_performed: Optional[str] = None
    parts_replaced: list[str] = []
    cost: float
    evidence_urls: list[str] = []
    final_condition: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
