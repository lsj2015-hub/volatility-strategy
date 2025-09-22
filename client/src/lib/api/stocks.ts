/**
 * 주식 관련 API 서비스
 */

import { apiClient } from './client';
import {
  StockData,
  FilterConditions,
  FilteredStock,
  ApiResponse
} from '@/types';

/**
 * Helper function to format error messages properly
 */
function formatErrorMessage(response: any, fallback: string): string {
  if (response.error) {
    return typeof response.error === 'string' ? response.error : JSON.stringify(response.error);
  } else if (response.message) {
    return response.message;
  }
  return fallback;
}

export class StocksService {
  /**
   * 주식 필터링 실행
   */
  static async filterStocks(conditions: FilterConditions): Promise<FilteredStock[]> {
    const response = await apiClient.post<FilteredStock[]>('/api/stocks/filter', {
      conditions
    });

    if (!response.success || !response.data) {
      let errorMessage = 'Failed to filter stocks';
      if (response.error) {
        errorMessage = typeof response.error === 'string' ? response.error : JSON.stringify(response.error);
      } else if (response.message) {
        errorMessage = response.message;
      }
      throw new Error(errorMessage);
    }

    return response.data;
  }

  /**
   * 전체 주식 목록 조회
   */
  static async getAllStocks(params?: {
    sector?: string;
    min_price?: number;
    max_price?: number;
    limit?: number;
  }): Promise<StockData[]> {
    const response = await apiClient.get<any[]>('/api/stocks/all', params);

    if (!response.success || !response.data) {
      let errorMessage = 'Failed to get stocks';
      if (response.error) {
        errorMessage = typeof response.error === 'string' ? response.error : JSON.stringify(response.error);
      } else if (response.message) {
        errorMessage = response.message;
      }
      throw new Error(errorMessage);
    }

    // 백엔드 응답을 프론트엔드 타입에 맞게 변환
    const transformedData: StockData[] = response.data.map((stock: any) => ({
      symbol: stock.symbol,
      name: stock.name,
      currentPrice: stock.current_price || stock.currentPrice,
      previousClose: stock.previous_close || stock.previousClose,
      change: stock.change,
      changePercent: stock.change_percent || stock.changePercent,
      volume: stock.volume,
      marketCap: stock.market_cap || stock.marketCap,
      sector: stock.sector,
      industry: stock.industry,
    }));

    return transformedData;
  }

  /**
   * 개별 주식 상세 정보 조회
   */
  static async getStockDetail(symbol: string): Promise<StockData> {
    const response = await apiClient.get<StockData>(`/api/stocks/${symbol}`);

    if (!response.success || !response.data) {
      throw new Error(formatErrorMessage(response, 'Failed to get stock detail'));
    }

    return response.data;
  }

  /**
   * 시간외 호가 조회
   */
  static async getAfterHoursPrice(symbol: string): Promise<any> {
    const response = await apiClient.get<any>(`/api/stocks/${symbol}/after-hours`);

    if (!response.success || !response.data) {
      throw new Error(formatErrorMessage(response, 'Failed to get after-hours price'));
    }

    return response.data;
  }

  /**
   * 거래량 순위 조회
   */
  static async getVolumeRanking(params?: {
    market_div?: string;
    limit?: number;
  }): Promise<any[]> {
    const response = await apiClient.get<any[]>('/api/stocks/ranking/volume', params);

    if (!response.success || !response.data) {
      throw new Error(formatErrorMessage(response, 'Failed to get volume ranking'));
    }

    return response.data;
  }

  /**
   * 여러 주식 실시간 가격 조회
   */
  static async getMultipleStockPrices(symbols: string[]): Promise<any[]> {
    const response = await apiClient.post<any[]>('/api/stocks/prices', {
      symbols
    });

    if (!response.success || !response.data) {
      throw new Error(formatErrorMessage(response, 'Failed to get stock prices'));
    }

    return response.data;
  }

  /**
   * 필터링 조건 동적 조정
   */
  static async adjustFilterConditions(currentConditions: FilterConditions): Promise<FilterConditions> {
    const response = await apiClient.post<FilterConditions>('/api/stocks/adjust-conditions', currentConditions);

    if (!response.success || !response.data) {
      throw new Error(formatErrorMessage(response, 'Failed to adjust filter conditions'));
    }

    return response.data;
  }
}