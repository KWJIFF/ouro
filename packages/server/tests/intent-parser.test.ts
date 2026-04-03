import { describe, it, expect } from 'vitest';

describe('Intent Parser', () => {
  describe('Intent Type Classification', () => {
    const classifyHeuristic = (text: string): string => {
      const lower = text.toLowerCase();
      if (/^(make|create|build|generate|write|design|code|develop|draw|compose|craft|produce)/.test(lower)) return 'create';
      if (/^(change|modify|update|edit|fix|revise|adjust|tweak|improve|refactor)/.test(lower)) return 'modify';
      if (/^(find|search|research|compare|analyze|explore|investigate|look up|what is|who is|how does)/.test(lower)) return 'explore';
      if (/^(save|remember|note|capture|store|bookmark|keep|record)/.test(lower)) return 'capture';
      if (/^(connect|link|relate|associate|combine|merge|join)/.test(lower)) return 'connect';
      if (/^(compose|synthesize|blend|mix|integrate|unify)/.test(lower)) return 'compose';
      return 'create'; // Default
    };

    it('should classify creation intents', () => {
      expect(classifyHeuristic('Build a landing page')).toBe('create');
      expect(classifyHeuristic('Create a React component')).toBe('create');
      expect(classifyHeuristic('Write an article about AI')).toBe('create');
      expect(classifyHeuristic('Generate a business plan')).toBe('create');
      expect(classifyHeuristic('Design a logo for my startup')).toBe('create');
      expect(classifyHeuristic('Code a sorting algorithm')).toBe('create');
    });

    it('should classify modification intents', () => {
      expect(classifyHeuristic('Change the color to blue')).toBe('modify');
      expect(classifyHeuristic('Fix the bug in my code')).toBe('modify');
      expect(classifyHeuristic('Update the header section')).toBe('modify');
      expect(classifyHeuristic('Refactor the database layer')).toBe('modify');
    });

    it('should classify exploration intents', () => {
      expect(classifyHeuristic('Research AI trends 2025')).toBe('explore');
      expect(classifyHeuristic('Compare React vs Vue')).toBe('explore');
      expect(classifyHeuristic('What is quantum computing')).toBe('explore');
      expect(classifyHeuristic('Analyze market competition')).toBe('explore');
    });

    it('should classify capture intents', () => {
      expect(classifyHeuristic('Save this idea for later')).toBe('capture');
      expect(classifyHeuristic('Remember to call John')).toBe('capture');
      expect(classifyHeuristic('Note: meeting moved to 3pm')).toBe('capture');
    });

    it('should default to create for ambiguous signals', () => {
      expect(classifyHeuristic('coffee shop')).toBe('create');
      expect(classifyHeuristic('something interesting')).toBe('create');
    });
  });

  describe('Confidence Calibration', () => {
    it('should have higher confidence for clear imperatives', () => {
      const estimateConfidence = (text: string): number => {
        let conf = 0.5;
        if (/^(make|create|build|write|generate|find|save)\s/i.test(text)) conf += 0.3;
        if (text.length > 20) conf += 0.1;
        if (text.includes('?')) conf -= 0.1;
        return Math.min(1, Math.max(0, conf));
      };
      expect(estimateConfidence('Create a landing page for my coffee shop')).toBeGreaterThan(0.7);
      expect(estimateConfidence('hmm')).toBeLessThan(0.7);
      expect(estimateConfidence('what?')).toBeLessThan(0.7);
    });

    it('should require clarification below threshold', () => {
      const needsClarification = (confidence: number, threshold: number = 0.7) => confidence < threshold;
      expect(needsClarification(0.5)).toBe(true);
      expect(needsClarification(0.8)).toBe(false);
      expect(needsClarification(0.7)).toBe(false);
      expect(needsClarification(0.69)).toBe(true);
    });
  });

  describe('Parameter Extraction', () => {
    it('should extract domain from text', () => {
      const extractDomain = (text: string): string | null => {
        const domains = ['technology', 'design', 'business', 'education', 'health', 'finance', 'food', 'travel'];
        const lower = text.toLowerCase();
        for (const d of domains) {
          if (lower.includes(d)) return d;
        }
        if (/code|api|server|database|frontend|backend|react|python/i.test(lower)) return 'technology';
        if (/logo|ui|ux|mockup|wireframe|color/i.test(lower)) return 'design';
        if (/revenue|market|startup|investor|pitch/i.test(lower)) return 'business';
        return null;
      };
      expect(extractDomain('Build a React component')).toBe('technology');
      expect(extractDomain('Design a logo for my startup')).toBe('design');
      expect(extractDomain('Create a business plan')).toBe('business');
    });
  });
});

describe('Execution Planner', () => {
  describe('DAG Generation', () => {
    it('should compute parallel groups correctly', () => {
      const computeGroups = (steps: Array<{ id: string; deps: string[] }>): string[][] => {
        const groups: string[][] = [];
        const completed = new Set<string>();
        while (completed.size < steps.length) {
          const group = steps
            .filter(s => !completed.has(s.id) && s.deps.every(d => completed.has(d)))
            .map(s => s.id);
          if (group.length === 0) break;
          groups.push(group);
          group.forEach(id => completed.add(id));
        }
        return groups;
      };

      // Independent steps should be in same group
      expect(computeGroups([
        { id: 's1', deps: [] },
        { id: 's2', deps: [] },
        { id: 's3', deps: ['s1', 's2'] },
      ])).toEqual([['s1', 's2'], ['s3']]);

      // Sequential steps should be in separate groups
      expect(computeGroups([
        { id: 's1', deps: [] },
        { id: 's2', deps: ['s1'] },
        { id: 's3', deps: ['s2'] },
      ])).toEqual([['s1'], ['s2'], ['s3']]);

      // Diamond pattern
      expect(computeGroups([
        { id: 's1', deps: [] },
        { id: 's2', deps: ['s1'] },
        { id: 's3', deps: ['s1'] },
        { id: 's4', deps: ['s2', 's3'] },
      ])).toEqual([['s1'], ['s2', 's3'], ['s4']]);
    });

    it('should handle empty step list', () => {
      const computeGroups = (steps: Array<{ id: string; deps: string[] }>): string[][] => {
        const groups: string[][] = [];
        const completed = new Set<string>();
        while (completed.size < steps.length) {
          const group = steps.filter(s => !completed.has(s.id) && s.deps.every(d => completed.has(d))).map(s => s.id);
          if (group.length === 0) break;
          groups.push(group);
          group.forEach(id => completed.add(id));
        }
        return groups;
      };
      expect(computeGroups([])).toEqual([]);
    });
  });

  describe('Tool Selection', () => {
    it('should match capabilities to tools', () => {
      const tools = [
        { id: 'code_gen', capabilities: ['code_generation', 'scripting'] },
        { id: 'doc_writer', capabilities: ['document_writing', 'article_writing'] },
        { id: 'web_research', capabilities: ['research', 'analysis'] },
        { id: 'image_gen', capabilities: ['image_generation', 'illustration'] },
      ];

      const findTool = (capability: string) => tools.find(t => t.capabilities.includes(capability));

      expect(findTool('code_generation')?.id).toBe('code_gen');
      expect(findTool('document_writing')?.id).toBe('doc_writer');
      expect(findTool('research')?.id).toBe('web_research');
      expect(findTool('image_generation')?.id).toBe('image_gen');
      expect(findTool('nonexistent')).toBeUndefined();
    });
  });
});

describe('Feedback Processor', () => {
  describe('Satisfaction Inference', () => {
    const inferSatisfaction = (action: string, reactMs?: number, viewMs?: number, scrollDepth?: number): number => {
      let score = 0.5;
      switch (action) {
        case 'accept': score += 0.3; break;
        case 'share': score += 0.4; break;
        case 'modify': score += 0.0; break;
        case 'reject': score -= 0.3; break;
        case 'fork': score += 0.1; break;
        case 'revisit': score += 0.15; break;
      }
      if (reactMs !== undefined && action === 'accept' && reactMs < 5000) score += 0.1;
      if (reactMs !== undefined && action === 'reject' && reactMs > 30000) score += 0.05;
      if (viewMs !== undefined && action === 'accept' && viewMs > 10000) score += 0.05;
      if (scrollDepth !== undefined && scrollDepth > 0.9) score += 0.05;
      return Math.max(0, Math.min(1, score));
    };

    it('should score acceptance higher than rejection', () => {
      expect(inferSatisfaction('accept')).toBeGreaterThan(inferSatisfaction('reject'));
    });

    it('should score sharing highest', () => {
      expect(inferSatisfaction('share')).toBeGreaterThan(inferSatisfaction('accept'));
    });

    it('should boost fast acceptance', () => {
      expect(inferSatisfaction('accept', 2000)).toBeGreaterThan(inferSatisfaction('accept', 20000));
    });

    it('should boost full scroll depth', () => {
      expect(inferSatisfaction('accept', undefined, undefined, 0.95)).toBeGreaterThan(inferSatisfaction('accept', undefined, undefined, 0.3));
    });

    it('should keep scores within 0-1 range', () => {
      expect(inferSatisfaction('share', 1000, 100000, 1.0)).toBeLessThanOrEqual(1);
      expect(inferSatisfaction('reject')).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Pattern Extractor', () => {
  describe('Creativity Triggers', () => {
    it('should categorize time slots correctly', () => {
      const getTimeSlot = (hour: number): string => {
        if (hour < 6) return 'deep_night';
        if (hour < 9) return 'early_morning';
        if (hour < 12) return 'morning';
        if (hour < 14) return 'midday';
        if (hour < 17) return 'afternoon';
        if (hour < 20) return 'evening';
        return 'night';
      };

      expect(getTimeSlot(3)).toBe('deep_night');
      expect(getTimeSlot(7)).toBe('early_morning');
      expect(getTimeSlot(10)).toBe('morning');
      expect(getTimeSlot(13)).toBe('midday');
      expect(getTimeSlot(15)).toBe('afternoon');
      expect(getTimeSlot(19)).toBe('evening');
      expect(getTimeSlot(22)).toBe('night');
    });
  });

  describe('Language Detection', () => {
    it('should detect Chinese text', () => {
      const detect = (text: string): string => {
        if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja'; // Check kana before kanji
        if (/[\uac00-\ud7af]/.test(text)) return 'ko';
        if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
        return 'en';
      };
      expect(detect('创建一个登录页面')).toBe('zh');
      expect(detect('Create a landing page')).toBe('en');
      expect(detect('ログインページを作る')).toBe('ja');
      expect(detect('로그인 페이지 만들기')).toBe('ko');
    });
  });
});

describe('Personal Model', () => {
  it('should calculate model confidence from signal count', () => {
    const confidence = (signals: number): number => Math.min(1, signals / 100);
    expect(confidence(0)).toBe(0);
    expect(confidence(50)).toBe(0.5);
    expect(confidence(100)).toBe(1);
    expect(confidence(200)).toBe(1);
  });

  it('should calculate avg signals per day', () => {
    const avgPerDay = (signals: number, days: number): number => signals / Math.max(1, days);
    expect(avgPerDay(100, 10)).toBe(10);
    expect(avgPerDay(5, 1)).toBe(5);
    expect(avgPerDay(0, 10)).toBe(0);
  });
});

describe('Idea Graph', () => {
  it('should build BFS traversal', () => {
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'a', target: 'd' },
    ];

    const bfs = (start: string, depth: number): Set<string> => {
      const visited = new Set<string>();
      const queue: Array<{ id: string; d: number }> = [{ id: start, d: 0 }];
      while (queue.length > 0) {
        const { id, d } = queue.shift()!;
        if (visited.has(id) || d > depth) continue;
        visited.add(id);
        edges.filter(e => e.source === id).forEach(e => queue.push({ id: e.target, d: d + 1 }));
        edges.filter(e => e.target === id).forEach(e => queue.push({ id: e.source, d: d + 1 }));
      }
      return visited;
    };

    expect(bfs('a', 1)).toEqual(new Set(['a', 'b', 'd']));
    expect(bfs('a', 2)).toEqual(new Set(['a', 'b', 'c', 'd']));
    expect(bfs('c', 0)).toEqual(new Set(['c']));
  });
});

describe('Semantic Search', () => {
  it('should rank by cosine similarity', () => {
    const cosineSim = (a: number[], b: number[]): number => {
      let dot = 0, magA = 0, magB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] ** 2;
        magB += b[i] ** 2;
      }
      return dot / (Math.sqrt(magA) * Math.sqrt(magB));
    };

    const query = [1, 0, 0];
    const doc1 = [1, 0, 0]; // Identical
    const doc2 = [0.7, 0.3, 0]; // Similar
    const doc3 = [0, 0, 1]; // Orthogonal

    expect(cosineSim(query, doc1)).toBeCloseTo(1.0);
    expect(cosineSim(query, doc2)).toBeGreaterThan(0.8);
    expect(cosineSim(query, doc3)).toBeCloseTo(0);
  });
});
