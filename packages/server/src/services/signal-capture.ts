import { generateId, now } from '@ouro/core';
import type { UniversalSignalInput, CapturedSignal, SignalModality } from '@ouro/core';
import { query } from '../db/client';
import { embedText } from '../ai/llm-client';

function detectModality(input: UniversalSignalInput): SignalModality {
  const { payload } = input;
  const modalities: SignalModality[] = [];

  if (payload.text) modalities.push('text');
  if (payload.files?.some(f => f.mime_type.startsWith('audio/'))) modalities.push('voice');
  if (payload.files?.some(f => f.mime_type.startsWith('image/'))) modalities.push('image');
  if (payload.files?.some(f => f.mime_type.startsWith('video/'))) modalities.push('video');
  if (payload.files?.some(f => !f.mime_type.startsWith('audio/') && !f.mime_type.startsWith('image/') && !f.mime_type.startsWith('video/'))) modalities.push('file');

  if (modalities.length > 1) return 'composite';
  return modalities[0] || 'text';
}

function extractText(input: UniversalSignalInput): string {
  const parts: string[] = [];
  if (input.payload.text) parts.push(input.payload.text);
  if (input.payload.urls) parts.push(...input.payload.urls.map(u => `[URL: ${u}]`));
  if (input.payload.files) parts.push(...input.payload.files.map(f => `[File: ${f.filename} (${f.mime_type})]`));
  return parts.join('\n') || '[empty signal]';
}

export async function captureSignal(input: UniversalSignalInput): Promise<CapturedSignal> {
  const id = generateId();
  const modality = detectModality(input);
  const rawContent = extractText(input);
  const normalizedText = rawContent.trim();

  // Generate embedding for semantic search
  let embedding: number[] | null = null;
  try {
    embedding = await embedText(normalizedText);
  } catch (e) {
    console.warn('Embedding generation failed, continuing without:', e);
  }

  const signal: CapturedSignal = {
    id,
    created_at: now(),
    modality,
    raw_content: rawContent,
    normalized_text: normalizedText,
    media_url: null, // TODO: upload files to S3
    media_metadata: null,
    embedding,
    context: input.context,
    status: 'captured',
  };

  // Store in database — never reject any signal
  const embeddingStr = embedding ? `[${embedding.join(',')}]` : null;
  await query(
    `INSERT INTO signals (id, created_at, modality, raw_content, normalized_text, embedding, context, status)
     VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8)`,
    [signal.id, signal.created_at, signal.modality, signal.raw_content, signal.normalized_text, embeddingStr, JSON.stringify(signal.context), signal.status]
  );

  return signal;
}

export async function updateSignalStatus(id: string, status: CapturedSignal['status']): Promise<void> {
  await query('UPDATE signals SET status = $1 WHERE id = $2', [status, id]);
}

export async function getSignal(id: string): Promise<CapturedSignal | null> {
  const result = await query('SELECT * FROM signals WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getRecentSignals(limit: number = 5): Promise<CapturedSignal[]> {
  const result = await query('SELECT * FROM signals ORDER BY created_at DESC LIMIT $1', [limit]);
  return result.rows;
}
