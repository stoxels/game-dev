import { Audio_Manager } from './js/audio/audio.js';
import { _bayesTrapsCleanup } from './js/classes/class-bayesian.js';
import { _egRenderPauseLootSummary } from './js/combat/encounter-chain.js';
import { _egOnPause, _egOnResume } from './js/combat/encounter-tick.js';
import { closeHubToGame, isHubGameOverlay } from './js/endgame/endgame-hub.js';
import { scalePuzzle } from './js/grid-scaling.js';
import { stopPainting } from './js/mouse-button-handlers.js';
import { _dofNudge } from './js/passive-tree/passive-tree-special-nodes-logic.js';
import { closeTreeToGame, isTreeGameOverlay } from './js/passive-tree/passive-tree.js';
import { skipQuiz } from './js/quiz-exercise/quiz.js';
import { _refreshQuestionModalFlag, goToPreviousScreen, hideResultOverlays } from './js/screens/screens.js';
import { SETTINGS, applySettings, initSettingsControls } from './js/settings.js';
import { closeSpellbook } from './js/skills/skill-spellbook.js';
import { pauseTimer, resumeTimer } from './js/timer/timer.js';
import { setLang } from './js/translation/translations.js';

//------------------------------------------------------------------------
// Phase 3 step 10: live globalThis accessors for externally-mutated names.
// (derived from the step-10 write-site audit by dev/scratch/convert-step10.mjs)
//------------------------------------------------------------------------
try { Object.defineProperty(globalThis, '_gamePaused', { get() { return _gamePaused; }, set(v) { _gamePaused = v; }, configurable: true }); } catch (e) {}

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Tracks whether the game is currently in a paused state.
// Managed exclusively through pauseGame() / unpauseGame().
let _gamePaused = false;

// Animation timing for the title decoration shimmer wave effect
export const DECO_PANEL_DELAY_STEP = 0.4;  // seconds between panels
export const DECO_ROW_DELAY_STEP = 0.08; // seconds between rows within a panel
export const DECO_COL_DELAY_STEP = 0.05; // seconds between columns within a row

// Pixel-art bitmaps (5×5) used on the title screen decoration.
// 1 = filled cell, 0 = invisible cell.
export const DECO_PANELS = [
    // Panel 1 – classic puzzle cross
    [
        [0, 1, 0, 1, 0],
        [1, 1, 1, 1, 1],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 1, 1, 0],
    ],
    // Panel 2 – passive tree node (diamond / PoE style)
    [
        [0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [1, 1, 0, 1, 1],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 0, 0],
    ],
    // Panel 3 – inventory grid / chest
    [
        [1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1],
        [1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1],
        [1, 1, 1, 1, 1],
    ],
    // Panel 4 – star / score icon
    [
        [0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [1, 1, 1, 1, 1],
        [0, 1, 0, 1, 0],
        [1, 0, 0, 0, 1],
    ],
];




//------------------------------------------------------------------------
//-------------------PAUSE SYSTEM----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// On endgame maps the pause menu offers "Return to Nexus" instead of "Levels".
// Returns whether the current level is an endgame map.
export function _updatePauseMenuReturnButtons() {
    // Campaign levels also carry isMonsterLevel (their light monster pack),
    // but they are NOT endgame maps - they keep the normal "Levels" button.
    const onEndgameMap = typeof cur !== 'undefined' && globalThis.cur &&
        ((globalThis.cur.isMonsterLevel && !globalThis.cur.campaignMonsters) || globalThis.cur.isEndgameSandbox);
    const levelsBtn = document.getElementById('btn-go-levels');
    const nexusBtn = document.getElementById('btn-go-nexus');
    if (levelsBtn) levelsBtn.style.display = onEndgameMap ? 'none' : '';
    if (nexusBtn) nexusBtn.style.display = onEndgameMap ? '' : 'none';
    return onEndgameMap;
}

// Shows the pause overlay and stops the timer.
// Guards against pausing when the level is already finished (dead).
export function pauseGame() {
    if (_gamePaused || globalThis.dead) return;
    _gamePaused = true;
    pauseTimer(); // defined in timer.js
    if (typeof _egOnPause === 'function') _egOnPause();
    const onEndgameMap = _updatePauseMenuReturnButtons();
    // Endgame variant: hide level number / score / hint / bonus, show the
    // run's collected loot (with hover tooltips) instead.
    document.getElementById('pause-overlay').classList.toggle('eg-pause', onEndgameMap);
    if (onEndgameMap && typeof _egRenderPauseLootSummary === 'function') {
        _egRenderPauseLootSummary();
    }
    document.getElementById('pause-overlay').classList.add('show');
}

// Hides the pause overlay and resumes the timer.
export function unpauseGame() {
    if (!_gamePaused) return;
    _gamePaused = false;
    document.getElementById('pause-overlay').classList.remove('show');
    if (typeof _egOnResume === 'function') _egOnResume();
    resumeTimer(); // defined in timer.js
}

// Toggles between paused and unpaused.
// Does nothing if the level has already ended (dead flag).
export function togglePause() {
    if (globalThis.dead) return;
    _gamePaused ? unpauseGame() : pauseGame();
}




//------------------------------------------------------------------------
//-------------------ESCAPE KEY HANDLER----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Runs cleanup for any active special-mechanic overlays before
// the escape key resolves its main action. These are optional globals
// defined in their respective mechanic files, so we guard before calling.
export function _runEscapeCleanup() {
    if (typeof _bayesTrapsCleanup === 'function') {
        _bayesTrapsCleanup(false);
    }
    if (typeof window.clearActiveRandomWalkers === 'function') {
        window.clearActiveRandomWalkers();
    }
}

// Returns true if the quiz overlay is currently visible.
export function _isQuizOpen() {
    return document.getElementById('quiz-overlay').classList.contains('show');
}

// Returns true if any modal backdrop is currently visible.
export function _isAnyModalOpen() {
    return !!document.querySelector('.modal-bg.show');
}

// Closes all open modal backdrops at once.
// The Degrees of Freedom choice modal (#dof-modal) is mandatory - its
// keystone downside must always apply - so it is never dismissed here.
// It only closes via _dofChoose(); Escape just nudges it instead.
export function _closeAllModals() {
    document.querySelectorAll('.modal-bg.show')
        .forEach(m => {
            if (m.id === 'dof-modal') {
                if (typeof _dofNudge === 'function') _dofNudge();
                return;
            }
            // Route through closeSpellbook() so the body class and the
            // hotbar stacking are reset (plain class removal would leave
            // the hotbar lifted above modals).
            if (m.id === 'spellbook-overlay') {
                if (typeof closeSpellbook === 'function') closeSpellbook();
                else m.classList.remove('show');
                return;
            }
            m.classList.remove('show');
        });
    // Re-sync the question-modal avatar-hide flag (covers the math gate and
    // scouts primer, which this bulk-close may have just dismissed).
    if (typeof _refreshQuestionModalFlag === 'function') _refreshQuestionModalFlag();
}

// Returns true if the win or lose end-of-level overlay is visible.
export function _isEndOverlayOpen() {
    return document.getElementById('ov-win').classList.contains('show') ||
        document.getElementById('ov-lose').classList.contains('show');
}

// Returns true if the main game screen is the active screen.
export function _isOnGameScreen() {
    return document.getElementById('screen-game').classList.contains('active');
}

// Handles Escape key presses with the following priority order:
//   1. Quiz overlay open      → skip the quiz (no bonus awarded)
//   2. Any modal open         → close all open modals
//   3. Win / lose overlay     → hide the overlay (stay on game screen)
//   4. On the game screen     → toggle pause
//   5. Anywhere else          → go back to the previous screen (via ui.js)
export function _handleEscapeKey() {
    _runEscapeCleanup();

    if (_isQuizOpen()) {
        skipQuiz();
        return;
    }
    if (_isAnyModalOpen()) {
        _closeAllModals();
        return;
    }
    if (_isEndOverlayOpen()) {
        hideResultOverlays();
        return;
    }
    if (_isOnGameScreen()) {
        togglePause();
        return;
    }
    // B sheet overlay over a running puzzle: Escape closes back into the
    // puzzle like B/BACK do - diving into screen history here would strand
    // the paused run on some stale screen with no way back.
    if (typeof isHubGameOverlay === 'function' && isHubGameOverlay()
        && typeof closeHubToGame === 'function') {
        closeHubToGame();
        return;
    }
    // K tree overlay over a running puzzle: same no-strand rule as B.
    if (typeof isTreeGameOverlay === 'function' && isTreeGameOverlay()
        && typeof closeTreeToGame === 'function') {
        closeTreeToGame();
        return;
    }
    goToPreviousScreen();
}




//------------------------------------------------------------------------
//---------------TITLE SCREEN PUZZLE DECORATION---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Creates a single decoration cell div.
// Visible cells get a staggered animation delay to produce a wave shimmer.
// panelIndex, row, col are used to calculate that delay.
export function buildDecoCell(isFilled, panelIndex, row, col) {
    const cell = document.createElement('div');
    cell.className = 'title-deco-cell';
    cell.style.opacity = isFilled ? '1' : '0';

    if (isFilled) {
        const delay = (
            panelIndex * DECO_PANEL_DELAY_STEP +
            row * DECO_ROW_DELAY_STEP +
            col * DECO_COL_DELAY_STEP
        ).toFixed(2);
        cell.style.animationDelay = `${delay}s`;
        cell.dataset.panel = panelIndex;
    }

    return cell;
}

// Creates a single decoration panel div from a 5×5 bitmap grid.
// Appends one cell div per bitmap entry.
export function buildDecoPanel(grid, panelIndex) {
    const panel = document.createElement('div');
    panel.className = 'title-deco-panel';
    panel.dataset.panel = panelIndex;

    grid.forEach((row, r) => {
        row.forEach((value, c) => {
            panel.appendChild(buildDecoCell(value === 1, panelIndex, r, c));
        });
    });

    return panel;
}

// Builds all pixel-art decoration panels and injects them into
// the #tdeco container on the title screen.
export function initTitleDecoration() {
    const container = document.getElementById('tdeco');

    DECO_PANELS.forEach((grid, panelIndex) => {
        container.appendChild(buildDecoPanel(grid, panelIndex));
    });
}




//------------------------------------------------------------------------
//-------------------INITIALIZATION & BOOTSTRAP---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Everything below is a top-level statement that runs immediately on load.
// Relative order is preserved from before the refactor since these are
// independent side-effecting calls (language setup, settings, listener
// registration, initial DOM build) rather than function declarations.

// Allow forcing the interface language via URL (?lang=de or ?lang=en).
// Handy for testing localized layouts and sharing language-specific links;
// it only overrides the boot-time value, clicking EN/DE still persists normally.
// Phase 3 (step 10): this file is now the LAST entry import - a real ES
// module. These top-level statements used to run after every classic
// script, but in module order they run BEFORE the entry body installs the
// globalThis bridges (SETTINGS, hasSeen, ...) that applySettings() and the
// game code below read (globalThis.SETTINGS in mouse-button-handlers.js
// threw, aborting the whole module graph). Defer the bootstrap to
// DOMContentLoaded: by then the entry body has finished and every bridge
// exists (same idiom as MIGRATION.md step 7).
function _bootstrap() {
try {
    const _urlLang = new URLSearchParams(location.search).get('lang');
    if (_urlLang === 'en' || _urlLang === 'de') {
        SETTINGS.lang = _urlLang;
    }
} catch { /* URLSearchParams unavailable - ignore */ }

// Set the active language from the persisted settings (falls back to 'en').
setLang(SETTINGS.lang || 'en');

// Wire up settings modal controls and apply any saved user preferences
// (volume levels, axis-lock toggle, etc.) on startup.
initSettingsControls();
applySettings();

// Global keydown listener - currently only acts on the Escape key.
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        _handleEscapeKey();
    }
});

// Ends any active paint stroke when the mouse button is released anywhere
// on the document. Placed here (not on the grid) so releasing outside the
// puzzle area still correctly stops painting. stopPainting() is in input.js.
document.addEventListener('mouseup', stopPainting);

// Re-scales the puzzle grid whenever the window is resized, but only when
// the game screen is active to avoid unnecessary DOM work. scalePuzzle() is
// in grid.js.
window.addEventListener('resize', () => {
    if (_isOnGameScreen()) {
        scalePuzzle();
    }
});

// Starts title screen BGM on the very first user click.
// Uses { once: true } so the listener removes itself immediately after
// firing - respects the browser autoplay policy that requires a user gesture.
document.addEventListener('click', () => {
    Audio_Manager.playBGM('title');
}, { once: true });

// Disable the native right-click context menu across the whole page
// to prevent players from accidentally exposing browser dev tools mid-game
document.addEventListener('contextmenu', e => e.preventDefault());

// Run immediately on load so the decoration is ready when the title appears
initTitleDecoration();
}

if (document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', _bootstrap);
} else {
    _bootstrap();
}