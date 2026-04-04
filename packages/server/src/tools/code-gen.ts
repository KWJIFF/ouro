import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'code_generation',
  version: '0.2.0',
  name: 'Code Generation',
  description: 'Generate code in any programming language. Supports single files, multi-file projects, components, scripts, algorithms, CLIs, libraries, and full applications. Handles TypeScript, Python, Rust, Go, Java, C++, Ruby, PHP, Swift, Kotlin, and more.',
  capabilities: [
    'code_generation', 'scripting', 'project_scaffold', 'api_builder',
    'component', 'algorithm', 'cli_tool', 'library', 'full_application',
  ],
  input_schema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'What code to generate' },
      language: { type: 'string', description: 'Programming language (auto-detect if empty)' },
      framework: { type: 'string', description: 'Framework/library (React, Express, FastAPI, etc.)' },
      style: { type: 'string', description: 'Code style: production, prototype, minimal, documented, tutorial' },
      include_tests: { type: 'boolean', description: 'Include test file' },
      include_types: { type: 'boolean', description: 'Include TypeScript types/interfaces' },
      context: { type: 'string', description: 'Existing code context for integration' },
    },
    required: ['prompt'],
  },
  output_schema: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            content: { type: 'string' },
            language: { type: 'string' },
          },
        },
      },
    },
  },
  requirements: { timeout_ms: 30000 },
  tags: ['code', 'development', 'engineering'],
};

export const codeGenTool: OuroTool = {
  manifest,

  async execute(input: ToolInput): Promise<ToolOutput> {
    const { prompt, language, framework, style, include_tests, include_types, context } = input.parameters;
    const startTime = Date.now();

    // Detect if this is a multi-file request
    const isMultiFile = /project|application|app|full|complete|scaffold|structure/i.test(prompt);
    const wantsTests = include_tests || /with tests|include tests|test/i.test(prompt);

    const systemPrompt = buildCodeSystemPrompt({
      language, framework, style, isMultiFile, wantsTests,
      includeTypes: include_types, context,
    });

    const response = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ], {
      temperature: style === 'prototype' ? 0.6 : 0.3,
      max_tokens: 8192,
    });

    // Parse multi-file output if applicable
    const artifacts = parseCodeOutput(response.content, language);

    return {
      success: true,
      artifacts,
      logs: [
        `Language: ${language || 'auto-detected'}`,
        `Framework: ${framework || 'none'}`,
        `Multi-file: ${isMultiFile}`,
        `Tests included: ${wantsTests}`,
      ],
      metrics: {
        duration_ms: Date.now() - startTime,
        tokens_used: response.tokens_used.input + response.tokens_used.output,
      },
    };
  },

  async probe() {
    return {
      languages: [
        'typescript', 'javascript', 'python', 'rust', 'go', 'java',
        'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'dart', 'scala',
        'elixir', 'haskell', 'lua', 'r', 'shell', 'sql',
      ],
      frameworks: [
        'react', 'next.js', 'vue', 'svelte', 'angular',
        'express', 'fastify', 'nest.js', 'koa',
        'fastapi', 'flask', 'django',
        'spring', 'gin', 'actix', 'rocket',
      ],
      styles: ['production', 'prototype', 'minimal', 'documented', 'tutorial'],
    };
  },
};

function buildCodeSystemPrompt(opts: {
  language?: string; framework?: string; style?: string;
  isMultiFile: boolean; wantsTests: boolean;
  includeTypes?: boolean; context?: string;
}): string {
  const parts = ['You are an expert software engineer. Write clean, production-quality code.'];

  if (opts.language) parts.push(`Language: ${opts.language}`);
  if (opts.framework) parts.push(`Framework: ${opts.framework}`);

  // Style guide
  const styleGuides: Record<string, string> = {
    production: 'Write production-ready code: proper error handling, input validation, logging, edge cases handled, comprehensive comments on non-obvious logic.',
    prototype: 'Write a working prototype: focus on core functionality, skip edge cases, minimal error handling, fast to iterate on.',
    minimal: 'Write the absolute minimum code that works. No comments, no extra features, just the core logic.',
    documented: 'Write heavily documented code: JSDoc/docstring on every function, inline comments explaining the approach, README-style header comment.',
    tutorial: 'Write tutorial-style code: numbered steps in comments, explain every concept, include "why" not just "what", build up complexity gradually.',
  };
  parts.push(styleGuides[opts.style || 'production'] || styleGuides.production);

  if (opts.isMultiFile) {
    parts.push(`
This is a multi-file request. Output each file with a header:
--- path/to/file.ext ---
[file content]

Include:
- Main source files
- Configuration files (package.json, tsconfig.json, etc.)
- Entry point
${opts.wantsTests ? '- Test files' : ''}
${opts.includeTypes ? '- Type definition files' : ''}`);
  } else {
    parts.push('Output ONLY the code. No markdown fences unless multiple files.');
  }

  if (opts.wantsTests) {
    parts.push('Include a comprehensive test file covering: happy path, edge cases, error handling.');
  }

  if (opts.context) {
    parts.push(`\nExisting code context (integrate with this):\n${opts.context}`);
  }

  return parts.join('\n');
}

function parseCodeOutput(content: string, language?: string): Array<{ type: 'text' | 'file'; content: any; metadata: Record<string, any> }> {
  // Check for multi-file output pattern
  const filePattern = /^--- (.+?) ---$/gm;
  const matches = [...content.matchAll(filePattern)];

  if (matches.length > 1) {
    // Multi-file output
    const files: Array<{ type: 'text'; content: string; metadata: Record<string, any> }> = [];
    for (let i = 0; i < matches.length; i++) {
      const filePath = matches[i][1];
      const startIdx = matches[i].index! + matches[i][0].length;
      const endIdx = i < matches.length - 1 ? matches[i + 1].index! : content.length;
      const fileContent = content.slice(startIdx, endIdx).trim();

      const ext = filePath.split('.').pop() || '';
      const langMap: Record<string, string> = {
        ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
        py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
        php: 'php', swift: 'swift', kt: 'kotlin', json: 'json', yaml: 'yaml',
        yml: 'yaml', md: 'markdown', css: 'css', html: 'html', sql: 'sql',
      };

      files.push({
        type: 'text',
        content: fileContent,
        metadata: {
          type: 'code',
          path: filePath,
          language: langMap[ext] || language || ext,
          multi_file: true,
          file_index: i,
          total_files: matches.length,
        },
      });
    }
    return files;
  }

  // Single file output
  return [{
    type: 'text',
    content: content.replace(/^```\w*\n?|\n?```$/g, '').trim(),
    metadata: {
      type: 'code',
      language: language || 'auto',
      multi_file: false,
    },
  }];
}
