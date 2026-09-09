//------------------------------------------------------------------------
//-------------------BOSS: THE GRIDLOCK (boss_gridlock)--------------------
//------------------------------------------------------------------------
// REWORK — Quick-Man homage, rebuilt as a living circuit board. The
// Gridlock never chases: it turns the arena itself into a machine that
// computes where you are and denies the space you want to stand in.
// Nothing stays live long, but everything cycles — reading the patterns
// while staying mobile is the fight.
//
//   Phase 1 (100–60%) — LASER LATTICE (signature, upgraded). Alternating
//                       full-screen H/V beam waves — now each wave's lines
//                       STAGGER-FIRE across the screen (~260ms apart), so
//                       a wave sweeps rather than pops. Clear the lit
//                       lanes before their line's turn comes!
//                       Plus PROBABILITY SHIFT (shared).
//   Phase 2 ( ≤60%)   — SIGNAL SCRAMBLE. The boss plants signal towers and
//                       every one draws a dashed cable to YOUR position —
//                       then all fire together. Break the geometry: the
//                       starburst aims at where you were.
//                       Plus SURGE CHASER. A roaming ⚡ orb homes slowly
//                       and sheds a LIVE CABLE TRAIL behind it — the arena
//                       accumulates hot wires while you kite.
//   Phase 3 ( ≤30%)   — Everything faster: 4 lattice waves, 6 towers, TWO
//                       surge orbs. The gates will not hold much longer.
//   Finale ( ≤10%)    — SYSTEM LOCKDOWN (one-shot set-piece): a circuit-
//                       board overlay floods the screen and the arena
//                       becomes a live wire grid. Three beats of charging
//                       wire batches — then THE JAM: every wire fires at
//                       once EXCEPT one horizontal + one vertical, whose
//                       intersection is the only safe cell. Then the
//                       SURGE DIVE: a ⚡ orb dives the safe cell — step off
//                       it, then the lockdown breaks. Charge bar frozen
//                       for the whole set-piece (gate in _egTickPlayer
//                       via _egGlFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock,
// so gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (probability_shift) live in shared-boss-abilities.js
// and are referenced by handler-name string.
//
// DEBUG_SLOW: while true, telegraphs/windups are stretched 2.5× so
// screenshots can catch mid-animation states. Flip to false for ship.
//------------------------------------------------------------------------

const _EG_GL_DEBUG_SLOW = true;
const _EG_GL_DEBUG_MULT = _EG_GL_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_gridlock: {
        id: 'boss_gridlock', name: 'The Gridlock', emoji: '📡',
        baseHP: 1020, baseDamage: 23, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_gridlock: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.45 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 1.90 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'laser_lattice', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechGlLattice' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
            { name: 'signal_scramble', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechGlScramble', phase2Only: true },
            { name: 'surge_chaser', intervalBase: 24000, intervalVariance: 6000, handler: '_egMechGlSurge', phase2Only: true },
        ],
        onPhaseEnter: _egGlOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_GL_LATTICE_WAVES = [0, 2, 3, 4];      // waves per cast, per phase
const EG_GL_LATTICE_DMG   = [0, 0.12, 0.14, 0.17]; // %maxHP per live beam
const EG_GL_LATTICE_STAGGER = 260;             // ms between a wave's lines firing
const EG_GL_TOWER_COUNT   = [0, 4, 5, 6];      // signal towers per cast
const EG_GL_TOWER_DMG     = [0, 0.10, 0.12, 0.14]; // %maxHP per cable
const EG_GL_ORB_SPEED     = 150;               // px/s surge-orb seek speed
const EG_GL_ORB_DMG       = [0, 0, 0.11, 0.13];// %maxHP orb contact
const EG_GL_TRAIL_DMG     = 0.09;              // %maxHP live-trail contact
const EG_GL_TRAIL_LIFE    = 1200;              // ms a trail segment stays hot
const EG_GL_WIRE_DMG      = 0.10;              // %maxHP beat wire contact
const EG_GL_JAM_DMG       = 0.14;              // %maxHP JAM wire contact
const EG_GL_SURGE_DMG     = 0.30;              // %maxHP the surge dive
const EG_GL_HIT_CD_MS     = 700;               // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Gridlock hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egGlHitCd = 0;
function _egGlTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egGlHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egGlHitCd = now + EG_GL_HIT_CD_MS;
    const dealt = _egNkHit(pct, 'lightning', level);
    _egNkAbilityHitToast(dealt, 'The Gridlock', label);
    return true;
}

// Electric spark burst where a beam/cable/orb event lands (visual only,
// body-level so it survives the run ending in the same frame).
function _egGlSpark(x, y, big) {
    const layer = document.createElement('div');
    layer.className = 'eg-gl-sparks' + (big ? ' eg-gl-sparks-big' : '');
    layer.style.left = Math.round(x) + 'px';
    layer.style.top = Math.round(y) + 'px';
    document.body.appendChild(layer);
    for (let i = 0; i < (big ? 11 : 6); i++) {
        const s = document.createElement('div');
        s.className = 'eg-gl-bolt';
        const ang = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * (big ? 80 : 44);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 22) + 'px');
        s.style.animationDelay = (Math.random() * 90) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, _EG_GL_DEBUG_SLOW ? 1800 : 900);
}

// Point-to-segment distance (px) — hit-tests cables and trails.
function _egGlDistToSeg(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2)) : 0;
    return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
}


//------------------------------------------------------------------------
//-------------------MECHANIC: LASER LATTICE (signature, upgraded)----------
//------------------------------------------------------------------------
// Alternating full-screen H/V beam waves. Upgraded: a wave's three lines
// STAGGER-FIRE ~260ms apart, so each wave sweeps across the screen instead
// of popping all at once — clear the lit lane whose turn is coming, and
// mind the NEXT line while the first is still hot.
function _egMechGlLattice(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const waves = EG_GL_LATTICE_WAVES[p];
    const warnMs = 900 * _EG_GL_DEBUG_MULT;
    const activeMs = 500 * _EG_GL_DEBUG_MULT;
    const gapMs = 800 * _EG_GL_DEBUG_MULT;
    const stagger = EG_GL_LATTICE_STAGGER * _EG_GL_DEBUG_MULT;
    const thick = 14;
    const dmgPct = EG_GL_LATTICE_DMG[p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    let axis = Math.random() < 0.5 ? 'h' : 'v';
    const mkWave = () => {
        axis = axis === 'h' ? 'v' : 'h';
        const lines = [];
        for (let i = 0; i < 3; i++) {
            const el = _egNkEl(run, 'div', 'eg-nk-lattice-warn ' + (axis === 'h' ? 'eg-nk-lattice-h' : 'eg-nk-lattice-v'));
            let pos;
            if (axis === 'h') {
                pos = H * (0.2 + 0.3 * i) + (Math.random() * 80 - 40);
                pos = Math.max(30, Math.min(H - 30, pos));
                el.style.top = Math.round(pos - thick / 2) + 'px';
                el.style.height = thick + 'px';
            } else {
                pos = W * (0.2 + 0.3 * i) + (Math.random() * 80 - 40);
                pos = Math.max(30, Math.min(W - 30, pos));
                el.style.left = Math.round(pos - thick / 2) + 'px';
                el.style.width = thick + 'px';
            }
            // Each line carries its OWN fire moment: the stagger turns the
            // wave into a sweep. `pos-order` alternates so the sweep bounces
            // instead of always top→bottom.
            const ordered = (i % 2 === 0) ? i : (2 - i);
            lines.push({ axis, pos, el, hitDone: false, fireAt: warnMs + ordered * stagger, fired: false });
        }
        return { lines, t: 0 };
    };
    let left = waves, wave = null, e = 0;
    _egNkToast('eg_mech_lattice', '📡 The Gridlock: Laser Lattice! Clear the lit lanes!');
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        if (!wave && left > 0) {
            left--;
            wave = mkWave();
        }
        if (!wave) return false;
        wave.t += dtS * 1000;
        const pr = _egNkPlayerRect();
        let anyHot = false;
        wave.lines.forEach(l => {
            if (l.fired) { anyHot = true; return; }
            if (wave.t >= l.fireAt) {
                l.fired = true;
                l.el.classList.remove('eg-nk-lattice-warn');
                l.el.classList.add('eg-nk-lattice-hit');
                _egGlSpark(l.axis === 'h' ? W / 2 : l.pos, l.axis === 'h' ? l.pos : H / 2, false);
                if (pr && !l.hitDone) {
                    const caught = l.axis === 'h'
                        ? (pr.bottom > l.pos - thick / 2 && pr.top < l.pos + thick / 2)
                        : (pr.right > l.pos - thick / 2 && pr.left < l.pos + thick / 2);
                    if (caught) {
                        l.hitDone = true;
                        const dealt = _egNkHit(dmgPct, 'lightning', level);
                        _egNkAbilityHitToast(dealt, 'The Gridlock', 'Laser Lattice');
                    }
                }
                anyHot = true;
            } else {
                anyHot = true; // still telegraphing or waiting its turn
            }
        });
        // A wave ends when its LAST line has fired and cooled.
        const lastFire = Math.max.apply(null, wave.lines.map(l => l.fireAt));
        if (wave.t >= lastFire + activeMs + gapMs) {
            wave.lines.forEach(l => { try { l.el.remove(); } catch (e2) {} });
            wave = null;
        }
        return left > 0 || !!wave;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: SIGNAL SCRAMBLE (phase 2+)-------------------
//------------------------------------------------------------------------
// The Gridlock plants signal towers around the field; every tower draws a
// dashed cable to YOUR position at cast time — then all cables fire
// together. The starburst aims at where you were: break the geometry.
const EG_GL_SCRAMBLE_WARN = 1150;
const EG_GL_SCRAMBLE_LIVE = 420;

function _egMechGlScramble(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = EG_GL_TOWER_COUNT[p];
    const warnMs = EG_GL_SCRAMBLE_WARN * _EG_GL_DEBUG_MULT;
    const liveMs = EG_GL_SCRAMBLE_LIVE * _EG_GL_DEBUG_MULT;
    const dmgPct = EG_GL_TOWER_DMG[p];

    // Towers: spread across the edges + two interior anchors.
    const spots = [
        [70, 80], [W / 2, 64], [W - 70, 80],
        [64, H * 0.55], [W - 64, H * 0.55],
        [W / 2, H - 80],
    ];
    const c = _egNkPlayerCenter() || { x: W / 2, y: H / 2 };
    const cables = [];
    for (let i = 0; i < count && spots.length; i++) {
        const spot = spots.splice(Math.floor(Math.random() * spots.length), 1)[0];
        const tower = _egNkEl(run, 'div', 'eg-gl-tower', '📡');
        tower.style.left = Math.round(spot[0] - 17) + 'px';
        tower.style.top = Math.round(spot[1] - 17) + 'px';
        // The cable: a thin rotated div from tower → player's CURRENT spot.
        const dx = c.x - spot[0], dy = c.y - spot[1];
        const len = Math.hypot(dx, dy) || 1;
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        const line = _egNkEl(run, 'div', 'eg-gl-tline');
        line.style.left = Math.round(spot[0]) + 'px';
        line.style.top = Math.round(spot[1]) + 'px';
        line.style.width = Math.round(len) + 'px';
        line.style.rotate = ang + 'deg';
        cables.push({ x0: spot[0], y0: spot[1], x1: c.x, y1: c.y, tower, line });
    }

    _egNkToast('eg_mech_gl_scramble', '📡 The Gridlock: SIGNAL SCRAMBLE — break the cables!', '#a5f3fc');

    let t = 0, fired = false;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        if (!fired && t >= warnMs) {
            fired = true;
            cables.forEach(cb => {
                cb.line.classList.add('eg-gl-tline-fire');
                cb.tower.classList.add('eg-gl-tower-fire');
            });
            _egGlSpark(c.x, c.y, false);
            const pr = _egNkPlayerRect();
            if (pr) {
                const pc = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
                const caught = cables.some(cb => _egGlDistToSeg(pc.x, pc.y, cb.x0, cb.y0, cb.x1, cb.y1) < 16);
                if (caught) {
                    const dealt = _egNkHit(dmgPct, 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Gridlock', 'Signal Scramble');
                }
            }
        }
        if (t >= warnMs + liveMs) {
            cables.forEach(cb => {
                cb.line.classList.add('eg-gl-tline-fade');
                cb.tower.classList.add('eg-gl-tower-fade');
            });
            const id = setTimeout(() => {
                cables.forEach(cb => {
                    try { cb.line.remove(); } catch (e2) {}
                    try { cb.tower.remove(); } catch (e2) {}
                });
            }, 350);
            run.timers.push(id);
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: SURGE CHASER (phase 2+)----------------------
//------------------------------------------------------------------------
// A roaming ⚡ orb homes slowly and sheds a LIVE CABLE TRAIL behind it —
// kiting it wires the arena against you. Trail segments fade after ~1.2s;
// the orb despawns after its patrol. Phase 3 spawns a second chaser.
const EG_GL_SURGE_LIFE = 7500;
const EG_GL_SURGE_TURN = 2.2;   // rad/s steering cap (readability)

function _egMechGlSurge(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const orbSpeed = EG_GL_ORB_SPEED / _EG_GL_DEBUG_MULT;
    const trailLife = EG_GL_TRAIL_LIFE * _EG_GL_DEBUG_MULT;
    const life = EG_GL_SURGE_LIFE * _EG_GL_DEBUG_MULT;
    const orbDmg = EG_GL_ORB_DMG[p];

    const spawnChaser = (delayMs) => {
        const delayId = setTimeout(() => {
            const side = Math.floor(Math.random() * 4);
            const orb = {
                x: side === 0 ? 40 : side === 1 ? W - 40 : W * (0.25 + Math.random() * 0.5),
                y: side === 2 ? 40 : side === 3 ? H - 40 : H * (0.25 + Math.random() * 0.5),
                ang: Math.random() * Math.PI * 2,
                born: 0, lastX: 0, lastY: 0, nextTrail: 0, el: null, done: false,
            };
            orb.el = _egNkEl(run, 'div', 'eg-gl-orb', '⚡');
            orb.el.style.left = Math.round(orb.x - 14) + 'px';
            orb.el.style.top = Math.round(orb.y - 14) + 'px';
            chasers.push(orb);
        }, delayMs);
        run.timers.push(delayId);
    };

    const chasers = [];
    const trails = [];
    const nOrbs = p >= 3 ? 2 : 1;
    for (let i = 0; i < nOrbs; i++) spawnChaser(i * 2000 * _EG_GL_DEBUG_MULT);

    _egNkToast('eg_mech_gl_surge', '📡 The Gridlock: SURGE CHASER — the trail is live!', '#a5f3fc');

    let t = 0, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        let active = false;
        chasers.forEach(o => {
            if (o.done) return;
            active = true;
            if (!o.born) { o.born = t; o.lastX = o.x; o.lastY = o.y; }
            // Slow homing with a steering cap — readable, kitable.
            if (c) {
                const want = Math.atan2(c.y - o.y, c.x - o.x);
                let diff = ((want - o.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
                const turn = EG_GL_SURGE_TURN * dtS;
                o.ang += Math.max(-turn, Math.min(turn, diff));
            }
            o.x += Math.cos(o.ang) * orbSpeed * dtS;
            o.y += Math.sin(o.ang) * orbSpeed * dtS;
            // Bounce off walls.
            if (o.x < 30 || o.x > W - 30) { o.ang = Math.PI - o.ang; o.x = Math.max(30, Math.min(W - 30, o.x)); }
            if (o.y < 30 || o.y > H - 30) { o.ang = -o.ang; o.y = Math.max(30, Math.min(H - 30, o.y)); }
            o.el.style.left = Math.round(o.x - 14) + 'px';
            o.el.style.top = Math.round(o.y - 14) + 'px';
            // Shed a trail segment every ~90ms.
            if (t >= o.nextTrail && Math.hypot(o.x - o.lastX, o.y - o.lastY) > 12) {
                o.nextTrail = t + 90;
                const seg = _egNkEl(run, 'div', 'eg-gl-trail');
                const len = Math.hypot(o.x - o.lastX, o.y - o.lastY);
                seg.style.left = Math.round(o.lastX) + 'px';
                seg.style.top = Math.round(o.lastY) + 'px';
                seg.style.width = Math.round(len) + 'px';
                seg.style.rotate = (Math.atan2(o.y - o.lastY, o.x - o.lastX) * 180 / Math.PI) + 'deg';
                seg.style.transformOrigin = '0 50%';
                trails.push({ x0: o.lastX, y0: o.lastY, x1: o.x, y1: o.y, el: seg, until: t + trailLife });
                o.lastX = o.x; o.lastY = o.y;
            }
            if (pr && now >= touchCd && _egNkCircleHit(o.x, o.y, 15, pr, 0)) {
                touchCd = now + EG_GL_HIT_CD_MS;
                const dealt = _egNkHit(orbDmg, 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Gridlock', 'Surge Chaser');
                _egGlSpark(o.x, o.y, false);
            }
            if (t - o.born > life) {
                o.done = true;
                try { o.el.remove(); } catch (e2) {}
                _egGlSpark(o.x, o.y, true);
            }
        });
        // Live trails bite.
        for (let i = trails.length - 1; i >= 0; i--) {
            const tr = trails[i];
            if (t >= tr.until) {
                try { tr.el.remove(); } catch (e2) {}
                trails.splice(i, 1);
                continue;
            }
            if (pr && now >= touchCd) {
                const pc = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
                if (_egGlDistToSeg(pc.x, pc.y, tr.x0, tr.y0, tr.x1, tr.y1) < 11) {
                    touchCd = now + EG_GL_HIT_CD_MS;
                    const dealt = _egNkHit(EG_GL_TRAIL_DMG, 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Gridlock', 'Live Cable');
                }
            }
        }
        return active || trails.length > 0 || chasers.some(o => !o.done);
    });
}


//------------------------------------------------------------------------
//-------------------🔒… SYSTEM LOCKDOWN (≤10% HP one-shot finale)----------
//------------------------------------------------------------------------
// A circuit-board overlay floods the screen and the arena becomes a live
// wire grid. Three beats of charging wire batches — then THE JAM: every
// wire fires at once EXCEPT one horizontal + one vertical, whose
// intersection is the only safe cell (marked with a pip). Then the SURGE
// DIVE: a ⚡ orb dives the safe cell — step off it. Charge bar frozen for
// the whole set-piece (gate in _egTickPlayer via _egGlFinalActive).
const EG_GL_FINAL_BEATS = 3;
const EG_GL_BEAT_CHARGE = 1000;   // ms telegraph per beat batch
const EG_GL_BEAT_LIVE = 520;      // ms a beat batch stays hot
const EG_GL_JAM_CHARGE = 1300;    // ms THE JAM telegraph
const EG_GL_JAM_LIVE = 750;       // ms THE JAM stays hot
const EG_GL_WIRE_COUNT_H = 5;     // horizontal wires
const EG_GL_WIRE_COUNT_V = 7;     // vertical wires

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egGlFinal = null;

function _egGlFinalActive() {
    return !!_egGlFinal && !_egGlFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egGlOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egGlStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egGlStartFinalWatcher(monster) {
    if (!monster || _egGlFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egGlFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egGlFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

function _egGlFinalStart(monster) {
    if (_egGlFinal || !monster) return;

    // The gates close: kill every other run of this boss (the finale takes
    // over the whole arena).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        count: EG_GL_FINAL_BEATS,
        beat: 0,
        phase: 'beats',           // beats → jam → surge → done
        wiresH: [], wiresV: [],
        arena: null, overlay: null, pip: null, diveEl: null, diveline: null,
        fxRun: null, cdTimer: null,
    };
    _egGlFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds the arena, wires and the timeline.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Circuit-board overlay.
    const arena = document.createElement('div');
    arena.className = 'eg-gl-arena';
    document.body.appendChild(arena);
    g.arena = arena;
    requestAnimationFrame(() => arena.classList.add('eg-gl-arena-on'));

    // The wire grid: evenly spaced H + V wires inside safe margins.
    const body = document.createElement('div');
    body.className = 'eg-gl-grid';
    document.body.appendChild(body);
    g.gridEl = body;
    g.fxRun.els.push(body);
    for (let i = 0; i < EG_GL_WIRE_COUNT_H; i++) {
        const el = document.createElement('div');
        el.className = 'eg-gl-wire eg-gl-wire-h';
        const y = H * (i + 1) / (EG_GL_WIRE_COUNT_H + 1);
        el.style.top = Math.round(y) + 'px';
        body.appendChild(el);
        g.wiresH.push({ y, el });
    }
    for (let j = 0; j < EG_GL_WIRE_COUNT_V; j++) {
        const el = document.createElement('div');
        el.className = 'eg-gl-wire eg-gl-wire-v';
        const x = W * (j + 1) / (EG_GL_WIRE_COUNT_V + 1);
        el.style.left = Math.round(x) + 'px';
        body.appendChild(el);
        g.wiresV.push({ x, el });
    }

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-gl-cd';
    ov.innerHTML =
        '<div class="eg-gl-cd-label">🔒 SYSTEM LOCKDOWN</div>' +
        '<div class="eg-gl-cd-num eg-bmb-cd-pop">' + g.count + '</div>' +
        '<div class="eg-gl-cd-hint">The grid charges — read the wires!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_gl_final_cd', '🔒💀 SYSTEM LOCKDOWN — read the grid!', '#a5f3fc');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss locks in.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-gl-locked');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;
    let touchCd = 0;
    const liveHit = (pct, label) => {
        const now = performance.now();
        if (now < touchCd) return;
        const pr = _egNkPlayerRect();
        if (!pr) return;
        const pc = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
        // Any HOT wire under the player bites (pad 6 for the wire thickness).
        const hitH = g.wiresH.some(w => w.hot && Math.abs(pc.y - w.y) < 12);
        const hitV = g.wiresV.some(w => w.hot && Math.abs(pc.x - w.x) < 12);
        if (hitH || hitV) {
            touchCd = now + EG_GL_HIT_CD_MS;
            _egGlTouch(pct, level, label);
        }
    };
    const setBatch = (ws, cls, on) => ws.forEach(w => {
        w.hot = on;
        w.el.classList.toggle(cls, on);
    });
    const pickBatch = () => {
        const hs = g.wiresH.slice().sort(() => Math.random() - 0.5).slice(0, 2);
        const vs = g.wiresV.slice().sort(() => Math.random() - 0.5).slice(0, 3);
        return hs.concat(vs);
    };

    // The timeline: beats → THE JAM → SURGE DIVE → stand down. Pause /
    // death / inactive hold the timeline (debug: extra-long beats).
    const beatTick = EG_GL_BEAT_CHARGE * (_EG_GL_DEBUG_SLOW ? 8 : 1);
    const step = () => {
        if (!_egGlFinal || _egGlFinal !== g || g.finished) return;
        if (_egNkFrozen()) return;
        if (g.phase === 'beats') {
            g.count--;
            const num = g.overlay && g.overlay.querySelector('.eg-gl-cd-num');
            if (num) {
                num.textContent = Math.max(0, g.count);
                num.classList.remove('eg-bmb-cd-pop');
                void num.offsetWidth;
                num.classList.add('eg-bmb-cd-pop');
            }
            const batch = pickBatch();
            setBatch(batch, 'eg-gl-wire-charge', true);
            setTimeout(() => {
                if (!_egGlFinal || _egGlFinal !== g || g.finished) return;
                setBatch(batch, 'eg-gl-wire-charge', false);
                setBatch(batch, 'eg-gl-wire-fire', true);
                setTimeout(() => {
                    if (!_egGlFinal || _egGlFinal !== g || g.finished) return;
                    setBatch(batch, 'eg-gl-wire-fire', false);
                }, EG_GL_BEAT_LIVE);
            }, EG_GL_BEAT_CHARGE);
            if (g.count <= 0) {
                g.phase = 'jamprep';
                setTimeout(step, EG_GL_BEAT_LIVE + 350);
                return;
            }
        } else if (g.phase === 'jamprep') {
            // THE JAM: every wire charges EXCEPT one H + one V — the only
            // safe crossing. Mark it with a pip.
            g.phase = 'jam';
            const safeH = g.wiresH[Math.floor(Math.random() * g.wiresH.length)];
            const safeV = g.wiresV[Math.floor(Math.random() * g.wiresV.length)];
            g.safe = { x: safeV.x, y: safeH.y };
            const all = g.wiresH.concat(g.wiresV).filter(w => w !== safeH && w !== safeV);
            setBatch(all, 'eg-gl-wire-jamcharge', true);
            safeH.el.classList.add('eg-gl-wire-safe');
            safeV.el.classList.add('eg-gl-wire-safe');
            const pip = document.createElement('div');
            pip.className = 'eg-gl-safepip';
            pip.style.left = Math.round(safeV.x) + 'px';
            pip.style.top = Math.round(safeH.y) + 'px';
            document.body.appendChild(pip);
            g.pip = pip;
            g.fxRun.els.push(pip);
            _egNkToast('eg_mech_gl_jam', '🔒💀 THE JAM — get to the safe intersection!', '#a5f3fc');
            setTimeout(() => {
                if (!_egGlFinal || _egGlFinal !== g || g.finished) return;
                setBatch(all, 'eg-gl-wire-jamcharge', false);
                setBatch(all, 'eg-gl-wire-jamfire', true);
                _egGlSpark(safeV.x, safeH.y, true);
                setTimeout(() => {
                    if (!_egGlFinal || _egGlFinal !== g || g.finished) return;
                    setBatch(all, 'eg-gl-wire-jamfire', false);
                    g.safeH = safeH; g.safeV = safeV;
                    g.phase = 'surge';
                    setTimeout(step, 500);
                }, EG_GL_JAM_LIVE);
            }, EG_GL_JAM_CHARGE);
        } else if (g.phase === 'surge') {
            // SURGE DIVE: a ⚡ orb dives the safe cell — step off it.
            g.phase = 'done';
            const sx = g.safeV.x, sy = g.safeH.y;
            // Dive from the nearest screen edge along the safe wire.
            const fromLeft = sx > W / 2;
            const x0 = fromLeft ? -60 : W + 60;
            const warn = document.createElement('div');
            warn.className = 'eg-gl-diveline';
            warn.style.left = '0px';
            warn.style.width = W + 'px';
            warn.style.top = Math.round(sy - 26) + 'px';
            warn.style.height = '52px';
            document.body.appendChild(warn);
            g.diveline = warn;
            g.fxRun.els.push(warn);
            _egNkToast('eg_mech_gl_dive', '⚡ SURGE DIVE — off the safe cell!', '#a5f3fc');
            setTimeout(() => {
                if (!_egGlFinal || _egGlFinal !== g || g.finished) return;
                try { warn.remove(); } catch (e) {}
                const dive = document.createElement('div');
                dive.className = 'eg-gl-dive';
                dive.textContent = '⚡';
                dive.style.top = Math.round(sy - 24) + 'px';
                dive.style.left = Math.round(x0) + 'px';
                document.body.appendChild(dive);
                g.diveEl = dive;
                g.fxRun.els.push(dive);
                const dist = Math.abs(sx - x0) + 120;
                const dur = dist / 900 * 1000; // 900 px/s
                dive.style.transition = 'left ' + Math.round(dur) + 'ms linear';
                requestAnimationFrame(() => { dive.style.left = Math.round(fromLeft ? sx + 60 : sx - 60) + 'px'; });
                setTimeout(() => {
                    if (!_egGlFinal || _egGlFinal !== g || g.finished) return;
                    _egGlSpark(sx, sy, true);
                    const pr = _egNkPlayerRect();
                    if (pr) {
                        const pc = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
                        if (Math.hypot(pc.x - sx, pc.y - sy) < 62) {
                            _egGlTouch(EG_GL_SURGE_DMG, level, 'SYSTEM LOCKDOWN');
                        }
                    }
                    setTimeout(() => _egGlFinalEnd(g), _EG_GL_DEBUG_SLOW ? 5500 : 1200);
                }, dur);
            }, EG_GL_JAM_CHARGE * 0.7);
        }
    };
    g.cdTimer = setInterval(step, beatTick);
}

function _egGlFinalEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.arena) { try { g.arena.remove(); } catch (e) {} g.arena = null; }
    if (g.gridEl) { try { g.gridEl.remove(); } catch (e) {} g.gridEl = null; }
    if (g.pip) { try { g.pip.remove(); } catch (e) {} g.pip = null; }
    if (g.diveline) { try { g.diveline.remove(); } catch (e) {} g.diveline = null; }
    if (g.diveEl) { try { g.diveEl.remove(); } catch (e) {} g.diveEl = null; }
    if (g.fxRun) { try { _egNkKillRun(g.fxRun); } catch (e) {} g.fxRun = null; }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    document.querySelectorAll('.eg-gl-locked').forEach(el => el.classList.remove('eg-gl-locked'));

    const m = (g.monsterId && typeof _egMonsters !== 'undefined')
        ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _egBossScheduleMechanics === 'function') {
            try { _egBossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e2) {} }
    }
    if (_egGlFinal === g) _egGlFinal = null;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body class this boss ever created.
function _egGlTeardown() {
    if (_egGlFinal) { try { _egGlFinalEnd(_egGlFinal); } catch (e) {} _egGlFinal = null; }
    document.querySelectorAll('.eg-nk-lattice-warn, .eg-nk-lattice-hit, .eg-gl-tower, ' +
        '.eg-gl-tline, .eg-gl-orb, .eg-gl-trail, .eg-gl-arena, .eg-gl-grid, ' +
        '.eg-gl-wire, .eg-gl-cd, .eg-gl-safepip, .eg-gl-diveline, .eg-gl-dive, ' +
        '.eg-gl-sparks').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-gl-locked').forEach(el => el.classList.remove('eg-gl-locked'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_GL_DEBUG.fire('lattice'|'scramble'|'surge', phase) — runs one now
//   _EG_GL_DEBUG.final()                                   — LOCKDOWN now
if (typeof window !== 'undefined') {
    window._EG_GL_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_gridlock') : null;
            if (!monster) return 'no gridlock alive';
            const fn = name === 'lattice' ? _egMechGlLattice
                : name === 'scramble' ? _egMechGlScramble
                : name === 'surge' ? _egMechGlSurge : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'lattice' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_gridlock') : null;
            if (!monster) return 'no gridlock alive';
            _egGlFinalStart(monster);
            return 'SYSTEM LOCKDOWN started';
        },
    };
}
