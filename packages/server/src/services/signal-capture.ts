import { generateId, now } from '@ouro/core';
import type { UniversalSignalInput, CapturedSignal, SignalModality } from '@ouro/core';
import { query } from '../db/client';
import { embedText } from '../ai/llm-client';
import { analyzeImage, analyzeVideo } from '../ai/vision-client';
import { transcribeAudio } from '../ai/stt-client';
import { uploadFile } from '../storage/s3-client';

// ===== CONSTITUTIONAL RULE: Never reject any input =====

function detectModality(input: UniversalSignalInput): SignalModality {
  const { payload } = input;
  const has: Set<string> = new Set();

  if (payload.text?.trim()) has.add('text');
  for (const f of payload.files || []) {
    if (f.mime_type.startsWith('audio/')) has.add('voice');
    else if (f.mime_type.startsWith('image/')) has.add('image');
    else if (f.mime_type.startsWith('video/')) has.add('video');
    else has.add('file');
  }

  if (has.size > 1) return 'composite';
  if (has.has('voice')) return 'voice';
  if (has.has('image')) return 'image';
  if (has.has('video')) return 'video';
  if (has.has('file')) return 'file';
  return 'text';
}

async function processMultiModal(input: UniversalSignalInput): Promise<{
  normalizedText: string;
  mediaUrls: string[];
  mediaMetadata: Record<string, any>;
}> {
  const parts: string[] = [];
  const mediaUrls: string[] = [];
  const mediaMetadata: Record<string, any> = {};

  // Text
  if (input.payload.text?.trim()) {
    parts.push(input.payload.text.trim());
  }

  // URLs
  if (input.payload.urls?.length) {
    for (const url of input.payload.urls) {
      parts.push(`[Referenced URL: ${url}]`);
    }
  }

  // Process files in parallel
  if (input.payload.files?.length) {
    const fileResults = await Promise.allSettled(
      input.payload.files.map(async (file) => {
        // Upload to S3 regardless of type
        let url = '';
        if (file.buffer) {
          try {
            url = await uploadFile(file.buffer, file.filename, file.mime_type);
            mediaUrls.push(url);
          } catch (e) {
            console.warn(`File upload failed for ${file.filename}:`, e);
          }
        }

        // Process by type
        if (file.mime_type.startsWith('audio/') && file.buffer) {
          // Voice → Speech-to-Text
          const transcript = await transcribeAudio(file.buffer, file.mime_type);
          mediaMetadata[file.filename] = { type: 'audio', transcript, duration: null };
          return `[Voice: ${transcript}]`;
        }

        if (file.mime_type.startsWith('image/') && file.buffer) {
          // Image → Vision analysis
          const description = await analyzeImage(file.buffer, file.mime_type);
          mediaMetadata[file.filename] = { type: 'image', description, dimensions: null };
          return `[Image: ${description}]`;
        }

        if (file.mime_type.startsWith('video/') && file.buffer) {
          // Video → Frame extraction + analysis
          // For MVP: treat first frame as image, extract any audio
          const description = await analyzeImage(file.buffer.subarray(0, Math.min(file.buffer.length, 5000000)), 'image/jpeg',
            'This is a frame from a video. What is the video about?');
          mediaMetadata[file.filename] = { type: 'video', description };
          return `[Video: ${description}]`;
        }

        // Unknown/generic file — store and note
        mediaMetadata[file.filename] = { type: file.mime_type, size: file.size_bytes };
        return `[File: ${file.filename} (${file.mime_type}, ${file.size_bytes} bytes)]`;
      })
    );

    for (const result of fileResults) {
      if (result.status === 'fulfilled' && result.value) {
        parts.push(result.value);
      } else if (result.status === 'rejected') {
        parts.push(`[File processing failed: ${result.reason}]`);
      }
    }
  }

  return {
    normalizedText: parts.join('\n') || '[empty signal]',
    mediaUrls,
    mediaMetadata,
  };
}

export async function captureSignal(input: UniversalSignalInput): Promise<CapturedSignal> {
  const id = generateId();
  const modality = detectModality(input);

  // Process all modalities in parallel
  const { normalizedText, mediaUrls, mediaMetadata } = await processMultiModal(input);

  // Generate embedding
  let embedding: number[] | null = null;
  try {
    embedding = await embedText(normalizedText.slice(0, 8000)); // Limit for embedding
  } catch (e) {
    console.warn('Embedding generation failed:', e);
  }

  const signal: CapturedSignal = {
    id,
    created_at: now(),
    modality,
    raw_content: input.payload.text || '',
    normalized_text: normalizedText,
    file_urls: mediaUrls,
    embedding,
    context: input.context,
    status: 'captured',
  };

  const embeddingStr = embedding ? `[${embedding.join(',')}]` : null;
  await query(
    `INSERT INTO signals (id, created_at, modality, raw_content, normalized_text, media_url, media_metadata, embedding, context, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, $9, $10)`,
    [signal.id, signal.created_at, signal.modality, signal.raw_content, signal.normalized_text,
     mediaUrls[0] || null, JSON.stringify(mediaMetadata), embeddingStr, JSON.stringify(signal.context), signal.status]
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

export async function getRecentSignals(limit = 5): Promise<CapturedSignal[]> {
  const result = await query('SELECT * FROM signals ORDER BY created_at DESC LIMIT $1', [limit]);
  return result.rows;
}

export async function findSimilarSignals(embedding: number[], limit = 5): Promise<any[]> {
  const embStr = `[${embedding.join(',')}]`;
  const result = await query(
    `SELECT *, 1 - (embedding <=> $1::vector) as similarity
     FROM signals WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector LIMIT $2`,
    [embStr, limit]
  );
  return result.rows;
}
