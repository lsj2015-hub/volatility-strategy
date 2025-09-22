"""
Health check endpoints
"""

from datetime import datetime
from fastapi import APIRouter, Depends
import structlog

from ...utils.config import get_settings, Settings

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check(settings: Settings = Depends(get_settings)):
    """기본 헬스체크"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Volatility Trading Strategy API",
        "version": "1.0.0"
    }


@router.get("/health/detailed")
async def detailed_health_check(settings: Settings = Depends(get_settings)):
    """상세 헬스체크"""

    # 시스템 상태 체크
    system_status = {
        "api": "healthy",
        "database": "not_implemented",  # 파일 기반 저장소 사용
        "kis_api": "unknown",  # KIS API 연결 상태는 별도 체크 필요
    }

    # 설정 상태
    config_status = {
        "debug_mode": settings.DEBUG,
        "host": settings.HOST,
        "port": settings.PORT,
        "kis_api_configured": bool(settings.KIS_APP_KEY and settings.KIS_APP_SECRET),
    }

    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "system": system_status,
        "config": config_status,
        "environment": {
            "redis_host": settings.REDIS_HOST,
            "redis_port": settings.REDIS_PORT,
            "log_level": settings.LOG_LEVEL,
        }
    }