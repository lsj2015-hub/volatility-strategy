/**
 * ProgressTimeline - 모니터링 세션 진행 상황 타임라인 컴포넌트
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, PlayCircle, PauseCircle, Settings } from 'lucide-react';

interface TimeSlot {
  time: string;
  status: 'completed' | 'active' | 'pending' | 'skipped';
  threshold: number;
  actualTriggers?: number;
  description?: string;
}

interface ProgressTimelineProps {
  timeSlots: TimeSlot[];
  currentTime?: string;
  onThresholdAdjust?: (timeSlot: string, newThreshold: number) => void;
  onManualTrigger?: (timeSlot: string) => void;
  onSkipTimeSlot?: (timeSlot: string) => void;
}

export default function ProgressTimeline({
  timeSlots,
  currentTime,
  onThresholdAdjust,
  onManualTrigger,
  onSkipTimeSlot
}: ProgressTimelineProps) {
  const [sessionProgress, setSessionProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [nextActiveSlot, setNextActiveSlot] = useState<TimeSlot | null>(null);

  // 세션 진행률 계산
  useEffect(() => {
    const completedSlots = timeSlots.filter(slot => slot.status === 'completed').length;
    const totalSlots = timeSlots.length;
    const progress = (completedSlots / totalSlots) * 100;
    setSessionProgress(progress);

    // 다음 활성 슬롯 찾기
    const nextSlot = timeSlots.find(slot => slot.status === 'pending' || slot.status === 'active');
    setNextActiveSlot(nextSlot || null);
  }, [timeSlots]);

  // 남은 시간 계산 (간단한 시뮬레이션)
  useEffect(() => {
    if (nextActiveSlot && currentTime) {
      const timer = setInterval(() => {
        const now = new Date();
        const [hours, minutes] = nextActiveSlot.time.split(':').map(Number);
        const targetTime = new Date();
        targetTime.setHours(hours, minutes, 0, 0);

        if (targetTime <= now) {
          targetTime.setDate(targetTime.getDate() + 1);
        }

        const diff = targetTime.getTime() - now.getTime();
        const remainingMinutes = Math.floor(diff / (1000 * 60));
        const remainingHours = Math.floor(remainingMinutes / 60);
        const mins = remainingMinutes % 60;

        if (remainingHours > 0) {
          setTimeRemaining(`${remainingHours}시간 ${mins}분`);
        } else {
          setTimeRemaining(`${mins}분`);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [nextActiveSlot, currentTime]);

  const getStatusIcon = (status: TimeSlot['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'active':
        return <PlayCircle className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-400" />;
      case 'skipped':
        return <PauseCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TimeSlot['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50';
      case 'active':
        return 'border-blue-500 bg-blue-50 shadow-lg';
      case 'pending':
        return 'border-gray-200 bg-white';
      case 'skipped':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getStatusBadge = (status: TimeSlot['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">완료</Badge>;
      case 'active':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">진행 중</Badge>;
      case 'pending':
        return <Badge variant="outline">대기</Badge>;
      case 'skipped':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">건너뜀</Badge>;
      default:
        return <Badge variant="outline">대기</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            모니터링 타임라인
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {currentTime && `현재 시간: ${currentTime}`}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 전체 진행률 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">세션 진행률</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(sessionProgress)}% 완료
            </span>
          </div>
          <Progress value={sessionProgress} className="h-3" />
          {nextActiveSlot && (
            <div className="text-xs text-muted-foreground">
              다음: {nextActiveSlot.time} ({timeRemaining} 후)
            </div>
          )}
        </div>

        {/* 타임라인 */}
        <div className="space-y-4">
          {timeSlots.map((slot, index) => (
            <div
              key={slot.time}
              className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${getStatusColor(slot.status)}`}
            >
              {/* 연결선 */}
              {index < timeSlots.length - 1 && (
                <div className="absolute left-6 top-14 w-0.5 h-8 bg-gray-300"></div>
              )}

              <div className="flex items-start space-x-4">
                {/* 상태 아이콘 */}
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(slot.status)}
                </div>

                {/* 메인 컨텐츠 */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-semibold">{slot.time}</span>
                      {getStatusBadge(slot.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {slot.actualTriggers !== undefined && (
                        <span>실행: {slot.actualTriggers}건</span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    매수 임계값: {slot.threshold}% 상승 시 자동 매수
                    {slot.description && (
                      <div className="mt-1">{slot.description}</div>
                    )}
                  </div>

                  {/* 컨트롤 버튼들 */}
                  {(slot.status === 'active' || slot.status === 'pending') && (
                    <div className="flex items-center space-x-2 mt-3">
                      {onThresholdAdjust && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onThresholdAdjust(slot.time, slot.threshold)}
                        >
                          <Settings className="mr-1 h-3 w-3" />
                          임계값 조정
                        </Button>
                      )}

                      {slot.status === 'active' && onManualTrigger && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onManualTrigger(slot.time)}
                        >
                          <PlayCircle className="mr-1 h-3 w-3" />
                          수동 실행
                        </Button>
                      )}

                      {onSkipTimeSlot && slot.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onSkipTimeSlot(slot.time)}
                        >
                          <PauseCircle className="mr-1 h-3 w-3" />
                          건너뛰기
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 세션 요약 */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {timeSlots.filter(s => s.status === 'completed').length}
              </div>
              <div className="text-xs text-muted-foreground">완료</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {timeSlots.filter(s => s.status === 'active').length}
              </div>
              <div className="text-xs text-muted-foreground">진행 중</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {timeSlots.filter(s => s.status === 'pending').length}
              </div>
              <div className="text-xs text-muted-foreground">대기 중</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}