[Pipeline Trace]: Orchestrator > Router > [Sub-Agent Name]

# Task

## Atomic Keywords
- [project domain]
- [primary platform]
- [main workflow]
- [data source]
- [risk or constraint]

## Intent Profile
```json
{
  "intent_summary": "Describe the project goal in one sentence.",
  "atomic_keywords": ["project domain", "primary platform"],
  "project_mode": "generic",
  "preferred_domain": "workflow",
  "required_capability": "Describe the capability needed.",
  "exclusions": []
}
```

## Project Defaults
- Use MOSA startup read order.
- Read graph before broad scanning.
- Use routing cache and `active_skill_index.json`.
- Use `mode_profiles.json` for project-mode routing.
- Use `mosa_cli.js dag` before changing skill relationships.
- Use `mosa_cli.js maintain` for read-only framework health checks.
- Keep large artifacts in `02_Output/`.

## Acceptance Criteria
- Workspace bootstrap exists.
- Graph report exists.
- Router candidates are confidence-scored.
- DAG checks pass when skill relationships change.
- Durable decisions are written to `prompt_stack.md`.
