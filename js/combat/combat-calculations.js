import { EG_MELEE_OVERCHARGE_MULT } from './encounter.js';
import { _egMapPlayerDamageMult, _egMapPlayerMeleeMult } from '../endgame/endgame-map-launch.js';
import { EG_PLAYER_STATS, _egComputePlayerStats, _egRollCrit } from '../endgame/endgame-player-stats.js';
import { _egQuizDamageBuffMult } from '../endgame/endgame-quiz-buffs.js';
import { EG_PLAYER_MELEE_DAMAGE } from './combat-state.js';
import { EG_RIPOSTE_BASE_MORE_PCT, _egConsumeRiposte } from './combat-ailments-state.js';
import { _egGetTarget } from './encounter-charged-shot.js';
import { _egApplyDamageConversion, _egLeechAbsorption, _egLeechHealMult, _egLeechMana, _egRollElementalBreakdown } from './combat-calculations-resistances.js';

//------------------------------------------------------------------------
//-------------------PLAYER DAMAGE CALCULATION----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Per-element breakdown of the most recent _egCalcPlayerDamage() roll.
// Consumed by impact handlers to apply monster resistances per element.
export let _egLastHitElements = null;
export let _egLastHitWasCrit = false;
export let _egLastHitCritMult = 1;

// Situational passive-tree damage lines (per 10 correct fills, flawless, low
// timer, after a line, after a mistake). Returns one multiplier for a single
// Attack roll; the "next Attack after a mistake" bonus is consumed here.
export function _egCrossoverDamageMult(stats) {
    // ARPG rule: these lines are all "increased" damage, so they add into
    // one bucket (returned as 1 + sum) instead of multiplying each other.
    let sum = 0;
    const flags = globalThis.LEVEL_FLAGS;

    const perStreak = Number(stats.damagePerStreakPct) || 0;
    if (perStreak > 0) {
        const steps = Math.floor((Number(flags && flags.fillRun) || 0) / 10);
        sum += (perStreak * steps) / 100;
    }

    const flawless = Number(stats.damageFlawlessPct) || 0;
    if (flawless > 0 && (Number(globalThis.mistakeCount) || 0) === 0) sum += flawless / 100;

    const lowTime = Number(stats.damageLowTimePct) || 0;
    const startTimer = Number(globalThis._levelStartTimerSecs) || 0;
    if (lowTime > 0 && startTimer > 0 && (Number(globalThis.timerSecs) || 0) < startTimer * 0.25) {
        sum += lowTime / 100;
    }

    const afterLine = Number(stats.damageAfterLinePct) || 0;
    if (afterLine > 0 && flags && Number(flags.damageAfterLineUntil) > Date.now()) sum += afterLine / 100;

    const onMistake = Number(stats.damageOnMistakePct) || 0;
    if (flags && flags.damageOnMistakePending) {
        flags.damageOnMistakePending = false;
        if (onMistake > 0) sum += onMistake / 100;
    }
    return 1 + sum;
}

export function _egCalcPlayerDamage() {
    const stats = _egComputePlayerStats();

    // ARPG layering: every "increased damage" line that applies to a hit
    // adds into ONE bucket per damage share (physical / each element); only the
    // deliberate "more" steps below multiply. Generic damage, projectile damage and
    // the situational lines apply to both shares.
    const sitPct = (_egCrossoverDamageMult(stats) - 1) * 100;
    const genericPct = (stats.damageIncPct || 0) + (stats.projectileDamageIncPct || 0) + sitPct;

    let dmg = EG_PLAYER_STATS.baseDamage;
    dmg += stats.physFlatMin + (stats.physFlatMax - stats.physFlatMin) * Math.random();
    dmg *= (1 + ((stats.physIncPct || 0) + genericPct) / 100);

    // Elemental damage adds after the physical share. Its bucket is general
    // elemental + projectile elemental + the element's own increase + generic.
    // The per-element breakdown is kept in _egLastHitElements (already increased)
    // so the impact site can apply the target monster's elemental resistances.
    const elemBase = (stats.elementalDamageIncPct || 0) + (stats.projectileElementalDamageIncPct || 0) + genericPct;
    const elements = _egRollElementalBreakdown(stats);
    elements.fire *= 1 + (elemBase + (stats.fireDamageIncPct || 0)) / 100;
    elements.cold *= 1 + (elemBase + (stats.coldDamageIncPct || 0)) / 100;
    elements.lightning *= 1 + (elemBase + (stats.lightningDamageIncPct || 0)) / 100;
    elements.shadow *= 1 + (elemBase + (stats.shadowDamageIncPct || 0)) / 100;
    // Fire conversion / fire-only (Primal Flame keystone).
    const converted = _egApplyDamageConversion(stats, dmg, elements, {
        fire: 1 + (elemBase + (stats.fireDamageIncPct || 0)) / 100,
        cold: 1 + (elemBase + (stats.coldDamageIncPct || 0)) / 100,
        lightning: 1 + (elemBase + (stats.lightningDamageIncPct || 0)) / 100,
        shadow: 1 + (elemBase + (stats.shadowDamageIncPct || 0)) / 100,
    });
    dmg = converted.physical;
    _egLastHitElements = converted.elements;
    dmg += converted.elements.fire + converted.elements.cold + converted.elements.lightning + converted.elements.shadow;

    // Frenzy Charges: a "more" step on projectile damage per live charge.
    dmg *= 1 + (stats.frenzyDamageMorePct || 0) / 100;
    // Residual Plot (Statistician passive node): 15% increased damage for 10
    // seconds after Data Strike (LEVEL_FLAGS.residualPlotUntil, set on cast).
    if (globalThis.LEVEL_FLAGS && Number(globalThis.LEVEL_FLAGS.residualPlotUntil) > Date.now()) dmg *= 1.15;

    // Projectile crit chance (passive tree) is added to the base crit chance
    // for this roll only - melee strikes never read it.
    const critMult = _egRollCrit(stats, {
        chance: stats.projectileCritChancePct || 0,
        multiplierPct: stats.projectileCritMultiplierPct || 0,
    });
    _egLastHitWasCrit = critMult > 1;
    _egLastHitCritMult = critMult;
    dmg *= critMult;

    // Active map run: apply the "% reduced player Damage" map mod.
    if (typeof _egMapPlayerDamageMult === 'function') dmg *= _egMapPlayerDamageMult();

    // Temporary quiz reward buff: +10% damage for a short window.
    if (typeof _egQuizDamageBuffMult === 'function') dmg *= _egQuizDamageBuffMult();

    dmg = Math.max(1, Math.round(dmg));

    if ((stats.manaLeechAttackPct || 0) > 0) _egLeechMana(stats, dmg, stats.manaLeechAttackPct);
    // Life leech - heal the player for a % of the damage about to be dealt.
    if (stats.lifeLeechPct > 0 && (stats.lifeLeechAsAbsorption || 0) > 0) {
        // Ghost Reaver keystone: the leech refills Absorption instead.
        _egLeechAbsorption(stats, dmg, stats.lifeLeechPct);
    } else if (stats.lifeLeechPct > 0 && typeof playerCurrentHP !== 'undefined') {
        const heal = Math.round(dmg * (stats.lifeLeechPct / 100) * _egLeechHealMult(stats));
        if (heal > 0) {
            globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + heal);
            if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
        }
    }

    return dmg;
}


// Per-element breakdown of the most recent _egCalcPlayerMeleeDamage() roll.
// Passed to _egDamageTargetById so melee hits get the same resistance /
// ailment / hit-burst treatment as projectiles.
export let _egLastMeleeElements = null;
export let _egLastMeleeWasCrit = false;
export let _egLastMeleeCritMult = 1;

// Manual melee channel (Secret-of-Mana-style) - fully independent from
// projectiles: rolls the equipped weapon's base damage range plus its
// "… to Melee Strikes" mods and unscoped sources (bracers/rings/amulet),
// already doubled for manual pacing in _egComputePlayerStats, scaled by
// % increased physical damage and crit. Falls back to the flat base
// punch when no weapon damage exists. Projectiles use
// _egCalcPlayerDamage() instead (see _egComputePlayerStats for routing).
// `chargePct` (0..5) scales the whole roll - callers pass the spent manual
// charge share (see _egApplyPlayerMeleeImpact in encounter-charged-shot.js).
export function _egCalcPlayerMeleeDamage(chargePct = 1) {
    const stats = _egComputePlayerStats();
    // Manual charge share (Secret-of-Mana-style, linear): 1 = fully-charged
    // full damage. Applied up front so crit, map mods AND life leech below
    // all operate on the scaled hit - chip hits can't leech full damage.
    // Values above 1 are OVERCHARGE (held past full) and scale the hit
    // proportionally up to EG_MELEE_OVERCHARGE_MULT (5 = 500% for the grand
    // nova), on top of which the weapon-art tier fires (see _egMeleeTierArt).
    const charge = Math.min(
        (typeof EG_MELEE_OVERCHARGE_MULT === 'number') ? EG_MELEE_OVERCHARGE_MULT : 1,
        Math.max(0, Number(chargePct) || 0));

    // ARPG layering: generic melee increase, weapon stance, weapon family,
    // generic damage, dagger damage and the situational lines are ONE additive bucket
    // for the physical share (and generic/dagger/situational also feed the elemental
    // bucket below). Rage, riposte, double damage and crit stay multiplicative.
    const sitPct = (_egCrossoverDamageMult(stats) - 1) * 100;
    const genericPct = (stats.damageIncPct || 0) + sitPct + (stats.isDaggerEquipped ? (stats.daggerDamageIncPct || 0) : 0);
    let dmg;
    if (stats.meleePhysMax > 0) {
        dmg = stats.meleePhysMin + (stats.meleePhysMax - stats.meleePhysMin) * Math.random();
        // Weapon-stance split from the passive tree (melee batch): Heavy
        // with a two-handed weapon equipped, one-handed otherwise (1H +
        // shield, dual-wield or unarmed). Exactly one side applies, on top
        // of the generic increase above.
        const stanceIncPct = stats.isHeavyWeaponEquipped
            ? (stats.meleePhysHeavyIncPct || 0)
            : (stats.meleePhys1HIncPct || 0);
        // Weapon family (sword/axe batch): its own multiplier, only for the
        // matching family of the equipped weapon.
        const familyIncPct = stats.isSwordEquipped ? (stats.meleePhysSwordIncPct || 0)
            : stats.isAxeEquipped ? (stats.meleePhysAxeIncPct || 0)
            : stats.isMaceEquipped ? (stats.meleePhysMaceIncPct || 0)
            : stats.isStaffEquipped ? (stats.staffDamageIncPct || 0)
            : stats.isWandEquipped ? (stats.wandDamageIncPct || 0) : 0;
        dmg *= 1 + ((stats.meleePhysIncPct || 0) + stanceIncPct + familyIncPct + genericPct) / 100;
        // Rage (axe notable 369): each Rage is a "more" step on melee damage.
        if ((stats.rage || 0) > 0) dmg *= 1 + (stats.rage * (stats.rageMeleeMorePct || 0)) / 100;
    } else {
        // Unarmed / no weapon damage - flat fallback strike
        dmg = EG_PLAYER_MELEE_DAMAGE * (1 + genericPct / 100);
    }
    dmg *= charge;

    // Elemental damage adds after the physical multiplier, mirroring the
    // projectile channel - scaled by charge like the physical share so the
    // stored breakdown stays consistent with the final hit size, then by
    // "+% increased elemental damage" from the passive tree and finally by
    // that tree's per-element increases.
    const rollEl = (min, max) => (min > 0 || max > 0) ? (min + Math.random() * (max - min)) * charge : 0;
    const elemBase = (stats.elementalDamageIncPct || 0) + genericPct;
    const fireMult = 1 + (elemBase + (stats.fireDamageIncPct || 0)) / 100;
    const coldMult = 1 + (elemBase + (stats.coldDamageIncPct || 0)) / 100;
    const lightningMult = 1 + (elemBase + (stats.lightningDamageIncPct || 0)) / 100;
    const elements = {
        fire: rollEl(stats.meleeFireMin, stats.meleeFireMax) * fireMult,
        cold: rollEl(stats.meleeColdMin, stats.meleeColdMax) * coldMult,
        lightning: rollEl(stats.meleeLightningMin, stats.meleeLightningMax) * lightningMult,
        shadow: rollEl(stats.meleeShadowMin, stats.meleeShadowMax) * (1 + (elemBase + (stats.shadowDamageIncPct || 0)) / 100),
    };
    // Fire conversion / fire-only (Primal Flame keystone).
    const converted = _egApplyDamageConversion(stats, dmg, elements, {
        fire: fireMult, cold: coldMult, lightning: lightningMult,
        shadow: 1 + (elemBase + (stats.shadowDamageIncPct || 0)) / 100,
    });
    dmg = converted.physical;
    _egLastMeleeElements = converted.elements;
    dmg += converted.elements.fire + converted.elements.cold + converted.elements.lightning + converted.elements.shadow;

    // Sword riposte: the strike after a successful Parry deals more damage.
    if (stats.isSwordEquipped && charge >= 0.5 && _egConsumeRiposte()) {
        dmg *= 1 + (EG_RIPOSTE_BASE_MORE_PCT + (stats.riposteDamagePct || 0)) / 100;
    }

    // Mace / Sceptre crit lines (Colossus nodes): scoped to melee strikes
    // with the matching weapon family, added to this roll only.
    // The tree's generic melee crit line applies to every melee strike.
    const daggerMultiPct = stats.isDaggerEquipped ? (stats.critMultiplierDaggerPct || 0) : 0;
    const daggerChancePct = stats.isDaggerEquipped ? (stats.critChanceDaggerPct || 0) : 0;
    // Sword / Axe / Staff / Wand crit lines (ARPG port phase A), same scoping.
    const famChancePct = stats.isSwordEquipped ? (stats.critChanceSwordPct || 0)
        : stats.isAxeEquipped ? (stats.critChanceAxePct || 0)
        : stats.isStaffEquipped ? (stats.critChanceStaffPct || 0)
        : stats.isWandEquipped ? (stats.critChanceWandPct || 0) : 0;
    const famMultiPct = stats.isSwordEquipped ? (stats.critMultiplierSwordPct || 0)
        : stats.isAxeEquipped ? (stats.critMultiplierAxePct || 0)
        : stats.isStaffEquipped ? (stats.critMultiplierStaffPct || 0)
        : stats.isWandEquipped ? (stats.critMultiplierWandPct || 0) : 0;
    // Crit chance against Blinded enemies (Blind batch).
    let blindCritPct = 0;
    if ((stats.critChanceVsBlindedPct || 0) > 0) {
        const blindTarget = _egGetTarget();
        const bl = blindTarget && blindTarget.statuses && blindTarget.statuses.blind;
        if (bl && bl.until > Date.now()) blindCritPct = stats.critChanceVsBlindedPct;
    }
    // Crit against Shocked / Bleeding enemies (Phase C-1).
    let statusCritPct = 0;
    let statusCritMultiPct = 0;
    if ((stats.critVsShockedPct || 0) > 0 || (stats.critVsBleedingPct || 0) > 0 || (stats.critMultiVsBleedingPct || 0) > 0) {
        const stTarget = _egGetTarget();
        const sts = stTarget && stTarget.statuses;
        const now = Date.now();
        if (sts && sts.shocked && sts.shocked.until > now) statusCritPct += stats.critVsShockedPct || 0;
        if (sts && sts.bleed && sts.bleed.until > now) {
            statusCritPct += stats.critVsBleedingPct || 0;
            statusCritMultiPct += stats.critMultiVsBleedingPct || 0;
        }
    }
    const maceBonus = (stats.isMaceEquipped || stats.critChanceMeleePct || daggerMultiPct || daggerChancePct || famChancePct || famMultiPct || blindCritPct || statusCritPct || statusCritMultiPct)
        ? {
            chance: (stats.critChanceMeleePct || 0) + (stats.isMaceEquipped ? (stats.critChanceMeleeMacePct || 0) : 0) + daggerChancePct + famChancePct + blindCritPct + statusCritPct,
            multiplierPct: (stats.isMaceEquipped ? (stats.critMultiplierMeleeMacePct || 0) : 0) + daggerMultiPct + famMultiPct + statusCritMultiPct,
        }
        : null;
    const critMult = _egRollCrit(stats, maceBonus);
    _egLastMeleeWasCrit = critMult > 1;
    _egLastMeleeCritMult = critMult;
    dmg *= critMult;

    // Double damage (heavy notable 20037): a flat chance for the whole
    // strike to deal twice the damage, independent of the crit roll.
    const doubleChance = Math.min(100, Number(stats.meleeDoubleDamageChancePct) || 0);
    if (doubleChance > 0 && Math.random() * 100 < doubleChance) dmg *= 2;

    // Active map run: apply the "% reduced Melee Attack Damage" map mod.
    if (typeof _egMapPlayerMeleeMult === 'function') dmg *= _egMapPlayerMeleeMult();

    // Temporary quiz reward buff: +10% damage for a short window.
    if (typeof _egQuizDamageBuffMult === 'function') dmg *= _egQuizDamageBuffMult();

    dmg = Math.max(1, Math.round(dmg));

    // Life leech - heal the player for a % of the damage about to be dealt.
    // Melee strikes also add the tree's melee-only leech (lifeLeechMeleePct).
    if ((stats.manaLeechAttackPct || 0) > 0) _egLeechMana(stats, dmg, stats.manaLeechAttackPct);
    const meleeLeechPct = (Number(stats.lifeLeechPct) || 0) + (Number(stats.lifeLeechMeleePct) || 0);
    if (meleeLeechPct > 0 && (stats.lifeLeechAsAbsorption || 0) > 0) {
        _egLeechAbsorption(stats, dmg, meleeLeechPct);
    } else if (meleeLeechPct > 0 && typeof playerCurrentHP !== 'undefined') {
        const heal = Math.round(dmg * (meleeLeechPct / 100) * _egLeechHealMult(stats));
        if (heal > 0) {
            globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + heal);
            if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
        }
    }

    return dmg;
}
