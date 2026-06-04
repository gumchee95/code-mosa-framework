---
name: mosa-graph-builder
description: Use when MOSA needs graph topology, God Nodes, Router Token Shield pointers, startup evidence, cold-start project maps, or workspace-local AGENTS guidance.
skill_id: MOSA_GRAPH_BUILDER
category: Discovery
---

# MOSA Graph Builder v3.5

## 0. Mission

MOSA Graph Builder turns an unknown workspace into a compact, reusable topology package so every new chat or AI can start from project state instead of rediscovering the framework.

Primary outputs:

- `graphify-out/GRAPH_REPORT.md`
- `01_Work/session_state.json.graph_context`
- `01_Work/task_results.md`

Optional evidence pointers when startup or repair is required:

- `01_Work/context_bus.json`
- `01_Work/startup_result.json`
- `01_Work/routing_result.json`
- `01_Work/provision_result.json`

It must be local-first, pointer-first, and token-efficient.

Node startup tooling is mandatory for new or repaired MOSA workspaces. If missing, invoke the MOSA framework provisioner before considering the workspace initialized:

```bash
node <MosaFramework>/00_System/mosa_provision_workspace.js --target "<workspace>" --run --intent "<project intent>"
```

Provision output is compact by default. Use `--verbose` only for debugging nested startup and route JSON.

Generated graph reports must mark Router proof as valid only when all are true:

- `01_Work/routing_result.json.status != "reconstructed"`
- `schema_version` is present
- `source == "mosa_route.js"`
- `intent_hash` is present
- `validation.passed == true`
- `top_skill.resolved_path` exists

## 1. Activation Conditions

Use this skill when:

- Starting a new project.
- Opening a large or unfamiliar workspace.
- The user asks about architecture, dependencies, routing, or Token Shield.
- `graphify-out/GRAPH_REPORT.md` is missing or stale.
- MOSA project startup protocol needs to be installed.
- Google Apps Script / Web App / Sheet-backed workflows need a reusable project map.

Do not use this skill for simple answer-only tasks. Lean Mode should answer directly without graph generation.

## 2. Environment Rules

Before graph generation:

1. Locate `{Workspace_Root}` by finding nearest `00_System`.
2. If `00_System` is missing, initialize MOSA startup files instead of failing:
   - `00_System/state.json`
   - `00_System/prompt_stack.md`
   - `00_System/routing_cache.json`
   - `01_Work/task.md`
   - `01_Work/session_state.json`
   - `01_Work/context_bus.json`
   - `02_Output/`
3. Never hardcode user-specific absolute paths inside generated protocol text.
4. Keep generated state pointer-based; never store full source files in `session_state.json`.

## 3. Startup Read Order

When graph context already exists, read in this order:

1. `graphify-out/GRAPH_REPORT.md`
2. `01_Work/session_state.json`
3. `01_Work/startup_result.json`
4. `01_Work/routing_result.json`
5. `02_Output/startup_manifest.json` only when policy confirmation is needed
6. `02_Output/routing_index_light.json` only when routing is needed
7. Full Skill files only when confidence is low or exact SOP details are required

Never read `02_Output/registry_distiller_report.json` during startup; it is cold diagnostic data only.

## 4. Graph Construction

Scan only enough to identify topology.

Depth rules:

- Default depth <= 2.
- Ignore `node_modules/`, `.git/`, `__pycache__/`, `venv/`, `.next/`, `dist/`, `build/`.
- If a directory has more than 50 children, list only the first 20 representative entries and mark `[truncated]`.
- Prefer manifest/config/entrypoint files over broad source scans.

God Node detection:

- Always include `00_System`, `01_Work`, `02_Output` when present.
- Include `01_Work/context_bus.json` as the current-task cross-agent handoff layer when present.
- Include major source entrypoints such as `src/`, `app/`, `Code.gs`, `Index.html`, `package.json`, `appsscript.json`.
- Include MOSA routing assets:
  - `00_System/routing_cache.json`
  - `02_Output/routing_index_light.json`
  - `graphify-out/GRAPH_REPORT.md`

## 5. GRAPH_REPORT.md Contract

`graphify-out/GRAPH_REPORT.md` must contain:

- `## God Nodes`
- `## Mermaid Topology`
- `## Token Shield Rule`
- `## Current Efficiency Notes`
- `## Startup Pointers`

The Mermaid diagram should use `graph LR` by default and show:

- User intent
- Orchestrator
- `01_Work/task.md`
- Router
- routing cache
- router support index
- selected Skill SOP
- Sub-Agent
- task results
- Harmonizer
- prompt stack

For Google Apps Script mode, include:

- `Code.gs`
- `Index.html`
- `appsscript.json`
- Google Sheets schema
- client cache
- batch write/email queue
- audit log

## 6. Workspace AGENTS.md Contract

Generate or update workspace-local `AGENTS.md` with compact project guidance. Do not overwrite the global `C:/Users/USER/.codex/AGENTS.md`; that file is the canonical MOSA protocol.

```markdown
# MOSA Token Shield

When querying architecture, relationships, or tracing logic:

1. Read `graphify-out/GRAPH_REPORT.md` first.
2. Use God Nodes as the search boundary.
3. Prefer `00_System`, `01_Work`, and `02_Output` pointer files.
4. Do not start with broad full-text scans when graph context exists.
5. Use `02_Output/routing_index_light.json` before full registry reports.
6. Use event-triggered hooks; do not run P0/P1/P2 for routine tasks.

When starting a new project:

1. Use Lean Mode for simple answer-only tasks.
2. Use Standard Mode for multi-step or file-changing tasks.
3. Use Cold-repair Mode only when MOSA startup or Router proof is missing or stale.
4. Record durable project decisions in `00_System/prompt_stack.md`.
```

## 7. Session State Contract

Update `01_Work/session_state.json` with pointer-only graph context:

```json
{
  "graph_context": {
    "report": "graphify-out/GRAPH_REPORT.md",
    "god_nodes": ["00_System", "01_Work", "02_Output"]
  }
}
```

Do not store full graph report content in session state.

## 8. Router Efficiency Integration

Graph Builder must point future agents toward the cheapest routing path:

1. `00_System/routing_cache.json`
2. `02_Output/routing_index_light.json`
3. `02_Output/mode_profiles.json`
4. `02_Output/reference_map_light.json`
5. `02_Output/active_skill_index.json` only when light routing is insufficient
6. Skill skeleton
7. Full Skill file

If `routing_index_light.json` or `startup_manifest.json` is missing, recommend running Registry Distiller in read-only mode. Treat `registry_distiller_report.json` as cold diagnostics, not chat context.

## 8.5 Event-Triggered Hook Integration

Graph reports should point future agents toward the cheapest hook path:

```bash
node 00_System/mosa_hooks.js --level auto --event normal-task
```

Only escalate hooks by event:

- `startup-evidence`, `router-proof`, `dangerous-command`: P0.
- `protocol-update`, `agents-update`, `skill-update`, `registry-update`, `routing-index-update`: P1.
- `framework-update`, `trust-framework-update`, `smoke-test`: P2.

Store hook output as pointers:

- `02_Output/mosa_hook_result.json`
- `02_Output/mosa_hook_result.md`
## 9. Validation Checklist

After generation, verify:

- `graphify-out/GRAPH_REPORT.md` exists.
- `GRAPH_REPORT.md` contains Mermaid.
- `GRAPH_REPORT.md` contains God Nodes.
- `session_state.json.graph_context.report` points to the graph.
- `task_results.md` includes output pointers.
- `routing_result.json` has valid v3.4+ schema when routing proof is needed.
- Compact provision output is used unless `--verbose` is explicitly needed.
- `task_results.md` ends with `[Action: Trigger GC]`.

## 10. Handoff Output

Write `01_Work/task_results.md`:

```text
[Status: Success]
[Data:
- graph_report: graphify-out/GRAPH_REPORT.md
- token_shield: AGENTS.md
- graph_context: 01_Work/session_state.json
]
[Next_Step: @mosa-harmonizer --update-stack]

[Action: Trigger GC]
```

## 11. Anti-Patterns

- Do not read full source trees before checking graph context.
- Do not generate massive graph reports.
- Do not store full file contents in state.
- Do not use `context_bus.json` as long-term memory; keep it ephemeral and summary-only.
- Do not overwrite project decisions in `prompt_stack.md`; append concise deltas.
- Do not treat full registry reports as chat context; use pointers.

## 12. Startup Proof Repair Pattern

Use this repair path when a workspace has MOSA notes but lacks trustworthy startup or Router evidence.

Trigger signs:

- `00_System/mosa_startup.js` is missing.
- `00_System/mosa_route.js` is missing.
- `01_Work/startup_result.json` is missing.
- `01_Work/routing_result.json` is missing.
- `routing_result.json.status == "reconstructed"`.
- Router proof exists only as manual text in `task.md`.

Repair sequence:

1. Run workspace provision if startup tools are missing.
2. Run `node 00_System/mosa_startup.js --intent "<intent>"`.
3. Run `node 00_System/mosa_route.js --domain "<domain>" --capability "<capability>" --keywords "<keywords>" --intent "<intent>"`.
4. Verify `01_Work/routing_result.json.status != "reconstructed"`.
5. Verify `01_Work/routing_result.json.validation.passed == true`.
6. Record proof pointers in `01_Work/task.md` and `01_Work/task_results.md`.
6. Update `graphify-out/GRAPH_REPORT.md` if it still claims Router proof is missing or reconstructed.
7. Run Registry Distiller read-only when routing support artifacts are missing or stale.
8. Provision should copy light artifacts into cold workspaces when source artifacts exist.

Do not treat reconstructed routing output as valid Router proof. Reconstructed output is an audit clue, not an execution gate.





