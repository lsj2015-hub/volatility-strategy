/**
 * After-hours Monitoring Session Hook
 * 시간외 거래 모니터링 세션 관리 훅
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { monitoringAPI } from '@/lib/api';
import { getWebSocketClient } from '@/lib/websocket/client';
import type {
  MonitoringSessionStatus,
  StartMonitoringRequest,
  AdjustmentStrategy,
  ThresholdPreviewResponse,
  PerformanceStatsResponse,
  SuggestedStrategiesResponse,
  UseMonitoringSessionOptions,
  UseMonitoringSessionReturn,
  SessionPhase
} from '@/types/monitoring';

export function useMonitoringSession(options: UseMonitoringSessionOptions = {}): UseMonitoringSessionReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30초
    onPhaseChange,
    onTargetTriggered,
    onSessionComplete
  } = options;

  // State
  const [status, setStatus] = useState<MonitoringSessionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  // Refs for callbacks and intervals
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousPhaseRef = useRef<SessionPhase | null>(null);
  const previousTriggeredCountRef = useRef<number>(0);
  const wsClientRef = useRef(getWebSocketClient());

  // Clear error when status changes
  useEffect(() => {
    if (status) {
      setError(null);
    }
  }, [status]);

  // Handle phase changes
  useEffect(() => {
    if (status && previousPhaseRef.current && status.current_phase !== previousPhaseRef.current) {
      onPhaseChange?.(previousPhaseRef.current, status.current_phase);
    }
    previousPhaseRef.current = status?.current_phase || null;
  }, [status?.current_phase, onPhaseChange]);

  // Handle target triggers
  useEffect(() => {
    if (status && status.triggered_count > previousTriggeredCountRef.current) {
      // Find newly triggered targets
      const newlyTriggered = status.monitoring_targets.filter(
        target => target.is_triggered && target.trigger_time
      );

      newlyTriggered.forEach(target => {
        onTargetTriggered?.(target);
      });
    }
    previousTriggeredCountRef.current = status?.triggered_count || 0;
  }, [status?.triggered_count, onTargetTriggered]);

  // Handle session completion
  useEffect(() => {
    if (status?.current_phase === 'completed' && status.is_running === false) {
      onSessionComplete?.({
        total_targets: status.total_targets,
        triggered_count: status.triggered_count,
        success_rate: status.total_targets > 0 ? (status.triggered_count / status.total_targets) * 100 : 0,
        average_change_percent: status.monitoring_targets.reduce((sum, target) => sum + target.change_percent, 0) / status.monitoring_targets.length || 0,
        session_duration_minutes: 0, // Calculate if needed
        current_phase: status.current_phase
      });
    }
  }, [status?.current_phase, status?.is_running, onSessionComplete]);

  // WebSocket setup and handlers
  useEffect(() => {
    const wsClient = wsClientRef.current;

    // WebSocket 연결 상태 핸들러
    const unsubscribeStatus = wsClient.onStatusChange((wsStatus) => {
      setIsWebSocketConnected(wsStatus.connected);

      if (wsStatus.connected) {
        console.log('✅ WebSocket connected - Real-time updates enabled');
      } else {
        console.log('📡 WebSocket disconnected - Using polling fallback');
      }
    });

    // 모니터링 상태 업데이트 핸들러 (타입 문제로 일단 any 사용)
    const unsubscribeMonitoringStatus = (wsClient as any).on('monitoring_status_update', (message: any) => {
      try {
        console.log('📊 Real-time monitoring update received:', message.data);
        setStatus(message.data);
        setError(null); // Clear errors when receiving real-time data
      } catch (error) {
        console.warn('Failed to process monitoring status update:', error);
      }
    });

    // 가격 업데이트 핸들러
    const unsubscribePriceUpdate = wsClient.on('price_update', (message) => {
      try {
        console.log('💰 Real-time price update:', message.data);

        // 현재 상태가 있는 경우 해당 종목의 가격 정보만 업데이트
        setStatus(prevStatus => {
          if (!prevStatus || !prevStatus.monitoring_targets) return prevStatus;

          const updatedTargets = prevStatus.monitoring_targets.map(target => {
            if (target.symbol === message.data.symbol) {
              return {
                ...target,
                current_price: message.data.price,
                change_percent: message.data.changePercent,
                volume: message.data.volume
              };
            }
            return target;
          });

          return {
            ...prevStatus,
            monitoring_targets: updatedTargets
          };
        });
      } catch (error) {
        console.warn('Failed to process price update:', error);
      }
    });

    // 매수 신호 핸들러
    const unsubscribeBuySignal = wsClient.on('buy_signal', (message) => {
      try {
        console.log('🚀 Buy signal received:', message.data);

        // 해당 종목을 triggered로 업데이트
        setStatus(prevStatus => {
          if (!prevStatus || !prevStatus.monitoring_targets) return prevStatus;

          const updatedTargets = prevStatus.monitoring_targets.map(target => {
            if (target.symbol === message.data.symbol) {
              return {
                ...target,
                is_triggered: true,
                trigger_time: message.timestamp
              };
            }
            return target;
          });

          const newTriggeredCount = updatedTargets.filter(t => t.is_triggered).length;

          return {
            ...prevStatus,
            monitoring_targets: updatedTargets,
            triggered_count: newTriggeredCount
          };
        });

        // 콜백 실행
        const targetData = {
          symbol: message.data.symbol,
          price: message.data.price,
          reason: message.data.reason,
          timestamp: message.timestamp
        };
        onTargetTriggered?.(targetData as any);
      } catch (error) {
        console.warn('Failed to process buy signal:', error);
      }
    });

    // WebSocket 연결 시도 (실패해도 폴링으로 fallback)
    const connectWebSocket = async () => {
      try {
        await wsClient.connect();
      } catch (error) {
        console.log('WebSocket connection failed, using polling fallback:', error);
        // 에러를 던지지 않음 - 폴링이 여전히 작동
      }
    };

    connectWebSocket();

    // Cleanup
    return () => {
      unsubscribeStatus();
      unsubscribeMonitoringStatus();
      unsubscribePriceUpdate();
      unsubscribeBuySignal();
    };
  }, [onTargetTriggered]);

  // Fetch session status
  const fetchStatus = useCallback(async () => {
    try {
      setError(null);

      const response = await monitoringAPI.getStatus();

      // Safe response validation with detailed error handling
      if (!response) {
        throw new Error('No response received from monitoring API');
      }

      // Check if response has the expected structure
      if (typeof response === 'object' && 'success' in response && 'status' in response) {
        if (response.success && response.status) {
          setStatus(response.status);
        } else {
          throw new Error(response.success === false ? 'API returned success: false' : 'Missing status in response');
        }
      } else {
        throw new Error(`Unexpected response format: ${typeof response}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch monitoring status';
      setError(errorMessage);
      console.warn('Monitoring status fetch failed:', errorMessage);

      // Set a default status to prevent UI crashes
      setStatus({
        is_running: false,
        current_phase: 'waiting',
        phase_start_time: new Date().toISOString(),
        next_phase_time: undefined,
        monitoring_targets: [],
        total_targets: 0,
        triggered_count: 0,
        remaining_time_seconds: 0
      });
    }
  }, []);

  // Refresh function
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchStatus();
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus]);

  // Auto-refresh setup (adaptive based on WebSocket connection)
  useEffect(() => {
    if (autoRefresh) {
      // Initial fetch
      refresh();

      // Adaptive polling interval based on WebSocket connection
      const pollingInterval = isWebSocketConnected
        ? refreshInterval * 3  // Slower polling when WebSocket is connected (90 seconds)
        : refreshInterval;     // Normal polling when WebSocket is disconnected (30 seconds)

      // Set up interval
      refreshIntervalRef.current = setInterval(() => {
        // Only fetch via polling if WebSocket is not connected or as backup
        if (!isWebSocketConnected) {
          fetchStatus();
        } else {
          // Periodic backup fetch even when WebSocket is connected (less frequent)
          console.log('🔄 Backup polling fetch (WebSocket connected)');
          fetchStatus();
        }
      }, pollingInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchStatus, refresh, isWebSocketConnected]);

  // Session control functions
  const startSession = useCallback(async (targets: StartMonitoringRequest['targets']): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await monitoringAPI.startSession({ targets, auto_start: true });
      await fetchStatus(); // Refresh status after starting

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start monitoring session';
      setError(errorMessage);
      console.error('Failed to start session:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus]);

  const stopSession = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await monitoringAPI.stopSession();
      await fetchStatus(); // Refresh status after stopping

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop monitoring session';
      setError(errorMessage);
      console.error('Failed to stop session:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus]);

  // Threshold management functions
  const adjustThreshold = useCallback(async (symbol: string, newThreshold: number): Promise<boolean> => {
    try {
      setError(null);

      await monitoringAPI.adjustThreshold({
        symbol,
        new_threshold: newThreshold,
        strategy: 'manual'
      });

      await fetchStatus(); // Refresh status after adjustment
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to adjust threshold';
      setError(errorMessage);
      console.error('Failed to adjust threshold:', err);
      return false;
    }
  }, [fetchStatus]);

  const autoAdjustThresholds = useCallback(async (
    strategy: AdjustmentStrategy,
    applyAll: boolean,
    symbols?: string[]
  ): Promise<boolean> => {
    try {
      setError(null);

      await monitoringAPI.autoAdjustThresholds({
        strategy: strategy as any, // Type assertion for API compatibility
        apply_all: applyAll,
        target_symbols: symbols
      });

      await fetchStatus(); // Refresh status after adjustment
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to auto-adjust thresholds';
      setError(errorMessage);
      console.error('Failed to auto-adjust thresholds:', err);
      return false;
    }
  }, [fetchStatus]);

  const previewAdjustment = useCallback(async (
    strategy: AdjustmentStrategy,
    symbol?: string
  ): Promise<ThresholdPreviewResponse | null> => {
    try {
      setError(null);
      const response = await monitoringAPI.previewThresholdAdjustment(strategy as any, symbol);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to preview threshold adjustment';
      setError(errorMessage);
      console.error('Failed to preview adjustment:', err);
      return null;
    }
  }, []);

  // Analytics functions
  const getPerformanceStats = useCallback(async (): Promise<PerformanceStatsResponse['stats'] | null> => {
    try {
      setError(null);
      const response = await monitoringAPI.getPerformanceStats();
      return response.stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get performance stats';
      setError(errorMessage);
      console.error('Failed to get performance stats:', err);
      return null;
    }
  }, []);

  const getSuggestedStrategies = useCallback(async (): Promise<SuggestedStrategiesResponse | null> => {
    try {
      setError(null);
      const response = await monitoringAPI.getSuggestedStrategies();
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get suggested strategies';
      setError(errorMessage);
      console.error('Failed to get suggested strategies:', err);
      return null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    // Status
    status,
    isLoading,
    error,
    isWebSocketConnected,

    // Session Control
    startSession,
    stopSession,

    // Threshold Management
    adjustThreshold,
    autoAdjustThresholds,
    previewAdjustment,

    // Analytics
    getPerformanceStats,
    getSuggestedStrategies,

    // Refresh
    refresh
  };
}

export default useMonitoringSession;