import { _damageTargetById } from '../encounter-monster-damage.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkToast, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: LAPLACE'S DEMON (boss_laplace)------------------
//------------------------------------------------------------------------
// Tier-7 rework "It Has Already Seen This": every telegraph plays twice -
// a harmless ghost prediction ~3s early, then the real thing. Branches +
// fray join at 60%; THE CLOSED TIMELINE finale at ≤10% repeats a learnable
// 20s gauntlet loop until 3 timeline nodes break.
//------------------------------------------------------------------------

// Prefix discipline: everything here is _lap / sx-lap-.

// DEBUG: slow Laplace's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Off for ship.
export const _LAP_DEBUG_SLOW = false;
export const _LAP_DEBUG_MULT = _LAP_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_laplace: {
        id: 'boss_laplace', name: "Laplace's Demon", emoji: '👁️',
        baseHP: 950, baseDamage: 24, chargeMax: 11,
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
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'demonstrated_fate', intervalBase: 19000, intervalVariance: 4500, handler: '_mechLapFate' },
            { name: 'prior_bomb', intervalBase: 18000, intervalVariance: 4000, handler: '_mechPriorBomb' },
            { name: 'conditional_branches', intervalBase: 23000, intervalVariance: 5000, handler: '_mechLapBranches', phase2Only: true },
            { name: 'timeline_fray', intervalBase: 26000, intervalVariance: 6000, handler: '_mechLapFray', phase2Only: true },
        ],
        onPhaseEnter: _lapOnPhaseEnter,
    },
});


// ── Shared tuning ───────────────────────────────────────────────────────────
export const LAP_LANCE_W      = 110;    // lance corridor width
export const LAP_LANCE_SPEED  = 640;    // px/s along its path
export const LAP_LANCE_HIT    = 0.16;   // %maxHP caught in the corridor
export const LAP_LANCE_END    = 0.14;   // %maxHP endpoint pin-blast (R120)
export const LAP_GHOST_LEAD   = 3000;   // ms the ghost runs ahead of the real lance
export const LAP_BRANCH_HIT   = 0.10;   // %maxHP true-future detonation (R90)
export const LAP_GHOST_FORM   = 2000;   // ms of ghost-form from a fake future
export const LAP_FRAY_RECALL  = 6;      // s of movement the clone replays
export const LAP_FRAY_CD_MS   = 9000;   // between player-swaps
export const LAP_TOUCH_MS     = 700;    // shared touch cooldown
export const LAP_NODE_STAND   = 1.2;    // s cumulative standing to break a node
export const LAP_LOOP_TIME    = 20;     // s per gauntlet loop
export const LAP_FAIL_EXTEND  = 5000;   // ms a failed dodge extends the loop
export const LAP_NODE_GOAL    = 3;      // nodes to close the timeline


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

// Player centre with a screen-centre fallback.
export function _lapPC() { const c = _nkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }


//------------------------------------------------------------------------
//-------------------SIGNATURE: DEMONSTRATED FATE (all fight)--------------
//------------------------------------------------------------------------
// A chase-lance whose full path is pre-run by a harmless ghost ~3s ahead.
// The real lance follows the SAME path - its endpoint (the ghost's endpoint)
// is exactly where a greedy or inattentive player will be standing.
export const LAP_FATE_PHASE3 = 2;  // crossed lances in phase 3

export function _mechLapFate(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    _nkToast('eg_mech_lap_fate', '👁️🔥 DEMONSTRATED FATE - the ghost shows the future. Do not stand where it ends!', '#f0abfc');
    _lapEnsureRecRun(monster);

    const pc = _lapPC();
    const lanceCount = p >= LAP_FATE_PHASE3 ? 2 : 1;

    for (let i = 0; i < lanceCount; i++) {
        // Path: from an edge through the player, continuing 260px beyond -
        // the second lance crosses on the mirrored axis.
        let ax, ay;
        if (i === 0) { ax = Math.random() < 0.5 ? -40 : W + 40; ay = pc.y + (Math.random() * 300 - 150); }
        else { ax = pc.x + (Math.random() * 300 - 150); ay = Math.random() < 0.5 ? -40 : H + 40; }
        const dx = pc.x - ax, dy = pc.y - ay;
        const d = Math.hypot(dx, dy) || 1;
        const over = d + 260;
        const bx = ax + dx / d * over;
        const by = ay + dy / d * over;

        _lapLancePair(run, ax, ay, bx, by, i * 900, level);
    }
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
    _nkToast('eg_mech_lap_branches', '👁️👥 CONDITIONAL BRANCHES - one future is real. Choose where to stand!', '#f0abfc');
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
                b.el.textContent = '✅';
                b.el.classList.add('sx-lap-branch-true');
            } else {
                b.el.textContent = '✓';
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
                    _nkToast('eg_mech_lap_ghostform', '👁️ GHOST-FORM - untouchable for 2s! Greed the lance!', '#a7f3d0');
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
    _nkToast('eg_mech_lap_fray', '👁️🌀 TIMELINE FRAY - your own past walks the arena. Do not touch it!', '#f0abfc');
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

    const clone = _nkEl(run, 'div', 'sx-lap-clone', '👣');
    let elapsed = 0;
    let touched = false;
    _nkLoop(run, (dtS) => {
        elapsed += dtS;
        // Playback position: sample of the recording at (elapsed back-mapped).
        const recT = t0 + Math.min(tEnd - t0, (elapsed / _LAP_DEBUG_MULT) * 1000);
        let s = buf[0];
        for (const q of buf) { if (q.t <= recT) s = q; else break; }
        clone.style.left = Math.round(s.x - 18) + 'px';
        clone.style.top = Math.round(s.y - 18) + 'px';

        const pc = _lapPC();
        const now = performance.now();
        if (!touched && now >= _lapFrayCd && Math.hypot(pc.x - s.x, pc.y - s.y) < 36) {
            touched = true;
            _lapFrayCd = now + LAP_FRAY_CD_MS;
            // Where was the clone 2s ago (in its playback)?
            const pastT = Math.max(t0, recT - 2000 * _LAP_DEBUG_MULT);
            let p = buf[0];
            for (const q of buf) { if (q.t <= pastT) p = q; else break; }
            const el = document.getElementById('player-avatar-wrapper')
                || document.getElementById('player-avatar-simple');
            if (el) {
                el.style.left = Math.round(p.x) + 'px';
                el.style.top = Math.round(p.y) + 'px';
                document.body.classList.add('sx-lap-dizzy');
                setTimeout(() => { try { document.body.classList.remove('sx-lap-dizzy'); } catch (e) {} }, 600);
            }
            _nkToast('eg_mech_lap_swap', '👁️ Your past replaced your present - disoriented!', '#f0abfc');
            return false;
        }
        if (elapsed >= dur + 1.2) return false;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: THE CLOSED TIMELINE (≤10%, one-shot)----------
//------------------------------------------------------------------------
// The arena loops: the same three-mechanic gauntlet repeats on a strict
// 20s loop with identical telegraphs each loop (learnable). A timeline
// node appears each loop at a new spot; stand on it 1.2s cumulative to
// break it. Three breaks close the loop - the Demon pays its own HP.
// Failed dodges extend the loop 5s and spawn an extra hunting phantom.
export const LAP_LOOP_LANCE_Y  = [0.34, 0.62];   // fixed lance bands (learnable)
export const LAP_LOOP_BRANCH_X = [0.25, 0.5, 0.75];
export const LAP_LOOP_BRANCH_TRUE = 1;           // the middle cell is always true

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

export function _lapFinalStart(monster) {
    if (_lapFinal || !monster) return;

    // The loop takes over: kill every other run of this boss.
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        loop: 0,
        broken: 0,
        nodes: [],           // { x, y, el, prog }
        phantoms: [],        // extra hunters from failed dodges
        deadline: 0,         // loop deadline (extended by failures)
        fxRun: null, overlay: null, loopEl: null, timerEl: null,
    };
    _lapFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _tickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('sx-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _nkNewRun(monster.id, true);
    g.fxRun.passive = true;
    // Safety net: if the finale's run ever dies without closing the loop
    // (tick error, external kill), never leave the Demon immune forever.
    g.fxRun.onKill = () => {
        if (g.finished) return;
        try { _lapFinalEnd(g, monster); } catch (e) {}
    };

    // Loop overlay (title + loop counter + timer).
    const ov = document.createElement('div');
    ov.className = 'sx-lap-cd';
    ov.innerHTML =
        '<div class="sx-lap-cd-label">👁️💀 THE CLOSED TIMELINE</div>' +
        '<div class="sx-lap-cd-loop">LOOP 1</div>' +
        '<div class="sx-lap-cd-timer">-</div>' +
        '<div class="sx-lap-cd-hint">The gauntlet repeats - learn it. Break the timeline node each loop!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;
    g.loopEl = ov.querySelector('.sx-lap-cd-loop');
    g.timerEl = ov.querySelector('.sx-lap-cd-timer');
    g.fxRun.els.push(ov);

    _nkToast('eg_mech_lap_final_cd', '👁️💀 THE CLOSED TIMELINE - the loop begins. Learn it. Break it!', '#f0abfc');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card loops while the finale runs.
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.add('sx-lap-allin');

    const level = monster.level || 1;

    // ── One loop of the gauntlet (identical telegraphs every loop). ─────
    const runLoop = () => {
        if (g.finished) return;
        g.loop++;
        if (g.loopEl) g.loopEl.textContent = 'LOOP ' + g.loop;
        _nkToast('eg_mech_lap_loop', '👁️ LOOP {n} - the same fate, again. Break the node!', '#f0abfc');
        g.deadline = performance.now() + LAP_LOOP_TIME * _LAP_DEBUG_MULT * 1000;

        // Node: spawns each loop at a NEW spot (persist until broken).
        const nx = W * (0.14 + Math.random() * 0.72);
        const ny = H * (0.16 + Math.random() * 0.68);
        const node = _nkEl(g.fxRun, 'div', 'sx-lap-node', '⛓️');
        node.style.left = Math.round(nx - 24) + 'px';
        node.style.top = Math.round(ny - 24) + 'px';
        g.nodes.push({ x: nx, y: ny, el: node, prog: 0 });

        // 1) Lance sweep at the fixed band (learnable).
        _lapAfter(g, 2000 * _LAP_DEBUG_MULT, () => {
            if (g.finished) return;
            const bandY = H * LAP_LOOP_LANCE_Y[g.loop % LAP_LOOP_LANCE_Y.length];
            _lapFinalLance(g, bandY, level);
        });

        // 2) Branch volley at the fixed spots - the middle is always true.
        _lapAfter(g, 7000 * _LAP_DEBUG_MULT, () => {
            if (g.finished) return;
            const cells = LAP_LOOP_BRANCH_X.map(fx => {
                const cell = _nkEl(g.fxRun, 'div', 'sx-lap-branch', '?');
                const cx = W * fx, cy = H * 0.5;
                cell.style.left = Math.round(cx - 26) + 'px';
                cell.style.top = Math.round(cy - 26) + 'px';
                return { x: cx, y: cy, el: cell, isTrue: fx === LAP_LOOP_BRANCH_X[LAP_LOOP_BRANCH_TRUE] };
            });
            _lapAfter(g, 2600 * _LAP_DEBUG_MULT, () => {
                if (g.finished) return;
                cells.forEach(c => {
                    c.el.textContent = c.isTrue ? '✅' : '✓';
                    c.el.classList.add(c.isTrue ? 'sx-lap-branch-true' : 'sx-lap-branch-fake');
                });
                _lapAfter(g, 900 * _LAP_DEBUG_MULT, () => {
                    if (g.finished) return;
                    const pc = _lapPC();
                cells.forEach(c => {
                    if (c.isTrue) {
                        // The true future detonates as a radius blast.
                        const ring = _nkEl(g.fxRun, 'div', 'sx-lap-pin-blast');
                        ring.style.left = Math.round(c.x - LAP_BRANCH_R) + 'px';
                        ring.style.top = Math.round(c.y - LAP_BRANCH_R) + 'px';
                        ring.style.width = (LAP_BRANCH_R * 2) + 'px';
                        ring.style.height = (LAP_BRANCH_R * 2) + 'px';
                        _lapAfter(g, 700, () => { try { ring.remove(); } catch (e) {} });
                        if (Math.hypot(pc.x - c.x, pc.y - c.y) < LAP_BRANCH_R + 10) {
                            _lapTouch(LAP_BRANCH_HIT, level, 'True Future');
                            _lapFailPunish(g, 'True Future');
                        }
                    } else if (Math.hypot(pc.x - c.x, pc.y - c.y) < 46) {
                        _lapGhostForm(LAP_GHOST_FORM * _LAP_DEBUG_MULT);
                    }
                    try { c.el.remove(); } catch (e) {}
                });
                });
            });
        });

        // 3) Phantom cross on the fixed path.
        _lapAfter(g, 14000 * _LAP_DEBUG_MULT, () => {
            if (g.finished) return;
            _lapFinalPhantom(g, H * (g.loop % 2 ? 0.22 : 0.78), true, level);
        });
    };

    // Node watch: standing on any node breaks it (cumulative 1.2s).
    _nkLoop(g.fxRun, (dtS) => {
        if (g.finished) return false;
        const pc = _lapPC();
        for (const n of g.nodes) {
            if (n.prog >= LAP_NODE_STAND) continue;
            if (Math.hypot(pc.x - n.x, pc.y - n.y) < 40) {
                n.prog += dtS;
                n.el.style.setProperty('--node-prog', String(Math.min(1, n.prog / LAP_NODE_STAND)));
                n.el.classList.add('sx-lap-node-breaking');
                if (n.prog >= LAP_NODE_STAND) {
                    g.broken++;
                    try { n.el.remove(); } catch (e) {}
                    g.nodes = g.nodes.filter(q => q !== n);
                    _nkToast('eg_mech_lap_node', '👁️⛓️ TIMELINE NODE BROKEN - ' + g.broken + '/' + LAP_NODE_GOAL + '!', '#a7f3d0');
                    if (g.broken >= LAP_NODE_GOAL) { _lapCloseLoop(g, monster); return false; }
                }
            } else if (n.prog > 0 && n.prog < LAP_NODE_STAND) {
                // Progress decays when you leave (but slowly - merciful).
                n.prog = Math.max(0, n.prog - dtS * 0.35);
                if (n.prog === 0) n.el.classList.remove('sx-lap-node-breaking');
            }
        }
        // Loop timer readout + deadline-driven next loop: a failure that
        // extends the deadline genuinely delays the next loop (the punish).
        const left = g.deadline - performance.now();
        if (g.timerEl) g.timerEl.textContent = Math.max(0, Math.ceil(left / 1000)) + 's';
        if (left <= 0) runLoop();
        return true;
    });

    runLoop();
}

// A lance crossing the whole arena at a fixed band (final variant).
export function _lapFinalLance(g, bandY, level) {
    const W = window.innerWidth;
    const warn = _nkEl(g.fxRun, 'div', 'sx-lap-loop-warn');
    warn.style.left = '0px';
    warn.style.top = Math.round(bandY - LAP_LANCE_W / 2) + 'px';
    warn.style.width = W + 'px';
    warn.style.height = LAP_LANCE_W + 'px';
    _lapAfter(g, 1200 * _LAP_DEBUG_MULT, () => {
        if (g.finished) return;
        try { warn.remove(); } catch (e) {}
        const fire = _nkEl(g.fxRun, 'div', 'sx-lap-lance sx-lap-lance-full');
        fire.style.left = '0px';
        fire.style.top = Math.round(bandY - LAP_LANCE_W / 2) + 'px';
        fire.style.width = W + 'px';
        fire.style.height = LAP_LANCE_W + 'px';
        const pc = _lapPC();
        if (Math.abs(pc.y - bandY) < LAP_LANCE_W / 2 + 10) {
            _lapFailPunish(g, 'Loop Lance');
            _lapTouch(LAP_LANCE_HIT, level, 'Loop Lance');
        }
        _lapAfter(g, 600, () => { try { fire.remove(); } catch (e) {} });
    });
}

// A phantom walking a straight line (final gauntlet + failure hunters).
export function _lapFinalPhantom(g, fixedY, isCross, level) {
    const W = window.innerWidth, H = window.innerHeight;
    const ltr = Math.random() < 0.5;
    const y = isCross ? fixedY : H * (0.2 + Math.random() * 0.6);
    const ph = _nkEl(g.fxRun, 'div', 'sx-lap-phantom sx-lap-phantom-hunter', '👤');
    let f = 0;
    const dur = 4 * _LAP_DEBUG_MULT;
    _nkLoop(g.fxRun, (dtS) => {
        if (g.finished) return false;
        f += dtS / dur;
        const x = ltr ? f * W : (1 - f) * W;
        ph.style.left = Math.round(x - 16) + 'px';
        ph.style.top = Math.round(y - 16) + 'px';
        const pc = _lapPC();
        // Punish only on a real hit (touch cooldown / ghost-form respected) -
        // punishing every overlapping frame snowballed the loop forever.
        if (Math.hypot(pc.x - x, pc.y - y) < 38) {
            if (_lapTouch(0.12, level, 'Loop Phantom')) _lapFailPunish(g, 'Phantom');
        }
        if (f >= 1) { try { ph.remove(); } catch (e) {} return false; }
        return true;
    });
}

// A failed dodge inside the loop: extends the loop and spawns a hunter.
export function _lapFailPunish(g, label) {
    if (!g || g.finished) return;
    void label;
    const now = performance.now();
    if (now < (g.punishCd || 0)) return;   // one punish per ~1.5s at most
    g.punishCd = now + 1500;
    const was = g.deadline;
    // Cap the total extension so the next loop (and its node) always arrives.
    const cap = now + LAP_LOOP_TIME * 1.5 * _LAP_DEBUG_MULT * 1000;
    g.deadline = Math.min(cap, g.deadline + LAP_FAIL_EXTEND * _LAP_DEBUG_MULT);
    if (g.deadline > was) {
        _nkToast('eg_mech_lap_extend', '👁️ The loop EXTENDS - the Demon rewrites your mistake!', '#f0abfc');
        // Extra hunter: a phantom that walks a random line right now.
        _lapFinalPhantom(g, 0, false, (function () {
            try {
                const m = (typeof _monsters !== 'undefined') ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
                return m ? m.level : 1;
            } catch (e) { return 1; }
        })());
    }
}

// Three nodes broken: the loop closes and the Demon pays its own HP.
export function _lapCloseLoop(g, monster) {
    if (g.finished) return;
    _nkToast('eg_mech_lap_closed', '👁️💥 THE TIMELINE CLOSES - the Demon is trapped in its own loop!', '#a7f3d0');
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
    document.querySelectorAll('.sx-lap-cd, .sx-lap-node, .sx-lap-branch, .sx-lap-loop-warn, ' +
        '.sx-lap-lance, .sx-lap-phantom, .sx-lap-collapse').forEach(el => {
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
    _lapGhostUntil = 0;
    _lapFrayCd = 0;
    document.querySelectorAll('.sx-lap-ghost-corridor, .sx-lap-ghost-head, .sx-lap-lance, ' +
        '.sx-lap-lance-head, .sx-lap-pin-blast, .sx-lap-walk-line, .sx-lap-phantom, ' +
        '.sx-lap-branch, .sx-lap-fray-dot, .sx-lap-clone, .sx-lap-node, .sx-lap-loop-warn, ' +
        '.sx-lap-cd, .sx-lap-collapse').forEach(el => {
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
    try { delete window._lapFailPunish; } catch (e) { window._lapFailPunish = undefined; }
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
