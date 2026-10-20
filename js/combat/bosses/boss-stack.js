import { Audio_Manager } from '../../audio/audio.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFlingAvatar, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkToast, _nkWatchFinale } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE STACK (boss_stack)--------------------------
//------------------------------------------------------------------------
// Living-tetromino construction siege - GRAVITY is the fight: drifting core
// stack, SOFT DROP terrain, HARD DROP at 60%, LINE CLEAR bands at 30%, and
// the GARBAGE RISE charge attack, and TOP OUT (shared finale waves) at ≤10%.
// One _nkLoop drives every state machine.
//
// Shared mechanics (fog_bank in shared-puzzle-mechanics.js, probability_shift
// in shared-boss-abilities.js) are referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_stack: {
        id: 'boss_stack', name: 'The Stack', emoji: '🧩',
        baseHP: 1080, baseDamage: 22, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_stack: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            // (The Stack's charge attack is the Garbage Rise.)
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            // Kept for schedule compatibility - the persistent watcher now
            // owns the soft-drop cadence; the handler no-ops (same shim
            // pattern as the other reworked bosses).
            { name: 'block_fall', intervalBase: 21000, intervalVariance: 5000, handler: '_mechBlockFall' },
            { name: 'fog_bank', intervalBase: 22000, intervalVariance: 5000, handler: '_mechFogBank' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_mechProbabilityShift' },
        ],
        onInit: (m) => { _stackArenaInit(m); _nkWatchFinale(m, STK_FINALE); },
    },
});

// TOP OUT finale (shared waves): the board fills to the top.
const STK_FINALE = {
    name: 'The Stack', title: '🧩 TOP OUT', element: null, cls: 'sx-nk-fin-stack', color: '#a5b4fc',
    toastKey: 'eg_stk_final',
    hint: 'The board is full - read each circle!',
    waves: [
        { kind: 'avoid', ms: 2200, dmg: 0.16, extra: 2, label: 'Top Out' },
        { kind: 'shelter', ms: 2800, dmg: 0.22, label: 'Top Out' },
        { kind: 'avoid', ms: 2000, dmg: 0.16, extra: 4, label: 'Top Out' },
        { kind: 'shelter', ms: 2600, dmg: 0.28, label: 'GAME OVER' },
    ],
};


// ── Construction tuning ──────────────────────────────────────────────────
export const STK_CELL = 46;                       // tetromino cell px
// The Core Stack (boss body)
export const STK_DRIFT_SPEED = [0, 22, 32, 44];   // px/s per phase
export const STK_DRIFT_REPICK_MS = 5400;
export const STK_SLAM_DMG = [0, 0.06, 0.07, 0.09]; // %maxHP touching the core
export const STK_SLAM_CD_MS = 1000;
export const STK_SLAM_FLING = [0, 135, 160, 185];
// Soft drop (persistent cadence)
export const STK_SOFT_EVERY_MS = [0, 5200, 4300, 3400];
export const STK_PIECE_FALL = 300;                // px/s soft-drop fall speed
export const STK_LAND_R = 84;                     // landing burst radius
export const STK_LAND_DMG = 0.06;                 // %maxHP landing burst
export const STK_FLOOR_DMG = 0.045;               // %maxHP touching floor terrain
export const STK_FLOOR_TTL = 3000;                // floor terrain lifetime
// Hard Drop (60% gate)
export const STK_HD_N = 3;                        // sequential giant pieces
export const STK_HD_WARN_MS = 900;
export const STK_HD_FALL = 520;                   // px/s - much faster than soft
export const STK_HD_SHOCK_R = 175;                // landing shockwave radius
export const STK_HD_DMG = [0, 0.13, 0.15, 0.18];
export const STK_HD_FLING = [0, 160, 185, 210];
export const STK_HD_GAP_MS = 1500;
export const STK_HD_FLOOR_TTL = 2400;
// Line Clear (30% gate)
export const STK_LC_ROWS = 4;
export const STK_LC_ROW_H = 66;
export const STK_LC_WARN_MS = 1000;
export const STK_LC_DET_MS = 260;                 // detonation flash window
export const STK_LC_DMG = [0, 0.14, 0.16, 0.19];
export const STK_LC_GAP_MS = 1350;
// Garbage Rise (charge attack)
export const STK_GR_RISE_MS = 2800;               // bottom → flood height
export const STK_GR_HOLD_MS = 1700;
export const STK_GR_SINK_MS = 1100;
export const STK_GR_FLOOD = 0.55;                 // fraction of screen height
export const STK_GR_TOP_CAP = 0.16;               // never rise above this fraction
export const STK_GR_DMG = [0, 0.08, 0.10, 0.12];  // per grind tick
export const STK_GR_TICK_MS = 700;
export const STK_GR_FLING_UP = [0, 210, 235, 260];


// Tetromino palette (classic 7).
export const STK_COLORS = ['#22d3ee', '#3b82f6', '#f97316', '#facc15', '#22c55e', '#a855f7', '#ef4444'];


export let _stackWatcher = null; // per-fight build-site state

// Phase lookup helper - resolves the boss's current phase (default 1).
export function _stkPhase(st) {
    if (typeof _monsters !== 'undefined') {
        const m = globalThis._monsters.find(x => x && x.id === st.monsterId);
        if (m) return Math.max(1, Math.min(3, Number(m.bossPhase) || 1));
    }
    return 1;
}

// Removes every construction overlay (registered in boss-framework teardown).
export function _stackTeardown() {
    if (_stackWatcher) {
        const st = _stackWatcher;
        _stackWatcher = null;
        (st.warns || []).forEach(w => { try { if (w.el) w.el.remove(); } catch (e) {} });
        (st.pieces || []).forEach(pc => _stkRemoveCells(pc));
        (st.floors || []).forEach(f => _stkRemoveCells(f));
        (st.rows || []).forEach(r => { try { if (r.el) r.el.remove(); } catch (e) {} });
        (st.shocks || []).forEach(s => { try { if (s.el) s.el.remove(); } catch (e) {} });
        if (st.garbage) { try { if (st.garbage.els) st.garbage.els.forEach(g => g.remove()); } catch (e) {} }
        try { if (st.run) _nkKillRun(st.run); } catch (e) {} // removes the core
    }
    document.querySelectorAll('.sx-stk-core, .sx-stk-cell, .sx-stk-warn, .sx-stk-row, .sx-stk-shock, .sx-stk-shock-zone, .sx-stk-garbage').forEach(el => el.remove());
}

// Removes a piece's cell elements.
export function _stkRemoveCells(piece) {
    (piece.cells || []).forEach(cl => { try { if (cl.el) cl.el.remove(); } catch (e) {} });
}


// ── Persistent arena: the core, the drops, the terrain ──────────────────
export function _stackArenaInit(monster) {
    if (_stackWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        run: null,
        core: null,
        warns: [], pieces: [], floors: [],
        softAcc: 0,
        hard: null,
        rows: [], lineClear: null, lcTimer: 0, lcSpawned: 0,
        shocks: [],
        garbage: null,
        gate60Done: false, gate30Done: false,
        everLive: false, bornAt: performance.now(),
    };
    _stackWatcher = st;

    // Persistent watcher FIRST (elements must hang off a run).
    const run = _nkNewRun(monsterId, true);
    run.passive = true;
    run.onKill = () => { if (_stackWatcher === st) _stackWatcher = null; };
    st.run = run;

    // The Core Stack: a T-tetromino built from 4 cells.
    const coreEl = _nkEl(run, 'div', 'sx-stk-core');
    st.core = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.3,
        tx: window.innerWidth * 0.5, ty: window.innerHeight * 0.3,
        repickAt: STK_DRIFT_REPICK_MS, cdUntil: 0, cells: [], el: coreEl };
    // T shape: top row of 3 + one cell centered below.
    const tShape = [[0, 0], [1, 0], [2, 0], [1, 1]];
    const color = STK_COLORS[Math.floor(Math.random() * STK_COLORS.length)];
    tShape.forEach(([cx, cy]) => {
        const cell = document.createElement('div');
        cell.className = 'sx-stk-cell core';
        cell.style.background = color;
        cell.style.width = cell.style.height = (STK_CELL - 3) + 'px';
        coreEl.appendChild(cell);
        st.core.cells.push({ dx: cx * STK_CELL, dy: cy * STK_CELL, el: cell });
    });
    _stkPlaceCore(st);
    if (monster) st.everLive = true;

    _nkLoop(run, (dtS, now) => {
        if (_stackWatcher !== st) return false;
        const live = globalThis._monsters ? globalThis._monsters.find(m => m.id === st.monsterId) : null;
        if (!live) return false;
        const W = window.innerWidth, H = window.innerHeight;
        const c = _nkPlayerCenter();
        const pr = _nkPlayerRect();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // TOP OUT finale: the shared waves own the arena - sink the garbage
        // and drop the gate set-pieces.
        if (live._nkFinaleDone && live.bossImmune) {
            if (st.garbage && st.garbage.phase !== 'sink') { st.garbage.phase = 'sink'; st.garbage.t = 0; }
            if (st.hard && st.hard.ghost) { try { st.hard.ghost.remove(); } catch (e) {} }
            st.hard = null;
            st.lineClear = null;
        }

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _stkHardDrop(st, live); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _stkLineClear(st, live); }

        // ── The Core Stack: drift + STACK SLAM on touch ──
        const co = st.core;
        const garbageUp = st.garbage && st.garbage.phase !== 'sink';
        if (!garbageUp) { // the core rides the garbage while it floods
            co.repickAt -= dtS * 1000;
            const cdx = co.tx - co.x, cdy = co.ty - co.y;
            const cd = Math.hypot(cdx, cdy) || 1;
            const cstep = STK_DRIFT_SPEED[p] * dtS;
            if (cd <= cstep || co.repickAt <= 0) {
                co.tx = 80 + Math.random() * Math.max(60, W - 160);
                co.ty = 80 + Math.random() * Math.max(60, H - 240);
                co.repickAt = STK_DRIFT_REPICK_MS;
            } else {
                co.x += (cdx / cd) * cstep;
                co.y += (cdy / cd) * cstep;
            }
        }
        _stkPlaceCore(st);
        if (c && pr && now >= co.cdUntil && _stkCoreHit(st, pr)) {
            co.cdUntil = now + STK_SLAM_CD_MS;
            const dx = c.x - co.x - STK_CELL, dy = c.y - co.y - STK_CELL;
            const d = Math.hypot(dx, dy) || 1;
            _nkFlingAvatar((dx / d) * STK_SLAM_FLING[p], (dy / d) * STK_SLAM_FLING[p], co.x + STK_CELL, co.y + STK_CELL);
            const dealt = _nkHit(STK_SLAM_DMG[p], null, st.level);
            _nkAbilityHitToast(dealt, 'The Stack', 'Stack Slam');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_slam_impact', 'stk_thud'); } catch (e2) {}
        }

        // ── Soft drop cadence: warn column → piece falls → floor terrain ──
        st.softAcc += dtS * 1000;
        if (!st.hard && !live.bossImmune && st.softAcc >= STK_SOFT_EVERY_MS[p]) {
            st.softAcc = 0;
            _stkQueuePiece(st, W, 0, false);
        }
        // Warn columns: when elapsed, spawn the falling piece.
        for (let i = st.warns.length - 1; i >= 0; i--) {
            const w = st.warns[i];
            w.t += dtS * 1000;
            if (w.t < w.warnMs) continue;
            try { w.el.remove(); } catch (e) {}
            st.warns.splice(i, 1);
            st.pieces.push(_stkMakePiece(st, w.x, w.giant, w.shock));
        }
        // Falling pieces: gravity + landing.
        for (let i = st.pieces.length - 1; i >= 0; i--) {
            const pc = st.pieces[i];
            pc.y += pc.speed * dtS;
            const floorY = pc.floorY;
            if (pc.y >= floorY || pc.y > H) {
                // LAND: burst + become floor terrain.
                _stkRemoveCells(pc);
                st.pieces.splice(i, 1);
                _stkLand(st, pc, pr, p);
                continue;
            }
            pc.cells.forEach(cl => {
                cl.el.style.transform = 'translate(' + Math.round(pc.x + cl.dx) + 'px,' + Math.round(pc.y + cl.dy) + 'px)';
            });
            if (pr && now >= pc.hitCd && _stkPieceHit(pc, pr)) {
                pc.hitCd = now + 800;
                const dealt = _nkHit(pc.giant ? 0.09 : STK_LAND_DMG, null, st.level);
                _nkAbilityHitToast(dealt, 'The Stack', pc.giant ? 'Hard Drop' : 'Soft Drop');
            }
        }
        // Floor terrain: hazards with a lifetime.
        for (let i = st.floors.length - 1; i >= 0; i--) {
            const f = st.floors[i];
            f.t += dtS * 1000;
            f.cells.forEach(cl => { cl.el.style.opacity = String(Math.max(0.25, 1 - f.t / f.ttl)); });
            if (f.t >= f.ttl) { _stkRemoveCells(f); st.floors.splice(i, 1); continue; }
            if (pr && now >= f.hitCd && _stkCellsHit(f.cells, f.x, f.y, pr)) {
                f.hitCd = now + 900;
                const dealt = _nkHit(STK_FLOOR_DMG, null, st.level);
                _nkAbilityHitToast(dealt, 'The Stack', 'Terrain');
            }
        }
        // Landing shockwaves: expanding rings that damage once.
        for (let i = st.shocks.length - 1; i >= 0; i--) {
            const s = st.shocks[i];
            s.t += dtS * 1000;
            const k = s.t / s.dur;
            if (k >= 1) { try { s.el.remove(); } catch (e) {} st.shocks.splice(i, 1); continue; }
            const r = 30 + (s.r - 30) * k;
            s.el.style.width = s.el.style.height = Math.round(r * 2) + 'px';
            s.el.style.marginLeft = s.el.style.marginTop = (-r) + 'px';
            if (!s.hit) {
                const c2 = _nkPlayerCenter();
                if (c2 && Math.hypot(c2.x - s.x, c2.y - s.y) <= r) {
                    s.hit = true;
                    const dx = c2.x - s.x, dy = c2.y - s.y;
                    const d = Math.hypot(dx, dy) || 1;
                    _nkFlingAvatar((dx / d) * s.fling, (dy / d) * s.fling, s.x, s.y);
                    const dealt = _nkHit(s.dmg, null, st.level);
                    _nkAbilityHitToast(dealt, 'The Stack', s.label);
                }
            }
        }

        // ── Hard Drop (60% gate state machine) ──
        if (st.hard) {
            const hd = st.hard;
            hd.t += dtS * 1000;
            if (hd.phase === 'warn' && hd.t >= STK_HD_WARN_MS) {
                hd.phase = 'fall';
                const pc = _stkMakePiece(st, hd.x, true, true);
                pc.speed = STK_HD_FALL;
                st.pieces.push(pc);
            }
            if (hd.phase === 'fall') {
                if (st.pieces.every(pc2 => !pc2.giant)) { // landed (removal fires the shock)
                    hd.phase = 'gap';
                    hd.t = 0;
                }
            }
            if (hd.phase === 'gap' && hd.t >= STK_HD_GAP_MS) {
                hd.idx++;
                if (hd.idx >= STK_HD_N) {
                    st.hard = null;
                    _nkToast('eg_stk_hd_end', '🧱 The Stack sets its foundation.', '#93c5fd');
                } else {
                    const c3 = _nkPlayerCenter();
                    hd.x = c3 ? Math.max(20, Math.min(W - STK_CELL * 5 - 20, c3.x - STK_CELL * 2)) : W / 2 - STK_CELL * 2;
                    hd.phase = 'warn';
                    hd.t = 0;
                    if (hd.ghost) { try { hd.ghost.remove(); } catch (e) {} }
                    hd.ghost = _stkGhost(st, hd.x, hd.giantType);
                }
            }
        }

        // ── Line Clear (30% gate): rows warn then detonate ──
        if (st.lineClear) {
            st.lcTimer += dtS * 1000;
            if (st.lcSpawned < STK_LC_ROWS && st.lcTimer >= st.lcSpawned * STK_LC_GAP_MS) {
                _stkQueueRow(st, W, H);
                st.lcSpawned++;
            }
            if (st.lcSpawned >= STK_LC_ROWS && st.rows.length === 0) {
                st.lineClear = null;
                _nkToast('eg_stk_lc_end', '✨ Lines cleared. You were not one of them.', '#4ade80');
            }
        }
        for (let i = st.rows.length - 1; i >= 0; i--) {
            const r = st.rows[i];
            r.t += dtS * 1000;
            if (r.t < r.warnMs) {
                r.el.style.opacity = String(0.45 + 0.4 * Math.abs(Math.sin(r.t / 110)));
                continue;
            }
            if (!r.detonated) {
                r.detonated = true;
                r.el.classList.add('boom');
                const pr4 = _nkPlayerRect();
                if (pr4 && pr4.bottom > r.y && pr4.top < r.y + STK_LC_ROW_H) {
                    const dealt = _nkHit(r.dmg, null, st.level);
                    _nkAbilityHitToast(dealt, 'The Stack', 'Line Clear');
                }
                try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_slam_impact', 'stk_thud'); } catch (e) {}
            }
            if (r.t >= r.warnMs + STK_LC_DET_MS) {
                try { r.el.remove(); } catch (e) {}
                st.rows.splice(i, 1);
            }
        }

        // ── Garbage Rise (charge attack state machine) ──
        if (st.garbage) {
            const g = st.garbage;
            g.t += dtS * 1000;
            const floodPx = STK_GR_FLOOD * H;
            if (g.phase === 'rise') {
                const k = Math.min(1, g.t / STK_GR_RISE_MS);
                g.topY = H - floodPx * k;
                if (g.t >= STK_GR_RISE_MS) { g.phase = 'hold'; g.t = 0; }
            } else if (g.phase === 'hold') {
                // Flood crest wobbles slightly while held.
                g.topY = H - floodPx + Math.sin(g.t / 220) * 6;
                if (g.t >= STK_GR_HOLD_MS) { g.phase = 'sink'; g.t = 0; }
            } else {
                const k = Math.min(1, g.t / STK_GR_SINK_MS);
                g.topY = (H - floodPx) + floodPx * k;
                if (g.t >= STK_GR_SINK_MS) {
                    g.els.forEach(gel => { try { gel.remove(); } catch (e) {} });
                    st.garbage = null;
                    _nkToast('eg_stk_gr_end', '🧱 The garbage sinks back down.', '#93c5fd');
                }
            }
            if (st.garbage) {
                // Keep the flood below the top cap: at least TOP_CAP of the
                // screen stays clear even at full flood.
                const clearLine = H * STK_GR_TOP_CAP;
                const drawY = Math.max(g.topY, clearLine);
                g.els.forEach((gel, idx) => {
                    gel.style.transform = 'translateY(' + Math.round(drawY + idx * (STK_CELL - 2)) + 'px)';
                });
                // Contact: rising edge + inside garbage.
                if (pr) {
                    const inside = pr.bottom > drawY;
                    if (inside) {
                        // Fling upward off the rising edge + grind ticks.
                        if (now >= g.hitCd) {
                            g.hitCd = now + STK_GR_TICK_MS;
                            _nkFlingAvatar(0, -STK_GR_FLING_UP[p], c ? c.x : W / 2, drawY);
                            const dealt = _nkHit(STK_GR_DMG[p], null, st.level);
                            _nkAbilityHitToast(dealt, 'The Stack', 'Garbage Rise');
                        }
                    }
                }
            }
        }

        return true;
    });
}


// Positions the core's cells under its container transform.
export function _stkPlaceCore(st) {
    st.core.cells.forEach(cl => {
        cl.el.style.transform = 'translate(' + Math.round(st.core.x + cl.dx) + 'px,' + Math.round(st.core.y + cl.dy) + 'px)';
    });
}


// Circle-vs-core-cells hit test (uses player rect).
export function _stkCoreHit(st, pr) {
    return _stkCellsHit(st.core.cells, st.core.x, st.core.y, pr);
}


// Generic cell-grid vs player-rect hit test.
export function _stkCellsHit(cells, ox, oy, pr) {
    if (!pr) return false;
    return cells.some(cl => {
        const x = ox + cl.dx, y = oy + cl.dy;
        return pr.right > x && pr.left < x + STK_CELL - 3 && pr.bottom > y && pr.top < y + STK_CELL - 3;
    });
}


export function _stkPieceHit(pc, pr) {
    return _stkCellsHit(pc.cells, pc.x, pc.y, pr);
}


// Queues a warn column; when it elapses, a piece spawns at the top.
export function _stkQueuePiece(st, W, giantOverride, shock) {
    const giant = !!giantOverride;
    const pw = giant ? STK_CELL * 4 : STK_CELL * 2;
    const x = 30 + Math.random() * Math.max(60, W - pw - 60);
    const el = _nkEl(st.run, 'div', 'sx-stk-warn' + (giant ? ' giant' : ''));
    el.style.left = Math.round(x) + 'px';
    el.style.width = Math.round(pw) + 'px';
    st.warns.push({ x, t: 0, warnMs: giant ? STK_HD_WARN_MS : 650, giant, shock: !!shock, el });
}


// Builds a piece (soft = 2×2 O or 3-wide I; giant = 4-wide I or 2×2 O).
export function _stkMakePiece(st, x, giant, shock) {
    const color = STK_COLORS[Math.floor(Math.random() * STK_COLORS.length)];
    let shape;
    if (giant) shape = Math.random() < 0.5 ? [[0, 0], [1, 0], [2, 0], [3, 0]] : [[0, 0], [1, 0], [0, 1], [1, 1]];
    else shape = Math.random() < 0.5 ? [[0, 0], [1, 0], [0, 1], [1, 1]] : [[0, 0], [1, 0], [2, 0]];
    const run = st.run;
    const piece = { x, y: -STK_CELL - 10, cells: [], giant: !!giant, speed: STK_PIECE_FALL,
        hitCd: 0, floorY: 0, shock: !!shock, color };
    shape.forEach(([cx, cy]) => {
        const cell = document.createElement('div');
        cell.className = 'sx-stk-cell';
        cell.style.background = color;
        cell.style.width = cell.style.height = (STK_CELL - 3) + 'px';
        run.arenaEl ? run.arenaEl.appendChild(cell) : document.body.appendChild(cell);
        run.els.push(cell);
        piece.cells.push({ dx: cx * STK_CELL, dy: cy * STK_CELL, el: cell });
    });
    piece.floorY = window.innerHeight - STK_CELL * 2 - 20; // lands above the bottom HUD
    return piece;
}


// Landing: dust burst (+ optional shockwave) and floor terrain.
export function _stkLand(st, pc, pr, p) {
    const x = pc.x + STK_CELL * (pc.giant ? 2 : 1);
    const y = pc.floorY + STK_CELL;
    if (pc.shock) {
        // Giant landing: big shockwave + heavy floor terrain.
        const el = _nkEl(st.run, 'div', 'sx-stk-shock');
        el.style.left = Math.round(x) + 'px';
        el.style.top = Math.round(y) + 'px';
        st.shocks.push({ x, y, t: 0, dur: 520, r: STK_HD_SHOCK_R, dmg: STK_HD_DMG[p], fling: STK_HD_FLING[p], hit: false, el, label: 'Hard Drop' });
    } else {
        // Soft landing: small burst marker.
        const el = _nkEl(st.run, 'div', 'sx-stk-shock soft');
        el.style.left = Math.round(x) + 'px';
        el.style.top = Math.round(y) + 'px';
        st.shocks.push({ x, y, t: 0, dur: 380, r: STK_LAND_R, dmg: 0, fling: 0, hit: true, el, label: '' });
        const c = _nkPlayerCenter();
        if (c && Math.hypot(c.x - x, c.y - y) <= STK_LAND_R) {
            const dealt = _nkHit(STK_LAND_DMG, null, st.level);
            _nkAbilityHitToast(dealt, 'The Stack', 'Landing Burst');
        }
    }
    // Floor terrain (both cases).
    const floor = { x: pc.x, y: pc.floorY, t: 0, ttl: pc.giant ? STK_HD_FLOOR_TTL : STK_FLOOR_TTL, hitCd: 0, cells: [] };
    pc.cells.forEach(cl => {
        const cell = cl.el; // reuse the piece's cells as terrain
        cell.style.opacity = '1';
        cell.classList.add('floor');
        floor.cells.push({ dx: cl.dx, dy: cl.dy, el: cell });
    });
    st.floors.push(floor);
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_slam_impact', 'stk_thud'); } catch (e) {}
}


// Ghost preview for the hard-drop gate.
export function _stkGhost(st, x, type) {
    const el = _nkEl(st.run, 'div', 'sx-stk-warn giant ghost');
    el.style.left = Math.round(x) + 'px';
    el.style.width = Math.round(STK_CELL * 4) + 'px';
    // The landing shockwave's reach, drawn where the giant piece will land
    // (same centre as _stkLand) - it stays until the shock has rolled.
    const H = window.innerHeight;
    const ring = _nkEl(st.run, 'div', 'sx-stk-shock-zone');
    const lx = x + STK_CELL * 2, ly = H - STK_CELL * 2 - 20 + STK_CELL;
    ring.style.left = Math.round(lx - STK_HD_SHOCK_R) + 'px';
    ring.style.top = Math.round(ly - STK_HD_SHOCK_R) + 'px';
    ring.style.width = ring.style.height = (STK_HD_SHOCK_R * 2) + 'px';
    const rm = setTimeout(() => { try { ring.remove(); } catch (e) {} }, STK_HD_WARN_MS + 2400);
    st.run.timers.push(rm);
    return el;
}


// ── 60% gate: Hard Drop ──────────────────────────────────────────────────
export function _stkHardDrop(st, live) {
    if (st.hard) return;
    const c = _nkPlayerCenter();
    const W = window.innerWidth;
    const x = c ? Math.max(20, Math.min(W - STK_CELL * 5 - 20, c.x - STK_CELL * 2)) : W / 2 - STK_CELL * 2;
    st.hard = { idx: 0, x, phase: 'warn', t: 0, ghost: _stkGhost(st, x, 'I') };
    _nkToast('eg_stk_harddrop', '🧱 HARD DROP! Giant pieces slamming your column!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_slam_impact', 'stk_thud'); } catch (e) {}
}


// ── 30% gate: Line Clear ─────────────────────────────────────────────────
export function _stkLineClear(st, live) {
    if (st.lineClear) return;
    st.lineClear = { t: 0 };
    st.lcTimer = 0;
    st.lcSpawned = 0;
    _nkToast('eg_stk_lineclear', '✨ LINE CLEAR! Flashing rows are about to detonate!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_slam_impact', 'stk_thud'); } catch (e) {}
}


export function _stkQueueRow(st, W, H) {
    const y = 90 + Math.random() * Math.max(80, H - 260);
    const el = _nkEl(st.run, 'div', 'sx-stk-row');
    el.style.left = '0px';
    el.style.top = Math.round(y) + 'px';
    el.style.width = W + 'px';
    el.style.height = STK_LC_ROW_H + 'px';
    st.rows.push({ y, t: 0, warnMs: STK_LC_WARN_MS, detonated: false,
        dmg: STK_LC_DMG[_stkPhase(st)], el });
}


// ── Charge attack: Garbage Rise ──────────────────────────────────────────
export function _stackGarbage(monster) {
    const st = _stackWatcher;
    if (!st || st.garbage || _nkDodgeBusy() || _nkFrozen()) return;
    if (monster && monster.bossImmune) return;   // not during the finale / phase shifts
    const H = window.innerHeight;
    const rows = 3;
    const els = [];
    for (let i = 0; i < rows; i++) {
        const gel = _nkEl(st.run, 'div', 'sx-stk-garbage');
        gel.style.left = '0px';
        gel.style.width = window.innerWidth + 'px';
        // The last row fills down to the floor: everything below the crest
        // hurts, so everything below the crest is painted.
        gel.style.height = (i === rows - 1 ? H : (STK_CELL - 2)) + 'px';
        if (i === rows - 1) gel.classList.add('fill');
        gel.style.top = '0px';
        gel.style.transform = 'translateY(' + H + 'px)';
        els.push(gel);
    }
    st.garbage = { phase: 'rise', t: 0, topY: H, els, hitCd: 0 };
    _nkToast('eg_stk_garbage', '🧱 GARBAGE RISE! Stay high - the floor is rising!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_slam_impact', 'stk_thud'); } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------LEGACY COMPAT SHIM------------------------------------
//------------------------------------------------------------------------
// The old scheduled mechanic is now the persistent soft-drop cadence -
// keep the handler name alive so any stale schedule entry no-ops instead
// of erroring.
export function _mechBlockFall(monster, phase) { void monster; void phase; }
