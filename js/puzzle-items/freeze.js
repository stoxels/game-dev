//------------------------------------------------------------------------
//-------------------FREEZE — TIME FREEZE----------------------
//------------------------------------------------------------------------

// freeze — freezes the timer for 2 s and activates a temporary shield.
function _useFreeze(id, def) {
    const FREEZE_DURATION_MS = 2000;

    timerFrozen = true;
    window._freezeActive = true;
    // Null Hypothesis keystone skips the shield grant
    if (!ptHasSkill('keystone_null_hypothesis')) shieldActive = true;
    updTimer();
    playItemEffect(id);

    // Track clutch freezes (used with ≤ 10 s remaining)
    if (timerSecs <= 10) trackAchStat('freezeClutches');

    // Countdown ticker shown in the timer element
    let remaining = 2;
    const freezeTick = setInterval(() => {
        remaining--;
        const el = document.getElementById('timer-val');
        if (el) el.textContent = `❄️ ${remaining}s`;
        if (remaining <= 0) clearInterval(freezeTick);
    }, 1000);

    setTimeout(() => {
        timerFrozen = false;
        window._freezeActive = false;
        shieldActive = false;
        clearInterval(freezeTick);
        updTimer();
        showToast(t('item_freeze_ended'));
    }, FREEZE_DURATION_MS);

    return `${def.icon} ${t('item_freeze_msg')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// ❄️ Freeze — icy blizzard creeps in from the edges.
// Delegates to the shared blizzard system defined in class.js.
function _fxFreeze() {
    _startBlizzardEffect(2200);
    Audio_Manager.playSFX('time_freeze');
}
