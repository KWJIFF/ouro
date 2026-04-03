const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// === Signals ===
export async function submitSignal(text: string, files?: File[]) {
  if (files?.length) {
    const form = new FormData();
    form.append('text', text);
    files.forEach(f => form.append('files', f));
    const r = await fetch(`${API}/api/signals`, { method: 'POST', body: form });
    return r.json();
  }
  return (await fetch(`${API}/api/signals`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
  })).json();
}

export async function submitSignalBlob(text: string, blob: Blob, filename: string) {
  const form = new FormData();
  if (text) form.append('text', text);
  form.append('files', blob, filename);
  const r = await fetch(`${API}/api/signals`, { method: 'POST', body: form });
  return r.json();
}

export const getSignals = (limit = 20, offset = 0) => fetch(`${API}/api/signals?limit=${limit}&offset=${offset}`).then(r => r.json());
export const getSignal = (id: string) => fetch(`${API}/api/signals/${id}`).then(r => r.json());
export const clarifySignal = (id: string, answer: string) => fetch(`${API}/api/signals/${id}/clarify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer }) }).then(r => r.json());
export const getSimilarSignals = (id: string) => fetch(`${API}/api/signals/${id}/similar`).then(r => r.json());

// === Artifacts ===
export const getArtifact = (id: string) => fetch(`${API}/api/artifacts/${id}`).then(r => r.json());
export const getArtifactVersions = (id: string) => fetch(`${API}/api/artifacts/${id}/versions`).then(r => r.json());

// === Feedback ===
export const submitFeedback = (data: Record<string, any>) => fetch(`${API}/api/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());

// === Graph & Search ===
export const getIdeaGraph = (rootId?: string) => fetch(`${API}/api/graph${rootId ? `?root=${rootId}` : ''}`).then(r => r.json());
export const semanticSearch = (q: string, limit = 10) => fetch(`${API}/api/search?q=${encodeURIComponent(q)}&limit=${limit}`).then(r => r.json());
export const searchArtifacts = (q: string) => fetch(`${API}/api/search/artifacts?q=${encodeURIComponent(q)}`).then(r => r.json());

// === Evolution ===
export const getEvolutionStats = () => fetch(`${API}/api/evolution/stats`).then(r => r.json());
export const getEvolutionLog = (limit = 20) => fetch(`${API}/api/evolution/log?limit=${limit}`).then(r => r.json());
export const triggerEvolution = () => fetch(`${API}/api/evolution/trigger`, { method: 'POST' }).then(r => r.json());

// === Tools ===
export const getTools = () => fetch(`${API}/api/tools`).then(r => r.json());
export const registerTool = (url: string) => fetch(`${API}/api/tools/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }).then(r => r.json());
export const generateToolFromDesc = (capability: string) => fetch(`${API}/api/tools/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ capability }) }).then(r => r.json());

// === System ===
export const getSystemInfo = () => fetch(`${API}/api/system`).then(r => r.json());
