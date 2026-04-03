import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://ouro:ouro_pass@localhost:5432/ouro',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    primaryModel: process.env.PRIMARY_LLM_MODEL || 'claude-sonnet-4-20250514',
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  },

  storage: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    bucket: process.env.S3_BUCKET || 'ouro-artifacts',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
  },

  evolution: {
    cycleInterval: parseInt(process.env.EVOLUTION_CYCLE_INTERVAL || '10'),
    minSamples: parseInt(process.env.EVOLUTION_MIN_SAMPLES || '5'),
    intentConfidenceThreshold: parseFloat(process.env.INTENT_CONFIDENCE_THRESHOLD || '0.7'),
    maxClarificationQuestions: parseInt(process.env.MAX_CLARIFICATION_QUESTIONS || '1'),
  },

  execution: {
    maxParallelSteps: parseInt(process.env.MAX_PARALLEL_STEPS || '4'),
    stepTimeoutMs: parseInt(process.env.STEP_TIMEOUT_MS || '120000'),
    planTimeoutMs: parseInt(process.env.PLAN_TIMEOUT_MS || '30000'),
  },
};
