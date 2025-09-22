// Portfolio and position types

export interface Position {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  entryTime: string;
  exitTime?: string;
  exitPrice?: number;
  realizedPnL?: number;
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