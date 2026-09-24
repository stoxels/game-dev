import { _pt_container, _ptUpdateVirtualViewport, _pt_world } from './probability-tree-ui.js';
import { getPassiveTreeRootId, PT_FOCUS_SCALE, PT_NODE_RADIUS, PT_PADDING, PT_START_ID, PT_ZOOM_MAX, PT_ZOOM_MIN, PT_ZOOM_STEP } from './probability-tree.js';
import { STATE } from '../state.js';
//--- Phase 3 step 5: live accessors (external write sites stay untouched) ---
try { Object.defineProperty(globalThis, '_pt_mouseDownTime', { get() { return _pt_mouseDownTime; }, set(v) { _pt_mouseDownTime = v; }, configurable: true }); } catch (e) {}
//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Viewport transform state – applied to _pt_world every frame
export let _pt_scale = 1.0;
export let _pt_tx = 0;      // horizontal translation in px
export let _pt_ty = 0;      // vertical   translation in px

// Mouse / touch drag state
export let _pt_dragging = false;
export let _pt_dragStartX = 0;
export let _pt_dragStartY = 0;
export let _pt_dragTxStart = 0;    // _pt_tx at the moment the drag began
export let _pt_dragTyStart = 0;    // _pt_ty at the moment the drag began

// Shared with renderer: timestamp of the last mousedown,
// used to distinguish a short click from a real drag.
let _pt_mouseDownTime = 0;

// Active AbortController for _ptBindEvents – lets us cleanly remove all
// listeners if the viewport is re-initialised without a page reload.
export let _pt_abortController = null;
let _pt_transformFrame = 0;
let _pt_pendingZoomSync = false;
let _pt_resizeObserver = null;
let _pt_containerRect = null;

// Tracks the finger-separation distance from the previous touchmove frame,
// used to calculate the pinch-zoom scale factor.
export let _pt_lastPinchDist = null;

// Magic-number offsets that position the initial view on the tree.
// Tweak these if the default camera position needs to change.
export const PT_FIT_OFFSET_X = 1200;
export const PT_FIT_OFFSET_Y = -1850;

// Fine-tune the horizontal centering when snapping to the last picked node.
// Negative = shift camera left, positive = shift right.
export const PT_LAST_NODE_OFFSET_X = 0;



//------------------------------------------------------------------------
//-------------------TRANSFORM HELPERS--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Clamps a raw scale value to [PT_ZOOM_MIN, PT_ZOOM_MAX].
export function _ptClampScale(rawScale) {
    return Math.min(PT_ZOOM_MAX, Math.max(PT_ZOOM_MIN, rawScale));
}

// Zooms toward a specific point (pivotX, pivotY) in container-space.
// This keeps whatever is under the pivot stationary while the rest
// of the tree zooms around it.
export function _ptZoomToward(newScale, pivotX, pivotY) {
    const ratio = newScale / _pt_scale;
    _pt_tx = pivotX - ratio * (pivotX - _pt_tx);
    _pt_ty = pivotY - ratio * (pivotY - _pt_ty);
    _pt_scale = newScale;
}

// Reads the current _pt_scale and pushes the matching value to both the
// range-slider and the human-readable percentage label.
export function _ptSyncZoomBar() {
    const bar = document.getElementById('pt-zoom-bar');
    if (!bar) return;

    const pct = (_pt_scale - PT_ZOOM_MIN) / (PT_ZOOM_MAX - PT_ZOOM_MIN);
    bar.value = Math.round(pct * 100);

    const label = document.getElementById('pt-zoom-label');
    if (label) label.textContent = Math.round(_pt_scale * 100) + '%';
}

// Writes the current (_pt_tx, _pt_ty, _pt_scale) state onto the world
// element and keeps the zoom-bar UI in sync.
export function _ptApplyTransform() {
    if (_pt_world) {
        _pt_world.style.transform =
            `translate(${_pt_tx}px, ${_pt_ty}px) scale(${_pt_scale})`;
    }
    _ptSyncZoomBar();
    _ptUpdateVirtualViewport(_pt_scale, _pt_tx, _pt_ty);
}

function _ptScheduleTransform(syncZoom) {
    _pt_pendingZoomSync = _pt_pendingZoomSync || syncZoom;
    if (_pt_transformFrame) return;
    const flush = () => {
        _pt_transformFrame = 0;
        if (!_pt_world) return;
        _pt_world.style.transform =
            `translate(${_pt_tx}px, ${_pt_ty}px) scale(${_pt_scale})`;
        if (_pt_pendingZoomSync) _ptSyncZoomBar();
        _pt_pendingZoomSync = false;
        _ptUpdateVirtualViewport(_pt_scale, _pt_tx, _pt_ty);
    };
    if (typeof requestAnimationFrame === 'function') _pt_transformFrame = requestAnimationFrame(flush);
    else flush();
}

export function _ptSuspendViewport() {
    if (_pt_transformFrame && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(_pt_transformFrame);
    }
    _pt_transformFrame = 0;
    _pt_pendingZoomSync = false;
    _pt_dragging = false;
    _pt_lastPinchDist = null;
    if (_pt_container) _pt_container.style.cursor = 'grab';
}



//------------------------------------------------------------------------
//-------------------CAMERA & NODE POSITIONING------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Computes the pixel position of a node inside the world div,
// matching the offsetX/offsetY used by _ptDrawNodes and _ptDrawConnections.
export function _ptGetNodeWorldPos(skill, bounds) {
    const offsetX = PT_PADDING + PT_NODE_RADIUS - bounds.minX;
    const offsetY = PT_PADDING + PT_NODE_RADIUS - bounds.minY;
    return {
        wx: skill.x + offsetX,
        wy: skill.y + offsetY,
    };
}

// Centers the viewport on a specific skill node at the current scale.
// Uses the same offset calculation as the draw functions so the position is accurate.
export function _ptCenterOnNode(skill, bounds) {
    const cW = _pt_container.clientWidth || 800;
    const cH = _pt_container.clientHeight || 600;
    const { wx, wy } = _ptGetNodeWorldPos(skill, bounds);
    _pt_tx = (cW / 2) - (wx * _pt_scale) + PT_LAST_NODE_OFFSET_X;
    _pt_ty = (cH / 2) - (wy * _pt_scale);
    _ptApplyTransform();
}

export function _ptFocusNode(skill, bounds) {
    if (!skill || !_pt_container) return false;
    _pt_scale = _ptClampScale(PT_FOCUS_SCALE);
    _ptCenterOnNode(skill, bounds);
    return true;
}

// Fits the whole tree into the container on first load, then re-centers
// on the last picked node (if any) so returning players land where they left off.
export function _ptFitToView(bounds) {
    const treeW = bounds.maxX - bounds.minX + PT_PADDING * 2 + PT_NODE_RADIUS * 2;
    const treeH = bounds.maxY - bounds.minY + PT_PADDING * 2 + PT_NODE_RADIUS * 2;
    const cW = _pt_container.clientWidth || 800;
    const cH = _pt_container.clientHeight || 600;

    _pt_scale = Math.min(PT_ZOOM_MAX, Math.max(PT_ZOOM_MIN, Math.min(cW / treeW, cH / treeH)));
    const scaledW = treeW * _pt_scale;
    const scaledH = treeH * _pt_scale;
    _pt_tx = (cW - scaledW) / 2;
    _pt_ty = (cH - scaledH) / 2;

    const lastId = (typeof STATE !== 'undefined') && STATE.passiveTreeLastNode;
    const rootId = getPassiveTreeRootId();
    const focusId = (lastId === PT_START_ID && rootId ? rootId : lastId) || rootId;
    if (focusId && globalThis._pt_skillMap[focusId]) {
        _ptFocusNode(globalThis._pt_skillMap[focusId], bounds);
    } else {
        _ptApplyTransform();
    }
}



//------------------------------------------------------------------------
//-------------------INPUT HANDLERS-----------------------------------------
//------------------------------------------------------------------------
// Individual handler functions are defined here, above _ptBindEvents,
// so the binding function stays clean and readable.
//------------------------------------------------------------------------

// ---- Wheel (zoom) -------------------------------------------------------

// Zooms in or out around the mouse cursor position.
export function _ptOnWheel(e) {
    e.preventDefault();

    const dir = e.deltaY < 0 ? 1 : -1;
    const factor = 1 + dir * PT_ZOOM_STEP;
    const newScale = _ptClampScale(_pt_scale * factor);

    if (!_pt_containerRect) _pt_containerRect = _pt_container.getBoundingClientRect();
    const mx = e.clientX - _pt_containerRect.left;
    const my = e.clientY - _pt_containerRect.top;

    _ptZoomToward(newScale, mx, my);
    _ptScheduleTransform(true);
}

// ---- Mouse drag (pan) ---------------------------------------------------

// Records where the drag started so mousemove can compute the delta.
export function _ptOnMouseDown(e) {
    if (e.button !== 0) return;             // left button only
    if (e.target.closest('.pt-node')) return; // don't pan when clicking a node

    _pt_dragging = true;
    _pt_dragStartX = e.clientX;
    _pt_dragStartY = e.clientY;
    _pt_dragTxStart = _pt_tx;
    _pt_dragTyStart = _pt_ty;
    _pt_container.style.cursor = 'grabbing';
}

// Pans the viewport by the distance moved since mousedown.
export function _ptOnMouseMove(e) {
    if (!_pt_dragging) return;
    _pt_tx = _pt_dragTxStart + (e.clientX - _pt_dragStartX);
    _pt_ty = _pt_dragTyStart + (e.clientY - _pt_dragStartY);
    _ptScheduleTransform(false);
}

// Ends a drag and restores the grab cursor.
export function _ptOnMouseUp() {
    _pt_dragging = false;
    _pt_lastPinchDist = null;
    if (_pt_container) _pt_container.style.cursor = 'grab';
}

// ---- Touch drag + pinch-zoom --------------------------------------------

// Returns the pixel distance between two Touch objects.
export function _ptTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
}

// Handles the start of a one-finger pan or a two-finger pinch.
export function _ptOnTouchStart(e) {
    if (e.touches.length === 1) {
        if (e.target.closest('.pt-node')) return;
        _pt_dragging = true;
        _pt_dragStartX = e.touches[0].clientX;
        _pt_dragStartY = e.touches[0].clientY;
        _pt_dragTxStart = _pt_tx;
        _pt_dragTyStart = _pt_ty;
    }

    if (e.touches.length === 2) {
        // Two fingers -> cancel any pan and begin tracking pinch distance
        _pt_dragging = false;
        _pt_lastPinchDist = _ptTouchDistance(e.touches);
    }
}

// Handles one-finger pan movement and two-finger pinch-zoom movement.
export function _ptOnTouchMove(e) {
    e.preventDefault();

    if (e.touches.length === 1 && _pt_dragging) {
        _pt_tx = _pt_dragTxStart + (e.touches[0].clientX - _pt_dragStartX);
        _pt_ty = _pt_dragTyStart + (e.touches[0].clientY - _pt_dragStartY);
        _ptScheduleTransform(false);
    }

    if (e.touches.length === 2 && _pt_lastPinchDist !== null) {
        const dist = _ptTouchDistance(e.touches);
        const factor = dist / _pt_lastPinchDist;
        _pt_scale = _ptClampScale(_pt_scale * factor);
        _pt_lastPinchDist = dist;
        _ptScheduleTransform(true);
    }
}

// Resets drag and pinch state when all fingers lift.
export function _ptOnTouchEnd() {
    _pt_dragging = false;
    _pt_lastPinchDist = null;
}

// ---- Zoom-bar slider ----------------------------------------------------

// Prevents the mousedown from bubbling up to the container's pan handler.
export function _ptOnZoomBarMouseDown(e) {
    e.stopPropagation();
}

// Zooms toward the centre of the container when the slider is moved.
export function _ptOnZoomBarInput(zoomBar) {
    const pct = zoomBar.value / 100;
    const newScale = _ptClampScale(PT_ZOOM_MIN + pct * (PT_ZOOM_MAX - PT_ZOOM_MIN));

    // Pivot on the centre of the visible container
    const pivotX = _pt_container.clientWidth / 2;
    const pivotY = _pt_container.clientHeight / 2;

    _ptZoomToward(newScale, pivotX, pivotY);
    _ptScheduleTransform(true);
}



//------------------------------------------------------------------------
//-------------------EVENT BINDING-------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Registers all viewport input listeners on the container (and on window
// for mouse events that may leave the container while dragging).
// Calling this a second time safely removes the previous set of listeners
// via AbortController before adding new ones.
export function _ptBindEvents() {
    if (_pt_abortController) _pt_abortController.abort();
    if (_pt_resizeObserver) _pt_resizeObserver.disconnect();
    _pt_abortController = new AbortController();
    const signal = _pt_abortController.signal;
    _pt_containerRect = _pt_container.getBoundingClientRect();

    _pt_container.addEventListener('wheel', _ptOnWheel, { passive: false, signal });
    _pt_container.addEventListener('mousedown', _ptOnMouseDown, { signal });
    window.addEventListener('mousemove', _ptOnMouseMove, { signal });
    window.addEventListener('mouseup', _ptOnMouseUp, { signal });
    window.addEventListener('blur', _ptOnMouseUp, { signal });
    _pt_container.addEventListener('touchstart', _ptOnTouchStart, { passive: true, signal });
    _pt_container.addEventListener('touchmove', _ptOnTouchMove, { passive: false, signal });
    _pt_container.addEventListener('touchend', _ptOnTouchEnd, { signal });
    _pt_container.addEventListener('touchcancel', _ptOnTouchEnd, { signal });

    const zoomBar = document.getElementById('pt-zoom-bar');
    if (zoomBar) {
        zoomBar.addEventListener('mousedown', _ptOnZoomBarMouseDown, { signal });
        zoomBar.addEventListener('input', () => _ptOnZoomBarInput(zoomBar), { signal });
    }

    if (typeof ResizeObserver === 'function') {
        _pt_resizeObserver = new ResizeObserver(() => {
            _pt_containerRect = _pt_container.getBoundingClientRect();
            _ptScheduleTransform(false);
        });
        _pt_resizeObserver.observe(_pt_container);
    } else {
        window.addEventListener('resize', () => {
            _pt_containerRect = _pt_container.getBoundingClientRect();
            _ptScheduleTransform(false);
        }, { passive: true, signal });
    }
}

//------------------------------------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------