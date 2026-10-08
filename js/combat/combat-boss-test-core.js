//------------------------------------------------------------------------
//-------------------BOSS TEST CONFIGURATION & SCALING--------------------
//------------------------------------------------------------------------
// Shared constants and side-effect-free boss preview helpers used by the
// boss-test launch and presentation modules.

import { _egMapTierMonsterLevel } from '../loot/loot-map-config.js';

//------------------------------------------------------------------------
//-------------------CONFIGURATION----------------------------------------
//------------------------------------------------------------------------

// Generous time budget for a single test fight (1 hour, in seconds).
export const EG_BOSS_TEST_TIME_LIMIT = 3600;

// Fallback monster level per map tier (T1–T16), used when
// _egMapTierMonsterLevel() (endgame-maps.js) is unavailable. Mirrors
// EG_MAP_TIER_MONSTER_LEVELS.
export const EG_BOSS_TEST_TIER_LEVELS = [3, 6, 10, 14, 19, 24, 30, 36, 43, 50, 57, 64, 71, 78, 84, 90];

// Fallback test level for bosses with no atlas region assigned.
export const EG_BOSS_TEST_DEFAULT_LEVEL = 50;

// Arena board caps - mirrors EG_BOSS_ARENA_MAX_ROWS/COLS in
// endgame-encounter-chain.js so fights feel like real boss arenas.
export const EG_BOSS_TEST_ARENA_MAX_ROWS = 15;
export const EG_BOSS_TEST_ARENA_MAX_COLS = 25;
export const EG_BOSS_TEST_ARENA_MIN_CELLS = 36;



//------------------------------------------------------------------------
//-------------------TIER MAPPING-----------------------------------------
//------------------------------------------------------------------------

// Returns the atlas map tier (1–16) a boss belongs to, via
// EG_ATLAS_REGION_BOSSES (boss-rosters.js: region `atlas_t{tier}_{slot}`
// → boss id). Returns 0 when the boss has no assigned region.
export function _egbtBossTier(bossId) {
    if (typeof EG_ATLAS_REGION_BOSSES === 'undefined') return 0;
    for (const regionId of Object.keys(globalThis.EG_ATLAS_REGION_BOSSES)) {
        if (globalThis.EG_ATLAS_REGION_BOSSES[regionId] !== bossId) continue;
        const m = /^atlas_t(\d+)_/.exec(regionId);
        if (m) return Math.max(1, Math.min(16, parseInt(m[1], 10)));
    }
    return 0;
}

// Monster level a boss of the given tier fights at on real maps.
export function _egbtTierMonsterLevel(tier) {
    if (typeof _egMapTierMonsterLevel === 'function') {
        try { return Math.max(1, Math.round(_egMapTierMonsterLevel(tier))); } catch (e) {}
    }
    return EG_BOSS_TEST_TIER_LEVELS[Math.max(1, Math.min(16, tier)) - 1];
}

// Test level for one boss: its tier's monster level, or the default for
// bosses with no assigned region.
export function _egbtLevelForBoss(bossId) {
    const tier = _egbtBossTier(bossId);
    return tier > 0 ? _egbtTierMonsterLevel(tier) : EG_BOSS_TEST_DEFAULT_LEVEL;
}


//------------------------------------------------------------------------
//-------------------BOSS TOOLTIP & TEST HP HELPERS-----------------------
//------------------------------------------------------------------------

// Builds a tooltip HTML string for a boss, listing its phases, mechanics,

// Test HP boost: scales boss to ~500k max HP while keeping phase thresholds
// and damage unchanged.
export function _egbtCalcTestHPMultiplier(def, level) {
    const preview = _egbtScaledPreview(def, level);
    const targetHP = 500000;
    return preview.hp > 0 ? targetHP / preview.hp : 1;
}

//------------------------------------------------------------------------
//-------------------SCALED STAT PREVIEW----------------------------------
//------------------------------------------------------------------------

// Side-effect-free preview of a boss's HP at the test level. Mirrors the
// scaling formula in _egBuildBoss (boss-framework.js) without touching
// the spawn counter.
export function _egbtScaledPreview(def, level) {
    const lvl = Math.max(1, Math.round(level || 1));
    const baseHpScale = 1 + globalThis.EG_BOSS_LEVEL_HP_SCALE * (lvl - 1);
    const lateMult = (typeof _egGetBossLateHpMult === 'function') ? globalThis._egGetBossLateHpMult(lvl) : 1;
    const dmgScale = 1 + globalThis.EG_BOSS_LEVEL_DAMAGE_SCALE * (lvl - 1);
    return {
        hp: Math.round(def.baseHP * baseHpScale * lateMult),
        dmg: Math.round(def.baseDamage * dmgScale),
    };
}
