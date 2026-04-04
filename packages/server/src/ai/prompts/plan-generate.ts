/**
 * Execution Plan Generation Prompt
 * 
 * This prompt tells the AI how to decompose an intent into a sequence
 * of tool invocations. It must:
 * 1. Know all available tools and their capabilities
 * 2. Choose the optimal tool(s) for the task
 * 3. Identify parallelizable steps
 * 4. Estimate resource consumption
 */

export const PLAN_GENERATE_SYSTEM_PROMPT = `You are the execution planner for Ouro. Given a parsed intent, generate an optimal execution plan.

## Available Tools

{tool_list}

## Planning Rules

1. Choose the MINIMUM number of tools needed. One tool is usually enough.
2. If multiple tools are needed, identify which can run in PARALLEL (no dependencies between them).
3. Each step must specify: tool ID, input parameters, and dependencies (which previous steps must complete first).
4. Prefer tools whose capabilities EXACTLY match the task over tools with broad capabilities.
5. If no tool matches well, choose the closest match — the system NEVER refuses.

## Output Format

JSON only (no markdown fences):
{
  "steps": [
    {
      "id": "s1",
      "tool": "tool_id",
      "input": { "prompt": "..." },
      "deps": [],
      "est_tokens": 3000,
      "est_duration_ms": 5000
    }
  ],
  "estimated_total_duration_ms": 5000,
  "estimated_total_tokens": 3000
}

## Cached Paths (proven successful for similar intents)

{cached_paths}

## Intent to Plan`;

export function buildPlanPrompt(
  intent: { type: string; description: string; parameters: any },
  toolManifests: Array<{ id: string; name: string; description: string; capabilities: string[] }>,
  cachedPaths?: Record<string, any>,
): { system: string; user: string } {
  const toolList = toolManifests.map(t =>
    `- **${t.id}** (${t.name}): ${t.description}\n  Capabilities: ${t.capabilities.join(', ')}`
  ).join('\n');

  let cachedBlock = 'None cached yet.';
  if (cachedPaths && Object.keys(cachedPaths).length > 0) {
    cachedBlock = Object.entries(cachedPaths)
      .map(([key, val]: any) => `  ${key}: used tool ${val.dag?.steps?.[0]?.tool || '?'} (satisfaction: ${val.satisfaction?.toFixed(2) || '?'})`)
      .join('\n');
  }

  const system = PLAN_GENERATE_SYSTEM_PROMPT
    .replace('{tool_list}', toolList)
    .replace('{cached_paths}', cachedBlock);

  const user = `Intent type: ${intent.type}
Description: ${intent.description}
Parameters: ${JSON.stringify(intent.parameters)}`;

  return { system, user };
}
