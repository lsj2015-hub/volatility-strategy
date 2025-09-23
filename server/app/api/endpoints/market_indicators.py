"""
Market Indicators API Endpoints
시장 지수 및 지표 관련 API 엔드포인트
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import structlog

from ...services.kis_api import get_kis_client
from ...schemas.market import MarketIndicesResponse, IndexData

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