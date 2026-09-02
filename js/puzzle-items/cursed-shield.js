//------------------------------------------------------------------------
//-------------------CURSED SHIELD — DEMON EYE----------------------
//------------------------------------------------------------------------

// cursedShield — activates shield and reveals 2 cells; downside blacks out row clues.
function _useCursedShield(id, def) {
    _trackWitchImmuneCursedUse();

    shieldActive = true;
    revealTiles(2, 'item');
    playItemEffect(id);

    _resolveCursedBlackoutDownside(30000, true, false); // black out rows only

    return `👁️ ${t('item_cursed_shield_both')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: creates the dark-red scan lines that creep down the grid.
function _fxMakeEyeScanLines(container, r) {
    for (let i = 0; i < 5; i++) {
        const line = document.createElement('div');
        line.className = 'fx-eye-scanline';
        line.style.cssText = `
            position:absolute;
            left:${r.left}px; width:${r.width}px;
            top:${r.top + (r.height / 5) * i}px; height:${r.height / 5}px;
            animation:fx-scanline-darken 0.5s ease-in ${0.6 + i * 0.1}s forwards;
        `;
        container.appendChild(line);
    }
}

// 👁️ Cursed Shield — demonic eye opens, then rows black out.
// 👁️ Cursed Shield — demonic eye opens, then rows black out.
function _fxCursedShield() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeEyeScanLines(overlay, r);
    _fxMakeIcon(r.wrap, '👁️', cx, cy, 80, 'animation:fx-eye-open 1.3s ease-out forwards;', 1800);

    _fxShieldBorderAdd();

    Audio_Manager.playSFX('demon_eye');
}
