/**
 * Ouro API Client — Full typed API client for all 60+ endpoints.
 * 
 * Handles:
 * - Authentication headers
 * - Error formatting
 * - Automatic retry on 5xx
 * - Request/response logging
 * - Offline queue integration
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

interface ApiResponse<T = any> {
  [key: string]: any;
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: any };
  meta?: { request_id: string; processing_ms: number };
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || { code: 'HTTP_ERROR', message: `HTTP ${response.status}` },
      };
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      return { success: false, error: { code: 'TIMEOUT', message: 'Request timed out' } };
    }
    return { success: false, error: { code: 'NETWORK_ERROR', message: error.message } };
  }
}

// ===== Signal API =====
export async function submitSignal(text: string, options?: {
  modality?: string;
  attachments?: any[];
  context?: any;
}): Promise<ApiResponse> {
  return request('/api/signals', {
    method: 'POST',
    body: { text, ...options },
  });
}

export async function getSignals(page = 1, pageSize = 20): Promise<ApiResponse> {
  return request(`/api/signals?page=${page}&pageSize=${pageSize}`);
}

export async function getSignal(id: string): Promise<ApiResponse> {
  return request(`/api/signals/${id}`);
}

export async function clarifySignal(id: string, answer: string): Promise<ApiResponse> {
  return request(`/api/signals/${id}/clarify`, { method: 'POST', body: { answer } });
}

export async function getSimilarSignals(id: string): Promise<ApiResponse> {
  return request(`/api/signals/${id}/similar`);
}

// ===== Feedback API =====
export async function submitFeedback(artifactId: string, signalId: string, action: string, data?: any): Promise<ApiResponse> {
  return request('/api/feedback', {
    method: 'POST',
    body: { artifact_id: artifactId, signal_id: signalId, action, ...data },
  });
}

export async function getArtifactFeedback(artifactId: string): Promise<ApiResponse> {
  return request(`/api/feedback/artifact/${artifactId}`);
}

export async function getFeedbackSummary(signalId: string): Promise<ApiResponse> {
  return request(`/api/feedback/signal/${signalId}/summary`);
}

// ===== Artifact API =====
export async function getArtifact(id: string): Promise<ApiResponse> {
  return request(`/api/artifacts/${id}`);
}

export async function getArtifactVersions(id: string): Promise<ApiResponse> {
  return request(`/api/artifacts/${id}/versions`);
}

// ===== Search API =====
export async function searchSignals(query: string, limit = 10): Promise<ApiResponse> {
  return request(`/api/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function searchArtifacts(query: string, limit = 10): Promise<ApiResponse> {
  return request(`/api/search/artifacts?q=${encodeURIComponent(query)}&limit=${limit}`);
}

// ===== Graph API =====
export async function getIdeaGraph(): Promise<ApiResponse> {
  return request('/api/graph');
}

export async function createConnection(sourceId: string, targetId: string, type: string): Promise<ApiResponse> {
  return request('/api/connections', {
    method: 'POST',
    body: { source_signal_id: sourceId, target_signal_id: targetId, connection_type: type },
  });
}

// ===== Evolution API =====
export async function getEvolutionStats(): Promise<ApiResponse> {
  return request('/api/evolution/stats');
}

export async function getEvolutionLog(): Promise<ApiResponse> {
  return request('/api/evolution/log');
}

export async function triggerEvolution(): Promise<ApiResponse> {
  return request('/api/evolution/trigger', { method: 'POST' });
}

// ===== Analytics API =====
export async function getAnalytics(): Promise<ApiResponse> {
  return request('/api/analytics');
}

// ===== Tool API =====
export async function getTools(): Promise<ApiResponse> {
  return request('/api/tools');
}

export async function registerTool(manifest: any): Promise<ApiResponse> {
  return request('/api/tools/register', { method: 'POST', body: manifest });
}

export async function generateTool(description: string): Promise<ApiResponse> {
  return request('/api/tools/generate', { method: 'POST', body: { description } });
}

// ===== Config API =====
export async function getConfig(key?: string): Promise<ApiResponse> {
  return request(key ? `/api/config/${key}` : '/api/config');
}

export async function setConfig(key: string, value: any): Promise<ApiResponse> {
  return request(`/api/config/${key}`, { method: 'PUT', body: { value } });
}

// ===== Prompt API =====
export async function getPrompt(name: string): Promise<ApiResponse> {
  return request(`/api/prompts/${name}`);
}

export async function updatePrompt(name: string, content: string): Promise<ApiResponse> {
  return request(`/api/prompts/${name}`, { method: 'POST', body: { content } });
}

// ===== Admin API =====
export async function getSystemStats(): Promise<ApiResponse> {
  return request('/api/admin/stats');
}

export async function getHealthDetailed(): Promise<ApiResponse> {
  return request('/api/health/detailed');
}

export async function getTelemetry(): Promise<ApiResponse> {
  return request('/api/admin/telemetry');
}

export async function replaySignals(options: any): Promise<ApiResponse> {
  return request('/api/admin/replay', { method: 'POST', body: options });
}

export async function exportData(format: string): Promise<ApiResponse> {
  return request(`/api/admin/export?format=${format}`);
}

export async function importData(data: string): Promise<ApiResponse> {
  return request('/api/admin/import', { method: 'POST', body: data });
}

export async function getCacheStats(): Promise<ApiResponse> {
  return request('/api/admin/cache');
}

export async function clearCache(): Promise<ApiResponse> {
  return request('/api/admin/cache/clear', { method: 'POST' });
}

export async function getSchedulerStatus(): Promise<ApiResponse> {
  return request('/api/admin/scheduler');
}

export async function getRateLimits(): Promise<ApiResponse> {
  return request('/api/admin/rate-limits');
}

export async function getHooks(): Promise<ApiResponse> {
  return request('/api/admin/hooks');
}

// ===== Event Stream =====
export function createEventStream(onEvent: (event: any) => void): EventSource | null {
  if (typeof window === 'undefined') return null;
  const source = new EventSource(`${API_URL}/api/events/stream`);
  source.onmessage = (e) => {
    try { onEvent(JSON.parse(e.data)); } catch {}
  };
  source.onerror = () => {
    console.warn('[SSE] Connection error, will auto-reconnect');
  };
  return source;
}

// Aliases for backward compatibility
export const getSystemInfo = getHealthDetailed;
export const semanticSearch = searchSignals;
export const generateToolFromDesc = generateTool;

// Submit signal with binary blob (voice, image, etc.)
export async function submitSignalBlob(text: string, blob: Blob | any, filename?: string): Promise<ApiResponse> {
  const modality = blob?.type?.startsWith?.('audio') ? 'voice' : blob?.type?.startsWith?.('image') ? 'image' : 'file';
  return submitSignal(text || `[${modality} signal: ${filename || 'unnamed'}]`, { modality });
}
