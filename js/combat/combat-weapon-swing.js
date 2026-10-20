import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _getElementCentre } from './combat-class-projectiles.js';
import { _consumePlayerCharge, _getPlayerChargePct, _updatePlayerChargeBar } from './encounter-tick.js';
import { _meleeTierLabel } from './encounter.js';
import { _showStatusLabel } from './encounter-monster-damage.js';
import { _applyPlayerMeleeImpact } from './encounter-melee-impact.js';
import {
    _meleeDashOut,
    _meleeDeliveryAvailable,
    _meleeGlideHome,
    _meleeRaiseAvatar,
} from './encounter-melee-delivery.js';
import { _meleeTierForCharge } from './encounter-melee-arts.js';
import { WEAPON_SWING_COOLDOWN_MS, WEAPON_SWING_DURATION_MS, _facingFromVector, _getAttackFacing, _getEquippedWeaponInfo, _getStrikeWeaponFamily, _meleeAimFacing, _meleeFindVictim } from './combat-weapon-swing-config.js';
import { _isActive } from './combat-state.js';

//  endgame-weapon-swing.js
//  MANUAL WEAPON ATTACK (E) + shared CSS swing visuals.
//  Loads AFTER endgame-encounter.js, endgame-encounter-tick.js,
//  endgame-player-stats.js and sprite_animations.js (all globals are
//  typeof-guarded so load order is forgiving; behaviour only runs live).
//
//  WHY THIS EXISTS: the game has dozens of weapon base types (daggers,
//  swords, axes, maces, wands, staves, bows …) across three characters
//  and many classes. Animating every weapon for every character/class
//  combo would be an enormous art burden, so attacks combine two layers
//  anchored to the player avatar:
//    1. the EQUIPPED weapon itself swings — the gear-overlay item image
//       (js/sprite/gear_overlays.js, tuned in the grip lab) rotates around
//       its grip point via the independent `rotate` CSS property, so the
//       base placement transform is never touched;
//    2. a family-skinned CSS arc/trail (css/endgame/weapon-swing.css)
//       plays underneath for impact readability.
//  The swing is skinned per weapon FAMILY - not per base item - and rotated
//  toward the facing direction.
//
//  CONTROLS: E = manual attack (this file) - the bar auto-charges to 100%
//  Secret-of-Mana-style: TAP to strike with whatever charge is ready,
//  HOLD past full to overcharge (200% dash, 300% sky leap, 400% nova,
//  500% grand nova), RELEASE to strike. Parry (hold) lives on the
//  'sx-parry' keybind (R by default) in endgame-encounter-tick.js.
//------------------------------------------------------------------------
//-------------------SWING VISUAL------------------------------------------
//------------------------------------------------------------------------

// Input throttles are private to the manual-attack controller.
let _weaponSwingLastAt = 0;
let _meleeRangeToastAt = 0;
let _meleeNoWeaponToastAt = 0;


// Swings the EQUIPPED weapon image itself: the gear-overlay weapon <img>
// (front or back stage, whichever is currently visible) rotates around its
// grip point — gear_overlays.js sets transform-origin to the item handle,
// so a `rotate` animation pivots exactly where the hand holds it. Uses the
// independent `rotate` CSS property (not `transform`) so the placement
// transform (scaleX mirror + base rotation from the grip lab) is untouched
// and the weapon settles back to its tuned pose when the animation ends
// (fill:none default). Never throws; no weapon visible → arc-only swing.
function _swingEquippedWeapon(durationMs, heavy) {
    try {
        if (typeof document === 'undefined') return;
        const avatar = document.getElementById('player-avatar-wrapper');
        if (!avatar) return;
        let el = null;
        const candidates = avatar.querySelectorAll('.gear-item.gear-weapon');
        for (const c of candidates) {
            if (c && c.style && c.style.display === 'block' && c.getAttribute('src')) { el = c; break; }
        }
        if (!el || typeof el.animate !== 'function') return;
        let reduce = false;
        try {
            reduce = !!(typeof window !== 'undefined' && window.matchMedia
                && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (e) { reduce = false; }
        const windup = heavy ? -75 : -65;
        const follow = heavy ? 65 : 55;
        const dur = reduce ? 120 : Math.max(120, durationMs || 300);
        // Fast slash with a soft landing: the strike snaps through the
        // middle of the swing (the oomph) and eases back to the tuned pose.
        el.animate(
            [{ rotate: windup + 'deg' }, { rotate: follow + 'deg' }, { rotate: '0deg' }],
            { duration: dur, easing: 'cubic-bezier(0.15, 0.6, 0.25, 1)' }
        );
    } catch (e) {}
}

// Impact thump on the struck monster's card: a quick squash that lands with
// the damage. Uses the independent `scale` property so it COMPOSES with the
// card's own damage-shake (a `transform` animation) instead of fighting it.
// Called only on real connects — never on miss/dodge/immune — and skipped
// under prefers-reduced-motion. Never throws.
export function _meleeImpactThump(targetId) {
    try {
        if (typeof document === 'undefined' || targetId == null) return;
        if (typeof window !== 'undefined' && window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const card = document.getElementById(`sx-card-${targetId}`);
        if (!card || typeof card.animate !== 'function') return;
        card.animate(
            [{ scale: '1' }, { scale: '0.9' }, { scale: '1.03' }, { scale: '1' }],
            { duration: 200, easing: 'ease-out' }
        );
    } catch (e) {}
}

// Spawns the family-skinned CSS overlay on the avatar, rotated toward
// `facing`, AND swings the equipped weapon image itself (see above).
// Character-agnostic: no sprite art is touched, so every
// character/class combo shares the same effect. No-op without an avatar.
export function _showWeaponSwing(family, facing) {
    const avatar = document.getElementById('player-avatar-wrapper');
    if (!avatar) return;
    const fam = WEAPON_SWING_DURATION_MS[family] != null ? family : 'sword';
    const dir = (facing === 'up' || facing === 'down' || facing === 'left' || facing === 'right')
        ? facing : 'down';
    let heavy = false;
    try { heavy = _getEquippedWeaponInfo().hands === 2; } catch (e) {}
    _swingEquippedWeapon(WEAPON_SWING_DURATION_MS[fam] || 320, heavy);

    const el = document.createElement('div');
    el.className = `sx-weapon-swing sx-swing-${fam} sx-dir-${dir}${heavy ? ' sx-heavy' : ''}`;
    el.innerHTML = '<div class="sx-swing-rot"><div class="sx-swing-part sx-swing-arc"></div><div class="sx-swing-part sx-swing-blade"></div></div>';
    avatar.appendChild(el);
    const lifetime = (WEAPON_SWING_DURATION_MS[fam] || 320) + 60;
    setTimeout(() => { try { el.remove(); } catch (e) {} }, lifetime);
}

// Big hop toward `facing` so the swing lands with weight. Uses WAAPI on the
    // wrapper (the old auto-attack lunge is gone - manual strikes hop only).
function _weaponSwingHop(facing) {
    const avatar = document.getElementById('player-avatar-wrapper');
    if (!avatar || typeof avatar.animate !== 'function') return;
    const d = 22;
    const vec = facing === 'up' ? [0, -d] : facing === 'down' ? [0, d]
        : facing === 'left' ? [-d, 0] : [d, 0];
    try {
        avatar.animate([
            { transform: 'translate(0px, 0px)' },
            { transform: `translate(${vec[0]}px, ${vec[1]}px)` },
            { transform: 'translate(0px, 0px)' },
        ], { duration: 160, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
    } catch (e) {}
}

// Best-effort swing sound from already-registered SFX (no new assets).
export function _weaponSwingSound(family) {
    try {
        if (typeof Audio_Manager === 'undefined' || !Audio_Manager.playSFX) return;
        // [new per-family sound, placeholder that plays until it is recorded]
        const map = {
            wand: ['melee_swing_staff', 'arcaneReveal'],
            staff: ['melee_swing_staff', 'arcaneReveal'],
            mace: ['melee_swing_mace', 'bump_thwack'],
            bow: ['bow_shot', 'precisionMark'],
            axe: ['melee_swing_axe', 'cleave'],
            dagger: ['melee_swing_dagger', 'cleave'],
            unarmed: ['unarmed_punch', 'cleave'],
        };
        const [sfx, fallback] = map[family] || ['melee_swing_sword', 'cleave'];
        Audio_Manager.playSFX(sfx, fallback);
    } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------MANUAL ATTACK (E)-------------------------------------
//------------------------------------------------------------------------

//-------------------SEQUENCED ART DELIVERY------------------------------
// A released overcharge art (200%+) is DELIVERED, not instant: the launch
// telegraphs the art's name on the target, the avatar visibly charges
// across the screen (readable travel + arrival beat), and ONLY ON ARRIVAL
// does the weapon swing play with the impact (damage, cleave, follow-up
// arts). Afterwards the avatar glides home. Fire-and-forget async - damage
// correctness never depends on the visuals (every flight has a timeout
// fallback), and the avatar always glides home + drops its raised z-index
// via finally. Never throws.
function _meleeDeliverArtStrike(targetId, tier, chargePct) {
    const run = async () => {
        let restoreZ = () => {};
        try {
            restoreZ = _meleeRaiseAvatar();
            // Launch telegraph: name the incoming art on the target while
            // the hero is still charging over (the impact-time labels stay
            // silent in sequenced mode - see _meleeTierArt).
            try {
                if (tier >= 4) _showStatusLabel(targetId, _meleeTierLabel('eg_melee_tier4', 'MANA STRIKE!'));
                else if (tier >= 3) _showStatusLabel(targetId, _meleeTierLabel('eg_melee_tier3', 'Weapon Nova!'));
                else _showStatusLabel(targetId, _meleeTierLabel('eg_melee_tier1', 'Dash Strike!'));
            } catch (e) {}
            await _meleeDashOut(targetId);
            if (typeof _isActive === 'function' && !_isActive()) return;
            if (typeof dead !== 'undefined' && globalThis.dead) return;
            // ARRIVAL: the hit animation plays HERE, on the monster - aim
            // the swing along the real travelled vector, not the last walk
            // facing (the hero may have dashed in from any direction).
            let face = _getAttackFacing();
            try {
                const avatar = document.getElementById('player-avatar-wrapper');
                const card = document.getElementById(`sx-card-${targetId}`);
                if (avatar && card) {
                    const a = _getElementCentre(avatar);
                    const b = _getElementCentre(card);
                    face = _facingFromVector(b.x - a.x, b.y - a.y);
                }
            } catch (e) {}
            const family = _getStrikeWeaponFamily(true);
            _showWeaponSwing(family, face);
            _weaponSwingSound(family);
            // The impact (damage + follow-through arts) lands with the
            // swing - sequenced mode resolves when the leap/nova legs do.
            // The release-time share travels in the closure (a second
            // strike mid-flight spends into the global, never into this).
            await _applyPlayerMeleeImpact(targetId, { sequenced: true, chargePct });
        } catch (e) {
            // Theatre must never break the strike - damage paths guard
            // themselves; worst case the avatar simply glides home below.
        } finally {
            try { await _meleeGlideHome(); } catch (e) {}
            try { restoreZ(); } catch (e) {}
        }
    };
    try {
        const p = run();
        if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {}
}

// Manual weapon attack (Secret-of-Mana-style): directional CSS swing + hop,
// damage through the standard melee channel against the CURRENT target
// (same damage, cleave, accuracy and reflect rules as before). The strike
// deals charge% of full damage - 100% charge = 100% damage, overcharged
// tiers hit harder AND trigger weapon arts (see _meleeTierArt) - and
// spends (resets) the charge bar, even on a miss. Plain strikes (<200%)
// swing instantly in place (and only connect in melee reach - see
// _applyPlayerMeleeImpact); overcharge arts (200%+) are DELIVERED
// instead (see _meleeDeliverArtStrike): the avatar charges across the
// screen and the swing + impact play ON ARRIVAL. Without a target the
// swing still plays as a whiff but costs nothing, so retargeting never
// punishes.
export function _doWeaponAttack() {
    // The strike is released - the hold (if any) is over either way. This
    // runs BEFORE every guard below on purpose: a keyup during cooldown,
    // while dead, or behind a modal must still end the hold, or the hero
    // would stay rooted + vulnerable with the finger already up (and the
    // charge would keep overcharging behind the modal).
    Audio_Manager.stopSFX('charge_loop');
    try { globalThis._meleeHoldActive = false; } catch (e) {}
    try { globalThis._meleeHoldKey = null; } catch (e) {}
    try { globalThis._meleeHoldStartAt = 0; } catch (e) {}
    try { globalThis._meleeChargeLevel = 0; } catch (e) {}
    if (typeof _isActive === 'function' && !_isActive()) return;
    if (typeof dead !== 'undefined' && globalThis.dead) return;
    if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;
    if (document.querySelector('.modal-bg.show')) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (now - _weaponSwingLastAt < WEAPON_SWING_COOLDOWN_MS) return;
    _weaponSwingLastAt = now;

    // Weapon gate: no melee weapon (or bow) equipped → no attack at all.
    // Previously this fell through to the 'unarmed' family and let a fresh
    // character (e.g. during the tutorial, before the Professor's sword
    // lesson) punch monsters with bare fists. The swing visual maps an
    // absent weapon to 'unarmed', so the lookup must be the item itself.
    if (!_getEquippedWeaponInfo().item) {
        if (now - _meleeNoWeaponToastAt > 1500) {
            _meleeNoWeaponToastAt = now;
            if (typeof showToast === 'function') globalThis.showToast('⚔️ ' + t('eg_melee_no_weapon'));
        }
        return;
    }

    // LOOK AROUND (spell pass 1): a swing does not need a selected target.
    // The strike lands on the SELECTED monster when it is in reach, else on
    // the nearest monster that is (see _meleeFindVictim); with nothing in
    // reach it is a clean whiff - the swing plays next to the hero and no
    // "too far" text is shown. Overcharge arts (200%+) still dash to the
    // selected target from anywhere.
    const selectedId = (typeof _targetId === 'undefined' || !globalThis._targetId)
        ? null : globalThis._targetId;
    const victimId = _meleeFindVictim(selectedId);
    let peekTier = 0;
    try {
        peekTier = (typeof _getPlayerChargePct === 'function' && typeof _meleeTierForCharge === 'function')
            ? _meleeTierForCharge(_getPlayerChargePct()) : 0;
    } catch (e) { peekTier = 0; }
    // Spend the charge at key-press time so the strike matches the bar the
    // player saw (charging during the swing flight doesn't inflate it).
    // Nothing to hit (and no art to dash with) → whiff visual only, the
    // charge is kept so a stray press never wastes a full bar.
    const strikeId = (peekTier >= 1 && selectedId) ? selectedId : (victimId || null);
    const hasTarget = !!strikeId;
    if (hasTarget && typeof _consumePlayerCharge === 'function') {
        try { globalThis._pendingMeleeChargePct = _consumePlayerCharge(); } catch (e) { globalThis._pendingMeleeChargePct = 1; }
    } else {
        globalThis._pendingMeleeChargePct = null;
    }
    if (typeof _updatePlayerChargeBar === 'function') {
        try { _updatePlayerChargeBar(); } catch (e) {}
    }

    // Overcharge arts (200%+) are DELIVERED, not swung in place: the avatar
    // charges across the screen and the swing + impact play ON ARRIVAL (see
    // _meleeDeliverArtStrike above) - so this path returns before the
    // instant swing below. Plain strikes (<200%) keep the instant swing.
    let spentTier = 0;
    try {
        spentTier = (typeof _pendingMeleeChargePct === 'number'
            && typeof _meleeTierForCharge === 'function')
            ? _meleeTierForCharge(globalThis._pendingMeleeChargePct) : 0;
    } catch (e) { spentTier = 0; }
    if (hasTarget && spentTier >= 1
        && typeof _meleeDeliveryAvailable === 'function'
        && _meleeDeliveryAvailable(strikeId)) {
        // Capture the release-time share into the delivery: the global is
        // cleared NOW (so the probe-visible "spent" state reads instantly
        // and a mid-flight second strike can't collide with it) while the
        // arrival impact uses the captured value (see opts.chargePct).
        const spentPct = globalThis._pendingMeleeChargePct;
        globalThis._pendingMeleeChargePct = null;
        _meleeDeliverArtStrike(strikeId, spentTier, spentPct);
        return;
    }

    const family = _getStrikeWeaponFamily(hasTarget);
    const facing = _meleeAimFacing(strikeId || selectedId);
    _showWeaponSwing(family, facing);
    _weaponSwingHop(facing);
    _weaponSwingSound(family);

    // Damage at swing impact (matches the visual mid-point).
    setTimeout(() => {
        try {
            if (typeof _isActive === 'function' && !_isActive()) return;
            if (typeof dead !== 'undefined' && globalThis.dead) return;
            // Re-check the surroundings at the moment of impact: monsters
            // roam, so the victim is whatever is in reach NOW (the one the
            // swing was aimed at when it is still there).
            // (A press with nothing in reach kept its charge and is a pure
            // whiff - it never strikes, or a free full-power hit would leak.)
            if (!hasTarget) return;
            const live = _meleeFindVictim(globalThis._targetId || strikeId || null);
            if (!live) return;
            if (typeof _applyPlayerMeleeImpact === 'function') _applyPlayerMeleeImpact(live);
        } catch (e) {}
    }, Math.max(80, Math.round((WEAPON_SWING_DURATION_MS[family] || 320) / 2)));
}

//-------------------HOLD-TO-OVERCHARGE (Secret-of-Mana-style)-----------
// The bar auto-charges to 100% on its own (see _tickPlayer). TAP the
// attack key = strike with whatever charge is ready; HOLDING past full
// overcharges through the weapon-art tiers (200% dash, 300% sky leap,
// 400% nova, 500% grand nova - see _meleeTierArt); RELEASING the key
// swings. The state lives as plain globalThis properties (not module
// bindings) so encounter-tick.js can read them without an import cycle
// back into this file (this file already imports from encounter-tick.js).
// Unset means "not holding" (falsy) - no top-level init needed, and the
// module-init timing guard forbids top-level globalThis reads in
// converted files.

// Normalizes a key event the same way the keybind system does (see
// _keybindNormalize in keybinds.js: single chars and named keys alike are
// lowercased) so press/release pairs match even for rebound keys.
function _meleeNormKey(e) {
    return (e && e.key ? String(e.key) : '').toLowerCase();
}

// PRESS: begin the hold. The bar is NOT reset here - it auto-charged on
// its own (see _tickPlayer), so pressing at 100% and holding goes
// straight into overcharge; pressing right after a strike starts low and
// builds while held. Key repeat is ignored by the caller so holding keeps
// charging instead of re-firing weak strikes.
function _meleeBeginHold(e) {
    if (typeof _isActive === 'function' && !_isActive()) return false;
    if (typeof dead !== 'undefined' && globalThis.dead) return false;
    if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return false;
    if (typeof document !== 'undefined' && document.querySelector('.modal-bg.show')) return false;
    try {
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return false;
    } catch (err) {}
    if (globalThis._meleeHoldActive) return true;
    // No weapon equipped → no charge either (same gate as the strike).
    try {
        if (typeof _getEquippedWeaponInfo === 'function' && !_getEquippedWeaponInfo().item) return false;
    } catch (err) { return false; }
    try { globalThis._meleeHoldKey = _meleeNormKey(e); } catch (err) {}
    globalThis._meleeHoldActive = true;
    // Hold start stamp (wall clock): the ROOTED warning indicator only
    // appears after a committed hold (see
    // MELEE_ROOTED_INDICATOR_DELAY_MS) so quick taps never flash it.
    try { globalThis._meleeHoldStartAt = Date.now(); } catch (err) {}
    if (typeof _updatePlayerChargeBar === 'function') {
        try { _updatePlayerChargeBar(); } catch (err) {}
    }
    return true;
}

// Cancels an in-progress hold WITHOUT striking (window blur, tab hidden -
// the matching keyup will never arrive, so the avatar must not charge
// forever). The unspent charge simply fizzles.
function _meleeCancelHold() {
    if (!globalThis._meleeHoldActive) return;
    globalThis._meleeHoldActive = false;
    Audio_Manager.stopSFX('charge_loop');
    try { globalThis._meleeHoldKey = null; } catch (e) {}
    try { globalThis._meleeHoldStartAt = 0; } catch (e) {}
    try { globalThis._meleeChargeLevel = 0; } catch (e) {}
    if (typeof _updatePlayerChargeBar === 'function') {
        try { _updatePlayerChargeBar(); } catch (e) {}
    }
}

// RELEASE: strike with whatever charge was built while held.
function _meleeReleaseHold() {
    if (!globalThis._meleeHoldActive) return;
    _doWeaponAttack();
}

export function _initEgWeaponAttackHotkey() {
    // PRESS starts the charge. The central dispatcher matches the player's
    // (possibly rebound) sx-attack key; key repeat is ignored so holding
    // keeps charging instead of re-firing weak strikes.
    const pressHandler = (e) => {
        if (e && e.repeat) return false;
        _meleeBeginHold(e);
        return false;
    };
    if (typeof onKeybindAction === 'function') {
        globalThis.onKeybindAction('sx-attack', pressHandler);
    } else {
        // Fallback if the keybind system loads later/never: plain E key.
        document.addEventListener('keydown', (e) => {
            if (!e || e.repeat) return;
            if ((e.key || '').toLowerCase() !== 'e') return;
            _meleeBeginHold(e);
        });
    }
    // RELEASE strikes. The keyup is matched against the key that STARTED
    // the hold (recorded at press time), so rebound keys just work without
    // needing the keybind matcher here.
    document.addEventListener('keyup', (e) => {
        if (!globalThis._meleeHoldActive) return;
        try {
            if (globalThis._meleeHoldKey != null && _meleeNormKey(e) !== globalThis._meleeHoldKey) return;
        } catch (err) {}
        _meleeReleaseHold();
    });
    // Never get stuck charging when the page loses focus.
    window.addEventListener('blur', _meleeCancelHold);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) _meleeCancelHold();
    });
}
// Module-eval timing: the import phase runs before concatenated keybinds.js,
// so registering at top level would take the raw-key fallback branch and the
// rebindable registration would never happen. Defer to DOMContentLoaded - by
// then the full global surface exists (same fix as the skill-hotbar P bug).
if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', _initEgWeaponAttackHotkey);
} else {
    _initEgWeaponAttackHotkey();
}
