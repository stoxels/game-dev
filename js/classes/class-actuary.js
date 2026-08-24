//------------------------------------------------------------------------
//--------------------ASCENDENCY SKILL IMPLEMENTATIONS--------------------
//-------------------------------ACTUARY CLASS----------------------------
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//----------------------------STATE & CONSTANTS---------------------------
//------------------------------------------------------------------------

// Maximum number of mistakes stored in the rolling mistake log.
const ACTUARY_MISTAKE_LOG_MAX = 10;

// Cooldown slot IDs for each Actuary active ability.
const ACTUARY_CD_REGRESSION = 'active3';
const ACTUARY_CD_SIG_THRESHOLD = 'active4';

// CSS class applied to cells inside a protected line.
const SIG_THRESH_PROTECTED_CLASS = 'sig-thresh-protected';

// ID of the Significance Threshold line-picker modal overlay.
const SIG_THRESH_PICKER_ID = 'sig-thresh-picker';

// Duration (ms) of the holy-explosion animation on a reverted cell.
const REGRESSION_EXPLOSION_MS = 800;

// Delay (ms) before chained reveal targets are actually revealed.
const REGRESSION_CHAIN_REVEAL_DELAY = 300;

// Total lifetime (ms) of the holy golden chain visual before it fades out.
const REGRESSION_CHAIN_LIFETIME_MS = 1000;

// Global state for the Actuary's two active abilities.
// These are intentionally on `window` so other files can
// read them without importing this module.
//
//   window._mistakeLog            — Array<{r,c,penaltySecs}>  rolling mistake history
//   window._dofRevertedCells      — Set<string>               cells cleared by Regression
//   window._regressionPendingReveals — Set<string> | null     reveal targets reserved during a Regression cast
//   window._sigThreshArmed        — boolean  Significance Threshold armed (next mistake triggers it)
//   window._sigThreshLines        — Array<string> | null     rank line config applied on trigger ('row','col','diagonals')
//   window._sigThresholdProtected — Set<string>               currently active shield line keys


//------------------------------------------------------------------------
//----------------------------MISTAKE LOG---------------------------------
//------------------------------------------------------------------------

// actuaryLogMistake — called by applyPenalty() each time a real penalty
// is deducted. Maintains a rolling window of the last ACTUARY_MISTAKE_LOG_MAX
// mistakes so Regression To Prior can reference them.
function actuaryLogMistake(r, c, penaltySecs) {
    if (!window._mistakeLog) window._mistakeLog = [];
    window._mistakeLog.push({ r, c, penaltySecs });
    if (window._mistakeLog.length > ACTUARY_MISTAKE_LOG_MAX) {
        window._mistakeLog.shift();
    }
}


//------------------------------------------------------------------------
//----------------ACTIVE 1: REGRESSION TO PRIOR---------------------------
//------------------------------------------------------------------------
// Reverses the N most-recent mistakes, clears their wrong-cell state, and
// refunds a percentage of the time penalty that was originally deducted.

// _regressionRevertCell — clears a single mistaken cell and triggers its
// visual explosion effect. Returns the amount of time (seconds) to recover.
function _regressionRevertCell(r, c, penaltySecs, recoverPct) {
    // Clear the mistake flag so the red ✕ disappears.
    wrongGrid[r][c] = false;

    // Reset the cell to empty.
    userGrid[r][c] = 0;

    // Mark as DoF-reverted so grid.js can apply the 'dof-reverted' CSS class.
    if (!window._dofRevertedCells) window._dofRevertedCells = new Set();
    window._dofRevertedCells.add(`${r}-${c}`);

    // Holy-explosion animation on the cell element.
    const el = document.getElementById(`g-${r}-${c}`);
    if (el) {
        el.classList.add('holy-explosion');
        setTimeout(() => el.classList.remove('holy-explosion'), REGRESSION_EXPLOSION_MS);
    }

    renderCell(r, c);
    questStat_mistakesRemoved(1);
    Audio_Manager.playSFX('actuary_mistake_reversed');

    return Math.round(penaltySecs * recoverPct);
}

// _regressionChainRevealCells — picks up to `count` random, still hidden correct
// cells on the grid, draws a holy golden chain from the corrected mistake cell
// to each of them and reveals them once the chain has "arrived".
// Returns how many cells were actually revealed.
function _regressionChainRevealCells(fromRow, fromCol, count) {
    if (!cur || count <= 0) return 0;

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const pending = window._regressionPendingReveals || new Set();

    // Collect every still-hidden correct cell (excluding already reserved ones).
    const candidates = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const key = `${r}-${c}`;
            if (sol[r][c] === 1 && !revealedGrid[r][c] && userGrid[r][c] !== 1 && !pending.has(key)) {
                candidates.push({ r, c });
            }
        }
    }
    if (candidates.length === 0) return 0;

    // Shuffle and take up to `count` targets.
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const targets = candidates.slice(0, count);

    const fromEl = document.getElementById(`g-${fromRow}-${fromCol}`);

    targets.forEach(({ r, c }) => {
        pending.add(`${r}-${c}`);
        const toEl = document.getElementById(`g-${r}-${c}`);
        if (fromEl && toEl) _regressionDrawChain(fromEl, toEl);
    });

    // Apply the reveals after a short travel delay.
    setTimeout(() => {
        targets.forEach(({ r, c }) => {
            revealedGrid[r][c] = true;
            userGrid[r][c] = 1;
            renderCell(r, c);
            updClues(r, c);
            trackAchStat('tilesRevealed', 1);
            _applyCellEffect([`g-${r}-${c}`], 'reveal');
        });
        if (targets.length > 0 && window.Audio_Manager) {
            Audio_Manager.playSFX('arcaneReveal');
        }
        questStat_classRevealUsed(targets.length);
        updateQuestStats('classAbilityUsedThisLevel', {});
        checkWin();
    }, REGRESSION_CHAIN_REVEAL_DELAY);

    return targets.length;
}

// _regressionDrawChain — builds a positioned SVG containing a golden chain
// (marching link pattern with holy glow) between two cell elements.
function _regressionDrawChain(fromEl, toEl) {
    const fr = fromEl.getBoundingClientRect();
    const tr = toEl.getBoundingClientRect();

    const x1 = fr.left + fr.width / 2;
    const y1 = fr.top + fr.height / 2;
    const x2 = tr.left + tr.width / 2;
    const y2 = tr.top + tr.height / 2;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 100vw; height: 100vh;
        pointer-events: none; z-index: 9000; overflow: visible;
    `;

    const makeLine = (width, color, glow) => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1); line.setAttribute('y1', y1);
        line.setAttribute('x2', x2); line.setAttribute('y2', y2);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', width);
        line.setAttribute('stroke-linecap', 'round');
        line.classList.add('regression-chain-link');
        if (glow) line.style.filter = 'drop-shadow(0 0 5px #ffd700)';
        svg.appendChild(line);
        return line;
    };

    // Outer golden chain links + inner bright core for the holy look.
    makeLine(9, '#ffd700', true);
    makeLine(4, '#fffbe6', false);

    // Anchor nodes at both ends of the chain.
    [ [x1, y1], [x2, y2] ].forEach(([x, y]) => {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', x); dot.setAttribute('cy', y);
        dot.setAttribute('r', 5);
        dot.setAttribute('fill', '#ffd700');
        dot.style.filter = 'drop-shadow(0 0 6px #ffd700)';
        svg.appendChild(dot);
    });

    document.body.appendChild(svg);
    setTimeout(() => _fadeOutElement(svg, 1, 0.05), REGRESSION_CHAIN_LIFETIME_MS);
}

// _executeRegressionToPrior — main handler for the Regression To Prior ability.
// Reverts up to `correctCount` recent mistakes, recovers a fraction of lost time
// and reveals `revealCount` correct cells per corrected mistake (holy chain).
function _executeRegressionToPrior(correctCount, recoverPct, revealCount) {
    if (!cur) return;

    const log = window._mistakeLog || [];
    if (log.length === 0) {
        showToast(t('cls_regression_none'));
        _regressionCancel(true);
        return;
    }

    trackAchStat('skillRegressionPriorUsed');

    // Temporarily reserved reveal targets so multiple mistakes never pick the same cell.
    window._regressionPendingReveals = new Set();

    // Pull up to correctCount entries from the end of the log.
    const toCorrect = log.splice(-correctCount, correctCount);

    // Revert each cell and accumulate recovered time.
    let recoveredSecs = 0;
    let revealedTotal = 0;
    toCorrect.forEach(({ r, c, penaltySecs }) => {
        recoveredSecs += _regressionRevertCell(r, c, penaltySecs, recoverPct);
        if (revealCount > 0) {
            revealedTotal += _regressionChainRevealCells(r, c, revealCount);
        }
    });

    window._regressionPendingReveals = null;

    // Apply the recovered time (cap at 1 hour).
    if (recoveredSecs > 0) {
        const before = timerSecs;
        timerSecs = Math.min(timerSecs + recoveredSecs, 3600);
        _trackTimerDelta(before, timerSecs);
        updTimer();
    }

    showToast(t('cls_regression_done')
        .replace('{n}', toCorrect.length)
        .replace('{s}', recoveredSecs));

    if (window.Audio_Manager) {
        Audio_Manager.playSFX('varianceShield');
        Audio_Manager.playSFX('holyHealing');
    }

    if (recoveredSecs >= 120) trackAchStat('correct120smistake');

    checkWin();
    buildClassHUD();
}

// _regressionCancel — cancels the Regression ability and refunds its cooldown.
// Pass noOverlayToRemove = true when cancelling silently (e.g. nothing to correct).
function _regressionCancel(noOverlayToRemove = false) {
    _setAbilityMode(false);
    STATE.classActiveChoice = ACTUARY_CD_REGRESSION;

    _refundCooldown(ACTUARY_CD_REGRESSION);

    buildClassHUD();
    if (!noOverlayToRemove) {
        showToast(`🛡️ ${t('cls_cancelled')}`);
    }
}


//------------------------------------------------------------------------
//------------------ACTIVE 2: SIGNIFICANCE THRESHOLD---------------------
//------------------------------------------------------------------------
// When activated the ability ARMS itself. The next mistake the player makes
// is prevented (auto-marked ✕) and shield lines are applied through that
// cell: rank 1 → row, rank 2 → row + column, rank 3 → row + column + both
// diagonals. Each applied line blocks exactly one further mistake.
// Shielded cells show a golden border instead of a shield emoji.

// Line keys stored in window._sigThresholdProtected:
//   'row:i'    — row i
//   'col:j'    — column j
//   'diagA:k'  — diagonal where r - c === k   (↘)
//   'diagB:k'  — diagonal where r + c === k   (↗)


//------------------------------------------------------------------------
//--------SIGNIFICANCE THRESHOLD — LINE HELPERS--------------------------
//------------------------------------------------------------------------

// _sigThreshDiagKeys — returns both diagonal keys crossing cell (row, col).
function _sigThreshDiagKeys(row, col) {
    return [`diagA:${row - col}`, `diagB:${row + col}`];
}

// _sigThreshIterateLine — calls cb(r, c) for every grid cell on the given
// line key ('row:i', 'col:j', 'diagA:k' or 'diagB:k').
function _sigThreshIterateLine(key, cb) {
    if (!cur) return;
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const [type, idxStr] = key.split(':');
    const idx = parseInt(idxStr, 10);

    if (type === 'row') {
        if (idx < 0 || idx >= rows) return;
        for (let c = 0; c < cols; c++) cb(idx, c);
    } else if (type === 'col') {
        if (idx < 0 || idx >= cols) return;
        for (let r = 0; r < rows; r++) cb(r, idx);
    } else if (type === 'diagA') {
        // r - c === idx  →  r = c + idx
        for (let c = 0; c < cols; c++) {
            const r = c + idx;
            if (r >= 0 && r < rows) cb(r, c);
        }
    } else if (type === 'diagB') {
        // r + c === idx
        for (let c = 0; c < cols; c++) {
            const r = idx - c;
            if (r >= 0 && r < rows) cb(r, c);
        }
    }
}

// _sigThreshApplyVisual — adds the golden-border shield class to every cell
// on the given line key.
function _sigThreshApplyVisual(key) {
    _sigThreshIterateLine(key, (r, c) => {
        document.getElementById(`g-${r}-${c}`)?.classList.add(SIG_THRESH_PROTECTED_CLASS);
    });
}

// _sigThreshRemoveVisual — removes the golden-border shield class from every
// cell on the given line key (called when the shield charge is consumed).
function _sigThreshRemoveVisual(key) {
    _sigThreshIterateLine(key, (r, c) => {
        document.getElementById(`g-${r}-${c}`)?.classList.remove(SIG_THRESH_PROTECTED_CLASS);
    });
}

// _sigThreshLineName — human-readable name for a line key (for toasts).
function _sigThreshLineName(key) {
    const [type, idxStr] = key.split(':');
    const n = parseInt(idxStr, 10) + 1;
    if (type === 'row') return `${t('cls_row_word')} ${n}`;
    if (type === 'col') return `${t('cls_col_word')} ${n}`;
    return t('cls_diag_word');
}


//------------------------------------------------------------------------
//--------SIGNIFICANCE THRESHOLD — ARMING & SHIELD APPLICATION------------
//------------------------------------------------------------------------

// _sigThreshApplyShieldsAt — registers every shield line (per rank config)
// that passes through cell (row, col) and applies its visuals.
function _sigThreshApplyShieldsAt(row, col, lines) {
    if (!window._sigThresholdProtected) window._sigThresholdProtected = new Set();

    const keys = [];
    if (lines.includes('row')) keys.push(`row:${row}`);
    if (lines.includes('col')) keys.push(`col:${col}`);
    if (lines.includes('diagonals')) keys.push(..._sigThreshDiagKeys(row, col));

    keys.forEach(key => {
        if (window._sigThresholdProtected.has(key)) return;
        window._sigThresholdProtected.add(key);
        _sigThreshApplyVisual(key);
        showToast(t('cls_line_protected').replace('{name}', _sigThreshLineName(key)));
    });
}

// _sigThreshConsumeShield — consumes a matching shield charge for the given
// key and removes its visual.
function _sigThreshConsumeShield(matchKey) {
    window._sigThresholdProtected.delete(matchKey);
    _sigThreshRemoveVisual(matchKey);
    Audio_Manager.playSFX('actuary_shield_pop');

    showToast(t('cls_thresh_triggered').replace('{line}', _sigThreshLineName(matchKey)));

    if (window.Audio_Manager) Audio_Manager.playSFX('varianceShield');
}


//------------------------------------------------------------------------
//--------SIGNIFICANCE THRESHOLD — SHIELD INTERCEPTION-------------------
//------------------------------------------------------------------------

// _sigThresholdIntercept — called BEFORE a wrong fill is committed in the
// input handler. Returns true if a shield intercepted the mistake (caller
// must bail out early). Returns false otherwise.
//
// Usage in the input handler:
//   if (_sigThresholdIntercept(row, col)) return;
//
function _sigThresholdIntercept(row, col) {
    const protected_ = window._sigThresholdProtected;

    // --- Armed trigger: the first mistake after activation is always free,
    // --- and its line(s) become protected.
    if (window._sigThreshArmed) {
        window._sigThreshArmed = false;

        // Prevent the mistake — auto-mark the cell as ✕ (value 2).
        if (userGrid[row][col] === 0) {
            userGrid[row][col] = 2;
            questStat_classMarkUsed(1);
            renderCell(row, col);
            trackAchStat('tilesMarkedWrong', 1);
        }

        Audio_Manager.playSFX('actuary_shield_pop');
        _sigThreshApplyShieldsAt(row, col, window._sigThreshLines || ['row']);
        window._sigThreshLines = null;

        if (window.Audio_Manager) Audio_Manager.playSFX('varianceShield');
        buildClassHUD();

        return true;
    }

    if (!protected_ || protected_.size === 0) return false;

    const rowKey = `row:${row}`;
    const colKey = `col:${col}`;
    const diagKeys = _sigThreshDiagKeys(row, col);

    const matchKey = protected_.has(rowKey) ? rowKey
        : protected_.has(colKey) ? colKey
            : protected_.has(diagKeys[0]) ? diagKeys[0]
                : protected_.has(diagKeys[1]) ? diagKeys[1]
                    : null;

    if (!matchKey) return false;

    // Shield triggered — auto-mark the cell as ✕ (value 2) instead of a mistake.
    if (userGrid[row][col] === 0) {
        userGrid[row][col] = 2;
        questStat_classMarkUsed(1);
        renderCell(row, col);
        trackAchStat('tilesMarkedWrong', 1);
    }

    _sigThreshConsumeShield(matchKey);

    return true; // Intercepted — caller should not record a mistake.
}


//------------------------------------------------------------------------
//--------SIGNIFICANCE THRESHOLD — ENTRY POINT---------------------------
//------------------------------------------------------------------------

// _executeSignificanceThreshold — main handler for the Significance Threshold
// ability. Arms the shield: nothing happens until the player's next mistake,
// which is then blocked and turns into protection for its surrounding lines.
function _executeSignificanceThreshold(lines) {
    if (!cur) return;

    window._sigThreshArmed = true;
    window._sigThreshLines = Array.isArray(lines) && lines.length > 0 ? lines : ['row'];

    trackAchStat('skillSignificanceTreshold');

    showToast(t('cls_sig_armed'));

    Audio_Manager.playSFX('holySpell');
    buildClassHUD();
}

//------------------------------------------------------------------------
//---------------------SHARED COOLDOWN UTILITY----------------------------
//------------------------------------------------------------------------

// _refundCooldown — clears an active cooldown timer and resets its remaining
// time to 0. Used by both Regression and Significance Threshold cancel paths.
function _refundCooldown(slotId) {
    const cd = cooldownState[slotId];
    if (cd?.interval) { clearInterval(cd.interval); cd.interval = null; }
    if (cd) cd.remaining = 0;
}