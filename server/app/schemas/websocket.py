"""WebSocket message schemas"""

from typing import Any, Dict, List, Union
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

class WebSocketMessageType(str, Enum):
    PRICE_UPDATE = "price_update"
    BUY_SIGNAL = "buy_signal"
    SELL_SIGNAL = "sell_signal"
    SESSION_STATUS = "session_status"
    PORTFOLIO_UPDATE = "portfolio_update"
    ERROR = "error"
    HEARTBEAT = "heartbeat"

class WebSocketMessage(BaseModel):
    """Base WebSocket message"""
    type: WebSocketMessageType
    timestamp: datetime
    data: Dict[str, Any]

class PriceUpdateData(BaseModel):
    """Price update message data"""
    symbol: str
    price: float = Field(ge=0)
    change: float
    change_percent: float
    volume: int = Field(ge=0)

class PriceUpdateMessage(BaseModel):
    """Price update WebSocket message"""
    type: WebSocketMessageType = WebSocketMessageType.PRICE_UPDATE
    timestamp: datetime
    data: PriceUpdateData

class BuySignalData(BaseModel):
    """Buy signal message data"""
    symbol: str
    price: float = Field(ge=0)
    quantity: int = Field(gt=0)
    reason: str
    order_id: str | None = None

class BuySignalMessage(BaseModel):
    """Buy signal WebSocket message"""
    type: WebSocketMessageType = WebSocketMessageType.BUY_SIGNAL
    timestamp: datetime
    data: BuySignalData

class SellSignalData(BaseModel):
    """Sell signal message data"""
    symbol: str
    price: float = Field(ge=0)
    quantity: int = Field(gt=0)
    reason: str = Field(pattern="^(profit-target|stop-loss|time-based|force-liquidation)$")
    order_id: str | None = None

class SellSignalMessage(BaseModel):
    """Sell signal WebSocket message"""
    type: WebSocketMessageType = WebSocketMessageType.SELL_SIGNAL
    timestamp: datetime
    data: SellSignalData

class SessionStatusData(BaseModel):
    """Session status message data"""
    day: str = Field(pattern="^(day1|day2)$")
    phase: str
    status: str
    next_action: str | None = None
    next_action_time: datetime | None = None

class SessionStatusMessage(BaseModel):
    """Session status WebSocket message"""
    type: WebSocketMessageType = WebSocketMessageType.SESSION_STATUS
    timestamp: datetime
    data: SessionStatusData

class PositionChange(BaseModel):
    """Position change details"""
    symbol: str
    action: str = Field(pattern="^(added|updated|removed)$")
    position: Dict[str, Any] | None = None

class PortfolioUpdateData(BaseModel):
    """Portfolio update message data"""
    total_value: float = Field(ge=0)
    unrealized_pnl: float
    unrealized_pnl_percent: float
    position_count: int = Field(ge=0)
    changes: List[PositionChange]

class PortfolioUpdateMessage(BaseModel):
    """Portfolio update WebSocket message"""
    type: WebSocketMessageType = WebSocketMessageType.PORTFOLIO_UPDATE
    timestamp: datetime
    data: PortfolioUpdateData

class ErrorData(BaseModel):
    """Error message data"""
    code: str
    message: str
    details: Dict[str, Any] | None = None

class ErrorMessage(BaseModel):
    """Error WebSocket message"""
    type: WebSocketMessageType = WebSocketMessageType.ERROR
    timestamp: datetime
    data: ErrorData

class HeartbeatMessage(BaseModel):
    """Heartbeat WebSocket message"""
    type: WebSocketMessageType = WebSocketMessageType.HEARTBEAT
    timestamp: datetime
    data: Dict[str, Any] = Field(default_factory=dict)

# Union type for all possible WebSocket messages
WebSocketMessageUnion = Union[
    PriceUpdateMessage,
    BuySignalMessage,
    SellSignalMessage,
    SessionStatusMessage,
    PortfolioUpdateMessage,
    ErrorMessage,
    HeartbeatMessage
]

class WebSocketConnectionStatus(BaseModel):
    """WebSocket connection status"""
    connected: bool
    reconnecting: bool = False
    last_heartbeat: datetime | None = None
    error_count: int = Field(ge=0, default=0)