# MOSA Node.js Tooling Summary Report

Date: 2026-06-01

## Executive Summary

This review found that MOSA's registry layer is healthy, but its startup workflow was too agent-centered.
The main optimization opportunity was moving deterministic startup, routing, promotion scoring, and registry validation into Node.js tools.

The first optimization cycle is now implemented and verified.
Agents remain responsible for judgment, user confirmation, and final decisions.
Node.js now handles repeatable setup and compact handoff artifacts.

## Original Problem

- MOSA startup depended heavily on agent protocol reading.
- Repeated skill and registry orientation consumed tokens.
- Deterministic steps were mixed with reasoning steps.
- Agent handoffs were text-heavy.
- Registry diagnostics existed but were not fully workflow-gated.

## Audit Findings

| Area | Finding |
|---|---|
| Registry health | Good |
| Registered skills | 212 |
| Missing files | 0 |
| Tag collisions | 0 |
| Orphan skills | 0 |
| Graph report | Missing |
| Startup manifest | Available |
| Light routing index | Available |
| Main bottleneck | Agent-readable startup protocol |

## Implemented Node.js Tools

| Tool | Purpose | Output |
|---|---|---|
| `mosa_startup.js` | Bootstrap workspace and emit compact startup state | `startup_result.json` |
| `mosa_route.js` | Wrap Router search with compact output | `routing_result.json` |
| `mosa_promotion.js` | Automate Promotion Scorecard | `promotion_result.json` |
| `mosa_registry_check.js` | Run read-only registry gate | `registry_check_result.json` |

## Generated Handoff Files

| File | Size | Role |
|---|---:|---|
| `context_bus.json` | 1,009 bytes | Pointer-based context |
| `startup_result.json` | 1,328 bytes | Startup summary |
| `routing_result.json` | 1,648 bytes | Compact routing result |
| `promotion_result.json` | 546 bytes | Scorecard result |
| `registry_check_result.json` | 1,149 bytes | Registry gate result |

## Workflow Shift

Before:

```text
Agent reads protocols -> Agent initializes -> Agent routes -> Agent audits registry -> Agent records state
```

After:

```text
Node startup -> compact JSON -> Node routing -> compact JSON -> Agent judgment
```

## Validation Results

| Check | Result |
|---|---|
| `node --check mosa_startup.js` | Pass |
| `node --check mosa_route.js` | Pass |
| `node --check mosa_promotion.js` | Pass |
| `node --check mosa_registry_check.js` | Pass |
| Startup command | Pass |
| Routing command | Pass |
| Promotion command | Pass |
| Registry check command | Pass |

## Measured Outputs

| Metric | Result |
|---|---|
| Startup turn count | 2 |
| Graph available | false |
| Routing source | light index/cache |
| Top routed skill | `MOSA_HARMONIZER` |
| Routing confidence | 0.99 |
| Promotion score | 7/7 |
| Promotion decision | propose new skill |
| Registry check | pass |
| Registry mutation | disabled |

## Token Impact

Expected reduction:

- Startup protocol reading: from about 4,000 tokens to about 500 tokens.
- Registry orientation: avoids reading large cold reports during startup.
- Handoff: changed from free text to compact JSON pointers.
- Full registry report remains cold-read only.

## Updated MOSA Behavior

The Orchestrator now prefers:

1. `node 00_System/mosa_startup.js`
2. `01_Work/startup_result.json`
3. `01_Work/context_bus.json`
4. `node 00_System/mosa_route.js`
5. `01_Work/routing_result.json`
6. `node 00_System/mosa_promotion.js`
7. `node 00_System/mosa_registry_check.js`

## Remaining Gaps

- `GRAPH_REPORT.md` is still missing.
- `mosa_gc.js` is not implemented yet.
- Skill creation is not auto-executed.
- Registry mutation still needs explicit approval.
- Candidate skill awaits user decision.

## Candidate Skill

The new Promotion Scorecard recommends creating:

```text
mosa-node-js-startup-and-routing-workflow-optimization
```

Reason:

- Score: 7/7.
- Reusable workflow.
- Multi-step process.
- Tool integration.
- Template-like output.
- Token savings.
- Repeated startup need.
- Packageable scripts.

## Recommendation

Next step:

- Build the candidate skill only after user approval.
- Generate `GRAPH_REPORT.md` to activate Token Shield.
- Add `mosa_gc.js` for session cleanup.
- Keep registry writes gated by confirmation.

## Final Verdict

MOSA now has a practical Node-assisted startup path.
The framework is no longer purely agent-centered for deterministic startup flows.
The optimization preserves MOSA's auditability while reducing token-heavy protocol reads.
