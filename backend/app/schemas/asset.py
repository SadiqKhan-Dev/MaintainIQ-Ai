from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class AssetCreate(BaseModel):
    asset_code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    location: str = Field(..., min_length=1, max_length=255)
    condition: str = "good"
    last_service_date: Optional[date] = None
    next_service_date: Optional[date] = None
    assigned_technician_id: Optional[str] = None
    parent_asset_id: Optional[str] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.next_service_date and self.last_service_date:
            if self.next_service_date < self.last_service_date:
                raise ValueError("next_service_date cannot precede last_service_date")
        return self


class AssetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    location: Optional[str] = Field(None, min_length=1, max_length=255)
    condition: Optional[str] = None
    status: Optional[str] = None
    last_service_date: Optional[date] = None
    next_service_date: Optional[date] = None
    assigned_technician_id: Optional[str] = None
    parent_asset_id: Optional[str] = None


class AssetResponse(BaseModel):
    id: UUID
    asset_code: str
    name: str
    category: str
    location: str
    condition: str
    status: str
    last_service_date: Optional[date] = None
    next_service_date: Optional[date] = None
    assigned_technician_id: Optional[str] = None
    parent_asset_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AssetPublicResponse(BaseModel):
    asset_code: str
    name: str
    category: str
    location: str
    condition: str
    status: str
    last_service_date: Optional[date] = None
    next_service_date: Optional[date] = None
    recent_activity: list[dict] = []

    class Config:
        from_attributes = True
