//------------------------------------------------------------------------
//-------------------SHARED — PUZZLE HELPERS----------------------
//------------------------------------------------------------------------

// Fisher-Yates shuffle, bias-selection plumbing (Targeted Reveal /
// Dense Marker passives) and grid snapshot helpers (pre-filled rows
// and cols) — used by several puzzle item files.

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}


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
    return _filterCandidatesByBias(cands, bestRow, bestCol, t('itm_biased_reveal'));
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
    return _filterCandidatesByBias(cands, bestRow, bestCol, t('itm_biased_mark'));
}


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
