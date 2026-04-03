'use client';
import { useState } from 'react';
import { Copy, Check, Download, Maximize2 } from 'lucide-react';

interface ArtifactData {
  type: string;
  content: any;
  metadata: Record<string, any>;
}

export default function ArtifactRenderer({ artifact }: { artifact: ArtifactData }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const content = typeof artifact.content === 'string' ? artifact.content : JSON.stringify(artifact.content, null, 2);
  const type = artifact.metadata?.type || artifact.type || 'text';

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCode = ['code', 'script', 'component'].includes(type);
  const isSVG = content.trim().startsWith('<svg');
  const isMarkdown = type === 'document' || artifact.metadata?.format === 'markdown';

  return (
    <div className={`rounded-xl bg-ouro-surface border border-ouro-border overflow-hidden ${expanded ? 'fixed inset-4 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-ouro-border/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ouro-accent/10 text-ouro-accent">{type}</span>
          {artifact.metadata?.language && (
            <span className="text-xs text-ouro-muted font-mono">{artifact.metadata.language}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copy} className="p-1.5 rounded hover:bg-ouro-border/50 text-ouro-muted" title="Copy">
            {copied ? <Check size={14} className="text-ouro-success" /> : <Copy size={14} />}
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded hover:bg-ouro-border/50 text-ouro-muted" title="Expand">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`overflow-auto ${expanded ? 'max-h-[calc(100vh-8rem)]' : 'max-h-[500px]'}`}>
        {isSVG ? (
          <div className="p-4 flex justify-center" dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <pre className={`p-4 text-sm leading-relaxed whitespace-pre-wrap ${isCode ? 'font-mono text-ouro-text/90' : 'text-ouro-text/80'}`}>
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
