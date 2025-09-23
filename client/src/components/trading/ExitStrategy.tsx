"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  Play,
  Pause,
  Settings,
  BarChart3
} from 'lucide-react'

interface ExitPhase {
  phase: string
  name: string
  start_time: string
  end_time: string
  profit_target: number
  stop_loss: number
  urgency_multiplier: number
  description: string
}

interface ExitStrategyStatus {
  is_running: boolean
  current_phase: string
  current_time: string
  profit_target: number
  stop_loss: number
  urgency_multiplier: number
  next_phase_time: string | null
  active_positions: number
}

interface ExitRecommendation {
  position_id: string
  symbol: string
  action: 'exit_immediately' | 'exit_recommended'
  reason: string
  current_pnl_percent: number
  urgency: 'high' | 'medium' | 'low'
  target_profit: number
  current_profit: number
}

export function ExitStrategy() {
  const [strategyStatus, setStrategyStatus] = useState<ExitStrategyStatus | null>(null)
  const [recommendations, setRecommendations] = useState<ExitRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 미리 정의된 매도 단계들
  const exitPhases: ExitPhase[] = [
    {
      phase: 'early_morning',
      name: '이른 아침',
      start_time: '09:00',
      end_time: '11:00',
      profit_target: 4.0,
      stop_loss: -1.5,
      urgency_multiplier: 0.8,
      description: '보수적 접근 - 높은 목표 수익률'
    },
    {
      phase: 'mid_morning',
      name: '오전',
      start_time: '11:00',
      end_time: '13:00',
      profit_target: 3.0,
      stop_loss: -2.0,
      urgency_multiplier: 1.0,
      description: '균형 접근 - 중간 목표 수익률'
    },
    {
      phase: 'afternoon',
      name: '오후',
      start_time: '13:00',
      end_time: '15:00',
      profit_target: 2.0,
      stop_loss: -2.5,
      urgency_multiplier: 1.5,
      description: '적극적 접근 - 낮은 목표 수익률'
    },
    {
      phase: 'force_exit',
      name: '강제 매도',
      start_time: '15:00',
      end_time: '15:30',
      profit_target: 0.5,
      stop_loss: -5.0,
      urgency_multiplier: 3.0,
      description: '장 마감 임박 - 모든 포지션 정리'
    }
  ]

  const loadStrategyStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      // API 호출로 전략 상태 및 추천 가져오기
      // 실제 구현에서는 portfolioApi.getExitStrategy() 등을 사용
      const mockStatus: ExitStrategyStatus = {
        is_running: true,
        current_phase: 'mid_morning',
        current_time: new Date().toLocaleTimeString('ko-KR'),
        profit_target: 3.0,
        stop_loss: -2.0,
        urgency_multiplier: 1.0,
        next_phase_time: '13:00',
        active_positions: 5
      }

      const mockRecommendations: ExitRecommendation[] = [
        {
          position_id: 'POS_001',
          symbol: 'AAPL',
          action: 'exit_immediately',
          reason: 'profit_target',
          current_pnl_percent: 3.2,
          urgency: 'high',
          target_profit: 3.0,
          current_profit: 3.2
        }
      ]

      setStrategyStatus(mockStatus)
      setRecommendations(mockRecommendations)

    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStrategyStatus()

    // 1분마다 상태 업데이트
    const interval = setInterval(loadStrategyStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const toggleStrategy = async () => {
    try {
      if (strategyStatus?.is_running) {
        // 전략 중지
        // await portfolioApi.stopExitStrategy()
      } else {
        // 전략 시작
        // await portfolioApi.startExitStrategy()
      }

      await loadStrategyStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : '전략 상태를 변경할 수 없습니다.')
    }
  }

  const getCurrentPhase = () => {
    return exitPhases.find(phase => phase.phase === strategyStatus?.current_phase)
  }

  const getPhaseProgress = () => {
    const currentPhase = getCurrentPhase()
    if (!currentPhase || !strategyStatus) return 0

    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM

    const startMinutes = timeToMinutes(currentPhase.start_time)
    const endMinutes = timeToMinutes(currentPhase.end_time)
    const currentMinutes = timeToMinutes(currentTime)

    if (currentMinutes < startMinutes) return 0
    if (currentMinutes > endMinutes) return 100

    return ((currentMinutes - startMinutes) / (endMinutes - startMinutes)) * 100
  }

  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertTriangle className="w-4 h-4" />
      case 'medium': return <Clock className="w-4 h-4" />
      case 'low': return <Target className="w-4 h-4" />
      default: return <BarChart3 className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div>매도 전략 로드 중...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-red-600 text-center">
            <div className="font-semibold">오류가 발생했습니다</div>
            <div className="text-sm">{error}</div>
          </div>
          <Button onClick={loadStrategyStatus} variant="outline" size="sm">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    )
  }

  const currentPhase = getCurrentPhase()
  const phaseProgress = getPhaseProgress()

  return (
    <div className="space-y-6">
      {/* 전략 상태 헤더 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>시간 기반 매도 전략</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant={strategyStatus?.is_running ? "default" : "secondary"}>
                {strategyStatus?.is_running ? '실행 중' : '중지됨'}
              </Badge>
              <Button
                onClick={toggleStrategy}
                variant={strategyStatus?.is_running ? "outline" : "default"}
                size="sm"
              >
                {strategyStatus?.is_running ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    중지
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    시작
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">현재 시간</div>
              <div className="text-lg font-semibold">{strategyStatus?.current_time}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">현재 단계</div>
              <div className="text-lg font-semibold">{currentPhase?.name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">활성 포지션</div>
              <div className="text-lg font-semibold">{strategyStatus?.active_positions}개</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 현재 단계 정보 */}
      {currentPhase && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>현재 단계: {currentPhase.name}</span>
              <Badge variant="outline">
                {currentPhase.start_time} - {currentPhase.end_time}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">{currentPhase.description}</div>

            {/* 단계 진행률 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>단계 진행률</span>
                <span>{phaseProgress.toFixed(1)}%</span>
              </div>
              <Progress value={phaseProgress} className="h-2" />
            </div>

            {/* 현재 목표 설정 */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-green-600 font-medium">목표 수익률</div>
                <div className="text-lg font-bold text-green-700">
                  +{currentPhase.profit_target}%
                </div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-red-600 font-medium">손절매</div>
                <div className="text-lg font-bold text-red-700">
                  {currentPhase.stop_loss}%
                </div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-blue-600 font-medium">시급성</div>
                <div className="text-lg font-bold text-blue-700">
                  {currentPhase.urgency_multiplier}x
                </div>
              </div>
            </div>

            {/* 다음 단계 정보 */}
            {strategyStatus?.next_phase_time && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  다음 단계는 {strategyStatus.next_phase_time}에 시작됩니다.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* 매도 추천 사항 */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>매도 추천</span>
              <Badge variant="destructive">{recommendations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${getUrgencyColor(rec.urgency)}`}>
                        {getUrgencyIcon(rec.urgency)}
                      </div>
                      <div>
                        <div className="font-semibold">{rec.symbol}</div>
                        <div className="text-sm text-gray-500">{rec.position_id}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${rec.current_pnl_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(rec.current_pnl_percent)}
                      </div>
                      <div className="text-sm text-gray-500">
                        목표: {formatPercent(rec.target_profit)}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="font-medium mb-1">추천 사유:</div>
                    <div className="text-gray-600">
                      {rec.reason === 'profit_target' && '목표 수익률에 도달했습니다'}
                      {rec.reason === 'stop_loss' && '손절매 수준에 도달했습니다'}
                      {rec.reason === 'time_based' && '보유 시간이 만료되었습니다'}
                      {rec.reason === 'time_adjusted_target' && '시간 조정된 목표에 도달했습니다'}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant={rec.action === 'exit_immediately' ? 'destructive' : 'outline'}
                      className="flex-1"
                    >
                      {rec.action === 'exit_immediately' ? (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          즉시 매도
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-4 h-4 mr-2" />
                          매도 고려
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 전략 단계 타임라인 */}
      <Card>
        <CardHeader>
          <CardTitle>매도 전략 타임라인</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exitPhases.map((phase, index) => (
              <div
                key={phase.phase}
                className={`p-4 rounded-lg border-2 ${
                  phase.phase === strategyStatus?.current_phase
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      phase.phase === strategyStatus?.current_phase
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{phase.name}</div>
                      <div className="text-sm text-gray-500">
                        {phase.start_time} - {phase.end_time}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>목표: +{phase.profit_target}%</div>
                    <div>손절: {phase.stop_loss}%</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">{phase.description}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}