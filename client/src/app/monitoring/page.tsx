'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, TrendingUp, Eye, AlertTriangle, Activity } from 'lucide-react';

// Import monitoring components
import LivePriceTicker from '@/components/monitoring/LivePriceTicker';
import ProgressTimeline from '@/components/monitoring/ProgressTimeline';
import BuySignalAlerts from '@/components/monitoring/BuySignalAlerts';
import SessionControls from '@/components/monitoring/SessionControls';
import SessionThresholdControls from '@/components/monitoring/SessionThresholdControls';

// Import hooks
import useMonitoringSession from '@/hooks/useMonitoringSession';

export default function MonitoringPage() {
  // Additional state for UI components
  const [isConnected, setIsConnected] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  // Real-time clock
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('ko-KR'));
    };

    updateTime(); // Initial update
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const {
    status,
    isLoading,
    error,
    startSession,
    stopSession,
    adjustThreshold,
    autoAdjustThresholds
  } = useMonitoringSession({
    autoRefresh: true,
    refreshInterval: 30000,
    onPhaseChange: (oldPhase, newPhase) => {
      console.log(`Phase changed: ${oldPhase} → ${newPhase}`);
    },
    onTargetTriggered: (target) => {
      console.log(`Target triggered: ${target.symbol}`);
    },
    onSessionComplete: (stats) => {
      console.log('Session completed:', stats);
    }
  });

  // Generate real time slots based on current session
  const generateTimeSlots = () => {
    const phaseMapping = {
      'waiting': 0,
      'phase_1': 1,
      'phase_2': 2,
      'phase_3': 3,
      'phase_4': 4,
      'completed': 5
    };

    const currentPhaseIndex = phaseMapping[status?.current_phase as keyof typeof phaseMapping] || 0;

    return [
      {
        time: '16:00',
        label: '1차 모니터링',
        status: currentPhaseIndex === 1 ? 'active' as const :
                currentPhaseIndex > 1 ? 'completed' as const : 'pending' as const,
        threshold: 2.0
      },
      {
        time: '16:30',
        label: '2차 모니터링',
        status: currentPhaseIndex === 2 ? 'active' as const :
                currentPhaseIndex > 2 ? 'completed' as const : 'pending' as const,
        threshold: 2.0
      },
      {
        time: '17:00',
        label: '3차 모니터링',
        status: currentPhaseIndex === 3 ? 'active' as const :
                currentPhaseIndex > 3 ? 'completed' as const : 'pending' as const,
        threshold: 2.0
      },
      {
        time: '17:30',
        label: '최종 모니터링',
        status: currentPhaseIndex === 4 ? 'active' as const :
                currentPhaseIndex > 4 ? 'completed' as const : 'pending' as const,
        threshold: 2.0
      }
    ];
  };

  const timeSlots = generateTimeSlots();

  // Find triggered targets for buy signal alerts
  const triggeredTargets = status?.monitoring_targets.filter(target => target.is_triggered && !target.trigger_time) || [];

  // Get portfolio data for investment amounts
  const getPortfolioAllocation = (symbol: string) => {
    try {
      const portfolioData = localStorage.getItem('confirmed-portfolio');
      if (portfolioData) {
        const portfolio = JSON.parse(portfolioData);
        const allocation = portfolio.allocations?.[symbol];
        return allocation?.amount || 1000000; // Fallback to 1M KRW
      }
    } catch (error) {
      console.warn('Failed to get portfolio allocation:', error);
    }
    return 1000000; // Default fallback
  };

  // Calculate dynamic time remaining based on actual trigger time
  const calculateTimeRemaining = (triggerTime?: string) => {
    if (!triggerTime) return 30; // Default 30 seconds for new signals

    try {
      const trigger = new Date(triggerTime);
      const now = new Date();
      const elapsedSeconds = Math.floor((now.getTime() - trigger.getTime()) / 1000);
      const remainingSeconds = Math.max(0, 30 - elapsedSeconds);
      return remainingSeconds;
    } catch {
      return 30; // Fallback on error
    }
  };

  // Convert triggered targets to buy signals format
  const buySignals = triggeredTargets.map(target => {
    const allocationAmount = getPortfolioAllocation(target.symbol);
    const shares = Math.floor(allocationAmount / target.current_price);
    const actualAmount = shares * target.current_price;
    const timeRemaining = calculateTimeRemaining(target.trigger_time);

    return {
      id: `signal-${target.symbol}`,
      stockCode: target.symbol,
      stockName: target.stock_name,
      triggerPrice: target.entry_price,
      currentPrice: target.current_price,
      changePercent: target.change_percent,
      triggerTime: target.trigger_time
        ? new Date(target.trigger_time).toLocaleTimeString('ko-KR')
        : new Date().toLocaleTimeString('ko-KR'),
      amount: actualAmount,
      shares: shares,
      status: 'pending' as const,
      timeRemaining: timeRemaining
    };
  });

  const handleStartSession = async (targets: any[]) => {
    const success = await startSession(targets);
    if (!success) {
      console.error('Failed to start session');
    }
  };

  const handleStopSession = async () => {
    const success = await stopSession();
    if (!success) {
      console.error('Failed to stop session');
    }
  };

  const handleThresholdAdjust = async (symbol: string, newThreshold: number) => {
    const success = await adjustThreshold(symbol, newThreshold);
    if (!success) {
      console.error('Failed to adjust threshold');
    }
  };

  const handleAutoAdjust = async (strategy: any, applyAll: boolean, symbols?: string[]) => {
    const success = await autoAdjustThresholds(strategy, applyAll, symbols);
    if (!success) {
      console.error('Failed to auto-adjust thresholds');
    }
  };

  const handleConfirmSignal = (signalId: string) => {
    console.log('Buy signal confirmed:', signalId);
    // Here you would integrate with the actual order execution logic
  };

  const handleRejectSignal = (signalId: string) => {
    console.log('Buy signal rejected:', signalId);
  };

  const handleSoundToggle = () => {
    console.log('Sound toggle');
  };

  const getSessionStatusBadge = () => {
    if (!status) return <Badge variant="secondary">미연결</Badge>;

    if (status.is_running) {
      return (
        <Badge variant="default" className="bg-green-600">
          <Activity className="h-4 w-4 mr-1" />
          모니터링 중
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-gray-600 border-gray-600">
          <Clock className="h-4 w-4 mr-1" />
          대기 중
        </Badge>
      );
    }
  };

  const getProgressPercentage = () => {
    if (!status || !status.is_running) return 0;

    const phaseProgress = {
      'waiting': 0,
      'phase_1': 25,
      'phase_2': 50,
      'phase_3': 75,
      'phase_4': 90,
      'completed': 100
    };

    return phaseProgress[status.current_phase] || 0;
  };

  const formatRemainingTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">시간외 거래 모니터링</h1>
          <p className="text-muted-foreground mt-2">
            16:00-17:40 시간외 거래에서 실시간 매수 기회를 모니터링합니다
          </p>
        </div>
        {getSessionStatusBadge()}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Session Controls */}
      <SessionControls
        status={status}
        isLoading={isLoading}
        error={error}
        onStartSession={handleStartSession}
        onStopSession={handleStopSession}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Live Price Ticker */}
        <div className="xl:col-span-2 space-y-6">
          <LivePriceTicker
            stocks={status?.monitoring_targets ? status.monitoring_targets.map(target => ({
              code: target.symbol,
              name: target.stock_name,
              currentPrice: target.current_price,
              priceChange: target.current_price - target.entry_price,
              changePercent: target.change_percent,
              volume: target.volume || 0,
              lastUpdate: new Date().toLocaleTimeString('ko-KR'),
              status: target.is_triggered ? 'triggered' as const : 'active' as const
            })) : []}
          />

          {/* Progress Timeline */}
          <ProgressTimeline timeSlots={timeSlots} />
        </div>

        {/* Right Column - Controls and Alerts */}
        <div className="space-y-6">
          {/* Threshold Controls */}
          {status?.monitoring_targets && status.monitoring_targets.length > 0 && (
            <SessionThresholdControls
              targets={status.monitoring_targets}
              onAdjustThreshold={handleThresholdAdjust}
              onAutoAdjust={handleAutoAdjust}
              loading={isLoading}
            />
          )}

          {/* Buy Signal Alerts */}
          {buySignals.length > 0 && (
            <BuySignalAlerts
              signals={buySignals}
              onConfirm={handleConfirmSignal}
              onReject={handleRejectSignal}
              onSoundToggle={handleSoundToggle}
              autoConfirmDelay={30}
              soundEnabled={true}
            />
          )}
        </div>
      </div>

      {/* Session Status Overview */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              세션 현황
            </CardTitle>
            <CardDescription>
              현재 모니터링 세션의 전체 현황을 확인할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* 모니터링 대상 */}
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{status.total_targets}</div>
                <div className="text-sm text-muted-foreground">모니터링 대상</div>
              </div>

              {/* 매수 신호 발생 */}
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{status.triggered_count}</div>
                <div className="text-sm text-muted-foreground">매수 신호 발생</div>
              </div>

              {/* 성공률 */}
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {status.total_targets > 0 ? Math.round((status.triggered_count / status.total_targets) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">성공률</div>
              </div>

              {/* 남은 시간 */}
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {status.remaining_time_seconds > 0 ? formatRemainingTime(status.remaining_time_seconds) : '-'}
                </div>
                <div className="text-sm text-muted-foreground">남은 시간</div>
              </div>
            </div>

            {/* Progress Bar */}
            {status.is_running && (
              <div className="mt-6">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>세션 진행률</span>
                  <span>{getProgressPercentage()}%</span>
                </div>
                <Progress value={getProgressPercentage()} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}