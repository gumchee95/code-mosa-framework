# Baseline Controlled Run

Date: 2026-05-29

## Scope

- Task ID: T05
- Task type: audit workflow
- Mode: direct baseline
- Workspace: MosaFramework

## Method

- Read existing audit output.
- Read benchmark matrix.
- Avoid new MOSA initialization.
- Produce direct comparison result.

## Result

Baseline is faster and cheaper for the audit request.
Baseline produces less traceability than MOSA.
Baseline does not maintain structured state.
Baseline depends on operator discipline.

## Observed Metrics

| Metric | Value |
|---|---:|
| Startup tokens | ~0 |
| Tool calls | 3 |
| File reads | 2 |
| File writes | 1 |
| Failed calls | 0 |
| Repeated calls | 0 |
| Clarifying questions | 0 |
| Rework cycles | 0 |
| Final artifacts | 1 |

## Effectiveness Score

| Criterion | Score |
|---|---:|
| Requirement coverage | 4 |
| Output correctness | 4 |
| Audit traceability | 3 |
| Context retention | 2 |
| Reproducibility | 3 |
| Maintainability | 3 |
| User readiness | 4 |
| Total score | 23 |

## Verdict

- Cost: Baseline wins.
- Speed: Baseline wins.
- Traceability: MOSA wins.
- Audit depth: MOSA wins.
- Overall T05: MOSA wins narrowly.
