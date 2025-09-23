"""
Market Indicators Schemas
시장 지수 및 지표 데이터 스키마
"""

from typing import Optional
from pydantic import BaseModel, Field


class IndexData(BaseModel):
    """개별 지수 데이터 스키마"""
    index_code: str = Field(..., description="지수 코드 (0001: KOSPI, 1001: KOSDAQ)")
    index_name: str = Field(..., description="지수명")
    current_price: float = Field(..., description="현재가")
    change: float = Field(..., description="전일 대비 변동")
    change_rate: float = Field(..., description="전일 대비 변동률 (%)")
    change_sign: str = Field(..., description="변동 부호")
    volume: int = Field(..., description="누적 거래량")
    trade_amount: int = Field(..., description="누적 거래 대금")
    open_price: float = Field(..., description="시가")
    high_price: float = Field(..., description="고가")
    low_price: float = Field(..., description="저가")
    up_count: int = Field(..., description="상승 종목 수")
    down_count: int = Field(..., description="하락 종목 수")
    unchanged_count: int = Field(..., description="보합 종목 수")
    year_high: float = Field(..., description="연중 최고가")
    year_high_date: str = Field(..., description="연중 최고가 날짜")
    year_low: float = Field(..., description="연중 최저가")
    year_low_date: str = Field(..., description="연중 최저가 날짜")


class MarketIndicesResponse(BaseModel):
    """시장 지수 응답 스키마"""
    kospi: Optional[IndexData] = Field(None, description="KOSPI 지수 데이터")
    kosdaq: Optional[IndexData] = Field(None, description="KOSDAQ 지수 데이터")
    timestamp: str = Field(..., description="데이터 조회 시간")
    success: bool = Field(..., description="요청 성공 여부")
    error: Optional[str] = Field(None, description="에러 메시지")


class MarketSummary(BaseModel):
    """시장 요약 정보 스키마"""
    kospi_price: float = Field(..., description="KOSPI 현재가")
    kospi_change_rate: float = Field(..., description="KOSPI 변동률")
    kosdaq_price: float = Field(..., description="KOSDAQ 현재가")
    kosdaq_change_rate: float = Field(..., description="KOSDAQ 변동률")
    market_status: str = Field(..., description="시장 상태 (open/close/pre/after)")
    timestamp: str = Field(..., description="업데이트 시간")


class IndexHistoryRequest(BaseModel):
    """지수 히스토리 요청 스키마"""
    index_code: str = Field(..., description="지수 코드")
    period: str = Field("D", description="기간 (D: 일봉, W: 주봉, M: 월봉)")
    start_date: Optional[str] = Field(None, description="시작일 (YYYYMMDD)")
    end_date: Optional[str] = Field(None, description="종료일 (YYYYMMDD)")


class IndexHistoryData(BaseModel):
    """지수 히스토리 데이터 스키마"""
    date: str = Field(..., description="날짜")
    open_price: float = Field(..., description="시가")
    high_price: float = Field(..., description="고가")
    low_price: float = Field(..., description="저가")
    close_price: float = Field(..., description="종가")
    volume: int = Field(..., description="거래량")
    change: float = Field(..., description="전일 대비")
    change_rate: float = Field(..., description="변동률")


class IndexHistoryResponse(BaseModel):
    """지수 히스토리 응답 스키마"""
    index_code: str = Field(..., description="지수 코드")
    index_name: str = Field(..., description="지수명")
    period: str = Field(..., description="조회 기간")
    data: list[IndexHistoryData] = Field(..., description="히스토리 데이터")
    count: int = Field(..., description="데이터 개수")
    success: bool = Field(..., description="요청 성공 여부")
    error: Optional[str] = Field(None, description="에러 메시지")