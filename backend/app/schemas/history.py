from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class AssetHistoryResponse(BaseModel):
    id: UUID
    asset_id: UUID
    issue_id: Optional[UUID] = None
    actor_id: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
