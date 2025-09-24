/**
 * Index Card Component
 * 개별 지수 표시 카드 컴포넌트
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { IndexData } from '@/types';

interface IndexCardProps {
  index: IndexData;
  className?: string;
}

export function IndexCard({ index, className }: IndexCardProps) {
  const isPositive = index.change > 0;
  const isNegative = index.change < 0;

  const changeColor = isPositive ? 'text-red-600' : isNegative ? 'text-blue-600' : 'text-gray-500';
  const bgColor = isPositive ? 'bg-red-50' : isNegative ? 'bg-blue-50' : 'bg-gray-50';
  const borderColor = isPositive ? 'border-red-200' : isNegative ? 'border-blue-200' : 'border-gray-200';

  const formatNumber = (num: number) => {
    return num.toLocaleString('ko-KR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(0)}백만`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(0)}천`;
    }
    return volume.toLocaleString('ko-KR');
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000000000) {
      return `${(amount / 1000000000000).toFixed(1)}조`;
    } else if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(0)}억`;
    }
    return amount.toLocaleString('ko-KR');
  };

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <Card className={`${className} ${bgColor} ${borderColor} border-2 transition-all hover:shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">{index.index_name}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {index.index_code}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Price */}
        <div className="text-center">
          <div className="text-3xl font-bold">{formatNumber(index.current_price)}</div>
          <div className={`flex items-center justify-center gap-1 text-sm font-medium ${changeColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span>
              {isPositive ? '+' : ''}{formatNumber(index.change)}
              ({isPositive ? '+' : ''}{index.change_rate.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Price Range */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center">
            <div className="text-gray-500">시가</div>
            <div className="font-medium">{formatNumber(index.open_price)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">고가</div>
            <div className="font-medium text-red-600">{formatNumber(index.high_price)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">저가</div>
            <div className="font-medium text-blue-600">{formatNumber(index.low_price)}</div>
          </div>
        </div>

        {/* Trading Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-gray-500">거래량</div>
            <div className="font-medium">{formatVolume(index.volume)}</div>
          </div>
          <div>
            <div className="text-gray-500">거래대금</div>
            <div className="font-medium">{formatAmount(index.trade_amount)}</div>
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-gray-500">상승</div>
            <div className="font-medium text-red-600">{index.up_count}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">하락</div>
            <div className="font-medium text-blue-600">{index.down_count}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">보합</div>
            <div className="font-medium text-gray-600">{index.unchanged_count}</div>
          </div>
        </div>

        {/* Year Range */}
        <div className="border-t pt-2 text-xs">
          <div className="flex justify-between">
            <div>
              <span className="text-gray-500">연중최고: </span>
              <span className="font-medium text-red-600">{formatNumber(index.year_high)}</span>
              <span className="text-gray-400 ml-1">({index.year_high_date})</span>
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <div>
              <span className="text-gray-500">연중최저: </span>
              <span className="font-medium text-blue-600">{formatNumber(index.year_low)}</span>
              <span className="text-gray-400 ml-1">({index.year_low_date})</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}