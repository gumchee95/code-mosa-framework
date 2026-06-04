const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const SKILLS_BASE = path.join(HOME, '.gemini', 'antigravity', 'skills');
const REGISTRY_FILE = path.join(SKILLS_BASE, 'skills_registry.json');

function consolidateSkills() {
    console.log("🧩 Starting MOSA Skill Consolidation (整併)...");

    if (!fs.existsSync(REGISTRY_FILE)) {
        console.error('Error: skills_registry.json not found');
        process.exit(1);
    }

    const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    const initialCount = registry.length;
    const initialActive = registry.filter(s => s.category !== 'Archived').length;

    // We will group skills by their primary category and look for >60% tag overlap
    const clusters = [];
    const visited = new Set();

    for (let i = 0; i < registry.length; i++) {
        const skillA = registry[i];
        if (skillA.category === 'Archived' || visited.has(skillA.skill_id)) continue;

        const tagsA = new Set((skillA.tags || []).map(t => t.toLowerCase()));
        if (tagsA.size === 0) continue;

        const cluster = [skillA];

        for (let j = i + 1; j < registry.length; j++) {
            const skillB = registry[j];
            if (skillB.category === 'Archived' || visited.has(skillB.skill_id)) continue;

            // Only consolidate within similar category families
            const catA = (skillA.category || '').toLowerCase();
            const catB = (skillB.category || '').toLowerCase();
            if (catA !== catB) continue;

            const tagsB = new Set((skillB.tags || []).map(t => t.toLowerCase()));
            if (tagsB.size === 0) continue;

            const intersection = new Set([...tagsA].filter(x => tagsB.has(x)));
            const minSize = Math.min(tagsA.size, tagsB.size);
            const overlapRatio = intersection.size / minSize;

            // Overlap threshold >= 60%
            if (overlapRatio >= 0.6) {
                cluster.push(skillB);
            }
        }

        if (cluster.length > 1) {
            cluster.forEach(s => visited.add(s.skill_id));
            clusters.push(cluster);
        }
    }

    console.log(`🔍 Identified ${clusters.length} highly overlapping skill clusters for consolidation.`);

    let mergedCount = 0;

    clusters.forEach((cluster, idx) => {
        // Designate the first one or the one with higher complexity as the master
        const master = cluster.reduce((prev, current) => {
            const prevHigh = prev.complexity === 'High' ? 3 : (prev.complexity === 'Medium' ? 2 : 1);
            const currHigh = current.complexity === 'High' ? 3 : (current.complexity === 'Medium' ? 2 : 1);
            return currHigh > prevHigh ? current : prev;
        });

        console.log(`\n📦 Cluster #${idx + 1} Master: ${master.skill_id} (${master.category})`);

        const masterTags = new Set((master.tags || []).map(t => t.toLowerCase()));

        cluster.forEach(sub => {
            if (sub.skill_id === master.skill_id) return;

            console.log(`  └─> Consolidating sub-skill: ${sub.skill_id}`);
            
            // Merge tags into master
            (sub.tags || []).forEach(tag => {
                masterTags.add(tag.toLowerCase());
            });

            // Mark sub-skill as Archived in the registry
            sub.archived_tags = sub.tags;
            sub.tags = [];
            sub.category = 'Archived';
            mergedCount++;
        });

        master.tags = [...masterTags];
    });

    if (mergedCount > 0) {
        fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 4));
        console.log(`\n🎉 Consolidation Complete!`);
        console.log(`- Total Skills: ${initialCount}`);
        console.log(`- Active Skills Before: ${initialActive}`);
        console.log(`- Active Skills After: ${initialActive - mergedCount}`);
        console.log(`- Consolidated & Archived: ${mergedCount} skills`);
    } else {
        console.log("\n✅ No overlapping clusters found. Registry is already consolidated.");
    }
}

consolidateSkills();
