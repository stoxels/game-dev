//------------------------------------------------------------------------
//-------------------CONSTANTS & CONFIGURATION----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// All zone IDs where monster cards can be rendered.
const EG_MONSTER_ZONES = [
    'eg-monster-panel',
    'eg-panel-left',
    'eg-panel-right',
    'eg-panel-bottom',
    'eg-panel-top-corner'
];

// Default monster count per wave if cur.maxMonsters is not set.
// Scales with monster level so T16 feels dense: 3 at low tiers, 4 at mid, 5 at high.
// T1 stays breezy, T3-7 ramp, T8+ feels crowded (PoE density).
function _egGetDefaultMonsterCap(baseLevel) {
    const lvl = Number(baseLevel) || 1;
    if (lvl >= 60) return 5;
    if (lvl >= 30) return 4;
    if (lvl >= 14) return 3;
    return 2; // T1-T2 very light
}
const EG_DEFAULT_MONSTER_CAP = 3; // legacy fallback — use _egGetDefaultMonsterCap() instead

// Delay before a boss materialises after entering an arena / after the
// previous arena boss died (ms).
const EG_BOSS_SPAWN_DELAY_MS = 1500;

// Delay range for respawn timer (ms). A random value in [min, min+variance] is used.
// Shorter at high tiers so the screen never stays at 1 monster for long.
function _egGetRespawnDelayMs(baseLevel) {
    const lvl = Number(baseLevel) || 1;
    if (lvl >= 60) return { min: 2200, range: 2800 }; // 2.2-5.0s at T13+
    if (lvl >= 30) return { min: 2800, range: 3500 }; // 2.8-6.3s at T8+
    return { min: 4000, range: 6000 }; // 4-10s at low tiers
}
const EG_RESPAWN_DELAY_MIN_MS = 4000;
const EG_RESPAWN_DELAY_RANGE_MS = 6000;

// Delay before re-rendering the panel after a monster death (ms).
const EG_PANEL_RERENDER_DELAY_MS = 350;

// How long the player HUD hit flash lasts (ms).
const EG_PLAYER_HIT_FLASH_MS = 150;

// How long a floating damage number stays on screen (ms).
const EG_DAMAGE_NUMBER_DURATION_MS = 1050;

// How long a floating player damage number stays on screen (ms).
const EG_PLAYER_DAMAGE_NUMBER_DURATION_MS = 1050;

// How long the immune flash and label last on the card (ms).
const EG_IMMUNE_FLASH_DURATION_MS = 400;
const EG_IMMUNE_LABEL_DURATION_MS = 700;

// Melee animation roundtrip duration (ms). Impact fires at the midpoint.
const EG_MELEE_ANIM_DURATION_MS = 500;

// Ranged monster projectile travel duration (ms).
const EG_MONSTER_PROJ_DURATION_MS = 400;

// Base window after a successful block during which the player cannot
// block again (ms). Player remains free to attack — recovery only disables
// blocking. Reduced by the blockRecoveryPct stat.
const EG_BLOCK_LOCKOUT_BASE_MS = 8000;

// Hold-E parry baseline values (gear adds on top via parry/deflect mods)
const EG_PARRY_BASE_PCT = 50;          // 50% baseline while holding E
const EG_DEFLECT_BASE_PCT = 5;         // 5% chance on a successful parry to deflect
const EG_DEFLECT_BASE_DMG_PCT = 30;    // deflected projectile deals 30% of monster's damage

// Timestamp (Date.now()) until which the player cannot block again due to
// a recent block. 0 when not locked out.
let _egPlayerBlockLockoutUntil = 0;

EG_INITIAL_SPAWN_STAGGER_BASE_MS = 500
EG_INITIAL_SPAWN_STAGGER_STEP_MS = 200


//------------------------------------------------------------------------
//-------------------PUZZLE HELPER----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if every filled cell in the solution has been correctly placed.
function _egIsPuzzleSolved() {
    if (!cur || !userGrid) return false;
    for (let r = 0; r < cur.grid.length; r++)
        for (let c = 0; c < cur.grid[0].length; c++)
            if (cur.grid[r][c] === 1 && userGrid[r][c] !== 1) return false;
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
const EG_EARLY_VARIANCE_FREE_LEVEL = 8;
const EG_MONSTER_VARIANCE_DOWN = 2;
const EG_MONSTER_VARIANCE_UP_MIN = 2;
const EG_MONSTER_VARIANCE_UP_MAX = 6;

function _egRollMonsterLevel(baseLevel) {
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
// of their own — in that case respect the original map def's monster level
// so monsters keep spawning at the map's intended level across the chain.
function _egGetEncounterBaseLevel() {
    if (cur && cur.monsterLevel != null && cur.monsterLevel > 0) return cur.monsterLevel;
    if (typeof _egMapDef !== 'undefined' && _egMapDef
        && _egMapDef.monsterLevel != null && _egMapDef.monsterLevel > 0) {
        return _egMapDef.monsterLevel;
    }
    return 1;
}

// Builds a fixed monster list from cur.monsters, levelling each entry.
// Used when the map explicitly defines which monsters should appear.
function _egBuildFixedNormalList(baseLevel, cap) {
    return cur.monsters.slice(0, cap).map(entry => ({
        id: entry.id,
        level: entry.level != null ? entry.level : _egRollMonsterLevel(baseLevel),
    }));
}

// Builds a randomised monster list by shuffling all non-boss defs.
// Count is random in [1, cap]. Used when the map has no explicit monster list.
// Tier-weighted so high-level maps (T14-T16) prefer T3 hard-hitters over T1 fodder.
function _egCategorizeMonsterTier(def) {
    // T3: tanky / hard-hitting (high HP or high damage)
    if ((def.baseHP || 0) >= 110 || (def.baseDamage || 0) >= 15) return 3;
    // T2: medium
    if ((def.baseHP || 0) >= 55 || (def.baseDamage || 0) >= 7) return 2;
    return 1;
}
function _egPickWeightedMonster(allDefs, baseLevel) {
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
function _egBuildRandomNormalList(baseLevel, cap) {
    const allNonBoss = Object.values(EG_MONSTER_DEFS);
    if (allNonBoss.length === 0) return [];

    const maxCount = Math.min(cap, allNonBoss.length);
    // Guarantee at least 2 monsters mid/high, 3 at T13+ — avoids lonely 1-monster maps
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
function _egBuildNormalSpawnList(baseLevel) {
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
function _egBuildFixedBossList(bosses, bossCap, baseLevel) {
    return bosses.slice(0, bossCap).map(entry => ({
        id: entry.id,
        level: entry.level != null ? entry.level : _egRollMonsterLevel(baseLevel),
        // Preserve the optional HP multiplier (e.g. 500k HP test
        // mode) so it survives the stamp → spawn-list → arena queue path.
        // Only max HP is scaled — boss damage stays at its normal value.
        hpMult: (entry.hpMult != null && entry.hpMult > 1) ? entry.hpMult : 1,
        isBossSpawn: true,
    }));
}

// Picks one random boss from EG_BOSS_DEFS and returns it as a one-entry list.
// Used when hasBoss is true but no explicit boss list is defined.
function _egBuildRandomBossList(baseLevel) {
    const allBossDefs = Object.values(EG_BOSS_DEFS);
    if (allBossDefs.length === 0) return [];
    const picked = allBossDefs[Math.floor(Math.random() * allBossDefs.length)];
    return [{ id: picked.id, level: _egRollMonsterLevel(baseLevel), isBossSpawn: true }];
}

// Builds the boss part of the spawn list for the current encounter (reads from cur).
// Uses cur.bosses if provided; otherwise picks one random boss when cur.hasBoss is true.
// cur.maxBosses caps the count (defaults to 1).
function _egBuildBossSpawnList(baseLevel) {
    const hasBossFlag = cur.hasBoss;
    const explicitBosses = cur.bosses && cur.bosses.length > 0;
    if (!hasBossFlag && !explicitBosses) return [];

    const bossCap = (cur.maxBosses != null && cur.maxBosses > 0) ? cur.maxBosses : 1;

    if (explicitBosses) return _egBuildFixedBossList(cur.bosses, bossCap, baseLevel);
    return _egBuildRandomBossList(baseLevel);
}

// Like _egBuildBossSpawnList but reads from an explicit mapDef object instead of cur.
// Used by _egEnterBossArena so it always reads from the original map def.
function _egBuildBossSpawnListFromDef(mapDef, baseLevel) {
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
function _egBuildSpawnList() {
    const baseLevel = _egGetEncounterBaseLevel();
    return _egBuildNormalSpawnList(baseLevel);
}


//------------------------------------------------------------------------
//-------------------RESPAWN SCHEDULER------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if a respawn should be suppressed right now.
// Checks boss phase, boss presence, and the concurrent cap. NOTE: the kill
// objective deliberately does NOT stop respawns — monsters keep flowing
// until the player enters the boss arena (extra kills are extra XP/loot;
// the leveling curve absorbs the higher per-map kill counts). Inside the
// boss arena no natural spawns happen at all — adds only appear when a
// boss ability purposefully summons them (_egMechSummonAdds).
function _egShouldSuppressRespawn() {
    if (!_egIsActive()) return true;

    // Boss arena chain: no regular monsters interfere with the duel —
    // except when a boss ability summons them (direct _egSpawnMonster calls
    // from mechanic handlers bypass this gate by design).
    if (typeof _egBossPhaseActive !== 'undefined' && _egBossPhaseActive) return true;

    // Suppress if a boss is already on the field
    if (_egMonsters.some(m => m.isBoss)) return true;

    // Suppress if already at the concurrent cap
    if (_egMonsters.length >= EG_MAX_CONCURRENT_MONSTERS) return true;

    return false;
}

// Picks a random non-boss def and spawns it at the current encounter's base level.
function _egRespawnRandomMonster() {
    const baseLevel = _egGetEncounterBaseLevel();
    const allNonBoss = Object.values(EG_MONSTER_DEFS);
    if (allNonBoss.length === 0) return;

    const def = allNonBoss[Math.floor(Math.random() * allNonBoss.length)];
    _egSpawnMonster(def.id, _egRollMonsterLevel(baseLevel));
}

// Schedules a single replacement monster to spawn after a short random delay.
// Called whenever a normal monster dies and the kill gate is not yet reached.
function _egScheduleRespawn() {
    const resp = (typeof _egGetRespawnDelayMs === 'function') ? _egGetRespawnDelayMs(_egGetEncounterBaseLevel()) : { min: EG_RESPAWN_DELAY_MIN_MS, range: EG_RESPAWN_DELAY_RANGE_MS };
    const delay = resp.min + Math.random() * resp.range;
    const t = setTimeout(() => {
        if (typeof _gamePaused !== 'undefined' && _gamePaused) {
            // Paused — retry after pause without consuming the spawn slot
            _egScheduleRespawn();
            return;
        }
        if (_egShouldSuppressRespawn()) return;
        _egRespawnRandomMonster();
    }, delay);
    _egSpawnTimers.push(t); // tracked so it gets cancelled on encounter stop
}


//------------------------------------------------------------------------
//-------------------SPAWN STAGGER SCHEDULER------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Calculates a staggered delay for a single spawn entry in the initial wave.
// The first 2-3 monsters appear almost immediately at high tiers; the rest are spaced 2-6s apart.
function _egCalcSpawnDelay(index, immediateCount, cumulativeDelay) {
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
function _egScheduleMonsterSpawns(spawnList) {
    if (spawnList.length === 0) return;

    const lvl = _egGetEncounterBaseLevel();
    const immediateBase = lvl >= 60 ? 2 : lvl >= 30 ? 2 : 1;
    const immediateCount = Math.min(spawnList.length, immediateBase + Math.floor(Math.random() * 2)); // 2-3 at high, 1-2 at low
    let cumulativeDelay = 0;

    spawnList.forEach((entry, i) => {
        const result = _egCalcSpawnDelay(i, immediateCount, cumulativeDelay);
        cumulativeDelay = result.cumulative;

        const t = setTimeout(() => {
            if (typeof _gamePaused !== 'undefined' && _gamePaused) {
                // Paused — delay the spawn until the game resumes
                const retry = setInterval(() => {
                    if (typeof _gamePaused !== 'undefined' && _gamePaused) return;
                    clearInterval(retry);
                    if (_egIsActive()) _egSpawnMonster(entry.id, entry.level || 1);
                }, 200);
                return;
            }
            if (_egIsActive()) _egSpawnMonster(entry.id, entry.level || 1);
        }, result.delay);
        _egSpawnTimers.push(t);
    });
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER LIFECYCLE----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Duration of the gear "stagger" charge-timer pause (pants mod).
const EG_STAGGER_DURATION_MS = 2500;

// Tick interval for the gear lifeRegen heal (life_regen mod, HP per second).
const EG_LIFE_REGEN_INTERVAL_MS = 1000;

// Resets all encounter state variables to their initial values.
function _egResetEncounterState() {
    // Reset the low-mistakes banner state for the new puzzle/encounter
    if (typeof _egResetMistakesWarningState === 'function') _egResetMistakesWarningState();
    if (typeof _egResetLowHealthWarningState === 'function') _egResetLowHealthWarningState();
    if (typeof _egResetAbsorptionBrokenState === 'function') _egResetAbsorptionBrokenState();
    _egEncounterActive = true;
    _egTargetId = null;
    _egMonsters = [];
    // Do NOT clear _egPendingRevealQueue here — start-of-puzzle passives
    // queued reveals before _egStartEncounter and would be lost. Queue is
    // cleared on _egStopEncounter or after flushing.
    _egMapDef = cur;
    _egMonsterSpawnCounter = 0;
    _egPlayerAbsorptionCurrent = _egComputePlayerStats().absorption;
    _egCancelAbsorptionRegen();
    if (typeof _egAilmentsReset === 'function') _egAilmentsReset();
    if (typeof _egHazardsReset === 'function') _egHazardsReset();
    if (typeof _egClearChargedProjectileVisual === 'function') _egClearChargedProjectileVisual();

    // Gear: channel / arcane surge streaks restart with each encounter
    _egChannelStacks = 0;
    _egArcaneSurgeStreak = 0;
    // Gear: warding — "once per map". Standalone monster levels are their own
    // map, so refresh here; device-map runs refresh only at launch
    // (_egLaunchMapFromDevice) so the save persists across chained puzzles.
    if (!window._egIsMapDeviceRun) _egWardingUsedThisMap = false;

    // First step toast flag reset
    _egFirstStepToastShown = false;

    // Hold-E pause starts released
    if (typeof _egHoldEPauseActive !== 'undefined') _egHoldEPauseActive = false;
    if (typeof _egSetHoldEPauseVisual === 'function') _egSetHoldEPauseVisual(false);

    // Initial low-mistakes check — shows the 3/2/1/0 overlay immediately
    // if the map already starts with a tight mistake budget.
    if (typeof _egMaybeShowMistakesWarning === 'function') _egMaybeShowMistakesWarning();
}

// Starts the combat tick loop at 10Hz.
function _egStartTickLoop() {
    if (_egTickInterval) clearInterval(_egTickInterval);
    _egTickInterval = setInterval(_egTickLoop, 100);
}

// Initialises and begins a full monster encounter for the current level.
// Called from start-level.js or equivalent when cur.isMonsterLevel is true.
function _egStartEncounter() {
    _egResetEncounterState();
    _egRenderPanel();
    _egStartTickLoop();
    _egStartPickupSpawner();
    _egScheduleMonsterSpawns(_egBuildSpawnList());
    // Flush any auto-reveals that fired before the encounter went live
    // (start-of-puzzle passives run before _egStartEncounter in start-level.js).
    if (typeof _egFlushPendingRevealProjectiles === 'function') {
        // Small delay so the first monster has time to spawn and be auto-targeted.
        setTimeout(() => _egFlushPendingRevealProjectiles(), 650);
    }
}

// Clears all pending spawn timers and resets the timer list.
function _egCancelSpawnTimers() {
    _egSpawnTimers.forEach(t => clearTimeout(t));
    _egSpawnTimers = [];
}

// Stops the combat tick loop if one is running.
function _egStopTickLoop() {
    if (_egTickInterval) {
        clearInterval(_egTickInterval);
        _egTickInterval = null;
    }
}

// Tears down a running encounter and cleans up all state and DOM.
// Safe to call even if no encounter is active.
function _egStopEncounter() {
    if (window._egSuppressEncounterStop) return;

    _egEncounterActive = false;
    _egMonsters = [];
    _egTargetId = null;
    if (typeof _egPendingRevealQueue !== 'undefined') _egPendingRevealQueue = [];

    if (typeof clearActiveRandomWalkers === 'function') clearActiveRandomWalkers();

    if (typeof _egClearChargedProjectileVisual === 'function') _egClearChargedProjectileVisual();
    _egStopTickLoop();
    _egCancelSpawnTimers();
    _egStopPickupSpawner();
    if (typeof _egAilmentsCleanup === 'function') _egAilmentsCleanup();
    if (typeof _egHazardsCleanup === 'function') _egHazardsCleanup();
    _egBossCleanupAll();
    _egCancelAbsorptionRegen();
    if (typeof _egResetMistakesWarningState === 'function') _egResetMistakesWarningState();
    if (typeof _egResetLowHealthWarningState === 'function') _egResetLowHealthWarningState();
    if (typeof _egResetAbsorptionBrokenState === 'function') _egResetAbsorptionBrokenState();
    if (typeof _egChainCleanup === 'function') _egChainCleanup();
    _egHideMonsterPanel();
    if (typeof _egHoldEPauseActive !== 'undefined') _egHoldEPauseActive = false;
    if (typeof _egSetHoldEPauseVisual === 'function') _egSetHoldEPauseVisual(false);
}


//------------------------------------------------------------------------
//-------------------COMBAT TICK LOOP-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Advances a single monster's charge bar by one tick (0.1s at 10Hz).
// Fires the monster's attack when the charge bar fills completely.
function _egTickMonster(m) {
    // Brutus's sacrificial zombies never attack — they only shamble into the
    // ground-slam band; their movement is driven by the roaming tick in
    // boss-brutus.js, so skip charge/attack entirely.
    if (m.isSacrificialZombie) return;

    // Active map run: monster regeneration — heals #% of max life per second.
    if (m.regenPctMaxLife > 0 && m.maxHP > 0 && m.currentHP > 0
        && m.currentHP < m.maxHP) {
        m.regenAcc = (m.regenAcc || 0) + 0.1;
        if (m.regenAcc >= 1) {
            const heal = Math.max(1, Math.round(m.maxHP * m.regenPctMaxLife / 100));
            m.currentHP = Math.min(m.maxHP, m.currentHP + heal);
            m.regenAcc = 0;
        }
    }

    // Active map run: bosses enrage below 30% life — one-time damage boost.
    if (m.isBoss && !m.enraged && m.maxHP > 0 && m.damageValue > 0
        && m.currentHP > 0 && m.currentHP <= m.maxHP * 0.3) {
        const enragePct = (typeof _egGetActiveMapModValue === 'function')
            ? _egGetActiveMapModValue('map_boss_enrage') : 0;
        if (enragePct > 0) {
            m.enraged = true;
            m.damageValue = Math.round(m.damageValue * (1 + enragePct / 100));
            if (m.bossBaseDamage != null) {
                m.bossBaseDamage = Math.round(m.bossBaseDamage * (1 + enragePct / 100));
            }
            showToast(`😡 ${t('eg_mm_toast_enrage') || 'The Boss is enraged!'}`);
        }
    }

    // Active map run: wounded desperation — non-boss monsters below 25%
    // life fight harder (one-time damage boost).
    if (!m.isBoss && !m.desperationTriggered && m.desperationPct > 0
        && m.maxHP > 0 && m.damageValue > 0
        && m.currentHP > 0 && m.currentHP <= m.maxHP * 0.25) {
        m.desperationTriggered = true;
        m.damageValue = Math.round(m.damageValue * (1 + m.desperationPct / 100));
    }

    // Gear: stagger — the charge timer is paused for a short window after a hit
    if (m.staggeredUntil && Date.now() < m.staggeredUntil) return;
    // Gear: first_step — monsters don't charge-up their attacks for the first X seconds after spawning
    if (m.firstStepUntil && Date.now() < m.firstStepUntil) return;
    // The Marksman's Arrow Gauntlet: the boss's own attack charge freezes —
    // the bow volley IS his attack while the gauntlet holds the arena
    // (boss-marksman.js).
    if (m.isBoss && typeof _egMarksGauntletChargePaused === 'function' && _egMarksGauntletChargePaused()) return;
    // Ailments: frozen monsters don't charge, chilled ones charge at 50%
    const chargeMult = (typeof _egGetMonsterChargeMultiplier === 'function') ? _egGetMonsterChargeMultiplier(m) : 1;
    m.currentCharge += 0.1 * chargeMult;
    if (m.currentCharge >= m.chargeMax) {
        m.currentCharge = 0;
        _egFireMonsterAttack(m);
    }
}

// Advances the player's charge bar. Fires the player attack when full.
// The bar's max comes from the equipped weapon (see _egGetPlayerAttackInterval).
function _egTickPlayer() {
    // Hold-E pause: while E is held during an endgame encounter, freeze the player's
    // own auto-attack charge bar. Used to manually time melee strikes.
    if (typeof _egHoldEPauseActive !== 'undefined' && _egHoldEPauseActive) {
        if (typeof _egIsActive === 'function' && _egIsActive()) return;
        // If not in an active encounter, fall through (no effect outside endgame)
    }
    // Grand Prior defuse pause: while the player stands on an armed bomb the
    // charge bar freezes the same way (see _egPriorBombDefusing in
    // shared-boss-abilities.js) — but with none of the parry behaviour:
    // defusing is a DPS trade-off, not a defensive tool.
    // The Snail's broom: while held, the auto-attack charge bar is frozen
    // the same way (sweeping is a DPS trade-off — see boss-snail.js).
    // Snailgeddon freeze: while the ≤20% Snail finisher runs (countdown
    // AND the closing ring) the auto-attack charge bar stays frozen — it
    // is a dodge-and-run set-piece, not free damage time (boss-snail.js).
    if (typeof _egSnailgeddonActive === 'function' && _egSnailgeddonActive()) {
        if (typeof _egIsActive === 'function' && _egIsActive()) return;
    }
    // The Demolitionist's Bomb Maze: while the ≤25% finisher runs
    // (countdown AND the chase) the auto-attack charge bar stays frozen —
    // it is a pure dodge-and-run set-piece, not free damage time
    // (boss-demolitionist.js).
    if (typeof _egCrashMazeActive === 'function' && _egCrashMazeActive()) {
        if (typeof _egIsActive === 'function' && _egIsActive()) return;
    }
    if (typeof _egSnailBroomHeld === 'function' && _egSnailBroomHeld()) {
        if (typeof _egIsActive === 'function' && _egIsActive()) return;
    }
    if (typeof _egPriorBombDefusing === 'function' && _egPriorBombDefusing()) {
        if (typeof _egIsActive === 'function' && _egIsActive()) return;
        // If not in an active encounter, fall through (no effect outside endgame)
    }
    // The Gust's wind lanes: while the player rides a lane the auto-attack
    // charge bar stays frozen — a dodge set-piece, not free DPS (boss-gust.js).
    if (typeof _egGustChargePaused === 'function' && _egGustChargePaused()) {
        if (typeof _egIsActive === 'function' && _egIsActive()) return;
    }
    // The Marksman's Arrow Gauntlet: countdown + arrow waves are a dodge
    // set-piece — the auto-attack bar is paused for the whole gauntlet
    // (boss-marksman.js).
    if (typeof _egMarksGauntletChargePaused === 'function' && _egMarksGauntletChargePaused()) {
        if (typeof _egIsActive === 'function' && _egIsActive()) return;
    }
    // The Clock's Time Freeze: the auto-attack charge bar is frozen for the
    // whole 30s window — a time-stop is not free DPS time (class abilities
    // and E-releases still work). boss-clock.js.
    if (typeof window !== 'undefined' && window._egClockTimeFreezeActive) {
        if (typeof _egIsActive === 'function' && _egIsActive()) return;
    }
    // The Firefly's formation trials: the auto-attack charge bar stays
    // frozen while the swarm repositions — a coordination set-piece, not
    // auto-attack time (boss-firefly.js).
    if (typeof window !== 'undefined' && typeof window._egFireflyTrialActive === 'function' && window._egFireflyTrialActive()) {
        if (typeof _egIsActive === 'function' && _egIsActive()) return;
    }
    // Ailments: frozen stops the auto-attack bar entirely (movement
    // prevention will hook into the same ailment once movement exists),
    // chilled slows it to half speed.
    const chargeMult = (typeof _egGetPlayerChargeMultiplier === 'function') ? _egGetPlayerChargeMultiplier() : 1;
    _egPlayerCurrentCharge += 0.1 * chargeMult; // Ticks at 10Hz[cite: 1]

    if (_egPlayerCurrentCharge >= _egGetPlayerAttackInterval()) {
        _egPlayerCurrentCharge = 0; // Reset charge

        // Only fire if there is an active target selected
        if (_egTargetId) {
            _egAnimatePlayerMelee(_egTargetId);
        }
    }
}

// ── Hold-E charge pause — freeze own auto-attack bar while E is held ───────
function _egSetHoldEPauseVisual(isPaused) {
    const bar = document.getElementById('avatar-charge-fill');
    if (bar) bar.classList.toggle('eg-charge-paused', !!isPaused);
    const alt = document.getElementById('eg-player-charge-bar');
    if (alt) alt.classList.toggle('eg-charge-paused', !!isPaused);
    // Sprite feedback — show "CHARGE PAUSED" directly on the avatar while E is held
    const hud = document.getElementById('player-avatar-wrapper');
    if (hud) {
        let lbl = document.getElementById('eg-hold-pause-label');
        if (isPaused) {
            if (!lbl) {
                lbl = document.createElement('div');
                lbl.id = 'eg-hold-pause-label';
                hud.appendChild(lbl);
            }
            const raw = (typeof t === 'function') ? (t('eg_hold_paused') || t('eg_parrying')) : '';
            const txt = raw && raw !== 'eg_hold_paused' && raw !== 'eg_parrying' ? raw : 'PARRYING';
            lbl.textContent = txt || 'PARRYING';
            lbl.style.display = '';
        } else if (lbl) {
            lbl.remove();
        }
    } else if (!isPaused) {
        // No avatar yet — ensure stray label elsewhere is cleaned up
        const stray = document.getElementById('eg-hold-pause-label');
        if (stray) stray.remove();
    }
}

function _initEgHoldEPauseHotkey() {
    // Parry key is configurable (js/keybinds.js, action 'eg-parry', E by
    // default). keydown starts the parry window, keyup ends it.
    const isParryKey = (e) => {
        if (typeof keybindMatches === 'function') return keybindMatches(e, 'eg-parry');
        return e.key && e.key.toLowerCase() === 'e';
    };
    document.addEventListener('keydown', (e) => {
        if (!e || !isParryKey(e)) return;
        if (e.repeat) return;
        // The Snail: pressing E drops a held broom (it respawns outside the grid).
        if (typeof _egSnailDropBroom === 'function') {
            try { _egSnailDropBroom(); } catch (err) {}
        }
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (document.querySelector('.modal-bg.show')) return;
        if (typeof _egIsActive === 'function' && !_egIsActive()) return;
        if (typeof _egHoldEPauseActive !== 'undefined' && _egHoldEPauseActive) return;
        _egHoldEPauseActive = true;
        _egSetHoldEPauseVisual(true);
    });
    document.addEventListener('keyup', (e) => {
        if (!e || !isParryKey(e)) return;
        if (typeof _egHoldEPauseActive !== 'undefined' && !_egHoldEPauseActive) {
            _egSetHoldEPauseVisual(false);
            return;
        }
        _egHoldEPauseActive = false;
        _egSetHoldEPauseVisual(false);
    });
    window.addEventListener('blur', () => {
        if (typeof _egHoldEPauseActive !== 'undefined' && _egHoldEPauseActive) {
            _egHoldEPauseActive = false;
            _egSetHoldEPauseVisual(false);
        }
    });
    // Also clear on encounter stop / visibility loss
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && typeof _egHoldEPauseActive !== 'undefined' && _egHoldEPauseActive) {
            _egHoldEPauseActive = false;
            _egSetHoldEPauseVisual(false);
        }
    });
}
_initEgHoldEPauseHotkey();

// ── Monster-card hover tooltip viewport clamp ──────────────────────────
// The compact card tooltip is CSS-positioned BELOW the emoji (top: 125%).
// Cards spawned into bottom-docked panels (eg-monster-panel, eg-panel-bottom)
// or the lower part of the right-side stack can push that tooltip past the
// bottom of the screen. On hover we measure the tooltip and, when it would
// clip the viewport, flip it above the card via .eg-tip-flip.
const EG_CARD_TOOLTIP_VIEW_MARGIN = 6;
document.addEventListener('mouseover', (e) => {
    const emoji = e.target && e.target.closest ? e.target.closest('.eg-emoji-wrapper') : null;
    if (!emoji) return;
    // Cards are static while hovered — evaluate once per rendered card.
    if (emoji.dataset.egTipClamped) return;
    emoji.dataset.egTipClamped = '1';

    const tip = emoji.querySelector('.eg-monster-compact-tooltip');
    if (!tip) return;

    // Let the CSS :hover rule show the tooltip, then measure its real box.
    requestAnimationFrame(() => {
        if (!tip.isConnected) return;
        const rect = tip.getBoundingClientRect();
        tip.classList.toggle('eg-tip-flip',
            rect.bottom > window.innerHeight - EG_CARD_TOOLTIP_VIEW_MARGIN);
    });
});

// Renders the visual width of the player's charge bar.
function _egUpdatePlayerChargeBar() {
    const playerChargeBar = document.getElementById('eg-player-charge-bar');
    if (playerChargeBar) {
        const chargePct = Math.min(100, Math.max(0, (_egPlayerCurrentCharge / _egGetPlayerAttackInterval()) * 100));
        playerChargeBar.style.width = chargePct + '%';
    }
}


function _egGetMaxAllowedMistakes() {
    // Hardcore: no mistake is allowed — overrides map limit and gear bonuses
    if (typeof curMods !== 'undefined' && curMods.hardcore) return 0;
    const def = _egMapDef || cur;
    if (!def || def.egMaxMistakes == null) return null;
    const gearBonus = (typeof _egComputePlayerStats === 'function')
        ? (_egComputePlayerStats().mistakeCount || 0) : 0;
    return def.egMaxMistakes + gearBonus;
}

function _egCheckMistakeLimit() {
    const max = _egGetMaxAllowedMistakes();
    if (max == null) return;
    // Low-mistakes overlay — fires when only 3/2/1/0 remain (deduped inside)
    if (typeof _egMaybeShowMistakesWarning === 'function') _egMaybeShowMistakesWarning();
    if (typeof mistakeCount !== 'undefined' && mistakeCount > max) {
        // Central defeat handler — the player keeps the loot collected so far.
        _egEndMapDefeated(t('eg_map_failed'), t('eg_too_many_mistakes'));
    }
}

// ── Mistakes-remaining warning (center-grid overlay) ─────────────────────
// Tracks the last remaining value so repeated HUD refreshes without a
// count change do not re-fire the banner, and increases (eraser) do not
// re-trigger a low-mistakes warning.
let _egLastMistakesWarningShown = null;
let _egLastMistakesRemaining = null;

function _egGetMistakesRemaining() {
    const max = _egGetMaxAllowedMistakes();
    if (max == null) return null;
    const curCount = (typeof mistakeCount !== 'undefined') ? mistakeCount : 0;
    return max - curCount;
}

// Fallback when timer.js hasn't defined it (e.g. isolated test harness):
// center-grid banners replace each other instead of stacking.
if (typeof _egClearCenterGridBanners !== 'function') {
    var _egClearCenterGridBanners = function (exceptId) {
        var ids = [
            'eg-low-time-warning-banner',
            'eg-mistakes-warning-banner',
            'eg-low-health-warning-banner',
            'eg-absorption-broken-banner',
            'eg-clock-call-banner',
            'eg-boss-arena-available-banner',
            'eg-map-cleared-banner'
        ];
        for (var i = 0; i < ids.length; i++) {
            if (ids[i] === exceptId) continue;
            const banner = document.getElementById(ids[i]);
            if (banner) banner.remove();
        }
    };
}

function _egShowMistakesWarningBanner(remaining) {
    // Dismiss any other center-grid banner so concurrent events don't stack
    _egClearCenterGridBanners('eg-mistakes-warning-banner');
    // Remove any stale banner so a rapid 3→2→1 cascade always shows the newest count
    const old = document.getElementById('eg-mistakes-warning-banner');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'eg-mistakes-warning-banner';
    // Severity class drives color + shake for 0 remaining
    const sev = Math.max(0, Math.min(3, remaining));
    el.className = `eg-mw-${sev}`;

    // Translation key per threshold — falls back to a plain string if missing
    const key = `eg_mistakes_warning_${sev}`;
    const raw = (typeof t === 'function') ? t(key) : '';
    const fallback = remaining === 0 ? '☠️ LAST CHANCE — 0 MISTAKES LEFT!'
        : remaining === 1 ? '⚠️ 1 MISTAKE LEFT!'
        : `⚠️ ${remaining} MISTAKES LEFT`;
    el.textContent = (raw && raw !== key) ? raw : fallback;
    document.body.appendChild(el);

    // Center over the puzzle grid (fallback: viewport center)
    const board = document.getElementById('ptable');
    if (board) {
        const r = board.getBoundingClientRect();
        el.style.left = (r.left + r.width / 2) + 'px';
        el.style.top = (r.top + r.height / 2) + 'px';
    } else {
        el.style.left = '50%';
        el.style.top = '50%';
    }

    // Toast counterpart — brief, color-coded by severity
    const toastKey = `eg_mistakes_warning_toast_${sev}`;
    const toastRaw = (typeof t === 'function') ? t(toastKey) : '';
    const toastFallback = el.textContent;
    const toastText = (toastRaw && toastRaw !== toastKey) ? toastRaw : toastFallback;
    const toastColors = { 3: '#facc15', 2: '#fb923c', 1: '#f87171', 0: '#ef4444' };
    if (typeof showToast === 'function') showToast(toastText, toastColors[sev] || '#f87171');

    setTimeout(() => el.remove(), 2500);
}

function _egMaybeShowMistakesWarning() {
    if (typeof _egIsActive !== 'function' || !_egIsActive()) return;
    const remaining = _egGetMistakesRemaining();
    if (remaining == null || remaining < 0) {
        // No limit or already over — keep last remaining for next comparison
        _egLastMistakesRemaining = remaining;
        return;
    }
    const prev = _egLastMistakesRemaining;
    _egLastMistakesRemaining = remaining;

    if (remaining > 3) {
        // Out of the 3/2/1/0 window — clear the dedup so re-entering can fire again
        _egLastMistakesWarningShown = null;
        return;
    }
    // Only warn when the count *decreased* into / within the window.
    // Increases (eraser) update the tracker but do not re-fire the overlay.
    if (prev != null && remaining >= prev) return;
    if (remaining === _egLastMistakesWarningShown) return;
    _egLastMistakesWarningShown = remaining;
    _egShowMistakesWarningBanner(remaining);
}

function _egResetMistakesWarningState() {
    _egLastMistakesWarningShown = null;
    _egLastMistakesRemaining = null;
    const banner = document.getElementById('eg-mistakes-warning-banner');
    if (banner) banner.remove();
}

//------------------------------------------------------------------------
//-------------------LOW HEALTH WARNING-----------------------------------
//------------------------------------------------------------------------

let _egLastHealthPct = null;
let _egLastLowHealthWarningShown = null;

function _egGetHealthPct() {
    if (typeof playerMaxHP === 'undefined' || playerMaxHP <= 0) return 1;
    return playerCurrentHP / playerMaxHP;
}

function _egGetLowHealthWarningTier(pct) {
    if (pct <= 0.35) return 35;
    return null;
}

function _egShowLowHealthWarningBanner() {
    _egClearCenterGridBanners('eg-low-health-warning-banner');
    const old = document.getElementById('eg-low-health-warning-banner');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'eg-low-health-warning-banner';
    el.className = 'eg-lh-35';

    const key = 'eg_low_health_warning_35';
    const raw = (typeof t === 'function') ? t(key) : '';
    const fallback = '⚠️ LOW HEALTH — 35% REMAINING';
    el.textContent = (raw && raw !== key) ? raw : fallback;
    document.body.appendChild(el);

    const board = document.getElementById('ptable');
    if (board) {
        const r = board.getBoundingClientRect();
        el.style.left = (r.left + r.width / 2) + 'px';
        el.style.top = (r.top + r.height / 2) + 'px';
    } else {
        el.style.left = '50%';
        el.style.top = '50%';
    }

    const toastKey = 'eg_low_health_warning_toast_35';
    const toastRaw = (typeof t === 'function') ? t(toastKey) : '';
    const toastFallback = el.textContent;
    const toastText = (toastRaw && toastRaw !== toastKey) ? toastRaw : toastFallback;
    if (typeof showToast === 'function') showToast(toastText, '#facc15');

    setTimeout(() => el.remove(), 2500);
}

function _egMaybeShowLowHealthWarning() {
    if (typeof _egIsActive !== 'function' || !_egIsActive()) return;
    if (typeof playerCurrentHP === 'undefined' || typeof playerMaxHP === 'undefined') return;
    if (playerCurrentHP <= 0) return;

    const pct = _egGetHealthPct();
    const prev = _egLastHealthPct;
    _egLastHealthPct = pct;

    const tier = _egGetLowHealthWarningTier(pct);
    if (!tier) {
        _egLastLowHealthWarningShown = null;
        return;
    }
    // Only warn when health *decreased* into / within a threshold.
    // Healing back up does not re-fire the overlay.
    if (prev != null && pct >= prev) return;
    if (_egLastLowHealthWarningShown) return;
    _egLastLowHealthWarningShown = true;
    _egShowLowHealthWarningBanner();
}

function _egResetLowHealthWarningState() {
    _egLastHealthPct = null;
    _egLastLowHealthWarningShown = null;
    const banner = document.getElementById('eg-low-health-warning-banner');
    if (banner) banner.remove();
}

//------------------------------------------------------------------------
//-------------------ABSORPTION BROKEN WARNING----------------------------
//------------------------------------------------------------------------
// Only fires when the absorption shield transitions from >0 to 0 (broken),
// not at percentage thresholds like the health warning.

function _egShowAbsorptionBrokenBanner() {
    _egClearCenterGridBanners('eg-absorption-broken-banner');
    const old = document.getElementById('eg-absorption-broken-banner');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'eg-absorption-broken-banner';

    const key = 'eg_absorption_broken';
    const raw = (typeof t === 'function') ? t(key) : '';
    const fallback = '🛡️ SHIELD BROKEN!';
    el.textContent = (raw && raw !== key) ? raw : fallback;
    document.body.appendChild(el);

    const board = document.getElementById('ptable');
    if (board) {
        const r = board.getBoundingClientRect();
        el.style.left = (r.left + r.width / 2) + 'px';
        el.style.top = (r.top + r.height / 2) + 'px';
    } else {
        el.style.left = '50%';
        el.style.top = '50%';
    }

    const toastKey = 'eg_absorption_broken_toast';
    const toastRaw = (typeof t === 'function') ? t(toastKey) : '';
    const toastFallback = el.textContent;
    const toastText = (toastRaw && toastRaw !== toastKey) ? toastRaw : toastFallback;
    if (typeof showToast === 'function') showToast(toastText, '#7dd3fc');

    setTimeout(() => el.remove(), 2500);
}

function _egMaybeShowAbsorptionBroken(prevAbsorption, nextAbsorption) {
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    if (prevAbsorption > 0 && nextAbsorption <= 0) {
        _egShowAbsorptionBrokenBanner();
    }
}

function _egResetAbsorptionBrokenState() {
    const banner = document.getElementById('eg-absorption-broken-banner');
    if (banner) banner.remove();
}


//------------------------------------------------------------------------
//-------------------MAP FAILED OVERLAY-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Intercepts every defeat path that opens the generic lose overlay while an
// endgame map is still running (timer expiry, hardcore fail, golden clock,
// random walkers, ...): instead of Retry/Levels the player gets the map-lost
// screen (see _egEndMapDefeated in endgame-encounter-chain.js), which keeps
// everything collected during the run. Endgame-specific deaths (mistake
// limit reached, HP zero) call _egEndMapDefeated directly.
function _egEnsureLoseOverlayEndgameUI() {
    const ov = document.getElementById('ov-lose');
    if (!ov || ov.dataset.egFailUiBound) return;
    ov.dataset.egFailUiBound = '1';

    new MutationObserver(() => {
        if (!ov.classList.contains('show')) return;
        if (typeof _egIsActive !== 'function' || !_egIsActive()) return;
        if (window._egMapDefeatInProgress) {
            ov.classList.remove('show', 'eg-map-failed');
            return;
        }

        const titleEl = document.getElementById('lose-title');
        const subEl = document.getElementById('lose-sub');
        _egEndMapDefeated(
            titleEl ? titleEl.textContent : null,
            subEl ? subEl.textContent : null
        );
    }).observe(ov, { attributes: true, attributeFilter: ['class'] });
}


// Gear: lifeRegen — heals the player for lifeRegen HP once per second
// while an encounter is running. No-ops at full HP or when dead.
let _egLastLifeRegenAt = 0;
function _egTickLifeRegen() {
    const now = Date.now();
    if (now - _egLastLifeRegenAt < EG_LIFE_REGEN_INTERVAL_MS) return;
    _egLastLifeRegenAt = now;

    const regen = _egComputePlayerStats().lifeRegen || 0;
    if (regen <= 0 || playerCurrentHP <= 0 || playerCurrentHP >= playerMaxHP) return;

    // Active map run: No Life Regeneration — gear regen is disabled.
    if (typeof _egHasActiveMapMod === 'function' && _egHasActiveMapMod('map_no_regeneration')) return;

    playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + regen);
    if (typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
}

// Runs at 10Hz. Advances every monster's charge bar and fires their attack
// when the bar fills. Also calls _egBossTick for per-tick boss logic.
function _egTickLoop() {
    if (!_egIsActive()) return;
    if (typeof dead !== 'undefined' && dead) return;
    if (typeof _gamePaused !== 'undefined' && _gamePaused) return;

    _egCheckMistakeLimit(); 
    _egMaybeShowLowHealthWarning();

    _egBossTick();
    if (typeof _egTickAilments === 'function') _egTickAilments();
    if (typeof _egHazardsTick === 'function') _egHazardsTick();
    _egMonsters.forEach(_egTickMonster);

    // Gear: lifeRegen — heals the player once per second
    _egTickLifeRegen();

    // Player mechanics
    _egTickPlayer();
    if (typeof _egRefreshPlayerStatusIcons === 'function') _egRefreshPlayerStatusIcons();
    // Don't resurrect the sprite after defeat — the tick may have set
    // dead = true mid-iteration (DoT / hazard kill).
    if (typeof dead !== 'undefined' && dead) return;
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    _renderPlayerAvatar();
    //_renderPlayerCharge();

    _egUpdateBars();
}

// ── Pause handling for endgame encounters ────────────────────────────────
// While the game is paused (Escape) the tick loop already early-returns,
// freezing charge bars, soft-enrage via _egBossTick, hazards and ailments.
// Date.now()-based expiries (boss spawn time, ailments, lockouts, etc.)
// would otherwise keep advancing wall-clock time while paused, so we shift
// them forward by the paused duration on resume.
let _egPauseStartedAt = 0;
function _egOnPause() {
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    _egPauseStartedAt = Date.now();
    if (typeof _egPauseGridDrops === 'function') {
        try { _egPauseGridDrops(); } catch (e) {}
    }
}
function _egOnResume() {
    if (!_egPauseStartedAt) return;
    const delta = Date.now() - _egPauseStartedAt;
    _egPauseStartedAt = 0;
    if (delta <= 0) {
        if (typeof _egResumeGridDrops === 'function') {
            try { _egResumeGridDrops(); } catch (e) {}
        }
        return;
    }
    _egMonsters.forEach(m => {
        if (m.bossSpawnTime) m.bossSpawnTime += delta;
        if (m.staggeredUntil) m.staggeredUntil += delta;
        if (m.statuses) Object.values(m.statuses).forEach(st => { if (st.until) st.until += delta; });
    });
    if (typeof _egEncounterStartAt !== 'undefined' && _egEncounterStartAt) _egEncounterStartAt += delta;
    if (typeof _egPlayerBlockLockoutUntil !== 'undefined' && _egPlayerBlockLockoutUntil) _egPlayerBlockLockoutUntil += delta;
    if (typeof _egLastLifeRegenAt !== 'undefined' && _egLastLifeRegenAt) _egLastLifeRegenAt += delta;
    if (typeof _egPlayerStatuses !== 'undefined' && _egPlayerStatuses) {
        Object.values(_egPlayerStatuses).forEach(st => { if (st.until) st.until += delta; });
    }
    if (typeof _egPuzzleEffects !== 'undefined' && Array.isArray(_egPuzzleEffects)) {
        _egPuzzleEffects.forEach(e => { if (e.until) e.until += delta; });
    }
    if (typeof _egResumeGridDrops === 'function') {
        try { _egResumeGridDrops(); } catch (e) {}
    }
}


//------------------------------------------------------------------------
//-------------------MONSTER ATTACKS (Monster → Player)-------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Flashes the monster's card to signal it is attacking.
function _egFlashMonsterAttackCard(monster) {
    const card = document.getElementById(`eg-card-${monster.id}`);
    if (!card) return;
    card.classList.remove('eg-flash-attack');
    void card.offsetWidth; // force reflow so the CSS animation restarts
    card.classList.add('eg-flash-attack');
}

// Resolves whether this attack should be melee or ranged.
// 'both' type randomly picks one each time the monster swings.
function _egResolveAttackType(monster) {
    const type = monster.attackType || 'ranged';
    if (type === 'both') return Math.random() < 0.5 ? 'melee' : 'ranged';
    return type;
}

// Fires the monster's attack: flashes the card and dispatches the correct animation.
// Small chance the attack instead flies to the CENTRE OF THE GRID and inflicts
// a puzzle ailment based on the monster's element (see endgame-ailments.js).
function _egFireMonsterAttack(monster) {
    _egFlashMonsterAttackCard(monster);
    if (typeof _egMaybePuzzleAttack === 'function' && _egMaybePuzzleAttack(monster)) return;
    const attackType = _egResolveAttackType(monster);
    if (attackType === 'melee') {
        _egAnimateMonsterMelee(monster);
    } else {
        _egAnimateMonsterProjectile(monster);
    }
}


function _egApplyPlayerMissFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    label.textContent = t('eg_miss');
    hud.appendChild(label);
    setTimeout(() => label.remove(), EG_PLAYER_DAMAGE_NUMBER_DURATION_MS);
}

// Floating "Blocked!" label on the player HUD after a successful block.
function _egApplyPlayerBlockFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    label.textContent = t('eg_blocked');
    hud.appendChild(label);
    setTimeout(() => label.remove(), EG_PLAYER_DAMAGE_NUMBER_DURATION_MS);
}

// Floating "recovering" label for block-recovery feedback (retained for
// external callers — attacks no longer fizzle while recovering).
function _egApplyPlayerBlockLockoutFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    label.textContent = t('eg_block_lockout');
    hud.appendChild(label);
    setTimeout(() => label.remove(), EG_PLAYER_DAMAGE_NUMBER_DURATION_MS);
}

// ── Lose-control overlay (WoW "lose of control" style) ──────────────────
// Status chip with live countdown shown while the player cannot block
// again because of a recent block. Purely visual: pointer-events none.

// Interval handle driving the countdown text update.
let _egBlockLockoutOverlayTimer = null;

// Shows (or refreshs) the lockout chip in the player status bar for `durationMs`.
function _egShowBlockLockoutOverlay(durationMs) {
    const bar = (typeof _egEnsurePlayerStatusBar === 'function')
        ? _egEnsurePlayerStatusBar()
        : document.body;

    let chip = document.getElementById('eg-block-lockout-overlay');
    if (!chip) {
        chip = document.createElement('div');
        chip.id = 'eg-block-lockout-overlay';
        chip.className = 'eg-status-chip eg-status-chip-lockout';
        chip.innerHTML = `
            <div class="eg-lockout-icon">🛡️</div>
            <div class="eg-lockout-countdown" id="eg-lockout-countdown">0.0</div>
            <div class="eg-lockout-label">${t('eg_block_lockout')}</div>`;
        bar.appendChild(chip);
    }

    const countdownEl = document.getElementById('eg-lockout-countdown');
    if (countdownEl) countdownEl.textContent = (durationMs / 1000).toFixed(1);

    // Restart the update loop so an overlapping block extends cleanly.
    if (_egBlockLockoutOverlayTimer) clearInterval(_egBlockLockoutOverlayTimer);
    _egBlockLockoutOverlayTimer = setInterval(() => {
        const remaining = _egPlayerBlockLockoutUntil - Date.now();
        if (remaining <= 0 || !_egIsActive()) {
            _egHideBlockLockoutOverlay();
            return;
        }
        const el = document.getElementById('eg-lockout-countdown');
        if (el) el.textContent = (remaining / 1000).toFixed(1);
    }, 100);
}

// Removes the lockout chip and stops its countdown loop.
function _egHideBlockLockoutOverlay() {
    if (_egBlockLockoutOverlayTimer) {
        clearInterval(_egBlockLockoutOverlayTimer);
        _egBlockLockoutOverlayTimer = null;
    }
    const chip = document.getElementById('eg-block-lockout-overlay');
    if (chip) chip.remove();
}

// Applies hit feedback to the player HUD: floating damage number + squish + red glow.
function _egApplyPlayerHitFeedback(damageValue, isCrit, element) {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;

    // Floating damage label — crits & elemental hits get extra pop
    const dmgLabel = document.createElement('div');
    let cls = 'eg-player-damage';
    if (isCrit) cls += ' eg-dmg-crit';
    if (element) {
        const map = { fire: 'eg-dmg-fire', cold: 'eg-dmg-cold', lightning: 'eg-dmg-lightning', shadow: 'eg-dmg-shadow' };
        if (map[element]) cls += ' ' + map[element];
    }
    dmgLabel.className = cls;
    dmgLabel.textContent = `-${damageValue}`;
    // slight random horizontal jitter so stacked hits don't perfectly overlap
    dmgLabel.style.marginLeft = `${(Math.random() * 18 - 9).toFixed(1)}px`;
    hud.appendChild(dmgLabel);
    setTimeout(() => dmgLabel.remove(), EG_PLAYER_DAMAGE_NUMBER_DURATION_MS);

    // Squish + red-glow flash — crits shake harder
    if (isCrit) {
        hud.style.transform = 'scale(0.92)';
        hud.style.boxShadow = 'inset 0 0 22px rgba(255,40,40,0.95), 0 0 22px rgba(255,0,0,0.95)';
        if (hud.animate) {
            hud.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-6px)' },
                { transform: 'translateX(6px)' },
                { transform: 'translateX(-4px)' },
                { transform: 'translateX(0)' }
            ], { duration: 180, easing: 'ease-out' });
        }
    } else {
        hud.style.transform = 'scale(0.95)';
        hud.style.boxShadow = 'inset 0 0 15px rgba(255,0,0,0.8), 0 0 15px rgba(255,0,0,0.8)';
    }
    setTimeout(() => { hud.style.transform = ''; hud.style.boxShadow = ''; }, isCrit ? 220 : EG_PLAYER_HIT_FLASH_MS);

    Audio_Manager.playSFX('player_damage_taken');
}

// Launches a projectile from the monster's card to the player HUD.
// Damage and feedback are applied when the projectile arrives.
// While the player is POLYMORPHED, the projectile is confused and flies at
// another monster instead (friendly fire). With no other monster alive the
// attack lands on the player as usual.
function _egAnimateMonsterProjectile(monster) {
    const sourceCard = document.getElementById(`eg-card-${monster.id}`);
    const targetHud = document.getElementById('player-avatar-wrapper');
    if (!sourceCard || !targetHud) return;

    // Polymorph: redirect at another monster
    let polymorphVictim = null;
    if (typeof _egIsPolymorphActive === 'function' && _egIsPolymorphActive()
        && typeof _egGetPolymorphVictim === 'function') {
        polymorphVictim = _egGetPolymorphVictim(monster.id);
    }

    const start = _egGetElementCentre(sourceCard);
    const end = polymorphVictim
        ? _egGetElementCentre(document.getElementById(`eg-card-${polymorphVictim.id}`) || targetHud)
        : _egGetElementCentre(targetHud);

    _egFireProjectile(monster.emoji, 'eg-proj-monster', start, end, EG_MONSTER_PROJ_DURATION_MS, 'ease-in', () => {
        if (polymorphVictim) {
            // Confused attack hits the other monster — no player mitigation
            showToast(`🌀 ${monster.name || 'The monster'} hit ${polymorphVictim.name} instead!`);
            _egDamageTargetById(polymorphVictim.id, monster.damageValue);
            return;
        }
        // Gear: preemptive_dodge — auto-dodge each monster's opening attack
        if (_egRollPreemptiveDodge(monster)) return;
        // Map mod: monsters may deal double damage (crit)
        const monsterCritMult = (typeof _egRollMonsterCritMult === 'function' ? _egRollMonsterCritMult(monster) : 1);
        const isMonsterCrit = monsterCritMult > 1;
        const critDmg = monster.damageValue * monsterCritMult;
        const dealt = _egPlayerTakeDamage(critDmg, false, monster.element, monster.level, { attacker: monster, isProjectile: true });
        if (dealt > 0) {
            _egApplyPlayerHitFeedback(dealt, isMonsterCrit, monster.element);
            if (typeof _egApplyMonsterHitMods === 'function') _egApplyMonsterHitMods(monster);
        }
    });
}

// Triggers damage and hit feedback at the melee impact moment.
// Only fires if the encounter is still active and the monster is still alive.
// While POLYMORPHED the confused swing lands on another monster instead.
function _egApplyMeleeImpact(monster) {
    if (!_egIsActive() || !_egMonsters.some(m => m.id === monster.id)) return;

    if (typeof _egIsPolymorphActive === 'function' && _egIsPolymorphActive()
        && typeof _egGetPolymorphVictim === 'function') {
        const victim = _egGetPolymorphVictim(monster.id);
        if (victim) {
            showToast(`🌀 ${monster.name || 'The monster'} struck ${victim.name} instead!`);
            _egDamageTargetById(victim.id, monster.damageValue);
            return;
        }
    }

    // Gear: preemptive_dodge — auto-dodge each monster's opening attack
    if (_egRollPreemptiveDodge(monster)) return;

    // Gear: grounded — chance to brace against the charge and reduce its damage
    let chargeDamage = _egApplyGroundedReduction(monster.damageValue);

    // Map mod: monsters may deal double damage (crit)
    const meleeCritMult = (typeof _egRollMonsterCritMult === 'function' ? _egRollMonsterCritMult(monster) : 1);
    const isMeleeCrit = meleeCritMult > 1;
    chargeDamage *= meleeCritMult;

    const dealt = _egPlayerTakeDamage(chargeDamage, false, monster.element, monster.level, { attacker: monster, isProjectile: false });
    if (dealt > 0) {
        _egApplyPlayerHitFeedback(dealt, isMeleeCrit, monster.element);
        if (typeof _egApplyMonsterHitMods === 'function') _egApplyMonsterHitMods(monster);
    }
}

// Gear: preemptive_dodge (boots suffix) — the first attack each monster
// directs at the player this encounter has a chance to be automatically
// dodged. Resets per-monster, not per-map.
function _egRollPreemptiveDodge(monster) {
    if (!monster) return false;
    const isFirstAttack = !monster.hasStruckPlayer;
    monster.hasStruckPlayer = true;
    if (!isFirstAttack) return false;

    const stats = _egComputePlayerStats();
    const pct = stats.preemptiveDodgePct || 0;
    if (pct <= 0 || Math.random() * 100 >= pct) return false;

    showToast(t('eg_dodged'));
    _egApplyPlayerMissFeedback();
    return true;
}

// Physically lunges the monster card toward the player HUD and snaps back.
// Damage triggers at the animation midpoint (impact apex).
// While POLYMORPHED the lunge visually chases the confused-attack victim.
function _egAnimateMonsterMelee(monster) {
    const sourceCard = document.getElementById(`eg-card-${monster.id}`);
    const targetHud = document.getElementById('player-avatar-wrapper');
    if (!sourceCard || !targetHud) return;

    // Polymorph: lunge toward the victim monster instead of the player
    let polymorphVictim = null;
    if (typeof _egIsPolymorphActive === 'function' && _egIsPolymorphActive()
        && typeof _egGetPolymorphVictim === 'function') {
        polymorphVictim = _egGetPolymorphVictim(monster.id);
    }
    const meleeTargetEl = polymorphVictim
        ? (document.getElementById(`eg-card-${polymorphVictim.id}`) || targetHud)
        : targetHud;

    const start = _egGetElementCentre(sourceCard);
    const end = _egGetElementCentre(meleeTargetEl);
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Ensure the lunging card renders on top of everything else during flight
    sourceCard.style.zIndex = '999';

    const anim = sourceCard.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(1.15)` }, // apex/impact
        { transform: 'translate(0px, 0px) scale(1)' }
    ], { duration: EG_MELEE_ANIM_DURATION_MS, easing: 'ease-in-out' });

    anim.onfinish = () => { sourceCard.style.zIndex = ''; };

    // Damage fires at the animation midpoint so it matches the visual impact
    setTimeout(() => _egApplyMeleeImpact(monster), EG_MELEE_ANIM_DURATION_MS / 2);
}


//------------------------------------------------------------------------
//-------------------PLAYER ATTACKS (Player → Monster)--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Pushes a correctly filled cell into the recent-fills circular buffer.
// Used by the Prior Bomb mechanic to undo recent player progress.
function _egTrackRecentFill(row, col) {
    _egRecentFills.push([row, col]);
    if (_egRecentFills.length > EG_RECENT_FILLS_CAPACITY) _egRecentFills.shift();
}

// Entry point called from mouse-button-handlers.js on every correct cell fill.
// Charged shot system: instead of firing one projectile per painted cell, each
// correct fill rolls its damage and stacks it into a single charging
// projectile anchored on the stroke's first cell. The shot is released with
// the combined damage when the player stops painting (_egReleaseChargedShot).
function _egOnCorrectCell(row, col) {
    // Block recovery no longer fumbles attacks — reveals always fire even
    // while recovering (recovery only suppresses the next block).
    if (!_egIsActive()) return;

    if (row !== undefined && col !== undefined) _egTrackRecentFill(row, col);

    // Boss puzzle mechanics hook (Fated Cell, Soul Tithe): lets active boss
    // mechanics observe correct fills. No-op unless a mechanic is listening.
    if (row !== undefined && col !== undefined && typeof _egNotifyCorrectFill === 'function') {
        try { _egNotifyCorrectFill(row, col); } catch (e) {}
    }

    // Projectile map mod: "% reduced Projectile Damage" scales correct-fill shots.
    const projMult = (typeof _egMapPlayerProjectileMult === 'function') ? _egMapPlayerProjectileMult() : 1;
    const damage = Math.max(1, Math.round(_egCalcPlayerDamage() * projMult));
    EG_ELEMENTS.forEach(el => {
        _egDragChargeElements[el] += _egLastHitElements ? (_egLastHitElements[el] || 0) : 0;
    });
    if (typeof _egLastHitWasCrit !== 'undefined' && _egLastHitWasCrit) _egDragChargeWasCrit = true;

    // Anchor the charging projectile on the stroke's first painted cell
    if (_egDragChargeStacks === 0 && row !== undefined && col !== undefined) {
        _egDragChargeRow = row;
        _egDragChargeCol = col;
    }
    _egDragChargeDamage += damage;
    _egDragChargeStacks++;
    _egUpdateChargedProjectileVisual();

    // Gear: arcane surge streak + channel stacks grow per correct cell
    _egTickCorrectCellGearProcs();
}


//------------------------------------------------------------------------
//-------------------ARCANE GEAR PROCS (correct cells)--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Correct-fill driven gear modifiers:
//   arcane_surge — after # consecutive correct cells without a mistake the
//                  sigil grants a burst of mana; the streak resets on any
//                  real mistake (_egOnMistake).
//   channel      — each consecutive correct cell adds a stack worth flat
//                  bonus damage; released on the next player hit or
//                  automatically when the max-stack cap is reached.

// Delay before an echo's second instance lands (see _egTryEchoHit).
const EG_ECHO_DELAY_MS = 450;

// Called from breakFillStreaksOnMistake() (mouse-button-handlers.js) on any
// real (unabsorbed) mistake — breaks both correct-cell streak mechanics.
function _egOnMistake() {
    _egArcaneSurgeStreak = 0;
    _egChannelStacks = 0;

    // Active map run: mistakes burn a share of maximum Life.
    if (typeof _egIsActive === 'function' && _egIsActive()
        && typeof _egGetActiveMapModValue === 'function') {
        const pct = _egGetActiveMapModValue('map_mistake_damage');
        if (pct > 0) {
            const maxHP = (typeof playerMaxHP !== 'undefined' && playerMaxHP > 0) ? playerMaxHP : 100;
            const dealt = _egPlayerTakeDamage(Math.max(1, Math.round(maxHP * pct / 100)), true);
            if (dealt > 0) showToast(`✖️ ${t('eg_mm_toast_mistake_pain') || 'Painful mistake!'} (-${dealt})`);
        }
    }
}

// Advances the per-correct-cell gear streaks. Called from _egOnCorrectCell.
function _egTickCorrectCellGearProcs() {
    const stats = _egComputePlayerStats();

    // Arcane Surge: mana burst at the required streak length
    if (stats.arcaneSurgeStreak > 0 && stats.arcaneSurgeMana > 0) {
        _egArcaneSurgeStreak++;
        if (_egArcaneSurgeStreak >= stats.arcaneSurgeStreak) {
            _egArcaneSurgeStreak = 0;
            const gained = gainMana(stats.arcaneSurgeMana);
            if (gained > 0) showToast(t('eg_arcane_surge').replace('{n}', Math.round(gained)));
        }
    }

    // Channel: gain a stack, auto-releasing once the cap is reached
    if (stats.channelDamagePerStack > 0 && stats.channelMaxStacks > 0) {
        _egChannelStacks++;
        if (_egChannelStacks >= stats.channelMaxStacks) _egReleaseChannelAtMax();
    }
}

// Auto-release: dumps all accumulated channel stacks onto the current target.
function _egReleaseChannelAtMax() {
    const stats = _egComputePlayerStats();
    const dmg = Math.round(_egChannelStacks * stats.channelDamagePerStack);
    _egChannelStacks = 0;
    const target = typeof _egGetTarget === 'function' ? _egGetTarget() : null;
    if (target && dmg > 0) {
        _egShowStatusLabel(target.id, t('eg_channel'));
        _egDamageTargetById(target.id, dmg);
    }
}

// Consumes the on-hit gear bonuses (channel stacks + mana-to-damage) and
// returns their combined flat damage. Called once per player hit — from
// _egResolveProjectileImpact (projectile channel) and
// _egApplyPlayerMeleeImpact (melee channel).
function _egConsumeOnHitGearBonus() {
    const stats = _egComputePlayerStats();
    let bonus = 0;

    // Channel: spend accumulated stacks
    if (_egChannelStacks > 0 && stats.channelDamagePerStack > 0) {
        bonus += _egChannelStacks * stats.channelDamagePerStack;
        _egChannelStacks = 0;
    }

    // Mana to Damage: convert a % of CURRENT mana into flat bonus damage,
    // consuming that mana.
    const pct = Math.min(100, stats.manaToDamagePct || 0);
    if (pct > 0 && playerCurrentMana > 0 && typeof spendMana === 'function') {
        const converted = Math.floor(playerCurrentMana * pct / 100);
        if (converted > 0 && spendMana(converted)) bonus += converted;
    }

    return Math.round(bonus);
}


//------------------------------------------------------------------------
//-------------------DEFENSIVE GEAR PROCS---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Gear: fate (talisman suffix) — pure-luck chance to negate ANY incoming hit
// entirely, including spells and charge attacks. Returns true when negated.
function _egRollFateNegation(stats) {
    const pct = stats.fatePct || 0;
    if (pct <= 0 || Math.random() * 100 >= pct) return false;
    showToast(t('eg_fate'));
    _egApplyPlayerMissFeedback();
    _egScheduleAbsorptionRegen();
    return true;
}

// Gear: grounded (boots prefix) — on a monster CHARGE hit, rolls against
// groundedChancePct and reduces the hit by groundedReductionPct on proc.
// Ranged (projectile) attacks are not charges and pass through untouched.
function _egApplyGroundedReduction(rawDamage) {
    const stats = _egComputePlayerStats();
    const chance = stats.groundedChancePct || 0;
    const reduction = Math.min(100, stats.groundedReductionPct || 0);
    if (chance <= 0 || reduction <= 0) return rawDamage;
    if (Math.random() * 100 >= chance) return rawDamage;
    showToast(t('eg_grounded'));
    return rawDamage * (1 - reduction / 100);
}

// ── Hold-E Parry & Deflect ─────────────────────────────────────────────
// While holding E the player pauses their own charge bar and can parry
// incoming monster projectile and charge (melee) attacks. Hazards and boss
// spells (isSpell=true) are never parryable. Baseline 50% + gear parry.
// On a successful projectile parry there is a 5% + gear deflect chance to
// redirect the shot to another monster for 30% + gear deflect damage.
function _egApplyPlayerParryFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    const txt = (typeof t === 'function') ? t('eg_parried') : 'Parried!';
    label.textContent = (txt && txt !== 'eg_parried') ? txt : 'Parried!';
    hud.appendChild(label);
    setTimeout(() => label.remove(), 1050);
}
function _egApplyPlayerDeflectFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    const txt = (typeof t === 'function') ? t('eg_deflected') : 'Deflected!';
    label.textContent = (txt && txt !== 'eg_deflected') ? txt : 'Deflected!';
    hud.appendChild(label);
    setTimeout(() => label.remove(), 1050);
}
function _egGetParryChancePct() {
    const base = (typeof EG_PARRY_BASE_PCT !== 'undefined' ? EG_PARRY_BASE_PCT : 50);
    const gear = (_egComputePlayerStats().parryChancePct || 0);
    return base + gear;
}
// Dual-wield parry (PoE-style): two 1H weapons grant a base chance to parry
// WITHOUT holding E (gear parry adds on top). Successful projectile parries
// roll deflect exactly like held parries.
function _egGetDualWieldParryChancePct() {
    const base = (typeof EG_DUAL_WIELD_PARRY_PCT !== 'undefined' ? EG_DUAL_WIELD_PARRY_PCT : 15);
    let gear = 0;
    try { gear = (_egComputePlayerStats().parryChancePct || 0); } catch (e) {}
    return base + gear;
}
function _egIsDualWieldParryActive() {
    try {
        if (typeof _egIsDualWielding === 'function') return _egIsDualWielding();
    } catch (e) {}
    return false;
}
function _egGetDeflectChancePct() {
    const base = (typeof EG_DEFLECT_BASE_PCT !== 'undefined' ? EG_DEFLECT_BASE_PCT : 5);
    const gear = (_egComputePlayerStats().deflectChancePct || 0);
    return base + gear;
}
function _egGetDeflectDamagePct() {
    const base = (typeof EG_DEFLECT_BASE_DMG_PCT !== 'undefined' ? EG_DEFLECT_BASE_DMG_PCT : 30);
    const gear = (_egComputePlayerStats().deflectDamagePct || 0);
    return base + gear;
}
function _egRollParry(attacker, isProjectile) {
    // Hold-E parry, or dual-wield auto-parry (two 1H weapons, no key needed)
    const holding = (typeof _egHoldEPauseActive !== 'undefined' && _egHoldEPauseActive);
    const dualWield = (typeof _egIsDualWieldParryActive === 'function' && _egIsDualWieldParryActive());
    if (!holding && !dualWield) return false;
    if (typeof _egIsActive === 'function' && !_egIsActive()) return false;
    // Hazards and boss spells are not parryable — they flow through isSpell=true,
    // but we also guard here for callers that bypass takeDamage.
    const chance = holding
        ? _egGetParryChancePct()
        : (typeof _egGetDualWieldParryChancePct === 'function' ? _egGetDualWieldParryChancePct() : 15);
    if (chance <= 0) return false;
    if (Math.random() * 100 >= chance) return false;
    showToast((typeof t === 'function' ? t('eg_parried') : 'Parried!'));
    _egApplyPlayerParryFeedback();
    _egScheduleAbsorptionRegen();
    return true;
}
function _egTryDeflectProjectile(attacker, isProjectile) {
    if (!isProjectile) return false;
    if (!attacker) return false;
    const others = _egMonsters.filter(m => m.id !== attacker.id && m.currentHP > 0);
    if (others.length === 0) return false;
    const chance = _egGetDeflectChancePct();
    if (chance <= 0 || Math.random() * 100 >= chance) return false;
    const dmgPct = _egGetDeflectDamagePct();
    const deflectDamage = Math.max(1, Math.round((attacker.damageValue || 0) * dmgPct / 100));
    const victim = others[Math.floor(Math.random() * others.length)];
    // Visual: fire a quick projectile from player/avatar to the victim
    const playerEl = document.getElementById('player-avatar-wrapper') || document.getElementById('player-avatar-simple');
    const targetCard = document.getElementById(`eg-card-${victim.id}`);
    if (playerEl && targetCard && typeof _egFireProjectile === 'function') {
        const start = _egGetElementCentre(playerEl);
        const end = _egGetElementCentre(targetCard);
        const projDef = (typeof _egGetProjectileDef === 'function') ? _egGetProjectileDef() : { emoji: '↩️', cssClass: 'eg-proj-player', duration: 300, easing: 'linear' };
        _egFireProjectile(projDef, projDef.cssClass, start, end, 320, 'linear', () => {
            const toastKey = (typeof t === 'function' ? t('eg_deflected') : 'Deflected!');
            showToast(toastKey !== 'eg_deflected' ? toastKey : `↩️ Deflected to ${victim.name || 'another monster'}!`);
            _egDamageTargetById(victim.id, deflectDamage);
        });
    } else {
        _egDamageTargetById(victim.id, deflectDamage);
        showToast((typeof t === 'function' ? t('eg_deflected') : 'Deflected!'));
    }
    _egApplyPlayerDeflectFeedback();
    return true;
}


// Launches a projectile from the clicked cell toward the targeted monster card.
// If the target card is not visible (e.g. not yet rendered), damage is applied
// instantly so no hits are silently lost.
// `elements` optionally carries the per-element damage share of `amount` so
// monster resistances can be applied at impact.
// `opts.isCharged` marks a drag-paint charged shot so overkill can ricochet.
function _egAnimatePlayerProjectile(damage, targetId, row, col, sourceElOverride, startScale, elements, opts) {
    // Explicit source element first (reveal-triggered shots), then the cell
    // element, falling back to the HUD if missing
    let sourceEl = sourceElOverride
        || ((row !== undefined && col !== undefined)
            ? document.getElementById(`g-${row}-${col}`)
            : null);

    if (!sourceEl) {
        sourceEl = document.getElementById('class-hud-drag-handle');
    }

    const targetCard = targetId ? document.getElementById(`eg-card-${targetId}`) : null;

    if (!sourceEl || !targetCard) {
        // No visual target — apply damage instantly without animation
        if (damage != null) _egResolveProjectileImpact(damage, targetId, elements, opts);
        return;
    }

    const start = _egGetElementCentre(sourceEl);
    const end = _egGetElementCentre(targetCard);
    const projDef = _egGetProjectileDef();

    // Pass the whole def: code-built visuals orient themselves onto the
    // flight vector inside _egFireProjectile (they're drawn tip-forward),
    // so every shot always points at the targeted creature.
    _egFireProjectile(projDef, projDef.cssClass, start, end, projDef.duration, projDef.easing, () => {
        _egResolveProjectileImpact(damage, targetId, elements, opts);
    }, null, startScale);
}


//------------------------------------------------------------------------
//-------------------PROJECTILE IMPACT GEAR PROCS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Ranged-channel gear modifiers that resolve when a projectile lands:
//   snipe   — bonus damage vs monsters alone in their spawn location
//   splash  — chance to hit every other monster in the target's zone
//   chain   — chance to bounce to one monster in a DIFFERENT spawn location
//   pierce  — chance to punch through and hit one additional monster anywhere
function _egResolveProjectileImpact(damage, targetId, elements, opts) {
    const target = _egMonsters.find(m => m.id === targetId);

    // Accuracy: projectiles can miss (no snipe/splash/chain/pierce on a miss)
    // Drag-painting bonus: longer drags reduce miss chance (threshold-based)
    if (_egRollPlayerMiss(targetId, opts)) return;

    // Gear: channel stacks + mana-to-damage are consumed by this hit
    let finalDamage = damage + _egConsumeOnHitGearBonus();

    // Snipe: isolated target (no zone-mates) takes amplified projectile damage
    if (target) {
        const snipePct = _egComputePlayerStats().snipePct || 0;
        const isIsolated = !_egMonsters.some(m => m.id !== targetId && m.zoneId === target.zoneId);
        if (snipePct > 0 && isIsolated) {
            finalDamage = Math.round(finalDamage * (1 + snipePct / 100));
            _egShowStatusLabel(targetId, t('eg_snipe'));
        }
    }

    const damageOpts = Object.assign({}, opts);
    // Preserve charged flag and proportional element share for overkill calc
    if (elements && damage !== finalDamage && damage > 0) {
        // Scale elements to match the post-bonus finalDamage for resistance
        // handling inside _egDamageTargetById (it rescales internally, so
        // we keep the same shape but note the ratio for ricochet later).
        damageOpts._chargedElementsFactor = finalDamage / damage;
    }
    _egDamageTargetById(targetId, finalDamage, elements, damageOpts);

    if (!target) return;

    // Splash: hits all OTHER monsters sharing the target's spawn location
    const splashPct = _egComputePlayerStats().splashPct || 0;
    if (splashPct > 0 && Math.random() * 100 < splashPct) {
        _egMonsters.filter(m => m.id !== targetId && m.zoneId === target.zoneId).forEach(m => {
            const card = document.getElementById(`eg-card-${m.id}`);
            if (card) _egRestartFlashClass(card, 'eg-flash-damage');
            _egDamageTargetById(m.id, finalDamage, elements, { isCrit: !!(opts && opts.isCrit) });
        });
    }

    // Chain: bounces to one additional monster in a different spawn location
    const chainPct = _egComputePlayerStats().chainPct || 0;
    if (chainPct > 0 && Math.random() * 100 < chainPct) {
        const others = _egMonsters.filter(m => m.id !== targetId && m.zoneId !== target.zoneId);
        if (others.length) {
            const victim = others[Math.floor(Math.random() * others.length)];
            _egDamageTargetById(victim.id, finalDamage, elements, { isCrit: !!(opts && opts.isCrit) });
        }
    }

    // Pierce: punches through to one additional monster anywhere on the field
    // (does not chain further — only one extra target per shot)
    const piercePct = _egComputePlayerStats().piercePct || 0;
    if (piercePct > 0 && Math.random() * 100 < piercePct) {
        const others = _egMonsters.filter(m => m.id !== targetId);
        if (others.length) {
            const victim = others[Math.floor(Math.random() * others.length)];
            _egDamageTargetById(victim.id, finalDamage, elements, { isCrit: !!(opts && opts.isCrit) });
        }
    }
}


//------------------------------------------------------------------------
//-------------------DRAG-PAINT CHARGED SHOT------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Visual growth of the charging projectile per stacked cell.
const EG_DRAG_CHARGE_BASE_SIZE_PX = 28;      // matches .eg-projectile font-size
const EG_DRAG_CHARGE_SIZE_PER_STACK_PX = 7;
const EG_DRAG_CHARGE_MAX_VISUAL_STACKS = 12; // size cap for the charging visual
const EG_DRAG_CHARGE_SCALE_PER_STACK = 0.18; // extra launch scale on release

// Creates or refreshes the charging projectile div anchored over the stroke's
// first painted cell. Grows with every stacked cell and pulses while charging.
function _egUpdateChargedProjectileVisual() {
    if (!_egIsActive() || _egDragChargeStacks <= 0) return;

    let proj = document.getElementById('eg-charging-projectile');
    if (!proj) {
        proj = document.createElement('div');
        proj.id = 'eg-charging-projectile';
        document.body.appendChild(proj);
    }

    const projDef = _egGetProjectileDef();
    proj.className = `eg-projectile eg-proj-charging ${projDef.cssClass}`;
    if (typeof projDef.build === 'function') {
        proj.classList.add('eg-built');
        projDef.build(proj);
    } else {
        proj.textContent = projDef.emoji;
    }

    const stacksForVisual = Math.min(_egDragChargeStacks, EG_DRAG_CHARGE_MAX_VISUAL_STACKS);
    const sizePx = EG_DRAG_CHARGE_BASE_SIZE_PX + stacksForVisual * EG_DRAG_CHARGE_SIZE_PER_STACK_PX;
    // Emoji visuals grow via font-size; code-built shapes via a scale var
    // (the .egp box has fixed pixel dimensions).
    proj.style.fontSize = `${sizePx}px`;
    proj.style.setProperty('--egp-charge-scale', (sizePx / EG_DRAG_CHARGE_BASE_SIZE_PX).toFixed(3));

    // Anchor on the stroke's start cell; fall back to the HUD handle
    const anchor = ((_egDragChargeRow >= 0 && _egDragChargeCol >= 0)
        && document.getElementById(`g-${_egDragChargeRow}-${_egDragChargeCol}`))
        || document.getElementById('class-hud-drag-handle');
    if (anchor) {
        const c = _egGetElementCentre(anchor);
        proj.style.left = `${c.x}px`;
        proj.style.top = `${c.y}px`;
    }

    _egAimChargingProjectile(anchor);
    _egUpdateDragBonusLabel();
}

// ── Drag-painting accuracy bonus label (1-word text on the player sprite) ─
// Shows STEADY / FOCUSED / PRECISE on the avatar while charging, tiered at
// >5 / >10 / >15 correct. Single word, color-coded per tier, with a pop
// animation when the tier increases.
function _egUpdateDragBonusLabel() {
    const avatar = document.getElementById('player-avatar-wrapper');
    if (!avatar) { _egClearDragBonusLabel(); return; }

    const tier = (typeof _egGetDragTier === 'function') ? _egGetDragTier(_egDragChargeStacks) : 0;
    if (tier <= 0) { _egClearDragBonusLabel(); return; }

    const key = (typeof _egGetDragTierLabelKey === 'function') ? _egGetDragTierLabelKey(_egDragChargeStacks) : null;
    const text = key && typeof t === 'function' ? t(key) : (tier === 3 ? 'PRECISE' : tier === 2 ? 'FOCUSED' : 'STEADY');

    let lbl = document.getElementById('eg-drag-bonus-label');
    const isNew = !lbl;
    if (!lbl) {
        lbl = document.createElement('div');
        lbl.id = 'eg-drag-bonus-label';
        avatar.appendChild(lbl);
    }
    const tierClass = `eg-drag-bonus-t${tier}`;
    if (lbl.dataset.tier !== String(tier) || isNew) {
        lbl.className = `eg-drag-bonus ${tierClass}`;
        // trigger pop animation on tier change
        lbl.style.animation = 'none';
        void lbl.offsetWidth;
        lbl.style.animation = '';
        lbl.dataset.tier = String(tier);
    } else {
        lbl.className = `eg-drag-bonus ${tierClass}`;
    }
    lbl.textContent = text;
    lbl.style.display = '';
}

function _egClearDragBonusLabel() {
    const lbl = document.getElementById('eg-drag-bonus-label');
    if (lbl) lbl.remove();
    const linger = document.getElementById('eg-drag-bonus-linger');
    if (linger) linger.remove();
}

// Rotates the charging projectile so its tip points at the currently targeted
// monster card (same atan2 flight vector the released shot will follow).
// No-op when there is no live charge visual or no anchor.
function _egAimChargingProjectile(anchor) {
    const proj = document.getElementById('eg-charging-projectile');
    if (!proj || !anchor) return;

    let rot = '';
    const targetCard = _egTargetId ? document.getElementById(`eg-card-${_egTargetId}`) : null;
    if (targetCard) {
        const c = _egGetElementCentre(anchor);
        const t = _egGetElementCentre(targetCard);
        const angle = Math.atan2(t.y - c.y, t.x - c.x) * 180 / Math.PI;
        rot = ` rotate(${angle.toFixed(2)}deg)`;
    }
    proj.style.transform =
        `translate(-50%, -50%)${rot} scale(var(--egp-charge-scale, 1))`;
}

// Removes the charging projectile div and resets all stroke charge state.
function _egClearChargedProjectileVisual() {
    const proj = document.getElementById('eg-charging-projectile');
    if (proj) proj.remove();
    if (typeof _egClearDragBonusLabel === 'function') _egClearDragBonusLabel();
    _egDragChargeDamage = 0;
    EG_ELEMENTS.forEach(el => { _egDragChargeElements[el] = 0; });
    _egDragChargeStacks = 0;
    _egDragChargeRow = -1;
    _egDragChargeCol = -1;
    _egDragChargeWasCrit = false;
}

// Called from stopPainting(): releases the accumulated stroke as one combined-
// damage projectile toward the currently targeted monster. The target ID is
// snapshotted at release so mid-flight retargets don't redirect the shot.
// The projectile launches from the stroke's first cell with a launch scale
// that grows with the number of stacked cells.
function _egReleaseChargedShot() {
    const stacks = _egDragChargeStacks;
    const damage = _egDragChargeDamage;
    const row = _egDragChargeRow;
    const col = _egDragChargeCol;
    // Snapshot the elemental share before clearing — needed so the target's
    // resistances can be applied per element at impact time.
    const elements = Object.assign({}, _egDragChargeElements);
    const wasCrit = !!_egDragChargeWasCrit;
    const releaseTier = (typeof _egGetDragTier === 'function') ? _egGetDragTier(stacks) : 0;
    const releaseLabelKey = (typeof _egGetDragTierLabelKey === 'function') ? _egGetDragTierLabelKey(stacks) : null;
    _egClearChargedProjectileVisual();
    // Keep a brief lingering tier label on the avatar through the flight so
    // the player sees that the drag bonus was applied to this shot.
    if (releaseTier > 0) {
        const avatar = document.getElementById('player-avatar-wrapper');
        if (avatar) {
            const linger = document.createElement('div');
            linger.id = 'eg-drag-bonus-linger';
            linger.className = `eg-drag-bonus eg-drag-bonus-t${releaseTier} eg-drag-bonus-linger`;
            linger.textContent = releaseLabelKey && typeof t === 'function' ? t(releaseLabelKey) : (releaseTier === 3 ? 'PRECISE' : releaseTier === 2 ? 'FOCUSED' : 'STEADY');
            avatar.appendChild(linger);
            setTimeout(() => linger.remove(), 900);
        }
    }

    if (!_egIsActive()) return;
    if (stacks <= 0 || !damage) return;

    const sourceEl = (row >= 0 && col >= 0)
        ? document.getElementById(`g-${row}-${col}`)
        : null;
    const targetIdAtFire = _egTargetId; // snapshot — do not use _egTargetId in the callback
    const startScale = 1.5 + Math.min(stacks, EG_DRAG_CHARGE_MAX_VISUAL_STACKS) * EG_DRAG_CHARGE_SCALE_PER_STACK;

    // POLYMORPH: the charged reveal shot is confused and hits the PLAYER
    // themself instead of the monster. Auto-attacks keep working normally.
    if (typeof _egIsPolymorphActive === 'function' && _egIsPolymorphActive()) {
        const hud = document.getElementById('player-avatar-wrapper');
        const start = sourceEl ? _egGetElementCentre(sourceEl) : null;
        if (hud && typeof _egFireProjectile === 'function' && start) {
            const end = _egGetElementCentre(hud);
            _egFireProjectile('🌀', 'eg-proj-player', start, end, EG_MONSTER_PROJ_DURATION_MS, 'ease-in', () => {
                const dealt = _egPlayerTakeDamage(damage * 0.3, false, null);
                if (dealt > 0) _egApplyPlayerHitFeedback(dealt);
            });
            return;
        }
        // No visual path available — apply the self-hit instantly
        const dealt = _egPlayerTakeDamage(damage * 0.3, false, null);
        if (dealt > 0) _egApplyPlayerHitFeedback(dealt);
        return;
    }

    _egAnimatePlayerProjectile(damage, targetIdAtFire, undefined, undefined, sourceEl, startScale, elements, { isCharged: true, isChargedStacks: stacks, isCrit: wasCrit });
    _egTryMultishot(damage, targetIdAtFire, elements, sourceEl, wasCrit);
}

// Gear: multishot (cloak/gloves) — rolls against multishotPct and, on
// success, looses one extra projectile with the same damage at another
// living monster (falls back to the primary target when it's the only one).
function _egTryMultishot(damage, primaryTargetId, elements, sourceEl, wasCrit) {
    const stats = _egComputePlayerStats();
    const multishotPct = stats.multishotPct || 0;
    if (multishotPct <= 0 || Math.random() * 100 >= multishotPct) return;

    const others = _egMonsters.filter(m => m.id !== primaryTargetId);
    const targetId = others.length
        ? others[Math.floor(Math.random() * others.length)].id
        : primaryTargetId;
    if (!targetId) return;

    _egAnimatePlayerProjectile(Math.round(damage), targetId, undefined, undefined, sourceEl, 1.2, elements, { isCrit: !!wasCrit });
}


/*

// Launches a projectile from the player HUD toward the targeted monster card.
// If the target card is not visible (e.g. not yet rendered), damage is applied
// instantly so no hits are silently lost.
function _egAnimatePlayerProjectile(damage, targetId, row, col) {



    const sourceHud = document.getElementById('class-hud-drag-handle');
    const targetCard = targetId ? document.getElementById(`eg-card-${targetId}`) : null;

    if (!sourceHud || !targetCard) {
        // No visual target — apply damage instantly without animation
        if (damage != null) _egDamageTargetById(targetId, damage);
        return;
    }

    const start = _egGetElementCentre(sourceHud);
    const end = _egGetElementCentre(targetCard);
    const projDef = _egGetProjectileDef();

    _egFireProjectile(projDef.emoji, projDef.cssClass, start, end, projDef.duration, projDef.easing, () => {
        _egDamageTargetById(targetId, damage);
    });
}

*/


// player charges the monster


// Current melee auto-attack damage: rolls the dedicated melee channel
// (weapon base range + melee-scoped mods — see _egCalcPlayerMeleeDamage).
// The active map's "% reduced Melee Attack Damage" mod is applied inside.
function _egCurrentMeleeDamage() {
    return (typeof _egCalcPlayerMeleeDamage === 'function')
        ? _egCalcPlayerMeleeDamage()
        : EG_PLAYER_MELEE_DAMAGE;
}

// Accuracy check for player attacks (melee strikes AND projectiles alike).
// Rolls against the target's level using _egCalcAccuracyMissChance; on a
// miss shows a floating MISS label over the monster card and returns true
// so the caller can abort the hit. Gear procs (cleave/splash/chain/…) are
// part of the same attack and are skipped alongside it.
// `opts` may carry isChargedStacks for drag-painting charged shots so the
// threshold-based accuracy bonus can be applied (flat accuracy + direct
// miss reduction — see _egGetDragAccuracyBonus / _egGetDragMissReduction).
function _egRollPlayerMiss(targetId, opts) {
    const target = _egMonsters.find(m => m.id === targetId);
    if (!target) return false;

    // Darkness clouds completely blind the player: every attack misses while
    // the sprite hitbox overlaps a cloud, regardless of accuracy or bonuses.
    if (typeof _egIsPlayerInDarknessCloud === 'function' && _egIsPlayerInDarknessCloud()) {
        _egShowStatusLabel(targetId, t('eg_miss'));
        return true;
    }

    const stats = _egComputePlayerStats();
    const stacks = (opts && opts.isChargedStacks) ? opts.isChargedStacks : 0;
    // Also support a plain number being passed as second arg (legacy callers)
    const dragStacks = (typeof opts === 'number') ? opts : stacks;
    const missPct = _egCalcAccuracyMissChance(stats.accuracy, target.level, dragStacks);
    if (Math.random() * 100 >= missPct) return false;

    _egShowStatusLabel(targetId, t('eg_miss'));
    return true;
}

// Applies a full melee strike at the moment of impact. The damage (and its
// elemental breakdown) is rolled ONCE per swing so cleaved side targets
// take the same hit as the primary target.
function _egApplyPlayerMeleeImpact(targetId) {
    if (!_egIsActive() || !_egMonsters.some(m => m.id === targetId)) return;

    // Accuracy: the swing can whiff entirely (no gear procs on a miss)
    if (_egRollPlayerMiss(targetId)) return;

    // Map mod: ethereal monsters evade melee strikes.
    const meleeTarget = _egMonsters.find(m => m.id === targetId);
    if (meleeTarget && (meleeTarget.etherealPct || 0) > 0
        && Math.random() * 100 < meleeTarget.etherealPct) {
        _egShowStatusLabel(targetId, t('eg_dodged'));
        return;
    }

    // Gear: channel stacks + mana-to-damage are consumed by this hit
    const dmg = _egCurrentMeleeDamage() + _egConsumeOnHitGearBonus();
    const elements = _egLastMeleeElements;
    const wasCrit = (typeof _egLastMeleeWasCrit !== 'undefined') ? _egLastMeleeWasCrit : false;

    // Uses the existing damage application logic[cite: 1]
    _egDamageTargetById(targetId, dmg, elements, { isCrit: wasCrit });

    // Active map run: monsters reflect #% of melee damage back at you.
    if (typeof _egGetActiveMapModValue === 'function') {
        const reflectPct = _egGetActiveMapModValue('map_reflect_melee');
        const reflectTarget = _egMonsters.find(m => m.id === targetId);
        if (reflectPct > 0 && reflectTarget) {
            const reflected = Math.max(1, Math.round(dmg * reflectPct / 100));
            showToast(`🪞 ${t('eg_mm_toast_reflect') || 'Reflected!'} (-${reflected})`);
            _egPlayerTakeDamage(reflected, false, null);
        }
    }

    _egTryCleaveHit(targetId, dmg, elements);
}

// Cleave gear modifier (main weapon suffix): rolls against cleavePct and,
// on success, hits every OTHER monster sharing the target's spawn location
// for the same melee damage, with a dedicated flash animation and sound.
function _egTryCleaveHit(targetId, dmg = _egCurrentMeleeDamage(), elements = _egLastMeleeElements) {
    const stats = _egComputePlayerStats();
    const cleavePct = stats.cleavePct || 0;
    if (cleavePct <= 0 || Math.random() * 100 >= cleavePct) return;

    const target = _egMonsters.find(m => m.id === targetId);
    if (!target) return;

    // "Same spawn location" = monsters rendered into the same zone panel
    const sideTargets = _egMonsters.filter(m => m.id !== targetId && m.zoneId === target.zoneId);
    if (!sideTargets.length) return;

    if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('cleave');

    sideTargets.forEach(m => {
        const card = document.getElementById(`eg-card-${m.id}`);
        if (card) _egRestartFlashClass(card, 'eg-flash-cleave');
        const wasCrit = (typeof _egLastMeleeWasCrit !== 'undefined') ? _egLastMeleeWasCrit : false;
        _egDamageTargetById(m.id, dmg, elements, { isCrit: wasCrit });
    });
}

// Physically lunges the class HUD toward the targeted monster and snaps back.

// Lunges the permanent player unit at the targeted monster
function _egAnimatePlayerMelee(targetId) {
    const targetCard = document.getElementById(`eg-card-${targetId}`);
    const avatarWrapper = document.getElementById('player-avatar-wrapper');
    const sprite = document.getElementById('avatar-sprite-img');

    if (!avatarWrapper || !targetCard) {
        _egDamageTargetById(targetId, _egCurrentMeleeDamage(), _egLastMeleeElements);
        return;
    }

    const start = _egGetElementCentre(avatarWrapper);
    const end = _egGetElementCentre(targetCard);

    // If the monster is to the left (end.x < start.x), flip the sprite
    const shouldFlip = end.x < start.x;
    sprite.style.transform = shouldFlip ? 'scaleX(-1)' : 'scaleX(1)';

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Bring to front during the lunge
    const originalZIndex = avatarWrapper.style.zIndex;
    avatarWrapper.style.zIndex = '9999';

    const anim = avatarWrapper.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(1.15)` },
        { transform: 'translate(0px, 0px) scale(1)' }
    ], { duration: EG_PLAYER_MELEE_ANIM_DURATION_MS, easing: 'ease-in-out' });

    anim.onfinish = () => {
        avatarWrapper.style.zIndex = originalZIndex;
        //sprite.style.transform = 'scaleX(1)';
    };

    setTimeout(() => _egApplyPlayerMeleeImpact(targetId), EG_PLAYER_MELEE_ANIM_DURATION_MS / 2);
}

/*

function _egAnimatePlayerMelee(targetId) {
    const targetCard = document.getElementById(`eg-card-${targetId}`);
    const sourceHud = document.getElementById('class-hud-panel');

    if (!sourceHud || !targetCard) {
        // If UI elements are missing, deal damage instantly
        _egDamageTargetById(targetId, EG_PLAYER_MELEE_DAMAGE);
        return;
    }

    const start = _egGetElementCentre(sourceHud);
    const end = _egGetElementCentre(targetCard);
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Ensure the HUD renders on top during flight
    sourceHud.style.zIndex = '9999';

    const anim = sourceHud.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(1.15)` }, // Apex/Impact
        { transform: 'translate(0px, 0px) scale(1)' }
    ], { duration: EG_PLAYER_MELEE_ANIM_DURATION_MS, easing: 'ease-in-out' });

    anim.onfinish = () => {
        sourceHud.style.zIndex = '';
    };

    // Damage fires at the animation midpoint to match visual impact[cite: 1]
    setTimeout(() => _egApplyPlayerMeleeImpact(targetId), EG_PLAYER_MELEE_ANIM_DURATION_MS / 2);
}

*/


//------------------------------------------------------------------------
//-------------------TARGETING--------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the currently targeted monster object, or null if none.
function _egGetTarget() {
    if (!_egTargetId) return null;
    return _egMonsters.find(m => m.id === _egTargetId) || null;
}

// Sets the player's target to the given monster and refreshes the panel.
// Called by the onclick handler on monster cards in the rendered panel HTML.
function _egSelectTarget(monsterId) {
    if (!_egIsActive()) return;
    _egTargetId = monsterId;
    _egRenderPanel();

    // Keep the charging projectile aimed at the new target mid-stroke
    if (_egDragChargeStacks > 0) {
        const anchor = ((_egDragChargeRow >= 0 && _egDragChargeCol >= 0)
            && document.getElementById(`g-${_egDragChargeRow}-${_egDragChargeCol}`))
            || document.getElementById('class-hud-drag-handle');
        _egAimChargingProjectile(anchor);
    }
}

// Cycles the target through the live monster list (Shift = reverse).
// Wraps around at both ends; no-op when no monsters are on the field.
function _egCycleTarget(reverse) {
    if (!_egIsActive() || _egMonsters.length === 0) return;

    const idx = _egMonsters.findIndex(m => m.id === _egTargetId);
    const step = reverse ? -1 : 1;
    const nextIdx = idx === -1
        ? 0
        : (idx + step + _egMonsters.length) % _egMonsters.length;

    _egSelectTarget(_egMonsters[nextIdx].id);
}

// Tab targeting: registered once at load. Only active during an encounter.
function _initEgTargetHotkeys() {
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (!STATE.playerClass || isClassless()) return;

        e.preventDefault();
        _egCycleTarget(e.shiftKey);
    });
}

_initEgTargetHotkeys();

// Convenience wrapper — damages the currently selected target.
// Kept for any legacy callers that don't pass an explicit id.
function _egDamageTarget(amount) {
    _egDamageTargetById(_egTargetId, amount);
}


//------------------------------------------------------------------------
//-------------------DAMAGE APPLICATION-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies stat changes when a hit lands: reduces HP and pushes back charge.
// Gear: pushback adds extra seconds on top of the base charge pushback;
// gear: stagger rolls a chance to pause the charge timer entirely for 1s.
// Pushback is resisted by high-level monsters (50% at L41, 80% at L90) so
// low-level players cannot permanently stall a T11+ monster by spamming.
function _egApplyHitToMonster(target, amount) {
    const stats = _egComputePlayerStats();
    target.currentHP = Math.max(0, target.currentHP - amount);
    const basePushback = EG_PLAYER_STATS.chargePushback + (stats.pushbackFlat || 0);
    const lvl = Math.max(1, Number(target.level) || 1);
    // High-level monsters resist pushback: linear 1.5s@L1 -> 0.3s@L90
    const resistFactor = Math.max(0.20, 1 - 0.014 * (lvl - 1)); // 0.44@L41, 0.20@L90
    const totalPushback = basePushback * resistFactor;
    target.currentCharge = Math.max(0, target.currentCharge - totalPushback);

    if (stats.staggerPct > 0 && Math.random() * 100 < stats.staggerPct) {
        target.staggeredUntil = Date.now() + EG_STAGGER_DURATION_MS;
        _egShowStatusLabel(target.id, t('eg_staggered'));
    }
}

// Appends a short floating status label (stagger/snipe/...) to a monster card.
function _egShowStatusLabel(monsterId, text) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;
    const label = document.createElement('div');
    label.className = 'eg-damage-number eg-status-label';
    label.textContent = text;
    // small random jitter so overlapping labels don't perfectly stack
    label.style.marginLeft = `${(Math.random() * 10 - 5).toFixed(1)}px`;
    card.appendChild(label);
    setTimeout(() => label.remove(), EG_DAMAGE_NUMBER_DURATION_MS);
}

// Returns the dominant elemental key for visual choice, or 'physical' when none.
function _egGetDominantElement(elements) {
    if (!elements) return 'physical';
    let best = 'physical';
    let bestVal = 0;
    EG_ELEMENTS.forEach(el => {
        const v = elements[el] || 0;
        if (v > bestVal) { bestVal = v; best = el; }
    });
    return bestVal > 0 ? best : 'physical';
}

// Applies incoming player damage to a specific monster by id.
// Handles boss immunity, elemental resistances, stat changes, phase
// transitions, and kill detection.
// Called by the projectile onfinish callback so the impact matches visually.
// `elements` optionally maps each element to the elemental share of `amount`.
// `opts.isEcho` marks the delayed echo instance so echoes can't chain into
// further echoes (they still trigger on-hit effects like leech/ailments).
// `opts.isCharged` marks a drag-paint charged shot (or its ricochet chain)
// so overkill always ricochets as a smaller projectile.
function _egDamageTargetById(monsterId, amount, elements, opts) {
    if (!_egIsActive()) return;

    const target = _egMonsters.find(m => m.id === monsterId);
    if (!target) return;

    // Boss immunity window — ignore damage and show the immune flash
    if (target.bossImmune) {
        _egFlashImmune(target.id);
        return;
    }

    const hpBefore = target.currentHP;

    // Elemental resistances reduce only the elemental share of the hit;
    // the physical portion passes through untouched.
    amount = _egApplyTargetResistances(amount, target, elements);

    // Ailments: shocked monsters take amplified damage; elemental hits can
    // ignite / chill / freeze / shock the monster (gear ailment chances).
    if (typeof _egApplyAilmentShockAmpOnMonster === 'function') {
        amount = _egApplyAilmentShockAmpOnMonster(target, amount);
    }
    if (typeof _egRollPlayerHitAilments === 'function') {
        _egRollPlayerHitAilments(target, amount, elements);
    }

    _egApplyHitToMonster(target, amount);
    // Pass crit + elemental info so the number can pop with the right colour/size
    const isCrit = !!(opts && opts.isCrit);
    _egShowDamageNumber(target.id, amount, isCrit, elements);
    _egFlashDamageCard(target.id);
    _egSpawnHitBurst(target.id, elements, isCrit);

    // Gear: echo (rings) — chance for the hit to repeat as a delayed
    // second instance of echoDamagePct of its damage
    if (!(opts && opts.isEcho)) _egTryEchoHit(target.id, amount, elements, isCrit);

    // Check for boss phase transition before checking death
    if (target.isBoss) _egBossCheckPhase(target);

    if (target.currentHP <= 0) {
        // Charged overkill ricochet — always fires a smaller projectile
        // carrying the surplus damage to the next monster (chainable).
        const isChargedHit = !!(opts && opts.isCharged);
        if (isChargedHit) {
            _egTryChargedOverkillRicochet(target, amount, hpBefore, elements, opts);
        } else {
            // Gear: overkill — chance for excess damage to bleed into another monster
            _egTryOverkillSpread(target, amount, hpBefore, isCrit, elements);
        }
        _egKillMonster(target.id);
        return;
    }

    _egUpdateBars();
}

// Gear: overkill — on every killing blow with excess damage, transfers the
// surplus to a random other living monster. overkillPct increases the amount
// transferred; it is not a chance to transfer.
function _egTryOverkillSpread(dyingTarget, appliedDamage, hpBefore, isCrit, elements) {
    const stats = _egComputePlayerStats();
    const overkillPct = Math.max(0, stats.overkillPct || 0);

    const overkill = (hpBefore != null)
        ? Math.round(appliedDamage - hpBefore)
        : Math.round(appliedDamage - dyingTarget.currentHP); // fallback: currentHP clamped at 0
    if (overkill <= 0) return;

    const others = _egMonsters.filter(m => m.id !== dyingTarget.id && m.currentHP > 0);
    if (!others.length) return;
    const victim = others[Math.floor(Math.random() * others.length)];
    const transferredDamage = Math.round(overkill * (1 + overkillPct / 100));
    _egDamageTargetById(victim.id, transferredDamage, elements, { isCrit: !!isCrit });
}

// Drag-paint charged overkill ricochet — when a charged projectile overkills
// its target, a smaller projectile flies from the dying monster to the next
// living monster dealing the exact overkill amount. Chains if that hit also
// overkills (always triggers, no gear check required).
const EG_CHARGED_RICOCHET_SCALE = 0.62;   // smaller than the main charged shot
const EG_CHARGED_RICOCHET_DURATION_MS = 350;

function _egTryChargedOverkillRicochet(dyingTarget, appliedDamage, hpBefore, elements, opts) {
    const overkill = Math.round(appliedDamage - (hpBefore != null ? hpBefore : 0));
    if (overkill <= 0) return;

    const others = _egMonsters.filter(m => m.id !== dyingTarget.id && m.currentHP > 0);
    if (!others.length) return;
    const victim = others[Math.floor(Math.random() * others.length)];

    // Scale element share proportionally so resistances still apply correctly
    let ricochetElements = null;
    if (elements && appliedDamage > 0) {
        const factor = overkill / appliedDamage;
        ricochetElements = _egScaleElements(elements, factor);
        // If finalDamage had bonus, elements were for the pre-bonus damage;
        // factor above already approximates; true scaled share is fine for visuals/resist.
    }

    const sourceCard = document.getElementById(`eg-card-${dyingTarget.id}`);
    const targetCard = document.getElementById(`eg-card-${victim.id}`);
    if (sourceCard && targetCard) {
        const start = _egGetElementCentre(sourceCard);
        const end = _egGetElementCentre(targetCard);
        const projDef = _egGetProjectileDef();
        // Build a smaller visual copy of the class projectile
        const cssExtra = 'eg-proj-ricochet';
        _egFireProjectile(projDef, `${projDef.cssClass} ${cssExtra}`, start, end, EG_CHARGED_RICOCHET_DURATION_MS, 'linear', () => {
            const olabel = t('eg_overkill');
            _egShowStatusLabel(victim.id, olabel !== 'eg_overkill' ? olabel : 'Overkill!');
            _egDamageTargetById(victim.id, overkill, ricochetElements, { isCharged: true, isRicochet: true, isCrit: !!(opts && opts.isCrit) });
        }, null, EG_CHARGED_RICOCHET_SCALE);
    } else {
        // No visual path available — apply damage instantly so it is not lost
        _egDamageTargetById(victim.id, overkill, ricochetElements, { isCharged: true, isRicochet: true, isCrit: !!(opts && opts.isCrit) });
    }
}

// Gear: echo (ring suffix) — rolls against echoChancePct and schedules a
// delayed second hit worth echoDamagePct of the original applied damage.
// Echo instances are flagged so they cannot chain into further echoes.
function _egTryEchoHit(targetId, appliedAmount, elements, isCrit) {
    const stats = _egComputePlayerStats();
    const chance = stats.echoChancePct || 0;
    const dmgPct = stats.echoDamagePct || 0;
    if (chance <= 0 || dmgPct <= 0) return;
    if (!appliedAmount || appliedAmount <= 0) return;
    if (Math.random() * 100 >= chance) return;

    setTimeout(() => {
        if (!_egIsActive()) return;
        const target = _egMonsters.find(m => m.id === targetId);
        if (!target) return;
        _egShowStatusLabel(targetId, t('eg_echo'));
        _egDamageTargetById(targetId, Math.max(1, Math.round(appliedAmount * dmgPct / 100)), elements, { isEcho: true, isCrit: !!isCrit });
    }, EG_ECHO_DELAY_MS);
}


// Applies incoming monster damage to the player, after dodge/block/resist/
// armour/absorption mitigation. Returns the actual HP lost (0 if dodged/
// blocked/fully absorbed) so callers can show an accurate floating number.
// `isSpell` routes the hit through spell block instead of attack block
// (boss abilities pass true; regular monster attacks use the default).
// `element` is the damage type of the attack ('fire'|'cold'|'lightning'|
// 'shadow'); elemental hits are reduced by the matching resistance % plus
// flat Arcane Resistance. Physical hits (no element) ignore resistances.
// `attackerLevel` feeds the level-scaled evasion benchmark; falls back to the
// current target's level, then the encounter's base level.
// `opts.isBossAbility` marks damage dealt by boss special abilities — those
// hits can never be parried, dodged, blocked or fate-negated; they always
// land unless the telegraphed mechanic itself was avoided by movement.
function _egPlayerTakeDamage(amount, isSpell = false, element = null, attackerLevel = null, opts = null) {
    if (!_egIsActive()) return 0;

    // GODMODE — developer/test-only: blocks ALL incoming damage before any
    // mitigation runs, so mechanic testing can ignore the player's health.
    // Toggle with window._egGodMode = true/false from the console.
    if (window._egGodMode) return 0;

    const stats = _egComputePlayerStats();

    // Boss special abilities are never negatable — their damage always lands
    // unless the player avoided the ability by movement/position (the
    // telegraphed dodge mechanics are the only boss abilities assigned to be
    // avoidable). Parry, evasion, block and fate all skip them; element
    // resistances, armour and absorption still mitigate normally.
    const isBossAbility = !!(opts && opts.isBossAbility);

    // Gear: fate — pure-luck chance to negate ANY incoming hit entirely
    // (attacks, spells and charge hits alike), before all other mitigation.
    if (!isBossAbility && _egRollFateNegation(stats)) return 0;

    // Hold-E Parry — 50% + gear chance to fully negate projectile and charge
    // attacks while E is held. Hazards, monster spells (isSpell=true) and boss
    // special abilities are never parryable. On a successful projectile parry
    // there is a 5% + gear deflect chance to hit another monster for 30% + gear
    // damage. Dual-wielding two 1H weapons grants the same roll at a 15% + gear
    // base WITHOUT holding E.
    const holdingE = (typeof _egHoldEPauseActive !== 'undefined' && _egHoldEPauseActive);
    const dualWieldParry = !holdingE
        && (typeof _egIsDualWieldParryActive === 'function' && _egIsDualWieldParryActive());
    if (!isSpell && !isBossAbility && (holdingE || dualWieldParry)) {
        if (typeof _egIsActive === 'function' && _egIsActive()) {
            const parryChance = holdingE
                ? _egGetParryChancePct()
                : (typeof _egGetDualWieldParryChancePct === 'function' ? _egGetDualWieldParryChancePct() : 15);
            if (parryChance > 0 && Math.random() * 100 < parryChance) {
                const isProjectile = !!(opts && opts.isProjectile);
                const attacker = opts && opts.attacker ? opts.attacker : null;
                const parryToast = (typeof t === 'function' ? t('eg_parried') : '');
                showToast(parryToast && parryToast !== 'eg_parried' ? parryToast : '🗡️ Parried!');
                _egApplyPlayerParryFeedback();
                _egScheduleAbsorptionRegen();
                if (isProjectile && attacker) _egTryDeflectProjectile(attacker, true);
                return 0;
            }
        }
    }

    // Evasion only applies to physical attacks (melee strikes and monster
    // projectiles) — spells, environmental hazards and boss special abilities
    // cannot be dodged.
    if (!isSpell && !isBossAbility) {
        const attackerLvl = Number(attackerLevel)
            || (_egGetTarget() && _egGetTarget().level)
            || _egGetEncounterBaseLevel()
            || _egGetPlayerLevel();
        const dodgeChance = Math.min(75, stats.dodgeChance + _egCalcEvasionDodgeChance(stats.evasion, attackerLvl));
        if (dodgeChance > 0 && Math.random() * 100 < dodgeChance) {
            showToast(t('eg_dodged'));
            _egApplyPlayerMissFeedback();
            _egScheduleAbsorptionRegen();
            return 0;
        }
    }

    // Block roll: attacks use block chance, spells use spell block chance.
    // A successful block fully negates the hit, but locks out future
    // blocks for a short window (reduced by block recovery). Player can
    // still attack while recovering — only blocking is suppressed.
    // Blocking requires an actual shield in the off-hand — block chance
    // from mods/passives on other slots does nothing without one. Boss
    // special abilities are never blockable.
    const isBlockLockedOut = Date.now() < _egPlayerBlockLockoutUntil;
    const hasShieldEquipped = _egGetAllEquippedItems()
        .some(item => item.slotType === 'shield');
    const blockChance = (!isBossAbility && !isBlockLockedOut && hasShieldEquipped)
        ? Math.min(75, isSpell ? stats.spellBlockChance : stats.blockChance)
        : 0;
    if (blockChance > 0 && Math.random() * 100 < blockChance) {
        showToast(t('eg_blocked'));
        _egApplyPlayerBlockFeedback();
        _egScheduleAbsorptionRegen();

        // Shield bash retaliation: chance to slam the current target for
        // flat physical damage when blocking an attack.
        if (!isSpell
            && stats.shieldBashChancePct > 0
            && stats.shieldBashDamageFlat > 0
            && Math.random() * 100 < stats.shieldBashChancePct) {
            const target = _egGetTarget();
            if (target) _egDamageTargetById(target.id, Math.round(stats.shieldBashDamageFlat));
        }

        const recoveryFactor = Math.max(0, 1 - Math.min(100, stats.blockRecoveryPct) / 100);
        let lockoutDuration = EG_BLOCK_LOCKOUT_BASE_MS * recoveryFactor;
        // Active map run: block lockouts last #% longer.
        if (typeof _egGetActiveMapModValue === 'function') {
            const lockoutPct = _egGetActiveMapModValue('map_longer_lockout');
            if (lockoutPct > 0) lockoutDuration *= (1 + lockoutPct / 100);
        }
        _egPlayerBlockLockoutUntil = Date.now() + lockoutDuration;
        _egShowBlockLockoutOverlay(lockoutDuration);
        return 0;
    }

    // Elemental resistances (fire/cold/lightning/shadow % + flat Arcane
    // Resistance) mitigate elemental hits before armour and absorption.
    if (element) amount = _egCalcPlayerResistanceReduction(amount, stats, element);

    // Ailments: a shocked player takes amplified damage from all hits.
    if (typeof _egApplyPlayerShockAmp === 'function') amount = _egApplyPlayerShockAmp(amount);

    // Active map run: Vulnerability — you take #% increased damage.
    if (typeof _egMapDamageTakenAmpMult === 'function') amount *= _egMapDamageTakenAmpMult();

    // Active map run: Armour Pierce — monster hits ignore #% of your armour.
    let effectiveArmour = stats.armour;
    if (!isSpell && typeof _egGetActiveMapModValue === 'function') {
        const pierce = _egGetActiveMapModValue('map_armour_pierce');
        if (pierce > 0) effectiveArmour = Math.max(0, Math.round(stats.armour * (1 - Math.min(90, pierce) / 100)));
    }

    let mitigated = _egCalcArmourMitigation(amount, effectiveArmour);

    if (_egPlayerAbsorptionCurrent > 0) {
        const prevAbs = _egPlayerAbsorptionCurrent;
        const absorbed = Math.min(_egPlayerAbsorptionCurrent, mitigated);
        _egPlayerAbsorptionCurrent -= absorbed;
        mitigated -= absorbed;
        Audio_Manager.playSFX('player_shield_damage_taken');
        if (typeof _egMaybeShowAbsorptionBroken === 'function') _egMaybeShowAbsorptionBroken(prevAbs, _egPlayerAbsorptionCurrent);
    }

    _egScheduleAbsorptionRegen();

    mitigated = Math.max(0, Math.round(mitigated));
    if (mitigated <= 0) return 0;

    playerCurrentHP = Math.max(0, playerCurrentHP - mitigated);

    // Gear: warding — once per map, a killing blow instead leaves the player
    // at wardingHP health and the ward shatters.
    if (playerCurrentHP <= 0 && !_egWardingUsedThisMap) {
        const wardHP = Math.round(stats.wardingHP || 0);
        if (wardHP > 0) {
            _egWardingUsedThisMap = true;
            playerCurrentHP = wardHP;
            showToast(t('eg_warding'));
            Audio_Manager.playSFX('player_shield_damage_taken');
        }
    }

    _renderPlayerHealth();
    if (playerCurrentHP <= 0) _egGameOver();

    // Ailments: elemental hits can ignite / chill / shock / shadow-burn the
    // player (rolled from the monster's attack element).
    if (typeof _egRollMonsterHitAilment === 'function') _egRollMonsterHitAilment(element, mitigated);

    return mitigated;
}


//------------------------------------------------------------------------
//-------------------KILL HANDLING----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Auto-selects the first remaining monster after a kill, or clears the target.
function _egUpdateTargetAfterKill() {
    if (_egMonsters.length > 0) {
        _egTargetId = _egMonsters[0].id;
    } else {
        _egTargetId = null;
        _egOnAllMonstersDead();
    }
}

// Handles all post-kill logic for a normal (non-boss) monster death.
function _egHandleNormalMonsterKill(dying) {
    _egChainKillCount++;

    _egUpdateObjectivesHUD();

    // Keep the field populated: replacements spawn until the player enters
    // the boss arena (not just until the kill objective is reached — extra
    // kills after the objective are intentional free XP/loot, see
    // _egShouldSuppressRespawn).
    _egScheduleRespawn();

    // Sacrificial zombie adds (Brutus) never drop loot — their only reward is
    // a chance to drop a healing heart onto the grid when the PLAYER kills
    // them (a slam-devoured zombie drops nothing; it feeds Brutus instead).
    if (dying && dying.noLoot) {
        const heartChance = dying.zombieHeartDropChance || 0;
        if (heartChance > 0 && Math.random() * 100 < heartChance * 100
            && typeof _egDropHeartPickup === 'function') {
            _egDropHeartPickup();
        }
    } else {
        if (typeof _egSpawnLootDrop === 'function') _egSpawnLootDrop(false, dying.level);
        if (typeof _egSpawnItemDrop === 'function') _egSpawnItemDrop(false);
        if (typeof _egTryDropCurrency === 'function') _egTryDropCurrency(false);
        if (typeof _egTryDropEssence === 'function') _egTryDropEssence(false);
        if (typeof _egTryDropMap === 'function') _egTryDropMap(false, dying.level);
    }
}

// Handles all post-kill logic for a boss monster death.
// During the boss arena chain this advances the chain: more bosses left →
// roll into the next arena; last boss dead → loot party + Complete Map.
function _egHandleBossKill(dying) {
    if (typeof _egBossPhaseActive !== 'undefined' && _egBossPhaseActive) {
        _egBossKilledCount++;

        const allDead = typeof _egBossDefeated === 'function' && _egBossDefeated();
        if (allDead) {
            if (typeof _egOnAllBossesDead === 'function') _egOnAllBossesDead();
        } else if (typeof _egScheduleArenaAdvance === 'function') {
            _egScheduleArenaAdvance();
        }
    }

    _egUpdateObjectivesHUD();
    if (typeof _egSpawnLootDrop === 'function') _egSpawnLootDrop(true,dying.level);
    if (typeof _egSpawnItemDrop === 'function') _egSpawnItemDrop(true);
    if (typeof _egTryDropEssence === 'function') _egTryDropEssence(true);
    if (typeof _egTryDropMap === 'function') _egTryDropMap(true, dying.level);
}

// Removes a monster from the encounter after its death animation fires.
// Delegates to the appropriate normal or boss kill handler.
function _egKillMonster(monsterId) {
    const dying = _egMonsters.find(m => m.id === monsterId);

    // Active map run: Second Wind — the monster rises back up once instead.
    if (dying && dying.secondWindPct > 0 && !dying.secondWindUsed
        && typeof _egIsActive === 'function' && _egIsActive()) {
        dying.secondWindUsed = true;
        if (Math.random() * 100 < dying.secondWindPct) {
            dying.currentHP = Math.max(1, Math.round((dying.maxHP || 1) * 0.25));
            dying.currentCharge = 0;
            showToast(`✨ ${dying.name || ''} ${t('eg_mm_toast_second_wind') || 'rises again!'}`.trim());
            return;
        }
    }

    // Active map run: exploding monsters — deal #% of their own maximum
    // life as damage to the player on death (dodgeable / blockable).
    if (dying && dying.explodeOnDeathPct > 0 && typeof _egIsActive === 'function' && _egIsActive()) {
        const blast = Math.max(1, Math.round((dying.maxHP || 0) * dying.explodeOnDeathPct / 100));
        if (blast > 0) {
            showToast(`💥 ${dying.name || ''} ${t('eg_mm_toast_explode') || 'explodes!'} (-${blast})`);
            _egPlayerTakeDamage(blast, false, dying.element, dying.level);
            if (typeof dead !== 'undefined' && dead) return;
        }
    }

    _egBossCleanup(monsterId);
    _egFlashKillCard(monsterId);

    // Dynamo conductors: beam-network sockets whose power source is gone.
    // _egRemoveConductor fires the destruction burst and lets the roaming
    // card linger briefly so the kill-flash animation can play out.
    if (dying && dying.isDynamoConductor && typeof _egRemoveConductor === 'function') {
        _egRemoveConductor(monsterId);
    }

    _egMonsters = _egMonsters.filter(m => m.id !== monsterId);

    _egUpdateTargetAfterKill();

    // Endgame achievements — combat
    if (typeof trackAchStat === 'function') try {
        if (dying && !dying.isBoss) trackAchStat('egMonstersSlain', 1);
        if (dying && dying.isBoss) {
            trackAchStat('egBossKills', 1);
            // Track distinct boss types slain: maintain a set in ACH_STATE
            const _bossBase = dying.baseId || dying.id || '';
            const _bossStatKey = 'egBossTypesSlain';
            // Use a helper stat per boss id to dedup
            const _bossSeenKey = '_egBossSeen_' + _bossBase;
            if (typeof ACH_STATE !== 'undefined' && ACH_STATE.stats && !ACH_STATE.stats[_bossSeenKey]) {
                ACH_STATE.stats[_bossSeenKey] = 1;
                if (typeof saveAchState === 'function') saveAchState();
                // Count distinct seen keys
                let _distinct = 0;
                for (const k in ACH_STATE.stats) if (k.indexOf('_egBossSeen_') === 0 && ACH_STATE.stats[k]) _distinct++;
                if (typeof setAchStat === 'function') setAchStat(_bossStatKey, _distinct);
                else trackAchStat(_bossStatKey, 1);
            }
        }
    } catch(e){}

    if (dying && !dying.isBoss) _egHandleNormalMonsterKill(dying);
    if (dying && dying.isBoss) _egHandleBossKill(dying);

    // On-kill gear stats: mana, life and absorption on kill
    if (typeof _egComputePlayerStats === 'function') {
        const killStats = _egComputePlayerStats();

        if (typeof gainMana === 'function' && playerMaxMana > 0 && (killStats.manaOnKill || 0) > 0) {
            gainMana(killStats.manaOnKill);
        }

        if ((killStats.lifeOnKill || 0) > 0 && playerCurrentHP > 0 && playerCurrentHP < playerMaxHP) {
            // Active map run: "#% less Life gained from Kills".
            const recoveryMult = (typeof _egMapKillRecoveryMult === 'function')
                ? _egMapKillRecoveryMult() : 1;
            const lifeGain = Math.round(killStats.lifeOnKill * recoveryMult);
            if (lifeGain > 0) {
                playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + lifeGain);
                if (typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
            }
        }

        if ((killStats.absorptionOnKill || 0) > 0 && typeof _egIsActive === 'function' && _egIsActive()) {
            const maxAbsorption = killStats.absorption;
            if (_egPlayerAbsorptionCurrent < maxAbsorption) {
                _egPlayerAbsorptionCurrent = Math.min(maxAbsorption, _egPlayerAbsorptionCurrent + killStats.absorptionOnKill);
            }
        }
    }

    // Experience (endgame-leveling.js) — scaled by the monster's level
    if (dying && typeof _egGrantMonsterXP === 'function') {
        _egGrantMonsterXP(dying.level, !!dying.isBoss);
    }

    setTimeout(() => _egRenderPanel(), EG_PANEL_RERENDER_DELAY_MS);
}

// Called when the last monster in the encounter is killed.
// Currently intentionally empty — kill toasts handle all feedback.
function _egOnAllMonstersDead() { }

// Triggers the game-over sequence when the player's HP reaches zero.
function _egGameOver() {
    // Central defeat handler — the player keeps the loot collected so far.
    _egEndMapDefeated(t('eg_game_over'), t('eg_monsters_overwhelmed'));
}


//------------------------------------------------------------------------
//-------------------MONSTER SPAWNING-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Picks a random zone from EG_MONSTER_ZONES and assigns it to the monster.
function _egAssignRandomSpawnZone(monster) {
    monster.zoneId = EG_MONSTER_ZONES[Math.floor(Math.random() * EG_MONSTER_ZONES.length)];
}

// Tries to build the monster from normal defs first, then boss defs as fallback.
// Marks the monster as a boss if it was built from EG_BOSS_DEFS.
// hpMult: optional multiplier for boss max HP only (e.g., 500k HP test mode);
// damage is left at its normal scaled value.
function _egBuildMonsterOrBoss(defId, level, hpMult = 1) {
    let monster = _egBuildMonster(defId, level, hpMult);
    if (!monster) {
        monster = _egBuildBoss(defId, level, hpMult);
        if (monster) monster.isBoss = true;
    } else if (typeof EG_BOSS_DEFS !== 'undefined' && EG_BOSS_DEFS[defId]) {
        monster.isBoss = true;
    } else if (monster.baseId && typeof EG_BOSS_DEFS !== 'undefined' && EG_BOSS_DEFS[monster.baseId]) {
        monster.isBoss = true;
    }
    return monster;
}

// Initialises boss logic on arrival. Spawn toasts were removed —
// the monster cards themselves signal that something appeared.
function _egNotifyMonsterArrival(monster) {
    if (monster.isBoss) {
        _egBossInit(monster);
    }
}

// Adds a monster to the live encounter.
// Assigns a random spawn zone, auto-targets if no target exists, and notifies the player.
// hpMult: optional multiplier for boss max HP only (e.g., 500k HP test mode);
// damage is left at its normal scaled value.
function _egSpawnMonster(defId, level, hpMult = 1) {
    if (_egMonsters.length >= EG_MAX_CONCURRENT_MONSTERS) return;

    const monster = _egBuildMonsterOrBoss(defId, level, hpMult);
    if (!monster) return;

    // Gear: first_step — per-monster charge-up grace window after spawning
    const firstStepSec = _egComputePlayerStats().firstStepSeconds || 0;
    if (firstStepSec > 0) {
        monster.firstStepUntil = Date.now() + firstStepSec * 1000;
        // Show toast once per map when first_step is active
        if (!_egFirstStepToastShown) {
            _egFirstStepToastShown = true;
            showToast(t('eg_first_step').replace('{n}', _egFormatStatValue(firstStepSec)));
        }
    }

    _egAssignRandomSpawnZone(monster);
    _egMonsters.push(monster);

    if (!_egTargetId) _egTargetId = monster.id; // auto-target the first monster to arrive

    _egRenderPanel();
    _egNotifyMonsterArrival(monster);
}


//------------------------------------------------------------------------
//-------------------VISUAL EFFECTS---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Appends a floating "-N" damage number to the monster's card that fades out.
// `isCrit` and `elements` drive the RPG pop: crits are bigger/gold, elemental
// dominance tints the number and its glow (shadow/fire/cold/lightning).
function _egShowDamageNumber(monsterId, amount, isCrit, elements) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;

    const dmgText = document.createElement('div');
    const domEl = (typeof _egGetDominantElement === 'function') ? _egGetDominantElement(elements) : 'physical';
    let cls = 'eg-damage-number';
    if (domEl && domEl !== 'physical') cls += ' eg-dmg-' + domEl;
    else cls += ' eg-dmg-physical';
    if (isCrit) cls += ' eg-dmg-crit';
    else if (amount != null && amount > 0 && amount < 8) cls += ' eg-dmg-small';
    dmgText.className = cls;
    dmgText.textContent = `-${amount}`;
    // random horizontal jitter + tiny vertical stagger so rapid hits fan out
    dmgText.style.marginLeft = `${(Math.random() * 18 - 9).toFixed(1)}px`;
    dmgText.style.marginTop = `${(Math.random() * 6 - 3).toFixed(1)}px`;
    card.appendChild(dmgText);
    // crit numbers linger a touch longer
    setTimeout(() => dmgText.remove(), isCrit ? EG_DAMAGE_NUMBER_DURATION_MS + 180 : EG_DAMAGE_NUMBER_DURATION_MS);
}

// Removes and re-adds a CSS flash class to force the animation to restart.
// Works for any flash class on any card element.
function _egRestartFlashClass(card, cssClass) {
    card.classList.remove(cssClass);
    void card.offsetWidth; // force reflow so the CSS animation restarts
    card.classList.add(cssClass);
}

// Triggers the damage flash CSS animation on the monster's card.
function _egFlashDamageCard(monsterId) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;
    _egRestartFlashClass(card, 'eg-flash-damage');
}

// Adds the kill flash class to the monster's card (plays the death animation).
function _egFlashKillCard(monsterId) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (card) card.classList.add('eg-flash-kill');
}

// Shows the IMMUNE label and flashes the immunity animation on the monster's card.
function _egFlashImmune(monsterId) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;

    _egRestartFlashClass(card, 'eg-flash-immune');
    setTimeout(() => card.classList.remove('eg-flash-immune'), EG_IMMUNE_FLASH_DURATION_MS);

    const label = document.createElement('div');
    label.className = 'eg-damage-number eg-immune-label';
    label.textContent = t('eg_immune');
    card.appendChild(label);
    setTimeout(() => label.remove(), EG_IMMUNE_LABEL_DURATION_MS);
}

// Particle colour per damage element (falls back to white for physical).
const EG_HIT_ELEMENT_COLORS = {
    physical: '#ffffff',
    fire: '#ff6b35',
    cold: '#4fc3f7',
    lightning: '#ffe066',
    shadow: '#b06bff'
};

const EG_HIT_BURST_SPARK_COUNT = 14;
const EG_HIT_BURST_DURATION_MS = 750;

// Spawns a short spark burst + expanding shockwave ring at the monster's
// card centre when damage lands. Both melee strikes and projectiles funnel
// through _egDamageTargetById, so this fires for every player hit.
// `elements` optionally maps each element to its share of the hit; the
// dominant element picks the burst colour. `isCrit` enlarges the burst.
function _egSpawnHitBurst(monsterId, elements, isCrit) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;

    let color = EG_HIT_ELEMENT_COLORS.physical;
    if (elements) {
        let best = null;
        Object.keys(elements).forEach(el => {
            if (EG_HIT_ELEMENT_COLORS[el] && (!best || elements[el] > elements[best])) best = el;
        });
        if (best) color = EG_HIT_ELEMENT_COLORS[best];
    }

    const rect = card.getBoundingClientRect();
    const burst = document.createElement('div');
    burst.className = 'eg-hit-burst';
    burst.style.left = `${rect.left + rect.width / 2}px`;
    burst.style.top = `${rect.top + rect.height / 2}px`;

    // Expanding shockwave ring
    const ring = document.createElement('div');
    ring.className = 'eg-hit-ring';
    ring.style.setProperty('--eg-hit-color', color);
    burst.appendChild(ring);

    if (isCrit) {
        // Crit: bigger, brighter ring
        ring.style.transform = 'scale(1.35)';
        ring.style.borderWidth = '4px';
        ring.style.filter = 'brightness(1.5)';
    }

    // Outward-flying sparks in a ring with slight random jitter
    const sparkCount = isCrit ? EG_HIT_BURST_SPARK_COUNT + 8 : EG_HIT_BURST_SPARK_COUNT;
    for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement('div');
        spark.className = 'eg-hit-spark';
        const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.5;
        const dist = isCrit ? 52 + Math.random() * 36 : 40 + Math.random() * 30;
        spark.style.setProperty('--eg-hit-color', color);
        spark.style.setProperty('--spark-dx', `${(Math.cos(angle) * dist).toFixed(1)}px`);
        spark.style.setProperty('--spark-dy', `${(Math.sin(angle) * dist).toFixed(1)}px`);
        if (isCrit) spark.style.width = '10px';
        if (isCrit) spark.style.height = '10px';
        if (isCrit) spark.style.marginLeft = '-5px';
        if (isCrit) spark.style.marginTop = '-5px';
        burst.appendChild(spark);
    }

    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), isCrit ? EG_HIT_BURST_DURATION_MS + 150 : EG_HIT_BURST_DURATION_MS);
}


//------------------------------------------------------------------------
//-------------------RENDER-----------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the CSS class for an HP bar based on the percentage remaining.
function _egHpBarClass(hpPct) {
    if (hpPct > 60) return 'eg-hp-high';
    if (hpPct > 30) return 'eg-hp-mid';
    return 'eg-hp-low';
}

// Builds the badge HTML for a monster's name row (level, boss phase, immune, target).
// NOTE: _egBuildMonsterBadgesHTML is kept for any external callers.
function _egBuildMonsterBadgesHTML(m, isTarget) {
    let html = `<span class="eg-level-badge">${t('eg_lv_badge').replace('{n}', m.level)}</span>`;
    if (m.isBoss && m.bossPhase)
        html += `<span class="eg-boss-phase-badge eg-boss-phase-${m.bossPhase}">${t('eg_phase_badge').replace('{n}', m.bossPhase)}</span>`;
    if (m.bossImmune)
        html += `<span class="eg-boss-immune-badge">${t('eg_immune')}</span>`;
    if (isTarget)
        html += `<span class="eg-target-badge">${t('eg_target_badge')}</span>`;
    return html;
}

// Calculates HP and charge percentages clamped to [0, 100] for a given monster.
function _egCalcBarPercentages(m) {
    return {
        hpPct: Math.max(0, Math.round((m.currentHP / m.maxHP) * 100)),
        chargePct: Math.min(100, Math.max(0, (m.currentCharge / m.chargeMax) * 100)),
    };
}

// Builds the compact emoji card HTML for a single monster.
function _egBuildMonsterCardHTML(m) {
    const { hpPct, chargePct } = _egCalcBarPercentages(m);
    const isTarget = (m.id === _egTargetId);
    const bossCls = m.isBoss ? ' eg-boss-card' : '';
    const targetedCls = isTarget ? ' eg-card-targeted' : '';

    return `
    <div class="eg-monster-card-compact${bossCls}${targetedCls}" id="eg-card-${m.id}" onclick="_egSelectTarget('${m.id}')">
        ${isTarget ? '<span class="eg-target-arrow"><span class="eg-target-arrow-icon">▼</span> TARGET <span class="eg-target-arrow-icon">▼</span></span>' : ''}

        <!-- Bars stacked top-to-bottom: Charge bar then HP bar above the icon -->
        <div class="eg-compact-bars">
            <div class="eg-charge-track-compact">
                <div class="eg-charge-bar" id="eg-charge-bar-${m.id}" style="width:${chargePct}%"></div>
            </div>
            <div class="eg-hp-track-compact">
                <div class="eg-hp-bar-compact ${_egHpBarClass(hpPct)}" id="eg-hp-bar-${m.id}" style="width:${hpPct}%"></div>
            </div>
        </div>

        <!-- Elemental ailment icons (ignite/chill/frozen/shocked/shadowburn) -->
        <div class="eg-status-strip" id="eg-status-${m.id}"></div>

        <!-- Emoji icon with level badge and hover tooltip -->
        <div class="eg-emoji-wrapper${m.isBoss ? ' eg-boss-emoji-wrapper' : ''}${(m.enrageStacks || 0) > 0 ? ' eg-boss-enraged' : ''} ${isTarget ? 'eg-compact-targeted' : ''}">
            ${m.isBoss ? '<span class="eg-boss-crown">👑</span>' : ''}
            <span class="eg-monster-emoji-compact${m.isBoss ? ' eg-boss-emoji' : ''}">${EG_ART.html('monster', m.baseId, m.emoji)}</span>
            <span class="eg-level-bottom-left">${m.level}</span>

            <div class="eg-monster-compact-tooltip">
                <div class="eg-tooltip-name">${m.name}</div>
                <div class="eg-tooltip-hp" id="eg-hp-label-${m.id}">${m.currentHP} / ${m.maxHP} HP</div>
            </div>
        </div>

    </div>`;
}





// Updates the HP bar, charge bar, and HP label for a single monster.
// Cheap DOM update used by the 10Hz tick loop — no full rebuild.
function _egUpdateMonsterBars(m) {
    const { hpPct, chargePct } = _egCalcBarPercentages(m);

    const hpBar = document.getElementById(`eg-hp-bar-${m.id}`);
    const chargeBar = document.getElementById(`eg-charge-bar-${m.id}`);
    const hpLabel = document.getElementById(`eg-hp-label-${m.id}`);

    if (hpBar) {
        hpBar.style.width = hpPct + '%';
        hpBar.className = `eg-hp-bar-compact ${_egHpBarClass(hpPct)}`;
    }
    if (chargeBar) {
        chargeBar.style.width = chargePct + '%';
        // Danger glow when the attack is about to fire (>75% charged) — matches RPG pop
        if (chargePct >= 75) chargeBar.classList.add('eg-charge-danger');
        else chargeBar.classList.remove('eg-charge-danger');
    }
    if (hpLabel) hpLabel.textContent = `${m.currentHP} / ${m.maxHP} HP`;

    // Elemental ailment icon strip (only rebuilds when statuses change)
    if (typeof _egRenderMonsterStatusStrip === 'function') _egRenderMonsterStatusStrip(m);
}

// High-frequency bar update (10Hz). Only touches bar widths and HP text —
// no DOM rebuilds. Keeps the tick loop cheap.
function _egUpdateBars() {
    if (!_egIsActive()) return;
    _egMonsters.forEach(_egUpdateMonsterBars);
}

// Clears all monster zone elements and hides the wrapper.
function _egHideMonsterPanel() {
    EG_MONSTER_ZONES.forEach(zone => {
        const el = document.getElementById(zone);
        if (el) el.innerHTML = '';
    });
    const wrapper = document.getElementById('eg-monster-wrapper');
    if (wrapper) wrapper.classList.add('eg-hidden');
}

// Clears the HTML content of every monster zone panel.
function _egClearAllZones() {
    EG_MONSTER_ZONES.forEach(zone => {
        const el = document.getElementById(zone);
        if (el) el.innerHTML = '';
    });
}

// Renders each monster's card into its assigned zone panel.
// Uses += so multiple monsters assigned to the same zone stack correctly.
function _egRenderMonstersIntoZones() {
    _egMonsters.forEach(m => {
        // Brutus's sacrificial zombies render as roaming cards in the fixed
        // #eg-zombie-layer, not in the static monster panel.
        if (m.isSacrificialZombie) return;
        // The Dynamo's Lightning Conductors render as roaming cards in the
        // fixed #eg-dynamo-layer (beam-network anchors must stay at their
        // spawn spots) — never in the static monster panel.
        if (m.isDynamoConductor) return;
        const zoneEl = document.getElementById(m.zoneId || 'eg-monster-panel');
        if (zoneEl) zoneEl.innerHTML += _egBuildMonsterCardHTML(m);
    });
}

// Full panel rebuild. Only called on spawn, death, or target change —
// never from the tick loop.
function _egRenderPanel() {
    const wrapper = document.getElementById('eg-monster-wrapper');

    if (!_egIsActive()) {
        _egClearAllZones();
        if (wrapper) wrapper.classList.add('eg-hidden');
        return;
    }

    if (wrapper) wrapper.classList.remove('eg-hidden');

    _egClearAllZones();
    _egRenderMonstersIntoZones();
}

