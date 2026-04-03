'use client';
import { useEffect, useState } from 'react';
import { getSignals, semanticSearch } from '@/lib/api-client';
import IdeaGraph from '@/components/graph/IdeaGraph';
import { ArrowLeft, MessageSquare, Image, Mic, Video, File, Search, GitBranch, List } from 'lucide-react';

const icons: Record<string, any> = { text: MessageSquare, image: Image, voice: Mic, video: Video, file: File };

export default function HistoryPage() {
  const [tab, setTab] = useState<'timeline' | 'graph' | 'search'>('timeline');
  const [signals, setSignals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getSignals(100).then(d => { setSignals(d.signals || []); setLoading(false); }); }, []);

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const r = await semanticSearch(searchQuery);
    setSearchResults(r.results || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-ouro-border/50">
        <a href="/" className="text-ouro-muted hover:text-ouro-text"><ArrowLeft size={20} /></a>
        <h1 className="font-bold text-lg">Signal History</h1>
        <span className="text-xs text-ouro-muted">{signals.length} signals</span>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 px-6 py-3 border-b border-ouro-border/30">
        {[
          { id: 'timeline', icon: <List size={14} />, label: 'Timeline' },
          { id: 'graph', icon: <GitBranch size={14} />, label: 'Idea Graph' },
          { id: 'search', icon: <Search size={14} />, label: 'Search' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-ouro-accent/10 text-ouro-accent' : 'text-ouro-muted hover:text-ouro-text'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Timeline */}
        {tab === 'timeline' && (
          <div className="space-y-3">
            {loading ? <p className="text-ouro-muted text-center py-12">Loading...</p> :
              signals.length === 0 ? <p className="text-ouro-muted text-center py-12">No signals yet.</p> :
              signals.map((s: any) => {
                const Icon = icons[s.modality] || MessageSquare;
                return (
                  <a key={s.id} href={`/signal/${s.id}`} className="block p-4 rounded-xl bg-ouro-surface border border-ouro-border/50 hover:border-ouro-border transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-ouro-accent/10"><Icon size={16} className="text-ouro-accent" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ouro-text truncate">{s.normalized_text || s.raw_content}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-ouro-muted">{new Date(s.created_at).toLocaleString()}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            s.status === 'completed' ? 'bg-ouro-success/10 text-ouro-success' :
                            s.status === 'failed' ? 'bg-ouro-danger/10 text-ouro-danger' : 'bg-ouro-border text-ouro-muted'
                          }`}>{s.status}</span>
                          <span className="text-xs text-ouro-muted">{s.modality}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })
            }
          </div>
        )}

        {/* Graph */}
        {tab === 'graph' && (
          <div className="rounded-xl bg-ouro-surface border border-ouro-border overflow-hidden">
            <IdeaGraph />
          </div>
        )}

        {/* Search */}
        {tab === 'search' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                placeholder="Search your ideas semantically..."
                className="flex-1 bg-ouro-surface border border-ouro-border rounded-xl px-4 py-3 text-sm text-ouro-text placeholder-ouro-muted/50" />
              <button onClick={doSearch}
                className="px-4 py-3 rounded-xl bg-ouro-accent text-white text-sm font-medium">Search</button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((r: any) => (
                  <a key={r.id} href={`/signal/${r.id}`}
                    className="block p-4 rounded-xl bg-ouro-surface border border-ouro-border/50 hover:border-ouro-border">
                    <p className="text-sm text-ouro-text truncate">{r.text}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-ouro-accent">{Math.round(r.similarity * 100)}% match</span>
                      <span className="text-xs text-ouro-muted">{r.modality} · {new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
