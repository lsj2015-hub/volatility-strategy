// WebSocket message types

export type WebSocketMessageType =
  | 'price_update'
  | 'buy_signal'
  | 'sell_signal'
  | 'session_status'
  | 'portfolio_update'
  | 'error'
  | 'heartbeat';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  timestamp: string;
  data: any;
}

export interface PriceUpdateMessage {
  type: 'price_update';
  timestamp: string;
  data: {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  };
}

export interface BuySignalMessage {
  type: 'buy_signal';
  timestamp: string;
  data: {
    symbol: string;
    price: number;
    quantity: number;
    reason: string;
    orderId?: string;
  };
}

export interface SellSignalMessage {
  type: 'sell_signal';
  timestamp: string;
  data: {
    symbol: string;
    price: number;
    quantity: number;
    reason: 'profit-target' | 'stop-loss' | 'time-based' | 'force-liquidation';
    orderId?: string;
  };
}

export interface SessionStatusMessage {
  type: 'session_status';
  timestamp: string;
  data: {
    day: 'day1' | 'day2';
    phase: string;
    status: string;
    nextAction?: string;
    nextActionTime?: string;
  };
}

export interface PortfolioUpdateMessage {
  type: 'portfolio_update';
  timestamp: string;
  data: {
    totalValue: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    positionCount: number;
    changes: Array<{
      symbol: string;
      action: 'added' | 'updated' | 'removed';
      position?: any;
    }>;
  };
}

export interface WebSocketConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastHeartbeat?: string;
  errorCount: number;
}