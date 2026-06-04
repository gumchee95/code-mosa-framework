const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filePath = process.argv[2];
const targetHeading = process.argv[3];

if (!filePath || !fs.existsSync(filePath)) {
    console.error('[Lazy Loader] Error: Target file not found');
    process.exit(1);
}

if (!targetHeading) {
    console.error('[Lazy Loader] Error: Target heading/section not provided');
    process.exit(1);
}

try {
    // 1. Run skeleton parser to get heading lines
    const skeletonScript = path.join(__dirname, 'mosa_skeleton.js');
    const skeletonRaw = execSync(`node "${skeletonScript}" "${filePath}"`, { encoding: 'utf8' });
    const skeleton = JSON.parse(skeletonRaw);

    const outline = skeleton.outline || [];
    if (outline.length === 0) {
        console.log(fs.readFileSync(filePath, 'utf8')); // fallback to full file
        process.exit(0);
    }

    // 2. Find target section
    const targetLower = targetHeading.toLowerCase();
    const targetIdx = outline.findIndex(item => item.title.toLowerCase().includes(targetLower));

    if (targetIdx === -1) {
        console.warn(`[Lazy Loader] Warning: Heading "${targetHeading}" not found. Falling back to whole file.`);
        console.log(fs.readFileSync(filePath, 'utf8'));
        process.exit(0);
    }

    const matchedSection = outline[targetIdx];
    const startLine = matchedSection.line;
    let endLine = -1;

    // The section ends where another heading of equal or higher level starts
    for (let i = targetIdx + 1; i < outline.length; i++) {
        if (outline[i].level <= matchedSection.level) {
            endLine = outline[i].line - 1;
            break;
        }
    }

    // Read file lines
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (endLine === -1 || endLine >= lines.length) {
        endLine = lines.length;
    }

    // Slice section lines (1-indexed to 0-indexed)
    const sectionLines = lines.slice(startLine - 1, endLine);
    console.log(sectionLines.join('\n'));

} catch (e) {
    console.error(`[Lazy Loader] Fatal: ${e.message}`);
    // Fallback to reading the full file on failure
    console.log(fs.readFileSync(filePath, 'utf8'));
}
