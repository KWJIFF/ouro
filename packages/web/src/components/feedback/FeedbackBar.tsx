'use client';
import { useState } from 'react';
import { Check, Pencil, X, GitFork, Share2, Loader2 } from 'lucide-react';
import { submitFeedback } from '@/lib/api-client';

interface Props {
  artifactId: string;
  signalId: string;
  onModify?: (instruction: string) => void;
  onAccept?: () => void;
}

export default function FeedbackBar({ artifactId, signalId, onModify, onAccept }: Props) {
  const [showModifyInput, setShowModifyInput] = useState(false);
  const [modifyText, setModifyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const startTime = Date.now();

  const send = async (action: string, modification?: any) => {
    setLoading(true);
    try {
      await submitFeedback({
        artifact_id: artifactId,
        signal_id: signalId,
        action,
        modification,
        time_to_react_ms: Date.now() - startTime,
      });
      setSubmitted(action);
      if (action === 'accept') onAccept?.();
    } catch (e) {
      console.error('Feedback failed:', e);
    }
    setLoading(false);
  };

  if (submitted) {
    const labels: Record<string, string> = { accept: 'Accepted ✓', modify: 'Modification sent', reject: 'Rejected', fork: 'Forked' };
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-ouro-surface/50 border border-ouro-border/30">
        <span className="text-xs text-ouro-muted">{labels[submitted] || submitted}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FeedbackButton icon={<Check size={15} />} label="Accept" color="success" onClick={() => send('accept')} disabled={loading} />
        <FeedbackButton icon={<Pencil size={15} />} label="Modify" color="accent" onClick={() => setShowModifyInput(true)} disabled={loading} />
        <FeedbackButton icon={<X size={15} />} label="Reject" color="danger" onClick={() => send('reject')} disabled={loading} />
        <FeedbackButton icon={<GitFork size={15} />} label="Fork" color="muted" onClick={() => send('fork')} disabled={loading} />
        <FeedbackButton icon={<Share2 size={15} />} label="Share" color="muted" onClick={() => send('share')} disabled={loading} />
        {loading && <Loader2 size={14} className="animate-spin text-ouro-accent" />}
      </div>

      {showModifyInput && (
        <div className="flex gap-2 animate-slide-up">
          <input
            type="text"
            value={modifyText}
            onChange={(e) => setModifyText(e.target.value)}
            placeholder="How should it change?"
            className="flex-1 bg-ouro-surface border border-ouro-border rounded-lg px-3 py-2 text-sm text-ouro-text placeholder-ouro-muted/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && modifyText.trim()) {
                send('modify', { type: 'instruction', instruction: modifyText });
                onModify?.(modifyText);
              }
            }}
            autoFocus
          />
          <button
            onClick={() => { send('modify', { type: 'instruction', instruction: modifyText }); onModify?.(modifyText); }}
            disabled={!modifyText.trim()}
            className="px-3 py-2 rounded-lg bg-ouro-accent text-white text-sm disabled:opacity-50"
          >Send</button>
        </div>
      )}
    </div>
  );
}

function FeedbackButton({ icon, label, color, onClick, disabled }: {
  icon: React.ReactNode; label: string; color: string; onClick: () => void; disabled: boolean;
}) {
  const colors: Record<string, string> = {
    success: 'hover:bg-ouro-success/10 hover:text-ouro-success hover:border-ouro-success/30',
    accent: 'hover:bg-ouro-accent/10 hover:text-ouro-accent hover:border-ouro-accent/30',
    danger: 'hover:bg-ouro-danger/10 hover:text-ouro-danger hover:border-ouro-danger/30',
    muted: 'hover:bg-ouro-border hover:text-ouro-text',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ouro-border/50 text-xs text-ouro-muted transition-all ${colors[color]} disabled:opacity-50`}
    >{icon}<span className="hidden sm:inline">{label}</span></button>
  );
}
