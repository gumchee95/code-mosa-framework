#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

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

function distillerScript() {
  return path.join(os.homedir(), '.codex', 'skills', 'base-distiller', 'scripts', 'distill_logic.js');
}

function main() {
  const root = findWorkspaceRoot(process.cwd());
  const scriptPath = distillerScript();
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Registry Distiller script not found: ${scriptPath}`);
  }

  const raw = execFileSync(process.execPath, [scriptPath], {
    cwd: root,
    encoding: 'utf8'
  });
  const distiller = JSON.parse(raw);
  const report = readJson(distiller.report_json, {});
  const promotion = readJson(path.join(root, '01_Work', 'promotion_result.json'), {});
  const summary = distiller.summary || report.summary || {};
  const blockingIssues = [
    Number(summary.missing_files || 0) > 0 ? 'missing_files' : null,
    Number(summary.collisions || 0) > 0 ? 'tag_collisions' : null,
    Number(summary.orphans || 0) > 0 ? 'orphan_skills' : null
  ].filter(Boolean);

  const result = {
    status: blockingIssues.length ? 'warning' : 'pass',
    generated_at: new Date().toISOString(),
    mode: 'read-only',
    candidate_skill_id: promotion.candidate_skill_id || null,
    registry_mutation_allowed: false,
    registry_mutation_required: Boolean(promotion.registry_check_required),
    user_confirmation_required: Boolean(promotion.user_confirmation_required),
    blocking_issues: blockingIssues,
    summary: {
      registered: summary.registered || 0,
      missing_files: summary.missing_files || 0,
      collisions: summary.collisions || 0,
      orphans: summary.orphans || 0
    },
    reports: {
      report_json: distiller.report_json,
      report_markdown: distiller.report_markdown,
      routing_index_light: distiller.routing_index_light,
      active_skill_index: distiller.active_skill_index,
      startup_manifest: distiller.startup_manifest,
      token_budget_report: distiller.token_budget_report
    },
    next_agent_action: blockingIssues.length
      ? 'review Registry Distiller report before skill creation'
      : 'safe to proceed to user confirmation gate'
  };

  writeJson(path.join(root, '01_Work', 'registry_check_result.json'), result);
  console.log(JSON.stringify(result, null, 2));
}

main();
