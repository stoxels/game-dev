import { Audio_Manager } from '../../audio/audio.js';
import { _renderPanel } from '../encounter.js';
import { _bossCorrupted } from '../combat-state.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkBossAlive, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkNudgeAvatar, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _removeCellCorruption } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE SNAIL (boss_snail)-------------------------------
//------------------------------------------------------------------------
// Slow but relentless; its slime is the danger.
//  - DOOM SNAIL (all fight): one homing snail that never gives up and
//    leaves slime behind (slime slows you). The only way to get rid of it:
//    lure it over a corrupted cell - it is destroyed and returns later.
//  - SLIME SPIT (all fight): filling circles on your spot; every glob that
//    lands leaves a slime puddle.
//  - SNAILGEDDON finale (10%): immune; rings of snails close in around
//    you, one green-glowing wedge crawls slower - escape through its gap.
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
            // Basic attacks are steady pressure; the slime is the real threat.
            { threshold: 1.00, chargeMax: 14, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 12, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 11, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'doom_snail', intervalBase: 8000, intervalVariance: 2000, handler: '_mechDoomSnail' },
            { name: 'slime_spit', intervalBase: 14000, intervalVariance: 3500, handler: '_mechSnailSpit' },
            { name: 'corrupt_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_mechCorruptCells' },
        ],
    },
});


//------------------------------------------------------------------------
//-------------------CONSTANTS AND STATE------------------------------------------------
//------------------------------------------------------------------------
const HIT_CD_MS = 650;                             // shared hit cooldown
const SLIME_SLOW = 0.5;                            // move speed while standing in slime
const SLIME_R = 46;                                // trail puddle radius
const SLIME_TRAIL_EVERY_PX = 70;                   // the doom snail drops a puddle this often
const SLIME_TRAIL_MS = 9000;
const SPIT_R = 86;
const SPIT_PUDDLE_R = 72;
const SPIT_PUDDLE_MS = 7000;
const SPIT_EVERY_MS = 700;
const SPIT_BY_PHASE = [null, { n: 2, warnMs: 1150, dmg: 0.15 }, { n: 3, warnMs: 1080, dmg: 0.18 }, { n: 4, warnMs: 1000, dmg: 0.21 }];
const DOOM_SPEED = [0, 46, 56, 66];                // px/s - slow, but you are slower in slime
const DOOM_R = 28;
const DOOM_DMG = [0, 0.22, 0.26, 0.30];
const DOOM_HIT_CD_MS = 1400;
const DOOM_BANISH_MS = 30000;                      // after a banish the next snail waits this long
const RING_R = 300;                                // finale ring radius (shrunk on small screens)
const RING_SNAIL_R = 24;
const RING_FORM_MS = 1000;                         // the ring stands still this long first
const RING_SLOW = 0.2;                             // the gap wedge crawls at this fraction
const RING_PAUSE_MS = 1100;
const RING_HIT_CD_MS = 1000;
const RING_NUDGE_PX = 70;
const RING_RUN_PX_S = 300;
const FIN_INTRO_MS = 1800;
const FIN_FAILSAFE_MS = 120000;
const FIN_WAVES = [                                // snails in the ring, seconds to close, hit
    { n: 18, closeS: 4.4, dmg: 0.20 }, { n: 20, closeS: 4.1, dmg: 0.22 }, { n: 21, closeS: 3.9, dmg: 0.24 },
    { n: 22, closeS: 3.7, dmg: 0.26 }, { n: 24, closeS: 3.5, dmg: 0.28 }, { n: 25, closeS: 3.3, dmg: 0.30 },
    { n: 26, closeS: 3.1, dmg: 0.32 }, { n: 27, closeS: 3.0, dmg: 0.33 }, { n: 28, closeS: 2.9, dmg: 0.34 },
    { n: 28, closeS: 2.8, dmg: 0.35 },
];

let _hitUntil = 0;
let _puddles = [];                                 // slime on the floor: { x, y, r, until, el }
let _doom = null;                                  // the doom snail run state, or null
let _nextDoomAt = 0;                               // no new doom snail before this time
let _finale = null;                                // the running finale (one at a time)


//------------------------------------------------------------------------
//-------------------LOW-LEVEL HELPERS-------------------------------------------------
//------------------------------------------------------------------------

// The phase number clamped to 1-3.
function _phase(phase) {
    return Math.max(1, Math.min(3, Number(phase) || 1));
}

// One physical hit with the boss-ability flash and number, behind a short
// shared cooldown.
function _strike(pct, level, label) {
    const now = performance.now();
    if (now < _hitUntil) return false;
    _hitUntil = now + HIT_CD_MS;
    _nkAbilityHitToast(_nkHit(pct, null, level), 'The Snail', label, true);
    return true;
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

// Draws a snail (CSS shell and body) at x, y; faces left when flip is set.
function _placeSnail(el, x, y, flip) {
    el.style.transform = 'translate(' + Math.round(x - 30) + 'px,' + Math.round(y - 22) + 'px)' + (flip ? ' scaleX(-1)' : '');
}


//------------------------------------------------------------------------
//-------------------SLIME (puddles that slow you)---------------------------------------
//------------------------------------------------------------------------

// Lays a slime puddle on the floor; it dries up by itself after lifeMs.
function _slime(x, y, r, lifeMs) {
    const el = document.createElement('div');
    el.className = 'sx-snl-slime';
    el.style.left = Math.round(x - r) + 'px';
    el.style.top = Math.round(y - r) + 'px';
    el.style.width = el.style.height = (r * 2) + 'px';
    el.style.setProperty('--snl-life', lifeMs + 'ms');
    document.body.appendChild(el);
    const p = { x, y, r, until: performance.now() + lifeMs, el };
    _puddles.push(p);
    setTimeout(() => {
        try { el.remove(); } catch (e) {}
        const i = _puddles.indexOf(p);
        if (i >= 0) _puddles.splice(i, 1);
    }, lifeMs);
}

// Removes every slime puddle on the floor.
function _clearSlime() {
    _puddles.forEach(p => { try { p.el.remove(); } catch (e) {} });
    _puddles = [];
}

// Movement multiplier for the avatar: slowed while standing in slime.
// Read by the avatar mover (player_sprite.js).
export function _snailMoveMult() {
    if (!_puddles.length) return 1;
    const pc = _nkPlayerCenter();
    if (!pc) return 1;
    return _puddles.some(p => Math.hypot(pc.x - p.x, pc.y - p.y) <= p.r * 0.9) ? SLIME_SLOW : 1;
}


//------------------------------------------------------------------------
//-------------------DOOM SNAIL (homing, banished by corruption)-----------------------
//------------------------------------------------------------------------

// The corrupted cell the snail is crawling over, or null.
function _corruptUnder(x, y) {
    if (!_bossCorrupted || !_bossCorrupted.size) return null;
    let hit = null;
    _bossCorrupted.forEach((data, key) => {
        if (hit) return;
        const cell = document.getElementById('g-' + key);
        const r = cell && cell.isConnected ? cell.getBoundingClientRect() : null;
        if (r && r.width && x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) hit = key;
    });
    return hit;
}

// The snail crawled onto corruption: it bursts, the cell is cleaned and the
// next snail waits DOOM_BANISH_MS.
function _banish(st, key) {
    _nextDoomAt = Date.now() + DOOM_BANISH_MS;
    try { _removeCellCorruption(key); } catch (e) {}
    const burst = document.createElement('div');
    burst.className = 'sx-snl-burst';
    burst.style.left = Math.round(st.x) + 'px';
    burst.style.top = Math.round(st.y) + 'px';
    document.body.appendChild(burst);
    setTimeout(() => { try { burst.remove(); } catch (e) {} }, 700);
}

// Doom Snail: one slow homing snail that never leaves on its own. It hurts
// on contact and drops slime as it crawls; lure it over a corrupted cell
// to destroy it. It runs passive, so the other attacks keep coming.
export function _mechDoomSnail(monster, phase) {
    if (_doom || _nkFrozen() || Date.now() < _nextDoomAt) return;
    const p = _phase(phase);
    const run = _nkNewRun(monster && monster.id, true);
    run.passive = true;
    const W = window.innerWidth, H = window.innerHeight;
    const fromLeft = _pc().x > W / 2;
    const st = { run, x: fromLeft ? 40 : W - 40, y: H - 110, trail: 0, cd: 0, el: _nkEl(run, 'div', 'sx-snl-snail sx-snl-doom') };
    _doom = st;
    run.onKill = () => { if (_doom === st) _doom = null; };
    const level = monster ? monster.level : 1;
    const clock = _clock();
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        const c = _pc(), live = (globalThis._monsters || []).find(m => m && m.id === (monster && monster.id));
        const speed = DOOM_SPEED[_phase(live ? live.bossPhase : p)];
        const dx = c.x - st.x, dy = c.y - st.y, d = Math.hypot(dx, dy) || 1, step = Math.min(d, speed * dt / 1000);
        st.x += dx / d * step; st.y += dy / d * step;
        _placeSnail(st.el, st.x, st.y, dx < 0);
        st.trail += step;
        if (st.trail >= SLIME_TRAIL_EVERY_PX) { st.trail = 0; _slime(st.x, st.y + 8, SLIME_R, SLIME_TRAIL_MS); }
        if (now >= st.cd && _nkCircleHit(st.x, st.y, DOOM_R, _nkPlayerRect(), 0) && _strike(DOOM_DMG[p], level, 'Doom Snail')) {
            st.cd = now + DOOM_HIT_CD_MS;
        }
        const key = _corruptUnder(st.x, st.y);
        if (!key) return true;
        _banish(st, key);
        return false;
    });
}


//------------------------------------------------------------------------
//-------------------SLIME SPIT (filling circles, puddles)------------------------------
//------------------------------------------------------------------------

// Slime Spit: red circles fill on your spot one after another; every glob
// that lands hurts and leaves a big slime puddle.
export function _mechSnailSpit(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = SPIT_BY_PHASE[_phase(phase)];
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const globs = [];
    const clock = _clock();
    let t = 0;
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        t += dt;
        while (globs.length < cfg.n && t >= globs.length * SPIT_EVERY_MS) {
            const c = _pc();
            const el = _nkEl(run, 'div', 'sx-snl-spit');
            el.style.left = Math.round(c.x - SPIT_R) + 'px';
            el.style.top = Math.round(c.y - SPIT_R) + 'px';
            el.style.width = el.style.height = (SPIT_R * 2) + 'px';
            el.style.setProperty('--snl-warn', cfg.warnMs + 'ms');
            globs.push({ x: c.x, y: c.y, el, at: globs.length * SPIT_EVERY_MS + cfg.warnMs, done: false });
        }
        globs.forEach(gl => {
            if (gl.done || t < gl.at) return;
            gl.done = true;
            try { gl.el.remove(); } catch (e) {}
            if (_nkCircleHit(gl.x, gl.y, SPIT_R, _nkPlayerRect(), 0)) _strike(cfg.dmg, level, 'Slime Spit');
            _slime(gl.x, gl.y, SPIT_PUDDLE_R, SPIT_PUDDLE_MS);
            try { Audio_Manager.playSFX('boss_snail_slime'); } catch (e) {}
        });
        return !(globs.length >= cfg.n && globs.every(gl => gl.done));
    });
}


//------------------------------------------------------------------------
//-------------------SNAILGEDDON (10% finale)------------------------------------------------
//------------------------------------------------------------------------

// Pauses or resumes the player's auto-attack charge bar.
function _pauseCharge(paused) {
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('sx-charge-paused', paused);
    });
}

// How many neighbouring snails must crawl slowly so the gap they leave is
// wide enough for you when you reach it (you run out while the ring shrinks).
function _gapArc(n, r, closeS) {
    const pr = _nkPlayerRect();
    const need = (pr ? pr.right - pr.left : 52) + 60 + RING_SNAIL_R * 2;
    const meet = r / (RING_RUN_PX_S + r / closeS) + 0.5;
    const scale = Math.max(0.3, 1 - meet / closeS);
    const slot = Math.PI * 2 * r / n;
    for (let a = 2; a < n / 3; a++) if ((a + 1) * slot * scale >= need) return a;
    return Math.floor(n / 3);
}

// Builds one ring of snails around the player (kept on screen).
function _newRing(run, cfg) {
    const W = window.innerWidth, H = window.innerHeight;
    const r = Math.max(150, Math.min(RING_R, Math.min(W, H - 160) / 2 - 30));
    const pc = _pc();
    const cx = Math.max(r + 20, Math.min(W - r - 20, pc.x)), cy = Math.max(r + 90, Math.min(H - r - 60, pc.y));
    const arc = _gapArc(cfg.n, r, cfg.closeS), start = Math.floor(Math.random() * cfg.n), a0 = Math.random() * Math.PI * 2;
    const snails = [];
    for (let i = 0; i < cfg.n; i++) {
        const a = a0 + i / cfg.n * Math.PI * 2, slow = ((i - start + cfg.n) % cfg.n) < arc;
        const el = _nkEl(run, 'div', 'sx-snl-snail' + (slow ? ' slow' : ''));
        snails.push({ a, slow, el, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, out: 0, gone: false });
    }
    const outline = _nkEl(run, 'div', 'sx-snl-ring');
    outline.style.left = Math.round(cx - r) + 'px';
    outline.style.top = Math.round(cy - r) + 'px';
    outline.style.width = outline.style.height = Math.round(r * 2) + 'px';
    return { cx, cy, r, cfg, snails, outline, t: 0, nextHit: 0 };
}

// Steps one ring: it stands for RING_FORM_MS, then closes in (the slow
// wedge lags behind). Touching a snail hurts and shoves you back in.
// Returns false when you escaped or the ring collapsed.
function _stepRing(ring, dt, now, level) {
    ring.t += dt;
    const u = Math.max(0, ring.t - RING_FORM_MS) / (ring.cfg.closeS * 1000);
    if (u > 0) ring.outline.classList.add('closing');
    const pc = _nkPlayerCenter(), pr = _nkPlayerRect();
    let fastLeft = 0;
    ring.snails.forEach(s => {
        if (s.gone) return;
        const rr = Math.max(0, ring.r * (1 - Math.min(1, u * (s.slow ? RING_SLOW : 1))) + s.out);
        s.out = Math.max(0, s.out - dt * 0.08);
        s.x = ring.cx + Math.cos(s.a) * rr; s.y = ring.cy + Math.sin(s.a) * rr;
        if (rr <= 8) { s.gone = true; s.el.remove(); return; }
        if (!s.slow) fastLeft++;
        _placeSnail(s.el, s.x, s.y, Math.cos(s.a) > 0);
        if (now < ring.nextHit || !_nkCircleHit(s.x, s.y, RING_SNAIL_R, pr, 0)) return;
        ring.nextHit = now + RING_HIT_CD_MS;
        _strike(ring.cfg.dmg, level, 'Snailgeddon');
        s.out = 70;
        const d = pc ? Math.hypot(pc.x - ring.cx, pc.y - ring.cy) || 1 : 1;
        if (pc && d > 90) { try { _nkNudgeAvatar((ring.cx - pc.x) / d * RING_NUDGE_PX, (ring.cy - pc.y) / d * RING_NUDGE_PX); } catch (e) {} }
    });
    const escaped = pc && Math.hypot(pc.x - ring.cx, pc.y - ring.cy) > ring.r * (1 - Math.min(1, u)) + RING_SNAIL_R + 30 && u > 0;
    if (!escaped && fastLeft > 0 && ring.t < RING_FORM_MS + ring.cfg.closeS * 1000 + 1500) return true;
    ring.snails.forEach(s => { try { s.el.remove(); } catch (e) {} });
    try { ring.outline.remove(); } catch (e) {}
    return false;
}

// Ends the finale (once): releases the Snail and frees the charge bar.
function _finEnd(g) {
    if (g.finished) return;
    g.finished = true;
    _pauseCharge(false);
    if (g.wrap) g.wrap.classList.remove('sx-nk-shielded');
    const m = (globalThis._monsters || []).find(x => x && x.id === g.monsterId);
    if (m) { m.bossImmune = false; try { _renderPanel(); } catch (e) {} }
    if (_finale === g) _finale = null;
}

// Starts the finale: silences every other run of the Snail (the doom snail
// too), turns it immune and runs the rings one after another.
function _finStart(monster) {
    if (_finale || monster._snlFinaleDone) return;
    monster._snlFinaleDone = true;
    Array.from(_nkRuns.values()).forEach(r => { if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} } });
    _clearSlime();
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    const g = { monsterId: monster.id, finished: false, wrap };
    _finale = g;
    monster.bossImmune = true;
    _pauseCharge(true);
    if (wrap) wrap.classList.add('sx-nk-shielded');
    const run = _nkNewRun(monster.id, true);
    run.onKill = () => _finEnd(g);
    _nkEl(run, 'div', 'sx-nk-fin-banner sx-nk-fin-snl').innerHTML = '<div class="sx-nk-fin-title">SNAILGEDDON</div>';
    const level = monster.level || 1;
    const clock = _clock();
    let t = 0, wave = 0, ring = null, waitUntil = FIN_INTRO_MS;
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        t += dt;
        if (t > FIN_FAILSAFE_MS || !_nkBossAlive(monster.id)) return false;
        if (ring) {
            if (_stepRing(ring, dt, now, level)) return true;
            ring = null; waitUntil = t + RING_PAUSE_MS;
            return wave < FIN_WAVES.length;
        }
        if (t < waitUntil) return true;
        ring = _newRing(run, FIN_WAVES[wave++]);
        return true;
    });
}

// Passive HP watcher: at 10% the finale begins, once.
function _snlOnInit(monster) {
    if (!monster || monster._snlWatch) return;
    monster._snlWatch = true;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (monster._snlFinaleDone || !_nkBossAlive(monster.id)) return false;
        if (monster.currentHP > 0 && monster.currentHP <= monster.maxHP * 0.10 && !monster.bossImmune && !_nkFrozen()) {
            _finStart(monster);
            return false;
        }
        return true;
    });
}

BOSS_MECHANICS.boss_snail.onInit = _snlOnInit;


//------------------------------------------------------------------------
//-------------------TEARDOWN AND DEBUG HOOK------------------------------------------
//------------------------------------------------------------------------

// Called from the boss cleanup on boss death AND on encounter stop: ends the
// finale, removes the slime and every snail, frees the charge bar.
export function _snailTeardown() {
    if (_finale) { try { _finEnd(_finale); } catch (e) {} }
    _clearSlime();
    _doom = null;
    _nextDoomAt = 0;
    document.querySelectorAll('.sx-snl-snail, .sx-snl-spit, .sx-snl-ring, .sx-snl-burst, .sx-nk-fin-snl')
        .forEach(el => { try { el.remove(); } catch (e) {} });
    _pauseCharge(false);
}

// Console hook for playtests: _SNL_DEBUG.fire('doom'|'spit', phase), _SNL_DEBUG.final().
if (typeof window !== 'undefined') {
    const find = () => (globalThis._monsters || []).find(m => m && m.baseId === 'boss_snail');
    window._SNL_DEBUG = {
        fire: (name, phase) => {
            const m = find();
            const fn = { doom: _mechDoomSnail, spit: _mechSnailSpit }[name];
            if (!m) return 'no snail alive';
            if (!fn) return 'unknown: ' + name;
            fn(m, phase || m.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => { const m = find(); if (!m) return 'no snail alive'; _finStart(m); return 'finale started'; },
    };
}
