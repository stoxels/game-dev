import { _egGetElementCentre } from './combat-class-projectiles.js';
import { _egComputePlayerStats, _egGetAllEquippedItems } from '../endgame/endgame-player-stats.js';

//------------------------------------------------------------------------
//-------------------WEAPON CONFIGURATION AND RESOLUTION----------------
//------------------------------------------------------------------------

// Manual-attack input cooldown so E can't machine-gun the melee channel.
export const EG_WEAPON_SWING_COOLDOWN_MS = 400;

// Melee reach: the avatar's screen centre must be within this many px of
// the target card's centre for a PLAIN strike (<200%) to connect.
const EG_MELEE_RANGE_PX = 340;

// Screen scale for melee range in meters (reworked node 20033 Champion's
// Vigor grants +1): the base 340px reach is ~3.4m, so one meter reads as a
// visible but sane step outward - roughly one extra card spacing.
export const EG_PX_PER_METER = 100;

// Per-family visual lifetime (ms) - must cover the longest CSS keyframe
// in weapon-swing.css so the node is removed after the effect finishes.
export const EG_WEAPON_SWING_DURATION_MS = {
    sword: 320, dagger: 260, axe: 400, mace: 420,
    wand: 360, staff: 480, bow: 340, unarmed: 280,
};

// Maps an equipped weapon item to one of the CSS families.
function _egWeaponSwingFamily(item) {
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

// Mace-like weapons for the passive tree's "Maces or Sceptres" lines:
// maces / mauls / hammers (the 'mace' family) plus sceptres, which the
// swing visuals file under 'wand' but which are melee-capable one-handers.
export function _egIsMaceOrSceptre(item) {
    if (!item) return false;
    if (_egWeaponSwingFamily(item) === 'mace') return true;
    const name = `${item.baseName || ''} ${item.name || ''}`.toLowerCase();
    return /sceptre|scepter|zepter/.test(name);
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

// The direction the avatar is currently facing. Movement writes it to the
// walk loop; idle keeps the last travel direction, with a down fallback.
export function _egGetAttackFacing() {
    const ok = (d) => d === 'up' || d === 'down' || d === 'left' || d === 'right';
    try { if (typeof _lastFacingDir === 'string' && ok(globalThis._lastFacingDir)) return globalThis._lastFacingDir; } catch (e) {}
    try { if (typeof _walkState !== 'undefined' && globalThis._walkState && ok(globalThis._walkState.dirName)) return globalThis._walkState.dirName; } catch (e) {}
    return 'down';
}

// Facing implied by a screen-space vector.
export function _egFacingFromVector(dx, dy) {
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'down' : 'up';
}

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
        // Champion's Vigor (reworked node 20033): bonus meters stretch the
        // reach. Guarded like the ailment channels - no stats, no bonus.
        let bonusPx = 0;
        try {
            const ps = (typeof _egComputePlayerStats === 'function') ? _egComputePlayerStats() : {};
            bonusPx = (Number(ps.meleeRangeM) || 0) * EG_PX_PER_METER;
        } catch (e) { bonusPx = 0; }
        return Math.hypot(ax - bx, ay - by) <= EG_MELEE_RANGE_PX + bonusPx;
    } catch (e) {
        return true;
    }
}
