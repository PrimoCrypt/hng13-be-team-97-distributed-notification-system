from pydantic import BaseModel, HttpUrl, EmailStr, Field
from enum import Enum
from typing import Optional, Dict
from uuid import UUID

class NotificationType(str, Enum):
    email = "email"
    push = "push"

class UserPreference(BaseModel):
    email: bool = True
    push: bool = False

class UserResponse(BaseModel):
    name: str
    email: EmailStr 
    push_token: Optional[str] = None 
    preferences: UserPreference
    # Using Field(..., repr=False) prevents the password
    # from being shown in logs or when printing the model.
    password: str = Field(..., repr=False)

class NotificationStatus(str, Enum):
    delivered = "delivered"
    pending = "pending"
    failed = "failed"

class UserData(BaseModel):
    name: str
    link: HttpUrl
    meta: Optional[Dict] = None

class NotificationRequest(BaseModel):
    notification_type: NotificationType
    user_id: UUID
    template_code: str
    variables: UserData
    request_id: str
    priority: int
    metadata: Optional[Dict] = None

class StatusUpdateRequest(BaseModel):
    notification_id: str
    status: NotificationStatus
    timestamp: str  # We'll use ISO timestamps
    error: Optional[str] = None