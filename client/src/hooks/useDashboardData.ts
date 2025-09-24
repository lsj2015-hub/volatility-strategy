/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  StocksService,
  PortfolioService,
  SystemService,
  AuthStatus,
  SystemStatus,
} from '@/lib/api';
import { StockData, Portfolio, PortfolioPerformance } from '@/types';

interface DashboardData {
  // 시스템 상태
  systemStatus: SystemStatus | null;
  authStatus: AuthStatus | null;

  // 시장 데이터
  topStocks: StockData[];
  volumeRanking: any[];

  // 포트폴리오 데이터
  portfolio: Portfolio | null;
  portfolioPerformance: PortfolioPerformance | null;

  // 로딩 상태
  loading: {
    system: boolean;
    stocks: boolean;
    portfolio: boolean;
  };

  // 에러 상태
  errors: {
    system: string | null;
    stocks: string | null;
    portfolio: string | null;
  };
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    systemStatus: null,
    authStatus: null,
    topStocks: [],
    volumeRanking: [],
    portfolio: null,
    portfolioPerformance: null,
    loading: {
      system: true,
      stocks: true,
      portfolio: true,
    },
    errors: {
      system: null,
      stocks: null,
      portfolio: null,
    },
  });

  // 시스템 상태 로드
  const loadSystemStatus = useCallback(async () => {
    setData((prev) => ({
      ...prev,
      loading: { ...prev.loading, system: true },
      errors: { ...prev.errors, system: null },
    }));

    try {
      const [systemStatus, authStatus] = await Promise.all([
        SystemService.getSystemStatus(),
        SystemService.getAuthStatus(),
      ]);

      setData((prev) => ({
        ...prev,
        systemStatus,
        authStatus,
        loading: { ...prev.loading, system: false },
      }));
    } catch (error) {
      setData((prev) => ({
        ...prev,
        loading: { ...prev.loading, system: false },
        errors: {
          ...prev.errors,
          system:
            error instanceof Error ? error.message : 'System status error',
        },
      }));
    }
  }, []);

  // 주식 데이터 로드
  const loadStockData = useCallback(async () => {
    setData((prev) => ({
      ...prev,
      loading: { ...prev.loading, stocks: true },
      errors: { ...prev.errors, stocks: null },
    }));

    try {
      const [topStocks, volumeRanking] = await Promise.all([
        StocksService.getAllStocks(),
        StocksService.getVolumeRanking(),
      ]);

      console.log('📊 Stock Data Loaded:', {
        topStocksCount: topStocks.length,
        volumeRankingCount: volumeRanking.length,
        firstStock: topStocks[0],
        firstVolume: volumeRanking[0],
      });

      setData((prev) => ({
        ...prev,
        topStocks,
        volumeRanking,
        loading: { ...prev.loading, stocks: false },
      }));
    } catch (error) {
      setData((prev) => ({
        ...prev,
        loading: { ...prev.loading, stocks: false },
        errors: {
          ...prev.errors,
          stocks: error instanceof Error ? error.message : 'Stock data error',
        },
      }));
    }
  }, []);

  // 포트폴리오 데이터 로드
  const loadPortfolioData = useCallback(async () => {
    setData((prev) => ({
      ...prev,
      loading: { ...prev.loading, portfolio: true },
      errors: { ...prev.errors, portfolio: null },
    }));

    try {
      const [portfolio, portfolioPerformance] = await Promise.all([
        PortfolioService.getCurrentPortfolio().catch(() => null), // 포트폴리오가 없을 수 있음
        PortfolioService.getPortfolioPerformance().catch(() => null),
      ]);

      setData((prev) => ({
        ...prev,
        portfolio,
        portfolioPerformance,
        loading: { ...prev.loading, portfolio: false },
      }));
    } catch (error) {
      setData((prev) => ({
        ...prev,
        loading: { ...prev.loading, portfolio: false },
        errors: {
          ...prev.errors,
          portfolio:
            error instanceof Error ? error.message : 'Portfolio data error',
        },
      }));
    }
  }, []);

  // 전체 데이터 새로고침
  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadSystemStatus(),
      loadStockData(),
      loadPortfolioData(),
    ]);
  }, [loadSystemStatus, loadStockData, loadPortfolioData]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // 주기적 업데이트 (30초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      loadSystemStatus(); // 시스템 상태만 주기적으로 업데이트
    }, 30000);

    return () => clearInterval(interval);
  }, [loadSystemStatus]);

  return {
    data,
    actions: {
      refreshAll,
      loadSystemStatus,
      loadStockData,
      loadPortfolioData,
    },
  };
}
