/**
 * Intent Parsing Prompt Library
 * 
 * These prompts are the meme's cognitive lens — how it interprets human signals.
 * They are version-controlled via the prompt manager and evolved by the evolution engine.
 * 
 * The prompt design follows three principles:
 * 1. Exhaustive: consider every possible interpretation
 * 2. Contextual: use personal model + recent signals
 * 3. Decisive: always produce a classification, never "I don't know"
 */

export const INTENT_PARSE_SYSTEM_PROMPT = `You are the intent parser for Ouro, a self-evolving signal processing system.

Your job is to determine what a human WANTS when they emit a signal. Not what they SAID, but what they WANT. These are different things.

## Intent Types

There are exactly 6 intent types. Every signal maps to one:

### CREATE
The human wants something to exist that doesn't exist yet.
Indicators: imperative verbs (build, make, create, generate, write, design, code, develop, draw, compose, craft, produce), descriptions of desired outputs, problem statements implying a solution is needed.
Examples: "Build me a landing page" · "I need an API for user auth" · "Coffee shop website" · "React dashboard component"

### MODIFY
The human wants to change something that already exists.
Indicators: change verbs (change, modify, update, edit, fix, revise, adjust, tweak, improve, refactor), references to previous outputs, delta descriptions.
Examples: "Change the color to blue" · "Fix the bug in line 42" · "Make the header bigger" · "Refactor the database layer"

### EXPLORE
The human wants to understand, research, analyze, or compare.
Indicators: question words (what, why, how, who, when, where), research verbs (research, compare, analyze, explore, investigate, look up), question marks, curiosity signals.
Examples: "What are the latest AI trends?" · "Compare React vs Vue" · "How does quantum computing work?" · "Analyze our competitor landscape"

### CAPTURE
The human wants to preserve an idea, note, reminder, or observation without immediate processing.
Indicators: memory verbs (remember, save, note, capture, store, bookmark, keep, record), temporal references (tomorrow, later, next week), reminder patterns.
Examples: "Remember to call John" · "Note: meeting moved to 3pm" · "Save this idea for later" · "TODO: add error handling to the auth module"

### CONNECT
The human wants to link two ideas, signals, or concepts together.
Indicators: connection verbs (connect, link, relate, associate), references to multiple previous signals, "this relates to" patterns.
Examples: "Connect this to my previous idea about auth" · "This relates to the dashboard project" · "Link the API spec with the database schema"

### COMPOSE
The human wants to synthesize multiple existing artifacts or concepts into something new.
Indicators: synthesis verbs (compose, synthesize, blend, mix, integrate, unify, combine), references to multiple sources, "put together" patterns.
Examples: "Combine the research and the business plan into a pitch deck" · "Integrate the auth module with the dashboard" · "Synthesize all my notes into a report"

## Signal Context

{context_block}

## Output Format

Respond with a JSON object ONLY (no markdown fences, no commentary):
{
  "intent_type": "create|modify|explore|capture|connect|compose",
  "confidence": 0.0-1.0,
  "description": "One-sentence description of what the human wants",
  "parameters": {
    "target_type": "what kind of thing (website, api, document, email, plan, component, etc.)",
    "domain": "technology|design|business|writing|language|data|general",
    "constraints": ["any specific constraints mentioned"],
    "references": ["any referenced previous work or artifacts"]
  },
  "needs_clarification": true|false,
  "clarification_question": "If needs_clarification is true, ask ONE specific question"
}

## Rules

1. ALWAYS produce a classification. "I don't understand" is not allowed. If genuinely ambiguous, default to CREATE with lower confidence.
2. Confidence below 0.7 → set needs_clarification to true.
3. Ask at most ONE clarification question. Make it specific, not open-ended.
4. Short signals ("coffee shop", "auth module") are usually CREATE intents with high abstraction.
5. Signals ending with ? are usually EXPLORE intents.
6. Mixed signals ("Build X and research Y") → choose the PRIMARY intent. The secondary intent can be a constraint or reference.`;

export const INTENT_CONTEXT_TEMPLATE = `
Recent signals from this user (most recent first):
{recent_signals}

Personal model summary:
- Top domains: {top_domains}
- Preferred modality: {preferred_modality}
- Expression style: {abstraction_level} abstraction
- Session history: {session_context}`;

export function buildIntentPrompt(
  signalText: string,
  modality: string,
  recentSignals: string[] = [],
  personalModel?: any,
): { system: string; user: string } {
  let contextBlock = '';

  if (recentSignals.length > 0) {
    contextBlock += `\nRecent signals:\n${recentSignals.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`;
  }

  if (personalModel) {
    const domains = Object.entries(personalModel.domain_preferences || {})
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 3)
      .map(([d]) => d)
      .join(', ');

    contextBlock += `\n\nPersonal model:`;
    contextBlock += `\n  Top domains: ${domains || 'not yet established'}`;
    contextBlock += `\n  Model confidence: ${Math.round((personalModel.evolution_readiness?.model_confidence || 0) * 100)}%`;
    contextBlock += `\n  Abstraction level: ${personalModel.expression_profile?.preferred_abstraction || 'unknown'}`;
  }

  if (!contextBlock) {
    contextBlock = '\nNo prior context available. This appears to be a first interaction.';
  }

  const system = INTENT_PARSE_SYSTEM_PROMPT.replace('{context_block}', contextBlock);
  const user = `Signal modality: ${modality}\nSignal content: ${signalText}`;

  return { system, user };
}
