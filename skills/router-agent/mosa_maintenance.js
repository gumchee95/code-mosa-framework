const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * 健壮性升级：多层级向上递归寻找 MOSA 工作空间根目录
 * 验证标准：必须包含 00_System/state.json
 */
function findWorkspaceRoot() {
    let curr = process.cwd();
    const rootDir = path.parse(curr).root;
    
    while (curr !== rootDir) {
        if (fs.existsSync(path.join(curr, '00_System', 'state.json'))) {
            return curr;
        }
        const parent = path.dirname(curr);
        if (parent === curr) break;
        curr = parent;
    }
    return null;
}

const root = findWorkspaceRoot();
const HOME = os.homedir();
const SKILLS_BASE = path.join(HOME, '.gemini', 'antigravity', 'skills');
const REGISTRY_FILE = path.join(SKILLS_BASE, 'skills_registry.json');
const MAINTENANCE_LOG = root ? path.join(root, '02_Output', 'maintenance.log') : null;

function log(msg) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${msg}`;
    console.log(formatted);
    if (MAINTENANCE_LOG) {
        fs.appendFileSync(MAINTENANCE_LOG, formatted + '\n');
    }
}

function runMaintenance() {
    if (!root) {
        console.error('[MOSA Critical] No MOSA workspace detected. Aborting maintenance.');
        process.exit(1);
    }

    log(`MOSA root detected at: ${root}`);
    log('Starting full framework re-indexing...');
    
    // 0. Token Shield Check
    const graphReportPath = path.join(root, 'graphify-out', 'GRAPH_REPORT.md');
    if (fs.existsSync(graphReportPath)) {
        log('Token Shield Status: ACTIVE (GRAPH_REPORT.md found)');
    } else {
        log('Token Shield Status: INACTIVE (Missing GRAPH_REPORT.md)');
    }

    // 1. Sync Skill Shards
    try {
        log('Phase 1: Skill Sharding...');
        if (!fs.existsSync(REGISTRY_FILE)) {
            throw new Error(`Registry file not found at ${REGISTRY_FILE}`);
        }

        const outputDir = path.join(SKILLS_BASE, 'registry');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
        const shards = {};
        const index = { 
            categories: {}, 
            all_tags: {}, 
            lastUpdated: new Date().toISOString(),
            token_shield: fs.existsSync(graphReportPath)
        };

        registry.forEach(skill => {
            const cat = (skill.category || 'Uncategorized').toLowerCase();
            if (!shards[cat]) shards[cat] = [];
            shards[cat].push(skill);
            if (!index.categories[cat]) index.categories[cat] = 0;
            index.categories[cat]++;
            
            (skill.tags || []).forEach(tag => {
                const t = tag.toLowerCase();
                if (!index.all_tags[t]) index.all_tags[t] = [];
                if (!index.all_tags[t].includes(cat)) index.all_tags[t].push(cat);
            });
        });

        for (const [cat, skills] of Object.entries(shards)) {
            fs.writeFileSync(path.join(outputDir, cat + '.json'), JSON.stringify(skills, null, 4));
        }
        fs.writeFileSync(path.join(outputDir, '_index.json'), JSON.stringify(index, null, 4));
        
        log('Phase 1 Complete: Skill Sharding updated.');
    } catch (e) {
        log(`Phase 1 Failed: ${e.message}`);
    }

    // 2. State Integrity Audit
    try {
        log('Phase 2: State Integrity Audit...');
        const stateFile = path.join(root, '00_System', 'state.json');
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        log(`Current Workspace State: Turn=${state.turn_count}, Threshold=${state.drift_threshold}`);
    } catch (e) {
        log(`Phase 2 Failed: ${e.message}`);
    }

    // 3. Tag Collision Shield
    try {
        log('Phase 3: Tag Collision Shield...');
        const shieldScript = path.join(__dirname, 'mosa_tag_shield.js');
        const shieldOutput = execSync(`node "${shieldScript}"`, { encoding: 'utf8' });
        shieldOutput.split('\n').forEach(line => {
            if (line.trim()) log(`[Shield] ${line}`);
        });
    } catch (e) {
        log(`Phase 3 Failed: ${e.message}`);
    }

    // 4. Automated Graph Rebuild
    try {
        log('Phase 4: Programmatic Graph Rebuilding...');
        const builderScript = path.join(__dirname, 'mosa_graph_builder.js');
        const builderOutput = execSync(`node "${builderScript}" "${root}"`, { encoding: 'utf8' });
        builderOutput.split('\n').forEach(line => {
            if (line.trim()) log(`[Graph] ${line}`);
        });
    } catch (e) {
        log(`Phase 4 Failed: ${e.message}`);
    }

    log('MOSA Maintenance Cycle Finished.');
    console.log('[Status: Success]');
}

runMaintenance();
