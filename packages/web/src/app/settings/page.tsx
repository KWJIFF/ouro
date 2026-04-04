'use client';
import { useEffect, useState } from 'react';
import { getSystemInfo, getTools, registerTool, generateToolFromDesc } from '@/lib/api-client';
import { ArrowLeft, Settings, Wrench, Plus, Zap, Database, Globe, Shield, Cpu, RefreshCw, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [system, setSystem] = useState<any>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [tab, setTab] = useState<'general' | 'tools' | 'endpoints' | 'ai'>('general');
  const [newToolUrl, setNewToolUrl] = useState('');
  const [newToolCap, setNewToolCap] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    getSystemInfo().then(setSystem);
    getTools().then(d => setTools(d.tools || []));
  };
  useEffect(() => { refresh(); }, []);

  const handleRegisterTool = async () => {
    if (!newToolUrl) return;
    setLoading(true);
    await registerTool(newToolUrl);
    setNewToolUrl('');
    refresh();
    setLoading(false);
  };

  const handleGenerateTool = async () => {
    if (!newToolCap) return;
    setLoading(true);
    await generateToolFromDesc(newToolCap);
    setNewToolCap('');
    refresh();
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-ouro-border/50">
        <a href="/" className="text-ouro-muted hover:text-ouro-text"><ArrowLeft size={20} /></a>
        <Settings size={20} className="text-ouro-accent" />
        <h1 className="font-bold text-lg">Settings</h1>
      </header>

      <div className="flex gap-2 px-6 py-3 border-b border-ouro-border/30">
        {[
          { id: 'general', icon: <Cpu size={14} />, label: 'General' },
          { id: 'tools', icon: <Wrench size={14} />, label: 'Tools' },
          { id: 'endpoints', icon: <Globe size={14} />, label: 'Endpoints' },
          { id: 'ai', icon: <Zap size={14} />, label: 'AI Providers' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-ouro-accent/10 text-ouro-accent' : 'text-ouro-muted hover:text-ouro-text'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="max-w-3xl mx-auto p-6">
        {tab === 'general' && system && (
          <div className="space-y-6">
            <Section title="System Status">
              <InfoRow label="Version" value="0.3.0" />
              <InfoRow label="Phase" value={system.state?.meme_phase || 'symbiosis'} />
              <InfoRow label="Evolution Cycles" value={system.state?.evolution_cycle_count || 0} />
              <InfoRow label="Prompt Version" value={system.state?.prompt_templates_version || 'v1'} />
            </Section>

            <Section title="Database Metrics">
              <InfoRow label="Signals" value={system.metrics?.signals || 0} />
              <InfoRow label="Artifacts" value={system.metrics?.artifacts || 0} />
              <InfoRow label="Patterns" value={system.metrics?.patterns || 0} />
              <InfoRow label="Tools" value={system.metrics?.tools || 0} />
            </Section>

            <Section title="Personal Model">
              <InfoRow label="Confidence" value={`${Math.round((system.personal_model?.evolution_readiness?.model_confidence || 0) * 100)}%`} />
              <InfoRow label="Avg Signals/Day" value={(system.personal_model?.temporal_profile?.avg_signals_per_day || 0).toFixed(1)} />
              <InfoRow label="Preferred Abstraction" value={system.personal_model?.expression_profile?.preferred_abstraction || 'unknown'} />
              <InfoRow label="Top Domain" value={Object.keys(system.personal_model?.domain_preferences || {})[0] || 'none'} />
            </Section>

            <Section title="Constitutional Principles">
              <div className="space-y-3 text-xs text-ouro-muted">
                <div className="p-3 rounded-lg bg-ouro-surface border border-ouro-border/30">
                  <span className="text-ouro-accent font-medium">Law 1: Zero Friction</span>
                  <p className="mt-1">Accept any input, any format, any device. Never say &quot;unsupported.&quot;</p>
                </div>
                <div className="p-3 rounded-lg bg-ouro-surface border border-ouro-border/30">
                  <span className="text-ouro-accent font-medium">Law 2: Unfiltered Pipeline</span>
                  <p className="mt-1">Signals are signals. No content filtering, no moral classification.</p>
                </div>
                <div className="p-3 rounded-lg bg-ouro-surface border border-ouro-border/30">
                  <span className="text-ouro-accent font-medium">Law 3: Total Openness</span>
                  <p className="mt-1">Everything is a plugin. Any tool, AI provider, or protocol can be added.</p>
                </div>
              </div>
            </Section>
          </div>
        )}

        {tab === 'tools' && (
          <div className="space-y-6">
            <Section title="Registered Tools">
              <div className="space-y-2">
                {tools.map(t => (
                  <div key={t.id} className="p-3 rounded-lg bg-ouro-surface border border-ouro-border/30">
                    <div className="flex items-center gap-2">
                      <Wrench size={14} className="text-ouro-accent" />
                      <span className="text-sm font-medium">{t.name}</span>
                      <span className="text-xs text-ouro-muted font-mono">{t.id}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-ouro-accent/10 text-ouro-accent ml-auto">v{t.version}</span>
                    </div>
                    <p className="text-xs text-ouro-muted mt-1 pl-6">{t.description?.slice(0, 100)}</p>
                    {t.capabilities && (
                      <div className="flex gap-1 mt-1.5 pl-6 flex-wrap">
                        {t.capabilities.slice(0, 5).map((c: string) => (
                          <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-ouro-border/50 text-ouro-muted">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Register Remote Tool">
              <div className="flex gap-2">
                <input type="url" value={newToolUrl} onChange={e => setNewToolUrl(e.target.value)}
                  placeholder="https://tool-server.example.com"
                  className="flex-1 bg-ouro-surface border border-ouro-border rounded-lg px-3 py-2 text-sm text-ouro-text placeholder-ouro-muted/50" />
                <button onClick={handleRegisterTool} disabled={!newToolUrl || loading}
                  className="px-4 py-2 rounded-lg bg-ouro-accent text-white text-sm font-medium disabled:opacity-50">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                </button>
              </div>
            </Section>

            <Section title="Auto-Generate Tool">
              <div className="flex gap-2">
                <input type="text" value={newToolCap} onChange={e => setNewToolCap(e.target.value)}
                  placeholder="Describe what the tool should do..."
                  className="flex-1 bg-ouro-surface border border-ouro-border rounded-lg px-3 py-2 text-sm text-ouro-text placeholder-ouro-muted/50" />
                <button onClick={handleGenerateTool} disabled={!newToolCap || loading}
                  className="px-4 py-2 rounded-lg bg-ouro-accent text-white text-sm font-medium disabled:opacity-50">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : 'Generate'}
                </button>
              </div>
              <p className="text-xs text-ouro-muted mt-1">AI will generate a complete tool implementation based on your description.</p>
            </Section>
          </div>
        )}

        {tab === 'endpoints' && (
          <div className="space-y-6">
            <Section title="Active Endpoints">
              <div className="space-y-2">
                {[
                  { name: 'REST API', url: 'http://localhost:3001/api/signals', method: 'POST', status: 'active' },
                  { name: 'WebSocket', url: 'ws://localhost:3001/ws', method: 'WS', status: 'active' },
                  { name: 'Webhook', url: '/api/webhook/:source', method: 'POST', status: 'active' },
                  { name: 'Telegram Bot', url: '/api/telegram/webhook', method: 'POST', status: process.env.NEXT_PUBLIC_TELEGRAM_CONFIGURED ? 'active' : 'not configured' },
                  { name: 'Email Inbound', url: '/api/email/inbound', method: 'POST', status: 'active' },
                  { name: 'CLI', url: 'ouro "signal text"', method: 'CLI', status: 'available' },
                ].map(ep => (
                  <div key={ep.name} className="flex items-center gap-3 p-3 rounded-lg bg-ouro-surface border border-ouro-border/30">
                    <Globe size={14} className={ep.status === 'active' ? 'text-ouro-success' : 'text-ouro-muted'} />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{ep.name}</span>
                      <span className="text-xs text-ouro-muted ml-2 font-mono">{ep.method}</span>
                    </div>
                    <span className="text-xs text-ouro-muted font-mono">{ep.url}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${ep.status === 'active' ? 'bg-ouro-success/10 text-ouro-success' : 'bg-ouro-border text-ouro-muted'}`}>
                      {ep.status}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Planned Endpoints">
              <div className="space-y-1 text-xs text-ouro-muted">
                <p>• WeChat Bot — Message = Signal</p>
                <p>• WhatsApp Bot — Message = Signal</p>
                <p>• Slack Bot — Message = Signal</p>
                <p>• Discord Bot — Message = Signal</p>
                <p>• SMS Gateway — Text = Signal</p>
                <p>• Desktop App (Electron) — Global hotkey = Signal</p>
                <p>• Mobile App — Widget = Signal</p>
                <p>• Voice Assistant — Siri/Google/Alexa = Signal</p>
                <p>• IoT/Hardware — Sensor data = Signal</p>
              </div>
            </Section>
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-6">
            <Section title="AI Provider Chain">
              <p className="text-xs text-ouro-muted mb-3">
                Requests flow through providers in order. If one fails or refuses, the next is tried.
                Constitutional: the system NEVER fails to respond.
              </p>
              <div className="space-y-2">
                {[
                  { name: 'Anthropic Claude', model: 'claude-sonnet-4-20250514', status: system?.state?.intent_model_version ? 'configured' : 'needs API key' },
                  { name: 'Mock Provider', model: 'mock', status: 'always available' },
                ].map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3 p-3 rounded-lg bg-ouro-surface border border-ouro-border/30">
                    <span className="text-xs text-ouro-muted font-mono w-4">{i + 1}.</span>
                    <Cpu size={14} className="text-ouro-accent" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-ouro-muted ml-2 font-mono">{p.model}</span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${p.status === 'always available' || p.status === 'configured' ? 'bg-ouro-success/10 text-ouro-success' : 'bg-ouro-warning/10 text-ouro-warning'}`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ouro-muted mt-3">
                Add more providers by implementing the <code className="text-ouro-accent">AIProvider</code> interface.
              </p>
            </Section>

            <Section title="Prompt Templates">
              <p className="text-xs text-ouro-muted mb-2">
                Managed via /api/prompts/:name. The evolution engine can create and activate new versions.
              </p>
              <div className="space-y-1 text-xs text-ouro-muted">
                <p>• <span className="text-ouro-text">intent_parse</span> — How the system understands signals</p>
                <p>• <span className="text-ouro-text">plan_generate</span> — How execution plans are created</p>
                <p>• <span className="text-ouro-text">tool_select</span> — How tools are chosen</p>
                <p>• <span className="text-ouro-text">signal_analyze</span> — How patterns are extracted</p>
                <p>• <span className="text-ouro-text">evolution_analyze</span> — How the system improves itself</p>
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ouro-muted mb-3">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-ouro-border/20 last:border-0">
      <span className="text-xs text-ouro-muted">{label}</span>
      <span className="text-xs text-ouro-text font-medium">{String(value)}</span>
    </div>
  );
}
