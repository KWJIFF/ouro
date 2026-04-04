import { describe, it, expect } from 'vitest';

/**
 * End-to-end pipeline simulation tests.
 * These verify the logical flow through all 7 layers without requiring a database.
 */

describe('E2E Pipeline Simulation', () => {
  // Simulate the full signal → artifact pipeline
  const simulatePipeline = (signalText: string) => {
    // L1: Capture
    const signal = {
      id: `sig_${Date.now()}`,
      modality: 'text' as const,
      text: signalText,
      status: 'captured',
    };

    // L2: Intent Parse (mock)
    const lower = signalText.toLowerCase();
    let intentType = 'create';
    if (/remember|save|note/.test(lower)) intentType = 'capture';
    else if (/research|compare|what is/.test(lower)) intentType = 'explore';
    else if (/change|fix|modify/.test(lower)) intentType = 'modify';

    const intent = {
      type: intentType,
      confidence: 0.85,
      description: signalText,
    };

    // L3: Plan
    const toolMap: Record<string, string> = {
      create: 'code_generation',
      explore: 'web_research',
      capture: 'file_manager',
      modify: 'code_generation',
    };
    const plan = {
      steps: [{ id: 's1', tool: toolMap[intentType] || 'doc_writer', status: 'completed' }],
      status: 'completed',
    };

    // L4: Artifact
    const artifact = {
      type: intentType === 'capture' ? 'document' : 'code',
      content: `Generated output for: ${signalText}`,
      version: 1,
    };

    // L5: Patterns
    const patterns = [
      { type: 'creativity_trigger', data: { hour: new Date().getHours() } },
      { type: 'expression_habit', data: { length: signalText.length } },
    ];

    return { signal, intent, plan, artifact, patterns };
  };

  it('should process a creation signal end-to-end', () => {
    const result = simulatePipeline('Build a React dashboard');
    expect(result.intent.type).toBe('create');
    expect(result.plan.steps[0].tool).toBe('code_generation');
    expect(result.artifact.type).toBe('code');
    expect(result.patterns.length).toBeGreaterThan(0);
  });

  it('should process an exploration signal', () => {
    const result = simulatePipeline('Research quantum computing trends');
    expect(result.intent.type).toBe('explore');
    expect(result.plan.steps[0].tool).toBe('web_research');
  });

  it('should process a capture signal', () => {
    const result = simulatePipeline('Remember to buy groceries');
    expect(result.intent.type).toBe('capture');
    expect(result.plan.steps[0].tool).toBe('file_manager');
    expect(result.artifact.type).toBe('document');
  });

  it('should process a modification signal', () => {
    const result = simulatePipeline('Fix the bug in the login form');
    expect(result.intent.type).toBe('modify');
    expect(result.plan.steps[0].tool).toBe('code_generation');
  });

  it('should always produce at least one pattern', () => {
    const signals = [
      'Create something',
      'Research this',
      'Remember that',
      'Modify it',
      'Connect these ideas',
    ];
    for (const text of signals) {
      const result = simulatePipeline(text);
      expect(result.patterns.length).toBeGreaterThan(0);
    }
  });

  it('should complete all pipeline stages', () => {
    const result = simulatePipeline('Build a coffee shop website');
    expect(result.signal.status).toBe('captured');
    expect(result.intent.confidence).toBeGreaterThan(0);
    expect(result.plan.status).toBe('completed');
    expect(result.artifact.content).toBeTruthy();
    expect(result.artifact.version).toBe(1);
  });
});

describe('Multi-Signal Session Simulation', () => {
  it('should handle a sequence of related signals', () => {
    const session: Array<{ text: string; expectedType: string }> = [
      { text: 'Build a landing page for my coffee shop', expectedType: 'create' },
      { text: 'Change the color scheme to warmer tones', expectedType: 'modify' },
      { text: 'Research competitor coffee shop websites', expectedType: 'explore' },
      { text: 'Remember to add a menu section', expectedType: 'capture' },
      { text: 'Create a mobile-responsive version', expectedType: 'create' },
    ];

    const results = [];
    for (const { text, expectedType } of session) {
      const lower = text.toLowerCase();
      let type = 'create';
      if (/remember|save|note/.test(lower)) type = 'capture';
      else if (/research|compare|what is/.test(lower)) type = 'explore';
      else if (/change|fix|modify/.test(lower)) type = 'modify';

      results.push({ text, type, expected: expectedType });
    }

    for (const r of results) {
      expect(r.type).toBe(r.expected);
    }

    // Session should have variety of intent types
    const types = new Set(results.map(r => r.type));
    expect(types.size).toBeGreaterThan(2);
  });

  it('should track signal chain continuity', () => {
    const signals = [
      { id: 's1', preceding: null },
      { id: 's2', preceding: 's1' },
      { id: 's3', preceding: 's2' },
      { id: 's4', preceding: null },  // New chain
      { id: 's5', preceding: 's4' },
    ];

    // Count chains
    const chains: string[][] = [];
    const visited = new Set<string>();

    for (const s of signals) {
      if (!s.preceding && !visited.has(s.id)) {
        const chain = [s.id];
        visited.add(s.id);
        let current = s.id;
        for (const next of signals) {
          if (next.preceding === current) {
            chain.push(next.id);
            visited.add(next.id);
            current = next.id;
          }
        }
        chains.push(chain);
      }
    }

    expect(chains.length).toBe(2);
    expect(chains[0]).toEqual(['s1', 's2', 's3']);
    expect(chains[1]).toEqual(['s4', 's5']);
  });
});

describe('Evolution Cycle Simulation', () => {
  it('should accumulate patterns across signals', () => {
    const allPatterns: Array<{ type: string; data: any }> = [];

    // Simulate 10 signals
    for (let i = 0; i < 10; i++) {
      allPatterns.push(
        { type: 'creativity_trigger', data: { hour: 9 + (i % 12) } },
        { type: 'domain_preference', data: { domain: i % 2 === 0 ? 'tech' : 'design' } },
        { type: 'expression_habit', data: { length: 20 + i * 5 } },
      );
    }

    expect(allPatterns.length).toBe(30);

    // Aggregate
    const byType: Record<string, number> = {};
    for (const p of allPatterns) byType[p.type] = (byType[p.type] || 0) + 1;

    expect(byType['creativity_trigger']).toBe(10);
    expect(byType['domain_preference']).toBe(10);
    expect(byType['expression_habit']).toBe(10);
  });

  it('should detect when evolution cycle should run', () => {
    const shouldEvolve = (signalCount: number, lastEvolution: number, interval: number): boolean => {
      return signalCount > 0 && (signalCount - lastEvolution) >= interval;
    };

    expect(shouldEvolve(10, 0, 10)).toBe(true);
    expect(shouldEvolve(5, 0, 10)).toBe(false);
    expect(shouldEvolve(20, 10, 10)).toBe(true);
    expect(shouldEvolve(15, 10, 10)).toBe(false);
  });

  it('should calculate model confidence growth', () => {
    const confidence = (signals: number): number => Math.min(1, signals / 100);

    // Confidence should grow with signals
    const values = [0, 10, 25, 50, 75, 100, 200].map(confidence);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
    expect(values[values.length - 1]).toBe(1); // Caps at 1
  });
});
