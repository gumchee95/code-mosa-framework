# MOSA Problem-Solving Experience Record

Date: 2026-06-01

## Core Lesson

Do not trust manually written Router-looking text.
Trust only tool-generated startup and routing artifacts.

## Problem Pattern

- Workspace contains MOSA folders.
- `task.md` contains Router-like sections.
- `routing_result.json` is missing or reconstructed.
- `mosa_startup.js` or `mosa_route.js` is missing.
- Agent proceeds as if Router ran.
- Audit later finds no startup evidence.

## Root Cause

Protocol drift:

- Global `AGENTS.md` used old agent-centered startup.
- `router-agent` documented `mosa_search.js` only.
- `auto-skill` did not prefer Node scorecard.
- Provision was not mandatory for new workspaces.

## Durable Fix

- Add `mosa_provision_workspace.js`.
- Require provision when startup tools are missing.
- Require `startup_result.json`.
- Require `routing_result.json`.
- Reject `status: reconstructed`.
- Prefer `.codex/skills`.
- Treat `.gemini` paths as legacy-compatible only.

## Repeat-Prevention Rule

Every update must align four layers:

1. Global `AGENTS.md`.
2. Relevant `SKILL.md`.
3. Node.js tool behavior.
4. Generated proof artifacts.

## Commands

```bash
node 00_System/mosa_provision_workspace.js --target "<workspace>" --run --intent "<task intent>"
node 00_System/mosa_route.js --domain "<domain>" --capability "<capability>" --keywords "<comma keywords>" --intent "<task intent>"
node C:\Users\USER\.codex\skills\base-distiller\scripts\distill_logic.js
```

## Verification Standard

- Registry missing files: `0`.
- Registry collisions: `0`.
- Registry orphans: `0`.
- Router fallback: `null`.
- Top skill matches domain/capability.
- Audit pointer exists.

## Current Canonical Reports

- `02_Output/global_mosa_protocol_alignment_audit.md`
- `02_Output/mosa_startup_routing_root_fix_report.md`
- `02_Output/mosa_node_tooling_summary_report.md`
- `00_System/update_alignment_checklist.md`
