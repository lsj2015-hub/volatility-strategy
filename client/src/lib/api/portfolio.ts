/**
 * 포트폴리오 관련 API 서비스
 */

import { apiClient } from './client';
import {
  Portfolio,
  Position,
  PortfolioAllocation,
  PortfolioPerformance,
  ApiResponse
} from '@/types';

export interface CreatePortfolioRequest {
  allocations: PortfolioAllocation[];
  total_investment: number;
}

export interface ExecuteTradeRequest {
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  price?: number;
  order_type: 'market' | 'limit';
}

export class PortfolioService {
  /**
   * 포트폴리오 생성
   */
  static async createPortfolio(request: CreatePortfolioRequest): Promise<Portfolio> {
    const response = await apiClient.post<Portfolio>('/api/portfolio/create', request);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create portfolio');
    }

    return response.data;
  }

  /**
   * 현재 포트폴리오 조회
   */
  static async getCurrentPortfolio(): Promise<Portfolio> {
    const response = await apiClient.get<Portfolio>('/api/portfolio/current');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get current portfolio');
    }

    return response.data;
  }

  /**
   * 포트폴리오 할당 계획 조회
   */
  static async getPortfolioAllocations(): Promise<PortfolioAllocation[]> {
    const response = await apiClient.get<PortfolioAllocation[]>('/api/portfolio/allocations');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get portfolio allocations');
    }

    return response.data;
  }

  /**
   * 매수 주문 일괄 실행
   */
  static async executeBuyOrders(): Promise<Position[]> {
    const response = await apiClient.post<Position[]>('/api/portfolio/execute-buys');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to execute buy orders');
    }

    return response.data;
  }

  /**
   * 개별 거래 실행
   */
  static async executeTrade(request: ExecuteTradeRequest): Promise<any> {
    const response = await apiClient.post<any>('/api/portfolio/trade', request);

    if (!response.success) {
      throw new Error(response.error || 'Failed to execute trade');
    }

    return response.data;
  }

  /**
   * 포트폴리오 성과 분석
   */
  static async getPortfolioPerformance(): Promise<PortfolioPerformance> {
    const response = await apiClient.get<PortfolioPerformance>('/api/portfolio/performance');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get portfolio performance');
    }

    return response.data;
  }
}