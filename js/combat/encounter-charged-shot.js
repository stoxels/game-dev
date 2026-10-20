import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _isPolymorphActive } from './combat-ailments-core.js';
import { _fireProjectile, _getElementCentre, _getProjectileDef } from './combat-class-projectiles.js';
import { DAMAGE_ELEMENTS, _secondaryDamage } from './combat-calculations-resistances.js';
import { MONSTER_PROJ_DURATION_MS, _animatePlayerProjectile, _playerTakeDamage } from './encounter.js';
import { _applyPlayerHitFeedback } from './encounter-monster-attack-feedback.js';
import { _showStatusLabel } from './encounter-monster-damage.js';
import { _isPlayerInDarknessCloud } from './combat-hazards-storms.js';
import { _calcAccuracyMissChance, _computePlayerStats, _getDragTier, _getDragTierLabelKey } from './combat-player-stats.js';
import { _dragChargeElements, _isActive } from './combat-state.js';

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
export const DRAG_CHARGE_BASE_SIZE_PX = 28;

export const DRAG_CHARGE_SIZE_PER_STACK_PX = 7;
export const DRAG_CHARGE_MAX_VISUAL_STACKS = 12;

export const DRAG_CHARGE_SCALE_PER_STACK = 0.18;


// Creates or refreshes the charging projectile div anchored over the stroke's
// first painted cell. Grows with every stacked cell and pulses while charging.
export function _updateChargedProjectileVisual() {
    if (!_isActive() || globalThis._dragChargeStacks <= 0) return;

    let proj = document.getElementById('sx-charging-projectile');
    if (!proj) {
        proj = document.createElement('div');
        proj.id = 'sx-charging-projectile';
        document.body.appendChild(proj);
    }

    const projDef = _getProjectileDef();
    proj.className = `sx-projectile sx-proj-charging ${projDef.cssClass}`;
    if (typeof projDef.build === 'function') {
        proj.classList.add('sx-built');
        projDef.build(proj);
    } else {
        proj.textContent = projDef.emoji;
    }

    const stacksForVisual = Math.min(globalThis._dragChargeStacks, DRAG_CHARGE_MAX_VISUAL_STACKS);
    const sizePx = DRAG_CHARGE_BASE_SIZE_PX + stacksForVisual * DRAG_CHARGE_SIZE_PER_STACK_PX;
    // Emoji visuals grow via font-size; code-built shapes via a scale var
    // (the .egp box has fixed pixel dimensions).
    proj.style.fontSize = `${sizePx}px`;
    proj.style.setProperty('--sx-projfx-charge-scale', (sizePx / DRAG_CHARGE_BASE_SIZE_PX).toFixed(3));

    // Anchor on the stroke's start cell; fall back to the HUD handle
    const anchor = ((globalThis._dragChargeRow >= 0 && globalThis._dragChargeCol >= 0)
        && document.getElementById(`g-${globalThis._dragChargeRow}-${globalThis._dragChargeCol}`))
        || document.getElementById('class-hud-drag-handle');
    if (anchor) {
        const c = _getElementCentre(anchor);
        proj.style.left = `${c.x}px`;
        proj.style.top = `${c.y}px`;
    }

    _aimChargingProjectile(anchor);
    _updateDragBonusLabel();
}

// ── Drag-painting accuracy bonus label (1-word text on the player sprite) ─
// Shows STEADY / FOCUSED / PRECISE on the avatar while charging, tiered at
// >5 / >10 / >15 correct. Single word, color-coded per tier, with a pop
// animation when the tier increases.
export function _updateDragBonusLabel() {
    const avatar = document.getElementById('player-avatar-wrapper');
    if (!avatar) { _clearDragBonusLabel(); return; }

    // No monsters on screen = nothing to aim at, so the tier word is just noise.
    if (!globalThis._monsters || globalThis._monsters.length === 0) { _clearDragBonusLabel(); return; }

    const tier = (typeof _getDragTier === 'function') ? _getDragTier(globalThis._dragChargeStacks) : 0;
    if (tier <= 0) { _clearDragBonusLabel(); return; }

    const key = (typeof _getDragTierLabelKey === 'function') ? _getDragTierLabelKey(globalThis._dragChargeStacks) : null;
    const text = key && typeof t === 'function' ? t(key) : (tier === 3 ? 'PRECISE' : tier === 2 ? 'FOCUSED' : 'STEADY');

    let lbl = document.getElementById('sx-drag-bonus-label');
    const isNew = !lbl;
    if (!lbl) {
        lbl = document.createElement('div');
        lbl.id = 'sx-drag-bonus-label';
        avatar.appendChild(lbl);
    }
    const tierClass = `sx-drag-bonus-t${tier}`;
    if (lbl.dataset.tier !== String(tier) || isNew) {
        lbl.className = `sx-drag-bonus ${tierClass}`;
        // trigger pop animation on tier change
        lbl.style.animation = 'none';
        void lbl.offsetWidth;
        lbl.style.animation = '';
        lbl.dataset.tier = String(tier);
    } else {
        lbl.className = `sx-drag-bonus ${tierClass}`;
    }
    lbl.textContent = text;
    lbl.style.display = '';
}

export function _clearDragBonusLabel() {
    const lbl = document.getElementById('sx-drag-bonus-label');
    if (lbl) lbl.remove();
    const linger = document.getElementById('sx-drag-bonus-linger');
    if (linger) linger.remove();
}

// Rotates the charging projectile so its tip points at the currently targeted
// monster card (same atan2 flight vector the released shot will follow).
// No-op when there is no live charge visual or no anchor.
export function _aimChargingProjectile(anchor) {
    const proj = document.getElementById('sx-charging-projectile');
    if (!proj || !anchor) return;

    let rot = '';
    const targetCard = globalThis._targetId ? document.getElementById(`sx-card-${globalThis._targetId}`) : null;
    if (targetCard) {
        const c = _getElementCentre(anchor);
        const t = _getElementCentre(targetCard);
        const angle = Math.atan2(t.y - c.y, t.x - c.x) * 180 / Math.PI;
        rot = ` rotate(${angle.toFixed(2)}deg)`;
    }
    proj.style.transform =
        `translate(-50%, -50%)${rot} scale(var(--sx-projfx-charge-scale, 1))`;
}

// Removes the charging projectile div and resets all stroke charge state.
export function _clearChargedProjectileVisual() {
    const proj = document.getElementById('sx-charging-projectile');
    if (proj) proj.remove();
    if (typeof _clearDragBonusLabel === 'function') _clearDragBonusLabel();
    globalThis._dragChargeDamage = 0;
    DAMAGE_ELEMENTS.forEach(el => { _dragChargeElements[el] = 0; });
    globalThis._dragChargeStacks = 0;
    globalThis._dragChargeRow = -1;
    globalThis._dragChargeCol = -1;
    globalThis._dragChargeWasCrit = false;
}

// Called from stopPainting(): releases the accumulated stroke as one combined-
// damage projectile toward the currently targeted monster. The target ID is
// snapshotted at release so mid-flight retargets don't redirect the shot.
// The projectile launches from the stroke's first cell with a launch scale
// that grows with the number of stacked cells.
export function _releaseChargedShot() {
    const stacks = globalThis._dragChargeStacks;
    const damage = globalThis._dragChargeDamage;
    const row = globalThis._dragChargeRow;
    const col = globalThis._dragChargeCol;
    // Snapshot the elemental share before clearing - needed so the target's
    // resistances can be applied per element at impact time.
    const elements = Object.assign({}, _dragChargeElements);
    const wasCrit = !!globalThis._dragChargeWasCrit;
    const releaseTier = (typeof _getDragTier === 'function') ? _getDragTier(stacks) : 0;
    const releaseLabelKey = (typeof _getDragTierLabelKey === 'function') ? _getDragTierLabelKey(stacks) : null;
    _clearChargedProjectileVisual();
    // Keep a brief lingering tier label on the avatar through the flight so
    // the player sees that the drag bonus was applied to this shot.
    if (releaseTier > 0 && globalThis._monsters && globalThis._monsters.length > 0) {
        const avatar = document.getElementById('player-avatar-wrapper');
        if (avatar) {
            const linger = document.createElement('div');
            linger.id = 'sx-drag-bonus-linger';
            linger.className = `sx-drag-bonus sx-drag-bonus-t${releaseTier} sx-drag-bonus-linger`;
            linger.textContent = releaseLabelKey && typeof t === 'function' ? t(releaseLabelKey) : (releaseTier === 3 ? 'PRECISE' : releaseTier === 2 ? 'FOCUSED' : 'STEADY');
            avatar.appendChild(linger);
            setTimeout(() => linger.remove(), 900);
        }
    }

    if (!_isActive()) return;
    if (stacks <= 0 || !damage) return;

    const sourceEl = (row >= 0 && col >= 0)
        ? document.getElementById(`g-${row}-${col}`)
        : null;
    const targetIdAtFire = globalThis._targetId; // snapshot - do not use _targetId in the callback
    const startScale = 1.5 + Math.min(stacks, DRAG_CHARGE_MAX_VISUAL_STACKS) * DRAG_CHARGE_SCALE_PER_STACK;

    // POLYMORPH: the charged reveal shot is confused and hits the PLAYER
    // themself instead of the monster. Auto-attacks keep working normally.
    if (typeof _isPolymorphActive === 'function' && _isPolymorphActive()) {
        const hud = document.getElementById('player-avatar-wrapper');
        const start = sourceEl ? _getElementCentre(sourceEl) : null;
        if (hud && typeof _fireProjectile === 'function' && start) {
            const end = _getElementCentre(hud);
            _fireProjectile('🌀', 'sx-proj-player', start, end, MONSTER_PROJ_DURATION_MS, 'ease-in', () => {
                const dealt = _playerTakeDamage(damage * 0.3, false, null);
                if (dealt > 0) _applyPlayerHitFeedback(dealt);
            });
            return;
        }
        // No visual path available - apply the self-hit instantly
        const dealt = _playerTakeDamage(damage * 0.3, false, null);
        if (dealt > 0) _applyPlayerHitFeedback(dealt);
        return;
    }

    // The charged-shot release sound was removed on request (it was grating
    // on repeated drags); impact sounds still play on hit.
    _animatePlayerProjectile(damage, targetIdAtFire, undefined, undefined, sourceEl, startScale, elements, { isCharged: true, isChargedStacks: stacks, isCrit: wasCrit });
    _tryMultishot(damage, targetIdAtFire, elements, sourceEl, wasCrit);
}

// Gear: multishot (cloak/gloves) - rolls against multishotPct and, on
// success, looses one extra projectile with the same damage at another
// living monster (falls back to the primary target when it's the only one).
export function _tryMultishot(damage, primaryTargetId, elements, sourceEl, wasCrit) {
    const stats = _computePlayerStats();
    const multishotPct = (stats.multishotPct || 0) + (stats.multishotChanceTreePct || 0);
    if (multishotPct <= 0 || Math.random() * 100 >= multishotPct) return;

    const others = globalThis._monsters.filter(m => m.id !== primaryTargetId);
    const targetId = others.length
        ? others[Math.floor(Math.random() * others.length)].id
        : primaryTargetId;
    if (!targetId) return;

    Audio_Manager.playSFX('multishot_fire');
    _animatePlayerProjectile(_secondaryDamage(damage, 'multishot', stats), targetId, undefined, undefined, sourceEl, 1.2, elements, { isCrit: !!wasCrit });
}


/*

// Launches a projectile from the player HUD toward the targeted monster card.
// If the target card is not visible (e.g. not yet rendered), damage is applied
// instantly so no hits are silently lost.
function _animatePlayerProjectile(damage, targetId, row, col) {



    const sourceHud = document.getElementById('class-hud-drag-handle');
    const targetCard = targetId ? document.getElementById(`sx-card-${targetId}`) : null;

    if (!sourceHud || !targetCard) {
        // No visual target - apply damage instantly without animation
        if (damage != null) _damageTargetById(targetId, damage);
        return;
    }

    const start = _getElementCentre(sourceHud);
    const end = _getElementCentre(targetCard);
    const projDef = _getProjectileDef();

    _fireProjectile(projDef.emoji, projDef.cssClass, start, end, projDef.duration, projDef.easing, () => {
        _damageTargetById(targetId, damage);
    });
}

*/


// player charges the monster


// Accuracy check for player attacks (melee strikes AND projectiles alike).
// Rolls against the target's level using _calcAccuracyMissChance; on a
// miss shows a floating MISS label over the monster card and returns true
// so the caller can abort the hit. Gear procs (cleave/splash/chain/…) are
// part of the same attack and are skipped alongside it.
// `opts` may carry isChargedStacks for drag-painting charged shots so the
// threshold-based accuracy bonus can be applied (flat accuracy + direct
// miss reduction - see _getDragAccuracyBonus / _getDragMissReduction).
export function _rollPlayerMiss(targetId, opts) {
    const target = globalThis._monsters.find(m => m.id === targetId);
    if (!target) return false;

    // Darkness clouds completely blind the player: every attack misses while
    // the sprite hitbox overlaps a cloud, regardless of accuracy or bonuses.
    if (typeof _isPlayerInDarknessCloud === 'function' && _isPlayerInDarknessCloud()) {
        _showStatusLabel(targetId, t('eg_miss'));
        Audio_Manager.playSFX('player_miss');
        return true;
    }

    const stats = _computePlayerStats();
    // Resolute Technique: attacks can no longer miss.
    if ((Number(stats.attacksNeverMiss) || 0) > 0) return false;
    const stacks = (opts && opts.isChargedStacks) ? opts.isChargedStacks : 0;
    // Also support a plain number being passed as second arg (legacy callers)
    const dragStacks = (typeof opts === 'number') ? opts : stacks;
    const missPct = _calcAccuracyMissChance(stats.accuracy, target.level, dragStacks);
    if (Math.random() * 100 >= missPct) return false;

    _showStatusLabel(targetId, t('eg_miss'));
    Audio_Manager.playSFX('player_miss');
    return true;
}

//-------------------TARGETING--------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the currently targeted monster object, or null if none.
export function _getTarget() {
    if (!globalThis._targetId) return null;
    return globalThis._monsters.find(m => m.id === globalThis._targetId) || null;
}
