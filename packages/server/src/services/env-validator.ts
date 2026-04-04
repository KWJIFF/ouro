/**
 * Environment Validator
 * 
 * Validates all environment variables at startup.
 * Reports missing, invalid, or misconfigured values.
 * Does NOT block startup for non-critical issues (Constitutional: zero friction).
 */

export interface EnvValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
  config: Record<string, { value: string; status: 'ok' | 'missing' | 'default' | 'warning' }>;
}

export function validateEnvironment(): EnvValidation {
  const warnings: string[] = [];
  const errors: string[] = [];
  const config: Record<string, any> = {};

  // Required for core functionality
  const required = [
    { key: 'DATABASE_URL', default: 'postgresql://ouro:ouro_pass@localhost:5432/ouro' },
    { key: 'REDIS_URL', default: 'redis://localhost:6379' },
  ];

  // Recommended but not required
  const recommended = [
    { key: 'ANTHROPIC_API_KEY', message: 'Without this, the system uses mock AI responses. Set for real AI capabilities.' },
    { key: 'S3_ENDPOINT', default: 'http://localhost:9000', message: 'File storage. Uses MinIO by default.' },
    { key: 'OPENAI_API_KEY', message: 'Optional. Enables Whisper STT for voice signals.' },
  ];

  // Optional
  const optional = [
    { key: 'PORT', default: '3001' },
    { key: 'NODE_ENV', default: 'development' },
    { key: 'LOG_LEVEL', default: 'info' },
    { key: 'OURO_API_KEY', message: 'Optional authentication. If set, all requests require this key.' },
    { key: 'TELEGRAM_BOT_TOKEN', message: 'Optional. Enables Telegram bot endpoint.' },
  ];

  for (const { key, default: def } of required) {
    const value = process.env[key];
    if (!value) {
      if (def) {
        config[key] = { value: def, status: 'default' };
        warnings.push(`${key} not set. Using default: ${def}`);
      } else {
        config[key] = { value: '', status: 'missing' };
        errors.push(`${key} is required but not set.`);
      }
    } else {
      config[key] = { value: maskSecret(value), status: 'ok' };
    }
  }

  for (const { key, default: def, message } of recommended) {
    const value = process.env[key];
    if (!value) {
      config[key] = { value: def || '', status: 'warning' };
      warnings.push(`${key} not set. ${message || ''}`);
    } else {
      config[key] = { value: maskSecret(value), status: 'ok' };
    }
  }

  for (const { key, default: def, message } of optional) {
    const value = process.env[key];
    config[key] = {
      value: value ? maskSecret(value) : (def || 'not set'),
      status: value ? 'ok' : 'default',
    };
  }

  // Validate specific values
  const port = parseInt(process.env.PORT || '3001');
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push('PORT must be a valid port number (1-65535).');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    config,
  };
}

function maskSecret(value: string): string {
  if (value.length <= 8) return '***';
  return value.slice(0, 4) + '***' + value.slice(-4);
}

export function printEnvReport(): void {
  const validation = validateEnvironment();

  console.log('\n[Env] Configuration Report:');

  if (validation.errors.length > 0) {
    console.error('[Env] ❌ ERRORS:');
    for (const e of validation.errors) console.error(`  - ${e}`);
  }

  if (validation.warnings.length > 0) {
    console.warn('[Env] ⚠️  WARNINGS:');
    for (const w of validation.warnings) console.warn(`  - ${w}`);
  }

  if (validation.valid) {
    console.log('[Env] ✅ Configuration valid.\n');
  } else {
    console.error('[Env] ❌ Configuration has errors. Some features may not work.\n');
  }
}
