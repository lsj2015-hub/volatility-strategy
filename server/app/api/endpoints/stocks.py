"""
Stock-related API endpoints
주식 관련 API 엔드포인트
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel

import structlog

from ...schemas.api import ApiResponse
from ...schemas.stock import StockData, StockListRequest, StockPriceRequest
from ...schemas.trading import FilterConditions, FilteredStock
from ...core.filtering.stock_filter import get_filter_engine
from ...services.kis_api import get_kis_client

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


class FilterStocksRequest(BaseModel):
    """주식 필터링 요청"""
    conditions: FilterConditions


@router.post("/filter", response_model=ApiResponse[List[FilteredStock]])
async def filter_stocks(request: FilterStocksRequest):
    """
    주식 필터링 실행
    Day 1: 15:30-16:00 시장 마감 후 필터링 조건에 따른 주식 선별
    """
    try:
        logger.info("Stock filtering requested", conditions=request.conditions.dict())

        filter_engine = get_filter_engine()
        filtered_stocks = await filter_engine.filter_stocks(request.conditions)

        logger.info(f"Stock filtering completed: {len(filtered_stocks)} stocks found")

        return ApiResponse(
            success=True,
            data=filtered_stocks,
            message=f"Found {len(filtered_stocks)} stocks matching criteria"
        )

    except Exception as e:
        logger.error(f"Stock filtering failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Stock filtering failed: {str(e)}")


@router.get("/all", response_model=ApiResponse[List[StockData]])
async def get_all_stocks(
    sector: Optional[str] = Query(None, description="Filter by sector"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results")
):
    """
    전체 주식 목록 조회
    """
    try:
        logger.info("All stocks requested", sector=sector, min_price=min_price, max_price=max_price)

        kis_client = await get_kis_client()
        raw_stocks = await kis_client.get_all_stocks_basic_info()

        # 기본 데이터 변환
        stocks = []
        count = 0

        for stock_data in raw_stocks:
            if count >= limit:
                break

            try:
                symbol = stock_data.get('mksc_shrn_iscd', '')
                name = stock_data.get('hts_kor_isnm', '')

                # 하드코딩된 목록의 경우 개별 주식 정보를 추가로 조회
                if not stock_data.get('stck_prpr') and symbol:
                    try:
                        detail_data = await kis_client.get_stock_detail(symbol)
                        current_price = float(detail_data.get('stck_prpr', 0))
                        previous_close = float(detail_data.get('stck_sdpr', current_price))
                        change_percent = float(detail_data.get('prdy_ctrt', 0))
                        volume = int(detail_data.get('acml_vol', 0))
                        sector_name = detail_data.get('bstp_kor_isnm', 'Unknown')
                        if not name:
                            name = detail_data.get('hts_kor_isnm', '')
                    except Exception as e:
                        logger.warning(f"Failed to get detail for {symbol}: {e}")
                        current_price = 0.0
                        previous_close = 0.0
                        change_percent = 0.0
                        volume = 0
                        sector_name = 'Unknown'
                else:
                    current_price = float(stock_data.get('stck_prpr', 0))
                    previous_close = float(stock_data.get('stck_sdpr', current_price))
                    change_percent = float(stock_data.get('prdy_ctrt', 0))
                    volume = int(stock_data.get('acml_vol', 0))
                    sector_name = stock_data.get('bstp_kor_isnm', 'Unknown')

                change = current_price - previous_close

                # 필터 적용
                if min_price is not None and current_price < min_price:
                    continue
                if max_price is not None and current_price > max_price:
                    continue
                if sector is not None and sector.lower() not in sector_name.lower():
                    continue

                stock = StockData(
                    symbol=symbol,
                    name=name,
                    current_price=current_price,
                    previous_close=previous_close,
                    change=change,
                    change_percent=change_percent,
                    volume=volume,
                    sector=sector_name
                )

                stocks.append(stock)
                count += 1

            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid stock data: {str(e)}")
                continue

        logger.info(f"Retrieved {len(stocks)} stocks")

        return ApiResponse(
            success=True,
            data=stocks,
            message=f"Retrieved {len(stocks)} stocks"
        )

    except Exception as e:
        logger.error(f"Failed to get all stocks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stocks: {str(e)}")


@router.get("/{symbol}", response_model=ApiResponse[StockData])
async def get_stock_detail(symbol: str):
    """
    개별 주식 상세 정보 조회
    """
    try:
        logger.info("Stock detail requested", symbol=symbol)

        kis_client = await get_kis_client()
        stock_data = await kis_client.get_stock_detail(symbol)

        if not stock_data:
            raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")

        # 데이터 변환
        current_price = float(stock_data.get('stck_prpr', 0))
        previous_close = float(stock_data.get('stck_sdpr', current_price))
        change = current_price - previous_close
        change_percent = float(stock_data.get('prdy_ctrt', 0))
        volume = int(stock_data.get('acml_vol', 0))

        stock = StockData(
            symbol=symbol,
            name=stock_data.get('hts_kor_isnm', ''),
            current_price=current_price,
            previous_close=previous_close,
            change=change,
            change_percent=change_percent,
            volume=volume,
            market_cap=None,  # KIS API에서 제공하지 않음
            sector=stock_data.get('bstp_kor_isnm', 'Unknown')
        )

        logger.info("Stock detail retrieved", symbol=symbol, price=current_price)

        return ApiResponse(
            success=True,
            data=stock,
            message=f"Retrieved details for {symbol}"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get stock detail for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stock detail: {str(e)}")


@router.get("/{symbol}/after-hours", response_model=ApiResponse[dict])
async def get_after_hours_price(symbol: str):
    """
    시간외 호가 조회 (Day 1: 16:00-17:40)
    """
    try:
        logger.info("After-hours price requested", symbol=symbol)

        kis_client = await get_kis_client()
        after_hours_data = await kis_client.get_after_hours_price(symbol)

        if not after_hours_data:
            raise HTTPException(status_code=404, detail=f"After-hours data for {symbol} not found")

        logger.info("After-hours price retrieved", symbol=symbol)

        return ApiResponse(
            success=True,
            data=after_hours_data,
            message=f"Retrieved after-hours data for {symbol}"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get after-hours price for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get after-hours price: {str(e)}")


@router.get("/ranking/volume", response_model=ApiResponse[List[dict]])
async def get_volume_ranking(
    market_div: str = Query("J", description="Market division (J: KOSPI, Q: KOSDAQ)"),
    limit: int = Query(50, ge=1, le=200, description="Number of results")
):
    """
    거래량 순위 조회 - 모의투자/실거래 모드에 따라 해당 데이터 반환
    """
    try:
        kis_client = await get_kis_client()
        trading_mode = "Mock" if kis_client.is_mock_trading else "Real"

        logger.info(f"{trading_mode} Volume ranking requested",
                   market_div=market_div, limit=limit, is_mock=kis_client.is_mock_trading)

        volume_ranking = await kis_client.get_stock_volume_ranking(market_div)

        # 응답이 리스트인지 확인
        if not isinstance(volume_ranking, list):
            logger.warning(f"{trading_mode} Expected list but got {type(volume_ranking)}")
            return ApiResponse(
                success=False,
                data=[],
                message=f"Unexpected response type: {type(volume_ranking)}"
            )

        # 결과 제한 및 데이터 보강
        limited_ranking = []
        for i, stock in enumerate(volume_ranking[:limit]):
            if not stock:
                continue

            # 데이터 정규화 및 보강
            processed_stock = {
                **stock,
                "volume": int(stock.get("acml_vol", 0)) if stock.get("acml_vol") else 0,
                "name": stock.get("hts_kor_isnm", ""),
                "symbol": stock.get("mksc_shrn_iscd", ""),
                "price": float(stock.get("stck_prpr", 0)) if stock.get("stck_prpr") else 0,
                "change_percent": float(stock.get("prdy_ctrt", 0)) if stock.get("prdy_ctrt") else 0,
            }
            limited_ranking.append(processed_stock)

        logger.info(f"{trading_mode} Volume ranking retrieved: {len(limited_ranking)} stocks")

        return ApiResponse(
            success=True,
            data=limited_ranking,
            message=f"Retrieved top {len(limited_ranking)} stocks by volume ({trading_mode.lower()} trading data)"
        )

    except Exception as e:
        logger.error(f"Volume ranking API failed: {str(e)}")
        # KIS API 실패 시 실제 에러 반환 (mock 데이터 제거)
        raise HTTPException(
            status_code=503,
            detail=f"KIS API service unavailable for volume ranking: {str(e)}"
        )


@router.post("/prices", response_model=ApiResponse[List[dict]])
async def get_multiple_stock_prices(request: StockPriceRequest):
    """
    여러 주식의 실시간 가격 조회
    """
    try:
        logger.info("Multiple stock prices requested", symbols=request.symbols)

        kis_client = await get_kis_client()
        prices = []

        for symbol in request.symbols:
            try:
                stock_data = await kis_client.get_stock_detail(symbol)
                if stock_data:
                    price_info = {
                        'symbol': symbol,
                        'price': float(stock_data.get('stck_prpr', 0)),
                        'change': float(stock_data.get('prdy_vrss', 0)),
                        'change_percent': float(stock_data.get('prdy_ctrt', 0)),
                        'volume': int(stock_data.get('acml_vol', 0)),
                        'timestamp': stock_data.get('stck_bsop_date', '')
                    }
                    prices.append(price_info)

            except Exception as e:
                logger.warning(f"Failed to get price for {symbol}: {str(e)}")
                continue

        logger.info(f"Retrieved prices for {len(prices)} stocks")

        return ApiResponse(
            success=True,
            data=prices,
            message=f"Retrieved prices for {len(prices)} stocks"
        )

    except Exception as e:
        logger.error(f"Failed to get multiple stock prices: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stock prices: {str(e)}")


# 동적 조건 조정 API
@router.post("/adjust-conditions", response_model=ApiResponse[FilterConditions])
async def adjust_filter_conditions(current_conditions: FilterConditions):
    """
    동적 조건 조정 (시장 상황에 따른 필터링 조건 최적화)
    """
    try:
        logger.info("Filter condition adjustment requested", conditions=current_conditions.dict())

        # 현재 시장 상황 분석
        kis_client = await get_kis_client()
        volume_ranking = await kis_client.get_stock_volume_ranking()

        # 시장 활성도 분석
        total_volume = sum(int(stock.get('acml_vol', 0)) for stock in volume_ranking[:100])
        avg_volume = total_volume / 100 if volume_ranking else 0

        # 상승/하락 종목 비율 분석
        positive_count = sum(1 for stock in volume_ranking[:100]
                           if float(stock.get('prdy_ctrt', 0)) > 0)
        market_sentiment = positive_count / 100 if volume_ranking else 0.5

        # 조건 조정 로직
        adjusted_conditions = current_conditions.copy()

        # 시장이 활발할 때 (거래량 많음)
        if avg_volume > 1000000:  # 100만주 이상
            adjusted_conditions.min_volume = int(current_conditions.min_volume * 1.2)
            logger.info("Increased volume threshold due to high market activity")

        # 시장 심리가 긍정적일 때
        if market_sentiment > 0.6:
            adjusted_conditions.min_momentum = max(-1.0, current_conditions.min_momentum - 0.5)
            logger.info("Relaxed momentum threshold due to positive market sentiment")

        # 시장 심리가 부정적일 때
        elif market_sentiment < 0.4:
            adjusted_conditions.min_momentum = min(5.0, current_conditions.min_momentum + 1.0)
            logger.info("Tightened momentum threshold due to negative market sentiment")

        logger.info("Filter conditions adjusted",
                   original=current_conditions.dict(),
                   adjusted=adjusted_conditions.dict())

        return ApiResponse(
            success=True,
            data=adjusted_conditions,
            message="Filter conditions adjusted based on market conditions"
        )

    except Exception as e:
        logger.error(f"Failed to adjust filter conditions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to adjust conditions: {str(e)}")