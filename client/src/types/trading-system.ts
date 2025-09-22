/**
 * Trading system types for automated trading
 */

export interface TradingSystemStatus {
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'error';
  components: {
    order_executor: boolean;
    signal_processor: boolean;
    position_manager: boolean;
    exit_strategy: boolean;
  };
  uptime_seconds: number;
  active_orders_count: number;
  active_positions_count: number;
  last_updated: string;
}

export interface BuyOrder {
  order_id: string;
  symbol: string;
  stock_name: string;
  target_price: number;
  quantity: number;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  executed_at?: string;
  kis_order_id?: string;
  actual_price?: number;
  error_message?: string;
}

export interface TradingPosition {
  position_id: string;
  symbol: string;
  stock_name: string;
  entry_price: number;
  quantity: number;
  target_profit_percent: number;
  stop_loss_percent: number;
  max_hold_hours: number;
  current_price?: number;
  unrealized_pnl?: number;
  unrealized_pnl_percent?: number;
  status: 'active' | 'closed' | 'closing';
  entry_time: string;
  exit_time?: string;
  exit_reason?: string;
  day_type: 'day1' | 'day2';
}

export interface BuySignal {
  signal_id: string;
  symbol: string;
  stock_name: string;
  price: number;
  quantity: number;
  reason: string;
  condition_met: Record<string, any>;
  processed: boolean;
  created_at: string;
  processed_at?: string;
  order_id?: string;
}

export interface ExitStrategy {
  config: {
    early_morning: ExitPhaseConfig;
    mid_morning: ExitPhaseConfig;
    afternoon: ExitPhaseConfig;
    force_exit: ExitPhaseConfig;
  };
  force_exit_time: string;
  max_hold_hours: number;
  current_phase?: string;
  next_phase_time?: string;
}

export interface ExitPhaseConfig {
  start_time: string;
  end_time: string;
  profit_threshold: number;
  loss_threshold: number;
  time_based_exit: boolean;
  priority: number;
}

export interface TradingStats {
  total_orders: number;
  completed_orders: number;
  failed_orders: number;
  total_positions: number;
  active_positions: number;
  closed_positions: number;
  total_pnl: number;
  win_rate: number;
  average_return: number;
  max_drawdown: number;
  sharpe_ratio: number;
}

export interface DailyPerformance {
  date: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_pnl: number;
  win_rate: number;
  average_return: number;
  max_position_value: number;
  trading_volume: number;
}

// Request types
export interface BuyOrderRequest {
  symbol: string;
  stock_name: string;
  target_price: number;
  investment_amount: number;
}

export interface ProcessBuySignalRequest {
  symbol: string;
  stock_name: string;
  price: number;
  quantity: number;
  reason: string;
  condition_met: Record<string, any>;
}

export interface UpdatePositionRequest {
  target_profit_percent?: number;
  stop_loss_percent?: number;
  max_hold_hours?: number;
}

export interface ClosePositionRequest {
  reason?: string;
}

export interface ForceExitAllRequest {
  reason: string;
}

export interface UpdateExitStrategyRequest {
  phase_config?: Record<string, ExitPhaseConfig>;
  force_exit_time?: string;
  max_hold_hours?: number;
}