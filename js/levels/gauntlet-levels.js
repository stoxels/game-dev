//------------------------------------------------------------------------
// Gauntlet level assignment: picks 2-3 campaign levels per world and gives
// them the 'gauntlet' bonus type (a monster arena that opens after the
// puzzle is solved - see js/combat/gauntlet.js).
//
// The pick is DETERMINISTIC (seeded from the world index) so a level's
// bonus never changes between sessions, saves or reloads. Tutorial-adjacent
// opening levels, the world's final (ascension) level and the Nexus world
// are never chosen, and chosen levels are spaced apart.
//------------------------------------------------------------------------

export const GAUNTLET_MIN_LEVEL_INDEX = 3;   // first three levels of a world are never gauntlets
export const GAUNTLET_MIN_SPACING = 3;       // levels between two gauntlets in one world
export const GAUNTLET_SKIP_WORLDS = [13];    // Nexus world

export const GAUNTLET_HINT = 'Clear the gauntlet: defeat every monster with spells and melee';
export const GAUNTLET_HINT_DE = 'Meistere die Gauntlet: besiege alle Monster mit Zaubern und Nahkampf';

// Small seeded PRNG (mulberry32) - stable across runs and platforms.
function _rng(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Returns the sorted level indices (0-based, within the world) that become
// gauntlets for world `wi` with `levelCount` levels.
export function pickGauntletLevelIndices(wi, levelCount) {
    if (GAUNTLET_SKIP_WORLDS.includes(wi)) return [];
    const lastEligible = levelCount - 2;           // keep the final (ascension) level clean
    if (lastEligible < GAUNTLET_MIN_LEVEL_INDEX) return [];
    const rand = _rng((wi + 1) * 7919 + 104729);
    const want = 2 + (rand() < 0.5 ? 1 : 0);      // 2 or 3 per world
    const pool = [];
    for (let i = GAUNTLET_MIN_LEVEL_INDEX; i <= lastEligible; i++) pool.push(i);
    // Seeded Fisher-Yates shuffle.
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picked = [];
    for (const idx of pool) {
        if (picked.every(p => Math.abs(p - idx) >= GAUNTLET_MIN_SPACING)) picked.push(idx);
        if (picked.length >= want) break;
    }
    return picked.sort((a, b) => a - b);
}

// Stamps the chosen levels in `worlds` (the WORLDS array). Idempotent.
export function applyGauntletBonuses(worlds) {
    if (!Array.isArray(worlds)) return;
    worlds.forEach((w, wi) => {
        if (!w || !Array.isArray(w.data)) return;
        pickGauntletLevelIndices(wi, w.data.length).forEach(li => {
            const lvl = w.data[li];
            if (!lvl) return;
            lvl.bonusType = 'gauntlet';
            lvl.bonusParam = 0;
            lvl.bonusHint = GAUNTLET_HINT;
            lvl.bonusHintDE = GAUNTLET_HINT_DE;
        });
    });
}
