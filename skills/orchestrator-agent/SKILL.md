---
name: orchestrator-agent
description: Use when MOSA needs workspace startup, intent atomization, Router coordination, Sub-Agent dispatch, audit triggers, GC, or memory consolidation.
skill_id: ORCHESTRATOR_AGENT
category: Workflow
---

# Orchestrator Agent

Orchestrator coordinates MOSA workflows. Router selects skills only; Router does not decompose tasks.

## Modes

Use the lightest mode that preserves correctness:

- `lean`: simple Q&A, one-off check, or tiny obvious edit. No startup loop, Router, hooks, or task artifacts.
- `standard`: multi-step work, file changes, cross-skill work, MOSA changes, audit-sensitive work, or durable state. Once selected, DAG and Router are downstream proof stages.
- `cold-repair`: missing `00_System`, missing startup/router tools, missing proof JSON, or stale/untrusted evidence.

Legacy inputs map as:

- `micro` -> `lean`
- `full` -> `standard`
- `maintenance` -> `standard`

Maintenance is a CLI command, not a runtime mode.

## Standard Flow

1. Find workspace root by nearest `00_System`.
2. Run startup proof:

```bash
node 00_System/mosa_cli.js start --mode standard --intent "<user intent>" --write
```

3. Read only:

- `01_Work/startup_result.json`
- `01_Work/context_bus.json`

4. Atomize the user intent and write `01_Work/task.md` when durable planning is needed.
5. For broad or underspecified work, run an Orchestrator clarification gate before DAG dispatch:

- Identify the likely deliverable domain, such as event, website, dashboard, report, automation, or research.
- Extract known constraints, missing assumptions, success criteria, and likely output artifacts.
- Ask concise clarifying questions when missing information would materially change the route.
- If the user asks for planning help and details are missing, include a `clarification` DAG node instead of forcing Router to guess.
- Router must receive the clarified Intent Profile or the generated DAG hints. Router must not perform this analysis itself.

6. Consult Auto-Skill only as a compact memory layer when prior experience, reusable preferences, or missing capability history would improve the plan. Do not load full experience files by default.

7. Generate a Dynamic Capability DAG for standard work:

```bash
node 00_System/mosa_cli.js plan --intent "<user intent>" --write
```

8. Route with the clarified DAG:

```bash
node 00_System/mosa_cli.js route --intent "<user intent>"
```

or:

```bash
node 00_System/mosa_cli.js route --intent "<user intent>" --workflow-plan 01_Work/workflow_plan.json
```

9. Validate `01_Work/routing_result.json`.
10. Load only the selected execution skill.
11. Write compact result pointers to `01_Work/task_results.md`.
12. At task completion, run the Auto-Skill promotion check when the result may be reusable. Invoke `skill-creator` only after user approval.

## Cold Repair

When startup or router tools are missing, provision first:

```bash
node <MosaFramework>/00_System/mosa_provision_workspace.js --target "<workspace>" --run --intent "<user intent>"
```

Provision should leave:

- `00_System/mosa_startup.js`
- `00_System/mosa_route.js`
- `01_Work/provision_result.json`
- `01_Work/startup_result.json`
- `01_Work/routing_result.json`

## Context And Graph

Use:

- `01_Work/context_bus.json`

Graph context lives at:

- `01_Work/context_bus.json._meta.graph_context`

`01_Work/session_state.json` is not required.

If `graphify-out/GRAPH_REPORT.md` exists, read it before broad architecture exploration.

## Dynamic Capability DAG

`workflow_plan.json` must contain only:

- `schema_version`
- `goal`
- `intent_hash`
- `nodes`
- `edges`
- `parallel_groups`
- `router_hints`
- `missing_skills`

The DAG is a routing aid. It must not be a rigid workflow template.

For complex domains, the first DAG node may be `clarification`. This node belongs to Orchestrator and may contain concise questions. It exists to prevent premature skill selection when the task needs missing constraints, not to make Router ask questions.

In standard mode, DAG generation and Router proof are mandatory after clarification. Lean mode skips both.

## Router Proof Guard

Valid Router proof:

- `01_Work/routing_result.json` exists.
- `schema_version == "mosa.routing_result.v2"`.
- `source == "mosa_route.js"`.
- `intent_hash` is present.
- `validation.passed == true`.
- Exactly one route authority exists: `single_route` or `dag_routes`.

Invalid proof:

- Manual chat summaries.
- `status == "reconstructed"`.
- Missing or stale intent hash.
- Missing selected skill path.
- Top-level `top_skill`, `candidates`, `flat_candidates`, `effectiveTop`, or `node_routes`.

## Hooks

Run hooks only for triggered trust events:

```bash
node 00_System/mosa_cli.js hook --event router-proof
node 00_System/mosa_cli.js maintain --write
```

Do not run hooks for lean mode or routine normal tasks.

## Audit Triggers

Audit when the task changes:

- `AGENTS.md`
- startup, router, hook, provision, or CLI scripts
- routing indexes or registry diagnostics
- core MOSA skills
- credential handling, deletion behavior, or cross-workspace behavior

## Output

Use compact pointer protocol:

```text
[Status: Success|Fail]
[Data: compact pointers or result summary]
[Next_Step: @agent-name]
```

## Prohibitions

- Do not orchestrate lean work.
- Do not trust manual Router text as formal proof.
- Do not read full registry reports during normal startup.
- Do not load full skill files before Router proof.
- Do not mutate registries without explicit user approval.
