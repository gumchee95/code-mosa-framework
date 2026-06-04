# MOSA vs Baseline Agent Audit

Date: 2026-05-29

## Scope

- Compare MOSA-enabled startup.
- Compare baseline direct execution.
- Measure efficiency, tokens, effectiveness.
- Audit based on current workspace.

## Observed Workspace

- `00_System`: initialized.
- `01_Work`: initialized.
- `02_Output`: initialized.
- `GRAPH_REPORT.md`: unavailable.
- Token Shield: inactive.

## Token Cost Estimate

| Component | Characters | Rough Tokens |
|---|---:|---:|
| auto-skill | 9,694 | ~2,424 |
| orchestrator-agent | 3,648 | ~912 |
| audit-agent | 3,072 | ~768 |
| startup subtotal | 16,414 | ~4,104 |

Estimate rule: characters divided by four.

## Comparison

| Dimension | MOSA Enabled | Baseline Agent |
|---|---|---|
| Startup cost | Higher | Lower |
| First response speed | Slower | Faster |
| Task traceability | Strong | Weak |
| Skill routing | Structured | Ad hoc |
| Drift control | Stronger | Weaker |
| Token efficiency, small tasks | Worse | Better |
| Token efficiency, complex tasks | Better after setup | Risky |
| Audit readiness | Built in | Manual |
| Recovery after context loss | Better | Worse |
| Output consistency | Higher | Variable |

## Efficiency Findings

- Baseline wins tiny tasks.
- MOSA wins multi-step tasks.
- MOSA adds fixed startup overhead.
- Missing graph reduces MOSA advantage.
- Current startup cost is significant.
- Routing improves task discipline.
- Persistence improves resumability.

## Functional Findings

- MOSA enforces task planning.
- MOSA preserves process evidence.
- MOSA supports audit trails.
- MOSA reduces context drift.
- Baseline is more flexible.
- Baseline risks skipped validation.
- Baseline suits quick answers.

## Risks

- MOSA can over-process simple requests.
- Skill files have encoding noise.
- No graph limits Token Shield.
- Output rules may be too rigid.
- Initialization writes extra files.

## Verdict

- Simple request: baseline preferred.
- Complex workflow: MOSA preferred.
- Audit/compliance task: MOSA preferred.
- Token-sensitive chat: baseline preferred.
- Long-running project: MOSA preferred.

## Recommended Policy

- Use baseline for one-step tasks.
- Use MOSA for multi-step work.
- Use MOSA for audits.
- Use MOSA for file-changing workflows.
- Generate graph report soon.
- Add lightweight MOSA mode.

## Audit Status

[Status: Minor Patch]
[Data: MOSA is effective but startup-heavy]
[Next_Step: Add lightweight activation path]
