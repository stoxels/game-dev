//------------------------------------------------------------------------
//-------------------TOUCH PAINTING + PINCH ZOOM ON THE PUZZLE------------
//------------------------------------------------------------------------
// The grid cells are driven by mouse events (js/grid.js: onmousedown /
// onmouseenter / onmouseup on every cell, with drag-painting through the
// enter events). A finger only produces a tap's worth of those, and a drag
// would scroll the page instead of painting a line.
//
// ONE finger that starts on a cell becomes the same mouse events a mouse
// drag would produce, dispatched on the cells themselves:
//   touch down      -> mousedown on the cell       (starts a stroke)
//   touch moves     -> mouseleave / mouseenter     (paints cells passed over)
//   touch up/cancel -> mouseup on the last cell    (ends the stroke)
// Cells skipped by a fast swipe are filled in by sampling along the path.
// Fill versus mark follows the game's Touchpad Mode FILL/MARK button, exactly
// as it does for a touchpad user.
//
// TWO fingers on the puzzle pinch to zoom and drag to pan (large puzzles are
// tiny on a phone otherwise). The first finger's press is held back for a
// moment so that starting a pinch never fills a cell by accident.
//
// Touch pointers only: mouse and pen input never reach this code, so PC play
// is unchanged.
//
// Side-effect module (no exports).

const SAMPLE_STEP_PX = 5;
const HOLD_BACK_MS = 90;     // wait for a possible second finger before painting
const MOVE_START_PX = 6;     // a drag this far starts the stroke immediately
const PINCH_MIN_DIST_PX = 20;

const touches = new Map();   // pointerId -> { x, y }
let stroke = null;           // { id, x, y, cell, started, timer }
let gesture = null;          // { dist, cx, cy, zoom }

// The grid cell under a point. The player's avatar (fixed, above the grid)
// can sit over cells, and a fingertip should reach the cell beneath it, so
// avatar elements are looked through; any other overlay blocks the touch.
function cellAt(x, y) {
    for (const el of document.elementsFromPoint(x, y)) {
        if (el.closest('#player-avatar-wrapper, #player-avatar-simple')) continue;
        return el.classList && el.classList.contains('gc') ? el : null;
    }
    return null;
}

function fireMouse(type, el, x, y, bubbles) {
    el.dispatchEvent(new MouseEvent(type, {
        bubbles, cancelable: true, view: window, button: 0, buttons: type === 'mouseup' ? 0 : 1,
        clientX: x, clientY: y,
    }));
}

function enterCell(cell, x, y) {
    if (!stroke || cell === stroke.cell) return;
    if (stroke.cell) fireMouse('mouseleave', stroke.cell, x, y, false);
    stroke.cell = cell;
    fireMouse('mouseenter', cell, x, y, false);
}

// Fire the held-back press: the finger stayed down alone, or it moved.
function startStroke() {
    if (!stroke || stroke.started) return;
    clearTimeout(stroke.timer);
    stroke.started = true;
    // A real mouse always hovers before it presses.
    fireMouse('mouseenter', stroke.cell, stroke.x0, stroke.y0, false);
    fireMouse('mousedown', stroke.cell, stroke.x0, stroke.y0, true);
}

function finishStroke(x, y) {
    if (!stroke) return;
    clearTimeout(stroke.timer);
    const { cell, started } = stroke;
    stroke = null;
    if (!cell) return;
    if (started) fireMouse('mouseup', cell, x, y, true);
    fireMouse('mouseleave', cell, x, y, false);
}

// Drop an unstarted stroke without painting anything (a pinch is beginning).
function discardStroke() {
    if (!stroke) return;
    clearTimeout(stroke.timer);
    if (stroke.started) finishStroke(stroke.x, stroke.y);
    else stroke = null;
}

function inPuzzle(el) {
    return !!(el && el.closest && el.closest('#puzzle-scaler-wrap'));
}

function pair() {
    const pts = [...touches.values()];
    return pts.length >= 2 ? [pts[0], pts[1]] : null;
}

function beginGesture() {
    const p = pair();
    if (!p) return;
    const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    const cx = (p[0].x + p[1].x) / 2;
    const cy = (p[0].y + p[1].y) / 2;
    gesture = {
        dist: Math.max(dist, PINCH_MIN_DIST_PX),
        cx,
        cy,
        zoom: typeof globalThis.currentZoom === 'number' ? globalThis.currentZoom : 1,
        // The cell under the fingers stays under them while zooming / panning.
        anchor: cellAt(cx, cy),
    };
}

// The puzzle scrolls inside #game-main (the page itself never scrolls).
function scroller() {
    return document.querySelector('#screen-game .game-main');
}

function scrollBy(dx, dy) {
    const box = scroller();
    if (!box) return;
    box.scrollLeft += dx;
    box.scrollTop += dy;
}

function updateGesture() {
    const p = pair();
    if (!p || !gesture) return;
    const dist = Math.max(Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), PINCH_MIN_DIST_PX);
    const cx = (p[0].x + p[1].x) / 2;
    const cy = (p[0].y + p[1].y) / 2;
    const box = scroller();
    if (!box) return;
    const before = typeof globalThis.currentZoom === 'number' ? globalThis.currentZoom : gesture.zoom;
    if (typeof globalThis.setPuzzleZoom === 'function') {
        globalThis.setPuzzleZoom(gesture.zoom * (dist / gesture.dist));
    }
    const after = typeof globalThis.currentZoom === 'number' ? globalThis.currentZoom : before;
    if (gesture.anchor && gesture.anchor.isConnected) {
        // Put the anchor cell back under the fingers' midpoint (zoom + pan).
        const r = gesture.anchor.getBoundingClientRect();
        scrollBy(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
    } else {
        // No cell under the fingers: scale about the midpoint, then pan.
        if (before > 0 && after !== before) {
            const k = after / before;
            const r = box.getBoundingClientRect();
            scrollBy((box.scrollLeft + gesture.cx - r.left) * (k - 1), (box.scrollTop + gesture.cy - r.top) * (k - 1));
        }
        scrollBy(gesture.cx - cx, gesture.cy - cy);
    }
    gesture.cx = cx;
    gesture.cy = cy;
}

function onPointerDown(e) {
    if (e.pointerType !== 'touch') return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY, onPuzzle: inPuzzle(target) || !!cellAt(e.clientX, e.clientY) });

    // Second finger on the puzzle: pinch / pan, never a stroke.
    const onPuzzle = [...touches.values()].filter((t) => t.onPuzzle).length;
    if (onPuzzle >= 2) {
        discardStroke();
        beginGesture();
        e.preventDefault();
        e.stopPropagation();
        return;
    }

    if (stroke) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell) return;
    e.preventDefault();
    e.stopPropagation();
    stroke = {
        id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY,
        cell, started: false, timer: null,
    };
    stroke.timer = setTimeout(startStroke, HOLD_BACK_MS);
}

function onPointerMove(e) {
    const t = touches.get(e.pointerId);
    if (!t) return;
    t.x = e.clientX;
    t.y = e.clientY;

    if (gesture) {
        e.preventDefault();
        updateGesture();
        return;
    }
    if (!stroke || e.pointerId !== stroke.id) return;
    e.preventDefault();
    if (!stroke.started) {
        if (Math.hypot(e.clientX - stroke.x0, e.clientY - stroke.y0) < MOVE_START_PX) return;
        startStroke();
    }
    const x0 = stroke.x;
    const y0 = stroke.y;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / SAMPLE_STEP_PX));
    for (let i = 1; i <= steps; i++) {
        const x = x0 + (dx * i) / steps;
        const y = y0 + (dy * i) / steps;
        const cell = cellAt(x, y);
        if (cell) enterCell(cell, x, y);
    }
    stroke.x = e.clientX;
    stroke.y = e.clientY;
}

function onPointerEnd(e) {
    if (!touches.has(e.pointerId)) return;
    touches.delete(e.pointerId);
    if (gesture) {
        // Fewer than two fingers left: the gesture is over; the remaining
        // finger does nothing until it lifts and presses again.
        if (touches.size < 2) gesture = null;
        else beginGesture();
        return;
    }
    if (stroke && e.pointerId === stroke.id) {
        // A tap is released before the hold-back timer: press it now.
        startStroke();
        finishStroke(e.clientX, e.clientY);
    }
}

function init() {
    // Capture phase: claim the touch before the page or other handlers do.
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerEnd, true);
    document.addEventListener('pointercancel', onPointerEnd, true);
}

document.addEventListener('DOMContentLoaded', init, { once: true });
