import { getMany } from '../db/client';
import { embedText } from '../ai/llm-client';

export interface SearchResult {
  id: string;
  text: string;
  modality: string;
  similarity: number;
  created_at: string;
  status: string;
}

export async function semanticSearch(queryText: string, limit: number = 10): Promise<SearchResult[]> {
  const embedding = await embedText(queryText);
  const embStr = `[${embedding.join(',')}]`;

  const results = await getMany<any>(
    `SELECT id, normalized_text, modality, status, created_at,
            1 - (embedding <=> $1::vector) as similarity
     FROM signals
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [embStr, limit]
  );

  return results.map((r: any) => ({
    id: r.id,
    text: r.normalized_text,
    modality: r.modality,
    similarity: r.similarity,
    created_at: r.created_at,
    status: r.status,
  }));
}

export async function findRelatedArtifacts(queryText: string, limit: number = 5): Promise<any[]> {
  const embedding = await embedText(queryText);
  const embStr = `[${embedding.join(',')}]`;

  return getMany(
    `SELECT id, artifact_type, title, description, metadata, created_at,
            1 - (embedding <=> $1::vector) as similarity
     FROM artifacts
     WHERE embedding IS NOT NULL AND is_latest = TRUE
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [embStr, limit]
  );
}
