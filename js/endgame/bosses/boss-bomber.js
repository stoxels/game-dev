//------------------------------------------------------------------------
//-------------------BOSS: THE BOMBER (boss_bomber)-----------------------
//------------------------------------------------------------------------
// REWORK — "ground war" aerial bomber. The boss shows a ⚠ target pip under
// its card for the whole fight and drops a different ordnance package per
// phase:
//
//   Phase 1 (100–60%) — MINE COLLAR. Tethered mines orbit the boss card,
//                       then detach and drift to your position at launch
//                       time, planting glowing proximity mines. Step inside
//                       a mine's red danger ring and it detonates.
//   Phase 2 ( ≤60%)   — CARPET RUNS. A bomber plane sprite banks across the
//                       arena through your position and carpets its flight
//                       path with bombs that detonate on a fuse — leave the
//                       highlighted lane.
//   Phase 3 ( ≤30%)   — CLUSTER SHELLS. Mortar shells ☄️ burst at your
//                       position into 7–10 bomblets that scatter outward
//                       and fuse on their own. Plus everything earlier,
//                       faster.
//   Finale ( ≤10%)    — TOTAL CARPET. One-shot set-piece (Bomb-Maze
//                       style): 3…2…1 countdown, a green SAFE dome plants
//                       at your position, then every live mine plus a
//                       rolling detonation front goes off. OUTSIDE the dome
//                       = hit, twice (main wave + afterglow). The boss is
//                       immune and shielded until the set-piece resolves.
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
// DEBUG_SLOW: while true, telegraphs/act windows are stretched 2.5× so
// screenshots can catch mid-animation states. Flip to false for ship.
//------------------------------------------------------------------------

const _EG_BOMBER_DEBUG_SLOW = true;
const _EG_BOMBER_DEBUG_MULT = _EG_BOMBER_DEBUG_SLOW ? 2.5 : 1;

// Debug-only: stretch the detonation animations so screenshots can catch
// mid-blast states. Injected once at script load; disappears when the flag
// is flipped off for ship.
if (typeof document !== 'undefined' && _EG_BOMBER_DEBUG_SLOW) {
    const dbgStyle = document.createElement('style');
    dbgStyle.id = 'eg-bmb-debug-slow-style';
    dbgStyle.textContent =
        '.eg-bmb-core{animation-duration:2.4s !important}' +
        '.eg-bmb-ring{animation-duration:2.7s !important}' +
        '.eg-bmb-spark{animation-duration:2.5s !important}' +
        '.eg-bmb-shellburst{animation-duration:2.2s !important}';
    document.head.appendChild(dbgStyle);
}

Object.assign(EG_BOSS_DEFS, {
    boss_bomber: {
        id: 'boss_bomber', name: 'The Bomber', emoji: '💣',
        baseHP: 1020, baseDamage: 23, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_bomber: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'mine_collar', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechMineCollar' },
            { name: 'carpet_run', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechCarpetRun', phase2Only: true },
            { name: 'cluster_shells', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechClusterShells', phase2Only: true },
        ],
        onInit: _egBomberOnInit,
        onPhaseEnter: _egBomberOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_BMB_MINE_DMG = [0, 0.12, 0.15, 0.18];      // per mine blast, by phase
const EG_BMB_CARPET_DMG = [0, 0, 0.15, 0.19];       // per carpet bomb, by phase
const EG_BMB_CLUSTER_DMG = [0, 0, 0.12, 0.15];      // per cluster bomblet, by phase
const EG_BMB_FINAL_WAVE_DMG = 0.22;                 // TOTAL CARPET main wave
const EG_BMB_FINAL_AFTERTICK_DMG = 0.15;            // afterglow second wave
const EG_BMB_MINE_LIFE_MS = 16000;                  // un-triggered mines fizzle out
const EG_BMB_MAX_LIVE_MINES = 8;                    // field cap across mechanics
const EG_BMB_HIT_CD_MS = 700;                       // shared mine-hit cooldown

// Live mine field state, shared across mechanics: collar plants proximity
// mines, carpet/bomblets plant fuse mines; TOTAL CARPET consumes all.
let _egBmbMines = [];
let _egBmbMineKeeper = null;
let _egBmbKeeperRun = null;

// Set while the TOTAL CARPET set-piece runs (read by _egTickPlayer's
// charge-freeze gate, endgame-encounter.js).
let _egBomberFinal = null;

// Charge-bar freeze gate for _egTickPlayer (endgame-encounter.js): true
// from TOTAL CARPET start until it resolves. Mirrors _egCrashMazeActive.
function _egBomberFinalActive() {
    return !!_egBomberFinal && !_egBomberFinal.finished;
}


//------------------------------------------------------------------------
//-------------------FLYING PRESENTATION (whole fight)---------------------
//------------------------------------------------------------------------

// Applies the flying presentation: gentle idle bob on the card, a big soft
// glow, and a ⚠ target pip under the card that tracks it every frame.
function _egBomberApplyFlightStyle(monster) {
    const card = document.getElementById('eg-card-' + monster.id);
    if (!card) return;
    card.classList.add('eg-bmb-flying');
    const pip = document.createElement('div');
    pip.className = 'eg-bmb-targetpip';
    pip.textContent = '⚠';
    document.body.appendChild(pip);
    monster.egBmbPipEl = pip;
    const sync = () => {
        // The card disappearing (boss death / screen change) ends the loop.
        if (!card.isConnected || !pip.isConnected) return;
        const r = card.getBoundingClientRect();
        pip.style.left = Math.round(r.left + r.width / 2) + 'px';
        pip.style.top = Math.round(r.bottom + 12) + 'px';
        requestAnimationFrame(sync);
    };
    sync();
}

function _egBomberOnInit(monster) {
    _egBomberApplyFlightStyle(monster);
    _egBmbEnsureKeeper(monster);
}


//------------------------------------------------------------------------
//-------------------MINE FIELD PLUMBING-----------------------------------
//------------------------------------------------------------------------

// Plants one mine at (x, y): bomb dot + dashed red danger ring (radius r).
// Registered in the shared field for TOTAL CARPET and the keeper watcher.
// Enforces the live-mine cap by fizzling the oldest mine first.
function _egBmbPlantMine(run, x, y, r, level, label, dmgPct, phase) {
    if (_egBmbMines.length >= EG_BMB_MAX_LIVE_MINES) _egBmbFizzleMine(_egBmbMines[0]);
    const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-bomb eg-bmb-mine', '💣');
    el.style.width = '46px';
    el.style.height = '46px';
    el.style.fontSize = '1.7rem';
    el.style.transform = 'translate(' + Math.round(x - 23) + 'px,' + Math.round(y - 23) + 'px)';
    const ring = _egNkEl(run, 'div', 'eg-bmb-minering');
    ring.style.width = (r * 2) + 'px';
    ring.style.height = (r * 2) + 'px';
    ring.style.left = Math.round(x - r) + 'px';
    ring.style.top = Math.round(y - r) + 'px';
    const mine = { x, y, el, ring, born: performance.now(), r, level, label, dmgPct, phase, exploded: false, carpet: false };
    _egBmbMines.push(mine);
    return mine;
}

// Detonates one mine: boom visuals sized to the danger ring + damage test.
// Idempotent (safe to call from several watchers in the same frame).
function _egBmbDetonateMine(run, mine, hitPlayer) {
    if (!mine || mine.exploded) return;
    mine.exploded = true;
    if (mine.ring) { try { mine.ring.remove(); } catch (e) {} mine.ring = null; }
    if (mine.el) { try { mine.el.classList.add('eg-nk-boom'); } catch (e) {} }
    _egBmbBoom(run, mine.x, mine.y, mine.r, hitPlayer ? mine.dmgPct : 0, mine.level, mine.label);
    const idx = _egBmbMines.indexOf(mine);
    if (idx !== -1) _egBmbMines.splice(idx, 1);
    const dotEl = mine.el;
    if (dotEl) setTimeout(() => { try { dotEl.remove(); } catch (e) {} }, 500);
}

// Despawns a mine without exploding (life expiry / cap eviction / lock-in).
function _egBmbFizzleMine(mine) {
    if (!mine || mine.exploded) return;
    mine.exploded = true;
    if (mine.ring) { try { mine.ring.remove(); } catch (e) {} }
    if (mine.el) { try { mine.el.remove(); } catch (e) {} }
    const idx = _egBmbMines.indexOf(mine);
    if (idx !== -1) _egBmbMines.splice(idx, 1);
}

// Clears the whole field without explosions (boss death / teardown).
function _egBmbClearMines() {
    _egBmbMines.forEach(m => _egBmbFizzleMine(m));
    _egBmbMines = [];
}

// Shared mine watcher: per-mine life expiry (fizzle), proximity detonation
// for collar-style mines. Fuse mines (carpet: true) are handled by their
// owning mechanic's loop instead. Returns true while any mine is live.
function _egBmbMineWatch(run, hitCooldown) {
    let pending = false;
    const now = performance.now();
    const pr = _egNkPlayerRect();
    for (const mine of Array.from(_egBmbMines)) {
        if (mine.carpet) { pending = true; continue; }
        if (now - mine.born > EG_BMB_MINE_LIFE_MS) { _egBmbFizzleMine(mine); continue; }
        if (pr) {
            const cx = (pr.left + pr.right) / 2, cy = (pr.top + pr.bottom) / 2;
            if (Math.hypot(cx - mine.x, cy - mine.y) <= mine.r + 6) {
                if (now >= hitCooldown) {
                    hitCooldown = now + EG_BMB_HIT_CD_MS;
                    _egBmbDetonateMine(run, mine, true);
                    continue;
                }
            }
        }
        pending = true;
    }
    return pending;
}

// One shared explosion visual: fireball core + expanding shockwave ring +
// ember sparks. Same family as the Demolitionist's _egCrashBoom (own tint).
// pct > 0 also damages the player when their hitbox overlaps the blast disc.
// The visual is ALWAYS spawned body-level (run-independent): detonations
// commonly fire in the same frame their owning run is killed (mechanic end,
// TOTAL CARPET lock-in), and a killed run sweeps its elements instantly —
// the burst would never be seen. The layer self-removes after its window.
function _egBmbBoom(run, x, y, radius, pct, level, label) {
    const R = Math.max(10, radius);
    const layer = document.createElement('div');
    layer.className = 'eg-bmb-burst';
    document.body.appendChild(layer);
    layer.style.left = Math.round(x - R) + 'px';
    layer.style.top = Math.round(y - R) + 'px';
    layer.style.width = (R * 2) + 'px';
    layer.style.height = (R * 2) + 'px';

    const core = document.createElement('div');
    core.className = 'eg-bmb-core';
    layer.appendChild(core);
    const ring = document.createElement('div');
    ring.className = 'eg-bmb-ring';
    layer.appendChild(ring);
    for (let i = 0; i < 7; i++) {
        const s = document.createElement('div');
        s.className = 'eg-bmb-spark';
        const ang = Math.random() * Math.PI * 2;
        const dist = (R * 0.35) + Math.random() * (R * 0.85);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist) + 'px');
        s.style.animationDelay = (Math.random() * 90) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, _EG_BOMBER_DEBUG_SLOW ? 3400 : 950);

    if (pct > 0) {
        const pr = _egNkPlayerRect();
        if (pr && _egNkCircleHit(x, y, R, pr, 0)) {
            const dealt = _egNkHit(pct, 'fire', level);
            _egNkAbilityHitToast(dealt, 'The Bomber', label);
        }
    }
}

// Teardown — registered in boss-framework.js cleanup chain (startsWith
// 'boss_bomber', runtime ids are suffixed). Fires on boss death, encounter
// stop, and level teardown.
function _egBmbTeardown() {
    _egBmbClearMines();
    if (_egBmbMineKeeper) { try { _egBmbMineKeeper(); } catch (e) {} _egBmbMineKeeper = null; }
    if (_egBomberFinal) _egBomberFinalEnd(_egBomberFinal);
    document.querySelectorAll('.eg-bmb-flying').forEach(el => el.classList.remove('eg-bmb-flying'));
    document.querySelectorAll('.eg-bmb-targetpip').forEach(el => el.remove());
    document.body.classList.remove('eg-bmb-flash');
}


//------------------------------------------------------------------------
//-------------------MINE KEEPER (passive field manager)-------------------
//------------------------------------------------------------------------
// A passive (non-set-piece) run keeps the shared mine field ticking between
// mechanics: collar mines planted by one run still detonate/fizzle while
// the boss schedules the next mechanic. Idle-but-alive so it costs nothing.
function _egBmbEnsureKeeper(monster) {
    if (_egBmbMineKeeper) return _egBmbKeeperRun;
    const bossId = monster ? monster.id : 'boss_bomber';
    _egBmbKeeperRun = _egNkNewRun(bossId, true);
    _egBmbKeeperRun.passive = true;   // never blocks other mechanics
    let hitCooldown = 0;
    _egNkLoop(_egBmbKeeperRun, (dtS) => {
        if (_egBmbMines.length === 0) return true;
        _egBmbMineWatch(_egBmbKeeperRun, hitCooldown);
        return true;
    });
    _egBmbMineKeeper = () => { try { _egNkKillRun(_egBmbKeeperRun); } catch (e) {} _egBmbKeeperRun = null; };
    return _egBmbKeeperRun;
}

// Run every live mine is planted into: the persistent keeper. Mechanic runs
// own only their transient visuals — when they end, the FIELD must survive
// (a killed run sweeps its elements instantly).
function _egBmbFieldRun(monster) {
    return _egBmbEnsureKeeper(monster);
}


//------------------------------------------------------------------------
//-------------------MINE COLLAR (phase 1+, signature opener)--------------
//------------------------------------------------------------------------
// A ring of 4–6 tethered mines orbits the boss card for a long, readable
// wind-up, then each mine detaches and drifts to YOUR position at launch
// time, planting a proximity mine. Standing still = surrounded.
const EG_BMB_COLLAR_MINES = [0, 4, 5, 6];
const EG_BMB_COLLAR_ORBIT_MS = [0, 3000, 2600, 2200];
const EG_BMB_COLLAR_DRIFT_MS = [0, 3000, 2800, 2400];
const EG_BMB_COLLAR_RING_R = 95;

// Center of the playable grid (from corner cells), or viewport fallback —
// the arena anchor for the collar orbit (the boss CARD moves between panel
// zones, so it is a bad anchor for arena mechanics).
function _egBmbGridCenter() {
    if (typeof cur !== 'undefined' && cur && cur.grid && cur.grid.length && cur.grid[0]) {
        const a = document.getElementById('g-0-0');
        const b = document.getElementById('g-' + (cur.grid.length - 1) + '-' + (cur.grid[0].length - 1));
        if (a && b && a.isConnected && b.isConnected) {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            if (ra.width && rb.width) {
                return { x: (ra.left + rb.right) / 2, y: (ra.top + rb.bottom) / 2 };
            }
        }
    }
    return { x: window.innerWidth / 2, y: window.innerHeight * 0.38 };
}

function _egMechMineCollar(monster, phase) {
    if (_egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    // Passive: the collar is a FIELD mechanic (like the Dynamo's conductors)
    // — it must not block the carpet/cluster dodge channel, and its planted
    // mines legitimately stay live across other mechanics.
    run.passive = true;
    const count = EG_BMB_COLLAR_MINES[p];
    const orbitMs = EG_BMB_COLLAR_ORBIT_MS[p] * _EG_BOMBER_DEBUG_MULT;
    const driftMs = EG_BMB_COLLAR_DRIFT_MS[p] * _EG_BOMBER_DEBUG_MULT;
    const ringR = EG_BMB_COLLAR_RING_R;

    _egNkToast('eg_mech_bomber_collar', '💣 The Bomber: MINE COLLAR — the mines drift toward you!', '#f97316');

    const anchor = _egBmbGridCenter();
    const orbits = [];
    for (let i = 0; i < count; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-bomb eg-bmb-orbit', '💣');
        el.style.width = '42px';
        el.style.height = '42px';
        el.style.fontSize = '1.5rem';
        orbits.push({ el, ang: (Math.PI * 2 * i) / count, deployed: false, deployedDone: false, dt: 0, x: 0, y: 0, sx: 0, sy: 0, tx: 0, ty: 0 });
    }
    let t = 0;
    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        let pending = false;
        const orbitR = 95 + Math.sin(t / 260) * 16;
        const pc = _egNkPlayerCenter();

        orbits.forEach(o => {
            if (o.deployed) {
                if (o.deployedDone) return;   // planted — no longer keeps the run alive
                pending = true;
                o.dt += dtS * 1000;
                const k = Math.min(1, o.dt / driftMs);
                const ex = o.sx + (o.tx - o.sx) * k;
                const ey = o.sy + (o.ty - o.sy) * k;
                if (o.el) o.el.style.transform = 'translate(' + Math.round(ex - 21) + 'px,' + Math.round(ey - 21) + 'px)';
                if (k >= 1) {
                    o.deployedDone = true;
                    if (o.el) { try { o.el.remove(); } catch (e) {} o.el = null; }
                    _egBmbPlantMine(_egBmbFieldRun(monster), o.tx, o.ty, ringR, level, 'Mine Collar', EG_BMB_MINE_DMG[p], p);
                }
                return;
            }
            pending = true;   // still orbiting / waiting to launch
            o.ang += dtS * (Math.PI * 2) / (orbitMs / 1000) * 0.55;
            o.x = anchor.x + Math.cos(o.ang) * orbitR;
            o.y = anchor.y + Math.sin(o.ang) * orbitR * 0.8;
            if (o.el) o.el.style.transform = 'translate(' + Math.round(o.x - 21) + 'px,' + Math.round(o.y - 21) + 'px)';
            // Launch: after the orbit window, each mine locks onto the
            // player's CURRENT position and drifts there.
            if (t >= orbitMs && pc) {
                o.deployed = true;
                o.dt = 0;
                o.sx = o.x; o.sy = o.y;
                o.tx = pc.x; o.ty = pc.y;
            }
        });

        // The field lives in the keeper run — the collar run only owns the
        // transient orbit visuals and ends once every orbit has planted.
        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------CARPET RUN (phase 2+, signature movement)-------------
//------------------------------------------------------------------------
// A bomber plane sprite banks across the arena along a straight line
// (horizontal lane or vertical column) through the player's position and
// carpets its path with bombs on a fixed cadence. Each bomb detonates on a
// short fuse — the detonation front rolls along the path behind the plane,
// so you must leave the highlighted lane entirely.
const EG_BMB_CARPET_SPACING = [0, 0, 130, 110];
const EG_BMB_CARPET_FUSE_MS = [0, 0, 1600, 1300];
const EG_BMB_CARPET_SPEED = [0, 0, 420, 520];       // px/s plane travel
const EG_BMB_CARPET_BLAST_R = 120;
const EG_BMB_CARPET_TRAIL_W = 96;                   // lane highlight width

function _egMechCarpetRun(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const pc = _egNkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const horizontal = Math.random() < 0.5;
    const spacing = EG_BMB_CARPET_SPACING[p];
    const fuseBase = EG_BMB_CARPET_FUSE_MS[p];
    const fuseMs = fuseBase * _EG_BOMBER_DEBUG_MULT;
    // Debug slow-mo also slows the plane so screenshots catch it mid-flight.
    const speed = EG_BMB_CARPET_SPEED[p] / _EG_BOMBER_DEBUG_MULT;

    // Flight path through the player's position, clamped on-screen.
    const M = 70;
    const path = horizontal
        ? { x0: M, x1: window.innerWidth - M, y0: pc.y, y1: pc.y }
        : { x0: pc.x, x1: pc.x, y0: M, y1: window.innerHeight - M };
    const len = Math.hypot(path.x1 - path.x0, path.y1 - path.y0);
    const durMs = (len / speed) * 1000;
    const bombCount = Math.max(3, Math.floor(len / spacing));

    // Lane highlight — the carpeted band.
    const lane = _egNkEl(run, 'div', 'eg-bmb-lane');
    if (horizontal) {
        lane.style.left = Math.round(path.x0) + 'px';
        lane.style.width = Math.round(path.x1 - path.x0) + 'px';
        lane.style.top = Math.round(pc.y - EG_BMB_CARPET_TRAIL_W / 2) + 'px';
        lane.style.height = EG_BMB_CARPET_TRAIL_W + 'px';
    } else {
        lane.style.top = Math.round(path.y0) + 'px';
        lane.style.height = Math.round(path.y1 - path.y0) + 'px';
        lane.style.left = Math.round(pc.x - EG_BMB_CARPET_TRAIL_W / 2) + 'px';
        lane.style.width = EG_BMB_CARPET_TRAIL_W + 'px';
    }

    // The plane sprite banks along the path (translate-driven, fixed rule).
    const plane = _egNkEl(run, 'div', 'eg-nk-dot eg-bmb-plane', '🛩️');
    plane.style.fontSize = '2.6rem';

    _egNkToast('eg_mech_bomber_carpet', '💣 The Bomber: CARPET RUN — get out of the lane!', '#fb923c');

    let t = 0;
    let armIdx = 0;
    const armAt = i => (bombCount > 1 ? (i / (bombCount - 1)) * durMs : 0);

    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        let pending = false;

        // Plane banking motion.
        const k = Math.min(1, t / durMs);
        const px2 = path.x0 + (path.x1 - path.x0) * k;
        const py2 = path.y0 + (path.y1 - path.y0) * k;
        plane.style.transform = 'translate(' + Math.round(px2 - 21) + 'px,' + Math.round(py2 - 21) + 'px)';
        if (k < 1) pending = true;

        // Drop bombs on cadence along the path.
        while (armIdx < bombCount && t >= armAt(armIdx)) {
            const bk = bombCount > 1 ? armIdx / (bombCount - 1) : 0;
            const bx = path.x0 + (path.x1 - path.x0) * bk;
            const by = path.y0 + (path.y1 - path.y0) * bk;
            const mine = _egBmbPlantMine(_egBmbFieldRun(monster), Math.round(bx), Math.round(by), EG_BMB_CARPET_BLAST_R, level, 'Carpet Run', EG_BMB_CARPET_DMG[p], p);
            mine.carpet = true;                       // fuse-based detonation
            mine.fuseAt = t + fuseMs;
            armIdx++;
            pending = true;
        }

        // Carpet bombs: fuse countdown then detonate (proximity ignored).
        for (const mine of Array.from(_egBmbMines)) {
            if (!mine.carpet || mine.exploded) continue;
            pending = true;
            if (t >= mine.fuseAt) {
                _egBmbDetonateMine(run, mine, true);
            } else if (mine.el && t >= mine.fuseAt - 450) {
                mine.el.classList.add('eg-nk-fuse');
            }
        }

        // The run ends once the plane has flown and its fuse mines are gone.
        return pending || _egBmbMines.some(m => m.carpet && !m.exploded);
    });
}


//------------------------------------------------------------------------
//-------------------CLUSTER SHELLS (phase 3)------------------------------
//------------------------------------------------------------------------
// Mortar shells ☄️ burst at (near) the player's position into 7–10 bomblets
// that scatter outward and land as short-fuse mines. Three shells, staggered
// ~1s apart (debug-stretched). Get out of the scatter rings.
const EG_BMB_CLUSTER_SHELLS = 3;
const EG_BMB_CLUSTER_BOMBLETS = [0, 0, 0, 7];
const EG_BMB_CLUSTER_SCATTER_R = [0, 0, 0, 240];
const EG_BMB_CLUSTER_FUSE_MS = 1700;
const EG_BMB_CLUSTER_SHELL_GAP_MS = 950;
const EG_BMB_CLUSTER_BLAST_R = 86;

function _egMechClusterShells(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    if (Number(phase) < 3) return;   // phase-3-only mechanic (no phase3Only flag)
    const p = 3;
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const bombletCount = EG_BMB_CLUSTER_BOMBLETS[p];
    const scatterR = EG_BMB_CLUSTER_SCATTER_R[p];
    const fuseMs = EG_BMB_CLUSTER_FUSE_MS * _EG_BOMBER_DEBUG_MULT;
    const pc = _egNkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    _egNkToast('eg_mech_bomber_cluster', '💣 The Bomber: CLUSTER SHELLS — get out of the scatter!', '#f87171');

    const shellPlan = [];
    for (let i = 0; i < EG_BMB_CLUSTER_SHELLS; i++) {
        const jitter = scatterR * 0.9;
        const bx = Math.max(60, Math.min(window.innerWidth - 60, pc.x + (Math.random() * 2 - 1) * jitter));
        const by = Math.max(90, Math.min(window.innerHeight - 90, pc.y + (Math.random() * 2 - 1) * jitter));
        shellPlan.push({ bx, by, at: i * EG_BMB_CLUSTER_SHELL_GAP_MS * _EG_BOMBER_DEBUG_MULT });
    }

    let t = 0;
    const fired = new Set();
    let burstCount = 0;

    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        let pending = false;

        shellPlan.forEach((s, i) => {
            if (fired.has(i)) return;
            if (t < s.at) { pending = true; return; }
            fired.add(i);
            burstCount++;
            // Impact streak flash, then the bomblet scatter.
            const streak = _egNkEl(run, 'div', 'eg-bmb-shellburst', '☄️');
            streak.style.left = Math.round(s.bx) + 'px';
            streak.style.top = Math.round(s.by) + 'px';
            setTimeout(() => { try { streak.remove(); } catch (e) {} }, _EG_BOMBER_DEBUG_SLOW ? 2400 : 800);

            for (let j = 0; j < bombletCount; j++) {
                const ang = (Math.PI * 2 * j) / bombletCount + Math.random() * 0.4;
                const dist = scatterR * (0.35 + Math.random() * 0.65);
                const mx = Math.max(40, Math.min(window.innerWidth - 40, s.bx + Math.cos(ang) * dist));
                const my = Math.max(60, Math.min(window.innerHeight - 60, s.by + Math.sin(ang) * dist));
                const mine = _egBmbPlantMine(_egBmbFieldRun(monster), Math.round(mx), Math.round(my), EG_BMB_CLUSTER_BLAST_R, level, 'Cluster Shells', EG_BMB_CLUSTER_DMG[p], p);
                mine.carpet = true;                   // fuse-based detonation
                mine.fuseAt = t + fuseMs + j * 60;
            }
        });

        // Bomblets fuse out.
        for (const mine of Array.from(_egBmbMines)) {
            if (!mine.carpet || mine.exploded) continue;
            pending = true;
            if (t >= mine.fuseAt) {
                _egBmbDetonateMine(run, mine, true);
            } else if (mine.el && t >= mine.fuseAt - 450) {
                mine.el.classList.add('eg-nk-fuse');
            }
        }

        return pending || burstCount < EG_BMB_CLUSTER_SHELLS
            || _egBmbMines.some(m => m.carpet && !m.exploded);
    });
}


//------------------------------------------------------------------------
//-------------------TOTAL CARPET (≤10% HP one-shot finale)----------------
//------------------------------------------------------------------------
// Everything stops, a 3…2…1 fuse counts down, a green SAFE dome plants at
// the player's position, then every live mine plus a rolling detonation
// front goes off. OUTSIDE the dome = hit by the main wave, then by the
// afterglow sweep 1.1s later (if you still linger outside). The boss is
// immune + shielded until the set-piece resolves, and the auto-attack
// charge bar freezes (gate in _egTickPlayer, endgame-encounter.js).
const EG_BMB_FINAL_CD_TICK_MS = 800;
const EG_BMB_FINAL_CD_TICKS = 3;
const EG_BMB_FINAL_WAVE_MS = 1500;                 // after countdown: bang wind-up
const EG_BMB_FINAL_SAFE_R_PCT = 0.32;              // of min(vw, vh)

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
// Returning false keeps the normal transition flow untouched.
function _egBomberOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egBmbStartFinalWatcher(monster); } catch (e) {}
    return false;
}

// Passive watcher: fires TOTAL CARPET the first time the boss drops to
// ≤10% HP. Dies automatically with the boss (nk run boss-alive check).
function _egBmbStartFinalWatcher(monster) {
    if (!monster || _egBomberFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egBomberFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egBomberFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

function _egBomberFinalStart(monster) {
    if (_egBomberFinal || !monster) return;

    // The arena goes quiet: kill every other run of this boss (the watcher
    // included — it has already returned by the time this runs).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const g = {
        monsterId: monster.id,
        finished: false,
        count: EG_BMB_FINAL_CD_TICKS,
        overlay: null,
        safeEl: null,
        run: null,
        cdTimer: null,
        waveAt: 0,
        fired: false,
        afterfired: false,
        flashed: false,
        faded: false,
        safeR: Math.min(window.innerWidth, window.innerHeight) * EG_BMB_FINAL_SAFE_R_PCT,
    };
    _egBomberFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // Safe dome — clamped so at least half of it stays on-screen.
    const pc = _egNkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    g.safe = {
        x: Math.round(Math.max(g.safeR * 0.5, Math.min(window.innerWidth - g.safeR * 0.5, pc.x))),
        y: Math.round(Math.max(g.safeR * 0.5, Math.min(window.innerHeight - g.safeR * 0.5, pc.y))),
    };
    const safeEl = document.createElement('div');
    safeEl.className = 'eg-bmb-safedome';
    safeEl.style.width = (g.safeR * 2) + 'px';
    safeEl.style.height = (g.safeR * 2) + 'px';
    safeEl.style.left = Math.round(g.safe.x - g.safeR) + 'px';
    safeEl.style.top = Math.round(g.safe.y - g.safeR) + 'px';
    document.body.appendChild(safeEl);
    g.safeEl = safeEl;

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-bmb-cd';
    ov.innerHTML =
        '<div class="eg-bmb-cd-label">💣 TOTAL CARPET</div>' +
        '<div class="eg-bmb-cd-num eg-bmb-cd-pop">' + g.count + '</div>' +
        '<div class="eg-bmb-cd-hint">Get inside the SAFE dome — everything else detonates!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_bomber_final_cd', '💣 TOTAL CARPET — get inside the SAFE dome!', '#f87171');

    // Boss immunity + shield dome so the long hold reads at a glance.
    monster.bossImmune = true;
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.add('eg-nk-shielded');

    // Debug: extra-long ticks so screenshots can catch the dome + countdown.
    const cdTick = EG_BMB_FINAL_CD_TICK_MS * (_EG_BOMBER_DEBUG_SLOW ? 5 : 1);
    g.cdTimer = setInterval(() => {
        if (!_egBomberFinal || _egBomberFinal !== g || g.finished) return;
        if (_egNkFrozen()) return;   // pause / death / inactive hold the count
        g.count--;
        if (g.count <= 0) {
            clearInterval(g.cdTimer);
            g.cdTimer = null;
            try { g.overlay.remove(); } catch (e) {}
            g.overlay = null;
            _egBomberFinalBang(g, monster);
            return;
        }
        const num = g.overlay && g.overlay.querySelector('.eg-bmb-cd-num');
        if (num) {
            num.textContent = g.count;
            num.classList.remove('eg-bmb-cd-pop');
            void num.offsetWidth;
            num.classList.add('eg-bmb-cd-pop');
        }
    }, cdTick);
}

// The bang: every live mine + a rolling detonation front around the safe
// dome, then a global wave test (outside = hit) and an afterglow sweep.
function _egBomberFinalBang(g, monster) {
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(g.monsterId, true);
    g.run = run;
    run.onKill = () => { if (_egBomberFinal === g) { try { _egBomberFinalEnd(g); } catch (e) {} } };
    g.waveAt = performance.now() + EG_BMB_FINAL_WAVE_MS;

    // Visual-only boom helper (the wave damage test happens once, globally).
    const boomAt = (x, y, r, delay) => {
        const id = setTimeout(() => _egBmbBoom(run, x, y, r, 0, level, ''), delay);
        run.timers.push(id);
    };

    // Stage 0: every live mine in the registry goes up first — the emotional
    // payload of the mechanic.
    _egBmbMines.forEach((m, i) => { if (!m.exploded) boomAt(m.x, m.y, m.r * 1.15, i * 90); });
    _egBmbClearMines();

    // Stage 1: a rolling detonation front — 8 booms on a circle just outside
    // the safe dome, then 4 corner booms, closing inward (visual only).
    const nDome = 8;
    for (let i = 0; i < nDome; i++) {
        const ang = (Math.PI * 2 * i) / nDome;
        boomAt(g.safe.x + Math.cos(ang) * (g.safeR + 90), g.safe.y + Math.sin(ang) * (g.safeR + 90), 150, 150 + i * 110);
    }
    boomAt(60, 60, 220, 250);
    boomAt(window.innerWidth - 60, 60, 220, 360);
    boomAt(60, window.innerHeight - 60, 220, 470);
    boomAt(window.innerWidth - 60, window.innerHeight - 60, 220, 580);

    _egNkToast('eg_mech_bomber_final_bang', '💣💥 TOTAL CARPET — EVERYTHING DETONATES!', '#f87171');

    _egNkLoop(run, (dtS, now) => {
        const pr = _egNkPlayerRect();
        const pcx = pr ? (pr.left + pr.right) / 2 : -99999;
        const pcy = pr ? (pr.top + pr.bottom) / 2 : -99999;
        const distSafe = Math.hypot(pcx - g.safe.x, pcy - g.safe.y);

        // Main wave: hit everyone OUTSIDE the safe dome.
        if (!g.fired && now >= g.waveAt) {
            g.fired = true;
            if (distSafe > g.safeR) {
                const dealt = _egNkHit(EG_BMB_FINAL_WAVE_DMG, 'fire', level);
                _egNkAbilityHitToast(dealt, 'The Bomber', 'Total Carpet');
            }
            document.body.classList.add('eg-bmb-flash');
            setTimeout(() => document.body.classList.remove('eg-bmb-flash'), 550);
        }
        // Afterglow sweep: a second global test 1.1s later.
        if (g.fired && !g.afterfired && now >= g.waveAt + 1100) {
            g.afterfired = true;
            if (distSafe > g.safeR) {
                const dealt = _egNkHit(EG_BMB_FINAL_AFTERTICK_DMG, 'fire', level);
                _egNkAbilityHitToast(dealt, 'The Bomber', 'Total Carpet');
            }
            if (g.safeEl) g.safeEl.classList.add('eg-bmb-safedome-out');
            setTimeout(() => _egBomberFinalEnd(g), 900);
        }
        return !g.faded && !(g.afterfired && now >= g.waveAt + 2000);
    });
}

// Ends the set-piece and hands control back to the boss (phase 3 schedule).
function _egBomberFinalEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    g.faded = true;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.safeEl) { try { g.safeEl.remove(); } catch (e) {} g.safeEl = null; }
    if (g.run) { try { _egNkKillRun(g.run); } catch (e) {} g.run = null; }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    document.body.classList.remove('eg-bmb-flash');

    const m = (g.monsterId && typeof _egMonsters !== 'undefined')
        ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _egBossScheduleMechanics === 'function') {
            try { _egBossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
    }
    if (_egBomberFinal === g) _egBomberFinal = null;
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_BMB_DEBUG.fire('collar'|'carpet'|'cluster')  — runs one mechanic now
//   _EG_BMB_DEBUG.mine(x, y)                         — plants a live mine
//   _EG_BMB_DEBUG.final()                            — TOTAL CARPET now
//   _EG_BMB_DEBUG.mines()                            — live mine count
if (typeof window !== 'undefined') {
    window._EG_BMB_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_bomber') : null;
            if (!monster) return 'no bomber alive';
            const fn = name === 'collar' ? _egMechMineCollar
                : name === 'carpet' ? _egMechCarpetRun
                : name === 'cluster' ? _egMechClusterShells : null;
            if (!fn) return 'unknown: ' + name;
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        mine: (x, y) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_bomber') : null;
            if (!monster) return 'no bomber alive';
            // Persistent debug run: never swept by a timer — mines fizzle on
            // their own 16s life, and teardown clears the run.
            if (!window._EG_BMB_DEBUG_RUN || !_egNkRuns.has(window._EG_BMB_DEBUG_RUN.id)) {
                window._EG_BMB_DEBUG_RUN = _egNkNewRun(monster.id, true);
                window._EG_BMB_DEBUG_RUN.passive = true; // never blocks other mechanics
            }
            const mine = _egBmbPlantMine(window._EG_BMB_DEBUG_RUN, x || window.innerWidth / 2, y || window.innerHeight / 2, 95, monster.level, 'Debug', EG_BMB_MINE_DMG[1], 1);
            _egBmbEnsureKeeper(monster);
            return 'mine at ' + Math.round(mine.x) + ',' + Math.round(mine.y);
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_bomber') : null;
            if (!monster) return 'no bomber alive';
            _egBomberFinalStart(monster);
            return 'TOTAL CARPET started';
        },
        mines: () => _egBmbMines.length,
    };
}
