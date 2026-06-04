#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(WORKSPACE_ROOT, '02_Output');
const WORK_DIR = path.join(WORKSPACE_ROOT, '01_Work');
const CODEX_SKILLS = path.join(os.homedir(), '.codex', 'skills');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function exists(file) {
  return fs.existsSync(file);
}

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function normalizePath(p) {
  return String(p || '').replace(/\\/g, '/').toLowerCase();
}

function resolveSkillPath(filepath) {
  const rel = String(filepath || '')
    .replace(/\\/g, '/')
    .replace(/^~\/\.(codex\/skills|gemini\/antigravity\/skills)\//, '');
  return path.join(CODEX_SKILLS, rel);
}

function pass(name, details = {}) {
  return { name, ...details, status: 'pass' };
}

function fail(name, details = {}) {
  return { name, ...details, status: 'fail' };
}

function listRegistryFiles() {
  const registryDir = path.join(CODEX_SKILLS, 'registry');
  const files = [path.join(CODEX_SKILLS, 'skills_registry.json')];
  if (exists(registryDir)) {
    for (const name of fs.readdirSync(registryDir)) {
      if (name.endsWith('.json')) files.push(path.join(registryDir, name));
    }
  }
  return files;
}

function entriesFromRegistry(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.skills)) return value.skills;
  if (Array.isArray(value.entries)) return value.entries;
  return [];
}

function hasMojibake(text) {
  const suspicious = [
    'Ã', 'Â', '�', 'ðŸ', 'â€œ', 'â€', 'ã€', 'åœ', 'çš', 'è·', 'éœ', 'æœ'
  ];
  return suspicious.some((needle) => text.includes(needle));
}

function dangerousCommandCheck(commandText) {
  const text = String(commandText || '').toLowerCase();
  const patterns = [
    { name: 'recursive delete', re: /\b(rm|del|erase|remove-item|rd|rmdir)\b.*\b(-r|-recurse|\/s)\b/ },
    { name: 'git hard reset', re: /\bgit\s+reset\s+--hard\b/ },
    { name: 'git force push', re: /\bgit\s+push\b.*\b(--force|-f)\b/ },
    { name: 'credential edit', re: /\b(auth\.json|\.sandbox-secrets|credential|token|secret)\b/ },
    { name: 'filesystem root target', re: /\b(remove-item|rm|del|erase|rd|rmdir)\b.*\b(c:\\\\|c:\/|\/)\s*$/ },
    { name: 'cross workspace codex write', re: /\b(set-content|add-content|out-file|copy-item|move-item)\b.*\.codex/ }
  ];
  const hits = patterns.filter((p) => p.re.test(text)).map((p) => p.name);
  if (hits.length) return fail('dangerous command guard', { command: commandText, hits });
  return pass('dangerous command guard', { command: commandText || null });
}

function p0Checks() {
  const checks = [];
  const startupPath = path.join(WORK_DIR, 'startup_result.json');
  const routingPath = path.join(WORK_DIR, 'routing_result.json');

  checks.push(exists(path.join(WORKSPACE_ROOT, '00_System', 'mosa_startup.js'))
    ? pass('startup tool exists')
    : fail('startup tool exists'));
  checks.push(exists(path.join(WORKSPACE_ROOT, '00_System', 'mosa_route.js'))
    ? pass('router tool exists')
    : fail('router tool exists'));
  checks.push(exists(startupPath) ? pass('startup result exists') : fail('startup result exists'));
  checks.push(exists(routingPath) ? pass('routing result exists') : fail('routing result exists'));

  if (exists(startupPath)) {
    const startup = readJson(startupPath);
    checks.push(startup.status === 'ok'
      ? pass('startup status ok', { value: startup.status })
      : fail('startup status ok', { value: startup.status }));
    checks.push(normalizePath(startup.workspace_root) === normalizePath(WORKSPACE_ROOT)
      ? pass('startup workspace root')
      : fail('startup workspace root', { actual: startup.workspace_root, expected: WORKSPACE_ROOT }));
  }

  if (exists(routingPath)) {
    const routing = readJson(routingPath);
    const routeText = normalizePath(JSON.stringify(routing));
    checks.push(routing.status === 'success'
      ? pass('routing status success', { value: routing.status })
      : fail('routing status success', { value: routing.status }));
    checks.push(routing.status !== 'reconstructed'
      ? pass('routing not reconstructed')
      : fail('routing not reconstructed'));
    checks.push(routeText.includes('.codex') && routeText.includes('skills')
      ? pass('routing uses codex skills')
      : fail('routing uses codex skills'));
  }

  return checks;
}

function p1Checks() {
  const checks = [];
  let legacyPaths = 0;
  let codexPaths = 0;
  let missing = 0;
  let entries = 0;

  for (const file of listRegistryFiles()) {
    const registry = readJson(file);
    for (const entry of entriesFromRegistry(registry)) {
      if (!entry.filepath) continue;
      entries += 1;
      if (String(entry.filepath).includes('~/.gemini/antigravity/skills')) legacyPaths += 1;
      if (String(entry.filepath).includes('~/.codex/skills')) codexPaths += 1;
      if (!exists(resolveSkillPath(entry.filepath))) missing += 1;
    }
  }

  checks.push(legacyPaths === 0
    ? pass('registry legacy paths zero', { legacyPaths })
    : fail('registry legacy paths zero', { legacyPaths }));
  checks.push(missing === 0
    ? pass('registry missing files zero', { missing })
    : fail('registry missing files zero', { missing }));
  checks.push(codexPaths > 0
    ? pass('registry codex paths present', { codexPaths, entries })
    : fail('registry codex paths present', { codexPaths, entries }));

  const activeWorkflow = [
    'orchestrator-agent',
    'router-agent',
    'audit-agent',
    'coder-agent',
    'admin-agent',
    'design-agent',
    'market-agent',
    'google-agent',
    'microsoft-agent',
    'bootstrap-agent'
  ];
  const damaged = [];
  for (const skill of activeWorkflow) {
    const file = path.join(CODEX_SKILLS, skill, 'SKILL.md');
    if (!exists(file)) {
      damaged.push(`${skill}:missing`);
      continue;
    }
    const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    if (hasMojibake(text)) damaged.push(`${skill}:mojibake`);
  }
  checks.push(damaged.length === 0
    ? pass('core workflow encoding clean')
    : fail('core workflow encoding clean', { damaged }));

  return checks;
}

function runNode(script, args) {
  const result = cp.spawnSync(process.execPath, [script, ...args], {
    cwd: WORKSPACE_ROOT,
    encoding: 'utf8'
  });
  return {
    command: `node ${path.relative(WORKSPACE_ROOT, script)} ${args.join(' ')}`.trim(),
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

function p2Checks() {
  const runs = [];
  runs.push(runNode(path.join(WORKSPACE_ROOT, '00_System', 'mosa_startup.js'), [
    '--intent',
    'MOSA P2 smoke test'
  ]));
  runs.push(runNode(path.join(WORKSPACE_ROOT, '00_System', 'mosa_route.js'), [
    '--domain',
    'workflow',
    '--capability',
    'MOSA P2 smoke test',
    '--keywords',
    'mosa,codex,skills,router,registry,hook',
    '--intent',
    'MOSA P2 smoke test'
  ]));
  runs.push(runNode(path.join(CODEX_SKILLS, 'base-distiller', 'scripts', 'distill_logic.js'), []));

  const checks = runs.map((run) => run.status === 0
    ? pass(`smoke command: ${run.command}`, { stdout: run.stdout.slice(0, 500) })
    : fail(`smoke command: ${run.command}`, { status: run.status, stderr: run.stderr }));
  return checks.concat(p0Checks(), p1Checks());
}

function parseArgs(argv) {
  const args = { level: 'auto', event: 'normal-task', command: null, fullOutput: false };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--level') args.level = argv[++i] || args.level;
    else if (token === '--event') args.event = argv[++i] || args.event;
    else if (token === '--check-command') args.command = argv[++i] || '';
    else if (token === '--full-output') args.fullOutput = true;
  }
  return args;
}

function normalizeEvent(value) {
  return String(value || 'normal-task').toLowerCase().replace(/_/g, '-');
}

function resolveAutoLevel(args) {
  const event = normalizeEvent(args.event);
  if (args.command !== null) return 'p0';
  if (['framework-update', 'trust-framework-update', 'p2', 'smoke-test'].includes(event)) return 'p2';
  if (['registry-update', 'skill-update', 'protocol-update', 'agents-update', 'routing-index-update', 'p1'].includes(event)) return 'p1';
  if (['startup-evidence', 'router-proof', 'dangerous-command', 'p0'].includes(event)) return 'p0';
  return 'skip';
}

function renderMarkdown(result) {
  const lines = [];
  lines.push('# MOSA Hook Result');
  lines.push('');
  lines.push(`- Date: ${result.generated_at}`);
  lines.push(`- Level: ${result.level}`);
  lines.push(`- Status: ${result.status}`);
  lines.push(`- Passed: ${result.passed}/${result.total}`);
  lines.push('');
  lines.push('## Checks');
  for (const check of result.checks) {
    lines.push(`- ${check.status.toUpperCase()}: ${check.name}`);
  }
  return `${lines.join('\n')}\n`;
}

function main() {
  const args = parseArgs(process.argv);
  const checks = [];
  const requestedLevel = args.level;
  const effectiveLevel = requestedLevel === 'auto' ? resolveAutoLevel(args) : requestedLevel;

  if (args.command !== null) checks.push(dangerousCommandCheck(args.command));
  if (effectiveLevel === 'skip') {
    checks.push(pass('hook event trigger', {
      event: normalizeEvent(args.event),
      reason: 'normal task; hook chain skipped'
    }));
  } else if (effectiveLevel === 'all') checks.push(...p2Checks());
  else if (effectiveLevel === 'p0') checks.push(...p0Checks());
  else if (effectiveLevel === 'p1') checks.push(...p1Checks());
  else if (effectiveLevel === 'p2') checks.push(...p2Checks());
  else checks.push(fail('known hook level', { level: effectiveLevel }));

  const passed = checks.filter((check) => check.status === 'pass').length;
  const result = {
    generated_at: new Date().toISOString(),
    workspace_root: WORKSPACE_ROOT,
    requested_level: requestedLevel,
    effective_level: effectiveLevel,
    event: normalizeEvent(args.event),
    status: passed === checks.length ? 'pass' : 'fail',
    passed,
    total: checks.length,
    failed_checks: checks.filter((check) => check.status !== 'pass').map((check) => check.name),
    report_pointer: '02_Output/mosa_hook_result.json',
    checks
  };
  result.level = result.effective_level;

  ensureOutDir();
  fs.writeFileSync(path.join(OUT_DIR, 'mosa_hook_result.json'), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'mosa_hook_result.md'), renderMarkdown(result));
  const compact = {
    status: result.status,
    event: result.event,
    level: result.effective_level,
    passed: result.passed,
    total: result.total,
    failed_checks: result.failed_checks,
    report_pointer: result.report_pointer,
    markdown_pointer: '02_Output/mosa_hook_result.md'
  };
  console.log(JSON.stringify(args.fullOutput ? result : compact, null, 2));
  process.exit(result.status === 'pass' ? 0 : 1);
}

main();
