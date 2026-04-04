import { query, getOne } from './client';
import { generateId, now } from '@ouro/core';
import { embedText } from '../ai/llm-client';

/**
 * Database Seeder — Populates the database with realistic development data.
 * 
 * This creates a rich dataset that demonstrates all 7 layers:
 * - Signals across multiple modalities and sessions
 * - Intents of all 6 types
 * - Execution plans with varying tool combinations
 * - Artifacts with version histories
 * - Feedback with diverse satisfaction scores
 * - Patterns across all 5 categories
 * - Evolution events showing system improvement
 * - Idea graph connections
 */

export async function seedDevelopmentData(): Promise<{
  signals: number;
  intents: number;
  plans: number;
  artifacts: number;
  feedback: number;
  patterns: number;
  evolutions: number;
  connections: number;
}> {
  console.log('[Seeder] Starting development data seed...');
  const counts = { signals: 0, intents: 0, plans: 0, artifacts: 0, feedback: 0, patterns: 0, evolutions: 0, connections: 0 };

  // Check if already seeded
  const existing = await getOne<any>('SELECT COUNT(*) as c FROM signals');
  if (parseInt(existing?.c || '0') > 20) {
    console.log('[Seeder] Database already has data. Skipping seed.');
    return counts;
  }

  // === Seed signals across a realistic timeline ===
  const signalData = [
    // Session 1: Building a startup landing page
    { text: 'Build me a landing page for my AI startup called Nexus', modality: 'text', session: 'session_1', hour: 9 },
    { text: 'Change the hero section to have a gradient background', modality: 'text', session: 'session_1', hour: 9 },
    { text: 'Add a pricing section with three tiers', modality: 'text', session: 'session_1', hour: 10 },
    { text: 'Research competitor pricing for AI tools', modality: 'text', session: 'session_1', hour: 10 },
    { text: 'Remember: need to add GDPR cookie banner', modality: 'text', session: 'session_1', hour: 11 },

    // Session 2: Writing content
    { text: 'Write a blog post about the future of personal AI assistants', modality: 'text', session: 'session_2', hour: 14 },
    { text: 'Translate the blog post summary to Chinese', modality: 'text', session: 'session_2', hour: 15 },
    { text: 'Create social media posts for the blog launch', modality: 'text', session: 'session_2', hour: 15 },

    // Session 3: Technical development
    { text: 'Design a REST API for user authentication with JWT', modality: 'text', session: 'session_3', hour: 21 },
    { text: 'Write unit tests for the auth middleware', modality: 'text', session: 'session_3', hour: 21 },
    { text: 'Debug: login endpoint returns 500 when email has special characters', modality: 'text', session: 'session_3', hour: 22 },
    { text: 'Generate a database schema for multi-tenant SaaS', modality: 'text', session: 'session_3', hour: 22 },

    // Session 4: Business planning
    { text: 'Create a business plan for Nexus AI', modality: 'text', session: 'session_4', hour: 8 },
    { text: 'Compare our approach with OpenAI and Anthropic consumer products', modality: 'text', session: 'session_4', hour: 8 },
    { text: 'Build a financial projection spreadsheet for 3 years', modality: 'text', session: 'session_4', hour: 9 },

    // Session 5: Design work
    { text: 'Generate a color palette for a professional AI brand', modality: 'text', session: 'session_5', hour: 16 },
    { text: 'Create a UI mockup for the dashboard', modality: 'text', session: 'session_5', hour: 16 },
    { text: 'Design a mind map of our product features', modality: 'text', session: 'session_5', hour: 17 },

    // Session 6: Learning
    { text: 'Create a learning plan for Rust programming', modality: 'text', session: 'session_6', hour: 20 },
    { text: 'Explain how async/await works in Rust compared to JavaScript', modality: 'text', session: 'session_6', hour: 20 },

    // Diverse modalities (simulated)
    { text: '[Voice memo] Random thought: what if we integrated with calendar apps?', modality: 'voice', session: 'session_7', hour: 7 },
    { text: '[Sketch] Rough wireframe of onboarding flow', modality: 'sketch', session: 'session_7', hour: 11 },
    { text: '[Photo] Whiteboard from team meeting about Q2 goals', modality: 'image', session: 'session_7', hour: 14 },
    { text: '[File upload] competitor-analysis.pdf — summarize key findings', modality: 'file', session: 'session_7', hour: 15 },
    { text: 'Connect the calendar integration idea with the dashboard mockup', modality: 'text', session: 'session_7', hour: 16 },
  ];

  const intentTypes = ['create', 'modify', 'explore', 'capture', 'connect', 'create'];
  const tools = ['code_generation', 'doc_writer', 'web_research', 'file_manager', 'ui_mockup', 'business_plan', 'translator', 'slide_builder', 'email_writer', 'color_palette', 'mind_map', 'sql_builder', 'debugger', 'test_writer', 'learning_plan', 'social_post'];
  const domains = ['technology', 'design', 'business', 'writing', 'general', 'technology'];

  const signalIds: string[] = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 7); // Start 7 days ago

  for (let i = 0; i < signalData.length; i++) {
    const s = signalData[i];
    const signalId = generateId();
    signalIds.push(signalId);

    // Create timestamp spread over the last week
    const dayOffset = Math.floor(i / 5);
    const signalDate = new Date(baseDate);
    signalDate.setDate(signalDate.getDate() + dayOffset);
    signalDate.setHours(s.hour, Math.floor(Math.random() * 60), 0);
    const timestamp = signalDate.toISOString();

    // Generate embedding
    let embedding: number[] | null = null;
    try { embedding = await embedText(s.text); } catch {}
    const embStr = embedding ? `[${embedding.join(',')}]` : null;

    // Insert signal
    await query(
      `INSERT INTO signals (id, created_at, modality, raw_content, normalized_text, embedding, context, status)
       VALUES ($1, $2, $3, $4, $4, $5::vector, $6, 'completed')`,
      [signalId, timestamp, s.modality, s.text, embStr,
       JSON.stringify({ session_id: s.session, device: 'web', preceding_signal_id: i > 0 && signalData[i-1].session === s.session ? signalIds[i-1] : null })]
    );
    counts.signals++;

    // Insert intent
    const intentType = /remember|save|note/i.test(s.text) ? 'capture' :
                        /research|compare|explain|what/i.test(s.text) ? 'explore' :
                        /change|modify|debug|fix/i.test(s.text) ? 'modify' :
                        /connect|link/i.test(s.text) ? 'connect' : 'create';
    const domain = /code|api|auth|database|test|debug|rust/i.test(s.text) ? 'technology' :
                   /color|ui|mockup|design|wireframe/i.test(s.text) ? 'design' :
                   /business|pricing|competitor|financial/i.test(s.text) ? 'business' :
                   /blog|write|translate|social/i.test(s.text) ? 'writing' : 'general';

    const intentId = generateId();
    await query(
      `INSERT INTO intents (id, signal_id, intent_type, confidence, description, parameters, needs_clarification, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7)`,
      [intentId, signalId, intentType, 0.82 + Math.random() * 0.15,
       `${intentType}: ${s.text.slice(0, 100)}`,
       JSON.stringify({ domain, target_type: intentType === 'create' ? 'artifact' : intentType }),
       timestamp]
    );
    counts.intents++;

    // Insert execution plan
    const tool = /code|api|auth|component/i.test(s.text) ? 'code_generation' :
                 /research|compare|explain/i.test(s.text) ? 'web_research' :
                 /blog|write|article/i.test(s.text) ? 'doc_writer' :
                 /translate/i.test(s.text) ? 'translator' :
                 /remember|save|note/i.test(s.text) ? 'file_manager' :
                 /color/i.test(s.text) ? 'color_palette' :
                 /mockup|ui/i.test(s.text) ? 'ui_mockup' :
                 /business plan/i.test(s.text) ? 'business_plan' :
                 /mind map/i.test(s.text) ? 'mind_map' :
                 /sql|database|schema/i.test(s.text) ? 'sql_builder' :
                 /debug/i.test(s.text) ? 'debugger' :
                 /test/i.test(s.text) ? 'test_writer' :
                 /social/i.test(s.text) ? 'social_post' :
                 /learn/i.test(s.text) ? 'learning_plan' :
                 /pricing|financial/i.test(s.text) ? 'data_analyzer' :
                 /connect/i.test(s.text) ? 'file_manager' :
                 'doc_writer';

    const planId = generateId();
    const durationMs = 1000 + Math.floor(Math.random() * 8000);
    await query(
      `INSERT INTO execution_plans (id, signal_id, intent_id, status, plan_dag, total_steps, completed_steps, started_at, completed_at, total_duration_ms, created_at)
       VALUES ($1, $2, $3, 'completed', $4, 1, 1, $5, $5, $6, $5)`,
      [planId, signalId, intentId,
       JSON.stringify({ steps: [{ id: 's1', tool, input: { prompt: s.text }, deps: [] }] }),
       timestamp, durationMs]
    );
    counts.plans++;

    // Insert artifact
    const artifactId = generateId();
    const artifactContent = `Generated ${tool} output for: ${s.text.slice(0, 80)}`;
    const artType = /code|api|debug|test|sql/i.test(tool) ? 'code' :
                     /doc|writer|blog|email|readme|social|learn|business|summariz/i.test(tool) ? 'document' :
                     /image|color|diagram/i.test(tool) ? 'design' :
                     /mockup|ui/i.test(tool) ? 'website' :
                     /data|analyz/i.test(tool) ? 'data' : 'other';
    let artEmb: number[] | null = null;
    try { artEmb = await embedText(artifactContent); } catch {}
    const artEmbStr = artEmb ? `[${artEmb.join(',')}]` : null;

    await query(
      `INSERT INTO artifacts (id, plan_id, signal_id, artifact_type, title, description, content_url, content_hash, metadata, version, is_latest, embedding, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, TRUE, $10::vector, $11)`,
      [artifactId, planId, signalId, artType, s.text.slice(0, 100), s.text,
       `inline://${artifactId.slice(0, 12)}`, artifactId.slice(0, 16),
       JSON.stringify({ type: artType, tool, inline_content: artifactContent }),
       artEmbStr, timestamp]
    );
    counts.artifacts++;

    // Insert feedback (varied satisfaction)
    const actions = ['accept', 'accept', 'accept', 'modify', 'reject', 'accept', 'share'];
    const action = actions[i % actions.length];
    const satisfaction = action === 'accept' ? 0.75 + Math.random() * 0.25 :
                         action === 'share' ? 0.9 + Math.random() * 0.1 :
                         action === 'modify' ? 0.4 + Math.random() * 0.2 :
                         0.1 + Math.random() * 0.2;

    await query(
      `INSERT INTO feedback (id, artifact_id, signal_id, action, satisfaction_score, time_to_react_ms, view_duration_ms, scroll_depth, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [generateId(), artifactId, signalId, action, satisfaction,
       1000 + Math.floor(Math.random() * 10000),
       5000 + Math.floor(Math.random() * 30000),
       0.3 + Math.random() * 0.7,
       timestamp]
    );
    counts.feedback++;

    // Insert patterns
    const patternTypes = ['creativity_trigger', 'domain_preference', 'expression_habit'];
    for (const pt of patternTypes) {
      const patternData = pt === 'creativity_trigger'
        ? { trigger: 'time_of_day', value: s.hour < 12 ? 'morning' : s.hour < 18 ? 'afternoon' : 'night', hour: s.hour, modality: s.modality }
        : pt === 'domain_preference'
        ? { domain, intent_type: intentType, confidence: 0.85 }
        : { modality: s.modality, text_length: s.text.length, word_count: s.text.split(' ').length, language_detected: 'en', intent_type: intentType };

      await query(
        `INSERT INTO signal_patterns (id, pattern_type, pattern_data, strength, sample_count, last_seen_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 1, $5, $5, $5)`,
        [generateId(), pt, JSON.stringify(patternData), 0.5 + Math.random() * 0.3, timestamp]
      );
      counts.patterns++;
    }
  }

  // === Seed idea connections ===
  // Connect signals within same sessions
  for (let i = 1; i < signalIds.length; i++) {
    if (signalData[i].session === signalData[i-1].session) {
      await query(
        `INSERT INTO idea_connections (id, source_signal_id, target_signal_id, connection_type, strength, created_by)
         VALUES ($1, $2, $3, 'session_sequence', $4, 'system')
         ON CONFLICT DO NOTHING`,
        [generateId(), signalIds[i-1], signalIds[i], 0.8 + Math.random() * 0.2]
      );
      counts.connections++;
    }
  }

  // Cross-session semantic connections
  const crossConnections = [
    [0, 12], // landing page ↔ business plan
    [3, 13], // competitor research ↔ competitive comparison
    [8, 11], // API design ↔ database schema
    [5, 7],  // blog post ↔ social media
    [15, 16], // color palette ↔ UI mockup
    [20, 24], // calendar idea ↔ connect idea
  ];
  for (const [a, b] of crossConnections) {
    if (signalIds[a] && signalIds[b]) {
      await query(
        `INSERT INTO idea_connections (id, source_signal_id, target_signal_id, connection_type, strength, created_by)
         VALUES ($1, $2, $3, 'semantic_similarity', $4, 'system')
         ON CONFLICT DO NOTHING`,
        [generateId(), signalIds[a], signalIds[b], 0.7 + Math.random() * 0.25]
      );
      counts.connections++;
    }
  }

  // === Seed evolution events ===
  const evoEvents = [
    { layer: 2, component: 'prompt_template', type: 'prompt_revision', detail: { improvement: 'Added domain context to intent parsing prompt' } },
    { layer: 3, component: 'tool_selection', type: 'weight_update', detail: { code_generation: 1.1, doc_writer: 1.0, web_research: 0.95 } },
    { layer: 3, component: 'execution_path', type: 'path_cache', detail: { cached_paths: 5 } },
    { layer: 6, component: 'personal_model', type: 'weight_update', detail: { confidence: 0.25, total_signals: 25 } },
    { layer: 6, component: 'evolution_strategy', type: 'meta_evolution', detail: { observation: 'Increasing min_samples threshold due to stable performance' } },
  ];

  for (const e of evoEvents) {
    await query(
      `INSERT INTO evolution_events (id, created_at, target_layer, target_component, change_type, change_detail, evidence_count, expected_improvement)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [generateId(), now(), e.layer, e.component, e.type, JSON.stringify(e.detail), 10 + Math.floor(Math.random() * 20), 0.05 + Math.random() * 0.1]
    );
    counts.evolutions++;
  }

  // Update system state
  await query(`UPDATE system_state SET value = to_jsonb($1::int), updated_at = NOW() WHERE key = 'evolution_cycle_count'`, [3]);

  console.log(`[Seeder] Complete:`, counts);
  return counts;
}
