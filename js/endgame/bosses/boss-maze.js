//------------------------------------------------------------------------
//-------------------BOSS: THE MAZE (boss_maze)---------------------------
//------------------------------------------------------------------------
// REWORK — arcade-ghost homage, rebuilt as a full haunted-cabinet gauntlet.
// A gang of four ghosts with their own brains hunts you through marching
// pellet walls, a rising shadow labyrinth and lights-out darkness — then,
// at the very end, the arcade finally catches up: GAME OVER.
//
//   Phase 1 (100–60%) — GHOST GANG. Four ghosts, four brains: one chases,
//                       one ambushes where you are heading, one flanks
//                       sideways, one wanders hungrily. Every few seconds
//                       the whole gang SCATTERS to its corners (arcade
//                       rules) — breathe, then move. Learn all four or be
//                       surrounded.
//                       Plus DOT WALLS. Walls of glowing pellets march
//                       across the arena with a single gap. Slip the gap —
//                       pellets sting!
//   Phase 2 ( ≤60%)   — THE LABYRINTH. Shadow wall segments rise out of
//                       the floor and linger, building a temporary maze
//                       while the gang keeps hunting. Route around them!
//                       Plus LIGHTS OUT. The arena goes dark and only
//                       drifting ghost eyes glow. Do NOT touch the eyes.
//                       Everything else gets faster and meaner.
//   Phase 3 ( ≤30%)   — Fuller labyrinths, more eyes, faster walls, a
//                       hungrier gang. The cabinet wants its quarter.
//   Finale ( ≤10%)    — GAME OVER (one-shot set-piece): the boss goes
//                       immune and shielded and TREMBLES while a CRT
//                       scanline overlay swallows the arena. On every
//                       metronome beat a shadow circle marks YOUR position
//                       and the whole gang CONVERGES on it — 3 slams with
//                       a growing final circle, then one giant CHOMP.
//                       NEVER stand still! Charge bar frozen for the whole
//                       set-piece (gate in _egTickPlayer via
//                       _egMzFinalActive).
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

const _EG_MZ_DEBUG_SLOW = true;
const _EG_MZ_DEBUG_MULT = _EG_MZ_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_maze: {
        id: 'boss_maze', name: 'The Maze', emoji: '👻',
        baseHP: 1040, baseDamage: 23, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_maze: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'ghost_gang', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechMzGhostGang' },
            { name: 'dot_walls', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechMzDotWalls' },
            { name: 'maze_walls', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechMzMazeWalls', phase2Only: true },
            { name: 'lights_out', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechMzLightsOut', phase2Only: true },
        ],
        onPhaseEnter: _egMzOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_MZ_GANG_DMG     = [0, 0.11, 0.13, 0.16];   // ghost touch
const EG_MZ_WALL_DMG     = [0, 0.16, 0.19, 0.22];   // pellet wall contact
const EG_MZ_MAZEWALL_DMG = [0, 0, 0.15, 0.18];      // labyrinth wall touch
const EG_MZ_EYES_DMG     = [0, 0, 0.17, 0.20];      // eyes in the dark
const EG_MZ_SLAM_DMG     = 0.14;                    // convergence slam
const EG_MZ_FINAL_DMG    = 0.32;                    // the giant CHOMP
const EG_MZ_HIT_CD_MS    = 700;                     // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Maze hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egMzHitCd = 0;
function _egMzTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egMzHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egMzHitCd = now + EG_MZ_HIT_CD_MS;
    const dealt = _egNkHit(pct, 'shadow', level);
    _egNkAbilityHitToast(dealt, 'The Maze', label);
    return true;
}

// One CSS arcade ghost (colour via currentColor, skirt via clip-path).
function _egMzGhostEl(run, color) {
    const g = _egNkEl(run, 'div', 'eg-mz-ghost');
    g.style.color = color;
    const body = document.createElement('div');
    body.className = 'eg-mz-ghost-body';
    const eyes = document.createElement('div');
    eyes.className = 'eg-mz-ghost-eyes';
    body.appendChild(eyes);
    g.appendChild(body);
    return g;
}

// Spook burst where the gang slams or a wall lands (visual only, body-level
// so it survives the run ending in the same frame).
function _egMzSpookBurst(x, y, big) {
    const layer = document.createElement('div');
    layer.className = 'eg-mz-spooks' + (big ? ' eg-mz-spooks-big' : '');
    layer.style.left = Math.round(x) + 'px';
    layer.style.top = Math.round(y) + 'px';
    document.body.appendChild(layer);
    const colors = ['#f87171', '#f472b6', '#22d3ee', '#fb923c', '#e2e8f0'];
    for (let i = 0; i < (big ? 12 : 7); i++) {
        const s = document.createElement('div');
        s.className = 'eg-mz-spook';
        s.style.background = colors[i % colors.length];
        const ang = Math.random() * Math.PI * 2;
        const dist = 22 + Math.random() * (big ? 85 : 50);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 26) + 'px');
        s.style.animationDelay = (Math.random() * 110) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, _EG_MZ_DEBUG_SLOW ? 1800 : 900);
}


//------------------------------------------------------------------------
//-------------------MECHANIC: GHOST GANG-----------------------------------
//------------------------------------------------------------------------
// Four ghosts, four brains: chase / ambush / flank / wander, with arcade
// scatter windows — every ~4s the whole gang flees to its corner for a
// beat (a breather with a telegraph), then resumes the hunt. Speed scales
// with phase.
const EG_MZ_GANG_DUR_MS   = 11000;
const EG_MZ_SCATTER_EVERY = 4000;
const EG_MZ_SCATTER_DUR   = 1100;

function _egMechMzGhostGang(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const durMs = EG_MZ_GANG_DUR_MS * _EG_MZ_DEBUG_MULT;
    const dmgPct = EG_MZ_GANG_DMG[p];
    const defs = [
        { color: '#f87171', speed: [0, 78, 92, 110][p], brain: 'chase' },
        { color: '#f472b6', speed: [0, 72, 86, 102][p], brain: 'ambush' },
        { color: '#22d3ee', speed: [0, 75, 89, 106][p], brain: 'flank' },
        { color: '#fb923c', speed: [0, 60, 72, 88][p], brain: 'wander' },
    ];
    const W = window.innerWidth, H = window.innerHeight;
    const corners = [
        [W * 0.12, H * 0.14], [W * 0.88, H * 0.14],
        [W * 0.12, H * 0.86], [W * 0.88, H * 0.86],
    ];
    const gang = defs.map((d, i) => {
        const el = _egMzGhostEl(run, d.color);
        el.style.transform = 'translate(' + Math.round(W * (0.2 + 0.2 * i) - 22) + 'px,' + Math.round(70 - 22) + 'px)';
        return { speed: d.speed, brain: d.brain, x: W * (0.2 + 0.2 * i), y: 70, wx: Math.random() * 6.28, wy: Math.random() * 6.28, cdUntil: 0, el, corner: corners[i] };
    });

    _egNkToast('eg_mech_maze', '👻 The Maze: Ghost Gang! Each one hunts differently!', '#e2e8f0');

    let e = 0, px = 0, py = 0, pvx = 0, pvy = 0, hasPrev = false;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        if (c) {
            if (hasPrev && dtS > 0) {
                pvx = (c.x - px) / dtS;
                pvy = (c.y - py) / dtS;
            }
            px = c.x;
            py = c.y;
            hasPrev = true;
        }
        // Arcade scatter windows (stretched in debug like everything else).
        const s1 = EG_MZ_SCATTER_EVERY * _EG_MZ_DEBUG_MULT;
        const s2 = s1 * 2;
        const sDur = EG_MZ_SCATTER_DUR * _EG_MZ_DEBUG_MULT;
        const scattering = (e >= s1 && e < s1 + sDur) || (e >= s2 && e < s2 + sDur);
        gang.forEach(g => {
            let tx = null, ty = null;
            if (scattering) {
                tx = g.corner[0];
                ty = g.corner[1];
            } else if (g.brain === 'chase' && c) {
                tx = c.x;
                ty = c.y;
            } else if (g.brain === 'ambush' && c) {
                // Targets where you are heading, 0.8s ahead.
                tx = c.x + pvx * 0.8;
                ty = c.y + pvy * 0.8;
            } else if (g.brain === 'flank' && c) {
                // Circles to your side: aim 140px perpendicular to your motion.
                const mx = hasPrev ? pvx : 0, my = hasPrev ? pvy : -1;
                const ml = Math.sqrt(mx * mx + my * my) || 1;
                tx = c.x + (-my / ml) * 140;
                ty = c.y + (mx / ml) * 140;
            } else if (g.brain === 'wander') {
                g.wx += dtS * 1.7;
                g.wy += dtS * 2.3;
                tx = g.x + Math.cos(g.wx) * 120 + (c ? (c.x - g.x) * 0.15 : 0);
                ty = g.y + Math.sin(g.wy) * 120 + (c ? (c.y - g.y) * 0.15 : 0);
            }
            if (tx != null) {
                const dx = tx - g.x, dy = ty - g.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                const sp = scattering ? g.speed * 1.3 : g.speed;
                g.x += (dx / d) * sp * dtS;
                g.y += (dy / d) * sp * dtS;
            }
            g.el.style.transform = 'translate(' + Math.round(g.x - 22) + 'px,' + Math.round(g.y - 22) + 'px)';
            if (pr && now >= g.cdUntil && _egNkCircleHit(g.x, g.y, 22, pr, 0)) {
                g.cdUntil = now + 800;
                _egMzTouch(dmgPct, level, 'Ghost Gang');
            }
        });
        return e < durMs;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: DOT WALLS------------------------------------
//------------------------------------------------------------------------
// Walls of glowing pellets march across the arena with a single gap. Warn
// outline first, then the march. Phase 2 sends one wall from each axis.
const EG_MZ_WALL_GAP   = 180;
const EG_MZ_WALL_THICK = 30;

function _egMechMzDotWalls(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const speed = [0, 170, 200, 240][p] / _EG_MZ_DEBUG_MULT;
    const warnMs = 1400 * _EG_MZ_DEBUG_MULT;
    const dmgPct = EG_MZ_WALL_DMG[p];
    const count = [0, 1, 2, 2][p];

    const walls = [];
    for (let i = 0; i < count; i++) {
        const vertical = count === 1 ? Math.random() < 0.5 : (i === 0);
        const len = vertical ? H : W;
        const gapStart = 140 + Math.random() * Math.max(60, len - 280 - EG_MZ_WALL_GAP);
        const dir = Math.random() < 0.5 ? 1 : -1;
        const segs = [];
        const mkSeg = (a, b) => {
            const el = _egNkEl(run, 'div', 'eg-mz-dotwall eg-mz-dotwall-warn');
            if (vertical) {
                el.style.width = EG_MZ_WALL_THICK + 'px';
                el.style.height = Math.round(b - a) + 'px';
                el.style.top = Math.round(a) + 'px';
            } else {
                el.style.height = EG_MZ_WALL_THICK + 'px';
                el.style.width = Math.round(b - a) + 'px';
                el.style.left = Math.round(a) + 'px';
            }
            return { a, b, el };
        };
        if (gapStart > 40) segs.push(mkSeg(0, gapStart));
        if (len - gapStart - EG_MZ_WALL_GAP > 40) segs.push(mkSeg(gapStart + EG_MZ_WALL_GAP, len));
        walls.push({ vertical, dir, segs, pos: dir === 1 ? -EG_MZ_WALL_THICK : len, done: false });
    }

    _egNkToast('eg_mech_mz_walls', '👻 The Maze: DOT WALLS — find the gap!', '#e2e8f0');

    let t = 0, touchCd = 0, marching = false;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        if (t >= warnMs && !marching) {
            marching = true;
            walls.forEach(w => w.segs.forEach(s => s.el.classList.remove('eg-mz-dotwall-warn')));
        }
        let allDone = true;
        const pr = _egNkPlayerRect();
        walls.forEach(w => {
            if (w.done) return;
            if (!marching) { allDone = false; return; }
            w.pos += w.dir * speed * dtS;
            w.segs.forEach(s => {
                if (w.vertical) s.el.style.left = Math.round(w.pos) + 'px';
                else s.el.style.top = Math.round(w.pos) + 'px';
            });
            if (w.pos > (w.vertical ? W : H) + 40 || w.pos + EG_MZ_WALL_THICK < -40) {
                w.done = true;
                w.segs.forEach(s => { try { s.el.remove(); } catch (e) {} });
                return;
            }
            allDone = false;
            if (pr && now >= touchCd) {
                const hit = w.segs.some(s => {
                    if (w.vertical) return pr.right > w.pos + 4 && pr.left < w.pos + EG_MZ_WALL_THICK - 4 && pr.bottom > s.a + 4 && pr.top < s.b - 4;
                    return pr.bottom > w.pos + 4 && pr.top < w.pos + EG_MZ_WALL_THICK - 4 && pr.right > s.a + 4 && pr.left < s.b - 4;
                });
                if (hit) {
                    touchCd = now + EG_MZ_HIT_CD_MS;
                    _egMzTouch(dmgPct, level, 'Dot Wall');
                }
            }
        });
        return !allDone && t < warnMs + ((Math.max(W, H) + 200) / speed) * 1000 + 800;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: THE LABYRINTH (phase 2+)---------------------
//------------------------------------------------------------------------
// Shadow wall segments rise out of the floor and linger, building a
// temporary maze while the gang keeps hunting. Touching a wall stings.
const EG_MZ_MAZE_COUNT = [0, 0, 3, 4];
const EG_MZ_MAZE_LIFE  = 6500;

function _egMechMzMazeWalls(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = EG_MZ_MAZE_COUNT[p];
    const warnMs = 1400 * _EG_MZ_DEBUG_MULT;
    const lifeMs = EG_MZ_MAZE_LIFE * _EG_MZ_DEBUG_MULT;
    const dmgPct = EG_MZ_MAZEWALL_DMG[p];

    const walls = [];
    let guard = 0;
    const pc0 = _egNkPlayerCenter();
    while (walls.length < count && guard++ < 120) {
        const vertical = Math.random() < 0.5;
        const len = 200 + Math.random() * 140;
        const x = 90 + Math.random() * Math.max(60, W - 180);
        const y = 110 + Math.random() * Math.max(60, H - 220);
        const cx = vertical ? x : x + len / 2;
        const cy = vertical ? y + len / 2 : y;
        if (pc0 && Math.hypot(cx - pc0.x, cy - pc0.y) < 160) continue;
        if (!walls.every(w => Math.hypot(w.cx - cx, w.cy - cy) > 160)) continue;
        const el = _egNkEl(run, 'div', 'eg-mz-mazewall eg-mz-mazewall-warn');
        if (vertical) {
            el.style.width = '26px';
            el.style.height = Math.round(len) + 'px';
            el.style.left = Math.round(x - 13) + 'px';
            el.style.top = Math.round(y) + 'px';
        } else {
            el.style.height = '26px';
            el.style.width = Math.round(len) + 'px';
            el.style.left = Math.round(x) + 'px';
            el.style.top = Math.round(y - 13) + 'px';
        }
        walls.push({ vertical, x, y, len, cx, cy, el });
    }

    _egNkToast('eg_mech_mz_labyrinth', '👻 The Maze: THE LABYRINTH rises — read the walls!', '#e2e8f0');

    let t = 0, touchCd = 0, risen = false;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        if (t >= warnMs && !risen) {
            risen = true;
            walls.forEach(w => w.el.classList.remove('eg-mz-mazewall-warn'));
        }
        if (risen) {
            const pr = _egNkPlayerRect();
            if (pr && now >= touchCd) {
                const hit = walls.some(w => {
                    const l = w.vertical ? w.x - 13 : w.x;
                    const tp = w.vertical ? w.y : w.y - 13;
                    const r = w.vertical ? w.x + 13 : w.x + w.len;
                    const bt = w.vertical ? w.y + w.len : w.y + 13;
                    return pr.right > l + 5 && pr.left < r - 5 && pr.bottom > tp + 5 && pr.top < bt - 5;
                });
                if (hit) {
                    touchCd = now + EG_MZ_HIT_CD_MS;
                    _egMzTouch(dmgPct, level, 'Labyrinth Wall');
                }
            }
        }
        if (t >= warnMs + lifeMs) {
            walls.forEach(w => {
                w.el.classList.add('eg-mz-crumble');
                const el = w.el;
                setTimeout(() => { try { el.remove(); } catch (e) {} }, 460);
            });
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: LIGHTS OUT (field, passive)------------------
//------------------------------------------------------------------------
// The arena dims and pairs of glowing ghost eyes drift across the dark.
// Touching eyes stings. The run is PASSIVE (field hazard — never blocks
// other mechanics).
const EG_MZ_DARK_COUNT = [0, 0, 3, 5];
const EG_MZ_DARK_LIFE  = 5500;

function _egMechMzLightsOut(monster, phase) {
    if (_egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    run.passive = true;
    const W = window.innerWidth, H = window.innerHeight;
    const count = EG_MZ_DARK_COUNT[p];
    const durMs = EG_MZ_DARK_LIFE * _EG_MZ_DEBUG_MULT;
    const dmgPct = EG_MZ_EYES_DMG[p];

    const dark = document.createElement('div');
    dark.className = 'eg-mz-dark';
    document.body.appendChild(dark);
    run.els.push(dark);
    requestAnimationFrame(() => dark.classList.add('eg-mz-dark-on'));

    const eyes = [];
    for (let i = 0; i < count; i++) {
        const el = _egNkEl(run, 'div', 'eg-mz-eyes');
        const fromLeft = Math.random() < 0.5;
        eyes.push({
            x: fromLeft ? -60 : W + 60,
            y: 120 + Math.random() * Math.max(60, H - 240),
            vx: (fromLeft ? 1 : -1) * (55 + Math.random() * 40) / _EG_MZ_DEBUG_MULT,
            vy: (Math.random() * 2 - 1) * 30 / _EG_MZ_DEBUG_MULT,
            wob: Math.random() * 6.28,
            el,
        });
    }

    _egNkToast('eg_mech_mz_lights', '👻 The Maze: LIGHTS OUT — eyes in the dark!', '#e2e8f0');

    let e = 0, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const pr = _egNkPlayerRect();
        eyes.forEach(ey => {
            ey.wob += dtS * 2;
            ey.x += ey.vx * dtS;
            ey.y += ey.vy * dtS + Math.sin(ey.wob) * 18 * dtS;
            ey.el.style.transform = 'translate(' + Math.round(ey.x - 30) + 'px,' + Math.round(ey.y - 15) + 'px)';
            if (pr && now >= touchCd && _egNkCircleHit(ey.x, ey.y, 18, pr, 0)) {
                touchCd = now + EG_MZ_HIT_CD_MS;
                _egMzTouch(dmgPct, level, 'Eyes in the Dark');
            }
        });
        if (e >= durMs) {
            dark.classList.remove('eg-mz-dark-on');
            const d = dark;
            setTimeout(() => { try { d.remove(); } catch (err) {} }, 650);
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------👻💀 GAME OVER (≤10% HP one-shot finale)---------------
//------------------------------------------------------------------------
// The boss goes immune + shielded and TREMBLES while a CRT scanline overlay
// swallows the arena. On every metronome beat a shadow circle marks the
// player's position and the whole gang CONVERGES on it — three slams with a
// growing final circle, then one giant CHOMP. Charge bar frozen for the
// whole set-piece (gate in _egTickPlayer via _egMzFinalActive).
const EG_MZ_FINAL_TICK_MS = 1200;
const EG_MZ_FINAL_TICKS = 4;
const EG_MZ_TARGET_R = 150;
const EG_MZ_CHOMP_R = 200;

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egMzFinal = null;

function _egMzFinalActive() {
    return !!_egMzFinal && !_egMzFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egMzOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egMzStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egMzStartFinalWatcher(monster) {
    if (!monster || _egMzFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egMzFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egMzFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Mark a shadow convergence circle at the player's CURRENT position.
function _egMzMarkTarget(g, r) {
    if (g.targetEl) { try { g.targetEl.remove(); } catch (e) {} g.targetEl = null; }
    const c = _egNkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const el = document.createElement('div');
    el.className = 'eg-mz-target';
    el.style.width = (r * 2) + 'px';
    el.style.height = (r * 2) + 'px';
    el.style.left = Math.round(c.x - r) + 'px';
    el.style.top = Math.round(c.y - r) + 'px';
    document.body.appendChild(el);
    if (g.fxRun) g.fxRun.els.push(el);
    g.targetEl = el;
    g.target = { x: c.x, y: c.y, r };
}

// The gang converges: four ghosts dash in from the edges toward the marked
// circle; when they land, everyone still inside the circle is hit.
function _egMzSlam(g, monster, big) {
    const t = g.target;
    if (!t || !g.fxRun) return;
    const W = window.innerWidth, H = window.innerHeight;
    const dashS = 0.45 * (_EG_MZ_DEBUG_SLOW ? 2.5 : 1);
    const starts = [[-60, t.y], [W + 60, t.y], [t.x, -60], [t.x, H + 60]];
    starts.forEach(pt => {
        const gh = _egMzGhostEl(g.fxRun, '#e2e8f0');
        gh.style.transform = 'translate(' + Math.round(pt[0] - 22) + 'px,' + Math.round(pt[1] - 22) + 'px)';
        gh.style.transition = 'transform ' + dashS + 's cubic-bezier(.5,0,1,1)';
        requestAnimationFrame(() => {
            gh.style.transform = 'translate(' + Math.round(t.x - 22) + 'px,' + Math.round(t.y - 22) + 'px)';
        });
        const id = setTimeout(() => { try { gh.remove(); } catch (e) {} }, dashS * 1000 + 300);
        g.fxRun.timers.push(id);
    });
    const id2 = setTimeout(() => {
        _egMzSpookBurst(t.x, t.y, big);
        const pr = _egNkPlayerRect();
        if (pr) {
            const px = pr.left + pr.width / 2, py = pr.top + pr.height / 2;
            if (Math.hypot(px - t.x, py - t.y) > t.r + 12) return;   // escaped the circle
        }
        const level = monster ? monster.level : 1;
        _egMzTouch(big ? EG_MZ_FINAL_DMG : EG_MZ_SLAM_DMG, level, big ? 'CHOMP' : 'Ghost Rush');
    }, dashS * 1000);
    g.fxRun.timers.push(id2);
    if (big) {
        document.body.classList.add('eg-mz-flash');
        const id3 = setTimeout(() => document.body.classList.remove('eg-mz-flash'), 700);
        g.fxRun.timers.push(id3);
    }
}

function _egMzFinalStart(monster) {
    if (_egMzFinal || !monster) return;

    // The cabinet claims the screen: kill every other run of this boss.
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const g = {
        monsterId: monster.id,
        finished: false,
        count: EG_MZ_FINAL_TICKS,
        target: null,
        targetEl: null,
        scan: null,
        overlay: null,
        fxRun: null,
        cdTimer: null,
    };
    _egMzFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds slam ghosts, targets and cleanup timers.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // CRT scanline overlay swallows the arena.
    const scan = document.createElement('div');
    scan.className = 'eg-mz-scan';
    document.body.appendChild(scan);
    g.scan = scan;
    requestAnimationFrame(() => scan.classList.add('eg-mz-scan-on'));

    // Retro countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-mz-cd';
    ov.innerHTML =
        '<div class="eg-mz-cd-label">👻 GAME OVER?</div>' +
        '<div class="eg-mz-cd-num eg-bmb-cd-pop">' + g.count + '</div>' +
        '<div class="eg-mz-cd-hint">The gang converges on the marked circle — NEVER stand still!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_mz_final_cd', '👻💀 GAME OVER? — never stand still!', '#e2e8f0');

    // Boss immunity so the set-piece reads as a performance (released at the end).
    monster.bossImmune = true;

    // The boss trembles like a ghost caught in the light.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-mz-panicking');
        wrap.classList.add('eg-nk-shielded');
    }

    // First mark right away so beat 1 already has a circle to punish.
    _egMzMarkTarget(g, EG_MZ_TARGET_R);

    // Metronome: each beat, the gang converges on the current mark, then a
    // fresh circle is drawn (the last one bigger — the CHOMP). Pause /
    // death / inactive hold the count (debug: extra-long beats).
    const cdTick = EG_MZ_FINAL_TICK_MS * (_EG_MZ_DEBUG_SLOW ? 8 : 1);
    g.cdTimer = setInterval(() => {
        if (!_egMzFinal || _egMzFinal !== g || g.finished) return;
        if (_egNkFrozen()) return;
        const isFinal = g.count <= 1;
        _egMzSlam(g, monster, isFinal);
        g.count--;
        if (g.count <= 0) {
            clearInterval(g.cdTimer);
            g.cdTimer = null;
            if (g.targetEl) { try { g.targetEl.remove(); } catch (e) {} g.targetEl = null; g.target = null; }
            _egNkToast('eg_mech_mz_final_bang', '👻💀 CHOMP!', '#e2e8f0');
            const id = setTimeout(() => _egMzFinalEnd(g), _EG_MZ_DEBUG_SLOW ? 6000 : 1300);
            g.fxRun.timers.push(id);
            return;
        }
        _egMzMarkTarget(g, g.count === 1 ? EG_MZ_CHOMP_R : EG_MZ_TARGET_R);
        const num = g.overlay && g.overlay.querySelector('.eg-mz-cd-num');
        if (num) {
            num.textContent = g.count;
            num.classList.remove('eg-bmb-cd-pop');
            void num.offsetWidth;
            num.classList.add('eg-bmb-cd-pop');
        }
    }, cdTick);
}

function _egMzFinalEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.scan) { try { g.scan.remove(); } catch (e) {} g.scan = null; }
    if (g.targetEl) { try { g.targetEl.remove(); } catch (e) {} g.targetEl = null; }
    if (g.fxRun) { try { _egNkKillRun(g.fxRun); } catch (e) {} g.fxRun = null; }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    document.body.classList.remove('eg-mz-flash');
    document.querySelectorAll('.eg-mz-panicking').forEach(el => el.classList.remove('eg-mz-panicking'));

    const m = (g.monsterId && typeof _egMonsters !== 'undefined')
        ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _egBossScheduleMechanics === 'function') {
            try { _egBossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
    }
    if (_egMzFinal === g) _egMzFinal = null;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body class this boss ever created.
function _egMzTeardown() {
    if (_egMzFinal) { try { _egMzFinalEnd(_egMzFinal); } catch (e) {} _egMzFinal = null; }
    document.querySelectorAll('.eg-mz-ghost, .eg-mz-dotwall, .eg-mz-mazewall, .eg-mz-eyes, ' +
        '.eg-mz-dark, .eg-mz-target, .eg-mz-scan, .eg-mz-cd, .eg-mz-spooks').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.body.classList.remove('eg-mz-flash');
    document.querySelectorAll('.eg-mz-panicking').forEach(el => el.classList.remove('eg-mz-panicking'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_MZ_DEBUG.fire('gang'|'walls'|'labyrinth'|'dark') — runs one now
//   _EG_MZ_DEBUG.final()                                 — GAME OVER now
if (typeof window !== 'undefined') {
    window._EG_MZ_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_maze') : null;
            if (!monster) return 'no maze alive';
            const fn = name === 'gang' ? _egMechMzGhostGang
                : name === 'walls' ? _egMechMzDotWalls
                : name === 'labyrinth' ? _egMechMzMazeWalls
                : name === 'dark' ? _egMechMzLightsOut : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'dark' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_maze') : null;
            if (!monster) return 'no maze alive';
            _egMzFinalStart(monster);
            return 'GAME OVER started';
        },
    };
}
