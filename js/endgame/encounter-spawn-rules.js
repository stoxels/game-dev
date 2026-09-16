//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Encounter spawn rules: which monsters/bosses appear and when. Puzzle
// helper, spawn-list builders (fixed + random + boss), the campaign
// monster pack, the respawn scheduler and the spawn stagger scheduler.
// tutorial-quest.js patches _egClearCampaignLevelFields and
// _egShouldPrepareCampaignEncounter through the write-through accessors.

// Phase 4 split: write-through globalThis accessors. The facade and sibling
// split modules rebind these through globalThis.<name> assignment
// (imported module bindings are read-only views) - the established
// step-9/step-10 pattern.
try { Object.defineProperty(globalThis, '_egClearCampaignLevelFields', { get() { return _egClearCampaignLevelFields; }, set(v) { _egClearCampaignLevelFields = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egShouldPrepareCampaignEncounter', { get() { return _egShouldPrepareCampaignEncounter; }, set(v) { _egShouldPrepareCampaignEncounter = v; }, configurable: true }); } catch (e) {}

import { EG_DEFAULT_MONSTER_CAP, EG_INITIAL_SPAWN_STAGGER_BASE_MS, EG_RESPAWN_DELAY_MIN_MS, EG_RESPAWN_DELAY_RANGE_MS, _egGetDefaultMonsterCap, _egGetRespawnDelayMs } from './encounter-constants.js';
import { _egSpawnMonster } from './encounter-monster-spawning.js';
import { _egCampaignMonsterLevel } from './endgame-leveling.js';
import { EG_ENDGAME_MONSTER_LEVEL_CAP, EG_MAP_TIER_MONSTER_LEVELS, _egRollMapTier } from './endgame-maps.js';
import { EG_MAX_CONCURRENT_MONSTERS, EG_MONSTER_DEFS } from './endgame-monsters.js';
import { EG_PLAYER_STATS } from './endgame-player-stats.js';
import { _egIsActive, _egIsCampaignRun } from './endgame-state.js';

export let EG_INITIAL_SPAWN_STAGGER_STEP_MS = 200;


//------------------------------------------------------------------------
//-------------------PUZZLE HELPER----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if every filled cell in the solution has been correctly placed.
export function _egIsPuzzleSolved() {
    if (!globalThis.cur || !globalThis.userGrid) return false;
    for (let r = 0; r < globalThis.cur.grid.length; r++)
        for (let c = 0; c < globalThis.cur.grid[0].length; c++)
            if (globalThis.cur.grid[r][c] === 1 && globalThis.userGrid[r][c] !== 1) return false;
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
    if (globalThis.cur && globalThis.cur.monsterLevel != null && globalThis.cur.monsterLevel > 0) return globalThis.cur.monsterLevel;
    if (typeof _egMapDef !== 'undefined' && globalThis._egMapDef
        && globalThis._egMapDef.monsterLevel != null && globalThis._egMapDef.monsterLevel > 0) {
        return globalThis._egMapDef.monsterLevel;
    }
    return 1;
}

// Builds a fixed monster list from cur.monsters, levelling each entry.
// Used when the map explicitly defines which monsters should appear.
export function _egBuildFixedNormalList(baseLevel, cap) {
    return globalThis.cur.monsters.slice(0, cap).map(entry => ({
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
    const cap = (globalThis.cur.maxMonsters != null && globalThis.cur.maxMonsters >= 0) ? globalThis.cur.maxMonsters : fallbackCap;
    if (cap === 0) return [];

    if (globalThis.cur.monsters && globalThis.cur.monsters.length > 0) {
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
    const hasBossFlag = globalThis.cur.hasBoss;
    const explicitBosses = globalThis.cur.bosses && globalThis.cur.bosses.length > 0;
    if (!hasBossFlag && !explicitBosses) return [];

    const bossCap = (globalThis.cur.maxBosses != null && globalThis.cur.maxBosses > 0) ? globalThis.cur.maxBosses : 1;

    if (explicitBosses) return _egBuildFixedBossList(globalThis.cur.bosses, bossCap, baseLevel);
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


//------------------------------------------------------------------------
//-------------------CAMPAIGN MONSTER PACK--------------------------------
//------------------------------------------------------------------------
// Every campaign level spawns a small, gently-tuned pack of monsters so the
// player earns XP and loot while solving. Health is budgeted from the
// puzzle's own "damage economy": each correct fill charges a projectile for
// EG_PLAYER_STATS.baseDamage, so a level with S solution cells can deal
// roughly S x baseDamage over a clean solve. Monsters claim a fraction of
// that, split across the pack, so an un-geared player can still clear them
// before the puzzle completes.
//
// Campaign packs never respawn and never include bosses.
export const EG_CAMPAIGN_MONSTER_CONFIG = {
    hpBudgetFraction: 0.85,   // share of the level's total player damage (~2x, so packs survive ~12 hits each with starter gear instead of ~6)
    minHp: 18,
    countBase: 2,
    countPerWorlds: 4,        // +1 monster every N worlds
    countMax: 5,
    minCellsPerMonster: 6,    // small puzzles support fewer monsters
    damageBase: 6,            // per-hit damage at monster level 1 (was 3 - never threatened 100 HP + starter armour)
    damagePerLevel: 0.32,     // +damage per monster level (was 0.18 - mid-campaign now ramps to ~16 at lvl 30)
    chargeMult: 1.15,         // campaign monsters wind up slightly slower than atlas ones (was 1.35 - too slow + pushback meant they rarely attacked)
};

// Fields _egPrepareCampaignEncounter stamps onto the level object. Listed so
// _egClearCampaignLevelFields can restore the story level to its pristine
// state once the encounter ends (the same level objects are reused as
// endgame map seeds, so nothing may leak).
export const EG_CAMPAIGN_STAMPED_FIELDS = [
    'campaignMonsters', 'campaignMonsterCount', 'campaignMonsterHp',
    'campaignMonsterDamage', 'monsters', 'monsterLevel', 'maxMonsters',
];

// Counts the solution cells (value 1) of the current puzzle.
export function _egCountSolutionCells() {
    if (!globalThis.cur || !globalThis.cur.grid) return 0;
    let n = 0;
    for (const row of globalThis.cur.grid) for (const v of row) if (v === 1) n++;
    return n;
}

// Picks `count` weak monsters for the campaign pack. The pool widens with
// monster level so early worlds stay to fragile creatures while late worlds
// can roll tankier ones (their HP is overridden by the campaign budget
// anyway, but baseId drives the sprite and resistances).
export function _egBuildCampaignMonsterList(count, level) {
    const defs = (typeof EG_MONSTER_DEFS !== 'undefined') ? Object.values(EG_MONSTER_DEFS) : [];
    if (!defs.length) return [];
    const maxBaseHp = level <= 12 ? 40 : level <= 30 ? 80 : level <= 50 ? 130 : 200;
    let pool = defs.filter(d => (d.baseHP || 0) <= maxBaseHp);
    if (!pool.length) pool = defs;
    const list = [];
    for (let i = 0; i < count; i++) {
        const def = pool[Math.floor(Math.random() * pool.length)];
        list.push({ id: def.id, level });
    }
    return list;
}

// Returns true when the current level should run a campaign monster pack.
// Excludes endgame sandbox levels and levels already stamped as map seeds.
function _egShouldPrepareCampaignEncounter() {
    if (!globalThis.cur) return false;
    if (globalThis.cur.isEndgameSandbox) return false;
    // Active map-device run / sandbox seed - already a monster level that is
    // NOT a campaign level.
    if (globalThis.cur.isMonsterLevel && !globalThis.cur.campaignMonsters) return false;
    if (globalThis.cur.isMapRunSeed) return false;
    if (typeof window !== 'undefined' && window._egIsMapDeviceRun) return false;
    return true;
}

// Stamps the current campaign level with everything the shared encounter loop
// needs (monster list, level, HP/damage budget) and returns true on success.
// Called from start-level.js right before _egStartEncounter().
export function _egPrepareCampaignEncounter() {
    if (!_egShouldPrepareCampaignEncounter()) return false;
    if (globalThis.cur.campaignMonsters) return true;   // already prepared (retry / chain)

    const cfg = EG_CAMPAIGN_MONSTER_CONFIG;
    const cells = _egCountSolutionCells();
    const perCellDamage = (typeof EG_PLAYER_STATS !== 'undefined' && EG_PLAYER_STATS.baseDamage) || 10;

    const world = globalThis.cur.world || 1;
    let count = cfg.countBase + Math.floor((world - 1) / cfg.countPerWorlds);
    count = Math.max(1, Math.min(cfg.countMax, count));
    count = Math.min(count, Math.max(1, Math.floor(cells / cfg.minCellsPerMonster)));

    const budget = cells * perCellDamage * cfg.hpBudgetFraction;
    const perHp = Math.max(cfg.minHp, Math.round(budget / Math.max(1, count)));

    const level = (typeof _egCampaignMonsterLevel === 'function')
        ? _egCampaignMonsterLevel(globalThis.cur.gIdx) : 1;
    const damage = Math.max(1, Math.round(cfg.damageBase + cfg.damagePerLevel * level));

    globalThis.cur.campaignMonsters = true;
    globalThis.cur.isMonsterLevel = true;
    globalThis.cur.monsterLevel = level;
    globalThis.cur.maxMonsters = count;
    globalThis.cur.campaignMonsterCount = count;
    globalThis.cur.campaignMonsterHp = perHp;
    globalThis.cur.campaignMonsterDamage = damage;
    globalThis.cur.monsters = _egBuildCampaignMonsterList(count, level);
    return true;
}

// Restores a campaign level object to its pristine story-level state after
// its encounter ends. Safe to call with a non-campaign level (no-op).
export function _egClearCampaignLevelFields(level) {
    if (!level || !level.campaignMonsters) return;
    EG_CAMPAIGN_STAMPED_FIELDS.forEach(k => { delete level[k]; });
    delete level.isMonsterLevel;
}


//------------------------------------------------------------------------
//-------------------RESPAWN SCHEDULER------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if a respawn should be suppressed right now.
// Checks boss phase, boss presence, and the concurrent cap. NOTE: the kill
// objective deliberately does NOT stop respawns - monsters keep flowing
// until the player enters the boss arena (extra kills are extra XP/loot;
// the leveling curve absorbs the higher per-map kill counts). Inside the
// boss arena no natural spawns happen at all - adds only appear when a
// boss ability purposefully summons them (_egMechSummonAdds).
export function _egShouldSuppressRespawn() {
    if (!_egIsActive()) return true;

    // Campaign levels spawn one fixed pack and never respawn - the pack is
    // budgeted against the puzzle's damage economy (see
    // _egPrepareCampaignEncounter) so kill XP and loot stay bounded.
    if (typeof _egIsCampaignRun === 'function' && _egIsCampaignRun()) return true;

    // Boss arena chain: no regular monsters interfere with the duel -
    // except when a boss ability summons them (direct _egSpawnMonster calls
    // from mechanic handlers bypass this gate by design).
    if (typeof _egBossPhaseActive !== 'undefined' && globalThis._egBossPhaseActive) return true;

    // Suppress if a boss is already on the field
    if (globalThis._egMonsters.some(m => m.isBoss)) return true;

    // Suppress if already at the concurrent cap
    if (globalThis._egMonsters.length >= EG_MAX_CONCURRENT_MONSTERS) return true;

    return false;
}

// Picks a random non-boss def and spawns it at the current encounter's base level.
export function _egRespawnRandomMonster() {
    const baseLevel = _egGetEncounterBaseLevel();
    const allNonBoss = Object.values(EG_MONSTER_DEFS);
    if (allNonBoss.length === 0) return;

    const def = allNonBoss[Math.floor(Math.random() * allNonBoss.length)];
    _egSpawnMonster(def.id, _egRollMonsterLevel(baseLevel));
}

// Schedules a single replacement monster to spawn after a short random delay.
// Called whenever a normal monster dies and the kill gate is not yet reached.
export function _egScheduleRespawn() {
    const resp = (typeof _egGetRespawnDelayMs === 'function') ? _egGetRespawnDelayMs(_egGetEncounterBaseLevel()) : { min: EG_RESPAWN_DELAY_MIN_MS, range: EG_RESPAWN_DELAY_RANGE_MS };
    const delay = resp.min + Math.random() * resp.range;
    const t = setTimeout(() => {
        if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) {
            // Paused - retry after pause without consuming the spawn slot
            _egScheduleRespawn();
            return;
        }
        if (_egShouldSuppressRespawn()) return;
        _egRespawnRandomMonster();
    }, delay);
    globalThis._egSpawnTimers.push(t); // tracked so it gets cancelled on encounter stop
}


//------------------------------------------------------------------------
//-------------------SPAWN STAGGER SCHEDULER------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Calculates a staggered delay for a single spawn entry in the initial wave.
// The first 2-3 monsters appear almost immediately at high tiers; the rest are spaced 2-6s apart.
export function _egCalcSpawnDelay(index, immediateCount, cumulativeDelay) {
    if (index < immediateCount) {
        // Tiny stagger so the first batch doesn't all land simultaneously
        return { delay: EG_INITIAL_SPAWN_STAGGER_BASE_MS + index * EG_INITIAL_SPAWN_STAGGER_STEP_MS, cumulative: cumulativeDelay };
    }
    const resp = (typeof _egGetRespawnDelayMs === 'function') ? _egGetRespawnDelayMs(_egGetEncounterBaseLevel()) : { min: EG_RESPAWN_DELAY_MIN_MS, range: EG_RESPAWN_DELAY_RANGE_MS };
    const extra = resp.min + Math.random() * resp.range;
    const newCumulative = cumulativeDelay + extra;
    return { delay: newCumulative, cumulative: newCumulative };
}

// Queues all monsters in spawnList with staggered appearance delays.
// The first 2-3 entries appear almost immediately at high tiers; the rest ramp up gradually.
export function _egScheduleMonsterSpawns(spawnList) {
    if (spawnList.length === 0) return;

    const lvl = _egGetEncounterBaseLevel();
    const immediateBase = lvl >= 60 ? 2 : lvl >= 30 ? 2 : 1;
    const immediateCount = Math.min(spawnList.length, immediateBase + Math.floor(Math.random() * 2)); // 2-3 at high, 1-2 at low
    let cumulativeDelay = 0;

    spawnList.forEach((entry, i) => {
        const result = _egCalcSpawnDelay(i, immediateCount, cumulativeDelay);
        cumulativeDelay = result.cumulative;

        const t = setTimeout(() => {
            if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) {
                // Paused - delay the spawn until the game resumes
                const retry = setInterval(() => {
                    if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;
                    clearInterval(retry);
                    if (_egIsActive()) _egSpawnMonster(entry.id, entry.level || 1);
                }, 200);
                return;
            }
            if (_egIsActive()) _egSpawnMonster(entry.id, entry.level || 1);
        }, result.delay);
        globalThis._egSpawnTimers.push(t);
    });
}
