import { Audio_Manager } from './audio/audio.js';
import { showModal, showTitle, switchScreen } from './screens/screens.js';
import { save } from './state.js';
import { LANG, t } from './translation/translations.js';
import { STATE } from './state.js';

//------------------------------------------------------------------------
//-------------------MOODLE CODES (codes.js)-------------------------------
//------------------------------------------------------------------------
// Moodle codes the player unlocks by reaching progression steps (tutorial,
// campaign worlds, atlas tiers).

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------

// Progress helpers. Each returns { current, target }; a code unlocks once
// current >= target. They read live game data through globalThis, like the
// rest of the concatenated core.

// True when every level of world `wi` is in STATE.done.
function _worldFullyCleared(wi) {
    const world = globalThis.WORLDS && globalThis.WORLDS[wi];
    const start = globalThis.WORLD_START_GI && globalThis.WORLD_START_GI[wi];
    if (!world || start == null) return false;
    return world.data.every((_, li) => STATE.done.includes(start + li));
}

// How many campaign worlds are fully cleared.
function _worldsClearedCount() {
    const worlds = globalThis.WORLDS || [];
    let n = 0;
    for (let wi = 0; wi < worlds.length; wi++) if (_worldFullyCleared(wi)) n++;
    return n;
}

// Atlas regions cleared among those whose tier passes `tierOk`.
function _atlasRegionProgress(tierOk) {
    const nodes = (Array.isArray(globalThis.EG_ATLAS_NODES) ? globalThis.EG_ATLAS_NODES : []).filter(n => tierOk(n.tier));
    const done = STATE.egAtlasCompleted || {};
    return { current: nodes.filter(n => done[n.id]).length, target: Math.max(1, nodes.length) };
}

// The real Moodle codes are not stored as readable text. Each entry keeps a
// masked blob, decoded only when the player has earned that code (see
// _codeText). This keeps them out of a plain text search of the source; it
// is a speed bump, not real security - the game runs in the player's browser.
function _h53(str, seed) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

// Unmasks a blob (hex bytes) for the code with the given id.
function _unmask(id, blob) {
    const key = ['q7', 'Zm', '4x', 'Rk'].join('') + ':' + id.slice(1);
    let out = '';
    for (let j = 0; j * 2 < blob.length; j++) {
        out += String.fromCharCode(parseInt(blob.substr(j * 2, 2), 16) ^ (_h53(key, j + 1) % 256));
    }
    return out;
}

// Each entry is one Moodle code and the progression step that earns it.
// goal*: the requirement text; unit*: [singular, plural] of what progress counts.
export const WORLD_CODES = [
    {
        id: 'c1', blob: 'c3c52ee8355359e96ea753ea37efcc5203d5de06', titleEn: 'Code 1', titleDE: 'Code 1',
        goalEn: 'Finish the tutorial and clear World 1', goalDE: 'Schließe das Tutorial ab und räume Welt 1',
        unitEn: ['step', 'steps'], unitDE: ['Schritt', 'Schritte'],
        progress: () => ({ current: (STATE.tutorialDone ? 1 : 0) + (_worldFullyCleared(0) ? 1 : 0), target: 2 }),
    },
    {
        id: 'c2', blob: '2f2829caf6036b970586d8ec', titleEn: 'Code 2', titleDE: 'Code 2',
        goalEn: 'Fully clear 6 worlds', goalDE: 'Räume 6 Welten vollständig',
        unitEn: ['world', 'worlds'], unitDE: ['Welt', 'Welten'],
        progress: () => ({ current: Math.min(6, _worldsClearedCount()), target: 6 }),
    },
    {
        id: 'c3', blob: '65f56399041e9ab5b6af', titleEn: 'Code 3', titleDE: 'Code 3',
        goalEn: 'Fully clear every campaign world', goalDE: 'Räume jede Kampagnenwelt vollständig',
        unitEn: ['world', 'worlds'], unitDE: ['Welt', 'Welten'],
        progress: () => ({ current: _worldsClearedCount(), target: Math.max(1, (globalThis.WORLDS || []).length) }),
    },
    {
        id: 'c4', blob: '4bb6db1ee085ff0fe995bd1dd861eb8c0b', titleEn: 'Code 4', titleDE: 'Code 4',
        goalEn: 'Clear every atlas map up to Tier 6', goalDE: 'Räume jede Atlas-Karte bis einschließlich Stufe 6',
        unitEn: ['map', 'maps'], unitDE: ['Karte', 'Karten'],
        progress: () => _atlasRegionProgress(tier => tier <= 6),
    },
    {
        id: 'c5', blob: 'c3f69eee5d14382724fb3242ef09a79658268719', titleEn: 'Code 5', titleDE: 'Code 5',
        goalEn: 'Clear every Tier 16 map at least once', goalDE: 'Räume jede Karte der Stufe 16 mindestens einmal',
        unitEn: ['map', 'maps'], unitDE: ['Karte', 'Karten'],
        progress: () => _atlasRegionProgress(tier => tier === 16),
    },
];

// True once the player has met the requirement of one WORLD_CODES entry.
function _codeEarned(wc) {
    const { current, target } = wc.progress();
    return current >= target;
}

// True when the player already owns this code. Saves record the code id;
// older saves recorded the readable code text, which is matched too.
function _codeOwned(wc) {
    return STATE.unlockedCodes.includes(wc.id) || STATE.unlockedCodes.includes(_unmask(wc.id, wc.blob));
}

// The readable code, only for a code the player owns or has just earned.
function _codeText(wc) {
    return (_codeOwned(wc) || _codeEarned(wc)) ? _unmask(wc.id, wc.blob) : '';
}

// Localised requirement text of a code entry.
function getCodeGoal(wc) {
    return LANG === 'de' ? wc.goalDE : wc.goalEn;
}

// Returns the localised title for a code entry based on the active language
function getCodeTitle(worldCode) {
    return LANG === 'de' ? worldCode.titleDE : worldCode.titleEn;
}


//------------------------------------------------------------------------
//---------------------------UNLOCK LOGIC---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Checks every WORLD_CODES entry, records the ones just earned in
// STATE.unlockedCodes and returns them.
function collectCodeUnlockResults() {
    const newCodes = [];
    WORLD_CODES.forEach(wc => {
        // Skip codes the player already owns
        if (_codeOwned(wc)) return;
        if (_codeEarned(wc)) {
            STATE.unlockedCodes.push(wc.id);
            newCodes.push(wc);
        }
    });
    return { newCodes };
}


//------------------------------------------------------------------------
//-------------------------MODAL & TOAST UI-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _pwFireSparkles - one-shot golden sparkle burst over a code display.
// Each spark is a single absolutely-positioned star (css/modals.css 3j)
// that fans out from the display's centre and fades; nodes self-remove
// on animationend.
function _pwFireSparkles(container) {
    // Respect the reduced-motion off-switch in the CSS choreography.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    container.querySelectorAll('.pw-spark').forEach(s => s.remove());
    const EMOJIS = ['✦', '✧', '⭐'];
    for (let i = 0; i < 12; i++) {
        const s = document.createElement('span');
        s.className = 'pw-spark';
        s.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 26 + Math.random() * 30;
        s.style.setProperty('--sx', `${Math.round(Math.cos(angle) * dist)}px`);
        s.style.setProperty('--sy', `${Math.round(Math.sin(angle) * dist)}px`);
        s.style.setProperty('--sr', `${Math.round(Math.random() * 90 - 45)}deg`);
        s.style.setProperty('--sd', `${(Math.random() * 0.15).toFixed(2)}s`);
        s.addEventListener('animationend', () => s.remove());
        container.appendChild(s);
    }
}

// Builds the HTML for a single code block inside the unlock modal.
// One parchment stone card (css/modals.css section 3) containing the
// code's title, the glowing code display, and the Moodle hint.
function buildCodeUnlockBlock(worldCode) {
    const title = getCodeTitle(worldCode);
    return `
        <div class="pw-card">
            <div class="pw-card-title">${title}</div>
            <div class="pw-unlock-anim">${_codeText(worldCode)}</div>
            <div class="pw-hint">${t('pw_hint')}</div>
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
        `<p class="pw-intro">${t('pw_intro')}</p>` +
        codes.map(buildCodeUnlockBlock).join('');

    showModal('pw-modal');

    // Reward fanfare: the achievement sting plus a golden sparkle burst
    // over each code display, timed to the CSS shine sweep that peaks
    // ~350ms into its run (css/modals.css 3j - sweep delays are
    // 0.5s/0.64s/0.78s/… per card).
    Audio_Manager.playSFX('achievement');

    const _shineDelays = [500, 640, 780, 920];
    contentEl.querySelectorAll('.pw-unlock-anim').forEach((el, i) => {
        const delay = _shineDelays[Math.min(i, _shineDelays.length - 1)] + 350;
        setTimeout(() => _pwFireSparkles(el), delay);
    });
}

//------------------------------------------------------------------------
//-------------------------CODES SCREEN UI - REDESIGNED-------------------
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
 * @param {string}  label     - The requirement text, e.g. "Fully clear 6 worlds"
 * @param {number}  current   - Player's current progress
 * @param {number}  required  - Progress needed to unlock
 * @param {boolean} met       - Whether the requirement is already satisfied
 * @returns {string} HTML string
 */
function _mcBuildReqBlock(label, current, required, met) {
    const displayCurrent = met ? required : current;
    const pct = Math.min(100, Math.round((displayCurrent / required) * 100));
    const metCls = met ? ' met' : '';

    return `
        <div class="mc-req-line">
            <span class="mc-req-label">${label}</span>
            <span class="mc-req-values${metCls}">${displayCurrent} / ${required}</span>
            ${met
            ? '<span class="mc-check">✓</span>'
            : '<span class="mc-check hidden">✓</span>'}
        </div>
        <div class="mc-bar-wrap">
            <div class="mc-bar-fill score${metCls}" style="width:${pct}%"></div>
        </div>`;
}

/**
 * Builds the overlay content for one parchment row.
 * No icon HTML is emitted - icons are already in the background image.
 *
 * @param {object} wc - Entry from WORLD_CODES
 * @returns {string} HTML string
 */
function _mcBuildRow(wc) {
    const unlocked = _codeOwned(wc);
    const tierName = getCodeTitle(wc);
    const { current, target } = wc.progress();
    const met = unlocked || current >= target;
    const reqBlock = _mcBuildReqBlock(getCodeGoal(wc), current, target, met);

    const codeReveal = unlocked
        ? `<div class="mc-code-reveal mc-unlock-anim">${_codeText(wc)}</div>` : '';

    const rowIndex = WORLD_CODES.indexOf(wc) + 1;

    return `
    <div class="mc-row mc-row--${rowIndex}${unlocked ? ' mc-row--unlocked' : ''}">
        <img class="mc-icon" src="images/Moodle_Codes_Screen/icon_${rowIndex}.webp" alt="">
        <div class="mc-row-content">
            <div class="mc-row-title">${tierName}${codeReveal}</div>
            ${reqBlock}
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

    // Codes can be earned in places that never ran the check (older saves,
    // atlas progress): record them now so the screen shows them.
    const { newCodes } = collectCodeUnlockResults();
    if (newCodes.length) save();

    const rowsHTML = WORLD_CODES.map(_mcBuildRow).join('');

    screenEl.innerHTML = `
        <div class="mc-canvas">

            <!-- MOODLE CODES logo image -->
            <img class="mc-logo" src="images/Moodle_Codes_Screen/Moodle_Codes_logo.webp" alt="Moodle Codes">

            <!-- BACK button - top-left (unified .back-btn stone slab) -->
            <button class="back-btn back-btn-corner mc-menu-btn" id="btn-codes-back" data-t="btn_back">BACK</button>


            <!-- 5 parchment row overlays (text + bars only, no icons) -->
            ${rowsHTML}

        </div>
    `;

    // Re-wire back button (innerHTML wipe removes the old listener)
    const backBtn = document.getElementById('btn-codes-back');
    if (backBtn) backBtn.addEventListener('click', () => showTitle());

    if (newCodes.length) setTimeout(() => showUnlockedCodesModal(newCodes), 400);
}


//------------------------------------------------------------------------
//-------------------MAIN ENTRY POINTS-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Main entry point - call this after a level is beaten or a quiz is finished.
// Checks for newly unlocked codes, persists state, and triggers UI feedback.
export function checkWorldCodes() {
    const { newCodes } = collectCodeUnlockResults();
    save();
    if (newCodes.length) showUnlockedCodesModal(newCodes);
}

// Synchronous unlock check without UI - call this to persist unlocks immediately.
// Returns the list of newly unlocked codes.
export function checkWorldCodesSync() {
    const { newCodes } = collectCodeUnlockResults();
    if (newCodes.length) save();
    return newCodes;
}

/**
 * Navigates to the codes screen.
 * Pushes the title screen onto the history stack so Escape returns there.
 */
export function showCodes() {
    buildCodesScreen();
    globalThis.screenHistory.push('screen-title');
    switchScreen('screen-codes');
}