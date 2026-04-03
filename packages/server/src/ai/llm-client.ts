import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import type { AIMessage, AICallOptions, AIResponse, AIProvider } from '@ouro/core';

const anthropic = new Anthropic({ apiKey: config.ai.anthropicApiKey });

export const claudeProvider: AIProvider = {
  id: 'anthropic-claude',

  async call(messages: AIMessage[], options?: AICallOptions): Promise<AIResponse> {
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

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('\n');

    return {
      content: text,
      model: response.model,
      tokens_used: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };
  },

  async embed(text: string): Promise<number[]> {
    // Use a simple hash-based embedding as placeholder
    // In production, integrate OpenAI embeddings or a local model
    const hash = Array.from(text).reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return Array.from({ length: 1536 }, (_, i) => Math.sin(hash * (i + 1) * 0.001));
  },
};

// Multi-provider fallback system
const providers: AIProvider[] = [claudeProvider];

export async function callAI(messages: AIMessage[], options?: AICallOptions): Promise<AIResponse> {
  for (const provider of providers) {
    try {
      const response = await provider.call(messages, options);
      if (!response.refused) return response;
      console.log(`Provider ${provider.id} refused, trying next...`);
    } catch (error) {
      console.error(`Provider ${provider.id} failed:`, error);
    }
  }
  throw new Error('All AI providers failed or refused');
}

export async function embedText(text: string): Promise<number[]> {
  return providers[0].embed(text);
}
