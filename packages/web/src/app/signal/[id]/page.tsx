'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSignal, getSimilarSignals } from '@/lib/api-client';
import ArtifactRenderer from '@/components/artifact/ArtifactRenderer';
import FeedbackBar from '@/components/feedback/FeedbackBar';
import { ArrowLeft, Clock, Brain, GitBranch } from 'lucide-react';

export default function SignalDetailPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [similar, setSimilar] = useState<any[]>([]);

  useEffect(() => {
    if (params.id) {
      getSignal(params.id as string).then(setData);
      getSimilarSignals(params.id as string).then(r => setSimilar(r.similar || []));
    }
  }, [params.id]);

  if (!data) return <div className="min-h-screen flex items-center justify-center text-ouro-muted">Loading...</div>;

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-ouro-border/50">
        <a href="/" className="text-ouro-muted hover:text-ouro-text"><ArrowLeft size={20} /></a>
        <h1 className="font-bold">Signal Detail</h1>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Signal */}
        <div className="p-5 rounded-xl bg-ouro-surface border border-ouro-border">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 rounded-full bg-ouro-signal/10 text-ouro-signal">{data.signal?.modality}</span>
            <span className="text-xs text-ouro-muted flex items-center gap-1"><Clock size={12} />{new Date(data.signal?.created_at).toLocaleString()}</span>
          </div>
          <p className="text-sm text-ouro-text whitespace-pre-wrap">{data.signal?.normalized_text}</p>
        </div>

        {/* Intent */}
        {data.intents?.[0] && (
          <div className="p-4 rounded-xl bg-ouro-surface/50 border border-ouro-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={14} className="text-ouro-accent" />
              <span className="text-xs font-medium text-ouro-accent">Intent: {data.intents[0].intent_type}</span>
              <span className="text-xs text-ouro-muted">{Math.round(data.intents[0].confidence * 100)}%</span>
            </div>
            <p className="text-sm text-ouro-text/80">{data.intents[0].description}</p>
          </div>
        )}

        {/* Artifacts */}
        {data.artifacts?.map((a: any) => (
          <div key={a.id} className="space-y-2">
            <ArtifactRenderer artifact={{ type: a.artifact_type, content: a.metadata?.inline_content || a.description, metadata: a.metadata }} />
            <FeedbackBar artifactId={a.id} signalId={data.signal?.id} />
          </div>
        ))}

        {/* Similar Signals */}
        {similar.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-ouro-muted mb-3 flex items-center gap-2"><GitBranch size={14} />Related signals</h3>
            <div className="space-y-2">
              {similar.map((s: any) => (
                <a key={s.id} href={`/signal/${s.id}`} className="block p-3 rounded-lg bg-ouro-surface/30 border border-ouro-border/30 hover:border-ouro-border text-sm text-ouro-text/70 truncate">
                  {s.normalized_text || s.text}
                  <span className="ml-2 text-xs text-ouro-accent">{Math.round((s.similarity || 0) * 100)}% similar</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
