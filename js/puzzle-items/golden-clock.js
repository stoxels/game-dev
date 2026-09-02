//------------------------------------------------------------------------
//-------------------GOLDEN CLOCK----------------------
//------------------------------------------------------------------------

// goldenClock — halts the timer until 3 more mistakes are made.
function _useGoldenClock(id, def) {
    window._goldenClockActive = true;
    window._goldenClockMistakesLeft = 3;
    playItemEffect(id);

    // Update the mistake display so the player immediately sees the limit
    _setMistakeCounterText(' 🕰️');

    return `${def.icon} ${t('itm_golden_clock_active')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// 🕰️ Golden Clock — clock effect + persistent golden tint.
function _fxGoldenClock() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    // Reuse the standard clock visual, then layer a gold tint on top
    _fxClock();

    const overlay = _fxOverlay(r.wrap, 2000, `z-index:${FX_Z.base - 1};`);
    _fxMakeGoldTintFill(overlay, r);

    Audio_Manager.playSFX('golden_clock');
}
