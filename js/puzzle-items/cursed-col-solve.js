//------------------------------------------------------------------------
//-------------------CURSED COL SOLVE — VORTEX----------------------
//------------------------------------------------------------------------

// cursedColSolve — solves 3 columns; downside erases 1 pre-existing column.
function _useCursedColSolve(id, def) {
    _trackWitchImmuneCursedUse();

    const preFilledCols = _getPreFilledCols();
    const revealed = solveCols(3, 'item');
    const erased = _resolveCursedColErasureDownside(1, preFilledCols);

    playItemEffect(id);
    if (revealed > 0) checkWin();
    return `🌪️ ${t('item_cursed_col_both').replace('{r}', revealed).replace('{e}', erased)}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: creates the dark "sucked in" column strips for Vortex.
function _fxMakeVortexStrips(container, r) {
    const cols = cur?.grid?.[0]?.length || 5;
    const colW = r.width / cols;

    for (let i = 0; i < Math.min(cols, 8); i++) {
        const strip = document.createElement('div');
        strip.className = 'fx-vortex-strip';
        strip.style.cssText = `
            position:absolute;
            top:${r.top}px; height:${r.height}px;
            left:${r.left + colW * i}px; width:${colW}px;
            animation:fx-vortex-strip-swirl 0.9s ease-in ${i * 0.06}s forwards;
        `;
        container.appendChild(strip);
    }
}

// 🌪️ Vortex — spinning tornado sweeps columns.
function _fxVortex() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 2000, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    // Swirling debris particles spread across the whole grid
    _fxSpawnParticles({
        ...PARTICLES.vortexDebris,
        count: 28, sizeMin: 10, sizeMax: 20,
        container: overlay,
        startX: cx, startY: cy,
        spreadX: r.width * 0.8, spreadY: r.height * 0.8,
        duration: 1400, cssClass: 'fx-vortex-debris',
    });

    _fxMakeVortexStrips(overlay, r);
    _fxMakeIcon(r.wrap, '🌪️', cx, cy, 80, 'animation:fx-vortex-spin 1.4s ease-out forwards;', 1800);

    Audio_Manager.playSFX('vortex');
}
