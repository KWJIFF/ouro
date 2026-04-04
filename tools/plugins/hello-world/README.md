# Hello World Tool

A minimal example demonstrating how to create an Ouro plugin tool.

## Structure

```
hello-world/
├── manifest.json    # Tool metadata (required)
├── index.js         # Tool implementation (required)
└── README.md        # Documentation (optional)
```

## How It Works

1. Place this directory in `tools/plugins/`
2. Ouro auto-discovers it on startup
3. The tool is registered and available for the execution planner

## Manifest

The `manifest.json` tells Ouro:
- What this tool can do (capabilities)
- What input it expects (input_schema)
- What output it produces (output_schema)

## Implementation

The `index.js` exports an `execute` function that:
- Receives a `ToolInput` object with parameters, context, and resources
- Returns a `ToolOutput` object with success status and artifacts

## Creating Your Own Tool

1. Copy this directory
2. Update `manifest.json` with your tool's metadata
3. Implement `execute()` in `index.js`
4. Drop it in `tools/plugins/`
5. Restart Ouro (or use the hot-reload API)
