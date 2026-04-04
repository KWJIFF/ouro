/**
 * Signal Types — Layer 1
 * 
 * A signal is the fundamental unit of human-to-system communication.
 * It is NOT an "input" or a "prompt." It is something a living system emits,
 * whether or not it intends to.
 */

export type SignalModality = 'text' | 'voice' | 'image' | 'video' | 'sketch' | 'file' | 'composite';

export type SignalStatus = 'captured' | 'parsed' | 'executing' | 'completed' | 'failed';

export interface FilePayload {
  filename: string;
  mime_type: string;
  size_bytes: number;
  buffer?: Buffer;
  url?: string;
  hash?: string;
}

export interface SignalSource {
  type: 'api' | 'websocket' | 'webhook' | 'messaging' | 'cli' | 'email' | 'desktop' | 'mobile';
  platform?: string;           // telegram, slack, discord, etc.
  version?: string;            // Client version
}

export interface SignalContext {
  timestamp: string;           // ISO 8601
  session_id: string;          // Groups related signals
  device?: string;             // Device identifier or user-agent
  locale?: string;             // User's locale (en-US, zh-CN, etc.)
  timezone?: string;           // User's timezone
  preceding_signal_id?: string; // Chain continuation
  modification_of?: string;    // If modifying a previous artifact
  location?: {                 // Geo context (if consented)
    latitude: number;
    longitude: number;
    accuracy_m: number;
  };
  app_context?: {              // What app the user was in when emitting
    app_name: string;
    active_document?: string;
    selected_text?: string;
  };
}

export interface UniversalSignalInput {
  source: SignalSource;
  payload: {
    text: string;
    files: FilePayload[];
    urls: string[];
    metadata: Record<string, any>;
  };
  context: SignalContext;
}

export interface CapturedSignal {
  id: string;
  created_at: string;
  modality: SignalModality;
  raw_content: string;           // Original unprocessed content
  normalized_text: string;       // Processed text (STT, OCR, etc. applied)
  embedding: number[] | null;    // Vector embedding for semantic search
  file_urls: string[];           // Uploaded file references
  context: SignalContext;
  status: SignalStatus;
  processing_metrics?: {
    capture_latency_ms: number;
    normalization_latency_ms: number;
    embedding_latency_ms: number;
    total_latency_ms: number;
  };
}
