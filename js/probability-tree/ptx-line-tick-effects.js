//------------------------------------------------------------------------
//-------------------EXPANSION: LINE & TICK EFFECTS-----------------------
//------------------------------------------------------------------------
// Expansion-node effects that fire when a line completes (ON_LINE_DONE) and the
// per-second systems that run while a level is active (TICKS).
//------------------------------------------------------------------------

import { renderCell } from '../grid.js';
import { revealTiles, markWrongTiles } from '../puzzle-mechanics/grid-actions.js';
import { _calcEmergencyScanDuration } from '../timer/timer.js';
import { _executeFieldScan } from '../classes/class-probabilist.js';
import { cur } from '../state.js';
import { ON_LINE_DONE, has, elapsedSecs, addSecs, S, toast, freeze, PTX, randomCell, revealAt, writeLineSpans, TICKS, loseSecs, baseTime } from './ptx-core.js';

//--------------------------------------------------------------------------
//--------------------------LINE COMPLETION HOOKS---------------------------
//--------------------------------------------------------------------------

ON_LINE_DONE.push((type) => {   // time bonuses + Occam multiplier
    let gain = 0;
    if (has('renewal_theorem')) gain += 2;                       // 354
    if (type === 'col') {
        if (has('probability_current')) gain += 5;               // 345
        if (has('base_rate')) gain += 2;                         // 395
    } else {
        if (has('data_hygiene')) gain += 5;                      // 374
        if (has('razors_edge')) gain += 5;                       // 399
    }
    if (gain > 0) {
        if (has('occams_razor') && elapsedSecs() < 180) gain *= 2;   // 398
        addSecs(gain);
    }
});

ON_LINE_DONE.push(() => {   // Martingale payout (322)
    if (!has('keystone_martingale')) return;
    if (S.martingaleStake > 15) {
        const paid = addSecs(S.martingaleStake);
        if (paid > 0) toast(`🎰 Martingale pays out ${paid}s`);
    }
    S.martingaleStake = 15;
});

ON_LINE_DONE.push(() => {   // Perpetual Frost keystone (333)
    if (has('keystone_perpetual_frost')) freeze(8000);
});

ON_LINE_DONE.push(() => {   // Midas Path (325)
    if (has('midas_path') && Math.random() < 0.10) {
        PTX.doubleNextReveal = true;
        toast('👑 Midas Path: next reveal doubled');
    }
});

ON_LINE_DONE.push((type, idx) => {   // Collapse Point (347): column completions
    if (type !== 'col' || !has('collapse_point')) return;
    [-1, 1].forEach(dc => {
        const nc = idx + dc;
        if (nc < 0 || nc >= cur.grid[0].length) return;
        const cell = randomCell((r, c) => c === nc);
        if (cell) revealAt(cell[0], cell[1]);
    });
});

ON_LINE_DONE.push((type, idx) => {   // Uniform Prior restore (367)
    if (!has('keystone_uniform_prior') || !S.clueOriginals) return;
    const store = type === 'row' ? S.clueOriginals.rows : S.clueOriginals.cols;
    if (store[idx]) writeLineSpans(type, idx, store[idx]);
    // Upside: every line you complete also pays +3 seconds.
    addSecs(3);
    toast('❔ Uniform Prior: line solved, clues restored +3s');
});

//--------------------------------------------------------------------------
//-----------------------------TICK SYSTEMS---------------------------------
//--------------------------------------------------------------------------

TICKS.push(() => {   // Scholar's Debt keystone (364)
    if (has('keystone_scholars_debt') && S.tick % 60 === 0) { loseSecs(30); toast('💸 The interest collector takes 30s'); }
});

TICKS.push(() => {   // Lunar Cycle (396)
    if (has('lunar_cycle') && S.tick % 420 === 0 && S.tick > 0) { addSecs(30); toast('🌙 Lunar Cycle +30s'); }
});

TICKS.push(() => {   // Eclipse Focus (339)
    if (has('eclipse_focus') && S.tick % 240 === 0 && S.tick > 0) revealTiles(1);
});

TICKS.push(() => {   // Wiener Process (318)
    if (!has('wiener_process') || S.tick % 90 !== 0 || S.tick === 0) return;
    const cell = randomCell((r, c) => cur.grid[r][c] === 1 && globalThis.userGrid[r][c] !== 1 && !globalThis.revealedGrid[r][c]);
    if (!cell) return;
    const [r, c] = cell;
    const prev = globalThis.userGrid[r][c];
    globalThis.userGrid[r][c] = 1;
    renderCell(r, c);
    setTimeout(() => {
        if (!cur) return;
        if (globalThis.userGrid[r][c] === 1 && !globalThis.revealedGrid[r][c]) {
            globalThis.userGrid[r][c] = prev;
            renderCell(r, c);
        }
    }, 2000);
});

TICKS.push(() => {   // Drift Correction (321)
    if (!has('drift_correction')) return;
    if (Date.now() - S.driftWindowStart >= 300000) {
        if (S.driftMistakes < 2) { addSecs(30); toast('🧭 Drift Correction +30s'); }
        S.driftMistakes = 0;
        S.driftWindowStart = Date.now();
    }
});

TICKS.push(() => {   // Hypothesis Testing (368) / Expected Shortfall (402) / Stationary State (356) / Axiom of Choice (344)
    if (!cur || !baseTime()) return;

    const frac = globalThis.timerSecs / baseTime();

    if (has('hypothesis_testing')) {
        if (!S.hypo75 && frac <= 0.75) { S.hypo75 = true; revealTiles(1); toast('📐 Hypothesis Test: reveal'); }
        if (!S.hypo50 && frac <= 0.50) { S.hypo50 = true; markWrongTiles(1); toast('📐 Hypothesis Test: mark'); }
    }

    if (has('expected_shortfall') && !S.shortfallUsed && frac <= 0.5) {
        S.shortfallUsed = true;
        addSecs(45);
        toast('📉 Expected Shortfall +45s');
    }

    if (has('stationary_state') && !S.stationaryUsed && globalThis.timerSecs > 0 && globalThis.timerSecs < 60) {
        S.stationaryUsed = true;
        freeze(15000);
        toast('⏸️ Stationary State: frozen 15s');
    }

    if (has('keystone_axiom_of_choice') && !S.axiomUsed && frac <= 0.25) {
        S.axiomUsed = true;
        let remaining = 0;
        for (let r = 0; r < cur.grid.length; r++)
            for (let c = 0; c < cur.grid[0].length; c++)
                if (cur.grid[r][c] === 1 && globalThis.userGrid[r][c] !== 1 && !globalThis.revealedGrid[r][c]) remaining++;
        const n = Math.ceil(remaining * 0.05);
        if (n > 0) { revealTiles(n); toast(`🎲 Axiom of Choice: ${n} cells revealed`); }
    }
});

TICKS.push(() => {   // Power Analysis (369): second Emergency Scan at ≤2 minutes
    if (!has('power_analysis') || !has('emergency_scan_1')) return;
    if (!window._emergencyScanFired || S.powerScan2Fired) return;
    if (globalThis.timerSecs > 120 || globalThis.timerSecs <= 0) return;
    S.powerScan2Fired = true;
    const fullSize = Math.max(cur.grid.length, cur.grid[0].length);
    _executeFieldScan(Math.floor(cur.grid.length / 2), Math.floor(cur.grid[0].length / 2), fullSize, _calcEmergencyScanDuration());
    toast('💪 Power Analysis: scan re-fired');
});

