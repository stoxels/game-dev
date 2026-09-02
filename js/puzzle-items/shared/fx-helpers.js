//------------------------------------------------------------------------
//-------------------SHARED — FX HELPERS----------------------
//------------------------------------------------------------------------

// Shared plumbing for every item visual effect: z-index tiers, particle
// palettes, DOM builders, puzzle geometry, the freeze countdown overlay
// (also used by classes/timer), the clock visual (addTime / Golden Clock
// / Chronofracture), the gold tint fill (Golden Clock / Chronofracture)
// and the shield border (Shield / Cursed Shield).

// Shared z-index tiers so overlapping effects stack predictably.
const FX_Z = {
    base: 320,   // standard overlay
    above: 325,   // icons / foreground overlays
    high: 326,   // large centered icons
    icon: 327,   // popup icons sitting above overlays
    top: 328,   // chronobolt flash layer
    supreme: 330,   // artifact / chaos / shadow seal icons
};


// Horizontal positions (as grid-width fractions) for lightning bolts.
const CHRONOBOLT_X_FRACTIONS = [0.2, 0.5, 0.8];


// Explosion colours used by ChaosGrid.
const CHAOS_BLAST_COLOURS = ['#e74c3c', '#f39c12', '#9b59b6', '#3498db', '#2ecc71', '#e91e63'];


// Particle palettes shared across multiple effects.
const PARTICLES = {
    gemSparkles: { chars: ['✦', '◆', '●', '▪'], colors: ['#88f', '#c8f', '#66f', '#aaf', '#fff'] },
    artifactStars: { chars: ['★', '✦', '✧', '⋆', '🌟'], colors: ['#ffd700', '#ffe066', '#fff9c4', '#fff', '#ffc300'] },
    witchSmoke: { chars: ['✦', '◆', '★', '·'], colors: ['#9b59b6', '#c39bd3', '#6c3483', '#d7bde2', '#fff'] },
    vortexDebris: { chars: ['○', '◌', '◯', '·', '▪'], colors: ['#aaa', '#ccc', '#888', '#ddd', '#fff'] },
    shadowVoid: { chars: ['●', '◯', '·', '▪'], colors: ['#111', '#333', '#222', '#444'] },
    cursedCrosses: { chars: ['✕', '✗', '×'], colors: ['#f44', '#ff6666', '#cc0000'] },
    chaosShrapnel: { chars: ['★', '✦', '▪', '●'] },
};


// SFX keys used by MistakeEraser variants, keyed by defId.
const MISTAKE_ERASER_SFX = {
    mistakeEraser: 'tutor',
    mistakeEraser4: 'professor',
    mistakeEraser6: 'scholar',
    mistakeEraserAll: 'grand_mentor',
};


// Pearl variant definitions: color hex → emoji + sfx key.
const PEARL_VARIANTS = {
    '#88aaff': { emoji: '🔵', sfx: 'pearl_of_haste' },
    '#cc88ff': { emoji: '🟣', sfx: 'pearl_of_swiftness' },
    '#e0e0e0': { emoji: '⚪', sfx: 'grand_pearl' },
};


// Returns a new absolutely positioned div with the given cssText,
// already appended to `parent`.  Does NOT auto-remove itself.
function _fxMakeElement(parent, cssText, className) {
    const el = document.createElement('div');
    if (className) el.className = className;
    el.style.cssText = cssText;
    parent.appendChild(el);
    return el;
}


// Creates a centered emoji icon at (cx, cy) inside `parent`.
// Auto-removes after `removeAfterMs`.
// Returns the element in case the caller needs to remove it early.
function _fxMakeIcon(parent, emoji, cx, cy, fontSize, animationCss, removeAfterMs) {
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


// Creates one expandable ring div centered at (cx, cy).
// `ringSize` is the CSS custom property value for --ring-max / --ring-size.
// `delayMs` staggers the animation when spawning multiple rings.
function _fxMakeRing(container, cx, cy, className, ringSize, delayMs, animationName, duration = '0.9s') {
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
function _fxGetGridCorners() {
    const sol = cur?.grid;
    if (!sol || !sol.length) return null;

    const rows = sol.length;
    const cols = sol[0].length;
    const first = document.getElementById('g-0-0');
    const last = document.getElementById(`g-${rows - 1}-${cols - 1}`);
    if (!first || !last) return null;

    return { first, last };
}


// _fxGetPuzzleRectForWrap — like _fxGetPuzzleRect(), but returns coordinates
// relative to #puzzle-scaler-wrap instead of #puzzle-scaler, WITHOUT dividing
// by currentZoom. Use this for any overlay that is attached to the wrap
// itself (which is never transformed) rather than to #puzzle-scaler (which
// has the zoom transform applied).
//
// Dividing by currentZoom is only valid for elements living *inside* the
// scaled element (#puzzle-scaler) — for anything living in the unscaled
// wrap, that division introduces zoom-dependent drift that blows up at
// high zoom levels (this was the cause of the fx-shield-border /
// variance-shield-bubble mispositioning bug).
function _fxGetPuzzleRectForWrap() {
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
function _fxGetPuzzleRect() {
    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return null;
    if (!wrap.style.position || wrap.style.position === 'static') {
        wrap.style.position = 'relative';
    }

    const corners = _fxGetGridCorners();
    if (!corners) return null;
    const { first, last } = corners;

    const zoom = currentZoom || 1;
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
function _fxOverlay(wrap, durationMs, extraStyle = '') {
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
function _ensureFreezeCountdownStyles() {
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
function playFreezeCountdownOverlay(durationMs) {
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
//   count    — total particles
//   chars    — array of text characters to pick from randomly
//   colors   — array of CSS color strings to pick from randomly
//   sizeMin / sizeMax — font-size range in px
//   container — parent element to append particles into
//   startX / startY — center spawn position (px in container space)
//   spreadX / spreadY — random offset radius in each axis (px)
//   duration — base animation duration (ms); individual particles vary ±30%
//   cssClass — class name applied to each particle (handles the animation)
function _fxSpawnParticles(opts) {
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
            container.appendChild(p);
            setTimeout(() => p.remove(), duration * 1.5);
        }, i * (duration / count / 2));
    }
}


// Helper: creates the central burst div for the clock effect.
function _fxMakeClockBurst(container, cx, cy) {
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
function _fxMakeClockRays(container, cx, cy, rayLength) {
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


// 🕰️ Clock — clock hands sweep + golden radial burst.
function _fxClock() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1800);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const rayLength = Math.max(r.width, r.height) * 0.55;

    _fxMakeClockBurst(overlay, cx, cy);
    _fxMakeClockRays(overlay, cx, cy, rayLength);
    _fxMakeIcon(r.wrap, '🕰️', cx, cy, 50, 'animation:fx-icon-pop 0.7s ease-out forwards;', 1100);

    Audio_Manager.playSFX('clock');
}


// _fxShieldBorderAdd — places a persistent glowing border around the puzzle grid.
// Uses position:fixed with screen-space coords so it is unaffected by the
// CSS transform on puzzle-scaler.  A ResizeObserver repositions it whenever
// the grid is zoomed or the window resizes.
function _fxShieldBorderAdd() {
    if (document.getElementById('fx-shield-border')) return;

    const border = document.createElement('div');
    border.id = 'fx-shield-border';

    // Attach to the WRAP, not the scaler — the wrap is never transformed,
    // so we can position this with plain rect deltas and never touch
    // currentZoom. (Previously attached to #puzzle-scaler and divided by
    // currentZoom in _repositionShieldBorder — that's what caused the
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
    // (unscaled) coordinates — no zoom division required.
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

    // Ctrl+Wheel zoom fires a wheel event on the wrap — reposition then too.
    wrap.addEventListener('wheel', _repositionShieldBorder, { passive: true });
}


// Removes the shield border with a short fade-out.
function _fxShieldBorderRemove() {
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
function _fxMakeGoldTintFill(container, r) {
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
