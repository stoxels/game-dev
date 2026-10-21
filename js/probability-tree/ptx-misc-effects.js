//------------------------------------------------------------------------
//-------------------EXPANSION: LUCKY TILE, ITEM & CLUE EFFECTS-----------
//------------------------------------------------------------------------
// Expansion-node effects for lucky-tile claims, item use, and the clue-rewriting
// keystones (Kolmogorov, Uniform Prior, Nightfall).
//------------------------------------------------------------------------

import { clues } from '../grid.js';
import { revealTiles } from '../puzzle-mechanics/grid-actions.js';
import { cur } from '../state.js';
import { ON_LUCKY_CLAIM, has, toast, addSecs, ON_ITEM_USE, PTX, rowSpanIds, colSpanIds, S, readLineSpans, writeLineSpans, blankLineSpans } from './ptx-core.js';

//--------------------------------------------------------------------------
//--------------------------LUCKY TILE FEATURES-----------------------------
//--------------------------------------------------------------------------

ON_LUCKY_CLAIM.push(() => {   // Fortune Well (324)
    if (has('fortune_well')) { revealTiles(1); toast('🕳️ Fortune Well'); }
});

ON_LUCKY_CLAIM.push(() => {   // Gilded Cage (326)
    if (has('gilded_cage')) { addSecs(20); toast('🐦 Gilded Cage +20s'); }
});

ON_LUCKY_CLAIM.push(() => {   // Philosopher's Grid keystone (327)
    if (has('keystone_philosophers_grid')) {
        addSecs(60);
        revealTiles(2);
        toast("🧪 Philosopher's Grid +60s");
    }
});

//--------------------------------------------------------------------------
//-------------------------------ITEM USE------------------------------------
//--------------------------------------------------------------------------

ON_ITEM_USE.push(() => {   // Trade Routes (351)
    if (has('trade_routes')) { addSecs(10); toast('🐫 Trade Routes +10s'); }
});

ON_ITEM_USE.push(() => {   // Supply Chain stack (352)
    if (has('supply_chain')) PTX.supplyStacks = Math.min(3, (PTX.supplyStacks || 0) + 1);
});

ON_ITEM_USE.push(() => {   // Open Bazaar keystone (353)
    if (has('keystone_open_bazaar')) {
        revealTiles(2);
        addSecs(5);
        toast('🏪 Open Bazaar: 2 reveals, +5s');
    }
});

//--------------------------------------------------------------------------
//--------------------------CLUE REWRITE SYSTEMS----------------------------
//--------------------------------------------------------------------------

// Priority: Kolmogorov > Uniform Prior > Nightfall (only one applies).

export function applyKolmogorov() {
    if (!cur) return;
    const sol = cur.grid;
    for (let r = 0; r < sol.length; r++) {
        const runs = clues(sol[r]);
        const txt = compressRuns(runs);
        rowSpanIds(r).forEach((el, i) => { el.textContent = i === 0 ? txt : ''; });
    }
    for (let c = 0; c < sol[0].length; c++) {
        const runs = clues(sol.map(row => row[c]));
        const txt = compressRuns(runs);
        colSpanIds(c).forEach((el, i) => { el.textContent = i === 0 ? txt : ''; });
    }
    toast('🧬 Kolmogorov Complexity: clues compressed');
}

function compressRuns(runs) {
    const clean = runs.filter(v => v > 0);
    if (clean.length <= 2) return clean.join(' ');
    return `${clean[0]} … ${clean[clean.length - 1]}`;
}

export function applyUniformPrior() {
    if (!cur) return;
    const rows = cur.grid.length, cols = cur.grid[0].length;
    S.clueOriginals = { rows: {}, cols: {} };

    // Backup originals
    for (let r = 0; r < rows; r++) S.clueOriginals.rows[r] = readLineSpans('row', r);
    for (let c = 0; c < cols; c++) S.clueOriginals.cols[c] = readLineSpans('col', c);

    // Permute row clue arrays among rows (derangement-ish shuffle)
    const rowTexts = Array.from({ length: rows }, (_, r) => S.clueOriginals.rows[r]);
    const rowPerm = shuffleArr([...rowTexts]);
    for (let r = 0; r < rows; r++) writeLineSpans('row', r, rowPerm[r]);

    const colTexts = Array.from({ length: cols }, (_, c) => S.clueOriginals.cols[c]);
    const colPerm = shuffleArr([...colTexts]);
    for (let c = 0; c < cols; c++) writeLineSpans('col', c, colPerm[c]);

    // Upside: the level opens with 3 free reveals to anchor the shuffled clues.
    revealTiles(3);
    toast('❔ Uniform Prior: clues scrambled, 3 free reveals - solve lines to restore them (+3s each)');
}

export function shuffleArr(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function applyNightfall() {
    if (!cur) return;
    const rows = cur.grid.length, cols = cur.grid[0].length;
    S.clueOriginals = { rows: {}, cols: {} };
    for (let r = 0; r < rows; r++) {
        S.clueOriginals.rows[r] = readLineSpans('row', r);
        blankLineSpans('row', r);
    }
    for (let c = 0; c < cols; c++) {
        S.clueOriginals.cols[c] = readLineSpans('col', c);
        blankLineSpans('col', c);
    }
    toast('🌃 Nightfall Protocol: clues hidden for 1 minute');

    setTimeout(() => {
        if (!cur || !S.clueOriginals) return;
        for (const r of Object.keys(S.clueOriginals.rows)) writeLineSpans('row', Number(r), S.clueOriginals.rows[r]);
        for (const c of Object.keys(S.clueOriginals.cols)) writeLineSpans('col', Number(c), S.clueOriginals.cols[c]);
        S.clueOriginals = null;
        revealTiles(3);
        toast('🌅 Night lifts - clues restored, 3 reveals granted');
    }, 60000);
}

