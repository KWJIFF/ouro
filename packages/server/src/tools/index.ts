import { toolRegistry } from './registry';
import { codeGenTool } from './code-gen';
import { webResearchTool } from './web-research';
import { docWriterTool } from './doc-writer';
import { imageGenTool } from './image-gen';
import { dataAnalyzerTool } from './data-analyzer';
import { fileManagerTool } from './file-manager';
import { slideBuilderTool } from './slide-builder';
import { apiBuilderTool } from './api-builder';
import { emailWriterTool } from './email-writer';
import { translatorTool } from './translator';
import { businessPlanTool } from './business-plan';
import { uiMockupTool } from './ui-mockup';
import { sqlBuilderTool } from './sql-builder';
import { mindMapTool } from './mind-map';
import { summarizerTool } from './summarizer';
import { debuggerTool } from './debugger';
import { scanLocalPlugins } from './plugin-loader';
import * as path from 'path';

export function registerBuiltInTools(): void {
  // Core tools
  toolRegistry.register(codeGenTool);
  toolRegistry.register(webResearchTool);
  toolRegistry.register(docWriterTool);
  toolRegistry.register(imageGenTool);
  toolRegistry.register(dataAnalyzerTool);
  toolRegistry.register(fileManagerTool);

  // Extended tools
  toolRegistry.register(slideBuilderTool);
  toolRegistry.register(apiBuilderTool);
  toolRegistry.register(emailWriterTool);
  toolRegistry.register(translatorTool);
  toolRegistry.register(businessPlanTool);
  toolRegistry.register(uiMockupTool);
  toolRegistry.register(sqlBuilderTool);
  toolRegistry.register(mindMapTool);
  toolRegistry.register(summarizerTool);
  toolRegistry.register(debuggerTool);

  console.log(`[Tools] Registered ${toolRegistry.getToolCount()} built-in tools`);

  // Scan for local plugins
  const pluginDir = path.resolve(process.cwd(), 'tools/plugins');
  scanLocalPlugins(pluginDir).then(count => {
    if (count > 0) console.log(`[Tools] Loaded ${count} local plugins`);
  });
}

export { toolRegistry } from './registry';
export { scanLocalPlugins, loadNpmTool, loadRemoteTool, registerInlineTool, generateTool } from './plugin-loader';
