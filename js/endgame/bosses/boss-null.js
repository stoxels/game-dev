//------------------------------------------------------------------------
//-------------------BOSS: THE NULL (boss_null)----------------------------
//------------------------------------------------------------------------
// TIER 7 REWORK — 🧿 "The Null Hypothesis". Erasure of certainty: the Null
// deletes your information and your tools, and the fight is a proof — prove
// you can win with less. Element: shadow (unchanged).
//   • VOID LATTICE (signature, all fight) — a permanent star-lattice of
//     void lines on the floor; standing ON a line is a shadow DoT. The
//     lattice re-contracts every ~12s to a new random centre (old lines
//     dissolve, new ones grow — a 1.2s grace window between).
//   • HYPOTHESIS ERASURE (60%) — the Null targets ONE system each cast
//     (clue numbers / auto-attack charge bar / class HUD) and greys it out
//     for 8s with a clear 🧿 marker over what it took. Readable sabotage
//     instead of blackout chaos. (Clue numbers reuse the blackout spans.)
//   • NULL RAYS (60%) — two eye-beams orbit the anchor; crossing a ray
//     CHILLS your charge bar (50% fill for the ailment duration — the soft
//     punish) plus contact damage.
//   • 💀 PROOF BY CONTRADICTION (≤10%, one-shot) — the arena empties to
//     pure white; the Null asserts "you cannot hit me" (immune). Three
//     COUNTER-EXAMPLE WINDOWS open in sequence: a phantom replays your own
//     recent movement and telegraphs a strike toward its heading — stand
//     OPPOSITE the strike (within reach) to expose the contradiction and
//     shatter a shell. Three exposures → the hypothesis collapses (the
//     Null implodes and pays its own HP). Three failed windows →
//     NULLIFICATION: darkness returns except one white ring (30% hit).
//     Charge bar frozen (gate in _egTickPlayer via _egNulFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock, so
// gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Prefix discipline: everything here is _egNul / eg-nul-.
// Compatibility: the framework's shared cleanup typeof-guards
// _egRemoveBlackout and _egVoidSurgeTeardown — both still live HERE.
//------------------------------------------------------------------------

// DEBUG: slow The Null's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Flip to false for ship.
const _EG_NUL_DEBUG_SLOW = true;
const _EG_NUL_DEBUG_MULT = _EG_NUL_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_null: {
        id: 'boss_null', name: 'The Null', emoji: '🧿',
        baseHP: 900, baseDamage: 26, chargeMax: 15,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_null — "The Null Hypothesis" (rework)
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
            { name: 'void_lattice', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechNulLattice' },
            { name: 'prior_bomb', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
            { name: 'hypothesis_erasure', intervalBase: 24000, intervalVariance: 5000, handler: '_egMechNulErasure', phase2Only: true },
            { name: 'null_rays', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechNulRays', phase2Only: true },
        ],
        onPhaseEnter: _egNulOnPhaseEnter,
    },
});


// ── Shared tuning ───────────────────────────────────────────────────────────
const EG_NUL_LINE_DPS    = 9;      // %maxHP/s standing on a void line
const EG_NUL_LATTICE_R   = 320;    // lattice line length (px)
const EG_NUL_LINE_W      = 8;      // void line thickness
const EG_NUL_RECONTRACT  = 12;     // s between lattice re-contractions
const EG_NUL_ERASE_MS    = 8000;   // a hypothesis erasure lasts
const EG_NUL_RAY_HIT     = 0.14;   // %maxHP crossing a null ray
const EG_NUL_RAYS        = 2;      // orbiting eye-beams
const EG_NUL_RAY_SPEED   = 0.7;    // rad/s orbit
const EG_NUL_STRIKE_HIT  = 0.15;   // %maxHP caught on the strike side
const EG_NUL_EXPOSE_R    = 150;    // exposure reach around the phantom
const EG_NUL_WINDOW_MS   = 9000;   // per counter-example window
const EG_NUL_NULLIFY     = 0.30;   // NULLIFICATION hit (outside the ring)
const EG_NUL_RING_R      = 130;    // white safe ring radius
const EG_NUL_HIT_CD_MS   = 700;    // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED HELPERS----------------------------------------
//------------------------------------------------------------------------
let _egNulHitCd = 0;

// Touch damage helper shared by all Null hazards (per-touch cooldown).
function _egNulTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egNulHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egNulHitCd = now + EG_NUL_HIT_CD_MS;
    const dealt = _egNkHit(pct, 'shadow', level);
    _egNkAbilityHitToast(dealt, 'The Null', label);
    return true;
}

// Player centre with a screen-centre fallback.
function _egNulPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Prefixed delay for out-of-run callbacks: defers while the game is
// frozen (visual-only use — the finale uses _egNulAfter instead).
function _egNulDelay(ms, fn) {
    setTimeout(() => { if (!_egNkFrozen()) fn(); else setTimeout(() => { if (!_egNkFrozen()) fn(); }, 120); }, ms);
}

// Movement recorder: the finale's phantoms replay YOUR recent path. One
// passive run, created lazily, ~100ms samples, ~6s buffer.
let _egNulRecBuf = [];   // { x, y, t }
let _egNulRecRun = null;

function _egNulEnsureRecRun(monster) {
    if (_egNulRecRun && _egNkRuns.has(_egNulRecRun.id)) return;
    const run = _egNkNewRun(monster && monster.id, false);
    run.passive = true;
    _egNulRecRun = run;
    let acc = 0;
    _egNkLoop(run, (dtS) => {
        acc += dtS;
        if (acc < 0.1) return true;
        acc = 0;
        const pc = _egNulPC();
        const now = performance.now();
        _egNulRecBuf.push({ x: pc.x, y: pc.y, t: now });
        const cutoff = now - 6000;
        while (_egNulRecBuf.length && _egNulRecBuf[0].t < cutoff) _egNulRecBuf.shift();
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: VOID LATTICE (all fight)-------------------
//------------------------------------------------------------------------
// A permanent star-lattice of void lines: standing ON a line is a shadow
// DoT. Every ~12s the lattice re-contracts to a new random centre — old
// lines dissolve, new ones grow (a ~1.2s grace window between states).
// Geometry: 3 lines through the centre at 60° steps (6 spokes), plus a
// hollow hexagon ring — the safe cells are the triangular gaps.
let _egNulLatRun = null;
let _egNulLines = [];   // { el, cx, cy, ang, len }
let _egNulRing = [];    // { el, cx, cy, ang, d } (hexagon segments)

function _egMechNulLattice(monster, phase) {
    // The lattice is permanent — one long-lived passive run owns it.
    // Later scheduled casts must NOT re-toast or rebuild it.
    if (_egNulLatRun && _egNkRuns.has(_egNulLatRun.id)) return;
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    _egNkToast('eg_mech_nul_lattice', '🧿🕸️ VOID LATTICE — the void lines erase what touches them!', '#a5b4fc');
    _egNulEnsureRecRun(monster);

    const run = _egNkNewRun(monster && monster.id, false);
    run.passive = true;
    _egNulLatRun = run;

    let contractT = 0;
    let growing = false;
    let graceT = 0;
    let dotAccT = 0;

    const drawLattice = (cx, cy) => {
        const scale = p >= 3 ? 0.85 : 1;
        const len = EG_NUL_LATTICE_R * scale;
        // Three crossing lines at 60° steps.
        for (let i = 0; i < 3; i++) {
            const ang = i * Math.PI / 3 + Math.random() * 0.18;
            const el = document.createElement('div');
            el.className = 'eg-nul-line';
            el.style.left = Math.round(cx - len / 2) + 'px';
            el.style.top = Math.round(cy - EG_NUL_LINE_W / 2) + 'px';
            el.style.width = Math.round(len) + 'px';
            el.style.height = EG_NUL_LINE_W + 'px';
            el.style.transformOrigin = '50% 50%';
            el.style.transform = 'rotate(' + ang + 'rad)';
            document.body.appendChild(el);
            _egNulLines.push({ el, cx, cy, ang, len });
        }
        // Hollow hexagon ring around the centre.
        const d = len * 0.62;
        for (let i = 0; i < 6; i++) {
            const a1 = i * Math.PI / 3;
            const a2 = (i + 1) * Math.PI / 3;
            const x1 = cx + Math.cos(a1) * d, y1 = cy + Math.sin(a1) * d;
            const x2 = cx + Math.cos(a2) * d, y2 = cy + Math.sin(a2) * d;
            const seg = document.createElement('div');
            seg.className = 'eg-nul-line eg-nul-ring-seg';
            seg.style.left = Math.round(x1) + 'px';
            seg.style.top = Math.round(y1 - EG_NUL_LINE_W / 2) + 'px';
            seg.style.width = Math.round(Math.hypot(x2 - x1, y2 - y1)) + 'px';
            seg.style.height = EG_NUL_LINE_W + 'px';
            seg.style.transformOrigin = '0 50%';
            seg.style.transform = 'rotate(' + Math.atan2(y2 - y1, x2 - x1) + 'rad)';
            document.body.appendChild(seg);
            _egNulRing.push({ el: seg });
        }
    };

    const eraseLattice = () => {
        _egNulLines.forEach(l => { try { l.el.remove(); } catch (e) {} });
        _egNulRing.forEach(r => { try { r.el.remove(); } catch (e) {} });
        _egNulLines = []; _egNulRing = [];
    };

    drawLattice(W / 2, H / 2);

    _egNkLoop(run, (dtS) => {
        if (_egNulFinalActive()) return true;   // the proof whitewashes the lattice
        const pc = _egNulPC();

        // Re-contraction cycle.
        contractT += dtS;
        if (contractT >= EG_NUL_RECONTRACT * _EG_NUL_DEBUG_MULT) {
            contractT = 0;
            eraseLattice();
            growing = true;
            graceT = 0;
            const W2 = window.innerWidth, H2 = window.innerHeight;
            drawLattice(W2 * (0.3 + Math.random() * 0.4), H2 * (0.3 + Math.random() * 0.4));
        }
        if (growing) {
            graceT += dtS;
            if (graceT >= 1.2) growing = false;
        }

        // Shadow DoT while standing on a line (grace window exempts).
        dotAccT += dtS;
        if (!growing && dotAccT >= 0.1) {
            dotAccT = 0;
            const onLine = _egNulLines.some(l =>
                _egPtSegDist(pc.x, pc.y,
                    l.cx - Math.cos(l.ang) * l.len / 2, l.cy - Math.sin(l.ang) * l.len / 2,
                    l.cx + Math.cos(l.ang) * l.len / 2, l.cy + Math.sin(l.ang) * l.len / 2
                ) < EG_NUL_LINE_W / 2 + 9) ||
                _egNulRing.some(r => {
                    const rect = r.el.getBoundingClientRect();
                    return pc.x > rect.left - 9 && pc.x < rect.right + 9 && pc.y > rect.top - 9 && pc.y < rect.bottom + 9;
                });
            if (onLine) _egNkDotTick(run, EG_NUL_LINE_DPS, 0.1, level, 'shadow');
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------COMPAT: CLUE BLACKOUT (framework hooks)---------------
//------------------------------------------------------------------------
// The framework's shared cleanup typeof-guards _egRemoveBlackout and
// _egVoidSurgeTeardown — both stay defined HERE. The blackout span-hiding
// machinery is also reused by Hypothesis Erasure below.
// NOTE: _egBlackoutActive / _egVoidSurgeActive / _egVoidSurgePollInterval
// are DECLARED IN endgame-state.js (loads earlier) — redeclaring them here
// would be a fatal SyntaxError that kills this whole file.

// Hides all clue spans and stores their original text so it can be restored.
function _egApplyBlackout() {
    document.querySelectorAll('[id^="rn-"], [id^="cn-"]').forEach(span => {
        span.dataset.origText = span.textContent;
        span.textContent = '?';
        span.classList.add('eg-blackout-clue');
    });
}

// Restores all clue spans to their original text and removes the styling.
function _egRemoveBlackout() {
    if (!_egBlackoutActive && !document.querySelector('.eg-blackout-clue')) return;
    _egBlackoutActive = false;
    document.querySelectorAll('[id^="rn-"], [id^="cn-"]').forEach(span => {
        if (span.dataset.origText !== undefined) {
            span.textContent = span.dataset.origText;
            delete span.dataset.origText;
        }
        span.classList.remove('eg-blackout-clue');
    });
}

// Removes all legacy Void Surge DOM elements and clears the poll interval.
function _egVoidSurgeTeardown() {
    _egVoidSurgeActive = false;
    if (_egVoidSurgePollInterval) { clearInterval(_egVoidSurgePollInterval); _egVoidSurgePollInterval = null; }
    ['eg-void-surge-overlay', 'eg-void-surge-circle', 'eg-void-surge-countdown']
        .forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
}


//------------------------------------------------------------------------
//-------------------ACT II: HYPOTHESIS ERASURE (60%)----------------------
//------------------------------------------------------------------------
// The Null targets ONE system each cast and greys it out for 8s with a
// clear 🧿 marker over what it took. Readable sabotage: clue numbers
// (blackout spans), the auto-attack charge bar, or the class HUD.
const EG_NUL_ERASE_TARGETS = ['clues', 'charge', 'hud'];

function _egMechNulErasure(monster, phase) {
    if (_egNkFrozen()) return;
    void phase;
    const target = EG_NUL_ERASE_TARGETS[Math.floor(Math.random() * EG_NUL_ERASE_TARGETS.length)];
    _egNkToast('eg_mech_nul_erasure', '🧿 HYPOTHESIS ERASED — the Null took your ' +
        (target === 'clues' ? 'clue numbers' : target === 'charge' ? 'charge bar' : 'class HUD') + ' for 8s!', '#a5b4fc');

    const marker = document.createElement('div');
    marker.className = 'eg-nul-erase-marker';
    marker.textContent = '🧿';
    let host = null;
    if (target === 'clues') {
        _egBlackoutActive = true;
        _egApplyBlackout();
        host = document.getElementById('ptable');
    } else if (target === 'charge') {
        host = document.getElementById('avatar-charge-fill')
            || document.getElementById('eg-player-charge-bar');
    } else {
        host = document.getElementById('class-hud-panel') || document.getElementById('class-hud-drag-handle');
    }
    if (host) {
        host.style.position = host.style.position || '';
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        host.appendChild(marker);
    } else {
        document.body.appendChild(marker);
        marker.classList.add('eg-nul-erase-marker-free');
    }

    // Erasure hides INFORMATION only (the design: grey it out, marker on
    // top) — the bar keeps filling; you just cannot read it.
    if (target === 'charge') {
        ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('eg-nul-erased');
        });
    } else if (target === 'hud') {
        const hud = document.getElementById('class-hud-panel') || document.getElementById('class-hud-drag-handle');
        if (hud) hud.classList.add('eg-nul-erased');
    }

    _egNulDelay(EG_NUL_ERASE_MS * _EG_NUL_DEBUG_MULT, () => {
        try { marker.remove(); } catch (e) {}
        if (target === 'clues') _egRemoveBlackout();
        if (target === 'charge') {
            ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('eg-nul-erased');
            });
        }
        const hud = document.getElementById('class-hud-panel') || document.getElementById('class-hud-drag-handle');
        if (hud) hud.classList.remove('eg-nul-erased');
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: NULL RAYS (60%)-------------------------------
//------------------------------------------------------------------------
// Two eye-beams orbit the anchor. Crossing one: contact damage PLUS the
// chill ailment (charge bar fills at 50% — a verified soft punish).
function _egMechNulRays(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    _egNkToast('eg_mech_nul_rays', '🧿👁️ NULL RAYS — do not cross the gaze!', '#818cf8');
    _egNulEnsureRecRun(monster);

    const cx = W / 2, cy = H * 0.45;
    const anchor = _egNkEl(run, 'div', 'eg-nul-anchor', '🧿');
    anchor.style.left = Math.round(cx - 26) + 'px';
    anchor.style.top = Math.round(cy - 26) + 'px';
    const len = Math.hypot(W, H);
    const omega = EG_NUL_RAY_SPEED * (p >= 3 ? 1.35 : 1);
    const beams = [];
    for (let i = 0; i < EG_NUL_RAYS + (p >= 3 ? 1 : 0); i++) {
        const el = _egNkEl(run, 'div', 'eg-nul-ray');
        el.style.left = Math.round(cx) + 'px';
        el.style.top = Math.round(cy - 11) + 'px';
        el.style.width = Math.round(len) + 'px';
        el.style.height = '22px';
        beams.push({ off: i * Math.PI * 2 / (EG_NUL_RAYS + (p >= 3 ? 1 : 0)), el });
    }

    let e = 0;
    _egNkLoop(run, (dtS) => {
        e += dtS * 1000;
        const pc = _egNulPC();
        let crossed = false;
        beams.forEach(b => {
            const a = b.off + (e / 1000) * omega;
            b.el.style.transform = 'rotate(' + a + 'rad)';
            const bx = cx + Math.cos(a) * len, by = cy + Math.sin(a) * len;
            if (_egPtSegDist(pc.x, pc.y, cx, cy, bx, by) < 11 + 9) crossed = true;
        });
        if (crossed) {
            if (_egNulTouch(EG_NUL_RAY_HIT, level, 'Null Ray')) {
                try { _egApplyPlayerAilment('chill'); } catch (err) {}
                _egNkToast('eg_mech_nul_chilled', '🧿❄️ Your charge bar is CHILLED — it fills at half speed!', '#93c5fd');
            }
        }
        return e < 9000 * _EG_NUL_DEBUG_MULT;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: PROOF BY CONTRADICTION (≤10%, one-shot)-------
//------------------------------------------------------------------------
// The arena empties to pure white; the Null asserts "you cannot hit me"
// (immune). Three counter-example windows open in sequence: a phantom of
// YOUR recent movement walks and telegraphs a strike toward its heading —
// stand OPPOSITE the strike (within reach of the phantom) to expose the
// contradiction and shatter a shell. Three exposures → the hypothesis
// collapses (the Null pays its own HP). Three failures → NULLIFICATION:
// darkness returns except one white ring (30% hit).
const EG_NUL_EXPOSE_GOAL  = 3;     // shells to shatter (the kill)
const EG_NUL_STRIKE_WALK  = 2500;  // ms the phantom replays (x mult)
const EG_NUL_STRIKE_DELAY = 1400;  // ms telegraph after the walk
const EG_NUL_STRIKE_LEN   = 90;    // px the strike lands from the phantom

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egNulFinal = null;

function _egNulFinalActive() {
    return !!_egNulFinal && !_egNulFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egNulOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egNulStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egNulStartFinalWatcher(monster) {
    if (!monster || _egNulFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egNulFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egNulFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
function _egNulAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egNulFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

function _egNulFinalStart(monster) {
    if (_egNulFinal || !monster) return;

    // The proof takes over: kill every ACTIVE mechanic run of this boss —
    // the lattice and recorder runs idle (they check _egNulFinalActive).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId !== monster.id || r.passive) return;
        try { _egNkKillRun(r); } catch (e) {}
    });
    _egNulEnsureRecRun(monster);

    // Whitewash the lattice: certainty itself is erased for the proof.
    _egNulLines.forEach(l => { try { l.el.remove(); } catch (e) {} });
    _egNulRing.forEach(r => { try { r.el.remove(); } catch (e) {} });
    _egNulLines = []; _egNulRing = [];

    const g = {
        monsterId: monster.id,
        finished: false,
        window: 0,
        shatters: 0,
        fails: 0,
        fxRun: null, overlay: null, statusEl: null, timerEl: null,
    };
    _egNulFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Pure-white arena + countdown overlay.
    const white = document.createElement('div');
    white.className = 'eg-nul-white';
    document.body.appendChild(white);
    g.fxRun.els.push(white);

    const ov = document.createElement('div');
    ov.className = 'eg-nul-cd';
    ov.innerHTML =
        '<div class="eg-nul-cd-label">🧿💀 PROOF BY CONTRADICTION</div>' +
        '<div class="eg-nul-cd-status">SHELLS 0/' + EG_NUL_EXPOSE_GOAL + '</div>' +
        '<div class="eg-nul-cd-timer">—</div>' +
        '<div class="eg-nul-cd-hint">The phantom replays YOUR path — stand OPPOSITE its strike to expose the contradiction!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;
    g.statusEl = ov.querySelector('.eg-nul-cd-status');
    g.timerEl = ov.querySelector('.eg-nul-cd-timer');
    g.fxRun.els.push(ov);

    _egNkToast('eg_mech_nul_final_cd', '🧿💀 PROOF BY CONTRADICTION — the Null says you cannot hit it. Prove it wrong!', '#c7d2fe');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card whitens while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.add('eg-nul-allin');

    const level = monster.level || 1;

    // ── One counter-example window. ──────────────────────────────────────
    const runWindow = () => {
        if (g.finished) return;
        g.window++;
        _egNkToast('eg_mech_nul_window', '🧿 Counter-example ' + g.window + '/3 — expose it!', '#c7d2fe');

        const buf = _egNulRecBuf.slice();
        if (buf.length < 8) {   // not enough recorded yet — wait a beat, retry
            _egNulAfter(g, 800 * _EG_NUL_DEBUG_MULT, runWindow);
            return;
        }
        const t0 = performance.now();
        const walkMs = EG_NUL_STRIKE_WALK * _EG_NUL_DEBUG_MULT;

        const phantom = _egNkEl(g.fxRun, 'div', 'eg-nul-phantom', '👤');
        const startS = buf[0];
        phantom.style.left = Math.round(startS.x - 16) + 'px';
        phantom.style.top = Math.round(startS.y - 16) + 'px';

        _egNulAfter(g, walkMs, () => {
            if (g.finished) return;
            // Strike telegraph: toward the phantom's final heading.
            const endS = buf[buf.length - 1];
            const prevS = buf[Math.max(0, buf.length - 4)];
            const dx = endS.x - prevS.x, dy = endS.y - prevS.y;
            const d = Math.hypot(dx, dy) || 1;
            const sx = endS.x + dx / d * EG_NUL_STRIKE_LEN;
            const sy = endS.y + dy / d * EG_NUL_STRIKE_LEN;
            const warn = _egNkEl(g.fxRun, 'div', 'eg-nul-strike-warn');
            warn.style.left = Math.round(sx - 55) + 'px';
            warn.style.top = Math.round(sy - 55) + 'px';

            _egNulAfter(g, EG_NUL_STRIKE_DELAY * _EG_NUL_DEBUG_MULT, () => {
                if (g.finished) return;
                try { warn.remove(); } catch (e) {}
                const pc = _egNulPC();
                const onStrike = Math.hypot(pc.x - sx, pc.y - sy) < 60;
                const nearPhantom = Math.hypot(pc.x - endS.x, pc.y - endS.y) < EG_NUL_EXPOSE_R;
                if (onStrike) {
                    // Standing WHERE it strikes: the hypothesis holds.
                    g.fails++;
                    _egNulTouch(EG_NUL_STRIKE_HIT, level, 'Void Strike');
                    _egNkToast('eg_mech_nul_fail', '🧿 The strike found you — the hypothesis holds!', '#f87171');
                } else if (nearPhantom) {
                    // Opposite the strike, within reach: CONTRADICTION.
                    g.shatters++;
                    const shatter = _egNkEl(g.fxRun, 'div', 'eg-nul-shatter');
                    shatter.style.left = Math.round(endS.x - 70) + 'px';
                    shatter.style.top = Math.round(endS.y - 70) + 'px';
                    _egNulAfter(g, 800, () => { try { shatter.remove(); } catch (e) {} });
                    _egNkToast('eg_mech_nul_expose', '🧿💥 CONTRADICTION EXPOSED — shell ' + g.shatters + '/' + EG_NUL_EXPOSE_GOAL + ' shatters!', '#a7f3d0');
                } else {
                    g.fails++;
                    _egNkToast('eg_mech_nul_fail', '🧿 You never engaged the phantom — the hypothesis holds!', '#f87171');
                }
                if (g.statusEl) g.statusEl.textContent = 'SHELLS ' + g.shatters + '/' + EG_NUL_EXPOSE_GOAL;
                try { phantom.remove(); } catch (e) {}

                if (g.shatters >= EG_NUL_EXPOSE_GOAL) {
                    _egNulCollapse(g, monster);
                } else if (g.fails >= 3) {
                    _egNulNullification(g, monster, level);
                } else {
                    _egNulAfter(g, 2200 * _EG_NUL_DEBUG_MULT, runWindow);
                }
            });
        });

        // Window timer readout (fails drive the punish, the timer informs).
        const myWin = g.window;
        const deadline = t0 + EG_NUL_WINDOW_MS * _EG_NUL_DEBUG_MULT;
        const tick = () => {
            if (g.finished || g.window !== myWin) return;
            const left = deadline - performance.now();
            if (g.timerEl) g.timerEl.textContent = Math.max(0, Math.ceil(left / 1000)) + 's';
            if (left > 0) _egNulAfter(g, 250, tick);
        };
        tick();
    };
    runWindow();
}

// Three exposures: the hypothesis collapses — the Null implodes inward and
// pays its own remaining HP (canonical path, immunity already released).
function _egNulCollapse(g, monster) {
    if (g.finished) return;
    _egNkToast('eg_mech_nul_collapse', '🧿💥 THE HYPOTHESIS COLLAPSES — the Null refutes itself!', '#a7f3d0');
    const flash = document.createElement('div');
    flash.className = 'eg-nul-implode';
    document.body.appendChild(flash);
    setTimeout(() => { try { flash.remove(); } catch (e) {} }, 1500);
    _egNulFinalEnd(g, monster);
    try {
        const m = (typeof _egMonsters !== 'undefined') ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
        if (m && typeof _egDamageTargetById === 'function' && m.currentHP > 0) {
            _egDamageTargetById(g.monsterId, m.currentHP, ['shadow'], {});
        }
    } catch (e) {}
    void monster;
}

// Three failures: NULLIFICATION — darkness returns except one white ring.
function _egNulNullification(g, monster, level) {
    if (g.finished) return;
    _egNkToast('eg_mech_nul_nullify', '🧿💀 NULLIFICATION — everything is erased but the ring!', '#f87171');
    const W = window.innerWidth, H = window.innerHeight;
    const dark = document.createElement('div');
    dark.className = 'eg-nul-dark';
    document.body.appendChild(dark);
    g.fxRun.els.push(dark);
    const ring = document.createElement('div');
    ring.className = 'eg-nul-ring-safe';
    ring.style.left = Math.round(W / 2 - EG_NUL_RING_R) + 'px';
    ring.style.top = Math.round(H / 2 - EG_NUL_RING_R) + 'px';
    document.body.appendChild(ring);
    g.fxRun.els.push(ring);

    _egNulAfter(g, 2200 * _EG_NUL_DEBUG_MULT, () => {
        if (g.finished) return;
        const pc = _egNulPC();
        if (Math.hypot(pc.x - W / 2, pc.y - H / 2) > EG_NUL_RING_R) {
            const dealt = _egNkHit(EG_NUL_NULLIFY, 'shadow', level);
            _egNkAbilityHitToast(dealt, 'The Null', 'Nullification');
        } else {
            _egNkToast('eg_mech_nul_survived', '🧿 You survived the nullification — the fight resumes!', '#a7f3d0');
        }
        // The proof failed: the arena returns and the fight resumes.
        _egNulFinalEnd(g, monster);
    });
}

// Ends the finale: releases immunity + charge bar and cleans the board.
function _egNulFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _egNkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.eg-nul-white, .eg-nul-cd, .eg-nul-phantom, .eg-nul-strike-warn, ' +
        '.eg-nul-shatter, .eg-nul-implode, .eg-nul-dark, .eg-nul-ring-safe').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.remove('eg-nul-allin');
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    try {
        const m = (typeof _egMonsters !== 'undefined') ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
        if (m) m.bossImmune = false;
    } catch (e) {}
    void monster;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body state this boss ever created.
function _egNulTeardown() {
    if (_egNulFinal) { try { _egNulFinalEnd(_egNulFinal, null); } catch (e) {} _egNulFinal = null; }
    if (_egNulLatRun) { try { _egNkKillRun(_egNulLatRun); } catch (e) {} _egNulLatRun = null; }
    if (_egNulRecRun) { try { _egNkKillRun(_egNulRecRun); } catch (e) {} _egNulRecRun = null; }
    _egNulLines.forEach(l => { try { l.el.remove(); } catch (e) {} });
    _egNulRing.forEach(r => { try { r.el.remove(); } catch (e) {} });
    _egNulLines = []; _egNulRing = [];
    _egNulRecBuf = [];
    _egBlackoutActive = false;
    _egVoidSurgeActive = false;
    _egRemoveBlackout();
    _egVoidSurgeTeardown();
    document.querySelectorAll('.eg-nul-line, .eg-nul-ring-seg, .eg-nul-anchor, .eg-nul-ray, ' +
        '.eg-nul-erase-marker, .eg-nul-erase-marker-free, .eg-nul-white, .eg-nul-cd, ' +
        '.eg-nul-phantom, .eg-nul-strike-warn, .eg-nul-shatter, .eg-nul-implode, ' +
        '.eg-nul-dark, .eg-nul-ring-safe').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-nul-erased', 'eg-charge-paused');
    });
    const hud = document.getElementById('class-hud-panel') || document.getElementById('class-hud-drag-handle');
    if (hud) hud.classList.remove('eg-nul-erased');
    const card = document.getElementById('eg-card-boss_null');
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.remove('eg-nul-allin');
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_NUL_DEBUG.fire('lattice'|'erasure'|'rays'|'final') — run one now
if (typeof window !== 'undefined') {
    window._EG_NUL_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_null') : null;
            if (!monster) return 'no null alive';
            if (name === 'final') { _egNulFinalStart(monster); return 'PROOF BY CONTRADICTION started'; }
            const fn = name === 'lattice' ? _egMechNulLattice
                : name === 'erasure' ? _egMechNulErasure
                : name === 'rays' ? _egMechNulRays : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'erasure' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
    };
}
