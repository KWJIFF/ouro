import type { AIProvider, AIMessage, AICallOptions, AIResponse } from '@ouro/core';

/**
 * Mock AI provider for development/testing without real API keys.
 * Constitutional: System NEVER fails to respond.
 */
export const mockProvider: AIProvider = {
  id: 'mock',

  async call(messages: AIMessage[], options?: AICallOptions): Promise<AIResponse> {
    const userMsg = messages.find(m => m.role === 'user');
    const content = typeof userMsg?.content === 'string' ? userMsg.content : '';
    const systemMsg = messages.find(m => m.role === 'system');
    const system = typeof systemMsg?.content === 'string' ? systemMsg.content : '';

    if (system.includes('intent parser') || system.includes('Intent types'))
      return mockIntentResponse(content);
    if (system.includes('execution planner') || system.includes('execution plan'))
      return mockPlanResponse(content);
    return mockContentResponse(content, system);
  },

  async embed(text: string): Promise<number[]> {
    // Deterministic embedding: hash-based for reproducible similarity
    const words = text.toLowerCase().split(/\s+/);
    const vec = new Float64Array(1536);
    for (let w = 0; w < words.length; w++) {
      let h = 0;
      for (let i = 0; i < words[w].length; i++) {
        h = ((h << 5) - h + words[w].charCodeAt(i)) | 0;
      }
      for (let i = 0; i < 1536; i++) {
        vec[i] += Math.sin(h * (i + 1) * 0.0007 + w * 0.3) / Math.max(1, words.length);
      }
    }
    // Normalize
    let mag = 0;
    for (let i = 0; i < 1536; i++) mag += vec[i] * vec[i];
    mag = Math.sqrt(mag) || 1;
    return Array.from(vec, v => v / mag);
  },

  async vision(image: Buffer, prompt: string): Promise<string> {
    return `[Mock vision] Image analyzed (${image.length} bytes). Content appears relevant to: ${prompt.slice(0, 100)}. Contains visual elements that could be interpreted as a diagram, sketch, or photograph.`;
  },

  async speechToText(audio: Buffer): Promise<string> {
    return `[Mock STT] Audio transcribed (${audio.length} bytes, ~${Math.round(audio.length / 16000)}s). Content appears to be spoken language containing ideas and instructions.`;
  },
};

function extractSignalContent(text: string): string {
  // The intent parser wraps content as "Signal content: <actual text>"
  const match = text.match(/Signal content:\s*(.+)/s);
  return match ? match[1].trim() : text;
}

function mockIntentResponse(rawText: string): AIResponse {
  const text = extractSignalContent(rawText);
  const lower = text.toLowerCase();

  // More accurate intent classification
  let intentType = 'create';
  let confidence = 0.85;
  let domain = 'general';

  // Capture intents
  if (/^(remember|save|note|keep|store|bookmark|don.t forget|todo|remind)/i.test(lower) ||
      /meeting|appointment|deadline|tomorrow|later/i.test(lower)) {
    intentType = 'capture';
    confidence = 0.92;
  }
  // Explore intents
  else if (/^(research|find out|compare|analyze|what is|who is|how does|explore|investigate|look up|tell me about)/i.test(lower) ||
           /\?$/.test(text.trim())) {
    intentType = 'explore';
    confidence = 0.88;
  }
  // Modify intents
  else if (/^(change|modify|update|edit|fix|revise|adjust|tweak|improve|refactor)/i.test(lower)) {
    intentType = 'modify';
    confidence = 0.87;
  }
  // Connect intents
  else if (/^(connect|link|relate|associate)/i.test(lower)) {
    intentType = 'connect';
    confidence = 0.85;
  }
  // Create (default)
  else {
    intentType = 'create';
    confidence = 0.86;
  }

  // Domain detection
  if (/code|api|react|python|server|frontend|backend|database|sql|javascript|typescript|programming/i.test(lower)) domain = 'technology';
  else if (/design|logo|ui|ux|color|layout|mockup|wireframe/i.test(lower)) domain = 'design';
  else if (/business|market|revenue|startup|investor|pitch|plan/i.test(lower)) domain = 'business';
  else if (/write|article|blog|essay|report|document|email/i.test(lower)) domain = 'writing';
  else if (/translat|language|chinese|english|spanish|french/i.test(lower)) domain = 'language';
  else if (/data|csv|chart|statistic|analyz/i.test(lower)) domain = 'data';
  else if (/image|photo|draw|illustrat|visual/i.test(lower)) domain = 'design';
  else if (/slide|presentation|deck|keynote/i.test(lower)) domain = 'communication';

  // Target type
  let targetType = 'artifact';
  if (/landing page|website|web page/i.test(lower)) targetType = 'website';
  else if (/api|server|endpoint/i.test(lower)) targetType = 'api';
  else if (/component|widget/i.test(lower)) targetType = 'component';
  else if (/article|blog|report/i.test(lower)) targetType = 'document';
  else if (/email/i.test(lower)) targetType = 'email';
  else if (/plan/i.test(lower)) targetType = 'plan';
  else if (/slide|presentation/i.test(lower)) targetType = 'presentation';

  return {
    content: JSON.stringify({
      intent_type: intentType,
      confidence,
      description: `${intentType.charAt(0).toUpperCase() + intentType.slice(1)}: ${text.slice(0, 200)}`,
      parameters: { target_type: targetType, domain, constraints: [] },
      needs_clarification: false,
      clarification_question: null,
    }),
    model: 'mock',
    tokens_used: { input: rawText.length, output: 300 },
  };
}

function mockPlanResponse(rawText: string): AIResponse {
  const text = extractSignalContent(rawText);
  const lower = text.toLowerCase();

  // Map to the most appropriate tool
  let tool = 'code_generation';
  if (/research|analyze|compare|what is|how does|trend|explore/i.test(lower)) tool = 'web_research';
  else if (/document|article|write|report|essay|blog/i.test(lower)) tool = 'doc_writer';
  else if (/image|draw|illustrat|visual|diagram/i.test(lower)) tool = 'image_generation';
  else if (/slide|presentation|deck|pitch/i.test(lower)) tool = 'slide_builder';
  else if (/email|outreach|newsletter/i.test(lower)) tool = 'email_writer';
  else if (/translat/i.test(lower)) tool = 'translator';
  else if (/sql|database|query|schema|migration/i.test(lower)) tool = 'sql_builder';
  else if (/ui|mockup|wireframe|interface|prototype|dashboard/i.test(lower)) tool = 'ui_mockup';
  else if (/summariz|summary|tldr|digest/i.test(lower)) tool = 'summarizer';
  else if (/debug|bug|fix|review|security/i.test(lower)) tool = 'debugger';
  else if (/mind map|brainstorm|idea/i.test(lower)) tool = 'mind_map';
  else if (/api|endpoint|rest|graphql|server/i.test(lower)) tool = 'api_builder';
  else if (/business plan|startup plan|go.to.market/i.test(lower)) tool = 'business_plan';
  else if (/data|csv|chart|statistic|analyz/i.test(lower)) tool = 'data_analyzer';
  else if (/landing page|website|web page|page/i.test(lower)) tool = 'code_generation';
  else if (/save|remember|note|capture|keep/i.test(lower)) tool = 'file_manager';
  else if (/plan/i.test(lower)) tool = 'business_plan';

  return {
    content: JSON.stringify({
      steps: [{
        id: 's1', tool, input: { prompt: text }, deps: [],
        est_tokens: 3000, est_duration_ms: 5000,
      }],
      estimated_total_duration_ms: 5000,
      estimated_total_tokens: 3000,
    }),
    model: 'mock',
    tokens_used: { input: rawText.length, output: 200 },
  };
}

function mockContentResponse(text: string, system: string): AIResponse {
  // Generate a more specific response based on the tool system prompt
  let toolType = 'general';
  if (system.includes('code generator')) toolType = 'code';
  else if (system.includes('research analyst')) toolType = 'research';
  else if (system.includes('expert writer')) toolType = 'document';
  else if (system.includes('presentation designer')) toolType = 'slides';
  else if (system.includes('email writer')) toolType = 'email';
  else if (system.includes('translator')) toolType = 'translation';
  else if (system.includes('API architect')) toolType = 'api';
  else if (system.includes('database expert')) toolType = 'sql';
  else if (system.includes('UI/UX designer')) toolType = 'ui';
  else if (system.includes('code reviewer')) toolType = 'debug';
  else if (system.includes('visual designer')) toolType = 'image';
  else if (system.includes('data analyst')) toolType = 'data';
  else if (system.includes('business strategy')) toolType = 'business';
  else if (system.includes('mind map')) toolType = 'mindmap';
  else if (system.includes('Summarize')) toolType = 'summary';

  const templates: Record<string, (t: string) => string> = {
    code: (t) => `// Generated code for: ${t.slice(0,60)}
import React from 'react';

interface Props {
  title: string;
  description: string;
}

export default function GeneratedComponent({ title, description }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-600">{description}</p>
        {/* Generated by Ouro — ${t.slice(0,40)} */}
      </main>
    </div>
  );
}`,
    document: (t) => `# ${t.slice(0,60)}\n\n## Overview\n\nThis document addresses: ${t}\n\n## Key Points\n\n- Point 1: Analysis of the core topic\n- Point 2: Supporting evidence and context\n- Point 3: Recommendations and next steps\n\n## Conclusion\n\nBased on the analysis above, the recommended course of action is to proceed with implementation while monitoring key metrics.\n\n---\n*Generated by Ouro*`,
    research: (t) => `# Research: ${t.slice(0,60)}\n\n## Summary\n\nThis research covers: ${t}\n\n## Key Findings\n\n1. **Finding 1**: The primary trend shows significant growth\n2. **Finding 2**: Market dynamics are shifting toward AI-first approaches\n3. **Finding 3**: Early adopters show 3x improvement in outcomes\n\n## Data Points\n\n- Market size: Growing at 25% CAGR\n- Adoption rate: 45% of enterprises\n- ROI: Average 180% within 18 months\n\n## Recommendations\n\nBased on this analysis, immediate action is recommended.\n\n---\n*Researched by Ouro*`,
    general: (t) => `# Generated Output\n\nBased on your request: "${t.slice(0,100)}"\n\n## Result\n\nThis artifact was generated by Ouro's processing pipeline.\n\n### Content\n\nThe system has analyzed your signal and produced this output. In production with a real API key, this would contain substantive, high-quality content tailored to your specific request.\n\n### Pipeline Status\n- Signal captured ✓\n- Intent parsed ✓\n- Execution planned ✓\n- Tool executed ✓\n- Artifact built ✓\n\n---\n*Generated by Ouro Mock Provider*`,
  };

  const generator = templates[toolType] || templates.general;
  const content = generator(text);

  return {
    content,
    model: 'mock',
    tokens_used: { input: text.length + system.length, output: content.length },
  };
}
