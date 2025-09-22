/**
 * Market indicators API client
 * 시장 지표 관련 API 클라이언트
 */

import { apiClient } from './client';

export interface MarketIndicators {
  kospi: {
    current: number;
    change: number;
    change_rate: number;
    volume: number;
    status: 'open' | 'closed';
  };
  kosdaq: {
    current: number;
    change: number;
    change_rate: number;
    volume: number;
    status: 'open' | 'closed';
  };
  usd_krw: {
    current: number;
    change: number;
    change_rate: number;
    status: 'active' | 'closed';
  };
  volume_leaders: Array<{
    symbol: string;
    name: string;
    volume: number;
    price: number;
    change_rate: number;
  }>;
  market_status: {
    is_open: boolean;
    session: 'pre_market' | 'regular' | 'after_hours' | 'closed' | 'weekend';
    next_open: string;
    last_updated: string;
  };
}

export interface MarketStatus {
  is_open: boolean;
  session: 'pre_market' | 'regular' | 'after_hours' | 'closed' | 'weekend';
  next_open: string;
  last_updated: string;
}

export interface MarketIndices {
  kospi: {
    current: number;
    change: number;
    change_rate: number;
    volume: number;
    status: 'open' | 'closed';
  };
  kosdaq: {
    current: number;
    change: number;
    change_rate: number;
    volume: number;
    status: 'open' | 'closed';
  };
}

/**
 * 전체 시장 지표 조회
 */
export async function getMarketIndicators(): Promise<MarketIndicators> {
  const response = await apiClient.get<MarketIndicators>('/api/market/indicators');
  if (!response.data) {
    throw new Error('No market data received');
  }
  return response.data;
}

/**
 * 시장 상태 조회
 */
export async function getMarketStatus(): Promise<MarketStatus> {
  const response = await apiClient.get<MarketStatus>('/api/market/status');
  if (!response.data) {
    throw new Error('No market status received');
  }
  return response.data;
}

/**
 * 주요 지수 조회 (코스피, 코스닥)
 */
export async function getMarketIndices(): Promise<MarketIndices> {
  const response = await apiClient.get<MarketIndices>('/api/market/indices');
  if (!response.data) {
    throw new Error('No market indices received');
  }
  return response.data;
}