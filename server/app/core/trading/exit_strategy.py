"""
Time-based Exit Strategy System
시간 기반 매도 전략 시스템 - Day 2 거래 시간별 매도 전략 구현
"""

import asyncio
import logging
from datetime import datetime, timedelta, time
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from dataclasses import dataclass

from .position_manager import position_manager, ExitReason
from ...services.kis_api import KISAPIClient
from ...api.websocket import send_exit_signal, send_strategy_update

logger = logging.getLogger(__name__)


class ExitPhase(str, Enum):
    """매도 단계"""
    EARLY_MORNING = "early_morning"    # 09:00-11:00 (보수적)
    MID_MORNING = "mid_morning"        # 11:00-13:00 (균형)
    AFTERNOON = "afternoon"            # 13:00-15:00 (적극적)
    FORCE_EXIT = "force_exit"          # 15:00-15:30 (강제)


@dataclass
class ExitTarget:
    """매도 목표"""
    phase: ExitPhase
    start_time: time
    end_time: time
    profit_target: float      # 목표 수익률 (%)
    stop_loss: float         # 손절매 수준 (%)
    urgency_multiplier: float  # 시급성 배수 (1.0 = 기본)


class TimeBasedExitStrategy:
    """시간 기반 매도 전략"""

    def __init__(self):
        self.kis_client = KISAPIClient()
        self.is_running = False
        self.strategy_task: Optional[asyncio.Task] = None

        # 전략 설정
        self.check_interval = 60.0  # 전략 확인 간격 (초)
        self.current_phase = ExitPhase.EARLY_MORNING

        # 시간별 매도 목표 설정 (Day 2 기준)
        self.exit_targets = {
            ExitPhase.EARLY_MORNING: ExitTarget(
                phase=ExitPhase.EARLY_MORNING,
                start_time=time(9, 0),    # 09:00
                end_time=time(11, 0),     # 11:00
                profit_target=4.0,        # 높은 목표 수익률
                stop_loss=-1.5,           # 보수적 손절매
                urgency_multiplier=0.8    # 낮은 시급성
            ),
            ExitPhase.MID_MORNING: ExitTarget(
                phase=ExitPhase.MID_MORNING,
                start_time=time(11, 0),   # 11:00
                end_time=time(13, 0),     # 13:00
                profit_target=3.0,        # 중간 목표 수익률
                stop_loss=-2.0,           # 균형 손절매
                urgency_multiplier=1.0    # 기본 시급성
            ),
            ExitPhase.AFTERNOON: ExitTarget(
                phase=ExitPhase.AFTERNOON,
                start_time=time(13, 0),   # 13:00
                end_time=time(15, 0),     # 15:00
                profit_target=2.0,        # 낮은 목표 수익률
                stop_loss=-2.5,           # 관대한 손절매
                urgency_multiplier=1.5    # 높은 시급성
            ),
            ExitPhase.FORCE_EXIT: ExitTarget(
                phase=ExitPhase.FORCE_EXIT,
                start_time=time(15, 0),   # 15:00
                end_time=time(15, 30),    # 15:30
                profit_target=0.5,        # 최소 수익률
                stop_loss=-5.0,           # 매우 관대한 손절매
                urgency_multiplier=3.0    # 최고 시급성
            )
        }

        # 콜백 함수들
        self.on_phase_change: Optional[Callable] = None
        self.on_exit_signal: Optional[Callable] = None

    async def start_strategy(self):
        """시간 기반 매도 전략 시작"""
        if self.is_running:
            logger.warning("Exit strategy is already running")
            return

        self.is_running = True
        logger.info("⏰ Starting time-based exit strategy")

        # 백그라운드 전략 실행 태스크 시작
        self.strategy_task = asyncio.create_task(self._strategy_loop())

    async def stop_strategy(self):
        """시간 기반 매도 전략 중지"""
        if not self.is_running:
            return

        self.is_running = False
        logger.info("⏹️ Stopping time-based exit strategy")

        if self.strategy_task and not self.strategy_task.done():
            self.strategy_task.cancel()
            try:
                await self.strategy_task
            except asyncio.CancelledError:
                logger.info("Exit strategy task cancelled")

    async def evaluate_exit_conditions(self) -> List[Dict[str, Any]]:
        """현재 시간 기준 매도 조건 평가"""
        current_time = datetime.now().time()
        current_phase = self._get_current_phase(current_time)

        if current_phase != self.current_phase:
            await self._phase_transition(current_phase)

        exit_recommendations = []
        active_positions = position_manager.active_positions

        current_target = self.exit_targets[current_phase]

        for position in active_positions.values():
            recommendation = await self._evaluate_position_exit(position, current_target, current_time)
            if recommendation:
                exit_recommendations.append(recommendation)

        return exit_recommendations

    async def force_exit_all_positions(self, reason: str = "Market close approaching"):
        """모든 포지션 강제 매도"""
        logger.warning(f"🚨 Force exit initiated: {reason}")

        active_positions = list(position_manager.active_positions.keys())

        for position_id in active_positions:
            await position_manager.close_position(position_id, ExitReason.FORCE_LIQUIDATION)

        # WebSocket으로 강제 매도 알림
        await self._send_strategy_update({
            "event": "force_exit_completed",
            "reason": reason,
            "positions_closed": len(active_positions),
            "timestamp": datetime.now().isoformat()
        })

    async def get_strategy_status(self) -> Dict[str, Any]:
        """전략 상태 조회"""
        current_time = datetime.now().time()
        current_phase = self._get_current_phase(current_time)
        current_target = self.exit_targets[current_phase]

        # 다음 단계까지 남은 시간 계산
        next_phase_time = None
        for phase in ExitPhase:
            if self.exit_targets[phase].start_time > current_time:
                next_phase_time = self.exit_targets[phase].start_time
                break

        return {
            "is_running": self.is_running,
            "current_phase": current_phase.value,
            "current_time": current_time.strftime("%H:%M:%S"),
            "profit_target": current_target.profit_target,
            "stop_loss": current_target.stop_loss,
            "urgency_multiplier": current_target.urgency_multiplier,
            "next_phase_time": next_phase_time.strftime("%H:%M") if next_phase_time else None,
            "active_positions": len(position_manager.active_positions)
        }

    def _get_current_phase(self, current_time: time) -> ExitPhase:
        """현재 시간 기준 매도 단계 결정"""
        for phase, target in self.exit_targets.items():
            if target.start_time <= current_time < target.end_time:
                return phase

        # 장 시간 이후면 강제 매도 단계
        if current_time >= time(15, 0):
            return ExitPhase.FORCE_EXIT

        # 장 시작 전이면 이른 아침 단계
        return ExitPhase.EARLY_MORNING

    async def _phase_transition(self, new_phase: ExitPhase):
        """매도 단계 전환"""
        old_phase = self.current_phase
        self.current_phase = new_phase

        logger.info(f"📊 Exit phase transition: {old_phase.value} → {new_phase.value}")

        # 새 단계 목표 적용
        new_target = self.exit_targets[new_phase]

        # 모든 활성 포지션의 목표/손절매 수준 업데이트
        for position in position_manager.active_positions.values():
            position.target_profit_percent = new_target.profit_target
            position.stop_loss_percent = new_target.stop_loss

        # WebSocket으로 단계 변경 알림
        await self._send_strategy_update({
            "event": "phase_change",
            "old_phase": old_phase.value,
            "new_phase": new_phase.value,
            "new_targets": {
                "profit_target": new_target.profit_target,
                "stop_loss": new_target.stop_loss,
                "urgency_multiplier": new_target.urgency_multiplier
            },
            "timestamp": datetime.now().isoformat()
        })

        # 콜백 실행
        if self.on_phase_change:
            await self.on_phase_change(old_phase, new_phase)

    async def _evaluate_position_exit(
        self,
        position,
        target: ExitTarget,
        current_time: time
    ) -> Optional[Dict[str, Any]]:
        """개별 포지션 매도 조건 평가"""

        # 기본 매도 조건 확인
        should_exit, exit_reason = position.should_exit()

        if should_exit:
            # 즉시 매도 권장
            recommendation = {
                "position_id": position.position_id,
                "symbol": position.symbol,
                "action": "exit_immediately",
                "reason": exit_reason.value,
                "current_pnl_percent": position.current_pnl_percent,
                "urgency": "high",
                "target_profit": target.profit_target,
                "current_profit": position.current_pnl_percent
            }

            # WebSocket으로 매도 신호 전송
            await self._send_exit_signal(position, exit_reason.value, "high")

            return recommendation

        # 시간 기반 조정된 조건 확인
        time_adjusted_profit = self._calculate_time_adjusted_target(position, target, current_time)

        if position.current_pnl_percent >= time_adjusted_profit:
            # 조정된 목표 달성
            recommendation = {
                "position_id": position.position_id,
                "symbol": position.symbol,
                "action": "exit_recommended",
                "reason": "time_adjusted_profit_target",
                "current_pnl_percent": position.current_pnl_percent,
                "urgency": "medium",
                "target_profit": time_adjusted_profit,
                "current_profit": position.current_pnl_percent
            }

            # WebSocket으로 매도 권장 신호 전송
            await self._send_exit_signal(position, "time_adjusted_target", "medium")

            return recommendation

        return None

    def _calculate_time_adjusted_target(self, position, target: ExitTarget, current_time: time) -> float:
        """시간 조정된 목표 수익률 계산"""
        # 보유 시간 계산
        hours_held = (datetime.now() - position.entry_time).total_seconds() / 3600

        # 단계별 시간 진행률 계산
        phase_start = datetime.combine(datetime.now().date(), target.start_time)
        phase_end = datetime.combine(datetime.now().date(), target.end_time)
        current_datetime = datetime.combine(datetime.now().date(), current_time)

        if phase_end <= phase_start:  # 자정을 넘어가는 경우
            phase_end += timedelta(days=1)

        phase_duration = (phase_end - phase_start).total_seconds() / 3600
        elapsed_in_phase = (current_datetime - phase_start).total_seconds() / 3600
        phase_progress = min(1.0, max(0.0, elapsed_in_phase / phase_duration))

        # 시간이 지날수록 목표 수익률 하향 조정
        time_decay_factor = 1.0 - (phase_progress * 0.3)  # 최대 30% 하향 조정
        urgency_factor = target.urgency_multiplier

        adjusted_target = target.profit_target * time_decay_factor * urgency_factor

        return max(0.5, adjusted_target)  # 최소 0.5% 유지

    async def _strategy_loop(self):
        """전략 실행 루프"""
        try:
            while self.is_running:
                # 현재 시간이 거래 시간인지 확인
                current_time = datetime.now().time()

                if time(9, 0) <= current_time <= time(15, 30):
                    # 매도 조건 평가
                    recommendations = await self.evaluate_exit_conditions()

                    # 강제 매도 시간 확인
                    if current_time >= time(15, 20):
                        await self.force_exit_all_positions("Market close in 10 minutes")

                await asyncio.sleep(self.check_interval)

        except asyncio.CancelledError:
            logger.info("Exit strategy loop cancelled")
        except Exception as e:
            logger.error(f"Error in exit strategy loop: {e}")
        finally:
            self.is_running = False

    async def _send_exit_signal(self, position, reason: str, urgency: str):
        """WebSocket으로 매도 신호 전송"""
        try:
            await send_exit_signal(
                position_id=position.position_id,
                symbol=position.symbol,
                current_price=position.current_price,
                reason=reason,
                urgency=urgency,
                pnl_percent=position.current_pnl_percent
            )
        except Exception as e:
            logger.warning(f"Failed to send exit signal via WebSocket: {e}")

    async def _send_strategy_update(self, data: Dict[str, Any]):
        """WebSocket으로 전략 업데이트 전송"""
        try:
            await send_strategy_update(data)
        except Exception as e:
            logger.warning(f"Failed to send strategy update via WebSocket: {e}")


# 글로벌 시간 기반 매도 전략 인스턴스
exit_strategy = TimeBasedExitStrategy()