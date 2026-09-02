//------------------------------------------------------------------------
//-------------------CURSED REVEAL — CURSED LENS----------------------
//------------------------------------------------------------------------

// cursedReveal — reveals 6 cells; downside clears all wrong marks.
function _useCursedReveal(id, def) {
    _trackWitchImmuneCursedUse();

    revealTiles(6, 'item');

    // Route the downside through the shared curse helpers so Witch immunity,
    // Curse Embrace and the first-use protection of Veil of Purity all apply
    // here as well. A result of 0 means the downside is fully suppressed;
    // when Veil of Purity is broken the helper also shows the amplification
    // toast (the mark-clear itself is already maximal, so it cannot grow).
    const downsideMult = _cursedDownsideDuration(1000) / 1000;
    if (downsideMult <= 0) {
        playItemEffect(id);
        return `☠️ ${t('itm_cursed_reveal_protected')}`;
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
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: creates the sickly green tint rect over the grid.
function _fxMakeCursedTint(container, r) {
    const tint = document.createElement('div');
    tint.className = 'fx-cursed-tint';
    tint.style.cssText = `
        position:absolute;
        left:${r.left}px; top:${r.top}px;
        width:${r.width}px; height:${r.height}px;
    `;
    container.appendChild(tint);
}

// ☠️ Cursed Reveal — sickly green skull flash + ✕ marks dissolve.
function _fxCursedReveal() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeCursedTint(overlay, r);
    _fxMakeIcon(r.wrap, '☠️', cx, cy, 72, 'animation:fx-skull-rise 1.1s ease-out forwards;', 1400);

    // Dissolving ✕ particles burst from the centre
    _fxSpawnParticles({
        ...PARTICLES.cursedCrosses,
        count: 16, sizeMin: 16, sizeMax: 26,
        container: overlay,
        startX: cx, startY: cy,
        spreadX: r.width, spreadY: r.height,
        duration: 900, cssClass: 'fx-cursed-cross',
    });

    Audio_Manager.playSFX('cursed_lens');
}
