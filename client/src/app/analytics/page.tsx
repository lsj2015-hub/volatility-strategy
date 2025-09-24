/**
 * Analytics 페이지 - 성과 분석 인터페이스
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Calendar, Target, PieChart, LineChart } from 'lucide-react';

export default function AnalyticsPage() {
  // 시뮬레이션 데이터
  const performanceMetrics = {
    totalReturn: 1250000,
    totalReturnPercent: 12.5,
    winRate: 68,
    avgWin: 380000,
    avgLoss: -220000,
    sharpeRatio: 1.42,
    maxDrawdown: -8.3,
    volatility: 15.2
  };

  const periodData = {
    daily: { trades: 15, pnl: 850000, winRate: 73 },
    weekly: { trades: 75, pnl: 3200000, winRate: 64 },
    monthly: { trades: 320, pnl: 12500000, winRate: 68 }
  };

  const recentTrades = [
    {
      date: '2024-01-15',
      stock: 'NAVER',
      type: 'Long',
      pnl: 450000,
      pnlPercent: 4.2,
      holdTime: '6h 20m'
    },
    {
      date: '2024-01-15',
      stock: '삼성전자',
      type: 'Long',
      pnl: -180000,
      pnlPercent: -2.1,
      holdTime: '4h 15m'
    },
    {
      date: '2024-01-14',
      stock: 'SK하이닉스',
      type: 'Long',
      pnl: 320000,
      pnlPercent: 3.8,
      holdTime: '5h 45m'
    },
  ];

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
          <p className="text-muted-foreground">
            Analyze trading performance and strategy effectiveness
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Date Range
          </Button>
          <Button variant="outline" size="sm">
            Export Report
          </Button>
        </div>
      </div>

      {/* 핵심 성과 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Return</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +₩{performanceMetrics.totalReturn.toLocaleString()}
            </div>
            <div className="text-xs text-green-600">
              +{performanceMetrics.totalReturnPercent}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.winRate}%</div>
            <div className="text-xs text-muted-foreground">Above target (60%)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.sharpeRatio}</div>
            <div className="text-xs text-muted-foreground">Risk-adjusted return</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {performanceMetrics.maxDrawdown}%
            </div>
            <div className="text-xs text-muted-foreground">Worst losing streak</div>
          </CardContent>
        </Card>
      </div>

      {/* 성과 차트 및 분석 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="mr-2 h-5 w-5" />
                Performance Chart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="mx-auto h-12 w-12 mb-4" />
                  <p>Performance chart will be displayed here</p>
                  <p className="text-sm">Daily P&L, cumulative returns, and drawdown analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 기간별 성과 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Period Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Daily</span>
                  <Badge variant="secondary">
                    {periodData.daily.trades} trades
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">P&L</span>
                  <span className="text-green-600">
                    +₩{periodData.daily.pnl.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span>{periodData.daily.winRate}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Weekly</span>
                  <Badge variant="secondary">
                    {periodData.weekly.trades} trades
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">P&L</span>
                  <span className="text-green-600">
                    +₩{periodData.weekly.pnl.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span>{periodData.weekly.winRate}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Monthly</span>
                  <Badge variant="secondary">
                    {periodData.monthly.trades} trades
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">P&L</span>
                  <span className="text-green-600">
                    +₩{periodData.monthly.pnl.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span>{periodData.monthly.winRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Average Win</span>
                <span className="text-green-600">
                  +₩{performanceMetrics.avgWin.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Average Loss</span>
                <span className="text-red-600">
                  ₩{performanceMetrics.avgLoss.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Volatility</span>
                <span>{performanceMetrics.volatility}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Risk/Reward</span>
                <span>1:{(performanceMetrics.avgWin / Math.abs(performanceMetrics.avgLoss)).toFixed(1)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 최근 거래 기록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5" />
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Stock</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">P&L</th>
                  <th className="text-left p-2">Return %</th>
                  <th className="text-left p-2">Hold Time</th>
                  <th className="text-left p-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">{trade.date}</td>
                    <td className="p-2 font-medium">{trade.stock}</td>
                    <td className="p-2">
                      <Badge variant="outline">{trade.type}</Badge>
                    </td>
                    <td className="p-2">
                      <span className={`${
                        trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {trade.pnl >= 0 ? '+' : ''}₩{trade.pnl.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`${
                        trade.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent}%
                      </span>
                    </td>
                    <td className="p-2">{trade.holdTime}</td>
                    <td className="p-2">
                      <Badge variant={trade.pnl >= 0 ? 'default' : 'destructive'}>
                        {trade.pnl >= 0 ? 'Win' : 'Loss'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 전략 효과성 분석 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              Strategy Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Momentum Strategy</span>
                  <span>75% success</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Volume Breakout</span>
                  <span>60% success</span>
                </div>
                <Progress value={60} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Technical Signals</span>
                  <span>68% success</span>
                </div>
                <Progress value={68} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optimization Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                Volume Threshold
              </p>
              <p className="text-xs text-blue-700">
                Consider increasing minimum volume to 1.5B KRW for better momentum
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-900">
                Exit Timing
              </p>
              <p className="text-xs text-green-700">
                Current 14:30 exit timing shows optimal results
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm font-medium text-yellow-900">
                Position Sizing
              </p>
              <p className="text-xs text-yellow-700">
                Consider dynamic position sizing based on volatility
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}