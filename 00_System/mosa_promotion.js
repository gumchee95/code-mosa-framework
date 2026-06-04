#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const START = '<!-- MOSA_PROMOTION_SNAPSHOT_START -->';
const END = '<!-- MOSA_PROMOTION_SNAPSHOT_END -->';

function parseArgs(argv) {
  const args = { summary: '' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--summary') args.summary = argv[++i] || '';
    else if (!args.summary) args.summary = argv[i];
  }
  return args;
}

function findWorkspaceRoot(startDir) {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;
  while (current !== root) {
    if (fs.existsSync(path.join(current, '00_System'))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(startDir);
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function slugify(value) {
  const ascii = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || 'mosa-promoted-skill';
}

function hasAny(text, terms) {
  const lower = text.toLowerCase();
  return terms.some(term => lower.includes(term));
}

function score(summary, context, taskText, resultText) {
  const evidence = `${summary}\n${context.intent || ''}\n${taskText}\n${resultText}`;
  const items = [
    {
      id: 'cross_project_reuse',
      label: 'Reusable across projects',
      hit: hasAny(evidence, ['framework', 'workflow', 'pipeline', '通用', '跨项目', '跨專案', '复用', '重用'])
    },
    {
      id: 'three_plus_steps',
      label: 'Workflow has more than 3 steps',
      hit: (evidence.match(/-\s|\d+\./g) || []).length >= 3 || hasAny(evidence, ['phase 1', 'phase 2', 'phase 3'])
    },
    {
      id: 'tool_integration',
      label: 'Uses tools, APIs, files, or services',
      hit: hasAny(evidence, ['node', 'script', 'registry', 'router', 'json', 'tool', 'api', 'file', 'distiller'])
    },
    {
      id: 'reusable_template',
      label: 'Creates reusable template or output format',
      hit: hasAny(evidence, ['template', 'scorecard', 'checklist', 'sop', 'format', 'matrix', '模板'])
    },
    {
      id: 'saves_cost',
      label: 'Saves token, time, or debugging cost',
      hit: hasAny(evidence, ['token', 'cost', '耗费', '花费', '节省', 'reduce', 'simplify', 'light', 'compact'])
    },
    {
      id: 'repeated_need',
      label: 'Likely repeated need',
      hit: hasAny(evidence, ['startup', '启动', '每次', 'always', 'repeat', 'recurring', 'framework'])
    },
    {
      id: 'packageable_assets',
      label: 'Can package scripts, references, or assets',
      hit: hasAny(evidence, ['scripts', 'references', 'assets', 'mosa_startup.js', 'mosa_route.js', 'mosa_promotion.js'])
    }
  ];
  const matched = items.filter(item => item.hit);
  return { items, matched, value: matched.length };
}

function replaceBlock(content, block) {
  const wrapped = `${START}\n${block}\n${END}`;
  const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (pattern.test(content)) return content.replace(pattern, wrapped);
  return `${content.trimEnd()}\n\n${wrapped}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = findWorkspaceRoot(process.cwd());
  const workDir = path.join(root, '01_Work');
  const context = readJson(path.join(workDir, 'context_bus.json'), {});
  const taskText = readText(path.join(workDir, 'task.md'));
  const resultPath = path.join(workDir, 'task_results.md');
  const resultText = readText(resultPath);
  const summary = args.summary || context.intent || 'MOSA workflow optimization';
  const scorecard = score(summary, context, taskText, resultText);
  const decision = scorecard.value >= 3 ? 'propose_new_skill' : scorecard.value > 0 ? 'record_experience' : 'no_action';
  const baseName = /^mosa\b/i.test(summary) ? summary : `mosa ${summary}`;
  const candidateSkillId = decision === 'propose_new_skill'
    ? slugify(baseName).slice(0, 60)
    : null;

  const output = {
    status: 'ok',
    generated_at: new Date().toISOString(),
    score: scorecard.value,
    threshold: 3,
    decision,
    matched_items: scorecard.matched.map(item => item.id),
    candidate_skill_id: candidateSkillId,
    registry_check_required: decision === 'propose_new_skill',
    user_confirmation_required: decision === 'propose_new_skill',
    next_agent_action: decision === 'propose_new_skill'
      ? 'ask user whether to invoke skill-creator'
      : 'record as experience only if useful'
  };

  writeJson(path.join(workDir, 'promotion_result.json'), output);

  const block = [
    '[Skill Promotion Check]',
    `- score: ${output.score}`,
    `- matched_items: ${output.matched_items.join('; ') || 'none'}`,
    `- decision: ${output.decision}`,
    `- candidate_skill_id: ${output.candidate_skill_id || 'null'}`,
    `- registry_check_required: ${output.registry_check_required}`
  ].join('\n');
  fs.writeFileSync(resultPath, replaceBlock(resultText || '[Status: Success]\n', block), 'utf8');
  console.log(JSON.stringify(output, null, 2));
}

main();
