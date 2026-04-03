import type { OuroTool, ToolManifest } from '@ouro/core';

class ToolRegistry {
  private tools: Map<string, OuroTool> = new Map();

  register(tool: OuroTool): void {
    this.tools.set(tool.manifest.id, tool);
    console.log(`Tool registered: ${tool.manifest.id} (${tool.manifest.name})`);
  }

  unregister(id: string): void {
    this.tools.delete(id);
  }

  getTool(id: string): OuroTool | undefined {
    return this.tools.get(id);
  }

  findTools(query: { capabilities?: string[]; input_type?: string }): OuroTool[] {
    return Array.from(this.tools.values()).filter(tool => {
      if (query.capabilities) {
        return query.capabilities.some(cap => tool.manifest.capabilities.includes(cap));
      }
      return true;
    });
  }

  getAllManifests(): ToolManifest[] {
    return Array.from(this.tools.values()).map(t => t.manifest);
  }

  getToolCount(): number {
    return this.tools.size;
  }
}

export const toolRegistry = new ToolRegistry();
