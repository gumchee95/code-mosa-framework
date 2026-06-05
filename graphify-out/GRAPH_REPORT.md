# MOSA Light Graph Report

## God Nodes

- `00_System/`: Node runtime tools for startup, routing, hooks, provision, promotion, and CLI checks.
- `01_Work/`: hot evidence and handoff files.
- `02_Output/`: warm indexes and cold diagnostics.
- `skills/`: public MOSA core skills.
- `graphify-out/GRAPH_REPORT.md`: first-read architecture pointer.

## Mermaid Topology

```mermaid
graph LR
  U["User intent"] --> M["lean / standard / cold-repair"]
  M -->|"lean"| L["direct answer or tiny edit"]
  M -->|"standard"| S["mosa_cli.js start --write"]
  M -->|"cold-repair"| P["mosa_provision_workspace.js --run"]
  P --> S
  S --> SR["01_Work/startup_result.json"]
  S --> CB["01_Work/context_bus.json"]
  CB --> GC["context_bus._meta.graph_context"]
  GC --> GR["graphify-out/GRAPH_REPORT.md"]
  CB --> O["orchestrator-agent"]
  O --> DAG["optional workflow_plan.json"]
  DAG --> R["mosa_route.js"]
  O --> R
  R --> RI["routing_index_light.json"]
  R --> RR["01_Work/routing_result.json"]
  RR --> SEL["single_route or dag_routes"]
  SEL --> SK["selected SKILL.md after proof"]
  SK --> OUT["task_results.md"]
```

## Token Shield Rule

- Read this graph before broad architecture exploration.
- Read `01_Work/startup_result.json` and `01_Work/context_bus.json` before larger artifacts.
- Use `02_Output/routing_index_light.json` before full registry diagnostics.
- Treat `02_Output/registry_distiller_report.json` as cold diagnostics.
- Load full `SKILL.md` only after Router proof selects execution context.

## Current Efficiency Notes

- Startup proof: `01_Work/startup_result.json`
- Handoff and graph context: `01_Work/context_bus.json`
- DAG routing aid: `01_Work/workflow_plan.json`
- Router proof: `01_Work/routing_result.json`
- Warm routing index: `02_Output/routing_index_light.json`
- Cold diagnostics: `02_Output/registry_distiller_report.json`

## Startup Pointers

- CLI: `00_System/mosa_cli.js`
- Startup: `00_System/mosa_startup.js`
- Router: `00_System/mosa_route.js`
- Provision: `00_System/mosa_provision_workspace.js`
- Hook checks: `00_System/mosa_hooks.js`
