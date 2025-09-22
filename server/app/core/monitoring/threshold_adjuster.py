"""
Dynamic Threshold Adjustment System
동적 임계값 조정 시스템
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class AdjustmentStrategy(Enum):
    """조정 전략"""
    CONSERVATIVE = "conservative"  # 보수적 (임계값 상향)
    BALANCED = "balanced"         # 균형 (기본값 유지)
    AGGRESSIVE = "aggressive"     # 공격적 (임계값 하향)
    TIME_BASED = "time_based"     # 시간 기반 자동 조정


@dataclass
class MarketCondition:
    """시장 상황"""
    total_rise_count: int      # 상승 종목 수
    total_stock_count: int     # 전체 종목 수
    average_change: float      # 평균 변동률
    volatility_index: float    # 변동성 지수
    volume_ratio: float        # 거래량 비율


@dataclass
class AdjustmentRecommendation:
    """조정 권장사항"""
    current_threshold: float
    recommended_threshold: float
    adjustment_reason: str
    confidence_score: float  # 0.0 - 1.0
    strategy: AdjustmentStrategy


class ThresholdAdjuster:
    """동적 임계값 조정기"""

    def __init__(self):
        # 기본 설정
        self.base_threshold = 2.0  # 기본 임계값 2%
        self.min_threshold = 0.5   # 최소 임계값 0.5%
        self.max_threshold = 5.0   # 최대 임계값 5%

        # 시간 기반 조정 계수
        self.time_adjustment_factors = {
            16: 1.0,   # 16:00-16:30: 기본값
            16.5: 0.9, # 16:30-17:00: 10% 감소
            17: 0.8,   # 17:00-17:30: 20% 감소
            17.5: 0.7  # 17:30-17:40: 30% 감소
        }

        # 시장 상황별 조정 계수
        self.market_adjustment_factors = {
            "bull": 0.8,    # 강세장: 임계값 낮춤
            "bear": 1.2,    # 약세장: 임계값 높임
            "neutral": 1.0, # 중립: 기본값
            "volatile": 0.9 # 변동성 높음: 약간 낮춤
        }

    def calculate_adjustment(
        self,
        current_threshold: float,
        market_condition: MarketCondition,
        current_time: datetime,
        strategy: AdjustmentStrategy = AdjustmentStrategy.BALANCED
    ) -> AdjustmentRecommendation:
        """임계값 조정 계산"""

        # 기본 임계값에서 시작
        new_threshold = current_threshold

        # 전략별 조정
        if strategy == AdjustmentStrategy.TIME_BASED:
            new_threshold = self._apply_time_based_adjustment(new_threshold, current_time)

        elif strategy == AdjustmentStrategy.CONSERVATIVE:
            new_threshold = self._apply_conservative_adjustment(new_threshold, market_condition)

        elif strategy == AdjustmentStrategy.AGGRESSIVE:
            new_threshold = self._apply_aggressive_adjustment(new_threshold, market_condition)

        elif strategy == AdjustmentStrategy.BALANCED:
            new_threshold = self._apply_balanced_adjustment(new_threshold, market_condition, current_time)

        # 임계값 범위 제한
        new_threshold = max(self.min_threshold, min(self.max_threshold, new_threshold))

        # 조정 이유 생성
        reason = self._generate_adjustment_reason(current_threshold, new_threshold, market_condition, strategy)

        # 신뢰도 점수 계산
        confidence = self._calculate_confidence_score(market_condition, strategy)

        return AdjustmentRecommendation(
            current_threshold=current_threshold,
            recommended_threshold=round(new_threshold, 2),
            adjustment_reason=reason,
            confidence_score=confidence,
            strategy=strategy
        )

    def get_market_condition_analysis(self, stock_data: List[Dict]) -> MarketCondition:
        """시장 상황 분석"""
        if not stock_data:
            return MarketCondition(0, 0, 0.0, 0.0, 1.0)

        total_count = len(stock_data)
        rise_count = sum(1 for stock in stock_data if stock.get("change_percent", 0) > 0)

        # 평균 변동률 계산
        total_change = sum(stock.get("change_percent", 0) for stock in stock_data)
        average_change = total_change / total_count if total_count > 0 else 0.0

        # 변동성 지수 계산 (표준편차 기반)
        if total_count > 1:
            mean_change = average_change
            variance = sum((stock.get("change_percent", 0) - mean_change) ** 2 for stock in stock_data) / total_count
            volatility_index = variance ** 0.5
        else:
            volatility_index = 0.0

        # 거래량 비율 (평균 대비)
        total_volume = sum(stock.get("volume", 0) for stock in stock_data if stock.get("volume", 0) > 0)
        avg_volume = total_volume / total_count if total_count > 0 else 0
        volume_ratio = min(2.0, max(0.5, avg_volume / 1000000))  # 100만주 기준

        return MarketCondition(
            total_rise_count=rise_count,
            total_stock_count=total_count,
            average_change=round(average_change, 2),
            volatility_index=round(volatility_index, 2),
            volume_ratio=round(volume_ratio, 2)
        )

    def get_suggested_strategies(self, market_condition: MarketCondition) -> List[Tuple[AdjustmentStrategy, str]]:
        """권장 전략 목록"""
        strategies = []

        # 시장 상황에 따른 전략 제안
        rise_ratio = market_condition.total_rise_count / market_condition.total_stock_count if market_condition.total_stock_count > 0 else 0

        if rise_ratio > 0.7:  # 70% 이상 상승
            strategies.append((AdjustmentStrategy.AGGRESSIVE, "대부분 종목이 상승 중 - 공격적 진입"))
        elif rise_ratio > 0.5:  # 50% 이상 상승
            strategies.append((AdjustmentStrategy.BALANCED, "시장 상승 추세 - 균형 전략"))
        elif rise_ratio < 0.3:  # 30% 미만 상승
            strategies.append((AdjustmentStrategy.CONSERVATIVE, "시장 약세 - 보수적 접근"))

        # 변동성에 따른 전략
        if market_condition.volatility_index > 3.0:
            strategies.append((AdjustmentStrategy.CONSERVATIVE, "높은 변동성 - 신중한 접근"))
        elif market_condition.volatility_index > 1.5:
            strategies.append((AdjustmentStrategy.BALANCED, "적당한 변동성 - 균형 전략"))

        # 기본 시간 기반 전략
        strategies.append((AdjustmentStrategy.TIME_BASED, "시간 경과에 따른 자동 조정"))

        return strategies[:3]  # 최대 3개 전략 제안

    def _apply_time_based_adjustment(self, threshold: float, current_time: datetime) -> float:
        """시간 기반 조정"""
        hour_minute = current_time.hour + current_time.minute / 60.0

        # 해당 시간대의 조정 계수 찾기
        factor = 1.0
        for time_key in sorted(self.time_adjustment_factors.keys(), reverse=True):
            if hour_minute >= time_key:
                factor = self.time_adjustment_factors[time_key]
                break

        return threshold * factor

    def _apply_conservative_adjustment(self, threshold: float, market_condition: MarketCondition) -> float:
        """보수적 조정 - 임계값 상향"""
        adjustment = 1.2  # 기본 20% 상향

        # 변동성이 높으면 더 보수적으로
        if market_condition.volatility_index > 2.0:
            adjustment += 0.1

        # 상승 종목이 적으면 더 보수적으로
        rise_ratio = market_condition.total_rise_count / market_condition.total_stock_count if market_condition.total_stock_count > 0 else 0
        if rise_ratio < 0.3:
            adjustment += 0.1

        return threshold * adjustment

    def _apply_aggressive_adjustment(self, threshold: float, market_condition: MarketCondition) -> float:
        """공격적 조정 - 임계값 하향"""
        adjustment = 0.8  # 기본 20% 하향

        # 상승 종목이 많으면 더 공격적으로
        rise_ratio = market_condition.total_rise_count / market_condition.total_stock_count if market_condition.total_stock_count > 0 else 0
        if rise_ratio > 0.7:
            adjustment -= 0.1

        # 평균 변동률이 높으면 더 공격적으로
        if market_condition.average_change > 2.0:
            adjustment -= 0.1

        return threshold * max(0.5, adjustment)  # 최소 50% 유지

    def _apply_balanced_adjustment(self, threshold: float, market_condition: MarketCondition, current_time: datetime) -> float:
        """균형 조정 - 시장 상황과 시간 모두 고려"""
        # 시간 기반 조정
        time_adjusted = self._apply_time_based_adjustment(threshold, current_time)

        # 시장 상황 조정
        rise_ratio = market_condition.total_rise_count / market_condition.total_stock_count if market_condition.total_stock_count > 0 else 0

        if rise_ratio > 0.6:
            market_factor = 0.9  # 10% 하향
        elif rise_ratio < 0.4:
            market_factor = 1.1  # 10% 상향
        else:
            market_factor = 1.0  # 유지

        return time_adjusted * market_factor

    def _generate_adjustment_reason(
        self,
        current: float,
        new: float,
        market_condition: MarketCondition,
        strategy: AdjustmentStrategy
    ) -> str:
        """조정 이유 생성"""
        change = new - current
        change_percent = (change / current) * 100 if current > 0 else 0

        reason_parts = []

        # 변화 방향 설명
        if abs(change_percent) < 1:
            reason_parts.append("임계값 유지")
        elif change > 0:
            reason_parts.append(f"임계값 {change_percent:.1f}% 상향 조정")
        else:
            reason_parts.append(f"임계값 {abs(change_percent):.1f}% 하향 조정")

        # 전략별 이유
        if strategy == AdjustmentStrategy.TIME_BASED:
            reason_parts.append("시간 경과에 따른 자동 조정")
        elif strategy == AdjustmentStrategy.CONSERVATIVE:
            reason_parts.append("보수적 접근으로 리스크 감소")
        elif strategy == AdjustmentStrategy.AGGRESSIVE:
            reason_parts.append("공격적 접근으로 기회 확대")

        # 시장 상황 반영
        rise_ratio = market_condition.total_rise_count / market_condition.total_stock_count if market_condition.total_stock_count > 0 else 0
        if rise_ratio > 0.7:
            reason_parts.append("강세장 대응")
        elif rise_ratio < 0.3:
            reason_parts.append("약세장 대응")

        return " - ".join(reason_parts)

    def _calculate_confidence_score(self, market_condition: MarketCondition, strategy: AdjustmentStrategy) -> float:
        """신뢰도 점수 계산"""
        base_confidence = 0.7

        # 데이터 품질에 따른 신뢰도
        if market_condition.total_stock_count > 100:
            base_confidence += 0.1
        elif market_condition.total_stock_count < 50:
            base_confidence -= 0.1

        # 변동성에 따른 신뢰도
        if market_condition.volatility_index > 3.0:
            base_confidence -= 0.1  # 높은 변동성은 예측 어려움
        elif market_condition.volatility_index < 1.0:
            base_confidence += 0.1  # 낮은 변동성은 예측 용이

        # 전략별 신뢰도
        if strategy == AdjustmentStrategy.TIME_BASED:
            base_confidence += 0.1  # 시간 기반은 안정적
        elif strategy == AdjustmentStrategy.BALANCED:
            base_confidence += 0.05  # 균형 전략은 무난

        return max(0.0, min(1.0, base_confidence))


# 글로벌 임계값 조정기 인스턴스
threshold_adjuster = ThresholdAdjuster()