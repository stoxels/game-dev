import { Audio_Manager } from '../audio/audio.js';
import { setAchStat } from '../achievements/achievements.js';
import { _resetPlayerMana, gainMana } from '../classes/class-mana.js';
import { _incDirect } from '../inference/inference-stats.js';
import { ptEffectChannels, ptNodeHasEffects } from '../probability-tree/pt-effects.js';
import { save } from '../state.js';
import { t } from '../translation/translations.js';
import { _getRevealProjectileDamagePct } from '../combat/combat-class-projectiles-reveal.js';
import { _calcPlayerDamage, _lastHitElements } from '../combat/combat-calculations.js';
import { _scaleElements } from '../combat/combat-calculations-resistances.js';
import { _animatePlayerProjectile } from '../combat/encounter.js';
import { _egRenderGateLevelChip } from './endgame-gate.js';
import { _renderEquipSlots, _renderInventory, _renderStatsList } from './endgame-hub.js';
import { _egMapPlayerLifeMult, _egMapXpMult } from './endgame-map-launch.js';
import { _cancelAbsorptionRegen, _computePlayerStats, _getAllEquippedItems } from './endgame-player-stats.js';
import { PLAYER_BASE_ATTRIBUTES, _findUnmetRequirements, _getUnmetRequirementsText } from '../loot/loot-requirements.js';
import { _isActive } from '../combat/combat-state.js';
import { STATE } from '../state.js';
import { cur } from '../state.js';
import { TALENT_TREE_DATA } from '../probability-tree/probability-tree-data.js';

//------------------------------------------------------------------------
//-------------------ENDGAME CHARACTER LEVELING---------------------------
//------------------------------------------------------------------------
// Experience & progression system shared by the CAMPAIGN and the endgame:
//   - XP is earned from the very first story level: completing a level
//     grants a one-time XP bonus (replays grant a reduced amount) and every
//     monster killed grants kill XP.
//   - Monster XP is scaled by the monster's level and by an ARPG-style
//     multiplier: full XP only while the monster is within a safe level
//     range of the character; beyond that range (too high OR too low) XP
//     falls off exponentially - so re-farming old content gives little.
//   - The campaign carries the character from level 1 to ~level 68 (the
//     atlas entry level); a one-time sweep of the atlas then reaches ~94
//     and 94→100 is the dedicated late grind - see LEVELING_CONFIG and
//     tools/xp-curve-tune.py.
//   - Each level grants passivePointsPerLevel (1) passive tree point. Raw
//     attribute points are no longer granted per level; the character's
//     +stats come from the travel nodes allocated in the passive tree.
//   - Legacy attribute allocation helpers remain for backwards-compatible
//     saves and refunds; the character-level modal is no longer exposed in
//     the hub.
//
// Wiring notes:
//   - _syncBaseAttributes() keeps PLAYER_BASE_ATTRIBUTES
//     (endgame-requirements.js) in sync with STATE.playerLevel, legacy
//     attribute points, and allocated travel nodes. That single sync
//     automatically enables item LEVEL requirements everywhere (equip gate,
//     tooltips) and feeds attributes into _computePlayerStats() side-effects
//     (Str -> life/armour, Agi -> accuracy/evasion, Int -> mana/spell dmg).
//   - Kill integration lives in _killMonster() (endgame-encounter.js),
//     which calls _grantMonsterXP(monsterLevel, isBoss).
//
// Dependencies (must be loaded before this file):
//   js/state.js             - STATE, save()
//   endgame-player-stats.js  - _getAllEquippedItems()
//   endgame-requirements.js - PLAYER_BASE_ATTRIBUTES,
//                             _findUnmetRequirements(),
//                             _getUnmetRequirementsText()
//
// Entry points:
//   _grantMonsterXP(mLevel, isBoss)      → called on every monster kill
//   _getPlayerLevel() / _getPlayerXP() → current progression
//   _getXpForNextLevel(level)            → XP needed to leave `level`
//   _calcXpMultiplier(playerLvl, mLvl)   → ARPG-style range multiplier
//   _allocateAttribute('str'|'agi'|'int')→ spend one point
//   _refundAttribute('str'|'agi'|'int')  → verify & refund one point
//   _canRefundAttribute(attr)            → refund legality check
//   _renderLevelHUD()                    → refresh the inline level chip
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONSTANTS--------------------------------------------
//------------------------------------------------------------------------

export const LEVELING_CONFIG = {
    startLevel: 1,
    maxLevel: 100,

    // XP curve: xpToLeave(level) = xpBase * level^xpExp + xpLinear * level
    // for the CAMPAIGN segment (level < campaignEndLevel), multiplied by the
    // endgame segment beyond it. The campaign hands out XP from level 1 and
    // is tuned (tools/xp-curve-tune.py) so a clean playthrough of all 184 story
    // levels + their monsters ends around campaignEndLevel (68) - Tier 1
    // maps are then tuned around monster level ~68 instead of level 3, so
    // the atlas is a genuine next step, ARPG-style (T1 = 68 → T16 = 90).
    // Campaign pacing does not depend on the curve's shape: level-completion
    // XP is a FRACTION of xpToNextLevel(expectedLevel) - see
    // LEVELING_CONFIG.campaignFirstClearFraction.
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
    // Trimmed x0.7 (12->8.4, 8.5->6.0): pack sizes grew after the campaign
    // curve was tuned, so a clean run ended near level 75 instead of the
    // campaignEndLevel target of 68 (modelled, all kills). xpEndgameScale is
    // scaled by the same 0.7 below so late-atlas pacing is kept.
    xpPerKillBase: 8.4,
    xpPerKillGrowth: 6.0,
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
    xpEndgameScale: 63,
    xpEndgamePower: 3,

    // ARPG-style safe range: monsters up to
    //   (safeRangeBelowBase + floor(playerLevel / safeRangeBelowLevelsPer))
    // levels BELOW the character give full XP; monsters up to
    // safeRangeAbove levels above do too (softened 3→5 toward the genre's
    // "full XP from anything above you", so white-only players who fall
    // behind the tier ladder can still catch up on repeat farms). Outside
    // the band the multiplier decays as ratio^penaltyExponent (never below
    // minMultiplier), which still blocks tier-skipping hard (a level-20
    // character in a T16 map earns 0.01×).
    // Narrowed below vs the genre's 3+floor(lvl/16) and steepened 6→8 so farming
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
    // +stats come from allocated travel nodes in the passive tree.
    attrPointsPerLevel: 0,
    passivePointsPerLevel: 1,

    // Campaign completion XP (levels 1..campaignEndLevel): a first clear
    // grants campaignFirstClearFraction of the XP needed for the level's
    // EXPECTED character level, and a replay grants campaignReplayFraction
    // of that. Both are additionally scaled by the ARPG-style range
    // multiplier against the expected level, so farming old content gives
    // almost nothing. Monster kills (see _grantMonsterXP) make up the
    // rest of the budget.
    campaignFirstClearFraction: 0.22,
    campaignReplayFraction: 0.35,
};

// Pristine copy of the base attribute pool from endgame-requirements.js,
// captured before this file mutates the object with allocated points.
export const _ATTR_ORIGINAL_BASE = {
    str: PLAYER_BASE_ATTRIBUTES.str,
    agi: PLAYER_BASE_ATTRIBUTES.agi,
    int: PLAYER_BASE_ATTRIBUTES.int,
};

const _PASSIVE_TREE_TRAVEL_BONUSES = {
    small_strength: { str: 5 },
    small_agility: { agi: 5 },
    small_intellect: { int: 5 },
    small_martial_poise: { str: 5, agi: 5 },
    small_sharpshooter: { str: 5, agi: 5 },
    small_disciplined_body: { str: 5, agi: 5 },
    small_heavy_draw: { str: 5, agi: 5 },
    small_force_of_will: { str: 5, int: 5 },
    small_focused_fury: { str: 5, int: 5 },
    small_runic_fists: { str: 5, int: 5 },
    small_battle_mage: { str: 5, int: 5 },
    small_spell_dancer: { int: 5, agi: 5 },
    small_arcane_grace: { int: 5, agi: 5 },
    small_runic_aim: { int: 5, agi: 5 },
    small_quick_study: { int: 5, agi: 5 },
};

// Notable nodes now ride the effects pipeline (pt-effects.js); the table is
// kept (empty) because the scanner still consults it for unconverted notables.
const _PASSIVE_TREE_NOTABLE_BONUSES = {};

// Small pathing nodes previously had no stat channel at all - only travel
// and notable tiers were read. Deliberately narrow: a small node contributes
// only when its (unique) stat key is listed here, so untouched pathing nodes
// keep granting nothing.
const _PASSIVE_TREE_SMALL_BONUSES = {};

const _PASSIVE_TREE_NODES_BY_ID = new Map(
    Array.isArray(TALENT_TREE_DATA?.nodes)
        ? TALENT_TREE_DATA.nodes.map(node => [node.id, node])
        : []
);

function _getPassiveTreeTravelBonuses() {
    const totals = { glassClockTimerLessPct: 0, glassClockGain: 0, noFillTimeGain: 0, mistakeTimeCostMorePct: 0, marathon: 0, str: 0, agi: 0, int: 0, mana: 0, armourFlat: 0, armourIncPct: 0, lifeRegenPct: 0, lifeRegenFlat: 0, accuracy: 0, accuracyIncPct: 0, movementSpeedPct: 0, absorptionFlat: 0, absorptionIncPct: 0, absorptionRegenRatePct: 0, spellDamageIncPct: 0, meleePhysIncPct: 0, meleePhys1HIncPct: 0, meleePhysHeavyIncPct: 0, meleeChargeSpeedPct: 0, attackSpeedPct: 0, physDamageIncPct: 0, elementalDamageIncPct: 0, fireDamageIncPct: 0, coldDamageIncPct: 0, lightningDamageIncPct: 0, castSpeedPct: 0, fireCastSpeedPct: 0, coldCastSpeedPct: 0, lightningCastSpeedPct: 0, fireResistFlat: 0, coldResistFlat: 0, lightningResistFlat: 0, fireResistMax: 0, healthFlat: 0, healthIncPct: 0, manaIncPct: 0, manaLessPct: 0, allElementalResist: 0, castingAilmentAvoidPct: 0, reflectPhysFlat: 0, blockChanceTree: 0, blockRecoveryPct: 0, blockArmorPulse: 0, igniteDurationPct: 0, bleedDurationPct: 0, meleeRangeM: 0, meleeSplashBaseM: 0, lifeLeechMeleePct: 0, timerStartSecs: 0, mistakeCountTree: 0, mistakeNotCountTreePct: 0, lifeOnLine: 0, absorptionOnLine: 0, manaOnLine: 0, chargeOnLinePct: 0, enduranceOnLinePct: 0, frenzyOnLinePct: 0, powerOnLinePct: 0, armourPerStreak: 0, blockFlawlessPct: 0, mistakeHeal: 0, damagePerStreakPct: 0, damageFlawlessPct: 0, damageLowTimePct: 0, damageAfterLinePct: 0, revealProjectileDamagePct: 0, damageOnMistakePct: 0, timeOnKill: 0, timeOnElite: 0, timerFreezeOnStun: 0, cellOnKillPct: 0, markOnKillPct: 0, quickFillStreakPct: 0, firstStepTreeSecs: 0, pickupLifetimeSecs: 0, luckyTileRewardAmount: 0, regenLowTimePct: 0, quizHintPct: 0, quizRetryPct: 0, quizTimeSecs: 0, itemDropPct: 0, itemEffectPct: 0, retaliationWardBleed: 0, retaliationWardIgnite: 0, meleeAoEPct: 0, lifeLeechPct: 0, impaleChanceHeavyPct: 0, impaleEffectHeavyPct: 0, impaleEffectFreshPct: 0, impaleDurationPct: 0, blockChanceShieldPct: 0, meleePhysShieldIncPct: 0, attackPhysShieldIncPct: 0, shieldDefencePct: 0, enduranceOnKillShieldPct: 0, enduranceChargesMax: 0, enduranceDurationPct: 0, lifeRegenPerEndurancePct: 0, meleePhysSwordIncPct: 0, meleePhysAxeIncPct: 0, swordChargeSpeedPct: 0, accuracySwordFlat: 0, ignorePhysReductionPct: 0, intimidateChanceMeleePct: 0, intimidateMeleeAmpPct: 0, bleedChanceMeleePct: 0, bleedChanceAttackPct: 0, bleedSpeedPct: 0, lifeRegenRatePct: 0, axeChargeSpeedPct: 0, rageOnHitAxe: 0, rageMeleeMorePct: 0, rageMax: 0, meleePhysMaceIncPct: 0, areaOfEffectPct: 0, stunChanceMaceChargedPct: 0, stunDurationPct: 0, coldResistMax: 0, lightningResistMax: 0, allElementalResistMax: 0, stunChanceHeavyPct: 0, stunDurationHeavyPct: 0, stunDoubleChancePct: 0, meleeDoubleDamageChancePct: 0, meleeSpellManaCostReducedPct: 0, meleeSpellLifeCostPct: 0, meleeKillExplodeChancePct: 0, healthMorePct: 0, manaRemoved: 0, spellsCostLife: 0, spellCostIncPct: 0, damageToFirePct: 0, onlyFireDamage: 0, critChanceMeleeMacePct: 0, critMultiplierMeleeMacePct: 0, igniteDamageMorePct: 0, physDotMorePct: 0, physAsExtraFirePct: 0, physAsExtraFireTimedPct: 0, crushPhysReductionPct: 0, lifeRegenLessPct: 0, lifeLeechLessPct: 0, absorptionRechargesLife: 0, projectileDamageIncPct: 0, projectileSpeedPct: 0, projectileCritChancePct: 0, bowSpellDamageIncPct: 0, bowSpellDotIncPct: 0, stunAvoidPct: 0, evasionFlat: 0, evasionIncPct: 0, manaHealIncPct: 0, manaOnMeleeHitChargedPct: 0, parrySpellChancePct: 0, critChanceMeleePct: 0, projectileElementalDamageIncPct: 0, projectileCritMultiplierPct: 0, heartHealFlat: 0, manaOnProjectileHitPct: 0, bowSpellManaCostReducedPct: 0, frenzyChargesMax: 0, frenzyDurationPct: 0, evasionPerFrenzyChargePct: 0, lifeOnProjectileHit: 0, lifeBurstOnProjectileHitChancePct: 0, heartSpawnIncPct: 0, manaSpawnIncPct: 0, poisonChanceAttackPct: 0, poisonDotMultiPct: 0, lifeOnMeleeHit: 0, lifeOnAttackHit: 0, dotIncPct: 0, skillEffectDurationPct: 0, lifeLeechEffectIncPct: 0, shadowResistFlat: 0, critChanceFlat: 0, dotIncDaggerPct: 0, critMultiplierDaggerPct: 0, poisonDurationPct: 0, critDotMultiPct: 0, shadowDamageIncPct: 0, manaOnKillFlat: 0, damageIncPct: 0, critChanceDaggerPct: 0, bleedAvoidPct: 0, poisonAvoidPct: 0, lifeOnKillFlat: 0, critMultiplierFlatPct: 0, manaRegenIncPct: 0, spellCritChancePct: 0, spellCritMultiplierPct: 0, chillEffectIncPct: 0, absorptionLeechSpellPct: 0, absorptionLeechEffectIncPct: 0, physAsExtraShadowPct: 0, lifeRecoupPct: 0, daggerDamageIncPct: 0, lifeLeechAsAbsorption: 0, absorptionNoRecharge: 0, daggerChargeSpeedPct: 0, absorptionOnKillFlat: 0, shockAvoidPct: 0, igniteAvoidPct: 0, chillAvoidPct: 0, elementalAilmentAvoidPct: 0, igniteChancePct: 0, attacksNeverMiss: 0, movementSpeedLessPct: 0, noRepeatTarget: 0, singleElementMorePct: 0, lastElementResistPct: 0, absorptionStopsWhileAttacking: 0, absorptionRegenDelaySecs: 0, evasionToArmour: 0, agilityNoEvasion: 0, lifeLeechInstant: 0, lifeOnlyFromLeech: 0, windDancerLessPct: 0, windDancerEvadePct: 0, windDancerMorePct: 0, lifeBecomesOne: 0, shadowImmune: 0, chilledColdTaken: 0, damageToColdPct: 0, onlyColdDamage: 0, bleedStackMax: 0, bleedLessPct: 0, absorptionRemoved: 0, manaToLifePct: 0, elementalOverloadPct: 0, critsNoExtraDamage: 0, dotMultiEqualsCrit: 0, nonCritNoAilments: 0, absorptionRegenUninterrupted: 0, absorptionRegenLessPct: 0, armourDefendDouble: 0, maxDamageReductionCap: 0, spellDmgLowLifeMorePct: 0, damageFromManaPct: 0, ghostDance: 0, ghostShroudMax: 0, ghostShroudRecoverPct: 0, blockDoubled: 0, blockedHitTakenPct: 0, damageToLightningPct: 0, onlyLightningDamage: 0, lightningMaxMorePct: 0, lightningMinLessPct: 0, cannotEvade: 0, cannotBeStunned: 0, pointBlankPct: 0, blockMaxAttackLess: 0, blockMaxSpellLess: 0, spellBlockPerOvercap: 0, dodgeChanceTreePct: 0, armourLessPct: 0, absorptionLessPct: 0, spellCostFromAbsorption: 0, strengthSpellDamage: 0, lifeRegenToAbsorption: 0, preciseTechniquePct: 0, neverCrit: 0, impaleSpread: 0, impaleExtra: 0, impaleLockout: 0, secondaryDamagePct: 0, pierceChanceTreePct: 0, pierceTargetsExtra: 0, chainChanceTreePct: 0, chainCountExtra: 0, forkChancePct: 0, forkExtraChancePct: 0, multishotChanceTreePct: 0, costEfficiencyPct: 0, onslaughtEffectPct: 0, onslaughtOnKillPct: 0, onslaughtDefencePct: 0, leechEffectRecentCritPct: 0, wandPhysAsLightningPct: 0, bowAoePct: 0, dmgFullAbsorptionPct: 0, critMultiHeavy: 0, dmgVsLowLifePct: 0, aoeRecentKillPct: 0, ailmentDurationTakenPct: 0, chillShockTakenPct: 0, spellDotMultiPct: 0, manaLeechAttackPct: 0, spellBlockFlat: 0, dmgRecentShockPct: 0, shockDurationPct: 0, shockEffectPct: 0, lifePulsePct: 0, dotFasterPct: 0, enduranceMin: 0, enduranceOnKillPct: 0, damagePerEndurancePct: 0, enduranceWhenHitPct: 0, lowLifeRegenPct: 0, physTakenFlat: 0, manaLeechEffectPct: 0, critVsBleedingPct: 0, critMultiVsBleedingPct: 0, avoidPhysHitPct: 0, armourIfHitPct: 0, evasionIfNotHitPct: 0, igniteFasterPct: 0, freezeDurationPct: 0, critVsShockedPct: 0, shadowResDouble: 0, armourPerEndurancePct: 0, moveSpeedPerFrenzyPct: 0, chargeSpeedPerFrenzyPct: 0, stunPerEndurancePct: 0, aoePerEndurancePct: 0, areaDamagePct: 0, shieldElementalRes: 0, ailmentEffectTreePct: 0, blindDurationPct: 0, chillDurationPct: 0, poisonChanceSpellPct: 0, igniteDurationTakenPct: 0, shockEffectTakenPct: 0, chillEffectTakenPct: 0, freezeDurationTakenPct: 0, spellDotIncPct: 0, critPerPowerCharge: 0, manaRegenPerPowerPct: 0, critMultiPerPowerCharge: 0, shieldCastSpeedPct: 0, shieldSpellDamagePct: 0, spellDamagePerPowerPct: 0, shieldAbsorptionPct: 0, rageDecaySlowerPct: 0, ragePerArmourPct: 0, rageWhenHitAmount: 0, powerChargesMax: 0, powerDurationPct: 0, powerOnCritPct: 0, powerOnKillPct: 0, powerOnBlockPct: 0, powerOnStunPct: 0, powerDamagePerChargePct: 0, frenzyOnKillPct: 0, frenzyOnBlockPct: 0, enduranceOnBlockPct: 0, enduranceOnMeleeCritPct: 0, blindChancePct: 0, blindEffectIncPct: 0, critChanceVsBlindedPct: 0, fortifyMax: 0, fortifyDurationPct: 0, fortifyOnStunPct: 0, fortifyEffectIncPct: 0, fortifiedDefencePct: 0, stunChancePct: 0, riposteDamagePct: 0, riposteDurationPct: 0, poisonChanceDaggerPct: 0, daggerCritPoisons: 0, staffBlockPct: 0, staffSpellBlockPct: 0, shieldSpellBlockPct: 0, critChanceSwordPct: 0, critMultiplierSwordPct: 0, critChanceAxePct: 0, critMultiplierAxePct: 0, staffDamageIncPct: 0, staffChargeSpeedPct: 0, critChanceStaffPct: 0, critMultiplierStaffPct: 0, wandDamageIncPct: 0, wandChargeSpeedPct: 0, critChanceWandPct: 0, critMultiplierWandPct: 0, dualDamageIncPct: 0, dualChargeSpeedPct: 0, dualAccuracyIncPct: 0, dualCritChancePct: 0, dualCritMultiPct: 0, dualCastSpeedPct: 0, dualSpellDamagePct: 0, dualMoveSpeedPct: 0, dualBlockPct: 0, physAsExtraColdPct: 0, physAsExtraLightningPct: 0, freezeChancePct: 0, shockChancePct: 0, penFirePct: 0, penColdPct: 0, penLightningPct: 0, penShadowPct: 0, penElementalPct: 0 };
    // Unique equipment carries passive-tree style effects (`effects` on the
    // unique def, copied to item.uniqueEffects). They ride the same channels
    // as tree nodes and apply even without a tree (treeless / no allocation).
    try {
        for (const item of _getAllEquippedItems()) {
            if (!item || !item.isUnique || !Array.isArray(item.uniqueEffects)) continue;
            const gearChannels = ptEffectChannels(item.uniqueEffects);
            for (const channel in gearChannels) totals[channel] = (totals[channel] || 0) + gearChannels[channel];
        }
    } catch (e) { /* equipment not initialised yet (load order) */ }
    // Earned titles add small permanent bonuses (titles.js), tree or no tree.
    if (typeof globalThis.getTitleEffectSpecs === 'function') {
        const titleChannels = ptEffectChannels(globalThis.getTitleEffectSpecs());
        for (const channel in titleChannels) totals[channel] = (totals[channel] || 0) + titleChannels[channel];
    }
    const state = typeof globalThis.STATE !== 'undefined' ? globalThis.STATE : null;
    if (!state || !state.passiveTreeAllocated) return totals;
    if (typeof globalThis.isTreeless === 'function' && globalThis.isTreeless()) return totals;

    for (const nodeId of state.passiveTreeAllocated) {
        const node = _PASSIVE_TREE_NODES_BY_ID.get(Number(nodeId));
        if (!node) continue;
        let bonus = null;
        if (node.tier === 'travel') {
            bonus = _PASSIVE_TREE_TRAVEL_BONUSES[node.statKey];
        } else if (node.tier === 'notable') {
            bonus = _PASSIVE_TREE_NOTABLE_BONUSES[node.statKey];
        } else if (node.tier === 'small') {
            bonus = _PASSIVE_TREE_SMALL_BONUSES[node.statKey];
        }
        // Legacy path: statKey -> tier bonus table. Kept for the ~2100
        // nodes not yet converted to the effects pipeline below.
        if (bonus) {
            totals.str += bonus.str || 0;
            totals.agi += bonus.agi || 0;
            totals.int += bonus.int || 0;
            totals.mana += bonus.mana || 0;
            totals.absorptionFlat += bonus.absorptionFlat || 0;
            totals.armourFlat += bonus.armourFlat || 0;
            totals.armourIncPct += bonus.armourIncPct || 0;
            totals.lifeRegenPct += bonus.lifeRegenPct || 0;
            totals.accuracy += bonus.accuracy || 0;
            totals.accuracyIncPct += bonus.accuracyIncPct || 0;
            totals.movementSpeedPct += bonus.movementSpeedPct || 0;
            totals.absorptionIncPct += bonus.absorptionIncPct || 0;
            totals.absorptionRegenRatePct += bonus.absorptionRegenRatePct || 0;
            totals.spellDamageIncPct += bonus.spellDamageIncPct || 0;
            totals.meleeChargeSpeedPct += bonus.meleeChargeSpeedPct || 0;
            totals.attackSpeedPct += bonus.attackSpeedPct || 0;
            totals.physDamageIncPct += bonus.physDamageIncPct || 0;
            totals.meleePhysIncPct += bonus.meleePhysIncPct || 0;
            totals.elementalDamageIncPct += bonus.elementalDamageIncPct || 0;
            totals.fireDamageIncPct += bonus.fireDamageIncPct || 0;
            totals.coldDamageIncPct += bonus.coldDamageIncPct || 0;
            totals.lightningDamageIncPct += bonus.lightningDamageIncPct || 0;
            totals.castSpeedPct += bonus.castSpeedPct || 0;
            totals.fireCastSpeedPct += bonus.fireCastSpeedPct || 0;
            totals.coldCastSpeedPct += bonus.coldCastSpeedPct || 0;
            totals.lightningCastSpeedPct += bonus.lightningCastSpeedPct || 0;
            totals.fireResistFlat += bonus.fireResistFlat || 0;
            totals.coldResistFlat += bonus.coldResistFlat || 0;
            totals.lightningResistFlat += bonus.lightningResistFlat || 0;
            // Percentage maxima are handed to endgame-player-stats.js, which
            // multiplies them onto the flat Life/Mana totals.
            totals.healthIncPct += bonus.healthIncPct || 0;
            totals.manaIncPct += bonus.manaIncPct || 0;
            totals.allElementalResist += bonus.allElementalResist || 0;
            totals.castingAilmentAvoidPct += bonus.castingAilmentAvoidPct || 0;
        }
        // Effects pipeline: a node authored with an `effects` list grants
        // its channels straight from the registry (pt-effects.js) - no
        // statKey lookup and no per-node table entry. The scanner is
        // tier-agnostic here, so keystones can ride it too.
        if (ptNodeHasEffects(node)) {
            const effectChannels = ptEffectChannels(node.effects);
            for (const channel in effectChannels) {
                totals[channel] = (totals[channel] || 0) + effectChannels[channel];
            }
        }
    }
    return totals;
}

// Seconds added to the level timer by passive nodes (timer_start_secs
// effect, nodes 31211/31215/31216). Read by the _initTimer patch in
// probability-tree-expansion.js.
export function _getTreeTimerStartSecs() {
    return _getTreeChannel('timerStartSecs');
}

// One summed passive-tree channel without the rest of the player stats.
// Cheap enough for cost helpers that run on every HUD refresh (Blood Magic
// keystone: manaRemoved / spellsCostLife / spellCostIncPct).
export function _getTreeChannel(channel) {
    return Number(_getPassiveTreeTravelBonuses()[channel]) || 0;
}

// Sanguine Pact keystone: Life can only be recovered from Leech. Every non-leech
// Life gain (regeneration, Hearts, on-kill / on-hit gains, recoup, boss heals)
// passes its amount through here; leech heals do not.
export function _lifeGain(amount) {
    return _getTreeChannel('lifeOnlyFromLeech') > 0 ? 0 : amount;
}

export const LEVELING_ATTRS = [
    { key: 'str', icon: '💪', nameKey: 'eg_stat_strength' },
    { key: 'agi', icon: '🏃', nameKey: 'eg_stat_agility' },
    { key: 'int', icon: '🧠', nameKey: 'eg_stat_intelligence' },
];


//------------------------------------------------------------------------
//-------------------PROGRESSION STATE------------------------------------
//------------------------------------------------------------------------

export function _getPlayerLevel() {
    return (typeof globalThis.STATE !== 'undefined' && globalThis.STATE && globalThis.STATE.playerLevel) || LEVELING_CONFIG.startLevel;
}

export function _getPlayerXP() {
    return (typeof globalThis.STATE !== 'undefined' && globalThis.STATE && globalThis.STATE.playerXP) || 0;
}

export function _getUnspentPoints() {
    return (typeof STATE !== 'undefined' && STATE && STATE.egAttrPoints) || 0;
}

export function _getAllocatedAttributes() {
    if (typeof globalThis.STATE === 'undefined' || !globalThis.STATE || !globalThis.STATE.egAttrAllocated) {
        return { str: 0, agi: 0, int: 0 };
    }
    return globalThis.STATE.egAttrAllocated;
}

// XP required to advance FROM `level` to `level + 1`.
export function _getXpForNextLevel(level) {
    const c = LEVELING_CONFIG;
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

// Pushes the live player level, legacy attributes, and passive-tree travel
// bonuses into shared character systems.
export function _syncBaseAttributes() {
    if (!PLAYER_BASE_ATTRIBUTES) return null;
    const alloc = _getAllocatedAttributes();
    const tree = _getPassiveTreeTravelBonuses();
    PLAYER_BASE_ATTRIBUTES.level = _getPlayerLevel();
    PLAYER_BASE_ATTRIBUTES.str = _ATTR_ORIGINAL_BASE.str + (alloc.str || 0) + tree.str;
    PLAYER_BASE_ATTRIBUTES.agi = _ATTR_ORIGINAL_BASE.agi + (alloc.agi || 0) + tree.agi;
    PLAYER_BASE_ATTRIBUTES.int = _ATTR_ORIGINAL_BASE.int + (alloc.int || 0) + tree.int;
    return tree;
}


//------------------------------------------------------------------------
//-------------------XP GAIN----------------------------------------------
//------------------------------------------------------------------------

// ARPG-style experience multiplier based on the gap between the
// character's level and the monster's level:
//   - Monster inside the safe band → 100% XP.
//   - Monster too far BELOW → ((mLvl + 5) / (safeEdge + 5))^6 (genre formula).
//   - Monster too far ABOVE → mirrored decay against its overhang edge.
// Returns a value clamped to [minMultiplier, 1].
export function _calcXpMultiplier(playerLevel, monsterLevel) {
    const c = LEVELING_CONFIG;
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
export function _getXpTierRanges(playerLevel) {
    const c = LEVELING_CONFIG;
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
export function _buildXpTiersHTML() {
    const c = LEVELING_CONFIG;
    const r = _getXpTierRanges(_getPlayerLevel());
    if (!r) return '';

    const fmtRange = (a, b) => t('eg_lvl_range').replace('{a}', a).replace('{b}', b);

    const rows = [`<div class="sx-xp-tier"><span class="sx-xp-tier-label opt">${t('eg_lvl_tier_optimal')}</span><span>${fmtRange(r.optimalMin, r.optimalMax)}</span></div>`];

    const avgParts = [];
    if (r.belowAvgMin <= r.optimalMin - 1) avgParts.push(fmtRange(r.belowAvgMin, r.optimalMin - 1));
    if (r.aboveAvgMax >= r.optimalMax + 1) avgParts.push(fmtRange(r.optimalMax + 1, r.aboveAvgMax));
    if (avgParts.length) {
        rows.push(`<div class="sx-xp-tier"><span class="sx-xp-tier-label avg">${t('eg_lvl_tier_average')}</span><span>${avgParts.join(' · ')}</span></div>`);
    }

    const poorParts = [];
    if (r.belowPoorMax >= 1) poorParts.push(t('eg_lvl_range_below').replace('{n}', r.belowPoorMax));
    if (r.aboveAvgMax < c.maxLevel && r.optimalMax < c.maxLevel) poorParts.push(t('eg_lvl_range_above').replace('{n}', r.aboveAvgMax + 1));
    if (poorParts.length) {
        rows.push(`<div class="sx-xp-tier"><span class="sx-xp-tier-label poor">${t('eg_lvl_tier_poor')}</span><span>${poorParts.join(' · ')}</span></div>`);
    }

    return rows.join('');
}

// Grants a raw amount of character XP and resolves every level-up it
// triggers. Each gained level now awards passivePointsPerLevel passive tree
// points (attributes come from the passive tree, not from level-ups), plus
// the classic full life/mana/shield refill and level-up effect. Returns the
// number of levels gained. All XP sources (monster kills and campaign level
// completions) funnel through here so progression stays consistent.
export function _awardXP(xpGain) {
    if (typeof STATE === 'undefined' || !STATE) return 0;
    // Dev level lock (js/dev/dev-testing.js): freezes XP so balance tests
    // run at a constant character level. Never set outside the dev harness.
    if (globalThis.__devLevelLock) return 0;
    const c = LEVELING_CONFIG;

    if (_getPlayerLevel() >= c.maxLevel) {
        // Level cap reached - no more XP accumulates.
        if (STATE.playerXP !== 0) { STATE.playerXP = 0; egSaveLevelingState(); }
        return 0;
    }

    const gain = Math.max(0, Math.round(Number(xpGain) || 0));
    if (gain <= 0) return 0;
    Audio_Manager.playSFX('xp_gain');
    STATE.playerXP = _getPlayerXP() + gain;

    let levelsGained = 0;
    let passiveGained = 0;
    while (_getPlayerLevel() < c.maxLevel
        && STATE.playerXP >= _getXpForNextLevel(_getPlayerLevel())) {
        STATE.playerXP -= _getXpForNextLevel(_getPlayerLevel());
        STATE.playerLevel++;
        levelsGained++;
        // Legacy: attribute points per level are disabled (0) now, but the
        // field is still honoured if a future pass re-enables it.
        if (c.attrPointsPerLevel) STATE.egAttrPoints = (STATE.egAttrPoints || 0) + c.attrPointsPerLevel;
        passiveGained += (c.passivePointsPerLevel || 0);
    }
    if (_getPlayerLevel() >= c.maxLevel) STATE.playerXP = 0;

    if (passiveGained > 0) {
        STATE.passiveTreePoints = (STATE.passiveTreePoints || 0) + passiveGained;
        if (typeof _incDirect === 'function') try { _incDirect('lifetimePassivePointsObtained', passiveGained); } catch (e) {}
        // Slightly after the level-up fanfare so the two don't mask each other.
        setTimeout(() => Audio_Manager.playSFX('passive_point_gain'), 700);
    }

    _syncBaseAttributes();
    egSaveLevelingState();
    _renderLevelHUD();
    if (typeof setAchStat === 'function') try { setAchStat('egPlayerLevel', _getPlayerLevel()); } catch(e){}

    if (levelsGained > 0) {
        // Reset all active ability cooldowns on level up
        if (typeof resetActiveCooldown === 'function') {
            globalThis.resetActiveCooldown();
        }

        // Level-up bonus: +5 max Life and +2 max Mana per level gained,
        // with the newly granted amounts restored to the current pools.
        if (typeof playerMaxHP !== 'undefined' && typeof playerCurrentHP !== 'undefined') {
            const lifeMult = (typeof _egMapPlayerLifeMult === 'function')
                ? _egMapPlayerLifeMult() : 1;
            const lifeGain = _getTreeChannel('lifeBecomesOne') > 0 ? 0
                : Math.round(levelsGained * 5 * lifeMult * (1 + _getTreeChannel('healthMorePct') / 100));
            globalThis.playerMaxHP = Math.max(1, globalThis.playerMaxHP + lifeGain);
            globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + lifeGain);
        }
        if (typeof gainMana === 'function'
            && typeof playerMaxMana !== 'undefined' && globalThis.playerMaxMana > 0) {
            gainMana(levelsGained * 2);
        }

        _playLevelUpEffect(_getPlayerLevel());
        _playLevelUpReward();
        // Absorption shield: fully replenish even when not in an active encounter
        // (_playLevelUpReward already handles the active case and early-returns otherwise).
        if ((typeof _isActive !== 'function' || !_isActive())
            && typeof _computePlayerStats === 'function'
            && typeof _playerAbsorptionCurrent !== 'undefined') {
            globalThis._playerAbsorptionCurrent = _computePlayerStats().absorption || 0;
            if (typeof _cancelAbsorptionRegen === 'function') _cancelAbsorptionRegen();
        }
        if (typeof showToast === 'function') {
            // Key label follows the player's CURRENT binding (default K).
            const treeKey = (typeof keybindDisplayLabel === 'function' && typeof keybindKeyFor === 'function')
                ? globalThis.keybindDisplayLabel(globalThis.keybindKeyFor('passive-tree')) : 'K';
            const msg = t('eg_lvl_levelup_toast')
                .replace('{n}', _getPlayerLevel())
                .replace('{pts}', passiveGained)
                .replace('{key}', treeKey);
            globalThis.showToast(msg, '#f5b642');
        }
        if (typeof _renderStatsList === 'function') _renderStatsList();
        if (typeof _renderInventory === 'function') try { _renderInventory(); } catch (e) {}
        if (typeof _renderEquipSlots === 'function') try { _renderEquipSlots(); } catch (e) {}
    }
    return levelsGained;
}

// Awards XP for killing one monster of `monsterLevel`: the kill value is
// scaled by the ARPG-style range multiplier against the character level and
// by the active map's "% more Experience" bonus (neutral outside runs),
// then handed to _awardXP.
export function _grantMonsterXP(monsterLevel, isBoss) {
    if (typeof STATE === 'undefined' || !STATE) return;
    if (_getPlayerLevel() >= LEVELING_CONFIG.maxLevel) {
        if (STATE.playerXP !== 0) { STATE.playerXP = 0; egSaveLevelingState(); }
        return;
    }

    const playerLevel = _getPlayerLevel();
    const mLvl = Math.max(1, Number(monsterLevel) || 1);
    const c = LEVELING_CONFIG;
    let xp = c.xpPerKillBase + c.xpPerKillGrowth * Math.pow(mLvl, c.xpPerKillExp);
    if (isBoss) xp *= c.bossXpMultiplier;
    const mapXpMult = (typeof _egMapXpMult === 'function') ? _egMapXpMult() : 1;
    xp = Math.max(1, Math.round(xp * _calcXpMultiplier(playerLevel, mLvl) * mapXpMult));

    _awardXP(xp);
    return globalThis.__devLevelLock ? 0 : xp;
}

// Floating "+N XP" text over a defeated monster's card (classic MMO style:
// violet number drifting up and fading). Lives on <body> as a fixed element
// so it outlives the card's kill animation. Cosmetic only.
export function _showXpGainText(monsterId, xp) {
    if (!(xp > 0)) return;
    const card = document.getElementById(`sx-card-${monsterId}`);
    if (!card) return;
    const r = card.getBoundingClientRect();
    if (!r.width) return;
    const el = document.createElement('div');
    el.className = 'sx-xp-float';
    el.textContent = `+${xp} XP`;
    el.style.left = `${Math.round(r.left + r.width / 2)}px`;
    el.style.top = `${Math.round(r.top + r.height * 0.25)}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
}

// Progress to the next level in percent (100 at max level).
function _xpBarPct() {
    const lvl = _getPlayerLevel();
    if (lvl >= LEVELING_CONFIG.maxLevel) return 100;
    return Math.min(100, (_getPlayerXP() / Math.max(1, _getXpForNextLevel(lvl))) * 100);
}

// Highlights a just-earned XP gain on the bar: a bright band over the newly
// filled stretch (from -> to, in percent) plus a "+N XP" label above it.
export function _showXpBarGain(xp, from, to) {
    const bar = document.getElementById('sx-xp-bar');
    const gain = document.getElementById('sx-xp-bar-gain');
    if (!bar || !gain || !(xp > 0) || bar.getBoundingClientRect().width === 0) return;
    gain.style.left = `${from}%`;
    gain.style.width = `${Math.max(0.8, to - from)}%`;
    gain.classList.remove('on');
    void gain.offsetWidth;
    gain.classList.add('on');
    const el = document.createElement('div');
    el.className = 'sx-xp-bar-text';
    el.textContent = `+${xp} XP`;
    const x = Math.round(window.innerWidth * Math.max(from, to) / 100);
    el.style.left = `${Math.min(window.innerWidth - 50, Math.max(50, x))}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
}

// Experience bar along the very bottom edge of the game screen (#sx-xp-bar,
// classic MMO style). Fill width = progress to the next level; hovering it
// shows how much XP is still missing (generic data-tip tooltip).
let _xpBarLastKey = '';
let _xpBarLastPct = 0;
export function _renderXpBar() {
    const bar = document.getElementById('sx-xp-bar');
    const fill = document.getElementById('sx-xp-bar-fill');
    if (!bar || !fill) return;
    const lvl = _getPlayerLevel();
    const xp = _getPlayerXP();
    const maxed = lvl >= LEVELING_CONFIG.maxLevel;
    const need = maxed ? 0 : _getXpForNextLevel(lvl);
    const key = `${lvl}|${xp}|${need}`;
    if (key === _xpBarLastKey) return;
    _xpBarLastKey = key;
    const pct = maxed ? 100 : Math.min(100, (xp / Math.max(1, need)) * 100);
    // After a level-up the bar wraps back to ~0: snap instead of sweeping backwards.
    fill.style.transition = pct < _xpBarLastPct ? 'none' : '';
    fill.style.width = `${pct}%`;
    _xpBarLastPct = pct;
    const tip = maxed
        ? t('eg_xp_bar_tip_max').replace('{lvl}', lvl)
        : t('eg_xp_bar_tip')
            .replace('{lvl}', lvl).replace('{cur}', xp).replace('{need}', need)
            .replace('{pct}', pct.toFixed(1)).replace('{rem}', Math.max(0, need - xp)).replace('{next}', lvl + 1);
    bar.setAttribute('data-tip', tip);
}
setInterval(() => { try { _renderXpBar(); } catch (e) { /* cosmetic */ } }, 700);


//------------------------------------------------------------------------
//-------------------CAMPAIGN PROGRESSION---------------------------------
//------------------------------------------------------------------------
// The campaign awards XP from the very first level, so the player arrives
// at the atlas around campaignEndLevel instead of level 1:
//   • Completing a story level grants a FRACTION of the XP required for
//     that level's expected character level - a first clear grants
//     campaignFirstClearFraction, a replay campaignReplayFraction of that.
//   • Monsters spawning in every campaign level grant kill XP through the
//     normal _grantMonsterXP path; their level tracks the expected level
//     so the ARPG range multiplier stays ~1 during normal play.
// Both are scaled by _calcXpMultiplier(), so re-farming content far below
// the character's level gives almost nothing (anti-farm, ARPG-style).

export let _campaignLevelCountCache = null;

// Number of story levels in the campaign (excludes monster/endgame levels).
export function _campaignTotalLevels() {
    if (_campaignLevelCountCache != null) return _campaignLevelCountCache;
    let n = 0;
    if (typeof ALL !== 'undefined' && globalThis.ALL) {
        for (const lvl of globalThis.ALL) {
            if (lvl && !lvl.isMonsterLevel && !lvl.isEndgameSandbox) n++;
        }
    }
    _campaignLevelCountCache = n;
    return n;
}

// Character level a player is expected to be at when completing story level
// `gi`, spread linearly from 1 to campaignEndLevel across the campaign.
// Drives both level-completion XP and campaign monster levels.
export function _campaignExpectedLevel(gi) {
    const n = _campaignTotalLevels();
    if (n <= 1) return 1;
    const end = LEVELING_CONFIG.campaignEndLevel || 68;
    const idx = Math.max(0, Math.min(n - 1, Number(gi) || 0));
    return 1 + (end - 1) * idx / (n - 1);
}

// Monster level for campaign monsters on story level `gi`.
export function _campaignMonsterLevel(gi) {
    return Math.max(1, Math.round(_campaignExpectedLevel(gi)));
}

// Awards level-completion XP for story level `gi`. Called from checkWin()
// on every campaign clear (first clear and replay alike). No-ops during
// endgame map/chain runs.
export function _grantCampaignLevelXP(gi, isFirstClear) {
    if (typeof STATE === 'undefined' || !STATE) return 0;
    if (typeof cur === 'undefined' || !cur) return 0;
    // Never award campaign XP during an endgame map/chain run.
    if (cur.isMonsterLevel && !cur.campaignMonsters) return 0;
    if (_getPlayerLevel() >= LEVELING_CONFIG.maxLevel) return 0;

    const c = LEVELING_CONFIG;
    const refLevel = Math.max(1, Math.round(_campaignExpectedLevel(gi)));
    const base = _getXpForNextLevel(refLevel);
    const fraction = c.campaignFirstClearFraction
        * (isFirstClear ? 1 : (c.campaignReplayFraction || 0));
    const mult = _calcXpMultiplier(_getPlayerLevel(), refLevel);
    const xp = Math.max(1, Math.round(base * fraction * mult));
    // Show the gain on the XP bar once the win overlay is coming up.
    const lvl0 = _getPlayerLevel();
    const pct0 = _xpBarPct();
    const levels = _awardXP(xp);
    const from = _getPlayerLevel() > lvl0 ? 0 : pct0;
    const to = _xpBarPct();
    setTimeout(() => _showXpBarGain(xp, from, to), 900);
    return levels;
}


//------------------------------------------------------------------------
//-------------------LEVEL-UP REWARD (ENDGAME)----------------------------
//------------------------------------------------------------------------

// Instant reward for levelling up during an active endgame encounter:
//   - Life, mana and the absorption shield are completely refilled.
//   - 3 waves of projectiles (0.5 s apart) launch at EVERY monster on
//     screen, each hitting with correct-reveal projectile damage.
export const LEVELUP_REWARD_WAVES = 3;
export const LEVELUP_REWARD_WAVE_DELAY_MS = 500;

export function _playLevelUpReward() {
    if (typeof _isActive !== 'function' || !_isActive()) return;

    // Full life, mana & absorption shield restore (after the +max bonuses were applied).
    if (typeof playerMaxHP !== 'undefined' && typeof playerCurrentHP !== 'undefined') {
        globalThis.playerCurrentHP = globalThis.playerMaxHP;
        if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
    }
    if (typeof _resetPlayerMana === 'function') _resetPlayerMana();
    // Fully replenish the absorption shield
    if (typeof _computePlayerStats === 'function' && typeof _playerAbsorptionCurrent !== 'undefined') {
        const maxAbs = _computePlayerStats().absorption || 0;
        globalThis._playerAbsorptionCurrent = maxAbs;
        if (typeof _cancelAbsorptionRegen === 'function') _cancelAbsorptionRegen();
        if (typeof _renderPlayerAvatar === 'function') try { globalThis._renderPlayerAvatar(); } catch (e) {}
    }

    // Snapshot the monsters on screen now; each wave skips ones that died
    // in the meantime. Damage matches a correct-reveal projectile hit.
    if (typeof _monsters === 'undefined' || !globalThis._monsters.length) return;
    const targetIds = globalThis._monsters.map(m => m.id);
    const revealPct = _getRevealProjectileDamagePct() / 100;

    for (let wave = 0; wave < LEVELUP_REWARD_WAVES; wave++) {
        setTimeout(() => {
            if (!_isActive()) return;
            targetIds.forEach(id => {
                if (!globalThis._monsters.some(m => m.id === id)) return;
                const rolled = _calcPlayerDamage();
                const damage = Math.max(1, Math.round(rolled * revealPct));
                const elements = _scaleElements(_lastHitElements, revealPct);
                _animatePlayerProjectile(damage, id, undefined, undefined, undefined, undefined, elements);
            });
        }, wave * LEVELUP_REWARD_WAVE_DELAY_MS);
    }
}


//------------------------------------------------------------------------
//-------------------LEVEL-UP EFFECT--------------------------------------
//------------------------------------------------------------------------

// Full-screen gold flash + expanding "LEVEL UP!" banner. Pure CSS animation,
// element removes itself after the effect finishes. Safe mid-combat (the
// overlay ignores pointer events).
export function _playLevelUpEffect(newLevel) {
    Audio_Manager.playSFX('level_up');
    const el = document.createElement('div');
    el.className = 'sx-levelup-fx';
    el.innerHTML = `
<div class="sx-levelup-banner">
    <div class="sx-levelup-title">${t('eg_lvl_banner')}</div>
    <div class="sx-levelup-sub">${t('eg_lvl_levelup_sub').replace('{n}', newLevel)}</div>
</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
}


//------------------------------------------------------------------------
//-------------------ATTRIBUTE ALLOCATION & REFUND------------------------
//------------------------------------------------------------------------

// Spends one unspent point on `attr` ('str' | 'agi' | 'int').
export function _allocateAttribute(attr) {
    if (!(attr in _ATTR_ORIGINAL_BASE)) return false;
    if (_getUnspentPoints() <= 0) {
        if (typeof showToast === 'function') globalThis.showToast(t('eg_lvl_no_points'), '#e74c3c');
        return false;
    }

    STATE.egAttrPoints--;
    STATE.egAttrAllocated[attr] = (STATE.egAttrAllocated[attr] || 0) + 1;
    _syncBaseAttributes();
    egSaveLevelingState();
    Audio_Manager.playSFX('attribute_allocate');

    if (typeof showToast === 'function') {
        const name = t(LEVELING_ATTRS.find(a => a.key === attr).nameKey);
        globalThis.showToast(t('eg_lvl_alloc_done').replace('{attr}', name), '#2ecc71');
    }

    _renderLevelHUD();
    if (typeof _renderStatsList === 'function') _renderStatsList();
    return true;
}

// Evaluates the equipped loadout with `attr` temporarily reduced by one
// point and returns the resulting unmet requirements. The real base value
// is always restored, even when the check throws.
export function _simulateRefundUnmet(attr) {
    if (!(attr in _ATTR_ORIGINAL_BASE)) return [];
    if (typeof _findUnmetRequirements !== 'function'
        || typeof _getAllEquippedItems !== 'function') return [];

    const saved = PLAYER_BASE_ATTRIBUTES[attr];
    PLAYER_BASE_ATTRIBUTES[attr] = saved - 1;
    try {
        return _findUnmetRequirements(_getAllEquippedItems());
    } finally {
        PLAYER_BASE_ATTRIBUTES[attr] = saved;
    }
}

// True when removing one point of `attr` is legal:
//   - at least one allocated point exists on that attribute, AND
//   - the equipped gear stays fully valid afterwards (no NEW unmet
//     requirements compared to the current state - same grandfather rule
//     the equip gate uses).
export function _canRefundAttribute(attr) {
    if ((_getAllocatedAttributes()[attr] || 0) <= 0) return false;
    if (typeof _findUnmetRequirements !== 'function') return true;
    const before = _findUnmetRequirements(_getAllEquippedItems());
    const after = _simulateRefundUnmet(attr);
    return after.length <= before.length;
}

// Verified refund: returns one spent point to the unspent pool unless the
// equipped gear depends on the attribute (blocked with an explanatory toast).
export function _refundAttribute(attr) {
    if (!(attr in _ATTR_ORIGINAL_BASE)) return false;

    if (!_canRefundAttribute(attr)) {
        if (typeof showToast === 'function') {
            const missing = _simulateRefundUnmet(attr);
            const list = typeof _getUnmetRequirementsText === 'function'
                ? _getUnmetRequirementsText(missing)
                : '';
            globalThis.showToast(t('eg_lvl_refund_blocked').replace('{list}', list || '?'), '#e74c3c');
        }
        return false;
    }

    STATE.egAttrAllocated[attr] = (STATE.egAttrAllocated[attr] || 0) - 1;
    STATE.egAttrPoints = (STATE.egAttrPoints || 0) + 1;
    _syncBaseAttributes();
    egSaveLevelingState();
    Audio_Manager.playSFX('attribute_refund');

    if (typeof showToast === 'function') {
        const name = t(LEVELING_ATTRS.find(a => a.key === attr).nameKey);
        globalThis.showToast(t('eg_lvl_refund_done').replace('{attr}', name), '#2ecc71');
    }

    _renderLevelHUD();
    if (typeof _renderStatsList === 'function') _renderStatsList();
    return true;
}


//------------------------------------------------------------------------
//-------------------PERSISTENCE------------------------------------------
//------------------------------------------------------------------------

export function egSaveLevelingState() {
    if (typeof save === 'function') save();
}

// Reads leveling fields from STATE (with defaults for legacy saves) and
// applies them to the shared base attributes object.
export function _loadLevelingState() {
    if (typeof globalThis.STATE === 'undefined' || !globalThis.STATE) return;
    if (!globalThis.STATE.playerLevel) globalThis.STATE.playerLevel = LEVELING_CONFIG.startLevel;
    if (!globalThis.STATE.playerXP) globalThis.STATE.playerXP = 0;
    if (!globalThis.STATE.egAttrPoints) globalThis.STATE.egAttrPoints = 0;
    if (!globalThis.STATE.egAttrAllocated) globalThis.STATE.egAttrAllocated = { str: 0, agi: 0, int: 0 };
    _syncBaseAttributes();
    if (typeof setAchStat === 'function') try { setAchStat('egPlayerLevel', _getPlayerLevel()); } catch(e){}
}


//------------------------------------------------------------------------
//-------------------HUD (INLINE CHIP)---------------------------------------
//------------------------------------------------------------------------

// Refreshes the small level chip on the character panel label. It is optional
// and this no-ops outside the hub.
export function _renderLevelHUD() {
    _renderXpBar();
    const pts = _getUnspentPoints();
    const lvl = _getPlayerLevel();
    const xp = _getPlayerXP();
    const need = _getXpForNextLevel(lvl);
    const pct = lvl >= LEVELING_CONFIG.maxLevel ? 100 : Math.min(100, (xp / need) * 100);

    const chip = document.getElementById('sx-char-level-inline');
    if (chip) {
        const ptsHtml = pts > 0
            ? `<span class="sx-lvl-chip-points">✦${pts > 99 ? '99+' : pts}</span>`
            : '';
        chip.innerHTML = `
<span class="sx-lvl-chip"
      onmouseenter="_showLevelBtnTooltip(event)"
      onmousemove="moveGameTooltip(event)"
      onmouseleave="hideGameTooltip()">
    <span class="sx-lvl-chip-lvl">${t('eg_lvl_short').replace('{n}', lvl)}</span>
    <span class="sx-lvl-chip-bar"><span class="sx-lvl-chip-bar-fill" style="width:${pct}%"></span></span>
    ${ptsHtml}
</span>`;
    }

    // Keep the Probability Gate topbar level chip in sync (lives in endgame-gate.js).
    if (typeof _egRenderGateLevelChip === 'function') {
        try { _egRenderGateLevelChip(); } catch (e) {}
    } else {
        const gateChip = document.getElementById('eg-gate-level-chip');
        if (gateChip) {
            const ptsHtml2 = pts > 0 ? `<span class="sx-lvl-chip-points">✦${pts > 99 ? '99+' : pts}</span>` : '';
            const lvlLabel2 = (typeof t === 'function') ? t('eg_lvl_short').replace('{n}', lvl) : `Lv. ${lvl}`;
            gateChip.innerHTML = `<span class="sx-lvl-chip" style="pointer-events:none;"><span class="sx-lvl-chip-lvl">${lvlLabel2}</span><span class="sx-lvl-chip-bar"><span class="sx-lvl-chip-bar-fill" style="width:${pct}%"></span></span>${ptsHtml2}</span>`;
        }
    }
}


//------------------------------------------------------------------------
//-------------------TOPBAR BUTTON TOOLTIP--------------------------------
//------------------------------------------------------------------------

// Hover tooltip for the level indicators, built on the shared game
// tooltip engine (tooltips-hud.js) instead of the native browser title.
export function _buildLevelBtnTooltipHTML() {
    const lvl = _getPlayerLevel();
    const xp = _getPlayerXP();
    const atMax = lvl >= LEVELING_CONFIG.maxLevel;
    const xpLine = atMax
        ? t('eg_lvl_max_level')
        : t('eg_lvl_xp_progress')
            .replace('{cur}', xp.toLocaleString())
            .replace('{need}', _getXpForNextLevel(lvl).toLocaleString());
    const xpTiers = _buildXpTiersHTML();

    return `
<div class="sx-tt-frame" style="--tt-border:#c8a84b;">
    <div class="sx-tt-header">
        <div class="sx-tt-icon">✦</div>
        <div class="sx-tt-name" style="color:#f5d98a;">${t('eg_lvl_window_title')}</div>
    </div>
    <div class="sx-tt-section">
        <div class="sx-tt-mod">${t('eg_lvl_short').replace('{n}', lvl)} · ${xpLine}</div>
    </div>
    ${xpTiers ? `<div class="sx-xp-tiers">${xpTiers}</div>` : ''}
    <div class="sx-tt-section">${t('eg_lvl_hint')}</div>
</div>`;
}

export function _showLevelBtnTooltip(e) {
    if (typeof showGameTooltip === 'function') globalThis.showGameTooltip(_buildLevelBtnTooltipHTML(), e);
}


//------------------------------------------------------------------------
//-------------------STYLES------------------------------------------------
//------------------------------------------------------------------------

// Injects all leveling UI styles once (inline chip, XP tiers, effects).
export function _injectLevelingStyles() {
    if (document.getElementById('sx-leveling-styles')) return;
    const style = document.createElement('style');
    style.id = 'sx-leveling-styles';
    style.textContent = `
/* ── Topbar buttons ── */
.sx-level-btn { position: relative; color: #f5d98a; font-size: 14px; }

/* ── Inline level chip on the character panel ── */
.sx-char-label-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
#sx-char-level-inline { cursor: help; }
.sx-lvl-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #c8a84b;
}
.sx-lvl-chip:hover .sx-lvl-chip-lvl { text-shadow: 0 0 6px rgba(245,217,138,.8); }
.sx-lvl-chip-lvl { letter-spacing: .5px; }
.sx-lvl-chip-bar {
    width: 64px; height: 6px;
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(200,168,75,.45);
    border-radius: 3px;
    overflow: hidden;
}
.sx-lvl-chip-bar-fill { display: block; height: 100%; background: linear-gradient(90deg,#8a6d2b,#f5d98a); }
.sx-lvl-chip-points {
    background: #c8a84b;
    color: #1a1408;
    border-radius: 8px;
    padding: 0 5px;
    font-weight: 700;
    animation: sx-lvl-pulse 1.6s ease-in-out infinite;
}
@keyframes sx-lvl-pulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.35); }
}

.sx-xp-tiers {
    display: flex;
    flex-direction: column;
    gap: 3px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 6px;
    padding: 7px 10px;
    margin-bottom: 10px;
}
.sx-xp-tier { display: flex; justify-content: space-between; gap: 10px; font-size: 10px; opacity: .85; }
.sx-xp-tier-label { font-weight: 700; white-space: nowrap; }
.sx-xp-tier-label.opt { color: #2ecc71; }
.sx-xp-tier-label.avg { color: #f5d98a; }
.sx-xp-tier-label.poor { color: #e06c55; }

/* ── Level-up effect ── */
.sx-levelup-fx {
    position: fixed;
    inset: 0;
    z-index: 10050;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, rgba(245,185,66,.28) 0%, rgba(245,185,66,.08) 35%, transparent 65%);
    animation: sx-lvl-flash 2.8s ease-out forwards;
}
@keyframes sx-lvl-flash {
    0% { opacity: 0; }
    12% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
}
.sx-levelup-banner { text-align: center; animation: sx-lvl-pop 2.8s ease-out forwards; }
@keyframes sx-lvl-pop {
    0% { transform: scale(.4); opacity: 0; }
    15% { transform: scale(1.15); opacity: 1; }
    25% { transform: scale(1); }
    80% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1.05) translateY(-14px); opacity: 0; }
}
.sx-levelup-title {
    font-family: var(--PX, monospace);
    font-size: 44px;
    font-weight: 700;
    letter-spacing: 4px;
    color: #f5d98a;
    text-shadow: 0 0 18px rgba(245,185,66,.9), 0 0 40px rgba(245,185,66,.5), 0 2px 0 #6b5316;
}
.sx-levelup-sub {
    margin-top: 6px;
    font-family: var(--PX, monospace);
    font-size: 15px;
    letter-spacing: 2px;
    color: #fff;
    text-shadow: 0 0 10px rgba(245,185,66,.8);
}

`;
    document.head.appendChild(style);
}


//------------------------------------------------------------------------
//-------------------BOOTSTRAP--------------------------------------------
//------------------------------------------------------------------------

// Loads saved progression immediately (same pattern as _loadHubState in
// endgame-hub.js) so level requirements are enforced without visiting the hub.
_loadLevelingState();
_injectLevelingStyles();
