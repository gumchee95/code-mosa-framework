#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RUNTIME_MODES = new Set(['standard', 'cold-repair']);
const LEGACY_MODE_MAP = {
  micro: 'standard',
  full: 'standard',
  maintenance: 'standard',
  maintain: 'standard'
};

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (_) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function fileInfo(root, relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return { path: relativePath, exists: false, bytes: 0 };
  return { path: relativePath, exists: true, bytes: fs.statSync(fullPath).size };
}

function estimateTokens(bytes) {
  return Math.ceil(bytes / 4);
}

function findWorkspaceRoot(startDir = process.cwd()) {
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

function parseArgs(argv) {
  const args = { intent: '', mode: 'auto', write: false };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--intent') args.intent = argv[++i] || '';
    else if (item === '--mode') args.mode = argv[++i] || 'auto';
    else if (item === '--write') args.write = true;
    else if (!args.intent) args.intent = item;
  }
  return args;
}

function keywordList(intent) {
  return [...new Set(String(intent || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s-]+/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1))]
    .slice(0, 8);
}

function evidenceStatus(root) {
  const required = [
    '00_System/mosa_startup.js',
    '00_System/mosa_route.js',
    '01_Work/startup_result.json',
    '01_Work/routing_result.json'
  ];
  const missing = required.filter(item => !fs.existsSync(path.join(root, item)));
  return { required, missing, trusted: missing.length === 0 };
}

function recommendMode(intent, root) {
  const evidence = evidenceStatus(root);
  if (evidence.missing.some(item => item.startsWith('00_System/'))) return 'cold-repair';
  if (!evidence.trusted) return 'cold-repair';
  return 'standard';
}

function normalizeMode(inputMode, intent, root) {
  const requested = String(inputMode || 'auto').toLowerCase();
  const mapped = LEGACY_MODE_MAP[requested] || requested;
  const recommended = recommendMode(intent, root);
  const mode = mapped === 'auto' || mapped === 'ask' || !RUNTIME_MODES.has(mapped)
    ? recommended
    : mapped;

  return {
    requested_mode: requested,
    legacy_mapped_mode: LEGACY_MODE_MAP[requested] || null,
    mode,
    recommended_mode: recommended,
    runtime_modes: [...RUNTIME_MODES],
    maintain_command: 'node 00_System/mosa_cli.js maintain'
  };
}

function updateState(root) {
  const statePath = path.join(root, '00_System/state.json');
  const current = readJson(statePath, {});
  const next = {
    turn_count: Number(current.turn_count || 0) + 1,
    drift_threshold: Number(current.drift_threshold || 20)
  };
  writeJson(statePath, next);
  return next;
}

function graphContext(root) {
  const graphPath = path.join(root, 'graphify-out/GRAPH_REPORT.md');
  if (!fs.existsSync(graphPath)) return null;
  return {
    report: 'graphify-out/GRAPH_REPORT.md',
    god_nodes: ['00_System', '01_Work', '02_Output', 'graphify-out/GRAPH_REPORT.md'],
    generated_at: new Date().toISOString()
  };
}

function buildContextBus(root, args, modeDecision) {
  const manifest = readJson(path.join(root, '02_Output/startup_manifest.json'), {});
  const contextBus = {
    generated_at: new Date().toISOString(),
    mode: modeDecision.mode,
    intent: args.intent,
    atomic_keywords: keywordList(args.intent),
    workspace_root: root,
    pointers: {
      state: '00_System/state.json',
      startup_result: '01_Work/startup_result.json',
      routing_result: '01_Work/routing_result.json',
      workflow_plan: '01_Work/workflow_plan.json',
      routing_index_light: '02_Output/routing_index_light.json',
      startup_manifest: '02_Output/startup_manifest.json'
    },
    constraints: {
      cold_reads_forbidden: manifest.forbidden_startup_reads || ['02_Output/registry_distiller_report.json'],
      registry_mutation_allowed: false
    },
    _meta: {
      version: 'mosa.context_bus.v2',
      lifecycle: 'ephemeral',
      graph_context: graphContext(root)
    }
  };
  return contextBus;
}

function buildStartupResult(root, args) {
  const modeDecision = normalizeMode(args.mode, args.intent, root);
  const state = updateState(root);
  const contextBus = buildContextBus(root, args, modeDecision);
  const hotArtifacts = {
    startup_manifest: fileInfo(root, '02_Output/startup_manifest.json'),
    routing_index_light: fileInfo(root, '02_Output/routing_index_light.json'),
    reference_map_light: fileInfo(root, '02_Output/reference_map_light.json'),
    mode_profiles: fileInfo(root, '02_Output/mode_profiles.json'),
    graph_report: fileInfo(root, 'graphify-out/GRAPH_REPORT.md')
  };
  const evidence = evidenceStatus(root);

  return {
    schema_version: 'mosa.startup_result.v2',
    status: 'ok',
    generated_at: contextBus.generated_at,
    workspace_root: root,
    intent_hash: crypto.createHash('sha1').update(args.intent || '').digest('hex'),
    mode: modeDecision.mode,
    mode_decision: modeDecision,
    intent: args.intent,
    atomic_keywords: contextBus.atomic_keywords,
    turn_count: state.turn_count,
    drift_threshold: state.drift_threshold,
    evidence,
    hot_artifacts: hotArtifacts,
    available_hot_artifact_token_estimate: Object.values(hotArtifacts)
      .filter(item => item.exists)
      .reduce((sum, item) => sum + estimateTokens(item.bytes), 0),
    expected_startup_read_tokens: {
      normal: '800-1500',
      with_graph_pointer: '1200-2200',
      note: 'Hot artifact estimate is availability, not required context read.'
    },
    pointers: {
      startup_result: '01_Work/startup_result.json',
      context_bus: '01_Work/context_bus.json',
      routing_result: '01_Work/routing_result.json'
    },
    next_agent_action: 'read startup_result and context_bus, then continue with Orchestrator/Auto-Skill/DAG/Router as needed'
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = findWorkspaceRoot();
  fs.mkdirSync(path.join(root, '00_System'), { recursive: true });
  fs.mkdirSync(path.join(root, '01_Work'), { recursive: true });
  fs.mkdirSync(path.join(root, '02_Output'), { recursive: true });

  const startupResult = buildStartupResult(root, args);
  const contextBus = buildContextBus(root, args, startupResult.mode_decision);

  if (args.write) {
    writeJson(path.join(root, '01_Work/context_bus.json'), contextBus);
    writeJson(path.join(root, '01_Work/startup_result.json'), startupResult);
  }

  console.log(JSON.stringify(startupResult, null, 2));
}

main();
