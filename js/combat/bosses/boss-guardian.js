import { _renderPanel } from '../encounter.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkBossAlive, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE GUARDIAN (boss_guardian)-------------------------
//------------------------------------------------------------------------
// An ancient machine with one burning eye:
//  - LOCK-ON (all fight): a thin aiming line follows you, then FREEZES and
//    fills red - step off the line before it fires.
//  - SWEEP (all fight): a red wedge fills, then the beam sweeps through it.
//  - TOTAL SURVEILLANCE (10%): the Guardian is immune and three eyes at the
//    edges take turns locking on, faster and faster.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_guardian: {
        id: 'boss_guardian', name: 'The Guardian', emoji: '🛰️',
        baseHP: 1080, baseDamage: 24, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_guardian: {
        phases: [
            // Basic attacks are steady pressure; the beams are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'lock_on', intervalBase: 15000, intervalVariance: 3500, handler: '_mechLockOn' },
            { name: 'beam_sweep', intervalBase: 16000, intervalVariance: 4000, handler: '_mechGuardianSweep' },
            { name: 'clue_scramble', intervalBase: 22000, intervalVariance: 5000, handler: '_mechClueScramble' },
        ],
    },
});


//------------------------------------------------------------------------
//-------------------CONSTANTS AND HELPERS-----------------------------------------
//------------------------------------------------------------------------
const HIT_CD_MS = 650;
const BEAM_HALF = 26;                              // half width of a lock-on beam (px)
const LOCK_BY_PHASE = [
    null,
    { n: 2, trackMs: 1500, lockMs: 850, dmg: 0.22 },
    { n: 3, trackMs: 1300, lockMs: 800, dmg: 0.26 },
    { n: 3, trackMs: 1100, lockMs: 750, dmg: 0.30 },
];
const LOCK_TURN = 2.4;                             // rad/s the aim can turn while tracking
const LOCK_GAP_MS = 350;
const SWEEP_BY_PHASE = [
    null,
    { n: 1, deg: 80, warnMs: 1250, sweepMs: 500, dmg: 0.20 },
    { n: 2, deg: 80, warnMs: 1150, sweepMs: 450, dmg: 0.24 },
    { n: 3, deg: 90, warnMs: 1050, sweepMs: 420, dmg: 0.28 },
];
const SWEEP_GAP_MS = 500;
const FIN_INTRO_MS = 1800;
const FIN_FAILSAFE_MS = 120000;
const FIN_LOCKS = 20;                              // lock-ons in the finale, taking turns between three eyes
const FIN_LOCK = { trackMs: [1400, 800], lockMs: [850, 650], dmg: [0.28, 0.40] };
let _hitUntil = 0;
let _finale = null;

// The phase number clamped to 1-3.
function _phase(phase) {
    return Math.max(1, Math.min(3, Number(phase) || 1));
}

// One lightning hit with the boss-ability flash and number, behind a short
// shared cooldown.
function _strike(pct, level, label) {
    const now = performance.now();
    if (now < _hitUntil) return;
    _hitUntil = now + HIT_CD_MS;
    _nkAbilityHitToast(_nkHit(pct, 'lightning', level), 'The Guardian', label, true);
}

// A clock that follows real time (clamped to 0.1 s per frame).
function _clock() {
    let last = performance.now();
    return (now) => { const dt = Math.min(100, Math.max(0, now - last)); last = now; return dt; };
}

// Centre of the Guardian's card (its eye); top middle when it is gone.
function _eyeAt(monster) {
    const card = monster ? document.getElementById('sx-card-' + monster.id) : null;
    const r = card ? card.getBoundingClientRect() : null;
    return r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: 90 };
}

// True when the player's body touches the line from `o` at angle `a`.
function _onLine(o, a, half) {
    const pc = _nkPlayerCenter(), pr = _nkPlayerRect();
    if (!pc || !pr) return false;
    const len = Math.hypot(window.innerWidth, window.innerHeight) * 1.5;
    const body = Math.min(pr.right - pr.left, pr.bottom - pr.top) / 2 - 4;
    return _ptSegDist(pc.x, pc.y, o.x, o.y, o.x + Math.cos(a) * len, o.y + Math.sin(a) * len) <= half + body;
}

// Smallest signed turn from angle a to angle b.
function _turn(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
}


//------------------------------------------------------------------------
//-------------------LOCK-ON (track, freeze + fill, fire)-------------------------------
//------------------------------------------------------------------------

// Runs one lock-on from eye `o`: a thin line tracks you for trackMs (its
// turn speed is capped), then freezes and fills red for lockMs, then fires.
// Calls done() when finished. Returns a step function for the caller's loop.
function _lockOn(run, o, cfg, level, label, done) {
    const pc = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const beam = _nkEl(run, 'div', 'sx-gdn-beam');
    beam.style.left = Math.round(o.x) + 'px';
    beam.style.top = Math.round(o.y - BEAM_HALF) + 'px';
    beam.style.width = Math.round(Math.hypot(window.innerWidth, window.innerHeight) * 1.5) + 'px';
    beam.style.height = (BEAM_HALF * 2) + 'px';
    let a = Math.atan2(pc.y - o.y, pc.x - o.x), t = 0, stage = 'track';
    return (dt) => {
        t += dt;
        if (stage === 'track') {
            const p = _nkPlayerCenter();
            if (p) a += Math.max(-LOCK_TURN * dt / 1000, Math.min(LOCK_TURN * dt / 1000, _turn(a, Math.atan2(p.y - o.y, p.x - o.x))));
            if (t >= cfg.trackMs) {
                stage = 'lock'; t = 0;
                beam.classList.add('lock');
                beam.style.setProperty('--gdn-warn', cfg.lockMs + 'ms');
            }
        } else if (stage === 'lock' && t >= cfg.lockMs) {
            stage = 'fire'; t = 0;
            beam.classList.add('fire');
            if (_onLine(o, a, BEAM_HALF)) _strike(cfg.dmg, level, label);
        } else if (stage === 'fire' && t >= 380) {
            beam.remove();
            done();
            return;
        }
        beam.style.transform = 'rotate(' + a + 'rad)';
    };
}

// Lock-On: the eye's thin aiming line follows you, then freezes and fills
// red - step sideways off the line before it fires. 2 / 3 / 3 in a row.
export function _mechLockOn(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = LOCK_BY_PHASE[_phase(phase)];
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const clock = _clock();
    let i = 0, step = null, wait = 0;
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        if (step) { step(dt); return true; }
        if (i >= cfg.n) return false;
        wait -= dt;
        if (wait > 0) return true;
        i++;
        step = _lockOn(run, _eyeAt(monster), cfg, level, 'Lock-On', () => { step = null; wait = LOCK_GAP_MS; });
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------SWEEP (a red wedge, then the beam swings through)--------------------
//------------------------------------------------------------------------

// Paints a wedge from the eye (a conic-gradient circle masked to the angle
// range) and returns its element.
function _wedge(run, o, a0, a1, warnMs) {
    const R = Math.hypot(window.innerWidth, window.innerHeight) * 1.2;
    const el = _nkEl(run, 'div', 'sx-gdn-wedge');
    el.style.left = Math.round(o.x - R) + 'px';
    el.style.top = Math.round(o.y - R) + 'px';
    el.style.width = el.style.height = Math.round(R * 2) + 'px';
    const from = (a0 * 180 / Math.PI + 90 + 360) % 360, span = (a1 - a0) * 180 / Math.PI;
    el.style.setProperty('--gdn-from', from.toFixed(1) + 'deg');
    el.style.setProperty('--gdn-span', span.toFixed(1) + 'deg');
    el.style.setProperty('--gdn-warn', warnMs + 'ms');
    return el;
}

// True when the player's body is inside the wedge a0..a1 from `o`.
function _inWedge(o, a0, a1) {
    const pc = _nkPlayerCenter();
    if (!pc) return false;
    const a = Math.atan2(pc.y - o.y, pc.x - o.x), mid = (a0 + a1) / 2;
    if (Math.abs(_turn(mid, a)) <= (a1 - a0) / 2) return true;
    return _onLine(o, a0, 0) || _onLine(o, a1, 0);
}

// How far (as an angle) the wedge's start edge sits from your direction:
// your nearest edge is always a short walk away (walk budget = warning time
// minus reaction time); half the time the wedge opens the other way.
function _sweepOffset(span, dist, warnMs) {
    const reach = 300 * Math.max(0.2, (warnMs - 700) / 1000) * 0.8;
    const near = Math.min(span * 0.35, reach / Math.max(80, dist)) * (0.6 + Math.random() * 0.4);
    return Math.random() < 0.5 ? near : span - near;
}

// Sweep: a wedge from the eye that contains you fills red, then the beam
// swings through it. Leave the wedge sideways. Later phases chain sweeps.
export function _mechGuardianSweep(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = SWEEP_BY_PHASE[_phase(phase)];
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const o = _eyeAt(monster);
    const clock = _clock();
    let i = 0, t = 0, cur = null, beam = null;
    _nkLoop(run, (dtS, now) => {
        t += clock(now);
        if (!cur) {
            if (i >= cfg.n) return t < SWEEP_GAP_MS;
            if (i > 0 && t < SWEEP_GAP_MS) return true;
            const pc = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            const span = cfg.deg * Math.PI / 180, aim = Math.atan2(pc.y - o.y, pc.x - o.x);
            const a0 = aim - _sweepOffset(span, Math.hypot(pc.x - o.x, pc.y - o.y), cfg.warnMs);
            cur = { a0, a1: a0 + span, el: _wedge(run, o, a0, a0 + span, cfg.warnMs), cw: Math.random() < 0.5 };
            i++; t = 0;
            return true;
        }
        if (t < cfg.warnMs) return true;
        if (!beam) {
            beam = _nkEl(run, 'div', 'sx-gdn-beam fire');
            beam.style.left = Math.round(o.x) + 'px';
            beam.style.top = Math.round(o.y - BEAM_HALF) + 'px';
            beam.style.width = Math.round(Math.hypot(window.innerWidth, window.innerHeight) * 1.5) + 'px';
            beam.style.height = (BEAM_HALF * 2) + 'px';
            cur.el.classList.add('hot');
            if (_inWedge(o, cur.a0, cur.a1)) _strike(cfg.dmg, level, 'Sweep');
        }
        const f = Math.min(1, (t - cfg.warnMs) / cfg.sweepMs);
        beam.style.transform = 'rotate(' + (cur.cw ? cur.a0 + (cur.a1 - cur.a0) * f : cur.a1 - (cur.a1 - cur.a0) * f) + 'rad)';
        if (f < 1) return true;
        beam.remove(); beam = null;
        const el = cur.el;
        run.timers.push(setTimeout(() => { try { el.remove(); } catch (e) {} }, 200));
        cur = null; t = 0;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------TOTAL SURVEILLANCE (10% finale)-------------------------------------
//------------------------------------------------------------------------

// Pauses or resumes the player's auto-attack charge bar.
function _pauseCharge(paused) {
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('sx-charge-paused', paused);
    });
}

// Ends the finale (once): releases the Guardian.
function _finEnd(g) {
    if (g.finished) return;
    g.finished = true;
    _pauseCharge(false);
    if (g.wrap) g.wrap.classList.remove('sx-nk-shielded');
    const m = (globalThis._monsters || []).find(x => x && x.id === g.monsterId);
    if (m) { m.bossImmune = false; try { _renderPanel(); } catch (e) {} }
    if (_finale === g) _finale = null;
}

// Three eyes on the left, right and bottom edges of the arena.
function _finEyes(run) {
    const W = window.innerWidth, H = window.innerHeight;
    return [{ x: 40, y: H * 0.45 }, { x: W - 40, y: H * 0.45 }, { x: W / 2, y: H - 70 }].map(p => {
        const el = _nkEl(run, 'div', 'sx-gdn-eye');
        el.style.left = Math.round(p.x - 26) + 'px';
        el.style.top = Math.round(p.y - 26) + 'px';
        return p;
    });
}

// Starts the finale: silences the Guardian's other attacks, turns it immune;
// three edge eyes take turns locking on, two at a time and faster as it goes.
function _finStart(monster) {
    if (_finale || monster._gdnFinaleDone) return;
    monster._gdnFinaleDone = true;
    Array.from(_nkRuns.values()).forEach(r => { if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} } });
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    const g = { monsterId: monster.id, finished: false, wrap };
    _finale = g;
    monster.bossImmune = true;
    _pauseCharge(true);
    if (wrap) wrap.classList.add('sx-nk-shielded');
    const run = _nkNewRun(monster.id, true);
    run.onKill = () => _finEnd(g);
    _nkEl(run, 'div', 'sx-nk-fin-banner sx-nk-fin-gdn').innerHTML = '<div class="sx-nk-fin-title">TOTAL SURVEILLANCE</div>';
    const eyes = _finEyes(run);
    const level = monster.level || 1;
    const clock = _clock();
    const steps = new Set();
    let t = 0, total = 0, fired = 0, next = FIN_INTRO_MS;
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        t += dt; total += dt;
        if (total > FIN_FAILSAFE_MS || !_nkBossAlive(monster.id)) return false;
        steps.forEach(s => s(dt));
        if (fired < FIN_LOCKS && t >= next) {
            const f = fired / (FIN_LOCKS - 1), lerp = (r) => r[0] + (r[1] - r[0]) * f;
            const cfg = { trackMs: lerp(FIN_LOCK.trackMs), lockMs: lerp(FIN_LOCK.lockMs), dmg: lerp(FIN_LOCK.dmg) };
            const s = _lockOn(run, eyes[fired % eyes.length], cfg, level, 'Total Surveillance', () => steps.delete(s));
            steps.add(s);
            fired++;
            next = t + (cfg.trackMs + cfg.lockMs) * 0.85;
        }
        return fired < FIN_LOCKS || steps.size > 0;
    });
}

// Passive HP watcher: at 10% the finale begins, once.
function _gdnOnInit(monster) {
    if (!monster || monster._gdnWatch) return;
    monster._gdnWatch = true;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (monster._gdnFinaleDone || !_nkBossAlive(monster.id)) return false;
        if (monster.currentHP > 0 && monster.currentHP <= monster.maxHP * 0.10 && !monster.bossImmune && !_nkFrozen()) {
            _finStart(monster);
            return false;
        }
        return true;
    });
}

BOSS_MECHANICS.boss_guardian.onInit = _gdnOnInit;


//------------------------------------------------------------------------
//-------------------TEARDOWN AND DEBUG HOOK------------------------------------------
//------------------------------------------------------------------------

// Called from the boss cleanup on boss death AND on encounter stop: removes
// every element the Guardian created and frees the charge bar.
export function _gdnTeardown() {
    if (_finale) { try { _finEnd(_finale); } catch (e) {} }
    document.querySelectorAll('.sx-gdn-beam, .sx-gdn-wedge, .sx-gdn-eye, .sx-nk-fin-gdn').forEach(el => { try { el.remove(); } catch (e) {} });
    _pauseCharge(false);
}

// Console hook for playtests: _GDN_DEBUG.fire('lock'|'sweep', phase), _GDN_DEBUG.final().
if (typeof window !== 'undefined') {
    const find = () => (globalThis._monsters || []).find(m => m && m.baseId === 'boss_guardian');
    window._GDN_DEBUG = {
        fire: (name, phase) => {
            const m = find();
            const fn = { lock: _mechLockOn, sweep: _mechGuardianSweep }[name];
            if (!m) return 'no guardian alive';
            if (!fn) return 'unknown: ' + name;
            fn(m, phase || m.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => { const m = find(); if (!m) return 'no guardian alive'; _finStart(m); return 'finale started'; },
    };
}
