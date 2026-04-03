import { config } from '../config';

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  // Use OpenAI Whisper API
  if (!config.ai.openaiApiKey) {
    console.warn('No OpenAI API key — returning placeholder transcription');
    return '[Audio signal received — transcription requires OPENAI_API_KEY]';
  }

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType });
  formData.append('file', blob, `audio.${mimeType.split('/')[1] || 'wav'}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'zh'); // Auto-detect in production

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.ai.openaiApiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Whisper API error:', err);
    return `[Audio transcription failed: ${response.status}]`;
  }

  const data = await response.json() as { text?: string };
  return data.text || '';
}
