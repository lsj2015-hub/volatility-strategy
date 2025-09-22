"""Trading mode management endpoints"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...services.kis_api import get_kis_client
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/trading-mode", tags=["trading-mode"])


class TradingModeRequest(BaseModel):
    """거래 모드 변경 요청"""
    is_mock: bool


@router.get("/status")
async def get_trading_mode_status() -> Dict[str, Any]:
    """현재 거래 모드 상태 조회"""
    try:
        kis_client = await get_kis_client()
        mode_info = kis_client.get_trading_mode()

        return {
            "success": True,
            "data": mode_info
        }

    except Exception as e:
        logger.error(f"Failed to get trading mode status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get trading mode status")


@router.post("/change")
async def change_trading_mode(request: TradingModeRequest) -> Dict[str, Any]:
    """거래 모드 변경 (실거래 ↔ 모의투자)"""
    try:
        kis_client = await get_kis_client()

        # 현재 모드 확인
        current_mode = kis_client.get_trading_mode()
        current_is_mock = current_mode["is_mock_trading"]

        if current_is_mock == request.is_mock:
            return {
                "success": True,
                "message": f"Already in {'mock' if request.is_mock else 'real'} trading mode",
                "data": current_mode
            }

        # 모드 변경
        kis_client.set_trading_mode(request.is_mock)

        # 변경된 모드 정보 반환
        new_mode = kis_client.get_trading_mode()

        return {
            "success": True,
            "message": f"Trading mode changed to {'mock' if request.is_mock else 'real'} trading",
            "data": new_mode
        }

    except Exception as e:
        logger.error(f"Failed to change trading mode: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to change trading mode: {str(e)}"
        )