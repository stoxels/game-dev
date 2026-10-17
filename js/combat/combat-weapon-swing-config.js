import { _egGetElementCentre } from './combat-class-projectiles.js';
import { _egComputePlayerStats, _egGetAllEquippedItems } from '../endgame/endgame-player-stats.js';

//------------------------------------------------------------------------
//-------------------WEAPON CONFIGURATION AND RESOLUTION----------------
//------------------------------------------------------------------------

// Manual-attack input cooldown so E can't machine-gun the melee channel.
export const EG_WEAPON_SWING_COOLDOWN_MS = 400;

// Melee reach (spell pass 1: "swing, then look at what is around you"):
// a plain strike (<200%) connects with a monster whose card comes within
// this many px of the avatar's centre, measured to the card's NEAREST EDGE
// (not its centre, so a big card counts as soon as it is visibly touched).
// Per weapon family - a dagger is a short reach, a staff a long one. The
// old flat rule was 340px centre-to-centre, which is ~270px to the edge of
// a normal card, hence the sword/axe value.
export const EG_MELEE_REACH_PX = {
    sword: 270, dagger: 230, axe: 270, mace: 260,
    wand: 300, staff: 320, bow: 400, unarmed: 200,
};

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

// Current reach in px: the equipped weapon family's base reach plus
// Champion's Vigor (reworked node 20033) bonus meters. Guarded like the
// ailment channels - no stats, no bonus.
export function _egMeleeReachPx() {
    let family = 'unarmed';
    try { family = _egGetEquippedWeaponInfo().family || 'unarmed'; } catch (e) { family = 'unarmed'; }
    const base = EG_MELEE_REACH_PX[family] != null ? EG_MELEE_REACH_PX[family] : EG_MELEE_REACH_PX.sword;
    let bonusPx = 0;
    try {
        const ps = (typeof _egComputePlayerStats === 'function') ? _egComputePlayerStats() : {};
        bonusPx = (Number(ps.meleeRangeM) || 0) * EG_PX_PER_METER;
    } catch (e) { bonusPx = 0; }
    return base + bonusPx;
}

// Distance in px from the avatar's centre to the nearest edge of a monster's
// card (0 when the avatar stands on it). Null when either is not on screen
// (tests, teardown) - callers treat that as "cannot tell" and fail open.
function _egMeleeEdgeDistance(targetId) {
    try {
        const card = document.getElementById(`eg-card-${targetId}`);
        const avatar = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple');
        if (!card || !avatar) return null;
        const a = (typeof _egGetElementCentre === 'function')
            ? _egGetElementCentre(avatar)
            : avatar.getBoundingClientRect();
        const ax = (a.x != null) ? a.x : a.left, ay = (a.y != null) ? a.y : a.top;
        const r = card.getBoundingClientRect();
        if (r.width || r.height) {
            const nx = Math.max(r.left, Math.min(ax, r.right));
            const ny = Math.max(r.top, Math.min(ay, r.bottom));
            return Math.hypot(ax - nx, ay - ny);
        }
        // Hidden / unmeasured card: fall back to its centre point.
        const b = (typeof _egGetElementCentre === 'function')
            ? _egGetElementCentre(card) : null;
        if (!b) return null;
        const bx = (b.x != null) ? b.x : b.left, by = (b.y != null) ? b.y : b.top;
        return Math.hypot(ax - bx, ay - by);
    } catch (e) {
        return null;
    }
}

// True when the avatar stands close enough to the target to strike it.
// Missing DOM (tests, teardown) never blocks - fail open.
export function _egMeleeTargetInRange(targetId) {
    const d = _egMeleeEdgeDistance(targetId);
    if (d == null) return true;
    return d <= _egMeleeReachPx();
}

// "Look around": the monster a plain melee swing would actually hit. The
// SELECTED target when it is in reach, otherwise the nearest living monster
// in reach, otherwise null (a clean whiff - no target needed to swing).
// Without any DOM to measure against it simply returns the preferred id.
export function _egMeleeFindVictim(preferredId) {
    if (preferredId != null && _egMeleeEdgeDistance(preferredId) == null) {
        // Cannot measure the selection at all (no DOM): fail open like
        // _egMeleeTargetInRange so headless paths keep their old behaviour.
        return preferredId;
    }
    if (preferredId != null && _egMeleeTargetInRange(preferredId)) return preferredId;
    const reach = _egMeleeReachPx();
    let best = null;
    let bestD = Infinity;
    const list = Array.isArray(globalThis._egMonsters) ? globalThis._egMonsters : [];
    for (const m of list) {
        if (!m || !(m.currentHP > 0)) continue;
        const d = _egMeleeEdgeDistance(m.id);
        if (d == null || d > reach) continue;
        if (d < bestD) { best = m.id; bestD = d; }
    }
    return best;
}

// Live "who will my sword hit" marker. The yellow target border belongs to
// reveal shots and spells; when a melee swing would land on a DIFFERENT
// monster (the selected one is out of reach, another stands next to the
// hero) that monster's card gets .eg-card-melee-target. Called every combat
// tick; only touches the DOM when the marked card actually changes.
export function _egUpdateMeleeMarker() {
    let victim = null;
    try {
        const info = _egGetEquippedWeaponInfo();
        if (info.item && info.item.slotType === 'weapon') {
            const selected = globalThis._egTargetId || null;
            const v = _egMeleeFindVictim(selected);
            if (v != null && v !== selected) victim = v;
        }
    } catch (e) { victim = null; }
    const marked = document.querySelectorAll('.eg-card-melee-target');
    const wanted = victim != null ? document.getElementById(`eg-card-${victim}`) : null;
    if (marked.length === (wanted ? 1 : 0) && (!wanted || marked[0] === wanted)) return;
    marked.forEach(el => el.classList.remove('eg-card-melee-target'));
    if (wanted) wanted.classList.add('eg-card-melee-target');
}

// Which way the swing should face: toward the monster being struck (or the
// selected one, when nothing is in reach, so the whiff points at it), else
// the last walked direction.
export function _egMeleeAimFacing(targetId) {
    try {
        if (targetId != null) {
            const card = document.getElementById(`eg-card-${targetId}`);
            const avatar = document.getElementById('player-avatar-wrapper')
                || document.getElementById('player-avatar-simple');
            if (card && avatar && typeof _egGetElementCentre === 'function') {
                const a = _egGetElementCentre(avatar);
                const b = _egGetElementCentre(card);
                return _egFacingFromVector(b.x - a.x, b.y - a.y);
            }
        }
    } catch (e) { /* fall through to the walk facing */ }
    return _egGetAttackFacing();
}
