//------------------------------------------------------------------------
//----------------------------CONSTANTS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// TUTORIAL_STEPS — ordered list of tutorial steps.
//   Each step has:
//     image     — filename (with extension) of the background image, e.g.
//                 'step1.jpeg' or 'step2.png'. The character-specific folder
//                 (Stox/Trix/Syla) is added automatically by _tutImagePath,
//                 so each character can have its own tutorial screenshots
//                 with the same filenames.
//                 Omit (or repeat the previous filename) to keep showing the
//                 same background image as the previous step — only the
//                 box/arrow change in that case.
//     titleKey  — translation key for the box heading
//     textKey   — translation key for the box body text
//     box       — { top, left } position (in % of the image area) for the
//                 top-left anchor of the text box itself
//     arrowTo   — { top, left } position (in % of the image area) the arrow
//                 points to, originating from the box. Set to null for no arrow.
//
// NOTE: top/left percentages are relative to #tut-demo-area, which always
// fills the available space at the image's aspect ratio (see tutorial.css).
const TUTORIAL_STEPS = [
    { image: 'step1.jpeg', titleKey: 'tut2_s0_title', textKey: 'tut2_s0_text', box: { top: '80%', left: '50%' }, arrowTo: null }, // WELCOME TO STOXELS
    { image: 'step2.png', titleKey: 'tut2_s1_title', textKey: 'tut2_s1_text', box: { top: '70%', left: '85%' }, arrowTo: null }, // THE GAME SCREEN
    { image: 'step2.png', titleKey: 'tut2_s2_title', textKey: 'tut2_s2_text', box: { top: '70%', left: '85%' }, arrowTo: { top: '45%', left: '50%' } },  // THE PUZZLE GRID
    { image: 'step2.png', titleKey: 'tut2_s3_title', textKey: 'tut2_s3_text', box: { top: '20%', left: '20%' }, arrowTo: { top: '40%', left: '35%' } },  // ROW CLUES
    { image: 'step2.png', titleKey: 'tut2_s4_title', textKey: 'tut2_s4_text', box: { top: '20%', left: '20%' }, arrowTo: { top: '23%', left: '52%' } },  // COLUMN CLUES
    { image: 'step2.png', titleKey: 'tut2_s5_title', textKey: 'tut2_s5_text', box: { top: '20%', left: '20%' }, arrowTo: { top: '10%', left: '50%' } },  // THE TIMER
    { image: 'step2.png', titleKey: 'tut2_s6_title', textKey: 'tut2_s6_text', box: { top: '60%', left: '20%' }, arrowTo: { top: '30%', left: '65%' } },  // PENALTIES
    { image: 'step2.png', titleKey: 'tut2_s7_title', textKey: 'tut2_s7_text', box: { top: '60%', left: '20%' }, arrowTo: { top: '10%', left: '25%' } },  // BONUS OBJECTIVES
    { image: 'step2.png', titleKey: 'tut2_s8_title', textKey: 'tut2_s8_text', box: { top: '60%', left: '20%' }, arrowTo: { top: '90%', left: '20%' } },  // INVENTORY
    { image: 'step3.png', titleKey: 'tut2_s9_title', textKey: 'tut2_s9_text', box: { top: '80%', left: '50%' }, arrowTo: null },  // PROBABILITY TREE
    { image: 'step4.jpeg', titleKey: 'tut2_s10_title', textKey: 'tut2_s10_text', box: { top: '80%', left: '50%' }, arrowTo: null }, // INFERENCE
    { image: 'step5.jpeg', titleKey: 'tut2_s11_title', textKey: 'tut2_s11_text', box: { top: '80%', left: '50%' }, arrowTo: null }, // CLASSES
];

// Arrow color (golden) — kept as a JS constant too, in case you want to
// theme it per-character later without touching the CSS.
const TUTORIAL_ARROW_COLOR = '#d4af37';




//------------------------------------------------------------------------
//----------------------------STATE---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// tutStep — index of the currently displayed tutorial step (0-based).
let tutStep = 0;

// tutCurrentImageKey — the image key currently shown, so we only swap the
// <img> element when a step actually requests a different background.
let tutCurrentImageKey = null;


// True while replaying the tutorial from the title screen's Replay panel.
let _tutorialReplayFromTitle = false;



//------------------------------------------------------------------------
//------------------------ENTRY POINTS------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// showTutorial — called from the title screen.
//   Skips the tutorial and goes straight to setup if already completed.
function showTutorial() {
    if (STATE.tutorialDone) {
        showSetup();
        return;
    }
    screenHistory.push('screen-title');
    showTutorialScreen();
}

// replayTutorialFromTitle — rewatch the tutorial even though
// STATE.tutorialDone is already true (showTutorial() would otherwise skip it).
function replayTutorialFromTitle() {
    _tutorialReplayFromTitle = true;
    screenHistory.push('screen-title');
    showTutorialScreen();
}


// showTutorialScreen — switches to the tutorial screen and shows the first step.
function showTutorialScreen() {
    tutStep = 0;
    tutCurrentImageKey = null;
    switchScreen('screen-tutorial');
    initTutorialClickHandler();
    renderTutStep();
}




//------------------------------------------------------------------------
//-------------------------IMAGE RESOLUTION--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _tutCharacterFolder — returns the character folder name used to pick the
//   right image set ('Stox' | 'Trix' | 'Syla'), falling back to 'Stox' if no
//   character has been selected yet (e.g. tutorial shown before character pick).
//   STATE.playerCharacter is stored lowercase ('stox'/'trix'/'syla'), so it's
//   capitalized here to match the actual folder names on disk.
function _tutCharacterFolder() {
    const id = (STATE && STATE.playerCharacter) ? STATE.playerCharacter : 'stox';
    return id.charAt(0).toUpperCase() + id.slice(1);
}

// _tutImagePath — builds the full path to a tutorial background image,
//   using the current character's folder.
function _tutImagePath(imageFile) {
    return `images/Tutorial/${_tutCharacterFolder()}/${imageFile}`;
}




//------------------------------------------------------------------------
//------------------------STEP UI UPDATERS--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// updateStepCounter — updates the "X / Y" step counter in the UI.
function updateStepCounter() {
    document.getElementById('tut-step-counter').textContent =
        `${tutStep + 1} / ${TUTORIAL_STEPS.length}`;
}

// updateNextButton — updates the label on the next/finish button to reflect
//   whether this is the last step.
//   NOTE: Does NOT reassign onclick — the button's handler in HTML calls
//   advanceTutStep(), which decides whether to advance or finish.
function updateNextButton() {
    const isLast = tutStep === TUTORIAL_STEPS.length - 1;
    document.getElementById('tut-next-btn').textContent = isLast
        ? (LANG === 'de' ? 'FERTIG ▶' : 'START PLAYING ▶')
        : (LANG === 'de' ? 'WEITER ▶' : 'NEXT ▶');
}




//------------------------------------------------------------------------
//------------------------STEP RENDERING-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// renderTutStep — orchestrates rendering the current step: swaps the
//   background image if needed, then (re)draws the text box and arrow.
function renderTutStep() {
    const step = TUTORIAL_STEPS[tutStep];
    updateStepCounter();
    updateNextButton();

    ensureTutDemoSkeleton(step);
    renderTutBox(step);
    renderTutArrow(step);
}

// ensureTutDemoSkeleton — makes sure #tut-demo-area contains the background
//   <img> and the arrow <svg>, swapping the image src only when the step's
//   image key actually changes (so repeated steps on the same screenshot
//   don't flicker/reload the image).
function ensureTutDemoSkeleton(step) {
    const area = document.getElementById('tut-demo-area');
    const wantedKey = step.image || tutCurrentImageKey || 'step1.jpeg';

    const existingImg = document.getElementById('tut-bg-img');

    if (!existingImg) {
        area.innerHTML = `
            <img class="tut-bg-img" id="tut-bg-img" src="${_tutImagePath(wantedKey)}" alt="">
            <svg class="tut-arrow-svg" id="tut-arrow-svg"></svg>`;
        tutCurrentImageKey = wantedKey;
        return;
    }

    if (wantedKey !== tutCurrentImageKey) {
        tutCurrentImageKey = wantedKey;
        existingImg.src = _tutImagePath(wantedKey);
    }
}

// renderTutBox — creates (if needed) and positions the floating text box,
//   filling it with the translated title and body text for this step.
// renderTutBox — creates (if needed) and positions the floating text box,
//   filling it with the translated title and body text for this step.
function renderTutBox(step) {
    const area = document.getElementById('tut-demo-area');
    let box = document.getElementById('tut-text-box');

    if (!box) {
        box = document.createElement('div');
        box.id = 'tut-text-box';
        box.className = 'tut-text-box';
        area.appendChild(box);
    }

    // Reset to the "ideal" anchored position before measuring, so we don't
    // compound leftover offsets from a previous step's clamp.
    box.style.transform = 'translate(-50%, -50%)';
    box.style.top = step.box.top;
    box.style.left = step.box.left;
    box.innerHTML = `
        <div class="tut-box-title">${t(step.titleKey)}</div>
        <div class="tut-box-text">${t(step.textKey)}</div>`;

    // Wait a frame so the box has real dimensions, then pull it back
    // inside the visible area if it's overflowing (small screens).
    requestAnimationFrame(() => clampTutBoxPosition());
}

// clampTutBoxPosition — nudges #tut-text-box (via an extra transform offset)
//   so it never overflows outside #tut-demo-area, e.g. on narrow/short
//   screens where the box is bigger relative to the canvas.
function clampTutBoxPosition() {
    const area = document.getElementById('tut-demo-area');
    const box = document.getElementById('tut-text-box');
    if (!area || !box) return;

    const areaRect = area.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const margin = 10;

    let dx = 0;
    let dy = 0;

    if (boxRect.left < areaRect.left + margin) {
        dx = (areaRect.left + margin) - boxRect.left;
    } else if (boxRect.right > areaRect.right - margin) {
        dx = (areaRect.right - margin) - boxRect.right;
    }

    if (boxRect.top < areaRect.top + margin) {
        dy = (areaRect.top + margin) - boxRect.top;
    } else if (boxRect.bottom > areaRect.bottom - margin) {
        dy = (areaRect.bottom - margin) - boxRect.bottom;
    }

    if (dx || dy) {
        box.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
}

// renderTutArrow — draws (or clears) the golden dashed arrow from the
//   text box's anchor point to the step's target coordinate.
function renderTutArrow(step) {
    const svg = document.getElementById('tut-arrow-svg');
    if (!svg) return;
    svg.innerHTML = '';

    if (!step.arrowTo) return;

    const area = document.getElementById('tut-demo-area');
    const rect = area.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const startX = (parseFloat(step.box.left) / 100) * rect.width;
    const startY = (parseFloat(step.box.top) / 100) * rect.height;
    const endX = (parseFloat(step.arrowTo.left) / 100) * rect.width;
    const endY = (parseFloat(step.arrowTo.top) / 100) * rect.height;

    svg.innerHTML = `
        <defs>
            <marker id="tut-arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="${TUTORIAL_ARROW_COLOR}"/>
            </marker>
        </defs>
        <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}"
              stroke="${TUTORIAL_ARROW_COLOR}" stroke-width="3"
              stroke-dasharray="6,4" marker-end="url(#tut-arrowhead)"/>`;
}




//------------------------------------------------------------------------
//---------------------------NAVIGATION-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// initTutorialClickHandler — clicking anywhere on the demo area (but not
//   on the text box itself, so its text remains selectable) advances to
//   the next step, same as pressing NEXT.
function initTutorialClickHandler() {
    const area = document.getElementById('tut-demo-area');
    area.onclick = (e) => {
        if (e.target.closest('#tut-text-box')) return;
        advanceTutStep();
    };
}

// advanceTutStep — moves to the next step, or finishes the tutorial when
//   on the last step. Called directly by the Next button's onclick in HTML,
//   and by clicks on the demo area.
function advanceTutStep() {
    if (tutStep === TUTORIAL_STEPS.length - 1) {
        finishTutorial();
        return;
    }
    tutStep++;
    renderTutStep();
}

// prevTutStep — moves to the previous step if one exists.
function prevTutStep() {
    if (tutStep > 0) {
        tutStep--;
        renderTutStep();
    }
}

// finishTutorial — marks the tutorial as completed, persists the save,
//   and navigates to the level select screen.
function finishTutorial() {
    STATE.tutorialDone = true;
    save();
    if (_tutorialReplayFromTitle) {
        _tutorialReplayFromTitle = false;
        showTitle();
        return;
    }
    showSetup();
}