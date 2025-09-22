'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ConditionToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export function ConditionToggle({
  label,
  checked,
  onChange,
  description,
  disabled = false
}: ConditionToggleProps) {
  return (
    <div className={`p-4 rounded-lg border transition-all duration-200 ${
      checked
        ? 'bg-blue-50 border-blue-200 shadow-sm'
        : 'bg-white border-gray-200 hover:border-gray-300'
    } ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between space-x-4">
        <div className="space-y-1 flex-1">
          <Label className={`text-sm font-semibold ${
            disabled ? 'text-muted-foreground' : checked ? 'text-blue-900' : 'text-gray-900'
          }`}>
            {label}
          </Label>
          {description && (
            <p className={`text-xs leading-relaxed ${
              checked ? 'text-blue-700' : 'text-gray-600'
            }`}>
              {description}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 pt-0.5">
          <Switch
            checked={checked}
            onCheckedChange={onChange}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

interface BooleanFilterProps {
  filters: {
    [key: string]: boolean;
  };
  onChange: (key: string, value: boolean) => void;
}

export function BooleanFilters({ filters, onChange }: BooleanFilterProps) {
  const filterDefinitions = [
    {
      key: 'excludePennyStocks',
      label: '저가주 제외',
      description: '1,000원 이하의 초저가 주식을 제외. KIS API로 실시간 가격 확인 가능. 투기성이 높고 상장폐지 리스크를 피합니다.'
    },
    {
      key: 'enableHighVolume',
      label: '고거래량 종목 우선',
      description: '평균 대비 1.5배 이상 거래량 증가 종목만 선별. KIS API의 과거 20일 평균 대비 계산. 관심 증가와 유동성을 확인합니다.'
    },
    {
      key: 'enablePositiveReturn',
      label: '상승 종목만 선택',
      description: '당일 수익률이 0% 이상인 주식만 필터링. 하락 중인 주식의 반등 기대보다 상승 중인 주식의 지속성에 다드립니다.'
    },
    {
      key: 'enableLargeCap',
      label: '대형주 우선',
      description: '시가총액 1,000억원 이상 대형주만 선별. 안정성이 높고 유동성이 좋으며, 기관 투자자들의 관심도가 높습니다.'
    }
  ];

  return (
    <div className="space-y-3">
      {filterDefinitions.map((filter) => (
        <ConditionToggle
          key={filter.key}
          label={filter.label}
          description={filter.description}
          checked={filters[filter.key] || false}
          onChange={(checked) => onChange(filter.key, checked)}
        />
      ))}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>실현 가능성:</strong> 모든 필터는 KIS Open API 데이터로 실시간 계산 가능합니다.
        </p>
      </div>
    </div>
  );
}