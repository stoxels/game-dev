//------------------------------------------------------------------------
//-------------------LUCKY TILES----------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Determines how many lucky tiles to place based on grid size and passive nodes.
// Returns the raw count before the variance_collapse override is applied.
//
// Grid size tiers used throughout:
//   Small  : < 100 cells
//   Medium : 100–199 cells
//   Large  : 200–399 cells
//   Massive: 400+ cells
function _calcLuckyTileCount(isLarge, isMassive, isLargeOrMassive) {
    const isTrix = _charIs('trix');
    const hasGridAwareness = ptHasSkill('grid_awareness') || isTrix; // Trix gets this innately

    let maxTiles = 0;
    if (hasGridAwareness) {
        if (isLarge) maxTiles = 1;
        else if (isMassive) maxTiles = 2;
    }

    let extraTileChance = 0;
    if (isLargeOrMassive) {
        if (ptHasSkill('fortunes_tile_1')) extraTileChance += 0.10;
        if (ptHasSkill('fortunes_tile_2')) extraTileChance += 0.15;
        if (ptHasSkill('fortunes_tile_3')) extraTileChance += 0.25;
        if (isTrix) extraTileChance += 0.15; // Loaded Dice: node-independent chance boost
    }

    let tileCount;
    if (hasGridAwareness && isLarge) {
        tileCount = 1 + (Math.random() < extraTileChance ? 1 : 0);
    } else if (hasGridAwareness && isMassive) {
        tileCount = 1 + Math.floor(Math.random() * 2) + (Math.random() < extraTileChance ? 1 : 0);
    } else {
        tileCount = maxTiles === 0 ? 0 : Math.floor(Math.random() * (maxTiles + 1));
        if (tileCount > 0 && isLargeOrMassive) {
            tileCount += (Math.random() < extraTileChance ? 1 : 0);
        }
    }

    return tileCount;
}

// Highlights up to 2 lucky tiles with the stronger `cell-lucky-focus` CSS
// class after the grid is rendered, so the specifically highlighted tiles
// stand out from regular lucky tiles (which only get the base shimmer).
// outlier_detection (228-229): each node highlights one additional tile.
// Delayed so the grid DOM exists before we touch elements.
function _applyOutlierDetectionHighlights() {
    if (!luckyTiles.size) return;
    if (!ptHasSkill('outlier_detection_1') && !ptHasSkill('outlier_detection_2')) return;

    const highlightCount = (ptHasSkill('outlier_detection_1') ? 1 : 0)
        + (ptHasSkill('outlier_detection_2') ? 1 : 0);
    const toHighlight = [...luckyTiles].slice(0, highlightCount);

    // Remember the highlighted keys so re-renders keep the focus class.
    window._outlierHighlighted = new Set(toHighlight);

    setTimeout(() => {
        toHighlight.forEach(key => {
            if (!luckyTiles.has(key)) return; // tile was already claimed
            const [r, c] = key.split('-').map(Number);
            const el = document.getElementById(`g-${r}-${c}`);
            if (el) el.classList.add('cell-lucky-focus');
        });
    }, 200);
}


// Classifies a grid by cell count into one of the game's four size tiers.
// Small: <100 | Medium: 100–199 | Large: 200–399 | Massive: 400+
function _getGridSizeTier(rows, cols) {
    const cellCount = rows * cols;
    if (cellCount >= 400) return 'massive';
    if (cellCount >= 200) return 'large';
    if (cellCount >= 100) return 'medium';
    return 'small';
}


// Picks a handful of wrong (empty-solution) cells as lucky tiles for this level.
// Right-clicking a lucky tile to mark ✕ awards a free random item (once per level).
// The number of tiles scales with grid size and passive nodes.
function _initLuckyTiles() {
    luckyTiles = new Set();
    luckyRewardClaimed = 0;
    window._outlierHighlighted = new Set();

    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const tier = _getGridSizeTier(rows, cols);
    const isLarge = tier === 'large';
    const isMassive = tier === 'massive';
    const isLargeOrMassive = isLarge || isMassive;

    let tileCount = _calcLuckyTileCount(isLarge, isMassive, isLargeOrMassive);

    // keystone_variance_collapse (221): guarantees at least 1 lucky tile on any grid size.
    if (ptHasSkill('keystone_variance_collapse') && tileCount === 0) {
        tileCount = 1;
    }

    if (tileCount === 0) return;

    // Build a pool of all wrong (non-filled) cells, shuffle, then pick tileCount of them
    const pool = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (cur.grid[r][c] !== 1) pool.push(`${r}-${c}`);

    shuffle(pool);
    for (let i = 0; i < Math.min(tileCount, pool.length); i++) {
        luckyTiles.add(pool[i]);
    }

    _applyOutlierDetectionHighlights();
}


//------------------------------------------------------------------------
//-------------------DEAD RECKONING KEYSTONE-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Replaces each row/col clue span with the total filled count for that line.
// Individual run-length numbers are hidden (only the first span is used).
// Called with a short delay so the grid DOM exists before we modify spans.
function _deadReckoningApplyClues() {
    if (!cur || !window._deadReckoningActive || window._deadReckoningUnlocked) return;

    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;

    // Row clues: show total filled count on the first span, blank the rest
    for (let r = 0; r < rows; r++) {
        const total = sol[r].filter(v => v === 1).length;
        document.querySelectorAll(`[id^="rn-${r}-"]`).forEach((span, i) => {
            span.textContent = i === 0 ? total : '';
        });
    }

    // Col clues: same approach
    for (let c = 0; c < cols; c++) {
        const total = sol.filter(row => row[c] === 1).length;
        document.querySelectorAll(`[id^="cn-${c}-"]`).forEach((span, i) => {
            span.textContent = i === 0 ? total : '';
        });
    }
}

// Checks whether the player has correctly filled 25% of the puzzle.
// If so, unlocks dead reckoning by restoring the exact run-length clue numbers.
// Called from updClues so it re-evaluates after every cell change.
function _deadReckoningCheckUnlock() {
    if (!window._deadReckoningActive || window._deadReckoningUnlocked) return;
    if (!cur) return;

    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const totalFilled = sol.reduce((sum, row) => sum + row.filter(v => v === 1).length, 0);

    let playerFilled = 0;
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (sol[r][c] === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c])) playerFilled++;

    if (playerFilled < Math.ceil(totalFilled * 0.25)) return;

    // Threshold reached — restore exact clue numbers for all rows and cols
    window._deadReckoningUnlocked = true;

    for (let r = 0; r < rows; r++) {
        const rc = clues(sol[r]);
        rc.forEach((val, i) => {
            const span = document.getElementById(`rn-${r}-${i}`);
            if (span) span.textContent = val;
        });
    }

    for (let c = 0; c < cols; c++) {
        const cc = clues(sol.map(row => row[c]));
        cc.forEach((val, i) => {
            const span = document.getElementById(`cn-${c}-${i}`);
            if (span) span.textContent = val;
        });
    }

    showToast(`🧭 ${t('cg_dead_reckoning')}`);
}

// keystone_dead_reckoning (264): initialises the dead reckoning mode at level start.
// Activates the flag and replaces clue numbers with row/col totals after the grid builds.
function _applyDeadReckoningStart() {
    window._deadReckoningActive = false;
    window._deadReckoningUnlocked = false;

    if (!ptHasSkill('keystone_dead_reckoning')) return;

    window._deadReckoningActive = true;

    // Delay so the grid DOM is fully built before we modify clue spans
    setTimeout(() => _deadReckoningApplyClues(), 50);
}


//------------------------------------------------------------------------
//-------------------PASSIVE START-OF-LEVEL EFFECTS----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Rolls probabilistic_start (reveal correct cells) and error_elimination
// (mark wrong cells) at level start. Each node is an independent roll.
// Skipped entirely when keystone_ergodic_field is active.
function _applyProbabilisticStartRolls() {
    if (ptHasSkill('keystone_ergodic_field')) return;

    let reveals = 0;
    if (ptHasSkill('probabilistic_start_1') && Math.random() < 0.10) reveals++;
    if (ptHasSkill('probabilistic_start_2') && Math.random() < 0.15) reveals++;
    if (ptHasSkill('probabilistic_start_3') && Math.random() < 0.20) reveals++;
    if (reveals > 0) revealTiles(reveals);

    let marks = 0;
    if (ptHasSkill('error_elimination_1') && Math.random() < 0.10) marks++;
    if (ptHasSkill('error_elimination_2') && Math.random() < 0.15) marks++;
    if (ptHasSkill('error_elimination_3') && Math.random() < 0.20) marks++;
    if (marks > 0) markWrongTiles(marks);
}

// keystone_null_hypothesis (220): finds the sparsest row and sparsest column,
// then marks all their wrong empty cells at level start.
// Skipped if the oracle is active or keystone_ergodic_field is allocated.
function _applyNullHypothesis() {
    if (!ptHasSkill('keystone_null_hypothesis')) return;
    if (window._oracleActive) return;
    if (ptHasSkill('keystone_ergodic_field')) return;

    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;

    // Identify the row with the fewest filled solution cells
    let minRowFilled = Infinity, targetRow = 0;
    for (let r = 0; r < rows; r++) {
        const filled = sol[r].filter(v => v === 1).length;
        if (filled < minRowFilled) { minRowFilled = filled; targetRow = r; }
    }

    // Identify the column with the fewest filled solution cells
    let minColFilled = Infinity, targetCol = 0;
    for (let c = 0; c < cols; c++) {
        const filled = sol.filter(row => row[c] === 1).length;
        if (filled < minColFilled) { minColFilled = filled; targetCol = c; }
    }

    // Mark all unmarked wrong empty cells in the target row
    const markedIds = [];
    for (let c = 0; c < cols; c++) {
        if (sol[targetRow][c] === 0 && userGrid[targetRow][c] === 0 && !wrongGrid[targetRow][c]) {
            userGrid[targetRow][c] = 2;
            renderCell(targetRow, c);
            markedIds.push(`g-${targetRow}-${c}`);
        }
    }

    // Mark all unmarked wrong empty cells in the target column
    for (let r = 0; r < rows; r++) {
        if (sol[r][targetCol] === 0 && userGrid[r][targetCol] === 0 && !wrongGrid[r][targetCol]) {
            userGrid[r][targetCol] = 2;
            renderCell(r, targetCol);
            markedIds.push(`g-${r}-${targetCol}`);
        }
    }

    // Orange mark pulse so the auto-marks are visible at level start
    if (typeof _applyCellEffect === 'function' && markedIds.length > 0) {
        _applyCellEffect(markedIds, 'mark');
    }
}

// Reveals the supplied cells, fires the cell effect animation, refreshes adjacency
// overlays if the node is active, and then checks for an immediate win.
// Used as a shared helper by reveal-based passive effects.
function _revealCellsAndFinalize(affected) {
    if (affected.length === 0) return;
    if (typeof _applyCellEffect === 'function') {
        _applyCellEffect(affected, 'reveal');
        if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
    }
    checkWin();
}

// central_tendency (234-236): reveals 1 filled cell near the true grid centre per node.
// Cells are sorted by normalised Euclidean distance from the centre point;
// each node reveals the next closest unrevealed filled cell.
// Skipped if the oracle is active or keystone_ergodic_field is allocated.
function _applyCentralTendency() {
    const nodes = (ptHasSkill('central_tendency_1') ? 1 : 0)
        + (ptHasSkill('central_tendency_2') ? 1 : 0)
        + (ptHasSkill('central_tendency_3') ? 1 : 0);
    if (nodes === 0) return;
    if (window._oracleActive) return;
    if (ptHasSkill('keystone_ergodic_field')) return;

    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const cx = (rows - 1) / 2; // fractional centre row
    const cy = (cols - 1) / 2; // fractional centre col

    // Normalised Euclidean distance so row/col scales are comparable
    const distFromCentre = (r, c) => {
        const dr = (r - cx) / (rows / 2);
        const dc = (c - cy) / (cols / 2);
        return Math.sqrt(dr * dr + dc * dc);
    };

    // Sort all unrevealed filled cells nearest-first
    const pool = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (sol[r][c] === 1 && userGrid[r][c] !== 1 && !revealedGrid[r][c])
                pool.push([r, c]);
    pool.sort((a, b) => distFromCentre(a[0], a[1]) - distFromCentre(b[0], b[1]));

    const affected = [];
    for (let n = 0; n < nodes; n++) {
        if (pool.length === 0) break;
        const [r, c] = pool.shift();
        revealedGrid[r][c] = true;
        userGrid[r][c] = 1;
        renderCell(r, c);
        updClues(r, c, true);
        affected.push(`g-${r}-${c}`);
    }

    _revealCellsAndFinalize(affected);
}

// density_mapping (237-239): marks 1 wrong empty cell in the densest row
// and 1 in the densest column. Node 3 extends this to the top-2 rows AND top-2 cols.
// Skipped if the oracle is active or keystone_ergodic_field is allocated.
function _applyDensityMapping() {
    const nodes = (ptHasSkill('density_mapping_1') ? 1 : 0)
        + (ptHasSkill('density_mapping_2') ? 1 : 0)
        + (ptHasSkill('density_mapping_3') ? 1 : 0);
    if (nodes === 0) return;
    if (window._oracleActive) return;
    if (ptHasSkill('keystone_ergodic_field')) return;

    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const lineCount = ptHasSkill('density_mapping_3') ? 2 : 1; // node 3 targets 2 lines
    const markedIds = [];

    // Marks one cell and records it for the mark-pulse VFX at the end.
    const markCell = (r, c) => {
        userGrid[r][c] = 2;
        renderCell(r, c);
        markedIds.push(`g-${r}-${c}`);
    };

    // Sort rows descending by filled-cell count
    const rowsByDensity = Array.from({ length: rows }, (_, r) => r)
        .sort((a, b) => sol[b].filter(v => v === 1).length - sol[a].filter(v => v === 1).length);

    // Sort cols descending by filled-cell count
    const colsByDensity = Array.from({ length: cols }, (_, c) => c)
        .sort((a, b) =>
            sol.filter(row => row[b] === 1).length - sol.filter(row => row[a] === 1).length);

    // Mark 1 random wrong empty cell in each of the lineCount densest rows
    for (let i = 0; i < lineCount; i++) {
        const r = rowsByDensity[i];
        const cands = [];
        for (let c = 0; c < cols; c++)
            if (sol[r][c] === 0 && (userGrid[r][c] === 0 || userGrid[r][c] === 3) && !wrongGrid[r][c])
                cands.push(c);
        if (cands.length > 0) {
            markCell(r, cands[Math.floor(Math.random() * cands.length)]);
        }
    }

    // Mark 1 random wrong empty cell in each of the lineCount densest cols
    for (let i = 0; i < lineCount; i++) {
        const c = colsByDensity[i];
        const cands = [];
        for (let r = 0; r < rows; r++)
            if (sol[r][c] === 0 && (userGrid[r][c] === 0 || userGrid[r][c] === 3) && !wrongGrid[r][c])
                cands.push(r);
        if (cands.length > 0) {
            markCell(cands[Math.floor(Math.random() * cands.length)], c);
        }
    }

    // density_mapping_2: one additional incorrect empty cell in the densest
    // row or the densest column (randomly chosen, falls back to the other
    // line type if the preferred one has no candidates left)
    if (ptHasSkill('density_mapping_2')) {
        const markInRow = (r) => {
            const cands = [];
            for (let c = 0; c < cols; c++)
                if (sol[r][c] === 0 && (userGrid[r][c] === 0 || userGrid[r][c] === 3) && !wrongGrid[r][c])
                    cands.push(c);
            if (cands.length === 0) return false;
            markCell(r, cands[Math.floor(Math.random() * cands.length)]);
            return true;
        };
        const markInCol = (c) => {
            const cands = [];
            for (let r = 0; r < rows; r++)
                if (sol[r][c] === 0 && (userGrid[r][c] === 0 || userGrid[r][c] === 3) && !wrongGrid[r][c])
                    cands.push(r);
            if (cands.length === 0) return false;
            markCell(cands[Math.floor(Math.random() * cands.length)], c);
            return true;
        };

        if (Math.random() < 0.5) {
            if (!markInRow(rowsByDensity[0])) markInCol(colsByDensity[0]);
        } else {
            if (!markInCol(colsByDensity[0])) markInRow(rowsByDensity[0]);
        }
    }

    // Orange mark pulse so the auto-marks are visible at level start
    if (typeof _applyCellEffect === 'function' && markedIds.length > 0) {
        _applyCellEffect(markedIds, 'mark');
    }
}

// sparse_region (240-242): marks 1 wrong empty cell per node in the sparsest
// row or column (whichever has fewer filled cells; randomly broken on a tie).
// Each of the 3 nodes is evaluated independently.
// Skipped if the oracle is active or keystone_ergodic_field is allocated.
function _applySparseRegion() {
    const nodes = (ptHasSkill('sparse_region_1') ? 1 : 0)
        + (ptHasSkill('sparse_region_2') ? 1 : 0)
        + (ptHasSkill('sparse_region_3') ? 1 : 0);
    if (nodes === 0) return;
    if (window._oracleActive) return;
    if (ptHasSkill('keystone_ergodic_field')) return;

    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const markedIds = [];

    for (let n = 0; n < nodes; n++) {
        // Find the sparsest row (fewest filled solution cells)
        let sparsestRow = -1, sparsestRowFilled = Infinity;
        for (let r = 0; r < rows; r++) {
            const filled = sol[r].filter(v => v === 1).length;
            if (filled < sparsestRowFilled) { sparsestRowFilled = filled; sparsestRow = r; }
        }

        // Find the sparsest column
        let sparsestCol = -1, sparsestColFilled = Infinity;
        for (let c = 0; c < cols; c++) {
            const filled = sol.filter(row => row[c] === 1).length;
            if (filled < sparsestColFilled) { sparsestColFilled = filled; sparsestCol = c; }
        }

        // Prefer the sparser of the two; break ties randomly
        const useRow = sparsestRowFilled <= sparsestColFilled
            ? (Math.random() < 0.5 || sparsestCol === -1)
            : false;

        if (useRow && sparsestRow >= 0) {
            const cands = [];
            for (let c = 0; c < cols; c++)
                if (sol[sparsestRow][c] === 0 && (userGrid[sparsestRow][c] === 0 || userGrid[sparsestRow][c] === 3) && !wrongGrid[sparsestRow][c])
                    cands.push(c);
            shuffle(cands);
            cands.slice(0, 1).forEach(c => {
                userGrid[sparsestRow][c] = 2;
                renderCell(sparsestRow, c);
                markedIds.push(`g-${sparsestRow}-${c}`);
            });
        } else if (sparsestCol >= 0) {
            const cands = [];
            for (let r = 0; r < rows; r++)
                if (sol[r][sparsestCol] === 0 && (userGrid[r][sparsestCol] === 0 || userGrid[r][sparsestCol] === 3) && !wrongGrid[r][sparsestCol])
                    cands.push(r);
            shuffle(cands);
            cands.slice(0, 1).forEach(r => {
                userGrid[r][sparsestCol] = 2;
                renderCell(r, sparsestCol);
                markedIds.push(`g-${r}-${sparsestCol}`);
            });
        }
    }

    // Orange mark pulse so the auto-marks are visible at level start
    if (typeof _applyCellEffect === 'function' && markedIds.length > 0) {
        _applyCellEffect(markedIds, 'mark');
    }
}

// marginal_distribution (246-248): reveals 1 edge cell per node (up to 3),
// chosen randomly from the 4 outermost edges (top/bottom row, left/right col).
// Filled edge cells are revealed; empty edge cells are marked as incorrect,
// matching the description ("revealed as either filled or empty").
// Skipped if the oracle is active or keystone_ergodic_field is allocated.
function _applyMarginalDistribution() {
    const nodes = (ptHasSkill('marginal_distribution_1') ? 1 : 0)
        + (ptHasSkill('marginal_distribution_2') ? 1 : 0)
        + (ptHasSkill('marginal_distribution_3') ? 1 : 0);
    if (nodes === 0) return;
    if (window._oracleActive) return;
    if (ptHasSkill('keystone_ergodic_field')) return;

    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;

    // Collect all unrevealed/unmarked edge cells without duplicates
    const seen = new Set();
    const pool = [];
    const addEdgeCell = (r, c) => {
        const key = `${r}-${c}`;
        if (seen.has(key)) return;
        seen.add(key);
        const untouchedFilled = sol[r][c] === 1 && userGrid[r][c] !== 1 && !revealedGrid[r][c];
        const untouchedEmpty = sol[r][c] === 0 && userGrid[r][c] !== 2 && !wrongGrid[r][c];
        if (untouchedFilled || untouchedEmpty)
            pool.push([r, c]);
    };

    for (let c = 0; c < cols; c++) addEdgeCell(0, c);           // top row
    for (let c = 0; c < cols; c++) addEdgeCell(rows - 1, c);    // bottom row
    for (let r = 0; r < rows; r++) addEdgeCell(r, 0);           // left col
    for (let r = 0; r < rows; r++) addEdgeCell(r, cols - 1);    // right col

    shuffle(pool);

    const affected = [];
    const markedAffected = [];
    for (let n = 0; n < nodes; n++) {
        if (pool.length === 0) break;
        const [r, c] = pool.shift();
        if (sol[r][c] === 1) {
            revealedGrid[r][c] = true;
            userGrid[r][c] = 1;
            renderCell(r, c);
            updClues(r, c, true);
            affected.push(`g-${r}-${c}`);
        } else {
            userGrid[r][c] = 2;
            systemMarkedGrid[r][c] = true;
            renderCell(r, c);
            markedAffected.push(`g-${r}-${c}`);
        }
    }

    _revealCellsAndFinalize(affected);
    if (typeof _applyCellEffect === 'function' && markedAffected.length > 0) {
        _applyCellEffect(markedAffected, 'mark');
    }
}

// interquartile_vision (258-259): fires a centred field scan on large grids (≥200 cells).
// Duration is 2s for node 1, +1s for node 2 (resolved by _interquartileVisionDuration).
// Delayed to ensure the grid DOM is fully rendered before the scan runs.
function _applyInterquartileVision() {
    if (!ptHasSkill('interquartile_vision_1')) return;
    if (window._oracleActive) return;
    if (!cur) return;

    const rows = cur.grid.length, cols = cur.grid[0].length;
    if (rows * cols < 200) return; // only fires on large grids

    const scanSize = Math.max(rows, cols); // cover the full centre region
    const scanDur = _interquartileVisionDuration();

    setTimeout(() => {
        if (typeof _executeFieldScanLegacy === 'function') _executeFieldScanLegacy(Math.floor(rows / 2), Math.floor(cols / 2), scanSize, scanDur);
    }, 300);
}

// Spawns the 5-flower bloom animation around a revealed cell for Syla's forest affinity.
function triggerSylaFlowerEffect(coords) {
    if (!coords || coords.length === 0) return;

    coords.forEach(({ row, col }) => {
        const cellEl = document.getElementById(`g-${row}-${col}`);
        if (!cellEl) return;

        const originalPos = window.getComputedStyle(cellEl).position;
        if (originalPos === 'static') {
            cellEl.style.position = 'relative';
        }

        const container = document.createElement('div');
        container.className = 'syla-flower-container';

        const floraPool = ['🌸', '🌼', '🌷', '🌿', '🌱', '🌻'];

        // Define the 5 specific zones relative to the cell boundaries
        // (Adjust the percentages below if you want them closer together or further out!)
        const positions = [
            { name: 'center', left: 50, top: 50, delay: 0.0 },
            { name: 'above', left: 50, top: 10, delay: 0.2 }, // 10% from the top
            { name: 'below', left: 50, top: 90, delay: 0.2 }, // 90% from the top
            { name: 'left', left: 10, top: 50, delay: 0.2 }, // 10% from the left
            { name: 'right', left: 90, top: 50, delay: 0.2 }  // 90% from the left
        ];

        positions.forEach(pos => {
            const flower = document.createElement('span');
            flower.className = 'syla-sprouted-flower';
            flower.textContent = floraPool[Math.floor(Math.random() * floraPool.length)];

            // Add a tiny bit of random organic "jitter" so they aren't completely line-perfect
            const jitterX = (Math.random() * 8) - 4; // -4% to +4%
            const jitterY = (Math.random() * 8) - 4; // -4% to +4%

            // Apply coordinates
            flower.style.left = `${pos.left + jitterX}%`;
            flower.style.top = `${pos.top + jitterY}%`;

            // Base positional delay + a tiny random variation for natural feeling
            const finalDelay = pos.delay + (Math.random() * 0.1);
            flower.style.animationDelay = `${finalDelay}s`;

            // Unique visual sizes/rotations per flower
            const randomScale = 0.7 + Math.random() * 0.5;
            const randomRotation = Math.random() * 40 - 20;
            flower.style.setProperty('--target-scale', randomScale);
            flower.style.setProperty('--target-rotate', `${randomRotation}deg`);

            container.appendChild(flower);
        });

        cellEl.appendChild(container);

        setTimeout(() => {
            container.remove();
        }, 5200); // 5.2 seconds to clear after the delayed blooms finish
    });
}

// Syla — Nature's Aid: on forest levels, the grove reveals one correct tile for her.
function _applySylaForestAffinity() {
    if (!_charIs('syla')) return;
    if (!cur || !cur.isForestLevel) return;
    const revealedCoords = revealTiles(1);
    Audio_Manager.playSFX('syla_nature');
    showToast(t('cg_syla_bonus'));

    // Pass those coordinates directly into the flower animation!
    triggerSylaFlowerEffect(revealedCoords);
}

// Runs all passive start-of-level effects in the correct order.
// keystone_ergodic_field suppresses most individual roll effects;
// that guard is handled inside each sub-function where applicable.
function _applyPassiveStartEffects() {
    if (ptHasSkill('keystone_ergodic_field')) return;

    _applyProbabilisticStartRolls();
    _applyNullHypothesis();
    _applyCentralTendency();
    _applyDensityMapping();
    _applySparseRegion();
    _applyMarginalDistribution();
    _applyInterquartileVision();
    _applyDeadReckoningStart();
    _applyMaximumLikelihood();
}


//------------------------------------------------------------------------
//-------------------COMPLETION GLIMPSE-----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Hides the completion-glimpse bar and clears any pending auto-hide timer.
// Shared by level cleanup (start-level.js) and the bar's own auto-hide timeout.
function _hideCompletionGlimpseBar() {
    const bar = document.getElementById('completion-glimpse-bar');
    if (bar) bar.classList.add('hidden');
    if (window._completionGlimpseTimer) {
        clearTimeout(window._completionGlimpseTimer);
        window._completionGlimpseTimer = null;
    }
}

// completion_glimpse (216-218): shows the level's reveal text in the glimpse bar
// for 30s per allocated node (30/60/90s total).
// The bar is hidden automatically when the timer expires.
function _applyCompletionGlimpse() {
    if (!ptHasSkill('completion_glimpse_1')) return;

    let duration = 30000;
    if (ptHasSkill('completion_glimpse_2')) duration += 30000;
    if (ptHasSkill('completion_glimpse_3')) duration += 30000;

    const text = lvText(cur, 'reveal');
    if (!text) return;

    const bar = document.getElementById('completion-glimpse-bar');
    const textEl = document.getElementById('completion-glimpse-text');
    if (!bar || !textEl) return;

    textEl.textContent = text;
    bar.classList.remove('hidden');

    // Clear any timer left from a previous level before setting the new one
    if (window._completionGlimpseTimer) clearTimeout(window._completionGlimpseTimer);
    window._completionGlimpseTimer = setTimeout(_hideCompletionGlimpseBar, duration);
}