'use client';

import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ConditionSliderProps {
  label: string;
  value: [number, number];
  min: number;
  max: number;
  step: number;
  unit?: string;
  format?: (value: number) => string;
  onChange: (value: [number, number]) => void;
  description?: string;
  inputWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function ConditionSlider({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  format,
  onChange,
  description,
  inputWidth = 'md'
}: ConditionSliderProps) {

  const formatValue = (val: number) => {
    if (format) return format(val);
    return `${val.toLocaleString()}${unit}`;
  };

  // Dynamic input width based on prop
  const getInputWidth = () => {
    switch (inputWidth) {
      case 'sm': return 'w-28'; // 112px (increased from 80px)
      case 'md': return 'w-32'; // 128px (increased from 112px)
      case 'lg': return 'w-40'; // 160px (increased from 144px)
      case 'xl': return 'w-48'; // 192px (increased from 176px)
      default: return 'w-32';
    }
  };

  const handleMinChange = (newMin: string) => {
    const numValue = parseFloat(newMin) || min;
    // step에 따라 소수점 처리 결정
    const roundedValue = step >= 1 ? Math.round(numValue) : Math.round(numValue * 10) / 10;
    if (roundedValue <= value[1] && roundedValue >= min && roundedValue <= max) {
      onChange([roundedValue, value[1]]);
    }
  };

  const handleMaxChange = (newMax: string) => {
    const numValue = parseFloat(newMax) || max;
    // step에 따라 소수점 처리 결정
    const roundedValue = step >= 1 ? Math.round(numValue) : Math.round(numValue * 10) / 10;
    if (roundedValue >= value[0] && roundedValue >= min && roundedValue <= max) {
      onChange([value[0], roundedValue]);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-slate-50/50 to-gray-50/50 rounded-lg border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-gray-900">{label}</Label>
          <div className="px-3 py-1.5 bg-blue-100 border-2 border-blue-300 rounded-lg text-sm font-bold text-blue-800 shadow-sm">
            {formatValue(value[0])} - {formatValue(value[1])}
          </div>
        </div>
        {description && (
          <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="px-2">
          <Slider
            value={value}
            onValueChange={onChange}
            min={min}
            max={max}
            step={step}
            className="w-full"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="flex items-center space-x-2">
            <Label className="text-xs font-medium text-gray-600 whitespace-nowrap">Min:</Label>
            <Input
              type="number"
              value={step >= 1 ? Math.round(value[0]).toString() : Number(value[0]).toFixed(1)}
              onChange={(e) => handleMinChange(e.target.value)}
              className={`${getInputWidth()} h-8 text-xs font-mono border-gray-300 focus:border-blue-500 focus:ring-blue-500/20`}
              min={min}
              max={max}
              step={step}
              suppressHydrationWarning={true}
            />
          </div>

          <div className="flex-1 text-center">
            <div className="text-xs text-gray-600 font-medium bg-gray-100 rounded px-2 py-1">
              Range: {formatValue(max - min)}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Label className="text-xs font-medium text-gray-600 whitespace-nowrap">Max:</Label>
            <Input
              type="number"
              value={step >= 1 ? Math.round(value[1]).toString() : Number(value[1]).toFixed(1)}
              onChange={(e) => handleMaxChange(e.target.value)}
              className={`${getInputWidth()} h-8 text-xs font-mono border-gray-300 focus:border-blue-500 focus:ring-blue-500/20`}
              min={min}
              max={max}
              step={step}
              suppressHydrationWarning={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}