import { LANG } from '../../translation/translations.js';
import { _damageTargetById } from '../encounter-monster-damage.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _animPlayerWalkFrames } from '../../sprite/sprite_animations.js';
import { _teleportAvatarTo } from './boss-wormhole.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkToast, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: LAPLACE'S DEMON (boss_laplace)------------------
//------------------------------------------------------------------------
// Tier-7 rework "It Has Already Seen This": every telegraph plays twice -
// a harmless ghost prediction ~3s early, then the real thing. Branches +
// fray join at 60%; THE CLOSED TIMELINE finale at ≤10% repeats a learnable
// 20s gauntlet loop until 3 timeline nodes break.
//------------------------------------------------------------------------

// Mechanic announcements are shown once per fight: every telegraph already
// explains itself on screen, and repeating the toast every cast buried the
// combat log. Cleared again by _lapTeardown.
const _lapToastsShown = new Set();
function _lapToastOnce(key, msg, color) {
    if (_lapToastsShown.has(key)) return;
    _lapToastsShown.add(key);
    _nkToast(key, msg, color);
}

// Prefix discipline: everything here is _lap / sx-lap-.

// DEBUG: slow Laplace's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Off for ship.
export const _LAP_DEBUG_SLOW = false;
export const _LAP_DEBUG_MULT = _LAP_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_laplace: {
        id: 'boss_laplace', name: "Laplace's Demon", emoji: '👁️',
        baseHP: 2600, baseDamage: 24, chargeMax: 11,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {

    // boss_laplace - "It Has Already Seen This" (rework)
    // Phase 1 (100% → 60%): Demonstrated Fate teaches ghost-reading
    // Phase 2 ( 60% → 30%): immune window, Branches + Fray join
    // Phase 3 ( 30% →  0%): crossed fates; at 10% the CLOSED TIMELINE begins
    boss_laplace: {
        phases: [
            { threshold: 1.00, chargeMax: 9, damageMultiplier: 1.10 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.40 },
            { threshold: 0.30, chargeMax: 7, damageMultiplier: 1.75 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'demonstrated_fate', intervalBase: 14000, intervalVariance: 3000, handler: '_mechLapFate' },
            { name: 'prior_bomb', intervalBase: 15000, intervalVariance: 3000, handler: '_mechPriorBomb' },
            { name: 'past_echo', intervalBase: 15000, intervalVariance: 3000, handler: '_mechLapEcho' },
            { name: 'conditional_branches', intervalBase: 19000, intervalVariance: 4000, handler: '_mechLapBranches', phase2Only: true },
            { name: 'timeline_fray', intervalBase: 22000, intervalVariance: 5000, handler: '_mechLapFray', phase2Only: true },
        ],
        onInit: _lapOnInit,
        onPhaseEnter: _lapOnPhaseEnter,
    },
});


// ── Shared tuning ───────────────────────────────────────────────────────────
export const LAP_LANCE_W      = 140;    // lance corridor width
export const LAP_LANCE_SPEED  = 800;    // px/s along its path
export const LAP_LANCE_HIT    = 0.20;   // %maxHP caught in the corridor
export const LAP_LANCE_END    = 0.18;   // %maxHP endpoint pin-blast (R120)
export const LAP_GHOST_LEAD   = 1200;   // ms the ghost runs ahead of the real lance
export const LAP_BRANCH_HIT   = 0.18;   // %maxHP true-future detonation (R90)
export const LAP_GHOST_FORM   = 2000;   // ms of ghost-form from a fake future
export const LAP_FRAY_RECALL  = 6;      // s of movement the clone replays
export const LAP_FRAY_CD_MS   = 9000;   // between player-swaps
export const LAP_TOUCH_MS     = 700;    // shared touch cooldown
export const LAP_NODE_STAND   = 3.0;    // s cumulative standing to break a node
export const LAP_NODE_GOAL    = 3;      // nodes to close the timeline
const LAP_LOOP_CYCLE_MS = 9000;   // length of one replayed fire pattern
const LAP_LOOP_WARN_MS  = 1300;   // warning shown before each strike
const LAP_LOOP_LEAD     = 300;    // a new node's own band starts its warning this long after it appears


//------------------------------------------------------------------------
//-------------------SHARED HELPERS----------------------------------------
//------------------------------------------------------------------------
export let _lapHitCd = 0;

// Touch damage helper shared by all Laplace hazards (per-touch cooldown).
// Ghost-form makes the player immune to these - that is the point of it.
export function _lapTouch(pct, level, label) {
    const now = performance.now();
    if (now < _lapHitCd) return false;
    if (!_lapDamageable()) return false;
    const pr = _nkPlayerRect();
    if (!pr) return false;
    _lapHitCd = now + LAP_TOUCH_MS;
    const dealt = _nkHit(pct, 'fire', level);
    _nkAbilityHitToast(dealt, "Laplace's Demon", label);
    return true;
}

// Ghost-form: after correctly standing on a fake future, the player is
// briefly untouchable by the Demon (greed window - stand IN the lance).
export let _lapGhostUntil = 0;
export function _lapGhostForm(ms) {
    _lapGhostUntil = performance.now() + ms;
    const avatar = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (avatar) {
        avatar.classList.add('sx-lap-ghost');
        setTimeout(() => {
            if (performance.now() >= _lapGhostUntil) {
                try { avatar.classList.remove('sx-lap-ghost'); } catch (e) {}
            }
        }, ms + 60);
    }
}
export function _lapDamageable() { return performance.now() >= _lapGhostUntil; }

// Where the player will be in `sec` seconds if they keep walking the way
// they have walked for the last ~0.6s (kept on screen). The Demon "has
// already seen" this spot.
export function _lapPredictPos(sec) {
    const pc = _lapPC();
    const buf = _lapRecBuf;
    const now = performance.now();
    const past = buf.find(s => now - s.t <= 600) || buf[0];
    if (!past || now - past.t < 150) return pc;
    const dt = (now - past.t) / 1000;
    const vx = (pc.x - past.x) / dt, vy = (pc.y - past.y) / dt;
    return {
        x: Math.max(40, Math.min(window.innerWidth - 40, pc.x + vx * sec)),
        y: Math.max(40, Math.min(window.innerHeight - 40, pc.y + vy * sec)),
    };
}

// Player centre with a screen-centre fallback.
export function _lapPC() { const c = _nkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }


//------------------------------------------------------------------------
//-------------------SIGNATURE: DEMONSTRATED FATE (all fight)--------------
//------------------------------------------------------------------------
// A chase-lance whose full path is pre-run by a harmless ghost ~3s ahead.
// The real lance follows the SAME path - its endpoint (the ghost's endpoint)
// is exactly where a greedy or inattentive player will be standing.
export const LAP_COMB_LANE = 150;   // spacing of the parallel lances in a wall

// One wall of parallel lances sweeping across the whole screen with a single
// gap. The ghost shows every lane first; only the gap is safe. The gap lies
// one or two lanes beside where you stand, so you have to move to it.
function _lapComb(run, vertical, delayMs, level) {
    const W = window.innerWidth, H = window.innerHeight;
    const size = vertical ? W : H;
    const lanes = Math.max(4, Math.round(size / LAP_COMB_LANE));
    const step = size / lanes;
    const pc = _lapPC();
    const near = Math.max(0, Math.min(lanes - 1, Math.floor((vertical ? pc.x : pc.y) / step)));
    let gap = near + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2));
    if (gap < 0 || gap >= lanes) gap = near + (near > lanes / 2 ? -1 : 1);
    gap = Math.max(0, Math.min(lanes - 1, gap));
    const fromStart = Math.random() < 0.5;
    for (let i = 0; i < lanes; i++) {
        if (i === gap) continue;
        const c = step * (i + 0.5);
        const ax = vertical ? c : (fromStart ? -40 : W + 40);
        const ay = vertical ? (fromStart ? -40 : H + 40) : c;
        const bx = vertical ? c : (fromStart ? W + 40 : -40);
        const by = vertical ? (fromStart ? H + 40 : -40) : c;
        _lapLancePair(run, ax, ay, bx, by, delayMs, level);
    }
}

// One aimed lance through where the player is going to be (not where they are).
function _lapAimedLance(run, delayMs, level) {
    const W = window.innerWidth, H = window.innerHeight;
    const aim = _lapPredictPos(1.4);
    const horizontal = Math.random() < 0.5;
    const ax = horizontal ? (Math.random() < 0.5 ? -40 : W + 40) : aim.x + (Math.random() * 200 - 100);
    const ay = horizontal ? aim.y + (Math.random() * 200 - 100) : (Math.random() < 0.5 ? -40 : H + 40);
    const dx = aim.x - ax, dy = aim.y - ay;
    const d = Math.hypot(dx, dy) || 1;
    const over = d + 300;
    _lapLancePair(run, ax, ay, ax + dx / d * over, ay + dy / d * over, delayMs, level);
}

// Demonstrated Fate: walls of lances with one gap, then more walls across
// them (phase 2+), and a lance aimed at where you are heading.
export function _mechLapFate(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    _lapToastOnce('eg_mech_lap_fate', '👁️🔥 DEMONSTRATED FATE - the ghost shows the walls of fire. Find the gap!', '#f0abfc');
    _lapEnsureRecRun(monster);
    _lapComb(run, false, 0, level);
    if (p >= 2) _lapComb(run, true, 700, level);
    if (p >= 3) _lapComb(run, false, 1400, level);
    _lapAimedLance(run, p >= 2 ? 900 : 500, level);
}

// One ghost + real lance pair on a fixed path - both fly on the run's
// loop clock (pause-safe, tier-scaled).
export function _lapLancePair(run, ax, ay, bx, by, delayMs, level) {
    const len = Math.hypot(bx - ax, by - ay);
    const travelMs = (len / LAP_LANCE_SPEED) * 1000 * _LAP_DEBUG_MULT;
    // The ghost pre-runs the SAME path but is guaranteed at least ~3s of
    // lead (short paths fly the ghost slower) so the prediction always
    // reads before the real lance repeats it.
    const ghostTravelMs = Math.max(travelMs, LAP_GHOST_LEAD * _LAP_DEBUG_MULT);

    // The ghost pre-run (dashed corridor, translucent head - harmless).
    const ghost = _nkEl(run, 'div', 'sx-lap-ghost-corridor');
    _lapPlaceCorridor(ghost, ax, ay, bx, by);
    const head = _nkEl(run, 'div', 'sx-lap-ghost-head', '👁️');
    let t = -delayMs;   // stagger delay before the ghost even starts
    _nkLoop(run, (dtS) => {
        t += dtS * 1000;
        if (t < 0) return true;
        const f = Math.min(1, t / ghostTravelMs);
        head.style.left = Math.round(ax + (bx - ax) * f - 16) + 'px';
        head.style.top = Math.round(ay + (by - ay) * f - 16) + 'px';
        if (f >= 1) {
            try { ghost.remove(); head.remove(); } catch (e) {}
            // The real lance fires right as the ghost dissolves.
            _lapRealLance(run, ax, ay, bx, by, travelMs, level);
            return false;
        }
        return true;
    });
}

// The real lance: solid fire corridor, damages within width, ends with a
// pin-blast ring at the endpoint.
export function _lapRealLance(run, ax, ay, bx, by, travelMs, level) {
    const corridor = _nkEl(run, 'div', 'sx-lap-lance');
    _lapPlaceCorridor(corridor, ax, ay, bx, by);
    const head = _nkEl(run, 'div', 'sx-lap-lance-head', '🔥');
    let t = 0;
    _nkLoop(run, (dtS) => {
        t += dtS * 1000;
        const f = Math.min(1, t / travelMs);
        const x = ax + (bx - ax) * f;
        const y = ay + (by - ay) * f;
        head.style.left = Math.round(x - 16) + 'px';
        head.style.top = Math.round(y - 16) + 'px';
        // The lit corridor grows with the head: it is lit exactly where it hurts.
        corridor.style.width = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) * f)) + 'px';
        // Corridor damage: within the width AND behind the head.
        const pc = _lapPC();
        const behind = ((pc.x - ax) * (bx - ax) + (pc.y - ay) * (by - ay)) /
            (Math.hypot(bx - ax, by - ay) ** 2 || 1);
        if (behind >= 0 && behind <= f &&
            _ptSegDist(pc.x, pc.y, ax, ay, bx, by) < LAP_LANCE_W / 2 + 10) {
            _lapTouch(LAP_LANCE_HIT, level, 'Demonstrated Fate');
        }
        if (f >= 1) {
            try { corridor.remove(); head.remove(); } catch (e) {}
            // Endpoint pin-blast: the trap the ghost showed you.
            const ring = _nkEl(run, 'div', 'sx-lap-pin-blast');
            ring.style.left = Math.round(bx - 120) + 'px';
            ring.style.top = Math.round(by - 120) + 'px';
            const pc2 = _lapPC();
            if (Math.hypot(pc2.x - bx, pc2.y - by) < 120 + 14) {
                _lapTouch(LAP_LANCE_END, level, 'Fate Pin');
            }
            _lapDelay(700, () => { try { ring.remove(); } catch (e) {} });
            return false;
        }
        return true;
    });
}

export function _lapPlaceCorridor(el, ax, ay, bx, by) {
    const len = Math.hypot(bx - ax, by - ay);
    el.style.left = Math.round(ax) + 'px';
    el.style.top = Math.round(ay - LAP_LANCE_W / 2) + 'px';
    el.style.width = Math.round(len) + 'px';
    el.style.height = LAP_LANCE_W + 'px';
    el.style.transformOrigin = '0 50%';
    el.style.transform = 'rotate(' + Math.atan2(by - ay, bx - ax) + 'rad)';
}


//------------------------------------------------------------------------
//-------------------ACT II: CONDITIONAL BRANCHES (60%)--------------------
//------------------------------------------------------------------------
// Three phantoms walk predictable dashed paths; each leaves a future cell.
// At reveal ONE is the ✅ true future and detonates softly; standing on a
// FAKE grants 2s ghost-form. 1-in-3 gamble with a greedy reward.
export const LAP_BRANCH_WALK = 3.0;   // s a phantom walks
export const LAP_BRANCH_R    = 90;    // detonation radius

export function _mechLapBranches(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    void phase;
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    _lapToastOnce('eg_mech_lap_branches', '👁️👥 CONDITIONAL BRANCHES - one future is real. Choose where to stand!', '#f0abfc');
    _lapEnsureRecRun(monster);

    const branches = [];
    const trueIdx = Math.floor(Math.random() * 3);

    for (let i = 0; i < 3; i++) {
        const ax = W * (0.14 + Math.random() * 0.72);
        const ay = H * (0.16 + Math.random() * 0.68);
        const ang = Math.random() * Math.PI * 2;
        const walkLen = 200 + Math.random() * 160;
        const bx = Math.max(60, Math.min(W - 60, ax + Math.cos(ang) * walkLen));
        const by = Math.max(60, Math.min(H - 60, ay + Math.sin(ang) * walkLen));

        // Predictable path line (the phantom's walk, pre-drawn).
        const line = _nkEl(run, 'div', 'sx-lap-walk-line');
        _lapPlaceCorridor(line, ax, ay, bx, by);
        line.style.height = '2px';

        const ph = _nkEl(run, 'div', 'sx-lap-phantom', '👤');
        let t = 0;
        _nkLoop(run, (dtS) => {
            t += dtS;
            const f = Math.min(1, t / (LAP_BRANCH_WALK * _LAP_DEBUG_MULT));
            ph.style.left = Math.round(ax + (bx - ax) * f - 16) + 'px';
            ph.style.top = Math.round(ay + (by - ay) * f - 16) + 'px';
            if (f >= 1) {
                try { ph.remove(); line.remove(); } catch (e) {}
                const cell = _nkEl(run, 'div', 'sx-lap-branch', '?');
                cell.style.left = Math.round(bx - 26) + 'px';
                cell.style.top = Math.round(by - 26) + 'px';
                branches.push({ x: bx, y: by, el: cell, isTrue: i === trueIdx, resolved: false });
                return false;
            }
            return true;
        });
    }

    // Reveal + resolve after all phantoms finish planting.
    const waitMs = (LAP_BRANCH_WALK * _LAP_DEBUG_MULT + 1.6) * 1000;
    const resolveAt = performance.now() + waitMs + 2600 * _LAP_DEBUG_MULT;
    _nkLoop(run, () => {
        if (performance.now() < resolveAt || !branches.length) return branches.length > 0 && performance.now() < resolveAt;
        branches.forEach(b => {
            if (b.resolved) return;
            b.resolved = true;
            if (b.isTrue) {
                b.el.textContent = '💥';
                b.el.classList.add('sx-lap-branch-true');
            } else {
                b.el.textContent = '👻';
                b.el.classList.add('sx-lap-branch-fake');
            }
        });
        _lapDelay(900 * _LAP_DEBUG_MULT, () => {
            const pc = _lapPC();
            branches.forEach(b => {
                if (b.isTrue) {
                    // The true future DETONATES as a radius blast.
                    const ring = _nkEl(run, 'div', 'sx-lap-pin-blast');
                    ring.style.left = Math.round(b.x - LAP_BRANCH_R) + 'px';
                    ring.style.top = Math.round(b.y - LAP_BRANCH_R) + 'px';
                    ring.style.width = (LAP_BRANCH_R * 2) + 'px';
                    ring.style.height = (LAP_BRANCH_R * 2) + 'px';
                    _lapDelay(700, () => { try { ring.remove(); } catch (e) {} });
                    if (Math.hypot(pc.x - b.x, pc.y - b.y) < LAP_BRANCH_R + 10) {
                        _lapTouch(LAP_BRANCH_HIT, level, 'True Future');
                    }
                } else if (Math.hypot(pc.x - b.x, pc.y - b.y) < 46) {
                    // Correctly standing on a fake: ghost-form greed window.
                    _lapGhostForm(LAP_GHOST_FORM * _LAP_DEBUG_MULT);
                    _lapToastOnce('eg_mech_lap_ghostform', '👁️ GHOST-FORM - untouchable for 2s! Greed the lance!', '#a7f3d0');
                }
                try { b.el.remove(); } catch (e) {}
            });
        });
        return false;
    });
}

// Plain prefixed delay for out-of-run callbacks: defers while the game is
// frozen (visual-only use - mechanics never wait on this).
export function _lapDelay(ms, fn) {
    setTimeout(() => { if (!_nkFrozen()) fn(); else setTimeout(() => { if (!_nkFrozen()) fn(); }, 120); }, ms);
}


//------------------------------------------------------------------------
//-------------------PAST ECHO (your own past self hunts you)--------------
//------------------------------------------------------------------------
// Purple copies of YOU appear where you stood a few seconds ago, replay the
// path you walked, and then hunt you down. Standing on one new spot does not
// help: they keep coming. Outrun them, loop around them or let them burst
// where you no longer are - they burst after a few seconds.
const LAP_ECHO_COUNT     = [0, 2, 3, 4];            // echoes per cast, by phase
const LAP_ECHO_SPEED     = [0, 300, 345, 390];      // px/s once they hunt you
const LAP_ECHO_REPLAY    = 2.2;                     // x speed while they replay your trail
const LAP_ECHO_FADE_MS   = 700;                     // harmless ghost-in before they move
const LAP_ECHO_LIFE_MS   = [0, 5200, 5600, 6000];   // after the ghost-in, then they burst
const LAP_ECHO_STAGGER   = 600;                     // between two echoes appearing
const LAP_ECHO_TOUCH_R   = 44;                      // contact radius
const LAP_ECHO_BURST_R   = 120;                     // radius of the burst
const LAP_ECHO_HIT       = 0.24;                    // %maxHP on contact
const LAP_ECHO_FRAME_MS  = 150;                     // between two walk frames

// The player's own picture, for the echoes (null when it cannot be found).
function _lapPlayerSpriteSrc() {
    for (const id of ['avatar-sprite-img', 'avatar-sprite-img-simple']) {
        const img = document.getElementById(id);
        if (img && img.getBoundingClientRect().width > 0) {
            return { src: img.currentSrc || img.src, h: img.getBoundingClientRect().height };
        }
    }
    return null;
}

// Builds one echo's floating copy of the player (purple, see-through).
function _lapMakeEchoEl(run, sprite) {
    const el = _nkEl(run, 'div', 'sx-lap-echo');
    if (sprite && sprite.src) {
        const img = document.createElement('img');
        img.src = sprite.src;
        img.className = 'sx-lap-echo-sprite';
        img.style.height = Math.max(48, Math.round(sprite.h)) + 'px';
        el.appendChild(img);
    } else {
        el.textContent = '👤';
    }
    return el;
}

// Turns an echo to the way it is walking: shows that direction's walk
// frames (up / down / left / right) like the real player does, stepping
// to the next frame every LAP_ECHO_FRAME_MS. Without directional art the
// right-facing set is mirrored for leftward steps instead.
function _lapAnimateEcho(e, dx, dy, dtMs) {
    const dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    const img = e.el.querySelector('.sx-lap-echo-sprite');
    const walk = img ? _animPlayerWalkFrames(dir) : { frames: [], directional: false };
    e.el.classList.toggle('sx-lap-echo-flip', !walk.directional && dx < 0);
    if (!walk.frames.length) return;
    if (dir !== e.dir) { e.dir = dir; e.frame = 0; e.frameT = 0; }
    e.frameT = (e.frameT || 0) + dtMs;
    while (e.frameT >= LAP_ECHO_FRAME_MS) { e.frameT -= LAP_ECHO_FRAME_MS; e.frame = ((e.frame || 0) + 1) % walk.frames.length; }
    const src = walk.frames[(e.frame || 0) % walk.frames.length];
    if (img.getAttribute('src') !== src) img.src = src;
}

// Where an echo starts: on your recorded trail, `back` samples from now;
// moved out to a point far from you when that is too close to be fair.
function _lapEchoStart(buf, back) {
    const pc = _lapPC();
    const s = buf.length ? buf[Math.max(0, buf.length - 1 - back)] : pc;
    if (Math.hypot(s.x - pc.x, s.y - pc.y) >= 260) return { x: s.x, y: s.y, from: buf.length ? Math.max(0, buf.length - 1 - back) : 0 };
    const a = Math.random() * Math.PI * 2;
    const W = window.innerWidth, H = window.innerHeight;
    return {
        x: Math.max(60, Math.min(W - 60, pc.x + Math.cos(a) * 420)),
        y: Math.max(60, Math.min(H - 60, pc.y + Math.sin(a) * 420)),
        from: -1,
    };
}

// Past Echo: purple copies of you replay your trail, then hunt you.
export function _mechLapEcho(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    _lapEnsureRecRun(monster);
    _lapToastOnce('eg_mech_lap_echo', '⏪ PAST ECHO - your own past self replays your steps, then hunts you. Keep moving!', '#f0abfc');
    const sprite = _lapPlayerSpriteSrc();
    const buf = _lapRecBuf.slice();
    const n = LAP_ECHO_COUNT[p];
    const echoes = [];
    for (let i = 0; i < n; i++) {
        const start = _lapEchoStart(buf, Math.round((i + 1) * buf.length / (n + 1)));
        const path = start.from >= 0 ? buf.slice(start.from) : [];
        const el = _lapMakeEchoEl(run, sprite);
        el.classList.add('sx-lap-echo-ghost');
        echoes.push({ el, x: start.x, y: start.y, path, pi: 0, t: -i * LAP_ECHO_STAGGER, state: 'ghost', done: false });
        el.style.left = Math.round(start.x) + 'px';
        el.style.top = Math.round(start.y) + 'px';
    }
    _nkLoop(run, (dtS) => {
        const dt = dtS * 1000;
        const pc = _lapPC();
        let alive = 0;
        echoes.forEach((e) => {
            if (e.done) return;
            alive++;
            e.t += dt;
            if (e.t < 0) return;
            if (e.state === 'ghost') {
                if (e.t >= LAP_ECHO_FADE_MS) { e.state = 'run'; e.el.classList.remove('sx-lap-echo-ghost'); e.t = 0; }
                return;
            }
            // Replay along the recorded trail first, then hunt the player.
            let tx = pc.x, ty = pc.y, speed = LAP_ECHO_SPEED[p];
            while (e.pi < e.path.length && Math.hypot(e.path[e.pi].x - e.x, e.path[e.pi].y - e.y) < 14) e.pi++;
            if (e.pi < e.path.length) { tx = e.path[e.pi].x; ty = e.path[e.pi].y; speed *= LAP_ECHO_REPLAY; }
            const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
            const step = Math.min(d, speed * dtS);
            e.x += dx / d * step;
            e.y += dy / d * step;
            e.el.style.left = Math.round(e.x) + 'px';
            e.el.style.top = Math.round(e.y) + 'px';
            _lapAnimateEcho(e, dx, dy, dt);
            const touched = Math.hypot(pc.x - e.x, pc.y - e.y) < LAP_ECHO_TOUCH_R;
            if (touched || e.t >= LAP_ECHO_LIFE_MS[p]) {
                e.done = true;
                e.el.classList.add('sx-lap-echo-boom');
                if (touched || Math.hypot(pc.x - e.x, pc.y - e.y) < LAP_ECHO_BURST_R * 0.6) _lapTouch(LAP_ECHO_HIT, level, 'Past Echo');
                _lapDelay(500, () => { try { e.el.remove(); } catch (er) {} });
            }
        });
        return alive > 0;
    });
}


//------------------------------------------------------------------------
//-------------------CAUSE AND EFFECT (a memory game you must walk)--------
//------------------------------------------------------------------------
// A 3x3 board closes around you - you cannot leave it. The Demon shows a
// sequence of tiles one by one, then hides it. Walk onto the tiles in that
// order. A wrong tile or running out of time is a heavy hit.
const LAP_MEM_LENGTH     = [0, 4, 5, 6];            // tiles in the sequence, by phase
const LAP_MEM_SHOW_MS    = [0, 800, 700, 620];      // each tile is lit this long while shown
const LAP_MEM_STEP_MS    = [0, 3600, 3200, 2800];   // time allowed for each step afterwards
const LAP_MEM_DWELL_MS   = 140;                     // standing on a tile this long counts
const LAP_MEM_WRONG_HIT  = 0.28;                    // %maxHP for a wrong tile
const LAP_MEM_TIMEOUT_HIT = 0.35;                   // %maxHP when time runs out
const LAP_MEM_WRONG_CD_MS = 900;                    // between two wrong-tile hits

// The tile order: each tile touches the previous one (also diagonally), the
// first touches the middle (where you start), no tile repeats.
function _lapMemSequence(n) {
    const seq = [];
    let cur = 4;
    const used = new Set([4]);
    for (let i = 0; i < n; i++) {
        const cr = Math.floor(cur / 3), cc = cur % 3;
        const options = [];
        for (let k = 0; k < 9; k++) {
            if (used.has(k)) continue;
            if (Math.abs(Math.floor(k / 3) - cr) <= 1 && Math.abs((k % 3) - cc) <= 1) options.push(k);
        }
        if (!options.length) break;
        cur = options[Math.floor(Math.random() * options.length)];
        used.add(cur);
        seq.push(cur);
    }
    return seq;
}

// The board: a square in the middle of the screen. Keeps the player inside
// it (the game's arena-bounds hook) until the run is cleaned up.
function _lapMemBoard(run) {
    const W = window.innerWidth, H = window.innerHeight;
    const size = Math.round(Math.min(W * 0.62, H * 0.74));
    const left = Math.round((W - size) / 2), top = Math.round((H - size) / 2);
    globalThis._avatarBounds = { left, top, right: left + size, bottom: top + size };
    run.onKill = () => { if (globalThis._avatarBounds && globalThis._avatarBounds.left === left && globalThis._avatarBounds.top === top) globalThis._avatarBounds = null; };
    const frame = _nkEl(run, 'div', 'sx-lap-mem-frame');
    frame.style.cssText = `left:${left}px;top:${top}px;width:${size}px;height:${size}px;`;
    const cell = size / 3;
    const tiles = [];
    for (let i = 0; i < 9; i++) {
        const el = _nkEl(run, 'div', 'sx-lap-mem-tile');
        el.style.left = Math.round(left + (i % 3) * cell) + 'px';
        el.style.top = Math.round(top + Math.floor(i / 3) * cell) + 'px';
        el.style.width = Math.round(cell) + 'px';
        el.style.height = Math.round(cell) + 'px';
        tiles.push(el);
    }
    // Pull the player in: the middle tile is where everyone starts.
    const av = document.getElementById('player-avatar-wrapper') || document.getElementById('player-avatar-simple');
    const w = av ? av.offsetWidth || 72 : 72, h = av ? av.offsetHeight || 90 : 90;
    _teleportAvatarTo(left + size / 2 - w / 2, top + size / 2 - h / 2);
    return { left, top, size, cell, tiles };
}

// Which tile (0-8) a point is on, or -1 outside the board.
function _lapMemTileAt(b, x, y) {
    if (x < b.left || y < b.top || x >= b.left + b.size || y >= b.top + b.size) return -1;
    return Math.floor((y - b.top) / b.cell) * 3 + Math.floor((x - b.left) / b.cell);
}

// Cause and Effect: show a tile order, hide it, make the player walk it.
export function _mechLapSectors(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    _lapToastOnce('eg_mech_lap_sectors', '👁️ CAUSE AND EFFECT - remember the order of the tiles, then walk it. A wrong tile hurts!', '#f0abfc');
    const board = _lapMemBoard(run);
    const seq = _lapMemSequence(LAP_MEM_LENGTH[p]);
    const label = _nkEl(run, 'div', 'sx-lap-mem-label');
    label.style.left = Math.round(board.left) + 'px';
    label.style.top = Math.round(board.top - 46) + 'px';
    label.style.width = board.size + 'px';
    const showStart = 900;                                   // short pause before the show
    const showEnd = showStart + seq.length * LAP_MEM_SHOW_MS[p];
    const playStart = showEnd + 700;                         // numbers fade, then GO
    let t = 0, step = 0, stepT = 0, lastLit = -1, phaseName = 'show';
    let curTile = -1, curSince = 0, wrongUntil = 0;
    const done = new Set([4]);
    _nkLoop(run, (dtS) => {
        t += dtS * 1000;
        const pc = _lapPC();
        if (phaseName === 'show') {
            label.textContent = '👁️ ' + (_lapIsGerman() ? 'MERKEN!' : 'REMEMBER!');
            const idx = Math.floor((t - showStart) / LAP_MEM_SHOW_MS[p]);
            if (t >= showStart && idx < seq.length && idx !== lastLit) {
                lastLit = idx;
                board.tiles[seq[idx]].classList.add('sx-lap-mem-lit');
                board.tiles[seq[idx]].textContent = String(idx + 1);
            }
            if (t >= showEnd + 400) { board.tiles.forEach(el => { el.classList.remove('sx-lap-mem-lit'); el.textContent = ''; }); }
            if (t >= playStart) { phaseName = 'play'; label.textContent = '▶ ' + (_lapIsGerman() ? 'LOS!' : 'GO!'); stepT = 0; }
            return true;
        }
        // PLAY: walk the order.
        stepT += dtS * 1000;
        const tile = _lapMemTileAt(board, pc.x, pc.y);
        if (tile !== curTile) { curTile = tile; curSince = t; }
        const dwelled = t - curSince >= LAP_MEM_DWELL_MS;
        if (dwelled && tile === seq[step]) {
            board.tiles[tile].classList.add('sx-lap-mem-ok');
            done.add(tile);
            step++;
            stepT = 0;
            label.textContent = '✔ ' + step + ' / ' + seq.length;
            if (step >= seq.length) { _lapMemFinish(run, board, label, true); return false; }
        } else if (dwelled && tile >= 0 && !done.has(tile) && tile !== seq[step] && t >= wrongUntil) {
            wrongUntil = t + LAP_MEM_WRONG_CD_MS;
            board.tiles[tile].classList.add('sx-lap-mem-bad');
            setTimeout(() => { try { board.tiles[tile].classList.remove('sx-lap-mem-bad'); } catch (e) { /* tile is gone */ } }, 600);
            _lapTouch(LAP_MEM_WRONG_HIT, level, 'Cause and Effect');
        }
        if (stepT >= LAP_MEM_STEP_MS[p]) {
            // Too slow: the Demon strikes, and the right tile is shown.
            board.tiles[seq[step]].classList.add('sx-lap-mem-lit');
            _lapTouch(LAP_MEM_TIMEOUT_HIT, level, 'Cause and Effect');
            _lapMemFinish(run, board, label, false);
            return false;
        }
        return true;
    });
}

// True when the game runs in German.
function _lapIsGerman() {
    return LANG === 'de';
}

// Ends the memory game: a short result, then the board and the bounds go away.
function _lapMemFinish(run, board, label, success) {
    label.textContent = success ? '✔ ' + (_lapIsGerman() ? 'GESCHAFFT' : 'REMEMBERED') : '✘ ' + (_lapIsGerman() ? 'ZU LANGSAM' : 'TOO SLOW');
    globalThis._avatarBounds = null;
    _lapDelay(900, () => { _nkKillRun(run); });
}


//------------------------------------------------------------------------
//-------------------ACT II: TIMELINE FRAY (60%)---------------------------
//------------------------------------------------------------------------
// A clone of your avatar walks a recording of your own last 6 seconds
// (path pre-drawn as fading dots). Touch it → swap positions with where
// the clone was 2s ago. No damage - dizzying but fair.
export let _lapRecBuf = [];      // { x, y, t } samples, ~100ms apart
export let _lapRecRun = null;
export let _lapFrayCd = 0;

export function _lapEnsureRecRun(monster) {
    if (_lapRecRun && _nkRuns.has(_lapRecRun.id)) return;
    const run = _nkNewRun(monster && monster.id, false);
    run.passive = true;
    _lapRecRun = run;
    let acc = 0;
    _nkLoop(run, (dtS) => {
        acc += dtS;
        if (acc < 0.1) return true;
        acc = 0;
        const pc = _lapPC();
        const now = performance.now();
        _lapRecBuf.push({ x: pc.x, y: pc.y, t: now });
        const cutoff = now - LAP_FRAY_RECALL * 1000 * _LAP_DEBUG_MULT;
        while (_lapRecBuf.length && _lapRecBuf[0].t < cutoff) _lapRecBuf.shift();
        return true;
    });
}

export function _mechLapFray(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    void phase;
    if (_lapRecBuf.length < 20) return;   // not enough recorded yet
    const run = _nkNewRun(monster && monster.id, true);
    _lapToastOnce('eg_mech_lap_fray', '👁️🌀 TIMELINE FRAY - your own past walks the arena. Do not touch it!', '#f0abfc');
    _lapEnsureRecRun(monster);

    const buf = _lapRecBuf.slice();
    const t0 = buf[0].t;
    const tEnd = buf[buf.length - 1].t;
    const dur = Math.max(2, (tEnd - t0) / 1000) * _LAP_DEBUG_MULT;

    // Telegraph the path with fading dots (sample every ~300ms).
    for (let i = 0; i < buf.length; i += 3) {
        const dot = _nkEl(run, 'div', 'sx-lap-fray-dot');
        dot.style.left = Math.round(buf[i].x - 3) + 'px';
        dot.style.top = Math.round(buf[i].y - 3) + 'px';
        setTimeout(() => { try { dot.remove(); } catch (e) {} }, dur * 1000 + 800);
    }

    const clone = _lapMakeEchoEl(run, _lapPlayerSpriteSrc());
    clone.classList.add('sx-lap-fray-clone');
    const cloneState = { el: clone };
    let prev = buf[0];
    let elapsed = 0;
    let touched = false;
    _nkLoop(run, (dtS) => {
        elapsed += dtS;
        // Playback position: sample of the recording at (elapsed back-mapped).
        const recT = t0 + Math.min(tEnd - t0, (elapsed / _LAP_DEBUG_MULT) * 1000);
        let s = buf[0];
        for (const q of buf) { if (q.t <= recT) s = q; else break; }
        clone.style.left = Math.round(s.x) + 'px';
        clone.style.top = Math.round(s.y) + 'px';
        // Face the way the recorded step went, with the matching walk frames.
        if (Math.hypot(s.x - prev.x, s.y - prev.y) > 1) {
            _lapAnimateEcho(cloneState, s.x - prev.x, s.y - prev.y, dtS * 1000);
            prev = s;
        }

        const pc = _lapPC();
        const now = performance.now();
        if (!touched && now >= _lapFrayCd && Math.hypot(pc.x - s.x, pc.y - s.y) < 36) {
            touched = true;
            _lapFrayCd = now + LAP_FRAY_CD_MS;
            // Where was the clone 2s ago (in its playback)?
            const pastT = Math.max(t0, recT - 2000 * _LAP_DEBUG_MULT);
            let p = buf[0];
            for (const q of buf) { if (q.t <= pastT) p = q; else break; }
            // Through the game's own mover - writing left/top directly is ignored
            // (or snapped back) because the avatar's position lives in its move state.
            _teleportAvatarTo(p.x, p.y);
            document.body.classList.add('sx-lap-dizzy');
            setTimeout(() => { try { document.body.classList.remove('sx-lap-dizzy'); } catch (e) {} }, 600);
            _lapToastOnce('eg_mech_lap_swap', '👁️ Your past replaced your present - disoriented!', '#f0abfc');
            return false;
        }
        if (elapsed >= dur + 1.2) return false;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: THE CLOSED TIMELINE (≤10%, one-shot)----------
//------------------------------------------------------------------------
// One glowing node at a time. Stand on it until its ring fills to break it;
// three breaks close the timeline. While you stand there the arena replays
// the same fixed pattern of fire (warning, then strike) over and over, and
// the node always sits in the fire's path - so you step off, then come back.
// No text beyond the title: the warnings and the ring explain the rest.

// Set while the finale runs (read by _tickPlayer's charge-freeze gate).
export let _lapFinal = null;

export function _lapFinalActive() {
    return !!_lapFinal && !_lapFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _lapOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _lapStartFinalWatcher(monster); } catch (e) {}
    return false;
}

// Cause and Effect is not on a timer: it plays exactly three times, once as
// the Demon first drops below each of these health fractions (the number
// of the entry + 1 is the difficulty step it uses).
const LAP_MEM_HP_MARKS = [0.80, 0.50, 0.20];

// Boss start: begins watching the Demon's health for the three memory games.
export function _lapOnInit(monster) {
    if (!monster) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    let next = 0;
    _nkLoop(run, () => {
        if (next >= LAP_MEM_HP_MARKS.length || monster.currentHP <= 0) return false;
        if (monster.currentHP > monster.maxHP * LAP_MEM_HP_MARKS[next]) return true;
        // Wait while another attack is busy or the game is frozen, then start.
        if (_nkDodgeBusy() || _nkFrozen()) return true;
        _mechLapSectors(monster, next + 1);
        next++;
        return true;
    });
}

export function _lapStartFinalWatcher(monster) {
    if (!monster || _lapFinal) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (_lapFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _lapFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
export function _lapAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_lapFinal) return;
        if (_nkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

// The fire patterns, one per node (they get busier). Each strike has a time
// in the cycle (ms), a kind - 'row' / 'col' = a band across the screen at
// that fraction, 'burst' = a round blast at (x, y) as fractions.
const LAP_LOOP_PATTERNS = [
    [{ t: 600, kind: 'row', at: 0.35 }, { t: 3600, kind: 'col', at: 0.5 }, { t: 6400, kind: 'row', at: 0.65 }],
    [{ t: 500, kind: 'col', at: 0.3 }, { t: 2600, kind: 'row', at: 0.5 }, { t: 4700, kind: 'col', at: 0.7 }, { t: 6800, kind: 'row', at: 0.4 }],
    [{ t: 400, kind: 'row', at: 0.3 }, { t: 2000, kind: 'col', at: 0.35 }, { t: 3600, kind: 'row', at: 0.7 },
        { t: 5200, kind: 'col', at: 0.65 }, { t: 6800, kind: 'burst', x: 0.5, y: 0.5 }],
];

// Puts a strike's warning / fire element over its area.
function _lapLoopPlace(el, beat) {
    const W = window.innerWidth, H = window.innerHeight;
    if (beat.kind === 'burst') {
        el.style.left = Math.round(W * beat.x - LAP_BRANCH_R) + 'px';
        el.style.top = Math.round(H * beat.y - LAP_BRANCH_R) + 'px';
        el.style.width = el.style.height = (LAP_BRANCH_R * 2) + 'px';
    } else if (beat.kind === 'row') {
        el.style.left = '0px';
        el.style.top = Math.round(H * beat.at - LAP_LANCE_W / 2) + 'px';
        el.style.width = W + 'px';
        el.style.height = LAP_LANCE_W + 'px';
    } else {
        el.style.left = Math.round(W * beat.at - LAP_LANCE_W / 2) + 'px';
        el.style.top = '0px';
        el.style.width = LAP_LANCE_W + 'px';
        el.style.height = H + 'px';
    }
}

// Is the player inside a strike's area right now?
function _lapLoopHits(beat) {
    const W = window.innerWidth, H = window.innerHeight;
    const pc = _lapPC();
    if (beat.kind === 'burst') return Math.hypot(pc.x - W * beat.x, pc.y - H * beat.y) < LAP_BRANCH_R + 10;
    if (beat.kind === 'row') return Math.abs(pc.y - H * beat.at) < LAP_LANCE_W / 2 + 10;
    return Math.abs(pc.x - W * beat.at) < LAP_LANCE_W / 2 + 10;
}

// One strike: a flashing warning area, then the fire.
function _lapLoopStrike(g, beat, level) {
    const round = beat.kind === 'burst';
    const warn = _nkEl(g.fxRun, 'div', 'sx-lap-loop-warn sx-lap-loop-warn-' + (round ? 'round' : beat.kind));
    warn.style.setProperty('--warn-ms', LAP_LOOP_WARN_MS + 'ms');
    _lapLoopPlace(warn, beat);
    const epoch = g.epoch;
    _lapAfter(g, LAP_LOOP_WARN_MS, () => {
        try { warn.remove(); } catch (e) {}
        if (epoch !== g.epoch) return;   // the node was broken meanwhile: this strike is cancelled
        const cls = round ? 'sx-lap-pin-blast' : 'sx-lap-lance sx-lap-lance-full' + (beat.kind === 'col' ? ' sx-lap-lance-col' : '');
        const fire = _nkEl(g.fxRun, 'div', cls);
        _lapLoopPlace(fire, beat);
        if (_lapLoopHits(beat)) _lapTouch(round ? LAP_BRANCH_HIT : LAP_LANCE_HIT, level, 'Closed Timeline');
        _lapAfter(g, 700, () => { try { fire.remove(); } catch (e) {} });
    });
}

// Puts the next node on the fire path of the current pattern (on a random
// point of one of its bands) and restarts the pattern around it.
function _lapSpawnNode(g) {
    const W = window.innerWidth, H = window.innerHeight;
    const lines = LAP_LOOP_PATTERNS[g.broken % LAP_LOOP_PATTERNS.length].filter(b => b.kind !== 'burst');
    const b = lines[Math.floor(Math.random() * lines.length)];
    const x = b.kind === 'row' ? W * (0.18 + Math.random() * 0.64) : W * b.at;
    const y = b.kind === 'row' ? H * b.at : H * (0.22 + Math.random() * 0.56);
    const el = _nkEl(g.fxRun, 'div', 'sx-lap-node');
    const core = document.createElement('i');
    core.className = 'sx-lap-node-core';
    el.appendChild(core);
    el.style.left = Math.round(x - 36) + 'px';
    el.style.top = Math.round(y - 36) + 'px';
    g.node = { x, y, el, prog: 0 };
    g.epoch++;
    document.querySelectorAll('.sx-lap-loop-warn').forEach(w => w.remove());
    // Start the pattern so the band the node sits on strikes almost at once:
    // you must step off early, then come back to finish the ring.
    const pattern = LAP_LOOP_PATTERNS[g.broken % LAP_LOOP_PATTERNS.length];
    g.cycleT = b.t - LAP_LOOP_LEAD;
    g.nextBeat = Math.max(0, pattern.findIndex(q => q.t >= g.cycleT));
    _lapRefreshTimeline(g);
}

// A short expanding ring where a node was just broken.
function _lapNodePop(g, node) {
    const pop = _nkEl(g.fxRun, 'div', 'sx-lap-node-pop');
    pop.style.left = Math.round(node.x - 36) + 'px';
    pop.style.top = Math.round(node.y - 36) + 'px';
    _lapAfter(g, 800, () => { try { pop.remove(); } catch (e) {} });
}

// Redraws the strike markers on the timeline bar for the current pattern.
function _lapRefreshTimeline(g) {
    if (!g.barEl) return;
    const pattern = LAP_LOOP_PATTERNS[g.broken % LAP_LOOP_PATTERNS.length];
    g.barEl.querySelectorAll('.sx-lap-tl-mark').forEach(el => el.remove());
    pattern.forEach(b => {
        const mark = document.createElement('i');
        mark.className = 'sx-lap-tl-mark sx-lap-tl-' + b.kind;
        mark.style.left = (b.t / LAP_LOOP_CYCLE_MS * 100) + '%';
        g.barEl.appendChild(mark);
    });
}

// Moves the playhead along the timeline bar with the pattern clock.
function _lapMoveTimelineHead(g) {
    if (!g.headEl) return;
    g.headEl.style.left = (Math.max(0, g.cycleT) / LAP_LOOP_CYCLE_MS * 100) + '%';
    g.headEl.classList.toggle('sx-lap-tl-idle', g.cycleT < 0);
}

// Fills the node's ring while the player stands on it; it drains slowly
// when they step off. Returns true once it is broken.
function _lapTickNode(g, dtS) {
    const n = g.node;
    if (!n) return false;
    const pc = _lapPC();
    if (Math.hypot(pc.x - n.x, pc.y - n.y) < 52) {
        n.prog += dtS;
        n.el.classList.add('sx-lap-node-breaking');
    } else if (n.prog > 0) {
        n.prog = Math.max(0, n.prog - dtS * 0.35);
        if (n.prog === 0) n.el.classList.remove('sx-lap-node-breaking');
    }
    n.el.style.setProperty('--node-prog', String(Math.min(1, n.prog / LAP_NODE_STAND)));
    return n.prog >= LAP_NODE_STAND;
}

// Runs the pattern clock: starts every strike whose time has come and wraps
// around at the end of the cycle.
function _lapTickPattern(g, dtS, level) {
    g.cycleT += dtS * 1000;
    if (g.cycleT < 0) return;
    const pattern = LAP_LOOP_PATTERNS[g.broken % LAP_LOOP_PATTERNS.length];
    while (g.nextBeat < pattern.length && pattern[g.nextBeat].t <= g.cycleT) {
        _lapLoopStrike(g, pattern[g.nextBeat], level);
        g.nextBeat++;
    }
    if (g.cycleT >= LAP_LOOP_CYCLE_MS) { g.cycleT -= LAP_LOOP_CYCLE_MS; g.nextBeat = 0; }
}

// Builds the finale's screen furniture: a violet vignette, a big title that
// fades after a moment, and a small bar at the top with three progress pips
// and the timeline (a playhead sweeping over the strike markers).
function _lapBuildFinaleHud(g) {
    const vig = document.createElement('div');
    vig.className = 'sx-lap-vignette';
    document.body.appendChild(vig);
    g.fxRun.els.push(vig);

    const ov = document.createElement('div');
    ov.className = 'sx-lap-cd';
    ov.innerHTML = '<div class="sx-lap-cd-label">THE CLOSED TIMELINE</div>' +
        '<div class="sx-lap-cd-bar">' +
        '<div class="sx-lap-cd-pips">' + '<span class="sx-lap-pip"></span>'.repeat(LAP_NODE_GOAL) + '</div>' +
        '<div class="sx-lap-tl"><i class="sx-lap-tl-head"></i></div></div>';
    document.body.appendChild(ov);
    g.overlay = ov;
    g.barEl = ov.querySelector('.sx-lap-tl');
    g.headEl = ov.querySelector('.sx-lap-tl-head');
    g.fxRun.els.push(ov);
    setTimeout(() => {
        const label = ov.querySelector('.sx-lap-cd-label');
        if (label) label.classList.add('sx-lap-cd-label-out');
    }, 2600);
}

export function _lapFinalStart(monster) {
    if (_lapFinal || !monster) return;

    // The loop takes over: kill every other run of this boss.
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });

    const g = {
        monsterId: monster.id,
        finished: false,
        broken: 0,
        node: null,          // { x, y, el, prog }
        cycleT: 0,           // ms into the replayed pattern
        nextBeat: 0,
        epoch: 0,            // bumps with every new node; cancels the old pattern's strikes
        fxRun: null, overlay: null, barEl: null, headEl: null,
    };
    _lapFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _tickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('sx-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    // Not passive on purpose: it makes every other mechanic of the Demon wait.
    g.fxRun = _nkNewRun(monster.id, true);
    // Safety net: if the finale's run ever dies without closing the loop
    // (tick error, external kill), never leave the Demon immune forever.
    g.fxRun.onKill = () => {
        if (g.finished) return;
        try { _lapFinalEnd(g, monster); } catch (e) {}
    };

    _lapBuildFinaleHud(g);

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card loops while the finale runs.
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.add('sx-lap-allin');

    const level = monster.level || 1;

    _lapSpawnNode(g);
    let last = performance.now();
    _nkLoop(g.fxRun, () => {
        if (g.finished) return false;
        const now = performance.now();
        const dtS = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (_lapTickNode(g, dtS)) {
            g.broken++;
            _lapNodePop(g, g.node);
            const pips = g.overlay ? g.overlay.querySelectorAll('.sx-lap-pip') : [];
            if (pips[g.broken - 1]) pips[g.broken - 1].classList.add('sx-lap-pip-on');
            try { g.node.el.remove(); } catch (e) {}
            g.node = null;
            if (g.broken >= LAP_NODE_GOAL) { _lapCloseLoop(g, monster); return false; }
            _lapSpawnNode(g);
            return true;
        }
        _lapTickPattern(g, dtS, level);
        _lapMoveTimelineHead(g);
        return true;
    });
}

// Three nodes broken: the loop closes and the Demon pays its own HP.
export function _lapCloseLoop(g, monster) {
    if (g.finished) return;
    const flash = document.createElement('div');
    flash.className = 'sx-lap-collapse';
    document.body.appendChild(flash);
    setTimeout(() => { try { flash.remove(); } catch (e) {} }, 1500);
    _lapFinalEnd(g, monster);
    try {
        const m = (typeof _monsters !== 'undefined') ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
        if (m && typeof _damageTargetById === 'function' && m.currentHP > 0) {
            _damageTargetById(g.monsterId, m.currentHP, ['fire'], {});
        }
    } catch (e) {}
    void monster;
}

// Ends the finale: releases immunity + charge bar and cleans the board.
export function _lapFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _nkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.sx-lap-cd, .sx-lap-vignette, .sx-lap-node, .sx-lap-node-pop, .sx-lap-loop-warn, ' +
        '.sx-lap-lance, .sx-lap-pin-blast, .sx-lap-collapse').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('sx-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.remove('sx-lap-allin');
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
    try {
        const m = (typeof _monsters !== 'undefined') ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
        if (m) m.bossImmune = false;
    } catch (e) {}
    void monster;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN----------------------------------------------
//------------------------------------------------------------------------
// Called from _bossCleanup on boss death AND from the encounter stop -
// removes every run element, overlay and body state this boss ever created.
export function _lapTeardown() {
    if (_lapFinal) { try { _lapFinalEnd(_lapFinal, null); } catch (e) {} _lapFinal = null; }
    if (_lapRecRun) { try { _nkKillRun(_lapRecRun); } catch (e) {} _lapRecRun = null; }
    _lapRecBuf = [];
    _lapToastsShown.clear();
    _lapGhostUntil = 0;
    _lapFrayCd = 0;
    document.querySelectorAll('.sx-lap-ghost-corridor, .sx-lap-ghost-head, .sx-lap-lance, ' +
        '.sx-lap-lance-head, .sx-lap-pin-blast, .sx-lap-walk-line, .sx-lap-phantom, ' +
        '.sx-lap-branch, .sx-lap-fray-dot, .sx-lap-clone, .sx-lap-fray-clone, .sx-lap-node, .sx-lap-loop-warn, ' +
        '.sx-lap-cd, .sx-lap-vignette, .sx-lap-node-pop, .sx-lap-collapse').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const avatar = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (avatar) avatar.classList.remove('sx-lap-ghost');
    document.body.classList.remove('sx-lap-dizzy');
    const card = document.getElementById('sx-card-boss_laplace');
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.remove('sx-lap-allin');
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _LAP_DEBUG.fire('fate'|'branches'|'fray'|'final') - run one now
//   _LAP_DEBUG.ghost(ms)                              - ghost-form by hand
if (typeof window !== 'undefined') {
    window._LAP_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_laplace') : null;
            if (!monster) return 'no laplace alive';
            if (name === 'final') { _lapFinalStart(monster); return 'THE CLOSED TIMELINE started'; }
            const fn = name === 'fate' ? _mechLapFate
                : name === 'branches' ? _mechLapBranches
                : name === 'fray' ? _mechLapFray : null;
            if (!fn) return 'unknown: ' + name;
            if (_nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        ghost: (ms) => { _lapGhostForm(Number(ms) || 2000); return 'ghost-form for ' + (Number(ms) || 2000) + 'ms'; },
    };
}
