'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Play, Square, Settings, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import type {
  MonitoringSessionStatus,
  StartMonitoringRequest,
  PHASE_LABELS
} from '@/types/monitoring';

interface SessionControlsProps {
  status: MonitoringSessionStatus | null;
  isLoading: boolean;
  error: string | null;
  onStartSession: (targets: StartMonitoringRequest['targets']) => Promise<void>;
  onStopSession: () => Promise<void>;
}

const PHASE_LABELS: Record<string, string> = {
  waiting: '대기 중',
  phase_1: '1단계 (16:00-16:30)',
  phase_2: '2단계 (16:30-17:00)',
  phase_3: '3단계 (17:00-17:30)',
  phase_4: '4단계 (17:30-17:40)',
  completed: '완료'
};

export function SessionControls({
  status,
  isLoading,
  error,
  onStartSession,
  onStopSession
}: SessionControlsProps) {
  const [sampleTargets, setSampleTargets] = useState([
    { symbol: 'A005930', stock_name: '삼성전자', entry_price: 71500, buy_threshold: 2.0 },
    { symbol: 'A000660', stock_name: 'SK하이닉스', entry_price: 128000, buy_threshold: 2.0 },
    { symbol: 'A035420', stock_name: 'NAVER', entry_price: 185000, buy_threshold: 2.0 }
  ]);

  const handleStartSession = async () => {
    try {
      await onStartSession(sampleTargets);
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  };

  const handleStopSession = async () => {
    try {
      await onStopSession();
    } catch (err) {
      console.error('Failed to stop session:', err);
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'waiting': return 'bg-gray-500';
      case 'phase_1': return 'bg-blue-500';
      case 'phase_2': return 'bg-green-500';
      case 'phase_3': return 'bg-yellow-500';
      case 'phase_4': return 'bg-orange-500';
      case 'completed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatRemainingTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          시간외 거래 모니터링 세션
        </CardTitle>
        <CardDescription>
          16:00-17:40 시간외 거래 모니터링을 시작하고 관리합니다
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Current Session Status */}
        {status && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge
                  variant={status.is_running ? "default" : "secondary"}
                  className={status.is_running ? getPhaseColor(status.current_phase) : ""}
                >
                  {status.is_running ? "실행 중" : "중지됨"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {PHASE_LABELS[status.current_phase] || status.current_phase}
                </span>
              </div>

              {status.is_running && status.remaining_time_seconds > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>{formatRemainingTime(status.remaining_time_seconds)}</span>
                </div>
              )}
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold">{status.total_targets}</div>
                <div className="text-sm text-muted-foreground">총 대상</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600">{status.triggered_count}</div>
                <div className="text-sm text-muted-foreground">신호 발생</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">
                  {status.total_targets > 0
                    ? Math.round((status.triggered_count / status.total_targets) * 100)
                    : 0}%
                </div>
                <div className="text-sm text-muted-foreground">성공률</div>
              </div>
            </div>

            {/* Next Phase Info */}
            {status.next_phase_time && status.is_running && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>다음 단계: {status.next_phase_time}</span>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Session Controls */}
        <div className="space-y-4">
          <div className="flex gap-3">
            {!status?.is_running ? (
              <Button
                onClick={handleStartSession}
                disabled={isLoading}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                {isLoading ? '시작 중...' : '모니터링 시작'}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleStopSession}
                disabled={isLoading}
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                {isLoading ? '중지 중...' : '모니터링 중지'}
              </Button>
            )}
          </div>

          {/* Sample Targets Configuration */}
          {!status?.is_running && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">샘플 모니터링 대상</Label>
              <div className="space-y-2">
                {sampleTargets.map((target, index) => (
                  <div key={target.symbol} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{target.stock_name}</div>
                      <div className="text-sm text-muted-foreground">{target.symbol}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">₩{target.entry_price.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        임계값: {target.buy_threshold}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                * 실제 운용 시에는 포트폴리오에서 선택된 종목들이 자동으로 설정됩니다
              </p>
            </div>
          )}
        </div>

        {/* Session Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 16:00-17:40 시간외 거래 시간 동안 자동 모니터링</p>
          <p>• 30분 간격으로 단계별 임계값 자동 조정</p>
          <p>• 매수 조건 충족 시 자동 신호 생성 및 주문 실행</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default SessionControls;