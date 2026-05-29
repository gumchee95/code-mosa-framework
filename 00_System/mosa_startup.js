const fs = require('fs');
const path = require('path');

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (_) {
    return fallback;
  }
}

function readText(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  } catch (_) {
    return fallback;
  }
}

function bytes(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (_) {
    return 0;
  }
}

function estimateTokens(value) {
  return Math.ceil(Buffer.byteLength(JSON.stringify(value), 'utf8') / 4);
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
  return process.cwd();
}

function parseArgs(argv) {
  const args = { mode: 'ask', intent: '', write: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode') args.mode = argv[++i] || args.mode;
    else if (arg === '--intent') args.intent = argv[++i] || '';
    else if (arg === '--write') args.write = true;
  }
  return args;
}

function compactLines(text, maxLines = 8) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(-maxLines);
}

function extractSection(text, heading, maxLines = 10) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(line => line.trim().toLowerCase() === heading.toLowerCase());
  if (start < 0) return [];
  const result = [];
  for (let i = start + 1; i < lines.length && result.length < maxLines; i += 1) {
    if (/^#{1,3}\s+/.test(lines[i]) && result.length) break;
    const line = lines[i].trim();
    if (line) result.push(line);
  }
  return result;
}

function scoreIntent(intent) {
  const text = String(intent || '').toLowerCase();
  const count = patterns => patterns.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
  return {
    maintenance: count([/audit/, /maintenance/, /distiller/, /registry/, /collision/, /orphan/, /harmonizer/, /framework/, /token efficiency/]),
    routing: count([/skill/, /route/, /router/, /agent/, /apps script/, /\bgas\b/, /frontend/, /\bui\b/, /\bux\b/, /finance/, /document/, /spreadsheet/, /\bmcp\b/]),
    complexity: count([/build/, /implement/, /system/, /workflow/, /multi[- ]?agent/, /architecture/, /migration/, /refactor/, /full/, /end[- ]?to[- ]?end/, /integrat/]),
    project: count([/new project/, /start .*project/, /project startup/, /scaffold/, /from scratch/, /setup/]),
    tiny: count([/quick/, /small/, /minor/, /simple/, /explain/, /status/, /question/, /ask/, /minor change/, /small fix/, /simple/, /explain/])
  };
}

function recommendedMode(intent) {
  const scores = scoreIntent(intent);
  if (scores.maintenance >= 1) return { mode: 'maintenance', confidence: scores.maintenance >= 2 ? 'high' : 'medium', scores };
  if (scores.tiny >= 1 && scores.complexity === 0 && scores.project === 0) return { mode: 'micro', confidence: 'high', scores };
  if (scores.complexity >= 1 && scores.routing >= 1) return { mode: 'full', confidence: scores.complexity + scores.routing >= 3 ? 'high' : 'medium', scores };
  if (scores.project >= 1 || scores.routing >= 1 || scores.complexity >= 1) return { mode: 'standard', confidence: 'medium', scores };
  return { mode: 'micro', confidence: 'low', scores };
}

function resolveMode(requestedMode, intent) {
  const validModes = new Set(['micro', 'standard', 'full', 'maintenance']);
  if (validModes.has(requestedMode)) {
    return {
      mode: requestedMode,
      requested_mode: requestedMode,
      recommendation: recommendedMode(intent),
      question: null
    };
  }

  const recommendation = recommendedMode(intent);
  if (requestedMode === 'auto' && recommendation.confidence !== 'low') {
    return {
      mode: recommendation.mode,
      requested_mode: requestedMode,
      recommendation,
      question: null
    };
  }

  const alternatives = recommendation.mode === 'micro'
    ? ['standard', 'full']
    : recommendation.mode === 'maintenance'
    ? ['micro', 'maintenance']
    : ['micro', recommendation.mode, 'full'];

  return {
    mode: 'ask',
    requested_mode: requestedMode,
    recommendation,
    alternatives: [...new Set(alternatives)],
    question: `Recommended mode is ${recommendation.mode}. Use that, or choose another mode before starting?`
  };
}

function graphSummary(graphText) {
  return {
    god_nodes: extractSection(graphText, '## God Nodes', 12)
      .map(line => line.replace(/^- /, '')),
    token_rules: extractSection(graphText, '## Token Shield Rule', 8)
      .map(line => line.replace(/^- /, '')),
    active_routing: extractSection(graphText, '## Active Skill Routing', 10)
  };
}

function taskSummary(taskText) {
  return {
    pipeline_trace: (taskText.match(/^\[Pipeline Trace\]:.*$/m) || [null])[0],
    atomic_keywords: extractSection(taskText, '## Atomic Keywords', 8)
      .map(line => line.replace(/^- /, '')),
    status: extractSection(taskText, '## Status', 5)
      .map(line => line.replace(/^- /, ''))
  };
}

function modeSummary(modeProfiles) {
  const profiles = modeProfiles.profiles || {};
  return Object.fromEntries(
    Object.entries(profiles).map(([name, profile]) => [
      name,
      {
        triggers: (profile.triggers || []).slice(0, 6),
        top_boosts: Object.entries(profile.boosts || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([skillId]) => skillId)
      }
    ])
  );
}

function buildPacket(root, args) {
  const manifestPath = path.join(root, '02_Output', 'startup_manifest.json');
  const graphPath = path.join(root, 'graphify-out', 'GRAPH_REPORT.md');
  const promptStackPath = path.join(root, '00_System', 'prompt_stack.md');
  const taskPath = path.join(root, '01_Work', 'task.md');
  const contextBusPath = path.join(root, '01_Work', 'context_bus.json');
  const tokenBudgetPath = path.join(root, '02_Output', 'token_budget_report.json');
  const modeProfilesPath = path.join(root, '02_Output', 'mode_profiles.json');
  const routingLightPath = path.join(root, '02_Output', 'routing_index_light.json');
  const referenceLightPath = path.join(root, '02_Output', 'reference_map_light.json');

  const manifest = readJson(manifestPath, {});
  const graphText = readText(graphPath);
  const promptStack = readText(promptStackPath);
  const taskText = readText(taskPath);
  const contextBus = readJson(contextBusPath, {});
  const tokenBudget = readJson(tokenBudgetPath, {});
  const modeProfiles = readJson(modeProfilesPath, {});
  const routingLight = readJson(routingLightPath, {});
  const referenceLight = readJson(referenceLightPath, {});

  const modeDecision = resolveMode(args.mode, args.intent);
  const mode = modeDecision.mode;
  const packet = {
    status: 'success',
    mode,
    mode_decision: modeDecision,
    workspace_root: root,
    generated_at: new Date().toISOString(),
    policy: {
      purpose: 'Lightweight MOSA startup packet. Escalate only when the task needs routing, long execution, or maintenance.',
      forbidden_startup_reads: manifest.forbidden_startup_reads || ['02_Output/registry_distiller_report.json']
    },
    health: manifest.health || null,
    pointers: {
      graph_report: 'graphify-out/GRAPH_REPORT.md',
      startup_manifest: '02_Output/startup_manifest.json',
      prompt_stack: '00_System/prompt_stack.md',
      task: '01_Work/task.md',
      context_bus: '01_Work/context_bus.json',
      routing_index_light: '02_Output/routing_index_light.json',
      reference_map_light: '02_Output/reference_map_light.json',
      full_mosa_protocol: '00_System/MOSA_PROJECT_STARTUP_PROTOCOL.md'
    },
    graph: graphSummary(graphText),
    task: taskSummary(taskText),
    context_bus: {
      lifecycle: contextBus?._meta?.lifecycle || null,
      max_tokens: contextBus?._meta?.max_tokens || null,
      shared_fact_keys: Object.keys(contextBus.shared_facts || {}),
      agent_output_keys: Object.keys(contextBus.agent_outputs || {}),
      next_agent: contextBus.handoff?.next_agent || null
    },
    prompt_stack_recent: compactLines(promptStack, 6),
    escalation: {
      micro: 'Use LLM + relevant files only. Do not route.',
      standard: 'Use routing_index_light and mode_profiles if skill selection is needed.',
      full: 'Use Orchestrator + Router + selected Skill SOP.',
      maintenance: 'Use Harmonizer or Distiller; full registry report remains cold unless explicitly needed.'
    }
  };

  if (mode === 'standard' || mode === 'full' || mode === 'maintenance') {
    packet.routing = {
      source: '02_Output/routing_index_light.json',
      active_skills: routingLight.summary?.active_skills || null,
      mode_profiles: modeSummary(modeProfiles),
      reference_count: Object.keys(referenceLight.references || {}).length
    };
  }

  if (mode === 'full' || mode === 'maintenance') {
    packet.budget = {
      report: '02_Output/token_budget_report.json',
      files: (tokenBudget.files || []).map(item => ({
        file: item.file,
        estimated_tokens: item.estimated_tokens,
        status: item.status
      }))
    };
  }

  packet.estimated_packet_tokens = estimateTokens(packet);
  return packet;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = findWorkspaceRoot();
  const packet = buildPacket(root, args);
  if (args.write) {
    const outputPath = path.join(root, '02_Output', 'startup_packet.json');
    fs.writeFileSync(outputPath, JSON.stringify(packet, null, 2));
    packet.written_to = '02_Output/startup_packet.json';
  }
  console.log(JSON.stringify(packet, null, 2));
}

main();

