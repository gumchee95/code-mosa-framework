---
name: mosa-graph-builder
description: Use when MOSA needs a compact workspace graph report, God Nodes, architecture pointers, or graph context for Router Token Shield.
skill_id: MOSA_GRAPH_BUILDER
category: Discovery
---

# MOSA Graph Builder

Graph Builder creates a compact project topology so future turns can understand the workspace without broad rediscovery.

## Mission

Primary outputs:

- `graphify-out/GRAPH_REPORT.md`
- `01_Work/context_bus.json` under `_meta.graph_context`
- `01_Work/task_results.md` pointer summary when the workflow requires it

Graph Builder is discovery-only. It never chooses runtime mode and does not own hook policy, cold repair, Router proof doctrine, or skill dispatch.

## When To Use

Use this skill when:

- The user asks to generate or refresh a graph report.
- A workspace is large or unfamiliar.
- MOSA needs God Nodes or architecture pointers before routing or implementation.
- `graphify-out/GRAPH_REPORT.md` is missing or stale.
- Architecture discovery would otherwise require broad file exploration.

## Graph Construction Rules

- Read existing `graphify-out/GRAPH_REPORT.md` first when present.
- Scan only enough to identify topology and entrypoints.
- Prefer manifests, Node tools, config files, and top-level directories over broad full-text searches.
- Ignore `.git/`, `node_modules/`, `dist/`, `build/`, `.next/`, `venv/`, and `__pycache__/`.
- Keep the report compact and pointer-based.

God Nodes should include present high-signal locations such as:

- `00_System/`
- `01_Work/`
- `02_Output/`
- `graphify-out/GRAPH_REPORT.md`
- `AGENTS.md`
- `README.md`
- major source entrypoints like `src/`, `app/`, `package.json`, `Code.gs`, `Index.html`, or `appsscript.json`

## GRAPH_REPORT.md Contract

`graphify-out/GRAPH_REPORT.md` should contain:

- `## God Nodes`
- `## Mermaid Topology`
- `## Token Shield Rule`
- `## Current Efficiency Notes`
- `## Startup Pointers`

The Mermaid diagram should show:

- user intent
- standard / cold-repair evidence
- startup proof
- context bus
- optional Dynamic Capability DAG
- Router proof
- selected skill after proof
- task results
- graph context

## Context Bus Contract

Store graph context in `01_Work/context_bus.json`:

```json
{
  "_meta": {
    "graph_context": {
      "report": "graphify-out/GRAPH_REPORT.md",
      "god_nodes": ["00_System", "01_Work", "02_Output"],
      "generated_at": "<iso timestamp>"
    }
  }
}
```

## Token Shield Rule

Future agents should read in this order:

1. `graphify-out/GRAPH_REPORT.md`
2. `01_Work/context_bus.json`
3. `01_Work/startup_result.json`
4. `01_Work/workflow_plan.json` only when DAG routing is active
5. `01_Work/routing_result.json` when dispatch proof is needed
6. `02_Output/routing_index_light.json` before full registry diagnostics

Full registry reports and full `SKILL.md` bodies are cold reads.

## Validation Checklist

- `graphify-out/GRAPH_REPORT.md` exists.
- The report contains a Mermaid graph.
- The report lists God Nodes.
- `01_Work/context_bus.json._meta.graph_context.report` points to the graph report.
- `01_Work/task_results.md` contains a compact pointer summary when needed.

## Anti-Patterns

- Do not act as Router or Orchestrator.
- Do not run hooks from this skill.
- Do not repair startup evidence from this skill.
- Do not store full graph content in state.
- Do not use broad scans when graph context already exists.
