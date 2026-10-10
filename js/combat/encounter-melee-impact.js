import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _egCalcPlayerMeleeDamage, _egLastMeleeElements, _egLastMeleeWasCrit } from './combat-calculations.js';
import { _egGetElementCentre } from './combat-class-projectiles.js';
import { _egPlayerTakeDamage } from './encounter-damage.js';
import { _egDamageTargetById, _egShowStatusLabel } from './encounter-monster-damage.js';
import { _egConsumeOnHitGearBonus } from './encounter-player-attacks.js';
import { _egFlashImmune, _egRestartFlashClass } from './encounter.js';
import { _egGetActiveMapModValue } from '../endgame/endgame-map-launch.js';
import { _egTryMonsterMeleeSidestep } from './combat-monster-roam.js';
import { _egComputePlayerStats } from '../endgame/endgame-player-stats.js';
import { EG_PLAYER_MELEE_ANIM_DURATION_MS, EG_PLAYER_MELEE_DAMAGE, _egIsActive } from './combat-state.js';
import { _egFacingFromVector, _egGetEquippedWeaponInfo, _egMeleeTargetInRange } from './combat-weapon-swing-config.js';
import { _egMeleeImpactThump, _egShowWeaponSwing, _egWeaponSwingSound } from './combat-weapon-swing.js';
import { EG_MELEE_OVERCHARGE_MULT, _egMeleeTierArt, _egMeleeTierForCharge } from './encounter-melee-arts.js';
import { _egRollPlayerMiss } from './encounter-charged-shot.js';

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

// Execution tuning: a melee strike on a monster below this HP share is a
// finisher - multiplied damage. Gives melee the "cleanup kill" niche while
// spells handle wave-clear.
export const EG_MELEE_EXECUTE_HP_PCT = 0.25;
export const EG_MELEE_EXECUTE_MULT = 3;

// Applies a manual melee strike at the moment of impact (Secret-of-Mana-
// style). The strike deals charge% of full damage - linear: 100% charge =
// 100% damage, 30% charge = 30% damage - and the charge was already spent
// (reset to zero) at key-press time by _egDoWeaponAttack. The damage (and
// its elemental breakdown) is rolled ONCE per swing so cleaved side targets
// take the same hit as the primary target.
// Tiered range rule: plain strikes (below 200% - taps and charged hits
// without an art) only connect in melee reach, so positioning matters for
// quick hits. Weapon arts (200%+: dash, leap, novas) carry the sprite to the
// target across the screen, so range never gates an overcharged
// release - the dash IS the delivery.
// opts.sequenced (delivered arts): the avatar was visibly flown onto the
// target first - the tier art plays its sequenced follow-through (sky-leap
// legs with hits on arrival) and a Promise is returned that resolves when
// it lands, so the caller can glide the avatar home afterwards. Without
// the flag everything is synchronous (and the return is undefined).
export function _egApplyPlayerMeleeImpact(targetId, opts) {
    if (!_egIsActive() || !globalThis._egMonsters.some(m => m.id === targetId)) return undefined;

    // Charge share snapshotted at key-press (null = legacy caller, full hit).
    // May exceed 1 when the player overcharged past 100% (see _egTickPlayer).
    // Delivered arts (opts.chargePct) carry their release-time share in the
    // delivery closure instead - the global is left untouched so a second
    // strike released mid-flight can never steal or eat this strike's share.
    let chargePct;
    if (opts && typeof opts.chargePct === 'number') {
        chargePct = Math.min(EG_MELEE_OVERCHARGE_MULT, Math.max(0, opts.chargePct));
    } else {
        chargePct = (typeof _egPendingMeleeChargePct === 'number')
            ? Math.min(EG_MELEE_OVERCHARGE_MULT, Math.max(0, globalThis._egPendingMeleeChargePct)) : 1;
        globalThis._egPendingMeleeChargePct = null;
    }

    // Out-of-range whiff for plain strikes only: the swing always plays,
    // but a sub-200% blade can't reach a distant target - no damage, no
    // procs, no reflect. The spent charge is NOT refunded (follows the
    // miss rule below). At 200%+ the weapon art dashes to the target
    // instead, so this gate never fires.
    if (_egMeleeTierForCharge(chargePct) < 1
        && typeof _egMeleeTargetInRange === 'function' && !_egMeleeTargetInRange(targetId)) {
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
    // rawHit is the charge-scaled swing rolled ONCE - cleaved side targets
    // AND weapon-art tier victims all take this same hit (the exec finisher
    // multiplies only the primary target below).
    const rawHit = Math.max(1, Math.round(
        _egCurrentMeleeDamage(chargePct) + _egConsumeOnHitGearBonus() * chargePct));
    const dmg = Math.max(1, Math.round(rawHit * execMult));
    const elements = _egLastMeleeElements;
    const wasCrit = (typeof _egLastMeleeWasCrit !== 'undefined') ? _egLastMeleeWasCrit : false;

    // Uses the existing damage application logic[cite: 1] - tagged isMelee
    // so Spellproof monsters (spellproofPct) take full melee damage while
    // all non-melee sources (spells, reveal projectiles, DoTs) are resisted.
    _egDamageTargetById(targetId, dmg, elements, { isCrit: wasCrit, isMelee: true, chargePct });

    // Mana on a connecting strike above 50% charge-up (passive tree only -
    // melee strikes grant no mana by default).
    const manaOnHit = Number(_egComputePlayerStats().manaOnMeleeHitChargedPct) || 0;
    if (manaOnHit > 0 && chargePct > 0.5 && typeof globalThis.gainMana === 'function') globalThis.gainMana(manaOnHit);

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

    _egTryMeleeSplashHit(targetId, dmg, elements);

    // Weapon arts (Secret-of-Mana-style): a strike released inside an
    // overcharge tier band unleashes that tier's art on top of the normal
    // hit - dash-through at 200%+, sky leap at 300%+, weapon nova at 400%+,
    // grand nova at 500% (see _egMeleeTierArt). Sequenced deliveries return
    // the follow-through promise so the caller can await the landing.
    const tier = _egMeleeTierForCharge(chargePct);
    if (tier >= 1) {
        try { return _egMeleeTierArt(targetId, tier, rawHit, elements, wasCrit, opts); }
        catch (e) { return undefined; }
    }

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

// Melee splash (reworked node 20033 Champion's Vigor): the strike's area
// of effect. Every OTHER live monster whose card centre falls inside the
// splash radius takes the same hit - the exec finisher stays on the primary
// target only (cleave shares it the same way). Radius = granted base px
// scaled by increased AoE %; a zero base (no keystone) splashes nothing,
// so unkeystoned melee is exactly single-target as before. Needs card
// positions, so without DOM (tests, teardown) it quietly does nothing -
// fail closed, never fail open onto the whole field.
export function _egTryMeleeSplashHit(targetId, dmg = _egCurrentMeleeDamage(), elements = _egLastMeleeElements) {
    let basePx = 0, aoePct = 0;
    try {
        const stats = (typeof _egComputePlayerStats === 'function') ? _egComputePlayerStats() : {};
        basePx = Number(stats.meleeSplashBasePx) || 0;
        aoePct = Number(stats.meleeAoEPct) || 0;
    } catch (e) { return; }
    if (!(basePx > 0)) return;
    const radiusPx = basePx * (1 + aoePct / 100);
    if (!(radiusPx > 0)) return;
    const targetCard = typeof document !== 'undefined' ? document.getElementById(`eg-card-${targetId}`) : null;
    if (!targetCard) return;
    let centre = null;
    try {
        centre = (typeof _egGetElementCentre === 'function')
            ? _egGetElementCentre(targetCard)
            : targetCard.getBoundingClientRect();
    } catch (e) { return; }
    if (!centre) return;
    const tx = (centre.x != null) ? centre.x : centre.left;
    const ty = (centre.y != null) ? centre.y : centre.top;
    if (tx == null || ty == null) return;
    const wasCrit = (typeof _egLastMeleeWasCrit !== 'undefined') ? _egLastMeleeWasCrit : false;
    globalThis._egMonsters
        .filter(m => m && m.id !== targetId && (m.currentHP || 0) > 0)
        .forEach(m => {
            let card = null;
            try { card = document.getElementById(`eg-card-${m.id}`); } catch (e) { card = null; }
            if (!card) return;
            let c = null;
            try {
                c = (typeof _egGetElementCentre === 'function')
                    ? _egGetElementCentre(card)
                    : card.getBoundingClientRect();
            } catch (e) { c = null; }
            if (!c) return;
            const cx = (c.x != null) ? c.x : c.left;
            const cy = (c.y != null) ? c.y : c.top;
            if (cx == null || cy == null) return;
            if (Math.hypot(cx - tx, cy - ty) > radiusPx) return;
            if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('cleave');
            _egRestartFlashClass(card, 'eg-flash-cleave');
            _egDamageTargetById(m.id, dmg, elements, { isCrit: wasCrit, isMelee: true });
        });
}

// Physically lunges the class HUD toward the targeted monster and snaps back.
// LEGACY: manual strikes use the weapon-swing overlay plus the impact module.
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

    // If UI elements are missing, deal damage instantly
    if (!sourceHud || !targetCard) {
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
