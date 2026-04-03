import { create } from 'zustand';

interface SignalState {
  signals: any[];
  currentExecution: any | null;
  isProcessing: boolean;
  setSignals: (signals: any[]) => void;
  addSignal: (signal: any) => void;
  setCurrentExecution: (exec: any) => void;
  setProcessing: (v: boolean) => void;
}

export const useSignalStore = create<SignalState>((set) => ({
  signals: [],
  currentExecution: null,
  isProcessing: false,
  setSignals: (signals) => set({ signals }),
  addSignal: (signal) => set((s) => ({ signals: [signal, ...s.signals] })),
  setCurrentExecution: (exec) => set({ currentExecution: exec }),
  setProcessing: (v) => set({ isProcessing: v }),
}));
