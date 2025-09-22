"""
Stock filtering engine for momentum-based day trading strategy
주식 필터링 엔진 - 모멘텀 기반 데이 트레이딩 전략
"""

import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime

import structlog
from pydantic import BaseModel

from ...services.kis_api import get_kis_client
from ...schemas.trading import FilterConditions, FilteredStock

logger = structlog.get_logger(__name__)


class StockScorer:
    """주식 점수 계산기"""

    def __init__(self):
        self.weights = {
            'volume': 0.25,      # 거래량 가중치
            'momentum': 0.30,    # 모멘텀 가중치
            'strength': 0.25,    # 강도 가중치
            'price': 0.20        # 가격 가중치
        }

    def calculate_volume_score(self, volume: int, avg_volume: int) -> float:
        """거래량 점수 계산 (0-100)"""
        if avg_volume <= 0:
            return 0.0

        ratio = volume / avg_volume

        # 평균 거래량의 1.5배 이상이면 높은 점수
        if ratio >= 2.0:
            return 100.0
        elif ratio >= 1.5:
            return 80.0 + (ratio - 1.5) * 40  # 80-100점
        elif ratio >= 1.0:
            return 40.0 + (ratio - 1.0) * 80  # 40-80점
        else:
            return ratio * 40  # 0-40점

    def calculate_momentum_score(self, change_percent: float) -> float:
        """모멘텀 점수 계산 (0-100)"""
        # 상승률 기준 점수
        if change_percent >= 10.0:
            return 100.0
        elif change_percent >= 5.0:
            return 80.0 + (change_percent - 5.0) * 4  # 80-100점
        elif change_percent >= 2.0:
            return 60.0 + (change_percent - 2.0) * 6.67  # 60-80점
        elif change_percent >= 0.0:
            return 30.0 + change_percent * 15  # 30-60점
        elif change_percent >= -2.0:
            return 15.0 + (change_percent + 2.0) * 7.5  # 15-30점
        else:
            return max(0.0, 15.0 + (change_percent + 2.0) * 7.5)  # 0-15점

    def calculate_strength_score(self, current_price: float, day_high: float, day_low: float) -> float:
        """강도 점수 계산 (0-100) - 당일 고가 대비 현재가 위치"""
        if day_high <= day_low:
            return 50.0

        # 당일 레인지에서 현재가 위치 (0=저가, 1=고가)
        position = (current_price - day_low) / (day_high - day_low)

        # 고가 근처에 있을수록 높은 점수
        if position >= 0.9:
            return 100.0
        elif position >= 0.8:
            return 85.0 + (position - 0.8) * 150  # 85-100점
        elif position >= 0.6:
            return 60.0 + (position - 0.6) * 125  # 60-85점
        elif position >= 0.4:
            return 35.0 + (position - 0.4) * 125  # 35-60점
        else:
            return position * 87.5  # 0-35점

    def calculate_price_score(self, price: float, min_price: float, max_price: float) -> float:
        """가격 점수 계산 (0-100) - 필터 범위 내에서의 선호도"""
        if max_price <= min_price:
            return 50.0

        # 중간 가격대에 높은 점수 부여 (너무 저가나 고가 제외)
        mid_price = (min_price + max_price) / 2
        range_width = max_price - min_price

        # 중앙값에서의 거리 계산
        distance_from_mid = abs(price - mid_price) / (range_width / 2)

        # 중앙에 가까울수록 높은 점수
        if distance_from_mid <= 0.3:
            return 100.0
        elif distance_from_mid <= 0.5:
            return 80.0 + (0.5 - distance_from_mid) * 100  # 80-100점
        elif distance_from_mid <= 0.8:
            return 50.0 + (0.8 - distance_from_mid) * 100  # 50-80점
        else:
            return max(0.0, 50.0 - (distance_from_mid - 0.8) * 250)  # 0-50점

    def calculate_total_score(
        self,
        volume: int,
        avg_volume: int,
        change_percent: float,
        current_price: float,
        day_high: float,
        day_low: float,
        min_price: float,
        max_price: float
    ) -> float:
        """총 점수 계산"""
        volume_score = self.calculate_volume_score(volume, avg_volume)
        momentum_score = self.calculate_momentum_score(change_percent)
        strength_score = self.calculate_strength_score(current_price, day_high, day_low)
        price_score = self.calculate_price_score(current_price, min_price, max_price)

        total_score = (
            volume_score * self.weights['volume'] +
            momentum_score * self.weights['momentum'] +
            strength_score * self.weights['strength'] +
            price_score * self.weights['price']
        )

        return round(total_score, 2)


class StockFilterEngine:
    """주식 필터링 엔진"""

    def __init__(self):
        self.scorer = StockScorer()

    async def filter_stocks(self, conditions: FilterConditions) -> List[FilteredStock]:
        """조건에 따른 주식 필터링 실행"""
        logger.info("Starting stock filtering", conditions=conditions.dict())

        try:
            # KIS API 클라이언트 획득 및 데이터 조회
            kis_client = await get_kis_client()
            trading_mode = "Mock" if kis_client.is_mock_trading else "Real"

            all_stocks = await kis_client.get_all_stocks_basic_info()
            logger.info(f"Retrieved {len(all_stocks)} stocks from KIS API ({trading_mode} trading mode)")

            # 거래량 순위 정보도 함께 조회 (평균 거래량 추정용)
            volume_map = {}
            try:
                volume_ranking = await kis_client.get_stock_volume_ranking()
                if volume_ranking and isinstance(volume_ranking, list):
                    for stock in volume_ranking:
                        if isinstance(stock, dict):
                            stock_code = stock.get('mksc_shrn_iscd', '')
                            if stock_code:
                                volume_map[stock_code] = stock
                    logger.info(f"Retrieved volume ranking for {len(volume_map)} stocks ({trading_mode} mode)")
            except Exception as e:
                logger.warning(f"Volume ranking failed in {trading_mode} mode: {e}")
                # 거래량 순위 실패시에도 필터링은 계속 진행 (기본 거래량 사용)

            filtered_stocks = []

            for stock_data in all_stocks:
                try:
                    filtered_stock = await self._evaluate_stock(stock_data, volume_map, conditions, kis_client)
                    if filtered_stock:
                        filtered_stocks.append(filtered_stock)
                except Exception as e:
                    logger.warning(f"Error evaluating stock {stock_data.get('mksc_shrn_iscd', 'unknown')}: {str(e)}")
                    continue

            # 점수순으로 정렬
            filtered_stocks.sort(key=lambda x: x.score, reverse=True)

            logger.info(f"Filtering completed: {len(filtered_stocks)} stocks passed filters")
            return filtered_stocks

        except Exception as e:
            logger.error(f"Stock filtering failed: {str(e)}")
            raise

    async def _evaluate_stock(
        self,
        stock_data: Dict[str, Any],
        volume_map: Dict[str, Any],
        conditions: FilterConditions,
        kis_client
    ) -> Optional[FilteredStock]:
        """개별 주식 평가"""
        try:
            # 필수 데이터 추출
            symbol = stock_data.get('mksc_shrn_iscd', '')
            name = stock_data.get('hts_kor_isnm', '')
            current_price = float(stock_data.get('stck_prpr', 0))
            change_percent = float(stock_data.get('prdy_ctrt', 0))
            volume = int(stock_data.get('acml_vol', 0))

            if not symbol or current_price <= 0:
                return None

            # 기본 필터 조건 검사
            if not self._passes_basic_filters(current_price, volume, change_percent, conditions):
                return None

            # 제외 심볼 검사
            if conditions.excluded_symbols and symbol in conditions.excluded_symbols:
                return None

            # 거래량 정보 추가 (평균 거래량 추정)
            volume_info = volume_map.get(symbol, {})
            avg_volume = int(volume_info.get('avrg_vol', volume))  # 기본값으로 현재 거래량 사용

            # 가격 범위 정보
            day_high = float(stock_data.get('stck_mxpr', current_price))
            day_low = float(stock_data.get('stck_llam', current_price))

            # 고급 모멘텀 데이터 계산
            advanced_data = await self._calculate_advanced_momentum(symbol, stock_data, volume_info, kis_client)

            # 고급 필터 조건 검사
            if not self._passes_advanced_filters(advanced_data, conditions):
                return None

            # 점수 계산
            score = self.scorer.calculate_total_score(
                volume=volume,
                avg_volume=avg_volume,
                change_percent=change_percent,
                current_price=current_price,
                day_high=day_high,
                day_low=day_low,
                min_price=conditions.min_price,
                max_price=conditions.max_price
            )

            # 모멘텀과 강도 조건 재검사
            momentum = change_percent
            strength = self.scorer.calculate_strength_score(current_price, day_high, day_low)

            if not (conditions.min_momentum <= momentum <= conditions.max_momentum):
                return None
            if not (conditions.min_strength <= strength <= conditions.max_strength):
                return None

            # 필터 통과 이유 생성
            reasons = self._generate_filter_reasons(
                score, momentum, strength, volume, avg_volume, advanced_data
            )

            return FilteredStock(
                symbol=symbol,
                name=name,
                score=score,
                price=current_price,
                volume=volume,
                momentum=momentum,
                strength=strength,
                sector=stock_data.get('bstp_kor_isnm', 'Unknown'),
                reasons=reasons,
                # 고급 모멘텀 데이터 추가
                late_session_return=advanced_data.get('late_session_return'),
                late_session_volume_ratio=advanced_data.get('late_session_volume_ratio'),
                relative_return=advanced_data.get('relative_return'),
                vwap_ratio=advanced_data.get('vwap_ratio'),
                vwap=advanced_data.get('vwap')
            )

        except Exception as e:
            logger.warning(f"Error evaluating stock data: {str(e)}")
            return None

    def _passes_basic_filters(
        self,
        price: float,
        volume: int,
        change_percent: float,
        conditions: FilterConditions
    ) -> bool:
        """기본 필터 조건 검사"""
        return (
            conditions.min_price <= price <= conditions.max_price and
            conditions.min_volume <= volume <= conditions.max_volume and
            conditions.min_momentum <= change_percent <= conditions.max_momentum
        )

    async def _calculate_advanced_momentum(
        self,
        symbol: str,
        stock_data: Dict[str, Any],
        volume_info: Dict[str, Any],
        kis_client
    ) -> Dict[str, Any]:
        """고급 모멘텀 데이터 계산"""
        advanced_data = {}

        try:
            current_price = float(stock_data.get('stck_prpr', 0))
            current_volume = int(stock_data.get('acml_vol', 0))
            change_percent = float(stock_data.get('prdy_ctrt', 0))

            # KIS API에서 실제 시장 데이터 조회
            try:
                # 1. 시장 지수 데이터 조회
                market_data = await kis_client.get_market_index_data()
                market_return = market_data.get('market_return', 2.0)

                # 2. 분봉 데이터로 실제 모멘텀 계산
                minute_data = await kis_client.get_minute_data_for_momentum(symbol)

                if 'error' not in minute_data:
                    # 실제 KIS API 데이터 사용
                    advanced_data['late_session_return'] = minute_data.get('late_session_return', 0.0)
                    advanced_data['late_session_volume_ratio'] = minute_data.get('late_session_volume_ratio', 15.0)
                    advanced_data['vwap'] = minute_data.get('vwap', current_price)
                    advanced_data['vwap_ratio'] = (current_price / advanced_data['vwap'] * 100) if advanced_data['vwap'] > 0 else 100

                    # 3. 시장 대비 상대 수익률
                    advanced_data['relative_return'] = change_percent - market_return
                else:
                    # 분봉 데이터 실패시 기본값으로 계산 (필터링에서 제외하지 않음)
                    logger.warning(f"Minute data unavailable for {symbol}, using basic calculations")
                    advanced_data['late_session_return'] = 0.0
                    advanced_data['late_session_volume_ratio'] = 15.0
                    advanced_data['vwap'] = current_price
                    advanced_data['vwap_ratio'] = 100.0
                    advanced_data['relative_return'] = change_percent - 2.0  # 기본 시장 수익률 사용

            except Exception as e:
                # 고급 모멘텀 계산 실패시 기본값 사용 (필터링에서 제외하지 않음)
                logger.warning(f"Advanced momentum calculation failed for {symbol}: {str(e)}, using defaults")
                advanced_data['late_session_return'] = 0.0
                advanced_data['late_session_volume_ratio'] = 15.0
                advanced_data['vwap'] = current_price
                advanced_data['vwap_ratio'] = 100.0
                advanced_data['relative_return'] = change_percent - 2.0

        except Exception as e:
            logger.warning(f"Error in advanced momentum calculation for {symbol}: {str(e)}")
            # 전체 계산 실패시 기본값 반환
            return {
                'late_session_return': 0.0,
                'late_session_volume_ratio': 15.0,
                'vwap': current_price,
                'vwap_ratio': 100.0,
                'relative_return': change_percent - 2.0
            }

        return advanced_data


    def _passes_advanced_filters(
        self,
        advanced_data: Dict[str, Any],
        conditions: FilterConditions
    ) -> bool:
        """고급 필터 조건 검사"""
        try:
            # 후반부 상승률 조건
            if conditions.min_late_session_return is not None:
                late_return = advanced_data.get('late_session_return', 0)
                if late_return < conditions.min_late_session_return:
                    return False

            if conditions.max_late_session_return is not None:
                late_return = advanced_data.get('late_session_return', 0)
                if late_return > conditions.max_late_session_return:
                    return False

            # 후반부 거래량 집중도 조건
            if conditions.min_late_session_volume_ratio is not None:
                volume_ratio = advanced_data.get('late_session_volume_ratio', 0)
                if volume_ratio < conditions.min_late_session_volume_ratio:
                    return False

            if conditions.max_late_session_volume_ratio is not None:
                volume_ratio = advanced_data.get('late_session_volume_ratio', 0)
                if volume_ratio > conditions.max_late_session_volume_ratio:
                    return False

            # 상대 수익률 조건
            if conditions.min_relative_return is not None:
                relative_return = advanced_data.get('relative_return', 0)
                if relative_return < conditions.min_relative_return:
                    return False

            if conditions.max_relative_return is not None:
                relative_return = advanced_data.get('relative_return', 0)
                if relative_return > conditions.max_relative_return:
                    return False

            # VWAP 비율 조건
            if conditions.min_vwap_ratio is not None:
                vwap_ratio = advanced_data.get('vwap_ratio', 100)
                if vwap_ratio < conditions.min_vwap_ratio:
                    return False

            if conditions.max_vwap_ratio is not None:
                vwap_ratio = advanced_data.get('vwap_ratio', 100)
                if vwap_ratio > conditions.max_vwap_ratio:
                    return False

            return True

        except Exception as e:
            logger.warning(f"Error in advanced filter check: {str(e)}")
            return True  # 에러 시 통과

    def _generate_filter_reasons(
        self,
        score: float,
        momentum: float,
        strength: float,
        volume: int,
        avg_volume: int,
        advanced_data: Dict[str, Any] = None
    ) -> List[str]:
        """필터 통과 이유 생성"""
        reasons = []

        if score >= 80:
            reasons.append("High overall score")
        elif score >= 60:
            reasons.append("Good overall score")

        if momentum >= 5:
            reasons.append("Strong upward momentum")
        elif momentum >= 2:
            reasons.append("Positive momentum")

        if strength >= 80:
            reasons.append("Trading near daily high")
        elif strength >= 60:
            reasons.append("Strong intraday position")

        if volume > avg_volume * 1.5:
            reasons.append("High volume activity")
        elif volume > avg_volume:
            reasons.append("Above average volume")

        # 고급 모멘텀 이유 추가
        if advanced_data:
            late_return = advanced_data.get('late_session_return', 0)
            if late_return >= 2.0:
                reasons.append("Strong late session momentum")
            elif late_return >= 1.0:
                reasons.append("Positive late session trend")

            volume_ratio = advanced_data.get('late_session_volume_ratio', 15)
            if volume_ratio >= 20:
                reasons.append("High late session volume concentration")

            relative_return = advanced_data.get('relative_return', 0)
            if relative_return >= 1.0:
                reasons.append("Outperforming market index")

            vwap_ratio = advanced_data.get('vwap_ratio', 100)
            if vwap_ratio >= 102:
                reasons.append("Trading above VWAP")

        if not reasons:
            reasons.append("Meets basic criteria")

        return reasons



# 싱글톤 인스턴스
_filter_engine: Optional[StockFilterEngine] = None

def get_filter_engine() -> StockFilterEngine:
    """필터 엔진 싱글톤 인스턴스 반환"""
    global _filter_engine
    if _filter_engine is None:
        _filter_engine = StockFilterEngine()
    return _filter_engine