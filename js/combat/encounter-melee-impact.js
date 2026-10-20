import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _calcPlayerMeleeDamage, _lastMeleeElements, _lastMeleeWasCrit } from './combat-calculations.js';
import { _secondaryDamage } from './combat-calculations-resistances.js';
import { _getElementCentre } from './combat-class-projectiles.js';
import { _playerTakeDamage } from './encounter-damage.js';
import { _damageTargetById, _showStatusLabel } from './encounter-monster-damage.js';
import { _consumeOnHitGearBonus } from './encounter-player-attacks.js';
import { _flashImmune, _restartFlashClass } from './encounter.js';
import { _egGetActiveMapModValue } from '../endgame/endgame-map-launch.js';
import { _tryMonsterMeleeSidestep } from './combat-monster-roam.js';
import { _computePlayerStats, _strikeHandMult } from '../endgame/endgame-player-stats.js';
import { PLAYER_MELEE_ANIM_DURATION_MS, PLAYER_MELEE_DAMAGE, _isActive } from './combat-state.js';
import { _facingFromVector, _getEquippedWeaponInfo, _meleeTargetInRange } from './combat-weapon-swing-config.js';
import { _meleeImpactThump, _showWeaponSwing, _weaponSwingSound } from './combat-weapon-swing.js';
import { MELEE_OVERCHARGE_MULT, _meleeTierArt, _meleeTierForCharge } from './encounter-melee-arts.js';
import { _rollPlayerMiss } from './encounter-charged-shot.js';
import { resolveGroundShape } from '../skills/spell-casttime.js';

// Current melee damage: rolls the dedicated melee channel (weapon base
// range + melee-scoped mods - see _calcPlayerMeleeDamage). `chargePct`
// (0..1, default 1) is the spent manual charge share - linear scaling, so
// a 30%-charged strike rolls 30% of the full hit, including its elemental
// breakdown and life leech. The active map's "% reduced Melee Attack
// Damage" mod is applied inside.
export function _currentMeleeDamage(chargePct = 1) {
    return (typeof _calcPlayerMeleeDamage === 'function')
        ? _calcPlayerMeleeDamage(chargePct)
        : Math.max(1, Math.round(PLAYER_MELEE_DAMAGE * chargePct));
}

// Execution tuning: a melee strike on a monster below this HP share is a
// finisher - multiplied damage. Gives melee the "cleanup kill" niche while
// spells handle wave-clear.
export const MELEE_EXECUTE_ENABLED = false;
export const MELEE_EXECUTE_HP_PCT = 0.25;
export const MELEE_EXECUTE_MULT = 3;

// Applies a manual melee strike at the moment of impact (Secret-of-Mana-
// style). The strike deals charge% of full damage - linear: 100% charge =
// 100% damage, 30% charge = 30% damage - and the charge was already spent
// (reset to zero) at key-press time by _doWeaponAttack. The damage (and
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
export function _applyPlayerMeleeImpact(targetId, opts) {
    if (!_isActive() || !globalThis._monsters.some(m => m.id === targetId)) return undefined;

    // Charge share snapshotted at key-press (null = legacy caller, full hit).
    // May exceed 1 when the player overcharged past 100% (see _tickPlayer).
    // Delivered arts (opts.chargePct) carry their release-time share in the
    // delivery closure instead - the global is left untouched so a second
    // strike released mid-flight can never steal or eat this strike's share.
    let chargePct;
    if (opts && typeof opts.chargePct === 'number') {
        chargePct = Math.min(MELEE_OVERCHARGE_MULT, Math.max(0, opts.chargePct));
    } else {
        chargePct = (typeof _pendingMeleeChargePct === 'number')
            ? Math.min(MELEE_OVERCHARGE_MULT, Math.max(0, globalThis._pendingMeleeChargePct)) : 1;
        globalThis._pendingMeleeChargePct = null;
    }

    // Out-of-reach whiff for plain strikes only: a sub-200% blade can't
    // reach a distant target - no damage, no procs, no reflect, and no
    // "too far" text either: the swing playing next to the hero IS the
    // feedback (the manual attack picks its victim from what is actually in
    // reach, see _meleeFindVictim, so this is a backstop for callers that
    // name a far target). At 200%+ the weapon art dashes to the target
    // instead, so this gate never fires.
    if (_meleeTierForCharge(chargePct) < 1
        && typeof _meleeTargetInRange === 'function' && !_meleeTargetInRange(targetId)) {
        return;
    }

    // The swing landed on a monster that is NOT the selected (yellow) one:
    // pulse its card so the player sees who was hit, and (optional setting,
    // off by default) move the selection onto it.
    if (targetId !== globalThis._targetId) {
        const hitCard = document.getElementById(`sx-card-${targetId}`);
        if (hitCard) {
            hitCard.classList.add('sx-card-melee-hit');
            setTimeout(() => hitCard.classList.remove('sx-card-melee-hit'), 500);
        }
        if (globalThis.SETTINGS && globalThis.SETTINGS.meleeAutoRetarget
            && typeof globalThis._selectTarget === 'function') {
            globalThis._selectTarget(targetId);
        }
    }

    // Accuracy: the swing can whiff entirely (no gear procs on a miss).
    // A whiffed swing does NOT refund the spent charge.
    if (_rollPlayerMiss(targetId)) return;

    // Map mod: ethereal monsters evade melee strikes.
    const meleeTarget = globalThis._monsters.find(m => m.id === targetId);
    if (meleeTarget && (meleeTarget.etherealPct || 0) > 0
        && Math.random() * 100 < meleeTarget.etherealPct) {
        _showStatusLabel(targetId, t('eg_dodged'));
        return;
    }

    // Melee-immune monsters (tutorial ghost lesson) shrug blades off with
    // the standard IMMUNE flash. Spells and projectiles bypass this gate -
    // only the melee channel is refused. The spent charge is NOT refunded.
    if (meleeTarget && meleeTarget.meleeImmune) {
        _flashImmune(targetId);
        return;
    }

    // Gear: channel stacks + mana-to-damage are consumed by this hit. The
    // melee roll above is already charge-scaled (including its elemental
    // breakdown and life leech); the consumed gear bonus scales the same
    // way so dumping stacks with 0%-charge taps can't cheat full damage.
    // Execution: a strike on a low-HP monster is a finisher (multiplied).
    let execMult = 1;
    // Disabled for now (MELEE_EXECUTE_ENABLED) - melee no longer needs it.
    if (MELEE_EXECUTE_ENABLED && meleeTarget && (meleeTarget.maxHP || 0) > 0
        && meleeTarget.currentHP > 0
        && meleeTarget.currentHP <= meleeTarget.maxHP * MELEE_EXECUTE_HP_PCT) {
        execMult = MELEE_EXECUTE_MULT;
        _showStatusLabel(targetId, t('eg_execute'));
    }
    // rawHit is the charge-scaled swing rolled ONCE - cleaved side targets
    // AND weapon-art tier victims all take this same hit (the exec finisher
    // multiplies only the primary target below).
    // Dual-wielding: this blow carries the struck hand's share of the combined
    // strike (1 otherwise), so both hands together equal the old single strike.
    const rawHit = Math.max(1, Math.round(
        (_currentMeleeDamage(chargePct) + _consumeOnHitGearBonus() * chargePct) * _strikeHandMult()));
    // Gauntlet combo: a melee strike soon after a spell hit crits harder.
    const gauntletHooks = globalThis._gauntletMeleeHooks;
    const comboMult = gauntletHooks ? gauntletHooks.pre(targetId) : 1;
    if (comboMult > 1) _showStatusLabel(targetId, t('eg_combo') !== 'eg_combo' ? t('eg_combo') : 'COMBO!');
    const dmg = Math.max(1, Math.round(rawHit * execMult * comboMult));
    const elements = _lastMeleeElements;
    const wasCrit = (typeof _lastMeleeWasCrit !== 'undefined') ? _lastMeleeWasCrit : false;

    // Uses the existing damage application logic[cite: 1] - tagged isMelee
    // so Spellproof monsters (spellproofPct) take full melee damage while
    // all non-melee sources (spells, reveal projectiles, DoTs) are resisted.
    _damageTargetById(targetId, dmg, elements, { isCrit: wasCrit, isMelee: true, chargePct });

    if (gauntletHooks) gauntletHooks.post(targetId, chargePct, comboMult > 1);

    // Life on a connecting strike (passive tree): melee-only line plus the
    // generic "per Enemy hit with Attacks" line shared with projectiles.
    {
        const meleeStats = _computePlayerStats();
        const lifeGain = (Number(meleeStats.lifeOnMeleeHit) || 0) + (Number(meleeStats.lifeOnAttackHit) || 0);
        if (lifeGain > 0 && globalThis.playerCurrentHP > 0 && globalThis.playerCurrentHP < globalThis.playerMaxHP) {
            globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + (globalThis._lifeGain ? globalThis._lifeGain(lifeGain) : (lifeGain)));
            if (typeof globalThis._renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
        }
    }

    // Mana on a connecting strike above 50% charge-up (passive tree only -
    // melee strikes grant no mana by default).
    const manaOnHit = Number(_computePlayerStats().manaOnMeleeHitChargedPct) || 0;
    if (manaOnHit > 0 && chargePct > 0.5 && typeof globalThis.gainMana === 'function') globalThis.gainMana(manaOnHit);

    // Impact feel: squash the struck card so the connect lands with weight
    // (miss/dodge/immune returned above, so this only plays on real hits).
    if (typeof _meleeImpactThump === 'function') {
        try { _meleeImpactThump(targetId); } catch (e) {}
    }

    // Active map run: monsters reflect #% of melee damage back at you.
    if (typeof _egGetActiveMapModValue === 'function') {
        const reflectPct = _egGetActiveMapModValue('map_reflect_melee');
        const reflectTarget = globalThis._monsters.find(m => m.id === targetId);
        if (reflectPct > 0 && reflectTarget) {
            const reflected = Math.max(1, Math.round(dmg * reflectPct / 100));
            globalThis.showCombatToast(`🪞 ${t('eg_mm_toast_reflect') || 'Reflected!'} (-${reflected})`);
            _playerTakeDamage(reflected, false, null);
        }
    }

    _tryCleaveHit(targetId, dmg, elements);

    _tryMeleeSplashHit(targetId, dmg, elements);

    // Weapon arts (Secret-of-Mana-style): a strike released inside an
    // overcharge tier band unleashes that tier's art on top of the normal
    // hit - dash-through at 200%+, sky leap at 300%+, weapon nova at 400%+,
    // grand nova at 500% (see _meleeTierArt). Sequenced deliveries return
    // the follow-through promise so the caller can await the landing.
    const tier = _meleeTierForCharge(chargePct);
    if (tier >= 1) {
        try { return _meleeTierArt(targetId, tier, rawHit, elements, wasCrit, opts); }
        catch (e) { return undefined; }
    }

    // Melee sidestep: the struck monster sometimes darts to a different
    // zone panel, forcing the player to walk back into range instead of
    // standing still and spamming E. Chance + cooldown live in
    // endgame-monster-roam.js; dead targets never move. Runs AFTER cleave
    // so the current swing still splashes the old neighbours.
    if (typeof _tryMonsterMeleeSidestep === 'function') {
        try { _tryMonsterMeleeSidestep(targetId); } catch (e) {}
    }
}

// Cleave gear modifier (main weapon suffix): rolls against cleavePct and,
// on success, hits every OTHER monster sharing the target's spawn location
// for the same melee damage, with a dedicated flash animation and sound.
export function _tryCleaveHit(targetId, dmg = _currentMeleeDamage(), elements = _lastMeleeElements) {
    const stats = _computePlayerStats();
    const cleavePct = stats.cleavePct || 0;
    if (cleavePct <= 0 || Math.random() * 100 >= cleavePct) return;

    const target = globalThis._monsters.find(m => m.id === targetId);
    if (!target) return;

    // "Same spawn location" = monsters rendered into the same zone panel
    const sideTargets = globalThis._monsters.filter(m => m.id !== targetId && m.zoneId === target.zoneId);
    if (!sideTargets.length) return;

    if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('cleave');

    sideTargets.forEach(m => {
        const card = document.getElementById(`sx-card-${m.id}`);
        if (card) _restartFlashClass(card, 'sx-flash-cleave');
        const wasCrit = (typeof _lastMeleeWasCrit !== 'undefined') ? _lastMeleeWasCrit : false;
        _damageTargetById(m.id, _secondaryDamage(dmg, 'cleave', stats), elements, { isCrit: wasCrit });
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
export function _tryMeleeSplashHit(targetId, dmg = _currentMeleeDamage(), elements = _lastMeleeElements) {
    let basePx = 0, aoePct = 0;
    try {
        const stats = (typeof _computePlayerStats === 'function') ? _computePlayerStats() : {};
        basePx = Number(stats.meleeSplashBasePx) || 0;
        aoePct = Number(stats.meleeAoEPct) || 0;
    } catch (e) { return; }
    if (!(basePx > 0)) return;
    // Scale to the window like spell shapes do: card spacing shrinks with the
    // viewport (browser zoom-in), a fixed-px radius would then swallow more
    // of the field for free.
    let radiusPx = basePx * (1 + aoePct / 100);
    try {
        const shape = resolveGroundShape({ kind: 'circle', radius: radiusPx });
        if (shape && shape.radius > 0) radiusPx = shape.radius;
    } catch (e) { /* keep the unscaled radius */ }
    if (!(radiusPx > 0)) return;
    const targetCard = typeof document !== 'undefined' ? document.getElementById(`sx-card-${targetId}`) : null;
    if (!targetCard) return;
    let centre = null;
    try {
        centre = (typeof _getElementCentre === 'function')
            ? _getElementCentre(targetCard)
            : targetCard.getBoundingClientRect();
    } catch (e) { return; }
    if (!centre) return;
    const tx = (centre.x != null) ? centre.x : centre.left;
    const ty = (centre.y != null) ? centre.y : centre.top;
    if (tx == null || ty == null) return;
    const wasCrit = (typeof _lastMeleeWasCrit !== 'undefined') ? _lastMeleeWasCrit : false;
    globalThis._monsters
        .filter(m => m && m.id !== targetId && (m.currentHP || 0) > 0)
        .forEach(m => {
            let card = null;
            try { card = document.getElementById(`sx-card-${m.id}`); } catch (e) { card = null; }
            if (!card) return;
            let c = null;
            try {
                c = (typeof _getElementCentre === 'function')
                    ? _getElementCentre(card)
                    : card.getBoundingClientRect();
            } catch (e) { c = null; }
            if (!c) return;
            const cx = (c.x != null) ? c.x : c.left;
            const cy = (c.y != null) ? c.y : c.top;
            if (cx == null || cy == null) return;
            if (Math.hypot(cx - tx, cy - ty) > radiusPx) return;
            if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('cleave');
            _restartFlashClass(card, 'sx-flash-cleave');
            _damageTargetById(m.id, dmg, elements, { isCrit: wasCrit, isMelee: true });
        });
}

// Physically lunges the class HUD toward the targeted monster and snaps back.
// LEGACY: manual strikes use the weapon-swing overlay plus the impact module.
export function _animatePlayerMelee(targetId) {
    const targetCard = document.getElementById(`sx-card-${targetId}`);
    const avatarWrapper = document.getElementById('player-avatar-wrapper');
    const sprite = document.getElementById('avatar-sprite-img');

    if (!avatarWrapper || !targetCard) {
        _damageTargetById(targetId, _currentMeleeDamage(), _lastMeleeElements);
        return;
    }

    const start = _getElementCentre(avatarWrapper);
    const end = _getElementCentre(targetCard);

    // If the monster is to the left (end.x < start.x), flip the sprite
    const shouldFlip = end.x < start.x;
    sprite.style.transform = shouldFlip ? 'scaleX(-1)' : 'scaleX(1)';

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Shared weapon-swing overlay, aimed at the target card so manual strikes
    // show the equipped weapon family (E uses movement facing instead).
    try {
        if (typeof _showWeaponSwing === 'function') {
            const fam = (typeof _getEquippedWeaponInfo === 'function')
                ? _getEquippedWeaponInfo().family : 'sword';
            const face = (typeof _facingFromVector === 'function')
                ? _facingFromVector(dx, dy) : 'down';
            _showWeaponSwing(fam, face);
            if (typeof _weaponSwingSound === 'function') _weaponSwingSound(fam);
        }
    } catch (e) {}

    // Bring to front during the lunge
    const originalZIndex = avatarWrapper.style.zIndex;
    avatarWrapper.style.zIndex = '9999';

    const anim = avatarWrapper.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(1.15)` },
        { transform: 'translate(0px, 0px) scale(1)' }
    ], { duration: PLAYER_MELEE_ANIM_DURATION_MS, easing: 'ease-in-out' });

    anim.onfinish = () => {
        avatarWrapper.style.zIndex = originalZIndex;
        //sprite.style.transform = 'scaleX(1)';
    };

    setTimeout(() => _applyPlayerMeleeImpact(targetId), PLAYER_MELEE_ANIM_DURATION_MS / 2);
}


/*

function _animatePlayerMelee(targetId) {
    const targetCard = document.getElementById(`sx-card-${targetId}`);
    const sourceHud = document.getElementById('class-hud-panel');

    // If UI elements are missing, deal damage instantly
    if (!sourceHud || !targetCard) {
        _damageTargetById(targetId, PLAYER_MELEE_DAMAGE);
        return;
    }

    const start = _getElementCentre(sourceHud);
    const end = _getElementCentre(targetCard);
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Ensure the HUD renders on top during flight
    sourceHud.style.zIndex = '9999';

    const anim = sourceHud.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(1.15)` }, // Apex/Impact
        { transform: 'translate(0px, 0px) scale(1)' }
    ], { duration: PLAYER_MELEE_ANIM_DURATION_MS, easing: 'ease-in-out' });

    anim.onfinish = () => {
        sourceHud.style.zIndex = '';
    };

    // Damage fires at the animation midpoint to match visual impact[cite: 1]
    setTimeout(() => _applyPlayerMeleeImpact(targetId), PLAYER_MELEE_ANIM_DURATION_MS / 2);
}

*/
