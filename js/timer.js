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
//   'ltv-tier3' — ≤ 120s  (strongest)
//   'ltv-tier2' — ≤ 300s
//   'ltv-tier1' — ≤ 600s
//   ''          — > 600s
function _getLowTimeVignetteTier(secs) {
    if (secs <= 300) return 'ltv-tier3';
    if (secs <= 600) return 'ltv-tier2';
    if (secs <= 900) return 'ltv-tier1';
    return '';
}

// Applies (or clears) the correct tier class on the vignette element.
// Suppressed while the timer is frozen or Golden Clock has paused the
// countdown, since the remaining time isn't actually draining right now.
function _applyLowTimeVignette() {
    const el = document.getElementById('low-time-vignette');
    if (!el) return;

    el.classList.remove('ltv-tier1', 'ltv-tier2', 'ltv-tier3');

    if (timerFrozen || window._goldenClockActive) return;

    const tier = _getLowTimeVignetteTier(timerSecs);
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
    el.textContent = _formatTimerDisplay(timerSecs);
    _applyTimerDisplayState(el);
    _applyLowTimeVignette();

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
    showToast(`⏸️ ${LANG === 'de' ? 'Zeitstase!' : 'Timed Stasis!'}`);

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
function _revealSparseLine(sol, index, otherCount, isRow) {
    for (let i = 0; i < otherCount; i++) {
        const r = isRow ? index : i;
        const c = isRow ? i : index;
        if (sol[r][c] === 1 && userGrid[r][c] !== 1 && !revealedGrid[r][c]) {
            revealedGrid[r][c] = true;
            userGrid[r][c] = 1;
            renderCell(r, c);
            updClues(r, c);
        }
    }
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

    if (sparseRow >= 0) _revealSparseLine(sol, sparseRow, cols, true);
    if (sparseCol >= 0) _revealSparseLine(sol, sparseCol, rows, false);

    if (sparseRow < 0 && sparseCol < 0) return; // nothing was revealed

    // Bayesian Boost: chance for a bonus free tile after a LLN reveal.
    if (_getBayesianBonus() > 0 && Math.random() < _getBayesianBonus()) {
        _resetBayesianBonus();
        revealTiles(1);
        showToast(`🔃 ${LANG === 'de' ? 'Bayessche Verstärkung!' : 'Bayesian Boost!'}`);
    }

    showToast(`📉 ${LANG === 'de' ? 'Gesetz der Großen Zahlen!' : 'Law of Large Numbers!'}`);
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

    // Cover the entire puzzle: pass the larger grid dimension as scan size.
    const fullSize = Math.max(cur.grid.length, cur.grid[0].length);
    _executeFieldScan(fullSize, _calcEmergencyScanDuration());
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