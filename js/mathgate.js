//------------------------------------------------------------------------
//----------------------------CONSTANTS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Tutor item IDs in ascending tier order (weakest → strongest).
// Used both when searching for the best available tutor item and when
// counting how many tutors the player owns.
const TUTOR_ITEM_IDS_2 = ['mistakeEraser', 'mistakeEraser4', 'mistakeEraser6', 'mistakeEraserAll'];

// Number of wrong attempts before the hint becomes visible.
// Can be reduced by passive tree nodes; never drops below 1.
const MG_HINT_BASE_THRESHOLD = 5;

// Number of wrong attempts before the "try a different question" button appears.
const MG_NEW_QUESTION_THRESHOLD = 5;

// All levels locked behind the Probability Gate, expressed as { world, level }
// pairs using 1-based indices. buildMathGateSet() converts these to gi values
// at runtime, skipping any that don't exist in the current world data.
const MATH_GATE_LEVELS = [
    { world: 1, level: 6 },
    { world: 2, level: 1 },
    { world: 2, level: 6 },
    { world: 3, level: 1 },
    { world: 3, level: 4 },
    { world: 3, level: 7 },
    { world: 3, level: 10 },
    { world: 4, level: 1 },
    { world: 4, level: 3 },
    { world: 4, level: 5 },
    { world: 4, level: 7 },
    { world: 4, level: 9 },
    { world: 4, level: 12 },
    { world: 4, level: 17}, 
    { world: 5, level: 1 },
    { world: 5, level: 4 },
    { world: 5, level: 8 },
    { world: 5, level: 10 },
    { world: 6, level: 1 },
    { world: 6, level: 3 },
    { world: 6, level: 5 },
    { world: 6, level: 7 },
    { world: 6, level: 9 },
    { world: 6, level: 12 },
    { world: 7, level: 1 },
    { world: 7, level: 3 },
    { world: 7, level: 5 },
    { world: 7, level: 7 },
    { world: 7, level: 9 },
    { world: 7, level: 11 },
    { world: 8, level: 1 },
    { world: 8, level: 3 },
    { world: 8, level: 5 },
    { world: 8, level: 7 },
    { world: 8, level: 9 },
    { world: 9, level: 1 },
    { world: 9, level: 3 },
    { world: 9, level: 5 },
    { world: 9, level: 7 },
    { world: 9, level: 9 },
    { world: 9, level: 11 },
    { world: 9, level: 13 }, 
    { world: 9, level: 16 },
    { world: 10, level: 1 },
    { world: 10, level: 4 },
    { world: 10, level: 6 },
    { world: 10, level: 9 },
    { world: 10, level: 11 },

];


//------------------------------------------------------------------------
//--------------------------------STATE-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// The gi that is waiting to be launched after a correct answer.
let pendingGateGi = null;

// The question object currently shown in the modal.
let currentGateQuestion = null;

// Number of wrong attempts on the current question in this session.
let gateAttempts = 0;

// Guard flag that prevents submitMathGate() from firing twice in rapid succession
// (e.g. from a double-click or a keyboard+button simultaneous trigger).
let mgIsSubmitting = false;

// The runtime Set of gated gi values, built once on load from MATH_GATE_LEVELS.
// Re-run buildMathGateSet() if world data changes at runtime.
let MATH_GATE_GI = buildMathGateSet();


//------------------------------------------------------------------------
//--------------------GATE SETUP & STATE QUERIES--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Converts MATH_GATE_LEVELS into a Set of gi values at runtime.
// Entries whose world or level doesn't exist yet are silently skipped,
// so it's safe to list future content in MATH_GATE_LEVELS.
// NOTE: WORLDS and WORLD_START_GI are 0-based; MATH_GATE_LEVELS is 1-based.
function buildMathGateSet() {
    const gatedGiSet = new Set();
    MATH_GATE_LEVELS.forEach(({ world, level }) => {
        const wi = world - 1;
        const worldData = WORLDS[wi];
        if (!worldData) return;                      // world doesn't exist yet
        if (level > worldData.data.length) return;   // level doesn't exist yet
        const gi = WORLD_START_GI[wi] + (level - 1);
        gatedGiSet.add(gi);
    });
    return gatedGiSet;
}

// Returns true if this gi requires passing a math gate before entry.
function isGatedLevel(gi) {
    return MATH_GATE_GI.has(gi);
}

// Returns true if the player has already passed the gate for this gi.
function isMathGatePassed(gi) {
    return (STATE.mathGatePassed ?? []).includes(gi);
}

// Persists a gate pass to STATE and saves to disk.
// Safe to call even if the gate was already marked as passed (no duplicate writes).
function mgMarkGatePassed(gi) {
    if (!STATE.mathGatePassed) STATE.mathGatePassed = [];
    if (!STATE.mathGatePassed.includes(gi)) {
        STATE.mathGatePassed.push(gi);
        save();
    }
}

// Returns which world number (1-based) a gi belongs to.
// Used to select the correct question pool for that world.
function worldOfGi(gi) {
    for (let wi = WORLDS.length - 1; wi >= 0; wi--) {
        if (WORLDS[wi].data.length > 0 && gi >= WORLD_START_GI[wi]) return wi + 1;
    }
    return 1;
}


//------------------------------------------------------------------------
//---------------------GATE ENTRY POINT-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Called by startLevel() before launching any level.
// If the level is not gated, or the gate is already passed, launches immediately.
// Otherwise stores the pending gi and opens the math gate modal.
function tryStartGatedLevel(gi, launchFn) {
    if (!isGatedLevel(gi) || isMathGatePassed(gi)) {
        launchFn();
        return;
    }
    pendingGateGi = gi;
    showMathGate(gi, launchFn);
}


//------------------------------------------------------------------------
//---------------QUESTION SELECTION & LOCALIZATION------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Returns the question pool for the world that the given gi belongs to.
// Falls back to world 1's pool if no pool is defined for that world.
function mgGetQuestionPool(gi) {
    const world = worldOfGi(gi);
    return MATH_GATE_POOLS[world] || MATH_GATE_POOLS[1];
}

// Returns a random question from the given pool.
function mgPickRandomQuestion(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
}

// Returns a random question that is different from the one currently shown.
// Prevents the same question appearing twice in a row when the player
// requests a new one after too many failed attempts.
function mgPickDifferentQuestion(pool) {
    let newQuestion;
    do {
        newQuestion = mgPickRandomQuestion(pool);
    } while (newQuestion === currentGateQuestion && pool.length > 1);
    return newQuestion;
}

// Returns the localized question text, falling back to English if no
// German translation exists.
function mgGetLocalizedQuestion(question) {
    return (LANG === 'de' && question.qDE) ? question.qDE : question.q;
}

// Returns the localized hint text, falling back to English if no
// German translation exists.
function mgGetLocalizedHint(question) {
    return (LANG === 'de' && question.hintDE) ? question.hintDE : question.hintEn;
}


//------------------------------------------------------------------------
//-------------------ANSWER PARSING & CHECKING----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Parses the raw answer input string into a float.
// Accepts both '.' and ',' as the decimal separator to support European locales.
// Returns NaN if the input cannot be parsed as a number.
function mgParseAnswer(rawInput) {
    const normalized = rawInput.trim().replace(',', '.');
    return parseFloat(normalized);
}

// Returns true if the entered value is within the question's accepted tolerance.
function mgIsAnswerCorrect(entered, question) {
    return Math.abs(entered - question.answer) <= question.tolerance;
}


//------------------------------------------------------------------------
//----------------------------------REWARDS-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Creates a new inventory entry for the given item definition ID,
// then saves state and rebuilds the inventory panel.
// Used as a shared helper by both mgGrantGateReward() and mgRollPassiveTreeBonusReward().
function mgAddItemToInventory(defId) {
    STATE.inventory.push({
        uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        defId: defId,
    });
    save();
    buildInventoryPanel();
}

// Awards a lucky item to the player for passing a gate for the first time.
// Shows feedback in the modal, a toast notification, and attaches a tooltip
// to the reward zone element.
function mgGrantGateReward(gi) {
    const rewardId = pickLuckyItem();
    if (!rewardId) { hideMathGate(); return; }

    const def = ITEM_DEFS[rewardId];
    mgAddItemToInventory(rewardId);

    const itemName = LANG === 'de' ? def.nameDE : def.nameEn;
    showMgFeedback(`${t('mg_correct')} + ${def.icon} ${itemName}!`, true);

    setTimeout(() => showToast('Probability Gate passed, Item reward received!'), 1000);

    // Attach the tooltip after the DOM has had a chance to update.
    setTimeout(() => {
        const rewardZoneEl = document.getElementById('mg-reward-zone');
        if (rewardZoneEl) attachItemTooltip(rewardZoneEl, rewardId);
    }, 0);
}

// Rolls for a bonus item drop based on the player's passive tree skills.
// Each relevant node adds to a combined chance pool that is rolled once.
// Does nothing in Ironman mode.
function mgRollPassiveTreeBonusReward() {
    if (curMods && curMods.ironman) return;

    let bonusChance = 0;
    if (PT.hasSkill('wisdom_through_failure')) bonusChance += 0.10;
    if (PT.hasSkill('promising_answers')) bonusChance += 0.20;
    if (PT.hasSkill('rewarding_insight')) bonusChance += 0.20;
    if (PT.hasSkill('scholars_fortune')) bonusChance += 0.20;
    if (PT.hasSkill('probability_gate_mastery')) bonusChance += 0.30;

    if (bonusChance <= 0) return;

    if (Math.random() < bonusChance) {
        const defId = pickRandomItem();
        if (!defId) return;
        const def = ITEM_DEFS[defId];
        if (!def) return;

        mgAddItemToInventory(defId);

        const name = LANG === 'de' ? def.nameDE : def.nameEn;
        showToast(`🎁 ${def.icon} ${name}`);
    }
}


//------------------------------------------------------------------------
//---------------------CORRECT ANSWER FLOW--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Handles everything that happens when the player submits a correct answer.
// On first pass: grants the gate reward (which shows its own feedback).
// On repeat passes: shows a simple correct feedback message.
// Always: marks the gate as passed, tracks stats, rolls for bonus drops,
// then closes the modal and launches the level after a short delay.
function mgHandleCorrectAnswer() {
    const gi = pendingGateGi;

    const isFirstPass = !isMathGatePassed(gi);
    if (isFirstPass) {
        mgGrantGateReward(gi);  // also shows feedback
    } else {
        showMgFeedback(t('mg_correct'), true);
    }

    mgMarkGatePassed(gi);
    document.getElementById('mg-submit-btn').disabled = true;

    trackAchStat('questionsCorrect');
    updateQuestStats('questionCorrect', { source: 'gate' });
    mgRollPassiveTreeBonusReward();

    Audio_Manager.playSFX('quizCorrect');

    if (typeof _egOnQuestionAnswered === 'function') _egOnQuestionAnswered();

    setTimeout(() => {
        hideMathGate();
        startLevel(gi);
    }, 1500);
}


//------------------------------------------------------------------------
//----------------------WRONG ANSWER FLOW---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Returns the attempt count at which the hint becomes visible, or null if
// the hint feature isn't available at all. Available either via the
// wisdom_through_failure passive node, or automatically for Syla (whose
// trait grants the hint feature for free, one attempt sooner than base).
// Reductions from tree nodes and the Syla trait stack additively; the
// result can reach 0, meaning the hint is shown immediately.
function mgCalcHintThreshold() {
    const hasTreeUnlock = PT.hasSkill('wisdom_through_failure');
    const isSyla = _charIs('syla');
    if (!hasTreeUnlock && !isSyla) return null;

    let threshold = MG_HINT_BASE_THRESHOLD;
    if (PT.hasSkill('quick_study')) threshold -= 1;
    if (PT.hasSkill('accelerated_insight')) threshold -= 1;
    if (PT.hasSkill('instant_comprehension')) threshold -= 1;
    if (PT.hasSkill('probability_gate_mastery')) threshold -= 1;
    if (isSyla) threshold -= 1;
    return Math.max(0, threshold);
}

// Reveals the hint for the current question inside the modal.
// Also tracks the hint-shown quest stat.
function mgShowHint() {
    const hint = mgGetLocalizedHint(currentGateQuestion);
    document.getElementById('mg-hint-text').textContent = '💡 ' + hint;
    document.getElementById('mg-hint-box').style.display = 'block';
    questStat_primerHintShown();
}

// Reveals the "try a different question" button in the modal.
function mgShowNewQuestionButton() {
    document.getElementById('mg-new-q-btn').style.display = 'inline-block';
}

// Handles everything that happens when the player submits a wrong answer.
// Increments the attempt counter, shows feedback, and conditionally reveals
// the hint and/or the new-question button based on attempt thresholds.
function mgHandleWrongAnswer() {
    gateAttempts++;
    trackAchStat('gateRejections');
    showMgFeedback(t('mg_wrong').replace('{n}', gateAttempts), false);

    const hintThreshold = mgCalcHintThreshold();
    if (hintThreshold !== null && gateAttempts >= hintThreshold) mgShowHint();
    if (gateAttempts >= MG_NEW_QUESTION_THRESHOLD) mgShowNewQuestionButton();

    Audio_Manager.playSFX('quizWrong');
}


//------------------------------------------------------------------------
//----------------------MODAL DOM HELPERS---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Writes the world badge text into the modal header element.
function mgPopulateWorldBadge(world) {

}

// Writes the current question's localized text into the modal question element.
function mgPopulateQuestion(question) {
    document.getElementById('mg-question').textContent = mgGetLocalizedQuestion(question);
}

// Updates the unit label displayed next to the answer input.
// Hides the label entirely if the question has no unit.
function mgSetUnitLabel(question) {
    const unitEl = document.getElementById('mg-unit');
    const unitText = question.unit ? t(question.unit) : '';
    unitEl.textContent = unitText;
    unitEl.style.display = question.unit ? 'inline' : 'none';
}

// Resets all interactive input area elements back to their initial state.
// Called both when opening the modal and when loading a replacement question.
function mgResetModalInputState() {
    const inputEl = document.getElementById('mg-answer-input');
    if (inputEl) {
        inputEl.value = '';
        inputEl.placeholder = t('mg_placeholder'); // re-set so translation stays current
    }

    const feedbackEl = document.getElementById('mg-feedback');
    feedbackEl.textContent = '';
    feedbackEl.className = 'mg-feedback';

    document.getElementById('mg-hint-box').style.display = 'none';
    document.getElementById('mg-hint-text').textContent = '';
    document.getElementById('mg-new-q-btn').style.display = 'none';
    document.getElementById('mg-submit-btn').disabled = false;
}

function _mgInjectPortrait() {
    const modalEl = document.getElementById('mg-modal');
    if (!modalEl) return;

    const old = modalEl.querySelector('.qr-portrait-wrap');
    if (old) old.remove();

    const imgSrc = (typeof _getPlayerCharacterImage === 'function')
        ? _getPlayerCharacterImage()
        : '';
    if (!imgSrc) return;

    const wrap = document.createElement('div');
    wrap.className = 'qr-portrait-wrap';
    wrap.innerHTML = `
        <div class="qr-portrait-medallion">
            <img src="${imgSrc}" alt="character">
        </div>
        <div class="qr-portrait-ledge"></div>
    `;

    const box = modalEl.querySelector('.modal-box');
    if (box) {
        box.style.position = 'relative'; // needed for absolute portrait
        box.prepend(wrap);
    }

    // Character-based accent
    const charColors = {
        stox: { accent: '#4fc3f7', glow: 'rgba(79,195,247,0.55)', crack: '#b06cff', crackGlow: 'rgba(176,108,255,0.6)' },
        trix: { accent: '#ce93d8', glow: 'rgba(206,147,216,0.55)', crack: '#ce93d8', crackGlow: 'rgba(206,147,216,0.5)' },
        syla: { accent: '#66bb6a', glow: 'rgba(102,187,106,0.55)', crack: '#26c6a6', crackGlow: 'rgba(38,198,166,0.5)' },
    };
    const c = charColors[STATE?.playerCharacter] || charColors.stox;
    if (box) {
        box.style.setProperty('--qr-accent', c.accent);
        box.style.setProperty('--qr-accent-glow', c.glow);
        box.style.setProperty('--qr-crack', c.crack);
        box.style.setProperty('--qr-crack-glow', c.crackGlow);
    }
}


// Opens the math gate modal for the given gi.
// Picks a random question from the appropriate world pool, populates all
// modal elements, then opens the modal and focuses the answer input.
function showMathGate(gi, launchFn) {
    const pool = mgGetQuestionPool(gi);
    currentGateQuestion = mgPickRandomQuestion(pool);
    gateAttempts = 0;

    // Store gi on the modal so the submit handler knows which level to launch.
    document.getElementById('mg-modal').dataset.launchGi = gi;

    //mgPopulateWorldBadge(worldOfGi(gi));
    mgPopulateQuestion(currentGateQuestion);
    mgResetModalInputState();
    mgSetUnitLabel(currentGateQuestion);
    showModal('mg-modal');
    // Inject character portrait
    const mgPortrait = document.getElementById('mg-portrait');
    if (mgPortrait && typeof _getPlayerCharacterImage === 'function') {
        mgPortrait.innerHTML = `<img src="${_getPlayerCharacterImage()}" alt="">`;
    }
    mgRefreshTutorButton();

    // Delay focus slightly to let the modal open animation complete.
    setTimeout(() => {
        const inputEl = document.getElementById('mg-answer-input');
        if (inputEl) inputEl.focus();
    }, 120);
}

// Closes the math gate modal and clears all module-level state.
function hideMathGate() {
    hideModal('mg-modal');
    currentGateQuestion = null;
    pendingGateGi = null;
}


//------------------------------------------------------------------------
//---------------------SUBMIT & NEW QUESTION------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Updates the feedback element with a success (green) or error (red) style.
function showMgFeedback(msg, ok) {
    const el = document.getElementById('mg-feedback');
    el.textContent = msg;
    el.className = 'mg-feedback ' + (ok ? 'mg-ok' : 'mg-bad');
}

// Called when the player submits an answer (via button click or Enter key).
// Guards against double-firing, validates the input, then delegates to the
// correct or wrong answer flow.
function submitMathGate() {
    if (!currentGateQuestion) return;
    if (mgIsSubmitting) return;

    mgIsSubmitting = true;
    setTimeout(() => { mgIsSubmitting = false; }, 100);

    const rawInput = document.getElementById('mg-answer-input').value;
    const entered = mgParseAnswer(rawInput);

    if (isNaN(entered)) {
        showMgFeedback(t('mg_not_a_number'), false);
        return;
    }

    if (mgIsAnswerCorrect(entered, currentGateQuestion)) {
        mgHandleCorrectAnswer();
    } else {
        mgHandleWrongAnswer();
    }
}

// Replaces the current question with a different one from the same pool.
// Resets all attempt state and re-focuses the input.
// Only becomes available to the player after MG_NEW_QUESTION_THRESHOLD failures.
function mgNewQuestion() {
    const pool = mgGetQuestionPool(pendingGateGi);
    currentGateQuestion = mgPickDifferentQuestion(pool);
    gateAttempts = 0;

    mgPopulateQuestion(currentGateQuestion);
    mgResetModalInputState();
    mgRefreshTutorButton();
    mgSetUnitLabel(currentGateQuestion);
    document.getElementById('mg-answer-input').focus();
}

// Wire up the Enter key on the answer input to trigger submission.
document.addEventListener('DOMContentLoaded', () => {
    const inputEl = document.getElementById('mg-answer-input');
    if (inputEl) {
        inputEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitMathGate();
            }
        });
    }
});


//------------------------------------------------------------------------
//--------------------TUTOR FEATURE (PASSIVE TREE)------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Returns the base success chance for the tutor, increased by passive skill nodes.
function mgCalcTutorChance() {
    let chance = 0.10;
    if (PT.hasSkill('stochastics_tutor')) chance += 0.10;
    if (PT.hasSkill('statistics_tutor')) chance += 0.10;
    if (PT.hasSkill('maths_tutor')) chance += 0.10;
    if (PT.hasSkill('professor_tutor')) chance += 0.20;
    if (_charIs('trix')) chance += 0.10;
    return chance;
}

// Returns the chance that the tutor item is NOT consumed after being used.
// A roll >= this value means the item is preserved.
function mgCalcNoConsumeChance() {
    let chance = 0;
    if (PT.hasSkill('careful_study')) chance += 0.10;
    if (PT.hasSkill('efficient_tutoring')) chance += 0.15;
    if (PT.hasSkill('endless_instructions')) chance += 0.20;
    if (PT.hasSkill('professor_tutor')) chance += 0.20;
    return chance;
}

// Removes the given tutor item from the player's inventory, then saves
// state and rebuilds the inventory panel.
function mgConsumeTutorItem(tutorItem) {
    STATE.inventory = STATE.inventory.filter(i => i.uid !== tutorItem.uid);
    save();
    buildInventoryPanel();
}

// Handles the outcome where the tutor successfully solves the question.
// Marks the gate as passed, disables the submit button, then launches
// the level after a short celebration delay.
function mgHandleTutorSuccess() {
    const gi = pendingGateGi;
    const msg = LANG === 'de' ? '🎓 Tutor hat die Frage gelöst!' : '🎓 Tutor solved it!';

    Audio_Manager.playSFX('tutorSuccess');
    showMgFeedback(msg, true);
    document.getElementById('mg-tutor-btn').style.display = 'none';
    document.getElementById('mg-submit-btn').disabled = true;

    mgMarkGatePassed(gi);
    questStat_tutorAnsweredCorrect();

    setTimeout(() => { hideMathGate(); startLevel(gi); }, 1200);
}

// Handles the outcome where the tutor fails to solve the question.
// Shows failure feedback and hides the tutor button for this attempt.
function mgHandleTutorFailure() {
    const msg = LANG === 'de'
        ? '🎓 Tutor konnte die Frage nicht lösen…'
        : '🎓 Tutor couldn\'t solve it…';

    Audio_Manager.playSFX('tutorFail');
    showMgFeedback(msg, false);
    document.getElementById('mg-tutor-btn').style.display = 'none';
}

// Refreshes the visibility and label of the Tutor button.
// The button is only shown when the player has both the passive skill
// unlocked AND at least one tutor item in their inventory.
// Called whenever the modal opens or a new question is loaded.
function mgRefreshTutorButton() {
    const btn = document.getElementById('mg-tutor-btn');
    if (!btn) return;

    const canUseTutor = PT.hasSkill('tutor_enable') || _charIs('trix');
    const tutorCount = STATE.inventory.filter(i => TUTOR_ITEM_IDS_2.includes(i.defId)).length;

    if (canUseTutor && tutorCount > 0) {
        btn.style.display = 'inline-block';
        btn.textContent = LANG === 'de'
            ? `🎓 Tutor um Hilfe bitten (${tutorCount})`
            : `🎓 Ask Tutor for Help (${tutorCount})`;
    } else {
        btn.style.display = 'none';
    }
}

// Entry point for the Tutor button click.
// Finds the best available tutor item (lowest tier first), rolls for
// consumption and success, then delegates to the success or failure handler.
function mgUseTutor() {
    if (!currentGateQuestion) return;

    // Find the lowest-tier tutor item the player currently owns.
    const tutorItem = TUTOR_ITEM_IDS_2
        .flatMap(id => STATE.inventory.filter(i => i.defId === id))
        .find(Boolean);
    if (!tutorItem) return;

    const tutorChance = mgCalcTutorChance();
    const noConsumeChance = mgCalcNoConsumeChance();

    // Consume the item unless the no-consume roll saves it.
    const isConsumed = Math.random() >= noConsumeChance;
    if (isConsumed) mgConsumeTutorItem(tutorItem);

    if (Math.random() < tutorChance) {
        mgHandleTutorSuccess();
    } else {
        mgHandleTutorFailure();
    }
}