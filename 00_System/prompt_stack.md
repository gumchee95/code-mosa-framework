# MOSA Prompt Stack

- Workspace: MosaFramework
- Root: current directory
- Protocol: MOSA Framework Core Rules v3.3
- Graph report: unavailable
- Last audit: compare MOSA-enabled agent vs baseline agent

## 2026-06-01 Startup/Routing Evidence Chain

- Root cause: global protocol drift.
- Do not trust manual Router text.
- Valid proof requires `startup_result.json`.
- Valid proof requires `routing_result.json`.
- Reject `status: reconstructed`.
- Use `mosa_provision_workspace.js`.
- Align AGENTS, skills, tools, artifacts.
- Checklist: `00_System/update_alignment_checklist.md`.
- Report: `02_Output/mosa_problem_solving_experience_record.md`.

## 2026-06-04 Event-Triggered Hook Token Shield

- Default hook level: `auto`.
- Routine event: `normal-task`.
- Normal tasks skip hook chain.
- Protocol updates trigger P1.
- Registry updates trigger P1.
- Framework trust updates trigger P2.
- Command guard triggers P0.
- Model reads compact hook output first.
- Full hook reports open only on failure.

## 2026-06-04 English Canonical Protocol

- Global protocol converted to English.
- File: `C:/Users/USER/.codex/AGENTS.md`.
- Version: v3.3.
- Encoding check: ASCII-only pass.
- P1 hook check: pass.

## 2026-06-04 Core Skill Alignment

- Orchestrator aligned to startup-owned turn count.
- Router aligned to Token Shield order.
- Router proof clarified as JSON-only.
- Harmonizer rewritten English canonical.
- Graph Builder aligned to workspace-local AGENTS.
- Audit: `02_Output/mosa_core_skill_alignment_audit.md`.

## 2026-06-04 Cold Warm Hot Runtime

- Cold provision copies light artifacts.
- Cold route source now `routing_index_light`.
- Warm startup detects hot artifacts.
- Hot repeated route hits cache.
- Audit: `02_Output/mosa_cold_warm_hot_runtime_audit.md`.

## 2026-06-04 Skill Loader Format Fix

- Removed BOM from four MOSA SKILL files.
- Restored Router frontmatter/body.
- Descriptions now use trigger style.
- Exact-name routing works for all four.
- Audit: `02_Output/mosa_skill_loader_format_audit.md`.

## 2026-06-04 Router Proof Hardening

- Global protocol updated to AGENTS v3.4.
- Official Router proof generator is `00_System/mosa_route.js`.
- `mosa_search.js` is engine/fallback only.
- `routing_result.json` now includes schema, `intent_hash`, input, confidence tiers, fallback code, and validation.
- Cache requires matching intent hash, exclusions, routing version, and valid resolved paths.
- Exclusions filter skill IDs, names, paths, categories, tags, and capability phrases before ranking.
- Orchestrator order is root, startup evidence, intent, router proof, pre-dispatch hook gate, dispatch, audit, GC.
- P2 framework-update hook passed 16/16.

## 2026-06-04 Lean Mode Simplification

- Global protocol updated to AGENTS v3.5.
- MOSA now uses Lean, Standard, and Cold-repair modes.
- Lean tasks skip startup, Router, hooks, and task-state writes.
- Standard mode is for multi-step, file-changing, MOSA, skill, routing, hook, registry, graph, audit, or persistent work.
- Cold-repair mode is only for missing or stale startup/router evidence.
- Graph Builder primary outputs were reduced.
- Harmonizer now checks Lean Mode alignment.
- Audit: `02_Output/mosa_lean_mode_simplification_audit.md`.

## 2026-06-05 Dynamic Capability DAG

- Added `node 00_System/mosa_cli.js plan --intent "<intent>" --write`.
- Planner writes `01_Work/workflow_plan.json` and `01_Work/workflow_plan.md`.
- DAG nodes are inferred from capability taxonomy, not rigid workflow templates.
- `mosa_route.js --workflow-plan 01_Work/workflow_plan.json` returns `node_routes`, `collaboration_order`, and `missing_skill_suggestions`.
- `mosa_search.js` supports `preferred_skill_ids` as a routing boost.
- Missing capabilities become skill-growth suggestions; skills are not auto-created.
- P2 hook passed: `02_Output/mosa_hook_result.json`.
