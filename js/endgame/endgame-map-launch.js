//------------------------------------------------------------------------
//-------------------ENDGAME MAP DEVICE LAUNCH----------------------------
//------------------------------------------------------------------------
// Bridges the Probability Gate's map device and the puzzle encounter chain:
//   - Consumes the map inserted into the device (_egMapSlotItem)
//   - Derives run parameters from the map tier (baseline) and applies the
//     rolled map modifiers on top
//   - Stamps everything onto a randomly picked seed puzzle level and
//     launches it via startLevel(), exactly like the test-map hub does
//
// While a device run is active, _egActiveMapItem holds the launched map so
// every consumption point (monster factories, player stats, boss mechanic
// scheduler, chain interstitials) can read its mods through the helpers
// below. The state is cleared by _egChainCleanup() when the run ends.
//
// Dependencies (must be loaded before this file):
//   endgame-maps.js            — EG_MAP_MOD_TABLES / mod shape
//   endgame-hub.js             — _egMapSlotItem, egSaveHubState()
//   endgame-encounter-chain.js — _egBuildChainPool, _egChainCleanup hook
//
// Entry point:
//   egActivateMap() in endgame-gate.js → _egLaunchMapFromDevice(mapItem)
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------RUNTIME MOD STATE------------------------------------
//------------------------------------------------------------------------

// The map item currently driving an active device run (null outside runs).
let _egActiveMapItem = null;

// Returns the first rolled value for a map mod family on the active map,
// or 0 when the mod is not present / no run is active.
// Tolerates legacy/persisted mod shapes: falls back to a numeric
// rolledStats entry or a flat `mod.value` field.
function _egGetActiveMapModValue(familyId) {
    if (!_egActiveMapItem || !Array.isArray(_egActiveMapItem.mods)) return 0;
    const mod = _egActiveMapItem.mods.find(m => m.familyId === familyId);
    if (!mod) return 0;
    if (Array.isArray(mod.rolledStats)) {
        for (const stat of mod.rolledStats) {
            const v = Number(typeof stat === 'number' ? stat : stat && stat.value);
            if (v > 0) return v;
        }
    }
    return Number(mod.value) || 0;
}

// True when the active map has the given mod family.
function _egHasActiveMapMod(familyId) {
    return _egGetActiveMapModValue(familyId) > 0;
}


//------------------------------------------------------------------------
//-------------------PLAYER MOD MULTIPLIERS-------------------------------
//------------------------------------------------------------------------
// All helpers return neutral values (1 / 0) when no device run is active,
// so every consumer can apply them unconditionally.

// "#% reduced maximum Life" → multiplier below 1.
function _egMapPlayerLifeMult() {
    const v = _egGetActiveMapModValue('map_player_life');
    return v > 0 ? Math.max(0.1, 1 - v / 100) : 1;
}

// "#% reduced Damage" → multiplier below 1.
function _egMapPlayerDamageMult() {
    const v = _egGetActiveMapModValue('map_player_damage');
    return v > 0 ? Math.max(0.1, 1 - v / 100) : 1;
}

// "#% reduced Armour, Evasion and Absorption" → multiplier below 1.
function _egMapPlayerDefenceMult() {
    const v = _egGetActiveMapModValue('map_player_defences');
    return v > 0 ? Math.max(0.1, 1 - v / 100) : 1;
}

// "#% reduced Mana gained" → multiplier below 1.
function _egMapManaGainMult() {
    const v = _egGetActiveMapModValue('map_mana_penalty');
    return v > 0 ? Math.max(0.1, 1 - v / 100) : 1;
}

// "#% reduced Melee Attack Damage" → multiplier below 1.
function _egMapPlayerMeleeMult() {
    const v = _egGetActiveMapModValue('map_melee_damage');
    return v > 0 ? Math.max(0.1, 1 - v / 100) : 1;
}

// "#% reduced Projectile Damage" → multiplier below 1.
function _egMapPlayerProjectileMult() {
    const v = _egGetActiveMapModValue('map_projectile_damage');
    return v > 0 ? Math.max(0.1, 1 - v / 100) : 1;
}

// "Reveals from Items deal #% less Damage" → multiplier below 1.
function _egMapItemRevealMult() {
    const v = _egGetActiveMapModValue('map_item_reveal_damage');
    return v > 0 ? Math.max(0.1, 1 - v / 100) : 1;
}

// "Reveals from Abilities deal #% less Damage" → multiplier below 1.
function _egMapAbilityRevealMult() {
    const v = _egGetActiveMapModValue('map_ability_reveal_damage');
    return v > 0 ? Math.max(0.1, 1 - v / 100) : 1;
}

// "#% reduced Spell Damage" → multiplier below 1.
function _egMapSpellDamageMult() {
    const v = _egGetActiveMapModValue('map_spell_damage');
    return v > 0 ? Math.max(0.1, 1 - v / 100) : 1;
}

// "#% less Time gained from Item and Ability effects" → multiplier below 1.
function _egMapTimeGainMult() {
    const v = _egGetActiveMapModValue('map_less_time_gained');
    return v > 0 ? Math.max(0.1, 1 - v / 100) : 1;
}


//------------------------------------------------------------------------
//-------------------MONSTER MOD APPLICATION------------------------------
//------------------------------------------------------------------------

// Applies the active map's monster-strengthening mods to a freshly built
// monster/boss object. Called at the end of _egBuildMonster/_egBuildBoss.
// Mods: life %, damage %, attack speed %, +all resistances.
function _egApplyMapModsToMonster(monster) {
    if (!monster || !_egActiveMapItem) return monster;

    const lifePct = _egGetActiveMapModValue('map_monster_life');
    if (lifePct > 0 && monster.maxHP > 0) {
        const maxHP = Math.round(monster.maxHP * (1 + lifePct / 100));
        monster.currentHP += maxHP - monster.maxHP;
        monster.maxHP = maxHP;
    }

    const dmgPct = _egGetActiveMapModValue('map_monster_damage');
    if (dmgPct > 0 && monster.damageValue > 0) {
        monster.damageValue = Math.round(monster.damageValue * (1 + dmgPct / 100));
        // Bosses store their pre-phase base for phase scaling — keep it in sync.
        if (monster.bossBaseDamage != null) monster.bossBaseDamage = monster.damageValue;
    }

    // Attack speed: attacks happen #% faster → charge bar fills quicker.
    const spdPct = _egGetActiveMapModValue('map_monster_speed');
    if (spdPct > 0 && monster.chargeMax > 0) {
        monster.chargeMax = Math.max(3, Math.ceil(monster.chargeMax / (1 + spdPct / 100)));
    }

    const resPct = _egGetActiveMapModValue('map_monster_resistances');
    if (resPct > 0) {
        const elements = ['fire', 'cold', 'lightning', 'shadow'];
        if (!monster.resistances || typeof monster.resistances !== 'object') {
            monster.resistances = {};
        }
        elements.forEach(el => {
            monster.resistances[el] = Math.min(75, (monster.resistances[el] || 0) + resPct);
        });
    }

    return monster;
}


//------------------------------------------------------------------------
//-------------------PUZZLE MOD HELPERS-----------------------------------
//------------------------------------------------------------------------

// "+# additional Quiz Questions per Puzzle" → how many interstitial quiz
// questions are shown between two puzzles of an active run (baseline 1).
function _egMapQuestionsPerInterstitial() {
    const v = _egGetActiveMapModValue('map_extra_questions');
    return 1 + Math.max(0, v);
}


//------------------------------------------------------------------------
//-------------------RUN REWARD BONUSES------------------------------------
//------------------------------------------------------------------------
// The active map's mods grant run-wide reward bonuses (see
// EG_MAP_MOD_REWARDS in endgame-maps.js). Helpers return neutral values
// when no device run is active.

// { xp, quantity, rarity } percent bonuses of the active map (zeros outside runs).
function _egActiveMapRewardBonuses() {
    if (typeof _egGetMapRewardBonuses !== 'function') return { xp: 0, quantity: 0, rarity: 0 };
    return _egGetMapRewardBonuses(_egActiveMapItem);
}

// Multiplier for XP gained from monster kills during the run.
function _egMapXpMult() {
    return 1 + _egActiveMapRewardBonuses().xp / 100;
}

// Multiplier applied to loot/currency/item drop chances.
function _egMapLootQuantityMult() {
    return 1 + _egActiveMapRewardBonuses().quantity / 100;
}

// Weight boost for non-common rarities when items roll their rarity.
function _egMapLootRarityWeightMult() {
    return 1 + _egActiveMapRewardBonuses().rarity / 100;
}


//------------------------------------------------------------------------
//-------------------RUN BASELINE + MOD APPLICATION-----------------------
//------------------------------------------------------------------------

// Expands a size mix { small, medium, large, massive } into an ordered
// queue of bucket names: small puzzles come first, massive ones close out
// the run. If mods raised the required puzzle count above the mix total,
// random buckets top the queue up.
function _egBuildSizeQueue(sizeMix, targetLen) {
    const buckets = ['small', 'medium', 'large', 'massive'];
    const queue = [];
    buckets.forEach(b => {
        for (let i = 0; i < (sizeMix && sizeMix[b] ? sizeMix[b] : 0); i++) queue.push(b);
    });
    while (queue.length < targetLen) {
        queue.push(buckets[Math.floor(Math.random() * buckets.length)]);
    }
    return queue;
}

// Derives the baseline run parameters purely from the map's tier, mirroring
// the progression of the test-map hub (EG_TEST_MAPS). The rolled map mods
// are applied on top by _egApplyModsToBaseline().
function _egRollMapRunBaseline(map) {
    const tier = Math.max(1, map.mapTier || 1);
    const imp = (map && map.implicits) ? map.implicits : null;

    // Size mix: baked implicit on newer maps, otherwise derive from tier.
    const sizeMix = (imp && imp.sizeMix)
        ? imp.sizeMix
        : ((typeof _egRollMapSizeMix === 'function') ? _egRollMapSizeMix(tier, 0) : null);

    const base = {
        monsterLevel: map.monsterLevel || map.itemLevel || 1,
        maxMonsters: 6,
        totalMonsters: Math.min(120, 15 + tier * 8),
        hasBoss: true,
        maxBosses: 1,
        requiredPuzzles: Math.min(12, 3 + Math.floor(tier / 3)),
        requiredQuestions: 0,
        // Device runs pull from BOTH pools: story levels AND freshly
        // generated puzzles (symbols / random structures). When a size
        // mix exists, each chain step consumes the next grid-size bucket.
        puzzlePool: {
            generated: true,          // fallback when no size queue exists
            genMode: 'mixed',         // 'symbol' | 'random' | 'mixed'
            genTier: tier,
            sizeQueue: [],
        },
        egTimeLimit: 900 + tier * 60,
        egMaxMistakes: 10,
    };

    // Newer maps carry pre-computed implicits — use them verbatim so the
    // run matches exactly what the tooltip promised.
    if (imp) {
        if (imp.puzzles != null) base.requiredPuzzles = Math.max(1, Math.min(20, imp.puzzles));
        if (imp.questions != null) base.requiredQuestions = Math.max(0, Math.min(20, imp.questions));
        if (imp.mistakes != null) base.egMaxMistakes = Math.max(3, imp.mistakes);
        if (imp.durationSeconds != null) base.egTimeLimit = Math.max(300, imp.durationSeconds);
    }

    base.puzzlePool.sizeQueue = _egBuildSizeQueue(sizeMix, base.requiredPuzzles);

    return base;
}

// Applies every rolled map modifier to the baseline run parameters.
// Families already baked into the map's implicits (required_puzzles,
// fewer_mistakes, less_time) are skipped for maps that carry implicits.
function _egApplyModsToBaseline(base, map) {
    const mods = Array.isArray(map.mods) ? map.mods : [];
    const hasImplicits = !!(map && map.implicits);

    mods.forEach(mod => {
        const val = (Array.isArray(mod.rolledStats) && mod.rolledStats.length > 0)
            ? (Number(mod.rolledStats[0].value) || 0) : 0;

        switch (mod.familyId) {

            case 'map_extra_monsters':
                base.totalMonsters += val;
                base.maxMonsters = Math.min(12, base.maxMonsters + (val >= 3 ? 2 : 1));
                break;

            case 'map_boss_chance':
                // Roll once at activation: success adds one extra boss.
                if (Math.random() * 100 < val) base.maxBosses = Math.min(2, base.maxBosses + 1);
                break;

            case 'map_required_puzzles':
                if (!hasImplicits) base.requiredPuzzles = Math.min(20, base.requiredPuzzles + val);
                break;

            case 'map_puzzle_cells':
                // Larger grids: floor the eligible pool's cell count.
                base.puzzlePool.minCells = Math.min(
                    80, Math.round(25 * (1 + val / 100)));
                break;

            case 'map_fewer_mistakes':
                // Percentage-based; remaining mistakes are rounded DOWN so
                // the penalty never rounds in the player's favour.
                if (!hasImplicits) {
                    base.egMaxMistakes = Math.max(3, Math.floor(base.egMaxMistakes * (1 - val / 100)));
                }
                break;

            case 'map_less_time':
                if (!hasImplicits) {
                    base.egTimeLimit = Math.max(300, Math.round(base.egTimeLimit * (1 - val / 100)));
                }
                break;

            // map_extra_questions is consumed per-interstitial via
            // _egMapQuestionsPerInterstitial(); monster/player mods are
            // consumed live through their helper functions.
        }
    });

    return base;
}


//------------------------------------------------------------------------
//-------------------SEED PUZZLE SELECTION--------------------------------
//------------------------------------------------------------------------

// Picks a random eligible story puzzle (gi) to seed the run.
// Reuses the test-hub picker when available (same exclusion rules), otherwise
// falls back to building a chain pool directly.
// Picks the seed puzzle (gi) that starts a map run. Reuses the shared
// bucketed picker so the FIRST puzzle of the run already honours the map's
// size mix and the story/generated source mix. Falls back to the test-hub
// picker / plain story pool when the shared picker is unavailable or fails.
function _egPickMapRunSeedGi(baseline) {
    if (typeof _egPickMapRunPuzzleGi === 'function') {
        const gi = _egPickMapRunPuzzleGi(baseline.puzzlePool || {});
        if (gi !== null) return gi;
    }

    if (typeof _egtPickSeedGi === 'function') {
        return _egtPickSeedGi(baseline);
    }
    if (typeof _egBuildChainPool !== 'function') return null;

    let pool = _egBuildChainPool(baseline.puzzlePool || {});
    if (typeof isGatedLevel === 'function') {
        pool = pool.filter(level => !isGatedLevel(level.gIdx));
    }
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)].gIdx;
}

// Strips all stamped run fields off the seed level. Called from
// _egChainCleanup() so the story level returns to its pristine state.
function _egCleanupMapRunSeedLevel() {
    const seedGi = window._egMapRunSeedGi;
    window._egMapRunSeedGi = null;
    _egActiveMapItem = null;

    if (seedGi == null) return;
    const level = (typeof ALL !== 'undefined') ? ALL[seedGi] : null;
    if (!level || level === cur) return;   // don't strip the level about to be retried

    delete level.isMapRunSeed;
    delete level.isMonsterLevel;
    ['monsterLevel', 'maxMonsters', 'totalMonsters', 'hasBoss', 'maxBosses',
     'requiredPuzzles', 'requiredQuestions', 'puzzlePool',
     'egTimeLimit', 'egMaxMistakes'].forEach(key => delete level[key]);
}


//------------------------------------------------------------------------
//-------------------LAUNCH------------------------------------------------
//------------------------------------------------------------------------

// Activates the given map from the device slot:
//   1. Builds baseline params from its tier and applies its mods
//   2. Consumes the map from the slot
//   3. Stamps everything onto a random seed puzzle and starts it
function _egLaunchMapFromDevice(mapItem) {
    if (!mapItem || typeof startLevel !== 'function') return;

    const baseline = _egApplyModsToBaseline(_egRollMapRunBaseline(mapItem), mapItem);

    const gi = _egPickMapRunSeedGi(baseline);
    if (gi === null) {
        showToast((typeof t === 'function') ? t('egt_no_puzzles').replace('{name}', mapItem.name)
                                            : `No puzzles available for ${mapItem.name}`);
        return;
    }

    // Consume the map BEFORE launching so a mid-run save can't duplicate it.
    _egActiveMapItem = mapItem;
    _egMapSlotItem = null;
    if (typeof egSaveHubState === 'function') egSaveHubState();
    if (typeof _egRenderMapSlot === 'function') _egRenderMapSlot();

    const level = ALL[gi];
    level.isMonsterLevel = true;
    level.isMapRunSeed = true;
    window._egMapRunSeedGi = gi;

    level.monsterLevel = baseline.monsterLevel;
    level.maxMonsters = baseline.maxMonsters;
    level.totalMonsters = baseline.totalMonsters;
    level.hasBoss = baseline.hasBoss;
    if (baseline.maxBosses > 1) level.maxBosses = baseline.maxBosses;
    level.requiredPuzzles = baseline.requiredPuzzles;
    if (baseline.requiredQuestions > 0) level.requiredQuestions = baseline.requiredQuestions;
    if (Object.keys(baseline.puzzlePool).length > 0) level.puzzlePool = baseline.puzzlePool;
    level.egTimeLimit = baseline.egTimeLimit;
    level.egMaxMistakes = baseline.egMaxMistakes;

    // Tells goToLevelSelect() (screens.js) to route back to the Probability
    // Gate instead of the normal world/level-select screen when the run ends.
    window._egIsMapDeviceRun = true;

    // Bind the endgame lose-overlay UI (no Retry — only "Return to the Nexus")
    // up front so every defeat path inside the map is covered.
    if (typeof _egEnsureLoseOverlayEndgameUI === 'function') _egEnsureLoseOverlayEndgameUI();

    showToast((typeof t === 'function') ? t('eg_map_activating').replace('{n}', mapItem.name)
                                        : `Activating ${mapItem.name}...`);

    startLevel(gi);
}
