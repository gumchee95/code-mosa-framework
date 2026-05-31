const fs = require('fs');
const path = require('path');
const {
    resolveSkillRoot,
    resolveLegacySkillRoot,
    resolveSkillPath,
    findWorkspaceRoot
} = require('../../router-agent/mosa_paths');

function loadJson(filePath, fallback = null) {
    if (!filePath || !fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function normalizeTag(tag) {
    return String(tag || '')
        .toLowerCase()
        .trim()
        .replace(/[_\s]+/g, '-')
        .replace(/ing$/, '')
        .replace(/s$/, '');
}

function readFrontmatter(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^---\s*([\s\S]*?)\s*---/);
    if (!match) return {};
    const result = {};
    for (const line of match[1].split(/\r?\n/)) {
        const parts = line.split(':');
        if (parts.length >= 2) result[parts.shift().trim()] = parts.join(':').trim().replace(/^['"]|['"]$/g, '');
    }
    return result;
}

function capabilityPhrases(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8').slice(0, 16000);
    const phrases = [];
    const description = content.match(/^description:\s*(.+)$/mi)?.[1];
    if (description) phrases.push(description.trim());
    for (const heading of content.matchAll(/^#{1,3}\s+(.+)$/gmi)) {
        phrases.push(heading[1].trim());
    }
    return [...new Set(phrases)].slice(0, 12);
}

function findSkillDirectories(skillRoot) {
    if (!skillRoot || !fs.existsSync(skillRoot)) return [];
    return fs.readdirSync(skillRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(skillRoot, entry.name))
        .filter(dir => fs.existsSync(path.join(dir, 'SKILL.md')));
}

function analyzeRegistry(skillRoot) {
    const registryPath = path.join(skillRoot, 'skills_registry.json');
    const registry = loadJson(registryPath, []);
    const missingFiles = [];
    const normalizedTags = {};
    const aliasMap = {};
    const collisions = [];
    const registrySkillDirs = new Set();
    const skillSummaries = [];

    for (const skill of registry) {
        const resolved = resolveSkillPath(skill.filepath || '');
        const exists = fs.existsSync(resolved);
        if (!exists) missingFiles.push({ skill_id: skill.skill_id, filepath: skill.filepath });
        if (exists) registrySkillDirs.add(path.dirname(resolved).toLowerCase());

        const tags = skill.tags || [];
        for (const tag of tags) {
            const normalized = normalizeTag(tag);
            if (!normalizedTags[normalized]) normalizedTags[normalized] = [];
            if (!normalizedTags[normalized].includes(tag)) normalizedTags[normalized].push(tag);
            aliasMap[tag] = normalized;
        }

        skillSummaries.push({
            skill_id: skill.skill_id,
            filepath: skill.filepath,
            resolved_path: resolved,
            category: skill.category,
            tags,
            route_policy: skill.route_policy || null,
            consolidated_into: skill.consolidated_into || null,
            master_skill: skill.master_skill || null,
            reference_role: skill.reference_role || null,
            reference_reason: skill.reference_reason || null,
            archive_reason: skill.archive_reason || null,
            mosa_reference_target: skill.mosa_reference_target || null,
            exact_triggers: skill.exact_triggers || [],
            normalized_tags: tags.map(normalizeTag),
            capability_phrases: capabilityPhrases(resolved)
        });
    }

    for (let i = 0; i < registry.length; i++) {
        for (let j = i + 1; j < registry.length; j++) {
            const a = registry[i];
            const b = registry[j];
            const tagsA = new Set((a.tags || []).map(normalizeTag));
            const tagsB = new Set((b.tags || []).map(normalizeTag));
            if (!tagsA.size || !tagsB.size) continue;
            const shared = [...tagsA].filter(tag => tagsB.has(tag));
            const ratio = shared.length / Math.min(tagsA.size, tagsB.size);
            if (ratio >= 0.5 && (shared.length >= 2 || Math.min(tagsA.size, tagsB.size) === 1)) {
                collisions.push({
                    skill_a: a.skill_id,
                    skill_b: b.skill_id,
                    shared_tags: shared,
                    overlap_ratio: Number(ratio.toFixed(2))
                });
            }
        }
    }

    const orphanSkills = findSkillDirectories(skillRoot)
        .filter(dir => !registrySkillDirs.has(dir.toLowerCase()))
        .map(dir => ({
            directory: dir,
            metadata: readFrontmatter(path.join(dir, 'SKILL.md'))
        }));

    return {
        registry_path: registryPath,
        total_registered: registry.length,
        missing_files: missingFiles,
        normalized_tags: normalizedTags,
        alias_map: aliasMap,
        collision_report: collisions.slice(0, 100),
        orphan_report: orphanSkills,
        router_support: skillSummaries
    };
}

function renderMarkdown(report) {
    const lines = [];
    lines.push('# Registry Distiller Read-Only Diagnostics');
    lines.push('');
    lines.push(`- Date: ${new Date().toISOString()}`);
    lines.push(`- Primary skill root: ${report.primary_skill_root || 'not found'}`);
    lines.push(`- Legacy skill root: ${report.legacy_skill_root || 'not found'}`);
    lines.push(`- Registered skills: ${report.registry.total_registered}`);
    lines.push(`- Missing files: ${report.registry.missing_files.length}`);
    lines.push(`- Tag collisions: ${report.registry.collision_report.length}`);
    lines.push(`- Orphan skills: ${report.registry.orphan_report.length}`);
    lines.push('');
    lines.push('## Router Support Artifacts');
    lines.push('');
    lines.push('- `normalized_tags`: canonical tag buckets.');
    lines.push('- `alias_map`: raw tag to normalized tag.');
    lines.push('- `router_support`: skill capabilities extracted from metadata and headings.');
    lines.push('- `collision_report`: high-overlap tag pairs for review.');
    lines.push('- `orphan_report`: disk skills not registered.');
    lines.push('- `router_support_light.json`: compact Router enhancement file.');
    lines.push('');
    lines.push('## Missing Files');
    lines.push('');
    if (report.registry.missing_files.length) {
        report.registry.missing_files.slice(0, 50).forEach(item => {
            lines.push(`- ${item.skill_id}: ${item.filepath}`);
        });
    } else {
        lines.push('- None');
    }
    lines.push('');
    lines.push('## Collision Sample');
    lines.push('');
    if (report.registry.collision_report.length) {
        report.registry.collision_report.slice(0, 25).forEach(item => {
            lines.push(`- ${item.skill_a} <> ${item.skill_b}: ${item.shared_tags.join(', ')} (${item.overlap_ratio})`);
        });
    } else {
        lines.push('- None');
    }
    lines.push('');
    lines.push('## Policy');
    lines.push('');
    lines.push('- Read-only diagnostics completed.');
    lines.push('- No registry JSON was modified.');
    lines.push('- Apply changes only after explicit user confirmation.');
    return lines.join('\n');
}

function buildRouterSupportLight(report) {
    const collisionTags = new Set(
        report.registry.collision_report.flatMap(item => item.shared_tags || [])
    );
    const normalizedTags = Object.fromEntries(
        Object.entries(report.registry.normalized_tags)
            .filter(([tag, variants]) => variants.length > 1 || collisionTags.has(tag))
            .slice(0, 100)
    );

    return {
        generated_at: new Date().toISOString(),
        primary_skill_root: report.primary_skill_root,
        summary: {
            registered: report.registry.total_registered,
            missing_files: report.registry.missing_files.length,
            collisions: report.registry.collision_report.length,
            orphans: report.registry.orphan_report.length
        },
        normalized_tags: normalizedTags,
        router_support: report.registry.router_support.map(skill => ({
            skill_id: skill.skill_id,
            filepath: skill.filepath,
            category: skill.category,
            tags: skill.tags,
            capability_phrases: skill.capability_phrases.slice(0, 3)
        })),
        collision_sample: report.registry.collision_report.slice(0, 25)
    };
}

function buildRouterSupportIndex(report) {
    return {
        generated_at: new Date().toISOString(),
        summary: {
            registered: report.registry.total_registered,
            missing_files: report.registry.missing_files.length,
            collisions: report.registry.collision_report.length,
            orphans: report.registry.orphan_report.length
        },
        skills: report.registry.router_support.map(skill => ({
            skill_id: skill.skill_id,
            filepath: skill.filepath,
            category: skill.category,
            tags: skill.tags
        }))
    };
}

function routePolicy(skill) {
    if (skill.consolidated_into || skill.master_skill) return String(skill.route_policy || 'reference').toLowerCase();
    return String(skill.route_policy || (String(skill.category || '').toLowerCase() === 'archived' ? 'archived' : 'active')).toLowerCase();
}

function isActiveSkill(skill) {
    const policy = routePolicy(skill);
    return policy === 'active' || policy === 'specialized';
}

function compactObject(value) {
    return Object.fromEntries(
        Object.entries(value).filter(([, item]) => {
            if (item === null || item === undefined || item === '') return false;
            if (Array.isArray(item) && item.length === 0) return false;
            return true;
        })
    );
}

function buildActiveSkillIndex(report) {
    return {
        generated_at: new Date().toISOString(),
        summary: {
            active_skills: report.registry.router_support.filter(isActiveSkill).length,
            total_registered: report.registry.total_registered,
            missing_files: report.registry.missing_files.length,
            collisions: report.registry.collision_report.length,
            orphans: report.registry.orphan_report.length
        },
        skills: report.registry.router_support
            .filter(isActiveSkill)
            .map(skill => compactObject({
                skill_id: skill.skill_id,
                filepath: skill.filepath,
                category: skill.category,
                tags: skill.tags,
                route_policy: routePolicy(skill) === 'active' ? null : routePolicy(skill),
                master_skill: skill.master_skill || null,
                mosa_reference_target: skill.mosa_reference_target || null,
                exact_triggers: skill.exact_triggers || []
            }))
    };
}

function buildReferenceMap(report) {
    const registry = loadJson(report.registry.registry_path, []);
    const references = {};
    const masters = {};

    for (const skill of registry) {
        const policy = routePolicy(skill);
        const master = skill.consolidated_into || skill.master_skill;
        if ((policy === 'reference' || policy === 'archived') && master) {
            references[skill.skill_id] = compactObject({
                master,
                role: skill.reference_role || 'reference',
                route_policy: policy,
                previous_category: skill.previous_category || skill.category || null,
                reference_reason: skill.reference_reason || null,
                archive_reason: skill.archive_reason || null,
                mosa_reference_target: skill.mosa_reference_target || null
            });
            if (!masters[master]) masters[master] = [];
            if (!masters[master].includes(skill.skill_id)) masters[master].push(skill.skill_id);
        }
        if (skill.references?.length) {
            if (!masters[skill.skill_id]) masters[skill.skill_id] = [];
            for (const reference of skill.references) {
                if (!masters[skill.skill_id].includes(reference)) masters[skill.skill_id].push(reference);
            }
        }
    }

    return {
        generated_at: new Date().toISOString(),
        references,
        masters
    };
}

function buildReferenceMapLight(referenceMap) {
    return {
        generated_at: new Date().toISOString(),
        references: Object.fromEntries(
            Object.entries(referenceMap.references || {}).map(([skillId, reference]) => [skillId, reference.master])
        )
    };
}

function buildRoutingIndexLight(report) {
    const activeSkills = report.registry.router_support.filter(isActiveSkill);
    return {
        generated_at: new Date().toISOString(),
        summary: {
            active_skills: activeSkills.length,
            total_registered: report.registry.total_registered,
            missing_files: report.registry.missing_files.length,
            collisions: report.registry.collision_report.length,
            orphans: report.registry.orphan_report.length
        },
        skills: activeSkills.map(skill => compactObject({
            skill_id: skill.skill_id,
            category: skill.category,
            tags: skill.tags,
            route_policy: routePolicy(skill) === 'active' ? null : routePolicy(skill),
            mosa_reference_target: skill.mosa_reference_target || null,
            exact_triggers: skill.exact_triggers || []
        }))
    };
}

function estimateTokens(bytes) {
    return Math.ceil(bytes / 4);
}

function fileSize(filePath) {
    return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
}

function buildStartupManifest(paths, report, activeIndex, routingLight, referenceLight) {
    return {
        generated_at: new Date().toISOString(),
        mosa_version: '2.6',
        startup_script: '00_System/mosa_startup.js',
        graph_report: 'graphify-out/GRAPH_REPORT.md',
        routing_index_light: '02_Output/routing_index_light.json',
        active_skill_index: '02_Output/active_skill_index.json',
        reference_map_light: '02_Output/reference_map_light.json',
        reference_map: '02_Output/reference_map.json',
        mode_profiles: '02_Output/mode_profiles.json',
        context_bus: '01_Work/context_bus.json',
        context_bus_template: '02_Output/context_bus_template.json',
        registry_distiller_report: '02_Output/registry_distiller_report.json',
        health: {
            active_skills: activeIndex.summary.active_skills,
            total_registered: report.registry.total_registered,
            references: Object.keys(referenceLight.references || {}).length,
            missing_files: report.registry.missing_files.length,
            collisions: report.registry.collision_report.length,
            orphans: report.registry.orphan_report.length
        },
        startup_order: [
            'AGENTS.md',
            '00_System/mosa_startup.js',
            '02_Output/startup_manifest.json',
            'graphify-out/GRAPH_REPORT.md',
            '00_System/prompt_stack.md',
            '01_Work/task.md',
            '01_Work/context_bus.json',
            '02_Output/routing_index_light.json'
        ],
        routing_read_order: [
            '00_System/routing_cache.json',
            '02_Output/routing_index_light.json',
            '02_Output/mode_profiles.json',
            '02_Output/reference_map_light.json',
            '02_Output/active_skill_index.json',
            'Skill skeleton',
            'Full Skill file'
        ],
        forbidden_startup_reads: [
            '02_Output/registry_distiller_report.json',
            '02_Output/registry_distiller_report.full.json',
            '02_Output/Archive/registry_distiller_report.full.json'
        ],
        cold_read_conditions: [
            'Router confidence < 0.35',
            'User requests registry audit',
            'missing_files/collisions/orphans > 0',
            'mosa-harmonizer maintenance mode'
        ],
        token_budget_limits_bytes: {
            'graphify-out/GRAPH_REPORT.md': 3072,
            '02_Output/startup_manifest.json': 5120,
            '02_Output/routing_index_light.json': 20480,
            '02_Output/reference_map_light.json': 5120,
            '02_Output/active_skill_index.json': 51200,
            '01_Work/context_bus.json': 8192
        }
    };
}

function buildTokenBudgetReport(outputDir, files, limits) {
    const workspaceRoot = path.dirname(outputDir);
    const items = files.map(relativePath => {
        const targetPath = relativePath.startsWith('graphify-out/') || relativePath.startsWith('01_Work/')
            ? path.join(workspaceRoot, relativePath)
            : path.join(outputDir, path.basename(relativePath));
        const bytes = fileSize(targetPath);
        const budgetKey = relativePath.startsWith('02_Output/') || relativePath.startsWith('graphify-out/') || relativePath.startsWith('01_Work/') ? relativePath : `02_Output/${relativePath}`;
        const limit = limits[budgetKey] || limits[relativePath] || null;
        return compactObject({
            file: relativePath,
            bytes,
            estimated_tokens: estimateTokens(bytes),
            limit_bytes: limit,
            status: limit && bytes > limit ? 'warning:over-budget' : 'ok'
        });
    });
    return {
        generated_at: new Date().toISOString(),
        policy: 'Startup reads must use hot/light artifacts. Full registry reports are cold diagnostics only.',
        files: items
    };
}

function buildModeProfiles() {
    return {
        generated_at: new Date().toISOString(),
        profiles: {
            gas: {
                triggers: ['gas', 'google apps script', 'apps script', 'google sheets', 'sheet', 'spreadsheet', 'quota', 'scanner', 'webapp', 'web app'],
                boosts: {
                    GAS_WEBAPP_ARCHITECT: 70,
                    GOOGLE_AGENT: 36,
                    UTAR_OPS: 30,
                    DATA_ANALYTICS_CORE: 10,
                    AUDIT_AGENT: 10
                }
            },
            mosa: {
                triggers: ['mosa', 'token shield', 'graph', 'router', 'registry', 'distiller', 'project startup'],
                boosts: {
                    MOSA_GRAPH_BUILDER: 42,
                    MOSA_HARMONIZER: 34,
                    BASE_DISTILLER: 30,
                    ROUTER_AGENT: 28,
                    ORCHESTRATOR_AGENT: 22
                }
            },
            frontend: {
                triggers: ['frontend', 'ui', 'ux', 'react', 'interface', 'responsive', 'browser test'],
                boosts: {
                    FRONTEND_DESIGN: 42,
                    UI_SUITE: 34,
                    WEBAPP_TESTING: 24,
                    WEB_ARTIFACTS_BUILDER: 18
                }
            },
            data: {
                triggers: ['data', 'analytics', 'spreadsheet', 'csv', 'xlsx', 'eda', 'visualization'],
                boosts: {
                    DATA_ANALYTICS_CORE: 44,
                    XLSX: 30,
                    SPREADSHEETS: 24,
                    AUTOMATED_DATA_CLEANER: 20
                }
            },
            document: {
                triggers: ['document', 'docx', 'word', 'pdf', 'report', 'proposal'],
                boosts: {
                    DOCX: 34,
                    DOC_PIPELINE: 28,
                    REPORT_GENERATOR: 24,
                    PDF: 20
                }
            },
            finance: {
                triggers: ['finance', 'market', 'trading', 'macro', 'yield', 'credit', 'commodity'],
                boosts: {
                    MARKET_AGENT: 40,
                    TRADING_EXPERT: 30,
                    MACRO_YIELD_CURVE_ANALYST: 24,
                    MACRO_CREDIT_SPREAD_ANALYST: 24,
                    MACRO_COMMODITY_RATIO_ANALYST: 24
                }
            }
        }
    };
}

function buildTagAliases(report) {
    const collisionTags = new Set(
        report.registry.collision_report.flatMap(item => item.shared_tags || [])
    );
    return {
        generated_at: new Date().toISOString(),
        normalized_tags: Object.fromEntries(
            Object.entries(report.registry.normalized_tags)
                .filter(([tag, variants]) => variants.length > 1 || collisionTags.has(tag))
                .slice(0, 100)
        )
    };
}

function buildCollisionBacklog(report) {
    return {
        generated_at: new Date().toISOString(),
        policy: 'Review only. Do not mutate registry without explicit user confirmation.',
        collisions: report.registry.collision_report.slice(0, 100)
    };
}

function main() {
    const skillRoot = resolveSkillRoot();
    const workspaceRoot = findWorkspaceRoot();
    if (!skillRoot) {
        console.error('[Registry Distiller] No skill root found.');
        process.exit(1);
    }

    const report = {
        primary_skill_root: skillRoot,
        legacy_skill_root: resolveLegacySkillRoot(),
        registry: analyzeRegistry(skillRoot)
    };

    const outputDir = workspaceRoot
        ? path.join(workspaceRoot, '02_Output')
        : path.join(skillRoot, 'base-distiller');
    fs.mkdirSync(outputDir, { recursive: true });

    const jsonPath = path.join(outputDir, 'registry_distiller_report.json');
    const mdPath = path.join(outputDir, 'registry_distiller_report.md');
    const routerSupportPath = path.join(outputDir, 'router_support_light.json');
    const routerIndexPath = path.join(outputDir, 'router_support_index.json');
    const activeIndexPath = path.join(outputDir, 'active_skill_index.json');
    const referenceMapPath = path.join(outputDir, 'reference_map.json');
    const modeProfilesPath = path.join(outputDir, 'mode_profiles.json');
    const tagAliasesPath = path.join(outputDir, 'tag_aliases.json');
    const collisionBacklogPath = path.join(outputDir, 'collision_backlog.json');
    const routingLightPath = path.join(outputDir, 'routing_index_light.json');
    const referenceMapLightPath = path.join(outputDir, 'reference_map_light.json');
    const startupManifestPath = path.join(outputDir, 'startup_manifest.json');
    const tokenBudgetPath = path.join(outputDir, 'token_budget_report.json');

    const activeIndex = buildActiveSkillIndex(report);
    const referenceMap = buildReferenceMap(report);
    const referenceMapLight = buildReferenceMapLight(referenceMap);
    const routingLight = buildRoutingIndexLight(report);
    const modeProfiles = buildModeProfiles();

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(mdPath, renderMarkdown(report));
    fs.writeFileSync(routerSupportPath, JSON.stringify(buildRouterSupportLight(report), null, 2));
    fs.writeFileSync(routerIndexPath, JSON.stringify(buildRouterSupportIndex(report), null, 2));
    fs.writeFileSync(activeIndexPath, JSON.stringify(activeIndex, null, 2));
    fs.writeFileSync(referenceMapPath, JSON.stringify(referenceMap, null, 2));
    fs.writeFileSync(referenceMapLightPath, JSON.stringify(referenceMapLight));
    fs.writeFileSync(routingLightPath, JSON.stringify(routingLight));
    fs.writeFileSync(modeProfilesPath, JSON.stringify(modeProfiles, null, 2));
    fs.writeFileSync(tagAliasesPath, JSON.stringify(buildTagAliases(report), null, 2));
    fs.writeFileSync(collisionBacklogPath, JSON.stringify(buildCollisionBacklog(report), null, 2));

    const startupManifest = buildStartupManifest({ outputDir }, report, activeIndex, routingLight, referenceMapLight);
    fs.writeFileSync(startupManifestPath, JSON.stringify(startupManifest, null, 2));
    fs.writeFileSync(tokenBudgetPath, JSON.stringify(buildTokenBudgetReport(outputDir, [
        'graphify-out/GRAPH_REPORT.md',
        'startup_manifest.json',
        '01_Work/context_bus.json',
        'routing_index_light.json',
        'reference_map_light.json',
        'active_skill_index.json',
        'reference_map.json',
        'mode_profiles.json',
        'registry_distiller_report.json'
    ], startupManifest.token_budget_limits_bytes), null, 2));

    console.log(JSON.stringify({
        status: 'success',
        mode: 'read-only',
        report_json: jsonPath,
        report_markdown: mdPath,
        router_support_light: routerSupportPath,
        router_support_index: routerIndexPath,
        active_skill_index: activeIndexPath,
        routing_index_light: routingLightPath,
        reference_map: referenceMapPath,
        reference_map_light: referenceMapLightPath,
        mode_profiles: modeProfilesPath,
        startup_manifest: startupManifestPath,
        token_budget_report: tokenBudgetPath,
        tag_aliases: tagAliasesPath,
        collision_backlog: collisionBacklogPath,
        summary: {
            registered: report.registry.total_registered,
            missing_files: report.registry.missing_files.length,
            collisions: report.registry.collision_report.length,
            orphans: report.registry.orphan_report.length
        }
    }, null, 2));
}

main();
