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

// Hard on-screen enemy cap for tier 1 maps — keeps early runs readable
// for new players regardless of rolled +monster modifiers.
const EG_TIER1_MAX_MONSTERS = 3;

// Per-tier steps added to the on-screen enemy cap below tier 5:
// tier 1 = 3, tier 2 = 3, tier 3 = 4, tier 4 = 5, tier 5+ = 6.
const EG_LOW_TIER_MONSTER_STEPS = [0, 0, 1, 2];

// Percent chance that a tier 2+ device map rolls a boss at all. Bosses are
// optional from tier 2 onwards — never guaranteed, never on tier 1.
const EG_MAP_BASE_BOSS_CHANCE = 50;

// Total non-boss kills required per tier — early tiers stay short so new
// players can clear quickly. Caps: T1 ≤15, T2 ≤20.
const EG_TIER1_MAX_TOTAL_MONSTERS = 15;
const EG_TIER2_MAX_TOTAL_MONSTERS = 20;

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

// Blood Magic: class abilities pay their cost from the life pool instead of
// mana while a map with this mod is active.
function _egMapHasBloodMagic() {
    return _egHasActiveMapMod('map_blood_magic');
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

// "Elemental Weakness — #% reduced all Resistances" → multiplier below 1.
function _egMapResistMult() {
    const v = _egGetActiveMapModValue('map_elem_weakness');
    return v > 0 ? Math.max(0.25, 1 - v / 100) : 1;
}

// "Vulnerability — you take #% increased Damage" → amplifier above 1.
function _egMapDamageTakenAmpMult() {
    const v = _egGetActiveMapModValue('map_vulnerability');
    return v > 0 ? 1 + v / 100 : 1;
}

// "#% less Life gained from Kills" → multiplier below 1.
function _egMapKillRecoveryMult() {
    const v = _egGetActiveMapModValue('map_reduced_recovery');
    return v > 0 ? Math.max(0.05, 1 - v / 100) : 1;
}

// "#% reduced Evasion" → multiplier below 1.
function _egMapEvasionMult() {
    const v = _egGetActiveMapModValue('map_reduced_evasion');
    return v > 0 ? Math.max(0.1, 1 - v / 100) : 1;
}

// "#% reduced maximum Absorption" → multiplier below 1.
function _egMapAbsorptionMult() {
    const v = _egGetActiveMapModValue('map_reduced_absorption');
    return v > 0 ? Math.max(0.1, 1 - v / 100) : 1;
}

// "#% reduced Block Chance" → multiplier below 1.
function _egMapBlockMult() {
    const v = _egGetActiveMapModValue('map_reduced_block');
    return v > 0 ? Math.max(0.1, 1 - v / 100) : 1;
}

// "Temporal Chains — you act #% slower" → attack-interval stretch above 1.
function _egMapActionSlowMult() {
    const v = _egGetActiveMapModValue('map_temporal_chains');
    return v > 0 ? 1 + v / 100 : 1;
}

// Monster crit mod: rolls per monster hit; returns a damage multiplier
// (2 on a crit roll, otherwise 1).
function _egRollMonsterCritMult(monster) {
    if (!monster || !(monster.critChancePct > 0)) return 1;
    return (Math.random() * 100 < monster.critChancePct) ? 2 : 1;
}

// Quiz penalty: an incorrectly answered interstitial question burns a share
// of maximum Life. Called from quiz.js (_resolveQuizAnswer) during map runs.
function _egOnQuizWrongAnswer() {
    if (!_egIsActive()) return;
    const v = _egGetActiveMapModValue('map_quiz_damage');
    if (!(v > 0)) return;
    const maxHP = (typeof playerMaxHP !== 'undefined' && playerMaxHP > 0) ? playerMaxHP : 100;
    const dealt = _egPlayerTakeDamage(Math.max(1, Math.round(maxHP * v / 100)), true);
    showToast(`❌ ${(typeof t === 'function' ? t('eg_mm_toast_quiz_wrong') : 'Incorrect Answer!')} (-${dealt})`);
}

// "#% reduced Accuracy" → multiplier below 1.
function _egMapAccuracyMult() {
    const v = _egGetActiveMapModValue('map_reduced_accuracy');
    return v > 0 ? Math.max(0.1, 1 - v / 100) : 1;
}

// "#% less Attack Speed" → multiplier below 1.
function _egMapAttackSpeedMult() {
    const v = _egGetActiveMapModValue('map_reduced_attack_speed');
    return v > 0 ? Math.max(0.2, 1 - v / 100) : 1;
}

// Called after a monster successfully hits the player. Applies the per-hit
// escalation mods: snowball damage growth and Map-time leech.
function _egApplyMonsterHitMods(monster) {
    if (!monster || !_egActiveMapItem) return;

    // Snowball: monsters gain #% damage each time they hit you (capped at
    // triple their post-mod base so long fights stay winnable).
    const snowPct = monster.snowballPct || 0;
    if (snowPct > 0 && monster.damageValue > 0) {
        if (monster.snowballBaseDamage == null) monster.snowballBaseDamage = monster.damageValue;
        const grown = Math.round(monster.damageValue * (1 + snowPct / 100));
        monster.damageValue = Math.min(
            Math.round(monster.snowballBaseDamage * 3), grown);
        if (monster.bossBaseDamage != null) {
            monster.bossBaseDamage = Math.min(
                Math.round(monster.snowballBaseDamage * 3),
                Math.round(monster.bossBaseDamage * (1 + snowPct / 100)));
        }
    }

    // Time leech: drain seconds from the global level timer.
    const leechS = _egGetActiveMapModValue('map_time_leech');
    if (leechS > 0 && typeof timerSecs !== 'undefined') {
        timerSecs = Math.max(0, timerSecs - leechS);
        showToast(`⏳ -${leechS}s ${t('eg_mm_toast_time_leech') || ''}`.trim());
    }
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

    // Bosses-only extra life pool.
    const bossLifePct = _egGetActiveMapModValue('map_boss_life');
    if (bossLifePct > 0 && monster.isBoss && monster.maxHP > 0) {
        const maxHP = Math.round(monster.maxHP * (1 + bossLifePct / 100));
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

    // PoE-style behaviour mods — read live by the encounter/ailment systems.
    const critPct = _egGetActiveMapModValue('map_monster_crit');
    if (critPct > 0) monster.critChancePct = critPct;

    const avoidPct = _egGetActiveMapModValue('map_monster_avoid_ailments');
    if (avoidPct > 0) monster.avoidAilmentPct = avoidPct;

    const regenPct = _egGetActiveMapModValue('map_monster_regen');
    if (regenPct > 0) {
        monster.regenPctMaxLife = regenPct;
        monster.regenAcc = 0;
    }

    const explodePct = _egGetActiveMapModValue('map_monster_explosions');
    if (explodePct > 0) monster.explodeOnDeathPct = explodePct;

    // Ambush: monsters spawn with part of their attack bar pre-charged.
    const ambushPct = _egGetActiveMapModValue('map_monster_ambush');
    if (ambushPct > 0 && monster.chargeMax > 0) {
        monster.currentCharge = Math.min(
            monster.chargeMax - 1,
            Math.round(monster.chargeMax * Math.min(95, ambushPct + 5) / 100));
    }

    // PoE-style escalation mods — read live by the encounter systems.
    const etherealPct = _egGetActiveMapModValue('map_monster_ethereal');
    if (etherealPct > 0) monster.etherealPct = etherealPct;

    const snowPct = _egGetActiveMapModValue('map_monster_snowball');
    if (snowPct > 0) {
        monster.snowballPct = snowPct;
        monster.snowballBaseDamage = monster.damageValue;
    }

    const secondWindPct = _egGetActiveMapModValue('map_monster_second_wind');
    if (secondWindPct > 0 && !monster.isBoss) monster.secondWindPct = secondWindPct;

    const desperationPct = _egGetActiveMapModValue('map_monster_desperation');
    if (desperationPct > 0) monster.desperationPct = desperationPct;

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
        // Beginner-friendly on-screen enemy cap: 3 at tier 1, ramping up
        // to the full cap of 6 from tier 5 onwards. Tier 1 stays hard-capped
        // even when +monster mods are rolled.
        maxMonsters: Math.min(6, EG_TIER1_MAX_MONSTERS +
            (EG_LOW_TIER_MONSTER_STEPS[Math.min(tier - 1, EG_LOW_TIER_MONSTER_STEPS.length - 1)] || 0)),
        totalMonsters: tier === 1 ? EG_TIER1_MAX_TOTAL_MONSTERS
            : tier === 2 ? EG_TIER2_MAX_TOTAL_MONSTERS
            : Math.min(120, 15 + tier * 8),
        // Bosses are too much for tier 1 beginners. From tier 2 onwards a
        // boss MAY appear (chance-based roll), but is never guaranteed.
        hasBoss: tier >= 2 && Math.random() * 100 < EG_MAP_BASE_BOSS_CHANCE,
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
    // run matches exactly what the tooltip promised (including boss status).
    if (imp) {
        if (imp.puzzles != null) base.requiredPuzzles = Math.max(1, Math.min(20, imp.puzzles));
        if (imp.questions != null) base.requiredQuestions = Math.max(0, Math.min(20, imp.questions));
        if (imp.mistakes != null) base.egMaxMistakes = Math.max(3, imp.mistakes);
        if (imp.durationSeconds != null) base.egTimeLimit = Math.max(300, imp.durationSeconds);
        if (imp.hasBoss != null) base.hasBoss = !!imp.hasBoss;
        if (imp.maxBosses != null) base.maxBosses = Math.max(0, Math.min(2, imp.maxBosses));
        // Ensure consistency: if hasBoss is false, maxBosses must be 0.
        if (!base.hasBoss) base.maxBosses = 0;
        else if (base.maxBosses < 1) base.maxBosses = 1;
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
    const imp = (map && map.implicits) ? map.implicits : null;
    const tier = Math.max(1, (map && map.mapTier) || 1);

    mods.forEach(mod => {
        const val = (Array.isArray(mod.rolledStats) && mod.rolledStats.length > 0)
            ? (Number(mod.rolledStats[0].value) || 0) : 0;

        switch (mod.familyId) {

            case 'map_extra_monsters':
                base.totalMonsters += val;
                // Keep early tiers short even with +monster mods.
                if (tier === 1) base.totalMonsters = Math.min(EG_TIER1_MAX_TOTAL_MONSTERS, base.totalMonsters);
                else if (tier === 2) base.totalMonsters = Math.min(EG_TIER2_MAX_TOTAL_MONSTERS, base.totalMonsters);
                base.maxMonsters = Math.min(12, base.maxMonsters + (val >= 3 ? 2 : 1));
                if (tier <= 1) base.maxMonsters = EG_TIER1_MAX_MONSTERS;
                break;

            case 'map_boss_chance':
                // For maps with baked implicits the boss chance is already
                // resolved during generation ( _egRollMapBossStatus ); skip the
                // live roll so the run matches the tooltip.
                if (hasImplicits && imp && imp.hasBoss != null) break;
                // Roll once at activation: success guarantees a boss (bosses
                // are chance-based from tier 2) and may add one extra.
                if (Math.random() * 100 < val) {
                    base.hasBoss = true;
                    base.maxBosses = Math.min(2, base.maxBosses + 1);
                }
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
    // Launch guard: _egChainCleanup also fires from _egStopEncounter during
    // the launch's own startLevel() call (_cleanupPreviousLevel). Wiping the
    // runtime state there would kill ALL live map mods (hazards, monster
    // buffs, player penalties, rewards) before the first encounter begins.
    if (window._egMapDeviceLaunching) return;

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

    // Gear: warding — its once-per-map killing-blow save refreshes at the
    // start of every device-map run.
    _egWardingUsedThisMap = false;

    // Bind the endgame lose-overlay UI (no Retry — only "Return to the Nexus")
    // up front so every defeat path inside the map is covered.
    if (typeof _egEnsureLoseOverlayEndgameUI === 'function') _egEnsureLoseOverlayEndgameUI();

    // Guard flag: startLevel() synchronously runs _cleanupPreviousLevel →
    // _egStopEncounter → _egChainCleanup, which must NOT clear the runtime
    // mod state during this very launch (see _egCleanupMapRunSeedLevel).
    window._egMapDeviceLaunching = true;
    try {
        showToast((typeof t === 'function') ? t('eg_map_activating').replace('{n}', mapItem.name)
                                            : `Activating ${mapItem.name}...`);

        startLevel(gi);
    } finally {
        window._egMapDeviceLaunching = false;
    }
}
