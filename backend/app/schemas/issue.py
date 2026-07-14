from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class IssueCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    category: Optional[str] = None
    priority: Optional[str] = "medium"
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None


class IssueReport(BaseModel):
    asset_code: str
    description: str = Field(..., min_length=1)
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None


class IssueAssign(BaseModel):
    technician_id: str = Field(..., min_length=1)


class IssueStatusUpdate(BaseModel):
    status: str = Field(..., min_length=1)


class IssueResponse(BaseModel):
    id: UUID
    issue_number: str
    asset_id: UUID
    title: str
    description: str
    category: Optional[str] = None
    priority: str
    status: str
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None
    ai_suggested: bool
    ai_edited: bool
    assigned_technician_id: Optional[str] = None
    sla_due_at: Optional[datetime] = None
    work_order_type: str = "reactive"
    generated_by: Optional[str] = None
    sla_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IssueWithAssetResponse(IssueResponse):
    asset_code: Optional[str] = None
    asset_name: Optional[str] = None


class AITriageResponse(BaseModel):
    title: str
    category: str
    priority: str
    possible_causes: list[str]
    initial_checks: list[str]
    recurring_pattern_warning: Optional[str] = None
