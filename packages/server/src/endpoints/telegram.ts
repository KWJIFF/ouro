import type { FastifyInstance } from 'fastify';
import { generateId, now } from '@ouro/core';
import { captureSignal, updateSignalStatus } from '../services/signal-capture';
import { parseIntent } from '../services/intent-parser';
import { generatePlan } from '../services/execution-planner';
import { executePlan } from '../services/execution-runner';
import { buildArtifacts } from '../services/artifact-builder';

/**
 * Telegram Bot Endpoint
 * 
 * Setup:
 * 1. Create a bot via @BotFather
 * 2. Set TELEGRAM_BOT_TOKEN in .env
 * 3. Set webhook: POST https://api.telegram.org/bot{TOKEN}/setWebhook?url={YOUR_DOMAIN}/api/telegram/webhook
 * 
 * Any message to the bot becomes a signal in Ouro.
 */

interface TelegramMessage {
  message_id: number;
  from: { id: number; first_name: string; username?: string };
  chat: { id: number; type: string };
  date: number;
  text?: string;
  photo?: Array<{ file_id: string; width: number; height: number }>;
  voice?: { file_id: string; duration: number };
  video?: { file_id: string; duration: number };
  document?: { file_id: string; file_name: string; mime_type: string };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export async function telegramRoutes(app: FastifyInstance) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  app.post('/api/telegram/webhook', async (request, reply) => {
    if (!botToken) {
      return reply.code(503).send({ error: 'Telegram bot not configured. Set TELEGRAM_BOT_TOKEN.' });
    }

    const update = request.body as TelegramUpdate;
    const msg = update.message;
    if (!msg) return reply.send({ ok: true });

    const chatId = msg.chat.id;

    try {
      // Build signal from Telegram message
      const text = msg.text || '';
      const signalText = text || (msg.photo ? '[Photo received]' : msg.voice ? '[Voice message]' : msg.video ? '[Video received]' : msg.document ? `[File: ${msg.document.file_name}]` : '[Unknown message type]');

      const input = {
        source: { type: 'messaging' as const, platform: 'telegram' },
        payload: {
          text: signalText,
          files: [],
          urls: [],
          metadata: {
            telegram_chat_id: chatId,
            telegram_message_id: msg.message_id,
            telegram_user: msg.from,
          },
        },
        context: {
          timestamp: new Date(msg.date * 1000).toISOString(),
          session_id: `telegram:${chatId}`,
          device: 'telegram',
        },
      };

      // Process through full pipeline
      const signal = await captureSignal(input);
      const intent = await parseIntent(signal);
      await updateSignalStatus(signal.id, 'parsed');

      if (intent.needs_clarification) {
        await sendTelegramMessage(botToken, chatId, `❓ ${intent.clarification_question}`);
        return reply.send({ ok: true });
      }

      // Send "processing" indicator
      await sendTelegramMessage(botToken, chatId, `🐍 Processing: ${intent.description}...`);

      const plan = await generatePlan(intent);
      const executedPlan = await executePlan(plan, signal.id);
      const artifacts = await buildArtifacts(executedPlan, signal.id, intent.description);
      await updateSignalStatus(signal.id, executedPlan.status === 'completed' ? 'completed' : 'failed');

      // Send results back to Telegram
      if (artifacts.length > 0) {
        for (const artifact of artifacts) {
          const content = artifact.metadata?.inline_content || artifact.description || 'Done.';
          // Telegram has 4096 char limit per message
          const chunks = chunkString(content, 4000);
          for (const chunk of chunks) {
            await sendTelegramMessage(botToken, chatId, chunk);
          }
        }
      } else {
        await sendTelegramMessage(botToken, chatId, executedPlan.status === 'completed' ? '✅ Done.' : '❌ Execution failed.');
      }
    } catch (error: any) {
      console.error('[Telegram] Error:', error);
      await sendTelegramMessage(botToken, chatId, `❌ Error: ${error.message}`);
    }

    return reply.send({ ok: true });
  });

  // Telegram bot info
  app.get('/api/telegram/status', async (request, reply) => {
    if (!botToken) return reply.send({ configured: false });
    try {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await r.json() as any;
      return reply.send({ configured: true, bot: data.result });
    } catch {
      return reply.send({ configured: true, error: 'Failed to reach Telegram API' });
    }
  });
}

async function sendTelegramMessage(token: string, chatId: number, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
  } catch (e) {
    console.error('[Telegram] Failed to send message:', e);
  }
}

function chunkString(str: string, maxLen: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += maxLen) {
    chunks.push(str.slice(i, i + maxLen));
  }
  return chunks.length > 0 ? chunks : [''];
}
