"""
Task Scheduler Service
자동화 태스크 스케줄링 서비스 - 시간 기반 거래 전략 자동화
"""

import asyncio
import logging
from datetime import datetime, time, timedelta
from typing import Dict, List, Optional, Callable, Any
from enum import Enum
import schedule
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.filtering.filter_engine import filter_engine
from app.core.monitoring.session_manager import session_manager
from app.core.trading.position_manager import position_manager
from app.core.trading.exit_strategy import exit_strategy
from app.api.websocket import send_scheduler_update
from app.utils.config import get_config

logger = logging.getLogger(__name__)

class SchedulerStatus(str, Enum):
    """스케줄러 상태"""
    STOPPED = "stopped"
    RUNNING = "running"
    PAUSED = "paused"

class TaskType(str, Enum):
    """태스크 유형"""
    DAILY_FILTERING = "daily_filtering"
    MONITORING_START = "monitoring_start"
    MONITORING_CHECK = "monitoring_check"
    POSITION_MONITORING = "position_monitoring"
    EXIT_STRATEGY = "exit_strategy"
    FORCE_LIQUIDATION = "force_liquidation"
    MARKET_CLOSE_CLEANUP = "market_close_cleanup"

class ScheduledTask:
    """스케줄된 태스크"""
    def __init__(
        self,
        task_id: str,
        task_type: TaskType,
        name: str,
        func: Callable,
        trigger_time: time,
        enabled: bool = True,
        description: str = ""
    ):
        self.task_id = task_id
        self.task_type = task_type
        self.name = name
        self.func = func
        self.trigger_time = trigger_time
        self.enabled = enabled
        self.description = description
        self.last_run: Optional[datetime] = None
        self.next_run: Optional[datetime] = None
        self.run_count = 0
        self.error_count = 0
        self.last_error: Optional[str] = None

class TradingScheduler:
    """거래 전략 자동화 스케줄러"""

    def __init__(self):
        self.config = get_config()
        self.scheduler = AsyncIOScheduler()
        self.status = SchedulerStatus.STOPPED
        self.tasks: Dict[str, ScheduledTask] = {}

        # 스케줄링 설정
        self.timezone = "Asia/Seoul"

        # 실행 상태 추적
        self.daily_tasks_completed = False
        self.monitoring_active = False
        self.position_monitoring_active = False

        self._initialize_scheduled_tasks()

    def _initialize_scheduled_tasks(self):
        """기본 스케줄 태스크들 초기화"""

        # Day 1: 15:30 - 일일 주식 필터링
        self.add_task(
            task_id="daily_filtering_1530",
            task_type=TaskType.DAILY_FILTERING,
            name="Daily Stock Filtering",
            func=self._execute_daily_filtering,
            trigger_time=time(15, 30),
            description="Execute daily stock filtering at market close"
        )

        # Day 1: 16:00 - 애프터마켓 모니터링 시작
        self.add_task(
            task_id="monitoring_start_1600",
            task_type=TaskType.MONITORING_START,
            name="Start After-hours Monitoring",
            func=self._start_monitoring,
            trigger_time=time(16, 0),
            description="Start after-hours price monitoring"
        )

        # Day 1: 16:30, 17:00, 17:30 - 모니터링 체크포인트
        for hour, minute in [(16, 30), (17, 0), (17, 30)]:
            self.add_task(
                task_id=f"monitoring_check_{hour:02d}{minute:02d}",
                task_type=TaskType.MONITORING_CHECK,
                name=f"Monitoring Checkpoint {hour:02d}:{minute:02d}",
                func=self._monitoring_checkpoint,
                trigger_time=time(hour, minute),
                description=f"Check monitoring status at {hour:02d}:{minute:02d}"
            )

        # Day 2: 09:00 - 포지션 모니터링 시작
        self.add_task(
            task_id="position_monitoring_0900",
            task_type=TaskType.POSITION_MONITORING,
            name="Start Position Monitoring",
            func=self._start_position_monitoring,
            trigger_time=time(9, 0),
            description="Start monitoring active positions"
        )

        # Day 2: 09:00 - 시간 기반 매도 전략 시작
        self.add_task(
            task_id="exit_strategy_0900",
            task_type=TaskType.EXIT_STRATEGY,
            name="Start Exit Strategy",
            func=self._start_exit_strategy,
            trigger_time=time(9, 0),
            description="Start time-based exit strategy"
        )

        # Day 2: 15:20 - 강제 청산
        self.add_task(
            task_id="force_liquidation_1520",
            task_type=TaskType.FORCE_LIQUIDATION,
            name="Force Liquidation",
            func=self._force_liquidation,
            trigger_time=time(15, 20),
            description="Force liquidate all positions before market close"
        )

        # Day 2: 15:35 - 장 마감 정리
        self.add_task(
            task_id="market_close_cleanup_1535",
            task_type=TaskType.MARKET_CLOSE_CLEANUP,
            name="Market Close Cleanup",
            func=self._market_close_cleanup,
            trigger_time=time(15, 35),
            description="Clean up and prepare for next trading day"
        )

    def add_task(
        self,
        task_id: str,
        task_type: TaskType,
        name: str,
        func: Callable,
        trigger_time: time,
        enabled: bool = True,
        description: str = ""
    ):
        """새 태스크 추가"""
        task = ScheduledTask(
            task_id=task_id,
            task_type=task_type,
            name=name,
            func=func,
            trigger_time=trigger_time,
            enabled=enabled,
            description=description
        )

        self.tasks[task_id] = task

        if self.status == SchedulerStatus.RUNNING and enabled:
            self._schedule_task(task)

        logger.info(f"📅 Task added: {name} at {trigger_time.strftime('%H:%M')}")

    def remove_task(self, task_id: str) -> bool:
        """태스크 제거"""
        if task_id not in self.tasks:
            return False

        # 스케줄러에서 제거
        try:
            self.scheduler.remove_job(task_id)
        except:
            pass

        # 태스크 딕셔너리에서 제거
        del self.tasks[task_id]

        logger.info(f"📅 Task removed: {task_id}")
        return True

    def enable_task(self, task_id: str) -> bool:
        """태스크 활성화"""
        if task_id not in self.tasks:
            return False

        task = self.tasks[task_id]
        task.enabled = True

        if self.status == SchedulerStatus.RUNNING:
            self._schedule_task(task)

        logger.info(f"📅 Task enabled: {task.name}")
        return True

    def disable_task(self, task_id: str) -> bool:
        """태스크 비활성화"""
        if task_id not in self.tasks:
            return False

        task = self.tasks[task_id]
        task.enabled = False

        try:
            self.scheduler.remove_job(task_id)
        except:
            pass

        logger.info(f"📅 Task disabled: {task.name}")
        return True

    async def start_scheduler(self):
        """스케줄러 시작"""
        if self.status == SchedulerStatus.RUNNING:
            logger.warning("Scheduler is already running")
            return

        self.status = SchedulerStatus.RUNNING
        logger.info("🕒 Starting trading scheduler")

        # 모든 활성화된 태스크를 스케줄러에 등록
        for task in self.tasks.values():
            if task.enabled:
                self._schedule_task(task)

        # 스케줄러 시작
        self.scheduler.start()

        # WebSocket으로 상태 업데이트
        await self._send_scheduler_update("started")

    async def stop_scheduler(self):
        """스케줄러 중지"""
        if self.status == SchedulerStatus.STOPPED:
            return

        self.status = SchedulerStatus.STOPPED
        logger.info("⏹️ Stopping trading scheduler")

        # 스케줄러 종료
        self.scheduler.shutdown()

        # WebSocket으로 상태 업데이트
        await self._send_scheduler_update("stopped")

    async def pause_scheduler(self):
        """스케줄러 일시정지"""
        if self.status != SchedulerStatus.RUNNING:
            return

        self.status = SchedulerStatus.PAUSED
        logger.info("⏸️ Pausing trading scheduler")

        self.scheduler.pause()

        await self._send_scheduler_update("paused")

    async def resume_scheduler(self):
        """스케줄러 재개"""
        if self.status != SchedulerStatus.PAUSED:
            return

        self.status = SchedulerStatus.RUNNING
        logger.info("▶️ Resuming trading scheduler")

        self.scheduler.resume()

        await self._send_scheduler_update("resumed")

    def _schedule_task(self, task: ScheduledTask):
        """개별 태스크 스케줄링"""
        trigger = CronTrigger(
            hour=task.trigger_time.hour,
            minute=task.trigger_time.minute,
            timezone=self.timezone
        )

        self.scheduler.add_job(
            func=self._execute_task_wrapper,
            trigger=trigger,
            args=[task],
            id=task.task_id,
            name=task.name,
            replace_existing=True
        )

        # 다음 실행 시간 계산
        task.next_run = self._calculate_next_run(task.trigger_time)

        logger.debug(f"📅 Scheduled task: {task.name} -> {task.next_run}")

    def _calculate_next_run(self, trigger_time: time) -> datetime:
        """다음 실행 시간 계산"""
        now = datetime.now()
        today = now.date()

        # 오늘의 실행 시간
        today_run = datetime.combine(today, trigger_time)

        if today_run > now:
            return today_run
        else:
            # 내일의 실행 시간
            tomorrow = today + timedelta(days=1)
            return datetime.combine(tomorrow, trigger_time)

    async def _execute_task_wrapper(self, task: ScheduledTask):
        """태스크 실행 래퍼 (에러 처리 포함)"""
        logger.info(f"🔄 Executing scheduled task: {task.name}")

        task.run_count += 1
        task.last_run = datetime.now()

        try:
            # 태스크 실행
            await task.func()

            # 성공 로깅
            logger.info(f"✅ Task completed: {task.name}")

            # WebSocket으로 태스크 완료 알림
            await self._send_task_update(task, "completed")

        except Exception as e:
            task.error_count += 1
            task.last_error = str(e)

            logger.error(f"❌ Task failed: {task.name} - {str(e)}")

            # WebSocket으로 태스크 실패 알림
            await self._send_task_update(task, "failed", str(e))

        finally:
            # 다음 실행 시간 업데이트
            task.next_run = self._calculate_next_run(task.trigger_time)

    # 스케줄된 태스크 함수들
    async def _execute_daily_filtering(self):
        """일일 주식 필터링 실행"""
        logger.info("📊 Starting daily stock filtering")

        # 기본 필터링 조건으로 실행
        result = await filter_engine.filter_stocks()

        if result.get("status") == "success":
            filtered_count = len(result.get("filtered_stocks", []))
            logger.info(f"📊 Daily filtering completed: {filtered_count} stocks filtered")
            self.daily_tasks_completed = True
        else:
            logger.error(f"📊 Daily filtering failed: {result.get('message', 'Unknown error')}")

    async def _start_monitoring(self):
        """애프터마켓 모니터링 시작"""
        logger.info("👁️ Starting after-hours monitoring")

        if not self.daily_tasks_completed:
            logger.warning("Daily filtering not completed, skipping monitoring start")
            return

        try:
            await session_manager.start_session()
            self.monitoring_active = True
            logger.info("👁️ After-hours monitoring started successfully")
        except Exception as e:
            logger.error(f"👁️ Failed to start monitoring: {str(e)}")

    async def _monitoring_checkpoint(self):
        """모니터링 체크포인트"""
        current_time = datetime.now().strftime("%H:%M")
        logger.info(f"🔍 Monitoring checkpoint at {current_time}")

        if self.monitoring_active:
            # 모니터링 세션 상태 확인
            status = await session_manager.get_session_status()
            logger.info(f"🔍 Monitoring status: {status.get('status', 'unknown')}")
        else:
            logger.warning("🔍 Monitoring should be active but is not running")

    async def _start_position_monitoring(self):
        """포지션 모니터링 시작"""
        logger.info("📈 Starting position monitoring")

        try:
            await position_manager.start_monitoring()
            self.position_monitoring_active = True
            logger.info("📈 Position monitoring started successfully")
        except Exception as e:
            logger.error(f"📈 Failed to start position monitoring: {str(e)}")

    async def _start_exit_strategy(self):
        """시간 기반 매도 전략 시작"""
        logger.info("⏰ Starting time-based exit strategy")

        try:
            await exit_strategy.start_strategy()
            logger.info("⏰ Exit strategy started successfully")
        except Exception as e:
            logger.error(f"⏰ Failed to start exit strategy: {str(e)}")

    async def _force_liquidation(self):
        """강제 청산 실행"""
        logger.warning("🚨 Executing force liquidation")

        try:
            await position_manager.force_liquidate_all()
            logger.warning("🚨 Force liquidation completed")
        except Exception as e:
            logger.error(f"🚨 Force liquidation failed: {str(e)}")

    async def _market_close_cleanup(self):
        """장 마감 정리"""
        logger.info("🧹 Starting market close cleanup")

        try:
            # 모든 모니터링 중지
            if self.monitoring_active:
                await session_manager.stop_session()
                self.monitoring_active = False

            if self.position_monitoring_active:
                await position_manager.stop_monitoring()
                self.position_monitoring_active = False

            # 매도 전략 중지
            await exit_strategy.stop_strategy()

            # 다음 날을 위한 초기화
            self.daily_tasks_completed = False

            logger.info("🧹 Market close cleanup completed")

        except Exception as e:
            logger.error(f"🧹 Market close cleanup failed: {str(e)}")

    async def get_scheduler_status(self) -> Dict[str, Any]:
        """스케줄러 상태 조회"""
        running_jobs = []

        if self.status == SchedulerStatus.RUNNING:
            for job in self.scheduler.get_jobs():
                running_jobs.append({
                    "id": job.id,
                    "name": job.name,
                    "next_run": job.next_run_time.isoformat() if job.next_run_time else None
                })

        return {
            "status": self.status.value,
            "timezone": self.timezone,
            "total_tasks": len(self.tasks),
            "enabled_tasks": sum(1 for task in self.tasks.values() if task.enabled),
            "running_jobs": len(running_jobs),
            "daily_tasks_completed": self.daily_tasks_completed,
            "monitoring_active": self.monitoring_active,
            "position_monitoring_active": self.position_monitoring_active,
            "jobs": running_jobs
        }

    async def get_task_details(self) -> List[Dict[str, Any]]:
        """태스크 상세 정보 조회"""
        tasks = []

        for task in self.tasks.values():
            task_info = {
                "task_id": task.task_id,
                "task_type": task.task_type.value,
                "name": task.name,
                "description": task.description,
                "trigger_time": task.trigger_time.strftime("%H:%M"),
                "enabled": task.enabled,
                "run_count": task.run_count,
                "error_count": task.error_count,
                "last_run": task.last_run.isoformat() if task.last_run else None,
                "next_run": task.next_run.isoformat() if task.next_run else None,
                "last_error": task.last_error
            }
            tasks.append(task_info)

        # 시간순으로 정렬
        tasks.sort(key=lambda x: x["trigger_time"])

        return tasks

    async def _send_scheduler_update(self, event: str):
        """WebSocket으로 스케줄러 업데이트 전송"""
        try:
            status = await self.get_scheduler_status()
            await send_scheduler_update({
                "event": event,
                "timestamp": datetime.now().isoformat(),
                "status": status
            })
        except Exception as e:
            logger.warning(f"Failed to send scheduler update: {e}")

    async def _send_task_update(self, task: ScheduledTask, status: str, error: str = None):
        """WebSocket으로 태스크 업데이트 전송"""
        try:
            await send_scheduler_update({
                "event": "task_update",
                "task_id": task.task_id,
                "task_name": task.name,
                "status": status,
                "error": error,
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            logger.warning(f"Failed to send task update: {e}")

# 글로벌 스케줄러 인스턴스
trading_scheduler = TradingScheduler()