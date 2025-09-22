"""
Trading related models
거래 관련 모델
"""

from datetime import datetime, time
from decimal import Decimal
from typing import Optional, List, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field, validator


class OrderType(str, Enum):
    """주문 타입"""
    MARKET = "01"  # 시장가
    LIMIT = "00"   # 지정가


class OrderSide(str, Enum):
    """주문 방향"""
    BUY = "BUY"
    SELL = "SELL"


class OrderStatus(str, Enum):
    """주문 상태"""
    PENDING = "PENDING"     # 대기
    SUBMITTED = "SUBMITTED" # 제출됨
    FILLED = "FILLED"       # 체결됨
    CANCELLED = "CANCELLED" # 취소됨
    REJECTED = "REJECTED"   # 거부됨
    PARTIAL = "PARTIAL"     # 부분체결


class TradingPhase(str, Enum):
    """거래 단계"""
    FILTERING = "FILTERING"           # Day 1: 15:30 - 필터링
    PORTFOLIO_SETUP = "PORTFOLIO_SETUP"  # Day 1: 15:35 - 포트폴리오 구성
    AFTER_HOURS_MONITORING = "AFTER_HOURS_MONITORING"  # Day 1: 16:00-17:40 - 시간외 모니터링
    TRADING = "TRADING"               # Day 2: 09:00-15:30 - 거래
    LIQUIDATION = "LIQUIDATION"       # Day 2: 15:20-15:30 - 강제 청산
    COMPLETED = "COMPLETED"           # 완료


class Position(BaseModel):
    """포지션 정보"""
    code: str = Field(..., description="종목 코드")
    name: str = Field(..., description="종목명")
    quantity: int = Field(..., description="보유 수량")
    average_price: int = Field(..., description="평균 단가")
    current_price: int = Field(..., description="현재가")

    # 손익 계산
    unrealized_pnl: int = Field(..., description="미실현 손익 (원)")
    unrealized_pnl_rate: Decimal = Field(..., description="미실현 손익률 (%)")

    # 목표가 설정
    target_profit_price: Optional[int] = Field(None, description="목표 수익가")
    target_loss_price: Optional[int] = Field(None, description="목표 손실가")

    # 메타데이터
    opened_at: datetime = Field(..., description="포지션 생성 시각")
    updated_at: datetime = Field(default_factory=datetime.now, description="최종 업데이트 시각")

    @validator('unrealized_pnl', pre=True, always=True)
    def calculate_unrealized_pnl(cls, v, values):
        """미실현 손익 계산"""
        if 'quantity' in values and 'average_price' in values and 'current_price' in values:
            return (values['current_price'] - values['average_price']) * values['quantity']
        return v

    @validator('unrealized_pnl_rate', pre=True, always=True)
    def calculate_unrealized_pnl_rate(cls, v, values):
        """미실현 손익률 계산"""
        if 'average_price' in values and 'current_price' in values and values['average_price'] > 0:
            return Decimal(str((values['current_price'] - values['average_price']) / values['average_price'] * 100))
        return Decimal("0")


class Order(BaseModel):
    """주문 정보"""
    order_id: Optional[str] = Field(None, description="주문 ID")
    code: str = Field(..., description="종목 코드")
    name: str = Field(..., description="종목명")
    side: OrderSide = Field(..., description="주문 방향")
    order_type: OrderType = Field(..., description="주문 타입")

    # 수량 및 가격
    quantity: int = Field(..., description="주문 수량")
    price: int = Field(..., description="주문가")
    filled_quantity: int = Field(default=0, description="체결 수량")
    filled_price: int = Field(default=0, description="체결가")

    # 상태
    status: OrderStatus = Field(default=OrderStatus.PENDING, description="주문 상태")

    # 메타데이터
    created_at: datetime = Field(default_factory=datetime.now, description="주문 생성 시각")
    submitted_at: Optional[datetime] = Field(None, description="주문 제출 시각")
    filled_at: Optional[datetime] = Field(None, description="체결 시각")

    # 추가 정보
    reason: Optional[str] = Field(None, description="주문 사유")
    error_message: Optional[str] = Field(None, description="오류 메시지")


class Portfolio(BaseModel):
    """포트폴리오 정보"""
    session_id: str = Field(..., description="거래 세션 ID")

    # 현금 정보
    total_cash: int = Field(..., description="총 현금")
    available_cash: int = Field(..., description="가용 현금")
    invested_cash: int = Field(..., description="투자된 현금")

    # 포지션 정보
    positions: List[Position] = Field(default_factory=list, description="보유 포지션")

    # 손익 정보
    total_unrealized_pnl: int = Field(default=0, description="총 미실현 손익")
    total_unrealized_pnl_rate: Decimal = Field(default=Decimal("0"), description="총 미실현 손익률")

    # 목표 설정
    target_return_rate: Decimal = Field(default=Decimal("10"), description="목표 수익률 (%)")
    max_loss_rate: Decimal = Field(default=Decimal("-5"), description="최대 손실률 (%)")

    # 메타데이터
    created_at: datetime = Field(default_factory=datetime.now, description="생성 시각")
    updated_at: datetime = Field(default_factory=datetime.now, description="최종 업데이트 시각")

    @validator('total_unrealized_pnl', pre=True, always=True)
    def calculate_total_unrealized_pnl(cls, v, values):
        """총 미실현 손익 계산"""
        if 'positions' in values:
            return sum(pos.unrealized_pnl for pos in values['positions'])
        return v

    @validator('total_unrealized_pnl_rate', pre=True, always=True)
    def calculate_total_unrealized_pnl_rate(cls, v, values):
        """총 미실현 손익률 계산"""
        if 'invested_cash' in values and values['invested_cash'] > 0 and 'total_unrealized_pnl' in values:
            return Decimal(str(values['total_unrealized_pnl'] / values['invested_cash'] * 100))
        return Decimal("0")


class TradingSession(BaseModel):
    """거래 세션"""
    session_id: str = Field(..., description="세션 ID")
    current_phase: TradingPhase = Field(default=TradingPhase.FILTERING, description="현재 단계")

    # 세션 설정
    investment_amount: int = Field(..., description="투자 금액")
    max_positions: int = Field(default=5, description="최대 보유 종목 수")

    # 필터링 결과
    filtered_stocks: List[str] = Field(default_factory=list, description="필터링된 종목 코드 목록")
    selected_stocks: List[str] = Field(default_factory=list, description="선택된 종목 코드 목록")

    # 거래 기록
    orders: List[Order] = Field(default_factory=list, description="주문 목록")
    portfolio: Optional[Portfolio] = Field(None, description="포트폴리오")

    # 스케줄 정보
    day1_date: datetime = Field(..., description="Day 1 날짜 (필터링 날짜)")
    day2_date: datetime = Field(..., description="Day 2 날짜 (거래 날짜)")

    # 메타데이터
    created_at: datetime = Field(default_factory=datetime.now, description="생성 시각")
    updated_at: datetime = Field(default_factory=datetime.now, description="최종 업데이트 시각")
    completed_at: Optional[datetime] = Field(None, description="완료 시각")

    # 성과
    final_pnl: Optional[int] = Field(None, description="최종 손익")
    final_return_rate: Optional[Decimal] = Field(None, description="최종 수익률")


class MonitoringEvent(BaseModel):
    """모니터링 이벤트"""
    event_id: str = Field(..., description="이벤트 ID")
    session_id: str = Field(..., description="세션 ID")

    # 이벤트 정보
    event_type: str = Field(..., description="이벤트 타입")
    stock_code: str = Field(..., description="종목 코드")

    # 가격 정보
    trigger_price: int = Field(..., description="트리거 가격")
    current_price: int = Field(..., description="현재가")
    threshold_price: int = Field(..., description="임계가")

    # 행동
    action_taken: str = Field(..., description="수행된 행동")
    action_result: Optional[str] = Field(None, description="행동 결과")

    # 메타데이터
    occurred_at: datetime = Field(default_factory=datetime.now, description="발생 시각")


class ExitStrategy(BaseModel):
    """청산 전략"""
    code: str = Field(..., description="종목 코드")

    # 청산 조건
    profit_target_rate: Decimal = Field(default=Decimal("10"), description="목표 수익률 (%)")
    loss_limit_rate: Decimal = Field(default=Decimal("-5"), description="손실 제한률 (%)")

    # 시간 기반 청산
    force_exit_time: time = Field(default=time(15, 20), description="강제 청산 시간")
    partial_exit_time: time = Field(default=time(14, 30), description="부분 청산 시간")
    partial_exit_ratio: Decimal = Field(default=Decimal("0.5"), description="부분 청산 비율")

    # 동적 조정
    trailing_stop_rate: Optional[Decimal] = Field(None, description="트레일링 스톱 비율")
    volatility_adjustment: bool = Field(default=True, description="변동성 기반 조정")

    # 메타데이터
    created_at: datetime = Field(default_factory=datetime.now, description="생성 시각")
    updated_at: datetime = Field(default_factory=datetime.now, description="수정 시각")


class PerformanceMetrics(BaseModel):
    """성과 지표"""
    session_id: str = Field(..., description="세션 ID")

    # 기본 지표
    total_trades: int = Field(..., description="총 거래 수")
    winning_trades: int = Field(..., description="수익 거래 수")
    losing_trades: int = Field(..., description="손실 거래 수")
    win_rate: Decimal = Field(..., description="승률 (%)")

    # 수익률 지표
    total_return: Decimal = Field(..., description="총 수익률 (%)")
    average_return_per_trade: Decimal = Field(..., description="거래당 평균 수익률 (%)")
    max_profit: int = Field(..., description="최대 수익 (원)")
    max_loss: int = Field(..., description="최대 손실 (원)")

    # 위험 지표
    max_drawdown: Decimal = Field(..., description="최대 낙폭 (%)")
    sharpe_ratio: Optional[Decimal] = Field(None, description="샤프 비율")

    # 거래 패턴
    average_holding_period: Decimal = Field(..., description="평균 보유 기간 (시간)")
    most_profitable_sector: Optional[str] = Field(None, description="가장 수익성 높은 섹터")

    # 메타데이터
    calculated_at: datetime = Field(default_factory=datetime.now, description="계산 시각")