/**
 * API 서비스 중앙 export
 */

import { StocksService } from './stocks';

export { apiClient, ApiClient, ApiError } from './client';
export { StocksService } from './stocks';
export { PortfolioService } from './portfolio';
export { SystemService } from './system';
export { monitoringAPI, MonitoringAPIError } from './monitoring';
export { tradingApi } from './trading';
export { getMarketIndicators, getMarketStatus, getMarketIndices } from './market';

// Create alias for StocksService
export const stocksApi = StocksService;

export type {
  CreatePortfolioRequest,
  ExecuteTradeRequest
} from './portfolio';

export type {
  AuthStatus,
  SystemStatus
} from './system';

export type {
  MarketIndicators,
  MarketStatus,
  MarketIndices
} from './market';