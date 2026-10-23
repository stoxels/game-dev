import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE FROSTWRIGHT (boss_shaper)------------------------
//------------------------------------------------------------------------
// The sculptor of winter. Everything on the field is a dodge, and the boss
// is never made immune by a puzzle shield (the old Soul Tithe is gone):
//  - GLACIER RIFT: an ice wall sweeps the arena with green SAFE LANES cut
//    into it. Stand in a lane while it passes. Later phases send more walls.
//  - ICICLE VOLLEY: red rings mark where icicles land. One is aimed at you.
//  - FROZEN CELLS (shared): locks on the puzzle grid.
//  - BLIZZARD (60%+): the cold bites unless you stand in a warm ring.
//  - FROST MONOLITHS (60%+): ram them to stop their walls.
//  - ICE WALKERS (60%+): stalkers that shatter on contact.
// At 10%: THE SHAPED WINTER (boss-shaper-winter.js).
//
// Icicles and the blizzard live in boss-shaper-ice.js, the monoliths and
// walkers in boss-shaper-guards.js, the finale in boss-shaper-winter.js.
//------------------------------------------------------------------------

// DEBUG: stretch telegraphs/windups 2.5x for screenshots. Off for ship.
export const _SHP_DEBUG_SLOW = false;
export const _SHP_DEBUG_MULT = _SHP_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_shaper: {
        id: 'boss_shaper', name: 'The Frostwright', emoji: '❄️',
        baseHP: 1060, baseDamage: 22, chargeMax: 12,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_shaper: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'glacier_rift', intervalBase: 21000, intervalVariance: 4500, handler: '_mechShpRift' },
            { name: 'icicle_volley', intervalBase: 17000, intervalVariance: 4000, handler: '_mechShpIcicles' },
            { name: 'frozen_cells', intervalBase: 19000, intervalVariance: 4000, handler: '_mechFrozenCells' },
            { name: 'blizzard', intervalBase: 30000, intervalVariance: 5000, handler: '_mechShpBlizzard', phase2Only: true },
            { name: 'frost_monoliths', intervalBase: 28000, intervalVariance: 5000, handler: '_mechShpMonoliths', phase2Only: true },
            { name: 'ice_walker', intervalBase: 32000, intervalVariance: 6000, handler: '_mechShpWalker', phase2Only: true },
        ],
        // onInit (the SHAPED WINTER watcher) is attached by boss-shaper-winter.js.
    },
});


//------------------------------------------------------------------------
//-------------------SHARED HELPERS (also used by the other shaper files)-------
//------------------------------------------------------------------------

const SHP_NAME = 'The Frostwright';
export const SHP_COLOR = '#7dd3fc';
const SHP_HIT_CD_MS = 700;              // touch hazards bite at most this often
let _shpHitCd = 0;

// Player centre, falling back to the screen middle when it can't be read.
export function _shpPC() {
    return _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

// Cold hit on the player with a shared touch cooldown (a hazard that keeps
// touching you cannot machine-gun). force skips the cooldown.
export function _shpTouch(pct, level, label, force) {
    const now = performance.now();
    if (!force && now < _shpHitCd) return false;
    if (!_nkPlayerCenter()) return false;
    _shpHitCd = now + SHP_HIT_CD_MS;
    const dealt = _nkHit(pct, 'cold', level);
    _nkAbilityHitToast(dealt, SHP_NAME, label);
    return true;
}

// Ice-shard burst where a shatter/eruption lands (visual only, body-level
// so it survives the run ending in the same frame).
export function _shpShards(x, y, big) {
    const layer = document.createElement('div');
    layer.className = 'sx-shp-shards' + (big ? ' sx-shp-shards-big' : '');
    layer.style.left = Math.round(x) + 'px';
    layer.style.top = Math.round(y) + 'px';
    document.body.appendChild(layer);
    for (let i = 0; i < (big ? 12 : 7); i++) {
        const s = document.createElement('div');
        s.className = 'sx-shp-shard';
        const ang = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * (big ? 88 : 48);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 26) + 'px');
        s.style.setProperty('--rot', Math.round((Math.random() * 2 - 1) * 420) + 'deg');
        s.style.animationDelay = (Math.random() * 100) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) { /* already cleaned up */ } }, _SHP_DEBUG_SLOW ? 1900 : 950);
}

// Centres a fixed-position element on (x, y).
export function _shpPlace(el, x, y, halfW, halfH) {
    el.style.left = Math.round(x - halfW) + 'px';
    el.style.top = Math.round(y - halfH) + 'px';
}


//------------------------------------------------------------------------
//-------------------MECHANIC: GLACIER RIFT--------------------------------
//------------------------------------------------------------------------
// A wall of ice sweeps the arena. It is far faster than you can run, so the
// only answer is a SAFE LANE: green strips (with arrows showing which way
// the wall travels) cut through red-hatched danger ground. A lane always
// opens within reach of you. The wall hits once, then is gone.
// Phase 2 sends a second wall from the other side, phase 3 follows it with
// a wall from above or below (new lanes each time).

// Tuning, indexed by boss phase (1..3).
const RIFT_WALLS = [0, 1, 2, 2];             // walls per cast
const RIFT_LANES = [0, 3, 3, 2];             // safe lanes per wall
const RIFT_LANE_HALF = [0, 76, 70, 66];      // px from a lane's centre that is still safe
const RIFT_WARN_MS = [0, 1500, 1350, 1250];  // lanes shown this long before the wall rises
const RIFT_SWEEP_MS = [0, 2300, 2050, 1850]; // time for the wall to cross the arena
const RIFT_DMG = [0, 0.16, 0.18, 0.20];      // %maxHP for being caught by the wall
const RIFT_BAND = 150;                       // px thickness of the wall
const RIFT_REACH = 190;                      // the nearest lane opens within this many px of you
const RIFT_BETWEEN_MS = 700;                 // pause between two walls of one cast
const RIFT_LANE_PAD = 40;                    // lanes keep this much ground between them

// Direction table: which axis the wall travels along and which way.
const RIFT_DIRS = {
    right: { x: true, sign: 1 },
    left: { x: true, sign: -1 },
    down: { x: false, sign: 1 },
    up: { x: false, sign: -1 },
};

// The walls of one cast, in order, as direction names.
function _riftPlan(p) {
    const first = Math.random() < 0.5 ? 'right' : 'left';
    if (RIFT_WALLS[p] < 2) return [first];
    if (p < 3) return [first, first === 'right' ? 'left' : 'right'];
    return [first, Math.random() < 0.5 ? 'up' : 'down'];
}

// Lane centres across a wall's width: the first sits within reach of the
// player (measured across the wall), the rest spread out beyond it.
function _riftLanes(count, half, span, nearAt) {
    const lo = half + 14, hi = span - half - 14;
    const clampLane = (v) => Math.max(lo, Math.min(hi, v));
    const lanes = [clampLane(nearAt + (Math.random() * 2 - 1) * RIFT_REACH)];
    for (let tries = 0; lanes.length < count && tries < 60; tries++) {
        const c = lo + Math.random() * (hi - lo);
        if (lanes.every(o => Math.abs(o - c) > half * 2 + RIFT_LANE_PAD)) lanes.push(c);
    }
    return lanes.sort((a, b) => a - b);
}

// The danger stretches between the lanes, as [from, to] pairs across the wall.
function _riftDangerSpans(lanes, half, total) {
    const spans = [];
    let from = 0;
    lanes.forEach(c => {
        if (c - half > from) spans.push([from, c - half]);
        from = c + half;
    });
    if (from < total) spans.push([from, total]);
    return spans;
}

// Places a rectangle that runs the full length of the sweep (along it) and
// covers [a, b] across it.
function _riftStrip(el, dir, a, b) {
    const d = RIFT_DIRS[dir];
    if (d.x) {
        el.style.left = '0px'; el.style.width = window.innerWidth + 'px';
        el.style.top = Math.round(a) + 'px'; el.style.height = Math.round(b - a) + 'px';
    } else {
        el.style.top = '0px'; el.style.height = window.innerHeight + 'px';
        el.style.left = Math.round(a) + 'px'; el.style.width = Math.round(b - a) + 'px';
    }
}

// Telegraph: red-hatched danger ground, green lanes with travelling arrows,
// and a glowing crack along the edge the wall rises from.
function _riftTelegraph(run, dir, lanes, half, total) {
    const els = [];
    _riftDangerSpans(lanes, half, total).forEach(([a, b]) => {
        const zone = _nkEl(run, 'div', 'sx-shp-rift-zone');
        _riftStrip(zone, dir, a, b);
        els.push(zone);
    });
    lanes.forEach(c => {
        const lane = _nkEl(run, 'div', 'sx-shp-lane sx-shp-lane-' + dir);
        _riftStrip(lane, dir, c - half, c + half);
        els.push(lane);
    });
    const d = RIFT_DIRS[dir];
    const edge = _nkEl(run, 'div', 'sx-shp-rift-edge sx-shp-rift-edge-' + dir);
    if (d.x) edge.style.height = window.innerHeight + 'px';
    else edge.style.width = window.innerWidth + 'px';
    els.push(edge);
    return els;
}

// One jagged slab of the wall, drawn as an SVG polygon whose leading edge
// is a row of ice teeth. `v0..v1` is the stretch across the wall.
function _riftSlab(dir, v0, v1) {
    const d = RIFT_DIRS[dir];
    const B = RIFT_BAND, len = v1 - v0, tooth = 28, depth = 22;
    // local coords: u along travel (0 = back, B = front), v across.
    const pts = [[0, 0], [B - depth, 0]];
    for (let v = 0; v < len; v += tooth) {
        pts.push([B, Math.min(len, v + tooth / 2)]);
        pts.push([B - depth, Math.min(len, v + tooth)]);
    }
    pts.push([0, len]);
    const map = ([u, v]) => (d.x ? [d.sign > 0 ? u : B - u, v] : [v, d.sign > 0 ? u : B - u]);
    const poly = pts.map(map).map(p => p[0].toFixed(0) + ',' + p[1].toFixed(0)).join(' ');
    const w = d.x ? B : len, h = d.x ? len : B;
    const front = d.sign > 0;
    const grad = d.x
        ? (front ? 'x1="0" x2="1" y1="0" y2="0"' : 'x1="1" x2="0" y1="0" y2="0"')
        : (front ? 'x1="0" x2="0" y1="0" y2="1"' : 'x1="0" x2="0" y1="1" y2="0"');
    const id = 'shpg' + Math.floor(Math.random() * 1e9);
    const holder = document.createElement('div');
    holder.className = 'sx-shp-slab';
    holder.style.width = w + 'px';
    holder.style.height = h + 'px';
    if (d.x) holder.style.top = Math.round(v0) + 'px';
    else holder.style.left = Math.round(v0) + 'px';
    holder.innerHTML = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">'
        + '<defs><linearGradient id="' + id + '" ' + grad + '>'
        + '<stop offset="0" stop-color="#1e3a8a" stop-opacity="0.55"/>'
        + '<stop offset="0.6" stop-color="#7dd3fc" stop-opacity="0.8"/>'
        + '<stop offset="1" stop-color="#f0f9ff" stop-opacity="0.97"/></linearGradient></defs>'
        + '<polygon points="' + poly + '" fill="url(#' + id + ')" stroke="#e0f2fe" stroke-width="2.5" stroke-linejoin="round"/>'
        + '</svg>';
    return holder;
}

// The live wall: one box that travels, holding a slab per danger stretch.
function _riftWall(run, dir, lanes, half, total) {
    const d = RIFT_DIRS[dir];
    const box = _nkEl(run, 'div', 'sx-shp-wall-box');
    if (d.x) { box.style.width = RIFT_BAND + 'px'; box.style.height = window.innerHeight + 'px'; }
    else { box.style.height = RIFT_BAND + 'px'; box.style.width = window.innerWidth + 'px'; }
    _riftDangerSpans(lanes, half, total).forEach(([a, b]) => box.appendChild(_riftSlab(dir, a, b)));
    return box;
}

// Where the wall's back edge is, k = 0..1 of the sweep.
function _riftBackEdge(dir, k) {
    const d = RIFT_DIRS[dir];
    const travel = d.x ? window.innerWidth : window.innerHeight;
    const run = travel + RIFT_BAND;
    return d.sign > 0 ? k * run - RIFT_BAND : travel - k * run;
}

// Slides the wall box so its back edge sits at `back`.
function _riftMove(box, dir, back) {
    box.style.transform = RIFT_DIRS[dir].x
        ? 'translate3d(' + Math.round(back) + 'px,0,0)'
        : 'translate3d(0,' + Math.round(back) + 'px,0)';
}

// Is the player inside the wall band, and outside every lane?
function _riftCaught(dir, back, lanes, half) {
    const pc = _shpPC();
    const d = RIFT_DIRS[dir];
    const along = d.x ? pc.x : pc.y, across = d.x ? pc.y : pc.x;
    if (along < back || along > back + RIFT_BAND) return false;
    return !lanes.some(c => Math.abs(across - c) < half);
}

// Builds one wall's lanes and telegraph, centred on where the player stands.
function _riftBegin(run, dir, p) {
    const d = RIFT_DIRS[dir];
    const total = d.x ? window.innerHeight : window.innerWidth;
    const half = RIFT_LANE_HALF[p];
    const pc = _shpPC();
    const lanes = _riftLanes(RIFT_LANES[p], half, total, d.x ? pc.y : pc.x);
    return { dir, lanes, half, total, t: 0, stage: 'warn', tele: _riftTelegraph(run, dir, lanes, half, total), box: null, hit: false };
}

// Advances one wall: warn -> sweep -> done. Returns true while it is busy.
function _riftStep(run, w, p, dtS, level) {
    const mult = _SHP_DEBUG_MULT;
    w.t += dtS * 1000;
    if (w.stage === 'warn') {
        if (w.t >= RIFT_WARN_MS[p] * mult - 380) w.tele.forEach(el => el.classList.add('sx-shp-armed'));
        if (w.t < RIFT_WARN_MS[p] * mult) return true;
        w.stage = 'sweep'; w.t = 0;
        w.box = _riftWall(run, w.dir, w.lanes, w.half, w.total);
        _riftMove(w.box, w.dir, _riftBackEdge(w.dir, 0));
        const d = RIFT_DIRS[w.dir];
        _shpShards(d.x ? (d.sign > 0 ? 20 : window.innerWidth - 20) : window.innerWidth / 2,
            d.x ? window.innerHeight / 2 : (d.sign > 0 ? 20 : window.innerHeight - 20), true);
        return true;
    }
    const k = Math.min(1, w.t / (RIFT_SWEEP_MS[p] * mult));
    const back = _riftBackEdge(w.dir, k);
    _riftMove(w.box, w.dir, back);
    if (!w.hit && _riftCaught(w.dir, back, w.lanes, w.half)) {
        w.hit = true;
        _shpTouch(RIFT_DMG[p], level, 'Glacier Rift', true);
    }
    if (k < 1) return true;
    w.tele.concat([w.box]).forEach(el => { try { el.remove(); } catch (e) { /* run already cleaned up */ } });
    return false;
}

// Glacier Rift: see the section comment.
export function _mechShpRift(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const plan = _riftPlan(p);
    let wave = _riftBegin(run, plan[0], p), next = 1, pause = 0;
    _nkToast('eg_mech_shp_rift', '❄️ GLACIER RIFT - stand in a green SAFE LANE while the ice wall passes!', SHP_COLOR);
    _nkLoop(run, (dtS) => {
        if (wave) {
            if (_riftStep(run, wave, p, dtS, level)) return true;
            wave = null; pause = 0;
        }
        if (next >= plan.length) return false;
        pause += dtS * 1000;
        if (pause < RIFT_BETWEEN_MS) return true;
        wave = _riftBegin(run, plan[next++], p);
        return true;
    });
}
