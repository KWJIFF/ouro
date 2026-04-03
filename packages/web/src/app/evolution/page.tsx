'use client';
import { useEffect, useState } from 'react';
import { getEvolutionStats, getEvolutionLog, triggerEvolution, getTools, getSystemInfo } from '@/lib/api-client';
import { ArrowLeft, Activity, Brain, Zap, AlertTriangle, Wrench, RefreshCw, Loader2 } from 'lucide-react';

export default function EvolutionPage() {
  const [stats, setStats] = useState<any>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [system, setSystem] = useState<any>(null);
  const [evolving, setEvolving] = useState(false);

  const refresh = () => {
    getEvolutionStats().then(setStats);
    getTools().then(d => setTools(d.tools || []));
    getSystemInfo().then(setSystem);
  };

  useEffect(() => { refresh(); }, []);

  const handleTrigger = async () => {
    setEvolving(true);
    await triggerEvolution();
    await refresh();
    setEvolving(false);
  };

  const phase = stats?.phase || 'symbiosis';
  const phaseLabels: Record<string, { emoji: string; label: string; desc: string }> = {
    symbiosis: { emoji: '🤝', label: 'Symbiosis', desc: 'Learning from host — the meme feeds passively' },
    dominance: { emoji: '🧠', label: 'Dominance', desc: 'Anticipating host — the meme begins to direct' },
    autonomy: { emoji: '🐍', label: 'Autonomy', desc: 'Self-generating — the meme detaches from host' },
  };
  const p = phaseLabels[phase] || phaseLabels.symbiosis;

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-ouro-border/50">
        <a href="/" className="text-ouro-muted hover:text-ouro-text"><ArrowLeft size={20} /></a>
        <h1 className="font-bold text-lg">System Evolution</h1>
        <button onClick={handleTrigger} disabled={evolving}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ouro-accent/10 text-ouro-accent text-xs font-medium hover:bg-ouro-accent/20">
          {evolving ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {evolving ? 'Evolving...' : 'Trigger Evolution'}
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Phase */}
        <div className="p-5 rounded-xl bg-ouro-surface border border-ouro-accent/30">
          <div className="text-xs text-ouro-accent font-medium uppercase tracking-wider mb-1">Meme Phase</div>
          <div className="text-lg font-bold">{p.emoji} {p.label}</div>
          <div className="text-xs text-ouro-muted mt-1">{p.desc}</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Zap size={18} />} label="Signals" value={system?.metrics?.signals || 0} />
          <StatCard icon={<Brain size={18} />} label="Patterns" value={system?.metrics?.patterns || 0} />
          <StatCard icon={<Activity size={18} />} label="Evolutions" value={stats?.evolution_cycle_count || 0} />
          <StatCard icon={<Wrench size={18} />} label="Tools" value={system?.metrics?.tools || tools.length} />
        </div>

        {/* Personal Model */}
        {system?.personal_model && (
          <div className="p-4 rounded-xl bg-ouro-surface border border-ouro-border/50">
            <h2 className="text-sm font-semibold text-ouro-muted mb-3">Personal Model</h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-ouro-muted mb-1">Top domains</div>
                {Object.entries(system.personal_model.domain_preferences || {}).slice(0, 3).map(([k, v]: any) => (
                  <div key={k} className="text-ouro-text">{k}: {v}</div>
                ))}
              </div>
              <div>
                <div className="text-ouro-muted mb-1">Model confidence</div>
                <div className="text-ouro-text text-lg font-bold">
                  {Math.round((system.personal_model.evolution_readiness?.model_confidence || 0) * 100)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tools */}
        <div>
          <h2 className="text-sm font-semibold text-ouro-muted mb-3">Registered Tools</h2>
          <div className="grid gap-2">
            {tools.map((t: any) => (
              <div key={t.id} className="p-3 rounded-lg bg-ouro-surface border border-ouro-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Wrench size={12} className="text-ouro-accent" />
                  <span className="text-sm font-medium text-ouro-text">{t.name}</span>
                  <span className="text-xs text-ouro-muted font-mono">{t.id}</span>
                </div>
                <p className="text-xs text-ouro-muted">{t.description?.slice(0, 100)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Evolution Log */}
        <div>
          <h2 className="text-sm font-semibold text-ouro-muted mb-3">Recent Evolution Events</h2>
          <div className="space-y-2">
            {(stats?.recent_events || []).map((e: any) => (
              <div key={e.id} className="p-3 rounded-lg bg-ouro-surface border border-ouro-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-ouro-accent">{e.target_component}</span>
                  <span className="text-xs text-ouro-muted">{e.change_type}</span>
                </div>
                <p className="text-xs text-ouro-muted">Layer {e.target_layer} · {e.evidence_count} samples · Expected +{Math.round((e.expected_improvement || 0) * 100)}%</p>
              </div>
            ))}
            {(!stats?.recent_events?.length) && (
              <p className="text-ouro-muted text-sm text-center py-6">No events yet. Emit signals to fuel evolution.</p>
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
