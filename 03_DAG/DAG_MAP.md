# MOSA Dynamic Capability DAG Map

DAG is not a fixed event or website template. It is a dynamic capability graph used by Orchestrator and Router.

## Where The DAG Function Lives

```text
C:/Users/USER/.codex/mosa/
├─ 00_System/
│  ├─ mosa_cli.js                     # DAG planner lives here: `plan`
│  ├─ mosa_route.js                   # consumes workflow_plan router_hints
│  ├─ mosa_startup.js                 # points to workflow_plan.json, but does not plan
│  └─ MOSA_PROJECT_STARTUP_PROTOCOL.md# compact startup and DAG command contract
├─ 01_Work/
│  ├─ context_bus.json                # hot handoff; points to workflow_plan path
│  ├─ workflow_plan.json              # generated DAG output, runtime artifact
│  └─ workflow_plan.md                # generated human summary, runtime artifact
├─ 02_Output/
│  ├─ routing_index_light.json        # warm skill index used by planner/router
│  ├─ active_skill_index.json         # fallback skill index
│  └─ startup_manifest.json           # lists workflow_plan budget and pointer
├─ 03_DAG/
│  ├─ DAG_MAP.md                      # this file
│  ├─ workflow_plan.schema.json       # simplified DAG schema
│  └─ ROUTING_FLOW.md                 # how DAG feeds Router
└─ skills/
   ├─ orchestrator-agent/SKILL.md     # owns when to generate DAG
   ├─ router-agent/SKILL.md           # consumes hints, does not plan
   ├─ mosa-harmonizer/SKILL.md        # checks DAG alignment
   └─ mosa-graph-builder/SKILL.md     # graph pointer only
```

## Command

Generate DAG:

```bash
node 00_System/mosa_cli.js plan --intent "<task intent>" --write
```

Route with DAG:

```bash
node 00_System/mosa_cli.js route --intent "<task intent>" --workflow-plan 01_Work/workflow_plan.json
```

## Ownership

| Layer | File | Responsibility |
| --- | --- | --- |
| Orchestrator | `skills/orchestrator-agent/SKILL.md` | Decides whether the task needs a DAG |
| Planner | `00_System/mosa_cli.js` | Builds `workflow_plan.json` |
| Router | `00_System/mosa_route.js` | Reads `router_hints` and returns `dag_routes` |
| Router skill | `skills/router-agent/SKILL.md` | Documents selector-only behavior |
| Harmonizer | `skills/mosa-harmonizer/SKILL.md` | Validates schema and drift |
| Graph Builder | `skills/mosa-graph-builder/SKILL.md` | Points to DAG, does not own it |

## Runtime Outputs

Generated only when needed:

- `01_Work/workflow_plan.json`
- `01_Work/workflow_plan.md`
- `01_Work/routing_result.json` with `dag_routes`

Lean mode must not write these files.
