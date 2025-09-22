"""
After-hours Monitoring API Endpoints
시간외 거래 모니터링 API 엔드포인트
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from datetime import datetime

from ...core.monitoring.session_manager import session_manager, SessionPhase, MonitoringTarget, SessionStatus
from ...core.monitoring.threshold_adjuster import threshold_adjuster, AdjustmentStrategy, MarketCondition
from ...services.kis_api import KISAPIClient

router = APIRouter()


# Request Models
class StartMonitoringRequest(BaseModel):
    """모니터링 시작 요청"""
    targets: List[Dict[str, Any]] = Field(description="모니터링 대상 주식 목록")
    auto_start: bool = Field(default=True, description="자동 시작 여부")


class AdjustThresholdRequest(BaseModel):
    """임계값 조정 요청"""
    symbol: str = Field(min_length=1, max_length=10)
    new_threshold: float = Field(gt=0, le=10)
    strategy: str = Field(default="manual", pattern="^(manual|conservative|balanced|aggressive|time_based)$")


class ThresholdAdjustmentRequest(BaseModel):
    """임계값 자동 조정 요청"""
    strategy: str = Field(pattern="^(conservative|balanced|aggressive|time_based)$")
    apply_all: bool = Field(default=False, description="모든 종목에 적용 여부")
    target_symbols: Optional[List[str]] = Field(default=None, description="특정 종목만 적용")


# Response Models
class MonitoringStatusResponse(BaseModel):
    """모니터링 상태 응답"""
    is_running: bool
    current_phase: str
    phase_start_time: str
    next_phase_time: Optional[str]
    monitoring_targets: List[Dict[str, Any]]
    total_targets: int
    triggered_count: int
    remaining_time_seconds: int


class ThresholdAdjustmentResponse(BaseModel):
    """임계값 조정 응답"""
    symbol: str
    old_threshold: float
    new_threshold: float
    adjustment_reason: str
    confidence_score: float
    strategy: str


# === Monitoring Session Management APIs ===

@router.post("/monitoring/start")
async def start_monitoring_session(request: StartMonitoringRequest):
    """시간외 모니터링 세션 시작"""
    try:
        # 입력 검증
        if not request.targets:
            raise HTTPException(status_code=400, detail="No monitoring targets provided")

        # 필수 필드 검증
        for target in request.targets:
            required_fields = ["symbol", "stock_name", "entry_price"]
            for field in required_fields:
                if field not in target:
                    raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

        # 세션 시작
        success = await session_manager.start_session(request.targets)

        if not success:
            raise HTTPException(status_code=400, detail="Failed to start monitoring session")

        return {
            "success": True,
            "message": f"Monitoring session started with {len(request.targets)} targets",
            "targets_count": len(request.targets)
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/monitoring/stop")
async def stop_monitoring_session():
    """시간외 모니터링 세션 중지"""
    try:
        await session_manager.stop_session()

        return {
            "success": True,
            "message": "Monitoring session stopped"
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/monitoring/status")
async def get_monitoring_status():
    """모니터링 상태 조회"""
    try:
        status = await session_manager.get_session_status()

        return {
            "success": True,
            "status": {
                "is_running": session_manager.is_running,
                "current_phase": status.current_phase.value,
                "phase_start_time": status.phase_start_time.isoformat(),
                "next_phase_time": status.next_phase_time.strftime('%H:%M') if status.next_phase_time else None,
                "monitoring_targets": [
                    {
                        "symbol": target.symbol,
                        "stock_name": target.stock_name,
                        "entry_price": target.entry_price,
                        "current_price": target.current_price,
                        "change_percent": target.change_percent,
                        "volume": target.volume,
                        "buy_threshold": target.buy_threshold,
                        "is_triggered": target.is_triggered,
                        "trigger_time": target.trigger_time.isoformat() if target.trigger_time else None
                    } for target in status.monitoring_targets
                ],
                "total_targets": status.total_targets,
                "triggered_count": status.triggered_count,
                "remaining_time_seconds": int(status.remaining_time.total_seconds())
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monitoring/targets")
async def get_monitoring_targets():
    """모니터링 대상 목록 조회"""
    try:
        targets = []
        for symbol, target in session_manager.monitoring_targets.items():
            targets.append({
                "symbol": target.symbol,
                "stock_name": target.stock_name,
                "entry_price": target.entry_price,
                "current_price": target.current_price,
                "change_percent": target.change_percent,
                "volume": target.volume,
                "buy_threshold": target.buy_threshold,
                "is_triggered": target.is_triggered,
                "trigger_time": target.trigger_time.isoformat() if target.trigger_time else None
            })

        return {
            "success": True,
            "targets": targets,
            "count": len(targets)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === Threshold Management APIs ===

@router.post("/monitoring/adjust-threshold")
async def adjust_threshold(request: AdjustThresholdRequest):
    """특정 종목 임계값 조정"""
    try:
        success = await session_manager.adjust_threshold(
            symbol=request.symbol,
            new_threshold=request.new_threshold
        )

        if not success:
            raise HTTPException(status_code=404, detail=f"Target not found: {request.symbol}")

        return {
            "success": True,
            "message": f"Threshold adjusted for {request.symbol}",
            "symbol": request.symbol,
            "new_threshold": request.new_threshold,
            "strategy": request.strategy
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/monitoring/auto-adjust-thresholds")
async def auto_adjust_thresholds(request: ThresholdAdjustmentRequest):
    """자동 임계값 조정"""
    try:
        # 현재 시장 상황 분석
        kis_client = KISAPIClient()
        market_data = await kis_client.get_market_overview()

        if not market_data:
            market_data = []

        market_condition = threshold_adjuster.get_market_condition_analysis(market_data)

        # 조정 대상 종목 결정
        if request.apply_all:
            target_symbols = list(session_manager.monitoring_targets.keys())
        elif request.target_symbols:
            target_symbols = request.target_symbols
        else:
            raise HTTPException(status_code=400, detail="No target symbols specified")

        # 조정 결과 저장
        adjustment_results = []

        for symbol in target_symbols:
            if symbol not in session_manager.monitoring_targets:
                continue

            target = session_manager.monitoring_targets[symbol]
            current_threshold = target.buy_threshold

            # 조정 계산
            strategy = AdjustmentStrategy(request.strategy)
            recommendation = threshold_adjuster.calculate_adjustment(
                current_threshold=current_threshold,
                market_condition=market_condition,
                current_time=datetime.now(),
                strategy=strategy
            )

            # 임계값 적용
            await session_manager.adjust_threshold(symbol, recommendation.recommended_threshold)

            adjustment_results.append({
                "symbol": symbol,
                "old_threshold": current_threshold,
                "new_threshold": recommendation.recommended_threshold,
                "adjustment_reason": recommendation.adjustment_reason,
                "confidence_score": recommendation.confidence_score,
                "strategy": strategy.value
            })

        return {
            "success": True,
            "message": f"Auto-adjusted thresholds for {len(adjustment_results)} targets",
            "strategy": request.strategy,
            "market_condition": {
                "total_rise_count": market_condition.total_rise_count,
                "total_stock_count": market_condition.total_stock_count,
                "average_change": market_condition.average_change,
                "volatility_index": market_condition.volatility_index,
                "volume_ratio": market_condition.volume_ratio
            },
            "adjustments": adjustment_results
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/monitoring/suggested-strategies")
async def get_suggested_strategies():
    """권장 조정 전략 조회"""
    try:
        # 현재 시장 상황 분석
        kis_client = KISAPIClient()
        market_data = await kis_client.get_market_overview()

        if not market_data:
            market_data = []

        market_condition = threshold_adjuster.get_market_condition_analysis(market_data)
        strategies = threshold_adjuster.get_suggested_strategies(market_condition)

        return {
            "success": True,
            "market_condition": {
                "total_rise_count": market_condition.total_rise_count,
                "total_stock_count": market_condition.total_stock_count,
                "average_change": market_condition.average_change,
                "volatility_index": market_condition.volatility_index,
                "volume_ratio": market_condition.volume_ratio
            },
            "suggested_strategies": [
                {
                    "strategy": strategy.value,
                    "description": description
                } for strategy, description in strategies
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monitoring/threshold-preview")
async def preview_threshold_adjustment(
    strategy: str,
    symbol: Optional[str] = None
):
    """임계값 조정 미리보기"""
    try:
        if strategy not in ["conservative", "balanced", "aggressive", "time_based"]:
            raise HTTPException(status_code=400, detail="Invalid strategy")

        # 현재 시장 상황 분석
        kis_client = KISAPIClient()
        market_data = await kis_client.get_market_overview()

        if not market_data:
            market_data = []

        market_condition = threshold_adjuster.get_market_condition_analysis(market_data)

        # 미리보기 계산
        previews = []

        if symbol:
            # 특정 종목만
            if symbol in session_manager.monitoring_targets:
                target = session_manager.monitoring_targets[symbol]
                recommendation = threshold_adjuster.calculate_adjustment(
                    current_threshold=target.buy_threshold,
                    market_condition=market_condition,
                    current_time=datetime.now(),
                    strategy=AdjustmentStrategy(strategy)
                )
                previews.append({
                    "symbol": symbol,
                    "stock_name": target.stock_name,
                    "current_threshold": target.buy_threshold,
                    "recommended_threshold": recommendation.recommended_threshold,
                    "adjustment_reason": recommendation.adjustment_reason,
                    "confidence_score": recommendation.confidence_score
                })
        else:
            # 모든 종목
            for symbol, target in session_manager.monitoring_targets.items():
                recommendation = threshold_adjuster.calculate_adjustment(
                    current_threshold=target.buy_threshold,
                    market_condition=market_condition,
                    current_time=datetime.now(),
                    strategy=AdjustmentStrategy(strategy)
                )
                previews.append({
                    "symbol": symbol,
                    "stock_name": target.stock_name,
                    "current_threshold": target.buy_threshold,
                    "recommended_threshold": recommendation.recommended_threshold,
                    "adjustment_reason": recommendation.adjustment_reason,
                    "confidence_score": recommendation.confidence_score
                })

        return {
            "success": True,
            "strategy": strategy,
            "market_condition": {
                "total_rise_count": market_condition.total_rise_count,
                "total_stock_count": market_condition.total_stock_count,
                "average_change": market_condition.average_change,
                "volatility_index": market_condition.volatility_index
            },
            "previews": previews
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# === Session History and Analytics ===

@router.get("/monitoring/session-history")
async def get_session_history():
    """세션 기록 조회"""
    try:
        # 현재는 단순한 현재 세션 정보만 반환
        # 향후 데이터베이스나 파일 기반 기록 시스템 구현 가능

        current_status = await session_manager.get_session_status()

        return {
            "success": True,
            "current_session": {
                "phase": current_status.current_phase.value,
                "start_time": current_status.phase_start_time.isoformat(),
                "total_targets": current_status.total_targets,
                "triggered_count": current_status.triggered_count,
                "is_running": session_manager.is_running
            },
            "history": []  # 향후 구현
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monitoring/performance-stats")
async def get_monitoring_performance():
    """모니터링 성과 통계"""
    try:
        targets = list(session_manager.monitoring_targets.values())
        total_targets = len(targets)
        triggered_count = sum(1 for target in targets if target.is_triggered)

        if total_targets == 0:
            success_rate = 0.0
            avg_change = 0.0
        else:
            success_rate = (triggered_count / total_targets) * 100
            avg_change = sum(target.change_percent for target in targets) / total_targets

        return {
            "success": True,
            "stats": {
                "total_targets": total_targets,
                "triggered_count": triggered_count,
                "success_rate": round(success_rate, 2),
                "average_change_percent": round(avg_change, 2),
                "session_duration_minutes": int((datetime.now() - session_manager._get_phase_start_time()).total_seconds() / 60),
                "current_phase": session_manager.current_phase.value
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))