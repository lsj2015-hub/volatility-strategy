"""
Buy Signal Processor
매수 신호 처리기 - 실시간 매수 신호를 감지하고 자동 주문 실행
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass

from .order_executor import order_executor, OrderType
from ...api.websocket import send_buy_signal, send_order_update
from ...services.kis_api import KISAPIClient

logger = logging.getLogger(__name__)


@dataclass
class BuySignal:
    """매수 신호 데이터"""
    signal_id: str
    symbol: str
    stock_name: str
    trigger_price: float
    current_price: float
    change_percent: float
    volume: int
    trigger_reason: str
    created_at: datetime

    # 주문 관련 설정
    investment_amount: float = 1000000  # 기본 100만원
    auto_confirm: bool = False
    confirmation_timeout: int = 30  # 확인 대기 시간 (초)

    # 상태 관리
    is_confirmed: bool = False
    is_processed: bool = False
    order_id: Optional[str] = None
    confirmed_at: Optional[datetime] = None


class SignalProcessor:
    """매수 신호 처리기"""

    def __init__(self):
        self.kis_client = KISAPIClient()
        self.active_signals: Dict[str, BuySignal] = {}
        self.processed_signals: Dict[str, BuySignal] = {}

        # 설정
        self.auto_execution_enabled = True
        self.max_pending_signals = 10
        self.signal_timeout = 300  # 신호 만료 시간 (5분)
        self.default_investment_amount = 1000000  # 기본 투자 금액

        # 콜백 함수들
        self.on_signal_created: Optional[Callable] = None
        self.on_signal_confirmed: Optional[Callable] = None
        self.on_signal_expired: Optional[Callable] = None

    async def process_price_update(
        self,
        symbol: str,
        stock_name: str,
        current_price: float,
        change_percent: float,
        volume: int,
        threshold_percent: float = 2.0
    ) -> Optional[BuySignal]:
        """가격 업데이트를 받아 매수 신호 생성"""

        # 매수 신호 조건 확인
        if not self._should_generate_signal(symbol, current_price, change_percent, volume, threshold_percent):
            return None

        # 매수 신호 생성
        signal = await self._create_buy_signal(
            symbol=symbol,
            stock_name=stock_name,
            current_price=current_price,
            change_percent=change_percent,
            volume=volume,
            trigger_reason=f"{change_percent:.2f}% 상승으로 인한 모멘텀 매수"
        )

        logger.info(f"🎯 Buy signal generated: {signal.symbol} ({signal.stock_name}) - {signal.change_percent:.2f}%")

        return signal

    async def confirm_signal(self, signal_id: str, investment_amount: Optional[float] = None) -> bool:
        """매수 신호 확인 및 주문 실행"""
        if signal_id not in self.active_signals:
            logger.warning(f"Signal not found: {signal_id}")
            return False

        signal = self.active_signals[signal_id]

        if signal.is_confirmed:
            logger.warning(f"Signal already confirmed: {signal_id}")
            return False

        # 투자 금액 설정
        if investment_amount:
            signal.investment_amount = investment_amount

        # 신호 확인
        signal.is_confirmed = True
        signal.confirmed_at = datetime.now()

        logger.info(f"✅ Buy signal confirmed: {signal_id} - ₩{signal.investment_amount:,.0f}")

        # 주문 실행
        await self._execute_buy_order(signal)

        # 콜백 실행
        if self.on_signal_confirmed:
            await self.on_signal_confirmed(signal)

        return True

    async def reject_signal(self, signal_id: str, reason: str = "User rejected") -> bool:
        """매수 신호 거부"""
        if signal_id not in self.active_signals:
            logger.warning(f"Signal not found: {signal_id}")
            return False

        signal = self.active_signals[signal_id]
        signal.trigger_reason = f"REJECTED: {reason}"

        # 처리된 신호 목록으로 이동
        self.processed_signals[signal_id] = self.active_signals.pop(signal_id)

        logger.info(f"❌ Buy signal rejected: {signal_id} - {reason}")

        return True

    async def get_active_signals(self) -> List[Dict[str, Any]]:
        """활성 신호 목록 조회"""
        signals = []
        for signal in self.active_signals.values():
            signals.append({
                "signal_id": signal.signal_id,
                "symbol": signal.symbol,
                "stock_name": signal.stock_name,
                "trigger_price": signal.trigger_price,
                "current_price": signal.current_price,
                "change_percent": signal.change_percent,
                "volume": signal.volume,
                "trigger_reason": signal.trigger_reason,
                "investment_amount": signal.investment_amount,
                "created_at": signal.created_at.isoformat(),
                "is_confirmed": signal.is_confirmed,
                "order_id": signal.order_id,
                "time_remaining": max(0, signal.confirmation_timeout -
                    (datetime.now() - signal.created_at).seconds)
            })
        return signals

    async def cleanup_expired_signals(self):
        """만료된 신호 정리"""
        current_time = datetime.now()
        expired_signals = []

        for signal_id, signal in self.active_signals.items():
            if (current_time - signal.created_at).seconds > signal.confirmation_timeout:
                expired_signals.append(signal_id)

        for signal_id in expired_signals:
            signal = self.active_signals.pop(signal_id)
            self.processed_signals[signal_id] = signal

            logger.info(f"⏰ Buy signal expired: {signal_id}")

            if self.on_signal_expired:
                await self.on_signal_expired(signal)

    def _should_generate_signal(
        self,
        symbol: str,
        current_price: float,
        change_percent: float,
        volume: int,
        threshold_percent: float
    ) -> bool:
        """매수 신호 생성 조건 확인"""

        # 기본 조건: 상승률이 임계값 이상
        if change_percent < threshold_percent:
            return False

        # 중복 신호 방지 (동일 종목에 대한 활성 신호가 있는지 확인)
        for signal in self.active_signals.values():
            if signal.symbol == symbol:
                return False

        # 최대 대기 신호 수 확인
        if len(self.active_signals) >= self.max_pending_signals:
            logger.warning(f"Maximum pending signals reached ({self.max_pending_signals})")
            return False

        # 거래량 확인 (선택적)
        if volume < 100000:  # 최소 거래량 10만주
            return False

        return True

    async def _create_buy_signal(
        self,
        symbol: str,
        stock_name: str,
        current_price: float,
        change_percent: float,
        volume: int,
        trigger_reason: str
    ) -> BuySignal:
        """매수 신호 생성"""

        signal_id = f"SIG_{symbol}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        signal = BuySignal(
            signal_id=signal_id,
            symbol=symbol,
            stock_name=stock_name,
            trigger_price=current_price,
            current_price=current_price,
            change_percent=change_percent,
            volume=volume,
            trigger_reason=trigger_reason,
            created_at=datetime.now(),
            investment_amount=self.default_investment_amount,
            auto_confirm=self.auto_execution_enabled
        )

        # 활성 신호 목록에 추가
        self.active_signals[signal_id] = signal

        # WebSocket으로 신호 전송
        await self._send_signal_notification(signal)

        # 자동 확인이 활성화된 경우 바로 확인
        if signal.auto_confirm:
            await asyncio.sleep(1)  # 짧은 지연 후 확인
            await self.confirm_signal(signal_id)

        # 콜백 실행
        if self.on_signal_created:
            await self.on_signal_created(signal)

        return signal

    async def _execute_buy_order(self, signal: BuySignal):
        """매수 주문 실행"""
        try:
            order_id = await order_executor.add_buy_order(
                symbol=signal.symbol,
                stock_name=signal.stock_name,
                target_price=signal.current_price,
                investment_amount=signal.investment_amount,
                auto_execute=True,
                order_type=OrderType.MARKET  # 시장가 주문
            )

            signal.order_id = order_id
            signal.is_processed = True

            # 처리된 신호 목록으로 이동
            self.processed_signals[signal.signal_id] = self.active_signals.pop(signal.signal_id)

            logger.info(f"📝 Buy order created for signal {signal.signal_id}: {order_id}")

        except Exception as e:
            logger.error(f"Failed to execute buy order for signal {signal.signal_id}: {e}")
            signal.trigger_reason = f"ORDER_FAILED: {str(e)}"

    async def _send_signal_notification(self, signal: BuySignal):
        """WebSocket으로 매수 신호 알림 전송"""
        try:
            await send_buy_signal(
                symbol=signal.symbol,
                price=signal.current_price,
                quantity=int(signal.investment_amount / signal.current_price),
                reason=signal.trigger_reason,
                order_id=signal.signal_id
            )
        except Exception as e:
            logger.warning(f"Failed to send buy signal notification via WebSocket: {e}")


# 글로벌 신호 처리기 인스턴스
signal_processor = SignalProcessor()