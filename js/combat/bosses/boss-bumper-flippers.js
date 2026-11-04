import { _renderPanel } from '../encounter.js';
import { BOSS_MECHANICS } from './boss-framework.js';
import { _bumpAddBall, _bumpFlingHit, _bumpPhase, _bumpSfx, _bumpStrike, _bumpWatcher, _bumperArenaInit } from './boss-bumper.js';
import { _nkBossAlive, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFrozen, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BUMPER: SLAMS, FLIPPERS AND THE JACKPOT--------------------
//------------------------------------------------------------------------
// BUMPER SLAM (all fight): red circles fill on your spot, a giant bumper
// drops in and flings you. FLIPPER SLAP (60%+): a flipper in a bottom
// corner swings a wide red band through where you stand.
// TILT (60%): bumpers race and five flipper slaps follow. MULTIBALL (30%):
// six hot balls fly out of the Bumper along red lines.
// JACKPOT (10%): the Bumper is immune; three green targets light up one at
// a time - stand in a target to fill it while the flippers slap through it.
//------------------------------------------------------------------------

const SLAM_R = 130;
const SLAM_EVERY_MS = 650;                         // a new circle on your spot this often
const SLAM_FLING = 220;
const SLAM_BY_PHASE = [null, { n: 2, warnMs: 1150, dmg: 0.18 }, { n: 3, warnMs: 1050, dmg: 0.21 }, { n: 3, warnMs: 950, dmg: 0.24 }];
const FLIP_W = 96;                                 // width of a flipper band (px)
const FLIP_BY_PHASE = [null, null, { n: 3, warnMs: 1150, gapMs: 1000, dmg: 0.16 }, { n: 4, warnMs: 1050, gapMs: 900, dmg: 0.19 }];
const TILT_MS = 7000;
const TILT_FLIPS = { n: 5, warnMs: 1050, gapMs: 1000, dmg: 0.20 };
const MULTI_N = 6;
const MULTI_SPEED = 340;
const MULTI_DMG = 0.12;
const FIN_TARGETS = 3;
const FIN_TARGET_R = 72;
const FIN_FILL_MS = 5000;                          // standing time to light one target
const FIN_DRAIN = 0.4;                             // a target drains this fast when you step out
const FIN_SLAP = { warnMs: 1150, everyMs: 2300, firstMs: 900, dmg: 0.28 };
const FIN_INTRO_MS = 1800;
const FIN_FAILSAFE_MS = 90000;                     // the table gives up after this long (targets missed)

let _finale = null;                                // the running finale (one at a time)


//------------------------------------------------------------------------
//-------------------LOW-LEVEL HELPERS---------------------------------------------
//------------------------------------------------------------------------

// Player centre, or the screen centre when there is no avatar.
function _pc() {
    return _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

// Centre of the Bumper's card; top middle when it is gone.
function _bossCentre(monster) {
    const card = monster ? document.getElementById('sx-card-' + monster.id) : null;
    if (card) {
        const r = card.getBoundingClientRect();
        if (r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: window.innerWidth / 2, y: 90 };
}

// A clock that follows real time (clamped to 0.1 s per frame), so the CSS
// fills and the strikes in code never drift apart.
function _clock() {
    let last = performance.now();
    return (now) => { const dt = Math.min(100, Math.max(0, now - last)); last = now; return dt; };
}

// Pauses or resumes the player's auto-attack charge bar.
function _pauseCharge(paused) {
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('sx-charge-paused', paused);
    });
}


//------------------------------------------------------------------------
//-------------------BUMPER SLAM (filling circles on your spot)----------------------
//------------------------------------------------------------------------

// Bumper Slam: red circles fill on your spot one after another; when one is
// full a giant bumper drops in, hits and flings everyone inside.
export function _mechBumperSlam(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = SLAM_BY_PHASE[_bumpPhase(phase)];
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const slams = [];
    const clock = _clock();
    let t = 0;
    _nkLoop(run, (dtS, now) => {
        t += clock(now);
        while (slams.length < cfg.n && t >= slams.length * SLAM_EVERY_MS) {
            const c = _pc();
            const el = _nkEl(run, 'div', 'sx-bump-slam');
            el.style.left = Math.round(c.x - SLAM_R) + 'px';
            el.style.top = Math.round(c.y - SLAM_R) + 'px';
            el.style.width = el.style.height = (SLAM_R * 2) + 'px';
            el.style.setProperty('--bump-warn', cfg.warnMs + 'ms');
            slams.push({ x: c.x, y: c.y, el, at: slams.length * SLAM_EVERY_MS + cfg.warnMs, done: false });
        }
        slams.forEach(s => {
            if (s.done || t < s.at) return;
            s.done = true;
            s.el.classList.add('hot');
            _bumpSfx();
            if (_nkCircleHit(s.x, s.y, SLAM_R, _nkPlayerRect(), 0)) _bumpFlingHit(level, s.x, s.y, SLAM_FLING, cfg.dmg, 'Bumper Slam');
            const el = s.el;
            run.timers.push(setTimeout(() => { try { el.remove(); } catch (e) {} }, 450));
        });
        return !(slams.length >= cfg.n && slams.every(s => s.done) && t > slams[slams.length - 1].at + 500);
    });
}


//------------------------------------------------------------------------
//-------------------FLIPPER SLAP (wide bands from the bottom corners)----------------
//------------------------------------------------------------------------

// Paints one flipper band from a bottom corner through `aim`; its red fill
// runs along the band for warnMs. Returns the band (pivot + far end).
function _slapBand(run, left, aim, warnMs) {
    const W = window.innerWidth, H = window.innerHeight;
    const px = left ? 40 : W - 40, py = H - 70;
    const a = Math.atan2(aim.y - py, aim.x - px);
    const len = Math.hypot(W, H);
    const el = _nkEl(run, 'div', 'sx-bump-flip');
    el.style.left = Math.round(px) + 'px';
    el.style.top = Math.round(py - FLIP_W / 2) + 'px';
    el.style.width = Math.round(len) + 'px';
    el.style.height = FLIP_W + 'px';
    el.style.transform = 'rotate(' + (a * 180 / Math.PI).toFixed(1) + 'deg)';
    el.style.setProperty('--bump-warn', warnMs + 'ms');
    return { el, px, py, ex: px + Math.cos(a) * len, ey: py + Math.sin(a) * len };
}

// True when the player's body touches a flipper band (same geometry as drawn).
function _inBand(b) {
    const pc = _nkPlayerCenter(), pr = _nkPlayerRect();
    if (!pc || !pr) return false;
    const body = Math.min(pr.right - pr.left, pr.bottom - pr.top) / 2 - 4;
    return _ptSegDist(pc.x, pc.y, b.px, b.py, b.ex, b.ey) <= FLIP_W / 2 + body;
}

// Runs a series of flipper slaps (cfg: n, warnMs, gapMs, dmg), alternating
// corners, each aimed at where you stand when it appears.
function _flipRun(monster, cfg, label) {
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const slaps = [];
    const clock = _clock();
    const first = Math.random() < 0.5;
    let t = 0;
    _nkLoop(run, (dtS, now) => {
        t += clock(now);
        while (slaps.length < cfg.n && t >= slaps.length * cfg.gapMs) {
            const b = _slapBand(run, (slaps.length % 2 === 0) === first, _pc(), cfg.warnMs);
            b.at = slaps.length * cfg.gapMs + cfg.warnMs;
            slaps.push(b);
        }
        slaps.forEach(b => {
            if (b.done || t < b.at) return;
            b.done = true;
            b.el.classList.add('hot');
            _bumpSfx();
            if (_inBand(b)) _bumpStrike(cfg.dmg, level, label);
            const el = b.el;
            run.timers.push(setTimeout(() => { try { el.remove(); } catch (e) {} }, 400));
        });
        return !(slaps.length >= cfg.n && slaps.every(b => b.done) && t > slaps[slaps.length - 1].at + 450);
    });
    return run;
}

// Flipper Slap (phase 2+): flippers in the bottom corners take turns
// swinging a wide red band through where you stand.
export function _mechBumperFlip(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = FLIP_BY_PHASE[_bumpPhase(phase)];
    if (cfg) _flipRun(monster, cfg, 'Flipper Slap');
}


//------------------------------------------------------------------------
//-------------------TILT (60%) AND MULTIBALL (30%)----------------------------------
//------------------------------------------------------------------------

// TILT: the bumpers race for a few seconds and five flipper slaps follow.
function _tilt(monster) {
    const st = _bumpWatcher;
    if (st) st.tiltUntil = performance.now() + TILT_MS;
    _bumpSfx();
    _flipRun(monster, TILT_FLIPS, 'TILT');
}

// MULTIBALL: six hot balls fly out of the Bumper; red lines show their
// first path before they launch.
function _multiball(monster) {
    const st = _bumpWatcher;
    if (!st) return;
    const c = _bossCentre(monster), pc = _pc();
    const toward = Math.atan2(pc.y - c.y, pc.x - c.x);
    for (let i = 0; i < MULTI_N; i++) {
        const a = toward + (i - (MULTI_N - 1) / 2) * 0.42;
        _bumpAddBall(st, c.x, c.y + 40, Math.cos(a) * MULTI_SPEED, Math.sin(a) * MULTI_SPEED,
            { aim: true, hot: true, warnMs: 950, life: 12000, dmg: MULTI_DMG });
    }
    _bumpSfx();
}


//------------------------------------------------------------------------
//-------------------JACKPOT (10% finale)---------------------------------------------
//------------------------------------------------------------------------

// Puts a jackpot target somewhere reachable, 200-420 px from the player and
// clear of the HUD.
function _finTarget(run) {
    const W = window.innerWidth, H = window.innerHeight, pc = _pc();
    let x = W / 2, y = H / 2;
    for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2, d = 200 + Math.random() * 220;
        x = pc.x + Math.cos(a) * d; y = pc.y + Math.sin(a) * d;
        if (x > 110 && x < W - 110 && y > 150 && y < H - 150) break;
    }
    x = Math.max(110, Math.min(W - 110, x)); y = Math.max(150, Math.min(H - 150, y));
    const el = _nkEl(run, 'div', 'sx-bump-target');
    el.style.left = Math.round(x - FIN_TARGET_R) + 'px';
    el.style.top = Math.round(y - FIN_TARGET_R) + 'px';
    el.style.width = el.style.height = (FIN_TARGET_R * 2) + 'px';
    return { x, y, el, fill: 0 };
}

// Ends the finale (once): releases the Bumper and frees the charge bar.
function _finEnd(g) {
    if (g.finished) return;
    g.finished = true;
    _pauseCharge(false);
    if (g.wrap) g.wrap.classList.remove('sx-nk-shielded');
    const m = (globalThis._monsters || []).find(x => x && x.id === g.monsterId);
    if (m) { m.bossImmune = false; try { _renderPanel(); } catch (e) {} }
    if (_finale === g) _finale = null;
}

// Steps the jackpot target: fills while you stand in it, drains slowly
// when you step out; returns true once it is lit.
function _finFill(g, dt) {
    const tg = g.target, pc = _nkPlayerCenter();
    const inside = !!pc && Math.hypot(pc.x - tg.x, pc.y - tg.y) <= FIN_TARGET_R;
    tg.fill = Math.max(0, Math.min(FIN_FILL_MS, tg.fill + (inside ? dt : -dt * FIN_DRAIN)));
    tg.el.style.setProperty('--fill', (tg.fill / FIN_FILL_MS * 360).toFixed(1) + 'deg');
    tg.el.classList.toggle('on', inside);
    return tg.fill >= FIN_FILL_MS;
}

// Starts the finale: silences the Bumper's other attacks (the table keeps
// rolling), turns it immune and runs the jackpot in one loop.
function _finStart(monster) {
    if (_finale || monster._bumpFinaleDone) return;
    monster._bumpFinaleDone = true;
    const table = _bumpWatcher && _bumpWatcher.run;
    Array.from(_nkRuns.values()).forEach(r => { if (r.bossId === monster.id && r !== table) { try { _nkKillRun(r); } catch (e) {} } });
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    const g = { monsterId: monster.id, finished: false, wrap, target: null, lit: 0 };
    _finale = g;
    monster.bossImmune = true;
    _pauseCharge(true);
    if (wrap) wrap.classList.add('sx-nk-shielded');
    const run = _nkNewRun(monster.id, true);
    run.onKill = () => _finEnd(g);
    _nkEl(run, 'div', 'sx-nk-fin-banner sx-nk-fin-bump').innerHTML = '<div class="sx-nk-fin-title">JACKPOT</div>';
    const pips = _nkEl(run, 'div', 'sx-bump-pips');
    pips.innerHTML = '<i></i>'.repeat(FIN_TARGETS);
    const level = monster.level || 1;
    const clock = _clock();
    const slaps = [];
    let t = 0, total = 0, nextSlap = 0, side = Math.random() < 0.5;
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        t += dt; total += dt;
        if (total > FIN_FAILSAFE_MS || !_nkBossAlive(monster.id)) return false;
        if (t < FIN_INTRO_MS) return true;
        if (!g.target) { g.target = _finTarget(run); nextSlap = t + FIN_SLAP.firstMs; }
        if (t >= nextSlap) {
            const b = _slapBand(run, side, g.target, FIN_SLAP.warnMs);
            b.at = t + FIN_SLAP.warnMs; side = !side; slaps.push(b);
            nextSlap = t + FIN_SLAP.everyMs;
        }
        slaps.forEach(b => {
            if (b.done || t < b.at) return;
            b.done = true; b.el.classList.add('hot'); _bumpSfx();
            if (_inBand(b)) _bumpStrike(FIN_SLAP.dmg, level, 'Jackpot');
            const el = b.el;
            run.timers.push(setTimeout(() => { try { el.remove(); } catch (e) {} }, 400));
        });
        if (!_finFill(g, dt)) return true;
        g.target.el.classList.add('lit');
        const old = g.target.el;
        run.timers.push(setTimeout(() => { try { old.remove(); } catch (e) {} }, 500));
        g.target = null; g.lit++;
        pips.children[g.lit - 1].classList.add('lit');
        return g.lit < FIN_TARGETS;
    });
}


//------------------------------------------------------------------------
//-------------------HP WATCHER, DEBUG HOOK-------------------------------------------
//------------------------------------------------------------------------

// Starts the table and a passive HP watcher: TILT at 60%, MULTIBALL at 30%
// (each waits while another attack is running), JACKPOT at 10%.
function _bumpOnInit(monster) {
    _bumperArenaInit(monster);
    if (!monster || monster._bumpWatch) return;
    monster._bumpWatch = true;
    const done = new Set();
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (monster._bumpFinaleDone || !_nkBossAlive(monster.id)) return false;
        if (monster.bossImmune || _nkFrozen() || monster.currentHP <= 0) return true;
        const f = monster.currentHP / monster.maxHP;
        if (f <= 0.10) { _finStart(monster); return false; }
        if (f <= 0.30 && !done.has(30)) { done.add(30); done.add(60); _multiball(monster); }
        if (f <= 0.60 && !done.has(60) && !_nkDodgeBusy()) { done.add(60); _tilt(monster); }
        return true;
    });
}

BOSS_MECHANICS.boss_bumper.onInit = _bumpOnInit;

// Console hook for playtests: _BUMP_DEBUG.fire('slam'|'flip'|'tilt'|'multiball', phase), _BUMP_DEBUG.final().
if (typeof window !== 'undefined') {
    const find = () => (globalThis._monsters || []).find(m => m && m.baseId === 'boss_bumper');
    window._BUMP_DEBUG = {
        fire: (name, phase) => {
            const m = find();
            if (!m) return 'no bumper alive';
            const p = phase || m.bossPhase || 1;
            if (name === 'slam') _mechBumperSlam(m, p);
            else if (name === 'flip') _mechBumperFlip(m, Math.max(2, p));
            else if (name === 'tilt') _tilt(m);
            else if (name === 'multiball') _multiball(m);
            else return 'unknown: ' + name;
            return 'fired ' + name;
        },
        final: () => { const m = find(); if (!m) return 'no bumper alive'; _finStart(m); return 'finale started'; },
    };
}
