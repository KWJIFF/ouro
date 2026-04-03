'use client';

import { useState } from 'react';
import SignalComposer from '@/components/signal-input/SignalComposer';
import ExecutionStream from '@/components/execution/ExecutionStream';
import { useSignalStore } from '@/stores/signal-store';
import { Activity, GitBranch, Zap } from 'lucide-react';

export default function Home() {
  const [result, setResult] = useState<any>(null);
  const { signals } = useSignalStore();

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-ouro-border/50">
        <div className="flex items-center gap-3">
          <span className="text-xl">🐍</span>
          <span className="font-bold text-lg tracking-tight">Ouro</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-ouro-accent/10 text-ouro-accent font-medium">
            symbiosis
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <NavLink href="/history" icon={<GitBranch size={16} />} label="Ideas" />
          <NavLink href="/evolution" icon={<Activity size={16} />} label="Evolution" />
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Hero (shown when no signals yet) */}
        {signals.length === 0 && !result && (
          <div className="text-center mb-12 animate-slide-up">
            <h1 className="text-3xl font-bold mb-3 tracking-tight">
              Emit a signal
            </h1>
            <p className="text-ouro-muted text-sm max-w-md mx-auto leading-relaxed">
              Say something, snap a photo, drop a file. 
              Ouro understands your intent, builds what you describe, 
              and evolves with every interaction.
            </p>
          </div>
        )}

        {/* Recent signals (compact timeline) */}
        {signals.length > 0 && (
          <div className="w-full max-w-2xl mb-8">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Zap size={14} className="text-ouro-accent" />
              <span className="text-xs text-ouro-muted font-medium">Recent signals</span>
            </div>
            <div className="space-y-2">
              {signals.slice(0, 5).map((signal: any, i: number) => (
                <div key={i} className="px-4 py-2.5 rounded-lg bg-ouro-surface/50 border border-ouro-border/30 text-sm text-ouro-text/70 truncate">
                  {signal.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signal Composer */}
        <SignalComposer onResult={setResult} />

        {/* Execution Result */}
        <ExecutionStream result={result} />
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-ouro-muted/40 border-t border-ouro-border/20">
        The meme is listening.
      </footer>
    </main>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-1.5 text-sm text-ouro-muted hover:text-ouro-text transition-colors"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}
