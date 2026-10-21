import { _getElementCentre } from './combat-class-projectiles.js';
import { _computePlayerStats, _getAllEquippedItems, _getDualHandWeapon } from './combat-player-stats.js';
import { _getLeadHand } from './encounter-tick.js';

//------------------------------------------------------------------------
//-------------------WEAPON CONFIGURATION AND RESOLUTION----------------
//------------------------------------------------------------------------

// Manual-attack input cooldown so E can't machine-gun the melee channel.
export const WEAPON_SWING_COOLDOWN_MS = 400;

// Melee reach (spell pass 1: "swing, then look at what is around you"):
// a plain strike (<200%) connects with a monster whose card comes within
// this many px of the avatar's centre, measured to the card's NEAREST EDGE
// (not its centre, so a big card counts as soon as it is visibly touched).
// Per weapon family - a dagger is a short reach, a staff a long one. The
// old flat rule was 340px centre-to-centre, which is ~270px to the edge of
// a normal card, hence the sword/axe value.
const MELEE_REACH_PX = {
    sword: 270, dagger: 230, axe: 270, mace: 260,
    wand: 300, staff: 320, bow: 400, unarmed: 200,
};

// Screen scale for melee range in meters (reworked node 20033 Champion's
// Vigor grants +1): the base 340px reach is ~3.4m, so one meter reads as a
// visible but sane step outward - roughly one extra card spacing.
export const PX_PER_METER = 100;

// Per-family visual lifetime (ms) - must cover the longest CSS keyframe
// in weapon-swing.css so the node is removed after the effect finishes.
export const WEAPON_SWING_DURATION_MS = {
    sword: 320, dagger: 260, axe: 400, mace: 420,
    wand: 360, staff: 480, bow: 340, unarmed: 280,
};

// Maps an equipped weapon item to one of the CSS families.
function _weaponSwingFamily(item) {
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
export function _isMaceOrSceptre(item) {
    if (!item) return false;
    if (_weaponSwingFamily(item) === 'mace') return true;
    const name = `${item.baseName || ''} ${item.name || ''}`.toLowerCase();
    return /sceptre|scepter|zepter/.test(name);
}

// Returns { item, family, hands, label } for the currently equipped melee
// weapon (weapon slot). Falls back to the ranged bow, then unarmed.
export function _getEquippedWeaponInfo() {
    let item = null;
    try {
        if (typeof _getAllEquippedItems === 'function') {
            const all = _getAllEquippedItems() || [];
            item = all.find((it) => it && it.slotType === 'weapon')
                || all.find((it) => it && it.slotType === 'ranged')
                || null;
        }
    } catch (e) { item = null; }
    const family = _weaponSwingFamily(item);
    const hands = (item && item.hands === 2) ? 2 : 1;
    const label = item ? (item.baseName || item.name || '') : '';
    return { item, family, hands, label };
}

// Weapon family of the blow that is swinging NOW. Dual-wielding strikes with
// one hand at a time, so the swing visual and sound must follow that hand's
// weapon (not always the first equipped one). `consumed` = the strike already
// spent a charge bar and stamped _strikeHand; otherwise (a whiff, which
// spends nothing) the hand that would strike is the fuller bar.
export function _getStrikeWeaponFamily(consumed) {
    try {
        const hand = consumed ? (globalThis._strikeHand === 2 ? 2 : 1) : _getLeadHand();
        const w = _getDualHandWeapon(hand);
        if (w) return _weaponSwingFamily(w);
    } catch (e) { /* fall back to the single-weapon lookup */ }
    return _getEquippedWeaponInfo().family;
}

// True for a weapon whose strike is a bolt: wands (incl. unique wands) - never
// sceptres, which swing as maces.
export function _weaponShoots(item) {
    return !!item && _weaponSwingFamily(item) === 'wand' && !_isMaceOrSceptre(item);
}

// What the striking hand does: 'wand' (bolt only), 'staff' (swing + bolt) or
// null (plain melee). While dual-wielding it follows that hand's weapon, so a
// wand + sword pair alternates bolts and blade blows with its two charge bars.
export function _strikeShootKind(consumed) {
    try {
        const hand = consumed ? (globalThis._strikeHand === 2 ? 2 : 1) : _getLeadHand();
        const w = _getDualHandWeapon(hand) || _getEquippedWeaponInfo().item;
        if (!w) return null;
        if (_weaponSwingFamily(w) === 'staff') return 'staff';
        return _weaponShoots(w) ? 'wand' : null;
    } catch (e) { return null; }
}

// Spell school of the weapon that is striking NOW ('fire' | 'cold' | 'lightning'
// | 'shadow'), or null for a weapon with no school (its bolt is plain physical).
export function _getStrikeWeaponSchool(consumed) {
    try {
        const hand = consumed ? (globalThis._strikeHand === 2 ? 2 : 1) : _getLeadHand();
        const w = _getDualHandWeapon(hand) || _getEquippedWeaponInfo().item;
        return (w && w.school) || null;
    } catch (e) { return null; }
}

// Wands and staves fire a bolt on every strike, so they need no one in melee
// reach: the shot goes to the selected monster, else the nearest living one.
export function _shotVictim(selectedId) {
    const list = (Array.isArray(globalThis._monsters) ? globalThis._monsters : []).filter(m => m && m.currentHP > 0);
    if (!list.length) return null;
    if (selectedId != null && list.some(m => m.id === selectedId)) return selectedId;
    let best = list[0].id;
    let bestD = Infinity;
    for (const m of list) {
        const d = _meleeEdgeDistance(m.id);
        if (d != null && d < bestD) { best = m.id; bestD = d; }
    }
    return best;
}

// The direction the avatar is currently facing. Movement writes it to the
// walk loop; idle keeps the last travel direction, with a down fallback.
export function _getAttackFacing() {
    const ok = (d) => d === 'up' || d === 'down' || d === 'left' || d === 'right';
    try { if (typeof _lastFacingDir === 'string' && ok(globalThis._lastFacingDir)) return globalThis._lastFacingDir; } catch (e) {}
    try { if (typeof _walkState !== 'undefined' && globalThis._walkState && ok(globalThis._walkState.dirName)) return globalThis._walkState.dirName; } catch (e) {}
    return 'down';
}

// Facing implied by a screen-space vector.
export function _facingFromVector(dx, dy) {
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'down' : 'up';
}

// A selected monster keeps the swing if it is within this many px of the nearest one.
const MELEE_TIE_PX = 12;

// Current reach in px: the equipped weapon family's base reach plus
// Champion's Vigor (reworked node 20033) bonus meters. Guarded like the
// ailment channels - no stats, no bonus.
function _meleeReachPx() {
    let family = 'unarmed';
    try { family = _getEquippedWeaponInfo().family || 'unarmed'; } catch (e) { family = 'unarmed'; }
    const base = MELEE_REACH_PX[family] != null ? MELEE_REACH_PX[family] : MELEE_REACH_PX.sword;
    let bonusPx = 0;
    try {
        const ps = (typeof _computePlayerStats === 'function') ? _computePlayerStats() : {};
        bonusPx = (Number(ps.meleeRangeM) || 0) * PX_PER_METER;
    } catch (e) { bonusPx = 0; }
    return base + bonusPx;
}

// Distance in px from the avatar's centre to the nearest edge of a monster's
// card (0 when the avatar stands on it). Null when either is not on screen
// (tests, teardown) - callers treat that as "cannot tell" and fail open.
function _meleeEdgeDistance(targetId) {
    try {
        const card = document.getElementById(`sx-card-${targetId}`);
        const avatar = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple');
        if (!card || !avatar) return null;
        const a = (typeof _getElementCentre === 'function')
            ? _getElementCentre(avatar)
            : avatar.getBoundingClientRect();
        const ax = (a.x != null) ? a.x : a.left, ay = (a.y != null) ? a.y : a.top;
        const r = card.getBoundingClientRect();
        if (r.width || r.height) {
            const nx = Math.max(r.left, Math.min(ax, r.right));
            const ny = Math.max(r.top, Math.min(ay, r.bottom));
            return Math.hypot(ax - nx, ay - ny);
        }
        // Hidden / unmeasured card: fall back to its centre point.
        const b = (typeof _getElementCentre === 'function')
            ? _getElementCentre(card) : null;
        if (!b) return null;
        const bx = (b.x != null) ? b.x : b.left, by = (b.y != null) ? b.y : b.top;
        return Math.hypot(ax - bx, ay - by);
    } catch (e) {
        return null;
    }
}

// True when the avatar stands close enough to the target to strike it.
// Missing DOM (tests, teardown) never blocks - fail open.
export function _meleeTargetInRange(targetId) {
    const d = _meleeEdgeDistance(targetId);
    if (d == null) return true;
    return d <= _meleeReachPx();
}

// "Look around": the monster a plain melee swing would actually hit. The
// SELECTED target when it is in reach, otherwise the nearest living monster
// in reach, otherwise null (a clean whiff - no target needed to swing).
// Without any DOM to measure against it simply returns the preferred id.
export function _meleeFindVictim(preferredId) {
    if (preferredId != null && _meleeEdgeDistance(preferredId) == null) {
        // Cannot measure the selection at all (no DOM): fail open like
        // _meleeTargetInRange so headless paths keep their old behaviour.
        return preferredId;
    }
    // The nearest living monster in reach wins; the selected one only keeps
    // the swing when it is about as close (within MELEE_TIE_PX) as the nearest.
    const reach = _meleeReachPx();
    let best = null;
    let bestD = Infinity;
    let prefD = Infinity;
    const list = Array.isArray(globalThis._monsters) ? globalThis._monsters : [];
    for (const m of list) {
        if (!m || !(m.currentHP > 0)) continue;
        const d = _meleeEdgeDistance(m.id);
        if (d == null || d > reach) continue;
        if (m.id === preferredId) prefD = d;
        if (d < bestD) { best = m.id; bestD = d; }
    }
    if (preferredId != null && prefD <= bestD + MELEE_TIE_PX) return preferredId;
    return best;
}

// Live "who will my sword hit" marker. The yellow target border belongs to
// reveal shots and spells; when a melee swing would land on a DIFFERENT
// monster (the selected one is out of reach, another stands next to the
// hero) that monster's card gets .sx-card-melee-target. Called every combat
// tick; only touches the DOM when the marked card actually changes.
export function _updateMeleeMarker() {
    let victim = null;
    try {
        const info = _getEquippedWeaponInfo();
        if (info.item && info.item.slotType === 'weapon' && _strikeShootKind(false) !== 'wand') {
            const selected = globalThis._targetId || null;
            const v = _meleeFindVictim(selected);
            if (v != null && v !== selected) victim = v;
        }
    } catch (e) { victim = null; }
    const marked = document.querySelectorAll('.sx-card-melee-target');
    const wanted = victim != null ? document.getElementById(`sx-card-${victim}`) : null;
    if (marked.length === (wanted ? 1 : 0) && (!wanted || marked[0] === wanted)) return;
    marked.forEach(el => el.classList.remove('sx-card-melee-target'));
    if (wanted) wanted.classList.add('sx-card-melee-target');
}

// Which way the swing should face: toward the monster being struck (or the
// selected one, when nothing is in reach, so the whiff points at it), else
// the last walked direction.
export function _meleeAimFacing(targetId) {
    try {
        if (targetId != null) {
            const card = document.getElementById(`sx-card-${targetId}`);
            const avatar = document.getElementById('player-avatar-wrapper')
                || document.getElementById('player-avatar-simple');
            if (card && avatar && typeof _getElementCentre === 'function') {
                const a = _getElementCentre(avatar);
                const b = _getElementCentre(card);
                return _facingFromVector(b.x - a.x, b.y - a.y);
            }
        }
    } catch (e) { /* fall through to the walk facing */ }
    return _getAttackFacing();
}
