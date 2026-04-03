import * as fs from 'fs';
import * as path from 'path';
import { toolRegistry } from './registry';
import type { OuroTool, ToolManifest, ToolInput, ToolOutput } from '@ouro/core';
import { callAI } from '../ai/llm-client';
import { generateId } from '@ouro/core';

/**
 * Six methods to load tools into the registry:
 * 1. Local directory scan
 * 2. npm package import
 * 3. Docker container proxy
 * 4. Remote URL (MCP-compatible)
 * 5. Inline function registration
 * 6. AI auto-generation
 */

// === 1. Local Directory Scan ===
export async function scanLocalPlugins(dir: string): Promise<number> {
  let loaded = 0;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return 0;
  }

  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const manifestPath = path.join(dir, entry, 'manifest.json');
    const indexPath = path.join(dir, entry, 'index.js');

    if (fs.existsSync(manifestPath) && fs.existsSync(indexPath)) {
      try {
        const manifest: ToolManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const module = require(indexPath);
        const tool: OuroTool = { manifest, execute: module.execute || module.default };
        toolRegistry.register(tool);
        loaded++;
        console.log(`[Plugin] Loaded local tool: ${manifest.id}`);
      } catch (e) {
        console.error(`[Plugin] Failed to load ${entry}:`, e);
      }
    }
  }
  return loaded;
}

// === 2. npm Package Import ===
export async function loadNpmTool(packageName: string): Promise<boolean> {
  try {
    const module = require(packageName);
    if (module.manifest && module.execute) {
      toolRegistry.register({ manifest: module.manifest, execute: module.execute });
      console.log(`[Plugin] Loaded npm tool: ${packageName}`);
      return true;
    }
    if (module.default?.manifest) {
      toolRegistry.register(module.default);
      return true;
    }
  } catch (e) {
    console.error(`[Plugin] Failed to load npm package ${packageName}:`, e);
  }
  return false;
}

// === 3. Docker Container Proxy ===
export function createDockerTool(manifest: ToolManifest, containerUrl: string): OuroTool {
  return {
    manifest,
    async execute(input: ToolInput): Promise<ToolOutput> {
      const response = await fetch(`${containerUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(`Docker tool failed: ${response.status}`);
      return response.json() as Promise<ToolOutput>;
    },
    async healthCheck(): Promise<boolean> {
      try {
        const r = await fetch(`${containerUrl}/health`);
        return r.ok;
      } catch { return false; }
    },
  };
}

// === 4. Remote URL (MCP-compatible) ===
export async function loadRemoteTool(url: string): Promise<boolean> {
  try {
    // Fetch manifest
    const manifestRes = await fetch(`${url}/manifest`);
    if (!manifestRes.ok) return false;
    const manifest: ToolManifest = await manifestRes.json();

    const tool: OuroTool = {
      manifest,
      async execute(input: ToolInput): Promise<ToolOutput> {
        const r = await fetch(`${url}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        return r.json() as Promise<ToolOutput>;
      },
    };

    toolRegistry.register(tool);
    console.log(`[Plugin] Loaded remote tool: ${manifest.id} from ${url}`);
    return true;
  } catch (e) {
    console.error(`[Plugin] Failed to load remote tool from ${url}:`, e);
    return false;
  }
}

// === 5. Inline Function Registration ===
export function registerInlineTool(
  id: string,
  name: string,
  description: string,
  capabilities: string[],
  executeFn: (input: ToolInput) => Promise<ToolOutput>,
): void {
  toolRegistry.register({
    manifest: {
      id, version: '0.1.0', name, description, capabilities,
      input_schema: {}, output_schema: {},
    },
    execute: executeFn,
  });
}

// === 6. AI Auto-Generation ===
export async function generateTool(capabilityDescription: string): Promise<OuroTool | null> {
  console.log(`[Plugin] Auto-generating tool for: ${capabilityDescription}`);

  try {
    const response = await callAI([
      {
        role: 'system',
        content: `You are a tool generator. Given a capability description, generate a complete OuroTool implementation.
Output ONLY valid JSON with these fields:
{
  "manifest": { "id": "auto/xxx", "version": "0.1.0", "name": "...", "description": "...", "capabilities": [...], "input_schema": {}, "output_schema": {} },
  "executeCode": "async function execute(input) { ... return { success: true, artifacts: [...] }; }"
}`,
      },
      { role: 'user', content: `Generate a tool for: ${capabilityDescription}` },
    ], { temperature: 0.3, max_tokens: 2000 });

    const clean = response.content.replace(/```json|```/g, '').trim();
    const toolDef = JSON.parse(clean);

    // Create executable function from code string
    const executeFn = new Function('input', 'callAI', `
      const execute = ${toolDef.executeCode};
      return execute(input);
    `);

    const tool: OuroTool = {
      manifest: { ...toolDef.manifest, id: `auto/${generateId().slice(0, 8)}` },
      execute: (input: ToolInput) => executeFn(input, callAI),
    };

    toolRegistry.register(tool);
    console.log(`[Plugin] Auto-generated tool: ${tool.manifest.id} — ${tool.manifest.name}`);
    return tool;
  } catch (e) {
    console.error('[Plugin] Auto-generation failed:', e);
    return null;
  }
}
