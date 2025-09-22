"""
Data simulator for WebSocket real-time data streaming
시뮬레이션된 실시간 주식 데이터 생성
"""

import asyncio
import logging
import random
from datetime import datetime, time
from typing import Dict, List

from app.api.websocket import send_price_update, send_buy_signal, send_session_status

logger = logging.getLogger(__name__)

class DataSimulator:
    def __init__(self):
        self.is_running = False
        self.stock_data: Dict[str, dict] = {}
        self.simulation_task: asyncio.Task = None

        # 샘플 주식 데이터 초기화
        self.initialize_sample_stocks()

    def initialize_sample_stocks(self):
        """샘플 주식 데이터 초기화"""
        sample_stocks = [
            {"code": "A005930", "name": "삼성전자", "base_price": 71500},
            {"code": "A000660", "name": "SK하이닉스", "base_price": 128000},
            {"code": "A035420", "name": "NAVER", "base_price": 185000},
            {"code": "A207940", "name": "삼성바이오로직스", "base_price": 890000},
            {"code": "A068270", "name": "셀트리온", "base_price": 185000},
            {"code": "A323410", "name": "카카오뱅크", "base_price": 55000},
            {"code": "A000270", "name": "기아", "base_price": 98000},
            {"code": "A051910", "name": "LG화학", "base_price": 420000},
            {"code": "A005380", "name": "현대차", "base_price": 240000},
            {"code": "A006400", "name": "삼성SDI", "base_price": 435000}
        ]

        for stock in sample_stocks:
            self.stock_data[stock["code"]] = {
                "name": stock["name"],
                "current_price": stock["base_price"],
                "base_price": stock["base_price"],
                "volume": random.randint(1000000, 10000000),
                "last_change": 0,
                "trend": random.choice([-1, 0, 1])  # -1: 하락, 0: 보합, 1: 상승
            }

    async def start_simulation(self):
        """시뮬레이션 시작"""
        if self.is_running:
            logger.warning("Data simulation is already running")
            return

        self.is_running = True
        logger.info("Starting data simulation")

        # 백그라운드 태스크 시작
        self.simulation_task = asyncio.create_task(self._simulation_loop())

    async def stop_simulation(self):
        """시뮬레이션 중지"""
        if not self.is_running:
            return

        self.is_running = False
        logger.info("Stopping data simulation")

        if self.simulation_task and not self.simulation_task.done():
            self.simulation_task.cancel()
            try:
                await self.simulation_task
            except asyncio.CancelledError:
                logger.info("Simulation task cancelled")

    async def _simulation_loop(self):
        """실시간 데이터 시뮬레이션 루프"""
        try:
            while self.is_running:
                current_time = datetime.now().time()

                # 장중 시간인지 확인 (09:00 - 15:30)
                is_market_hours = (
                    time(9, 0) <= current_time <= time(15, 30)
                )

                # 시간외 시간인지 확인 (16:00 - 17:40)
                is_after_hours = (
                    time(16, 0) <= current_time <= time(17, 40)
                )

                if is_market_hours or is_after_hours:
                    # 활발한 거래 시뮬레이션
                    await self._simulate_active_trading()
                else:
                    # 비활성 시간 - 낮은 빈도 업데이트
                    await self._simulate_inactive_period()

                # 업데이트 간격 (시장 상황에 따라 조정)
                if is_market_hours:
                    await asyncio.sleep(1)  # 1초마다 업데이트
                elif is_after_hours:
                    await asyncio.sleep(2)  # 2초마다 업데이트
                else:
                    await asyncio.sleep(10)  # 10초마다 업데이트

        except asyncio.CancelledError:
            logger.info("Simulation loop cancelled")
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}")
        finally:
            self.is_running = False

    async def _simulate_active_trading(self):
        """활발한 거래 시뮬레이션"""
        # 랜덤하게 몇 개 주식 선택하여 업데이트
        selected_stocks = random.sample(
            list(self.stock_data.keys()),
            k=random.randint(3, 7)
        )

        for stock_code in selected_stocks:
            await self._update_stock_price(stock_code, volatility=0.02)

        # 매수 신호 시뮬레이션 (낮은 확률)
        if random.random() < 0.05:  # 5% 확률
            await self._simulate_buy_signal()

    async def _simulate_inactive_period(self):
        """비활성 시간 시뮬레이션"""
        # 적은 수의 주식만 업데이트
        selected_stocks = random.sample(
            list(self.stock_data.keys()),
            k=random.randint(1, 3)
        )

        for stock_code in selected_stocks:
            await self._update_stock_price(stock_code, volatility=0.005)

    async def _update_stock_price(self, stock_code: str, volatility: float = 0.01):
        """주식 가격 업데이트"""
        stock = self.stock_data[stock_code]

        # 가격 변동 계산
        base_change = random.uniform(-volatility, volatility)
        trend_influence = stock["trend"] * 0.003  # 트렌드 영향

        change_percent = base_change + trend_influence
        price_change = stock["current_price"] * change_percent
        new_price = stock["current_price"] + price_change

        # 가격 범위 제한 (base_price의 ±10%)
        min_price = stock["base_price"] * 0.9
        max_price = stock["base_price"] * 1.1
        new_price = max(min_price, min(max_price, new_price))

        # 거래량 업데이트
        volume_change = random.randint(-50000, 100000)
        new_volume = max(100000, stock["volume"] + volume_change)

        # 데이터 업데이트
        old_price = stock["current_price"]
        stock["current_price"] = round(new_price)
        stock["volume"] = new_volume
        stock["last_change"] = stock["current_price"] - old_price

        # 트렌드 조정 (확률적)
        if random.random() < 0.1:  # 10% 확률로 트렌드 변경
            stock["trend"] = random.choice([-1, 0, 1])

        # 가격 변동률 계산
        change_percent = ((stock["current_price"] - old_price) / old_price) * 100 if old_price > 0 else 0

        # WebSocket으로 가격 업데이트 전송
        await send_price_update(
            symbol=stock_code,
            price=stock["current_price"],
            change=stock["last_change"],
            change_percent=change_percent,
            volume=stock["volume"]
        )

        # 신호 처리기에 가격 업데이트 전달 (자동 매수 신호 생성을 위해)
        try:
            from ..core.trading.signal_processor import signal_processor
            await signal_processor.process_price_update(
                symbol=stock_code,
                stock_name=stock["name"],
                current_price=stock["current_price"],
                change_percent=change_percent,
                volume=stock["volume"],
                threshold_percent=2.0  # 2% 이상 상승 시 신호 생성
            )
        except Exception as e:
            logger.warning(f"Error processing price update for signal: {e}")

    async def _simulate_buy_signal(self):
        """매수 신호 시뮬레이션"""
        # 랜덤 주식 선택
        stock_code = random.choice(list(self.stock_data.keys()))
        stock = self.stock_data[stock_code]

        # 매수 신호 조건 시뮬레이션
        change_percent = ((stock["current_price"] - stock["base_price"]) / stock["base_price"]) * 100

        if change_percent > 1.5:  # 1.5% 이상 상승 시 매수 신호
            quantity = random.randint(10, 100) * 10  # 10주 단위

            await send_buy_signal(
                symbol=stock_code,
                price=stock["current_price"],
                quantity=quantity,
                reason=f"{change_percent:.2f}% 상승으로 인한 모멘텀 매수",
                order_id=f"SIM_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )

    async def send_session_update(self):
        """세션 상태 업데이트 전송"""
        current_time = datetime.now().time()

        # 세션 관리자가 실행 중인지 확인
        try:
            from ..core.monitoring.session_manager import session_manager
            if session_manager.is_running:
                # 세션 관리자가 실행 중이면 그것의 상태를 전송
                session_status = await session_manager.get_session_status()
                await send_session_status(
                    day="monitoring",
                    phase=session_status.current_phase.value,
                    status="active",
                    next_action="monitoring_active",
                    next_action_time=session_status.next_phase_time.strftime('%H:%M') if session_status.next_phase_time else None
                )
                return
        except Exception as e:
            logger.warning(f"Failed to get session manager status: {e}")

        # 기본 세션 상태 로직
        if time(9, 0) <= current_time <= time(15, 30):
            day = "day2"
            phase = "trading"
            status = "active"
            next_action = "position_monitoring"
        elif time(16, 0) <= current_time <= time(17, 40):
            day = "day1"
            phase = "after_hours_monitoring"
            status = "monitoring"
            next_action = "buy_execution"
        else:
            day = "waiting"
            phase = "closed"
            status = "waiting"
            next_action = "market_open"

        await send_session_status(
            day=day,
            phase=phase,
            status=status,
            next_action=next_action,
            next_action_time=self._get_next_action_time(current_time)
        )

    def _get_next_action_time(self, current_time: time) -> str:
        """다음 액션 시간 계산"""
        if current_time < time(9, 0):
            return "09:00"
        elif current_time < time(16, 0):
            return "16:00"
        elif current_time < time(17, 40):
            return self._get_next_monitoring_time(current_time)
        else:
            return "09:00 (다음 날)"

    def _get_next_monitoring_time(self, current_time: time) -> str:
        """다음 모니터링 시간 계산"""
        monitoring_times = [time(16, 0), time(16, 30), time(17, 0), time(17, 30)]

        for t in monitoring_times:
            if current_time < t:
                return t.strftime('%H:%M')

        return "17:30"

    def get_current_prices(self) -> Dict[str, dict]:
        """현재 가격 정보 반환"""
        return self.stock_data.copy()

# 글로벌 시뮬레이터 인스턴스
data_simulator = DataSimulator()