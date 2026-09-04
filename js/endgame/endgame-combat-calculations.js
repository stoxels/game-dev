//------------------------------------------------------------------------
//-------------------PLAYER DAMAGE CALCULATION----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Per-element breakdown of the most recent _egCalcPlayerDamage() roll.
// Consumed by impact handlers to apply monster resistances per element.
let _egLastHitElements = null;
let _egLastHitWasCrit = false;
let _egLastHitCritMult = 1;

function _egCalcPlayerDamage() {
    const stats = _egComputePlayerStats();

    let dmg = EG_PLAYER_STATS.baseDamage;
    dmg += stats.physFlatMin + (stats.physFlatMax - stats.physFlatMin) * Math.random();
    dmg *= (1 + stats.physIncPct / 100);

    // Elemental damage adds after the physical multiplier — it isn't scaled by inc_physical_damage.
    // The per-element breakdown is kept in _egLastHitElements so the impact
    // site can apply the target monster's elemental resistances.
    const elements = _egRollElementalBreakdown(stats);
    _egLastHitElements = elements;
    dmg += elements.fire + elements.cold + elements.lightning + elements.shadow;

    const critMult = _egRollCrit(stats);
    _egLastHitWasCrit = critMult > 1;
    _egLastHitCritMult = critMult;
    dmg *= critMult;

    // Active map run: apply the "% reduced player Damage" map mod.
    if (typeof _egMapPlayerDamageMult === 'function') dmg *= _egMapPlayerDamageMult();

    // Temporary quiz reward buff: +10% damage for a short window.
    if (typeof _egQuizDamageBuffMult === 'function') dmg *= _egQuizDamageBuffMult();

    dmg = Math.max(1, Math.round(dmg));

    if (critMult > 1 && typeof showToast === 'function') showToast('💥 Critical Hit!');

    // Life leech — heal the player for a % of the damage about to be dealt.
    if (stats.lifeLeechPct > 0 && typeof playerCurrentHP !== 'undefined') {
        const heal = Math.round(dmg * (stats.lifeLeechPct / 100));
        if (heal > 0) {
            playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + heal);
            if (typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
        }
    }

    return dmg;
}


// Per-element breakdown of the most recent _egCalcPlayerMeleeDamage() roll.
// Passed to _egDamageTargetById so melee hits get the same resistance /
// ailment / hit-burst treatment as projectiles.
let _egLastMeleeElements = null;
let _egLastMeleeWasCrit = false;
let _egLastMeleeCritMult = 1;

// Melee auto-strike channel — fully independent from projectiles:
// rolls the equipped weapon's base damage range plus its "… to Melee
// Strikes" mods and unscoped sources (bracers/rings/amulet), scaled by
// % increased physical damage and crit. Falls back to the flat base
// punch when no weapon damage exists. Projectiles use
// _egCalcPlayerDamage() instead (see _egComputePlayerStats for routing).
function _egCalcPlayerMeleeDamage() {
    const stats = _egComputePlayerStats();

    let dmg;
    if (stats.meleePhysMax > 0) {
        dmg = stats.meleePhysMin + (stats.meleePhysMax - stats.meleePhysMin) * Math.random();
        dmg *= (1 + stats.meleePhysIncPct / 100);
    } else {
        // Unarmed / no weapon damage — flat fallback strike
        dmg = EG_PLAYER_MELEE_DAMAGE;
    }

    // Elemental damage adds after the physical multiplier, mirroring the
    // projectile channel.
    const rollEl = (min, max) => (min > 0 || max > 0) ? min + Math.random() * (max - min) : 0;
    const elements = {
        fire: rollEl(stats.meleeFireMin, stats.meleeFireMax),
        cold: rollEl(stats.meleeColdMin, stats.meleeColdMax),
        lightning: rollEl(stats.meleeLightningMin, stats.meleeLightningMax),
        shadow: rollEl(stats.meleeShadowMin, stats.meleeShadowMax),
    };
    _egLastMeleeElements = elements;
    dmg += elements.fire + elements.cold + elements.lightning + elements.shadow;

    const critMult = _egRollCrit(stats);
    _egLastMeleeWasCrit = critMult > 1;
    _egLastMeleeCritMult = critMult;
    dmg *= critMult;

    // Active map run: apply the "% reduced Melee Attack Damage" map mod.
    if (typeof _egMapPlayerMeleeMult === 'function') dmg *= _egMapPlayerMeleeMult();

    // Temporary quiz reward buff: +10% damage for a short window.
    if (typeof _egQuizDamageBuffMult === 'function') dmg *= _egQuizDamageBuffMult();

    dmg = Math.max(1, Math.round(dmg));

    if (critMult > 1 && typeof showToast === 'function') showToast('💥 Critical Hit!');

    // Life leech — heal the player for a % of the damage about to be dealt.
    if (stats.lifeLeechPct > 0 && typeof playerCurrentHP !== 'undefined') {
        const heal = Math.round(dmg * (stats.lifeLeechPct / 100));
        if (heal > 0) {
            playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + heal);
            if (typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
        }
    }

    return dmg;
}


//------------------------------------------------------------------------
//-------------------ELEMENTAL DAMAGE & RESISTANCES-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Resistances (player and monster side) never reduce more than this share.
// The player cap can be raised ABOVE this base by "increased maximum
// Resistance" bonuses from unique items (see _egGetPlayerResistCap).
const EG_RESIST_CAP_PCT = 75;

// Effective resistance cap for one player element: base cap plus the
// aggregated max-resist bonuses (per-element + the all-elements bucket).
// Monsters have no max-resist sources — they are hard-capped at the base.
function _egGetPlayerResistCap(stats, element) {
    const extra = ((stats[element + 'ResistMax']) || 0) + ((stats.allResMax) || 0);
    return EG_RESIST_CAP_PCT + Math.max(0, extra);
}

const EG_ELEMENTS = ['fire', 'cold', 'lightning', 'shadow'];

// Per-element flat damage roll for one hit. Returns { fire, cold, lightning, shadow }.
function _egRollElementalBreakdown(stats) {
    const roll = (min, max) => (min > 0 || max > 0) ? min + Math.random() * (max - min) : 0;
    return {
        fire: roll(stats.fireDmgMin, stats.fireDmgMax),
        cold: roll(stats.coldDmgMin, stats.coldDmgMax),
        lightning: roll(stats.lightningDmgMin, stats.lightningDmgMax),
        shadow: roll(stats.shadowDmgMin, stats.shadowDmgMax),
    };
}

// Total flat elemental damage bonus of one hit (sum of the breakdown).
function _egGetElementalDamageBonus(stats) {
    const e = _egRollElementalBreakdown(stats);
    return e.fire + e.cold + e.lightning + e.shadow;
}

// Returns an element breakdown scaled by `factor` (used when only a % of the
// original hit is dealt, e.g. reveal projectiles).
function _egScaleElements(elements, factor) {
    if (!elements) return null;
    const out = {};
    EG_ELEMENTS.forEach(el => { out[el] = (elements[el] || 0) * factor; });
    return out;
}

// Applies the target monster's elemental resistances to an incoming hit.
// `elements` maps each element to the raw elemental damage carried by the hit
// (proportional to `amount`); everything else counts as physical. Positive
// resistances reduce; NEGATIVE resistances AMPLIFY (vulnerability) — both
// clamped to ±EG_RESIST_CAP_PCT. An optional `physical` resistance (heavy
// armor) reduces only the physical share and applies even when the hit
// carries no elemental breakdown at all. Monsters without these keys keep
// their previous behaviour exactly. Returns the post-resistance total.
function _egApplyTargetResistances(amount, target, elements) {
    if (!target || !target.resistances) return amount;
    const res = target.resistances;
    const clampRes = (v) => Math.max(-EG_RESIST_CAP_PCT, Math.min(EG_RESIST_CAP_PCT, Number(v) || 0));
    const physRes = (typeof res.physical === 'number') ? clampRes(res.physical) : 0;

    // Split the hit into its elemental (resisted / amplified) and physical
    // (armored) shares. A missing, empty or oversized breakdown means the
    // whole hit is physical.
    let physical = amount;
    let elemental = 0;
    if (elements) {
        const elemTotal = EG_ELEMENTS.reduce((sum, el) => sum + (elements[el] || 0), 0);
        if (elemTotal > 0 && elemTotal <= amount) {
            // Scale the stored breakdown to the actual hit size in case the
            // caller applied multipliers after the roll (crit, reveal %, etc.).
            const factor = elemTotal / amount;
            let mitigated = 0;
            EG_ELEMENTS.forEach(el => {
                const part = (elements[el] || 0) * factor;
                if (part <= 0) return;
                mitigated += part * (1 - clampRes(res[el]) / 100);
            });
            physical = amount - elemTotal;
            elemental = mitigated;
        }
    }

    return Math.max(1, Math.round(physical * (1 - physRes / 100) + elemental));
}

// Reduces an elemental monster hit by the player's matching resistance %
// plus the flat Arcane Resistance (which applies to ALL elemental damage).
// Non-elemental hits pass through untouched. Returns the reduced amount.
function _egCalcPlayerResistanceReduction(amount, stats, element) {
    if (!element || amount <= 0) return amount;
    // Active map run: Elemental Weakness — #% reduced all Resistances.
    const resistMult = (typeof _egMapResistMult === 'function') ? _egMapResistMult() : 1;
    const resMap = {
        fire: (stats.fireResist || 0) * resistMult,
        cold: (stats.coldResist || 0) * resistMult,
        lightning: (stats.lightningResist || 0) * resistMult,
        shadow: (stats.shadowResist || 0) * resistMult,
    };
    const cap = (typeof _egGetPlayerResistCap === 'function')
        ? _egGetPlayerResistCap(stats, element) : EG_RESIST_CAP_PCT;
    const resPct = Math.min(cap, Math.max(0, resMap[element] || 0));
    let reduced = amount * (1 - resPct / 100);
    reduced = Math.max(0, reduced - Math.max(0, stats.arcaneResistFlat || 0));
    return reduced;
}