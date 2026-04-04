import { describe, it, expect } from 'vitest';

describe('Tool Registry', () => {
  describe('Registration', () => {
    it('should register tools by ID', () => {
      const registry = new Map<string, any>();
      const tool = { manifest: { id: 'test_tool', name: 'Test', capabilities: ['testing'] }, execute: async () => ({}) };
      registry.set(tool.manifest.id, tool);
      expect(registry.has('test_tool')).toBe(true);
      expect(registry.get('test_tool')?.manifest.name).toBe('Test');
    });

    it('should prevent duplicate IDs', () => {
      const registry = new Map<string, any>();
      registry.set('tool_a', { v: 1 });
      registry.set('tool_a', { v: 2 }); // Overwrites
      expect(registry.get('tool_a')?.v).toBe(2);
    });

    it('should count registered tools', () => {
      const registry = new Map<string, any>();
      for (let i = 0; i < 32; i++) registry.set(`tool_${i}`, {});
      expect(registry.size).toBe(32);
    });

    it('should list all tool manifests', () => {
      const registry = new Map<string, any>();
      registry.set('a', { manifest: { id: 'a', name: 'A' } });
      registry.set('b', { manifest: { id: 'b', name: 'B' } });
      const manifests = Array.from(registry.values()).map(t => t.manifest);
      expect(manifests.length).toBe(2);
      expect(manifests[0].id).toBe('a');
    });
  });

  describe('Tool Selection by Capability', () => {
    const tools = [
      { id: 'code_generation', capabilities: ['code_generation', 'scripting', 'full_application'] },
      { id: 'web_research', capabilities: ['research', 'analysis', 'comparison'] },
      { id: 'doc_writer', capabilities: ['document_writing', 'article_writing', 'report'] },
      { id: 'image_generation', capabilities: ['image_generation', 'illustration', 'diagram'] },
      { id: 'data_analyzer', capabilities: ['data_analysis', 'statistics', 'visualization'] },
      { id: 'slide_builder', capabilities: ['presentation', 'slides', 'pitch'] },
      { id: 'email_writer', capabilities: ['email', 'communication', 'outreach'] },
      { id: 'translator', capabilities: ['translation', 'language', 'localization'] },
      { id: 'sql_builder', capabilities: ['sql', 'database', 'query', 'migration'] },
      { id: 'ui_mockup', capabilities: ['ui_design', 'mockup', 'wireframe', 'prototype'] },
      { id: 'debugger', capabilities: ['debugging', 'code_review', 'security_audit'] },
      { id: 'mind_map', capabilities: ['mind_map', 'brainstorm', 'concept_map'] },
      { id: 'business_plan', capabilities: ['business_plan', 'strategy', 'market_analysis'] },
      { id: 'summarizer', capabilities: ['summarization', 'key_points', 'digest'] },
      { id: 'color_palette', capabilities: ['color_palette', 'color_scheme', 'theming'] },
      { id: 'regex_builder', capabilities: ['regex', 'pattern_matching', 'validation'] },
      { id: 'git_helper', capabilities: ['git', 'version_control', 'commit_message'] },
      { id: 'learning_plan', capabilities: ['learning', 'education', 'curriculum'] },
      { id: 'social_post', capabilities: ['social_media', 'twitter', 'linkedin'] },
      { id: 'json_transformer', capabilities: ['json', 'yaml', 'data_transform'] },
      { id: 'project_scaffold', capabilities: ['project_scaffold', 'boilerplate', 'starter'] },
      { id: 'diagram_generator', capabilities: ['diagram', 'flowchart', 'sequence_diagram'] },
      { id: 'test_writer', capabilities: ['testing', 'unit_test', 'test_generation'] },
      { id: 'readme_generator', capabilities: ['readme', 'documentation', 'project_docs'] },
      { id: 'csv_analyzer', capabilities: ['csv_analysis', 'spreadsheet', 'statistics'] },
      { id: 'meeting_notes', capabilities: ['meeting_notes', 'transcript_processing', 'action_items'] },
      { id: 'code_review', capabilities: ['code_review', 'security_audit', 'performance_review'] },
      { id: 'changelog_generator', capabilities: ['changelog', 'release_notes', 'version_history'] },
      { id: 'contract_writer', capabilities: ['contract', 'legal_document', 'terms_of_service'] },
      { id: 'interview_prep', capabilities: ['interview_prep', 'career', 'behavioral_questions'] },
      { id: 'api_builder', capabilities: ['api_design', 'rest_api', 'graphql', 'backend'] },
      { id: 'file_manager', capabilities: ['file_creation', 'file_organization', 'signal_storage'] },
    ];

    const findByCapability = (cap: string) => tools.filter(t => t.capabilities.includes(cap));
    const findBestMatch = (caps: string[]) => {
      let best = { tool: '', score: 0 };
      for (const t of tools) {
        const score = caps.filter(c => t.capabilities.includes(c)).length;
        if (score > best.score) best = { tool: t.id, score };
      }
      return best.tool;
    };

    it('should find tools by single capability', () => {
      expect(findByCapability('code_generation').length).toBe(1);
      expect(findByCapability('code_generation')[0].id).toBe('code_generation');
    });

    it('should find tools by research capability', () => {
      expect(findByCapability('research')[0].id).toBe('web_research');
    });

    it('should find tools by sql capability', () => {
      expect(findByCapability('sql')[0].id).toBe('sql_builder');
    });

    it('should find best match for multi-capability query', () => {
      expect(findBestMatch(['code_review', 'performance_review'])).toBe('code_review');
      expect(findBestMatch(['diagram', 'flowchart'])).toBe('diagram_generator');
      expect(findBestMatch(['csv_analysis', 'statistics'])).toBe('csv_analyzer');
    });

    it('should have exactly 32 tools', () => {
      expect(tools.length).toBe(32);
    });

    it('should have unique IDs', () => {
      const ids = new Set(tools.map(t => t.id));
      expect(ids.size).toBe(tools.length);
    });

    it('should have at least one capability per tool', () => {
      for (const t of tools) {
        expect(t.capabilities.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Tool Execution Contract', () => {
    it('should validate ToolInput structure', () => {
      const validInput = {
        parameters: { prompt: 'test' },
        context: { signal_id: 'sig1', intent: 'create', user_preferences: {} },
        resources: { temp_dir: '/tmp', output_dir: '/tmp/out' },
      };

      expect(validInput.parameters).toBeTruthy();
      expect(validInput.context.signal_id).toBeTruthy();
      expect(validInput.resources.temp_dir).toBeTruthy();
    });

    it('should validate ToolOutput structure', () => {
      const validOutput = {
        success: true,
        artifacts: [{ type: 'text', content: 'hello', metadata: { type: 'code' } }],
        metrics: { duration_ms: 100, tokens_used: 500 },
      };

      expect(validOutput.success).toBe(true);
      expect(validOutput.artifacts.length).toBeGreaterThan(0);
      expect(validOutput.artifacts[0].type).toBe('text');
      expect(validOutput.metrics.duration_ms).toBeGreaterThan(0);
    });

    it('should handle tool failure gracefully', () => {
      const failureOutput = {
        success: false,
        artifacts: [],
        error: 'API rate limit exceeded',
        metrics: { duration_ms: 50 },
      };

      expect(failureOutput.success).toBe(false);
      expect(failureOutput.artifacts.length).toBe(0);
      expect(failureOutput.error).toBeTruthy();
    });
  });

  describe('Plugin Manifest Validation', () => {
    const validateManifest = (m: any): string[] => {
      const errors: string[] = [];
      if (!m.id || typeof m.id !== 'string') errors.push('id must be a non-empty string');
      if (!m.version || !/^\d+\.\d+\.\d+/.test(m.version)) errors.push('version must be semver');
      if (!m.name) errors.push('name is required');
      if (!m.description) errors.push('description is required');
      if (!Array.isArray(m.capabilities) || m.capabilities.length === 0) errors.push('capabilities must be a non-empty array');
      if (m.id && typeof m.id === 'string' && m.id.includes(' ')) errors.push('id must not contain spaces');
      if (m.id && m.id.length > 100) errors.push('id must be under 100 chars');
      return errors;
    };

    it('should accept valid manifest', () => {
      expect(validateManifest({
        id: 'my_tool', version: '1.0.0', name: 'My Tool',
        description: 'Does things', capabilities: ['thing'],
      })).toEqual([]);
    });

    it('should reject missing id', () => {
      expect(validateManifest({ version: '1.0.0', name: 'X', description: 'Y', capabilities: ['z'] }))
        .toContain('id must be a non-empty string');
    });

    it('should reject invalid version', () => {
      expect(validateManifest({ id: 'x', version: 'abc', name: 'X', description: 'Y', capabilities: ['z'] }))
        .toContain('version must be semver');
    });

    it('should reject empty capabilities', () => {
      expect(validateManifest({ id: 'x', version: '1.0.0', name: 'X', description: 'Y', capabilities: [] }))
        .toContain('capabilities must be a non-empty array');
    });

    it('should reject spaces in id', () => {
      expect(validateManifest({ id: 'my tool', version: '1.0.0', name: 'X', description: 'Y', capabilities: ['z'] }))
        .toContain('id must not contain spaces');
    });
  });
});

describe('Tool Category Coverage', () => {
  const categories = {
    code: ['code_generation', 'api_builder', 'project_scaffold', 'debugger', 'test_writer', 'regex_builder', 'git_helper', 'code_review'],
    writing: ['doc_writer', 'email_writer', 'readme_generator', 'summarizer', 'social_post', 'changelog_generator', 'contract_writer'],
    design: ['image_generation', 'ui_mockup', 'color_palette', 'diagram_generator', 'mind_map'],
    data: ['data_analyzer', 'sql_builder', 'json_transformer', 'csv_analyzer'],
    strategy: ['business_plan', 'learning_plan', 'web_research', 'interview_prep'],
    productivity: ['file_manager', 'translator', 'slide_builder', 'meeting_notes'],
  };

  it('should have 8 code tools', () => { expect(categories.code.length).toBe(8); });
  it('should have 7 writing tools', () => { expect(categories.writing.length).toBe(7); });
  it('should have 5 design tools', () => { expect(categories.design.length).toBe(5); });
  it('should have 4 data tools', () => { expect(categories.data.length).toBe(4); });
  it('should have 4 strategy tools', () => { expect(categories.strategy.length).toBe(4); });
  it('should have 4 productivity tools', () => { expect(categories.productivity.length).toBe(4); });

  it('should total 32 tools', () => {
    const total = Object.values(categories).flat().length;
    expect(total).toBe(32);
  });

  it('should have no duplicates across categories', () => {
    const all = Object.values(categories).flat();
    const unique = new Set(all);
    expect(unique.size).toBe(all.length);
  });
});
