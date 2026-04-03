const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function submitSignal(text: string, metadata?: Record<string, any>) {
  const res = await fetch(`${API_URL}/api/signals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, ...metadata }),
  });
  return res.json();
}

export async function getSignals(limit = 20, offset = 0) {
  const res = await fetch(`${API_URL}/api/signals?limit=${limit}&offset=${offset}`);
  return res.json();
}

export async function getSignal(id: string) {
  const res = await fetch(`${API_URL}/api/signals/${id}`);
  return res.json();
}

export async function submitFeedback(data: {
  artifact_id: string;
  signal_id: string;
  action: string;
  modification?: any;
}) {
  const res = await fetch(`${API_URL}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getEvolutionStats() {
  const res = await fetch(`${API_URL}/api/evolution/stats`);
  return res.json();
}

export async function getSystemInfo() {
  const res = await fetch(`${API_URL}/api/system`);
  return res.json();
}
