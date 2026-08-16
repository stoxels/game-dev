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

// Global state for the Actuary's two active abilities.
// These are intentionally on `window` so other files can
// read them without importing this module.
//
//   window._mistakeLog            — Array<{r,c,penaltySecs}>  rolling mistake history
//   window._dofRevertedCells      — Set<string>               cells cleared by Regression
//   window._sigThreshData         — { protectCount, bonusReveal, chosen[] } | null
//   window._sigThreshBonusReveal  — boolean  rank-3 bonus flag
//   window._sigThresholdProtected — Set<string>               currently active shields


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

// _executeRegressionToPrior — main handler for the Regression To Prior ability.
// Reverts up to `correctCount` recent mistakes and recovers a fraction of lost time.
function _executeRegressionToPrior(correctCount, recoverPct) {
    if (!cur) return;

    const log = window._mistakeLog || [];
    if (log.length === 0) {
        showToast(LANG === 'de'
            ? '🛡️ Keine Fehler zum Korrigieren!'
            : '🛡️ No mistakes to correct!');
        _regressionCancel(true);
        return;
    }

    trackAchStat('skillRegressionPriorUsed');

    // Pull up to correctCount entries from the end of the log.
    const toCorrect = log.splice(-correctCount, correctCount);

    // Revert each cell and accumulate recovered time.
    let recoveredSecs = 0;
    toCorrect.forEach(({ r, c, penaltySecs }) => {
        recoveredSecs += _regressionRevertCell(r, c, penaltySecs, recoverPct);
    });

    // Apply the recovered time (cap at 1 hour).
    if (recoveredSecs > 0) {
        timerSecs = Math.min(timerSecs + recoveredSecs, 3600);
        updTimer();
    }

    showToast(`🛡️ ${LANG === 'de'
        ? `Regression: ${toCorrect.length} Fehler korrigiert, +${recoveredSecs}s zurück`
        : `Regression: ${toCorrect.length} mistake(s) corrected, +${recoveredSecs}s recovered`}`);

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
        showToast(LANG === 'de' ? '🛡️ Abgebrochen.' : '🛡️ Cancelled.');
    }
}


//------------------------------------------------------------------------
//------------------ACTIVE 2: SIGNIFICANCE THRESHOLD---------------------
//------------------------------------------------------------------------
// Lets the player shield up to N rows/columns. Any wrong fill in a shielded
// line auto-marks the cell instead of counting as a mistake (consuming that
// shield charge). Rank 3 also reveals one correct cell in the triggered line.


//------------------------------------------------------------------------
//--------SIGNIFICANCE THRESHOLD — MODAL HTML BUILDERS-------------------
//------------------------------------------------------------------------

// _sigThreshBuildLineButton — returns HTML for a single row/col button
// inside the line-picker modal.
function _sigThreshBuildLineButton(type, idx) {
    const label = type === 'row'
        ? (LANG === 'de' ? `Zeile ${idx + 1}` : `Row ${idx + 1}`)
        : (LANG === 'de' ? `Spalte ${idx + 1}` : `Col ${idx + 1}`);

    return `<button onclick="_sigThreshProtectLine('${type}', ${idx})"
        style="font-family:var(--PX); font-size:9px; background:transparent;
               border:1px solid #e67e22; color:#e67e22; padding:4px 10px;
               cursor:pointer; letter-spacing:1px; margin:2px;">
        ${label}
    </button>`;
}

// _sigThreshBuildRowButtons — builds the full row-button strip for the modal.
function _sigThreshBuildRowButtons(rowCount) {
    let html = '';
    for (let r = 0; r < rowCount; r++) html += _sigThreshBuildLineButton('row', r);
    return html;
}

// _sigThreshBuildColButtons — builds the full column-button strip for the modal.
function _sigThreshBuildColButtons(colCount) {
    let html = '';
    for (let c = 0; c < colCount; c++) html += _sigThreshBuildLineButton('col', c);
    return html;
}

// _sigThreshBuildPickerHTML — returns the full inner HTML for the line-picker
// modal overlay. Receives pre-built button strips to stay readable.
function _sigThreshBuildPickerHTML(remaining, rowBtns, colBtns) {
    const title = LANG === 'de' ? 'SIGNIFIKANZSCHWELLE' : 'SIGNIFICANCE THRESHOLD';
    const prompt = LANG === 'de' ? `Wähle bis zu ${remaining} Zeile(n) oder Spalte(n) zum Schützen:` : `Choose up to ${remaining} row(s) or column(s) to protect:`;
    const rowsLabel = LANG === 'de' ? 'ZEILEN' : 'ROWS';
    const colsLabel = LANG === 'de' ? 'SPALTEN' : 'COLUMNS';
    const doneLabel = LANG === 'de' ? 'FERTIG' : 'DONE';
    const cancelLabel = LANG === 'de' ? 'ABBRECHEN' : 'CANCEL';

    return `
        <div class="modal-box" style="text-align:center; border-left:4px solid #e67e22;
             max-width:480px; max-height:80vh; overflow-y:auto;">

            <div style="font-family:var(--PX); font-size:13px; color:#e67e22;
                        letter-spacing:2px; margin-bottom:12px;">
                🛡️ ${title}
            </div>

            <div style="font-family:var(--PX); font-size:10px; color:var(--accent2);
                        margin-bottom:14px; line-height:1.8;">
                ${prompt}
            </div>

            <div style="margin-bottom:10px;">
                <div style="font-family:var(--PX); font-size:9px; color:#aaa;
                            margin-bottom:6px; letter-spacing:1px;">
                    ${rowsLabel}
                </div>
                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:4px;">
                    ${rowBtns}
                </div>
            </div>

            <div style="margin-bottom:14px;">
                <div style="font-family:var(--PX); font-size:9px; color:#aaa;
                            margin-bottom:6px; letter-spacing:1px;">
                    ${colsLabel}
                </div>
                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:4px;">
                    ${colBtns}
                </div>
            </div>

            <div id="sig-thresh-chosen-display"
                 style="font-family:var(--PX); font-size:9px; color:#27ae60;
                        min-height:16px; margin-bottom:10px;"></div>

            <div style="display:flex; gap:10px; justify-content:center;">
                <button onclick="_sigThreshDone()"
                    style="font-family:var(--PX); font-size:9px; background:transparent;
                           border:1px solid #27ae60; color:#27ae60; padding:5px 14px;
                           cursor:pointer; letter-spacing:1px;">
                    ${doneLabel}
                </button>
                <button onclick="_sigThreshCancel()"
                    style="font-family:var(--PX); font-size:9px; background:transparent;
                           border:1px solid #444; color:#555; padding:5px 14px;
                           cursor:pointer; letter-spacing:1px;">
                    ${cancelLabel}
                </button>
            </div>
        </div>`;
}


//------------------------------------------------------------------------
//--------SIGNIFICANCE THRESHOLD — MODAL LIFECYCLE-----------------------
//------------------------------------------------------------------------

// _sigThreshShowLinePicker — creates and displays the line-picker modal,
// showing all available rows and columns as clickable buttons.
function _sigThreshShowLinePicker(protectCount) {
    if (!cur) return;

    // Remove any previously open picker before (re-)opening.
    document.getElementById(SIG_THRESH_PICKER_ID)?.remove();

    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const remaining = protectCount - (window._sigThreshData?.chosen?.length || 0);

    const rowBtns = _sigThreshBuildRowButtons(rows);
    const colBtns = _sigThreshBuildColButtons(cols);

    const overlay = document.createElement('div');
    overlay.id = SIG_THRESH_PICKER_ID;
    overlay.className = 'modal-bg show';
    overlay.style.cssText = 'z-index:3000;';
    overlay.innerHTML = _sigThreshBuildPickerHTML(remaining, rowBtns, colBtns);

    document.body.appendChild(overlay);
}

// _sigThreshRefundCooldown — clears the active cooldown for Significance
// Threshold. Called when the player cancels or confirms without picking.
function _sigThreshRefundCooldown() {
    const cd = cooldownState[ACTUARY_CD_SIG_THRESHOLD];
    if (cd?.interval) { clearInterval(cd.interval); cd.interval = null; }
    if (cd) cd.remaining = 0;
}

// _sigThreshDone — finalises the line-picker session (either all charges
// used or the player clicked DONE). If no lines were chosen the cooldown
// is refunded.
function _sigThreshDone() {
    document.getElementById(SIG_THRESH_PICKER_ID)?.remove();

    _setAbilityMode(false);

    const chosen = window._sigThreshData?.chosen?.length || 0;
    if (chosen === 0) {
        _sigThreshRefundCooldown();
        showToast(LANG === 'de' ? '🛡️ Keine Linie ausgewählt.' : '🛡️ No line selected.');
    } else {
        showToast(LANG === 'de'
            ? `🛡️ ${chosen} Linie(n) geschützt!`
            : `🛡️ ${chosen} line(s) protected!`);
    }

    window._sigThreshData = null;
    buildClassHUD();
}

// _sigThreshCancel — player explicitly cancelled; refunds cooldown and
// clears all ability state.
function _sigThreshCancel() {
    document.getElementById(SIG_THRESH_PICKER_ID)?.remove();

    window._sigThreshData = null;

    _setAbilityMode(false);
    STATE.classActiveChoice = ACTUARY_CD_SIG_THRESHOLD;

    _sigThreshRefundCooldown();

    buildClassHUD();
    showToast(LANG === 'de' ? '🛡️ Abgebrochen.' : '🛡️ Cancelled.');
}


//------------------------------------------------------------------------
//--------SIGNIFICANCE THRESHOLD — LINE PROTECTION LOGIC-----------------
//------------------------------------------------------------------------

// _sigThreshApplyVisual — adds the shield highlight CSS class to every
// cell in the specified row or column.
function _sigThreshApplyVisual(type, idx) {
    if (!cur) return;
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;

    if (type === 'row') {
        for (let c = 0; c < cols; c++) {
            document.getElementById(`g-${idx}-${c}`)?.classList.add(SIG_THRESH_PROTECTED_CLASS);
        }
    } else {
        for (let r = 0; r < rows; r++) {
            document.getElementById(`g-${r}-${idx}`)?.classList.add(SIG_THRESH_PROTECTED_CLASS);
        }
    }
}

// _sigThreshRemoveVisual — removes the shield highlight from every cell
// in the specified row or column (called when a shield charge is consumed).
function _sigThreshRemoveVisual(type, idx) {
    if (!cur) return;
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;

    if (type === 'row') {
        for (let c = 0; c < cols; c++) {
            document.getElementById(`g-${idx}-${c}`)?.classList.remove(SIG_THRESH_PROTECTED_CLASS);
        }
    } else {
        for (let r = 0; r < rows; r++) {
            document.getElementById(`g-${r}-${idx}`)?.classList.remove(SIG_THRESH_PROTECTED_CLASS);
        }
    }
}

// _sigThreshProtectLine — registers a row or column as protected after the
// player selects it in the picker. Reopens the picker if charges remain,
// or finalises if all charges have been used.
function _sigThreshProtectLine(type, idx) {
    document.getElementById(SIG_THRESH_PICKER_ID)?.remove();

    const data = window._sigThreshData;
    if (!data) return;

    const key = `${type}:${idx}`;
    if (!window._sigThresholdProtected) window._sigThresholdProtected = new Set();

    // Only add if this line hasn't already been chosen this session.
    if (!window._sigThresholdProtected.has(key)) {
        window._sigThresholdProtected.add(key);
        data.chosen.push(key);
        _sigThreshApplyVisual(type, idx);

        const lineName = type === 'row'
            ? (LANG === 'de' ? `Zeile ${idx + 1}` : `Row ${idx + 1}`)
            : (LANG === 'de' ? `Spalte ${idx + 1}` : `Col ${idx + 1}`);
        showToast(`🛡️ ${lineName} ${LANG === 'de' ? 'geschützt!' : 'protected!'}`);
    }

    const remaining = data.protectCount - data.chosen.length;
    if (remaining <= 0) {
        // All charges used — close out.
        _sigThreshDone();
    } else {
        // Reopen the picker so the player can choose more lines.
        _sigThreshShowLinePicker(data.protectCount);
    }
}


//------------------------------------------------------------------------
//--------SIGNIFICANCE THRESHOLD — SHIELD INTERCEPTION-------------------
//------------------------------------------------------------------------

// _sigThreshBonusRevealInLine — rank 3 bonus: reveals one random unrevealed
// filled cell in the row or column that just triggered its shield.
function _sigThreshBonusRevealInLine(type, idx) {
    if (!cur) return;

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    // Collect candidate cells: correct, not yet revealed, not already filled by player.
    const candidates = [];
    if (type === 'row') {
        for (let c = 0; c < cols; c++) {
            if (sol[idx][c] === 1 && !revealedGrid[idx][c] && userGrid[idx][c] !== 1)
                candidates.push([idx, c]);
        }
    } else {
        for (let r = 0; r < rows; r++) {
            if (sol[r][idx] === 1 && !revealedGrid[r][idx] && userGrid[r][idx] !== 1)
                candidates.push([r, idx]);
        }
    }

    if (!candidates.length) return;

    const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
    revealedGrid[r][c] = true;
    userGrid[r][c] = 1;

    renderCell(r, c);
    updClues(r, c);
    trackAchStat('tilesRevealed', 1);
    _applyCellEffect([`g-${r}-${c}`], 'reveal');

    showToast(LANG === 'de'
        ? '🛡️ Schwellen-Bonus: 1 Zelle enthüllt!'
        : '🛡️ Threshold bonus: 1 cell revealed!');

    questStat_classRevealUsed(1);
    updateQuestStats('classAbilityUsedThisLevel', {});
    checkWin();
}

// _sigThreshConsumeShield — consumes a matching shield charge for the given
// key, removes its visual, and fires the rank-3 bonus reveal if active.
function _sigThreshConsumeShield(matchKey) {
    window._sigThresholdProtected.delete(matchKey);

    const [type, idxStr] = matchKey.split(':');
    const idx = parseInt(idxStr, 10);

    _sigThreshRemoveVisual(type, idx);
    Audio_Manager.playSFX('actuary_shield_pop');

    if (window._sigThreshBonusReveal) {
        _sigThreshBonusRevealInLine(type, idx);
    }

    showToast(LANG === 'de'
        ? `🛡️ Schwelle ausgelöst! Fehler blockiert in ${type === 'row' ? 'Zeile' : 'Spalte'} ${idx + 1}.`
        : `🛡️ Threshold triggered! Mistake blocked in ${type} ${idx + 1}.`);

    if (window.Audio_Manager) Audio_Manager.playSFX('varianceShield');
}

// _sigThresholdIntercept — called BEFORE a wrong fill is committed in game.js.
// Returns true if a shield intercepted the mistake (caller must bail out early).
// Returns false if no shield applies and the fill should be treated normally.
//
// Usage in the input handler:
//   if (_sigThresholdIntercept(row, col)) return;
//
function _sigThresholdIntercept(row, col) {
    const protected_ = window._sigThresholdProtected;
    if (!protected_ || protected_.size === 0) return false;

    const rowKey = `row:${row}`;
    const colKey = `col:${col}`;
    const matchKey = protected_.has(rowKey) ? rowKey
        : protected_.has(colKey) ? colKey
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
// ability. Opens the line-picker modal immediately so the player can choose
// which rows/columns to shield before returning to the grid.
function _executeSignificanceThreshold(protectCount, bonusReveal) {
    if (!cur) return;

    window._sigThreshData = { protectCount, bonusReveal, chosen: [] };
    window._sigThreshBonusReveal = bonusReveal;

    trackAchStat('skillSignificanceTreshold');

    _sigThreshShowLinePicker(protectCount);

    Audio_Manager.playSFX('holySpell');
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