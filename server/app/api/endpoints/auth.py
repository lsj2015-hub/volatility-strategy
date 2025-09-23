"""
Authentication endpoints for KIS API
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
import structlog

from ...services.kis_api import get_kis_client, KISAPIClient
from ...utils.config import get_settings, Settings
from ...schemas.api import ApiResponse, SaveApiKeysRequest
from ...utils.env_manager import env_manager

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/auth/status", response_model=ApiResponse[dict])
async def get_auth_status(
    settings: Settings = Depends(get_settings),
    kis_client: KISAPIClient = Depends(get_kis_client)
):
    """KIS API 인증 상태 확인"""
    try:
        # 토큰 상태 확인
        has_token = kis_client.access_token is not None
        token_expires_at = kis_client.token_expires_at.isoformat() if kis_client.token_expires_at else None

        auth_data = {
            "authenticated": has_token,
            "token_expires_at": token_expires_at,
            "api_configured": bool(settings.KIS_APP_KEY and settings.KIS_APP_SECRET),
            "base_url": settings.KIS_BASE_URL,
            "timestamp": datetime.now().isoformat()
        }

        return ApiResponse(
            success=True,
            data=auth_data,
            message="Authentication status retrieved successfully"
        )

    except Exception as e:
        logger.error(f"Failed to check auth status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"인증 상태 확인 실패: {str(e)}")


@router.post("/auth/refresh", response_model=ApiResponse[dict])
async def refresh_token(kis_client: KISAPIClient = Depends(get_kis_client)):
    """KIS API 토큰 갱신"""
    try:
        # 토큰 갱신
        new_token = await kis_client.get_access_token()

        logger.info("KIS API token refreshed successfully")

        refresh_data = {
            "success": True,
            "message": "토큰이 성공적으로 갱신되었습니다",
            "token_expires_at": kis_client.token_expires_at.isoformat(),
            "timestamp": datetime.now().isoformat()
        }

        return ApiResponse(
            success=True,
            data=refresh_data,
            message="KIS API token refreshed successfully"
        )

    except Exception as e:
        logger.error(f"Failed to refresh token: {str(e)}")
        raise HTTPException(status_code=500, detail=f"토큰 갱신 실패: {str(e)}")


@router.post("/auth/save-keys", response_model=ApiResponse[dict])
async def save_api_keys(request: SaveApiKeysRequest):
    """KIS API 키를 .env 파일에 저장"""
    try:
        # API 키를 .env 파일에 저장
        success = env_manager.save_kis_api_keys(
            app_key=request.app_key,
            app_secret=request.app_secret
        )

        if not success:
            raise HTTPException(status_code=500, detail="API 키 저장에 실패했습니다")

        logger.info("KIS API keys saved successfully")

        save_result_data = {
            "success": True,
            "message": "API 키가 성공적으로 저장되었습니다",
            "app_key_length": len(request.app_key),
            "app_secret_length": len(request.app_secret),
            "timestamp": datetime.now().isoformat()
        }

        return ApiResponse(
            success=True,
            data=save_result_data,
            message="API keys saved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save API keys: {str(e)}")
        raise HTTPException(status_code=500, detail=f"API 키 저장 실패: {str(e)}")


@router.get("/auth/test", response_model=ApiResponse[dict])
async def test_api_connection(kis_client: KISAPIClient = Depends(get_kis_client)):
    """KIS API 연결 테스트"""
    try:
        # 간단한 API 호출로 연결 테스트 (계좌 잔고 조회)
        balance_data = await kis_client.get_account_balance()

        logger.info("KIS API connection test successful")

        test_result_data = {
            "success": True,
            "message": "KIS API 연결이 정상적으로 작동합니다",
            "test_result": {
                "response_received": True,
                "data_keys": list(balance_data.keys()) if isinstance(balance_data, dict) else []
            },
            "timestamp": datetime.now().isoformat()
        }

        return ApiResponse(
            success=True,
            data=test_result_data,
            message="KIS API connection test completed successfully"
        )

    except Exception as e:
        logger.error(f"KIS API connection test failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"API 연결 테스트 실패: {str(e)}")