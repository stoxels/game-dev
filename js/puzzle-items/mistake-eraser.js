//------------------------------------------------------------------------
//-------------------MISTAKE ERASER — TUTOR / PROFESSOR / SCHOLAR / GRAND MENTOR----------------------
//------------------------------------------------------------------------

// mistakeEraser / mistakeEraser4 / mistakeEraser6 / mistakeEraserAll —
// reduces the current mistake count, optionally granting bonus time via
// the Time Well Spent passive.
function _useMistakeEraser(id, def) {
    if (mistakeCount === 0) {
        showToast(t('item_mistake_erased_none'));
        return null;
    }

    const isEraseAll = id === 'mistakeEraserAll';
    const baseCount = isEraseAll ? mistakeCount : (parseInt(id.replace('mistakeEraser', '')) || 2);
    const reduceBy = _calcMistakeEraserCount(baseCount, isEraseAll);

    const before = mistakeCount;
    mistakeCount = Math.max(0, mistakeCount - reduceBy);
    playItemEffect(id);
    const removed = before - mistakeCount;
    _levelMistakesErased += removed;

    if (removed > 0) questStat_mistakesRemoved(removed);

    if (removed > 0 && !ptHasSkill('keystone_gamblers_ruin')) {
        let bonusSecs = 0;
        if (ptHasSkill('time_well_spent_1')) bonusSecs = 30;
        if (ptHasSkill('time_well_spent_2')) bonusSecs = 60;
        if (ptHasSkill('time_well_spent_3')) bonusSecs = 90;
        if (bonusSecs > 0) {
            const before2 = timerSecs;
            timerSecs += bonusSecs * removed;
            _trackTimerDelta(before2, timerSecs);
            updTimer();
        }
    }

    // Full HUD sync: refreshes the top-left mistake counter (including the
    // "x / y" format on endgame maps), the objectives strip, and re-checks
    // the map's mistake limit so erased mistakes restore the budget.
    if (typeof _updateMistakeCounterHUD === 'function') {
        _updateMistakeCounterHUD();
    } else {
        _setMistakeCounterText();
    }

    return removed > 0
        ? `${def.icon} ${t('item_mistake_erased').replace('{n}', removed)}`
        : `${def.icon} ${t('item_mistake_erased_none')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: creates the three diagonal chalk smear divs.
function _fxMakeChalkSmears(container, r) {
    for (let i = 0; i < 3; i++) {
        const smear = document.createElement('div');
        smear.className = 'fx-chalk-smear';
        smear.style.cssText = `
            position:absolute;
            left:${r.left + r.width * (0.2 + i * 0.25)}px;
            top:${r.top + r.height * 0.4}px;
            animation:fx-chalk-wipe 0.5s ease-out ${i * 0.12}s forwards;
        `;
        container.appendChild(smear);
    }
}

// 🎓 Mistake Eraser — chalk dust smears clear mistakes from the board.
// Variant-specific SFX is chosen via MISTAKE_ERASER_SFX lookup.
function _fxMistakeEraser(defId) {
    Audio_Manager.playSFX(MISTAKE_ERASER_SFX[defId] || 'tutor');

    const r = _fxGetPuzzleRect();
    if (!r) return;

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    const overlay = _fxOverlay(r.wrap, 1300);
    _fxMakeChalkSmears(overlay, r);
    _fxMakeIcon(r.wrap, '🎓', cx, cy, 56, 'animation:fx-icon-pop 0.6s ease-out forwards;', 900);
}
