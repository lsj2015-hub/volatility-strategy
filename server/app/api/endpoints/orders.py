"""
Order Management API Endpoints
주문 관리 API 엔드포인트
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from ...core.trading.order_executor import order_executor, OrderType
from ...core.trading.signal_processor import signal_processor

router = APIRouter()


# Request Models
class CreateBuyOrderRequest(BaseModel):
    """매수 주문 생성 요청"""
    symbol: str = Field(min_length=1, max_length=10)
    stock_name: str = Field(min_length=1, max_length=100)
    target_price: float = Field(gt=0)
    investment_amount: float = Field(gt=0)
    auto_execute: bool = True
    order_type: str = Field(default="MARKET", pattern="^(MARKET|LIMIT)$")


class ConfirmBuySignalRequest(BaseModel):
    """매수 신호 확인 요청"""
    signal_id: str
    investment_amount: Optional[float] = Field(default=None, gt=0)


class RejectBuySignalRequest(BaseModel):
    """매수 신호 거부 요청"""
    signal_id: str
    reason: str = "User rejected"


class UpdateOrderExecutorRequest(BaseModel):
    """주문 실행자 설정 변경 요청"""
    auto_execution_enabled: bool = True
    default_investment_amount: float = Field(gt=0, default=1000000)
    max_pending_signals: int = Field(ge=1, le=50, default=10)


# === Order Management APIs ===

@router.post("/orders/buy")
async def create_buy_order(request: CreateBuyOrderRequest):
    """수동 매수 주문 생성"""
    try:
        order_type = OrderType.MARKET if request.order_type == "MARKET" else OrderType.LIMIT

        order_id = await order_executor.add_buy_order(
            symbol=request.symbol,
            stock_name=request.stock_name,
            target_price=request.target_price,
            investment_amount=request.investment_amount,
            auto_execute=request.auto_execute,
            order_type=order_type
        )

        return {
            "success": True,
            "order_id": order_id,
            "message": f"Buy order created for {request.symbol}"
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/orders/{order_id}")
async def cancel_order(order_id: str):
    """주문 취소"""
    success = await order_executor.cancel_order(order_id)

    if not success:
        raise HTTPException(status_code=404, detail="Order not found or cannot be cancelled")

    return {
        "success": True,
        "message": f"Order {order_id} cancelled successfully"
    }


@router.get("/orders/{order_id}")
async def get_order_status(order_id: str):
    """주문 상태 조회"""
    order_data = await order_executor.get_order_status(order_id)

    if not order_data:
        raise HTTPException(status_code=404, detail="Order not found")

    return {
        "success": True,
        "order": order_data
    }


@router.get("/orders")
async def get_all_orders():
    """모든 주문 조회"""
    orders = await order_executor.get_all_orders()

    return {
        "success": True,
        "orders": orders
    }


# === Buy Signal Management APIs ===

@router.get("/signals/active")
async def get_active_signals():
    """활성 매수 신호 조회"""
    signals = await signal_processor.get_active_signals()

    return {
        "success": True,
        "signals": signals,
        "count": len(signals)
    }


@router.post("/signals/confirm")
async def confirm_buy_signal(request: ConfirmBuySignalRequest):
    """매수 신호 확인"""
    success = await signal_processor.confirm_signal(
        signal_id=request.signal_id,
        investment_amount=request.investment_amount
    )

    if not success:
        raise HTTPException(status_code=404, detail="Signal not found or already processed")

    return {
        "success": True,
        "message": f"Buy signal {request.signal_id} confirmed"
    }


@router.post("/signals/reject")
async def reject_buy_signal(request: RejectBuySignalRequest):
    """매수 신호 거부"""
    success = await signal_processor.reject_signal(
        signal_id=request.signal_id,
        reason=request.reason
    )

    if not success:
        raise HTTPException(status_code=404, detail="Signal not found")

    return {
        "success": True,
        "message": f"Buy signal {request.signal_id} rejected"
    }


# === System Control APIs ===

@router.post("/executor/start")
async def start_order_executor():
    """주문 실행자 시작"""
    await order_executor.start_executor()

    return {
        "success": True,
        "message": "Order executor started"
    }


@router.post("/executor/stop")
async def stop_order_executor():
    """주문 실행자 중지"""
    await order_executor.stop_executor()

    return {
        "success": True,
        "message": "Order executor stopped"
    }


@router.get("/executor/status")
async def get_executor_status():
    """주문 실행자 상태 조회"""
    return {
        "success": True,
        "status": {
            "is_running": order_executor.is_running,
            "pending_orders_count": len(order_executor.pending_orders),
            "completed_orders_count": len(order_executor.completed_orders),
            "execution_interval": order_executor.execution_interval
        }
    }


@router.put("/executor/settings")
async def update_executor_settings(request: UpdateOrderExecutorRequest):
    """주문 실행자 설정 변경"""
    try:
        # Signal processor 설정 업데이트
        signal_processor.auto_execution_enabled = request.auto_execution_enabled
        signal_processor.default_investment_amount = request.default_investment_amount
        signal_processor.max_pending_signals = request.max_pending_signals

        return {
            "success": True,
            "message": "Executor settings updated successfully",
            "settings": {
                "auto_execution_enabled": signal_processor.auto_execution_enabled,
                "default_investment_amount": signal_processor.default_investment_amount,
                "max_pending_signals": signal_processor.max_pending_signals
            }
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/executor/settings")
async def get_executor_settings():
    """주문 실행자 설정 조회"""
    return {
        "success": True,
        "settings": {
            "auto_execution_enabled": signal_processor.auto_execution_enabled,
            "default_investment_amount": signal_processor.default_investment_amount,
            "max_pending_signals": signal_processor.max_pending_signals,
            "signal_timeout": signal_processor.signal_timeout
        }
    }


# === Monitoring and Statistics ===

@router.get("/stats/summary")
async def get_trading_stats():
    """거래 통계 요약"""
    orders = await order_executor.get_all_orders()
    signals = await signal_processor.get_active_signals()

    # 통계 계산
    total_orders = len(orders["pending"]) + len(orders["completed"])
    completed_orders = [order for order in orders["completed"] if order["status"] == "completed"]
    failed_orders = [order for order in orders["completed"] if order["status"] == "failed"]

    total_invested = sum(
        order["target_price"] * order["quantity"]
        for order in completed_orders
    )

    return {
        "success": True,
        "stats": {
            "total_orders": total_orders,
            "completed_orders": len(completed_orders),
            "failed_orders": len(failed_orders),
            "pending_orders": len(orders["pending"]),
            "active_signals": len(signals),
            "total_invested": total_invested,
            "success_rate": len(completed_orders) / total_orders * 100 if total_orders > 0 else 0
        }
    }


@router.post("/signals/cleanup")
async def cleanup_expired_signals():
    """만료된 신호 정리"""
    await signal_processor.cleanup_expired_signals()

    return {
        "success": True,
        "message": "Expired signals cleaned up"
    }