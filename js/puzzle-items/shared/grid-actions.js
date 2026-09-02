//------------------------------------------------------------------------
//-------------------SHARED — GRID ACTIONS----------------------
//------------------------------------------------------------------------

// Core grid manipulation primitives shared by item handlers, class
// abilities, passives and the penalty system.

function revealTiles(count, source) {
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

    _applyCellEffect(affected, 'reveal', source);
    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
    trackAchStat('tilesRevealed', affected.length);
    if (affected.length > 0) _incDirect('lifetimeTilesRevealed', affected.length); 
    checkWin();

    return revealedCoords; // Return the gathered coordinates
}


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
function solveRows(count, source) {
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
    _incDirect('lifetimeTilesRevealed', affected.length);
    _applyCellEffect(affected, 'reveal', source);
    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
    return Math.min(count, unsolved.length);
}


// Fully reveals `count` random unsolved columns.
// Returns the number of columns actually revealed.
function solveCols(count, source) {
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
    _incDirect('lifetimeTilesRevealed', affected.length);
    _applyCellEffect(affected, 'reveal', source);
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
