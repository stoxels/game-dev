//------------------------------------------------------------------------
//-------------------BOSS: THE BUZZSAW (boss_buzz)------------------------
//------------------------------------------------------------------------
// REWORK — IWBTG saw homage, rebuilt as a full sawmill gauntlet. The boss
// floods the arena with spinning steel: ricocheting blades, sweeping cut
// lines, embedded saw traps and swinging pendulum saws — then, at the very
// end, it spins up and CUTS THE ROOM IN HALF.
//
//   Phase 1 (100–60%) — RICOCHET SAWS. Blades are flung in from the screen
//                       edges straight at you and bounce off the walls up
//                       to 3 times before embedding themselves in the floor
//                       as short-lived spinning hazards.
//                       Plus CUT LINE: a dashed telegraph band stretches
//                       across the arena, then a giant saw sweeps along it.
//                       Step out of the band!
//   Phase 2 ( ≤60%)   — SAW TRAPS. Half a dozen floor positions flash a saw
//                       silhouette, then erupt into spinning blade hazards
//                       that linger. Ricochets come in pairs.
//   Phase 3 ( ≤30%)   — PENDULUM BLADES. Two giant saws on chains swing
//                       from the top of the arena, scything across it.
//                       Everything else gets faster and meaner.
//   Finale ( ≤10%)    — THE FINAL CUT (one-shot set-piece): the boss goes
//                       immune and shields and SPINS UP while four toothed
//                       wall-saws close in from the four screen edges,
//                       shrinking the safe pocket around the arena centre.
//                       3…2…1 — CROSSCUT: two colossal blade streaks slash
//                       across the full screen in a giant X. Only the tiny
//                       centre pocket survives. STAY CENTRED! Charge bar
//                       frozen for the whole set-piece (gate in
//                       _egTickPlayer via _egBzFinalActive).
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

const _EG_BZ_DEBUG_SLOW = true;
const _EG_BZ_DEBUG_MULT = _EG_BZ_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_buzz: {
        id: 'boss_buzz', name: 'The Buzzsaw', emoji: '🪚',
        baseHP: 980, baseDamage: 25, chargeMax: 11,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_buzz: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'ricochet_saws', intervalBase: 15000, intervalVariance: 4000, handler: '_egMechBzRicochetSaws' },
            { name: 'cut_line', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechBzCutLine' },
            { name: 'saw_traps', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechBzSawTraps', phase2Only: true },
            { name: 'pendulum_blades', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechBzPendulumBlades', phase2Only: true },
        ],
        onPhaseEnter: _egBzOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_BZ_RICOCHET_DMG = [0, 0.18, 0.22, 0.26];   // flying saw touch, by phase
const EG_BZ_FLOOR_DMG    = [0, 0.14, 0.17, 0.20];   // embedded floor blade touch
const EG_BZ_CUT_DMG      = [0, 0.22, 0.25, 0.28];   // cut line sweep hit
const EG_BZ_TRAP_DMG     = [0, 0, 0.16, 0.19];      // saw trap blade touch
const EG_BZ_PEND_DMG     = [0, 0, 0, 0.25];         // pendulum saw hit
const EG_BZ_FINAL_DMG    = 0.32;                    // CROSSCUT full-screen hit
const EG_BZ_WALL_DMG     = 0.10;                    // per wall-saw touch (finale)
const EG_BZ_HIT_CD_MS    = 700;                     // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Center of the playable grid (from corner cells), or viewport fallback.
function _egBzGridCenter() {
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
    return { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
}

// Builds one spinning saw blade: a fixed outer dot (translate-positioned)
// with the metallic blade disc as a CHILD element (rotate animations run on
// the child — never on the fixed wrapper). size in px.
function _egBzSawEl(run, size, cls) {
    const dot = _egNkEl(run, 'div', 'eg-nk-dot eg-bz-saw' + (cls ? ' ' + cls : ''));
    const blade = document.createElement('div');
    blade.className = 'eg-bz-blade';
    blade.style.width = size + 'px';
    blade.style.height = size + 'px';
    dot.appendChild(blade);
    return { dot, blade };
}

// One steel-on-steel spark burst where a saw slams into something (visual
// only, body-level so it survives the run ending in the same frame).
function _egBzSparks(x, y, big) {
    const layer = document.createElement('div');
    layer.className = 'eg-bz-sparks' + (big ? ' eg-bz-sparks-big' : '');
    layer.style.left = Math.round(x) + 'px';
    layer.style.top = Math.round(y) + 'px';
    document.body.appendChild(layer);
    for (let i = 0; i < (big ? 8 : 5); i++) {
        const s = document.createElement('div');
        s.className = 'eg-bz-spark';
        const ang = Math.random() * Math.PI * 2;
        const dist = 18 + Math.random() * (big ? 60 : 34);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist) + 'px');
        s.style.animationDelay = (Math.random() * 90) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, _EG_BZ_DEBUG_SLOW ? 1800 : 800);
}

// Touch damage helper shared by all buzzsaw blades. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egBzHitCd = 0;
function _egBzTouch(pct, element, level, label) {
    const now = performance.now();
    if (now < _egBzHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egBzHitCd = now + EG_BZ_HIT_CD_MS;
    const dealt = _egNkHit(pct, element, level);
    _egNkAbilityHitToast(dealt, 'The Buzzsaw', label);
    return true;
}


//------------------------------------------------------------------------
//-------------------MECHANIC: RICOCHET SAWS--------------------------------
//------------------------------------------------------------------------
// Blades are flung in from a random edge, aimed at the player, and bounce
// off the screen edges up to 3 times — each impact sparks steel — before
// embedding themselves in the floor where they landed as short-lived
// spinning hazards. Phase 2+ throws pairs, phase 3 throws a trio.
const EG_BZ_RIC_BOUNCE_MS = 5200;   // max time spent flying before embedding
const EG_BZ_FLOOR_LIFE_MS = 6500;   // embedded blade hazard lifetime

function _egMechBzRicochetSaws(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const speed = [0, 340, 390, 450][p] / _EG_BZ_DEBUG_MULT;
    const size = [0, 52, 56, 62][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = [0, 1, 2, 3][p];

    _egNkToast('eg_mech_bz_ricochet', '🪚 The Buzzsaw: RICOCHET SAWS — watch the bounce!', '#e2e8f0');

    const saws = [];
    for (let i = 0; i < count; i++) {
        // Launch from a random edge, aimed across the arena at the player.
        const pc = _egNkPlayerCenter() || { x: W / 2, y: H / 2 };
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = 30; y = pc.y + (Math.random() * 2 - 1) * H * 0.25; }
        else if (side === 1) { x = W - 30; y = pc.y + (Math.random() * 2 - 1) * H * 0.25; }
        else if (side === 2) { x = pc.x + (Math.random() * 2 - 1) * W * 0.25; y = 30; }
        else { x = pc.x + (Math.random() * 2 - 1) * W * 0.25; y = H - 30; }
        const ang = Math.atan2(pc.y - y, pc.x - x) + (Math.random() * 0.5 - 0.25);
        const sp = speed * (0.85 + Math.random() * 0.3);
        const sprite = _egBzSawEl(run, size, 'eg-bz-flying');
        sprite.dot.style.transform = 'translate(' + Math.round(x - size / 2) + 'px,' + Math.round(y - size / 2) + 'px)';
        saws.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, sp, sprite, bounces: 0, embedded: false, floorEl: null, born: 0 });
    }

    let e = 0, floorPhase = false, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const pr = _egNkPlayerRect();
        let alive = 0;
        saws.forEach(s => {
            if (s.embedded) return;
            alive++;
            s.x += s.vx * dtS;
            s.y += s.vy * dtS;
            const r = 26;
            if (s.x < r + 6 || s.x > W - r - 6) { s.vx *= -1; s.bounces++; _egBzSparks(s.x, s.y, false); }
            if (s.y < r + 6 || s.y > H - r - 6) { s.vy *= -1; s.bounces++; _egBzSparks(s.x, s.y, false); }
            s.x = Math.max(r + 6, Math.min(W - r - 6, s.x));
            s.y = Math.max(r + 6, Math.min(H - r - 6, s.y));
            s.sprite.dot.style.transform = 'translate(' + Math.round(s.x - 30) + 'px,' + Math.round(s.y - 30) + 'px)';
            // Flying saws bite on contact.
            if (pr && now >= touchCd && _egNkCircleHit(s.x, s.y, r, pr, 0)) {
                touchCd = now + EG_BZ_HIT_CD_MS;
                _egBzTouch(EG_BZ_RICOCHET_DMG[p], null, level, 'Ricochet Saws');
            }
            // Done bouncing (3 walls or timeout): embed into the floor here.
            if (s.bounces >= 3 || e > EG_BZ_RIC_BOUNCE_MS * _EG_BZ_DEBUG_MULT) {
                s.embedded = true;
                s.born = e;
                try { s.sprite.dot.remove(); } catch (err) {}
                _egBzSparks(s.x, s.y, true);
                const floor = document.createElement('div');
                floor.className = 'eg-bz-floorblade';
                floor.style.left = Math.round(s.x - 30) + 'px';
                floor.style.top = Math.round(s.y - 30) + 'px';
                const blade = document.createElement('div');
                blade.className = 'eg-bz-blade eg-bz-blade-floor';
                blade.style.width = '54px';
                blade.style.height = '54px';
                floor.appendChild(blade);
                document.body.appendChild(floor);
                run.els.push(floor);
                s.floorEl = floor;
            }
        });
        // Embedded floor blades: spin hazard for a while, then retract.
        saws.forEach(s => {
            if (!s.embedded || !s.floorEl) return;
            const age = e - s.born;
            if (age > EG_BZ_FLOOR_LIFE_MS * _EG_BZ_DEBUG_MULT) {
                s.floorEl.classList.add('eg-bz-retract');
                const el = s.floorEl;
                s.floorEl = null;
                setTimeout(() => { try { el.remove(); } catch (err) {} }, 500);
                return;
            }
            if (pr && now >= touchCd && _egNkCircleHit(s.x, s.y, 24, pr, 0)) {
                touchCd = now + EG_BZ_HIT_CD_MS;
                _egBzTouch(EG_BZ_FLOOR_DMG[p], null, level, 'Embedded Blade');
            }
        });
        // Run ends when every saw flew, embedded and retracted.
        return e < (EG_BZ_RIC_BOUNCE_MS + EG_BZ_FLOOR_LIFE_MS + 800) * _EG_BZ_DEBUG_MULT;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: CUT LINE-------------------------------------
//------------------------------------------------------------------------
// A dashed telegraph band stretches across the whole arena along a random
// angle through (near) the player's current position. After the windup the
// band ignites and a giant saw sweeps along it once, edge to edge. Step
// OUT of the band before the sweep.
const EG_BZ_CUT_WINDUP_MS = 2600;
const EG_BZ_CUT_BAND_W    = 64;    // band thickness in px

function _egMechBzCutLine(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const pc = _egNkPlayerCenter() || _egBzGridCenter();
    // Random band angle through a point near the player (clamped on-screen).
    const ang = Math.random() * Math.PI;
    const cx = Math.max(80, Math.min(window.innerWidth - 80, pc.x + (Math.random() * 2 - 1) * 90));
    const cy = Math.max(80, Math.min(window.innerHeight - 80, pc.y + (Math.random() * 2 - 1) * 90));
    const len = Math.hypot(window.innerWidth, window.innerHeight) + 120;

    _egNkToast('eg_mech_bz_cutline', '🪚 The Buzzsaw: CUT LINE — out of the band!', '#fbbf24');

    const band = document.createElement('div');
    band.className = 'eg-bz-cutband';
    band.style.width = Math.round(len) + 'px';
    band.style.height = EG_BZ_CUT_BAND_W + 'px';
    band.style.left = Math.round(cx - len / 2) + 'px';
    band.style.top = Math.round(cy - EG_BZ_CUT_BAND_W / 2) + 'px';
    band.style.transformOrigin = '50% 50%';
    band.style.rotate = ang + 'rad';
    document.body.appendChild(band);
    run.els.push(band);

    const sweep = _egBzSawEl(run, 86, 'eg-bz-cutter');
    const sweepDot = sweep.dot;
    sweepDot.style.zIndex = '9004';

    const windupMs = EG_BZ_CUT_WINDUP_MS * _EG_BZ_DEBUG_MULT;
    let t = 0, sweeping = false;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        if (t < windupMs) return true;

        if (!sweeping) {
            sweeping = true;
            band.classList.add('eg-bz-cutband-live');
        }
        // Sweep progress 0..1 across the band, minus a short tail.
        const sweepMs = 1500 * _EG_BZ_DEBUG_MULT;
        const pr = Math.min(1, (t - windupMs) / sweepMs);
        if (pr >= 1) {
            try { band.remove(); } catch (e) {}
            return false;
        }
        // Position the giant saw along the band axis.
        const half = len / 2 - 50;
        const sx = cx + Math.cos(ang) * (-half + pr * half * 2);
        const sy = cy + Math.sin(ang) * (-half + pr * half * 2);
        sweepDot.style.transform = 'translate(' + Math.round(sx - 43) + 'px,' + Math.round(sy - 43) + 'px)';
        if (Math.random() < 0.35) _egBzSparks(sx, sy, false);
        // Contact damage while the band overlaps the player.
        const pcr = _egNkPlayerRect();
        if (pcr) {
            // Distance from player centre to the band's centre line.
            const dx = pcr.left + pcr.width / 2 - cx, dy = pcr.top + pcr.height / 2 - cy;
            const along = Math.abs(Math.cos(ang) * dy - Math.sin(ang) * dx); // perpendicular distance
            if (along < EG_BZ_CUT_BAND_W / 2 + 14) {
                _egBzTouch(EG_BZ_CUT_DMG[p], null, level, 'Cut Line');
            }
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: SAW TRAPS (field, passive)-------------------
//------------------------------------------------------------------------
// Half a dozen floor positions flash a saw silhouette for a windup, then
// erupt into embedded spinning blade hazards that linger a while. The run
// is PASSIVE (field hazard — never blocks other mechanics).
const EG_BZ_TRAP_COUNT = [0, 0, 5, 7];
const EG_BZ_TRAP_WINDUP_MS = 2400;
const EG_BZ_TRAP_LIFE_MS = 8000;

function _egMechBzSawTraps(monster, phase) {
    if (_egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    run.passive = true;
    const W = window.innerWidth, H = window.innerHeight;
    const count = EG_BZ_TRAP_COUNT[p];

    _egNkToast('eg_mech_bz_traps', '🪚 The Buzzsaw: SAW TRAPS erupting — mind the floor!', '#fbbf24');

    const traps = [];
    for (let i = 0; i < count; i++) {
        const x = 100 + Math.random() * (W - 200);
        const y = 120 + Math.random() * (H - 240);
        const warn = document.createElement('div');
        warn.className = 'eg-bz-trap-warn';
        warn.style.left = Math.round(x - 34) + 'px';
        warn.style.top = Math.round(y - 34) + 'px';
        document.body.appendChild(warn);
        run.els.push(warn);
        traps.push({ x, y, warn, bladeEl: null });
    }

    // Windup: all warnings flash together, then every trap erupts (slightly
    // staggered so the field reads as a ripple, not a flashbang).
    const windupMs = EG_BZ_TRAP_WINDUP_MS * _EG_BZ_DEBUG_MULT;
    let eruptIdx = 0, t = 0, touchCd = 0, pr0 = null;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _egNkPlayerRect();
        while (eruptIdx < traps.length && t >= windupMs + eruptIdx * 180 * _EG_BZ_DEBUG_MULT) {
            const tr = traps[eruptIdx];
            eruptIdx++;
            try { tr.warn.remove(); } catch (e) {}
            _egBzSparks(tr.x, tr.y, true);
            const blade = document.createElement('div');
            blade.className = 'eg-bz-floorblade eg-bz-trap';
            blade.style.left = Math.round(tr.x - 30) + 'px';
            blade.style.top = Math.round(tr.y - 30) + 'px';
            const b = document.createElement('div');
            b.className = 'eg-bz-blade eg-bz-blade-floor';
            b.style.width = '56px';
            b.style.height = '56px';
            blade.appendChild(b);
            document.body.appendChild(blade);
            run.els.push(blade);
            tr.bladeEl = blade;
        }
        let anyBlade = false;
        traps.forEach(tr => {
            if (!tr.bladeEl) return;
            anyBlade = true;
            if (pr && now >= touchCd && _egNkCircleHit(tr.x, tr.y, 25, pr, 0)) {
                touchCd = now + EG_BZ_HIT_CD_MS;
                _egBzTouch(EG_BZ_TRAP_DMG[p], null, level, 'Saw Trap');
            }
        });
        // End: fade all blades out.
        if (t > (EG_BZ_TRAP_WINDUP_MS + EG_BZ_TRAP_LIFE_MS) * _EG_BZ_DEBUG_MULT || (!anyBlade && eruptIdx >= traps.length && t > windupMs + 500)) {
            traps.forEach(tr => {
                if (tr.bladeEl) { tr.bladeEl.classList.add('eg-bz-retract'); const el = tr.bladeEl; setTimeout(() => { try { el.remove(); } catch (e) {} }, 500); }
                try { tr.warn.remove(); } catch (e) {}
            });
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: PENDULUM BLADES (phase 3)--------------------
//------------------------------------------------------------------------
// Two giant saws on chains hang from the top of the arena and swing back
// and forth like scythes, phase-offset so the arcs cross. Dodge under or
// through the gap when the arcs open.
const EG_BZ_PEND_SWINGS = 3;

function _egMechBzPendulumBlades(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(3, Math.min(3, Number(phase) || 3));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth;

    _egNkToast('eg_mech_bz_pendulum', '🪚 The Buzzsaw: PENDULUM BLADES — time the arcs!', '#e2e8f0');

    const mkPend = (xCtr, phaseOff) => {
        const wrap = document.createElement('div');
        wrap.className = 'eg-bz-pendulum';
        wrap.style.left = Math.round(xCtr) + 'px';
        const chain = document.createElement('div');
        chain.className = 'eg-bz-chain';
        const sprite = _egBzSawEl(run, 88, 'eg-bz-pendsaw');
        sprite.dot.style.position = 'absolute';
        sprite.dot.style.left = '-44px';
        sprite.dot.style.bottom = '-44px';
        wrap.appendChild(chain);
        wrap.appendChild(sprite.dot);
        document.body.appendChild(wrap);
        run.els.push(wrap);
        return { wrap, sprite, xCtr, phaseOff };
    };
    const pends = [mkPend(W * 0.32, 0), mkPend(W * 0.68, Math.PI)];

    const swingS = 1.9 * _EG_BZ_DEBUG_MULT;
    let t = 0, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const totalMs = swingS * 1000 * EG_BZ_PEND_SWINGS;
        const pr = _egNkPlayerRect();
        let done = true;
        pends.forEach(pd => {
            const local = ((t / 1000 + pd.phaseOff / (Math.PI * 2) * swingS) % swingS) / swingS; // 0..1
            // Ease-in-out pendulum: cos swing between -55° and +55°.
            const ang = Math.cos(local * Math.PI * 2) * 55;
            pd.wrap.style.transform = 'rotate(' + ang.toFixed(2) + 'deg)';
            // Saw centre for hit tests: pivot + rotated arm.
            const arm = 210;
            const rad = ang * Math.PI / 180;
            const sx = pd.xCtr + Math.sin(rad) * arm;
            const sy = 40 + Math.cos(rad) * arm;
            pd.sprite.dot.style.transform = 'translate(' + Math.round(sx - pd.xCtr - 44 + 44) + 'px,' + Math.round(sy - 40 - 44) + 'px)';
            if (t < totalMs) done = false;
            if (pr && now >= touchCd && _egNkCircleHit(sx, sy, 40, pr, 0)) {
                touchCd = now + EG_BZ_HIT_CD_MS;
                _egBzTouch(EG_BZ_PEND_DMG[p], null, level, 'Pendulum Blade');
            }
        });
        if (t > totalMs + 400) {
            pends.forEach(pd => { try { pd.wrap.remove(); } catch (e) {} });
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------SSSS… THE FINAL CUT (≤10% HP one-shot finale)----------
//------------------------------------------------------------------------
// The boss goes immune + shielded and SPINS UP while four toothed wall-saws
// close in from the four screen edges over a 3…2…1 countdown, shrinking the
// safe pocket around the arena centre. At zero: CROSSCUT — two colossal
// blade streaks slash across the full screen in a giant X. Only the centre
// pocket survives. Charge bar frozen for the whole set-piece (gate in
// _egTickPlayer via _egBzFinalActive).
const EG_BZ_FINAL_CD_TICK_MS = 800;
const EG_BZ_FINAL_CD_TICKS = 3;
const EG_BZ_FINAL_POCKET_PCT = 0.16;   // safe pocket radius, of min(vw,vh)

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egBzFinal = null;

function _egBzFinalActive() {
    return !!_egBzFinal && !_egBzFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egBzOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egBzStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egBzStartFinalWatcher(monster) {
    if (!monster || _egBzFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egBzFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egBzFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

function _egBzFinalStart(monster) {
    if (_egBzFinal || !monster) return;

    // The arena goes quiet: kill every other run of this boss.
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const g = {
        monsterId: monster.id,
        finished: false,
        count: EG_BZ_FINAL_CD_TICKS,
        overlay: null,
        walls: [],
        run: null,
        cdTimer: null,
        center: _egBzGridCenter(),
        pocketR: Math.min(window.innerWidth, window.innerHeight) * EG_BZ_FINAL_POCKET_PCT,
    };
    _egBzFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // Four toothed wall-saws close in from the edges (CSS transition drives
    // the approach; debug-stretched so it screenshots mid-growth).
    const inset = g.pocketR;   // final distance each wall stops from centre
    const closeS = _EG_BZ_DEBUG_SLOW ? 8 : 2.6;
    const mkWall = (which) => {
        const w = document.createElement('div');
        w.className = 'eg-bz-wall';
        const W = window.innerWidth, H = window.innerHeight;
        if (which === 'top' || which === 'bottom') {
            w.style.left = '0px'; w.style.width = W + 'px';
            if (which === 'top') w.style.top = '0px'; else w.style.bottom = '0px';
        } else {
            w.style.top = '0px'; w.style.height = H + 'px';
            if (which === 'left') w.style.left = '0px'; else w.style.right = '0px';
        }
        document.body.appendChild(w);
        return w;
    };
    const walls = { top: mkWall('top'), bottom: mkWall('bottom'), left: mkWall('left'), right: mkWall('right') };
    g.walls = walls;
    requestAnimationFrame(() => {
        const W = window.innerWidth, H = window.innerHeight;
        const ct = g.center.y - inset, cb = H - (g.center.y + inset);
        const cl = g.center.x - inset, cr = W - (g.center.x + inset);
        const setAll = (el, style) => { Object.keys(style).forEach(k => el.style[k] = style[k]); };
        setAll(walls.top, { height: Math.max(0, Math.round(ct)) + 'px' });
        setAll(walls.bottom, { height: Math.max(0, Math.round(cb)) + 'px' });
        setAll(walls.left, { width: Math.max(0, Math.round(cl)) + 'px' });
        setAll(walls.right, { width: Math.max(0, Math.round(cr)) + 'px' });
    });

    // Boss spin-up: the card tilts and vibrates like a revving saw.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-bz-spinning');
        wrap.classList.add('eg-nk-shielded');
    }

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-bz-cd';
    ov.innerHTML =
        '<div class="eg-bz-cd-label">🪚 THE FINAL CUT</div>' +
        '<div class="eg-bz-cd-num eg-bz-cd-pop">' + g.count + '</div>' +
        '<div class="eg-bz-cd-hint">The walls are closing in — hold the CENTRE pocket!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_bz_final_cd', '🪚💀 THE FINAL CUT — hold the centre!', '#e2e8f0');

    // Boss immunity so the set-piece reads as a hold (released at the end).
    monster.bossImmune = true;

    // Wall touch damage during the closing phase (0.8s shared cooldown).
    const wallTick = setInterval(() => {
        if (!_egBzFinal || _egBzFinal !== g || g.finished) { clearInterval(wallTick); return; }
        if (_egNkFrozen()) return;
        const pr = _egNkPlayerRect();
        if (!pr) return;
        const W = window.innerWidth, H = window.innerHeight;
        const cx = pr.left + pr.width / 2, cy = pr.top + pr.height / 2;
        const nearTop = cy <= g.center.y - g.pocketR + 10;
        const nearBottom = cy >= g.center.y + g.pocketR - 10;
        const nearLeft = cx <= g.center.x - g.pocketR + 10;
        const nearRight = cx >= g.center.x + g.pocketR - 10;
        if ((nearTop && walls.top.getBoundingClientRect().height > 4) ||
            (nearBottom && walls.bottom.getBoundingClientRect().height > 4) ||
            (nearLeft && walls.left.getBoundingClientRect().width > 4) ||
            (nearRight && walls.right.getBoundingClientRect().width > 4)) {
            _egBzTouch(EG_BZ_WALL_DMG, null, monster.level, 'Wall Saws');
        }
    }, 200);
    g.wallTick = wallTick;

    // Debug: extra-long ticks so screenshots can catch the walls + countdown.
    const cdTick = EG_BZ_FINAL_CD_TICK_MS * (_EG_BZ_DEBUG_SLOW ? 10 : 1);
    g.cdTimer = setInterval(() => {
        if (!_egBzFinal || _egBzFinal !== g || g.finished) return;
        if (_egNkFrozen()) return;   // pause / death / inactive hold the count
        g.count--;
        if (g.count <= 0) {
            clearInterval(g.cdTimer);
            g.cdTimer = null;
            try { g.overlay.remove(); } catch (e) {}
            g.overlay = null;
            _egBzFinalBang(g, monster);
            return;
        }
        const num = g.overlay && g.overlay.querySelector('.eg-bz-cd-num');
        if (num) {
            num.textContent = g.count;
            num.classList.remove('eg-bz-cd-pop');
            void num.offsetWidth;
            num.classList.add('eg-bz-cd-pop');
        }
    }, cdTick);
}

// The CROSSCUT: two colossal blade streaks slash across the screen in a
// giant X from the arena centre. Everyone OUTSIDE the centre pocket is hit.
function _egBzFinalBang(g, monster) {
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(g.monsterId, true);
    g.run = run;
    run.onKill = () => { if (_egBzFinal === g) { try { _egBzFinalEnd(g); } catch (e) {} } };

    _egNkToast('eg_mech_bz_final_bang', '🪚💀 CROSSCUT!', '#e2e8f0');

    // Screen flash at the moment of the crosscut.
    document.body.classList.add('eg-bz-flash');
    setTimeout(() => document.body.classList.remove('eg-bz-flash'), 700);

    // Giant X: two blade streaks rotating out from the centre.
    for (let i = 0; i < 2; i++) {
        const streak = document.createElement('div');
        streak.className = 'eg-bz-cross';
        streak.style.left = Math.round(g.center.x) + 'px';
        streak.style.top = Math.round(g.center.y) + 'px';
        streak.style.rotate = (i === 0 ? 45 : -45) + 'deg';
        document.body.appendChild(streak);
        run.els.push(streak);
    }
    // Spark storm at the centre point.
    _egBzSparks(g.center.x, g.center.y, true);

    // Everyone outside the safe pocket takes the CROSSCUT.
    const pr = _egNkPlayerRect();
    if (pr) {
        const px = pr.left + pr.width / 2, py = pr.top + pr.height / 2;
        if (Math.hypot(px - g.center.x, py - g.center.y) > g.pocketR) {
            const dealt = _egNkHit(EG_BZ_FINAL_DMG, null, level);
            _egNkAbilityHitToast(dealt, 'The Buzzsaw', 'THE FINAL CUT');
        }
    }

    // Walls retract, then hand control back to the boss (debug: linger long
    // enough for the crosscut visuals to be captured).
    const W = window.innerWidth, H = window.innerHeight;
    const setAll = (el, style) => { Object.keys(style).forEach(k => el.style[k] = style[k]); };
    setAll(g.walls.top, { height: '0px' });
    setAll(g.walls.bottom, { height: '0px' });
    setAll(g.walls.left, { width: '0px' });
    setAll(g.walls.right, { width: '0px' });
    const id2 = setTimeout(() => _egBzFinalEnd(g), _EG_BZ_DEBUG_SLOW ? 7000 : 1400);
    run.timers.push(id2);
}

function _egBzFinalEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    if (g.wallTick) { clearInterval(g.wallTick); g.wallTick = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    Object.values(g.walls).forEach(w => { try { w.remove(); } catch (e) {} });
    if (g.run) { try { _egNkKillRun(g.run); } catch (e) {} g.run = null; }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    document.body.classList.remove('eg-bz-flash');
    document.querySelectorAll('.eg-bz-spinning').forEach(el => el.classList.remove('eg-bz-spinning'));

    const m = (g.monsterId && typeof _egMonsters !== 'undefined')
        ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _egBossScheduleMechanics === 'function') {
            try { _egBossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
    }
    if (_egBzFinal === g) _egBzFinal = null;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body class this boss ever created.
function _egBzTeardown() {
    if (_egBzFinal) { try { _egBzFinalEnd(_egBzFinal); } catch (e) {} _egBzFinal = null; }
    document.querySelectorAll('.eg-bz-cutband, .eg-bz-floorblade, .eg-bz-trap-warn, ' +
        '.eg-bz-pendulum, .eg-bz-sparks, .eg-bz-wall, .eg-bz-cross, .eg-bz-cd').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.body.classList.remove('eg-bz-flash');
    document.querySelectorAll('.eg-bz-spinning').forEach(el => el.classList.remove('eg-bz-spinning'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_BZ_DEBUG.fire('ricochet'|'cut'|'traps'|'pendulum') — runs one now
//   _EG_BZ_DEBUG.final()                                   — FINAL CUT now
if (typeof window !== 'undefined') {
    window._EG_BZ_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_buzz') : null;
            if (!monster) return 'no buzzsaw alive';
            const fn = name === 'ricochet' ? _egMechBzRicochetSaws
                : name === 'cut' ? _egMechBzCutLine
                : name === 'traps' ? _egMechBzSawTraps
                : name === 'pendulum' ? _egMechBzPendulumBlades : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'traps' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_buzz') : null;
            if (!monster) return 'no buzzsaw alive';
            _egBzFinalStart(monster);
            return 'FINAL CUT started';
        },
    };
}
