const fs = require('fs');
const path = require('path');
const os = require('os');

function expandHome(inputPath) {
    if (!inputPath) return inputPath;
    return inputPath.replace(/^~(?=$|[\\/])/, os.homedir());
}

function normalizePath(inputPath) {
    return path.normalize(expandHome(inputPath));
}

function existingDir(candidates) {
    return candidates.map(normalizePath).find(candidate => fs.existsSync(candidate));
}

function resolveSkillRoot() {
    const explicit = process.env.MOSA_SKILLS_ROOT || process.env.CODEX_SKILLS_ROOT;
    if (explicit && fs.existsSync(normalizePath(explicit))) {
        return normalizePath(explicit);
    }

    return existingDir([
        path.join(os.homedir(), '.codex', 'skills'),
        path.join(os.homedir(), '.gemini', 'antigravity', 'skills')
    ]);
}

function resolveLegacySkillRoot() {
    return existingDir([
        path.join(os.homedir(), '.gemini', 'antigravity', 'skills'),
        path.join(os.homedir(), '.codex', 'skills')
    ]);
}

function resolveRegistryRoot() {
    const skillRoot = resolveSkillRoot();
    if (!skillRoot) return null;
    return path.join(skillRoot, 'registry');
}

function resolveSkillPath(registryPath) {
    const codexRoot = path.join(os.homedir(), '.codex', 'skills');
    const geminiRoot = path.join(os.homedir(), '.gemini', 'antigravity', 'skills');
    const normalized = registryPath.replace(/\\/g, '/');
    const skillRelative = normalized.replace(/^~\/\.(codex\/skills|gemini\/antigravity\/skills)\//, '');

    if (skillRelative !== normalized) {
        const preferred = path.join(codexRoot, skillRelative);
        if (fs.existsSync(preferred)) return preferred;
    }

    const expanded = normalizePath(registryPath);
    if (fs.existsSync(expanded)) return expanded;

    for (const root of [codexRoot, geminiRoot]) {
        const candidate = path.join(root, skillRelative);
        if (fs.existsSync(candidate)) return candidate;
    }

    return expanded;
}

function findWorkspaceRoot(startDir = process.cwd()) {
    let current = path.resolve(startDir);
    const root = path.parse(current).root;

    while (current !== root) {
        if (fs.existsSync(path.join(current, '00_System'))) {
            return current;
        }
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
    }

    return null;
}

module.exports = {
    expandHome,
    normalizePath,
    resolveSkillRoot,
    resolveLegacySkillRoot,
    resolveRegistryRoot,
    resolveSkillPath,
    findWorkspaceRoot
};
