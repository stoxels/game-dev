//------------------------------------------------------------------------
//  scouts-primer.js - Scout's Primer question modal: pre-game bonus
//  question chain that rewards the player with pre-solved rows and columns.
//  Question pool, modal DOM, answer handling and the tutor live here;
//  the reveal engine (bonus roll, grid writes, flares, CSS) lives in
//  scouts-primer-reveal.js and is called when a chain ends.
//------------------------------------------------------------------------

import { trackAchStat } from '../../achievements/achievements.js';
import { Audio_Manager } from '../../audio/audio.js';
import { LANG, t } from '../../translation/translations.js';
import { PT } from '../../passive-tree/passive-tree.js';
import { questStat_mcWrongAnswerEliminated, questStat_tutorAnsweredCorrect, updateQuestStats } from '../../inference/inference-stats.js';
import { _refreshQuestionModalFlag } from '../../screens/screens.js';
import { save } from '../../state.js';
import { pauseTimer, resumeTimer } from '../../timer/timer.js';
import { buildInventoryPanel } from '../../puzzle-item-inventory/puzzle-item-inventory-panel.js';
import { PRIMER_MAX, applyPrimerHeadstart, applyPerfectPrimerReveal } from './scouts-primer-reveal.js';
import { shuffle } from '../../puzzle-mechanics/puzzle-helpers.js';
import { STATE } from '../../state.js';

//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------


// The question object currently displayed in the primer modal.
let primerQuestion = null;

// How many questions the player has answered correctly in the current chain.
let primerStreak = 0;


// Tutor item IDs, in ascending tier order (lowest tier consumed first).
const PRIMER_TUTOR_ITEM_ORDER = ['tutor', 'tutor4', 'tutor6', 'tutorAll'];

// Set of question strings already shown in the current primer chain.
// Cleared at the start of each new chain (streak === 0).
let primerUsedQuestions = new Set();




//------------------------------------------------------------------------
//-------------------QUESTION SELECTION-----------------------------------
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
    const gateQs = Object.values(globalThis.MATH_GATE_POOLS).flat();
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let raw, built;
        if (Math.random() < 0.5 && globalThis.BONUS_QUIZ_POOLS.length) {
            raw = globalThis.BONUS_QUIZ_POOLS[Math.floor(Math.random() * globalThis.BONUS_QUIZ_POOLS.length)];
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





// Assembles the full inner HTML for the primer modal: stone X close button
// (closing = skip, applying any earned headstart), tutor chip on the top-left
// gem, and an "n/m" counter chip - no bottom button row, no streak dots.
function _primerBuildModalHtml(question, streak) {
    const counterLabel = `${streak + 1}/${PRIMER_MAX}`;

    const title = t('itm_primer_title');

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
            <button class="qr-close-x" id="primer-skip-btn" aria-label="Close (skips primer)" onclick="skipPrimer()" data-t="reset_close">✕</button>
            <button class="qr-corner qr-corner--tl" id="primer-tutor-btn" style="display:none;" aria-label="Tutor" data-tip-t="qz_ask_tutor" onclick="primerUseTutor()">🎓</button>
            <div class="qr-counter" id="primer-counter">${counterLabel}</div>

            <div class="qr-portrait" id="primer-portrait"></div>

            <div class="qr-content">
                <div class="qr-title" style="color:#26c6a6; text-shadow:0 0 10px rgba(38,198,166,0.6);">
                    📜 ${title}
                </div>

                <div class="qr-question" id="primer-question-text">${question.q}</div>

                ${answerHtml}

                <div class="qr-hint" id="primer-hint"></div>
                <div class="qr-result" id="primer-feedback"></div>
            </div>
        </div>`;
}


//------------------------------------------------------------------------
//-------------------MODAL MULTIPLE-CHOICE SETUP--------------------------
//------------------------------------------------------------------------

// Tries to auto-eliminate one wrong answer option via the passive tree.
// Marks the removed option as visually struck-through and disabled.
function _primerTryEliminateWrongOption(optsEl) {
    const elimChance = globalThis._quizCalcEliminationChance();
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

// Builds and injects the primer modal overlay into the DOM.
// The overlay is removed (not just hidden) when dismissed, so it is always
// freshly constructed for each question in the chain.
export function showPrimerModal(streak = 0) {
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
    if (typeof _refreshQuestionModalFlag === 'function') _refreshQuestionModalFlag();

    // Inject character portrait
    const primerPortrait = document.getElementById('primer-portrait');
    if (primerPortrait && typeof _getPlayerCharacterImage === 'function') {
        primerPortrait.innerHTML = `<img src="${globalThis._getPlayerCharacterImage()}" alt="">`;
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
// Also hides any corner-chip tooltip left open by the cursor (the overlay
// is removed entirely, so the mouseout delegation on it dies with it).
function closePrimerModal() {
    const el = document.getElementById('primer-overlay');
    if (el) el.remove();
    if (typeof _refreshQuestionModalFlag === 'function') _refreshQuestionModalFlag();
    primerQuestion = null;
    if (typeof hideGameTooltip === 'function') globalThis.hideGameTooltip();
    if (typeof timerInterval !== 'undefined' && !globalThis.dead) resumeTimer();
}


//------------------------------------------------------------------------
//-------------------ANSWER SUBMISSION------------------------------------
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
    const hintThreshold = globalThis.mgCalcHintThreshold();
    // The primer allows only one attempt, so the threshold must be 1 or less
    if (hintThreshold === null || hintThreshold > 1) return;

    const hintBox = document.getElementById('primer-hint');
    const hint = (LANG === 'de' && primerQuestion.hintDE) ? primerQuestion.hintDE : primerQuestion.hintEn;
    hintBox.innerHTML = '💡 ' + hint;
    hintBox.style.display = 'block';
}

// Reads and validates the numeric input field, then passes the result to
// showPrimerResult. Displays an inline error if the input is not a number.
export function submitPrimerAnswer() {
    const raw = (document.getElementById('primer-input').value || '').trim().replace(',', '.');
    const entered = parseFloat(raw);
    const fb = document.getElementById('primer-feedback');

    if (isNaN(entered)) {
        fb.className = 'qr-result bad';
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

// Handles a correct answer at streak position newStreak. If the chain is
// complete, triggers the perfect reveal; otherwise chains to the next question.
function _primerHandleCorrectAnswer(fb, newStreak) {
    fb.className = 'qr-result ok';
    Audio_Manager.playSFX('quizCorrect');
    trackAchStat('primerCorrect');
    updateQuestStats('questionCorrect', { source: 'primer' });

    if (newStreak >= PRIMER_MAX) {
        // All questions answered correctly - maximum headstart
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
    fb.className = 'qr-result bad';
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

// Central result dispatcher: hides the skip/close button, then routes to the
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
export function skipPrimer() {
    if (primerStreak > 0) {
        closePrimerModal();
        applyPrimerHeadstart(primerStreak);
    } else {
        closePrimerModal();
    }
}


//------------------------------------------------------------------------

//-------------------TUTOR FEATURE (PASSIVE TREE)------------------------
//------------------------------------------------------------------------

// Counts how many tutor items (any tier of the Tutor family) the player
// currently holds in their inventory.
function _primerCountTutorItems() {
    return STATE.inventory.filter(i =>
        i.defId === 'tutor' ||
        i.defId === 'tutor4' ||
        i.defId === 'tutor6' ||
        i.defId === 'tutorAll'
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
    if (globalThis._charIs('trix')) chance += 0.10;
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
// Fills the correct answer (formatted via the question's tolerance, see
// mgFormatTutorAnswer in mathgate.js) before locking, so the player sees
// WHAT the tutor solved instead of just a "solved" message.
function _primerTutorLockNumericInput() {
    const inp = document.getElementById('primer-input');
    if (inp && primerQuestion) {
        const fill = (typeof mgFormatTutorAnswer === 'function') ? globalThis.mgFormatTutorAnswer(primerQuestion) : '';
        if (fill !== '') inp.value = fill;
    }
    if (inp) inp.disabled = true;
    document.querySelectorAll('#primer-overlay .mg-submit-btn:not(#primer-tutor-btn)')
        .forEach(b => b.disabled = true);
}

// Handles a successful tutor attempt: plays audio, shows feedback, locks the
// question UI, and chains to showPrimerResult(true).
function _primerHandleTutorSuccess(fb) {
    questStat_tutorAnsweredCorrect();
    Audio_Manager.playSFX('tutorSuccess');
    fb.className = 'qr-result ok';
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
    fb.className = 'qr-result bad';
    fb.textContent = t('itm_tutor_fail');
}

// Shows or hides the Tutor chip on the top-left corner gem. Mirrors the quiz
// modal: corner chip with 🎓 (📚 + unlimited uses when the super-tutor modifier
// is active), and the item-count detail lives in the hover tooltip, not the
// chip label.
function _primerRefreshTutorButton() {
    const btn = document.getElementById('primer-tutor-btn');
    if (!btn) return;

    const superTutorEnabled = !!(typeof curMods !== 'undefined' && globalThis.curMods.superTutor);
    const tutorCount = _primerCountTutorItems();
    const canUseTutor = superTutorEnabled || PT.hasSkill('tutor_enable') || globalThis._charIs('trix');

    if (canUseTutor && (superTutorEnabled || tutorCount > 0)) {
        btn.style.display = 'flex';
        btn.textContent = superTutorEnabled ? '📚' : '🎓';
        btn.dataset.tipT = superTutorEnabled ? 'qz_super_tutor' : 'qz_ask_tutor';
        btn.dataset.tipN = superTutorEnabled ? '' : tutorCount;
    } else {
        btn.style.display = 'none';
    }
}

// Called when the player clicks the Tutor chip in the primer modal.
// With the super-tutor modifier active it needs no inventory item and always
// succeeds; otherwise it finds the lowest-tier available tutor item, rolls
// for consumption and success independently, then delegates to the success
// or failure handler. Reuses the same mechanics as the math gate and quiz tutors.
export function primerUseTutor() {
    if (!primerQuestion) return;

    const superTutorEnabled = !!(typeof curMods !== 'undefined' && globalThis.curMods.superTutor);
    const tutorItem = superTutorEnabled ? null : _primerFindLowestTierTutorItem();
    if (!superTutorEnabled && !tutorItem) return;

    const successChance = superTutorEnabled ? 1 : _primerCalcTutorSuccessChance();
    const noConsumeChance = superTutorEnabled ? 1 : _primerCalcTutorNoConsumeChance();

    // Roll consumption independently of success
    const consumed = !superTutorEnabled && Math.random() >= noConsumeChance;
    if (consumed) _primerConsumeTutorItem(tutorItem);

    // Hide the tutor chip regardless of outcome
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

// Injects all Scout's Primer animation styles into the document <head>.
// Runs immediately and is guarded so it only ever fires once per page load.
