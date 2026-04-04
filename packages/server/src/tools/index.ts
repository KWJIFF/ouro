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
import { projectScaffoldTool } from './project-scaffold';
import { diagramGenTool } from './diagram-gen';
import { testWriterTool } from './test-writer';
import { readmeGenTool } from './readme-gen';
import { colorPaletteTool } from './color-palette';
import { regexBuilderTool } from './regex-builder';
import { gitHelperTool } from './git-helper';
import { learningPlanTool } from './learning-plan';
import { socialPostTool } from './social-post';
import { jsonTransformerTool } from './json-transformer';
import { scanLocalPlugins } from './plugin-loader';
import * as path from 'path';

export function registerBuiltInTools(): void {
  const tools = [
    codeGenTool, webResearchTool, docWriterTool, imageGenTool,
    dataAnalyzerTool, fileManagerTool, slideBuilderTool, apiBuilderTool,
    emailWriterTool, translatorTool, businessPlanTool, uiMockupTool,
    sqlBuilderTool, mindMapTool, summarizerTool, debuggerTool,
    projectScaffoldTool, diagramGenTool, testWriterTool, readmeGenTool,
    colorPaletteTool, regexBuilderTool, gitHelperTool, learningPlanTool,
    socialPostTool, jsonTransformerTool,
  ];
  for (const tool of tools) toolRegistry.register(tool);
  console.log(`[Tools] Registered ${toolRegistry.getToolCount()} built-in tools`);

  const pluginDir = path.resolve(process.cwd(), 'tools/plugins');
  scanLocalPlugins(pluginDir).then(count => {
    if (count > 0) console.log(`[Tools] Loaded ${count} local plugins`);
  });
}

export { toolRegistry } from './registry';
export { scanLocalPlugins, loadNpmTool, loadRemoteTool, registerInlineTool, generateTool } from './plugin-loader';
