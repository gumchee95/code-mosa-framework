# MOSA Codex Hook Recommendations

Date: 2026-06-02

## Assumption

User said `hoot`; interpreted as Codex `hook`.

Current local Codex config does not expose a general `hooks` section. Available safe surfaces:

- `C:/Users/USER/.codex/AGENTS.md`
- `C:/Users/USER/.codex/rules/default.rules`
- workspace `00_System/mosa_*.js`
- repo-level Git hooks, if a Git repo is active
- Codex `notify` only for turn-ended notification

## Recommended MOSA Hook Types

| Priority | Hook Type | Trigger | Action | Safety |
|---:|---|---|---|---|
| P0 | Dangerous Command Guard | before command approval | block or require approval | safe |
| P0 | Startup Evidence Gate | task start | verify startup files | safe |
| P0 | Router Proof Gate | before skill execution | verify routing proof | safe |
| P1 | Registry Alignment Gate | after skill/registry edit | run Distiller read-only | safe |
| P1 | Encoding Guard | after active skill edit | detect mojibake/non-ASCII policy | safe |
| P1 | Legacy Path Guard | after protocol edit | detect executable `.gemini` paths | safe |
| P1 | Large Write Audit Gate | after >=5 file writes | require audit pointer | safe |
| P2 | Smoke Test Hook | after MOSA update | run startup+route+distiller test | safe |
| P2 | Skill Promotion Hook | task end | suggest skill creation only | safe |
| P3 | Git Pre-Push Gate | before push | check reports and tests | safe |

## Hooks To Avoid

Do not create hooks that automatically run:

- recursive delete
- `git reset --hard`
- forced checkout
- force push
- dependency install
- network download
- credential edits
- registry mutation
- cross-workspace file edits
- background scripts without user approval

## Minimal Hook Pack

Recommended starting set:

1. Dangerous Command Guard
2. Startup Evidence Gate
3. Router Proof Gate
4. Registry Alignment Gate
5. Encoding Guard
6. Smoke Test Hook

This gives the best safety-to-maintenance ratio.

## Suggested Implementation

### AGENTS Protocol Hook

Add a MOSA Safety Hook section to `AGENTS.md`:

```text
Before trusting MOSA execution:
- verify startup_result.json
- verify routing_result.json
- verify resolved_path uses .codex/skills
- reject reconstructed routing
- reject manual Router text as proof
```

### Command Rule Hook

Use `rules/default.rules` for allow/deny command policy.

Existing:

```text
prefix_rule(pattern=["git", "push"], decision="allow")
```

Recommended additions should be deny-first and approval-based.

### Workspace Smoke Test Hook

Use this after MOSA framework updates:

```powershell
node 00_System/mosa_startup.js --intent "MOSA smoke test"
node 00_System/mosa_route.js --domain workflow --capability "MOSA smoke test" --keywords "mosa,codex,skills,router" --intent "MOSA smoke test"
node "$HOME/.codex/skills/base-distiller/scripts/distill_logic.js"
```

### Test Result Gate

Trust update only when:

- startup status: `ok`
- router status: `success`
- routing is not `reconstructed`
- resolved path uses `.codex/skills`
- registry legacy paths: `0`
- missing files: `0`
- collisions: `0`
- orphans: `0`

## Recommendation

Start with check-only hooks. Do not create auto-fix hooks yet.

Best MOSA hook profile:

- guard dangerous commands
- verify startup evidence
- verify Router evidence
- verify registry alignment
- detect encoding damage
- run smoke test after framework edits

## Configured Hook Pack

Configured on 2026-06-02:

- `00_System/mosa_hooks.js`
- `C:/Users/USER/.codex/AGENTS.md`
- `C:/Users/USER/.codex/rules/default.rules`

P0:

- Dangerous Command Guard
- Startup Evidence Gate
- Router Proof Gate

P1:

- Registry Alignment Gate
- Encoding Guard
- Legacy executable path guard

P2:

- Startup smoke test
- Router smoke test
- Registry Distiller read-only
- P0/P1 assertions after smoke

Dangerous command deny rules added:

- `git reset --hard`
- `git push --force`
- `git push -f`
- `Remove-Item -Recurse`
- `rm -r`
- `rm -rf`

Latest verification:

- P0: pass 9/9
- P1: pass 4/4
- P2: pass 16/16
- Dangerous sample `git reset --hard`: blocked

