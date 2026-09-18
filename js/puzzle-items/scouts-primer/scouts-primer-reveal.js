//------------------------------------------------------------------------
//  scouts-primer-reveal.js - reveal engine for the Scout's Primer.
//
//  Split out of scouts-primer.js (2026-09-17): the passive-bonus roll,
//  grid-state reveal, flare/glow animation scheduling and the CSS injection
//  are one responsibility; the question modal + tutor live in
//  scouts-primer.js, which calls the two public entry points
//  (applyPrimerHeadstart / applyPerfectPrimerReveal) when a chain ends.
//------------------------------------------------------------------------

import { trackAchStat } from '../../achievements/achievements.js';
import { Audio_Manager } from '../../audio/audio.js';
import { _egOnProgrammaticReveal } from '../../combat/combat-class-projectiles.js';
import { renderCell, updClues } from '../../grid.js';
import { PT } from '../../passive-tree/passive-tree.js';
import { questStat_primerRowsColsRevealed, updateQuestStats } from '../../inference/inference-stats.js';
import { t } from '../../translation/translations.js';
import { shuffle } from '../../puzzle-mechanics/puzzle-helpers.js';
import { showToast } from '../../puzzle-mechanics/toasts-and-popups.js';

// Maximum number of questions in a single primer chain.
export const PRIMER_MAX = 5;

// Colour palette used for cell-flare animations, indexed by streak tier.
// Tier 1 = blue, 2 = teal, 3 = orange, 4 = pink/purple, 5 = gold (perfect).
export const PRIMER_TIER_COLOURS = ['#4fc3f7', '#26c6a6', '#ffa040', '#e040fb', '#ffd700'];

// Passive-tree bonus-row nodes: [skillId, chance, rowsGranted]. Each node rolls independently.
export const PRIMER_ROW_BONUS_TABLE = [
    ['expanding_front', 0.500, 1],
    ['widened_formation', 0.250, 2],
    ['extended_horizon', 0.125, 3],
    ['total_coverage', 0.050, 4]
];

// Passive-tree bonus-column nodes: [skillId, chance, colsGranted]. Each node rolls independently.
export const PRIMER_COL_BONUS_TABLE = [
    ['vertical_insight', 0.500, 1],
    ['rising_structure', 0.250, 2],
    ['elevated_scope', 0.125, 3],
    ['total_survey', 0.050, 4]
];

//-------------------PASSIVE TREE - HEADSTART BONUSES---------------------
//------------------------------------------------------------------------

// Rolls independent bonuses from a [skillId, chance, amount] table and sums
// the amounts for every node that is owned and rolls successfully. Shared by
// the row-bonus and column-bonus calculators below (they only differ by table).
function _primerCalcBonusFromTable(table) {
    let bonus = 0;
    for (const [skillId, chance, amount] of table) {
        if (PT.hasSkill(skillId) && Math.random() < chance) bonus += amount;
    }
    return bonus;
}

// Rolls extra bonus rows from passive tree nodes. Each node is independent.
// Returns the total number of additional rows to reveal.
function _primerCalcBonusRows() {
    return _primerCalcBonusFromTable(PRIMER_ROW_BONUS_TABLE);
}

// Rolls extra bonus columns from passive tree nodes. Each node is independent.
// Returns the total number of additional columns to reveal.
function _primerCalcBonusCols() {
    return _primerCalcBonusFromTable(PRIMER_COL_BONUS_TABLE);
}

// Calculates the final row and column counts to reveal for a given streak,
// after applying passive tree bonuses and the primed_scout doubling.
// Returns { totalRows, totalCols } clamped to grid dimensions.
function _primerCalcRevealCounts(streakCount, gridRows, gridCols) {
    let totalRows = streakCount + _primerCalcBonusRows();
    let totalCols = streakCount + _primerCalcBonusCols();

    if (PT.hasSkill('primed_scout')) {
        totalRows *= 2;
        totalCols *= 2;
    }

    return {
        totalRows: Math.min(totalRows, gridRows),
        totalCols: Math.min(totalCols, gridCols)
    };
}


//------------------------------------------------------------------------
//-------------------GRID STATE APPLICATION-------------------------------
//------------------------------------------------------------------------

// Writes the headstart reveal into the live game state for a single cell and
// re-renders it. Filled cells (=1) in the solution are marked as correctly
// revealed; empty cells that are still blank are marked as crossed out (=2).
// Shared by the row-wise and column-wise reveal helpers below.
function _primerRevealCell(r, c, sol) {
    const wasRevealed = (sol[r][c] === 1) && !globalThis.revealedGrid[r][c] && globalThis.userGrid[r][c] !== 1;
    if (sol[r][c] === 1) { globalThis.revealedGrid[r][c] = true; globalThis.userGrid[r][c] = 1; }
    else if (globalThis.userGrid[r][c] === 0) { globalThis.userGrid[r][c] = 2; }
    renderCell(r, c);
    updClues(r, c);
    if (wasRevealed && typeof _egOnProgrammaticReveal === 'function') _egOnProgrammaticReveal([`g-${r}-${c}`]);
}

// Applies the headstart reveal to every cell in the given row.
function _primerApplyRevealRow(r, sol, cols) {
    for (let c = 0; c < cols; c++) _primerRevealCell(r, c, sol);
}

// Applies the headstart reveal to every cell in the given column.
function _primerApplyRevealCol(c, sol, rows) {
    for (let r = 0; r < rows; r++) _primerRevealCell(r, c, sol);
}

// Applies game-state changes for all rows and columns in the headstart reveal,
// synchronously and silently (no animations yet).
function _primerApplyAllRevealState(rowIdxs, colIdxs, sol, rows, cols) {
    rowIdxs.forEach(r => _primerApplyRevealRow(r, sol, cols));
    colIdxs.forEach(c => _primerApplyRevealCol(c, sol, rows));
}


//------------------------------------------------------------------------
//-------------------VISUAL FLARE ANIMATIONS------------------------------
//------------------------------------------------------------------------

// Returns a reference to the board element used for glow animations,
// falling back through several common selectors to document.body.
function _primerGetBoardElement() {
    return document.querySelector('.grid-container')
        || document.getElementById('grid')
        || document.querySelector('.board')
        || document.body;
}

// Creates a single fixed-position flare overlay element over a grid cell.
// The element removes itself after its CSS animation completes (~900ms).
// colour: CSS colour string for the --flare-colour custom property.
// extraClass: additional class string applied to the element (e.g. 'scout-flare-row').
function _primerSpawnCellFlare(r, c, colour, extraClass) {
    const cellEl = document.getElementById(`g-${r}-${c}`);
    if (!cellEl) return;
    const rect = cellEl.getBoundingClientRect();
    if (!rect || rect.width === 0) return;

    const flare = document.createElement('div');
    flare.className = `scout-ping-flare ${extraClass}`;
    flare.style.cssText = `
        position:fixed;
        top:${rect.top}px;
        left:${rect.left}px;
        width:${rect.width}px;
        height:${rect.height}px;
        --flare-colour:${colour};
        pointer-events:none;
        z-index:99999;
    `;
    document.body.appendChild(flare);
    setTimeout(() => flare.remove(), 900);
}

// Plays a tick sound at the given delay, but only for every other sweep
// (sweepIndex 0, 2, 4, ...). Shared by the row and column flare schedulers.
function _primerScheduleTickSound(sweepIndex, delay) {
    if (sweepIndex % 2 !== 0) return;
    setTimeout(() => {
        if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('tick');
    }, delay);
}

// Schedules staggered flare animations across one row or column, sweeping
// cell-by-cell 18ms apart. axis: 'row' sweeps across columns at fixed row
// `index`; 'col' sweeps down rows at fixed column `index`. Returns the delay
// at which the next row/column sweep should begin.
function _primerScheduleAxisFlares(axis, index, sweepLength, colour, extraClass, baseDelay, cellDelay, sweepIndex) {
    for (let i = 0; i < sweepLength; i++) {
        const r = axis === 'row' ? index : i;
        const c = axis === 'row' ? i : index;
        setTimeout(() => _primerSpawnCellFlare(r, c, colour, extraClass), baseDelay + i * 18);
    }
    _primerScheduleTickSound(sweepIndex, baseDelay);
    return baseDelay + cellDelay;
}

// Schedules a left-to-right flare sweep across all cells of a single row.
function _primerScheduleRowFlares(r, cols, colour, baseDelay, cellDelay, rowIndex) {
    return _primerScheduleAxisFlares('row', r, cols, colour, 'scout-flare-row', baseDelay, cellDelay, rowIndex);
}

// Schedules a top-to-bottom flare sweep down all cells of a single column.
function _primerScheduleColFlares(c, rows, colour, baseDelay, cellDelay, colIndex) {
    return _primerScheduleAxisFlares('col', c, rows, colour, 'scout-flare-col', baseDelay, cellDelay, colIndex);
}

// Schedules the full sweep animation across all revealed rows and columns.
// Returns the total accumulated delay so callers can schedule post-animation logic.
// cellDelay controls how long each row/column sweep takes before the next starts.
function _primerScheduleAllFlares(rowIdxs, colIdxs, rows, cols, colour, cellDelay) {
    let delay = 0;

    rowIdxs.forEach((r, ri) => {
        delay = _primerScheduleRowFlares(r, cols, colour, delay, cellDelay, ri);
    });

    colIdxs.forEach((c, ci) => {
        delay = _primerScheduleColFlares(c, rows, colour, delay, cellDelay, ci);
    });

    return delay;
}

// Applies a board-level CSS glow animation scaled to the current streak tier.
// count 1 = soft, 2-3 = mid, 4+ = strong. Automatically removes the class
// after the animation duration so it can be re-applied next time.
function _primerApplyBoardGlow(boardEl, colour, count) {
    const glowClass = count >= 4 ? 'primer-glow-strong'
        : count >= 2 ? 'primer-glow-mid'
            : 'primer-glow-soft';
    boardEl.style.setProperty('--primer-glow-colour', colour);
    boardEl.classList.add(glowClass);
    setTimeout(() => boardEl.classList.remove(glowClass), 1800);
}


//------------------------------------------------------------------------
//-------------------HEADSTART REVEAL (PARTIAL)---------------------------
//------------------------------------------------------------------------

// Applies the pre-solve headstart for a partial streak (1–4 correct answers).
// Immediately updates game state for all target rows/columns, then plays a
// staggered per-cell flare animation sweep and a board-level glow.
// count: the number of correct answers that were given before the chain ended.
export function applyPrimerHeadstart(count) {
    if (!globalThis.cur || count <= 0) return;

    const sol = globalThis.cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    const { totalRows, totalCols } = _primerCalcRevealCounts(count, rows, cols);

    const rowIdxs = shuffle(Array.from({ length: rows }, (_, i) => i)).slice(0, totalRows);
    const colIdxs = shuffle(Array.from({ length: cols }, (_, i) => i)).slice(0, totalCols);

    // The colour is chosen by streak tier (index clamped to palette length)
    const colour = PRIMER_TIER_COLOURS[Math.min(count, PRIMER_TIER_COLOURS.length) - 1];

    // 1. Apply game state immediately (silent, no visual yet)
    _primerApplyAllRevealState(rowIdxs, colIdxs, sol, rows, cols);

    // 2. Board glow (immediate)
    _primerApplyBoardGlow(_primerGetBoardElement(), colour, count);

    // 3. Schedule per-cell flare sweep
    //    Faster sweeps for higher streaks (less time between each row/col)
    const cellDelay = count <= 1 ? 60 : count <= 2 ? 50 : count <= 3 ? 40 : 30;
    const totalDelay = _primerScheduleAllFlares(rowIdxs, colIdxs, rows, cols, colour, cellDelay);

    // 4. Toast + win check after all animations complete
    setTimeout(() => {
        const msg = t('itm_primer_headstart_applied')
            .replace('{r}', totalRows)
            .replace('{c}', totalCols);
        showToast(msg);
        questStat_primerRowsColsRevealed(rowIdxs.length, colIdxs.length);
        globalThis.checkWin();
        if (globalThis.dead) trackAchStat('primerSolvedAll');
        if (globalThis.dead) updateQuestStats('primerFullSolve', {});
    }, totalDelay + 100);
}


//------------------------------------------------------------------------
//-------------------PERFECT REVEAL (5/5 STREAK)--------------------------
//------------------------------------------------------------------------

// Creates and schedules a single gold flare overlay for one cell.
// Position is read at fire-time (inside the setTimeout) so the grid
// is guaranteed to be laid out and have real pixel dimensions.
function _primerSpawnPerfectFlare(r, c) {
    _primerSpawnCellFlare(r, c, '#ffd700', 'scout-flare-perfect');
}

// Schedules one gold flare sweep along a row or column (mirrors
// _primerScheduleAxisFlares, but with the perfect-reveal's fixed 20ms
// spacing and constant 80ms gap between sweeps). Returns the delay at which
// the next sweep should begin.
function _primerSchedulePerfectAxisFlares(axis, index, sweepLength, baseDelay, sweepIndex) {
    for (let i = 0; i < sweepLength; i++) {
        const r = axis === 'row' ? index : i;
        const c = axis === 'row' ? i : index;
        setTimeout(() => _primerSpawnPerfectFlare(r, c), baseDelay + i * 20);
    }
    _primerScheduleTickSound(sweepIndex, baseDelay);
    return baseDelay + 80;
}

// Schedules staggered gold flare sweeps across all revealed rows and columns,
// identical to the partial sweep but using the perfect gold colour and flare class.
// Returns the accumulated total delay.
function _primerSchedulePerfectFlares(rowIdxs, colIdxs, rows, cols) {
    let delay = 60; // small head-start so board glow is visible before flares

    rowIdxs.forEach((r, ri) => {
        delay = _primerSchedulePerfectAxisFlares('row', r, cols, delay, ri);
    });

    colIdxs.forEach((c, ci) => {
        delay = _primerSchedulePerfectAxisFlares('col', c, rows, delay, ci);
    });

    return delay;
}

// Full cinematic reveal triggered when the player answers all PRIMER_MAX
// questions correctly (5/5 streak). Order matters: game state first (so
// renderCell() never overwrites a flare placed the same frame), then glow
// + toast, staggered gold flares, and the win check after all animations.
export function applyPerfectPrimerReveal() {
    if (!globalThis.cur) return;

    const sol = globalThis.cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    const { totalRows, totalCols } = _primerCalcRevealCounts(PRIMER_MAX, rows, cols);

    const rowIdxs = shuffle(Array.from({ length: rows }, (_, i) => i)).slice(0, totalRows);
    const colIdxs = shuffle(Array.from({ length: cols }, (_, i) => i)).slice(0, totalCols);

    // 1. Apply all state changes immediately
    _primerApplyAllRevealState(rowIdxs, colIdxs, sol, rows, cols);

    // 2. Board glow and toast (immediate)
    const boardEl = _primerGetBoardElement();
    boardEl.style.setProperty('--primer-glow-colour', '#ffd700');
    boardEl.classList.add('primer-perfect-glow');
    setTimeout(() => boardEl.classList.remove('primer-perfect-glow'), 2800);

    const msg = t('itm_primer_master_cartography')
        .replace('{r}', totalRows)
        .replace('{c}', totalCols);
    showToast(msg);

    // 3. Schedule gold cell flares
    const totalDelay = _primerSchedulePerfectFlares(rowIdxs, colIdxs, rows, cols);

    // 4. Win check after all animations complete
    setTimeout(() => {
        questStat_primerRowsColsRevealed(rowIdxs.length, colIdxs.length);
        globalThis.checkWin();
        if (globalThis.dead) trackAchStat('primerSolvedAll');
        if (globalThis.dead) updateQuestStats('primerFullSolve', {});
    }, totalDelay + 300);
}


//------------------------------------------------------------------------

(function injectPrimerStyles() {
    if (document.getElementById('primer-animation-styles')) return;

    const style = document.createElement('style');
    style.id = 'primer-animation-styles';
    style.textContent = `

        /* ── Board-level glows (scaled by streak tier) ──────────────────── */
        @keyframes primerGlowSoft {
            0%   { box-shadow: 0 0 0px transparent; }
            30%  { box-shadow: 0 0 18px var(--primer-glow-colour, #4fc3f7); }
            100% { box-shadow: 0 0 0px transparent; }
        }
        @keyframes primerGlowMid {
            0%   { box-shadow: 0 0 0px transparent; filter: brightness(1); }
            25%  { box-shadow: 0 0 30px var(--primer-glow-colour, #ffa040); filter: brightness(1.06); }
            100% { box-shadow: 0 0 0px transparent; filter: brightness(1); }
        }
        @keyframes primerGlowStrong {
            0%   { box-shadow: 0 0 0px transparent; filter: brightness(1); }
            20%  { box-shadow: 0 0 42px var(--primer-glow-colour, #e040fb); filter: brightness(1.09) contrast(1.04); }
            100% { box-shadow: 0 0 0px transparent; filter: brightness(1); }
        }
        @keyframes primerBoardGlow {
            0%   { box-shadow: 0 0 0px transparent; filter: brightness(1); }
            15%  { box-shadow: 0 0 55px #ffd700, 0 0 20px #fff6a0; filter: brightness(1.12) contrast(1.06) saturate(1.2); }
            60%  { box-shadow: 0 0 30px #ffd700; filter: brightness(1.05); }
            100% { box-shadow: 0 0 0px transparent; filter: brightness(1); }
        }

        .primer-glow-soft    { animation: primerGlowSoft    1.4s ease-in-out !important; }
        .primer-glow-mid     { animation: primerGlowMid     1.6s ease-in-out !important; }
        .primer-glow-strong  { animation: primerGlowStrong  1.8s ease-in-out !important; }
        .primer-perfect-glow { animation: primerBoardGlow   2.8s ease-in-out !important; }


        /* ── Per-cell flare - shared base ───────────────────────────────── */
        @keyframes scoutFlareBase {
            0%   { transform: scale(0.3);  opacity: 1;    border-radius: 3px; }
            40%  { transform: scale(1.25); opacity: 0.85; }
            100% { transform: scale(1.0);  opacity: 0;    }
        }

        /* Tier 1 – blue (1 correct) */
        @keyframes scoutFlareRow1 {
            0%   { transform: scale(0.3);  opacity: 1;   background: #4fc3f7; box-shadow: 0 0 10px #4fc3f7; }
            40%  { transform: scale(1.2);  opacity: 0.8; background: #b3e5fc; }
            100% { transform: scale(1.0);  opacity: 0;   }
        }
        /* Tier 2 – teal (2 correct) */
        @keyframes scoutFlareRow2 {
            0%   { transform: scale(0.3);  opacity: 1;    background: #26c6a6; box-shadow: 0 0 12px #26c6a6; }
            40%  { transform: scale(1.25); opacity: 0.85; background: #b2dfdb; }
            100% { transform: scale(1.0);  opacity: 0;    }
        }
        /* Tier 3 – orange (3 correct) */
        @keyframes scoutFlareRow3 {
            0%   { transform: scale(0.3);  opacity: 1;   background: #ffa040; box-shadow: 0 0 14px #ffa040; }
            40%  { transform: scale(1.3);  opacity: 0.9; background: #ffe0b2; }
            100% { transform: scale(1.0);  opacity: 0;   }
        }
        /* Tier 4 – pink/purple (4 correct) */
        @keyframes scoutFlareRow4 {
            0%   { transform: scale(0.3);  opacity: 1;   background: #e040fb; box-shadow: 0 0 16px #e040fb; }
            40%  { transform: scale(1.35); opacity: 0.9; background: #f8bbd0; }
            100% { transform: scale(1.0);  opacity: 0;   }
        }
        /* Tier 5 – gold / perfect (5 correct) */
        @keyframes scoutFlarePerfect {
            0%   { transform: scale(0.25); opacity: 1;   background: #ffd700; box-shadow: 0 0 22px #ffd700, inset 0 0 10px #fffde7; }
            30%  { transform: scale(1.5);  opacity: 1;   background: #fff9c4; box-shadow: 0 0 35px #ffd700; }
            70%  { transform: scale(1.1);  opacity: 0.7; }
            100% { transform: scale(1.0);  opacity: 0;   box-shadow: none; }
        }

        /* All flares share this base rule */
        .scout-ping-flare {
            border-radius: 3px;
            will-change: transform, opacity;
        }

        /* Non-perfect flares fall back to the base keyframe */
        .scout-ping-flare:not(.scout-flare-perfect) {
            animation: scoutFlareBase 0.8s cubic-bezier(0.1, 0.8, 0.25, 1) forwards !important;
            background: var(--flare-colour, #4fc3f7);
            box-shadow: 0 0 12px var(--flare-colour, #4fc3f7);
        }
        .scout-flare-perfect {
            animation: scoutFlarePerfect 0.95s cubic-bezier(0.1, 0.8, 0.25, 1) forwards !important;
        }
    `;
    document.head.appendChild(style);
})();