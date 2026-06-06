#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'app', 'build', 'builder', 'for', 'in', 'of', 'on',
  'project', 'skill', 'system', 'the', 'to', 'tool', 'web', 'with'
]);

const RUNTIME_MODES = new Set(['standard', 'cold-repair']);
const LEGACY_MODE_MAP = { micro: 'standard', full: 'standard', maintenance: 'standard' };

const CAPABILITY_TAXONOMY = [
  ['planning', 'Planning', ['plan', 'prepare', 'organize', 'scope', 'goal', 'requirement'], 'Clarify goal, scope, constraints, success criteria, and execution sequence', ['ORCHESTRATOR_AGENT', 'PROJECT_PLANNER', 'PROJECT_MANAGEMENT_CORE'], 'planning-clarifier-agent'],
  ['research', 'Research', ['research', 'market', 'competitor', 'benchmark', 'investigate', 'study'], 'Gather source-backed context and synthesize findings', ['MARKET_AGENT', 'BRAINSTORMING_AGENT', 'THOUGHT_DISTILLER', 'KYC_DATA_FETCHER'], 'research-synthesis-agent'],
  ['design', 'Design', ['design', 'ui', 'ux', 'visual', 'brand', 'poster', 'asset', 'webpage', 'website', 'chart', 'visualization', 'dashboard'], 'Create visual direction, layout, interaction, or production assets', ['DESIGN_AGENT', 'FRONTEND_DESIGN', 'UI_SUITE', 'THEME_FACTORY', 'CANVAS_DESIGN'], 'visual-production-agent'],
  ['coding', 'Coding', ['code', 'build', 'implement', 'app', 'frontend', 'backend', 'api', 'refactor', 'fix'], 'Implement or modify software safely with local project patterns', ['CODER_AGENT', 'API_EXPERT', 'WEB_ARTIFACTS_BUILDER', 'GAS_WEBAPP_ARCHITECT', 'MCP_BUILDER'], 'implementation-agent'],
  ['data', 'Data', ['data', 'dashboard', 'analytics', 'metric', 'csv', 'excel', 'sheet', 'reporting'], 'Clean, analyze, model, visualize, or validate data', ['DATA_ANALYTICS_CORE', 'XLSX', 'AUTOMATED_DATA_CLEANER'], 'metric-contract-agent'],
  ['document', 'Document', ['document', 'doc', 'memo', 'report', 'proposal', 'ppt', 'slides', 'readme'], 'Produce structured written output, deck, report, or documentation', ['REPORT_GENERATOR', 'DOC_COAUTHORING', 'DOCX', 'PPTX', 'PDF'], 'document-production-agent'],
  ['communication', 'Communication', ['email', 'announce', 'invite', 'message', 'newsletter', 'follow-up', 'marketing'], 'Prepare announcements, invitations, follow-up, or stakeholder communication', ['INTERNAL_COMMS', 'MARKETING_IDEAS'], 'communication-sequence-agent'],
  ['calendar', 'Calendar', ['calendar', 'schedule', 'meeting', 'invite', 'rsvp', 'registration', 'event'], 'Coordinate time, invites, attendance, RSVP, and scheduling artifacts', ['GOOGLE_AGENT', 'ADMIN_AGENT', 'XLSX', 'PROJECT_MANAGEMENT_CORE'], 'rsvp-registration-agent'],
  ['automation', 'Automation', ['automation', 'workflow', 'script', 'bot', 'integrate', 'pipeline'], 'Automate repeated workflow steps or connect tools', ['MCP_BUILDER', 'GAS_WEBAPP_ARCHITECT', 'DOC_PIPELINE', 'DATABASE_SUITE', 'AZURE_SUITE'], 'workflow-automation-agent'],
  ['compliance', 'Compliance', ['compliance', 'risk', 'security', 'privacy', 'audit', 'regulated'], 'Check policy, security, privacy, compliance, and risk constraints', ['AUDIT_AGENT', 'COMPLIANCE_FRAMEWORK', 'CODE_REVIEW'], 'risk-policy-agent'],
  ['review', 'Review', ['review', 'test', 'verify', 'qa', 'validate', 'audit'], 'Verify output quality, correctness, regressions, and completion', ['AUDIT_AGENT', 'CODE_REVIEW', 'WEBAPP_TESTING', 'PLAYWRIGHT'], 'delivery-qa-agent'],
  ['deployment', 'Deployment', ['deploy', 'release', 'publish', 'github', 'site'], 'Prepare release, publishing, deployment, or handoff steps', ['CODER_AGENT', 'PROJECT_LAUNCH'], 'deployment-release-agent']
].map(([id, label, triggers, requiredCapability, preferredSkillIds, suggestedSkillId]) => ({
  id,
  label,
  triggers,
  required_capability: requiredCapability,
  preferred_skill_ids: preferredSkillIds,
  suggested_skill_id: suggestedSkillId
}));

const DOMAIN_RULES = [
  {
    id: 'event',
    label: 'Event / Gathering',
    triggers: ['event', 'dinner', 'alumni', 'gathering', 'rsvp', 'venue', 'catering', '聚餐', '校友', '活动', '活動', '报名', '報名', '场地', '場地'],
    questions: [
      'Who is the target attendee group and expected headcount?',
      'Which city/country, date range, and timezone should the event use?',
      'What budget range, payment model, and sponsorship assumptions are allowed?',
      'What RSVP channel and attendee tracking format should be used?',
      'What tone should invitations and follow-up messages use?'
    ],
    capabilities: [
      ['clarification', 'Orchestrator Clarification', 'Clarify missing event assumptions before routing execution work', ['ORCHESTRATOR_AGENT', 'PROJECT_PLANNER'], 'planning-clarifier-agent', 'Clarifying questions and assumption list'],
      ['goal_scope', 'Goal And Scope', 'Define event objective, attendee persona, constraints, success criteria, and decision owner', ['ORCHESTRATOR_AGENT', 'PROJECT_PLANNER', 'PROJECT_MANAGEMENT_CORE'], 'event-strategy-agent', 'Event objective, scope, constraints, and success criteria'],
      ['budget_model', 'Budget Model', 'Estimate venue, food, deposits, ticketing, sponsorship, contingency, and approval thresholds', ['ADMIN_AGENT', 'PROJECT_MANAGEMENT_CORE', 'STRATEGIC_FINANCE'], 'event-budget-agent', 'Budget model and approval thresholds'],
      ['venue_catering', 'Venue And Catering', 'Shortlist venue/catering requirements, dietary constraints, location fit, and booking dependencies', ['ADMIN_AGENT', 'PROJECT_MANAGEMENT_CORE'], 'venue-catering-agent', 'Venue and catering shortlist criteria'],
      ['registration_rsvp', 'Registration And RSVP', 'Design RSVP capture, attendee list, reminders, capacity tracking, and check-in source of truth', ['GOOGLE_AGENT', 'XLSX', 'ADMIN_AGENT'], 'rsvp-registration-agent', 'RSVP tracker and reminder plan'],
      ['promotion_invitation', 'Promotion And Invitation', 'Prepare invitation copy, alumni outreach, reminders, and announcement cadence', ['INTERNAL_COMMS', 'DESIGN_AGENT', 'GOOGLE_AGENT'], 'alumni-outreach-agent', 'Invitation copy and outreach cadence'],
      ['agenda_program', 'Agenda And Program', 'Create dinner agenda, host script, welcome remarks, seating logic, and networking moments', ['PROJECT_PLANNER', 'INTERNAL_COMMS', 'ADMIN_AGENT'], 'event-program-agent', 'Dinner agenda and host script outline'],
      ['onsite_operations', 'Onsite Operations', 'Plan run-of-show, check-in, signage, payment handling, vendor timing, and escalation ownership', ['ADMIN_AGENT', 'PROJECT_MANAGEMENT_CORE'], 'onsite-ops-agent', 'Run-of-show and onsite operations checklist'],
      ['risk_control', 'Risk And Compliance', 'Check cancellation risk, deposits, safety, dietary/allergy handling, privacy, and payment records', ['AUDIT_AGENT', 'COMPLIANCE_FRAMEWORK', 'ADMIN_AGENT'], 'event-risk-agent', 'Risk and compliance checklist'],
      ['follow_up', 'Follow Up And Retention', 'Prepare thank-you notes, photos/recap, feedback form, finance reconciliation, and next-event leads', ['INTERNAL_COMMS', 'GOOGLE_AGENT', 'REPORT_GENERATOR'], 'event-follow-up-agent', 'Follow-up message, recap, and feedback plan'],
      ['review', 'Delivery Review', 'Verify deliverables, unresolved assumptions, missing skills, and final handoff readiness', ['AUDIT_AGENT', 'PROJECT_MANAGEMENT_CORE'], 'delivery-qa-agent', 'Final readiness review']
    ],
    edges: [
      ['clarification', 'goal_scope'],
      ['goal_scope', 'budget_model'],
      ['goal_scope', 'venue_catering'],
      ['goal_scope', 'registration_rsvp'],
      ['goal_scope', 'promotion_invitation'],
      ['goal_scope', 'agenda_program'],
      ['goal_scope', 'risk_control'],
      ['budget_model', 'venue_catering'],
      ['budget_model', 'registration_rsvp'],
      ['venue_catering', 'onsite_operations'],
      ['registration_rsvp', 'onsite_operations'],
      ['promotion_invitation', 'onsite_operations'],
      ['agenda_program', 'onsite_operations'],
      ['risk_control', 'onsite_operations'],
      ['onsite_operations', 'follow_up'],
      ['follow_up', 'review']
    ],
    parallelGroups: [['venue_catering', 'registration_rsvp', 'promotion_invitation', 'agenda_program']]
  }
];

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
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temp = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
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
    '00_System/state.json',
    '00_System/prompt_stack.md',
    '00_System/mosa_startup.js',
    '00_System/mosa_route.js',
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
    '01_Work/context_bus.json',
    '01_Work/startup_result.json',
    '01_Work/routing_result.json',
    '01_Work/workflow_plan.json',
    '02_Output/startup_manifest.json',
    '02_Output/routing_index_light.json',
    '02_Output/mode_profiles.json',
    '02_Output/reference_map_light.json'
  ]) {
    const full = path.join(root, file);
    if (fs.existsSync(full) && readJson(full) === null) issues.push(`invalid json: ${file}`);
  }

  if (fs.existsSync(path.join(root, '02_Output/startup_packet.json'))) {
    warnings.push('legacy startup_packet.json exists; startup_result.json is authoritative');
  }

  return { status: issues.length ? 'fail' : 'ok', issues, warnings, checked_files: requiredFiles(root).length };
}

function normalizeMode(mode) {
  const lower = String(mode || 'auto').toLowerCase();
  const mapped = LEGACY_MODE_MAP[lower] || lower;
  return RUNTIME_MODES.has(mapped) ? mapped : mapped === 'auto' || mapped === 'ask' ? mapped : 'standard';
}

function safeStart(root, args) {
  const script = path.join(root, '00_System/mosa_startup.js');
  const childArgs = [script, '--mode', args.mode || 'auto'];
  if (args.intent) childArgs.push('--intent', args.intent);
  if (args.write) childArgs.push('--write');
  const result = spawnSync(process.execPath, childArgs, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    return { status: 'fallback', mode: 'standard', reason: 'startup script failed', stderr: result.stderr };
  }
  return JSON.parse(result.stdout);
}

function loadSkillIndex(root) {
  const light = readJson(path.join(root, '02_Output/routing_index_light.json'), null);
  if (Array.isArray(light?.skills)) return { source: '02_Output/routing_index_light.json', skills: light.skills };
  const active = readJson(path.join(root, '02_Output/active_skill_index.json'), null);
  if (Array.isArray(active?.skills)) return { source: '02_Output/active_skill_index.json', skills: active.skills };
  return { source: null, skills: [] };
}

function route(root, intent, options = {}) {
  const script = path.join(root, '00_System/mosa_route.js');
  const args = [script, '--intent', intent || ''];
  if (options.workflowPlan) args.push('--workflow-plan', options.workflowPlan);
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) return { status: 'fail', stderr: result.stderr };
  return JSON.parse(result.stdout);
}

function stableIntentHashForPlan(intent) {
  return crypto.createHash('sha1').update(intent || '').digest('hex');
}

function capabilityScore(capability, intentText, intentWords) {
  return capability.triggers.reduce((sum, trigger) => {
    const value = String(trigger).toLowerCase();
    const hit = value.includes(' ') ? intentText.includes(value) : intentWords.has(value) || intentText.includes(value);
    return hit ? sum + 1 : sum;
  }, 0);
}

function inferCapabilities(intent) {
  const text = String(intent || '').toLowerCase();
  const intentWords = new Set(tokenize(text));
  const selected = new Map(
    CAPABILITY_TAXONOMY
      .map(capability => ({ ...capability, score: capabilityScore(capability, text, intentWords) }))
      .filter(capability => capability.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => [item.id, item])
  );

  if (!selected.has('planning')) selected.set('planning', CAPABILITY_TAXONOMY.find(item => item.id === 'planning'));
  if ((selected.has('coding') || selected.has('design') || selected.has('data') || selected.has('document') || selected.has('automation')) && !selected.has('review')) {
    selected.set('review', CAPABILITY_TAXONOMY.find(item => item.id === 'review'));
  }

  const order = ['planning', 'research', 'data', 'design', 'document', 'communication', 'calendar', 'automation', 'coding', 'compliance', 'review', 'deployment'];
  return order.map(id => selected.get(id)).filter(Boolean);
}

function domainScore(rule, intentText, intentWords) {
  return rule.triggers.reduce((sum, trigger) => {
    const value = String(trigger).toLowerCase();
    const hit = /[^\x00-\x7F]/.test(value) ? intentText.includes(value) : intentWords.has(value) || intentText.includes(value);
    return hit ? sum + 1 : sum;
  }, 0);
}

function detectDomain(intent) {
  const text = String(intent || '').toLowerCase();
  const words = new Set(tokenize(text));
  const matches = DOMAIN_RULES
    .map(rule => ({ ...rule, score: domainScore(rule, text, words) }))
    .filter(rule => rule.score > 0)
    .sort((a, b) => b.score - a.score);
  return matches[0] || null;
}

function buildDomainCapabilities(domainRule) {
  return domainRule.capabilities.map(([id, label, requiredCapability, preferredSkillIds, suggestedSkillId, deliverable]) => ({
    id,
    label,
    triggers: [],
    required_capability: requiredCapability,
    preferred_skill_ids: preferredSkillIds,
    suggested_skill_id: suggestedSkillId,
    deliverable,
    domain: domainRule.id
  }));
}

function skillById(skills) {
  return new Map((skills || []).map(skill => [String(skill.skill_id || '').toUpperCase(), skill]));
}

function buildNodes(capabilities, skills) {
  const byId = skillById(skills);
  return capabilities.map((capability, index) => {
    const candidates = capability.preferred_skill_ids
      .map(skillId => byId.get(skillId))
      .filter(Boolean)
      .slice(0, 3)
      .map(skill => ({ skill_id: skill.skill_id, filepath: skill.filepath || null, category: skill.category || null }));
    return {
      id: capability.id,
      label: capability.label,
      capability: capability.required_capability,
      deliverable: capability.deliverable || compactDeliverable(capability),
      candidate_agents: candidates,
      sequence: index + 1,
      ...(capability.domain ? { domain: capability.domain } : {}),
      ...(capability.questions ? { questions: capability.questions } : {})
    };
  });
}

function compactDeliverable(capability) {
  const id = String(capability.id || '');
  const map = {
    planning: 'Clarified scope and execution sequence',
    research: 'Source-backed findings summary',
    design: 'Design direction or visual asset brief',
    coding: 'Implemented code change or build artifact',
    data: 'Clean data, metrics, or analysis output',
    document: 'Structured document, report, or deck',
    communication: 'Message, announcement, or follow-up draft',
    calendar: 'Schedule, invite, RSVP, or attendance artifact',
    automation: 'Reusable workflow or script plan',
    compliance: 'Risk, policy, or compliance note',
    review: 'Verification notes and handoff readiness',
    deployment: 'Release, publishing, or deployment handoff'
  };
  return map[id] || `${capability.label || id} output`;
}

function buildEdges(nodes) {
  const ids = nodes.map(node => node.id);
  const planning = ids.includes('planning') ? 'planning' : ids[0];
  const edges = [];
  for (const id of ids) {
    if (id !== planning && id !== 'review' && id !== 'deployment') edges.push({ from: planning, to: id });
  }
  if (ids.includes('review')) {
    for (const id of ids.filter(item => !['planning', 'review', 'deployment', 'compliance'].includes(item))) {
      edges.push({ from: id, to: 'review' });
    }
  }
  if (ids.includes('deployment')) edges.push({ from: ids.includes('review') ? 'review' : planning, to: 'deployment' });
  return edges;
}

function buildParallelGroups(nodes) {
  const group = nodes.map(node => node.id).filter(id => !['planning', 'review', 'deployment', 'compliance'].includes(id));
  return group.length > 1 ? [group] : [];
}

function buildWorkflowPlan(root, intent) {
  const index = loadSkillIndex(root);
  const domain = detectDomain(intent);
  const capabilities = domain ? buildDomainCapabilities(domain) : inferCapabilities(intent);
  if (domain && capabilities[0]?.id === 'clarification') capabilities[0].questions = domain.questions;
  const nodes = buildNodes(capabilities, index.skills);
  const missingSkills = nodes
    .filter(node => node.candidate_agents.length === 0)
    .map(node => ({
      node_id: node.id,
      missing_capability: node.capability,
      suggested_skill_id: capabilities.find(item => item.id === node.id)?.suggested_skill_id || `${node.id}-agent`,
      recommended_action: 'suggest_create_skill',
      priority: node.id === 'planning' ? 'high' : 'medium'
    }));

  return {
    schema_version: 'mosa.workflow_dag.v1',
    goal: intent,
    intent_hash: stableIntentHashForPlan(intent),
    nodes,
    edges: domain ? domain.edges.map(([from, to]) => ({ from, to })) : buildEdges(nodes),
    parallel_groups: domain ? domain.parallelGroups : buildParallelGroups(nodes),
    router_hints: nodes.map(node => ({
      node_id: node.id,
      required_capability: node.capability,
      atomic_keywords: tokenize(`${node.label} ${node.capability} ${node.domain || ''}`).slice(0, 10),
      preferred_skill_ids: node.candidate_agents.map(candidate => candidate.skill_id)
    })),
    missing_skills: missingSkills
  };
}

function renderWorkflowMarkdown(plan) {
  const lines = ['# MOSA Workflow Capability DAG', '', `- Intent: ${plan.goal}`, '', '## Nodes'];
  for (const node of plan.nodes) {
    lines.push(`- ${node.sequence}. ${node.id}: ${node.capability}`);
    lines.push(`  - deliverable: ${node.deliverable || 'compact output pointer'}`);
    lines.push(`  - candidates: ${node.candidate_agents.map(item => item.skill_id).join(', ') || 'none'}`);
    if (Array.isArray(node.questions) && node.questions.length) {
      lines.push(`  - orchestrator questions: ${node.questions.join(' | ')}`);
    }
  }
  lines.push('', '## Edges');
  for (const edge of plan.edges) lines.push(`- ${edge.from} -> ${edge.to}`);
  lines.push('', '## Missing Skills');
  if (!plan.missing_skills.length) lines.push('- none');
  for (const item of plan.missing_skills) lines.push(`- ${item.suggested_skill_id}: ${item.missing_capability}`);
  return `${lines.join('\n')}\n`;
}

function runPlan(root, args = {}) {
  const intent = args.intent || args._.slice(1).join(' ');
  if (!intent) return { status: 'fail', message: 'Missing --intent for workflow plan.' };
  const plan = buildWorkflowPlan(root, intent);
  if (args.write) {
    writeJsonAtomic(path.join(root, '01_Work/workflow_plan.json'), plan);
    fs.writeFileSync(path.join(root, '01_Work/workflow_plan.md'), renderWorkflowMarkdown(plan), 'utf8');
  }
  return { status: 'ok', workflow_plan: args.write ? '01_Work/workflow_plan.json' : null, workflow_summary: args.write ? '01_Work/workflow_plan.md' : null, plan };
}

function runHook(root, args = {}) {
  const script = path.join(root, '00_System/mosa_hooks.js');
  if (!fs.existsSync(script)) return { status: 'fail', message: 'mosa_hooks.js missing' };
  const hookArgs = [script, '--level', args.level || 'auto', '--event', args.event || 'maintain'];
  const result = spawnSync(process.execPath, hookArgs, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) return { status: 'fail', stderr: result.stderr };
  return JSON.parse(result.stdout);
}

function assert(condition, message, issues) {
  if (!condition) issues.push(message);
}

function runTests(root) {
  const issues = [];
  const startupPath = path.join(root, '01_Work/startup_result.json');
  const routingPath = path.join(root, '01_Work/routing_result.json');
  const planPath = path.join(root, '01_Work/workflow_plan.json');
  const taskPath = path.join(root, '01_Work/task.md');
  const standard = safeStart(root, { mode: 'micro', intent: 'quick status', write: true });
  assert(standard.mode === 'standard', 'legacy micro should map to standard', issues);
  assert(fs.existsSync(startupPath), 'start --write should create 01_Work/startup_result.json', issues);

  const planResult = runPlan(root, { intent: 'build a data dashboard', write: true });
  assert(planResult.status === 'ok' && fs.existsSync(planPath), 'plan --write should create workflow_plan.json', issues);
  const plan = readJson(planPath, {});
  const allowedPlanKeys = ['schema_version', 'goal', 'intent_hash', 'nodes', 'edges', 'parallel_groups', 'router_hints', 'missing_skills'];
  assert(Object.keys(plan).every(key => allowedPlanKeys.includes(key)), 'workflow_plan.json should use simplified schema only', issues);

  const routeResult = route(root, 'build a data dashboard', { workflowPlan: '01_Work/workflow_plan.json' });
  assert(routeResult.schema_version === 'mosa.routing_result.v2' && fs.existsSync(routingPath), 'route should write routing_result.json v2', issues);
  assert(Boolean(routeResult.single_route) !== Boolean(routeResult.dag_routes), 'routing_result should have single_route or dag_routes authority', issues);
  for (const forbidden of ['top_skill', 'candidates', 'flat_candidates', 'effectiveTop', 'node_routes']) {
    assert(!Object.prototype.hasOwnProperty.call(routeResult, forbidden), `routing_result should not include ${forbidden}`, issues);
  }

  const alignResult = runAlign(root, {});
  assert(alignResult.status === 'ok', 'align should pass compact MOSA drift checks', issues);

  return { status: issues.length ? 'fail' : 'ok', issues };
}

function runMaintain(root, args = {}) {
  const report = {
    generated_at: new Date().toISOString(),
    status: 'ok',
    check: validate(root),
    tests: runTests(root)
  };
  report.status = report.check.status === 'ok' && report.tests.status === 'ok' ? 'ok' : 'fail';
  if (args.write) writeJsonAtomic(path.join(root, '02_Output/maintenance_report.json'), report);
  return report;
}

function runAlign(root, args = {}) {
  const checks = [];
  const add = (name, passed, value = null) => checks.push({ name, status: passed ? 'pass' : 'fail', value });
  const agents = readText(path.join(root, 'AGENTS.md'));
  const startup = readText(path.join(root, '00_System/mosa_startup.js'));
  const cli = readText(path.join(root, '00_System/mosa_cli.js'));
  const graphSkill = readText(path.join(root, 'skills/mosa-graph-builder/SKILL.md'));
  const schema = readJson(path.join(root, '03_DAG/workflow_plan.schema.json'), {});

  add('runtime modes are standard/cold-repair only', startup.includes("new Set(['standard', 'cold-repair'])") && cli.includes("new Set(['standard', 'cold-repair'])"));
  add('legacy micro maps to standard', startup.includes("micro: 'standard'") && cli.includes("micro: 'standard'"));
  add('no stale removed-mode protocol term', !/\blean\b/.test(`${agents}\n${startup}\n${graphSkill}`));
  add('startup proof path documented', agents.includes('01_Work/startup_result.json'));
  add('router proof authority documented', agents.includes('single_route') && agents.includes('dag_routes'));
  add('graph builder discovery-only', graphSkill.includes('discovery-only') && graphSkill.includes('never chooses runtime mode'));
  add('workflow plan top-level schema compact', schema.additionalProperties === false && Array.isArray(schema.required) && schema.required.length === 8);
  add('workflow node deliverable supported', Boolean(schema.properties?.nodes?.items?.properties?.deliverable));

  const report = {
    schema_version: 'mosa.alignment_report.v1',
    generated_at: new Date().toISOString(),
    status: checks.every(check => check.status === 'pass') ? 'ok' : 'fail',
    checks,
    output: args.write ? '02_Output/mosa_alignment_report.json' : null
  };
  if (args.write) writeJsonAtomic(path.join(root, '02_Output/mosa_alignment_report.json'), report);
  return report;
}

function updateContext(root, args) {
  const file = path.join(root, '01_Work/context_bus.json');
  const bus = readJson(file, { _meta: { version: 'mosa.context_bus.v2', lifecycle: 'ephemeral' }, shared_facts: {}, agent_outputs: {}, handoff: {} });
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
  else if (command === 'route') print(route(root, args.intent || args._.slice(1).join(' '), { workflowPlan: args['workflow-plan'] || args.workflowPlan }));
  else if (command === 'plan') print(runPlan(root, args));
  else if (command === 'hook') print(runHook(root, args));
  else if (command === 'align') print(runAlign(root, args));
  else if (command === 'test') print(runTests(root));
  else if (command === 'maintain') print(runMaintain(root, args));
  else if (command === 'context') print(updateContext(root, args));
  else {
    print({
      usage: [
        'node 00_System/mosa_cli.js check',
        'node 00_System/mosa_cli.js start --mode standard --intent "..." --write',
        'node 00_System/mosa_cli.js plan --intent "..." --write',
        'node 00_System/mosa_cli.js route --intent "..." --workflow-plan 01_Work/workflow_plan.json',
        'node 00_System/mosa_cli.js align --write',
        'node 00_System/mosa_cli.js hook --event router-proof',
        'node 00_System/mosa_cli.js maintain --write',
        'node 00_System/mosa_cli.js test'
      ],
      runtime_modes: [...RUNTIME_MODES],
      legacy_mode_map: LEGACY_MODE_MAP
    });
  }
}

main();
