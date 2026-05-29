[Pipeline Trace]: Orchestrator > Router > Google-Agent

# Google Apps Script Project

## Atomic Keywords
- Google Apps Script
- Google Sheets
- Web App
- client-side cache
- quota-safe batching
- audit logging

## Intent Profile
```json
{
  "intent_summary": "Build a Google Apps Script Web App backed by Google Sheets.",
  "atomic_keywords": ["Google Apps Script", "Google Sheets", "Web App"],
  "project_mode": "gas",
  "preferred_domain": "workflow",
  "required_capability": "GAS web app architecture, sheet schema, client cache, quota-safe execution",
  "exclusions": ["external backend unless explicitly required"]
}
```

## Default Skill Route
- `gas-webapp-architect`
- `google-agent`
- `utar-ops`
- `audit-agent` when permissions or compliance matter

## Project Defaults
- Google Sheets is the source of truth.
- Use `google.script.run` for client/server calls.
- Cache repeated lookups on the client.
- Batch writes and email sends.
- Add audit logs for state changes.
- Design for mobile and scanner workflows when relevant.

## Acceptance Criteria
- Sheet schema is defined.
- Web App routes are defined.
- Quota-heavy actions are batched.
- Deployment and version notes are recorded.
