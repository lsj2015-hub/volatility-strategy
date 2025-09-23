/**
 * Market Indicators Data Hook
 * 시장 지표 데이터 관리 훅
 */

import { useState, useEffect, useCallback } from 'react';
import { getMarketIndices, getMarketIndicatorsHealth } from '@/lib/api/market';
import type { MarketIndicesResponse } from '@/types';

interface MarketIndicatorsState {
  data: MarketIndicesResponse | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface MarketHealthState {
  status: string;
  kis_api_connected: boolean;
  trading_mode: string;
  error?: string;
}

export function useMarketIndicators(refreshInterval: number = 30000) {
  const [state, setState] = useState<MarketIndicatorsState>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const [health, setHealth] = useState<MarketHealthState | null>(null);

  const fetchMarketData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [marketData, healthData] = await Promise.all([
        getMarketIndices(),
        getMarketIndicatorsHealth().catch(() => null), // Health check is optional
      ]);

      setState({
        data: marketData,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });

      if (healthData) {
        setHealth(healthData);
      }
    } catch (error) {
      console.error('Failed to fetch market indicators:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, []);

  const refresh = useCallback(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Initial load
  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(fetchMarketData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMarketData, refreshInterval]);

  return {
    ...state,
    health,
    refresh,
    isConnected: health?.kis_api_connected ?? false,
    tradingMode: health?.trading_mode ?? 'unknown',
  };
}