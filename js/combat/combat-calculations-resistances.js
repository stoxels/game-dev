//------------------------------------------------------------------------
//-------------------ELEMENTAL DAMAGE & RESISTANCES-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Resistances (player and monster side) never reduce more than this share.
// The player cap can be raised ABOVE this base by "increased maximum
// Resistance" bonuses from unique items (see _getPlayerResistCap).
export const RESIST_CAP_PCT = 75;

// Effective resistance cap for one player element: base cap plus the
// aggregated max-resist bonuses (per-element + the all-elements bucket).
// Monsters have no max-resist sources - they are hard-capped at the base.
export function _getPlayerResistCap(stats, element) {
    // allElementalResistMax (tree) covers fire/cold/lightning, never shadow.
    const allElemMax = element === 'shadow' ? 0 : ((stats.allElementalResistMax) || 0);
    const extra = ((stats[element + 'ResistMax']) || 0) + ((stats.allResMax) || 0) + allElemMax;
    return RESIST_CAP_PCT + Math.max(0, extra);
}

export const DAMAGE_ELEMENTS = ['fire', 'cold', 'lightning', 'shadow'];

// Campaign resistance penalty (ARPG style): -30% to ALL four
// resistances once the Ascension Trial that opens the ascendency class is
// cleared (stage 1) and another -30% when World 14 / the Nexus Point is
// cleared, right before the endgame maps (stage 2), -60% in total. It is
// subtracted from the uncapped total, so it can push a resistance below 0
// (the player then takes MORE damage of that element).
export const RESIST_PENALTY_PER_STAGE = 30;
export const RESIST_PENALTY_MAX_STAGE = 2;
export const RESIST_FLOOR_PCT = -100;

// Resistance penalty in percent for the current penalty stage.
export function _getResistPenaltyPct() {
    const s = globalThis.STATE;
    const stage = Math.max(0, Math.min(RESIST_PENALTY_MAX_STAGE, Number(s && s.resistPenaltyStage) || 0));
    return stage * RESIST_PENALTY_PER_STAGE;
}

// Raises the penalty to `stage` (never lowers it) and tells the player once.
export function _advanceResistPenaltyStage(stage) {
    const s = globalThis.STATE;
    if (!s) return false;
    const target = Math.min(RESIST_PENALTY_MAX_STAGE, Math.max(0, Number(stage) || 0));
    if ((Number(s.resistPenaltyStage) || 0) >= target) return false;
    s.resistPenaltyStage = target;
    if (typeof globalThis.save === 'function') globalThis.save();
    _showResistPenaltyNotice(target);
    return true;
}

// Modal notice: what was lost, the new total, and that it can be offset.
export function _showResistPenaltyNotice(stage) {
    if (typeof document === 'undefined') return;
    const tr = (k) => (typeof globalThis.t === 'function' ? globalThis.t(k) : k);
    const total = stage * RESIST_PENALTY_PER_STAGE;
    setTimeout(() => {
        const old = document.getElementById('sx-resist-penalty-notice');
        if (old) old.remove();
        const wrap = document.createElement('div');
        wrap.id = 'sx-resist-penalty-notice';
        wrap.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(6,4,10,0.78);';
        const box = document.createElement('div');
        box.style.cssText = 'max-width:520px;margin:16px;padding:26px 30px;border:2px solid #c0482f;border-radius:12px;background:linear-gradient(#241518,#140b0d);color:#f1ddd6;text-align:center;box-shadow:0 0 40px rgba(192,72,47,0.45);font-family:inherit;';
        const head = document.createElement('div');
        head.style.cssText = 'font-size:1.35em;font-weight:700;color:#ff8a6a;margin-bottom:10px;';
        head.textContent = '\u{1F525}\u2744\uFE0F\u26A1\u{1F311} ' + tr('eg_resist_penalty_title_' + stage);
        const pct = document.createElement('div');
        pct.style.cssText = 'font-size:2em;font-weight:800;color:#ff5a3c;margin:6px 0 12px;';
        pct.textContent = '-' + total + '% ' + (globalThis.LANG === 'de' ? 'Widerstände' : 'Resistances');
        const body = document.createElement('div');
        body.style.cssText = 'line-height:1.5;margin-bottom:18px;';
        body.textContent = tr('eg_resist_penalty_body_' + stage);
        const btn = document.createElement('button');
        btn.textContent = tr('eg_resist_penalty_btn');
        btn.style.cssText = 'padding:9px 26px;border-radius:8px;border:1px solid #c0482f;background:#3a1a14;color:#ffd9cc;font-size:1em;cursor:pointer;';
        btn.onclick = () => wrap.remove();
        box.append(head, pct, body, btn);
        wrap.appendChild(box);
        document.body.appendChild(wrap);
    }, 600);
}

// Per-element flat damage roll for one hit. Returns { fire, cold, lightning, shadow }.
export function _rollElementalBreakdown(stats) {
    const roll = (min, max) => (min > 0 || max > 0) ? min + Math.random() * (max - min) : 0;
    return {
        fire: roll(stats.fireDmgMin, stats.fireDmgMax),
        cold: roll(stats.coldDmgMin, stats.coldDmgMax),
        lightning: roll(stats.lightningDmgMin, stats.lightningDmgMax),
        shadow: roll(stats.shadowDmgMin, stats.shadowDmgMax),
    };
}

// Total flat elemental damage bonus of one hit (sum of the breakdown).
export function _getElementalDamageBonus(stats) {
    const e = _rollElementalBreakdown(stats);
    return e.fire + e.cold + e.lightning + e.shadow;
}

// Fire conversion (Primal Flame keystone, node 350). `physical` is the
// non-elemental share of the hit, `elements` its per-element breakdown.
// damageToFirePct moves that share of the physical, cold and lightning parts
// into fire; onlyFireDamage then drops every non-fire part that is left
// (including shadow). Conversion runs after the per-type increases, so the
// converted share keeps the strength it already had. Returns
// { physical, elements } and hands the inputs back untouched when neither
// channel is active.
// True when any conversion / only-element / extra-as channel is active.
export function _hasDamageConversion(stats) {
    if (!stats) return false;
    return ['damageToFirePct', 'onlyFireDamage', 'damageToColdPct', 'onlyColdDamage', 'damageToLightningPct', 'onlyLightningDamage',
        'physAsExtraFirePct', 'physAsExtraShadowPct', 'physAsExtraColdPct', 'physAsExtraLightningPct']
        .some((k) => (Number(stats[k]) || 0) > 0);
}

// Strength of the "gain as extra <element>" parts. ARPG rule: general
// elemental, the element's own increase and any caller-supplied generic increase
// all ADD into one bucket. `passed` is either a fire multiplier (legacy number) or
// { fire, cold, lightning, shadow } multipliers the caller already built that way.
function _extraMults(stats, passed) {
    const add = (k) => Math.max(0, Number(stats && stats.elementalDamageIncPct) || 0) + Math.max(0, Number(stats && stats[k]) || 0);
    const d = {
        fire: 1 + add('fireDamageIncPct') / 100,
        cold: 1 + add('coldDamageIncPct') / 100,
        lightning: 1 + add('lightningDamageIncPct') / 100,
        shadow: 1 + add('shadowDamageIncPct') / 100,
    };
    if (passed && typeof passed === 'object') return { ...d, ...passed };
    if (typeof passed === 'number' && passed !== 1) d.fire = passed;
    return d;
}

// Applies damage conversion (keystones turning damage into fire, cold,
// lightning or shadow, plus extra-as bonuses). Returns the new { physical,
// elements }.
export function _applyDamageConversion(stats, physical, elements, multsArg = 1) {
    const el = elements || {};
    const mults = _extraMults(stats, multsArg);
    const fireMult = mults.fire;
    // Cold / lightning keystones (Bitter Frost, Roiling Tempest) use the general path.
    if ((Number(stats && stats.damageToColdPct) || 0) > 0 || (Number(stats && stats.onlyColdDamage) || 0) > 0
        || (Number(stats && stats.damageToLightningPct) || 0) > 0 || (Number(stats && stats.onlyLightningDamage) || 0) > 0) {
        return _applyDamageConversionGeneral(stats, physical, el, mults);
    }
    const share = Math.max(0, Math.min(100, Number(stats && stats.damageToFirePct) || 0)) / 100;
    const fireOnly = (Number(stats && stats.onlyFireDamage) || 0) > 0;
    // "Gain X% of physical Damage as extra Fire": taken from the physical
    // share BEFORE conversion, scaled by the caller's fire multiplier, and
    // added after the fire-only drop (it is fire itself, so it survives).
    const extraPct = Math.max(0, Number(stats && stats.physAsExtraFirePct) || 0);
    // Same for "as extra Shadow" (node 20218): extra, taken from physical,
    // scaled by the shadow increase; dropped under fire-only like any shadow.
    const extraShadowPct = Math.max(0, Number(stats && stats.physAsExtraShadowPct) || 0);
    // Extra cold / lightning (ARPG port phase A): same shape, scaled by the
    // element's own increases; dropped under fire-only like any non-fire part.
    const extraColdPct = Math.max(0, Number(stats && stats.physAsExtraColdPct) || 0);
    const extraLightningPct = Math.max(0, Number(stats && stats.physAsExtraLightningPct) || 0);
    const coldMult = mults.cold;
    const lightningMult = mults.lightning;
    if (share <= 0 && !fireOnly && extraPct <= 0 && extraShadowPct <= 0 && extraColdPct <= 0 && extraLightningPct <= 0) return { physical, elements: el };
    const keep = fireOnly ? 0 : 1 - share;
    const phys = physical || 0;
    const cold = el.cold || 0;
    const lightning = el.lightning || 0;
    return {
        physical: phys * keep,
        elements: {
            fire: (el.fire || 0) + share * (phys + cold + lightning) + (phys * extraPct / 100) * fireMult,
            cold: cold * keep + (fireOnly ? 0 : (phys * extraColdPct / 100) * coldMult),
            lightning: lightning * keep + (fireOnly ? 0 : (phys * extraLightningPct / 100) * lightningMult),
            shadow: fireOnly ? 0 : (el.shadow || 0)
                + (phys * extraShadowPct / 100) * mults.shadow,
        },
    };
}

// General conversion: fire, then cold, then lightning conversion (each moves its
// share of every other part), then the only-element drop. Extras survive when
// their element is the allowed one. Used when a cold / lightning keystone is active.
function _applyDamageConversionGeneral(stats, physical, el, mults) {
    const fireMult = mults.fire;
    const pct = (k) => Math.max(0, Math.min(100, Number(stats[k]) || 0)) / 100;
    const only = ((Number(stats.onlyFireDamage) || 0) > 0) ? 'fire'
        : ((Number(stats.onlyColdDamage) || 0) > 0) ? 'cold'
        : ((Number(stats.onlyLightningDamage) || 0) > 0) ? 'lightning' : null;
    const coldMult = mults.cold;
    const lightningMult = mults.lightning;
    const shadowMult = mults.shadow;
    const p = { phys: physical || 0, fire: el.fire || 0, cold: el.cold || 0, lightning: el.lightning || 0, shadow: el.shadow || 0 };
    const order = [['fire', 'damageToFirePct'], ['cold', 'damageToColdPct'], ['lightning', 'damageToLightningPct']];
    for (const [target, key] of order) {
        const share = pct(key);
        if (share <= 0) continue;
        let moved = 0;
        for (const src of ['phys', 'fire', 'cold', 'lightning']) {
            if (src === target) continue;
            const take = p[src] * share;
            p[src] -= take;
            moved += take;
        }
        p[target] += moved;
    }
    const physBase = physical || 0;
    p.fire += physBase * Math.max(0, Number(stats.physAsExtraFirePct) || 0) / 100 * fireMult;
    p.cold += physBase * Math.max(0, Number(stats.physAsExtraColdPct) || 0) / 100 * coldMult;
    p.lightning += physBase * Math.max(0, Number(stats.physAsExtraLightningPct) || 0) / 100 * lightningMult;
    p.shadow += physBase * Math.max(0, Number(stats.physAsExtraShadowPct) || 0) / 100 * shadowMult;
    if (only) {
        p.phys = 0;
        for (const k of ['fire', 'cold', 'lightning', 'shadow']) if (k !== only) p[k] = 0;
    }
    return { physical: p.phys, elements: { fire: p.fire, cold: p.cold, lightning: p.lightning, shadow: p.shadow } };
}

// Returns an element breakdown scaled by `factor` (used when only a % of the
// original hit is dealt, e.g. reveal projectiles).
export function _scaleElements(elements, factor) {
    if (!elements) return null;
    const out = {};
    DAMAGE_ELEMENTS.forEach(el => { out[el] = (elements[el] || 0) * factor; });
    return out;
}

// How long a Crushed enemy stays crushed (node 331).
export const CRUSH_DURATION_S = 5;

// Multiplier on the stored damage-per-second of an ailment the player
// inflicts: Ignite uses igniteDamageMorePct, Bleeding (the physical damage
// over time) physDotMorePct, Poison (the shadow damage over time)
// poisonDotMultiPct. Every other ailment is untouched.
export function _ailmentDamageMult(key, stats) {
    const pct = key === 'ignite' ? Number(stats && stats.igniteDamageMorePct)
        : key === 'bleed' ? Number(stats && stats.physDotMorePct)
        : key === 'poison' ? Number(stats && stats.poisonDotMultiPct) : 0;
    // General "increased Damage over Time" (dotIncPct) stacks on top of the
    // ailment-specific "more" step for every DoT ailment.
    const inc = (Math.max(0, Number(stats && stats.dotIncPct) || 0)
        + (stats && stats.isDaggerEquipped ? Math.max(0, Number(stats.dotIncDaggerPct) || 0) : 0)) / 100;
    return (1 + Math.max(0, pct || 0) / 100) * (1 + inc);
}

// Multiplier on every Life leech heal (Vital Conduit keystone: lifeLeechLessPct).
export function _leechHealMult(stats) {
    return Math.max(0, 1 - Math.max(0, Number(stats && stats.lifeLeechLessPct) || 0) / 100)
        * (1 + Math.max(0, Number(stats && stats.lifeLeechEffectIncPct) || 0) / 100);
}

// Absorption leech (passive tree, spell hits): `pct` of the hit's damage
// refills the Absorption layer instantly, scaled by the leech-effect line.
// Sub-point amounts accumulate so 0.3% leeches are not rounded away.
let _absorptionLeechRemainder = 0;
// Adds absorption equal to a share of the damage dealt (up to the maximum);
// fractions carry over to the next hit. Returns the whole points gained.
export function _leechAbsorption(stats, dmg, pct) {
    const max = Number(stats && stats.absorption) || 0;
    if (!(pct > 0) || !(dmg > 0) || max <= 0) return 0;
    const effect = 1 + Math.max(0, Number(stats.absorptionLeechEffectIncPct) || 0) / 100;
    const raw = dmg * (pct / 100) * effect + _absorptionLeechRemainder;
    const whole = Math.floor(raw);
    _absorptionLeechRemainder = raw - whole;
    if (whole <= 0) return 0;
    const cur = Number(globalThis._playerAbsorptionCurrent) || 0;
    globalThis._playerAbsorptionCurrent = Math.min(max, cur + whole);
    return whole;
}

// Secondary hits (pierce, chain, fork, splash, multishot, cleave) deal only a share
// of the primary hit; the tree's "Damage of Secondary hits" line restores it.
export const SECONDARY_EFFECTIVENESS = Object.freeze({
    pierce: 0.7, chain: 0.7, fork: 0.6, multishot: 0.6, splash: 0.5, cleave: 0.5,
});
// Each further chain bounce keeps this share of the previous bounce.
export const CHAIN_FALLOFF = 0.85;

// Damage of a secondary hit (chain, splash...) from the base hit:
// effectiveness, the secondary damage bonus and chain falloff, at least 1.
export function _secondaryDamage(base, kind, stats, bounce = 0) {
    const eff = SECONDARY_EFFECTIVENESS[kind] || 1;
    const inc = 1 + Math.max(0, Number(stats && stats.secondaryDamagePct) || 0) / 100;
    const fall = kind === 'chain' ? Math.pow(CHAIN_FALLOFF, Math.max(0, bounce)) : 1;
    return Math.max(1, Math.round(base * eff * inc * fall));
}

// Mana leech (tree, attack hits): `pct` of the hit's damage becomes Mana, scaled by the
// leech-effect line. Sub-point amounts accumulate like the Absorption leech.
let _manaLeechRemainder = 0;
// Gains mana equal to a share of the damage dealt (scaled by the leech effect
// stat); fractions carry over. Returns the whole points gained.
export function _leechMana(stats, dmg, pct) {
    if (!(pct > 0) || !(dmg > 0) || typeof globalThis.gainMana !== 'function' || !(globalThis.playerMaxMana > 0)) return 0;
    const effect = 1 + Math.max(0, Number(stats && stats.manaLeechEffectPct) || 0) / 100;
    const raw = dmg * (pct / 100) * effect + _manaLeechRemainder;
    const whole = Math.floor(raw);
    _manaLeechRemainder = raw - whole;
    if (whole > 0) globalThis.gainMana(whole);
    return whole;
}

// Applies the target monster's elemental resistances to an incoming hit.
// `elements` maps each element to the raw elemental damage carried by the hit
// (proportional to `amount`); everything else counts as physical. Positive
// resistances reduce; NEGATIVE resistances AMPLIFY (vulnerability) - both
// clamped to ±RESIST_CAP_PCT. An optional `physical` resistance (heavy
// armor) reduces only the physical share and applies even when the hit
// carries no elemental breakdown at all. Monsters without these keys keep
// their previous behaviour exactly. Returns the post-resistance total.
export function _applyTargetResistances(amount, target, elements, opts) {
    if (!target) return amount;
    // Spellproof monsters: player SPELL/projectile hits (opts.isPlayerSpell)
    // are heavily reduced; player MELEE strikes (opts.isMelee) hit at full
    // force. Untagged calls (boss mechanics, monster self-damage) are neutral
    // and pass untouched so map-mod boss math never breaks.
    if ((target.spellproofPct || 0) > 0 && opts && opts.isPlayerSpell && !opts.isMelee) {
        amount = Math.max(1, Math.round(amount * (1 - Math.min(90, target.spellproofPct) / 100)));
    }
    // Meleeproof monsters (Gauntlet "phased"): player MELEE strikes are heavily
    // reduced, spells and projectiles hit normally. Heavy resistance, never full
    // immunity (the tutorial ghost's meleeImmune flag is the only hard gate).
    if ((target.meleeproofPct || 0) > 0 && opts && opts.isMelee) {
        amount = Math.max(1, Math.round(amount * (1 - Math.min(90, target.meleeproofPct) / 100)));
    }
    // Crushed (node 331): the target's physical Damage reduction is lowered
    // for the duration; monsters without a resistance table are treated as
    // having 0% so the lowering still amplifies physical hits.
    const crushed = (target.crushedUntil > Date.now()) ? Math.max(0, Number(target.crushPhysRedPct) || 0) : 0;
    if (!target.resistances && !(crushed > 0)) return amount;
    const res = target.resistances || {};
    const clampRes = (v) => Math.max(-RESIST_CAP_PCT, Math.min(RESIST_CAP_PCT, Number(v) || 0));
    let physRes = (typeof res.physical === 'number') ? clampRes(res.physical) : 0;
    // Armour pierce (node 147): this hit skips positive physical reduction;
    // a negative value (vulnerability) still amplifies.
    if (opts && opts.ignorePhysReduction) physRes = Math.min(0, physRes);
    if (crushed > 0) physRes = Math.max(-RESIST_CAP_PCT, physRes - crushed);

    // Split the hit into its elemental (resisted / amplified) and physical
    // (armored) shares. A missing, empty or oversized breakdown means the
    // whole hit is physical.
    let physical = amount;
    let elemental = 0;
    if (elements) {
        const elemTotal = DAMAGE_ELEMENTS.reduce((sum, el) => sum + (elements[el] || 0), 0);
        if (elemTotal > 0 && elemTotal <= amount) {
            // Scale the stored breakdown to the actual hit size in case the
            // caller applied multipliers after the roll (crit, reveal %, etc.).
            const factor = elemTotal / amount;
            let mitigated = 0;
            DAMAGE_ELEMENTS.forEach(el => {
                const part = (elements[el] || 0) * factor;
                if (part <= 0) return;
                // Penetration (opts.penetration, ARPG port phase A) lowers the
                // monster's resistance for this hit only.
                const penV = (opts && opts.penetration && opts.penetration[el]) || 0;
                mitigated += part * (1 - clampRes((Number(res[el]) || 0) - penV) / 100);
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
export function _calcPlayerResistanceReduction(amount, stats, element) {
    if (!element || amount <= 0) return amount;
    // Active map run: Elemental Weakness - #% reduced all Resistances.
    const resistMult = (typeof globalThis._egMapResistMult === 'function') ? globalThis._egMapResistMult() : 1;
    // allElementalResist (passive tree) is a flat bonus to fire, cold and
    // lightning - the three rollable elements. It deliberately does NOT touch
    // shadow resistance, and it still obeys the per-element cap below like any
    // other source. Lightning is a full element, covered here like fire and cold.
    const allElem = Math.max(0, stats.allElementalResist || 0);
    const penalty = _getResistPenaltyPct();
    const resMap = {
        fire: ((stats.fireResist || 0) + allElem) * resistMult - penalty,
        cold: ((stats.coldResist || 0) + allElem) * resistMult - penalty,
        lightning: ((stats.lightningResist || 0) + allElem) * resistMult - penalty,
        shadow: (stats.shadowResist || 0) * resistMult - penalty,
    };
    const cap = (typeof _getPlayerResistCap === 'function')
        ? _getPlayerResistCap(stats, element) : RESIST_CAP_PCT;
    const resPct = Math.min(cap, Math.max(RESIST_FLOOR_PCT, resMap[element] || 0));
    let reduced = amount * (1 - resPct / 100);
    return reduced;
}
