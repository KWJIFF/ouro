'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Activity, Zap, Brain, Wrench, MessageSquare, GitBranch, Target, Clock } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/analytics`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-ouro-muted">Loading analytics...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-ouro-muted">No data available yet.</div>;

  const o = data.overview || {};
  const s = data.signal_analytics || {};
  const i = data.intent_analytics || {};
  const e = data.execution_analytics || {};
  const f = data.feedback_analytics || {};
  const ev = data.evolution_analytics || {};
  const p = data.pattern_analytics || {};

  const TrendIcon = s.trend === 'growing' ? TrendingUp : s.trend === 'declining' ? TrendingDown : Minus;
  const trendColor = s.trend === 'growing' ? 'text-ouro-success' : s.trend === 'declining' ? 'text-ouro-danger' : 'text-ouro-muted';

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-ouro-border/50">
        <a href="/" className="text-ouro-muted hover:text-ouro-text"><ArrowLeft size={20} /></a>
        <Activity size={20} className="text-ouro-accent" />
        <h1 className="font-bold text-lg">Analytics</h1>
        <span className={`text-xs ml-auto flex items-center gap-1 ${trendColor}`}>
          <TrendIcon size={14} /> {s.trend || 'stable'}
        </span>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Overview Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={<Zap size={16} />} label="Signals" value={o.total_signals} sub={`${s.signals_today || 0} today`} />
          <MetricCard icon={<Target size={16} />} label="Artifacts" value={o.total_artifacts} sub={`${(e.success_rate * 100 || 0).toFixed(0)}% success`} />
          <MetricCard icon={<Brain size={16} />} label="Patterns" value={o.total_patterns} sub={`${p.association_density?.toFixed(2) || 0} density`} />
          <MetricCard icon={<GitBranch size={16} />} label="Connections" value={o.total_connections} sub={`${ev.total_cycles || 0} evo cycles`} />
        </div>

        {/* Signal Temporal Distribution */}
        <Section title="Signal Activity by Hour">
          <div className="flex items-end gap-1 h-32 px-2">
            {(s.by_hour || new Array(24).fill(0)).map((count: number, hour: number) => {
              const max = Math.max(...(s.by_hour || [1]));
              const height = max > 0 ? (count / max) * 100 : 0;
              return (
                <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-ouro-accent/20 rounded-t relative" style={{ height: `${Math.max(2, height)}%` }}>
                    <div className="absolute inset-0 bg-ouro-accent rounded-t" style={{ height: `${height}%` }} />
                  </div>
                  <span className="text-[9px] text-ouro-muted">{hour}</span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Intent Distribution */}
          <Section title="Intent Distribution">
            <div className="space-y-2">
              {Object.entries(i.by_type || {}).map(([type, count]: any) => {
                const total = Object.values(i.by_type || {}).reduce((s: number, v: any) => s + v, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                const colors: Record<string, string> = {
                  create: 'bg-ouro-accent', explore: 'bg-blue-500', capture: 'bg-ouro-success',
                  modify: 'bg-yellow-500', connect: 'bg-pink-500', compose: 'bg-orange-500',
                };
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs text-ouro-muted w-16">{type}</span>
                    <div className="flex-1 h-4 bg-ouro-border/30 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colors[type] || 'bg-ouro-accent'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-ouro-text w-8 text-right">{count}</span>
                  </div>
                );
              })}
              {Object.keys(i.by_type || {}).length === 0 && (
                <p className="text-xs text-ouro-muted text-center py-4">No intents recorded yet.</p>
              )}
            </div>
          </Section>

          {/* Tool Usage */}
          <Section title="Tool Performance">
            <div className="space-y-2">
              {(e.by_tool || []).slice(0, 8).map((t: any) => (
                <div key={t.tool} className="flex items-center gap-2">
                  <Wrench size={12} className="text-ouro-accent flex-shrink-0" />
                  <span className="text-xs text-ouro-text truncate flex-1">{t.tool}</span>
                  <span className="text-xs text-ouro-muted">{t.uses}×</span>
                  <span className={`text-xs ${t.success_rate > 0.8 ? 'text-ouro-success' : t.success_rate > 0.5 ? 'text-yellow-500' : 'text-ouro-danger'}`}>
                    {(t.success_rate * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
              {(e.by_tool || []).length === 0 && (
                <p className="text-xs text-ouro-muted text-center py-4">No tool usage recorded yet.</p>
              )}
            </div>
          </Section>

          {/* Feedback Stats */}
          <Section title="Feedback Analysis">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <MiniStat label="Accept" value={`${(f.accept_rate * 100 || 0).toFixed(0)}%`} color="text-ouro-success" />
              <MiniStat label="Modify" value={`${(f.modify_rate * 100 || 0).toFixed(0)}%`} color="text-yellow-500" />
              <MiniStat label="Reject" value={`${(f.reject_rate * 100 || 0).toFixed(0)}%`} color="text-ouro-danger" />
            </div>
            <div className="text-xs text-ouro-muted">
              Avg satisfaction: <span className="text-ouro-text font-medium">{(f.avg_satisfaction || 0).toFixed(2)}</span>
              {f.avg_time_to_react_ms > 0 && (
                <> · Avg reaction: <span className="text-ouro-text font-medium">{(f.avg_time_to_react_ms / 1000).toFixed(1)}s</span></>
              )}
            </div>
          </Section>

          {/* Pattern Insights */}
          <Section title="Pattern Insights">
            <div className="space-y-3">
              {(p.top_creativity_triggers || []).length > 0 && (
                <div>
                  <span className="text-[10px] text-ouro-muted uppercase tracking-wider">Creativity Triggers</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(p.top_creativity_triggers || []).slice(0, 5).map((t: any) => (
                      <span key={t.trigger} className="text-xs px-2 py-0.5 rounded bg-ouro-accent/10 text-ouro-accent">
                        {t.trigger} ({t.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(p.top_friction_points || []).length > 0 && (
                <div>
                  <span className="text-[10px] text-ouro-muted uppercase tracking-wider">Friction Points</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(p.top_friction_points || []).slice(0, 5).map((f: any) => (
                      <span key={f.type} className="text-xs px-2 py-0.5 rounded bg-ouro-danger/10 text-ouro-danger">
                        {f.type} ({f.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(p.top_creativity_triggers || []).length === 0 && (p.top_friction_points || []).length === 0 && (
                <p className="text-xs text-ouro-muted text-center py-4">Patterns will emerge as you emit more signals.</p>
              )}
            </div>
          </Section>
        </div>

        {/* Modality Distribution */}
        <Section title="Signal Modalities">
          <div className="flex gap-3 flex-wrap">
            {Object.entries(s.by_modality || {}).map(([mod, count]: any) => {
              const icons: Record<string, string> = {
                text: '💬', voice: '🎤', image: '📷', video: '🎥', sketch: '✏️', file: '📎', composite: '📦',
              };
              return (
                <div key={mod} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ouro-surface border border-ouro-border/30">
                  <span>{icons[mod] || '📡'}</span>
                  <span className="text-xs text-ouro-text">{mod}</span>
                  <span className="text-xs text-ouro-muted">{count}</span>
                </div>
              );
            })}
            {Object.keys(s.by_modality || {}).length === 0 && (
              <p className="text-xs text-ouro-muted">No signals recorded yet.</p>
            )}
          </div>
        </Section>

        {/* Evolution Timeline */}
        <Section title="Evolution Impact">
          <div className="space-y-2">
            {Object.entries(ev.by_component || {}).map(([comp, count]: any) => (
              <div key={comp} className="flex items-center gap-3">
                <span className="text-xs text-ouro-accent w-32 truncate">{comp}</span>
                <div className="flex-1 h-3 bg-ouro-border/30 rounded-full overflow-hidden">
                  <div className="h-full bg-ouro-accent/60 rounded-full" style={{
                    width: `${Math.min(100, (count / Math.max(...Object.values(ev.by_component || { a: 1 }) as number[])) * 100)}%`
                  }} />
                </div>
                <span className="text-xs text-ouro-muted">{count}</span>
              </div>
            ))}
            {Object.keys(ev.by_component || {}).length === 0 && (
              <p className="text-xs text-ouro-muted text-center py-4">Evolution will begin after accumulating enough patterns.</p>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ouro-muted mb-3">{title}</h2>
      <div className="rounded-xl bg-ouro-surface border border-ouro-border/50 p-4">
        {children}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: any; sub: string }) {
  return (
    <div className="p-4 rounded-xl bg-ouro-surface border border-ouro-border/50 text-center">
      <div className="flex justify-center mb-2 text-ouro-accent">{icon}</div>
      <div className="text-2xl font-bold">{value || 0}</div>
      <div className="text-xs text-ouro-muted mt-0.5">{label}</div>
      <div className="text-[10px] text-ouro-muted/60 mt-1">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-ouro-bg/50">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-ouro-muted">{label}</div>
    </div>
  );
}
