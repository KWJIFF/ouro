import { generateId, now } from '@ouro/core';
import { query, getMany, getOne } from '../db/client';

export interface IdeaNode {
  id: string;
  text: string;
  modality: string;
  status: string;
  created_at: string;
  domain?: string;
  intent_type?: string;
}

export interface IdeaEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  strength: number;
}

export interface IdeaGraphData {
  nodes: IdeaNode[];
  edges: IdeaEdge[];
}

export async function getIdeaGraph(rootSignalId?: string, depth: number = 3): Promise<IdeaGraphData> {
  let nodes: IdeaNode[] = [];
  let edges: IdeaEdge[] = [];

  if (rootSignalId) {
    // BFS from root signal
    const visited = new Set<string>();
    const queue: Array<{ id: string; currentDepth: number }> = [{ id: rootSignalId, currentDepth: 0 }];

    while (queue.length > 0) {
      const { id, currentDepth } = queue.shift()!;
      if (visited.has(id) || currentDepth > depth) continue;
      visited.add(id);

      // Get signal
      const signal = await getOne<any>('SELECT id, normalized_text, modality, status, created_at FROM signals WHERE id = $1', [id]);
      if (!signal) continue;

      const intent = await getOne<any>('SELECT intent_type, parameters FROM intents WHERE signal_id = $1 LIMIT 1', [id]);
      nodes.push({
        id: signal.id,
        text: signal.normalized_text?.slice(0, 100),
        modality: signal.modality,
        status: signal.status,
        created_at: signal.created_at,
        domain: intent?.parameters?.domain,
        intent_type: intent?.intent_type,
      });

      // Get connections
      const connections = await getMany<any>(
        `SELECT * FROM idea_connections WHERE source_signal_id = $1 OR target_signal_id = $1`,
        [id]
      );

      for (const conn of connections) {
        edges.push({
          id: conn.id,
          source: conn.source_signal_id,
          target: conn.target_signal_id,
          type: conn.connection_type,
          strength: conn.strength,
        });
        const nextId = conn.source_signal_id === id ? conn.target_signal_id : conn.source_signal_id;
        if (!visited.has(nextId)) {
          queue.push({ id: nextId, currentDepth: currentDepth + 1 });
        }
      }
    }
  } else {
    // Return full graph (limited to recent signals)
    const signals = await getMany<any>(
      'SELECT s.id, s.normalized_text, s.modality, s.status, s.created_at, i.intent_type, i.parameters FROM signals s LEFT JOIN intents i ON i.signal_id = s.id ORDER BY s.created_at DESC LIMIT 100'
    );
    nodes = signals.map((s: any) => ({
      id: s.id,
      text: s.normalized_text?.slice(0, 100),
      modality: s.modality,
      status: s.status,
      created_at: s.created_at,
      domain: s.parameters?.domain,
      intent_type: s.intent_type,
    }));

    const allEdges = await getMany<any>(
      'SELECT * FROM idea_connections ORDER BY strength DESC LIMIT 500'
    );
    edges = allEdges.map((e: any) => ({
      id: e.id,
      source: e.source_signal_id,
      target: e.target_signal_id,
      type: e.connection_type,
      strength: e.strength,
    }));
  }

  return { nodes, edges };
}

export async function createConnection(
  sourceId: string,
  targetId: string,
  type: string,
  strength: number = 0.5,
  createdBy: string = 'user',
): Promise<void> {
  await query(
    `INSERT INTO idea_connections (id, source_signal_id, target_signal_id, connection_type, strength, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (source_signal_id, target_signal_id, connection_type)
     DO UPDATE SET strength = GREATEST(idea_connections.strength, $5)`,
    [generateId(), sourceId, targetId, type, strength, createdBy]
  );
}

export async function getSignalConnections(signalId: string): Promise<IdeaEdge[]> {
  const rows = await getMany<any>(
    'SELECT * FROM idea_connections WHERE source_signal_id = $1 OR target_signal_id = $1 ORDER BY strength DESC',
    [signalId]
  );
  return rows.map((e: any) => ({
    id: e.id, source: e.source_signal_id, target: e.target_signal_id,
    type: e.connection_type, strength: e.strength,
  }));
}
