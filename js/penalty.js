// penalty.js
// Handles all penalty behaviour on a wrong cell guess:
// shield absorption, Black Swan interruption, passive skill procs,
// time deduction with modifier stacking, HUD feedback, and game-over check.

//------------------------------------------------------------------------
//-------------------CONSTANTS--------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const PEN_FLASH_DURATION_MS = 350;   // Duration of the red screen flash in milliseconds
const PEN_INFO_CLEAR_DELAY_MS = 3000; // How long the penalty label stays visible in the HUD


//------------------------------------------------------------------------
//-------------------SHIELD / BLACK SWAN HELPERS--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if the current penalty multiplier signals a full shield absorption (penMult === 0).
// Shows toast and plays the shield SFX when absorbed.
function _penaltyIsShieldAbsorbed(penMult) {
    if (penMult !== 0) return false;
    showToast(t('pen_shield'));
    Audio_Manager.playSFX('shield_break');
    return true;
}

// If Black Swan (SPEEDFORCE) is currently active, end it and notify the player.
// Called before any real penalty is applied, since a mistake breaks the streak.
function _interruptBlackSwanIfActive() {
    if (!window._blackSwanActive) return;
    _endBlackSwan(false);
    showToast(LANG === 'de' ? '📉 SPEEDFORCE abgebrochen!' : '📉 SPEEDFORCE broken!');
}


//------------------------------------------------------------------------
//-------------------PASSIVE SKILL PROC HELPERS---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// keystone_stochastic_resonance (node 265):
// On mistake, 25% chance to reveal 1 correct cell instead of applying a penalty.
// Cannot trigger twice in a row (anti-repeat guard via window._stochasticLastFired).
// Returns true if the proc fired (caller should skip the rest of penalty logic).
function _tryProcStochasticResonance(row, col) {
    const canProc = ptHasSkill('keystone_stochastic_resonance') && !window._stochasticLastFired;
    if (canProc && Math.random() < 0.25) {
        window._stochasticLastFired = true;
        const revealed = revealTiles(1);
        if (revealed && revealed.length > 0) {
            // Pass four arguments: mistake coordinates, followed by target coordinates
            playStochasticResonanceEffect(row, col, revealed[0].row, revealed[0].col);
        }
        Audio_Manager.playSFX('stochastic_resonance');
        showToast(`〰️ ${LANG === 'de' ? 'Stochastische Resonanz! Zelle enthüllt.' : 'Stochastic Resonance! Cell revealed.'}`);
        return true; // penalty absorbed — no mistakeCount increment, no time loss
    }
    window._stochasticLastFired = false;
    return false;
}

// standard_deviation (nodes 255–257):
// Reveals cells after a threshold number of mistakes.
//   Node 1 only   → every 3 mistakes → reveal 1 cell
//   Nodes 1+2     → every 2 mistakes → reveal 1 cell
//   Nodes 1+2+3   → every 2 mistakes → reveal 2 cells
// Also checks for a pending Bayesian bonus reveal on top of the base reveals.
// Fires beam effects from the mistake cell to each revealed tile.
function _tryProcStandardDeviation(mistakeRow, mistakeCol) {
    if (!ptHasSkill('standard_deviation_1')) return;

    const hasNode2 = ptHasSkill('standard_deviation_2');
    const hasNode3 = ptHasSkill('standard_deviation_3');
    const threshold = hasNode2 ? 2 : 3;

    if (mistakeCount % threshold !== 0) return;

    const revealCount = hasNode3 ? 2 : 1;
    const revealedTiles = revealTiles(revealCount) || [];

    // Bayesian bonus: extra reveal based on accumulated bonus probability
    if (_getBayesianBonus() > 0 && Math.random() < _getBayesianBonus()) {
        _resetBayesianBonus();
        const extraTiles = revealTiles(1) || [];
        revealedTiles.push(...extraTiles);
    }

    // Spawn a visual beam from the mistake cell to each revealed tile
    revealedTiles.forEach(tile => {
        if (tile && tile.row !== undefined && tile.col !== undefined) {
            createBeamEffect(mistakeRow, mistakeCol, tile.row, tile.col);
        }
    });

    Audio_Manager.playSFX('standard_deviation');
    const feedbackLabel = (LANG === 'de') ? 'Fehler-Feedback!' : 'Error Feedback!';
    const isPlural = revealCount > 1;

    const revealLabel = (LANG === 'de')
        ? (isPlural ? `${revealCount} Zellen enthüllt.` : `${revealCount} Zelle enthüllt.`)
        : (isPlural ? `${revealCount} cells revealed.` : `${revealCount} cell revealed.`);

    showToast(`📏 ${feedbackLabel} ${revealLabel}`);
}


//------------------------------------------------------------------------
//-------------------PENALTY CALCULATION HELPERS--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the base penalty seconds for the current mistake, taken from
// the difficulty config. Clamps to the last entry once past the defined list.
function _getBasePenaltySeconds() {
    const pens = DIFF_CFG[curDiff].pens;
    let idx = mistakeCount - 1;
    if (_charIs('stox')) {
        idx = Math.floor(idx * 0.7);
    }
    return pens[Math.min(idx, pens.length - 1)];
}

// keystone_asymptotic_mastery (node 266):
// Each completed line permanently reduces all future penalties by 5 seconds.
// Returns total flat reduction in seconds.
function _getAsymptoticMasteryReduction() {
    return (window._asymptoticLinesCompleted || 0) * 5;
}

// Resolves the active penalty multiplier for this mistake.
// Overfitting node overrides the class multiplier when active;
// otherwise the class multiplier (penMult) is used.
function _resolveActivePenaltyMultiplier(penMult) {
    const overfitMult = _overfittingPenaltyMultiplier();
    return (overfitMult !== null) ? overfitMult : penMult;
}

// Combines base seconds, multiplier, and flat reduction into the final penalty.
// Always returns a non-negative integer.
function _calcEffectivePenalty(penMult) {
    const base = _getBasePenaltySeconds();
    const multiplier = _resolveActivePenaltyMultiplier(penMult);
    const reduction = _getAsymptoticMasteryReduction();
    return Math.max(0, Math.round(base * multiplier) - reduction);
}


//------------------------------------------------------------------------
//-------------------TIMER & GAME-STATE HELPERS---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Deducts the effective penalty from the timer, refreshes the HUD clock,
// and logs the mistake to the Actuary system.
function _applyTimeDeduction(row, col, effectivePen) {
    timerSecs = Math.max(0, timerSecs - effectivePen);
    updTimer();
    if (effectivePen > 0) actuaryLogMistake(row, col, effectivePen);
}

// Flags the penalty_clutch achievement condition:
// set when a penalty drops the timer from ≥60s to <60s (but not zero).
// scoring.js reads this flag on win to award the achievement.
function _checkAndFlagPenaltyClutch(timerBefore) {
    if (timerBefore >= 60 && timerSecs < 60 && timerSecs > 0) {
        window._hadPenaltyClutch = true;
    }
}

// Triggers game-over when the timer hits zero after a penalty.
function _checkTimerExpiry() {
    if (timerSecs <= 0) {
        dead = true;
        stopTimer();
        timesUp();
    }
}


//------------------------------------------------------------------------
//-------------------HUD FEEDBACK HELPERS---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Formats a penalty duration (in seconds) as a HUD label.
// Displays as −M:SS when ≥60s, or −Ns for shorter amounts.
function _formatPenaltyLabel(effectivePen) {
    const mins = Math.floor(effectivePen / 60);
    const secs = effectivePen % 60;
    return mins > 0
        ? `−${mins}:${String(secs).padStart(2, '0')}`
        : `−${secs}s`;
}

// Updates the pen-info element with the penalty label and current mistake count,
// then auto-clears it after PEN_INFO_CLEAR_DELAY_MS.
function _updatePenaltyInfoHUD(effectivePen) {
    const pi = document.getElementById('pen-info');
    const label = _formatPenaltyLabel(effectivePen);
    pi.textContent = `${label} (#${mistakeCount})`;
    clearTimeout(pi._t);
    pi._t = setTimeout(() => pi.textContent = '', PEN_INFO_CLEAR_DELAY_MS);
}

// Updates the mistake counter element in the HUD with the current mistake count.
function _updateMistakeCounterHUD() {
    const mc = document.getElementById('mistake-counter');
    if (mc) mc.textContent = `${LANG === 'de' ? 'Fehler' : 'Mistakes'}: ${mistakeCount}`;
}

// Triggers the brief red screen flash that gives tactile feedback on a mistake.
function _triggerPenaltyFlash() {
    const fl = document.getElementById('pen-flash');
    fl.classList.add('show');
    setTimeout(() => fl.classList.remove('show'), PEN_FLASH_DURATION_MS);
}


//------------------------------------------------------------------------
//-------------------APPLY PENALTY (MAIN ENTRY POINT)--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Main penalty handler — called whenever the player selects a wrong cell.
// row / col: grid coordinates of the mistake, used for beam effects and actuary logging.
function applyPenalty(row, col) {
    const penMult = getClassPenaltyMultiplier(); // 5.0 during Black Swan, 0 = shield absorbed

    // --- Shield check: if penMult is 0, the hit is fully absorbed; do nothing further ---
    if (_penaltyIsShieldAbsorbed(penMult)) return;

    // --- Break any active Black Swan streak before applying the penalty ---
    _interruptBlackSwanIfActive();

    // --- Stochastic Resonance: 20% chance to convert the mistake into a free reveal ---
    if (_tryProcStochasticResonance(row, col)) return;

    // --- Register the mistake and fire dependent systems ---
    mistakeCount++;
    _onMistakeBayesianUpdate();
    _gamblersRuinOnMistake();
    trackAchStat('mistakesMade');
    if (typeof onMistake === 'function') onMistake();

    // --- Character banter: react to this mistake (and to mistake streaks) ---
    if (typeof triggerBanter === 'function') {
        if (mistakeCount > 0 && mistakeCount % 3 === 0) {
            triggerBanter('mistake_streak');
        } else {
            triggerBanter('mistake_single');
        }
    }

    // --- Standard Deviation: threshold-based reveals triggered by mistake count ---
    _tryProcStandardDeviation(row, col);

    // --- Calculate and apply the time penalty ---
    const effectivePen = _calcEffectivePenalty(penMult);
    const timerBefore = timerSecs;

    _applyTimeDeduction(row, col, effectivePen);
    _checkAndFlagPenaltyClutch(timerBefore);

    // --- Update HUD to reflect the new penalty and mistake count ---
    _updatePenaltyInfoHUD(effectivePen);
    _updateMistakeCounterHUD();
    _triggerPenaltyFlash();

    // --- End the game if the timer expired from this penalty ---
    _checkTimerExpiry();

    _updateMistakeCounterHUD()
}


//------------------------------------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Updates the mistake counter element in the HUD with the current mistake count.
function _updateMistakeCounterHUD() {
    const mc = document.getElementById('mistake-counter');
    if (mc) mc.textContent = `${LANG === 'de' ? 'Fehler' : 'Mistakes'}: ${mistakeCount}`;

    // Endgame integration: keep the "Mistakes Left" objectives row in sync,
    // and check the map's mistake limit immediately (no tick-loop delay).
    if (typeof _egIsActive === 'function' && _egIsActive()) {
        if (typeof _egUpdateObjectivesHUD === 'function') _egUpdateObjectivesHUD();
        if (typeof _egCheckMistakeLimit === 'function') _egCheckMistakeLimit();
    }
}