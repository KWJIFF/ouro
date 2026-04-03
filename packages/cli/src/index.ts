#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

const API = process.env.OURO_API_URL || 'http://localhost:3001';
const API_KEY = process.env.OURO_API_KEY || '';

const headers: Record<string, string> = { 'Content-Type': 'application/json' };
if (API_KEY) headers['X-Api-Key'] = API_KEY;

async function api(endpoint: string, options?: RequestInit) {
  const r = await fetch(`${API}${endpoint}`, { ...options, headers: { ...headers, ...(options?.headers || {}) } });
  return r.json();
}

const program = new Command();

program
  .name('ouro')
  .description('🐍 Ouro CLI — Emit signals from your terminal')
  .version('0.1.0');

// ouro "build me a landing page"
program
  .argument('[signal...]', 'Signal text')
  .action(async (words: string[]) => {
    if (words.length === 0) { program.help(); return; }
    const text = words.join(' ');
    console.log(`🐍 Signal: "${text}"`);
    console.log('   Processing...\n');

    try {
      const result = await api('/api/signals', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }) as any;

      if (result.status === 'needs_clarification') {
        console.log(`❓ ${result.question}`);
        return;
      }

      console.log(`   Intent: ${result.intent?.type} (${Math.round((result.intent?.confidence || 0) * 100)}%)`);
      console.log(`   ${result.intent?.description}\n`);

      if (result.execution?.steps) {
        for (const step of result.execution.steps) {
          const icon = step.status === 'completed' ? '✅' : step.status === 'failed' ? '❌' : '⏳';
          console.log(`   ${icon} ${step.tool} → ${step.status}`);
        }
      }

      if (result.artifacts?.length > 0) {
        console.log('\n── Artifacts ──────────────────────────\n');
        for (const a of result.artifacts) {
          console.log(`[${a.type || a.metadata?.type || 'output'}]`);
          console.log(a.content || a.metadata?.inline_content || '(no content)');
          console.log('');
        }
      }
    } catch (e: any) {
      console.error(`❌ Error: ${e.message}`);
    }
  });

// ouro signals
program.command('signals')
  .description('List recent signals')
  .option('-n, --limit <n>', 'Number of signals', '10')
  .action(async (opts) => {
    const data = await api(`/api/signals?limit=${opts.limit}`) as any;
    for (const s of data.signals || []) {
      const time = new Date(s.created_at).toLocaleString();
      console.log(`[${s.status}] ${time} (${s.modality}) ${s.normalized_text?.slice(0, 80)}`);
    }
  });

// ouro search <query>
program.command('search <query>')
  .description('Semantic search across signals')
  .action(async (q: string) => {
    const data = await api(`/api/search?q=${encodeURIComponent(q)}`) as any;
    for (const r of data.results || []) {
      console.log(`[${Math.round(r.similarity * 100)}%] ${r.text?.slice(0, 80)}`);
    }
  });

// ouro evolution
program.command('evolution')
  .description('Show evolution stats')
  .action(async () => {
    const data = await api('/api/evolution/stats') as any;
    console.log(`🐍 Phase: ${data.phase}`);
    console.log(`   Cycles: ${data.evolution_cycle_count}`);
    console.log(`   Patterns: ${data.total_patterns}`);
  });

// ouro tools
program.command('tools')
  .description('List registered tools')
  .action(async () => {
    const data = await api('/api/tools') as any;
    for (const t of data.tools || []) {
      console.log(`[${t.id}] ${t.name} — ${t.description?.slice(0, 60)}`);
    }
  });

// ouro file <path> [message]
program.command('file <filepath> [message]')
  .description('Send a file as a signal')
  .action(async (filepath: string, message?: string) => {
    const abs = path.resolve(filepath);
    if (!fs.existsSync(abs)) { console.error(`File not found: ${abs}`); return; }
    const content = fs.readFileSync(abs, 'utf-8');
    const text = `${message || ''}\n[File: ${path.basename(filepath)}]\n${content}`.trim();
    const result = await api('/api/signals', { method: 'POST', body: JSON.stringify({ text }) }) as any;
    console.log(`✅ Signal processed. Artifacts: ${result.artifacts?.length || 0}`);
  });

program.parse();
