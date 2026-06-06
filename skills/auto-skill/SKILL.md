---
name: auto-skill
description: Use when MOSA needs lightweight reusable experience memory, promotion scoring, knowledge-base lookup, or cross-skill learning after task completion.
skill_id: AUTO_SKILL
category: Core
---

# Auto-Skill

Auto-Skill is MOSA's lightweight learning layer. It helps decide whether a completed task produced reusable knowledge, whether an existing skill should be improved, or whether a new skill should be suggested to the user.

## When To Use

Use this skill when:

- A task is complete and the result may be reusable later.
- A MOSA skill was used and there may be useful experience to record.
- The user asks about auto-skills, reusable memory, promotion scoring, or skill growth.
- MOSA detects a repeated missing capability from workflow planning or routing.

Do not use this skill as mandatory full-context startup material for every turn. In standard mode, keep Auto-Skill to compact key notes unless the user asks for learning, memory, or skill promotion.

In MOSA `standard` mode, Auto-Skill may provide compact key notes after Orchestrator clarification and before DAG routing when prior experience, reusable user preferences, or repeated missing capabilities are relevant. These notes feed Orchestrator and DAG hints; they do not replace Router and they are not hard trigger rules.

## Token Shield Rules

- Read indexes before detail files.
- Read `experience/_index.json` only when a specific execution skill was used.
- Read `knowledge-base/_index.json` only when the user asks for reusable knowledge or the current task clearly benefits from prior preference/context.
- Do not load every experience or knowledge file.
- Store pointers and concise summaries only.
- Use `01_Work/context_bus.json` for temporary handoff context.

## Experience Lookup

When another skill was used in the current task:

1. Normalize the skill id, for example `mosa-graph-builder` or `router-agent`.
2. Open `experience/_index.json`.
3. If the skill has a matching entry, read only that one experience file.
4. If no entry exists, note the missing experience internally and consider asking at the end whether the user wants it recorded.

Use experience files to capture repeatable gotchas, parameters, file paths, and successful workflows. Do not store one-off facts with no reuse value.

## Knowledge Lookup

Use `knowledge-base/_index.json` when the task depends on reusable user preferences, domain playbooks, or previous process decisions.

Read only matching categories. If nothing matches, continue without forcing a knowledge read.

## Standard Flow Handoff

Auto-Skill can contribute to standard MOSA flow in two compact places:

1. Before DAG routing, return key notes only:

```text
[Auto-Skill Key Notes]
- reusable_preference:
- relevant_experience_pointer:
- missing_capability_history:
- suggested_existing_skill_to_enhance:
```

2. After task completion, run the promotion scorecard.

Do not turn key notes into mandatory route triggers. Orchestrator owns the clarified task shape, and Router consumes the final DAG hints.

## Promotion Scorecard

At the end of a completed substantial task, score whether the result should become a reusable skill:

```text
[Skill Promotion Check]
- score: 0-7
- matched_items: []
- decision: no_action | record_experience | propose_new_skill | invoke_skill_creator
- candidate_skill_id: optional
- registry_check_required: true | false
```

Score one point for each true item:

- The workflow can be reused across projects.
- The workflow has more than three clear steps.
- It integrates tools, APIs, file formats, or external services.
- It produced a reusable template, checklist, prompt, script, or output format.
- Reuse would save meaningful tokens, time, or debugging cost.
- Similar requests have appeared before or are expected to recur.
- It can be packaged with `scripts/`, `references/`, `assets/`, or tests.

Decision rules:

- `0-1`: no action.
- `2`: optionally record experience.
- `3-4`: suggest improving an existing skill if one is close.
- `5+`: suggest creating a new skill, but do not create it without user approval.

If `00_System/mosa_promotion.js` exists, prefer it for scoring:

```bash
node 00_System/mosa_promotion.js --summary "<task summary>"
```

Expected output:

- `01_Work/promotion_result.json`

## Recording Rules

Only record after user approval unless the user has explicitly asked to update memory.

Record cross-skill experience in:

- `experience/skill-<skill-id>.md`
- `experience/_index.json`

Record general reusable knowledge in:

- `knowledge-base/<category>.md`
- `knowledge-base/_index.json`

Prefer improving an existing skill over creating a new one when the missing capability is adjacent to current skill ownership.

## Anti-Patterns

- Do not force Auto-Skill into every task.
- Do not copy large artifacts into memory.
- Do not store credentials, secrets, private raw data, or full source files.
- Do not auto-create skills.
- Do not use legacy Gemini paths as authority for Codex skills.
- Do not treat `auto skills- Copy.md` or any copied Markdown file as a skill entrypoint.

## Handoff Output

When Auto-Skill produces an outcome, keep it compact:

```text
[Status: recorded | skipped | suggested]
[Data:
- experience_pointer: experience/skill-<skill-id>.md
- knowledge_pointer: knowledge-base/<category>.md
- promotion_result: 01_Work/promotion_result.json
]
[Next_Step: none | ask_user_to_approve_skill_creation]
```

