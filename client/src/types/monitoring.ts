/**
 * After-hours Monitoring System Types
 * 시간외 거래 모니터링 시스템 타입 정의
 */

// === Core Types ===

export type SessionPhase =
  | 'waiting'     // 16:00 이전 대기
  | 'phase_1'     // 16:00-16:30
  | 'phase_2'     // 16:30-17:00
  | 'phase_3'     // 17:00-17:30
  | 'phase_4'     // 17:30-17:40
  | 'completed';  // 17:40 이후 완료

export type AdjustmentStrategy =
  | 'conservative'  // 보수적 (임계값 상향)
  | 'balanced'      // 균형 (기본값 유지)
  | 'aggressive'    // 공격적 (임계값 하향)
  | 'time_based'    // 시간 기반 자동 조정
  | 'manual';       // 수동 조정

// === Data Models ===

export interface MonitoringTarget {
  symbol: string;
  stock_name: string;
  entry_price: number;
  current_price: number;
  change_percent: number;
  volume: number;
  buy_threshold: number;
  is_triggered: boolean;
  trigger_time?: string; // ISO string
}

export interface MonitoringSessionStatus {
  is_running: boolean;
  current_phase: SessionPhase;
  phase_start_time: string; // ISO string
  next_phase_time?: string; // HH:MM format
  monitoring_targets: MonitoringTarget[];
  total_targets: number;
  triggered_count: number;
  remaining_time_seconds: number;
}

export interface MarketCondition {
  total_rise_count: number;      // 상승 종목 수
  total_stock_count: number;     // 전체 종목 수
  average_change: number;        // 평균 변동률
  volatility_index: number;      // 변동성 지수
  volume_ratio: number;          // 거래량 비율
}

export interface ThresholdAdjustmentResponse {
  symbol: string;
  old_threshold: number;
  new_threshold: number;
  adjustment_reason: string;
  confidence_score: number; // 0.0 - 1.0
  strategy: AdjustmentStrategy;
}

// === Request Types ===

export interface StartMonitoringRequest {
  targets: Array<{
    symbol: string;
    stock_name: string;
    entry_price: number;
    volume?: number;
    buy_threshold?: number; // 기본 2.0%
  }>;
  auto_start?: boolean; // 기본 true
}

export interface ThresholdAdjustmentRequest {
  symbol: string;
  new_threshold: number; // 0 < x <= 10
  strategy?: AdjustmentStrategy; // 기본 'manual'
}

export interface AutoThresholdAdjustmentRequest {
  strategy: 'conservative' | 'balanced' | 'aggressive' | 'time_based';
  apply_all?: boolean; // 기본 false
  target_symbols?: string[]; // apply_all이 false일 때 필요
}

// === Response Types ===

export interface MonitoringStatusResponse {
  success: boolean;
  status: MonitoringSessionStatus;
}

export interface MonitoringTargetsResponse {
  success: boolean;
  targets: MonitoringTarget[];
  count: number;
}

export interface SuggestedStrategiesResponse {
  success: boolean;
  market_condition: MarketCondition;
  suggested_strategies: Array<{
    strategy: AdjustmentStrategy;
    description: string;
  }>;
}

export interface ThresholdPreviewResponse {
  success: boolean;
  strategy: AdjustmentStrategy;
  market_condition: MarketCondition;
  previews: Array<{
    symbol: string;
    stock_name: string;
    current_threshold: number;
    recommended_threshold: number;
    adjustment_reason: string;
    confidence_score: number;
  }>;
}

export interface SessionHistoryResponse {
  success: boolean;
  current_session: {
    phase: SessionPhase;
    start_time: string; // ISO string
    total_targets: number;
    triggered_count: number;
    is_running: boolean;
  };
  history: any[]; // 향후 확장
}

export interface PerformanceStatsResponse {
  success: boolean;
  stats: {
    total_targets: number;
    triggered_count: number;
    success_rate: number; // 백분율
    average_change_percent: number;
    session_duration_minutes: number;
    current_phase: SessionPhase;
  };
}

// === UI Component Props ===

export interface MonitoringSessionControlProps {
  isRunning: boolean;
  targets: MonitoringTarget[];
  onStart: (targets: StartMonitoringRequest['targets']) => Promise<void>;
  onStop: () => Promise<void>;
  loading?: boolean;
}

export interface SessionTimelineProps {
  currentPhase: SessionPhase;
  phaseStartTime: string;
  nextPhaseTime?: string;
  remainingSeconds: number;
}

export interface ThresholdControlsProps {
  targets: MonitoringTarget[];
  marketCondition?: MarketCondition;
  onAdjustThreshold: (symbol: string, newThreshold: number) => Promise<void>;
  onAutoAdjust: (strategy: AdjustmentStrategy, applyAll: boolean, symbols?: string[]) => Promise<void>;
  loading?: boolean;
}

export interface MonitoringTargetCardProps {
  target: MonitoringTarget;
  onThresholdChange: (newThreshold: number) => void;
  onTriggerManually?: () => void;
  compact?: boolean;
}

export interface SessionStatsProps {
  stats: PerformanceStatsResponse['stats'];
  refreshInterval?: number; // ms, 기본 30000 (30초)
}

// === Hook Types ===

export interface UseMonitoringSessionOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // ms, 기본 30000
  onPhaseChange?: (oldPhase: SessionPhase, newPhase: SessionPhase) => void;
  onTargetTriggered?: (target: MonitoringTarget) => void;
  onSessionComplete?: (stats: PerformanceStatsResponse['stats']) => void;
}

export interface UseMonitoringSessionReturn {
  // Status
  status: MonitoringSessionStatus | null;
  isLoading: boolean;
  error: string | null;

  // Session Control
  startSession: (targets: StartMonitoringRequest['targets']) => Promise<boolean>;
  stopSession: () => Promise<boolean>;

  // Threshold Management
  adjustThreshold: (symbol: string, newThreshold: number) => Promise<boolean>;
  autoAdjustThresholds: (strategy: AdjustmentStrategy, applyAll: boolean, symbols?: string[]) => Promise<boolean>;
  previewAdjustment: (strategy: AdjustmentStrategy, symbol?: string) => Promise<ThresholdPreviewResponse | null>;

  // Analytics
  getPerformanceStats: () => Promise<PerformanceStatsResponse['stats'] | null>;
  getSuggestedStrategies: () => Promise<SuggestedStrategiesResponse | null>;

  // Refresh
  refresh: () => Promise<void>;
}

// === State Management ===

export interface MonitoringState {
  // Session
  session: MonitoringSessionStatus | null;
  isSessionLoading: boolean;
  sessionError: string | null;

  // Market Condition
  marketCondition: MarketCondition | null;
  suggestedStrategies: SuggestedStrategiesResponse['suggested_strategies'];

  // Performance
  performanceStats: PerformanceStatsResponse['stats'] | null;

  // UI State
  selectedTargets: string[]; // 선택된 종목 symbols
  thresholdPreview: ThresholdPreviewResponse | null;
  adjustmentLoading: boolean;

  // Auto-refresh
  autoRefreshEnabled: boolean;
  lastUpdated: Date | null;
}

export interface MonitoringActions {
  // Session Management
  startSession: (targets: StartMonitoringRequest['targets']) => Promise<void>;
  stopSession: () => Promise<void>;
  refreshSession: () => Promise<void>;

  // Threshold Management
  adjustThreshold: (symbol: string, newThreshold: number) => Promise<void>;
  autoAdjustThresholds: (strategy: AdjustmentStrategy, applyAll: boolean, symbols?: string[]) => Promise<void>;
  previewThresholdAdjustment: (strategy: AdjustmentStrategy, symbol?: string) => Promise<void>;

  // Market Analysis
  refreshMarketCondition: () => Promise<void>;
  getSuggestedStrategies: () => Promise<void>;

  // Performance Analytics
  refreshPerformanceStats: () => Promise<void>;

  // UI Actions
  selectTarget: (symbol: string) => void;
  deselectTarget: (symbol: string) => void;
  selectAllTargets: () => void;
  deselectAllTargets: () => void;

  // Settings
  setAutoRefresh: (enabled: boolean) => void;
  resetState: () => void;
}

// === Constants ===

export const PHASE_TIMES = {
  phase_1: '16:00',
  phase_2: '16:30',
  phase_3: '17:00',
  phase_4: '17:30',
  completed: '17:40'
} as const;

export const ADJUSTMENT_STRATEGY_LABELS: Record<AdjustmentStrategy, string> = {
  conservative: '보수적 전략',
  balanced: '균형 전략',
  aggressive: '공격적 전략',
  time_based: '시간 기반',
  manual: '수동 조정'
} as const;

export const PHASE_LABELS: Record<SessionPhase, string> = {
  waiting: '대기 중',
  phase_1: '1단계 (16:00-16:30)',
  phase_2: '2단계 (16:30-17:00)',
  phase_3: '3단계 (17:00-17:30)',
  phase_4: '4단계 (17:30-17:40)',
  completed: '완료'
} as const;

// === Utility Types ===

export type MonitoringEventType =
  | 'session_started'
  | 'session_stopped'
  | 'phase_changed'
  | 'target_triggered'
  | 'threshold_adjusted'
  | 'session_completed';

export interface MonitoringEvent {
  type: MonitoringEventType;
  timestamp: Date;
  data: any;
}

export type ThresholdValidationResult = {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
};

export type SessionValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};