"""
Trading API Endpoints
트레이딩 관련 API 엔드포인트
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, List, Optional, Any
import logging

from ...core.trading.trading_controller import trading_controller
from ...core.trading.order_executor import OrderType
from ...core.trading.position_manager import ExitReason
from ...schemas.trading import (
    BuyOrderRequest,
    BuyOrderResponse,
    SellOrderRequest,
    TradingStatusResponse,
    TradingSummaryResponse,
    BuySignalRequest,
    EmergencyStopRequest
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/system/start")
async def start_trading_system():
    """트레이딩 시스템 시작"""
    try:
        await trading_controller.start_trading_system()
        return {"status": "success", "message": "Trading system started"}
    except Exception as e:
        logger.error(f"Failed to start trading system: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/system/stop")
async def stop_trading_system():
    """트레이딩 시스템 중지"""
    try:
        await trading_controller.stop_trading_system()
        return {"status": "success", "message": "Trading system stopped"}
    except Exception as e:
        logger.error(f"Failed to stop trading system: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/system/status", response_model=TradingStatusResponse)
async def get_trading_status():
    """트레이딩 시스템 상태 조회"""
    try:
        summary = await trading_controller.get_trading_summary()
        return TradingStatusResponse(
            status="success",
            data=summary
        )
    except Exception as e:
        logger.error(f"Failed to get trading status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary", response_model=TradingSummaryResponse)
async def get_trading_summary():
    """트레이딩 요약 정보 조회"""
    try:
        summary = await trading_controller.get_trading_summary()
        return TradingSummaryResponse(
            status="success",
            data=summary
        )
    except Exception as e:
        logger.error(f"Failed to get trading summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/orders/buy", response_model=BuyOrderResponse)
async def create_buy_order(request: BuyOrderRequest):
    """매수 주문 생성"""
    try:
        order_id = await trading_controller.execute_manual_buy(
            symbol=request.symbol,
            stock_name=request.stock_name,
            target_price=request.target_price,
            investment_amount=request.investment_amount
        )

        return BuyOrderResponse(
            status="success",
            order_id=order_id,
            message=f"Buy order created for {request.symbol}"
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create buy order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/orders/sell")
async def create_sell_order(request: SellOrderRequest):
    """매도 주문 생성"""
    try:
        result = await trading_controller.execute_manual_sell(request.position_id)

        if result:
            return {
                "status": "success",
                "message": f"Sell order created for position {request.position_id}"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to create sell order")

    except Exception as e:
        logger.error(f"Failed to create sell order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders")
async def get_all_orders():
    """모든 주문 조회"""
    try:
        orders = await trading_controller.order_executor.get_all_orders()
        return {
            "status": "success",
            "data": orders
        }
    except Exception as e:
        logger.error(f"Failed to get orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders/{order_id}")
async def get_order_status(order_id: str):
    """특정 주문 상태 조회"""
    try:
        order = await trading_controller.order_executor.get_order_status(order_id)
        if order:
            return {
                "status": "success",
                "data": order
            }
        else:
            raise HTTPException(status_code=404, detail="Order not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get order status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/orders/{order_id}")
async def cancel_order(order_id: str):
    """주문 취소"""
    try:
        result = await trading_controller.order_executor.cancel_order(order_id)
        if result:
            return {
                "status": "success",
                "message": f"Order {order_id} cancelled"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to cancel order")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions")
async def get_all_positions():
    """모든 포지션 조회"""
    try:
        positions = await trading_controller.position_manager.get_all_positions()
        return {
            "status": "success",
            "data": positions
        }
    except Exception as e:
        logger.error(f"Failed to get positions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions/summary")
async def get_position_summary():
    """포지션 요약 정보"""
    try:
        summary = await trading_controller.position_manager.get_position_summary()
        return {
            "status": "success",
            "data": summary
        }
    except Exception as e:
        logger.error(f"Failed to get position summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/positions/{position_id}")
async def close_position(position_id: str, reason: ExitReason = ExitReason.MANUAL):
    """포지션 종료"""
    try:
        result = await trading_controller.position_manager.close_position(position_id, reason)
        if result:
            return {
                "status": "success",
                "message": f"Position {position_id} closed"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to close position")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to close position: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/signals")
async def get_active_signals():
    """활성 매수 신호 조회"""
    try:
        signals = await trading_controller.signal_processor.get_active_signals()
        return {
            "status": "success",
            "data": signals
        }
    except Exception as e:
        logger.error(f"Failed to get active signals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/signals/process")
async def process_buy_signal(request: BuySignalRequest):
    """매수 신호 처리"""
    try:
        signal_id = await trading_controller.process_buy_signal(
            symbol=request.symbol,
            stock_name=request.stock_name,
            current_price=request.current_price,
            change_percent=request.change_percent,
            volume=request.volume,
            investment_amount=request.investment_amount
        )

        if signal_id:
            return {
                "status": "success",
                "signal_id": signal_id,
                "message": f"Buy signal processed for {request.symbol}"
            }
        else:
            return {
                "status": "ignored",
                "message": "Signal conditions not met or limits reached"
            }

    except Exception as e:
        logger.error(f"Failed to process buy signal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/signals/{signal_id}/confirm")
async def confirm_buy_signal(signal_id: str, investment_amount: Optional[float] = None):
    """매수 신호 확인"""
    try:
        result = await trading_controller.signal_processor.confirm_signal(
            signal_id=signal_id,
            investment_amount=investment_amount
        )

        if result:
            return {
                "status": "success",
                "message": f"Signal {signal_id} confirmed and order placed"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to confirm signal")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to confirm signal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/signals/{signal_id}/reject")
async def reject_buy_signal(signal_id: str, reason: str = "User rejected"):
    """매수 신호 거부"""
    try:
        result = await trading_controller.signal_processor.reject_signal(
            signal_id=signal_id,
            reason=reason
        )

        if result:
            return {
                "status": "success",
                "message": f"Signal {signal_id} rejected"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to reject signal")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reject signal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exit-strategy/status")
async def get_exit_strategy_status():
    """매도 전략 상태 조회"""
    try:
        status = await trading_controller.exit_strategy.get_strategy_status()
        return {
            "status": "success",
            "data": status
        }
    except Exception as e:
        logger.error(f"Failed to get exit strategy status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/exit-strategy/evaluate")
async def evaluate_exit_conditions():
    """매도 조건 평가"""
    try:
        recommendations = await trading_controller.exit_strategy.evaluate_exit_conditions()
        return {
            "status": "success",
            "data": recommendations
        }
    except Exception as e:
        logger.error(f"Failed to evaluate exit conditions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/emergency-stop")
async def emergency_stop(request: EmergencyStopRequest):
    """비상 정지"""
    try:
        await trading_controller.emergency_stop(request.reason)
        return {
            "status": "success",
            "message": f"Emergency stop executed: {request.reason}"
        }
    except Exception as e:
        logger.error(f"Failed to execute emergency stop: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/positions/force-liquidate")
async def force_liquidate_all():
    """모든 포지션 강제 청산"""
    try:
        await trading_controller.position_manager.force_liquidate_all()
        return {
            "status": "success",
            "message": "All positions force liquidated"
        }
    except Exception as e:
        logger.error(f"Failed to force liquidate positions: {e}")
        raise HTTPException(status_code=500, detail=str(e))