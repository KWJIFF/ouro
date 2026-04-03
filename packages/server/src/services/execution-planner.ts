import { generateId, now } from '@ouro/core';
import type { ParsedIntent, ExecutionPlan, ExecutionStep } from '@ouro/core';
import { callAI } from '../ai/llm-client';
import { PLAN_GENERATE_SYSTEM, buildPlanPrompt } from '../ai/prompts/plan-generate';
import { query } from '../db/client';

export async function generatePlan(intent: ParsedIntent): Promise<ExecutionPlan> {
  // For 'capture' intents, skip AI planning — just store
  if (intent.intent_type === 'capture') {
    return createSimplePlan(intent, [{
      id: 's1', tool: 'file_manager', input: { action: 'save', content: intent.description },
      depends_on: [], estimated_duration_ms: 100, estimated_tokens: 0, status: 'pending',
    }]);
  }

  const userPrompt = buildPlanPrompt(intent.description, intent.parameters);

  const response = await callAI([
    { role: 'system', content: PLAN_GENERATE_SYSTEM },
    { role: 'user', content: userPrompt },
  ], { temperature: 0.4 });

  let parsed: any;
  try {
    const clean = response.content.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    // Fallback: single code_generation step
    parsed = {
      steps: [{
        id: 's1', tool: 'code_generation',
        input: { prompt: intent.description },
        deps: [], est_tokens: 4000, est_duration_ms: 15000,
      }],
      estimated_total_duration_ms: 15000,
      estimated_total_tokens: 4000,
    };
  }

  const steps: ExecutionStep[] = (parsed.steps || []).map((s: any) => ({
    id: s.id,
    tool: s.tool,
    input: s.input,
    depends_on: s.deps || [],
    fallback: s.fallback,
    estimated_duration_ms: s.est_duration_ms || 10000,
    estimated_tokens: s.est_tokens || 2000,
    status: 'pending' as const,
  }));

  const parallelGroups = computeParallelGroups(steps);

  return createSimplePlan(intent, steps, parallelGroups, parsed.estimated_total_duration_ms, parsed.estimated_total_tokens);
}

function computeParallelGroups(steps: ExecutionStep[]): string[][] {
  const groups: string[][] = [];
  const completed = new Set<string>();

  while (completed.size < steps.length) {
    const group = steps
      .filter(s => !completed.has(s.id) && s.depends_on.every(d => completed.has(d)))
      .map(s => s.id);
    if (group.length === 0) break;
    groups.push(group);
    group.forEach(id => completed.add(id));
  }

  return groups;
}

async function createSimplePlan(
  intent: ParsedIntent,
  steps: ExecutionStep[],
  parallelGroups?: string[][],
  totalDuration?: number,
  totalTokens?: number,
): Promise<ExecutionPlan> {
  const plan: ExecutionPlan = {
    id: generateId(),
    intent_id: intent.id,
    signal_id: intent.signal_id,
    steps,
    parallel_groups: parallelGroups || [steps.map(s => s.id)],
    estimated_total_duration_ms: totalDuration || steps.reduce((a, s) => a + s.estimated_duration_ms, 0),
    estimated_total_tokens: totalTokens || steps.reduce((a, s) => a + s.estimated_tokens, 0),
    status: 'planned',
    created_at: now(),
  };

  await query(
    `INSERT INTO execution_plans (id, intent_id, signal_id, plan_dag, status, total_steps)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [plan.id, plan.intent_id, plan.signal_id, JSON.stringify({ steps }), plan.status, steps.length]
  );

  // Store individual steps
  for (const step of steps) {
    await query(
      `INSERT INTO execution_steps (id, plan_id, step_index, tool_name, tool_input, depends_on, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [generateId(), plan.id, step.id, step.tool, JSON.stringify(step.input), step.depends_on, step.status]
    );
  }

  return plan;
}
