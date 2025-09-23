/**
 * Market indicators API client
 * 시장 지표 관련 API 클라이언트
 */

import { apiClient } from './client';
import type { MarketIndicesResponse, IndexData } from '@/types';

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

  if (!response) {
    throw new Error(`No data received for index: ${indexCode}`);
  }
  return response as any;
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

  if (!response) {
    throw new Error('No health status received');
  }
  return response as any;
}