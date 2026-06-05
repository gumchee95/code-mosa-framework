# MOSA Update Alignment Checklist

Date: 2026-06-01

Use this checklist after every MOSA protocol, skill, router, or startup-tool update.

## Token Shield Hook Policy

- [ ] Use `node 00_System/mosa_cli.js hook --event <event>` for triggered checks.
- [ ] Do not run hooks for lean mode or routine normal tasks.
- [ ] Use `--event protocol-update` after AGENTS changes.
- [ ] Use `--event registry-update` after registry changes.
- [ ] Use `--event framework-update` before trusting MOSA updates.
- [ ] Read compact hook output first.
- [ ] Open detailed hook reports only on failure.

## Mandatory Checks

- [ ] Update `C:/Users/USER/.codex/AGENTS.md`.
- [ ] Update affected `SKILL.md` files.
- [ ] Confirm `.codex/skills` remains active source.
- [ ] Keep `.gemini/antigravity/skills` as legacy only.
- [ ] Run `node --check` on changed Node tools.
- [ ] Run `mosa_provision_workspace.js` on target workspace.
- [ ] Confirm `01_Work/provision_result.json`.
- [ ] Confirm `01_Work/startup_result.json`.
- [ ] Confirm `01_Work/routing_result.json`.
- [ ] Reject `routing_result.status == "reconstructed"`.
- [ ] Run Registry Distiller read-only.
- [ ] Record audit/report pointer in `task_results.md`.

## Required Evidence

```text
00_System/mosa_startup.js
00_System/mosa_route.js
01_Work/provision_result.json
01_Work/startup_result.json
01_Work/routing_result.json
02_Output/*audit*.md
```

## Rule

No protocol update is complete until global rules, skill SOPs, Node tools, and generated proof files agree.

Routine tasks do not require P0/P1/P2 unless an event trigger is present.
