//------------------------------------------------------------------------
//-------------------BOSS: THE NEEDLE (boss_needle)-----------------------
//------------------------------------------------------------------------
// REWORK — precision-sewing homage, rebuilt as a full stitchcraft gauntlet.
// The Needle treats the arena as cloth: spike gates to thread, pins that
// rain down and plant themselves, a rolling stitch wave of rising needles,
// and a pincushion that bursts — then, at the very end, it sews the whole
// screen shut and only the eye of the needle lets you through.
//
//   Phase 1 (100–60%) — SPIKE GATES. Full-height needle gates peek in at
//                       the edge, then scroll across with a single wobbling
//                       gap. Thread the gap! Two gates per pass; three at
//                       the end.
//                       Plus PIN DROPS. Giant pins slam down point-first at
//                       marked spots and plant themselves as tilted
//                       hazards. Mind the planted pins!
//   Phase 2 ( ≤60%)   — STITCH WAVE. The floor flashes a stitch grid, then
//                       needles rise lane by lane in a rolling wave. Stay
//                       ahead of the wave!
//                       Plus PINCUSHION BURST. A pincushion swells and
//                       BURSTS — needles fly outward along every spoke.
//                       Slip between them!
//   Phase 3 ( ≤30%)   — Three gates, four pins, a double stitch wave,
//                       faster spokes. The cloth is half-sewn already.
//   Finale ( ≤10%)    — THE FINAL STITCH (one-shot set-piece): the boss
//                       goes immune and shielded and SEWS while a fabric
//                       weave swallows the arena. On every metronome beat a
//                       colossal needle stabs the ENTIRE screen — only the
//                       glowing EYE of the needle is safe. The eye hops to
//                       a fresh spot every stab; the last one is smaller
//                       and sews the screen shut. THREAD THE EYE! Charge
//                       bar frozen for the whole set-piece (gate in
//                       _egTickPlayer via _egNdFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock,
// so gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//
// DEBUG_SLOW: while true, telegraphs/windups are stretched 2.5× so
// screenshots can catch mid-animation states. Flip to false for ship.
//------------------------------------------------------------------------

const _EG_ND_DEBUG_SLOW = true;
const _EG_ND_DEBUG_MULT = _EG_ND_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_needle: {
        id: 'boss_needle', name: 'The Needle', emoji: '📌',
        baseHP: 1000, baseDamage: 24, chargeMax: 11,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_needle: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.20 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'needle_gates', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechNdNeedleGates' },
            { name: 'pin_drops', intervalBase: 18000, intervalVariance: 4500, handler: '_egMechNdPinDrops' },
            { name: 'stitch_wave', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechNdStitchWave', phase2Only: true },
            { name: 'pincushion_burst', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechNdPincushionBurst', phase2Only: true },
        ],
        onPhaseEnter: _egNdOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_ND_GATE_DMG   = [0, 0.22, 0.26, 0.32];   // gate bar contact
const EG_ND_PIN_DMG    = [0, 0.16, 0.19, 0.22];   // pin landing / planted pin
const EG_ND_STITCH_DMG = [0, 0, 0.17, 0.20];      // stitch wave lane
const EG_ND_PINB_DMG   = [0, 0, 0.18, 0.21];      // pincushion spoke
const EG_ND_STAB_DMG   = 0.12;                    // finale stab clip
const EG_ND_FINAL_DMG  = 0.32;                    // the last stitch
const EG_ND_HIT_CD_MS  = 700;                     // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Needle hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egNdHitCd = 0;
function _egNdTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egNdHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egNdHitCd = now + EG_ND_HIT_CD_MS;
    const dealt = _egNkHit(pct, null, level);
    _egNkAbilityHitToast(dealt, 'The Needle', label);
    return true;
}

// Thread-shred burst where a stitch lands (visual only, body-level so it
// survives the run ending in the same frame).
function _egNdThreadBurst(x, y, big) {
    const layer = document.createElement('div');
    layer.className = 'eg-nd-threads' + (big ? ' eg-nd-threads-big' : '');
    layer.style.left = Math.round(x) + 'px';
    layer.style.top = Math.round(y) + 'px';
    document.body.appendChild(layer);
    const colors = ['#e2e8f0', '#f8fafc', '#cbd5e1', '#fbbf24'];
    for (let i = 0; i < (big ? 11 : 6); i++) {
        const s = document.createElement('div');
        s.className = 'eg-nd-thread';
        s.style.background = colors[i % colors.length];
        const ang = Math.random() * Math.PI * 2;
        const dist = 22 + Math.random() * (big ? 84 : 48);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 24) + 'px');
        s.style.setProperty('--rot', Math.round((Math.random() * 2 - 1) * 500) + 'deg');
        s.style.animationDelay = (Math.random() * 100) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, _EG_ND_DEBUG_SLOW ? 1800 : 900);
}


//------------------------------------------------------------------------
//-------------------MECHANIC: SPIKE GATES----------------------------------
//------------------------------------------------------------------------
// Full-height needle gates peek in at the right edge, then scroll across
// with a single wobbling gap. Thread the gap! Two gates per pass; three at
// the end. Faster every phase.
const EG_ND_GATE_GAP   = [0, 220, 185, 155];
const EG_ND_GATE_SPEED = [0, 150, 185, 225];
const EG_ND_GATE_W     = 34;

function _egMechNdNeedleGates(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const gapH = EG_ND_GATE_GAP[p];
    const speed = EG_ND_GATE_SPEED[p] / _EG_ND_DEBUG_MULT;
    const dmgPct = EG_ND_GATE_DMG[p];
    const gateCount = [0, 2, 2, 3][p];
    const warnMs = 1200 * _EG_ND_DEBUG_MULT;

    const gates = [];
    for (let gi = 0; gi < gateCount; gi++) {
        gates.push({
            x: W + 60 + gi * W * 0.55,
            baseY: [H * 0.35, H * 0.65, H * 0.5][gi],
            phase: gi * 2.1,
            cdUntil: 0, top: null, bot: null,
        });
    }
    gates.forEach(g => {
        g.top = _egNkEl(run, 'div', 'eg-nd-gateseg eg-nd-gateseg-top eg-nd-gate-warn');
        g.bot = _egNkEl(run, 'div', 'eg-nd-gateseg eg-nd-gateseg-bot eg-nd-gate-warn');
    });

    _egNkToast('eg_mech_gates', '📌 The Needle: Spike Gates! Thread the gap!', '#e2e8f0');

    let e = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        if (e >= warnMs) {
            gates.forEach(g => {
                g.top.classList.remove('eg-nd-gate-warn');
                g.bot.classList.remove('eg-nd-gate-warn');
            });
        }
        const pr = _egNkPlayerRect();
        let pending = false;
        gates.forEach(g => {
            if (e >= warnMs) g.x -= speed * dtS;
            if (g.x < -80) {
                g.top.style.display = 'none';
                g.bot.style.display = 'none';
                return;
            }
            pending = true;
            const gapY = Math.max(gapH / 2 + 20, Math.min(H - gapH / 2 - 20,
                g.baseY + Math.sin(e / 1000 * 1.8 + g.phase) * 70));
            const topH = Math.max(0, gapY - gapH / 2);
            const botY = gapY + gapH / 2;
            g.top.style.display = '';
            g.top.style.left = Math.round(g.x - EG_ND_GATE_W / 2) + 'px';
            g.top.style.top = '0px';
            g.top.style.width = EG_ND_GATE_W + 'px';
            g.top.style.height = Math.round(topH) + 'px';
            g.bot.style.display = '';
            g.bot.style.left = Math.round(g.x - EG_ND_GATE_W / 2) + 'px';
            g.bot.style.top = Math.round(botY) + 'px';
            g.bot.style.width = EG_ND_GATE_W + 'px';
            g.bot.style.height = Math.round(Math.max(0, H - botY)) + 'px';
            if (pr && now >= g.cdUntil) {
                const barL = g.x - EG_ND_GATE_W / 2, barR = g.x + EG_ND_GATE_W / 2;
                const hitTop = pr.right > barL && pr.left < barR && pr.top < topH;
                const hitBot = pr.right > barL && pr.left < barR && pr.bottom > botY;
                if (hitTop || hitBot) {
                    g.cdUntil = now + 1000;
                    _egNdTouch(dmgPct, level, 'Spike Gates');
                }
            }
        });
        return pending || e < warnMs;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: PIN DROPS------------------------------------
//------------------------------------------------------------------------
// Giant pins slam down point-first at marked spots (most aimed near you),
// plant themselves as tilted hazards for a while, then dissolve.
const EG_ND_PIN_COUNT = [0, 2, 3, 4];
const EG_ND_PIN_LIFE  = 3500;
const EG_ND_PIN_R     = 36;

function _egMechNdPinDrops(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = EG_ND_PIN_COUNT[p];
    const warnMs = 1100 * _EG_ND_DEBUG_MULT;
    const lifeMs = EG_ND_PIN_LIFE * _EG_ND_DEBUG_MULT;
    const dmgPct = EG_ND_PIN_DMG[p];

    const pins = [];
    let guard = 0;
    const pc0 = _egNkPlayerCenter();
    while (pins.length < count && guard++ < 90) {
        let x, y;
        if (Math.random() < 0.65 && pc0) {
            x = pc0.x + (Math.random() * 2 - 1) * 220;
            y = pc0.y + (Math.random() * 2 - 1) * 220;
        } else {
            x = 90 + Math.random() * Math.max(60, W - 180);
            y = 110 + Math.random() * Math.max(60, H - 220);
        }
        x = Math.max(70, Math.min(W - 70, x));
        y = Math.max(100, Math.min(H - 120, y));
        if (pc0 && Math.hypot(pc0.x - x, pc0.y - y) < 130) continue;
        if (!pins.every(q => Math.hypot(q.x - x, q.y - y) > 180)) continue;
        const warn = _egNkEl(run, 'div', 'eg-nd-pinwarn');
        warn.style.left = Math.round(x - 34) + 'px';
        warn.style.top = Math.round(y - 34) + 'px';
        pins.push({ x, y, warn, el: null, at: warnMs + pins.length * 350 * _EG_ND_DEBUG_MULT, planted: 0, done: false });
    }

    _egNkToast('eg_mech_nd_pins', '📌 The Needle: PIN DROPS — mind the planted pins!', '#e2e8f0');

    let t = 0, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _egNkPlayerRect();
        pins.forEach(pin => {
            if (pin.done) return;
            if (t < pin.at) return;
            if (!pin.el) {
                // Land: the pin falls point-first and plants itself.
                try { pin.warn.remove(); } catch (e) {}
                const el = _egNkEl(run, 'div', 'eg-nd-pin');
                el.style.left = Math.round(pin.x - 9) + 'px';
                el.style.top = Math.round(pin.y - 64 - 300) + 'px';
                el.style.rotate = (Math.random() < 0.5 ? -1 : 1) * 18 + 'deg';
                el.style.transition = 'top 0.3s cubic-bezier(.5,0,1,1)';
                const elRef = el;
                requestAnimationFrame(() => { elRef.style.top = Math.round(pin.y - 64) + 'px'; });
                pin.el = el;
                pin.planted = t + 320 + lifeMs;
                _egNdThreadBurst(pin.x, pin.y, false);
                if (pr && now >= touchCd && _egNkCircleHit(pin.x, pin.y, EG_ND_PIN_R, pr, 0)) {
                    touchCd = now + EG_ND_HIT_CD_MS;
                    _egNdTouch(dmgPct, level, 'Pin Drop');
                }
                return;
            }
            // Planted hazard: the pin's body bites on contact.
            if (now >= touchCd && _egNkCircleHit(pin.x, pin.y - 36, 24, pr, 0)) {
                touchCd = now + EG_ND_HIT_CD_MS;
                _egNdTouch(dmgPct, level, 'Planted Pin');
            }
            if (t >= pin.planted) {
                pin.done = true;
                pin.el.classList.add('eg-nd-pin-dissolve');
                const el = pin.el;
                setTimeout(() => { try { el.remove(); } catch (e) {} }, 460);
            }
        });
        return pins.some(pin => !pin.done);
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: STITCH WAVE (phase 2+)-----------------------
//------------------------------------------------------------------------
// The floor flashes a stitch grid, then needles rise lane by lane in a
// rolling wave — one pass at 60%, two passes (right→left) at 30%. Stand in
// a rising lane and you get stitched.
const EG_ND_WAVE_LANES = 7;
const EG_ND_WAVE_LANE_MS = 950;
const EG_ND_WAVE_GAP_MS = 420;

function _egMechNdStitchWave(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const passes = [0, 0, 1, 2][p];
    const laneMs = EG_ND_WAVE_LANE_MS * _EG_ND_DEBUG_MULT;
    const gapMs = EG_ND_WAVE_GAP_MS * _EG_ND_DEBUG_MULT;
    const warnMs = 1300 * _EG_ND_DEBUG_MULT;
    const dmgPct = EG_ND_STITCH_DMG[p];
    const laneW = W / EG_ND_WAVE_LANES;

    const grid = _egNkEl(run, 'div', 'eg-nd-stitchgrid');
    const lanes = [];
    for (let i = 0; i < EG_ND_WAVE_LANES; i++) {
        const el = _egNkEl(run, 'div', 'eg-nd-stitchlane');
        el.style.left = Math.round(i * laneW) + 'px';
        el.style.width = Math.ceil(laneW) + 'px';
        el.style.height = H + 'px';
        el.style.display = 'none';
        lanes.push(el);
    }

    const events = [];
    for (let pass = 0; pass < passes; pass++) {
        const passStart = warnMs + pass * (EG_ND_WAVE_LANES * gapMs + laneMs + 600);
        for (let i = 0; i < EG_ND_WAVE_LANES; i++) {
            const lane = pass === 0 ? i : (EG_ND_WAVE_LANES - 1 - i);
            events.push({ lane, at: passStart + i * gapMs, fired: false });
        }
    }

    _egNkToast('eg_mech_nd_stitch', '📌 The Needle: STITCH WAVE — stay ahead of the needles!', '#e2e8f0');

    let t = 0, touchCd = 0, gridDown = false;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        if (!gridDown && t >= warnMs) {
            gridDown = true;
            try { grid.remove(); } catch (e) {}
        }
        const pr = _egNkPlayerRect();
        const active = [];
        events.forEach(ev => {
            if (ev.fired || t < ev.at) return;
            ev.fired = true;
            const el = lanes[ev.lane];
            el.style.display = '';
            const id = setTimeout(() => {
                el.style.display = 'none';
            }, laneMs);
            run.timers.push(id);
        });
        if (pr) {
            const px = pr.left + pr.width / 2;
            events.forEach(ev => {
                if (t < ev.at || t > ev.at + laneMs) return;
                if (!active.includes(ev.lane)) active.push(ev.lane);
            });
            const laneIdx = Math.floor(px / laneW);
            if (now >= touchCd && active.includes(laneIdx)) {
                touchCd = now + EG_ND_HIT_CD_MS;
                _egNdTouch(dmgPct, level, 'Stitch Wave');
            }
        }
        const last = events.length ? events[events.length - 1].at + laneMs : warnMs;
        return t < last + 400;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: PINCUSHION BURST (phase 2+)------------------
//------------------------------------------------------------------------
// A pincushion orb drops in, swells — then BURSTS: needles fly outward
// along every spoke. Slip between them!
const EG_ND_CUSHION_SPOKES = 8;

function _egMechNdPincushionBurst(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const speed = [0, 0, 300, 340][p] / _EG_ND_DEBUG_MULT;
    const warnMs = 1500 * _EG_ND_DEBUG_MULT;
    const dmgPct = EG_ND_PINB_DMG[p];

    const c = _egNkPlayerCenter() || { x: W / 2, y: H / 2 };
    const cx = Math.max(180, Math.min(W - 180, c.x + (Math.random() * 2 - 1) * 160));
    const cy = Math.max(180, Math.min(H - 180, c.y + (Math.random() * 2 - 1) * 140));
    const maxR = Math.hypot(W, H) * 0.62;

    const orb = _egNkEl(run, 'div', 'eg-nd-cushion');
    orb.style.left = Math.round(cx - 34) + 'px';
    orb.style.top = Math.round(cy - 34) + 'px';

    _egNkToast('eg_mech_nd_cushion', '📌 The Needle: PINCUSHION BURST — slip between the needles!', '#e2e8f0');

    const spokes = [];
    let t = 0, touchCd = 0, burst = false;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        if (!burst) {
            if (t < warnMs) return true;
            burst = true;
            orb.classList.add('eg-nd-cushion-burst');
            const base = Math.random() * 360;
            for (let k = 0; k < EG_ND_CUSHION_SPOKES; k++) {
                const ang = base + k * (360 / EG_ND_CUSHION_SPOKES) + (Math.random() * 10 - 5);
                const el = _egNkEl(run, 'div', 'eg-nd-spoke');
                spokes.push({ ang, r: 44, el, dead: false });
            }
        }
        const pr = _egNkPlayerRect();
        const rad = Math.PI / 180;
        spokes.forEach(s => {
            if (s.dead) return;
            s.r += speed * dtS;
            if (s.r > maxR) {
                s.dead = true;
                try { s.el.remove(); } catch (e) {}
                return;
            }
            const sx = cx + Math.cos(s.ang * rad) * s.r;
            const sy = cy + Math.sin(s.ang * rad) * s.r;
            s.el.style.transform = 'translate(' + Math.round(sx - 23) + 'px,' + Math.round(sy - 5) + 'px)';
            s.el.style.rotate = s.ang + 'deg';
            if (pr && now >= touchCd && _egNkCircleHit(sx, sy, 20, pr, 0)) {
                touchCd = now + EG_ND_HIT_CD_MS;
                _egNdTouch(dmgPct, level, 'Pincushion Burst');
            }
        });
        if (spokes.every(s => s.dead)) {
            try { orb.remove(); } catch (e) {}
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------🪡… THE FINAL STITCH (≤10% HP one-shot finale)---------
//------------------------------------------------------------------------
// The boss goes immune + shielded and SEWS while a fabric weave swallows
// the arena. On every metronome beat a colossal needle stabs the ENTIRE
// screen — everyone outside the glowing EYE of the needle is stitched. The
// eye hops to a fresh spot every stab; the last one is smaller and sews the
// screen shut. Charge bar frozen for the whole set-piece (gate in
// _egTickPlayer via _egNdFinalActive).
const EG_ND_FINAL_TICK_MS = 1200;
const EG_ND_FINAL_TICKS = 4;
const EG_ND_EYE_R = 150;
const EG_ND_EYE_R_FINAL = 115;

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egNdFinal = null;

function _egNdFinalActive() {
    return !!_egNdFinal && !_egNdFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egNdOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egNdStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egNdStartFinalWatcher(monster) {
    if (!monster || _egNdFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egNdFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egNdFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Mark a fresh eye (safe circle) at a random spot — at least 340px from the
// player so every stab demands a real dash — and poise the giant needle
// above it.
function _egNdMarkEye(g, r) {
    if (g.eyeEl) { try { g.eyeEl.remove(); } catch (e) {} g.eyeEl = null; }
    if (g.needleEl) { try { g.needleEl.remove(); } catch (e) {} g.needleEl = null; }
    const W = window.innerWidth, H = window.innerHeight;
    const m = 160;
    let x = W / 2, y = H / 2, guard = 0;
    do {
        x = m + Math.random() * Math.max(60, W - m * 2);
        y = m + 40 + Math.random() * Math.max(60, H - m * 2 - 80);
        guard++;
    } while (g.lastPlayer && Math.hypot(x - g.lastPlayer.x, y - g.lastPlayer.y) < 340 && guard < 40);
    g.eye = { x, y, r };
    const eyeEl = document.createElement('div');
    eyeEl.className = 'eg-nd-eye';
    eyeEl.style.width = (r * 2) + 'px';
    eyeEl.style.height = (r * 2) + 'px';
    eyeEl.style.left = Math.round(x - r) + 'px';
    eyeEl.style.top = Math.round(y - r) + 'px';
    document.body.appendChild(eyeEl);
    if (g.fxRun) g.fxRun.els.push(eyeEl);
    g.eyeEl = eyeEl;
    // The colossal needle: poised above, its eye-hole aligned with the safe
    // circle (the hole sits 43px from the needle's blunt left end).
    const needle = document.createElement('div');
    needle.className = 'eg-nd-bigneedle';
    needle.style.width = Math.round(W * 0.7) + 'px';
    needle.style.left = Math.round(x - 43) + 'px';
    needle.style.top = '-90px';
    document.body.appendChild(needle);
    if (g.fxRun) g.fxRun.els.push(needle);
    g.needleEl = needle;
}

// One stab: the needle plunges onto the eye; everyone OUTSIDE the eye is
// stitched.
function _egNdStab(g, monster, big) {
    const e = g.eye;
    if (!e || !g.fxRun) return;
    if (g.needleEl) g.needleEl.style.top = Math.round(e.y - 11) + 'px';
    const id = setTimeout(() => {
        _egNdThreadBurst(e.x, e.y, big);
        if (big) {
            document.body.classList.add('eg-nd-flash');
            const fid = setTimeout(() => document.body.classList.remove('eg-nd-flash'), 700);
            g.fxRun.timers.push(fid);
        }
        const pr = _egNkPlayerRect();
        if (pr) {
            const px = pr.left + pr.width / 2, py = pr.top + pr.height / 2;
            if (Math.hypot(px - e.x, py - e.y) > e.r + 12) {
                _egNdTouch(big ? EG_ND_FINAL_DMG : EG_ND_STAB_DMG, monster.level,
                    big ? 'THE FINAL STITCH' : 'Needle Stab');
            }
        }
        if (g.eyeEl) { try { g.eyeEl.remove(); } catch (err) {} g.eyeEl = null; }
        if (g.needleEl) { try { g.needleEl.remove(); } catch (err) {} g.needleEl = null; }
    }, 380);
    g.fxRun.timers.push(id);
}

function _egNdFinalStart(monster) {
    if (_egNdFinal || !monster) return;

    // The cloth goes taut: kill every other run of this boss.
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const g = {
        monsterId: monster.id,
        finished: false,
        count: EG_ND_FINAL_TICKS,
        eye: null,
        eyeEl: null,
        needleEl: null,
        lastPlayer: null,
        fabric: null,
        overlay: null,
        fxRun: null,
        cdTimer: null,
    };
    _egNdFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds needle, eye and cleanup timers.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Fabric weave over the arena.
    const fabric = document.createElement('div');
    fabric.className = 'eg-nd-fabric';
    document.body.appendChild(fabric);
    g.fabric = fabric;
    requestAnimationFrame(() => fabric.classList.add('eg-nd-fabric-on'));

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-nd-cd';
    ov.innerHTML =
        '<div class="eg-nd-cd-label">🪡 THE FINAL STITCH</div>' +
        '<div class="eg-nd-cd-num eg-bmb-cd-pop">' + g.count + '</div>' +
        '<div class="eg-nd-cd-hint">A colossal needle stabs the whole screen — only the EYE is safe!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_nd_final_cd', '🪡💀 THE FINAL STITCH — thread the eye!', '#e2e8f0');

    // Boss immunity so the set-piece reads as a performance (released at the end).
    monster.bossImmune = true;

    // The boss sews, rocking with each stitch.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-nd-threading');
        wrap.classList.add('eg-nk-shielded');
    }

    // First eye right away so beat 1 already has somewhere to run to.
    g.lastPlayer = _egNkPlayerCenter();
    _egNdMarkEye(g, EG_ND_EYE_R);

    // Metronome: each beat the needle stabs the whole screen (everyone
    // outside the eye is stitched), then a fresh eye is marked. The last
    // stab's eye is smaller — and sews the screen shut. Pause / death /
    // inactive hold the count (debug: extra-long beats).
    const cdTick = EG_ND_FINAL_TICK_MS * (_EG_ND_DEBUG_SLOW ? 8 : 1);
    g.cdTimer = setInterval(() => {
        if (!_egNdFinal || _egNdFinal !== g || g.finished) return;
        if (_egNkFrozen()) return;
        const isFinal = g.count <= 1;
        _egNdStab(g, monster, isFinal);
        g.count--;
        if (g.count <= 0) {
            clearInterval(g.cdTimer);
            g.cdTimer = null;
            _egNkToast('eg_mech_nd_final_bang', '🪡💀 SEWN SHUT!', '#e2e8f0');
            const id = setTimeout(() => _egNdFinalEnd(g), _EG_ND_DEBUG_SLOW ? 6000 : 1300);
            g.fxRun.timers.push(id);
            return;
        }
        g.lastPlayer = _egNkPlayerCenter();
        _egNdMarkEye(g, g.count === 1 ? EG_ND_EYE_R_FINAL : EG_ND_EYE_R);
        const num = g.overlay && g.overlay.querySelector('.eg-nd-cd-num');
        if (num) {
            num.textContent = g.count;
            num.classList.remove('eg-bmb-cd-pop');
            void num.offsetWidth;
            num.classList.add('eg-bmb-cd-pop');
        }
    }, cdTick);
}

function _egNdFinalEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.fabric) { try { g.fabric.remove(); } catch (e) {} g.fabric = null; }
    if (g.eyeEl) { try { g.eyeEl.remove(); } catch (e) {} g.eyeEl = null; }
    if (g.needleEl) { try { g.needleEl.remove(); } catch (e) {} g.needleEl = null; }
    if (g.fxRun) { try { _egNkKillRun(g.fxRun); } catch (e) {} g.fxRun = null; }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    document.body.classList.remove('eg-nd-flash');
    document.querySelectorAll('.eg-nd-threading').forEach(el => el.classList.remove('eg-nd-threading'));

    const m = (g.monsterId && typeof _egMonsters !== 'undefined')
        ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _egBossScheduleMechanics === 'function') {
            try { _egBossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
    }
    if (_egNdFinal === g) _egNdFinal = null;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body class this boss ever created.
function _egNdTeardown() {
    if (_egNdFinal) { try { _egNdFinalEnd(_egNdFinal); } catch (e) {} _egNdFinal = null; }
    document.querySelectorAll('.eg-nd-gateseg, .eg-nd-pinwarn, .eg-nd-pin, .eg-nd-stitchgrid, ' +
        '.eg-nd-stitchlane, .eg-nd-cushion, .eg-nd-spoke, .eg-nd-eye, .eg-nd-bigneedle, ' +
        '.eg-nd-fabric, .eg-nd-cd, .eg-nd-threads').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.body.classList.remove('eg-nd-flash');
    document.querySelectorAll('.eg-nd-threading').forEach(el => el.classList.remove('eg-nd-threading'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_ND_DEBUG.fire('gates'|'pins'|'stitch'|'cushion') — runs one now
//   _EG_ND_DEBUG.final()                                 — FINAL STITCH now
if (typeof window !== 'undefined') {
    window._EG_ND_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_needle') : null;
            if (!monster) return 'no needle alive';
            const fn = name === 'gates' ? _egMechNdNeedleGates
                : name === 'pins' ? _egMechNdPinDrops
                : name === 'stitch' ? _egMechNdStitchWave
                : name === 'cushion' ? _egMechNdPincushionBurst : null;
            if (!fn) return 'unknown: ' + name;
            if (_egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_needle') : null;
            if (!monster) return 'no needle alive';
            _egNdFinalStart(monster);
            return 'THE FINAL STITCH started';
        },
    };
}
