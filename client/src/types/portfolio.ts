// Portfolio and position types

// Price update type for charts
export interface PriceUpdate {
  timestamp: string;
  price: number;
  pnl: number;
  pnl_percent: number;
}

export interface Position {
  position_id: string; // API에서 사용하는 키
  id: string;
  symbol: string;
  name: string;
  stock_name: string; // 한국어 종목명
  quantity: number;
  averagePrice: number;
  entry_price: number; // API에서 사용하는 키
  currentPrice: number;
  current_price: number; // API에서 사용하는 키 (차트용)
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  current_pnl: number; // API에서 사용하는 키
  current_pnl_percent: number; // API에서 사용하는 키
  entryTime: string;
  entry_time: string; // API에서 사용하는 키
  exitTime?: string;
  exitPrice?: number;
  realizedPnL?: number;
  status: 'active' | 'closed' | 'pending' | 'monitoring' | 'exit_pending';
  // 차트용 추가 속성들
  target_profit_percent?: number;
  stop_loss_percent?: number;
  price_updates?: PriceUpdate[];
}

export interface Portfolio {
  id: string;
  totalValue: number;
  totalInvested: number;
  availableCash: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  positions: Position[];
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioAllocation {
  symbol: string;
  name: string;
  targetAmount: number;
  targetPercent: number;
  quantity: number;
  estimatedPrice: number;
}

export interface PortfolioPerformance {
  totalReturn: number;
  totalReturnPercent: number;
  dailyReturn: number;
  dailyReturnPercent: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  sharpeRatio?: number;
}

// Exit strategy types
export interface ExitTarget {
  symbol: string;
  targetPrice: number;
  targetPercent: number;
  stopLossPrice: number;
  stopLossPercent: number;
  timeBasedExit: boolean;
  forceExitTime: string;
}

export interface ExitSignal {
  symbol: string;
  signalType: 'profit-target' | 'stop-loss' | 'time-based' | 'force-liquidation';
  currentPrice: number;
  targetPrice: number;
  timestamp: string;
  executed: boolean;
}

// Trade execution response
export interface TradeExecutionResponse {
  success: boolean;
  order_id?: string;
  message?: string;
  executed_price?: number;
  executed_quantity?: number;
  status?: 'pending' | 'executed' | 'failed' | 'cancelled';
}