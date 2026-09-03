//------------------------------------------------------------------------
//-------------------QUIZ MODULE - quiz.js--------------------------------
//------------------------------------------------------------------------
// Handles all quiz logic: question selection, overlay rendering,
// answer handling (MC + numeric input), reward/penalty resolution,
// the Tutor passive skill, and quiz lifecycle (open / finish / skip / close).
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------

// The active question object while the quiz overlay is open.
// Set by showQuiz(), cleared by closeQuiz().
let currentQuizQuestion = null;

// Timer handle for the (currently disabled) auto-finish countdown.
let _quizAutoFinishTimer = null;

// How many recently-shown questions to avoid repeating, per world.
const QUIZ_RECENT_HISTORY_SIZE = 10;

// Tracks the last N raw question objects shown per world: { [world]: [raw, raw, ...] }
const _quizRecentQuestions = {};

// Inventory item ids for every Tutor tier, in priority order (lowest tier first).
const TUTOR_ITEM_IDS2 = ['mistakeEraser', 'mistakeEraser4', 'mistakeEraser6', 'mistakeEraserAll'];


//------------------------------------------------------------------------
//-------------------PASSIVE TREE - CHANCE CALCULATIONS------------------
//------------------------------------------------------------------------
// These helpers compute additive stacking bonuses from the passive skill
// tree and are called at the moment they are needed, so they always
// reflect the player's current skills.
//------------------------------------------------------------------------

// Returns the total probability of auto-eliminating one wrong MC answer.
// Skills stack additively.
function _quizCalcEliminationChance() {
    let chance = 0;
    if (PT.hasSkill('predictive_intelligence')) chance += 0.10;
    if (PT.hasSkill('elimination_clue')) chance += 0.10;
    if (PT.hasSkill('narrowed_options')) chance += 0.20;
    if (PT.hasSkill('logical_deductions')) chance += 0.20;
    if (PT.hasSkill('multiple_choice_mastery')) chance += 0.40;
    if (_charIs('stox')) chance += 0.10;
    return chance;
}

// Returns the total probability of receiving a bonus item drop on a
// correct MC answer (passive-tree roll, separate from the base reward).
function _quizCalcMcBonusItemChance() {
    let chance = 0;
    if (PT.hasSkill('predictive_intelligence')) chance += 0.10;
    if (PT.hasSkill('bonus_acquisition')) chance += 0.10;
    if (PT.hasSkill('enhanced_rewards')) chance += 0.10;
    if (PT.hasSkill('overflowing_spoils')) chance += 0.10;
    if (PT.hasSkill('multiple_choice_mastery')) chance += 0.10;
    return chance;
}

// Returns the total success probability for the Tutor item.
// Base chance is 10 %; passive skills add on top.
function _quizCalcTutorSuccessChance() {
    let chance = 0.10;
    if (PT.hasSkill('stochastics_tutor')) chance += 0.10;
    if (PT.hasSkill('statistics_tutor')) chance += 0.10;
    if (PT.hasSkill('maths_tutor')) chance += 0.10;
    if (PT.hasSkill('professor_tutor')) chance += 0.20;
    if (_charIs('trix')) chance += 0.10;
    return chance;
}

// Returns the probability that using a Tutor item does NOT consume it.
function _quizCalcTutorNoConsumeChance() {
    let chance = 0;
    if (PT.hasSkill('careful_study')) chance += 0.10;
    if (PT.hasSkill('efficient_tutoring')) chance += 0.15;
    if (PT.hasSkill('endless_instructions')) chance += 0.20;
    if (PT.hasSkill('professor_tutor')) chance += 0.20;
    return chance;
}


//------------------------------------------------------------------------
//-------------------QUESTION POOL & SELECTION-----------------------------
//------------------------------------------------------------------------

// Builds a flat pool from the world-specific MC pool (BONUS_QUIZ_POOLS)
// and the math-gate input pool (MATH_GATE_POOLS) for the given world.
// Returns an array of tagged entries: { _src: 'mc_world'|'input', raw }.
function _quizBuildQuestionPool(worldNum) {
    const pool = [];

    if (worldNum && BONUS_QUIZ_POOLS[worldNum]) {
        BONUS_QUIZ_POOLS[worldNum].forEach(raw => pool.push({ _src: 'mc_world', raw }));
    }

    if (worldNum && MATH_GATE_POOLS[worldNum]) {
        MATH_GATE_POOLS[worldNum].forEach(raw => pool.push({ _src: 'input', raw }));
    }

    return pool;
}

// Converts a raw input-question entry into the normalised question object
// used by the rest of the quiz system.
function _quizBuildInputQuestion(raw) {
    return {
        type: 'input',
        q: (LANG === 'de' && raw.qDE) ? raw.qDE : raw.q,
        answer: raw.answer,
        tolerance: raw.tolerance ?? 0,
        unit: raw.unit || '',
        hintEn: raw.hintEn || '',
        hintDE: raw.hintDE || '',
        explain: raw.explain || '',
        explainDE: raw.explainDE || '',
    };
}

// Converts a raw MC entry into the normalised question object.
// Options are shuffled so the correct answer appears at a random position.
function _quizBuildMcQuestion(raw) {
    const q = (LANG === 'de' && raw.qDE) ? raw.qDE : raw.q;
    const opts = (LANG === 'de' && raw.optsDE) ? raw.optsDE : raw.opts;

    const optsWithFlag = opts.map((text, i) => ({ text, isCorrect: i === raw.correct }));
    shuffle(optsWithFlag);

    return {
        type: 'mc',
        q,
        opts: optsWithFlag,
        explain: raw.explain || '',
        explainDE: raw.explainDE || '',
    };
}

// Records a raw question object as "recently shown" for its world.
function _quizRecordShownQuestion(worldNum, rawQuestion) {
    if (!_quizRecentQuestions[worldNum]) _quizRecentQuestions[worldNum] = [];
    _quizRecentQuestions[worldNum].push(rawQuestion);
    if (_quizRecentQuestions[worldNum].length > QUIZ_RECENT_HISTORY_SIZE) {
        _quizRecentQuestions[worldNum].shift();
    }
}

// Picks a random question for the given world, avoiding recent repeats
// where possible. Returns a normalised question object (MC or input).
function getQuizQuestion(worldNum) {
    const pool = _quizBuildQuestionPool(worldNum);

    if (!pool.length) {
        return { type: 'mc', q: '?', opts: [{ text: '?', isCorrect: true }] };
    }

    // entry.raw is a stable reference into BONUS_QUIZ_POOLS / MATH_GATE_POOLS,
    // so it survives across calls even though `pool` itself is rebuilt each time.
    const recent = _quizRecentQuestions[worldNum] || [];
    const avoidSet = new Set(recent);
    let candidates = pool.filter(e => !avoidSet.has(e.raw));
    if (candidates.length === 0) candidates = pool;

    const entry = candidates[Math.floor(Math.random() * candidates.length)];
    _quizRecordShownQuestion(worldNum, entry.raw);

    return (entry._src === 'input')
        ? _quizBuildInputQuestion(entry.raw)
        : _quizBuildMcQuestion(entry.raw);
}


//------------------------------------------------------------------------
//-------------------OVERLAY DOM HELPERS----------------------------------
//------------------------------------------------------------------------
// Small focused helpers that each touch exactly one part of the overlay,
// making showQuiz() easy to read at a glance.
//------------------------------------------------------------------------

// Resets shared overlay elements to their default "clean slate" state
// before populating a new question.
function _quizResetOverlay() {
    document.getElementById('quiz-result').textContent = '';
    document.getElementById('quiz-continue').style.display = 'none';
    document.getElementById('quiz-opts').innerHTML = '';
}

// Hides the numeric-input row (used when rendering an MC question).
function _quizHideInputRow() {
    const inputRow = document.getElementById('quiz-input-row');
    const hintBox = document.getElementById('quiz-input-hint');

    if (inputRow) inputRow.style.display = 'none';

    hintBox.style.display = 'none';
    hintBox.textContent = '';
}

// Called after the MC buttons have been rendered.
// Eliminates a single wrong-answer button visually (red flash + shake before
// it fades out) and tracks the stat.
function _quizEliminateButton(btn) {
    // Inject the elimination keyframes once.
    if (!document.getElementById('quiz-eliminate-style')) {
        const style = document.createElement('style');
        style.id = 'quiz-eliminate-style';
        style.textContent = `
            @keyframes quiz-eliminate-flash {
                0%   { background: rgba(255, 80, 80, 0.65); transform: translateX(0); }
                20%  { transform: translateX(-5px); }
                40%  { transform: translateX(5px); }
                60%  { transform: translateX(-3px); }
                80%  { transform: translateX(3px); }
                100% { background: transparent; transform: translateX(0); }
            }
        `;
        document.head.appendChild(style);
    }

    btn.style.animation = 'quiz-eliminate-flash 0.6s ease-out forwards';
    setTimeout(() => {
        btn.disabled = true;
        btn.style.opacity = '0.35';
        btn.style.textDecoration = 'line-through';
        btn.onclick = null;
    }, 300);
    questStat_mcWrongAnswerEliminated();
}

// Converts a chance that may exceed 100% into a concrete removal count.
// e.g. 1.10 → 1 guaranteed removal, plus a 10% roll for a 2nd.
//      0.65 → 0 guaranteed, 65% roll for 1.
function _quizCalcEliminationCount(elimChance) {
    if (elimChance <= 0) return 0;
    const guaranteed = Math.floor(elimChance);
    const remainder = elimChance - guaranteed;
    const bonus = (remainder > 0 && Math.random() < remainder) ? 1 : 0;
    return guaranteed + bonus;
}

// Passive-tree: tries to visually strike through wrong answer(s).
// Called after the MC buttons have been rendered.
function _quizTryEliminateWrongAnswer() {
    const elimChance = _quizCalcEliminationChance();
    const count = _quizCalcEliminationCount(elimChance);
    if (count <= 0) return;

    const optsEl = document.getElementById('quiz-opts');
    const wrongBtns = Array.from(optsEl.children).filter(b => b.dataset.isCorrect !== '1');
    if (!wrongBtns.length) return;

    // Always leave at least one distractor standing, even at very high chances.
    const toRemove = Math.min(count, wrongBtns.length - 1);
    if (toRemove <= 0) return;

    shuffle(wrongBtns); // reuses the existing shuffle() helper (see _quizBuildMcQuestion)
    wrongBtns.slice(0, toRemove).forEach(_quizEliminateButton);
}

// Toggles the explanation text box open/closed.
function quizToggleExplain() {
    if (!currentQuizQuestion) return;
    const box = document.getElementById('quiz-explain');
    const text = (LANG === 'de' && currentQuizQuestion.explainDE)
        ? currentQuizQuestion.explainDE
        : currentQuizQuestion.explain;

    if (box.style.display === 'block') {
        box.style.display = 'none';
        return;
    }
    box.textContent = '💡 ' + text;
    box.style.display = 'block';
    questStat_primerHintShown && questStat_primerHintShown(); // optional: reuse existing stat, or drop this line
}

// Shows/hides the "Tell me why" button depending on whether the current
// question has an explanation available.
function _quizRefreshWhyButton() {
    const btn = document.getElementById('quiz-why-btn');
    const box = document.getElementById('quiz-explain');
    if (!btn) return;

    box.style.display = 'none';
    box.textContent = '';

    const hasExplain = currentQuizQuestion && (currentQuizQuestion.explain || currentQuizQuestion.explainDE);
    btn.style.display = hasExplain ? 'flex' : 'none';
    btn.onclick = quizToggleExplain;
}


//------------------------------------------------------------------------
//-------------------REWARD HELPERS---------------------------------------
//------------------------------------------------------------------------
// Individual helpers for each distinct reward path so _resolveQuizAnswer
// stays readable. Each helper handles exactly one reward scenario.
//------------------------------------------------------------------------

// Creates a styled item-reward element and appends it to the reward zone.
// Used by both the "first correct" and "already claimed" reward paths.
function _quizAppendItemRewardElement(def, defId, labelHtml) {
    const irz = document.getElementById('item-reward-zone');
    if (!irz) return;

    const rc = rarityColors(def.rarity);
    const rewardEl = document.createElement('div');
    rewardEl.className = 'item-reward';
    rewardEl.dataset.rewardDefid = defId;
    rewardEl.style.cssText = `border-color:${rc.border};color:${rc.color};margin-top:4px;cursor:default;`;
    rewardEl.innerHTML = labelHtml;

    irz.appendChild(rewardEl);
    attachItemTooltip(rewardEl, defId);
}

// Adds an item to STATE.inventory and triggers a UI rebuild.
function _quizAddItemToInventory(defId) {
    STATE.inventory.push({
        uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        defId,
    });
    save();
    buildInventoryPanel();
    showItemGainPopup(defId);
}

// Handles the "already claimed" correct-answer path:
// 15 % lucky-drop chance for a bonus item, no score awarded.
function _quizHandleAlreadyClaimedReward(resEl) {
    resEl.className = 'quiz-result ok';
    resEl.textContent = t('quiz_correct_claimed');

    if (curMods.ironman || Math.random() >= 0.15) return;

    const defId = pickRandomItem();
    if (!defId) return;
    const def = ITEM_DEFS[defId];
    if (!def) return;

    _quizAddItemToInventory(defId);
    _quizAppendItemRewardElement(
        def, defId,
        `${t('ov_lucky_drop')} ${def.icon} <strong>${itemName(def)}</strong>`
    );
}

// Handles the "first correct answer" path:
// awards +50 score, marks the bonus as claimed, and tries to give one item.
// Returns the display name of the rewarded item (or null if none given).
function _quizHandleFirstCorrectReward(resEl) {
    STATE.totalScore += 50;
    document.getElementById('sc-disp').textContent = STATE.totalScore;

    // Mark bonus as claimed regardless of Ironman mode or item availability
    STATE.bonusDone.push(cur.gIdx);
    // Re-check world aggregates — claiming this bonus may have completed
    // the "all bonuses in a world" achievement set.
    if (typeof checkWorldCompleteAch === 'function') checkWorldCompleteAch();

    let rewardItemName = null;

    if (!curMods.ironman) {
        const defId = pickRandomItem();
        if (defId) {
            const def = ITEM_DEFS[defId];
            if (def) {
                rewardItemName = `${def.icon} ${itemName(def)}`;
                _quizAddItemToInventory(defId);
                _quizAppendItemRewardElement(
                    def, defId,
                    `${t('ov_quiz_reward')}: ${def.icon} <strong>${itemName(def)}</strong>`
                );
            }
        }
    }

    // Show result message, including the item name if one was given
    resEl.className = 'quiz-result ok';
    resEl.textContent = rewardItemName
        ? t('qz_correct_item').replace('{item}', rewardItemName)
        : t('quiz_correct');

    save();
}

// Passive-tree bonus roll: independent item drop chance after any correct
// MC answer, layered on top of the base reward. Skipped in Ironman mode.
function _quizRollMcBonusItemReward() {
    if (curMods && curMods.ironman) return;

    const chance = _quizCalcMcBonusItemChance();
    if (chance <= 0 || Math.random() >= chance) return;

    const defId = pickRandomItem();
    if (!defId) return;
    const def = ITEM_DEFS[defId];
    if (!def) return;

    _quizAddItemToInventory(defId);

    // For this roll we write directly to innerHTML (legacy zone approach)
    const irz = document.getElementById('item-reward-zone');
    const rc = rarityColors(def.rarity);
    if (irz) {
        irz.innerHTML += `<div class="item-reward" style="border-color:${rc.border};color:${rc.color};margin-top:4px;">
            🎁 ${def.icon} <strong>${LANG === 'de' ? def.nameDE : def.nameEn}</strong>
        </div>`;
    }
}


//------------------------------------------------------------------------
//-------------------ANSWER RESOLUTION------------------------------------
//------------------------------------------------------------------------

// Central resolver called by all answer paths (MC, input, and tutor).
// Delegates reward/penalty logic to the helpers above, then updates
// the overlay controls to reflect the answered state.
function _resolveQuizAnswer(correct) {
    quizAnsweredCorrectly = correct;
    document.getElementById('quiz-tutor-btn').style.display = 'none';
    const resEl = document.getElementById('quiz-result');
    const isInterstitial = typeof window._egInterstitialDone === 'function';
    const quizAlreadyClaimed = STATE.bonusDone.includes(cur.gIdx);
    if (correct) {
        Audio_Manager.playSFX('quizCorrect');
        trackAchStat('questionsCorrect');
        updateQuestStats('questionCorrect', { source: 'quiz' });
        // Count toward map objectives
        if (isInterstitial) {
            if (typeof _egOnQuestionAnswered === 'function') _egOnQuestionAnswered();
            // Endgame reward: roll a temporary damage buff / life heal / mana restore
            if (typeof _egApplyQuizRewardBuff === 'function') _egApplyQuizRewardBuff();
            resEl.className = 'quiz-result ok';
            resEl.textContent = t('qz_correct_short');
        } else {
            if (quizAlreadyClaimed) {
                _quizHandleAlreadyClaimedReward(resEl);
            } else {
                _quizHandleFirstCorrectReward(resEl);
            }
            _quizRollMcBonusItemReward();
        }
    } else {
        resEl.className = 'quiz-result bad';
        resEl.textContent = t('quiz_wrong');
        Audio_Manager.playSFX('quizWrong');
        // Map mod: incorrect answers burn a share of maximum Life.
        if (isInterstitial && typeof _egOnQuizWrongAnswer === 'function') {
            _egOnQuizWrongAnswer();
        }
    }
    document.getElementById('quiz-continue').style.display = 'flex';
    _quizRefreshWhyButton();
}


//------------------------------------------------------------------------
//-------------------ANSWER HANDLING--------------------------------------
//------------------------------------------------------------------------
// Two separate entry points: one for MC clicks, one for input submission.
// Both resolve to _resolveQuizAnswer() once correctness is determined.
//------------------------------------------------------------------------

// Shows the localised hint text below the input field after a wrong answer.
function _quizShowInputHint() {
    const hint = (LANG === 'de' && currentQuizQuestion.hintDE)
        ? currentQuizQuestion.hintDE
        : currentQuizQuestion.hintEn;

    if (!hint) return;

    const hintBox = document.getElementById('quiz-input-hint');
    hintBox.textContent = '💡 ' + hint;
    hintBox.style.display = 'block';
}

// Locks all MC buttons after the player's click, highlights the correct
// answer (and the wrong click in red if applicable), then resolves.
// Called directly from each MC option button's onclick handler.
function answerQuiz(correct, optsEl, clickedBtn) {
    // Lock all buttons immediately to prevent double-clicks
    Array.from(optsEl.children).forEach(btn => btn.onclick = null);

    // Reveal correct answer; also flag the wrong button the player clicked
    Array.from(optsEl.children).forEach(btn => {
        if (btn.dataset.isCorrect === '1') {
            btn.classList.add('correct');
        } else if (btn === clickedBtn && !correct) {
            btn.classList.add('wrong');
        }
    });

    _resolveQuizAnswer(correct);
}

// Reads and validates the numeric input, shows a hint on a wrong answer,
// then resolves. Called from the submit button and the Enter-key handler.
function answerQuizInput() {
    if (!currentQuizQuestion || currentQuizQuestion.type !== 'input') return;

    const inputEl = document.getElementById('quiz-input');
    const resEl = document.getElementById('quiz-result');

    // Normalise decimal separator so both '.' and ',' are accepted
    const sanitised = (inputEl.value || '').trim().replace(',', '.');
    const entered = parseFloat(sanitised);

    if (isNaN(entered)) {
        resEl.className = 'quiz-result bad';
        resEl.textContent = t('qz_enter_number');
        return;
    }

    // Lock the input controls immediately
    inputEl.disabled = true;
    document.getElementById('quiz-input-submit').disabled = true;

    const correct = Math.abs(entered - currentQuizQuestion.answer) <= currentQuizQuestion.tolerance;

    if (!correct) {
        _quizShowInputHint();
    }

    _resolveQuizAnswer(correct);
}


//------------------------------------------------------------------------
//-------------------QUESTION RENDERING HELPERS----------------------------
//------------------------------------------------------------------------
// Wire the overlay's option buttons / input row to the answer handlers
// above. Kept separate from OVERLAY DOM HELPERS since they depend on
// answerQuiz() / answerQuizInput().
//------------------------------------------------------------------------

// Builds the MC option buttons and appends them to the options container.
function _quizRenderMcOptions(q) {
    const optsEl = document.getElementById('quiz-opts');

    q.opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt';
        btn.textContent = opt.text;
        if (opt.isCorrect) btn.dataset.isCorrect = '1';
        btn.onclick = () => answerQuiz(opt.isCorrect, optsEl, btn);
        optsEl.appendChild(btn);
    });
}

// Sets up the numeric-input row for an input-type question.
function _quizShowInputRow(q) {
    const inputRow = document.getElementById('quiz-input-row');
    const inputEl = document.getElementById('quiz-input');
    const unitEl = document.getElementById('quiz-input-unit');
    const hintBox = document.getElementById('quiz-input-hint');
    const submitBtn = document.getElementById('quiz-input-submit');

    inputRow.style.display = 'flex';
    inputEl.value = '';
    inputEl.disabled = false;

    unitEl.textContent = q.unit ? t(q.unit.toLowerCase()) : '';
    unitEl.style.display = q.unit ? 'inline' : 'none';

    hintBox.style.display = 'none';
    hintBox.textContent = '';

    // Allow submitting with the Enter key
    inputEl.onkeydown = e => { if (e.key === 'Enter') answerQuizInput(); };

    submitBtn.style.display = 'inline-block';
    submitBtn.disabled = false;
    submitBtn.onclick = answerQuizInput;
}


//------------------------------------------------------------------------
//-------------------TUTOR PASSIVE SKILL----------------------------------
//------------------------------------------------------------------------
// The Tutor item (multiple tiers) lets the player spend an inventory item
// for a chance to have the question answered automatically.
// The passive tree improves the success rate and may prevent item consumption.
//------------------------------------------------------------------------

// Returns the first available Tutor item from inventory, checking all
// tiers in priority order (lowest tier first).
function _quizGetTutorItem() {
    return TUTOR_ITEM_IDS2
        .flatMap(id => STATE.inventory.filter(i => i.defId === id))
        .find(Boolean) ?? null;
}

// Counts all Tutor items across every tier in the player's inventory.
function _quizCountTutorItems() {
    return STATE.inventory.filter(i => TUTOR_ITEM_IDS2.includes(i.defId)).length;
}

// Removes the given Tutor item from inventory and persists the change.
function _quizConsumeTutorItem(tutorItem) {
    STATE.inventory = STATE.inventory.filter(i => i.uid !== tutorItem.uid);
    save();
    buildInventoryPanel();
}

// Locks the current MC question's buttons and highlights the correct answer.
// Called when the Tutor succeeds on an MC question.
function _quizTutorRevealMcAnswer() {
    const optsEl = document.getElementById('quiz-opts');
    Array.from(optsEl.children).forEach(btn => {
        btn.onclick = null;
        if (btn.dataset.isCorrect === '1') btn.classList.add('correct');
    });
    questStat_tutorAnsweredCorrect();
}

// Locks the numeric-input controls.
// Called when the Tutor succeeds on an input question.
function _quizTutorLockInputQuestion() {
    document.getElementById('quiz-input').disabled = true;
    document.getElementById('quiz-input-submit').disabled = true;
}

// Handles the Tutor-success path: plays audio, shows feedback, reveals
// the answer in the appropriate way, and resolves as correct.
function _quizHandleTutorSuccess(resEl) {
    resEl.textContent = t('qz_tutor_solved');
    resEl.className = 'quiz-result ok';
    Audio_Manager.playSFX('tutorSuccess');

    if (currentQuizQuestion.type === 'mc') {
        _quizTutorRevealMcAnswer();
    } else {
        _quizTutorLockInputQuestion();
    }

    _resolveQuizAnswer(true);
}

// Handles the Tutor-fail path: plays audio and shows feedback.
// The question remains active so the player can still answer manually.
function _quizHandleTutorFail(resEl) {
    resEl.textContent = t('qz_tutor_failed');
    resEl.className = 'quiz-result bad';
    Audio_Manager.playSFX('tutorFail');
}

// Refreshes the Tutor button visibility and label.
// Called every time the quiz overlay opens.
function _quizRefreshTutorButton() {
    const btn = document.getElementById('quiz-tutor-btn');
    if (!btn) return;

    // BETA TEST ONLY: Super Tutor is temporary and will be removed after the beta period.
    const superTutorEnabled = !!(typeof curMods !== 'undefined' && curMods.superTutor);
    // Trix's Silver Tongue trait grants Tutor access on its own;
    // the tutor_enable node grants it for everyone else.
    const canUseTutor = superTutorEnabled || PT.hasSkill('tutor_enable') || _charIs('trix');
    const tutorCount = _quizCountTutorItems();

    if (canUseTutor && (superTutorEnabled || tutorCount > 0)) {
        btn.style.display = 'flex';
        // Corner chip shows just the tutor / professor emoji; the detail
        // (item count or super-tutor name) moves into the hover tooltip.
        btn.textContent = superTutorEnabled ? '📚' : '🎓';
        btn.dataset.tipT = superTutorEnabled ? 'qz_super_tutor' : 'qz_ask_tutor';
        btn.dataset.tipN = superTutorEnabled ? '' : tutorCount;
    } else {
        btn.style.display = 'none';
    }
}

// Entry point called when the player clicks the Tutor button.
// Selects and (maybe) consumes an item, rolls for success, then
// either resolves the question or leaves it active for manual answering.
function quizUseTutor() {
    // BETA TEST ONLY: Super Tutor is temporary and will be removed after the beta period.
    const superTutorEnabled = !!(typeof curMods !== 'undefined' && curMods.superTutor);
    const tutorItem = superTutorEnabled ? null : _quizGetTutorItem();
    if (!superTutorEnabled && !tutorItem) return;

    const successChance = superTutorEnabled ? 1 : _quizCalcTutorSuccessChance();
    const noConsumeChance = superTutorEnabled ? 1 : _quizCalcTutorNoConsumeChance();

    // Consume the item unless the no-consume roll saves it
    const isConsumed = Math.random() >= noConsumeChance;
    if (isConsumed) {
        _quizConsumeTutorItem(tutorItem);
    }

    // Always hide the button after activation (win or fail)
    document.getElementById('quiz-tutor-btn').style.display = 'none';

    const resEl = document.getElementById('quiz-result');

    if (Math.random() < successChance) {
        _quizHandleTutorSuccess(resEl);
    } else {
        _quizHandleTutorFail(resEl);
    }
}


//------------------------------------------------------------------------
//-------------------SHOW QUIZ (MAIN ENTRY POINT)-------------------------
//------------------------------------------------------------------------

// Injects the character-portrait medallion into the quiz overlay and
// drives its accent/crack colours from the active character.
// NOTE: not currently called anywhere in this file — see summary.
function _quizInjectPortrait(overlayEl) {
    // Remove stale portrait if it exists
    const old = overlayEl.querySelector('.qr-portrait-wrap');
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

    // The quiz-overlay is position:fixed; we need a relative inner container.
    // Insert the portrait as the very first child so it sits above the content.
    const inner = overlayEl.querySelector('.quiz-title');
    if (inner) overlayEl.insertBefore(wrap, inner);
    else overlayEl.prepend(wrap);

    // Drive crack/accent colour from character
    const charColors = {
        stox: { accent: '#4fc3f7', glow: 'rgba(79,195,247,0.55)', crack: '#b06cff', crackGlow: 'rgba(176,108,255,0.6)' },
        trix: { accent: '#ce93d8', glow: 'rgba(206,147,216,0.55)', crack: '#ce93d8', crackGlow: 'rgba(206,147,216,0.5)' },
        syla: { accent: '#66bb6a', glow: 'rgba(102,187,106,0.55)', crack: '#26c6a6', crackGlow: 'rgba(38,198,166,0.5)' },
    };
    const c = charColors[STATE?.playerCharacter] || charColors.stox;
    overlayEl.style.setProperty('--qr-accent', c.accent);
    overlayEl.style.setProperty('--qr-accent-glow', c.glow);
    const frame = overlayEl.querySelector('.qr-frame');
    if (frame) {
        frame.style.setProperty('--qr-crack', c.crack);
        frame.style.setProperty('--qr-crack-glow', c.crackGlow);
    }
}

// Opens the quiz overlay for the given world, drawing a random question
// and setting up the correct input mode (MC or numeric input).
// Called externally when the player triggers a quiz checkpoint.
function showQuiz(worldNum) {
    const q = getQuizQuestion(worldNum);
    currentQuizQuestion = q;

    document.getElementById('quiz-q').textContent = q.q;

    _quizResetOverlay();

    document.getElementById('quiz-why-btn').style.display = 'none';
    document.getElementById('quiz-explain').style.display = 'none';

    if (q.type === 'input') {
        _quizShowInputRow(q);
        // Delay focus slightly so the overlay transition has time to complete
        setTimeout(() => {
            const inputEl = document.getElementById('quiz-input');
            if (inputEl) inputEl.focus();
        }, 120);
    } else {
        _quizHideInputRow();
        _quizRenderMcOptions(q);
        _quizTryEliminateWrongAnswer();
    }

    const overlayEl = document.getElementById('quiz-overlay');
    overlayEl.classList.add('show');

    // Inject character portrait
    const portraitEl = document.getElementById('quiz-portrait');
    if (portraitEl && typeof _getPlayerCharacterImage === 'function') {
        portraitEl.innerHTML = `<img src="${_getPlayerCharacterImage()}" alt="">`;
    }
    _quizRefreshTutorButton();
}


//------------------------------------------------------------------------
//-------------------QUIZ LIFECYCLE---------------------------------------
//------------------------------------------------------------------------

// Hides the quiz overlay and clears all active state.
// Called by finishQuiz(), skipQuiz(), and the Escape handler in main.js.
function closeQuiz() {
    document.getElementById('quiz-overlay').classList.remove('show');
    currentQuizQuestion = null;

    // Cancel the auto-finish timer if the player clicked Continue manually
    if (_quizAutoFinishTimer) {
        clearTimeout(_quizAutoFinishTimer);
        _quizAutoFinishTimer = null;
    }
}

// Shows the win overlay after a short delay. Shared by finishQuiz() and
// skipQuiz() for the non-interstitial exit path.
function _quizShowWinOverlay() {
    setTimeout(() => {
        document.getElementById('ov-win').classList.add('show');
        requestAnimationFrame(() => buildReveal());
    }, 300);
}

// If an endgame interstitial is active, closes the quiz and hands control
// back to the interstitial chain instead of showing the win overlay.
// Returns true if the interstitial path was taken (caller should stop).
function _quizHandleInterstitialExit() {
    if (typeof window._egInterstitialDone !== 'function') return false;
    const cb = window._egInterstitialDone;
    closeQuiz();
    cb();
    return true;
}

// Closes the overlay, runs post-quiz world checks, saves, and shows
// the win overlay. Called from the "CONTINUE" button and (if re-enabled)
// the auto-finish timer.
function finishQuiz() {
    if (_quizHandleInterstitialExit()) return;
    closeQuiz();
    checkWorldCodes();
    checkWorldCompletion();
    save();
    _quizShowWinOverlay();
}

// Called when the player clicks "SKIP" or presses Escape.
// No points or items are awarded; shows the win overlay immediately.
function skipQuiz() {
    if (_quizHandleInterstitialExit()) return;
    closeQuiz();
    _quizShowWinOverlay();
}