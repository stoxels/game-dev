import { t } from '../translation/translations.js';
import { _egIsPolymorphActive } from './combat-ailments-core.js';
import { _egFireProjectile, _egGetElementCentre, _egGetProjectileDef } from './combat-class-projectiles.js';
import { EG_ELEMENTS } from './combat-calculations-resistances.js';
import { EG_MONSTER_PROJ_DURATION_MS, _egAnimatePlayerProjectile, _egPlayerTakeDamage } from './encounter.js';
import { _egApplyPlayerHitFeedback } from './encounter-monster-attack-feedback.js';
import { _egShowStatusLabel } from './encounter-monster-damage.js';
import { _egIsPlayerInDarknessCloud } from './combat-hazards-storms.js';
import { _egCalcAccuracyMissChance, _egComputePlayerStats, _egGetDragTier, _egGetDragTierLabelKey } from '../endgame/endgame-player-stats.js';
import { _egDragChargeElements, _egIsActive } from './combat-state.js';

//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Drag-paint charged shot: per-cell damage stacking into one charging
// projectile, the accuracy bonus label, release/multishot, and shared
// accuracy helper. Manual melee impact lives in encounter-melee-impact.js.



//------------------------------------------------------------------------
//-------------------DRAG-PAINT CHARGED SHOT------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Visual growth of the charging projectile per stacked cell.
export const EG_DRAG_CHARGE_BASE_SIZE_PX = 28;

export const EG_DRAG_CHARGE_SIZE_PER_STACK_PX = 7;
export const EG_DRAG_CHARGE_MAX_VISUAL_STACKS = 12;

export const EG_DRAG_CHARGE_SCALE_PER_STACK = 0.18;


// Creates or refreshes the charging projectile div anchored over the stroke's
// first painted cell. Grows with every stacked cell and pulses while charging.
export function _egUpdateChargedProjectileVisual() {
    if (!_egIsActive() || globalThis._egDragChargeStacks <= 0) return;

    let proj = document.getElementById('eg-charging-projectile');
    if (!proj) {
        proj = document.createElement('div');
        proj.id = 'eg-charging-projectile';
        document.body.appendChild(proj);
    }

    const projDef = _egGetProjectileDef();
    proj.className = `eg-projectile eg-proj-charging ${projDef.cssClass}`;
    if (typeof projDef.build === 'function') {
        proj.classList.add('eg-built');
        projDef.build(proj);
    } else {
        proj.textContent = projDef.emoji;
    }

    const stacksForVisual = Math.min(globalThis._egDragChargeStacks, EG_DRAG_CHARGE_MAX_VISUAL_STACKS);
    const sizePx = EG_DRAG_CHARGE_BASE_SIZE_PX + stacksForVisual * EG_DRAG_CHARGE_SIZE_PER_STACK_PX;
    // Emoji visuals grow via font-size; code-built shapes via a scale var
    // (the .egp box has fixed pixel dimensions).
    proj.style.fontSize = `${sizePx}px`;
    proj.style.setProperty('--egp-charge-scale', (sizePx / EG_DRAG_CHARGE_BASE_SIZE_PX).toFixed(3));

    // Anchor on the stroke's start cell; fall back to the HUD handle
    const anchor = ((globalThis._egDragChargeRow >= 0 && globalThis._egDragChargeCol >= 0)
        && document.getElementById(`g-${globalThis._egDragChargeRow}-${globalThis._egDragChargeCol}`))
        || document.getElementById('class-hud-drag-handle');
    if (anchor) {
        const c = _egGetElementCentre(anchor);
        proj.style.left = `${c.x}px`;
        proj.style.top = `${c.y}px`;
    }

    _egAimChargingProjectile(anchor);
    _egUpdateDragBonusLabel();
}

// ── Drag-painting accuracy bonus label (1-word text on the player sprite) ─
// Shows STEADY / FOCUSED / PRECISE on the avatar while charging, tiered at
// >5 / >10 / >15 correct. Single word, color-coded per tier, with a pop
// animation when the tier increases.
export function _egUpdateDragBonusLabel() {
    const avatar = document.getElementById('player-avatar-wrapper');
    if (!avatar) { _egClearDragBonusLabel(); return; }

    const tier = (typeof _egGetDragTier === 'function') ? _egGetDragTier(globalThis._egDragChargeStacks) : 0;
    if (tier <= 0) { _egClearDragBonusLabel(); return; }

    const key = (typeof _egGetDragTierLabelKey === 'function') ? _egGetDragTierLabelKey(globalThis._egDragChargeStacks) : null;
    const text = key && typeof t === 'function' ? t(key) : (tier === 3 ? 'PRECISE' : tier === 2 ? 'FOCUSED' : 'STEADY');

    let lbl = document.getElementById('eg-drag-bonus-label');
    const isNew = !lbl;
    if (!lbl) {
        lbl = document.createElement('div');
        lbl.id = 'eg-drag-bonus-label';
        avatar.appendChild(lbl);
    }
    const tierClass = `eg-drag-bonus-t${tier}`;
    if (lbl.dataset.tier !== String(tier) || isNew) {
        lbl.className = `eg-drag-bonus ${tierClass}`;
        // trigger pop animation on tier change
        lbl.style.animation = 'none';
        void lbl.offsetWidth;
        lbl.style.animation = '';
        lbl.dataset.tier = String(tier);
    } else {
        lbl.className = `eg-drag-bonus ${tierClass}`;
    }
    lbl.textContent = text;
    lbl.style.display = '';
}

export function _egClearDragBonusLabel() {
    const lbl = document.getElementById('eg-drag-bonus-label');
    if (lbl) lbl.remove();
    const linger = document.getElementById('eg-drag-bonus-linger');
    if (linger) linger.remove();
}

// Rotates the charging projectile so its tip points at the currently targeted
// monster card (same atan2 flight vector the released shot will follow).
// No-op when there is no live charge visual or no anchor.
export function _egAimChargingProjectile(anchor) {
    const proj = document.getElementById('eg-charging-projectile');
    if (!proj || !anchor) return;

    let rot = '';
    const targetCard = globalThis._egTargetId ? document.getElementById(`eg-card-${globalThis._egTargetId}`) : null;
    if (targetCard) {
        const c = _egGetElementCentre(anchor);
        const t = _egGetElementCentre(targetCard);
        const angle = Math.atan2(t.y - c.y, t.x - c.x) * 180 / Math.PI;
        rot = ` rotate(${angle.toFixed(2)}deg)`;
    }
    proj.style.transform =
        `translate(-50%, -50%)${rot} scale(var(--egp-charge-scale, 1))`;
}

// Removes the charging projectile div and resets all stroke charge state.
export function _egClearChargedProjectileVisual() {
    const proj = document.getElementById('eg-charging-projectile');
    if (proj) proj.remove();
    if (typeof _egClearDragBonusLabel === 'function') _egClearDragBonusLabel();
    globalThis._egDragChargeDamage = 0;
    EG_ELEMENTS.forEach(el => { _egDragChargeElements[el] = 0; });
    globalThis._egDragChargeStacks = 0;
    globalThis._egDragChargeRow = -1;
    globalThis._egDragChargeCol = -1;
    globalThis._egDragChargeWasCrit = false;
}

// Called from stopPainting(): releases the accumulated stroke as one combined-
// damage projectile toward the currently targeted monster. The target ID is
// snapshotted at release so mid-flight retargets don't redirect the shot.
// The projectile launches from the stroke's first cell with a launch scale
// that grows with the number of stacked cells.
export function _egReleaseChargedShot() {
    const stacks = globalThis._egDragChargeStacks;
    const damage = globalThis._egDragChargeDamage;
    const row = globalThis._egDragChargeRow;
    const col = globalThis._egDragChargeCol;
    // Snapshot the elemental share before clearing - needed so the target's
    // resistances can be applied per element at impact time.
    const elements = Object.assign({}, _egDragChargeElements);
    const wasCrit = !!globalThis._egDragChargeWasCrit;
    const releaseTier = (typeof _egGetDragTier === 'function') ? _egGetDragTier(stacks) : 0;
    const releaseLabelKey = (typeof _egGetDragTierLabelKey === 'function') ? _egGetDragTierLabelKey(stacks) : null;
    _egClearChargedProjectileVisual();
    // Keep a brief lingering tier label on the avatar through the flight so
    // the player sees that the drag bonus was applied to this shot.
    if (releaseTier > 0) {
        const avatar = document.getElementById('player-avatar-wrapper');
        if (avatar) {
            const linger = document.createElement('div');
            linger.id = 'eg-drag-bonus-linger';
            linger.className = `eg-drag-bonus eg-drag-bonus-t${releaseTier} eg-drag-bonus-linger`;
            linger.textContent = releaseLabelKey && typeof t === 'function' ? t(releaseLabelKey) : (releaseTier === 3 ? 'PRECISE' : releaseTier === 2 ? 'FOCUSED' : 'STEADY');
            avatar.appendChild(linger);
            setTimeout(() => linger.remove(), 900);
        }
    }

    if (!_egIsActive()) return;
    if (stacks <= 0 || !damage) return;

    const sourceEl = (row >= 0 && col >= 0)
        ? document.getElementById(`g-${row}-${col}`)
        : null;
    const targetIdAtFire = globalThis._egTargetId; // snapshot - do not use _egTargetId in the callback
    const startScale = 1.5 + Math.min(stacks, EG_DRAG_CHARGE_MAX_VISUAL_STACKS) * EG_DRAG_CHARGE_SCALE_PER_STACK;

    // POLYMORPH: the charged reveal shot is confused and hits the PLAYER
    // themself instead of the monster. Auto-attacks keep working normally.
    if (typeof _egIsPolymorphActive === 'function' && _egIsPolymorphActive()) {
        const hud = document.getElementById('player-avatar-wrapper');
        const start = sourceEl ? _egGetElementCentre(sourceEl) : null;
        if (hud && typeof _egFireProjectile === 'function' && start) {
            const end = _egGetElementCentre(hud);
            _egFireProjectile('🌀', 'eg-proj-player', start, end, EG_MONSTER_PROJ_DURATION_MS, 'ease-in', () => {
                const dealt = _egPlayerTakeDamage(damage * 0.3, false, null);
                if (dealt > 0) _egApplyPlayerHitFeedback(dealt);
            });
            return;
        }
        // No visual path available - apply the self-hit instantly
        const dealt = _egPlayerTakeDamage(damage * 0.3, false, null);
        if (dealt > 0) _egApplyPlayerHitFeedback(dealt);
        return;
    }

    _egAnimatePlayerProjectile(damage, targetIdAtFire, undefined, undefined, sourceEl, startScale, elements, { isCharged: true, isChargedStacks: stacks, isCrit: wasCrit });
    _egTryMultishot(damage, targetIdAtFire, elements, sourceEl, wasCrit);
}

// Gear: multishot (cloak/gloves) - rolls against multishotPct and, on
// success, looses one extra projectile with the same damage at another
// living monster (falls back to the primary target when it's the only one).
export function _egTryMultishot(damage, primaryTargetId, elements, sourceEl, wasCrit) {
    const stats = _egComputePlayerStats();
    const multishotPct = stats.multishotPct || 0;
    if (multishotPct <= 0 || Math.random() * 100 >= multishotPct) return;

    const others = globalThis._egMonsters.filter(m => m.id !== primaryTargetId);
    const targetId = others.length
        ? others[Math.floor(Math.random() * others.length)].id
        : primaryTargetId;
    if (!targetId) return;

    _egAnimatePlayerProjectile(Math.round(damage), targetId, undefined, undefined, sourceEl, 1.2, elements, { isCrit: !!wasCrit });
}


/*

// Launches a projectile from the player HUD toward the targeted monster card.
// If the target card is not visible (e.g. not yet rendered), damage is applied
// instantly so no hits are silently lost.
function _egAnimatePlayerProjectile(damage, targetId, row, col) {



    const sourceHud = document.getElementById('class-hud-drag-handle');
    const targetCard = targetId ? document.getElementById(`eg-card-${targetId}`) : null;

    if (!sourceHud || !targetCard) {
        // No visual target - apply damage instantly without animation
        if (damage != null) _egDamageTargetById(targetId, damage);
        return;
    }

    const start = _egGetElementCentre(sourceHud);
    const end = _egGetElementCentre(targetCard);
    const projDef = _egGetProjectileDef();

    _egFireProjectile(projDef.emoji, projDef.cssClass, start, end, projDef.duration, projDef.easing, () => {
        _egDamageTargetById(targetId, damage);
    });
}

*/


// player charges the monster


// Accuracy check for player attacks (melee strikes AND projectiles alike).
// Rolls against the target's level using _egCalcAccuracyMissChance; on a
// miss shows a floating MISS label over the monster card and returns true
// so the caller can abort the hit. Gear procs (cleave/splash/chain/…) are
// part of the same attack and are skipped alongside it.
// `opts` may carry isChargedStacks for drag-painting charged shots so the
// threshold-based accuracy bonus can be applied (flat accuracy + direct
// miss reduction - see _egGetDragAccuracyBonus / _egGetDragMissReduction).
export function _egRollPlayerMiss(targetId, opts) {
    const target = globalThis._egMonsters.find(m => m.id === targetId);
    if (!target) return false;

    // Darkness clouds completely blind the player: every attack misses while
    // the sprite hitbox overlaps a cloud, regardless of accuracy or bonuses.
    if (typeof _egIsPlayerInDarknessCloud === 'function' && _egIsPlayerInDarknessCloud()) {
        _egShowStatusLabel(targetId, t('eg_miss'));
        return true;
    }

    const stats = _egComputePlayerStats();
    const stacks = (opts && opts.isChargedStacks) ? opts.isChargedStacks : 0;
    // Also support a plain number being passed as second arg (legacy callers)
    const dragStacks = (typeof opts === 'number') ? opts : stacks;
    const missPct = _egCalcAccuracyMissChance(stats.accuracy, target.level, dragStacks);
    if (Math.random() * 100 >= missPct) return false;

    _egShowStatusLabel(targetId, t('eg_miss'));
    return true;
}

//-------------------TARGETING--------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the currently targeted monster object, or null if none.
export function _egGetTarget() {
    if (!globalThis._egTargetId) return null;
    return globalThis._egMonsters.find(m => m.id === globalThis._egTargetId) || null;
}
