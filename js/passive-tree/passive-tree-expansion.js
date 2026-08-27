//----------------------------------------------------------------------------------------
//-------------------PASSIVE TREE EXPANSION (nodes 303-402)-------------------------------
//----------------------------------------------------------------------------------------
// Implements all puzzle-side effects for the 100 expansion nodes and wires
// them into the existing game systems by wrapping the original global
// functions at load time. Purely additive: every wrapper calls the original
// implementation first, so existing behaviour is untouched.
//
// Hook categories:
//   onStart      – after _applyPassiveStartEffects (grid state exists)
//   onFill       – after fireCorrectFillHooks (verified correct fill)
//   onMistake    – after applyPenalty (mistake actually counted)
//   penMods      – transform effective penalty inside _calcEffectivePenalty
//   onLineDone   – line completion detection via updClues diffing
//   onTick       – per-second systems while a level is running
//   onLuckyClaim – after handleLuckyTileClaim
//   onItemUse    – after useItem (when not blocked)
//   clueFX       – clue-number rewriting after buildGrid
//----------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------

(function () {
    'use strict';

    //--------------------------------------------------------------------------
    //--------------------------PATCH INFRASTRUCTURE----------------------------
    //--------------------------------------------------------------------------

    // Replaces the global function `name` with a wrapper. Function declarations
    // are writable global bindings in classic scripts, so this is safe as long
    // as this file loads after all other game scripts (guaranteed by index.html).
    function patch(name, wrapper) {
        const orig = window[name];
        if (typeof orig !== 'function') return; // function missing — skip silently
        window[name] = function (...args) {
            return wrapper(orig.bind(this), args);
        };
    }

    const has = (key) => (typeof ptHasSkill === 'function') && ptHasSkill(key);

    //--------------------------------------------------------------------------
    //-----------------------------LEVEL STATE----------------------------------
    //--------------------------------------------------------------------------

    // Per-level runtime state, reset by resetLevel() from the buildGrid wrapper.
    const S = {};

    function resetLevel() {
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

    function baseTime() {
        return window._ptxBaseTime || 0;
    }

    function elapsedSecs() {
        return Math.floor((Date.now() - levelStartTime) / 1000);
    }

    //--------------------------------------------------------------------------
    //-----------------------------SMALL HELPERS--------------------------------
    //--------------------------------------------------------------------------

    function addSecs(n) {
        if (!cur || dead || n <= 0) return;
        const before = timerSecs;
        timerSecs = Math.min(7200, timerSecs + n);
        if (typeof _trackTimerDelta === 'function') _trackTimerDelta(before, timerSecs);
        updTimer();
    }

    function loseSecs(n) {
        if (!cur || dead || n <= 0) return;
        const before = timerSecs;
        timerSecs = Math.max(0, timerSecs - n);
        if (typeof _trackTimerDelta === 'function') _trackTimerDelta(before, timerSecs);
        updTimer();
    }

    function freeze(ms) {
        if (!cur || dead) return;
        timerFrozen = true;
        updTimer();
        setTimeout(() => { timerFrozen = false; updTimer(); }, ms);
    }

    // Start-of-level luck roll with all +% chance nodes applied.
    // markSide: true when the roll belongs to a mark effect (dream_logic swaps).
    function roll(chance, markSide) {
        let p = chance;
        if (has('statistical_bridge')) p += 0.05;
        if (has('law_of_averages')) p += 0.05;
        if (has('meta_analysis')) p += 0.10;
        if (has('dream_logic')) {
            const above = !baseTime() || timerSecs > baseTime() * 0.5;
            if (above && !markSide) p += 0.05;
            if (!above && markSide) p += 0.05;
        }
        return Math.random() < p;
    }

    // Reveals one specific solution cell (guards included).
    function revealAt(r, c) {
        if (!cur) return false;
        const sol = cur.grid;
        if (sol[r][c] !== 1) return false;
        if (userGrid[r][c] === 1 || revealedGrid[r][c]) return false;
        revealedGrid[r][c] = true;
        userGrid[r][c] = 1;
        renderCell(r, c);
        updClues(r, c);
        // Endgame: fire a projectile from this auto-reveal toward the targeted monster.
        // Queued if the encounter hasn't started yet (start-of-puzzle passives).
        if (typeof _egOnProgrammaticReveal === 'function') _egOnProgrammaticReveal([`g-${r}-${c}`]);
        checkWin();
        return true;
    }

    // Marks one specific truly-empty cell.
    function markAt(r, c) {
        if (!cur) return false;
        const sol = cur.grid;
        if (sol[r][c] !== 0) return false;
        if (userGrid[r][c] !== 0 && userGrid[r][c] !== 3) return false;
        if (wrongGrid[r][c]) return false;
        userGrid[r][c] = 2;
        systemMarkedGrid[r][c] = true;
        renderCell(r, c);
        return true;
    }

    // Returns [r,c] of a random candidate satisfying pick(), or null.
    function randomCell(pick) {
        if (!cur) return null;
        const sol = cur.grid;
        const pool = [];
        for (let r = 0; r < sol.length; r++)
            for (let c = 0; c < sol[0].length; c++)
                if (pick(r, c)) pool.push([r, c]);
        if (!pool.length) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    function inGrid(r, c) {
        return cur && r >= 0 && c >= 0 && r < cur.grid.length && c < cur.grid[0].length;
    }

    // Line fill stats copied from timer.js semantics.
    function lineFillStats(index, isRow) {
        const sol = cur.grid;
        const other = isRow ? sol[0].length : sol.length;
        let filled = 0, total = 0;
        for (let i = 0; i < other; i++) {
            const r = isRow ? index : i;
            const c = isRow ? i : index;
            if (sol[r][c] === 1) {
                total++;
                if (userGrid[r][c] === 1 || revealedGrid[r][c]) filled++;
            }
        }
        return { filled, total };
    }

    function toast(msg) {
        if (typeof showToast === 'function') showToast(msg);
    }

    //--------------------------------------------------------------------------
    //--------------------------CLUE SPAN UTILITIES-----------------------------
    //--------------------------------------------------------------------------

    function rowSpanIds(r) {
        const ids = [];
        document.querySelectorAll(`[id^="rn-${r}-"]`).forEach(el => ids.push(el));
        return ids;
    }
    function colSpanIds(c) {
        const ids = [];
        document.querySelectorAll(`[id^="cn-${c}-"]`).forEach(el => ids.push(el));
        return ids;
    }
    function readLineSpans(type, idx) {
        return (type === 'row' ? rowSpanIds(idx) : colSpanIds(idx)).map(el => el.textContent);
    }
    function writeLineSpans(type, idx, texts) {
        const els = type === 'row' ? rowSpanIds(idx) : colSpanIds(idx);
        els.forEach((el, i) => { el.textContent = texts[i] !== undefined ? texts[i] : ''; });
    }
    function blankLineSpans(type, idx) {
        writeLineSpans(type, idx, []);
    }

    //--------------------------------------------------------------------------
    //---------------------------PENALTY MODIFIERS------------------------------
    //--------------------------------------------------------------------------
    // Each modifier receives the current penalty and returns the new penalty.

    const PENALTY_MODS = [
        // Final Theorem: below 10% starting time → immune.
        pen => (has('final_theorem') && baseTime() > 0 && timerSecs < baseTime() * 0.1) ? 0 : pen,
        // Rune Insurance / Outlier Immunity: first mistake free.
        pen => ((has('rune_insurance') || has('outlier_immunity')) && mistakeCount === 1) ? 0 : pen,
        // Ergodic Recall: 3 charges per level absorb penalties entirely.
        pen => {
            if (has('ergodic_recall') && pen > 0 && (window._ptxRecallLeft === undefined || window._ptxRecallLeft > 0)) {
                window._ptxRecallLeft = (window._ptxRecallLeft === undefined ? 3 : window._ptxRecallLeft) - 1;
                toast('🧿 Ergodic Recall absorbed the penalty');
                return 0;
            }
            return pen;
        },
        // Tailwind: mistakes cost 50% more.
        pen => has('keystone_tailwind') ? Math.round(pen * 1.5) : pen,
        // Actuary: flat −5s.
        pen => has('actuary') ? Math.max(0, pen - 5) : pen,
        // Supply Chain: −10s per item used (max 3 stacks).
        pen => has('supply_chain') ? Math.max(0, pen - 10 * Math.min(3, window._ptxSupplyStacks || 0)) : pen,
        // Graceful Degradation: cap at 30s.
        pen => has('graceful_degradation') ? Math.min(30, pen) : pen,
        // Zero Variance: everything becomes exactly 45s (overrides all above).
        pen => has('keystone_zero_variance') ? 45 : pen,
    ];

    //--------------------------------------------------------------------------
    //--------------------------HOOK REGISTRATIONS------------------------------
    //--------------------------------------------------------------------------

    const ON_START = [];
    const ON_FILL = [];
    const ON_MISTAKE = [];
    const ON_LUCKY_CLAIM = [];
    const ON_ITEM_USE = [];
    const ON_LINE_DONE = [];
    const TICKS = [];

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
            cur.grid[r][c] === 0 && userGrid[r][c] === 0 &&
            ORTHO.some(([dr, dc]) => inGrid(r + dr, c + dc) && revealedGrid[r + dr][c + dc]));
        if (target && markAt(target[0], target[1])) toast('📶 Shannon Bound');
    });

    ON_START.push(() => {   // Mutual Information (314)
        if (!has('mutual_information')) return;
        const target = randomCell((r, c) =>
            cur.grid[r][c] === 1 && userGrid[r][c] !== 1 && !revealedGrid[r][c] &&
            (rowHasRevealed(r) || colHasRevealed(c)));
        if (target) { revealAt(target[0], target[1]); toast('🔗 Mutual Information'); }
        else revealTiles(1);
    });

    function rowHasRevealed(r) {
        for (let c = 0; c < cur.grid[0].length; c++) if (revealedGrid[r][c]) return true;
        return false;
    }
    function colHasRevealed(c) {
        for (let r = 0; r < cur.grid.length; r++) if (revealedGrid[r][c]) return true;
        return false;
    }

    // Shadow cluster -------------------------------------------------------------

    ON_START.push(() => {   // Umbral Survey (337)
        if (!has('umbral_survey')) return;
        const rows = cur.grid.length, cols = cur.grid[0].length;
        const midR = Math.floor(rows / 2), midC = Math.floor(cols / 2);
        const quads = [
            [0, midR, 0, midC], [0, midR, midC, cols],
            [midR, rows, 0, midC], [midR, rows, midC, cols],
        ];
        let marked = 0;
        quads.forEach(([r0, r1, c0, c1]) => {
            const cell = randomCell((r, c) =>
                r >= r0 && r < r1 && c >= c0 && c < c1 &&
                cur.grid[r][c] === 0 && userGrid[r][c] === 0);
            if (cell && markAt(cell[0], cell[1])) marked++;
        });
        if (marked) toast('🌑 Umbral Survey');
    });

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
        if (typeof STATE !== 'undefined') {
            if (STATE.ptxSavingsReveals > 0) { pending += STATE.ptxSavingsReveals; STATE.ptxSavingsReveals = 0; }
            if (STATE.ptxColdReading) { pending += 1; STATE.ptxColdReading = false; }
        }
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

    //--------------------------------------------------------------------------
    //------------------------------FILL HOOKS----------------------------------
    //--------------------------------------------------------------------------

    ON_FILL.push((r, c) => {   // Dialectic (310)
        if (has('dialectic') && S.dialecticArmed) {
            S.dialecticArmed = false;
            addSecs(5);
            toast('🧠 Dialectic +5s');
        }
    });

    ON_FILL.push(() => {   // Regression to Mean (359)
        if (has('regression_to_mean') && S.regFills > 0) {
            S.regFills--;
            addSecs(4);
        }
    });

    ON_FILL.push(() => {   // Brownian Ratchet (320)
        if (has('brownian_ratchet') && S.ratchetFills > 0) {
            S.ratchetFills--;
            addSecs(3);
        }
    });

    ON_FILL.push((r, c) => {   // Channel Capacity (315)
        if (!has('channel_capacity')) return;
        const row = lineFillStats(r, true);
        const col = lineFillStats(c, false);
        const ok = (st) => st.total > 0 && st.filled / st.total < 0.25;
        if (ok(row) || ok(col)) addSecs(1);
    });

    ON_FILL.push(() => {   // Coding Theory (316) & Gnostic Echo (311) & Serendipity Seed (384)
        S.fillCount++;
        if (has('coding_theory') && S.fillCount % 20 === 0) {
            revealTiles(1);
            toast('🧮 Coding Theory');
        }
        if (has('gnostic_echo') && S.fillCount % 10 === 0 && Math.random() < 0.15) {
            revealTiles(1);
            toast('🔁 Gnostic Echo');
        }
        if (has('serendipity_seed') && S.fillCount === 1 && roll(0.25, false)) {
            revealTiles(1);
            toast('🌰 Serendipity Seed');
        }
    });

    ON_FILL.push((r, c) => {   // Butterfly Effect keystone (336)
        if (!has('keystone_butterfly_effect') || Math.random() >= 0.10) return;
        let n = 0;
        for (const [dr, dc] of ORTHO) {
            if (n >= 3) break;
            const nr = r + dr, nc = c + dc;
            if (inGrid(nr, nc) && revealAt(nr, nc)) n++;
        }
        if (n > 0) toast('🦋 Butterfly Effect');
    });

    //--------------------------------------------------------------------------
    //-----------------------------MISTAKE HOOKS--------------------------------
    //--------------------------------------------------------------------------

    ON_MISTAKE.push(() => {   // Martingale keystone (322)
        if (!has('keystone_martingale')) return;
        S.martingaleStake = Math.min(480, S.martingaleStake * 2);
        toast(`🎰 Martingale stake raised to ${S.martingaleStake}s`);
    });

    ON_MISTAKE.push(() => {   // Brownian Ratchet stacks (320)
        if (!has('brownian_ratchet')) return;
        S.ratchetStacks++;
        if (S.ratchetStacks % 3 === 0) {
            S.ratchetFills = 3;
            toast('⚙️ Brownian Ratchet armed: next 3 fills +3s each');
        }
    });

    ON_MISTAKE.push(() => {   // Chaos Buffer (335)
        if (!has('chaos_buffer')) return;
        S.chaosMistakes++;
        if (S.chaosMistakes % 2 === 0) { addSecs(10); toast('🌪️ Chaos Buffer +10s'); }
    });

    ON_MISTAKE.push(() => {   // Dialectic arm (310)
        if (has('dialectic')) S.dialecticArmed = true;
    });

    ON_MISTAKE.push(() => {   // Regression to Mean arm (359)
        if (has('regression_to_mean')) S.regFills = 5;
    });

    ON_MISTAKE.push((r, c) => {   // Markov Blanket (319)
        if (!has('markov_blanket')) return;
        let n = 0;
        for (const [dr, dc] of ORTHO) {
            const nr = r + dr, nc = c + dc;
            if (inGrid(nr, nc) && markAt(nr, nc)) n++;
        }
        if (n > 0) toast('🛡️ Markov Blanket');
    });

    ON_MISTAKE.push(() => {   // Risk Auditor refund (329)
        if (!has('risk_auditor') || Math.random() >= 0.20) return;
        const last = window._ptxLastPen || 0;
        if (last > 0) {
            const refund = Math.ceil(last / 2);
            addSecs(refund);
            toast(`🧾 Risk Auditor refunded ${refund}s`);
        }
    });

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
            addSecs(S.martingaleStake);
            toast(`🎰 Martingale pays out ${S.martingaleStake}s`);
        }
        S.martingaleStake = 15;
    });

    ON_LINE_DONE.push(() => {   // Perpetual Frost keystone (333)
        if (has('keystone_perpetual_frost')) freeze(8000);
    });

    ON_LINE_DONE.push(() => {   // Midas Path (325)
        if (has('midas_path') && Math.random() < 0.10) {
            window._ptxDoubleNextReveal = true;
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
    });

    //--------------------------------------------------------------------------
    //-----------------------------TICK SYSTEMS---------------------------------
    //--------------------------------------------------------------------------

    TICKS.push(() => {   // Tailwind keystone (350)
        if (has('keystone_tailwind') && S.tick % 60 === 0) { addSecs(10); toast('🪁 Tailwind +10s'); }
    });

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
        const cell = randomCell((r, c) => cur.grid[r][c] === 1 && userGrid[r][c] !== 1 && !revealedGrid[r][c]);
        if (!cell) return;
        const [r, c] = cell;
        const prev = userGrid[r][c];
        userGrid[r][c] = 1;
        renderCell(r, c);
        setTimeout(() => {
            if (!cur) return;
            if (userGrid[r][c] === 1 && !revealedGrid[r][c]) {
                userGrid[r][c] = prev;
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

        const frac = timerSecs / baseTime();

        if (has('hypothesis_testing')) {
            if (!S.hypo75 && frac <= 0.75) { S.hypo75 = true; revealTiles(1); toast('📐 Hypothesis Test: reveal'); }
            if (!S.hypo50 && frac <= 0.50) { S.hypo50 = true; markWrongTiles(1); toast('📐 Hypothesis Test: mark'); }
        }

        if (has('expected_shortfall') && !S.shortfallUsed && frac <= 0.5) {
            S.shortfallUsed = true;
            addSecs(45);
            toast('📉 Expected Shortfall +45s');
        }

        if (has('stationary_state') && !S.stationaryUsed && timerSecs > 0 && timerSecs < 60) {
            S.stationaryUsed = true;
            freeze(15000);
            toast('⏸️ Stationary State: frozen 15s');
        }

        if (has('keystone_axiom_of_choice') && !S.axiomUsed && frac <= 0.25) {
            S.axiomUsed = true;
            let remaining = 0;
            for (let r = 0; r < cur.grid.length; r++)
                for (let c = 0; c < cur.grid[0].length; c++)
                    if (cur.grid[r][c] === 1 && userGrid[r][c] !== 1 && !revealedGrid[r][c]) remaining++;
            const n = Math.ceil(remaining * 0.05);
            if (n > 0) { revealTiles(n); toast(`🎲 Axiom of Choice: ${n} cells revealed`); }
        }
    });

    TICKS.push(() => {   // Power Analysis (369): second Emergency Scan at ≤2 minutes
        if (!has('power_analysis') || !has('emergency_scan_1')) return;
        if (!window._emergencyScanFired || S.powerScan2Fired) return;
        if (timerSecs > 120 || timerSecs <= 0) return;
        S.powerScan2Fired = true;
        const fullSize = Math.max(cur.grid.length, cur.grid[0].length);
        _executeFieldScan(Math.floor(cur.grid.length / 2), Math.floor(cur.grid[0].length / 2), fullSize, _calcEmergencyScanDuration());
        toast('💪 Power Analysis: scan re-fired');
    });

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
        if (has('supply_chain')) window._ptxSupplyStacks = Math.min(3, (window._ptxSupplyStacks || 0) + 1);
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

    function applyKolmogorov() {
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

    function applyUniformPrior() {
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

        toast('❔ Uniform Prior: clues scrambled — solve lines to restore them');
    }

    function shuffleArr(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function applyNightfall() {
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
        toast('🌃 Nightfall Protocol: clues hidden for 2 minutes');

        setTimeout(() => {
            if (!cur || !S.clueOriginals) return;
            for (const r of Object.keys(S.clueOriginals.rows)) writeLineSpans('row', Number(r), S.clueOriginals.rows[r]);
            for (const c of Object.keys(S.clueOriginals.cols)) writeLineSpans('col', Number(c), S.clueOriginals.cols[c]);
            S.clueOriginals = null;
            revealTiles(3);
            toast('🌅 Night lifts — clues restored, 3 reveals granted');
        }, 120000);
    }

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
        window._ptxRecallLeft = has('ergodic_recall') ? 3 : 0;
        window._ptxSupplyStacks = 0;
        window._ptxDoubleNextReveal = false;
        const result = orig(...args);
        setTimeout(() => {
            snapshotLines();
            runClueFX();
        }, 80);
        return result;
    });

    function runClueFX() {
        if (!cur || dead) return;
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
        // Do not gate this patch behind _egSuppressEncounterStop — that flag
        // preserves timer/HP across chain puzzles but reveal/mark passives
        // (skyward_survey, entropy_observer, etc.) intentionally re-roll
        // per puzzle. See _egTransitionToChainPuzzle hardening.
        return result;
    });

    // ---- Start-time bonuses -------------------------------------------------------

    patch('_initTimer', function (orig, args) {
        const result = orig(...args);
        if (window._egSuppressEncounterStop || !cur) return result;

        const FLATS = [
            ['wind_tunnel', 10], ['jet_stream', 15], ['cum_laude', 25],
            ['tick_tock_talent', 20], ['second_hand', 30], ['hourglass_doctrine', 45],
            ['midnight_oil', 20], ['tenure', 15],
        ];
        let add = 0;
        FLATS.forEach(([key, val]) => { if (has(key)) add += val; });

        if (typeof STATE !== 'undefined' && STATE.ptxSavingsSecs > 0) {
            add += STATE.ptxSavingsSecs;
            STATE.ptxSavingsSecs = 0;
        }

        if (add > 0) timerSecs += add;

        // Scholar's Debt keystone: double total starting time.
        if (has('keystone_scholars_debt')) timerSecs += timerSecs;

        window._ptxBaseTime = timerSecs;
        updTimer();
        return result;
    });

    // ---- Penalty pipeline ------------------------------------------------------------

    patch('_calcEffectivePenalty', function (orig, args) {
        let pen = orig(...args);
        for (const mod of PENALTY_MODS) pen = mod(pen);
        window._ptxLastPen = pen;
        return pen;
    });

    patch('applyPenalty', function (orig, args) {
        const before = mistakeCount;
        const result = orig(...args);
        const counted = mistakeCount > before;
        if (counted && cur && !dead) {
            if (has('drift_correction')) S.driftMistakes++;
            ON_MISTAKE.forEach(fn => { try { fn(args[0], args[1]); } catch (e) { /* ignore */ } });
        }
        return result;
    });

    // ---- Correct-fill hooks -------------------------------------------------------------

    patch('fireCorrectFillHooks', function (orig, args) {
        const result = orig(...args);
        if (cur && !dead) {
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
        else if (rowDone) S.rowsPrimed.add(row);
        if (colDone && !colWasDone) fireIfNewlyDone('col', col, false);
        else if (colDone) S.colsPrimed.add(col);

        return result;
    });

    // ---- Timer tick systems -------------------------------------------------------------------

    let tickInterval = null;

    function startTickLoop() {
        stopTickLoop();
        tickInterval = setInterval(() => {
            if (!cur || dead) return;
            if (timerFrozen) return;
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
        if (cur && !dead) {
            ON_LUCKY_CLAIM.forEach(fn => { try { fn(args[0], args[1]); } catch (e) { /* ignore */ } });
        }
        return result;
    });

    patch('_calcLuckyTileCount', function (orig, args) {
        const [isLarge, isMassive, isLargeOrMassive] = args;
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
        if (value === 2 && !S.typeIUsed && has('keystone_type_i_error') && cur && !dead) {
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
        if (cur && !dead) {
            ON_ITEM_USE.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
        }
        return result;
    });

    // ---- Shield / CI absorption hooks --------------------------------------------------------------------

    patch('tryAbsorbWithShield', function (orig, args) {
        const result = orig(...args);
        if (result === true && cur && !dead) {
            if (has('glyph_ward')) { addSecs(15); toast('🔱 Glyph Ward +15s'); }
            if (has('symmetric_shield')) { markWrongTiles(2); toast('🪞 Symmetric Shield'); }
        }
        return result;
    });

    patch('tryAbsorbWithConfidenceInterval', function (orig, args) {
        const result = orig(...args);
        if (result === true && cur && !dead && has('asymptotic_freedom')) {
            addSecs(15);
            toast('🕊️ Asymptotic Freedom +15s');
        }
        return result;
    });

    // ---- Law of Large Numbers synergy (341) ------------------------------------------------------------

    patch('_triggerLawOfLargeNumbers', function (orig, args) {
        const result = orig(...args);
        if (cur && !dead && has('limit_theorem') && has('keystone_law_of_large_numbers')) {
            addSecs(5);
            toast('📈 Limit Theorem +5s');
        }
        return result;
    });

    // ---- Streak threshold reduction (334) ----------------------------------------------------------------

    patch('checkStreakBonus', function (orig, args) {
        if (has('truly_large_numbers') && typeof _streakBonusFills !== 'undefined' && _streakBonusFills === 9) {
            _streakBonusFills = 14;   // the upcoming fill becomes #10 and hits the hardcoded >=15 trigger
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
                if (sol[r][c] === 1 && (userGrid[r][c] === 1 || revealedGrid[r][c])) playerFilled++;

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
        showToast(`🧭 ${t('cg_dead_reckoning')} (15%)`);
    });

    // ---- Tutor auto-answer boost (392) ---------------------------------------------------------------------

    patch('_quizCalcTutorSuccessChance', function (orig, args) {
        const chance = orig(...args);
        return has('honorary_degree') ? chance + 0.10 : chance;
    });

    // ---- Win banking (Hour Vault 387 / Compound Interest 388 / Safety Deposit 389 / Cold Reading 365) -------

    patch('checkWin', function (orig, args) {
        const result = orig(...args);
        if (S.bankedThisLevel || typeof STATE === 'undefined') return result;
        const ov = document.getElementById('ov-win');
        if (!ov || !ov.classList.contains('show')) return result;
        S.bankedThisLevel = true;

        if (has('hour_vault') && timerSecs > 300) {
            const cap = has('safety_deposit') ? 240 : 120;
            const amount = Math.min(cap, Math.round(timerSecs * 0.10));
            STATE.ptxSavingsSecs = Math.min(cap, (STATE.ptxSavingsSecs || 0) + amount);
            if (amount > 0) toast(`🏦 Hour Vault: banked ${amount}s for next level`);
        }
        if (has('compound_interest')) STATE.ptxSavingsReveals = Math.max(1, STATE.ptxSavingsReveals || 0);
        if (has('safety_deposit')) STATE.ptxSavingsReveals = Math.max(2, STATE.ptxSavingsReveals || 0);
        if (has('cold_reading') && mistakeCount >= 3) STATE.ptxColdReading = true;

        save();
        return result;
    });

    // ---- Midas double-reveal plumbing (325) ------------------------------------------------------------------

    patch('revealTiles', function (orig, args) {
        if (window._ptxInPtxReveal) return orig(...args);   // no recursion through our own cascades
        let count = args[0];
        if (count > 0 && window._ptxDoubleNextReveal) {
            window._ptxDoubleNextReveal = false;
            count *= 2;
            window._ptxInPtxReveal = true;
            try { orig(count); } finally { window._ptxInPtxReveal = false; }
            return;
        }
        const result = orig(...args);

        // Wavefunction Spread (346) + Law of Total Probability (394) post-reveal procs
        // revealTiles returns [{row, col}, ...]
        if (Array.isArray(result) && result.length > 0 && cur && !dead) {
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
        if (Array.isArray(result) && result.length > 0 && cur && !dead && has('peripheral_vision')) {
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
        if (window._ptxInSwap) return revealAfterProcs(...args);
        const result = revealAfterProcs(...args);
        if (Array.isArray(result) && result.length > 0 && cur && !dead && ptHasSkill('variance_swap') && Math.random() < 0.10) {
            window._ptxInSwap = true;
            try { revealAfterProcs(result.length); toast('🎚️ Variance Swap: reveal doubled'); } finally { window._ptxInSwap = false; }
        }
        return result;
    };

})();
