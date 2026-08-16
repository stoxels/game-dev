//------------------------------------------------------------------------
//-------------------INVENTORY — USE ITEM---------------------------------
//------------------------------------------------------------------------
// Handles all item-use logic: grid manipulation (reveal, mark, solve,
// erase), blackout effects, passive/keystone modifier scaling, cursed
// downside resolution, achievement + quest tracking, and the final
// consume / dispatch pipeline.
//
// Reading order follows the helper-before-caller convention:
//   low-level grid helpers  →  blackout helpers  →  grid-op functions
//   →  curse-modifier helpers  →  item handlers  →  dispatch + consume
//------------------------------------------------------------------------
//------------------------------------------------------------------------




//------------------------------------------------------------------------
//-------------------GRID STATE SNAPSHOT HELPERS--------------------------
//------------------------------------------------------------------------
// Snapshot helpers used by cursed items to know which rows/cols the
// player already had filled *before* the item benefit fires, so the
// cursed erase only targets pre-existing progress rather than the cells
// that were just revealed by the same item.
//------------------------------------------------------------------------

// Returns a Set of row indices that contain at least one correctly-filled
// cell (either placed by the player or revealed by a previous item).
function _getPreFilledRows() {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const filledRows = new Set();

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c])) {
                filledRows.add(r);
                break; // one filled cell is enough — move to the next row
            }
        }
    }
    return filledRows;
}

// Returns a Set of column indices that contain at least one correctly-
// filled cell (either placed by the player or revealed by a previous item).
function _getPreFilledCols() {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const filledCols = new Set();

    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (sol[r][c] === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c])) {
                filledCols.add(c);
                break; // one filled cell is enough — move to the next column
            }
        }
    }
    return filledCols;
}




//------------------------------------------------------------------------
//-------------------QUEST TRACKING HELPERS-------------------------------
//------------------------------------------------------------------------
// Small wrappers that fire quest-stat updates related to item use.
// Placed here so every item handler can call them without repeating the
// guard logic.
//------------------------------------------------------------------------

// Records cursed-item usage while The Witch's immunity window is active.
// Must be called once at the very top of every cursed item handler,
// before any downside logic runs.
function _trackWitchImmuneCursedUse() {
    if (window._cursedImmune) {
        updateQuestStats('cursedUnderImmunityUsed', {});
    }
}




//------------------------------------------------------------------------
//-------------------CLUE BLACKOUT HELPERS--------------------------------
//------------------------------------------------------------------------
// DOM helpers that apply / remove the 'clue-blackout' CSS class on row
// and column clue elements.  The class hides the clue text so the player
// cannot read the hints for the blackout duration.
//
// applyCursedBlackout       — random ~50% of rows AND cols, 30–60 s
// applyCursedRowBlackout    — ALL row clues, configurable duration
// applyCursedColBlackout    — ALL col clues, configurable duration
//------------------------------------------------------------------------


// Tracks the active countdown badge per axis so overlapping cursed
// effects (e.g. two row-blackouts back to back) don't leak old badges.
let _blackoutCountdownState = { row: null, col: null };

// Removes and clears the countdown badge for the given axis ('row'|'col').
function _clearBlackoutCountdown(type) {
    const state = _blackoutCountdownState[type];
    if (!state) return;
    clearInterval(state.intervalId);
    state.el.remove();
    _blackoutCountdownState[type] = null;
}

// Repositions the badge centered over the row-clue strip or the
// column-clue header block, based on the puzzle grid's current rect.
function _positionBlackoutCountdown(type, el) {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    if (type === 'row') {
        const onRight = typeof _rowCluesOnRight !== 'undefined' && _rowCluesOnRight;
        const clueWidth = (_clueColWidth || 24) * (_clueColCount || 1);
        const cx = onRight ? r.right + clueWidth / 2 : r.left - clueWidth / 2;
        el.style.left = `${cx}px`;
        el.style.top = `${r.top + r.height / 2}px`;
    } else {
        const firstHeader = document.querySelector('.cch');
        let headerTop = r.top - 20;
        if (firstHeader) {
            const wrapRect = r.wrap.getBoundingClientRect();
            const hRect = firstHeader.getBoundingClientRect();
            const zoom = currentZoom || 1;
            headerTop = (hRect.top - wrapRect.top) / zoom;
        }
        el.style.left = `${r.left + r.width / 2}px`;
        el.style.top = `${(headerTop + r.top) / 2}px`;
    }
}

// Creates (or restarts) a ticking countdown badge over the row-clue
// strip or column-clue header for durationMs, then removes itself.
function _startBlackoutCountdown(type, durationMs) {
    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return;

    _clearBlackoutCountdown(type);

    const el = document.createElement('div');
    el.className = `blackout-countdown blackout-countdown-${type}`;
    wrap.appendChild(el);

    let remaining = Math.ceil(durationMs / 1000);
    el.textContent = remaining;
    _positionBlackoutCountdown(type, el);

    const intervalId = setInterval(() => {
        remaining--;
        if (remaining <= 0) { _clearBlackoutCountdown(type); return; }
        el.textContent = remaining;
        _positionBlackoutCountdown(type, el);
    }, 1000);

    _blackoutCountdownState[type] = { el, intervalId };
}



// Selects roughly half the rows and half the cols at random and blacks
// them out for a random duration between 30 and 60 seconds.
function applyCursedBlackout() {
    if (!cur) return;

    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const durationMs = (30 + Math.floor(Math.random() * 31)) * 1000; // 30–60 s

    // Pick approximately half the rows to black out
    const affectedRows = [];
    for (let r = 0; r < rows; r++) {
        if (Math.random() < 0.5) affectedRows.push(r);
    }

    // Pick approximately half the columns to black out
    const affectedCols = [];
    for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.5) affectedCols.push(c);
    }

    affectedRows.forEach(r => {
        document.querySelectorAll(`.rct-${r}`)
            .forEach(el => el.classList.add('clue-blackout'));
    });

    affectedCols.forEach(c => {
        document.querySelectorAll(`.cch-${c}`)
            .forEach(el => el.classList.add('clue-blackout'));
    });

    if (affectedRows.length) _startBlackoutCountdown('row', durationMs);
    if (affectedCols.length) _startBlackoutCountdown('col', durationMs);

    setTimeout(() => {
        document.querySelectorAll('.clue-blackout')
            .forEach(el => el.classList.remove('clue-blackout'));
    }, durationMs);
}

// Blacks out ALL row clues for durationMs milliseconds.
// Default: 30 000 ms (30 s).  Used as the downside for cursedShield and
// cursedTime.
function applyCursedRowBlackout(durationMs = 30000) {
    if (!cur) return;

    const rows = cur.grid.length;
    for (let r = 0; r < rows; r++) {
        document.querySelectorAll(`.rct-${r}`)
            .forEach(el => el.classList.add('clue-blackout'));
    }

    _startBlackoutCountdown('row', durationMs);

    setTimeout(() => {
        document.querySelectorAll('.clue-blackout')
            .forEach(el => el.classList.remove('clue-blackout'));
    }, durationMs);
}

// Blacks out ALL column clues for durationMs milliseconds.
// Used as the downside for cursedRowCol.
function applyCursedColBlackout(durationMs) {
    if (!cur) return;

    const cols = cur.grid[0].length;
    for (let c = 0; c < cols; c++) {
        document.querySelectorAll(`.cch-${c}`)
            .forEach(el => el.classList.add('clue-blackout'));
    }

    _startBlackoutCountdown('col', durationMs);

    setTimeout(() => {
        document.querySelectorAll('.clue-blackout')
            .forEach(el => el.classList.remove('clue-blackout'));
    }, durationMs);
}




//------------------------------------------------------------------------
//-------------------SHUFFLE HELPER---------------------------------------
//------------------------------------------------------------------------
// In-place Fisher-Yates shuffle.  Returns the same array for chaining.
//------------------------------------------------------------------------

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}




//------------------------------------------------------------------------
//-------------------BIAS SELECTION HELPERS--------------------------------
//------------------------------------------------------------------------
// Shared plumbing for revealTiles' Targeted Reveal bias and markWrongTiles'
// Dense Marker bias. Both features pick a "best" row/col (least-filled for
// Targeted Reveal, most-filled for Dense Marker) and narrow the candidate
// list to that row/col when their passive chance procs.
//------------------------------------------------------------------------

// Returns the index of the incomplete row that best matches the fill
// criterion. Pass wantMax=false for the least-filled row (Targeted Reveal),
// wantMax=true for the most-filled row (Dense Marker). Returns -1 when no
// incomplete row exists.
function _findUnsolvedRowByFill(sol, rows, wantMax) {
    let bestRow = -1;
    let bestFilled = wantMax ? -1 : Infinity;

    for (let r = 0; r < rows; r++) {
        const filled = sol[r].filter((v, c) => v === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c])).length;
        const total = sol[r].filter(v => v === 1).length;
        if (filled >= total) continue;
        if (wantMax ? filled > bestFilled : filled < bestFilled) {
            bestFilled = filled;
            bestRow = r;
        }
    }
    return bestRow;
}

// Column counterpart of _findUnsolvedRowByFill — see that function for the
// wantMax semantics.
function _findUnsolvedColByFill(sol, cols, wantMax) {
    let bestCol = -1;
    let bestFilled = wantMax ? -1 : Infinity;

    for (let c = 0; c < cols; c++) {
        const filled = sol.filter((row, r) => row[c] === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c])).length;
        const total = sol.filter(row => row[c] === 1).length;
        if (filled >= total) continue;
        if (wantMax ? filled > bestFilled : filled < bestFilled) {
            bestFilled = filled;
            bestCol = c;
        }
    }
    return bestCol;
}

// Narrows `cands` to cells in the given best row/col and shows `toastMsg`
// when that narrowing actually finds matches. Falls back to the original
// (unbiased) candidate list otherwise.
function _filterCandidatesByBias(cands, bestRow, bestCol, toastMsg) {
    const biased = cands.filter(([r, c]) => r === bestRow || c === bestCol);
    if (biased.length > 0) {
        showToast(toastMsg);
        return biased;
    }
    return cands;
}

// Attempts to narrow `cands` to cells in the least-filled unsolved row or
// column based on the cumulative Targeted Reveal passive chance.
function _applyTargetedRevealBias(cands, sol, rows, cols) {
    const chance = (ptHasSkill('targeted_reveal_1') ? 0.20 : 0)
        + (ptHasSkill('targeted_reveal_2') ? 0.20 : 0)
        + (ptHasSkill('targeted_reveal_3') ? 0.30 : 0);

    if (chance <= 0 || Math.random() >= chance || cands.length === 0) return cands;

    const bestRow = _findUnsolvedRowByFill(sol, rows, false);
    const bestCol = _findUnsolvedColByFill(sol, cols, false);
    return _filterCandidatesByBias(cands, bestRow, bestCol, 'Biased Reveal!');
}

// Attempts to narrow `cands` to cells in the densest unsolved row or
// column based on the Dense Marker passive chance.
function _applyDenseMarkerBias(cands, sol, rows, cols) {
    const chance = (ptHasSkill('dense_marker_1') ? 0.20 : 0)
        + (ptHasSkill('dense_marker_2') ? 0.20 : 0)
        + (ptHasSkill('dense_marker_3') ? 0.30 : 0);

    if (chance <= 0 || Math.random() >= chance || cands.length === 0) return cands;

    const bestRow = _findUnsolvedRowByFill(sol, rows, true);
    const bestCol = _findUnsolvedColByFill(sol, cols, true);
    return _filterCandidatesByBias(cands, bestRow, bestCol, 'Biased Mark!');
}




//------------------------------------------------------------------------
//-------------------REVEAL TILES-----------------------------------------
//------------------------------------------------------------------------
// Reveals `count` random unrevealed solution cells, applying optional
// passive biasing.  Blocked by keystone_ergodic_field and the Oracle.
//------------------------------------------------------------------------

function revealTiles(count) {
    // Ergodic Field (291) and The Oracle (300) disable all auto-reveals
    if (ptHasSkill('keystone_ergodic_field') || window._oracleActive) return;

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    // Collect every solution cell that has not yet been filled or revealed
    let cands = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 1 && userGrid[r][c] !== 1 && !revealedGrid[r][c]) {
                cands.push([r, c]);
            }
        }
    }

    // Optionally bias toward the least-filled unsolved row / column
    cands = _applyTargetedRevealBias(cands, sol, rows, cols);


    // Reveal up to `count` cells from the (shuffled) candidate list
    const affected = [];
    const revealedCoords = []; // Create an array to track selected tile coordinates
    shuffle(cands).slice(0, count).forEach(([r, c]) => {
        revealedGrid[r][c] = true;
        userGrid[r][c] = 1;
        renderCell(r, c);
        updClues(r, c);
        affected.push(`g-${r}-${c}`);

        // Push coordinates into tracker array
        revealedCoords.push({ row: r, col: c });
    });

    _applyCellEffect(affected, 'reveal');
    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
    trackAchStat('tilesRevealed', affected.length);
    checkWin();

    return revealedCoords; // Return the gathered coordinates
}




//------------------------------------------------------------------------
//-------------------MARK WRONG TILES-------------------------------------
//------------------------------------------------------------------------
// Marks `count` random empty non-solution cells as wrong (value 2),
// applying optional passive biasing.  Blocked by keystone_ergodic_field
// and the Oracle.  Returns an array of [row, col] coordinates that were
// marked, so callers can act on them if needed.
//------------------------------------------------------------------------

function markWrongTiles(count) {
    // Ergodic Field (291) and The Oracle (300) disable all auto-marks
    if (ptHasSkill('keystone_ergodic_field') || window._oracleActive) return;

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    // Collect empty non-solution cells that have not already been marked
    let cands = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const isEmptyCell = sol[r][c] === 0;
            const isUnmarked = userGrid[r][c] === 0 || userGrid[r][c] === 3;
            const notWrongAlready = !wrongGrid[r][c];
            if (isEmptyCell && isUnmarked && notWrongAlready) {
                cands.push([r, c]);
            }
        }
    }

    // Optionally bias toward the densest unsolved row / column
    cands = _applyDenseMarkerBias(cands, sol, rows, cols);

    // Mark up to `count` cells from the (shuffled) candidate list
    const affected = [];
    const markedCoords = [];
    shuffle(cands).slice(0, count).forEach(([r, c]) => {
        userGrid[r][c] = 2;
        systemMarkedGrid[r][c] = true;
        renderCell(r, c);
        affected.push(`g-${r}-${c}`);
        markedCoords.push([r, c]);
    });

    _applyCellEffect(affected, 'mark');
    trackAchStat('tilesMarkedWrong', affected.length);

    return markedCoords;
}




//------------------------------------------------------------------------
//-------------------SOLVE / UNSOLVE ROWS & COLS--------------------------
//------------------------------------------------------------------------
// solveRows / solveCols      — reveal complete rows / columns
// unsolveRows / unsolveCols  — erase filled cells in complete rows / cols
//                              (used internally; not called by cursed items)
// unsolveRowsExcluding /
// unsolveColsExcluding       — cursed-item variant that restricts erasure
//                              to rows / cols that were pre-filled before
//                              the item fired
//------------------------------------------------------------------------

// Helper: erases all correctly-filled cells in a single row and updates
// the DOM.  Returns an array of cell IDs for the visual erase effect.
function _eraseFilledCellsInRow(r, sol, cols) {
    const erased = [];
    for (let c = 0; c < cols; c++) {
        if (sol[r][c] === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c])) {
            userGrid[r][c] = 0;
            revealedGrid[r][c] = false;
            renderCell(r, c);
            updClues(r, c);
            erased.push(`g-${r}-${c}`);
        }
    }
    return erased;
}

// Helper: erases all correctly-filled cells in a single column and updates
// the DOM.  Returns an array of cell IDs for the visual erase effect.
function _eraseFilledCellsInCol(c, sol, rows) {
    const erased = [];
    for (let r = 0; r < rows; r++) {
        if (sol[r][c] === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c])) {
            userGrid[r][c] = 0;
            revealedGrid[r][c] = false;
            renderCell(r, c);
            updClues(r, c);
            erased.push(`g-${r}-${c}`);
        }
    }
    return erased;
}

// Fully reveals `count` random unsolved rows.
// Returns the number of rows actually revealed (may be less than count if
// fewer unsolved rows exist).
function solveRows(count) {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    // Collect every row that still has at least one unrevealed solution cell
    const unsolved = [];
    for (let r = 0; r < rows; r++) {
        const isDone = sol[r].every((v, c) => v === 0 || userGrid[r][c] === 1 || revealedGrid[r][c]);
        if (!isDone) unsolved.push(r);
    }

    shuffle(unsolved);
    const affected = [];

    unsolved.slice(0, count).forEach(r => {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 1 && userGrid[r][c] !== 1) {
                revealedGrid[r][c] = true;
                userGrid[r][c] = 1;
                renderCell(r, c);
                updClues(r, c);
                affected.push(`g-${r}-${c}`);
            }
        }
    });

    _applyCellEffect(affected, 'reveal');
    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
    return Math.min(count, unsolved.length);
}

// Fully reveals `count` random unsolved columns.
// Returns the number of columns actually revealed.
function solveCols(count) {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    // Collect every column that still has at least one unrevealed solution cell
    const unsolved = [];
    for (let c = 0; c < cols; c++) {
        const isDone = sol.every((row, r) => row[c] === 0 || userGrid[r][c] === 1 || revealedGrid[r][c]);
        if (!isDone) unsolved.push(c);
    }

    shuffle(unsolved);
    const affected = [];

    unsolved.slice(0, count).forEach(c => {
        for (let r = 0; r < rows; r++) {
            if (sol[r][c] === 1 && userGrid[r][c] !== 1) {
                revealedGrid[r][c] = true;
                userGrid[r][c] = 1;
                renderCell(r, c);
                updClues(r, c);
                affected.push(`g-${r}-${c}`);
            }
        }
    });

    _applyCellEffect(affected, 'reveal');
    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
    return Math.min(count, unsolved.length);
}

// Erases `count` random filled rows (player progress lost).
// Wrong marks are left untouched.
// Returns the number of rows actually erased.
function unsolveRows(count) {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    // Only target rows that have at least one filled correct cell to erase
    const candidates = [];
    for (let r = 0; r < rows; r++) {
        const hasFilled = sol[r].some((v, c) => v === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c]));
        if (hasFilled) candidates.push(r);
    }

    shuffle(candidates);
    const targets = candidates.slice(0, count);

    targets.forEach(r => _eraseFilledCellsInRow(r, sol, cols));

    if (targets.length > 0) questStat_rowsErased(targets.length);
    return targets.length;
}

// Erases `count` random filled columns (player progress lost).
// Wrong marks are left untouched.
// Returns the number of columns actually erased.
function unsolveCols(count) {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    const candidates = [];
    for (let c = 0; c < cols; c++) {
        const hasFilled = sol.some((row, r) => row[c] === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c]));
        if (hasFilled) candidates.push(c);
    }

    shuffle(candidates);
    const targets = candidates.slice(0, count);

    targets.forEach(c => _eraseFilledCellsInCol(c, sol, rows));

    if (targets.length > 0) questStat_rowsErased(targets.length);
    return targets.length;
}

// Cursed variant of unsolveRows: only erases rows whose index is present
// in `allowedSet` (the snapshot taken before the cursed benefit fired).
// Falls back to erasing any filled row if no pre-existing filled rows
// are in the set (i.e. the board was essentially blank before use).
// Returns the number of rows erased.
function unsolveRowsExcluding(count, allowedSet) {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    // Prefer rows that were already filled before this item was used
    let candidates = [];
    for (let r = 0; r < rows; r++) {
        if (!allowedSet.has(r)) continue;
        const hasFilled = sol[r].some((v, c) => v === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c]));
        if (hasFilled) candidates.push(r);
    }

    // Fallback: board was blank before use — erase any filled row
    if (!candidates.length) {
        for (let r = 0; r < rows; r++) {
            const hasFilled = sol[r].some((v, c) => v === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c]));
            if (hasFilled) candidates.push(r);
        }
    }

    shuffle(candidates);
    const targets = candidates.slice(0, count);
    const erasedCells = [];

    targets.forEach(r => {
        const cellIds = _eraseFilledCellsInRow(r, sol, cols);
        erasedCells.push(...cellIds);
    });

    // Red shimmer so the player clearly sees what was erased
    _applyCellEffect(erasedCells, 'erase');
    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
    if (targets.length > 0) questStat_rowsErased(targets.length);
    return targets.length;
}

// Cursed variant of unsolveCols: only erases columns whose index is
// present in `allowedSet`.  Same fallback behaviour as unsolveRowsExcluding.
// Returns the number of columns erased.
function unsolveColsExcluding(count, allowedSet) {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    let candidates = [];
    for (let c = 0; c < cols; c++) {
        if (!allowedSet.has(c)) continue;
        const hasFilled = sol.some((row, r) => row[c] === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c]));
        if (hasFilled) candidates.push(c);
    }

    // Fallback: board was blank before use — erase any filled column
    if (!candidates.length) {
        for (let c = 0; c < cols; c++) {
            const hasFilled = sol.some((row, r) => row[c] === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c]));
            if (hasFilled) candidates.push(c);
        }
    }

    shuffle(candidates);
    const targets = candidates.slice(0, count);
    const erasedCells = [];

    targets.forEach(c => {
        const cellIds = _eraseFilledCellsInCol(c, sol, rows);
        erasedCells.push(...cellIds);
    });

    // Red shimmer so the player clearly sees what was erased
    _applyCellEffect(erasedCells, 'erase');
    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
    if (targets.length > 0) questStat_rowsErased(targets.length);
    return targets.length;
}




//------------------------------------------------------------------------
//-------------------CURSED DOWNSIDE MODIFIER HELPERS--------------------
//------------------------------------------------------------------------
// These helpers centralise all passive / keystone interactions that
// modify or suppress cursed downsides.  Every cursed item handler calls
// them rather than duplicating the immunity / reduction logic.
//
// Precedence (checked in order):
//   1. window._cursedImmune     — full block (Witch / Cursed Ward)
//   2. keystone_curse_embrace   — full block (Curse Embrace keystone)
//   3. keystone_veil_of_purity  — block on first use, double on subsequent
//   4. dampened_curse_1/2/3     — percentage reduction of duration / count
//------------------------------------------------------------------------

// Returns the effective blackout duration (ms) for a cursed downside,
// after applying all passive reductions and immunity checks.
// Returns 0 when the downside should be fully suppressed.
function _cursedDownsideDuration(baseMs) {
    // Full immunity from The Witch or Cursed Ward
    if (window._cursedImmune) {
        questStat_curseBlocked();
        return 0;
    }

    // Curse Embrace keystone: cursed downsides are always suppressed
    if (ptHasSkill('keystone_curse_embrace')) {
        questStat_curseBlocked();
        return 0;
    }

    // Veil of Purity keystone: first use is immune; subsequent uses amplify
    if (ptHasSkill('keystone_veil_of_purity')) {
        if (!window._veiled_cursedUsed) {
            window._veiled_cursedUsed = true;
            showToast('Veil of Purity: Downside prevented!');
            questStat_curseBlocked();
            return 0;
        }
        // Veil is now broken — curse is doubled as punishment
        showToast('Veil of Purity broken! Curse amplified!');
        return Math.round(baseMs * 2);
    }

    // Dampened Curse passive nodes reduce duration by 10% / 10% / 15%
    let mult = 1.0;
    if (ptHasSkill('dampened_curse_1')) mult -= 0.10;
    if (ptHasSkill('dampened_curse_2')) mult -= 0.10;
    if (ptHasSkill('dampened_curse_3')) mult -= 0.15;
    return Math.round(baseMs * Math.max(0, mult));
}

// Returns the effective erase count for a cursed downside (rows / cols
// erased), applying the same immunity and reduction checks as duration.
function _cursedDownsideCount(baseCount) {
    // Full immunity from The Witch or Cursed Ward
    if (window._cursedImmune) {
        questStat_curseBlocked();
        return 0;
    }

    // Curse Embrace keystone: cursed downsides are always suppressed
    if (ptHasSkill('keystone_curse_embrace')) {
        questStat_curseBlocked();
        return 0;
    }

    // Veil of Purity keystone: same first-use / subsequent logic as duration.
    // Note: the flag is set inside _cursedDownsideDuration, so we only need
    // to read it here without toggling it a second time.
    if (ptHasSkill('keystone_veil_of_purity')) {
        if (!window._veiled_cursedUsed) {
            // First use immunity — toast / flag handled by the duration call
            questStat_curseBlocked();
            return 0;
        }
        // Veil broken — double the erase count
        showToast('Veil of Purity broken! Curse amplified!');
        return Math.round(baseCount * 2);
    }

    // Derive the count multiplier from the duration multiplier so the two
    // always stay in sync when Dampened Curse nodes are active.
    const durationMult = _cursedDownsideDuration(1000) / 1000;
    return Math.max(0, Math.floor(baseCount * durationMult));
}

// Returns true if the Blackout Ward passive nodes block a blackout effect
// this trigger.  Chance accumulates across all three invested nodes.
function _blackoutWardBlocks() {
    let chance = 0;
    if (ptHasSkill('blackout_ward_1')) chance += 0.30;
    if (ptHasSkill('blackout_ward_2')) chance += 0.10;
    if (ptHasSkill('blackout_ward_3')) chance += 0.20;
    return chance > 0 && Math.random() < chance;
}

// Returns true if the Removal Ward passive nodes block a row / col
// erasure effect this trigger.  Chance accumulates across all three nodes.
function _removalWardBlocks() {
    let chance = 0;
    if (ptHasSkill('removal_ward_1')) chance += 0.30;
    if (ptHasSkill('removal_ward_2')) chance += 0.10;
    if (ptHasSkill('removal_ward_3')) chance += 0.20;
    return chance > 0 && Math.random() < chance;
}

// Shared helper: applies a blackout downside (row and/or col) and shows a
// ward-protection toast when the blackout is blocked.  Pass booleans to
// select which axes to black out.
function _applyBlackoutDownside(dur, blackoutRows, blackoutCols) {
    if (dur <= 0) return;

    if (_blackoutWardBlocks()) {
        showToast(`🌑 ${LANG === 'de' ? 'Verdunklungs-Schutz! Hinweise geschützt.' : 'Blackout Ward! Clues protected.'}`);
        return;
    }

    if (blackoutRows) applyCursedRowBlackout(dur);
    if (blackoutCols) applyCursedColBlackout(dur);
}

// Shared helper: applies a row-erasure downside and shows a ward-
// protection toast when erasure is blocked.
// `preFilledSet` is the snapshot of filled rows taken before the item
// benefit fired so only pre-existing rows are targeted.
// Returns the number of rows actually erased.
function _applyRowErasureDownside(eraseCount, preFilledSet) {
    if (eraseCount <= 0) return 0;

    if (_removalWardBlocks()) {
        showToast(`🔒 ${LANG === 'de' ? 'Entfernungsschutz! Zeilen behalten.' : 'Removal Ward! Rows kept.'}`);
        return 0;
    }

    return unsolveRowsExcluding(eraseCount, preFilledSet);
}

// Shared helper: applies a column-erasure downside, with ward check.
// Returns the number of columns actually erased.
function _applyColErasureDownside(eraseCount, preFilledSet) {
    if (eraseCount <= 0) return 0;

    if (_removalWardBlocks()) {
        showToast(`🔒 ${LANG === 'de' ? 'Entfernungsschutz! Spalten behalten.' : 'Removal Ward! Columns kept.'}`);
        return 0;
    }

    return unsolveColsExcluding(eraseCount, preFilledSet);
}

// Convenience wrapper combining duration scaling + blackout application.
// Used by cursed items whose downside is a clue blackout (cursedTime,
// cursedShield, cursedRowCol) so each handler doesn't repeat the pair.
function _resolveCursedBlackoutDownside(baseMs, blackoutRows, blackoutCols) {
    const dur = _cursedDownsideDuration(baseMs);
    _applyBlackoutDownside(dur, blackoutRows, blackoutCols);
}

// Convenience wrapper combining count scaling + row-erasure application.
// Used by cursedRowSolve. Returns the number of rows erased.
function _resolveCursedRowErasureDownside(baseCount, preFilledSet) {
    const eraseCount = _cursedDownsideCount(baseCount);
    return _applyRowErasureDownside(eraseCount, preFilledSet);
}

// Convenience wrapper combining count scaling + col-erasure application.
// Used by cursedColSolve. Returns the number of columns erased.
function _resolveCursedColErasureDownside(baseCount, preFilledSet) {
    const eraseCount = _cursedDownsideCount(baseCount);
    return _applyColErasureDownside(eraseCount, preFilledSet);
}




//------------------------------------------------------------------------
//-------------------ITEM EFFECT COUNT / MULTIPLIER HELPERS--------------
//------------------------------------------------------------------------
// Centralised helpers that compute the final count or multiplier for
// an item's positive effect, factoring in all relevant keystones and
// passive nodes.  Each handler calls the appropriate helper instead of
// repeating the keystone chain.
//------------------------------------------------------------------------

// Returns the final reveal count for a reveal item, including all passive
// and keystone bonuses / penalties.
function _calcRevealCount(baseCount) {
    let count = baseCount;

    // Passive: Stronger Light — +1 per node
    count += (ptHasSkill('stronger_light_1') ? 1 : 0)
        + (ptHasSkill('stronger_light_2') ? 1 : 0)
        + (ptHasSkill('stronger_light_3') ? 1 : 0);

    // Keystone: Blinding Truth — 50% more reveals (rounds up)
    if (ptHasSkill('keystone_blinding_truth')) count = Math.ceil(count * 1.5);

    // Keystone: Countdown Crisis — ×5 when timer is under 3 minutes
    if (ptHasSkill('keystone_countdown_crisis') && timerSecs < 180) count *= 5;

    // Keystone: Curse Embrace — non-cursed items are 50% weaker
    if (ptHasSkill('keystone_curse_embrace')) count = Math.max(1, Math.floor(count * 0.5));

    // Keystone: Iron Doctrine — non-cursed items at 300% effectiveness
    if (ptHasSkill('keystone_iron_doctrine')) count = Math.ceil(count * 3);

    return count;
}

// Returns the final mark-wrong count for a markWrong item.
function _calcMarkWrongCount(baseCount) {
    let count = baseCount;

    // Passive: Stronger Marks — +1 per node
    count += (ptHasSkill('stronger_marks_1') ? 1 : 0)
        + (ptHasSkill('stronger_marks_2') ? 1 : 0)
        + (ptHasSkill('stronger_marks_3') ? 1 : 0);

    // Keystone: Curse Embrace — 50% weaker
    if (ptHasSkill('keystone_curse_embrace')) count = Math.max(1, Math.floor(count * 0.5));

    // Keystone: Iron Doctrine — 300% effectiveness
    if (ptHasSkill('keystone_iron_doctrine')) count = Math.ceil(count * 3);

    return count;
}

// Returns the final time addition (seconds) for an addTime item.
// Also handles the Countdown Crisis inversion (caller checks and acts on
// the negative case).
function _calcAddTimeSecs(baseSecs) {
    let multiplier = 1.0;

    // Passive: Extended Hour — each node adds 10% / 15% / 10%
    if (ptHasSkill('extended_hour_1')) multiplier += 0.10;
    if (ptHasSkill('extended_hour_2')) multiplier += 0.15;
    if (ptHasSkill('extended_hour_3')) multiplier += 0.10;

    // Keystone: Golden Clock — timer items are 100% more effective while active
    if (window._goldenClockActive) multiplier += 1.0;

    // Keystone: Iron Doctrine — 300% effectiveness
    if (ptHasSkill('keystone_iron_doctrine')) multiplier += 3.0;

    // Keystone: Curse Embrace — 50% weaker
    if (ptHasSkill('keystone_curse_embrace')) multiplier *= 0.5;

    return Math.round(baseSecs * multiplier);
}

// Returns the final mistake-reduction count for a mistakeEraser item.
// Pass isEraseAll=true for mistakeEraserAll (bypasses most modifiers since
// it always clears the full current count).
function _calcMistakeEraserCount(baseCount, isEraseAll) {
    if (isEraseAll) return baseCount; // eraseAll ignores all modifiers

    let count = baseCount;

    // Passive: Scholarly Aid — +1 per node
    count += (ptHasSkill('scholarly_aid_1') ? 1 : 0)
        + (ptHasSkill('scholarly_aid_2') ? 1 : 0)
        + (ptHasSkill('scholarly_aid_3') ? 1 : 0);

    // Keystone: Iron Doctrine — 300% effectiveness
    if (ptHasSkill('keystone_iron_doctrine')) count = Math.ceil(count * 3);

    // Keystone: Curse Embrace — 50% weaker
    if (ptHasSkill('keystone_curse_embrace')) count = Math.max(1, Math.floor(count * 0.5));

    return count;
}




//------------------------------------------------------------------------
//-------------------ITEM HANDLERS — STANDARD ITEMS----------------------
//------------------------------------------------------------------------
// One handler per item (or item family).  Each function:
//   1. Applies passive / keystone modifier scaling
//   2. Executes the item effect
//   3. Plays the item sound
//   4. Returns a localised result string for the toast
//------------------------------------------------------------------------

// reveal1 / reveal2 / reveal3 / reveal4 — reveals N random solution cells.
function _useReveal(id, def) {
    questStat_revealItemUsed();

    const baseCount = parseInt(id.replace('reveal', '')) || 1;
    const finalCount = _calcRevealCount(baseCount);

    revealTiles(finalCount);
    playItemEffect(id);

    const msgKey = finalCount > 1 ? 'item_revealed_pl' : 'item_revealed';
    return `${def.icon} ${t(msgKey).replace('{n}', finalCount)}`;
}

// rowSolve — fully reveals one random unsolved row.
function _useRowSolve(id, def) {
    const n = solveRows(1);
    playItemEffect(id);
    if (n > 0) checkWin();
    return n > 0
        ? `${def.icon} ${t('item_row_solved')}`
        : `${def.icon} ${t('item_row_solved_none')}`;
}

// colSolve — fully reveals one random unsolved column.
function _useColSolve(id, def) {
    const n = solveCols(1);
    playItemEffect(id);
    if (n > 0) checkWin();
    return n > 0
        ? `${def.icon} ${t('item_col_solved')}`
        : `${def.icon} ${t('item_col_solved_none')}`;
}

// scoutPrimer — marks the next puzzle start so a reveal fires immediately.
function _useScoutPrimer(id, def) {
    STATE.primerPending = true;
    save();
    playItemEffect(id);
    return `📜 ${t('item_primer_activated')}`;
}

// artifactComplete (Codex of Completion) — reveals every remaining cell.
function _useArtifactComplete(id, def) {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 1 && userGrid[r][c] !== 1) {
                revealedGrid[r][c] = true;
                userGrid[r][c] = 1;
                renderCell(r, c);
                updClues(r, c);
            }
        }
    }

    playItemEffect(id);
    checkWin();
    return `🌟 ${t('item_artifact_complete')}`;
}

// markWrong2 / markWrong4 / etc. — marks N random empty non-solution cells.
function _useMarkWrong(id, def) {
    // Blinding Truth keystone blocks all mark-wrong items entirely
    if (ptHasSkill('keystone_blinding_truth')) {
        return `${def.icon} ${LANG === 'de' ? 'Blockiert durch Blendende Wahrheit!' : 'Blocked by Blinding Truth!'}`;
    }

    const baseCount = parseInt(id.replace('markWrong', '')) || 2;
    const finalCount = _calcMarkWrongCount(baseCount);

    markWrongTiles(finalCount);
    playItemEffect(id);
    return `${def.icon} ${t('item_marked').replace('{n}', finalCount)}`;
}

// addTime30 / addTime60 / addTime180 — adds seconds to the timer.
function _useAddTime(id, def) {
    // Gambler's Ruin keystone disables all bonus time from non-cursed sources
    if (ptHasSkill('keystone_gamblers_ruin')) {
        return `${def.icon} ${LANG === 'de' ? 'Blockiert durch Ruin des Spielers!' : "Blocked by Gambler's Ruin!"}`;
    }

    const baseSecs = parseInt(id.replace('addTime', '')) || 30;
    const secs = _calcAddTimeSecs(baseSecs);

    // Countdown Crisis keystone inverts the effect — time is subtracted
    if (ptHasSkill('keystone_countdown_crisis')) {
        questStat_timerItemUsed();
        timerSecs = Math.max(0, timerSecs - secs);
        updTimer();
        playItemEffect(id);
        return `${def.icon} ${LANG === 'de' ? `−${secs}s (Countdown-Krise!)` : `−${secs}s (Countdown Crisis!)`}`;
    }

    questStat_timerItemUsed();
    timerSecs += secs;
    updTimer();
    playItemEffect(id);
    return `${def.icon} ${t('item_time_added').replace('{n}', secs)}`;
}

// shield — activates the damage shield, optionally adding extra charges
// and a cursed-immunity window from passive nodes.
function _useShield(id, def) {
    // Several keystones block shield items entirely
    if (ptHasSkill('keystone_iron_doctrine')) {
        return `${def.icon} ${LANG === 'de' ? 'Blockiert durch Eiserne Doktrin!' : 'Blocked by Iron Doctrine!'}`;
    }
    if (ptHasSkill('keystone_null_hypothesis')) {
        return `${def.icon} ${LANG === 'de' ? 'Blockiert durch Nullhypothese!' : 'Blocked by Null Hypothesis!'}`;
    }
    if (ptHasSkill('keystone_asymptotic_mastery')) {
        return `${def.icon} ${LANG === 'de' ? 'Blockiert durch Asymptotische Meisterschaft!' : 'Blocked by Asymptotic Mastery!'}`;
    }

    shieldActive = true;

    // Passive: Reinforced Ward — each node adds 1 extra absorbed mistake
    const extraCharges = (ptHasSkill('reinforced_ward_1') ? 1 : 0)
        + (ptHasSkill('reinforced_ward_2') ? 1 : 0)
        + (ptHasSkill('reinforced_ward_3') ? 1 : 0);
    // Stored on the window so the mistake handler can consume them
    window._shieldExtraCharges = (window._shieldExtraCharges || 0) + extraCharges;

    // Passive: Cursed Ward — each node grants 5 s of cursed immunity (max 15 s)
    const cursedImmunitySecs = (ptHasSkill('cursed_ward_1') ? 5 : 0)
        + (ptHasSkill('cursed_ward_2') ? 5 : 0)
        + (ptHasSkill('cursed_ward_3') ? 5 : 0);
    if (cursedImmunitySecs > 0) {
        window._cursedImmune = true;
        setTimeout(() => { window._cursedImmune = false; }, cursedImmunitySecs * 1000);
        showToast('Warded against curses!');
    }

    playItemEffect(id);
    return `${def.icon} ${t('item_shield_msg')}`;
}

// mistakeEraser / mistakeEraser4 / mistakeEraser6 / mistakeEraserAll —
// reduces the current mistake count, optionally granting bonus time via
// the Time Well Spent passive.
function _useMistakeEraser(id, def) {
    if (mistakeCount === 0) {
        showToast(LANG === 'de' ? 'Keine Fehler zum Entfernen!' : 'No mistakes to erase!');
        return null; // Return null to signal no effect/no consumption
    }

    const isEraseAll = id === 'mistakeEraserAll';
    const baseCount = isEraseAll ? mistakeCount : (parseInt(id.replace('mistakeEraser', '')) || 2);
    const reduceBy = _calcMistakeEraserCount(baseCount, isEraseAll);

    const before = mistakeCount;
    mistakeCount = Math.max(0, mistakeCount - reduceBy);
    playItemEffect(id);
    const removed = before - mistakeCount;

    if (removed > 0) questStat_mistakesRemoved(removed);

    // Passive: Time Well Spent — bonus time per mistake removed
    if (removed > 0 && !ptHasSkill('keystone_gamblers_ruin')) {
        let bonusSecs = 0;
        if (ptHasSkill('time_well_spent_1')) bonusSecs = 30;
        if (ptHasSkill('time_well_spent_2')) bonusSecs = 60;
        if (ptHasSkill('time_well_spent_3')) bonusSecs = 90;
        if (bonusSecs > 0) {
            timerSecs += bonusSecs * removed;
            updTimer();
        }
    }

    const mcEl = document.getElementById('mistake-counter');
    if (mcEl) mcEl.textContent = `✗ ${mistakeCount}`;

    return removed > 0
        ? `${def.icon} ${t('item_mistake_erased').replace('{n}', removed)}`
        : `${def.icon} ${t('item_mistake_erased_none')}`;
}

// freeze — freezes the timer for 2 s and activates a temporary shield.
function _useFreeze(id, def) {
    const FREEZE_DURATION_MS = 2000;

    timerFrozen = true;
    window._freezeActive = true;
    // Null Hypothesis keystone skips the shield grant
    if (!ptHasSkill('keystone_null_hypothesis')) shieldActive = true;
    updTimer();
    playItemEffect(id);

    // Track clutch freezes (used with ≤ 10 s remaining)
    if (timerSecs <= 10) trackAchStat('freezeClutches');

    // Countdown ticker shown in the timer element
    let remaining = 2;
    const freezeTick = setInterval(() => {
        remaining--;
        const el = document.getElementById('timer-val');
        if (el) el.textContent = `❄️ ${remaining}s`;
        if (remaining <= 0) clearInterval(freezeTick);
    }, 1000);

    setTimeout(() => {
        timerFrozen = false;
        window._freezeActive = false;
        shieldActive = false;
        clearInterval(freezeTick);
        updTimer();
        showToast(t('item_freeze_ended'));
    }, FREEZE_DURATION_MS);

    return `${def.icon} ${t('item_freeze_msg')}`;
}




//------------------------------------------------------------------------
//-------------------ITEM HANDLERS — CURSED ITEMS------------------------
//------------------------------------------------------------------------
// Cursed items have both a strong upside and a downside.  Every handler
// here calls _trackWitchImmuneCursedUse() first, then applies the upside,
// and finally resolves the downside through the shared helpers so all
// ward / immunity / dampening logic stays in one place.
//------------------------------------------------------------------------

// cursedTime — adds 20 min to the timer; downside blacks out all clues.
function _useCursedTime(id, def) {
    _trackWitchImmuneCursedUse();

    timerSecs += 1200;
    updTimer();
    playItemEffect(id);

    _resolveCursedBlackoutDownside(30000, true, true); // black out both rows and cols

    return `💀 ${t('item_cursed_time_both')}`;
}

// cursedShield — activates shield and reveals 2 cells; downside blacks out row clues.
function _useCursedShield(id, def) {
    _trackWitchImmuneCursedUse();

    shieldActive = true;
    revealTiles(2);
    playItemEffect(id);

    _resolveCursedBlackoutDownside(30000, true, false); // black out rows only

    return `👁️ ${t('item_cursed_shield_both')}`;
}

// cursedRowSolve — solves 3 rows; downside erases 1 pre-existing row.
function _useCursedRowSolve(id, def) {
    _trackWitchImmuneCursedUse();

    const preFilledRows = _getPreFilledRows();
    const revealed = solveRows(3);
    const erased = _resolveCursedRowErasureDownside(1, preFilledRows);

    playItemEffect(id);
    if (revealed > 0) checkWin();
    return `🌊 ${t('item_cursed_row_both').replace('{r}', revealed).replace('{e}', erased)}`;
}

// cursedColSolve — solves 3 columns; downside erases 1 pre-existing column.
function _useCursedColSolve(id, def) {
    _trackWitchImmuneCursedUse();

    const preFilledCols = _getPreFilledCols();
    const revealed = solveCols(3);
    const erased = _resolveCursedColErasureDownside(1, preFilledCols);

    playItemEffect(id);
    if (revealed > 0) checkWin();
    return `🌪️ ${t('item_cursed_col_both').replace('{r}', revealed).replace('{e}', erased)}`;
}

// cursedRowCol — solves 4 rows and 4 cols; downside blacks out column clues.
function _useCursedRowCol(id, def) {
    _trackWitchImmuneCursedUse();

    const rowsRevealed = solveRows(4);
    const colsRevealed = solveCols(4);

    _resolveCursedBlackoutDownside(45000, false, true); // black out cols only

    playItemEffect(id);
    checkWin();
    return `💥 ${t('item_cursed_rowcol_both').replace('{r}', rowsRevealed).replace('{c}', colsRevealed)}`;
}

// cursedReveal — reveals 6 cells; downside clears all wrong marks.
function _useCursedReveal(id, def) {
    _trackWitchImmuneCursedUse();

    revealTiles(6);

    // When immune the marks are protected — early-out with a safe message
    if (window._cursedImmune || ptHasSkill('keystone_curse_embrace')) {
        playItemEffect(id);
        return `☠️ ${LANG === 'de' ? 'Enthüllt 6 Zellen (Markierungen geschützt)!' : '6 cells revealed (marks protected)!'}`;
    }

    // Downside: clear every wrong mark the player has placed
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const unmarked = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (userGrid[r][c] === 2) {
                userGrid[r][c] = 0;
                renderCell(r, c);
                unmarked.push(`g-${r}-${c}`);
            }
        }
    }
    _applyCellEffect(unmarked, 'unmark');

    playItemEffect(id);
    return `☠️ ${t('item_cursed_reveal_both')}`;
}




//------------------------------------------------------------------------
//-------------------ITEM HANDLERS — PEARL ITEMS-------------------------
//------------------------------------------------------------------------
// Pearl items reset class skill cooldowns so they are ready to use again
// almost immediately.
//------------------------------------------------------------------------

// Helper: resets a single cooldown slot to 1 s remaining.
function _resetCooldownSlot(slot) {
    const cd = cooldownState[slot];
    if (cd.interval) {
        clearInterval(cd.interval);
        cd.interval = null;
    }
    cd.remaining = 1;
    startSlotCooldown(slot, 1);
}

// pearlOfHaste — resets the cooldown of active skill slot 1.
function _usePearlOfHaste(id, def) {
    if (!STATE.playerClass) return `${def.icon} No class equipped!`;
    _resetCooldownSlot('active1');
    playItemEffect(id);
    return `${def.icon} ${LANG === 'de' ? 'Abklingzeit 1 auf 1s reduziert!' : 'Skill 1 cooldown set to 1s!'}`;
}

// pearlOfSwiftness — resets the cooldown of active skill slot 2.
function _usePearlOfSwiftness(id, def) {
    if (!STATE.playerClass) return `${def.icon} No class equipped!`;
    _resetCooldownSlot('active2');
    playItemEffect(id);
    return `${def.icon} ${LANG === 'de' ? 'Abklingzeit 2 auf 1s reduziert!' : 'Skill 2 cooldown set to 1s!'}`;
}

// grandPearl — resets the cooldowns of both active skill slots.
function _useGrandPearl(id, def) {
    if (!STATE.playerClass) return `${def.icon} No class equipped!`;
    _resetCooldownSlot('active1');
    _resetCooldownSlot('active2');
    playItemEffect(id);
    return `${def.icon} ${LANG === 'de' ? 'Beide Abklingzeiten auf 1s reduziert!' : 'Both skill cooldowns set to 1s!'}`;
}




//------------------------------------------------------------------------
//-------------------ITEM HANDLERS — SPECIAL ITEMS-----------------------
//------------------------------------------------------------------------

// theWitch — pays −10 min upfront in exchange for 60 s of full cursed
// immunity (makes subsequent cursed items downside-free for that window).
function _useTheWitch(id, def) {
    timerSecs = Math.max(0, timerSecs - 600);
    updTimer();

    window._cursedImmune = true;
    playItemEffect(id);
    showToast(`🧙 ${LANG === 'de' ? 'Verfluchter Schutz für 60s! −10 Min.' : 'Cursed immunity 60s! −10 min.'}`);

    setTimeout(() => {
        window._cursedImmune = false;
        showToast(`🧙 ${LANG === 'de' ? 'Hexenschutz endet.' : 'Witch immunity faded.'}`);
    }, 60000);

    return ''; // toast was already shown above
}

// goldenClock — halts the timer until 3 more mistakes are made.
function _useGoldenClock(id, def) {
    window._goldenClockActive = true;
    window._goldenClockMistakesLeft = 3;
    playItemEffect(id);

    // Update the mistake display so the player immediately sees the limit
    const mcEl = document.getElementById('mistake-counter');
    if (mcEl) mcEl.textContent = `✗ ${mistakeCount} 🕰️`;

    return `${def.icon} ${LANG === 'de' ? 'Timer angehalten! Noch 3 Fehler erlaubt.' : 'Timer halted! 3 mistakes remaining.'}`;
}

// shadowSeal — sets the timer to exactly 5 min, permanently hides all
// clues for the rest of the level, and mass-marks 75 % of empty cells.
function _useShadowSeal(id, def) {
    questStat_shadowSealUsed();
    if (!cur) return '';

    // 1. Hard-set the timer to exactly 5 minutes
    timerSecs = 300;
    updTimer();

    // 2. Permanently hide all row and column clues for this level
    window._shadowSealActive = true;
    document.querySelectorAll('.row-clue, .col-clue, [class*="rct-"], [class*="cch-"]')
        .forEach(el => el.classList.add('clue-blackout'));

    // 3. Mark 75% of all empty non-solution cells as wrong
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    const cands = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 0 && (userGrid[r][c] === 0 || userGrid[r][c] === 3) && !wrongGrid?.[r]?.[c]) {
                cands.push([r, c]);
            }
        }
    }

    const markCount = Math.floor(cands.length * 0.75);
    shuffle(cands);
    const affected = [];
    cands.slice(0, markCount).forEach(([r, c]) => {
        userGrid[r][c] = 2;
        systemMarkedGrid[r][c] = true;
        renderCell(r, c);
        affected.push(`g-${r}-${c}`);
    });
    _applyCellEffect(affected, 'mark');

    playItemEffect(id);
    return `${def.icon} ${LANG === 'de'
        ? `Schattensiegel! Hinweise versteckt, ${markCount} Felder markiert.`
        : `Shadow Seal! Clues hidden, ${markCount} tiles marked.`}`;
}




//------------------------------------------------------------------------
//-------------------ITEM EFFECT DISPATCH TABLE---------------------------
//------------------------------------------------------------------------
// Maps item id strings to their handler functions.
//
// ITEM_PREFIX_HANDLERS is checked first — it covers item families whose
// ids are generated dynamically (reveal1–4, markWrong2–8, addTime30–180).
// ITEM_EFFECT_HANDLERS covers every exact item id.
//------------------------------------------------------------------------

// Prefix-matched handler entries.  Each entry has:
//   prefix  — id must start with this string
//   handler — the function to call
//   exclude — exact ids that share the prefix but must NOT use this handler
const ITEM_PREFIX_HANDLERS = [
    { prefix: 'reveal', handler: _useReveal, exclude: ['cursedReveal'] },
    { prefix: 'markWrong', handler: _useMarkWrong, exclude: [] },
    { prefix: 'addTime', handler: _useAddTime, exclude: [] },
];

// Exact-id handler table.
const ITEM_EFFECT_HANDLERS = {
    freeze: _useFreeze,
    shield: _useShield,
    rowSolve: _useRowSolve,
    colSolve: _useColSolve,
    mistakeEraser: _useMistakeEraser,
    mistakeEraser4: _useMistakeEraser,
    mistakeEraser6: _useMistakeEraser,
    mistakeEraserAll: _useMistakeEraser,
    artifactComplete: _useArtifactComplete,
    scoutPrimer: _useScoutPrimer,
    cursedReveal: _useCursedReveal,
    cursedTime: _useCursedTime,
    cursedShield: _useCursedShield,
    cursedRowSolve: _useCursedRowSolve,
    cursedColSolve: _useCursedColSolve,
    cursedRowCol: _useCursedRowCol,
    pearlOfHaste: _usePearlOfHaste,
    pearlOfSwiftness: _usePearlOfSwiftness,
    grandPearl: _useGrandPearl,
    theWitch: _useTheWitch,
    goldenClock: _useGoldenClock,
    shadowSeal: _useShadowSeal,
};

// Routes an item id to the correct handler, trying prefix matches first.
// Returns the localised result string (used as the toast message).
function _dispatchItemEffect(id, def) {
    for (const { prefix, handler, exclude } of ITEM_PREFIX_HANDLERS) {
        if (id.startsWith(prefix) && !exclude.includes(id)) {
            return handler(id, def);
        }
    }

    const handler = ITEM_EFFECT_HANDLERS[id];
    if (handler) return handler(id, def);

    return ''; // unknown item id — no effect
}




//------------------------------------------------------------------------
//-------------------ACHIEVEMENT TRACKING---------------------------------
//------------------------------------------------------------------------
// Fires all achievement and quest-stat updates that should trigger
// whenever a specific item is used.  Called once per item use, after the
// effect has already been dispatched.
//------------------------------------------------------------------------

// Checks whether `id` is any variant of the mistakeEraser item.
function _isMistakeEraserItem(id) {
    return id === 'mistakeEraser'
        || id === 'mistakeEraser4'
        || id === 'mistakeEraser6'
        || id === 'mistakeEraserAll';
}

// Fires all relevant achievement and quest-stat calls for the used item.
function _trackItemAchievements(id, def) {
    // Universal — every item use
    trackAchStat('itemsUsed');
    if (def.rarity === 'cursed') trackAchStat('cursedItemsUsed');

    // Per-item-type achievements
    if (id === 'shield') trackAchStat('shieldsUsed');
    if (id === 'artifactComplete') trackAchStat('artifactUsed');
    if (id === 'freeze') trackAchStat('freezeUsed');
    if (_isMistakeEraserItem(id)) trackAchStat('eraserUsed');
    if (id === 'cursedReveal') trackAchStat('cursedLensUsed');
    if (id === 'cursedTime') trackAchStat('cursedClockUsed');
    if (id === 'cursedShield') trackAchStat('demonEyeUsed');
    if (id === 'cursedRowSolve') trackAchStat('tidalWaveUsed');
    if (id === 'cursedColSolve') trackAchStat('vortexUsed');
    if (id === 'cursedRowCol') trackAchStat('chaosGridUsed');
    if (id === 'scoutPrimer') trackAchStat('scoutPrimerUsed');
    if (id === 'rowSolve' || id === 'colSolve') trackAchStat('rowColSolved');
    if (id === 'pearlOfHaste' || id === 'pearlOfSwiftness' || id === 'grandPearl') trackAchStat('pearlsUsed');
    if (id === 'theWitch') trackAchStat('witchUsed');
    if (id === 'goldenClock') trackAchStat('goldenClockUsed');
    if (id === 'shadowSeal') trackAchStat('shadowSealUsed');

    // Time-added tracking (addTime items and cursedTime both add time)
    if (id.startsWith('addTime')) {
        const secs = parseInt(id.replace('addTime', '')) || 0;
        if (secs > 0) trackAchStat('timeAdded', secs);
    }
    if (id === 'cursedTime') trackAchStat('timeAdded', 1200);

    // Multi-item-use achievement
    if (itemsUsedThisLevel >= 3) trackAchStat('threeItemsOneLevelCount');

    // Cursed items used on a first-attempt level
    if (def.rarity === 'cursed' && !STATE.done.includes(cur.gIdx)) {
        trackAchStat('cursedFirstAttempts');
    }
}




//------------------------------------------------------------------------
//-------------------FRUGAL USE HELPER------------------------------------
//------------------------------------------------------------------------
// Computes the total Frugal Use chance from passive nodes.  When it
// triggers the item is used but not removed from the inventory.
//------------------------------------------------------------------------

// Returns the cumulative Frugal Use proc chance (0.0 – 0.17).
function _getFrugalUseChance() {
    return (ptHasSkill('frugal_use_1') ? 0.05 : 0)
        + (ptHasSkill('frugal_use_2') ? 0.05 : 0)
        + (ptHasSkill('frugal_use_3') ? 0.07 : 0);
}




//------------------------------------------------------------------------
//-------------------CONSUME ITEM-----------------------------------------
//------------------------------------------------------------------------
// Handles all post-effect bookkeeping: removes the item from inventory
// (unless Frugal Use procs), increments the use counter, fires tracking,
// saves state, shows the result toast, and rebuilds the inventory panel.
//------------------------------------------------------------------------

function _consumeItem(idx, def, msg) {
    // Only null means "no effect, don't consume". '' means an effect
    // happened but the item's own handler already showed its toast.
    if (msg === null) return;

    // Character banter: react to the item that was just used.
    if (typeof triggerBanter === 'function') {
        triggerBanter(def.rarity === 'cursed' ? 'item_used_cursed' : 'item_used_generic');
    }

    const frugalChance = _getFrugalUseChance();

    if (frugalChance > 0 && Math.random() < frugalChance) {
        // Frugal Use proc — the item is NOT removed from inventory
        itemsUsedThisLevel++;
        _trackItemAchievements(def.id, def);
        updateQuestStats('itemUsed', { defId: def.id, rarity: def.rarity });
        save();
        if (msg) showToast(msg + (LANG === 'de' ? ' ♻ Nicht verbraucht!' : ' ♻ Not consumed!'));
        buildInventoryPanel();
        return;
    }

    // Normal path — remove item, track, save, toast
    STATE.inventory.splice(idx, 1);
    itemsUsedThisLevel++;
    _trackItemAchievements(def.id, def);
    updateQuestStats('itemUsed', { defId: def.id, rarity: def.rarity });
    save();
    if (msg) showToast(msg);
    buildInventoryPanel();
}




//------------------------------------------------------------------------
//-------------------USE ITEM — PUBLIC ENTRY POINT-----------------------
//------------------------------------------------------------------------
// Called by the UI when the player taps/clicks an inventory item.
// Validates the game state, looks up the item and its definition,
// dispatches the effect, then consumes (or conditionally retains) the item.
//------------------------------------------------------------------------

function useItem(uid) {
    // Items are disabled in dead state and Ironman mode
    if (dead || curMods.ironman) return;

    const idx = STATE.inventory.findIndex(i => i.uid === uid);
    if (idx < 0) return;

    const item = STATE.inventory[idx];
    const def = ITEM_DEFS[item.defId];
    if (!def) return;

    const msg = _dispatchItemEffect(def.id, def);

    _consumeItem(idx, def, msg);
}