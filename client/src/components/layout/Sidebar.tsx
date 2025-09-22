/**
 * Sidebar 컴포넌트 - 사이드바 네비게이션
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  Clock,
  Filter,
  Home,
  Monitor,
  PieChart,
  Settings,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Filtering', href: '/filtering', icon: Filter },
    { name: 'Portfolio', href: '/portfolio', icon: Wallet },
    { name: 'Monitoring', href: '/monitoring', icon: Monitor },
    { name: 'Trading', href: '/trading', icon: TrendingUp },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // 시뮬레이션 데이터
  const tradingSession = {
    day: 'Day 1' as const,
    phase: 'Filtering' as const,
    timeRemaining: '25:30',
    progress: 65
  };

  const portfolioSummary = {
    totalValue: 10000000,
    unrealizedPnL: 150000,
    unrealizedPnLPercent: 1.5,
    positions: 5
  };

  return (
    <div className={`pb-12 ${className}`}>
      <div className="space-y-4 py-4">
        {/* 네비게이션 메뉴 */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Navigation
          </h2>
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isActive && "bg-primary text-primary-foreground"
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 거래 세션 상태 */}
        <div className="px-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Trading Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current</span>
                <Badge variant="outline">{tradingSession.day}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Phase</span>
                <Badge variant="secondary">{tradingSession.phase}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Time</span>
                <div className="flex items-center text-sm">
                  <Clock className="mr-1 h-3 w-3" />
                  {tradingSession.timeRemaining}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span>{tradingSession.progress}%</span>
                </div>
                <Progress value={tradingSession.progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 포트폴리오 요약 */}
        <div className="px-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Portfolio Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Value</span>
                <span className="text-sm font-medium">
                  ₩{portfolioSummary.totalValue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">P&L</span>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    portfolioSummary.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {portfolioSummary.unrealizedPnL >= 0 ? '+' : ''}
                    ₩{portfolioSummary.unrealizedPnL.toLocaleString()}
                  </div>
                  <div className={`text-xs ${
                    portfolioSummary.unrealizedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {portfolioSummary.unrealizedPnLPercent >= 0 ? '+' : ''}
                    {portfolioSummary.unrealizedPnLPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Positions</span>
                <span className="text-sm font-medium">
                  {portfolioSummary.positions}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 시장 지표 */}
        <div className="px-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Market Indicators
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">KOSPI</span>
                <div className="text-right">
                  <div className="text-sm font-medium">2,580.45</div>
                  <div className="text-xs text-green-600">+1.2%</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">KOSDAQ</span>
                <div className="text-right">
                  <div className="text-sm font-medium">768.92</div>
                  <div className="text-xs text-red-600">-0.8%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}