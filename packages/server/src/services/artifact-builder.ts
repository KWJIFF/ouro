import { generateId, now } from '@ouro/core';
import type { Artifact, ArtifactType, ExecutionPlan } from '@ouro/core';
import { query, getMany, getOne } from '../db/client';
import { uploadArtifact } from '../storage/s3-client';
import { embedText } from '../ai/llm-client';
import * as crypto from 'crypto';

function inferArtifactType(metadata: Record<string, any>): ArtifactType {
  const type = metadata?.type?.toLowerCase() || '';
  if (['code', 'script', 'component', 'api'].some(t => type.includes(t))) return 'code';
  if (['image', 'photo', 'illustration', 'diagram'].some(t => type.includes(t))) return 'image';
  if (['document', 'article', 'report', 'markdown', 'essay'].some(t => type.includes(t))) return 'document';
  if (['website', 'page', 'html', 'landing'].some(t => type.includes(t))) return 'website';
  if (['data', 'csv', 'json', 'analysis', 'chart'].some(t => type.includes(t))) return 'data';
  if (['design', 'mockup', 'wireframe', 'ui'].some(t => type.includes(t))) return 'design';
  return 'other';
}

export async function buildArtifacts(
  plan: ExecutionPlan,
  signalId: string,
  intentDescription: string,
): Promise<Artifact[]> {
  const artifacts: Artifact[] = [];

  for (const step of plan.steps) {
    if (step.status !== 'completed' || !step.output?.artifacts) continue;

    for (const raw of step.output.artifacts) {
      const content = typeof raw.content === 'string' ? raw.content : JSON.stringify(raw.content, null, 2);
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      // Check for duplicate (same hash = same content)
      const existing = await getOne<Artifact>(
        'SELECT * FROM artifacts WHERE content_hash = $1 AND signal_id = $2',
        [hash, signalId]
      );
      if (existing) continue;

      // Check for previous version (same signal, same type)
      const artifactType = inferArtifactType(raw.metadata || {});
      const previousVersion = await getOne<Artifact>(
        'SELECT * FROM artifacts WHERE signal_id = $1 AND artifact_type = $2 AND is_latest = TRUE ORDER BY version DESC',
        [signalId, artifactType]
      );

      // Upload content to storage
      let contentUrl = '';
      try {
        const buffer = Buffer.from(content, 'utf-8');
        const ext = artifactType === 'code' ? '.txt' : artifactType === 'document' ? '.md' : '.txt';
        contentUrl = await uploadArtifact(buffer, `artifact${ext}`, 'text/plain');
      } catch (e) {
        contentUrl = `inline://${hash.slice(0, 16)}`;
      }

      // Generate embedding for artifact search
      let embedding: number[] | null = null;
      try {
        embedding = await embedText(content.slice(0, 4000));
      } catch { /* non-critical */ }

      const artifact: Artifact = {
        id: generateId(),
        plan_id: plan.id,
        signal_id: signalId,
        artifact_type: artifactType,
        title: intentDescription.slice(0, 100),
        description: intentDescription,
        content_url: contentUrl,
        preview_url: null,
        content_hash: hash,
        metadata: {
          ...raw.metadata,
          inline_content: content, // Store inline for quick access
          tool: step.tool,
          step_id: step.id,
        },
        version: previousVersion ? previousVersion.version + 1 : 1,
        parent_id: previousVersion?.id || null,
        is_latest: true,
        created_at: now(),
      };

      // Mark previous version as not latest
      if (previousVersion) {
        await query('UPDATE artifacts SET is_latest = FALSE WHERE id = $1', [previousVersion.id]);
      }

      const embStr = embedding ? `[${embedding.join(',')}]` : null;
      await query(
        `INSERT INTO artifacts (id, plan_id, signal_id, artifact_type, title, description, content_url, preview_url, content_hash, metadata, version, parent_id, is_latest, embedding, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::vector, $15)`,
        [artifact.id, artifact.plan_id, artifact.signal_id, artifact.artifact_type, artifact.title,
         artifact.description, artifact.content_url, artifact.preview_url, artifact.content_hash,
         JSON.stringify(artifact.metadata), artifact.version, artifact.parent_id, artifact.is_latest,
         embStr, artifact.created_at]
      );

      artifacts.push(artifact);
    }
  }

  return artifacts;
}

export async function getArtifact(id: string): Promise<Artifact | null> {
  return getOne<Artifact>('SELECT * FROM artifacts WHERE id = $1', [id]);
}

export async function getArtifactVersions(signalId: string, artifactType?: string): Promise<Artifact[]> {
  let sql = 'SELECT * FROM artifacts WHERE signal_id = $1';
  const params: any[] = [signalId];
  if (artifactType) {
    params.push(artifactType);
    sql += ` AND artifact_type = $${params.length}`;
  }
  sql += ' ORDER BY version DESC';
  return getMany<Artifact>(sql, params);
}

export async function getLatestArtifacts(signalId: string): Promise<Artifact[]> {
  return getMany<Artifact>(
    'SELECT * FROM artifacts WHERE signal_id = $1 AND is_latest = TRUE ORDER BY created_at',
    [signalId]
  );
}
