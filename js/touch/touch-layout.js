//------------------------------------------------------------------------
//-------------------TOUCH LAYOUT EDITOR----------------------------------
//------------------------------------------------------------------------
// Lets touch players arrange the on-screen controls built by
// js/touch/touch-controls.js: drag the joystick or any button to a new spot,
// and set one overall size and opacity. The layout is saved per device in
// localStorage and re-applied on load and on resize / rotation.
//
// Controls are found through their data-touch-id attribute, and the editor
// is opened by the 'stoxels-touch-edit' document event the pencil button
// fires, so the two modules share no imports. While editing, the body has
// the class `touch-editing`, which turns control presses into drags.
//
// Positions are stored as fractions of the viewport so a saved layout
// survives rotation and different screen sizes.
//
// Side-effect module (no exports).
import { t } from '../translation/translations.js';

const LAYOUT_KEY = 'stoxels_touch_layout';
const SCALE_MIN = 0.6;
const SCALE_MAX = 1.6;
const OPACITY_MIN = 0.3;

const DEFAULT_LAYOUT = { scale: 1, opacity: 1, pos: {} };
let layout = { ...DEFAULT_LAYOUT, pos: {} };
let panel = null;
let drag = null;

function loadLayout() {
    try {
        const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
        if (saved && typeof saved === 'object') {
            layout = {
                scale: clamp(Number(saved.scale) || 1, SCALE_MIN, SCALE_MAX),
                opacity: clamp(Number(saved.opacity) || 1, OPACITY_MIN, 1),
                pos: (saved.pos && typeof saved.pos === 'object') ? saved.pos : {},
            };
        }
    } catch { /* unreadable layout: keep the defaults */ }
}

function saveLayout() {
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* storage unavailable */ }
}

function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
}

function controlEls() {
    return [...document.querySelectorAll('[data-touch-id]')];
}

function isStick(el) {
    return el.dataset.touchId === 'stick';
}

// Place a control at viewport coordinates (its visual top-left corner).
function placeAt(el, left, top) {
    const r = el.getBoundingClientRect();
    const w = r.width || 52;
    const h = r.height || 52;
    left = clamp(left, 0, Math.max(0, innerWidth - w));
    top = clamp(top, 0, Math.max(0, innerHeight - h));
    el.style.position = 'fixed';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.margin = '0';
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    if (isStick(el)) el.style.transformOrigin = '0 0';
    return { left, top };
}

function clearPlacement(el) {
    for (const prop of ['position', 'right', 'bottom', 'margin', 'left', 'top', 'transformOrigin']) {
        el.style[prop] = '';
    }
}

// Phones run a virtual layout size (js/touch/touch-viewport.js), so one CSS
// px is smaller than a device-independent px there. Scale the controls back
// up so they stay finger-sized.
function pageScaleFactor() {
    const scale = window.visualViewport && window.visualViewport.scale;
    return scale && scale < 1 ? clamp(1 / scale, 1, 2.4) : 1;
}

function applyLayout() {
    const root = document.documentElement.style;
    root.setProperty('--touch-scale', String(layout.scale * pageScaleFactor()));
    root.setProperty('--touch-opacity', String(layout.opacity));
    for (const el of controlEls()) {
        const p = layout.pos[el.dataset.touchId];
        if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
            placeAt(el, p.x * innerWidth, p.y * innerHeight);
        } else {
            clearPlacement(el);
        }
    }
}

//------------------------------------------------------------------------
//-------------------DRAGGING---------------------------------------------
//------------------------------------------------------------------------

function onDragStart(e) {
    if (!document.body.classList.contains('touch-editing')) return;
    const el = e.target.closest?.('[data-touch-id]');
    if (!el || drag) return;
    e.preventDefault();
    e.stopPropagation();
    const r = el.getBoundingClientRect();
    drag = { el, pointerId: e.pointerId, offX: e.clientX - r.left, offY: e.clientY - r.top };
    el.classList.add('touch-dragging');
    // Switch from the default anchoring to explicit left/top at the same spot.
    placeAt(el, r.left, r.top);
}

function onDragMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    placeAt(drag.el, e.clientX - drag.offX, e.clientY - drag.offY);
}

function onDragEnd(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const el = drag.el;
    el.classList.remove('touch-dragging');
    const r = el.getBoundingClientRect();
    layout.pos[el.dataset.touchId] = { x: r.left / innerWidth, y: r.top / innerHeight };
    drag = null;
    saveLayout();
}

//------------------------------------------------------------------------
//-------------------EDIT PANEL-------------------------------------------
//------------------------------------------------------------------------

function sliderRow(labelKey, min, max, step, value, onInput) {
    const row = document.createElement('label');
    row.className = 'touch-edit-row';
    const text = document.createElement('span');
    text.textContent = t(labelKey);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.addEventListener('input', () => onInput(Number(input.value)));
    row.append(text, input);
    return row;
}

function buildPanel() {
    panel = document.createElement('div');
    panel.id = 'touch-edit-panel';

    const title = document.createElement('strong');
    title.textContent = t('touch_edit_title');
    const hint = document.createElement('span');
    hint.className = 'touch-edit-hint';
    hint.textContent = t('touch_edit_hint');

    const size = sliderRow('touch_edit_size', SCALE_MIN, SCALE_MAX, 0.05, layout.scale, (v) => {
        layout.scale = v;
        applyLayout();
        saveLayout();
    });
    const opacity = sliderRow('touch_edit_opacity', OPACITY_MIN, 1, 0.05, layout.opacity, (v) => {
        layout.opacity = v;
        applyLayout();
        saveLayout();
    });

    const buttons = document.createElement('div');
    buttons.className = 'touch-edit-buttons';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = t('touch_edit_reset');
    reset.addEventListener('click', () => {
        layout = { ...DEFAULT_LAYOUT, pos: {} };
        saveLayout();
        applyLayout();
        size.querySelector('input').value = String(layout.scale);
        opacity.querySelector('input').value = String(layout.opacity);
    });
    const done = document.createElement('button');
    done.type = 'button';
    done.className = 'touch-edit-done';
    done.textContent = t('touch_edit_done');
    done.addEventListener('click', closeEditor);
    buttons.append(reset, done);

    panel.append(title, hint, size, opacity, buttons);
    document.body.appendChild(panel);
}

function openEditor() {
    if (document.body.classList.contains('touch-editing')) return;
    document.body.classList.add('touch-editing');
    buildPanel();
}

function closeEditor() {
    document.body.classList.remove('touch-editing');
    panel?.remove();
    panel = null;
    drag = null;
}

function init() {
    loadLayout();
    applyLayout();
    document.addEventListener('stoxels-touch-edit', openEditor);
    // Capture phase so a drag in edit mode never reaches the controls' own
    // press handlers.
    document.addEventListener('pointerdown', onDragStart, true);
    document.addEventListener('pointermove', onDragMove, true);
    document.addEventListener('pointerup', onDragEnd, true);
    document.addEventListener('pointercancel', onDragEnd, true);
    window.addEventListener('resize', applyLayout);
    window.visualViewport?.addEventListener('resize', applyLayout);
    window.addEventListener('orientationchange', applyLayout);
}

document.addEventListener('DOMContentLoaded', init, { once: true });
