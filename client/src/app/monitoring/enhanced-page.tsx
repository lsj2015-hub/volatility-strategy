/**
 * Enhanced Monitoring 페이지 - 실시간 모니터링 컴포넌트들을 통합한 버전
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, Settings, Activity } from 'lucide-react';

// 새로 생성한 실시간 모니터링 컴포넌트들
import LivePriceTicker from '@/components/monitoring/LivePriceTicker';
import ProgressTimeline from '@/components/monitoring/ProgressTimeline';
import ThresholdAdjustment from '@/components/monitoring/ThresholdAdjustment';
import BuySignalAlerts from '@/components/monitoring/BuySignalAlerts';

// 시뮬레이션 데이터 - 실제 환경에서는 API에서 가져옴
const SAMPLE_STOCK_DATA = [
  {
    code: 'A005930',
    name: '삼성전자',
    currentPrice: 71500,
    priceChange: 850,
    changePercent: 1.2,
    volume: 12500000,
    lastUpdate: '16:25:30',
    status: 'active' as const
  },
  {
    code: 'A000660',
    name: 'SK하이닉스',
    currentPrice: 128000,
    priceChange: -1200,
    changePercent: -0.9,
    volume: 8200000,
    lastUpdate: '16:25:25',
    status: 'active' as const
  },
  {
    code: 'A035420',
    name: 'NAVER',
    currentPrice: 185000,
    priceChange: 4200,
    changePercent: 2.3,
    volume: 5100000,
    lastUpdate: '16:25:32',
    status: 'triggered' as const
  }
];

const SAMPLE_TIME_SLOTS = [
  {
    time: '16:00',
    status: 'completed' as const,
    threshold: 3.0,
    actualTriggers: 2,
    description: '1차 체크 완료 - NAVER, LG전자 매수 실행'
  },
  {
    time: '16:30',
    status: 'active' as const,
    threshold: 2.5,
    description: '현재 진행 중인 체크포인트'
  },
  {
    time: '17:00',
    status: 'pending' as const,
    threshold: 2.0,
    description: '3차 체크 예정'
  },
  {
    time: '17:30',
    status: 'pending' as const,
    threshold: 1.5,
    description: '최종 체크포인트'
  }
];

const SAMPLE_BUY_SIGNALS = [
  {
    id: 'signal-001',
    stockCode: 'A035420',
    stockName: 'NAVER',
    triggerPrice: 181000,
    currentPrice: 185000,
    changePercent: 2.3,
    triggerTime: '16:25:32',
    amount: 5000000,
    status: 'pending' as const
  }
];

export default function EnhancedMonitoringPage() {
  const [isConnected, setIsConnected] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState('16:25:45');

  // 실시간 시간 업데이트 (시뮬레이션)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ko-KR', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 임계값 설정
  const [thresholdSettings, setThresholdSettings] = useState({
    currentThreshold: 2.0,
    defaultThreshold: 2.0,
    minThreshold: 0.5,
    maxThreshold: 5.0,
    step: 0.1
  });

  // 핸들러 함수들
  const handleThresholdChange = (newThreshold: number) => {
    setThresholdSettings(prev => ({
      ...prev,
      currentThreshold: newThreshold
    }));
    console.log(`Threshold changed to: ${newThreshold}%`);
  };

  const handleThresholdAdjust = (timeSlot: string, threshold: number) => {
    console.log(`Adjusting threshold for ${timeSlot} to ${threshold}%`);
  };

  const handleManualTrigger = (timeSlot: string) => {
    console.log(`Manual trigger for ${timeSlot}`);
  };

  const handleSkipTimeSlot = (timeSlot: string) => {
    console.log(`Skipping time slot: ${timeSlot}`);
  };

  const handleBuySignalConfirm = (signalId: string) => {
    console.log(`Buy signal confirmed: ${signalId}`);
  };

  const handleBuySignalReject = (signalId: string) => {
    console.log(`Buy signal rejected: ${signalId}`);
  };

  const handleSoundToggle = () => {
    setSoundEnabled(!soundEnabled);
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">실시간 모니터링</h1>
          <p className="text-muted-foreground">
            시간외 거래 모니터링 및 자동 매수 시스템
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">Day 1</Badge>
          <Badge variant="secondary">16:00-17:40</Badge>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? '실시간 연결' : '연결 끊김'}
          </Badge>
        </div>
      </div>

      {/* 세션 상태 개요 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">현재 시간</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentTime}</div>
            <div className="text-xs text-muted-foreground">KST</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">모니터링 종목</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{SAMPLE_STOCK_DATA.length}</div>
            <div className="text-xs text-muted-foreground">개 종목 추적 중</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">매수 신호</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {SAMPLE_BUY_SIGNALS.filter(s => s.status === 'pending').length}
            </div>
            <div className="text-xs text-muted-foreground">확인 대기 중</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">세션 진행률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">25%</div>
            <div className="text-xs text-muted-foreground">1/4 체크포인트 완료</div>
          </CardContent>
        </Card>
      </div>

      {/* 매수 신호 알림 (최우선) */}
      {SAMPLE_BUY_SIGNALS.length > 0 && (
        <BuySignalAlerts
          signals={SAMPLE_BUY_SIGNALS}
          soundEnabled={soundEnabled}
          onConfirm={handleBuySignalConfirm}
          onReject={handleBuySignalReject}
          onSoundToggle={handleSoundToggle}
        />
      )}

      {/* 메인 모니터링 섹션 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 실시간 주가 티커 (2/3 영역) */}
        <div className="xl:col-span-2">
          <LivePriceTicker
            stocks={SAMPLE_STOCK_DATA}
            isConnected={isConnected}
            autoRefresh={true}
            refreshInterval={3000}
          />
        </div>

        {/* 임계값 조정 (1/3 영역) */}
        <div>
          <ThresholdAdjustment
            settings={thresholdSettings}
            onThresholdChange={handleThresholdChange}
            onReset={() => setThresholdSettings(prev => ({
              ...prev,
              currentThreshold: prev.defaultThreshold
            }))}
          />
        </div>
      </div>

      {/* 타임라인 및 제어판 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 진행 타임라인 */}
        <ProgressTimeline
          timeSlots={SAMPLE_TIME_SLOTS}
          currentTime={currentTime}
          onThresholdAdjust={handleThresholdAdjust}
          onManualTrigger={handleManualTrigger}
          onSkipTimeSlot={handleSkipTimeSlot}
        />

        {/* 모니터링 제어판 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              시스템 제어
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 연결 상태 토글 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">실시간 연결</span>
              <Button
                variant={isConnected ? "default" : "outline"}
                size="sm"
                onClick={() => setIsConnected(!isConnected)}
              >
                <Activity className="mr-2 h-4 w-4" />
                {isConnected ? '연결됨' : '연결 끊김'}
              </Button>
            </div>

            {/* 소리 알림 토글 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">소리 알림</span>
              <Button
                variant={soundEnabled ? "default" : "outline"}
                size="sm"
                onClick={handleSoundToggle}
              >
                {soundEnabled ? '🔊 켜짐' : '🔇 꺼짐'}
              </Button>
            </div>

            {/* 시스템 상태 */}
            <div className="space-y-2 pt-4 border-t">
              <div className="text-sm font-medium">시스템 상태</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KIS API</span>
                  <span className="text-green-600">정상</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">데이터 스트림</span>
                  <span className="text-green-600">활성</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">자동 매수</span>
                  <span className="text-green-600">준비됨</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">마지막 업데이트</span>
                  <span className="text-muted-foreground">{currentTime}</span>
                </div>
              </div>
            </div>

            {/* 긴급 제어 */}
            <div className="space-y-2 pt-4 border-t">
              <Button variant="destructive" className="w-full" size="sm">
                <Monitor className="mr-2 h-4 w-4" />
                모니터링 일시정지
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}