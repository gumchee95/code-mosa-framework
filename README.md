# MOSA Light

MOSA Light is a small coordination layer for AI coding sessions. It preserves the useful parts of MOSA, startup proof, dynamic capability DAGs, Router proof, lightweight routing indexes, and cold diagnostics, while removing duplicated state and mode drift.

## What MOSA Does

MOSA helps a new or long-running chat answer three questions cheaply:

- What workspace am I in?
- What proof or context already exists?
- Which skill should be loaded only when it is actually needed?

It is not meant to run a large orchestration chain for every question.

## Modes

| Mode | Use When | What It Avoids |
| --- | --- | --- |
| `lean` | Simple Q&A, one-off checks, tiny obvious edits | Startup loop, Router, hooks, task artifacts |
| `standard` | Multi-step work, file changes, routing, DAG planning, framework work | Cold registry diagnostics unless needed |
| `cold-repair` | Missing startup/router scripts or missing trusted evidence | Manual proof reconstruction |

Legacy inputs still work:

- `micro` maps to `lean`
- `full` maps to `standard`
- `maintenance` maps to `standard`

Maintenance is now a command:

```bash
node 00_System/mosa_cli.js maintain
```

## Runtime Flow

```text
Lean:
User intent -> direct answer or tiny edit

Standard:
User intent
-> startup proof
-> optional workflow DAG
-> Router proof
-> selected skill
-> result pointers

Cold-repair:
User intent
-> provision missing MOSA files
-> startup proof
-> Router proof
-> continue as standard
```

## File Layout

| Path | Role |
| --- | --- |
| `00_System/mosa_cli.js` | Main CLI for start, plan, route, hook, maintain, test |
| `00_System/mosa_startup.js` | Writes startup proof |
| `00_System/mosa_route.js` | Writes Router proof |
| `00_System/mosa_provision_workspace.js` | Copies minimal MOSA tools into a new workspace |
| `00_System/mosa_hooks.js` | Event-triggered hook checks |
| `01_Work/startup_result.json` | Official startup proof |
| `01_Work/context_bus.json` | Hot handoff and `_meta.graph_context` |
| `01_Work/workflow_plan.json` | Simplified Dynamic Capability DAG |
| `01_Work/routing_result.json` | Official Router proof |
| `02_Output/routing_index_light.json` | Warm lightweight Router index |
| `02_Output/active_skill_index.json` | Larger warm fallback |
| `02_Output/registry_distiller_report.json` | Cold diagnostics only |
| `graphify-out/GRAPH_REPORT.md` | First-read graph pointer |

`01_Work/session_state.json` is no longer required.

## Commands

Start standard proof:

```bash
node 00_System/mosa_cli.js start --mode standard --intent "refactor router output" --write
```

Lean compatibility:

```bash
node 00_System/mosa_cli.js start --mode micro --intent "quick status" --write
```

This maps to `lean` and writes only startup proof, not task artifacts.

Create a Dynamic Capability DAG:

```bash
node 00_System/mosa_cli.js plan --intent "build a data dashboard" --write
```

Route with DAG hints:

```bash
node 00_System/mosa_cli.js route --intent "build a data dashboard" --workflow-plan 01_Work/workflow_plan.json
```

Run event hooks:

```bash
node 00_System/mosa_cli.js hook --event router-proof
```

Run read-only maintenance checks:

```bash
node 00_System/mosa_cli.js maintain --write
```

Run regression checks:

```bash
node 00_System/mosa_cli.js test
```

## Schemas

`workflow_plan.json` uses only:

```json
{
  "schema_version": "mosa.workflow_dag.v1",
  "goal": "...",
  "intent_hash": "...",
  "nodes": [],
  "edges": [],
  "parallel_groups": [],
  "router_hints": [],
  "missing_skills": []
}
```

`routing_result.json` uses one route authority:

```json
{
  "schema_version": "mosa.routing_result.v2",
  "route_type": "single",
  "single_route": {}
}
```

or:

```json
{
  "schema_version": "mosa.routing_result.v2",
  "route_type": "dag",
  "dag_routes": []
}
```

Both preserve:

- `validation`
- `fallback_code`

## Hot, Warm, Cold Data

- **Hot**: `01_Work/startup_result.json`, `01_Work/context_bus.json`, `01_Work/routing_result.json`.
- **Warm**: `02_Output/routing_index_light.json`, `02_Output/active_skill_index.json`, `graphify-out/GRAPH_REPORT.md`.
- **Cold**: full registry reports, detailed audits, old release notes, and large diagnostics.

Agents should read hot files first, warm indexes next, and cold diagnostics only when repair or audit requires them.

## When To Use MOSA

Use MOSA when the task is:

- multi-step
- cross-skill
- framework-related
- file-changing beyond a trivial edit
- likely to benefit from proof, routing, or resumability

Avoid MOSA activation for:

- simple explanations
- small direct questions
- one obvious command result
- tiny edits where the skill is already clear

## Migration Notes

Before:

```bash
node 00_System/mosa_startup.js --mode micro --write
node 00_System/mosa_startup.js --mode full --write
node 00_System/mosa_hooks.js --level auto --event router-proof
```

After:

```bash
node 00_System/mosa_cli.js start --mode lean --write
node 00_System/mosa_cli.js start --mode standard --write
node 00_System/mosa_cli.js hook --event router-proof
```

Before, graph context lived in `01_Work/session_state.json`.

After, graph context lives in `01_Work/context_bus.json` under `_meta.graph_context`.
