//------------------------------------------------------------------------
//-------------------TOUCH CONTROLS (joystick + action buttons)------------
//------------------------------------------------------------------------
// Lets phone and tablet players walk the avatar. A floating joystick (in a
// fixed bottom-left touch zone) presses and releases the player's MOVE keys
// by dispatching ordinary keydown/keyup events on the document, so the
// existing held-key movement loop (js/sprite/player_sprite.js) does the
// rest unchanged: speed modifiers, stun/freeze/modal blocking and key
// rebinding all keep working, and keyboard/mouse play is not touched.
//
// The action buttons (attack, parry, cycle target, endgame specials and a
// menu cluster) work the same way: pressing a button sends a keydown for the
// action's bound key and releasing it sends the keyup, so hold-to-charge
// attacks, hold-to-parry and every keybind handler behave exactly as they do
// from the keyboard. The hotbar needs no buttons - its slots are already
// tap-to-cast.
//
// Shown only when the "Touch Controls" setting is on. That setting defaults
// to ON for coarse-pointer (touch-first) devices and OFF everywhere else,
// and can be flipped in Settings by anyone.
//
// Side-effect module (no exports).
import { SETTINGS } from '../settings.js';
import { keybindKeyFor } from '../keybinds.js';
import { t } from '../translation/translations.js';

const ZONE_SIZE_PX = 190;     // side of the square touch zone
const STICK_RADIUS_PX = 52;   // how far the knob can travel from its base
const AXIS_THRESHOLD = 0.38;  // fraction of the radius before a direction engages
const VISIBILITY_POLL_MS = 400;

// Action buttons. `action` is a keybind id (js/keybinds.js); `key` sends a
// fixed key instead (Escape = pause / close, not rebindable in this game);
// `event` fires a document CustomEvent instead of a key; `toggle` opens and
// closes the collapsed part of the menu. The label for each
// id lives in the translations as touch_lbl_<id>.
// groups 'combat' and 'special' (the three boss-ability keys, smaller) show
// only while an endgame fight is running, 'menu' whenever there is an avatar
// on screen.
const ACTION_BUTTONS = [
    { id: 'attack', group: 'combat', action: 'eg-attack',    icon: '⚔️',    cls: 'touch-btn-big' },
    { id: 'parry',  group: 'combat', action: 'eg-parry',     icon: '\u{1F6E1}️', cls: 'touch-btn-big' },
    { id: 'target', group: 'combat', action: 'cycle-target', icon: '\u{1F3AF}' },
    { id: 'sp1',    group: 'special', action: 'eg-special',   icon: 'F' },
    { id: 'sp2',    group: 'special', action: 'eg-special-2', icon: 'G' },
    { id: 'sp3',    group: 'special', action: 'eg-special-3', icon: 'H' },
    // The menu group stays small: pause is always there, the toggle opens
    // the rest (`collapsible`) as a row beside it.
    { id: 'menu',   group: 'menu',   toggle: true,              icon: '⋯' },
    { id: 'pause',  group: 'menu',   key: 'Escape',              icon: '⏸︎' },
    // Fill / Mark mode: drives the game's own Touchpad Mode button.
    { id: 'mode',   group: 'menu',   mode: true,                    icon: '■' },
    { id: 'book',   group: 'menu',   action: 'spellbook',        icon: '\u{1F4D6}', collapsible: true },
    { id: 'tree',   group: 'menu',   action: 'passive-tree',     icon: '\u{1F333}', collapsible: true },
    { id: 'sheet',  group: 'menu',   action: 'char-sheet',       icon: '\u{1F392}', collapsible: true },
    // Opens the layout editor (js/touch/touch-layout.js) - sends no key.
    { id: 'edit',   group: 'menu',   event: 'stoxels-touch-edit', icon: '⚙︎', collapsible: true },
];

const MOVE_ACTIONS = {
    up: 'move-up',
    down: 'move-down',
    left: 'move-left',
    right: 'move-right',
};

let cluster = null;
const clusterRows = {};
let zone = null;
let base = null;
let knob = null;
let activePointer = null;
let originX = 0;
let originY = 0;
let stickScale = 1;   // the layout editor can scale the zone with a CSS transform
// direction -> the key string currently pressed for it (null when released)
const pressed = { up: null, down: null, left: null, right: null };

// Stored keybinds are lowercase ('tab', 'escape', 'arrowup'); KeyboardEvent
// uses 'Tab', 'Escape', 'ArrowUp'. The dispatcher lowercases before matching,
// but handlers that test e.key directly expect the real name.
function eventKeyName(stored) {
    if (stored.length === 1) return stored;
    if (stored.startsWith('arrow')) return 'Arrow' + stored.charAt(5).toUpperCase() + stored.slice(6);
    return stored.charAt(0).toUpperCase() + stored.slice(1);
}

function pressKey(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

function releaseKey(key) {
    document.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
}

// Press/release only the directions whose state changed.
function setDirections(want) {
    for (const dir of Object.keys(MOVE_ACTIONS)) {
        if (want[dir] && !pressed[dir]) {
            const key = keybindKeyFor(MOVE_ACTIONS[dir]);
            if (!key) continue;
            pressed[dir] = key;
            pressKey(key);
        } else if (!want[dir] && pressed[dir]) {
            releaseKey(pressed[dir]);
            pressed[dir] = null;
        }
    }
}

function releaseAll() {
    setDirections({ up: false, down: false, left: false, right: false });
}

function placeBase(x, y) {
    base.style.left = x + 'px';
    base.style.top = y + 'px';
    knob.style.transform = 'translate(-50%, -50%)';
}

// While the layout editor is open, presses drag controls instead of acting.
function editing() {
    return document.body.classList.contains('touch-editing');
}

function onPointerDown(e) {
    if (editing() || activePointer !== null) return;
    activePointer = e.pointerId;
    try { zone.setPointerCapture(e.pointerId); } catch { /* capture is a nicety, not required */ }
    const r = zone.getBoundingClientRect();
    stickScale = r.width / ZONE_SIZE_PX || 1;
    originX = e.clientX;
    originY = e.clientY;
    placeBase((originX - r.left) / stickScale, (originY - r.top) / stickScale);
    base.classList.add('touch-stick-active');
    e.preventDefault();
}

function onPointerMove(e) {
    if (e.pointerId !== activePointer) return;
    let dx = e.clientX - originX;
    let dy = e.clientY - originY;
    const radius = STICK_RADIUS_PX * stickScale;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) {
        dx = (dx / dist) * radius;
        dy = (dy / dist) * radius;
    }
    knob.style.transform = `translate(calc(-50% + ${dx / stickScale}px), calc(-50% + ${dy / stickScale}px))`;
    const thr = radius * AXIS_THRESHOLD;
    setDirections({
        up: dy < -thr,
        down: dy > thr,
        left: dx < -thr,
        right: dx > thr,
    });
    e.preventDefault();
}

function onPointerEnd(e) {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    base.classList.remove('touch-stick-active');
    knob.style.transform = 'translate(-50%, -50%)';
    releaseAll();
}

// The Fill/Mark button mirrors the game's Touchpad Mode button: hidden when
// that setting is off, and shows the current mode.
function syncModeButton() {
    const btn = cluster && cluster.querySelector('[data-touch-id="mode"]');
    if (!btn) return;
    const native = document.getElementById('btn-touchpad-mode');
    btn.hidden = !native || native.classList.contains('hidden');
    const marking = !!native && native.classList.contains('touchpad-mode-active');
    btn.textContent = marking ? '✕' : '■';
    btn.classList.toggle('touch-btn-active', marking);
}

function buildButton(def) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'touch-btn' + (def.cls ? ' ' + def.cls : '');
    btn.textContent = def.icon;
    btn.dataset.touchId = def.id;
    btn.dataset.touchLabel = 'touch_lbl_' + def.id;
    if (def.collapsible) btn.classList.add('touch-btn-collapsible');
    if (def.toggle) btn.classList.add('touch-btn-menu-toggle');
    btn.setAttribute('aria-label', t(btn.dataset.touchLabel));
    let down = null;   // the key this press sent, so the release matches it
    const release = () => {
        if (down === null) return;
        releaseKey(down);
        down = null;
        btn.classList.remove('touch-btn-down');
    };
    btn.addEventListener('pointerdown', (e) => {
        if (editing() || down !== null) return;
        if (def.toggle) {
            cluster.classList.toggle('touch-menu-open');
            e.preventDefault();
            return;
        }
        if (def.mode) {
            const native = document.getElementById('btn-touchpad-mode');
            if (native) native.click();
            syncModeButton();
            e.preventDefault();
            return;
        }
        if (def.collapsible) cluster.classList.remove('touch-menu-open');
        if (def.event) {
            document.dispatchEvent(new CustomEvent(def.event));
            e.preventDefault();
            return;
        }
        const stored = def.key || keybindKeyFor(def.action);
        if (!stored) return;
        down = eventKeyName(stored);
        btn.classList.add('touch-btn-down');
        try { btn.setPointerCapture(e.pointerId); } catch { /* optional */ }
        pressKey(down);
        e.preventDefault();
    });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    return btn;
}

function buildCluster() {
    cluster = document.createElement('div');
    cluster.id = 'touch-action-cluster';
    cluster.hidden = true;
    for (const group of ['combat', 'special', 'menu']) {
        const row = document.createElement('div');
        row.className = 'touch-btn-group touch-btn-group-' + group;
        clusterRows[group] = row;
        for (const def of ACTION_BUTTONS) {
            if (def.group === group) row.appendChild(buildButton(def));
        }
        cluster.appendChild(row);
    }
    document.body.appendChild(cluster);
}

function buildZone() {
    zone = document.createElement('div');
    zone.id = 'touch-move-zone';
    zone.dataset.touchId = 'stick';
    zone.dataset.touchLabel = 'touch_lbl_stick';
    zone.style.width = ZONE_SIZE_PX + 'px';
    zone.style.height = ZONE_SIZE_PX + 'px';
    zone.hidden = true;

    base = document.createElement('div');
    base.className = 'touch-stick-base';
    knob = document.createElement('div');
    knob.className = 'touch-stick-knob';
    base.appendChild(knob);
    zone.appendChild(base);
    // Resting position: centred, dimmed, so players can see where to put
    // the thumb before they touch it.
    placeBase(ZONE_SIZE_PX / 2, ZONE_SIZE_PX / 2);

    zone.addEventListener('pointerdown', onPointerDown);
    zone.addEventListener('pointermove', onPointerMove);
    zone.addEventListener('pointerup', onPointerEnd);
    zone.addEventListener('pointercancel', onPointerEnd);
    zone.addEventListener('lostpointercapture', onPointerEnd);
    zone.addEventListener('contextmenu', (e) => e.preventDefault());
    document.body.appendChild(zone);
}

// The joystick is useful only while there is an avatar to steer.
function avatarVisible() {
    for (const id of ['player-avatar-wrapper', 'player-avatar-simple']) {
        const el = document.getElementById(id);
        if (el && getComputedStyle(el).display !== 'none') return true;
    }
    return false;
}

function combatActive() {
    try {
        return typeof globalThis._isActive === 'function' && !!globalThis._isActive();
    } catch { return false; }
}

// Keep the cluster clear of the skill hotbar (bottom-right): sit just above
// it when it is showing, in the corner otherwise.
function placeCluster() {
    const bar = document.getElementById('skill-hotbar');
    let bottom = 12;
    if (bar && bar.style.display !== 'none') {
        const r = bar.getBoundingClientRect();
        if (r.height > 0 && r.top < window.innerHeight) bottom = Math.round(window.innerHeight - r.top + 8);
    }
    cluster.style.bottom = bottom + 'px';
}

function refreshVisibility() {
    const show = !!SETTINGS.touchControls && avatarVisible();
    cluster.hidden = !show;
    document.documentElement.classList.toggle('touch-controls-on', show);
    if (show) {
        placeCluster();
        syncModeButton();
    }
    const showCombat = show && (combatActive() || editing());
    clusterRows.combat.hidden = !showCombat;
    clusterRows.special.hidden = !showCombat;
    if (zone.hidden === !show) return;
    zone.hidden = !show;
    if (!show) {
        activePointer = null;
        base.classList.remove('touch-stick-active');
        placeBase(ZONE_SIZE_PX / 2, ZONE_SIZE_PX / 2);
        releaseAll();
    }
}

function init() {
    buildZone();
    buildCluster();
    window.addEventListener('blur', releaseAll);
    setInterval(refreshVisibility, VISIBILITY_POLL_MS);
    refreshVisibility();
}

document.addEventListener('DOMContentLoaded', init, { once: true });
