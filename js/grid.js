//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Toggle to move row clues from left side to right side of the grid
let _rowCluesOnRight = false;

// Column-width bookkeeping so the <colgroup> can be rebuilt to match
// whichever side the clue cells currently live on. Set inside buildGrid().
let _clueColCount = 0;   // how many narrow (clue/corner) columns exist
let _puzzleColCount = 0; // how many wide (puzzle) columns exist
let _clueColWidth = 0;   // px width of a clue/corner column
let _puzzleColWidth = 0; // px width of a puzzle column




//------------------------------------------------------------------------
//----------------------CLUE CALCULATION----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// clues(line) — converts a single row or column of solution values into
//   the nonogram clue array for that line.
//   A "clue" is the count of each consecutive run of filled cells (1s).
//
//   Example:  [0,1,1,0,1]  →  [2, 1]
//             [0,0,0,0,0]  →  [0]   (empty line always returns [0])
//
//   Algorithm: iterate through the values keeping a running counter.
//     - When a 1 is encountered, increment the counter.
//     - When a 0 follows a run (counter > 0), push counter to results and reset.
//     - After the loop, push any trailing run.
//   Called for every row (to build rowClues) and every column (to build colClues)
//   inside buildGrid().
function clues(line) {
    const runLengths = [];
    let currentRun = 0;

    for (const cellValue of line) {
        if (cellValue === 1) {
            currentRun++;
        } else if (currentRun > 0) {
            runLengths.push(currentRun);
            currentRun = 0;
        }
    }

    if (currentRun > 0) runLengths.push(currentRun); // trailing run at end of line
    return runLengths.length ? runLengths : [0];      // empty line → [0] so the clue cell renders "0"
}


// _computeRowClues — returns the clue array for every row of the solution.
//   Shared by buildGrid() and updClues() so the run-length pass over the
//   solution isn't duplicated in both places.
function _computeRowClues(sol) {
    return sol.map(row => clues(row));
}


// _computeColClues — returns the clue array for every column of the solution.
//   Mirrors _computeRowClues() but transposes each column into a line first.
function _computeColClues(sol) {
    const cols = sol[0].length;
    return Array.from({ length: cols }, (_, c) => clues(sol.map(r => r[c])));
}




//------------------------------------------------------------------------
//--------------------GRID SIZE CALCULATION-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// _calcCellSize — returns the pixel width/height for a single puzzle cell
//   based on the largest grid dimension, so smaller puzzles get bigger cells
//   and larger puzzles shrink to fit within a ~700px budget.
function _calcCellSize(maxDim) {
    if (maxDim <= 5) return 52;
    if (maxDim <= 10) return 40;
    if (maxDim <= 15) return 32;
    if (maxDim <= 20) return 26;
    return Math.max(18, Math.floor(700 / maxDim));
}


// _calcFontSize — returns the clue number font size (px) scaled to the grid.
//   Follows the same breakpoints as _calcCellSize so clue text fits neatly
//   inside the clue header columns.
function _calcFontSize(maxDim) {
    if (maxDim <= 5) return 17;
    if (maxDim <= 10) return 15;
    if (maxDim <= 15) return 13;
    if (maxDim <= 20) return 12;
    return 10;
}


// _calcClueColWidth — returns the px width of a clue/corner column for a
//   given font size. Shared by the colgroup sizing, row-clue cell
//   positioning, and the row-clue side-toggle rebuild, so the "+7" padding
//   constant only lives in one place.
function _calcClueColWidth(fontSize) {
    return fontSize + 7;
}




//------------------------------------------------------------------------
//--------------------GRID HTML BUILDER HELPERS---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// _buildColgroup — returns the <colgroup> HTML string that sets column widths.
//   In adjacency matrix mode the row-clue columns are suppressed entirely,
//   so only the puzzle data columns are emitted.
//
//   maxRowWidth  — number of clue columns needed on the left (for row clues)
//   cols         — number of puzzle data columns
//   cellSize     — px width for each puzzle column
//   fontSize     — px font size (used to derive row-clue column width)
//   isAdjMatrix  — when true, skip row-clue columns
function _buildColgroup(maxRowWidth, cols, cellSize, fontSize, isAdjMatrix) {
    let html = `<colgroup>`;

    if (!isAdjMatrix) {
        // Row-clue columns are narrower than puzzle columns
        html += Array(maxRowWidth).fill(`<col style="width:${_calcClueColWidth(fontSize)}px">`).join('');
    }

    html += Array(cols).fill(`<col style="width:${cellSize}px">`).join('');
    html += `</colgroup>`;
    return html;
}


// _buildColClueHeaderRows — returns the HTML for all column-clue header rows
//   that sit above the puzzle grid.  Each column's clue numbers are stacked
//   vertically; shorter clue lists are bottom-aligned via an offset (off).
//
//   colClues     — array of clue arrays, one per column
//   maxColDepth  — tallest column clue (number of header rows needed)
//   maxRowWidth  — number of corner cells to pad the left side
//   cols         — number of puzzle columns
//   fontSize     — px font size for clue numbers
function _buildColClueHeaderRows(colClues, maxColDepth, maxRowWidth, cols, fontSize) {
    let html = '';

    for (let depth = 0; depth < maxColDepth; depth++) {
        // Corner spacer cells fill the top-left block (row-clue area × header rows)
        html += `<tr>${Array(maxRowWidth).fill(`<td class="corner"></td>`).join('')}`;

        for (let col = 0; col < cols; col++) {
            const clueList = colClues[col];
            const offset = maxColDepth - clueList.length; // bottom-align shorter clue lists
            const num = depth >= offset ? clueList[depth - offset] : null;
            const isTopRow = (depth === 0);

            html += `<td class="cch cch-${col}" ${isTopRow ? `id="cchtop-${col}"` : ''} style="height:${fontSize + 3}px">`;
            if (num !== null) {
                html += `<div class="ccinner"><span id="cn-${col}-${depth}" style="font-size:${fontSize}px">${num}</span></div>`;
            }
            html += `</td>`;
        }

        html += `</tr>`;
    }

    return html;
}


// _buildRowClueCell — returns the HTML for a single sticky row-clue <td>.
//   Each clue number in the row gets its own cell, positioned with CSS sticky
//   so it remains visible during horizontal scroll.
//
//   row      — row index
//   clueIdx  — index of this clue number within the row's clue array
//   padLeft  — number of empty corner cells to the left of this cell
//   value    — the clue number to display
//   fontSize — px font size
//   colWidth — px width of each row-clue column (see _calcClueColWidth)
function _buildRowClueCell(row, clueIdx, padLeft, value, fontSize, colWidth) {
    const leftPx = (padLeft + clueIdx) * colWidth;
    return `<td class="rct rct-${row}" id="rct-${row}-${clueIdx}"` +
        ` style="font-size:${fontSize}px">` +
        `<div class="rcinner"><span id="rn-${row}-${clueIdx}" style="font-size:${fontSize}px">${value}</span></div>` +
        `</td>`;
}


// _buildPuzzleCell — returns the HTML for one interactive puzzle <td>.
//   Adds border-right (br) and border-bottom (bb) classes every 5 cells
//   to draw the 5×5 section guides.
//
//   row, col     — cell position
//   totalRows    — total rows in grid (used to suppress guide on last row)
//   totalCols    — total cols in grid (used to suppress guide on last col)
//   cellSize     — px size of the cell
function _buildPuzzleCell(row, col, totalRows, totalCols, cellSize) {
    const borderRight = (col + 1) % 5 === 0 && col < totalCols - 1 ? ' br' : '';
    const borderBottom = (row + 1) % 5 === 0 && row < totalRows - 1 ? ' bb' : '';

    return `<td><div class="gc${borderRight}${borderBottom}" id="g-${row}-${col}"` +
        ` style="width:${cellSize}px;height:${cellSize}px;font-size:${cellSize}px"` +
        ` onmousedown="cellDown(event,${row},${col})"` +
        ` onmouseenter="onHover(event,${row},${col})"` +
        ` onmouseleave="onHoverOut(${row},${col})"` +
        ` onmouseup="stopPainting()"></div></td>`;
}


// _buildPuzzleRows — returns the HTML for all puzzle data rows, including
//   the row-clue sticky cells on the left and the interactive grid cells.
//
//   rowClues    — array of clue arrays, one per row
//   maxRowWidth — maximum row-clue depth (for alignment padding)
//   sol         — 2D solution array
//   cellSize    — px size for puzzle cells
//   fontSize    — px font size for clue labels
//   isAdjMatrix — when true, skip row-clue cells
function _buildPuzzleRows(rowClues, maxRowWidth, sol, cellSize, fontSize, isAdjMatrix) {
    const rows = sol.length;
    const cols = sol[0].length;
    const colWidth = _calcClueColWidth(fontSize); // width of each row-clue sticky column
    let html = '';

    for (let row = 0; row < rows; row++) {
        html += `<tr>`;

        // Row clue sticky cells — hidden in adjacency matrix mode
        if (!isAdjMatrix) {
            const rowClue = rowClues[row];
            const padCells = maxRowWidth - rowClue.length; // empty corner pads for alignment

            // Empty corner pads (no number, just spacing)
            for (let i = 0; i < padCells; i++) {
                html += `<td class="corner"></td>`;
            }

            // Actual clue number cells
            for (let i = 0; i < rowClue.length; i++) {
                html += _buildRowClueCell(row, i, padCells, rowClue[i], fontSize, colWidth);
            }
        }

        // Puzzle data cells
        for (let col = 0; col < cols; col++) {
            html += _buildPuzzleCell(row, col, rows, cols, cellSize);
        }

        html += `</tr>`;
    }

    return html;
}




//------------------------------------------------------------------------
//--------------------ROW CLUE SIDE TOGGLE---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// _buildRowClueToggle — creates (or re-creates) the "CLUES ▶" button that
//   lets the player flip row clues to the right side of the grid. Called
//   once per buildGrid() so it always attaches to the current puzzle wrap.
function _buildRowClueToggle() {
    const existing = document.getElementById('row-clue-toggle-btn');
    if (existing) existing.remove();

    const wrap = document.getElementById('puzzle-scaler-wrap');
    if (!wrap) return;

    const btn = document.createElement('button');
    btn.id = 'row-clue-toggle-btn';
    btn.textContent = 'CLUES ▶';
    btn.title = 'Move row clues';
    btn.style.cssText = `
        position: absolute;
        bottom: -28px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 50;
        font-family: var(--PX);
        font-size: 9px;
        padding: 4px 7px;
        background: rgba(10,10,18,0.7);
        border: 1px solid var(--border2);
        color: var(--accent2);
        cursor: pointer;
        letter-spacing: 1px;
    `;
    btn.onclick = _toggleRowCluesSide;
    wrap.appendChild(btn);
}


// _toggleRowCluesSide — flips row-clue cells between the left and right
//   side of the puzzle table by rebuilding the <colgroup> and physically
//   moving the existing <td> elements within each row (no HTML regen).
function _toggleRowCluesSide() {
    _rowCluesOnRight = !_rowCluesOnRight;
    const btn = document.getElementById('row-clue-toggle-btn');

    const table = document.querySelector('table.ptable');
    if (!table) return;

    const colgroup = table.querySelector('colgroup');
    if (colgroup && _clueColCount) {
        let colHtml = '';
        if (_rowCluesOnRight) {
            colHtml += Array(_puzzleColCount).fill(`<col style="width:${_puzzleColWidth}px">`).join('');
            colHtml += Array(_clueColCount).fill(`<col style="width:${_clueColWidth}px">`).join('');
        } else {
            colHtml += Array(_clueColCount).fill(`<col style="width:${_clueColWidth}px">`).join('');
            colHtml += Array(_puzzleColCount).fill(`<col style="width:${_puzzleColWidth}px">`).join('');
        }
        colgroup.innerHTML = colHtml;
    }

    if (_rowCluesOnRight) {
        // Move all rct cells to the end of their row, reverse clue order
        table.querySelectorAll('tr').forEach(tr => {
            const rcts = [...tr.querySelectorAll('td.rct, td.corner')];
            if (!rcts.length) return;
            rcts.forEach(td => tr.removeChild(td));
            rcts.reverse().forEach(td => tr.appendChild(td));
        });
        if (btn) btn.textContent = '◀ CLUES';
    } else {
        // Move them back to the start of their row
        table.querySelectorAll('tr').forEach(tr => {
            const rcts = [...tr.querySelectorAll('td.rct, td.corner')];
            if (!rcts.length) return;
            rcts.forEach(td => tr.removeChild(td));
            rcts.forEach(td => tr.insertBefore(td, tr.firstChild));
        });
        if (btn) btn.textContent = 'CLUES ▶';
    }

    // Keep the shield border (if active) aligned with the grid's new position
    const border = document.getElementById('fx-shield-border');
    if (border?._reposition) border._reposition();
}




//------------------------------------------------------------------------
//-------------------ADJACENCY MATRIX OVERLAY-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Adjacency matrix mode (skill 302) shows Minesweeper-style neighbour
// counts on each empty cell — the number of surrounding solution cells
// that haven't been correctly filled yet.  Row/column clue headers are
// hidden in this mode (see buildGrid / _buildColgroup).
//
// NOTE: this section is placed before CELL RENDERER HELPERS because
// _refreshAdjacencyNeighbours() (in that section) calls
// _adjacencyMatrixUpdateOverlay() defined here.


// _adjacencyMatrixCount — returns how many of the 8 surrounding cells are
//   unfilled solution cells (sol === 1 but not yet player-filled or revealed).
//
//   row, col — the cell whose neighbours to count
function _adjacencyMatrixCount(row, col) {
    if (!cur) return 0;

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    let count = 0;

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue; // skip the cell itself
            const r = row + dr;
            const c = col + dc;
            if (r < 0 || r >= rows || c < 0 || c >= cols) continue; // out of bounds
            if (sol[r][c] === 1 && userGrid[r][c] !== 1 && !revealedGrid[r][c]) count++;
        }
    }

    return count;
}


// _adjacencyMatrixUpdateOverlay — writes (or removes) the neighbour-count
//   span inside a single cell.  Only visible on unfilled, non-wrong cells.
//   A count of 0 shows as blank, matching Minesweeper convention.
//
//   row, col — the cell to update
function _adjacencyMatrixUpdateOverlay(row, col) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;

    // Remove any existing count overlay before potentially re-adding
    const existingOverlay = el.querySelector('.adj-count');
    if (existingOverlay) existingOverlay.remove();

    // Overlays only appear on cells the player hasn't resolved yet
    const isFilled = userGrid[row][col] === 1 || revealedGrid[row][col];
    if (isFilled || wrongGrid[row][col]) return;

    const count = _adjacencyMatrixCount(row, col);
    if (count === 0) return; // show blank for 0, like Minesweeper

    const countSpan = document.createElement('span');
    countSpan.className = `adj-count adj-count-${count}`;
    countSpan.textContent = count;
    el.appendChild(countSpan);
}


// _adjacencyMatrixRefreshAll — refreshes adjacency overlays for every cell
//   on the board.  Called at level start (after the grid DOM is ready) and
//   after any bulk reveal that changes many cells at once.
function _adjacencyMatrixRefreshAll() {
    if (!ptHasSkill('adjacency_matrix') || !cur) return;

    const rows = cur.grid.length;
    const cols = cur.grid[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            _adjacencyMatrixUpdateOverlay(r, c);
        }
    }
}




//------------------------------------------------------------------------
//--------------------MAIN GRID BUILDER FUNCTION--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// buildGrid — constructs the full puzzle table HTML and injects it into
//   the #ptable element, then triggers a scale pass on the next frame.
//
//   Reads cur.grid for the solution, computes row/column clues, sizes
//   cells based on grid dimensions, and delegates HTML generation to the
//   helper functions above.  In adjacency_matrix mode all clue columns
//   and header rows are suppressed.
function buildGrid() {
    resetZoom();

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const maxDim = Math.max(rows, cols);
    const cellSize = _calcCellSize(maxDim);
    const fontSize = _calcFontSize(maxDim);

    // Compute clue arrays for every row and column
    const rowClues = _computeRowClues(sol);
    const colClues = _computeColClues(sol);

    // Depth = how many rows/columns the clue headers need
    const maxColDepth = Math.max(...colClues.map(c => c.length));
    const maxRowWidth = Math.max(...rowClues.map(r => r.length));

    const isAdjMatrix = ptHasSkill('adjacency_matrix');

    // Remember column dimensions so the toggle button can rebuild
    // the <colgroup> correctly when clues move sides.
    _clueColCount = maxRowWidth;
    _puzzleColCount = cols;
    _clueColWidth = _calcClueColWidth(fontSize);
    _puzzleColWidth = cellSize;

    // Assemble full table HTML
    let html = _buildColgroup(maxRowWidth, cols, cellSize, fontSize, isAdjMatrix);
    html += `<tbody>`;

    if (!isAdjMatrix) {
        html += _buildColClueHeaderRows(colClues, maxColDepth, maxRowWidth, cols, fontSize);
    }

    html += _buildPuzzleRows(rowClues, maxRowWidth, sol, cellSize, fontSize, isAdjMatrix);
    html += `</tbody>`;

    document.getElementById('ptable').innerHTML = html;

    if (!isAdjMatrix) {
        _markZeroClueLinesSolved(rowClues, colClues);   
    }

    _rowCluesOnRight = false;      // reset side on each new level
    _buildRowClueToggle();         // add the toggle button

    // Defer scale pass until after the browser has laid out the new DOM
    requestAnimationFrame(() => requestAnimationFrame(scalePuzzle));
}




//------------------------------------------------------------------------
//-------------------SOLVED CLUE FLAG HELPERS----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// _calcCluePositionWindows — determines, for each clue in a line, the
//   earliest (leftmost) and latest (rightmost) cell index where that
//   clue's run could possibly START, based purely on the solution layout.
//
//   Returns { earliest[], latest[] } — both arrays indexed by clue index.
//
//   clueNums — array of run lengths (the clue numbers for this line)
//   solRow   — solution values for the line (array of 0s and 1s)
function _calcCluePositionWindows(clueNums, solRow) {
    const len = solRow.length;
    const n = clueNums.length;
    const earliest = new Array(n).fill(0);
    const latest = new Array(n).fill(0);

    // Forward pass: place each clue as far left as possible
    let pos = 0;
    for (let ci = 0; ci < n; ci++) {
        // Scan right until we find a valid run of the required length
        while (pos <= len - clueNums[ci]) {
            let fits = true;
            for (let k = 0; k < clueNums[ci]; k++) {
                if (solRow[pos + k] !== 1) { fits = false; break; }
            }
            if (fits) break;
            pos++;
        }
        earliest[ci] = pos;
        pos += clueNums[ci] + 1; // +1 mandatory gap between runs
    }

    // Backward pass: place each clue as far right as possible
    pos = len - 1;
    for (let ci = n - 1; ci >= 0; ci--) {
        // Scan left until a run of the required length fits ending at pos
        while (pos - clueNums[ci] + 1 >= 0) {
            let fits = true;
            for (let k = 0; k < clueNums[ci]; k++) {
                if (solRow[pos - clueNums[ci] + 1 + k] !== 1) { fits = false; break; }
            }
            if (fits) break;
            pos--;
        }
        latest[ci] = pos - clueNums[ci] + 1;
        pos -= clueNums[ci] + 1; // +1 mandatory gap
    }

    return { earliest, latest };
}


// _collectPlayerRuns — scans a line and returns all correctly-filled runs
//   made by the player.  Only cells where both userRow and solRow are 1
//   are counted, so over-marked wrong cells are ignored.
//
//   Returns an array of { start, size } objects.
//
//   userRow — player's fill state for the line
//   solRow  — solution values for the line
function _collectPlayerRuns(userRow, solRow) {
    const len = solRow.length;
    const playerRuns = [];
    let i = 0;

    while (i < len) {
        if (userRow[i] === 1 && solRow[i] === 1) {
            const start = i;
            while (i < len && userRow[i] === 1 && solRow[i] === 1) i++;
            playerRuns.push({ start, size: i - start });
        } else {
            i++;
        }
    }

    return playerRuns;
}


// getSolvedClueFlags — returns a boolean array, one entry per clue number,
//   indicating whether that specific run has already been correctly filled.
//
//   A clue is only marked solved when its positional window doesn't overlap
//   with an adjacent clue's window (ambiguous windows are skipped), AND
//   the player has exactly one correctly-sized run inside that window.
//
//   clueNums — clue run lengths for this line
//   userRow  — player's fill state
//   solRow   — solution values
function getSolvedClueFlags(clueNums, userRow, solRow) {
    const n = clueNums.length;
    const { earliest, latest } = _calcCluePositionWindows(clueNums, solRow);
    const playerRuns = _collectPlayerRuns(userRow, solRow);
    const solved = new Array(n).fill(false);

    for (let ci = 0; ci < n; ci++) {
        const windowStart = earliest[ci];
        const windowEnd = latest[ci];
        const runSize = clueNums[ci];

        // Skip ambiguous windows that overlap with a neighbour's window
        const overlapsLeft = ci > 0 && latest[ci - 1] + clueNums[ci - 1] > windowStart;
        const overlapsRight = ci < n - 1 && windowEnd + runSize > earliest[ci + 1];
        if (overlapsLeft || overlapsRight) continue;

        // A matching player run must have the exact size and start within the window
        const matchFound = playerRuns.some(
            run => run.size === runSize && run.start >= windowStart && run.start <= windowEnd
        );
        if (matchFound) solved[ci] = true;
    }

    return solved;
}




//------------------------------------------------------------------------
//-------------------CLUE UPDATE HELPERS----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// _applyRowClueState — updates the strikethrough CSS class on every clue
//   number span for the given row, and (when the row just became fully
//   solved) plays the explosion effect exactly once on a single "host"
//   cell sized via CSS vars to visually cover the whole clue-number box.
//
//   row        — row index
//   rowDone    — whether the entire row is fully solved
//   rowClues   — clue arrays for all rows (used to iterate span indices)
//   rowFlags   — per-run solved booleans from getSolvedClueFlags
function _applyRowClueState(row, rowDone, rowClues, rowFlags) {
    rowClues[row].forEach((_, i) => {
        const span = document.getElementById(`rn-${row}-${i}`);
        if (span) span.classList.toggle('clue-done', rowDone || rowFlags[i]);
    });

    // Glow wash on every cell in the box (tiles seamlessly, no overflow needed)
    const cells = [...document.querySelectorAll(`.rct-${row}`)];
    cells.forEach(td => td.classList.toggle('clue-line-solved', rowDone));

    // Ring + particle burst fire once, on the middle cell only
    cells.forEach(td => td.classList.remove('clue-line-solved-fx'));
    if (rowDone && cells.length) {
        const hostIdx = Math.floor((cells.length - 1) / 2);
        cells[hostIdx].classList.add('clue-line-solved-fx');
    }
}


// _applyColClueState — updates the strikethrough CSS class on every clue
//   number span for the given column, and (when the column just became
//   fully solved) plays the explosion effect exactly once on a single
//   "host" cell sized via CSS vars to cover the whole clue-number box.
//
//   col      — column index
//   colDone  — whether the entire column is fully solved
//   colFlags — per-run solved booleans from getSolvedClueFlags
function _applyColClueState(col, colDone, colFlags) {
    document.querySelectorAll(`[id^="cn-${col}-"]`).forEach((span, i) => {
        span.classList.toggle('clue-done', colDone || colFlags[i]);
    });

    const cells = [...document.querySelectorAll(`.cch-${col}`)]
        .filter(td => td.querySelector('.ccinner'));

    cells.forEach(td => td.classList.toggle('clue-line-solved', colDone));

    cells.forEach(td => td.classList.remove('clue-line-solved-fx'));
    if (colDone && cells.length) {
        const hostIdx = Math.floor((cells.length - 1) / 2);
        cells[hostIdx].classList.add('clue-line-solved-fx');
    }
}


// _isRowSolved — returns true when every solution-filled cell in the row
//   is correctly filled by the player (or revealed) and has no wrong mark.
//
//   sol  — 2D solution array
//   row  — row index to check
function _isRowSolved(sol, row) {
    return sol[row].every((cellValue, col) => {
        if (cellValue !== 1) return true;  // empty solution cell — irrelevant
        if (wrongGrid[row][col]) return false; // wrong mark on a correct cell
        return userGrid[row][col] === 1 || revealedGrid[row][col];
    });
}


// _isColSolved — returns true when every solution-filled cell in the column
//   is correctly filled by the player (or revealed) and has no wrong mark.
//
//   sol  — 2D solution array
//   col  — column index to check
function _isColSolved(sol, col) {
    return sol.every((rowData, row) => {
        if (rowData[col] !== 1) return true;
        if (wrongGrid[row][col]) return false;
        return userGrid[row][col] === 1 || revealedGrid[row][col];
    });
}



// _markZeroClueLinesSolved — rows/cols whose clue is [0] have no solution
//   cells at all, so the player never fills a cell in that line and
//   updClues() never runs for it. Mark those lines solved immediately
//   after the grid is built, reusing the same state-apply helpers so
//   both clue-done (strikethrough) and clue-line-solved (highlight) fire.
//
//   rowClues — clue arrays for all rows (from buildGrid)
//   colClues — clue arrays for all cols (from buildGrid)
function _markZeroClueLinesSolved(rowClues, colClues) {
    rowClues.forEach((clue, row) => {
        if (clue.length === 1 && clue[0] === 0) {
            _applyRowClueState(row, true, rowClues, [true]);
        }
    });

    colClues.forEach((clue, col) => {
        if (clue.length === 1 && clue[0] === 0) {
            _applyColClueState(col, true, [true]);
        }
    });
}



//------------------------------------------------------------------------
//-------------------SKILL REWARD HELPERS (updClues)----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// _handleRegressionReward — awards bonus seconds when a row or column is
//   completed for the first time, if the player has any regression_reward
//   nodes unlocked.  Uses _regressionRewardedLines to prevent double-dips
//   from overmark-then-reveal exploits.
//
//   row, col   — the cell that was just filled
//   rowDone    — whether the affected row is now complete
//   colDone    — whether the affected column is now complete
//   sol        — 2D solution array
function _handleRegressionReward(row, col, rowDone, colDone, sol) {
    if (!ptHasSkill('regression_reward_1') &&
        !ptHasSkill('regression_reward_2') &&
        !ptHasSkill('regression_reward_3')) return;

    // Only trigger on a genuine player fill — not revealed cells or erasure
    const cellWasPlayerFilled = (sol[row][col] === 1) && (userGrid[row][col] === 1) && !revealedGrid[row][col];
    if (!cellWasPlayerFilled) return;

    // Sum bonus from however many nodes are unlocked (5s each)
    let bonus = 0;
    if (ptHasSkill('regression_reward_1')) bonus += 5;
    if (ptHasSkill('regression_reward_2')) bonus += 5;
    if (ptHasSkill('regression_reward_3')) bonus += 5;
    if (bonus === 0) return;

    if (!window._regressionRewardedLines) window._regressionRewardedLines = new Set();

    if (rowDone && !window._regressionRewardedLines.has(`r${row}`)) {
        window._regressionRewardedLines.add(`r${row}`);
        timerSecs += bonus;
        updTimer();
        showToast(`📉 ${LANG === 'de' ? `+${bonus}s (Regressions-Belohnung)` : `+${bonus}s (Regression Reward)`}`);
    }

    if (colDone && !window._regressionRewardedLines.has(`c${col}`)) {
        window._regressionRewardedLines.add(`c${col}`);
        timerSecs += bonus;
        updTimer();
        showToast(`📉 ${LANG === 'de' ? `+${bonus}s (Regressions-Belohnung)` : `+${bonus}s (Regression Reward)`}`);
    }
}


// _tryAutoMarkAdjacentLine — attempts to auto-mark exactly one wrong empty
//   cell in one of the given adjacent lines.  Used by residual analysis to
//   reward line completion with a free cross mark in a neighbouring line.
//
//   adjacentIndices — [prevIndex, nextIndex] (row or column neighbours)
//   getCandidates   — function(index) → array of [row, col] pairs that are
//                     valid empty non-solution cells to mark
function _tryAutoMarkAdjacentLine(adjacentIndices, getCandidates) {
    // Randomise direction so the benefit isn't always biased toward one side
    const indices = [...adjacentIndices];
    if (indices.length > 1 && Math.random() < 0.5) indices.reverse();

    for (const idx of indices) {
        const candidates = getCandidates(idx);
        if (candidates.length === 0) continue;

        const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
        userGrid[r][c] = 2; // mark as cross
        systemMarkedGrid[r][c] = true;
        renderCell(r, c);

        // Toast Alert & FX Trigger
        showToast(`🔬 ${LANG === 'de' ? 'Residualanalyse!' : 'Residual Analysis!'}`);
        if (typeof playResidualAnalysisEffect === 'function') {
            playResidualAnalysisEffect(r, c);
            Audio_Manager.playSFX('residual_analysis');
        }

        // Bayesian bonus: chance to chain-mark one additional wrong tile
        if (_getBayesianBonus() > 0 && Math.random() < _getBayesianBonus()) {
            _resetBayesianBonus();
            markWrongTiles(1);
        }

        break; // only mark in one adjacent line per completion
    }
}


// _handleResidualAnalysis — when a row/col is completed, rolls a chance
//   to auto-mark exactly one wrong empty cell in an adjacent row/col.
//   Chance scales with unlocked nodes (25% base + 5% + 10% = max 40%).
//   Skipped entirely when oracle is active or ergodic field is unlocked.
//
//   row, col   — the cell that was just filled
//   rowDone    — whether the affected row is now complete
//   colDone    — whether the affected column is now complete
//   sol        — 2D solution array
function _handleResidualAnalysis(row, col, rowDone, colDone, sol) {
    if (window._oracleActive) return;
    if (ptHasSkill('keystone_ergodic_field')) return;
    if (!ptHasSkill('residual_analysis_1') &&
        !ptHasSkill('residual_analysis_2') &&
        !ptHasSkill('residual_analysis_3')) return;

    // Only trigger on a correctly filled cell — not on erasure or undo
    const cellWasCorrectlyFilled = (sol[row][col] === 1) && (userGrid[row][col] === 1 || revealedGrid[row][col]);
    if (!cellWasCorrectlyFilled) return;

    let activationChance = 0;
    if (ptHasSkill('residual_analysis_1')) activationChance += 0.10;
    if (ptHasSkill('residual_analysis_2')) activationChance += 0.05;
    if (ptHasSkill('residual_analysis_3')) activationChance += 0.10;

    if (!window._residualAnalysisRewardedLines) window._residualAnalysisRewardedLines = new Set();

    const rows = sol.length;
    const cols = sol[0].length;

    // Row completion — try to mark in an adjacent row
    if (rowDone && !window._residualAnalysisRewardedLines.has(`r${row}`)) {
        window._residualAnalysisRewardedLines.add(`r${row}`);

        if (Math.random() < activationChance) {
            const adjRows = [row - 1, row + 1].filter(r => r >= 0 && r < rows);
            _tryAutoMarkAdjacentLine(adjRows, adjR => {
                const candidates = [];
                for (let c = 0; c < cols; c++) {
                    if (sol[adjR][c] === 0 &&
                        (userGrid[adjR][c] === 0 || userGrid[adjR][c] === 3) &&
                        !wrongGrid[adjR][c]) {
                        candidates.push([adjR, c]);
                    }
                }
                return candidates;
            });
        }
    }

    // Column completion — try to mark in an adjacent column
    if (colDone && !window._residualAnalysisRewardedLines.has(`c${col}`)) {
        window._residualAnalysisRewardedLines.add(`c${col}`);

        if (Math.random() < activationChance) {
            const adjCols = [col - 1, col + 1].filter(c => c >= 0 && c < cols);
            _tryAutoMarkAdjacentLine(adjCols, adjC => {
                const candidates = [];
                for (let r = 0; r < rows; r++) {
                    if (sol[r][adjC] === 0 &&
                        (userGrid[r][adjC] === 0 || userGrid[r][adjC] === 3) &&
                        !wrongGrid[r][adjC]) {
                        candidates.push([r, adjC]);
                    }
                }
                return candidates;
            });
        }
    }
}




//------------------------------------------------------------------------
//--------------------CLUE STRIKETHROUGH UPDATER--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// updClues(row, col) — called after every cell change.
//   Checks whether the affected row and column are now fully solved and
//   toggles the CSS class 'clue-done' (strikethrough) on clue number
//   spans accordingly.  Also fires various skill reward checks.
function updClues(row, col, isInitial = false) {
    if (!cur) return;

    // Bypass all reward logic during automated start-of-level reveals
    if (isInitial) return;

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    // Keystone: check if the 25% dead reckoning threshold has been reached
    if (typeof _deadReckoningCheckUnlock === 'function') _deadReckoningCheckUnlock();

    // --- Row clue state ---
    const rowDone = _isRowSolved(sol, row);
    const rowClues = _computeRowClues(sol);
    const rowFlags = getSolvedClueFlags(rowClues[row], userGrid[row], sol[row]);

    _applyRowClueState(row, rowDone, rowClues, rowFlags);

    if (rowDone && userGrid[row][col] === 1 && !revealedGrid[row][col]) {
        _sparsePriorOnLineComplete(row, true);
    }

    // --- Column clue state ---
    const colDone = _isColSolved(sol, col);
    const colClues = _computeColClues(sol);
    const colUserLine = userGrid.map(r => r[col]);
    const colSolLine = sol.map(r => r[col]);
    const colFlags = getSolvedClueFlags(colClues[col], colUserLine, colSolLine);

    _applyColClueState(col, colDone, colFlags);

    if (colDone && userGrid[row][col] === 1 && !revealedGrid[row][col]) {
        _sparsePriorOnLineComplete(col, false);
    }

    // --- Keystone: asymptotic mastery — count newly completed lines ---
    if (ptHasSkill('keystone_asymptotic_mastery')) {
        const cellIsCorrectlyFilled = (sol[row][col] === 1) && (userGrid[row][col] === 1 || revealedGrid[row][col]);
        if (cellIsCorrectlyFilled) {
            if (rowDone) window._asymptoticLinesCompleted = (window._asymptoticLinesCompleted || 0) + 1;
            if (colDone) window._asymptoticLinesCompleted = (window._asymptoticLinesCompleted || 0) + 1;
        }
    }

    // --- Misc system checks ---
    _signalToNoiseCheckRestore();
    if (sol[row][col] === 1 && (userGrid[row][col] === 1 || revealedGrid[row][col])) {
        _entropyDrainUpdateProgress(row, col);
    }

    // --- Skill reward processing ---
    _handleRegressionReward(row, col, rowDone, colDone, sol);
    _handleResidualAnalysis(row, col, rowDone, colDone, sol);
}




//------------------------------------------------------------------------
//-------------------CELL RENDERER HELPERS--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// _clearCellClasses — strips all visual state classes from a cell element
//   so we start from a clean slate before applying the new state.
//   Also snapshots and removes the DoF reverted ghost class separately
//   (it will be conditionally re-added at the end of renderCell).
//
//   Returns true if the cell was in the DoF reverted set before clearing.
function _clearCellClasses(el, row, col) {
    el.classList.remove('filled', 'marked', 'wrong-mark', 'revealed', 'questioned', 'cell-lucky', 'marked-system');
    el.classList.remove('dof-reverted');
    return !!(window._dofRevertedCells && window._dofRevertedCells.has(`${row}-${col}`));
}


// _refreshAdjacencyNeighbours — after a cell state change, refreshes the
//   adjacency count overlays for the cell itself and all 8 surrounding cells.
//   Needed because filling one cell changes the count shown on its neighbours.
//
//   row, col — the cell that changed
function _refreshAdjacencyNeighbours(row, col) {
    _adjacencyMatrixUpdateOverlay(row, col);

    if (!cur) return;
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                _adjacencyMatrixUpdateOverlay(nr, nc);
            }
        }
    }
}




//------------------------------------------------------------------------
//-------------------------CELL RENDERER----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// renderCell(row, col) — updates the visual CSS classes of a single grid
//   cell to reflect its current state in userGrid / wrongGrid / revealedGrid.
//
//   Priority order (highest wins):
//     1. wrongGrid    → 'wrong-mark'         (red ✕, overrides everything)
//     2. revealedGrid → 'filled' + 'revealed' (green fill from item reveal)
//     3. userGrid = 1 → 'filled'             (cyan player fill)
//     4. userGrid = 2 → 'marked'             (grey ✕ cross mark)
//     5. userGrid = 3 → 'questioned'         (question mark state)
//     6. userGrid = 0 → 'cell-lucky'         (shimmer hint if lucky tile)
function renderCell(row, col) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return; // safety guard — cell may not be in DOM yet

    const wasReverted = _clearCellClasses(el, row, col);

    // Priority 1: wrong fill marker — overrides everything else
    if (wrongGrid[row][col]) {
        el.classList.add('wrong-mark');
        return;
    }

    // Priority 2: item-revealed cell (permanent green fill)
    if (revealedGrid[row][col]) {
        el.classList.add('filled', 'revealed');
        return;
    }

    // Priority 3–5: normal player-controlled states
    const cellState = userGrid[row][col];
    if (cellState === 1) el.classList.add('filled');
    else if (cellState === 2) {
        el.classList.add('marked');
        if (systemMarkedGrid[row][col]) el.classList.add('marked-system');
    } else if (cellState === 3) el.classList.add('questioned');

    // Priority 6: subtle shimmer hint on empty lucky tiles
    if (cellState === 0 && luckyTiles && luckyTiles.has(`${row}-${col}`)) {
        el.classList.add('cell-lucky');
    }

    // Adjacency matrix mode: refresh neighbour overlays after any state change
    if (ptHasSkill('adjacency_matrix')) {
        _refreshAdjacencyNeighbours(row, col);
    }

    // Re-apply DoF reverted ghost style if the cell is still empty and unresolved
    if (wasReverted) {
        if (userGrid[row][col] === 0 && !wrongGrid[row][col] && !revealedGrid[row][col]) {
            el.classList.add('dof-reverted');
        } else {
            // Cell has been filled or corrected — remove from tracking set
            window._dofRevertedCells.delete(`${row}-${col}`);
        }
    }
}




//------------------------------------------------------------------------
//-------------------REVEAL MINI GRID IN WIN OVERLAY----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// buildReveal — constructs the small solution preview grid shown in the
//   win overlay.  Sizes cells to fill most of the viewport while keeping
//   them square, then stamps a div per cell coloured by the solution value.
function buildReveal() {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const ct = document.getElementById('ov-reveal');
    const wrap = document.getElementById('ov-top-half'); // new container

    const availW = wrap.clientWidth * 0.94;
    const availH = wrap.clientHeight * 0.94;
    const gap = 3;

    // Fit independently on each axis, then take the smaller cell size
    // so the grid fills the box without ever overflowing either dimension.
    const cellW = Math.floor((availW - (cols - 1) * gap) / cols);
    const cellH = Math.floor((availH - (rows - 1) * gap) / rows);
    const cellSize = Math.max(4, Math.min(cellW, cellH));

    const gridWidth = cellSize * cols + (cols - 1) * gap;
    const gridHeight = cellSize * rows + (rows - 1) * gap;

    ct.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    ct.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
    ct.style.width = `${gridWidth}px`;
    ct.style.height = `${gridHeight}px`;
    ct.innerHTML = '';

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'ov-reveal-cell' + (sol[r][c] === 1 ? ' f' : '');
            ct.appendChild(cell);
        }
    }
}

window.addEventListener('resize', () => {
    const ov = document.getElementById('ov-win');
    if (ov && ov.classList.contains('show')) buildReveal();
});