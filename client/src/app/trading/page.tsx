/**
 * Trading 페이지 - 거래 관리 인터페이스
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Clock, Target, AlertTriangle } from 'lucide-react';

export default function TradingPage() {
  // 시뮬레이션 데이터
  const currentPositions = [
    {
      code: 'A035420',
      name: 'NAVER',
      quantity: 50,
      avgPrice: 185000,
      currentPrice: 191000,
      unrealizedPnL: 300000,
      unrealizedPnLPercent: 3.24,
      targetPrice: 203500,
      stopLoss: 166500,
      timeHeld: '2h 15m',
      exitTarget: '14:30',
      status: 'holding'
    },
    {
      code: 'A005930',
      name: '삼성전자',
      quantity: 100,
      avgPrice: 73800,
      currentPrice: 72500,
      unrealizedPnL: -130000,
      unrealizedPnLPercent: -1.76,
      targetPrice: 81180,
      stopLoss: 66420,
      timeHeld: '1h 45m',
      exitTarget: '14:30',
      status: 'holding'
    },
  ];

  const tradingSession = {
    totalInvested: 12940000,
    totalUnrealizedPnL: 170000,
    totalUnrealizedPnLPercent: 1.31,
    winRate: 60,
    tradesCount: 5,
    timeUntilForceExit: '6h 45m'
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Trading</h1>
          <p className="text-muted-foreground">
            Monitor and manage active trading positions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">Day 2</Badge>
          <Badge variant="secondary">09:00-15:30</Badge>
          <Badge variant="destructive">Force Exit: 15:20</Badge>
        </div>
      </div>

      {/* 거래 세션 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₩{tradingSession.totalInvested.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Across {currentPositions.length} positions</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              tradingSession.totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {tradingSession.totalUnrealizedPnL >= 0 ? '+' : ''}
              ₩{tradingSession.totalUnrealizedPnL.toLocaleString()}
            </div>
            <div className={`text-xs ${
              tradingSession.totalUnrealizedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {tradingSession.totalUnrealizedPnLPercent >= 0 ? '+' : ''}
              {tradingSession.totalUnrealizedPnLPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPositions.length}</div>
            <div className="text-xs text-muted-foreground">Being monitored</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tradingSession.winRate}%</div>
            <div className="text-xs text-muted-foreground">{tradingSession.tradesCount} trades today</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Force Exit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{tradingSession.timeUntilForceExit}</div>
            <div className="text-xs text-muted-foreground">Until 15:20</div>
          </CardContent>
        </Card>
      </div>

      {/* 포지션 관리 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Active Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentPositions.map((position) => (
                  <div key={position.code} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{position.name}</h3>
                        <p className="text-sm text-muted-foreground">{position.code}</p>
                      </div>
                      <Badge variant={position.unrealizedPnL >= 0 ? 'default' : 'destructive'}>
                        {position.unrealizedPnL >= 0 ? 'Profit' : 'Loss'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Quantity</span>
                        <div className="font-medium">{position.quantity} shares</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Price</span>
                        <div className="font-medium">₩{position.avgPrice.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Current</span>
                        <div className="font-medium">₩{position.currentPrice.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">P&L</span>
                        <div className={`font-medium ${
                          position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {position.unrealizedPnL >= 0 ? '+' : ''}
                          ₩{position.unrealizedPnL.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center">
                          <Target className="mr-1 h-3 w-3 text-green-600" />
                          Target: ₩{position.targetPrice.toLocaleString()}
                        </div>
                        <div className="flex items-center">
                          <AlertTriangle className="mr-1 h-3 w-3 text-red-600" />
                          Stop: ₩{position.stopLoss.toLocaleString()}
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {position.timeHeld}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          Partial Exit
                        </Button>
                        <Button size="sm" variant="destructive">
                          Exit All
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 거래 제어 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exit Strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Time-based Exit</span>
                  <span>14:30 Target</span>
                </div>
                <Progress value={75} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  75% of trading day completed
                </div>
              </div>

              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Target className="mr-2 h-4 w-4" />
                  Update Targets
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Adjust Stop Loss
                </Button>
                <Button variant="destructive" className="w-full">
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Emergency Exit All
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Realized P&L</span>
                <span className="text-green-600">+₩450,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unrealized P&L</span>
                <span className="text-green-600">+₩170,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total P&L</span>
                <span className="text-green-600 font-medium">+₩620,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Win Rate</span>
                <span>{tradingSession.winRate}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trades</span>
                <span>{tradingSession.tradesCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
                Risk Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max Drawdown</span>
                <span className="text-red-600">-2.1%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Risk Level</span>
                <span className="text-yellow-600">Medium</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Position Size</span>
                <span className="text-green-600">✓ Safe</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}