import { _isColSolved, _isRowSolved, clues } from '../grid.js';
import { markWrongTiles } from '../puzzle-mechanics/grid-actions.js';
import { save } from '../state.js';
import { updTimer } from '../timer/timer.js';
import { addTimeSecs } from '../timer/timer-adjust.js';
import { t } from '../translation/translations.js';
import { ptHasSkill } from './probability-tree-state-points.js';
import { _getTreeTimerStartSecs } from '../hub/hub-leveling.js';
import { STATE } from '../state.js';
import { cur } from '../state.js';
import { S, ON_LINE_DONE, patch, resetLevel, PTX, has, ON_START, _ptxTreeStat, PENALTY_MODS, ON_MISTAKE, ON_FILL, TICKS, ON_LUCKY_CLAIM, markAt, toast, ON_ITEM_USE, addSecs, ORTHO, inGrid, revealAt } from './ptx-core.js';
import { applyKolmogorov, applyNightfall, applyUniformPrior, shuffleArr } from './ptx-misc-effects.js';
// Side-effect imports: each module registers its node effects into the ptx-core hook lists.
import './ptx-start-effects.js';
import './ptx-fill-mistake-effects.js';
import './ptx-line-tick-effects.js';

//------------------------------------------------------------------------
//-------------------EXPANSION NODES (303-402)----------------------------
//------------------------------------------------------------------------
// Wires the puzzle-side effects of the 100 expansion nodes into the game by
// wrapping the original global functions (patch). Every wrapper calls the
// original first, so existing behaviour is untouched. The effects themselves
// live in the ptx-*-effects modules and register into hook lists in
// ptx-core.js: ON_START, ON_FILL, ON_MISTAKE, ON_LINE_DONE, TICKS,
// ON_LUCKY_CLAIM, ON_ITEM_USE (plus penalty modifiers and clue rewriting).
//------------------------------------------------------------------------

// Wrapping needs every target function to exist, so it runs at page load, not
// while modules are still importing.
export function _ptxRunExpansion() {
    //--------------------------------------------------------------------------
    //------------------------LINE-COMPLETION DETECTION-------------------------
    //--------------------------------------------------------------------------

    function snapshotLines() {
        if (!cur) { S.rowsPrimed = new Set(); S.colsPrimed = new Set(); return; }
        S.rowsPrimed = new Set();
        S.colsPrimed = new Set();
        for (let r = 0; r < cur.grid.length; r++)
            if (_isRowSolved(cur.grid, r)) S.rowsPrimed.add(r);
        for (let c = 0; c < cur.grid[0].length; c++)
            if (_isColSolved(cur.grid, c)) S.colsPrimed.add(c);
    }

    function fireIfNewlyDone(type, idx, primed) {
        const set = type === 'row' ? S.rowsPrimed : S.colsPrimed;
        if (!set) return;
        if (primed && set.has(idx)) return;
        set.add(idx);
        ON_LINE_DONE.forEach(fn => fn(type, idx));
    }

    //--------------------------------------------------------------------------
    //-----------------------------MAIN PATCHES---------------------------------
    //--------------------------------------------------------------------------

    // ---- Level bootstrap ------------------------------------------------------

    patch('buildGrid', function (orig, args) {
        resetLevel();
        PTX.supplyStacks = 0;
        PTX.doubleNextReveal = false;
        const result = orig(...args);
        setTimeout(() => {
            snapshotLines();
            runClueFX();
        }, 80);
        return result;
    });

    function runClueFX() {
        if (!cur || globalThis.dead) return;
        if (has('keystone_kolmogorov')) { applyKolmogorov(); return; }
        if (has('keystone_uniform_prior')) { applyUniformPrior(); return; }
        if (has('keystone_nightfall_protocol')) { applyNightfall(); return; }
    }

    // ---- Start-of-level passives ------------------------------------------------

    patch('_applyPassiveStartEffects', function (orig, args) {
        const result = orig(...args);
        try {
            ON_START.forEach(fn => { try { fn(); } catch (e) { /* keep other effects alive */ } });
        } catch (e) { /* ignore */ }
        // Chain guarantee: ON_START must run on every chained puzzle in a map.
        // Do not gate this patch behind _suppressEncounterStop - that flag
        // preserves timer/HP across chain puzzles but reveal/mark passives
        // (skyward_survey, entropy_observer, etc.) intentionally re-roll
        // per puzzle. See _transitionToChainPuzzle hardening.
        return result;
    });

    // ---- Start-time bonuses -------------------------------------------------------

    patch('_initTimer', function (orig, args) {
        const result = orig(...args);
        if (window._suppressEncounterStop || !cur) return result;

        const FLATS = [
            ['small_lesser_adaptive_correction', 10],
            ['wind_tunnel', 10], ['jet_stream', 15], ['cum_laude', 25],
            ['tick_tock_talent', 20], ['second_hand', 30], ['hourglass_doctrine', 45],
            ['midnight_oil', 20], ['tenure', 15],
        ];
        let add = 0;
        FLATS.forEach(([key, val]) => { if (has(key)) add += val; });
        // Time Margin nodes (timer_start_secs effect, pt-effects.js).
        add += _getTreeTimerStartSecs();

        if (STATE.ptxSavingsSecs > 0) {
            add += STATE.ptxSavingsSecs;
            STATE.ptxSavingsSecs = 0;
        }

        // ptxSavingsSecs is banked level-start time (purchased with passive
        // points) - setup, not an in-level gain, so it must not scale with
        // the map modifier.
        if (add > 0) addTimeSecs(add, { raw: true });

        // Scholar's Debt keystone: double total starting time. Raw write on
        // purpose - this is level-start setup, not a player-facing time gain,
        // so it must not feed the time-added bookkeeping.
        if (has('keystone_scholars_debt')) globalThis.timerSecs += globalThis.timerSecs;

        // Glass Clock keystone: the level timer is a share shorter.
        const glassLess = Math.min(90, _ptxTreeStat('glassClockTimerLessPct'));
        if (glassLess > 0) globalThis.timerSecs = Math.max(1, Math.round(globalThis.timerSecs * (1 - glassLess / 100)));

        PTX.baseTime = globalThis.timerSecs;
        // Level-start timer snapshot for combat-side "below 25% of the Timer" lines.
        globalThis._levelStartTimerSecs = globalThis.timerSecs;
        updTimer();
        return result;
    });

    // ---- Penalty pipeline ------------------------------------------------------------

    patch('_calcEffectivePenalty', function (orig, args) {
        let pen = orig(...args);
        for (const mod of PENALTY_MODS) pen = mod(pen);
        PTX.lastPen = pen;
        return pen;
    });

    patch('applyPenalty', function (orig, args) {
        const before = globalThis.mistakeCount;
        const result = orig(...args);
        const counted = globalThis.mistakeCount > before;
        if (counted && cur && !globalThis.dead) {
            if (has('drift_correction')) S.driftMistakes++;
            ON_MISTAKE.forEach(fn => { try { fn(args[0], args[1]); } catch (e) { /* ignore */ } });
        }
        return result;
    });

    // ---- Correct-fill hooks -------------------------------------------------------------

    patch('fireCorrectFillHooks', function (orig, args) {
        const result = orig(...args);
        if (cur && !globalThis.dead) {
            ON_FILL.forEach(fn => { try { fn(args[0], args[1]); } catch (e) { /* ignore */ } });
        }
        return result;
    });

    // ---- Line completion via updClues diffing ----------------------------------------------

    patch('updClues', function (orig, args) {
        const [row, col, isInitial] = args;
        if (isInitial || !cur) return orig(...args);

        const rowWasDone = S.rowsPrimed ? S.rowsPrimed.has(row) : true;
        const colWasDone = S.colsPrimed ? S.colsPrimed.has(col) : true;

        const result = orig(...args);

        const rowDone = _isRowSolved(cur.grid, row);
        const colDone = _isColSolved(cur.grid, col);
        if (rowDone && !rowWasDone) fireIfNewlyDone('row', row, false);
        else if (rowDone && S.rowsPrimed) S.rowsPrimed.add(row);
        if (colDone && !colWasDone) fireIfNewlyDone('col', col, false);
        else if (colDone && S.colsPrimed) S.colsPrimed.add(col);

        return result;
    });

    // ---- Timer tick systems -------------------------------------------------------------------

    let tickInterval = null;

    function startTickLoop() {
        stopTickLoop();
        tickInterval = setInterval(() => {
            if (!cur || globalThis.dead) return;
            if (globalThis.timerFrozen) return;
            S.tick++;
            TICKS.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
        }, 1000);
    }

    function stopTickLoop() {
        if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    }

    patch('startTimer', function (orig, args) {
        const result = orig(...args);
        startTickLoop();
        return result;
    });
    patch('stopTimer', function (orig, args) { stopTickLoop(); return orig(...args); });
    patch('pauseTimer', function (orig, args) { stopTickLoop(); return orig(...args); });

    // ---- Lucky tiles ------------------------------------------------------------------------------

    patch('handleLuckyTileClaim', function (orig, args) {
        const result = orig(...args);
        if (cur && !globalThis.dead) {
            ON_LUCKY_CLAIM.forEach(fn => { try { fn(args[0], args[1]); } catch (e) { /* ignore */ } });
        }
        return result;
    });

    patch('_calcLuckyTileCount', function (orig, args) {
        const [, , isLargeOrMassive] = args;
        let count = orig(...args);
        if (has('karmic_residue') && count > 0 && Math.random() < 0.10) count += 1;
        if (has('probability_well') && count === 0 && !isLargeOrMassive && cur) {
            const cells = cur.grid.length * cur.grid[0].length;
            if (cells >= 100) count = 1;   // medium grids get exactly one lucky tile
        }
        return count;
    });

    // Philosopher's Grid: strip the shimmer so tiles stay invisible.
    patch('renderCell', function (orig, args) {
        const result = orig(...args);
        if (has('keystone_philosophers_grid') && cur) {
            const el = document.getElementById(`g-${args[0]}-${args[1]}`);
            if (el) el.classList.remove('cell-lucky', 'cell-lucky-focus');
        }
        return result;
    });

    patch('_applyOutlierDetectionHighlights', function (orig, args) {
        if (has('keystone_philosophers_grid')) return;   // no focus highlights either
        return orig(...args);
    });

    // ---- Type I Error keystone (370): mass-mark on first ✕ -----------------------------

    patch('resolveRightClickValue', function (orig, args) {
        const value = orig(...args);
        if (value === 2 && !S.typeIUsed && has('keystone_type_i_error') && cur && !globalThis.dead) {
            S.typeIUsed = true;
            const [row, col] = args;
            let n = 0;
            const rows = cur.grid.length, cols = cur.grid[0].length;
            for (let c = 0; c < cols; c++) if (c !== col && markAt(row, c)) n++;
            for (let r = 0; r < rows; r++) if (r !== row && markAt(r, col)) n++;
            if (n > 0) toast(`🚨 Type I Error: ${n} cells mass-marked`);
        }
        return value;
    });

    // ---- Item-use hooks ------------------------------------------------------------------------------

    patch('useItem', function (orig, args) {
        const result = orig(...args);
        if (cur && !globalThis.dead) {
            ON_ITEM_USE.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
        }
        return result;
    });

    // ---- Shield / CI absorption hooks --------------------------------------------------------------------

    patch('tryAbsorbWithShield', function (orig, args) {
        const result = orig(...args);
        if (result === true && cur && !globalThis.dead) {
            if (has('glyph_ward')) { addSecs(15); toast('🔱 Glyph Ward +15s'); }
            if (has('symmetric_shield')) { markWrongTiles(2); toast('🪞 Symmetric Shield'); }
        }
        return result;
    });

    patch('tryAbsorbWithConfidenceInterval', function (orig, args) {
        const result = orig(...args);
        if (result === true && cur && !globalThis.dead && has('asymptotic_freedom')) {
            addSecs(15);
            toast('🕊️ Asymptotic Freedom +15s');
        }
        return result;
    });

    // ---- Law of Large Numbers synergy (341) ------------------------------------------------------------

    patch('_triggerLawOfLargeNumbers', function (orig, args) {
        const result = orig(...args);
        if (cur && !globalThis.dead && has('limit_theorem') && has('keystone_law_of_large_numbers')) {
            addSecs(5);
            toast('📈 Limit Theorem +5s');
        }
        return result;
    });

    // ---- Streak threshold reduction (334) ----------------------------------------------------------------

    patch('checkStreakBonus', function (orig, args) {
        if (has('truly_large_numbers') && typeof window.LEVEL_FLAGS.streakBonusFills !== 'undefined' && window.LEVEL_FLAGS.streakBonusFills === 9) {
            window.LEVEL_FLAGS.streakBonusFills = 14;   // the upcoming fill becomes #10 and hits the hardcoded >=15 trigger
        }
        return orig(...args);
    });

    // ---- Dead Reckoning threshold reduction (386) -----------------------------------------------------------

    patch('_deadReckoningCheckUnlock', function (orig, args) {
        if (!has('sampling_frame') || !window._deadReckoningActive || window._deadReckoningUnlocked || !cur) {
            return orig(...args);
        }
        const sol = cur.grid;
        const rows = sol.length, cols = sol[0].length;
        const totalFilled = sol.reduce((sum, row) => sum + row.filter(v => v === 1).length, 0);
        let playerFilled = 0;
        for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++)
                if (sol[r][c] === 1 && (globalThis.userGrid[r][c] === 1 || globalThis.revealedGrid[r][c])) playerFilled++;

        if (playerFilled < Math.ceil(totalFilled * 0.15)) return;

        window._deadReckoningUnlocked = true;
        for (let r = 0; r < rows; r++) {
            clues(sol[r]).forEach((val, i) => {
                const span = document.getElementById(`rn-${r}-${i}`);
                if (span) span.textContent = val;
            });
        }
        for (let c = 0; c < cols; c++) {
            clues(sol.map(row => row[c])).forEach((val, i) => {
                const span = document.getElementById(`cn-${c}-${i}`);
                if (span) span.textContent = val;
            });
        }
        globalThis.showToast(`🧭 ${t('cg_dead_reckoning')} (15%)`);
    });

    // ---- Tutor auto-answer boost (392) ---------------------------------------------------------------------

    patch('_quizCalcTutorSuccessChance', function (orig, args) {
        const chance = orig(...args);
        return has('honorary_degree') ? chance + 0.10 : chance;
    });

    // ---- Win banking (Hour Vault 387 / Compound Interest 388 / Safety Deposit 389 / Cold Reading 365) -------

    patch('checkWin', function (orig, args) {
        const result = orig(...args);
        if (S.bankedThisLevel) return result;
        const ov = document.getElementById('ov-win');
        if (!ov || !ov.classList.contains('show')) return result;
        S.bankedThisLevel = true;

        if (has('hour_vault') && globalThis.timerSecs > 300) {
            const cap = has('safety_deposit') ? 240 : 120;
            const amount = Math.min(cap, Math.round(globalThis.timerSecs * 0.10));
            STATE.ptxSavingsSecs = Math.min(cap, (STATE.ptxSavingsSecs || 0) + amount);
            if (amount > 0) toast(`🏦 Hour Vault: banked ${amount}s for next level`);
        }
        if (has('compound_interest')) STATE.ptxSavingsReveals = Math.max(1, STATE.ptxSavingsReveals || 0);
        if (has('safety_deposit')) STATE.ptxSavingsReveals = Math.max(2, STATE.ptxSavingsReveals || 0);
        if (has('cold_reading') && globalThis.mistakeCount >= 3) STATE.ptxColdReading = true;

        save();
        return result;
    });

    // ---- Midas double-reveal plumbing (325) ------------------------------------------------------------------

    patch('revealTiles', function (orig, args) {
        if (PTX.inPtxReveal) return orig(...args);   // no recursion through our own cascades
        let count = args[0];
        if (count > 0 && PTX.doubleNextReveal) {
            PTX.doubleNextReveal = false;
            count *= 2;
            PTX.inPtxReveal = true;
            try { orig(count); } finally { PTX.inPtxReveal = false; }
            return;
        }
        const result = orig(...args);

        // Wavefunction Spread (346) + Law of Total Probability (394) post-reveal procs
        // revealTiles returns [{row, col}, ...]
        if (Array.isArray(result) && result.length > 0 && cur && !globalThis.dead) {
            result.forEach(({ row: r, col: c }) => {
                if (has('wavefunction_spread') && Math.random() < 0.20) {
                    const dirs = shuffleArr([...ORTHO]);
                    for (const [dr, dc] of dirs) {
                        if (inGrid(r + dr, c + dc) && markAt(r + dr, c + dc)) { toast('🫧 Wavefunction Spread'); break; }
                    }
                }
                if (has('total_probability') && Math.random() < 0.25) {
                    const dirs = shuffleArr([...ORTHO]);
                    for (const [dr, dc] of dirs) {
                        if (inGrid(r + dr, c + dc) && cur.grid[r + dr][c + dc] === 1 && revealAt(r + dr, c + dc)) { toast('➗ Total Probability cascade'); break; }
                    }
                }
            });
        }
        return result;
    });

    // ---- Peripheral Vision (391): marks spread horizontally ----------------------------------------------------

    patch('markWrongTiles', function (orig, args) {
        const result = orig(...args);
        if (Array.isArray(result) && result.length > 0 && cur && !globalThis.dead && has('peripheral_vision')) {
            result.forEach(([r, c]) => {
                if (Math.random() >= 0.25) return;
                [[0, -1], [0, 1]].forEach(([dr, dc]) => {
                    if (inGrid(r + dr, c + dc) && markAt(r + dr, c + dc)) toast('👀 Peripheral Vision');
                });
            });
        }
        return result;
    });

    // ---- Variance Swap (380): 10% of reveals are doubled ---------------------------------------------------------
    // Additional wrapper layer on top of the patched revealTiles above.

    const revealAfterProcs = window.revealTiles;
    window.revealTiles = function (...args) {
        if (PTX.inSwap) return revealAfterProcs(...args);
        const result = revealAfterProcs(...args);
        if (Array.isArray(result) && result.length > 0 && cur && !globalThis.dead && ptHasSkill('variance_swap') && Math.random() < 0.10) {
            PTX.inSwap = true;
            try { revealAfterProcs(result.length); toast('🎚️ Variance Swap: reveal doubled'); } finally { PTX.inSwap = false; }
        }
        return result;
    };

}
// Run on DOMContentLoaded. Deferred module scripts execute at readyState
// 'interactive', so checking only for 'loading' would run this too early and
// the wraps would capture undefined targets.
if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', _ptxRunExpansion);
} else {
    _ptxRunExpansion();
}
