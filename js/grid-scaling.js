//------------------------------------------------------------------------
//----------------------------CONSTANTS & STATE----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Fraction of the viewport WIDTH the puzzle should occupy.
// 0.90 means the puzzle can use up to 90% of the window width.
// Lower = narrower / smaller puzzle.
const SCALE_FILL_W = 0.90;

// Hard upper ceiling on the auto-scale factor.
// Prevents tiny 5x5 puzzles from becoming enormous on large monitors.
const SCALE_MAX = 2.4;

// How many scale units change per Ctrl+Wheel scroll tick.
const ZOOM_SPEED = 0.15;

// Minimum and maximum zoom values allowed during manual Ctrl+Wheel zoom.
const ZOOM_MANUAL_MIN = 0.3;
const ZOOM_MANUAL_MAX = 5.0;

// How many pixels the puzzle or inventory scrolls per arrow key press.
const ARROW_SCROLL_STEP = 40;

// Small breathing room multiplier so the puzzle never touches the very
// bottom edge of the available vertical space.
const SCALE_BREATHING_ROOM = 0.97;

// The zoom level currently applied to the puzzle scaler element.
let currentZoom = 1;

// The zoom level that was last calculated by the auto-fit scaler.
// Used as a reference point when scaling secondary elements (e.g. HUD)
// relative to the default fit, so they only change on manual zoom.
let baselineZoom = 1;

// True when the player has manually zoomed via Ctrl+Wheel.
// Prevents scalePuzzle() from overriding the player's chosen zoom level
// on resize events or grid rebuilds.
let manualZoomActive = false;

// Cached natural (unscaled) puzzle dimensions from the last scalePuzzle()
// call. Reused by manual zoom so we never have to re-measure — measuring
// is destructive (temporarily resets transform/wrapper sizing) and was
// previously being called a second time in _onCtrlWheelZoom without ever
// restoring what it clobbered.
let _lastNaturalW = 0;
let _lastNaturalH = 0;

// Tracks which UI zone the mouse is currently hovering over.
// Used by the arrow-key scroll router to decide which element to scroll.
// Possible values: 'puzzle' | 'inventory' | 'none'
let mouseZone = 'none';


//------------------------------------------------------------------------
//----------------------------DOM ELEMENT HELPERS--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Looks up the puzzle scaler element. Centralized so the id string only
// lives in one place.
function _getScaler() {
    return document.getElementById('puzzle-scaler');
}

// Looks up the puzzle scaler's wrapper element (the scroll/zoom container).
function _getWrap() {
    return document.getElementById('puzzle-scaler-wrap');
}

// Looks up the inventory's scrollable list element.
function _getInvList() {
    return document.getElementById('inv-list');
}


//------------------------------------------------------------------------
//----------------------------ZOOM HELPERS----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Resets the puzzle scaler element's transform to scale(1) and temporarily
// clears the wrapper's forced dimensions so the browser can report the
// scaler's true natural (unscaled) pixel size via offsetWidth/Height.
//
// Why clear the wrapper? _applyZoom() sets wrap.style.height and minWidth to
// the post-scale pixel values. If those are left in place while we measure,
// the browser constrains the scaler's reported size to fit inside those stale
// dimensions — which means each resize event measures a progressively smaller
// "natural" size and calculates a progressively smaller scale. This was the
// cause of the F12 devtools-open/close shrink bug.
//
// The wrapper dimensions are restored immediately by the _applyZoom() call
// that always follows this function in scalePuzzle().
function _measureNaturalSize(scaler) {
    const wrap = _getWrap();
    if (wrap) {
        wrap.style.height = '';
        wrap.style.minWidth = '';
    }

    // Temporarily remove the scaler from flex flow so its offsetWidth
    // reflects true content width, not the flex container's available space.
    const prevPosition = scaler.style.position;
    const prevLeft = scaler.style.left;
    scaler.style.position = 'absolute';
    scaler.style.left = '-99999px';
    scaler.style.transform = 'scale(1)';

    const result = {
        w: scaler.offsetWidth,
        h: scaler.offsetHeight
    };

    scaler.style.position = prevPosition;
    scaler.style.left = prevLeft;

    return result;
}

// Calculates how much space is available for the puzzle in the viewport.
// Subtracts the actual pixel heights of the top bar and inventory strip
// so the puzzle always fits the real remaining space, regardless of
// inventory content or window size.
// Returns the available width and height as an object.
function _calcAvailableSpace() {
    const metaBar = document.querySelector('.game-meta');
    // NOTE: the inventory bar's real id/class is #inv-panel (see inventory.css).
    // '.inv-strip' never matches anything, so this used to silently return
    // null and skip subtracting the inventory bar's height entirely.
    const invStrip = document.getElementById('inv-panel');
    const usedH = (metaBar ? metaBar.offsetHeight : 0)
        + (invStrip ? invStrip.offsetHeight : 0);

    return {
        w: window.innerWidth * SCALE_FILL_W,
        h: (window.innerHeight - usedH) * SCALE_BREATHING_ROOM
    };
}

// Writes currentZoom to the scaler's CSS transform and resizes the wrapper
// div so the browser's scrollbars appear correctly when zoomed in.
//
// Why resize the wrapper? CSS transform does NOT affect layout flow — the
// element keeps its original footprint in the document even after scaling.
// By explicitly setting the wrapper's height and minWidth to the post-scale
// dimensions, we force the page to scroll properly when the player has
// zoomed in beyond the viewport bounds.
function _applyZoom() {
    const scaler = _getScaler();
    const wrap = _getWrap();
    if (!scaler || !wrap) return;

    scaler.style.transform = `scale(${currentZoom})`;

    wrap.style.height = (scaler.offsetHeight * currentZoom) + 'px';
    wrap.style.minWidth = (scaler.offsetWidth * currentZoom) + 'px';

    // Reposition the shield border (if active) after every zoom change,
    // since it uses position:fixed and getBoundingClientRect screen coords.
    const border = document.getElementById('fx-shield-border');
    if (border?._reposition) border._reposition();

    // keep the variance shield bubble in sync with the new zoom immediately
    const vsBubble = document.getElementById('variance-shield-bubble');
    if (vsBubble?._reposition) vsBubble._reposition();

    _updateZoomBarUI();
}



// _updateZoomBarUI — syncs the vertical zoom-bar fill height to currentZoom,
// mapped between the manual zoom bounds. Called from every path that can
// change currentZoom (auto-fit scale, wheel zoom, +/- buttons) so the bar
// never drifts out of sync with the actual puzzle scale.
function _updateZoomBarUI() {
    const fill = document.getElementById('zoom-fill');
    if (!fill) return;

    const pct = (currentZoom - ZOOM_MANUAL_MIN) / (ZOOM_MANUAL_MAX - ZOOM_MANUAL_MIN);
    const clampedPct = Math.max(0, Math.min(1, pct));
    fill.style.height = `${clampedPct * 100}%`;
}

// _adjustZoom — shared clamp+apply step for any manual zoom input
// (Ctrl+Wheel or the +/- buttons). Marks manualZoomActive so scalePuzzle()
// stops overriding the player's chosen zoom level on resize/rebuild.
function _adjustZoom(delta) {
    manualZoomActive = true;
    currentZoom = Math.max(ZOOM_MANUAL_MIN, Math.min(currentZoom + delta, ZOOM_MANUAL_MAX));
    _applyZoom();
    _applyVerticalCentering(_lastNaturalH * currentZoom);
}

// zoomInBtn / zoomOutBtn — public entry points wired to the zoom-bar buttons.
function zoomInBtn() {
    _adjustZoom(ZOOM_SPEED);
}

function zoomOutBtn() {
    _adjustZoom(-ZOOM_SPEED);
}

//------------------------------------------------------------------------
//----------------------------PUZZLE SCALER---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Clears all zoom state and removes leftover wrapper dimensions from the
// previous level so scalePuzzle() can measure the new grid's natural size
// correctly on the next call.
// Call this whenever a new puzzle level is loaded.
function resetZoom() {
    manualZoomActive = false;
    currentZoom = 1;
    baselineZoom = 1;

    const wrap = _getWrap();
    if (wrap) {
        wrap.style.height = '';
        wrap.style.minWidth = '';
    }

    const container = document.querySelector('.puzzle-and-sidebar');
    if (container) container.style.marginTop = '0px'; 
}


// How strongly to pull the puzzle toward vertical center when there's
// leftover space. 0 = stay pinned top, 1 = fully centered.
const VERTICAL_CENTER_FACTOR = 0.6;

// Nudges .puzzle-and-sidebar down (via margin-top) when the scaled puzzle
// is shorter than the available vertical space, so it sits closer to
// center instead of always hugging the top. Does nothing (stays at 0)
// once the puzzle is tall enough to need the full available height —
// this naturally accounts for row count AND the tallest column-clue
// stack, because both are already baked into natural.h via
// _measureNaturalSize() (cell rows + column clue header rows).
function _applyVerticalCentering(scaledHeight) {
    const container = document.querySelector('.puzzle-and-sidebar');
    if (!container) return;

    const avail = _calcAvailableSpace();
    const leftover = avail.h - scaledHeight;

    container.style.marginTop = leftover > 0
        ? `${Math.floor(leftover * VERTICAL_CENTER_FACTOR)}px`
        : '0px';
}



// Calculates and applies the best-fit scale for the current puzzle grid
// relative to the viewport.
//   1. Measures the element's natural (unscaled) pixel dimensions.
//   2. Calculates the maximum scale that fits within SCALE_FILL_W of the
//      viewport width and the remaining height, capped at SCALE_MAX.
//   3. Only updates currentZoom if the player hasn't manually zoomed —
//      this preserves the player's chosen zoom across resize events.
//   4. Calls _applyZoom() to write the transform and fix wrapper dimensions.
//
// Called by: buildGrid() after DOM paint, the resize listener in main.js,
// and implicitly when Ctrl+Wheel resets zoom via _applyZoom() directly.
function scalePuzzle() {
    const scaler = _getScaler();
    if (!scaler) return;

    const natural = _measureNaturalSize(scaler);
    _lastNaturalW = natural.w;
    _lastNaturalH = natural.h;

    const avail = _calcAvailableSpace();
    const autoScale = Math.min(avail.w / natural.w, avail.h / natural.h, SCALE_MAX);

    if (!manualZoomActive) {
        currentZoom = autoScale;
        baselineZoom = autoScale;
    }

    _applyZoom();
    _applyVerticalCentering(natural.h * currentZoom);
}


//------------------------------------------------------------------------
//----------------------------MOUSE WHEEL ZOOM------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Handles Ctrl+Wheel events over the puzzle wrapper.
// Adjusts currentZoom by ZOOM_SPEED per scroll tick, clamps it to the
// allowed range, and marks manualZoomActive so scalePuzzle() stops
// overriding the player's chosen zoom level.
function _onCtrlWheelZoom(e) {
    if (!e.ctrlKey) return;

    const wrap = e.target.closest('#puzzle-scaler-wrap');
    if (!wrap) return;

    e.preventDefault();
    _adjustZoom(e.deltaY < 0 ? ZOOM_SPEED : -ZOOM_SPEED);
}

// passive:false is required here to allow e.preventDefault() inside the handler.
document.addEventListener('wheel', _onCtrlWheelZoom, { passive: false });


//------------------------------------------------------------------------
//----------------------------ARROW KEY SCROLL ROUTING-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Routes left/right arrow keys to either the puzzle or the inventory
// scroll container, depending on which zone the mouse is currently in.
// This way the player can scroll either panel without clicking into it first.

// Updates mouseZone based on which element the cursor is hovering over.
function _onMouseMoveUpdateZone(e) {
    const puzzleWrap = _getWrap();
    const invList = _getInvList();

    if (puzzleWrap && puzzleWrap.matches(':hover')) {
        mouseZone = 'puzzle';
    } else if (invList && invList.matches(':hover')) {
        mouseZone = 'inventory';
    } else {
        mouseZone = 'none';
    }
}

// Scrolls the active zone left or right when an arrow key is pressed.
function _onArrowKeyScroll(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const puzzleWrap = _getWrap();
    const invList = _getInvList();

    if (mouseZone === 'puzzle' && puzzleWrap) {
        e.preventDefault();
        puzzleWrap.scrollLeft += dir * ARROW_SCROLL_STEP;
    } else if (mouseZone === 'inventory' && invList) {
        e.preventDefault();
        invList.scrollLeft += dir * ARROW_SCROLL_STEP;
    }
}

// Registers the mouse-move zone tracker and the arrow-key scroll handler.
function _initArrowKeyScrollRouting() {
    document.addEventListener('mousemove', _onMouseMoveUpdateZone, { passive: true });
    document.addEventListener('keydown', _onArrowKeyScroll);
}


//------------------------------------------------------------------------
//----------------------------INIT-------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

_initArrowKeyScrollRouting();