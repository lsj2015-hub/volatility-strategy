import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TradingModeData } from '@/types'
import { apiClient } from '@/lib/api/client'

interface TradingModeStore {
  // State
  mode: TradingModeData | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchMode: () => Promise<void>
  switchMode: (isMock: boolean) => Promise<void>
  clearError: () => void
}

export const useTradingModeStore = create<TradingModeStore>()(
  persist(
    (set, get) => ({
      // Initial state
      mode: null,
      isLoading: false,
      error: null,

      // Fetch current trading mode from backend
      fetchMode: async () => {
        set({ isLoading: true, error: null })

        try {
          const result = await apiClient.get<TradingModeData>('/api/trading-mode/status')

          if (result.success) {
            set({ mode: result.data, isLoading: false })
          } else {
            throw new Error(result.message || 'Failed to fetch trading mode')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          set({ error: errorMessage, isLoading: false })
          console.error('Failed to fetch trading mode:', error)
        }
      },

      // Switch between mock and real trading mode
      switchMode: async (isMock: boolean) => {
        const currentState = get()

        // 이미 로딩 중이거나 같은 모드라면 요청하지 않음
        if (currentState.isLoading) {
          console.log('Trading mode switch already in progress, skipping')
          return
        }

        if (currentState.mode?.is_mock_trading === isMock) {
          console.log('Trading mode unchanged, skipping request')
          return
        }

        set({ isLoading: true, error: null })

        try {
          const result = await apiClient.post<TradingModeData>('/api/trading-mode/change', {
            is_mock: isMock,
          })

          if (result.success) {
            set({ mode: result.data, isLoading: false })
          } else {
            throw new Error(result.message || 'Failed to switch trading mode')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          set({ error: errorMessage, isLoading: false })
          console.error('Failed to switch trading mode:', error)
        }
      },

      // Clear error state
      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'trading-mode-storage',
      partialize: (state) => ({ mode: state.mode }), // Only persist the mode data
    }
  )
)