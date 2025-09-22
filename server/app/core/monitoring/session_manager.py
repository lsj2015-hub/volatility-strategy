"""
After-hours Trading Session Manager
시간외 거래 세션 관리자 (16:00-17:40)
"""

import asyncio
import logging
from datetime import datetime, time, timedelta
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum

from ...api.websocket import send_session_status, send_order_update
from ...services.kis_api import KISAPIClient
from .threshold_adjuster import ThresholdAdjuster

logger = logging.getLogger(__name__)


class SessionPhase(Enum):
    """세션 단계"""
    WAITING = "waiting"      # 16:00 이전 대기
    PHASE_1 = "phase_1"      # 16:00-16:30
    PHASE_2 = "phase_2"      # 16:30-17:00
    PHASE_3 = "phase_3"      # 17:00-17:30
    PHASE_4 = "phase_4"      # 17:30-17:40
    COMPLETED = "completed"  # 17:40 이후 완료


@dataclass
class MonitoringTarget:
    """모니터링 대상 주식"""
    symbol: str
    stock_name: str
    entry_price: float
    current_price: float
    change_percent: float
    volume: int
    buy_threshold: float  # 매수 조건 임계값
    is_triggered: bool = False
    trigger_time: Optional[datetime] = None


@dataclass
class SessionStatus:
    """세션 상태"""
    current_phase: SessionPhase
    phase_start_time: datetime
    next_phase_time: Optional[datetime]
    monitoring_targets: List[MonitoringTarget]
    total_targets: int
    triggered_count: int
    remaining_time: timedelta


class AfterHoursSessionManager:
    """시간외 거래 세션 관리자"""

    def __init__(self):
        self.kis_client = KISAPIClient()
        self.threshold_adjuster = ThresholdAdjuster()

        # 세션 상태
        self.current_phase = SessionPhase.WAITING
        self.is_running = False
        self.session_task: Optional[asyncio.Task] = None

        # 모니터링 대상
        self.monitoring_targets: Dict[str, MonitoringTarget] = {}

        # 시간 설정
        self.phase_times = {
            SessionPhase.PHASE_1: time(16, 0),   # 16:00
            SessionPhase.PHASE_2: time(16, 30),  # 16:30
            SessionPhase.PHASE_3: time(17, 0),   # 17:00
            SessionPhase.PHASE_4: time(17, 30),  # 17:30
            SessionPhase.COMPLETED: time(17, 40) # 17:40
        }

        # 콜백 함수들
        self.on_phase_change: Optional[Callable] = None
        self.on_target_triggered: Optional[Callable] = None
        self.on_session_complete: Optional[Callable] = None

    async def start_session(self, targets: List[Dict]) -> bool:
        """세션 시작"""
        if self.is_running:
            logger.warning("Session is already running")
            return False

        try:
            # 모니터링 대상 설정
            await self._setup_monitoring_targets(targets)

            # 세션 시작
            self.is_running = True
            self.session_task = asyncio.create_task(self._session_loop())

            logger.info(f"After-hours monitoring session started with {len(self.monitoring_targets)} targets")

            # 초기 세션 상태 전송
            await self._send_session_update()

            return True

        except Exception as e:
            logger.error(f"Failed to start session: {e}")
            self.is_running = False
            return False

    async def stop_session(self):
        """세션 중지"""
        if not self.is_running:
            return

        self.is_running = False

        if self.session_task and not self.session_task.done():
            self.session_task.cancel()
            try:
                await self.session_task
            except asyncio.CancelledError:
                logger.info("Session task cancelled")

        logger.info("After-hours monitoring session stopped")

    async def adjust_threshold(self, symbol: str, new_threshold: float) -> bool:
        """특정 종목의 매수 임계값 조정"""
        if symbol not in self.monitoring_targets:
            logger.warning(f"Target not found: {symbol}")
            return False

        old_threshold = self.monitoring_targets[symbol].buy_threshold
        self.monitoring_targets[symbol].buy_threshold = new_threshold

        logger.info(f"Threshold adjusted for {symbol}: {old_threshold:.2f}% → {new_threshold:.2f}%")

        # 조정 결과 웹소켓 전송
        await send_order_update(
            order_id=f"THRESHOLD_{symbol}",
            symbol=symbol,
            status="threshold_adjusted",
            data={
                "old_threshold": old_threshold,
                "new_threshold": new_threshold,
                "adjusted_at": datetime.now().isoformat()
            }
        )

        return True

    async def get_session_status(self) -> SessionStatus:
        """현재 세션 상태 조회"""
        current_time = datetime.now()

        # 다음 단계 시간 계산
        next_phase_time = self._get_next_phase_time(current_time.time())

        # 남은 시간 계산
        if next_phase_time:
            remaining_time = datetime.combine(current_time.date(), next_phase_time) - current_time
            if remaining_time.total_seconds() < 0:
                remaining_time = timedelta(0)
        else:
            remaining_time = timedelta(0)

        return SessionStatus(
            current_phase=self.current_phase,
            phase_start_time=self._get_phase_start_time(),
            next_phase_time=next_phase_time,
            monitoring_targets=list(self.monitoring_targets.values()),
            total_targets=len(self.monitoring_targets),
            triggered_count=sum(1 for target in self.monitoring_targets.values() if target.is_triggered),
            remaining_time=remaining_time
        )

    async def _setup_monitoring_targets(self, targets: List[Dict]):
        """모니터링 대상 설정"""
        self.monitoring_targets.clear()

        for target_data in targets:
            target = MonitoringTarget(
                symbol=target_data["symbol"],
                stock_name=target_data["stock_name"],
                entry_price=target_data["entry_price"],
                current_price=target_data["entry_price"],  # 초기값
                change_percent=0.0,
                volume=target_data.get("volume", 0),
                buy_threshold=target_data.get("buy_threshold", 2.0)  # 기본 2% 상승
            )
            self.monitoring_targets[target.symbol] = target

    async def _session_loop(self):
        """세션 메인 루프"""
        try:
            while self.is_running:
                current_time = datetime.now().time()

                # 현재 단계 업데이트
                new_phase = self._determine_current_phase(current_time)

                if new_phase != self.current_phase:
                    await self._handle_phase_change(new_phase)

                # 세션이 완료되었는지 확인
                if self.current_phase == SessionPhase.COMPLETED:
                    await self._handle_session_complete()
                    break

                # 활성 단계에서만 모니터링 실행
                if self.current_phase != SessionPhase.WAITING:
                    await self._monitor_targets()

                # 세션 상태 업데이트 전송
                await self._send_session_update()

                # 업데이트 간격 (30초)
                await asyncio.sleep(30)

        except asyncio.CancelledError:
            logger.info("Session loop cancelled")
        except Exception as e:
            logger.error(f"Error in session loop: {e}")
        finally:
            self.is_running = False

    async def _monitor_targets(self):
        """모니터링 대상 주식 가격 확인"""
        for symbol, target in self.monitoring_targets.items():
            if target.is_triggered:
                continue  # 이미 매수 신호가 발생한 종목은 스킵

            try:
                # KIS API에서 현재가 조회
                price_data = await self.kis_client.get_current_price(symbol)

                if price_data:
                    # 가격 정보 업데이트
                    target.current_price = price_data["current_price"]
                    target.change_percent = price_data["change_percent"]
                    target.volume = price_data.get("volume", target.volume)

                    # 매수 조건 확인
                    if target.change_percent >= target.buy_threshold:
                        await self._trigger_buy_signal(target)

            except Exception as e:
                logger.warning(f"Failed to get price for {symbol}: {e}")

    async def _trigger_buy_signal(self, target: MonitoringTarget):
        """매수 신호 발생"""
        target.is_triggered = True
        target.trigger_time = datetime.now()

        logger.info(f"🎯 Buy signal triggered: {target.symbol} ({target.stock_name}) - {target.change_percent:.2f}%")

        # 신호 처리기에 전달
        try:
            from ..trading.signal_processor import signal_processor

            await signal_processor.process_price_update(
                symbol=target.symbol,
                stock_name=target.stock_name,
                current_price=target.current_price,
                change_percent=target.change_percent,
                volume=target.volume,
                threshold_percent=target.buy_threshold
            )

        except Exception as e:
            logger.error(f"Failed to process buy signal for {target.symbol}: {e}")

        # 콜백 실행
        if self.on_target_triggered:
            await self.on_target_triggered(target)

    async def _handle_phase_change(self, new_phase: SessionPhase):
        """단계 변경 처리"""
        old_phase = self.current_phase
        self.current_phase = new_phase

        logger.info(f"📅 Session phase changed: {old_phase.value} → {new_phase.value}")

        # 단계별 임계값 조정
        if new_phase in [SessionPhase.PHASE_2, SessionPhase.PHASE_3, SessionPhase.PHASE_4]:
            await self._adjust_thresholds_for_phase(new_phase)

        # 콜백 실행
        if self.on_phase_change:
            await self.on_phase_change(old_phase, new_phase)

    async def _adjust_thresholds_for_phase(self, phase: SessionPhase):
        """단계별 임계값 자동 조정"""
        # 시간이 지날수록 임계값을 낮춰 매수 기회 확대
        adjustment_factors = {
            SessionPhase.PHASE_1: 1.0,   # 16:00-16:30: 기본값 유지
            SessionPhase.PHASE_2: 0.9,   # 16:30-17:00: 10% 감소
            SessionPhase.PHASE_3: 0.8,   # 17:00-17:30: 20% 감소
            SessionPhase.PHASE_4: 0.7    # 17:30-17:40: 30% 감소
        }

        factor = adjustment_factors.get(phase, 1.0)

        for symbol, target in self.monitoring_targets.items():
            if not target.is_triggered:
                original_threshold = target.buy_threshold
                new_threshold = original_threshold * factor
                target.buy_threshold = new_threshold

                logger.info(f"Auto-adjusted threshold for {symbol}: {original_threshold:.2f}% → {new_threshold:.2f}%")

    async def _handle_session_complete(self):
        """세션 완료 처리"""
        logger.info("🏁 After-hours monitoring session completed")

        # 통계 정보 계산
        total_targets = len(self.monitoring_targets)
        triggered_count = sum(1 for target in self.monitoring_targets.values() if target.is_triggered)

        logger.info(f"Session summary: {triggered_count}/{total_targets} targets triggered")

        # 콜백 실행
        if self.on_session_complete:
            await self.on_session_complete(triggered_count, total_targets)

        self.is_running = False

    async def _send_session_update(self):
        """세션 상태 업데이트 전송"""
        status = await self.get_session_status()

        await send_session_status(
            day="monitoring",
            phase=status.current_phase.value,
            status="active" if self.is_running else "inactive",
            next_action=self._get_next_action(),
            next_action_time=status.next_phase_time.strftime('%H:%M') if status.next_phase_time else None
        )

    def _determine_current_phase(self, current_time: time) -> SessionPhase:
        """현재 시간을 기준으로 세션 단계 결정"""
        if current_time < self.phase_times[SessionPhase.PHASE_1]:
            return SessionPhase.WAITING
        elif current_time < self.phase_times[SessionPhase.PHASE_2]:
            return SessionPhase.PHASE_1
        elif current_time < self.phase_times[SessionPhase.PHASE_3]:
            return SessionPhase.PHASE_2
        elif current_time < self.phase_times[SessionPhase.PHASE_4]:
            return SessionPhase.PHASE_3
        elif current_time < self.phase_times[SessionPhase.COMPLETED]:
            return SessionPhase.PHASE_4
        else:
            return SessionPhase.COMPLETED

    def _get_next_phase_time(self, current_time: time) -> Optional[time]:
        """다음 단계 시간 반환"""
        for phase in [SessionPhase.PHASE_1, SessionPhase.PHASE_2,
                     SessionPhase.PHASE_3, SessionPhase.PHASE_4, SessionPhase.COMPLETED]:
            if current_time < self.phase_times[phase]:
                return self.phase_times[phase]
        return None

    def _get_phase_start_time(self) -> datetime:
        """현재 단계 시작 시간"""
        current_date = datetime.now().date()

        if self.current_phase == SessionPhase.WAITING:
            return datetime.combine(current_date, time(16, 0))
        else:
            return datetime.combine(current_date, self.phase_times[self.current_phase])

    def _get_next_action(self) -> str:
        """다음 액션 설명"""
        action_map = {
            SessionPhase.WAITING: "monitoring_start",
            SessionPhase.PHASE_1: "phase_2_monitoring",
            SessionPhase.PHASE_2: "phase_3_monitoring",
            SessionPhase.PHASE_3: "phase_4_monitoring",
            SessionPhase.PHASE_4: "session_complete",
            SessionPhase.COMPLETED: "session_ended"
        }
        return action_map.get(self.current_phase, "unknown")


# 글로벌 세션 관리자 인스턴스
session_manager = AfterHoursSessionManager()