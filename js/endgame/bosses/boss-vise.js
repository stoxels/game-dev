//------------------------------------------------------------------------
//-------------------BOSS: THE VISE (boss_vise)----------------------------
//------------------------------------------------------------------------
// TIER 8 REWORK — "Cold Iron". The Mega-Man corridor soul, rebuilt on the
// shared nk-run standard: the walls still sweep, the gap still breathes,
// and the corridor still demands you stay between the walls. But now the
// Vise is a forge that works you: every pass QUENCHES a workpiece, the
// bench can BREAK before the cast, and the finale turns the whole arena
// into a finished blade that snaps. Element: lightning.
//
//   • CRUSHING WALLS (signature, all fight) — the corridor, on nk runs:
//     two block walls sweep right → left around a BREATHING gap (the gap
//     widens and narrows in a sine; the safe band is a living thing, not a
//     straight pipe). Outside the walls burns. Touch a block: chunk +
//     slow. Phase 3: the gap breathes FASTER while the walls hold.
//   • BENCH VISE (60%, ~21s) — a great bench vise clamps down on a wide
//     slice of the arena: two jaws crawl from opposite edges toward a
//     centre line at your row (row telegraph), and the squeeze leaves a
//     standing strain zone: sparks chip you if you linger in the squeezed
//     band after the jaws bite. Escape the slice before the bite.
//   • QUENCH OR SHATTER (60%, ~23s) — the Vise plants a glowing workpiece
//     and HAMMERS it: telegraphed hammer arcs slam along the piece; a
//     sparks pool splashes off each strike. Body-check the workpiece 2×
//     to knock it loose (+12% maxHP heal) and the piece SHATTERS — fail
//     and the piece is QUENCHED: a giant wall-block crosses the arena at
//     your row (the corridor comes for you). Phase 3: the quenched block
//     returns the other way.
//   • 🧱 THE FULL CLAMP (≤10%, one-shot finale) — three compression waves
//     squeeze the arena into a corridor of shrinking SAFE SLABS (lit blue
//     tiles connected like a corridor; everything else detonates per
//     wave). Survive three squeezes and the VISE OVERCLENCHES: THE IRON
//     VISE slams full-screen (35%) — only the stress-fracture SAFE SLAB
//     holds. Charge bar frozen (gate in _egTickPlayer via
//     _egVisFinalActive).
//
// Shared soul kept: probability_shift still turns the puzzle's clues —
// fitting for a boss about pressure and release. clue_scramble and
// corrupt_cells retired (their pressure lives in the squeeze).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock, so
// gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (probability_shift) live in shared-boss-abilities.js
// and are referenced by handler-name string.
//------------------------------------------------------------------------

// DEBUG: slow The Vise's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Flip to false for ship.
const _EG_VIS_DEBUG_SLOW = true;
const _EG_VIS_DEBUG_MULT = _EG_VIS_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_vise: {
        id: 'boss_vise', name: 'The Vise', emoji: '🧱',
        baseHP: 1020, baseDamage: 23, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_vise — "Cold Iron" (rework)
    // Phase 1 (100% → 60%): Crushing Walls + Probability Shift
    // Phase 2 ( 60% → 30%): immune window; Bench Vise + Quench or Shatter
    //                        join
    // Phase 3 ( 30% →  0%): faster gap breathing, double quenched blocks;
    //                        at 10% THE FULL CLAMP begins
    boss_vise: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'crushing_walls', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechVisWalls' },
            { name: 'probability_shift', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechProbabilityShift' },
            { name: 'bench_vise', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechVisBench', phase2Only: true },
            { name: 'quench_or_shatter', intervalBase: 26000, intervalVariance: 6000, handler: '_egMechVisQuench', phase2Only: true },
        ],
        onPhaseEnter: _egVisOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_VIS_TOUCH_CD_MS = 700;      // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Vise hazards. Lightning-element boss —
// hits go in with element 'lightning' so the toast palette stays yellow.
let _egVisHitCd = 0;
function _egVisTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egVisHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egVisHitCd = now + EG_VIS_TOUCH_CD_MS;
    const dealt = _egNkHit(pct, 'lightning', level);
    _egNkAbilityHitToast(dealt, 'The Vise', label);
    return true;
}

// Player centre with a screen-centre fallback.
function _egVisPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Proven reward pattern (Siren echo zones / Swarm royal jelly): heals go
// through a guarded clamp + rerender.
function _egVisHeal(amount) {
    if (typeof playerCurrentHP === 'undefined') return;
    const before = playerCurrentHP;
    playerCurrentHP = Math.min(playerMaxHP || before, before + amount);
    if (playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: CRUSHING WALLS (all fight)------------------
//------------------------------------------------------------------------
// The corridor, rebuilt on nk runs: two block walls sweep right → left
// around a BREATHING gap — the safe band widens and narrows in a slow
// sine, so the corridor is a living thing, not a straight pipe. Outside
// the walls burns (DoT); touching a block is a chunk + brief slow.
// Phase 3: the gap breathes faster while the walls hold.
const EG_VIS_WALL_BLOCK  = 26;          // block size (px)
const EG_VIS_WALL_STEP   = 15;          // spawn spacing (overlap → continuous)
const EG_VIS_WALL_GAP    = [0, 300, 260, 220];   // base gap height per phase
const EG_VIS_WALL_AMP    = [0, 46, 58, 72];      // breathing amplitude per phase
const EG_VIS_WALL_RATE   = [0, 0.5, 0.65, 0.95]; // breathing rate (rad/s)
const EG_VIS_WALL_SPD    = [0, 135, 165, 200];   // sweep speed px/s
const EG_VIS_WALL_TOUCH  = [0, 0.20, 0.24, 0.28]; // %maxHP block touch
const EG_VIS_WALL_DOT    = [0, 6.0, 7.5, 9.0];   // %/s outside the corridor
const EG_VIS_WALL_LIFE   = [0, 11000, 11500, 12500]; // ms per pass

function _egMechVisWalls(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egVisEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_vis_walls', '🧱 CRUSHING WALLS — the corridor BREATHES. Stay between the walls as the gap opens and closes!', '#fde047');

    const S = EG_VIS_WALL_BLOCK;
    const gap0 = EG_VIS_WALL_GAP[p], amp = EG_VIS_WALL_AMP[p], rate = EG_VIS_WALL_RATE[p];
    const spd = EG_VIS_WALL_SPD[p];
    const lifeMs = EG_VIS_WALL_LIFE[p] * _EG_VIS_DEBUG_MULT;
    const bossX = Math.round(W * 0.8);
    const blocks = [];               // { x, yUp, yLo, el }
    const pool = [];

    const t0 = performance.now();
    let distAcc = 0;
    const last = { ts: t0 };

    _egNkLoop(run, (dtS, now) => {
        const t = (now - t0) / 1000;
        // The breathing centre: the gap's centre drifts with the sine, and
        // the GAP itself opens/closes around it.
        const breathe = Math.sin(t * rate);
        const gap = gap0 + breathe * amp * 0.5;
        const cy = H * 0.5 + Math.cos(t * rate * 0.7) * H * 0.14;
        const upY = cy - gap / 2, loY = cy + gap / 2;

        // Spawn blocks at the boss head with the CURRENT gap (frozen at
        // spawn — the polyline the player dodges through records the
        // breathing as it swept past).
        distAcc += spd * dtS;
        while (distAcc >= EG_VIS_WALL_STEP) {
            distAcc -= EG_VIS_WALL_STEP;
            const mk = (up) => {
                const el = pool.pop() || _egNkEl(run, 'div', 'eg-vis-wblock');
                el.style.width = S + 'px'; el.style.height = S + 'px';
                el.style.display = '';
                blocks.push({ x: bossX, yUp: upY, yLo: loY, el, up });
            };
            mk(true);   // upper wall block
            mk(false);  // lower wall block
        }
        // Advance + cull + render.
        const dx = spd * dtS;
        for (let i = blocks.length - 1; i >= 0; i--) {
            const b = blocks[i];
            b.x -= dx;
            if (b.x < -S * 2) {
                b.el.style.display = 'none';
                pool.push(b.el);
                blocks.splice(i, 1);
                continue;
            }
            const y = b.up ? b.yUp : b.yLo;
            b.el.style.transform = 'translate(' + Math.round(b.x - S / 2) + 'px,' + Math.round(y - S / 2) + 'px)';
            b.el.classList.toggle('eg-vis-wblock-up', b.up);
        }

        // Collision: block touch (chunk + slow) and outside-corridor DoT.
        const pr = _egNkPlayerRect();
        const pc = _egVisPC();
        let touched = false;
        for (const b of blocks) {
            if (b.x < pc.x - S || b.x > pc.x + S) continue;
            const y = b.up ? b.yUp : b.yLo;
            if (Math.abs(pc.x - b.x) < S * 0.7 && Math.abs(pc.y - y) < S * 0.7) { touched = true; break; }
        }
        if (touched && pr) {
            _egVisTouch(EG_VIS_WALL_TOUCH[p], level, 'Crushing Walls');
            // Chill: brief movement impairment on a block touch (the Null's
            // soft-punish precedent; unknown keys no-op in the ailment map).
            try { if (typeof _egApplyPlayerAilment === 'function') _egApplyPlayerAilment('chill'); } catch (e) {}
        }
        // Outside = above the upper wall or below the lower wall (walls
        // only cover where blocks exist — grace while they sweep in).
        let coveredX = null;
        for (const b of blocks) { if (coveredX === null || b.x > coveredX) coveredX = b.x; }
        if (coveredX !== null && pc.x < coveredX + S) {
            // Find the wall Y at the player's x by scanning recent blocks.
            let upAt = null, loAt = null;
            for (const b of blocks) {
                if (Math.abs(b.x - pc.x) <= S) {
                    if (upAt === null) upAt = b.yUp;
                    if (loAt === null) loAt = b.yLo;
                }
            }
            if (upAt !== null && loAt !== null) {
                const outside = pc.y < upAt || pc.y > loAt;
                if (outside) _egNkDotTick(run, EG_VIS_WALL_DOT[p], dtS, level, 'lightning');
                else run.dotAcc = 0;
            }
        }

        return now - t0 < lifeMs;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: BENCH VISE (60%)------------------------------
//------------------------------------------------------------------------
// A great bench vise clamps down on a wide slice of the arena: two jaws
// crawl from opposite edges toward a centre line at your row (row
// telegraph), the slice CLOSES on the line, and the squeeze leaves a
// standing strain zone: sparks chip anyone lingering in the squeezed band
// for 4s after the bite. Escape the slice before the bite. Phase 3: two
// slices (rows) at once.
const EG_VIS_BENCH_WARN   = 1400;      // row telegraph before the jaws crawl
const EG_VIS_BENCH_CRAWL  = 3400;      // jaws travel time
const EG_VIS_BENCH_BAND   = 130;       // squeezed band height (px)
const EG_VIS_BENCH_JAW    = [0, 0.22, 0.26, 0.30]; // %maxHP caught in the bite
const EG_VIS_BENCH_STRAIN = [0, 0, 3.5, 4.5];     // %/s lingering in the strain
const EG_VIS_BENCH_STRAIN_MS = 4000;   // strain zone lifetime after the bite

function _egMechVisBench(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egVisEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_vis_bench', '🧱 BENCH VISE — the jaws crawl in. Escape the slice before it BITES!', '#fde047');

    const nSlices = p >= 3 ? 2 : 1;
    const slices = [];
    for (let i = 0; i < nSlices; i++) {
        // One slice: it clamps down on YOUR current row (honest telegraph —
        // the band shows where the jaws will meet, so move out of it).
        // Two slices (phase 3): fixed offset rows.
        const y = nSlices === 1
            ? Math.max(H * 0.15, Math.min(H * 0.85, _egVisPC().y))
            : H * (0.5 + (i === 0 ? -0.22 : 0.22)) + (Math.random() * 40 - 20);
        const warn = _egNkEl(run, 'div', 'eg-nk-band eg-vis-bench-warn');
        warn.style.left = '0px'; warn.style.top = Math.round(y - EG_VIS_BENCH_BAND / 2) + 'px';
        warn.style.width = W + 'px'; warn.style.height = EG_VIS_BENCH_BAND + 'px';
        // Jaws: two blocks crawling in from the edges.
        const jawL = _egNkEl(run, 'div', 'eg-vis-jaw');
        const jawR = _egNkEl(run, 'div', 'eg-vis-jaw');
        const h = EG_VIS_BENCH_BAND + 26;
        [jawL, jawR].forEach(j => {
            j.style.top = Math.round(y - h / 2) + 'px';
            j.style.height = h + 'px';
            j.style.width = '46px';
        });
        slices.push({ y, warn, jawL, jawR, warnUntil: performance.now() + EG_VIS_BENCH_WARN * _EG_VIS_DEBUG_MULT, bitten: false, strainUntil: 0 });
    }

    const t0 = performance.now();
    _egNkLoop(run, (dtS, now) => {
        const pc = _egVisPC();
        let pending = false;

        for (const s of slices) {
            if (s.done) continue;
            pending = true;

            if (now < s.warnUntil) continue;

            if (!s.bitten) {
                // Jaws crawl: reveal them and slide toward the centre.
                const crawlT = Math.min(1, (now - s.warnUntil) / (EG_VIS_BENCH_CRAWL * _EG_VIS_DEBUG_MULT));
                if (!s.started) {
                    s.started = true;
                    s.warn.classList.add('eg-vis-bench-closing');
                }
                const half = W / 2;
                const lx = -20 + (half - 20) * crawlT;
                const rx = W + 20 - (half - 20) * crawlT;
                s.jawL.style.left = Math.round(lx) + 'px';
                s.jawR.style.left = Math.round(rx) + 'px';
                if (crawlT >= 1) {
                    // BITE: anyone in the band gets the squeeze.
                    s.bitten = true;
                    s.warn.classList.add('eg-vis-bench-bitten');
                    const pr = _egNkPlayerRect();
                    if (pr && Math.abs(pc.y - s.y) < EG_VIS_BENCH_BAND / 2 + pr.height / 2) {
                        const dealt = _egNkHit(EG_VIS_BENCH_JAW[p], 'lightning', level);
                        _egNkAbilityHitToast(dealt, 'The Vise', 'Bench Bite');
                    }
                    s.strainUntil = now + EG_VIS_BENCH_STRAIN_MS * _EG_VIS_DEBUG_MULT;
                }
            } else {
                // Strain zone: sparks chip lingering players.
                if (Math.abs(pc.y - s.y) < EG_VIS_BENCH_BAND / 2) {
                    _egNkDotTick(run, EG_VIS_BENCH_STRAIN[p], dtS, level, 'lightning');
                } else {
                    run.dotAcc = 0;
                }
                if (now >= s.strainUntil) {
                    s.done = true;
                    [s.warn, s.jawL, s.jawR].forEach(el => el.classList.add('eg-vis-bench-done'));
                    const w = s.warn, jl = s.jawL, jr = s.jawR;
                    setTimeout(() => { try { w.remove(); } catch (e) {} }, 400 * _EG_VIS_DEBUG_MULT);
                    setTimeout(() => { try { jl.remove(); } catch (e) {} }, 400 * _EG_VIS_DEBUG_MULT);
                    setTimeout(() => { try { jr.remove(); } catch (e) {} }, 400 * _EG_VIS_DEBUG_MULT);
                }
            }
        }

        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: QUENCH OR SHATTER (60%)-----------------------
//------------------------------------------------------------------------
// The Vise plants a glowing workpiece and HAMMERS it: telegraphed hammer
// arcs slam along the piece; a sparks pool splashes off each strike.
// Body-check the workpiece 2× to knock it loose (+12% maxHP heal) and the
// piece SHATTERS — fail and the piece is QUENCHED: a giant wall-block
// crosses the arena at your row (the corridor comes for you). Phase 3:
// the quenched block returns the other way.
const EG_VIS_QUEN_MS    = [0, 0, 7000, 5500]; // hammer time by phase
const EG_VIS_QUEN_R     = 60;            // body-check radius
const EG_VIS_QUEN_HP    = 2;             // body-checks to knock loose
const EG_VIS_HAMMER_DMG = [0, 0, 0.15, 0.18]; // %maxHP caught by a hammer arc
const EG_VIS_QUEN_SPARK_DPS = 2.8;      // %/s standing in the sparks pool
const EG_VIS_BLOCK_DMG  = [0, 0, 0.26, 0.32]; // %maxHP caught by the quenched block
const EG_VIS_BLOCK_SPD  = 430;          // px/s quenched block travel
const EG_VIS_BLOCK_WARN = 1100;         // telegraph before the block crosses
const EG_VIS_HEAL_CANCEL = 0.12;        // %maxHP heal for shattering

function _egMechVisQuench(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    _egVisEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);

    _egNkToast('eg_mech_vis_quench', '🧱 QUENCH OR SHATTER — the hammer falls. Knock the workpiece loose to SHATTER it!', '#fde047');

    // Plant the workpiece away from the player.
    const pc0 = _egVisPC();
    let sx = W * 0.5, sy = H * 0.5;
    for (let tries = 0; tries < 24; tries++) {
        sx = W * (0.18 + Math.random() * 0.64);
        sy = H * (0.22 + Math.random() * 0.56);
        if (Math.hypot(sx - pc0.x, sy - pc0.y) > 200) break;
    }
    const piece = _egNkEl(run, 'div', 'eg-vis-piece', '🔥');
    piece.style.left = Math.round(sx - EG_VIS_QUEN_R) + 'px';
    piece.style.top = Math.round(sy - EG_VIS_QUEN_R) + 'px';
    piece.style.width = (EG_VIS_QUEN_R * 2) + 'px';
    piece.style.height = (EG_VIS_QUEN_R * 2) + 'px';

    const state = { knocked: false, quenched: false, hp: EG_VIS_QUEN_HP, lastHit: 0, blocks: 0, blocksTotal: p >= 3 ? 2 : 1, dir: 1 };
    let hammerT = 0;
    const quenMs = EG_VIS_QUEN_MS[p] * _EG_VIS_DEBUG_MULT;
    let nextHammerAt = performance.now() + 1400 * _EG_VIS_DEBUG_MULT;

    _egNkLoop(run, (dtS, now) => {
        hammerT += dtS * 1000;
        const pr = _egNkPlayerRect();
        const pc = _egVisPC();
        let pending = true;

        // Knocked loose → the piece SHATTERS: run ends here.
        if (state.knocked) return false;

        // Hammer arcs: telegraphed slams along the piece; sparks splash.
        if (!state.quenched && now >= nextHammerAt) {
            nextHammerAt = now + 1400 * _EG_VIS_DEBUG_MULT;
            const arc = _egNkEl(run, 'div', 'eg-nk-band eg-vis-hammer-warn');
            const vertical = Math.random() < 0.5;
            if (vertical) {
                arc.style.left = Math.round(sx - 30) + 'px'; arc.style.top = Math.max(0, sy - 180) + 'px';
                arc.style.width = '60px'; arc.style.height = '360px';
            } else {
                arc.style.left = Math.max(0, sx - 180) + 'px'; arc.style.top = Math.round(sy - 30) + 'px';
                arc.style.width = '360px'; arc.style.height = '60px';
            }
            state.arcEl = state.arcEl || [];
            state.arcEl.push(arc);
            const spark = _egNkEl(run, 'div', 'eg-vis-sparks');
            spark.style.left = Math.round(sx - 55) + 'px';
            spark.style.top = Math.round(sy - 55) + 'px';
            spark.style.width = '110px'; spark.style.height = '110px';
            state.sparkEl = spark;
            const strikeAt = now + 700 * _EG_VIS_DEBUG_MULT;
            setTimeout(() => {
                try {
                    arc.classList.add('eg-nk-band-hit');
                    const sp = spark;
                    setTimeout(() => { try { sp.remove(); } catch (e) {} }, 900 * _EG_VIS_DEBUG_MULT);
                } catch (e) {}
            }, 700 * _EG_VIS_DEBUG_MULT);
            setTimeout(() => { try { arc.remove(); } catch (e) {} }, 950 * _EG_VIS_DEBUG_MULT);
            // The sparks pool chips while it stands (strike → +0.9s).
            state.strikeAt = strikeAt;
            state.sparkUntil = strikeAt + 900 * _EG_VIS_DEBUG_MULT;
        }
        // Sparks pool chips after a strike lands.
        if (state.sparkUntil && now >= state.strikeAt && now < state.sparkUntil) {
            if (Math.hypot(pc.x - sx, pc.y - sy) < 62) {
                _egNkDotTick(run, EG_VIS_QUEN_SPARK_DPS, dtS, level, 'lightning');
            } else {
                run.dotAcc = 0;
            }
        } else {
            run.dotAcc = 0;
        }

        // Body-check the workpiece (visit cooldown → two deliberate trips).
        if (!state.knocked && !state.quenched && pr
            && Math.hypot(pc.x - sx, pc.y - sy) < EG_VIS_QUEN_R
            && now >= state.lastHit) {
            state.lastHit = now + 450 * _EG_VIS_DEBUG_MULT;
            state.hp--;
            piece.classList.remove('eg-vis-piece-hit');
            void piece.offsetWidth;
            piece.classList.add('eg-vis-piece-hit');
            if (state.hp <= 0) {
                state.knocked = true;
                piece.classList.add('eg-vis-piece-shatter');
                _egVisHeal(_egNkMaxHP() * EG_VIS_HEAL_CANCEL);
                _egNkToast('eg_mech_vis_shatter', '🧱💥 WORKPIECE SHATTERED — the quench is cancelled! (+heal)', '#4ade80');
            }
        }

        // Quench completes → the giant wall-block crosses at your row.
        if (!state.knocked && !state.quenched && hammerT >= quenMs) {
            state.quenched = true;
            piece.classList.add('eg-vis-piece-quenched');
            state.sparkUntil = 0;
            if (state.sparkEl) { try { state.sparkEl.remove(); } catch (e) {} }
            _egNkToast('eg_mech_vis_block', '🧱 THE QUENCH — the piece is iron now. It comes for your row!', '#f97316');
            state.dir = state.blocks % 2 === 0 ? 1 : -1;
            state.bandY = pc.y;
            const band = _egNkEl(run, 'div', 'eg-nk-band eg-vis-block-warn');
            band.style.left = '0px'; band.style.top = Math.round(state.bandY - 55) + 'px';
            band.style.width = W + 'px'; band.style.height = '110px';
            state.warnUntil = now + EG_VIS_BLOCK_WARN * _EG_VIS_DEBUG_MULT;
            state.band = band;
        }

        // Quenched block sweep after its telegraph.
        if (state.quenched && state.band && now >= state.warnUntil && !state.sweeping) {
            state.sweeping = true;
            state.band.classList.add('eg-nk-band-hit');
            _egNkSlamShatter(state.band, run);
            state.blockX = state.dir > 0 ? -80 : W + 80;
            const block = _egNkEl(run, 'div', 'eg-vis-quenched-block', '⬛');
            state.blockEl = block;
            state.blockHit = false;
        }
        if (state.sweeping && state.blockEl) {
            state.blockX += state.dir * EG_VIS_BLOCK_SPD * dtS;
            state.blockEl.style.transform = 'translate(' + Math.round(state.blockX - 34) + 'px,' + Math.round(state.bandY - 34) + 'px)';
            if (pr && !state.blockHit) {
                const inBand = Math.abs(pc.y - state.bandY) < 55;
                if (inBand) {
                    state.blockHit = true;
                    const dealt = _egNkHit(EG_VIS_BLOCK_DMG[p], 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Vise', 'Quenched Block');
                }
            }
            const off = state.blockX;
            if ((state.dir > 0 && off > W + 90) || (state.dir < 0 && off < -90)) {
                try { state.blockEl.remove(); } catch (e) {}
                state.blockEl = null;
                state.sweeping = false;
                if (state.band) { try { state.band.remove(); } catch (e) {} }
                state.band = null;
                state.blocks++;
                if (state.blocks >= state.blocksTotal) {
                    return false;   // cast complete
                }
                // Phase 3: re-arm the hammer — a second quench, and the
                // block returns the other way (dir flips on next cast).
                state.quenched = false;
                hammerT = 0;
                nextHammerAt = now + 900 * _EG_VIS_DEBUG_MULT;
                piece.classList.remove('eg-vis-piece-quenched');
            }
        }

        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: THE FULL CLAMP (≤10%, one-shot)---------------
//------------------------------------------------------------------------
// Three compression waves squeeze the arena into a corridor of shrinking
// SAFE SLABS (lit blue tiles connected like a corridor; everything else
// detonates per wave). Survive three squeezes and the VISE OVERCLENCHES:
// THE IRON VISE slams full-screen (35%) — only the stress-fracture SAFE
// SLAB holds. Charge bar frozen (gate in _egTickPlayer via
// _egVisFinalActive).
const EG_VIS_FIN_SQUEEZES  = 3;      // compression waves
const EG_VIS_FIN_COLS      = 8;      // slab grid columns
const EG_VIS_FIN_ROWS      = 5;      // slab grid rows
const EG_VIS_FIN_WARN      = 3600;   // time to reach the corridor
const EG_VIS_FIN_SQUEEZE_MS = 8200;  // between squeezes
const EG_VIS_FIN_DMG       = 0.20;   // %maxHP caught outside the corridor
const EG_VIS_FIN_IRON_DMG  = 0.35;   // %maxHP outside the final slab
const EG_VIS_FIN_FAILSAFE_MS = 34000;

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egVisFinal = null;

function _egVisFinalActive() {
    return !!_egVisFinal && !_egVisFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egVisOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egVisEnsureFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egVisEnsureFinalWatcher(monster) {
    if (!monster || _egVisFinal || _egVisWatcherRun) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egVisWatcherRun = run;
    _egNkLoop(run, () => {
        if (_egVisFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egVisFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}
let _egVisWatcherRun = null;

// Pause-safe timeout (mirrors the other finales).
function _egVisAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egVisFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

function _egVisFinalStart(monster) {
    if (_egVisFinal || !monster) return;

    // The Vise clears the arena for the full clamp: kill every other run of
    // this boss (the finale owns the board).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        fxRun: null, overlay: null,
        squeeze: 0,
    };
    _egVisFinal = g;

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
    ov.className = 'eg-vis-cd';
    ov.innerHTML =
        '<div class="eg-vis-cd-label">🧱 THE FULL CLAMP</div>' +
        '<div class="eg-vis-cd-hint">Three compression waves squeeze the arena — a corridor of SAFE SLABS lights up: reach it before each squeeze. Survive all three for THE IRON VISE: the overclench slams everything except the stress fracture!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_vis_final_cd', '🧱💀 THE FULL CLAMP — the whole arena is the workpiece now!', '#fde047');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the cold-iron glow while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-vis-allin');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;

    // ── One squeeze: a corridor of safe slabs lights; everything else goes. ─
    const runSqueeze = () => {
        if (g.finished) return;
        g.squeeze++;
        if (g.squeeze > EG_VIS_FIN_SQUEEZES) { runIronVise(); return; }
        _egNkToast('eg_mech_vis_squeeze', '🧱 COMPRESSION ' + g.squeeze + '/' + EG_VIS_FIN_SQUEEZES + ' — find the corridor!', '#fde047');

        const cols = EG_VIS_FIN_COLS, rows = EG_VIS_FIN_ROWS;
        const cell = Math.min(W / cols, H / rows);
        const gx = W / 2 - cols * cell / 2, gy = H / 2 - rows * cell / 2;
        // The corridor: a connected path from the left edge to the right
        // edge (one safe cell per column, drifting by at most one row).
        let row = Math.floor(Math.random() * rows);
        const safe = [];
        for (let c = 0; c < cols; c++) {
            safe.push({ r: row, c });
            row = Math.max(0, Math.min(rows - 1, row + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.6 ? 1 : 0)));
        }
        const cells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const isSafe = safe.some(s => s.r === r && s.c === c);
                const el = _egNkEl(g.fxRun, 'div', 'eg-vis-slab' + (isSafe ? ' eg-vis-slab-safe' : ''));
                el.style.left = Math.round(gx + c * cell + 4) + 'px';
                el.style.top = Math.round(gy + r * cell + 4) + 'px';
                el.style.width = Math.round(cell - 8) + 'px';
                el.style.height = Math.round(cell - 8) + 'px';
                if (isSafe) cells.push({ x: gx + c * cell + cell / 2, y: gy + r * cell + cell / 2 });
            }
        }
        _egVisAfter(g, EG_VIS_FIN_WARN * _EG_VIS_DEBUG_MULT, () => {
            if (g.finished) return;
            const pc = _egVisPC();
            const inCorridor = cells.some(s => Math.hypot(pc.x - s.x, pc.y - s.y) < cell * 0.65);
            document.querySelectorAll('.eg-vis-slab:not(.eg-vis-slab-safe)').forEach(el => el.classList.add('eg-vis-slab-hot'));
            if (!inCorridor) {
                const dealt = _egNkHit(EG_VIS_FIN_DMG, 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Vise', 'Compression');
            }
            _egVisAfter(g, 900 * _EG_VIS_DEBUG_MULT, () => {
                if (g.finished) return;
                document.querySelectorAll('.eg-vis-slab').forEach(el => { try { el.remove(); } catch (e) {} });
            });
        });

        _egVisAfter(g, EG_VIS_FIN_SQUEEZE_MS * _EG_VIS_DEBUG_MULT, () => {
            if (g.finished) return;
            document.querySelectorAll('.eg-vis-slab').forEach(el => { try { el.remove(); } catch (e) {} });
            runSqueeze();
        });
    };

    // ── THE IRON VISE: the overclench — full-screen slam, one safe slab. ──
    const runIronVise = () => {
        if (g.finished) return;
        _egNkToast('eg_mech_vis_iron', '🧱💀 THE IRON VISE — the overclench! The stress fracture is the only safe ground!', '#f97316');
        // One stress-fracture slab, away from the edges.
        const cell = Math.min(W / EG_VIS_FIN_COLS, H / EG_VIS_FIN_ROWS);
        let px = W * 0.5, py = H * 0.5;
        for (let tries = 0; tries < 24; tries++) {
            px = W * (0.28 + Math.random() * 0.44);
            py = H * (0.30 + Math.random() * 0.40);
            if (px > cell + 30 && px < W - cell - 30 && py > cell + 30 && py < H - cell - 30) break;
        }
        const slab = _egNkEl(g.fxRun, 'div', 'eg-vis-slab eg-vis-slab-safe eg-vis-slab-fracture');
        slab.style.left = Math.round(px - cell * 0.7) + 'px';
        slab.style.top = Math.round(py - cell * 0.7) + 'px';
        slab.style.width = Math.round(cell * 1.4) + 'px';
        slab.style.height = Math.round(cell * 1.4) + 'px';

        _egVisAfter(g, 2400 * _EG_VIS_DEBUG_MULT, () => {
            if (g.finished) return;
            document.querySelectorAll('.eg-vis-cd').forEach(el => el.classList.add('eg-vis-cd-slam'));
            const pc = _egVisPC();
            const inSlab = Math.hypot(pc.x - px, pc.y - py) < cell * 0.85;
            if (!inSlab) {
                const dealt = _egNkHit(EG_VIS_FIN_IRON_DMG, 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Vise', 'The Iron Vise');
            }
            _egVisAfter(g, 1500 * _EG_VIS_DEBUG_MULT, () => {
                _egVisFinalEnd(g, monster);
            });
        });
    };

    runSqueeze();
}

// Ends the finale: releases immunity + charge bar and cleans the board.
function _egVisFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _egNkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.eg-vis-cd, .eg-vis-slab').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('eg-vis-allin');
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
// NOTE: replaces the legacy _egCrushTeardown corridor hook — the corridor
// was rebuilt on nk runs. The framework's old typeof-guarded call to
// _egCrushTeardown is now a safe no-op; THIS teardown is wired separately
// in _egBossCleanup (boss_vise branch).
function _egVisTeardown() {
    if (_egVisFinal) { try { _egVisFinalEnd(_egVisFinal, null); } catch (e) {} _egVisFinal = null; }
    _egVisWatcherRun = null;
    document.querySelectorAll('.eg-vis-wblock, .eg-vis-bench-warn, .eg-vis-jaw, .eg-vis-piece, ' +
        '.eg-vis-hammer-warn, .eg-vis-sparks, .eg-vis-block-warn, .eg-vis-quenched-block, ' +
        '.eg-vis-cd, .eg-vis-slab').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-vis-allin').forEach(el => el.classList.remove('eg-vis-allin'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_VIS_DEBUG.fire('walls'|'bench'|'quench', phase) — runs one now
//   _EG_VIS_DEBUG.final()                               — THE FULL CLAMP now
if (typeof window !== 'undefined') {
    window._EG_VIS_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_vise') : null;
            if (!monster) return 'no vise alive';
            const fn = name === 'walls' ? _egMechVisWalls
                : name === 'bench' ? _egMechVisBench
                : name === 'quench' ? _egMechVisQuench : null;
            if (!fn) return 'unknown: ' + name;
            if (_egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_vise') : null;
            if (!monster) return 'no vise alive';
            _egVisFinalStart(monster);
            return 'THE FULL CLAMP started';
        },
    };
}
