# MOSA Skill Promotion Pipeline

Date: 2026-06-01

## Trigger

- `auto-skill` completes Promotion Scorecard.
- Score is 3 or higher.
- User agrees to create a new skill.

## Pipeline

| Step | Owner | Action | Output |
|---|---|---|---|
| 1 | auto-skill | Score reusable solution | Skill Promotion Candidate |
| 2 | Orchestrator | Read candidate pointer | Promotion intake |
| 3 | Registry Distiller | Preflight duplicate/collision scan | Distiller proposal |
| 4 | skill-creator | Create skill scaffold | New skill paths |
| 5 | Registry Distiller | Post-create validation | Registry proposal |
| 6 | User | Approve registry mutation | Confirmation |
| 7 | mosa-harmonizer | Registry check | Router-ready validation |
| 8 | Orchestrator | Closeout and archive | task_results pointers |

## Control Gates

- Distiller is read-only by default.
- Registry mutation needs user approval.
- Skill creation uses candidate fields.
- Open-ended brainstorming is skipped when candidate fields exist.
- Backlog captures unapproved candidates.

## Required Pointers

```text
[Skill Promotion Pipeline]
- candidate_skill_id:
- preflight_distiller_report:
- skill_creator_output:
- post_create_distiller_report:
- registry_proposal:
- user_confirmation:
- harmonizer_registry_check:
- backlog_path:
- status:
```

## Failure Handling

- Duplicate skill found: stop and propose merge.
- Tag collision found: route to Harmonizer.
- Registry proposal unapproved: write backlog.
- Router cannot find new skill: rerun Distiller.
