/**
 * Trading API client for automated trading system
 */

import { apiClient } from './client';

// Trading System Management
export const tradingApi = {
  // System Control
  async getSystemStatus() {
    const response = await apiClient.get('/api/trading/system/status');
    return response.data;
  },

  async startTradingSystem() {
    const response = await apiClient.post('/api/trading/system/start');
    return response.data;
  },

  async stopTradingSystem() {
    const response = await apiClient.post('/api/trading/system/stop');
    return response.data;
  },

  // Order Management
  async createBuyOrder(orderData: {
    symbol: string;
    stock_name: string;
    target_price: number;
    investment_amount: number;
  }) {
    const response = await apiClient.post('/api/trading/orders/buy', orderData);
    return response.data;
  },

  async getAllOrders() {
    const response = await apiClient.get('/api/trading/orders');
    return response.data;
  },

  async getOrderStatus(orderId: string) {
    const response = await apiClient.get(`/api/trading/orders/${orderId}`);
    return response.data;
  },

  async cancelOrder(orderId: string) {
    const response = await apiClient.post(`/api/trading/orders/${orderId}/cancel`);
    return response.data;
  },

  // Position Management
  async getAllPositions() {
    const response = await apiClient.get('/api/trading/positions');
    return response.data;
  },

  async getPosition(positionId: string) {
    const response = await apiClient.get(`/api/trading/positions/${positionId}`);
    return response.data;
  },

  async updatePosition(positionId: string, updates: {
    target_profit_percent?: number;
    stop_loss_percent?: number;
    max_hold_hours?: number;
  }) {
    const response = await apiClient.put(`/api/trading/positions/${positionId}`, updates);
    return response.data;
  },

  async closePosition(positionId: string, reason?: string) {
    const response = await apiClient.post(`/api/trading/positions/${positionId}/close`, {
      reason: reason || 'Manual close'
    });
    return response.data;
  },

  // Buy Signals
  async processBuySignal(signalData: {
    symbol: string;
    stock_name: string;
    price: number;
    quantity: number;
    reason: string;
    condition_met: Record<string, any>;
  }) {
    const response = await apiClient.post('/api/trading/signals/buy', signalData);
    return response.data;
  },

  async getAllSignals() {
    const response = await apiClient.get('/api/trading/signals');
    return response.data;
  },

  // Exit Strategy
  async getExitStrategy() {
    const response = await apiClient.get('/api/trading/exit-strategy');
    return response.data;
  },

  async updateExitStrategy(strategy: {
    phase_config?: Record<string, any>;
    force_exit_time?: string;
    max_hold_hours?: number;
  }) {
    const response = await apiClient.put('/api/trading/exit-strategy', strategy);
    return response.data;
  },

  async executeExitStrategy() {
    const response = await apiClient.post('/api/trading/exit-strategy/execute');
    return response.data;
  },

  async forceExitAll(reason: string = 'Manual force exit') {
    const response = await apiClient.post('/api/trading/exit-strategy/force-exit', {
      reason
    });
    return response.data;
  },

  // Statistics and Analytics
  async getTradingStats() {
    const response = await apiClient.get('/api/trading/stats');
    return response.data;
  },

  async getDailyPerformance() {
    const response = await apiClient.get('/api/trading/performance/daily');
    return response.data;
  }
};