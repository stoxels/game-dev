//------------------------------------------------------------------------
//-------------------EXPANSION CORE---------------------------------------
//------------------------------------------------------------------------
// Shared pieces of the expansion-node system (nodes 303-402): the per-level
// state, the patch() wrapper helper, small grid helpers, penalty modifiers and
// the hook registries that the ptx-*-effects modules fill.
//------------------------------------------------------------------------

import { renderCell, updClues } from '../grid.js';
import { startTimerFreeze } from '../timer/timer-freeze.js';
import { addTimeSecs, previewGainSecs, subtractTimeSecs } from '../timer/timer-adjust.js';
import { ptHasSkill } from './probability-tree-state-points.js';
import { cur } from '../state.js';

// Expansion-node state that outlives a single level (reset by the buildGrid patch).
export const PTX = {
    supplyStacks: 0,         // supply_chain: stacked discount charges (max 3)
    doubleNextReveal: false, // doubled reveal armed for the next revealTiles call
    baseTime: 0,             // timer snapshot taken when the tree was opened
    lastPen: 0,              // last effective penalty seen (doubled-reveal trigger)
    inSwap: false,           // re-entrancy guard: Variance Swap cascade
    inPtxReveal: false,      // re-entrancy guard: doubled-reveal cascade
};

//--------------------------------------------------------------------------
//--------------------------PATCH INFRASTRUCTURE----------------------------
//--------------------------------------------------------------------------

// Replaces the global function `name` with a wrapper. Function declarations
// are writable global bindings in classic scripts, so this is safe as long
// as this file loads after all other game scripts (guaranteed by index.html).
export function patch(name, wrapper) {
    const orig = window[name];
    if (typeof orig !== 'function') return; // function missing - skip silently
    window[name] = function (...args) {
        return wrapper(orig.bind(this), args);
    };
}

export const has = (key) => ptHasSkill(key);

//--------------------------------------------------------------------------
//-----------------------------LEVEL STATE----------------------------------
//--------------------------------------------------------------------------

// Per-level runtime state, reset by resetLevel() from the buildGrid wrapper.
export const S = {};

export function resetLevel() {
    S.tick = 0;
    S.fillCount = 0;
    S.martingaleStake = 15;
    S.typeIUsed = false;
    S.stationaryUsed = false;
    S.axiomUsed = false;
    S.shortfallUsed = false;
    S.hypo75 = false;
    S.hypo50 = false;
    S.dialecticArmed = false;
    S.regFills = 0;
    S.ratchetStacks = 0;
    S.ratchetFills = 0;
    S.chaosMistakes = 0;
    S.driftMistakes = 0;
    S.driftWindowStart = Date.now();
    S.powerScan2Fired = false;
    S.bankedThisLevel = false;
    S.clueOriginals = null;   // nightfall / uniform prior backups
    S.uniformRowMap = null;   // uniform prior permutation (rows)
    S.uniformColMap = null;   // uniform prior permutation (cols)
    S.rowsPrimed = null;
    S.colsPrimed = null;
}

export function baseTime() {
    return PTX.baseTime || 0;
}

export function elapsedSecs() {
    return Math.floor((Date.now() - globalThis.levelStartTime) / 1000);
}

//--------------------------------------------------------------------------
//-----------------------------SMALL HELPERS--------------------------------
//--------------------------------------------------------------------------

export function addSecs(n) {
    if (!cur || globalThis.dead || n <= 0) return 0;
    // Map-run "% less Time gained" applies centrally in timer-adjust.js;
    // return the previewed amount so toast/FX text shows what lands.
    const shown = previewGainSecs(n);
    addTimeSecs(n, { capSecs: 7200 });
    return shown;
}

export function loseSecs(n) {
    if (!cur || globalThis.dead || n <= 0) return;
    subtractTimeSecs(n);
}

export function freeze(ms) {
    if (!cur || globalThis.dead) return;
    // Shared timer-freeze mechanic - its Clock-guarded release fixes the
    // old raw-write version, which could cut the Clock boss's 30 s Time
    // Freeze short when a tree freeze ended.
    startTimerFreeze(ms);
}

// Start-of-level luck roll with all +% chance nodes applied.
// markSide: true when the roll belongs to a mark effect (dream_logic swaps).
export function roll(chance, markSide) {
    let p = chance;
    if (has('statistical_bridge')) p += 0.05;
    if (has('law_of_averages')) p += 0.05;
    if (has('meta_analysis')) p += 0.10;
    if (has('dream_logic')) {
        const above = !baseTime() || globalThis.timerSecs > baseTime() * 0.5;
        if (above && !markSide) p += 0.05;
        if (!above && markSide) p += 0.05;
    }
    return Math.random() < p;
}

// Reveals one specific solution cell (guards included).
export function revealAt(r, c) {
    if (!cur) return false;
    const sol = cur.grid;
    if (sol[r][c] !== 1) return false;
    if (globalThis.userGrid[r][c] === 1 || globalThis.revealedGrid[r][c]) return false;
    globalThis.revealedGrid[r][c] = true;
    globalThis.userGrid[r][c] = 1;
    renderCell(r, c);
    updClues(r, c);
    // Endgame: fire a projectile from this auto-reveal toward the targeted monster.
    // Queued if the encounter hasn't started yet (start-of-puzzle passives).
    if (typeof globalThis._onProgrammaticReveal === 'function') globalThis._onProgrammaticReveal([`g-${r}-${c}`]);
    globalThis.checkWin();
    return true;
}

// Marks one specific truly-empty cell.
export function markAt(r, c) {
    if (!cur) return false;
    const sol = cur.grid;
    if (sol[r][c] !== 0) return false;
    if (globalThis.userGrid[r][c] !== 0 && globalThis.userGrid[r][c] !== 3) return false;
    if (globalThis.wrongGrid[r][c]) return false;
    globalThis.userGrid[r][c] = 2;
    globalThis.systemMarkedGrid[r][c] = true;
    renderCell(r, c);
    return true;
}

// Returns [r,c] of a random candidate satisfying pick(), or null.
export function randomCell(pick) {
    if (!cur) return null;
    const sol = cur.grid;
    const pool = [];
    for (let r = 0; r < sol.length; r++)
        for (let c = 0; c < sol[0].length; c++)
            if (pick(r, c)) pool.push([r, c]);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

export const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];
export function inGrid(r, c) {
    return cur && r >= 0 && c >= 0 && r < cur.grid.length && c < cur.grid[0].length;
}

// Line fill stats copied from timer.js semantics.
export function lineFillStats(index, isRow) {
    const sol = cur.grid;
    const other = isRow ? sol[0].length : sol.length;
    let filled = 0, total = 0;
    for (let i = 0; i < other; i++) {
        const r = isRow ? index : i;
        const c = isRow ? i : index;
        if (sol[r][c] === 1) {
            total++;
            if (globalThis.userGrid[r][c] === 1 || globalThis.revealedGrid[r][c]) filled++;
        }
    }
    return { filled, total };
}

export function toast(msg) {
    if (typeof globalThis.showToast === 'function') globalThis.showToast(msg);
}

//--------------------------------------------------------------------------
//--------------------------CLUE SPAN UTILITIES-----------------------------
//--------------------------------------------------------------------------

export function rowSpanIds(r) {
    const ids = [];
    document.querySelectorAll(`[id^="rn-${r}-"]`).forEach(el => ids.push(el));
    return ids;
}
export function colSpanIds(c) {
    const ids = [];
    document.querySelectorAll(`[id^="cn-${c}-"]`).forEach(el => ids.push(el));
    return ids;
}
export function readLineSpans(type, idx) {
    return (type === 'row' ? rowSpanIds(idx) : colSpanIds(idx)).map(el => el.textContent);
}
export function writeLineSpans(type, idx, texts) {
    const els = type === 'row' ? rowSpanIds(idx) : colSpanIds(idx);
    els.forEach((el, i) => { el.textContent = texts[i] !== undefined ? texts[i] : ''; });
}
export function blankLineSpans(type, idx) {
    writeLineSpans(type, idx, []);
}

//--------------------------------------------------------------------------
//---------------------------PENALTY MODIFIERS------------------------------
//--------------------------------------------------------------------------
// Each modifier receives the current penalty and returns the new penalty.

// Live passive-tree stat channel (0 while the stats module is not loaded).
export function _ptxTreeStat(key) {
    if (typeof globalThis._computePlayerStats !== 'function') return 0;
    return Number((globalThis._computePlayerStats() || {})[key]) || 0;
}

export const PENALTY_MODS = [
    // Final Theorem: below 10% starting time → immune.
    pen => (has('final_theorem') && baseTime() > 0 && globalThis.timerSecs < baseTime() * 0.1) ? 0 : pen,
    // Outlier Immunity: first mistake free.
    pen => (has('outlier_immunity') && globalThis.mistakeCount === 1) ? 0 : pen,
    // Actuary: flat −5s.
    pen => has('actuary') ? Math.max(0, pen - 5) : pen,
    // Supply Chain: −10s per item used (max 3 stacks).
    pen => has('supply_chain') ? Math.max(0, pen - 10 * Math.min(3, PTX.supplyStacks || 0)) : pen,
    // Graceful Degradation: cap at 30s.
    pen => has('graceful_degradation') ? Math.min(30, pen) : pen,
    // Perfectionist keystone: every mistake costs more time.
    pen => {
        const more = _ptxTreeStat('mistakeTimeCostMorePct');
        return more > 0 ? Math.round(pen * (1 + more / 100)) : pen;
    },
    // Zero Variance: everything becomes exactly 45s (overrides all above).
    pen => has('keystone_zero_variance') ? 30 : pen,
];

//--------------------------------------------------------------------------
//--------------------------HOOK REGISTRATIONS------------------------------
//--------------------------------------------------------------------------

export const ON_START = [];
export const ON_FILL = [];
export const ON_MISTAKE = [];
export const ON_LUCKY_CLAIM = [];
export const ON_ITEM_USE = [];
export const ON_LINE_DONE = [];
export const TICKS = [];

