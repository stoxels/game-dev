// mouse-button-handlers.js
// Handles all mouse interactions with the nonogram grid:
// clicking, right-clicking, dragging, and releasing.


//------------------------------------------------------------------------
//----------------------------STATE VARIABLES-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// The value being painted during the current drag stroke:
//   0 = erase, 1 = fill (left-click), 2 = mark with ✕ (right-click), 3 = question mark
let pval = 0;

// Which mouse button started the current stroke: 0 = left, 2 = right
let mbtn = 0;

// The cell where the current drag began (-1 when not dragging)
let dragStartRow = -1;
let dragStartCol = -1;

// Cells already counted toward the current stroke's displayed number,
// so re-dragging back over the same cell doesn't double/triple count it.
let dragCountedCells = new Set();

// The axis the drag is locked to once the player moves: 'row', 'col', or null (undecided)
let dragAxis = null;

// How many cells have been correctly filled in the current left-click drag stroke
let dragStrokeCount = 0;

// How many already-correct cells are contiguous with the drag-start cell,
// along the row axis and the column axis respectively (computed at cellDown).
let dragPrefillRow = 0;
let dragPrefillCol = 0;

// Whether the prefill offset has already been folded into dragStrokeCount
// for the current stroke (only ever applied once, on first real movement).
let dragPrefillApplied = false;

// The pre-fill count folded into the current stroke's display total.
// Starts as a best guess (max of row/col prefill) on the start cell,
// then gets locked to the correct axis once the drag direction resolves.
let dragPrefillOffset = 0;

// When true (Touchpad Mode active), left-click behaves like a right-click (mark),
// and right-click behaves like a left-click (fill). Toggled via the in-game button,
// only available when SETTINGS.touchpadModeEnabled is true.
let touchpadMarkModeActive = false;


//------------------------------------------------------------------------
//----------------------------SHARED HELPERS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if the current level is an endgame sandbox or monster level.
// Used to guard all _eg* hook calls throughout this file.
function isEndgameLevel() {
    return cur.isEndgameSandbox || cur.isMonsterLevel;
}

// Endgame: discards any pickup, loot drop, or currency drop sitting on a
// cell. Shared by the real-mistake path and the wrong-fill path in
// applyCell(), both of which need to invalidate a cell's drop the same way.
function _egDiscardAllDrops(row, col) {
    if (!isEndgameLevel()) return;
    if (typeof _egDiscardPickup === 'function') _egDiscardPickup(row, col);
    if (typeof _egDiscardLootDrop === 'function') _egDiscardLootDrop(row, col);
    if (typeof _egDiscardCurrencyDrop === 'function') _egDiscardCurrencyDrop(row, col);
}

// Endgame: claims any pickup, loot drop, or currency drop sitting on a
// cell. Shared by the correct-fill path and the right-click-mark path in
// applyCell(), both of which claim drops on an empty-solution cell.
function _egCheckAllClaims(row, col) {
    if (!isEndgameLevel()) return;
    if (typeof _egCheckPickupClaim === 'function') _egCheckPickupClaim(row, col);
    if (typeof _egCheckLootClaim === 'function') _egCheckLootClaim(row, col);
    if (typeof _egCheckCurrencyDropClaim === 'function') _egCheckCurrencyDropClaim(row, col);
}


//------------------------------------------------------------------------
//------------------SPECIAL INTERCEPT HELPERS-----------------------------
//------------------------------------------------------------------------
// These helpers handle intercepts that must fire BEFORE any normal fill
// logic. Each returns true if it consumed the click (caller should return).
//------------------------------------------------------------------------

// If the cell is boss-corrupted, dispel it instead of filling.
// The player must click again afterward to actually fill.
function checkBossCorruptionIntercept(row, col) {
    if (typeof _egIsCellCorrupted === 'function' && _egIsCellCorrupted(row, col)) {
        _egDispelCorruption(row, col);
        return true;
    }
    return false;
}

// If the Significance Threshold skill is armed, route the click there instead.
function checkSigThresholdIntercept(row, col) {
    if (window._sigThreshArmed && (pval === 1 || mbtn === 0)) {
        _sigThreshPickFromCell(row, col);
        return true;
    }
    return false;
}

// If a Bayesian trap is waiting for placement, route the click there.
function checkBayesianTrapIntercept(row, col) {
    if (typeof _bayesTrapPlacementClick === 'function' && _bayesTrapPlacementClick(row, col)) {
        return true;
    }
    return false;
}

// If an active class ability is armed, execute it and consume the click.
function checkActiveAbilityIntercept(row, col) {
    if (activeAbilityMode) {
        if (pval === 1 || mbtn === 0) {
            executeActiveAbility(row, col);
        }
        return true;
    }
    return false;
}

// If a Degrees of Freedom session is active, route the click there.
function checkDegreesOfFreedomIntercept(row, col) {
    if (window._dofSession && _dofHandleClick(row, col)) {
        return true;
    }
    return false;
}

// Runs all special intercepts in priority order.
// Returns true if any intercept consumed the click.
function checkSpecialIntercepts(row, col) {
    if (checkBossCorruptionIntercept(row, col)) return true;
    if (checkSigThresholdIntercept(row, col)) return true;
    if (checkBayesianTrapIntercept(row, col)) return true;
    if (checkActiveAbilityIntercept(row, col)) return true;
    if (checkDegreesOfFreedomIntercept(row, col)) return true;
    return false;
}


//------------------------------------------------------------------------
//---------------------CELL GUARD HELPERS---------------------------------
//------------------------------------------------------------------------
// These helpers check conditions that make a cell click a no-op.
// Each returns true if the click should be silently ignored.
//------------------------------------------------------------------------

// No-op: cell already holds the value we would paint.
function isCellAlreadyDesiredValue(row, col) {
    return userGrid[row][col] === pval;
}

// No-op: a mark/erase stroke cannot touch a correctly solved cell.
// Uses pval (the resolved paint value for this stroke) instead of mbtn,
// so this also works correctly in Touchpad Mode, where a "mark" stroke
// can be driven by the left mouse button.
function isRightClickOnCorrectCell(row, col) {
    return pval !== 1 && userGrid[row][col] === 1 && cur.grid[row][col] === 1;
}

// No-op: cannot erase a cell that was revealed by an item.
function isEraseOnRevealedCell(row, col) {
    return revealedGrid[row][col] && pval === 0;
}

// No-op: cannot erase a cell that was revealed by an item.
function isEraseOnRevealedCell(row, col) {
    return revealedGrid[row][col] && pval === 0;
}

// No-op: with "Protect Marked Cells" enabled, a fill stroke (single click
// or drag-paint) cannot paint over a cell currently marked with ✕ — whether
// the player marked it themselves or it was marked by an item, passive, or
// ability effect (both share userGrid state 2; systemMarkedGrid only affects
// styling, not this check).
function isPaintingOverMarkedCell(row, col) {
    return SETTINGS.protectMarkedCells && pval === 1 && userGrid[row][col] === 2;
}

// Runs all cell guards. Returns true if the click should be ignored.
function checkCellGuards(row, col) {
    if (isCellAlreadyDesiredValue(row, col)) return true;
    if (isRightClickOnCorrectCell(row, col)) return true;
    if (isEraseOnRevealedCell(row, col)) return true;
    if (isPaintingOverMarkedCell(row, col)) return true;   
    return false;
}


//------------------------------------------------------------------------
//-------------------WRONG FILL ABSORPTION HELPERS-----------------------
//------------------------------------------------------------------------
// These helpers try to absorb a wrong left-click fill before it costs the
// player time. Each returns true if the mistake was absorbed (no penalty).
//------------------------------------------------------------------------

// Freeze: mark wrong visually but charge no time.
function tryAbsorbWithFreeze(row, col) {
    if (!window._freezeActive) return false;
    if (ptHasSkill('keystone_null_hypothesis') || ptHasSkill('keystone_asymptotic_mastery')) return false;
    wrongGrid[row][col] = true;
    renderCell(row, col);
    showToast('❄️ Frozen! No penalty.');
    if (typeof _arcaneFreeze_spawnStalagmite === 'function') {
        _arcaneFreeze_spawnStalagmite(row, col);     // ← add this line
    }
    return true;
}

// Shield: absorb the mistake, consume one shield charge.
function tryAbsorbWithShield(row, col) {
    if (!shieldActive) return false;
    if (ptHasSkill('keystone_null_hypothesis') || ptHasSkill('keystone_asymptotic_mastery')) return false;

    wrongGrid[row][col] = true;
    renderCell(row, col);

    absorbedMistakes++;
    if ((window._shieldExtraCharges || 0) > 0) {
        window._shieldExtraCharges--;
    } else {
        shieldActive = false;
    }
    showToast(t('pen_shield'));
    playShieldBreakEffect(row, col);
    Audio_Manager.playSFX('shield_break');
    return true;
}

// Class passive (e.g. Mathmagician): penalty multiplier of 0 means fully absorbed.
function tryAbsorbWithClassPassive(row, col) {
    if (ptHasSkill('keystone_null_hypothesis') || ptHasSkill('keystone_asymptotic_mastery')) return false;
    // Suppress any shield-visibility sync (e.g. inside getClassPenaltyMultiplier)
    // from hiding the bubble before we know this was absorbed, and before the
    // meteor VFX gets a chance to play.
    window._vsSuppressAutoHide = true;

    const penMult = getClassPenaltyMultiplier();

    if (penMult !== 0) {
        window._vsSuppressAutoHide = false;
        return false;
    }

    wrongGrid[row][col] = true;
    renderCell(row, col);
    showToast(t('pen_shield'));

    if (typeof _varianceShield_absorbMistake === 'function') {
        _varianceShield_absorbMistake(); // clears the suppress flag itself once the meteor resolves
    } else {
        window._vsSuppressAutoHide = false;
    }

    return true;
}

// Confidence Interval grace window: absorb the mistake if the window is open.
function tryAbsorbWithConfidenceInterval(row, col) {
    if (!_confidenceIntervalActive) return false;

    _confidenceIntervalActive = false;
    _confidenceIntervalUsed = true;     // prevent two CI absorbs back-to-back
    absorbedMistakes++;
    questStat_confidenceIntervalIgnored();
    wrongGrid[row][col] = true;
    renderCell(row, col);
    consecutiveCorrectFills = 0;        // CI absorption also breaks the correct-fill streak
    _streakBonusFills = 0;
    showToast(`📐 ${LANG === 'de' ? 'Konfidenzintervall! Fehler ignoriert.' : 'Confidence Interval! Mistake ignored.'}`);
    return true;
}

// Tries all absorb paths in order.
// Returns true if the mistake was fully absorbed and no penalty should fire.
function tryAbsorbMistake(row, col) {
    const absorbed = tryAbsorbWithFreeze(row, col)
        || tryAbsorbWithShield(row, col)
        || tryAbsorbWithClassPassive(row, col)
        || tryAbsorbWithConfidenceInterval(row, col);

    if (absorbed && typeof triggerBanter === 'function') {
        triggerBanter('mistake_absorbed');
    }
    return absorbed;
}


//------------------------------------------------------------------------
//-------------------REAL MISTAKE CONSEQUENCE HELPERS--------------------
//------------------------------------------------------------------------
// These helpers fire after absorption fails — the mistake is real and
// costs the player. Run them in order inside applyRealMistake().
//------------------------------------------------------------------------

// Visually mark the cell wrong, play the error sound, deduct time, and
// discard any endgame drop the mistake invalidates.
function markCellWrongAndPenalize(row, col) {
    wrongGrid[row][col] = true;
    renderCell(row, col);
    Audio_Manager.playSFX('cellWrong');
    applyPenalty(row, col);

    _egDiscardAllDrops(row, col);
}

// Reset consecutive-fill streaks and notify passive systems.
function breakFillStreaksOnMistake() {
    consecutiveCorrectFills = 0;    // sample_efficiency skill: streak reset
    _streakBonusFills = 0;          // streak_bonus skill: streak reset

    if (typeof PassiveTracker !== 'undefined') PassiveTracker.onMistake();

    // Animals flee instantly on any real mistake
    if (typeof clearActiveRandomWalkers === 'function') {
        clearActiveRandomWalkers();
    }


}

// Open (or reset) the Confidence Interval grace window after a real mistake.
// The window gives the player a brief period where the NEXT mistake is absorbed.
function openConfidenceIntervalGraceWindow() {
    if (ptHasSkill('confidence_interval_1') && !_confidenceIntervalUsed) {
        let windowSecs = 1;
        if (ptHasSkill('confidence_interval_2')) windowSecs++;
        if (ptHasSkill('confidence_interval_3')) windowSecs++;
        _confidenceIntervalActive = true;
        // Soft green glow marks the forgiveness window while it is open
        if (typeof playConfidenceIntervalEffect === 'function') {
            playConfidenceIntervalEffect(windowSecs * 1000);
        }
        setTimeout(() => { _confidenceIntervalActive = false; }, windowSecs * 1000);
    } else {
        // Reset the "just used" flag so the window can open again next mistake
        _confidenceIntervalUsed = false;
    }
}

// Golden Clock: decrement its mistake budget and trigger game-over if exhausted.
// Returns true if the clock fired a game-over (caller should return).
function checkGoldenClockAfterMistake() {
    if (!window._goldenClockActive) return false;

    window._goldenClockMistakesLeft = (window._goldenClockMistakesLeft || 0) - 1;

    const mcEl = document.getElementById('mistake-counter');
    if (mcEl) mcEl.textContent = `✗ ${mistakeCount} 🕰️${window._goldenClockMistakesLeft}`;

    if (window._goldenClockMistakesLeft <= 0) {
        window._goldenClockActive = false;
        dead = true;
        stopTimer();
        window._lastFailedGi = cur.gIdx;
        if (typeof _arcaneFreeze_clearAllFrostAndStalagmites === 'function') {
            _arcaneFreeze_clearAllFrostAndStalagmites();   
        }
        document.getElementById('lose-title').textContent = t('ov_lose');
        document.getElementById('lose-sub').textContent =
            LANG === 'de' ? 'Goldene Uhr: Fehlerlimit erreicht!' : 'Golden Clock: mistake limit reached!';
        document.getElementById('ov-lose').classList.add('show');
        return true;    // game over — caller must return
    }
    return false;
}

// Hardcore mode: any real mistake ends the run immediately.
// Returns true if hardcore game-over was triggered (caller should return).
function checkHardcoreAfterMistake() {
    if (!curMods.hardcore) return false;

    dead = true;
    stopTimer();
    window._lastFailedGi = cur.gIdx;    // bounceback achievement needs this
    if (typeof _arcaneFreeze_clearAllFrostAndStalagmites === 'function') {
        _arcaneFreeze_clearAllFrostAndStalagmites();    
    }
    document.getElementById('lose-title').textContent = t('hc_fail_title');
    document.getElementById('lose-sub').textContent = t('hc_fail_sub');
    document.getElementById('ov-lose').classList.add('show');
    return true;
}

// Orchestrates all consequences of a real (unabsorbed) wrong fill.
// Returns true if a game-over was triggered (caller must return immediately).
function applyRealMistake(row, col) {
    markCellWrongAndPenalize(row, col);
    breakFillStreaksOnMistake();
    openConfidenceIntervalGraceWindow();
    if (checkGoldenClockAfterMistake()) return true;
    if (checkHardcoreAfterMistake()) return true;
    return false;
}

// Full wrong-fill flow: first try absorption, then apply real consequences.
// Returns true if the caller (applyCell) should stop processing this cell.
function handleWrongFill(row, col) {
    // Try to absorb the mistake with a shield, freeze, class passive, or CI window
    if (tryAbsorbMistake(row, col)) return true;

    // No absorption — apply real penalty and check for game-over
    return applyRealMistake(row, col);
}


//------------------------------------------------------------------------
//-------------------LUCKY TILE CLAIM HELPERS----------------------------
//------------------------------------------------------------------------
// Helpers for right-click marking a lucky tile: item rewards,
// bonus item chance (generous_fortune), and covariance_shift reveals.
//------------------------------------------------------------------------

// Picks a primary item reward and optionally a bonus item (generous_fortune skill).
// Pushes both into inventory and returns the composed toast message.
function claimLuckyTileItems() {
    const wonItemId = pickLuckyItem();
    const newItem = {
        uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        defId: wonItemId
    };
    STATE.inventory.push(newItem);

    const def = ITEM_DEFS[newItem.defId];
    let toastMsg = `🍀 Lucky Tile! You found: ${def.icon} ${itemName(def)}`;
    const grantedIds = [newItem.defId];

    // generous_fortune (192-194): each node adds a stacking bonus-item chance
    const bonusChance = (ptHasSkill('generous_fortune_1') ? 0.10 : 0)
        + (ptHasSkill('generous_fortune_2') ? 0.15 : 0)
        + (ptHasSkill('generous_fortune_3') ? 0.25 : 0);

    if (bonusChance > 0 && Math.random() < bonusChance) {
        const bonusItemId = pickLuckyItem();
        const bonusItem = {
            uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            defId: bonusItemId
        };
        STATE.inventory.push(bonusItem);
        const bonusDef = ITEM_DEFS[bonusItem.defId];
        toastMsg += ` + ${bonusDef.icon} ${itemName(bonusDef)}`;
        grantedIds.push(bonusItem.defId);
    }

    return { toastMsg, grantedIds };
}

// Applies the keystone_variance_collapse downside: claiming a lucky tile
// costs the player 10 minutes. Appends a warning to the toast message.
function applyVarianceCollapsePenalty(toastMsg) {
    if (!ptHasSkill('keystone_variance_collapse')) return toastMsg;
    timerSecs = Math.max(0, timerSecs - 600);
    _levelTimeLost += 600;
    updTimer();
    return toastMsg + ` ${LANG === 'de' ? '(−10 Min!)' : '(−10 min!)'}`;
}

// covariance_shift (261-263): after a lucky tile is claimed, reveal 1–3
// unrevealed correct cells from the same row or column.
function applyCovarianceShiftReveal(row, col) {
    if (window._oracleActive) return;
    if (!ptHasSkill('covariance_shift_1')) return;
    if (ptHasSkill('keystone_ergodic_field')) return;

    const sol = cur.grid;
    const cols = sol[0].length;
    const rows = sol.length;

    const revealCount = ptHasSkill('covariance_shift_3') ? 3
        : ptHasSkill('covariance_shift_2') ? 2
            : 1;

    // Gather unrevealed correct cells in the same row and column
    const pool = [];
    for (let c = 0; c < cols; c++)
        if (sol[row][c] === 1 && userGrid[row][c] !== 1 && !revealedGrid[row][c])
            pool.push([row, c]);
    for (let r = 0; r < rows; r++)
        if (r !== row && sol[r][col] === 1 && userGrid[r][col] !== 1 && !revealedGrid[r][col])
            pool.push([r, col]);

    shuffle(pool);

    const affected = [];
    pool.slice(0, revealCount).forEach(([r, c]) => {
        revealedGrid[r][c] = true;
        userGrid[r][c] = 1;
        renderCell(r, c);
        updClues(r, c);
        affected.push(`g-${r}-${c}`);
    });

    if (affected.length > 0) {
        if (typeof _applyCellEffect === 'function') {
            _applyCellEffect(affected, 'reveal');
            if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
        }
        checkWin();
    }
}

// Orchestrates the full lucky tile claim: removes the tile, grants items,
// applies any keystones, saves state, and triggers covariance_shift reveals.
function handleLuckyTileClaim(row, col) {
    // Only fires when right-clicking an unclaimed lucky tile
    if (pval !== 2 || !luckyTiles || !luckyTiles.has(`${row}-${col}`)) return;

    luckyRewardClaimed++;
    trackAchStat('luckyTilesFound');
    Audio_Manager.playSFX('luckyTileActivate');
    luckyTiles.delete(`${row}-${col}`);

    let { toastMsg, grantedIds } = claimLuckyTileItems();
    toastMsg = applyVarianceCollapsePenalty(toastMsg);

    save();
    buildInventoryPanel();
    grantedIds.forEach(defId => showItemGainPopup(defId));
    showToast(toastMsg, 3500);

    applyCovarianceShiftReveal(row, col);

    if (typeof triggerBanter === 'function') triggerBanter('lucky_tile');
}


//------------------------------------------------------------------------
//-------------------CORRECT FILL HOOKS AND SKILL TRIGGERS---------------
//------------------------------------------------------------------------
// Helpers that fire after a verified correct left-click fill.
//------------------------------------------------------------------------

// Shows the size of the contiguous correctly-filled run passing through
// (row, col) along the current drag axis. Recomputed fresh on every call,
// so it's naturally correct regardless of drag direction, revisits, or
// how many of the cells were already filled before this stroke.
function updateDragStrokeCounter(row, col) {
    if (!painting || pval !== 1) return;

    // Figure out which axis to measure along.
    let axis = dragAxis;
    if (!axis) {
        // Still on the start cell / direction not known yet — pick whichever
        // axis has the longer existing run as a best guess.
        const rowRun = _countAdjacentPrefillRun(row, col, 'row');
        const colRun = _countAdjacentPrefillRun(row, col, 'col');
        axis = rowRun >= colRun ? 'row' : 'col';
    }

    const displayCount = _countAdjacentPrefillRun(row, col, axis) + 1; // +1 for the cell itself

    if (displayCount > 1) {
        dragCounterApply(row, col, displayCount);
    }
}

// Fires all class and passive system hooks for a correct fill.
function fireCorrectFillHooks(row, col) {
    if (typeof feedDrifter === 'function') feedDrifter();

    onCorrectFill(row, col);    // class.js hook
    if (typeof PassiveTracker !== 'undefined') PassiveTracker.onCorrectFill();

    _binomialBurstOnCorrectFill(row, col);
    _gamblersRuinOnCorrectFill();
    _frequentistsBurdenOnCorrectFill();
}

// sample_efficiency (nodes 1-3): after N consecutive correct fills, reveal a tile.
// The threshold decreases with higher nodes.
function checkSampleEfficiency(row, col) {
    if (!ptHasSkill('sample_efficiency_1')) return;
    if (ptHasSkill('keystone_ergodic_field')) return;

    consecutiveCorrectFills++;

    let threshold = 20;
    if (ptHasSkill('sample_efficiency_2')) threshold -= 2;
    if (ptHasSkill('sample_efficiency_3')) threshold -= 3;

    if (consecutiveCorrectFills >= threshold) {
        consecutiveCorrectFills = 0;
        // Capture the output of revealTiles
        const revealed = revealTiles(1);
        if (revealed && revealed.length > 0) {
            playSampleEfficiencyEffect(revealed[0].row, revealed[0].col);
            Audio_Manager.playSFX('sample_efficiency');
        }

        // Bayesian bonus: chance to reveal a second tile
        if (_getBayesianBonus() > 0 && Math.random() < _getBayesianBonus()) {
            _resetBayesianBonus();
            const bonusRevealed = revealTiles(1);

            if (bonusRevealed && bonusRevealed.length > 0) {
                // Delay the second effect slightly so they don't overlap perfectly
                setTimeout(() => {
                    playSampleEfficiencyEffect(bonusRevealed[0].row, bonusRevealed[0].col);
                    Audio_Manager.playSFX('sample_efficiency');
                }, 300);
            }
            questStat_sampleEfficiencyReveal();
        }

        showToast(`📈 ${LANG === 'de' ? 'Stichprobeneffizienz! 1 Zelle aufgedeckt.' : 'Sample Efficiency! 1 cell revealed.'}`);
        PassiveTracker.onSampleEffTrigger();
    }
}

// streak_bonus (nodes 1-3): after 15 consecutive correct fills, add bonus seconds.
// Keystone gamblers_ruin disables this skill entirely.
function checkStreakBonus() {
    if (!ptHasSkill('streak_bonus_1')) return;
    if (ptHasSkill('keystone_gamblers_ruin')) return;

    _streakBonusFills++;
    if (_streakBonusFills >= 15) {
        _streakBonusFills = 0;

        let bonus = 15;                                     // streak_bonus_1 base
        if (ptHasSkill('streak_bonus_2')) bonus += 5;
        if (ptHasSkill('streak_bonus_3')) bonus += 10;

        timerSecs += bonus;
        _levelTimeAdded += bonus;
        updTimer();
        if (typeof playTimeGainEffect === 'function') playTimeGainEffect(`+${bonus}s`, '#ffb830');
        showToast(`🔥 ${LANG === 'de' ? `Serienbonus! +${bonus}s` : `Streak Bonus! +${bonus}s`}`);
        PassiveTracker.onStreakBonusTrigger();
    }
}

// Orchestrates everything that happens after a verified correct left-click fill.
function handleCorrectFill(row, col) {
    if (STATE.questStats) STATE.questStats._ql_hasManuallyFilledCell = true;
    Audio_Manager.playSFX('cellFill');

    trackAchStat('tilesFilled');
    _incDirect('lifetimeTilesFilled');

    // Absolute Zero: leave a persistent frost crust on tiles correctly
    // filled while the freeze is active
    if (window._freezeActive && typeof _arcaneFreeze_applyPersistentFrost === 'function') {
        _arcaneFreeze_applyPersistentFrost(row, col);
    }

    // Endgame hooks
    if (isEndgameLevel()) {
        _egCheckAllClaims(row, col);
        if (typeof _egOnCorrectCell === 'function') _egOnCorrectCell(row, col);
    }

    updateDragStrokeCounter(row, col);
    fireCorrectFillHooks(row, col);
    checkSampleEfficiency(row, col);
    checkStreakBonus();

    // Character banter: react to a solid run of correct fills.
    if (typeof triggerBanter === 'function'
        && consecutiveCorrectFills > 0 && consecutiveCorrectFills % 10 === 0) {
        triggerBanter('correct_streak');
    }
}


//------------------------------------------------------------------------
//----------------------------APPLY CELL----------------------------------
//------------------------------------------------------------------------
// Core function: changes a cell's state. Called by cellDown() on the
// initial click and by onHover() for every cell entered while dragging.
//------------------------------------------------------------------------

function applyCell(row, col) {

    // --- Special intercepts (must run first) ---
    // These can completely redirect or consume the click.
    if (checkSpecialIntercepts(row, col)) return;

    // Cells that are already correctly filled (revealed by an item/skill,
    // or filled earlier) get skipped by the guard below as a no-op — but
    // they should still count toward the drag-stroke counter as we pass
    // over them.
    if (painting && pval === 1 && userGrid[row][col] === 1) {
        updateDragStrokeCounter(row, col);
    }

    // --- Cell guards ---
    // Silently ignore clicks that would be no-ops.
    if (checkCellGuards(row, col)) return;

    // --- Wrong fill path (left-click on an incorrect cell) ---
    if (pval === 1 && cur.grid[row][col] !== 1) {
        // First try sig-threshold intercept (must be before penalty logic)
        if (_sigThresholdIntercept(row, col)) {
            trackAchStat('sigThresholdIntercepts');
            return;
        }
        // Bayesian mistake-prevention intercepts
        if (typeof _typeIShieldIntercept === 'function' && _typeIShieldIntercept(row, col)) return;
        if (typeof _bayesTrapProtectionIntercept === 'function' && _bayesTrapProtectionIntercept(row, col)) return;

        // Try to absorb or apply the mistake; stop processing if game-over triggered
        if (handleWrongFill(row, col)) {
            // Whether absorbed or penalised, a wrong click on an endgame pickup discards it
            _egDiscardAllDrops(row, col);
            return;
        }

        // handleWrongFill handled everything — don't fall through to valid-move logic
        return;
    }

    // --- Valid move path ---

    // Lucky tile: right-clicking to mark ✕ on an unspent lucky tile grants a reward
    handleLuckyTileClaim(row, col);

    Audio_Manager.playSFX('cellMark');

    // Endgame: right-click mark on a correct cell discards a pickup heart
    if (isEndgameLevel() && typeof _egDiscardPickup === 'function'
        && pval === 2 && cur.grid[row][col] === 1) {
        _egDiscardPickup(row, col);
        _egDiscardLootDrop(row, col);
        if (typeof _egDiscardCurrencyDrop === 'function') _egDiscardCurrencyDrop(row, col);
    }

    // Write the new value into the player grid
    userGrid[row][col] = pval;
    if (pval !== 2) systemMarkedGrid[row][col] = false;

    // Extra logic that only applies to a correct left-click fill
    if (pval === 1 && cur.grid[row][col] === 1) {
        handleCorrectFill(row, col);
    }

    // Endgame: correct right-click mark on an empty-solution cell claims any drop there
    if (pval === 2 && cur.grid[row][col] === 0) {
        _egCheckAllClaims(row, col);
    }

    // Refresh display and check for puzzle completion
    renderCell(row, col);
    updClues(row, col);
    checkWin();
}


//------------------------------------------------------------------------
//-------------------CELL DOWN HELPER-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Determines what pval (paint value) a right-click should use,
// based on the cell's current state and user settings.
// Cycles: empty → ✕ → question mark (optional) → empty
function resolveRightClickValue(row, col) {
    if (userGrid[row][col] === 2 && SETTINGS.questionMark) {
        return 3;   // ✕ → question mark (if the setting is enabled)
    } else if (userGrid[row][col] === 2 && !SETTINGS.questionMark) {
        return 0;   // ✕ → empty (skip question mark)
    } else if (userGrid[row][col] === 3) {
        return 0;   // question mark → empty
    } else {
        return 2;   // empty → ✕
    }
}


//------------------------------------------------------------------------
//----------------------------CELL DOWN-----------------------------------
//------------------------------------------------------------------------
// Entry point for a mousedown event on any grid cell.
// Sets up drag state and fires the first applyCell() call.
//------------------------------------------------------------------------

function cellDown(e, row, col) {
    e.preventDefault();
    if (dead) return;

    mbtn = e.button;
    painting = true;

    dragStartRow = row;
    dragStartCol = col;
    dragAxis = null;
    dragStrokeCount = 0;
    dragCountedCells = new Set();

    // snapshot how many correct cells already sit adjacent to the
    // start cell along each axis, so the counter can pick up from there.
    dragPrefillRow = _countAdjacentPrefillRun(row, col, 'row');
    dragPrefillCol = _countAdjacentPrefillRun(row, col, 'col');
    dragPrefillApplied = false;

    // Touchpad Mode: swap which physical button means "fill" vs "mark".
    // effectiveBtn is what we treat the click AS, regardless of the real button pressed.
    const effectiveBtn = (touchpadMarkModeActive && mbtn === 0) ? 2
        : (touchpadMarkModeActive && mbtn === 2) ? 0
            : mbtn;

    if (effectiveBtn === 0) {
        pval = 1;
    } else {
        if (userGrid[row][col] === 1 && cur.grid[row][col] === 1) {
            painting = false;
            return;
        }
        pval = resolveRightClickValue(row, col);
    }

    applyCell(row, col);
}


//------------------------------------------------------------------------
//---------------------------STOP PAINTING--------------------------------
//------------------------------------------------------------------------
// Called on mouseup or when the cursor leaves the grid.
// Cleans up all drag state so the next stroke starts fresh.
//------------------------------------------------------------------------

function stopPainting() {
    painting = false;
    dragStartRow = -1;
    dragStartCol = -1;
    dragAxis = null;
    dragStrokeCount = 0;
    dragCountedCells = new Set();
    dragPrefillRow = 0;
    dragPrefillCol = 0;
    dragPrefillApplied = false;
    dragPrefillOffset = 0;
    dragCounterClear();
}

//------------------------------------------------------------------------
//----------------------------TOUCHPAD MODE-------------------------------
//------------------------------------------------------------------------
// Lets players on a touchpad swap left-click to act as "mark" instead of
// "fill", since trackpads often can't reliably right-click on a grid cell.
//------------------------------------------------------------------------

// Shows or hides the in-game toggle button based on the settings flag.
// Called on settings change (settings.js) and once on level start.
function updateTouchpadModeButtonVisibility() {
    const btn = document.getElementById('btn-touchpad-mode');
    if (!btn) return;
    btn.classList.toggle('hidden', !SETTINGS.touchpadModeEnabled);

    // If the setting was turned off while active, force back to normal mode
    if (!SETTINGS.touchpadModeEnabled && touchpadMarkModeActive) {
        touchpadMarkModeActive = false;
        _refreshTouchpadModeButtonLabel();
    }
}

// Updates the button's text/icon so it always reflects the CURRENT behaviour
// (not the behaviour you'll switch to) — e.g. while in Mark mode, the button
// reads "MARK" so the player always knows what left-click currently does.
function _refreshTouchpadModeButtonLabel() {
    const btn = document.getElementById('btn-touchpad-mode');
    if (!btn) return;
    if (touchpadMarkModeActive) {
        btn.textContent = '✕ MARK';
        btn.classList.add('touchpad-mode-active');
    } else {
        btn.textContent = '🖊️ FILL';
        btn.classList.remove('touchpad-mode-active');
    }
}

// Flips the mode. Wired to the button's click handler in ui-events.js (or here).
function toggleTouchpadMarkMode() {
    touchpadMarkModeActive = !touchpadMarkModeActive;
    _refreshTouchpadModeButtonLabel();
    Audio_Manager.playSFX('cellMark'); // small audio confirmation, reuses an existing sfx
}


//------------------------------------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------