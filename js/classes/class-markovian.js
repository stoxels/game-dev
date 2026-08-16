//------------------------------------------------------------------------
//--------------------ASCENDENCY SKILL IMPLEMENTATIONS-------------------
//------------------------------MARKOVIAN CLASS--------------------------
//------------------------------------------------------------------------
//
// This file implements the two active abilities for the Markovian class:
//
//   ACTIVE 1 — STATE ROLLBACK
//     Records a snapshot of the puzzle state every second (circular buffer).
//     When activated, rewinds the puzzle back to the snapshot taken
//     windowSeconds ago, restoring: userGrid, wrongGrid, revealedGrid,
//     mistakeCount, and timerSecs (with a rank-bonus time gift on top).
//     Rank 3 bonus: also wipes mistake cells that already existed inside
//     the rollback window (pre-existing mistakes are forgiven).
//
//   ACTIVE 2 — TRANSITION MATRIX
//     Timed mode. Each correct fill has a cascadeChance of also revealing
//     a random unfilled correct cardinal neighbour. Rank 3 allows the
//     cascaded cell to itself cascade once more (maxDepth 2).
//     Triggered from onCorrectFill() in class-abilities.js.
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

// Glyphs shown in the Transition Matrix rain overlay.
const TM_GLYPH_CHARSET = '01アイウエオカキクケコ∑∫∂∇λμπ';

// CSS injected once for the Transition Matrix HUD badge and cell flash animations.
// Kept here so the style string is easy to find and edit without digging into JS logic.
const TM_BADGE_CSS = `
    #transition-matrix-badge {
        display: inline-flex; align-items: center; gap: 3px;
        background: rgba(41,128,185,0.18); border: 1px solid #2980b9;
        border-radius: 5px; padding: 2px 6px;
        font-family: var(--PX, monospace); font-size: 10px; color: #7fb3d3;
        animation: tm-pulse 1s ease-in-out infinite; white-space: nowrap;
    }
    .tm-icon  { font-size: 11px; line-height: 1; }
    .tm-timer { font-variant-numeric: tabular-nums; letter-spacing: .03em; font-weight: bold; }
    @keyframes tm-pulse {
        0%, 100% { box-shadow: 0 0 4px 1px rgba(41,128,185,0.4); }
        50%       { box-shadow: 0 0 10px 3px rgba(41,128,185,0.75); }
    }
    .rollback-flash {
        animation: rollback-wave 0.5s ease-out forwards;
    }
    @keyframes rollback-wave {
        0%   { filter: brightness(2.5) saturate(0.3) hue-rotate(180deg); }
        60%  { filter: brightness(1.4) saturate(1.2) hue-rotate(30deg); }
        100% { filter: brightness(1) saturate(1) hue-rotate(0deg); }
    }
    .transition-cascade-flash {
        animation: cascade-pop 0.6s ease-out forwards;
    }
    @keyframes cascade-pop {
        0%   { filter: brightness(2) saturate(0.5) hue-rotate(200deg); transform: scale(1.15); }
        60%  { filter: brightness(1.3) saturate(1.5); transform: scale(1.05); }
        100% { filter: brightness(1) saturate(1); transform: scale(1); }
    }
`;


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
function _markovSnapshotTick() {
    if (!cur || dead) return;

    const ugCopy = userGrid.map(row => [...row]);
    const wgCopy = wrongGrid.map(row => [...row]);
    const rgCopy = revealedGrid.map(row => [...row]);

    window._markovSnapshots.push({
        userGrid: ugCopy,
        wrongGrid: wgCopy,
        revealedGrid: rgCopy,
        mistakeCount: mistakeCount,
        timerSecs: timerSecs,
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
            userGrid[r][c] = snapshot.userGrid[r][c];
            wrongGrid[r][c] = snapshot.wrongGrid[r][c];
            revealedGrid[r][c] = snapshot.revealedGrid[r][c];
        }
    }
    mistakeCount = snapshot.mistakeCount;
}

// Clears the pre-existing mistake cells collected by
// _rollback_collectPreExistingMistakes. Also credits the quest stat for
// each cell removed.
function _rollback_clearPreExistingMistakes(preExistingWrong) {
    if (preExistingWrong.length === 0) return;

    preExistingWrong.forEach(({ r, c }) => {
        wrongGrid[r][c] = false;
        // Only blank the user fill if the cell isn't a correct reveal.
        if (userGrid[r][c] !== 1 && !revealedGrid[r][c]) {
            userGrid[r][c] = 0;
        }
        questStat_mistakesRemoved(1);
    });

    showToast(`⏳ ${preExistingWrong.length} ${LANG === 'de'
        ? 'alte Fehler ebenfalls korrigiert!'
        : 'pre-existing mistake(s) also cleared!'}`);
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
    if (mc) mc.textContent = `${LANG === 'de' ? 'Fehler' : 'Mistakes'}: ${mistakeCount}`;

    updTimer();

    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
}


//------------------------------------------------------------------------
//----------------------------ROLLBACK EXECUTION--------------------------
//------------------------------------------------------------------------

// Main entry point for the State Rollback ability.
//   windowSeconds    — how far back in time to seek (rank-dependent).
//   rewindSeconds    — bonus seconds added on top of the restored timer.
//   clearOldMistakes — Rank 3 flag: forgive pre-existing mistakes.
function _executeStateRollback(windowSeconds, rewindSeconds, clearOldMistakes) {
    if (!cur) return;

    // ── Find the target snapshot ──────────────────────────────────
    const best = _rollback_findBestSnapshot(windowSeconds);
    if (!best) {
        showToast(LANG === 'de'
            ? '⏳ Keine Zustandshistorie vorhanden!'
            : '⏳ No state history available!');
        _rollbackCancel(true);
        return;
    }

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
    if (timerSecs <= 10) {
        trackAchStat('rollbackSaves');
        showToast('⏳ State Rollback: Cheat Death!');
    }

    // Restore the timer to what it was at the snapshot moment, then add
    // the rank bonus on top. Cap at 1 hour.
    timerSecs = Math.min(best.timerSecs + rewindSeconds, 3600);

    // ── Refresh all UI that depends on grid state ────────────────
    _rollback_refreshDisplay();

    // Clear stale DoF tracking — the entire grid state just changed.
    window._dofRevertedCells = new Set();
    window._mistakeLog = [];

    // Flush snapshots: everything recorded after the applied snapshot is
    // now invalid since we branched into a new timeline.
    window._markovSnapshots = [];

    // ── VFX + feedback ───────────────────────────────────────────
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const approxSecs = Math.round((Date.now() - best.ts) / 1000);

    _rollbackPlayVFX(rows, cols);

    showToast(`⏳ ${LANG === 'de'
        ? `Zustandsrücksetzer! ${approxSecs}s zurückgespult. +${rewindSeconds}s Zeit.`
        : `State Rollback! Rewound ~${approxSecs}s. +${rewindSeconds}s added.`}`);

    Audio_Manager.playSFX('stateReversal');
    trackAchStat('skillRollbackUsed');

    checkWin();
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
    if (!silent) showToast(LANG === 'de' ? '⏳ Abgebrochen.' : '⏳ Cancelled.');
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
function _rollbackVFX_drawBackground(ctx, w, h, elapsed, fade) {
    ctx.fillStyle = `rgba(10,5,30,${0.82 * fade})`;
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < h; r += 18) {
        for (let c = 0; c < w; c += 18) {
            const wave = Math.sin((c + r) * 0.04 - elapsed * 0.003) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(100,60,200,${wave * 0.06 * fade})`;
            ctx.fillRect(c, r, 2, 2);
        }
    }

    // Sweeping purple wave that scrolls left-to-right.
    const waveX = (elapsed % 1000) / 1000 * (w + 200) - 100;
    const wg = ctx.createLinearGradient(waveX - 70, 0, waveX + 70, 0);
    wg.addColorStop(0, 'rgba(130,50,220,0)');
    wg.addColorStop(0.5, `rgba(130,50,220,${0.16 * fade})`);
    wg.addColorStop(1, 'rgba(130,50,220,0)');
    ctx.fillStyle = wg;
    ctx.fillRect(0, 0, w, h);
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
function _rollbackPlayVFX(rows, cols) {
    const DURATION = 2200;

    const { cvs, ctx, resize } = _rollbackVFX_createCanvas();
    const W = () => cvs.width;
    const H = () => cvs.height;
    const startTime = performance.now();
    const bolts = [];
    const particles = [];
    let animId;

    function tick(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / DURATION, 1);
        const fade = t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1;
        const w = W();
        const h = H();

        ctx.clearRect(0, 0, w, h);

        _rollbackVFX_drawBackground(ctx, w, h, elapsed, fade);

        if (Math.random() < 0.4) _rollbackVFX_spawnBolt(bolts, W, H);
        _rollbackVFX_drawBolts(ctx, bolts, fade);

        _rollbackVFX_drawHourglass(ctx, w, h, t, fade, particles);

        if (t < 1) {
            animId = requestAnimationFrame(tick);
        } else {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            cvs.remove();
        }
    }
    animId = requestAnimationFrame(tick);

    _rollbackVFX_flashCells(rows, cols);
}


//------------------------------------------------------------------------
//-------------------TRANSITION MATRIX EXECUTION-------------------------
//------------------------------------------------------------------------

// Starts a new Transition Matrix session. Cancels any session already running.
//   durationMs    — how long the mode stays active.
//   cascadeChance — probability (0–1) of each correct fill triggering a cascade.
//   maxDepth      — maximum cascade chain length (1 = rank 1–2, 2 = rank 3).
function _executeTransitionMatrix(durationMs, cascadeChance, maxDepth) {
    _clearTransitionMatrix();

    window._transitionMatrixActive = {
        cascadeChance,
        maxDepth,
        endTime: Date.now() + durationMs,
        timeout: null,
    };

    const secs = Math.ceil(durationMs / 1000);

    showToast(LANG === 'de'
        ? `⏳ Übergangsmatrix aktiviert! ${secs}s — ${Math.round(cascadeChance * 100)}% Kettenreaktion.`
        : `⏳ Transition Matrix active! ${secs}s — ${Math.round(cascadeChance * 100)}% cascade chance.`);

    Audio_Manager.playSFX('transitionMatrix');
    trackAchStat('skillTransitionMatrixUsed');

    _transitionMatrixStartOverlay(durationMs);
    _transitionMatrixSpawnBadge(secs);

    // Tick the badge countdown every second.
    let remaining = secs;
    window._transitionMatrixTickInterval = setInterval(() => {
        remaining--;
        _transitionMatrixUpdateBadge(remaining);
        if (remaining <= 0) {
            clearInterval(window._transitionMatrixTickInterval);
            window._transitionMatrixTickInterval = null;
        }
    }, 1000);

    // Schedule natural expiry.
    window._transitionMatrixActive.timeout = setTimeout(() => {
        _clearTransitionMatrix(true);
    }, durationMs);
}

// Cleans up a Transition Matrix session.
// Pass natural=true when the session ends by time-out (shows the expiry toast
// and rebuilds the class HUD). Pass natural=false (default) when clearing
// as part of starting a new session or resetting the level.
function _clearTransitionMatrix(natural = false) {
    if (window._transitionMatrixActive?.timeout) {
        clearTimeout(window._transitionMatrixActive.timeout);
    }
    if (window._transitionMatrixTickInterval) {
        clearInterval(window._transitionMatrixTickInterval);
        window._transitionMatrixTickInterval = null;
    }
    window._transitionMatrixActive = null;
    _transitionMatrixRemoveBadge();

    // Fade out and remove the canvas overlay if it is still running.
    const cvs = document.getElementById('tm-canvas-overlay');
    if (cvs) {
        if (cvs._animId) cancelAnimationFrame(cvs._animId);
        cvs.style.transition = 'opacity 0.4s ease-out';
        cvs.style.opacity = '0';
        setTimeout(() => {
            if (cvs._resizeHandler) window.removeEventListener('resize', cvs._resizeHandler);
            cvs.remove();
        }, 450);
    }

    if (natural) {
        showToast(LANG === 'de' ? '⏳ Übergangsmatrix beendet.' : '⏳ Transition Matrix ended.');
        buildClassHUD();
    }
}


//------------------------------------------------------------------------
//-------------------TRANSITION MATRIX OVERLAY VFX-----------------------
//------------------------------------------------------------------------
// Long-running canvas overlay rendered while Transition Matrix is active.
// The overlay shows: a Matrix-style glyph rain, network nodes mirroring
// the puzzle grid, animated connection chains, and cascade particles.
//
// Each helper builds or draws one visual layer and is placed above the
// _transitionMatrixStartOverlay orchestrator below.
//------------------------------------------------------------------------

// Reads the current puzzle grid DOM and returns an array of node objects,
// one per cell, each positioned at the cell's screen-centre.
function _tmOverlay_buildNodes() {
    if (!cur) return [];

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const nodes = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const el = document.getElementById(`g-${r}-${c}`);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            nodes.push({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                r, c,
                pulse: Math.random() * Math.PI * 2,
                // A node is "active" if the correct cell has already been filled.
                active: sol[r][c] === 1 && (window.revealedGrid?.[r]?.[c] || window.userGrid?.[r]?.[c] === 1),
            });
        }
    }
    return nodes;
}

// Builds a sparse set of animated connection chains between nearby nodes.
// maxDist controls which node pairs can be linked.
function _tmOverlay_buildChains(nodes) {
    const chains = [];
    const maxDist = 120;

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < maxDist && Math.random() < 0.18) {
                chains.push({
                    a: nodes[i],
                    b: nodes[j],
                    progress: Math.random(),
                    speed: 0.003 + Math.random() * 0.005,
                });
            }
        }
    }
    return chains;
}

// Fills the glyphRain array with one column descriptor per screen column.
// Called once on init; safe to call again if the window is resized.
function _tmOverlay_buildGlyphRain(glyphRain, canvasW, canvasH) {
    const colCount = Math.floor(canvasW / 22);
    for (let i = glyphRain.length; i < colCount; i++) {
        glyphRain.push({
            x: i * 22 + 11,
            y: Math.random() * canvasH,
            speed: 0.7 + Math.random() * 1.6,
            alpha: 0.01 + Math.random() * 0.01,
            len: 4 + Math.floor(Math.random() * 7),
        });
    }
}

// Advances and draws every glyph rain column.
function _tmOverlay_drawGlyphRain(ctx, glyphRain, h, fade) {
    ctx.font = '13px monospace';
    glyphRain.forEach(col => {
        col.y += col.speed;
        if (col.y > h + col.len * 18) col.y = -col.len * 18;

        // Trailing characters fade from bright → dim going upward.
        for (let i = 0; i < col.len; i++) {
            const a = (1 - i / col.len) * col.alpha * fade;
            const green = Math.floor(80 + 100 * (1 - i / col.len));
            ctx.fillStyle = `rgba(20,${green},60,${a})`;
            ctx.fillText(
                TM_GLYPH_CHARSET[Math.floor(Math.random() * TM_GLYPH_CHARSET.length)],
                col.x,
                col.y - i * 16
            );
        }

        // Head character is notably brighter.
        ctx.fillStyle = `rgba(120,255,160,${col.alpha * fade * 1.6})`;
        ctx.fillText(
            TM_GLYPH_CHARSET[Math.floor(Math.random() * TM_GLYPH_CHARSET.length)],
            col.x,
            col.y
        );
    });
}

// Advances and draws every node chain, including the travelling energy pulse.
function _tmOverlay_drawChains(ctx, chains, fade) {
    chains.forEach(ch => {
        ch.progress += ch.speed;
        if (ch.progress > 1) ch.progress = 0;

        const dx = ch.b.x - ch.a.x;
        const dy = ch.b.y - ch.a.y;

        // Dashed line for the static connection.
        ctx.strokeStyle = `rgba(30,180,100,${0.22 * fade})`;
        ctx.lineWidth = 0.7;
        ctx.setLineDash([4, 7]);
        ctx.beginPath();
        ctx.moveTo(ch.a.x, ch.a.y);
        ctx.lineTo(ch.b.x, ch.b.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Radial glow travelling along the chain.
        const px = ch.a.x + dx * ch.progress;
        const py = ch.a.y + dy * ch.progress;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 10);
        grad.addColorStop(0, `rgba(80,255,140,${0.55 * fade})`);
        grad.addColorStop(1, 'rgba(80,255,140,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draws each node as a pulsing circle; active (filled) nodes get an extra glow halo.
function _tmOverlay_drawNodes(ctx, nodes, t2, fade) {
    nodes.forEach(n => {
        const pulse = 0.5 + 0.5 * Math.sin(t2 * 2.2 + n.pulse);
        const r = n.active ? 6 + pulse * 3 : 3.5 + pulse;

        if (n.active) {
            const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 20);
            glow.addColorStop(0, `rgba(40,220,110,${0.15 * pulse * fade})`);
            glow.addColorStop(1, 'rgba(40,220,110,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(n.x, n.y, 20, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = n.active
            ? `rgba(60,230,130,${0.35 * fade})`
            : `rgba(30,110,70,${0.12 * fade})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = n.active
            ? `rgba(120,255,170,${0.75 * fade})`
            : `rgba(50,150,90,${0.25 * fade})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
    });
}

// Spawns occasional cascade particles from random nodes and advances/draws them.
function _tmOverlay_drawParticles(ctx, particles, nodes, fade) {
    if (Math.random() < 0.15 && nodes.length > 0) {
        const src = nodes[Math.floor(Math.random() * nodes.length)];
        particles.push({
            x: src.x,
            y: src.y,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.2,
            life: 1,
        });
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.015;
        p.life -= 0.02;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(100,255,150,${p.life * 0.65 * fade})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Builds the canvas overlay and runs the animation loop for the full
// durationMs of the Transition Matrix session.
function _transitionMatrixStartOverlay(durationMs) {
    document.getElementById('tm-canvas-overlay')?.remove();

    const cvs = document.createElement('canvas');
    cvs.id = 'tm-canvas-overlay';
    cvs.style.cssText = `
        position: fixed; inset: 0;
        width: 100vw; height: 100vh;
        pointer-events: none;
        z-index: 400;
        opacity: 0;
        transition: opacity 0.5s ease-in;
    `;
    document.body.appendChild(cvs);

    const ctx = cvs.getContext('2d');
    const resize = () => { cvs.width = window.innerWidth; cvs.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    cvs._resizeHandler = resize;

    // Double-rAF forces the browser to paint the initial opacity:0 before
    // we set opacity:1, giving us a CSS fade-in.
    requestAnimationFrame(() => requestAnimationFrame(() => { cvs.style.opacity = '1'; }));

    const W = () => cvs.width;
    const H = () => cvs.height;
    const startTime = performance.now();

    const nodes = _tmOverlay_buildNodes();
    const chains = _tmOverlay_buildChains(nodes);
    const glyphRain = [];
    _tmOverlay_buildGlyphRain(glyphRain, W(), H());

    const particles = [];
    let animId;

    function tick(now) {
        const elapsed = now - startTime;
        const t = elapsed / durationMs;

        // Session ended naturally.
        if (t >= 1) {
            cancelAnimationFrame(animId);
            cvs.style.transition = 'opacity 0.5s ease-out';
            cvs.style.opacity = '0';
            setTimeout(() => {
                window.removeEventListener('resize', cvs._resizeHandler);
                cvs.remove();
            }, 550);
            return;
        }

        // Session was cancelled externally (e.g. level reset, skill deactivated).
        if (!window._transitionMatrixActive) {
            cancelAnimationFrame(animId);
            cvs.style.transition = 'opacity 0.4s ease-out';
            cvs.style.opacity = '0';
            setTimeout(() => {
                window.removeEventListener('resize', cvs._resizeHandler);
                cvs.remove();
            }, 450);
            return;
        }

        const fade = t < 0.08 ? t / 0.08 : t > 0.9 ? (1 - t) / 0.1 : 1;
        const w = W();
        const h = H();
        const t2 = elapsed * 0.001; // slow time value used for node pulsing

        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = `rgba(4,12,6,${0.22 * fade})`;
        ctx.fillRect(0, 0, w, h);

        _tmOverlay_drawGlyphRain(ctx, glyphRain, h, fade);
        _tmOverlay_drawChains(ctx, chains, fade);
        _tmOverlay_drawNodes(ctx, nodes, t2, fade);
        _tmOverlay_drawParticles(ctx, particles, nodes, fade);

        animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);
    cvs._animId = animId;
}


//------------------------------------------------------------------------
//-------------------TRANSITION MATRIX CASCADE LOGIC---------------------
//------------------------------------------------------------------------

// Called from onCorrectFill() in class-abilities.js whenever the player
// fills a cell correctly while Transition Matrix is active.
// Tries to cascade to a random unfilled correct cardinal neighbour.
//   row / col  — the cell that was just filled correctly.
//   depth      — remaining cascade depth (decremented on each recursive call).
function _transitionMatrixCascade(row, col, depth) {
    const tm = window._transitionMatrixActive;

    // Abort if the session has expired.
    if (!tm || Date.now() > tm.endTime) {
        _clearTransitionMatrix(true);
        return;
    }
    if (depth <= 0 || Math.random() > tm.cascadeChance || !cur) return;

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    // Collect unfilled, correctly-valued cardinal neighbours.
    const neighbours = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (sol[nr][nc] === 1 && !revealedGrid[nr][nc] && userGrid[nr][nc] !== 1) {
            neighbours.push([nr, nc]);
        }
    }

    if (neighbours.length === 0) return;

    // Pick a random eligible neighbour and reveal it.
    const [nr, nc] = neighbours[Math.floor(Math.random() * neighbours.length)];

    revealedGrid[nr][nc] = true;
    userGrid[nr][nc] = 1;
    renderCell(nr, nc);
    updClues(nr, nc);
    trackAchStat('tilesRevealed', 1);
    questStat_classRevealUsed(1);
    updateQuestStats('classAbilityUsedThisLevel', {});
    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();

    _transitionMatrixCellVFX(nr, nc, row, col);

    showToast(`⏳ ${LANG === 'de' ? 'Übergang! Zelle enthüllt.' : 'Transition! Cell cascaded.'}`);

    // Rank 3: the newly revealed cell can itself cascade after a short delay.
    if (depth > 1) {
        setTimeout(() => _transitionMatrixCascade(nr, nc, depth - 1), 250);
        trackAchStat('transitionMatrixCascades');
    }

    Audio_Manager.playSFX('transitionCascade');
    checkWin();
}


//------------------------------------------------------------------------
//-------------------TRANSITION MATRIX BEAM VFX--------------------------
//------------------------------------------------------------------------
// Short-lived canvas overlay drawn when a cascade reveal occurs.
// A green energy beam travels from the source cell to the target cell,
// and an impact burst plays on arrival.
//------------------------------------------------------------------------

// Returns the screen-centre of a puzzle cell element, or null if missing.
function _tmBeam_getCellCenter(row, col) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// Draws the core beam line and its bright white centre stripe up to the
// current head position (headX, headY).
function _tmBeam_drawCore(ctx, x1, y1, hx, hy, alpha) {
    const grad = ctx.createLinearGradient(x1, y1, hx, hy);
    grad.addColorStop(0, `rgba(46,204,113,0)`);
    grad.addColorStop(0.3, `rgba(46,204,113,${0.55 * alpha})`);
    grad.addColorStop(1, `rgba(150,255,180,${0.95 * alpha})`);

    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = `rgba(46,204,113,${0.8 * alpha})`;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    // Bright white core stripe.
    ctx.strokeStyle = `rgba(220,255,235,${0.6 * alpha})`;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.restore();
}

// Draws the glowing spark travelling at the head of the beam.
function _tmBeam_drawSpark(ctx, hx, hy, t, alpha) {
    const sparkR = 5 + 3 * Math.sin(t * Math.PI);
    const sparkGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, sparkR * 2.5);
    sparkGrad.addColorStop(0, `rgba(200,255,210,${alpha})`);
    sparkGrad.addColorStop(0.4, `rgba(46,204,113,${0.75 * alpha})`);
    sparkGrad.addColorStop(1, `rgba(46,204,113,0)`);
    ctx.beginPath();
    ctx.arc(hx, hy, sparkR * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = sparkGrad;
    ctx.fill();
}

// Draws the radial impact burst that plays once the beam reaches the target.
// burstT is 0→1 starting from when the head arrives.
function _tmBeam_drawBurst(ctx, x2, y2, t, alpha) {
    const burstT = (t - 0.55) / 0.45;
    const burstAlpha = alpha * (1 - burstT * 0.5);
    const burstR = 6 + burstT * 18;
    const burstGrad = ctx.createRadialGradient(x2, y2, 0, x2, y2, burstR);
    burstGrad.addColorStop(0, `rgba(180,255,200,${burstAlpha})`);
    burstGrad.addColorStop(0.5, `rgba(46,204,113,${burstAlpha * 0.6})`);
    burstGrad.addColorStop(1, `rgba(46,204,113,0)`);
    ctx.beginPath();
    ctx.arc(x2, y2, burstR, 0, Math.PI * 2);
    ctx.fillStyle = burstGrad;
    ctx.fill();
}

// Flashes the destination cell and animates a green energy beam from the
// source cell (srcRow, srcCol) to the target cell (row, col).
function _transitionMatrixCellVFX(row, col, srcRow, srcCol) {
    // CSS flash on the destination cell.
    const el = document.getElementById(`g-${row}-${col}`);
    if (el) {
        el.classList.add('transition-cascade-flash');
        setTimeout(() => el.classList.remove('transition-cascade-flash'), 600);
    }

    // No beam without a source.
    if (srcRow == null || srcCol == null) return;

    const src = _tmBeam_getCellCenter(srcRow, srcCol);
    const dst = _tmBeam_getCellCenter(row, col);
    if (!src || !dst) return;

    const { x: x1, y: y1 } = src;
    const { x: x2, y: y2 } = dst;
    const DURATION = 1000;

    const cvs = document.createElement('canvas');
    cvs.style.cssText = `
        position: fixed; inset: 0;
        width: 100vw; height: 100vh;
        pointer-events: none;
        z-index: 6000;
    `;
    document.body.appendChild(cvs);

    const resize = () => { cvs.width = window.innerWidth; cvs.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const startTime = performance.now();
    let animId;

    function tick(now) {
        const t = Math.min((now - startTime) / DURATION, 1);
        const alpha = t < 0.15 ? t / 0.15 : 1 - ((t - 0.15) / 0.85);

        // Resetting width clears the canvas each frame.
        cvs.width = cvs.width;
        const ctx = cvs.getContext('2d');

        // Head travels from source to target, arriving at t=0.55.
        const headT = Math.min(t / 0.55, 1);
        const hx = x1 + (x2 - x1) * headT;
        const hy = y1 + (y2 - y1) * headT;

        _tmBeam_drawCore(ctx, x1, y1, hx, hy, alpha);
        _tmBeam_drawSpark(ctx, hx, hy, t, alpha);
        if (headT >= 1) _tmBeam_drawBurst(ctx, x2, y2, t, alpha);

        if (t < 1) {
            animId = requestAnimationFrame(tick);
        } else {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            cvs.remove();
        }
    }

    animId = requestAnimationFrame(tick);
}


//------------------------------------------------------------------------
//----------------------------HUD BADGE----------------------------------
//------------------------------------------------------------------------
// Small countdown badge attached to the class HUD while Transition Matrix
// is active, so the player can see the remaining time at a glance.
//------------------------------------------------------------------------

// Injects the badge CSS once, then creates and appends the badge element.
function _transitionMatrixSpawnBadge(remainingSecs) {
    _transitionMatrixRemoveBadge();

    if (!document.getElementById('tm-badge-styles')) {
        const s = document.createElement('style');
        s.id = 'tm-badge-styles';
        s.textContent = TM_BADGE_CSS;
        document.head.appendChild(s);
    }

    const badge = document.createElement('div');
    badge.id = 'transition-matrix-badge';
    badge.innerHTML = `<span class="tm-icon">⏳</span><span class="tm-timer" id="tm-timer-val">${remainingSecs}s</span>`;

    // Prefer the drag handle; fall back to the main HUD panel.
    const handle = document.getElementById('class-hud-drag-handle');
    if (handle) {
        handle.appendChild(badge);
    } else {
        const panel = document.getElementById('class-hud-panel');
        if (panel) panel.appendChild(badge);
    }
}

// Updates the countdown text inside the badge.
function _transitionMatrixUpdateBadge(remainingSecs) {
    const el = document.getElementById('tm-timer-val');
    if (el) el.textContent = `${Math.max(0, remainingSecs)}s`;
}

// Removes the badge from the DOM.
function _transitionMatrixRemoveBadge() {
    document.getElementById('transition-matrix-badge')?.remove();
}


//------------------------------------------------------------------------
//----------------------------RESET--------------------------------------
//------------------------------------------------------------------------

// Called when a level ends or restarts to wipe all Markovian runtime state.
function resetMarkovianState() {
    _markovSnapshotInit();
    _clearTransitionMatrix(false);
}