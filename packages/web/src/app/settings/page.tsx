'use client';
import { useEffect, useState } from 'react';
import { getSystemInfo, getTools, registerTool, generateToolFromDesc, triggerEvolution } from '@/lib/api-client';
import { ArrowLeft, Wrench, Plus, Zap, Database, Brain, Shield, Globe, RefreshCw, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [system, setSystem] = useState<any>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [newToolUrl, setNewToolUrl] = useState('');
  const [newToolDesc, setNewToolDesc] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const refresh = async () => {
    const [sys, t] = await Promise.all([getSystemInfo(), getTools()]);
    setSystem(sys);
    setTools(t.tools || []);
  };

  useEffect(() => { refresh(); }, []);

  const handleRegisterTool = async () => {
    if (!newToolUrl.trim()) return;
    setLoading('register');
    await registerTool(newToolUrl.trim());
    setNewToolUrl('');
    await refresh();
    setLoading(null);
  };

  const handleGenerateTool = async () => {
    if (!newToolDesc.trim()) return;
    setLoading('generate');
    await generateToolFromDesc(newToolDesc.trim());
    setNewToolDesc('');
    await refresh();
    setLoading(null);
  };

  const handleTriggerEvolution = async () => {
    setLoading('evolve');
    await triggerEvolution();
    await refresh();
    setLoading(null);
  };

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-ouro-border/50">
        <a href="/" className="text-ouro-muted hover:text-ouro-text"><ArrowLeft size={20} /></a>
        <h1 className="font-bold text-lg">System Settings</h1>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* System State */}
        <Section title="System State" icon={<Database size={16} />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Signals" value={system?.metrics?.signals || 0} />
            <Stat label="Artifacts" value={system?.metrics?.artifacts || 0} />
            <Stat label="Patterns" value={system?.metrics?.patterns || 0} />
            <Stat label="Tools" value={system?.metrics?.tools || tools.length} />
          </div>
          <div className="mt-3 p-3 rounded-lg bg-ouro-bg text-xs font-mono text-ouro-muted overflow-auto max-h-40">
            {JSON.stringify(system?.state, null, 2)}
          </div>
        </Section>

        {/* Tool Management */}
        <Section title="Tools" icon={<Wrench size={16} />}>
          <div className="space-y-2 mb-4">
            {tools.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-ouro-bg border border-ouro-border/30">
                <div>
                  <div className="text-sm font-medium text-ouro-text">{t.name}</div>
                  <div className="text-xs text-ouro-muted font-mono">{t.id}</div>
                </div>
                <div className="flex gap-1">
                  {t.capabilities?.slice(0, 3).map((c: string) => (
                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-ouro-accent/10 text-ouro-accent">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 p-4 rounded-xl bg-ouro-bg border border-ouro-border/30">
            <h4 className="text-xs font-semibold text-ouro-muted uppercase tracking-wider">Add Tool</h4>
            <div className="flex gap-2">
              <input value={newToolUrl} onChange={e => setNewToolUrl(e.target.value)}
                placeholder="Remote tool URL (MCP-compatible)"
                className="flex-1 bg-ouro-surface border border-ouro-border rounded-lg px-3 py-2 text-sm text-ouro-text" />
              <button onClick={handleRegisterTool} disabled={loading === 'register'}
                className="px-3 py-2 rounded-lg bg-ouro-accent text-white text-sm disabled:opacity-50">
                {loading === 'register' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              </button>
            </div>
            <div className="flex gap-2">
              <input value={newToolDesc} onChange={e => setNewToolDesc(e.target.value)}
                placeholder="Describe a capability — AI will generate the tool"
                className="flex-1 bg-ouro-surface border border-ouro-border rounded-lg px-3 py-2 text-sm text-ouro-text" />
              <button onClick={handleGenerateTool} disabled={loading === 'generate'}
                className="px-3 py-2 rounded-lg bg-ouro-success/80 text-white text-sm disabled:opacity-50">
                {loading === 'generate' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              </button>
            </div>
          </div>
        </Section>

        {/* Evolution Controls */}
        <Section title="Evolution Engine" icon={<Brain size={16} />}>
          <div className="flex items-center justify-between p-4 rounded-xl bg-ouro-bg border border-ouro-border/30">
            <div>
              <div className="text-sm font-medium">Phase: {system?.state?.meme_phase || 'symbiosis'}</div>
              <div className="text-xs text-ouro-muted">Cycle count: {system?.state?.evolution_cycle_count || 0}</div>
            </div>
            <button onClick={handleTriggerEvolution} disabled={loading === 'evolve'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ouro-accent/10 text-ouro-accent text-sm hover:bg-ouro-accent/20">
              {loading === 'evolve' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Trigger Evolution
            </button>
          </div>
          {system?.personal_model && (
            <div className="mt-3 p-3 rounded-lg bg-ouro-bg text-xs font-mono text-ouro-muted overflow-auto max-h-60">
              <div className="text-ouro-accent mb-1">Personal Model:</div>
              {JSON.stringify(system.personal_model, null, 2)}
            </div>
          )}
        </Section>

        {/* Endpoints */}
        <Section title="Signal Endpoints" icon={<Globe size={16} />}>
          <div className="space-y-2">
            {[
              { name: 'Web App', url: 'http://localhost:3000', status: 'active' },
              { name: 'REST API', url: 'POST /api/signals', status: 'active' },
              { name: 'WebSocket', url: 'ws://localhost:3001/ws', status: 'active' },
              { name: 'Webhook', url: 'POST /api/webhook/:source', status: 'active' },
              { name: 'CLI', url: 'ouro "signal text"', status: 'active' },
              { name: 'Telegram Bot', url: 'POST /api/telegram/webhook', status: process.env.TELEGRAM_BOT_TOKEN ? 'active' : 'not configured' },
              { name: 'Email Inbound', url: 'POST /api/email/inbound', status: 'active' },
            ].map(ep => (
              <div key={ep.name} className="flex items-center justify-between p-3 rounded-lg bg-ouro-bg border border-ouro-border/30">
                <div>
                  <div className="text-sm font-medium text-ouro-text">{ep.name}</div>
                  <div className="text-xs text-ouro-muted font-mono">{ep.url}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ep.status === 'active' ? 'bg-ouro-success/10 text-ouro-success' : 'bg-ouro-border text-ouro-muted'}`}>
                  {ep.status}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ouro-muted mb-3">{icon}{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-lg bg-ouro-bg border border-ouro-border/30 text-center">
      <div className="text-lg font-bold text-ouro-text">{value}</div>
      <div className="text-xs text-ouro-muted">{label}</div>
    </div>
  );
}
