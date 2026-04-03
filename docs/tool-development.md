# Developing Ouro Tools

## Quick Start

Any tool just needs to implement the `OuroTool` interface:

```typescript
interface OuroTool {
  manifest: ToolManifest;
  execute(input: ToolInput): Promise<ToolOutput>;
}
```

## Manifest

```typescript
const manifest: ToolManifest = {
  id: 'my-org/my-tool',
  version: '1.0.0',
  name: 'My Tool',
  description: 'What this tool does — be specific, AI uses this to decide when to call it',
  capabilities: ['tag1', 'tag2'],
  input_schema: { /* JSON Schema */ },
  output_schema: { /* JSON Schema */ },
};
```

## Registration Methods

1. **Local directory:** Drop in `tools/plugins/`
2. **npm package:** `npm install ouro-tool-xxx`
3. **Remote URL:** MCP protocol compatible
4. **Docker container:** Any containerized service
5. **Inline function:** For rapid prototyping
6. **AI-generated:** System auto-creates tools when needed

## Output Format

Always return `ToolOutput` with at least one artifact:

```typescript
return {
  success: true,
  artifacts: [{
    type: 'text',  // or 'file', 'url', 'data'
    content: 'the actual output',
    metadata: { type: 'code', language: 'python' },
  }],
};
```
