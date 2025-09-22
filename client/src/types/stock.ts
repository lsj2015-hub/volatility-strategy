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