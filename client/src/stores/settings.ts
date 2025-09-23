import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FilterConditions } from '@/types/trading';

export interface TradingPreset {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  conditions: FilterConditions;
  riskManagement: {
    earlyTakeProfit: number;
    earlyStopLoss: number;
    lateTakeProfit: number;
    finalExitRange: number;
  };
}

export interface NotificationSettings {
  email: boolean;
  buySignals: boolean;
  sellSignals: boolean;
  portfolioUpdates: boolean;
  systemStatus: boolean;
  pnlThreshold: number;
}

export interface KISAPISettings {
  appKey: string;
  appSecret: string;
  environment: 'sandbox' | 'production';
  isConnected: boolean;
}

export interface SettingsStore {
  // Default filtering conditions
  defaultConditions: FilterConditions;

  // Trading presets
  presets: TradingPreset[];
  activePreset: string | null;

  // Risk management
  riskManagement: {
    earlyTakeProfit: number;
    earlyStopLoss: number;
    lateTakeProfit: number;
    finalExitRange: number;
    maxPositions: number;
  };

  // System settings
  notifications: NotificationSettings;
  apiSettings: KISAPISettings;

  // Schedule settings
  schedule: {
    filteringTime: string;
    monitoringStart: string;
    monitoringEnd: string;
    tradingStart: string;
    tradingEnd: string;
  };

  // Actions
  updateDefaultConditions: (conditions: Partial<FilterConditions>) => void;
  updateRiskManagement: (settings: Partial<SettingsStore['riskManagement']>) => void;
  updateNotifications: (settings: Partial<NotificationSettings>) => void;
  updateAPISettings: (settings: Partial<KISAPISettings>) => void;
  updateSchedule: (schedule: Partial<SettingsStore['schedule']>) => void;

  // Preset management
  addPreset: (preset: Omit<TradingPreset, 'id'>) => void;
  updatePreset: (id: string, preset: Partial<TradingPreset>) => void;
  deletePreset: (id: string) => void;
  setActivePreset: (id: string | null) => void;
  loadPreset: (id: string) => void;

  // Reset functions
  resetToDefaults: () => void;
  resetConditions: () => void;
}

const defaultConditions: FilterConditions = {
  minVolume: 100, // 100억원
  maxVolume: 2000, // 2000억원
  minPrice: 1000,
  maxPrice: 200000,
  minMomentum: 30,
  maxMomentum: 100,
  minStrength: 100,
  maxStrength: 150,
  minMarketCap: 1000, // 1천억원
  maxMarketCap: 100000, // 10조원

  // 🆕 새로운 모멘텀 조건들의 기본값
  minLateSessionReturn: 0.5, // 후반부 최소 0.5% 상승
  maxLateSessionReturn: 3.0, // 후반부 최대 3% 상승
  minLateSessionVolumeRatio: 10, // 후반부 거래량 최소 10%
  maxLateSessionVolumeRatio: 25, // 후반부 거래량 최대 25%
  minRelativeReturn: 1.0, // 시장 대비 최소 1% 우수
  maxRelativeReturn: 5.0, // 시장 대비 최대 5% 우수
  minVwapRatio: 101, // VWAP 대비 최소 101%
  maxVwapRatio: 105 // VWAP 대비 최대 105%
};


const defaultPresets: TradingPreset[] = [
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'Safe picks with stable growth potential and low volatility',
    riskLevel: 'low',
    conditions: {
      minVolume: 200,
      maxVolume: 1000,
      minPrice: 5000,
      maxPrice: 100000,
      minMomentum: 40,
      maxMomentum: 70,
      minStrength: 110,
      maxStrength: 130,
      minMarketCap: 2000,
      maxMarketCap: 50000,
      // 보수적 설정 - 높은 임계값
      minLateSessionReturn: 1.0,
      maxLateSessionReturn: 2.5,
      minLateSessionVolumeRatio: 15,
      maxLateSessionVolumeRatio: 25,
      minRelativeReturn: 1.5,
      maxRelativeReturn: 4.0,
      minVwapRatio: 102,
      maxVwapRatio: 104
    },
    riskManagement: {
      earlyTakeProfit: 3,
      earlyStopLoss: -2,
      lateTakeProfit: 2,
      finalExitRange: 1
    }
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Moderate risk with good growth opportunities',
    riskLevel: 'medium',
    conditions: {
      minVolume: 100,
      maxVolume: 2000,
      minPrice: 1000,
      maxPrice: 200000,
      minMomentum: 30,
      maxMomentum: 100,
      minStrength: 100,
      maxStrength: 150,
      minMarketCap: 1000,
      maxMarketCap: 100000,
      // 균형형 설정 - strategy.md 기본값
      minLateSessionReturn: 0.5,
      maxLateSessionReturn: 3.0,
      minLateSessionVolumeRatio: 10,
      maxLateSessionVolumeRatio: 25,
      minRelativeReturn: 1.0,
      maxRelativeReturn: 5.0,
      minVwapRatio: 101,
      maxVwapRatio: 105
    },
    riskManagement: {
      earlyTakeProfit: 5,
      earlyStopLoss: -3,
      lateTakeProfit: 3,
      finalExitRange: 1.5
    }
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'High-risk, high-reward picks with strong momentum',
    riskLevel: 'high',
    conditions: {
      minVolume: 50,
      maxVolume: 3000,
      minPrice: 500,
      maxPrice: 300000,
      minMomentum: 60,
      maxMomentum: 100,
      minStrength: 80,
      maxStrength: 200,
      minMarketCap: 500,
      maxMarketCap: 200000,
      // 공격적 설정 - 낮은 임계값으로 더 많은 기회 포착
      minLateSessionReturn: 0.0,
      maxLateSessionReturn: 5.0,
      minLateSessionVolumeRatio: 5,
      maxLateSessionVolumeRatio: 30,
      minRelativeReturn: 0.5,
      maxRelativeReturn: 8.0,
      minVwapRatio: 100,
      maxVwapRatio: 110
    },
    riskManagement: {
      earlyTakeProfit: 8,
      earlyStopLoss: -5,
      lateTakeProfit: 5,
      finalExitRange: 3
    }
  }
];

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      defaultConditions,
      presets: defaultPresets,
      activePreset: 'balanced',

      riskManagement: {
        earlyTakeProfit: 5,
        earlyStopLoss: -3,
        lateTakeProfit: 3,
        finalExitRange: 1.5,
        maxPositions: 5
      },

      notifications: {
        email: true,
        buySignals: true,
        sellSignals: true,
        portfolioUpdates: true,
        systemStatus: true,
        pnlThreshold: 5
      },

      apiSettings: {
        appKey: '',
        appSecret: '',
        environment: 'sandbox',
        isConnected: false
      },

      schedule: {
        filteringTime: '15:30',
        monitoringStart: '16:00',
        monitoringEnd: '17:40',
        tradingStart: '09:00',
        tradingEnd: '15:30'
      },

      // Actions
      updateDefaultConditions: (conditions) =>
        set((state) => ({
          defaultConditions: { ...state.defaultConditions, ...conditions }
        })),


      updateRiskManagement: (settings) =>
        set((state) => ({
          riskManagement: { ...state.riskManagement, ...settings }
        })),

      updateNotifications: (settings) =>
        set((state) => ({
          notifications: { ...state.notifications, ...settings }
        })),

      updateAPISettings: (settings) =>
        set((state) => ({
          apiSettings: { ...state.apiSettings, ...settings }
        })),

      updateSchedule: (schedule) =>
        set((state) => ({
          schedule: { ...state.schedule, ...schedule }
        })),

      addPreset: (preset) =>
        set((state) => ({
          presets: [
            ...state.presets,
            { ...preset, id: `custom-${Date.now()}` }
          ]
        })),

      updatePreset: (id, preset) =>
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, ...preset } : p
          )
        })),

      deletePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
          activePreset: state.activePreset === id ? null : state.activePreset
        })),

      setActivePreset: (id) =>
        set({ activePreset: id }),

      loadPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id);
        if (preset) {
          set({
            defaultConditions: preset.conditions,
            riskManagement: {
              ...get().riskManagement,
              ...preset.riskManagement
            },
            activePreset: id
          });
        }
      },

      resetToDefaults: () =>
        set({
          defaultConditions,
          riskManagement: {
            earlyTakeProfit: 5,
            earlyStopLoss: -3,
            lateTakeProfit: 3,
            finalExitRange: 1.5,
            maxPositions: 5
          },
          activePreset: 'balanced'
        }),

      resetConditions: () =>
        set({
          defaultConditions
        })
    }),
    {
      name: 'trading-settings',
      partialize: (state) => ({
        defaultConditions: state.defaultConditions,
        presets: state.presets,
        activePreset: state.activePreset,
        riskManagement: state.riskManagement,
        notifications: state.notifications,
        schedule: state.schedule,
        // API settings은 보안상 저장하지 않음
      }),
    }
  )
);