//------------------------------------------------------------------------
//-------------------CURSED ROW SOLVE — TIDAL WAVE----------------------
//------------------------------------------------------------------------

// cursedRowSolve — solves 3 rows; downside erases 1 pre-existing row.
function _useCursedRowSolve(id, def) {
    _trackWitchImmuneCursedUse();

    const preFilledRows = _getPreFilledRows();
    const revealed = solveRows(3, 'item');
    const erased = _resolveCursedRowErasureDownside(1, preFilledRows);

    playItemEffect(id);
    if (revealed > 0) checkWin();
    return `🌊 ${t('item_cursed_row_both').replace('{r}', revealed).replace('{e}', erased)}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: creates one tidal wave div at the given pass index.
// Opacity decreases with each successive wave to fade them out.
function _fxMakeWave(container, r, pass) {
    const w = document.createElement('div');
    w.className = 'fx-tidal-wave';
    w.style.cssText = `
        position:absolute;
        top:${r.top}px; height:${r.height}px;
        left:${r.left - r.width}px; width:${r.width * 1.3}px;
        animation:fx-wave-sweep 0.7s ease-in forwards;
        --wave-dist:${r.width * 2.5}px;
        opacity:${0.7 - pass * 0.18};
    `;
    container.appendChild(w);
}

// 🌊 Tidal Wave — waves of blue sweep across the grid multiple times.
function _fxTidalWave() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 2000, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    // Three successive wave passes, each slightly delayed and more transparent
    for (let wave = 0; wave < 3; wave++) {
        setTimeout(() => _fxMakeWave(overlay, r, wave), wave * 280);
    }

    _fxMakeIcon(r.wrap, '🌊', cx, cy, 72,
        'animation:fx-icon-pop 0.55s ease-out 0.2s forwards; opacity:0;', 1200);

    Audio_Manager.playSFX('tidal_wave');
}
