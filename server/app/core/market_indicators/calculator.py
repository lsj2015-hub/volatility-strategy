"""
Market Indicator Calculator
시장 지표 계산 엔진
"""

import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple

import structlog
from pydantic import BaseModel

logger = structlog.get_logger(__name__)


class CalculatedIndicator(BaseModel):
    """계산된 지표 모델"""
    name: str
    value: float
    status: str  # "normal", "warning", "critical"
    trend: str   # "up", "down", "stable"
    description: str
    timestamp: datetime


class MarketIndicatorCalculator:
    """시장 지표 계산기"""

    def __init__(self):
        self.indicator_thresholds = {
            "volatility_rate": {"warning": 2.0, "critical": 3.5},
            "advance_decline_ratio": {"warning": 0.7, "critical": 0.5},
            "momentum_strength": {"warning": -0.5, "critical": -1.0},
            "market_stress": {"warning": 0.6, "critical": 0.8}
        }

    async def calculate_all_indicators(
        self,
        indices_data: Dict[str, Any],
        breadth_data: Dict[str, Any],
        volatility_data: Dict[str, Any],
        historical_data: Optional[Dict[str, List[Dict]]] = None
    ) -> Dict[str, CalculatedIndicator]:
        """모든 시장 지표 계산"""

        indicators = {}

        try:
            # 1. 시장 추세 지표
            trend_indicators = await self._calculate_trend_indicators(indices_data, historical_data)
            indicators.update(trend_indicators)

            # 2. 변동성 지표
            volatility_indicators = await self._calculate_volatility_indicators(volatility_data)
            indicators.update(volatility_indicators)

            # 3. 시장 폭 지표
            breadth_indicators = await self._calculate_breadth_indicators(breadth_data)
            indicators.update(breadth_indicators)

            # 4. 복합 시장 스트레스 지표
            stress_indicator = await self._calculate_market_stress(indicators)
            indicators["market_stress"] = stress_indicator

            # 5. 종합 시장 상태 평가
            market_condition = await self._calculate_overall_condition(indicators)
            indicators["market_condition"] = market_condition

        except Exception as e:
            logger.error(f"Indicator calculation failed: {e}")

        return indicators

    async def _calculate_trend_indicators(
        self,
        indices_data: Dict[str, Any],
        historical_data: Optional[Dict[str, List[Dict]]] = None
    ) -> Dict[str, CalculatedIndicator]:
        """추세 지표 계산"""

        indicators = {}

        try:
            # KOSPI 추세 분석
            if "KOSPI" in indices_data:
                kospi_trend = self._analyze_trend(
                    current_price=indices_data["KOSPI"]["current_price"],
                    price_change=indices_data["KOSPI"]["price_change"],
                    change_rate=indices_data["KOSPI"]["change_rate"],
                    historical_prices=self._extract_historical_prices("KOSPI", historical_data)
                )
                indicators["kospi_trend"] = kospi_trend

            # KOSDAQ 추세 분석
            if "KOSDAQ" in indices_data:
                kosdaq_trend = self._analyze_trend(
                    current_price=indices_data["KOSDAQ"]["current_price"],
                    price_change=indices_data["KOSDAQ"]["price_change"],
                    change_rate=indices_data["KOSDAQ"]["change_rate"],
                    historical_prices=self._extract_historical_prices("KOSDAQ", historical_data)
                )
                indicators["kosdaq_trend"] = kosdaq_trend

            # 전체 시장 모멘텀
            momentum = self._calculate_market_momentum(indices_data)
            indicators["market_momentum"] = momentum

        except Exception as e:
            logger.warning(f"Trend indicator calculation failed: {e}")

        return indicators

    def _analyze_trend(
        self,
        current_price: float,
        price_change: float,
        change_rate: float,
        historical_prices: List[float]
    ) -> CalculatedIndicator:
        """개별 지수 추세 분석"""

        trend_direction = "stable"
        trend_strength = abs(change_rate)

        if change_rate > 0.5:
            trend_direction = "up"
        elif change_rate < -0.5:
            trend_direction = "down"

        # 히스토리컬 데이터가 있으면 이동평균 기반 추세 분석
        if len(historical_prices) >= 5:
            recent_avg = statistics.mean(historical_prices[-5:])
            trend_value = (current_price - recent_avg) / recent_avg * 100
        else:
            trend_value = change_rate

        status = "normal"
        if abs(trend_value) > 3.0:
            status = "critical"
        elif abs(trend_value) > 1.5:
            status = "warning"

        return CalculatedIndicator(
            name="trend_analysis",
            value=trend_value,
            status=status,
            trend=trend_direction,
            description=f"추세 강도: {trend_strength:.2f}%, 방향: {trend_direction}",
            timestamp=datetime.now()
        )

    def _calculate_market_momentum(self, indices_data: Dict[str, Any]) -> CalculatedIndicator:
        """시장 전체 모멘텀 계산"""

        try:
            total_change = 0
            count = 0

            for index_name, index_data in indices_data.items():
                if "change_rate" in index_data:
                    total_change += index_data["change_rate"]
                    count += 1

            if count == 0:
                momentum_value = 0
            else:
                momentum_value = total_change / count

            # 모멘텀 상태 평가
            status = "normal"
            trend = "stable"

            if momentum_value > 1.0:
                status = "normal"
                trend = "up"
            elif momentum_value > 2.0:
                status = "warning"
                trend = "up"
            elif momentum_value < -1.0:
                status = "warning"
                trend = "down"
            elif momentum_value < -2.0:
                status = "critical"
                trend = "down"

            description = f"시장 전체 모멘텀: {momentum_value:.2f}%"

            return CalculatedIndicator(
                name="market_momentum",
                value=momentum_value,
                status=status,
                trend=trend,
                description=description,
                timestamp=datetime.now()
            )

        except Exception as e:
            logger.warning(f"Market momentum calculation failed: {e}")
            return CalculatedIndicator(
                name="market_momentum",
                value=0.0,
                status="normal",
                trend="stable",
                description="모멘텀 계산 실패",
                timestamp=datetime.now()
            )

    async def _calculate_volatility_indicators(
        self,
        volatility_data: Dict[str, Any]
    ) -> Dict[str, CalculatedIndicator]:
        """변동성 지표 계산"""

        indicators = {}

        try:
            metrics = volatility_data.get("metrics", {})

            # 평균 변동성 계산
            if metrics:
                volatility_rates = [
                    metric["volatility_rate"] for metric in metrics.values()
                    if "volatility_rate" in metric
                ]

                if volatility_rates:
                    avg_volatility = statistics.mean(volatility_rates)
                    max_volatility = max(volatility_rates)

                    # 변동성 상태 평가
                    status = self._get_status_by_threshold("volatility_rate", avg_volatility)

                    trend = "stable"
                    if avg_volatility > 2.5:
                        trend = "up"
                    elif avg_volatility < 1.0:
                        trend = "down"

                    indicators["average_volatility"] = CalculatedIndicator(
                        name="average_volatility",
                        value=avg_volatility,
                        status=status,
                        trend=trend,
                        description=f"평균 변동성: {avg_volatility:.2f}%, 최대: {max_volatility:.2f}%",
                        timestamp=datetime.now()
                    )

            # 시장 조건 평가
            market_condition = volatility_data.get("market_condition", "unknown")
            condition_value = {"low_volatility": 1, "normal_volatility": 2, "high_volatility": 3, "unknown": 2}[market_condition]

            indicators["volatility_condition"] = CalculatedIndicator(
                name="volatility_condition",
                value=condition_value,
                status="normal" if condition_value == 2 else ("warning" if condition_value == 3 else "normal"),
                trend="stable",
                description=f"시장 변동성 상태: {market_condition}",
                timestamp=datetime.now()
            )

        except Exception as e:
            logger.warning(f"Volatility indicator calculation failed: {e}")

        return indicators

    async def _calculate_breadth_indicators(
        self,
        breadth_data: Dict[str, Any]
    ) -> Dict[str, CalculatedIndicator]:
        """시장 폭 지표 계산"""

        indicators = {}

        try:
            up_stocks = breadth_data.get("up_stocks", 0)
            down_stocks = breadth_data.get("down_stocks", 0)
            total_stocks = breadth_data.get("total_stocks", 1)
            ad_ratio = breadth_data.get("advance_decline_ratio", 1.0)

            # 상승 종목 비율
            up_ratio = (up_stocks / total_stocks) * 100 if total_stocks > 0 else 0

            status = "normal"
            trend = "stable"

            if up_ratio > 60:
                status = "normal"
                trend = "up"
            elif up_ratio > 70:
                status = "warning"
                trend = "up"
            elif up_ratio < 40:
                status = "warning"
                trend = "down"
            elif up_ratio < 30:
                status = "critical"
                trend = "down"

            indicators["market_breadth"] = CalculatedIndicator(
                name="market_breadth",
                value=up_ratio,
                status=status,
                trend=trend,
                description=f"상승 종목 비율: {up_ratio:.1f}% ({up_stocks}/{total_stocks})",
                timestamp=datetime.now()
            )

            # 상승/하락 비율
            ad_status = self._get_status_by_threshold("advance_decline_ratio", ad_ratio)
            ad_trend = "up" if ad_ratio > 1.2 else ("down" if ad_ratio < 0.8 else "stable")

            indicators["advance_decline_ratio"] = CalculatedIndicator(
                name="advance_decline_ratio",
                value=ad_ratio,
                status=ad_status,
                trend=ad_trend,
                description=f"상승/하락 비율: {ad_ratio:.2f}",
                timestamp=datetime.now()
            )

        except Exception as e:
            logger.warning(f"Breadth indicator calculation failed: {e}")

        return indicators

    async def _calculate_market_stress(
        self,
        indicators: Dict[str, CalculatedIndicator]
    ) -> CalculatedIndicator:
        """복합 시장 스트레스 지표 계산"""

        try:
            stress_factors = []

            # 각 지표의 스트레스 기여도 계산
            for indicator in indicators.values():
                stress_contribution = 0

                if indicator.status == "warning":
                    stress_contribution = 0.3
                elif indicator.status == "critical":
                    stress_contribution = 0.6

                # 하락 추세일 때 스트레스 가중
                if indicator.trend == "down":
                    stress_contribution *= 1.5

                stress_factors.append(stress_contribution)

            # 전체 스트레스 레벨 계산 (0-1 범위)
            if stress_factors:
                stress_level = min(statistics.mean(stress_factors), 1.0)
            else:
                stress_level = 0.0

            status = self._get_status_by_threshold("market_stress", stress_level)

            trend = "stable"
            if stress_level > 0.7:
                trend = "up"
            elif stress_level < 0.3:
                trend = "down"

            description = f"시장 스트레스 레벨: {stress_level:.2f} ({'높음' if stress_level > 0.6 else '보통' if stress_level > 0.3 else '낮음'})"

            return CalculatedIndicator(
                name="market_stress",
                value=stress_level,
                status=status,
                trend=trend,
                description=description,
                timestamp=datetime.now()
            )

        except Exception as e:
            logger.warning(f"Market stress calculation failed: {e}")
            return CalculatedIndicator(
                name="market_stress",
                value=0.0,
                status="normal",
                trend="stable",
                description="스트레스 계산 실패",
                timestamp=datetime.now()
            )

    async def _calculate_overall_condition(
        self,
        indicators: Dict[str, CalculatedIndicator]
    ) -> CalculatedIndicator:
        """종합 시장 상태 평가"""

        try:
            # 각 상태별 가중치 계산
            status_weights = {"normal": 0, "warning": 0.5, "critical": 1}
            total_weight = 0
            total_indicators = 0

            for indicator in indicators.values():
                if indicator.name != "market_stress":  # 스트레스 지표는 제외 (중복 방지)
                    weight = status_weights.get(indicator.status, 0)
                    total_weight += weight
                    total_indicators += 1

            if total_indicators > 0:
                condition_score = total_weight / total_indicators
            else:
                condition_score = 0

            # 전체 상태 결정
            if condition_score < 0.3:
                overall_status = "normal"
                condition_text = "안정"
            elif condition_score < 0.6:
                overall_status = "warning"
                condition_text = "주의"
            else:
                overall_status = "critical"
                condition_text = "위험"

            # 추세 방향 결정
            up_trends = sum(1 for ind in indicators.values() if ind.trend == "up")
            down_trends = sum(1 for ind in indicators.values() if ind.trend == "down")

            if up_trends > down_trends:
                overall_trend = "up"
            elif down_trends > up_trends:
                overall_trend = "down"
            else:
                overall_trend = "stable"

            return CalculatedIndicator(
                name="market_condition",
                value=condition_score,
                status=overall_status,
                trend=overall_trend,
                description=f"종합 시장 상태: {condition_text} (점수: {condition_score:.2f})",
                timestamp=datetime.now()
            )

        except Exception as e:
            logger.warning(f"Overall condition calculation failed: {e}")
            return CalculatedIndicator(
                name="market_condition",
                value=0.0,
                status="normal",
                trend="stable",
                description="종합 평가 실패",
                timestamp=datetime.now()
            )

    def _get_status_by_threshold(self, indicator_name: str, value: float) -> str:
        """임계값 기반 상태 결정"""
        thresholds = self.indicator_thresholds.get(indicator_name, {})

        warning_threshold = thresholds.get("warning", float('inf'))
        critical_threshold = thresholds.get("critical", float('inf'))

        if value >= critical_threshold:
            return "critical"
        elif value >= warning_threshold:
            return "warning"
        else:
            return "normal"

    def _extract_historical_prices(
        self,
        index_name: str,
        historical_data: Optional[Dict[str, List[Dict]]]
    ) -> List[float]:
        """히스토리컬 데이터에서 가격 데이터 추출"""
        if not historical_data or index_name not in historical_data:
            return []

        try:
            prices = []
            for data_point in historical_data[index_name][-20:]:  # 최근 20개 데이터
                if "current_price" in data_point:
                    prices.append(float(data_point["current_price"]))
            return prices
        except Exception as e:
            logger.warning(f"Failed to extract historical prices for {index_name}: {e}")
            return []