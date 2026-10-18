//------------------------------------------------------------------------
//-------------------PHONE VIEWPORT (virtual layout size)-----------------
//------------------------------------------------------------------------
// The game's HUD, grid, monster panel, hotbar and inventory dock are laid
// out for a desktop-sized window. A phone held sideways is only ~375 CSS px
// tall, so those pieces collide. Instead of shrinking each of them, phones
// get a larger VIRTUAL layout size through the viewport meta tag: the page
// lays out as if the window were ~560 CSS px tall (about 1000-1200 wide) and
// the browser scales that to fit the screen. Everything keeps its desktop
// proportions, text stays readable, and the puzzle can be pinch-zoomed.
//
// Only touch-first phones are affected (coarse pointer, short side under
// 600 CSS px). Tablets, laptops and desktops keep the normal viewport, and
// desktop browsers ignore the viewport meta tag anyway.
//
// In portrait a small dismissible hint suggests rotating the phone.
//
// Side-effect module (no exports).
import { t } from '../translation/translations.js';

const PHONE_MAX_SHORT_SIDE_PX = 600;
const LANDSCAPE_LAYOUT_HEIGHT = 560;   // virtual CSS px the layout is designed around
const PORTRAIT_LAYOUT_WIDTH = 800;
const DEFAULT_CONTENT = 'width=device-width, initial-scale=1.0';
// Touch devices (tablets keep the normal width): when the on-screen keyboard
// opens, shrink the layout viewport instead of panning over it, so centred
// modals such as the math gate stay above the keyboard.
const TOUCH_CONTENT = DEFAULT_CONTENT + ', user-scalable=no, interactive-widget=resizes-content';

let meta = null;
let hint = null;
let hintDismissed = false;
let lastRealWidth = 0;   // width the current layout was computed for

function isPhone() {
    if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return false;
    return Math.min(screen.width, screen.height) < PHONE_MAX_SHORT_SIDE_PX;
}

// Real (device-independent) window size in CSS px at scale 1, whatever the
// current virtual layout is: the visual viewport is in virtual px, and the
// page scale converts back.
function realSize() {
    const vv = window.visualViewport;
    if (vv && vv.scale) return { w: vv.width * vv.scale, h: vv.height * vv.scale };
    return { w: window.innerWidth, h: window.innerHeight };
}

function applyViewport() {
    if (!meta) return;
    if (!isPhone()) {
        // Tablets and other touch devices: normal width, keyboard-aware.
        // Mouse-only devices are left exactly as the page ships.
        const coarse = !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        if (coarse && meta.content !== TOUCH_CONTENT) meta.content = TOUCH_CONTENT;
        showHint(false);
        return;
    }
    const { w, h } = realSize();
    lastRealWidth = w;
    let width;
    if (w >= h) {
        const scale = h / LANDSCAPE_LAYOUT_HEIGHT;
        width = Math.round(w / scale);
    } else {
        width = PORTRAIT_LAYOUT_WIDTH;
    }
    const content = `width=${width}, user-scalable=no, interactive-widget=resizes-content`;
    if (meta.content !== content) meta.content = content;
    showHint(w < h);
}

function showHint(on) {
    if (on && !hintDismissed) {
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'touch-rotate-hint';
            hint.textContent = t('touch_rotate_hint');
            hint.addEventListener('pointerdown', () => {
                hintDismissed = true;
                showHint(false);
            });
            document.body.appendChild(hint);
        }
    } else if (hint) {
        hint.remove();
        hint = null;
    }
}

function init() {
    meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    applyViewport();
    // Orientation changes settle a moment after the event fires.
    // Only a change of WIDTH is a rotation / new window size. The on-screen
    // keyboard only shrinks the height, and re-deriving the layout from a
    // keyboard-shortened height would rescale the whole game while typing.
    const later = () => setTimeout(() => {
        if (Math.abs(realSize().w - lastRealWidth) >= 8) applyViewport();
    }, 250);
    window.addEventListener('orientationchange', later);
    window.addEventListener('resize', later);
}

document.addEventListener('DOMContentLoaded', init, { once: true });
