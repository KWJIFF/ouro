'use client';
import { useEffect, useState } from 'react';

interface Node { id: string; text: string; modality: string; x?: number; y?: number; }
interface Edge { id: string; source: string; target: string; type: string; strength: number; }

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const COLORS: Record<string, string> = { text: '#6366f1', voice: '#f59e0b', image: '#10b981', video: '#3b82f6', sketch: '#ec4899', file: '#8b5cf6' };

export default function IdeaGraph() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/graph`).then(r => r.json()).then(data => {
      const cx = 400, cy = 250, r = 180;
      const laid = (data.nodes || []).map((n: Node, i: number, arr: Node[]) => ({
        ...n, x: cx + r * Math.cos(2 * Math.PI * i / arr.length), y: cy + r * Math.sin(2 * Math.PI * i / arr.length),
      }));
      setNodes(laid); setEdges(data.edges || []); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-ouro-muted text-center py-12">Loading graph...</div>;
  if (!nodes.length) return <div className="text-ouro-muted text-center py-12">No connections yet.</div>;

  return (
    <svg viewBox="0 0 800 500" className="w-full" style={{ height: 500 }}>
      {edges.map(e => {
        const s = nodes.find(n => n.id === e.source), t = nodes.find(n => n.id === e.target);
        return s && t ? <line key={e.id} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#4a4a50" strokeWidth={Math.max(0.5, e.strength * 2)} /> : null;
      })}
      {nodes.map(n => (
        <g key={n.id} onClick={() => setSelected(n.id === selected ? null : n.id)} className="cursor-pointer">
          <circle cx={n.x} cy={n.y} r={selected === n.id ? 14 : 10} fill={COLORS[n.modality] || '#888'}
            stroke={selected === n.id ? '#fff' : 'none'} strokeWidth={2} />
          <text x={(n.x || 0) + 16} y={(n.y || 0) + 4} fill="#aaa" fontSize={10}>{n.text?.slice(0, 30)}</text>
        </g>
      ))}
    </svg>
  );
}
