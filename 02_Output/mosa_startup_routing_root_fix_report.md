# MOSA Startup/Routing Evidence Chain Root Fix Report

Date: 2026-06-01

## Problem

`Ipoh_Travel` showed a broken MOSA startup/routing evidence chain.
The project had MOSA files, but the original startup did not leave tool-generated proof.

## Root Cause

The framework had Node startup tools in `MosaFramework`, but new or repaired workspaces did not have a mandatory provision step.

This caused three failure modes:

- `00_System/mosa_startup.js` was missing.
- `00_System/mosa_route.js` was missing.
- `01_Work/routing_result.json` could be reconstructed after the fact and mistaken for real Router proof.

## Root-Level Fix

Implemented a workspace provisioner:

```text
00_System/mosa_provision_workspace.js
```

It:

- Creates MOSA workspace folders.
- Ensures state and task files.
- Copies Node startup tools.
- Optionally runs startup.
- Optionally runs routing.
- Writes `01_Work/provision_result.json`.

## Installed Tool Chain

| Tool | Purpose |
|---|---|
| `mosa_startup.js` | Generate startup proof |
| `mosa_route.js` | Generate routing proof |
| `mosa_promotion.js` | Generate promotion score |
| `mosa_registry_check.js` | Generate read-only registry gate |
| `mosa_provision_workspace.js` | Install and run the above in target workspaces |

## Protocol Fix

Updated MOSA skills:

- `orchestrator-agent`
- `mosa-graph-builder`

New rule:

- If startup tools are missing, run provision first.
- If `routing_result.json.status == "reconstructed"`, it is not valid Router proof.
- A valid workspace must produce tool-generated startup/routing artifacts.

## Validation

Root workspace self-provision:

```text
C:\Users\USER\Documents\MosaFramework
```

Result:

| Check | Result |
|---|---|
| `provision_result.json` | generated |
| Startup result | generated |
| Routing result | generated |
| Top skill | `MOSA_GRAPH_BUILDER` |
| Router candidate | `ROUTER_AGENT` |
| Fallback | null |

Clean workspace test:

```text
C:\tmp\MosaProvisionTest
```

Command:

```bash
node 00_System/mosa_provision_workspace.js --target "C:\tmp\MosaProvisionTest" --run --domain design --capability "HTML CSS JavaScript static frontend" --keywords "frontend,html,css,javascript" --intent "Build static frontend website"
```

Result:

| Check | Result |
|---|---|
| Provision script syntax | Pass |
| Startup tool copied | Pass |
| Route tool copied | Pass |
| Promotion tool copied | Pass |
| Registry check tool copied | Pass |
| Startup result generated | Pass |
| Routing result generated | Pass |
| Top skill | `FRONTEND_DESIGN` |
| Confidence | 0.99 |

## Ipoh_Travel Repair

Applied the same tool chain to:

```text
C:\Users\USER\Desktop\Ipoh_Travel
```

Current proof:

- `graph_available`: true
- `top_skill`: `FRONTEND_DESIGN`
- `confidence`: 0.99
- `fallback`: null

## New Standard

Every new or repaired MOSA workspace should begin with:

```bash
node <MosaFramework>/00_System/mosa_provision_workspace.js --target "<workspace>" --run --intent "<task intent>"
```

For precise routing:

```bash
node <workspace>/00_System/mosa_route.js --domain "<domain>" --capability "<capability>" --keywords "<comma keywords>" --intent "<task intent>"
```

## Verdict

The root cause is fixed at the framework level.
Future workspaces now have a standard provision path that prevents missing startup/routing evidence.
