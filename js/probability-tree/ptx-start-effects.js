//------------------------------------------------------------------------
//-------------------EXPANSION: START-OF-LEVEL EFFECTS--------------------
//------------------------------------------------------------------------
// Expansion-node effects that fire when a level starts (ON_START hooks).
//------------------------------------------------------------------------

import { revealTiles, markWrongTiles } from '../puzzle-mechanics/grid-actions.js';
import { STATE } from '../state.js';
import { cur } from '../state.js';
import { ON_START, has, randomCell, revealAt, toast, markAt, roll, ORTHO, inGrid } from './ptx-core.js';

//--------------------------------------------------------------------------
//--------------------------START-OF-LEVEL FX-------------------------------
//--------------------------------------------------------------------------

// Positional reveals / marks ------------------------------------------------

ON_START.push(() => {   // Skyward Survey (303)
    if (!has('skyward_survey')) return;
    const cell = randomCell((r, c) => r === 0);
    if (cell && revealAt(cell[0], cell[1])) toast('🛰️ Skyward Survey');
});

ON_START.push(() => {   // Stratosphere Read (304)
    if (!has('stratosphere_read')) return;
    const lastRow = cur.grid.length - 1;
    const cell = randomCell((r, c) => r === lastRow);
    if (cell && revealAt(cell[0], cell[1])) toast('🎈 Stratosphere Read');
});

ON_START.push(() => {   // Horizon Walker (305)
    if (!has('horizon_walker')) return;
    const cell = randomCell((r, c) => c === 0);
    if (cell && markAt(cell[0], cell[1])) toast('🌄 Horizon Walker');
});

ON_START.push(() => {   // Zenith Glimpse (306)
    if (!has('zenith_glimpse')) return;
    const lastCol = cur.grid[0].length - 1;
    const cell = randomCell((r, c) => c === lastCol);
    if (cell && markAt(cell[0], cell[1])) toast('☀️ Zenith Glimpse');
});

ON_START.push(() => {   // Cartographer's Oath keystone (307)
    if (!has('keystone_cartographers_oath')) return;
    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    let touched = 0;
    const walk = (r, c) => {
        if (sol[r][c] === 1) { if (revealAt(r, c)) touched++; }
        else if (markAt(r, c)) touched++;
    };
    for (let c = 0; c < cols; c++) { walk(0, c); walk(rows - 1, c); }
    for (let r = 1; r < rows - 1; r++) { walk(r, 0); walk(r, cols - 1); }
    if (touched) toast("🗺️ Cartographer's Oath");
});

// Simple rolls ----------------------------------------------------------------

ON_START.push(() => {   // Socratic Method (308)
    if (has('socratic_method') && roll(0.25, false)) revealTiles(1);
});

ON_START.push(() => {   // Fair Coin (382)
    if (!has('fair_coin')) return;
    if (roll(0.10, false)) revealTiles(1);
    if (roll(0.10, true)) markWrongTiles(1);
});

// Information-theory cluster -----------------------------------------------

ON_START.push(() => {   // Entropy Observer (312)
    if (!has('entropy_observer')) return;
    const sol = cur.grid;
    let sparsest = 0, min = Infinity;
    for (let r = 0; r < sol.length; r++) {
        const f = sol[r].filter(v => v === 1).length;
        if (f < min) { min = f; sparsest = r; }
    }
    const cell = randomCell((r, c) => r === sparsest);
    if (cell && revealAt(cell[0], cell[1])) toast('🌡️ Entropy Observer');
});

ON_START.push(() => {   // Prior Art (366)
    if (!has('prior_art')) return;
    const sol = cur.grid;
    let densest = 0, max = -1;
    for (let r = 0; r < sol.length; r++) {
        const f = sol[r].filter(v => v === 1).length;
        if (f > max) { max = f; densest = r; }
    }
    const cell = randomCell((r, c) => r === densest);
    if (cell && revealAt(cell[0], cell[1])) toast('📚 Prior Art');
});

ON_START.push(() => {   // Shannon Bound (313)
    if (!has('shannon_bound')) return;
    const target = randomCell((r, c) =>
        cur.grid[r][c] === 0 && globalThis.userGrid[r][c] === 0 &&
        ORTHO.some(([dr, dc]) => inGrid(r + dr, c + dc) && globalThis.revealedGrid[r + dr][c + dc]));
    if (target && markAt(target[0], target[1])) toast('📶 Shannon Bound');
});

ON_START.push(() => {   // Mutual Information (314)
    if (!has('mutual_information')) return;
    const target = randomCell((r, c) =>
        cur.grid[r][c] === 1 && globalThis.userGrid[r][c] !== 1 && !globalThis.revealedGrid[r][c] &&
        (rowHasRevealed(r) || colHasRevealed(c)));
    if (target) { revealAt(target[0], target[1]); toast('🔗 Mutual Information'); }
    else revealTiles(1);
});

function rowHasRevealed(r) {
    for (let c = 0; c < cur.grid[0].length; c++) if (globalThis.revealedGrid[r][c]) return true;
    return false;
}
function colHasRevealed(c) {
    for (let r = 0; r < cur.grid.length; r++) if (globalThis.revealedGrid[r][c]) return true;
    return false;
}

// Shadow cluster -------------------------------------------------------------
// (Umbral Survey, node 337, left the quadrant auto-mark mechanic for its
// block-ward rework and answers to notable_aegis_ward_337 now - the hook
// is gone, not kept as a second effect.)

// Generic +reveal / +mark start nodes ---------------------------------------

ON_START.push(() => { if (has('interdisciplinary')) revealTiles(1); });          // 360
ON_START.push(() => { if (has('cross_faculty')) markWrongTiles(1); });           // 361
ON_START.push(() => { if (has('margin_notes')) revealTiles(1); });               // 377
ON_START.push(() => { if (has('study_group')) markWrongTiles(1); });             // 378
ON_START.push(() => { if (has('dark_adaptation')) markWrongTiles(1); });         // 390
ON_START.push(() => { if (has('corollary')) revealTiles(1); });                  // 401
ON_START.push(() => {                                                            // 393 Thesis Defense
    if (!has('thesis_defense')) return;
    revealTiles(1); markWrongTiles(1);
});
ON_START.push(() => { if (has('night_vision')) markWrongTiles(2); });            // 338

// Persistent pending bonuses (Hour Vault / Cold Reading) ----------------------

ON_START.push(() => {
    let pending = 0;
    if (STATE.ptxSavingsReveals > 0) { pending += STATE.ptxSavingsReveals; STATE.ptxSavingsReveals = 0; }
    if (STATE.ptxColdReading) { pending += 1; STATE.ptxColdReading = false; }
    if (pending > 0) { revealTiles(pending); toast(`🏦 Banked insight: ${pending} reveal${pending > 1 ? 's' : ''}`); }
});

// Census (385) ------------------------------------------------------------------

ON_START.push(() => {
    if (!has('census') || !cur) return;
    const total = cur.grid.reduce((sum, row) => sum + row.filter(v => v === 1).length, 0);
    toast(`🗂️ Census: ${total} filled cells in total`);
});

// Measure Zero (343) --------------------------------------------------------------

ON_START.push(() => {
    if (!has('measure_zero') || !cur) return;
    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    let done = 0;
    for (let r = 0; r < rows; r++) {
        if (sol[r].every(v => v === 0))
            for (let c = 0; c < cols; c++) if (markAt(r, c)) done++;
    }
    for (let c = 0; c < cols; c++) {
        let empty = true;
        for (let r = 0; r < rows; r++) if (sol[r][c] === 1) { empty = false; break; }
        if (empty)
            for (let r = 0; r < rows; r++) if (markAt(r, c)) done++;
    }
    if (done) toast('∅ Measure Zero');
});

