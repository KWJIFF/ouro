import type { ExecutionPlan, ExecutionStep } from '@ouro/core';
import { now } from '@ouro/core';
import { query } from '../db/client';
import { toolRegistry } from '../tools/registry';

export interface ExecutionEvents {
  onStepStarted?: (step: ExecutionStep) => void;
  onStepProgress?: (stepId: string, progress: number, message: string) => void;
  onStepCompleted?: (step: ExecutionStep) => void;
  onStepFailed?: (step: ExecutionStep, error: string) => void;
  onPlanCompleted?: (plan: ExecutionPlan) => void;
}

export async function executePlan(plan: ExecutionPlan, events?: ExecutionEvents): Promise<ExecutionPlan> {
  plan.status = 'running';
  plan.started_at = now();
  await query('UPDATE execution_plans SET status = $1, started_at = $2 WHERE id = $3', ['running', plan.started_at, plan.id]);

  const stepOutputs: Record<string, any> = {};

  for (const group of plan.parallel_groups) {
    const groupSteps = plan.steps.filter(s => group.includes(s.id));

    // Execute group in parallel
    const results = await Promise.allSettled(
      groupSteps.map(step => executeStep(step, stepOutputs, events))
    );

    // Collect outputs
    results.forEach((result, i) => {
      const step = groupSteps[i];
      if (result.status === 'fulfilled') {
        stepOutputs[step.id] = result.value;
        step.output = result.value;
        step.status = 'completed';
      } else {
        step.error = String(result.reason);
        step.status = 'failed';
        events?.onStepFailed?.(step, step.error);
      }
    });
  }

  const allCompleted = plan.steps.every(s => s.status === 'completed');
  plan.status = allCompleted ? 'completed' : 'failed';
  plan.completed_at = now();

  await query(
    'UPDATE execution_plans SET status = $1, completed_at = $2, completed_steps = $3 WHERE id = $4',
    [plan.status, plan.completed_at, plan.steps.filter(s => s.status === 'completed').length, plan.id]
  );

  events?.onPlanCompleted?.(plan);
  return plan;
}

async function executeStep(
  step: ExecutionStep,
  previousOutputs: Record<string, any>,
  events?: ExecutionEvents,
): Promise<any> {
  step.status = 'running';
  step.started_at = now();
  events?.onStepStarted?.(step);

  try {
    const tool = toolRegistry.getTool(step.tool);
    if (!tool) throw new Error(`Tool not found: ${step.tool}`);

    const output = await tool.execute({
      parameters: step.input,
      context: {
        signal_id: '',
        intent: '',
        user_preferences: {},
        previous_step_outputs: previousOutputs,
      },
      resources: { temp_dir: '/tmp/ouro', output_dir: '/tmp/ouro/output' },
    });

    step.completed_at = now();
    events?.onStepCompleted?.(step);

    // Update DB
    await query(
      'UPDATE execution_steps SET status = $1, output = $2, completed_at = $3 WHERE plan_id = $4 AND step_index = $5',
      ['completed', JSON.stringify(output), step.completed_at, '', step.id]
    );

    return output;
  } catch (error: any) {
    // Try fallback
    if (step.fallback) {
      try {
        const fallbackTool = toolRegistry.getTool(step.fallback.tool);
        if (fallbackTool) {
          return await fallbackTool.execute({
            parameters: step.fallback.input,
            context: { signal_id: '', intent: '', user_preferences: {}, previous_step_outputs: previousOutputs },
            resources: { temp_dir: '/tmp/ouro', output_dir: '/tmp/ouro/output' },
          });
        }
      } catch { /* fallback also failed */ }
    }
    throw error;
  }
}
