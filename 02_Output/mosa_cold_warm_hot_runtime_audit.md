# MOSA Cold Warm Hot Runtime Audit

- Date: 2026-06-04
- Status: pass
- Scope: provisioner, startup, router, cache
- Hook evidence: `02_Output/mosa_hook_result.json`

## Cold Mode

- Test workspace: `C:/tmp/mosa_cold_light_check`
- Provision result: pass
- Light artifacts copied: pass
- Startup result: pass
- Router result: pass
- Router source: `routing_index_light`
- Full registry fallback: avoided

## Warm Mode

- Workspace: `C:/Users/USER/Documents/MosaFramework`
- Startup result: pass
- Mode: `warm`
- Hot artifacts detected: pass
- Estimated hot tokens: 5916
- Cold registry reads: avoided

## Hot Mode

- First route source: `routing_index_light`
- Cache invalidation after P2: expected
- Second route source: `cache`
- Router proof: `01_Work/routing_result.json`

## Provisioner Update

- File: `00_System/mosa_provision_workspace.js`
- Added `copyLightArtifacts`.
- Copies:
  - `startup_manifest.json`
  - `routing_index_light.json`
  - `reference_map_light.json`
  - `mode_profiles.json`
  - `active_skill_index.json`
- Excludes full registry diagnostic reports.

## Validation

- `node --check 00_System/mosa_provision_workspace.js`: pass
- ASCII/control-character check: pass
- P2 hook: pass 16/16
