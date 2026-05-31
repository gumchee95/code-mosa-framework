---
name: mosa-graph-builder
description: MOSA Topology Generator. Creates compact graph reports, Token Shield instructions, startup pointers, and project maps for reusable AI sessions.
skill_id: MOSA_GRAPH_BUILDER
category: Discovery
route_policy: active
---

# MOSA Graph Builder

## Mission

Graph Builder turns a workspace into a compact topology package so every new chat or AI can start from project state instead of rediscovering the project.

## Primary Outputs

- `graphify-out/GRAPH_REPORT.md`
- `AGENTS.md`
- `01_Work/session_state.json.graph_context`
- `01_Work/context_bus.json`
- startup pointers in `02_Output/startup_manifest.json`

## Activation Conditions

Use this skill when:

- Starting a new project.
- Opening a large or unfamiliar workspace.
- The user asks about architecture, dependencies, routing, or Token Shield.
- `graphify-out/GRAPH_REPORT.md` is missing or stale.
- MOSA project startup protocol needs installation.

## Environment Rules

1. Locate `{Workspace_Root}` by finding the nearest `00_System`.
2. If missing, initialize MOSA files instead of failing.
3. Never hardcode user-specific absolute paths.
4. Keep generated state pointer-based.
5. Never store full source files in `session_state.json`.

## Graph Contract

`GRAPH_REPORT.md` must contain:

- `## God Nodes`
- `## Mermaid Topology`
- `## Token Shield Rule`
- `## Active Skill Routing`
- `## Maintenance Routing`
- `## Current Efficiency Notes`

The graph should show:

- User intent
- Orchestrator
- task file
- context bus
- Router
- routing cache
- startup manifest
- routing index
- reference map
- selected skill
- Harmonizer
- maintenance report

## Startup Read Order

1. `AGENTS.md`
2. `00_System/mosa_cli.js`
3. `02_Output/startup_manifest.json`
4. `graphify-out/GRAPH_REPORT.md`
5. `00_System/prompt_stack.md`
6. `01_Work/task.md`
7. `02_Output/routing_index_light.json` if routing is needed
8. Full Skill files only when confidence is low or exact SOP details are required

## Validation Checklist

- `graphify-out/GRAPH_REPORT.md` exists.
- `AGENTS.md` exists.
- Graph contains God Nodes.
- Graph contains Router and Orchestrator.
- Graph contains `mosa_cli.js`.
- Graph contains maintenance routing.
- `session_state.json.graph_context.report` points to the graph.
- `context_bus.json` exists.

## Handoff Output

```text
[Status: Success]
[Data:
- graph_report: graphify-out/GRAPH_REPORT.md
- token_shield: AGENTS.md
- graph_context: 01_Work/session_state.json
]
[Next_Step: @mosa-harmonizer --update-stack]
```

## Guardrails

- Do not start with broad full-text scans when graph context exists.
- Do not generate massive reports.
- Do not store full file contents in state.
- Do not treat cold registry reports as chat context.
