# Global MOSA Protocol Alignment Audit

Date: 2026-06-01

## Scope

Checked:

- `C:\Users\USER\.codex\AGENTS.md`
- `C:\Users\USER\.codex\skills\orchestrator-agent\SKILL.md`
- `C:\Users\USER\.codex\skills\router-agent\SKILL.md`
- `C:\Users\USER\.codex\skills\auto-skill\SKILL.md`
- `C:\Users\USER\.codex\skills\skills_registry.json`
- `C:\Users\USER\.codex\skills\router-agent\*.js`

## Findings

| Area | Finding | Status |
|---|---|---|
| Global AGENTS | Missing Node provision protocol | Fixed |
| Global AGENTS | Still said `.gemini` was source of truth | Overridden |
| Orchestrator | Already had Node startup rules | OK |
| Orchestrator | Needed provision fallback in global rule chain | Fixed |
| Router skill | Only documented `mosa_search.js` | Fixed |
| Router skill | Did not require `routing_result.json` proof | Fixed |
| Router skill | Did not reject reconstructed routing proof | Fixed |
| Auto-skill | Missing `version:` stamp | Fixed |
| Auto-skill | Did not prefer Node promotion scorecard | Fixed |
| Registry | 212 registered skills | OK |
| Registry | Missing files: 0 | OK |
| Registry | Tag collisions: 0 | OK |
| Registry | Orphans: 0 | OK |

## Root Cause

The framework implementation had Node tools, but the global protocol still described the older agent-centered startup path.

This allowed agents to:

- Write Router-looking text manually.
- Skip `mosa_startup.js`.
- Skip `mosa_route.js`.
- Treat reconstructed routing as acceptable proof.

## Fixes Applied

### `AGENTS.md`

Added:

- `MOSA Node Provision Override`
- Active source: `.codex/skills`
- Legacy source: `.gemini/antigravity/skills`
- Mandatory startup evidence files
- Provision command
- Router evidence rule
- Audit pointer rule

### `router-agent/SKILL.md`

Added:

- Workspace Node wrapper protocol
- Preferred `mosa_route.js` command
- Required `routing_result.json`
- Reconstructed proof rejection
- Missing route tool failure rule
- Domain/capability/keywords rerun rule

### `auto-skill/SKILL.md`

Added:

- `version: 20260601-1800`
- Node Promotion Scorecard section
- Required `promotion_result.json`
- Override reason rule

## Validation

Commands passed:

```bash
node --check 00_System/mosa_provision_workspace.js
node --check 00_System/mosa_route.js
node C:\Users\USER\.codex\skills\base-distiller\scripts\distill_logic.js
```

Registry Distiller result:

```json
{
  "registered": 212,
  "missing_files": 0,
  "collisions": 0,
  "orphans": 0
}
```

## Remaining Caveat

`skills_registry.json` still stores many legacy `.gemini` paths.

This is acceptable because:

- Runtime resolver prefers `.codex/skills`.
- Registry Distiller reports no missing files.
- `AGENTS.md` now explicitly states `.codex/skills` is active.

## Verdict

The startup failure was caused by protocol drift.

The Node tooling existed, but global and Router-level instructions did not force agents to use it.

The global protocol is now aligned with the latest Node provision/startup/routing evidence chain.
