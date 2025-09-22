/**
 * After-hours Monitoring Session Hook
 * 시간외 거래 모니터링 세션 관리 훅
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { monitoringAPI } from '@/lib/api';
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

  // Refs for callbacks and intervals
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousPhaseRef = useRef<SessionPhase | null>(null);
  const previousTriggeredCountRef = useRef<number>(0);

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

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      // Initial fetch
      refresh();

      // Set up interval
      refreshIntervalRef.current = setInterval(fetchStatus, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchStatus, refresh]);

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