import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _egGetElementCentre } from './combat-class-projectiles.js';
import { _egConsumePlayerCharge, _egUpdatePlayerChargeBar } from './encounter-tick.js';
import { _egApplyPlayerMeleeImpact } from './encounter.js';
import { _egGetAllEquippedItems } from '../endgame/endgame-player-stats.js';
import { _egIsActive } from './combat-state.js';

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
//  CONTROLS: E = manual attack (this file) - HOLD to charge Secret-of-Mana-
//  style, RELEASE to strike. Parry (hold) lives on the 'eg-parry' keybind
//  (R by default) in endgame-encounter-tick.js.
//------------------------------------------------------------------------
//-------------------WEAPON FAMILY RESOLUTION------------------------------
//------------------------------------------------------------------------

// Manual-attack input cooldown so E can't machine-gun the melee channel.
export const EG_WEAPON_SWING_COOLDOWN_MS = 400;
export let _egWeaponSwingLastAt = 0;

// Melee reach: the avatar's screen centre must be within this many px of the
// target card's centre for a strike to CONNECT. The swing ALWAYS plays -
// out of range it just hits air (no damage, charge still spent) - so the
// player must walk up to the monster first for real hits.
export const EG_MELEE_RANGE_PX = 340;
// Throttle for the out-of-range toast (E can be held down).
export let _egMeleeRangeToastAt = 0;
// Throttle for the no-weapon toast (same hold-E protection).
export let _egMeleeNoWeaponToastAt = 0;

// True when the avatar stands close enough to the target to strike it.
// Missing DOM (tests, teardown) never blocks - fail open.
export function _egMeleeTargetInRange(targetId) {
    try {
        const card = document.getElementById(`eg-card-${targetId}`);
        const avatar = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple');
        if (!card || !avatar) return true;
        const a = (typeof _egGetElementCentre === 'function')
            ? _egGetElementCentre(avatar)
            : avatar.getBoundingClientRect();
        const b = (typeof _egGetElementCentre === 'function')
            ? _egGetElementCentre(card)
            : card.getBoundingClientRect();
        const ax = (a.x != null) ? a.x : a.left, ay = (a.y != null) ? a.y : a.top;
        const bx = (b.x != null) ? b.x : b.left, by = (b.y != null) ? b.y : b.top;
        return Math.hypot(ax - bx, ay - by) <= EG_MELEE_RANGE_PX;
    } catch (e) {
        return true;
    }
}

// Per-family visual lifetime (ms) - must cover the longest CSS keyframe
// in weapon-swing.css so the node is removed after the effect finishes.
export const EG_WEAPON_SWING_DURATION_MS = {
    sword: 320, dagger: 260, axe: 400, mace: 420,
    wand: 360, staff: 480, bow: 340, unarmed: 280,
};

// Maps an equipped weapon item to one of the CSS families. Resolution is
// deliberately fuzzy (baseId prefix + icon + name keywords) so every
// current AND future base type - including the wpn_auto_* filler series -
// lands on a sensible visual without a per-item table.
export function _egWeaponSwingFamily(item) {
    if (!item) return 'unarmed';
    if (item.slotType === 'ranged') return 'bow';
    const baseId = String(item.baseId || item.id || '');
    if (/^ranged/.test(baseId)) return 'bow';
    const icon = String(item.icon || '');
    const name = `${item.baseName || ''} ${item.name || ''}`.toLowerCase();
    const has = (...words) => words.some((w) => name.includes(w));

    // Icon is the strongest signal (set per base type in base-items.js).
    if (icon === '🪓' || has('axe', 'axt', 'worldsplitter')) return 'axe';
    if (icon === '🔨' || has('maul', 'hammer', 'mace', 'mauls', 'worldbreaker')) return 'mace';
    if (icon === '🦯' || has('staff', 'staves', 'warstaff', 'stab der', 'echoes')) return 'staff';
    if (icon === '🪄' || has('wand', 'sceptre', 'scepter', 'rod', 'zauberstab', 'zepter', 'arcane rod')) return 'wand';
    if (icon === '🗡️' || /^wpn_agi/.test(baseId) || has('dagger', 'dolch', 'baselard', 'rapier', 'stiletto', 'misericorde', 'nightfang', 'heartseeker', 'fang of', 'swift fang')) return 'dagger';
    // Default: swords (covers wpn_1h_*, wpn_2h_* greatswords, ⚔️, auto Battle Blades).
    return 'sword';
}

// Returns { item, family, hands, label } for the currently equipped melee
// weapon (weapon slot). Falls back to the ranged bow, then unarmed.
export function _egGetEquippedWeaponInfo() {
    let item = null;
    try {
        if (typeof _egGetAllEquippedItems === 'function') {
            const all = _egGetAllEquippedItems() || [];
            item = all.find((it) => it && it.slotType === 'weapon')
                || all.find((it) => it && it.slotType === 'ranged')
                || null;
        }
    } catch (e) { item = null; }
    const family = _egWeaponSwingFamily(item);
    const hands = (item && item.hands === 2) ? 2 : 1;
    const label = item ? (item.baseName || item.name || '') : '';
    return { item, family, hands, label };
}


//------------------------------------------------------------------------
//-------------------FACING------------------------------------------------
//------------------------------------------------------------------------

// The direction the avatar is currently facing. Movement writes it to the
// walk loop (_lastFacingDir / _walkState.dirName in sprite_animations.js);
// idle keeps the last travel direction, so a standing player still attacks
// toward where they last walked. Falls back to 'down'.
export function _egGetAttackFacing() {
    const ok = (d) => d === 'up' || d === 'down' || d === 'left' || d === 'right';
    try { if (typeof _lastFacingDir === 'string' && ok(globalThis._lastFacingDir)) return globalThis._lastFacingDir; } catch (e) {}
    try { if (typeof _walkState !== 'undefined' && globalThis._walkState && ok(globalThis._walkState.dirName)) return globalThis._walkState.dirName; } catch (e) {}
    return 'down';
}

// Facing implied by a screen-space vector (used so AUTO-attacks aim the
// swing at the targeted monster card instead of the movement facing).
export function _egFacingFromVector(dx, dy) {
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'down' : 'up';
}


//------------------------------------------------------------------------
//-------------------SWING VISUAL------------------------------------------
//------------------------------------------------------------------------

// Swings the EQUIPPED weapon image itself: the gear-overlay weapon <img>
// (front or back stage, whichever is currently visible) rotates around its
// grip point — gear_overlays.js sets transform-origin to the item handle,
// so a `rotate` animation pivots exactly where the hand holds it. Uses the
// independent `rotate` CSS property (not `transform`) so the placement
// transform (scaleX mirror + base rotation from the grip lab) is untouched
// and the weapon settles back to its tuned pose when the animation ends
// (fill:none default). Never throws; no weapon visible → arc-only swing.
export function _egSwingEquippedWeapon(durationMs, heavy) {
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
export function _egMeleeImpactThump(targetId) {
    try {
        if (typeof document === 'undefined' || targetId == null) return;
        if (typeof window !== 'undefined' && window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const card = document.getElementById(`eg-card-${targetId}`);
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
export function _egShowWeaponSwing(family, facing) {
    const avatar = document.getElementById('player-avatar-wrapper');
    if (!avatar) return;
    const fam = EG_WEAPON_SWING_DURATION_MS[family] != null ? family : 'sword';
    const dir = (facing === 'up' || facing === 'down' || facing === 'left' || facing === 'right')
        ? facing : 'down';
    let heavy = false;
    try { heavy = _egGetEquippedWeaponInfo().hands === 2; } catch (e) {}
    _egSwingEquippedWeapon(EG_WEAPON_SWING_DURATION_MS[fam] || 320, heavy);

    const el = document.createElement('div');
    el.className = `eg-weapon-swing eg-swing-${fam} eg-dir-${dir}${heavy ? ' eg-heavy' : ''}`;
    el.innerHTML = '<div class="egw-rot"><div class="egw-part egw-arc"></div><div class="egw-part egw-blade"></div></div>';
    avatar.appendChild(el);
    const lifetime = (EG_WEAPON_SWING_DURATION_MS[fam] || 320) + 60;
    setTimeout(() => { try { el.remove(); } catch (e) {} }, lifetime);
}

// Big hop toward `facing` so the swing lands with weight. Uses WAAPI on the
    // wrapper (the old auto-attack lunge is gone - manual strikes hop only).
export function _egWeaponSwingHop(facing) {
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
export function _egWeaponSwingSound(family) {
    try {
        if (typeof Audio_Manager === 'undefined' || !Audio_Manager.playSFX) return;
        const sfx = family === 'wand' || family === 'staff' ? 'arcaneReveal'
            : family === 'mace' ? 'bump_thwack'
            : family === 'bow' ? 'precisionMark'
            : 'cleave';
        Audio_Manager.playSFX(sfx);
    } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------MANUAL ATTACK (E)-------------------------------------
//------------------------------------------------------------------------

// Manual weapon attack (Secret-of-Mana-style): directional CSS swing + hop,
// damage through the standard melee channel against the CURRENT target
// (same damage, cleave, accuracy and reflect rules as before). The strike
// deals charge% of full damage - 100% charge = 100% damage - and spends
// (resets) the charge bar, even on a miss. The swing ALWAYS plays: out of
// range it whiffs (no damage - see _egApplyPlayerMeleeImpact) but the
// charge is still spent. Without a target the swing still plays as a whiff
// but costs nothing, so retargeting never punishes.
export function _egDoWeaponAttack() {
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    if (typeof dead !== 'undefined' && globalThis.dead) return;
    if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;
    if (document.querySelector('.modal-bg.show')) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (now - _egWeaponSwingLastAt < EG_WEAPON_SWING_COOLDOWN_MS) return;
    _egWeaponSwingLastAt = now;

    // The strike is released - the hold (if any) is over either way.
    try { globalThis._egMeleeHoldActive = false; } catch (e) {}
    try { globalThis._egMeleeHoldKey = null; } catch (e) {}
    try { globalThis._egMeleeChargeLevel = 0; } catch (e) {}

    // Weapon gate: no melee weapon (or bow) equipped → no attack at all.
    // Previously this fell through to the 'unarmed' family and let a fresh
    // character (e.g. during the tutorial, before the Professor's sword
    // lesson) punch monsters with bare fists. The swing visual maps an
    // absent weapon to 'unarmed', so the lookup must be the item itself.
    if (!_egGetEquippedWeaponInfo().item) {
        if (now - _egMeleeNoWeaponToastAt > 1500) {
            _egMeleeNoWeaponToastAt = now;
            if (typeof showToast === 'function') globalThis.showToast('⚔️ ' + t('eg_melee_no_weapon'));
        }
        return;
    }

    // NOTE: no range gate here anymore - the swing always plays and range
    // is resolved at impact time (_egApplyPlayerMeleeImpact whiffs with no
    // damage when the avatar is too far from the target card).

    const { family } = _egGetEquippedWeaponInfo();
    const facing = _egGetAttackFacing();
    _egShowWeaponSwing(family, facing);
    _egWeaponSwingHop(facing);
    _egWeaponSwingSound(family);

    // Spend the charge at key-press time so the strike matches the bar the
    // player saw (charging during the swing flight doesn't inflate it).
    // No target selected → whiff visual only, charge is kept.
    const hasTarget = !(typeof _egTargetId === 'undefined' || !globalThis._egTargetId);
    if (hasTarget && typeof _egConsumePlayerCharge === 'function') {
        try { globalThis._egPendingMeleeChargePct = _egConsumePlayerCharge(); } catch (e) { globalThis._egPendingMeleeChargePct = 1; }
    } else {
        globalThis._egPendingMeleeChargePct = null;
    }
    if (typeof _egUpdatePlayerChargeBar === 'function') {
        try { _egUpdatePlayerChargeBar(); } catch (e) {}
    }

    // Damage at swing impact (matches the visual mid-point).
    setTimeout(() => {
        try {
            if (typeof _egIsActive === 'function' && !_egIsActive()) return;
            if (typeof dead !== 'undefined' && globalThis.dead) return;
            if (typeof _egTargetId === 'undefined' || !globalThis._egTargetId) return;
            if (typeof _egApplyPlayerMeleeImpact === 'function') _egApplyPlayerMeleeImpact(globalThis._egTargetId);
        } catch (e) {}
    }, Math.max(80, Math.round((EG_WEAPON_SWING_DURATION_MS[family] || 320) / 2)));
}

//-------------------HOLD-TO-CHARGE (Secret-of-Mana-style)-----------------
// Holding the attack key charges the strike through multiple levels (tap =
// weak poke, 100% = full hit, holding past full overcharges up to
// EG_MELEE_OVERCHARGE_RATIO for a super strike); RELEASING the key swings.
// The state lives as plain globalThis properties (not module bindings) so
// encounter-tick.js can read them without an import cycle back into this
// file (this file already imports from encounter-tick.js). Unset means
// "not holding" (falsy) - no top-level init needed, and the module-init
// timing guard forbids top-level globalThis reads in converted files.

// Normalizes a key event the same way the keybind system does (see
// _keybindNormalize in keybinds.js: single chars and named keys alike are
// lowercased) so press/release pairs match even for rebound keys.
function _egMeleeNormKey(e) {
    return (e && e.key ? String(e.key) : '').toLowerCase();
}

// PRESS: begin charging. The charge bar resets and fills only while the key
// is held (see _egTickPlayer) - this is what makes holding build the super
// attack instead of machine-gunning weak strikes via key repeat.
function _egMeleeBeginHold(e) {
    if (typeof _egIsActive === 'function' && !_egIsActive()) return false;
    if (typeof dead !== 'undefined' && globalThis.dead) return false;
    if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return false;
    if (typeof document !== 'undefined' && document.querySelector('.modal-bg.show')) return false;
    try {
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return false;
    } catch (err) {}
    if (globalThis._egMeleeHoldActive) return true;
    // No weapon equipped → no charge either (same gate as the strike).
    try {
        if (typeof _egGetEquippedWeaponInfo === 'function' && !_egGetEquippedWeaponInfo().item) return false;
    } catch (err) { return false; }
    try { globalThis._egPlayerCurrentCharge = 0; } catch (err) {}
    try { globalThis._egMeleeChargeLevel = 0; } catch (err) {}
    try { globalThis._egMeleeHoldKey = _egMeleeNormKey(e); } catch (err) {}
    globalThis._egMeleeHoldActive = true;
    if (typeof _egUpdatePlayerChargeBar === 'function') {
        try { _egUpdatePlayerChargeBar(); } catch (err) {}
    }
    return true;
}

// Cancels an in-progress hold WITHOUT striking (window blur, tab hidden -
// the matching keyup will never arrive, so the avatar must not charge
// forever). The unspent charge simply fizzles.
function _egMeleeCancelHold() {
    if (!globalThis._egMeleeHoldActive) return;
    globalThis._egMeleeHoldActive = false;
    try { globalThis._egMeleeHoldKey = null; } catch (e) {}
    try { globalThis._egMeleeChargeLevel = 0; } catch (e) {}
    if (typeof _egUpdatePlayerChargeBar === 'function') {
        try { _egUpdatePlayerChargeBar(); } catch (e) {}
    }
}

// RELEASE: strike with whatever charge was built while held.
function _egMeleeReleaseHold() {
    if (!globalThis._egMeleeHoldActive) return;
    _egDoWeaponAttack();
}

export function _initEgWeaponAttackHotkey() {
    // PRESS starts the charge. The central dispatcher matches the player's
    // (possibly rebound) eg-attack key; key repeat is ignored so holding
    // keeps charging instead of re-firing weak strikes.
    const pressHandler = (e) => {
        if (e && e.repeat) return false;
        _egMeleeBeginHold(e);
        return false;
    };
    if (typeof onKeybindAction === 'function') {
        globalThis.onKeybindAction('eg-attack', pressHandler);
    } else {
        // Fallback if the keybind system loads later/never: plain E key.
        document.addEventListener('keydown', (e) => {
            if (!e || e.repeat) return;
            if ((e.key || '').toLowerCase() !== 'e') return;
            _egMeleeBeginHold(e);
        });
    }
    // RELEASE strikes. The keyup is matched against the key that STARTED
    // the hold (recorded at press time), so rebound keys just work without
    // needing the keybind matcher here.
    document.addEventListener('keyup', (e) => {
        if (!globalThis._egMeleeHoldActive) return;
        try {
            if (globalThis._egMeleeHoldKey != null && _egMeleeNormKey(e) !== globalThis._egMeleeHoldKey) return;
        } catch (err) {}
        _egMeleeReleaseHold();
    });
    // Never get stuck charging when the page loses focus.
    window.addEventListener('blur', _egMeleeCancelHold);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) _egMeleeCancelHold();
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
