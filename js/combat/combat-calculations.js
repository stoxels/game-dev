import { EG_MELEE_OVERCHARGE_MULT } from './encounter.js';
import { _egMapPlayerDamageMult, _egMapPlayerMeleeMult } from '../endgame/endgame-map-launch.js';
import { EG_PLAYER_STATS, _egComputePlayerStats, _egRollCrit } from '../endgame/endgame-player-stats.js';
import { _egQuizDamageBuffMult } from '../endgame/endgame-quiz-buffs.js';
import { EG_PLAYER_MELEE_DAMAGE } from './combat-state.js';
import { _egApplyDamageConversion, _egLeechHealMult, _egRollElementalBreakdown, _egScaleElements } from './combat-calculations-resistances.js';

//------------------------------------------------------------------------
//-------------------PLAYER DAMAGE CALCULATION----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Per-element breakdown of the most recent _egCalcPlayerDamage() roll.
// Consumed by impact handlers to apply monster resistances per element.
export let _egLastHitElements = null;
export let _egLastHitWasCrit = false;
export let _egLastHitCritMult = 1;

export function _egCalcPlayerDamage() {
    const stats = _egComputePlayerStats();

    let dmg = EG_PLAYER_STATS.baseDamage;
    dmg += stats.physFlatMin + (stats.physFlatMax - stats.physFlatMin) * Math.random();
    dmg *= (1 + stats.physIncPct / 100);

    // Elemental damage adds after the physical multiplier - it isn't scaled by inc_physical_damage.
    // "+% increased elemental damage" (passive tree) multiplies the elemental
    // share of the hit; the physical share above is untouched. The passive tree's
    // per-element increases (fireDamageIncPct / coldDamageIncPct /
    // lightningDamageIncPct) stack ON TOP of it for their own element alone. The per-element
    // breakdown is kept in _egLastHitElements (already increased) so the
    // impact site can apply the target monster's elemental resistances.
    // Projectile-only elemental increase (passive tree) stacks additively
    // with the general one.
    const elemMult = 1 + ((stats.elementalDamageIncPct || 0) + (stats.projectileElementalDamageIncPct || 0)) / 100;
    const elements = _egScaleElements(_egRollElementalBreakdown(stats), elemMult);
    elements.fire *= 1 + (stats.fireDamageIncPct || 0) / 100;
    elements.cold *= 1 + (stats.coldDamageIncPct || 0) / 100;
    elements.lightning *= 1 + (stats.lightningDamageIncPct || 0) / 100;
    // Fire conversion / fire-only (Primal Flame keystone).
    const converted = _egApplyDamageConversion(stats, dmg, elements, elemMult * (1 + (stats.fireDamageIncPct || 0) / 100));
    dmg = converted.physical;
    _egLastHitElements = converted.elements;
    dmg += converted.elements.fire + converted.elements.cold + converted.elements.lightning + converted.elements.shadow;

    // "% increased Projectile Damage" (passive tree): one multiplier over the
    // whole physical + elemental roll, applied before the crit multiplier.
    dmg *= 1 + (stats.projectileDamageIncPct || 0) / 100;
    // Frenzy Charges: a "more" step on projectile damage per live charge.
    dmg *= 1 + (stats.frenzyDamageMorePct || 0) / 100;

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

    if (critMult > 1 && typeof showToast === 'function') globalThis.showToast('💥 Critical Hit!');

    // Life leech - heal the player for a % of the damage about to be dealt.
    if (stats.lifeLeechPct > 0 && typeof playerCurrentHP !== 'undefined') {
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

    let dmg;
    if (stats.meleePhysMax > 0) {
        dmg = stats.meleePhysMin + (stats.meleePhysMax - stats.meleePhysMin) * Math.random();
        dmg *= (1 + stats.meleePhysIncPct / 100);
        // Weapon-stance split from the passive tree (melee batch): Heavy
        // with a two-handed weapon equipped, one-handed otherwise (1H +
        // shield, dual-wield or unarmed). Exactly one side applies, on top
        // of the generic increase above.
        const stanceIncPct = stats.isHeavyWeaponEquipped
            ? (stats.meleePhysHeavyIncPct || 0)
            : (stats.meleePhys1HIncPct || 0);
        dmg *= (1 + stanceIncPct / 100);
        // Weapon family (sword/axe batch): its own multiplier, only for the
        // matching family of the equipped weapon.
        const familyIncPct = stats.isSwordEquipped ? (stats.meleePhysSwordIncPct || 0)
            : stats.isAxeEquipped ? (stats.meleePhysAxeIncPct || 0)
            : stats.isMaceEquipped ? (stats.meleePhysMaceIncPct || 0) : 0;
        dmg *= (1 + familyIncPct / 100);
        // Rage (axe notable 369): each Rage is a "more" step on melee damage.
        if ((stats.rage || 0) > 0) dmg *= 1 + (stats.rage * (stats.rageMeleeMorePct || 0)) / 100;
    } else {
        // Unarmed / no weapon damage - flat fallback strike
        dmg = EG_PLAYER_MELEE_DAMAGE;
    }
    dmg *= charge;

    // Elemental damage adds after the physical multiplier, mirroring the
    // projectile channel - scaled by charge like the physical share so the
    // stored breakdown stays consistent with the final hit size, then by
    // "+% increased elemental damage" from the passive tree and finally by
    // that tree's per-element increases.
    const rollEl = (min, max) => (min > 0 || max > 0) ? (min + Math.random() * (max - min)) * charge : 0;
    const elemMult = 1 + (stats.elementalDamageIncPct || 0) / 100;
    const fireMult = elemMult * (1 + (stats.fireDamageIncPct || 0) / 100);
    const coldMult = elemMult * (1 + (stats.coldDamageIncPct || 0) / 100);
    const lightningMult = elemMult * (1 + (stats.lightningDamageIncPct || 0) / 100);
    const elements = {
        fire: rollEl(stats.meleeFireMin, stats.meleeFireMax) * fireMult,
        cold: rollEl(stats.meleeColdMin, stats.meleeColdMax) * coldMult,
        lightning: rollEl(stats.meleeLightningMin, stats.meleeLightningMax) * lightningMult,
        shadow: rollEl(stats.meleeShadowMin, stats.meleeShadowMax) * elemMult,
    };
    // Fire conversion / fire-only (Primal Flame keystone).
    const converted = _egApplyDamageConversion(stats, dmg, elements, fireMult);
    dmg = converted.physical;
    _egLastMeleeElements = converted.elements;
    dmg += converted.elements.fire + converted.elements.cold + converted.elements.lightning + converted.elements.shadow;

    // Mace / Sceptre crit lines (Colossus nodes): scoped to melee strikes
    // with the matching weapon family, added to this roll only.
    // The tree's generic melee crit line applies to every melee strike.
    const maceBonus = (stats.isMaceEquipped || stats.critChanceMeleePct)
        ? {
            chance: (stats.critChanceMeleePct || 0) + (stats.isMaceEquipped ? (stats.critChanceMeleeMacePct || 0) : 0),
            multiplierPct: stats.isMaceEquipped ? (stats.critMultiplierMeleeMacePct || 0) : 0,
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

    // Crit toast only on (near-)full charges - chip-hit crits would spam it
    // while machine-tapping E.
    if (critMult > 1 && charge >= 0.99 && typeof showToast === 'function') globalThis.showToast('💥 Critical Hit!');

    // Life leech - heal the player for a % of the damage about to be dealt.
    // Melee strikes also add the tree's melee-only leech (lifeLeechMeleePct).
    const meleeLeechPct = (Number(stats.lifeLeechPct) || 0) + (Number(stats.lifeLeechMeleePct) || 0);
    if (meleeLeechPct > 0 && typeof playerCurrentHP !== 'undefined') {
        const heal = Math.round(dmg * (meleeLeechPct / 100) * _egLeechHealMult(stats));
        if (heal > 0) {
            globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + heal);
            if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
        }
    }

    return dmg;
}
