"""
Stock data models
주식 데이터 모델
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from enum import Enum

from pydantic import BaseModel, Field, validator


class MarketType(str, Enum):
    """시장 구분"""
    KOSPI = "KOSPI"
    KOSDAQ = "KOSDAQ"
    KONEX = "KONEX"


class StockBasicInfo(BaseModel):
    """주식 기본 정보"""
    code: str = Field(..., description="종목 코드")
    name: str = Field(..., description="종목명")
    market: MarketType = Field(..., description="시장 구분")
    sector: Optional[str] = Field(None, description="업종")
    market_cap: Optional[int] = Field(None, description="시가총액")
    listing_date: Optional[datetime] = Field(None, description="상장일")


class StockPrice(BaseModel):
    """주식 가격 정보"""
    code: str = Field(..., description="종목 코드")
    current_price: int = Field(..., description="현재가")
    opening_price: int = Field(..., description="시가")
    high_price: int = Field(..., description="고가")
    low_price: int = Field(..., description="저가")
    prev_close_price: int = Field(..., description="전일 종가")
    change_price: int = Field(..., description="전일 대비")
    change_rate: Decimal = Field(..., description="등락률 (%)")
    volume: int = Field(..., description="거래량")
    volume_value: int = Field(..., description="거래대금")
    timestamp: datetime = Field(default_factory=datetime.now, description="조회 시각")

    @validator('change_rate', pre=True)
    def parse_change_rate(cls, v):
        """등락률을 Decimal로 변환"""
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v


class AfterHoursPrice(BaseModel):
    """시간외 호가 정보"""
    code: str = Field(..., description="종목 코드")
    after_hours_price: int = Field(..., description="시간외 현재가")
    change_from_close: int = Field(..., description="종가 대비")
    change_rate_from_close: Decimal = Field(..., description="종가 대비 등락률 (%)")
    buy_quantity: int = Field(..., description="매수 호가 수량")
    sell_quantity: int = Field(..., description="매도 호가 수량")
    timestamp: datetime = Field(default_factory=datetime.now, description="조회 시각")


class StockRanking(BaseModel):
    """주식 순위 정보"""
    rank: int = Field(..., description="순위")
    code: str = Field(..., description="종목 코드")
    name: str = Field(..., description="종목명")
    current_price: int = Field(..., description="현재가")
    change_rate: Decimal = Field(..., description="등락률 (%)")
    volume: int = Field(..., description="거래량")
    volume_value: int = Field(..., description="거래대금")
    market_cap: Optional[int] = Field(None, description="시가총액")


class StockTechnicalIndicator(BaseModel):
    """주식 기술적 지표"""
    code: str = Field(..., description="종목 코드")

    # 가격 관련 지표
    ma5: Optional[Decimal] = Field(None, description="5일 이동평균")
    ma20: Optional[Decimal] = Field(None, description="20일 이동평균")
    ma60: Optional[Decimal] = Field(None, description="60일 이동평균")

    # 거래량 관련 지표
    volume_ma5: Optional[int] = Field(None, description="5일 거래량 평균")
    volume_ma20: Optional[int] = Field(None, description="20일 거래량 평균")
    volume_ratio: Optional[Decimal] = Field(None, description="거래량 비율")

    # 모멘텀 지표
    rsi: Optional[Decimal] = Field(None, description="RSI (14일)")
    momentum: Optional[Decimal] = Field(None, description="모멘텀 지표")

    # 변동성 지표
    volatility: Optional[Decimal] = Field(None, description="변동성 (20일)")
    bollinger_upper: Optional[Decimal] = Field(None, description="볼린저 밴드 상단")
    bollinger_lower: Optional[Decimal] = Field(None, description="볼린저 밴드 하단")

    timestamp: datetime = Field(default_factory=datetime.now, description="계산 시각")


class StockFilteringScore(BaseModel):
    """주식 필터링 점수"""
    code: str = Field(..., description="종목 코드")
    name: str = Field(..., description="종목명")

    # 개별 조건 점수 (0-100)
    volume_score: int = Field(..., description="거래량 점수")
    momentum_score: int = Field(..., description="모멘텀 점수")
    strength_score: int = Field(..., description="강도 점수")
    volatility_score: int = Field(..., description="변동성 점수")
    market_cap_score: int = Field(..., description="시가총액 점수")

    # 종합 점수
    total_score: int = Field(..., description="종합 점수")
    rank: Optional[int] = Field(None, description="순위")

    # 메타데이터
    filtered_at: datetime = Field(default_factory=datetime.now, description="필터링 시각")
    conditions_version: str = Field(..., description="필터링 조건 버전")


class FilteringConditions(BaseModel):
    """필터링 조건"""

    # 거래량 조건
    min_volume: int = Field(default=100000, description="최소 거래량")
    volume_ratio_min: Decimal = Field(default=Decimal("1.5"), description="최소 거래량 비율")

    # 가격 조건
    min_price: int = Field(default=1000, description="최소 주가")
    max_price: int = Field(default=100000, description="최대 주가")

    # 시가총액 조건
    min_market_cap: int = Field(default=100000000000, description="최소 시가총액 (100억)")
    max_market_cap: int = Field(default=10000000000000, description="최대 시가총액 (10조)")

    # 모멘텀 조건
    min_change_rate: Decimal = Field(default=Decimal("-10"), description="최소 등락률 (%)")
    max_change_rate: Decimal = Field(default=Decimal("30"), description="최대 등락률 (%)")

    # 기술적 지표 조건
    rsi_min: Optional[Decimal] = Field(default=Decimal("30"), description="최소 RSI")
    rsi_max: Optional[Decimal] = Field(default=Decimal("70"), description="최대 RSI")

    # 추가 필터
    exclude_etf: bool = Field(default=True, description="ETF 제외")
    exclude_reit: bool = Field(default=True, description="REIT 제외")
    exclude_spac: bool = Field(default=True, description="SPAC 제외")

    # 동적 조정 설정
    enable_dynamic_adjustment: bool = Field(default=True, description="동적 조건 조정 활성화")
    target_stock_count: int = Field(default=50, description="목표 종목 수")

    # 메타데이터
    version: str = Field(default="1.0", description="조건 버전")
    created_at: datetime = Field(default_factory=datetime.now, description="생성 시각")
    updated_at: datetime = Field(default_factory=datetime.now, description="수정 시각")


class DynamicConditionAdjustment(BaseModel):
    """동적 조건 조정 결과"""
    original_conditions: FilteringConditions = Field(..., description="원본 조건")
    adjusted_conditions: FilteringConditions = Field(..., description="조정된 조건")

    # 조정 결과
    original_count: int = Field(..., description="원본 조건 결과 수")
    adjusted_count: int = Field(..., description="조정된 조건 결과 수")
    target_count: int = Field(..., description="목표 종목 수")

    # 조정 내역
    adjustments_made: List[str] = Field(default_factory=list, description="수행된 조정 내역")

    # 메타데이터
    adjusted_at: datetime = Field(default_factory=datetime.now, description="조정 시각")
    success: bool = Field(..., description="조정 성공 여부")