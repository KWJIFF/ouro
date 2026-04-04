'use client';
import { useEffect, useState, useRef } from 'react';
import { CheckCircle, Circle, Loader2, XCircle, Wrench, Zap, Brain, Clock } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface ExecutionEvent {
  type: string;
  data: any;
  timestamp?: string;
}

interface Props {
  signalId: string | null;
  onComplete?: (artifacts: any[]) => void;
}

export default function LiveExecutionStream({ signalId, onComplete }: Props) {
  const { connected, events } = useWebSocket(signalId || undefined);
  const [stages, setStages] = useState<Array<{
    id: string;
    label: string;
    status: 'pending' | 'active' | 'done' | 'error';
    detail?: string;
    startTime?: number;
    duration?: number;
  }>>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!signalId) return;

    // Initialize pipeline stages
    setStages([
      { id: 'capture', label: 'Signal Captured', status: 'done' },
      { id: 'intent', label: 'Parsing Intent', status: 'active', startTime: Date.now() },
      { id: 'plan', label: 'Planning Execution', status: 'pending' },
      { id: 'execute', label: 'Executing Tools', status: 'pending' },
      { id: 'artifact', label: 'Building Artifact', status: 'pending' },
      { id: 'recovery', label: 'Pattern Recovery', status: 'pending' },
    ]);
  }, [signalId]);

  useEffect(() => {
    for (const event of events) {
      switch (event.type) {
        case 'parsed':
          setStages(prev => prev.map(s =>
            s.id === 'intent' ? { ...s, status: 'done' as const, detail: event.data?.intent?.type, duration: Date.now() - (s.startTime || Date.now()) } :
            s.id === 'plan' ? { ...s, status: 'active' as const, startTime: Date.now() } : s
          ));
          break;

        case 'planned':
          setStages(prev => prev.map(s =>
            s.id === 'plan' ? { ...s, status: 'done' as const, detail: `${event.data?.steps || '?'} steps`, duration: Date.now() - (s.startTime || Date.now()) } :
            s.id === 'execute' ? { ...s, status: 'active' as const, startTime: Date.now() } : s
          ));
          break;

        case 'step_started':
          setStages(prev => prev.map(s =>
            s.id === 'execute' ? { ...s, detail: `Running: ${event.data?.tool}` } : s
          ));
          break;

        case 'step_completed':
          setStages(prev => prev.map(s =>
            s.id === 'execute' ? { ...s, detail: `✓ ${event.data?.tool}` } : s
          ));
          break;

        case 'step_failed':
          setStages(prev => prev.map(s =>
            s.id === 'execute' ? { ...s, detail: `✗ ${event.data?.tool}: ${event.data?.error?.slice(0, 50)}` } : s
          ));
          break;

        case 'completed':
          setStages(prev => prev.map(s => {
            if (s.id === 'execute') return { ...s, status: 'done' as const, duration: Date.now() - (s.startTime || Date.now()) };
            if (s.id === 'artifact') return { ...s, status: 'done' as const };
            if (s.id === 'recovery') return { ...s, status: 'done' as const };
            return s;
          }));
          if (event.data?.artifacts) {
            setArtifacts(event.data.artifacts);
            onComplete?.(event.data.artifacts);
          }
          break;

        case 'evolution':
          // Show a subtle indicator that evolution occurred
          break;
      }
    }
  }, [events]);

  if (!signalId) return null;

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto mt-4 animate-slide-up">
      {/* Connection indicator */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-ouro-success' : 'bg-ouro-danger'}`} />
        <span className="text-[10px] text-ouro-muted">
          {connected ? 'Live' : 'Connecting...'}
        </span>
      </div>

      {/* Pipeline stages */}
      <div className="space-y-1">
        {stages.map((stage, i) => (
          <div key={stage.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
            stage.status === 'active' ? 'bg-ouro-accent/5 border border-ouro-accent/20' :
            stage.status === 'done' ? 'bg-ouro-surface/30' :
            stage.status === 'error' ? 'bg-ouro-danger/5 border border-ouro-danger/20' :
            'opacity-40'
          }`}>
            <StageIcon status={stage.status} />
            <span className={`text-sm flex-1 ${
              stage.status === 'active' ? 'text-ouro-accent font-medium' :
              stage.status === 'done' ? 'text-ouro-text/70' :
              'text-ouro-muted/50'
            }`}>
              {stage.label}
            </span>
            {stage.detail && (
              <span className="text-xs text-ouro-muted">{stage.detail}</span>
            )}
            {stage.duration && (
              <span className="text-[10px] text-ouro-muted/50 flex items-center gap-0.5">
                <Clock size={10} />{stage.duration}ms
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Event log (collapsed by default) */}
      {events.length > 0 && (
        <details className="mt-3">
          <summary className="text-[10px] text-ouro-muted cursor-pointer hover:text-ouro-text">
            {events.length} events received
          </summary>
          <div className="mt-1 max-h-32 overflow-y-auto space-y-0.5">
            {events.map((e, i) => (
              <div key={i} className="text-[10px] text-ouro-muted/60 font-mono px-2">
                {e.type}: {JSON.stringify(e.data).slice(0, 80)}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function StageIcon({ status }: { status: string }) {
  switch (status) {
    case 'done': return <CheckCircle size={16} className="text-ouro-success flex-shrink-0" />;
    case 'active': return <Loader2 size={16} className="text-ouro-accent animate-spin flex-shrink-0" />;
    case 'error': return <XCircle size={16} className="text-ouro-danger flex-shrink-0" />;
    default: return <Circle size={16} className="text-ouro-muted/30 flex-shrink-0" />;
  }
}
