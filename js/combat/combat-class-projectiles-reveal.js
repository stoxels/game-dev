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
export const EG_REVEAL_PROJECTILE_MAX = 12;        // safety cap per reveal event
export const EG_REVEAL_PROJECTILE_STAGGER_MS = 60; // delay between consecutive shots

// Spell Damage scales how hard reveal projectiles hit, on top of the base %:
//   flat Spell Damage      → +0.5 percentage points per point
//   increased Spell Damage → +1 percentage point per 1%
export const EG_REVEAL_PCT_PER_FLAT_SPELL_DMG = 0.5;
export const EG_REVEAL_PCT_PER_INC_SPELL_DMG = 1;

// Queue for reveals that fired before the encounter was active (start-of-puzzle
// passives run before _egStartEncounter). Flushed once the encounter goes live.
let _egPendingRevealQueue = [];
try { Object.defineProperty(globalThis, '_egPendingRevealQueue', { get() { return _egPendingRevealQueue; }, set(v) { _egPendingRevealQueue = v; }, configurable: true }); } catch (e) {}

// Resolves the current reveal-projectile damage percentage from the player's
// live gear stats (recomputed on demand, so equips apply instantly).
export function _egGetRevealProjectileDamagePct() {
    const stats = _egComputePlayerStats();
    return EG_REVEAL_PROJECTILE_DAMAGE_PCT
        + (stats.spellDamageFlat || 0) * EG_REVEAL_PCT_PER_FLAT_SPELL_DMG
        + (stats.spellDamageIncPct || 0) * EG_REVEAL_PCT_PER_INC_SPELL_DMG;
}

// Entry point for programmatic reveals (items, passives, class abilities).
// Fired from _applyCellEffect(..., 'reveal') so every non-manual reveal path
// is covered. `source` distinguishes 'item' reveals from 'ability' reveals
// (default) so the matching map damage penalty can be applied. Each revealed
// cell launches one reduced-damage projectile at the current target; queues
// while no endgame encounter is running (start-of-puzzle passives) and flushes
// once the encounter goes live.
export function _egOnProgrammaticReveal(cellIds, source) {
    if (!Array.isArray(cellIds) || !cellIds.length) return;
    if (typeof _egIsActive !== 'function' || !_egIsActive()) {
        // Queue start-of-puzzle auto-reveals so they still shoot once monsters spawn.
        if (cur && (cur.isMonsterLevel || cur.isChainedPuzzle)) {
            _egPendingRevealQueue.push({ ids: cellIds.slice(0, EG_REVEAL_PROJECTILE_MAX), source });
        }
        return;
    }

    // If active but no monster is alive yet (spawn stagger / respawn gap),
    // queue and retry so damage is not lost to a null target.
    if (!globalThis._egMonsters || globalThis._egMonsters.length === 0) {
        if (cur && (cur.isMonsterLevel || cur.isChainedPuzzle)) {
            _egPendingRevealQueue.push({ ids: cellIds.slice(0, EG_REVEAL_PROJECTILE_MAX), source });
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

    cellIds.slice(0, EG_REVEAL_PROJECTILE_MAX).forEach((id, i) => {
        const sourceEl = document.getElementById(id);
        if (!sourceEl) return;
        setTimeout(() => {
            if (!_egIsActive()) return;
            const revealPct = (_egGetRevealProjectileDamagePct() / 100) * revealModMult * charmMult;
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
        }, i * EG_REVEAL_PROJECTILE_STAGGER_MS);
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
        _egOnProgrammaticReveal(entry.ids, entry.source);
    });
}
