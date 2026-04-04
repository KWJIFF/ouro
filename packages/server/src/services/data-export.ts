import { getMany, query } from '../db/client';

/**
 * Data Export/Import — Portable signal data.
 * 
 * Export formats:
 * - JSON (full fidelity, all metadata)
 * - CSV (signals + intents only, for spreadsheets)
 * - Markdown (human-readable archive)
 * 
 * Import: JSON format only (preserves all data)
 * 
 * Use cases:
 * - Backup before major evolution
 * - Migration between Ouro instances
 * - Analysis in external tools
 * - Sharing anonymized datasets
 */

export interface ExportOptions {
  format: 'json' | 'csv' | 'markdown';
  dateRange?: { from: string; to: string };
  includeArtifacts?: boolean;
  includePatterns?: boolean;
  includeFeedback?: boolean;
  anonymize?: boolean;
}

export async function exportSignals(options: ExportOptions): Promise<string> {
  const whereClause = options.dateRange
    ? `WHERE s.created_at BETWEEN '${options.dateRange.from}' AND '${options.dateRange.to}'`
    : '';

  const signals = await getMany(`
    SELECT s.*, i.intent_type, i.confidence, i.description as intent_description, i.parameters
    FROM signals s
    LEFT JOIN intents i ON i.signal_id = s.id
    ${whereClause}
    ORDER BY s.created_at
  `);

  let artifacts: any[] = [];
  let patterns: any[] = [];
  let feedback: any[] = [];

  if (options.includeArtifacts) {
    artifacts = await getMany(`SELECT * FROM artifacts ORDER BY created_at`);
  }
  if (options.includePatterns) {
    patterns = await getMany(`SELECT * FROM signal_patterns ORDER BY last_seen_at`);
  }
  if (options.includeFeedback) {
    feedback = await getMany(`SELECT * FROM feedback ORDER BY created_at`);
  }

  if (options.anonymize) {
    signals.forEach((s: any) => {
      s.id = hashId(s.id);
      s.context = {};
    });
  }

  switch (options.format) {
    case 'json':
      return JSON.stringify({
        version: '1.0',
        exported_at: new Date().toISOString(),
        data: { signals, artifacts, patterns, feedback },
        meta: {
          signal_count: signals.length,
          artifact_count: artifacts.length,
          pattern_count: patterns.length,
          feedback_count: feedback.length,
        },
      }, null, 2);

    case 'csv':
      return exportCSV(signals);

    case 'markdown':
      return exportMarkdown(signals, artifacts);

    default:
      return JSON.stringify({ signals }, null, 2);
  }
}

function exportCSV(signals: any[]): string {
  const headers = ['id', 'created_at', 'modality', 'status', 'intent_type', 'confidence', 'text'];
  const rows = signals.map((s: any) => [
    s.id,
    s.created_at,
    s.modality,
    s.status,
    s.intent_type || '',
    s.confidence || '',
    `"${(s.normalized_text || '').replace(/"/g, '""')}"`,
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

function exportMarkdown(signals: any[], artifacts: any[]): string {
  let md = `# Ouro Signal Export\n\nExported: ${new Date().toISOString()}\nSignals: ${signals.length}\n\n---\n\n`;

  for (const s of signals) {
    md += `## Signal: ${s.normalized_text?.slice(0, 60) || 'untitled'}\n\n`;
    md += `- **ID**: ${s.id}\n`;
    md += `- **Date**: ${s.created_at}\n`;
    md += `- **Modality**: ${s.modality}\n`;
    md += `- **Status**: ${s.status}\n`;
    if (s.intent_type) md += `- **Intent**: ${s.intent_type} (${Math.round((s.confidence || 0) * 100)}%)\n`;
    md += `\n${s.normalized_text || ''}\n\n`;

    const signalArtifacts = artifacts.filter((a: any) => a.signal_id === s.id);
    if (signalArtifacts.length > 0) {
      md += `### Artifacts\n\n`;
      for (const a of signalArtifacts) {
        md += `#### ${a.artifact_type}: ${a.title}\n\n`;
        md += `${a.metadata?.inline_content || a.description || ''}\n\n`;
      }
    }

    md += `---\n\n`;
  }

  return md;
}

function hashId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return `anon_${Math.abs(hash).toString(36)}`;
}

export interface ImportResult {
  imported: { signals: number; artifacts: number; patterns: number; feedback: number };
  skipped: number;
  errors: string[];
}

export async function importSignals(jsonData: string): Promise<ImportResult> {
  const data = JSON.parse(jsonData);
  const result: ImportResult = {
    imported: { signals: 0, artifacts: 0, patterns: 0, feedback: 0 },
    skipped: 0,
    errors: [],
  };

  if (!data.data?.signals) {
    result.errors.push('Invalid import format: missing data.signals');
    return result;
  }

  for (const signal of data.data.signals) {
    try {
      await query(
        `INSERT INTO signals (id, created_at, modality, raw_content, normalized_text, context, status)
         VALUES ($1, $2, $3, $4, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [signal.id, signal.created_at, signal.modality, signal.normalized_text || signal.raw_content,
         JSON.stringify(signal.context || {}), signal.status || 'completed']
      );
      result.imported.signals++;
    } catch (e: any) {
      result.errors.push(`Signal ${signal.id}: ${e.message}`);
      result.skipped++;
    }
  }

  return result;
}
