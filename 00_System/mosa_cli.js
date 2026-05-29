#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'app', 'build', 'builder', 'for', 'in', 'of', 'on',
  'project', 'skill', 'system', 'the', 'to', 'tool', 'web', 'with'
]);

function findWorkspaceRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;
  while (current !== root) {
    if (fs.existsSync(path.join(current, '00_System'))) return current;
    current = path.dirname(current);
  }
  return process.cwd();
}

function rel(root, file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function readText(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  } catch (_) {
    return fallback;
  }
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(readText(filePath));
  } catch (_) {
    return fallback;
  }
}

function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  const temp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  fs.renameSync(temp, filePath);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) args[key] = true;
      else args[key] = argv[++i];
    } else {
      args._.push(arg);
    }
  }
  return args;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

function requiredFiles(root) {
  return [
    'AGENTS.md',
    'graphify-out/GRAPH_REPORT.md',
    '00_System/state.json',
    '00_System/prompt_stack.md',
    '00_System/routing_cache.json',
    '00_System/mosa_startup.js',
    '01_Work/task.md',
    '01_Work/session_state.json',
    '01_Work/context_bus.json',
    '02_Output/startup_manifest.json',
    '02_Output/routing_index_light.json',
    '02_Output/mode_profiles.json',
    '02_Output/reference_map_light.json'
  ].map(file => path.join(root, file));
}

function validate(root) {
  const issues = [];
  const warnings = [];
  for (const file of requiredFiles(root)) {
    if (!fs.existsSync(file)) issues.push(`missing: ${rel(root, file)}`);
  }

  for (const file of [
    '00_System/state.json',
    '00_System/routing_cache.json',
    '01_Work/session_state.json',
    '01_Work/context_bus.json',
    '02_Output/startup_manifest.json',
    '02_Output/routing_index_light.json',
    '02_Output/mode_profiles.json',
    '02_Output/reference_map_light.json'
  ]) {
    const full = path.join(root, file);
    if (fs.existsSync(full) && readJson(full) === null) issues.push(`invalid json: ${file}`);
  }

  const state = readJson(path.join(root, '00_System/state.json'), {});
  if (typeof state.turn_count !== 'number') warnings.push('state.json missing numeric turn_count');
  if (typeof state.drift_threshold !== 'number') warnings.push('state.json missing numeric drift_threshold');

  const bus = readJson(path.join(root, '01_Work/context_bus.json'), {});
  if (bus?._meta?.max_tokens && bus._meta.max_tokens > 3000) {
    warnings.push('context_bus max_tokens is high for solo workflow');
  }

  const report = path.join(root, '02_Output/registry_distiller_report.json');
  if (fs.existsSync(report)) warnings.push('cold report exists; keep it out of normal startup');

  return {
    status: issues.length ? 'fail' : 'ok',
    issues,
    warnings,
    checked_files: requiredFiles(root).length
  };
}

function fallbackPacket(root, intent, reason) {
  const files = requiredFiles(root)
    .filter(file => fs.existsSync(file))
    .map(file => rel(root, file));
  return {
    status: 'fallback',
    reason,
    mode: 'micro',
    intent,
    message: 'Safe startup used. Read AGENTS.md, GRAPH_REPORT.md, and the nearest relevant task file only.',
    available_files: files
  };
}

function safeStart(root, args) {
  const health = validate(root);
  if (health.issues.length) {
    return { ...fallbackPacket(root, args.intent || '', 'workspace validation failed'), health };
  }

  const script = path.join(root, '00_System/mosa_startup.js');
  const childArgs = [script, '--mode', args.mode || 'ask'];
  if (args.intent) childArgs.push('--intent', args.intent);
  const result = spawnSync(process.execPath, childArgs, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    return { ...fallbackPacket(root, args.intent || '', 'startup script failed'), stderr: result.stderr, health };
  }
  try {
    const packet = JSON.parse(result.stdout);
    return { ...packet, preflight: health };
  } catch (_) {
    return { ...fallbackPacket(root, args.intent || '', 'startup output was not json'), raw: result.stdout, health };
  }
}

function detectMode(intent, modeProfiles) {
  const text = String(intent || '').toLowerCase();
  const words = new Set(tokenize(text));
  let best = { name: 'generic', score: 0 };
  for (const [name, profile] of Object.entries(modeProfiles.profiles || {})) {
    const score = (profile.triggers || []).reduce((sum, trigger) => {
      const value = String(trigger).toLowerCase();
      const hit = value.includes(' ')
        ? text.includes(value)
        : words.has(value);
      return hit ? sum + 1 : sum;
    }, 0);
    if (score > best.score) best = { name, score };
  }
  return best;
}

function route(root, intent, options = {}) {
  const routingPath = path.join(root, '02_Output/routing_index_light.json');
  const modePath = path.join(root, '02_Output/mode_profiles.json');
  const refPath = path.join(root, '02_Output/reference_map_light.json');
  const routing = readJson(routingPath, {});
  const modes = readJson(modePath, {});
  const refs = readJson(refPath, { references: {} }).references || {};
  const words = new Set(tokenize(intent));
  const detectedMode = detectMode(intent, modes);
  const modeBoosts = modes.profiles?.[detectedMode.name]?.boosts || {};

  const candidates = (routing.skills || []).map(skill => {
    const haystack = [
      skill.skill_id,
      skill.category,
      ...(skill.tags || [])
    ].join(' ');
    const skillWords = new Set(tokenize(haystack));
    const matched = [...words].filter(word => skillWords.has(word));
    const tagScore = matched.length * 10;
    const exactScore = String(intent).toUpperCase().includes(skill.skill_id) ? 50 : 0;
    const boost = modeBoosts[skill.skill_id] || 0;
    const score = tagScore + exactScore + boost;
    return {
      skill_id: refs[skill.skill_id] || skill.skill_id,
      original_skill_id: skill.skill_id,
      score,
      reasons: [
        matched.length ? `matched: ${matched.join(', ')}` : null,
        boost ? `mode boost(${detectedMode.name}): ${boost}` : null,
        exactScore ? 'exact skill id match' : null,
        refs[skill.skill_id] ? `reference -> ${refs[skill.skill_id]}` : null
      ].filter(Boolean)
    };
  })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const deduped = [];
  const seen = new Set();
  for (const item of candidates) {
    if (!seen.has(item.skill_id)) {
      seen.add(item.skill_id);
      deduped.push(item);
    }
  }

  const top = deduped.slice(0, Number(options.top || 3));
  const maxScore = top[0]?.score || 0;
  const confidence = maxScore >= 60 ? 'high' : maxScore >= 25 ? 'medium' : maxScore > 0 ? 'low' : 'none';
  const output = {
    intent,
    detected_mode: detectedMode,
    confidence,
    top,
    fallback: confidence === 'none' || confidence === 'low'
      ? 'Use maintenance mode or rebuild routing_index_light.json.'
      : null
  };

  if (options.write) {
    const lines = [
      '# Last Route Decision',
      '',
      `- Intent: ${intent}`,
      `- Detected mode: ${detectedMode.name} (${detectedMode.score})`,
      `- Confidence: ${confidence}`,
      '',
      '## Top Candidates',
      ...top.map((item, index) => `${index + 1}. ${item.skill_id} - ${item.score} - ${item.reasons.join('; ')}`)
    ];
    fs.writeFileSync(path.join(root, '02_Output/last_route_decision.md'), `${lines.join('\n')}\n`);
  }
  return output;
}

function runTests(root) {
  const cases = [
    ['google apps script web app sheet cache quota', 'GAS_WEBAPP_ARCHITECT'],
    ['mosa graph token shield project startup', 'MOSA_GRAPH_BUILDER'],
    ['build an mcp server tool integration', 'MCP_BUILDER'],
    ['frontend ux component layout', 'UI_SUITE']
  ];
  const results = cases.map(([intent, expected]) => {
    const result = route(root, intent);
    return {
      intent,
      expected,
      actual: result.top[0]?.skill_id || null,
      pass: result.top[0]?.skill_id === expected,
      confidence: result.confidence
    };
  });
  return {
    status: results.every(item => item.pass) ? 'ok' : 'fail',
    results
  };
}

function updateContext(root, args) {
  const file = path.join(root, '01_Work/context_bus.json');
  const bus = readJson(file, {
    _meta: { version: '1.1', lifecycle: 'ephemeral', max_tokens: 2000 },
    shared_facts: {},
    agent_outputs: {},
    handoff: { next_agent: null, needed_inputs: [] }
  });
  if (args.fact && args.value) bus.shared_facts[args.fact] = args.value;
  if (args.next_agent) bus.handoff.next_agent = args.next_agent;
  bus._meta.updated_at = new Date().toISOString();
  writeJsonAtomic(file, bus);
  return { status: 'ok', updated: '01_Work/context_bus.json' };
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'help';
  const root = findWorkspaceRoot();

  if (command === 'check') print(validate(root));
  else if (command === 'start') print(safeStart(root, args));
  else if (command === 'route') print(route(root, args.intent || args._.slice(1).join(' '), { write: args.write, top: args.top }));
  else if (command === 'test') print(runTests(root));
  else if (command === 'context') print(updateContext(root, args));
  else {
    print({
      usage: [
        'node 00_System/mosa_cli.js check',
        'node 00_System/mosa_cli.js start --mode ask --intent "..."',
        'node 00_System/mosa_cli.js route --intent "..." --write',
        'node 00_System/mosa_cli.js test',
        'node 00_System/mosa_cli.js context --fact key --value value'
      ]
    });
  }
}

main();
