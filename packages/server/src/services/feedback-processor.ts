import { generateId, now } from '@ouro/core';
import type { Feedback, FeedbackAction } from '@ouro/core';
import { query, getMany, getOne } from '../db/client';
import { callAI } from '../ai/llm-client';

export interface FeedbackInput {
  artifact_id: string;
  signal_id: string;
  action: FeedbackAction;
  modification?: {
    type: 'inline_edit' | 'instruction' | 'regenerate' | 'partial_accept';
    changes?: Array<{ location: string; before: string; after: string }>;
    instruction?: string;
  };
  time_to_react_ms?: number;
  view_duration_ms?: number;
  scroll_depth?: number;
}

export async function processFeedback(input: FeedbackInput): Promise<Feedback> {
  // Infer satisfaction score from behavioral signals
  const satisfactionScore = inferSatisfaction(input);

  const feedback: Feedback = {
    id: generateId(),
    artifact_id: input.artifact_id,
    signal_id: input.signal_id,
    action: input.action,
    modification: input.modification,
    time_to_react_ms: input.time_to_react_ms,
    view_duration_ms: input.view_duration_ms,
    scroll_depth: input.scroll_depth,
    satisfaction_score: satisfactionScore,
    created_at: now(),
  };

  await query(
    `INSERT INTO feedback (id, artifact_id, signal_id, action, modification, time_to_react_ms, view_duration_ms, scroll_depth, satisfaction_score, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [feedback.id, feedback.artifact_id, feedback.signal_id, feedback.action,
     JSON.stringify(feedback.modification), feedback.time_to_react_ms,
     feedback.view_duration_ms, feedback.scroll_depth, feedback.satisfaction_score, feedback.created_at]
  );

  // If action is 'modify' with instruction, trigger re-execution
  if (input.action === 'modify' && input.modification?.instruction) {
    await handleModificationRequest(input.signal_id, input.artifact_id, input.modification.instruction);
  }

  return feedback;
}

function inferSatisfaction(input: FeedbackInput): number {
  let score = 0.5; // Baseline

  // Action-based signals
  switch (input.action) {
    case 'accept': score += 0.3; break;
    case 'share': score += 0.4; break;
    case 'modify': score += 0.0; break; // Neutral — they engaged but weren't fully satisfied
    case 'reject': score -= 0.3; break;
    case 'fork': score += 0.1; break; // Interested enough to branch
    case 'revisit': score += 0.15; break; // Came back — good sign
  }

  // Temporal signals
  if (input.time_to_react_ms !== undefined) {
    // Fast acceptance = high confidence
    if (input.action === 'accept' && input.time_to_react_ms < 5000) score += 0.1;
    // Slow rejection = they considered it carefully
    if (input.action === 'reject' && input.time_to_react_ms > 30000) score += 0.05;
  }

  if (input.view_duration_ms !== undefined) {
    // Longer view for accepted artifacts = thorough review = higher quality
    if (input.action === 'accept' && input.view_duration_ms > 10000) score += 0.05;
  }

  if (input.scroll_depth !== undefined) {
    // Full scroll = they read everything
    if (input.scroll_depth > 0.9) score += 0.05;
  }

  return Math.max(0, Math.min(1, score));
}

async function handleModificationRequest(signalId: string, artifactId: string, instruction: string): Promise<void> {
  // This creates a new signal that references the original, creating a modification chain.
  // The actual re-execution is handled by the signal pipeline.
  await query(
    `INSERT INTO signals (id, created_at, modality, raw_content, normalized_text, context, status)
     VALUES ($1, NOW(), 'text', $2, $2, $3, 'captured')`,
    [
      generateId(),
      `[Modification of artifact ${artifactId}]: ${instruction}`,
      JSON.stringify({ preceding_signal_id: signalId, modification_of: artifactId, session_id: generateId() }),
    ]
  );
}

export async function getArtifactFeedback(artifactId: string): Promise<Feedback[]> {
  return getMany<Feedback>(
    'SELECT * FROM feedback WHERE artifact_id = $1 ORDER BY created_at',
    [artifactId]
  );
}

export async function getSignalFeedbackSummary(signalId: string): Promise<{
  total: number;
  accepts: number;
  modifies: number;
  rejects: number;
  avgSatisfaction: number;
}> {
  const result = await getOne<any>(
    `SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE action = 'accept') as accepts,
            COUNT(*) FILTER (WHERE action = 'modify') as modifies,
            COUNT(*) FILTER (WHERE action = 'reject') as rejects,
            AVG(satisfaction_score) as avg_satisfaction
     FROM feedback WHERE signal_id = $1`,
    [signalId]
  );
  return {
    total: parseInt(result?.total || '0'),
    accepts: parseInt(result?.accepts || '0'),
    modifies: parseInt(result?.modifies || '0'),
    rejects: parseInt(result?.rejects || '0'),
    avgSatisfaction: parseFloat(result?.avg_satisfaction || '0'),
  };
}
