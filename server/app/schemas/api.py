"""API request/response schemas"""

from typing import Any, Dict, List, Optional, Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar('T')

class ApiResponse(BaseModel, Generic[T]):
    """Standard API response wrapper"""
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    message: Optional[str] = None

class ApiError(BaseModel):
    """API error details"""
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None

class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(ge=1, default=1)
    limit: int = Field(ge=1, le=100, default=20)

class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper"""
    items: List[T]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool

# Authentication schemas
class AuthStatus(BaseModel):
    """KIS API authentication status"""
    is_authenticated: bool
    access_token: Optional[str] = None
    token_expiry: Optional[str] = None
    scope: Optional[str] = None

class KisApiCredentials(BaseModel):
    """KIS API credentials configuration"""
    app_key: str
    app_secret: str
    environment: str = Field(pattern="^(sandbox|production)$")

class SaveApiKeysRequest(BaseModel):
    """API 키 저장 요청"""
    app_key: str = Field(..., min_length=1, description="KIS API App Key")
    app_secret: str = Field(..., min_length=1, description="KIS API App Secret")

# Health check
class HealthCheck(BaseModel):
    """Health check response"""
    status: str = "healthy"
    timestamp: str
    version: str
    services: Dict[str, str] = Field(default_factory=dict)