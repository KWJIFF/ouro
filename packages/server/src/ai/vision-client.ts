import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

const anthropic = new Anthropic({ apiKey: config.ai.anthropicApiKey });

export async function analyzeImage(imageBuffer: Buffer, mimeType: string, prompt?: string): Promise<string> {
  const base64 = imageBuffer.toString('base64');
  const mediaType = mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

  const response = await anthropic.messages.create({
    model: config.ai.primaryModel,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: prompt || 'Describe this image in detail. What is the user trying to capture or express? Identify any text, diagrams, sketches, or ideas visible in the image. Be specific about actionable content.',
        },
      ],
    }],
  });

  return response.content
    .filter(b => b.type === 'text')
    .map(b => (b as any).text)
    .join('\n');
}

export async function analyzeVideo(frames: Buffer[], audioTranscript?: string): Promise<string> {
  // Analyze key frames + audio transcript
  const frameDescriptions: string[] = [];

  // Analyze up to 4 key frames
  for (const frame of frames.slice(0, 4)) {
    const desc = await analyzeImage(frame, 'image/jpeg', 'Briefly describe what you see in this video frame.');
    frameDescriptions.push(desc);
  }

  // Synthesize
  const synthesis = await anthropic.messages.create({
    model: config.ai.primaryModel,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Synthesize this video analysis into a single coherent signal description:
Frame descriptions: ${frameDescriptions.join(' | ')}
${audioTranscript ? `Audio transcript: ${audioTranscript}` : 'No audio.'}
What is the user trying to capture or express?`,
    }],
  });

  return synthesis.content
    .filter(b => b.type === 'text')
    .map(b => (b as any).text)
    .join('\n');
}
