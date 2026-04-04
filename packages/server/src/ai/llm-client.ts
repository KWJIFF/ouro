import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import type { AIMessage, AICallOptions, AIResponse, AIProvider } from '@ouro/core';
import { mockProvider } from './mock-provider';

// === Claude Provider ===
const claudeProvider: AIProvider = {
  id: 'anthropic-claude',

  async call(messages: AIMessage[], options?: AICallOptions): Promise<AIResponse> {
    const anthropic = new Anthropic({ apiKey: config.ai.anthropicApiKey });
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content as string }));

    const response = await anthropic.messages.create({
      model: options?.model || config.ai.primaryModel,
      max_tokens: options?.max_tokens || 4096,
      temperature: options?.temperature ?? 0.7,
      system: typeof systemMsg?.content === 'string' ? systemMsg.content : undefined,
      messages: chatMessages,
    });

    const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('\n');
    return {
      content: text,
      model: response.model,
      tokens_used: { input: response.usage.input_tokens, output: response.usage.output_tokens },
    };
  },

  async embed(text: string): Promise<number[]> {
    // Placeholder — use a dedicated embedding model in production
    let hash = 0;
    for (let i = 0; i < text.length; i++) { hash = ((hash << 5) - hash) + text.charCodeAt(i); hash |= 0; }
    return Array.from({ length: 1536 }, (_, i) => Math.sin(hash * (i + 1) * 0.001));
  },
};

// === Provider Chain (Constitutional: try all, never refuse) ===
function buildProviderChain(): AIProvider[] {
  const chain: AIProvider[] = [];

  // Add real providers if configured
  if (config.ai.anthropicApiKey && !config.ai.anthropicApiKey.startsWith('test-')) {
    chain.push(claudeProvider);
  }

  // Mock provider is always last fallback — system NEVER fails to respond
  chain.push(mockProvider);

  return chain;
}

const providers = buildProviderChain();

console.log(`[AI] Provider chain: ${providers.map(p => p.id).join(' → ')}`);

export async function callAI(messages: AIMessage[], options?: AICallOptions): Promise<AIResponse> {
  for (const provider of providers) {
    try {
      const response = await provider.call(messages, options);
      if (!response.refused) return response;
      console.log(`[AI] Provider ${provider.id} refused, trying next...`);
    } catch (error: any) {
      console.warn(`[AI] Provider ${provider.id} failed: ${error.message?.slice(0, 100)}`);
    }
  }
  // Constitutional: system NEVER fails. Last resort is mock.
  return mockProvider.call(messages, options);
}

export async function embedText(text: string): Promise<number[]> {
  for (const provider of providers) {
    try { return await provider.embed(text); } catch { continue; }
  }
  return mockProvider.embed(text);
}
