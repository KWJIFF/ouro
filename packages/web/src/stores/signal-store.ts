import { create } from 'zustand';

/**
 * Signal Store — Central state management for Ouro frontend.
 * 
 * Manages:
 * - Signal submission state
 * - Execution status tracking
 * - Artifact display
 * - Feedback tracking
 * - WebSocket connection state
 * - Offline queue
 * - User preferences
 */

interface Signal {
  id?: string;
  text: string;
  modality?: string;
  status?: string;
  intent?: { type: string; confidence: number; description: string };
  artifacts?: Array<{
    id: string;
    type: string;
    content: string;
    metadata: Record<string, any>;
    version: number;
  }>;
  execution?: {
    planId: string;
    status: string;
    steps: Array<{ id: string; tool: string; status: string }>;
    durationMs?: number;
  };
  createdAt: string;
}

interface ExecutionEvent {
  type: string;
  data: any;
  timestamp: string;
}

interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  language: string;
  showExecutionDetails: boolean;
  autoExpandArtifacts: boolean;
  notificationsEnabled: boolean;
  feedbackReminders: boolean;
}

interface SignalState {
  // Signals
  signals: Signal[];
  currentSignal: Signal | null;
  isProcessing: boolean;

  // Execution
  currentExecution: any | null;
  executionEvents: ExecutionEvent[];

  // Connection
  isConnected: boolean;
  isOnline: boolean;

  // Offline queue
  offlineQueue: Array<{ text: string; timestamp: string }>;

  // Preferences
  preferences: UserPreferences;

  // Stats
  totalSignals: number;
  totalArtifacts: number;

  // Actions
  addSignal: (signal: Partial<Signal>) => void;
  setProcessing: (processing: boolean) => void;
  setCurrentExecution: (execution: any) => void;
  addExecutionEvent: (event: ExecutionEvent) => void;
  clearExecutionEvents: () => void;
  setConnected: (connected: boolean) => void;
  setOnline: (online: boolean) => void;
  addToOfflineQueue: (text: string) => void;
  removeFromOfflineQueue: (index: number) => void;
  clearOfflineQueue: () => void;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  updateStats: (signals: number, artifacts: number) => void;
  reset: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  language: 'en',
  showExecutionDetails: true,
  autoExpandArtifacts: true,
  notificationsEnabled: true,
  feedbackReminders: true,
};

export const useSignalStore = create<SignalState>((set, get) => ({
  // Initial state
  signals: [],
  currentSignal: null,
  isProcessing: false,
  currentExecution: null,
  executionEvents: [],
  isConnected: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  offlineQueue: [],
  preferences: defaultPreferences,
  totalSignals: 0,
  totalArtifacts: 0,

  // Actions
  addSignal: (signal) => set((state) => ({
    signals: [
      { text: signal.text || '', createdAt: new Date().toISOString(), ...signal },
      ...state.signals,
    ].slice(0, 100), // Keep last 100 in memory
    currentSignal: { text: signal.text || '', createdAt: new Date().toISOString(), ...signal },
    totalSignals: state.totalSignals + 1,
  })),

  setProcessing: (processing) => set({ isProcessing: processing }),

  setCurrentExecution: (execution) => set({
    currentExecution: execution,
    totalArtifacts: execution?.artifacts?.length
      ? get().totalArtifacts + execution.artifacts.length
      : get().totalArtifacts,
  }),

  addExecutionEvent: (event) => set((state) => ({
    executionEvents: [...state.executionEvents, event].slice(-200), // Keep last 200
  })),

  clearExecutionEvents: () => set({ executionEvents: [] }),

  setConnected: (connected) => set({ isConnected: connected }),

  setOnline: (online) => set({ isOnline: online }),

  addToOfflineQueue: (text) => set((state) => ({
    offlineQueue: [...state.offlineQueue, { text, timestamp: new Date().toISOString() }],
  })),

  removeFromOfflineQueue: (index) => set((state) => ({
    offlineQueue: state.offlineQueue.filter((_, i) => i !== index),
  })),

  clearOfflineQueue: () => set({ offlineQueue: [] }),

  setPreference: (key, value) => set((state) => ({
    preferences: { ...state.preferences, [key]: value },
  })),

  updateStats: (signals, artifacts) => set({ totalSignals: signals, totalArtifacts: artifacts }),

  reset: () => set({
    signals: [],
    currentSignal: null,
    isProcessing: false,
    currentExecution: null,
    executionEvents: [],
    offlineQueue: [],
    totalSignals: 0,
    totalArtifacts: 0,
  }),
}));
