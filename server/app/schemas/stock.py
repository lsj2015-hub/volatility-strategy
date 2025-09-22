"""Stock data schemas"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class StockData(BaseModel):
    """Basic stock information"""
    symbol: str
    name: str
    current_price: float = Field(ge=0)
    previous_close: float = Field(ge=0)
    change: float
    change_percent: float
    volume: int = Field(ge=0)
    market_cap: Optional[float] = Field(None, ge=0)
    sector: Optional[str] = None
    industry: Optional[str] = None

class StockPrice(BaseModel):
    """Real-time stock price"""
    symbol: str
    price: float = Field(ge=0)
    timestamp: datetime
    volume: Optional[int] = Field(None, ge=0)

class StockQuote(BaseModel):
    """Stock quote with bid/ask"""
    symbol: str
    bid: float = Field(ge=0)
    ask: float = Field(ge=0)
    last: float = Field(ge=0)
    volume: int = Field(ge=0)
    timestamp: datetime

class AfterHoursData(BaseModel):
    """After-hours trading data"""
    symbol: str
    price: float = Field(ge=0)
    change: float
    change_percent: float
    volume: int = Field(ge=0)
    timestamp: datetime

class MarketOverview(BaseModel):
    """Market overview statistics"""
    total_stocks: int = Field(ge=0)
    gainers: int = Field(ge=0)
    losers: int = Field(ge=0)
    unchanged: int = Field(ge=0)
    total_volume: int = Field(ge=0)
    market_status: str = Field(pattern="^(open|closed|after-hours)$")

# Request schemas
class StockListRequest(BaseModel):
    """Request for stock list with filters"""
    symbols: Optional[list[str]] = None
    sector: Optional[str] = None
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    min_volume: Optional[int] = Field(None, ge=0)

class StockPriceRequest(BaseModel):
    """Request for real-time price data"""
    symbols: list[str] = Field(min_items=1, max_items=100)