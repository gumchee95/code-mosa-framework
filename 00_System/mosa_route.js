#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

function parseArgs(argv) {
  const args = { intent: '', verbose: false, domain: '', capability: '', keywords: [], workflowPlan: '' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--verbose') args.verbose = true;
    else if (argv[i] === '--intent') args.intent = argv[++i] || '';
    else if (argv[i] === '--domain') args.domain = argv[++i] || '';
    else if (argv[i] === '--capability') args.capability = argv[++i] || '';
    else if (argv[i] === '--keywords') args.keywords = (argv[++i] || '').split(',').map(item => item.trim()).filter(Boolean);
    else if (argv[i] === '--workflow-plan') args.workflowPlan = argv[++i] || '';
    else if (!args.intent) args.intent = argv[i];
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

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function stableIntentHash(intent) {
  return crypto
    .createHash('sha1')
    .update(JSON.stringify({
      intent_summary: intent.intent_summary || '',
      atomic_keywords: intent.atomic_keywords || [],
      preferred_domain: intent.preferred_domain || '',
      required_capability: intent.required_capability || '',
      exclusions: intent.exclusions || []
    }))
    .digest('hex');
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

function loadWorkflowPlan(args, workspaceRoot, intentHash) {
  const planPath = resolveWorkspacePath(workspaceRoot, args.workflowPlan);
  if (!planPath || !fs.existsSync(planPath)) return null;
  const plan = readJson(planPath, null);
  if (!plan || typeof plan !== 'object') return null;
  const rawIntentHash = crypto.createHash('sha1').update(args.intent || '').digest('hex');
  const matchesIntent = plan.intent_hash === intentHash || plan.intent_fingerprint === rawIntentHash;
  return {
    path: path.relative(workspaceRoot, planPath).replace(/\\/g, '/'),
    plan,
    matches_intent: matchesIntent
  };
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

function compactNodeRoute(node, routed) {
  const top = routed.results?.[0] || null;
  return {
    node_id: node.node_id,
    capability: node.required_capability || node.capability || node.label || node.node_id,
    status: routed.status,
    top_skill: compactSkill(top),
    candidates: (routed.results || []).slice(0, 3).map(compactSkill),
    fallback_code: fallbackCode(routed, top),
    fallback_recommendation: routed.fallback_recommendation || null
  };
}

function routeWorkflowNodes(scriptPath, workspaceRoot, baseIntent, workflowPlan) {
  if (!workflowPlan?.plan?.router_hints?.length || !workflowPlan.matches_intent) {
    return { node_routes: [], missing_skill_suggestions: workflowPlan?.plan?.skill_growth_suggestions || [] };
  }

  const nodeRoutes = [];
  const missing = [...(workflowPlan.plan.skill_growth_suggestions || [])];
  for (const node of workflowPlan.plan.router_hints) {
    const nodeIntent = {
      intent_summary: `${node.node_id}: ${node.required_capability || node.capability || ''}`,
      atomic_keywords: node.atomic_keywords || node.keywords || [],
      preferred_domain: node.preferred_domain || baseIntent.preferred_domain || '',
      required_capability: node.required_capability || node.capability || '',
      exclusions: baseIntent.exclusions || [],
      preferred_skill_ids: node.preferred_skill_ids || []
    };
    const raw = execFileSync(process.execPath, [scriptPath, JSON.stringify(nodeIntent)], {
      cwd: workspaceRoot,
      encoding: 'utf8'
    });
    const routed = JSON.parse(raw);
    const route = compactNodeRoute(node, routed);
    nodeRoutes.push(route);
    if (!route.top_skill || ['fail', 'weak'].includes(route.top_skill.confidence_tier)) {
      missing.push({
        missing_capability: node.node_id,
        suggested_skill_id: node.suggested_skill_id || `${node.node_id.replace(/_/g, '-')}-agent`,
        reason: `No medium-confidence skill route for capability: ${route.capability}`,
        recommended_action: 'suggest_create_skill',
        priority: node.priority || 'medium'
      });
    }
  }
  return { node_routes: nodeRoutes, missing_skill_suggestions: missing };
}

function confidenceTier(confidence) {
  if (confidence >= 0.8) return 'strong';
  if (confidence >= 0.5) return 'medium';
  if (confidence >= 0.35) return 'weak';
  return 'fail';
}

function fallbackCode(routed, topSkill) {
  if (routed.status !== 'success') return routed.fallback_code || 'ROUTER_ERROR';
  if (!topSkill) return routed.fallback_code || 'NO_CANDIDATE';
  if (!topSkill.resolved_path || !fs.existsSync(topSkill.resolved_path)) return 'INVALID_SKILL_PATH';
  const tier = confidenceTier(topSkill.confidence || 0);
  if (tier === 'fail') return routed.fallback_code || 'LOW_CONFIDENCE';
  if (tier === 'weak') return routed.fallback_code || 'WEAK_CONFIDENCE';
  return routed.fallback_code || null;
}

function validationFor(routed, topSkill, intentHash) {
  const checks = [];
  checks.push({ name: 'source wrapper', status: 'pass', value: 'mosa_route.js' });
  checks.push({ name: 'intent hash present', status: intentHash ? 'pass' : 'fail' });
  checks.push({ name: 'not reconstructed', status: routed.status === 'reconstructed' ? 'fail' : 'pass' });
  checks.push({
    name: 'skill path exists',
    status: topSkill?.resolved_path && fs.existsSync(topSkill.resolved_path) ? 'pass' : 'fail',
    value: topSkill?.resolved_path || null
  });
  return {
    checks,
    passed: checks.every(check => check.status === 'pass')
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const contextPath = path.join(workspaceRoot, '01_Work', 'context_bus.json');
  const contextBus = readJson(contextPath, {});
  const intent = buildIntent(args, contextBus);
  const scriptPath = skillSearchScript();

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Router script not found: ${scriptPath}`);
  }

  const raw = execFileSync(process.execPath, [scriptPath, JSON.stringify(intent)], {
    cwd: workspaceRoot,
    encoding: 'utf8'
  });
  const routed = JSON.parse(raw);
  const intentHash = stableIntentHash(intent);
  const workflowPlan = loadWorkflowPlan(args, workspaceRoot, intentHash);
  const workflowRoutes = routeWorkflowNodes(scriptPath, workspaceRoot, intent, workflowPlan);
  const top = routed.results?.[0] || null;
  const routedCandidates = (routed.results || []).slice(0, 3).map(compactSkill);
  const effectiveTop = workflowRoutes.node_routes[0]?.top_skill || compactSkill(top);
  const effectiveCandidates = workflowRoutes.node_routes[0]?.candidates?.length
    ? workflowRoutes.node_routes[0].candidates
    : routedCandidates;
  const code = workflowRoutes.node_routes.length ? workflowRoutes.node_routes[0].fallback_code : fallbackCode(routed, top);
  const compact = {
    schema_version: 'mosa.routing_result.v1',
    status: routed.status,
    created_at: new Date().toISOString(),
    generated_at: new Date().toISOString(),
    source: 'mosa_route.js',
    engine_source: routed.source,
    intent_hash: intentHash,
    input: intent,
    active_modes: routed.active_modes || [],
    workflow_plan_id: workflowPlan?.plan?.plan_id || null,
    workflow_plan_path: workflowPlan?.path || null,
    workflow_plan_valid: workflowPlan ? workflowPlan.matches_intent : null,
    top_skill: effectiveTop,
    candidates: effectiveCandidates,
    flat_candidates: routedCandidates,
    node_routes: workflowRoutes.node_routes,
    collaboration_order: workflowPlan?.matches_intent ? workflowPlan.plan.collaboration_order || [] : [],
    missing_skill_suggestions: workflowRoutes.missing_skill_suggestions,
    fallback_code: code,
    fallback_recommendation: routed.fallback_recommendation || null,
    validation: validationFor(routed, effectiveTop, intentHash),
    next_agent_action: routed.fallback_recommendation
      ? 'run Registry Distiller or ask user for clarification'
      : confidenceTier(top?.confidence || 0) === 'strong'
      ? 'load selected skill only if execution requires full SOP'
      : 'require Orchestrator review before dispatch'
  };
  if (args.verbose) compact.raw_results = routed.results || [];

  const outputPath = path.join(workspaceRoot, '01_Work', 'routing_result.json');
  writeJson(outputPath, compact);
  console.log(JSON.stringify(compact, null, 2));
}

main();
