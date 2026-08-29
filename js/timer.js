//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Seconds remaining on the clock. Set in startLevel() once the mode
// (normal vs time trial) is known.
let timerSecs = 0;

// ID returned by setInterval — kept so we can cancel the loop via
// clearInterval() in stopTimer() / pauseTimer().
let timerInterval = null;

//------------------------------------------------------------------------
//-------------------LEVEL TIMER STAT TRACKING-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Records how timerSecs actually changed between two points, adding the
// difference to the appropriate level-total tracker (see state.js).
// Uses the real before/after delta (not the raw amount an effect "tried"
// to add/subtract) so totals stay accurate even when clamped by
// Math.min(...,3600) or Math.max(0,...).
function _trackTimerDelta(beforeSecs, afterSecs) {
    const delta = afterSecs - beforeSecs;
    if (delta > 0) _levelTimeAdded += delta;
    else if (delta < 0) _levelTimeLost += -delta;
}


//------------------------------------------------------------------------
//-------------------TIMER DISPLAY HELPERS--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the MM:SS string for a given number of seconds (never goes
// below "00:00").
function _formatTimerDisplay(totalSecs) {
    const safeSecs = Math.max(0, totalSecs);
    const m = Math.floor(safeSecs / 60);
    const s = safeSecs % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}


// Returns the CSS class name that matches the current urgency level, or
// an empty string when the timer is in its normal state.
//   'danger'  — ≤ 60 s  — red fast-blink
//   'warn'    — ≤ 180 s — orange slow-blink
//   ''        — > 180 s — default accent colour
function _getTimerUrgencyClass(secs) {
    if (secs <= 60) return 'danger';
    if (secs <= 180) return 'warn';
    return '';
}


//------------------------------------------------------------------------
//-------------------LOW-TIME VIGNETTE------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the vignette tier class for the current timerSecs, or '' when
// above all thresholds. Mirrors _getTimerUrgencyClass()'s breakpoints but
// drives the full-screen edge effect instead of just the clock text.
//   'ltv-tier3' — ≤ 120s  (2 min, strongest)
//   'ltv-tier2' — ≤ 300s  (5 min)
//   'ltv-tier1' — ≤ 600s  (10 min)
//   ''          — > 600s
function _getLowTimeVignetteTier(secs) {
    if (secs <= 120) return 'ltv-tier3';
    if (secs <= 300) return 'ltv-tier2';
    if (secs <= 600) return 'ltv-tier1';
    return '';
}

// Applies (or clears) the correct tier class on the vignette element.
// Suppressed while the timer is frozen or Golden Clock has paused the
// countdown, since the remaining time isn't actually draining right now.
function _applyLowTimeVignette() {
    const el = document.getElementById('low-time-vignette');
    if (!el) return;

    el.classList.remove('ltv-tier1', 'ltv-tier2', 'ltv-tier3');

    // Setting disabled, or timer frozen / Golden Clock active — no vignette
    if (!SETTINGS.lowTimeVignette || timerFrozen || window._goldenClockActive) return;

    const tier = _getLowTimeVignetteTier(timerSecs);
    if (tier) el.classList.add(tier);
}


//------------------------------------------------------------------------
//-------------------LOW-HEALTH VIGNETTE----------------------------------
//------------------------------------------------------------------------

// Returns the vignette tier for the current health percentage, or '' when
// above the threshold. Independent from the timer vignette so both can be
// visible simultaneously (blue for time, red for health).
//   'lhv-active' — ≤ 35% HP
//   ''           — > 35% HP
function _getLowHealthVignetteTier(pct) {
    if (pct <= 0.35) return 'lhv-active';
    return '';
}

// Applies (or clears) the correct tier class on the health vignette element.
// Suppressed only by its own settings toggle — health vignette is not tied
// to timerFrozen / Golden Clock. Uses SETTINGS.lowHealthVignette (falls back
// to lowTimeVignette if the new key is missing from an old save).
function _applyLowHealthVignette() {
    const el = document.getElementById('low-health-vignette');
    if (!el) return;

    el.classList.remove('lhv-active');

    const healthEnabled = (typeof SETTINGS.lowHealthVignette !== 'undefined')
        ? SETTINGS.lowHealthVignette
        : SETTINGS.lowTimeVignette;
    if (!healthEnabled) return;

    const max = (typeof playerMaxHP !== 'undefined' && playerMaxHP > 0) ? playerMaxHP : 100;
    const curHP = (typeof playerCurrentHP !== 'undefined') ? playerCurrentHP : max;
    if (max <= 0) return;

    const pct = curHP / max;
    // Don't show vignette when dead
    if (pct <= 0) return;

    const tier = _getLowHealthVignetteTier(pct);
    if (tier) el.classList.add(tier);
}



// Applies the correct colour / animation class to the #timer-val element.
// When the timer is frozen by the Freeze item or a class skill the element
// gets an icy-blue inline colour that overrides the CSS classes.
function _applyTimerDisplayState(el) {
    // Always reset to the base class first so stale classes don't linger.
    el.className = 'timer-val';
    el.style.color = '';

    if (timerFrozen) {
        el.style.color = '#6cf'; // icy blue — overrides CSS
        return;
    }

    const urgencyClass = _getTimerUrgencyClass(timerSecs);
    if (urgencyClass) el.classList.add(urgencyClass);
}


// updTimer — refreshes the #timer-val element to match timerSecs and
// re-applies urgency styling. Also called by applyPenalty() (input.js)
// so the display updates immediately when a mistake is made.
function updTimer() {
    const el = document.getElementById('timer-val');
    if (el) el.textContent = _formatTimerDisplay(timerSecs);
    if (el) _applyTimerDisplayState(el);
    _applyLowTimeVignette();
    _applyLowHealthVignette();

    // Notify the passive skill tracker every tick (no-op when unavailable).
    if (typeof PassiveTracker !== 'undefined') PassiveTracker.onTimerTick();

   
}




//------------------------------------------------------------------------
//-------------------TIMER INTERVAL CONTROL---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Shared low-level teardown used by both stopTimer() and pauseTimer() —
// they behave identically, just called from different semantic contexts.
function _clearTimerInterval() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}


// Cancels the active countdown interval. Safe to call even when no
// interval is running. Called on level end, navigation away, and at the
// start of startTimer() to prevent duplicate intervals.
function stopTimer() {
    _clearTimerInterval();
}


// Pauses the countdown without resetting timerSecs. The timer can be
// resumed with resumeTimer().
function pauseTimer() {
    _clearTimerInterval();
}




//------------------------------------------------------------------------
//-------------------TIMER LOSS HANDLER-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Shows the loss overlay with the translated title, mistake count, and
// retry prompt. dead = true and stopTimer() are already called by the
// tick loop before this function runs.
function timesUp() {
    // Endgame map runs must never show the generic lose overlay with a
    // Retry button — the player keeps loot and returns via the map-failed
    // screen (_egEndMapDefeated). Intercept timer defeats directly here
    // instead of relying on the async MutationObserver fallback in
    // endgame-encounter.js, which would otherwise flash the overlay first.
    // Campaign / story mode is unaffected (guard checks _egIsActive).
    if (typeof _egIsActive === 'function' && _egIsActive()) {
        if (typeof _egEndMapDefeated === 'function') {
            if (cur) window._lastFailedGi = cur.gIdx;
            const title = (typeof t === 'function') ? t('eg_map_failed') : 'Map Failed';
            const sub = (typeof t === 'function') ? t('ov_lose') : "TIME'S UP!";
            const handled = _egEndMapDefeated(title, sub);
            if (handled !== false) return;
        }
    }

    // Record the failed level for the bounceback achievement so scoring.js
    // can detect an immediate retry win on the same level.
    if (cur) window._lastFailedGi = cur.gIdx;

    document.getElementById('lose-title').textContent = t('ov_lose');
    document.getElementById('lose-sub').textContent =
        `${mistakeCount} ${mistakeCount !== 1 ? t('ov_win_mistakes') : t('ov_win_mistake')}. ${t('btn_retry2')}!`;
    document.getElementById('ov-lose').classList.add('show');

    Audio_Manager.playSFX('lose');
}




//------------------------------------------------------------------------
//-------------------SKILL INITIALISATION HELPERS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the Poisson-process interval in seconds for the highest owned
// tier of the skill, or null when the player has none of the nodes.
//   node poisson_process_3 → 60 s
//   node poisson_process_2 → 90 s
//   node poisson_process_1 → 120 s (base)
function _getPoissonInterval() {
    if (!ptHasSkill('poisson_process_1') &&
        !ptHasSkill('poisson_process_2') &&
        !ptHasSkill('poisson_process_3')) return null;

    if (ptHasSkill('poisson_process_3')) return 60;
    if (ptHasSkill('poisson_process_2')) return 90;
    return 120;
}


// Schedules all timestamp-based skill triggers and initialises the
// procedural field systems. Called once at the start of each level.
function _initSkillTimers() {
    window._emergencyScanFired = false;
    window._timedStasisNext = null;
    window._lawOfLargeNext = null;
    window._poissonNext = null;

    // timed_stasis (195-197): first auto-freeze after 10 minutes.
    if (ptHasSkill('timed_stasis_1')) {
        window._timedStasisNext = Date.now() + 10 * 60 * 1000;
    }

    // keystone_law_of_large_numbers (219): first trigger after 5 minutes.
    if (ptHasSkill('keystone_law_of_large_numbers')) {
        window._lawOfLargeNext = Date.now() + 5 * 60 * 1000;
    }

    // poisson_process (270-272): schedule first auto-mark.
    const poissonInterval = _getPoissonInterval();
    if (poissonInterval !== null) {
        window._poissonNext = Date.now() + poissonInterval * 1000;
    }
}


// Initialises the procedural field and Markov systems that run every tick.
function _initProceduralSystems() {
    _ergodicFieldInit();
    _randomWalkInit();
    if (typeof resetMarkovianState === 'function') resetMarkovianState();
}




//------------------------------------------------------------------------
//-------------------TICK HELPER FUNCTIONS--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Accumulates total seconds played across the whole save (persisted the
// next time save() runs elsewhere — win, item use, etc.). Only ticks while
// a level is actually running (guarded by the same dead/timerFrozen check
// as the rest of the tick loop).
function _tickPlaytimeTracker() {
    STATE.totalTimePlayedSecs = (STATE.totalTimePlayedSecs || 0) + 1;
}


// Advances all passive skill systems that need a per-second nudge.
function _tickPassiveSkills() {
    _poissonProcessTick();
    _ergodicFieldTick();
    _entropyDrainTick();
    _randomWalkTick();
    _degreesOfFreedomTick();
    if (typeof _markovSnapshotTick === 'function') _markovSnapshotTick();
}


// Returns the total freeze duration in ms for the timed_stasis skill,
// based on how many tiers the player has unlocked.
//   tier 1 only → 1000 ms
//   tier 2      → +500 ms
//   tier 3      → +500 ms further
function _calcTimedStasisDuration() {
    let dur = 1000;
    if (ptHasSkill('timed_stasis_2')) dur += 500;
    if (ptHasSkill('timed_stasis_3')) dur += 500;
    return dur;
}


// Handles timed_stasis (195-197): every 10 minutes the timer freezes
// briefly. The freeze duration scales with the tier unlocked.
function _tickTimedStasis() {
    if (!ptHasSkill('timed_stasis_1')) return;
    if (!window._timedStasisNext) return;
    if (Date.now() < window._timedStasisNext) return;

    // Schedule the next trigger 10 minutes from now.
    window._timedStasisNext = Date.now() + 10 * 60 * 1000;

    const freezeDur = _calcTimedStasisDuration();
    timerFrozen = true;
    updTimer();
    showToast(`⏸️ ${t('cg_timed_stasis')}`);
    if (typeof playStasisOverlayEffect === 'function') playStasisOverlayEffect(freezeDur);
    if (typeof playFreezeCountdownOverlay === 'function') playFreezeCountdownOverlay(freezeDur);

    setTimeout(() => {
        timerFrozen = false;
        updTimer();
    }, freezeDur);
}


// Returns { filled, total } for one row (isRow = true) or column
// (isRow = false) of the solution grid at the given index: `total` is how
// many solution cells are meant to be filled in that line, `filled` is how
// many of those are already correctly filled/revealed by the player.
// `otherCount` is the length of the line (cols for a row, rows for a col).
function _getLineFillStats(sol, index, isRow, otherCount) {
    let filled = 0;
    let total = 0;
    for (let i = 0; i < otherCount; i++) {
        const r = isRow ? index : i;
        const c = isRow ? i : index;
        if (sol[r][c] === 1) {
            total++;
            if (userGrid[r][c] === 1 || revealedGrid[r][c]) filled++;
        }
    }
    return { filled, total };
}


// Searches for the first row (isRow = true) or column (isRow = false) in
// the solution grid that has fewer than 2 correctly filled cells. Returns
// the line index, or -1 if none found.
function _findSparseLine(sol, lineCount, otherCount, isRow) {
    for (let i = 0; i < lineCount; i++) {
        const { filled, total } = _getLineFillStats(sol, i, isRow, otherCount);
        if (filled < 2 && filled < total) return i;
    }
    return -1;
}


// Reveals all unfilled solution cells in the given row (isRow = true) or
// column (isRow = false) and refreshes their display and clue highlights.
// Returns the ids of the newly revealed cells (for the reveal VFX).
function _revealSparseLine(sol, index, otherCount, isRow) {
    const revealedIds = [];
    for (let i = 0; i < otherCount; i++) {
        const r = isRow ? index : i;
        const c = isRow ? i : index;
        if (sol[r][c] === 1 && userGrid[r][c] !== 1 && !revealedGrid[r][c]) {
            revealedGrid[r][c] = true;
            userGrid[r][c] = 1;
            renderCell(r, c);
            updClues(r, c);
            revealedIds.push(`g-${r}-${c}`);
        }
    }
    return revealedIds;
}


// Handles the full Law of Large Numbers reveal pass: finds a sparse row
// and column, reveals them, applies the optional Bayesian Boost bonus,
// shows a toast, and checks for a win.
function _triggerLawOfLargeNumbers() {
    if (!cur) return;

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    const sparseRow = _findSparseLine(sol, rows, cols, true);
    const sparseCol = _findSparseLine(sol, cols, rows, false);

    const revealedIds = [];
    if (sparseRow >= 0) revealedIds.push(..._revealSparseLine(sol, sparseRow, cols, true));
    if (sparseCol >= 0) revealedIds.push(..._revealSparseLine(sol, sparseCol, rows, false));

    if (sparseRow < 0 && sparseCol < 0) return; // nothing was revealed

    // Green pulse sweep over every cell the reveal touched
    if (typeof _applyCellEffect === 'function' && revealedIds.length > 0) {
        _applyCellEffect(revealedIds, 'reveal');
    }

    // Bayesian Boost: chance for a bonus free tile after a LLN reveal.
    if (_getBayesianBonus() > 0 && Math.random() < _getBayesianBonus()) {
        _resetBayesianBonus();
        revealTiles(1);
        showToast(`🔃 ${t('cg_bayesian_boost')}`);
    }

    showToast(`📉 ${t('cg_lln')}`);
    checkWin();
}


// Handles keystone_law_of_large_numbers (219): every 5 minutes, reveal
// one sparse row and one sparse column. Does not fire in the last 15
// minutes of a level (timerSecs ≤ 900).
function _tickLawOfLargeNumbers() {
    if (!window._lawOfLargeNext) return;
    if (Date.now() < window._lawOfLargeNext) return;
    if (timerSecs <= 900) return; // last 15 min — no reveal

    // Schedule the next trigger 5 minutes from now.
    window._lawOfLargeNext = Date.now() + 5 * 60 * 1000;

    _triggerLawOfLargeNumbers();
}


// Decrements timerSecs by the correct amount for the current frame.
// Golden Clock halts all countdown. Black Swan drains 10× as fast.
function _tickCountdown() {
    if (window._goldenClockActive) return; // clock is paused

    timerSecs--;

    // Black Swan speedforce: timer drains at 10× normal speed.
    if (window._blackSwanActive) timerSecs -= 9;

    if (window._chronoFractureActive) timerSecs -= 3;
}


// Unlocks the inventory panel after the elapsed-time threshold has passed
// (60 s in time-trial mode, 180 s in normal mode). Fires exactly once per
// level because of the one-second window check.
function _tickInventoryUnlock() {
    const elapsed = Math.floor((Date.now() - levelStartTime) / 1000);
    const thresh = curMods.timetrial ? 60 : 180;
    if (elapsed >= thresh && elapsed - 1 < thresh) buildInventoryPanel();
}


// Returns the total field-scan duration in ms for the emergency_scan
// skill, scaled by tier.
//   tier 1 only → 2000 ms
//   tier 2      → +1000 ms
//   tier 3      → +2000 ms further
function _calcEmergencyScanDuration() {
    let dur = 2000;
    if (ptHasSkill('emergency_scan_2')) dur += 1000;
    if (ptHasSkill('emergency_scan_3')) dur += 2000;
    return dur;
}


// Handles emergency_scan (201-203): a one-shot full-grid field scan that
// fires once when timerSecs first drops to ≤ 5 minutes.
function _tickEmergencyScan() {
    if (!ptHasSkill('emergency_scan_1')) return;
    if (window._emergencyScanFired) return;
    if (timerSecs > 300 || timerSecs <= 0) return;

    window._emergencyScanFired = true;

    // Cover the entire puzzle: centre the scan on the middle of the grid and
    // pass the larger grid dimension as scan size.
    const fullSize = Math.max(cur.grid.length, cur.grid[0].length);
    const centerRow = Math.floor(cur.grid.length / 2);
    const centerCol = Math.floor(cur.grid[0].length / 2);
    _executeFieldScan(centerRow, centerCol, fullSize, _calcEmergencyScanDuration());
}


// Checks whether the timer has expired and triggers the loss state when
// it has. Always the last check in the tick loop.
function _checkTimerExpired() {
    if (timerSecs > 0) return;

    dead = true;
    stopTimer();
    timesUp();
}




//------------------------------------------------------------------------
//-------------------MAIN ENTRY POINTS-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Starts the 1-second countdown loop. Always stops any existing interval
// first to prevent duplicates (important when replaying a level).
// Initialises all skill timers and procedural systems before launching
// the interval.
function startTimer() {
    stopTimer();
    _initSkillTimers();
    _initProceduralSystems();

    timerInterval = setInterval(() => {
        // Skip the entire tick if the game is over or the timer is frozen.
        if (dead || timerFrozen) return;

        _tickPassiveSkills();
        _tickTimedStasis();
        _tickLawOfLargeNumbers();
        _tickCountdown();
        _tickPlaytimeTracker();

        updTimer();

        if (typeof triggerLowTimeBanterIfNeeded === 'function') triggerLowTimeBanterIfNeeded();

        _tickInventoryUnlock();
        _tickEmergencyScan();
        _checkTimerExpired();
    }, 1000);
}


// Resumes a paused countdown. Does nothing if the game is already over
// or a timer interval is already running.
function resumeTimer() {
    if (!dead && !timerInterval) startTimer();
}

// Poll health vignette independently of the 1s timer tick so damage taken
// between ticks (monster hits, hazards) shows the red edge glow instantly.
if (typeof window !== 'undefined' && !window._healthVignettePoll) {
    window._healthVignettePoll = setInterval(() => {
        if (typeof _applyLowHealthVignette === 'function') _applyLowHealthVignette();
    }, 250);
}