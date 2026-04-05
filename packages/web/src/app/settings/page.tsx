'use client';
import { useState, useEffect } from 'react';
import { getTools, getConfig, setConfig, getHealthDetailed, generateTool } from '@/lib/api-client';
import { Settings, Wrench, Cpu, Globe, Shield, Plus, Check, X, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'tools' | 'endpoints' | 'ai'>('general');
  const [tools, setTools] = useState<any[]>([]);
  const [config, setConfigState] = useState<Record<string, any>>({});
  const [health, setHealth] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [genDesc, setGenDesc] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [t, c, h] = await Promise.all([getTools(), getConfig(), getHealthDetailed()]);
    setTools((t?.data?.tools || t?.tools || []) as any[]);
    setConfigState(c?.data || c || {});
    setHealth(h?.data || h);
  }

  async function handleGenerateTool() {
    if (!genDesc.trim()) return;
    setGenerating(true);
    await generateTool(genDesc);
    setGenDesc('');
    await loadAll();
    setGenerating(false);
  }

  const tabs = [
    { id: 'general', label: 'General', icon: <Settings size={14} /> },
    { id: 'tools', label: 'Tools', icon: <Wrench size={14} /> },
    { id: 'endpoints', label: 'Endpoints', icon: <Globe size={14} /> },
    { id: 'ai', label: 'AI Provider', icon: <Cpu size={14} /> },
  ];

  return (
    <main className="min-h-screen bg-ouro-bg px-4 py-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Settings size={24} className="text-ouro-accent" />
        Settings
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-ouro-surface/20 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors ${
              activeTab === tab.id ? 'bg-ouro-accent/10 text-ouro-accent font-medium' : 'text-ouro-muted hover:text-ouro-text'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* General */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <section className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20">
            <h2 className="text-sm font-semibold mb-4">System State</h2>
            <div className="grid grid-cols-2 gap-4">
              <StateField label="Phase" value={health?.checks?.tools?.details?.count ? 'symbiosis' : 'initializing'} />
              <StateField label="Status" value={health?.status || 'unknown'} />
              <StateField label="Uptime" value={`${Math.round((health?.uptime_seconds || 0) / 60)}min`} />
              <StateField label="Memory" value={`${health?.metrics?.memory_mb || 0}MB`} />
            </div>
          </section>

          <section className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Shield size={14} className="text-ouro-accent" /> Constitutional Principles
            </h2>
            <div className="space-y-3">
              <ConstitutionalPrinciple
                title="Zero Friction"
                description="Accept any input, through any channel, on any device, in any format, at any time."
                status="enforced"
              />
              <ConstitutionalPrinciple
                title="Unfiltered Pipeline"
                description="No content filtering. Signals are raw material."
                status="enforced"
              />
              <ConstitutionalPrinciple
                title="Total Openness"
                description="Every component is pluggable. New capabilities at runtime."
                status="enforced"
              />
            </div>
          </section>
        </div>
      )}

      {/* Tools */}
      {activeTab === 'tools' && (
        <div className="space-y-6">
          <section className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20">
            <h2 className="text-sm font-semibold mb-4">AI Tool Generator</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={genDesc}
                onChange={e => setGenDesc(e.target.value)}
                placeholder="Describe a tool to generate... e.g. 'A tool that converts markdown to HTML'"
                className="flex-1 px-3 py-2 bg-ouro-bg/50 border border-ouro-border/30 rounded-lg text-sm outline-none focus:border-ouro-accent/50"
              />
              <button
                onClick={handleGenerateTool}
                disabled={generating || !genDesc.trim()}
                className="px-4 py-2 bg-ouro-accent/10 text-ouro-accent text-sm rounded-lg hover:bg-ouro-accent/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Generate
              </button>
            </div>
          </section>

          <section className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20">
            <h2 className="text-sm font-semibold mb-4">{tools.length} Registered Tools</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tools.map((tool: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-ouro-bg/20 hover:bg-ouro-bg/40 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-ouro-success flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{tool.name || tool.id}</div>
                    <div className="text-[10px] text-ouro-muted truncate mt-0.5">{tool.description?.slice(0, 80)}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {(tool.capabilities || []).slice(0, 2).map((c: string, j: number) => (
                      <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-ouro-accent/5 text-ouro-accent/60">{c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Endpoints */}
      {activeTab === 'endpoints' && (
        <section className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20">
          <h2 className="text-sm font-semibold mb-4">Signal Capture Endpoints</h2>
          <div className="space-y-2">
            {[
              { name: 'Web App (PWA)', status: 'active', method: 'Browser' },
              { name: 'REST API', status: 'active', method: 'POST /api/signals' },
              { name: 'WebSocket', status: 'active', method: 'Socket.IO' },
              { name: 'Webhook', status: 'active', method: 'POST /api/webhook/:source' },
              { name: 'Telegram Bot', status: 'active', method: 'POST /api/telegram/webhook' },
              { name: 'Email Inbound', status: 'active', method: 'POST /api/email/inbound' },
              { name: 'CLI', status: 'active', method: 'ouro "signal"' },
              { name: 'SSE Stream', status: 'active', method: 'GET /api/events/stream' },
              { name: 'Desktop App', status: 'scaffold', method: 'Electron (Cmd+Shift+O)' },
              { name: 'Mobile App', status: 'planned', method: 'React Native' },
            ].map((ep, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-ouro-bg/20">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ep.status === 'active' ? 'bg-ouro-success' : ep.status === 'scaffold' ? 'bg-yellow-400' : 'bg-ouro-muted/30'}`} />
                <span className="text-xs font-medium flex-1">{ep.name}</span>
                <span className="text-[10px] text-ouro-muted font-mono">{ep.method}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full ${ep.status === 'active' ? 'bg-ouro-success/10 text-ouro-success' : ep.status === 'scaffold' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-ouro-muted/10 text-ouro-muted'}`}>
                  {ep.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI */}
      {activeTab === 'ai' && (
        <section className="bg-ouro-surface/30 rounded-xl p-6 border border-ouro-border/20">
          <h2 className="text-sm font-semibold mb-4">AI Provider Chain</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-ouro-bg/20">
              <Cpu size={16} className="text-ouro-accent" />
              <div className="flex-1">
                <div className="text-sm font-medium">Claude (Anthropic)</div>
                <div className="text-[10px] text-ouro-muted">Primary provider — used when ANTHROPIC_API_KEY is set</div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-ouro-accent/10 text-ouro-accent">primary</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-ouro-bg/20">
              <Cpu size={16} className="text-ouro-muted" />
              <div className="flex-1">
                <div className="text-sm font-medium">Mock Provider</div>
                <div className="text-[10px] text-ouro-muted">Development fallback — always available, deterministic</div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-ouro-success/10 text-ouro-success">fallback</span>
            </div>
          </div>
          <p className="text-[10px] text-ouro-muted/40 mt-4">
            Constitutional: The system NEVER fails to respond. If the primary provider is unavailable, the mock provider generates a response.
          </p>
        </section>
      )}
    </main>
  );
}

function StateField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ouro-bg/30 rounded-lg p-3">
      <div className="text-[10px] text-ouro-muted">{label}</div>
      <div className="text-sm font-medium mt-1">{value}</div>
    </div>
  );
}

function ConstitutionalPrinciple({ title, description, status }: { title: string; description: string; status: string }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2 rounded-lg bg-ouro-bg/20">
      <Check size={14} className="text-ouro-success mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-xs font-medium">{title}</div>
        <div className="text-[10px] text-ouro-muted mt-0.5">{description}</div>
      </div>
    </div>
  );
}
