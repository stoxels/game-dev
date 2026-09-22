import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _egIsPolymorphActive } from './combat-ailments.js';
import { _egFireProjectile, _egGetElementCentre, _egGetProjectileDef } from './combat-class-projectiles.js';
import { EG_ELEMENTS, _egCalcPlayerMeleeDamage, _egLastMeleeElements, _egLastMeleeWasCrit } from './combat-calculations.js';
import { EG_MONSTER_PROJ_DURATION_MS, _egAnimatePlayerProjectile, _egApplyPlayerHitFeedback, _egConsumeOnHitGearBonus, _egDamageTargetById, _egFlashImmune, _egPlayerTakeDamage, _egRestartFlashClass, _egShowStatusLabel } from './encounter.js';
import { _egIsPlayerInDarknessCloud } from './combat-hazards.js';
import { _egGetActiveMapModValue } from '../endgame/endgame-map-launch.js';
import { _egTryMonsterMeleeSidestep } from './combat-monster-roam.js';
import { _egCalcAccuracyMissChance, _egComputePlayerStats, _egGetDragTier, _egGetDragTierLabelKey } from '../endgame/endgame-player-stats.js';
import { EG_PLAYER_MELEE_ANIM_DURATION_MS, EG_PLAYER_MELEE_DAMAGE, _egDragChargeElements, _egIsActive } from './combat-state.js';
import { _egFacingFromVector, _egGetEquippedWeaponInfo, _egMeleeImpactThump, _egMeleeTargetInRange, _egShowWeaponSwing, _egWeaponSwingSound } from './combat-weapon-swing.js';

//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Drag-paint charged shot: per-cell damage stacking into one charging
// projectile, the accuracy bonus label, release/multishot
// and the melee impact pipeline.



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


// Current melee damage: rolls the dedicated melee channel (weapon base
// range + melee-scoped mods - see _egCalcPlayerMeleeDamage). `chargePct`
// (0..1, default 1) is the spent manual charge share - linear scaling, so
// a 30%-charged strike rolls 30% of the full hit, including its elemental
// breakdown and life leech. The active map's "% reduced Melee Attack
// Damage" mod is applied inside.
export function _egCurrentMeleeDamage(chargePct = 1) {
    return (typeof _egCalcPlayerMeleeDamage === 'function')
        ? _egCalcPlayerMeleeDamage(chargePct)
        : Math.max(1, Math.round(EG_PLAYER_MELEE_DAMAGE * chargePct));
}

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

// Execution tuning: a melee strike on a monster below this HP share is a
// finisher - multiplied damage. Gives melee the "cleanup kill" niche while
// spells handle wave-clear.
export const EG_MELEE_EXECUTE_HP_PCT = 0.25;
export const EG_MELEE_EXECUTE_MULT = 3;

// Overcharge tuning: the charge bar keeps filling past 100% while held...
// see _egTickPlayer in endgame-encounter-tick.js. A strike released above
// the full-charge cap deals proportionally MORE than full damage, up to
// this multiplier (2 = up to double damage for a patient player).
export const EG_MELEE_OVERCHARGE_MULT = 2;
export const EG_MELEE_OVERCHARGE_RATIO = 2;

// Applies a manual melee strike at the moment of impact (Secret-of-Mana-
// style). The strike deals charge% of full damage - linear: 100% charge =
// 100% damage, 30% charge = 30% damage - and the charge was already spent
// (reset to zero) at key-press time by _egDoWeaponAttack. The damage (and
// its elemental breakdown) is rolled ONCE per swing so cleaved side targets
// take the same hit as the primary target.
export function _egApplyPlayerMeleeImpact(targetId) {
    if (!_egIsActive() || !globalThis._egMonsters.some(m => m.id === targetId)) return;

    // Charge share snapshotted at key-press (null = legacy caller, full hit).
    // May exceed 1 when the player overcharged past 100% (see _egTickPlayer).
    const chargePct = (typeof _egPendingMeleeChargePct === 'number')
        ? Math.min(EG_MELEE_OVERCHARGE_MULT, Math.max(0, globalThis._egPendingMeleeChargePct)) : 1;
    globalThis._egPendingMeleeChargePct = null;

    // Out-of-range whiff: the swing always plays, but the blade can't reach
    // a distant target - no damage, no procs, no mana, no reflect. The spent
    // charge is NOT refunded (follows the miss rule below).
    if (typeof _egMeleeTargetInRange === 'function' && !_egMeleeTargetInRange(targetId)) {
        _egShowStatusLabel(targetId, t('eg_melee_too_far'));
        return;
    }

    // Accuracy: the swing can whiff entirely (no gear procs on a miss).
    // A whiffed swing does NOT refund the spent charge.
    if (_egRollPlayerMiss(targetId)) return;

    // Map mod: ethereal monsters evade melee strikes.
    const meleeTarget = globalThis._egMonsters.find(m => m.id === targetId);
    if (meleeTarget && (meleeTarget.etherealPct || 0) > 0
        && Math.random() * 100 < meleeTarget.etherealPct) {
        _egShowStatusLabel(targetId, t('eg_dodged'));
        return;
    }

    // Melee-immune monsters (tutorial ghost lesson) shrug blades off with
    // the standard IMMUNE flash. Spells and projectiles bypass this gate -
    // only the melee channel is refused. The spent charge is NOT refunded.
    if (meleeTarget && meleeTarget.meleeImmune) {
        _egFlashImmune(targetId);
        return;
    }

    // Gear: channel stacks + mana-to-damage are consumed by this hit. The
    // melee roll above is already charge-scaled (including its elemental
    // breakdown and life leech); the consumed gear bonus scales the same
    // way so dumping stacks with 0%-charge taps can't cheat full damage.
    // Execution: a strike on a low-HP monster is a finisher (multiplied).
    let execMult = 1;
    if (meleeTarget && (meleeTarget.maxHP || 0) > 0
        && meleeTarget.currentHP > 0
        && meleeTarget.currentHP <= meleeTarget.maxHP * EG_MELEE_EXECUTE_HP_PCT) {
        execMult = EG_MELEE_EXECUTE_MULT;
        _egShowStatusLabel(targetId, t('eg_execute'));
    }
    const dmg = Math.max(1, Math.round((
        _egCurrentMeleeDamage(chargePct) + _egConsumeOnHitGearBonus() * chargePct) * execMult));
    const elements = _egLastMeleeElements;
    const wasCrit = (typeof _egLastMeleeWasCrit !== 'undefined') ? _egLastMeleeWasCrit : false;

    // Uses the existing damage application logic[cite: 1] - tagged isMelee
    // so Spellproof monsters (spellproofPct) take full melee damage while
    // all non-melee sources (spells, reveal projectiles, DoTs) are resisted.
    _egDamageTargetById(targetId, dmg, elements, { isCrit: wasCrit, isMelee: true });

    // Impact feel: squash the struck card so the connect lands with weight
    // (miss/dodge/immune returned above, so this only plays on real hits).
    if (typeof _egMeleeImpactThump === 'function') {
        try { _egMeleeImpactThump(targetId); } catch (e) {}
    }

    // Active map run: monsters reflect #% of melee damage back at you.
    if (typeof _egGetActiveMapModValue === 'function') {
        const reflectPct = _egGetActiveMapModValue('map_reflect_melee');
        const reflectTarget = globalThis._egMonsters.find(m => m.id === targetId);
        if (reflectPct > 0 && reflectTarget) {
            const reflected = Math.max(1, Math.round(dmg * reflectPct / 100));
            globalThis.showToast(`🪞 ${t('eg_mm_toast_reflect') || 'Reflected!'} (-${reflected})`);
            _egPlayerTakeDamage(reflected, false, null);
        }
    }

    _egTryCleaveHit(targetId, dmg, elements);

    // Melee sidestep: the struck monster sometimes darts to a different
    // zone panel, forcing the player to walk back into range instead of
    // standing still and spamming E. Chance + cooldown live in
    // endgame-monster-roam.js; dead targets never move. Runs AFTER cleave
    // so the current swing still splashes the old neighbours.
    if (typeof _egTryMonsterMeleeSidestep === 'function') {
        try { _egTryMonsterMeleeSidestep(targetId); } catch (e) {}
    }
}

// Cleave gear modifier (main weapon suffix): rolls against cleavePct and,
// on success, hits every OTHER monster sharing the target's spawn location
// for the same melee damage, with a dedicated flash animation and sound.
export function _egTryCleaveHit(targetId, dmg = _egCurrentMeleeDamage(), elements = _egLastMeleeElements) {
    const stats = _egComputePlayerStats();
    const cleavePct = stats.cleavePct || 0;
    if (cleavePct <= 0 || Math.random() * 100 >= cleavePct) return;

    const target = globalThis._egMonsters.find(m => m.id === targetId);
    if (!target) return;

    // "Same spawn location" = monsters rendered into the same zone panel
    const sideTargets = globalThis._egMonsters.filter(m => m.id !== targetId && m.zoneId === target.zoneId);
    if (!sideTargets.length) return;

    if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('cleave');

    sideTargets.forEach(m => {
        const card = document.getElementById(`eg-card-${m.id}`);
        if (card) _egRestartFlashClass(card, 'eg-flash-cleave');
        const wasCrit = (typeof _egLastMeleeWasCrit !== 'undefined') ? _egLastMeleeWasCrit : false;
        _egDamageTargetById(m.id, dmg, elements, { isCrit: wasCrit });
    });
}

// Physically lunges the class HUD toward the targeted monster and snaps back.

// LEGACY (no longer called by combat): lunged the player sprite at the
// targeted monster for automatic strikes. Kept so saved macros / console
// callers don't crash. Manual strikes (E) use the weapon-swing overlay +
// short hop in endgame-weapon-swing.js instead, so the sprite never
// charges across the arena on its own.
export function _egAnimatePlayerMelee(targetId) {
    const targetCard = document.getElementById(`eg-card-${targetId}`);
    const avatarWrapper = document.getElementById('player-avatar-wrapper');
    const sprite = document.getElementById('avatar-sprite-img');

    if (!avatarWrapper || !targetCard) {
        _egDamageTargetById(targetId, _egCurrentMeleeDamage(), _egLastMeleeElements);
        return;
    }

    const start = _egGetElementCentre(avatarWrapper);
    const end = _egGetElementCentre(targetCard);

    // If the monster is to the left (end.x < start.x), flip the sprite
    const shouldFlip = end.x < start.x;
    sprite.style.transform = shouldFlip ? 'scaleX(-1)' : 'scaleX(1)';

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Shared weapon-swing overlay, aimed at the target card so manual strikes
    // show the equipped weapon family (E uses movement facing instead).
    try {
        if (typeof _egShowWeaponSwing === 'function') {
            const fam = (typeof _egGetEquippedWeaponInfo === 'function')
                ? _egGetEquippedWeaponInfo().family : 'sword';
            const face = (typeof _egFacingFromVector === 'function')
                ? _egFacingFromVector(dx, dy) : 'down';
            _egShowWeaponSwing(fam, face);
            if (typeof _egWeaponSwingSound === 'function') _egWeaponSwingSound(fam);
        }
    } catch (e) {}

    // Bring to front during the lunge
    const originalZIndex = avatarWrapper.style.zIndex;
    avatarWrapper.style.zIndex = '9999';

    const anim = avatarWrapper.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(1.15)` },
        { transform: 'translate(0px, 0px) scale(1)' }
    ], { duration: EG_PLAYER_MELEE_ANIM_DURATION_MS, easing: 'ease-in-out' });

    anim.onfinish = () => {
        avatarWrapper.style.zIndex = originalZIndex;
        //sprite.style.transform = 'scaleX(1)';
    };

    setTimeout(() => _egApplyPlayerMeleeImpact(targetId), EG_PLAYER_MELEE_ANIM_DURATION_MS / 2);
}


/*

function _egAnimatePlayerMelee(targetId) {
    const targetCard = document.getElementById(`eg-card-${targetId}`);
    const sourceHud = document.getElementById('class-hud-panel');

    if (!sourceHud || !targetCard) {
        // If UI elements are missing, deal damage instantly
        _egDamageTargetById(targetId, EG_PLAYER_MELEE_DAMAGE);
        return;
    }

    const start = _egGetElementCentre(sourceHud);
    const end = _egGetElementCentre(targetCard);
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Ensure the HUD renders on top during flight
    sourceHud.style.zIndex = '9999';

    const anim = sourceHud.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(1.15)` }, // Apex/Impact
        { transform: 'translate(0px, 0px) scale(1)' }
    ], { duration: EG_PLAYER_MELEE_ANIM_DURATION_MS, easing: 'ease-in-out' });

    anim.onfinish = () => {
        sourceHud.style.zIndex = '';
    };

    // Damage fires at the animation midpoint to match visual impact[cite: 1]
    setTimeout(() => _egApplyPlayerMeleeImpact(targetId), EG_PLAYER_MELEE_ANIM_DURATION_MS / 2);
}

*/


//------------------------------------------------------------------------
//-------------------TARGETING--------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the currently targeted monster object, or null if none.
export function _egGetTarget() {
    if (!globalThis._egTargetId) return null;
    return globalThis._egMonsters.find(m => m.id === globalThis._egTargetId) || null;
}
