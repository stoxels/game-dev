//------------------------------------------------------------------------
//-------------------ROW / COL SOLVE — SET SQUARE / RULER----------------------
//------------------------------------------------------------------------

// rowSolve — fully reveals one random unsolved row.
function _useRowSolve(id, def) {
    const n = solveRows(1, 'item');
    playItemEffect(id);
    if (n > 0) checkWin();
    return n > 0
        ? `${def.icon} ${t('item_row_solved')}`
        : `${def.icon} ${t('item_row_solved_none')}`;
}

// colSolve — fully reveals one random unsolved column.
function _useColSolve(id, def) {
    const n = solveCols(1, 'item');
    playItemEffect(id);
    if (n > 0) checkWin();
    return n > 0
        ? `${def.icon} ${t('item_col_solved')}`
        : `${def.icon} ${t('item_col_solved_none')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: creates the full-grid horizontal sweep bar for RowSolve.
function _fxMakeRowSolveSweep(container, r) {
    const sweep = document.createElement('div');
    sweep.className = 'fx-rowsolve-bar';
    sweep.style.cssText = `
        position:absolute;
        top:${r.top}px; height:${r.height}px;
        left:${r.left - r.width}px; width:${r.width}px;
        animation:fx-rowsolve-sweep 0.65s ease-out forwards;
        --sweep-dist:${r.width * 2}px;
    `;
    container.appendChild(sweep);
}

// Helper: creates the per-row shimmer lines for RowSolve.
function _fxMakeRowSolveLines(container, r) {
    const rows = cur?.grid?.length || 5;
    const rowH = r.height / rows;
    for (let i = 0; i < rows; i++) {
        const line = document.createElement('div');
        line.className = 'fx-rowsolve-line';
        line.style.cssText = `
            position:absolute;
            left:${r.left}px; width:${r.width}px;
            top:${r.top + rowH * i + rowH / 2 - 1}px; height:2px;
            opacity:0;
            animation:fx-rowsolve-line-flash 0.4s ease-out ${0.1 + i * 0.03}s forwards;
        `;
        container.appendChild(line);
    }
}

// 📐 Row Solve — a golden sweep flashes across the full grid height.
function _fxRowSolve() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeRowSolveSweep(overlay, r);
    _fxMakeRowSolveLines(overlay, r);
    _fxMakeIcon(r.wrap, '📐', cx, cy, 56, 'animation:fx-icon-pop 0.6s ease-out forwards;', 1000);

    Audio_Manager.playSFX('set_square');
}

// Helper: creates the full-grid vertical sweep bar for ColSolve.
function _fxMakeColSolveSweep(container, r) {
    const sweep = document.createElement('div');
    sweep.className = 'fx-colsolve-bar';
    sweep.style.cssText = `
        position:absolute;
        left:${r.left}px; width:${r.width}px;
        top:${r.top - r.height}px; height:${r.height}px;
        animation:fx-colsolve-sweep 0.65s ease-out forwards;
        --sweep-dist:${r.height * 2}px;
    `;
    container.appendChild(sweep);
}

// Helper: creates the per-column shimmer lines for ColSolve.
function _fxMakeColSolveLines(container, r) {
    const cols = cur?.grid?.[0]?.length || 5;
    const colW = r.width / cols;
    for (let i = 0; i < cols; i++) {
        const line = document.createElement('div');
        line.className = 'fx-colsolve-line';
        line.style.cssText = `
            position:absolute;
            top:${r.top}px; height:${r.height}px;
            left:${r.left + colW * i + colW / 2 - 1}px; width:2px;
            opacity:0;
            animation:fx-colsolve-line-flash 0.4s ease-out ${0.1 + i * 0.03}s forwards;
        `;
        container.appendChild(line);
    }
}

// 📏 Col Solve — a golden sweep flashes across the full grid width.
function _fxColSolve() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeColSolveSweep(overlay, r);
    _fxMakeColSolveLines(overlay, r);
    _fxMakeIcon(r.wrap, '📏', cx, cy, 56, 'animation:fx-icon-pop 0.6s ease-out forwards;', 1000);

    Audio_Manager.playSFX('ruler');
}
