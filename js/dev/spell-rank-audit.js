import { switchScreen } from '../screens/screens.js';
import { t } from '../translation/translations.js';
import { ASCENDENCY_DEFS } from '../classes/ascendency-defs.js';
import { ASCENDENCY_LIST } from '../classes/class-cooldown-state.js';
import { CLASS_DEFS, CLASS_LIST } from '../classes/class-defs.js';
import { _scaleAbilityManaCost } from '../classes/class-mana.js';
import { _clsGetLocalizedName } from '../classes/class-ui.js';
import { SPELL_MAX_RANK, getCharmSlottedRank, getSkillCastRankFull, getSkillMaxRank, getSpellRankDamageMult, getSpellRankManaMult } from '../skills/skill-charms.js';
import { HEARTBLOOM_SKILL_ID, getSkillDamage, getSkillDef, getSkillEffect, getSkillImage, getSkillManaCost, getSkillName } from '../skills/skill-registry.js';
import { _uspAnchorMarkerClear, _uspAnchorMarkerShow, _uspProjDefFor } from '../skills/universal-spell-fx.js';
import { UNIVERSAL_SPELL_DEFS, USP_WARD_MIN_HIT_PCT, _uspCalcAbsorb, _uspCalcArmourPct, _uspCalcDodgePct, _uspCalcDrPct, _uspCalcHeal, _uspCalcHotTick, _uspCalcThornsPct, _uspCalcWardCharges, _uspHealingPower, _uspMaxAbsorption, _uspMaxLife, _uspRankAdditive, getUniversalSpellDef, isUniversalMovementSpell, isUniversalSupportSpell, isUspAnchorArmed } from '../skills/universal-spells.js';
// spell-rank-audit.js
//------------------------------------------------------------------------
//-------------------SPELL RANK AUDIT (dev screen)------------------------
//------------------------------------------------------------------------
// DEV-ONLY. One spell, every rank 1..SPELL_MAX_RANK, side by side - so rank
// scaling can be audited at a glance instead of by reading five files.
//
// OPEN IT
//   DevTest.ranks()                    → the screen, first roster entry
//   DevTest.ranks('usp_blizzard')      → straight to one spell
//   DevTest.ranks('probabilist_active1', 7)  → …and preselect a rank
//   index.html?spellaudit=usp_blizzard&rank=7
//
// WHAT EACH COLUMN SHOWS
//   • the two rank curves themselves (damage ×, mana ×)
//   • MANA: cost at that rank, its change against rank 1, and damage/mana
//   • DAMAGE: per hit, hit count, total - DoT ticks listed separately
//   • the EFFECT TABLE: whichever axes the spell actually has (heal, HoT,
//     absorb, DR%, armour%, dodge%, thorns%, ward charges, move distance,
//     speed%, duration, cooldown, damage/mana). Every magnitude is resolved by
//     the SHIPPED calculator with the audited rank passed in - including the
//     player's Healing Power gear, which gets its own row when it is non-zero
//     so a geared readout can't be mistaken for a change in authoring.
//   • a sandbox that replays the spell's REAL cast visual at the chosen rank
//
// WHAT THE CHART PLOTS - two bars per rank, each on its own scale: the
// spell's OUTPUT (total damage, or for a support/movement spell the primary
// effect magnitude - ward charges, heal total, blink distance …) against its
// MANA cost. A support spell charted by damage alone would be a flat zero, so
// the legend names the axis it actually drew. The gold number under each pair
// is the mana cost.
//
// ROSTER - every registered castable skill: 3 base classes × 2 actives, 6
// ascendencies × 2, Heartbloom, and all universal spells (91 entries today).
// Skills the player does not own are included on purpose: this is a tuning
// tool, not the spell book.
//
// THE ROW WORTH READING FIRST is "Effect rank cap" - shown only for spells
// that HAVE an authored effect ladder. The authored tables (class defs'
// `levels`, 3 rows each) only exist for ranks up to that length, and
// getSkillCastRankClamped() pins higher ranks to the top authored row. Ranks
// past the cap therefore gain the DAMAGE multiplier and nothing else - which
// is by design, and the single easiest thing to misread when tuning. Universal
// spells have no such ladder (their one `levels` row is a description stub),
// so they scale purely by the curve and the row is omitted for them.
//
// MIRRORING CAVEAT - the live resolvers read the SLOTTED charm off STATE, so
// they can only ever answer for one rank.
//   • SUPPORT magnitudes are NOT mirrored any more: _uspCalcHeal / HotTick /
//     Absorb / DrPct / ArmourPct / DodgePct / WardCharges / ThornsPct all take
//     an explicit rank, so this screen calls the real calculator. Nothing to
//     drift, gear included.
//   • DAMAGE and MANA still are mirrored, from the same primitives the live
//     resolvers use (getSpellRankDamageMult, getSpellRankManaMult,
//     def.damage.perHit) with an explicit rank. Two guards keep that honest:
//   • mana is back-derived from the SHIPPED resolver - the live cost divided
//     by the live rank's multiplier - so gear/map cost scaling, Heartbloom's
//     special path and any future cost hook are all inherited, not copied;
//   • when the audited rank IS the player's live cast rank, the screen
//     cross-checks its own numbers against getSkillDamage()/getSkillManaCost()
//     and says so in the footer. A drift becomes loud instead of silent.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//---------------------------ROSTER---------------------------------------
//------------------------------------------------------------------------
// Every registered castable skill, in the same order the spell book uses:
// class actives → ascendency actives → Heartbloom → the spell arsenal.

export function _sraPushRosterEntry(rows, id, group, ownerId) {
    if (typeof getSkillDef !== 'function' || !getSkillDef(id)) return;
    rows.push({
        id,
        group,
        ownerId: ownerId || null,
        name: (typeof getSkillName === 'function') ? getSkillName(id) : id,
        icon: (typeof getSkillDef === 'function' && getSkillDef(id).icon) || '✦',
    });
}

export function _sraRoster() {
    const rows = [];
    const classIds = (typeof CLASS_LIST !== 'undefined' && Array.isArray(CLASS_LIST))
        ? CLASS_LIST : Object.keys(typeof CLASS_DEFS !== 'undefined' ? CLASS_DEFS : {});

    for (const cid of classIds) {
        const def = (typeof CLASS_DEFS !== 'undefined') ? CLASS_DEFS[cid] : null;
        if (!def) continue;
        const label = (typeof _clsGetLocalizedName === 'function') ? _clsGetLocalizedName(def) : cid;
        _sraPushRosterEntry(rows, `${cid}_active1`, `${label}`, cid);
        _sraPushRosterEntry(rows, `${cid}_active2`, `${label}`, cid);
    }

    const ascIds = (typeof ASCENDENCY_LIST !== 'undefined' && Array.isArray(ASCENDENCY_LIST))
        ? ASCENDENCY_LIST
        : Object.keys(typeof ASCENDENCY_DEFS !== 'undefined' ? ASCENDENCY_DEFS : {});
    for (const aid of ascIds) {
        const asc = (typeof ASCENDENCY_DEFS !== 'undefined') ? ASCENDENCY_DEFS[aid] : null;
        if (!asc) continue;
        const label = (typeof _clsGetLocalizedName === 'function') ? _clsGetLocalizedName(asc) : aid;
        // The suffix separates an ascendency's actives from the base class's
        // ("Outlier (asc)" is not always obviously an ascendency by name alone).
        _sraPushRosterEntry(rows, `${aid}_active1`, `${label} ${t('sra_asc_suffix')}`, aid);
        _sraPushRosterEntry(rows, `${aid}_active2`, `${label} ${t('sra_asc_suffix')}`, aid);
    }

    if (typeof HEARTBLOOM_SKILL_ID !== 'undefined') {
        _sraPushRosterEntry(rows, HEARTBLOOM_SKILL_ID, t('sra_group_endgame'), null);
    }
    if (typeof UNIVERSAL_SPELL_DEFS !== 'undefined') {
        for (const spell of UNIVERSAL_SPELL_DEFS) {
            _sraPushRosterEntry(rows, spell.id, t('sra_group_arsenal'), null);
        }
    }
    return rows;
}


//------------------------------------------------------------------------
//---------------------------RANK MATH------------------------------------
//------------------------------------------------------------------------
// Pure, rank-parametric. Nothing here touches STATE.

export function _sraUniversal(spellId) {
    return (typeof getUniversalSpellDef === 'function') ? getUniversalSpellDef(spellId) : null;
}

export function _sraDef(spellId) {
    return (typeof getSkillDef === 'function') ? getSkillDef(spellId) : null;
}

export function _sraMaxRank(spellId) {
    if (typeof getSkillMaxRank === 'function') return getSkillMaxRank(spellId);
    return (typeof SPELL_MAX_RANK === 'number') ? SPELL_MAX_RANK : 10;
}

// Length of the AUTHORED effect table (class actives ship 3 rows). 0 = the
// spell has no authored table and scales purely by curve.
export function _sraAuthoredLevels(spellId) {
    const def = _sraDef(spellId);
    return (def && Array.isArray(def.levels) && def.levels.length) ? def.levels.length : 0;
}

export function _sraDmgMult(rank) {
    return (typeof getSpellRankDamageMult === 'function') ? getSpellRankDamageMult(rank) : 1;
}

export function _sraManaMult(rank) {
    return (typeof getSpellRankManaMult === 'function') ? getSpellRankManaMult(rank) : 1;
}

// The authored additive curve is a pure primitive the game already exports -
// call it rather than restating it (see _uspRankAdditive).
export function _sraRankAdditive(base, perRank, cap, rank) {
    return _uspRankAdditive(base, perRank, cap, rank);
}

// Mana at an arbitrary rank, derived from the shipped resolver so the ladder
// inherits gear/map cost scaling and the Blood Magic swap rather than
// re-deriving them. Falls back to the authored base when the live value is 0.
export function _sraMana(spellId, rank) {
    const usp = _sraUniversal(spellId);
    const def = _sraDef(spellId);
    const liveRank = (typeof getSkillCastRankFull === 'function') ? getSkillCastRankFull(spellId) : 1;
    const live = (typeof getSkillManaCost === 'function') ? Number(getSkillManaCost(spellId)) || 0 : 0;
    const liveMult = _sraManaMult(liveRank);
    let base = (live > 0 && liveMult > 0) ? live / liveMult : 0;
    if (!(base > 0)) {
        base = usp ? (usp.manaCost || 0) : ((def && def.manaCost) || 0);
        if (typeof _scaleAbilityManaCost === 'function') {
            try { base = _scaleAbilityManaCost(base); } catch (e) { /* best effort */ }
        }
    }
    return Math.max(0, Math.round(base * _sraManaMult(rank)));
}

// Damage at an arbitrary rank, mirroring getSkillDamage()'s baseline path
// (perHit[0] is the rank-1 reference and the rank curve supplies the rest).
// Returns null for spells with no damage payload at all.
export function _sraDamage(spellId, rank) {
    const usp = _sraUniversal(spellId);
    const def = _sraDef(spellId);
    const mult = _sraDmgMult(rank);

    if (usp && usp.dmg) {
        const perHitMin = Math.max(1, Math.round(usp.dmg[0] * mult));
        const perHitMax = Math.max(1, Math.round(usp.dmg[1] * mult));
        let count = 1;
        if (usp.behavior === 'volley' || usp.behavior === 'starfall' || usp.behavior === 'wild') count = usp.count || 1;
        else if (usp.behavior === 'ticks') count = 1 + (usp.ticks || 0);
        else if (usp.behavior === 'chain') count = usp.chainMax || 1;
        const dotTick = usp.tickDmg
            ? [Math.max(1, Math.round(usp.tickDmg[0] * mult)), Math.max(1, Math.round(usp.tickDmg[1] * mult))]
            : null;
        return {
            perHitMin, perHitMax, count,
            totalMin: perHitMin * count, totalMax: perHitMax * count,
            perTarget: !!usp.perTarget || !!usp.hitsAll || usp.behavior === 'chain',
            dotTick, dotTicks: dotTick ? (usp.ticks || 0) : 0,
        };
    }

    if (def && def.damage && Array.isArray(def.damage.perHit) && def.damage.perHit.length) {
        const base = def.damage.perHit[0];
        const perHitMin = Math.max(1, Math.round(base[0] * mult));
        const perHitMax = Math.max(1, Math.round(base[1] * mult));
        let count = 1;
        try {
            count = Math.max(1, Number(def.damage.count(getSkillEffect(spellId), rank)) || 1);
        } catch (e) { count = 1; }
        return {
            perHitMin, perHitMax, count,
            totalMin: perHitMin * count, totalMax: perHitMax * count,
            perTarget: false, dotTick: null, dotTicks: 0,
        };
    }
    return null;
}

// The spell's non-damage axes at one rank, mirroring the runtime calculators
// in universal-spells.js (which read the slotted rank, hence the mirror).
export function _sraEffects(spellId, rank) {
    const usp = _sraUniversal(spellId);
    if (!usp) return [];
    const rows = [];
    const mult = _sraDmgMult(rank);
    const maxLife = (typeof _uspMaxLife === 'function') ? _uspMaxLife() : 100;
    const maxAbs = (typeof _uspMaxAbsorption === 'function') ? _uspMaxAbsorption() : 0;

    const isSupport = (typeof isUniversalSupportSpell === 'function') && isUniversalSupportSpell(usp);
    const isMove = (typeof isUniversalMovementSpell === 'function') && isUniversalMovementSpell(usp);

    if (isSupport) {
        // Magnitudes come from the SHIPPED calculators with the audited rank
        // passed in - not from a transcription of them. Healing power gear is
        // therefore already inside the totals, and the gear row below says so.
        const hp = (typeof _uspHealingPower === 'function') ? _uspHealingPower() : { flat: 0, incPct: 0 };
        const geared = hp.flat > 0 || hp.incPct > 0;
        switch (usp.behavior) {
            case 'heal': {
                const flat = Math.round((usp.healFlat || 0) * mult);
                const pct = Math.round(maxLife * ((usp.healPct || 0) / 100));
                const total = _uspCalcHeal(usp, rank);
                rows.push({ label: t('sra_heal_flat'), value: `${flat}`, num: flat });
                // The parenthetical detail lives in the LABEL, not the value:
                // wide cells widen all ten rank columns.
                if (pct) rows.push({ label: t('sra_heal_pct'), value: `+${pct}`, num: pct });
                rows.push({ label: t('sra_heal_total'), value: `${total}`, num: total, emphasis: 'max', hint: geared ? t('sra_hint_includes_gear') : '' });
                break;
            }
            case 'hot': {
                const per = _uspCalcHotTick(usp, rank);
                const ticks = Math.max(1, usp.ticks || 6);
                rows.push({ label: t('sra_hot_tick'), value: `${per}`, num: per, hint: geared ? t('sra_hint_includes_gear') : '' });
                rows.push({ label: t('sra_hot_total'), value: `${per * ticks}`, hint: `${ticks}s`, num: per * ticks, emphasis: 'max' });
                break;
            }
            case 'shield': {
                const flat = Math.round((usp.absorbFlat || 0) * mult);
                const pct = Math.round(maxAbs * ((usp.absorbPct || 0) / 100));
                const pool = maxAbs > 0 ? `${maxAbs}` : t('sra_none');
                const total = _uspCalcAbsorb(usp, rank);
                rows.push({ label: t('sra_absorb_flat'), value: `${flat}`, num: flat });
                if (pct) rows.push({ label: t('sra_absorb_pct'), value: `+${pct}`, num: pct });
                rows.push({ label: t('sra_absorb_total'), value: `${total}`, num: total, emphasis: 'max', hint: geared ? t('sra_hint_includes_gear') : '' });
                rows.push({ label: t('sra_absorb_pool'), value: pool });
                break;
            }
            case 'guard':
                rows.push({ label: t('sra_dr_pct'), value: `-${_uspCalcDrPct(usp, rank)}%`, num: _uspCalcDrPct(usp, rank), emphasis: 'max' });
                rows.push({ label: t('sra_armour_pct'), value: `+${_uspCalcArmourPct(usp, rank)}%`, num: _uspCalcArmourPct(usp, rank), emphasis: 'max' });
                rows.push({ label: t('sra_cap'), value: `${usp.drPctCap}% / ${usp.armourPctCap}%`, hint: t('sra_hint_cap_nogear') });
                break;
            case 'evade':
                rows.push({ label: t('sra_dodge_pct'), value: `+${_uspCalcDodgePct(usp, rank)}%`, num: _uspCalcDodgePct(usp, rank), emphasis: 'max' });
                rows.push({ label: t('sra_cap'), value: `${usp.dodgePctCap}%`, hint: t('sra_hint_cap_nogear') });
                break;
            case 'ward': {
                const charges = _uspCalcWardCharges(usp, rank);
                rows.push({ label: t('sra_ward_charges'), value: `${charges}`, num: charges, emphasis: 'max' });
                rows.push({ label: t('sra_ward_cap'), value: `${usp.wardChargesCap}`, hint: t('sra_hint_cap_nogear') });
                rows.push({
                    label: t('sra_ward_min_hit'),
                    value: `${(typeof USP_WARD_MIN_HIT_PCT !== 'undefined') ? USP_WARD_MIN_HIT_PCT : 5}%`,
                    hint: t('sra_of_max_life'),
                });
                break;
            }
            case 'thorns':
                rows.push({ label: t('sra_thorns_pct'), value: `${_uspCalcThornsPct(usp, rank)}%`, num: _uspCalcThornsPct(usp, rank), emphasis: 'max' });
                rows.push({ label: t('sra_cap'), value: `${usp.thornsPctCap}%`, hint: t('sra_hint_cap_nogear') });
                break;
            default: break;
        }
        // Gear's contribution, stated as a row instead of silently folded into
        // the totals above - otherwise a geared player reads the ladder as if
        // the authoring had changed. Only on the axes healing power actually
        // reaches; the capped ones carry their own "gear cannot move this cap"
        // hint instead.
        if (geared && (usp.behavior === 'heal' || usp.behavior === 'hot' || usp.behavior === 'shield')) {
            rows.push({
                label: t('sra_healing_power'),
                value: `+${hp.flat}${hp.incPct ? ` / +${hp.incPct}%` : ''}`,
                hint: t('sra_hint_healing_power'),
                flat: true,
            });
        }
        if (usp.buffSeconds) rows.push({ label: t('sra_duration'), value: `${usp.buffSeconds}s` });
    }

    if (isMove) {
        const walk = (typeof globalThis.AVATAR_MOVE_SPEED_PX_PER_SEC === 'number') ? globalThis.AVATAR_MOVE_SPEED_PX_PER_SEC : 320;
        if (usp.moveBasePx) {
            const dist = Math.round(_sraRankAdditive(usp.moveBasePx, usp.movePxPerRank || 0, usp.movePxCap || 0, rank));
            rows.push({ label: t('sra_distance'), value: `${dist}px`, num: dist, emphasis: 'max' });
            rows.push({ label: t('sra_walk_time'), value: `${(dist / walk).toFixed(2)}s`, num: dist / walk, emphasis: 'max' });
            rows.push({ label: t('sra_distance_cap'), value: `${usp.movePxCap}px` });
        }
        if (usp.speedPct != null) {
            const spd = Math.round(_sraRankAdditive(usp.speedPct, usp.speedPctPerRank || 0, usp.speedPctCap || 0, rank));
            // The hint is rank-CONSTANT here on purpose: the ladder shows one
            // hint per row, so a per-rank px/s figure would be a lie for nine
            // of the ten columns. The base walk speed is the useful constant.
            rows.push({
                label: t('sra_speed_pct'),
                value: `+${spd}%`,
                hint: t('sra_walk_base').replace('{v}', String(walk)),
                num: spd,
                emphasis: 'max',
            });
            rows.push({ label: t('sra_speed_cap'), value: `+${usp.speedPctCap}%` });
        }
        if (usp.glideMs) rows.push({ label: t('sra_travel_time'), value: `${usp.glideMs}ms` });
        if (usp.buffSeconds) rows.push({ label: t('sra_speed_window'), value: `${usp.buffSeconds}s` });
        if (usp.anchorSeconds) {
            rows.push({ label: t('sra_armed_window'), value: `${usp.anchorSeconds}s` });
            rows.push({ label: t('sra_place_cooldown'), value: `${usp.anchorPlaceCooldownSeconds || 0}s` });
        }
    }

    if (usp.buffSeconds == null && isSupport === false && !isMove && usp.ticks) {
        rows.push({ label: t('sra_ticks'), value: `${usp.ticks}` });
    }
    return rows;
}


//------------------------------------------------------------------------
//---------------------------TABLE MODEL----------------------------------
//------------------------------------------------------------------------

// Every row of the ladder, already evaluated for each rank. `emphasis` marks
// which cell in the row is the "best" one so the audit eye lands there;
// `group` inserts a section bar.
export function _sraBuildModel(spellId) {
    const maxRank = _sraMaxRank(spellId);
    // A universal spell's `levels` is a one-row DESCRIPTIONS stub (see
    // skill-registry), not an authored effect ladder - its magnitudes scale by
    // the rank curve instead. Reporting "frozen at 1" for every rank above 1
    // would be technically true and completely misleading, so those spells opt
    // out of the authored-table presentation entirely.
    const isUniversal = !!_sraUniversal(spellId);
    const authored = isUniversal ? 0 : _sraAuthoredLevels(spellId);
    const rows = [];
    const rankOf = (i) => i + 1;

    // ── RANK CURVE ────────────────────────────────────────────────────
    rows.push({ group: t('sra_g_curve') });
    rows.push({
        label: t('sra_row_dmg_mult'),
        values: Array.from({ length: maxRank }, (_, i) => `×${_sraDmgMult(rankOf(i)).toFixed(2)}`),
        nums: Array.from({ length: maxRank }, (_, i) => _sraDmgMult(rankOf(i))),
        emphasis: 'max',
    });
    rows.push({
        label: t('sra_row_mana_mult'),
        values: Array.from({ length: maxRank }, (_, i) => `×${_sraManaMult(rankOf(i)).toFixed(2)}`),
        nums: Array.from({ length: maxRank }, (_, i) => _sraManaMult(rankOf(i))),
    });
    // Only meaningful for spells with a real authored effect ladder (class
    // actives ship 3 rows). Universal spells scale by the curve instead, so
    // the row is omitted rather than reporting a cap that isn't one.
    if (authored) {
        rows.push({
            label: t('sra_row_effect_cap'),
            hint: t('sra_hint_effect_cap'),
            values: Array.from({ length: maxRank }, (_, i) => {
                const r = rankOf(i);
                return r <= authored ? `${t('sra_authored')} ${r}` : `${t('sra_frozen_at')} ${authored}`;
            }),
            frozen: Array.from({ length: maxRank }, (_, i) => rankOf(i) > authored),
        });
    }

    // ── COST ──────────────────────────────────────────────────────────
    const mana = Array.from({ length: maxRank }, (_, i) => _sraMana(spellId, rankOf(i)));
    const mana0 = mana[0] || 1;
    rows.push({ group: t('sra_g_cost') });
    rows.push({
        label: t('sra_row_mana'),
        values: mana.map((v) => `${v}`),
        nums: mana,
        emphasis: 'min',
    });
    rows.push({
        label: t('sra_row_mana_delta'),
        values: mana.map((v) => (v === mana[0] ? '-' : `+${Math.round((v / mana0 - 1) * 100)}%`)),
        nums: mana.map((v) => v / mana0),
    });

    // ── DAMAGE ────────────────────────────────────────────────────────
    const dmg = Array.from({ length: maxRank }, (_, i) => _sraDamage(spellId, rankOf(i)));
    const anyDmg = dmg.some(Boolean);
    rows.push({ group: t('sra_g_damage') });
    if (anyDmg) {
        rows.push({
            label: t('sra_row_per_hit'),
            values: dmg.map((d) => (d ? `${d.perHitMin}–${d.perHitMax}` : '-')),
            nums: dmg.map((d) => (d ? d.perHitMin : 0)),
            emphasis: 'max',
        });
        rows.push({
            label: t('sra_row_hits'),
            values: dmg.map((d) => (d ? `${d.count}` : '-')),
            nums: dmg.map((d) => (d ? d.count : 0)),
        });
        rows.push({
            label: t('sra_row_total'),
            hint: t('sra_hint_total'),
            values: dmg.map((d) => (d ? `${d.totalMin}–${d.totalMax}` : '-')),
            nums: dmg.map((d) => (d ? d.totalMax : 0)),
            emphasis: 'max',
        });
        if (dmg.some((d) => d && d.dotTick)) {
            rows.push({
                label: t('sra_row_dot_tick'),
                values: dmg.map((d) => (d && d.dotTick ? `${d.dotTick[0]}–${d.dotTick[1]} ×${d.dotTicks}` : '-')),
                nums: dmg.map((d) => (d && d.dotTick ? d.dotTick[1] * d.dotTicks : 0)),
                emphasis: 'max',
            });
        }
        const perMana = dmg.map((d, i) => (d && mana[i] > 0 ? Math.round((d.totalMax / mana[i]) * 100) / 100 : null));
        if (perMana.some((v) => v != null)) {
            rows.push({
                label: t('sra_row_per_mana'),
                hint: t('sra_hint_per_mana'),
                values: perMana.map((v) => (v == null ? '-' : `${v}`)),
                nums: perMana.map((v) => v || 0),
                emphasis: 'max',
            });
        }
    } else if (authorsEffects(spellId)) {
        rows.push({ label: t('sra_row_damage'), values: Array.from({ length: maxRank }, () => t('sra_none')) });
    }

    // ── EFFECT TABLE ──────────────────────────────────────────────────
    // Union of every axis the spell has, in the order the rank-1 column
    // introduces them, so the rows line up across ranks.
    const perRank = Array.from({ length: maxRank }, (_, i) => _sraEffects(spellId, rankOf(i)));
    const labels = [];
    perRank.forEach((list) => list.forEach((e) => { if (!labels.includes(e.label)) labels.push(e.label); }));
    // `primary` is the axis the curve panel plots for spells with no damage
    // (the first emphasised effect row - Ward charges, heal total, blink
    // distance …). Without it, a support spell's chart is a bare mana cost
    // graph, which tells a tuner nothing about the thing being tuned.
    let primary = null;
    let primaryLabel = '';
    if (labels.length) {
        rows.push({ group: t('sra_g_effects') });
        for (const label of labels) {
            const entries = perRank.map((list) => list.find((e) => e.label === label) || null);
            const emphasis = (entries.find((e) => e && e.emphasis) || {}).emphasis || null;
            const row = {
                label,
                hint: (entries.find((e) => e && e.hint) || {}).hint || '',
                values: entries.map((e) => (e ? e.value : '-')),
                nums: entries.map((e) => (e && typeof e.num === 'number' ? e.num : 0)),
                emphasis,
            };
            rows.push(row);
            if (emphasis === 'max' && !primary) { primary = row.nums.slice(); primaryLabel = label; }
        }
        if (!primary && rows.length) {
            const first = rows.slice(-labels.length).find((r) => Array.isArray(r.nums));
            if (first) { primary = first.nums.slice(); primaryLabel = first.label; }
        }
    }

    // ── TIMING ────────────────────────────────────────────────────────
    const def = _sraDef(spellId);
    const usp = _sraUniversal(spellId);
    const cd = usp ? (usp.cooldownSeconds || 0) : ((def && def.cooldownSeconds) || 0);
    rows.push({ group: t('sra_g_timing') });
    rows.push({ label: t('sra_row_cooldown'), values: Array.from({ length: maxRank }, () => `${cd}s`), nums: Array.from({ length: maxRank }, () => cd), flat: true });
    const burst = Array.from({ length: maxRank }, (_, i) => {
        const d = dmg[i];
        return d ? Math.round((d.totalMax / Math.max(1, cd)) * 100) / 100 : 0;
    });
    if (anyDmg && cd > 0) {
        rows.push({ label: t('sra_row_dps'), hint: t('sra_hint_dps'), values: burst.map((v) => `${v}`), nums: burst, emphasis: 'max' });
    }

    return { rows, maxRank, authored, dmg, mana, cd, primary, primaryLabel };
}

// True when the spell has any effect rows at all (support / movement).
export function authorsEffects(spellId) {
    for (let r = 1; r <= 2; r++) if (_sraEffects(spellId, r).length) return true;
    return false;
}


//------------------------------------------------------------------------
//---------------------------STATE---------------------------------------
//------------------------------------------------------------------------

export let _sraSelected = null;   // spell id
export let _sraRank = 1;          // rank shown / played in the sandbox
export let _sraFxTimers = [];

export function _sraRankClampFor(spellId, rank) {
    return Math.max(1, Math.min(Number(rank) || 1, _sraMaxRank(spellId)));
}


//------------------------------------------------------------------------
//---------------------------RENDERING------------------------------------
//------------------------------------------------------------------------

export function _sraEl(id) { return document.getElementById(id); }

export function _sraBuildLayoutHTML() {
    return `
<div class="sra-layout">
    <div class="sra-bar">
        <button class="sra-btn" id="sra-btn-back" onclick="DevTest.map()">${t('sra_btn_back')}</button>
        <span class="sra-title" id="sra-title">${t('sra_title')}</span>
        <select class="sra-select" id="sra-picker" onchange="_sraOnPick(this.value)"></select>
        <button class="sra-btn" id="sra-btn-prev" onclick="_sraStep(-1)">${t('sra_prev')}</button>
        <button class="sra-btn" id="sra-btn-next" onclick="_sraStep(1)">${t('sra_next')}</button>
    </div>

    <div class="sra-head" id="sra-head"></div>

    <div class="sra-split">
        <div class="sra-panel">
            <div class="sra-panel-title" id="sra-panel-visual">${t('sra_cast_visual')}</div>
            <div class="sra-stage" id="sra-stage">
                <div class="sra-actor sra-caster"><span class="sra-actor-dot"></span><span class="sra-actor-label" id="sra-actor-caster">${t('sra_caster')}</span></div>
                <div class="sra-actor sra-target" id="sra-target"><span class="sra-actor-dot"></span><span class="sra-actor-label" id="sra-actor-target">${t('sra_target')}</span></div>
            </div>
            <div class="sra-stage-ctl">
                <button class="sra-btn sra-btn-play" id="sra-btn-play" onclick="_sraPlayVisual()">${t('sra_play')}</button>
                <span class="sra-rank-pill" id="sra-rank-pill"></span>
                <span class="sra-fx-note" id="sra-fx-note"></span>
            </div>
        </div>
        <div class="sra-panel sra-panel-curve">
            <div class="sra-panel-title" id="sra-panel-curve">${t('sra_curve')}</div>
            <div class="sra-curve" id="sra-curve"></div>
        </div>
    </div>

    <div class="sra-table-wrap">
        <table class="sra-table" id="sra-table"></table>
    </div>
    <div class="sra-foot" id="sra-foot"></div>
</div>`;
}

// Rank column headers + the whole ladder body, rebuilt on every change.
// The chrome (title, buttons, panel captions) is built once with the screen,
// so a language toggle while it is open would leave it in the old language.
// Re-stamping the few static labels on every render keeps EN/DE honest.
export function _sraRefreshChrome() {
    const set = (id, key) => { const el = _sraEl(id); if (el) el.textContent = t(key); };
    set('sra-title', 'sra_title');
    set('sra-btn-back', 'sra_btn_back');
    set('sra-btn-prev', 'sra_prev');
    set('sra-btn-next', 'sra_next');
    set('sra-btn-play', 'sra_play');
    set('sra-panel-visual', 'sra_cast_visual');
    set('sra-panel-curve', 'sra_curve');
    set('sra-actor-caster', 'sra_caster');
    set('sra-actor-target', 'sra_target');
}

export function _sraRender() {
    const spellId = _sraSelected;
    if (!spellId) return;
    _sraRefreshChrome();
    const def = _sraDef(spellId);
    const usp = _sraUniversal(spellId);
    const model = _sraBuildModel(spellId);
    _sraRank = _sraRankClampFor(spellId, _sraRank);

    // ── header chips ──────────────────────────────────────────────────
    const head = _sraEl('sra-head');
    if (head) {
        const icon = (def && def.icon) || '✦';
        const img = (typeof getSkillImage === 'function') ? getSkillImage(spellId) : null;
        const tags = (def && def.tags) ? def.tags.join(' · ') : '';
        const family = usp
            ? `${usp.behavior}${usp.theme ? ` · ${usp.theme}` : ''}${usp.damageKind ? ` · ${usp.damageKind}` : ''}`
            : ((def && def.source) ? def.source.kind : '-');
        const liveRank = (typeof getSkillCastRankFull === 'function') ? getSkillCastRankFull(spellId) : 1;
        const slotted = (typeof getCharmSlottedRank === 'function') ? getCharmSlottedRank(spellId) : null;
        head.innerHTML = `
            ${img ? `<img class="sra-head-img" src="${img}" alt="">` : `<span class="sra-head-icon">${icon}</span>`}
            <div class="sra-head-text">
                <div class="sra-head-name">${(typeof getSkillName === 'function') ? getSkillName(spellId) : spellId}</div>
                <div class="sra-head-id">${spellId}${tags ? ` - ${tags}` : ''}</div>
                <div class="sra-head-meta">${t('sra_family')}: ${family} · ${t('sra_max_rank')}: ${model.maxRank}` +
                `${model.authored ? ` · ${t('sra_authored_levels')}: ${model.authored}` : ''}` +
                ` · ${t('sra_live_rank')}: ${liveRank}${slotted ? ` (${t('sra_slotted')} ${slotted})` : ''}</div>
            </div>`;
    }

    // ── curve panel ───────────────────────────────────────────────────
    const curve = _sraEl('sra-curve');
    if (curve) {
        // Two bars per rank, each on its OWN scale: the spell's output and its
        // mana cost. "Output" is total damage for an offensive spell and the
        // primary effect magnitude for a support/movement one - never an empty
        // blue bar. The number under the pair is the mana cost, matching the
        // gold bar (the legend says so explicitly).
        const totals = model.mana.map((m, i) => (model.dmg[i] ? model.dmg[i].totalMax : 0));
        const hasDamage = totals.some((v) => v > 0);
        const output = hasDamage ? totals : (model.primary || model.mana.map(() => 0));
        const outLegend = hasDamage ? t('sra_legend_dmg') : t('sra_legend_effect').replace('{n}', model.primaryLabel || '');
        const maxOut = Math.max(1, ...output);
        const maxMana = Math.max(1, ...model.mana);
        const bars = model.mana.map((m, i) => {
            const d = model.dmg[i];
            const outPct = Math.round((output[i] / maxOut) * 100);
            const manaPct = Math.round((m / maxMana) * 100);
            const outTxt = hasDamage && d ? `${d.totalMin}\u2013${d.totalMax}` : `${output[i]}`;
            const tip = `${t('sra_rank')} ${i + 1} \u00b7 ${t('sra_row_mana')} ${m}`
                + ` \u00b7 ${hasDamage ? t('sra_row_total') : (model.primaryLabel || '')} ${outTxt}`;
            return `<div class="sra-bar-col" data-tip="${globalThis._tipAttr(tip)}">
                <div class="sra-bar-stack">
                    <div class="sra-bar sra-bar-dmg" style="height:${Math.max(2, outPct)}%"></div>
                    <div class="sra-bar sra-bar-mana" style="height:${Math.max(2, manaPct)}%"></div>
                </div>
                <div class="sra-bar-num">${m}</div>
                <div class="sra-bar-rank">${i + 1}</div>
            </div>`;
        }).join('');
        const lastTotal = model.dmg[model.dmg.length - 1];
        // A support/movement spell still scales its MAGNITUDES by the damage
        // curve (see _uspSupportRankMult), so calling that axis "damage" would
        // be wrong without being false. Name the axis instead.
        const effectOnly = !lastTotal && authorsEffects(spellId);
        curve.innerHTML = `
            <div class="sra-curve-note">${(effectOnly ? t('sra_curve_note_effect') : t('sra_curve_note'))
                .replace('{d}', _sraDmgMult(model.maxRank).toFixed(2))
                .replace('{m}', _sraManaMult(model.maxRank).toFixed(2))
                .replace('{t}', lastTotal ? `${lastTotal.totalMin}–${lastTotal.totalMax}` : '-')}</div>
            <div class="sra-bars">${bars}</div>
            <div class="sra-legend">
                <span class="sra-legend-dmg">${outLegend}</span>
                <span class="sra-legend-mana">${t('sra_legend_mana')}</span>
                <span class="sra-legend-note">${t('sra_legend_note')}</span>
            </div>`;
    }

    // ── ladder table ──────────────────────────────────────────────────
    const table = _sraEl('sra-table');
    if (table) {
        const th = Array.from({ length: model.maxRank }, (_, i) => `<th class="${(i + 1) === _sraRank ? 'is-active' : ''}">${t('sra_rank')} ${i + 1}</th>`).join('');
        let body = '';
        for (const row of model.rows) {
            if (row.group) {
                body += `<tr class="sra-group"><th colspan="${model.maxRank + 1}">${row.group}</th></tr>`;
                continue;
            }
            let bestIdx = -1;
            if (row.emphasis && Array.isArray(row.nums) && !row.flat) {
                const pool = row.nums.filter((n) => typeof n === 'number');
                if (pool.length) {
                    const target = row.emphasis === 'min' ? Math.min(...pool) : Math.max(...pool);
                    if (target !== 0 || row.emphasis === 'min') bestIdx = row.nums.indexOf(target);
                }
            }
            const cells = (row.values || []).map((v, i) => {
                const cls = [
                    (i + 1) === _sraRank ? 'is-active' : '',
                    i === bestIdx ? 'is-best' : '',
                    (row.frozen && row.frozen[i]) ? 'is-frozen' : '',
                ].filter(Boolean).join(' ');
                return `<td class="${cls}">${v}</td>`;
            }).join('');
            body += `<tr>
                <th class="sra-row-label">${row.label}${row.hint ? `<span class="sra-row-hint">${row.hint}</span>` : ''}</th>
                ${cells}</tr>`;
        }
        table.innerHTML = `<thead><tr><th class="sra-row-label">${t('sra_metric')}</th>${th}</tr></thead><tbody>${body}</tbody>`;
    }

    // ── rank pill + footer cross-check ────────────────────────────────
    const pill = _sraEl('sra-rank-pill');
    if (pill) pill.textContent = `${t('sra_showing_rank')} ${_sraRank}`;
    const note = _sraEl('sra-fx-note');
    if (note) note.textContent = _sraFxNote(spellId);

    const foot = _sraEl('sra-foot');
    if (foot) foot.innerHTML = _sraFooterHTML(spellId, model);
}

// The footer's cross-check: when the audited rank is the rank the game would
// actually cast, compare this screen's numbers against the shipped resolvers.
export function _sraFooterHTML(spellId, model) {
    const liveRank = (typeof getSkillCastRankFull === 'function') ? getSkillCastRankFull(spellId) : null;
    const idx = _sraRank - 1;
    const mine = model.mana[idx];
    const lived = (typeof getSkillManaCost === 'function') ? getSkillManaCost(spellId) : null;
    const dmgMine = model.dmg[idx];
    const dmgLive = (typeof getSkillDamage === 'function') ? getSkillDamage(spellId) : null;

    if (liveRank !== _sraRank) {
        return `<span class="sra-note">${t('sra_cross_off').replace('{r}', String(liveRank))}</span>`;
    }
    const manaOk = (lived === null || lived === mine);
    let dmgOk = true;
    if (dmgMine && dmgLive) {
        dmgOk = dmgLive.totalMax === dmgMine.totalMax && dmgLive.count === dmgMine.count;
    }
    const ok = manaOk && dmgOk;
    const tag = ok ? `<span class="sra-ok">✓ ${t('sra_cross_ok')}</span>`
        : `<span class="sra-bad">✗ ${t('sra_cross_bad')}</span>`;
    return `${tag}<span class="sra-note">${t('sra_cross_live').replace('{r}', String(liveRank))}`
        + ` · ${t('sra_mana')} ${mine} vs ${lived} · ${t('sra_dmg')} `
        + `${dmgMine ? dmgMine.totalMax : '-'} vs ${dmgLive ? dmgLive.totalMax : '-'}</span>`;
}

// Which real FX the sandbox can replay for this spell.
export function _sraFxNote(spellId) {
    const usp = _sraUniversal(spellId);
    if (!usp) return t('sra_fx_class');
    if (typeof isUniversalSupportSpell === 'function' && isUniversalSupportSpell(usp)) return t('sra_fx_support');
    if (typeof isUniversalMovementSpell === 'function' && isUniversalMovementSpell(usp)) return t('sra_fx_move');
    return t('sra_fx_proj');
}


//------------------------------------------------------------------------
//-------------------------VISUAL SANDBOX--------------------------------
//------------------------------------------------------------------------
// Replays the spell's REAL visual, built from the same art the game uses:
//   • universal offensive spells → USP_THEME_PROJ[theme]  (spell-rank-audit
//     fires it through _egFireProjectile, the shared flight code)
//   • class / ascendency / Heartbloom spells → EG_CLASS_PROJECTILES[owner]
//   • universal support → the .usp-support-ring + floating value label
//   • universal movement → the .usp-move-streak trail
// Impact / nova / DoT overlays are the spell's own classes from
// css/universal-spells.css; class spells get the shared eg-hit-burst ring.
// Everything is position:fixed and self-removing, so nothing here depends on
// an encounter being live.
//------------------------------------------------------------------------

export function _sraStagePoints() {
    const stage = _sraEl('sra-stage');
    const target = _sraEl('sra-target');
    if (!stage) return null;
    const sr = stage.getBoundingClientRect();
    const start = { x: sr.left + Math.round(sr.width * 0.18), y: sr.top + Math.round(sr.height * 0.52) };
    let end = { x: sr.left + Math.round(sr.width * 0.78), y: start.y };
    if (target) {
        const tr = target.getBoundingClientRect();
        if (tr.width) end = { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 };
    }
    return { start, end, targetEl: target, stage };
}

export function _sraClearStage() {
    _sraFxTimers.forEach((id) => clearTimeout(id));
    _sraFxTimers = [];
    document.querySelectorAll('.eg-projectile').forEach((el) => { try { el.remove(); } catch (e) {} });
    document.querySelectorAll('.sra-fx').forEach((el) => { try { el.remove(); } catch (e) {} });
    if (typeof _uspAnchorMarkerClear === 'function' && typeof isUspAnchorArmed === 'function' && !isUspAnchorArmed()) {
        // Only clear a marker this screen drew; a live encounter owns its own.
        try { _uspAnchorMarkerClear(); } catch (e) { /* fine */ }
    }
}

export function _sraAfter(ms, fn) {
    _sraFxTimers.push(setTimeout(fn, ms));
}

// Overlay on the sandbox target - same class names the game appends to a
// monster card, so the real keyframes play.
export function _sraStageOverlay(className, ms) {
    const target = _sraEl('sra-target');
    if (!target) return;
    const el = document.createElement('div');
    el.className = `${className} sra-fx`;
    target.appendChild(el);
    _sraAfter(ms || 900, () => { try { el.remove(); } catch (e) {} });
}

export function _sraHitBurst(x, y, color, isCrit) {
    if (typeof globalThis.EG_HIT_ELEMENT_COLORS === 'undefined') return;
    const burst = document.createElement('div');
    burst.className = 'eg-hit-burst sra-fx';
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    const ring = document.createElement('div');
    ring.className = 'eg-hit-ring';
    ring.style.setProperty('--eg-hit-color', color || globalThis.EG_HIT_ELEMENT_COLORS.physical);
    if (isCrit) {
        ring.style.transform = 'scale(1.35)';
        ring.style.borderWidth = '4px';
        ring.style.filter = 'brightness(1.5)';
    }
    burst.appendChild(ring);
    const sparkCount = (typeof globalThis.EG_HIT_BURST_SPARK_COUNT === 'number') ? globalThis.EG_HIT_BURST_SPARK_COUNT : 8;
    for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement('div');
        spark.className = 'eg-hit-spark';
        spark.style.setProperty('--eg-hit-color', color || globalThis.EG_HIT_ELEMENT_COLORS.physical);
        const angle = (Math.PI * 2 * i) / sparkCount;
        spark.style.setProperty('--eg-hit-dx', `${Math.cos(angle) * 22}px`);
        spark.style.setProperty('--eg-hit-dy', `${Math.sin(angle) * 22}px`);
        burst.appendChild(spark);
    }
    document.body.appendChild(burst);
    _sraAfter(900, () => { try { burst.remove(); } catch (e) {} });
}

// Class / ascendency projectile art, keyed by owner id.
export function _sraClassProjDef(spellId) {
    if (typeof globalThis.EG_CLASS_PROJECTILES === 'undefined') return null;
    const def = _sraDef(spellId);
    const owner = (def && def.source && def.source.ownerId) || null;
    return globalThis.EG_CLASS_PROJECTILES[owner] || globalThis.EG_CLASS_PROJECTILES._default || null;
}

// Fires ONE real projectile and OWNS its lifetime.
//
// _egFireProjectile removes its own element from `anim.onfinish` (see
// js/combat/combat-class-projectiles.js). That is reliable in-game, but this
// screen is not the game: a 5-projectile volley (Rain of Fire) came back with
// the projectiles parked at the origin - animations gone, arrival never fired
// - which reads as a spell that does nothing. So the flight timeline is driven
// from here instead: the impact fires at `dur`, and whichever element the call
// created is removed just after. If onfinish ALSO fires (it does for class
// spells), both paths are no-ops and the result is identical.
export function _sraFireFlight(projDef, start, end, dur, easing, scale, onArrive) {
    const before = new Set(document.querySelectorAll('.eg-projectile'));
    try {
        globalThis._egFireProjectile(projDef, projDef.cssClass, start, end, dur, easing, () => {}, null, scale);
    } catch (e) {
        return null; // flight is cosmetic - never let the sandbox throw
    }
    const created = Array.from(document.querySelectorAll('.eg-projectile')).filter((el) => !before.has(el));
    _sraAfter(dur + 20, () => { if (onArrive) onArrive(); });
    _sraAfter(dur + 140, () => { created.forEach((el) => { try { el.remove(); } catch (e) {} }); });
    return created[0] || null;
}

export function _sraPlayVisual() {
    if (!_sraSelected) return;
    _sraClearStage();
    const pts = _sraStagePoints();
    if (!pts) return;
    const spellId = _sraSelected;
    const usp = _sraUniversal(spellId);
    const row = _sraDamage(spellId, _sraRank);
    const hits = row ? Math.max(1, Math.min(row.count, 6)) : 1;

    // ── universal offensive: themed projectile + its own impact overlays ──
    if (usp && usp.dmg && typeof globalThis._egFireProjectile === 'function') {
        const projDef = (typeof _uspProjDefFor === 'function') ? _uspProjDefFor(usp) : null;
        if (projDef) {
            const big = usp.behavior === 'single' && (usp.dmg[0] >= 40);
            const fromSky = !!usp.fromSky || usp.behavior === 'delayed' || usp.behavior === 'starfall';
            for (let i = 0; i < hits; i++) {
                _sraAfter(i * (typeof globalThis.EG_REVEAL_PROJECTILE_STAGGER_MS === 'number' ? globalThis.EG_REVEAL_PROJECTILE_STAGGER_MS : 60), () => {
                    const p = _sraStagePoints();
                    if (!p) return;
                    const start = fromSky ? { x: p.end.x, y: p.end.y - 300 } : p.start;
                    _sraFireFlight(
                        projDef, start, p.end,
                        fromSky ? 550 : projDef.duration,
                        fromSky ? 'ease-in' : projDef.easing,
                        big ? 1.8 : 1.4,
                        () => {
                            const show = _sraRank <= 2 || i === 0 || i === hits - 1;
                            if (!show) return;
                            _sraStageOverlay(`usp-impact usp-impact-${usp.theme || 'arcane'}${big ? ' is-big' : ''}`, big ? 900 : 650);
                            if (usp.perTarget || usp.hitsAll) _sraStageOverlay(`usp-nova usp-nova-${usp.theme || 'arcane'}`, 800);
                            if (usp.tickDmg) _sraStageOverlay(`usp-dot usp-dot-${usp.theme || 'arcane'}`, 850);
                        }
                    );
                });
            }
            // Delayed spells telegraph the impact site first, like the game.
            if (usp.behavior === 'delayed') _sraStageOverlay('usp-telegraph usp-telegraph-fire', (usp.delayMs || 900) + 250);
            return;
        }
    }

    // ── class / ascendency / Heartbloom: the class's own projectile art ───
    if (!usp) {
        const projDef = _sraClassProjDef(spellId);
        if (projDef && typeof globalThis._egFireProjectile === 'function') {
            const color = (typeof globalThis.EG_HIT_ELEMENT_COLORS !== 'undefined') ? globalThis.EG_HIT_ELEMENT_COLORS.physical : '#ffffff';
            for (let i = 0; i < hits; i++) {
                _sraAfter(i * 90, () => {
                    const p = _sraStagePoints();
                    if (!p) return;
                    _sraFireFlight(
                        projDef, p.start, p.end, projDef.duration, projDef.easing, 1.4,
                        () => _sraHitBurst(p.end.x, p.end.y, color, i === hits - 1)
                    );
                });
            }
            return;
        }
        // No art we can source - say so rather than invent one.
        _sraStageFlash(t('sra_no_visual'));
        return;
    }

    // ── universal support: ring pulse + the rank's real magnitude label ───
    if (typeof isUniversalSupportSpell === 'function' && isUniversalSupportSpell(usp)) {
        const est = _sraSupportLabelText(usp, _sraRank);
        const theme = usp.theme || 'holy';
        const ring = document.createElement('div');
        ring.className = `usp-support-ring usp-support-ring-${theme} sra-fx`;
        ring.style.left = `${pts.start.x}px`;
        ring.style.top = `${pts.start.y}px`;
        document.body.appendChild(ring);
        _sraAfter(1000, () => { try { ring.remove(); } catch (e) {} });
        if (est.text) {
            const label = document.createElement('div');
            label.className = 'usp-support-label sra-fx';
            const inner = document.createElement('span');
            inner.className = 'usp-support-label-text';
            inner.textContent = est.text;
            label.appendChild(inner);
            label.style.left = `${pts.start.x}px`;
            label.style.top = `${pts.start.y - 26}px`;
            label.style.color = est.color;
            document.body.appendChild(label);
            _sraAfter(1200, () => { try { label.remove(); } catch (e) {} });
        }
        _sraStageOverlay('usp-impact usp-impact-' + theme, 650);
        return;
    }

    // ── universal movement: the streak between where you were and land ────
    if (typeof isUniversalMovementSpell === 'function' && isUniversalMovementSpell(usp)) {
        const theme = usp.theme || 'arcane';
        const soft = usp.behavior !== 'blink';
        const streak = document.createElement('div');
        streak.className = `usp-move-streak usp-move-streak-${theme}${soft ? ' is-soft' : ''} sra-fx`;
        streak.style.left = `${pts.start.x}px`;
        streak.style.top = `${pts.start.y}px`;
        streak.style.width = `${Math.abs(pts.end.x - pts.start.x)}px`;
        streak.style.transform = `rotate(${Math.atan2(pts.end.y - pts.start.y, pts.end.x - pts.start.x)}rad)`;
        document.body.appendChild(streak);
        _sraAfter(750, () => { try { streak.remove(); } catch (e) {} });
        if (usp.behavior === 'anchor' && typeof _uspAnchorMarkerShow === 'function') {
            _uspAnchorMarkerShow(usp, pts.start.x, pts.start.y, usp.anchorSeconds || 15);
            _sraAfter(2600, () => { try { _uspAnchorMarkerClear(); } catch (e) {} });
        }
        return;
    }

    _sraStageFlash(t('sra_no_visual'));
}

// The floating value a support cast would print at this rank - the same
// numbers the ladder above lists, so the visual and the table agree.
// Every value here comes from the same shipped calculator the TABLE used, so
// the floating number and the ladder cell are the same number by construction
// (gear included) instead of by two matching transcriptions.
export function _sraSupportLabelText(usp, rank) {
    switch (usp.behavior) {
        case 'heal':
            return { text: `+${_uspCalcHeal(usp, rank)}`, color: '#7fe0b0' };
        case 'hot':
            return { text: `+${_uspCalcHotTick(usp, rank)}/s`, color: '#a5d6a7' };
        case 'shield': {
            const maxAbs = _uspMaxAbsorption();
            const v = _uspCalcAbsorb(usp, rank);
            return { text: maxAbs > 0 ? `+${v}` : t('sra_no_absorb_gear'), color: '#7fd9ff' };
        }
        case 'guard':
            return { text: `-${_uspCalcDrPct(usp, rank)}%`, color: '#ffd27f' };
        case 'evade':
            return { text: `+${_uspCalcDodgePct(usp, rank)}%`, color: '#69f0ae' };
        case 'ward':
            return { text: `×${_uspCalcWardCharges(usp, rank)}`, color: '#7fd9ff' };
        case 'thorns':
            return { text: `${_uspCalcThornsPct(usp, rank)}%`, color: '#ff8a65' };
        default:
            return { text: '', color: '#ffffff' };
    }
}

// Small transient note inside the pane when a visual cannot be sourced.
export function _sraStageFlash(text) {
    const stage = _sraEl('sra-stage');
    if (!stage) return;
    const el = document.createElement('div');
    el.className = 'sra-flash sra-fx';
    el.textContent = text;
    stage.appendChild(el);
    _sraAfter(1800, () => { try { el.remove(); } catch (e) {} });
}


//------------------------------------------------------------------------
//---------------------------INTERACTION---------------------------------
//------------------------------------------------------------------------

export function _sraPickerOptionsHTML() {
    const roster = _sraRoster();
    const groups = [];
    for (const entry of roster) {
        let g = groups.find((x) => x.label === entry.group);
        if (!g) { g = { label: entry.group, items: [] }; groups.push(g); }
        g.items.push(entry);
    }
    return groups.map((g) => `<optgroup label="${g.label}">`
        + g.items.map((e) => `<option value="${e.id}"${e.id === _sraSelected ? ' selected' : ''}>${e.icon} ${e.name}</option>`).join('')
        + `</optgroup>`).join('');
}

export function _sraSyncPicker() {
    const picker = _sraEl('sra-picker');
    if (picker) picker.innerHTML = _sraPickerOptionsHTML();
}

export function _sraOnPick(spellId) {
    if (!spellId) return;
    _sraSelected = spellId;
    // Default the sandbox to the rank the player would actually cast, so the
    // screen opens on the live configuration rather than on rank 1.
    const live = (typeof getSkillCastRankFull === 'function') ? getSkillCastRankFull(spellId) : 1;
    _sraRank = _sraRankClampFor(spellId, live || 1);
    _sraClearStage();
    _sraRender();
}

export function _sraStep(delta) {
    const roster = _sraRoster();
    if (!roster.length) return;
    let i = roster.findIndex((e) => e.id === _sraSelected);
    if (i === -1) i = 0;
    i = (i + delta + roster.length) % roster.length;
    _sraSelected = roster[i].id;
    _sraSyncPicker();
    _sraOnPick(_sraSelected);
}

// Clicking a rank column header focuses that rank (and moves the sandbox).
export function _sraSetRank(rank) {
    if (!_sraSelected) return;
    _sraRank = _sraRankClampFor(_sraSelected, rank);
    _sraRender();
}


//------------------------------------------------------------------------
//---------------------------STYLES--------------------------------------
//------------------------------------------------------------------------

export function _sraEnsureStyles() {
    if (document.getElementById('sra-style')) return;
    const style = document.createElement('style');
    style.id = 'sra-style';
    style.textContent = `
        /* The screen is the fixed, non-scrolling frame (see css/screens.css);
           the layout inside it owns the vertical scroll. */
        #screen-spell-rank-audit { background: #07060c; overflow: hidden; }
        .sra-layout {
            flex: 1 1 auto; min-height: 0; width: 100%; box-sizing: border-box;
            padding: 10px 14px 40px; display: flex; flex-direction: column; gap: 10px;
            overflow-y: auto; overflow-x: hidden;
            font-family: var(--F, monospace); color: #d8d4e6;
        }
        /* One row, always: the title yields space (ellipsis) before the picker
           and the buttons wrap, which is what happened at 11px+ letter-spacing. */
        .sra-bar { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; }
        .sra-title {
            font-family: var(--PX, monospace); font-size: 11px; letter-spacing: 1px;
            color: #8fd3ff; margin-right: auto;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
        }
        .sra-btn {
            font-family: var(--PX, monospace); font-size: 10px; letter-spacing: 1px;
            padding: 7px 12px; cursor: pointer; color: #d8d4e6;
            background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.3)), #1a1a2e;
            border: 1px solid #3a4157; border-radius: 4px; transition: all .12s;
        }
        .sra-btn:hover { border-color: #8fd3ff; color: #8fd3ff; }
        .sra-btn-play { border-color: #4caf50; color: #b9f6ca; }
        .sra-btn-play:hover { border-color: #b9f6ca; color: #b9f6ca; box-shadow: 0 0 12px -2px #4caf50; }
        .sra-select {
            font-family: var(--F, monospace); font-size: 12px; padding: 6px 8px;
            background: #12121e; color: #d8d4e6; border: 1px solid #3a4157; border-radius: 4px;
            flex: 0 1 260px; min-width: 130px;
        }
        .sra-bar > .sra-btn { flex: 0 0 auto; }
        .sra-head { display: flex; align-items: center; gap: 12px; padding: 8px 10px; background: #12121e; border: 1px solid #2a2f3f; border-radius: 6px; }
        .sra-head-img { width: 46px; height: 46px; object-fit: cover; border-radius: 6px; border: 1px solid #3a4157; }
        .sra-head-icon { font-size: 34px; line-height: 1; }
        .sra-head-name { font-family: var(--PX, monospace); font-size: 13px; color: #ffd98b; }
        .sra-head-id { font-size: 11px; color: #7f8aa3; margin-top: 2px; }
        .sra-head-meta { font-size: 11px; color: #9aa7c2; margin-top: 3px; }
        .sra-split { display: flex; gap: 10px; align-items: stretch; flex-wrap: wrap; }
        .sra-panel { flex: 1 1 380px; min-width: 320px; background: #0e0e18; border: 1px solid #2a2f3f; border-radius: 6px; padding: 8px 10px 10px; }
        .sra-panel-title { font-family: var(--PX, monospace); font-size: 10px; letter-spacing: 1px; color: #8fd3ff; margin-bottom: 8px; }
        .sra-stage { position: relative; height: 190px; border: 1px dashed #2f3547; border-radius: 6px; background: radial-gradient(circle at 20% 50%, rgba(80,120,220,.14), transparent 60%), #08080f; }
        .sra-actor { position: absolute; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; }
        .sra-caster { left: 18%; }
        .sra-target { left: 78%; }
        .sra-actor-dot { width: 42px; height: 42px; border-radius: 50%; border: 2px solid #4a5470; background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.14), transparent 60%), #1a1f2e; }
        .sra-target .sra-actor-dot { border-color: #a05252; background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.14), transparent 60%), #2a1518; }
        .sra-actor-label { font-family: var(--PX, monospace); font-size: 8px; color: #6f7a93; }
        .sra-stage-ctl { display: flex; align-items: center; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
        .sra-rank-pill { font-family: var(--PX, monospace); font-size: 10px; color: #ffd98b; border: 1px solid #5a4a20; border-radius: 999px; padding: 4px 10px; background: rgba(255,215,120,.07); }
        .sra-fx-note { font-size: 11px; color: #7f8aa3; }
        .sra-flash { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); font-family: var(--PX, monospace); font-size: 10px; color: #ffb4b4; background: rgba(0,0,0,.7); padding: 6px 10px; border-radius: 4px; }
        .sra-curve-note { font-size: 11px; color: #9aa7c2; margin-bottom: 8px; line-height: 1.5; }
        /* The curve panel is stretched to the height of the stage panel beside
           it, so the chart grows into that space instead of leaving a gap. */
        .sra-panel-curve { display: flex; flex-direction: column; }
        .sra-curve { flex: 1 1 auto; display: flex; flex-direction: column; }
        .sra-bars { display: flex; align-items: flex-end; gap: 5px; flex: 1 1 auto; min-height: 110px; }
        .sra-bar-col { flex: 1 1 0; display: flex; flex-direction: column; align-items: center; gap: 3px; height: 100%; }
        .sra-bar-stack { flex: 1 1 auto; width: 100%; display: flex; align-items: flex-end; gap: 2px; }
        .sra-bar { flex: 1 1 0; border-radius: 2px 2px 0 0; min-height: 2px; }
        .sra-bar-dmg { background: linear-gradient(180deg, #7fd9ff, #2a5a8a); }
        .sra-bar-mana { background: linear-gradient(180deg, #ffd98b, #7a5c1c); }
        .sra-bar-num { font-size: 10px; color: #ffd98b; }
        .sra-bar-rank { font-family: var(--PX, monospace); font-size: 8px; color: #6f7a93; }
        .sra-legend { margin-top: 6px; font-size: 10px; color: #7f8aa3; display: flex; gap: 12px; flex-wrap: wrap; }
        .sra-legend-dmg::before { content: '▪ '; color: #7fd9ff; }
        .sra-legend-mana::before { content: '▪ '; color: #ffd98b; }
        .sra-legend-note { color: #5f6a80; }
        .sra-table-wrap { overflow-x: auto; border: 1px solid #2a2f3f; border-radius: 6px; background: #0e0e18; scrollbar-width: thin; scrollbar-color: #46506b #12121e; }
        .sra-table-wrap::-webkit-scrollbar { height: 10px; }
        .sra-table-wrap::-webkit-scrollbar-track { background: #12121e; }
        .sra-table-wrap::-webkit-scrollbar-thumb { background: #46506b; border-radius: 5px; }
        .sra-table-wrap::-webkit-scrollbar-thumb:hover { background: #5d6a8c; }
        .sra-table { border-collapse: collapse; width: 100%; font-size: 11px; }
        .sra-table th, .sra-table td { padding: 4px 4px; text-align: center; white-space: nowrap; border-bottom: 1px solid #1b1f2b; }
        .sra-table thead th { font-family: var(--PX, monospace); font-size: 9px; color: #8fd3ff; background: #12121e; position: sticky; top: 0; z-index: 2; cursor: pointer; }
        .sra-table thead th.is-active { color: #ffd98b; background: #1c1a12; }
        .sra-row-label { text-align: left; font-weight: normal; color: #b9c2d6; position: sticky; left: 0; background: #0e0e18; z-index: 1; }
        .sra-table thead .sra-row-label { z-index: 3; }
        .sra-row-hint { display: block; font-size: 8.5px; color: #6f7a93; }
        .sra-table td { color: #d8d4e6; }
        .sra-table td.is-active { background: rgba(255,215,120,.08); color: #ffe6b0; }
        .sra-table td.is-best { color: #8ef0b0; font-weight: bold; }
        .sra-table td.is-frozen { color: #8a8fa3; font-style: italic; }
        .sra-table tr.sra-group th {
            text-align: left; font-family: var(--PX, monospace); font-size: 9px; letter-spacing: 1px;
            color: #8fd3ff; background: #161a26; padding: 5px 7px;
        }
        .sra-foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 11px; }
        .sra-ok { color: #7fe0b0; font-family: var(--PX, monospace); font-size: 10px; }
        .sra-bad { color: #ff8a8a; font-family: var(--PX, monospace); font-size: 10px; }
        .sra-note { color: #7f8aa3; }
    `;
    document.head.appendChild(style);
}


//------------------------------------------------------------------------
//---------------------------BOOTSTRAP-----------------------------------
//------------------------------------------------------------------------

export function _sraCreateScreen() {
    _sraEnsureStyles();
    const screen = document.createElement('div');
    screen.id = 'screen-spell-rank-audit';
    screen.className = 'screen';
    screen.innerHTML = _sraBuildLayoutHTML();
    document.body.appendChild(screen);
    // Rank headers focus that rank.
    screen.querySelector('#sra-table');
    screen.addEventListener('click', (e) => {
        const th = e.target && e.target.closest ? e.target.closest('thead th') : null;
        if (!th || th.classList.contains('sra-row-label')) return;
        const cells = Array.from(th.parentElement.children);
        const idx = cells.indexOf(th);
        if (idx > 0) _sraSetRank(idx);
    });
}

export function ensureSpellRankAuditScreen() {
    if (!document.getElementById('screen-spell-rank-audit')) _sraCreateScreen();
    return document.getElementById('screen-spell-rank-audit');
}

// Entry point. `spellId` optional (falls back to the first roster entry, or
// the last one you looked at); `rank` optional.
export function showSpellRankAudit(spellId, rank) {
    ensureSpellRankAuditScreen();
    const roster = _sraRoster();
    if (!roster.length) return;
    if (spellId) {
        if (typeof getSkillDef === 'function' && getSkillDef(spellId)) _sraSelected = spellId;
        else if (window.console) console.warn(`[spell-rank-audit] no registered skill '${spellId}' - keeping ${_sraSelected}`);
    }
    if (!_sraSelected) _sraSelected = roster[0].id;
    if (rank != null) _sraRank = _sraRankClampFor(_sraSelected, rank);
    else {
        const live = (typeof getSkillCastRankFull === 'function') ? getSkillCastRankFull(_sraSelected) : 1;
        _sraRank = _sraRankClampFor(_sraSelected, live || 1);
    }
    _sraSyncPicker();
    _sraClearStage();
    _sraRender();
    if (typeof switchScreen === 'function') switchScreen('screen-spell-rank-audit');
}


//------------------------------------------------------------------------
//---------------------------DEV WIRING----------------------------------
//------------------------------------------------------------------------

// Phase 3 step 5: as a module this file evaluates before dev-testing.js
// (which owns DevTest), so the typeof guard would be false at eval time and
// the .ranks augmentation would silently vanish. Defer to DOMContentLoaded.
export function _sraWireDevTest() {
    if (typeof globalThis.DevTest !== 'undefined' && globalThis.DevTest) {
    // DevTest.ranks()                       → the audit screen
    // DevTest.ranks('usp_blizzard')         → one spell
    // DevTest.ranks('usp_blizzard', 10)     → …at a given rank
    globalThis.DevTest.ranks = function (spellId, rank) {
        showSpellRankAudit(spellId || null, rank);
        return { spell: _sraSelected, rank: _sraRank, roster: _sraRoster().length };
    };
    }
}
// Deferred to DOMContentLoaded (module-eval timing: deferred module scripts
// execute at readyState 'interactive', so 'loading' alone would run this
// inside the import phase - the skill-hotbar P bug was this exact miss).
if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', _sraWireDevTest);
} else {
    _sraWireDevTest();
}

// ?spellaudit=usp_blizzard&rank=10  (spell / rank both optional).
//
// A DEDICATED param rather than ?devtest=ranks on purpose: dev-testing.js
// routes ?devtest= through its own screen boot chain, so sharing the param
// would race this screen against that boot. Nothing here needs a save, so
// this runs alone after the normal boot and simply claims the screen.
(function _sraUrlBoot() {
    let spell = null;
    let rank = null;
    try {
        const q = new URLSearchParams(window.location.search);
        if (q.get('spellaudit') === null) return;
        spell = q.get('spellaudit');
        rank = parseInt(q.get('rank') || '', 10);
    } catch (e) { return; }
    const open = () => showSpellRankAudit(spell || null, Number.isFinite(rank) ? rank : null);
    if (document.readyState === 'complete') setTimeout(open, 60);
    else window.addEventListener('load', () => setTimeout(open, 60));
})();
