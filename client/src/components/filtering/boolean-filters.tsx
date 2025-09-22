'use client';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface BooleanFiltersProps {
  filters: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
}

export function BooleanFilters({ filters, onChange }: BooleanFiltersProps) {
  const filterOptions = [
    {
      key: 'excludePennyStocks',
      label: '저가주 제외',
      description: '1,000원 이하 종목 제외'
    },
    {
      key: 'enableHighVolume',
      label: '고거래량 우선',
      description: '평균 대비 1.5배 이상 거래량'
    },
    {
      key: 'enablePositiveReturn',
      label: '상승 종목만',
      description: '당일 수익률 > 0%'
    },
    {
      key: 'enableLargeCap',
      label: '대형주 우선',
      description: '시가총액 1조원 이상'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filterOptions.map((option) => (
          <div key={option.key} className="flex items-center justify-between space-x-2">
            <div className="flex-1">
              <Label htmlFor={option.key} className="text-sm font-medium">
                {option.label}
              </Label>
              <p className="text-xs text-gray-500">{option.description}</p>
            </div>
            <Button
              variant={filters[option.key] ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(option.key, !filters[option.key])}
              className="min-w-[60px]"
            >
              {filters[option.key] ? "ON" : "OFF"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}