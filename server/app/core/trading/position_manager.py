"""
Position Management System
포지션 관리 시스템 - 매수 완료된 포지션의 수익/손실 추적 및 관리
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
from dataclasses import dataclass, field

from ...services.kis_api import KISAPIClient
from ...api.websocket import send_position_update, send_exit_signal
from .order_executor import OrderType

logger = logging.getLogger(__name__)


class PositionStatus(str, Enum):
    """포지션 상태"""
    ACTIVE = "active"          # 활성 포지션
    MONITORING = "monitoring"  # 모니터링 중
    EXIT_PENDING = "exit_pending"  # 매도 대기
    CLOSED = "closed"          # 포지션 종료
    LIQUIDATED = "liquidated"  # 강제 청산


class ExitReason(str, Enum):
    """매도 사유"""
    PROFIT_TARGET = "profit_target"    # 목표 수익률 달성
    STOP_LOSS = "stop_loss"           # 손절매
    TIME_BASED = "time_based"         # 시간 기반 매도
    MANUAL = "manual"                 # 수동 매도
    FORCE_LIQUIDATION = "force_liquidation"  # 강제 청산


@dataclass
class Position:
    """포지션 정보"""
    position_id: str
    symbol: str
    stock_name: str
    entry_price: float
    quantity: int
    entry_time: datetime

    # 거래 설정
    target_profit_percent: float = 3.0    # 목표 수익률 (%)
    stop_loss_percent: float = -2.0       # 손절매 비율 (%)
    max_hold_hours: int = 6               # 최대 보유 시간 (시간)

    # 상태 관리
    status: PositionStatus = PositionStatus.ACTIVE
    current_price: float = 0.0
    current_pnl: float = 0.0
    current_pnl_percent: float = 0.0

    # 매도 관련
    exit_price: Optional[float] = None
    exit_time: Optional[datetime] = None
    exit_reason: Optional[ExitReason] = None
    exit_order_id: Optional[str] = None

    # 추적 데이터
    highest_price: float = field(default_factory=lambda: 0.0)
    lowest_price: float = field(default_factory=lambda: float('inf'))
    price_updates: List[Dict[str, Any]] = field(default_factory=list)

    def __post_init__(self):
        """초기화 후 처리"""
        if self.current_price == 0.0:
            self.current_price = self.entry_price
        if self.highest_price == 0.0:
            self.highest_price = self.entry_price
        if self.lowest_price == float('inf'):
            self.lowest_price = self.entry_price

    def update_price(self, new_price: float):
        """가격 업데이트"""
        self.current_price = new_price

        # 최고가/최저가 업데이트
        self.highest_price = max(self.highest_price, new_price)
        self.lowest_price = min(self.lowest_price, new_price)

        # 손익 계산
        self.current_pnl = (new_price - self.entry_price) * self.quantity
        self.current_pnl_percent = ((new_price - self.entry_price) / self.entry_price) * 100

        # 가격 업데이트 기록
        self.price_updates.append({
            "timestamp": datetime.now(),
            "price": new_price,
            "pnl": self.current_pnl,
            "pnl_percent": self.current_pnl_percent
        })

        # 최근 100개 기록만 유지
        if len(self.price_updates) > 100:
            self.price_updates = self.price_updates[-100:]

    def should_exit(self) -> tuple[bool, ExitReason]:
        """매도 조건 확인"""
        current_time = datetime.now()

        # 목표 수익률 달성
        if self.current_pnl_percent >= self.target_profit_percent:
            return True, ExitReason.PROFIT_TARGET

        # 손절매
        if self.current_pnl_percent <= self.stop_loss_percent:
            return True, ExitReason.STOP_LOSS

        # 시간 기반 매도 (최대 보유 시간 초과)
        hours_held = (current_time - self.entry_time).total_seconds() / 3600
        if hours_held >= self.max_hold_hours:
            return True, ExitReason.TIME_BASED

        return False, None

    def get_time_remaining(self) -> timedelta:
        """보유 시간 남은 시간 계산"""
        current_time = datetime.now()
        elapsed_hours = (current_time - self.entry_time).total_seconds() / 3600
        remaining_hours = max(0, self.max_hold_hours - elapsed_hours)
        return timedelta(hours=remaining_hours)


class PositionManager:
    """포지션 관리 시스템"""

    def __init__(self):
        self.kis_client = KISAPIClient()
        self.active_positions: Dict[str, Position] = {}
        self.closed_positions: Dict[str, Position] = {}
        self.is_running = False
        self.monitoring_task: Optional[asyncio.Task] = None

        # 설정
        self.monitoring_interval = 5.0  # 모니터링 간격 (초)
        self.force_liquidation_time = "15:20"  # 강제 청산 시간
        self.market_close_time = "15:30"       # 장 마감 시간

    async def start_monitoring(self):
        """포지션 모니터링 시작"""
        if self.is_running:
            logger.warning("Position monitoring is already running")
            return

        self.is_running = True
        logger.info("🎯 Starting position monitoring")

        # 백그라운드 모니터링 태스크 시작
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())

    async def stop_monitoring(self):
        """포지션 모니터링 중지"""
        if not self.is_running:
            return

        self.is_running = False
        logger.info("⏹️ Stopping position monitoring")

        if self.monitoring_task and not self.monitoring_task.done():
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                logger.info("Position monitoring task cancelled")

    async def add_position(
        self,
        symbol: str,
        stock_name: str,
        entry_price: float,
        quantity: int,
        target_profit_percent: float = 3.0,
        stop_loss_percent: float = -2.0,
        max_hold_hours: int = 6
    ) -> str:
        """새 포지션 추가"""
        position_id = f"POS_{symbol}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        position = Position(
            position_id=position_id,
            symbol=symbol,
            stock_name=stock_name,
            entry_price=entry_price,
            quantity=quantity,
            entry_time=datetime.now(),
            target_profit_percent=target_profit_percent,
            stop_loss_percent=stop_loss_percent,
            max_hold_hours=max_hold_hours
        )

        self.active_positions[position_id] = position

        logger.info(f"📈 Position added: {symbol} ({stock_name}) - {quantity} shares at ₩{entry_price:,.0f}")
        logger.info(f"   Target: +{target_profit_percent}% | Stop Loss: {stop_loss_percent}% | Max Hold: {max_hold_hours}h")

        # WebSocket으로 포지션 업데이트 전송
        await self._send_position_update(position)

        return position_id

    async def close_position(
        self,
        position_id: str,
        exit_reason: ExitReason = ExitReason.MANUAL,
        exit_price: Optional[float] = None
    ) -> bool:
        """포지션 종료"""
        if position_id not in self.active_positions:
            logger.warning(f"Position not found: {position_id}")
            return False

        position = self.active_positions[position_id]

        # 현재 가격으로 매도가 설정 (없는 경우)
        if exit_price is None:
            exit_price = position.current_price

        # 매도 주문 실행
        try:
            # KIS API를 통한 매도 주문
            response = await self.kis_client.place_sell_order(
                stock_code=position.symbol,
                quantity=position.quantity,
                price=0,  # 시장가 매도
                order_type="01"  # 시장가
            )

            if self._is_order_successful(response):
                position.exit_price = exit_price
                position.exit_time = datetime.now()
                position.exit_reason = exit_reason
                position.status = PositionStatus.CLOSED
                position.exit_order_id = response.get("rt_cd")

                # 최종 손익 계산
                position.update_price(exit_price)

                # 종료된 포지션을 종료 목록으로 이동
                self.closed_positions[position_id] = self.active_positions.pop(position_id)

                logger.info(f"✅ Position closed: {position_id}")
                logger.info(f"   Exit: ₩{exit_price:,.0f} | P&L: ₩{position.current_pnl:,.0f} ({position.current_pnl_percent:.2f}%)")

                # WebSocket으로 포지션 종료 알림
                await self._send_position_update(position)

                return True
            else:
                logger.error(f"Failed to close position {position_id}: {response}")
                return False

        except Exception as e:
            logger.error(f"Error closing position {position_id}: {e}")
            return False

    async def force_liquidate_all(self):
        """모든 포지션 강제 청산"""
        logger.warning("🚨 Starting force liquidation of all positions")

        positions_to_close = list(self.active_positions.keys())

        for position_id in positions_to_close:
            await self.close_position(position_id, ExitReason.FORCE_LIQUIDATION)

    async def update_position_price(self, symbol: str, new_price: float):
        """포지션 가격 업데이트"""
        updated_positions = []

        for position in self.active_positions.values():
            if position.symbol == symbol:
                position.update_price(new_price)
                updated_positions.append(position)

                # 매도 조건 확인
                should_exit, exit_reason = position.should_exit()
                if should_exit:
                    logger.info(f"🎯 Exit condition met for {position.position_id}: {exit_reason.value}")
                    await self.close_position(position.position_id, exit_reason, new_price)
                else:
                    # WebSocket으로 포지션 업데이트 전송
                    await self._send_position_update(position)

        return updated_positions

    async def get_position_summary(self) -> Dict[str, Any]:
        """포지션 요약 정보"""
        active_count = len(self.active_positions)
        total_investment = sum(pos.entry_price * pos.quantity for pos in self.active_positions.values())
        total_current_value = sum(pos.current_price * pos.quantity for pos in self.active_positions.values())
        total_pnl = sum(pos.current_pnl for pos in self.active_positions.values())
        total_pnl_percent = (total_pnl / total_investment * 100) if total_investment > 0 else 0

        return {
            "active_positions": active_count,
            "total_investment": total_investment,
            "total_current_value": total_current_value,
            "total_pnl": total_pnl,
            "total_pnl_percent": total_pnl_percent,
            "positions": [await self._position_to_dict(pos) for pos in self.active_positions.values()]
        }

    async def get_all_positions(self) -> Dict[str, List[Dict[str, Any]]]:
        """모든 포지션 조회"""
        active = [await self._position_to_dict(pos) for pos in self.active_positions.values()]
        closed = [await self._position_to_dict(pos) for pos in self.closed_positions.values()]

        return {
            "active": active,
            "closed": closed
        }

    async def _monitoring_loop(self):
        """포지션 모니터링 루프"""
        try:
            while self.is_running:
                if self.active_positions:
                    await self._check_time_based_exits()
                    await self._update_all_prices()

                await asyncio.sleep(self.monitoring_interval)

        except asyncio.CancelledError:
            logger.info("Position monitoring loop cancelled")
        except Exception as e:
            logger.error(f"Error in position monitoring loop: {e}")
        finally:
            self.is_running = False

    async def _check_time_based_exits(self):
        """시간 기반 매도 조건 확인"""
        current_time = datetime.now()
        current_time_str = current_time.strftime("%H:%M")

        # 강제 청산 시간 확인
        if current_time_str >= self.force_liquidation_time:
            await self.force_liquidate_all()
            return

        # 개별 포지션 시간 확인
        positions_to_close = []
        for position in self.active_positions.values():
            should_exit, exit_reason = position.should_exit()
            if should_exit and exit_reason == ExitReason.TIME_BASED:
                positions_to_close.append((position.position_id, exit_reason))

        for position_id, exit_reason in positions_to_close:
            await self.close_position(position_id, exit_reason)

    async def _update_all_prices(self):
        """모든 포지션 가격 업데이트"""
        symbols = list(set(pos.symbol for pos in self.active_positions.values()))

        for symbol in symbols:
            try:
                # KIS API에서 현재 가격 조회
                price_data = await self.kis_client.get_current_price(symbol)
                if price_data:
                    current_price = float(price_data.get("stck_prpr", 0))
                    if current_price > 0:
                        await self.update_position_price(symbol, current_price)
            except Exception as e:
                logger.warning(f"Failed to update price for {symbol}: {e}")

    def _is_order_successful(self, response: Dict[str, Any]) -> bool:
        """KIS API 응답에서 주문 성공 여부 판단"""
        rt_cd = response.get("rt_cd", "")
        return rt_cd == "0"

    async def _position_to_dict(self, position: Position) -> Dict[str, Any]:
        """포지션 객체를 딕셔너리로 변환"""
        return {
            "position_id": position.position_id,
            "symbol": position.symbol,
            "stock_name": position.stock_name,
            "status": position.status.value,
            "entry_price": position.entry_price,
            "current_price": position.current_price,
            "quantity": position.quantity,
            "entry_time": position.entry_time.isoformat(),
            "current_pnl": position.current_pnl,
            "current_pnl_percent": position.current_pnl_percent,
            "target_profit_percent": position.target_profit_percent,
            "stop_loss_percent": position.stop_loss_percent,
            "time_remaining": str(position.get_time_remaining()),
            "highest_price": position.highest_price,
            "lowest_price": position.lowest_price,
            "exit_price": position.exit_price,
            "exit_time": position.exit_time.isoformat() if position.exit_time else None,
            "exit_reason": position.exit_reason.value if position.exit_reason else None
        }

    async def _send_position_update(self, position: Position):
        """WebSocket으로 포지션 업데이트 전송"""
        try:
            position_data = await self._position_to_dict(position)
            await send_position_update(
                position_id=position.position_id,
                symbol=position.symbol,
                status=position.status.value,
                data=position_data
            )
        except Exception as e:
            logger.warning(f"Failed to send position update via WebSocket: {e}")


# 글로벌 포지션 관리자 인스턴스
position_manager = PositionManager()