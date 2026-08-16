//------------------------------------------------------------------------
//----------------- passive-tree-special-nodes-logic.js ------------------
//------------------------------------------------------------------------
// Implementations for passive tree special nodes:
//   Nodes 270–272  : Poisson Process
//   Nodes 282–284  : Binomial Burst
//   Node  288      : Keystone — Maximum Likelihood
//   Node  289      : Keystone — Gambler's Ruin
//   Node  290      : Keystone — Sparse Prior
//   Node  291      : Keystone — Ergodic Field
//   Node  293      : Keystone — Entropy Drain
//   Node  294      : Keystone — Random Walk
//   Node  295      : Keystone — Frequentist's Burden
//   Node  296      : Keystone — Signal to Noise
//   Node  298      : Keystone — Degrees of Freedom
//   Node  299      : Keystone — Overfitting
//   Node  300      : Keystone — The Oracle
//   Utility        : Interquartile Vision duration helper
//   Utility        : Global per-level state reset
//
// External call sites (do NOT change without updating these):
//   penalty.js              → _onMistakeBayesianUpdate(), _gamblersRuinOnMistake(),
//                             _overfittingPenaltyMultiplier()
//   mouse-button-handlers.js→ _binomialBurstOnCorrectFill(), _gamblersRuinOnCorrectFill(),
//                             _frequentistsBurdenOnCorrectFill()
//   timer.js (setInterval)  → _poissonProcessTick(), _ergodicFieldTick(),
//                             _entropyDrainTick(), _randomWalkTick(),
//                             _degreesOfFreedomTick()
//   start-level.js          → _applyMaximumLikelihood(), _applySparsePrior(),
//                             _applyFrequentistsBurden(), _applySignalToNoise(),
//                             _applyDegreesOfFreedom(), _applyTheOracle(),
//                             _ergodicFieldInit(), _entropyDrainInit(),
//                             _randomWalkInit(), _resetNewNodeState(),
//                             resetOverfittingTracker()
//   grid.js (updClues)      → _sparsePriorOnLineComplete(), _entropyDrainUpdateProgress(),
//                             _signalToNoiseCheckRestore()
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------------- CONSTANTS & STATE ----------------------------
//------------------------------------------------------------------------

// --- Bayesian Update (nodes 282–284 shared bonus pool) ---
window._bayesianBonus = window._bayesianBonus || 0; // Accumulated extra trigger % from mistakes

// --- Binomial Burst (nodes 282–284) ---
window._binomialBurstFills = 0; // Correct-fill counter; triggers at every 10th fill

// --- Sparse Prior (node 290) — per-level Set, initialized in reset ---
window._sparsePriorRevealedLines = new Set(); // Keys like "r3" or "c7" to avoid double-reveals

// --- Ergodic Field (node 291) ---
const ERGODIC_FIELD_INTERVAL_MS = 3 * 60 * 1000; // Time between solution flashes
const ERGODIC_FIELD_FLASH_MS = 1000;             // How long the flash stays on screen
window._ergodicFieldNext = null; // Timestamp for next solution flash

// --- Entropy Drain (node 293) ---
const ENTROPY_DRAIN_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes before a stalled line reverts
window._entropyDrainTimestamps = {}; // "r-{row}" / "c-{col}" → timestamp of last progress

// --- Random Walk (node 294) ---
const RANDOM_WALK_INTERVAL_MS = 30 * 1000; // Time between auto-actions
const RANDOM_WALK_MAX_MISTAKES = 2;         // Level is lost at this many mistakes
window._randomWalkNext = null; // Timestamp for next random cell action

// --- Frequentist's Burden (node 295) ---
const FREQUENTIST_FILLS_PER_REVEAL = 5; // One clue revealed per this many correct fills
window._frequentistsFills = 0;    // Correct-fill counter; reveals a clue every 5 fills
window._frequentistsBurdenActive = false;

// --- Signal to Noise (node 296) ---
const SIGNAL_NOISE_CORRUPT_RATIO = 0.15; // Fraction of clue spans to falsify
const SIGNAL_NOISE_RESTORE_RATIO = 0.75; // Board completion % to trigger restore
window._signalToNoiseActive = false;
window._signalToNoiseFakeClues = []; // Array of { spanId, originalVal, fakeVal }

// --- Degrees of Freedom (node 298) ---
const DOF_FLASH_INTERVAL_MS = 30 * 1000; // Time between brief reveals
const DOF_FLASH_DURATION_MS = 5 * 1000;  // How long clues stay visible during flash
window._degreesOfFreedomChoice = null; // 'row' | 'col' — player's chosen hidden clue axis
window._degreesOfFreedomNext = null; // Timestamp for next brief clue reveal

// --- Overfitting (node 299) — local var, not on window ---
const OVERFITTING_PHASE_THRESHOLD = 0.15; // Board fill % at which the penalty kicks in
let _lastOverfittingPhase = 'free'; // Tracks phase transitions to prevent toast spam

// --- The Oracle (node 300) ---
const ORACLE_MIN_CELL_COUNT = 200; // Minimum grid size to activate
const ORACLE_FLASH_DURATION_MS = 3000;
window._oracleActive = false; // True for the entire level after Oracle fires; blocks all auto-actions


//------------------------------------------------------------------------
//----------------- SHARED: GRID COMPLETION HELPERS ----------------------
//------------------------------------------------------------------------
// Utility functions used by multiple keystones to measure board progress.
//------------------------------------------------------------------------

// Returns the total number of filled solution cells (value === 1).
function _countTotalSolutionCells(sol) {
    return sol.reduce((sum, row) => sum + row.filter(v => v === 1).length, 0);
}

// Returns the number of solution cells the player has already filled or that are revealed.
function _countFilledSolutionCells(sol) {
    const rows = sol.length, cols = sol[0].length;
    let filled = 0;
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (sol[r][c] === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c]))
                filled++;
    return filled;
}

// Returns completion ratio 0.0–1.0 for the current puzzle.
function _getBoardCompletionRatio() {
    if (!cur) return 0;
    const sol = cur.grid;
    const total = _countTotalSolutionCells(sol);
    if (total === 0) return 1;
    return _countFilledSolutionCells(sol) / total;
}


//------------------------------------------------------------------------
//---------------------- SHARED: CLUE VISIBILITY -------------------------
//------------------------------------------------------------------------
// Utility functions for hiding / revealing the row and column clue labels.
//------------------------------------------------------------------------

// Adds or removes the blackout class on every element matching a selector.
function _setClueBlackout(selector, hidden) {
    document.querySelectorAll(selector).forEach(el => el.classList.toggle('clue-blackout', hidden));
}

// Hides all row and column clue elements using the blackout class.
function _hideAllClues() {
    _setClueBlackout('.rct, .cch', true);
}

// Reveals all row and column clue elements by removing the blackout class.
function _revealAllClues() {
    _setClueBlackout('.rct, .cch', false);
}

// Hides clues for a single row index.
function _hideRowClues(rowIndex) {
    _setClueBlackout(`.rct-${rowIndex}`, true);
}

// Reveals clues for a single row index.
function _revealRowClues(rowIndex) {
    _setClueBlackout(`.rct-${rowIndex}`, false);
}

// Hides clues for a single column index.
function _hideColClues(colIndex) {
    _setClueBlackout(`.cch-${colIndex}`, true);
}

// Reveals clues for a single column index.
function _revealColClues(colIndex) {
    _setClueBlackout(`.cch-${colIndex}`, false);
}


//------------------------------------------------------------------------
//--------------------- SHARED: BOARD FLASH HELPERS -----------------------
//------------------------------------------------------------------------
// Shared visual helper for keystones that briefly flash the solution
// directly onto the board (Ergodic Field, The Oracle).
//------------------------------------------------------------------------

// Swaps a cell's state classes for the "scan reveal" flash animation.
function _applyScanRevealClasses(el, isSolutionCell) {
    el.classList.remove('filled', 'marked', 'wrong-mark', 'revealed', 'questioned');
    if (isSolutionCell) el.classList.add('filled', 'scan-reveal');
}


//------------------------------------------------------------------------
//------------------ SHARED: AUTO-ACTION GUARD ---------------------------
//------------------------------------------------------------------------
// Most auto-reveal / auto-mark nodes are disabled when Ergodic Field or
// The Oracle is active. Call this guard at the top of each such node.
//------------------------------------------------------------------------

// Returns true if auto-reveals and auto-marks are currently blocked.
function _autoActionsBlocked() {
    return ptHasSkill('keystone_ergodic_field') || window._oracleActive;
}


//------------------------------------------------------------------------
//---------- UTILITY: INTERQUARTILE VISION DURATION ---------------------
//------------------------------------------------------------------------
// Returns the total reveal duration in ms based on how many IQV tiers are active.
// Tier 1: 2000ms base, Tier 2: +1000ms, Tier 3: +1000ms (max 4000ms).
//------------------------------------------------------------------------
function _interquartileVisionDuration() {
    let dur = 0;
    if (ptHasSkill('interquartile_vision_1')) dur = 2000;
    if (ptHasSkill('interquartile_vision_2')) dur += 1000;
    if (ptHasSkill('interquartile_vision_3')) dur += 1000;
    return dur;
}


//------------------------------------------------------------------------
//-------------------- SHARED: BAYESIAN UPDATE ---------------------------
//------------------------------------------------------------------------
// Nodes 282 / 283 / 284 — Bayesian Update
// Each mistake while any tier is active adds +5% to a shared bonus pool.
// The pool is consumed the next time a probabilistic trigger fires.
// Called from: penalty.js after mistakeCount++
//------------------------------------------------------------------------

// Returns total accumulated bonus from mistakes (0.0–1.0+)
function _getBayesianBonus() {
    return window._bayesianBonus || 0;
}

// Resets the bonus pool after it has been consumed by a trigger
function _resetBayesianBonus() {
    window._bayesianBonus = 0;
}

// Accumulates +5% per active Bayesian Update tier on each mistake.
// Called from penalty.js.
function _onMistakeBayesianUpdate() {
    const hasTier1 = ptHasSkill('bayesian_update_1');
    const hasTier2 = ptHasSkill('bayesian_update_2');
    const hasTier3 = ptHasSkill('bayesian_update_3');
    if (!hasTier1 && !hasTier2 && !hasTier3) return;

    let increment = 0;
    if (hasTier1) increment += 0.05;
    if (hasTier2) increment += 0.05;
    if (hasTier3) increment += 0.05;

    window._bayesianBonus = (window._bayesianBonus || 0) + increment;
}

// Rolls against (baseChance + bayesianBonus). Resets the bonus pool on success.
// Returns true if the trigger should fire.
function _bayesianRoll(baseChance) {
    const totalChance = baseChance + _getBayesianBonus();
    const triggered = Math.random() < totalChance;
    if (triggered) _resetBayesianBonus();
    return triggered;
}


//------------------------------------------------------------------------
//-------------- NODE 270–272: POISSON PROCESS ---------------------------
//------------------------------------------------------------------------
// Periodically marks wrong tiles based on a Poisson-like timed interval.
//   Tier 1 (270): fires every 120s, marks 1 cell
//   Tier 2 (271): fires every 90s
//   Tier 3 (272): fires every 60s
//
// Requires: window._poissonNext must be initialised in timer.js.
// Called from: timer.js setInterval each second → _poissonProcessTick()
//------------------------------------------------------------------------

// Returns the current firing interval in seconds based on unlocked tiers.
function _poissonGetInterval() {
    if (ptHasSkill('poisson_process_3')) return 60;
    if (ptHasSkill('poisson_process_2')) return 90;
    return 120;
}

// Checks if the Bayesian bonus pool should yield an extra mark this tick, then resets.
// Returns 1 if an extra mark fires, 0 otherwise.
function _poissonCheckBayesianExtra() {
    const bonus = _getBayesianBonus();
    if (bonus > 0 && Math.random() < bonus) {
        _resetBayesianBonus();
        return 1;
    }
    return 0;
}

// Main tick — called from the timer interval in timer.js every second.
function _poissonProcessTick() {
    if (!window._poissonNext) return;
    if (Date.now() < window._poissonNext) return;
    if (!cur) return;

    const interval = _poissonGetInterval();
    window._poissonNext = Date.now() + interval * 1000;

    if (!ptHasSkill('poisson_process_1')) return;
    if (_autoActionsBlocked()) return;

    let count = 1 + _poissonCheckBayesianExtra();

    markWrongTiles(count);
    showToast(`⚗️ ${LANG === 'de'
        ? `Poisson-Prozess! ${count} Zelle(n) markiert.`
        : `Poisson Process! ${count} cell(s) marked.`}`);
    Audio_Manager.playSFX('poisson_process');
}


//------------------------------------------------------------------------
//---------------- NODE 282–284: BINOMIAL BURST --------------------------
//------------------------------------------------------------------------
// Every 10 correct fills, roll a chance to mark 1 wrong tile.
//   Tier 1 (282): 20% base chance
//   Tier 2 (283): +10% (total 30%)
//   Tier 3 (284): +20% (total 50%)
// Bayesian Update bonus is applied to the roll.
//
// Called from: mouse-button-handlers.js after a correct fill → _binomialBurstOnCorrectFill()
//------------------------------------------------------------------------

// Reads the DOM cell element's screen-centre position for VFX targeting.
function _getBurstCellCenter(row, col) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// Calculates the cumulative trigger chance across all unlocked tiers.
function _binomialBurstGetChance() {
    let chance = 0.20; // Tier 1 base
    if (ptHasSkill('binomial_burst_2')) chance += 0.10;
    if (ptHasSkill('binomial_burst_3')) chance += 0.20;
    return chance;
}

// Normalises the cell coordinate object coming from markWrongTiles(),
// which can return either { r, c } objects or [row, col] arrays.
function _normaliseCellCoord(cell) {
    return {
        row: cell.r !== undefined ? cell.r : cell[0],
        col: cell.c !== undefined ? cell.c : cell[1],
    };
}

// Generates the initial particle array for the burst VFX animation.
function _createBurstParticles(cx, cy) {
    const COLORS = ['#ff4757', '#ff6b81', '#ffa502', '#eccc68'];
    const count = 20 + Math.floor(Math.random() * 15);
    const particles = [];

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 8;
        particles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            decay: 0.015 + Math.random() * 0.03,
            size: 2 + Math.random() * 4.5,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
    }
    return particles;
}

// Draws the expanding shockwave ring for the current animation frame.
function _drawBurstRing(ctx, cx, cy, t) {
    if (t >= 0.5) return;
    const progress = t / 0.5;
    const ringAlpha = 1 - progress;
    const ringRadius = 10 + progress * 65;

    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 71, 87, ${ringAlpha})`;
    ctx.lineWidth = 4 * ringAlpha;
    ctx.stroke();
}

// Updates particle physics and draws each living spark for the current frame.
// Returns true if at least one particle is still alive.
function _updateAndDrawBurstParticles(ctx, particles) {
    let anyAlive = false;
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.life <= 0) continue;

        anyAlive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Simulate gravity
        p.life -= p.decay;

        const alpha = Math.max(0, p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    return anyAlive;
}

// Creates a canvas overlay and plays the burst explosion VFX on the target cell.
function _playBinomialBurstVFX(row, col) {
    const center = _getBurstCellCenter(row, col);
    if (!center) return;

    const { x: cx, y: cy } = center;
    const DURATION = 3000;

    // Create a full-screen canvas for the effect
    const cvs = document.createElement('canvas');
    cvs.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:6000;';
    document.body.appendChild(cvs);

    const ctx = cvs.getContext('2d');
    cvs.width = window.innerWidth;
    cvs.height = window.innerHeight;

    const particles = _createBurstParticles(cx, cy);
    const startTime = performance.now();
    let animId;

    function tick(now) {
        const t = Math.min((now - startTime) / DURATION, 1);
        ctx.clearRect(0, 0, cvs.width, cvs.height);

        _drawBurstRing(ctx, cx, cy, t);
        const particlesAlive = _updateAndDrawBurstParticles(ctx, particles);
        const ringAlive = t < 0.5;

        if ((particlesAlive || ringAlive) && t < 1) {
            animId = requestAnimationFrame(tick);
        } else {
            cancelAnimationFrame(animId);
            cvs.remove();
        }
    }

    animId = requestAnimationFrame(tick);
}

// Main entry point — called from mouse-button-handlers.js on every correct fill.
function _binomialBurstOnCorrectFill(row, col) {
    if (!ptHasSkill('binomial_burst_1')) return;
    if (_autoActionsBlocked()) return;

    window._binomialBurstFills = (window._binomialBurstFills || 0) + 1;
    if (window._binomialBurstFills < 10) return;
    window._binomialBurstFills = 0;

    const chance = _binomialBurstGetChance();
    if (!_bayesianRoll(chance)) return;

    const markedCells = markWrongTiles(1);
    showToast(`💢 ${LANG === 'de' ? 'Binomialer Ausbruch!' : 'Binomial Burst!'}`);
    Audio_Manager.playSFX('binomial_burst');
    PassiveTracker.onBinomialTrigger();

    if (markedCells && markedCells.length > 0) {
        markedCells.forEach(cell => {
            const { row: r, col: c } = _normaliseCellCoord(cell);
            _playBinomialBurstVFX(r, c);
        });
    }
}


//------------------------------------------------------------------------
//----------- NODE 288: KEYSTONE — MAXIMUM LIKELIHOOD -------------------
//------------------------------------------------------------------------
// At level start: deducts 15 minutes from the timer, then reveals
// all cells in the densest row AND densest column as a bonus.
// Blocked by Oracle and Ergodic Field.
//
// Called from: start-level.js → _applyPassiveStartEffects()
//------------------------------------------------------------------------

// Returns the index of the row with the most filled solution cells.
function _findDensestRow(sol) {
    let bestRow = 0, bestCount = -1;
    for (let r = 0; r < sol.length; r++) {
        const count = sol[r].filter(v => v === 1).length;
        if (count > bestCount) { bestCount = count; bestRow = r; }
    }
    return bestRow;
}

// Returns the index of the column with the most filled solution cells.
function _findDensestCol(sol) {
    const cols = sol[0].length;
    let bestCol = 0, bestCount = -1;
    for (let c = 0; c < cols; c++) {
        const count = sol.filter(row => row[c] === 1).length;
        if (count > bestCount) { bestCount = count; bestCol = c; }
    }
    return bestCol;
}

// Reveals a single solution cell if it isn't already filled/revealed.
// Returns true if the cell's state actually changed.
function _revealSolutionCell(sol, r, c) {
    if (sol[r][c] !== 1 || userGrid[r][c] === 1 || revealedGrid[r][c]) return false;
    revealedGrid[r][c] = true;
    userGrid[r][c] = 1;
    renderCell(r, c);
    updClues(r, c, true);
    return true;
}

// Reveals all unfilled solution cells along a single row. Returns IDs of affected elements.
function _revealRow(sol, rowIndex) {
    const affected = [];
    const cols = sol[0].length;
    for (let c = 0; c < cols; c++)
        if (_revealSolutionCell(sol, rowIndex, c)) affected.push(`g-${rowIndex}-${c}`);
    return affected;
}

// Reveals all unfilled solution cells along a single column. Returns IDs of affected elements.
function _revealCol(sol, colIndex) {
    const affected = [];
    const rows = sol.length;
    for (let r = 0; r < rows; r++)
        if (_revealSolutionCell(sol, r, colIndex)) affected.push(`g-${r}-${colIndex}`);
    return affected;
}

// Main entry — deducts time and reveals the densest cross of cells.
// Called from: start-level.js
function _applyMaximumLikelihood() {
    if (!ptHasSkill('keystone_maximum_likelihood')) return;
    if (_autoActionsBlocked()) return;
    if (!cur) return;

    const sol = cur.grid;

    // Apply the time penalty first (-15 minutes)
    timerSecs = Math.max(0, timerSecs - 900);

    const densestRow = _findDensestRow(sol);
    const densestCol = _findDensestCol(sol);

    const affected = [
        ..._revealRow(sol, densestRow),
        ..._revealCol(sol, densestCol),
    ];

    if (typeof _applyCellEffect === 'function') {
        _applyCellEffect(affected, 'reveal');
        if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
    }

    checkWin();
    updTimer();
}


//------------------------------------------------------------------------
//----------- NODE 289: KEYSTONE — GAMBLER'S RUIN ----------------------
//------------------------------------------------------------------------
// Trade-off keystone:
//   Upside  : +3 seconds added to the timer per correct fill
//   Downside: -60 seconds removed from the timer per mistake
// All other time-bonus sources are blocked externally via ptHasSkill check.
//
// Called from: mouse-button-handlers.js → _gamblersRuinOnCorrectFill()
//              penalty.js              → _gamblersRuinOnMistake()
//------------------------------------------------------------------------

// Adds 3 seconds for a correct fill. Called from mouse-button-handlers.js.
function _gamblersRuinOnCorrectFill() {
    if (!ptHasSkill('keystone_gamblers_ruin')) return;
    timerSecs += 3;
    questStat_gamblersRuinTimeAdded(3);
    updTimer();
}

// Deducts 60 seconds for a mistake. Called from penalty.js.
function _gamblersRuinOnMistake() {
    if (!ptHasSkill('keystone_gamblers_ruin')) return;
    timerSecs = Math.max(0, timerSecs - 60);
    updTimer();
}


//------------------------------------------------------------------------
//----------- NODE 290: KEYSTONE — SPARSE PRIOR -------------------------
//------------------------------------------------------------------------
// All clues are hidden at level start. Each time a row or column is fully
// completed, the clues for that line AND its immediate neighbours are revealed.
//
// Called from: start-level.js → _applySparsePrior()
//              grid.js (updClues when rowDone/colDone) → _sparsePriorOnLineComplete()
//------------------------------------------------------------------------

// Hides all clues at level start with a small delay (waits for DOM to settle).
// Called from: start-level.js
function _applySparsePrior() {
    if (!ptHasSkill('keystone_sparse_prior')) return;
    setTimeout(_hideAllClues, 100);
}

// Returns the list of adjacent line indices (clamps to valid grid range).
function _getAdjacentLineIndices(lineIndex, maxIndex) {
    return [lineIndex - 1, lineIndex, lineIndex + 1].filter(i => i >= 0 && i < maxIndex);
}

// Reveals clues for a completed row and its immediate row-neighbours.
function _sparsePriorRevealRow(lineIndex) {
    const rows = cur.grid.length;
    _getAdjacentLineIndices(lineIndex, rows).forEach(_revealRowClues);
}

// Reveals clues for a completed column and its immediate column-neighbours.
function _sparsePriorRevealCol(lineIndex) {
    const cols = cur.grid[0].length;
    _getAdjacentLineIndices(lineIndex, cols).forEach(_revealColClues);
}

// Called from grid.js when a line is completed. Reveals adjacent clues once.
function _sparsePriorOnLineComplete(lineIndex, isRow) {
    if (!ptHasSkill('keystone_sparse_prior')) return;
    if (!cur) return;

    if (!window._sparsePriorRevealedLines) window._sparsePriorRevealedLines = new Set();

    // Guard against duplicate reveals for the same line
    const key = (isRow ? 'r' : 'c') + lineIndex;
    if (window._sparsePriorRevealedLines.has(key)) return;
    window._sparsePriorRevealedLines.add(key);

    if (isRow) {
        _sparsePriorRevealRow(lineIndex);
    } else {
        _sparsePriorRevealCol(lineIndex);
    }
}


//------------------------------------------------------------------------
//----------- NODE 291: KEYSTONE — ERGODIC FIELD ------------------------
//------------------------------------------------------------------------
// Every 3 minutes, the complete solution is flashed on screen for 1 second.
// While active, all auto-reveal and auto-mark nodes are blocked (see _autoActionsBlocked).
//
// Called from: start-level.js → _ergodicFieldInit()
//              timer.js setInterval → _ergodicFieldTick()
//------------------------------------------------------------------------

// Collects all DOM cell elements that are not yet in the solved / revealed state.
function _ergodicFieldGetFlashCells(sol) {
    const rows = sol.length, cols = sol[0].length;
    const cells = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (userGrid[r][c] === 1 || revealedGrid[r][c]) continue;
            const el = document.getElementById(`g-${r}-${c}`);
            if (!el) continue;
            _applyScanRevealClasses(el, sol[r][c] === 1);
            cells.push(el);
        }
    }
    return cells;
}

// Removes the scan-reveal class and fully re-renders all cells after the flash ends.
function _ergodicFieldRestoreBoard(flashedCells, sol) {
    const rows = sol.length, cols = sol[0].length;
    flashedCells.forEach(el => el.classList.remove('scan-reveal'));
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            renderCell(r, c);
}

// Sets up the first flash timestamp at level start.
// Called from: start-level.js
function _ergodicFieldInit() {
    if (!ptHasSkill('keystone_ergodic_field')) return;
    window._ergodicFieldNext = Date.now() + ERGODIC_FIELD_INTERVAL_MS;
}

// Main tick — fires the solution flash if enough time has elapsed.
// Called from: timer.js setInterval
function _ergodicFieldTick() {
    if (!ptHasSkill('keystone_ergodic_field')) return;
    if (!window._ergodicFieldNext || Date.now() < window._ergodicFieldNext) return;
    if (!cur) return;

    window._ergodicFieldNext = Date.now() + ERGODIC_FIELD_INTERVAL_MS;

    const sol = cur.grid;
    const flashedCells = _ergodicFieldGetFlashCells(sol);

    showToast(`🌊 ${LANG === 'de' ? 'Ergodisches Feld!' : 'Ergodic Field!'}`);

    // Restore board to its true state after the flash duration
    setTimeout(() => _ergodicFieldRestoreBoard(flashedCells, sol), ERGODIC_FIELD_FLASH_MS);
}


//------------------------------------------------------------------------
//----------- NODE 293: KEYSTONE — ENTROPY DRAIN ------------------------
//------------------------------------------------------------------------
// Any row or column that has been partially filled but not completed for
// more than 3 minutes has all its reveals and marks reverted.
// Also reduces class ability cooldowns by 30s (handled in class code).
//
// Called from: start-level.js → _entropyDrainInit()
//              grid.js (updClues) → _entropyDrainUpdateProgress()
//              timer.js setInterval → _entropyDrainTick()
//------------------------------------------------------------------------

// Checks whether a row has any progress but is not yet complete.
function _entropyRowIsStalled(sol, rowIndex) {
    const hasAny = sol[rowIndex].some((v, c) => v === 1 && (userGrid[rowIndex][c] === 1 || revealedGrid[rowIndex][c]));
    const isDone = sol[rowIndex].every((v, c) => v === 0 || userGrid[rowIndex][c] === 1 || revealedGrid[rowIndex][c]);
    return hasAny && !isDone;
}

// Checks whether a column has any progress but is not yet complete.
function _entropyColIsStalled(sol, colIndex) {
    const hasAny = sol.some((row, r) => row[colIndex] === 1 && (userGrid[r][colIndex] === 1 || revealedGrid[r][colIndex]));
    const isDone = sol.every((row, r) => row[colIndex] === 0 || userGrid[r][colIndex] === 1 || revealedGrid[r][colIndex]);
    return hasAny && !isDone;
}

// Clears reveals and marks from a row and re-renders it.
function _entropyDrainRevertRow(rowIndex, cols) {
    for (let c = 0; c < cols; c++) {
        if (revealedGrid[rowIndex][c]) { revealedGrid[rowIndex][c] = false; userGrid[rowIndex][c] = 0; }
        else if (userGrid[rowIndex][c] === 2) userGrid[rowIndex][c] = 0;
        renderCell(rowIndex, c);
    }
    showToast(`🌡️ ${LANG === 'de' ? `Entropie-Abbau: Zeile ${rowIndex + 1} zurückgesetzt!` : `Entropy Drain: Row ${rowIndex + 1} reverted!`}`);
}

// Clears reveals and marks from a column and re-renders it.
function _entropyDrainRevertCol(colIndex, rows) {
    for (let r = 0; r < rows; r++) {
        if (revealedGrid[r][colIndex]) { revealedGrid[r][colIndex] = false; userGrid[r][colIndex] = 0; }
        else if (userGrid[r][colIndex] === 2) userGrid[r][colIndex] = 0;
        renderCell(r, colIndex);
    }
    showToast(`🌡️ ${LANG === 'de' ? `Entropie-Abbau: Spalte ${colIndex + 1} zurückgesetzt!` : `Entropy Drain: Column ${colIndex + 1} reverted!`}`);
}

// Stamps all row and column timestamps to "now" at level start.
// Called from: start-level.js
function _entropyDrainInit() {
    window._entropyDrainTimestamps = {};
    if (!ptHasSkill('keystone_entropy_drain')) return;
    if (!cur) return;

    const rows = cur.grid.length, cols = cur.grid[0].length;
    const now = Date.now();
    for (let r = 0; r < rows; r++) window._entropyDrainTimestamps[`r-${r}`] = now;
    for (let c = 0; c < cols; c++) window._entropyDrainTimestamps[`c-${c}`] = now;
}

// Refreshes the timestamp for a row and column when the player makes progress.
// Called from: grid.js (updClues)
function _entropyDrainUpdateProgress(row, col) {
    if (!ptHasSkill('keystone_entropy_drain')) return;
    const now = Date.now();
    window._entropyDrainTimestamps[`r-${row}`] = now;
    window._entropyDrainTimestamps[`c-${col}`] = now;
}

// Checks a single row/col timer entry: refreshes its timestamp if no longer
// stalled, or reverts the line once the stall exceeds the timeout.
function _entropyDrainProcessLine(key, isStalled, revert, now) {
    const ts = window._entropyDrainTimestamps[key];
    if (!ts) return;

    if (!isStalled()) {
        window._entropyDrainTimestamps[key] = now;
        return;
    }
    if (now - ts >= ENTROPY_DRAIN_TIMEOUT_MS) {
        window._entropyDrainTimestamps[key] = now;
        revert();
    }
}

// Main tick — reverts any stalled lines that have exceeded the timeout.
// Called from: timer.js setInterval
function _entropyDrainTick() {
    if (!ptHasSkill('keystone_entropy_drain')) return;
    if (!cur) return;

    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const now = Date.now();

    for (let r = 0; r < rows; r++) {
        _entropyDrainProcessLine(`r-${r}`, () => _entropyRowIsStalled(sol, r), () => _entropyDrainRevertRow(r, cols), now);
    }
    for (let c = 0; c < cols; c++) {
        _entropyDrainProcessLine(`c-${c}`, () => _entropyColIsStalled(sol, c), () => _entropyDrainRevertCol(c, rows), now);
    }
}


//------------------------------------------------------------------------
//----------- NODE 294: KEYSTONE — RANDOM WALK --------------------------
//------------------------------------------------------------------------
// Every 30 seconds a random unfilled cell is either auto-filled (if it
// should be filled) or auto-marked wrong (if it should be empty).
// The player loses the level if they accumulate 2 or more mistakes.
// Oracle blocks all actions.
//
// Called from: start-level.js → _randomWalkInit()
//              timer.js setInterval → _randomWalkTick()
//------------------------------------------------------------------------

// Triggers the level-failed overlay with a Random Walk specific message.
function _randomWalkFail() {
    dead = true;
    stopTimer();
    window._lastFailedGi = cur.gIdx;
    document.getElementById('lose-title').textContent = t('ov_lose');
    document.getElementById('lose-sub').textContent =
        LANG === 'de'
            ? 'Zufällige Wanderung: 2 Fehler — Level verloren!'
            : 'Random Walk: 2 mistakes — level lost!';
    document.getElementById('ov-lose').classList.add('show');
}

// Builds a list of all cells that have not yet been touched by the player.
function _randomWalkGetUnfilledCells() {
    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const unfilled = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (userGrid[r][c] === 0 && !revealedGrid[r][c] && !wrongGrid[r][c])
                unfilled.push([r, c]);
    return unfilled;
}

// Handles the case where the randomly chosen cell belongs to the solution (reveals it).
function _randomWalkRevealCell(r, c) {
    revealedGrid[r][c] = true;
    userGrid[r][c] = 1;
    renderCell(r, c);

    // Consume any pending Bayesian bonus as an extra mark on the side
    if (_getBayesianBonus() > 0 && Math.random() < _getBayesianBonus()) {
        _resetBayesianBonus();
        markWrongTiles(1);
    }

    updClues(r, c);
    showToast(`🚶 ${LANG === 'de' ? 'Zufällige Wanderung: Zelle enthüllt!' : 'Random Walk: Cell revealed!'}`);
    checkWin();
}

// Handles the case where the randomly chosen cell is empty (marks it as wrong).
// Note: This does NOT increment mistakeCount — it is a neutral wrong mark.
function _randomWalkMarkEmpty(r, c) {
    userGrid[r][c] = 2; // Mark as wrong without counting as a player mistake
    renderCell(r, c);
    systemMarkedGrid[r][c] = true;
    updClues(r, c);
    showToast(`🚶 ${LANG === 'de' ? 'Zufällige Wanderung: Leeres Feld markiert!' : 'Random Walk: Empty cell marked!'}`);
    checkWin();
}

// Initialises the first trigger timestamp at level start.
// Called from: start-level.js
function _randomWalkInit() {
    window._randomWalkNext = null;
    if (!ptHasSkill('keystone_random_walk')) return;
    window._randomWalkNext = Date.now() + RANDOM_WALK_INTERVAL_MS;
}

// Main tick — checks for failures, then fires the next random cell action.
// Called from: timer.js setInterval
function _randomWalkTick() {
    if (!ptHasSkill('keystone_random_walk')) return;
    if (!cur || dead) return;
    if (window._oracleActive) return;

    // Enforce the loss condition BEFORE doing anything else
    if (mistakeCount >= RANDOM_WALK_MAX_MISTAKES) {
        _randomWalkFail();
        return;
    }

    // Self-initialisation failsafe (in case init was called before the skill was active)
    if (!window._randomWalkNext) {
        window._randomWalkNext = Date.now() + RANDOM_WALK_INTERVAL_MS;
        return;
    }
    if (Date.now() < window._randomWalkNext) return;

    window._randomWalkNext = Date.now() + RANDOM_WALK_INTERVAL_MS;

    const unfilled = _randomWalkGetUnfilledCells();
    if (unfilled.length === 0) return;

    const [r, c] = unfilled[Math.floor(Math.random() * unfilled.length)];

    if (cur.grid[r][c] === 1) {
        _randomWalkRevealCell(r, c);
    } else {
        _randomWalkMarkEmpty(r, c);
    }
}


//------------------------------------------------------------------------
//---------- NODE 295: KEYSTONE — FREQUENTIST'S BURDEN ------------------
//------------------------------------------------------------------------
// All clues are hidden at level start. Every 5 correct fills, 1 randomly
// chosen hidden row or column clue is permanently revealed.
//
// Called from: start-level.js → _applyFrequentistsBurden()
//              mouse-button-handlers.js → _frequentistsBurdenOnCorrectFill()
//------------------------------------------------------------------------

// Collects all row/col indices that still have at least one blacked-out clue element.
function _frequentistGetHiddenLines() {
    if (!cur) return [];
    const rows = cur.grid.length, cols = cur.grid[0].length;
    const hidden = [];

    for (let r = 0; r < rows; r++) {
        if (document.querySelector(`.rct-${r}.clue-blackout`))
            hidden.push({ type: 'row', idx: r });
    }
    for (let c = 0; c < cols; c++) {
        if (document.querySelector(`.cch-${c}.clue-blackout`))
            hidden.push({ type: 'col', idx: c });
    }
    return hidden;
}

// Reveals all clue elements for the randomly chosen line.
function _frequentistRevealLine(line) {
    if (line.type === 'row') {
        _revealRowClues(line.idx);
        showToast(`📜 ${LANG === 'de' ? `Frequentist: Zeile ${line.idx + 1} enthüllt!` : `Frequentist: Row ${line.idx + 1} revealed!`}`);
    } else {
        _revealColClues(line.idx);
        showToast(`📜 ${LANG === 'de' ? `Frequentist: Spalte ${line.idx + 1} enthüllt!` : `Frequentist: Column ${line.idx + 1} revealed!`}`);
    }
}

// Hides all clues at level start and activates the system.
// Called from: start-level.js
function _applyFrequentistsBurden() {
    if (!ptHasSkill('keystone_frequentists_burden')) return;
    window._frequentistsFills = 0;
    window._frequentistsBurdenActive = true;
    setTimeout(_hideAllClues, 100);
}

// Called on every correct fill. Reveals one random hidden clue every 5 fills.
// Called from: mouse-button-handlers.js
function _frequentistsBurdenOnCorrectFill() {
    if (!ptHasSkill('keystone_frequentists_burden')) return;
    if (!window._frequentistsBurdenActive) return;

    window._frequentistsFills = (window._frequentistsFills || 0) + 1;
    if (window._frequentistsFills % FREQUENTIST_FILLS_PER_REVEAL !== 0) return;

    const hiddenLines = _frequentistGetHiddenLines();
    if (hiddenLines.length === 0) return;

    const pick = hiddenLines[Math.floor(Math.random() * hiddenLines.length)];
    _frequentistRevealLine(pick);
}


//------------------------------------------------------------------------
//---------- NODE 296: KEYSTONE — SIGNAL TO NOISE -----------------------
//------------------------------------------------------------------------
// At level start, 15% of all clue numbers are replaced with a nearby
// incorrect value (shown in red). Once the player reaches 75% completion,
// all fake clues are restored to their true values.
//
// Called from: start-level.js → _applySignalToNoise()
//              grid.js / checkWin → _signalToNoiseCheckRestore()
//------------------------------------------------------------------------

// Collects every clue number span across all rows and columns.
function _signalToNoiseCollectAllSpans(sol) {
    const rows = sol.length, cols = sol[0].length;
    const spans = [];

    for (let r = 0; r < rows; r++)
        document.querySelectorAll(`[id^="rn-${r}-"]`).forEach(span => spans.push({ span, type: 'row', idx: r }));

    for (let c = 0; c < cols; c++)
        document.querySelectorAll(`[id^="cn-${c}-"]`).forEach(span => spans.push({ span, type: 'col', idx: c }));

    return spans;
}

// Generates a fake value that is different from the original and non-negative.
function _signalToNoiseGenerateFakeValue(original) {
    let fake;
    do {
        fake = original + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 3));
    } while (fake === original || fake < 0);
    return fake;
}

// Overwrites a span's text with a fake value and colours it red.
function _signalToNoiseCorruptSpan(spanEntry) {
    const { span } = spanEntry;
    const original = parseInt(span.textContent) || 0;
    const fake = _signalToNoiseGenerateFakeValue(original);

    window._signalToNoiseFakeClues.push({ spanId: span.id, originalVal: original, fakeVal: fake });
    span.textContent = fake;
    span.style.color = 'var(--danger, #f55)';
}

// Restores one fake clue span back to its original value.
function _signalToNoiseRestoreSpan({ spanId, originalVal }) {
    const span = document.getElementById(spanId);
    if (span) { span.textContent = originalVal; span.style.color = ''; }
}

// Corrupts 15% of all clue spans at level start.
// Called from: start-level.js
function _applySignalToNoise() {
    if (!ptHasSkill('keystone_signal_to_noise')) return;
    if (!cur) return;

    window._signalToNoiseActive = true;
    window._signalToNoiseFakeClues = [];

    const allSpans = _signalToNoiseCollectAllSpans(cur.grid);
    const corruptCount = Math.max(1, Math.floor(allSpans.length * SIGNAL_NOISE_CORRUPT_RATIO));

    // Shuffle in-place then slice to pick the target spans
    allSpans.sort(() => Math.random() - 0.5).slice(0, corruptCount).forEach(_signalToNoiseCorruptSpan);

    showToast(`📡 ${LANG === 'de' ? '15% der Hinweise sind verfälscht!' : '15% of clues are falsified!'}`);
}

// Checks completion ratio and restores all fake clues once 75% is reached.
// Called from: grid.js / checkWin
function _signalToNoiseCheckRestore() {
    if (!ptHasSkill('keystone_signal_to_noise')) return;
    if (!window._signalToNoiseActive) return;
    if (!cur) return;

    if (_getBoardCompletionRatio() < SIGNAL_NOISE_RESTORE_RATIO) return;

    window._signalToNoiseActive = false;
    window._signalToNoiseFakeClues.forEach(_signalToNoiseRestoreSpan);
    window._signalToNoiseFakeClues = [];

    showToast(`📡 ${LANG === 'de' ? 'Alle Hinweise wiederhergestellt!' : 'All clues restored!'}`);
}


//------------------------------------------------------------------------
//---------- NODE 298: KEYSTONE — DEGREES OF FREEDOM -------------------
//------------------------------------------------------------------------
// At level start the player chooses which axis (rows or columns) to hide.
// Every 30 seconds the hidden clues flash visible for 5 seconds, then hide again.
//
// Called from: start-level.js → _applyDegreesOfFreedom()
//              timer.js setInterval → _degreesOfFreedomTick()
//------------------------------------------------------------------------

// Builds and appends the axis-selection modal to the page.
function _dofShowModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-bg show';
    modal.id = 'dof-modal';
    modal.innerHTML = `
        <div class="modal-box" style="text-align:center;max-width:340px">
            <h3>🎛️ ${LANG === 'de' ? 'Freiheitsgrade' : 'Degrees of Freedom'}</h3>
            <p style="margin:10px 0">${LANG === 'de'
            ? 'Welche Hinweise sollen verborgen werden?'
            : 'Which clues should be hidden?'}</p>
            <button onclick="_dofChoose('row')" style="margin:6px;padding:8px 18px">
                ${LANG === 'de' ? '🔲 Zeilenhinweise' : '🔲 Row Clues'}
            </button>
            <button onclick="_dofChoose('col')" style="margin:6px;padding:8px 18px">
                ${LANG === 'de' ? '🔲 Spaltenhinweise' : '🔲 Column Clues'}
            </button>
        </div>`;
    document.body.appendChild(modal);
}

// Removes the selection modal if it exists.
function _dofRemoveModal() {
    const modal = document.getElementById('dof-modal');
    if (modal) modal.remove();
}

// Hides the clues for the chosen axis across the whole board.
function _dofHideChosenAxis(type) {
    if (!cur) return;
    _setClueBlackout(type === 'row' ? '[class*="rct-"]' : '[class*="cch-"]', true);
}

// Called when the player clicks one of the modal buttons.
// Sets the chosen axis, closes the modal, and starts the flash timer.
function _dofChoose(type) {
    _dofRemoveModal();
    window._degreesOfFreedomChoice = type;
    window._degreesOfFreedomNext = Date.now() + DOF_FLASH_INTERVAL_MS;

    _dofHideChosenAxis(type);

    const label = LANG === 'de'
        ? `${type === 'row' ? 'Zeilen' : 'Spalten'}hinweise verborgen!`
        : `${type === 'row' ? 'Row' : 'Column'} clues hidden!`;
    showToast(`🎛️ ${label}`);
}

// Flashes a set of elements as visible, then re-hides them after the flash duration.
function _dofFlashElements(elements) {
    elements.forEach(el => el.classList.remove('clue-blackout'));
    setTimeout(() => elements.forEach(el => el.classList.add('clue-blackout')), DOF_FLASH_DURATION_MS);
}

// Shows the axis-choice modal at level start.
// Called from: start-level.js
function _applyDegreesOfFreedom() {
    if (!ptHasSkill('keystone_degrees_of_freedom')) return;
    window._degreesOfFreedomNext = null;
    window._degreesOfFreedomChoice = null;
    _dofShowModal();
}

// Main tick — briefly flashes the hidden clues on schedule.
// Called from: timer.js setInterval
function _degreesOfFreedomTick() {
    if (!ptHasSkill('keystone_degrees_of_freedom')) return;
    if (!window._degreesOfFreedomChoice || !window._degreesOfFreedomNext) return;
    if (Date.now() < window._degreesOfFreedomNext) return;
    if (!cur) return;

    window._degreesOfFreedomNext = Date.now() + DOF_FLASH_INTERVAL_MS;

    const selector = window._degreesOfFreedomChoice === 'row' ? '[class*="rct-"]' : '[class*="cch-"]';
    const elements = document.querySelectorAll(selector);

    _dofFlashElements(elements);
    showToast(`🎛️ ${LANG === 'de' ? 'Hinweise kurz sichtbar!' : 'Clues briefly visible!'}`);
}


//------------------------------------------------------------------------
//---------- NODE 299: KEYSTONE — OVERFITTING ---------------------------
//------------------------------------------------------------------------
// Before 15% board completion: mistakes are free (no time penalty).
// After 15% board completion: mistakes cost 3× the normal time penalty.
// Phase transition is announced via toast exactly once.
//
// Called from: penalty.js → _overfittingPenaltyMultiplier()
//              start-level.js → resetOverfittingTracker()
//------------------------------------------------------------------------

// Calculates the current phase without side effects.
function _overfittingCalculatePhase() {
    if (!cur) return 'off';
    const ratio = _getBoardCompletionRatio();
    return ratio < OVERFITTING_PHASE_THRESHOLD ? 'free' : 'hard';
}

// Returns the current phase ('free' | 'hard' | 'off') and fires a toast on phase change.
function _overfittingGetPhase() {
    if (!ptHasSkill('keystone_overfitting')) return 'off';

    const currentPhase = _overfittingCalculatePhase();

    if (_lastOverfittingPhase === 'free' && currentPhase === 'hard') {
        _lastOverfittingPhase = 'hard';
        showToast(`📉 ${LANG === 'de'
            ? 'Überanpassung!'
            : 'Overfitting!'}`);
        Audio_Manager.playSFX('overfitting_alert');
    }

    return currentPhase;
}

// Returns a penalty multiplier override (0 = free, 3 = triple, null = inactive).
// Called from: penalty.js before the normal penalty calculation.
function _overfittingPenaltyMultiplier() {
    if (!ptHasSkill('keystone_overfitting')) return null;
    const phase = _overfittingGetPhase();
    if (phase === 'free') return 0;
    if (phase === 'hard') return 3;
    return null;
}

// Resets the phase tracker at the start of each new level.
// Called from: start-level.js
function resetOverfittingTracker() {
    _lastOverfittingPhase = 'free';
}


//------------------------------------------------------------------------
//---------- NODE 300: KEYSTONE — THE ORACLE ----------------------------
//------------------------------------------------------------------------
// Only activates on puzzles with 200+ cells. At level start, flashes the
// complete solution for 3 seconds, then hides all clues permanently.
// For the rest of the level: no auto-reveals, no auto-marks, no clue hints.
//
// Called from: start-level.js → _applyTheOracle()
//------------------------------------------------------------------------

// Lights up all solution cells with the scan-reveal animation class.
function _oracleFlashSolution(sol) {
    const rows = sol.length, cols = sol[0].length;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const el = document.getElementById(`g-${r}-${c}`);
            if (!el) continue;
            _applyScanRevealClasses(el, sol[r][c] === 1);
        }
    }
}

// Restores all cells to their blank pre-fill state and removes the scan-reveal class.
function _oracleHideSolution(sol) {
    const rows = sol.length, cols = sol[0].length;
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            renderCell(r, c);
    document.querySelectorAll('.scan-reveal').forEach(el => el.classList.remove('scan-reveal'));
}

// Shows the full solution flash at level start, then hides everything.
// Called from: start-level.js
function _applyTheOracle() {
    if (!ptHasSkill('keystone_the_oracle')) return;
    if (!cur) return;

    const cellCount = cur.grid.length * cur.grid[0].length;
    if (cellCount < ORACLE_MIN_CELL_COUNT) return;

    window._oracleActive = true;

    const sol = cur.grid;

    _oracleFlashSolution(sol);
    _hideAllClues(); // Clues are permanently hidden for the rest of the level

    showToast(`👁️👁️👁️ ${LANG === 'de'
        ? 'Orakel! 👁️👁️👁️'
        : 'Oracle! 👁️👁️👁️'}`, 5000);

    setTimeout(() => _oracleHideSolution(sol), ORACLE_FLASH_DURATION_MS);
}


//------------------------------------------------------------------------
//---------- GLOBAL: PER-LEVEL STATE RESET -------------------------------
//------------------------------------------------------------------------
// Resets all node-specific state that must be cleared at the start of each
// new level. Call this from _resetLevelState() in start-level.js.
//------------------------------------------------------------------------
function _resetNewNodeState() {
    window._bayesianBonus = 0;
    window._binomialBurstFills = 0;
    window._ergodicFieldNext = null;
    window._entropyDrainTimestamps = {};
    window._randomWalkNext = null;
    window._frequentistsFills = 0;
    window._frequentistsBurdenActive = false;
    window._signalToNoiseActive = false;
    window._signalToNoiseFakeClues = [];
    window._degreesOfFreedomChoice = null;
    window._degreesOfFreedomNext = null;
    window._oracleActive = false;
    window._sparsePriorRevealedLines = new Set();
    window._residualAnalysisRewardedLines = new Set();
}