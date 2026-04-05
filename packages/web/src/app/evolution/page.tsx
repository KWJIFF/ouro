'use client';
import { useState, useEffect } from 'react';
import { getEvolutionStats, getEvolutionLog, triggerEvolution, getTools, getHealthDetailed } from '@/lib/api-client';
import { Activity, Brain, Zap, RefreshCw, GitBranch, Cpu, Layers, ChevronRight, AlertCircle } from 'lucide-react';

export default function EvolutionPage() {
  const [stats, setStats] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [s, e, t, h] = await Promise.all([
      getEvolutionStats(),
      getEvolutionLog(),
      getTools(),
      getHealthDetailed(),
    ]);
    setStats(s?.data || s);
    setEvents(e?.data?.events || e?.events || []);
    setTools((t?.data?.tools || t?.tools || []) as any[]);
    setHealth(h?.data || h);
  }

  async function handleTrigger() {
    setTriggering(true);
    await triggerEvolution();
    await loadAll();
    setTriggering(false);
  }

  const phaseColors: Record<string, string> = {
    symbiosis: 'text-ouro-accent bg-ouro-accent/10',
    dominance: 'text-yellow-400 bg-yellow-400/10',
    autonomy: 'text-ouro-success bg-ouro-success/10',
  };

  return (
    <main className="min-h-screen bg-ouro-bg px-4 py-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity size={24} className="text-ouro-accent" />
            Evolution
          </h1>
          <p className="text-sm text-ouro-muted mt-1">The meme's self-improvement engine</p>
        </div>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ouro-accent/10 text-ouro-accent text-sm font-medium hover:bg-ouro-accent/20 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={triggering ? 'animate-spin' : ''} />
          {triggering ? 'Evolving...' : 'Trigger Evolution'}
        </button>
      </header>

      {/* Phase Display */}
      <div className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20 mb-6">
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-xl text-lg font-bold ${phaseColors[stats?.phase || 'symbiosis'] || phaseColors.symbiosis}`}>
            {stats?.phase || 'symbiosis'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-ouro-muted">Cycles: <strong className="text-ouro-text">{stats?.cycle_count || 0}</strong></span>
              <span className="text-ouro-muted">Events: <strong className="text-ouro-text">{stats?.total_events || 0}</strong></span>
              <span className="text-ouro-muted">Confidence: <strong className="text-ouro-text">{Math.round((stats?.model_confidence || 0) * 100)}%</strong></span>
            </div>
            {/* Phase progress bar */}
            <div className="mt-3 h-1.5 bg-ouro-bg/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-ouro-accent to-ouro-success rounded-full transition-all"
                style={{ width: `${Math.min((stats?.model_confidence || 0) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-ouro-muted/30">
              <span>symbiosis</span>
              <span>dominance</span>
              <span>autonomy</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Personal Model */}
        <section className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Brain size={14} className="text-ouro-accent" /> Personal Model
          </h2>
          <div className="space-y-3">
            <ModelField label="Top Domains" value={stats?.personal_model?.top_domains?.join(', ') || 'building...'} />
            <ModelField label="Preferred Modality" value={stats?.personal_model?.preferred_modality || 'text'} />
            <ModelField label="Expression Style" value={stats?.personal_model?.abstraction || 'medium'} />
            <ModelField label="Peak Hours" value={stats?.personal_model?.peak_hours?.join(', ') || 'building...'} />
            <ModelField label="Total Signals" value={String(stats?.total_signals || 0)} />
          </div>
        </section>

        {/* Tool Registry */}
        <section className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Cpu size={14} className="text-ouro-accent" /> Tool Registry ({tools.length})
          </h2>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {tools.slice(0, 20).map((tool: any, i: number) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-ouro-bg/30 text-xs">
                <span className="w-2 h-2 rounded-full bg-ouro-success flex-shrink-0" />
                <span className="text-ouro-text flex-1 truncate">{tool.name || tool.id}</span>
                <span className="text-ouro-muted/40 text-[10px]">v{tool.version || '0.1'}</span>
              </div>
            ))}
            {tools.length > 20 && (
              <div className="text-[10px] text-ouro-muted/40 text-center pt-1">+{tools.length - 20} more</div>
            )}
          </div>
        </section>
      </div>

      {/* Evolution Event Log */}
      <section className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20 mb-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <GitBranch size={14} className="text-ouro-accent" /> Evolution Events
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-ouro-muted text-center py-8">No evolution events yet. Keep using the system — it learns.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {events.map((event: any, i: number) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-ouro-bg/20">
                <div className="w-6 h-6 rounded-full bg-ouro-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Layers size={12} className="text-ouro-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">
                    L{event.target_layer}: {event.target_component}
                  </div>
                  <div className="text-[10px] text-ouro-muted mt-0.5">
                    {event.change_type} — expected improvement: +{Math.round((event.expected_improvement || 0) * 100)}%
                  </div>
                </div>
                <span className="text-[9px] text-ouro-muted/30 flex-shrink-0">
                  {new Date(event.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* System Health */}
      {health && (
        <section className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <AlertCircle size={14} className={health.status === 'healthy' ? 'text-ouro-success' : 'text-yellow-400'} />
            System Health: {health.status}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {health.checks && Object.entries(health.checks).map(([name, check]: [string, any]) => (
              <div key={name} className="bg-ouro-bg/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${check.status === 'pass' ? 'bg-ouro-success' : check.status === 'warn' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                  <span className="text-xs font-medium">{name}</span>
                </div>
                <div className="text-[10px] text-ouro-muted mt-1">{check.message?.slice(0, 50)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ModelField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-ouro-muted">{label}</span>
      <span className="text-xs text-ouro-text font-medium">{value}</span>
    </div>
  );
}
