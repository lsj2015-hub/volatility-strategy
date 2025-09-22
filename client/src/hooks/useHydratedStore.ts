import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settings';

/**
 * Custom hook to handle Zustand store hydration
 * Prevents SSR hydration mismatches by waiting for client-side hydration
 */
export function useHydratedSettingsStore() {
  const [isHydrated, setIsHydrated] = useState(false);
  const store = useSettingsStore();

  useEffect(() => {
    // Trigger hydration on client side
    useSettingsStore.persist.rehydrate();
    setIsHydrated(true);
  }, []);

  // Return default values during SSR, actual store values after hydration
  if (!isHydrated) {
    return {
      ...store,
      // Provide default values that match the initial store state
      defaultConditions: {
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
      schedule: {
        filteringTime: '15:30',
        monitoringStart: '16:00',
        monitoringEnd: '17:40',
        tradingStart: '09:00',
        tradingEnd: '15:30'
      },
      activePreset: store.activePreset
    };
  }

  return store;
}