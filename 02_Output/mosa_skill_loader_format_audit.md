# MOSA Skill Loader Format Audit

- Date: 2026-06-04
- Status: pass
- Scope: Orchestrator, Router, Graph Builder, Harmonizer
- Hook event: `framework-update`
- Hook level: P2
- Hook evidence: `02_Output/mosa_hook_result.json`

## Root Cause

- Four `SKILL.md` files started with UTF-8 BOM bytes.
- Strict frontmatter parsing did not see raw `---`.
- Router frontmatter was also damaged during alias cleanup.
- Descriptions were not trigger-style.

## Fixes

- Rewrote files as UTF-8 without BOM.
- Restored Router body and closing frontmatter.
- Removed Router YAML `aliases` array from frontmatter.
- Kept aliases inside the skill body.
- Updated descriptions to begin with `Use when`.

## Strict Format Checks

- `orchestrator-agent`: pass.
- `router-agent`: pass.
- `mosa-graph-builder`: pass.
- `mosa-harmonizer`: pass.
- Directory name matches `name`: pass.
- Required fields present: pass.
- ASCII/control-character check: pass.

## Routing Smoke Tests

- `orchestrator-agent`: top skill.
- `router-agent`: top skill.
- `mosa-graph-builder`: top skill.
- `mosa-harmonizer`: top skill.

## Registry Checks

- Registry Distiller: pass.
- Missing files: 0.
- Collisions: 0.
- Orphans: 0.
