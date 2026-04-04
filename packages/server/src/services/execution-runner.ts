import type { ExecutionPlan, ExecutionStep } from '@ouro/core';
import { generateId, now } from '@ouro/core';
import { query } from '../db/client';
import { toolRegistry } from '../tools/registry';
import { emitStepStarted, emitStepCompleted, emitStepFailed } from '../websocket/server';

export async function executePlan(plan: ExecutionPlan, signalId?: string): Promise<ExecutionPlan> {
  plan.status = 'running';
  plan.started_at = now();
  await query('UPDATE execution_plans SET status = $1, started_at = $2 WHERE id = $3',
    ['running', plan.started_at, plan.id]);

  const stepOutputs: Record<string, any> = {};
  const sid = signalId || plan.signal_id;

  for (const group of plan.parallel_groups) {
    const groupSteps = plan.steps.filter(s => group.includes(s.id));

    const results = await Promise.allSettled(
      groupSteps.map(step => executeStep(step, stepOutputs, sid, plan.id))
    );

    results.forEach((result, i) => {
      const step = groupSteps[i];
      if (result.status === 'fulfilled') {
        stepOutputs[step.id] = result.value;
        step.output = result.value;
        step.status = 'completed';
        step.completed_at = now();
      } else {
        step.error = String(result.reason);
        step.status = 'failed';
        step.completed_at = now();
      }
    });
  }

  const completedCount = plan.steps.filter(s => s.status === 'completed').length;
  plan.status = completedCount > 0 ? 'completed' : 'failed';
  plan.completed_at = now();

  const durationMs = plan.started_at ? Date.now() - new Date(plan.started_at).getTime() : 0;
  const totalTokens = plan.steps.reduce((sum, s) => {
    const metrics = s.output?.metrics;
    return sum + (metrics?.tokens_used || 0);
  }, 0);

  await query(
    `UPDATE execution_plans SET status=$1, completed_at=$2, completed_steps=$3,
     total_duration_ms=$4, total_tokens_used=$5 WHERE id=$6`,
    [plan.status, plan.completed_at, completedCount, durationMs, totalTokens, plan.id]
  );

  return plan;
}

async function executeStep(
  step: ExecutionStep,
  previousOutputs: Record<string, any>,
  signalId: string,
  planId: string,
): Promise<any> {
  step.status = 'running';
  step.started_at = now();
  emitStepStarted(signalId, step);

  // Update step status in DB
  try {
    await query(
      `UPDATE execution_steps SET status='running', started_at=$1 WHERE plan_id=$2 AND step_index=$3`,
      [step.started_at, planId, step.id]
    );
  } catch (e) { /* non-critical if row doesn't exist */ }

  try {
    const tool = toolRegistry.getTool(step.tool);
    if (!tool) throw new Error(`Tool not found: ${step.tool}`);

    const output = await tool.execute({
      parameters: step.input,
      context: {
        signal_id: signalId,
        intent: '',
        user_preferences: {},
        previous_step_outputs: previousOutputs,
      },
      resources: { temp_dir: '/tmp/ouro', output_dir: '/tmp/ouro/output' },
    });

    step.completed_at = now();
    emitStepCompleted(signalId, step);

    const durationMs = step.started_at ? Date.now() - new Date(step.started_at).getTime() : 0;
    try {
      await query(
        `UPDATE execution_steps SET status='completed', output=$1, completed_at=$2, duration_ms=$3,
         tokens_used=$4 WHERE plan_id=$5 AND step_index=$6`,
        [JSON.stringify(output), step.completed_at, durationMs,
         output.metrics?.tokens_used || 0, planId, step.id]
      );
    } catch (e) { /* non-critical */ }

    return output;
  } catch (error: any) {
    // Try fallback tool
    if (step.fallback) {
      try {
        const fb = toolRegistry.getTool(step.fallback.tool);
        if (fb) {
          const output = await fb.execute({
            parameters: step.fallback.input,
            context: { signal_id: signalId, intent: '', user_preferences: {}, previous_step_outputs: previousOutputs },
            resources: { temp_dir: '/tmp/ouro', output_dir: '/tmp/ouro/output' },
          });
          emitStepCompleted(signalId, step);
          return output;
        }
      } catch { /* fallback also failed */ }
    }

    emitStepFailed(signalId, step, error.message);

    try {
      await query(
        `UPDATE execution_steps SET status='failed', error=$1, completed_at=$2 WHERE plan_id=$3 AND step_index=$4`,
        [error.message.slice(0, 500), now(), planId, step.id]
      );
    } catch { /* non-critical */ }

    throw error;
  }
}
