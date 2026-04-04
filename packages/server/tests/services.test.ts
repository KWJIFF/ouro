import { describe, it, expect } from 'vitest';

describe('Signal Capture Service', () => {
  describe('Multi-modal Text Extraction', () => {
    const extractText = (payload: { text?: string; files?: Array<{ filename: string; mime_type: string }>; urls?: string[] }) => {
      const parts: string[] = [];
      if (payload.text) parts.push(payload.text);
      if (payload.urls) parts.push(...payload.urls.map(u => `[URL: ${u}]`));
      if (payload.files) parts.push(...payload.files.map(f => `[File: ${f.filename} (${f.mime_type})]`));
      return parts.join('\n') || '[empty signal]';
    };

    it('should extract text from text-only payload', () => {
      expect(extractText({ text: 'hello' })).toBe('hello');
    });

    it('should include URLs in extraction', () => {
      const result = extractText({ urls: ['https://example.com'] });
      expect(result).toContain('https://example.com');
    });

    it('should include file metadata', () => {
      const result = extractText({ files: [{ filename: 'doc.pdf', mime_type: 'application/pdf' }] });
      expect(result).toContain('doc.pdf');
      expect(result).toContain('application/pdf');
    });

    it('should combine all sources', () => {
      const result = extractText({
        text: 'Check this',
        urls: ['https://example.com'],
        files: [{ filename: 'img.jpg', mime_type: 'image/jpeg' }],
      });
      expect(result).toContain('Check this');
      expect(result).toContain('https://example.com');
      expect(result).toContain('img.jpg');
    });

    it('should return [empty signal] for empty payload', () => {
      expect(extractText({})).toBe('[empty signal]');
    });
  });

  describe('Context Building', () => {
    it('should merge user context with defaults', () => {
      const build = (userCtx: Record<string, any>) => ({
        timestamp: new Date().toISOString(),
        session_id: 'default-session',
        device: 'unknown',
        ...userCtx,
      });

      const ctx = build({ device: 'mobile', session_id: 'abc' });
      expect(ctx.device).toBe('mobile');
      expect(ctx.session_id).toBe('abc');
      expect(ctx.timestamp).toBeTruthy();
    });
  });
});

describe('Artifact Builder', () => {
  describe('Type Inference', () => {
    const inferType = (meta: Record<string, any>): string => {
      const type = meta?.type?.toLowerCase() || '';
      if (['code', 'script', 'component', 'api'].some(t => type.includes(t))) return 'code';
      if (['image', 'photo', 'illustration'].some(t => type.includes(t))) return 'image';
      if (['document', 'article', 'report', 'markdown'].some(t => type.includes(t))) return 'document';
      if (['website', 'page', 'html'].some(t => type.includes(t))) return 'website';
      if (['data', 'csv', 'json', 'analysis'].some(t => type.includes(t))) return 'data';
      if (['design', 'mockup', 'wireframe'].some(t => type.includes(t))) return 'design';
      return 'other';
    };

    it('should classify code types', () => {
      expect(inferType({ type: 'code' })).toBe('code');
      expect(inferType({ type: 'script' })).toBe('code');
      expect(inferType({ type: 'component' })).toBe('code');
    });

    it('should classify document types', () => {
      expect(inferType({ type: 'document' })).toBe('document');
      expect(inferType({ type: 'article' })).toBe('document');
      expect(inferType({ type: 'markdown' })).toBe('document');
    });

    it('should classify design types', () => {
      expect(inferType({ type: 'mockup' })).toBe('design');
      expect(inferType({ type: 'wireframe' })).toBe('design');
    });

    it('should return other for unknown types', () => {
      expect(inferType({ type: 'xyz' })).toBe('other');
      expect(inferType({})).toBe('other');
    });
  });

  describe('Version Management', () => {
    it('should increment version correctly', () => {
      const versions = [
        { id: 'a1', version: 1, is_latest: false },
        { id: 'a2', version: 2, is_latest: false },
        { id: 'a3', version: 3, is_latest: true },
      ];

      const nextVersion = Math.max(...versions.map(v => v.version)) + 1;
      expect(nextVersion).toBe(4);
    });

    it('should handle first version', () => {
      const versions: any[] = [];
      const nextVersion = versions.length > 0 ? Math.max(...versions.map((v: any) => v.version)) + 1 : 1;
      expect(nextVersion).toBe(1);
    });
  });

  describe('Content Hashing', () => {
    it('should produce consistent hashes', () => {
      const hash = (s: string) => {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
        return h.toString(16);
      };

      expect(hash('test')).toBe(hash('test'));
      expect(hash('a')).not.toBe(hash('b'));
    });
  });
});

describe('Idea Graph Service', () => {
  describe('Graph Construction', () => {
    it('should build adjacency list from edges', () => {
      const edges = [
        { source: 'a', target: 'b', type: 'semantic' },
        { source: 'b', target: 'c', type: 'semantic' },
        { source: 'a', target: 'c', type: 'manual' },
      ];

      const adjacency: Record<string, string[]> = {};
      for (const e of edges) {
        if (!adjacency[e.source]) adjacency[e.source] = [];
        if (!adjacency[e.target]) adjacency[e.target] = [];
        adjacency[e.source].push(e.target);
        adjacency[e.target].push(e.source);
      }

      expect(adjacency['a']).toContain('b');
      expect(adjacency['a']).toContain('c');
      expect(adjacency['b']).toContain('a');
      expect(adjacency['b']).toContain('c');
    });

    it('should find connected components', () => {
      const edges = [
        { source: 'a', target: 'b' },
        { source: 'c', target: 'd' },
      ];

      const nodes = new Set<string>();
      for (const e of edges) { nodes.add(e.source); nodes.add(e.target); }

      const adjacency: Record<string, string[]> = {};
      for (const e of edges) {
        if (!adjacency[e.source]) adjacency[e.source] = [];
        if (!adjacency[e.target]) adjacency[e.target] = [];
        adjacency[e.source].push(e.target);
        adjacency[e.target].push(e.source);
      }

      const visited = new Set<string>();
      const components: string[][] = [];

      for (const node of nodes) {
        if (visited.has(node)) continue;
        const component: string[] = [];
        const queue = [node];
        while (queue.length) {
          const n = queue.shift()!;
          if (visited.has(n)) continue;
          visited.add(n);
          component.push(n);
          for (const neighbor of adjacency[n] || []) {
            if (!visited.has(neighbor)) queue.push(neighbor);
          }
        }
        components.push(component.sort());
      }

      expect(components.length).toBe(2);
      expect(components[0]).toEqual(['a', 'b']);
      expect(components[1]).toEqual(['c', 'd']);
    });
  });

  describe('Similarity Threshold', () => {
    it('should create connections only above threshold', () => {
      const similarities = [
        { a: 's1', b: 's2', score: 0.95 },
        { a: 's1', b: 's3', score: 0.72 },
        { a: 's1', b: 's4', score: 0.45 },
        { a: 's2', b: 's3', score: 0.88 },
      ];
      const threshold = 0.7;
      const connections = similarities.filter(s => s.score > threshold);

      expect(connections.length).toBe(3);
      expect(connections.find(c => c.b === 's4')).toBeUndefined();
    });
  });
});

describe('Scheduler', () => {
  it('should track task run counts', () => {
    const tasks = new Map<string, { runCount: number; errorCount: number }>();
    tasks.set('evo', { runCount: 0, errorCount: 0 });

    // Simulate runs
    const task = tasks.get('evo')!;
    for (let i = 0; i < 5; i++) task.runCount++;
    task.errorCount++;

    expect(task.runCount).toBe(5);
    expect(task.errorCount).toBe(1);
  });

  it('should report task status', () => {
    const tasks = [
      { name: 'evo', enabled: true, runCount: 10, errorCount: 1 },
      { name: 'model', enabled: false, runCount: 5, errorCount: 0 },
      { name: 'health', enabled: true, runCount: 100, errorCount: 0 },
    ];

    const enabled = tasks.filter(t => t.enabled);
    expect(enabled.length).toBe(2);

    const totalErrors = tasks.reduce((s, t) => s + t.errorCount, 0);
    expect(totalErrors).toBe(1);
  });
});

describe('Environment Validator', () => {
  it('should mask secrets properly', () => {
    const mask = (value: string): string => {
      if (value.length <= 8) return '***';
      return value.slice(0, 4) + '***' + value.slice(-4);
    };

    expect(mask('short')).toBe('***');
    expect(mask('sk-ant-very-long-api-key-here')).toBe('sk-a***here');
    expect(mask('')).toBe('***');
    expect(mask('12345678')).toBe('***');
    expect(mask('123456789')).toBe('1234***6789');
  });

  it('should classify env vars by importance', () => {
    const classify = (key: string): 'required' | 'recommended' | 'optional' => {
      if (['DATABASE_URL', 'REDIS_URL'].includes(key)) return 'required';
      if (['ANTHROPIC_API_KEY', 'S3_ENDPOINT'].includes(key)) return 'recommended';
      return 'optional';
    };

    expect(classify('DATABASE_URL')).toBe('required');
    expect(classify('ANTHROPIC_API_KEY')).toBe('recommended');
    expect(classify('LOG_LEVEL')).toBe('optional');
  });
});

describe('Prompt Template System', () => {
  describe('Version Control', () => {
    it('should track prompt versions', () => {
      const versions = [
        { name: 'intent_parse', version: 1, is_active: false, content: 'v1...' },
        { name: 'intent_parse', version: 2, is_active: false, content: 'v2...' },
        { name: 'intent_parse', version: 3, is_active: true, content: 'v3...' },
      ];

      const active = versions.find(v => v.is_active);
      expect(active?.version).toBe(3);

      const latest = Math.max(...versions.map(v => v.version));
      expect(latest).toBe(3);
    });

    it('should support rollback', () => {
      let activeVersion = 3;
      const rollback = () => { activeVersion = Math.max(1, activeVersion - 1); return activeVersion; };

      expect(rollback()).toBe(2);
      expect(rollback()).toBe(1);
      expect(rollback()).toBe(1); // Can't go below 1
    });
  });

  describe('Template Variables', () => {
    it('should extract variable names from template', () => {
      const extractVars = (template: string): string[] => {
        const matches = template.match(/\{(\w+)\}/g) || [];
        return [...new Set(matches.map(m => m.slice(1, -1)))];
      };

      expect(extractVars('Hello {name}, your {item} is ready')).toEqual(['name', 'item']);
      expect(extractVars('No variables here')).toEqual([]);
      expect(extractVars('{a} {b} {a}')).toEqual(['a', 'b']);
    });
  });
});

describe('Mock Provider', () => {
  describe('Intent Classification Accuracy', () => {
    const classify = (text: string): string => {
      const lower = text.toLowerCase();
      if (/^(remember|save|note|keep|store|bookmark|todo|remind)/i.test(lower)) return 'capture';
      if (/^(research|find out|compare|analyze|what is|who is|how does|explore)/i.test(lower) || /\?$/.test(text.trim())) return 'explore';
      if (/^(change|modify|update|edit|fix|revise)/i.test(lower)) return 'modify';
      if (/^(connect|link|relate)/i.test(lower)) return 'connect';
      return 'create';
    };

    const testCases = [
      { text: 'Build a React app', expected: 'create' },
      { text: 'Create a landing page', expected: 'create' },
      { text: 'Write an article about AI', expected: 'create' },
      { text: 'Remember to call mom', expected: 'capture' },
      { text: 'Save this idea for later', expected: 'capture' },
      { text: 'Note: meeting at 3pm', expected: 'capture' },
      { text: 'Research quantum computing', expected: 'explore' },
      { text: 'What is machine learning?', expected: 'explore' },
      { text: 'Compare React vs Vue', expected: 'explore' },
      { text: 'Fix the login bug', expected: 'modify' },
      { text: 'Change the color to blue', expected: 'modify' },
      { text: 'Update the database schema', expected: 'modify' },
      { text: 'Connect this to my previous idea', expected: 'connect' },
    ];

    for (const { text, expected } of testCases) {
      it(`should classify "${text.slice(0,30)}..." as ${expected}`, () => {
        expect(classify(text)).toBe(expected);
      });
    }
  });

  describe('Domain Detection', () => {
    const detectDomain = (text: string): string => {
      const lower = text.toLowerCase();
      if (/code|api|react|python|server|frontend|backend|database|javascript|typescript/i.test(lower)) return 'technology';
      if (/design|logo|ui|ux|color|layout|mockup/i.test(lower)) return 'design';
      if (/business|market|revenue|startup|investor/i.test(lower)) return 'business';
      if (/write|article|blog|essay|report|email/i.test(lower)) return 'writing';
      if (/translat|language|chinese|english/i.test(lower)) return 'language';
      if (/data|csv|chart|statistic/i.test(lower)) return 'data';
      return 'general';
    };

    it('should detect technology domain', () => {
      expect(detectDomain('Build a React dashboard')).toBe('technology');
      expect(detectDomain('Create a Python API')).toBe('technology');
    });

    it('should detect design domain', () => {
      expect(detectDomain('Design a new logo')).toBe('design');
      expect(detectDomain('Create a UI mockup')).toBe('design');
    });

    it('should detect business domain', () => {
      expect(detectDomain('Write a business plan')).toBe('business');
      expect(detectDomain('Analyze market trends')).toBe('business');
    });

    it('should return general for ambiguous signals', () => {
      expect(detectDomain('Do something interesting')).toBe('general');
    });
  });
});
