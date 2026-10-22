import { Audio_Manager } from '../audio/audio.js';
import { LANG } from '../translation/translations.js';
import { _applyMonsterAilment, _applyStatusToMap, _hasStatus } from './combat-ailments-core.js';
import { SPELL_COMBOS, SPELL_DEBUFFS, COMBO_TUNING as T } from './combat-spell-debuff-defs.js';
import { _damageTargetById, _showStatusLabel } from './encounter-monster-damage.js';
import { STAGGER_DURATION_MS } from './encounter-lifecycle.js';
import { _isActive } from './combat-state.js';

//------------------------------------------------------------------------
//-------------------SPELL COMBOS-----------------------------------------
//------------------------------------------------------------------------
// Spells can put debuffs on enemies (Brittle, Conductive, Withered ...) and
// react to the debuffs already there (bonus damage, detonations, element
// reactions). Two hooks run for every player spell hit in _damageTargetById:
//   _spellComboPre   before resistances: works out the bonus damage and uses up
//                    the debuffs that were consumed
//   _spellComboPost  after the hit: applies new debuffs, arcs, reactions
// Tables and text live in combat-spell-debuff-defs.js.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------

const OLD_AILMENT_KEYS = ['ignite', 'chill', 'frozen', 'shocked', 'poison', 'bleed', 'blind'];
// Damage-over-time debuffs a critical hit can copy to a neighbour.
const SPREADABLE_DOTS = ['ignite', 'poison', 'bleed'];
const IGNITE_DMG_SHARE = 0.15;
const MIN_DOT_DAMAGE = 2;

//------------------------------------------------------------------------
//-------------------LOW-LEVEL HELPERS------------------------------------
//------------------------------------------------------------------------

// True while the enemy carries the named status.
function _has(target, key) {
    return !!(target && target.statuses && _hasStatus(target.statuses, key));
}

// Removes a status from an enemy at once.
function _removeStatus(target, key) {
    if (target && target.statuses) delete target.statuses[key];
}

// Floating text on the enemy's card in the player's language.
function _label(target, en, de) {
    _showStatusLabel(target.id, LANG === 'de' ? de : en);
}

// Share (0..1) of a hit that is one damage element; 'physical' is whatever the
// four elements leave over.
function _share(elements, amount, key) {
    if (!(amount > 0)) return 0;
    const el = elements || {};
    if (key === 'physical') {
        const elemental = (el.fire || 0) + (el.cold || 0) + (el.lightning || 0) + (el.shadow || 0);
        return Math.max(0, Math.min(1, (amount - elemental) / amount));
    }
    return Math.max(0, Math.min(1, (el[key] || 0) / amount));
}

// Living enemies other than `target`.
function _others(target) {
    return (globalThis._monsters || []).filter((m) => m && m.id !== target.id && m.currentHP > 0);
}

// True when the enemy shrugs off ailments (map modifier / boss trait).
function _avoidsAilment(target) {
    return (target.avoidAilmentPct || 0) > 0 && Math.random() * 100 < target.avoidAilmentPct;
}

//------------------------------------------------------------------------
//-------------------APPLYING DEBUFFS-------------------------------------
//------------------------------------------------------------------------

// Frostbite reached its limit: the enemy freezes solid (with a lockout so it
// cannot be frozen over and over).
function _frostbitePop(target) {
    _removeStatus(target, 'frostbite');
    const now = Date.now();
    if ((target._frostbiteLockUntil || 0) > now) return;
    target._frostbiteLockUntil = now + T.frostbiteFreezeLockMs;
    _applyStatusToMap(target.statuses, 'frozen', T.frostbiteFreezeS, 0);
    _label(target, 'Frozen solid!', 'Eingefroren!');
    Audio_Manager.playSFX('monster_frozen');
}

// Static reached its limit: the enemy is stunned (with a lockout).
function _staticPop(target) {
    _removeStatus(target, 'static');
    const now = Date.now();
    if ((target._staticLockUntil || 0) > now) return;
    target._staticLockUntil = now + T.staticStunLockMs;
    target.staggeredUntil = now + STAGGER_DURATION_MS;
    _label(target, 'Stunned!', 'Betäubt!');
    Audio_Manager.playSFX('monster_stunned');
}

// Exposed lowers the enemy's physical reduction through the same fields Crush
// uses, so the damage code needs no second rule.
function _syncExposed(target, until) {
    const crushLive = (target.crushedUntil || 0) > Date.now();
    target.crushedUntil = Math.max(target.crushedUntil || 0, until);
    target.crushPhysRedPct = Math.max(crushLive ? (target.crushPhysRedPct || 0) : 0, T.exposedPhysReductionPct);
}

// Puts a new spell debuff on an enemy (stacks, refreshes, or pops a full stack).
function _applySpellDebuff(target, key, ctx) {
    const def = SPELL_DEBUFFS[key];
    if (!def || !target || target.currentHP <= 0 || _avoidsAilment(target)) return;
    if (!target.statuses) target.statuses = {};
    const prev = _has(target, key) ? target.statuses[key] : null;
    const stacks = Math.min(def.stackMax || 1, ((prev && prev.stacks) || 0) + 1);
    const stored = prev && prev.stored ? prev.stored : 0;
    _applyStatusToMap(target.statuses, key, def.durationS, 0);
    const st = target.statuses[key];
    st.stacks = stacks;
    st.stored = stored;
    st.srcSpell = ctx && ctx.spellId;
    if (key === 'exposed') _syncExposed(target, st.until);
    if (def.stackMax && stacks >= def.stackMax) {
        if (key === 'frostbite') _frostbitePop(target);
        else if (key === 'static') _staticPop(target);
    }
}

// Applies one table entry: a new spell debuff or an old ailment.
function _applyEntry(target, key, finalAmount, ctx) {
    if (SPELL_DEBUFFS[key]) { _applySpellDebuff(target, key, ctx); return; }
    if (!OLD_AILMENT_KEYS.includes(key)) return;
    const dps = key === 'ignite' ? Math.max(MIN_DOT_DAMAGE, finalAmount * IGNITE_DMG_SHARE) : undefined;
    _applyMonsterAilment(target, key, dps);
}

//------------------------------------------------------------------------
//-------------------BEFORE THE HIT: BONUS DAMAGE & REACTIONS-------------
//------------------------------------------------------------------------

// Number of different statuses currently on an enemy.
function _statusCount(target) {
    if (!target.statuses) return 0;
    const now = Date.now();
    return Object.keys(target.statuses).filter((k) => target.statuses[k] && target.statuses[k].until > now).length;
}

// Bonuses this spell's own table row grants (consumes + per-status).
function _tableBonuses(target, row, add, removals) {
    (row.consumes || []).forEach((c) => {
        if (!_has(target, c.key)) return;
        add(c.pct);
        if (c.remove) removals.push(c.key);
    });
    if (row.perStatus) add(Math.min(_statusCount(target), T.perStatusMax) * T.perStatusStepPct);
}

// Brittle, Withered, Soaked and Marked: the new debuffs that change incoming damage.
function _debuffBonuses(target, spellId, elements, amount, add, removals, post) {
    const phys = _share(elements, amount, 'physical');
    const fire = _share(elements, amount, 'fire');
    const cold = _share(elements, amount, 'cold');
    const light = _share(elements, amount, 'lightning');
    const shadow = _share(elements, amount, 'shadow');
    if (_has(target, 'brittle') && phys + light >= 0.5) {
        add(T.brittleShatterPct, phys + light);
        removals.push('brittle');
        post.push(() => _label(target, 'Shattered!', 'Zerschmettert!'));
    }
    if (_has(target, 'withered')) add(T.witheredShadowTakenPct, shadow);
    if (_has(target, 'soaked')) {
        add(T.soakedColdLightningPct, cold + light);
        if (fire >= T.reactionMinShare) {
            add(T.soakedSteamPct, fire);
            removals.push('soaked');
            post.push(() => _label(target, 'Steam!', 'Dampf!'));
        }
    }
    const mark = _has(target, 'marked') ? target.statuses.marked : null;
    if (mark && mark.srcSpell !== spellId) {
        add(T.markedBonusPct);
        removals.push('marked');
        post.push(() => _label(target, 'Marked hit!', 'Markierter Treffer!'));
    }
}

// Fire / cold / lightning meeting a status: Melt, Thermal Shock, Superconduct
// and Overload. Overload and Superconduct finish after the hit (post).
function _reactionBonuses(target, elements, amount, add, removals, post, ctx) {
    const min = T.reactionMinShare;
    const fire = _share(elements, amount, 'fire');
    const cold = _share(elements, amount, 'cold');
    const light = _share(elements, amount, 'lightning');
    const frosted = ['chill', 'brittle', 'frostbite'].filter((k) => _has(target, k));
    if (fire >= min && frosted.length) {
        add(T.meltPct, fire);
        frosted.forEach((k) => removals.push(k));
        post.push(() => _label(target, 'Melt!', 'Schmelzen!'));
    }
    if (cold >= min && _has(target, 'ignite')) {
        add(T.thermalShockPct, cold);
        removals.push('ignite');
        post.push(() => _label(target, 'Thermal Shock!', 'Temperaturschock!'));
    }
    if (light >= min && _has(target, 'chill')) {
        add(T.superconductPct, light);
        removals.push('chill');
        post.push(() => { _applyTimedExposed(target); _label(target, 'Superconduct!', 'Supraleitung!'); });
    }
    if (fire >= min && _has(target, 'shocked')) {
        removals.push('shocked');
        ctx.overload = 'fire';
    } else if (light >= min && _has(target, 'ignite') && !removals.includes('ignite')) {
        removals.push('ignite');
        ctx.overload = 'lightning';
    }
}

// Superconduct's Exposed lasts longer than the normal debuff.
function _applyTimedExposed(target) {
    if (!target.statuses) target.statuses = {};
    _applyStatusToMap(target.statuses, 'exposed', T.superconductExposedS, 0);
    target.statuses.exposed.stacks = 1;
    _syncExposed(target, target.statuses.exposed.until);
}

// Runs before the hit's resistances. Returns the new damage plus what the post
// step still has to do. Only player spell hits take part.
export function _spellComboPre(target, amount, elements, opts) {
    const ctx = { amount, post: [], overload: null, spellId: opts && opts.spellId };
    if (!(opts && opts.isPlayerSpell) || !target || !(amount > 0)) return ctx;
    let mult = 1;
    const removals = [];
    const add = (pct, share = 1) => { mult *= 1 + (pct / 100) * share; };
    const row = SPELL_COMBOS[ctx.spellId];
    if (row) _tableBonuses(target, row, add, removals);
    _debuffBonuses(target, ctx.spellId, elements, amount, add, removals, ctx.post);
    _reactionBonuses(target, elements, amount, add, removals, ctx.post, ctx);
    removals.forEach((k) => _removeStatus(target, k));
    ctx.amount = mult === 1 ? amount : Math.max(1, Math.round(amount * mult));
    return ctx;
}

//------------------------------------------------------------------------
//-------------------AFTER THE HIT: APPLY, ARC, SPREAD--------------------
//------------------------------------------------------------------------

// Conductive: the hit arcs a share of its damage to another enemy.
function _conductiveArc(target, finalAmount) {
    if (!_has(target, 'conductive')) return;
    const now = Date.now();
    if ((target._arcAt || 0) + T.conductiveArcGapMs > now) return;
    const others = _others(target);
    if (!others.length) return;
    target._arcAt = now;
    const victim = others[Math.floor(Math.random() * others.length)];
    const dmg = Math.max(1, Math.round(finalAmount * T.conductiveArcPct / 100));
    _label(victim, 'Arc!', 'Überschlag!');
    _damageTargetById(victim.id, dmg, { lightning: dmg }, { isComboArc: true });
}

// Overload: a fire / lightning reaction blasts every other enemy.
function _overloadBlast(target, kind, finalAmount) {
    const now = Date.now();
    if ((target._overloadAt || 0) + T.overloadGapMs > now) return;
    const victims = _others(target);
    if (!victims.length) return;
    target._overloadAt = now;
    const dmg = Math.max(1, Math.round(finalAmount * T.overloadShare));
    _label(target, 'Overload!', 'Überlast!');
    victims.forEach((m) => _damageTargetById(m.id, dmg, { [kind]: dmg }, { isComboArc: true }));
}

// Doomed stores a share of the spell damage the enemy takes.
function _doomedStore(target, finalAmount) {
    if (!_has(target, 'doomed')) return;
    const st = target.statuses.doomed;
    st.stored = (st.stored || 0) + finalAmount * T.doomedStoreShare;
}

// Soaked: cold and lightning hits chill / shock the enemy more easily.
function _soakedAilments(target, elements, finalAmount) {
    if (!_has(target, 'soaked')) return;
    const roll = () => Math.random() * 100 < T.soakedChanceBonusPct;
    if (_share(elements, finalAmount, 'cold') >= T.reactionMinShare && roll()) _applyMonsterAilment(target, 'chill');
    if (_share(elements, finalAmount, 'lightning') >= T.reactionMinShare && roll()) _applyMonsterAilment(target, 'shocked');
}

// A critical hit copies damage-over-time debuffs onto a neighbour at half power.
function _spreadDots(target) {
    const others = _others(target);
    if (!others.length) return;
    const victim = others[Math.floor(Math.random() * others.length)];
    if (!victim.statuses) victim.statuses = {};
    const now = Date.now();
    SPREADABLE_DOTS.forEach((key) => {
        const st = _has(target, key) ? target.statuses[key] : null;
        if (!st) return;
        _applyStatusToMap(victim.statuses, key, Math.max(1, (st.until - now) / 1000), (st.dps || 0) * 0.5);
    });
    if (_has(target, 'withered')) _applySpellDebuff(victim, 'withered', {});
    _label(victim, 'Spread!', 'Verbreitet!');
}

// Runs after the hit has landed (target may be dead by then - no new debuffs).
export function _spellComboPost(target, ctx, finalAmount, elements, opts) {
    if (!(opts && opts.isPlayerSpell) || !target) return;
    ctx.post.forEach((fn) => fn());
    if (target.currentHP <= 0) return;
    _doomedStore(target, finalAmount);
    _conductiveArc(target, finalAmount);
    if (ctx.overload) _overloadBlast(target, ctx.overload, finalAmount);
    _soakedAilments(target, elements, finalAmount);
    const row = SPELL_COMBOS[ctx.spellId];
    if (!row) return;
    (row.applies || []).forEach((a) => {
        if (Math.random() * 100 < a.pct) _applyEntry(target, a.key, finalAmount, ctx);
    });
    if (row.spreadOnCrit && opts.isCrit) _spreadDots(target);
}

//------------------------------------------------------------------------
//-------------------DEATH, EXPIRY AND ENEMY DAMAGE-----------------------
//------------------------------------------------------------------------

// An enemy with Withered dies: Withered jumps to a neighbour; a Doomed enemy's
// stored damage hits a neighbour too.
export function _spellComboOnKill(target) {
    if (!target) return;
    const others = _others(target);
    if (!others.length) return;
    if (_has(target, 'withered')) {
        const victim = others[Math.floor(Math.random() * others.length)];
        _applySpellDebuff(victim, 'withered', {});
        _label(victim, 'Withered!', 'Verdorrt!');
    }
    const doomed = _has(target, 'doomed') ? target.statuses.doomed : null;
    if (doomed && doomed.stored > 0) {
        const victim = others[Math.floor(Math.random() * others.length)];
        const dmg = Math.max(1, Math.round(doomed.stored));
        doomed.stored = 0;
        _damageTargetById(victim.id, dmg, { shadow: dmg }, { isComboArc: true });
    }
}

// Every combat tick: a Doomed enemy whose timer ran out releases the damage it
// stored. Runs BEFORE the normal expiry removes the status.
export function _tickSpellDebuffs() {
    if (!_isActive()) return;
    const now = Date.now();
    (globalThis._monsters || []).slice().forEach((m) => {
        const st = m && m.statuses && m.statuses.doomed;
        if (!st || st.fired || st.until > now) return;
        st.fired = true;
        const dmg = Math.round(st.stored || 0);
        if (m.currentHP > 0 && dmg > 0) {
            _label(m, 'Doom!', 'Verderben!');
            _damageTargetById(m.id, dmg, { shadow: dmg }, { isComboArc: true });
        }
    });
}

// Withered enemies hit the player for less: called with the raw damage and the
// damage options of an incoming enemy attack.
export function _applyWitheredDamageLess(amount, opts) {
    const attacker = opts && opts.attacker;
    if (!attacker || !_has(attacker, 'withered')) return amount;
    return amount * (1 - T.witheredDamageLessPct / 100);
}
