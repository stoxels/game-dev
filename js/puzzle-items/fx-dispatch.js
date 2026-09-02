//------------------------------------------------------------------------
//-------------------FX DISPATCH----------------------
//------------------------------------------------------------------------

// playItemEffect(defId) — routes an item id to its visual effect
// function. The effect implementations live in the per-item files; this
// dispatcher is the only place that references them by name.

function playItemEffect(defId) {
    if (!defId) return;

    // ── REVEAL ────────────────────────────────────────────────
    if (defId === 'reveal1') return _fxCandle();
    if (defId === 'reveal2') return _fxMagnifier();
    if (defId === 'reveal3') return _fxSpyglass();
    if (defId === 'reveal4') return _fxScanner();

    // ── MARK-WRONG ────────────────────────────────────────────
    if (defId === 'markWrong2') return _fxEraser();
    if (defId === 'markWrong4') return _fxSweeper();
    if (defId === 'markWrong6') return _fxErrorMagnet();
    if (defId === 'markWrong8') return _fxErrorGem();

    // ── ADD TIME ──────────────────────────────────────────────
    if (defId === 'addTime60') return _fxHourglass();
    if (defId === 'addTime300') return _fxStopwatch();
    if (defId === 'addTime600') return _fxClock();
    if (defId === 'addTime900') return _fxChronobolt();

    // ── UTILITY ───────────────────────────────────────────────
    if (defId === 'freeze') return _fxFreeze();
    if (defId === 'shield') return _fxShield();
    if (defId === 'rowSolve') return _fxRowSolve();
    if (defId === 'colSolve') return _fxColSolve();
    if (defId === 'surveyScope') return _fxSurveyScope();
    if (defId === 'scoutPrimer') return _fxScoutPrimer();
    if (defId === 'artifactComplete') return _fxArtifact();
    if (defId === 'mistakeEraser' ||
        defId === 'mistakeEraser4' ||
        defId === 'mistakeEraser6' ||
        defId === 'mistakeEraserAll') return _fxMistakeEraser(defId);

    // ── CURSED ────────────────────────────────────────────────
    if (defId === 'cursedReveal') return _fxCursedReveal();
    if (defId === 'cursedTime') return _fxCursedTime();
    if (defId === 'cursedShield') return _fxCursedShield();
    if (defId === 'cursedRowSolve') return _fxTidalWave();
    if (defId === 'cursedColSolve') return _fxVortex();
    if (defId === 'cursedRowCol') return _fxChaosGrid();

    // ── PEARLS ────────────────────────────────────────────────
    if (defId === 'pearlOfHaste') return _fxPearl('#88aaff');
    if (defId === 'pearlOfSwiftness') return _fxPearl('#cc88ff');
    if (defId === 'grandPearl') return _fxPearl('#e0e0e0');

    // ── KEYSTONES ─────────────────────────────────────────────
    if (defId === 'theWitch') return _fxTheWitch();
    if (defId === 'goldenClock') return _fxGoldenClock();
    if (defId === 'shadowSeal') return _fxShadowSeal();

    if (defId === 'chronoFracture') return _fxChronoFracture();
}
