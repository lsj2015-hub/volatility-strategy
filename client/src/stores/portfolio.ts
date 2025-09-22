/**
 * Portfolio Store - 포트폴리오 상태 관리
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FilteredStock } from '@/types/trading';

interface PortfolioState {
  selectedStocks: FilteredStock[];
  setSelectedStocks: (stocks: FilteredStock[]) => void;
  clearSelectedStocks: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      selectedStocks: [],

      setSelectedStocks: (stocks: FilteredStock[]) => {
        console.log('Portfolio store: Setting selected stocks:', stocks.length);
        set({ selectedStocks: stocks });
      },

      clearSelectedStocks: () => {
        console.log('Portfolio store: Clearing selected stocks');
        set({ selectedStocks: [] });
      },
    }),
    {
      name: 'portfolio-storage', // localStorage key
      partialize: (state) => ({
        selectedStocks: state.selectedStocks,
      }),
    }
  )
);