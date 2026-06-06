#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL_FILES = [
  'mosa_cli.js',
  'mosa_startup.js',
  'mosa_route.js',
  'mosa_promotion.js',
  'mosa_registry_check.js'
];

const LIGHT_ARTIFACTS = [
  'startup_manifest.json',
  'routing_index_light.json',
  'reference_map_light.json',
  'mode_profiles.json',
  'active_skill_index.json'
];

function parseArgs(argv) {
  const args = {
    target: '',
    intent: '',
    domain: '',
    capability: '',
    keywords: '',
    run: false,
    verbose: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--target') args.target = argv[++i] || '';
    else if (item === '--intent') args.intent = argv[++i] || '';
    else if (item === '--domain') args.domain = argv[++i] || '';
    else if (item === '--capability') args.capability = argv[++i] || '';
    else if (item === '--keywords') args.keywords = argv[++i] || '';
    else if (item === '--run') args.run = true;
    else if (item === '--verbose') args.verbose = true;
    else if (!args.target) args.target = item;
  }
  if (!args.target) args.target = process.cwd();
  return args;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sourceDir() {
  return __dirname;
}

function sourceRoot() {
  return path.resolve(__dirname, '..');
}

function copyTools(targetRoot) {
  const copied = [];
  const targetSystem = path.join(targetRoot, '00_System');
  ensureDir(targetSystem);

  for (const fileName of TOOL_FILES) {
    const src = path.join(sourceDir(), fileName);
    const dest = path.join(targetSystem, fileName);
    if (!fs.existsSync(src)) {
      copied.push({ file: fileName, status: 'missing_source' });
      continue;
    }
    fs.copyFileSync(src, dest);
    copied.push({ file: fileName, status: 'copied', path: path.relative(targetRoot, dest).replace(/\\/g, '/') });
  }
  return copied;
}

function copyLightArtifacts(targetRoot) {
  const copied = [];
  const sourceOutput = path.join(sourceRoot(), '02_Output');
  const targetOutput = path.join(targetRoot, '02_Output');
  ensureDir(targetOutput);

  for (const fileName of LIGHT_ARTIFACTS) {
    const src = path.join(sourceOutput, fileName);
    const dest = path.join(targetOutput, fileName);
    if (!fs.existsSync(src)) {
      copied.push({ file: fileName, status: 'missing_source' });
      continue;
    }
    fs.copyFileSync(src, dest);
    copied.push({
      file: fileName,
      status: 'copied',
      path: path.relative(targetRoot, dest).replace(/\\/g, '/'),
      bytes: fs.statSync(dest).size
    });
  }
  return copied;
}

function ensureWorkspaceFiles(targetRoot) {
  const systemDir = path.join(targetRoot, '00_System');
  const workDir = path.join(targetRoot, '01_Work');
  const outputDir = path.join(targetRoot, '02_Output');
  ensureDir(systemDir);
  ensureDir(workDir);
  ensureDir(outputDir);

  const statePath = path.join(systemDir, 'state.json');
  if (!fs.existsSync(statePath)) writeJson(statePath, { turn_count: 0, drift_threshold: 20 });

  const routingCachePath = path.join(systemDir, 'routing_cache.json');
  if (!fs.existsSync(routingCachePath)) writeJson(routingCachePath, {});

  const contextPath = path.join(workDir, 'context_bus.json');
  if (!fs.existsSync(contextPath)) {
    writeJson(contextPath, {
      _meta: {
        version: 'mosa.context_bus.v2',
        lifecycle: 'ephemeral',
        graph_context: null
      },
      shared_facts: {},
      agent_outputs: {},
      handoff: {}
    });
  }

  const taskPath = path.join(workDir, 'task.md');
  if (!fs.existsSync(taskPath)) {
    fs.writeFileSync(taskPath, '[Pipeline Trace]: NodeProvision > NodeStartup > NodeRoute\n\n## TODO\n- [ ] Run MOSA startup\n- [ ] Run MOSA route\n', 'utf8');
  }

  const resultsPath = path.join(workDir, 'task_results.md');
  if (!fs.existsSync(resultsPath)) {
    fs.writeFileSync(resultsPath, '[Status: Pending]\n[Data: Node provision initialized]\n[Next_Step: Run startup and route]\n', 'utf8');
  }
}

function runNode(targetRoot, script, args) {
  const scriptPath = path.join(targetRoot, '00_System', script);
  if (!fs.existsSync(scriptPath)) return { script, status: 'missing' };
  try {
    const stdout = execFileSync(process.execPath, [scriptPath, ...args], {
      cwd: targetRoot,
      encoding: 'utf8'
    });
    return { script, status: 'ok', output: JSON.parse(stdout) };
  } catch (error) {
    return {
      script,
      status: 'failed',
      message: error.message,
      stdout: error.stdout ? String(error.stdout).slice(0, 1000) : ''
    };
  }
}

function compactRunResult(run) {
  if (!run) return null;
  const output = run.output || {};
  if (run.status !== 'ok') {
    return {
      script: run.script,
      status: run.status,
      message: run.message || null
    };
  }
  if (run.script === 'mosa_startup.js') {
    return {
      script: run.script,
      status: run.status,
      workspace_root: output.workspace_root,
      startup_result: '01_Work/startup_result.json',
      context_bus: '01_Work/context_bus.json',
      available_hot_artifact_token_estimate: output.available_hot_artifact_token_estimate || null,
      expected_startup_read_tokens: output.expected_startup_read_tokens || null,
      drift_check: output.drift_check
    };
  }
  if (run.script === 'mosa_route.js') {
    const selected = output.single_route?.selected_skill
      || output.dag_routes?.find(route => route.selected_skill)?.selected_skill
      || null;
    return {
      script: run.script,
      status: run.status,
      routing_result: '01_Work/routing_result.json',
      router_source: output.engine_source || output.source,
      schema_version: output.schema_version || null,
      route_type: output.route_type || null,
      selected_skill: selected?.skill_id || null,
      confidence_tier: selected?.confidence_tier || null,
      validation_passed: output.validation?.passed ?? null
    };
  }
  return {
    script: run.script,
    status: run.status
  };
}

function compactProvisionResult(result) {
  return {
    status: result.status,
    generated_at: result.generated_at,
    target_root: result.target_root,
    copied_tools: result.copied_tools.map(item => ({
      file: item.file,
      status: item.status,
      path: item.path || null
    })),
    copied_light_artifacts: result.copied_light_artifacts.map(item => ({
      file: item.file,
      status: item.status,
      path: item.path || null,
      bytes: item.bytes || 0
    })),
    workspace_files: result.workspace_files,
    run_results: result.run_results.map(compactRunResult),
    cold_start_policy: result.cold_start_policy,
    proof_pointers: {
      provision_result: '01_Work/provision_result.json',
      startup_result: '01_Work/startup_result.json',
      context_bus: '01_Work/context_bus.json',
      routing_result: '01_Work/routing_result.json'
    },
    next_step: result.next_step,
    verbose_hint: 'rerun with --verbose to print nested startup and route JSON'
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetRoot = path.resolve(args.target);
  ensureWorkspaceFiles(targetRoot);
  const copied = copyTools(targetRoot);
  const copiedLightArtifacts = copyLightArtifacts(targetRoot);

  const runResults = [];
  if (args.run) {
    runResults.push(runNode(targetRoot, 'mosa_startup.js', ['--intent', args.intent || 'MOSA workspace startup', '--write']));
    const routeArgs = [];
    if (args.intent) routeArgs.push('--intent', args.intent);
    if (args.domain) routeArgs.push('--domain', args.domain);
    if (args.capability) routeArgs.push('--capability', args.capability);
    if (args.keywords) routeArgs.push('--keywords', args.keywords);
    runResults.push(runNode(targetRoot, 'mosa_route.js', routeArgs));
  }

  const result = {
    status: 'ok',
    generated_at: new Date().toISOString(),
    target_root: targetRoot,
    copied_tools: copied,
    copied_light_artifacts: copiedLightArtifacts,
    workspace_files: {
      state: '00_System/state.json',
      routing_cache: '00_System/routing_cache.json',
      task: '01_Work/task.md',
      task_results: '01_Work/task_results.md',
      context_bus: '01_Work/context_bus.json'
    },
    run_results: runResults,
    cold_start_policy: 'light artifacts copied when available; full registry reports remain cold diagnostics',
    next_step: args.run
      ? 'inspect startup_result.json and routing_result.json'
      : 'run target 00_System/mosa_startup.js and mosa_route.js'
  };

  const provisionPath = path.join(targetRoot, '01_Work', 'provision_result.json');
  writeJson(provisionPath, result);
  console.log(JSON.stringify(args.verbose ? result : compactProvisionResult(result), null, 2));
}

main();
