/**
 * Header 컴포넌트 - 메인 헤더
 */

'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Settings, TrendingUp } from 'lucide-react';
import { TradingModeToggle } from './TradingModeToggle';

export function Header() {


  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 xl:px-8 flex h-14 items-center">
        {/* 로고 및 제목 */}
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold">
              Volatility Trading
            </span>
          </Link>
        </div>



        {/* 우측 영역 */}
        <div className="ml-auto flex items-center space-x-4">
          {/* 거래 모드 토글 */}
          <TradingModeToggle />

          {/* 시장 상태 */}
          <Badge
            variant="outline"
            className="hidden sm:flex text-orange-600 border-orange-600"
          >
            <Activity className="mr-1 h-3 w-3" />
            Market Closed
          </Badge>

          {/* 설정 버튼 */}
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}