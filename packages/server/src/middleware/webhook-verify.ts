import * as crypto from 'crypto';

/**
 * Webhook Signature Verification
 * 
 * Verifies incoming webhooks from external services.
 * Supports multiple signature formats:
 * - HMAC-SHA256 (GitHub, Stripe, Slack)
 * - HMAC-SHA1 (legacy)
 * - Custom header schemes
 * 
 * Constitutional: We accept all signals, but we verify their origin
 * to prevent injection attacks on the pipeline.
 */

interface WebhookConfig {
  secret: string;
  headerName: string;
  algorithm: 'sha256' | 'sha1';
  prefix?: string;  // e.g., "sha256=" for GitHub
  encoding?: 'hex' | 'base64';
}

const webhookConfigs: Map<string, WebhookConfig> = new Map();

export function registerWebhookSource(source: string, config: WebhookConfig): void {
  webhookConfigs.set(source, config);
}

export function verifyWebhookSignature(
  source: string,
  payload: string | Buffer,
  receivedSignature: string,
): { verified: boolean; error?: string } {
  const config = webhookConfigs.get(source);

  // If no config registered, accept (open access by default)
  if (!config) {
    return { verified: true };
  }

  if (!receivedSignature) {
    return { verified: false, error: 'Missing signature header' };
  }

  try {
    const hmac = crypto.createHmac(config.algorithm, config.secret);
    hmac.update(typeof payload === 'string' ? payload : payload.toString('utf-8'));
    const computed = hmac.digest(config.encoding || 'hex');

    const expected = config.prefix
      ? `${config.prefix}${computed}`
      : computed;

    // Timing-safe comparison
    const verified = crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(receivedSignature),
    );

    return { verified };
  } catch (error: any) {
    return { verified: false, error: `Verification failed: ${error.message}` };
  }
}

// Pre-configure common webhook sources
export function initWebhookVerification(): void {
  const githubSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (githubSecret) {
    registerWebhookSource('github', {
      secret: githubSecret,
      headerName: 'x-hub-signature-256',
      algorithm: 'sha256',
      prefix: 'sha256=',
    });
  }

  const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (stripeSecret) {
    registerWebhookSource('stripe', {
      secret: stripeSecret,
      headerName: 'stripe-signature',
      algorithm: 'sha256',
    });
  }

  const slackSecret = process.env.SLACK_SIGNING_SECRET;
  if (slackSecret) {
    registerWebhookSource('slack', {
      secret: slackSecret,
      headerName: 'x-slack-signature',
      algorithm: 'sha256',
      prefix: 'v0=',
    });
  }
}
