import { Audio_Manager } from '../../audio/audio.js';
import { _renderPanel } from '../encounter.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkBossAlive, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRectsOverlap, _nkRuns } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE TRON (boss_tron)---------------------------------
//------------------------------------------------------------------------
// Light cycles on a glowing grid:
//  - LIGHT CYCLE (all fight; two at once from 60%): a rider races in
//    straight lines and leaves a light wall behind it. Its next straight is
//    always shown ahead as a red line.
//  - IDENTITY DISC (all fight): the disc's path, bouncing off the screen
//    edges, is drawn red first; then the disc flies it.
//  - END OF LINE (10%): the Tron is immune and sends wave after wave of
//    cycles whose walls slowly fill the arena.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_tron: {
        id: 'boss_tron', name: 'The Tron', emoji: '🏍️',
        baseHP: 1060, baseDamage: 24, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_tron: {
        phases: [
            // Basic attacks are steady pressure; the cycles are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'light_cycle', intervalBase: 16000, intervalVariance: 4000, handler: '_mechLightCycle' },
            { name: 'identity_disc', intervalBase: 14000, intervalVariance: 3500, handler: '_mechTronDisc' },
            { name: 'corrupt_cells', intervalBase: 21000, intervalVariance: 5000, handler: '_mechCorruptCells' },
        ],
    },
});


//------------------------------------------------------------------------
//-------------------CONSTANTS AND HELPERS-----------------------------------------
//------------------------------------------------------------------------
const HIT_CD_MS = 650;                             // shared hit cooldown
const WALL_W = 14;                                 // light wall thickness (px)
const BIKE_R = 26;
const MARGIN = { top: 96, bottom: 84, side: 50 };  // cycles stay clear of the HUD
const CYCLE_BY_PHASE = [
    null,
    { n: 1, speed: 360, legs: 6, wallMs: 7000, bike: 0.22, wall: 0.10 },
    { n: 2, speed: 380, legs: 6, wallMs: 7000, bike: 0.25, wall: 0.12 },
    { n: 2, speed: 420, legs: 7, wallMs: 7500, bike: 0.28, wall: 0.13 },
];
const CYCLE_WARN_MS = 900;                         // the first straight is shown this long before the ride
const DISC_R = 22;
const DISC_SPEED = 900;
const DISC_BOUNCES = 2;
const DISC_BY_PHASE = [null, { n: 1, warnMs: 1100, dmg: 0.18 }, { n: 2, warnMs: 1000, dmg: 0.21 }, { n: 3, warnMs: 950, dmg: 0.24 }];
const DISC_EVERY_MS = 900;
const FIN_INTRO_MS = 1800;
const FIN_FAILSAFE_MS = 120000;
const FIN_WAVES = [                                // cycles per wave, speed, legs
    { n: 1, speed: 380, legs: 7 }, { n: 2, speed: 380, legs: 7 }, { n: 2, speed: 420, legs: 8 },
    { n: 3, speed: 420, legs: 8 }, { n: 3, speed: 460, legs: 9 },
];
const FIN_WALL_MS = 8000;                          // finale walls stay a little longer (never a closed cage)
const FIN_DMG = { bike: 0.32, wall: 0.16 };
let _hitUntil = 0;
let _finale = null;

// The phase number clamped to 1-3.
function _phase(phase) {
    return Math.max(1, Math.min(3, Number(phase) || 1));
}

// One lightning hit with the boss-ability flash and number, behind a short
// shared cooldown so a wall and a bike touching you together never stack.
function _strike(pct, level, label) {
    const now = performance.now();
    if (now < _hitUntil) return;
    _hitUntil = now + HIT_CD_MS;
    _nkAbilityHitToast(_nkHit(pct, 'lightning', level), 'The Tron', label, true);
}

// A clock that follows real time (clamped to 0.1 s per frame).
function _clock() {
    let last = performance.now();
    return (now) => { const dt = Math.min(100, Math.max(0, now - last)); last = now; return dt; };
}

// Player centre, or the screen centre when there is no avatar.
function _pc() {
    return _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}


//------------------------------------------------------------------------
//-------------------LIGHT CYCLE (straight legs, walls behind)--------------------------
//------------------------------------------------------------------------

// Plans a cycle's route: it starts on a screen edge and drives `legs`
// straight legs with 90-degree turns, every corner kept inside the arena.
function _planRoute(legs) {
    const W = window.innerWidth, H = window.innerHeight;
    const x0 = MARGIN.side, x1 = W - MARGIN.side, y0 = MARGIN.top, y1 = H - MARGIN.bottom;
    const side = Math.floor(Math.random() * 4), pc = _pc();
    let p = side === 0 ? { x: x0, y: pc.y } : side === 1 ? { x: x1, y: pc.y } : side === 2 ? { x: pc.x, y: y0 } : { x: pc.x, y: y1 };
    p = { x: Math.max(x0, Math.min(x1, p.x)), y: Math.max(y0, Math.min(y1, p.y)) };
    const pts = [p];
    let horiz = side < 2;
    for (let i = 0; i < legs; i++) {
        const last = pts[pts.length - 1];
        const lo = horiz ? x0 : y0, hi = horiz ? x1 : y1, cur = horiz ? last.x : last.y;
        const span = hi - lo;
        let to = lo + (0.15 + Math.random() * 0.7) * span;
        if (Math.abs(to - cur) < span * 0.25) to = cur < (lo + hi) / 2 ? hi - span * 0.1 : lo + span * 0.1;
        pts.push(horiz ? { x: to, y: last.y } : { x: last.x, y: to });
        horiz = !horiz;
    }
    return pts;
}

// The box a wall between two route points covers (WALL_W thick).
function _segBox(a, b) {
    return {
        left: Math.min(a.x, b.x) - WALL_W / 2, right: Math.max(a.x, b.x) + WALL_W / 2,
        top: Math.min(a.y, b.y) - WALL_W / 2, bottom: Math.max(a.y, b.y) + WALL_W / 2,
    };
}

// Places (or resizes) a box element.
function _place(el, bx) {
    el.style.left = Math.round(bx.left) + 'px';
    el.style.top = Math.round(bx.top) + 'px';
    el.style.width = Math.round(bx.right - bx.left) + 'px';
    el.style.height = Math.round(bx.bottom - bx.top) + 'px';
}

// Creates one cycle on a planned route; its first straight is shown red.
function _newCycle(run, legs, speed) {
    const pts = _planRoute(legs);
    const bike = _nkEl(run, 'div', 'sx-trn-bike');
    const cyc = { pts, leg: 0, x: pts[0].x, y: pts[0].y, speed, bike, walls: [], ahead: _nkEl(run, 'div', 'sx-trn-ahead'), cur: null, done: false };
    _place(cyc.ahead, _segBox(pts[0], pts[1]));
    _placeBike(cyc);
    return cyc;
}

// Draws the bike at its spot, turned along its current leg.
function _placeBike(c) {
    const a = c.pts[c.leg], b = c.pts[Math.min(c.leg + 1, c.pts.length - 1)];
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    c.bike.style.transform = 'translate(' + Math.round(c.x - BIKE_R) + 'px,' + Math.round(c.y - BIKE_R) + 'px) rotate(' + ang + 'deg)';
}

// Drives a cycle one frame: the wall grows behind it, the red line shows
// the straight ahead, and touching the bike or a wall hurts. Old walls fade.
function _stepCycle(run, c, dtMs, wallMs, dmg, level) {
    const now = performance.now();
    c.walls = c.walls.filter(w => {
        if (now - w.born < wallMs || !w.closed) return true;
        try { w.el.remove(); } catch (e) {}
        return false;
    });
    const pr = _nkPlayerRect();
    if (c.walls.some(w => _nkRectsOverlap(pr, w.box))) _strike(dmg.wall, level, 'Light Wall');
    if (c.done) return c.walls.length > 0;
    let move = c.speed * dtMs / 1000;
    while (move > 0 && !c.done) {
        const a = c.pts[c.leg], b = c.pts[c.leg + 1];
        if (!c.cur) {
            c.cur = { el: _nkEl(run, 'div', 'sx-trn-wall'), born: now, closed: false, from: a };
            c.walls.push(c.cur);
            _place(c.ahead, _segBox(a, b));
        }
        const left = Math.hypot(b.x - c.x, b.y - c.y);
        const step = Math.min(left, move);
        c.x += (b.x - a.x) / (Math.hypot(b.x - a.x, b.y - a.y) || 1) * step;
        c.y += (b.y - a.y) / (Math.hypot(b.x - a.x, b.y - a.y) || 1) * step;
        move -= step;
        c.cur.box = _segBox(c.cur.from, { x: c.x, y: c.y });
        _place(c.cur.el, c.cur.box);
        if (step >= left - 0.01) {
            c.cur.closed = true; c.cur.born = now; c.cur = null; c.leg++;
            if (c.leg >= c.pts.length - 1) { c.done = true; c.bike.classList.add('gone'); c.ahead.remove(); }
        }
    }
    if (!c.done) _placeBike(c);
    if (!c.done && _nkCircleHit(c.x, c.y, BIKE_R, pr, 0)) _strike(dmg.bike, level, 'Light Cycle');
    return true;
}

// Runs a group of cycles: their first straights show red for a moment,
// then they ride; returns the run. onDone fires when every wall has faded.
function _cycleRun(monster, cfg, dmg, onDone) {
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const cycles = [];
    for (let i = 0; i < cfg.n; i++) cycles.push(_newCycle(run, cfg.legs, cfg.speed));
    const clock = _clock();
    let t = 0;
    try { Audio_Manager.playSFX('boss_tron_cycle'); } catch (e) {}
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        t += dt;
        if (t < CYCLE_WARN_MS) return true;
        let alive = false;
        cycles.forEach(c => { if (_stepCycle(run, c, dt, cfg.wallMs, dmg, level)) alive = true; });
        if (cycles.every(c => c.done)) run.passive = true;   // fading walls must not block the next attack
        if (alive) return true;
        if (onDone) onDone();
        return false;
    });
    return run;
}

// Light Cycle: one rider (two from 60%) races straight legs with sharp
// turns and leaves a light wall behind; its next straight shows red ahead.
export function _mechLightCycle(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = CYCLE_BY_PHASE[_phase(phase)];
    _cycleRun(monster, cfg, { bike: cfg.bike, wall: cfg.wall });
}


//------------------------------------------------------------------------
//-------------------IDENTITY DISC (a shown bouncing path)--------------------------------
//------------------------------------------------------------------------

// The disc's path from the boss toward the player, bouncing off the screen
// edges DISC_BOUNCES times; returns its corner points.
function _discPath(from) {
    const W = window.innerWidth, H = window.innerHeight, pc = _pc();
    let x = from.x, y = from.y;
    let dx = pc.x - x, dy = pc.y - y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const pts = [{ x, y }];
    for (let i = 0; i <= DISC_BOUNCES; i++) {
        const tx = dx > 0 ? (W - DISC_R - x) / dx : dx < 0 ? (DISC_R - x) / dx : Infinity;
        const ty = dy > 0 ? (H - DISC_R - y) / dy : dy < 0 ? (DISC_R - y) / dy : Infinity;
        const tt = Math.min(tx, ty);
        x += dx * tt; y += dy * tt;
        pts.push({ x, y });
        if (tx < ty) dx = -dx; else dy = -dy;
    }
    return pts;
}

// Draws a disc path as red line pieces (one per straight).
function _discLines(run, pts, warnMs) {
    for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const el = _nkEl(run, 'div', 'sx-trn-discline');
        el.style.left = Math.round(a.x) + 'px';
        el.style.top = Math.round(a.y - DISC_R) + 'px';
        el.style.width = Math.round(Math.hypot(b.x - a.x, b.y - a.y)) + 'px';
        el.style.height = (DISC_R * 2) + 'px';
        el.style.transform = 'rotate(' + (Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI).toFixed(1) + 'deg)';
        el.style.setProperty('--trn-warn', warnMs + 'ms');
    }
}

// Where the disc is after travelling `dist` along its path (null when done).
function _discAt(pts, dist) {
    for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist <= l) return { x: a.x + (b.x - a.x) * dist / l, y: a.y + (b.y - a.y) * dist / l };
        dist -= l;
    }
    return null;
}

// Identity Disc: the Tron throws a disc at you; its bouncing path is drawn
// red first, then the disc flies it. More discs in later phases.
export function _mechTronDisc(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = DISC_BY_PHASE[_phase(phase)];
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const card = monster ? document.getElementById('sx-card-' + monster.id) : null;
    const r = card ? card.getBoundingClientRect() : null;
    const from = r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: 90 };
    const discs = [];
    const clock = _clock();
    let t = 0;
    _nkLoop(run, (dtS, now) => {
        t += clock(now);
        while (discs.length < cfg.n && t >= discs.length * DISC_EVERY_MS) {
            const pts = _discPath(from);
            const lines = run.els.length;
            _discLines(run, pts, cfg.warnMs);
            discs.push({ pts, start: discs.length * DISC_EVERY_MS + cfg.warnMs, el: null, lines: run.els.slice(lines), hit: false, done: false });
        }
        discs.forEach(d => {
            if (d.done || t < d.start) return;
            if (!d.el) { d.el = _nkEl(run, 'div', 'sx-trn-disc'); d.lines.forEach(el => el.classList.add('live')); }
            const at = _discAt(d.pts, (t - d.start) / 1000 * DISC_SPEED);
            if (!at) { d.done = true; d.el.remove(); d.lines.forEach(el => el.remove()); return; }
            d.el.style.transform = 'translate(' + Math.round(at.x - DISC_R) + 'px,' + Math.round(at.y - DISC_R) + 'px)';
            if (!d.hit && _nkCircleHit(at.x, at.y, DISC_R, _nkPlayerRect(), 0)) { d.hit = true; _strike(cfg.dmg, level, 'Identity Disc'); }
        });
        return !(discs.length >= cfg.n && discs.every(d => d.done));
    });
}


//------------------------------------------------------------------------
//-------------------END OF LINE (10% finale)------------------------------------------
//------------------------------------------------------------------------

// Pauses or resumes the player's auto-attack charge bar.
function _pauseCharge(paused) {
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('sx-charge-paused', paused);
    });
}

// Ends the finale (once): releases the Tron.
function _finEnd(g) {
    if (g.finished) return;
    g.finished = true;
    _pauseCharge(false);
    if (g.wrap) g.wrap.classList.remove('sx-nk-shielded');
    if (g.banner) { try { g.banner.remove(); } catch (e) {} }
    const m = (globalThis._monsters || []).find(x => x && x.id === g.monsterId);
    if (m) { m.bossImmune = false; try { _renderPanel(); } catch (e) {} }
    if (_finale === g) _finale = null;
}

// Starts the finale: silences the Tron's other attacks, turns it immune and
// sends the cycle waves one after another; their walls stay up long.
function _finStart(monster) {
    if (_finale || monster._trnFinaleDone) return;
    monster._trnFinaleDone = true;
    Array.from(_nkRuns.values()).forEach(r => { if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} } });
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    const g = { monsterId: monster.id, finished: false, wrap, banner: document.createElement('div') };
    _finale = g;
    monster.bossImmune = true;
    _pauseCharge(true);
    if (wrap) wrap.classList.add('sx-nk-shielded');
    g.banner.className = 'sx-nk-fin-banner sx-nk-fin-trn';
    g.banner.innerHTML = '<div class="sx-nk-fin-title">END OF LINE</div>';
    document.body.appendChild(g.banner);
    const runs = new Set();
    const started = performance.now();
    let wave = 0, nextAt = FIN_INTRO_MS;
    const timer = _nkNewRun(monster.id, true);
    timer.onKill = () => _finEnd(g);
    _nkLoop(timer, () => {
        const t = performance.now() - started;
        if (t > FIN_FAILSAFE_MS || !_nkBossAlive(monster.id)) return false;
        if (wave < FIN_WAVES.length && t >= nextAt) {
            const w = FIN_WAVES[wave++];
            const r = _cycleRun(monster, { ...w, wallMs: FIN_WALL_MS }, FIN_DMG, () => runs.delete(r));
            runs.add(r);
            nextAt = t + 1000 * (w.legs * 0.45 + 2.5);
        }
        return wave < FIN_WAVES.length || runs.size > 0;
    });
}

// Passive HP watcher: at 10% the finale begins, once.
function _trnOnInit(monster) {
    if (!monster || monster._trnWatch) return;
    monster._trnWatch = true;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (monster._trnFinaleDone || !_nkBossAlive(monster.id)) return false;
        if (monster.currentHP > 0 && monster.currentHP <= monster.maxHP * 0.10 && !monster.bossImmune && !_nkFrozen()) {
            _finStart(monster);
            return false;
        }
        return true;
    });
}

BOSS_MECHANICS.boss_tron.onInit = _trnOnInit;


//------------------------------------------------------------------------
//-------------------TEARDOWN AND DEBUG HOOK------------------------------------------
//------------------------------------------------------------------------

// Called from the boss cleanup on boss death AND on encounter stop: removes
// every element the Tron created and frees the charge bar.
export function _trnTeardown() {
    if (_finale) { try { _finEnd(_finale); } catch (e) {} }
    document.querySelectorAll('.sx-trn-bike, .sx-trn-wall, .sx-trn-ahead, .sx-trn-disc, .sx-trn-discline, .sx-nk-fin-trn')
        .forEach(el => { try { el.remove(); } catch (e) {} });
    _pauseCharge(false);
}

// Console hook for playtests: _TRN_DEBUG.fire('cycle'|'disc', phase), _TRN_DEBUG.final().
if (typeof window !== 'undefined') {
    const find = () => (globalThis._monsters || []).find(m => m && m.baseId === 'boss_tron');
    window._TRN_DEBUG = {
        fire: (name, phase) => {
            const m = find();
            const fn = { cycle: _mechLightCycle, disc: _mechTronDisc }[name];
            if (!m) return 'no tron alive';
            if (!fn) return 'unknown: ' + name;
            fn(m, phase || m.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => { const m = find(); if (!m) return 'no tron alive'; _finStart(m); return 'finale started'; },
    };
}
