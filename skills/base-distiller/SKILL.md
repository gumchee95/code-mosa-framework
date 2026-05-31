---
name: Registry Distiller
description: Read-only registry diagnostics and router-support artifact generation for MOSA skill registries.
skill_id: BASE_DISTILLER
category: Core
route_policy: active
---

# Registry Distiller

## Mission

Registry Distiller keeps skill routing data healthy. It audits registry metadata, detects drift, and generates compact router-support artifacts. It does not replace Router.

## Core Policy

- Default mode is read-only.
- Do not mutate registry JSON without explicit user confirmation.
- Prefer `.codex/skills` as the active local source.
- Support `.gemini/antigravity/skills` as a legacy fallback.
- Write reports and generated artifacts to the active workspace `02_Output/`.
- Keep full diagnostics cold; never load them during normal startup.

## Functions

- Verify registered skill files exist.
- Detect missing files.
- Detect orphan skill folders.
- Detect tag collisions.
- Normalize tags and aliases.
- Extract capability phrases from metadata and headings.
- Generate compact routing artifacts.
- Generate token budget reports.

## Expected Artifacts

- `02_Output/startup_manifest.json`
- `02_Output/routing_index_light.json`
- `02_Output/reference_map_light.json`
- `02_Output/active_skill_index.json`
- `02_Output/reference_map.json`
- `02_Output/mode_profiles.json`
- `02_Output/token_budget_report.json`
- `02_Output/registry_distiller_report.json` as cold diagnostics only

## Command

```bash
node skills/base-distiller/scripts/distill_logic.js
```

Installed user-root equivalent:

```bash
node "$HOME/.codex/skills/base-distiller/scripts/distill_logic.js"
```

## MOSA Integration

- Router uses Distiller output as a routing enhancement source.
- Orchestrator may trigger Distiller when Router confidence is low.
- Harmonizer may use Distiller reports during framework maintenance.
- Distiller reports are proposals until the user confirms mutations.

## Guardrails

- Do not silently rewrite registry files.
- Do not load `registry_distiller_report.json` during normal startup.
- Do not make Router depend on the full report.
- Do not treat duplicate/reference skills as active routing competitors.
