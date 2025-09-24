/**
 * BuySignalAlerts - 매수 신호 알림 및 확인 컴포넌트
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useBuySignals } from '@/hooks/useWebSocket';

interface BuySignal {
  id: string;
  stockCode: string;
  stockName: string;
  triggerPrice: number;
  currentPrice: number;
  changePercent: number;
  triggerTime: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'executed' | 'failed';
  timeRemaining?: number; // seconds
}

interface BuySignalAlertsProps {
  signals: BuySignal[];
  autoConfirmDelay?: number; // seconds
  soundEnabled?: boolean;
  onConfirm: (signalId: string) => void;
  onReject: (signalId: string) => void;
  onSoundToggle?: () => void;
}

export default function BuySignalAlerts({
  signals,
  autoConfirmDelay = 10,
  soundEnabled = true,
  onConfirm,
  onReject,
  onSoundToggle
}: BuySignalAlertsProps) {
  const [activeSignal, setActiveSignal] = useState<BuySignal | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [localSignals, setLocalSignals] = useState<BuySignal[]>(signals);

  // WebSocket integration
  const { latestSignal: wsLatestSignal, signals: wsSignals } = useBuySignals();

  // 실시간 신호와 기존 신호 병합
  useEffect(() => {
    if (wsLatestSignal) {
      const newSignal: BuySignal = {
        id: `ws-${Date.now()}`,
        stockCode: wsLatestSignal.data.symbol,
        stockName: wsLatestSignal.data.symbol, // 실제로는 심볼에서 이름 조회 필요
        triggerPrice: wsLatestSignal.data.price,
        currentPrice: wsLatestSignal.data.price,
        changePercent: 0, // WebSocket 데이터에서 계산 필요
        triggerTime: new Date(wsLatestSignal.timestamp).toLocaleTimeString('ko-KR'),
        amount: wsLatestSignal.data.quantity * wsLatestSignal.data.price,
        status: 'pending'
      };

      setLocalSignals(prev => {
        const exists = prev.find(s => s.id === newSignal.id);
        if (!exists) {
          return [newSignal, ...prev];
        }
        return prev;
      });
    }
  }, [wsLatestSignal]);

  // 전체 신호 목록 업데이트
  useEffect(() => {
    setLocalSignals(prev => {
      const wsSignalIds = new Set(wsSignals.map(s => `ws-${s.timestamp}`));
      const filteredPrev = prev.filter(s => !s.id.startsWith('ws-') || wsSignalIds.has(s.id));
      return [...signals, ...filteredPrev.filter(s => s.id.startsWith('ws-'))];
    });
  }, [signals, wsSignals]);

  // 가장 최근 pending 신호를 active로 설정
  useEffect(() => {
    const pendingSignal = localSignals.find(signal => signal.status === 'pending');
    if (pendingSignal && (!activeSignal || activeSignal.id !== pendingSignal.id)) {
      setActiveSignal(pendingSignal);
      setTimeRemaining(autoConfirmDelay);
    }
  }, [localSignals, autoConfirmDelay, activeSignal]);

  // 자동 확인 타이머
  useEffect(() => {
    if (activeSignal && activeSignal.status === 'pending' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // 자동 확인 실행
            onConfirm(activeSignal.id);
            setActiveSignal(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [activeSignal, timeRemaining, onConfirm]);

  // 소리 재생 (브라우저 API 시뮬레이션)
  useEffect(() => {
    if (activeSignal && soundEnabled) {
      // 실제 환경에서는 Audio API 사용
      console.log('🔔 Buy signal sound alert!');
    }
  }, [activeSignal, soundEnabled]);

  const handleConfirm = () => {
    if (activeSignal) {
      onConfirm(activeSignal.id);
      setActiveSignal(null);
      setTimeRemaining(0);
    }
  };

  const handleReject = () => {
    if (activeSignal) {
      onReject(activeSignal.id);
      setActiveSignal(null);
      setTimeRemaining(0);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const getStatusColor = (status: BuySignal['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'executed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'failed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: BuySignal['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'executed':
        return <TrendingUp className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: BuySignal['status']) => {
    switch (status) {
      case 'pending':
        return '확인 대기';
      case 'confirmed':
        return '확인됨';
      case 'executed':
        return '실행 완료';
      case 'rejected':
        return '거부됨';
      case 'failed':
        return '실행 실패';
      default:
        return '알 수 없음';
    }
  };

  return (
    <>
      {/* 메인 알림 패널 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              매수 신호 알림
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSoundToggle}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
              <Badge variant="outline">
                {localSignals.filter(s => s.status === 'pending').length}개 대기
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {localSignals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>현재 매수 신호가 없습니다.</p>
              <p className="text-sm">조건을 만족하는 종목이 발견되면 알림이 표시됩니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {localSignals.slice(0, 3).map((signal) => (
                <div
                  key={signal.id}
                  className={`p-4 rounded-lg border-2 ${getStatusColor(signal.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(signal.status)}
                        <span className="font-semibold">{signal.stockName}</span>
                        <Badge variant="outline" className="text-xs">
                          {signal.stockCode}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {getStatusText(signal.status)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">현재가:</span>
                          <span className="ml-1 font-medium">
                            ₩{formatCurrency(signal.currentPrice)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">변동률:</span>
                          <span className={`ml-1 font-medium ${
                            signal.changePercent >= 0 ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {signal.changePercent >= 0 ? '+' : ''}{signal.changePercent.toFixed(2)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">매수금액:</span>
                          <span className="ml-1 font-medium">
                            ₩{formatCurrency(signal.amount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">신호시간:</span>
                          <span className="ml-1 font-medium">
                            {signal.triggerTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {signal.status === 'pending' && signal.id === activeSignal?.id && (
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleReject}
                        >
                          거부
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleConfirm}
                        >
                          확인 ({timeRemaining}s)
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {localSignals.length > 3 && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm">
                    {localSignals.length - 3}개 더 보기
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 긴급 확인 다이얼로그 */}
      <Dialog open={!!activeSignal && activeSignal.status === 'pending'} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center text-yellow-600">
              <AlertTriangle className="mr-2 h-5 w-5" />
              매수 신호 확인 필요
            </DialogTitle>
          </DialogHeader>

          {activeSignal && (
            <div className="space-y-4">
              <Alert className="border-yellow-300 bg-yellow-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{activeSignal.stockName}</strong>이(가) 매수 조건을 만족했습니다.
                  <span className="block mt-1 text-lg font-bold">
                    {timeRemaining}초 후 자동으로 매수가 실행됩니다.
                  </span>
                </AlertDescription>
              </Alert>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">종목:</span>
                  <span className="font-semibold">{activeSignal.stockName} ({activeSignal.stockCode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">현재가:</span>
                  <span className="font-semibold">₩{formatCurrency(activeSignal.currentPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">상승률:</span>
                  <span className="font-semibold text-red-600">
                    +{activeSignal.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">매수 금액:</span>
                  <span className="font-semibold text-green-600">
                    ₩{formatCurrency(activeSignal.amount)}
                  </span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  className="flex-1"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  거부
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  즉시 매수 ({timeRemaining}s)
                </Button>
              </div>

              <div className="text-xs text-center text-muted-foreground">
                자동 실행을 원하지 않으면 거부 버튼을 클릭하세요
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}