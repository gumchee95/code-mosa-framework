# MOSA Project Startup Protocol

## Purpose

Use MOSA as the fixed startup layer for every new project, so each new chat restores project context instead of redesigning the framework.

## Required Workspace Files

Every project must contain:

- `AGENTS.md`
- `graphify-out/GRAPH_REPORT.md`
- `00_System/state.json`
- `00_System/prompt_stack.md`
- `00_System/routing_cache.json`
- `01_Work/task.md`
- `01_Work/session_state.json`
- `01_Work/context_bus.json`
- `02_Output/`

## Startup Read Order

Preferred lightweight startup:

```bash
node 00_System/mosa_startup.js --mode ask --intent "<user intent>"
```

Use the returned startup packet first. If the packet mode is `ask`, confirm the mode with the user before escalating. Escalate to the manual read order only when the chosen mode is `standard`, `full`, or `maintenance`.

For every new chat or resumed task:

1. Read `AGENTS.md`.
2. Read `02_Output/startup_manifest.json`.
3. Read `graphify-out/GRAPH_REPORT.md`.
4. Read `00_System/prompt_stack.md`.
5. Read `01_Work/task.md`.
6. Read `02_Output/routing_index_light.json` if skill routing is needed.
7. Read `02_Output/mode_profiles.json` and `02_Output/reference_map_light.json` when route disambiguation is needed.
8. Read `02_Output/active_skill_index.json` only when light routing is insufficient.
9. Read full Skill files only when routing confidence is low or implementation requires exact SOP details.

## Project Creation Sequence

When starting a new project:

1. Create the required workspace files.
2. Write `00_System/state.json`:

```json
{"turn_count": 0, "drift_threshold": 20}
```

3. Generate `01_Work/task.md` with:

- `[Pipeline Trace]`
- `Atomic Keywords`
- `Intent Profile`
- `Project Defaults`
- `Acceptance Criteria`

4. Generate `graphify-out/GRAPH_REPORT.md` with God Nodes.
5. Generate `AGENTS.md` with Token Shield instructions.
6. Route skills through `routing_index_light.json` before reading Skill files.
7. Use `01_Work/context_bus.json` for current-task cross-agent handoff.
8. Record durable decisions in `00_System/prompt_stack.md`.

## Router Contract

Orchestrator must pass structured input:

```json
{
  "intent_summary": "short project goal",
  "atomic_keywords": ["keyword"],
  "preferred_domain": "workflow",
  "required_capability": "specific capability",
  "exclusions": []
}
```

Router must return:

- Top 3 candidates
- confidence
- match reasons
- fallback recommendation

## Token Rules

- Prefer `00_System/mosa_startup.js` for lightweight startup.
- Prefer graph first.
- Prefer cache second.
- Prefer `startup_manifest.json` for startup pointers.
- Prefer `routing_index_light.json` third.
- Use `mode_profiles.json` for project-mode boosts.
- Use `reference_map_light.json` to redirect duplicate/reference skills to masters.
- Use `active_skill_index.json` only when light routing is insufficient.
- Prefer pointers over full content.
- Treat full reports as output artifacts, not chat context.
- Never read `registry_distiller_report.json` during normal startup.
- Trigger Registry Distiller only for low-confidence routing or registry health checks.

## Startup Modes

| Mode | Use case | Read strategy |
|---|---|---|
| `ask` | Ambiguous task | Recommend a mode and ask user to choose |
| `micro` | Simple question or tiny same-project change | Use startup packet and relevant files only |
| `standard` | New project or likely skill selection | Add light routing and mode profiles |
| `full` | Long build, multi-agent work, architecture task | Run Orchestrator + Router + selected Skill SOP |
| `maintenance` | Framework, registry, token, or drift audit | Run Harmonizer or Distiller |

Mode policy:

- User-specified mode wins.
- Obvious tiny tasks default to `micro`.
- Obvious framework or registry audits default to `maintenance`.
- Obvious long implementation with routing needs can use `full`.
- Ambiguous tasks return `ask` and require user confirmation.

## Context Bus Rules

- Use `01_Work/context_bus.json` for current-task shared facts.
- Store summaries, key outputs, confidence, and pointers.
- Do not store full source files or long drafts.
- Clear it after task completion unless explicitly promoted.
- Promote only short durable decisions to `prompt_stack.md`.
- Keep it under about 2,000 tokens.

## Google Apps Script Mode

For Google Apps Script projects, default to:

- `gas-webapp-architect`
- `google-agent`
- `utar-ops`
- `data-analytics-core` when data analysis is needed
- `audit-agent` when permissions, registration, finance, or compliance are involved

Default GAS project assumptions:

- Google Sheets is the source of truth.
- Use `google.script.run` for server calls.
- Use client-side cache for repeated lookups.
- Batch writes and emails.
- Add audit logs for state changes.
- Avoid per-row quota-heavy operations.

## Completion Rule

At task completion:

1. Write `01_Work/task_results.md`.
2. Add `[Action: Trigger GC]`.
3. Update `00_System/prompt_stack.md`.
4. Keep outputs in `02_Output/`.
