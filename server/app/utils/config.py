"""
Application configuration management
"""

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # KIS API 설정
    KIS_APP_KEY: str = Field(..., description="KIS API App Key")
    KIS_APP_SECRET: str = Field(..., description="KIS API App Secret")
    KIS_BASE_URL: str = Field(
        default="https://openapi.koreainvestment.com:9443",
        description="KIS API Base URL"
    )

    # 모의투자 설정
    KIS_MOCK_TRADING: bool = Field(default=True, description="모의투자 모드 활성화")
    KIS_SIMULATION_MODE: bool = Field(default=False, description="완전 시뮬레이션 모드 (API 연결 없음) - Live Trading에서는 False 필수")
    KIS_MOCK_BASE_URL: str = Field(
        default="https://openapivts.koreainvestment.com:29443",
        description="KIS API Mock Trading Base URL"
    )
    KIS_ACCOUNT_NUMBER: str = Field(default="", description="계좌번호")
    KIS_ACCOUNT_PRODUCT_CODE: str = Field(default="01", description="계좌상품코드")

    # 서버 설정
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8001, description="Server port")
    DEBUG: bool = Field(default=False, description="Debug mode")

    # Redis 설정 (선택적)
    REDIS_HOST: str = Field(default="localhost", description="Redis host")
    REDIS_PORT: int = Field(default=6379, description="Redis port")
    REDIS_PASSWORD: Optional[str] = Field(default=None, description="Redis password")

    # 로깅 설정
    LOG_LEVEL: str = Field(default="INFO", description="Log level")

    # 거래 설정
    DEFAULT_INVESTMENT_AMOUNT: int = Field(
        default=10000000, description="기본 투자 금액 (원)"
    )
    MAX_POSITIONS: int = Field(default=5, description="최대 보유 종목 수")

    # 스케줄링 설정
    FILTERING_TIME: str = Field(default="15:30", description="필터링 실행 시간")
    MONITORING_START_TIME: str = Field(default="16:00", description="모니터링 시작 시간")
    MONITORING_END_TIME: str = Field(default="17:40", description="모니터링 종료 시간")
    TRADING_START_TIME: str = Field(default="09:00", description="거래 시작 시간")
    TRADING_END_TIME: str = Field(default="15:30", description="거래 종료 시간")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """설정 인스턴스 반환 (캐시됨)"""
    return Settings()