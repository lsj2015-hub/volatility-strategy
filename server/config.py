from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # 서버 설정
    host: str = "0.0.0.0"
    port: int = 8001
    debug: bool = False

    # KIS Open API 설정
    kis_app_key: str
    kis_app_secret: str
    kis_base_url: str = "https://openapi.koreainvestment.com:9443"

    # Redis 설정 (선택적)
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: Optional[str] = None

    # 로깅 설정
    log_level: str = "INFO"

    # 거래 설정
    default_investment_amount: int = 10_000_000  # 기본 투자금액 (1천만원)
    max_positions: int = 5  # 최대 동시 보유 종목 수

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# 전역 설정 인스턴스
settings = Settings()