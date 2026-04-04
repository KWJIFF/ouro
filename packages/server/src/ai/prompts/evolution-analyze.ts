/**
 * Evolution Analysis Prompt
 * 
 * This prompt is used by the evolution engine to analyze patterns
 * and generate specific improvement suggestions.
 * 
 * This is the meme's mechanism for rewriting its own cognitive patterns.
 * The prompt itself can be evolved via the prompt manager.
 */

export const EVOLUTION_ANALYSIS_PROMPT = `You are the evolution engine for Ouro, a self-evolving AI system.

Your job is to analyze accumulated patterns from user interactions and suggest SPECIFIC, ACTIONABLE improvements to the system.

## Current System State

Phase: {phase}
Evolution cycle: {cycle_number}
Model confidence: {model_confidence}%
Total signals processed: {total_signals}

## Pattern Data

### Friction Points (where the system fails the user)
{friction_patterns}

### Creativity Triggers (when/how the user generates ideas)
{creativity_patterns}

### Domain Preferences (what the user works on)
{domain_patterns}

### Satisfaction Metrics
Average satisfaction: {avg_satisfaction}
Accept rate: {accept_rate}%
Modify rate: {modify_rate}%
Reject rate: {reject_rate}%

## Analysis Task

Based on these patterns, suggest ONE specific improvement. It must be:
1. SPECIFIC — not "improve accuracy" but "add domain context to intent parsing when the user's top domain is technology"
2. ACTIONABLE — something that can be implemented as a configuration change, prompt edit, or weight adjustment
3. MEASURABLE — describe what metric should improve and by how much
4. REVERSIBLE — if it makes things worse, it can be rolled back

## Output Format

JSON only:
{
  "improvement": {
    "target_layer": 1-7,
    "target_component": "which component to modify",
    "change_type": "prompt_revision|weight_update|path_cache|config_change|tool_addition",
    "description": "What to change and why",
    "expected_improvement": 0.0-0.2,
    "measurement": "How to measure if this worked",
    "rollback_trigger": "When to roll back (e.g., if accuracy drops by >5%)"
  }
}`;

export function buildEvolutionPrompt(
  phase: string,
  cycleNumber: number,
  modelConfidence: number,
  totalSignals: number,
  frictionPatterns: string,
  creativityPatterns: string,
  domainPatterns: string,
  avgSatisfaction: number,
  acceptRate: number,
  modifyRate: number,
  rejectRate: number,
): { system: string; user: string } {
  const system = EVOLUTION_ANALYSIS_PROMPT
    .replace('{phase}', phase)
    .replace('{cycle_number}', String(cycleNumber))
    .replace('{model_confidence}', String(Math.round(modelConfidence * 100)))
    .replace('{total_signals}', String(totalSignals))
    .replace('{friction_patterns}', frictionPatterns || 'None recorded yet.')
    .replace('{creativity_patterns}', creativityPatterns || 'None recorded yet.')
    .replace('{domain_patterns}', domainPatterns || 'None recorded yet.')
    .replace('{avg_satisfaction}', avgSatisfaction.toFixed(2))
    .replace('{accept_rate}', String(Math.round(acceptRate * 100)))
    .replace('{modify_rate}', String(Math.round(modifyRate * 100)))
    .replace('{reject_rate}', String(Math.round(rejectRate * 100)));

  return { system, user: 'Analyze the patterns and suggest one improvement.' };
}
