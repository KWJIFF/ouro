/**
 * Intent Constants
 * 
 * Canonical definitions for intent types, their indicators, and default mappings.
 */

export const INTENT_TYPES = ['create', 'modify', 'explore', 'capture', 'connect', 'compose'] as const;

export const INTENT_INDICATORS: Record<string, string[]> = {
  create: ['build', 'make', 'create', 'generate', 'write', 'design', 'code', 'develop', 'draw', 'compose', 'craft', 'produce', 'start', 'new'],
  modify: ['change', 'modify', 'update', 'edit', 'fix', 'revise', 'adjust', 'tweak', 'improve', 'refactor', 'rename', 'move', 'resize'],
  explore: ['research', 'find', 'search', 'compare', 'analyze', 'explore', 'investigate', 'look up', 'what', 'why', 'how', 'who', 'when', 'where', 'explain'],
  capture: ['remember', 'save', 'note', 'capture', 'store', 'bookmark', 'keep', 'record', 'todo', 'remind', 'don\'t forget'],
  connect: ['connect', 'link', 'relate', 'associate', 'combine', 'merge', 'join', 'bridge'],
  compose: ['compose', 'synthesize', 'blend', 'mix', 'integrate', 'unify', 'put together', 'compile'],
};

export const INTENT_DEFAULT_TOOLS: Record<string, string> = {
  create: 'code_generation',
  modify: 'code_generation',
  explore: 'web_research',
  capture: 'file_manager',
  connect: 'file_manager',
  compose: 'doc_writer',
};

export const INTENT_CONFIDENCE_THRESHOLDS = {
  high: 0.85,
  medium: 0.7,
  low: 0.5,
  clarification_needed: 0.7,
} as const;
