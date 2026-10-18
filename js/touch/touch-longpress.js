//------------------------------------------------------------------------
//-------------------TOUCH HOLD: TOOLTIP / RIGHT-CLICK / DRAG-------------
//------------------------------------------------------------------------
// Parts of the game assume a mouse: tooltips appear on hover, items are used
// or equipped with a right-click, and hub items are dragged with
// mousedown / mousemove / mouseup. A finger can do none of that directly.
// Holding a finger still on something for about half a second now means:
//
//   * on a thing the game gives a right-click action (hub item chips,
//     unique-stash cells, charms in the inventory, puzzle-item slots):
//     a 'contextmenu' event is sent to it - the same as a right-click.
//   * on anything else: the hover is played (mouseenter / mouseover /
//     mousemove) so the existing hover tooltip appears; touching elsewhere
//     (or a few seconds passing) plays the matching mouseout / mouseleave.
//   * on the on-screen touch controls: a small label bubble.
//
// Hub item chips can also be DRAGGED: hold a moment (the chip "lifts"), then
// move - the same mousedown / mousemove / mouseup stream a mouse drag makes.
// A quick swipe starting on a chip still scrolls the stash as usual.
//
// Touch input only: mouse and keyboard behaviour is untouched. A tap, a
// swipe, the grid (js/touch/touch-grid.js) and the joystick never trigger it.
//
// Side-effect module (no exports).
import { t } from '../translation/translations.js';

const HOLD_MS = 480;
const LIFT_MS = 230;           // hub chips: hold this long, then moving drags
const MOVE_TOLERANCE_PX = 12;
const LIFT_STILL_PX = 8;       // a lifted chip held this still is a right-click
const AUTO_DISMISS_MS = 4500;
const CLICK_SUPPRESS_MS = 900;

// Things the game gives a right-click action to.
const CONTEXT_TARGETS = '.eg-item-chip, .eg-unique-cell, .sb3-charm-row[data-charm-key], .sb3-theorem';
// Hub item chips: draggable by hold-then-move.
const DRAG_TARGETS = '.eg-item-chip';

let holdTimer = null;
let liftTimer = null;
let start = null;          // { id, x, y, x0, y0, target, lifted, dragMoved }
let active = null;         // hover being held open: { chain, el, x, y }
let dismissTimer = null;
let bubble = null;
let suppressClickUntil = 0;

function chainOf(el) {
    const chain = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) chain.push(n);
    return chain;
}

function mouse(type, el, x, y, bubbles, button = 0) {
    return el.dispatchEvent(new MouseEvent(type, {
        bubbles, cancelable: true, view: window, clientX: x, clientY: y,
        button, buttons: type === 'mouseup' || type === 'contextmenu' ? 0 : (button === 2 ? 2 : 1),
    }));
}

function showHover(el, x, y) {
    const chain = chainOf(el);
    // Enter from the outermost ancestor inwards, like a real pointer move.
    for (let i = chain.length - 1; i >= 0; i--) mouse('mouseenter', chain[i], x, y, false);
    mouse('mouseover', el, x, y, true);
    mouse('mousemove', el, x, y, true);
    active = { chain, el, x, y };
}

function hideHover() {
    clearTimeout(dismissTimer);
    if (bubble) { bubble.remove(); bubble = null; }
    if (!active) return;
    const { chain, el, x, y } = active;
    active = null;
    mouse('mouseout', el, x, y, true);
    for (const node of chain) mouse('mouseleave', node, x, y, false);
}

function showBubble(btn, x) {
    bubble = document.createElement('div');
    bubble.className = 'touch-label-bubble';
    bubble.textContent = t(btn.dataset.touchLabel);
    document.body.appendChild(bubble);
    const w = bubble.offsetWidth;
    const left = Math.min(Math.max(8, x - w / 2), innerWidth - w - 8);
    const top = Math.max(8, btn.getBoundingClientRect().top - bubble.offsetHeight - 10);
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
}

function clearTimers() {
    clearTimeout(holdTimer);
    clearTimeout(liftTimer);
    holdTimer = null;
    liftTimer = null;
}

function cancelPending() {
    clearTimers();
    start = null;
}

// The chip lifts: from here, moving the finger drags it.
function lift() {
    liftTimer = null;
    if (!start || start.lifted) return;
    const chip = start.target.closest(DRAG_TARGETS);
    if (!chip) return;
    start.lifted = true;
    start.chip = chip;
    mouse('mouseenter', chip, start.x, start.y, false);
    mouse('mousedown', chip, start.x, start.y, true);
    suppressClickUntil = Number.MAX_SAFE_INTEGER;
}

function dropLifted(x, y) {
    if (!start || !start.lifted) return;
    const under = document.elementFromPoint(x, y) || document.body;
    mouse('mouseup', under, x, y, true);
    start.lifted = false;
}

function fire() {
    holdTimer = null;
    if (!start) return;
    const { x, y } = start;
    // A chip that lifted but never moved was a plain long-press: put it
    // back and treat it as a right-click.
    if (start.lifted) {
        if (Math.hypot(x - start.x0, y - start.y0) > LIFT_STILL_PX) return;
        dropLifted(x, y);
    }
    const el = document.elementFromPoint(x, y);
    start = null;
    if (!el) return;
    suppressClickUntil = Number.MAX_SAFE_INTEGER;   // tightened on release
    const ctl = el.closest('[data-touch-id]');
    if (ctl) {
        showBubble(ctl, x);
    } else {
        const target = el.closest(CONTEXT_TARGETS);
        if (target) mouse('contextmenu', target, x, y, true, 2);
        else showHover(el, x, y);
    }
    dismissTimer = setTimeout(hideHover, AUTO_DISMISS_MS);
}

function onPointerDown(e) {
    if (e.pointerType !== 'touch') return;
    hideHover();
    cancelPending();
    // Never fight the layout editor, the joystick or grid painting.
    if (document.body.classList.contains('touch-editing')) return;
    if (e.target.closest?.('#touch-move-zone, .gc')) return;
    start = {
        id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY,
        target: e.target, lifted: false, chip: null,
    };
    holdTimer = setTimeout(fire, HOLD_MS);
    if (e.target.closest?.(DRAG_TARGETS)) liftTimer = setTimeout(lift, LIFT_MS);
}

function onPointerMove(e) {
    if (!start || e.pointerId !== start.id) return;
    start.x = e.clientX;
    start.y = e.clientY;
    if (start.lifted) {
        e.preventDefault();
        mouse('mousemove', document.elementFromPoint(e.clientX, e.clientY) || document.body, e.clientX, e.clientY, true);
        return;
    }
    if (Math.hypot(e.clientX - start.x0, e.clientY - start.y0) > MOVE_TOLERANCE_PX) cancelPending();
}

function onPointerEnd(e) {
    if (e.pointerType !== 'touch') return;
    if (start && e.pointerId === start.id && start.lifted) {
        dropLifted(e.clientX, e.clientY);
    }
    if (!start || e.pointerId === start.id) cancelPending();
    // The release that ends a hold must not also count as a click.
    if (suppressClickUntil === Number.MAX_SAFE_INTEGER) {
        suppressClickUntil = performance.now() + CLICK_SUPPRESS_MS;
    }
}

function onTouchMove(e) {
    // A lifted chip owns the gesture: keep the page / stash from scrolling.
    if (start && start.lifted && e.cancelable) e.preventDefault();
}

function onClick(e) {
    if (performance.now() < suppressClickUntil) {
        suppressClickUntil = 0;
        e.preventDefault();
        e.stopPropagation();
    }
}

function onContextMenu(e) {
    // Holding must show our tooltip / run our action, not the browser's menu.
    if (active || bubble || start) e.preventDefault();
}

function init() {
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerEnd, true);
    document.addEventListener('pointercancel', onPointerEnd, true);
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    document.addEventListener('click', onClick, true);
    document.addEventListener('contextmenu', onContextMenu, true);
}

document.addEventListener('DOMContentLoaded', init, { once: true });
