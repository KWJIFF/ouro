export type SignalModality = 'text' | 'voice' | 'image' | 'video' | 'sketch' | 'file' | 'composite';

export type SignalSourceType =
  | 'web' | 'mobile' | 'desktop' | 'wearable'
  | 'messaging' | 'api' | 'webhook' | 'voice_assistant'
  | 'passive' | 'hardware';

export interface SignalSource {
  type: SignalSourceType;
  platform?: string;
  method?: string;
  client_id?: string;
}

export interface SignalContext {
  timestamp: string;
  timezone?: string;
  device?: string;
  os?: string;
  session_id: string;
  preceding_signal_id?: string;
  location?: { lat: number; lng: number };
  battery_level?: number;
  connectivity?: string;
}

export interface FilePayload {
  filename: string;
  mime_type: string;
  size_bytes: number;
  buffer?: Buffer;
  url?: string;
}

export interface UniversalSignalInput {
  source: SignalSource;
  payload: {
    text?: string;
    files?: FilePayload[];
    urls?: string[];
    metadata?: Record<string, any>;
  };
  context: SignalContext;
}

export interface CapturedSignal {
  id: string;
  created_at: string;
  modality: SignalModality;
  raw_content: string | null;
  normalized_text: string;
  media_url: string | null;
  media_metadata: Record<string, any> | null;
  embedding: number[] | null;
  context: SignalContext;
  status: 'captured' | 'parsed' | 'executing' | 'completed' | 'failed';
}
