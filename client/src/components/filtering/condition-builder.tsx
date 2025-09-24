'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConditionSlider } from './condition-slider';
import { PresetButtonsEnhanced } from './preset-buttons-enhanced';
import { AdvancedMomentumSliders } from './advanced-momentum-sliders';
import { FilterConditions } from '@/types/trading';
import { Settings, Play } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings';

interface ConditionBuilderProps {
  onFilterRun: (conditions: FilterConditions) => void;
  onConditionsChange?: (conditions: FilterConditions) => void;
  initialConditions?: FilterConditions;
  isLoading?: boolean;
}


export function ConditionBuilder({
  onFilterRun,
  onConditionsChange,
  initialConditions,
  isLoading = false
}: ConditionBuilderProps) {
  const { activePreset, defaultConditions } = useSettingsStore();
  const [currentActivePreset, setCurrentActivePreset] = useState<string | undefined>();

  const [conditions, setConditions] = useState<FilterConditions>(() => {
    const baseConditions = initialConditions || defaultConditions;
    // Ensure advanced momentum properties are always defined with defaults
    return {
      ...baseConditions,
      minLateSessionReturn: baseConditions.minLateSessionReturn ?? 0.5,
      maxLateSessionReturn: baseConditions.maxLateSessionReturn ?? 3.0,
      minLateSessionVolumeRatio: baseConditions.minLateSessionVolumeRatio ?? 10,
      maxLateSessionVolumeRatio: baseConditions.maxLateSessionVolumeRatio ?? 25,
      minRelativeReturn: baseConditions.minRelativeReturn ?? 1.0,
      maxRelativeReturn: baseConditions.maxRelativeReturn ?? 5.0,
      minVwapRatio: baseConditions.minVwapRatio ?? 101,
      maxVwapRatio: baseConditions.maxVwapRatio ?? 105
    };
  });


  // Memoize initial conditions to prevent unnecessary re-renders
  const memoizedInitialConditions = useMemo(() => {
    const baseConditions = initialConditions || defaultConditions;
    // Ensure advanced momentum properties are always defined with defaults
    return {
      ...baseConditions,
      minLateSessionReturn: baseConditions.minLateSessionReturn ?? 0.5,
      maxLateSessionReturn: baseConditions.maxLateSessionReturn ?? 3.0,
      minLateSessionVolumeRatio: baseConditions.minLateSessionVolumeRatio ?? 10,
      maxLateSessionVolumeRatio: baseConditions.maxLateSessionVolumeRatio ?? 25,
      minRelativeReturn: baseConditions.minRelativeReturn ?? 1.0,
      maxRelativeReturn: baseConditions.maxRelativeReturn ?? 5.0,
      minVwapRatio: baseConditions.minVwapRatio ?? 101,
      maxVwapRatio: baseConditions.maxVwapRatio ?? 105
    };
  }, [initialConditions, defaultConditions]);


  // Only update conditions when initial values actually change
  useEffect(() => {
    // 설정에서 가져온 값을 그대로 사용 (이미 억원 단위로 저장됨)
    setConditions(memoizedInitialConditions);
  }, [memoizedInitialConditions]);


  // activePreset 변경 감지하여 currentActivePreset 동기화
  useEffect(() => {
    setCurrentActivePreset(activePreset || undefined);
  }, [activePreset]);

  // Debounced callback for condition changes
  const debouncedOnConditionsChange = useCallback(
    (newConditions: FilterConditions) => {
      onConditionsChange?.(newConditions);
    },
    [onConditionsChange]
  );

  // Notify parent of condition changes with minimal debounce for slider responsiveness
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      debouncedOnConditionsChange(conditions);
    }, 16); // ~1 frame at 60fps for smoother updates

    return () => clearTimeout(timeoutId);
  }, [conditions, debouncedOnConditionsChange]);

  const handlePresetApply = (presetData: FilterConditions) => {
    setConditions(presetData);
    setCurrentActivePreset(activePreset || undefined);
  };

  const formatVolumeInEok = (value: number | undefined) => {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString(); // 억원 단위 값을 콤마로 구분하여 표시
  };

  const formatPrice = (value: number | undefined) => {
    if (value === undefined || value === null) return '0';
    return `${value.toLocaleString()}`;
  };


  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-lg font-semibold">필터 설정</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => onFilterRun(conditions)}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 border-2 border-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Play className="h-4 w-4 mr-2" />
            {isLoading ? '실행 중...' : '필터 실행'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Numeric Conditions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-1 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">수치 조건 설정</h3>
            <p className="text-sm text-gray-600">주식 선별을 위한 기본 조건들을 설정하세요. 각 조건은 투자 전략에 따라 조정 가능합니다.</p>
          </div>

          <div className="space-y-4">
            <ConditionSlider
              label="거래대금 (억원)"
              value={[conditions.minVolume, conditions.maxVolume]}
              min={1} // 1억원
              max={2000} // 2000억원
              step={10} // 10억 단위
              unit=" 억원"
              format={formatVolumeInEok}
              onChange={([min, max]) => setConditions(prev => ({
                ...prev,
                minVolume: min,
                maxVolume: max
              }))}
              description="하루 동안 거래된 총 금액 범위 (KIS API 실제 데이터 기반). 거래대금이 높을수록 활발한 매매가 이루어지는 종목입니다."
              inputWidth="lg"
            />

            <ConditionSlider
              label="주가 범위"
              value={[conditions.minPrice, conditions.maxPrice]}
              min={100}
              max={500000}
              step={100}
              unit=" KRW"
              format={formatPrice}
              onChange={([min, max]) => setConditions(prev => ({ ...prev, minPrice: min, maxPrice: max }))}
              description="주식 한 주당 가격 범위. 투자 금액과 포트폴리오 구성에 영향을 줍니다."
              inputWidth="lg"
            />

            <ConditionSlider
              label="모멘텀 점수 (간소화)"
              value={[conditions.minMomentum, conditions.maxMomentum]}
              min={0}
              max={100}
              step={5}
              onChange={([min, max]) => setConditions(prev => ({ ...prev, minMomentum: min, maxMomentum: max }))}
              description="당일 수익률 + 거래량 비율 + 체결강도를 종합한 점수 (0-100). KIS API 데이터로 실시간 계산됩니다."
            />

            <ConditionSlider
              label="체결강도"
              value={[conditions.minStrength, conditions.maxStrength]}
              min={50}
              max={200}
              step={5}
              onChange={([min, max]) => setConditions(prev => ({ ...prev, minStrength: min, maxStrength: max }))}
              description="매수세 대비 매도세 강도 (KIS API 직접 제공). 100 이상이면 매수세 우세, 높을수록 상승 압력이 강합니다."
            />
            <ConditionSlider
              label="시가총액 (억원)"
              value={[conditions.minMarketCap || 1000, conditions.maxMarketCap || 100000]}
              min={100} // 100억원
              max={500000} // 50조원
              step={100}
              unit=" 억원"
              format={formatVolumeInEok}
              onChange={([min, max]) => setConditions(prev => ({
                ...prev,
                minMarketCap: min,
                maxMarketCap: max
              }))}
              description="기업의 시가총액 범위. 대형주(1조 이상), 중형주(2천억-1조), 소형주(2천억 이하)로 구분됩니다."
              inputWidth="lg"
            />
          </div>


          {/* 🆕 고급 모멘텀 조건 섹션 */}
          <div className="space-y-4 mt-8">
            <div className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-lg border border-blue-200/60 shadow-sm">
              <AdvancedMomentumSliders
                conditions={conditions}
                onChange={(updates) => setConditions(prev => ({ ...prev, ...updates }))}
              />
            </div>
          </div>
        </div>

        {/* Presets and Summary */}
        <div className="space-y-4">
          <PresetButtonsEnhanced
            onPresetApply={handlePresetApply}
            activePreset={currentActivePreset}
            currentConditions={conditions}
          />

          {/* Current Settings Summary */}
          <Card>
            <CardHeader>
              <CardTitle>현재 설정 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">거래대금 범위</span>
                <span>{formatVolumeInEok(conditions.minVolume || 0)} - {formatVolumeInEok(conditions.maxVolume || 0)} 억원</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">주가 범위</span>
                <span>{formatPrice(conditions.minPrice || 0)} - {formatPrice(conditions.maxPrice || 0)} KRW</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">모멘텀</span>
                <span>{conditions.minMomentum || 0} - {conditions.maxMomentum || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">체결강도</span>
                <span>{conditions.minStrength || 0} - {conditions.maxStrength || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">시가총액</span>
                <span>{formatVolumeInEok(conditions.minMarketCap || 1000)} - {formatVolumeInEok(conditions.maxMarketCap || 100000)} 억원</span>
              </div>

              {/* 🆕 고급 모멘텀 조건 요약 (옵셔널 필드들만 표시) */}
              {conditions.minLateSessionReturn !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">후반부 상승률</span>
                  <span>{conditions.minLateSessionReturn.toFixed(1)}% - {conditions.maxLateSessionReturn?.toFixed(1)}%</span>
                </div>
              )}
              {conditions.minRelativeReturn !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">상대 수익률</span>
                  <span>{conditions.minRelativeReturn.toFixed(1)}% - {conditions.maxRelativeReturn?.toFixed(1)}%</span>
                </div>
              )}
              {conditions.minVwapRatio !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VWAP 비율</span>
                  <span>{conditions.minVwapRatio}% - {conditions.maxVwapRatio}%</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}