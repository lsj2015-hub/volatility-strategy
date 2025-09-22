/**
 * Filtering 페이지 - 주식 필터링 인터페이스
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConditionBuilder } from '@/components/filtering/condition-builder';
import { StockResultsTable } from '@/components/filtering/stock-results-table';
import { StockScoring } from '@/components/filtering/stock-scoring';
import { FilterSummary } from '@/components/filtering/filter-summary';
import { FilterConditions, FilteredStock } from '@/types/trading';
import { useRouter } from 'next/navigation';
import { useHydratedSettingsStore } from '@/hooks/useHydratedStore';
import { Settings, RefreshCw } from 'lucide-react';

// Mock data for demonstration
const mockFilteredStocks: FilteredStock[] = [
  {
    symbol: 'KOSPI200',
    name: 'KOSPI 200 Index ETF',
    score: 87.5,
    price: 45000,
    volume: 1200, // 1200억원 (12조)
    momentum: 78.2,
    strength: 120,
    marketCap: 50000, // 5조원
    dailyReturn: 2.1,
    volumeRatio: 2.5,
    sector: 'ETF',
    reasons: ['High volume', 'Strong momentum', 'Technical breakout']
  },
  {
    symbol: 'SAMSUNG',
    name: 'Samsung Electronics',
    score: 85.3,
    price: 68000,
    volume: 2500, // 2500억원 (25조)
    momentum: 72.8,
    strength: 115,
    marketCap: 400000, // 40조원
    dailyReturn: 1.8,
    volumeRatio: 2.2,
    sector: 'Technology',
    reasons: ['Market leader', 'Volume spike', 'Earnings growth']
  },
  {
    symbol: 'HYNIX',
    name: 'SK Hynix',
    score: 76.8,
    price: 125000,
    volume: 800, // 800억원 (8조)
    momentum: 81.5,
    strength: 125,
    marketCap: 90000, // 9조원
    dailyReturn: 3.2,
    volumeRatio: 3.1,
    sector: 'Semiconductor',
    reasons: ['Sector rotation', 'Technical strength']
  },
  {
    symbol: 'NAVER',
    name: 'NAVER Corporation',
    score: 73.2,
    price: 198000,
    volume: 450, // 450억원 (4.5조)
    momentum: 68.9,
    strength: 110,
    marketCap: 33000, // 3.3조원
    dailyReturn: 1.2,
    volumeRatio: 1.8,
    sector: 'Internet',
    reasons: ['Platform growth', 'AI innovation']
  },
  {
    symbol: 'POSCO',
    name: 'POSCO Holdings',
    score: 69.1,
    price: 385000,
    volume: 320, // 320억원 (3.2조)
    momentum: 65.7,
    strength: 105,
    marketCap: 20000, // 2조원
    dailyReturn: 0.8,
    volumeRatio: 1.5,
    sector: 'Steel',
    reasons: ['Infrastructure demand', 'Green steel']
  }
];

export default function FilteringPage() {
  const router = useRouter();
  const {
    defaultConditions,
    activePreset,
    presets,
    loadPreset
  } = useHydratedSettingsStore();

  const [filteredStocks, setFilteredStocks] = useState<FilteredStock[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentConditions, setCurrentConditions] = useState<FilterConditions>(defaultConditions);

  // Load default settings on component mount
  useEffect(() => {
    setCurrentConditions(defaultConditions);
  }, [defaultConditions]);

  const handleLoadDefaultSettings = () => {
    if (activePreset) {
      // 먼저 프리셋을 로드하여 전역 상태 업데이트
      loadPreset(activePreset);

      // 프리셋 데이터 가져오기
      const preset = presets.find(p => p.id === activePreset);
      if (preset) {
        // 로컬 상태를 프리셋 값으로 즉시 업데이트
        setCurrentConditions(preset.conditions);
      }
    }
  };

  const handleConditionsChange = useCallback((conditions: FilterConditions) => {
    setCurrentConditions(conditions);
  }, []);

  // 현재 조건이 활성 프리셋과 일치하는지 확인
  const isUsingPreset = useMemo(() => {
    if (!activePreset) return false;

    const preset = presets.find(p => p.id === activePreset);
    if (!preset) return false;

    // 조건 비교
    const conditionsMatch =
      currentConditions.minVolume === preset.conditions.minVolume &&
      currentConditions.maxVolume === preset.conditions.maxVolume &&
      currentConditions.minPrice === preset.conditions.minPrice &&
      currentConditions.maxPrice === preset.conditions.maxPrice &&
      currentConditions.minMomentum === preset.conditions.minMomentum &&
      currentConditions.maxMomentum === preset.conditions.maxMomentum &&
      currentConditions.minStrength === preset.conditions.minStrength &&
      currentConditions.maxStrength === preset.conditions.maxStrength &&
      (currentConditions.minMarketCap || 1000) === (preset.conditions.minMarketCap || 1000) &&
      (currentConditions.maxMarketCap || 100000) === (preset.conditions.maxMarketCap || 100000);

    return conditionsMatch;
  }, [activePreset, presets, currentConditions]);

  const handleFilterRun = async (conditions: FilterConditions) => {
    setIsLoading(true);
    setShowResults(false);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // For demo purposes, use mock data with some filtering logic
      // 거래량은 이미 억원 단위로 저장되어 있음
      const results = mockFilteredStocks.filter(stock => {
        return stock.price >= conditions.minPrice &&
               stock.price <= conditions.maxPrice &&
               stock.volume >= conditions.minVolume && // 억원 단위 비교
               stock.volume <= conditions.maxVolume &&
               stock.momentum >= conditions.minMomentum &&
               stock.momentum <= conditions.maxMomentum &&
               stock.strength >= conditions.minStrength &&
               stock.strength <= conditions.maxStrength;
      });

      setFilteredStocks(results);
      setSelectedStocks([]);
      setShowResults(true);
    } catch (error) {
      console.error('Filtering failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockSelection = (symbol: string, selected: boolean) => {
    setSelectedStocks(prev =>
      selected
        ? [...prev, symbol]
        : prev.filter(s => s !== symbol)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedStocks(selected ? filteredStocks.map(stock => stock.symbol) : []);
  };

  const handleProceedToPortfolio = () => {
    // Navigate to portfolio page with selected stocks
    const queryParams = new URLSearchParams({
      selected: selectedStocks.join(',')
    });
    router.push(`/portfolio?${queryParams.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Filtering</h1>
          <p className="text-muted-foreground">
            Real-time filtering with settings from your default preset
          </p>
          {activePreset && (
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant={isUsingPreset ? "outline" : "secondary"}>
                {isUsingPreset
                  ? `Using: ${presets.find(p => p.id === activePreset)?.name}`
                  : `Using: Custom`
                }
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadDefaultSettings}
                className="h-6 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset to Default
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Badge variant="outline">Day 1</Badge>
          <Badge variant="secondary">15:30-16:00</Badge>
        </div>
      </div>

      {/* 필터링 조건 설정 */}
      <ConditionBuilder
        onFilterRun={handleFilterRun}
        onConditionsChange={handleConditionsChange}
        initialConditions={currentConditions}
        isLoading={isLoading}
      />

      {/* 필터링 결과 요약 */}
      {showResults && (
        <FilterSummary
          totalStocks={5000} // Mock total
          filteredStocks={filteredStocks}
          selectedStocks={selectedStocks}
          filteringTime={1200}
          onProceedToPortfolio={selectedStocks.length > 0 ? handleProceedToPortfolio : undefined}
        />
      )}

      {/* 필터링 결과 테이블 */}
      {showResults && (
        <StockResultsTable
          stocks={filteredStocks}
          selectedStocks={selectedStocks}
          onSelectionChange={handleStockSelection}
          onSelectAll={handleSelectAll}
          isLoading={isLoading}
        />
      )}

      {/* 스코어링 시각화 */}
      {showResults && filteredStocks.length > 0 && (
        <StockScoring stocks={filteredStocks} />
      )}
    </div>
  );
}