# MOSA Core Skills

This directory contains the English public version of the core MOSA skills.

Included skills:

- `orchestrator-agent`: intent atomization, state control, routing handoff, dispatch.
- `router-agent`: explainable skill retrieval and confidence scoring.
- `base-distiller`: read-only registry diagnostics and routing artifact generation.
- `mosa-graph-builder`: topology, Token Shield, startup pointers, graph contracts.
- `mosa-harmonizer`: framework alignment, maintenance, memory, and drift checks.

The public package intentionally includes only core framework skills. Domain-specific or personal skills should be installed separately and indexed through the Distiller workflow.

The public registry is:

- `skills/skills_registry.json`

## Local Development

Run framework checks from the repository root:

```bash
node 00_System/mosa_cli.js check
node 00_System/mosa_cli.js test
node 00_System/mosa_cli.js dag
node 00_System/mosa_cli.js maintain
```

## Registry Policy

- `.codex/skills` is the preferred active user skill root.
- `.gemini/antigravity/skills` is supported as a legacy fallback.
- Public repository paths use `skills/<skill-name>/SKILL.md`.
- Registry mutation must be explicit and confirmed.
