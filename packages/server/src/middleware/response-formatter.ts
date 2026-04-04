/**
 * API Response Formatter
 * 
 * Standardizes all API responses with consistent structure:
 * - Success: { success: true, data: {...}, meta: {...} }
 * - Error: { success: false, error: { code, message, details }, meta: {...} }
 * - List: { success: true, data: [...], meta: { total, page, pageSize, hasMore } }
 * 
 * Also adds:
 * - Request ID for tracing
 * - Processing time
 * - API version
 * - Rate limit headers
 */

import { generateId } from '@ouro/core';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    layer?: number;
  };
  meta: {
    request_id: string;
    timestamp: string;
    processing_ms: number;
    api_version: string;
    meme_phase?: string;
  };
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  meta: ApiResponse['meta'] & {
    total: number;
    page: number;
    page_size: number;
    has_more: boolean;
  };
}

export function formatSuccess<T>(data: T, startTime: number, extra?: Record<string, any>): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      request_id: generateId().slice(0, 16),
      timestamp: new Date().toISOString(),
      processing_ms: Date.now() - startTime,
      api_version: '0.3.0',
      ...extra,
    },
  };
}

export function formatError(
  code: string,
  message: string,
  startTime: number,
  options?: { details?: any; layer?: number; statusCode?: number },
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details: options?.details,
      layer: options?.layer,
    },
    meta: {
      request_id: generateId().slice(0, 16),
      timestamp: new Date().toISOString(),
      processing_ms: Date.now() - startTime,
      api_version: '0.3.0',
    },
  };
}

export function formatPaginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  startTime: number,
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    meta: {
      request_id: generateId().slice(0, 16),
      timestamp: new Date().toISOString(),
      processing_ms: Date.now() - startTime,
      api_version: '0.3.0',
      total,
      page,
      page_size: pageSize,
      has_more: page * pageSize < total,
    },
  };
}

// Standard error codes
export const ErrorCodes = {
  // Client errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  SIGNAL_NOT_FOUND: 'SIGNAL_NOT_FOUND',
  ARTIFACT_NOT_FOUND: 'ARTIFACT_NOT_FOUND',
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  EXECUTION_TIMEOUT: 'EXECUTION_TIMEOUT',
  EXECUTION_FAILED: 'EXECUTION_FAILED',

  // Pipeline errors
  CAPTURE_FAILED: 'CAPTURE_FAILED',
  PARSE_FAILED: 'PARSE_FAILED',
  PLAN_FAILED: 'PLAN_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
  ARTIFACT_BUILD_FAILED: 'ARTIFACT_BUILD_FAILED',
  RECOVERY_FAILED: 'RECOVERY_FAILED',
  EVOLUTION_FAILED: 'EVOLUTION_FAILED',
} as const;
