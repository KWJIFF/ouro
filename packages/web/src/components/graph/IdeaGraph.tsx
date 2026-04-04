'use client';
import { useEffect, useRef, useState } from 'react';
import { getIdeaGraph } from '@/lib/api-client';

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  domain?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  strength: number;
  type: string;
}

export default function IdeaGraph({ width = 800, height = 500 }: { width?: number; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGraph();
  }, []);

  async function loadGraph() {
    setLoading(true);
    const response = await getIdeaGraph();
    if (response.success && response.data) {
      const { nodes: rawNodes, edges: rawEdges } = response.data;

      // Layout: force-directed simulation (simplified)
      const layoutNodes = rawNodes.map((n: any, i: number) => {
        const angle = (i / rawNodes.length) * Math.PI * 2;
        const radius = Math.min(width, height) * 0.35;
        return {
          id: n.id,
          label: n.text?.slice(0, 30) || `Signal ${i + 1}`,
          x: width / 2 + Math.cos(angle) * radius * (0.5 + Math.random() * 0.5),
          y: height / 2 + Math.sin(angle) * radius * (0.5 + Math.random() * 0.5),
          radius: 6 + (n.connection_count || 0) * 2,
          color: domainColor(n.domain),
          domain: n.domain,
        };
      });

      setNodes(layoutNodes);
      setEdges(rawEdges || []);
    }
    setLoading(false);
  }

  function domainColor(domain: string): string {
    const colors: Record<string, string> = {
      technology: '#8b5cf6',
      design: '#ec4899',
      business: '#f59e0b',
      writing: '#10b981',
      data: '#3b82f6',
      general: '#6b7280',
    };
    return colors[domain] || colors.general;
  }

  function getNodeById(id: string): GraphNode | undefined {
    return nodes.find(n => n.id === id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <span className="text-ouro-muted text-sm animate-pulse">Loading idea graph...</span>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <span className="text-ouro-muted text-sm">No connections yet. Keep emitting signals.</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <svg ref={svgRef} width={width} height={height} className="bg-ouro-bg/50 rounded-xl">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const source = getNodeById(edge.source);
          const target = getNodeById(edge.target);
          if (!source || !target) return null;

          const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target;

          return (
            <line
              key={i}
              x1={source.x} y1={source.y}
              x2={target.x} y2={target.y}
              stroke={isHighlighted ? '#8b5cf6' : '#ffffff'}
              strokeOpacity={isHighlighted ? 0.6 : 0.08}
              strokeWidth={isHighlighted ? 2 : 1}
              strokeDasharray={edge.type === 'semantic_similarity' ? '4,4' : 'none'}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const isHovered = hoveredNode === node.id;
          const isConnected = hoveredNode && edges.some(
            e => (e.source === hoveredNode && e.target === node.id) ||
                 (e.target === hoveredNode && e.source === node.id)
          );
          const opacity = !hoveredNode ? 1 : isHovered || isConnected ? 1 : 0.2;

          return (
            <g key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer', opacity, transition: 'opacity 0.2s' }}
            >
              <circle
                cx={node.x} cy={node.y} r={node.radius}
                fill={node.color}
                filter={isHovered ? 'url(#glow)' : undefined}
                stroke={isHovered ? '#ffffff' : 'none'}
                strokeWidth={2}
              />
              {(isHovered || node.radius > 10) && (
                <text
                  x={node.x} y={node.y + node.radius + 14}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize={10}
                  fontFamily="monospace"
                >
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex gap-3 bg-ouro-bg/80 px-3 py-1.5 rounded-lg">
        {Object.entries({ technology: '#8b5cf6', design: '#ec4899', business: '#f59e0b', writing: '#10b981', data: '#3b82f6' })
          .map(([domain, color]) => (
            <div key={domain} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-ouro-muted">{domain}</span>
            </div>
          ))}
      </div>

      {/* Stats */}
      <div className="absolute top-3 right-3 text-[10px] text-ouro-muted/50">
        {nodes.length} nodes · {edges.length} edges
      </div>
    </div>
  );
}
