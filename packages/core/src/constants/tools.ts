/**
 * Tool Constants
 * 
 * Registry of all built-in tool IDs with their primary capabilities.
 */

export const BUILT_IN_TOOLS = [
  'code_generation', 'web_research', 'doc_writer', 'image_generation',
  'data_analyzer', 'file_manager', 'slide_builder', 'api_builder',
  'email_writer', 'translator', 'business_plan', 'ui_mockup',
  'sql_builder', 'mind_map', 'summarizer', 'debugger',
  'project_scaffold', 'diagram_generator', 'test_writer', 'readme_generator',
  'color_palette', 'regex_builder', 'git_helper', 'learning_plan',
  'social_post', 'json_transformer',
] as const;

export type BuiltInToolId = typeof BUILT_IN_TOOLS[number];

export const TOOL_CATEGORIES: Record<string, string[]> = {
  code: ['code_generation', 'api_builder', 'project_scaffold', 'debugger', 'test_writer', 'regex_builder', 'git_helper'],
  writing: ['doc_writer', 'email_writer', 'readme_generator', 'summarizer', 'social_post'],
  design: ['image_generation', 'ui_mockup', 'color_palette', 'diagram_generator', 'mind_map'],
  data: ['data_analyzer', 'sql_builder', 'json_transformer'],
  strategy: ['business_plan', 'learning_plan', 'web_research'],
  system: ['file_manager', 'translator', 'slide_builder'],
};

export const DOMAIN_TO_TOOL: Record<string, string> = {
  technology: 'code_generation',
  design: 'ui_mockup',
  business: 'business_plan',
  writing: 'doc_writer',
  language: 'translator',
  data: 'data_analyzer',
};
