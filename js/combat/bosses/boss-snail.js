import { Audio_Manager } from '../../audio/audio.js';
import { t } from '../../translation/translations.js';
import { _renderPanel } from '../encounter.js';
import { _hzGridRect } from '../combat-hazards.js';
import { _bossCorrupted, _isActive } from '../combat-state.js';
import { BOSS_DEFS, BOSS_MECHANICS, _bossScheduleMechanics } from './boss-framework.js';
import { _teleportAvatarTo } from './boss-wormhole.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkDotHit, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkNudgeAvatar, _nkPlayerCenter, _nkPlayerRect, _nkRectsOverlap, _nkToast, _removeCellCorruption } from './shared-boss-abilities.js';
import { cur } from '../../state.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE SNAIL (boss_snail)-------------------------------
//------------------------------------------------------------------------
// First-steps boss: one VERY slow homing snail. Lure it into a corrupted
// cell to banish it; sweep slimed cells with the broom. At ≤20% HP the
// SNAILGEDDON ring closes in - escape through the slow wedge. Shared
// moves are referenced by handler-name string (shared-boss-abilities.js).
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_snail: {
        id: 'boss_snail', name: 'The Snail', emoji: '🐌',
        baseHP: 900, baseDamage: 19, chargeMax: 14,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_snail: {
        phases: [
            { threshold: 1.00, chargeMax: 14, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.30 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.70 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'doom_snail', intervalBase: 8000, intervalVariance: 2000, handler: '_mechDoomSnail' },
            { name: 'corrupt_cells', intervalBase: 20000, intervalVariance: 5000, handler: '_mechCorruptCells' },
        ],
    },
});


// ── The Snail's unique mechanics ────────────────────────────────────────────
// One doom snail at a time; SNAIL_BROOM_COUNT brooms rest outside the
// grid; slimed cells persist until swept clean. All module state is torn
// down by _snailTeardown (registered in _bossCleanup, see
// boss-framework.js).

export let _snailDoom = null;        // active Doom Snail { run, el, x, y, ... } or null
export let _snailSlimed = new Map(); // "r-c" → { el, fill, r, c } - cells blocked until swept
export let _snailBroooms = [];       // resting/held brooms: { el, homeX, homeY, held, sweepAcc, sweepKey, sweepFill, chargePauseShown }
export let _snailBroomTickTimer = null;
export let _snailNextDoomAt = null;      // wall-clock gate: no doom snail right after a banish

// Movement-speed multiplier while holding the broom - read by the avatar
// mover in player_sprite.js (window channel keeps one source of truth).
// 0.15 ≈ 48 px/s: still a crawl (sweeping forces you to stand still for
// the full SNAIL_SWEEP_MS, so the snail catches you), but you can
// reposition between slimed cells without it feeling like molasses.
window.SNAIL_BROOM_SPEED_MULT = 0.15;

// Knobs (tier-1 friendly - The Snail is a first-steps boss).
export const SNAIL_SLIME_CHANCE = 0.30;     // chance to slime the cell under the snail per new cell
export const SNAIL_SLIME_COOLDOWN_MS = 800; // min gap between slimes
export const SNAIL_SLIME_PER_SNAIL = 7;     // max slimes one doom snail drops before being banished
export const SNAIL_SLIME_MAX_TOTAL = 12;    // hard cap of slimed cells on the grid at once
export const SNAIL_SWEEP_MS = 5000;         // standing time on a slimed cell with the broom to clean it
export const SNAIL_BROOM_TICK_MS = 100;     // pickup + sweep driver resolution
export const SNAIL_BROOM_COUNT = 3;         // resting brooms placed around the grid
export const SNAIL_BROOM_MARGIN = 34;       // min gap between a resting broom and the grid/viewport edge
export const SNAIL_DOOM_BANISH_COOLDOWN_MS = 45000; // after a corruption banish, the next doom snail waits 45 s


// True while the Doom Snail's broom is held. Hooked from the avatar mover
// (movement slow) and _tickPlayer (charge freeze).
// The broom the player currently holds, if any.
export function _snailHeldBroom() {
    return (typeof _snailBroooms !== 'undefined' && _snailBroooms.length)
        ? _snailBroooms.find(b => b && b.held) || null
        : null;
}


export function _snailBroomHeld() {
    return !!_snailHeldBroom();
}


// True while the player is sweeping a slimed cell with the broom.
export function _snailSweeping() {
    const b = _snailHeldBroom();
    return !!(b && b.sweepKey);
}


// Public check for the cell-click intercept (mouse-button-handlers.js):
// is this cell slimed and therefore untouchable until swept clean?
export function _snailIsCellSlimed(row, col) {
    return !!(typeof _snailSlimed !== 'undefined' && _snailSlimed.has(row + '-' + col));
}


// Grid cell under a screen point, via the corner play-cells' rects (the
// play area is uniform, so row/col falls out of the geometry).
export function _snailCellFromPoint(x, y) {
    if (typeof cur === 'undefined' || !cur || !cur.grid) return null;
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    if (!rows || !cols) return null;
    const a = document.getElementById('g-0-0');
    const b = document.getElementById('g-' + (rows - 1) + '-' + (cols - 1));
    if (!a || !b || !a.isConnected || !b.isConnected) return null;
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    if (!ra.width || !ra.height || !rb.width || !rb.height) return null;
    const cw = (rb.right - ra.left) / cols;
    const ch = (rb.bottom - ra.top) / rows;
    const c = Math.floor((x - ra.left) / cw);
    const r = Math.floor((y - ra.top) / ch);
    if (r < 0 || c < 0 || r >= rows || c >= cols) return null;
    return { r, c };
}


// Puts the slime goo overlay on a cell. Never targets cells that are
// already slimed or corrupted (corrupted cells must stay findable so the
// snail can still crash into one).
export function _snailSlimeCell(r, c) {
    const key = r + '-' + c;
    if (_snailSlimed.has(key)) return;
    if (typeof _bossCorrupted !== 'undefined' && _bossCorrupted.has(key)) return;
    const cell = document.getElementById('g-' + r + '-' + c);
    if (!cell || !cell.isConnected) return;
    const ov = document.createElement('span');
    ov.className = 'sx-snail-slime';
    ov.id = 'sx-snail-slime-' + r + '-' + c;
    ov.textContent = '🫧';
    const fill = document.createElement('i');
    fill.className = 'sx-snail-slime-fill';
    ov.appendChild(fill);
    cell.appendChild(ov);
    _snailSlimed.set(key, { el: ov, fill, r, c });
    Audio_Manager.playSFX('boss_snail_slime');
}


// Removes the slime overlay from a cell (after cleaning).
export function _snailRemoveSlime(r, c) {
    const key = r + '-' + c;
    const entry = _snailSlimed.get(key);
    if (!entry) return;
    try { entry.el.remove(); } catch (e) {}
    _snailSlimed.delete(key);
}


// Rolls a slime drop when the snail's center enters a NEW grid cell.
// Not every cell gets slimed - a per-cast chance with a cooldown + cap.
export function _snailTrySlime(state, now) {
    if (now < state.slimeCdUntil) return;
    if (state.slimeDropped >= SNAIL_SLIME_PER_SNAIL) return;
    if (_snailSlimed.size >= SNAIL_SLIME_MAX_TOTAL) return;
    const cell = _snailCellFromPoint(state.x, state.y);
    if (!cell) return;
    const key = cell.r + '-' + cell.c;
    if (key === state.lastCellKey) return; // only roll when crossing into a new cell
    state.lastCellKey = key;
    if (Math.random() >= SNAIL_SLIME_CHANCE) return;
    _snailSlimeCell(cell.r, cell.c);
    state.slimeDropped++;
    state.slimeCdUntil = now + SNAIL_SLIME_COOLDOWN_MS;
}


// The ONLY way to banish the Doom Snail: crash it into a corrupted cell.
// Consumes that corruption and pops the snail with a small squish burst.
export function _snailCrashIntoCorruption(state) {
    if (typeof _bossCorrupted === 'undefined' || !_bossCorrupted || _bossCorrupted.size === 0) return false;
    const sr = state.el.getBoundingClientRect();
    if (!sr.width || !sr.height) return false;
    let hit = null;
    _bossCorrupted.forEach((data, key) => {
        if (hit) return;
        const cell = document.getElementById('g-' + key);
        if (!cell || !cell.isConnected) return;
        const cr = cell.getBoundingClientRect();
        if (!cr.width || !cr.height) return;
        if (_nkRectsOverlap(
            { left: sr.left - 2, right: sr.right + 2, top: sr.top - 2, bottom: sr.bottom + 2 },
            { left: cr.left, right: cr.right, top: cr.top, bottom: cr.bottom }
        )) hit = key;
    });
    if (!hit) return false;

    _snailDoom = null;
    // Luring the snail into corruption buys breathing room: no replacement
    // doom snail for the next 45 s (see SNAIL_DOOM_BANISH_COOLDOWN_MS).
    _snailNextDoomAt = Date.now() + SNAIL_DOOM_BANISH_COOLDOWN_MS;
    if (typeof _removeCellCorruption === 'function') _removeCellCorruption(hit);

    // Squish + splash at the snail's position (transient, not run-owned).
    const squish = document.createElement('div');
    squish.className = 'sx-snail-squish';
    squish.textContent = '🐌💦';
    squish.style.left = Math.round(state.x) + 'px';
    squish.style.top = Math.round(state.y) + 'px';
    document.body.appendChild(squish);
    setTimeout(() => { try { squish.remove(); } catch (e) {} }, 800);

    _nkToast('eg_snail_banished',
        '💥 The Doom Snail smashes into the corruption and is destroyed!', '#f59e0b');
    return true;
}


// Resting broom box footprint (icon + label) used when placing homes.
export const SNAIL_BROOM_BOX_W = 150;
export const SNAIL_BROOM_BOX_H = 70;


// Picks `count` home spots for the resting brooms, all OUTSIDE the current
// puzzle grid. The layout is deterministic and side-locked so brooms never
// clump: with the usual 3 the homes are one LEFT of the grid (vertically
// centred), one RIGHT of the grid, and one on TOP, centred above it. Homes
// that cannot physically fit (tiny viewport / huge grid) fall back along
// the bottom edge, then to viewport corners. Every spot keeps the full
// broom box clear of the (padded) grid so a grid rebuild never leaves a
// broom sitting on top of the puzzle, and the fallbacks keep one box-width
// of gap so no two brooms ever share a spot.
export function _snailBroomHomes(count) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const m = SNAIL_BROOM_MARGIN;
    let grid = null;
    if (typeof _hzGridRect === 'function') {
        try {
            const g = _hzGridRect(0);
            if (g && g.width && g.height) grid = g;
        } catch (e) {}
    }
    const out = [];
    const fits = (x, y) => x >= m && y >= m
        && x + SNAIL_BROOM_BOX_W <= vw - m
        && y + SNAIL_BROOM_BOX_H <= vh - m;
    const clearOfGrid = (x, y) => {
        if (!grid) return true;
        return x + SNAIL_BROOM_BOX_W < grid.left - 4 || x > grid.right + 4
            || y + SNAIL_BROOM_BOX_H < grid.top - 4 || y > grid.bottom + 4;
    };
    const add = (x, y) => {
        if (out.length >= count) return;
        const xr = Math.round(x), yr = Math.round(y);
        if (!fits(xr, yr) || !clearOfGrid(xr, yr)) return;
        // Never hand two brooms the same resting spot.
        if (out.some(h => h.x === xr && h.y === yr)) return;
        out.push({ x: xr, y: yr });
    };
    if (grid) {
        const cy = (grid.top + grid.bottom) / 2;
        const cx = (grid.left + grid.right) / 2;
        // 1. left of the grid, vertically centred
        add(grid.left - m - SNAIL_BROOM_BOX_W, cy - SNAIL_BROOM_BOX_H / 2);
        // 2. right of the grid, vertically centred
        add(grid.right + m, cy - SNAIL_BROOM_BOX_H / 2);
        // 3. top, centred above the grid
        add(cx - SNAIL_BROOM_BOX_W / 2, grid.top - m - SNAIL_BROOM_BOX_H);
        // Only extra brooms (or missing sides on cramped layouts) spill
        // along the bottom edge.
        add(grid.left + grid.width * 0.2, grid.bottom + m);
        add(grid.left + grid.width * 0.8, grid.bottom + m);
    }
    const corners = [
        [vw - SNAIL_BROOM_BOX_W - m, m],
        [m, vh - SNAIL_BROOM_BOX_H - m],
        [vw - SNAIL_BROOM_BOX_W - m, vh - SNAIL_BROOM_BOX_H - m],
        [m, m],
    ];
    corners.forEach(([x, y]) => add(x, y));
    // Absolute last resort: never return fewer than `count` homes - a spot
    // that grazes a corner beats a missing broom entirely. Steps keep a
    // full box between neighbours so the safety brooms never overlap.
    const sx = SNAIL_BROOM_BOX_W + 10, sy = SNAIL_BROOM_BOX_H + 10;
    let fx = vw - SNAIL_BROOM_BOX_W - m, fy = vh - SNAIL_BROOM_BOX_H - m;
    while (out.length < count) {
        out.push({
            x: Math.max(m, Math.min(vw - SNAIL_BROOM_BOX_W - m, fx)),
            y: Math.max(m, Math.min(vh - SNAIL_BROOM_BOX_H - m, fy)),
        });
        fx -= sx;
        fy -= sy;
    }
    return out;
}


// True when a RESTING broom's painted box touches the puzzle grid.
export function _snailRestingBroomOverlapsGrid(b) {
    if (b.held) return false;
    const r = b.el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    let grid = null;
    if (typeof _hzGridRect === 'function') {
        try {
            const g = _hzGridRect(0);
            if (g && g.width && g.height) grid = g;
        } catch (e) {}
    }
    if (!grid) return false;
    return r.left < grid.right + 4 && r.right > grid.left - 4
        && r.top < grid.bottom + 4 && r.bottom > grid.top - 4;
}


// Recomputes every broom's home around the CURRENT grid and - for resting
// brooms - moves it there. Held brooms just remember the fresh spot so the
// next drop lands outside the puzzle. Used on puzzle transitions and as a
// tick-level safety net whenever a resting broom overlaps the grid.
export function _snailRehomeBroooms() {
    const homes = _snailBroomHomes(_snailBroooms.length || SNAIL_BROOM_COUNT);
    _snailBroooms.forEach((b, i) => {
        const home = homes[i];
        if (!home) return;
        b.homeX = home.x;
        b.homeY = home.y;
        if (!b.held) {
            b.el.style.left = home.x + 'px';
            b.el.style.top = home.y + 'px';
        }
    });
}


// Creates the brooms (once - SNAIL_BROOM_COUNT of them, spread around
// the outside of the grid) and starts the shared pickup/sweep driver.
// Called by the first Doom Snail cast. Several brooms mean the player can
// grab one from whichever side is convenient, and a dropped broom is never
// the only one on the field.
export function _snailEnsureBroom() {
    if (_snailBroooms.length > 0) return;
    const homes = _snailBroomHomes(SNAIL_BROOM_COUNT);
    const rawLabel = (() => {
        try {
            const r = t('eg_snail_broom');
            return (r && r !== 'eg_snail_broom') ? r : 'Broom';
        } catch (e) { return 'Broom'; }
    })();
    homes.forEach((home, i) => {
        const el = document.createElement('div');
        el.className = 'sx-snail-broom';
        el.id = 'sx-snail-broom-' + i;
        el.innerHTML = '<span class="sx-snail-broom-ico">🧹</span><span class="sx-snail-broom-label">🧹 ' + rawLabel + '</span>';
        el.style.left = Math.round(home.x) + 'px';
        el.style.top = Math.round(home.y) + 'px';
        document.body.appendChild(el);
        _snailBroooms.push({
            el,
            homeX: home.x, homeY: home.y,
            held: false,
            heldHost: null,
            sweepAcc: 0,
            sweepKey: null,
            sweepFill: null,
            chargePauseShown: false,
        });
    });
    if (!_snailBroomTickTimer) {
        _snailBroomTickTimer = setInterval(_snailBroomTick, SNAIL_BROOM_TICK_MS);
    }
}


// Player walked over the resting broom → pick it up. The icon pins next to
// the player sprite so it looks like it's being held.
export function _snailPickupBroom(broom) {
    const host = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (!host) return;
    broom.held = true;
    broom.heldHost = host;
    broom.el.style.position = 'absolute';
    broom.el.style.left = 'auto';
    broom.el.style.top = 'auto';
    broom.el.style.right = '-14px';
    broom.el.style.bottom = '10px';
    broom.el.style.zIndex = '1100';
    broom.el.classList.add('sx-snail-broom-held');
    const lbl = broom.el.querySelector('.sx-snail-broom-label');
    if (lbl) lbl.style.display = 'none';
    host.appendChild(broom.el);
    _nkToast('eg_snail_broom_picked', '🧹 You grab the broom - you move much slower!', '#a3e635');
}


// Drops a held broom (called on E / the parry key). It respawns at its
// home position outside the grid with a small pop.
export function _snailDropBroom() {
    const b = _snailHeldBroom();
    if (!b) return;
    b.held = false;
    b.heldHost = null;
    b.sweepAcc = 0;
    b.sweepKey = null;
    if (b.sweepFill) {
        try { b.sweepFill.style.width = '0%'; } catch (e) {}
        b.sweepFill = null;
    }
    _snailSyncSweepLabel(null);
    b.chargePauseShown = false;
    _snailSetChargePauseClass(false);
    b.el.classList.remove('sx-snail-broom-held');
    const lbl = b.el.querySelector('.sx-snail-broom-label');
    if (lbl) lbl.style.display = '';
    document.body.appendChild(b.el);
    b.el.style.position = 'fixed';
    b.el.style.right = 'auto';
    b.el.style.bottom = 'auto';
    b.el.style.zIndex = '';
    b.el.style.left = Math.round(b.homeX) + 'px';
    b.el.style.top = Math.round(b.homeY) + 'px';
    b.el.classList.add('sx-snail-broom-pop');
    setTimeout(() => { try { b.el.classList.remove('sx-snail-broom-pop'); } catch (e) {} }, 450);
}


// 'SWEEPING' label above the player sprite while cleaning (same visual
// language as the DEFUSING / PARRYING labels). pct: sweep progress 0–100;
// the player sprite covers the in-cell fill bar, so the percentage rides
// up here where it always stays readable. Pass null to hide.
export function _snailSyncSweepLabel(pct) {
    const show = pct != null;
    const hud = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (hud) {
        let lbl = document.getElementById('sx-snail-sweep-label');
        if (show) {
            if (!lbl) {
                lbl = document.createElement('div');
                lbl.id = 'sx-snail-sweep-label';
                lbl.className = 'sx-snail-sweep-label';
                hud.appendChild(lbl);
            }
            const raw = (typeof t === 'function') ? t('eg_snail_sweeping') : '';
            const base = (raw && raw !== 'eg_snail_sweeping') ? raw : 'SWEEPING';
            const n = Math.max(0, Math.min(100, Math.round(pct)));
            lbl.textContent = base + (n >= 100 ? '' : ' ' + n + '%');
            lbl.style.display = '';
        } else if (lbl) {
            lbl.remove();
        }
    } else if (!show) {
        const stray = document.getElementById('sx-snail-sweep-label');
        if (stray) stray.remove();
    }
}


// Toggles the charge-bar pause style directly (no broom object needed -
// used by drop/teardown after the held broom has been released).
export function _snailSetChargePauseClass(active) {
    const bar = document.getElementById('avatar-charge-fill');
    if (bar) bar.classList.toggle('sx-charge-paused', !!active);
    const alt = document.getElementById('sx-player-charge-bar');
    if (alt) alt.classList.toggle('sx-charge-paused', !!active);
}


// Mirrors the charge-bar pause style while the broom is held (the actual
// charge freeze lives in _tickPlayer). Touches the DOM only on changes.
export function _snailSyncBroomChargePause(active) {
    const b = _snailHeldBroom();
    if (!b) return;
    if (!!active === b.chargePauseShown) return;
    b.chargePauseShown = !!active;
    _snailSetChargePauseClass(!!active);
}


// Which slimed cell the player is standing on - deliberately forgiving.
// The hitbox is small and the sprite can straddle two cells, so requiring
// the exact centre pixel to sit inside the goo made cleaning feel broken:
// a slimed cell under ANY meaningful part of the player rect now counts
// (~a quarter of the body over the goo starts/continues a sweep). The cell
// currently being swept is kept while you still overlap it at all, so a
// nudge mid-clean never wipes the progress bar.
export function _snailSweepTarget(pr, currentKey) {
    if (!pr) return null;
    const prArea = Math.max(1, pr.width * pr.height);
    const pad = 2; // tiny grace so edge cases don't feel frame-perfect
    const box = {
        left: pr.left - pad, right: pr.right + pad,
        top: pr.top - pad, bottom: pr.bottom + pad,
    };
    let best = null, bestArea = 0;
    let keep = null;
    _snailSlimed.forEach((entry, key) => {
        const cell = document.getElementById('g-' + entry.r + '-' + entry.c);
        if (!cell || !cell.isConnected) return;
        const cr = cell.getBoundingClientRect();
        if (!cr.width || !cr.height) return;
        const ol = Math.max(0, Math.min(box.right, cr.right) - Math.max(box.left, cr.left));
        const ot = Math.max(0, Math.min(box.bottom, cr.bottom) - Math.max(box.top, cr.top));
        const area = ol * ot;
        if (area <= 0) return;
        if (key === currentKey && area >= prArea * 0.10) { keep = entry; return; }
        if (area > bestArea) { bestArea = area; best = entry; }
    });
    if (keep) return keep;
    if (best && bestArea >= prArea * 0.25) return best;
    return null;
}


// Shared 100 ms driver: broom pickup by touch, and - while held - the
// sweep mechanic (stand on a slimed cell for SNAIL_SWEEP_MS to clean
// it). Walking off the slime resets the accumulated time.
export function _snailBroomTick() {
    if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;
    if (typeof dead !== 'undefined' && globalThis.dead) return;
    if (typeof _isActive === 'function' && !_isActive()) { _snailTeardown(); return; }
    if (_snailBroooms.length === 0) return;

    // Safety net for grid rebuilds: a puzzle transition rebuilds + fits the
    // board, and layout can settle a beat after the re-home hook ran - so
    // any resting broom left overlapping the grid gets moved out now.
    for (const br of _snailBroooms) {
        if (_snailRestingBroomOverlapsGrid(br)) {
            _snailRehomeBroooms();
            break;
        }
    }

    const pr = (typeof _nkPlayerRect === 'function') ? _nkPlayerRect() : null;
    const held = _snailHeldBroom();
    _snailSyncBroomChargePause(!!held);

    // At rest: pick a broom up when the player walks over it.
    if (!held) {
        if (!pr) return;
        for (const b of _snailBroooms) {
            if (b.held) continue;
            const r = b.el.getBoundingClientRect();
            if (r.width && r.height && _nkRectsOverlap(pr, r)) {
                _snailPickupBroom(b);
                return;
            }
        }
        return;
    }

    // Held: sweeping a slimed cell accumulates standing time.
    const b = held;
    const slimed = _snailSweepTarget(pr, b.sweepKey);
    const key = slimed ? (slimed.r + '-' + slimed.c) : null;

    if (slimed) {
        b.sweepKey = key;
        b.sweepAcc += SNAIL_BROOM_TICK_MS;
        b.sweepFill = slimed.fill;
        slimed.el.classList.add('sx-snail-slime-sweeping');
        if (slimed.fill) {
            slimed.fill.style.width = Math.min(100, (b.sweepAcc / SNAIL_SWEEP_MS) * 100) + '%';
        }
        _snailSyncSweepLabel((b.sweepAcc / SNAIL_SWEEP_MS) * 100);
        if (b.sweepAcc >= SNAIL_SWEEP_MS) {
            _snailCleanCell(slimed);
        }
        return;
    }

    // Not on a slimed cell - any in-progress sweep resets.
    if (b.sweepKey) {
        const prev = _snailSlimed.get(b.sweepKey);
        if (prev && prev.el) prev.el.classList.remove('sx-snail-slime-sweeping');
        if (prev && prev.fill) prev.fill.style.width = '0%';
        b.sweepKey = null;
        b.sweepFill = null;
        b.sweepAcc = 0;
        _snailSyncSweepLabel(null);
    }
}


// A slimed cell was swept for the full duration - wipe it with a green
// flash.
export function _snailCleanCell(entry) {
    const b = _snailHeldBroom();
    if (!b) return;
    b.sweepKey = null;
    b.sweepAcc = 0;
    b.sweepFill = null;
    entry.el.classList.remove('sx-snail-slime-sweeping');
    entry.el.classList.add('sx-snail-slime-cleaned');
    setTimeout(() => { try { entry.el.remove(); } catch (e) {} }, 600);
    _snailSlimed.delete(entry.r + '-' + entry.c);
    _snailSyncSweepLabel(null);
    _nkToast('eg_snail_cleaned', '🧹 Slimed cell cleaned!', '#a3e635');
}


// A chained/arena puzzle transition just rebuilt the grid (see
// _transitionToChainPuzzle in encounter-chain.js): every slimed
// cell's overlay died with the old table, so drop the stale map entries -
// otherwise they would block the NEW puzzle's cells sight-unseen. The
// roaming snail gets a fresh slate too (slime budget + cell memory reset)
// so it visibly slimed the new grid, and the broom is re-homed outside it.
export function _snailOnPuzzleTransition() {
    const held = _snailHeldBroom();
    if (held) {
        held.sweepAcc = 0;
        held.sweepKey = null;
        held.sweepFill = null;
        _snailSyncSweepLabel(null);
    }
    if (_snailBroooms.length > 0) {
        // New grid is already in the DOM - spread every resting broom
        // around the OUTSIDE of it. Held brooms just remember the fresh
        // home so their next drop lands outside the puzzle too.
        _snailRehomeBroooms();
    }
    const st = _snailDoom;
    if (st) {
        st.slimeDropped = 0;
        st.lastCellKey = null;
    }
    // An active Snailgeddon RING is anchored to the OLD grid's centre - end
    // it so the fresh puzzle starts clean. (The countdown phase survives:
    // it re-centres itself on every tick.)
    const gd2 = _snailgeddon;
    if (gd2 && gd2.phase === 'ring') _snailgeddonEnd(gd2);
    Array.from(_snailSlimed.values()).forEach(entry => {
        try { entry.el.remove(); } catch (e) {}
    });
    _snailSlimed.clear();
}


// Tears down every Snail-owned field effect (slimes, broom, driver).
// Called from _bossCleanup on boss death / encounter stop. The doom
// snail's nk run is killed by _nkTeardownBoss; its onKill clears
// _snailDoom too, so this is idempotent.
export function _snailTeardown() {
    if (_snailBroomTickTimer) {
        clearInterval(_snailBroomTickTimer);
        _snailBroomTickTimer = null;
    }
    _snailDoom = null;
    _snailNextDoomAt = null; // banish cooldown is per-encounter
    // Snailgeddon: cancel any countdown/ring still up. Its nk run is
    // normally killed first by _nkTeardownBoss - kill it defensively here
    // too (killRun + onKill are idempotent).
    const gd = _snailgeddon;
    if (gd) {
        if (gd.cdTimer) clearInterval(gd.cdTimer);
        if (gd.overlay) { try { gd.overlay.remove(); } catch (e) {} }
        _snailgeddonDropShield(gd);
        if (gd.run) { try { _nkKillRun(gd.run); } catch (e) {} }
        _snailgeddon = null;
    }
    Array.from(_snailSlimed.values()).forEach(entry => {
        try { entry.el.remove(); } catch (e) {}
    });
    _snailSlimed.clear();
    _snailBroooms.forEach(b => {
        try { b.el.remove(); } catch (e) {}
    });
    _snailBroooms = [];
    _snailSyncSweepLabel(null);
    _snailSetChargePauseClass(false);
}


//------------------------------------------------------------------------
//-------------------MECHANIC: DOOM SNAIL--------------------------------
//------------------------------------------------------------------------
// The classic homing snail, reworked: it no longer despawns. The ONLY way
// to remove it is to lure it into a corrupted grid cell - the collision
// destroys the snail AND cleans that cell's corruption. While it chases
// you it randomly slimed the cells it crawls over.

export function _mechDoomSnail(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    if (_snailDoom) return; // only one doom snail follows at a time
    if (_snailNextDoomAt && Date.now() < _snailNextDoomAt) return; // post-banish cooldown
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const speed = [0, 42, 52, 64][p];
    const radius = 34;
    const dmgPct = [0, 0.26, 0.30, 0.36][p];
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const el = _nkEl(run, 'div', 'sx-nk-dot sx-nk-snail', '🐌');
    const state = {
        run, el,
        x: 60, y: window.innerHeight - 120,
        speed, radius, dmgPct, level,
        hitCdUntil: 0,
        slimeCdUntil: 0,
        slimeDropped: 0,
        lastCellKey: null,
    };
    el.style.transform = 'translate(' + Math.round(state.x - 30) + 'px,' + Math.round(state.y - 30) + 'px)';
    _snailDoom = state;
    _snailEnsureBroom(); // the broom waits outside the grid
    run.onKill = () => { if (_snailDoom === state) _snailDoom = null; };
    _nkToast('eg_mech_snail',
        '🐌 The Snail: Doom Snail! It never leaves - crash it into a corrupted cell!', '#f59e0b');
    _nkLoop(run, (dtS, now) => {
        const c = _nkPlayerCenter();
        if (c) {
            const dx = c.x - state.x, dy = c.y - state.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            state.x += (dx / d) * state.speed * dtS;
            state.y += (dy / d) * state.speed * dtS;
        }
        state.el.style.transform = 'translate(' + Math.round(state.x - 30) + 'px,' + Math.round(state.y - 30) + 'px)';

        // Contact damage (existing behaviour).
        if (c && now >= state.hitCdUntil && _nkDotHit(state.el, _nkPlayerRect(), 0)) {
            state.hitCdUntil = now + 1500;
            const dealt = _nkHit(state.dmgPct, null, state.level);
            _nkAbilityHitToast(dealt, 'The Snail', 'Doom Snail');
        }

        // Randomly slime cells while crawling over the grid.
        _snailTrySlime(state, now);

        // The only escape: crash it into a corrupted cell → banished.
        if (_snailCrashIntoCorruption(state)) return false;

        return true; // no duration - it follows until it dies
    });
}


//------------------------------------------------------------------------
//-------------------PHASE 4: SNAILGEDDON (≤20% HP)----------------------
//------------------------------------------------------------------------
// The Snail's one-shot finisher, fired by the phase-enter hook when its
// HP crosses 20%:
//   1. A big "SNAILGEDDON IN 5…1" countdown covers the centre of the grid.
//   2. On go, the player is TELEPORTED to the grid centre and a dense ring
//      of doom snails materialises around them in a rounded-rect FRAME that
//      hugs just outside the puzzle's edges - no snail starts on a cell,
//      and the whole ring stays on screen for any arena.
//   3. The frame collapses inward on the centre. Touching the ring hits
//      hard - one hit per ring-wide cooldown (never a multi-snail burst)
//      plus a shove back in, and the snail that hit you recoils outward.
//      Charging out through the wall is not free. The boss wears an amber
//      shield dome over its card for the WHOLE set-piece (countdown +
//      ring), so its immunity is readable at a glance.
//   4. A WEDGE of snails crawls far slower than the rest, so their lag
//      tears a wide, player-sized gap in the closing frame. Escape through
//      that gap.
//   5. Once you are past the ring (or the ring has fully collapsed), the
//      swarm pops and the mechanic ends: the boss drops the immunity it
//      held since the transition and resumes its phase-4 schedule.
//
// Snailgeddon lives on its own boss-owned nk run, so boss death or an
// encounter stop tears the whole ring down automatically.

export const SNAILGEDDON_CD_MS = 800;        // per countdown tick
export const SNAILGEDDON_TICKS = 5;          // 5 … 1
export const SNAILGEDDON_FRAME_PAD = 46;     // the frame sits this far outside the grid's edges
export const SNAILGEDDON_CORNER_R = 30;      // rounded-corner radius of the frame
export const SNAILGEDDON_SPACING_PX = 96;    // target centre-to-centre spacing along the frame
export const SNAILGEDDON_N_MIN = 16;         // snails forming the frame (min)
export const SNAILGEDDON_N_MAX = 56;         // snails forming the frame (max, giant arenas)
export const SNAILGEDDON_CLOSE_S = 4.0;      // fast ring reaches the centre in ~this many seconds
export const SNAILGEDDON_SLOW_MULT = 0.20;   // lagging snails crawl at this fraction of ring speed
export const SNAILGEDDON_SLOW_ARC_MIN = 3;   // consecutive laggards forming the gap wedge (min)
export const SNAILGEDDON_SLOW_ARC_MAX = 8;   // … (max, huge arenas)
export const SNAILGEDDON_GAP_MARGIN_PX = 60; // extra clearance past the player's hitbox in the gap
export const SNAILGEDDON_RUN_SPEED_PX = 300; // assumed player run speed used when sizing the gap
export const SNAILGEDDON_MAX_MS = 6500;      // hard cap: the boss can never stay immune forever
export const SNAILGEDDON_DMG_PCT = 0.14;     // heavy contact damage per snail hit
export const SNAILGEDDON_HIT_CD_MS = 1000;   // ring-WIDE contact cooldown - never more than one hit
                                         // per window, even when several snails overlap at once
export const SNAILGEDDON_NUDGE_PX = 70;      // knockback toward the centre per wall hit
export const SNAILGEDDON_NUDGE_MIN_DIST = 90;  // skip the shove when the player already hugs the centre
export const SNAILGEDDON_SNAIL_RECOIL_PX = 80; // the snail that lands a hit bounces back out along its radial
export const SNAILGEDDON_ESCAPE_PX = 26;     // how far past the frame outline counts as escaped


export let _snailgeddon = null;
// { monsterId, phase: 'countdown'|'ring', cdTimer, overlay, shield, shieldRaf,
//   count, cx, cy, hx, hy, cr, nextHitAt, run, escaped, finished, startedAt }


// True from the moment the countdown starts until the Snailgeddon is
// over. Read by _tickPlayer (encounter.js) to freeze the auto-
// attack charge bar for the whole set-piece.
export function _snailgeddonActive() {
    return !!_snailgeddon && !_snailgeddon.finished;
}


// Amber immunity dome hovering over the boss's card while Snailgeddon
// runs. The boss holds bossImmune for the whole set-piece (set by the ≤20%
// transition, released in _snailgeddonEnd), and this bubble makes that
// readable at a glance on top of the IMMUNE badge / blocked-hit flash. Like
// the Jelly Ice Shell bubble it is a FIXED element repositioned every frame
// over the card (`.sx-emoji-wrapper`), so monster-panel re-renders can't
// orphan it, and it self-removes when the set-piece ends on ANY path.
// Positions the dome over the card's emoji (hidden when the card is not
// currently on screen). Both the synchronous first placement and the
// per-frame driver share this, so the shield is visible the instant the
// countdown starts - no waiting for the next animation frame.
export function _snailgeddonPlaceShield(g, s) {
    const card = document.getElementById('sx-card-' + g.monsterId);
    const wrap = card ? card.querySelector('.sx-emoji-wrapper') : null;
    const el = wrap || card;
    const r = el ? el.getBoundingClientRect() : null;
    if (!r || !r.width || !r.height) {
        s.style.display = 'none';
        return;
    }
    const size = Math.max(r.width, r.height) + 30;
    s.style.display = '';
    s.style.left = Math.round(r.left + r.width / 2 - size / 2) + 'px';
    s.style.top = Math.round(r.top + r.height / 2 - size / 2) + 'px';
    s.style.width = size + 'px';
    s.style.height = size + 'px';
}

export function _snailgeddonShowShield(g) {
    if (!g || g.shield) return;
    const s = document.createElement('div');
    s.className = 'sx-snail-shield';
    s.style.display = 'none';
    document.body.appendChild(s);
    g.shield = s;
    _snailgeddonPlaceShield(g, s); // visible immediately
    const step = () => {
        // Gone (End ran, encounter stopped, boss died, …) → clean up here
        // too so no path can strand a ghost bubble over nothing.
        if (!_snailgeddon || _snailgeddon !== g || g.finished) {
            g.shield = null;
            g.shieldRaf = 0;
            try { s.remove(); } catch (e) {}
            return;
        }
        _snailgeddonPlaceShield(g, s);
        g.shieldRaf = requestAnimationFrame(step);
    };
    g.shieldRaf = requestAnimationFrame(step);
}


// Stops the shield driver and removes the bubble (idempotent).
export function _snailgeddonDropShield(g) {
    if (!g) return;
    if (g.shieldRaf) { try { cancelAnimationFrame(g.shieldRaf); } catch (e) {} }
    g.shieldRaf = 0;
    if (g.shield) { try { g.shield.remove(); } catch (e) {} }
    g.shield = null;
}


// Grid-centre screen point (play cells only; corners measured live so it
// tracks puzzle transitions). Carries the arena's LOGICAL size too - the
// rows × cols of cur.grid - so the ring can be shaped by the puzzle's
// actual dimensions instead of a pixel shortcut.
export function _snailGridCentre() {
    if (typeof cur === 'undefined' || !cur || !cur.grid || !cur.grid.length || !cur.grid[0]) return null;
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const a = document.getElementById('g-0-0');
    const b = document.getElementById('g-' + (rows - 1) + '-' + (cols - 1));
    if (!a || !b || !a.isConnected || !b.isConnected) return null;
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    if (!ra.width || !ra.height || !rb.width || !rb.height) return null;
    return {
        x: (ra.left + rb.right) / 2, y: (ra.top + rb.bottom) / 2,
        w: rb.right - ra.left, h: rb.bottom - ra.top,
        rows: rows, cols: cols,
    };
}


// ── Rounded-rect frame geometry ────────────────────────────────────────
// The Snailgeddon ring is a rounded rectangle centred on the grid, padded
// SNAILGEDDON_FRAME_PAD beyond the puzzle's edges. A rounded-rect frame
// can always clear the whole puzzle (a circle around a near-fullscreen
// arena cannot - its far corner cells sit beyond any on-screen radius), and
// the corner arcs keep the frame from poking out diagonally.

// Outline length of the rounded rect (used for even snail spacing).
export function _snailRRPerimeter(hx, hy, cr) {
    return 4 * (hx + hy) - (8 - 2 * Math.PI) * cr;
}

// Point on the outline at arc-length s, walking clockwise from the
// top-left end of the top straight edge. s may be any real number
// (negative/≥ perimeter get wrapped).
export function _snailFramePoint(cx, cy, hx, hy, cr, s) {
    const perim = _snailRRPerimeter(hx, hy, cr);
    s = ((s % perim) + perim) % perim;
    const L = 2 * (hx - cr);  // top & bottom straights
    const H = 2 * (hy - cr);  // left & right straights
    const A = (Math.PI / 2) * cr;
    if (s < L) return { x: cx - hx + cr + s, y: cy - hy };            // top straight
    s -= L;
    if (s < A) {                                                        // top-right arc
        const ang = -Math.PI / 2 + (s / A) * (Math.PI / 2);
        return { x: cx + hx - cr + Math.cos(ang) * cr, y: cy - hy + cr + Math.sin(ang) * cr };
    }
    s -= A;
    if (s < H) return { x: cx + hx, y: cy - hy + cr + s };            // right straight
    s -= H;
    if (s < A) {                                                        // bottom-right arc
        const ang = (s / A) * (Math.PI / 2);
        return { x: cx + hx - cr + Math.cos(ang) * cr, y: cy + hy - cr + Math.sin(ang) * cr };
    }
    s -= A;
    if (s < L) return { x: cx + hx - cr - s, y: cy + hy };            // bottom straight
    s -= L;
    if (s < A) {                                                        // bottom-left arc
        const ang = Math.PI / 2 + (s / A) * (Math.PI / 2);
        return { x: cx - hx + cr + Math.cos(ang) * cr, y: cy + hy - cr + Math.sin(ang) * cr };
    }
    s -= A;
    if (s < H) return { x: cx - hx, y: cy + hy - cr - s };            // left straight
    s -= H;
    {                                                                   // top-left arc
        const ang = Math.PI + (s / A) * (Math.PI / 2);
        return { x: cx - hx + cr + Math.cos(ang) * cr, y: cy - hy + cr + Math.sin(ang) * cr };
    }
}

// Whether a point lies inside the rounded rect (inflated by padding when
// callers pass hx/hy/cr + pad). Outside = past the ring = escaped.
export function _snailRRContains(px, py, cx, cy, hx, hy, cr) {
    const ax = Math.abs(px - cx), ay = Math.abs(py - cy);
    const dx = Math.max(0, ax - (hx - cr));
    const dy = Math.max(0, ay - (hy - cr));
    return dx * dx + dy * dy <= cr * cr;
}


// Small "pop" when a snail disappears (independent of the nk run so it can
// never be stranded by run cleanup - it self-removes).
export function _snailgeddonBurst(x, y) {
    const s = document.createElement('div');
    s.className = 'sx-snail-squish';
    s.textContent = '🐌💨';
    s.style.left = Math.round(x) + 'px';
    s.style.top = Math.round(y) + 'px';
    document.body.appendChild(s);
    setTimeout(() => { try { s.remove(); } catch (e) {} }, 800);
}


// Places/re-places the countdown overlay at the current grid centre.
export function _snailgeddonPlaceOverlay(g) {
    const ov = g.overlay;
    if (!ov) return;
    const c = _snailGridCentre();
    ov.style.left = Math.round(c ? c.x : window.innerWidth / 2) + 'px';
    ov.style.top = Math.round(c ? c.y : window.innerHeight / 2) + 'px';
    const num = ov.querySelector('.sx-snailgeddon-cd-num');
    if (num) num.textContent = g.count;
}


// Builds the countdown overlay (label + number + hint), localised.
export function _snailgeddonShowOverlay(g) {
    const ov = document.createElement('div');
    ov.className = 'sx-snailgeddon-cd';
    ov.id = 'sx-snailgeddon-cd';
    ov.innerHTML =
        '<div class="sx-snailgeddon-cd-label"></div>' +
        '<div class="sx-snailgeddon-cd-num"></div>' +
        '<div class="sx-snailgeddon-cd-hint"></div>';
    document.body.appendChild(ov);
    g.overlay = ov;
    const rawLabel = t('eg_snailgeddon_cd_label');
    const rawHint = t('eg_snailgeddon_hint');
    ov.querySelector('.sx-snailgeddon-cd-label').textContent =
        (rawLabel && rawLabel !== 'eg_snailgeddon_cd_label') ? rawLabel : 'SNAILGEDDON IN';
    ov.querySelector('.sx-snailgeddon-cd-hint').textContent =
        (rawHint && rawHint !== 'eg_snailgeddon_hint') ? rawHint : 'The ring is closing - one side lags behind. Escape through the gap!';
    _snailgeddonPlaceOverlay(g);
}


// Phase-enter hook: phase 4 (≤20% HP) is the Snailgeddon takeover - the
// boss owns its immunity release. Other phases fall through to the default
// transition handling.
export function _snailOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 4) return false;
    try {
        _snailgeddonStart(monster);
    } catch (e) {
        // A buggy start must never wedge the boss immune forever.
        try { _snailgeddonEnd(_snailgeddon); } catch (e2) {}
        if (monster && monster.bossImmune) {
            monster.bossImmune = false;
            try { _bossScheduleMechanics(monster, 4); } catch (e3) {}
        }
    }
    return true; // take over the phase either way
}


// Starts the countdown phase. The boss stays immune (set by the phase
// transition) until the whole set-piece finishes.
export function _snailgeddonStart(monster) {
    if (_snailgeddon || !monster) return;

    // Clean slate: the doom snail and the broom have no place here - drop
    // the broom and banish the roaming snail so the swarm owns the screen.
    if (_snailDoom) { try { _nkKillRun(_snailDoom.run); } catch (e) {} }
    if (_snailBroomHeld()) _snailDropBroom();

    // The auto-attack charge bar freezes for the WHOLE set-piece (countdown
    // included) - Snailgeddon is a dodge-and-run phase, not free damage
    // time. _tickPlayer gates on _snailgeddonActive(); mirror the pause
    // visually here.
    _snailSetChargePauseClass(true);

    const g = {
        monsterId: monster.id,
        phase: 'countdown',
        cdTimer: null,
        overlay: null,
        shield: null,
        shieldRaf: 0,
        count: SNAILGEDDON_TICKS,
        cx: 0, cy: 0, hx: 0, hy: 0, cr: 0,
        nextHitAt: 0,
        run: null,
        escaped: false,
        finished: false,
        startedAt: 0,
    };
    _snailgeddon = g;
    _snailgeddonShowOverlay(g);
    _snailgeddonShowShield(g); // immune dome over the boss card

    g.cdTimer = setInterval(() => {
        if (!_snailgeddon || _snailgeddon !== g || g.finished) return;
        if (_nkFrozen()) return; // pause / death / inactive hold the count
        g.count--;
        if (g.count <= 0) {
            clearInterval(g.cdTimer);
            g.cdTimer = null;
            _snailgeddonGo(g, monster);
            return;
        }
        const num = g.overlay && g.overlay.querySelector('.sx-snailgeddon-cd-num');
        if (num) num.textContent = g.count;
        _snailgeddonPlaceOverlay(g); // re-centre in case the grid moved
    }, SNAILGEDDON_CD_MS);
}


// Countdown finished: teleport the player to the grid centre and spawn the
// closing ring of snails - a rounded-rect FRAME hugging just outside the
// puzzle's edges.
export function _snailgeddonGo(g, monster) {
    if (!g || g.finished) return;
    g.phase = 'ring';
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }

    const centre = _snailGridCentre();
    const cx = centre ? centre.x : window.innerWidth / 2;
    const cy = centre ? centre.y : window.innerHeight / 2;
    const level = monster ? monster.level : 1;

    // Frame geometry: the grid's half extents padded by a snail-body gap,
    // with rounded corners so the frame never pokes out diagonally. Since
    // it hugs the puzzle itself, it clears every cell AND stays on screen
    // no matter how large the arena is.
    const hx = Math.max(80, (centre ? centre.w : 600) / 2 + SNAILGEDDON_FRAME_PAD);
    const hy = Math.max(80, (centre ? centre.h : 450) / 2 + SNAILGEDDON_FRAME_PAD);
    const cr = Math.max(8, Math.min(SNAILGEDDON_CORNER_R, Math.min(hx, hy) - 16));
    g.cx = cx; g.cy = cy; g.hx = hx; g.hy = hy; g.cr = cr;

    // Teleport the player to the centre, then re-measure and correct once:
    // the wrapper's top-left sits a few px off the hitbox centre (HP bars),
    // so a single offset can't align both avatar modes.
    const pr = (typeof _nkPlayerRect === 'function') ? _nkPlayerRect() : null;
    if (typeof _teleportAvatarTo === 'function') {
        try {
            const bw = pr ? pr.width / 2 : 22;
            const bh = pr ? pr.height / 2 : 45;
            _teleportAvatarTo(cx - bw, cy - bh);
            const pc = (typeof _nkPlayerCenter === 'function') ? _nkPlayerCenter() : null;
            if (pc) _teleportAvatarTo(cx - bw + (cx - pc.x), cy - bh + (cy - pc.y));
        } catch (e) {}
    }

    // Spawn the swarm: evenly spaced ALONG the frame outline, so the wall
    // is just as solid around a small arena as a giant one. All snails race
    // the centre along their own radial line; a contiguous WEDGE of them
    // crawls at SLOW_MULT and its lag tears the escape gap.
    const perim = _snailRRPerimeter(hx, hy, cr);
    const N = Math.max(SNAILGEDDON_N_MIN,
        Math.min(SNAILGEDDON_N_MAX, Math.round(perim / SNAILGEDDON_SPACING_PX)));
    // Escape-gap guarantee: the wedge opens (arc + 1) frame slots in the
    // closing wall. A single laggard only leaves ~2 slots - smaller than
    // the player's hitbox by the time they reach the ring on large arenas.
    // Size the wedge so the passable gap stays ≥ hitbox width + margin in
    // the worst case: the player sprints from the centre to the farthest
    // frame point and arrives after the ring has shrunk to
    // sF = speed·T / (speed·T + ρ); the gap is (arc+1)·slot·sF − 60 (two
    // snail bodies at the wedge's edges).
    const pr0 = (typeof _nkPlayerRect === 'function') ? _nkPlayerRect() : null;
    const playerW = pr0 && pr0.width > 0 ? pr0.width : 52;
    const slot = perim / N;
    const rhoWorst = Math.hypot(hx, hy) + 10;
    const sFmin = (SNAILGEDDON_RUN_SPEED_PX * SNAILGEDDON_CLOSE_S)
        / (SNAILGEDDON_RUN_SPEED_PX * SNAILGEDDON_CLOSE_S + rhoWorst);
    const need = playerW + SNAILGEDDON_GAP_MARGIN_PX + 60;
    let slowArc = SNAILGEDDON_SLOW_ARC_MAX;
    for (let a = SNAILGEDDON_SLOW_ARC_MIN; a <= SNAILGEDDON_SLOW_ARC_MAX; a++) {
        if ((a + 1) * slot * sFmin - 60 >= need) { slowArc = a; break; }
    }
    const slowStart = Math.floor(Math.random() * N);
    const s0 = Math.random() * perim;

    const run = _nkNewRun(g.monsterId, true);
    g.run = run;
    g.startedAt = performance.now();
    const swarm = [];
    for (let i = 0; i < N; i++) {
        const p = _snailFramePoint(cx, cy, hx, hy, cr, s0 + (i / N) * perim);
        const a = Math.atan2(p.y - cy, p.x - cx);
        const rho = Math.hypot(p.x - cx, p.y - cy);
        const slow = ((i - slowStart + N) % N) < slowArc;
        const el = _nkEl(run, 'div',
            'sx-nk-dot sx-nk-snail sx-snailgeddon-swarm' + (slow ? ' sx-snailgeddon-slow' : ''), '🐌');
        el.style.transform = 'translate(' + Math.round(p.x - 30) + 'px,' + Math.round(p.y - 30) + 'px)';
        swarm.push({ el, a, rho, rho0: rho, mult: slow ? SNAILGEDDON_SLOW_MULT : 1, x: p.x, y: p.y, alive: true });
    }
    g.slowArc = slowArc;
    g.slowStart = slowStart;
    g.snailMeta = { n: N, s0: s0, perim: perim, slot: slot, sFmin: sFmin };
    g.gapPx = Math.round((slowArc + 1) * slot * sFmin - 60);

    _nkToast('eg_snailgeddon_go',
        '🐌 The Snail: SNAILGEDDON! Escape through the gap in the ring!', '#f87171');

    run.onKill = () => { if (_snailgeddon === g) _snailgeddon = null; };

    const Tms = SNAILGEDDON_CLOSE_S * 1000;
    _nkLoop(run, (dtS, now) => {
        if (!_snailgeddon || _snailgeddon !== g || g.finished) return false;
        const pr2 = _nkPlayerRect();
        const pc = _nkPlayerCenter();
        const elapsed = now - g.startedAt;
        const u = Math.min(1, elapsed / Tms); // frame-collapse progress 0 → 1

        // Frame collapse: each snail's current radius is its start radius
        // scaled down; snails that reach the centre pop.
        let arrived = 0;
        for (const s of swarm) {
            if (!s.alive) { arrived++; continue; }
            const pi = Math.min(1, u * s.mult);
            const r = s.rho * (1 - pi);
            s.x = cx + Math.cos(s.a) * r;
            s.y = cy + Math.sin(s.a) * r;
            if (r <= 6) {
                s.alive = false;
                _snailgeddonBurst(cx, cy);
                arrived++;
                continue;
            }
            s.el.style.transform = 'translate(' + Math.round(s.x - 30) + 'px,' + Math.round(s.y - 30) + 'px)';
        }

        // The frame is a wall: heavy contact damage. Hits run on ONE
        // ring-wide cooldown, not per snail - several snails can overlap the
        // player at once (especially while the ring converges on the
        // centre), and simultaneous hits used to stack damage numbers, red
        // flashes, toasts and nudges into a strobe of fighting effects.
        // Now at most one hit lands per window; the snail that lands it
        // recoils back out along its radial so the player isn't left
        // rubbing it, and the player gets a single clean shove inward
        // (skipped when already hugging the centre, where a shove just
        // reads as jitter).
        if (pc && pr2 && now >= g.nextHitAt) {
            for (const s of swarm) {
                if (!s.alive || !_nkDotHit(s.el, pr2, 0)) continue;
                g.nextHitAt = now + SNAILGEDDON_HIT_CD_MS;
                const dealt = _nkHit(SNAILGEDDON_DMG_PCT, null, level);
                _nkAbilityHitToast(dealt, 'The Snail', 'Snailgeddon');
                s.rho = Math.min(s.rho0, s.rho + SNAILGEDDON_SNAIL_RECOIL_PX);
                const d = Math.hypot(pc.x - cx, pc.y - cy) || 1;
                if (typeof _nkNudgeAvatar === 'function' && d >= SNAILGEDDON_NUDGE_MIN_DIST) {
                    try {
                        _nkNudgeAvatar(((cx - pc.x) / d) * SNAILGEDDON_NUDGE_PX,
                            ((cy - pc.y) / d) * SNAILGEDDON_NUDGE_PX);
                    } catch (e) {}
                }
                break; // one hit per window - never a multi-snail burst
            }
        }

        // Escaped through the gap → being beyond the frame outline counts
        // as out; the swarm gives up and pops.
        if (pc && !g.escaped && !_snailRRContains(pc.x, pc.y, cx, cy,
                hx + SNAILGEDDON_ESCAPE_PX, hy + SNAILGEDDON_ESCAPE_PX, cr + SNAILGEDDON_ESCAPE_PX)) {
            g.escaped = true;
            swarm.forEach(s => { if (s.alive) { s.alive = false; _snailgeddonBurst(s.x, s.y); } });
            _snailgeddonEnd(g);
            return false;
        }

        // Frame fully collapsed (all fast snails in; the lagging wedge
        // alone can't wall anyone off) or the hard cap hit → end either way.
        if (elapsed >= SNAILGEDDON_MAX_MS || arrived >= N - slowArc) {
            swarm.forEach(s => { if (s.alive) { s.alive = false; _snailgeddonBurst(s.x, s.y); } });
            _snailgeddonEnd(g);
            return false;
        }
        return true;
    });
}


// Ends the Snailgeddon and hands the phase back to the boss: clears every
// piece of state, drops the immunity held since the ≤20% transition, and
// resumes the normal phase-4 mechanic schedule.
export function _snailgeddonEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    _snailgeddonDropShield(g);
    if (g.run) { try { _nkKillRun(g.run); } catch (e) {} g.run = null; }

    const m = (g.monsterId && typeof _monsters !== 'undefined')
        ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossPhase === 4 && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _bossScheduleMechanics === 'function') {
            try { _bossScheduleMechanics(m, 4); } catch (e) {}
        }
        if (typeof _renderPanel === 'function') { try { _renderPanel(); } catch (e) {} }
    }
    // Charge bar unfreezes - the mechanic is over (also cleared defensively
    // by _snailTeardown if the encounter dies mid-set-piece).
    _snailSetChargePauseClass(false);
    _nkToast(g.escaped ? 'eg_snailgeddon_escaped' : 'eg_snailgeddon_over',
        g.escaped ? '💨 You escaped the Snailgeddon!' : '🐌 The Snailgeddon closes in - the swarm collapses.',
        g.escaped ? '#4ade80' : '#f59e0b');
    if (_snailgeddon === g) _snailgeddon = null;
}


// Wire the ≤20% HP finisher into the mechanics def (extra phase + the
// phase-enter hook). Done at the end of the file so the whole set-piece
// stays in one place.
BOSS_MECHANICS.boss_snail.phases.push({ threshold: 0.20, chargeMax: 8, damageMultiplier: 1.7 });
BOSS_MECHANICS.boss_snail.onPhaseEnter = _snailOnPhaseEnter;
