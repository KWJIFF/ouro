import type { ExecutionPlan, ExecutionStep } from '@ouro/core';
import { now } from '@ouro/core';
import { query } from '../db/client';
import { toolRegistry } from '../tools/registry';
import { emitStepStarted, emitStepCompleted, emitStepFailed } from '../websocket/server';

export async function executePlan(plan: ExecutionPlan, signalId?: string): Promise<ExecutionPlan> {
  plan.status = 'running';
  plan.started_at = now();
  await query('UPDATE execution_plans SET status = $1, started_at = $2 WHERE id = $3', ['running', plan.started_at, plan.id]);

  const stepOutputs: Record<string, any> = {};

  for (const group of plan.parallel_groups) {
    const groupSteps = plan.steps.filter(s => group.includes(s.id));

    const results = await Promise.allSettled(
      groupSteps.map(step => executeStep(step, stepOutputs, signalId || plan.signal_id))
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
  plan.status = completedCount === plan.steps.length ? 'completed' : (completedCount > 0 ? 'completed' : 'failed');
  plan.completed_at = now();

  await query(
    'UPDATE execution_plans SET status = $1, completed_at = $2, completed_steps = $3, total_duration_ms = $4 WHERE id = $5',
    [plan.status, plan.completed_at, completedCount,
     plan.started_at ? Date.now() - new Date(plan.started_at).getTime() : 0, plan.id]
  );

  return plan;
}

async function executeStep(
  step: ExecutionStep,
  previousOutputs: Record<string, any>,
  signalId: string,
): Promise<any> {
  step.status = 'running';
  step.started_at = now();
  emitStepStarted(signalId, step);

  await query(
    'UPDATE execution_steps SET status = $1, started_at = $2 WHERE plan_id = (SELECT id FROM execution_plans WHERE signal_id = $3 ORDER BY created_at DESC LIMIT 1) AND step_index = $4',
    ['running', step.started_at, signalId, step.id]
  );

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

    emitStepCompleted(signalId, step);

    await query(
      'UPDATE execution_steps SET status = $1, output = $2, completed_at = $3, duration_ms = $4, tokens_used = $5 WHERE plan_id = (SELECT id FROM execution_plans WHERE signal_id = $6 ORDER BY created_at DESC LIMIT 1) AND step_index = $7',
      ['completed', JSON.stringify(output), now(),
       step.started_at ? Date.now() - new Date(step.started_at).getTime() : 0,
       output.metrics?.tokens_used || 0, signalId, step.id]
    );

    return output;
  } catch (error: any) {
    // Try fallback
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
      } catch { /* fallback failed too */ }
    }

    emitStepFailed(signalId, step, error.message);
    throw error;
  }
}
