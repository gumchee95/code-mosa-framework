#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

function parseArgs(argv) {
  const args = { intent: '', domain: '', capability: '', keywords: [], workflowPlan: '', verbose: false };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--intent') args.intent = argv[++i] || '';
    else if (item === '--domain') args.domain = argv[++i] || '';
    else if (item === '--capability') args.capability = argv[++i] || '';
    else if (item === '--keywords') args.keywords = (argv[++i] || '').split(',').map(value => value.trim()).filter(Boolean);
    else if (item === '--workflow-plan') args.workflowPlan = argv[++i] || '';
    else if (item === '--verbose') args.verbose = true;
    else if (!args.intent) args.intent = item;
  }
  return args;
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

function stableIntentHash(intent) {
  return crypto.createHash('sha1').update(intent || '').digest('hex');
}

function stableProfileHash(profile) {
  return crypto.createHash('sha1').update(JSON.stringify({
    intent_summary: profile.intent_summary || '',
    atomic_keywords: profile.atomic_keywords || [],
    preferred_domain: profile.preferred_domain || '',
    required_capability: profile.required_capability || '',
    exclusions: profile.exclusions || []
  })).digest('hex');
}

function skillSearchScript() {
  return path.join(os.homedir(), '.codex', 'skills', 'router-agent', 'mosa_search.js');
}

function buildIntent(args, contextBus) {
  const intentSummary = args.intent || contextBus.intent || '';
  const explicitIntent = Boolean(args.intent);
  return {
    intent_summary: intentSummary,
    atomic_keywords: args.keywords.length ? args.keywords : explicitIntent ? [] : contextBus.atomic_keywords || [],
    preferred_domain: args.domain || (intentSummary.toLowerCase().includes('mosa') ? 'workflow' : ''),
    required_capability: args.capability || 'route to the most relevant skill with compact JSON output',
    exclusions: []
  };
}

function resolveWorkspacePath(workspaceRoot, filePath) {
  if (!filePath) return '';
  return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
}

function loadWorkflowPlan(args, workspaceRoot) {
  const planPath = resolveWorkspacePath(workspaceRoot, args.workflowPlan);
  if (!planPath || !fs.existsSync(planPath)) return null;
  const plan = readJson(planPath, null);
  if (!plan || typeof plan !== 'object') return null;
  return {
    path: path.relative(workspaceRoot, planPath).replace(/\\/g, '/'),
    plan,
    matches_intent: plan.intent_hash === stableIntentHash(args.intent || '')
  };
}

function confidenceTier(confidence) {
  if (confidence >= 0.8) return 'strong';
  if (confidence >= 0.5) return 'medium';
  if (confidence >= 0.35) return 'weak';
  return 'fail';
}

function compactSkill(skill) {
  if (!skill) return null;
  return {
    skill_id: skill.skill_id,
    confidence: skill.confidence,
    confidence_tier: skill.confidence_tier || confidenceTier(skill.confidence || 0),
    category: skill.category,
    resolved_path: skill.resolved_path,
    match_reasons: (skill.match_reasons || []).slice(0, 5)
  };
}

function fallbackCode(routed, route) {
  if (routed.status !== 'success') return routed.fallback_code || 'ROUTER_ERROR';
  const top = route?.selected_skill;
  if (!top) return routed.fallback_code || 'NO_CANDIDATE';
  if (!top.resolved_path || !fs.existsSync(top.resolved_path)) return 'INVALID_SKILL_PATH';
  if (top.confidence_tier === 'fail') return routed.fallback_code || 'LOW_CONFIDENCE';
  if (top.confidence_tier === 'weak') return routed.fallback_code || 'WEAK_CONFIDENCE';
  return routed.fallback_code || null;
}

function buildRouteFromRouted(routed, extra = {}) {
  const candidates = (routed.results || []).slice(0, 3).map(compactSkill);
  const selected = candidates[0] || null;
  return {
    ...extra,
    status: routed.status,
    selected_skill: selected,
    alternatives: candidates.slice(1),
    fallback_code: null,
    fallback_recommendation: routed.fallback_recommendation || null
  };
}

function validationForSingle(routed, route, intentHash) {
  const checks = [
    { name: 'source wrapper', status: 'pass', value: 'mosa_route.js' },
    { name: 'intent hash present', status: intentHash ? 'pass' : 'fail' },
    { name: 'not reconstructed', status: routed.status === 'reconstructed' ? 'fail' : 'pass' },
    {
      name: 'skill path exists',
      status: route?.selected_skill?.resolved_path && fs.existsSync(route.selected_skill.resolved_path) ? 'pass' : 'fail',
      value: route?.selected_skill?.resolved_path || null
    }
  ];
  return { checks, passed: checks.every(check => check.status === 'pass') };
}

function validationForDag(routes, intentHash, workflowPlan) {
  const checks = [
    { name: 'source wrapper', status: 'pass', value: 'mosa_route.js' },
    { name: 'intent hash present', status: intentHash ? 'pass' : 'fail' },
    { name: 'workflow plan valid', status: workflowPlan?.matches_intent ? 'pass' : 'fail', value: workflowPlan?.path || null },
    {
      name: 'selected skill paths exist',
      status: routes.every(route => !route.selected_skill || fs.existsSync(route.selected_skill.resolved_path)) ? 'pass' : 'fail'
    }
  ];
  return { checks, passed: checks.every(check => check.status === 'pass') };
}

function runSearch(scriptPath, workspaceRoot, intent) {
  const raw = execFileSync(process.execPath, [scriptPath, JSON.stringify(intent)], {
    cwd: workspaceRoot,
    encoding: 'utf8'
  });
  return JSON.parse(raw);
}

function loadRoutingIndex(workspaceRoot) {
  const index = readJson(path.join(workspaceRoot, '02_Output/routing_index_light.json'), null);
  return Array.isArray(index?.skills) ? index.skills : [];
}

function skillIdToPath(skillId) {
  const folder = String(skillId || '').toLowerCase().replace(/_/g, '-');
  return path.join(os.homedir(), '.codex', 'skills', folder, 'SKILL.md');
}

function applyWorkflowPreferredBoost(routed, preferredSkillIds = [], indexSkills = []) {
  const preferred = new Set((preferredSkillIds || []).map(skillId => String(skillId || '').toUpperCase()));
  if (!preferred.size || !Array.isArray(routed?.results)) return routed;
  const existing = new Set(routed.results.map(skill => String(skill.skill_id || '').toUpperCase()));
  const injected = indexSkills
    .filter(skill => preferred.has(String(skill.skill_id || '').toUpperCase()) && !existing.has(String(skill.skill_id || '').toUpperCase()))
    .map(skill => ({
      ...skill,
      confidence: 0.8,
      confidence_tier: 'strong',
      resolved_path: skillIdToPath(skill.skill_id),
      match_reasons: ['workflow-preferred-skill']
    }))
    .filter(skill => fs.existsSync(skill.resolved_path));
  return {
    ...routed,
    results: [...routed.results, ...injected]
      .map(skill => {
        const skillId = String(skill.skill_id || '').toUpperCase();
        if (!preferred.has(skillId)) return skill;
        const matchReasons = Array.from(new Set(['workflow-preferred-skill', ...(skill.match_reasons || [])]));
        const confidence = Math.min(0.99, Math.max(skill.confidence || 0, 0.8));
        return {
          ...skill,
          confidence,
          confidence_tier: confidenceTier(confidence),
          match_reasons: matchReasons
        };
      })
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
  };
}

function routeDag(scriptPath, workspaceRoot, baseIntent, workflowPlan) {
  if (!workflowPlan?.matches_intent || !Array.isArray(workflowPlan.plan.router_hints)) return [];
  const indexSkills = loadRoutingIndex(workspaceRoot);
  return workflowPlan.plan.router_hints.map(hint => {
    const nodeIntent = {
      intent_summary: `${hint.node_id}: ${hint.required_capability || ''}`,
      atomic_keywords: hint.atomic_keywords || [],
      preferred_domain: baseIntent.preferred_domain || '',
      required_capability: hint.required_capability || '',
      exclusions: baseIntent.exclusions || [],
      preferred_skill_ids: hint.preferred_skill_ids || []
    };
    const routed = applyWorkflowPreferredBoost(runSearch(scriptPath, workspaceRoot, nodeIntent), hint.preferred_skill_ids || [], indexSkills);
    const route = buildRouteFromRouted(routed, {
      node_id: hint.node_id,
      capability: hint.required_capability || hint.node_id
    });
    route.fallback_code = fallbackCode(routed, route);
    return route;
  });
}

function missingSkillSuggestions(workflowPlan, routes) {
  const planMissing = workflowPlan?.matches_intent ? workflowPlan.plan.missing_skills || [] : [];
  const routeMissing = routes
    .filter(route => !route.selected_skill || ['fail', 'weak'].includes(route.selected_skill.confidence_tier))
    .map(route => ({
      node_id: route.node_id,
      missing_capability: route.capability,
      suggested_skill_id: `${String(route.node_id || 'missing').replace(/_/g, '-')}-agent`,
      recommended_action: 'suggest_create_skill',
      priority: 'medium'
    }));
  return [...planMissing, ...routeMissing];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const workspaceRoot = findWorkspaceRoot();
  const contextBus = readJson(path.join(workspaceRoot, '01_Work/context_bus.json'), {});
  const intent = buildIntent(args, contextBus);
  const intentHash = stableProfileHash(intent);
  const scriptPath = skillSearchScript();

  if (!fs.existsSync(scriptPath)) throw new Error(`Router script not found: ${scriptPath}`);

  const routed = runSearch(scriptPath, workspaceRoot, intent);
  const workflowPlan = loadWorkflowPlan(args, workspaceRoot);
  const dagRoutes = routeDag(scriptPath, workspaceRoot, intent, workflowPlan);
  const hasDag = dagRoutes.length > 0;
  const singleRoute = hasDag ? null : buildRouteFromRouted(routed);
  if (singleRoute) singleRoute.fallback_code = fallbackCode(routed, singleRoute);

  const compact = {
    schema_version: 'mosa.routing_result.v2',
    status: routed.status,
    created_at: new Date().toISOString(),
    source: 'mosa_route.js',
    engine_source: routed.source,
    intent_hash: intentHash,
    input: intent,
    route_type: hasDag ? 'dag' : 'single',
    fallback_code: hasDag ? dagRoutes.find(route => route.fallback_code)?.fallback_code || null : singleRoute.fallback_code,
    fallback_recommendation: routed.fallback_recommendation || null,
    validation: hasDag
      ? validationForDag(dagRoutes, intentHash, workflowPlan)
      : validationForSingle(routed, singleRoute, intentHash)
  };

  if (hasDag) {
    compact.workflow_plan = { path: workflowPlan.path, valid: workflowPlan.matches_intent };
    compact.dag_routes = dagRoutes;
    compact.missing_skills = missingSkillSuggestions(workflowPlan, dagRoutes);
  } else {
    compact.single_route = singleRoute;
  }
  if (args.verbose) compact.raw_result_count = (routed.results || []).length;

  writeJson(path.join(workspaceRoot, '01_Work/routing_result.json'), compact);
  console.log(JSON.stringify(compact, null, 2));
}

main();
