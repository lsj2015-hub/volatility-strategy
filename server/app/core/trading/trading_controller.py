"""
Trading Controller
트레이딩 컨트롤러 - 자동매매, 포지션 관리, 매도 전략을 통합 관리
"""

import asyncio
import logging
from datetime import datetime, time
from typing import Dict, List, Optional, Any

from .order_executor import order_executor, OrderStatus
from .signal_processor import signal_processor, BuySignal
from .position_manager import position_manager, ExitReason
from .exit_strategy import exit_strategy, ExitPhase
from ...services.kis_api import KISAPIClient
from ...api.websocket import send_trading_status, send_system_alert

logger = logging.getLogger(__name__)


class TradingController:
    """트레이딩 컨트롤러 - 모든 트레이딩 로직 통합 관리"""

    def __init__(self):
        self.kis_client = KISAPIClient()
        self.is_running = False
        self.is_market_hours = False

        # 컴포넌트들
        self.order_executor = order_executor
        self.signal_processor = signal_processor
        self.position_manager = position_manager
        self.exit_strategy = exit_strategy

        # 설정
        self.max_positions = 10           # 최대 포지션 수
        self.max_daily_investment = 10000000  # 일일 최대 투자 금액 (1000만원)
        self.current_daily_investment = 0

        # 시장 시간 설정
        self.market_open_time = time(9, 0)    # 09:00
        self.market_close_time = time(15, 30)  # 15:30
        self.after_hours_start = time(16, 0)   # 16:00 (시간외 거래 시작)
        self.after_hours_end = time(17, 40)    # 17:40 (시간외 거래 종료)

        # 상태 추적
        self.daily_stats = {
            "trades_executed": 0,
            "positions_opened": 0,
            "positions_closed": 0,
            "total_pnl": 0.0,
            "win_rate": 0.0
        }

    async def start_trading_system(self):
        """전체 트레이딩 시스템 시작"""
        if self.is_running:
            logger.warning("Trading system is already running")
            return

        self.is_running = True
        logger.info("🚀 Starting integrated trading system")

        try:
            # 각 컴포넌트 시작
            await self.order_executor.start_executor()
            await self.position_manager.start_monitoring()

            # 시장 시간 확인 후 매도 전략 시작
            if self._is_market_hours():
                await self.exit_strategy.start_strategy()

            # 콜백 설정
            self._setup_callbacks()

            logger.info("✅ All trading components started successfully")

            # 시스템 상태 전송
            await self._send_system_status("started")

        except Exception as e:
            logger.error(f"Failed to start trading system: {e}")
            await self.stop_trading_system()
            raise

    async def stop_trading_system(self):
        """전체 트레이딩 시스템 중지"""
        if not self.is_running:
            return

        self.is_running = False
        logger.info("⏹️ Stopping integrated trading system")

        try:
            # 각 컴포넌트 중지
            await self.order_executor.stop_executor()
            await self.position_manager.stop_monitoring()
            await self.exit_strategy.stop_strategy()

            logger.info("✅ All trading components stopped successfully")

            # 시스템 상태 전송
            await self._send_system_status("stopped")

        except Exception as e:
            logger.error(f"Error stopping trading system: {e}")

    async def process_buy_signal(
        self,
        symbol: str,
        stock_name: str,
        current_price: float,
        change_percent: float,
        volume: int,
        investment_amount: Optional[float] = None
    ) -> Optional[str]:
        """매수 신호 처리"""

        # 투자 한도 확인
        if not self._can_make_investment(investment_amount or 1000000):
            logger.warning(f"Daily investment limit reached: ₩{self.current_daily_investment:,.0f}")
            return None

        # 최대 포지션 수 확인
        if len(self.position_manager.active_positions) >= self.max_positions:
            logger.warning(f"Maximum positions reached: {self.max_positions}")
            return None

        # 매수 신호 생성
        signal = await self.signal_processor.process_price_update(
            symbol=symbol,
            stock_name=stock_name,
            current_price=current_price,
            change_percent=change_percent,
            volume=volume
        )

        if signal:
            logger.info(f"🎯 Buy signal processed: {signal.signal_id}")
            return signal.signal_id

        return None

    async def execute_manual_buy(
        self,
        symbol: str,
        stock_name: str,
        target_price: float,
        investment_amount: float
    ) -> str:
        """수동 매수 주문"""

        # 투자 한도 확인
        if not self._can_make_investment(investment_amount):
            raise ValueError(f"Investment amount exceeds daily limit")

        # 매수 주문 실행
        order_id = await self.order_executor.add_buy_order(
            symbol=symbol,
            stock_name=stock_name,
            target_price=target_price,
            investment_amount=investment_amount,
            auto_execute=True
        )

        # 투자 금액 추가
        self.current_daily_investment += investment_amount

        logger.info(f"📝 Manual buy order created: {order_id}")
        return order_id

    async def execute_manual_sell(self, position_id: str) -> bool:
        """수동 매도 주문"""
        result = await self.position_manager.close_position(
            position_id=position_id,
            exit_reason=ExitReason.MANUAL
        )

        if result:
            logger.info(f"📤 Manual sell order executed: {position_id}")

        return result

    async def get_trading_summary(self) -> Dict[str, Any]:
        """트레이딩 요약 정보"""
        # 포지션 요약
        position_summary = await self.position_manager.get_position_summary()

        # 주문 상태
        order_status = await self.order_executor.get_all_orders()

        # 활성 신호
        active_signals = await self.signal_processor.get_active_signals()

        # 매도 전략 상태
        exit_status = await self.exit_strategy.get_strategy_status()

        # 시장 상태
        market_status = {
            "is_market_hours": self._is_market_hours(),
            "is_after_hours": self._is_after_hours(),
            "current_time": datetime.now().strftime("%H:%M:%S"),
            "market_phase": self._get_market_phase()
        }

        return {
            "system_running": self.is_running,
            "market_status": market_status,
            "daily_stats": self.daily_stats,
            "investment_limits": {
                "max_daily_investment": self.max_daily_investment,
                "current_daily_investment": self.current_daily_investment,
                "remaining_budget": self.max_daily_investment - self.current_daily_investment
            },
            "positions": position_summary,
            "orders": order_status,
            "signals": active_signals,
            "exit_strategy": exit_status
        }

    async def emergency_stop(self, reason: str = "Emergency stop triggered"):
        """비상 정지 - 모든 주문 취소 및 포지션 청산"""
        logger.critical(f"🚨 EMERGENCY STOP: {reason}")

        try:
            # 모든 대기 중인 주문 취소
            pending_orders = list(self.order_executor.pending_orders.keys())
            for order_id in pending_orders:
                await self.order_executor.cancel_order(order_id)

            # 모든 포지션 강제 청산
            await self.position_manager.force_liquidate_all()

            # 시스템 중지
            await self.stop_trading_system()

            # 비상 정지 알림 전송
            await send_system_alert(
                level="critical",
                message=f"Emergency stop executed: {reason}",
                timestamp=datetime.now().isoformat()
            )

        except Exception as e:
            logger.error(f"Error during emergency stop: {e}")

    def _can_make_investment(self, amount: float) -> bool:
        """투자 가능 여부 확인"""
        return (self.current_daily_investment + amount) <= self.max_daily_investment

    def _is_market_hours(self) -> bool:
        """정규 거래 시간 확인"""
        current_time = datetime.now().time()
        return self.market_open_time <= current_time <= self.market_close_time

    def _is_after_hours(self) -> bool:
        """시간외 거래 시간 확인"""
        current_time = datetime.now().time()
        return self.after_hours_start <= current_time <= self.after_hours_end

    def _get_market_phase(self) -> str:
        """현재 시장 단계 반환"""
        current_time = datetime.now().time()

        if current_time < self.market_open_time:
            return "pre_market"
        elif self.market_open_time <= current_time <= self.market_close_time:
            return "regular_hours"
        elif self.after_hours_start <= current_time <= self.after_hours_end:
            return "after_hours"
        else:
            return "closed"

    def _setup_callbacks(self):
        """컴포넌트 간 콜백 설정"""

        # 주문 완료 시 포지션 추가
        async def on_order_completed(order):
            if order.status == OrderStatus.COMPLETED:
                await self.position_manager.add_position(
                    symbol=order.symbol,
                    stock_name=order.stock_name,
                    entry_price=order.actual_price or order.target_price,
                    quantity=order.quantity
                )

                # 일일 통계 업데이트
                self.daily_stats["trades_executed"] += 1
                self.daily_stats["positions_opened"] += 1

                logger.info(f"✅ Position created from completed order: {order.order_id}")

        # 신호 생성 시 알림
        async def on_signal_created(signal: BuySignal):
            logger.info(f"🎯 New buy signal: {signal.symbol} at ₩{signal.current_price:,.0f}")

        # 포지션 종료 시 통계 업데이트
        async def on_position_closed(position):
            self.daily_stats["positions_closed"] += 1
            self.daily_stats["total_pnl"] += position.current_pnl

            # 승률 계산
            if self.daily_stats["positions_closed"] > 0:
                winning_trades = sum(1 for pos in self.position_manager.closed_positions.values()
                                   if pos.current_pnl > 0)
                self.daily_stats["win_rate"] = (winning_trades / self.daily_stats["positions_closed"]) * 100

        # 콜백 등록
        self.signal_processor.on_signal_created = on_signal_created

    async def _send_system_status(self, status: str):
        """시스템 상태 전송"""
        try:
            await send_trading_status(
                status=status,
                components={
                    "order_executor": self.order_executor.is_running,
                    "position_manager": self.position_manager.is_running,
                    "exit_strategy": self.exit_strategy.is_running
                },
                timestamp=datetime.now().isoformat()
            )
        except Exception as e:
            logger.warning(f"Failed to send system status: {e}")


# 글로벌 트레이딩 컨트롤러 인스턴스
trading_controller = TradingController()