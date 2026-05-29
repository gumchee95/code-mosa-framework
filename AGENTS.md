# MOSA Token Shield

When querying architecture, relationships, or tracing logic:

1. Prefer `node 00_System/mosa_startup.js --mode ask --intent "<intent>"`.
2. Read `graphify-out/GRAPH_REPORT.md` when the packet asks for graph context.
3. Use God Nodes as the search boundary.
4. Prefer `00_System`, `01_Work`, and `02_Output` pointer files.
5. Do not start with broad full-text scans when graph context exists.
6. Use `02_Output/startup_manifest.json` for startup pointers.
7. Use `02_Output/routing_index_light.json` before full skill indexes.
8. Never read `02_Output/registry_distiller_report.json` during normal startup.
9. Use `01_Work/context_bus.json` only for current-task cross-agent handoff.

When starting a new project:

1. Follow `00_System/MOSA_PROJECT_STARTUP_PROTOCOL.md`.
2. Create the required MOSA workspace files first.
3. Generate `01_Work/task.md` from `02_Output/task_template.md`.
4. For Google Apps Script projects, use `02_Output/gas_task_template.md`.
5. Use `01_Work/context_bus.json` for shared working facts.
6. Record durable project decisions in `00_System/prompt_stack.md`.
