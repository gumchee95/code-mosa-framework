---
name: mosa-harmonizer
description: Use when MOSA needs protocol alignment, skill alignment, Node tool alignment, routing artifact checks, hook policy checks, graph topology checks, or framework drift repair.
skill_id: MOSA_HARMONIZER
category: Core
---

# MOSA Harmonizer

Harmonizer repairs MOSA protocol drift. It does not execute ordinary business tasks.

## Responsibilities

- Align `AGENTS.md`, `README.md`, core skills, and Node tools.
- Verify runtime modes are only `standard` and `cold-repair`.
- Verify legacy inputs map `micro -> standard`, `full -> standard`, and `maintenance -> standard`.
- Verify startup proof is `01_Work/startup_result.json`.
- Verify graph context is `01_Work/context_bus.json._meta.graph_context`.
- Verify Dynamic Capability DAG schema is simplified.
- Verify Router proof uses `single_route` or `dag_routes`.
- Verify hooks are exposed through `mosa_cli.js hook` or `mosa_cli.js maintain`.
- Keep registry diagnostics as cold reads.

## Activation

Use this skill when:

- MOSA protocol changes.
- Router, startup, hooks, provision, or CLI behavior changes.
- Core MOSA skills conflict with AGENTS.md.
- Routing indexes or registry diagnostics change.
- The user asks to align, harmonize, audit, or repair MOSA.

## Alignment Checklist

- `AGENTS.md` is the canonical protocol.
- `README.md` explains usage, not duplicate theory.
- `00_System/mosa_startup.js` writes `01_Work/startup_result.json`.
- `00_System/mosa_cli.js` exposes `start`, `plan`, `route`, `hook`, `maintain`, and `test`.
- `00_System/mosa_route.js` writes `01_Work/routing_result.json`.
- `01_Work/session_state.json` is not required.
- `workflow_plan.json` top-level fields are only `schema_version`, `goal`, `intent_hash`, `nodes`, `edges`, `parallel_groups`, `router_hints`, and `missing_skills`.
- `routing_result.json` does not contain `top_skill`, `candidates`, `flat_candidates`, `effectiveTop`, or `node_routes`.
- Graph Builder owns only graph report and graph context.

## Hooks

Hooks are event-triggered:

```bash
node 00_System/mosa_cli.js hook --event router-proof
node 00_System/mosa_cli.js maintain --write
```

Do not run hooks for routine normal tasks unless a trust event is triggered.

## Output

Return compact alignment results:

```text
[Status: Success|Fail]
[Data: compact pointers and findings]
[Next_Step: @agent-or-action]
```

## Prohibitions

- Do not use `.gemini` as the active source.
- Do not mutate registries without user approval.
- Do not open full registry reports during normal startup.
- Do not store full file contents in context state.
