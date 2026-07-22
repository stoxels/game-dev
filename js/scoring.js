// =============================================================================
// scoring.js
// Handles all end-of-level scoring logic: puzzle validation, score calculation,
// bonus evaluation, lucky drops, achievement hooks, special rewards, win overlay
// rendering, and the main checkWin() entry point.
// =============================================================================


//------------------------------------------------------------------------
//-------------------MODULE-LEVEL STATE-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Tracks points earned during the current active run.
// Set inside calculateScore() when a level is completed and referenced by
// the win overlay to show how many points were awarded vs. the previous best.
let currentRunScore = 0;


//------------------------------------------------------------------------
//-------------------PUZZLE VALIDATION------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if every cell in the player's grid matches the solution.
// A cell counts as "filled" if the player marked it (userGrid === 1)
// or if it was revealed by a helper item (revealedGrid === true).
function isPuzzleSolved() {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const playerFilled = userGrid[r][c] === 1 || revealedGrid[r][c];
            const solutionFilled = sol[r][c] === 1;
            if (playerFilled !== solutionFilled) return false;
        }
    }
    return true;
}


//------------------------------------------------------------------------
//-------------------SCORE CALCULATION------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the raw score before the multiplier is applied.
// Base score grows with grid size; remaining time adds a bonus;
// each mistake deducts points. Score is floored at 10.
function computeRawScore(rows, cols) {
    const baseScore = 100 + (rows + cols) * 2;

    // Time Trial halves the starting clock, which would otherwise also halve
    // the time bonus. Add back exactly what was cut so the bonus reflects
    // the same effective time budget as normal mode.
    const normalizedSecs = timerSecs + (curMods.timetrial ? (window._timetrialTimeCut || 0) : 0);

    const cappedTime = Math.min(normalizedSecs, 3600);   // cap at 1 hour to prevent abuse
    const timeBonus = Math.floor(cappedTime / 10);
    const mistakePenalty = mistakeCount * 20;
    return Math.max(10, baseScore + timeBonus - mistakePenalty);
}

// Determines how many net-new points are awarded to the player.
// If the current run score beats the level high score, the difference is awarded.
// Otherwise nothing is awarded (the player already has a better record).
function computePointsAwarded(pts, gi) {
    const hs = STATE.levelHS[gi];
    const prevBest = hs ? hs.score : 0;
    return { ptsAwarded: Math.max(0, pts - prevBest), prevBest };
}

// Saves a new high-score entry for this level if the current run beats the record.
function maybeUpdateHighScore(gi, pts) {
    const hs = STATE.levelHS[gi];
    if (!hs || pts > hs.score) {
        STATE.levelHS[gi] = {
            score: pts,
            diff: curDiff,
            time: timerSecs,
            mods: { ...curMods },
        };
    }
}

// Master score calculation function.
// Computes the final score, awards net-new points to the player's total,
// updates the level high score if beaten, and returns all relevant values
// for display and quest-stat tracking.
function calculateScore(rows, cols) {
    const gi = cur.gIdx;
    const rawScore = computeRawScore(rows, cols);
    const mult = scoreMultiplier();
    const pts = Math.round(rawScore * mult);

    const { ptsAwarded, prevBest } = computePointsAwarded(pts, gi);

    STATE.totalScore += ptsAwarded;
    maybeUpdateHighScore(gi, pts);

    return { pts, ptsAwarded, prevBest, mult };
}


//------------------------------------------------------------------------
//-------------------BONUS OBJECTIVE EVALUATION---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if the current level's bonus condition has been satisfied.
// Each bonusType has its own pass/fail rule; unknown types default to false.
function evaluateBonusObjective(elapsed) {
    const bt = cur.bonusType || 'nomiss';
    const bp = cur.bonusParam !== undefined ? cur.bonusParam : 0;

    switch (bt) {
        case 'fast': return elapsed <= bp;
        case 'nomiss': return mistakeCount === 0;
        case 'lowmiss': return mistakeCount <= bp;
        case 'noitem': return itemsUsedThisLevel === 0;
        case 'quiz': return true;   // quiz bonus is evaluated separately via showQuiz()
        case 'combo': return elapsed <= bp && mistakeCount === 0;
        case 'noitem_nomiss': return itemsUsedThisLevel === 0 && mistakeCount === 0;
        case 'noitem_fast': return itemsUsedThisLevel === 0 && elapsed <= bp;
        default: return false;
    }
}


//------------------------------------------------------------------------
//-------------------ACHIEVEMENT HOOKS------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Counts how many solution cells are filled (value === 1) in the grid.
function countFilledCells(sol, rows, cols) {
    let count = 0;
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (sol[r][c] === 1) count++;
    return count;
}

// Counts how many cells the player has cross-marked (userGrid value === 2).
function countMarkedCells(rows, cols) {
    if (!userGrid) return 0;
    let count = 0;
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (userGrid[r][c] === 2) count++;
    return count;
}

// Fires the achievement system's level-complete hook with all relevant stats,
// then clears the per-run window flags used by penalty-clutch and bounceback logic.
function fireAchievements({ gi, rows, cols, elapsed, pts, ptsAwarded, prevBest, mult, isFirstClear }) {
    const sol = cur.grid;
    const totalCells = rows * cols;
    const cellsFilled = countFilledCells(sol, rows, cols);
    const tilesMarked = countMarkedCells(rows, cols);

    onLevelCompleteAch({
        mistakes: mistakeCount,
        itemsUsed: itemsUsedThisLevel,
        diff: curDiff,
        mods: curMods,
        playerClass: STATE.playerClass || null,
        playerAscendency: STATE.playerAscendency || null,
        absorbedMistakes: absorbedMistakes,
        absorbedThisLevel: absorbedMistakes,
        cellsFilled,
        tilesMarked,
        totalCells,
        rows,
        cols,
        scoreEarned: pts,
        world: cur.world,
        gi,
        elapsed,
        timerSecs,
        pts,
        prevBest,
        mult,
        isFirstClear,
        hadPenaltyClutch: !!window._hadPenaltyClutch,
        isBouncebackWin: window._lastFailedGi === gi,
    });

    // Reset transient run flags consumed by the achievement system
    window._hadPenaltyClutch = false;
    window._lastFailedGi = null;

    checkWorldCompleteAch();
}


//------------------------------------------------------------------------
//-------------------CONVERGENCE REWARD-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if the current level sits at the 33% or 66% milestone
// within its world — these are "convergence" levels that grant a passive tree point.
function isConvergenceLevel(worldData, isAscensionLevel) {
    if (worldData.data.length <= 2) return false;
    const c1 = Math.floor((worldData.data.length - 1) / 3);
    const c2 = Math.floor((worldData.data.length - 1) * 2 / 3);
    const idx = cur.li - 1;
    return (idx === c1 || idx === c2) && !isAscensionLevel;
}

// Grants one passive tree point on the first clear of a convergence level
// and queues the convergence modal for display after the win overlay closes.

function applyConvergenceReward(gi) {
    if (!STATE.convergenceDone) STATE.convergenceDone = [];
    const isFirstEver = STATE.convergenceDone.length === 0;
    STATE.convergenceDone.push(gi);
    STATE.passiveTreePoints = (STATE.passiveTreePoints || 0) + 1;
    save();
    window._pendingConvergenceModal = true;

    if (isFirstEver) {
        //showBeat('first_convergence');
    }
}


//------------------------------------------------------------------------
//-------------------ASCENSION REWARD-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Grants the Codex of Completion artifact on the first clear of the final
// level in a world (the ascension level), and writes its reward HTML into irz.
// Does nothing in ironman mode — that mode disables item rewards.
function applyAscensionReward(irz) {
    const defId = 'artifactComplete';
    const codexDef = ITEM_DEFS[defId];

    STATE.inventory.push({
        defId,
        uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    });
    save();

    const rc = rarityColors(codexDef.rarity);
    irz.innerHTML = `
        <div class="item-reward" data-reward-defid="${defId}"
             style="border-color:${rc.border};color:${rc.color};cursor:default;">
            🌟 ${LANG === 'de' ? 'Aufstiegsbonus' : 'Ascension Reward'}:
            ${codexDef.icon} <strong>${itemName(codexDef)}</strong>
        </div>`;
}

// Dispatcher for convergence and ascension one-time rewards.
// Called during win-overlay rendering; writes into the item-reward zone (irz)
// when an ascension reward applies.
function handleSpecialRewards({ gi, isFirstClear, isAscensionLevel, irz }) {
    const worldData = WORLDS[cur.world - 1];

    if (isConvergenceLevel(worldData, isAscensionLevel) && isFirstClear) {
        applyConvergenceReward(gi);
    }

    if (isAscensionLevel && isFirstClear && !curMods.ironman) {
        applyAscensionReward(irz);
    }
}


//------------------------------------------------------------------------
//-------------------LUCKY DROPS------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the total drop chance for lucky drops based on allocated passive nodes.
// Base chance is 25%; each bonus_replay node adds an additional percentage.
function getLuckyDropChance() {
    let chance = 0.25;
    if (ptHasSkill('bonus_replay_1')) chance += 0.10;
    if (ptHasSkill('bonus_replay_2')) chance += 0.15;
    if (ptHasSkill('bonus_replay_3')) chance += 0.20;
    if (_charIs('trix')) chance += 0.15;
    return chance;
}

// Returns the chance of receiving a second lucky drop item.
// Each lucky_replay node contributes an additive percentage.
function getExtraItemChance() {
    return (ptHasSkill('lucky_replay_1') ? 0.10 : 0)
        + (ptHasSkill('lucky_replay_2') ? 0.15 : 0)
        + (ptHasSkill('lucky_replay_3') ? 0.20 : 0);
}

// Decides how many lucky drop items to grant this trigger (1 or 2).
function rollLuckyDropCount() {
    return Math.random() < getExtraItemChance() ? 2 : 1;
}

// Builds the HTML for a single lucky-drop item reward and adds it to the inventory.
function grantLuckyDropItem() {
    const defId = pickRandomItem();
    if (!defId) return '';

    const def = ITEM_DEFS[defId];
    if (!def) return '';

    STATE.inventory.push({ defId, uid: Date.now() + Math.random().toString(36).slice(2) });

    const rc = rarityColors(def.rarity);
    return `
        <div class="item-reward" data-reward-defid="${defId}"
             style="border-color:${rc.border};color:${rc.color};cursor:default;">
            ${t('ov_lucky_drop')} ${def.icon} <strong>${itemName(def)}</strong>
        </div>`;
}

// Attempts to trigger lucky drops for this level completion.
// Requires the lucky_drops passive node to be allocated.
// Returns an HTML string of all item-reward divs granted, or '' if none triggered.
function rollLuckyDrops() {
    if (!ptHasSkill('lucky_drops') && !_charIs('trix')) return '';
    if (Math.random() >= getLuckyDropChance()) return '';

    STATE.questStats = STATE.questStats || {};
    STATE.questStats.luckyDropsClaimed = (STATE.questStats.luckyDropsClaimed || 0) + 1;

    const count = rollLuckyDropCount();
    let html = '';
    for (let i = 0; i < count; i++) {
        html += grantLuckyDropItem();
    }

    if (html) save();
    return html;
}


//------------------------------------------------------------------------
//-------------------WIN OVERLAY HELPERS----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Formats a time in seconds as "M:SS".
function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Builds the gain-note string shown next to the score.
// If a new record was set, shows the net-new points and the previous best.
// Otherwise shows just the total points awarded.
function buildGainNote(pts, ptsAwarded, prevBest) {
    if (ptsAwarded < pts) {
        return ` (+${ptsAwarded} ${t('ov_win_new')} — ${t('ov_win_best_was')} ${prevBest})`;
    }
    return ` (+${ptsAwarded})`;
}

// Returns the appropriate HTML line for the mistake count.
// Handles the three distinct display states: no mistakes, all absorbed, partial absorbed.
function buildMistakeLine() {
    const totalWrongClicks = mistakeCount + absorbedMistakes;

    if (totalWrongClicks === 0) {
        return `<div class="ov-sub-line ov-sub-miss-ok">✗ 0 ${t('ov_win_mistakes')}</div>`;
    }

    const absorbedNote = `<span style="opacity:0.55;font-size:0.85em">(${absorbedMistakes} ${t('ov_win_absorbed')})</span>`;

    if (absorbedMistakes > 0 && mistakeCount === 0) {
        // All wrong clicks were absorbed — still shows as a clean run
        return `<div class="ov-sub-line ov-sub-miss-ok">✗ 0 ${t('ov_win_mistakes')} ${absorbedNote}</div>`;
    }

    const mistakeWord = mistakeCount !== 1 ? t('ov_win_mistakes') : t('ov_win_mistake');
    const cssClass = mistakeCount === 0 ? 'ov-sub-miss-ok' : 'ov-sub-miss';

    if (absorbedMistakes > 0) {
        return `<div class="ov-sub-line ${cssClass}">✗ ${mistakeCount} ${mistakeWord} ${absorbedNote}</div>`;
    }

    return `<div class="ov-sub-line ${cssClass}">✗ ${mistakeCount} ${mistakeWord}</div>`;
}

function buildScoreColumn(pts, ptsAwarded, prevBest, mult) {
    const gainNote = buildGainNote(pts, ptsAwarded, prevBest);
    document.getElementById('ov-col-score').innerHTML = `
        <div class="ov-sub-line ov-sub-pts">${pts} ${t('ov_win_pts')}</div>
        <div class="ov-sub-line ov-sub-pts">${t('ov_win_multiplier')} ×${mult.toFixed(2)}</div>
        <div class="ov-sub-line ov-sub-pts">${gainNote}</div>`;
}

function buildTimeColumn(elapsed) {
    document.getElementById('ov-col-time').innerHTML = `
        <div class="ov-sub-line ov-sub-time">
            ⏱ ${formatTime(timerSecs)} ${t('ov_win_left')} · ${t('ov_win_solved_in')} ${formatTime(elapsed)}
        </div>
        ${buildMistakeLine()}`;
}

// Writes the bonus badge into #bonus-list.
// Shows a success badge if the bonus was met, or the bonus hint if it was missed.
function renderBonusBadge(bonusMet) {
    document.getElementById('bonus-list').innerHTML = `
        <span class="bonus-badge ${bonusMet ? 'earned' : 'missed'}">
            ${bonusMet ? t('ov_bonus_met') : '🎯 ' + lvText(cur, 'bonusHint')}
        </span>`;
}

// Builds the HTML for a guaranteed first-time bonus item reward,
// adds it to the inventory, and saves.
function grantBonusItem() {
    const defId = pickRandomItem();
    if (!defId) return '';

    const def = ITEM_DEFS[defId];
    if (!def) return '';

    STATE.inventory.push({ defId, uid: Date.now() + Math.random().toString(36).slice(2) });
    save();

    const rc = rarityColors(def.rarity);
    return `
        <div class="item-reward" data-reward-defid="${defId}"
             style="border-color:${rc.border};color:${rc.color};cursor:default;">
            ${t('ov_item_earned')}: ${def.icon} <strong>${itemName(def)}</strong>
        </div>`;
}

// Returns the HTML for the "bonus already claimed" notice shown on repeat clears.
function buildBonusClaimedNote() {
    return `<div class="item-reward" style="border-color:var(--border2);color:#666;">
        ${t('ov_bonus_claimed_note')}
    </div>`;
}

// Writes item rewards into the item-reward zone (irz) based on bonus state.
// Priority order:
//   1. First-time bonus clear → guaranteed item
//   2. Repeat bonus clear     → "already claimed" note + lucky drop chance
//   3. Bonus missed           → lucky drop chance only
// Ironman mode and quiz bonuses suppress all item rewards.
function renderItemRewardZone(gi, bonusMet, isFirstClear, isAscensionLevel) {
    const irz = document.getElementById('item-reward-zone');
    irz.innerHTML = '';
    const bonusAlreadyDone = STATE.bonusDone.includes(gi);
    const isQuizBonus = cur.bonusType === 'quiz';

    // Special one-time rewards (convergence points, ascension codex) go first
    handleSpecialRewards({ gi, isFirstClear, isAscensionLevel, irz });

    // Mark the bonus as done on first clear (before item logic so save() is called once)
    if (bonusMet && !bonusAlreadyDone && !isQuizBonus) {
        STATE.bonusDone.push(gi);
        save();
    }

    // Item drops are suppressed in ironman mode and for quiz bonus levels
    if (curMods.ironman || isQuizBonus) return;

    if (bonusMet && !bonusAlreadyDone) {
        irz.innerHTML += grantBonusItem();
    } else if (bonusMet && bonusAlreadyDone) {
        irz.innerHTML += buildBonusClaimedNote();
        irz.innerHTML += rollLuckyDrops();
    } else {
        irz.innerHTML += rollLuckyDrops();
    }

    // Attach hover tooltips to every item-reward card
    setTimeout(() => {
        irz.querySelectorAll('[data-reward-defid]').forEach(el => {
            attachItemTooltip(el, el.dataset.rewardDefid);
        });
    }, 0);
}

// Orchestrates the full win overlay render: stats, bonus badge, and item rewards.
function renderWinOverlay({ gi, pts, ptsAwarded, prevBest, mult, elapsed, bonusMet, isAscensionLevel, isFirstClear }) {
    document.getElementById('ov-reveal-quote').innerHTML = `"${lvText(cur, 'reveal')}"`;
    buildScoreColumn(pts, ptsAwarded, prevBest, mult);
    buildTimeColumn(elapsed);
    renderBonusBadge(bonusMet);
    renderItemRewardZone(gi, bonusMet, isFirstClear, isAscensionLevel);
}


//------------------------------------------------------------------------
//-------------------QUEST STAT HELPERS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if the current level sits at a convergence milestone
// (33% or 66% through the world) and has not been flagged as an ascension level.
// Used for quest stat tracking inside checkWin().
function checkIsConvergenceLevel(worldData, isAscensionLevel) {
    return isConvergenceLevel(worldData, isAscensionLevel);
}

// Returns true if this level completion is the one that finishes the entire world
// for the first time, and the world hasn't already been counted in quest stats.
// Prevents replays and already-counted worlds from triggering duplicate stat updates.
function checkWorldJustCompleted(worldData, isFirstClear) {
    if (!isFirstClear) return false;

    const wi = cur.world - 1;
    const start = WORLD_START_GI[wi];
    const allDone = worldData.data.every((_, li) => STATE.done.includes(start + li));
    if (!allDone) return false;

    STATE.questStats = STATE.questStats || {};
    const counted = STATE.questStats._worldsCountedList || [];
    return !counted.includes(wi);
}

// Returns true if this is a "large" level (200+ cells) and the player
// has the adjacency_matrix passive skill allocated.
function checkIsLargeAdjMatrix() {
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    return (rows * cols >= 200) && ptHasSkill('adjacency_matrix');
}


//------------------------------------------------------------------------
//-------------------CHECK WIN (MAIN ENTRY POINT)-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Called after every valid cell change to check whether the puzzle is complete.
// If solved, halts the game, calculates the final score, fires all end-of-level
// hooks (achievements, rewards, quest stats), and shows the win overlay.

function checkWin() {
    if (!isPuzzleSolved()) return;

    // Monster levels hand off to the encounter chain instead of the normal win flow
    if (typeof _egIsActive === 'function' && _egIsActive()) {
        if (typeof _egOnPuzzleComplete === 'function') {
            dead = true;
            stopTimer();
            _egOnPuzzleComplete();
            return;           // skip all normal scoring / overlay logic
        }
    }


    // Stop any active visual effects and freeze the game state
    if (typeof clearActiveRandomWalkers === "function") clearActiveRandomWalkers();
    dead = true;
    stopTimer();

    // Gather level context
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const gi = cur.gIdx;
    const worldData = WORLDS[cur.world - 1];
    const isAscensionLevel = cur.li === worldData.data.length;
    const isFirstClear = !STATE.done.includes(gi);

    if (isFirstClear) STATE.done.push(gi);
    // Region entry beat — fires on first clear of that world's designated trigger level
    if (isFirstClear && cur.li === (REGION_BEAT_TRIGGER_LEVEL[cur.world] || 1)) {
        showBeat('region_' + cur.world);
    }
    _wdSyncSpriteToLevel(gi);    // move sprite to the just completed level

    // Track per-level mistake record for the "flawless world" achievement.
    // Always keep the best (lowest) mistake count across replays.
    if (!STATE.levelMistakes) STATE.levelMistakes = {};
    const prevMistakeRecord = STATE.levelMistakes[gi];
    if (prevMistakeRecord === undefined || mistakeCount < prevMistakeRecord) {
        STATE.levelMistakes[gi] = mistakeCount;
    }

    const elapsed = Math.round((Date.now() - levelStartTime) / 1000);

    // Score
    const { pts, ptsAwarded, prevBest, mult } = calculateScore(rows, cols);
    save();
    document.getElementById('sc-disp').textContent = STATE.totalScore;

    // Achievements
    fireAchievements({ gi, rows, cols, elapsed, pts, ptsAwarded, prevBest, mult, isFirstClear });

    // Passive tree node rewards (gear_of_the_statistician & improved_gear)
    _ptApplyLevelCompleteRewards();

    // Bonus objective
    const bonusMet = evaluateBonusObjective(elapsed);

    if (typeof triggerBanter === 'function') triggerBanter('win');

    // Render the win overlay content (buildReveal() is deferred until
    // #ov-win is actually visible — see the two branches below, and
    // finishQuiz()/skipQuiz() in quiz.js for the quiz-bonus path)
    renderWinOverlay({ gi, pts, ptsAwarded, prevBest, mult, elapsed, bonusMet, isAscensionLevel, isFirstClear });

    // World completion hooks (codes popup delayed so it feels distinct)
    setTimeout(() => checkWorldCodes(), 2000);
    checkWorldCompletion();

    // Show the win overlay (or quiz flow if the bonus type is 'quiz')
    if (bonusMet && cur.bonusType === 'quiz') {
        // ov-win itself isn't shown yet here — showQuiz() opens the separate
        // quiz-overlay first. buildReveal() runs later, in finishQuiz()/skipQuiz()
        // in quiz.js, right when ov-win actually becomes visible.
        setTimeout(() => showQuiz(cur.world), 1500);
    } else {
        setTimeout(() => {
            document.getElementById('ov-win').classList.add('show');
            requestAnimationFrame(() => buildReveal());
        }, 1000);
    }

    Audio_Manager.playSFX('win');

    // Quest stats update
    updateQuestStats('levelComplete', {
        gi,
        world: cur.world,
        diff: curDiff,
        mods: { ...curMods },
        mistakeCount,
        itemsUsed: itemsUsedThisLevel,
        playerClass: STATE.playerClass,
        elapsed,
        bonusMet,
        isConvergence: checkIsConvergenceLevel(worldData, isAscensionLevel) && isFirstClear,
        worldJustCompleted: checkWorldJustCompleted(worldData, isFirstClear),
        worldIndex: cur.world - 1,
        luckyDropTriggered: false,
        timerSecsAtWin: timerSecs,
        isLargeAdjMatrix: checkIsLargeAdjMatrix(),
    });

    if (typeof _endBlackSwan === "function") _endBlackSwan(false);
}