import { getCharmCastingDamageMult } from '../skills/skill-charms.js';
import { _egCalcPlayerDamage, _egLastHitElements } from './combat-calculations.js';
import { _egScaleElements } from './combat-calculations-resistances.js';
import { _egAnimatePlayerProjectile } from './encounter.js';
import { _egMapAbilityRevealMult, _egMapItemRevealMult } from '../endgame/endgame-map-launch.js';
import { _egComputePlayerStats } from '../endgame/endgame-player-stats.js';
import { _egIsActive } from './combat-state.js';
import { cur } from '../state.js';

// Reveal-triggered projectiles: item / passive / class-ability reveals during
// an active endgame encounter fire reduced-damage projectiles from every
// revealed cell toward the currently targeted monster.
export const EG_REVEAL_PROJECTILE_DAMAGE_PCT = 30; // % of a full correct-fill hit
export const EG_REVEAL_PROJECTILE_MAX = 100;       // technical safety limit per reveal event (not a design cap)
export const EG_REVEAL_PROJECTILE_STAGGER_MS = 60; // delay between consecutive shots

// Large reveals are fired faster so the whole volley still lands within the
// time 12 shots always took (12 x 60 ms): the per-shot delay shrinks instead of
// the volley dragging on or losing shots.
const EG_REVEAL_PROJECTILE_SPREAD_BUDGET_MS = EG_REVEAL_PROJECTILE_STAGGER_MS * 12;

// Spell Damage scales how hard reveal projectiles hit, on top of the base %:
//   flat Spell Damage      → +0.5 percentage points per point
//   increased Spell Damage → +1 percentage point per 1%
export const EG_REVEAL_PCT_PER_FLAT_SPELL_DMG = 0.5;
export const EG_REVEAL_PCT_PER_INC_SPELL_DMG = 1;

// Queue for reveals that fired before the encounter was active (start-of-puzzle
// passives run before _egStartEncounter). Flushed once the encounter goes live.
let _egPendingRevealQueue = [];
try { Object.defineProperty(globalThis, '_egPendingRevealQueue', { get() { return _egPendingRevealQueue; }, set(v) { _egPendingRevealQueue = v; }, configurable: true }); } catch (e) {}

// Class-wheel passive nodes that boost reveal projectiles (all additive
// "increased damage" bonuses, applied on top of the base percentage):
//   large_sample      +2% per projectile in the volley (max +40%)
//   weighted_average  +6% per Momentum triggered this level (max 5 stacks)
//   stratified_sampling  +20% for Data Strike reveals
//   best_fit_line     +30% for Diagonal Strike reveals
//   derivative        +25% for Arcane Reveal reveals
//   naive_bayes       +2% per wrong cell currently marked (max +30%)
// plus two per-projectile procs: odds_maker (10% chance to deal double
// damage) and bootstrap (Data Strike: 25% chance to also hit another enemy).
const EG_LARGE_SAMPLE_PCT_PER_SHOT = 2;
const EG_LARGE_SAMPLE_MAX_PCT = 40;
const EG_WEIGHTED_AVERAGE_PCT_PER_MOMENTUM = 6;
const EG_WEIGHTED_AVERAGE_MAX_STACKS = 5;
const EG_NAIVE_BAYES_PCT_PER_MARK = 2;
const EG_NAIVE_BAYES_MAX_PCT = 30;
const EG_ODDS_MAKER_DOUBLE_CHANCE_PCT = 10;
const EG_BOOTSTRAP_EXTRA_HIT_CHANCE_PCT = 25;
// A cast's reveals can land a while after the click (staged animations), so
// a cast stays attributed to its ability for this long.
const EG_REVEAL_CAST_MEMORY_MS = 4000;

function _egHasNode(key) {
    return typeof globalThis.ptHasSkill === 'function' && !!globalThis.ptHasSkill(key);
}

// The base-class ability (e.g. 'statistician_active1') whose cast produced
// this reveal, or null for item reveals / reveals outside any cast.
function _egCastingBaseAbilityId(source) {
    if (source === 'item') return null;
    const cast = globalThis._egLastBaseCast;
    if (cast && (Date.now() - cast.at) < EG_REVEAL_CAST_MEMORY_MS) return cast.id;
    return null;
}

function _egCountMarkedCells() {
    const grid = globalThis.userGrid;
    if (!Array.isArray(grid)) return 0;
    let n = 0;
    for (const row of grid) for (const v of row) if (v === 2) n++;
    return n;
}

// Sum of the node-driven "increased damage" percentages for one volley.
function _egRevealVolleyIncPct(castId, volleySize) {
    let inc = 0;
    if (_egHasNode('large_sample')) {
        inc += Math.min(EG_LARGE_SAMPLE_MAX_PCT, EG_LARGE_SAMPLE_PCT_PER_SHOT * volleySize);
    }
    if (_egHasNode('weighted_average')) {
        const stacks = Math.min(EG_WEIGHTED_AVERAGE_MAX_STACKS,
            Number(globalThis.LEVEL_FLAGS && globalThis.LEVEL_FLAGS.momentumThisLevel) || 0);
        inc += stacks * EG_WEIGHTED_AVERAGE_PCT_PER_MOMENTUM;
    }
    if (castId === 'statistician_active1' && _egHasNode('stratified_sampling')) inc += 20;
    if (castId === 'statistician_active2' && _egHasNode('best_fit_line')) inc += 30;
    if (castId === 'mathmagician_active1' && _egHasNode('derivative')) inc += 25;
    if (_egHasNode('naive_bayes')) {
        inc += Math.min(EG_NAIVE_BAYES_MAX_PCT, EG_NAIVE_BAYES_PCT_PER_MARK * _egCountMarkedCells());
    }
    return inc;
}

// Resolves the current reveal-projectile damage percentage from the player's
// live gear stats (recomputed on demand, so equips apply instantly).
export function _egGetRevealProjectileDamagePct() {
    const stats = _egComputePlayerStats();
    const base = EG_REVEAL_PROJECTILE_DAMAGE_PCT
        + (stats.spellDamageFlat || 0) * EG_REVEAL_PCT_PER_FLAT_SPELL_DMG
        + (stats.spellDamageIncPct || 0) * EG_REVEAL_PCT_PER_INC_SPELL_DMG;
    // reveal_projectile_damage (passive tree): increased reveal-projectile damage.
    return base * (1 + (stats.revealProjectileDamagePct || 0) / 100);
}

// Entry point for programmatic reveals (items, passives, class abilities).
// Fired from _applyCellEffect(..., 'reveal') so every non-manual reveal path
// is covered. `source` distinguishes 'item' reveals from 'ability' reveals
// (default) so the matching map damage penalty can be applied. Each revealed
// cell launches one reduced-damage projectile at the current target; queues
// while no endgame encounter is running (start-of-puzzle passives) and flushes
// once the encounter goes live.
// `opts.strengthMult` scales the whole volley (e.g. 0.5 for the half-strength
// projectiles of Credible Interval / Hot Zone).
export function _egOnProgrammaticReveal(cellIds, source, opts) {
    if (!Array.isArray(cellIds) || !cellIds.length) return;
    if (typeof _egIsActive !== 'function' || !_egIsActive()) {
        // Queue start-of-puzzle auto-reveals so they still shoot once monsters spawn.
        if (cur && (cur.isMonsterLevel || cur.isChainedPuzzle)) {
            _egPendingRevealQueue.push({ ids: cellIds.slice(0, EG_REVEAL_PROJECTILE_MAX), source, opts });
        }
        return;
    }

    // If active but no monster is alive yet (spawn stagger / respawn gap),
    // queue and retry so damage is not lost to a null target.
    if (!globalThis._egMonsters || globalThis._egMonsters.length === 0) {
        if (cur && (cur.isMonsterLevel || cur.isChainedPuzzle)) {
            _egPendingRevealQueue.push({ ids: cellIds.slice(0, EG_REVEAL_PROJECTILE_MAX), source, opts });
            setTimeout(() => _egFlushPendingRevealProjectiles(), 300);
        }
        return;
    }

    // Active map run: "Reveals from Items/Abilities deal #% less Damage".
    const isItemSource = source === 'item';
    let revealModMult = 1;
    if (isItemSource && typeof _egMapItemRevealMult === 'function') {
        revealModMult = _egMapItemRevealMult();
    } else if (!isItemSource && typeof _egMapAbilityRevealMult === 'function') {
        revealModMult = _egMapAbilityRevealMult();
    }

    // Charm orbs applied to the casting skill's charm: +1% damage each
    // (js/skills/skill-charms.js). Snapshotted here, synchronously, because
    // the projectiles below fire on a stagger after the ability disarms.
    const charmMult = (typeof getCharmCastingDamageMult === 'function')
        ? getCharmCastingDamageMult() : 1;

    const volley = cellIds.slice(0, EG_REVEAL_PROJECTILE_MAX);
    // Passive-tree volley bonuses, snapshotted now (the shots fire on a stagger).
    const castId = _egCastingBaseAbilityId(source);
    const strengthMult = Math.max(0, Number(opts && opts.strengthMult) || 1);
    const volleyMult = (1 + _egRevealVolleyIncPct(castId, volley.length) / 100) * strengthMult;
    const bootstrap = castId === 'statistician_active1' && _egHasNode('bootstrap');
    const oddsMaker = _egHasNode('odds_maker');
    const staggerMs = Math.min(EG_REVEAL_PROJECTILE_STAGGER_MS,
        EG_REVEAL_PROJECTILE_SPREAD_BUDGET_MS / Math.max(1, volley.length));
    volley.forEach((id, i) => {
        const sourceEl = document.getElementById(id);
        if (!sourceEl) return;
        setTimeout(() => {
            if (!_egIsActive()) return;
            let revealPct = (_egGetRevealProjectileDamagePct() / 100) * revealModMult * charmMult * volleyMult;
            // Odds Maker: a lucky projectile deals double damage.
            if (oddsMaker && Math.random() * 100 < EG_ODDS_MAKER_DOUBLE_CHANCE_PCT) revealPct *= 2;
            const rolled = _egCalcPlayerDamage();
            const damage = Math.max(1, Math.round(rolled * revealPct));
            // Keep the per-element share so monster resistances still apply
            const elements = _egScaleElements(_egLastHitElements, revealPct);
            // Use current target, fall back to first live monster if none selected yet
            // (happens for start-of-puzzle reveals that flush before auto-target fires).
            let targetIdAtFire = globalThis._egTargetId;
            if (!targetIdAtFire && globalThis._egMonsters && globalThis._egMonsters.length) {
                targetIdAtFire = globalThis._egMonsters[0].id;
            }
            _egAnimatePlayerProjectile(damage, targetIdAtFire, undefined, undefined, sourceEl, undefined, elements);
            // Bootstrap: a Data Strike projectile may also strike one other enemy.
            if (bootstrap && Math.random() * 100 < EG_BOOTSTRAP_EXTRA_HIT_CHANCE_PCT) {
                const others = (globalThis._egMonsters || []).filter(m => m.id !== targetIdAtFire && m.currentHP > 0);
                if (others.length) {
                    const other = others[Math.floor(Math.random() * others.length)];
                    _egAnimatePlayerProjectile(damage, other.id, undefined, undefined, sourceEl, undefined, elements);
                }
            }
        }, Math.round(i * staggerMs));
    });
}

// Flushes any start-of-puzzle reveals that were queued before the encounter
// went live. Called from _egStartEncounter and from the chain transition.
// Retries until at least one monster exists so damage is never lost to a
// null target on the very first puzzle's 500ms spawn stagger.
export function _egFlushPendingRevealProjectiles() {
    if (!_egPendingRevealQueue.length) return;
    if (typeof _egIsActive !== 'function' || !_egIsActive()) return;
    // If no monster has spawned yet, defer flush - projectiles with null target
    // would deal no damage (see _egDamageTargetById guard). Retry shortly.
    if (!globalThis._egMonsters || globalThis._egMonsters.length === 0) {
        setTimeout(() => _egFlushPendingRevealProjectiles(), 250);
        return;
    }
    const queued = _egPendingRevealQueue.splice(0);
    queued.forEach(entry => {
        _egOnProgrammaticReveal(entry.ids, entry.source, entry.opts);
    });
}
