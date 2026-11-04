import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE JELLY (boss_jelly)-------------------------------
//------------------------------------------------------------------------
// A cold slime that hops. Every blob throws a shadow that fills up; when
// it is full the blob lands there.
//  - JELLY HOPS (all fight): one blob hops after you 3-5 times. From 55%
//    every landing leaves a slime puddle that hurts to touch.
//  - SPLIT (all fight): a big blob lands on your spot and bursts into
//    droplets that shoot out along red lanes.
//  - ICE SHELL (55%) and the JELLY ARMY finale (10%): boss-jelly-shell.js.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_jelly: {
        id: 'boss_jelly', name: 'The Jelly', emoji: '🟢',
        baseHP: 880, baseDamage: 20, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_jelly: {
        phases: [
            // Basic attacks are steady pressure; the blobs are the real threat.
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.55, chargeMax: 12, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 11, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'jelly_hops', intervalBase: 14000, intervalVariance: 3500, handler: '_mechJellyHops' },
            { name: 'jelly_split', intervalBase: 17000, intervalVariance: 4000, handler: '_mechJellySplit' },
            { name: 'probability_shift', intervalBase: 22000, intervalVariance: 5000, handler: '_mechProbabilityShift' },
        ],
    },
});


//------------------------------------------------------------------------
//-------------------CONSTANTS AND SHARED HELPERS---------------------------------
//------------------------------------------------------------------------
const JLY_HIT_CD_MS = 650;                         // shared hit cooldown
const JLY_ARC_PX = 90;                             // height of a hop's arc
const JLY_FLY_MS = 600;                            // a blob is airborne for the last part of its shadow
const PUDDLE_R = 64;
const PUDDLE_LIFE_MS = 6500;
const PUDDLE_DMG = [0, 0, 0.09, 0.11];             // touch hit by phase (puddles from 55%)
let _jlyHitUntil = 0;

// The phase number clamped to 1-3.
export function _jlyPhase(phase) {
    return Math.max(1, Math.min(3, Number(phase) || 1));
}

// One cold hit with the boss-ability flash and number, behind a short shared
// cooldown so two blobs landing together never stack.
export function _jlyStrike(pct, level, label) {
    const now = performance.now();
    if (now < _jlyHitUntil) return false;
    _jlyHitUntil = now + JLY_HIT_CD_MS;
    _nkAbilityHitToast(_nkHit(pct, 'cold', level), 'The Jelly', label, true);
    return true;
}

// Player centre, or the screen centre when there is no avatar.
export function _jlyPC() {
    return _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

// Centre of the Jelly's card (where blobs start); top middle if it is gone.
export function _jlyBossCentre(monster) {
    const card = monster ? document.getElementById('sx-card-' + monster.id) : null;
    const el = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (el) {
        const r = el.getBoundingClientRect();
        if (r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: window.innerWidth / 2, y: 90 };
}

// A clock that follows real time (clamped to 0.1 s per frame), so the CSS
// shadow fills and the landings in code never drift apart.
export function _jlyClock() {
    let last = performance.now();
    return (now) => {
        const dt = Math.min(100, Math.max(0, now - last));
        last = now;
        return dt;
    };
}


//------------------------------------------------------------------------
//-------------------BLOBS (shadow fills, blob lands)--------------------------------
//------------------------------------------------------------------------

// Creates a blob that jumps from `from` to `to`. Its shadow (radius r) fills
// over warnMs; the blob is in the air for the last part and lands when the
// shadow is full. size scales the blob drawing (1 = normal, 1.7 = big).
export function _jlyBlob(run, from, to, warnMs, r, size) {
    const el = _nkEl(run, 'div', 'sx-jly-blob' + (size > 1 ? ' sx-jly-blob-big' : ''));
    const mark = _nkEl(run, 'div', 'sx-jly-shadow');
    mark.style.left = Math.round(to.x - r) + 'px';
    mark.style.top = Math.round(to.y - r) + 'px';
    mark.style.width = mark.style.height = (r * 2) + 'px';
    mark.style.setProperty('--jly-warn', warnMs + 'ms');
    const b = { x: from.x, y: from.y, tx: to.x, ty: to.y, r, warnMs, t: 0, el, mark, half: 22 * (size || 1), landed: false };
    _jlyPlaceBlob(b, from.x, from.y);
    return b;
}

// Puts the blob drawing centred on (x, y).
function _jlyPlaceBlob(b, x, y) {
    b.el.style.transform = 'translate(' + Math.round(x - b.half) + 'px,' + Math.round(y - b.half) + 'px)';
}

// Moves a blob on by dtMs. Returns true on the frame it lands (its shadow
// flashes and fades); the caller judges the hit.
export function _jlyStepBlob(b, dtMs) {
    if (b.landed) return false;
    b.t += dtMs;
    const fly = Math.min(JLY_FLY_MS, b.warnMs);
    const f = Math.max(0, Math.min(1, (b.t - (b.warnMs - fly)) / fly));
    _jlyPlaceBlob(b, b.x + (b.tx - b.x) * f, b.y + (b.ty - b.y) * f - Math.sin(f * Math.PI) * JLY_ARC_PX);
    if (b.t < b.warnMs) return false;
    b.landed = true;
    b.mark.classList.add('sx-jly-shadow-hit');
    const mark = b.mark;
    setTimeout(() => { try { mark.remove(); } catch (e) {} }, 420);
    return true;
}

// True when the player is under a landed blob's shadow.
export function _jlyUnder(b) {
    return _nkCircleHit(b.tx, b.ty, b.r, _nkPlayerRect(), 0);
}


//------------------------------------------------------------------------
//-------------------SLIME PUDDLES (left behind by hops from 55%)------------------
//------------------------------------------------------------------------

// Leaves a slime puddle at (x, y) that hurts to touch until it dries up.
export function _jlyPuddle(run, puddles, x, y) {
    const el = _nkEl(run, 'div', 'sx-jly-puddle');
    el.style.left = Math.round(x - PUDDLE_R) + 'px';
    el.style.top = Math.round(y - PUDDLE_R) + 'px';
    el.style.width = el.style.height = (PUDDLE_R * 2) + 'px';
    el.style.setProperty('--jly-life', PUDDLE_LIFE_MS + 'ms');
    puddles.push({ x, y, el, left: PUDDLE_LIFE_MS });
}

// Ages the puddles by dtMs and hits a player standing in one.
export function _jlyStepPuddles(puddles, dtMs, pct, level) {
    const pr = _nkPlayerRect();
    for (let i = puddles.length - 1; i >= 0; i--) {
        const p = puddles[i];
        p.left -= dtMs;
        if (p.left <= 0) { try { p.el.remove(); } catch (e) {} puddles.splice(i, 1); continue; }
        if (pct && _nkCircleHit(p.x, p.y, PUDDLE_R - 8, pr, 0)) _jlyStrike(pct, level, 'Slime Puddle');
    }
}


//------------------------------------------------------------------------
//-------------------JELLY HOPS (one blob follows you)--------------------------------
//------------------------------------------------------------------------
const HOPS_BY_PHASE = [
    null,
    { hops: 3, warnMs: 1100, r: 72, dmg: 0.14 },
    { hops: 4, warnMs: 1000, r: 72, dmg: 0.17 },
    { hops: 5, warnMs: 900, r: 76, dmg: 0.20 },
];
const HOP_GAP_MS = 250;

// Jelly Hops: one blob hops after you; each shadow is placed where you stand
// when the hop starts. From phase 2 every landing leaves a slime puddle.
export function _mechJellyHops(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = _jlyPhase(phase);
    const cfg = HOPS_BY_PHASE[p];
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const puddles = [];
    const clock = _jlyClock();
    let from = _jlyBossCentre(monster), blob = null, done = 0, wait = 0;
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        _jlyStepPuddles(puddles, dt, PUDDLE_DMG[p], level);
        if (!blob) {
            if (done >= cfg.hops) return puddles.length > 0;
            wait -= dt;
            if (wait > 0) return true;
            blob = _jlyBlob(run, from, _jlyPC(), cfg.warnMs, cfg.r, 1);
            return true;
        }
        if (!_jlyStepBlob(blob, dt)) return true;
        if (_jlyUnder(blob)) _jlyStrike(cfg.dmg, level, 'Jelly Hops');
        if (PUDDLE_DMG[p]) _jlyPuddle(run, puddles, blob.tx, blob.ty);
        from = { x: blob.tx, y: blob.ty };
        if (done + 1 >= cfg.hops) { try { blob.el.remove(); } catch (e) {} }
        else { const el = blob.el; run.timers.push(setTimeout(() => { try { el.remove(); } catch (e) {} }, HOP_GAP_MS)); }
        blob = null; done++; wait = HOP_GAP_MS;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------SPLIT (big blob, then droplet lanes)-----------------------------
//------------------------------------------------------------------------
const SPLIT_LANE = 56;                             // droplet lane width (px)
const SPLIT_LANE_MS = 700;                         // droplet lanes fill this long after the landing
const SPLIT_BY_PHASE = [
    null,
    { warnMs: 1350, r: 115, dmg: 0.18, lanes: 4, laneDmg: 0.11 },
    { warnMs: 1250, r: 120, dmg: 0.21, lanes: 4, laneDmg: 0.13 },
    { warnMs: 1150, r: 125, dmg: 0.24, lanes: 8, laneDmg: 0.15 },
];

// Paints the droplet lanes that leave the landing spot (rotated strips that
// fill red); returns their end points for the hit test.
function _splitLanes(run, c, n) {
    const len = Math.hypot(window.innerWidth, window.innerHeight);
    const off = Math.random() * Math.PI * 2;
    const lanes = [];
    for (let i = 0; i < n; i++) {
        const a = off + i * Math.PI * 2 / n;
        const el = _nkEl(run, 'div', 'sx-jly-lane');
        el.style.left = Math.round(c.x) + 'px';
        el.style.top = Math.round(c.y - SPLIT_LANE / 2) + 'px';
        el.style.width = Math.round(len) + 'px';
        el.style.height = SPLIT_LANE + 'px';
        el.style.transform = 'rotate(' + (a * 180 / Math.PI).toFixed(1) + 'deg)';
        el.style.setProperty('--jly-warn', SPLIT_LANE_MS + 'ms');
        lanes.push({ el, a, ex: c.x + Math.cos(a) * len, ey: c.y + Math.sin(a) * len });
    }
    return lanes;
}

// Fires the droplets: each lane flashes, a droplet streaks out along it,
// and a player touching any lane is hit once.
function _splitFire(run, c, lanes, cfg, level) {
    const pc = _nkPlayerCenter();
    const pr = _nkPlayerRect();
    const body = pr ? Math.min(pr.right - pr.left, pr.bottom - pr.top) / 2 - 4 : 0;
    const hit = pc && lanes.some(l => _ptSegDist(pc.x, pc.y, c.x, c.y, l.ex, l.ey) <= SPLIT_LANE / 2 + body);
    if (hit) _jlyStrike(cfg.laneDmg, level, 'Split');
    lanes.forEach(l => {
        l.el.classList.add('sx-jly-lane-hit');
        const drop = _nkEl(run, 'div', 'sx-jly-drop');
        drop.style.left = Math.round(c.x - 12) + 'px';
        drop.style.top = Math.round(c.y - 12) + 'px';
        drop.style.setProperty('--dx', Math.round(Math.cos(l.a) * 900) + 'px');
        drop.style.setProperty('--dy', Math.round(Math.sin(l.a) * 900) + 'px');
    });
}

// Split: a big blob lands on your spot (its shadow fills first), then bursts
// into droplets that shoot out along red lanes - step off the shadow, then
// off the lanes. Phase 3 bursts into eight lanes instead of four.
export function _mechJellySplit(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = SPLIT_BY_PHASE[_jlyPhase(phase)];
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const clock = _jlyClock();
    const blob = _jlyBlob(run, _jlyBossCentre(monster), _jlyPC(), cfg.warnMs, cfg.r, 1.7);
    let stage = 'fall', t = 0, lanes = null;
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        if (stage === 'fall') {
            if (!_jlyStepBlob(blob, dt)) return true;
            if (_jlyUnder(blob)) _jlyStrike(cfg.dmg, level, 'Split');
            blob.el.classList.add('sx-jly-blob-burst');
            lanes = _splitLanes(run, { x: blob.tx, y: blob.ty }, cfg.lanes);
            stage = 'lanes'; t = 0;
            return true;
        }
        t += dt;
        if (stage === 'lanes' && t >= SPLIT_LANE_MS) {
            _splitFire(run, { x: blob.tx, y: blob.ty }, lanes, cfg, level);
            stage = 'fade'; t = 0;
        }
        return stage !== 'fade' || t < 600;
    });
}
