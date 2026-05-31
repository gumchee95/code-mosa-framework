---
name: mosa-harmonizer
description: MOSA framework alignment and memory maintainer. Audits framework consistency, routing drift, skill overlap, token efficiency, and durable project memory.
skill_id: MOSA_HARMONIZER
category: Core
route_policy: active
---

# MOSA Harmonizer

## Mission

Harmonizer maintains the framework itself. It does not execute normal business tasks. It checks whether the MOSA files, routing artifacts, graph, startup protocol, and durable memory still agree.

## Responsibilities

- Audit framework alignment.
- Check workspace structure.
- Detect routing/index drift.
- Detect stale graph pointers.
- Check token efficiency.
- Record durable decisions in `00_System/prompt_stack.md`.
- Maintain cleanup and technical-debt backlogs.
- Consolidate repeated skill families.
- Run maintenance when drift threshold is reached.

## Default Maintenance Flow

Use the CLI maintenance pass first:

```bash
node 00_System/mosa_cli.js maintain
```

This is read-only by default and combines:

- workspace and JSON checks
- golden route tests
- dependency and reference DAG validation
- graph contract checks
- token budget checks

To save a maintenance report:

```bash
node 00_System/mosa_cli.js maintain --write
```

This writes only:

- `02_Output/maintenance_report.json`

## DAG And Registry Safety

Before changing skill relationships:

```bash
node 00_System/mosa_cli.js dag
```

The DAG check validates:

- missing dependencies
- dependency cycles
- duplicate skill ids
- unresolved reference masters
- stale graph pointers

External orphan checks are optional:

```bash
node 00_System/mosa_cli.js dag --external
```

## Memory Update

When a task produces durable framework knowledge:

1. Read `01_Work/task.md`.
2. Read `01_Work/task_results.md`.
3. Append only a short durable summary to `00_System/prompt_stack.md`.
4. Do not store full reports or long transcripts in memory.

## Framework Alignment Checklist

- `AGENTS.md` matches startup protocol.
- `GRAPH_REPORT.md` points to current routing files.
- `startup_manifest.json` includes `mosa_cli.js`.
- `routing_index_light.json` and `active_skill_index.json` agree on core skills.
- `reference_map_light.json` masters exist.
- `registry_distiller_report.json` remains cold.
- `context_bus.json` remains current-task only.

## Guardrails

- Do not mutate registry files without confirmation.
- Do not turn maintenance into normal startup overhead.
- Do not read cold full diagnostics unless the user asks for an audit.
- Do not promote temporary context bus facts into durable memory without summarizing.
