# Router Agent Skill Audit

Date: 2026-06-02

## Scope

- `C:/Users/USER/.codex/skills/router_agent`
- `C:/Users/USER/.codex/skills/router-agent`
- `C:/Users/USER/.codex/skills/router-agent/SKILL.md`
- `C:/Users/USER/.codex/skills/router-agent/*.js`
- `C:/Users/USER/.codex/skills/skills_registry.json`
- Workspace `00_System/mosa_route.js`

## Verdict

Router core is functional, but naming and legacy protocol remnants create startup confusion.

2026-06-02 fix applied:

- `router-agent` remains canonical.
- `router_agent` is documented as alias only.
- `@router_agent` normalizes to `@router-agent`.
- `/router_agent` normalizes to `/router-agent`.
- `.gemini` Router commands were replaced.
- Active registry Router filepath now uses `.codex`.
- Registry Distiller was rerun read-only.

## Findings

| ID | Severity | Finding | Evidence | Impact |
|---|---:|---|---|---|
| R1 | High | `router_agent` path does not exist | `Test-Path C:/Users/USER/.codex/skills/router_agent = False` | Any loader using underscore path fails |
| R2 | Low | Canonical path exists | `C:/Users/USER/.codex/skills/router-agent` | Current Codex skill path is valid |
| R3 | Medium | Legacy `/router_agent` references remain | `orchestrator-agent/Orchestrator-agent-skills*.md` | Old instructions can misroute humans or scanners |
| R4 | Medium | Legacy `.gemini` commands remain | `router-agent/asadas.md`, `router-agent/router-skills.md` | Distiller/search may surface stale startup commands |
| R5 | Low | Registry still stores legacy filepath | `~/.gemini/antigravity/skills/router-agent/SKILL.md` | Safe only because resolver remaps to `.codex` |
| R6 | Pass | Router script resolves `.codex` first | `mosa_paths.js resolveSkillRoot()` | Runtime source preference is correct |
| R7 | Pass | `mosa_search.js` syntax passes | `node --check` | Search script is executable |
| R8 | Pass | Workspace wrapper writes proof | `01_Work/routing_result.json` | Official Router evidence exists |

## Runtime Test

Intent:

```text
check router agent skill startup and routing evidence
```

Observed result:

- `status`: `success`
- `source`: `routing_index_light`
- `top_skill`: `ROUTER_AGENT`
- `confidence`: `0.99`
- `resolved_path`: `C:/Users/USER/.codex/skills/router-agent/SKILL.md`
- proof file: `C:/Users/USER/Documents/MosaFramework/01_Work/routing_result.json`

## Root Cause

The Router failure risk is not script execution. It is protocol ambiguity:

- Canonical skill directory uses kebab-case: `router-agent`.
- Some old instructions still use handle-like names: `/router_agent`.
- Some old support docs still point to `.gemini`.
- Registry retains legacy filepaths and depends on resolver remapping.

## Required Fix

1. Keep canonical directory:
   - `C:/Users/USER/.codex/skills/router-agent`
2. Do not create duplicate:
   - `C:/Users/USER/.codex/skills/router_agent`
3. Replace old executable commands:
   - from `.gemini/antigravity/skills/router-agent`
   - to `.codex/skills/router-agent`
4. Replace old human handle where ambiguous:
   - from `/router_agent`
   - to `@router-agent` or `router-agent`
5. Keep `mosa_route.js` as primary proof generator.
6. Keep `mosa_search.js` as fallback only.

## Fix Verification

| Check | Result |
|---|---|
| `router_agent` duplicate directory | Not created |
| `router-agent/SKILL.md` metadata | `skill_id: ROUTER_AGENT` |
| Codex alias documentation | Added |
| Global alias rule | Added |
| Orchestrator normalization | Added |
| Legacy Router `.gemini` commands | Removed from active Router docs |
| `skills_registry.json` Router filepath | `~/.codex/skills/router-agent/SKILL.md` |
| `registry/workflow.json` Router filepath | `~/.codex/skills/router-agent/SKILL.md` |
| `mosa_search.js` alias test | Top skill `ROUTER_AGENT` |
| `mosa_route.js` proof test | Top skill `ROUTER_AGENT` |
| Registry Distiller | Success |

Current Router proof:

- `status`: `success`
- `top_skill.skill_id`: `ROUTER_AGENT`
- `top_skill.confidence`: `0.99`
- `top_skill.resolved_path`: `C:/Users/USER/.codex/skills/router-agent/SKILL.md`

## English Rewrite Fix

2026-06-02 active skill files were rewritten in English ASCII:

- `C:/Users/USER/.codex/skills/router-agent/SKILL.md`
- `C:/Users/USER/.codex/skills/orchestrator-agent/SKILL.md`

Reason:

- Chinese text became mojibake after previous protocol edits.
- English ASCII avoids encoding ambiguity in Codex/PowerShell workflows.

Verification:

- No non-ASCII or mojibake pattern found in active files.
- `mosa_search.js` returned `ROUTER_AGENT`.
- `resolved_path` points to `.codex/skills/router-agent/SKILL.md`.
- Registry Distiller rerun succeeded.
- registered: `212`
- missing files: `0`
- collisions: `0`
- orphans: `0`

## Completion Gate

Router startup is trusted only when:

- `00_System/mosa_route.js` exists.
- `01_Work/routing_result.json` exists.
- `routing_result.json.status != reconstructed`.
- `resolved_path` points into `.codex/skills/router-agent`.
