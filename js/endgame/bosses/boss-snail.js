//------------------------------------------------------------------------
//-------------------BOSS: THE SNAIL (boss_snail)-------------------------------
//------------------------------------------------------------------------
// First-steps fight: a single, VERY slow homing snail. It cannot be
// outrun forever — but it can barely catch you either. Teaches kiting:
// keep moving in wide arcs and never corner yourself.
//
// The Doom Snail now stays until it is dealt with:
//   • It has NO duration — it follows you until it crashes into a
//     CORRUPTED grid cell, which banishes it (and cleans that corruption
//     in the process).
//   • While it crawls over the grid it randomly SLIMES cells. Slimed
//     cells block ALL interaction until swept clean.
//   • The BROOM sits outside the grid. Walk over it to pick it up and
//     stand on a slimed cell for EG_SNAIL_SWEEP_MS to clean it. Holding
//     the broom slows you to a crawl and freezes your auto-attack charge
//     so the snail can catch up — press E (the parry) to drop it.
//   • At ≤20% HP: SNAILGEDDON — a 5-second warning, then the player is
//     yanked to the grid centre while a closing frame of snails traps them.
//     A wedge of snails lags far behind, tearing a wide, player-sized
//     escape gap in the ring.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_snail: {
        id: 'boss_snail', name: 'The Snail', emoji: '🐌',
        baseHP: 900, baseDamage: 19, chargeMax: 14,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_snail: {
        phases: [
            { threshold: 1.00, chargeMax: 14, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.30 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.70 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'doom_snail', intervalBase: 8000, intervalVariance: 2000, handler: '_egMechDoomSnail' },
            { name: 'corrupt_cells', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechCorruptCells' },
        ],
    },
});


// ── The Snail's unique mechanics ────────────────────────────────────────────
// One doom snail at a time; EG_SNAIL_BROOM_COUNT brooms rest outside the
// grid; slimed cells persist until swept clean. All module state is torn
// down by _egSnailTeardown (registered in _egBossCleanup, see
// boss-framework.js).

let _egSnailDoom = null;        // active Doom Snail { run, el, x, y, ... } or null
let _egSnailSlimed = new Map(); // "r-c" → { el, fill, r, c } — cells blocked until swept
let _egSnailBroooms = [];       // resting/held brooms: { el, homeX, homeY, held, sweepAcc, sweepKey, sweepFill, chargePauseShown }
let _egSnailBroomTickTimer = null;
let _egSnailNextDoomAt = null;      // wall-clock gate: no doom snail right after a banish

// Movement-speed multiplier while holding the broom — read by the avatar
// mover in player_sprite.js (window channel keeps one source of truth).
// 0.15 ≈ 48 px/s: still a crawl (sweeping forces you to stand still for
// the full EG_SNAIL_SWEEP_MS, so the snail catches you), but you can
// reposition between slimed cells without it feeling like molasses.
window.EG_SNAIL_BROOM_SPEED_MULT = 0.15;

// Knobs (tier-1 friendly — The Snail is a first-steps boss).
const EG_SNAIL_SLIME_CHANCE = 0.30;     // chance to slime the cell under the snail per new cell
const EG_SNAIL_SLIME_COOLDOWN_MS = 800; // min gap between slimes
const EG_SNAIL_SLIME_PER_SNAIL = 7;     // max slimes one doom snail drops before being banished
const EG_SNAIL_SLIME_MAX_TOTAL = 12;    // hard cap of slimed cells on the grid at once
const EG_SNAIL_SWEEP_MS = 5000;         // standing time on a slimed cell with the broom to clean it
const EG_SNAIL_BROOM_TICK_MS = 100;     // pickup + sweep driver resolution
const EG_SNAIL_BROOM_COUNT = 3;         // resting brooms placed around the grid
const EG_SNAIL_BROOM_MARGIN = 34;       // min gap between a resting broom and the grid/viewport edge
const EG_SNAIL_DOOM_BANISH_COOLDOWN_MS = 45000; // after a corruption banish, the next doom snail waits 45 s


// True while the Doom Snail's broom is held. Hooked from the avatar mover
// (movement slow) and _egTickPlayer (charge freeze).
// The broom the player currently holds, if any.
function _egSnailHeldBroom() {
    return (typeof _egSnailBroooms !== 'undefined' && _egSnailBroooms.length)
        ? _egSnailBroooms.find(b => b && b.held) || null
        : null;
}


function _egSnailBroomHeld() {
    return !!_egSnailHeldBroom();
}


// True while the player is sweeping a slimed cell with the broom.
function _egSnailSweeping() {
    const b = _egSnailHeldBroom();
    return !!(b && b.sweepKey);
}


// Public check for the cell-click intercept (mouse-button-handlers.js):
// is this cell slimed and therefore untouchable until swept clean?
function _egSnailIsCellSlimed(row, col) {
    return !!(typeof _egSnailSlimed !== 'undefined' && _egSnailSlimed.has(row + '-' + col));
}


// Grid cell under a screen point, via the corner play-cells' rects (the
// play area is uniform, so row/col falls out of the geometry).
function _egSnailCellFromPoint(x, y) {
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
function _egSnailSlimeCell(r, c) {
    const key = r + '-' + c;
    if (_egSnailSlimed.has(key)) return;
    if (typeof _egBossCorrupted !== 'undefined' && _egBossCorrupted.has(key)) return;
    const cell = document.getElementById('g-' + r + '-' + c);
    if (!cell || !cell.isConnected) return;
    const ov = document.createElement('span');
    ov.className = 'eg-snail-slime';
    ov.id = 'eg-snail-slime-' + r + '-' + c;
    ov.textContent = '🫧';
    const fill = document.createElement('i');
    fill.className = 'eg-snail-slime-fill';
    ov.appendChild(fill);
    cell.appendChild(ov);
    _egSnailSlimed.set(key, { el: ov, fill, r, c });
}


// Removes the slime overlay from a cell (after cleaning).
function _egSnailRemoveSlime(r, c) {
    const key = r + '-' + c;
    const entry = _egSnailSlimed.get(key);
    if (!entry) return;
    try { entry.el.remove(); } catch (e) {}
    _egSnailSlimed.delete(key);
}


// Rolls a slime drop when the snail's center enters a NEW grid cell.
// Not every cell gets slimed — a per-cast chance with a cooldown + cap.
function _egSnailTrySlime(state, now) {
    if (now < state.slimeCdUntil) return;
    if (state.slimeDropped >= EG_SNAIL_SLIME_PER_SNAIL) return;
    if (_egSnailSlimed.size >= EG_SNAIL_SLIME_MAX_TOTAL) return;
    const cell = _egSnailCellFromPoint(state.x, state.y);
    if (!cell) return;
    const key = cell.r + '-' + cell.c;
    if (key === state.lastCellKey) return; // only roll when crossing into a new cell
    state.lastCellKey = key;
    if (Math.random() >= EG_SNAIL_SLIME_CHANCE) return;
    _egSnailSlimeCell(cell.r, cell.c);
    state.slimeDropped++;
    state.slimeCdUntil = now + EG_SNAIL_SLIME_COOLDOWN_MS;
}


// The ONLY way to banish the Doom Snail: crash it into a corrupted cell.
// Consumes that corruption and pops the snail with a small squish burst.
function _egSnailCrashIntoCorruption(state) {
    if (typeof _egBossCorrupted === 'undefined' || !_egBossCorrupted || _egBossCorrupted.size === 0) return false;
    const sr = state.el.getBoundingClientRect();
    if (!sr.width || !sr.height) return false;
    let hit = null;
    _egBossCorrupted.forEach((data, key) => {
        if (hit) return;
        const cell = document.getElementById('g-' + key);
        if (!cell || !cell.isConnected) return;
        const cr = cell.getBoundingClientRect();
        if (!cr.width || !cr.height) return;
        if (_egNkRectsOverlap(
            { left: sr.left - 2, right: sr.right + 2, top: sr.top - 2, bottom: sr.bottom + 2 },
            { left: cr.left, right: cr.right, top: cr.top, bottom: cr.bottom }
        )) hit = key;
    });
    if (!hit) return false;

    _egSnailDoom = null;
    // Luring the snail into corruption buys breathing room: no replacement
    // doom snail for the next 45 s (see EG_SNAIL_DOOM_BANISH_COOLDOWN_MS).
    _egSnailNextDoomAt = Date.now() + EG_SNAIL_DOOM_BANISH_COOLDOWN_MS;
    if (typeof _egRemoveCellCorruption === 'function') _egRemoveCellCorruption(hit);

    // Squish + splash at the snail's position (transient, not run-owned).
    const squish = document.createElement('div');
    squish.className = 'eg-snail-squish';
    squish.textContent = '🐌💦';
    squish.style.left = Math.round(state.x) + 'px';
    squish.style.top = Math.round(state.y) + 'px';
    document.body.appendChild(squish);
    setTimeout(() => { try { squish.remove(); } catch (e) {} }, 800);

    _egNkToast('eg_snail_banished',
        '💥 The Doom Snail smashes into the corruption and is destroyed!', '#f59e0b');
    return true;
}


// Resting broom box footprint (icon + label) used when placing homes.
const EG_SNAIL_BROOM_BOX_W = 150;
const EG_SNAIL_BROOM_BOX_H = 70;


// Picks `count` home spots for the resting brooms, all OUTSIDE the current
// puzzle grid. The layout is deterministic and side-locked so brooms never
// clump: with the usual 3 the homes are one LEFT of the grid (vertically
// centred), one RIGHT of the grid, and one on TOP, centred above it. Homes
// that cannot physically fit (tiny viewport / huge grid) fall back along
// the bottom edge, then to viewport corners. Every spot keeps the full
// broom box clear of the (padded) grid so a grid rebuild never leaves a
// broom sitting on top of the puzzle, and the fallbacks keep one box-width
// of gap so no two brooms ever share a spot.
function _egSnailBroomHomes(count) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const m = EG_SNAIL_BROOM_MARGIN;
    let grid = null;
    if (typeof _egHzGridRect === 'function') {
        try {
            const g = _egHzGridRect(0);
            if (g && g.width && g.height) grid = g;
        } catch (e) {}
    }
    const out = [];
    const fits = (x, y) => x >= m && y >= m
        && x + EG_SNAIL_BROOM_BOX_W <= vw - m
        && y + EG_SNAIL_BROOM_BOX_H <= vh - m;
    const clearOfGrid = (x, y) => {
        if (!grid) return true;
        return x + EG_SNAIL_BROOM_BOX_W < grid.left - 4 || x > grid.right + 4
            || y + EG_SNAIL_BROOM_BOX_H < grid.top - 4 || y > grid.bottom + 4;
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
        add(grid.left - m - EG_SNAIL_BROOM_BOX_W, cy - EG_SNAIL_BROOM_BOX_H / 2);
        // 2. right of the grid, vertically centred
        add(grid.right + m, cy - EG_SNAIL_BROOM_BOX_H / 2);
        // 3. top, centred above the grid
        add(cx - EG_SNAIL_BROOM_BOX_W / 2, grid.top - m - EG_SNAIL_BROOM_BOX_H);
        // Only extra brooms (or missing sides on cramped layouts) spill
        // along the bottom edge.
        add(grid.left + grid.width * 0.2, grid.bottom + m);
        add(grid.left + grid.width * 0.8, grid.bottom + m);
    }
    const corners = [
        [vw - EG_SNAIL_BROOM_BOX_W - m, m],
        [m, vh - EG_SNAIL_BROOM_BOX_H - m],
        [vw - EG_SNAIL_BROOM_BOX_W - m, vh - EG_SNAIL_BROOM_BOX_H - m],
        [m, m],
    ];
    corners.forEach(([x, y]) => add(x, y));
    // Absolute last resort: never return fewer than `count` homes — a spot
    // that grazes a corner beats a missing broom entirely. Steps keep a
    // full box between neighbours so the safety brooms never overlap.
    const sx = EG_SNAIL_BROOM_BOX_W + 10, sy = EG_SNAIL_BROOM_BOX_H + 10;
    let fx = vw - EG_SNAIL_BROOM_BOX_W - m, fy = vh - EG_SNAIL_BROOM_BOX_H - m;
    while (out.length < count) {
        out.push({
            x: Math.max(m, Math.min(vw - EG_SNAIL_BROOM_BOX_W - m, fx)),
            y: Math.max(m, Math.min(vh - EG_SNAIL_BROOM_BOX_H - m, fy)),
        });
        fx -= sx;
        fy -= sy;
    }
    return out;
}


// True when a RESTING broom's painted box touches the puzzle grid.
function _egSnailRestingBroomOverlapsGrid(b) {
    if (b.held) return false;
    const r = b.el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    let grid = null;
    if (typeof _egHzGridRect === 'function') {
        try {
            const g = _egHzGridRect(0);
            if (g && g.width && g.height) grid = g;
        } catch (e) {}
    }
    if (!grid) return false;
    return r.left < grid.right + 4 && r.right > grid.left - 4
        && r.top < grid.bottom + 4 && r.bottom > grid.top - 4;
}


// Recomputes every broom's home around the CURRENT grid and — for resting
// brooms — moves it there. Held brooms just remember the fresh spot so the
// next drop lands outside the puzzle. Used on puzzle transitions and as a
// tick-level safety net whenever a resting broom overlaps the grid.
function _egSnailRehomeBroooms() {
    const homes = _egSnailBroomHomes(_egSnailBroooms.length || EG_SNAIL_BROOM_COUNT);
    _egSnailBroooms.forEach((b, i) => {
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


// Creates the brooms (once — EG_SNAIL_BROOM_COUNT of them, spread around
// the outside of the grid) and starts the shared pickup/sweep driver.
// Called by the first Doom Snail cast. Several brooms mean the player can
// grab one from whichever side is convenient, and a dropped broom is never
// the only one on the field.
function _egSnailEnsureBroom() {
    if (_egSnailBroooms.length > 0) return;
    const homes = _egSnailBroomHomes(EG_SNAIL_BROOM_COUNT);
    const rawLabel = (() => {
        try {
            const r = t('eg_snail_broom');
            return (r && r !== 'eg_snail_broom') ? r : 'Broom';
        } catch (e) { return 'Broom'; }
    })();
    homes.forEach((home, i) => {
        const el = document.createElement('div');
        el.className = 'eg-snail-broom';
        el.id = 'eg-snail-broom-' + i;
        el.innerHTML = '<span class="eg-snail-broom-ico">🧹</span><span class="eg-snail-broom-label">🧹 ' + rawLabel + '</span>';
        el.style.left = Math.round(home.x) + 'px';
        el.style.top = Math.round(home.y) + 'px';
        document.body.appendChild(el);
        _egSnailBroooms.push({
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
    if (!_egSnailBroomTickTimer) {
        _egSnailBroomTickTimer = setInterval(_egSnailBroomTick, EG_SNAIL_BROOM_TICK_MS);
    }
}


// Player walked over the resting broom → pick it up. The icon pins next to
// the player sprite so it looks like it's being held.
function _egSnailPickupBroom(broom) {
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
    broom.el.classList.add('eg-snail-broom-held');
    const lbl = broom.el.querySelector('.eg-snail-broom-label');
    if (lbl) lbl.style.display = 'none';
    host.appendChild(broom.el);
    _egNkToast('eg_snail_broom_picked', '🧹 You grab the broom — you move much slower!', '#a3e635');
}


// Drops a held broom (called on E / the parry key). It respawns at its
// home position outside the grid with a small pop.
function _egSnailDropBroom() {
    const b = _egSnailHeldBroom();
    if (!b) return;
    b.held = false;
    b.heldHost = null;
    b.sweepAcc = 0;
    b.sweepKey = null;
    if (b.sweepFill) {
        try { b.sweepFill.style.width = '0%'; } catch (e) {}
        b.sweepFill = null;
    }
    _egSnailSyncSweepLabel(null);
    b.chargePauseShown = false;
    _egSnailSetChargePauseClass(false);
    b.el.classList.remove('eg-snail-broom-held');
    const lbl = b.el.querySelector('.eg-snail-broom-label');
    if (lbl) lbl.style.display = '';
    document.body.appendChild(b.el);
    b.el.style.position = 'fixed';
    b.el.style.right = 'auto';
    b.el.style.bottom = 'auto';
    b.el.style.zIndex = '';
    b.el.style.left = Math.round(b.homeX) + 'px';
    b.el.style.top = Math.round(b.homeY) + 'px';
    b.el.classList.add('eg-snail-broom-pop');
    setTimeout(() => { try { b.el.classList.remove('eg-snail-broom-pop'); } catch (e) {} }, 450);
}


// 'SWEEPING' label above the player sprite while cleaning (same visual
// language as the DEFUSING / PARRYING labels). pct: sweep progress 0–100;
// the player sprite covers the in-cell fill bar, so the percentage rides
// up here where it always stays readable. Pass null to hide.
function _egSnailSyncSweepLabel(pct) {
    const show = pct != null;
    const hud = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (hud) {
        let lbl = document.getElementById('eg-snail-sweep-label');
        if (show) {
            if (!lbl) {
                lbl = document.createElement('div');
                lbl.id = 'eg-snail-sweep-label';
                lbl.className = 'eg-snail-sweep-label';
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
        const stray = document.getElementById('eg-snail-sweep-label');
        if (stray) stray.remove();
    }
}


// Toggles the charge-bar pause style directly (no broom object needed —
// used by drop/teardown after the held broom has been released).
function _egSnailSetChargePauseClass(active) {
    const bar = document.getElementById('avatar-charge-fill');
    if (bar) bar.classList.toggle('eg-charge-paused', !!active);
    const alt = document.getElementById('eg-player-charge-bar');
    if (alt) alt.classList.toggle('eg-charge-paused', !!active);
}


// Mirrors the charge-bar pause style while the broom is held (the actual
// charge freeze lives in _egTickPlayer). Touches the DOM only on changes.
function _egSnailSyncBroomChargePause(active) {
    const b = _egSnailHeldBroom();
    if (!b) return;
    if (!!active === b.chargePauseShown) return;
    b.chargePauseShown = !!active;
    _egSnailSetChargePauseClass(!!active);
}


// Which slimed cell the player is standing on — deliberately forgiving.
// The hitbox is small and the sprite can straddle two cells, so requiring
// the exact centre pixel to sit inside the goo made cleaning feel broken:
// a slimed cell under ANY meaningful part of the player rect now counts
// (~a quarter of the body over the goo starts/continues a sweep). The cell
// currently being swept is kept while you still overlap it at all, so a
// nudge mid-clean never wipes the progress bar.
function _egSnailSweepTarget(pr, currentKey) {
    if (!pr) return null;
    const prArea = Math.max(1, pr.width * pr.height);
    const pad = 2; // tiny grace so edge cases don't feel frame-perfect
    const box = {
        left: pr.left - pad, right: pr.right + pad,
        top: pr.top - pad, bottom: pr.bottom + pad,
    };
    let best = null, bestArea = 0;
    let keep = null;
    _egSnailSlimed.forEach((entry, key) => {
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


// Shared 100 ms driver: broom pickup by touch, and — while held — the
// sweep mechanic (stand on a slimed cell for EG_SNAIL_SWEEP_MS to clean
// it). Walking off the slime resets the accumulated time.
function _egSnailBroomTick() {
    if (typeof _gamePaused !== 'undefined' && _gamePaused) return;
    if (typeof dead !== 'undefined' && dead) return;
    if (typeof _egIsActive === 'function' && !_egIsActive()) { _egSnailTeardown(); return; }
    if (_egSnailBroooms.length === 0) return;

    // Safety net for grid rebuilds: a puzzle transition rebuilds + fits the
    // board, and layout can settle a beat after the re-home hook ran — so
    // any resting broom left overlapping the grid gets moved out now.
    for (const br of _egSnailBroooms) {
        if (_egSnailRestingBroomOverlapsGrid(br)) {
            _egSnailRehomeBroooms();
            break;
        }
    }

    const pr = (typeof _egNkPlayerRect === 'function') ? _egNkPlayerRect() : null;
    const held = _egSnailHeldBroom();
    _egSnailSyncBroomChargePause(!!held);

    // At rest: pick a broom up when the player walks over it.
    if (!held) {
        if (!pr) return;
        for (const b of _egSnailBroooms) {
            if (b.held) continue;
            const r = b.el.getBoundingClientRect();
            if (r.width && r.height && _egNkRectsOverlap(pr, r)) {
                _egSnailPickupBroom(b);
                return;
            }
        }
        return;
    }

    // Held: sweeping a slimed cell accumulates standing time.
    const b = held;

    // Held: sweeping a slimed cell accumulates standing time.
    const slimed = _egSnailSweepTarget(pr, b.sweepKey);
    const key = slimed ? (slimed.r + '-' + slimed.c) : null;

    if (slimed) {
        b.sweepKey = key;
        b.sweepAcc += EG_SNAIL_BROOM_TICK_MS;
        b.sweepFill = slimed.fill;
        slimed.el.classList.add('eg-snail-slime-sweeping');
        if (slimed.fill) {
            slimed.fill.style.width = Math.min(100, (b.sweepAcc / EG_SNAIL_SWEEP_MS) * 100) + '%';
        }
        _egSnailSyncSweepLabel((b.sweepAcc / EG_SNAIL_SWEEP_MS) * 100);
        if (b.sweepAcc >= EG_SNAIL_SWEEP_MS) {
            _egSnailCleanCell(slimed);
        }
        return;
    }

    // Not on a slimed cell — any in-progress sweep resets.
    if (b.sweepKey) {
        const prev = _egSnailSlimed.get(b.sweepKey);
        if (prev && prev.el) prev.el.classList.remove('eg-snail-slime-sweeping');
        if (prev && prev.fill) prev.fill.style.width = '0%';
        b.sweepKey = null;
        b.sweepFill = null;
        b.sweepAcc = 0;
        _egSnailSyncSweepLabel(null);
    }
}


// A slimed cell was swept for the full duration — wipe it with a green
// flash.
function _egSnailCleanCell(entry) {
    const b = _egSnailHeldBroom();
    if (!b) return;
    b.sweepKey = null;
    b.sweepAcc = 0;
    b.sweepFill = null;
    entry.el.classList.remove('eg-snail-slime-sweeping');
    entry.el.classList.add('eg-snail-slime-cleaned');
    setTimeout(() => { try { entry.el.remove(); } catch (e) {} }, 600);
    _egSnailSlimed.delete(entry.r + '-' + entry.c);
    _egSnailSyncSweepLabel(null);
    _egNkToast('eg_snail_cleaned', '🧹 Slimed cell cleaned!', '#a3e635');
}


// A chained/arena puzzle transition just rebuilt the grid (see
// _egTransitionToChainPuzzle in endgame-encounter-chain.js): every slimed
// cell's overlay died with the old table, so drop the stale map entries —
// otherwise they would block the NEW puzzle's cells sight-unseen. The
// roaming snail gets a fresh slate too (slime budget + cell memory reset)
// so it visibly slimed the new grid, and the broom is re-homed outside it.
function _egSnailOnPuzzleTransition() {
    const held = _egSnailHeldBroom();
    if (held) {
        held.sweepAcc = 0;
        held.sweepKey = null;
        held.sweepFill = null;
        _egSnailSyncSweepLabel(null);
    }
    if (_egSnailBroooms.length > 0) {
        // New grid is already in the DOM — spread every resting broom
        // around the OUTSIDE of it. Held brooms just remember the fresh
        // home so their next drop lands outside the puzzle too.
        _egSnailRehomeBroooms();
    }
    const st = _egSnailDoom;
    if (st) {
        st.slimeDropped = 0;
        st.lastCellKey = null;
    }
    // An active Snailgeddon RING is anchored to the OLD grid's centre — end
    // it so the fresh puzzle starts clean. (The countdown phase survives:
    // it re-centres itself on every tick.)
    const gd2 = _egSnailgeddon;
    if (gd2 && gd2.phase === 'ring') _egSnailgeddonEnd(gd2);
    Array.from(_egSnailSlimed.values()).forEach(entry => {
        try { entry.el.remove(); } catch (e) {}
    });
    _egSnailSlimed.clear();
}


// Tears down every Snail-owned field effect (slimes, broom, driver).
// Called from _egBossCleanup on boss death / encounter stop. The doom
// snail's nk run is killed by _egNkTeardownBoss; its onKill clears
// _egSnailDoom too, so this is idempotent.
function _egSnailTeardown() {
    if (_egSnailBroomTickTimer) {
        clearInterval(_egSnailBroomTickTimer);
        _egSnailBroomTickTimer = null;
    }
    _egSnailDoom = null;
    _egSnailNextDoomAt = null; // banish cooldown is per-encounter
    // Snailgeddon: cancel any countdown/ring still up. Its nk run is
    // normally killed first by _egNkTeardownBoss — kill it defensively here
    // too (killRun + onKill are idempotent).
    const gd = _egSnailgeddon;
    if (gd) {
        if (gd.cdTimer) clearInterval(gd.cdTimer);
        if (gd.overlay) { try { gd.overlay.remove(); } catch (e) {} }
        _egSnailgeddonDropShield(gd);
        if (gd.run) { try { _egNkKillRun(gd.run); } catch (e) {} }
        _egSnailgeddon = null;
    }
    Array.from(_egSnailSlimed.values()).forEach(entry => {
        try { entry.el.remove(); } catch (e) {}
    });
    _egSnailSlimed.clear();
    _egSnailBroooms.forEach(b => {
        try { b.el.remove(); } catch (e) {}
    });
    _egSnailBroooms = [];
    _egSnailSyncSweepLabel(null);
    _egSnailSetChargePauseClass(false);
}


//------------------------------------------------------------------------
//-------------------MECHANIC: DOOM SNAIL--------------------------------
//------------------------------------------------------------------------
// The classic homing snail, reworked: it no longer despawns. The ONLY way
// to remove it is to lure it into a corrupted grid cell — the collision
// destroys the snail AND cleans that cell's corruption. While it chases
// you it randomly slimed the cells it crawls over.

function _egMechDoomSnail(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    if (_egSnailDoom) return; // only one doom snail follows at a time
    if (_egSnailNextDoomAt && Date.now() < _egSnailNextDoomAt) return; // post-banish cooldown
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const speed = [0, 42, 52, 64][p];
    const radius = 34;
    const dmgPct = [0, 0.26, 0.30, 0.36][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-snail', '🐌');
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
    _egSnailDoom = state;
    _egSnailEnsureBroom(); // the broom waits outside the grid
    run.onKill = () => { if (_egSnailDoom === state) _egSnailDoom = null; };
    _egNkToast('eg_mech_snail',
        '🐌 The Snail: Doom Snail! It never leaves — crash it into a corrupted cell!', '#f59e0b');
    _egNkLoop(run, (dtS, now) => {
        const c = _egNkPlayerCenter();
        if (c) {
            const dx = c.x - state.x, dy = c.y - state.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            state.x += (dx / d) * state.speed * dtS;
            state.y += (dy / d) * state.speed * dtS;
        }
        state.el.style.transform = 'translate(' + Math.round(state.x - 30) + 'px,' + Math.round(state.y - 30) + 'px)';

        // Contact damage (existing behaviour).
        if (c && now >= state.hitCdUntil && _egNkDotHit(state.el, _egNkPlayerRect(), 0)) {
            state.hitCdUntil = now + 1500;
            const dealt = _egNkHit(state.dmgPct, null, state.level);
            _egNkAbilityHitToast(dealt, 'The Snail', 'Doom Snail');
        }

        // Randomly slime cells while crawling over the grid.
        _egSnailTrySlime(state, now);

        // The only escape: crash it into a corrupted cell → banished.
        if (_egSnailCrashIntoCorruption(state)) return false;

        return true; // no duration — it follows until it dies
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
//      hugs just outside the puzzle's edges — no snail starts on a cell,
//      and the whole ring stays on screen for any arena.
//   3. The frame collapses inward on the centre. Touching the ring hits
//      hard — one hit per ring-wide cooldown (never a multi-snail burst)
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

const EG_SNAILGEDDON_CD_MS = 800;        // per countdown tick
const EG_SNAILGEDDON_TICKS = 5;          // 5 … 1
const EG_SNAILGEDDON_FRAME_PAD = 46;     // the frame sits this far outside the grid's edges
const EG_SNAILGEDDON_CORNER_R = 30;      // rounded-corner radius of the frame
const EG_SNAILGEDDON_SPACING_PX = 96;    // target centre-to-centre spacing along the frame
const EG_SNAILGEDDON_N_MIN = 16;         // snails forming the frame (min)
const EG_SNAILGEDDON_N_MAX = 56;         // snails forming the frame (max, giant arenas)
const EG_SNAILGEDDON_CLOSE_S = 4.0;      // fast ring reaches the centre in ~this many seconds
const EG_SNAILGEDDON_SLOW_MULT = 0.20;   // lagging snails crawl at this fraction of ring speed
const EG_SNAILGEDDON_SLOW_ARC_MIN = 3;   // consecutive laggards forming the gap wedge (min)
const EG_SNAILGEDDON_SLOW_ARC_MAX = 8;   // … (max, huge arenas)
const EG_SNAILGEDDON_GAP_MARGIN_PX = 60; // extra clearance past the player's hitbox in the gap
const EG_SNAILGEDDON_RUN_SPEED_PX = 300; // assumed player run speed used when sizing the gap
const EG_SNAILGEDDON_MAX_MS = 6500;      // hard cap: the boss can never stay immune forever
const EG_SNAILGEDDON_DMG_PCT = 0.14;     // heavy contact damage per snail hit
const EG_SNAILGEDDON_HIT_CD_MS = 1000;   // ring-WIDE contact cooldown — never more than one hit
                                         // per window, even when several snails overlap at once
const EG_SNAILGEDDON_NUDGE_PX = 70;      // knockback toward the centre per wall hit
const EG_SNAILGEDDON_NUDGE_MIN_DIST = 90;  // skip the shove when the player already hugs the centre
const EG_SNAILGEDDON_SNAIL_RECOIL_PX = 80; // the snail that lands a hit bounces back out along its radial
const EG_SNAILGEDDON_ESCAPE_PX = 26;     // how far past the frame outline counts as escaped


let _egSnailgeddon = null;
// { monsterId, phase: 'countdown'|'ring', cdTimer, overlay, shield, shieldRaf,
//   count, cx, cy, hx, hy, cr, nextHitAt, run, escaped, finished, startedAt }


// True from the moment the countdown starts until the Snailgeddon is
// over. Read by _egTickPlayer (endgame-encounter.js) to freeze the auto-
// attack charge bar for the whole set-piece.
function _egSnailgeddonActive() {
    return !!_egSnailgeddon && !_egSnailgeddon.finished;
}


// Amber immunity dome hovering over the boss's card while Snailgeddon
// runs. The boss holds bossImmune for the whole set-piece (set by the ≤20%
// transition, released in _egSnailgeddonEnd), and this bubble makes that
// readable at a glance on top of the IMMUNE badge / blocked-hit flash. Like
// the Jelly Ice Shell bubble it is a FIXED element repositioned every frame
// over the card (`.eg-emoji-wrapper`), so monster-panel re-renders can't
// orphan it, and it self-removes when the set-piece ends on ANY path.
// Positions the dome over the card's emoji (hidden when the card is not
// currently on screen). Both the synchronous first placement and the
// per-frame driver share this, so the shield is visible the instant the
// countdown starts — no waiting for the next animation frame.
function _egSnailgeddonPlaceShield(g, s) {
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? card.querySelector('.eg-emoji-wrapper') : null;
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

function _egSnailgeddonShowShield(g) {
    if (!g || g.shield) return;
    const s = document.createElement('div');
    s.className = 'eg-snail-shield';
    s.style.display = 'none';
    document.body.appendChild(s);
    g.shield = s;
    _egSnailgeddonPlaceShield(g, s); // visible immediately
    const step = () => {
        // Gone (End ran, encounter stopped, boss died, …) → clean up here
        // too so no path can strand a ghost bubble over nothing.
        if (!_egSnailgeddon || _egSnailgeddon !== g || g.finished) {
            g.shield = null;
            g.shieldRaf = 0;
            try { s.remove(); } catch (e) {}
            return;
        }
        _egSnailgeddonPlaceShield(g, s);
        g.shieldRaf = requestAnimationFrame(step);
    };
    g.shieldRaf = requestAnimationFrame(step);
}


// Stops the shield driver and removes the bubble (idempotent).
function _egSnailgeddonDropShield(g) {
    if (!g) return;
    if (g.shieldRaf) { try { cancelAnimationFrame(g.shieldRaf); } catch (e) {} }
    g.shieldRaf = 0;
    if (g.shield) { try { g.shield.remove(); } catch (e) {} }
    g.shield = null;
}


// Grid-centre screen point (play cells only; corners measured live so it
// tracks puzzle transitions). Carries the arena's LOGICAL size too — the
// rows × cols of cur.grid — so the ring can be shaped by the puzzle's
// actual dimensions instead of a pixel shortcut.
function _egSnailGridCentre() {
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
// EG_SNAILGEDDON_FRAME_PAD beyond the puzzle's edges. A rounded-rect frame
// can always clear the whole puzzle (a circle around a near-fullscreen
// arena cannot — its far corner cells sit beyond any on-screen radius), and
// the corner arcs keep the frame from poking out diagonally.

// Outline length of the rounded rect (used for even snail spacing).
function _egSnailRRPerimeter(hx, hy, cr) {
    return 4 * (hx + hy) - (8 - 2 * Math.PI) * cr;
}

// Point on the outline at arc-length s, walking clockwise from the
// top-left end of the top straight edge. s may be any real number
// (negative/≥ perimeter get wrapped).
function _egSnailFramePoint(cx, cy, hx, hy, cr, s) {
    const perim = _egSnailRRPerimeter(hx, hy, cr);
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
function _egSnailRRContains(px, py, cx, cy, hx, hy, cr) {
    const ax = Math.abs(px - cx), ay = Math.abs(py - cy);
    const dx = Math.max(0, ax - (hx - cr));
    const dy = Math.max(0, ay - (hy - cr));
    return dx * dx + dy * dy <= cr * cr;
}


// Small "pop" when a snail disappears (independent of the nk run so it can
// never be stranded by run cleanup — it self-removes).
function _egSnailgeddonBurst(x, y) {
    const s = document.createElement('div');
    s.className = 'eg-snail-squish';
    s.textContent = '🐌💨';
    s.style.left = Math.round(x) + 'px';
    s.style.top = Math.round(y) + 'px';
    document.body.appendChild(s);
    setTimeout(() => { try { s.remove(); } catch (e) {} }, 800);
}


// Places/re-places the countdown overlay at the current grid centre.
function _egSnailgeddonPlaceOverlay(g) {
    const ov = g.overlay;
    if (!ov) return;
    const c = _egSnailGridCentre();
    ov.style.left = Math.round(c ? c.x : window.innerWidth / 2) + 'px';
    ov.style.top = Math.round(c ? c.y : window.innerHeight / 2) + 'px';
    const num = ov.querySelector('.eg-snailgeddon-cd-num');
    if (num) num.textContent = g.count;
}


// Builds the countdown overlay (label + number + hint), localised.
function _egSnailgeddonShowOverlay(g) {
    const ov = document.createElement('div');
    ov.className = 'eg-snailgeddon-cd';
    ov.id = 'eg-snailgeddon-cd';
    ov.innerHTML =
        '<div class="eg-snailgeddon-cd-label"></div>' +
        '<div class="eg-snailgeddon-cd-num"></div>' +
        '<div class="eg-snailgeddon-cd-hint"></div>';
    document.body.appendChild(ov);
    g.overlay = ov;
    const rawLabel = t('eg_snailgeddon_cd_label');
    const rawHint = t('eg_snailgeddon_hint');
    ov.querySelector('.eg-snailgeddon-cd-label').textContent =
        (rawLabel && rawLabel !== 'eg_snailgeddon_cd_label') ? rawLabel : 'SNAILGEDDON IN';
    ov.querySelector('.eg-snailgeddon-cd-hint').textContent =
        (rawHint && rawHint !== 'eg_snailgeddon_hint') ? rawHint : 'The ring is closing — one side lags behind. Escape through the gap!';
    _egSnailgeddonPlaceOverlay(g);
}


// Phase-enter hook: phase 4 (≤20% HP) is the Snailgeddon takeover — the
// boss owns its immunity release. Other phases fall through to the default
// transition handling.
function _egSnailOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 4) return false;
    try {
        _egSnailgeddonStart(monster);
    } catch (e) {
        // A buggy start must never wedge the boss immune forever.
        try { _egSnailgeddonEnd(_egSnailgeddon); } catch (e2) {}
        if (monster && monster.bossImmune) {
            monster.bossImmune = false;
            try { _egBossScheduleMechanics(monster, 4); } catch (e3) {}
        }
    }
    return true; // take over the phase either way
}


// Starts the countdown phase. The boss stays immune (set by the phase
// transition) until the whole set-piece finishes.
function _egSnailgeddonStart(monster) {
    if (_egSnailgeddon || !monster) return;

    // Clean slate: the doom snail and the broom have no place here — drop
    // the broom and banish the roaming snail so the swarm owns the screen.
    if (_egSnailDoom) { try { _egNkKillRun(_egSnailDoom.run); } catch (e) {} }
    if (_egSnailBroomHeld()) _egSnailDropBroom();

    // The auto-attack charge bar freezes for the WHOLE set-piece (countdown
    // included) — Snailgeddon is a dodge-and-run phase, not free damage
    // time. _egTickPlayer gates on _egSnailgeddonActive(); mirror the pause
    // visually here.
    _egSnailSetChargePauseClass(true);

    const g = {
        monsterId: monster.id,
        phase: 'countdown',
        cdTimer: null,
        overlay: null,
        shield: null,
        shieldRaf: 0,
        count: EG_SNAILGEDDON_TICKS,
        cx: 0, cy: 0, hx: 0, hy: 0, cr: 0,
        nextHitAt: 0,
        run: null,
        escaped: false,
        finished: false,
        startedAt: 0,
    };
    _egSnailgeddon = g;
    _egSnailgeddonShowOverlay(g);
    _egSnailgeddonShowShield(g); // immune dome over the boss card

    g.cdTimer = setInterval(() => {
        if (!_egSnailgeddon || _egSnailgeddon !== g || g.finished) return;
        if (_egNkFrozen()) return; // pause / death / inactive hold the count
        g.count--;
        if (g.count <= 0) {
            clearInterval(g.cdTimer);
            g.cdTimer = null;
            _egSnailgeddonGo(g, monster);
            return;
        }
        const num = g.overlay && g.overlay.querySelector('.eg-snailgeddon-cd-num');
        if (num) num.textContent = g.count;
        _egSnailgeddonPlaceOverlay(g); // re-centre in case the grid moved
    }, EG_SNAILGEDDON_CD_MS);
}


// Countdown finished: teleport the player to the grid centre and spawn the
// closing ring of snails — a rounded-rect FRAME hugging just outside the
// puzzle's edges.
function _egSnailgeddonGo(g, monster) {
    if (!g || g.finished) return;
    g.phase = 'ring';
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }

    const centre = _egSnailGridCentre();
    const cx = centre ? centre.x : window.innerWidth / 2;
    const cy = centre ? centre.y : window.innerHeight / 2;
    const level = monster ? monster.level : 1;

    // Frame geometry: the grid's half extents padded by a snail-body gap,
    // with rounded corners so the frame never pokes out diagonally. Since
    // it hugs the puzzle itself, it clears every cell AND stays on screen
    // no matter how large the arena is.
    const hx = Math.max(80, (centre ? centre.w : 600) / 2 + EG_SNAILGEDDON_FRAME_PAD);
    const hy = Math.max(80, (centre ? centre.h : 450) / 2 + EG_SNAILGEDDON_FRAME_PAD);
    const cr = Math.max(8, Math.min(EG_SNAILGEDDON_CORNER_R, Math.min(hx, hy) - 16));
    g.cx = cx; g.cy = cy; g.hx = hx; g.hy = hy; g.cr = cr;

    // Teleport the player to the centre, then re-measure and correct once:
    // the wrapper's top-left sits a few px off the hitbox centre (HP bars),
    // so a single offset can't align both avatar modes.
    const pr = (typeof _egNkPlayerRect === 'function') ? _egNkPlayerRect() : null;
    if (typeof _egTeleportAvatarTo === 'function') {
        try {
            const bw = pr ? pr.width / 2 : 22;
            const bh = pr ? pr.height / 2 : 45;
            _egTeleportAvatarTo(cx - bw, cy - bh);
            const pc = (typeof _egNkPlayerCenter === 'function') ? _egNkPlayerCenter() : null;
            if (pc) _egTeleportAvatarTo(cx - bw + (cx - pc.x), cy - bh + (cy - pc.y));
        } catch (e) {}
    }

    // Spawn the swarm: evenly spaced ALONG the frame outline, so the wall
    // is just as solid around a small arena as a giant one. All snails race
    // the centre along their own radial line; a contiguous WEDGE of them
    // crawls at SLOW_MULT and its lag tears the escape gap.
    const perim = _egSnailRRPerimeter(hx, hy, cr);
    const N = Math.max(EG_SNAILGEDDON_N_MIN,
        Math.min(EG_SNAILGEDDON_N_MAX, Math.round(perim / EG_SNAILGEDDON_SPACING_PX)));
    // Escape-gap guarantee: the wedge opens (arc + 1) frame slots in the
    // closing wall. A single laggard only leaves ~2 slots — smaller than
    // the player's hitbox by the time they reach the ring on large arenas.
    // Size the wedge so the passable gap stays ≥ hitbox width + margin in
    // the worst case: the player sprints from the centre to the farthest
    // frame point and arrives after the ring has shrunk to
    // sF = speed·T / (speed·T + ρ); the gap is (arc+1)·slot·sF − 60 (two
    // snail bodies at the wedge's edges).
    const pr0 = (typeof _egNkPlayerRect === 'function') ? _egNkPlayerRect() : null;
    const playerW = pr0 && pr0.width > 0 ? pr0.width : 52;
    const slot = perim / N;
    const rhoWorst = Math.hypot(hx, hy) + 10;
    const sFmin = (EG_SNAILGEDDON_RUN_SPEED_PX * EG_SNAILGEDDON_CLOSE_S)
        / (EG_SNAILGEDDON_RUN_SPEED_PX * EG_SNAILGEDDON_CLOSE_S + rhoWorst);
    const need = playerW + EG_SNAILGEDDON_GAP_MARGIN_PX + 60;
    let slowArc = EG_SNAILGEDDON_SLOW_ARC_MAX;
    for (let a = EG_SNAILGEDDON_SLOW_ARC_MIN; a <= EG_SNAILGEDDON_SLOW_ARC_MAX; a++) {
        if ((a + 1) * slot * sFmin - 60 >= need) { slowArc = a; break; }
    }
    const slowStart = Math.floor(Math.random() * N);
    const s0 = Math.random() * perim;

    const run = _egNkNewRun(g.monsterId, true);
    g.run = run;
    g.startedAt = performance.now();
    const swarm = [];
    for (let i = 0; i < N; i++) {
        const p = _egSnailFramePoint(cx, cy, hx, hy, cr, s0 + (i / N) * perim);
        const a = Math.atan2(p.y - cy, p.x - cx);
        const rho = Math.hypot(p.x - cx, p.y - cy);
        const slow = ((i - slowStart + N) % N) < slowArc;
        const el = _egNkEl(run, 'div',
            'eg-nk-dot eg-nk-snail eg-snailgeddon-swarm' + (slow ? ' eg-snailgeddon-slow' : ''), '🐌');
        el.style.transform = 'translate(' + Math.round(p.x - 30) + 'px,' + Math.round(p.y - 30) + 'px)';
        swarm.push({ el, a, rho, rho0: rho, mult: slow ? EG_SNAILGEDDON_SLOW_MULT : 1, x: p.x, y: p.y, alive: true });
    }
    g.slowArc = slowArc;
    g.slowStart = slowStart;
    g.snailMeta = { n: N, s0: s0, perim: perim, slot: slot, sFmin: sFmin };
    g.gapPx = Math.round((slowArc + 1) * slot * sFmin - 60);

    _egNkToast('eg_snailgeddon_go',
        '🐌 The Snail: SNAILGEDDON! Escape through the gap in the ring!', '#f87171');

    run.onKill = () => { if (_egSnailgeddon === g) _egSnailgeddon = null; };

    const Tms = EG_SNAILGEDDON_CLOSE_S * 1000;
    _egNkLoop(run, (dtS, now) => {
        if (!_egSnailgeddon || _egSnailgeddon !== g || g.finished) return false;
        const pr2 = _egNkPlayerRect();
        const pc = _egNkPlayerCenter();
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
                _egSnailgeddonBurst(cx, cy);
                arrived++;
                continue;
            }
            s.el.style.transform = 'translate(' + Math.round(s.x - 30) + 'px,' + Math.round(s.y - 30) + 'px)';
        }

        // The frame is a wall: heavy contact damage. Hits run on ONE
        // ring-wide cooldown, not per snail — several snails can overlap the
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
                if (!s.alive || !_egNkDotHit(s.el, pr2, 0)) continue;
                g.nextHitAt = now + EG_SNAILGEDDON_HIT_CD_MS;
                const dealt = _egNkHit(EG_SNAILGEDDON_DMG_PCT, null, level);
                _egNkAbilityHitToast(dealt, 'The Snail', 'Snailgeddon');
                s.rho = Math.min(s.rho0, s.rho + EG_SNAILGEDDON_SNAIL_RECOIL_PX);
                const d = Math.hypot(pc.x - cx, pc.y - cy) || 1;
                if (typeof _egNkNudgeAvatar === 'function' && d >= EG_SNAILGEDDON_NUDGE_MIN_DIST) {
                    try {
                        _egNkNudgeAvatar(((cx - pc.x) / d) * EG_SNAILGEDDON_NUDGE_PX,
                            ((cy - pc.y) / d) * EG_SNAILGEDDON_NUDGE_PX);
                    } catch (e) {}
                }
                break; // one hit per window — never a multi-snail burst
            }
        }

        // Escaped through the gap → being beyond the frame outline counts
        // as out; the swarm gives up and pops.
        if (pc && !g.escaped && !_egSnailRRContains(pc.x, pc.y, cx, cy,
                hx + EG_SNAILGEDDON_ESCAPE_PX, hy + EG_SNAILGEDDON_ESCAPE_PX, cr + EG_SNAILGEDDON_ESCAPE_PX)) {
            g.escaped = true;
            swarm.forEach(s => { if (s.alive) { s.alive = false; _egSnailgeddonBurst(s.x, s.y); } });
            _egSnailgeddonEnd(g);
            return false;
        }

        // Frame fully collapsed (all fast snails in; the lagging wedge
        // alone can't wall anyone off) or the hard cap hit → end either way.
        if (elapsed >= EG_SNAILGEDDON_MAX_MS || arrived >= N - slowArc) {
            swarm.forEach(s => { if (s.alive) { s.alive = false; _egSnailgeddonBurst(s.x, s.y); } });
            _egSnailgeddonEnd(g);
            return false;
        }
        return true;
    });
}


// Ends the Snailgeddon and hands the phase back to the boss: clears every
// piece of state, drops the immunity held since the ≤20% transition, and
// resumes the normal phase-4 mechanic schedule.
function _egSnailgeddonEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    _egSnailgeddonDropShield(g);
    if (g.run) { try { _egNkKillRun(g.run); } catch (e) {} g.run = null; }

    const m = (g.monsterId && typeof _egMonsters !== 'undefined')
        ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossPhase === 4 && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _egBossScheduleMechanics === 'function') {
            try { _egBossScheduleMechanics(m, 4); } catch (e) {}
        }
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
    }
    // Charge bar unfreezes — the mechanic is over (also cleared defensively
    // by _egSnailTeardown if the encounter dies mid-set-piece).
    _egSnailSetChargePauseClass(false);
    _egNkToast(g.escaped ? 'eg_snailgeddon_escaped' : 'eg_snailgeddon_over',
        g.escaped ? '💨 You escaped the Snailgeddon!' : '🐌 The Snailgeddon closes in — the swarm collapses.',
        g.escaped ? '#4ade80' : '#f59e0b');
    if (_egSnailgeddon === g) _egSnailgeddon = null;
}


// Wire the ≤20% HP finisher into the mechanics def (extra phase + the
// phase-enter hook). Done at the end of the file so the whole set-piece
// stays in one place.
EG_BOSS_MECHANICS.boss_snail.phases.push({ threshold: 0.20, chargeMax: 8, damageMultiplier: 1.7 });
EG_BOSS_MECHANICS.boss_snail.onPhaseEnter = _egSnailOnPhaseEnter;
