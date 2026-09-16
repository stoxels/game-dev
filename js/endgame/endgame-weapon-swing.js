//------------------------------------------------------------------------
// PHASE 3 (endgame step): converted to a real ES module. Do not add new
// bare cross-file references - import explicitly or use globalThis.X for
// names still living in the concatenated body. See MIGRATION.md.
//------------------------------------------------------------------------
import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _egGetElementCentre } from './endgame-class-projectiles.js';
import { _egConsumePlayerCharge, _egUpdatePlayerChargeBar } from './endgame-encounter-tick.js';
import { _egApplyPlayerMeleeImpact } from './endgame-encounter.js';
import { _egGetAllEquippedItems } from './endgame-player-stats.js';
import { _egIsActive } from './endgame-state.js';

//  endgame-weapon-swing.js
//  MANUAL WEAPON ATTACK (E) + shared CSS swing visuals.
//  Loads AFTER endgame-encounter.js, endgame-encounter-tick.js,
//  endgame-player-stats.js and sprite_animations.js (all globals are
//  typeof-guarded so load order is forgiving; behaviour only runs live).
//
//  WHY THIS EXISTS: the game has dozens of weapon base types (daggers,
//  swords, axes, maces, wands, staves, bows …) across three characters
//  and many classes. Animating every weapon for every character/class
//  combo would be an enormous art burden, so attacks are a single
//  character-agnostic CSS overlay anchored to the player avatar
//  (css/endgame/weapon-swing.css). The overlay is skinned per weapon
//  FAMILY - not per base item - and rotated toward the facing direction.
//
//  CONTROLS: E = manual attack (this file), parry (hold) lives on the
//  'eg-parry' keybind (R by default) in endgame-encounter-tick.js.
//------------------------------------------------------------------------
//-------------------WEAPON FAMILY RESOLUTION------------------------------
//------------------------------------------------------------------------

// Manual-attack input cooldown so E can't machine-gun the melee channel.
export const EG_WEAPON_SWING_COOLDOWN_MS = 400;
export let _egWeaponSwingLastAt = 0;

// Melee reach: the avatar's screen centre must be within this many px of the
// target card's centre for a strike to land. The avatar roams freely, so the
// player must walk up to the monster first - no cross-screen hits.
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

// Spawns the family-skinned CSS overlay on the avatar, rotated toward
// `facing`. Character-agnostic: no sprite art is touched, so every
// character/class combo shares the same effect. No-op without an avatar.
export function _egShowWeaponSwing(family, facing) {
    const avatar = document.getElementById('player-avatar-wrapper');
    if (!avatar) return;
    const fam = EG_WEAPON_SWING_DURATION_MS[family] != null ? family : 'sword';
    const dir = (facing === 'up' || facing === 'down' || facing === 'left' || facing === 'right')
        ? facing : 'down';
    let heavy = false;
    try { heavy = _egGetEquippedWeaponInfo().hands === 2; } catch (e) {}

    const el = document.createElement('div');
    el.className = `eg-weapon-swing eg-swing-${fam} eg-dir-${dir}${heavy ? ' eg-heavy' : ''}`;
    el.innerHTML = '<div class="egw-rot"><div class="egw-part egw-arc"></div><div class="egw-part egw-blade"></div></div>';
    avatar.appendChild(el);
    const lifetime = (EG_WEAPON_SWING_DURATION_MS[fam] || 320) + 60;
    setTimeout(() => { try { el.remove(); } catch (e) {} }, lifetime);
}

// Small hop toward `facing` so the swing has weight. Uses WAAPI on the
    // wrapper (the old auto-attack lunge is gone - manual strikes hop only).
export function _egWeaponSwingHop(facing) {
    const avatar = document.getElementById('player-avatar-wrapper');
    if (!avatar || typeof avatar.animate !== 'function') return;
    const d = 14;
    const vec = facing === 'up' ? [0, -d] : facing === 'down' ? [0, d]
        : facing === 'left' ? [-d, 0] : [d, 0];
    try {
        avatar.animate([
            { transform: 'translate(0px, 0px)' },
            { transform: `translate(${vec[0]}px, ${vec[1]}px)` },
            { transform: 'translate(0px, 0px)' },
        ], { duration: 180, easing: 'ease-out' });
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
// (resets) the charge bar, even on a miss. Without a target the swing
// still plays as a whiff but costs nothing, so retargeting never punishes.
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

    // Range gate: too far away → no swing, no charge spent. The toast is
    // throttled so holding E doesn't spam it.
    const hasTargetEarly = !(typeof _egTargetId === 'undefined' || !globalThis._egTargetId);
    if (hasTargetEarly && !_egMeleeTargetInRange(globalThis._egTargetId)) {
        if (now - _egMeleeRangeToastAt > 1500) {
            _egMeleeRangeToastAt = now;
            if (typeof showToast === 'function') globalThis.showToast('⚔️ ' + t('eg_melee_too_far'));
        }
        return;
    }

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

export function _initEgWeaponAttackHotkey() {
    if (typeof onKeybindAction === 'function') {
        globalThis.onKeybindAction('eg-attack', () => {
            _egDoWeaponAttack();
            return false;
        });
    } else {
        // Fallback if the keybind system loads later/never: plain E key.
        document.addEventListener('keydown', (e) => {
            if (!e || e.repeat) return;
            if ((e.key || '').toLowerCase() !== 'e') return;
            _egDoWeaponAttack();
        });
    }
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
