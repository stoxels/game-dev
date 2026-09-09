//------------------------------------------------------------------------
//-------------------BOSS: THE MINOTAUR (boss_minotaur)-------------------------
//------------------------------------------------------------------------
// TIER 8 REWORK — "The Labyrinth's Warden". The bull-rush soul, weaponised
// into a full labyrinth duel: walls rise to MAKE the maze, the bull runs
// the lanes it creates, and the thread you follow is the fight. Element:
// null — pure physical, resists do nothing (the Colossus precedent).
//
//   • LABYRINTH WALLS + CHARGES (signature, all fight) — 5–6 labyrinth
//     walls rise from the floor (telegraphed slabs) and hold for ~8s. Each
//     charge, the Minotaur locks onto the open lane that matches your
//     current row/column and BULL-RUSHES down it — the maze channels the
//     charge, so the walls are both cover and deathtrap. Phase 3: double
//     rushes per cast, and the walls grow an extra row.
//   • HOOFTREAD TERRAIN (60%) — every charge leaves HOOF CRATERS along its
//     lane (small impact rings that plant lingering hoofprint hazards) and
//     a DUST STORM trails the bull for a few seconds (burn lane). The maze
//     accumulates terrain the longer the duel runs.
//   • THREAD OF ARIADNE (60%) — a glowing thread marks the ONE SAFE LANE
//     through the current walls. It is honest — and it is bait: standing
//     in the thread when the charge comes keeps you safe, but the thread
//     then snaps and re-forms elsewhere for the next charge (the maze is
//     never solved twice). Read it fast, move through it, do not live in it.
//   • 🐂 THE WARDEN'S LABYRINTH (≤10%, one-shot finale) — the final maze:
//     three wall generations rise one after another while the Warden
//     charges each generation TWICE. Break the maze: three MAZEWALL
//     STONES glow in the walls — body-check a lit stone 3× to shatter it
//     (each shatter shortens the next generation's wall set). Shatter all
//     three before the TRAMPLE — the last charge runs EVERY lane at once
//     and only shattered lanes are safe. Charge bar frozen (gate in
//     _egTickPlayer via _egMntFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock, so
// gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (fog_bank, prior_bomb) live in shared-boss-abilities.js
// and are referenced by handler-name string.
//------------------------------------------------------------------------

// DEBUG: slow The Minotaur's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Flip to false for ship.
const _EG_MNT_DEBUG_SLOW = true;
const _EG_MNT_DEBUG_MULT = _EG_MNT_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_minotaur: {
        id: 'boss_minotaur', name: 'The Minotaur', emoji: '🐂',
        baseHP: 1140, baseDamage: 25, chargeMax: 13,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_minotaur — "The Labyrinth's Warden" (rework)
    // Phase 1 (100% → 60%): Labyrinth Walls + Charges / Prior Bomb
    // Phase 2 ( 60% → 30%): immune window; Hooftread Terrain + Thread of
    //                        Ariadne join
    // Phase 3 ( 30% →  0%): double charges per cast; at 10% THE WARDEN'S
    //                        LABYRINTH begins
    boss_minotaur: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'labyrinth_walls', intervalBase: 19000, intervalVariance: 4500, handler: '_egMechMntLabyrinth' },
            { name: 'prior_bomb', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
            { name: 'hooftread_terrain', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechMntHoofterrain', phase2Only: true },
            { name: 'thread_of_ariadne', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechMntThread', phase2Only: true },
        ],
        onPhaseEnter: _egMntOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_MNT_TOUCH_CD_MS = 700;      // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Minotaur hazards. Elementless boss —
// hits go in with element null (pure physical) and keep the amber
// signature color via EG_NK_BOSS_SIGNATURE_COLORS.
let _egMntHitCd = 0;
function _egMntTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egMntHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egMntHitCd = now + EG_MNT_TOUCH_CD_MS;
    const dealt = _egNkHit(pct, null, level);
    _egNkAbilityHitToast(dealt, 'The Minotaur', label);
    return true;
}

// Player centre with a screen-centre fallback.
function _egMntPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Proven reward pattern (Siren echo zones / Swarm royal jelly): heals go
// through a guarded clamp + rerender.
function _egMntHeal(amount) {
    if (typeof playerCurrentHP === 'undefined') return;
    const before = playerCurrentHP;
    playerCurrentHP = Math.min(playerMaxHP || before, before + amount);
    if (playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: LABYRINTH WALLS + CHARGES (all fight)------
//------------------------------------------------------------------------
// 5–6 telegraphed wall slabs rise and hold ~8s, partitioning the arena
// into lanes. Each cast, the Warden charges the open lane matching your
// current row (alternating from left/right). Walls block the charge line
// only in the sense that they DEFINE it — the lane between two walls is
// where the bull runs. Phase 3: two charges per cast, extra wall row.
//
// The walls also hook into the charge path: a wall slab hit by the bull
// CRUMBLES (it charges through its own maze, one wall per rush), so the
// arena slowly opens up again.
const EG_MNT_WALL_W      = 26;       // slab thickness (px)
const EG_MNT_WALL_RISE_MS = 1000;    // telegraph before the slab turns solid
const EG_MNT_WALL_HOLD_MS = 8000;    // how long walls stand
const EG_MNT_CHARGE_WARN_MS = 1100;  // dust-line telegraph before each rush
const EG_MNT_CHARGE_SPD  = 950;      // px/s
const EG_MNT_LANE_H      = 90;       // charge lane height (px)
const EG_MNT_RUSH_DMG    = [0, 0.24, 0.28, 0.34]; // %maxHP caught by the bull
const EG_MNT_WALL_BREAK_DMG = 0.06;  // %maxHP clipped by a crumbling wall

function _egMechMntLabyrinth(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_mnt_labyrinth', '🐂🧱 LABYRINTH — walls rise and the bull runs the lanes!', '#fbbf24');

    // ── Walls: vertical slabs at spread x positions. ────────────────────
    const wallN = p >= 3 ? 6 : 5;
    const walls = [];
    for (let i = 0; i < wallN; i++) {
        const wx = W * (0.14 + (i + 0.5) / wallN * 0.72);
        const wy = H * (0.16 + Math.random() * 0.62);
        const h = H * (p >= 3 ? 0.34 : 0.28);
        const el = _egNkEl(run, 'div', 'eg-mnt-wall-rise');
        el.style.left = Math.round(wx - EG_MNT_WALL_W / 2) + 'px';
        el.style.top = Math.round(wy - h / 2) + 'px';
        el.style.width = EG_MNT_WALL_W + 'px';
        el.style.height = Math.round(h) + 'px';
        walls.push({ x: wx, y: wy, h, el, solid: false, broken: false });
    }

    // ── Charges: lane lock + bull rush down your row. ───────────────────
    const rushes = p >= 3 ? 2 : 1;
    let rushIdx = 0;
    let stage = 'walls';   // walls → warn → dash → gap (per rush)
    let t = 0;
    let dir = 1, laneY = 0;
    let lineEl = null, bullEl = null, bx = 0, hitDone = false;
    let wallsBrokenThisRush = 0;

    const clearRushEls = () => {
        if (lineEl) { try { lineEl.remove(); } catch (e) {} lineEl = null; }
        if (bullEl) { try { bullEl.remove(); } catch (e) {} bullEl = null; }
    };

    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _egNkPlayerRect();
        const pc = _egMntPC();

        // Walls rise → solid → hold → crumble at end of life.
        for (const wl of walls) {
            if (wl.broken) continue;
            if (!wl.solid && t >= EG_MNT_WALL_RISE_MS * _EG_MNT_DEBUG_MULT) {
                wl.solid = true;
                wl.el.classList.remove('eg-mnt-wall-rise');
                wl.el.classList.add('eg-mnt-wall');
            }
        }

        if (stage === 'walls') {
            if (t >= EG_MNT_WALL_RISE_MS * _EG_MNT_DEBUG_MULT + 200) {
                stage = 'warn'; t = 0;
                // Lane lock: your current row, alternating direction.
                laneY = Math.max(EG_MNT_LANE_H / 2 + 16, Math.min(H - EG_MNT_LANE_H / 2 - 16, pc.y));
                dir = rushIdx % 2 === 0 ? 1 : -1;
                lineEl = _egNkEl(run, 'div', 'eg-nk-band eg-mnt-lane');
                lineEl.style.top = Math.round(laneY - EG_MNT_LANE_H / 2) + 'px';
                lineEl.style.height = EG_MNT_LANE_H + 'px';
            }
        } else if (stage === 'warn') {
            if (t >= EG_MNT_CHARGE_WARN_MS * _EG_MNT_DEBUG_MULT) {
                stage = 'dash'; t = 0;
                if (lineEl) {
                    lineEl.classList.add('eg-nk-band-hit');
                    _egNkSlamShatter(lineEl, run);
                }
                bx = dir > 0 ? -90 : W + 90;
                bullEl = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-charger', '🐂');
                hitDone = false;
                wallsBrokenThisRush = 0;
            }
        } else if (stage === 'dash') {
            bx += dir * EG_MNT_CHARGE_SPD * dtS;
            if (bullEl) {
                bullEl.style.transform = 'translate(' + Math.round(bx - 35) + 'px,' + Math.round(laneY - 35) + 'px)';
                if (dir < 0) bullEl.style.scale = '-1 1';
            }
            // Bull hit.
            if (!hitDone && pr && pr.right > bx - 35 && pr.left < bx + 35
                && pr.bottom > laneY - EG_MNT_LANE_H / 2 && pr.top < laneY + EG_MNT_LANE_H / 2) {
                hitDone = true;
                const dealt = _egNkHit(EG_MNT_RUSH_DMG[p], null, level);
                _egNkAbilityHitToast(dealt, 'The Minotaur', 'Labyrinth Charge');
            }
            // The bull crumbles ONE wall on its path (its own maze, one gate).
            for (const wl of walls) {
                if (wl.broken || !wl.solid) continue;
                const wlTop = wl.y - wl.h / 2, wlBot = wl.y + wl.h / 2;
                if (laneY > wlTop - EG_MNT_LANE_H / 2 && laneY < wlBot + EG_MNT_LANE_H / 2
                    && Math.abs(bx - wl.x) < 40) {
                    wl.broken = true;
                    wallsBrokenThisRush++;
                    wl.el.classList.remove('eg-mnt-wall');
                    wl.el.classList.add('eg-mnt-wall-crumble');
                    // Shrapnel clip: standing beside a crumbling wall stings.
                    if (pr && Math.hypot(pc.x - wl.x, pc.y - wl.y) < 120) {
                        _egMntTouch(EG_MNT_WALL_BREAK_DMG, level, 'Crumbling Wall');
                    }
                    setTimeout(() => { try { wl.el.remove(); } catch (e) {} }, 600 * _EG_MNT_DEBUG_MULT);
                    break;   // one wall per rush
                }
            }
            const done = dir > 0 ? bx > W + 90 : bx < -90;
            if (done) {
                clearRushEls();
                stage = 'gap'; t = 0;
                rushIdx++;
            }
        } else if (stage === 'gap') {
            if (t >= 700) {
                if (rushIdx >= rushes) {
                    // Walls crumble at the end of the cast.
                    walls.forEach(wl => { if (!wl.broken) { try { wl.el.remove(); } catch (e) {} } });
                    return false;
                }
                stage = 'warn'; t = 0;
                laneY = Math.max(EG_MNT_LANE_H / 2 + 16, Math.min(H - EG_MNT_LANE_H / 2 - 16, pc.y));
                dir = rushIdx % 2 === 0 ? 1 : -1;
                lineEl = _egNkEl(run, 'div', 'eg-nk-band eg-mnt-lane');
                lineEl.style.top = Math.round(laneY - EG_MNT_LANE_H / 2) + 'px';
                lineEl.style.height = EG_MNT_LANE_H + 'px';
            }
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: HOOFTREAD TERRAIN (60%)-----------------------
//------------------------------------------------------------------------
// Every charge leaves hoof craters along its lane (impact rings that plant
// lingering hoofprint hazards) plus a DUST STORM that trails the bull. The
// maze accumulates burn terrain the longer the duel runs.
const EG_MNT_CRATERS     = 5;
const EG_MNT_CRATER_WARN_MS = 1200;
const EG_MNT_CRATER_DMG  = [0, 0.12, 0.14, 0.16];  // %maxHP caught in a crater
const EG_MNT_DUST_DPS    = [0, 4.5, 5.5, 6.5];     // %/s standing in the dust storm
const EG_MNT_DUST_LIFE   = 4200;                   // ms the dust storm lingers

function _egMechMntHoofterrain(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_mnt_hoof', '🐂💥 HOOFTREAD — hoof craters and a dust storm tear the lane!', '#fbbf24');

    // A lane across the arena through your current row.
    const pc = _egMntPC();
    const laneY = Math.max(EG_MNT_LANE_H / 2 + 16, Math.min(H - EG_MNT_LANE_H / 2 - 16, pc.y));
    const dir = Math.random() < 0.5 ? 1 : -1;

    // Hoof craters stamp down the lane in sequence (the bull's stride).
    const craters = [];
    for (let i = 0; i < EG_MNT_CRATERS; i++) {
        const cx = dir > 0 ? W * (0.12 + i / (EG_MNT_CRATERS - 1) * 0.76)
                           : W * (0.88 - i / (EG_MNT_CRATERS - 1) * 0.76);
        const cy = laneY + (Math.random() * 60 - 30);
        const warn = _egNkEl(run, 'div', 'eg-mnt-crater-warn');
        warn.style.left = Math.round(cx - 44) + 'px';
        warn.style.top = Math.round(cy - 44) + 'px';
        craters.push({ x: cx, y: cy, warn, born: performance.now() + i * 260 * _EG_MNT_DEBUG_MULT, struck: false, print: null });
    }

    // The dust storm drifts down the lane behind the craters.
    const dust = _egNkEl(run, 'div', 'eg-mnt-dust');
    dust.style.top = Math.round(laneY - 70) + 'px';
    dust.style.height = '140px';
    let dustX = dir > 0 ? -260 : W + 260;
    let dustT = 0;

    _egNkLoop(run, (dtS, now) => {
        const pr = _egNkPlayerRect();
        const pc = _egMntPC();
        let pending = false;

        // Craters: warn → stamp → hoofprint lingers.
        for (const c of craters) {
            if (c.struck) {
                // Hoofprint hazard ticks while you stand in it, then fades.
                if (c.print && now < c.printUntil) {
                    pending = true;
                    if (pr && _egNkCircleHit(c.x, c.y, 44, pr, 0)) {
                        _egNkDotTick(run, 3.5, dtS, level, null);
                    } else {
                        run.dotAcc = 0;
                    }
                }
                continue;
            }
            if (now < c.born) { pending = true; continue; }
            pending = true;
            if (now >= c.born + EG_MNT_CRATER_WARN_MS * _EG_MNT_DEBUG_MULT) {
                c.struck = true;
                try { c.warn.remove(); } catch (e) {}
                c.warn = null;
                const boom = _egNkEl(run, 'div', 'eg-mnt-crater-boom');
                boom.style.left = Math.round(c.x - 44) + 'px';
                boom.style.top = Math.round(c.y - 44) + 'px';
                setTimeout(() => { try { boom.remove(); } catch (e) {} }, 500 * _EG_MNT_DEBUG_MULT);
                if (pr && _egNkCircleHit(c.x, c.y, 44, pr, 0)) {
                    _egMntTouch(EG_MNT_CRATER_DMG[p], level, 'Hoof Crater');
                }
                // The hoofprint lingers as a small burn patch.
                c.print = _egNkEl(run, 'div', 'eg-mnt-hoofprint');
                c.print.style.left = Math.round(c.x - 34) + 'px';
                c.print.style.top = Math.round(c.y - 34) + 'px';
                c.printUntil = now + 6000 * _EG_MNT_DEBUG_MULT;
            }
        }

        // Dust storm drifts down the lane, burning inside.
        dustT += dtS * 1000;
        dustX += dir * 260 * dtS;
        dust.style.left = Math.round(dustX) + 'px';
        dust.style.width = '260px';
        if (dustT < EG_MNT_DUST_LIFE * _EG_MNT_DEBUG_MULT) {
            pending = true;
            if (pr && pc.x > dustX && pc.x < dustX + 260 && Math.abs(pc.y - laneY) < 70) {
                _egNkDotTick(run, EG_MNT_DUST_DPS[p], dtS, level, null);
            } else {
                run.dotAcc = 0;
            }
        } else {
            try { dust.remove(); } catch (e) {}
        }

        // Hoofprints + dust keep the run alive until every part is done.
        const anyPending = craters.some(c => !c.struck) ||
            craters.some(c => c.print && now < c.printUntil) ||
            dustT < EG_MNT_DUST_LIFE * _EG_MNT_DEBUG_MULT;
        return anyPending;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: THREAD OF ARIADNE (60%)-----------------------
//------------------------------------------------------------------------
// A glowing thread marks the ONE SAFE LANE through the current walls —
// honest, and bait: it snaps and re-forms elsewhere after each charge.
const EG_MNT_THREAD_LIFE = 6000;   // ms the thread stays honest
const EG_MNT_THREAD_HEAL = 0.06;   // %maxHP one-time hold reward

function _egMechMntThread(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_mnt_thread', '🧵 THREAD OF ARIADNE — the safe lane is marked. Trust it, but never live in it!', '#ffd166');

    // The thread: a horizontal lane at a random height (NOT your current row
    // — the maze is never solved twice; you must travel to it).
    const threadY = H * (0.2 + Math.random() * 0.6);
    const thread = _egNkEl(run, 'div', 'eg-mnt-thread');
    thread.style.top = Math.round(threadY - 22) + 'px';
    thread.style.height = '44px';

    let t = 0, rewardTaken = false;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _egNkPlayerRect();
        const pc = _egMntPC();
        const inThread = pr && Math.abs(pc.y - threadY) < 22;
        if (inThread && !rewardTaken) {
            rewardTaken = true;
            thread.classList.add('eg-mnt-thread-held');
            _egMntHeal(_egNkMaxHP() * EG_MNT_THREAD_HEAL);
            _egNkToast('eg_mech_mnt_thread_safe', '🧵 The thread holds you — one safe crossing!', '#4ade80');
        }
        // The thread frays as its life runs out.
        if (t > EG_MNT_THREAD_LIFE * _EG_MNT_DEBUG_MULT * 0.7) {
            thread.classList.add('eg-mnt-thread-fray');
        }
        if (t >= EG_MNT_THREAD_LIFE * _EG_MNT_DEBUG_MULT) {
            thread.classList.add('eg-mnt-thread-snap');
            setTimeout(() => { try { thread.remove(); } catch (e) {} }, 450);
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: THE WARDEN'S LABYRINTH (≤10%, one-shot)-------
//------------------------------------------------------------------------
// The final maze: three wall generations rise one after another while the
// Warden charges each generation TWICE. Three MAZEWALL STONES glow in the
// walls — body-check a lit stone 3× to shatter it (each shatter shortens
// the next generation). Shatter all three before the TRAMPLE — the last
// charge runs EVERY lane at once and only shattered lanes are safe. Charge
// bar frozen (gate in _egTickPlayer via _egMntFinalActive).
const EG_MNT_GENWALLS   = 3;      // wall generations
const EG_MNT_STONES     = 3;      // mazewall stones to shatter
const EG_MNT_STONE_HP   = 3;      // body-checks per stone
const EG_MNT_STONE_HIT_R = 62;    // body-check radius
const EG_MNT_TRAMPLE_DMG = 0.35;  // %maxHP caught by the final trample

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egMntFinal = null;

function _egMntFinalActive() {
    return !!_egMntFinal && !_egMntFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egMntOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egMntStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egMntStartFinalWatcher(monster) {
    if (!monster || _egMntFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egMntFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egMntFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout (mirrors the other finales).
function _egMntAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egMntFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

function _egMntFinalStart(monster) {
    if (_egMntFinal || !monster) return;

    // The warden clears the arena for the final maze: kill every other run
    // of this boss (the finale owns the board).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        gen: 0,
        stones: [],          // { x, y, el, hp, shattered }
        fxRun: null, overlay: null,
    };
    _egMntFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-mnt-cd';
    ov.innerHTML =
        '<div class="eg-mnt-cd-label">🐂 THE WARDEN\u2019S LABYRINTH</div>' +
        '<div class="eg-mnt-cd-hint">Body-check the glowing MAZEWALL STONES 3× each — shattered lanes are the only safe ground for the TRAMPLE!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_mnt_final_cd', '🐂💀 THE WARDEN\u2019S LABYRINTH — shatter the stones before the TRAMPLE!', '#fbbf24');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the warden's horns while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-mnt-allin');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;

    // ── One wall generation: walls + a lit stone + two charges. ──────────
    const runGeneration = () => {
        if (g.finished) return;
        g.gen++;
        if (g.gen > EG_MNT_GENWALLS || g.stones.filter(s => s.shattered).length >= EG_MNT_STONES) {
            runTrample();
            return;
        }
        _egNkToast('eg_mech_mnt_gen', '🐂 Generation ' + g.gen + '/' + EG_MNT_GENWALLS + ' — the maze rises again!', '#fbbf24');

        // Walls for this generation (fewer as stones shatter).
        const shattered = g.stones.filter(s => s.shattered).length;
        const wallN = Math.max(2, 5 - shattered);
        const genRun = _egNkNewRun(monster.id, true);
        const walls = [];
        for (let i = 0; i < wallN; i++) {
            const wx = W * (0.14 + (i + 0.5) / wallN * 0.72);
            const wy = H * (0.16 + Math.random() * 0.62);
            const h = H * 0.3;
            const el = _egNkEl(genRun, 'div', 'eg-mnt-wall-rise');
            el.style.left = Math.round(wx - EG_MNT_WALL_W / 2) + 'px';
            el.style.top = Math.round(wy - h / 2) + 'px';
            el.style.width = EG_MNT_WALL_W + 'px';
            el.style.height = Math.round(h) + 'px';
            walls.push({ x: wx, y: wy, h, el });
        }

        // A lit mazewall stone anchors one wall (body-check target).
        const stoneX = W * (0.25 + Math.random() * 0.5);
        const stoneY = H * (0.25 + Math.random() * 0.5);
        const stoneEl = _egNkEl(genRun, 'div', 'eg-mnt-stone', '🪨');
        stoneEl.style.left = Math.round(stoneX - EG_MNT_STONE_HIT_R) + 'px';
        stoneEl.style.top = Math.round(stoneY - EG_MNT_STONE_HIT_R) + 'px';
        stoneEl.style.width = (EG_MNT_STONE_HIT_R * 2) + 'px';
        stoneEl.style.height = (EG_MNT_STONE_HIT_R * 2) + 'px';
        const stone = { x: stoneX, y: stoneY, el: stoneEl, hp: EG_MNT_STONE_HP, shattered: false };
        g.stones.push(stone);

        // Two charges per generation.
        let charge = 0;
        let stage = 'rise';
        let t = 0, dir = 1, laneY = 0;
        let lineEl = null, bullEl = null, bx = 0, hitDone = false;

        const clearRushEls = () => {
            if (lineEl) { try { lineEl.remove(); } catch (e) {} lineEl = null; }
            if (bullEl) { try { bullEl.remove(); } catch (e) {} bullEl = null; }
        };

        _egNkLoop(genRun, (dtS, now) => {
            if (g.finished) return false;
            t += dtS * 1000;
            const pr = _egNkPlayerRect();
            const pc = _egMntPC();

            // Stone body-check watch (any time during the generation).
            // Body-checks respect a short cooldown so the stone needs three
            // deliberate visits, not three frames inside its ring.
            if (!stone.shattered && pr && Math.hypot(pc.x - stone.x, pc.y - stone.y) < EG_MNT_STONE_HIT_R
                && now >= (stone.lastHit || 0)) {
                stone.lastHit = now + 450 * _EG_MNT_DEBUG_MULT;
                stone.hp--;
                stone.el.classList.remove('eg-mnt-stone-hit');
                void stone.el.offsetWidth;
                stone.el.classList.add('eg-mnt-stone-hit');
                if (stone.hp <= 0) {
                    stone.shattered = true;
                    stone.el.classList.add('eg-mnt-stone-shattered');
                    _egNkToast('eg_mech_mnt_stone', '🐂🪨 MAZEWALL STONE shattered! (' + g.stones.filter(s => s.shattered).length + '/' + EG_MNT_STONES + ')', '#4ade80');
                }
            }

            if (stage === 'rise') {
                if (t >= 1000 * _EG_MNT_DEBUG_MULT) { stage = 'warn'; t = 0; }
            } else if (stage === 'warn') {
                if (t >= EG_MNT_CHARGE_WARN_MS * _EG_MNT_DEBUG_MULT) {
                    stage = 'dash'; t = 0;
                    laneY = Math.max(EG_MNT_LANE_H / 2 + 16, Math.min(H - EG_MNT_LANE_H / 2 - 16, pc.y));
                    dir = charge % 2 === 0 ? 1 : -1;
                    lineEl = _egNkEl(genRun, 'div', 'eg-nk-band eg-mnt-lane');
                    lineEl.style.top = Math.round(laneY - EG_MNT_LANE_H / 2) + 'px';
                    lineEl.style.height = EG_MNT_LANE_H + 'px';
                    bx = dir > 0 ? -90 : W + 90;
                    bullEl = _egNkEl(genRun, 'div', 'eg-nk-dot eg-nk-charger', '🐂');
                    hitDone = false;
                }
            } else if (stage === 'dash') {
                bx += dir * EG_MNT_CHARGE_SPD * dtS;
                if (bullEl) {
                    bullEl.style.transform = 'translate(' + Math.round(bx - 35) + 'px,' + Math.round(laneY - 35) + 'px)';
                    if (dir < 0) bullEl.style.scale = '-1 1';
                }
                if (!hitDone && pr && pr.right > bx - 35 && pr.left < bx + 35
                    && pr.bottom > laneY - EG_MNT_LANE_H / 2 && pr.top < laneY + EG_MNT_LANE_H / 2) {
                    hitDone = true;
                    const dealt = _egNkHit(0.26, null, level);
                    _egNkAbilityHitToast(dealt, 'The Minotaur', 'Warden\u2019s Charge');
                }
                const done = dir > 0 ? bx > W + 90 : bx < -90;
                if (done) {
                    clearRushEls();
                    charge++;
                    if (charge >= 2) {
                        // Generation ends → the walls crumble.
                        walls.forEach(wl => { try { wl.el.remove(); } catch (e) {} });
                        stone.el.classList.remove('eg-mnt-stone');
                        if (!stone.shattered) stone.el.classList.add('eg-mnt-stone-dim');
                        _egMntAfter(g, 700 * _EG_MNT_DEBUG_MULT, () => {
                            if (!g.finished) runGeneration();
                        });
                        return false;
                    }
                    stage = 'warn'; t = 0;
                }
            }
            return true;
        });
    };

    // ── THE TRAMPLE: every lane runs at once — shattered lanes are safe. ──
    const runTrample = () => {
        if (g.finished) return;
        _egNkToast('eg_mech_mnt_trample', '🐂💀 THE TRAMPLE — every lane runs at once. Shattered lanes are SAFE!', '#fbbf24');
        const lanes = 7;
        const laneH = H / lanes;
        const shattered = g.stones.filter(s => s.shattered).length;
        // Safe lanes = one per shattered stone, else only the centre lane.
        const safeLanes = [];
        if (shattered > 0) {
            const pool = [];
            for (let i = 0; i < lanes; i++) pool.push(i);
            for (let i = 0; i < Math.min(shattered, lanes - 1); i++) {
                const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
                safeLanes.push(pick);
            }
        } else {
            safeLanes.push(Math.floor(lanes / 2));
        }

        const laneEls = [];
        for (let i = 0; i < lanes; i++) {
            const isSafe = safeLanes.includes(i);
            const el = _egNkEl(g.fxRun, 'div', 'eg-mnt-trample-lane' + (isSafe ? ' eg-mnt-trample-safe' : ''));
            el.style.left = '0px';
            el.style.top = Math.round(i * laneH) + 'px';
            el.style.width = W + 'px';
            el.style.height = Math.ceil(laneH) + 'px';
            laneEls.push({ i, isSafe, el, y: i * laneH + laneH / 2, hh: laneH / 2 });
        }

        _egMntAfter(g, 2600 * _EG_MNT_DEBUG_MULT, () => {
            if (g.finished) return;
            laneEls.forEach(l => { if (!l.isSafe) l.el.classList.add('eg-mnt-trample-hot'); });
            const pc = _egMntPC();
            let caught = true;
            for (const l of laneEls) {
                if (!l.isSafe) continue;
                if (Math.abs(pc.y - l.y) < l.hh) { caught = false; break; }
            }
            if (caught) {
                const dealt = _egNkHit(EG_MNT_TRAMPLE_DMG, null, level);
                _egNkAbilityHitToast(dealt, 'The Minotaur', 'The Trample');
            }
            _egMntAfter(g, 1400 * _EG_MNT_DEBUG_MULT, () => {
                _egMntFinalEnd(g, monster);
            });
        });
    };

    runGeneration();
}

// Ends the finale: releases immunity + charge bar and cleans the board.
function _egMntFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _egNkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.eg-mnt-cd, .eg-mnt-trample-lane').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('eg-mnt-allin');
        wrap.classList.remove('eg-nk-shielded');
    }
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
// removes every run element, overlay and body class this boss ever created.
function _egMntTeardown() {
    if (_egMntFinal) { try { _egMntFinalEnd(_egMntFinal, null); } catch (e) {} _egMntFinal = null; }
    document.querySelectorAll('.eg-mnt-wall-rise, .eg-mnt-wall, .eg-mnt-wall-crumble, .eg-mnt-lane, ' +
        '.eg-mnt-crater-warn, .eg-mnt-crater-boom, .eg-mnt-hoofprint, .eg-mnt-dust, ' +
        '.eg-mnt-thread, .eg-mnt-stone, .eg-mnt-trample-lane, .eg-mnt-cd').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-mnt-allin').forEach(el => el.classList.remove('eg-mnt-allin'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_MNT_DEBUG.fire('labyrinth'|'hoof'|'thread', phase) — runs one now
//   _EG_MNT_DEBUG.final()                                  — THE WARDEN'S LABYRINTH now
if (typeof window !== 'undefined') {
    window._EG_MNT_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_minotaur') : null;
            if (!monster) return 'no minotaur alive';
            const fn = name === 'labyrinth' ? _egMechMntLabyrinth
                : name === 'hoof' ? _egMechMntHoofterrain
                : name === 'thread' ? _egMechMntThread : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'thread' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_minotaur') : null;
            if (!monster) return 'no minotaur alive';
            _egMntFinalStart(monster);
            return 'THE WARDEN\u2019S LABYRINTH started';
        },
    };
}
