//------------------------------------------------------------------------
//-------------------ENDGAME CHARACTER LEVELING---------------------------
//------------------------------------------------------------------------
// Experience & progression system shared by the CAMPAIGN and the endgame:
//   - XP is earned from the very first story level: completing a level
//     grants a one-time XP bonus (replays grant a reduced amount) and every
//     monster killed grants kill XP.
//   - Monster XP is scaled by the monster's level and by a Path-of-Exile
//     multiplier: full XP only while the monster is within a safe level
//     range of the character; beyond that range (too high OR too low) XP
//     falls off exponentially - so re-farming old content gives little.
//   - The campaign carries the character from level 1 to ~level 68 (the
//     atlas entry level); a one-time sweep of the atlas then reaches ~94
//     and 94→100 is the dedicated late grind - see EG_LEVELING_CONFIG and
//     tools/xp-curve-tune.py.
//   - Each level grants passivePointsPerLevel (1) passive tree point. Raw
//     attribute points are no longer granted per level; the character's
//     +stats now come from the passive tree (not wired into combat yet).
//   - The legacy attribute window (✦ button) remains for backwards-
//     compatible saves and refunds; a refund is still verified against the
//     live equipment loadout first.
//
// Wiring notes:
//   - _egSyncBaseAttributes() keeps EG_PLAYER_BASE_ATTRIBUTES
//     (endgame-requirements.js) in sync with STATE.playerLevel and the
//     allocated attribute points. That single sync automatically enables
//     item LEVEL requirements everywhere (equip gate, tooltips) and feeds
//     allocated points into _egComputePlayerStats() side-effects
//     (Str -> life/armour, Agi -> accuracy/evasion, Int -> mana/spell dmg).
//   - Kill integration lives in _egKillMonster() (endgame-encounter.js),
//     which calls _egGrantMonsterXP(monsterLevel, isBoss).
//
// Dependencies (must be loaded before this file):
//   js/state.js             - STATE, save()
//   endgame-player-stats.js  - _egGetAllEquippedItems()
//   endgame-requirements.js - EG_PLAYER_BASE_ATTRIBUTES,
//                             _egSumAttributeBonuses(),
//                             _egFindUnmetRequirements(),
//                             _egGetUnmetRequirementsText()
//
// Entry points:
//   _egGrantMonsterXP(mLevel, isBoss)      → called on every monster kill
//   _egGetPlayerLevel() / _egGetPlayerXP() → current progression
//   _egGetXpForNextLevel(level)            → XP needed to leave `level`
//   _egCalcXpMultiplier(playerLvl, mLvl)   → PoE-style range multiplier
//   _egAllocateAttribute('str'|'agi'|'int')→ spend one point
//   _egRefundAttribute('str'|'agi'|'int')  → verify & refund one point
//   _egCanRefundAttribute(attr)            → refund legality check
//   _egOpenAttributeWindow()               → open the attribute window
//   _egRenderLevelHUD()                    → refresh badge + inline chip
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONSTANTS--------------------------------------------
//------------------------------------------------------------------------

const EG_LEVELING_CONFIG = {
    startLevel: 1,
    maxLevel: 100,

    // XP curve: xpToLeave(level) = xpBase * level^xpExp + xpLinear * level
    // for the CAMPAIGN segment (level < campaignEndLevel), multiplied by the
    // endgame segment beyond it. The campaign hands out XP from level 1 and
    // is tuned (tools/xp-curve-tune.py) so a clean playthrough of all 184 story
    // levels + their monsters ends around campaignEndLevel (68) - Tier 1
    // maps are then tuned around monster level ~68 instead of level 3, so
    // the atlas is a genuine next step, PoE-style (T1 = 68 → T16 = 90).
    // Campaign pacing does not depend on the curve's shape: level-completion
    // XP is a FRACTION of xpToNextLevel(expectedLevel) - see
    // EG_LEVELING_CONFIG.campaignFirstClearFraction.
    xpBase: 158,
    xpExp: 1.72,
    xpLinear: 197,

    // Early-game catch-up discount: below earlyXpDiscountLevels the XP
    // requirement is scaled down, fading linearly to zero so the curve
    // joins the base formula exactly at that level. Keeps the four T1 maps
    // (≈7k modded XP) a fast but not trivial 1→5.
    earlyXpDiscountLevels: 6,
    earlyXpDiscountFactor: 0.29,

    // Base XP per kill: xpPerKillBase + xpPerKillGrowth * mLevel^xpPerKillExp.
    // Reduced from 15+11.3×m^1.65 to absorb the NEW kill economy: monsters
    // keep spawning until the boss arena is entered, so a typical map now
    // yields ≈+40% more kills than its kill objective (players lingering for
    // loot, kills flowing while the last puzzles are being solved). Per-kill
    // XP scaled ×~0.72 (base 15→12, growth 11.3→8.5) so the sweep ladder is
    // preserved: modded T16 map ≈ 4.3M XP (168 kills × +77% mods), and the
    // sweep still lands T16→95 with ±1-level checkpoint fidelity.
    xpPerKillBase: 12,
    xpPerKillGrowth: 8.5,
    xpPerKillExp: 1.65,
    bossXpMultiplier: 3.5,

    // Endgame requirement segment: from campaignEndLevel up the requirement
    // is multiplied by 1 + xpEndgameScale * t^xpEndgamePower, where
    //   t = (level - campaignEndLevel + 1) / (maxLevel - campaignEndLevel + 1).
    // The atlas now spans monster levels ~68-90 (EG_MAP_TIER_MONSTER_LEVELS),
    // so one character level inside the atlas costs far more raw XP than it
    // did when T1 monsters were level 3. Tuned (tools/xp-curve-tune.py) so that:
    //   • entering the atlas at 68, a T1 map (≈15 kills) ≈ 2-3 maps per level
    //   • T16 (mLvl 90) ≈ 1-2 modded maps per level
    //   • one full sweep of all 86 atlas regions ends ≈ level 94, leaving
    //     94→100 as the dedicated late grind.
    campaignEndLevel: 68,
    xpEndgameScale: 90,
    xpEndgamePower: 3,

    // PoE-style safe range: monsters up to
    //   (safeRangeBelowBase + floor(playerLevel / safeRangeBelowLevelsPer))
    // levels BELOW the character give full XP; monsters up to
    // safeRangeAbove levels above do too (softened 3→5 toward PoE's
    // "full XP from anything above you", so white-only players who fall
    // behind the tier ladder can still catch up on repeat farms). Outside
    // the band the multiplier decays as ratio^penaltyExponent (never below
    // minMultiplier), which still blocks tier-skipping hard (a level-20
    // character in a T16 map earns 0.01×).
    // Narrowed below vs PoE's 3+floor(lvl/16) and steepened 6→8 so farming
    // content 20 levels below you at 91 pays ~0.28× instead of 0.41×,
    // pushing players into T16 for efficient late XP (T16 at mLvl 90
    // stays ~full-XP through the late 90s, still optimal at 99 ≈ 0.92×).
    safeRangeBelowBase: 2,
    safeRangeBelowLevelsPer: 16,
    safeRangeAbove: 5,
    penaltyExponent: 8,
    minMultiplier: 0.01,

    // XP-tier hint shown in the attribute window: monsters whose multiplier
    // is still >= hintPoorMultiplier count as "Average XP", anything weaker
    // counts as "Poor XP".
    hintPoorMultiplier: 0.25,

    // Regular level-ups no longer hand out spendable attributes - each
    // level now grants a passive tree point instead and the character's
    // +stats come from the passive tree (not wired into combat yet).
    attrPointsPerLevel: 0,
    passivePointsPerLevel: 1,

    // Campaign completion XP (levels 1..campaignEndLevel): a first clear
    // grants campaignFirstClearFraction of the XP needed for the level's
    // EXPECTED character level, and a replay grants campaignReplayFraction
    // of that. Both are additionally scaled by the PoE-style range
    // multiplier against the expected level, so farming old content gives
    // almost nothing. Monster kills (see _egGrantMonsterXP) make up the
    // rest of the budget.
    campaignFirstClearFraction: 0.22,
    campaignReplayFraction: 0.35,
};

// Pristine copy of the base attribute pool from endgame-requirements.js,
// captured before this file mutates the object with allocated points.
const _EG_ATTR_ORIGINAL_BASE = {
    str: EG_PLAYER_BASE_ATTRIBUTES.str,
    agi: EG_PLAYER_BASE_ATTRIBUTES.agi,
    int: EG_PLAYER_BASE_ATTRIBUTES.int,
};

const EG_LEVELING_ATTRS = [
    { key: 'str', icon: '💪', nameKey: 'eg_stat_strength' },
    { key: 'agi', icon: '🏃', nameKey: 'eg_stat_agility' },
    { key: 'int', icon: '🧠', nameKey: 'eg_stat_intelligence' },
];


//------------------------------------------------------------------------
//-------------------PROGRESSION STATE------------------------------------
//------------------------------------------------------------------------

function _egGetPlayerLevel() {
    return (typeof STATE !== 'undefined' && STATE && STATE.playerLevel) || EG_LEVELING_CONFIG.startLevel;
}

function _egGetPlayerXP() {
    return (typeof STATE !== 'undefined' && STATE && STATE.playerXP) || 0;
}

function _egGetUnspentPoints() {
    return (typeof STATE !== 'undefined' && STATE && STATE.egAttrPoints) || 0;
}

function _egGetAllocatedAttributes() {
    if (typeof STATE === 'undefined' || !STATE || !STATE.egAttrAllocated) {
        return { str: 0, agi: 0, int: 0 };
    }
    return STATE.egAttrAllocated;
}

// XP required to advance FROM `level` to `level + 1`.
function _egGetXpForNextLevel(level) {
    const c = EG_LEVELING_CONFIG;
    let xp = c.xpBase * Math.pow(level, c.xpExp) + c.xpLinear * level;
    if (level <= c.earlyXpDiscountLevels) {
        // Discount fades linearly: full factor at level 1, none at
        // earlyXpDiscountLevels, so the curve stays continuous.
        const fade = (level - 1) / c.earlyXpDiscountLevels;
        xp *= 1 - c.earlyXpDiscountFactor * (1 - fade);
    }
    // Endgame segment: steepen from campaignEndLevel up so the atlas
    // (monster levels ~68-90) costs a real number of maps per level and the
    // final levels become the dedicated grind wall.
    if (c.campaignEndLevel != null && level >= c.campaignEndLevel) {
        const span = Math.max(1, c.maxLevel - c.campaignEndLevel + 1);
        const t = (level - c.campaignEndLevel + 1) / span;
        const p = (c.xpEndgamePower != null) ? c.xpEndgamePower : 3;
        xp *= 1 + (c.xpEndgameScale || 0) * Math.pow(t, p);
    }
    return Math.floor(xp);
}

// Pushes the live player level / allocated attributes into the shared base
// attributes object so requirement checks and stats aggregation pick them up.
function _egSyncBaseAttributes() {
    if (!EG_PLAYER_BASE_ATTRIBUTES) return;
    const alloc = _egGetAllocatedAttributes();
    EG_PLAYER_BASE_ATTRIBUTES.level = _egGetPlayerLevel();
    EG_PLAYER_BASE_ATTRIBUTES.str = _EG_ATTR_ORIGINAL_BASE.str + (alloc.str || 0);
    EG_PLAYER_BASE_ATTRIBUTES.agi = _EG_ATTR_ORIGINAL_BASE.agi + (alloc.agi || 0);
    EG_PLAYER_BASE_ATTRIBUTES.int = _EG_ATTR_ORIGINAL_BASE.int + (alloc.int || 0);
}


//------------------------------------------------------------------------
//-------------------XP GAIN----------------------------------------------
//------------------------------------------------------------------------

// Path-of-Exile-style experience multiplier based on the gap between the
// character's level and the monster's level:
//   - Monster inside the safe band → 100% XP.
//   - Monster too far BELOW → ((mLvl + 5) / (safeEdge + 5))^6 (PoE formula).
//   - Monster too far ABOVE → mirrored decay against its overhang edge.
// Returns a value clamped to [minMultiplier, 1].
function _egCalcXpMultiplier(playerLevel, monsterLevel) {
    const c = EG_LEVELING_CONFIG;
    const lowSafe = c.safeRangeBelowBase + Math.floor(playerLevel / c.safeRangeBelowLevelsPer);
    const highSafe = c.safeRangeAbove;

    if (monsterLevel <= playerLevel + highSafe && monsterLevel >= playerLevel - lowSafe) {
        return 1;
    }

    let mult;
    if (monsterLevel < playerLevel - lowSafe) {
        const ref = Math.max(0, playerLevel - lowSafe);
        mult = Math.pow((monsterLevel + 5) / (ref + 5), c.penaltyExponent);
    } else {
        const ref = monsterLevel - highSafe;
        mult = Math.pow((playerLevel + 5) / (ref + 5), c.penaltyExponent);
    }
    return Math.max(c.minMultiplier, Math.min(1, mult));
}

// Inverts the XP multiplier curve around hintPoorMultiplier to split monster
// levels into "optimal" (100% band), "average" (>= hintPoorMultiplier) and
// "poor" (below it) ranges for the attribute-window hint.
function _egGetXpTierRanges(playerLevel) {
    const c = EG_LEVELING_CONFIG;
    if (playerLevel >= c.maxLevel) return null;

    const lowSafe = c.safeRangeBelowBase + Math.floor(playerLevel / c.safeRangeBelowLevelsPer);
    const highSafe = c.safeRangeAbove;
    const r = Math.pow(c.hintPoorMultiplier, 1 / c.penaltyExponent);
    const refBelow = Math.max(0, playerLevel - lowSafe);

    // Lowest monster level below the band still yielding >= hintPoorMultiplier.
    const avgBelowMin = Math.max(1, Math.ceil(r * (refBelow + 5) - 5));
    // Highest monster level above the band still yielding >= hintPoorMultiplier.
    const avgAboveMax = Math.min(c.maxLevel,
        Math.floor(highSafe - 5 + (playerLevel + 5) / r));

    return {
        optimalMin: Math.max(1, playerLevel - lowSafe),
        optimalMax: Math.min(c.maxLevel, playerLevel + highSafe),
        belowPoorMax: avgBelowMin - 1,
        belowAvgMin: avgBelowMin,
        aboveAvgMax: avgAboveMax,
    };
}

// Builds the "which monster levels give which XP" rows for the window body.
// Returns '' at max level (no more XP to earn).
function _egBuildXpTiersHTML() {
    const c = EG_LEVELING_CONFIG;
    const r = _egGetXpTierRanges(_egGetPlayerLevel());
    if (!r) return '';

    const fmtRange = (a, b) => t('eg_lvl_range').replace('{a}', a).replace('{b}', b);

    const rows = [`<div class="eg-xp-tier"><span class="eg-xp-tier-label opt">${t('eg_lvl_tier_optimal')}</span><span>${fmtRange(r.optimalMin, r.optimalMax)}</span></div>`];

    const avgParts = [];
    if (r.belowAvgMin <= r.optimalMin - 1) avgParts.push(fmtRange(r.belowAvgMin, r.optimalMin - 1));
    if (r.aboveAvgMax >= r.optimalMax + 1) avgParts.push(fmtRange(r.optimalMax + 1, r.aboveAvgMax));
    if (avgParts.length) {
        rows.push(`<div class="eg-xp-tier"><span class="eg-xp-tier-label avg">${t('eg_lvl_tier_average')}</span><span>${avgParts.join(' · ')}</span></div>`);
    }

    const poorParts = [];
    if (r.belowPoorMax >= 1) poorParts.push(t('eg_lvl_range_below').replace('{n}', r.belowPoorMax));
    if (r.aboveAvgMax < c.maxLevel && r.optimalMax < c.maxLevel) poorParts.push(t('eg_lvl_range_above').replace('{n}', r.aboveAvgMax + 1));
    if (poorParts.length) {
        rows.push(`<div class="eg-xp-tier"><span class="eg-xp-tier-label poor">${t('eg_lvl_tier_poor')}</span><span>${poorParts.join(' · ')}</span></div>`);
    }

    return rows.join('');
}

// Grants a raw amount of character XP and resolves every level-up it
// triggers. Each gained level now awards passivePointsPerLevel passive tree
// points (attributes come from the passive tree, not from level-ups), plus
// the classic full life/mana/shield refill and level-up effect. Returns the
// number of levels gained. All XP sources (monster kills and campaign level
// completions) funnel through here so progression stays consistent.
function _egAwardXP(xpGain) {
    if (typeof STATE === 'undefined' || !STATE) return 0;
    const c = EG_LEVELING_CONFIG;

    if (_egGetPlayerLevel() >= c.maxLevel) {
        // Level cap reached - no more XP accumulates.
        if (STATE.playerXP !== 0) { STATE.playerXP = 0; egSaveLevelingState(); }
        return 0;
    }

    const gain = Math.max(0, Math.round(Number(xpGain) || 0));
    if (gain <= 0) return 0;
    STATE.playerXP = _egGetPlayerXP() + gain;

    let levelsGained = 0;
    let passiveGained = 0;
    while (_egGetPlayerLevel() < c.maxLevel
        && STATE.playerXP >= _egGetXpForNextLevel(_egGetPlayerLevel())) {
        STATE.playerXP -= _egGetXpForNextLevel(_egGetPlayerLevel());
        STATE.playerLevel++;
        levelsGained++;
        // Legacy: attribute points per level are disabled (0) now, but the
        // field is still honoured if a future pass re-enables it.
        if (c.attrPointsPerLevel) STATE.egAttrPoints = (STATE.egAttrPoints || 0) + c.attrPointsPerLevel;
        passiveGained += (c.passivePointsPerLevel || 0);
    }
    if (_egGetPlayerLevel() >= c.maxLevel) STATE.playerXP = 0;

    if (passiveGained > 0) {
        STATE.passiveTreePoints = (STATE.passiveTreePoints || 0) + passiveGained;
        if (typeof _incDirect === 'function') try { _incDirect('lifetimePassivePointsObtained', passiveGained); } catch (e) {}
    }

    _egSyncBaseAttributes();
    egSaveLevelingState();
    _egRenderLevelHUD();
    if (typeof setAchStat === 'function') try { setAchStat('egPlayerLevel', _egGetPlayerLevel()); } catch(e){}

    if (levelsGained > 0) {
        // Reset all active ability cooldowns on level up
        if (typeof resetActiveCooldown === 'function') {
            resetActiveCooldown();
        }

        // Level-up bonus: +5 max Life and +2 max Mana per level gained,
        // with the newly granted amounts restored to the current pools.
        if (typeof playerMaxHP !== 'undefined' && typeof playerCurrentHP !== 'undefined') {
            const lifeMult = (typeof _egMapPlayerLifeMult === 'function')
                ? _egMapPlayerLifeMult() : 1;
            const lifeGain = Math.round(levelsGained * 5 * lifeMult);
            playerMaxHP = Math.max(1, playerMaxHP + lifeGain);
            playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + lifeGain);
        }
        if (typeof gainMana === 'function'
            && typeof playerMaxMana !== 'undefined' && playerMaxMana > 0) {
            gainMana(levelsGained * 2);
        }

        _egPlayLevelUpEffect(_egGetPlayerLevel());
        _egPlayLevelUpReward();
        // Absorption shield: fully replenish even when not in an active encounter
        // (_egPlayLevelUpReward already handles the active case and early-returns otherwise).
        if ((typeof _egIsActive !== 'function' || !_egIsActive())
            && typeof _egComputePlayerStats === 'function'
            && typeof _egPlayerAbsorptionCurrent !== 'undefined') {
            _egPlayerAbsorptionCurrent = _egComputePlayerStats().absorption || 0;
            if (typeof _egCancelAbsorptionRegen === 'function') _egCancelAbsorptionRegen();
        }
        if (typeof showToast === 'function') {
            showToast(t('eg_lvl_levelup_toast').replace('{n}', _egGetPlayerLevel()), '#f5b642');
        }
        if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
        if (typeof _egRenderInventory === 'function') try { _egRenderInventory(); } catch (e) {}
        if (typeof _egRenderEquipSlots === 'function') try { _egRenderEquipSlots(); } catch (e) {}
    }
    return levelsGained;
}

// Awards XP for killing one monster of `monsterLevel`: the kill value is
// scaled by the PoE-style range multiplier against the character level and
// by the active map's "% more Experience" bonus (neutral outside runs),
// then handed to _egAwardXP.
function _egGrantMonsterXP(monsterLevel, isBoss) {
    if (typeof STATE === 'undefined' || !STATE) return;
    if (_egGetPlayerLevel() >= EG_LEVELING_CONFIG.maxLevel) {
        if (STATE.playerXP !== 0) { STATE.playerXP = 0; egSaveLevelingState(); }
        return;
    }

    const playerLevel = _egGetPlayerLevel();
    const mLvl = Math.max(1, Number(monsterLevel) || 1);
    const c = EG_LEVELING_CONFIG;
    let xp = c.xpPerKillBase + c.xpPerKillGrowth * Math.pow(mLvl, c.xpPerKillExp);
    if (isBoss) xp *= c.bossXpMultiplier;
    const mapXpMult = (typeof _egMapXpMult === 'function') ? _egMapXpMult() : 1;
    xp = Math.max(1, Math.round(xp * _egCalcXpMultiplier(playerLevel, mLvl) * mapXpMult));

    _egAwardXP(xp);
}


//------------------------------------------------------------------------
//-------------------CAMPAIGN PROGRESSION---------------------------------
//------------------------------------------------------------------------
// The campaign awards XP from the very first level, so the player arrives
// at the atlas around campaignEndLevel instead of level 1:
//   • Completing a story level grants a FRACTION of the XP required for
//     that level's expected character level - a first clear grants
//     campaignFirstClearFraction, a replay campaignReplayFraction of that.
//   • Monsters spawning in every campaign level grant kill XP through the
//     normal _egGrantMonsterXP path; their level tracks the expected level
//     so the PoE range multiplier stays ~1 during normal play.
// Both are scaled by _egCalcXpMultiplier(), so re-farming content far below
// the character's level gives almost nothing (anti-farm, PoE-style).

let _egCampaignLevelCountCache = null;

// Number of story levels in the campaign (excludes monster/endgame levels).
function _egCampaignTotalLevels() {
    if (_egCampaignLevelCountCache != null) return _egCampaignLevelCountCache;
    let n = 0;
    if (typeof ALL !== 'undefined' && ALL) {
        for (const lvl of ALL) {
            if (lvl && !lvl.isMonsterLevel && !lvl.isEndgameSandbox) n++;
        }
    }
    _egCampaignLevelCountCache = n;
    return n;
}

// Character level a player is expected to be at when completing story level
// `gi`, spread linearly from 1 to campaignEndLevel across the campaign.
// Drives both level-completion XP and campaign monster levels.
function _egCampaignExpectedLevel(gi) {
    const n = _egCampaignTotalLevels();
    if (n <= 1) return 1;
    const end = EG_LEVELING_CONFIG.campaignEndLevel || 68;
    const idx = Math.max(0, Math.min(n - 1, Number(gi) || 0));
    return 1 + (end - 1) * idx / (n - 1);
}

// Monster level for campaign monsters on story level `gi`.
function _egCampaignMonsterLevel(gi) {
    return Math.max(1, Math.round(_egCampaignExpectedLevel(gi)));
}

// Awards level-completion XP for story level `gi`. Called from checkWin()
// on every campaign clear (first clear and replay alike). No-ops during
// endgame map/chain runs.
function _egGrantCampaignLevelXP(gi, isFirstClear) {
    if (typeof STATE === 'undefined' || !STATE) return 0;
    if (typeof cur === 'undefined' || !cur) return 0;
    // Never award campaign XP during an endgame map/chain run.
    if (cur.isMonsterLevel && !cur.campaignMonsters) return 0;
    if (_egGetPlayerLevel() >= EG_LEVELING_CONFIG.maxLevel) return 0;

    const c = EG_LEVELING_CONFIG;
    const refLevel = Math.max(1, Math.round(_egCampaignExpectedLevel(gi)));
    const base = _egGetXpForNextLevel(refLevel);
    const fraction = c.campaignFirstClearFraction
        * (isFirstClear ? 1 : (c.campaignReplayFraction || 0));
    const mult = _egCalcXpMultiplier(_egGetPlayerLevel(), refLevel);
    const xp = Math.max(1, Math.round(base * fraction * mult));
    return _egAwardXP(xp);
}


//------------------------------------------------------------------------
//-------------------LEVEL-UP REWARD (ENDGAME)----------------------------
//------------------------------------------------------------------------

// Instant reward for levelling up during an active endgame encounter:
//   - Life, mana and the absorption shield are completely refilled.
//   - 3 waves of projectiles (0.5 s apart) launch at EVERY monster on
//     screen, each hitting with correct-reveal projectile damage.
const EG_LEVELUP_REWARD_WAVES = 3;
const EG_LEVELUP_REWARD_WAVE_DELAY_MS = 500;

function _egPlayLevelUpReward() {
    if (typeof _egIsActive !== 'function' || !_egIsActive()) return;

    // Full life, mana & absorption shield restore (after the +max bonuses were applied).
    if (typeof playerMaxHP !== 'undefined' && typeof playerCurrentHP !== 'undefined') {
        playerCurrentHP = playerMaxHP;
        if (typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
    }
    if (typeof _resetPlayerMana === 'function') _resetPlayerMana();
    // Fully replenish the absorption shield
    if (typeof _egComputePlayerStats === 'function' && typeof _egPlayerAbsorptionCurrent !== 'undefined') {
        const maxAbs = _egComputePlayerStats().absorption || 0;
        _egPlayerAbsorptionCurrent = maxAbs;
        if (typeof _egCancelAbsorptionRegen === 'function') _egCancelAbsorptionRegen();
        if (typeof _renderPlayerAvatar === 'function') try { _renderPlayerAvatar(); } catch (e) {}
    }

    // Snapshot the monsters on screen now; each wave skips ones that died
    // in the meantime. Damage matches a correct-reveal projectile hit.
    if (typeof _egMonsters === 'undefined' || !_egMonsters.length) return;
    const targetIds = _egMonsters.map(m => m.id);
    const revealPct = _egGetRevealProjectileDamagePct() / 100;

    for (let wave = 0; wave < EG_LEVELUP_REWARD_WAVES; wave++) {
        setTimeout(() => {
            if (!_egIsActive()) return;
            targetIds.forEach(id => {
                if (!_egMonsters.some(m => m.id === id)) return;
                const rolled = _egCalcPlayerDamage();
                const damage = Math.max(1, Math.round(rolled * revealPct));
                const elements = _egScaleElements(_egLastHitElements, revealPct);
                _egAnimatePlayerProjectile(damage, id, undefined, undefined, undefined, undefined, elements);
            });
        }, wave * EG_LEVELUP_REWARD_WAVE_DELAY_MS);
    }
}


//------------------------------------------------------------------------
//-------------------LEVEL-UP EFFECT--------------------------------------
//------------------------------------------------------------------------

// Full-screen gold flash + expanding "LEVEL UP!" banner. Pure CSS animation,
// element removes itself after the effect finishes. Safe mid-combat (the
// overlay ignores pointer events).
function _egPlayLevelUpEffect(newLevel) {
    const el = document.createElement('div');
    el.className = 'eg-levelup-fx';
    el.innerHTML = `
<div class="eg-levelup-banner">
    <div class="eg-levelup-title">${t('eg_lvl_banner')}</div>
    <div class="eg-levelup-sub">${t('eg_lvl_levelup_sub').replace('{n}', newLevel)}</div>
</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
}


//------------------------------------------------------------------------
//-------------------ATTRIBUTE ALLOCATION & REFUND------------------------
//------------------------------------------------------------------------

// Spends one unspent point on `attr` ('str' | 'agi' | 'int').
function _egAllocateAttribute(attr) {
    if (!(attr in _EG_ATTR_ORIGINAL_BASE)) return false;
    if (_egGetUnspentPoints() <= 0) {
        if (typeof showToast === 'function') showToast(t('eg_lvl_no_points'), '#e74c3c');
        return false;
    }

    STATE.egAttrPoints--;
    STATE.egAttrAllocated[attr] = (STATE.egAttrAllocated[attr] || 0) + 1;
    _egSyncBaseAttributes();
    egSaveLevelingState();

    if (typeof showToast === 'function') {
        const name = t(EG_LEVELING_ATTRS.find(a => a.key === attr).nameKey);
        showToast(t('eg_lvl_alloc_done').replace('{attr}', name), '#2ecc71');
    }

    _egRenderLevelHUD();
    if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
    const modal = document.getElementById('eg-attr-modal');
    if (modal && modal.classList.contains('show')) _egRenderAttrWindow();
    return true;
}

// Evaluates the equipped loadout with `attr` temporarily reduced by one
// point and returns the resulting unmet requirements. The real base value
// is always restored, even when the check throws.
function _egSimulateRefundUnmet(attr) {
    if (!(attr in _EG_ATTR_ORIGINAL_BASE)) return [];
    if (typeof _egFindUnmetRequirements !== 'function'
        || typeof _egGetAllEquippedItems !== 'function') return [];

    const saved = EG_PLAYER_BASE_ATTRIBUTES[attr];
    EG_PLAYER_BASE_ATTRIBUTES[attr] = saved - 1;
    try {
        return _egFindUnmetRequirements(_egGetAllEquippedItems());
    } finally {
        EG_PLAYER_BASE_ATTRIBUTES[attr] = saved;
    }
}

// True when removing one point of `attr` is legal:
//   - at least one allocated point exists on that attribute, AND
//   - the equipped gear stays fully valid afterwards (no NEW unmet
//     requirements compared to the current state - same grandfather rule
//     the equip gate uses).
function _egCanRefundAttribute(attr) {
    if ((_egGetAllocatedAttributes()[attr] || 0) <= 0) return false;
    if (typeof _egFindUnmetRequirements !== 'function') return true;
    const before = _egFindUnmetRequirements(_egGetAllEquippedItems());
    const after = _egSimulateRefundUnmet(attr);
    return after.length <= before.length;
}

// Verified refund: returns one spent point to the unspent pool unless the
// equipped gear depends on the attribute (blocked with an explanatory toast).
function _egRefundAttribute(attr) {
    if (!(attr in _EG_ATTR_ORIGINAL_BASE)) return false;

    if (!_egCanRefundAttribute(attr)) {
        if (typeof showToast === 'function') {
            const missing = _egSimulateRefundUnmet(attr);
            const list = typeof _egGetUnmetRequirementsText === 'function'
                ? _egGetUnmetRequirementsText(missing)
                : '';
            showToast(t('eg_lvl_refund_blocked').replace('{list}', list || '?'), '#e74c3c');
        }
        return false;
    }

    STATE.egAttrAllocated[attr] = (STATE.egAttrAllocated[attr] || 0) - 1;
    STATE.egAttrPoints = (STATE.egAttrPoints || 0) + 1;
    _egSyncBaseAttributes();
    egSaveLevelingState();

    if (typeof showToast === 'function') {
        const name = t(EG_LEVELING_ATTRS.find(a => a.key === attr).nameKey);
        showToast(t('eg_lvl_refund_done').replace('{attr}', name), '#2ecc71');
    }

    _egRenderLevelHUD();
    if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
    const attrModal = document.getElementById('eg-attr-modal');
    if (attrModal && attrModal.classList.contains('show')) _egRenderAttrWindow();
    return true;
}


//------------------------------------------------------------------------
//-------------------PERSISTENCE------------------------------------------
//------------------------------------------------------------------------

function egSaveLevelingState() {
    if (typeof save === 'function') save();
}

// Reads leveling fields from STATE (with defaults for legacy saves) and
// applies them to the shared base attributes object.
function _egLoadLevelingState() {
    if (typeof STATE === 'undefined' || !STATE) return;
    if (!STATE.playerLevel) STATE.playerLevel = EG_LEVELING_CONFIG.startLevel;
    if (!STATE.playerXP) STATE.playerXP = 0;
    if (!STATE.egAttrPoints) STATE.egAttrPoints = 0;
    if (!STATE.egAttrAllocated) STATE.egAttrAllocated = { str: 0, agi: 0, int: 0 };
    _egSyncBaseAttributes();
    if (typeof setAchStat === 'function') try { setAchStat('egPlayerLevel', _egGetPlayerLevel()); } catch(e){}
}


//------------------------------------------------------------------------
//-------------------HUD (BADGE + INLINE CHIP)-----------------------------
//------------------------------------------------------------------------

// Refreshes the ✦ topbar badge and the small level chip on the character
// panel label. Both elements are optional - this no-ops outside the hub.
function _egRenderLevelHUD() {
    const pts = _egGetUnspentPoints();
    const lvl = _egGetPlayerLevel();
    const xp = _egGetPlayerXP();
    const need = _egGetXpForNextLevel(lvl);
    const pct = lvl >= EG_LEVELING_CONFIG.maxLevel ? 100 : Math.min(100, (xp / need) * 100);

    const badge = document.getElementById('eg-level-badge');
    if (badge) {
        badge.textContent = pts > 99 ? '99+' : String(pts);
        badge.style.display = pts > 0 ? 'flex' : 'none';
    }

    const chip = document.getElementById('eg-char-level-inline');
    if (chip) {
        const ptsHtml = pts > 0
            ? `<span class="eg-lvl-chip-points">✦${pts > 99 ? '99+' : pts}</span>`
            : '';
        chip.innerHTML = `
<span class="eg-lvl-chip" onclick="_egOpenAttributeWindow()">
    <span class="eg-lvl-chip-lvl">${t('eg_lvl_short').replace('{n}', lvl)}</span>
    <span class="eg-lvl-chip-bar"><span class="eg-lvl-chip-bar-fill" style="width:${pct}%"></span></span>
    ${ptsHtml}
</span>`;
    }

    // Keep the Probability Gate topbar level chip in sync (lives in endgame-gate.js).
    if (typeof _egRenderGateLevelChip === 'function') {
        try { _egRenderGateLevelChip(); } catch (e) {}
    } else {
        const gateChip = document.getElementById('eg-gate-level-chip');
        if (gateChip) {
            const ptsHtml2 = pts > 0 ? `<span class="eg-lvl-chip-points">✦${pts > 99 ? '99+' : pts}</span>` : '';
            const lvlLabel2 = (typeof t === 'function') ? t('eg_lvl_short').replace('{n}', lvl) : `Lv. ${lvl}`;
            gateChip.innerHTML = `<span class="eg-lvl-chip" style="pointer-events:none;"><span class="eg-lvl-chip-lvl">${lvlLabel2}</span><span class="eg-lvl-chip-bar"><span class="eg-lvl-chip-bar-fill" style="width:${pct}%"></span></span>${ptsHtml2}</span>`;
        }
    }
}


//------------------------------------------------------------------------
//-------------------TOPBAR BUTTON TOOLTIP--------------------------------
//------------------------------------------------------------------------

// Hover tooltip for the ✦ LEVEL topbar button, built on the shared game
// tooltip engine (tooltips-hud.js) instead of the native browser title.
function _egBuildLevelBtnTooltipHTML() {
    const lvl = _egGetPlayerLevel();
    const xp = _egGetPlayerXP();
    const pts = _egGetUnspentPoints();
    const atMax = lvl >= EG_LEVELING_CONFIG.maxLevel;
    const xpLine = atMax
        ? t('eg_lvl_max_level')
        : t('eg_lvl_xp_progress')
            .replace('{cur}', xp.toLocaleString())
            .replace('{need}', _egGetXpForNextLevel(lvl).toLocaleString());

    return `
<div class="eg-tt-frame" style="--tt-border:#c8a84b;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">✦</div>
        <div class="eg-tt-name" style="color:#f5d98a;">${t('eg_lvl_window_title')}</div>
    </div>
    <div class="eg-tt-section">
        <div class="eg-tt-mod">${t('eg_lvl_short').replace('{n}', lvl)} · ${xpLine}</div>
        <div class="eg-tt-mod">${pts > 0
            ? t('eg_lvl_points_available').replace('{n}', pts)
            : t('eg_lvl_no_points')}</div>
    </div>
</div>`;
}

function _egShowLevelBtnTooltip(e) {
    if (typeof showGameTooltip === 'function') showGameTooltip(_egBuildLevelBtnTooltipHTML(), e);
}


//------------------------------------------------------------------------
//-------------------ATTRIBUTE WINDOW-------------------------------------
//------------------------------------------------------------------------

// Lazily creates the modal shell (once), mirroring the item-delete modal.
function _egEnsureAttrModal() {
    if (document.getElementById('eg-attr-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'eg-attr-modal';
    modal.className = 'eg-delete-modal-bg';
    modal.innerHTML = `<div class="eg-attr-box" id="eg-attr-box"></div>`;
    document.body.appendChild(modal);
    _egInjectLevelingStyles();
}

function _egOpenAttributeWindow() {
    _egEnsureAttrModal();
    _egRenderAttrWindow();
    document.getElementById('eg-attr-modal').classList.add('show');
    // Lift the shared tooltip above this modal (modal z-index 10000 > tip 9999)
    // so the attribute-row descriptions stay visible.
    if (typeof getGameTooltip === 'function') getGameTooltip().style.zIndex = '10001';
}

function _egCloseAttributeWindow() {
    const modal = document.getElementById('eg-attr-modal');
    if (modal) modal.classList.remove('show');

    // Allocated/refunded points may have changed which items are
    // requirement-blocked, so refresh the inventory + equip renders.
    if (typeof _egRenderInventory === 'function') _egRenderInventory();
    if (typeof _egRenderEquipSlots === 'function') _egRenderEquipSlots();
}

// Rebuilds the window body from current state. Called on every open and
// after each allocate/refund so values stay live.
function _egRenderAttrWindow() {
    const box = document.getElementById('eg-attr-box');
    if (!box) return;

    const lvl = _egGetPlayerLevel();
    const xp = _egGetPlayerXP();
    const atMax = lvl >= EG_LEVELING_CONFIG.maxLevel;
    const need = _egGetXpForNextLevel(lvl);
    const pct = atMax ? 100 : Math.min(100, (xp / need) * 100);
    const pts = _egGetUnspentPoints();

    const gearBonus = (typeof _egSumAttributeBonuses === 'function')
        ? _egSumAttributeBonuses(typeof _egGetAllEquippedItems === 'function' ? _egGetAllEquippedItems() : [])
        : { str: 0, agi: 0, int: 0 };

    const xpHTML = atMax
        ? `<div class="eg-attr-xp-text">${t('eg_lvl_max_level')}</div>`
        : `<div class="eg-attr-xp-text">${t('eg_lvl_xp_progress')
            .replace('{cur}', xp.toLocaleString())
            .replace('{need}', need.toLocaleString())}</div>`;

    const rowsHTML = EG_LEVELING_ATTRS.map(a => {
        const alloc = _egGetAllocatedAttributes()[a.key] || 0;
        const baseTotal = _EG_ATTR_ORIGINAL_BASE[a.key] + alloc;
        const total = baseTotal + (gearBonus[a.key] || 0);

        const canAdd = pts > 0;
        const canRemove = _egCanRefundAttribute(a.key);

        // Explain WHY removal is blocked (gear verification feedback).
        let removeTitle = t('eg_lvl_refund');
        if ((alloc || 0) <= 0) {
            removeTitle = t('eg_lvl_no_points');
        } else if (!canRemove) {
            const list = typeof _egGetUnmetRequirementsText === 'function'
                ? _egGetUnmetRequirementsText(_egSimulateRefundUnmet(a.key))
                : '';
            removeTitle = t('eg_lvl_refund_blocked_title').replace('{list}', list || '?');
        }

        return `
<div class="eg-attr-row">
    <span class="eg-attr-row-icon">${a.icon}</span>
    <div class="eg-attr-row-info"
         onmouseenter="if (typeof showGameTooltip === 'function' && typeof _egBuildStatDescTooltipHTML === 'function') showGameTooltip(_egBuildStatDescTooltipHTML('${a.nameKey.replace('eg_stat_', 'eg_statdesc_')}', this.querySelector('.eg-attr-row-name').textContent), event)"
         onmousemove="if (typeof moveGameTooltip === 'function') moveGameTooltip(event)"
         onmouseleave="if (typeof hideGameTooltip === 'function') hideGameTooltip()">
        <div class="eg-attr-row-name">${t(a.nameKey)}</div>
        <div class="eg-attr-row-detail">${baseTotal}${(gearBonus[a.key] || 0) > 0
            ? ` <small>+ ${t('eg_lvl_gear_bonus').replace('{n}', gearBonus[a.key])}</small>` : ''}</div>
    </div>
    <div class="eg-attr-row-value">${total}</div>
    <button class="eg-attr-btn eg-attr-btn-add" ${canAdd ? '' : 'disabled'}
         onclick="_egAllocateAttribute('${a.key}')">+</button>
    <button class="eg-attr-btn eg-attr-btn-remove" ${canRemove ? '' : 'disabled'}
         data-tip="${_tipAttr(removeTitle)}" aria-label="${_tipAttr(removeTitle)}"
         onclick="_egRefundAttribute('${a.key}')">−</button>
</div>`;
    }).join('');

    box.innerHTML = `
<button class="eg-attr-close" onclick="_egCloseAttributeWindow()"
        data-tip-t="ui_close" aria-label="${t('ui_close')}">✕</button>
<div class="eg-attr-title">${t('eg_lvl_window_title')}</div>
<div class="eg-attr-level-line">
    <span class="eg-attr-level-num">${t('eg_lvl_short').replace('{n}', lvl)}</span>
    <div class="eg-attr-xp-wrap">
        <div class="eg-attr-xp-bar"><div class="eg-attr-xp-fill" style="width:${pct}%"></div></div>
        ${xpHTML}
    </div>
</div>
<div class="eg-attr-points ${pts > 0 ? 'has-points' : ''}">${pts > 0
        ? t('eg_lvl_points_available').replace('{n}', pts)
        : t('eg_lvl_no_points')}</div>
<div class="eg-attr-rows">${rowsHTML}</div>
${(() => { const tiers = _egBuildXpTiersHTML(); return tiers
    ? `<div class="eg-attr-xp-tiers">${tiers}</div>` : ''; })()}
<div class="eg-attr-hint">${t('eg_lvl_hint')}</div>
<div class="eg-delete-modal-btns">
    <button class="eg-delete-modal-btn eg-delete-modal-cancel"
         onclick="_egCloseAttributeWindow()">${t('eg_lvl_close')}</button>
</div>`;
}


//------------------------------------------------------------------------
//-------------------STYLES------------------------------------------------
//------------------------------------------------------------------------

// Injects all leveling UI styles once (badge, inline chip, window, effects).
function _egInjectLevelingStyles() {
    if (document.getElementById('eg-leveling-styles')) return;
    const style = document.createElement('style');
    style.id = 'eg-leveling-styles';
    style.textContent = `
/* ── Topbar button + unspent-point badge ── */
.eg-level-btn { position: relative; color: #f5d98a; font-size: 14px; }
.eg-level-badge {
    display: none;
    position: absolute;
    top: -6px; right: -6px;
    min-width: 15px; height: 15px;
    padding: 0 3px;
    align-items: center; justify-content: center;
    background: #c8a84b;
    border: 1px solid #7a6526;
    border-radius: 8px;
    color: #1a1408;
    font-size: 9px;
    font-weight: 700;
    line-height: 1;
}

/* ── Inline level chip on the character panel ── */
.eg-char-label-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
#eg-char-level-inline { cursor: pointer; }
.eg-lvl-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #c8a84b;
}
.eg-lvl-chip:hover .eg-lvl-chip-lvl { text-shadow: 0 0 6px rgba(245,217,138,.8); }
.eg-lvl-chip-lvl { letter-spacing: .5px; }
.eg-lvl-chip-bar {
    width: 64px; height: 6px;
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(200,168,75,.45);
    border-radius: 3px;
    overflow: hidden;
}
.eg-lvl-chip-bar-fill { display: block; height: 100%; background: linear-gradient(90deg,#8a6d2b,#f5d98a); }
.eg-lvl-chip-points {
    background: #c8a84b;
    color: #1a1408;
    border-radius: 8px;
    padding: 0 5px;
    font-weight: 700;
    animation: eg-lvl-pulse 1.6s ease-in-out infinite;
}
@keyframes eg-lvl-pulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.35); }
}

/* ── Attribute window ── */
.eg-attr-box {
    position: relative;
    background: #12121e;
    border: 2px solid #c8a84b;
    border-radius: 8px;
    padding: 18px 22px;
    width: 420px;
    max-width: 94vw;
    max-height: 90vh;
    overflow-y: auto;
    color: #ddd;
    font-family: var(--PX, monospace);
}
.eg-attr-close {
    position: absolute; top: 8px; right: 8px;
    width: 22px; height: 22px; padding: 0;
    font-family: var(--PX, monospace); font-size: 10px; line-height: 1;
    color: var(--accent2, #fff); background: transparent;
    border: 1px solid var(--border2, #656f96); border-radius: 4px;
    cursor: pointer; transition: all 0.12s;
}
.eg-attr-close:hover {
    color: #ff6b6b; border-color: rgba(255,107,107,0.6);
    background: rgba(255,107,107,0.12);
}
.eg-attr-title {
    text-align: center;
    color: #f5d98a;
    letter-spacing: 2px;
    font-weight: 700;
    margin-bottom: 12px;
}
.eg-attr-level-line {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
}
.eg-attr-level-num { color: #fff; font-size: 16px; font-weight: 700; white-space: nowrap; }
.eg-attr-xp-wrap { flex: 1; }
.eg-attr-xp-bar {
    height: 10px;
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(200,168,75,.5);
    border-radius: 5px;
    overflow: hidden;
}
.eg-attr-xp-fill { display: block; height: 100%; background: linear-gradient(90deg,#8a6d2b,#f5d98a); transition: width .25s; }
.eg-attr-xp-text { margin-top: 4px; font-size: 10px; opacity: .75; text-align: right; }
.eg-attr-points { text-align: center; font-size: 12px; margin-bottom: 12px; opacity: .85; }
.eg-attr-points.has-points { color: #f5b642; font-weight: 700; }
.eg-attr-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.eg-attr-row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 6px;
    padding: 8px 10px;
}
.eg-attr-row-icon { font-size: 18px; }
.eg-attr-row-info { flex: 1; min-width: 0; }
.eg-attr-row-name { font-size: 13px; font-weight: 700; }
.eg-attr-row-detail { font-size: 10px; opacity: .65; }
.eg-attr-row-value { font-size: 16px; font-weight: 700; color: #66fcf1; min-width: 34px; text-align: right; }
.eg-attr-btn {
    width: 26px; height: 26px;
    border-radius: 4px;
    border: 1px solid #555;
    background: #2a2a3e;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    line-height: 1;
    padding: 0;
}
.eg-attr-btn-add:not(:disabled) { border-color: #2ecc71; color: #2ecc71; }
.eg-attr-btn-add:not(:disabled):hover { background: #2ecc71; color: #10241a; }
.eg-attr-btn-remove:not(:disabled) { border-color: #c8a84b; color: #f5d98a; }
.eg-attr-btn-remove:not(:disabled):hover { background: #c8a84b; color: #1a1408; }
.eg-attr-btn:disabled { opacity: .3; cursor: not-allowed; }
.eg-attr-hint { font-size: 10px; opacity: .55; text-align: center; margin-bottom: 12px; }
.eg-attr-xp-tiers {
    display: flex;
    flex-direction: column;
    gap: 3px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 6px;
    padding: 7px 10px;
    margin-bottom: 10px;
}
.eg-xp-tier { display: flex; justify-content: space-between; gap: 10px; font-size: 10px; opacity: .85; }
.eg-xp-tier-label { font-weight: 700; white-space: nowrap; }
.eg-xp-tier-label.opt { color: #2ecc71; }
.eg-xp-tier-label.avg { color: #f5d98a; }
.eg-xp-tier-label.poor { color: #e06c55; }

/* ── Level-up effect ── */
.eg-levelup-fx {
    position: fixed;
    inset: 0;
    z-index: 10050;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, rgba(245,185,66,.28) 0%, rgba(245,185,66,.08) 35%, transparent 65%);
    animation: eg-lvl-flash 2.8s ease-out forwards;
}
@keyframes eg-lvl-flash {
    0% { opacity: 0; }
    12% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
}
.eg-levelup-banner { text-align: center; animation: eg-lvl-pop 2.8s ease-out forwards; }
@keyframes eg-lvl-pop {
    0% { transform: scale(.4); opacity: 0; }
    15% { transform: scale(1.15); opacity: 1; }
    25% { transform: scale(1); }
    80% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1.05) translateY(-14px); opacity: 0; }
}
.eg-levelup-title {
    font-family: var(--PX, monospace);
    font-size: 44px;
    font-weight: 700;
    letter-spacing: 4px;
    color: #f5d98a;
    text-shadow: 0 0 18px rgba(245,185,66,.9), 0 0 40px rgba(245,185,66,.5), 0 2px 0 #6b5316;
}
.eg-levelup-sub {
    margin-top: 6px;
    font-family: var(--PX, monospace);
    font-size: 15px;
    letter-spacing: 2px;
    color: #fff;
    text-shadow: 0 0 10px rgba(245,185,66,.8);
}

/* ── Shared eg modal shell (eg-delete-modal-bg) ──
   The attribute window borrows the old stash delete-confirm modal's shell
   classes. Those styles were injected by _egInjectDeleteUIStyles() in
   endgame-hub.js and silently disappeared when the delete-confirm modal
   was removed - leaving the window unpositioned (it rendered behind the
   Orbs & Shards tab) and its buttons unstyled. They live here now. */
.eg-delete-modal-bg {
    display: none;
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.6);
    z-index: 10000;
    align-items: center; justify-content: center;
}
.eg-delete-modal-bg.show { display: flex; }
.eg-delete-modal-btns { display: flex; gap: 10px; justify-content: center; }
.eg-delete-modal-btn {
    padding: 8px 14px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-weight: 700;
    font-family: var(--PX, monospace);
}
.eg-delete-modal-cancel { background: #444; color: #ddd; }
.eg-delete-modal-cancel:hover { background: #555; }
`;
    document.head.appendChild(style);
}


//------------------------------------------------------------------------
//-------------------BOOTSTRAP--------------------------------------------
//------------------------------------------------------------------------

// Loads saved progression immediately (same pattern as _egLoadHubState in
// endgame-hub.js) so level requirements are enforced without visiting the hub.
_egLoadLevelingState();
_egInjectLevelingStyles();

// Global Escape handler - closes the attribute window when open.
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const m = document.getElementById('eg-attr-modal');
        if (m && m.classList.contains('show')) {
            _egCloseAttributeWindow();
            e.preventDefault();
            e.stopPropagation();
        }
    }
});
