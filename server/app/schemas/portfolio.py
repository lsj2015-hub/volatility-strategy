"""Portfolio and position schemas"""

from typing import Optional, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

class Position(BaseModel):
    """Trading position"""
    id: str
    symbol: str
    name: str
    quantity: int = Field(ge=0)
    average_price: float = Field(ge=0)
    current_price: float = Field(ge=0)
    market_value: float = Field(ge=0)
    unrealized_pnl: float
    unrealized_pnl_percent: float
    entry_time: datetime
    exit_time: Optional[datetime] = None
    exit_price: Optional[float] = Field(None, ge=0)
    realized_pnl: Optional[float] = None

class Portfolio(BaseModel):
    """Portfolio overview"""
    id: str
    total_value: float = Field(ge=0)
    total_invested: float = Field(ge=0)
    available_cash: float = Field(ge=0)
    unrealized_pnl: float
    unrealized_pnl_percent: float
    realized_pnl: float
    positions: List[Position]
    created_at: datetime
    updated_at: datetime

class PortfolioAllocation(BaseModel):
    """Portfolio allocation plan"""
    symbol: str
    name: str
    target_amount: float = Field(ge=0)
    target_percent: float = Field(ge=0, le=100)
    quantity: int = Field(ge=0)
    estimated_price: float = Field(ge=0)

class PortfolioPerformance(BaseModel):
    """Portfolio performance metrics"""
    total_return: float
    total_return_percent: float
    daily_return: float
    daily_return_percent: float
    win_rate: float = Field(ge=0, le=100)
    average_win: float
    average_loss: float
    max_drawdown: float = Field(le=0)
    sharpe_ratio: Optional[float] = None

class ExitSignalType(str, Enum):
    PROFIT_TARGET = "profit-target"
    STOP_LOSS = "stop-loss"
    TIME_BASED = "time-based"
    FORCE_LIQUIDATION = "force-liquidation"

class ExitTarget(BaseModel):
    """Exit strategy targets"""
    symbol: str
    target_price: float = Field(ge=0)
    target_percent: float = Field(ge=0)
    stop_loss_price: float = Field(ge=0)
    stop_loss_percent: float = Field(le=0)
    time_based_exit: bool = True
    force_exit_time: datetime

class ExitSignal(BaseModel):
    """Exit signal trigger"""
    symbol: str
    signal_type: ExitSignalType
    current_price: float = Field(ge=0)
    target_price: float = Field(ge=0)
    timestamp: datetime
    executed: bool = False

# Request schemas
class CreateAllocationRequest(BaseModel):
    """Individual allocation request"""
    symbol: str
    name: str
    target_amount: float = Field(ge=0)
    target_percent: float = Field(ge=0, le=100)

class CreatePortfolioRequest(BaseModel):
    """Create new portfolio"""
    allocations: List[CreateAllocationRequest] = Field(min_items=1, max_items=50)
    total_investment: float = Field(gt=0)

class UpdateAllocationRequest(BaseModel):
    """Update portfolio allocation"""
    symbol: str
    target_amount: float = Field(ge=0)

class SetExitTargetsRequest(BaseModel):
    """Set exit targets for positions"""
    targets: List[ExitTarget] = Field(min_items=1)

class ExecuteTradeRequest(BaseModel):
    """Execute buy/sell order"""
    symbol: str
    action: str = Field(pattern="^(buy|sell)$")
    quantity: int = Field(gt=0)
    price: Optional[float] = Field(None, ge=0)  # None for market order
    order_type: str = Field(pattern="^(market|limit)$", default="market")