// Trading session and strategy types

export type TradingDay = 'day1' | 'day2';
export type TradingPhase = 'filtering' | 'portfolio-building' | 'monitoring' | 'trading' | 'closed';
export type SessionStatus = 'active' | 'paused' | 'stopped' | 'completed';

export interface TradingSession {
  id: string;
  day: TradingDay;
  phase: TradingPhase;
  status: SessionStatus;
  startTime: string;
  endTime?: string;
  configuration: SessionConfiguration;
}

export interface SessionConfiguration {
  maxPositions: number;
  maxInvestmentAmount: number;
  riskLevel: 'conservative' | 'balanced' | 'aggressive';
  autoExecution: boolean;
}

// Filtering conditions - KIS API 실현 가능한 조건들로 재정의
export interface FilterConditions {
  // 거래량 (억원 단위)
  minVolume: number;
  maxVolume: number;
  // 주가 범위 (원)
  minPrice: number;
  maxPrice: number;
  // 간소화된 모멘텀 점수 (0-100)
  minMomentum: number;
  maxMomentum: number;
  // 체결강도 (KIS API 직접 제공)
  minStrength: number;
  maxStrength: number;
  // 시가총액 범위 (억원)
  minMarketCap?: number;
  maxMarketCap?: number;

  // 🆕 추가 모멘텀 조건들 (옵셔널 - 기존 코드 호환성 보장)
  // 후반부 상승률 (14:00-15:30) - 백분율
  minLateSessionReturn?: number;
  maxLateSessionReturn?: number;
  // 후반부 거래량 집중도 (%) - 후반부 거래량 / 일일 총거래량 * 100
  minLateSessionVolumeRatio?: number;
  maxLateSessionVolumeRatio?: number;
  // 시장 대비 상대 수익률 (%) - 개별종목수익률 - 시장지수수익률
  minRelativeReturn?: number;
  maxRelativeReturn?: number;
  // VWAP 대비 종가 비율 (%) - 종가 / VWAP * 100
  minVwapRatio?: number;
  maxVwapRatio?: number;
}

export interface FilteredStock {
  symbol: string;
  name: string;
  score: number;
  price: number;
  volume: number; // 거래럄 (원)
  momentum: number; // 간소화된 모멘텀 점수 (0-100)
  strength: number; // 체결강도
  marketCap?: number; // 시가총액 (억원)
  dailyReturn: number; // 당일 수익률 (%)
  volumeRatio: number; // 평균 대비 거래량 배수
  sector?: string;
  reasons: string[];

  // 🆕 추가 모멘텀 데이터 (옵셔널)
  lateSessionReturn?: number; // 후반부 상승률 (%)
  lateSessionVolumeRatio?: number; // 후반부 거래량 집중도 (%)
  relativeReturn?: number; // 시장 대비 상대 수익률 (%)
  vwapRatio?: number; // VWAP 대비 종가 비율 (%)
  vwap?: number; // VWAP 가격 (원)
}

// Buy conditions and monitoring
export interface BuyCondition {
  symbol: string;
  targetPrice: number;
  currentPrice: number;
  threshold: number;
  isTriggered: boolean;
  triggeredAt?: string;
}

export interface MonitoringStatus {
  timeSlot: '16:00' | '16:30' | '17:00' | '17:30';
  checkedStocks: number;
  triggeredBuys: number;
  nextCheckTime: string;
}

// Trading mode management
export interface TradingModeData {
  is_mock_trading: boolean;
  mode_name: string;
  base_url: string;
  account_info?: {
    account_number: string;
    account_product_code: string;
  };
  api_status: 'connected' | 'disconnected' | 'error';
  last_updated: string;
}

export interface TradingModeRequest {
  is_mock: boolean;
}