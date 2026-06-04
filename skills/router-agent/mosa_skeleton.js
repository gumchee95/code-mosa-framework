const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
const intent = process.argv[3] ? process.argv[3].toLowerCase() : '';

if (!filePath || !fs.existsSync(filePath)) {
    console.log(JSON.stringify({ status: 'error', message: 'File not found' }));
    process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
const skeleton = {
    metadata: {},
    outline: [],
    protocols: [],
    sop_validation: []
};

let inYaml = false;
let yamlContent = '';

lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Extract YAML Metadata
    if (line.trim() === '---') {
        if (!inYaml && index < 5) {
            inYaml = true;
            return;
        } else if (inYaml) {
            inYaml = false;
            yamlContent.split('\n').forEach(y => {
                const parts = y.split(':');
                if (parts.length >= 2) {
                    skeleton.metadata[parts[0].trim()] = parts.slice(1).join(':').trim();
                }
            });
            return;
        }
    }
    
    if (inYaml) {
        yamlContent += line + '\n';
        return;
    }

    const headerMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headerMatch) {
        skeleton.outline.push({
            level: headerMatch[1].length,
            title: headerMatch[2].trim(),
            line: lineNum
        });
    }

    // Protocol & SOP Detection
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('protocol') || lowerLine.includes('sop') || lowerLine.includes('強制')) {
        skeleton.protocols.push({
            content: line.trim(),
            line: lineNum
        });

        // Intent Validation: Check if this SOP step matches user intent
        if (intent) {
            const intentWords = intent.split(/\s+/);
            const matches = intentWords.filter(word => word.length > 2 && lowerLine.includes(word));
            if (matches.length > 0) {
                skeleton.sop_validation.push({
                    step: line.trim(),
                    line: lineNum,
                    relevance: matches.length,
                    matched_keywords: matches
                });
            }
        }
    }
});

console.log(JSON.stringify(skeleton, null, 2));
