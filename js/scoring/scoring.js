import { STATE, cur, save } from '../state.js';
import { stopTimer } from '../timer/timer.js';
import { buildReveal } from '../grid.js';
import { _wdSyncSpriteToLevel } from '../screens/screens-world-levels.js';
import { _ptApplyLevelCompleteRewards } from '../probability-tree/probability-tree.js';
import { updateQuestStats } from '../inference/inference-stats.js';
import { ptHasSkill } from '../probability-tree/probability-tree-state-points.js';
import { isPuzzleSolved, calculateScore, evaluateBonusObjective, _getLevelSpecialStatus, fireAchievements } from './scoring-core.js';
import { renderWinOverlay } from './scoring-rewards.js';
import { WORLDS } from '../levels/level-world-data.js';
import { WORLD_START_GI } from '../levels/levels.js';
import { checkWorldCompletion } from '../classes/class-ui.js';
import { isConvergenceLevel as _questIsConvergenceLevel } from './scoring-core.js';
import { Audio_Manager } from '../audio/audio.js';
import { _egIsActive } from '../combat/combat-state.js';
import { _egOnPuzzleComplete } from '../combat/encounter-chain.js';
import { resetRecursionistState } from '../classes/class-recursionist.js';
import { _arcaneFreeze_clearAllFrostAndStalagmites } from '../classes/class-mathmagician-absolute-zero.js';
import { _endBlackSwan } from '../classes/class-outlier-black-swan.js';
import { triggerBanter } from '../sprite/character-banter.js';
import { checkWorldCodes, checkWorldCodesSync } from '../codes.js';
import { showQuiz } from '../quiz-exercise/quiz.js';
import { _egGrantCampaignLevelXP } from '../endgame/endgame-leveling.js';

//------------------------------------------------------------------------
//-------------------SCORING ORCHESTRATOR (scoring.js)---------------------
//------------------------------------------------------------------------
// Win-flow entry point for the scoring subsystem. checkWin() runs after
// every valid cell change, validates the puzzle, computes the score (via
// scoring-core.js), hands the reward/overlay rendering to scoring-rewards.js,
// and fires the end-of-level hooks (achievements, quest stats, world codes).

//------------------------------------------------------------------------
//-------------------QUEST STAT HELPERS------------------------------------
//------------------------------------------------------------------------

// Returns true if the current level sits at a convergence milestone
// (33% or 66% through the world); used inside checkWin()'s quest-stat payload.
// The rule table lives in scoring-core.js (isConvergenceLevel) - quest stats
// and the world screens both read it through there.
function checkIsConvergenceLevel(worldData, isAscensionLevel) {
    return _questIsConvergenceLevel(worldData, isAscensionLevel);
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
//-------------------CHECK WIN (MAIN ENTRY POINT)--------------------------
//------------------------------------------------------------------------

// Called after every valid cell change to check whether the puzzle is complete.
// If solved, halts the game, calculates the final score, fires all end-of-level
// hooks (achievements, rewards, quest stats), and shows the win overlay.
function checkWin() {
    if (!isPuzzleSolved()) return;

    // Monster levels hand off to the encounter chain instead of the normal
    // win flow. Campaign levels also run monsters (cur.campaignMonsters) but
    // must still complete as normal puzzle levels, so they are excluded.
    if (_egIsActive()
        && !(cur && cur.campaignMonsters)) {
        globalThis.dead = true;
        stopTimer();
        _egOnPuzzleComplete();
        return;           // skip all normal scoring / overlay logic
    }

    // Map-device run: puzzle solved by start-of-level passives BEFORE the
    // encounter flag has flipped (initial puzzle only). The normal
    // win/scoring path must NOT run - the puzzle belongs to the encounter
    // chain (question modal → countdown → next puzzle). Suppress the normal
    // overlay here; _doStartLevel() will hand off to _egOnPuzzleComplete
    // immediately after it starts the encounter.
    if (window._egIsMapDeviceRun && cur && cur.isMonsterLevel && !_egIsActive()) {
        return;
    }

    // Stop any active visual effects and freeze the game state
    if (typeof window.clearActiveRandomWalkers === 'function') window.clearActiveRandomWalkers();
    resetRecursionistState(); // removes the DoF zombie + Residual skeletons
    globalThis.dead = true;
    stopTimer();

    _arcaneFreeze_clearAllFrostAndStalagmites();

    // Gather level context
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const gi = cur.gIdx;
    const worldData = WORLDS[cur.world - 1];
    if (!worldData) return;   // tutorial-quest levels bypass the normal win flow
    const _special = _getLevelSpecialStatus(cur);
    const isAscensionLevel = _special.isAscension;
    const isNexusPoint = !!_special.isNexusPoint;
    const isFirstClear = !STATE.done.includes(gi);

    if (isFirstClear) STATE.done.push(gi);

    // Campaign XP: a first clear grants the full amount, a replay a fraction
    // of it (see _egGrantCampaignLevelXP / EG_LEVELING_CONFIG). Endgame map
    // runs return above via _egOnPuzzleComplete and never reach this path.
    try { _egGrantCampaignLevelXP(gi, isFirstClear); } catch (e) {}

    _wdSyncSpriteToLevel(gi);    // move sprite to the just completed level

    // Track per-level mistake record for the "flawless world" achievement.
    // Always keep the best (lowest) mistake count across replays.
    if (!STATE.levelMistakes) STATE.levelMistakes = {};
    const prevMistakeRecord = STATE.levelMistakes[gi];
    if (prevMistakeRecord === undefined || globalThis.mistakeCount < prevMistakeRecord) {
        STATE.levelMistakes[gi] = globalThis.mistakeCount;
    }

    const elapsed = Math.round((Date.now() - globalThis.levelStartTime) / 1000);

    // The score lives in scoring-core.js - this call is the hand-off point
    // between the orchestrator and the calculation/reward halves.
    const { pts, ptsAwarded, prevBest, mult } = calculateScore(rows, cols);
    save();
    document.getElementById('sc-disp').textContent = STATE.totalScore;

    // Achievements
    fireAchievements({ gi, rows, cols, elapsed, pts, ptsAwarded, prevBest, mult, isFirstClear });

    // Passive tree node rewards (gear_of_the_statistician & improved_gear)
    _ptApplyLevelCompleteRewards();

    // Bonus objective
    const bonusMet = evaluateBonusObjective(elapsed);

    triggerBanter('win');

    // Render the win overlay content (buildReveal() is deferred until
    // #ov-win is actually visible - see the two branches below, and
    // finishQuiz()/skipQuiz() in quiz.js for the quiz-bonus path)
    renderWinOverlay({ gi, pts, ptsAwarded, prevBest, mult, elapsed, bonusMet, isAscensionLevel, isFirstClear, isNexusPoint });

    // World completion hooks - persist code unlocks immediately so they're
    // not lost if the player closes the game before the delayed modal shows.
    checkWorldCodesSync();
    checkWorldCompletion();

    // Show the win overlay (or quiz flow if the bonus type is 'quiz')
    if (bonusMet && cur.bonusType === 'quiz') {
        // ov-win itself isn't shown yet here - showQuiz() opens the separate
        // quiz-overlay first. buildReveal() runs later, in finishQuiz()/skipQuiz()
        // in quiz.js, right when ov-win actually becomes visible.
        setTimeout(() => showQuiz(cur.world), 1500);
    } else {
        setTimeout(() => {
            document.getElementById('ov-win').classList.add('show');
            requestAnimationFrame(() => buildReveal());
        }, 1000);
    }

    // Codes popup delayed so it feels distinct from the win overlay
    setTimeout(() => checkWorldCodes(), 2000);

    Audio_Manager.playSFX('win');

    // Quest stats update
    updateQuestStats('levelComplete', {
        gi,
        world: cur.world,
        diff: globalThis.curDiff,
        mods: { ...globalThis.curMods },
        mistakeCount: globalThis.mistakeCount,
        itemsUsed: globalThis.itemsUsedThisLevel,
        playerClass: STATE.playerClass,
        elapsed,
        bonusMet,
        isConvergence: checkIsConvergenceLevel(worldData, isAscensionLevel) && isFirstClear,
        worldJustCompleted: checkWorldJustCompleted(worldData, isFirstClear),
        worldIndex: cur.world - 1,
        luckyDropTriggered: false,
        timerSecsAtWin: globalThis.timerSecs,
        isLargeAdjMatrix: checkIsLargeAdjMatrix(),
    });

    _endBlackSwan(false);
}

try { Object.defineProperty(globalThis, 'checkWin', { get() { return checkWin; }, set(v) { checkWin = v; }, configurable: true }); } catch (e) {}
