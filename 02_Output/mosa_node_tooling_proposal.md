# MOSA Node.js Tooling Proposal

Date: 2026-06-01

## Objective

- Reduce agent-centered startup cost.
- Move deterministic workflows into Node.js.
- Keep agents for judgment-heavy decisions.
- Preserve MOSA audit traceability.

## Current Evidence

| Evidence | Status |
|---|---|
| Registered skills | 212 |
| Missing skill files | 0 |
| Tag collisions | 0 |
| Orphan skills | 0 |
| `startup_manifest.json` exists | Yes |
| `routing_index_light.json` exists | Yes |
| `00_System/mosa_startup.js` exists | Yes |
| `01_Work/context_bus.json` exists | Yes |
| `GRAPH_REPORT.md` exists | No |

## Main Finding

The framework already has good registry health.
The main token cost comes from agent-readable protocols.
The first optimization should be a Node startup runner.

## Codeable Flows

| Flow | Current Owner | Node.js Candidate | Priority |
|---|---|---|---|
| Workspace bootstrap | Orchestrator | `mosa_startup.js` | P0 |
| State increment | Orchestrator | `mosa_state.js` | P0 |
| Token Shield check | Orchestrator | `mosa_startup.js` | P0 |
| Startup manifest read | Agent | `mosa_startup.js` | P0 |
| Context bus template | Agent | `mosa_context.js` | P0 |
| Routing cache lookup | Router | existing `mosa_search.js` | P1 |
| Registry distillation | Distiller | existing `distill_logic.js` | P1 |
| Promotion scorecard | auto-skill | `mosa_promotion.js` | P1 |
| Skill promotion pipeline | Orchestrator | `mosa_promotion.js` | P2 |
| Registry post-check | Harmonizer | Distiller + `mosa_registry_check.js` | P2 |
| GC/session cleanup | Orchestrator | `mosa_gc.js` | P2 |

## Keep Agent-Centered

| Decision | Reason |
|---|---|
| Requirement interpretation | Needs judgment |
| Skill selection override | Needs context |
| User confirmation | Needs consent |
| Architecture tradeoffs | Needs reasoning |
| Final audit verdict | Needs judgment |

## Proposed Node Entry Points

```text
00_System/mosa_startup.js
00_System/mosa_context.js
00_System/mosa_promotion.js
00_System/mosa_gc.js
```

## Startup Runner MVP

Command:

```bash
node 00_System/mosa_startup.js --intent "<user intent>"
```

Responsibilities:

1. Ensure `00_System`, `01_Work`, `02_Output`.
2. Ensure `state.json`.
3. Increment `turn_count`.
4. Check `GRAPH_REPORT.md`.
5. Read `startup_manifest.json` if present.
6. Create `01_Work/context_bus.json`.
7. Create or update `01_Work/task.md`.
8. Emit compact JSON for the agent.

Expected output:

```json
{
  "status": "ok",
  "workspace_root": "...",
  "graph_available": false,
  "turn_count": 2,
  "hot_artifacts": {
    "routing_index": "02_Output/routing_index_light.json",
    "startup_manifest": "02_Output/startup_manifest.json"
  },
  "next_agent_action": "read compact startup result only"
}
```

## Expected Token Savings

| Area | Before | After |
|---|---:|---:|
| Startup protocol reading | ~4,000 tokens | ~500 tokens |
| Registry orientation | up to 69,000 tokens | 500-4,500 tokens |
| Workspace bootstrap | agent reasoning | deterministic |
| Context handoff | free text | JSON pointer |

## Proposed Phase Plan

### Phase 1: Startup Simplification

- Add `00_System/mosa_startup.js`.
- Add `01_Work/context_bus.json`.
- Agent reads only startup JSON.
- Keep all registry mutation disabled.

### Phase 2: Routing Simplification

- Reuse `mosa_search.js`.
- Prefer `routing_index_light.json`.
- Use full skill files only after routing.
- Cache routing result.

### Phase 3: Promotion Automation

- Add `mosa_promotion.js`.
- Compute scorecard mechanically.
- Write candidate pointer.
- Ask user before `skill-creator`.

### Phase 4: Registry Validation

- Reuse `distill_logic.js`.
- Add post-create validation mode.
- Generate registry proposal.
- Require user confirmation.

## Risk Controls

- Node tools cannot make judgment calls.
- Registry writes require confirmation.
- Agents remain final authority.
- Reports stay pointer-based.
- Full reports remain cold reads.

## Recommendation

Start with Phase 1.
It gives the biggest token reduction.
It does not change skill behavior.
It creates the missing `mosa_startup.js`.

## Phase 1 Implementation Status

| Artifact | Status | Size |
|---|---|---:|
| `00_System/mosa_startup.js` | implemented | 6,339 bytes |
| `01_Work/context_bus.json` | generated | 1,009 bytes |
| `01_Work/startup_result.json` | generated | 1,328 bytes |
| `01_Work/task.md` snapshot | generated | 1,520 bytes |
| `00_System/mosa_route.js` | implemented | 3,316 bytes |
| `01_Work/routing_result.json` | generated | 1,648 bytes |
| `00_System/mosa_promotion.js` | implemented | 5,432 bytes |
| `01_Work/promotion_result.json` | generated | 546 bytes |
| `00_System/mosa_registry_check.js` | implemented | 3,021 bytes |
| `01_Work/registry_check_result.json` | generated | 1,149 bytes |

Validation:

- Startup command succeeded.
- `turn_count` incremented to 2.
- Graph check returned false.
- Registry mutation remains disabled.
- Cold registry reports are forbidden.
- Agent next action is compact-read only.
- Routing uses light index/cache.
- Routing output defaults to compact mode.

Validated command:

```bash
node 00_System/mosa_startup.js --intent "重新审核整体 MOSA framework，把可代码化流程变成 Node.js 启动，减少 token 花费"
```

```bash
node 00_System/mosa_route.js
```

## Phase 2 Implementation Status

Status: implemented.

Result:

- Router wrapper created.
- Context bus reused.
- `routing_index_light` supported.
- Default output compacted.
- Verbose mode available.
- Top skill: `MOSA_HARMONIZER`.
- Confidence: `0.99`.

## Phase 3 Implementation Status

Status: implemented.

Result:

- Promotion scorecard automated.
- Current score: `7/7`.
- Decision: `propose_new_skill`.
- Candidate: `mosa-node-js-startup-and-routing-workflow-optimization`.
- Registry check required: `true`.
- User confirmation required: `true`.

Validated command:

```bash
node 00_System/mosa_promotion.js --summary "MOSA Node.js startup and routing workflow optimization"
```

## Phase 4 Implementation Status

Status: implemented.

Result:

- Registry check wrapper created.
- Registry Distiller reused.
- Mode: read-only.
- Status: `pass`.
- Registered skills: `212`.
- Missing files: `0`.
- Collisions: `0`.
- Orphans: `0`.
- Registry mutation allowed: `false`.
- User confirmation required: `true`.

Validated command:

```bash
node 00_System/mosa_registry_check.js
```

## Orchestrator Integration Status

Status: implemented.

Protocol changes:

- Startup now prefers `mosa_startup.js`.
- Agent reads `startup_result.json`.
- Agent reads `context_bus.json`.
- Cold registry reads are forbidden.
- Routing now prefers `mosa_route.js`.
- Agent reads `routing_result.json`.
- Promotion now prefers `mosa_promotion.js`.
- Registry gate now prefers `mosa_registry_check.js`.

Net effect:

- Agent no longer starts by reading full protocols.
- Deterministic setup is handled by Node.js.
- Judgment remains with the agent.
- Registry mutation remains user-gated.
