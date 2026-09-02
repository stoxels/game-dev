//------------------------------------------------------------------------
//-------------------THE WITCH----------------------
//------------------------------------------------------------------------

// theWitch — pays −10 min upfront in exchange for 60 s of full cursed
// immunity (makes subsequent cursed items downside-free for that window).
function _useTheWitch(id, def) {
    const before = timerSecs;
    timerSecs = Math.max(0, timerSecs - 600);
    _trackTimerDelta(before, timerSecs);
    updTimer();

    window._cursedImmune = true;
    playItemEffect(id);
    showToast(`🧙 ${t('itm_witch_immunity')}`);

    setTimeout(() => {
        window._cursedImmune = false;
        showToast(`🧙 ${t('itm_witch_faded')}`);
    }, 60000);

    return ''; // toast was already shown above
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// 🧙 The Witch — purple smoky swirl of arcane particles.
function _fxTheWitch() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 2000, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxSpawnParticles({
        ...PARTICLES.witchSmoke,
        count: 24, sizeMin: 12, sizeMax: 22,
        container: overlay,
        startX: cx, startY: cy,
        spreadX: r.width * 0.9, spreadY: r.height * 0.9,
        duration: 1400, cssClass: 'fx-artifact-star',
    });

    _fxMakeIcon(r.wrap, '🧙', cx, cy, 80, 'animation:fx-skull-rise 1.2s ease-out forwards;', 1600);

    Audio_Manager.playSFX('the_witch');
}
