import { _applyPlayerAilment } from '../combat-ailments-core.js';
import { _damageTargetById } from '../encounter-monster-damage.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkToast, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE NULL (boss_null)----------------------------
//------------------------------------------------------------------------
// Tier-7 rework "The Null Hypothesis": a void lattice to stand between,
// hypothesis erasures that grey out one UI system, and orbiting null rays.
// PROOF BY CONTRADICTION at ≤10%: expose 3 counter-examples or face
// NULLIFICATION.
//
// Prefix discipline: everything here is _bossNul / sx-nul-.
// Compatibility: the framework's shared cleanup typeof-guards
// _removeBlackout and _voidSurgeTeardown - both still live HERE.
//------------------------------------------------------------------------

// DEBUG: slow The Null's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Off for ship.
export const _NUL_DEBUG_SLOW = false;
export const _NUL_DEBUG_MULT = _NUL_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_null: {
        id: 'boss_null', name: 'The Null', emoji: '🧿',
        baseHP: 900, baseDamage: 26, chargeMax: 15,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(BOSS_MECHANICS, {

    // boss_null - "The Null Hypothesis" (rework)
    // Phase 1 (100% → 60%): Void Lattice teaches line-reading
    // Phase 2 ( 60% → 30%): immune window, Erasure + Rays join
    // Phase 3 ( 30% →  0%): tighter lattice; at 10% the PROOF begins
    boss_null: {
        phases: [
            { threshold: 1.00, chargeMax: 15, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'void_lattice', intervalBase: 20000, intervalVariance: 5000, handler: '_mechNulLattice' },
            { name: 'prior_bomb', intervalBase: 18000, intervalVariance: 4000, handler: '_mechPriorBomb' },
            { name: 'hypothesis_erasure', intervalBase: 24000, intervalVariance: 5000, handler: '_mechNulErasure', phase2Only: true },
            { name: 'null_rays', intervalBase: 22000, intervalVariance: 5000, handler: '_mechNulRays', phase2Only: true },
        ],
        onPhaseEnter: _nulOnPhaseEnter,
    },
});


// ── Shared tuning ───────────────────────────────────────────────────────────
export const NUL_LINE_DPS    = 9;      // %maxHP/s standing on a void line
export const NUL_LATTICE_R   = 320;    // lattice line length (px)
export const NUL_LINE_W      = 8;      // void line thickness
export const NUL_RECONTRACT  = 12;     // s between lattice re-contractions
const NUL_LATTICE_DRIFT = 45;   // px/s the lattice drifts across the arena
export const NUL_ERASE_MS    = 8000;   // a hypothesis erasure lasts
export const NUL_RAY_HIT     = 0.14;   // %maxHP crossing a null ray
export const NUL_RAYS        = 2;      // orbiting eye-beams
// Warning window before the rays turn dangerous (module-private on purpose:
// not part of the manifest's export surface).
const NUL_RAY_WARN_MS = 1800;
export const NUL_RAY_SPEED   = 0.7;    // rad/s orbit
export const NUL_STRIKE_HIT  = 0.15;   // %maxHP caught on the strike side
export const NUL_EXPOSE_R    = 105;    // radius of the safe STAND-HERE ring around the phantom
export const NUL_WINDOW_MS   = 9000;   // per counter-example window
export const NUL_NULLIFY     = 0.30;   // NULLIFICATION hit (outside the ring)
export const NUL_RING_R      = 130;    // white safe ring radius
export const NUL_HIT_CD_MS   = 700;    // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED HELPERS----------------------------------------
//------------------------------------------------------------------------
export let _nulHitCd = 0;

// Touch damage helper shared by all Null hazards (per-touch cooldown).
export function _nulTouch(pct, level, label) {
    const now = performance.now();
    if (now < _nulHitCd) return false;
    const pr = _nkPlayerRect();
    if (!pr) return false;
    _nulHitCd = now + NUL_HIT_CD_MS;
    const dealt = _nkHit(pct, 'shadow', level);
    _nkAbilityHitToast(dealt, 'The Null', label);
    return true;
}

// Player centre with a screen-centre fallback.
export function _nulPC() { const c = _nkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Prefixed delay for out-of-run callbacks: defers while the game is
// frozen (visual-only use - the finale uses _nulAfter instead).
export function _nulDelay(ms, fn) {
    setTimeout(() => { if (!_nkFrozen()) fn(); else setTimeout(() => { if (!_nkFrozen()) fn(); }, 120); }, ms);
}

// Movement recorder: the finale's phantoms replay YOUR recent path. One
// passive run, created lazily, ~100ms samples, ~6s buffer.
export let _nulRecBuf = [];   // { x, y, t }
export let _nulRecRun = null;

export function _nulEnsureRecRun(monster) {
    if (_nulRecRun && _nkRuns.has(_nulRecRun.id)) return;
    const run = _nkNewRun(monster && monster.id, false);
    run.passive = true;
    _nulRecRun = run;
    let acc = 0;
    _nkLoop(run, (dtS) => {
        acc += dtS;
        if (acc < 0.1) return true;
        acc = 0;
        const pc = _nulPC();
        const now = performance.now();
        _nulRecBuf.push({ x: pc.x, y: pc.y, t: now });
        const cutoff = now - 6000;
        while (_nulRecBuf.length && _nulRecBuf[0].t < cutoff) _nulRecBuf.shift();
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: VOID LATTICE (all fight)-------------------
//------------------------------------------------------------------------
// A permanent star-lattice of void lines: standing ON a line is a shadow
// DoT. Every ~12s the lattice re-contracts to a new random centre - old
// lines dissolve, new ones grow (a ~1.2s grace window between states).
// Geometry: 3 lines through the centre at 60° steps (6 spokes), plus a
// hollow hexagon ring - the safe cells are the triangular gaps.
export let _nulLatRun = null;
export let _nulLines = [];   // { el, cx, cy, ang, len }
export let _nulRing = [];    // { el, cx, cy, ang, d } (hexagon segments)

export function _mechNulLattice(monster, phase) {
    // The lattice is permanent - one long-lived passive run owns it.
    // Later scheduled casts must NOT re-toast or rebuild it.
    if (_nulLatRun && _nkRuns.has(_nulLatRun.id)) return;
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    _nkToast('eg_mech_nul_lattice', '🧿🕸️ VOID LATTICE - the void lines erase what touches them!', '#a5b4fc');
    _nulEnsureRecRun(monster);

    const run = _nkNewRun(monster && monster.id, false);
    run.passive = true;
    _nulLatRun = run;

    let contractT = 0;
    let growing = false;
    let graceT = 0;
    let dotAccT = 0;

    const drawLattice = (cx, cy) => {
        const scale = p >= 3 ? 0.85 : 1;
        const len = NUL_LATTICE_R * scale;
        // Three crossing lines at 60° steps.
        for (let i = 0; i < 3; i++) {
            const ang = i * Math.PI / 3 + Math.random() * 0.18;
            const el = document.createElement('div');
            el.className = 'sx-nul-line';
            el.style.left = Math.round(cx - len / 2) + 'px';
            el.style.top = Math.round(cy - NUL_LINE_W / 2) + 'px';
            el.style.width = Math.round(len) + 'px';
            el.style.height = NUL_LINE_W + 'px';
            el.style.transformOrigin = '50% 50%';
            el.style.transform = 'rotate(' + ang + 'rad)';
            document.body.appendChild(el);
            _nulLines.push({ el, cx, cy, ang, len });
        }
        // Hollow hexagon ring around the centre.
        const d = len * 0.62;
        for (let i = 0; i < 6; i++) {
            const a1 = i * Math.PI / 3;
            const a2 = (i + 1) * Math.PI / 3;
            const x1 = cx + Math.cos(a1) * d, y1 = cy + Math.sin(a1) * d;
            const x2 = cx + Math.cos(a2) * d, y2 = cy + Math.sin(a2) * d;
            const seg = document.createElement('div');
            seg.className = 'sx-nul-line sx-nul-ring-seg';
            seg.style.left = Math.round(x1) + 'px';
            seg.style.top = Math.round(y1 - NUL_LINE_W / 2) + 'px';
            seg.style.width = Math.round(Math.hypot(x2 - x1, y2 - y1)) + 'px';
            seg.style.height = NUL_LINE_W + 'px';
            seg.style.transformOrigin = '0 50%';
            seg.style.transform = 'rotate(' + Math.atan2(y2 - y1, x2 - x1) + 'rad)';
            document.body.appendChild(seg);
            // Pass 5: cache the painted box at draw time. The lattice is static
            // body-absolute px geometry (left/top/width/height inline + rotate),
            // so the box never changes after creation - reading it live every
            // damage tick (6 gBCR per 100 ms) was pure layout thrash.
            _nulRing.push({ el: seg, x1, y1, x2, y2 });
        }
    };

    const eraseLattice = () => {
        _nulLines.forEach(l => { try { l.el.remove(); } catch (e) {} });
        _nulRing.forEach(r => { try { r.el.remove(); } catch (e) {} });
        _nulLines = []; _nulRing = [];
    };

    // The whole lattice drifts slowly across the arena toward a wandering
    // target point, so standing still on a "safe" gap stops working. Geometry
    // (collision data) moves with it; the elements move via the independent
    // `translate` property so their rotate transforms stay untouched.
    let cenX = W / 2, cenY = H / 2;
    let tgtX = cenX, tgtY = cenY;
    let offX = 0, offY = 0;
    const pickDriftTarget = () => {
        const W2 = window.innerWidth, H2 = window.innerHeight;
        tgtX = W2 * (0.3 + Math.random() * 0.4);
        tgtY = H2 * (0.3 + Math.random() * 0.4);
    };
    const driftLattice = (dtS) => {
        const dist = Math.hypot(tgtX - cenX, tgtY - cenY);
        if (dist < 8) { pickDriftTarget(); return; }
        const step = Math.min(dist, NUL_LATTICE_DRIFT * (p >= 3 ? 1.4 : 1) * dtS);
        const dx = (tgtX - cenX) / dist * step, dy = (tgtY - cenY) / dist * step;
        cenX += dx; cenY += dy; offX += dx; offY += dy;
        const tr = Math.round(offX) + 'px ' + Math.round(offY) + 'px';
        _nulLines.forEach(l => { l.cx += dx; l.cy += dy; l.el.style.translate = tr; });
        _nulRing.forEach(r => {
            r.x1 += dx; r.y1 += dy; r.x2 += dx; r.y2 += dy;
            r.el.style.translate = tr;
        });
    };

    drawLattice(cenX, cenY);
    pickDriftTarget();

    _nkLoop(run, (dtS) => {
        if (_nulFinalActive()) return true;   // the proof whitewashes the lattice
        const pc = _nulPC();

        // Re-contraction cycle: the lattice redraws (new spoke angles, brief
        // grace window) where it currently is, then keeps drifting.
        contractT += dtS;
        if (contractT >= NUL_RECONTRACT * _NUL_DEBUG_MULT) {
            contractT = 0;
            eraseLattice();
            growing = true;
            graceT = 0;
            offX = 0; offY = 0;
            drawLattice(cenX, cenY);
            pickDriftTarget();
        }
        driftLattice(dtS);
        if (growing) {
            graceT += dtS;
            if (graceT >= 1.2) growing = false;
        }

        // Shadow DoT while standing on a line (grace window exempts).
        dotAccT += dtS;
        if (!growing && dotAccT >= 0.1) {
            dotAccT = 0;
            const onLine = _nulLines.some(l =>
                _ptSegDist(pc.x, pc.y,
                    l.cx - Math.cos(l.ang) * l.len / 2, l.cy - Math.sin(l.ang) * l.len / 2,
                    l.cx + Math.cos(l.ang) * l.len / 2, l.cy + Math.sin(l.ang) * l.len / 2
                ) < NUL_LINE_W / 2 + 9) ||
                _nulRing.some(r => _ptSegDist(pc.x, pc.y, r.x1, r.y1, r.x2, r.y2) < NUL_LINE_W / 2 + 9);
            // A real hit on the shared touch cooldown (not a silent DoT): the
            // player gets the hit flash + damage toast, so standing on a void
            // line visibly hurts. Same 9%/s as before: pct per touch = dps * cd.
            if (onLine) _nulTouch(NUL_LINE_DPS / 100 * (NUL_HIT_CD_MS / 1000), level, 'Void Line');
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------COMPAT: CLUE BLACKOUT (framework hooks)---------------
//------------------------------------------------------------------------
// The framework's shared cleanup typeof-guards _removeBlackout and
// _voidSurgeTeardown - both stay defined HERE. The blackout span-hiding
// machinery is also reused by Hypothesis Erasure below.
// NOTE: _blackoutActive / _voidSurgeActive / _voidSurgePollInterval
// are DECLARED IN endgame-state.js (loads earlier) - redeclaring them here
// would be a fatal SyntaxError that kills this whole file.

// Hides all clue spans and stores their original text so it can be restored.
export function _applyBlackout() {
    document.querySelectorAll('[id^="rn-"], [id^="cn-"]').forEach(span => {
        span.dataset.origText = span.textContent;
        span.textContent = '?';
        span.classList.add('sx-blackout-clue');
    });
}

// Restores all clue spans to their original text and removes the styling.
export function _removeBlackout() {
    if (!globalThis._blackoutActive && !document.querySelector('.sx-blackout-clue')) return;
    globalThis._blackoutActive = false;
    document.querySelectorAll('[id^="rn-"], [id^="cn-"]').forEach(span => {
        if (span.dataset.origText !== undefined) {
            span.textContent = span.dataset.origText;
            delete span.dataset.origText;
        }
        span.classList.remove('sx-blackout-clue');
    });
}

// Removes all legacy Void Surge DOM elements and clears the poll interval.
export function _voidSurgeTeardown() {
    globalThis._voidSurgeActive = false;
    if (globalThis._voidSurgePollInterval) { clearInterval(globalThis._voidSurgePollInterval); globalThis._voidSurgePollInterval = null; }
    ['sx-void-surge-overlay', 'sx-void-surge-circle', 'sx-void-surge-countdown']
        .forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
}


//------------------------------------------------------------------------
//-------------------ACT II: HYPOTHESIS ERASURE (60%)----------------------
//------------------------------------------------------------------------
// The Null targets ONE system each cast and greys it out for 8s with a
// clear 🧿 marker over what it took. Readable sabotage: clue numbers
// (blackout spans), the auto-attack charge bar, or the class HUD.
export const NUL_ERASE_TARGETS = ['clues', 'charge', 'hud'];

export function _mechNulErasure(monster, phase) {
    if (_nkFrozen()) return;
    void phase;
    const target = NUL_ERASE_TARGETS[Math.floor(Math.random() * NUL_ERASE_TARGETS.length)];
    _nkToast('eg_mech_nul_erasure', '🧿 HYPOTHESIS ERASED - the Null took your ' +
        (target === 'clues' ? 'clue numbers' : target === 'charge' ? 'charge bar' : 'class HUD') + ' for 8s!', '#a5b4fc');

    const marker = document.createElement('div');
    marker.className = 'sx-nul-erase-marker';
    marker.textContent = '🧿';
    let host = null;
    if (target === 'clues') {
        globalThis._blackoutActive = true;
        _applyBlackout();
        host = document.getElementById('ptable');
    } else if (target === 'charge') {
        host = document.getElementById('avatar-charge-fill')
            || document.getElementById('sx-player-charge-bar');
    } else {
        host = document.getElementById('class-hud-panel') || document.getElementById('class-hud-drag-handle');
    }
    if (host) {
        host.style.position = host.style.position || '';
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        // the stylesheet pins the marker to the screen centre; inside a host it
        // must centre on the host instead
        marker.style.position = 'absolute';
        marker.style.left = '50%';
        marker.style.top = '50%';
        host.appendChild(marker);
    } else {
        document.body.appendChild(marker);
        marker.classList.add('sx-nul-erase-marker-free');
    }

    // Erasure hides INFORMATION only (the design: grey it out, marker on
    // top) - the bar keeps filling; you just cannot read it.
    if (target === 'charge') {
        ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('sx-nul-erased');
        });
    } else if (target === 'hud') {
        const hud = document.getElementById('class-hud-panel') || document.getElementById('class-hud-drag-handle');
        if (hud) hud.classList.add('sx-nul-erased');
    }

    _nulDelay(NUL_ERASE_MS * _NUL_DEBUG_MULT, () => {
        try { marker.remove(); } catch (e) {}
        if (target === 'clues') _removeBlackout();
        if (target === 'charge') {
            ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('sx-nul-erased');
            });
        }
        const hud = document.getElementById('class-hud-panel') || document.getElementById('class-hud-drag-handle');
        if (hud) hud.classList.remove('sx-nul-erased');
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: NULL RAYS (60%)-------------------------------
//------------------------------------------------------------------------
// Two eye-beams orbit the anchor. Crossing one: contact damage PLUS the
// chill ailment (charge bar fills at 50% - a verified soft punish).
export function _mechNulRays(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    _nkToast('eg_mech_nul_rays', '🧿👁️ NULL RAYS - do not cross the gaze!', '#818cf8');
    _nulEnsureRecRun(monster);

    const cx = W / 2, cy = H * 0.45;
    const anchor = _nkEl(run, 'div', 'sx-nul-anchor', '🧿');
    anchor.style.left = Math.round(cx - 26) + 'px';
    anchor.style.top = Math.round(cy - 26) + 'px';
    const len = Math.hypot(W, H);
    const omega = NUL_RAY_SPEED * (p >= 3 ? 1.35 : 1);
    const beams = [];
    for (let i = 0; i < NUL_RAYS + (p >= 3 ? 1 : 0); i++) {
        const el = _nkEl(run, 'div', 'sx-nul-ray');
        el.style.left = Math.round(cx) + 'px';
        el.style.top = Math.round(cy - 11) + 'px';
        el.style.width = Math.round(len) + 'px';
        el.style.height = '22px';
        // pivot at the anchor end: the damage test sweeps a segment from the
        // anchor, so the painted beam must rotate around the same point
        el.style.transformOrigin = '0 50%';
        beams.push({ off: i * Math.PI * 2 / (NUL_RAYS + (p >= 3 ? 1 : 0)), el });
    }

    // Telegraph: the beams first appear as pale dashed warning lines at their
    // starting angles and do NOT hurt or rotate for NUL_RAY_WARN_MS, so
    // the player can read where they will sweep and step clear. (Playtest:
    // the rays used to spin up and hit in the same frame as the toast.)
    const warnMs = NUL_RAY_WARN_MS * _NUL_DEBUG_MULT;
    let e = 0;
    _nkLoop(run, (dtS) => {
        e += dtS * 1000;
        const warning = e < warnMs;
        const live = warning ? 0 : (e - warnMs);
        const pc = _nulPC();
        let crossed = false;
        beams.forEach(b => {
            const a = b.off + (live / 1000) * omega;
            b.el.classList.toggle('sx-nul-ray-warn', warning);
            b.el.style.transform = 'rotate(' + a + 'rad)';
            const bx = cx + Math.cos(a) * len, by = cy + Math.sin(a) * len;
            if (!warning && _ptSegDist(pc.x, pc.y, cx, cy, bx, by) < 11 + 9) crossed = true;
        });
        if (crossed) {
            if (_nulTouch(NUL_RAY_HIT, level, 'Null Ray')) {
                try { _applyPlayerAilment('chill'); } catch (err) {}
                _nkToast('eg_mech_nul_chilled', '🧿❄️ Your charge bar is CHILLED - it fills at half speed!', '#93c5fd');
            }
        }
        return e < warnMs + 9000 * _NUL_DEBUG_MULT;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: PROOF BY CONTRADICTION (≤10%, one-shot)-------
//------------------------------------------------------------------------
// The arena empties to pure white; the Null asserts "you cannot hit me"
// (immune). Three counter-example windows open in sequence: a phantom of
// YOUR recent movement walks and telegraphs a strike toward its heading -
// stand OPPOSITE the strike (within reach of the phantom) to expose the
// contradiction and shatter a shell. Three exposures → the hypothesis
// collapses (the Null pays its own HP). Three failures → NULLIFICATION:
// darkness returns except one white ring (30% hit).
export const NUL_EXPOSE_GOAL  = 3;     // shells to shatter (the kill)
export const NUL_STRIKE_WALK  = 2500;  // ms the phantom replays (x mult)
export const NUL_STRIKE_DELAY = 3000;  // ms countdown (3-2-1) after the walk
export const NUL_STRIKE_LEN   = 200;   // px between the safe ring and the strike circle

// Set while the finale runs (read by _tickPlayer's charge-freeze gate).
export let _nulFinal = null;

export function _nulFinalActive() {
    return !!_nulFinal && !_nulFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _nulOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _nulStartFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _nulStartFinalWatcher(monster) {
    if (!monster || _nulFinal) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (_nulFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _nulFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
export function _nulAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_nulFinal) return;
        if (_nkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

export function _nulFinalStart(monster) {
    if (_nulFinal || !monster) return;

    // The proof takes over: kill every ACTIVE mechanic run of this boss -
    // the lattice and recorder runs idle (they check _nulFinalActive).
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId !== monster.id || r.passive) return;
        try { _nkKillRun(r); } catch (e) {}
    });
    _nulEnsureRecRun(monster);

    // Whitewash the lattice: certainty itself is erased for the proof.
    _nulLines.forEach(l => { try { l.el.remove(); } catch (e) {} });
    _nulRing.forEach(r => { try { r.el.remove(); } catch (e) {} });
    _nulLines = []; _nulRing = [];

    const g = {
        monsterId: monster.id,
        finished: false,
        window: 0,
        shatters: 0,
        fails: 0,
        fxRun: null, overlay: null, statusEl: null, timerEl: null,
    };
    _nulFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _tickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('sx-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _nkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Pure-white arena + countdown overlay.
    const white = document.createElement('div');
    white.className = 'sx-nul-white';
    document.body.appendChild(white);
    g.fxRun.els.push(white);

    const ov = document.createElement('div');
    ov.className = 'sx-nul-cd';
    ov.innerHTML =
        '<div class="sx-nul-cd-label">🧿💀 PROOF BY CONTRADICTION</div>' +
        '<div class="sx-nul-cd-status">SHELLS ○○○   MISSES 0/3</div>' +
        '<div class="sx-nul-cd-timer">-</div>' +
        '<div class="sx-nul-cd-hint">Stand in the glowing ring. Avoid the red circle.</div>';
    document.body.appendChild(ov);
    g.overlay = ov;
    g.statusEl = ov.querySelector('.sx-nul-cd-status');
    g.timerEl = ov.querySelector('.sx-nul-cd-timer');
    g.fxRun.els.push(ov);

    _nkToast('eg_mech_nul_final_cd', '🧿💀 PROOF BY CONTRADICTION - the Null says you cannot hit it. Prove it wrong!', '#c7d2fe');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card whitens while the finale runs.
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.add('sx-nul-allin');

    const level = monster.level || 1;

    // ── One counter-example window. ──────────────────────────────────────
    const runWindow = () => {
        if (g.finished) return;
        g.window++;
        _nkToast('eg_mech_nul_window', '🧿 Counter-example ' + g.window + '/3 - expose it!', '#c7d2fe');

        const buf = _nulRecBuf.slice();
        if (buf.length < 8) {   // not enough recorded yet - wait a beat, retry
            _nulAfter(g, 800 * _NUL_DEBUG_MULT, runWindow);
            return;
        }
        const t0 = performance.now();
        const walkMs = NUL_STRIKE_WALK * _NUL_DEBUG_MULT;

        const phantom = _nkEl(g.fxRun, 'div', 'sx-nul-phantom', '👤');
        const startS = buf[0];
        phantom.style.left = Math.round(startS.x - 16) + 'px';
        phantom.style.top = Math.round(startS.y - 16) + 'px';

        // walk the phantom along the recorded path so the player can read it
        {
            const walkStart = performance.now();
            const walkRun = _nkNewRun(monster.id, false);
            walkRun.passive = true;
            _nkLoop(walkRun, () => {
                if (g.finished || !phantom.isConnected) return false;
                const f = Math.min(1, (performance.now() - walkStart) / walkMs);
                const i = Math.min(buf.length - 1, Math.round(f * (buf.length - 1)));
                phantom.style.left = Math.round(buf[i].x - 16) + 'px';
                phantom.style.top = Math.round(buf[i].y - 16) + 'px';
                return f < 1;
            });
        }

        _nulAfter(g, walkMs, () => {
            if (g.finished) return;
            // Safe ring around the phantom + a danger circle at a FIXED distance
            // on a side with room (never depends on how you were moving, so
            // standing still is not an accidental fail).
            const W2 = window.innerWidth, H2 = window.innerHeight;
            const endRaw = buf[buf.length - 1];
            const endS = {
                x: Math.max(NUL_EXPOSE_R + 10, Math.min(W2 - NUL_EXPOSE_R - 10, endRaw.x)),
                y: Math.max(NUL_EXPOSE_R + 10, Math.min(H2 - NUL_EXPOSE_R - 10, endRaw.y)),
            };
            let ang = Math.atan2(H2 / 2 - endS.y, W2 / 2 - endS.x) + (Math.random() - 0.5) * 1.2;
            if (Math.hypot(W2 / 2 - endS.x, H2 / 2 - endS.y) < 40) ang = Math.random() * Math.PI * 2;
            const sx = endS.x + Math.cos(ang) * NUL_STRIKE_LEN;
            const sy = endS.y + Math.sin(ang) * NUL_STRIKE_LEN;
            phantom.style.left = Math.round(endS.x - 16) + 'px';
            phantom.style.top = Math.round(endS.y - 16) + 'px';

            const safe = _nkEl(g.fxRun, 'div', 'sx-nul-safe-ring');
            safe.style.left = Math.round(endS.x - NUL_EXPOSE_R) + 'px';
            safe.style.top = Math.round(endS.y - NUL_EXPOSE_R) + 'px';
            safe.style.width = safe.style.height = (NUL_EXPOSE_R * 2) + 'px';
            safe.innerHTML = '<span class="sx-nul-ring-label">STAND HERE</span><span class="sx-nul-ring-count"></span>';
            const warn = _nkEl(g.fxRun, 'div', 'sx-nul-strike-warn');
            warn.style.left = Math.round(sx - 55) + 'px';
            warn.style.top = Math.round(sy - 55) + 'px';
            warn.innerHTML = '<span class="sx-nul-ring-label sx-nul-danger-label">DANGER</span>';

            // Visible 3-2-1 on the ring.
            g.counting = true;
            const countEl = safe.querySelector('.sx-nul-ring-count');
            const cdMs = NUL_STRIKE_DELAY * _NUL_DEBUG_MULT;
            const cdStart = performance.now();
            const cdTick = () => {
                if (g.finished || !safe.isConnected) return;
                const left = cdMs - (performance.now() - cdStart);
                const n = Math.max(0, Math.ceil(left / 1000));
                if (countEl) countEl.textContent = n > 0 ? String(n) : '';
                if (g.timerEl) g.timerEl.textContent = n > 0 ? String(n) : '';
                if (left > 0) _nulAfter(g, 100, cdTick);
            };
            cdTick();

            _nulAfter(g, cdMs, () => {
                if (g.finished) return;
                g.counting = false;
                try { warn.remove(); } catch (e) {}
                try { safe.remove(); } catch (e) {}
                const pc = _nulPC();
                const onStrike = Math.hypot(pc.x - sx, pc.y - sy) < 60;
                const inRing = Math.hypot(pc.x - endS.x, pc.y - endS.y) < NUL_EXPOSE_R;
                if (onStrike) {
                    g.fails++;
                    _nulTouch(NUL_STRIKE_HIT, level, 'Void Strike');
                    _nkToast('eg_mech_nul_fail', '🧿 You stood in the red - the hypothesis holds!', '#f87171');
                } else if (inRing) {
                    g.shatters++;
                    const shatter = _nkEl(g.fxRun, 'div', 'sx-nul-shatter');
                    shatter.style.left = Math.round(endS.x - 70) + 'px';
                    shatter.style.top = Math.round(endS.y - 70) + 'px';
                    _nulAfter(g, 800, () => { try { shatter.remove(); } catch (e) {} });
                    _nkToast('eg_mech_nul_expose', '🧿💥 CONTRADICTION EXPOSED - shell ' + g.shatters + '/' + NUL_EXPOSE_GOAL + ' shatters!', '#a7f3d0');
                } else {
                    // Not in the ring is a failure with teeth too: otherwise
                    // everywhere except the tiny red circle is a free spot and
                    // the whole mechanic could be ignored at no cost.
                    g.fails++;
                    _nulTouch(NUL_STRIKE_HIT, level, 'Void Strike');
                    _nkToast('eg_mech_nul_fail', '🧿 You were not in the ring - the hypothesis holds!', '#f87171');
                }
                if (g.statusEl) g.statusEl.textContent = 'SHELLS ' + '●'.repeat(g.shatters) + '○'.repeat(Math.max(0, NUL_EXPOSE_GOAL - g.shatters))
                    + '   MISSES ' + g.fails + '/3';
                try { phantom.remove(); } catch (e) {}

                if (g.shatters >= NUL_EXPOSE_GOAL) {
                    _nulCollapse(g, monster);
                } else if (g.fails >= 3) {
                    _nulNullification(g, monster, level);
                } else {
                    _nulAfter(g, 2200 * _NUL_DEBUG_MULT, runWindow);
                }
            });
        });

        // Window timer readout (fails drive the punish, the timer informs).
        const myWin = g.window;
        const deadline = t0 + NUL_WINDOW_MS * _NUL_DEBUG_MULT;
        const tick = () => {
            if (g.finished || g.window !== myWin) return;
            const left = deadline - performance.now();
            if (g.timerEl && !g.counting) g.timerEl.textContent = '';
            if (left > 0) _nulAfter(g, 250, tick);
        };
        tick();
    };
    runWindow();
}

// Three exposures: the hypothesis collapses - the Null implodes inward and
// pays its own remaining HP (canonical path, immunity already released).
export function _nulCollapse(g, monster) {
    if (g.finished) return;
    _nkToast('eg_mech_nul_collapse', '🧿💥 THE HYPOTHESIS COLLAPSES - the Null refutes itself!', '#a7f3d0');
    const flash = document.createElement('div');
    flash.className = 'sx-nul-implode';
    document.body.appendChild(flash);
    setTimeout(() => { try { flash.remove(); } catch (e) {} }, 1500);
    _nulFinalEnd(g, monster);
    try {
        const m = (typeof _monsters !== 'undefined') ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
        if (m && typeof _damageTargetById === 'function' && m.currentHP > 0) {
            _damageTargetById(g.monsterId, m.currentHP, ['shadow'], {});
        }
    } catch (e) {}
    void monster;
}

// Three failures: NULLIFICATION - darkness returns except one white ring.
export function _nulNullification(g, monster, level) {
    if (g.finished) return;
    _nkToast('eg_mech_nul_nullify', '🧿💀 NULLIFICATION - everything is erased but the ring!', '#f87171');
    const W = window.innerWidth, H = window.innerHeight;
    const dark = document.createElement('div');
    dark.className = 'sx-nul-dark';
    document.body.appendChild(dark);
    g.fxRun.els.push(dark);
    const ring = document.createElement('div');
    ring.className = 'sx-nul-ring-safe';
    ring.style.left = Math.round(W / 2 - NUL_RING_R) + 'px';
    ring.style.top = Math.round(H / 2 - NUL_RING_R) + 'px';
    document.body.appendChild(ring);
    g.fxRun.els.push(ring);

    _nulAfter(g, 2200 * _NUL_DEBUG_MULT, () => {
        if (g.finished) return;
        const pc = _nulPC();
        if (Math.hypot(pc.x - W / 2, pc.y - H / 2) > NUL_RING_R) {
            const dealt = _nkHit(NUL_NULLIFY, 'shadow', level);
            _nkAbilityHitToast(dealt, 'The Null', 'Nullification');
        } else {
            _nkToast('eg_mech_nul_survived', '🧿 You survived the nullification - the fight resumes!', '#a7f3d0');
        }
        // The proof failed: the arena returns and the fight resumes.
        _nulFinalEnd(g, monster);
    });
}

// Ends the finale: releases immunity + charge bar and cleans the board.
export function _nulFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _nkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.sx-nul-white, .sx-nul-cd, .sx-nul-phantom, .sx-nul-strike-warn, ' +
        '.sx-nul-shatter, .sx-nul-implode, .sx-nul-dark, .sx-nul-ring-safe, .sx-nul-safe-ring').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('sx-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.remove('sx-nul-allin');
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
export function _nulTeardown() {
    if (_nulFinal) { try { _nulFinalEnd(_nulFinal, null); } catch (e) {} _nulFinal = null; }
    if (_nulLatRun) { try { _nkKillRun(_nulLatRun); } catch (e) {} _nulLatRun = null; }
    if (_nulRecRun) { try { _nkKillRun(_nulRecRun); } catch (e) {} _nulRecRun = null; }
    _nulLines.forEach(l => { try { l.el.remove(); } catch (e) {} });
    _nulRing.forEach(r => { try { r.el.remove(); } catch (e) {} });
    _nulLines = []; _nulRing = [];
    _nulRecBuf = [];
    globalThis._blackoutActive = false;
    globalThis._voidSurgeActive = false;
    _removeBlackout();
    _voidSurgeTeardown();
    document.querySelectorAll('.sx-nul-line, .sx-nul-ring-seg, .sx-nul-anchor, .sx-nul-ray, ' +
        '.sx-nul-erase-marker, .sx-nul-erase-marker-free, .sx-nul-white, .sx-nul-cd, ' +
        '.sx-nul-phantom, .sx-nul-strike-warn, .sx-nul-shatter, .sx-nul-implode, ' +
        '.sx-nul-dark, .sx-nul-ring-safe, .sx-nul-safe-ring').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-nul-erased', 'sx-charge-paused');
    });
    const hud = document.getElementById('class-hud-panel') || document.getElementById('class-hud-drag-handle');
    if (hud) hud.classList.remove('sx-nul-erased');
    const card = document.getElementById('sx-card-boss_null');
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.remove('sx-nul-allin');
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _NUL_DEBUG.fire('lattice'|'erasure'|'rays'|'final') - run one now
if (typeof window !== 'undefined') {
    window._NUL_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_null') : null;
            if (!monster) return 'no null alive';
            if (name === 'final') { _nulFinalStart(monster); return 'PROOF BY CONTRADICTION started'; }
            const fn = name === 'lattice' ? _mechNulLattice
                : name === 'erasure' ? _mechNulErasure
                : name === 'rays' ? _mechNulRays : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'erasure' && _nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
    };
}
