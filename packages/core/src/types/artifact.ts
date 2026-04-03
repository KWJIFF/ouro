export type ArtifactType = 'code' | 'image' | 'document' | 'website' | 'data' | 'design' | 'audio' | 'video' | 'other';

export interface Artifact {
  id: string;
  plan_id: string;
  signal_id: string;
  artifact_type: ArtifactType;
  title: string;
  description: string | null;
  content_url: string;
  preview_url: string | null;
  content_hash: string;
  metadata: Record<string, any>;
  version: number;
  parent_id: string | null;
  is_latest: boolean;
  created_at: string;
}
