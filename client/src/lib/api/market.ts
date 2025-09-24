/**
 * Market indicators API client
 * 시장 지표 관련 API 클라이언트
 */

import { apiClient } from './client';
import type { MarketIndicesResponse, IndexData } from '@/types';

export interface MarketIndicatorData {
  name: string;
  value: number;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  description: string;
  timestamp: string;
}

export interface ComprehensiveMarketData {
  indices: Record<string, IndexData>;
  market_breadth: {
    total_stocks: number;
    up_stocks: number;
    down_stocks: number;
    unchanged_stocks: number;
    advance_decline_ratio: number;
    timestamp: string;
  };
  volatility: {
    metrics: Record<string, number | string | boolean>;
    market_condition: string;
    timestamp: string;
  };
  calculated_indicators: Record<string, MarketIndicatorData>;
  summary: {
    overall_condition: MarketIndicatorData | null;
    market_stress: MarketIndicatorData | null;
    total_indicators: number;
    warning_count: number;
    critical_count: number;
  };
  timestamp: string;
  success: boolean;
}

export interface MarketSummaryResponse {
  data: {
    kospi: {
      price: number;
      change: number;
      status: 'up' | 'down' | 'stable';
    };
    kosdaq: {
      price: number;
      change: number;
      status: 'up' | 'down' | 'stable';
    };
    market_condition: {
      status: 'normal' | 'warning' | 'critical';
      description: string;
      trend: 'up' | 'down' | 'stable';
    };
    volatility: {
      level: string;
      value: number;
    };
    breadth: {
      advance_decline_ratio: number;
      up_stocks_ratio: number;
    };
    alert_count: {
      warning: number;
      critical: number;
    };
    timestamp: string;
  };
  success: boolean;
}

/**
 * KOSPI/KOSDAQ 시장 지수 데이터 조회
 */
export async function getMarketIndices(): Promise<MarketIndicesResponse> {
  const response = await apiClient.get<MarketIndicesResponse>('/api/market-indicators/indices');

  // The backend returns the data directly, not wrapped in a 'data' field
  // So the response itself is the MarketIndicesResponse
  if (!response) {
    throw new Error('No market indices data received');
  }

  return response as MarketIndicesResponse;
}

/**
 * 개별 지수 데이터 조회
 */
export async function getIndexData(indexCode: string): Promise<{
  data: IndexData;
  timestamp: string;
  success: boolean;
}> {
  const response = await apiClient.get<{
    data: IndexData;
    timestamp: string;
    success: boolean;
  }>(`/api/market-indicators/indices/${indexCode}`);

  if (!response.success || !response.data) {
    throw new Error(response.error || `No data received for index: ${indexCode}`);
  }

  return response.data;
}

/**
 * Market Indicators API 상태 확인
 */
export async function getMarketIndicatorsHealth(): Promise<{
  status: string;
  kis_api_connected: boolean;
  trading_mode: string;
  timestamp?: string;
  error?: string;
}> {
  const response = await apiClient.get<{
    status: string;
    kis_api_connected: boolean;
    trading_mode: string;
    timestamp?: string;
    error?: string;
  }>('/api/market-indicators/health');

  if (!response.success || !response.data) {
    throw new Error(response.error || 'No health status received');
  }

  return response.data;
}