import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export interface OuroError {
  statusCode: number;
  code: string;
  message: string;
  layer?: number;
  details?: Record<string, any>;
}

export class SignalCaptureError extends Error {
  statusCode = 400;
  code = 'SIGNAL_CAPTURE_ERROR';
  layer = 1;
  constructor(message: string, public details?: Record<string, any>) { super(message); }
}

export class IntentParseError extends Error {
  statusCode = 422;
  code = 'INTENT_PARSE_ERROR';
  layer = 2;
  constructor(message: string, public details?: Record<string, any>) { super(message); }
}

export class ExecutionError extends Error {
  statusCode = 500;
  code = 'EXECUTION_ERROR';
  layer = 3;
  constructor(message: string, public details?: Record<string, any>) { super(message); }
}

export class ToolNotFoundError extends Error {
  statusCode = 404;
  code = 'TOOL_NOT_FOUND';
  layer = 3;
  constructor(toolId: string) { super(`Tool not found: ${toolId}`); }
}

export class AIProviderError extends Error {
  statusCode = 502;
  code = 'AI_PROVIDER_ERROR';
  constructor(provider: string, message: string) { super(`AI provider ${provider} failed: ${message}`); }
}

export class StorageError extends Error {
  statusCode = 500;
  code = 'STORAGE_ERROR';
  constructor(operation: string, message: string) { super(`Storage ${operation} failed: ${message}`); }
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const ouroError: OuroError = {
    statusCode: (error as any).statusCode || 500,
    code: (error as any).code || 'INTERNAL_ERROR',
    message: error.message,
    layer: (error as any).layer,
    details: (error as any).details,
  };

  console.error(`[Error] ${ouroError.code} (L${ouroError.layer || '?'}): ${ouroError.message}`);

  reply.status(ouroError.statusCode).send({
    error: ouroError.code,
    message: ouroError.message,
    layer: ouroError.layer,
    ...(process.env.NODE_ENV === 'development' ? { details: ouroError.details, stack: error.stack } : {}),
  });
}
