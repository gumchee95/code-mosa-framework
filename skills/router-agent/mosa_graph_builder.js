const fs = require('fs');
const path = require('path');
const os = require('os');

function buildGraph(rootPath) {
    console.log(`📊 Programmatic Graph Builder: Scanning ${rootPath}...`);

    const noiseFilter = new Set(['.git', 'node_modules', 'venv', '__pycache__', '.next', 'dist', 'build', '.gemini']);
    const nodes = [];
    const edges = [];

    // Helper to escape node labels and IDs
    function makeId(p) {
        return 'node_' + path.relative(rootPath, p).replace(/[^a-zA-Z0-9]/g, '_');
    }

    function scanDir(dirPath, depth = 0) {
        if (depth > 2) return;

        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        
        let count = 0;
        for (const item of items) {
            if (noiseFilter.has(item.name)) continue;
            count++;
            if (count > 25) { // truncate large lists
                const truncId = makeId(path.join(dirPath, 'truncated'));
                nodes.push(`${truncId}["[ truncated ... ]"]`);
                edges.push(`${makeId(dirPath)} --> ${truncId}`);
                break;
            }

            const fullPath = path.join(dirPath, item.name);
            const itemId = makeId(fullPath);
            const isDir = item.isDirectory();

            // Label name
            const displayName = isDir ? `${item.name}/` : item.name;
            nodes.push(`${itemId}["${displayName}"]`);

            // Edge from parent
            if (dirPath !== rootPath) {
                edges.push(`${makeId(dirPath)} --> ${itemId}`);
            } else {
                edges.push(`root --> ${itemId}`);
            }

            if (isDir) {
                scanDir(fullPath, depth + 1);
            }
        }
    }

    // Initialize root nodes
    nodes.push(`root["Workspace Root: ${path.basename(rootPath)}"]`);
    scanDir(rootPath);

    // Build Mermaid string
    let mermaid = '```mermaid\ngraph TD\n';
    mermaid += nodes.map(n => '    ' + n).join('\n') + '\n';
    mermaid += edges.map(e => '    ' + e).join('\n') + '\n';
    mermaid += '```\n';

    // God Nodes classification
    const godNodes = [];
    if (fs.existsSync(path.join(rootPath, '00_System'))) godNodes.push('- **00_System/**: Core settings, rules, and global session state.');
    if (fs.existsSync(path.join(rootPath, '01_Work'))) godNodes.push('- **01_Work/**: Work-in-progress tasks, scripts, and checkpoints.');
    if (fs.existsSync(path.join(rootPath, '02_Output'))) godNodes.push('- **02_Output/**: Outputs, reports, and delivery files.');
    
    // Scan for high-level files in root
    const rootItems = fs.readdirSync(rootPath);
    rootItems.forEach(item => {
        if (item.endsWith('.py') || item.endsWith('.js') || item.endsWith('.json') || item.endsWith('.md')) {
            if (!noiseFilter.has(item)) {
                godNodes.push(`- **${item}**: Primary script / configuration in workspace root.`);
            }
        }
    });

    const reportContent = `# MOSA Framework Topology Graph & Context Report
> **Auto-compiled by MOSA Graph Builder** | **Update Date**: ${new Date().toISOString()}

This report serves as the system's structural blueprint. It provides a visual Mermaid topology of all folders/files and identifies **God Nodes** to guide Agent search actions.

---

## 🗺️ Visual Architecture Map

${mermaid}

---

## 👑 Identified God Nodes (Priority Context)
${godNodes.length > 0 ? godNodes.join('\n') : 'No primary scripting God Nodes detected in root.'}

---

## 🛡️ MOSA Token Shield Instructions
All active AI agents reading this workspace must adhere to the following routing rules:
1. **DO NOT** perform expensive recursive directory searches or deep greps initially.
2. **MUST** reference this map to determine where components reside.
3. For debugging, trace dependencies from the God Nodes listed above.
`;

    // Ensure directory exists and write report
    const outDir = path.join(rootPath, 'graphify-out');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(path.join(outDir, 'GRAPH_REPORT.md'), reportContent);
    console.log(`✅ Topology written successfully to ${path.join(outDir, 'GRAPH_REPORT.md')}`);

    // Create / Overwrite AGENTS.md at root
    const agentsContent = `# MOSA Token Shield Protocol
When querying architecture, tracing code logic, or exploring dependencies:
1. **DO NOT** scan the entire codebase or use wide greps initially.
2. **MUST** read \`graphify-out/GRAPH_REPORT.md\` to understand the system map.
3. Keep context tightly bounded to identified God Nodes to minimize Token consumption.
`;
    fs.writeFileSync(path.join(rootPath, 'AGENTS.md'), agentsContent);
    console.log(`✅ Token Shield AGENTS.md created successfully.`);
}

// Get arguments or use current directory root search
const rootArg = process.argv[2];
if (rootArg && fs.existsSync(rootArg)) {
    buildGraph(rootArg);
} else {
    console.error('[Graph Builder] Error: Active workspace path argument missing');
    process.exit(1);
}
