//------------------------------------------------------------------------
//-------------------ELEMENTAL DAMAGE & RESISTANCES-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Resistances (player and monster side) never reduce more than this share.
// The player cap can be raised ABOVE this base by "increased maximum
// Resistance" bonuses from unique items (see _egGetPlayerResistCap).
export const EG_RESIST_CAP_PCT = 75;

// Effective resistance cap for one player element: base cap plus the
// aggregated max-resist bonuses (per-element + the all-elements bucket).
// Monsters have no max-resist sources - they are hard-capped at the base.
export function _egGetPlayerResistCap(stats, element) {
    // allElementalResistMax (tree) covers fire/cold/lightning, never shadow.
    const allElemMax = element === 'shadow' ? 0 : ((stats.allElementalResistMax) || 0);
    const extra = ((stats[element + 'ResistMax']) || 0) + ((stats.allResMax) || 0) + allElemMax;
    return EG_RESIST_CAP_PCT + Math.max(0, extra);
}

export const EG_ELEMENTS = ['fire', 'cold', 'lightning', 'shadow'];

// Per-element flat damage roll for one hit. Returns { fire, cold, lightning, shadow }.
export function _egRollElementalBreakdown(stats) {
    const roll = (min, max) => (min > 0 || max > 0) ? min + Math.random() * (max - min) : 0;
    return {
        fire: roll(stats.fireDmgMin, stats.fireDmgMax),
        cold: roll(stats.coldDmgMin, stats.coldDmgMax),
        lightning: roll(stats.lightningDmgMin, stats.lightningDmgMax),
        shadow: roll(stats.shadowDmgMin, stats.shadowDmgMax),
    };
}

// Total flat elemental damage bonus of one hit (sum of the breakdown).
export function _egGetElementalDamageBonus(stats) {
    const e = _egRollElementalBreakdown(stats);
    return e.fire + e.cold + e.lightning + e.shadow;
}

// Returns an element breakdown scaled by `factor` (used when only a % of the
// original hit is dealt, e.g. reveal projectiles).
export function _egScaleElements(elements, factor) {
    if (!elements) return null;
    const out = {};
    EG_ELEMENTS.forEach(el => { out[el] = (elements[el] || 0) * factor; });
    return out;
}

// Applies the target monster's elemental resistances to an incoming hit.
// `elements` maps each element to the raw elemental damage carried by the hit
// (proportional to `amount`); everything else counts as physical. Positive
// resistances reduce; NEGATIVE resistances AMPLIFY (vulnerability) - both
// clamped to ±EG_RESIST_CAP_PCT. An optional `physical` resistance (heavy
// armor) reduces only the physical share and applies even when the hit
// carries no elemental breakdown at all. Monsters without these keys keep
// their previous behaviour exactly. Returns the post-resistance total.
export function _egApplyTargetResistances(amount, target, elements, opts) {
    if (!target) return amount;
    // Spellproof monsters: player SPELL/projectile hits (opts.isPlayerSpell)
    // are heavily reduced; player MELEE strikes (opts.isMelee) hit at full
    // force. Untagged calls (boss mechanics, monster self-damage) are neutral
    // and pass untouched so map-mod boss math never breaks.
    if ((target.spellproofPct || 0) > 0 && opts && opts.isPlayerSpell && !opts.isMelee) {
        amount = Math.max(1, Math.round(amount * (1 - Math.min(90, target.spellproofPct) / 100)));
    }
    if (!target.resistances) return amount;
    const res = target.resistances;
    const clampRes = (v) => Math.max(-EG_RESIST_CAP_PCT, Math.min(EG_RESIST_CAP_PCT, Number(v) || 0));
    let physRes = (typeof res.physical === 'number') ? clampRes(res.physical) : 0;
    // Armour pierce (node 147): this hit skips positive physical reduction;
    // a negative value (vulnerability) still amplifies.
    if (opts && opts.ignorePhysReduction) physRes = Math.min(0, physRes);

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
export function _egCalcPlayerResistanceReduction(amount, stats, element) {
    if (!element || amount <= 0) return amount;
    // Active map run: Elemental Weakness - #% reduced all Resistances.
    const resistMult = (typeof globalThis._egMapResistMult === 'function') ? globalThis._egMapResistMult() : 1;
    // allElementalResist (passive tree) is a flat bonus to fire, cold and
    // lightning - the three rollable elements. It deliberately does NOT touch
    // shadow resistance, and it still obeys the per-element cap below like any
    // other source. Lightning is a full element, covered here like fire and cold.
    const allElem = Math.max(0, stats.allElementalResist || 0);
    const resMap = {
        fire: ((stats.fireResist || 0) + allElem) * resistMult,
        cold: ((stats.coldResist || 0) + allElem) * resistMult,
        lightning: ((stats.lightningResist || 0) + allElem) * resistMult,
        shadow: (stats.shadowResist || 0) * resistMult,
    };
    const cap = (typeof _egGetPlayerResistCap === 'function')
        ? _egGetPlayerResistCap(stats, element) : EG_RESIST_CAP_PCT;
    const resPct = Math.min(cap, Math.max(0, resMap[element] || 0));
    let reduced = amount * (1 - resPct / 100);
    return reduced;
}
