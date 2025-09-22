"""
Automated Buy Order Execution System
자동 매수 주문 실행 시스템
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum

from ...services.kis_api import KISAPIClient
from ...api.websocket import send_order_update, send_buy_signal
from ...schemas.trading import BuyCondition

logger = logging.getLogger(__name__)


class OrderStatus(str, Enum):
    """주문 상태"""
    PENDING = "pending"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class OrderType(str, Enum):
    """주문 유형"""
    MARKET = "01"  # 시장가
    LIMIT = "00"   # 지정가


class BuyOrder:
    """매수 주문 정보"""
    def __init__(
        self,
        order_id: str,
        symbol: str,
        stock_name: str,
        target_price: float,
        quantity: int,
        order_type: OrderType = OrderType.MARKET,
        auto_execute: bool = True,
        max_price_deviation: float = 2.0  # 최대 가격 허용 편차 (%)
    ):
        self.order_id = order_id
        self.symbol = symbol
        self.stock_name = stock_name
        self.target_price = target_price
        self.quantity = quantity
        self.order_type = order_type
        self.auto_execute = auto_execute
        self.max_price_deviation = max_price_deviation

        # 상태 관리
        self.status = OrderStatus.PENDING
        self.created_at = datetime.now()
        self.executed_at: Optional[datetime] = None
        self.kis_order_id: Optional[str] = None
        self.actual_price: Optional[float] = None
        self.error_message: Optional[str] = None

        # 재시도 로직
        self.retry_count = 0
        self.max_retries = 3
        self.retry_delay = 1.0  # seconds


class OrderExecutor:
    """자동 매수 주문 실행 시스템"""

    def __init__(self):
        self.kis_client = KISAPIClient()
        self.pending_orders: Dict[str, BuyOrder] = {}
        self.completed_orders: Dict[str, BuyOrder] = {}
        self.is_running = False
        self.execution_task: Optional[asyncio.Task] = None

        # 설정
        self.execution_interval = 2.0  # 주문 처리 간격 (초)
        self.price_check_tolerance = 5.0  # 가격 확인 허용 편차 (%)

    async def start_executor(self):
        """주문 실행자 시작"""
        if self.is_running:
            logger.warning("Order executor is already running")
            return

        self.is_running = True
        logger.info("🚀 Starting automated order executor")

        # KIS API 클라이언트 시작
        try:
            await self.kis_client.start()
            logger.info("KIS API client initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize KIS API client: {e}")

        # 백그라운드 주문 실행 태스크 시작
        self.execution_task = asyncio.create_task(self._execution_loop())

    async def stop_executor(self):
        """주문 실행자 중지"""
        if not self.is_running:
            return

        self.is_running = False
        logger.info("⏹️ Stopping automated order executor")

        if self.execution_task and not self.execution_task.done():
            self.execution_task.cancel()
            try:
                await self.execution_task
            except asyncio.CancelledError:
                logger.info("Order executor task cancelled")

        # KIS API 클라이언트 종료
        try:
            await self.kis_client.close()
            logger.info("KIS API client closed successfully")
        except Exception as e:
            logger.warning(f"Error closing KIS API client: {e}")

    async def add_buy_order(
        self,
        symbol: str,
        stock_name: str,
        target_price: float,
        investment_amount: float,
        auto_execute: bool = True,
        order_type: OrderType = OrderType.MARKET
    ) -> str:
        """매수 주문 추가"""
        # 주문 수량 계산
        quantity = int(investment_amount / target_price)
        if quantity <= 0:
            raise ValueError(f"Invalid order quantity: {quantity}")

        # 주문 ID 생성
        order_id = f"BUY_{symbol}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # 주문 객체 생성
        order = BuyOrder(
            order_id=order_id,
            symbol=symbol,
            stock_name=stock_name,
            target_price=target_price,
            quantity=quantity,
            order_type=order_type,
            auto_execute=auto_execute
        )

        # 주문 대기열에 추가
        self.pending_orders[order_id] = order

        logger.info(f"📝 Buy order added: {symbol} ({stock_name}) - {quantity} shares at ₩{target_price:,.0f}")

        # WebSocket으로 주문 상태 전송
        await self._send_order_update(order)

        return order_id

    async def cancel_order(self, order_id: str) -> bool:
        """주문 취소"""
        if order_id not in self.pending_orders:
            logger.warning(f"Order not found for cancellation: {order_id}")
            return False

        order = self.pending_orders[order_id]

        if order.status == OrderStatus.EXECUTING:
            logger.warning(f"Cannot cancel order {order_id} - already executing")
            return False

        order.status = OrderStatus.CANCELLED
        self.completed_orders[order_id] = self.pending_orders.pop(order_id)

        logger.info(f"❌ Order cancelled: {order_id}")
        await self._send_order_update(order)

        return True

    async def get_order_status(self, order_id: str) -> Optional[Dict[str, Any]]:
        """주문 상태 조회"""
        order = self.pending_orders.get(order_id) or self.completed_orders.get(order_id)
        if not order:
            return None

        return {
            "order_id": order.order_id,
            "symbol": order.symbol,
            "stock_name": order.stock_name,
            "status": order.status.value,
            "target_price": order.target_price,
            "quantity": order.quantity,
            "actual_price": order.actual_price,
            "created_at": order.created_at.isoformat(),
            "executed_at": order.executed_at.isoformat() if order.executed_at else None,
            "kis_order_id": order.kis_order_id,
            "error_message": order.error_message
        }

    async def get_all_orders(self) -> Dict[str, List[Dict[str, Any]]]:
        """모든 주문 상태 조회"""
        pending = []
        completed = []

        for order in self.pending_orders.values():
            order_data = await self.get_order_status(order.order_id)
            if order_data:
                pending.append(order_data)

        for order in self.completed_orders.values():
            order_data = await self.get_order_status(order.order_id)
            if order_data:
                completed.append(order_data)

        return {
            "pending": pending,
            "completed": completed
        }

    async def _execution_loop(self):
        """주문 실행 루프"""
        try:
            while self.is_running:
                if self.pending_orders:
                    await self._process_pending_orders()

                # 다음 실행까지 대기
                await asyncio.sleep(self.execution_interval)

        except asyncio.CancelledError:
            logger.info("Order execution loop cancelled")
        except Exception as e:
            logger.error(f"Error in order execution loop: {e}")
        finally:
            self.is_running = False

    async def _process_pending_orders(self):
        """대기 중인 주문 처리"""
        orders_to_process = list(self.pending_orders.values())

        for order in orders_to_process:
            if order.status != OrderStatus.PENDING:
                continue

            if not order.auto_execute:
                continue

            try:
                await self._execute_order(order)
            except Exception as e:
                logger.error(f"Error executing order {order.order_id}: {e}")
                await self._handle_order_error(order, str(e))

    async def _execute_order(self, order: BuyOrder):
        """개별 주문 실행"""
        logger.info(f"🔄 Executing order: {order.order_id}")

        # 주문 상태 변경
        order.status = OrderStatus.EXECUTING
        await self._send_order_update(order)

        try:
            # KIS API를 통한 매수 주문 실행
            order_price = int(order.target_price) if order.order_type == OrderType.LIMIT else 0

            response = await self.kis_client.place_buy_order(
                stock_code=order.symbol,
                quantity=order.quantity,
                price=order_price,
                order_type=order.order_type.value
            )

            # 응답 처리
            if self._is_order_successful(response):
                order.status = OrderStatus.COMPLETED
                order.executed_at = datetime.now()
                order.kis_order_id = response.get("rt_cd")  # KIS 주문 번호
                order.actual_price = order.target_price  # 실제 체결가는 별도 조회 필요

                logger.info(f"✅ Order completed: {order.order_id} - KIS Order ID: {order.kis_order_id}")

                # 완료된 주문을 완료 목록으로 이동
                self.completed_orders[order.order_id] = self.pending_orders.pop(order.order_id)

            else:
                # 주문 실패 처리
                error_msg = response.get("msg1", "Unknown error")
                await self._handle_order_error(order, error_msg)

        except Exception as e:
            await self._handle_order_error(order, str(e))

        # 주문 상태 업데이트 전송
        await self._send_order_update(order)

    async def _handle_order_error(self, order: BuyOrder, error_message: str):
        """주문 에러 처리"""
        order.retry_count += 1
        order.error_message = error_message

        if order.retry_count < order.max_retries:
            # 재시도 대기
            order.status = OrderStatus.PENDING
            logger.warning(f"⚠️ Order {order.order_id} failed, retrying ({order.retry_count}/{order.max_retries}): {error_message}")
            await asyncio.sleep(order.retry_delay * order.retry_count)
        else:
            # 최대 재시도 횟수 초과
            order.status = OrderStatus.FAILED
            logger.error(f"❌ Order {order.order_id} failed permanently: {error_message}")

            # 실패한 주문을 완료 목록으로 이동
            self.completed_orders[order.order_id] = self.pending_orders.pop(order.order_id)

    def _is_order_successful(self, response: Dict[str, Any]) -> bool:
        """KIS API 응답에서 주문 성공 여부 판단"""
        # KIS API 응답 구조에 따라 성공 여부 판단
        rt_cd = response.get("rt_cd", "")
        return rt_cd == "0"  # 성공 시 "0" 반환

    async def _send_order_update(self, order: BuyOrder):
        """WebSocket으로 주문 상태 업데이트 전송"""
        try:
            order_data = await self.get_order_status(order.order_id)
            if order_data:
                await send_order_update(
                    order_id=order.order_id,
                    symbol=order.symbol,
                    status=order.status.value,
                    data=order_data
                )
        except Exception as e:
            logger.warning(f"Failed to send order update via WebSocket: {e}")


# 글로벌 주문 실행자 인스턴스
order_executor = OrderExecutor()