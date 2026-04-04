import { create } from 'zustand';

/**
 * Signal Store — Client-side state management.
 * 
 * Tracks:
 * - Recent signals submitted in this session
 * - Current execution state (for live streaming)
 * - Connection status (online/offline/degraded)
 * - UI preferences
 */

interface SignalEntry {
  text: string;
  signal_id?: string;
  intent_type?: string;
  status?: string;
  timestamp: string;
  artifacts?: any[];
}

interface ExecutionState {
  signal_id: string | null;
  status: 'idle' | 'processing' | 'streaming' | 'completed' | 'failed';
  current_step?: string;
  steps_completed: number;
  steps_total: number;
  artifacts: any[];
  started_at?: number;
  duration_ms?: number;
}

interface ConnectionState {
  api: boolean;
  websocket: boolean;
  database: boolean;
}

interface UIPreferences {
  theme: 'dark' | 'light' | 'system';
  compactMode: boolean;
  showRawEvents: boolean;
  autoExpandArtifacts: boolean;
  feedbackReminder: boolean;
}

interface SignalStore {
  // Signal history
  signals: SignalEntry[];
  addSignal: (signal: SignalEntry) => void;
  clearSignals: () => void;

  // Execution state
  execution: ExecutionState;
  setCurrentExecution: (result: any) => void;
  updateExecutionStep: (stepId: string, status: string) => void;
  resetExecution: () => void;

  // Processing flag
  isProcessing: boolean;
  setProcessing: (v: boolean) => void;

  // Connection
  connection: ConnectionState;
  setConnection: (partial: Partial<ConnectionState>) => void;

  // Preferences
  preferences: UIPreferences;
  setPreference: <K extends keyof UIPreferences>(key: K, value: UIPreferences[K]) => void;

  // Session
  sessionId: string;
  signalCount: number;
}

const defaultExecution: ExecutionState = {
  signal_id: null,
  status: 'idle',
  steps_completed: 0,
  steps_total: 0,
  artifacts: [],
};

const defaultPreferences: UIPreferences = {
  theme: 'dark',
  compactMode: false,
  showRawEvents: false,
  autoExpandArtifacts: true,
  feedbackReminder: true,
};

export const useSignalStore = create<SignalStore>((set, get) => ({
  // Signals
  signals: [],
  addSignal: (signal) => set(state => ({
    signals: [signal, ...state.signals].slice(0, 100),
    signalCount: state.signalCount + 1,
  })),
  clearSignals: () => set({ signals: [], signalCount: 0 }),

  // Execution
  execution: { ...defaultExecution },
  setCurrentExecution: (result) => set({
    execution: {
      signal_id: result.signal_id,
      status: result.execution?.status === 'completed' ? 'completed' : 'processing',
      steps_completed: result.execution?.steps?.filter((s: any) => s.status === 'completed').length || 0,
      steps_total: result.execution?.steps?.length || 0,
      artifacts: result.artifacts || [],
      started_at: Date.now(),
    },
  }),
  updateExecutionStep: (stepId, status) => set(state => ({
    execution: {
      ...state.execution,
      current_step: stepId,
      steps_completed: status === 'completed' ? state.execution.steps_completed + 1 : state.execution.steps_completed,
    },
  })),
  resetExecution: () => set({ execution: { ...defaultExecution } }),

  // Processing
  isProcessing: false,
  setProcessing: (v) => set({ isProcessing: v }),

  // Connection
  connection: { api: true, websocket: false, database: true },
  setConnection: (partial) => set(state => ({
    connection: { ...state.connection, ...partial },
  })),

  // Preferences
  preferences: { ...defaultPreferences },
  setPreference: (key, value) => set(state => ({
    preferences: { ...state.preferences, [key]: value },
  })),

  // Session
  sessionId: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  signalCount: 0,
}));
