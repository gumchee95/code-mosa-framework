const fs = require('fs');
const path = require('path');

const os = require('os');

const query = process.argv.slice(2).join(' ').toLowerCase();
const kbDir = path.join(os.homedir(), '.gemini', 'antigravity', 'knowledge-base');
const indexPath = path.join(kbDir, '_index.json');

if (!query) {
    console.log(JSON.stringify({ status: 'error', message: 'No query provided' }));
    process.exit(1);
}

if (!fs.existsSync(indexPath)) {
    console.log(JSON.stringify({ status: 'error', message: 'KB index not found' }));
    process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const queryWords = query.split(/\s+/);
const results = [];

index.categories.forEach(cat => {
    let score = 0;
    const name = cat.name.toLowerCase();
    const keywords = (cat.keywords || []).map(k => k.toLowerCase());

    if (query === name || queryWords.includes(name)) score += 50;
    
    keywords.forEach(kw => {
        if (query === kw || queryWords.includes(kw)) score += 20;
        else {
            const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/[\s_-]+/g, '[\\s_-]+');
            if (new RegExp('\\b' + escaped + '\\b', 'i').test(query)) score += 10;
        }
    });

    if (score > 0) {
        results.push({
            name: cat.name,
            score: score,
            filepath: path.join(kbDir, cat.name + '.md')
        });
    }
});

console.log(JSON.stringify({
    status: 'success',
    results: results.sort((a, b) => b.score - a.score).slice(0, 3)
}, null, 2));
