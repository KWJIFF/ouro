'use client';

import { useEffect, useState } from 'react';
import { getSignals } from '@/lib/api-client';
import { ArrowLeft, MessageSquare, Image, Mic, Video, File } from 'lucide-react';

const modalityIcons: Record<string, any> = {
  text: MessageSquare, image: Image, voice: Mic, video: Video, file: File,
};

export default function HistoryPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSignals(50).then(data => {
      setSignals(data.signals || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-ouro-border/50">
        <a href="/" className="text-ouro-muted hover:text-ouro-text"><ArrowLeft size={20} /></a>
        <h1 className="font-bold text-lg">Signal History</h1>
        <span className="text-xs text-ouro-muted">{signals.length} signals</span>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-3">
        {loading ? (
          <p className="text-ouro-muted text-center py-12">Loading signals...</p>
        ) : signals.length === 0 ? (
          <p className="text-ouro-muted text-center py-12">No signals yet. Go emit one!</p>
        ) : (
          signals.map((signal: any) => {
            const Icon = modalityIcons[signal.modality] || MessageSquare;
            return (
              <div key={signal.id} className="p-4 rounded-xl bg-ouro-surface border border-ouro-border/50 hover:border-ouro-border transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-ouro-accent/10">
                    <Icon size={16} className="text-ouro-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ouro-text truncate">{signal.normalized_text || signal.raw_content}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-ouro-muted">{new Date(signal.created_at).toLocaleString()}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        signal.status === 'completed' ? 'bg-ouro-success/10 text-ouro-success' :
                        signal.status === 'failed' ? 'bg-ouro-danger/10 text-ouro-danger' :
                        'bg-ouro-border text-ouro-muted'
                      }`}>{signal.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
