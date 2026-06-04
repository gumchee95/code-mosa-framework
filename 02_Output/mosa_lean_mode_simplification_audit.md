# MOSA Lean Mode Simplification Audit

- Date: 2026-06-04
- Status: implemented
- Scope: reduce MOSA over-orchestration and startup bloat

## Problem

MOSA had started to over-process routine work:

- Global protocol implied startup/routing for every task.
- Orchestrator had no direct fast path for simple tasks.
- Harmonizer still referenced older v3.3 behavior.
- Graph Builder treated many files as primary outputs even when graph context was not needed.
- Cold provision had already been fixed to compact output, but the protocol did not yet make lean usage explicit.

## Simplification

MOSA now uses three modes:

| Mode | When used | What it skips |
| --- | --- | --- |
| Lean | Simple Q&A, direct command, tiny obvious edit | startup, Router, hooks, task-state writes |
| Standard | Multi-step work, file changes, MOSA/skill/routing/hook work | full registry diagnostics |
| Cold-repair | Missing/stale MOSA startup or Router proof | broad model-side registry reads |

## Files Updated

- `C:/Users/USER/.codex/AGENTS.md`
- `C:/Users/USER/.codex/skills/orchestrator-agent/SKILL.md`
- `C:/Users/USER/.codex/skills/mosa-harmonizer/SKILL.md`
- `C:/Users/USER/.codex/skills/mosa-graph-builder/SKILL.md`

## Removed Bloat

- Removed the expectation that full MOSA startup is needed for every task.
- Removed mandatory task-state writes for lean tasks.
- Reduced Graph Builder primary outputs to graph report, graph context pointer, and task result pointer.
- Made startup evidence mandatory only for Standard and Cold-repair MOSA trust paths.
- Preserved cold-repair safety without making it the default.

## Remaining Guardrails

- Router proof remains mandatory before dispatch in Standard/Cold-repair mode.
- Event-triggered hooks remain available but skipped for routine Lean tasks.
- Full registry reports remain cold diagnostics only.
- P2 remains required before trusting framework updates.

## Expected Token Effect

- Lean task: near blank-run cost.
- Standard task: about `startup_result + context_bus + routing_result`, currently about 1225 tokens.
- Hot route: about route proof only, currently about 709 tokens.
- Cold diagnostics: still expensive and intentionally rare.

