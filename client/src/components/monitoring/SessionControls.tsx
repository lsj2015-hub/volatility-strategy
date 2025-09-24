'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Play, Square, Settings, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import type {
  MonitoringSessionStatus,
  StartMonitoringRequest
} from '@/types/monitoring';
import type { FilteredStock } from '@/types/trading';

interface SessionControlsProps {
  status: MonitoringSessionStatus | null;
  isLoading: boolean;
  error: string | null;
  onStartSession: (targets: StartMonitoringRequest['targets']) => Promise<void>;
  onStopSession: () => Promise<void>;
}

const PHASE_LABELS: Record<string, string> = {
  waiting: '대기 중',
  phase_1: '1단계 (16:00-16:30)',
  phase_2: '2단계 (16:30-17:00)',
  phase_3: '3단계 (17:00-17:30)',
  phase_4: '4단계 (17:30-17:40)',
  completed: '완료'
};

export function SessionControls({
  status,
  isLoading,
  error,
  onStartSession,
  onStopSession
}: SessionControlsProps) {
  const [portfolioTargets, setPortfolioTargets] = useState<StartMonitoringRequest['targets']>([]);
  const [hasPortfolioData, setHasPortfolioData] = useState(false);

  // Load confirmed portfolio data for monitoring targets
  useEffect(() => {
    const loadPortfolioTargets = () => {
      try {
        console.log('📦 Loading portfolio targets from localStorage...');
        console.log('📦 Available localStorage keys:', Object.keys(localStorage));

        // Try confirmed portfolio first
        const confirmedPortfolioData = localStorage.getItem('confirmed-portfolio');
        console.log('📋 Confirmed portfolio raw data:', confirmedPortfolioData);

        if (confirmedPortfolioData) {
          const portfolio = JSON.parse(confirmedPortfolioData);
          console.log('📋 Parsed confirmed portfolio:', portfolio);
          console.log('📋 Selected stocks in confirmed portfolio:', portfolio.selectedStocks);

          if (portfolio.selectedStocks && Array.isArray(portfolio.selectedStocks) && portfolio.selectedStocks.length > 0) {
            const targets: StartMonitoringRequest['targets'] = portfolio.selectedStocks.map((stock: FilteredStock) => ({
              symbol: stock.symbol,
              stock_name: stock.name,
              entry_price: stock.price,
              buy_threshold: 2.0
            }));

            setPortfolioTargets(targets);
            setHasPortfolioData(true);
            console.log('✅ Successfully loaded confirmed portfolio targets:', targets);
            console.log('✅ Portfolio targets count:', targets.length);
            return; // Exit early if successful
          } else {
            console.log('📋 Confirmed portfolio exists but no valid selectedStocks array');
          }
        }

        // Try portfolio store as fallback
        const portfolioStoreData = localStorage.getItem('portfolio-storage');
        console.log('🏪 Portfolio store raw data:', portfolioStoreData);

        if (portfolioStoreData) {
          const storeData = JSON.parse(portfolioStoreData);
          console.log('🏪 Parsed portfolio store:', storeData);
          console.log('🏪 Selected stocks in store:', storeData.state?.selectedStocks);

          if (storeData.state?.selectedStocks && Array.isArray(storeData.state.selectedStocks) && storeData.state.selectedStocks.length > 0) {
            const targets: StartMonitoringRequest['targets'] = storeData.state.selectedStocks.map((stock: FilteredStock) => ({
              symbol: stock.symbol,
              stock_name: stock.name,
              entry_price: stock.price,
              buy_threshold: 2.0
            }));

            setPortfolioTargets(targets);
            setHasPortfolioData(true);
            console.log('✅ Successfully loaded portfolio store targets:', targets);
            console.log('✅ Portfolio targets count:', targets.length);
            return; // Exit early if successful
          } else {
            console.log('🏪 Portfolio store exists but no valid selectedStocks array');
          }
        }

        // No portfolio data found
        console.warn('⚠️ No portfolio data found in localStorage');
        console.warn('⚠️ Confirmed portfolio data:', confirmedPortfolioData);
        console.warn('⚠️ Portfolio store data:', portfolioStoreData);
        setPortfolioTargets([]);
        setHasPortfolioData(false);

      } catch (error) {
        console.error('❌ Failed to load portfolio data:', error);
        setPortfolioTargets([]);
        setHasPortfolioData(false);
      }
    };

    loadPortfolioTargets();
  }, []);

  const handleStartSession = async () => {
    try {
      console.log('🚀 Starting monitoring session with targets:', portfolioTargets);
      console.log('📊 Portfolio targets count:', portfolioTargets.length);
      console.log('📋 Has portfolio data:', hasPortfolioData);

      if (portfolioTargets.length === 0) {
        console.error('⚠️ Cannot start monitoring: No portfolio targets available');
        alert('포트폴리오 데이터가 없습니다.\n\nStock Filtering → Portfolio Management에서 포트폴리오를 구성한 후 다시 시도해주세요.');
        return;
      }

      console.log('🔄 Calling onStartSession with targets...');
      await onStartSession(portfolioTargets);
      console.log('✅ Session start request completed');
      console.log('✅ Session started successfully');
      alert('모니터링 세션이 성공적으로 시작되었습니다!');
    } catch (err) {
      console.error('❌ Failed to start session:', err);
      alert(`세션 시작 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    }
  };

  const handleStopSession = async () => {
    try {
      await onStopSession();
    } catch (err) {
      console.error('Failed to stop session:', err);
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'waiting': return 'bg-gray-500';
      case 'phase_1': return 'bg-blue-500';
      case 'phase_2': return 'bg-green-500';
      case 'phase_3': return 'bg-yellow-500';
      case 'phase_4': return 'bg-orange-500';
      case 'completed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatRemainingTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          시간외 거래 모니터링 세션
        </CardTitle>
        <CardDescription>
          16:00-17:40 시간외 거래 모니터링을 시작하고 관리합니다
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

        {/* Current Session Status */}
        {status && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge
                  variant={status.is_running ? "default" : "secondary"}
                  className={status.is_running ? getPhaseColor(status.current_phase) : ""}
                >
                  {status.is_running ? "실행 중" : "중지됨"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {PHASE_LABELS[status.current_phase] || status.current_phase}
                </span>
              </div>

              {status.is_running && status.remaining_time_seconds > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>{formatRemainingTime(status.remaining_time_seconds)}</span>
                </div>
              )}
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold">{status.total_targets}</div>
                <div className="text-sm text-muted-foreground">총 대상</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600">{status.triggered_count}</div>
                <div className="text-sm text-muted-foreground">신호 발생</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">
                  {status.total_targets > 0
                    ? Math.round((status.triggered_count / status.total_targets) * 100)
                    : 0}%
                </div>
                <div className="text-sm text-muted-foreground">성공률</div>
              </div>
            </div>

            {/* Next Phase Info */}
            {status.next_phase_time && status.is_running && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>다음 단계: {status.next_phase_time}</span>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Session Controls */}
        <div className="space-y-4">
          <div className="flex gap-3">
            {!status?.is_running ? (
              <Button
                onClick={handleStartSession}
                disabled={isLoading || portfolioTargets.length === 0}
                className={`flex-1 font-bold border-2 shadow-md hover:shadow-lg transition-all duration-200 ${
                  portfolioTargets.length === 0
                    ? 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-600'
                    : 'bg-cyan-600 hover:bg-cyan-700 border-cyan-700 text-white'
                } disabled:bg-gray-300 disabled:border-gray-300 disabled:text-gray-500`}
                variant={portfolioTargets.length === 0 ? "outline" : "default"}
              >
                <Play className="h-4 w-4 mr-2" />
                {isLoading
                  ? '시작 중...'
                  : portfolioTargets.length === 0
                    ? '포트폴리오 구성 필요'
                    : '모니터링 시작'
                }
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleStopSession}
                disabled={isLoading}
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                {isLoading ? '중지 중...' : '모니터링 중지'}
              </Button>
            )}
          </div>

          {/* Portfolio Targets Configuration */}
          {!status?.is_running && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {hasPortfolioData ? '포트폴리오 모니터링 대상' : '모니터링 대상'}
              </Label>

              {portfolioTargets.length > 0 ? (
                <div className="space-y-2">
                  {portfolioTargets.map((target) => (
                    <div key={target.symbol} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{target.stock_name}</div>
                        <div className="text-sm text-muted-foreground">{target.symbol}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₩{target.entry_price.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          임계값: {target.buy_threshold}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground space-y-3">
                  <p className="text-sm">포트폴리오 데이터가 없습니다</p>
                  <p className="text-xs">
                    Stock Filtering → Portfolio Management에서 포트폴리오를 구성해주세요
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Create test portfolio data for debugging
                      const testPortfolio = {
                        selectedStocks: [
                          { symbol: '005930', name: '삼성전자', price: 75000 },
                          { symbol: '000660', name: 'SK하이닉스', price: 125000 }
                        ]
                      };
                      localStorage.setItem('confirmed-portfolio', JSON.stringify(testPortfolio));
                      console.log('🧪 Created test portfolio data');
                      window.location.reload();
                    }}
                    className="text-xs"
                  >
                    테스트 포트폴리오 생성 (디버깅용)
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {hasPortfolioData
                  ? '* 포트폴리오에서 선택된 종목들을 자동으로 모니터링합니다'
                  : '* Stock Filtering 페이지에서 종목을 선택하고 Portfolio Management에서 확정해주세요'
                }
              </p>
            </div>
          )}
        </div>

        {/* Session Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 16:00-17:40 시간외 거래 시간 동안 자동 모니터링</p>
          <p>• 30분 간격으로 단계별 임계값 자동 조정</p>
          <p>• 매수 조건 충족 시 자동 신호 생성 및 주문 실행</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default SessionControls;