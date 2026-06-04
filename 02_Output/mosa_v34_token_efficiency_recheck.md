# MOSA v3.4 Token Efficiency Recheck

- Date: 2026-06-04
- Scope: startup, routing, cold/warm/hot runtime, model-token exposure
- Status: pass with one optimization note

## Current Evidence

- Startup proof: `01_Work/startup_result.json`
- Context bus: `01_Work/context_bus.json`
- Router proof: `01_Work/routing_result.json`
- Hook proof: `02_Output/mosa_hook_result.json`
- Cold test workspace: `C:/tmp/mosa_token_recheck_v34`

## Measured Files

| Artifact | Bytes | Approx tokens | Token exposure |
| --- | ---: | ---: | --- |
| `01_Work/startup_result.json` | 1191 | 298 | Model reads |
| `01_Work/context_bus.json` | 871 | 218 | Model reads |
| `01_Work/routing_result.json` | 2835 | 709 | Model reads |
| `02_Output/startup_manifest.json` | 2044 | 511 | Optional pointer |
| `02_Output/routing_index_light.json` | 18226 | 4557 | Node reads, model should not |
| `02_Output/reference_map_light.json` | 1186 | 297 | Node reads, model should not |
| `02_Output/mode_profiles.json` | 2204 | 551 | Node reads, model should not |
| `02_Output/active_skill_index.json` | 42715 | 10679 | Fallback only |
| `02_Output/registry_distiller_report.json` | 283327 | 70832 | Cold diagnostics only |
| `00_System/routing_cache.json` | 98990 | 24748 | Node reads, model should not |

## Model-Visible Startup Cost

Normal model-visible startup after v3.4:

- Required read: `startup_result.json` + `context_bus.json`
- Approx tokens: `298 + 218 = 516`

Normal model-visible routing proof:

- Required read: `routing_result.json`
- Approx tokens: `709`

Normal startup plus route proof:

- Approx tokens: `516 + 709 = 1225`

If `startup_manifest.json` is opened for policy confirmation:

- Approx tokens: `1225 + 511 = 1736`

## Node-Side Runtime Cost

Node-side reads do not directly consume model context unless the agent opens or prints the full content.

Warm route reads lightweight artifacts:

- `routing_index_light.json`: 4557 token-equivalent
- `reference_map_light.json`: 297 token-equivalent
- `mode_profiles.json`: 551 token-equivalent
- Cache file may be read by Node: 24748 token-equivalent on disk, but not model-visible

Hot route source after repeated same intent:

- `engine_source`: `cache`
- Model-visible proof remains about `709` tokens.

## Cold / Warm / Hot Result

| Mode | Result | Router source | Model-visible cost | Notes |
| --- | --- | --- | ---: | --- |
| Cold provision | Pass | `routing_index_light` | about 1225 after files are written | Provision copies light artifacts and avoids full registry reports. |
| Warm startup | Pass | `routing_index_light` | about 1225 | Startup reports `estimated_hot_tokens: 5916`, but model only needs compact proof files. |
| Hot route | Pass | `cache` | about 709 for route proof | Repeated identical route hits cache after the first route has written cache. |

## Baseline Comparison

| Run type | Startup tokens | Routing tokens | Persistence | Best for |
| --- | ---: | ---: | --- | --- |
| Blank run | ~0 | ~0 | none | one-step answers |
| Normal skill run | depends on loaded skill, commonly 500-3000+ | ad hoc | weak | simple task with one obvious skill |
| MOSA v3.4 warm/hot | about 516 startup + 709 route proof | compact proof | strong | multi-step, audited, resumable work |
| MOSA cold diagnostics | can exceed 70k if full registry report is opened | diagnostic only | strong | registry failures, audits, framework repair |

## Finding

MOSA v3.4 is token-efficient only when the agent follows the Token Shield:

- Read compact proofs first.
- Do not open `routing_index_light.json` in chat unless debugging.
- Do not open `registry_distiller_report.json` unless low confidence or audit requires it.
- Let Node read cache and indexes.
- Let the model read only pointers and final compact JSON.

## Optimization Applied

`mosa_provision_workspace.js --run` now prints compact provision output by default:

- default: print compact pointers only
- `--verbose`: print nested startup and route JSON
- full nested evidence remains written to `01_Work/provision_result.json`

Compact cold provision output was verified in:

- `C:/tmp/mosa_compact_provision_check`

Verbose output was verified in:

- `C:/tmp/mosa_compact_provision_check_verbose`
