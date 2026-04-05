'use client';
import { useState, useEffect } from 'react';
import { getAnalytics } from '@/lib/api-client';
import { BarChart3, TrendingUp, Clock, Zap, Target, PieChart, Activity, ArrowUp, ArrowDown } from 'lucide-react';

interface AnalyticsData {
  signals: { total: number; today: number; this_week: number; by_modality: Record<string, number>; by_hour: number[] };
  intents: { total: number; distribution: Record<string, number>; avg_confidence: number };
  execution: { total: number; success_rate: number; avg_duration_ms: number; by_tool: Record<string, { total: number; success: number }> };
  feedback: { total: number; accept_rate: number; modify_rate: number; reject_rate: number; avg_satisfaction: number };
  evolution: { total_cycles: number; total_events: number; phase: string; improvements: number };
  patterns: { total: number; by_type: Record<string, number>; top_domains: string[] };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics().then(r => {
      setData(r?.data || r || mockData());
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState />;

  return (
    <main className="min-h-screen bg-ouro-bg px-4 py-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 size={24} className="text-ouro-accent" />
          Analytics
        </h1>
        <p className="text-sm text-ouro-muted mt-1">System-wide metrics across all 7 layers</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard icon={<Zap size={18} />} label="Signals" value={data.signals.total} sub={`${data.signals.today} today`} color="accent" />
        <MetricCard icon={<Target size={18} />} label="Artifacts" value={data.execution.total} sub={`${Math.round(data.execution.success_rate * 100)}% success`} color="success" />
        <MetricCard icon={<Activity size={18} />} label="Patterns" value={data.patterns.total} sub={`${data.patterns.top_domains?.[0] || 'general'}`} color="warning" />
        <MetricCard icon={<TrendingUp size={18} />} label="Evolution" value={data.evolution.total_events} sub={data.evolution.phase} color="info" />
      </div>

      {/* Signal Heatmap */}
      <section className="bg-ouro-surface/30 rounded-xl p-6 mb-6 border border-ouro-border/20">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Clock size={14} className="text-ouro-accent" /> Signal Activity by Hour
        </h2>
        <div className="flex gap-1 items-end h-24">
          {(data.signals.by_hour || Array(24).fill(0)).map((count: number, hour: number) => {
            const max = Math.max(...(data.signals.by_hour || [1]));
            const height = max > 0 ? (count / max) * 100 : 5;
            return (
              <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t transition-all hover:opacity-80"
                  style={{
                    height: `${Math.max(height, 3)}%`,
                    backgroundColor: count > 0 ? `rgba(139, 92, 246, ${0.3 + (height / 100) * 0.7})` : 'rgba(255,255,255,0.03)',
                  }}
                  title={`${hour}:00 — ${count} signals`}
                />
                {hour % 6 === 0 && <span className="text-[8px] text-ouro-muted/40">{hour}</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Two column layout */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Intent Distribution */}
        <section className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <PieChart size={14} className="text-ouro-accent" /> Intent Distribution
          </h2>
          <div className="space-y-2">
            {Object.entries(data.intents.distribution || {}).map(([type, count]) => {
              const total = Object.values(data.intents.distribution || {}).reduce((s, c) => s + (c as number), 0);
              const pct = total > 0 ? ((count as number) / total) * 100 : 0;
              const colors: Record<string, string> = {
                create: '#8b5cf6', modify: '#ec4899', explore: '#3b82f6',
                capture: '#10b981', connect: '#f59e0b', compose: '#6366f1',
              };
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs text-ouro-muted w-16">{type}</span>
                  <div className="flex-1 h-2 bg-ouro-bg/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors[type] || '#6b7280' }} />
                  </div>
                  <span className="text-xs text-ouro-muted/60 w-8 text-right">{Math.round(pct)}%</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-[10px] text-ouro-muted/40">
            Avg confidence: {(data.intents.avg_confidence * 100).toFixed(0)}%
          </div>
        </section>

        {/* Tool Performance */}
        <section className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Target size={14} className="text-ouro-accent" /> Tool Performance
          </h2>
          <div className="space-y-2">
            {Object.entries(data.execution.by_tool || {})
              .sort(([, a]: any, [, b]: any) => b.total - a.total)
              .slice(0, 8)
              .map(([tool, stats]: [string, any]) => {
                const rate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
                return (
                  <div key={tool} className="flex items-center gap-3">
                    <span className="text-xs text-ouro-muted w-28 truncate">{tool}</span>
                    <div className="flex-1 h-2 bg-ouro-bg/50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-ouro-success/60" style={{ width: `${rate}%` }} />
                    </div>
                    <span className="text-[10px] text-ouro-muted/60 w-16 text-right">{stats.total} runs</span>
                  </div>
                );
              })}
          </div>
          <div className="mt-3 text-[10px] text-ouro-muted/40">
            Avg execution: {data.execution.avg_duration_ms}ms
          </div>
        </section>
      </div>

      {/* Feedback & Satisfaction */}
      <section className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20 mb-6">
        <h2 className="text-sm font-semibold mb-4">Feedback & Satisfaction</h2>
        <div className="grid grid-cols-4 gap-4">
          <FeedbackMetric label="Accept" value={data.feedback.accept_rate} icon={<ArrowUp size={12} />} good />
          <FeedbackMetric label="Modify" value={data.feedback.modify_rate} icon={<Activity size={12} />} />
          <FeedbackMetric label="Reject" value={data.feedback.reject_rate} icon={<ArrowDown size={12} />} bad />
          <FeedbackMetric label="Satisfaction" value={data.feedback.avg_satisfaction} icon={<TrendingUp size={12} />} good />
        </div>
      </section>

      {/* Pattern Insights */}
      <section className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20">
        <h2 className="text-sm font-semibold mb-4">Pattern Insights</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(data.patterns.by_type || {}).map(([type, count]) => (
            <div key={type} className="bg-ouro-bg/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-ouro-accent">{count as number}</div>
              <div className="text-[10px] text-ouro-muted mt-1">{type.replace(/_/g, ' ')}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <span className="text-[10px] text-ouro-muted/40">Top domains:</span>
          {(data.patterns.top_domains || []).map((d: string) => (
            <span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-ouro-accent/10 text-ouro-accent">{d}</span>
          ))}
        </div>
      </section>
    </main>
  );
}

function MetricCard({ icon, label, value, sub, color }: any) {
  const colorMap: Record<string, string> = {
    accent: 'text-ouro-accent', success: 'text-ouro-success',
    warning: 'text-yellow-400', info: 'text-blue-400',
  };
  return (
    <div className="bg-ouro-surface/30 rounded-xl p-4 border border-ouro-border/20">
      <div className="flex items-center gap-2 mb-2">
        <span className={colorMap[color] || 'text-ouro-muted'}>{icon}</span>
        <span className="text-xs text-ouro-muted">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] text-ouro-muted/50 mt-1">{sub}</div>
    </div>
  );
}

function FeedbackMetric({ label, value, icon, good, bad }: any) {
  const pct = Math.round(value * 100);
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${good ? 'text-ouro-success' : bad ? 'text-red-400' : 'text-ouro-muted'}`}>
        {pct}%
      </div>
      <div className="flex items-center justify-center gap-1 text-[10px] text-ouro-muted mt-1">
        {icon} {label}
      </div>
    </div>
  );
}

function LoadingState() {
  return <div className="min-h-screen flex items-center justify-center"><span className="text-ouro-muted animate-pulse">Loading analytics...</span></div>;
}

function EmptyState() {
  return <div className="min-h-screen flex items-center justify-center"><span className="text-ouro-muted">No analytics data yet. Start emitting signals.</span></div>;
}

function mockData(): AnalyticsData {
  return {
    signals: { total: 0, today: 0, this_week: 0, by_modality: {}, by_hour: Array(24).fill(0) },
    intents: { total: 0, distribution: {}, avg_confidence: 0 },
    execution: { total: 0, success_rate: 0, avg_duration_ms: 0, by_tool: {} },
    feedback: { total: 0, accept_rate: 0, modify_rate: 0, reject_rate: 0, avg_satisfaction: 0 },
    evolution: { total_cycles: 0, total_events: 0, phase: 'symbiosis', improvements: 0 },
    patterns: { total: 0, by_type: {}, top_domains: [] },
  };
}
