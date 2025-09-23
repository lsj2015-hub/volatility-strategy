/**
 * Market Indicators Dashboard Component
 * 시장 지표 대시보드 컴포넌트
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IndexCard } from './IndexCard';
import { useMarketIndicators } from '@/hooks/useMarketIndicators';
import {
  RefreshCw,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MarketIndicatorsDashboardProps {
  refreshInterval?: number;
  className?: string;
}

export function MarketIndicatorsDashboard({
  refreshInterval = 30000,
  className
}: MarketIndicatorsDashboardProps) {
  const {
    data,
    loading,
    error,
    lastUpdated,
    health,
    refresh,
    isConnected,
    tradingMode
  } = useMarketIndicators(refreshInterval);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 1000); // Visual feedback
  };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return '업데이트 없음';
    return format(date, 'HH:mm:ss', { locale: ko });
  };

  const getTradingModeColor = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'mock':
      case 'simulation':
        return 'bg-blue-100 text-blue-800';
      case 'real':
      case 'live':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            시장 지표 오류
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="mt-4"
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              시장 지표
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm text-gray-600">
                  {isConnected ? '연결됨' : '연결 끊김'}
                </span>
              </div>

              {/* Trading Mode */}
              <Badge className={getTradingModeColor(tradingMode)}>
                {tradingMode === 'mock' ? '모의투자' :
                 tradingMode === 'real' ? '실거래' :
                 tradingMode.toUpperCase()}
              </Badge>

              {/* Refresh Button */}
              <Button
                onClick={handleRefresh}
                disabled={loading || isRefreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
                새로고침
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            마지막 업데이트: {formatLastUpdated(lastUpdated)}
            {refreshInterval > 0 && (
              <span className="ml-2">
                (자동 새로고침: {Math.round(refreshInterval / 1000)}초)
              </span>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Loading State */}
      {loading && !data && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>시장 데이터를 불러오는 중...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Index Cards */}
      {data && (data.kospi || data.kosdaq) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.kospi && (
            <IndexCard index={data.kospi} />
          )}
          {data.kosdaq && (
            <IndexCard index={data.kosdaq} />
          )}
        </div>
      )}

      {/* No Data State */}
      {data && !data.kospi && !data.kosdaq && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-gray-600">시장 데이터를 사용할 수 없습니다</div>
              <div className="text-sm text-gray-400 mt-1">
                나중에 다시 시도해주세요
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}