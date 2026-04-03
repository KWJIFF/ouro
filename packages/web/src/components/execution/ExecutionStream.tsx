'use client';

import { CheckCircle, Circle, Loader2, XCircle, Wrench } from 'lucide-react';

interface Step {
  id: string;
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
}

interface ExecutionResult {
  signal_id: string;
  intent: { type: string; description: string; confidence: number };
  execution: { plan_id: string; status: string; steps: Step[] };
  artifacts: Array<{ type: string; content: any; metadata: any }>;
}

export default function ExecutionStream({ result }: { result: ExecutionResult | null }) {
  if (!result) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 animate-slide-up">
      {/* Intent */}
      <div className="mb-4 p-4 rounded-xl bg-ouro-surface border border-ouro-border">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ouro-accent/15 text-ouro-accent">
            {result.intent.type.toUpperCase()}
          </span>
          <span className="text-xs text-ouro-muted">
            Confidence: {Math.round(result.intent.confidence * 100)}%
          </span>
        </div>
        <p className="text-sm text-ouro-text">{result.intent.description}</p>
      </div>

      {/* Steps */}
      <div className="space-y-2 mb-4">
        {result.execution.steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg bg-ouro-surface/50 border border-ouro-border/50">
            <StepIcon status={step.status} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Wrench size={12} className="text-ouro-muted" />
                <span className="text-xs font-mono text-ouro-muted">{step.tool}</span>
              </div>
            </div>
            <span className={`text-xs font-medium ${
              step.status === 'completed' ? 'text-ouro-success' :
              step.status === 'failed' ? 'text-ouro-danger' :
              step.status === 'running' ? 'text-ouro-accent' : 'text-ouro-muted'
            }`}>
              {step.status}
            </span>
          </div>
        ))}
      </div>

      {/* Artifacts */}
      {result.artifacts && result.artifacts.length > 0 && (
        <div className="space-y-3">
          {result.artifacts.map((artifact, i) => (
            <div key={i} className="p-4 rounded-xl bg-ouro-surface border border-ouro-border">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ouro-success/15 text-ouro-success">
                  {artifact.metadata?.type || artifact.type}
                </span>
              </div>
              <pre className="text-sm text-ouro-text/90 overflow-x-auto whitespace-pre-wrap font-mono bg-ouro-bg/50 p-3 rounded-lg max-h-[400px] overflow-y-auto">
                {typeof artifact.content === 'string' ? artifact.content : JSON.stringify(artifact.content, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <CheckCircle size={18} className="text-ouro-success" />;
    case 'running': return <Loader2 size={18} className="text-ouro-accent animate-spin" />;
    case 'failed': return <XCircle size={18} className="text-ouro-danger" />;
    default: return <Circle size={18} className="text-ouro-muted/40" />;
  }
}
