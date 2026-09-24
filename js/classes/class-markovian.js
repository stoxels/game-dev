import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { _adjacencyMatrixRefreshAll, renderCell, updClues } from '../grid.js';
import { updTimer } from '../timer/timer.js';
import { addTimeSecs, previewGainSecs } from '../timer/timer-adjust.js';
import { t } from '../translation/translations.js';
import { _setAbilityMode } from './class-abilities.js';
import { cooldownState } from './class-cooldown-state.js';
import { buildClassHUD } from './class-hud.js';
import { ptHasSkill } from '../probability-tree/probability-tree-state-points.js';
import { questStat_mistakesRemoved } from '../inference/inference-stats.js';
import { STATE } from '../state.js';
import { cur } from '../state.js';
import { _clearTransitionMatrix } from './class-markovian-transition.js';

//------------------------------------------------------------------------
//--------------------ASCENDENCY SKILL IMPLEMENTATIONS-------------------
//------------------------------MARKOVIAN CLASS--------------------------
//------------------------------------------------------------------------
//
// This file implements Markovian State Rollback: snapshot capture, rewind
// execution, and rollback VFX. Transition Matrix lives in its sibling module.
//
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//----------------------------CONSTANTS-----------------------------------
//------------------------------------------------------------------------

// How many seconds of snapshot history to keep in the circular buffer.
const MARKOV_SNAPSHOT_BUFFER = 35;

// Colour palette for the lightning bolts in the rollback VFX.
const ROLLBACK_BOLT_HUES = [
    'rgba(140,80,255,',
    'rgba(80,140,255,',
    'rgba(80,220,200,',
    'rgba(200,100,255,',
];

// Particle colour palette for the rollback hourglass VFX.
const ROLLBACK_PARTICLE_COLORS = [
    'rgba(200,140,255,',
    'rgba(140,100,255,',
    'rgba(100,160,255,',
];


//------------------------------------------------------------------------
//----------------------------SNAPSHOT SYSTEM-----------------------------
//------------------------------------------------------------------------
// A per-second circular buffer of full grid state snapshots.
// _markovSnapshotInit() is called from startTimer() / startLevel().
// _markovSnapshotTick() is hooked into the timer tick (same pattern as
// _degreesOfFreedomTick in timer.js).
//------------------------------------------------------------------------

// Initialises (or resets) the snapshot buffer for a new level.
function _markovSnapshotInit() {
    window._markovSnapshots = [];
}

// Takes a deep-copy snapshot of all relevant grid state and appends it
// to the circular buffer. Called once per second while a level is running.
export function _markovSnapshotTick() {
    if (!cur || globalThis.dead) return;

    const ugCopy = globalThis.userGrid.map(row => [...row]);
    const wgCopy = globalThis.wrongGrid.map(row => [...row]);
    const rgCopy = globalThis.revealedGrid.map(row => [...row]);

    window._markovSnapshots.push({
        userGrid: ugCopy,
        wrongGrid: wgCopy,
        revealedGrid: rgCopy,
        mistakeCount: globalThis.mistakeCount,
        timerSecs: globalThis.timerSecs,
        ts: Date.now(),
    });

    // Drop the oldest entry once the buffer is full.
    if (window._markovSnapshots.length > MARKOV_SNAPSHOT_BUFFER) {
        window._markovSnapshots.shift();
    }
}


//------------------------------------------------------------------------
//----------------------------ROLLBACK HELPERS----------------------------
//------------------------------------------------------------------------
// Small, single-purpose helpers consumed by _executeStateRollback below.
// Placed above the main function so the call-site reads top-to-bottom.
//------------------------------------------------------------------------

// Returns the snapshot whose timestamp is closest to (now - windowSeconds).
// Returns null when the buffer is empty.
function _rollback_findBestSnapshot(windowSeconds) {
    const snapshots = window._markovSnapshots || [];
    if (snapshots.length === 0) return null;

    const targetTs = Date.now() - windowSeconds * 1000;
    let best = snapshots[0];
    let bestDiff = Infinity;

    for (const snap of snapshots) {
        const diff = Math.abs(snap.ts - targetTs);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = snap;
        }
    }
    return best;
}

// Collects every cell that was already wrong inside the target snapshot.
// Used by the Rank 3 "forgive old mistakes" bonus.
// Returns an array of { r, c } objects.
function _rollback_collectPreExistingMistakes(snapshot) {
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const result = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (snapshot.wrongGrid[r][c]) result.push({ r, c });
        }
    }
    return result;
}

// Writes a snapshot's grid data into the live game grids.
function _rollback_applySnapshot(snapshot) {
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            globalThis.userGrid[r][c] = snapshot.userGrid[r][c];
            globalThis.wrongGrid[r][c] = snapshot.wrongGrid[r][c];
            globalThis.revealedGrid[r][c] = snapshot.revealedGrid[r][c];
        }
    }
    globalThis.mistakeCount = snapshot.mistakeCount;
}

// Clears the pre-existing mistake cells collected by
// _rollback_collectPreExistingMistakes. Also credits the quest stat for
// each cell removed.
function _rollback_clearPreExistingMistakes(preExistingWrong) {
    if (preExistingWrong.length === 0) return;

    preExistingWrong.forEach(({ r, c }) => {
        globalThis.wrongGrid[r][c] = false;
        // Only blank the user fill if the cell isn't a correct reveal.
        if (globalThis.userGrid[r][c] !== 1 && !globalThis.revealedGrid[r][c]) {
            globalThis.userGrid[r][c] = 0;
        }
        questStat_mistakesRemoved(1);
    });

    globalThis.showToast(t('cls_rollback_old_cleared').replace('{n}', preExistingWrong.length));
}

// Re-renders every cell and refreshes all row/column clue indicators
// after a rollback has been applied.
function _rollback_refreshDisplay() {
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            renderCell(r, c);
        }
    }

    for (let r = 0; r < rows; r++) updClues(r, 0);
    for (let c = 0; c < cols; c++) updClues(0, c);

    // Update the on-screen mistake counter.
    const mc = document.getElementById('mistake-counter');
    if (mc) mc.textContent = `${t('cls_mistakes_word')}: ${globalThis.mistakeCount}`;

    updTimer();

    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
}


//------------------------------------------------------------------------
//----------------------------ROLLBACK EXECUTION--------------------------
//------------------------------------------------------------------------

// Main entry point for the State Rollback ability.
//   windowSeconds    - how far back in time to seek (rank-dependent).
//   rewindSeconds    - bonus seconds added on top of the restored timer.
//   clearOldMistakes - Rank 3 flag: forgive pre-existing mistakes.
export function _executeStateRollback(windowSeconds, rewindSeconds, clearOldMistakes) {
    if (!cur) return;

    // ── Find the target snapshot ──────────────────────────────────
    const best = _rollback_findBestSnapshot(windowSeconds);
    if (!best) {
        globalThis.showToast(t('cls_rollback_none'));
        _rollbackCancel(true);
        return;
    }

    const mistakesBefore = globalThis.mistakeCount;   // 

    // ── Rank 3: collect mistakes to forgive ──────────────────────
    const preExistingWrong = clearOldMistakes
        ? _rollback_collectPreExistingMistakes(best)
        : [];

    // ── Apply the snapshot ───────────────────────────────────────
    _rollback_applySnapshot(best);

    // ── Rank 3: clear pre-existing mistakes ──────────────────────
    if (clearOldMistakes) {
        _rollback_clearPreExistingMistakes(preExistingWrong);
    }

    // ── "Cheat Death" achievement (triggered when nearly out of time) ──
    if (globalThis.timerSecs <= 10) {
        trackAchStat('rollbackSaves');
        globalThis.showToast(t('cls_cheat_death'));
    }

    // Restore the timer to what it was at the snapshot moment, then add
    // the rank bonus on top. Cap at 1 hour. The snapshot write itself is
    // bookkeeping-neutral, so only the bonus is recorded as time gained.
    globalThis.timerSecs = best.timerSecs;
    // Map-scaled via the central hook; preview so the toast shows the
    // actual amount, then add the previewed value raw (no double scaling).
    const rewindGain = previewGainSecs(rewindSeconds);
    addTimeSecs(rewindGain, { capSecs: 3600, raw: true });

    const mistakesForgiven = Math.max(0, mistakesBefore - globalThis.mistakeCount);
    if (mistakesForgiven > 0) globalThis._levelMistakesErased += mistakesForgiven; 

    // ── Refresh all UI that depends on grid state ────────────────
    _rollback_refreshDisplay();

    // Clear stale DoF tracking - the entire grid state just changed.
    window._dofRevertedCells = new Set();
    window.LEVEL_FLAGS.mistakeLog = [];

    // Flush snapshots: everything recorded after the applied snapshot is
    // now invalid since we branched into a new timeline.
    window._markovSnapshots = [];

    // ── VFX + feedback ───────────────────────────────────────────
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const approxSecs = Math.round((Date.now() - best.ts) / 1000);

    _rollbackPlayVFX(rows, cols);

    globalThis.showToast(t('cls_rollback_done')
        .replace('{a}', approxSecs)
        .replace('{b}', rewindGain));

    Audio_Manager.playSFX('stateReversal');
    trackAchStat('skillRollbackUsed');

    globalThis.checkWin();
}

// Cancels an in-progress rollback activation (e.g. player pressed Escape).
// Pass silent=true to suppress the cancellation toast.
function _rollbackCancel(silent = false) {
    _setAbilityMode(false);
    STATE.classActiveChoice = 'active3';

    const cd = cooldownState['active3'];
    if (cd && cd.interval) { clearInterval(cd.interval); cd.interval = null; }
    if (cd) cd.remaining = 0;

    buildClassHUD();
    if (!silent) globalThis.showToast(`⏳ ${t('cls_cancelled')}`);
}


//------------------------------------------------------------------------
//----------------------------ROLLBACK VFX--------------------------------
//------------------------------------------------------------------------
// Full-screen canvas overlay played when a rollback completes.
// Each helper draws one visual layer; the main _rollbackPlayVFX function
// wires them together inside the animation loop.
//------------------------------------------------------------------------

// Creates and attaches the full-screen overlay canvas. Returns { cvs, ctx }.
function _rollbackVFX_createCanvas() {
    const cvs = document.createElement('canvas');
    cvs.style.cssText = `
        position: fixed; inset: 0;
        width: 100vw; height: 100vh;
        pointer-events: none;
        z-index: 7000;
    `;
    document.body.appendChild(cvs);

    const resize = () => {
        cvs.width = window.innerWidth;
        cvs.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    return { cvs, ctx: cvs.getContext('2d'), resize };
}

// Builds a new lightning bolt starting from a random screen position and
// pushes it into the bolts array. Each bolt is a chain of random segments
// drifting downward to mimic a time-crack effect.
function _rollbackVFX_spawnBolt(bolts, W, H) {
    const x1 = W() * 0.05 + Math.random() * W() * 0.9;
    const y1 = Math.random() * H();
    const segs = [];
    let cx = x1, cy = y1;

    const steps = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < steps; i++) {
        cx += (Math.random() - 0.5) * 100;
        cy += 18 + Math.random() * 40;
        segs.push({ x: cx, y: cy });
    }

    const col = ROLLBACK_BOLT_HUES[Math.floor(Math.random() * ROLLBACK_BOLT_HUES.length)];
    bolts.push({ x1, y1, segs, life: 1, maxLife: 18 + Math.random() * 18, col });
}

// Draws the dark screen tint and the animated grid-dot pulse layer.
// OPTIMIZED: step 32px vs 18px (~68% fewer rects), skip near-invisible dots, thinner sweep.
function _rollbackVFX_drawBackground(ctx, w, h, elapsed, fade) {
    ctx.fillStyle = `rgba(10,5,30,${0.82 * fade})`;
    ctx.fillRect(0, 0, w, h);

    if (fade < 0.02) return;

    const step = 32;
    const t = elapsed * 0.0025;
    // Batch dots with similar alpha would be ideal, but simple skip of low-alpha already helps.
    for (let r = 0; r < h; r += step) {
        for (let c = 0; c < w; c += step) {
            const wave = Math.sin((c + r) * 0.04 - t) * 0.5 + 0.5;
            const a = wave * 0.05 * fade;
            if (a < 0.012) continue;
            ctx.fillStyle = `rgba(100,60,200,${a})`;
            ctx.fillRect(c, r, 2, 2);
        }
    }

    // Sweeping purple wave that scrolls left-to-right - only when visible.
    if (fade > 0.15) {
        const waveX = (elapsed % 1100) / 1100 * (w + 200) - 100;
        const wg = ctx.createLinearGradient(waveX - 60, 0, waveX + 60, 0);
        wg.addColorStop(0, 'rgba(130,50,220,0)');
        wg.addColorStop(0.5, `rgba(130,50,220,${0.14 * fade})`);
        wg.addColorStop(1, 'rgba(130,50,220,0)');
        ctx.fillStyle = wg;
        ctx.fillRect(0, 0, w, h);
    }
}

// Advances and draws all live lightning bolts. Dead bolts are removed.
function _rollbackVFX_drawBolts(ctx, bolts, fade) {
    for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.life -= 1 / b.maxLife;
        if (b.life <= 0) { bolts.splice(i, 1); continue; }

        const a = b.life * fade;

        // Coloured glow pass.
        ctx.save();
        ctx.shadowColor = b.col + (a * 0.7) + ')';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = b.col + a + ')';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        b.segs.forEach(s => ctx.lineTo(s.x, s.y));
        ctx.stroke();

        // Bright white core pass.
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(230,210,255,${a * 0.55})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        b.segs.forEach(s => ctx.lineTo(s.x, s.y));
        ctx.stroke();
        ctx.restore();
    }
}

// Draws the central rotating hourglass emoji with glow, plus drifting
// sand/time particles orbiting it.
function _rollbackVFX_drawHourglass(ctx, w, h, t, fade, particles) {
    const cx = w / 2;
    const cy = h / 2;

    // Radial glow ring behind the hourglass.
    const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
    hg.addColorStop(0, `rgba(150,80,255,${0.4 * fade})`);
    hg.addColorStop(0.5, `rgba(80,40,180,${0.18 * fade})`);
    hg.addColorStop(1, 'rgba(80,40,180,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();

    // Hourglass: spins from 0 → π over the first 80% of the animation.
    const angle = Math.PI * Math.min(t * 1.25, 1);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.font = '100px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(180,100,255,0.95)';
    ctx.shadowBlur = 28;
    ctx.fillStyle = `rgba(255,255,255,${0.93 * fade})`;
    ctx.fillText('⏳', 0, 0);
    ctx.restore();

    // Spawn a new sand particle occasionally.
    if (Math.random() < 0.5) {
        const angle2 = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 35;
        const col = ROLLBACK_PARTICLE_COLORS[Math.floor(Math.random() * ROLLBACK_PARTICLE_COLORS.length)];
        particles.push({
            x: cx + Math.cos(angle2) * dist,
            y: cy + Math.sin(angle2) * dist,
            vx: (Math.random() - 0.5) * 1.6,
            vy: -1 - Math.random() * 2.2,
            life: 1,
            col,
        });
    }

    // Advance and draw existing particles.
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.07;
        p.life -= 0.025;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.fillStyle = p.col + (p.life * 0.85 * fade) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Applies a rippling colour flash to each grid cell with a staggered delay,
// creating a wave effect that rolls diagonally across the puzzle.
function _rollbackVFX_flashCells(rows, cols) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const el = document.getElementById(`g-${r}-${c}`);
            if (!el) continue;
            const delay = (r + c) * 18;
            setTimeout(() => {
                el.classList.add('rollback-flash');
                setTimeout(() => el.classList.remove('rollback-flash'), 500);
            }, delay);
        }
    }
}

// Orchestrates the full rollback VFX: spawns the canvas overlay, runs the
// animation loop for DURATION ms, then removes the canvas.
// OPTIMIZED: throttled to ~30fps to halve CPU, capped bolt spawn.
function _rollbackPlayVFX(rows, cols) {
    const DURATION = 2200;

    const { cvs, ctx, resize } = _rollbackVFX_createCanvas();
    const W = () => cvs.width;
    const H = () => cvs.height;
    const startTime = performance.now();
    const bolts = [];
    const particles = [];
    let animId;
    let lastFrame = 0;
    const FRAME_INTERVAL = 33;

    function tick(now) {
        if (now - lastFrame < FRAME_INTERVAL) {
            animId = requestAnimationFrame(tick);
            return;
        }
        lastFrame = now;

        const elapsed = now - startTime;
        const t = Math.min(elapsed / DURATION, 1);
        const fade = t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1;
        const w = W();
        const h = H();

        ctx.clearRect(0, 0, w, h);

        _rollbackVFX_drawBackground(ctx, w, h, elapsed, fade);

        if (bolts.length < 8 && Math.random() < 0.35) _rollbackVFX_spawnBolt(bolts, W, H);
        _rollbackVFX_drawBolts(ctx, bolts, fade);

        _rollbackVFX_drawHourglass(ctx, w, h, t, fade, particles);

        if (t < 1) {
            animId = requestAnimationFrame(tick);
        } else {
            globalThis.cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            cvs.remove();
        }
    }
    animId = requestAnimationFrame(tick);

    _rollbackVFX_flashCells(rows, cols);
}


//------------------------------------------------------------------------
//----------------------------RESET--------------------------------------
//------------------------------------------------------------------------

// Called when a level ends or restarts to wipe all Markovian runtime state.
export function resetMarkovianState() {
    _markovSnapshotInit();
    _clearTransitionMatrix(false);
}
