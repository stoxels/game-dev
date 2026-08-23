//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Tracks whether the game is currently in a paused state.
// Managed exclusively through pauseGame() / unpauseGame().
let _gamePaused = false;

// Animation timing for the title decoration shimmer wave effect
const DECO_PANEL_DELAY_STEP = 0.4;  // seconds between panels
const DECO_ROW_DELAY_STEP = 0.08; // seconds between rows within a panel
const DECO_COL_DELAY_STEP = 0.05; // seconds between columns within a row

// Pixel-art bitmaps (5×5) used on the title screen decoration.
// 1 = filled cell, 0 = invisible cell.
const DECO_PANELS = [
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

// Shows the pause overlay and stops the timer.
// Guards against pausing when the level is already finished (dead).
function pauseGame() {
    if (_gamePaused || dead) return;
    _gamePaused = true;
    pauseTimer(); // defined in timer.js
    document.getElementById('pause-overlay').classList.add('show');
}

// Hides the pause overlay and resumes the timer.
function unpauseGame() {
    if (!_gamePaused) return;
    _gamePaused = false;
    document.getElementById('pause-overlay').classList.remove('show');
    resumeTimer(); // defined in timer.js
}

// Toggles between paused and unpaused.
// Does nothing if the level has already ended (dead flag).
function togglePause() {
    if (dead) return;
    _gamePaused ? unpauseGame() : pauseGame();
}




//------------------------------------------------------------------------
//-------------------ESCAPE KEY HANDLER----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Runs cleanup for any active special-mechanic overlays before
// the escape key resolves its main action. These are optional globals
// defined in their respective mechanic files, so we guard before calling.
function _runEscapeCleanup() {
    if (typeof _bayesTrapsCleanup === 'function') {
        _bayesTrapsCleanup(false);
    }
    if (typeof clearActiveRandomWalkers === 'function') {
        clearActiveRandomWalkers();
    }
}

// Returns true if the quiz overlay is currently visible.
function _isQuizOpen() {
    return document.getElementById('quiz-overlay').classList.contains('show');
}

// Returns true if any modal backdrop is currently visible.
function _isAnyModalOpen() {
    return !!document.querySelector('.modal-bg.show');
}

// Closes all open modal backdrops at once.
function _closeAllModals() {
    document.querySelectorAll('.modal-bg.show')
        .forEach(m => m.classList.remove('show'));
}

// Returns true if the win or lose end-of-level overlay is visible.
function _isEndOverlayOpen() {
    return document.getElementById('ov-win').classList.contains('show') ||
        document.getElementById('ov-lose').classList.contains('show');
}

// Returns true if the main game screen is the active screen.
function _isOnGameScreen() {
    return document.getElementById('screen-game').classList.contains('active');
}

// Handles Escape key presses with the following priority order:
//   1. Quiz overlay open      → skip the quiz (no bonus awarded)
//   2. Any modal open         → close all open modals
//   3. Win / lose overlay     → hide the overlay (stay on game screen)
//   4. On the game screen     → toggle pause
//   5. Anywhere else          → go back to the previous screen (via ui.js)
function _handleEscapeKey() {
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
    goToPreviousScreen();
}




//------------------------------------------------------------------------
//---------------TITLE SCREEN PUZZLE DECORATION---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Creates a single decoration cell div.
// Visible cells get a staggered animation delay to produce a wave shimmer.
// panelIndex, row, col are used to calculate that delay.
function buildDecoCell(isFilled, panelIndex, row, col) {
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
function buildDecoPanel(grid, panelIndex) {
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
function initTitleDecoration() {
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

// Set the active language from the persisted settings (falls back to 'en').
setLang(SETTINGS.lang || 'en');

// Wire up settings modal controls and apply any saved user preferences
// (volume levels, axis-lock toggle, etc.) on startup.
initSettingsControls();
applySettings();

// Global keydown listener — currently only acts on the Escape key.
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
// firing — respects the browser autoplay policy that requires a user gesture.
document.addEventListener('click', () => {
    Audio_Manager.playBGM('title');
}, { once: true });

// Disable the native right-click context menu across the whole page
// to prevent players from accidentally exposing browser dev tools mid-game
document.addEventListener('contextmenu', e => e.preventDefault());

// Run immediately on load so the decoration is ready when the title appears
initTitleDecoration();