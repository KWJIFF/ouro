'use client';
import { useState, useEffect } from 'react';
import { getArtifactVersions } from '@/lib/api-client';
import { Clock, GitBranch, ChevronRight } from 'lucide-react';

interface Version {
  id: string;
  version: number;
  artifact_type: string;
  title: string;
  is_latest: boolean;
  created_at: string;
  metadata: any;
}

export default function VersionTimeline({ artifactId, onVersionSelect }: {
  artifactId: string;
  onVersionSelect?: (version: Version) => void;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (artifactId) {
      getArtifactVersions(artifactId).then(d => setVersions(d.versions || []));
    }
  }, [artifactId]);

  if (versions.length <= 1) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <GitBranch size={12} className="text-ouro-accent" />
        <span className="text-xs text-ouro-muted font-medium">{versions.length} versions</span>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {versions.map(v => (
          <button
            key={v.id}
            onClick={() => { setSelected(v.id); onVersionSelect?.(v); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
              v.is_latest ? 'bg-ouro-accent/10 text-ouro-accent border border-ouro-accent/20' :
              selected === v.id ? 'bg-ouro-surface border border-ouro-border' :
              'bg-ouro-surface/50 text-ouro-muted hover:bg-ouro-surface'
            }`}
          >
            <span className="font-mono">v{v.version}</span>
            {v.is_latest && <span className="text-[9px] opacity-60">latest</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
