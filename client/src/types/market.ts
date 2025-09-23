/**
 * Market Indicators Types
 * 시장 지수 및 지표 데이터 타입 정의
 */

export interface IndexData {
  index_code: string;
  index_name: string;
  current_price: number;
  change: number;
  change_rate: number;
  change_sign: string;
  volume: number;
  trade_amount: number;
  open_price: number;
  high_price: number;
  low_price: number;
  up_count: number;
  down_count: number;
  unchanged_count: number;
  year_high: number;
  year_high_date: string;
  year_low: number;
  year_low_date: string;
}

export interface MarketIndicesResponse {
  kospi?: IndexData;
  kosdaq?: IndexData;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface MarketSummary {
  kospi_price: number;
  kospi_change_rate: number;
  kosdaq_price: number;
  kosdaq_change_rate: number;
  market_status: string;
  timestamp: string;
}

export interface IndexHistoryRequest {
  index_code: string;
  period?: string;
  start_date?: string;
  end_date?: string;
}

export interface IndexHistoryData {
  date: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  change: number;
  change_rate: number;
}

export interface IndexHistoryResponse {
  index_code: string;
  index_name: string;
  period: string;
  data: IndexHistoryData[];
  count: number;
  success: boolean;
  error?: string;
}