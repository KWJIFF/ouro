import { toolRegistry } from './registry';
import { codeGenTool } from './code-gen';
import { webResearchTool } from './web-research';
import { docWriterTool } from './doc-writer';
import { imageGenTool } from './image-gen';
import { dataAnalyzerTool } from './data-analyzer';
import { fileManagerTool } from './file-manager';
import { scanLocalPlugins } from './plugin-loader';
import * as path from 'path';

export function registerBuiltInTools(): void {
  toolRegistry.register(codeGenTool);
  toolRegistry.register(webResearchTool);
  toolRegistry.register(docWriterTool);
  toolRegistry.register(imageGenTool);
  toolRegistry.register(dataAnalyzerTool);
  toolRegistry.register(fileManagerTool);

  console.log(`[Tools] Registered ${toolRegistry.getToolCount()} built-in tools`);

  // Scan for local plugins
  const pluginDir = path.resolve(process.cwd(), 'tools/plugins');
  scanLocalPlugins(pluginDir).then(count => {
    if (count > 0) console.log(`[Tools] Loaded ${count} local plugins`);
  });
}

export { toolRegistry } from './registry';
export { scanLocalPlugins, loadNpmTool, loadRemoteTool, registerInlineTool, generateTool } from './plugin-loader';
