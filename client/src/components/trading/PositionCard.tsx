"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { TrendingUp, TrendingDown, Clock, Target, AlertTriangle, DollarSign } from 'lucide-react'
import { Position } from '@/types'

interface PositionCardProps {
  position: Position
  onManualExit?: (positionId: string) => void
  onPartialExit?: (positionId: string, percentage: number) => void
}

export function PositionCard({ position, onManualExit, onPartialExit }: PositionCardProps) {
  const isProfitable = position.current_pnl > 0
  const pnlColor = isProfitable ? 'text-green-600' : 'text-red-600'
  const pnlIcon = isProfitable ? TrendingUp : TrendingDown
  const PnLIcon = pnlIcon

  // 목표까지의 진행률 계산
  const getTargetProgress = () => {
    if (isProfitable) {
      return Math.min(100, (position.current_pnl_percent / position.target_profit_percent) * 100)
    } else {
      const lossProgress = Math.abs(position.current_pnl_percent / position.stop_loss_percent) * 100
      return Math.min(100, lossProgress)
    }
  }

  // 시간 남은 비율 계산
  const getTimeProgress = () => {
    if (!position.time_remaining) return 100

    const totalMinutes = position.max_hold_hours * 60
    const remainingMinutes = parseInt(position.time_remaining.split(':')[0]) * 60 +
                           parseInt(position.time_remaining.split(':')[1])

    return Math.max(0, (remainingMinutes / totalMinutes) * 100)
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
      case 'monitoring':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">모니터링</Badge>
      case 'exit_pending':
        return <Badge variant="destructive" className="bg-orange-100 text-orange-800">매도 대기</Badge>
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
            <div className="text-sm text-gray-500">{position.stock_name}</div>
            <div className="text-xs text-gray-400">
              진입: {new Date(position.entry_time).toLocaleString('ko-KR')}
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
              {formatCurrency(position.entry_price)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">현재가</div>
            <div className="text-lg font-semibold">
              {formatCurrency(position.current_price)}
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
                {formatCurrency(position.current_pnl)}
              </div>
              <div className="text-sm">
                {formatPercent(position.current_pnl_percent)}
              </div>
            </div>
          </div>

          {/* 목표/손절 진행률 */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>손절: {formatPercent(position.stop_loss_percent)}</span>
              <span>목표: {formatPercent(position.target_profit_percent)}</span>
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
              {formatCurrency(position.entry_price * position.quantity)}
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
                남은 시간: {position.time_remaining || 'N/A'}
              </div>
            </div>
          </div>
          <Progress value={getTimeProgress()} className="h-2" />
        </div>

        {/* 최고가/최저가 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">최고가</div>
            <div className="font-medium text-green-600">
              {formatCurrency(position.highest_price)}
            </div>
          </div>
          <div>
            <div className="text-gray-500">최저가</div>
            <div className="font-medium text-red-600">
              {formatCurrency(position.lowest_price)}
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
                onClick={() => onPartialExit?.(position.position_id, 50)}
                className="flex-1"
              >
                50% 매도
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPartialExit?.(position.position_id, 100)}
                className="flex-1"
              >
                전량 매도
              </Button>
            </div>

            {/* 긴급 매도 버튼 */}
            {position.current_pnl_percent <= position.stop_loss_percent && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onManualExit?.(position.position_id)}
                className="w-full flex items-center space-x-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>긴급 매도</span>
              </Button>
            )}
          </>
        )}

        {/* 종료된 포지션 정보 */}
        {position.status === 'closed' && position.exit_time && (
          <>
            <Separator />
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">매도가:</span>
                <span className="font-medium">
                  {position.exit_price ? formatCurrency(position.exit_price) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">매도 시간:</span>
                <span className="font-medium">
                  {new Date(position.exit_time).toLocaleString('ko-KR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">매도 사유:</span>
                <span className="font-medium">{position.exit_reason || 'N/A'}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}