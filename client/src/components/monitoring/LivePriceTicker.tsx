/**
 * LivePriceTicker - 실시간 주가 티커 컴포넌트
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Wifi, WifiOff } from 'lucide-react';
import { useStockListMonitoring, useWebSocket } from '@/hooks/useWebSocket';

interface StockData {
  code: string;
  name: string;
  currentPrice: number;
  priceChange: number;
  changePercent: number;
  volume: number;
  lastUpdate: string;
  status: 'active' | 'triggered' | 'paused';
}

interface LivePriceTickerProps {
  stocks: StockData[];
}

export default function LivePriceTicker({
  stocks
}: LivePriceTickerProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  // WebSocket integration
  const { status: wsStatus } = useWebSocket();
  const stockCodes = stocks.map(stock => stock.code);
  const { prices: livePrices, pricesReceived } = useStockListMonitoring(stockCodes);

  // 실시간 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // WebSocket 가격 업데이트 시 애니메이션 트리거
  useEffect(() => {
    if (livePrices.length > 0) {
      setAnimationKey(prev => prev + 1);
    }
  }, [livePrices]);

  // 실시간 가격 데이터와 기본 주식 데이터 병합
  const getUpdatedStockData = (): StockData[] => {
    return stocks.map(stock => {
      const livePrice = livePrices.find(price => price.symbol === stock.code);
      if (livePrice) {
        return {
          ...stock,
          currentPrice: livePrice.price,
          priceChange: livePrice.change,
          changePercent: livePrice.changePercent,
          volume: livePrice.volume,
          lastUpdate: new Date().toLocaleTimeString('ko-KR', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        };
      }
      return stock;
    });
  };

  const displayStocks = getUpdatedStockData();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 100000000) {
      return `${(volume / 100000000).toFixed(1)}억`;
    } else if (volume >= 10000) {
      return `${(volume / 10000).toFixed(0)}만`;
    }
    return volume.toLocaleString();
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-blue-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-red-500';
    if (change < 0) return 'text-blue-500';
    return 'text-gray-500';
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            실시간 주가 현황
            {wsStatus.connected ? (
              <Wifi className="ml-2 h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="ml-2 h-4 w-4 text-red-500" />
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={wsStatus.connected ? "default" : "destructive"}>
              {wsStatus.connected ? '실시간 연결' : wsStatus.reconnecting ? '재연결 중' : '연결 끊김'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {currentTime?.toLocaleTimeString('ko-KR') || '--:--:--'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayStocks.map((stock) => (
            <div
              key={`${stock.code}-${animationKey}`}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-300"
            >
              {/* 종목 정보 */}
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div>
                    <div className="font-semibold text-lg">{stock.name}</div>
                    <div className="text-sm text-muted-foreground">{stock.code}</div>
                  </div>
                  <Badge
                    variant={
                      stock.status === 'triggered' ? 'default' :
                      stock.status === 'active' ? 'secondary' :
                      'outline'
                    }
                    className="ml-2"
                  >
                    {stock.status === 'triggered' ? '매수 신호' :
                     stock.status === 'active' ? '모니터링' : '일시정지'}
                  </Badge>
                </div>
              </div>

              {/* 가격 정보 */}
              <div className="flex items-center space-x-6">
                {/* 현재가 */}
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    ₩{formatPrice(stock.currentPrice)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    거래량: {formatVolume(stock.volume)}
                  </div>
                </div>

                {/* 변동 정보 */}
                <div className="text-right min-w-[120px]">
                  <div className={`flex items-center justify-end space-x-1 ${getChangeColor(stock.priceChange)}`}>
                    {getChangeIcon(stock.priceChange)}
                    <span className="font-semibold">
                      {stock.priceChange >= 0 ? '+' : ''}{formatPrice(stock.priceChange)}
                    </span>
                  </div>
                  <div className={`text-sm ${getChangeColor(stock.changePercent)}`}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </div>
                </div>

                {/* 업데이트 시간 */}
                <div className="text-right text-xs text-muted-foreground min-w-[60px]">
                  <div>마지막</div>
                  <div>업데이트</div>
                  <div className="font-mono">{stock.lastUpdate}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 연결 상태 푸터 */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              모니터링 종목: {stockCodes.length}개 | 실시간 수신: {pricesReceived}개
            </span>
            <span>
              {wsStatus.connected ?
                `실시간 WebSocket 스트리밍 활성` :
                wsStatus.reconnecting ?
                  '연결 재시도 중...' :
                  '데이터 연결을 확인해주세요'
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}