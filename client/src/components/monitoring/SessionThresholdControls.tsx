'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, TrendingUp, TrendingDown, Minus, Eye, Sparkles, AlertTriangle } from 'lucide-react';
import { monitoringAPI } from '@/lib/api';
import type {
  MonitoringTarget,
  AdjustmentStrategy,
  MarketCondition,
  ThresholdPreviewResponse
} from '@/types/monitoring';

interface SessionThresholdControlsProps {
  targets: MonitoringTarget[];
  onAdjustThreshold: (symbol: string, newThreshold: number) => Promise<void>;
  onAutoAdjust: (strategy: AdjustmentStrategy, applyAll: boolean, symbols?: string[]) => Promise<void>;
  loading?: boolean;
}

const STRATEGY_LABELS: Record<AdjustmentStrategy, string> = {
  conservative: '보수적 전략',
  balanced: '균형 전략',
  aggressive: '공격적 전략',
  time_based: '시간 기반',
  manual: '수동 조정'
};

export function SessionThresholdControls({
  targets,
  onAdjustThreshold,
  onAutoAdjust,
  loading = false
}: SessionThresholdControlsProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<AdjustmentStrategy>('time_based');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [preview, setPreview] = useState<ThresholdPreviewResponse | null>(null);
  const [suggestedStrategies, setSuggestedStrategies] = useState<Array<{
    strategy: string;
    description: string;
  }>>([]);
  const [marketCondition, setMarketCondition] = useState<MarketCondition | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load suggested strategies and market condition
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const response = await monitoringAPI.getSuggestedStrategies();
        setSuggestedStrategies(response.suggested_strategies);
        setMarketCondition(response.market_condition);
      } catch (err) {
        console.error('Failed to load strategy suggestions:', err);
      }
    };

    loadSuggestions();
  }, []);

  // Preview threshold adjustment
  const handlePreview = async () => {
    setIsLoadingPreview(true);
    setError(null);

    try {
      const response = await monitoringAPI.previewThresholdAdjustment(selectedStrategy);
      setPreview(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview adjustment');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Apply adjustment
  const handleApply = async () => {
    try {
      setError(null);

      const applyAll = selectedTargets.length === 0 || selectedTargets.length === targets.length;
      const symbols = applyAll ? undefined : selectedTargets;

      await onAutoAdjust(selectedStrategy, applyAll, symbols);
      setPreview(null); // Clear preview after application
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply adjustment');
    }
  };

  // Individual threshold adjustment
  const handleIndividualAdjust = async (symbol: string, newThreshold: number) => {
    try {
      setError(null);
      await onAdjustThreshold(symbol, newThreshold);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust threshold');
    }
  };

  // Target selection
  const toggleTargetSelection = (symbol: string) => {
    setSelectedTargets(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const selectAllTargets = () => {
    setSelectedTargets(targets.map(t => t.symbol));
  };

  const clearSelection = () => {
    setSelectedTargets([]);
  };

  const getChangeColor = (changePercent: number) => {
    if (changePercent > 0) return 'text-green-600';
    if (changePercent < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (changePercent: number) => {
    if (changePercent > 0) return <TrendingUp className="h-4 w-4" />;
    if (changePercent < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          동적 임계값 조정
        </CardTitle>
        <CardDescription>
          시장 상황과 시간에 따라 매수 임계값을 자동으로 조정합니다
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Market Condition */}
        {marketCondition && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">현재 시장 상황</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="text-center p-2 border rounded">
                <div className="font-medium">{marketCondition.total_rise_count}</div>
                <div className="text-muted-foreground">상승 종목</div>
              </div>
              <div className="text-center p-2 border rounded">
                <div className="font-medium">{marketCondition.average_change.toFixed(2)}%</div>
                <div className="text-muted-foreground">평균 변동률</div>
              </div>
              <div className="text-center p-2 border rounded">
                <div className="font-medium">{marketCondition.volatility_index.toFixed(2)}</div>
                <div className="text-muted-foreground">변동성 지수</div>
              </div>
              <div className="text-center p-2 border rounded">
                <div className="font-medium">{marketCondition.volume_ratio.toFixed(2)}</div>
                <div className="text-muted-foreground">거래량 비율</div>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Strategies */}
        {suggestedStrategies.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              권장 전략
            </Label>
            <div className="space-y-2">
              {suggestedStrategies.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedStrategy(suggestion.strategy as AdjustmentStrategy)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant={selectedStrategy === suggestion.strategy ? "default" : "outline"}>
                        {STRATEGY_LABELS[suggestion.strategy as AdjustmentStrategy]}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {suggestion.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategy Selection and Preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label>조정 전략</Label>
              <Select
                value={selectedStrategy}
                onValueChange={(value) => setSelectedStrategy(value as AdjustmentStrategy)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="조정 전략 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">보수적 전략</SelectItem>
                  <SelectItem value="balanced">균형 전략</SelectItem>
                  <SelectItem value="aggressive">공격적 전략</SelectItem>
                  <SelectItem value="time_based">시간 기반</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={isLoadingPreview || loading}
              >
                <Eye className="h-4 w-4 mr-2" />
                {isLoadingPreview ? '계산 중...' : '미리보기'}
              </Button>
            </div>
          </div>

          {/* Target Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">적용 대상</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllTargets}>
                  전체 선택
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  선택 해제
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedTargets.length === 0 ? '모든 종목에 적용' : `${selectedTargets.length}개 종목에 적용`}
            </div>
          </div>

          {/* Apply Button */}
          <Button
            onClick={handleApply}
            disabled={loading || !preview}
            className="w-full"
          >
            {loading ? '적용 중...' : '조정 적용'}
          </Button>
        </div>

        {/* Preview Results */}
        {preview && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">조정 미리보기</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {preview.previews.map((item) => (
                <div key={item.symbol} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium">{item.stock_name}</div>
                      <div className="text-sm text-muted-foreground">{item.symbol}</div>
                    </div>
                    <div className={`text-sm font-medium ${getConfidenceColor(item.confidence_score)}`}>
                      신뢰도: {Math.round(item.confidence_score * 100)}%
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {item.current_threshold.toFixed(1)}% → {item.recommended_threshold.toFixed(1)}%
                    </span>
                    <Badge variant="outline">
                      {item.current_threshold < item.recommended_threshold ? '+' : ''}
                      {(item.recommended_threshold - item.current_threshold).toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.adjustment_reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Individual Target Adjustments */}
        <div className="space-y-4">
          <Label>개별 종목 조정</Label>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {targets.map((target) => (
              <div
                key={target.symbol}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTargets.includes(target.symbol) ? 'bg-muted/50 border-primary' : ''
                }`}
                onClick={() => toggleTargetSelection(target.symbol)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-medium">{target.stock_name}</div>
                    <div className="text-sm text-muted-foreground">{target.symbol}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      ₩{target.current_price.toLocaleString()}
                    </div>
                    <div className={`text-sm flex items-center gap-1 ${getChangeColor(target.change_percent)}`}>
                      {getChangeIcon(target.change_percent)}
                      {target.change_percent > 0 ? '+' : ''}{target.change_percent.toFixed(2)}%
                    </div>
                  </div>
                  {target.is_triggered && (
                    <Badge variant="default" className="ml-2">
                      신호 발생
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">매수 임계값</Label>
                    <Badge variant="outline">
                      {target.buy_threshold.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[target.buy_threshold]}
                      onValueChange={(value) => handleIndividualAdjust(target.symbol, value[0])}
                      min={0.5}
                      max={5.0}
                      step={0.1}
                      className="flex-1"
                      disabled={loading}
                    />
                    <span className="min-w-16 text-sm font-mono">
                      {target.buy_threshold.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strategy Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• <strong>보수적</strong>: 임계값을 높여 신중한 매수 (리스크 감소)</p>
          <p>• <strong>균형</strong>: 시장 상황과 시간을 모두 고려한 조정</p>
          <p>• <strong>공격적</strong>: 임계값을 낮춰 적극적 매수 (기회 확대)</p>
          <p>• <strong>시간 기반</strong>: 시간 경과에 따라 단계별 자동 조정</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default SessionThresholdControls;