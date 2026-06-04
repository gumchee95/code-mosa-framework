#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

function parseArgs(argv) {
  const args = { intent: '', verbose: false, domain: '', capability: '', keywords: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--verbose') args.verbose = true;
    else if (argv[i] === '--intent') args.intent = argv[++i] || '';
    else if (argv[i] === '--domain') args.domain = argv[++i] || '';
    else if (argv[i] === '--capability') args.capability = argv[++i] || '';
    else if (argv[i] === '--keywords') args.keywords = (argv[++i] || '').split(',').map(item => item.trim()).filter(Boolean);
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
  return {
    intent_summary: intentSummary,
    atomic_keywords: args.keywords.length ? args.keywords : contextBus.atomic_keywords || [],
    preferred_domain: args.domain || (intentSummary.toLowerCase().includes('mosa') ? 'workflow' : ''),
    required_capability: args.capability || 'route to the most relevant MOSA skill with compact JSON output',
    exclusions: []
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
  const top = routed.results?.[0] || null;
  const code = fallbackCode(routed, top);
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
    top_skill: compactSkill(top),
    candidates: (routed.results || []).slice(0, 3).map(compactSkill),
    fallback_code: code,
    fallback_recommendation: routed.fallback_recommendation || null,
    validation: validationFor(routed, top, intentHash),
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
