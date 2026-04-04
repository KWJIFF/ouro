import { generateId, now } from '@ouro/core';
import type { ParsedIntent, ExecutionPlan, ExecutionStep } from '@ouro/core';
import { callAI } from '../ai/llm-client';
import { buildPlanPrompt } from '../ai/prompts/plan-generate';
import { query, getOne } from '../db/client';
import { toolRegistry } from '../tools/registry';

export async function generatePlan(intent: ParsedIntent): Promise<ExecutionPlan> {
  // For 'capture' intents, skip AI planning — just store
  if (intent.intent_type === 'capture') {
    return createSimplePlan(intent, [{
      id: 's1', tool: 'file_manager', input: { action: 'save', content: intent.description },
      depends_on: [], estimated_duration_ms: 100, estimated_tokens: 0, status: 'pending',
    }]);
  }

  // Get tool manifests for prompt context
  const manifests = toolRegistry.getAllManifests();

  // Get cached paths from system state
  let cachedPaths: Record<string, any> = {};
  try {
    const cached = await getOne<any>("SELECT value FROM system_state WHERE key = 'execution_path_cache'");
    cachedPaths = cached?.value || {};
  } catch {}

  // Build prompt using the prompt library
  const { system, user } = buildPlanPrompt(
    { type: intent.intent_type, description: intent.description, parameters: intent.parameters },
    manifests,
    cachedPaths,
  );

  const response = await callAI([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { temperature: 0.3, max_tokens: 2048 });

  let planData: any;
  try {
    planData = JSON.parse(response.content.replace(/```json|```/g, '').trim());
  } catch {
    // Fallback: single-step plan with best-guess tool
    const tool = guessToolFromIntent(intent);
    planData = {
      steps: [{ id: 's1', tool, input: { prompt: intent.description }, deps: [], est_tokens: 3000, est_duration_ms: 5000 }],
      estimated_total_duration_ms: 5000,
      estimated_total_tokens: 3000,
    };
  }

  const steps: ExecutionStep[] = (planData.steps || []).map((s: any) => ({
    id: s.id || generateId().slice(0, 8),
    tool: s.tool,
    input: s.input || { prompt: intent.description },
    depends_on: s.deps || [],
    estimated_duration_ms: s.est_duration_ms || 5000,
    estimated_tokens: s.est_tokens || 2000,
    status: 'pending' as const,
  }));

  return createSimplePlan(intent, steps);
}

function guessToolFromIntent(intent: ParsedIntent): string {
  const desc = intent.description.toLowerCase();
  const params = intent.parameters || {};

  if (/code|api|react|python|server|frontend|backend|component|script/i.test(desc)) return 'code_generation';
  if (/research|compare|analyze|what is|how does/i.test(desc)) return 'web_research';
  if (/document|article|write|report|blog|essay/i.test(desc)) return 'doc_writer';
  if (/image|draw|illustrat|visual|diagram/i.test(desc)) return 'image_generation';
  if (/slide|presentation|deck|pitch/i.test(desc)) return 'slide_builder';
  if (/email|newsletter|outreach/i.test(desc)) return 'email_writer';
  if (/translat/i.test(desc)) return 'translator';
  if (/sql|database|query|schema|migration/i.test(desc)) return 'sql_builder';
  if (/ui|mockup|wireframe|interface|dashboard/i.test(desc)) return 'ui_mockup';
  if (/summariz|summary|tldr/i.test(desc)) return 'summarizer';
  if (/debug|bug|fix|review|security/i.test(desc)) return 'debugger';
  if (/mind map|brainstorm/i.test(desc)) return 'mind_map';
  if (/business plan|startup plan/i.test(desc)) return 'business_plan';
  if (/data|csv|chart|statistic|analyz/i.test(desc)) return 'data_analyzer';
  if (/color|palette|theme/i.test(desc)) return 'color_palette';
  if (/regex|pattern match/i.test(desc)) return 'regex_builder';
  if (/test|testing|spec/i.test(desc)) return 'test_writer';
  if (/readme|documentation/i.test(desc)) return 'readme_generator';
  if (/social|tweet|linkedin|post/i.test(desc)) return 'social_post';
  if (/git|commit|branch/i.test(desc)) return 'git_helper';
  if (/learn|study|curriculum/i.test(desc)) return 'learning_plan';
  if (/json|yaml|transform|convert/i.test(desc)) return 'json_transformer';
  if (/scaffold|project|boilerplate/i.test(desc)) return 'project_scaffold';
  if (/diagram|flowchart|sequence/i.test(desc)) return 'diagram_generator';
  if (/landing page|website|web page|page/i.test(desc)) return 'code_generation';
  if (/plan/i.test(desc)) return 'business_plan';
  if (/save|remember|note|file/i.test(desc)) return 'file_manager';

  // Default by intent type
  if (intent.intent_type === 'explore') return 'web_research';
  if (intent.intent_type === 'modify') return 'code_generation';
  if (intent.intent_type === 'connect') return 'file_manager';
  if (intent.intent_type === 'compose') return 'doc_writer';

  return 'doc_writer';
}

async function createSimplePlan(intent: ParsedIntent, steps: ExecutionStep[]): Promise<ExecutionPlan> {
  const planId = generateId();

  // Compute parallel groups
  const parallelGroups = computeParallelGroups(steps);

  const plan: ExecutionPlan = {
    id: planId,
    signal_id: intent.signal_id,
    intent_id: intent.id,
    steps,
    parallel_groups: parallelGroups,
    status: 'planned',
    created_at: now(),
    started_at: undefined,
    completed_at: undefined,
    estimated_total_duration_ms: steps.reduce((s, st) => s + (st.estimated_duration_ms || 5000), 0),
    estimated_total_tokens: steps.reduce((s, st) => s + (st.estimated_tokens || 2000), 0),
  };

  // Persist plan
  await query(
    `INSERT INTO execution_plans (id, signal_id, intent_id, status, plan_dag, total_steps, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [plan.id, plan.signal_id, plan.intent_id, plan.status,
     JSON.stringify({ steps }), steps.length, plan.created_at]
  );

  // Persist steps
  for (let i = 0; i < steps.length; i++) {
    await query(
      `INSERT INTO execution_steps (id, plan_id, step_index, tool_name, tool_input, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [generateId(), planId, steps[i].id, steps[i].tool, JSON.stringify(steps[i].input)]
    );
  }

  return plan;
}

function computeParallelGroups(steps: ExecutionStep[]): string[][] {
  const groups: string[][] = [];
  const completed = new Set<string>();

  while (completed.size < steps.length) {
    const group = steps
      .filter(s => !completed.has(s.id))
      .filter(s => (s.depends_on || []).every(d => completed.has(d)))
      .map(s => s.id);

    if (group.length === 0) break;
    groups.push(group);
    group.forEach(id => completed.add(id));
  }

  return groups;
}
