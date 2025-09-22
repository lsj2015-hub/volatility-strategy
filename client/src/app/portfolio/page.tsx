/**
 * Portfolio 페이지 - 포트폴리오 관리 인터페이스
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Wallet,
  PieChart,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { FilteredStock } from '@/types/trading';
import { useSettingsStore } from '@/stores/settings';
import { useTradingModeStore } from '@/stores/trading-mode';
import { usePortfolioStore } from '@/stores/portfolio';
import { StocksService } from '@/lib/api';


type AllocationMethod = 'equal' | 'risk-weighted' | 'custom';

interface StockAllocation {
  symbol: string;
  amount: number;
  percentage: number;
  shares: number;
  isCustomSet?: boolean; // 사용자가 직접 설정했는지 여부
}

export default function PortfolioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { riskManagement } = useSettingsStore();
  const { data: tradingMode } = useTradingModeStore();
  const { selectedStocks: portfolioStocks } = usePortfolioStore();
  const [isClient, setIsClient] = useState(false);

  // URL 파라미터는 백업용으로 유지 (이전 버전과의 호환성)
  const selectedSymbols = searchParams?.get('selected')?.split(',') || [];

  // 상태 관리
  const [totalInvestment, setTotalInvestment] = useState(10000000); // 1천만원
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>('equal');
  const [allocations, setAllocations] = useState<Record<string, StockAllocation>>({});
  const [selectedStocks, setSelectedStocks] = useState<FilteredStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 클라이언트 사이드 마운트 감지
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 선택된 종목 데이터 가져오기 - 포트폴리오 스토어 우선 사용
  useEffect(() => {
    let isMounted = true;

    const loadStocks = async () => {
      // 포트폴리오 스토어에 데이터가 있는 경우 우선 사용
      if (portfolioStocks.length > 0) {
        console.log('Portfolio: Using data from portfolio store:', portfolioStocks.length);
        if (isMounted) {
          setSelectedStocks(portfolioStocks);
          setIsLoading(false);
        }
        return;
      }

      // 포트폴리오 스토어에 데이터가 없고 URL 파라미터도 없는 경우
      if (selectedSymbols.length === 0) {
        if (isMounted) {
          setSelectedStocks([]);
          setIsLoading(false);
        }
        return;
      }

      // URL 파라미터가 있는 경우 API에서 데이터 가져오기 (백업 방식)
      if (isMounted) {
        setIsLoading(true);
        setError(null);
      }

      try {
        console.log(`Portfolio: Fetching ${selectedSymbols.length} selected stocks from API using ${tradingMode?.is_mock ? 'mock' : 'real'} trading data`);

        // 각 종목의 상세 정보를 개별적으로 가져오기
        const stockPromises = selectedSymbols.map(symbol =>
          StocksService.getStockDetail(symbol).catch((error: any) => {
            console.warn(`Failed to fetch ${symbol}:`, error);
            return null;
          })
        );

        const stockResponses = await Promise.all(stockPromises);

        const stocks: FilteredStock[] = [];
        stockResponses.forEach((response: any, index: number) => {
          if (response?.success && response.data) {
            // API 응답을 FilteredStock 형태로 변환
            const stockData = response.data;
            const filteredStock: FilteredStock = {
              symbol: stockData.symbol,
              name: stockData.name,
              price: stockData.current_price,
              volume: stockData.volume,
              momentum: stockData.change_percent,
              strength: 50, // 기본값
              score: 70, // 기본값
              sector: stockData.sector || 'Unknown',
              reasons: [`Selected from filtering`],
              dailyReturn: stockData.change_percent,
              volumeRatio: 1.5, // 기본값
              // 고급 데이터는 기본값으로 설정
              lateSessionReturn: 0,
              lateSessionVolumeRatio: 15,
              relativeReturn: stockData.change_percent - 2.0,
              vwapRatio: 100,
              vwap: stockData.current_price
            };
            stocks.push(filteredStock);
          } else {
            console.warn(`Failed to fetch data for ${selectedSymbols[index]}`);
          }
        });

        if (isMounted) {
          setSelectedStocks(stocks);
          console.log(`Portfolio: Successfully loaded ${stocks.length} stocks out of ${selectedSymbols.length} requested`);
        }
      } catch (error) {
        console.error('Portfolio: Failed to fetch selected stocks:', error);
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Failed to load stock data');
          setSelectedStocks([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadStocks();

    return () => {
      isMounted = false;
    };
  }, [portfolioStocks.length, selectedSymbols.join(','), tradingMode?.is_mock]);

  // 초기 배분 설정
  useEffect(() => {
    if (selectedStocks.length > 0) {
      // 기존 할당이 없거나, 선택된 주식 수와 다른 경우 초기화
      const needsReset = Object.keys(allocations).length === 0 ||
                        Object.keys(allocations).length !== selectedStocks.length ||
                        !selectedStocks.every(stock => allocations[stock.symbol]);

      if (needsReset) {
        console.log('Portfolio: Initializing allocations for', selectedStocks.length, 'stocks');

        const equalPercentage = 100 / selectedStocks.length;
        const equalAmount = totalInvestment / selectedStocks.length;

        const initialAllocations: Record<string, StockAllocation> = {};
        selectedStocks.forEach(stock => {
          initialAllocations[stock.symbol] = {
            symbol: stock.symbol,
            amount: equalAmount,
            percentage: equalPercentage,
            shares: Math.floor(equalAmount / stock.price),
            isCustomSet: false
          };
        });
        setAllocations(initialAllocations);
      }
    }
  }, [selectedStocks.length, totalInvestment]);

  // 배분 방식 변경 핸들러
  const handleAllocationMethodChange = (method: AllocationMethod) => {
    setAllocationMethod(method);

    if (method === 'equal') {
      const equalPercentage = 100 / selectedStocks.length;
      const equalAmount = totalInvestment / selectedStocks.length;

      const newAllocations = { ...allocations };
      selectedStocks.forEach(stock => {
        newAllocations[stock.symbol] = {
          ...newAllocations[stock.symbol],
          amount: equalAmount,
          percentage: equalPercentage,
          shares: Math.floor(equalAmount / stock.price),
          isCustomSet: false
        };
      });
      setAllocations(newAllocations);

    } else if (method === 'risk-weighted') {
      // 점수 기반 가중 배분
      const totalScore = selectedStocks.reduce((sum, stock) => sum + stock.score, 0);

      const newAllocations = { ...allocations };
      selectedStocks.forEach(stock => {
        const percentage = (stock.score / totalScore) * 100;
        const amount = (percentage / 100) * totalInvestment;
        newAllocations[stock.symbol] = {
          ...newAllocations[stock.symbol],
          amount,
          percentage,
          shares: Math.floor(amount / stock.price),
          isCustomSet: false
        };
      });
      setAllocations(newAllocations);

    } else if (method === 'custom') {
      // Custom mode로 전환할 때 모든 isCustomSet을 false로 초기화
      const newAllocations = { ...allocations };
      selectedStocks.forEach(stock => {
        newAllocations[stock.symbol] = {
          ...newAllocations[stock.symbol],
          isCustomSet: false
        };
      });
      setAllocations(newAllocations);
    }
  };

  // 개별 종목 배분 변경 핸들러 (Custom allocation용)
  const handleAllocationChange = (symbol: string, percentage: number) => {
    if (allocationMethod !== 'custom') return;

    const stock = selectedStocks.find(s => s.symbol === symbol);
    if (!stock) return;

    setAllocations(prev => {
      // 현재 조정하는 종목을 사용자 설정으로 마크
      const newAllocations = {
        ...prev,
        [symbol]: {
          ...prev[symbol],
          percentage,
          amount: (percentage / 100) * totalInvestment,
          shares: Math.floor(((percentage / 100) * totalInvestment) / stock.price),
          isCustomSet: true
        }
      };

      // 사용자가 직접 설정한 종목들의 총 비율 계산
      const customSetSymbols = Object.keys(newAllocations).filter(s => newAllocations[s].isCustomSet);
      const totalCustomPercentage = customSetSymbols.reduce((sum, s) => sum + newAllocations[s].percentage, 0);

      // 남은 비율 계산
      const remainingPercentage = Math.max(0, 100 - totalCustomPercentage);

      // 사용자가 설정하지 않은 종목들 찾기
      const nonCustomSymbols = selectedStocks
        .map(s => s.symbol)
        .filter(s => !newAllocations[s].isCustomSet);

      // 남은 비율을 설정하지 않은 종목들에게 균등 분배
      if (nonCustomSymbols.length > 0) {
        const equalPercentage = remainingPercentage / nonCustomSymbols.length;

        nonCustomSymbols.forEach(nonCustomSymbol => {
          const nonCustomStock = selectedStocks.find(s => s.symbol === nonCustomSymbol);
          if (nonCustomStock) {
            const amount = (equalPercentage / 100) * totalInvestment;
            newAllocations[nonCustomSymbol] = {
              ...newAllocations[nonCustomSymbol],
              percentage: equalPercentage,
              amount,
              shares: Math.floor(amount / nonCustomStock.price),
              isCustomSet: false
            };
          }
        });
      }

      return newAllocations;
    });
  };

  // 총 투자금액 변경 핸들러
  const handleTotalInvestmentChange = (newTotal: number) => {
    setTotalInvestment(newTotal);

    // 기존 비율 유지하면서 금액 재계산
    const newAllocations = { ...allocations };
    Object.keys(newAllocations).forEach(symbol => {
      const stock = selectedStocks.find(s => s.symbol === symbol);
      if (stock) {
        const amount = (newAllocations[symbol].percentage / 100) * newTotal;
        newAllocations[symbol] = {
          ...newAllocations[symbol],
          amount,
          shares: Math.floor(amount / stock.price)
        };
      }
    });
    setAllocations(newAllocations);
  };

  // 포트폴리오 검증
  const validation = useMemo(() => {
    // 기본값 설정
    if (selectedStocks.length === 0 || Object.keys(allocations).length === 0) {
      return {
        isComplete: false,
        totalAllocated: 0,
        stockCount: 0,
        maxPositions: riskManagement.maxPositions,
        isWithinPositionLimit: false,
        maxSectorConcentration: 0,
        isDiversified: true,
        riskLevel: 'Medium' as const,
        avgScore: 0
      };
    }

    const totalAllocated = Object.values(allocations).reduce((sum, alloc) => sum + (alloc.percentage || 0), 0);
    const stockCount = selectedStocks.length;
    const maxPositions = riskManagement.maxPositions;

    // 섹터 분산도 계산
    const sectorCounts: Record<string, number> = {};
    selectedStocks.forEach(stock => {
      const sector = stock.sector || 'Unknown';
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
    });
    const sectorValues = Object.values(sectorCounts);
    const maxSectorConcentration = sectorValues.length > 0 ? Math.max(...sectorValues) / stockCount : 0;

    // 위험 점수 계산 (평균 점수 기반)
    const avgScore = stockCount > 0 ? selectedStocks.reduce((sum, stock) => sum + (stock.score || 0), 0) / stockCount : 0;
    const riskLevel = avgScore >= 80 ? 'Low' : avgScore >= 60 ? 'Medium' : 'High';

    // 할당 완료 조건: 총 할당이 99% ~ 101% 사이
    const isComplete = !isNaN(totalAllocated) && totalAllocated >= 99 && totalAllocated <= 101;

    return {
      isComplete,
      totalAllocated: isNaN(totalAllocated) ? 0 : totalAllocated,
      stockCount,
      maxPositions,
      isWithinPositionLimit: stockCount <= maxPositions && stockCount > 0,
      maxSectorConcentration,
      isDiversified: maxSectorConcentration <= 0.5,
      riskLevel,
      avgScore: isNaN(avgScore) ? 0 : avgScore
    };
  }, [allocations, selectedStocks, riskManagement.maxPositions]);

  const handleConfirmPortfolio = () => {
    if (validation.isComplete && validation.isWithinPositionLimit) {
      // 포트폴리오 데이터를 localStorage에 저장하거나 API로 전송
      const portfolioData = {
        totalInvestment,
        allocations,
        selectedStocks,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('confirmed-portfolio', JSON.stringify(portfolioData));

      // 모니터링 페이지로 이동
      router.push('/monitoring');
    }
  };

  if (selectedStocks.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio Management</h1>
            <p className="text-muted-foreground">
              Build and manage your trading portfolio
            </p>
          </div>
        </div>

        {/* Debug information - Only render on client side */}
        {isClient && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="py-3">
              <div className="text-sm text-yellow-800">
                <p><strong>Debug Info:</strong></p>
                <p>Portfolio Store Stocks: {portfolioStocks.length}</p>
                <p>URL Selected Symbols: {selectedSymbols.length}</p>
                <p>Loading State: {isLoading ? 'Loading' : 'Not Loading'}</p>
                {error && <p>Error: {error}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <PieChart className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg mb-2">No stocks selected</p>
              <p className="text-sm mb-4">Please go back to filtering and select stocks for your portfolio</p>
              <Button onClick={() => router.push('/filtering')}>
                Go to Stock Filtering
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio Management</h1>
            <p className="text-muted-foreground">
              Loading selected stocks using {tradingMode?.is_mock ? 'mock' : 'real'} trading data...
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading stock data...</span>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio Management</h1>
            <p className="text-muted-foreground">Failed to load stock data</p>
          </div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-medium text-red-800">Loading Error</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/filtering')}
            className="mt-3"
          >
            Back to Filtering
          </Button>
        </div>
      </div>
    );
  }

  // 선택된 종목이 없는 경우
  if (selectedStocks.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio Management</h1>
            <p className="text-muted-foreground">No stocks selected for portfolio</p>
          </div>
        </div>
        <div className="text-center p-8">
          <h3 className="text-lg font-medium mb-2">No Stocks Selected</h3>
          <p className="text-muted-foreground mb-4">
            Please select stocks from the filtering page to build your portfolio.
          </p>
          <Button onClick={() => router.push('/filtering')}>
            Go to Stock Filtering
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Management</h1>
          <p className="text-muted-foreground">
            Allocate investments across {selectedStocks.length} selected stocks using {tradingMode?.is_mock ? 'mock' : 'real'} trading data
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">Day 1</Badge>
          <Badge variant="secondary">15:35-16:00</Badge>
        </div>
      </div>

      {/* 포트폴리오 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{totalInvestment.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Available for allocation</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selected Stocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedStocks.length}</div>
            <div className="text-xs text-muted-foreground">From filtering results</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              validation.riskLevel === 'Low' ? 'text-green-600' :
              validation.riskLevel === 'Medium' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {validation.riskLevel}
            </div>
            <div className="text-xs text-muted-foreground">Avg score: {validation.avgScore.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Diversification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((1 - validation.maxSectorConcentration) * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Across sectors</div>
          </CardContent>
        </Card>
      </div>

      {/* 투자 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5" />
            Investment Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Total Investment Amount (₩)</Label>
              <Input
                type="number"
                min="1000000"
                max="100000000"
                step="1000000"
                value={totalInvestment}
                onChange={(e) => handleTotalInvestmentChange(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Enter amount between ₩1M - ₩100M
              </p>
            </div>

            <div className="space-y-2">
              <Label>Allocation Method</Label>
              <div className="space-y-2">
                <Button
                  variant={allocationMethod === 'equal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAllocationMethodChange('equal')}
                  className="w-full justify-start"
                >
                  Equal Distribution
                </Button>
                <Button
                  variant={allocationMethod === 'risk-weighted' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAllocationMethodChange('risk-weighted')}
                  className="w-full justify-start"
                >
                  Score-Weighted
                </Button>
                <Button
                  variant={allocationMethod === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAllocationMethodChange('custom')}
                  className="w-full justify-start"
                >
                  Custom Allocation
                </Button>
              </div>
              {allocationMethod === 'custom' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Adjust individual stock percentages. Remaining stocks will automatically share the leftover percentage equally.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 종목별 배분 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="mr-2 h-5 w-5" />
            Stock Allocations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {selectedStocks.map((stock) => {
              const allocation = allocations[stock.symbol];
              if (!allocation) return null;

              return (
                <div key={stock.symbol} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{stock.symbol}</Badge>
                      <div>
                        <div className="font-medium">{stock.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ₩{stock.price.toLocaleString()} per share • Score: {stock.score.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">₩{allocation.amount.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {allocation.shares} shares
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <span>Allocation: {allocation.percentage.toFixed(1)}%</span>
                        {allocationMethod === 'custom' && allocation.isCustomSet && (
                          <Badge variant="secondary" className="text-xs">Custom</Badge>
                        )}
                        {allocationMethod === 'custom' && !allocation.isCustomSet && (
                          <Badge variant="outline" className="text-xs">Auto</Badge>
                        )}
                      </div>
                      <span>₩{allocation.amount.toLocaleString()}</span>
                    </div>
                    <Slider
                      value={[allocation.percentage]}
                      onValueChange={(value) => handleAllocationChange(stock.symbol, value[0])}
                      max={100}
                      step={0.1}
                      disabled={allocationMethod !== 'custom'}
                      className="w-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 검증 및 확인 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Allocated:</span>
                  <span className={`font-medium ${
                    validation.isComplete ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {validation.totalAllocated.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investment Amount:</span>
                  <span className="font-medium">₩{totalInvestment.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Number of Stocks:</span>
                  <span className="font-medium">{selectedStocks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Shares:</span>
                  <span className="font-medium">
                    {Object.values(allocations).reduce((sum, alloc) => sum + alloc.shares, 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Validation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Allocation Complete</span>
              <span className={validation.isComplete ? 'text-green-600' : 'text-yellow-600'}>
                {validation.isComplete ? '✓ 100%' : `⚠ ${validation.totalAllocated.toFixed(1)}%`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Position Limit</span>
              <span className={validation.isWithinPositionLimit ? 'text-green-600' : 'text-red-600'}>
                {validation.isWithinPositionLimit ? '✓' : '✗'} {validation.stockCount}/{validation.maxPositions}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Diversified</span>
              <span className={validation.isDiversified ? 'text-green-600' : 'text-yellow-600'}>
                {validation.isDiversified ? '✓ Good' : '⚠ Concentrated'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Risk Level</span>
              <span className={`${
                validation.riskLevel === 'Low' ? 'text-green-600' :
                validation.riskLevel === 'Medium' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {validation.riskLevel}
              </span>
            </div>

            {/* Debug validation info */}
            <div className="space-y-1 text-xs text-muted-foreground bg-gray-50 p-2 rounded">
              <div>Debug Validation:</div>
              <div>• Total Allocated: {validation.totalAllocated.toFixed(2)}%</div>
              <div>• Is Complete: {validation.isComplete ? 'Yes' : 'No'}</div>
              <div>• Position Limit: {validation.stockCount}/{validation.maxPositions}</div>
              <div>• Within Limit: {validation.isWithinPositionLimit ? 'Yes' : 'No'}</div>
              <div>• Allocations Count: {Object.keys(allocations).length}</div>
              <div>• Selected Stocks: {selectedStocks.length}</div>
            </div>

            <Button
              className="w-full mt-4"
              disabled={!validation.isComplete || !validation.isWithinPositionLimit}
              onClick={handleConfirmPortfolio}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Confirm Portfolio
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}