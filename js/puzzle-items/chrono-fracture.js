//------------------------------------------------------------------------
//-------------------CHRONOFRACTURE----------------------
//------------------------------------------------------------------------

function _useChronoFracture(id, def) {
    window._chronoFractureActive = true;
    _trackWitchImmuneCursedUse()
    playItemEffect(id);
    return `${def.icon} ${t('itm_chronofracture_active')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

function _fxChronoFracture() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    // Reuse the standard clock visual, then layer a gold tint on top
    _fxClock();

    const overlay = _fxOverlay(r.wrap, 2000, `z-index:${FX_Z.base - 1};`);
    _fxMakeGoldTintFill(overlay, r);

    Audio_Manager.playSFX('golden_clock');
}
