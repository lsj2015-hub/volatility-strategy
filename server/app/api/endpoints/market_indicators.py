"""
Market Indicators API Endpoints
시장 지수 및 지표 관련 API 엔드포인트
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
import structlog

from ...services.kis_api import get_kis_client
from ...schemas.market import MarketIndicesResponse, IndexData
from ...core.market_indicators import MarketDataCollector, MarketIndicatorCalculator
from ...utils.data_persistence import load_json_data

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/market-indicators", tags=["market-indicators"])


@router.get("/indices", response_model=MarketIndicesResponse)
async def get_market_indices() -> MarketIndicesResponse:
    """
    KOSPI/KOSDAQ 시장 지수 실시간 데이터 조회

    Returns:
        MarketIndicesResponse: KOSPI와 KOSDAQ 지수 데이터
    """
    try:
        logger.info("Fetching market indices (KOSPI/KOSDAQ)")

        kis_client = await get_kis_client()
        indices_data = await kis_client.get_market_indices()

        if indices_data.get("error"):
            logger.error(f"KIS API error: {indices_data['error']}")
            raise HTTPException(
                status_code=503,
                detail=f"Failed to fetch market indices: {indices_data['error']}"
            )

        # 응답 데이터 구조화
        kospi_data = indices_data.get("kospi")
        kosdaq_data = indices_data.get("kosdaq")

        response = MarketIndicesResponse(
            kospi=IndexData(**kospi_data) if kospi_data else None,
            kosdaq=IndexData(**kosdaq_data) if kosdaq_data else None,
            timestamp=indices_data.get("timestamp"),
            success=True,
            error=None
        )

        logger.info(
            "Market indices fetched successfully",
            kospi_price=kospi_data.get("current_price") if kospi_data else None,
            kosdaq_price=kosdaq_data.get("current_price") if kosdaq_data else None
        )

        return response

    except Exception as e:
        logger.error(f"Failed to fetch market indices: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/indices/{index_code}")
async def get_single_index(index_code: str) -> Dict[str, Any]:
    """
    개별 지수 데이터 조회

    Args:
        index_code: 지수 코드 (0001: KOSPI, 1001: KOSDAQ, 2001: KOSPI200)

    Returns:
        Dict: 개별 지수 데이터
    """
    try:
        # 유효한 지수 코드 검증
        valid_codes = ["0001", "1001", "2001"]
        if index_code not in valid_codes:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid index code. Valid codes: {valid_codes}"
            )

        logger.info(f"Fetching index data for code: {index_code}")

        kis_client = await get_kis_client()
        index_data = await kis_client.get_index_price(index_code)

        if index_data is None:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for index code: {index_code}"
            )

        logger.info(
            f"Index data fetched successfully for {index_code}",
            index_name=index_data.get("index_name"),
            current_price=index_data.get("current_price")
        )

        return {
            "data": index_data,
            "timestamp": index_data.get("timestamp"),
            "success": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch index {index_code}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/all")
async def get_all_market_indicators() -> Dict[str, Any]:
    """
    모든 시장 지표 종합 조회 (지수, 변동성, 시장 폭, 계산된 지표)

    Returns:
        Dict: 종합 시장 지표 데이터
    """
    try:
        logger.info("Fetching comprehensive market indicators")

        # 데이터 수집기 및 계산기 초기화
        kis_client = await get_kis_client()
        data_collector = MarketDataCollector(kis_client)
        calculator = MarketIndicatorCalculator()

        # 1. 시장 지수 데이터 수집
        indices_data = await data_collector.collect_market_indices()

        # 2. 시장 폭 데이터 수집
        breadth_data = await data_collector.collect_market_breadth()

        # 3. 변동성 데이터 수집
        volatility_data = await data_collector.collect_volatility_data()

        # 4. 히스토리컬 데이터 로드
        try:
            historical_data = load_json_data("data/market_indicators/history_indices_*.json")
        except Exception:
            historical_data = None

        # 5. 모든 지표 계산
        calculated_indicators = await calculator.calculate_all_indicators(
            indices_data={name: index.dict() for name, index in indices_data.items()},
            breadth_data=breadth_data,
            volatility_data=volatility_data,
            historical_data=historical_data
        )

        # 응답 데이터 구조화
        response = {
            "indices": {
                name: {
                    "index_code": index.index_code,
                    "index_name": index.index_name,
                    "current_price": index.current_price,
                    "price_change": index.price_change,
                    "change_rate": index.change_rate,
                    "trading_volume": index.trading_volume,
                    "timestamp": index.timestamp.isoformat()
                }
                for name, index in indices_data.items()
            },
            "market_breadth": breadth_data,
            "volatility": volatility_data,
            "calculated_indicators": {
                name: {
                    "name": indicator.name,
                    "value": indicator.value,
                    "status": indicator.status,
                    "trend": indicator.trend,
                    "description": indicator.description,
                    "timestamp": indicator.timestamp.isoformat()
                }
                for name, indicator in calculated_indicators.items()
            },
            "summary": {
                "overall_condition": calculated_indicators.get("market_condition"),
                "market_stress": calculated_indicators.get("market_stress"),
                "total_indicators": len(calculated_indicators),
                "warning_count": sum(1 for ind in calculated_indicators.values() if ind.status == "warning"),
                "critical_count": sum(1 for ind in calculated_indicators.values() if ind.status == "critical")
            },
            "timestamp": indices_data.get(list(indices_data.keys())[0]).timestamp.isoformat() if indices_data else None,
            "success": True
        }

        logger.info(
            "Market indicators fetched successfully",
            total_indicators=len(calculated_indicators),
            indices_count=len(indices_data),
            overall_status=calculated_indicators.get("market_condition", {}).status if "market_condition" in calculated_indicators else "unknown"
        )

        return response

    except Exception as e:
        logger.error(f"Failed to fetch market indicators: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/summary")
async def get_market_summary() -> Dict[str, Any]:
    """
    시장 지표 요약 정보 (대시보드용)

    Returns:
        Dict: 핵심 시장 지표 요약
    """
    try:
        logger.info("Fetching market summary")

        # 데이터 수집기 및 계산기 초기화
        kis_client = await get_kis_client()
        data_collector = MarketDataCollector(kis_client)
        calculator = MarketIndicatorCalculator()

        # 기본 데이터 수집
        indices_data = await data_collector.collect_market_indices()
        breadth_data = await data_collector.collect_market_breadth()
        volatility_data = await data_collector.collect_volatility_data()

        # 핵심 지표만 계산
        calculated_indicators = await calculator.calculate_all_indicators(
            indices_data={name: index.dict() for name, index in indices_data.items()},
            breadth_data=breadth_data,
            volatility_data=volatility_data
        )

        # 요약 정보 구성
        summary = {
            "kospi": {
                "price": indices_data.get("KOSPI").current_price if "KOSPI" in indices_data else 0,
                "change": indices_data.get("KOSPI").change_rate if "KOSPI" in indices_data else 0,
                "status": "up" if indices_data.get("KOSPI", {"change_rate": 0}).change_rate > 0 else "down"
            } if "KOSPI" in indices_data else {"price": 0, "change": 0, "status": "stable"},

            "kosdaq": {
                "price": indices_data.get("KOSDAQ").current_price if "KOSDAQ" in indices_data else 0,
                "change": indices_data.get("KOSDAQ").change_rate if "KOSDAQ" in indices_data else 0,
                "status": "up" if indices_data.get("KOSDAQ", {"change_rate": 0}).change_rate > 0 else "down"
            } if "KOSDAQ" in indices_data else {"price": 0, "change": 0, "status": "stable"},

            "market_condition": {
                "status": calculated_indicators.get("market_condition").status if "market_condition" in calculated_indicators else "normal",
                "description": calculated_indicators.get("market_condition").description if "market_condition" in calculated_indicators else "시장 상태 정상",
                "trend": calculated_indicators.get("market_condition").trend if "market_condition" in calculated_indicators else "stable"
            },

            "volatility": {
                "level": volatility_data.get("market_condition", "normal_volatility"),
                "value": calculated_indicators.get("average_volatility").value if "average_volatility" in calculated_indicators else 0
            },

            "breadth": {
                "advance_decline_ratio": breadth_data.get("advance_decline_ratio", 1.0),
                "up_stocks_ratio": (breadth_data.get("up_stocks", 0) / max(breadth_data.get("total_stocks", 1), 1)) * 100
            },

            "alert_count": {
                "warning": sum(1 for ind in calculated_indicators.values() if ind.status == "warning"),
                "critical": sum(1 for ind in calculated_indicators.values() if ind.status == "critical")
            },

            "timestamp": indices_data.get(list(indices_data.keys())[0]).timestamp.isoformat() if indices_data else None
        }

        logger.info("Market summary generated successfully")
        return {"data": summary, "success": True}

    except Exception as e:
        logger.error(f"Failed to generate market summary: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/health")
async def market_indicators_health() -> Dict[str, Any]:
    """
    Market Indicators API 상태 확인

    Returns:
        Dict: API 상태 정보
    """
    try:
        kis_client = await get_kis_client()
        status = await kis_client.get_connection_status()

        return {
            "status": "healthy",
            "kis_api_connected": status.get("connected", False),
            "trading_mode": status.get("mode", "unknown"),
            "timestamp": status.get("timestamp")
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "kis_api_connected": False,
            "trading_mode": "unknown"
        }