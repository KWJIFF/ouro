'use client';

import { useEffect, useState } from 'react';
import { getEvolutionStats } from '@/lib/api-client';
import { ArrowLeft, Activity, Brain, Zap, AlertTriangle } from 'lucide-react';

export default function EvolutionPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    getEvolutionStats().then(setStats).catch(console.error);
  }, []);

  const phase = stats?.phase || 'symbiosis';
  const phaseLabels: Record<string, string> = {
    symbiosis: '🤝 Symbiosis — Learning from host',
    dominance: '🧠 Dominance — Anticipating host',
    autonomy: '🐍 Autonomy — Self-generating',
  };

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-ouro-border/50">
        <a href="/" className="text-ouro-muted hover:text-ouro-text"><ArrowLeft size={20} /></a>
        <h1 className="font-bold text-lg">System Evolution</h1>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        {/* Phase */}
        <div className="p-5 rounded-xl bg-ouro-surface border border-ouro-accent/30 mb-6">
          <div className="text-xs text-ouro-accent font-medium uppercase tracking-wider mb-2">Current Phase</div>
          <div className="text-lg font-bold">{phaseLabels[phase] || phase}</div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={<Zap size={18} />} label="Cycles" value={stats?.evolution_cycle_count || 0} />
          <StatCard icon={<Brain size={18} />} label="Patterns" value={stats?.total_patterns || 0} />
          <StatCard icon={<Activity size={18} />} label="Evolutions" value={stats?.recent_events?.length || 0} />
          <StatCard icon={<AlertTriangle size={18} />} label="Phase" value={phase} />
        </div>

        {/* Recent Events */}
        <div>
          <h2 className="text-sm font-semibold mb-3 text-ouro-muted">Recent Evolution Events</h2>
          <div className="space-y-2">
            {(stats?.recent_events || []).map((event: any) => (
              <div key={event.id} className="p-3 rounded-lg bg-ouro-surface border border-ouro-border/50 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-ouro-accent">{event.target_component}</span>
                  <span className="text-xs text-ouro-muted">{event.change_type}</span>
                </div>
                <p className="text-xs text-ouro-muted">
                  Layer {event.target_layer} · {event.evidence_count} evidence samples
                </p>
              </div>
            ))}
            {(!stats?.recent_events || stats.recent_events.length === 0) && (
              <p className="text-ouro-muted text-sm text-center py-8">No evolution events yet. Keep emitting signals!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div className="p-4 rounded-xl bg-ouro-surface border border-ouro-border/50 text-center">
      <div className="flex justify-center mb-2 text-ouro-accent">{icon}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-ouro-muted mt-1">{label}</div>
    </div>
  );
}
