const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
    resolveSkillRoot,
    resolveRegistryRoot,
    resolveSkillPath,
    findWorkspaceRoot
} = require('./mosa_paths');

const STOPWORDS = new Set([
    'and', 'or', 'the', 'a', 'an', 'to', 'of', 'for', 'in', 'on', 'with',
    'summary', 'keywords', 'capability', 'intent', 'preferred', 'domain',
    'required', 'exclusions', 'true', 'false', 'null'
]);

const SKILL_TEXT_LIMIT = Number(process.env.MOSA_SKILL_TEXT_LIMIT || 5000);
const GENERIC_TAGS = new Set(['skill', 'data', 'design', 'app', 'web', 'build', 'builder', 'project', 'agent', 'tool', 'multi', 'parallel', 'orchestration', 'architecture']);

function stripShellQuotes(value) {
    return value.replace(/^['"]|['"]$/g, '');
}

function parseInput(argv) {
    const raw = stripShellQuotes(argv.join(' ').trim());
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        return {
            raw,
            intent_summary: parsed.intent_summary || parsed.intentSummary || raw,
            atomic_keywords: parsed.atomic_keywords || parsed.atomicKeywords || [],
            preferred_domain: parsed.preferred_domain || parsed.preferredDomain || '',
            required_capability: parsed.required_capability || parsed.requiredCapability || '',
            exclusions: parsed.exclusions || []
        };
    } catch (_) {
        return {
            raw,
            intent_summary: raw,
            atomic_keywords: raw.split(/\s+/).filter(Boolean),
            preferred_domain: '',
            required_capability: '',
            exclusions: []
        };
    }
}

function words(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[_/\\.,:;()[\]{}"'-]+/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !STOPWORDS.has(word));
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function loadJson(filePath, fallback = null) {
    if (!filePath || !fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function loadOutputJson(filename) {
    const workspaceRoot = findWorkspaceRoot();
    if (!workspaceRoot) return null;
    return loadJson(path.join(workspaceRoot, '02_Output', filename), null);
}

function loadRouterSupportIndex() {
    return loadOutputJson('routing_index_light.json') || loadOutputJson('active_skill_index.json') || loadOutputJson('router_support_index.json');
}

function normalizeReferenceMap(map) {
    const references = {};
    for (const [skillId, value] of Object.entries(map?.references || {})) {
        references[skillId] = typeof value === 'string' ? { master: value } : value;
    }
    return { ...map, references, masters: map?.masters || {} };
}

function loadReferenceMap() {
    return normalizeReferenceMap(loadOutputJson('reference_map_light.json') || loadOutputJson('reference_map.json') || { references: {}, masters: {} });
}

function loadReferenceMapFull() {
    return normalizeReferenceMap(loadOutputJson('reference_map.json') || loadOutputJson('reference_map_light.json') || { references: {}, masters: {} });
}

function loadModeProfiles() {
    return loadOutputJson('mode_profiles.json') || { profiles: {} };
}

function routePolicy(skill) {
    if (skill.consolidated_into || skill.master_skill) return String(skill.route_policy || 'reference').toLowerCase();
    return String(skill.route_policy || (String(skill.category || '').toLowerCase() === 'archived' ? 'archived' : 'active')).toLowerCase();
}

function hasExactTrigger(skill, queryText) {
    return (skill.exact_triggers || []).some(trigger => phraseMatches(queryText, trigger));
}

function routingVersion() {
    const workspaceRoot = findWorkspaceRoot();
    const lightSupportPath = workspaceRoot ? path.join(workspaceRoot, '02_Output', 'routing_index_light.json') : null;
    const supportPath = workspaceRoot ? path.join(workspaceRoot, '02_Output', 'active_skill_index.json') : null;
    const fallbackSupportPath = workspaceRoot ? path.join(workspaceRoot, '02_Output', 'router_support_index.json') : null;
    const lightReferencePath = workspaceRoot ? path.join(workspaceRoot, '02_Output', 'reference_map_light.json') : null;
    const referencePath = workspaceRoot ? path.join(workspaceRoot, '02_Output', 'reference_map.json') : null;
    const modePath = workspaceRoot ? path.join(workspaceRoot, '02_Output', 'mode_profiles.json') : null;
    const registryPath = path.join(resolveSkillRoot() || '', 'skills_registry.json');
    const lightSupportTime = lightSupportPath && fs.existsSync(lightSupportPath) ? fs.statSync(lightSupportPath).mtimeMs : 0;
    const supportTime = supportPath && fs.existsSync(supportPath) ? fs.statSync(supportPath).mtimeMs : 0;
    const fallbackSupportTime = fallbackSupportPath && fs.existsSync(fallbackSupportPath) ? fs.statSync(fallbackSupportPath).mtimeMs : 0;
    const lightReferenceTime = lightReferencePath && fs.existsSync(lightReferencePath) ? fs.statSync(lightReferencePath).mtimeMs : 0;
    const referenceTime = referencePath && fs.existsSync(referencePath) ? fs.statSync(referencePath).mtimeMs : 0;
    const modeTime = modePath && fs.existsSync(modePath) ? fs.statSync(modePath).mtimeMs : 0;
    const registryTime = fs.existsSync(registryPath) ? fs.statSync(registryPath).mtimeMs : 0;
    const routerTime = fs.existsSync(__filename) ? fs.statSync(__filename).mtimeMs : 0;
    return `${Math.floor(lightSupportTime)}:${Math.floor(supportTime)}:${Math.floor(fallbackSupportTime)}:${Math.floor(lightReferenceTime)}:${Math.floor(referenceTime)}:${Math.floor(modeTime)}:${Math.floor(registryTime)}:${Math.floor(routerTime)}`;
}

function readSkillText(skill) {
    if (!skill.filepath) return '';
    const resolved = resolveSkillPath(skill.filepath || '');
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return '';
    const content = fs.readFileSync(resolved, 'utf8');
    const frontmatter = content.match(/^---\s*[\s\S]*?\s*---/)?.[0] || '';
    const headings = (content.match(/^#{1,3}\s+.+$/gmi) || []).join('\n');
    const protocols = (content.match(/^.*(protocol|sop|強制|workflow|流程|policy).*$/gmi) || [])
        .slice(0, 40)
        .join('\n');
    return [frontmatter, headings, protocols].join('\n').slice(0, SKILL_TEXT_LIMIT);
}

function loadCache(intent) {
    const workspaceRoot = findWorkspaceRoot();
    if (!workspaceRoot) return null;
    const cachePath = path.join(workspaceRoot, '00_System', 'routing_cache.json');
    const cache = loadJson(cachePath, { entries: [] });
    const intentHash = intentHashFor(intent);
    const key = crypto
        .createHash('sha1')
        .update(JSON.stringify({
            keywords: intent.atomic_keywords,
            summary: intent.intent_summary,
            capability: intent.required_capability,
            exclusions: intent.exclusions || [],
            routing_version: routingVersion()
        }))
        .digest('hex');

    const hit = (cache.entries || []).find(entry => (
        entry.key === key &&
        entry.intent_hash === intentHash &&
        entry.routing_version === routingVersion() &&
        entry.confidence >= 0.8 &&
        cachedPathsValid(entry.results || [])
    ));
    return hit ? { key, intentHash, hit } : { key, intentHash, hit: null };
}

function writeCache(cacheInfo, results) {
    if (!cacheInfo?.key || !results.length) return;
    const confidence = results[0]?.confidence || 0;
    if (confidence < 0.8) return;

    const workspaceRoot = findWorkspaceRoot();
    if (!workspaceRoot) return;
    const cachePath = path.join(workspaceRoot, '00_System', 'routing_cache.json');
    const cache = loadJson(cachePath, { entries: [] });
    const entries = (cache.entries || []).filter(entry => entry.key !== cacheInfo.key);
    entries.unshift({
        key: cacheInfo.key,
        intent_hash: cacheInfo.intentHash,
        routing_version: routingVersion(),
        confidence,
        created_at: new Date().toISOString(),
        results
    });
    fs.writeFileSync(cachePath, JSON.stringify({ entries: entries.slice(0, 50) }, null, 2));
}

function intentHashFor(intent) {
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

function cachedPathsValid(results) {
    return results.every(result => result.resolved_path && fs.existsSync(result.resolved_path));
}

function confidenceTier(confidence) {
    if (confidence >= 0.8) return 'strong';
    if (confidence >= 0.5) return 'medium';
    if (confidence >= 0.35) return 'weak';
    return 'fail';
}

function fallbackCodeFor(results, registrySource) {
    if (!registrySource) return 'MISSING_INDEX';
    if (!results.length) return 'NO_CANDIDATE';
    if (!results[0].resolved_path || !fs.existsSync(results[0].resolved_path)) return 'INVALID_SKILL_PATH';
    const tier = confidenceTier(results[0].confidence || 0);
    if (tier === 'fail') return 'LOW_CONFIDENCE';
    if (tier === 'weak') return 'WEAK_CONFIDENCE';
    return null;
}

function normalizeExclusions(intent) {
    const raw = intent.exclusions || [];
    const values = raw.flatMap(item => {
        if (typeof item === 'string') return [item];
        if (!item || typeof item !== 'object') return [];
        return [item.skill_id, item.path, item.category, item.capability, item.tag];
    }).filter(Boolean);
    const text = values.join(' ').toLowerCase();
    return {
        text,
        terms: new Set(values.flatMap(words)),
        values: values.map(value => String(value).toLowerCase())
    };
}

function isExcludedSkill(skill, exclusions) {
    if (!exclusions?.values?.length) return false;
    const fields = [
        skill.skill_id,
        skill.name,
        skill.category,
        skill.filepath,
        ...(skill.tags || []),
        ...(skill.capability_phrases || [])
    ].map(value => String(value || '').toLowerCase());
    return exclusions.values.some(exclusion => fields.some(field => field === exclusion || field.includes(exclusion)));
}

function skillSearchText(skill, skillText) {
    const fields = [
        skill.skill_id,
        skill.category,
        ...(skill.tags || []),
        ...(skill.capability_phrases || []),
        skill.description,
        skill.name,
        skillText.match(/^description:\s*(.+)$/mi)?.[1] || '',
        skillText.match(/^name:\s*(.+)$/mi)?.[1] || '',
        ...(skillText.match(/^#{1,3}\s+(.+)$/gmi) || [])
    ];
    return fields.join(' ').toLowerCase();
}

function detectModes(queryText, modeProfiles) {
    const active = [];
    for (const [name, profile] of Object.entries(modeProfiles.profiles || {})) {
        if ((profile.triggers || []).some(trigger => phraseMatches(queryText, trigger))) {
            active.push(name);
        }
    }
    return active;
}

function phraseMatches(text, phrase) {
    const normalizedPhrase = String(phrase || '').toLowerCase().trim();
    if (!normalizedPhrase) return false;
    const escaped = normalizedPhrase
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\s+/g, '\\s+');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}

function scoreSkill(skill, intent, modeProfiles = { profiles: {} }) {
    const queryTerms = unique([
        ...words(intent.intent_summary),
        ...intent.atomic_keywords.flatMap(words),
        ...words(intent.preferred_domain),
        ...words(intent.required_capability)
    ]);
    const exclusions = normalizeExclusions(intent).terms;
    const skillId = String(skill.skill_id || '').toLowerCase();
    const tags = (skill.tags || []).map(tag => String(tag).toLowerCase());
    const category = String(skill.category || '').toLowerCase();
    const skillText = skill.capability_phrases ? '' : readSkillText(skill);
    const searchable = skillSearchText(skill, skillText);
    const reasons = [];
    let score = 0;
    const queryText = [
        intent.intent_summary,
        intent.required_capability,
        intent.preferred_domain,
        ...(intent.atomic_keywords || [])
    ].join(' ').toLowerCase();

    for (const term of queryTerms) {
        if (!term || exclusions.has(term)) continue;

        if (skillId === term || skillId.replace(/_/g, '-').includes(term)) {
            score += GENERIC_TAGS.has(term) ? 10 : 35;
            reasons.push(`skill_id:${term}`);
        }
        if (tags.includes(term)) {
            score += GENERIC_TAGS.has(term) ? 8 : 22;
            reasons.push(`tag:${term}`);
        } else if (tags.some(tag => tag.length > 2 && (
            tag.startsWith(`${term}-`) ||
            tag.endsWith(`-${term}`) ||
            term.startsWith(`${tag}-`) ||
            term.endsWith(`-${tag}`)
        ))) {
            score += 12;
            reasons.push(`tag-partial:${term}`);
        }
        if (category === term || category.includes(term)) {
            score += 10;
            reasons.push(`category:${term}`);
        }
        if (searchable.includes(term)) {
            score += GENERIC_TAGS.has(term) ? 2 : 5;
            reasons.push(`metadata:${term}`);
        }
    }

    for (const mode of detectModes(queryText, modeProfiles)) {
        const boost = modeProfiles.profiles?.[mode]?.boosts?.[skill.skill_id] || 0;
        if (boost) {
            score += boost;
            reasons.push(`mode:${mode}+${boost}`);
        }
    }

    const policy = routePolicy(skill);
    if (category === 'archived' || policy === 'archived' || policy === 'reference') {
        score = Math.floor(score * 0.15);
        reasons.push(`penalty:${policy === 'reference' ? 'reference' : 'archived'}`);
    }
    if (policy === 'specialized' && !hasExactTrigger(skill, queryText)) {
        score = Math.floor(score * 0.25);
        reasons.push('penalty:specialized-no-exact-trigger');
    } else if (policy === 'specialized') {
        reasons.push('policy:specialized-exact-trigger');
    }

    const capabilityTerms = words(intent.required_capability);
    const capabilityHits = capabilityTerms.filter(term => searchable.includes(term));
    if (capabilityHits.length) {
        score += capabilityHits.length * 6;
        reasons.push(`capability:${capabilityHits.join(',')}`);
    }

    const dependencyText = JSON.stringify(skill.dependencies || {}).toLowerCase();
    const dependencyHits = queryTerms.filter(term => dependencyText.includes(term));
    if (dependencyHits.length) {
        score += dependencyHits.length * 4;
        reasons.push(`dependency:${dependencyHits.join(',')}`);
    }

    return {
        ...skill,
        resolved_path: resolveSkillPath(skill.filepath || ''),
        search_score: score,
        confidence: Math.min(0.99, Number((score / 100).toFixed(2))),
        match_reasons: unique(reasons).slice(0, 8)
    };
}

function main() {
    const intent = parseInput(process.argv.slice(2));
    if (!intent) {
        console.log(JSON.stringify({ status: 'error', message: 'No query provided' }, null, 2));
        process.exit(1);
    }

    const skillRoot = resolveSkillRoot();
    const registryDir = resolveRegistryRoot();
    const registryPath = skillRoot ? path.join(skillRoot, 'skills_registry.json') : null;
    const indexPath = registryDir ? path.join(registryDir, '_index.json') : null;

    if (!skillRoot || !fs.existsSync(registryPath)) {
        console.log(JSON.stringify({ status: 'error', message: 'Skills registry not found' }, null, 2));
        process.exit(1);
    }

    const cache = loadCache(intent);
    if (cache?.hit) {
        console.log(JSON.stringify({
            status: 'success',
            source: 'cache',
            intent_hash: cache.intentHash,
            confidence: cache.hit.confidence,
            results: cache.hit.results,
            fallback_code: null,
            fallback_recommendation: null
        }, null, 2));
        return;
    }

    const supportIndex = loadRouterSupportIndex();
    const referenceMap = loadReferenceMap();
    const referenceMapFull = loadReferenceMapFull();
    const modeProfiles = loadModeProfiles();
    const registry = supportIndex?.skills?.length ? supportIndex.skills : loadJson(registryPath, []);
    const index = loadJson(indexPath, null);
    const candidateCategories = new Set();
    const queryText = [
        intent.intent_summary,
        intent.required_capability,
        intent.preferred_domain,
        ...(intent.atomic_keywords || [])
    ].join(' ').toLowerCase();

    if (index) {
        Object.keys(index.categories || {}).forEach(category => {
            if (queryText.includes(category)) candidateCategories.add(category);
        });
        Object.entries(index.all_tags || {}).forEach(([tag, categories]) => {
            if (queryText.includes(tag)) categories.forEach(category => candidateCategories.add(category));
        });
    }

    const exclusions = normalizeExclusions(intent);
    const candidates = (supportIndex?.skills?.length
        ? registry
        : candidateCategories.size
        ? registry.filter(skill => candidateCategories.has(String(skill.category || '').toLowerCase()))
        : registry)
        .filter(skill => !isExcludedSkill(skill, exclusions));

    const fullRegistry = loadJson(registryPath, []);
    const activeById = new Map(candidates.map(skill => [skill.skill_id, skill]));
    const activeModes = detectModes(queryText, modeProfiles);
    const mosaModeActive = activeModes.includes('mosa');
    const referenceBoosts = new Map();
    for (const refSkill of fullRegistry.filter(skill => referenceMap.references?.[skill.skill_id])) {
        const refScore = scoreSkill({ ...refSkill, route_policy: 'active' }, intent, modeProfiles);
        if (refScore.search_score <= 0) continue;
        const reference = referenceMap.references[refSkill.skill_id];
        const masterId = reference.master;
        if (!masterId) continue;
        const existing = referenceBoosts.get(masterId) || { score: 0, references: [] };
        existing.score += Math.min(42, Math.ceil(refScore.search_score * 0.75));
        existing.references.push({
            skill_id: refSkill.skill_id,
            role: referenceMapFull.references?.[refSkill.skill_id]?.role || reference.role || 'reference',
            reason: referenceMapFull.references?.[refSkill.skill_id]?.reference_reason || reference.reference_reason || refSkill.reference_reason || null
        });
        referenceBoosts.set(masterId, existing);
    }

    if (mosaModeActive) {
        for (const refSkill of fullRegistry.filter(skill => skill.mosa_reference_target && routePolicy(skill) === 'specialized')) {
            const refScore = scoreSkill(refSkill, intent, modeProfiles);
            if (refScore.search_score <= 0) continue;
            const masterId = refSkill.mosa_reference_target;
            const existing = referenceBoosts.get(masterId) || { score: 0, references: [] };
            existing.score += Math.min(90, Math.ceil(refScore.search_score * 1.1));
            existing.references.push({
                skill_id: refSkill.skill_id,
                role: refSkill.reference_role || 'mosa-reference',
                reason: refSkill.reference_reason || null
            });
            referenceBoosts.set(masterId, existing);
        }
    }

    const scored = candidates
        .filter(skill => !referenceMap.references?.[skill.skill_id] && routePolicy(skill) !== 'reference')
        .map(skill => {
            const scoredSkill = scoreSkill(skill, intent, modeProfiles);
            const boost = referenceBoosts.get(skill.skill_id);
            if (mosaModeActive && skill.mosa_reference_target && skill.mosa_reference_target !== skill.skill_id) {
                scoredSkill.search_score = Math.floor(scoredSkill.search_score * 0.35);
                scoredSkill.confidence = Math.min(0.99, Number((scoredSkill.search_score / 100).toFixed(2)));
                scoredSkill.match_reasons = unique([...scoredSkill.match_reasons, `mosa-reference-target:${skill.mosa_reference_target}`]).slice(0, 8);
            }
            if (boost) {
                scoredSkill.search_score += boost.score;
                scoredSkill.confidence = Math.min(0.99, Number((scoredSkill.search_score / 100).toFixed(2)));
                scoredSkill.match_reasons = unique([
                    ...scoredSkill.match_reasons,
                    ...boost.references.map(ref => `reference:${ref.skill_id}`)
                ]).slice(0, 8);
                scoredSkill.referenced_skills = boost.references.slice(0, 5);
            }
            return scoredSkill;
        });

    for (const [masterId, boost] of referenceBoosts.entries()) {
        if (activeById.has(masterId)) continue;
        const master = fullRegistry.find(skill => skill.skill_id === masterId);
        if (!master || referenceMap.references?.[master.skill_id]) continue;
        const scoredMaster = scoreSkill(master, intent, modeProfiles);
        scoredMaster.search_score += boost.score;
        scoredMaster.confidence = Math.min(0.99, Number((scoredMaster.search_score / 100).toFixed(2)));
        scoredMaster.match_reasons = unique([
            ...scoredMaster.match_reasons,
            ...boost.references.map(ref => `reference:${ref.skill_id}`)
        ]).slice(0, 8);
        scoredMaster.referenced_skills = boost.references.slice(0, 5);
        scored.push(scoredMaster);
    }

    const results = scored
        .filter(skill => skill.search_score > 0)
        .sort((a, b) => b.search_score - a.search_score)
        .slice(0, 3)
        .map(skill => {
            const fullSkill = fullRegistry.find(item => item.skill_id === skill.skill_id) || {};
            const filepath = skill.filepath || fullSkill.filepath || '';
            const confidence = skill.confidence;
            return {
                skill_id: skill.skill_id,
                filepath,
                resolved_path: resolveSkillPath(filepath),
                category: skill.category || fullSkill.category,
                tags: skill.tags || fullSkill.tags || [],
                confidence,
                confidence_tier: confidenceTier(confidence),
                match_reasons: skill.match_reasons,
                referenced_skills: skill.referenced_skills || []
            };
        });

    const topConfidence = results[0]?.confidence || 0;
    const source = supportIndex?.skills?.length ? (supportIndex.summary?.active_skills && supportIndex.skills?.some(skill => !skill.filepath) ? 'routing_index_light' : supportIndex.summary?.active_skills ? 'active_skill_index' : 'router_support_index') : 'registry';
    const fallbackCode = fallbackCodeFor(results, source);
    const fallback = fallbackCode
        ? `${fallbackCode}: run Registry Distiller diagnostics or ask Orchestrator for user confirmation.`
        : null;

    writeCache(cache, results);

    console.log(JSON.stringify({
        status: 'success',
        source,
        skill_root: skillRoot,
        intent_hash: cache?.intentHash || intentHashFor(intent),
        active_modes: activeModes,
        results,
        fallback_code: fallbackCode,
        fallback_recommendation: fallback
    }, null, 2));
}

main();
