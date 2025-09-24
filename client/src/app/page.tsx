'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Clock, Activity, Wallet, BarChart3, AlertCircle, RefreshCw } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { MarketIndicatorsDashboard } from '@/components/market-indicators';

export default function Home() {
  const { data, actions } = useDashboardData();

  // 시뮬레이션 데이터 (백업용)
  const fallbackData = {
    tradingSession: {
      day: 'Day 1',
      phase: 'Filtering',
      timeRemaining: '25:30',
      progress: 65,
      status: 'active',
    },
    marketStatus: {
      isOpen: true,
      nextAction: 'Portfolio Building',
      nextActionTime: '15:35',
    },
    portfolioSummary: {
      totalValue: data.portfolio?.totalValue ?? 10000000,
      unrealizedPnL: data.portfolio?.unrealizedPnL ?? 150000,
      unrealizedPnLPercent: data.portfolio?.unrealizedPnLPercent ?? 1.5,
      positions: data.portfolio?.positions?.length ?? 5,
      dayChange: data.portfolioPerformance?.dailyReturn ?? 75000,
    },
    todayStats: {
      filteredStocks: data.topStocks.length,
      selectedStocks: data.portfolio?.positions?.length ?? 0,
      executedTrades:
        data.portfolio?.positions?.filter((p) => p.status === 'active')
          .length ?? 0,
      avgScore:
        data.topStocks.length > 0
          ? data.topStocks.reduce(
              (sum, stock) => sum + (stock.currentPrice || 0),
              0
            ) / data.topStocks.length
          : 72.5,
    },
  };

  // 로딩 상태 표시
  const isLoading = data.loading.system || data.loading.stocks || data.loading.portfolio;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Trading Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor your volatility trading strategy performance
          </p>
          {data.errors.system && (
            <p className="text-sm text-red-500 mt-1">
              <AlertCircle className="inline mr-1 h-4 w-4" />
              Connection Error: {data.errors.system}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={actions.refreshAll}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Badge
            variant={
              data.systemStatus?.api_connection ? 'default' : 'secondary'
            }
          >
            <Activity className="mr-2 h-4 w-4" />
            {data.systemStatus?.api_connection
              ? 'API Connected'
              : 'API Disconnected'}
          </Badge>
        </div>
      </div>

      {/* 상단 카드 그리드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 거래 세션 상태 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Session
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fallbackData.tradingSession.day}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {fallbackData.tradingSession.phase}
              </p>
              <Badge variant="outline" className="text-xs">
                {fallbackData.tradingSession.timeRemaining}
              </Badge>
            </div>
            <Progress
              value={fallbackData.tradingSession.progress}
              className="mt-2"
            />
          </CardContent>
        </Card>

        {/* 포트폴리오 가치 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Portfolio Value
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₩{fallbackData.portfolioSummary.totalValue.toLocaleString()}
            </div>
            <p
              className={`text-xs ${
                fallbackData.portfolioSummary.unrealizedPnL >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {fallbackData.portfolioSummary.unrealizedPnL >= 0 ? '+' : ''}₩
              {fallbackData.portfolioSummary.unrealizedPnL.toLocaleString()}(
              {fallbackData.portfolioSummary.unrealizedPnLPercent.toFixed(2)}%)
            </p>
          </CardContent>
        </Card>

        {/* 오늘의 성과 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s P&L
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                fallbackData.portfolioSummary.dayChange >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {fallbackData.portfolioSummary.dayChange >= 0 ? '+' : ''}₩
              {fallbackData.portfolioSummary.dayChange.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {fallbackData.portfolioSummary.positions} active positions
            </p>
          </CardContent>
        </Card>

        {/* 필터링 통계 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Filtering Stats
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fallbackData.todayStats.filteredStocks}
            </div>
            <p className="text-xs text-muted-foreground">
              stocks found (avg score:{' '}
              {fallbackData.todayStats.avgScore.toFixed(1)})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 실시간 주식 데이터 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 상위 주식 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Top Gainers (수익률 상위)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.loading.stocks ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                    <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
                  </div>
                ))}
              </div>
            ) : data.errors.stocks ? (
              <div className="text-sm text-red-500 flex items-center">
                <AlertCircle className="mr-1 h-4 w-4" />
                {data.errors.stocks}
              </div>
            ) : (
              <div className="space-y-2">
                {data.topStocks.slice(0, 10).map((stock, index) => (
                  <div
                    key={`top-stock-${index}-${stock.name}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground w-4">
                        {index + 1}
                      </span>
                      <span className="font-medium">{stock.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({stock.symbol})
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono">
                        {stock.currentPrice?.toLocaleString()}원
                      </span>
                      <Badge
                        variant={stock.change >= 0 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {stock.changePercent >= 0 ? '+' : ''}
                        {stock.changePercent?.toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                ))}
                {data.topStocks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No stock data available
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 거래량 순위 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Volume Leaders (거래량 상위)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.loading.stocks ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                    <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
                  </div>
                ))}
              </div>
            ) : data.errors.stocks ? (
              <div className="text-sm text-red-500 flex items-center">
                <AlertCircle className="mr-1 h-4 w-4" />
                {data.errors.stocks}
              </div>
            ) : (
              <div className="space-y-2">
                {data.volumeRanking.slice(0, 10).map((stock, index) => (
                  <div
                    key={stock.symbol || index}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground w-4">
                        {index + 1}
                      </span>
                      <span className="font-medium">
                        {stock.name || stock.hts_kor_isnm}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">
                      {stock.volume
                        ? `${(stock.volume / 1000).toFixed(0)}K`
                        : 'N/A'}
                    </div>
                  </div>
                ))}
                {data.volumeRanking.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Volume ranking data not available
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 시장 지표 대시보드 */}
      <MarketIndicatorsDashboard refreshInterval={30000} className="w-full" />

      {/* 메인 콘텐츠 영역 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* 다음 액션 */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Next Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {fallbackData.marketStatus.nextAction}
                </p>
                <p className="text-sm text-muted-foreground">
                  Scheduled for {fallbackData.marketStatus.nextActionTime}
                </p>
              </div>
              <Badge variant="secondary">Upcoming</Badge>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Strategy Timeline (Day 1)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    15:30 - Market Close & Filtering
                  </span>
                  <Badge variant="default" className="text-xs">
                    Current
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    15:35 - Portfolio Building
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Next
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    16:00 - After-hours Monitoring
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Scheduled
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    17:40 - Session End
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Scheduled
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 시스템 상태 */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">API Connection</span>
                <div className="flex items-center">
                  <div
                    className={`h-2 w-2 rounded-full mr-2 ${
                      data.systemStatus?.api_connection
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      data.systemStatus?.api_connection
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {data.systemStatus?.api_connection
                      ? 'Connected'
                      : 'Disconnected'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">KIS API</span>
                <div className="flex items-center">
                  <div
                    className={`h-2 w-2 rounded-full mr-2 ${
                      data.systemStatus?.kis_api
                        ? 'bg-green-500'
                        : 'bg-yellow-500'
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      data.systemStatus?.kis_api
                        ? 'text-green-600'
                        : 'text-yellow-600'
                    }`}
                  >
                    {data.systemStatus?.kis_api ? 'Active' : 'Standby'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Data Stream</span>
                <div className="flex items-center">
                  <div
                    className={`h-2 w-2 rounded-full mr-2 ${
                      data.systemStatus?.data_stream === 'active'
                        ? 'bg-green-500'
                        : data.systemStatus?.data_stream === 'standby'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      data.systemStatus?.data_stream === 'active'
                        ? 'text-green-600'
                        : data.systemStatus?.data_stream === 'standby'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {data.systemStatus?.data_stream
                      ? data.systemStatus.data_stream.charAt(0).toUpperCase() +
                        data.systemStatus.data_stream.slice(1)
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
              <div className="space-y-2">
                <button className="w-full text-left text-sm p-2 rounded hover:bg-muted transition-colors">
                  → Start Stock Filtering
                </button>
                <button className="w-full text-left text-sm p-2 rounded hover:bg-muted transition-colors">
                  → View Market Data
                </button>
                <button className="w-full text-left text-sm p-2 rounded hover:bg-muted transition-colors">
                  → Check Portfolio
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
