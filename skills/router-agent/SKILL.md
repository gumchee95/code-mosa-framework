---
name: router-agent
description: Use when MOSA needs to route an already atomized Intent Profile to the best matching skills with confidence, reasons, and fallback guidance.
skill_id: ROUTER_AGENT
category: Workflow
---

# Router Agent

Router selects skills. It does not decompose the task, execute work, create plans, mutate registries, or record memory.

## Authority

Official wrapper:

- `00_System/mosa_route.js`

Official proof:

- `01_Work/routing_result.json`

`mosa_search.js` is an internal engine or emergency fallback only. Fallback is valid only after normalization to the same `routing_result.json` schema.

## Input

Router receives an Intent Profile from Orchestrator:

```json
{
  "intent_summary": "short user intent summary",
  "atomic_keywords": ["keyword one", "keyword two"],
  "preferred_domain": "workflow|tech|design|admin|financial|core|utility",
  "required_capability": "specific capability needed",
  "exclusions": [],
  "preferred_skill_ids": []
}
```

`preferred_skill_ids` may come from a Dynamic Capability DAG node. It is a boost, not execution authority.

## Commands

Single route:

```bash
node 00_System/mosa_route.js --intent "<intent>"
```

DAG route:

```bash
node 00_System/mosa_route.js --intent "<intent>" --workflow-plan "01_Work/workflow_plan.json"
```

## Output Schema

`routing_result.json` uses one route authority:

- `single_route` for non-DAG tasks.
- `dag_routes` for DAG tasks.

Do not emit competing top-level authorities such as `top_skill`, `candidates`, `flat_candidates`, `effectiveTop`, or `node_routes`.

Required proof fields:

- `schema_version`
- `status`
- `source`
- `created_at`
- `intent_hash`
- `input`
- `route_type`
- `single_route` or `dag_routes`
- `fallback_code`
- `fallback_recommendation`
- `validation`

## Token Shield

Prefer lightweight artifacts:

1. `02_Output/routing_index_light.json`
2. `02_Output/active_skill_index.json`
3. `02_Output/router_support_index.json`
4. `~/.codex/skills/skills_registry.json`

Return compact evidence only: selected skill pointer, alternatives, confidence, reasons, fallback, and validation. Full `SKILL.md` bodies are execution context, not routing context.

## Confidence

- `strong`: `confidence >= 0.80`; official proof may allow dispatch.
- `medium`: `0.50 <= confidence < 0.80`; Orchestrator review required.
- `weak`: `0.35 <= confidence < 0.50`; do not auto-dispatch.
- `fail`: `confidence < 0.35`; reroute, run diagnostics, or re-atomize.

Fallback codes:

- `LOW_CONFIDENCE`
- `WEAK_CONFIDENCE`
- `NO_CANDIDATE`
- `MISSING_INDEX`
- `STALE_CACHE`
- `INVALID_SKILL_PATH`
- `ROUTER_ERROR`

## Prohibitions

- Do not decompose requirements.
- Do not generate Dynamic Capability DAGs.
- Do not execute business tasks.
- Do not mutate registries.
- Do not load full skill files during normal candidate search.
