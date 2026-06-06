---
skill_id: SKILL_CREATOR
name: skill-creator
description: Create or improve Codex skills from approved MOSA Auto-Skill promotion candidates while preserving progressive disclosure and registry safety.
category: meta
risk: safe
source: mosa
tags: [codex, skill-creation, auto-skill, progressive-disclosure]
---

# Skill Creator

Skill Creator turns an approved reusable workflow into a concise Codex skill. It is not a brainstorming engine for every task and it must not auto-create skills without user approval.

## When To Use

Use this skill when:

- The user explicitly asks to create or improve a skill.
- MOSA `auto-skill` emits a promotion candidate and the user approves creation.
- A repeated missing capability should become a reusable skill.
- An existing skill should be enhanced with a compact reference, script, or checklist.

Do not use this skill for normal execution, routing, registry mutation, or speculative skill growth.

## MOSA Promotion Intake

When invoked from Auto-Skill, read the candidate pointer from `01_Work/task_results.md` or `01_Work/promotion_result.json`.

Expected candidate fields:

```text
[Skill Promotion Candidate]
- source_task:
- score:
- matched_items:
- decision:
- candidate_skill_id:
- proposed_path:
- reusable_assets:
- registry_check_required: true
```

If these fields are present, skip open-ended brainstorming and move directly to scoping.

## Creation Rules

1. Convert `candidate_skill_id` to a kebab-case folder name.
2. Prefer improving an existing adjacent skill when ownership is clear.
3. Create only the files that are needed:
   - `SKILL.md` for the concise entrypoint.
   - `references/` for long guidance.
   - `scripts/` for executable helpers.
   - `assets/` only for reusable static assets.
4. Keep `SKILL.md` compact and progressively disclosed.
5. Do not copy large task artifacts into the skill.
6. Do not store secrets, credentials, private raw data, or full source files.
7. Do not update `skills_registry.json` directly unless the user explicitly approved registry mutation.

## Codex Skill Shape

Minimum `SKILL.md` frontmatter:

```yaml
---
name: example-skill
description: Use when...
skill_id: EXAMPLE_SKILL
category: Core
---
```

Recommended body:

```text
# Skill Name

One paragraph purpose.

## When To Use

- Specific task condition.
- Specific user wording or workflow condition.

## Workflow

1. Read only the needed context.
2. Run or edit the smallest relevant artifact.
3. Return compact pointers and verification.

## Token Shield

- Read indexes before detail files.
- Load references only when needed.

## Prohibitions

- Clear boundaries.
```

## Validation Checklist

- Metadata is valid YAML.
- `name` matches the folder name.
- `skill_id` is uppercase snake case.
- `description` states when to use the skill.
- Skill body is concise and does not duplicate large references.
- Relative paths resolve from the skill folder.
- Registry validation is delegated to Registry Distiller or MOSA Harmonizer.

## Handoff Output

Return compact pointers:

```text
[Status: created | improved | skipped]
[Data:
- skill_path:
- references:
- scripts:
- registry_check_required:
]
[Next_Step: mosa-harmonizer | registry-distiller | none]
```
