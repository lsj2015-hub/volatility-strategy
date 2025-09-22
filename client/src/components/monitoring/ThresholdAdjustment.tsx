/**
 * ThresholdAdjustment - 실시간 임계값 조정 컴포넌트
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, TrendingUp, AlertTriangle, RotateCcw, Check } from 'lucide-react';

interface ThresholdSettings {
  currentThreshold: number;
  defaultThreshold: number;
  minThreshold: number;
  maxThreshold: number;
  step: number;
}

interface AdjustmentPreset {
  name: string;
  description: string;
  threshold: number;
  color: string;
}

interface ThresholdAdjustmentProps {
  settings: ThresholdSettings;
  presets?: AdjustmentPreset[];
  onThresholdChange: (newThreshold: number) => void;
  onApplyPreset?: (preset: AdjustmentPreset) => void;
  onReset?: () => void;
  disabled?: boolean;
}

const DEFAULT_PRESETS: AdjustmentPreset[] = [
  {
    name: '보수적',
    description: '안정적인 3% 상승 시 매수',
    threshold: 3.0,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    name: '균형',
    description: '일반적인 2% 상승 시 매수',
    threshold: 2.0,
    color: 'bg-green-100 text-green-800'
  },
  {
    name: '공격적',
    description: '빠른 1% 상승 시 매수',
    threshold: 1.0,
    color: 'bg-red-100 text-red-800'
  },
  {
    name: '초공격적',
    description: '즉시 0.5% 상승 시 매수',
    threshold: 0.5,
    color: 'bg-purple-100 text-purple-800'
  }
];

export default function ThresholdAdjustment({
  settings,
  presets = DEFAULT_PRESETS,
  onThresholdChange,
  onApplyPreset,
  onReset,
  disabled = false
}: ThresholdAdjustmentProps) {
  const [tempThreshold, setTempThreshold] = useState(settings.currentThreshold);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSliderChange = (value: number[]) => {
    setTempThreshold(value[0]);
  };

  const handleApply = () => {
    onThresholdChange(tempThreshold);
    setIsDialogOpen(false);
  };

  const handlePresetClick = (preset: AdjustmentPreset) => {
    setTempThreshold(preset.threshold);
    if (onApplyPreset) {
      onApplyPreset(preset);
    }
  };

  const handleReset = () => {
    setTempThreshold(settings.defaultThreshold);
    if (onReset) {
      onReset();
    }
  };

  const getThresholdStatus = (threshold: number) => {
    if (threshold >= 3.0) return { label: '보수적', color: 'bg-blue-100 text-blue-800' };
    if (threshold >= 2.0) return { label: '균형', color: 'bg-green-100 text-green-800' };
    if (threshold >= 1.0) return { label: '공격적', color: 'bg-red-100 text-red-800' };
    return { label: '초공격적', color: 'bg-purple-100 text-purple-800' };
  };

  const currentStatus = getThresholdStatus(settings.currentThreshold);
  const tempStatus = getThresholdStatus(tempThreshold);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            임계값 조정
          </div>
          <Badge className={currentStatus.color}>
            {currentStatus.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 현재 설정 표시 */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">현재 매수 임계값</span>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xl font-bold text-green-600">
                {settings.currentThreshold.toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            시간외 거래에서 이 수치 이상 상승하면 자동으로 매수 주문을 실행합니다.
          </p>
        </div>

        {/* 빠른 조정 버튼들 */}
        <div className="space-y-3">
          <div className="text-sm font-medium">빠른 조정</div>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <Dialog key={preset.name} open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    className="h-auto p-3 text-left"
                    onClick={() => {
                      setTempThreshold(preset.threshold);
                      setIsDialogOpen(true);
                    }}
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{preset.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {preset.threshold}%
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {preset.description}
                      </div>
                    </div>
                  </Button>
                </DialogTrigger>
              </Dialog>
            ))}
          </div>
        </div>

        {/* 상세 조정 다이얼로그 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="default"
              className="w-full"
              disabled={disabled}
            >
              <Settings className="mr-2 h-4 w-4" />
              상세 조정
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>매수 임계값 조정</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* 슬라이더 조정 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">임계값</span>
                  <div className="flex items-center space-x-2">
                    <Badge className={tempStatus.color}>
                      {tempStatus.label}
                    </Badge>
                    <span className="text-lg font-bold">
                      {tempThreshold.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <Slider
                  value={[tempThreshold]}
                  onValueChange={handleSliderChange}
                  min={settings.minThreshold}
                  max={settings.maxThreshold}
                  step={settings.step}
                  className="w-full"
                />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{settings.minThreshold}%</span>
                  <span>{settings.maxThreshold}%</span>
                </div>
              </div>

              {/* 프리셋 선택 */}
              <div className="space-y-2">
                <span className="text-sm font-medium">프리셋 선택</span>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.name}
                      variant={tempThreshold === preset.threshold ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePresetClick(preset)}
                      className="h-auto p-2"
                    >
                      <div className="text-center">
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-xs">{preset.threshold}%</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* 경고 메시지 */}
              {tempThreshold !== settings.currentThreshold && (
                <div className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-yellow-800">임계값 변경 주의</div>
                    <div className="text-yellow-700 mt-1">
                      {tempThreshold < settings.currentThreshold
                        ? "더 낮은 임계값으로 변경하면 매수 기회가 증가하지만 리스크도 높아집니다."
                        : "더 높은 임계값으로 변경하면 매수 기회가 줄어들 수 있습니다."
                      }
                    </div>
                  </div>
                </div>
              )}

              {/* 액션 버튼들 */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  기본값
                </Button>
                <Button
                  onClick={handleApply}
                  className="flex-1"
                  disabled={tempThreshold === settings.currentThreshold}
                >
                  <Check className="mr-2 h-4 w-4" />
                  적용
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 리셋 버튼 */}
        {settings.currentThreshold !== settings.defaultThreshold && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={disabled}
            className="w-full"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            기본값으로 복원 ({settings.defaultThreshold}%)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}