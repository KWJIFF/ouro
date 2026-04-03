import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'sql_builder',
  version: '0.1.0',
  name: 'SQL Builder',
  description: 'Generate SQL queries, database schemas, migrations, stored procedures, and data manipulation scripts. Supports PostgreSQL, MySQL, SQLite, and SQL Server.',
  capabilities: ['sql', 'database', 'query', 'schema', 'migration', 'stored_procedure'],
  input_schema: {
    type: 'object',
    properties: {
      request: { type: 'string', description: 'What SQL to generate' },
      dialect: { type: 'string', description: 'SQL dialect: postgresql, mysql, sqlite, sqlserver' },
      existing_schema: { type: 'string', description: 'Existing table definitions for context' },
      type: { type: 'string', description: 'query, schema, migration, procedure, optimization' },
    },
    required: ['request'],
  },
  output_schema: {
    type: 'object',
    properties: { sql: { type: 'string' }, explanation: { type: 'string' } },
  },
  tags: ['sql', 'database', 'query'],
};

export const sqlBuilderTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { request, dialect, existing_schema, type } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `You are a database expert. Generate production-quality SQL.
Dialect: ${dialect || 'PostgreSQL'}
Type: ${type || 'auto-detect'}
${existing_schema ? `Existing schema:\n${existing_schema}` : ''}

Include:
- Complete, executable SQL
- Comments explaining complex parts
- Indexes for performance-critical queries
- Proper data types and constraints
- For schemas: include foreign keys, indexes, and sensible defaults

Output the SQL first, then a brief explanation.`,
      },
      { role: 'user', content: request },
    ], { temperature: 0.3, max_tokens: 4096 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'code', language: 'sql', dialect: dialect || 'postgresql' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};
