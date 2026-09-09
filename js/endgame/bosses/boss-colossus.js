//------------------------------------------------------------------------
//-------------------BOSS: THE COLOSSUS (boss_colossus)--------------------
//------------------------------------------------------------------------
// TIER 7 REWORK — "The Mountain That Walks". The boss is scenery that
// attacks; the fight is about reading huge telegraphs and raiding the
// titan's joints. Elementless: the Colossus deals PURE PHYSICAL — resists
// don't help. That is its identity.
//   • SEISMIC STRIDE (signature, all fight) — the Colossus WALKS: two giant
//     footprints slam down sequentially (rounded band telegraphs), then a
//     full-screen shockwave ring rolls out of each print with jump-window
//     gaps. Phase 3 strides cross the arena diagonally.
//   • BOULDER RAIN (60%) — the shoulder quarries hurl 🪨 boulders that arc
//     in and SHATTER into rolling fragments that keep travelling. Dive
//     through the fragment lanes, not just the impact ring.
//   • GRANITE GOLEMS (60%) — two golem statues climb out of cracks and
//     slow-push toward you: moving walls that pin you into stride
//     telegraphs. Body-check a golem 3× to crumble it early.
//   • 💀 TITAN'S FALL (≤10%, one-shot finale) — the Colossus kneels and the
//     arena becomes a climb: three glowing JOINT SEALS (shoulder, knee,
//     chest) light up one at a time; reach and body-check the lit seal
//     while falling-rock chutes (telegraphed lanes) sweep the arena. Break
//     a seal → the titan slumps (screen shake). All three → the Colossus
//     collapses for good. Fail timer → CAVE-IN: dust wipes the arena except
//     one lit seal ring (35% hit). Charge bar frozen (gate in _egTickPlayer
//     via _egColoFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock, so
// gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (corrupt_cells) live in shared-boss-abilities.js and are
// referenced by handler-name string. The point-to-segment helper is the
// shared _egPtSegDist (moved here from boss-inferno.js).
//------------------------------------------------------------------------

// DEBUG: slow the Colossus' timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Flip to false for ship.
const _EG_COLO_DEBUG_SLOW = true;
const _EG_COLO_DEBUG_MULT = _EG_COLO_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_colossus: {
        id: 'boss_colossus', name: 'The Colossus', emoji: '🗿',
        baseHP: 1140, baseDamage: 24, chargeMax: 13,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_colossus: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            // Signature keeps the historic handler name (save-compat with
            // existing scheduled timers / debug docs): the old double-ring
            // slam is now the walking Stride inside it.
            { name: 'seismic_stride', intervalBase: 20000, intervalVariance: 4500, handler: '_egMechSeismicSlam' },
            { name: 'corrupt_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
            { name: 'boulder_rain', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechColoBoulders', phase2Only: true },
            { name: 'granite_golems', intervalBase: 24000, intervalVariance: 5000, handler: '_egMechColoGolems', phase2Only: true },
        ],
        onPhaseEnter: _egColoOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_COLO_FOOT_DMG   = [0, 0.15, 0.17, 0.20]; // %maxHP footprint slam band
const EG_COLO_WAVE_DMG   = [0, 0.18, 0.21, 0.25]; // %maxHP shockwave ring
const EG_COLO_BOULDER_DMG = 0.16;                 // %maxHP boulder impact
const EG_COLO_FRAG_DMG   = 0.12;                  // %maxHP rolling fragment
const EG_COLO_GOLEM_DMG  = 0.14;                  // %maxHP golem push
const EG_COLO_CHUTE_DMG  = [0, 0, 0.10, 0.12];    // %maxHP rock chute (finale)
const EG_COLO_SEAL_HITS  = 3;                     // body-checks per joint seal
const EG_COLO_CHARGE_DMG = 0.22;                  // %maxHP failing a seal wave
const EG_COLO_CAVEIN_DMG = 0.35;                  // %maxHP the CAVE-IN
const EG_COLO_HIT_CD_MS  = 700;                   // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Colossus hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egColoHitCd = 0;
function _egColoTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egColoHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egColoHitCd = now + EG_COLO_HIT_CD_MS;
    const dealt = _egNkHit(pct, null, level);
    _egNkAbilityHitToast(dealt, 'The Colossus', label);
    return true;
}

// Player centre with a screen-centre fallback.
function _egColoPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Rock chip burst at a spot (visual only).
function _egColoRubble(run, x, y, big) {
    for (let i = 0; i < (big ? 6 : 3); i++) {
        const el = _egNkEl(run, 'div', 'eg-colo-chip');
        el.style.left = Math.round(x + (Math.random() * 40 - 20)) + 'px';
        el.style.top = Math.round(y + (Math.random() * 24 - 12)) + 'px';
        el.style.animationDelay = (i * 45) + 'ms';
        setTimeout(() => { try { el.remove(); } catch (e) {} }, _EG_COLO_DEBUG_SLOW ? 2200 : 900);
    }
}

// Screen shake: quick translate jitter on the body (finale slump feedback).
function _egColoShake(intensity) {
    const body = document.body;
    const frames = 12;
    let i = 0;
    const step = () => {
        if (i >= frames) { body.style.transform = ''; return; }
        const a = intensity * (1 - i / frames);
        body.style.transform = 'translate(' + (Math.random() * 8 - 4) * a + 'px,' + (Math.random() * 8 - 4) * a + 'px)';
        i++;
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: SEISMIC STRIDE (all fight)-----------------
//------------------------------------------------------------------------
// The Colossus walks across the arena. Two footprints slam sequentially
// (each: a rounded band telegraph, then the slam), and each slam rolls a
// full-screen shockwave ring with a jump-window gap between band and fade.
// Phase 3: the stride path runs diagonally instead of horizontally.
const EG_COLO_STRIDE_STEPS = 2;      // footprints per stride
const EG_COLO_FOOT_WARN_MS = 1000;   // footprint telegraph
const EG_COLO_WAVE_SPEED = 520;      // px/s shockwave expansion (divided by mult)
const EG_COLO_WAVE_MAX_FRAC = 0.75;  // of the larger screen dimension

function _egMechSeismicSlam(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    // Stride path: horizontal sweep (p1/p2) or diagonal (p3).
    const diagonal = p >= 3;
    const y0 = H * (diagonal ? 0.22 : 0.42);
    const y1 = H * (diagonal ? 0.72 : 0.42);
    const x0 = W * 0.18, x1 = W * 0.82;
    const feet = [];
    for (let i = 0; i < EG_COLO_STRIDE_STEPS; i++) {
        const f = EG_COLO_STRIDE_STEPS === 1 ? 0.5 : i / (EG_COLO_STRIDE_STEPS - 1);
        feet.push({
            x: x0 + (x1 - x0) * f,
            y: y0 + (y1 - y0) * f,
            state: 'wait',   // wait → warn → slam → wave → done
            t: 0,
            warned: null, slamEl: null, waveEl: null, r: 40,
        });
    }
    _egNkToast('eg_mech_quake', '🗿 The Colossus: SEISMIC STRIDE — it walks! Mind the footprints!', '#d6c8a8');

    // ONE loop drives all feet (each footprint's lifecycle is a state).
    _egNkLoop(run, (dtS, now) => {
        const pr = _egNkPlayerRect();
        const pc = _egColoPC();
        let pending = false;
        feet.forEach((ft, idx) => {
            // Start the next foot only after the previous one slammed.
            if (ft.state === 'wait') {
                if (idx === 0 || feet[idx - 1].state === 'wave' || feet[idx - 1].state === 'done') {
                    ft.state = 'warn';
                    ft.t = 0;
                    ft.warned = _egNkEl(run, 'div', 'eg-colo-foot-warn');
                    ft.warned.style.left = Math.round(ft.x - 78) + 'px';
                    ft.warned.style.top = Math.round(ft.y - 52) + 'px';
                }
                pending = true;
                return;
            }
            if (ft.state === 'warn') {
                pending = true;
                ft.t += dtS * 1000;
                if (ft.t >= EG_COLO_FOOT_WARN_MS * _EG_COLO_DEBUG_MULT) {
                    // SLAM.
                    try { ft.warned.remove(); } catch (e) {}
                    ft.slamEl = _egNkEl(run, 'div', 'eg-colo-foot-slam');
                    ft.slamEl.style.left = Math.round(ft.x - 78) + 'px';
                    ft.slamEl.style.top = Math.round(ft.y - 52) + 'px';
                    _egColoRubble(run, ft.x, ft.y, true);
                    _egColoShake(1);
                    // Footprint band bites on the slam moment.
                    if (pr && Math.hypot(pc.x - ft.x, pc.y - ft.y) < 88) {
                        _egColoTouch(EG_COLO_FOOT_DMG[p], level, 'Footfall');
                    }
                    ft.waveEl = _egNkEl(run, 'div', 'eg-nk-ring eg-colo-wave');
                    ft.state = 'wave';
                    ft.t = 0;
                }
                return;
            }
            if (ft.state === 'wave') {
                pending = true;
                ft.t += dtS;
                const spd = EG_COLO_WAVE_SPEED / _EG_COLO_DEBUG_MULT;
                ft.r = 40 + spd * ft.t;
                const rMax = Math.max(W, H) * EG_COLO_WAVE_MAX_FRAC;
                ft.waveEl.style.left = Math.round(ft.x - ft.r) + 'px';
                ft.waveEl.style.top = Math.round(ft.y - ft.r) + 'px';
                ft.waveEl.style.width = Math.round(ft.r * 2) + 'px';
                ft.waveEl.style.height = Math.round(ft.r * 2) + 'px';
                if (pr && Math.abs(Math.hypot(pc.x - ft.x, pc.y - ft.y) - ft.r) < 26) {
                    _egColoTouch(EG_COLO_WAVE_DMG[p], level, 'Shockwave');
                }
                if (ft.r >= rMax) {
                    try { ft.slamEl.remove(); } catch (e) {}
                    try { ft.waveEl.remove(); } catch (e) {}
                    ft.state = 'done';
                }
            }
        });
        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: BOULDER RAIN (60%)----------------------------
//------------------------------------------------------------------------
// The shoulder quarries hurl boulders that arc in and SHATTER into rolling
// fragments that keep travelling outward. Dodge the impact ring AND the
// fragment lanes. Phase 3 lobs an extra boulder.
const EG_BOULDER_COUNT   = [0, 0, 3, 4];
const EG_BOULDER_FALL_MS = 1500;   // telegraph before impact
const EG_BOULDER_FRAGS   = 4;      // rolling fragments per boulder

function _egMechColoBoulders(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    _egNkToast('eg_mech_colo_boulder', '🗿🪨 BOULDER RAIN — the shatter rolls on!', '#d6c8a8');

    // ONE loop owns every boulder and every fragment.
    const boulders = [];
    let launched = 0, launchedAt = 0;
    const launchGap = 2.2; // s between boulder launches

    _egNkLoop(run, (dtS, now) => {
        // Launch the next boulder.
        if (launched < EG_BOULDER_COUNT[p] && (launched === 0 || launchedAt >= launchGap)) {
            launched++; launchedAt = 0;
            const tx = W * (0.12 + Math.random() * 0.76);
            const ty = H * (0.15 + Math.random() * 0.7);
            const el = _egNkEl(run, 'div', 'eg-colo-boulder', '🪨');
            el.style.left = Math.round(tx - 26) + 'px';
            el.style.top = Math.round(-70) + 'px';
            boulders.push({ x: tx, y: ty, el, state: 'fall', t: 0 });
        }
        launchedAt += dtS;

        const pr = _egNkPlayerRect();
        const pc = _egColoPC();
        let active = 0;
        for (const b of boulders) {
            if (b.state === 'fall') {
                active++;
                b.t += dtS * 1000;
                const f = Math.min(1, b.t / (EG_BOULDER_FALL_MS * _EG_COLO_DEBUG_MULT));
                const ease = f * f;
                b.el.style.top = Math.round(-70 + (b.y + 70) * ease) + 'px';
                b.el.style.transform = 'rotate(' + Math.round(b.t * 0.4) + 'deg)';
                if (f >= 1) {
                    // IMPACT: shatter into rolling fragments.
                    try { b.el.remove(); } catch (e) {}
                    _egColoRubble(run, b.x, b.y, true);
                    _egColoShake(0.7);
                    if (pr && Math.hypot(pc.x - b.x, pc.y - b.y) < 78) {
                        _egColoTouch(EG_COLO_BOULDER_DMG, level, 'Boulder');
                    }
                    b.frags = [];
                    for (let k = 0; k < EG_BOULDER_FRAGS; k++) {
                        const ang = (k / EG_BOULDER_FRAGS) * Math.PI * 2 + Math.random() * 0.5;
                        const fel = _egNkEl(run, 'div', 'eg-colo-frag');
                        fel.style.left = Math.round(b.x - 9) + 'px';
                        fel.style.top = Math.round(b.y - 9) + 'px';
                        b.frags.push({ ang, dist: 0, el: fel, hit: false });
                    }
                    b.state = 'frags';
                    b.t = 0;
                }
            } else if (b.state === 'frags') {
                active++;
                b.t += dtS;
                const rollSpd = 210 / _EG_COLO_DEBUG_MULT;
                let anyAlive = false;
                for (const fr of b.frags) {
                    if (fr.dist >= 340) { try { fr.el.remove(); } catch (e) {} continue; }
                    anyAlive = true;
                    fr.dist += rollSpd * dtS;
                    const fx = b.x + Math.cos(fr.ang) * fr.dist;
                    const fy = b.y + Math.sin(fr.ang) * fr.dist;
                    fr.el.style.left = Math.round(fx - 9) + 'px';
                    fr.el.style.top = Math.round(fy - 9) + 'px';
                    if (pr && !fr.hit && Math.hypot(pc.x - fx, pc.y - fy) < 30) {
                        fr.hit = true;
                        _egColoTouch(EG_COLO_FRAG_DMG, level, 'Rubble Roll');
                    }
                }
                if (!anyAlive) b.state = 'done';
            }
        }
        return active > 0;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: GRANITE GOLEMS (60%)--------------------------
//------------------------------------------------------------------------
// Two golem statues climb out of cracks and slow-push toward the player:
// moving walls that pin you into stride telegraphs. Body-check a golem 3×
// (crack stages, like the Shaper's monoliths) to crumble it early; they
// crumble on their own after ~9s.
const EG_GOLEM_COUNT     = [0, 0, 2, 2];
const EG_GOLEM_SPEED     = 62;      // px/s push (divided by mult)
const EG_GOLEM_HITS      = 3;
const EG_GOLEM_LIFE_MS   = 9000;

function _egMechColoGolems(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    _egNkToast('eg_mech_colo_golem', '🗿🧱 GRANITE GOLEMS — moving walls! Ram them to crumble them!', '#a8a29e');
    const golems = [];
    for (let i = 0; i < EG_GOLEM_COUNT[Math.max(2, Math.min(3, Number(phase) || 2))]; i++) {
        const el = _egNkEl(run, 'div', 'eg-colo-golem', '🧱');
        const gx = W * (i === 0 ? 0.16 : 0.84);
        const gy = H * (0.2 + Math.random() * 0.5);
        el.style.left = Math.round(gx - 28) + 'px';
        el.style.top = Math.round(gy - 28) + 'px';
        golems.push({ x: gx, y: gy, el, hp: EG_GOLEM_HITS, dead: false, born: 0 });
    }
    let t = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _egNkPlayerRect();
        const pc = _egColoPC();
        let active = false;
        for (const g of golems) {
            if (g.dead) continue;
            active = true;
            g.born += dtS * 1000;
            // Slow-push toward the player, capped step.
            const dx = pc.x - g.x, dy = pc.y - g.y;
            const d = Math.hypot(dx, dy) || 1;
            const spd = EG_GOLEM_SPEED / _EG_COLO_DEBUG_MULT;
            g.x += (dx / d) * Math.min(d, spd * dtS);
            g.y += (dy / d) * Math.min(d, spd * dtS);
            g.el.style.left = Math.round(g.x - 28) + 'px';
            g.el.style.top = Math.round(g.y - 28) + 'px';
            if (pr && Math.hypot(pc.x - g.x, pc.y - g.y) < 52) {
                _egColoTouch(EG_COLO_GOLEM_DMG, level, 'Golem Push');
            }
            if (g.born >= EG_GOLEM_LIFE_MS * _EG_COLO_DEBUG_MULT) {
                g.dead = true;
                _egColoRubble(run, g.x, g.y, true);
                try { g.el.remove(); } catch (e) {}
            }
        }
        return active;
    });

    // Body-check crumbling: separate lightweight loop, mirroring the
    // Shaper's monolith crack pattern (500ms per-hit cooldown, 3 stages).
    const crackLoop = _egNkNewRun(monster && monster.id, true);
    let crackCd = 0;
    _egNkLoop(crackLoop, (dtS, now) => {
        const pr = _egNkPlayerRect();
        if (pr && now >= crackCd) {
            const pc = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
            for (const g of golems) {
                if (g.dead) continue;
                if (Math.hypot(pc.x - g.x, pc.y - g.y) < 52) {
                    crackCd = now + 500;
                    g.hp--;
                    g.el.classList.remove('eg-colo-golem-crack1', 'eg-colo-golem-crack2');
                    if (g.hp === 2) g.el.classList.add('eg-colo-golem-crack1');
                    if (g.hp === 1) g.el.classList.add('eg-colo-golem-crack2');
                    _egColoRubble(run, g.x, g.y, false);
                    if (g.hp <= 0) {
                        g.dead = true;
                        _egColoRubble(run, g.x, g.y, true);
                        try { g.el.remove(); } catch (e) {}
                        _egNkToast('eg_mech_colo_golem_down', '🧱 Golem crumbled!', '#4ade80');
                    }
                    break;
                }
            }
        }
        if (golems.every(g => g.dead)) return false;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: TITAN'S FALL (≤10%, one-shot)-----------------
//------------------------------------------------------------------------
// The Colossus kneels. Three JOINT SEALS (shoulder, knee, chest) light up
// one at a time; reach and body-check the lit seal (3 hits each) while
// falling-rock chutes (telegraphed lanes) sweep the arena. Break a seal →
// the titan slumps (screen shake). All three → collapse for good. Fail
// timer → CAVE-IN: full-arena dust except one lit seal ring (35%).
// Charge bar frozen for the whole set-piece (gate in _egTickPlayer via
// _egColoFinalActive).
const EG_COLO_FINALE_SEAL_MS   = 22000;  // ms budget per seal (incl. chutes)
const EG_COLO_CHUTE_PERIOD_MS  = 2600;   // a chute lane every ~2.6s
const EG_COLO_CHUTE_WARN_MS    = 900;    // lane telegraph before rocks

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egColoFinal = null;

function _egColoFinalActive() {
    return !!_egColoFinal && !_egColoFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egColoOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egColoStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egColoStartFinalWatcher(monster) {
    if (!monster || _egColoFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egColoFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egColoFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
function _egColoAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egColoFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

function _egColoFinalStart(monster) {
    if (_egColoFinal || !monster) return;

    // The mountain goes quiet: kill every other run of this boss (the
    // finale owns the arena).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        stage: 'seals',            // seals → done
        seal: 0,                   // 0..2, which seal is lit
        fxRun: null, overlay: null, sealEls: [],
    };
    _egColoFinal = g;

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
    ov.className = 'eg-colo-cd';
    ov.innerHTML =
        '<div class="eg-colo-cd-label">🗿 TITAN\u2019S FALL</div>' +
        '<div class="eg-colo-cd-hint">Body-check the lit JOINT SEAL — 3 hits!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_colo_final_cd', '🗿💀 TITAN\u2019S FALL — break the lit seal!', '#d6c8a8');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the kneeling titan while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-colo-kneeling');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;

    // Joint seal positions: shoulder / knee / chest, spread over the arena.
    const sealSpots = [
        { x: W * 0.26, y: H * 0.30 },   // shoulder
        { x: W * 0.72, y: H * 0.66 },   // knee
        { x: W * 0.50, y: H * 0.48 },   // chest
    ];
    g.sealEls = sealSpots.map(s => {
        const el = document.createElement('div');
        el.className = 'eg-colo-seal';
        el.style.left = Math.round(s.x - 46) + 'px';
        el.style.top = Math.round(s.y - 46) + 'px';
        document.body.appendChild(el);
        g.fxRun.els.push(el);
        return { el, x: s.x, y: s.y, hp: EG_COLO_SEAL_HITS };
    });

    // ONE finale loop: lights each seal in turn, runs the body-check crack
    // clock, sweeps rock chutes, and judges the seal (break or CAVE-IN).
    _egNkLoop(g.fxRun, (dtS, now) => {
        if (g.finished) return false;
        const pr = _egNkPlayerRect();
        const pc = _egColoPC();
        const seal = g.sealEls[g.seal];
        if (!seal) return false;

        // ── Chutes: a telegraphed lane, then rocks rain along it. ──
        g.chuteAcc = (g.chuteAcc || 0) + dtS * 1000;
        if (g.chuteAcc >= EG_COLO_CHUTE_PERIOD_MS * _EG_COLO_DEBUG_MULT) {
            g.chuteAcc = 0;
            // Lane: random vertical or horizontal strip through the arena.
            const vertical = Math.random() < 0.5;
            const lanePos = vertical
                ? W * (0.1 + Math.random() * 0.8)
                : H * (0.1 + Math.random() * 0.8);
            const warn = _egNkEl(g.fxRun, 'div', 'eg-colo-chute-warn');
            if (vertical) {
                warn.style.left = Math.round(lanePos - 44) + 'px';
                warn.style.top = '0px';
                warn.style.width = '88px';
                warn.style.height = H + 'px';
            } else {
                warn.style.left = '0px';
                warn.style.top = Math.round(lanePos - 44) + 'px';
                warn.style.width = W + 'px';
                warn.style.height = '88px';
            }
            _egColoAfter(g, EG_COLO_CHUTE_WARN_MS * _EG_COLO_DEBUG_MULT, () => {
                if (g.finished) return;
                try { warn.remove(); } catch (e) {}
                const rocks = _egNkEl(g.fxRun, 'div', 'eg-colo-chute');
                if (vertical) {
                    rocks.style.left = Math.round(lanePos - 44) + 'px';
                    rocks.style.top = '0px';
                    rocks.style.width = '88px';
                    rocks.style.height = H + 'px';
                } else {
                    rocks.style.left = '0px';
                    rocks.style.top = Math.round(lanePos - 44) + 'px';
                    rocks.style.width = W + 'px';
                    rocks.style.height = '88px';
                }
                // The lane bites while the rocks fall (with the touch cd).
                g.activeChutes = g.activeChutes || [];
                g.activeChutes.push({ vertical, lanePos, el: rocks, until: performance.now() + 1400 * _EG_COLO_DEBUG_MULT, level });
            });
        }
        // Tick active chutes: contact damage + expiry.
        (g.activeChutes || []).forEach(ch => {
            if (performance.now() > ch.until) { try { ch.el.remove(); } catch (e) {} ch.done = true; return; }
            if (pr) {
                const inLane = ch.vertical
                    ? Math.abs(pc.x - ch.lanePos) < 52
                    : Math.abs(pc.y - ch.lanePos) < 52;
                if (inLane) _egColoTouch(EG_COLO_CHUTE_DMG[3], ch.level, 'Rock Chute');
            }
        });
        g.activeChutes = (g.activeChutes || []).filter(ch => !ch.done);

        // ── Seal body-check (Shaper monolith crack pattern). ──
        g.crackCdUntil = g.crackCdUntil || 0;
        if (pr && now >= g.crackCdUntil && Math.hypot(pc.x - seal.x, pc.y - seal.y) < 58) {
            g.crackCdUntil = now + 500;
            seal.hp--;
            seal.el.classList.remove('eg-colo-seal-crack1', 'eg-colo-seal-crack2');
            if (seal.hp === 2) seal.el.classList.add('eg-colo-seal-crack1');
            if (seal.hp === 1) seal.el.classList.add('eg-colo-seal-crack2');
            _egColoRubble(g.fxRun, seal.x, seal.y, false);
            if (seal.hp <= 0) {
                seal.el.classList.add('eg-colo-seal-broken');
                _egColoRubble(g.fxRun, seal.x, seal.y, true);
                _egColoShake(1.4);
                g.seal++;
                if (g.seal >= g.sealEls.length) {
                    // All three seals broken: the titan collapses.
                    _egColoFinalEnd(g, monster, true);
                    return false;
                }
                _egNkToast('eg_mech_colo_seal_down', '🗿 SEAL BROKEN — the titan slumps! Next seal lit!', '#4ade80');
                g.sealTimer = 0;
                return true;
            }
        }

        // ── Seal budget: fail → punish + next seal. The THIRD expired seal
        // answers with a CAVE-IN (design doc): dust wipes the arena except
        // the ring around the last seal, 35% if you're outside it — the
        // finale fails and the fight resumes.
        g.sealTimer = (g.sealTimer || 0) + dtS * 1000;
        if (g.sealTimer >= EG_COLO_FINALE_SEAL_MS * _EG_COLO_DEBUG_MULT) {
            g.sealTimer = 0;
            const dealt = _egNkHit(EG_COLO_CHARGE_DMG, null, level);
            _egNkAbilityHitToast(dealt, 'The Colossus', 'Seal Collapse');
            g.seal++;
            if (g.seal >= g.sealEls.length) {
                _egColoCaveIn(g, seal, level);
                _egColoFinalEnd(g, monster, false);
                return false;
            }
            _egNkToast('eg_mech_colo_seal_fail', '🗿 The seal collapsed on its own — next seal lit!', '#f59e0b');
        }

        // Keep the lit-seal visuals honest.
        g.sealEls.forEach((s, i) => {
            s.el.classList.toggle('eg-colo-seal-lit', i === g.seal);
        });
        return true;
    });
}

// CAVE-IN: the failed finale's punish — dust wipes the arena except the
// ring around the last seal (35% if you're outside it).
function _egColoCaveIn(g, seal, level) {
    if (g.finished) return;
    const dust = document.createElement('div');
    dust.className = 'eg-colo-cavein';
    document.body.appendChild(dust);
    setTimeout(() => { try { dust.remove(); } catch (e) {} }, _EG_COLO_DEBUG_SLOW ? 4000 : 1600);
    _egColoShake(2);
    const pc = _egColoPC();
    if (Math.hypot(pc.x - seal.x, pc.y - seal.y) >= 110) {
        const dealt = _egNkHit(EG_COLO_CAVEIN_DMG, null, level);
        _egNkAbilityHitToast(dealt, 'The Colossus', 'CAVE-IN');
    }
    if (typeof _egNkToast === 'function') {
        _egNkToast('eg_mech_colo_cavein', '🗿💀 CAVE-IN! The titan shrugs you off!', '#f59e0b');
    }
}

// Ends the finale: collapse (seals broken) — releases immunity + charge bar.
function _egColoFinalEnd(g, monster, collapsed) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _egNkKillRun(g.fxRun); } catch (e) {}
    g.sealEls.forEach(s => { try { s.el.remove(); } catch (e) {} });
    document.querySelectorAll('.eg-colo-chute-warn, .eg-colo-chute, .eg-colo-cd, .eg-colo-cavein').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('eg-colo-kneeling');
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
    if (collapsed) {
        _egColoShake(2);
        if (typeof _egNkToast === 'function') {
            _egNkToast('eg_mech_colo_collapsed', '🗿💥 THE TITAN FALLS!', '#4ade80');
        }
    }
    void monster;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body class this boss ever created.
function _egColoTeardown() {
    if (_egColoFinal) { try { _egColoFinalEnd(_egColoFinal, null, false); } catch (e) {} _egColoFinal = null; }
    document.querySelectorAll('.eg-colo-foot-warn, .eg-colo-foot-slam, .eg-colo-wave, ' +
        '.eg-colo-boulder, .eg-colo-frag, .eg-colo-golem, .eg-colo-chip, ' +
        '.eg-colo-seal, .eg-colo-chute-warn, .eg-colo-chute, .eg-colo-cd, .eg-colo-cavein').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-colo-kneeling').forEach(el => el.classList.remove('eg-colo-kneeling'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_COLO_DEBUG.fire('stride'|'boulders'|'golems', phase) — runs one now
//   _EG_COLO_DEBUG.final()                                   — TITAN'S FALL now
if (typeof window !== 'undefined') {
    window._EG_COLO_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_colossus') : null;
            if (!monster) return 'no colossus alive';
            const fn = name === 'stride' ? _egMechSeismicSlam
                : name === 'boulders' ? _egMechColoBoulders
                : name === 'golems' ? _egMechColoGolems : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'stride' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_colossus') : null;
            if (!monster) return 'no colossus alive';
            _egColoFinalStart(monster);
            return 'TITAN\u2019S FALL started';
        },
    };
}
