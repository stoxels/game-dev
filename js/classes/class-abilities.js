// class-abilities.js
// Handles all class passive and active ability logic:
//   - Shared grid/cell helpers used across multiple abilities
//   - Dispatch routing to per-class and per-ascendency ability functions
//   - Active ability arming, instant firing, and cell-click execution
//   - Class passive setup at level start
//   - Passive reactions to correct fills and mistakes during play


//------------------------------------------------------------------------
//---------------------------CONSTANTS & STATE-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

let correctFillStreak = 0;
let nextPenaltyHalved = false;




//------------------------------------------------------------------------
//---------------------------CELL HELPERS---------------------------------
//------------------------------------------------------------------------
// Low-level helpers that read/write a single grid cell.
// Used by many ability implementations across the codebase.
//------------------------------------------------------------------------


// _resolveCell — reveals a filled cell OR marks an empty cell.
//   Returns the cell id string ("g-r-c") if the cell was actually changed, otherwise null.
function _resolveCell(r, c, sol) {
    if (sol[r][c] === 1) {
        if (!revealedGrid[r][c] && userGrid[r][c] !== 1) {
            revealedGrid[r][c] = true;
            userGrid[r][c] = 1;
            renderCell(r, c);
            updClues(r, c);
            return `g-${r}-${c}`;
        }
    } else {
        if (userGrid[r][c] === 0) {
            userGrid[r][c] = 2;
            systemMarkedGrid[r][c] = true;
            renderCell(r, c);
            return `g-${r}-${c}`;
        }
    }
    return null;
}


// _revealFilledCell — reveals a filled cell only. Never touches empty cells.
//   Used by Diagonal Strike when the 'diagonally_wrong' passive node is NOT active.
function _revealFilledCell(r, c, sol) {
    if (sol[r][c] === 1) {
        if (!revealedGrid[r][c] && userGrid[r][c] !== 1) {
            revealedGrid[r][c] = true;
            userGrid[r][c] = 1;
            renderCell(r, c);
            updClues(r, c);
            return `g-${r}-${c}`;
        }
    }
    return null;
}


// _filterRevealedIds — from a list of cell ids, returns only those whose solution cell is filled (=1).
function _filterRevealedIds(ids, sol) {
    return ids.filter(id => {
        const [, r, c] = id.split('-').map(Number);
        return sol[r][c] === 1;
    });
}


// _filterMarkedIds — from a list of cell ids, returns only those whose solution cell is empty (=0).
function _filterMarkedIds(ids, sol) {
    return ids.filter(id => {
        const [, r, c] = id.split('-').map(Number);
        return sol[r][c] === 0;
    });
}




//------------------------------------------------------------------------
//---------------------------DATA LOOKUP HELPERS--------------------------
//------------------------------------------------------------------------
// Resolves ability definitions and effect data from STATE and CLASS_DEFS /
// ASCENDENCY_DEFS. Keeps callers free of repeated level-index arithmetic.
//------------------------------------------------------------------------


// _getActiveAbilityData — returns the level-specific ability data object for the given slot.
//   Reads classActive1Level / classActive2Level from STATE.
function _getActiveAbilityData(def, activeKey) {
    const level = activeKey === 'active1'
        ? (STATE.classActive1Level || 1)
        : (STATE.classActive2Level || 1);
    return def[activeKey].levels[level - 1];
}


// _getPassiveEffect — returns the current passive effect object for the active class.
//   Reads classPassiveLevel from STATE.
function _getPassiveEffect() {
    const def = CLASS_DEFS[STATE.playerClass];
    const passLv = STATE.classPassiveLevel || 1;
    return def.passive.levels[passLv - 1].effect;
}


// _getAscendencySlotData — resolves the ability data for an ascendency HUD slot.
//   hudSlot 'active3' maps to ascendency active1; 'active4' maps to active2.
function _getAscendencySlotData(hudSlot) {
    const asc = STATE.playerAscendency ? ASCENDENCY_DEFS[STATE.playerAscendency] : null;
    if (!asc) return null;
    const ascSlot = hudSlot === 'active3' ? 'active1' : 'active2';
    const skillLv = ascSlot === 'active1'
        ? (STATE.ascendencySkill1Level || 1)
        : (STATE.ascendencySkill2Level || 1);
    return { asc, ascSlot, actData: asc[ascSlot].levels[skillLv - 1] };
}




//------------------------------------------------------------------------
//---------------------------UI / MODE HELPERS----------------------------
//------------------------------------------------------------------------
// Helpers that touch the DOM or show toasts related to ability arming.
//------------------------------------------------------------------------


// _setAbilityMode — arms or disarms activeAbilityMode and updates the targeting cursor.
//   The old approach set `cursor: crosshair` on #puzzle-scaler-wrap only, which was
//   silently overridden by .gc's `cursor: pointer` whenever the mouse was actually over
//   a grid cell. activateTargetingReticle() (targeting-reticle.js) replaces the native
//   cursor everywhere with a custom animated reticle that tracks the mouse via JS, so it
//   now stays consistent both inside and outside the grid.
function _setAbilityMode(armed) {
    activeAbilityMode = armed;
    if (typeof activateTargetingReticle === 'function') activateTargetingReticle(armed);
}


// _showAbilityArmToast — shows the "click a cell" hint toast for the given HUD slot.
//   Reads the localised cursor description from the ability definition.
function _showAbilityArmToast(slot) {
    let activeData = null;

    if (slot === 'active3' || slot === 'active4') {
        const asc = STATE.playerAscendency ? ASCENDENCY_DEFS[STATE.playerAscendency] : null;
        if (!asc) return;
        activeData = slot === 'active3' ? asc.active1 : asc.active2;
    } else {
        const def = CLASS_DEFS[STATE.playerClass];
        if (!def) return;
        activeData = def[slot];
    }

    if (!activeData) return;
    const msg = LANG === 'de'
        ? (activeData.descCursorDE || activeData.descCursorEn)
        : activeData.descCursorEn;
    showToast(`🎯 ${msg}`);
}




//------------------------------------------------------------------------
//------------------ABILITY DISPATCH (BASE CLASSES)-----------------------
//------------------------------------------------------------------------
// Routes an ability call to the correct implementation function and tracks
// the matching achievement stat. Split by active slot to keep each switch
// focused on a single set of abilities. Placed ahead of the instant-fire
// and cell-click execution sections below, since both call into this.
//------------------------------------------------------------------------


// _dispatchBaseActive1 — dispatches the active1 ability for base classes.
function _dispatchBaseActive1(playerClass, row, col, effect) {
    switch (playerClass) {
        case 'mathmagician':
            _executeArcaneReveal(row, col, effect.radius, effect.maxReveals);
            trackAchStat('skillArcaneRevealUsed');
            break;
        case 'statistician':
            _executeDataStrike(effect.solveCount, effect.revealCap || 5);
            trackAchStat('skillDataStrikeUsed');
            break;
        case 'probabilist':
            _executePrecisionMark(row, col, effect.extraLines || 0);
            trackAchStat('skillPrecisionMarkUsed');
            break;
    }
}


// _dispatchBaseActive2 — dispatches the active2 ability for base classes.
function _dispatchBaseActive2(playerClass, row, col, effect) {
    switch (playerClass) {
        case 'mathmagician':
            _executeArcaneFreeze(effect.freezeDuration);
            trackAchStat('skillAbsoluteZeroUsed');
            break;
        case 'statistician':
            _executeDiagonalStrike(row, col, effect.diagonals);
            trackAchStat('skillDiagonalStrikeUsed');
            break;
        case 'probabilist':
            _executeFieldScan(row, col, effect.scanSize, effect.scanDuration);
            trackAchStat('skillFieldScanUsed');
            break;
    }
}


// _dispatchBaseAbility — top-level router for base class active abilities.
//   Calls the correct active1 or active2 dispatcher, then logs the quest stat.
function _dispatchBaseAbility(activeKey, playerClass, row, col, effect) {
    if (activeKey === 'active1') {
        _dispatchBaseActive1(playerClass, row, col, effect);
    } else {
        _dispatchBaseActive2(playerClass, row, col, effect);
    }
    updateQuestStats('classAbilityUsed', {});
}




//------------------------------------------------------------------------
//------------------ABILITY DISPATCH (ASCENDENCIES)-----------------------
//------------------------------------------------------------------------
// Routes an ascendency ability call to the correct implementation and
// tracks the achievement stat. One case per ascendency for readability.
//------------------------------------------------------------------------


// _dispatchAscendencyAbility — routes to the correct ascendency skill implementation.
//   hudSlot 'active3' → ascendency active1 (skill 1); 'active4' → ascendency active2 (skill 2).
function _dispatchAscendencyAbility(hudSlot, ascendency, row, col, effect) {
    const ascSlot = hudSlot === 'active3' ? 'active1' : 'active2';

    updateQuestStats('classAbilityUsed', {});

    switch (ascendency) {
        case 'outlier':
            if (ascSlot === 'active1') {
                _executeTailRisk(effect.secondsPerCell, effect.maxCells);
            } else {
                _executeBlackSwan(effect.duration);
            }
            break;

        case 'actuary':
            if (ascSlot === 'active1') {
                _executeRegressionToPrior(effect.correctCount, effect.recoverPct);
            } else {
                _executeSignificanceThreshold(effect.protectCount, effect.bonusReveal);
            }
            break;

        case 'recursionist':
            if (ascSlot === 'active1') {
                _executeResidual(row, col, effect);
            } else {
                _executeDegreesOfFreedom(row, col, effect);
            }
            break;

        case 'markovian':
            if (ascSlot === 'active1') {
                _executeStateRollback(effect.windowSeconds, effect.rewindSeconds, effect.clearOldMistakes);
            } else {
                _executeTransitionMatrix(effect.duration, effect.cascadeChance, effect.maxDepth);
            }
            break;

        case 'bayesian':
            if (ascSlot === 'active1') {
                _executeBayesTraps(effect.trapCount, effect.availableTraps);
            } else {
                _executeTypeIShield(effect.seedCount, effect.bonusReveal);
            }
            break;

        case 'random_walker':
            if (ascSlot === 'active1') {
                _executeBrownianMotion(row, col, effect.paths, effect.rank);
            } else {
                _executeSummonDrifter(effect.duration, effect.interval, effect.smartTarget, effect.finalHowl);
            }
            break;
    }

    trackAchStat('skillAscendencyUsed');
}




//------------------------------------------------------------------------
//------------------INSTANT ABILITY DETECTION & FIRING-------------------
//------------------------------------------------------------------------
// Some abilities fire the moment the player presses the button, without
// waiting for a cell click. These helpers detect and fire those cases.
//------------------------------------------------------------------------


// _isInstantAbility — returns true if the given slot fires immediately on button press.
//   Instant abilities skip the arm → click flow entirely.
function _isInstantAbility(slot) {
    // Base class instants
    //if (STATE.playerClass === 'probabilist' && slot === 'active2') return true; // Field Scan
    if (STATE.playerClass === 'statistician' && slot === 'active1') return true; // Data Strike
    if (STATE.playerClass === 'mathmagician' && slot === 'active2') return true; // Absolute Zero

    // Ascendency instants
    if (STATE.playerAscendency === 'actuary') {
        if (slot === 'active3') return true; // Regression to Prior
        if (slot === 'active4') return true; // Significance Threshold
    }
    if (STATE.playerAscendency === 'markovian') {
        if (slot === 'active3') return true; // State Rollback
        if (slot === 'active4') return true; // Transition Matrix
    }
    if (STATE.playerAscendency === 'bayesian') {
        if (slot === 'active3') return true; // Bayes Traps
        if (slot === 'active4') return true; // Type I Error Shield
    }
    if (STATE.playerAscendency === 'outlier' && slot === 'active3') return true; // Tail Risk
    if (STATE.playerAscendency === 'random_walker') {
        if (slot === 'active3') return true; // Brownian Motion
        if (slot === 'active4') return true; // Drifter
    }


    // active4 instants for specific ascendencies
    if (slot !== 'active4') return false;
    return STATE.playerAscendency === 'outlier' || STATE.playerAscendency === 'recursionist';
}


// _fireInstantBaseAbility — fires an instant ability from the base class slot (active1/active2)
//   and immediately starts its cooldown.
function _fireInstantBaseAbility(slot) {
    const def = CLASS_DEFS[STATE.playerClass];
    if (!def) return;

    const actData = _getActiveAbilityData(def, slot);
    const effect = actData.effect;

    // Row/col are 0,0 — instant abilities ignore position.
    _dispatchBaseAbility(slot, STATE.playerClass, 0, 0, effect);

    const cdSeconds = getEffectiveCooldown(slot, def[slot].cooldownSeconds);
    startSlotCooldown(slot, cdSeconds);
}


// _fireInstantAscendencyAbility — fires an instant ability from an ascendency slot (active3/active4)
//   and immediately starts its cooldown.
function _fireInstantAscendencyAbility(slot) {
    const slotData = _getAscendencySlotData(slot);
    if (!slotData) return;

    const { asc, ascSlot, actData } = slotData;
    const effect = actData.effect;

    // Row/col are 0,0 — instant abilities ignore position.
    _dispatchAscendencyAbility(slot, STATE.playerAscendency, 0, 0, effect);

    const cdSeconds = getEffectiveCooldown(slot, asc[ascSlot].cooldownSeconds);
    startSlotCooldown(slot, cdSeconds);
}


// _fireInstantAbility — router that fires the correct instant handler based on slot.
function _fireInstantAbility(slot) {
    if (slot === 'active1' || slot === 'active2') {
        _fireInstantBaseAbility(slot);
    } else {
        _fireInstantAscendencyAbility(slot);
    }
    buildClassHUD();
}



// Advances the "press 1/2" HUD hint counter. Only counts activations of the base
// class slots (1/2), since that's what the arrows point at. Once it reaches
// CLASS_HUD_HINT_MAX_USES the arrows stop rendering on the next HUD rebuild.
function _trackActivationHintProgress(slot) {
    if (slot !== 'active1' && slot !== 'active2') return;
    if ((STATE.classHudHintUses || 0) >= CLASS_HUD_HINT_MAX_USES) return;

    STATE.classHudHintUses = (STATE.classHudHintUses || 0) + 1;
    save();
}


//------------------------------------------------------------------------
//------------------ACTIVE ABILITY TOGGLE (ENTRY POINT)------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// toggleActiveAbility — entry point when the player presses an ability button.
//   slot: 'active1' | 'active2' | 'active3' | 'active4'
//   Instant abilities fire immediately. All others arm the crosshair cursor
//   so the next grid click calls executeActiveAbility().
function toggleActiveAbility(slot) {
    if (isClassless()) return;
    const newSlot = slot || 'active1';
    const cd = cooldownState[newSlot];

    if (dead || cd.remaining > 0) return;

    // Clicking the already-armed slot cancels the arm
    const isAlreadyArmed = activeAbilityMode && STATE.classActiveChoice === newSlot;
    if (isAlreadyArmed) {
        _setAbilityMode(false);
        buildClassHUD();
        return;
    }

    // Disallow activating or switching to another ability if one is already armed
    if (activeAbilityMode && STATE.classActiveChoice !== newSlot) {
        return;
    }

    STATE.classActiveChoice = newSlot;
    _trackActivationHintProgress(newSlot);

    if (_isInstantAbility(newSlot)) {
        _fireInstantAbility(newSlot);
        return;
    }

    // Arm the cursor and wait for a cell click
    _setAbilityMode(true);
    _showAbilityArmToast(newSlot);
    buildClassHUD();
}




//------------------------------------------------------------------------
//------------------ACTIVE ABILITY CELL-CLICK EXECUTION------------------
//------------------------------------------------------------------------
// Called when the player clicks a cell while an ability is armed.
// Routes to base class or ascendency execution, then starts cooldown.
//------------------------------------------------------------------------


// _handleRecursionistTotemPlacement — special post-fire logic for the Recursionist
//   Residual skill. Cooldown is deferred until all totem slots are filled.
//   Returns true if the caller should skip the normal cooldown start.
function _handleRecursionistTotemPlacement(activeKey, asc, ascSlot, effect) {
    const maxTotemsAllowed = effect.maxTotems || 1;
    const currentTotems = (window._residualTotems || []).length;

    if (currentTotems >= maxTotemsAllowed) {
        // All slots filled — close selection mode and start cooldown
        _setAbilityMode(false);
        const cdSeconds = getEffectiveCooldown(activeKey, asc[ascSlot].cooldownSeconds);
        startSlotCooldown(activeKey, cdSeconds);
        showToast('💀 All active totems deployed.');
        return true; // cooldown was handled here
    }

    // Still room for more totems — keep selection mode open
    const remaining = maxTotemsAllowed - currentTotems;
    showToast(`💀 Totem placed! Click another mistake cell to place another. (${remaining} left)`);
    return false; // caller should NOT start cooldown yet
}


// _executeAscendencySkillOnCell — fires a targeted ascendency ability on the clicked cell
//   and handles post-fire cooldown logic, including the Recursionist special case.
function _executeAscendencySkillOnCell(activeKey, row, col) {
    const slotData = _getAscendencySlotData(activeKey);
    if (!slotData) return;

    const { asc, ascSlot, actData } = slotData;
    const effect = actData.effect;

    _dispatchAscendencyAbility(activeKey, STATE.playerAscendency, row, col, effect);

    // Recursionist Residual: cooldown is deferred until the totem cap is reached
    if (STATE.playerAscendency === 'recursionist' && ascSlot === 'active1') {
        _handleRecursionistTotemPlacement(activeKey, asc, ascSlot, effect);
        return;
    }

    // All other targeted ascendency skills: end arm mode and start cooldown immediately
    _setAbilityMode(false);
    const cdSeconds = getEffectiveCooldown(activeKey, asc[ascSlot].cooldownSeconds);
    startSlotCooldown(activeKey, cdSeconds);
}


// _executeBaseSkillOnCell — fires a targeted base class ability on the clicked cell
//   and starts its cooldown immediately.
function _executeBaseSkillOnCell(activeKey, row, col) {
    _setAbilityMode(false);
    const def = CLASS_DEFS[STATE.playerClass];
    const actData = _getActiveAbilityData(def, activeKey);
    const effect = actData.effect;

    _dispatchBaseAbility(activeKey, STATE.playerClass, row, col, effect);

    const cdSeconds = getEffectiveCooldown(activeKey, def[activeKey].cooldownSeconds);
    startSlotCooldown(activeKey, cdSeconds);
}


// executeActiveAbility — called when the player clicks a grid cell while an ability is armed.
//   Routes to ascendency or base class execution based on the active HUD slot.
function executeActiveAbility(row, col) {
    if (!activeAbilityMode || !STATE.playerClass || dead) return;
    if (isClassless()) { _setAbilityMode(false); return; }

    trackAchStat('classAbilitiesUsedTotal'); 

    const activeKey = STATE.classActiveChoice || 'active1';

    if (activeKey === 'active3' || activeKey === 'active4') {
        _executeAscendencySkillOnCell(activeKey, row, col);
    } else {
        _executeBaseSkillOnCell(activeKey, row, col);
    }

    buildClassHUD();
}




//------------------------------------------------------------------------
//---------------------------CLASS PASSIVES-------------------------------
//------------------------------------------------------------------------
// Logic that runs at level start (state reset + initial passive bonuses)
// and passive reactions to correct fills and mistakes during play.
//------------------------------------------------------------------------


// _resetClassLevelState — zeroes all per-level tracking flags and window globals
//   before any class-specific passive setup runs.
function _resetClassLevelState() {
    correctFillStreak = 0;
    nextPenaltyHalved = false;
    window._momentumThisLevel = 0;
    window._dataStrikeUsesThisLevel = 0;
    window._veiled_cursedUsed = false;
    window._goldenClockActive = false;
    window._goldenClockMistakesLeft = null;
    window._cursedImmune = false;
    window._shieldExtraCharges = 0;
    window._bayesTrapsState = null;
    window._typeIShieldedCells = new Set();
    window._typeIBonusReveal = false;
    window._bayesTrapProtectedLines = new Set();
    _varianceShield_removeBubble();

    updateMomentumBar(0, 15);

    if (typeof resetRecursionistState === 'function') resetRecursionistState();
    if (typeof resetMarkovianState === 'function') resetMarkovianState();
}


// _applyMathmagicianPassive — sets up the Variance Shield free-mistake counter.
//   Adds bonus charges from passive tree nodes reinforced_shield and fortified_shield.
function _applyMathmagicianPassive(effect) {
    let freeMistakes = effect.freeMistakes || 0;
    if (ptHasSkill('reinforced_shield')) freeMistakes += 1;
    if (ptHasSkill('fortified_shield')) freeMistakes += 1;
    window._classFreeMistakes = freeMistakes;
    _varianceShield_updateVisibility();
}


// _collectProbabilistMarkCount — builds the auto-mark count for the Probabilist passive,
//   adding bonus marks from passive tree nodes.
function _collectProbabilistMarkCount(baseCount) {
    let markCount = baseCount;
    if (ptHasSkill('prior_knowledge')) markCount += 1;
    if (ptHasSkill('updated_beliefs')) markCount += 1;
    if (ptHasSkill('posterior_insight')) markCount += 1;
    if (ptHasSkill('convergent_evidence')) markCount += 1;
    return markCount;
}


// _snapshotMarkedCells — returns a Set of all cell ids that are currently marked (userGrid === 2).
function _snapshotMarkedCells() {
    const marked = new Set();
    if (!cur) return marked;
    const sol = cur.grid;
    for (let r = 0; r < sol.length; r++)
        for (let c = 0; c < sol[0].length; c++)
            if (userGrid[r][c] === 2) marked.add(`g-${r}-${c}`);
    return marked;
}


// _collectNewlyMarkedCells — returns the cell ids that are now marked but were not in the snapshot.
function _collectNewlyMarkedCells(markedBefore) {
    const newlyMarked = [];
    if (!cur) return newlyMarked;
    const sol = cur.grid;
    for (let r = 0; r < sol.length; r++)
        for (let c = 0; c < sol[0].length; c++)
            if (userGrid[r][c] === 2 && !markedBefore.has(`g-${r}-${c}`))
                newlyMarked.push(`g-${r}-${c}`);
    return newlyMarked;
}


// _applyProbabilistBonusReveals — reveals bonus cells for confirmed_hypothesis / god_of_probabilities.
function _applyProbabilistBonusReveals() {
    let bonusReveals = 0;
    if (ptHasSkill('confirmed_hypothesis')) bonusReveals += 1;
    if (ptHasSkill('god_of_probabilities')) bonusReveals += 1;
    for (let i = 0; i < bonusReveals; i++) _bayesianRevealOneCell();
}


// _applyProbabilistPassive — runs the delayed Bayesian Insight auto-mark sequence
//   for the Probabilist at level start.
function _applyProbabilistPassive(effect) {
    if (!effect.autoMarkCount) return;

    setTimeout(() => {
        const markCount = _collectProbabilistMarkCount(effect.autoMarkCount);
        const markedBefore = _snapshotMarkedCells();

        markWrongTiles(markCount);
        Audio_Manager.playSFX('bayesianInsight');
        trackAchStat('bayesianInsightUsed');

        const newlyMarked = _collectNewlyMarkedCells(markedBefore);
        if (typeof _playBayesianInsightAnimation === 'function') {
            _playBayesianInsightAnimation(newlyMarked);
        }

        _applyProbabilistBonusReveals();
    }, 300);
}


// _bayesianRevealOneCell — reveals 1 random unrevealed filled cell at level start.
//   Used by confirmed_hypothesis and god_of_probabilities passive nodes.
function _bayesianRevealOneCell() {
    if (!cur) return;
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const candidates = [];

    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (sol[r][c] === 1 && !revealedGrid[r][c] && userGrid[r][c] !== 1)
                candidates.push([r, c]);

    if (!candidates.length) return;

    const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
    revealedGrid[r][c] = true;
    userGrid[r][c] = 1;
    renderCell(r, c);
    updClues(r, c);
    trackAchStat('tilesRevealed', 1);
    _incDirect('lifetimeTilesRevealed', 1);

    if (typeof _playBayesianRevealEffect === 'function') {
        const cellEl = document.getElementById(`g-${r}-${c}`);
        if (cellEl) _playBayesianRevealEffect(cellEl);
    }
}


// applyClassPassiveOnLevelStart — called at the start of each level.
//   Resets all per-level state, then applies the class passive starting bonus.
function applyClassPassiveOnLevelStart() {
    _resetClassLevelState();

    if (!STATE.playerClass || isClassless()) return;

    const effect = _getPassiveEffect();

    if (STATE.playerClass === 'mathmagician') _applyMathmagicianPassive(effect);
    if (STATE.playerClass === 'probabilist') _applyProbabilistPassive(effect);
}




//------------------------------------------------------------------------
//------------------PENALTY MODIFIER (CORRECT PENALTIES)-----------------
//------------------------------------------------------------------------
// Intercepts the penalty timer hit and applies class-specific modifiers
// before the standard deduction is applied.
//------------------------------------------------------------------------


// _applyMathmagicianShieldAbsorb — consumes one free-mistake charge and optionally
//   grants bonus time via passive tree nodes. Returns true if the penalty was absorbed.
function _applyMathmagicianShieldAbsorb() {
    if (window._classFreeMistakes <= 0) return false;

    window._classFreeMistakes--;
    absorbedMistakes++;
    buildClassHUD();
    Audio_Manager.playSFX('varianceShield');
    trackAchStat('mistakesAbsorbed');

    _varianceShield_playCometImpact();   
    _varianceShield_updateVisibility(); 

    // Each passive node has its own independent chance to grant bonus time
    let bonus = 0;
    if (ptHasSkill('calculated_error') && Math.random() < 0.50) bonus += 120;
    if (ptHasSkill('error_dividend') && Math.random() < 0.25) bonus += 30;
    if (ptHasSkill('lucky_lapse') && Math.random() < 0.25) bonus += 30;

    // god_of_math doubles all absorbed-mistake time bonuses
    if (ptHasSkill('god_of_math') && bonus > 0) bonus *= 2;

    if (bonus > 0) {
        const before = timerSecs;
        timerSecs = Math.min(timerSecs + bonus, 3600);
        _trackTimerDelta(before, timerSecs);
        updTimer();

        const label = (LANG === 'de')
            ? (bonus === 1 ? 'Sekunde' : 'Sekunden')
            : (bonus === 1 ? 'second' : 'seconds');

        const msg = (LANG === 'de')
            ? `🔮 Absorbiert! +${bonus} ${label}`
            : `🔮 Absorbed! +${bonus} ${label}`;

        showToast(msg);


        trackAchStat('timeAdded', bonus);
    }

    return true;
}


// getClassPenaltyMultiplier — returns the penalty time multiplier for the current mistake.
//   Called from applyPenalty() in mousebutton_handlers.js before the time deduction is applied.
//   Returns 0.0 if the penalty should be fully blocked (absorbed by a free mistake).
//   Returns 5.0 if a Black Swan streak is broken (heavy punishment).
//   Returns 1.0 for all other cases (standard penalty).
function getClassPenaltyMultiplier() {
    if (!STATE.playerClass || isClassless()) return 1.0;

    // Breaking an active Speedforce (Black Swan) streak ends it unnaturally and applies a heavy penalty
    if (window._blackSwanActive) {
        _endBlackSwan(false);
        showToast(LANG === 'de' ? '📉 SPEEDFORCE abgebrochen!' : '📉 SPEEDFORCE broken!');
        return 5.0;
    }

    // Mathmagician Variance Shield absorbs the mistake entirely
    if (STATE.playerClass === 'mathmagician') {
        const absorbed = _applyMathmagicianShieldAbsorb();
        if (absorbed) return 0.0;
    }

    return 1.0;
}




//------------------------------------------------------------------------
//------------------CORRECT FILL REACTIONS--------------------------------
//------------------------------------------------------------------------
// Passive abilities that trigger when the player correctly fills a cell.
//------------------------------------------------------------------------


// _handleTransitionMatrixCascade — if Transition Matrix is active, cascade from the
//   newly filled cell. Clears the effect if its duration has expired.
function _handleTransitionMatrixCascade(row, col) {
    if (!window._transitionMatrixActive) return;
    if (typeof _transitionMatrixCascade !== 'function') return;

    const tm = window._transitionMatrixActive;
    if (Date.now() <= tm.endTime) {
        _transitionMatrixCascade(row, col, tm.maxDepth);
    } else {
        _clearTransitionMatrix(true);
    }
}


// _handleMathmagicianFreezeBonus — during Absolute Zero, awards passive bonuses
//   for correct fills. frozen_resilience grants +1 shield every 5 fills;
//   god_of_math reduces the Arcane Reveal cooldown by 1s per fill.
function _handleMathmagicianFreezeBonus() {
    if (STATE.playerClass !== 'mathmagician' || !window._freezeActive) return;

    if (ptHasSkill('frozen_resilience')) {
        window._freezeCorrFills = (window._freezeCorrFills || 0) + 1;
        if (window._freezeCorrFills % 5 === 0) {
            window._classFreeMistakes = (window._classFreeMistakes || 0) + 1;

            _varianceShield_updateVisibility(); 

            const label = (LANG === 'de') ? 'Schild' : 'shield';
            const msg = (LANG === 'de')
                ? `🔮 Gefrorene Widerstandskraft! +1 ${label}!`
                : `🔮 Frozen Resilience! +1 ${label}!`;
            showToast(msg);
        }
    }

    if (ptHasSkill('god_of_math')) {
        const cd = cooldownState['active1'];
        if (cd.remaining > 0) {
            cd.remaining = Math.max(0, cd.remaining - 1);
            _patchCooldownButton('active1');
        }
    }
}


// _handlePrecisionMarkMomentum — if momentum_of_certainty is active and the filled
//   cell is inside the tracked Precision Mark window, grants +20s and clears the
//   cell from the window (auto-closes when all tracked cells are filled).
function _handlePrecisionMarkMomentum(row, col) {
    if (!ptHasSkill('momentum_of_certainty')) return;
    if (!window._pmMomentumActive || !window._pmMomentumSet) return;

    const id = `g-${row}-${col}`;
    if (!window._pmMomentumSet.has(id)) return;

    window._pmMomentumSet.delete(id);
    const before = timerSecs;
    timerSecs = Math.min(timerSecs + 20, 3600);
    _trackTimerDelta(before, timerSecs);
    showToast(LANG === 'de' ? '🎯 Schwung der Gewissheit! +20 s!' : '🎯 Momentum of Certainty! +20 s!');
    trackAchStat('timeAdded', 20);

    if (window._pmMomentumSet.size === 0) {
        // All tracked cells filled — close the momentum window
        window._pmMomentumActive = false;
        window._pmMomentumSet = null;
    }
}


// _handleStatisticianStreak — advances or triggers the Statistician fill streak.
//   Black Swan mode bypasses the streak counter and fires momentum on every fill.
function _handleStatisticianStreak(effect) {
    if (window._blackSwanActive) {
        // Black Swan: momentum on every correct fill, no streak required
        _statisticianTriggerMomentum(effect.bonusSeconds);
        updateMomentumBar(correctFillStreak, effect.streakForBonus);
        return;
    }

    correctFillStreak++;
    if (correctFillStreak >= effect.streakForBonus) {
        _statisticianTriggerMomentum(effect.bonusSeconds);
        // Streak was reset to 0 inside _statisticianTriggerMomentum
    } else {
        updateMomentumBar(correctFillStreak, effect.streakForBonus);
    }
}


// onCorrectFill — called from ac() in mouse-button-handlers.js whenever the player
//   correctly fills a cell. Runs all passive reactions in priority order.
function onCorrectFill(row, col) {
    _handleTransitionMatrixCascade(row, col);
    _handleMathmagicianFreezeBonus();
    _handlePrecisionMarkMomentum(row, col);

    // Statistician streak logic only applies to the Statistician class
    if (STATE.playerClass !== 'statistician' || isClassless()) return;
    _handleStatisticianStreak(_getPassiveEffect());
}




//------------------------------------------------------------------------
//------------------MISTAKE REACTIONS-------------------------------------
//------------------------------------------------------------------------
// Passive abilities that trigger when the player makes a wrong fill.
//------------------------------------------------------------------------


// _getStatisticianStreakReduction — returns how many streak points a mistake costs
//   based on which passive tree nodes are active.
//   learning_from_mistakes + mistakes_no_matter together: -10. Either alone: -12. Neither: full reset.
function _getStatisticianStreakReduction(hasLFM, hasMNM) {
    if (hasLFM && hasMNM) return 10;
    if (hasLFM || hasMNM) return 12;
    return null; // null signals a full reset
}


// onMistake — called on any wrong fill (from input.js).
//   Resets or reduces the Statistician fill streak depending on passive tree nodes.
function onMistake() {
    if (STATE.playerClass === 'statistician' && !isClassless()) {
        const effect = _getPassiveEffect();
        const threshold = effect.streakForBonus || 15;
        const hasLFM = ptHasSkill('learning_from_mistakes');
        const hasMNM = ptHasSkill('mistakes_no_matter');
        const reduction = _getStatisticianStreakReduction(hasLFM, hasMNM);

        if (reduction !== null) {
            correctFillStreak = Math.max(0, correctFillStreak - reduction);
        } else {
            correctFillStreak = 0;
        }

        updateMomentumBar(correctFillStreak, threshold);
        return;
    }

    correctFillStreak = 0;
}