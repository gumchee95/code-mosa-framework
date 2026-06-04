# MOSA Framework Core Rules (AGENTS.md) - v3.5
> Last Updated: 2026-06-04 | Architecture: MOSA | Language: English canonical | Patch: Lean Mode simplification

This is the global MOSA protocol. All agents must follow it unless a higher-priority system or developer instruction conflicts.

## 1. Lean Activation Policy

MOSA must stay useful without becoming the task. Use the lightest mode that preserves correctness.

Modes:

- `lean`: no MOSA startup, no Router, no hooks. Use for simple Q&A, direct explanations, one-off terminal checks, or tiny edits where a specific skill is already obvious.
- `standard`: run startup evidence, Orchestrator atomization, Router proof, pre-dispatch hook gate only when triggered, and selected execution skill.
- `cold-repair`: run provision/startup/route when MOSA evidence is missing, stale, or untrusted.

Lean mode is allowed when all are true:

- The task is one step or answer-only.
- The task does not modify MOSA protocol, registries, routing indexes, startup/router scripts, hooks, or core skills.
- The task does not require audit, regulated-data handling, multi-agent routing, or persistent task state.
- The user did not explicitly ask for MOSA routing, graphing, harmonizing, audit, or framework repair.

Standard mode is required when any is true:

- The task writes files beyond a trivial single-file edit.
- The task is multi-step, ambiguous, cross-skill, or long-running.
- The task touches MOSA, `.codex/skills`, routing, hooks, registry, graph, startup evidence, or task memory.
- The task benefits from resumability, auditability, or explicit proof pointers.

Cold-repair mode is required when any is true:

- New workspace first use and no `00_System` exists.
- `00_System/mosa_startup.js` or `00_System/mosa_route.js` is missing.
- `01_Work/startup_result.json` or `01_Work/routing_result.json` is missing.
- Router proof is reconstructed, stale, or lacks v3.4+ schema validation.
- Light routing artifacts are missing and routing confidence is low.

## 2. Startup Sequence

Context sniffing means choosing lean, standard, or cold-repair mode. It does not require full MOSA startup on every task.

Detection logic:

- If the active conversation already contains the current AGENTS protocol and active auto-skill context, skip protocol reload and continue to Orchestrator execution.
- If this is a naked session, load this file and the active `auto-skill/SKILL.md`.
- If `{Workspace_Root}/graphify-out/GRAPH_REPORT.md` exists, use it as the first architecture reference before broad exploration.

Standard execution order:

1. Find the nearest parent directory containing `00_System`.
2. If no `00_System` exists, initialize the current workspace root.
3. Ensure `00_System`, `01_Work`, and `02_Output` exist.
4. Ensure `00_System/state.json` exists with `{"turn_count": 0, "drift_threshold": 20}` when newly created.
5. Run workspace startup evidence.
6. Run Orchestrator intent atomization.
7. Run Router skill retrieval.
8. Validate Router proof against the current Intent Profile.
9. Run the pre-dispatch Hook Gate for triggered events.
10. Load only the selected execution skill.
11. Trigger audit only when conditions require it.
12. Finish with result pointers and GC handling.

Steps 1-2 are naked-session setup. Steps 5-10 are the standard task loop. Lean tasks may skip steps 5-12 and answer directly.

## 3. Active Skill Source

- Active source: `~/.codex/skills/`.
- Legacy source: `~/.gemini/antigravity/skills/`.
- Legacy paths are compatibility-only.
- New development must use `.codex/skills`.
- `skills_registry.json` must prefer `.codex/skills` paths.

## 4. Mandatory Node Startup Gate

Before any Standard or Cold-repair Orchestrator or Router result is trusted, the workspace must contain tool-generated startup evidence:

- `00_System/mosa_startup.js`
- `00_System/mosa_route.js`
- `01_Work/startup_result.json`
- `01_Work/routing_result.json`

If `mosa_startup.js` or `mosa_route.js` is missing, run provision first:

```bash
node <MosaFramework>/00_System/mosa_provision_workspace.js --target "<workspace>" --run --intent "<task intent>"
```

Default provision output must be compact. Use `--verbose` only when nested startup and route JSON is needed for debugging.

Provision must leave:

- `00_System/mosa_startup.js`
- `00_System/mosa_route.js`
- `01_Work/provision_result.json`
- `01_Work/startup_result.json`
- `01_Work/routing_result.json`

Provision should copy lightweight routing artifacts when available:

- `02_Output/startup_manifest.json`
- `02_Output/routing_index_light.json`
- `02_Output/reference_map_light.json`
- `02_Output/mode_profiles.json`
- `02_Output/active_skill_index.json`

Provision must not copy full registry diagnostic reports by default.

Manual startup or routing text is not valid proof.

## 5. Router Rules

Canonical skill name:

- `router-agent`

Aliases must normalize to `router-agent`:

- `router_agent`
- `@router_agent`
- `/router_agent`

Do not create `~/.codex/skills/router_agent`.

Official Router proof must be generated by:

- `00_System/mosa_route.js`

`~/.codex/skills/router-agent/mosa_search.js` is an internal engine or emergency fallback only. Fallback output is valid only when normalized to the same `routing_result.json` schema.

Valid proof must be written to:

- `01_Work/routing_result.json`

Invalid proof:

- `routing_result.json.status == "reconstructed"`
- Manual Router text inside `task.md`
- Chat-only Router summaries
- Missing or mismatched `intent_hash`
- Missing selected skill path
- Selected skill path does not exist

Router receives an already atomized Intent Profile. Router must not reverse-engineer or decompose the user request again. If keywords are unclear, Router must return failure and ask Orchestrator to re-atomize.

Required `routing_result.json` fields:

- `schema_version`
- `status`
- `source`
- `created_at`
- `intent_hash`
- `input`
- `top_skill`
- `candidates`
- `fallback_code`
- `fallback_recommendation`
- `validation`

Confidence tiers:

- `strong`: confidence `>= 0.80`; auto-dispatch is allowed after proof validation.
- `medium`: confidence `>= 0.50` and `< 0.80`; Orchestrator review is required before dispatch.
- `weak`: confidence `>= 0.35` and `< 0.50`; do not auto-dispatch.
- `fail`: confidence `< 0.35`; rerun Router, run Registry Distiller, or re-atomize intent.

## 6. Router Token Shield

Router must prefer lightweight indexes in this order:

1. `02_Output/routing_index_light.json`
2. `02_Output/active_skill_index.json`
3. `02_Output/router_support_index.json`
4. `~/.codex/skills/skills_registry.json`

Router should return only compact candidates:

- top skill
- 1-3 candidates
- confidence
- match reasons
- resolved skill path
- fallback recommendation, if any

Agents must load a full `SKILL.md` only after routing selects it for execution.

Router must return resolved skill paths only. Router must not load full execution `SKILL.md` bodies during normal candidate search.

## 7. Event-Triggered Hook Token Shield

Hook execution is event-triggered. Hooks are not mandatory on every routine task.

Default command:

```bash
node 00_System/mosa_hooks.js --level auto --event normal-task
```

Event mapping:

- `normal-task` -> skip hook chain and write compact pass evidence.
- `startup-evidence` -> P0.
- `router-proof` -> P0.
- `dangerous-command` -> P0.
- `protocol-update` -> P1.
- `agents-update` -> P1.
- `skill-update` -> P1.
- `registry-update` -> P1.
- `routing-index-update` -> P1.
- `framework-update` -> P2.
- `trust-framework-update` -> P2.
- `smoke-test` -> P2.

Token rule:

- Node runs checks.
- Node writes full JSON and Markdown reports.
- Agent reads compact hook output first.
- Agent opens full hook reports only on failure.
- Routine tasks must not read full hook reports.

Trust rule:

- P2 is required only before trusting MOSA framework updates.
- P1 is required after protocol, registry, skill, or routing-index changes.
- P0 is required when startup evidence, router proof, or command safety is in doubt.

Hook output files:

- `02_Output/mosa_hook_result.json`
- `02_Output/mosa_hook_result.md`

Hooks are check-only. They must not auto-delete, auto-reset, force-push, install dependencies, mutate credentials, or mutate registries.

## 8. Hook Levels

P0 checks:

- Dangerous Command Guard.
- Startup Evidence Gate.
- Router Proof Gate.

P1 checks:

- Registry Alignment Gate.
- Encoding Guard for core workflow skills.
- Legacy executable path guard.

P2 checks:

- MOSA smoke test.
- Startup to Router to Registry Distiller.
- P0 and P1 assertions after smoke test.

## 9. Responsibility Boundary

| Agent | Responsibility | Timing | Output |
| --- | --- | --- | --- |
| Orchestrator | Atomize intent and coordinate workflow | Standard and cold-repair tasks | `task.md` and Intent Profile |
| Router | Match atomized keywords to skills | Standard and cold-repair tasks | 1-3 skill pointers |
| Execution Agent | Perform the selected task | After routing | Result pointers |
| Audit Agent | Review triggered tasks | Conditional | Audit pointer |
| Harmonizer | Align MOSA protocol and tools | Framework updates | Alignment report |

Router must not perform Orchestrator's decomposition work.

## 10. Task Planning Contract

Every standard or cold-repair task plan must be written to:

- `01_Work/task.md`

The top of `task.md` must contain:

```text
[Pipeline Trace]: Orchestrator > Router > Pending
```

After Router proof validation, Orchestrator may update `Pending` to the selected Sub-Agent name.

`task.md` should contain:

- Atomic Keywords
- Intent Profile
- TODO list
- Startup snapshot pointer, when available

Lean tasks should not append task history unless the user asks for durable memory.

## 11. Persistence And GC

Multi-step tasks must use:

- `01_Work/session_state.json`

Persistence rule:

- Store pointers only.
- Do not store full raw data.
- Do not store large copied file contents.

Completion rule:

- Execution Agent writes result pointers to `01_Work/task_results.md`.
- Append `[Action: Trigger GC]` when the task is complete.
- Orchestrator clears temporary session state after final pointers are preserved.
- Final outputs belong in `02_Output`.

## 12. File Naming Contract

| File | Purpose | Owner |
| --- | --- | --- |
| `task.md` | Task plan and progress | Orchestrator |
| `task_results.md` | Result pointer summary | Execution Agent |
| `session_state.json` | Temporary cross-turn state | Orchestrator |
| `context_bus.json` | Compact startup context | Node startup tool |
| `startup_result.json` | Startup proof | Node startup tool |
| `routing_result.json` | Router proof | Router wrapper |
| `prompt_stack.md` | Long-term workspace memory | Harmonizer |

## 13. Workspace Isolation

- Find the nearest parent directory containing `00_System`.
- Treat that directory as `Workspace_Root`.
- Do not cross into sibling workspaces.
- Use workspace-relative paths in MOSA artifacts.
- Avoid hard-coded absolute paths inside reusable MOSA rules.

Canonical workspace memory paths:

- `{Workspace_Root}/00_System/prompt_stack.md`
- `{Workspace_Root}/00_System/state.json`

## 14. Graph Token Shield

If `{Workspace_Root}/graphify-out/GRAPH_REPORT.md` exists:

- Read it before broad file exploration.
- Extract God Nodes.
- Store only a compact graph pointer in `01_Work/session_state.json`.
- Pass graph context to execution skills.

If it does not exist:

- Set graph context to `null`.
- Use normal targeted exploration.

Do not use global grep for architecture discovery when a graph report is available.

## 15. Audit Trigger Rules

Audit is mandatory when:

- The task writes 5 or more files.
- The task is marked critical.
- The task involves finance, compliance, or regulated data.
- The user explicitly asks for review or audit.
- The same Sub-Agent fails twice consecutively.
- The task changes `AGENTS.md`, registries, routing indexes, startup scripts, router scripts, hooks, or core MOSA skills.
- The task deletes files, changes credential handling, or touches secrets/tokens.
- The task creates a large diff or changes cross-workspace behavior.

Otherwise audit is optional.

If a task writes 5 or more files, leave one audit pointer:

- `01_Work/Agent_Activation_Log.md`
- `01_Work/registry_check_result.json`
- `02_Output/*audit*.md`

## 16. Mandatory Update Alignment Gate

Every MOSA framework update must align these layers:

1. Global protocol: `C:/Users/USER/.codex/AGENTS.md`.
2. Affected skills: `C:/Users/USER/.codex/skills/*/SKILL.md`.
3. Node tools: workspace `00_System/mosa_*.js`.
4. Generated evidence: `01_Work/provision_result.json`, `startup_result.json`, `routing_result.json`.
5. Audit memory: `00_System/prompt_stack.md` and reusable auto-skill experience.

Required checklist:

- Use `00_System/update_alignment_checklist.md` when available.
- Run Registry Distiller read-only after registry or protocol changes.
- Record a report pointer in `task_results.md`.
- Do not repeat manual fixes without updating the shared protocol layer.

## 17. Output Contract

Default MOSA node communication should use:

```text
[Status: ...]
[Data: ...]
[Next_Step: ...]
```

Keep internal MOSA outputs compact:

- Use point form.
- Prefer path pointers.
- Avoid full file duplication.
- Avoid repeated protocol text.
- Use English as canonical protocol language.

## 18. Highest Principle

- This file is the canonical global MOSA protocol.
- Update this file when MOSA behavior changes.
- Preserve Node evidence before trusting framework state.
- Prefer compact evidence over full-context loading.
- Prefer event-triggered checks over routine full scans.
- Prefer lean execution over standard MOSA when proof, routing, persistence, and audit do not add value.

