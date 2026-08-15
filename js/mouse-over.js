// mouse-over.js
// Handles all mouse interaction with the nonogram grid:
//   - crosshair highlight when hovering over a cell
//   - drag-painting strokes across multiple cells
//   - drag-counter overlays shown during a stroke


//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// True while the player holds the mouse button and drags across cells.
let painting = false;

// The row/column index of the cell currently under the cursor.
// Both are -1 when the cursor is outside the grid.
let hoverRow = -1;
let hoverCol = -1;


//------------------------------------------------------------------------
//-------------------CROSSHAIR HIGHLIGHT - HELPERS------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Turns the row-clue highlight on/off for every clue cell that belongs to this row.
function _setRowClueHighlight(row, on) {
    document.querySelectorAll(`.rct-${row}`)
        .forEach(el => el.classList.toggle('hov-row', on));
}

// Turns the column-header highlight on/off for every header cell that belongs
// to this column. (A column can have multiple stacked header cells for
// multi-number clues.)
function _setColClueHighlight(col, on) {
    document.querySelectorAll(`.cch-${col}`)
        .forEach(el => el.classList.toggle('hov-col', on));
}

// Turns the row-tint on/off for every grid cell in the given row.
function _setRowCellsHighlight(row, on) {
    const cols = cur.grid[0].length;
    for (let c = 0; c < cols; c++) {
        const cell = document.getElementById(`g-${row}-${c}`);
        if (cell) cell.classList.toggle('hov-r', on);
    }
}

// Turns the column-tint on/off for every grid cell in the given column.
function _setColCellsHighlight(col, on) {
    const rows = cur.grid.length;
    for (let r = 0; r < rows; r++) {
        const cell = document.getElementById(`g-${r}-${col}`);
        if (cell) cell.classList.toggle('hov-c', on);
    }
}


//------------------------------------------------------------------------
//-------------------CROSSHAIR HIGHLIGHT - MAIN---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// applyHover — draws the crosshair highlight on the row and column
//   that pass through (row, col): tints the clue cells and all grid cells
//   along both axes.
function applyHover(row, col) {
    if (!cur) return;
    _setRowClueHighlight(row, true);
    _setColClueHighlight(col, true);
    _setRowCellsHighlight(row, true);
    _setColCellsHighlight(col, true);
}

// clearHover — removes the crosshair highlight from the row and column
//   that were previously highlighted.
//   Early-exits if nothing is currently hovered or there is no active puzzle.
function clearHover() {
    if (hoverRow < 0 || !cur) return;
    _setRowClueHighlight(hoverRow, false);
    _setColClueHighlight(hoverCol, false);
    _setRowCellsHighlight(hoverRow, false);
    _setColCellsHighlight(hoverCol, false);
}


//------------------------------------------------------------------------
//-------------------DRAG PAINTING - HELPERS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if the given cell is reachable under the current axis-lock rules.
// When axisLockEnabled is off, every cell is always reachable.
// When it is on, only cells on the locked axis (row or column) are reachable.
function _isDragCellAllowed(row, col) {
    if (!axisLockEnabled) return true;

    // Determine the axis on the first movement away from the drag-start cell.
    if (dragAxis === null && (row !== dragStartRow || col !== dragStartCol)) {
        if (row === dragStartRow) dragAxis = 'row';
        else if (col === dragStartCol) dragAxis = 'col';
        else dragAxis = 'row';   // diagonal: default to row
    }

    // No axis locked yet (cursor hasn't moved) — allow the cell.
    if (dragAxis === null) return true;
    if (dragAxis === 'row' && row === dragStartRow) return true;
    if (dragAxis === 'col' && col === dragStartCol) return true;
    return false;
}


// True if (row, col) is a cell the player has correctly resolved
// (either filled themselves or via a reveal).
function _isCellCorrectlyFilled(row, col) {
    return (userGrid[row][col] === 1 || revealedGrid[row][col]) && cur.grid[row][col] === 1;
}

// Counts the contiguous run of already-correct cells touching (row, col)
// along the given axis ('row' = scan left/right, 'col' = scan up/down).
// Does NOT include (row, col) itself.
function _countAdjacentPrefillRun(row, col, axis) {
    let count = 0;
    if (axis === 'row') {
        const cols = cur.grid[0].length;
        for (let c = col - 1; c >= 0 && _isCellCorrectlyFilled(row, c); c--) count++;
        for (let c = col + 1; c < cols && _isCellCorrectlyFilled(row, c); c++) count++;
    } else {
        const rows = cur.grid.length;
        for (let r = row - 1; r >= 0 && _isCellCorrectlyFilled(r, col); r--) count++;
        for (let r = row + 1; r < rows && _isCellCorrectlyFilled(r, col); r++) count++;
    }
    return count;
}

//------------------------------------------------------------------------
//-------------------DRAG PAINTING - MAIN---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// onHover — fired by onmouseenter on every grid cell.
//   Moves the crosshair to the newly entered cell and, when the player is
//   mid-drag, applies the current paint stroke to the cell (respecting
//   axis-lock if it is enabled).
function onHover(e, row, col) {
    const movedToNewCell = (row !== hoverRow || col !== hoverCol);
    if (movedToNewCell) {
        clearHover();
        hoverRow = row;
        hoverCol = col;
        applyHover(row, col);
    }

    if (painting && !dead && _isDragCellAllowed(row, col)) {
        applyCell(row, col);
    }
}

// onHoverOut — fired by onmouseleave on every grid cell.
//   Clears the crosshair only when the cell being left is the one that is
//   currently highlighted. This guards against stale clears caused by the
//   browser firing leave/enter events in an unexpected order.
function onHoverOut(row, col) {
    const leavingHighlightedCell = (row === hoverRow && col === hoverCol);
    if (leavingHighlightedCell) {
        clearHover();
        hoverRow = -1;
        hoverCol = -1;
    }
}


//------------------------------------------------------------------------
//-------------------DRAG COUNTER OVERLAY---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _getOrCreateCounterOverlay — returns the overlay <span> inside a cell,
//   creating and appending it first if it does not already exist.
function _getOrCreateCounterOverlay(cellEl) {
    let overlay = cellEl.querySelector('.drag-count-overlay');
    if (!overlay) {
        overlay = document.createElement('span');
        overlay.className = 'drag-count-overlay';
        cellEl.appendChild(overlay);
    }
    return overlay;
}

// dragCounterApply — sets the stroke-count number shown on a cell
//   during a drag so the player can see how many cells they have painted.
function dragCounterApply(row, col, count) {
    const cellEl = document.getElementById(`g-${row}-${col}`);
    if (!cellEl) return;
    const overlay = _getOrCreateCounterOverlay(cellEl);
    overlay.textContent = count;
}

// dragCounterClear — removes all stroke-count overlays from the entire board,
//   called when a drag stroke ends.
function dragCounterClear() {
    document.querySelectorAll('.drag-count-overlay').forEach(el => el.remove());
}