const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const SKILLS_BASE = path.join(HOME, '.gemini', 'antigravity', 'skills');
const REGISTRY_FILE = path.join(SKILLS_BASE, 'skills_registry.json');
const shouldPrune = process.argv.includes('--prune');

function runTagShield() {
    console.log("🛡️ Running Tag Collision Shield...");

    if (!fs.existsSync(REGISTRY_FILE)) {
        console.error('[Tag Shield] Error: skills_registry.json not found');
        process.exit(1);
    }

    let registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    let collisions = [];
    let prunedCount = 0;

    function detectCollisions() {
        collisions = [];
        for (let i = 0; i < registry.length; i++) {
            const skillA = registry[i];
            const tagsA = new Set((skillA.tags || []).map(t => t.toLowerCase()));

            if (tagsA.size === 0) continue;

            for (let j = i + 1; j < registry.length; j++) {
                const skillB = registry[j];
                const tagsB = new Set((skillB.tags || []).map(t => t.toLowerCase()));

                if (tagsB.size === 0) continue;

                const intersection = new Set([...tagsA].filter(x => tagsB.has(x)));
                if (intersection.size === 0) continue;

                const minSize = Math.min(tagsA.size, tagsB.size);
                const overlapRatio = intersection.size / minSize;

                if (overlapRatio >= 0.5 && (intersection.size >= 2 || minSize === 1)) {
                    collisions.push({
                        idxA: i,
                        idxB: j,
                        skillA: skillA.skill_id,
                        skillB: skillB.skill_id,
                        tagsA: [...tagsA],
                        tagsB: [...tagsB],
                        shared: [...intersection],
                        ratio: (overlapRatio * 100).toFixed(1) + '%'
                    });
                }
            }
        }
    }

    detectCollisions();

    if (collisions.length > 0) {
        console.log(`⚠️ Warning: Detected ${collisions.length} active tag collisions!`);
        
        if (shouldPrune) {
            console.log("✂️ Pruning mode active. Resolving collisions iteratively...");
            let totalPruned = 0;
            let pass = 1;
            
            while (true) {
                detectCollisions();
                if (collisions.length === 0) break;
                
                let prunedThisPass = 0;
                collisions.forEach(c => {
                    const skillA = registry[c.idxA];
                    const skillB = registry[c.idxB];
                    if (!skillA || !skillB) return;

                    const currentTagsA = new Set((skillA.tags || []).map(t => t.toLowerCase()));
                    const currentTagsB = new Set((skillB.tags || []).map(t => t.toLowerCase()));
                    const intersection = new Set([...currentTagsA].filter(x => currentTagsB.has(x)));
                    
                    if (intersection.size === 0) return;

                    const minSize = Math.min(currentTagsA.size, currentTagsB.size);
                    const overlapRatio = intersection.size / minSize;

                    if (overlapRatio < 0.5 || (intersection.size < 2 && minSize > 1)) {
                        return; 
                    }

                    const targetSkill = (skillA.tags.length >= skillB.tags.length) ? skillA : skillB;
                    const originalTags = [...targetSkill.tags];
                    
                    targetSkill.tags = targetSkill.tags.filter(t => !intersection.has(t.toLowerCase()));
                    
                    if (targetSkill.tags.length === 0) {
                        targetSkill.tags = [originalTags[0]];
                    }
                    prunedThisPass += (originalTags.length - targetSkill.tags.length);
                });

                if (prunedThisPass === 0) break;
                totalPruned += prunedThisPass;
                pass++;
            }

            fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 4));
            console.log(`✅ Pruned ${totalPruned} redundant tag instances across ${pass - 1} passes.`);
            
            detectCollisions();
            console.log(`📊 Post-prune active collisions remaining: ${collisions.length}`);
        } else {
            collisions.slice(0, 15).forEach(c => {
                console.log(`[Router Collision Warning] ${c.skillA} <=> ${c.skillB} (${c.ratio} overlap)`);
                console.log(`  - Shared Tags: [${c.shared.join(', ')}]`);
            });
            if (collisions.length > 15) {
                console.log(`  ... and ${collisions.length - 15} more collisions.`);
            }
            console.log("💡 Run with '--prune' to automatically resolve overlaps.");
        }
    } else {
        console.log("✅ Tag Collision Shield: Clear. No major tag overlaps detected.");
    }
}

runTagShield();
