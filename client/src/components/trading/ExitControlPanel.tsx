"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  Target,
  DollarSign,
  TrendingDown,
  Settings,
  Zap,
  Shield,
  Timer
} from 'lucide-react'
import { Position } from '@/types'

interface ExitControlPanelProps {
  position: Position
  onManualExit?: (positionId: string, exitType: 'market' | 'limit', price?: number) => void
  onPartialExit?: (positionId: string, percentage: number, exitType: 'market' | 'limit', price?: number) => void
  onUpdateTargets?: (positionId: string, targets: { profitTarget: number, stopLoss: number }) => void
  onEmergencyStop?: (positionId: string) => void
}

export function ExitControlPanel({
  position,
  onManualExit,
  onPartialExit,
  onUpdateTargets,
  onEmergencyStop
}: ExitControlPanelProps) {
  const [exitType, setExitType] = useState<'market' | 'limit'>('market')
  const [limitPrice, setLimitPrice] = useState(position.currentPrice)
  const [partialPercentage, setPartialPercentage] = useState([50])
  const [newProfitTarget, setNewProfitTarget] = useState([5.0]) // 기본값 5% 목표
  const [newStopLoss, setNewStopLoss] = useState([2.0]) // 기본값 2% 손절
  const [confirmEmergency, setConfirmEmergency] = useState(false)

  const currentPnLPercent = position.current_pnl_percent ?? position.unrealizedPnLPercent
  const isProfitable = (position.current_pnl ?? position.unrealizedPnL) > 0
  const isNearTarget = currentPnLPercent >= newProfitTarget[0] * 0.8
  const isNearStopLoss = currentPnLPercent <= -newStopLoss[0] * 0.8
  const timeProgress = getTimeProgress()

  function getTimeProgress() {
    // 임시로 하드코딩된 값 사용 - 실제 구현에서는 position에서 가져와야 함
    const maxHoldHours = 8 // 기본값: 8시간 최대 보유
    const entryTime = new Date(position.entryTime)
    const currentTime = new Date()
    const elapsedHours = (currentTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60)

    return Math.max(0, Math.min(100, (elapsedHours / maxHoldHours) * 100))
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

  const handlePartialExit = () => {
    if (onPartialExit) {
      const price = exitType === 'limit' ? limitPrice : undefined
      onPartialExit(position.id, partialPercentage[0], exitType, price)
    }
  }

  const handleFullExit = () => {
    if (onManualExit) {
      const price = exitType === 'limit' ? limitPrice : undefined
      onManualExit(position.id, exitType, price)
    }
  }

  const handleUpdateTargets = () => {
    if (onUpdateTargets) {
      onUpdateTargets(position.id, {
        profitTarget: newProfitTarget[0],
        stopLoss: -newStopLoss[0]
      })
    }
  }

  const handleEmergencyStop = () => {
    if (confirmEmergency && onEmergencyStop) {
      onEmergencyStop(position.id)
      setConfirmEmergency(false)
    }
  }

  // 긴급 상황 감지
  const isEmergency = isNearStopLoss || timeProgress > 90

  return (
    <div className="space-y-6">
      {/* 포지션 상태 요약 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>매도 제어판</span>
            <Badge variant={isProfitable ? "default" : "destructive"}>
              {formatPercent(currentPnLPercent)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 현재 상태 지표 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <Target className={`w-5 h-5 ${isNearTarget ? 'text-green-600' : 'text-gray-400'}`} />
              <div>
                <div className="text-sm text-gray-500">목표까지</div>
                <div className="font-medium">
                  {((newProfitTarget[0] - currentPnLPercent) / newProfitTarget[0] * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Timer className={`w-5 h-5 ${timeProgress > 70 ? 'text-red-600' : 'text-gray-400'}`} />
              <div>
                <div className="text-sm text-gray-500">보유 시간</div>
                <div className="font-medium">{timeProgress.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* 시간 진행률 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>보유 시간</span>
              <span>{(100 - timeProgress).toFixed(1)}% 경과</span>
            </div>
            <Progress value={100 - timeProgress} className="h-2" />
          </div>

          {/* 긴급 상황 알림 */}
          {isEmergency && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {isNearStopLoss && "손절매 수준에 근접했습니다. "}
                {timeProgress > 90 && "보유 시간이 거의 만료됩니다. "}
                매도를 고려해보세요.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 매도 주문 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>매도 주문</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 주문 유형 선택 */}
          <div className="space-y-2">
            <Label>주문 유형</Label>
            <Select value={exitType} onValueChange={(value: 'market' | 'limit') => setExitType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">시장가 (즉시 체결)</SelectItem>
                <SelectItem value="limit">지정가 (가격 지정)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 지정가 설정 */}
          {exitType === 'limit' && (
            <div className="space-y-2">
              <Label>지정가</Label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(Number(e.target.value))}
                  placeholder="매도 희망가"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLimitPrice(position.currentPrice)}
                >
                  현재가
                </Button>
              </div>
              <div className="text-sm text-gray-500">
                현재가: {formatCurrency(position.currentPrice)}
              </div>
            </div>
          )}

          {/* 부분 매도 설정 */}
          <div className="space-y-2">
            <Label>매도 수량 ({partialPercentage[0]}%)</Label>
            <Slider
              value={partialPercentage}
              onValueChange={setPartialPercentage}
              max={100}
              min={10}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>10%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* 예상 수익 */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">예상 수익 ({partialPercentage[0]}% 매도)</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">매도 수량: </span>
                <span className="font-medium">
                  {Math.floor(position.quantity * partialPercentage[0] / 100).toLocaleString()}주
                </span>
              </div>
              <div>
                <span className="text-gray-500">예상 수익: </span>
                <span className={`font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency((position.current_pnl ?? position.unrealizedPnL) * partialPercentage[0] / 100)}
                </span>
              </div>
            </div>
          </div>

          {/* 매도 버튼들 */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handlePartialExit}
              disabled={position.status !== 'active'}
              className="flex items-center space-x-2"
            >
              <TrendingDown className="w-4 h-4" />
              <span>{partialPercentage[0]}% 매도</span>
            </Button>

            <Button
              variant={isEmergency ? "destructive" : "default"}
              onClick={handleFullExit}
              disabled={position.status !== 'active'}
              className="flex items-center space-x-2"
            >
              <DollarSign className="w-4 h-4" />
              <span>전량 매도</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 목표 수정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>목표 조정</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 목표 수익률 조정 */}
          <div className="space-y-2">
            <Label>목표 수익률 ({newProfitTarget[0].toFixed(1)}%)</Label>
            <Slider
              value={newProfitTarget}
              onValueChange={setNewProfitTarget}
              max={10}
              min={0.5}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>0.5%</span>
              <span>2.5%</span>
              <span>5%</span>
              <span>7.5%</span>
              <span>10%</span>
            </div>
          </div>

          {/* 손절매 조정 */}
          <div className="space-y-2">
            <Label>손절매 수준 (-{newStopLoss[0].toFixed(1)}%)</Label>
            <Slider
              value={newStopLoss}
              onValueChange={setNewStopLoss}
              max={10}
              min={0.5}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>-0.5%</span>
              <span>-2.5%</span>
              <span>-5%</span>
              <span>-7.5%</span>
              <span>-10%</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleUpdateTargets}
            disabled={position.status !== 'active'}
            className="w-full"
          >
            목표 업데이트
          </Button>
        </CardContent>
      </Card>

      {/* 긴급 매도 */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <Shield className="w-5 h-5" />
            <span>긴급 매도</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              긴급 매도는 시장가로 즉시 전량 매도됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={confirmEmergency}
                onChange={(e) => setConfirmEmergency(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">
                긴급 매도를 실행하겠습니다. (확인)
              </span>
            </label>

            <Button
              variant="destructive"
              onClick={handleEmergencyStop}
              disabled={!confirmEmergency || position.status !== 'active'}
              className="w-full flex items-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>긴급 매도 실행</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}