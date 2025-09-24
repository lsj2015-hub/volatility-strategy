"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react'
import { Position } from '@/types'

interface PositionCardProps {
  position: Position
  onManualExit?: (positionId: string) => void
  onPartialExit?: (positionId: string, percentage: number) => void
}

export function PositionCard({ position, onManualExit, onPartialExit }: PositionCardProps) {
  const currentPnL = position.current_pnl ?? position.unrealizedPnL ?? 0;
  const currentPnLPercent = position.current_pnl_percent ?? position.unrealizedPnLPercent ?? 0;
  const isProfitable = currentPnL > 0
  const pnlColor = isProfitable ? 'text-green-600' : 'text-red-600'
  const pnlIcon = isProfitable ? TrendingUp : TrendingDown
  const PnLIcon = pnlIcon

  // Default values for missing properties
  const targetProfitPercent = 5.0; // Default 5% profit target
  const stopLossPercent = -2.0; // Default -2% stop loss
  const maxHoldHours = 6; // Default 6 hours max hold

  // 목표까지의 진행률 계산
  const getTargetProgress = () => {
    if (isProfitable) {
      return Math.min(100, (currentPnLPercent / targetProfitPercent) * 100)
    } else {
      const lossProgress = Math.abs(currentPnLPercent / stopLossPercent) * 100
      return Math.min(100, lossProgress)
    }
  }

  // 시간 남은 비율 계산
  const getTimeProgress = () => {
    // Calculate elapsed time from entry
    const entryTime = new Date(position.entryTime);
    const currentTime = new Date();
    const elapsedHours = (currentTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60);
    const remainingHours = Math.max(0, maxHoldHours - elapsedHours);

    return Math.max(0, (remainingHours / maxHoldHours) * 100);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const getStatusBadge = () => {
    switch (position.status) {
      case 'active':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">활성</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">대기중</Badge>
      case 'closed':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">종료</Badge>
      default:
        return <Badge variant="outline">{position.status}</Badge>
    }
  }

  return (
    <Card className="w-full transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="text-lg font-semibold">
              {position.symbol}
            </CardTitle>
            {getStatusBadge()}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">{position.name}</div>
            <div className="text-xs text-gray-400">
              진입: {new Date(position.entryTime).toLocaleString('ko-KR')}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 가격 정보 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">진입가</div>
            <div className="text-lg font-semibold">
              {formatCurrency(position.averagePrice)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">현재가</div>
            <div className="text-lg font-semibold">
              {formatCurrency(position.currentPrice)}
            </div>
          </div>
        </div>

        <Separator />

        {/* 손익 정보 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PnLIcon className={`w-4 h-4 ${isProfitable ? 'text-green-600' : 'text-red-600'}`} />
              <span className="text-sm font-medium">손익</span>
            </div>
            <div className={`text-right ${pnlColor}`}>
              <div className="font-semibold">
                {formatCurrency(currentPnL)}
              </div>
              <div className="text-sm">
                {formatPercent(currentPnLPercent)}
              </div>
            </div>
          </div>

          {/* 목표/손절 진행률 */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>손절: {formatPercent(stopLossPercent)}</span>
              <span>목표: {formatPercent(targetProfitPercent)}</span>
            </div>
            <Progress
              value={getTargetProgress()}
              className={`h-2 ${isProfitable ? 'text-green-600' : 'text-red-600'}`}
            />
          </div>
        </div>

        <Separator />

        {/* 포지션 세부 정보 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">수량</div>
            <div className="font-medium">{position.quantity.toLocaleString()}주</div>
          </div>
          <div>
            <div className="text-gray-500">투자금</div>
            <div className="font-medium">
              {formatCurrency(position.averagePrice * position.quantity)}
            </div>
          </div>
        </div>

        {/* 시간 정보 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500">보유 시간</span>
            </div>
            <div className="text-right">
              <div className="font-medium">
                진행률: {(100 - getTimeProgress()).toFixed(1)}%
              </div>
            </div>
          </div>
          <Progress value={getTimeProgress()} className="h-2" />
        </div>

        {/* 시장가치/실현손익 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">시장가치</div>
            <div className="font-medium text-blue-600">
              {formatCurrency(position.marketValue)}
            </div>
          </div>
          <div>
            <div className="text-gray-500">실현손익</div>
            <div className={`font-medium ${position.realizedPnL && position.realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(position.realizedPnL ?? 0)}
            </div>
          </div>
        </div>

        {/* 액션 버튼들 (활성 포지션만) */}
        {position.status === 'active' && (
          <>
            <Separator />
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPartialExit?.(position.id, 50)}
                className="flex-1"
              >
                50% 매도
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPartialExit?.(position.id, 100)}
                className="flex-1"
              >
                전량 매도
              </Button>
            </div>

            {/* 긴급 매도 버튼 */}
            {currentPnLPercent <= stopLossPercent && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onManualExit?.(position.id)}
                className="w-full flex items-center space-x-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>긴급 매도</span>
              </Button>
            )}
          </>
        )}

        {/* 종료된 포지션 정보 */}
        {position.status === 'closed' && position.exitTime && (
          <>
            <Separator />
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">매도가:</span>
                <span className="font-medium">
                  {position.exitPrice ? formatCurrency(position.exitPrice) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">매도 시간:</span>
                <span className="font-medium">
                  {new Date(position.exitTime).toLocaleString('ko-KR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">실현손익:</span>
                <span className={`font-medium ${position.realizedPnL && position.realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(position.realizedPnL ?? 0)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}