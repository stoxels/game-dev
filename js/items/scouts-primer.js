//========================================================================
//  scouts-primer.js
//  Scout's Primer — pre-game bonus question chain that rewards the player
//  with pre-solved rows and columns before the nonogram starts.
//========================================================================


//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Maximum number of questions in a single primer chain.
const PRIMER_MAX = 5;

// The question object currently displayed in the primer modal.
let primerQuestion = null;

// How many questions the player has answered correctly in the current chain.
let primerStreak = 0;

// Colour palette used for cell-flare animations, indexed by streak tier.
// Tier 1 = blue, 2 = teal, 3 = orange, 4 = pink/purple, 5 = gold (perfect).
const PRIMER_TIER_COLOURS = ['#4fc3f7', '#26c6a6', '#ffa040', '#e040fb', '#ffd700'];

// Tutor item IDs, in ascending tier order (lowest tier consumed first).
const PRIMER_TUTOR_ITEM_ORDER = ['mistakeEraser', 'mistakeEraser4', 'mistakeEraser6', 'mistakeEraserAll'];

// Set of question strings already shown in the current primer chain.
// Cleared at the start of each new chain (streak === 0).
let primerUsedQuestions = new Set();

// Passive-tree bonus-row nodes: [skillId, chance, rowsGranted]. Each node rolls independently.
const PRIMER_ROW_BONUS_TABLE = [
    ['expanding_front', 0.500, 1],
    ['widened_formation', 0.250, 2],
    ['extended_horizon', 0.125, 3],
    ['total_coverage', 0.050, 4]
];

// Passive-tree bonus-column nodes: [skillId, chance, colsGranted]. Each node rolls independently.
const PRIMER_COL_BONUS_TABLE = [
    ['vertical_insight', 0.500, 1],
    ['rising_structure', 0.250, 2],
    ['elevated_scope', 0.125, 3],
    ['total_survey', 0.050, 4]
];


//------------------------------------------------------------------------
//-------------------QUESTION SELECTION-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds a normalised multiple-choice question object from a raw quiz pool entry.
// Shuffles the answer options and flags which one is correct.
function _primerBuildMultiChoiceQuestion(raw) {
    const q = (LANG === 'de' && raw.qDE) ? raw.qDE : raw.q;
    const opts = (LANG === 'de' && raw.optsDE) ? raw.optsDE : raw.opts;
    const optsWithFlag = opts.map((o, i) => ({ text: o, isCorrect: i === raw.correct }));
    shuffle(optsWithFlag);
    return { q, opts: optsWithFlag, isMultiChoice: true };
}

// Builds a normalised free-text (numeric) question object from a raw math-gate entry.
function _primerBuildNumericQuestion(raw) {
    const q = (LANG === 'de' && raw.qDE) ? raw.qDE : raw.q;
    return {
        q,
        answer: raw.answer,
        tolerance: raw.tolerance,
        unit: raw.unit || '',
        hintEn: raw.hintEn,
        hintDE: raw.hintDE,
        isMultiChoice: false
    };
}

// Picks a random question from the combined pool of quiz questions and math-gate
// questions (50/50 split). Returns a normalised question object ready for display.
function getPrimerQuestion() {
    const gateQs = Object.values(MATH_GATE_POOLS).flat();
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let raw, built;
        if (Math.random() < 0.5 && BONUS_QUIZ_POOLS.length) {
            raw = BONUS_QUIZ_POOLS[Math.floor(Math.random() * BONUS_QUIZ_POOLS.length)];
            built = _primerBuildMultiChoiceQuestion(raw);
        } else {
            raw = gateQs[Math.floor(Math.random() * gateQs.length)];
            built = _primerBuildNumericQuestion(raw);
        }

        if (!primerUsedQuestions.has(built.q)) {
            primerUsedQuestions.add(built.q);
            return built;
        }
    }

    // Fallback: pool too small, just return whatever (no infinite loop)
    const raw = gateQs[Math.floor(Math.random() * gateQs.length)];
    return _primerBuildNumericQuestion(raw);
}


//------------------------------------------------------------------------
//-------------------MODAL HTML BUILDERS----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// NOTE (flagged, not removed — see refactor summary "Suspected dead code"):
// the four helpers below (_primerBuildProgressLabel, _primerBuildStreakDots,
// _primerBuildFooterText, _primerBuildAnswerHtml) are not called by
// _primerBuildModalHtml or anywhere else in this file. _primerBuildModalHtml
// rebuilds equivalent markup inline using different CSS classes (qr-* instead
// of mg-*/quiz-*), so these look like leftovers from an earlier modal design.

// Returns the progress label string shown above the streak dots.
// e.g. "Question 2 of 5 — On correct answer: +1 row & +1 column pre-solved"
function _primerBuildProgressLabel(streak) {
    return t('itm_primer_progress_full')
        .replace('{n}', streak + 1)
        .replace('{m}', PRIMER_MAX);
}

// Returns HTML for the row of coloured dots showing current streak progress.
function _primerBuildStreakDots(streak) {
    return Array.from({ length: PRIMER_MAX }, (_, i) =>
        `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;margin:0 3px;` +
        `background:${i < streak ? 'var(--green)' : 'var(--border2)'}"></span>`
    ).join('');
}

// Returns HTML for the footer hint text at the bottom of the modal.
function _primerBuildFooterText(streak) {
    if (streak === 0) return t('itm_primer_footer_full_start');
    return t('itm_primer_footer_full_streak').replace('{n}', streak);
}

// Returns HTML for the answer area: multiple-choice option container or
// numeric input row, depending on the current question type.
function _primerBuildAnswerHtml(question) {
    if (question.isMultiChoice) {
        return `<div class="quiz-opts" id="primer-opts" style="margin-top:14px;"></div>`;
    }

    const unitLabel = question.unit
        ? `<span style="font-family:var(--PX);font-size:11px;color:#888;margin-left:6px;">${question.unit}</span>`
        : '';

    return `
        <div class="mg-answer-row" style="margin-top:14px;">
            <input type="text" id="primer-input" class="mg-input"
                placeholder="${t('mg_placeholder')}" autocomplete="off" />
            ${unitLabel}
            <button class="mg-submit-btn" onclick="submitPrimerAnswer()">
                ${t('mg_submit')}
            </button>
        </div>`;
}

// Assembles and returns the full inner HTML string for the primer modal box.
function _primerBuildModalHtml(question, streak) {
    const dots = Array.from({ length: PRIMER_MAX }, (_, i) =>
        `<span class="qr-primer-dot ${i < streak ? 'filled' : ''}"></span>`
    ).join('');

    const progressLabel = t('itm_primer_progress')
        .replace('{n}', streak + 1)
        .replace('{m}', PRIMER_MAX);

    const footerText = streak === 0
        ? t('itm_primer_footer_start')
        : t('itm_primer_footer_streak').replace('{n}', streak);

    const title = t('itm_primer_title');
    const skipLabel = t('itm_primer_skip');

    const answerHtml = question.isMultiChoice
        ? `<div class="qr-opts" id="primer-opts"></div>`
        : `<div class="qr-input-row">
               <div class="qr-input-wrap">
                   <input type="text" id="primer-input" class="qr-input"
                        placeholder="${t('mg_placeholder')}"
                        autocomplete="off" />
                </div>
                ${question.unit ? `<span class="qr-unit">${question.unit}</span>` : ''}
                <button class="qr-submit-btn" onclick="submitPrimerAnswer()">${t('mg_submit')}</button>
           </div>`;

    return `
        <div class="qr-panel" style="position:relative;">
            <div class="qr-portrait" id="primer-portrait"></div>

            <div class="qr-content">
                <div class="qr-title" style="color:#26c6a6; text-shadow:0 0 10px rgba(38,198,166,0.6);">
                    📜 ${title}
                </div>

                <div class="qr-primer-dots">${dots}</div>
                <div class="qr-primer-progress">${progressLabel}</div>

                <div class="qr-question" id="primer-question-text">${question.q}</div>

                ${answerHtml}

                <div class="qr-hint" id="primer-hint"></div>
                <div class="qr-result" id="primer-feedback"></div>

                <div class="qr-footer">
                    <button class="qr-btn qr-btn--tutor" id="primer-tutor-btn" onclick="primerUseTutor()" style="display:none;">
                        ${t('itm_tutor_btn')}
                    </button>
                    <button class="qr-btn qr-btn--skip" id="primer-skip-btn" onclick="skipPrimer()">
                        ${skipLabel}
                    </button>
                </div>

                <div class="qr-primer-progress">${footerText}</div>
            </div>
        </div>`;
}


//------------------------------------------------------------------------
//-------------------MODAL MULTIPLE-CHOICE SETUP--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Tries to auto-eliminate one wrong answer option via the passive tree.
// Marks the removed option as visually struck-through and disabled.
function _primerTryEliminateWrongOption(optsEl) {
    const elimChance = _quizCalcEliminationChance();
    if (elimChance <= 0 || Math.random() >= elimChance) return;

    const wrongBtns = Array.from(optsEl.children).filter(b => b.dataset.isCorrect !== '1');
    if (wrongBtns.length === 0) return;

    questStat_mcWrongAnswerEliminated();
    const toRemove = wrongBtns[Math.floor(Math.random() * wrongBtns.length)];
    toRemove.disabled = true;
    toRemove.style.opacity = '0.35';
    toRemove.style.textDecoration = 'line-through';
    toRemove.onclick = null;
}

// Creates and appends all option buttons into the MC options container,
// then applies the optional passive-tree wrong-answer elimination.
function _primerPopulateMultiChoiceOptions(optsEl) {
    primerQuestion.opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt';
        btn.textContent = opt.text;
        if (opt.isCorrect) btn.dataset.isCorrect = '1';
        btn.onclick = () => submitPrimerMCQ(opt.isCorrect, optsEl, btn);
        optsEl.appendChild(btn);
    });

    _primerTryEliminateWrongOption(optsEl);
}

// Attaches the Enter-key listener to the numeric input field,
// so the player can submit without clicking the button.
function _primerBindNumericInputEnterKey() {
    setTimeout(() => {
        const inp = document.getElementById('primer-input');
        if (inp) {
            inp.focus();
            inp.addEventListener('keydown', e => {
                if (e.key === 'Enter') submitPrimerAnswer();
            });
        }
    }, 100);
}


//------------------------------------------------------------------------
//-------------------SHOW & CLOSE MODAL-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds and injects the primer modal overlay into the DOM.
// The overlay is removed (not just hidden) when dismissed, so it is always
// freshly constructed for each question in the chain.
function showPrimerModal(streak = 0) {
    if (streak === 0) primerUsedQuestions = new Set();
    pauseTimer();
    primerStreak = streak;
    primerQuestion = getPrimerQuestion();

    const overlay = document.createElement('div');
    overlay.id = 'primer-overlay';
    overlay.className = 'modal-bg show';
    overlay.style.cssText = 'z-index:3000;';
    overlay.innerHTML = _primerBuildModalHtml(primerQuestion, streak);

    document.body.appendChild(overlay);

    // Inject character portrait
    const primerPortrait = document.getElementById('primer-portrait');
    if (primerPortrait && typeof _getPlayerCharacterImage === 'function') {
        primerPortrait.innerHTML = `<img src="${_getPlayerCharacterImage()}" alt="">`;
    }

    // Wire up interactive elements depending on question type
    if (primerQuestion.isMultiChoice) {
        const optsEl = document.getElementById('primer-opts');
        _primerPopulateMultiChoiceOptions(optsEl);
    } else {
        _primerBindNumericInputEnterKey();
    }

    _primerRefreshTutorButton();
}

// Removes the primer overlay from the DOM and resumes the game timer.
function closePrimerModal() {
    const el = document.getElementById('primer-overlay');
    if (el) el.remove();
    primerQuestion = null;
    if (typeof timerInterval !== 'undefined' && !dead) resumeTimer();
}


//------------------------------------------------------------------------
//-------------------ANSWER SUBMISSION------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Locks all MC option buttons, highlights the correct one (and the wrong
// clicked one if applicable), then passes the result to showPrimerResult.
function submitPrimerMCQ(correct, optsEl, clickedBtn) {
    // Remove all click handlers first to prevent double-submission
    Array.from(optsEl.children).forEach(btn => btn.onclick = null);

    // Apply correct / wrong visual states
    Array.from(optsEl.children).forEach(btn => {
        if (btn.dataset.isCorrect === '1') btn.classList.add('correct');
        else if (btn === clickedBtn && !correct) btn.classList.add('wrong');
    });

    showPrimerResult(correct);
}

// Tries to display a hint in the modal after a wrong numeric answer,
// but only if the passive tree has unlocked hint-on-first-failure.
function _primerTryShowHint() {
    const hintThreshold = mgCalcHintThreshold();
    // The primer allows only one attempt, so the threshold must be 1 or less
    if (hintThreshold === null || hintThreshold > 1) return;

    const hintBox = document.getElementById('primer-hint');
    const hint = (LANG === 'de' && primerQuestion.hintDE) ? primerQuestion.hintDE : primerQuestion.hintEn;
    hintBox.innerHTML = '💡 ' + hint;
    hintBox.style.display = 'block';
}

// Reads and validates the numeric input field, then passes the result to
// showPrimerResult. Displays an inline error if the input is not a number.
function submitPrimerAnswer() {
    const raw = (document.getElementById('primer-input').value || '').trim().replace(',', '.');
    const entered = parseFloat(raw);
    const fb = document.getElementById('primer-feedback');

    if (isNaN(entered)) {
        fb.className = 'mg-feedback mg-bad';
        fb.textContent = t('mg_not_a_number');
        return;
    }

    const correct = Math.abs(entered - primerQuestion.answer) <= primerQuestion.tolerance;
    if (!correct) _primerTryShowHint();

    showPrimerResult(correct);
}


//------------------------------------------------------------------------
//-------------------RESULT HANDLING--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Triggers the passive-tree bonus item roll for whichever question type just
// completed correctly (MC rewards use quiz nodes; numeric rewards use math-gate nodes).
function _primerRollBonusRewardForType() {
    if (primerQuestion.isMultiChoice) {
        _quizRollMcBonusItemReward();
    } else {
        mgRollPassiveTreeBonusReward();
    }
}

// Handles a correct answer at streak position newStreak.
// If the chain is complete, triggers the perfect reveal; otherwise chains to
// the next question.
function _primerHandleCorrectAnswer(fb, newStreak) {
    fb.className = 'mg-feedback mg-ok';
    _primerRollBonusRewardForType();
    Audio_Manager.playSFX('quizCorrect');
    trackAchStat('primerCorrect');
    updateQuestStats('questionCorrect', { source: 'primer' });

    if (newStreak >= PRIMER_MAX) {
        // All questions answered correctly — maximum headstart
        fb.textContent = t('itm_primer_perfect')
            .replace('{n}', newStreak)
            .replace('{m}', PRIMER_MAX);
        setTimeout(() => {
            closePrimerModal();
            setTimeout(() => applyPerfectPrimerReveal(), 50);
        }, 1000);
    } else {
        // More questions remain in the chain
        fb.textContent = t('itm_primer_correct_next')
            .replace('{n}', newStreak)
            .replace('{m}', PRIMER_MAX);
        setTimeout(() => {
            closePrimerModal();
            showPrimerModal(newStreak); // open next question with updated streak
        }, 900);
    }
}

// Handles a wrong answer. If the player built up any streak before this miss,
// that partial headstart is applied; otherwise the primer closes with nothing.
function _primerHandleWrongAnswer(fb) {
    fb.className = 'mg-feedback mg-bad';
    Audio_Manager.playSFX('quizWrong');

    if (primerStreak > 0) {
        fb.textContent = t('itm_primer_wrong_partial').replace('{n}', primerStreak);
        setTimeout(() => {
            closePrimerModal();
            applyPrimerHeadstart(primerStreak);
        }, 1800);
    } else {
        fb.textContent = t('itm_primer_wrong_none');
        setTimeout(closePrimerModal, 1800);
    }
}

// Central result dispatcher: hides the skip button, then routes to the
// correct/wrong handler based on the outcome of the just-submitted answer.
function showPrimerResult(correct) {
    const fb = document.getElementById('primer-feedback');
    const skipBtn = document.getElementById('primer-skip-btn');
    if (skipBtn) skipBtn.style.display = 'none';

    // Lock the numeric input immediately so repeated Enter presses
    // cannot re-submit the same (correct) answer and farm rewards.
    const inp = document.getElementById('primer-input');
    if (inp) inp.disabled = true;

    if (correct) {
        _primerHandleCorrectAnswer(fb, primerStreak + 1);
    } else {
        _primerHandleWrongAnswer(fb);
    }
}

// Called when the player presses the Skip button.
// Applies any partial headstart already earned, or simply closes if none.
function skipPrimer() {
    if (primerStreak > 0) {
        closePrimerModal();
        applyPrimerHeadstart(primerStreak);
    } else {
        closePrimerModal();
    }
}


//------------------------------------------------------------------------
//-------------------PASSIVE TREE — HEADSTART BONUSES---------------------
//------------------------------------------------------------------------
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
//------------------------------------------------------------------------

// Writes the headstart reveal into the live game state for a single cell and
// re-renders it. Filled cells (=1) in the solution are marked as correctly
// revealed; empty cells that are still blank are marked as crossed out (=2).
// Shared by the row-wise and column-wise reveal helpers below.
function _primerRevealCell(r, c, sol) {
    const wasRevealed = (sol[r][c] === 1) && !revealedGrid[r][c] && userGrid[r][c] !== 1;
    if (sol[r][c] === 1) { revealedGrid[r][c] = true; userGrid[r][c] = 1; }
    else if (userGrid[r][c] === 0) { userGrid[r][c] = 2; }
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
//------------------------------------------------------------------------

// Applies the pre-solve headstart for a partial streak (1–4 correct answers).
// Immediately updates game state for all target rows/columns, then plays a
// staggered per-cell flare animation sweep and a board-level glow.
// count: the number of correct answers that were given before the chain ended.
function applyPrimerHeadstart(count) {
    if (!cur || count <= 0) return;

    const sol = cur.grid;
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
        checkWin();
        if (dead) trackAchStat('primerSolvedAll');
        if (dead) updateQuestStats('primerFullSolve', {});
    }, totalDelay + 100);
}


//------------------------------------------------------------------------
//-------------------PERFECT REVEAL (5/5 STREAK)--------------------------
//------------------------------------------------------------------------
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
// questions correctly (5/5 streak).
//
// Execution order (important for correctness):
//   1. Game state is applied synchronously first, so renderCell() never
//      overwrites a flare that was just placed in the same frame.
//   2. Board glow and toast fire immediately.
//   3. Per-cell gold flares are staggered via setTimeout after state is set.
//   4. Win check runs after all animations finish.
function applyPerfectPrimerReveal() {
    if (!cur) return;

    const sol = cur.grid;
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
        checkWin();
        if (dead) trackAchStat('primerSolvedAll');
        if (dead) updateQuestStats('primerFullSolve', {});
    }, totalDelay + 300);
}


//------------------------------------------------------------------------
//-------------------TUTOR FEATURE (PASSIVE TREE)------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Counts how many tutor items (any tier of mistakeEraser) the player currently
// holds in their inventory.
function _primerCountTutorItems() {
    return STATE.inventory.filter(i =>
        i.defId === 'mistakeEraser' ||
        i.defId === 'mistakeEraser4' ||
        i.defId === 'mistakeEraser6' ||
        i.defId === 'mistakeEraserAll'
    ).length;
}

// Finds the lowest-tier available tutor item in the player's inventory,
// following the priority order defined in PRIMER_TUTOR_ITEM_ORDER.
// Returns the item object, or undefined if none is available.
function _primerFindLowestTierTutorItem() {
    return PRIMER_TUTOR_ITEM_ORDER
        .flatMap(id => STATE.inventory.filter(i => i.defId === id))
        .find(Boolean);
}

// Calculates the tutor's base + passive-tree-bonus success chance.
function _primerCalcTutorSuccessChance() {
    let chance = 0.10;
    if (PT.hasSkill('stochastics_tutor')) chance += 0.10;
    if (PT.hasSkill('statistics_tutor')) chance += 0.10;
    if (PT.hasSkill('maths_tutor')) chance += 0.10;
    if (PT.hasSkill('professor_tutor')) chance += 0.20;
    if (_charIs('trix')) chance += 0.10;
    return chance;
}

// Calculates the chance that a tutor item is NOT consumed on use.
// Passive tree nodes increase the no-consume chance.
function _primerCalcTutorNoConsumeChance() {
    let noConsumeChance = 0;
    if (PT.hasSkill('careful_study')) noConsumeChance += 0.10;
    if (PT.hasSkill('efficient_tutoring')) noConsumeChance += 0.15;
    if (PT.hasSkill('endless_instructions')) noConsumeChance += 0.20;
    if (PT.hasSkill('professor_tutor')) noConsumeChance += 0.20;
    return noConsumeChance;
}

// Consumes one tutor item from the inventory (removes it, saves, rebuilds UI).
function _primerConsumeTutorItem(item) {
    STATE.inventory = STATE.inventory.filter(i => i.uid !== item.uid);
    save();
    buildInventoryPanel();
}

// Locks the MC option buttons and visually highlights the correct answer
// after the tutor succeeds on a multiple-choice question.
function _primerTutorLockMultiChoice() {
    const optsEl = document.getElementById('primer-opts');
    if (!optsEl) return;
    Array.from(optsEl.children).forEach(btn => {
        btn.onclick = null;
        if (btn.dataset.isCorrect === '1') btn.classList.add('correct');
    });
}

// Disables the numeric input and submit button after the tutor succeeds
// on a free-text question.
function _primerTutorLockNumericInput() {
    const inp = document.getElementById('primer-input');
    if (inp) inp.disabled = true;
    document.querySelectorAll('#primer-overlay .mg-submit-btn:not(#primer-skip-btn):not(#primer-tutor-btn)')
        .forEach(b => b.disabled = true);
}

// Handles a successful tutor attempt: plays audio, shows feedback, locks the
// question UI, and chains to showPrimerResult(true).
function _primerHandleTutorSuccess(fb) {
    questStat_tutorAnsweredCorrect();
    Audio_Manager.playSFX('tutorSuccess');
    fb.className = 'mg-feedback mg-ok';
    fb.textContent = t('itm_tutor_success');

    if (primerQuestion.isMultiChoice) {
        _primerTutorLockMultiChoice();
    } else {
        _primerTutorLockNumericInput();
    }

    showPrimerResult(true);
}

// Handles a failed tutor attempt: plays audio and shows feedback.
// The question remains active so the player can still answer manually.
function _primerHandleTutorFailure(fb) {
    Audio_Manager.playSFX('tutorFail');
    fb.className = 'mg-feedback mg-bad';
    fb.textContent = t('itm_tutor_fail');
}

// Shows or hides the Tutor button based on whether the player has the
// tutor_enable passive skill and at least one tutor item in inventory.
function _primerRefreshTutorButton() {
    const btn = document.getElementById('primer-tutor-btn');
    if (!btn) return;

    const canUseTutor = PT.hasSkill('tutor_enable') || _charIs('trix');
    const tutorCount = _primerCountTutorItems();

    if (canUseTutor && tutorCount > 0) {
        btn.style.display = 'inline-block';
        btn.textContent = t('itm_ask_tutor').replace('{n}', tutorCount);
    } else {
        btn.style.display = 'none';
    }
}

// Called when the player clicks the Tutor button in the primer modal.
// Finds the lowest-tier available tutor item, rolls for consumption and
// success independently, then delegates to the success or failure handler.
// Reuses the same chance/no-consume mechanics as the math gate and quiz tutors.
function primerUseTutor() {
    if (!primerQuestion) return;

    const tutorItem = _primerFindLowestTierTutorItem();
    if (!tutorItem) return;

    const successChance = _primerCalcTutorSuccessChance();
    const noConsumeChance = _primerCalcTutorNoConsumeChance();

    // Roll consumption independently of success
    const consumed = Math.random() >= noConsumeChance;
    if (consumed) _primerConsumeTutorItem(tutorItem);

    // Hide the tutor button regardless of outcome
    const btn = document.getElementById('primer-tutor-btn');
    if (btn) btn.style.display = 'none';

    const fb = document.getElementById('primer-feedback');

    if (Math.random() < successChance) {
        _primerHandleTutorSuccess(fb);
    } else {
        _primerHandleTutorFailure(fb);
    }
}


//------------------------------------------------------------------------
//-------------------CSS ANIMATION INJECTION------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Injects all Scout's Primer animation styles into the document <head>.
// Runs immediately and is guarded so it only ever fires once per page load.
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


        /* ── Per-cell flare — shared base ───────────────────────────────── */
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