'use client';

import { ConditionSlider } from './condition-slider';
import { FilterConditions } from '@/types/trading';

interface AdvancedMomentumSlidersProps {
  conditions: FilterConditions;
  onChange: (updates: Partial<FilterConditions>) => void;
}

export function AdvancedMomentumSliders({
  conditions,
  onChange
}: AdvancedMomentumSlidersProps) {

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatRatio = (value: number) => {
    return `${value}%`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900">고급 모멘텀 조건</h3>
        <p className="text-sm text-gray-600">strategy.md 기반 정교한 모멘텀 분석 조건들입니다.</p>
      </div>

      <div className="space-y-4">
        {/* 후반부 상승률 (14:00-15:30) */}
        {conditions.minLateSessionReturn !== undefined && conditions.maxLateSessionReturn !== undefined && (
          <ConditionSlider
            label="후반부 상승률 (14:00-15:30)"
            value={[conditions.minLateSessionReturn, conditions.maxLateSessionReturn]}
            min={-1.0}
            max={5.0}
            step={0.1}
            format={formatPercentage}
            onChange={([min, max]) => onChange({
              minLateSessionReturn: min,
              maxLateSessionReturn: max
            })}
            description="후반부(14:00~15:30) 시간대 집중매매로 발생한 상승률. 모멘텀의 핵심 지표입니다."
            inputWidth="lg"
          />
        )}

        {/* 후반부 거래량 집중도 */}
        {conditions.minLateSessionVolumeRatio !== undefined && conditions.maxLateSessionVolumeRatio !== undefined && (
          <ConditionSlider
            label="후반부 거래량 집중도"
            value={[conditions.minLateSessionVolumeRatio, conditions.maxLateSessionVolumeRatio]}
            min={5}
            max={35}
            step={1}
            unit="%"
            format={formatRatio}
            onChange={([min, max]) => onChange({
              minLateSessionVolumeRatio: min,
              maxLateSessionVolumeRatio: max
            })}
            description="후반부 거래량이 일일 전체 거래량에서 차지하는 비중. 높을수록 집중매매 패턴입니다."
            inputWidth="lg"
          />
        )}

        {/* 시장 대비 상대 수익률 */}
        {conditions.minRelativeReturn !== undefined && conditions.maxRelativeReturn !== undefined && (
          <ConditionSlider
            label="시장 대비 상대 수익률"
            value={[conditions.minRelativeReturn, conditions.maxRelativeReturn]}
            min={-2.0}
            max={8.0}
            step={0.1}
            format={formatPercentage}
            onChange={([min, max]) => onChange({
              minRelativeReturn: min,
              maxRelativeReturn: max
            })}
            description="코스피/코스닥 지수 대비 개별 종목의 상대적 성과. 시장을 이기는 종목을 선별합니다."
            inputWidth="lg"
          />
        )}

        {/* VWAP 대비 종가 비율 */}
        {conditions.minVwapRatio !== undefined && conditions.maxVwapRatio !== undefined && (
          <ConditionSlider
            label="VWAP 대비 종가 프리미엄"
            value={[conditions.minVwapRatio, conditions.maxVwapRatio]}
            min={95}
            max={115}
            step={0.5}
            unit="%"
            format={formatRatio}
            onChange={([min, max]) => onChange({
              minVwapRatio: min,
              maxVwapRatio: max
            })}
            description="거래량 가중 평균가(VWAP) 대비 종가 비율. 100% 이상이면 매수세 우세를 의미합니다."
            inputWidth="lg"
          />
        )}
      </div>

      {/* 도움말 섹션 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">📊 고급 모멘텀 조건 해설</h4>
        <div className="text-xs text-blue-800 space-y-1">
          <p><strong>후반부 상승률:</strong> 장 마감 1.5시간 동안의 집중매매 패턴 분석</p>
          <p><strong>거래량 집중도:</strong> 정상 10-15% vs 모멘텀 종목 20%+ 차이</p>
          <p><strong>상대 수익률:</strong> 시장 흐름 대비 개별 종목의 독립적 강세</p>
          <p><strong>VWAP 프리미엄:</strong> 평균 매수가 대비 현재 매수세의 우위</p>
        </div>
      </div>
    </div>
  );
}