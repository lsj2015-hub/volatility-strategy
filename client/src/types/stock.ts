// Stock data types

export interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  sector?: string;
  industry?: string;
}

export interface StockPrice {
  symbol: string;
  price: number;
  timestamp: string;
  volume?: number;
}

export interface StockQuote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: string;
}

// After-hours trading data
export interface AfterHoursData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

// Market data aggregates
export interface MarketOverview {
  totalStocks: number;
  gainers: number;
  losers: number;
  unchanged: number;
  totalVolume: number;
  marketStatus: 'open' | 'closed' | 'after-hours';
}

// Backend API response types
export interface StockApiResponse {
  symbol: string;
  name: string;
  current_price: number;
  previous_close: number;
  change: number;
  change_percent: number;
  volume: number;
  market_cap?: number;
  sector?: string;
  industry?: string;
}

export interface VolumeRankingResponse {
  symbol: string;
  name: string;
  volume: number;
  price: number;
  change_percent: number;
}

export interface StockPriceResponse {
  symbol: string;
  price: number;
  timestamp: string;
  volume?: number;
}