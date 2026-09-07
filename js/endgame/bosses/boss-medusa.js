//------------------------------------------------------------------------
//-------------------BOSS: THE MEDUSA (boss_medusa)-----------------------
//------------------------------------------------------------------------
// REWORK — gorgon homage, rebuilt as a full petrification gauntlet. The
// Medusa turns the whole arena into her statue garden: a raking stone gaze
// from above, snake heads erupting from the floor on a rhythm, rings of
// creeping petrification with a single rotating gap, and a living coil that
// closes around you — then, at the very end, she casts THE STARE and only
// the shadows of her own statues can shelter you.
//
//   Phase 1 (100–60%) — STONE GAZE. The gorgon's eyes scan from above and
//                       drag a vertical gaze beam across the arena. Caught
//                       in the beam = stung. Two passes per cast, faster
//                       and wider every phase.
//                       Plus SNAKE STRIKES. Marked floor spots erupt into
//                       snake heads that bite on a rhythm — leave the bite
//                       circles!
//   Phase 2 ( ≤60%)   — PETRIFY WAVES. Stone-gray rings expand from near
//                       your position with one rotating safe gap. Slip the
//                       gap or be caught by the creeping stone.
//                       Plus COIL CAGE. A snake coil forms around you and
//                       SHRINKS while its gap slowly rotates — escape
//                       through the gap before it closes on you.
//   Phase 3 ( ≤30%)   — Everything faster: wider gaze, more snakes, twin
//                       waves, tighter coils. The garden fills.
//   Finale ( ≤10%)    — THE STARE (one-shot set-piece): the boss goes
//                       immune and shielded and SWAYS while the arena tints
//                       serpent-green and giant eyes open at the top. On
//                       every metronome beat a stone statue rises — and
//                       every statue casts a SHADOW strip. 3…2…1 — THE
//                       STARE: a screen-wide gaze wall sweeps from top to
//                       bottom and everything it touches turns to stone…
//                       EXCEPT the shadows behind the statues. SHELTER!
//                       Charge bar frozen for the whole set-piece (gate in
//                       _egTickPlayer via _egMdFinalActive).
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

const _EG_MD_DEBUG_SLOW = true;
const _EG_MD_DEBUG_MULT = _EG_MD_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_medusa: {
        id: 'boss_medusa', name: 'The Medusa', emoji: '🪼',
        baseHP: 1000, baseDamage: 22, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_medusa: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'stone_gaze', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechMdStoneGaze' },
            { name: 'snake_strikes', intervalBase: 18000, intervalVariance: 4500, handler: '_egMechMdSnakeStrikes' },
            { name: 'petrify_waves', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechMdPetrifyWaves', phase2Only: true },
            { name: 'coil_cage', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechMdCoilCage', phase2Only: true },
        ],
        onPhaseEnter: _egMdOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_MD_GAZE_DMG    = [0, 0.15, 0.18, 0.21];   // gaze beam contact
const EG_MD_SNAKE_DMG   = [0, 0.13, 0.16, 0.19];   // snake strike bite
const EG_MD_WAVE_DMG    = [0, 0, 0.19, 0.22];      // petrify wave ring
const EG_MD_COIL_DMG    = [0, 0, 0.14, 0.17];      // coil segment touch
const EG_MD_STARE_DMG   = 0.32;                    // THE STARE full hit
const EG_MD_HIT_CD_MS   = 700;                     // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Medusa hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egMdHitCd = 0;
function _egMdTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egMdHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egMdHitCd = now + EG_MD_HIT_CD_MS;
    const dealt = _egNkHit(pct, null, level);
    _egNkAbilityHitToast(dealt, 'The Medusa', label);
    return true;
}

// The gorgon's eyes: a pair of glowing serpent eyes, positioned via
// transform, colour-coded by use (mechanic vs finale).
function _egMdEyesEl(run, big) {
    const el = _egNkEl(run, 'div', 'eg-md-eyes' + (big ? ' eg-md-eyes-big' : ''));
    return el;
}

// Stone-shard burst where petrification lands (visual only, body-level so
// it survives the run ending in the same frame).
function _egMdShards(x, y, big) {
    const layer = document.createElement('div');
    layer.className = 'eg-md-shards' + (big ? ' eg-md-shards-big' : '');
    layer.style.left = Math.round(x) + 'px';
    layer.style.top = Math.round(y) + 'px';
    document.body.appendChild(layer);
    for (let i = 0; i < (big ? 10 : 6); i++) {
        const s = document.createElement('div');
        s.className = 'eg-md-shard';
        const ang = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * (big ? 80 : 46);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 24) + 'px');
        s.style.setProperty('--rot', Math.round((Math.random() * 2 - 1) * 400) + 'deg');
        s.style.animationDelay = (Math.random() * 100) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, _EG_MD_DEBUG_SLOW ? 1800 : 900);
}


//------------------------------------------------------------------------
//-------------------MECHANIC: STONE GAZE-----------------------------------
//------------------------------------------------------------------------
// The gorgon's eyes scan from above, dragging a vertical gaze beam across
// the arena. Two passes per cast (it bounces at the far edge once), faster
// and wider every phase. Step out of the beam!
const EG_MD_GAZE_W     = [0, 60, 74, 90];
const EG_MD_GAZE_SPEED = [0, 260, 320, 390];

function _egMechMdStoneGaze(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth;
    const beamW = EG_MD_GAZE_W[p];
    const speed = EG_MD_GAZE_SPEED[p] / _EG_MD_DEBUG_MULT;
    const warnMs = 1300 * _EG_MD_DEBUG_MULT;
    const dmgPct = EG_MD_GAZE_DMG[p];

    const eyes = _egMdEyesEl(run, false);
    const beam = _egNkEl(run, 'div', 'eg-md-gazebeam eg-md-gaze-warn');
    beam.style.width = beamW + 'px';
    const fromLeft = Math.random() < 0.5;
    let x = fromLeft ? -beamW : W;
    let dir = fromLeft ? 1 : -1;

    _egNkToast('eg_mech_md_gaze', '🐍 The Medusa: STONE GAZE — out of the beam!', '#c4b5fd');

    let t = 0, touchCd = 0, sweeps = 0, live = false;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        if (t < warnMs) {
            // Windup: the eyes peer in from the start edge, beam still dim.
            eyes.style.transform = 'translate(' + Math.round(x - 45) + 'px, 0px)';
            return true;
        }
        if (!live) {
            live = true;
            beam.classList.remove('eg-md-gaze-warn');
        }
        x += dir * speed * dtS;
        if (x > W) { x = W; dir = -1; sweeps++; }
        if (x < -beamW) { x = -beamW; dir = 1; sweeps++; }
        beam.style.left = Math.round(x) + 'px';
        eyes.style.transform = 'translate(' + Math.round(x - 45) + 'px, 0px)';
        const pr = _egNkPlayerRect();
        if (pr && now >= touchCd && pr.right > x + 8 && pr.left < x + beamW - 8) {
            touchCd = now + EG_MD_HIT_CD_MS;
            _egMdTouch(dmgPct, level, 'Stone Gaze');
        }
        return sweeps < 2;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: SNAKE STRIKES--------------------------------
//------------------------------------------------------------------------
// Marked floor spots erupt into snake heads that bite on a rhythm — three
// bites each, slightly staggered across the brood — then sink away. Leave
// the bite circles!
const EG_MD_SNAKE_COUNT = [0, 3, 4, 5];
const EG_MD_SNAKE_BITES = 3;
const EG_MD_BITE_R      = 64;

function _egMechMdSnakeStrikes(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = EG_MD_SNAKE_COUNT[p];
    const warnMs = 1400 * _EG_MD_DEBUG_MULT;
    const riseMs = 500 * _EG_MD_DEBUG_MULT;
    const biteGap = [0, 950, 850, 750][p] * _EG_MD_DEBUG_MULT;
    const dmgPct = EG_MD_SNAKE_DMG[p];

    const spots = [];
    let guard = 0;
    const pc0 = _egNkPlayerCenter();
    while (spots.length < count && guard++ < 90) {
        const x = 100 + Math.random() * Math.max(60, W - 200);
        const y = 130 + Math.random() * Math.max(60, H - 270);
        if (pc0 && Math.hypot(pc0.x - x, pc0.y - y) < 140) continue;
        if (!spots.every(s => Math.hypot(s.x - x, s.y - y) > 190)) continue;
        const warn = _egNkEl(run, 'div', 'eg-md-snake-warn');
        warn.style.left = Math.round(x - 64) + 'px';
        warn.style.top = Math.round(y - 64) + 'px';
        const el = _egNkEl(run, 'div', 'eg-md-snake');
        el.style.left = Math.round(x - 27) + 'px';
        el.style.top = Math.round(y - 27) + 'px';
        el.style.display = 'none';
        spots.push({ x, y, warn, el, risen: false, bites: 0, done: false });
    }

    _egNkToast('eg_mech_md_snakes', '🐍 The Medusa: SNAKE STRIKES — watch the floor!', '#c4b5fd');

    let t = 0, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        spots.forEach(s => {
            if (s.done) return;
            if (!s.risen) {
                if (t < warnMs) return;
                s.risen = true;
                try { s.warn.remove(); } catch (e) {}
                s.el.style.display = '';
            }
            while (s.bites < EG_MD_SNAKE_BITES && t >= warnMs + riseMs + s.bites * biteGap) {
                s.bites++;
                const bite = _egNkEl(run, 'div', 'eg-md-bite');
                bite.style.left = Math.round(s.x) + 'px';
                bite.style.top = Math.round(s.y) + 'px';
                const bel = bite;
                const bid = setTimeout(() => { try { bel.remove(); } catch (e) {} }, 550);
                run.timers.push(bid);
                _egMdShards(s.x, s.y, false);
                const c = _egNkPlayerCenter();
                if (c && now >= touchCd && Math.hypot(c.x - s.x, c.y - s.y) <= EG_MD_BITE_R + 12) {
                    touchCd = now + EG_MD_HIT_CD_MS;
                    _egMdTouch(dmgPct, level, 'Snake Strike');
                }
            }
            if (s.bites >= EG_MD_SNAKE_BITES && t >= warnMs + riseMs + EG_MD_SNAKE_BITES * biteGap + 200) {
                s.done = true;
                s.el.classList.add('eg-md-snake-sink');
                const el = s.el;
                setTimeout(() => { try { el.remove(); } catch (e) {} }, 460);
            }
        });
        return spots.some(s => !s.done);
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: PETRIFY WAVES (phase 2+)---------------------
//------------------------------------------------------------------------
// Stone-gray rings expand from points near the player with ONE rotating
// safe gap arc. Slip the gap as the ring crosses you — caught by the ring
// band anywhere else and the creeping stone bites.
const EG_MD_WAVE_COUNT = [0, 0, 1, 2];
const EG_MD_WAVE_SPEED = [0, 0, 300, 335];
const EG_MD_WAVE_GAP   = 54;    // safe arc width, degrees
const EG_MD_WAVE_ROT   = 42;    // gap rotation speed, deg/s

function _egMechMdPetrifyWaves(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = EG_MD_WAVE_COUNT[p];
    const speed = EG_MD_WAVE_SPEED[p] / _EG_MD_DEBUG_MULT;
    const maxR = Math.hypot(W, H) * 0.62;
    const dmgPct = EG_MD_WAVE_DMG[p];

    const waves = [];
    for (let i = 0; i < count; i++) {
        const c = _egNkPlayerCenter() || { x: W / 2, y: H / 2 };
        const ex = Math.max(120, Math.min(W - 120, c.x + (Math.random() * 2 - 1) * 260));
        const ey = Math.max(120, Math.min(H - 120, c.y + (Math.random() * 2 - 1) * 220));
        const el = _egNkEl(run, 'div', 'eg-md-wave');
        el.style.left = Math.round(ex) + 'px';
        el.style.top = Math.round(ey) + 'px';
        waves.push({ x: ex, y: ey, r: 30, gap: Math.random() * 360, rot: (Math.random() < 0.5 ? -1 : 1) * EG_MD_WAVE_ROT, t: -i * 800 * _EG_MD_DEBUG_MULT, el, done: false, hit: false });
    }

    _egNkToast('eg_mech_md_waves', '🐍 The Medusa: PETRIFY WAVES — slip the gap!', '#c4b5fd');

    let touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        let pending = false;
        const pc = _egNkPlayerCenter();
        waves.forEach(w => {
            if (w.done) return;
            w.t += dtS * 1000;
            if (w.t < 0) { pending = true; return; }
            w.r += speed * dtS;
            w.gap += w.rot * dtS;
            if (w.r >= maxR) {
                w.done = true;
                try { w.el.remove(); } catch (e) {}
                return;
            }
            pending = true;
            w.el.style.width = Math.round(w.r * 2) + 'px';
            w.el.style.height = Math.round(w.r * 2) + 'px';
            w.el.style.setProperty('--gap', w.gap.toFixed(1) + 'deg');
            // Hit: player centre inside the crossing band, outside the gap arc.
            if (pc && !w.hit && now >= touchCd) {
                const d = Math.hypot(pc.x - w.x, pc.y - w.y);
                if (Math.abs(d - w.r) <= 16) {
                    w.hit = true;
                    const ang = Math.atan2(pc.y - w.y, pc.x - w.x) * 180 / Math.PI;
                    const rel = ((ang - w.gap) % 360 + 360) % 360;
                    if (rel > EG_MD_WAVE_GAP) {
                        touchCd = now + EG_MD_HIT_CD_MS;
                        if (_egMdTouch(dmgPct, level, 'Petrify Wave')) {
                            document.body.classList.add('eg-md-stoneflash');
                            const id = setTimeout(() => document.body.classList.remove('eg-md-stoneflash'), 600);
                            run.timers.push(id);
                        }
                    }
                }
            }
        });
        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: COIL CAGE (field, passive)-------------------
//------------------------------------------------------------------------
// A snake coil forms around the player's position and SHRINKS while its
// single gap slowly rotates. Escape through the gap — every segment bites.
// The run is PASSIVE (field hazard — never blocks other mechanics).
const EG_MD_COIL_SEGS  = 10;
const EG_MD_COIL_R0    = 230;
const EG_MD_COIL_R1    = 80;
const EG_MD_COIL_LIFE  = 6500;
const EG_MD_COIL_ROT   = 34;    // deg/s
const EG_MD_COIL_GAP   = 72;    // gap arc, degrees (2 segments wide)

function _egMechMdCoilCage(monster, phase) {
    if (_egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    run.passive = true;
    const W = window.innerWidth, H = window.innerHeight;
    const lifeMs = EG_MD_COIL_LIFE * _EG_MD_DEBUG_MULT;
    const warnMs = 1200 * _EG_MD_DEBUG_MULT;
    const dmgPct = EG_MD_COIL_DMG[p];

    const c = _egNkPlayerCenter() || { x: W / 2, y: H / 2 };
    const cx = Math.max(240, Math.min(W - 240, c.x));
    const cy = Math.max(220, Math.min(H - 220, c.y));

    const warn = _egNkEl(run, 'div', 'eg-md-coil-warn');
    warn.style.left = Math.round(cx) + 'px';
    warn.style.top = Math.round(cy) + 'px';
    warn.style.width = (EG_MD_COIL_R0 * 2) + 'px';
    warn.style.height = (EG_MD_COIL_R0 * 2) + 'px';

    _egNkToast('eg_mech_md_coil', '🐍 The Medusa: COIL CAGE — escape through the gap!', '#c4b5fd');

    const segs = [];
    for (let i = 0; i < EG_MD_COIL_SEGS; i++) {
        const el = _egNkEl(run, 'div', 'eg-md-coil-seg');
        el.style.display = 'none';
        segs.push({ el });
    }

    let t = 0, touchCd = 0, formed = false;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        if (t < warnMs) return true;
        if (!formed) {
            formed = true;
            try { warn.remove(); } catch (e) {}
            segs.forEach(s => { s.el.style.display = ''; });
        }
        const f = Math.min(1, (t - warnMs) / lifeMs);
        const r = EG_MD_COIL_R0 + (EG_MD_COIL_R1 - EG_MD_COIL_R0) * f;
        const gapA = (t / 1000 * EG_MD_COIL_ROT) % 360;
        const pr = _egNkPlayerRect();
        segs.forEach((s, i) => {
            const segAngle = i * (360 / EG_MD_COIL_SEGS);
            const rel = ((segAngle - gapA) % 360 + 360) % 360;
            if (rel < EG_MD_COIL_GAP) {
                s.el.style.display = 'none';
                return;
            }
            s.el.style.display = '';
            const a = segAngle * Math.PI / 180;
            const sx = cx + Math.cos(a) * r;
            const sy = cy + Math.sin(a) * r;
            s.el.style.left = Math.round(sx - 32) + 'px';
            s.el.style.top = Math.round(sy - 11) + 'px';
            s.el.style.rotate = (segAngle + 90) + 'deg';
            if (pr && now >= touchCd && _egNkCircleHit(sx, sy, 30, pr, 0)) {
                touchCd = now + EG_MD_HIT_CD_MS;
                _egMdTouch(dmgPct, level, 'Coil Cage');
            }
        });
        if (f >= 1) {
            segs.forEach(s => {
                s.el.classList.add('eg-md-crumble');
                const el = s.el;
                setTimeout(() => { try { el.remove(); } catch (e) {} }, 460);
            });
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------🐍… THE STARE (≤10% HP one-shot finale)----------------
//------------------------------------------------------------------------
// The boss goes immune + shielded and SWAYS while the arena tints
// serpent-green and giant eyes open at the top. On every metronome beat a
// stone statue rises — each statue casts a SHADOW strip. At zero: THE
// STARE — a screen-wide gaze wall sweeps from top to bottom and everything
// it touches petrifies… except the shadows behind the statues. Charge bar
// frozen for the whole set-piece (gate in _egTickPlayer via
// _egMdFinalActive).
const EG_MD_FINAL_TICK_MS = 1200;
const EG_MD_FINAL_TICKS = 3;
const EG_MD_SHADOW_H = 150;

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egMdFinal = null;

function _egMdFinalActive() {
    return !!_egMdFinal && !_egMdFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egMdOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egMdStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egMdStartFinalWatcher(monster) {
    if (!monster || _egMdFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egMdFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egMdFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// One statue + its shadow strip rise at a fresh spot.
function _egMdRaiseStatue(g) {
    const W = window.innerWidth, H = window.innerHeight;
    let x = W / 2, y = H / 2, guard = 0;
    do {
        x = 110 + Math.random() * Math.max(60, W - 220);
        y = 120 + Math.random() * Math.max(60, H - 440);
        guard++;
    } while (!g.statues.every(s => Math.abs(s.x - x) > 170) && guard < 40);
    const el = document.createElement('div');
    el.className = 'eg-md-statue eg-md-statue-warn';
    el.style.left = Math.round(x - 45) + 'px';
    el.style.top = Math.round(y) + 'px';
    document.body.appendChild(el);
    g.fxRun.els.push(el);
    requestAnimationFrame(() => el.classList.remove('eg-md-statue-warn'));
    const sh = document.createElement('div');
    sh.className = 'eg-md-shadow';
    sh.style.left = Math.round(x - 52) + 'px';
    sh.style.top = Math.round(y + 64) + 'px';
    sh.style.width = '104px';
    sh.style.height = EG_MD_SHADOW_H + 'px';
    document.body.appendChild(sh);
    g.fxRun.els.push(sh);
    g.statues.push({ x, y, el, sh });
}

function _egMdFinalStart(monster) {
    if (_egMdFinal || !monster) return;

    // The garden goes quiet: kill every other run of this boss.
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const g = {
        monsterId: monster.id,
        finished: false,
        count: EG_MD_FINAL_TICKS,
        statues: [],
        tint: null,
        eyes: null,
        overlay: null,
        gazeEl: null,
        gazeY: -9999,
        hitRolled: false,
        fxRun: null,
        cdTimer: null,
    };
    _egMdFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // Serpent tint over the arena.
    const tint = document.createElement('div');
    tint.className = 'eg-md-tint';
    document.body.appendChild(tint);
    g.tint = tint;
    requestAnimationFrame(() => tint.classList.add('eg-md-tint-on'));

    // FX run (passive): holds statue/shadow/gaze elements and the sweep loop.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // The gorgon's giant eyes open at the top of the screen.
    const eyes = _egMdEyesEl(g.fxRun, true);
    g.eyes = eyes;
    eyes.style.left = Math.round(window.innerWidth / 2 - 45) + 'px';

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-md-cd';
    ov.innerHTML =
        '<div class="eg-md-cd-label">🐍 THE STARE</div>' +
        '<div class="eg-md-cd-num eg-bmb-cd-pop">' + g.count + '</div>' +
        '<div class="eg-md-cd-hint">Statues cast safe shadows — get BEHIND one before the gaze sweeps!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_md_final_cd', '🐍💀 THE STARE — shelter behind a statue!', '#e2e8f0');

    // Boss immunity so the set-piece reads as a performance (released at the end).
    monster.bossImmune = true;

    // The boss sways, weaving her spell.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-md-charming');
        wrap.classList.add('eg-nk-shielded');
    }

    // Metronome: each beat raises one statue (+ its shadow). At zero, the
    // gaze sweeps. Pause / death / inactive hold the count (debug: long beats).
    const cdTick = EG_MD_FINAL_TICK_MS * (_EG_MD_DEBUG_SLOW ? 8 : 1);
    g.cdTimer = setInterval(() => {
        if (!_egMdFinal || _egMdFinal !== g || g.finished) return;
        if (_egNkFrozen()) return;
        _egMdRaiseStatue(g);
        g.count--;
        const num = g.overlay && g.overlay.querySelector('.eg-md-cd-num');
        if (num) {
            num.textContent = g.count;
            num.classList.remove('eg-bmb-cd-pop');
            void num.offsetWidth;
            num.classList.add('eg-bmb-cd-pop');
        }
        if (g.count <= 0) {
            clearInterval(g.cdTimer);
            g.cdTimer = null;
            try { g.overlay.remove(); } catch (e) {}
            g.overlay = null;
            _egMdStartGazeSweep(g, monster);
        }
    }, cdTick);
}

// THE STARE: a screen-wide gaze wall sweeps from the top to the bottom of
// the arena. Everything it touches petrifies — except the shadows behind
// the statues.
function _egMdStartGazeSweep(g, monster) {
    const level = monster ? monster.level : 1;

    _egNkToast('eg_mech_md_final_bang', '🐍💀 THE STARE!', '#e2e8f0');
    document.body.classList.add('eg-md-flash');
    const fid = setTimeout(() => document.body.classList.remove('eg-md-flash'), 700);
    g.fxRun.timers.push(fid);

    const gz = document.createElement('div');
    gz.className = 'eg-md-gazewall';
    document.body.appendChild(gz);
    g.gazeEl = gz;
    g.fxRun.els.push(gz);

    const sweepMs = 2400 * _EG_MD_DEBUG_MULT;
    let t = 0;
    _egNkLoop(g.fxRun, (dtS) => {
        t += dtS * 1000;
        const f = Math.min(1, t / sweepMs);
        g.gazeY = -130 + f * (window.innerHeight + 260);
        gz.style.top = Math.round(g.gazeY) + 'px';
        const pr = _egNkPlayerRect();
        if (pr && !g.hitRolled && pr.bottom > g.gazeY && pr.top < g.gazeY + 120) {
            g.hitRolled = true;
            const px = pr.left + pr.width / 2, py = pr.top + pr.height / 2;
            const inShadow = g.statues.some(s =>
                px > s.x - 52 && px < s.x + 52 && py > s.y + 56 && py < s.y + 64 + EG_MD_SHADOW_H);
            if (!inShadow) {
                _egMdTouch(EG_MD_STARE_DMG, level, 'THE STARE');
            }
        }
        return f < 1;
    });

    // Linger so the swept garden can be seen (debug: extra long), then
    // lights up and hand control back to the boss.
    const id2 = setTimeout(() => _egMdFinalEnd(g), _EG_MD_DEBUG_SLOW ? 7000 : 1600);
    g.fxRun.timers.push(id2);
}

function _egMdFinalEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.tint) { try { g.tint.remove(); } catch (e) {} g.tint = null; }
    if (g.eyes) { try { g.eyes.remove(); } catch (e) {} g.eyes = null; }
    if (g.gazeEl) { try { g.gazeEl.remove(); } catch (e) {} g.gazeEl = null; }
    if (g.fxRun) { try { _egNkKillRun(g.fxRun); } catch (e) {} g.fxRun = null; }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    document.body.classList.remove('eg-md-flash');
    document.body.classList.remove('eg-md-stoneflash');
    document.querySelectorAll('.eg-md-charming').forEach(el => el.classList.remove('eg-md-charming'));

    const m = (g.monsterId && typeof _egMonsters !== 'undefined')
        ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _egBossScheduleMechanics === 'function') {
            try { _egBossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
    }
    if (_egMdFinal === g) _egMdFinal = null;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body class this boss ever created.
function _egMdTeardown() {
    if (_egMdFinal) { try { _egMdFinalEnd(_egMdFinal); } catch (e) {} _egMdFinal = null; }
    document.querySelectorAll('.eg-md-eyes, .eg-md-gazebeam, .eg-md-snake, .eg-md-snake-warn, ' +
        '.eg-md-bite, .eg-md-wave, .eg-md-coil-seg, .eg-md-coil-warn, .eg-md-statue, ' +
        '.eg-md-shadow, .eg-md-gazewall, .eg-md-tint, .eg-md-cd, .eg-md-shards').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.body.classList.remove('eg-md-flash');
    document.body.classList.remove('eg-md-stoneflash');
    document.querySelectorAll('.eg-md-charming').forEach(el => el.classList.remove('eg-md-charming'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_MD_DEBUG.fire('gaze'|'snakes'|'waves'|'coil') — runs one now
//   _EG_MD_DEBUG.final()                              — THE STARE now
if (typeof window !== 'undefined') {
    window._EG_MD_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_medusa') : null;
            if (!monster) return 'no medusa alive';
            const fn = name === 'gaze' ? _egMechMdStoneGaze
                : name === 'snakes' ? _egMechMdSnakeStrikes
                : name === 'waves' ? _egMechMdPetrifyWaves
                : name === 'coil' ? _egMechMdCoilCage : null;
            if (!fn) return 'unknown: ' + name;
            if ((name === 'gaze' || name === 'snakes' || name === 'waves') && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_medusa') : null;
            if (!monster) return 'no medusa alive';
            _egMdFinalStart(monster);
            return 'THE STARE started';
        },
    };
}
