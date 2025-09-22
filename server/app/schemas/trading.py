"""Trading session and strategy schemas"""

from typing import Optional, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

class TradingDay(str, Enum):
    DAY1 = "day1"
    DAY2 = "day2"

class TradingPhase(str, Enum):
    FILTERING = "filtering"
    PORTFOLIO_BUILDING = "portfolio-building"
    MONITORING = "monitoring"
    TRADING = "trading"
    CLOSED = "closed"

class SessionStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"
    COMPLETED = "completed"

class RiskLevel(str, Enum):
    CONSERVATIVE = "conservative"
    BALANCED = "balanced"
    AGGRESSIVE = "aggressive"

class SessionConfiguration(BaseModel):
    """Trading session configuration"""
    max_positions: int = Field(ge=1, le=50, default=10)
    max_investment_amount: float = Field(ge=0, default=10000000)  # 1억원 default
    risk_level: RiskLevel = RiskLevel.BALANCED
    auto_execution: bool = True

class TradingSession(BaseModel):
    """Trading session information"""
    id: str
    day: TradingDay
    phase: TradingPhase
    status: SessionStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    configuration: SessionConfiguration

class FilterConditions(BaseModel):
    """Stock filtering conditions"""
    min_volume: int = Field(ge=0, default=0)
    max_volume: int = Field(ge=0, default=999999999)
    min_price: float = Field(ge=0, default=0)
    max_price: float = Field(ge=0, default=999999)
    min_momentum: float = Field(ge=-100, le=100, default=-100)
    max_momentum: float = Field(ge=-100, le=100, default=100)
    min_strength: float = Field(ge=0, le=100, default=0)
    max_strength: float = Field(ge=0, le=100, default=100)
    sectors: Optional[List[str]] = None
    excluded_symbols: Optional[List[str]] = None

    # Advanced momentum conditions (optional for backward compatibility)
    min_late_session_return: Optional[float] = Field(ge=-5.0, le=20.0, default=None)
    max_late_session_return: Optional[float] = Field(ge=-5.0, le=20.0, default=None)
    min_late_session_volume_ratio: Optional[float] = Field(ge=0, le=100, default=None)
    max_late_session_volume_ratio: Optional[float] = Field(ge=0, le=100, default=None)
    min_relative_return: Optional[float] = Field(ge=-10.0, le=20.0, default=None)
    max_relative_return: Optional[float] = Field(ge=-10.0, le=20.0, default=None)
    min_vwap_ratio: Optional[float] = Field(ge=80, le=150, default=None)
    max_vwap_ratio: Optional[float] = Field(ge=80, le=150, default=None)

class FilteredStock(BaseModel):
    """Filtered stock result"""
    symbol: str
    name: str
    score: float = Field(ge=0, le=100)
    price: float = Field(ge=0)
    volume: int = Field(ge=0)
    momentum: float = Field(ge=-100, le=100)
    strength: float = Field(ge=0, le=100)
    sector: str
    reasons: List[str]

    # Advanced momentum data (optional)
    late_session_return: Optional[float] = None
    late_session_volume_ratio: Optional[float] = None
    relative_return: Optional[float] = None
    vwap_ratio: Optional[float] = None
    vwap: Optional[float] = None

class BuyCondition(BaseModel):
    """Buy condition monitoring"""
    symbol: str
    target_price: float = Field(ge=0)
    current_price: float = Field(ge=0)
    threshold: float = Field(ge=0, le=100)  # percentage
    is_triggered: bool = False
    triggered_at: Optional[datetime] = None

class MonitoringStatus(BaseModel):
    """After-hours monitoring status"""
    time_slot: str = Field(pattern="^(16:00|16:30|17:00|17:30)$")
    checked_stocks: int = Field(ge=0)
    triggered_buys: int = Field(ge=0)
    next_check_time: datetime

# Request schemas
class CreateSessionRequest(BaseModel):
    """Create new trading session"""
    configuration: SessionConfiguration

class UpdateFilterConditionsRequest(BaseModel):
    """Update filtering conditions"""
    conditions: FilterConditions

class StartMonitoringRequest(BaseModel):
    """Start after-hours monitoring"""
    symbols: List[str] = Field(min_items=1, max_items=50)
    buy_conditions: List[BuyCondition]

# New Trading API Schemas

class OrderTypeEnum(str, Enum):
    """Order type enumeration"""
    MARKET = "01"  # 시장가
    LIMIT = "00"   # 지정가

class BuyOrderRequest(BaseModel):
    """Buy order request"""
    symbol: str = Field(min_length=1, max_length=20)
    stock_name: str = Field(min_length=1, max_length=50)
    target_price: float = Field(gt=0)
    investment_amount: float = Field(gt=0)
    order_type: OrderTypeEnum = OrderTypeEnum.MARKET

class BuyOrderResponse(BaseModel):
    """Buy order response"""
    status: str
    order_id: str
    message: str

class SellOrderRequest(BaseModel):
    """Sell order request"""
    position_id: str = Field(min_length=1)

class BuySignalRequest(BaseModel):
    """Buy signal processing request"""
    symbol: str = Field(min_length=1, max_length=20)
    stock_name: str = Field(min_length=1, max_length=50)
    current_price: float = Field(gt=0)
    change_percent: float
    volume: int = Field(ge=0)
    investment_amount: Optional[float] = Field(gt=0, default=None)

class EmergencyStopRequest(BaseModel):
    """Emergency stop request"""
    reason: str = Field(default="User initiated emergency stop")

class TradingStatusResponse(BaseModel):
    """Trading system status response"""
    status: str
    data: dict

class TradingSummaryResponse(BaseModel):
    """Trading summary response"""
    status: str
    data: dict

# Trading Mode Management Schemas
class TradingModeData(BaseModel):
    """Trading mode status data"""
    is_mock: bool
    mode_name: str
    description: str
    api_base_url: str
    last_changed: Optional[datetime] = None

class TradingModeRequest(BaseModel):
    """Trading mode change request"""
    is_mock: bool