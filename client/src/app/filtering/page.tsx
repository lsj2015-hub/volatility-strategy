/**
 * Filtering 페이지 - 주식 필터링 인터페이스
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConditionBuilder } from '@/components/filtering/condition-builder';
import { StockResultsTable } from '@/components/filtering/stock-results-table';
import { FilterSummary } from '@/components/filtering/filter-summary';
import { FilterConditions, FilteredStock } from '@/types/trading';
import { useRouter } from 'next/navigation';
import { useHydratedSettingsStore } from '@/hooks/useHydratedStore';
import { useTradingModeStore } from '@/stores/trading-mode';
import { usePortfolioStore } from '@/stores/portfolio';
import { StocksService } from '@/lib/api';
import { Settings, RefreshCw, AlertCircle } from 'lucide-react';


export default function FilteringPage() {
  const router = useRouter();
  const {
    defaultConditions,
    activePreset,
    presets,
    loadPreset
  } = useHydratedSettingsStore();

  const { mode: tradingMode } = useTradingModeStore();
  const { setSelectedStocks: setPortfolioStocks } = usePortfolioStore();

  const [filteredStocks, setFilteredStocks] = useState<FilteredStock[]>([]);
  const [selectedStocks, setLocalSelectedStocks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentConditions, setCurrentConditions] = useState<FilterConditions>(defaultConditions);
  const [error, setError] = useState<string | null>(null);
  const [totalStocks, setTotalStocks] = useState<number>(0);
  const [filteringTime, setFilteringTime] = useState<number>(0);

  // Load default settings on component mount and when activePreset changes
  useEffect(() => {
    if (activePreset) {
      const preset = presets.find(p => p.id === activePreset);
      if (preset) {
        console.log(`📋 Loading active preset "${preset.name}" conditions automatically`);
        setCurrentConditions(preset.conditions);
      }
    } else {
      console.log('📋 No active preset, using default conditions');
      setCurrentConditions(defaultConditions);
    }
  }, [activePreset, presets, defaultConditions]);

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
    setError(null);

    const startTime = Date.now();

    try {
      console.log(`Starting stock filtering with ${tradingMode?.is_mock_trading ? 'mock' : 'real'} trading data`);

      // 전체 주식 수 조회와 필터링을 병렬로 실행
      const [allStocksData, filteredStocksData] = await Promise.all([
        StocksService.getAllStocks({ limit: 1000 }),  // 전체 주식 수 조회용 (최대 1000개)
        StocksService.filterStocks(conditions)     // 필터링 실행
      ]);

      const endTime = Date.now();
      const elapsedTime = Math.round((endTime - startTime) / 1000);

      setFilteredStocks(filteredStocksData);
      setLocalSelectedStocks([]);
      setFilteringTime(elapsedTime);

      // 전체 주식 수 설정 (실제 데이터 또는 추정값)
      if (allStocksData && allStocksData.length > 0) {
        setTotalStocks(allStocksData.length);
      } else {
        // API 실패시 일반적인 한국 주식 수로 추정
        setTotalStocks(2800);
      }

      setShowResults(true);
      console.log(`Filter completed: ${filteredStocksData.length} stocks found using ${tradingMode?.is_mock_trading ? 'mock' : 'real'} data`);
    } catch (error) {
      console.error('Filtering failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setFilteredStocks([]);
      setShowResults(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockSelection = (symbol: string, selected: boolean) => {
    setLocalSelectedStocks(prev =>
      selected
        ? [...prev, symbol]
        : prev.filter(s => s !== symbol)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setLocalSelectedStocks(selected ? filteredStocks.map(stock => stock.symbol) : []);
  };

  const handleProceedToPortfolio = () => {
    // Get full stock data for selected symbols
    const selectedStockData = filteredStocks.filter(stock =>
      selectedStocks.includes(stock.symbol)
    );

    // Store selected stocks in portfolio store
    setPortfolioStocks(selectedStockData);

    console.log('Filtering: Selected stocks saved to portfolio store:', selectedStockData.length);

    // Navigate to portfolio page
    router.push('/portfolio');
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Filtering</h1>
          <p className="text-muted-foreground">
            Real-time filtering using {tradingMode?.is_mock_trading ? 'mock trading' : 'real trading'} data
          </p>
          <div className="flex items-center space-x-2 mt-2">
            {activePreset ? (
              <>
                <Badge
                  variant={isUsingPreset ? "default" : "secondary"}
                  className={`${
                    isUsingPreset
                      ? 'bg-green-600 hover:bg-green-700 text-white border-green-700'
                      : 'bg-orange-100 text-orange-800 border-orange-200'
                  } font-medium`}
                >
                  Using: {presets.find(p => p.id === activePreset)?.name || 'Unknown'}
                  {!isUsingPreset && ' (Modified)'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadDefaultSettings}
                  className="h-6 px-2 text-xs hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset to Preset
                </Button>
              </>
            ) : (
              <Badge
                variant="outline"
                className="bg-gray-100 text-gray-700 border-gray-300 font-medium"
              >
                Using: Custom Settings
              </Badge>
            )}
          </div>
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

      {/* 에러 표시 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-medium text-red-800">Filtering Error</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setError(null)}
            className="mt-3"
          >
            Dismiss
          </Button>
        </div>
      )}

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
          totalStocks={totalStocks}
          filteredStocks={filteredStocks}
          selectedStocks={selectedStocks}
          filteringTime={filteringTime}
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

    </div>
  );
}