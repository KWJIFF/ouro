import type { FastifyInstance } from 'fastify';
import { generateId, now } from '@ouro/core';
import { captureSignal, updateSignalStatus } from '../services/signal-capture';
import { parseIntent } from '../services/intent-parser';
import { generatePlan } from '../services/execution-planner';
import { executePlan } from '../services/execution-runner';
import { buildArtifacts } from '../services/artifact-builder';

/**
 * Email Signal Endpoint
 * 
 * Receives parsed email data (from a mail processing service like SendGrid Inbound Parse,
 * Mailgun Routes, or a custom IMAP poller) and converts it into an Ouro signal.
 * 
 * Send an email to signal@your-ouro.com → it becomes a signal.
 */

interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content_type: string;
    size: number;
    content?: string; // base64
  }>;
  headers?: Record<string, string>;
}

export async function emailRoutes(app: FastifyInstance) {
  // Receive inbound email (webhook from mail service)
  app.post('/api/email/inbound', async (request, reply) => {
    const email = request.body as InboundEmail;

    if (!email.from || !email.subject) {
      return reply.code(400).send({ error: 'Invalid email format' });
    }

    // Construct signal from email
    const signalText = [
      email.subject !== '(no subject)' ? `Subject: ${email.subject}` : '',
      email.text || '',
    ].filter(Boolean).join('\n\n');

    const input = {
      source: { type: 'messaging' as const, platform: 'email' },
      payload: {
        text: signalText,
        files: (email.attachments || []).map(a => ({
          filename: a.filename,
          mime_type: a.content_type,
          size_bytes: a.size,
          buffer: a.content ? Buffer.from(a.content, 'base64') : undefined,
        })),
        urls: [],
        metadata: {
          email_from: email.from,
          email_to: email.to,
          email_subject: email.subject,
        },
      },
      context: {
        timestamp: now(),
        session_id: `email:${email.from}`,
        device: 'email',
      },
    };

    try {
      const signal = await captureSignal(input);
      const intent = await parseIntent(signal);
      await updateSignalStatus(signal.id, 'parsed');

      if (intent.intent_type === 'capture') {
        await updateSignalStatus(signal.id, 'completed');
        return reply.code(201).send({ signal_id: signal.id, status: 'captured' });
      }

      const plan = await generatePlan(intent);
      const executedPlan = await executePlan(plan, signal.id);
      const artifacts = await buildArtifacts(executedPlan, signal.id, intent.description);
      await updateSignalStatus(signal.id, executedPlan.status === 'completed' ? 'completed' : 'failed');

      // TODO: Send reply email with results (integrate with email sending service)

      return reply.code(201).send({
        signal_id: signal.id,
        intent: intent.intent_type,
        status: executedPlan.status,
        artifacts: artifacts.length,
      });
    } catch (error: any) {
      console.error('[Email] Processing error:', error);
      return reply.code(500).send({ error: error.message });
    }
  });
}
