'use client';
import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Wrench, ChevronDown, ChevronUp, Zap, Brain, Target } from 'lucide-react';

interface ExecutionResult {
  signal_id: string;
  intent?: {
    type: string;
    description: string;
    confidence: number;
  };
  execution?: {
    plan_id: string;
    status: string;
    steps: Array<{
      id: string;
      tool: string;
      status: string;
    }>;
  };
  artifacts?: any[];
}

export default function ExecutionStream({ result }: { result: ExecutionResult }) {
  const [expanded, setExpanded] = useState(false);

  if (!result) return null;

  const { intent, execution } = result;
  const isComplete = execution?.status === 'completed';
  const isFailed = execution?.status === 'failed';

  return (
    <div className={`rounded-xl border transition-colors ${
      isComplete ? 'border-ouro-success/30 bg-ouro-success/5' :
      isFailed ? 'border-ouro-danger/30 bg-ouro-danger/5' :
      'border-ouro-accent/30 bg-ouro-accent/5'
    }`}>
      {/* Summary bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {isComplete ? <CheckCircle size={16} className="text-ouro-success flex-shrink-0" /> :
         isFailed ? <XCircle size={16} className="text-ouro-danger flex-shrink-0" /> :
         <Clock size={16} className="text-ouro-accent animate-pulse flex-shrink-0" />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {intent && (
              <>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-ouro-accent/10 text-ouro-accent">
                  {intent.type}
                </span>
                <span className="text-xs text-ouro-muted">
                  {Math.round(intent.confidence * 100)}%
                </span>
              </>
            )}
            {execution?.steps && (
              <span className="text-xs text-ouro-muted ml-auto">
                {execution.steps.filter(s => s.status === 'completed').length}/{execution.steps.length} steps
              </span>
            )}
          </div>
          {intent?.description && (
            <p className="text-xs text-ouro-text/60 mt-1 truncate">{intent.description}</p>
          )}
        </div>

        {expanded ? <ChevronUp size={14} className="text-ouro-muted" /> : <ChevronDown size={14} className="text-ouro-muted" />}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-ouro-border/20 pt-2">
          {/* Intent detail */}
          {intent && (
            <div className="flex items-start gap-2">
              <Brain size={12} className="text-ouro-accent mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-ouro-muted uppercase tracking-wider">Intent</span>
                <p className="text-xs text-ouro-text/80">{intent.description}</p>
              </div>
            </div>
          )}

          {/* Steps */}
          {execution?.steps && execution.steps.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-ouro-muted uppercase tracking-wider flex items-center gap-1">
                <Wrench size={10} /> Execution Steps
              </span>
              {execution.steps.map((step, i) => (
                <div key={step.id || i} className="flex items-center gap-2 pl-3">
                  {step.status === 'completed' ? <CheckCircle size={12} className="text-ouro-success" /> :
                   step.status === 'failed' ? <XCircle size={12} className="text-ouro-danger" /> :
                   <Clock size={12} className="text-ouro-muted" />}
                  <span className="text-xs text-ouro-text/70 font-mono">{step.tool}</span>
                  <span className={`text-[10px] ml-auto ${
                    step.status === 'completed' ? 'text-ouro-success' :
                    step.status === 'failed' ? 'text-ouro-danger' : 'text-ouro-muted'
                  }`}>{step.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* Artifacts summary */}
          {result.artifacts && result.artifacts.length > 0 && (
            <div className="flex items-center gap-2">
              <Target size={12} className="text-ouro-accent" />
              <span className="text-xs text-ouro-text/70">
                {result.artifacts.length} artifact{result.artifacts.length > 1 ? 's' : ''} produced
              </span>
            </div>
          )}

          {/* Signal ID (for debugging) */}
          <div className="text-[10px] text-ouro-muted/40 font-mono pt-1">
            signal: {result.signal_id?.slice(0, 16)}
          </div>
        </div>
      )}
    </div>
  );
}
