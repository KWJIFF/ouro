import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'changelog_generator',
  version: '0.1.0',
  name: 'Changelog Generator',
  description: 'Generate changelogs from git commit history, release notes, or description of changes. Follows Keep a Changelog format with proper semantic versioning. Supports conventional commits.',
  capabilities: ['changelog', 'release_notes', 'version_history', 'semantic_versioning'],
  input_schema: {
    type: 'object',
    properties: {
      changes: { type: 'string', description: 'List of changes, commits, or description' },
      version: { type: 'string', description: 'Version number (e.g., 1.2.0)' },
      previous_version: { type: 'string', description: 'Previous version for comparison' },
      format: { type: 'string', description: 'keepachangelog, conventional, github_release, simple' },
      include_breaking: { type: 'boolean', description: 'Highlight breaking changes' },
    },
    required: ['changes'],
  },
  output_schema: { type: 'object', properties: { changelog: { type: 'string' } } },
  tags: ['changelog', 'release', 'versioning', 'documentation'],
};

export const changelogGenTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { changes, version, previous_version, format, include_breaking } = input.parameters;
    const startTime = Date.now();

    const formats: Record<string, string> = {
      keepachangelog: `Use Keep a Changelog format (keepachangelog.com):
## [${version || 'Unreleased'}] - ${new Date().toISOString().split('T')[0]}
### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security`,

      conventional: `Use Conventional Commits format:
Group by type: feat, fix, docs, style, refactor, perf, test, build, ci, chore
Include scope where identifiable.
Format: type(scope): description`,

      github_release: `Format as a GitHub Release note:
Start with a brief summary paragraph.
Then bullet points grouped by category.
Include contributor mentions where identifiable.
Add migration notes if breaking changes exist.`,

      simple: `Simple bullet-point list grouped as:
🆕 New Features
🔧 Improvements  
🐛 Bug Fixes
⚠️ Breaking Changes (if any)`,
    };

    const response = await callAI([
      {
        role: 'system',
        content: `Generate a changelog/release notes.
${version ? `Version: ${version}` : ''}
${previous_version ? `Previous: ${previous_version}` : ''}
${include_breaking ? 'Highlight any breaking changes prominently.' : ''}

${formats[format || 'keepachangelog'] || formats.keepachangelog}

Parse the changes and categorize them accurately. Be specific about what changed.`,
      },
      { role: 'user', content: changes },
    ], { temperature: 0.3, max_tokens: 4096 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'changelog', version: version || 'unreleased' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};
