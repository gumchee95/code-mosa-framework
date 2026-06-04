---
name: Registry Distiller
description: Read-only registry diagnostics and router-support artifact generation for MOSA and legacy Antigravity skill registries.
skill_id: BASE_DISTILLER
category: Core
---

# Registry Distiller

Registry Distiller hardens the Skills, Knowledge, and Experience registries. It can run as a standalone utility, and it can also support MOSA Router by producing normalized tags, aliases, capability phrases, collision reports, and orphan reports.

## Core Policy

- Default mode is read-only.
- Do not mutate registry JSON without explicit user confirmation.
- Prefer `.codex/skills` as the active source.
- Support `.gemini/antigravity/skills` as legacy source.
- Generate reports under the active workspace `02_Output/` when a MOSA workspace exists.

## Core Functions

### Skills Registry Distillation

- Verify every `skills_registry.json` filepath exists.
- Normalize spelling, casing, spacing, and plural tag variants.
- Detect high-overlap tag collisions.
- Detect skills present on disk but absent from registry.
- Extract capability phrases from skill metadata and headings.

### Router Support Artifacts

- `normalized_tags`: canonical tag buckets.
- `alias_map`: raw tag to normalized tag mapping.
- `router_support`: skill id, path, tags, normalized tags, and capability phrases.
- `collision_report`: skills with high tag overlap.
- `orphan_report`: unregistered skill folders.

### Knowledge And Experience Refinement

- Scan knowledge and experience indices when present.
- Report category overlap and oversized experience records.
- Propose consolidation without executing it automatically.

## Execution Workflow

1. Scan active `.codex/skills` registry.
2. Fall back to legacy `.gemini/antigravity/skills` only when needed.
3. Generate read-only JSON and Markdown reports.
4. Return report paths to Orchestrator.
5. Wait for explicit user confirmation before any registry mutation.

## MOSA Skill Promotion Validation

After `skill-creator` creates a new skill, Orchestrator must invoke Registry Distiller in read-only mode before any registry mutation.

Validation checks:

1. Confirm the new skill folder exists.
2. Confirm `SKILL.md` has valid metadata.
3. Confirm `skill_id`, `name`, `description`, `category`, and tags are present.
4. Detect tag collisions against existing skills.
5. Detect whether the new skill is absent from `skills_registry.json`.
6. Generate suggested registry entry as a proposal.
7. Generate Router support phrases and aliases.
8. Return report paths to Orchestrator and Harmonizer.

Required output pointers:

```text
[Registry Distiller Validation]
- report_json: 02_Output/registry_distiller_report.json
- report_md: 02_Output/registry_distiller_report.md
- candidate_skill_id:
- status: pass | warning | fail
- registry_mutation_required: true/false
- user_confirmation_required: true/false
```

Distiller remains read-only. If registry mutation is required, Orchestrator must ask the user first, then pass the approved change to the responsible registry update step.

## Commands

```bash
node "$HOME/.codex/skills/base-distiller/scripts/distill_logic.js"
```

The command writes:

- `02_Output/registry_distiller_report.json`
- `02_Output/registry_distiller_report.md`

## MOSA Integration

- Router uses Distiller output only as an enhancement source.
- Distiller does not replace Router.
- Orchestrator may trigger Distiller when Router confidence is low.
- Orchestrator must trigger Distiller after `skill-creator` creates a MOSA-promoted skill.
- Orchestrator must treat Distiller reports as proposals, not applied changes.
