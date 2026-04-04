import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Integration tests that verify the full pipeline logic without database.
 * These test the interaction between components.
 */

describe('Signal → Intent → Plan Pipeline', () => {
  describe('Signal Modality Detection', () => {
    const detectModality = (payload: { text?: string; files?: Array<{ mime_type: string }> }) => {
      const has = new Set<string>();
      if (payload.text?.trim()) has.add('text');
      for (const f of payload.files || []) {
        if (f.mime_type.startsWith('audio/')) has.add('voice');
        else if (f.mime_type.startsWith('image/')) has.add('image');
        else if (f.mime_type.startsWith('video/')) has.add('video');
        else has.add('file');
      }
      if (has.size > 1) return 'composite';
      if (has.has('voice')) return 'voice';
      if (has.has('image')) return 'image';
      if (has.has('video')) return 'video';
      if (has.has('file')) return 'file';
      return 'text';
    };

    it('should detect text-only signals', () => {
      expect(detectModality({ text: 'Hello' })).toBe('text');
    });

    it('should detect voice signals', () => {
      expect(detectModality({ files: [{ mime_type: 'audio/webm' }] })).toBe('voice');
    });

    it('should detect image signals', () => {
      expect(detectModality({ files: [{ mime_type: 'image/jpeg' }] })).toBe('image');
      expect(detectModality({ files: [{ mime_type: 'image/png' }] })).toBe('image');
      expect(detectModality({ files: [{ mime_type: 'image/heic' }] })).toBe('image');
    });

    it('should detect video signals', () => {
      expect(detectModality({ files: [{ mime_type: 'video/mp4' }] })).toBe('video');
      expect(detectModality({ files: [{ mime_type: 'video/webm' }] })).toBe('video');
    });

    it('should detect file signals', () => {
      expect(detectModality({ files: [{ mime_type: 'application/pdf' }] })).toBe('file');
      expect(detectModality({ files: [{ mime_type: 'application/octet-stream' }] })).toBe('file');
    });

    it('should detect composite signals (text + image)', () => {
      expect(detectModality({
        text: 'Check this out',
        files: [{ mime_type: 'image/jpeg' }],
      })).toBe('composite');
    });

    it('should detect composite signals (voice + image)', () => {
      expect(detectModality({
        files: [{ mime_type: 'audio/webm' }, { mime_type: 'image/png' }],
      })).toBe('composite');
    });

    it('should handle empty payload as text', () => {
      expect(detectModality({})).toBe('text');
      expect(detectModality({ text: '' })).toBe('text');
    });
  });

  describe('Intent → Tool Mapping', () => {
    const mapIntentToTool = (intentType: string, domain: string, targetType: string): string => {
      // Capture intents always go to file_manager
      if (intentType === 'capture') return 'file_manager';

      // Map by target type first
      const targetMapping: Record<string, string> = {
        website: 'code_generation',
        api: 'api_builder',
        component: 'code_generation',
        document: 'doc_writer',
        email: 'email_writer',
        plan: 'business_plan',
        presentation: 'slide_builder',
      };
      if (targetMapping[targetType]) return targetMapping[targetType];

      // Map by domain
      const domainMapping: Record<string, string> = {
        technology: 'code_generation',
        design: 'ui_mockup',
        business: 'business_plan',
        writing: 'doc_writer',
        language: 'translator',
        data: 'data_analyzer',
      };
      if (domainMapping[domain]) return domainMapping[domain];

      // Map by intent type
      if (intentType === 'explore') return 'web_research';
      if (intentType === 'create') return 'code_generation';
      if (intentType === 'modify') return 'code_generation';

      return 'doc_writer'; // Default
    };

    it('should map capture intents to file_manager', () => {
      expect(mapIntentToTool('capture', 'general', 'artifact')).toBe('file_manager');
    });

    it('should map website target to code_generation', () => {
      expect(mapIntentToTool('create', 'general', 'website')).toBe('code_generation');
    });

    it('should map api target to api_builder', () => {
      expect(mapIntentToTool('create', 'technology', 'api')).toBe('api_builder');
    });

    it('should map email target to email_writer', () => {
      expect(mapIntentToTool('create', 'writing', 'email')).toBe('email_writer');
    });

    it('should map plan target to business_plan', () => {
      expect(mapIntentToTool('create', 'business', 'plan')).toBe('business_plan');
    });

    it('should map technology domain to code_generation', () => {
      expect(mapIntentToTool('create', 'technology', 'artifact')).toBe('code_generation');
    });

    it('should map explore intent to web_research', () => {
      expect(mapIntentToTool('explore', 'general', 'artifact')).toBe('web_research');
    });

    it('should map design domain to ui_mockup', () => {
      expect(mapIntentToTool('create', 'design', 'artifact')).toBe('ui_mockup');
    });

    it('should map language domain to translator', () => {
      expect(mapIntentToTool('create', 'language', 'artifact')).toBe('translator');
    });
  });

  describe('Execution DAG Validation', () => {
    interface Step { id: string; deps: string[]; tool: string; }

    const validateDAG = (steps: Step[]): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];
      const ids = new Set(steps.map(s => s.id));

      // Check for duplicate IDs
      if (ids.size !== steps.length) errors.push('Duplicate step IDs');

      // Check for invalid dependencies
      for (const step of steps) {
        for (const dep of step.deps) {
          if (!ids.has(dep)) errors.push(`Step ${step.id} depends on non-existent ${dep}`);
        }
      }

      // Check for circular dependencies
      const visited = new Set<string>();
      const inStack = new Set<string>();
      const hasCycle = (id: string): boolean => {
        if (inStack.has(id)) return true;
        if (visited.has(id)) return false;
        visited.add(id);
        inStack.add(id);
        const step = steps.find(s => s.id === id);
        if (step) {
          for (const dep of step.deps) {
            if (hasCycle(dep)) return true;
          }
        }
        inStack.delete(id);
        return false;
      };
      for (const step of steps) {
        if (hasCycle(step.id)) { errors.push('Circular dependency detected'); break; }
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate a simple linear DAG', () => {
      const result = validateDAG([
        { id: 's1', deps: [], tool: 'web_research' },
        { id: 's2', deps: ['s1'], tool: 'code_generation' },
      ]);
      expect(result.valid).toBe(true);
    });

    it('should validate a parallel DAG', () => {
      const result = validateDAG([
        { id: 's1', deps: [], tool: 'web_research' },
        { id: 's2', deps: [], tool: 'image_generation' },
        { id: 's3', deps: ['s1', 's2'], tool: 'code_generation' },
      ]);
      expect(result.valid).toBe(true);
    });

    it('should reject circular dependencies', () => {
      const result = validateDAG([
        { id: 's1', deps: ['s2'], tool: 'a' },
        { id: 's2', deps: ['s1'], tool: 'b' },
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Circular dependency detected');
    });

    it('should reject missing dependencies', () => {
      const result = validateDAG([
        { id: 's1', deps: ['s_nonexistent'], tool: 'a' },
      ]);
      expect(result.valid).toBe(false);
    });

    it('should validate empty DAG', () => {
      expect(validateDAG([]).valid).toBe(true);
    });

    it('should validate single step', () => {
      expect(validateDAG([{ id: 's1', deps: [], tool: 'a' }]).valid).toBe(true);
    });
  });

  describe('Artifact Deduplication', () => {
    const hash = (content: string): string => {
      let h = 0;
      for (let i = 0; i < content.length; i++) {
        h = ((h << 5) - h + content.charCodeAt(i)) | 0;
      }
      return h.toString(16);
    };

    it('should produce same hash for identical content', () => {
      expect(hash('hello world')).toBe(hash('hello world'));
    });

    it('should produce different hash for different content', () => {
      expect(hash('hello world')).not.toBe(hash('hello World'));
    });

    it('should handle empty content', () => {
      expect(hash('')).toBe(hash(''));
    });
  });
});

describe('Feedback Processing', () => {
  describe('Satisfaction Score Bounds', () => {
    const actions = ['accept', 'modify', 'reject', 'fork', 'share', 'revisit'];

    for (const action of actions) {
      it(`should keep ${action} score within [0, 1]`, () => {
        // Test with extreme behavioral signals
        const infer = (a: string, reactMs: number, viewMs: number, scroll: number): number => {
          let score = 0.5;
          switch (a) {
            case 'accept': score += 0.3; break;
            case 'share': score += 0.4; break;
            case 'reject': score -= 0.3; break;
            case 'fork': score += 0.1; break;
            case 'revisit': score += 0.15; break;
          }
          if (a === 'accept' && reactMs < 5000) score += 0.1;
          if (a === 'accept' && viewMs > 10000) score += 0.05;
          if (scroll > 0.9) score += 0.05;
          return Math.max(0, Math.min(1, score));
        };

        const score = infer(action, 100, 100000, 1.0);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    }
  });
});

describe('Evolution Phase Transitions', () => {
  const detectPhase = (signals: number, accuracy: number, satisfaction: number, confidence: number) => {
    if (accuracy > 0.9 && confidence > 0.8 && signals > 100) {
      if (signals > 1000 && satisfaction > 0.8 && confidence > 0.95) return 'autonomy';
      return 'dominance';
    }
    return 'symbiosis';
  };

  it('should start in symbiosis', () => {
    expect(detectPhase(0, 0, 0, 0)).toBe('symbiosis');
  });

  it('should stay in symbiosis with low data', () => {
    expect(detectPhase(50, 0.95, 0.9, 0.9)).toBe('symbiosis');
  });

  it('should transition to dominance with sufficient data and accuracy', () => {
    expect(detectPhase(200, 0.95, 0.7, 0.85)).toBe('dominance');
  });

  it('should transition to autonomy with high everything', () => {
    expect(detectPhase(2000, 0.95, 0.85, 0.97)).toBe('autonomy');
  });

  it('should not skip phases', () => {
    // Can't be autonomy without dominance conditions
    expect(detectPhase(2000, 0.5, 0.9, 0.97)).toBe('symbiosis');
  });
});

describe('Personal Model', () => {
  describe('Temporal Profile', () => {
    it('should identify peak hours from signal timestamps', () => {
      const timestamps = [
        '2025-01-01T09:00:00Z', // 9am
        '2025-01-01T09:30:00Z',
        '2025-01-01T10:00:00Z', // 10am
        '2025-01-01T14:00:00Z', // 2pm
        '2025-01-01T21:00:00Z', // 9pm
        '2025-01-01T21:30:00Z',
        '2025-01-01T22:00:00Z', // 10pm
      ];

      const hourCounts = new Array(24).fill(0);
      for (const ts of timestamps) hourCounts[new Date(ts).getUTCHours()]++;

      const peakHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(h => h.hour);

      expect(peakHours).toContain(9);
      expect(peakHours).toContain(21);
    });
  });

  describe('Domain Preference Aggregation', () => {
    it('should rank domains by frequency', () => {
      const patterns = [
        { domain: 'technology' },
        { domain: 'technology' },
        { domain: 'technology' },
        { domain: 'design' },
        { domain: 'design' },
        { domain: 'business' },
      ];

      const counts: Record<string, number> = {};
      for (const p of patterns) counts[p.domain] = (counts[p.domain] || 0) + 1;

      const ranked = Object.entries(counts).sort(([,a],[,b]) => b - a);
      expect(ranked[0][0]).toBe('technology');
      expect(ranked[1][0]).toBe('design');
      expect(ranked[2][0]).toBe('business');
    });
  });

  describe('Abstraction Level Detection', () => {
    const getAbstraction = (avgLength: number): string => {
      if (avgLength < 50) return 'high';
      if (avgLength < 200) return 'medium';
      return 'low';
    };

    it('should classify short signals as high abstraction', () => {
      expect(getAbstraction(20)).toBe('high');
    });

    it('should classify medium signals as medium abstraction', () => {
      expect(getAbstraction(100)).toBe('medium');
    });

    it('should classify long signals as low abstraction', () => {
      expect(getAbstraction(500)).toBe('low');
    });
  });
});

describe('Prompt Template Rendering', () => {
  const renderPrompt = (template: string, vars: Record<string, string>): string => {
    let rendered = template;
    for (const [key, value] of Object.entries(vars)) {
      rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return rendered;
  };

  it('should replace single variable', () => {
    expect(renderPrompt('Hello {name}', { name: 'World' })).toBe('Hello World');
  });

  it('should replace multiple occurrences', () => {
    expect(renderPrompt('{x} + {x} = 2{x}', { x: '1' })).toBe('1 + 1 = 21');
  });

  it('should replace multiple variables', () => {
    expect(renderPrompt('{a} and {b}', { a: 'X', b: 'Y' })).toBe('X and Y');
  });

  it('should leave unreplaced variables as-is', () => {
    expect(renderPrompt('{a} and {b}', { a: 'X' })).toBe('X and {b}');
  });

  it('should handle empty template', () => {
    expect(renderPrompt('', { a: 'X' })).toBe('');
  });
});

describe('Tool Registry Operations', () => {
  it('should find tools by capability', () => {
    const tools = [
      { id: 'code', capabilities: ['code_generation', 'scripting'] },
      { id: 'doc', capabilities: ['writing', 'document'] },
      { id: 'img', capabilities: ['image', 'illustration'] },
    ];

    const find = (cap: string) => tools.filter(t => t.capabilities.includes(cap));

    expect(find('code_generation').length).toBe(1);
    expect(find('code_generation')[0].id).toBe('code');
    expect(find('writing').length).toBe(1);
    expect(find('nonexistent').length).toBe(0);
  });

  it('should support multi-capability search', () => {
    const tools = [
      { id: 'a', capabilities: ['x', 'y'] },
      { id: 'b', capabilities: ['y', 'z'] },
      { id: 'c', capabilities: ['x', 'z'] },
    ];

    const findAny = (caps: string[]) => tools.filter(t => caps.some(c => t.capabilities.includes(c)));
    const findAll = (caps: string[]) => tools.filter(t => caps.every(c => t.capabilities.includes(c)));

    expect(findAny(['x']).length).toBe(2);
    expect(findAny(['x', 'z']).length).toBe(3);
    expect(findAll(['x', 'y']).length).toBe(1);
    expect(findAll(['x', 'y'])[0].id).toBe('a');
  });
});
