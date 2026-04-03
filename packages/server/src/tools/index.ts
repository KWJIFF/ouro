import { toolRegistry } from './registry';
import { codeGenTool } from './code-gen';
import { webResearchTool } from './web-research';
import { docWriterTool } from './doc-writer';

export function registerBuiltInTools(): void {
  toolRegistry.register(codeGenTool);
  toolRegistry.register(webResearchTool);
  toolRegistry.register(docWriterTool);
  console.log(`Registered ${toolRegistry.getToolCount()} built-in tools`);
}

export { toolRegistry } from './registry';
