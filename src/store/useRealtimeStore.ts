import { create } from 'zustand';

interface RealtimeState {
  isConnected: boolean;
  lastError: string | null;
  setConnected: (status: boolean) => void;
  setLastError: (error: string | null) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  isConnected: false,
  lastError: null,
  setConnected: (status) => set({ isConnected: status }),
  setLastError: (error) => set({ lastError: error }),
}));
