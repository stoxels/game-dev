//------------------------------------------------------------------------
//---------------------------MOODLE CODES---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Ensures the "locked codes" reminder only shows once per game session,
// instead of after every level completion.
let _lockedCodesModalShownThisSession = false;

// Same eligibility check as collectCodeUnlockResults(), but read-only —
// does not mutate STATE.unlockedCodes. Used for the setup-screen reminder only.
function collectLockedCodesOnly() {
    const lockedCodes = [];
    const totalTiers = ACHIEVEMENT_DEFS.reduce((sum, def) => sum + def.tiers.length, 0);
    const unlockedTiers = ACH_STATE.unlocked.length;
    const achPctDone = calcAchievementProgress();

    WORLD_CODES.forEach(wc => {
        if (STATE.unlockedCodes.includes(wc.code)) return;
        const result = evaluateCodeEligibility(wc, achPctDone);
        if (result === 'locked_achievements') {
            lockedCodes.push({
                wc,
                needed: Math.ceil(wc.achPct * totalTiers),
                have: unlockedTiers,
            });
        }
    });

    return lockedCodes;
}

// Call this once, when the player confirms Game Setup (before entering
// level select). Shows the locked-codes reminder at most once per session.
function checkLockedCodesOnSetup() {
    if (_lockedCodesModalShownThisSession) return;

    const lockedCodes = collectLockedCodesOnly();
    if (lockedCodes.length) {
        _lockedCodesModalShownThisSession = true;
        showLockedCodesModal(lockedCodes);
    }
}



// Each entry defines a Moodle code the player can unlock by reaching
// a score threshold AND a minimum percentage of all achievement tiers.
// achPct: 0 means only the score requirement matters for that code.

const WORLD_CODES = [
    { threshold: 10000, achPct: 0, code: 'TY_4_Playing_Stoxels', titleEn: 'Code 1', titleDE: 'Code 1' },
    { threshold: 25000, achPct: 0.15, code: 'IsThereADog?', titleEn: 'Code 2', titleDE: 'Code 2' },
    { threshold: 50000, achPct: 0.30, code: 'Stox0rTrix', titleEn: 'Code 3', titleDE: 'Code 3' },
    { threshold: 75000, achPct: 0.50, code: 'MonstersInStoxels', titleEn: 'Code 4', titleDE: 'Code 4' },
    { threshold: 100000, achPct: 0.80, code: 'Examn1.0afterStoxels', titleEn: 'Code 5', titleDE: 'Code 5' },
];


//------------------------------------------------------------------------
//---------------------------UNLOCK LOGIC---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the localised title for a code entry based on the active language
function getCodeTitle(worldCode) {
    return LANG === 'de' ? worldCode.titleDE : worldCode.titleEn;
}

// Calculates what fraction of all achievement tiers the player has unlocked.
// Returns a value between 0 and 1 (e.g. 0.5 = 50 % complete).
function calcAchievementProgress() {
    const totalTiers = ACHIEVEMENT_DEFS.reduce((sum, def) => sum + def.tiers.length, 0);
    const unlockedTiers = ACH_STATE.unlocked.length;
    return totalTiers > 0 ? unlockedTiers / totalTiers : 0;
}

// Evaluates a single WORLD_CODES entry against the player's current
// score and achievement progress.
// Returns: 'unlocked' | 'locked_achievements' | 'not_reached'
function evaluateCodeEligibility(worldCode, achPctDone) {
    const scoreOk = STATE.totalScore >= worldCode.threshold;
    const achOk = achPctDone >= (worldCode.achPct || 0);

    if (scoreOk && achOk) return 'unlocked';
    if (scoreOk && !achOk) return 'locked_achievements';
    return 'not_reached';
}

// Checks every WORLD_CODES entry and sorts them into:
//   newCodes    — ready to unlock right now
//   lockedCodes — score met, but not enough achievements yet
// Returns both lists so the caller can act on them.
function collectCodeUnlockResults() {
    const newCodes = [];
    const lockedCodes = [];

    const totalTiers = ACHIEVEMENT_DEFS.reduce((sum, def) => sum + def.tiers.length, 0);
    const unlockedTiers = ACH_STATE.unlocked.length;
    const achPctDone = calcAchievementProgress();

    WORLD_CODES.forEach(wc => {
        // Skip codes the player already owns
        if (STATE.unlockedCodes.includes(wc.code)) return;

        const result = evaluateCodeEligibility(wc, achPctDone);

        if (result === 'unlocked') {
            STATE.unlockedCodes.push(wc.code);
            newCodes.push(wc);
        } else if (result === 'locked_achievements') {
            lockedCodes.push({
                wc,
                needed: Math.ceil(wc.achPct * totalTiers),
                have: unlockedTiers,
            });
        }
    });

    return { newCodes, lockedCodes };
}

// Main entry point — call this after a level is beaten or a quiz is finished.
// Checks for newly unlocked codes, persists state, and triggers UI feedback.
function checkWorldCodes() {
    const { newCodes } = collectCodeUnlockResults();
    save();
    if (newCodes.length) showUnlockedCodesModal(newCodes);
}


//------------------------------------------------------------------------
//-------------------------MODAL & TOAST UI-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the HTML for a single code block inside the unlock modal.
function buildCodeUnlockBlock(worldCode) {
    const title = getCodeTitle(worldCode);
    return `
        <div style="margin-bottom:14px;">
            <div style="font-family:var(--PX);font-size:9px;color:var(--purple);margin-bottom:5px;">
                ${title}
            </div>
            <div class="pw-unlock-anim">${worldCode.code}</div>
            <div style="font-size:11px;color:#666;margin-top:6px;">${t('pw_hint')}</div>
        </div>
    `;
}

// Populates and opens the unlock modal for one or more newly earned codes.
function showUnlockedCodesModal(codes) {
    const contentEl = document.getElementById('pw-content');

    document.getElementById('pw-modal')
        .querySelector('.modal-title')
        .textContent = t('pw_title');

    contentEl.innerHTML =
        `<p style="font-size:12px;color:#888;margin-bottom:16px;">${t('pw_intro')}</p>` +
        codes.map(buildCodeUnlockBlock).join('');

    showModal('pw-modal');
}

// Builds the HTML for a single code block inside the "locked" modal.
// Shows the code's title, confirms the score requirement is already met,
// and tells the player how many more achievement tiers they still need.
//
// @param {object} lockedEntry - { wc, needed, have } as produced by
//                                collectCodeUnlockResults()
function buildCodeLockedBlock(lockedEntry) {
    const { wc, needed, have } = lockedEntry;
    const title = getCodeTitle(wc);
    const remaining = Math.max(0, needed - have);

    const scoreLineText = LANG === 'de'
        ? '✓ Punktzahl erreicht'
        : '✓ Score requirement met';

    const achLineText = LANG === 'de'
        ? `🔒 Noch ${remaining} Achievement${remaining === 1 ? '' : 's'} benötigt (${have} / ${needed})`
        : `🔒 ${remaining} more achievement tier${remaining === 1 ? '' : 's'} needed (${have} / ${needed})`;

    return `
        <div style="margin-bottom:14px;">
            <div style="font-family:var(--PX);font-size:9px;color:var(--purple);margin-bottom:5px;">
                ${title}
            </div>
            <div style="font-size:12px;color:var(--green);margin-bottom:4px;">${scoreLineText}</div>
            <div style="font-size:12px;color:var(--orange);">${achLineText}</div>
        </div>
    `;
}

// Populates and opens the same pw-modal used for unlocks, but with
// "locked" content: tells the player their score is high enough for one
// or more codes, but they still need more achievement tiers to unlock them.
function showLockedCodesModal(lockedCodes) {
    const contentEl = document.getElementById('pw-content');

    const lockedTitle = LANG === 'de'
        ? '🔒 CODE NOCH GESPERRT'
        : '🔒 CODE STILL LOCKED';

    const lockedIntro = LANG === 'de'
        ? 'Du hast genug Punkte, aber noch nicht genug Achievements freigeschaltet:'
        : "You've earned enough score, but haven't unlocked enough achievements yet:";

    document.getElementById('pw-modal')
        .querySelector('.modal-title')
        .textContent = lockedTitle;

    contentEl.innerHTML =
        `<p style="font-size:12px;color:#888;margin-bottom:16px;">${lockedIntro}</p>` +
        lockedCodes.map(buildCodeLockedBlock).join('');

    showModal('pw-modal');
}


//------------------------------------------------------------------------
//-------------------------CODES SCREEN UI — REDESIGNED-------------------
//------------------------------------------------------------------------
// The background image (Moodle_Codes_Background.jpeg) already contains:
//   • The "MOODLE CODES" title
//   • The stone frame with 5 parchment rows and icons
//   • The rune strip and stone base
//
// We inject a transparent overlay canvas and absolutely-position all
// text + progress bars to land on the correct slots in the image.
//------------------------------------------------------------------------


/**
 * Builds one requirement line + progress bar block.
 *
 * @param {string}  label     - Display label, e.g. "Required Score"
 * @param {number}  current   - Player's current value
 * @param {number}  required  - Value needed to unlock
 * @param {boolean} met       - Whether the requirement is already satisfied
 * @param {string}  barClass  - 'score' or 'ach' (controls bar colour via CSS)
 * @returns {string} HTML string
 */
function _mcBuildReqBlock(label, current, required, met, barClass) {
    const displayCurrent = met ? required : current;
    const pct = Math.min(100, Math.round((displayCurrent / required) * 100));
    const metCls = met ? ' met' : '';
    const fmtNum = (n) => barClass === 'score' ? n.toLocaleString() : String(n);

    return `
        <div class="mc-req-line">
            <span class="mc-req-label">${label}:</span>
            <span class="mc-req-values${metCls}">${fmtNum(displayCurrent)} / ${fmtNum(required)}</span>
            ${met
            ? '<span class="mc-check">✓</span>'
            : '<span class="mc-check hidden">✓</span>'}
        </div>
        <div class="mc-bar-wrap">
            <div class="mc-bar-fill ${barClass}${metCls}" style="width:${pct}%"></div>
        </div>`;
}


/**
 * Builds the overlay content for one parchment row.
 * No icon HTML is emitted — icons are already in the background image.
 *
 * @param {object}  wc               - Entry from WORLD_CODES
 * @param {number}  total            - Player's current total score
 * @param {number}  achPct           - Achievement completion fraction (0–1)
 * @param {number}  totalAchTiers    - Total achievement tiers in the game
 * @param {number}  unlockedAchTiers - How many the player has earned
 * @returns {string} HTML string
 */
function _mcBuildRow(wc, total, achPct, totalAchTiers, unlockedAchTiers) {
    const unlocked = STATE.unlockedCodes.includes(wc.code);
    const tierName = LANG === 'de' ? wc.titleDE : wc.titleEn;
    const scoreMet = total >= wc.threshold;
    const scoreLabel = (typeof t === 'function' ? t('codes_req_score') : null) || 'Required Score';
    const scoreBlock = _mcBuildReqBlock(scoreLabel, total, wc.threshold, scoreMet, 'score');

    let achBlock = '';
    if (wc.achPct > 0) {
        const achRequired = Math.ceil(wc.achPct * totalAchTiers);
        const achMet = achPct >= wc.achPct;
        const achLabel = (typeof t === 'function' ? t('codes_req_ach') : null) || 'Required Milestones';
        achBlock = _mcBuildReqBlock(achLabel, unlockedAchTiers, achRequired, achMet, 'ach');
    }

    const codeReveal = unlocked
        ? `<div class="mc-code-reveal mc-unlock-anim">${wc.code}</div>` : '';

    const rowIndex = WORLD_CODES.indexOf(wc) + 1;

    return `
    <div class="mc-row mc-row--${rowIndex}${unlocked ? ' mc-row--unlocked' : ''}">
        <img class="mc-icon" src="images/Moodle_Codes_Screen/icon_${rowIndex}.png" alt="">
        <div class="mc-row-content">
            <div class="mc-row-title">${tierName}${codeReveal}</div>
            ${scoreBlock}
            ${achBlock}
        </div>
    </div>`;
}


/**
 * Builds and injects the redesigned codes screen into #screen-codes.
 * The screen element itself carries the background image via CSS.
 * Everything rendered here is transparent overlay text + bars only.
 */
function buildCodesScreen() {
    const screenEl = document.getElementById('screen-codes');
    if (!screenEl) return;

    const total = STATE.totalScore;
    const achPct = calcAchievementProgress();
    const totalAchTiers = ACHIEVEMENT_DEFS.reduce((s, d) => s + d.tiers.length, 0);
    const unlockedAchTiers = ACH_STATE.unlocked.length;

    const menuText = (typeof t === 'function' ? t('btn_menu') : null) || 'MENU';
    const totalLbl = (typeof t === 'function' ? t('hs_total') : null) || 'TOTAL SCORE';
    const footerMsg = (typeof t === 'function' ? t('codes_footer') : null)
        || 'Earn points to unlock these powerful achievement codes!';

    const rowsHTML = WORLD_CODES.map(wc =>
        _mcBuildRow(wc, total, achPct, totalAchTiers, unlockedAchTiers)
    ).join('');


    screenEl.innerHTML = `
        <div class="mc-canvas">

            <!-- MOODLE CODES logo image -->
            <img class="mc-logo" src="images/Moodle_Codes_Screen/Moodle_Codes_logo.png" alt="Moodle Codes">

            <!-- MENU button — top-left -->
            <button class="mc-menu-btn" id="btn-codes-back">◀ ${menuText}</button>


            <!-- 5 parchment row overlays (text + bars only, no icons) -->
            ${rowsHTML}

        </div>
    `;

    // Re-wire back button (innerHTML wipe removes the old listener)
    const backBtn = document.getElementById('btn-codes-back');
    if (backBtn) backBtn.addEventListener('click', () => showTitle());
}


/**
 * Navigates to the codes screen.
 * Pushes the title screen onto the history stack so Escape returns there.
 */
function showCodes() {
    buildCodesScreen();
    screenHistory.push('screen-title');
    switchScreen('screen-codes');
}