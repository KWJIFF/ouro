import type { OuroTool, ToolManifest, ToolInput, ToolOutput } from '@ouro/core';

/**
 * Tool Registry — The meme's capability catalog.
 * 
 * All tools are registered here. The execution planner queries this
 * registry to find the best tool for each task.
 * 
 * Features:
 * - Register/unregister tools at runtime
 * - Find tools by ID, capability, or tag
 * - Track tool usage statistics
 * - Health check all tools
 */

interface ToolEntry {
  tool: OuroTool;
  registeredAt: number;
  usageCount: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  lastUsed: number | null;
}

class ToolRegistry {
  private tools: Map<string, ToolEntry> = new Map();

  register(tool: OuroTool): void {
    this.tools.set(tool.manifest.id, {
      tool,
      registeredAt: Date.now(),
      usageCount: 0,
      successCount: 0,
      failureCount: 0,
      avgDurationMs: 0,
      lastUsed: null,
    });
    console.log(`Tool registered: ${tool.manifest.id} (${tool.manifest.name})`);
  }

  unregister(toolId: string): boolean {
    const deleted = this.tools.delete(toolId);
    if (deleted) console.log(`Tool unregistered: ${toolId}`);
    return deleted;
  }

  getTool(toolId: string): OuroTool | undefined {
    return this.tools.get(toolId)?.tool;
  }

  getToolCount(): number {
    return this.tools.size;
  }

  getAllManifests(): ToolManifest[] {
    return Array.from(this.tools.values()).map(e => e.tool.manifest);
  }

  findByCapability(capability: string): OuroTool[] {
    return Array.from(this.tools.values())
      .filter(e => e.tool.manifest.capabilities.includes(capability))
      .map(e => e.tool);
  }

  findByTag(tag: string): OuroTool[] {
    return Array.from(this.tools.values())
      .filter(e => e.tool.manifest.tags?.includes(tag))
      .map(e => e.tool);
  }

  findByAnyCapability(capabilities: string[]): OuroTool[] {
    return Array.from(this.tools.values())
      .filter(e => capabilities.some(c => e.tool.manifest.capabilities.includes(c)))
      .map(e => e.tool);
  }

  // Record tool usage for analytics and evolution
  recordUsage(toolId: string, success: boolean, durationMs: number): void {
    const entry = this.tools.get(toolId);
    if (!entry) return;

    entry.usageCount++;
    entry.lastUsed = Date.now();
    if (success) {
      entry.successCount++;
    } else {
      entry.failureCount++;
    }

    // Running average of duration
    entry.avgDurationMs = (entry.avgDurationMs * (entry.usageCount - 1) + durationMs) / entry.usageCount;
  }

  getToolStats(): Array<{
    id: string;
    name: string;
    usageCount: number;
    successRate: number;
    avgDurationMs: number;
    lastUsed: string | null;
  }> {
    return Array.from(this.tools.entries())
      .map(([id, entry]) => ({
        id,
        name: entry.tool.manifest.name,
        usageCount: entry.usageCount,
        successRate: entry.usageCount > 0 ? entry.successCount / entry.usageCount : 0,
        avgDurationMs: Math.round(entry.avgDurationMs),
        lastUsed: entry.lastUsed ? new Date(entry.lastUsed).toISOString() : null,
      }))
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [id, entry] of this.tools) {
      try {
        if (entry.tool.healthCheck) {
          results[id] = await entry.tool.healthCheck();
        } else {
          results[id] = true; // No health check = assumed healthy
        }
      } catch {
        results[id] = false;
      }
    }
    return results;
  }
}

export const toolRegistry = new ToolRegistry();
