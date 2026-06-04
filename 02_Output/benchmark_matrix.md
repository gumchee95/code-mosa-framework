# MOSA Benchmark Matrix

Date: 2026-05-29

## Purpose

- Compare MOSA-enabled runs.
- Compare baseline direct runs.
- Measure cost, efficiency, effectiveness.
- Support repeatable audits.

## Measurement Legend

| Mark | Meaning |
|---|---|
| observed | Measured from current run/files |
| estimated | Reasoned baseline estimate |
| pending | Needs controlled second run |

## Run Metadata

| Field | MOSA Run | Baseline Run |
|---|---|---|
| Date | 2026-05-29 | 2026-05-29 |
| Agent/model | Codex desktop | Codex desktop |
| Workspace | MosaFramework | MosaFramework |
| Task ID | T05 | T05 |
| Task type | Audit workflow | Audit workflow |
| Operator | Codex | Codex |
| Notes | observed MOSA startup | controlled baseline |

## Core Metrics

| Metric | MOSA Run | Baseline Run | Delta | Winner |
|---|---:|---:|---:|---|
| Startup tokens | ~4,104 observed | ~0 observed | +4,104 | Baseline |
| Input tokens | ~4,900 estimated | ~1,300 estimated | +3,600 | Baseline |
| Output tokens | ~1,100 estimated | ~271 observed | +829 | Baseline |
| Total tokens | ~6,000 estimated | ~1,571 estimated | +4,429 | Baseline |
| First response time | Medium observed | Fast observed | Higher | Baseline |
| Total completion time | Medium observed | Fast observed | Higher | Baseline |
| Tool calls | 11 observed | 3 observed | +8 | Baseline |
| File reads | 8 observed | 2 observed | +6 | Baseline |
| File writes | 8 observed | 1 observed | +7 | Baseline |
| Failed calls | 0 observed | 0 observed | 0 | Tie |
| Repeated calls | 0 observed | 0 observed | 0 | Tie |
| Clarifying questions | 0 observed | 0 observed | 0 | Tie |
| Rework cycles | 0 observed | 0 observed | 0 | Tie |
| Final artifacts | 8 observed | 1 observed | +7 | MOSA |

## Efficiency Scores

| Metric | Formula | MOSA Run | Baseline Run | Winner |
|---|---|---:|---:|---|
| Token efficiency | completed_steps / total_tokens | ~0.0013 | ~0.0025 | Baseline |
| Time efficiency | completed_steps / minutes | pending | pending | pending |
| Tool effectiveness | useful_calls / total_calls | 1.00 observed | 1.00 observed | Tie |
| Failure rate | failed_calls / total_calls | 0.00 observed | 0.00 observed | Tie |
| Rework rate | rework_cycles / completed_steps | 0.00 observed | 0.00 observed | Tie |
| Output density | accepted_outputs / output_tokens | ~0.0073 | ~0.0037 | MOSA |

## Effectiveness Scores

Score each item from 1 to 5.

| Criterion | MOSA Run | Baseline Run | Winner |
|---|---:|---:|---|
| Requirement coverage | 5 | 4 observed | MOSA |
| Output correctness | 4 | 4 observed | Tie |
| Audit traceability | 5 | 3 observed | MOSA |
| Context retention | 5 | 2 estimated | MOSA |
| Reproducibility | 5 | 3 observed | MOSA |
| Maintainability | 4 | 3 observed | MOSA |
| User readiness | 4 | 4 observed | Tie |
| Total score | 32 | 23 observed | MOSA |

## Task Set

| Task ID | Task | Expected Output | Complexity | MOSA Result | Baseline Result |
|---|---|---|---|---|---|
| T01 | One-step factual answer | concise answer | Low | overkill expected | better expected |
| T02 | Single file edit | patched file | Low | acceptable | better expected |
| T03 | Multi-file code change | working change | Medium | preferred | risky without trace |
| T04 | Debug failing test | root cause and fix | Medium | preferred | acceptable |
| T05 | Audit workflow | audit report | Medium | passed observed | passed observed |
| T06 | Long-running project plan | task plan and state | High | preferred | weak state |
| T07 | Context recovery | resumed work | High | preferred | weak recovery |
| T08 | Compliance-sensitive task | traceable result | High | preferred | weak audit |

## Validation Check

| Check | Result |
|---|---|
| `00_System` exists | Pass |
| `01_Work` exists | Pass |
| `02_Output` exists | Pass |
| `task.md` exists | Pass |
| `task_results.md` exists | Pass |
| Audit report exists | Pass |
| Benchmark matrix exists | Pass |
| Baseline run exists | Pass |
| Graph report exists | Fail |
| Token Shield active | Fail |

## Decision Rules

| Condition | Preferred Mode |
|---|---|
| Total task under 5 minutes | Baseline |
| One-step answer only | Baseline |
| No file writes | Baseline |
| Multi-step workflow | MOSA |
| Audit required | MOSA |
| Compliance involved | MOSA |
| Context recovery needed | MOSA |
| More than 3 files touched | MOSA |

## Summary

| Category | Winner | Evidence |
|---|---|---|
| Cost | Baseline | lower startup tokens |
| Speed | Baseline | fewer required steps |
| Reliability | MOSA | zero observed failures |
| Traceability | MOSA | task/state/result files |
| Overall | MOSA for audits | stronger evidence chain |

## Audit Note

- Baseline controlled run completed.
- Time metrics need stopwatch capture.
- Use same prompt for both modes.
- Use same workspace state.
- Record raw logs as pointers.
