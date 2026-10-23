import { Audio_Manager } from '../audio/audio.js';
import { cur } from '../state.js';
import { GAME_ART } from '../combat/combat-art.js';
import { ITEM_GROUPS } from '../puzzle-items/item-definitions.js';
import { _fxItemLanding } from '../puzzle-items/landing/item-landing.js';

//------------------------------------------------------------------------
//-------------------SHARED - FX HELPERS----------------------
//------------------------------------------------------------------------

// Shared plumbing for every item visual effect: z-index tiers, particle
// palettes, DOM builders, puzzle geometry, the freeze countdown overlay
// (also used by classes/timer), the clock visual (addTime / Golden Clock
// / Chronofracture), the gold tint fill (Golden Clock / Chronofracture)
// and the shield border (Shield / Cursed Shield).

// Shared z-index tiers so overlapping effects stack predictably.
export const FX_Z = {
    base: 320,   // standard overlay
    above: 325,   // icons / foreground overlays
    high: 326,   // large centered icons
    icon: 327,   // popup icons sitting above overlays
    top: 328,   // chronobolt flash layer
    supreme: 330,   // artifact / chaos / shadow seal icons
};


// Horizontal positions (as grid-width fractions) for lightning bolts.
export const CHRONOBOLT_X_FRACTIONS = [0.2, 0.5, 0.8];


// Explosion colours used by ChaosGrid.
export const CHAOS_BLAST_COLOURS = ['#e74c3c', '#f39c12', '#9b59b6', '#3498db', '#2ecc71', '#e91e63'];


// Particle palettes shared across multiple effects.
export const PARTICLES = {
    gemSparkles: { chars: ['✦', '◆', '●', '▪'], colors: ['#88f', '#c8f', '#66f', '#aaf', '#fff'] },
    artifactStars: { chars: ['★', '✦', '✧', '⋆', '🌟'], colors: ['#ffd700', '#ffe066', '#fff9c4', '#fff', '#ffc300'] },
    witchSmoke: { chars: ['✦', '◆', '★', '·'], colors: ['#9b59b6', '#c39bd3', '#6c3483', '#d7bde2', '#fff'] },
    vortexDebris: { chars: ['○', '◌', '◯', '·', '▪'], colors: ['#aaa', '#ccc', '#888', '#ddd', '#fff'] },
    shadowVoid: { chars: ['●', '◯', '·', '▪'], colors: ['#111', '#333', '#222', '#444'] },
    cursedCrosses: { chars: ['✕', '✗', '×'], colors: ['#f44', '#ff6666', '#cc0000'] },
    chaosShrapnel: { chars: ['★', '✦', '▪', '●'] },
};


// SFX keys used by Tutor item variants (Tutor / Professor / Scholar /
// Grand Mentor), keyed by defId.
export const TUTOR_ITEM_SFX = {
    tutor: 'tutor',
    tutor4: 'professor',
    tutor6: 'scholar',
    tutorAll: 'grand_mentor',
};


// Pearl variant definitions: color hex → emoji + sfx key.
export const PEARL_VARIANTS = {
    '#88aaff': { emoji: '🔵', sfx: 'pearl_of_haste' },
    '#cc88ff': { emoji: '🟣', sfx: 'pearl_of_swiftness' },
    '#e0e0e0': { emoji: '⚪', sfx: 'grand_pearl' },
};


// Returns a new absolutely positioned div with the given cssText,
// already appended to `parent`.  Does NOT auto-remove itself.
export function _fxMakeElement(parent, cssText, className) {
    const el = document.createElement('div');
    if (className) el.className = className;
    el.style.cssText = cssText;
    parent.appendChild(el);
    return el;
}


// Creates a centered emoji icon at (cx, cy) inside `parent`.
// Auto-removes after `removeAfterMs`.
// Returns the element in case the caller needs to remove it early.
export function _fxMakeIcon(parent, emoji, cx, cy, fontSize, animationCss, removeAfterMs) {
    const el = document.createElement('div');
    el.textContent = emoji;
    el.style.cssText = `
        position:absolute;
        left:${cx}px; top:${cy}px;
        transform:translate(-50%,-50%);
        font-size:${fontSize}px;
        pointer-events:none;
        z-index:${FX_Z.icon};
        ${animationCss}
    `;
    parent.appendChild(el);
    setTimeout(() => el.remove(), removeAfterMs);
    return el;
}


// Creates a centered icon for a puzzle item at (cx, cy) inside `parent`,
// showing the item's ART image (images/puzzle_items/<id>.webp, resolved
// through the same GAME_ART resolver the inventory uses) instead of the
// emoji. Falls back to the item's emoji when no art exists for the id.
//
// `size` is the box size in px; the art scales to fit (art keeps its own
// aspect inside the box via the CSS class). `animationCss` is applied to
// the wrapper so existing keyframes (fx-icon-pop etc.) keep working —
// they animate transform/opacity of the wrapper only, never the img.
// Auto-removes after `removeAfterMs` like _fxMakeIcon.
export function _fxMakeItemIcon(parent, defId, fallbackEmoji, cx, cy, size, animationCss, removeAfterMs) {
    const el = document.createElement('div');
    el.className = 'fx-item-icon';
    const url = (typeof GAME_ART !== 'undefined' && GAME_ART)
        ? GAME_ART.url('item', defId) : null;
    if (url) {
        el.classList.add('fx-item-art');
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.draggable = false;
        img.decoding = 'async';
        img.style.width = size + 'px';
        img.style.height = size + 'px';
        el.appendChild(img);
    } else {
        el.textContent = fallbackEmoji || '❓';
        el.style.fontSize = size + 'px';
    }
    el.style.cssText += `
        position:absolute;
        left:${cx}px; top:${cy}px;
        transform:translate(-50%,-50%);
        pointer-events:none;
        z-index:${FX_Z.icon};
        ${animationCss}
    `;
    parent.appendChild(el);
    setTimeout(() => el.remove(), removeAfterMs);
    return el;
}


// Creates one expandable ring div centered at (cx, cy).
// `ringSize` is the CSS custom property value for --ring-max / --ring-size.
// `delayMs` staggers the animation when spawning multiple rings.
export function _fxMakeRing(container, cx, cy, className, ringSize, delayMs, animationName, duration = '0.9s') {
    const ring = document.createElement('div');
    ring.className = className;
    ring.style.cssText = `
        position:absolute;
        left:${cx}px; top:${cy}px;
        transform:translate(-50%,-50%) scale(0);
        animation:${animationName} ${duration} ease-out ${delayMs}s forwards;
        --ring-max:${ringSize}px;
        --ring-size:${ringSize}px;
    `;
    container.appendChild(ring);
    return ring;
}


// Returns the current puzzle grid's corner cell elements ({first, last}),
// i.e. #g-0-0 and #g-{lastRow}-{lastCol}, or null if the grid/cells
// aren't currently available. Shared by every helper that needs to know
// where the grid sits on screen (rect calc, shield-border tracking, etc).
export function _fxGetGridCorners() {
    const sol = cur?.grid;
    if (!sol || !sol.length) return null;

    const rows = sol.length;
    const cols = sol[0].length;
    const first = document.getElementById('g-0-0');
    const last = document.getElementById(`g-${rows - 1}-${cols - 1}`);
    if (!first || !last) return null;

    return { first, last };
}


// _fxGetPuzzleRectForWrap - like _fxGetPuzzleRect(), but returns coordinates
// relative to #puzzle-scaler-wrap instead of #puzzle-scaler, WITHOUT dividing
// by currentZoom. Use this for any overlay that is attached to the wrap
// itself (which is never transformed) rather than to #puzzle-scaler (which
// has the zoom transform applied).
//
// Dividing by currentZoom is only valid for elements living *inside* the
// scaled element (#puzzle-scaler) - for anything living in the unscaled
// wrap, that division introduces zoom-dependent drift that blows up at
// high zoom levels (this was the cause of the fx-shield-border /
// variance-shield-bubble mispositioning bug).
export function _fxGetPuzzleRectForWrap() {
    const wrap = document.getElementById('puzzle-scaler-wrap');
    if (!wrap) return null;
    if (!wrap.style.position || wrap.style.position === 'static') {
        wrap.style.position = 'relative';
    }

    const corners = _fxGetGridCorners();
    if (!corners) return null;
    const { first, last } = corners;

    const wRect = wrap.getBoundingClientRect();
    const fRect = first.getBoundingClientRect();
    const lRect = last.getBoundingClientRect();

    return {
        wrap,
        top: fRect.top - wRect.top,
        left: fRect.left - wRect.left,
        bottom: lRect.bottom - wRect.top,
        right: lRect.right - wRect.left,
        width: lRect.right - fRect.left,
        height: lRect.bottom - fRect.top,
    };
}


// Returns the bounding rect of the puzzle grid in the
// coordinate space of the puzzle-scaler element (logical px).
// Returns null when the grid elements can't be found.
export function _fxGetPuzzleRect() {
    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return null;
    if (!wrap.style.position || wrap.style.position === 'static') {
        wrap.style.position = 'relative';
    }

    const corners = _fxGetGridCorners();
    if (!corners) return null;
    const { first, last } = corners;

    const zoom = globalThis.currentZoom || 1;
    const wRect = wrap.getBoundingClientRect();
    const fRect = first.getBoundingClientRect();
    const lRect = last.getBoundingClientRect();

    return {
        wrap,
        top: (fRect.top - wRect.top) / zoom,
        left: (fRect.left - wRect.left) / zoom,
        bottom: (lRect.bottom - wRect.top) / zoom,
        right: (lRect.right - wRect.left) / zoom,
        width: (lRect.right - fRect.left) / zoom,
        height: (lRect.bottom - fRect.top) / zoom,
    };
}


// Creates a full-scaler absolute overlay div and auto-removes
// it after `durationMs`.  Returns the element for further setup.
// `extraStyle` can override or extend any of the default styles.
export function _fxOverlay(wrap, durationMs, extraStyle = '') {
    const el = document.createElement('div');
    el.style.cssText = `
        position:absolute; inset:0;
        pointer-events:none;
        z-index:${FX_Z.base};
        overflow:hidden;
        ${extraStyle}
    `;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), durationMs);
    return el;
}


// Injects the keyframes used by the freeze countdown overlay (once).
export function _ensureFreezeCountdownStyles() {
    if (document.getElementById('fx-freeze-countdown-style')) return;
    const style = document.createElement('style');
    style.id = 'fx-freeze-countdown-style';
    style.textContent = `
        @keyframes fx-freeze-pop {
            0%   { transform: scale(1.8); opacity: 0; }
            25%  { transform: scale(1);   opacity: 1; }
            100% { transform: scale(0.94); opacity: 0.85; }
        }
        @keyframes fx-freeze-fadeout {
            from { opacity: 1; }
            to   { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}


// Big icy-blue countdown displayed over the centre of the puzzle grid
// while a time-freeze effect is running (Absolute Zero, Time Freeze item,
// Timed Stasis passive).  Shows "❄️ Ns" and pops once per second until the
// freeze expires, then fades out.
export function playFreezeCountdownOverlay(durationMs) {
    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return;
    _ensureFreezeCountdownStyles();

    // Replace any countdown still running from a previous freeze.
    const stale = document.getElementById('fx-freeze-countdown');
    if (stale) stale.remove();

    if (!wrap.style.position || wrap.style.position === 'static') {
        wrap.style.position = 'relative';
    }

    const rect = _fxGetPuzzleRect();
    const size = rect ? Math.min(rect.width, rect.height) : Math.min(wrap.clientWidth, wrap.clientHeight);

    let remaining = Math.max(1, Math.ceil(durationMs / 1000));

    const el = document.createElement('div');
    el.id = 'fx-freeze-countdown';
    el.style.cssText = `
        position: absolute;
        left: ${rect ? rect.left + rect.width / 2 : wrap.clientWidth / 2}px;
        top: ${rect ? rect.top + rect.height / 2 : wrap.clientHeight / 2}px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: ${FX_Z.high};
        font-size: ${Math.max(40, size * 0.22)}px;
        font-weight: 900;
        color: #9fdcff;
        text-shadow: 0 0 18px #4aa8ff, 0 0 42px #2a7de1, 0 2px 6px rgba(0,0,60,0.6);
        -webkit-text-stroke: 2px rgba(10,40,90,0.55);
    `;

    const renderTick = () => {
        const span = document.createElement('span');
        span.textContent = `❄️ ${remaining}s`;
        span.style.cssText = 'display:inline-block; animation: fx-freeze-pop 0.95s ease-out forwards;';
        el.replaceChildren(span);
    };
    renderTick();
    wrap.appendChild(el);

    const tick = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(tick);
            return;
        }
        renderTick();
    }, 1000);

    setTimeout(() => {
        clearInterval(tick);
        el.style.animation = 'fx-freeze-fadeout 0.35s ease-out forwards';
        setTimeout(() => el.remove(), 380);
    }, durationMs);
}


// Generic particle spawner.  Staggered timers spread particles
// over the effect duration so they don't all appear at once.
//
// opts shape:
//   count    - total particles
//   chars    - array of text characters to pick from randomly
//   colors   - array of CSS color strings to pick from randomly
//   sizeMin / sizeMax - font-size range in px
//   container - parent element to append particles into
//   startX / startY - center spawn position (px in container space)
//   spreadX / spreadY - random offset radius in each axis (px)
//   duration - base animation duration (ms); individual particles vary ±30%
//   cssClass - class name applied to each particle (handles the animation)
export function _fxSpawnParticles(opts) {
    const {
        count = 12,
        chars = ['·'],
        colors = ['#fff'],
        sizeMin = 14,
        sizeMax = 22,
        container,
        startX, startY,
        spreadX = 60, spreadY = 60,
        duration = 900,
        cssClass = 'fx-particle-generic',
    } = opts;

    for (let i = 0; i < count; i++) {
        // Stagger each particle across the first half of the total duration
        setTimeout(() => {
            const p = document.createElement('div');
            p.className = cssClass;
            p.textContent = chars[Math.floor(Math.random() * chars.length)];
            p.style.color = colors[Math.floor(Math.random() * colors.length)];
            p.style.fontSize = (sizeMin + Math.random() * (sizeMax - sizeMin)) + 'px';
            p.style.left = (startX + (Math.random() - 0.5) * spreadX) + 'px';
            p.style.top = (startY + (Math.random() - 0.5) * spreadY) + 'px';
            p.style.animationDuration = (duration * (0.7 + Math.random() * 0.6)) + 'ms';
            // Per-particle drift for keyframes using var(--dx)/var(--dy)
            // (e.g. fx-chaos-shard-fly). Harmless for other particle classes.
            p.style.setProperty('--dx', ((Math.random() - 0.5) * 60).toFixed(1) + 'px');
            p.style.setProperty('--dy', (-30 - Math.random() * 30).toFixed(1) + 'px');
            container.appendChild(p);
            setTimeout(() => p.remove(), duration * 1.5);
        }, i * (duration / count / 2));
    }
}


// Helper: creates the central burst div for the clock effect.
export function _fxMakeClockBurst(container, cx, cy) {
    const burst = document.createElement('div');
    burst.className = 'fx-clock-burst';
    burst.style.cssText = `
        position:absolute;
        left:${cx}px; top:${cy}px;
        transform:translate(-50%,-50%);
    `;
    container.appendChild(burst);
}


// Helper: spawns the 12 clock-ray divs radiating from (cx, cy).
export function _fxMakeClockRays(container, cx, cy, rayLength) {
    for (let i = 0; i < 12; i++) {
        const ray = document.createElement('div');
        ray.className = 'fx-clock-ray';
        ray.style.cssText = `
            position:absolute;
            left:${cx}px; top:${cy}px;
            transform-origin:0 0;
            transform:translate(-50%,-50%) rotate(${i * 30}deg);
            animation:fx-clock-ray-shoot 0.7s ease-out ${i * 0.06}s forwards;
            --ray-len:${rayLength}px;
        `;
        container.appendChild(ray);
    }
}


// 🕰️ Clock - clock hands sweep + golden radial burst.
export function _fxClock() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1800);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const rayLength = Math.max(r.width, r.height) * 0.55;

    _fxMakeClockBurst(overlay, cx, cy);
    _fxMakeClockRays(overlay, cx, cy, rayLength);
    // shared by addTime600 / Golden Clock / Chronofracture: the clock
    // face shows the GOLDEN CLOCK art (its shared look), emoji fallback
    _fxMakeItemIcon(r.wrap, 'goldenClock', '🕰️', cx, cy, 50, 'animation:fx-icon-pop 0.7s ease-out forwards;', 1100);

    Audio_Manager.playSFX('clock');
}


// _fxShieldBorderAdd - places a persistent glowing border around the puzzle grid.
// Uses position:fixed with screen-space coords so it is unaffected by the
// CSS transform on puzzle-scaler.  A ResizeObserver repositions it whenever
// the grid is zoomed or the window resizes.
export function _fxShieldBorderAdd() {
    if (document.getElementById('fx-shield-border')) return;

    const border = document.createElement('div');
    border.id = 'fx-shield-border';

    // Attach to the WRAP, not the scaler - the wrap is never transformed,
    // so we can position this with plain rect deltas and never touch
    // currentZoom. (Previously attached to #puzzle-scaler and divided by
    // currentZoom in _repositionShieldBorder - that's what caused the
    // huge bogus `left` value at high zoom.)
    const wrap = document.getElementById('puzzle-scaler-wrap');
    if (!wrap) return;
    if (!wrap.style.position || wrap.style.position === 'static') {
        wrap.style.position = 'relative';
    }

    border.style.cssText = `
        position:absolute;
        pointer-events:none;
        z-index:${FX_Z.above};
        border-radius:4px;
        box-shadow:
            0 0 0 3px rgba(255,215,0,0.9),
            0 0 12px 4px rgba(255,215,0,0.6),
            0 0 28px 8px rgba(255,215,0,0.3);
        animation:fx-shield-border-pulse 1.8s ease-in-out infinite;
    `;
    wrap.appendChild(border);

    // Positions the border to match the grid's bounds, in wrap-relative
    // (unscaled) coordinates - no zoom division required.
    function _repositionShieldBorder() {
        const r = _fxGetPuzzleRectForWrap();
        if (!r) return;

        border.style.left = r.left + 'px';
        border.style.top = r.top + 'px';
        border.style.width = r.width + 'px';
        border.style.height = r.height + 'px';
    }

    _repositionShieldBorder();

    border._reposition = _repositionShieldBorder;
    window.addEventListener('resize', _repositionShieldBorder, { passive: true });

    // Ctrl+Wheel zoom fires a wheel event on the wrap - reposition then too.
    wrap.addEventListener('wheel', _repositionShieldBorder, { passive: true });
}


// Removes the shield border with a short fade-out.
export function _fxShieldBorderRemove() {
    const border = document.getElementById('fx-shield-border');
    if (!border) return;

    if (border._reposition) {
        window.removeEventListener('resize', border._reposition);
        const wrap = document.getElementById('puzzle-scaler-wrap');
        if (wrap) wrap.removeEventListener('wheel', border._reposition);
    }

    border.style.animation = 'fx-shield-border-shatter 0.35s ease-out forwards';
    setTimeout(() => border.remove(), 380);
}


// Helper: creates the gold tint fill overlay used by Golden Clock.
export function _fxMakeGoldTintFill(container, r) {
    const fill = document.createElement('div');
    fill.style.cssText = `
        position:absolute;
        left:${r.left}px; top:${r.top}px;
        width:${r.width}px; height:${r.height}px;
        background:rgba(255,215,0,0.12);
        border:2px solid rgba(255,215,0,0.4);
        animation:fx-artifact-fill 2s ease-out forwards;
    `;
    container.appendChild(fill);
}


//------------------------------------------------------------------------
//-------------------ITEM USE: LAUNCH + GRID IMPACT-----------------------
//------------------------------------------------------------------------
// The shared "item was used" show that plays for EVERY puzzle item on top of
// its own effect: a burst on the inventory slot, the item flying to the
// puzzle in a glowing arc, and a coloured impact on the grid (shockwave, light
// sweep, glowing frame, sparkles). Colour follows the item's category.

// Impact colour per item category (ITEM_GROUPS label).
const FX_GROUP_COLORS = {
    Reveal: '#2ed573', Mark: '#ffaa00', Time: '#4fc3f7', Utility: '#7aa2ff',
    Power: '#ffd700', Cursed: '#c04bff', Special: '#f5d98b',
};

// Category colour for an item id (gold when it belongs to no category).
function _fxGroupColor(defId) {
    const group = ITEM_GROUPS.find(g => g.slots.includes(defId));
    return (group && FX_GROUP_COLORS[group.label]) || '#ffd700';
}

// Adds a fixed-position element to the page that plays the given keyframes
// and then removes itself. (Keyframes run through the browser's animation
// API, so nothing has to be declared in CSS.)
function _fxFlash(cssText, keyframes, options) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed; pointer-events:none; z-index:9400;' + cssText;
    document.body.appendChild(el);
    const anim = el.animate(keyframes, { fill: 'forwards', ...options });
    anim.onfinish = () => el.remove();
    return el;
}

// Where the used item sat on screen: its inventory slot, else its category
// button, else the bottom centre of the window. Read BEFORE the item is
// consumed, because consuming rebuilds the inventory bar.
export function _fxSlotRect(defId) {
    const group = ITEM_GROUPS.find(g => g.slots.includes(defId));
    const el = document.querySelector(`.inv-slot[data-def-id="${defId}"]`)
        || (group && document.querySelector(`.inv-cat-btn[data-group="${group.label}"]`));
    const r = el ? el.getBoundingClientRect() : null;
    if (r && r.width > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.width };
    return { x: window.innerWidth / 2, y: window.innerHeight - 60, size: 48 };
}

// Ring + sparks bursting out of a point (the inventory slot).
function _fxSlotBurst(x, y, color) {
    _fxFlash(`left:${x - 30}px; top:${y - 30}px; width:60px; height:60px; border-radius:50%;`
        + `border:3px solid ${color}; box-shadow:0 0 16px ${color};`,
        [{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(2.1)', opacity: 0 }],
        { duration: 520, easing: 'ease-out' });
    for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 34 + Math.random() * 30;
        _fxFlash(`left:${x - 3}px; top:${y - 3}px; width:6px; height:6px; border-radius:50%;`
            + `background:#fff; box-shadow:0 0 8px 2px ${color};`,
            [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
                { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(0.2)`, opacity: 0 }],
            { duration: 480 + Math.random() * 200, easing: 'ease-out' });
    }
}

// Viewport rectangle of the puzzle grid, or null when no grid is showing.
function _fxGridViewRect() {
    const c = _fxGetGridCorners();
    if (!c) return null;
    const f = c.first.getBoundingClientRect(), l = c.last.getBoundingClientRect();
    return { left: f.left, top: f.top, width: l.right - f.left, height: l.bottom - f.top };
}

// The coloured hit on the grid: an expanding shockwave, a light sweep across
// the cells, a glowing frame and sparkles drifting up.
function _fxGridImpact(color) {
    const g = _fxGridViewRect();
    if (!g) return;
    const cx = g.left + g.width / 2, cy = g.top + g.height / 2;
    const reach = Math.hypot(g.width, g.height);

    _fxFlash(`left:${cx - reach / 2}px; top:${cy - reach / 2}px; width:${reach}px; height:${reach}px; border-radius:50%;`
        + `border:4px solid ${color}; box-shadow:0 0 30px ${color}, inset 0 0 30px ${color};`,
        [{ transform: 'scale(0.05)', opacity: 0.95 }, { transform: 'scale(1)', opacity: 0 }],
        { duration: 750, easing: 'cubic-bezier(.2,.7,.3,1)' });

    _fxFlash(`left:${g.left - 6}px; top:${g.top - 6}px; width:${g.width + 12}px; height:${g.height + 12}px; border-radius:8px;`
        + `border:3px solid ${color};`,
        [{ boxShadow: `0 0 0 0 ${color}, inset 0 0 0 0 ${color}`, opacity: 1 },
            { boxShadow: `0 0 26px 6px ${color}, inset 0 0 40px 4px ${color}`, opacity: 0.9, offset: 0.3 },
            { boxShadow: `0 0 4px 0 ${color}, inset 0 0 6px 0 ${color}`, opacity: 0 }],
        { duration: 1100, easing: 'ease-out' });

    const sweep = _fxFlash(`left:${g.left}px; top:${g.top}px; width:${g.width}px; height:${g.height}px; overflow:hidden; border-radius:4px;`,
        [{ opacity: 1 }, { opacity: 1 }], { duration: 800 });
    const band = document.createElement('div');
    band.style.cssText = 'position:absolute; top:-20%; bottom:-20%; width:35%; transform:skewX(-18deg);'
        + `background:linear-gradient(90deg, transparent, ${color}, #fff, ${color}, transparent); opacity:0.6; mix-blend-mode:screen;`;
    sweep.appendChild(band);
    band.animate([{ left: '-45%' }, { left: '115%' }], { duration: 800, easing: 'ease-in-out', fill: 'forwards' });

    for (let i = 0; i < 16; i++) {
        const x = g.left + Math.random() * g.width;
        const y = g.top + g.height * (0.4 + Math.random() * 0.6);
        _fxFlash(`left:${x - 3}px; top:${y - 3}px; width:6px; height:6px; border-radius:50%;`
            + `background:#fff; box-shadow:0 0 10px 3px ${color};`,
            [{ transform: 'translateY(0) scale(0.4)', opacity: 0 },
                { transform: `translateY(${-30 - Math.random() * 40}px) scale(1)`, opacity: 1, offset: 0.25 },
                { transform: `translateY(${-90 - Math.random() * 70}px) scale(0.2)`, opacity: 0 }],
            { duration: 900 + Math.random() * 500, delay: Math.random() * 250, easing: 'ease-out' });
    }
}

// Flies the item's art from the slot to the middle of the grid on an arc,
// leaving a fading glow trail, and calls `onArrive` when it lands.
function _fxItemOrb(defId, fallbackEmoji, from, glow, onArrive) {
    const g = _fxGridViewRect();
    if (!g) { onArrive(); return; }
    const tx = g.left + g.width / 2, ty = g.top + g.height / 2;
    const size = Math.max(44, Math.min(64, from.size));
    const url = (typeof GAME_ART !== 'undefined' && GAME_ART) ? GAME_ART.url('item', defId) : null;

    const orb = document.createElement('div');
    orb.style.cssText = `position:fixed; pointer-events:none; z-index:9401; left:${-size / 2}px; top:${-size / 2}px;`
        + `width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; font-size:${size * 0.8}px;`
        + `filter:drop-shadow(0 0 10px ${glow}) drop-shadow(0 0 22px ${glow});`;
    if (url) orb.innerHTML = `<img src="${url}" alt="" draggable="false" style="width:100%;height:100%;object-fit:contain;">`;
    else orb.textContent = fallbackEmoji || '✦';
    document.body.appendChild(orb);

    const midX = (from.x + tx) / 2, midY = Math.min(from.y, ty) - 110;
    const flight = orb.animate([
        { transform: `translate(${from.x}px,${from.y}px) scale(0.8) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${midX}px,${midY}px) scale(1.35) rotate(150deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${tx}px,${ty}px) scale(0.7) rotate(320deg)`, opacity: 0.2 },
    ], { duration: 520, easing: 'cubic-bezier(.35,.1,.6,1)', fill: 'forwards' });
    const trail = setInterval(() => {
        const r = orb.getBoundingClientRect();
        _fxFlash(`left:${r.left + r.width / 2 - 6}px; top:${r.top + r.height / 2 - 6}px; width:12px; height:12px; border-radius:50%;`
            + `background:${glow}; box-shadow:0 0 12px 4px ${glow};`,
            [{ transform: 'scale(1)', opacity: 0.8 }, { transform: 'scale(0.1)', opacity: 0 }],
            { duration: 380, easing: 'ease-out' });
    }, 32);
    flight.onfinish = () => { clearInterval(trail); orb.remove(); onArrive(); };
}

// The full item-use show for item `def` (slot burst, flying item, grid
// impact). `from` is the slot position read before the item was consumed.
export function _fxItemUse(def, rarityColor, from) {
    if (!def || !from) return;
    const color = _fxGroupColor(def.id);
    _fxSlotBurst(from.x, from.y, rarityColor || color);
    _fxItemOrb(def.id, def.icon, from, rarityColor || color, () => { if (!_fxItemLanding(def.id)) _fxGridImpact(color); });
}
