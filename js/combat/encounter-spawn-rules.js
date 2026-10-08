//------------------------------------------------------------------------
// Encounter spawn-list owner: monster levels and the fixed/random normal
// and boss lists used to build each encounter's opening wave.
//------------------------------------------------------------------------

// Campaign preparation and spawn scheduling live in adjacent focused owners.
import { cur } from '../state.js';


import { EG_DEFAULT_MONSTER_CAP, _egGetDefaultMonsterCap } from './encounter-constants.js';
import { EG_ENDGAME_MONSTER_LEVEL_CAP, EG_MAP_TIER_MONSTER_LEVELS, _egRollMapTier } from '../loot/loot-map-config.js';
import { EG_MONSTER_DEFS } from './combat-monsters-data.js';



//------------------------------------------------------------------------
//-------------------PUZZLE HELPER----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if every filled cell in the solution has been correctly placed.
export function _egIsPuzzleSolved() {
    if (!cur || !globalThis.userGrid) return false;
    for (let r = 0; r < cur.grid.length; r++)
        for (let c = 0; c < cur.grid[0].length; c++)
            if (cur.grid[r][c] === 1 && globalThis.userGrid[r][c] !== 1) return false;
    return true;
}


//------------------------------------------------------------------------
//-------------------SPAWN LIST BUILDERS----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the base level for a monster, applying tier-gap-aware variance.
// Variance keeps a wave from feeling uniform and bridges the large gaps
// between map tiers (e.g. T13 71 → T14 78 is +7). The pool is -down .. +up
// where `down` is fixed and `up` scales with the distance to the next tier
// so monsters sometimes roll close to the next tier's base level.
// Below EG_EARLY_VARIANCE_FREE_LEVEL variance only rolls downward so fresh
// characters never face monsters above their map's base level.
export const EG_EARLY_VARIANCE_FREE_LEVEL = 8;
export const EG_MONSTER_VARIANCE_DOWN = 2;
export const EG_MONSTER_VARIANCE_UP_MIN = 2;
export const EG_MONSTER_VARIANCE_UP_MAX = 6;

export function _egRollMonsterLevel(baseLevel) {
    const base = Math.max(1, Math.round(Number(baseLevel) || 1));
    // Early tiers: only downward variance (protect new players).
    if (base < EG_EARLY_VARIANCE_FREE_LEVEL) {
        const down = -Math.floor(Math.random() * 3); // -2..0
        return Math.max(1, base + down);
    }
    // Determine gap to next tier's monster level (if curve is available).
    let gap = 0;
    if (typeof EG_MAP_TIER_MONSTER_LEVELS !== 'undefined') {
        // Try to infer the map tier that owns `base`.
        let tier = 0;
        if (typeof _egRollMapTier === 'function') {
            try { tier = _egRollMapTier(base) || 0; } catch (e) { tier = 0; }
        }
        if (tier >= 1 && tier < EG_MAP_TIER_MONSTER_LEVELS.length) {
            const nextLvl = EG_MAP_TIER_MONSTER_LEVELS[tier]; // tier is 1-indexed, next = index tier
            gap = Math.max(0, nextLvl - base);
        } else if (tier >= EG_MAP_TIER_MONSTER_LEVELS.length) {
            const cap = (typeof EG_ENDGAME_MONSTER_LEVEL_CAP !== 'undefined') ? EG_ENDGAME_MONSTER_LEVEL_CAP : 95;
            gap = Math.max(0, cap - base);
        } else {
            // Fallback scan when _egRollMapTier unavailable or mismatched.
            for (let i = 0; i < EG_MAP_TIER_MONSTER_LEVELS.length - 1; i++) {
                if (EG_MAP_TIER_MONSTER_LEVELS[i] === base) { gap = EG_MAP_TIER_MONSTER_LEVELS[i + 1] - base; break; }
                if (EG_MAP_TIER_MONSTER_LEVELS[i] < base && base < EG_MAP_TIER_MONSTER_LEVELS[i + 1]) { gap = EG_MAP_TIER_MONSTER_LEVELS[i + 1] - base; break; }
            }
        }
    }
    const upCap = Math.max(EG_MONSTER_VARIANCE_UP_MIN,
        Math.min(EG_MONSTER_VARIANCE_UP_MAX, Math.round(gap * 0.85) || EG_MONSTER_VARIANCE_UP_MIN));
    const down = EG_MONSTER_VARIANCE_DOWN;
    // Uniform -down .. +upCap → average slightly above base, so maps feel
    // a touch harder but regularly spike toward next tier (e.g. T13 71 → 69-77).
    const variance = -down + Math.floor(Math.random() * (down + upCap + 1));
    const cap = (typeof EG_ENDGAME_MONSTER_LEVEL_CAP !== 'undefined') ? EG_ENDGAME_MONSTER_LEVEL_CAP : 95;
    return Math.max(1, Math.min(cap, base + variance));
}

// Returns the resolved base level for the current encounter (falls back to 1).
// Chained-puzzle levels reuse regular puzzle defs that carry no monsterLevel
// of their own - in that case respect the original map def's monster level
// so monsters keep spawning at the map's intended level across the chain.
export function _egGetEncounterBaseLevel() {
    if (cur && cur.monsterLevel != null && cur.monsterLevel > 0) return cur.monsterLevel;
    if (typeof _egMapDef !== 'undefined' && globalThis._egMapDef
        && globalThis._egMapDef.monsterLevel != null && globalThis._egMapDef.monsterLevel > 0) {
        return globalThis._egMapDef.monsterLevel;
    }
    return 1;
}

// Builds a fixed monster list from cur.monsters, levelling each entry.
// Used when the map explicitly defines which monsters should appear.
export function _egBuildFixedNormalList(baseLevel, cap) {
    return cur.monsters.slice(0, cap).map(entry => ({
        id: entry.id,
        level: entry.level != null ? entry.level : _egRollMonsterLevel(baseLevel),
    }));
}

// Builds a randomised monster list by shuffling all non-boss defs.
// Count is random in [1, cap]. Used when the map has no explicit monster list.
// Tier-weighted so high-level maps (T14-T16) prefer T3 hard-hitters over T1 fodder.
export function _egCategorizeMonsterTier(def) {
    // T3: tanky / hard-hitting (high HP or high damage)
    if ((def.baseHP || 0) >= 110 || (def.baseDamage || 0) >= 15) return 3;
    // T2: medium
    if ((def.baseHP || 0) >= 55 || (def.baseDamage || 0) >= 7) return 2;
    return 1;
}
export function _egPickWeightedMonster(allDefs, baseLevel) {
    const lvl = Number(baseLevel) || 1;
    // At L90: 65% T3, 25% T2, 10% T1; at L1: inverse.
    let w1 = 1.0, w2 = 1.0, w3 = 1.0;
    if (lvl >= 70) { w1 = 0.15; w2 = 0.6; w3 = 1.5; }
    else if (lvl >= 40) { w1 = 0.4; w2 = 1.0; w3 = 1.1; }
    else if (lvl >= 15) { w1 = 1.0; w2 = 1.0; w3 = 0.5; }
    else { w1 = 1.5; w2 = 0.7; w3 = 0.2; }
    const pool = allDefs.map(d => {
        const tier = _egCategorizeMonsterTier(d);
        const w = tier === 3 ? w3 : tier === 2 ? w2 : w1;
        return { def: d, w };
    });
    const total = pool.reduce((s, e) => s + e.w, 0);
    let roll = Math.random() * total;
    for (const e of pool) {
        roll -= e.w;
        if (roll <= 0) return e.def;
    }
    return pool[pool.length - 1].def;
}
export function _egBuildRandomNormalList(baseLevel, cap) {
    const allNonBoss = Object.values(EG_MONSTER_DEFS);
    if (allNonBoss.length === 0) return [];

    const maxCount = Math.min(cap, allNonBoss.length);
    // Guarantee at least 2 monsters mid/high, 3 at T13+ - avoids lonely 1-monster maps
    let minCount = 1;
    if (baseLevel >= 60) minCount = 3;
    else if (baseLevel >= 30) minCount = 2;
    else if (baseLevel >= 14) minCount = 2;
    const clampedMin = Math.min(minCount, maxCount);
    const span = Math.max(1, maxCount - clampedMin + 1);
    const count = clampedMin + Math.floor(Math.random() * span); // clampedMin..cap
    const picked = [];
    const used = new Set();
    for (let i = 0; i < count; i++) {
        // Prefer unique picks but allow repeats if pool exhausted
        let def = _egPickWeightedMonster(allNonBoss, baseLevel);
        let attempts = 0;
        while (used.has(def.id) && attempts < 8) {
            def = _egPickWeightedMonster(allNonBoss, baseLevel);
            attempts++;
        }
        used.add(def.id);
        picked.push(def);
    }
    return picked.map(d => ({ id: d.id, level: _egRollMonsterLevel(baseLevel) }));
}

// Builds the normal (non-boss) part of the spawn list for the current encounter.
// Delegates to fixed or random list builders depending on cur.monsters.
// cur.maxMonsters caps the total count (0 = boss-only encounter).
export function _egBuildNormalSpawnList(baseLevel) {
    const fallbackCap = (typeof _egGetDefaultMonsterCap === 'function') ? _egGetDefaultMonsterCap(baseLevel) : EG_DEFAULT_MONSTER_CAP;
    const cap = (cur.maxMonsters != null && cur.maxMonsters >= 0) ? cur.maxMonsters : fallbackCap;
    if (cap === 0) return [];

    if (cur.monsters && cur.monsters.length > 0) {
        return _egBuildFixedNormalList(baseLevel, cap);
    }
    return _egBuildRandomNormalList(baseLevel, cap);
}

// Builds a boss list from an explicit list of boss entries on a map def object.
// Shared by both _egBuildBossSpawnList (cur) and _egBuildBossSpawnListFromDef (mapDef).
export function _egBuildFixedBossList(bosses, bossCap, baseLevel) {
    return bosses.slice(0, bossCap).map(entry => ({
        id: entry.id,
        level: entry.level != null ? entry.level : _egRollMonsterLevel(baseLevel),
        // Preserve the optional HP multiplier (e.g. 500k HP test
        // mode) so it survives the stamp → spawn-list → arena queue path.
        // Only max HP is scaled - boss damage stays at its normal value.
        hpMult: (entry.hpMult != null && entry.hpMult > 1) ? entry.hpMult : 1,
        isBossSpawn: true,
    }));
}

// Picks one random boss from EG_BOSS_DEFS and returns it as a one-entry list.
// Used when hasBoss is true but no explicit boss list is defined.
export function _egBuildRandomBossList(baseLevel) {
    const allBossDefs = Object.values(globalThis.EG_BOSS_DEFS);
    if (allBossDefs.length === 0) return [];
    const picked = allBossDefs[Math.floor(Math.random() * allBossDefs.length)];
    return [{ id: picked.id, level: _egRollMonsterLevel(baseLevel), isBossSpawn: true }];
}

// Builds the boss part of the spawn list for the current encounter (reads from cur).
// Uses cur.bosses if provided; otherwise picks one random boss when cur.hasBoss is true.
// cur.maxBosses caps the count (defaults to 1).
export function _egBuildBossSpawnList(baseLevel) {
    const hasBossFlag = cur.hasBoss;
    const explicitBosses = cur.bosses && cur.bosses.length > 0;
    if (!hasBossFlag && !explicitBosses) return [];

    const bossCap = (cur.maxBosses != null && cur.maxBosses > 0) ? cur.maxBosses : 1;

    if (explicitBosses) return _egBuildFixedBossList(cur.bosses, bossCap, baseLevel);
    return _egBuildRandomBossList(baseLevel);
}

// Like _egBuildBossSpawnList but reads from an explicit mapDef object instead of cur.
// Used by _egEnterBossArena so it always reads from the original map def.
export function _egBuildBossSpawnListFromDef(mapDef, baseLevel) {
    if (!mapDef) return [];
    const hasBossFlag = mapDef.hasBoss;
    const explicitBosses = mapDef.bosses && mapDef.bosses.length > 0;
    if (!hasBossFlag && !explicitBosses) return [];

    const bossCap = (mapDef.maxBosses != null && mapDef.maxBosses > 0) ? mapDef.maxBosses : 1;

    if (explicitBosses) return _egBuildFixedBossList(mapDef.bosses, bossCap, baseLevel);
    return _egBuildRandomBossList(baseLevel);
}

// Returns the full ordered spawn list for this encounter: normal monsters only.
// NOTE: Bosses never spawn inside regular puzzles. On boss maps they are
//       fought in dedicated boss-arena puzzles at the end of the run
//       (see _egEnterBossArena in endgame-encounter-chain.js).
export function _egBuildSpawnList() {
    const baseLevel = _egGetEncounterBaseLevel();
    return _egBuildNormalSpawnList(baseLevel);
}
