/**
 * Footer 컴포넌트
 */

'use client';

import { Badge } from '@/components/ui/badge';

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 xl:px-8 flex h-12 items-center justify-between">
        {/* 좌측 정보 */}
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>© 2025 Volatility Trading Strategy</span>
        </div>

        {/* 우측 상태 정보 */}
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-xs">
            v1.0.0
          </Badge>
        </div>
      </div>
    </footer>
  );
}