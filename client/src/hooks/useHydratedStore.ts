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
    // Mark as hydrated when component mounts on client
    const unsubHydrate = useSettingsStore.persist.onHydrate(() => {
      setIsHydrated(false); // Set to false during hydration
    });

    const unsubFinishHydration = useSettingsStore.persist.onFinishHydration(() => {
      setIsHydrated(true); // Set to true when hydration is complete
    });

    // Trigger rehydration
    useSettingsStore.persist.rehydrate();

    return () => {
      unsubHydrate();
      unsubFinishHydration();
    };
  }, []);

  // During SSR and initial hydration, show loading or default state
  if (!isHydrated) {
    // Return a minimal safe state during hydration
    return {
      // Get the actual store state (which may be default) but ensure it's consistent
      ...store,
      isLoading: true, // Add a loading flag
    };
  }

  return {
    ...store,
    isLoading: false,
  };
}