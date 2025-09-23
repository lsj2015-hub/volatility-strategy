from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import structlog
import asyncio

from app.utils.config import get_settings
from app.api.endpoints import health, auth, stocks, portfolio, trading_mode, orders, monitoring, trading, market, market_indicators
from app.api.websocket import ws_router
from app.services.data_simulator import data_simulator
from app.core.trading.trading_controller import trading_controller

# 설정 로드
settings = get_settings()

# 로깅 설정
structlog.configure(
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

# FastAPI 앱 생성
app = FastAPI(
    title="Volatility Trading Strategy API",
    description="모멘텀 기반 단타 전략 API 서버",
    version="1.0.0",
    debug=settings.DEBUG
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """헬스체크 엔드포인트"""
    return {
        "message": "Volatility Trading Strategy API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """상세 헬스체크"""
    return {
        "status": "healthy",
        "timestamp": "2025-01-18T12:00:00Z"
    }


# API 라우터 등록
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(stocks.router, tags=["stocks"])
app.include_router(portfolio.router, tags=["portfolio"])
app.include_router(trading_mode.router, tags=["trading-mode"])
app.include_router(orders.router, prefix="/api", tags=["orders"])
app.include_router(monitoring.router, prefix="/api", tags=["monitoring"])
app.include_router(trading.router, prefix="/api/trading", tags=["trading"])
app.include_router(market.router, prefix="/api/market", tags=["market"])
app.include_router(market_indicators.router, tags=["market-indicators"])

# WebSocket 라우터 등록
app.include_router(ws_router, tags=["websocket"])


@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행"""
    logger = structlog.get_logger()
    logger.info("Starting volatility trading strategy server")

    # 데이터 시뮬레이터 시작
    await data_simulator.start_simulation()
    logger.info("Data simulator started")

    # 트레이딩 시스템 시작 (개발 환경에서는 자동 시작하지 않음)
    # await trading_controller.start_trading_system()
    # logger.info("Trading system started")


@app.on_event("shutdown")
async def shutdown_event():
    """애플리케이션 종료 시 실행"""
    logger = structlog.get_logger()
    logger.info("Shutting down volatility trading strategy server")

    # 트레이딩 시스템 중지
    await trading_controller.stop_trading_system()
    logger.info("Trading system stopped")

    # 데이터 시뮬레이터 중지
    await data_simulator.stop_simulation()
    logger.info("Data simulator stopped")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )