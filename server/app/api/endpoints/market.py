"""
Market indicators API endpoints
시장 지표 관련 API 엔드포인트
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends
import structlog

from ...services.kis_api import get_kis_client

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get("/indicators", response_model=Dict[str, Any])
async def get_market_indicators() -> Dict[str, Any]:
    """
    시장 지표 조회

    Returns:
        Dict containing market indicators:
        - kospi: 코스피 지수 정보
        - kosdaq: 코스닥 지수 정보
        - usd_krw: 원달러 환율
        - volume_leaders: 거래량 상위 종목
        - market_status: 시장 상태
    """
    try:
        kis_client = await get_kis_client()
        indicators = await kis_client.get_market_indicators()

        logger.info("Market indicators retrieved successfully")
        return {
            "success": True,
            "data": indicators,
            "message": "Market indicators retrieved successfully"
        }

    except Exception as e:
        logger.error(f"Error retrieving market indicators: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve market indicators: {str(e)}"
        )


@router.get("/status", response_model=Dict[str, Any])
async def get_market_status() -> Dict[str, Any]:
    """
    시장 상태 조회

    Returns:
        Dict containing market status information
    """
    try:
        kis_client = await get_kis_client()
        indicators = await kis_client.get_market_indicators()

        market_status = indicators.get("market_status", {})

        return {
            "success": True,
            "data": market_status,
            "message": "Market status retrieved successfully"
        }

    except Exception as e:
        logger.error(f"Error retrieving market status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve market status: {str(e)}"
        )


@router.get("/indices", response_model=Dict[str, Any])
async def get_market_indices() -> Dict[str, Any]:
    """
    주요 지수 정보 조회 (코스피, 코스닥)

    Returns:
        Dict containing major market indices
    """
    try:
        kis_client = await get_kis_client()
        indicators = await kis_client.get_market_indicators()

        indices = {
            "kospi": indicators.get("kospi", {}),
            "kosdaq": indicators.get("kosdaq", {})
        }

        return {
            "success": True,
            "data": indices,
            "message": "Market indices retrieved successfully"
        }

    except Exception as e:
        logger.error(f"Error retrieving market indices: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve market indices: {str(e)}"
        )