/**
 * Artifact Types — Layer 4
 * 
 * An artifact is any output the system produces.
 * Artifacts are versioned, deduplicated, and embedded for search.
 */

export type ArtifactType = 'code' | 'document' | 'image' | 'website' | 'data' | 'design' | 'other';

export interface Artifact {
  id: string;
  plan_id: string;
  signal_id: string;
  artifact_type: ArtifactType;
  title: string;
  description: string;
  content_url: string;          // S3/MinIO URL or inline reference
  preview_url: string | null;   // Thumbnail or preview
  content_hash: string;         // SHA-256 for dedup
  metadata: Record<string, any>;
  version: number;
  parent_id: string | null;     // Previous version
  is_latest: boolean;
  embedding?: number[] | null;
  created_at: string;
}

export type FeedbackAction = 'accept' | 'modify' | 'reject' | 'fork' | 'share' | 'revisit';

export interface Feedback {
  id: string;
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
  satisfaction_score?: number;  // Inferred from behavioral signals
  created_at: string;
}
