# MOSA Light Startup Protocol

This file is a compact project bootstrap reference. `AGENTS.md` remains the canonical protocol.

## Required Workspace Files

- `AGENTS.md`
- `00_System/state.json`
- `00_System/prompt_stack.md`
- `00_System/mosa_cli.js`
- `00_System/mosa_startup.js`
- `00_System/mosa_route.js`
- `01_Work/context_bus.json`
- `01_Work/startup_result.json`
- `02_Output/routing_index_light.json`
- `graphify-out/GRAPH_REPORT.md`

`01_Work/session_state.json` is not required.

## Startup

For normal MOSA work:

```bash
node 00_System/mosa_cli.js start --mode standard --intent "<user intent>" --write
```

Read:

1. `01_Work/startup_result.json`
2. `01_Work/context_bus.json`
3. `graphify-out/GRAPH_REPORT.md` when architecture context is needed
4. `02_Output/routing_index_light.json` only when routing is needed

## Modes

Runtime modes:

- `standard`
- `cold-repair`

Legacy inputs:

- `micro` -> `standard`
- `full` -> `standard`
- `maintenance` -> `standard`

Maintenance is a command:

```bash
node 00_System/mosa_cli.js maintain
```

## Planning And Routing

For cross-skill work:

```bash
node 00_System/mosa_cli.js plan --intent "<user intent>" --write
node 00_System/mosa_cli.js route --intent "<user intent>" --workflow-plan 01_Work/workflow_plan.json
```

`workflow_plan.json` uses only:

- `schema_version`
- `goal`
- `intent_hash`
- `nodes`
- `edges`
- `parallel_groups`
- `router_hints`
- `missing_skills`

`routing_result.json` uses only one route authority:

- `single_route`
- `dag_routes`

## Context Bus

Use `01_Work/context_bus.json` for current-task handoff and graph context:

```json
{
  "_meta": {
    "graph_context": {
      "report": "graphify-out/GRAPH_REPORT.md",
      "god_nodes": ["00_System", "01_Work", "02_Output"]
    }
  }
}
```

## Hooks

Use hooks only for triggered trust events:

```bash
node 00_System/mosa_cli.js hook --event router-proof
```

Routine normal work does not run hooks unless a trust event is triggered.

## Cold Diagnostics

Open full registry diagnostics only for repair, audit, or low-confidence routing:

- `02_Output/registry_distiller_report.json`
