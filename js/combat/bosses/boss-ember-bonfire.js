import { _renderPanel } from '../encounter.js';
import { BOSS_MECHANICS } from './boss-framework.js';
import { _embClock, _embPC, _embStrike, _mechEmbFireballs, _mechEmbRain } from './boss-ember.js';
import { _nkBossAlive, _nkEl, _nkFrozen, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------EMBER: THE BONFIRE FINALE-----------------------------------
//------------------------------------------------------------------------
// BONFIRE (10%): the Ember is immune and blazes up. Rings of fire roll out
// from it one after another; every ring has one green gap. Stand in the
// gap when the ring passes you - each new gap sits a little to the side,
// so you keep moving. Survive every ring to release the Ember.
//------------------------------------------------------------------------

const FIN_INTRO_MS = 1800;
const FIN_FAILSAFE_MS = 120000;
const RING_TH = 56;                                // ring thickness (px)
const RING_START_R = 50;
const GAP_MIN_PX = 170;                            // gap width where it meets you
const AVATAR_PX_S = 320;
const FIN_RINGS = [                                // launch gap after the previous ring, speed, hit
    { gapMs: 0, v: 230, dmg: 0.26 }, { gapMs: 2300, v: 230, dmg: 0.27 }, { gapMs: 2200, v: 240, dmg: 0.28 },
    { gapMs: 2100, v: 240, dmg: 0.29 }, { gapMs: 2000, v: 250, dmg: 0.30 }, { gapMs: 1950, v: 255, dmg: 0.31 },
    { gapMs: 1900, v: 260, dmg: 0.32 }, { gapMs: 1850, v: 265, dmg: 0.33 }, { gapMs: 1800, v: 270, dmg: 0.34 },
    { gapMs: 1750, v: 275, dmg: 0.34 }, { gapMs: 1700, v: 280, dmg: 0.35 }, { gapMs: 1650, v: 285, dmg: 0.35 },
    { gapMs: 1600, v: 290, dmg: 0.36 }, { gapMs: 1600, v: 300, dmg: 0.36 },
];

let _finale = null;                                // the running finale (one at a time)


//------------------------------------------------------------------------
//-------------------RING GEOMETRY---------------------------------------------------
//------------------------------------------------------------------------

// Centre of the Ember's card (the rings roll out from here).
function _origin(monsterId) {
    const card = document.getElementById('sx-card-' + monsterId);
    const r = card ? card.getBoundingClientRect() : null;
    if (r && r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    return { x: window.innerWidth / 2, y: 90 };
}

// Smallest difference between two angles (radians, 0..PI).
function _angDiff(a, b) {
    const d = Math.abs(a - b) % (Math.PI * 2);
    return d > Math.PI ? Math.PI * 2 - d : d;
}

// True when a point is comfortably on screen.
function _onScreen(x, y) {
    return x > 50 && x < window.innerWidth - 50 && y > 90 && y < window.innerHeight - 70;
}

// Picks the gap of a new ring: to one side of where you stand now, far
// enough that you have to move, close enough to reach before the ring
// does, and always on screen. Returns { a, half } (centre angle, half width).
function _pickGap(o, v) {
    const pc = _embPC();
    const d = Math.max(80, Math.hypot(pc.x - o.x, pc.y - o.y));
    const pa = Math.atan2(pc.y - o.y, pc.x - o.x);
    const half = Math.min(0.6, Math.max(0.2, GAP_MIN_PX / 2 / d));
    const secs = Math.max(0.3, (d - RING_START_R) / v - 0.6);
    const reach = Math.max(0.15, (AVATAR_PX_S * 0.85 * secs - 30) / d);
    let off = Math.min(reach, half + 0.25 + Math.random() * 0.5);
    const sign = Math.random() < 0.5 ? 1 : -1;
    for (let k = 0; k < 8; k++, off *= 0.75) {
        for (const s of [sign, -sign]) {
            const a = pa + s * off;
            if (_onScreen(o.x + Math.cos(a) * d, o.y + Math.sin(a) * d)) return { a, half };
        }
    }
    return { a: pa, half };
}

// Draws a ring at radius r: a red band with its gap painted green.
function _paintRing(ring) {
    const r = ring.r, el = ring.el;
    el.style.left = Math.round(ring.o.x - r) + 'px';
    el.style.top = Math.round(ring.o.y - r) + 'px';
    el.style.width = el.style.height = Math.round(r * 2) + 'px';
}

// Creates one ring element (gap colours set once; CSS 0deg points up).
function _newRing(run, o, cfg) {
    const gap = _pickGap(o, cfg.v);
    const el = _nkEl(run, 'div', 'sx-emb-ring');
    const from = (gap.a - gap.half) * 180 / Math.PI + 90;
    el.style.setProperty('--emb-from', from.toFixed(1) + 'deg');
    el.style.setProperty('--emb-gap', (gap.half * 2 * 180 / Math.PI).toFixed(1) + 'deg');
    el.style.setProperty('--emb-th', RING_TH + 'px');
    const ring = { o, r: RING_START_R, v: cfg.v, dmg: cfg.dmg, gap, el, hit: false, rMax: 0 };
    const W = window.innerWidth, H = window.innerHeight;
    ring.rMax = Math.max(Math.hypot(o.x, o.y), Math.hypot(W - o.x, o.y), Math.hypot(o.x, H - o.y), Math.hypot(W - o.x, H - o.y)) + RING_TH;
    _paintRing(ring);
    return ring;
}

// Moves one ring outward and hits the player once if the band (outside the
// gap) passes over them. Returns false once the ring left the screen.
function _stepRing(ring, dt, level) {
    ring.r += ring.v * dt / 1000;
    _paintRing(ring);
    const pc = _nkPlayerCenter(), pr = _nkPlayerRect();
    if (!ring.hit && pc && pr) {
        const body = Math.min(pr.right - pr.left, pr.bottom - pr.top) / 2 - 4;
        const d = Math.hypot(pc.x - ring.o.x, pc.y - ring.o.y);
        const inBand = d >= ring.r - RING_TH - body && d <= ring.r + body;
        const inGap = _angDiff(Math.atan2(pc.y - ring.o.y, pc.x - ring.o.x), ring.gap.a) <= ring.gap.half;
        if (inBand && !inGap) { ring.hit = true; _embStrike(ring.dmg, level, 'Bonfire'); }
    }
    if (ring.r < ring.rMax) return true;
    try { ring.el.remove(); } catch (e) {}
    return false;
}


//------------------------------------------------------------------------
//-------------------THE FINALE RUN-------------------------------------------------------
//------------------------------------------------------------------------

// Pauses or resumes the player's auto-attack charge bar.
function _pauseCharge(paused) {
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('sx-charge-paused', paused);
    });
}

// Ends the finale (once): releases the Ember and frees the charge bar.
function _finEnd(g) {
    if (g.finished) return;
    g.finished = true;
    _pauseCharge(false);
    if (g.wrap) g.wrap.classList.remove('sx-nk-shielded', 'sx-emb-blaze');
    const m = (globalThis._monsters || []).find(x => x && x.id === g.monsterId);
    if (m) { m.bossImmune = false; try { _renderPanel(); } catch (e) {} }
    if (_finale === g) _finale = null;
}

// Starts the finale: silences every other run of the Ember, turns it immune
// and rolls the rings out in one loop. Every exit runs _finEnd.
function _finStart(monster) {
    if (_finale || monster._embFinaleDone) return;
    monster._embFinaleDone = true;
    Array.from(_nkRuns.values()).forEach(r => { if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} } });
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    const g = { monsterId: monster.id, finished: false, wrap };
    _finale = g;
    monster.bossImmune = true;
    _pauseCharge(true);
    if (wrap) wrap.classList.add('sx-nk-shielded', 'sx-emb-blaze');
    const run = _nkNewRun(monster.id, true);
    run.onKill = () => _finEnd(g);
    _nkEl(run, 'div', 'sx-nk-fin-banner sx-nk-fin-emb').innerHTML = '<div class="sx-nk-fin-title">BONFIRE</div>';
    const level = monster.level || 1;
    const clock = _embClock();
    let rings = [], next = 0, t = 0, total = 0, nextAt = FIN_INTRO_MS;
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        t += dt; total += dt;
        if (total > FIN_FAILSAFE_MS || !_nkBossAlive(monster.id)) return false;
        if (next < FIN_RINGS.length && t >= nextAt) {
            rings.push(_newRing(run, _origin(monster.id), FIN_RINGS[next]));
            next++;
            if (next < FIN_RINGS.length) nextAt = t + FIN_RINGS[next].gapMs;
        }
        rings = rings.filter(r => _stepRing(r, dt, level));
        return next < FIN_RINGS.length || rings.length > 0;
    });
}


//------------------------------------------------------------------------
//-------------------HP WATCHER, TEARDOWN, DEBUG HOOK---------------------------------
//------------------------------------------------------------------------

// Passive HP watcher started when the fight begins: at 10% the finale
// begins, once.
function _embOnInit(monster) {
    if (!monster || monster._embWatch) return;
    monster._embWatch = true;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (monster._embFinaleDone || !_nkBossAlive(monster.id)) return false;
        if (monster.currentHP > 0 && monster.currentHP <= monster.maxHP * 0.10 && !monster.bossImmune && !_nkFrozen()) {
            _finStart(monster);
            return false;
        }
        return true;
    });
}

BOSS_MECHANICS.boss_ember.onInit = _embOnInit;

// Called from the boss cleanup on boss death AND on encounter stop: removes
// every element the Ember created and frees the charge bar.
export function _embTeardown() {
    if (_finale) { try { _finEnd(_finale); } catch (e) {} }
    document.querySelectorAll('.sx-emb-col, .sx-emb-ball, .sx-emb-patch, .sx-emb-ring, .sx-nk-fin-emb')
        .forEach(el => { try { el.remove(); } catch (e) {} });
    document.querySelectorAll('.sx-emb-blaze').forEach(el => el.classList.remove('sx-emb-blaze'));
    _pauseCharge(false);
}

// Console hook for playtests: _EMB_DEBUG.fire('rain'|'balls', phase), _EMB_DEBUG.final().
if (typeof window !== 'undefined') {
    const find = () => (globalThis._monsters || []).find(m => m && m.baseId === 'boss_ember');
    window._EMB_DEBUG = {
        fire: (name, phase) => {
            const m = find();
            const fn = { rain: _mechEmbRain, balls: _mechEmbFireballs }[name];
            if (!m) return 'no ember alive';
            if (!fn) return 'unknown: ' + name;
            fn(m, phase || m.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => { const m = find(); if (!m) return 'no ember alive'; _finStart(m); return 'finale started'; },
    };
}
