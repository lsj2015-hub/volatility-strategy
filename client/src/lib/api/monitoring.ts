/**
 * After-hours Monitoring API Client
 * 시간외 거래 모니터링 API 클라이언트
 */

import { apiClient } from './client';
import type {
  MonitoringSessionStatus,
  MonitoringTarget,
  ThresholdAdjustmentRequest,
  ThresholdAdjustmentResponse,
  MarketCondition,
  StartMonitoringRequest
} from '@/types/monitoring';

export class MonitoringAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'MonitoringAPIError';
  }
}

// Error handling utility
function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string }; status?: number } }).response;
    if (response?.data?.detail) {
      return response.data.detail;
    }
  }
  return fallback;
}

function extractStatusCode(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number } }).response;
    return response?.status;
  }
  return undefined;
}

export const monitoringAPI = {
  // === Session Management ===

  /**
   * 시간외 모니터링 세션 시작
   */
  async startSession(request: StartMonitoringRequest): Promise<{
    success: boolean;
    message: string;
    targets_count: number;
  }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        targets_count: number;
      }>('/api/monitoring/start', request);

      if (!response.success || !response.data) {
        throw new MonitoringAPIError(response.error || 'Failed to start monitoring session');
      }

      return response.data;
    } catch (error: unknown) {
      if (error instanceof MonitoringAPIError) {
        throw error;
      }
      throw new MonitoringAPIError(
        extractErrorMessage(error, 'Failed to start monitoring session'),
        extractStatusCode(error)
      );
    }
  },

  /**
   * 시간외 모니터링 세션 중지
   */
  async stopSession(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
      }>('/api/monitoring/stop');

      if (!response.success || !response.data) {
        throw new MonitoringAPIError(response.error || 'Failed to stop monitoring session');
      }

      return response.data;
    } catch (error: unknown) {
      if (error instanceof MonitoringAPIError) {
        throw error;
      }
      throw new MonitoringAPIError(
        extractErrorMessage(error, 'Failed to stop monitoring session'),
        extractStatusCode(error)
      );
    }
  },

  /**
   * 모니터링 상태 조회
   */
  async getStatus(): Promise<{
    success: boolean;
    status: MonitoringSessionStatus;
  }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        status: MonitoringSessionStatus;
      }>('/api/monitoring/status');

      if (!response.success || !response.data) {
        throw new MonitoringAPIError(response.error || 'Failed to get monitoring status');
      }

      return response.data;
    } catch (error: unknown) {
      if (error instanceof MonitoringAPIError) {
        throw error;
      }
      throw new MonitoringAPIError(
        extractErrorMessage(error, 'Failed to get monitoring status'),
        extractStatusCode(error)
      );
    }
  },

  /**
   * 모니터링 대상 목록 조회
   */
  async getTargets(): Promise<{
    success: boolean;
    targets: MonitoringTarget[];
    count: number;
  }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        targets: MonitoringTarget[];
        count: number;
      }>('/api/monitoring/targets');

      if (!response.success || !response.data) {
        throw new MonitoringAPIError(response.error || 'Failed to get monitoring targets');
      }

      return response.data;
    } catch (error: unknown) {
      if (error instanceof MonitoringAPIError) {
        throw error;
      }
      throw new MonitoringAPIError(
        extractErrorMessage(error, 'Failed to get monitoring targets'),
        extractStatusCode(error)
      );
    }
  },

  // === Threshold Management ===

  /**
   * 특정 종목 임계값 조정
   */
  async adjustThreshold(request: ThresholdAdjustmentRequest): Promise<{
    success: boolean;
    message: string;
    symbol: string;
    new_threshold: number;
    strategy: string;
  }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        symbol: string;
        new_threshold: number;
        strategy: string;
      }>('/api/monitoring/adjust-threshold', request);

      if (!response.success || !response.data) {
        throw new MonitoringAPIError(response.error || 'Failed to adjust threshold');
      }

      return response.data;
    } catch (error: unknown) {
      if (error instanceof MonitoringAPIError) {
        throw error;
      }
      throw new MonitoringAPIError(
        extractErrorMessage(error, 'Failed to adjust threshold'),
        extractStatusCode(error)
      );
    }
  },

  /**
   * 자동 임계값 조정
   */
  async autoAdjustThresholds(request: {
    strategy: 'conservative' | 'balanced' | 'aggressive' | 'time_based';
    apply_all: boolean;
    target_symbols?: string[];
  }): Promise<{
    success: boolean;
    message: string;
    strategy: string;
    market_condition: MarketCondition;
    adjustments: ThresholdAdjustmentResponse[];
  }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        strategy: string;
        market_condition: MarketCondition;
        adjustments: ThresholdAdjustmentResponse[];
      }>('/api/monitoring/auto-adjust-thresholds', request);

      if (!response.success || !response.data) {
        throw new MonitoringAPIError(response.error || 'Failed to auto-adjust thresholds');
      }

      return response.data;
    } catch (error: unknown) {
      if (error instanceof MonitoringAPIError) {
        throw error;
      }
      throw new MonitoringAPIError(
        extractErrorMessage(error, 'Failed to auto-adjust thresholds'),
        extractStatusCode(error)
      );
    }
  },

  /**
   * 권장 조정 전략 조회
   */
  async getSuggestedStrategies(): Promise<{
    success: boolean;
    market_condition: MarketCondition;
    suggested_strategies: Array<{
      strategy: string;
      description: string;
    }>;
  }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        market_condition: MarketCondition;
        suggested_strategies: Array<{
          strategy: string;
          description: string;
        }>;
      }>('/api/monitoring/suggested-strategies');

      if (!response.success || !response.data) {
        throw new MonitoringAPIError(response.error || 'Failed to get suggested strategies');
      }

      return response.data;
    } catch (error: unknown) {
      if (error instanceof MonitoringAPIError) {
        throw error;
      }
      throw new MonitoringAPIError(
        extractErrorMessage(error, 'Failed to get suggested strategies'),
        extractStatusCode(error)
      );
    }
  },

  /**
   * 임계값 조정 미리보기
   */
  async previewThresholdAdjustment(
    strategy: 'conservative' | 'balanced' | 'aggressive' | 'time_based',
    symbol?: string
  ): Promise<{
    success: boolean;
    strategy: string;
    market_condition: MarketCondition;
    previews: Array<{
      symbol: string;
      stock_name: string;
      current_threshold: number;
      recommended_threshold: number;
      adjustment_reason: string;
      confidence_score: number;
    }>;
  }> {
    try {
      const params = new URLSearchParams({ strategy });
      if (symbol) params.append('symbol', symbol);

      const response = await apiClient.get<{
        success: boolean;
        strategy: string;
        market_condition: MarketCondition;
        previews: Array<{
          symbol: string;
          stock_name: string;
          current_threshold: number;
          recommended_threshold: number;
          adjustment_reason: string;
          confidence_score: number;
        }>;
      }>(`/api/monitoring/threshold-preview?${params}`);

      if (!response.success || !response.data) {
        throw new MonitoringAPIError(response.error || 'Failed to preview threshold adjustment');
      }

      return response.data;
    } catch (error: unknown) {
      if (error instanceof MonitoringAPIError) {
        throw error;
      }
      throw new MonitoringAPIError(
        extractErrorMessage(error, 'Failed to preview threshold adjustment'),
        extractStatusCode(error)
      );
    }
  },

  // === Analytics and History ===

  /**
   * 세션 기록 조회
   */
  async getSessionHistory(): Promise<{
    success: boolean;
    current_session: {
      phase: string;
      start_time: string;
      total_targets: number;
      triggered_count: number;
      is_running: boolean;
    };
    history: Array<{
      session_id: string;
      start_time: string;
      end_time?: string;
      total_targets: number;
      triggered_count: number;
      success_rate: number;
    }>; // Session history records
  }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        current_session: {
          phase: string;
          start_time: string;
          total_targets: number;
          triggered_count: number;
          is_running: boolean;
        };
        history: Array<{
          session_id: string;
          start_time: string;
          end_time?: string;
          total_targets: number;
          triggered_count: number;
          success_rate: number;
        }>;
      }>('/api/monitoring/session-history');

      if (!response.success || !response.data) {
        throw new MonitoringAPIError(response.error || 'Failed to get session history');
      }

      return response.data;
    } catch (error: unknown) {
      if (error instanceof MonitoringAPIError) {
        throw error;
      }
      throw new MonitoringAPIError(
        extractErrorMessage(error, 'Failed to get session history'),
        extractStatusCode(error)
      );
    }
  },

  /**
   * 모니터링 성과 통계
   */
  async getPerformanceStats(): Promise<{
    success: boolean;
    stats: {
      total_targets: number;
      triggered_count: number;
      success_rate: number;
      average_change_percent: number;
      session_duration_minutes: number;
      current_phase: string;
    };
  }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        stats: {
          total_targets: number;
          triggered_count: number;
          success_rate: number;
          average_change_percent: number;
          session_duration_minutes: number;
          current_phase: string;
        };
      }>('/api/monitoring/performance-stats');

      if (!response.success || !response.data) {
        throw new MonitoringAPIError(response.error || 'Failed to get performance stats');
      }

      return response.data;
    } catch (error: unknown) {
      if (error instanceof MonitoringAPIError) {
        throw error;
      }
      throw new MonitoringAPIError(
        extractErrorMessage(error, 'Failed to get performance stats'),
        extractStatusCode(error)
      );
    }
  },

  // === Real-time Utilities ===

  /**
   * 실시간 모니터링 상태 스트림 (폴링 기반)
   */
  createStatusStream(intervalMs: number = 30000) {
    let intervalId: NodeJS.Timeout | null = null;
    const listeners: Array<(status: MonitoringSessionStatus) => void> = [];

    const start = () => {
      if (intervalId) return;

      const fetchStatus = async () => {
        try {
          const { status } = await this.getStatus();
          listeners.forEach(listener => listener(status));
        } catch (error) {
          console.error('Failed to fetch monitoring status:', error);
        }
      };

      // 즉시 한 번 실행
      fetchStatus();

      // 주기적 실행
      intervalId = setInterval(fetchStatus, intervalMs);
    };

    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const subscribe = (listener: (status: MonitoringSessionStatus) => void) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };
    };

    return { start, stop, subscribe };
  },

  /**
   * 임계값 조정 배치 적용
   */
  async batchAdjustThresholds(adjustments: Array<{
    symbol: string;
    new_threshold: number;
  }>): Promise<Array<{
    symbol: string;
    success: boolean;
    error?: string;
  }>> {
    const results = await Promise.allSettled(
      adjustments.map(async ({ symbol, new_threshold }) => {
        try {
          await this.adjustThreshold({
            symbol,
            new_threshold,
            strategy: 'manual'
          });
          return { symbol, success: true };
        } catch (error) {
          return {
            symbol,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return results.map((result, index) => {
      const symbol = adjustments[index].symbol;
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          symbol,
          success: false,
          error: result.reason?.message || 'Failed to adjust threshold'
        };
      }
    });
  }
};

export default monitoringAPI;