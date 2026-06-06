# MOSA Light Core Rules

MOSA Light keeps AI coding sessions recoverable without making the framework the task.

## Modes

Runtime modes are only:

- `standard`: startup proof, Orchestrator clarification, compact Auto-Skill memory check when useful, Dynamic Capability DAG, Router proof, selected skill, and result pointers.
- `cold-repair`: provision or repair missing startup/router evidence, then continue with standard proof.

Legacy input mapping:

- `micro` -> `standard`
- `full` -> `standard`
- `maintenance` -> `standard`

Maintenance is a command, not a runtime mode:

```bash
node 00_System/mosa_cli.js maintain
```

## Startup Proof

The official startup proof is:

- `01_Work/startup_result.json`

Startup may also write:

- `01_Work/context_bus.json`

`02_Output/startup_packet.json` is deprecated and must not be used as proof.

Run startup for normal MOSA work:

```bash
node 00_System/mosa_cli.js start --mode standard --intent "<task intent>" --write
```

Standard stays token-light by reading compact startup/context evidence, lightweight routing indexes, and selected skill files only after Router proof.

## Auto Mode Doctrine

Auto mode should maximize Codex judgment instead of replacing it with trigger-word routing.

- Do not add broad keyword classifiers as execution authority.
- Use key notes only as explainable reasons, never as hard triggers.
- Let Orchestrator ask clarifying questions and atomize the task before DAG or Router.
- Use Auto-Skill as a compact memory and promotion layer, not as mandatory startup context.
- DAG and Router are required downstream proof stages in `standard`.

## Context State

Use one hot handoff file:

- `01_Work/context_bus.json`

Graph context belongs under:

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

`01_Work/session_state.json` is not a required MOSA Light file.

## Dynamic Capability DAG

For `standard` work, Orchestrator generates a Dynamic Capability DAG after clarification and any relevant Auto-Skill memory check:

```bash
node 00_System/mosa_cli.js plan --intent "<task intent>" --write
```

`01_Work/workflow_plan.json` must use only these top-level fields:

- `schema_version`
- `goal`
- `intent_hash`
- `nodes`
- `edges`
- `parallel_groups`
- `router_hints`
- `missing_skills`

The DAG is a routing aid. It is not an execution agent, and it must not be a rigid workflow template.

The standard handoff is:

```text
Orchestrator clarification -> Auto-Skill key notes when useful -> workflow_plan.json -> routing_result.json
```

## Router Proof

The official Router wrapper is:

- `00_System/mosa_route.js`

The official proof is:

- `01_Work/routing_result.json`

Routing result authority:

- `single_route` for non-DAG tasks.
- `dag_routes` for DAG tasks.

Do not emit competing top-level route authorities such as `top_skill`, `candidates`, `flat_candidates`, `effectiveTop`, or `node_routes`.

Router must return resolved skill paths only. Full `SKILL.md` bodies are loaded only after Router proof selects an execution skill.

For `standard` work, Router proof is mandatory after DAG generation. Router consumes the clarified DAG hints; it does not decide the task shape by itself.

## Hooks

Hooks are event-triggered maintenance checks, not normal task overhead.

Use:

```bash
node 00_System/mosa_cli.js hook --event router-proof
node 00_System/mosa_cli.js maintain --write
```

Do not run hooks for routine normal tasks unless a trust event is triggered.

## Graph Token Shield

If `graphify-out/GRAPH_REPORT.md` exists, read it before broad architecture exploration.

Graph Builder owns only:

- `graphify-out/GRAPH_REPORT.md`
- `01_Work/context_bus.json._meta.graph_context`

Mode policy, hook policy, cold repair, and Router proof doctrine belong here and in `mosa_cli.js`, not in Graph Builder.

## File Layout

| File | Purpose |
| --- | --- |
| `00_System/mosa_cli.js` | Unified CLI: start, plan, route, hook, maintain, test |
| `00_System/mosa_startup.js` | Startup proof writer |
| `00_System/mosa_route.js` | Router proof writer |
| `00_System/mosa_hooks.js` | Event hook checks |
| `01_Work/startup_result.json` | Official startup proof |
| `01_Work/context_bus.json` | Hot handoff and graph context |
| `01_Work/workflow_plan.json` | Simplified Dynamic Capability DAG |
| `01_Work/routing_result.json` | Official Router proof |
| `02_Output/routing_index_light.json` | Warm lightweight routing index |
| `02_Output/registry_distiller_report.json` | Cold diagnostics only |

## Audit Triggers

Audit or maintenance checks are required when a task changes:

- `AGENTS.md`
- startup, router, hook, provision, or CLI scripts
- routing indexes or registry diagnostics
- core MOSA skills
- credential handling, deletion behavior, or cross-workspace behavior

Otherwise, keep MOSA light.

## Output Contract

Prefer compact pointer summaries:

```text
[Status: ...]
[Data: ...]
[Next_Step: ...]
```

Do not copy full reports or full source files into chat when a path pointer is enough.
