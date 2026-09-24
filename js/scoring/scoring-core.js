import { STATE, cur } from '../state.js';
import { scoreMultiplier } from '../difficulty-modifiers.js';
import { onLevelCompleteAch, checkWorldCompleteAch } from '../achievements/achievements.js';
import { WORLDS } from '../levels/level-world-data.js';
import { isNexusPointLevel, WORLD_START_GI } from '../levels/levels.js';
import { ptHasSkill } from '../probability-tree/probability-tree-state-points.js';

//------------------------------------------------------------------------
//-------------------SCORING CORE (scoring-core.js)------------------------
//------------------------------------------------------------------------
// Pure calculation half of the scoring subsystem: win validation, the score
// formula, bonus-objective rules, achievement hook preparation, and the
// special-level classifier (ascension / convergence / Nexus Point). No DOM
// writes here - the win overlay lives in scoring-rewards.js, the win-flow
// entry point in scoring.js.

//------------------------------------------------------------------------
//-------------------MODULE-LEVEL STATE------------------------------------
//------------------------------------------------------------------------

// Tracks points earned during the current active run.
// Set inside calculateScore() when a level is completed and referenced by
// the win overlay to show how many points were awarded vs. the previous best.
// 🗑 Suspected dead code: zero readers found across js/, main.js, index.html
// and the test suite (verified 2026-09-22, rulebook no-delete policy - kept).
export let currentRunScore = 0;

//------------------------------------------------------------------------
//-------------------PUZZLE VALIDATION-------------------------------------
//------------------------------------------------------------------------

// Returns true if every cell in the player's grid matches the solution.
// A cell counts as "filled" if the player marked it (userGrid === 1)
// or if it was revealed by a helper item (revealedGrid === true).
export function isPuzzleSolved() {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const playerFilled = globalThis.userGrid[r][c] === 1 || globalThis.revealedGrid[r][c];
            const solutionFilled = sol[r][c] === 1;
            if (playerFilled !== solutionFilled) return false;
        }
    }
    return true;
}

//------------------------------------------------------------------------
//-------------------SCORE CALCULATION-------------------------------------
//------------------------------------------------------------------------

// Returns the raw score before the multiplier is applied.
// Base score grows with grid size; remaining time adds a bonus;
// each mistake deducts points. Score is floored at 10.
export function computeRawScore(rows, cols) {
    const safeRows = Number.isFinite(Number(rows)) ? Number(rows) : 0;
    const safeCols = Number.isFinite(Number(cols)) ? Number(cols) : 0;
    const baseScore = 100 + (safeRows + safeCols) * 2;

    // Time Trial halves the starting clock, which would otherwise also halve
    // the time bonus. Add back exactly what was cut so the bonus reflects
    // the same effective time budget as normal mode.
    const normalizedSecs = globalThis.timerSecs + (globalThis.curMods.timetrial ? (window._timetrialTimeCut || 0) : 0);

    const safeTimerSecs = Number.isFinite(Number(globalThis.timerSecs)) ? Number(globalThis.timerSecs) : 0;
    const safeNormalizedSecs = Number.isFinite(Number(normalizedSecs)) ? Number(normalizedSecs) : safeTimerSecs;
    const cappedTime = Math.min(Math.max(0, safeNormalizedSecs), 3600);   // cap at 1 hour to prevent abuse
    const timeBonus = Math.floor(cappedTime / 10);
    const safeMistakes = Number.isFinite(Number(globalThis.mistakeCount)) ? Number(globalThis.mistakeCount) : 0;
    const mistakePenalty = safeMistakes * 20;
    return Math.max(10, baseScore + timeBonus - mistakePenalty);
}

// Determines how many net-new points are awarded to the player.
// If the current run score beats the level high score, the difference is awarded.
// Otherwise nothing is awarded (the player already has a better record).
export function computePointsAwarded(pts, gi) {
    const hs = STATE.levelHS[gi];
    const prevBest = hs ? hs.score : 0;
    return { ptsAwarded: Math.max(0, pts - prevBest), prevBest };
}

// Saves a new high-score entry for this level if the current run beats the record.
export function maybeUpdateHighScore(gi, pts) {
    const hs = STATE.levelHS[gi];
    if (!hs || pts > hs.score) {
        STATE.levelHS[gi] = {
            score: pts,
            diff: globalThis.curDiff,
            time: globalThis.timerSecs,
            mods: { ...globalThis.curMods },
        };
    }
}

// Master score calculation function.
// Computes the final score, awards net-new points to the player's total,
// updates the level high score if beaten, and returns all relevant values
// for display and quest-stat tracking.
export function calculateScore(rows, cols) {
    const gi = cur.gIdx;
    const rawScore = computeRawScore(rows, cols);
    const calculatedMult = scoreMultiplier();
    const mult = Number.isFinite(Number(calculatedMult)) ? Number(calculatedMult) : 1;
    const calculatedPts = Math.round(rawScore * mult);
    const pts = Number.isFinite(calculatedPts) ? Math.max(0, calculatedPts) : 0;

    const { ptsAwarded, prevBest } = computePointsAwarded(pts, gi);

    const currentTotal = Number.isFinite(Number(STATE.totalScore)) ? Number(STATE.totalScore) : 0;
    STATE.totalScore = currentTotal + ptsAwarded;
    maybeUpdateHighScore(gi, pts);

    return { pts, ptsAwarded, prevBest, mult };
}

//------------------------------------------------------------------------
//-------------------BONUS OBJECTIVE EVALUATION----------------------------
//------------------------------------------------------------------------

// Returns true if the current level's bonus condition has been satisfied.
// Each bonusType has its own pass/fail rule; unknown types default to false.
export function evaluateBonusObjective(elapsed) {
    const bt = cur.bonusType || 'nomiss';
    const bp = cur.bonusParam !== undefined ? cur.bonusParam : 0;

    switch (bt) {
        case 'fast': return elapsed <= bp;
        case 'nomiss': return globalThis.mistakeCount === 0;
        case 'lowmiss': return globalThis.mistakeCount <= bp;
        case 'noitem': return globalThis.itemsUsedThisLevel === 0;
        case 'quiz': return true;   // quiz bonus is evaluated separately via showQuiz()
        case 'combo': return elapsed <= bp && globalThis.mistakeCount === 0;
        case 'noitem_nomiss': return globalThis.itemsUsedThisLevel === 0 && globalThis.mistakeCount === 0;
        case 'noitem_fast': return globalThis.itemsUsedThisLevel === 0 && elapsed <= bp;
        default: return false;
    }
}

//------------------------------------------------------------------------
//-------------------ACHIEVEMENT HOOKS-------------------------------------
//------------------------------------------------------------------------

// Counts how many solution cells are filled (value === 1) in the grid.
export function countFilledCells(sol, rows, cols) {
    let count = 0;
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (sol[r][c] === 1) count++;
    return count;
}

// Counts how many cells the player has cross-marked (userGrid value === 2).
export function countMarkedCells(rows, cols) {
    if (!globalThis.userGrid) return 0;
    let count = 0;
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (globalThis.userGrid[r][c] === 2) count++;
    return count;
}

// Fires the achievement system's level-complete hook with all relevant stats,
// then clears the per-run window flags used by penalty-clutch and bounceback logic.
export function fireAchievements({ gi, rows, cols, elapsed, pts, ptsAwarded, prevBest, mult, isFirstClear }) {
    const sol = cur.grid;
    const totalCells = rows * cols;
    const cellsFilled = countFilledCells(sol, rows, cols);
    const tilesMarked = countMarkedCells(rows, cols);

    onLevelCompleteAch({
        mistakes: globalThis.mistakeCount,
        itemsUsed: globalThis.itemsUsedThisLevel,
        diff: globalThis.curDiff,
        mods: globalThis.curMods,
        playerClass: STATE.playerClass || null,
        playerAscendency: STATE.playerAscendency || null,
        absorbedMistakes: globalThis.absorbedMistakes,
        absorbedThisLevel: globalThis.absorbedMistakes,
        cellsFilled,
        tilesMarked,
        totalCells,
        rows,
        cols,
        scoreEarned: pts,
        world: cur.world,
        gi,
        elapsed,
        timerSecs: globalThis.timerSecs,
        pts,
        prevBest,
        mult,
        isFirstClear,
        hadPenaltyClutch: !!window._hadPenaltyClutch,
        isBouncebackWin: window.LEVEL_FLAGS.lastFailedGi === gi,
    });

    // Reset transient run flags consumed by the achievement system
    window._hadPenaltyClutch = false;
    window.LEVEL_FLAGS.lastFailedGi = null;

    checkWorldCompleteAch();
}

//------------------------------------------------------------------------
//-------------------SPECIAL LEVEL STATUS----------------------------------
//------------------------------------------------------------------------

// Convergence milestones no longer live on campaign puzzle levels (Leveling
// Rework): every former convergence level is a REGULAR puzzle level now.
// Passive points for milestones come from Convergence Trials instead (see
// js/campaign-trials.js). Kept as a function because quest stats, the world
// screens and old saves still call it; it always reports "not convergence".
export function isConvergenceLevel(worldData, isAscensionLevel) {
    return false;
}

// Returns true if the current level sits at a convergence milestone
// (33% or 66% through the world) and has not been flagged as an ascension level.
// Convergence milestones no longer exist on campaign levels (see the note on
// isConvergenceLevel above); kept for quest-stat tracking parity.
export function checkIsConvergenceLevel(worldData, isAscensionLevel) {
    return isConvergenceLevel(worldData, isAscensionLevel);
}

// Returns true if this level completion is the one that finishes the entire world
// for the first time, and the world hasn't already been counted in quest stats.
// Prevents replays and already-counted worlds from triggering duplicate stat updates.
export function checkWorldJustCompleted(worldData, isFirstClear) {
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
export function checkIsLargeAdjMatrix() {
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    return (rows * cols >= 200) && ptHasSkill('adjacency_matrix');
}

export function _getLevelSpecialStatus(level) {
    const worldData = WORLDS[level.world - 1];
    // Tutorial-quest levels live outside the WORLDS array (world 15) - they
    // are never ascension/convergence/nexus levels.
    if (!worldData) return { isAscension: false, isConvergence: false, isNexusPoint: false };
    const wi = level.world - 1;
    const li = level.li - 1;
    const isNexusPoint = isNexusPointLevel(wi, li);
    const isAscension = !isNexusPoint && level.li === worldData.data.length;
    const isConvergence = isConvergenceLevel(worldData, isAscension);
    return { isAscension, isConvergence, isNexusPoint };
}
