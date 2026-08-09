// ============================================================
// item_effects.js
//
// Plays a thematic visual effect on the puzzle area whenever
// a player uses an item.  Entry point: playItemEffect(defId)
// called from useItem() in inventory.js immediately after the
// item's game logic fires.
//
// Each effect is self-contained: it creates DOM elements,
// animates them via CSS, then removes them.  No persistent
// state is kept — effects are purely cosmetic / fire-and-forget.
//
//
// FILE STRUCTURE (top to bottom):
//   - Constants
//   - DOM builder helpers  (generic utilities used everywhere)
//   - Shared layout helpers (puzzle rect, overlay, particles)
//   - Reveal effects
//   - Mark-wrong effects
//   - Add-time effects
//   - Utility effects
//   - Cursed effects
//   - Keystone / pearl effects
//   - Entry point: playItemEffect()
// ============================================================


// ============================================================
// ----------------------- CONSTANTS --------------------------
// ============================================================



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


// ============================================================
// ----------------- DOM BUILDER HELPERS ----------------------
// ============================================================
// Low-level helpers that create and style individual DOM nodes.
// These keep the effect functions readable by removing repeated
// boilerplate for positioning and inline CSS.
// ============================================================

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


// ============================================================
// ---------------- SHARED LAYOUT HELPERS ---------------------
// ============================================================
// Higher-level helpers that deal with puzzle geometry and
// common overlay/particle patterns used by many effects.
// ============================================================

// Returns the bounding rect of the puzzle grid in the
// coordinate space of the puzzle-scaler element (logical px).
// Returns null when the grid elements can't be found.
function _fxGetPuzzleRect() {
    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return null;
    if (!wrap.style.position || wrap.style.position === 'static') {
        wrap.style.position = 'relative';
    }

    const sol = cur?.grid;
    if (!sol || !sol.length) return null;

    const rows = sol.length;
    const cols = sol[0].length;
    const first = document.getElementById('g-0-0');
    const last = document.getElementById(`g-${rows - 1}-${cols - 1}`);
    if (!first || !last) return null;

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


// ============================================================
// ------------------- REVEAL ITEM EFFECTS --------------------
// ============================================================

// Helper: places a centered glow div inside the overlay.
function _fxCandleGlow(overlay, cx, cy) {
    overlay.innerHTML = `<div class="fx-candle-glow" style="
        position:absolute;
        left:${cx}px; top:${cy}px;
        transform:translate(-50%,-50%);
    "></div>`;
}

// 🕯️ Candle — warm amber glow slowly blooms across the puzzle.
function _fxCandle() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    // Radial amber glow centered on the grid
    const overlay = _fxOverlay(r.wrap, 1800);
    _fxCandleGlow(overlay, cx, cy);

    // Floating flame icon rising from grid top
    _fxMakeIcon(r.wrap, '🕯️', cx, r.top, 48, 'animation:fx-candle-flame 2s ease-out forwards;', 2000);

    Audio_Manager.playSFX('candle');
}

// 🔍 Magnifier — a loupe slides across the grid left→right.
function _fxMagnifier() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const lens = document.createElement('div');
    lens.className = 'fx-magnifier-lens';
    lens.textContent = '🔍';
    lens.style.cssText = `
        position:absolute;
        top:${r.top + r.height / 2 - 28}px;
        left:${r.left - 40}px;
        font-size:48px;
        pointer-events:none;
        z-index:${FX_Z.above};
        animation:fx-magnifier-slide 0.8s cubic-bezier(.3,1.4,.6,1) forwards;
        --slide-end:${r.right + 20}px;
    `;
    r.wrap.appendChild(lens);
    setTimeout(() => lens.remove(), 1000);

    Audio_Manager.playSFX('magnifier');
}

// Helper: spawns `count` concentric rings expanding from (cx, cy).
// `baseSize` controls how large the outermost ring grows.
function _fxSpawnExpandingRings(container, cx, cy, count, baseSize, className, animationName, delayStep = 0.18) {
    for (let i = 0; i < count; i++) {
        _fxMakeRing(container, cx, cy, className, baseSize * (0.5 + i * 0.35), i * delayStep, animationName);
    }
}

// 🔭 Spyglass — three concentric scan-rings expand from grid centre.
function _fxSpyglass() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1400);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const maxSize = Math.max(r.width, r.height);

    _fxSpawnExpandingRings(overlay, cx, cy, 3, maxSize, 'fx-spyglass-ring', 'fx-ring-expand');

    Audio_Manager.playSFX('spyglass');
}

// Helper: creates one horizontal scan-bar that sweeps downward.
function _fxMakeScanBar(container, r, delaySeconds) {
    const bar = document.createElement('div');
    bar.className = 'fx-scanner-bar';
    bar.style.cssText = `
        position:absolute;
        left:${r.left}px; width:${r.width}px;
        top:${r.top}px; height:4px;
        animation:fx-scanner-sweep 0.65s linear ${delaySeconds}s forwards;
        --scan-distance:${r.height}px;
    `;
    container.appendChild(bar);
}

// 📡 Scanner — a horizontal green scan-bar sweeps top-to-bottom twice.
function _fxScanner() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600);

    // Two successive scan passes, offset in time
    _fxMakeScanBar(overlay, r, 0);
    _fxMakeScanBar(overlay, r, 0.55);

    Audio_Manager.playSFX('scanner');
}


// ============================================================
// ----------------- MARK-WRONG ITEM EFFECTS ------------------
// ============================================================

// Helper: creates one horizontal eraser streak at a given vertical position.
function _fxMakeEraserStreak(container, r, yFraction, delaySeconds) {
    const streak = document.createElement('div');
    streak.className = 'fx-eraser-streak';
    streak.style.cssText = `
        position:absolute;
        top:${r.top + r.height * yFraction}px;
        left:${r.left}px; width:${r.width}px; height:12px;
        animation:fx-eraser-wipe 0.45s ease-out ${delaySeconds}s forwards;
    `;
    container.appendChild(streak);
}

// ✏️ Eraser — pink rubber streaks wipe across the grid.
function _fxEraser() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1200);
    _fxMakeEraserStreak(overlay, r, 1 / 3, 0);
    _fxMakeEraserStreak(overlay, r, 2 / 3, 0.18);

    Audio_Manager.playSFX('eraser');
}

// Helper: spawns the broom icon that slides right-to-left across the grid.
function _fxMakeBroom(wrap, r) {
    const broom = document.createElement('div');
    broom.className = 'fx-sweeper-icon';
    broom.textContent = '🧹';
    broom.style.cssText = `
        position:absolute;
        top:${r.top + r.height / 2 - 24}px;
        left:${r.right + 20}px;
        font-size:44px;
        pointer-events:none; z-index:${FX_Z.above};
        animation:fx-sweeper-broom 0.85s cubic-bezier(.3,1.3,.6,1) forwards;
        --broom-start:${r.right + 20}px;
        --broom-end:${r.left - 50}px;
    `;
    wrap.appendChild(broom);
    setTimeout(() => broom.remove(), 1100);
}

// Helper: spawns dust particle divs staggered across the broom's path.
function _fxMakeDustParticles(container, r, count) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const dust = document.createElement('div');
            dust.className = 'fx-dust-particle';
            dust.style.cssText = `
                position:absolute;
                left:${r.left + Math.random() * r.width}px;
                top:${r.top + r.height / 2 + (Math.random() - 0.5) * 60}px;
            `;
            container.appendChild(dust);
        }, i * 50);
    }
}

// 🧹 Sweeper — a sweeping broom icon trails dust particles.
function _fxSweeper() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    _fxMakeBroom(r.wrap, r);

    const overlay = _fxOverlay(r.wrap, 1400);
    _fxMakeDustParticles(overlay, r, 14);

    Audio_Manager.playSFX('sweeper');
}

// Helper: creates and drops the magnet icon above the grid.
// Returns { magnetX, magnetY } so the cross particles know where to fly.
function _fxMakeMagnetIcon(wrap, r) {
    const magnetX = r.left + r.width / 2;
    const magnetY = r.top - 10;

    const magnet = document.createElement('div');
    magnet.className = 'fx-magnet-icon';
    magnet.textContent = '🧲';
    magnet.style.cssText = `
        position:absolute;
        left:${magnetX}px; top:${r.top - 40}px;
        font-size:52px; transform:translateX(-50%);
        pointer-events:none; z-index:${FX_Z.high};
        animation:fx-magnet-drop 0.45s cubic-bezier(.2,1.5,.5,1) forwards;
        --magnet-land:${magnetY}px;
    `;
    wrap.appendChild(magnet);
    setTimeout(() => magnet.remove(), 1700);

    return { magnetX, magnetY };
}

// Helper: spawns ✕ cross particles that fly toward the magnet.
function _fxMagnetCrossParticles(container, r, magnetX, magnetY, count) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const cross = document.createElement('div');
            cross.className = 'fx-magnet-cross';
            cross.textContent = '✕';

            const startX = r.left + Math.random() * r.width;
            const startY = r.top + Math.random() * r.height;

            cross.style.cssText = `
                position:absolute;
                left:${startX}px; top:${startY}px;
                --dx:${magnetX - startX}px;
                --dy:${magnetY - startY}px;
                animation:fx-cross-fly 0.55s ease-in forwards;
            `;
            container.appendChild(cross);
        }, 400 + i * 40);
    }
}

// 🧲 Error Magnet — a magnet swoops in, ✕ crosses fly toward it.
function _fxErrorMagnet() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const { magnetX, magnetY } = _fxMakeMagnetIcon(r.wrap, r);

    const overlay = _fxOverlay(r.wrap, 1600);
    _fxMagnetCrossParticles(overlay, r, magnetX, magnetY, 18);

    Audio_Manager.playSFX('magnet');
}

// Helper: creates the large centered gem icon with burst animation.
function _fxMakeGemIcon(wrap, cx, cy) {
    const gem = document.createElement('div');
    gem.className = 'fx-gem-pulse';
    gem.textContent = '💎';
    gem.style.cssText = `
        position:absolute;
        left:${cx}px; top:${cy}px;
        transform:translate(-50%,-50%);
        font-size:64px;
        pointer-events:none; z-index:${FX_Z.high};
        animation:fx-gem-burst 1.2s ease-out forwards;
    `;
    wrap.appendChild(gem);
    setTimeout(() => gem.remove(), 1400);
}

// 💎 Error Gem — gem pulses, then showers coloured sparkles top-down.
function _fxErrorGem() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeGemIcon(r.wrap, cx, cy);

    // Sparkle rain falls from the top of the grid downward
    const overlay = _fxOverlay(r.wrap, 1600);
    _fxSpawnParticles({
        ...PARTICLES.gemSparkles,
        count: 24, sizeMin: 10, sizeMax: 18,
        container: overlay,
        startX: cx, startY: r.top,
        spreadX: r.width * 0.9, spreadY: 30,
        duration: 1100, cssClass: 'fx-gem-spark',
    });

    Audio_Manager.playSFX('error_gem');
}


// ============================================================
// ------------------- ADD-TIME ITEM EFFECTS ------------------
// ============================================================

// Helper: creates the large hourglass icon with spin animation.
function _fxMakeHourglassIcon(wrap, cx, cy) {
    const hg = document.createElement('div');
    hg.className = 'fx-hourglass-icon';
    hg.textContent = '⏳';
    hg.style.cssText = `
        position:absolute;
        left:${cx}px; top:${cy}px;
        transform:translate(-50%,-50%);
        font-size:56px; pointer-events:none; z-index:${FX_Z.high};
        animation:fx-hourglass-spin 1s ease-in-out forwards;
    `;
    wrap.appendChild(hg);
    setTimeout(() => hg.remove(), 1600);
}

// Helper: spawns sand grain particles falling from the hourglass center.
function _fxMakeSandParticles(container, cx, cy, count) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const grain = document.createElement('div');
            grain.className = 'fx-sand-grain';
            grain.style.cssText = `
                position:absolute;
                left:${cx + (Math.random() - 0.5) * 16}px;
                top:${cy - 20}px;
                --fall-dist:${40 + Math.random() * 30}px;
            `;
            container.appendChild(grain);
        }, i * 55);
    }
}

// ⏳ Hourglass — sand streams downward through the centre.
function _fxHourglass() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeHourglassIcon(r.wrap, cx, cy);

    const overlay = _fxOverlay(r.wrap, 1400);
    _fxMakeSandParticles(overlay, cx, cy, 20);

    Audio_Manager.playSFX('hourglass');
}

// Helper: spawns `count` time-ring divs rippling outward from (cx, cy).
function _fxMakeTimeRings(container, cx, cy, count, maxSize) {
    for (let i = 0; i < count; i++) {
        const ring = document.createElement('div');
        ring.className = 'fx-time-ring';
        ring.style.cssText = `
            position:absolute;
            left:${cx}px; top:${cy}px;
            transform:translate(-50%,-50%) scale(0);
            animation:fx-time-ring-expand 0.85s ease-out ${i * 0.2}s forwards;
            --ring-max:${maxSize}px;
        `;
        container.appendChild(ring);
    }
}

// ⏱️ Stopwatch — timer rings ripple outward from centre.
function _fxStopwatch() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1400);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const maxSize = Math.max(r.width, r.height) * 0.7;

    _fxMakeTimeRings(overlay, cx, cy, 4, maxSize);
    _fxMakeIcon(r.wrap, '⏱️', cx, cy, 42, 'animation:fx-icon-pop 0.6s ease-out forwards;', 900);

    Audio_Manager.playSFX('stopwatch');
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

// Generates a zigzag SVG lightning path of the given height.
// Returns an HTML string containing the full <svg> element.
function _fxGenerateLightningPath(height) {
    const segs = 8;
    const segH = height / segs;
    let d = 'M 0 0';
    for (let i = 1; i <= segs; i++) {
        d += ` L ${(Math.random() - 0.5) * 28} ${segH * i}`;
    }
    return `
        <svg width="60" height="${height}"
             style="overflow:visible; position:absolute; left:-30px; top:0;">
            <path d="${d}" stroke="#ffe066" stroke-width="3" fill="none"
                  filter="url(#glow)" opacity="0.95"/>
            <path d="${d}" stroke="#fff"   stroke-width="1.5" fill="none" opacity="0.8"/>
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
        </svg>`;
}

// Helper: creates one lightning bolt div at the given horizontal position.
function _fxMakeLightningBolt(container, r, xFraction) {
    const bolt = document.createElement('div');
    bolt.className = 'fx-lightning-bolt';
    bolt.style.cssText = `
        position:absolute;
        left:${r.left + r.width * xFraction}px;
        top:${r.top}px;
        --bolt-height:${r.height}px;
        animation:fx-bolt-strike 0.35s steps(3) forwards;
    `;
    bolt.innerHTML = _fxGenerateLightningPath(r.height);
    container.appendChild(bolt);
}

// ⚡ Chronobolt — lightning bolts crackle across the puzzle grid.
function _fxChronobolt() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600, `z-index:${FX_Z.top};`);

    // Full-grid white flash that fades out
    _fxMakeElement(overlay, 'position:absolute;inset:0;', 'fx-chronobolt-flash');

    // Three staggered lightning bolts striking from the top edge
    CHRONOBOLT_X_FRACTIONS.forEach((xFrac, i) => {
        setTimeout(() => _fxMakeLightningBolt(overlay, r, xFrac), i * 180);
    });

    // Large ⚡ icon that flashes at the centre
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    _fxMakeIcon(r.wrap, '⚡', cx, cy, 72, `z-index:${FX_Z.supreme}; animation:fx-bolt-icon 0.5s ease-out forwards;`, 800);

    Audio_Manager.playSFX('chronobolt');
}


// ============================================================
// ------------------- UTILITY ITEM EFFECTS -------------------
// ============================================================


// _fxShieldBorderAdd — places a persistent glowing border around the puzzle grid.
// Uses position:fixed with screen-space coords so it is unaffected by the
// CSS transform on puzzle-scaler.  A ResizeObserver repositions it whenever
// the grid is zoomed or the window resizes.
function _fxShieldBorderAdd() {
    if (document.getElementById('fx-shield-border')) return;

    const border = document.createElement('div');
    border.id = 'fx-shield-border';
    border.style.cssText = `
        position:fixed;
        pointer-events:none;
        z-index:${FX_Z.above};
        border-radius:4px;
        box-shadow:
            0 0 0 3px rgba(255,215,0,0.9),
            0 0 12px 4px rgba(255,215,0,0.6),
            0 0 28px 8px rgba(255,215,0,0.3);
        animation:fx-shield-border-pulse 1.8s ease-in-out infinite;
    `;
    document.body.appendChild(border);

    // Positions the border to match the grid's current screen rect.
    function _repositionShieldBorder() {
        const sol = cur?.grid;
        if (!sol || !sol.length) return;
        const rows = sol.length;
        const cols = sol[0].length;
        const first = document.getElementById('g-0-0');
        const last = document.getElementById(`g-${rows - 1}-${cols - 1}`);
        if (!first || !last) return;

        const fRect = first.getBoundingClientRect();
        const lRect = last.getBoundingClientRect();

        border.style.left = fRect.left + 'px';
        border.style.top = fRect.top + 'px';
        border.style.width = (lRect.right - fRect.left) + 'px';
        border.style.height = (lRect.bottom - fRect.top) + 'px';
    }

    _repositionShieldBorder();

    // Re-position on scroll or resize so the fixed border tracks the grid.
    const wrap = document.getElementById('puzzle-scaler-wrap');
    border._reposition = _repositionShieldBorder;
    if (wrap) wrap.addEventListener('scroll', _repositionShieldBorder, { passive: true });
    window.addEventListener('resize', _repositionShieldBorder, { passive: true });

    // Also reposition on every zoom (Ctrl+Wheel fires a wheel event on wrap).
    if (wrap) wrap.addEventListener('wheel', _repositionShieldBorder, { passive: true });
}

// Removes the shield border with a short fade-out.
function _fxShieldBorderRemove() {
    const border = document.getElementById('fx-shield-border');
    if (!border) return;

    // Clean up tracking listeners
    const wrap = document.getElementById('puzzle-scaler-wrap');
    if (border._reposition) {
        if (wrap) wrap.removeEventListener('scroll', border._reposition);
        if (wrap) wrap.removeEventListener('wheel', border._reposition);
        window.removeEventListener('resize', border._reposition);
    }

    border.style.animation = 'fx-shield-border-shatter 0.35s ease-out forwards';
    setTimeout(() => border.remove(), 380);
}



// Helper: spawns the shield overlay div covering the whole grid area.
function _fxMakeShieldOverlay(wrap, r) {
    const shield = document.createElement('div');
    shield.className = 'fx-shield-overlay';
    shield.style.cssText = `
        position:absolute;
        left:${r.left}px; top:${r.top}px;
        width:${r.width}px; height:${r.height}px;
        pointer-events:none; z-index:${FX_Z.above};
        animation:fx-shield-pulse 1.2s ease-out forwards;
    `;
    shield.innerHTML = `<div class="fx-shield-hex">🛡️</div>`;
    wrap.appendChild(shield);
    setTimeout(() => shield.remove(), 1500);
}

// 🛡️ Shield — a golden hexagonal shield briefly overlays the puzzle.
function _fxShield() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const maxSize = Math.max(r.width, r.height) * 0.65;

    _fxMakeShieldOverlay(r.wrap, r);

    // Hex shimmer rings rippling outward
    const overlay = _fxOverlay(r.wrap, 1400);
    for (let i = 0; i < 3; i++) {
        _fxMakeRing(overlay, cx, cy, 'fx-shield-ring', maxSize, i * 0.22, 'fx-shield-ring-expand');
    }

    _fxShieldBorderAdd();

    Audio_Manager.playSFX('shield');
}


// 🛡️💥 Shield Break — Spawns shattering particles at the exact cell location
function playShieldBreakEffect(row, col) {
    const wrap = document.getElementById('puzzle-scaler');
    const cell = document.getElementById(`g-${row}-${col}`);
    if (!wrap || !cell) return;

    const zoom = currentZoom || 1;
    const wRect = wrap.getBoundingClientRect();
    const cRect = cell.getBoundingClientRect();

    // Calculate the logical center coordinates of the targeted cell
    const cx = (cRect.left - wRect.left + cRect.width / 2) / zoom;
    const cy = (cRect.top - wRect.top + cRect.height / 2) / zoom;

    // Create a short-lived canvas overlay container for the particles
    const overlay = _fxOverlay(wrap, 1000);

    // 1. Burst golden and orange shattering shards from the cell epicenter
    _fxSpawnParticles({
        count: 14,
        chars: ['💥', '🔸', '▫️', '·'],
        colors: ['#ffd700', '#ffa500', '#ffffff', '#e0e0e0'],
        sizeMin: 12,
        sizeMax: 18,
        container: overlay,
        startX: cx,
        startY: cy,
        spreadX: 30,
        spreadY: 30,
        duration: 600,
        cssClass: 'fx-particle-generic'
    });

    // 2. Briefly pop a shield icon that vanishes into the shatter effect
    _fxMakeIcon(
        wrap,
        '🛡️',
        cx,
        cy,
        28,
        'animation:fx-icon-pop 0.4s ease-out forwards;',
        400
    );

    _fxShieldBorderRemove();
}





// ❄️ Freeze — icy blizzard creeps in from the edges.
// Delegates to the shared blizzard system defined in class.js.
function _fxFreeze() {
    _startBlizzardEffect(2200);
    Audio_Manager.playSFX('time_freeze');
}

// Helper: creates the three diagonal chalk smear divs.
function _fxMakeChalkSmears(container, r) {
    for (let i = 0; i < 3; i++) {
        const smear = document.createElement('div');
        smear.className = 'fx-chalk-smear';
        smear.style.cssText = `
            position:absolute;
            left:${r.left + r.width * (0.2 + i * 0.25)}px;
            top:${r.top + r.height * 0.4}px;
            animation:fx-chalk-wipe 0.5s ease-out ${i * 0.12}s forwards;
        `;
        container.appendChild(smear);
    }
}

// 🎓 Mistake Eraser — chalk dust smears clear mistakes from the board.
// Variant-specific SFX is chosen via MISTAKE_ERASER_SFX lookup.
function _fxMistakeEraser(defId) {
    Audio_Manager.playSFX(MISTAKE_ERASER_SFX[defId] || 'tutor');

    const r = _fxGetPuzzleRect();
    if (!r) return;

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    const overlay = _fxOverlay(r.wrap, 1300);
    _fxMakeChalkSmears(overlay, r);
    _fxMakeIcon(r.wrap, '🎓', cx, cy, 56, 'animation:fx-icon-pop 0.6s ease-out forwards;', 900);
}

// Helper: spawns the 8 compass-direction arrows that shoot outward.
function _fxMakePrimerArrows(container, cx, cy, r) {
    const arrows = ['▲', '▶', '▼', '◀', '◥', '◤', '◣', '◢'];
    arrows.forEach((ch, i) => {
        const angle = (i / arrows.length) * Math.PI * 2;
        const a = document.createElement('div');
        a.className = 'fx-primer-arrow';
        a.textContent = ch;
        a.style.cssText = `
            position:absolute; left:${cx}px; top:${cy}px;
            font-size:22px; color:#ffd700;
            text-shadow:0 0 8px #ffd700;
            animation:fx-primer-shoot 0.8s ease-out ${i * 0.08}s forwards;
            --dx:${Math.cos(angle) * r.width * 0.55}px;
            --dy:${Math.sin(angle) * r.height * 0.55}px;
        `;
        container.appendChild(a);
    });
}

// 📜 Scout's Primer — golden compass-points radiate outward.
function _fxScoutPrimer() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakePrimerArrows(overlay, cx, cy, r);
    _fxMakeIcon(r.wrap, '📜', cx, cy, 52, 'animation:fx-icon-pop 0.6s ease-out forwards;', 1100);

    Audio_Manager.playSFX('scouts_primer');
}

// Helper: creates the full-grid horizontal sweep bar for RowSolve.
function _fxMakeRowSolveSweep(container, r) {
    const sweep = document.createElement('div');
    sweep.className = 'fx-rowsolve-bar';
    sweep.style.cssText = `
        position:absolute;
        top:${r.top}px; height:${r.height}px;
        left:${r.left - r.width}px; width:${r.width}px;
        animation:fx-rowsolve-sweep 0.65s ease-out forwards;
        --sweep-dist:${r.width * 2}px;
    `;
    container.appendChild(sweep);
}

// Helper: creates the per-row shimmer lines for RowSolve.
function _fxMakeRowSolveLines(container, r) {
    const rows = cur?.grid?.length || 5;
    const rowH = r.height / rows;
    for (let i = 0; i < rows; i++) {
        const line = document.createElement('div');
        line.className = 'fx-rowsolve-line';
        line.style.cssText = `
            position:absolute;
            left:${r.left}px; width:${r.width}px;
            top:${r.top + rowH * i + rowH / 2 - 1}px; height:2px;
            opacity:0;
            animation:fx-rowsolve-line-flash 0.4s ease-out ${0.1 + i * 0.03}s forwards;
        `;
        container.appendChild(line);
    }
}

// 📐 Row Solve — a golden sweep flashes across the full grid height.
function _fxRowSolve() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeRowSolveSweep(overlay, r);
    _fxMakeRowSolveLines(overlay, r);
    _fxMakeIcon(r.wrap, '📐', cx, cy, 56, 'animation:fx-icon-pop 0.6s ease-out forwards;', 1000);

    Audio_Manager.playSFX('set_square');
}

// Helper: creates the full-grid vertical sweep bar for ColSolve.
function _fxMakeColSolveSweep(container, r) {
    const sweep = document.createElement('div');
    sweep.className = 'fx-colsolve-bar';
    sweep.style.cssText = `
        position:absolute;
        left:${r.left}px; width:${r.width}px;
        top:${r.top - r.height}px; height:${r.height}px;
        animation:fx-colsolve-sweep 0.65s ease-out forwards;
        --sweep-dist:${r.height * 2}px;
    `;
    container.appendChild(sweep);
}

// Helper: creates the per-column shimmer lines for ColSolve.
function _fxMakeColSolveLines(container, r) {
    const cols = cur?.grid?.[0]?.length || 5;
    const colW = r.width / cols;
    for (let i = 0; i < cols; i++) {
        const line = document.createElement('div');
        line.className = 'fx-colsolve-line';
        line.style.cssText = `
            position:absolute;
            top:${r.top}px; height:${r.height}px;
            left:${r.left + colW * i + colW / 2 - 1}px; width:2px;
            opacity:0;
            animation:fx-colsolve-line-flash 0.4s ease-out ${0.1 + i * 0.03}s forwards;
        `;
        container.appendChild(line);
    }
}

// 📏 Col Solve — a golden sweep flashes across the full grid width.
function _fxColSolve() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeColSolveSweep(overlay, r);
    _fxMakeColSolveLines(overlay, r);
    _fxMakeIcon(r.wrap, '📏', cx, cy, 56, 'animation:fx-icon-pop 0.6s ease-out forwards;', 1000);

    Audio_Manager.playSFX('ruler');
}

// Helper: spawns the starburst rays radiating from the artifact centre.
function _fxMakeArtifactRays(container, cx, cy, rayLength) {
    for (let i = 0; i < 16; i++) {
        const ray = document.createElement('div');
        ray.className = 'fx-artifact-ray';
        ray.style.cssText = `
            position:absolute; left:${cx}px; top:${cy}px;
            transform-origin:0 0;
            transform:translate(-50%,-50%) rotate(${(i / 16) * 360}deg);
            animation:fx-artifact-ray-shoot 1s ease-out ${i * 0.04}s forwards;
            --ray-len:${rayLength}px;
        `;
        container.appendChild(ray);
    }
}

// Helper: creates the gold grid-fill flash div for the artifact.
function _fxMakeArtifactFill(container, r) {
    const fill = document.createElement('div');
    fill.className = 'fx-artifact-fill';
    fill.style.cssText = `
        position:absolute;
        left:${r.left}px; top:${r.top}px;
        width:${r.width}px; height:${r.height}px;
    `;
    container.appendChild(fill);
}

// 🌟 Artifact Complete — full golden supernova engulfs the grid.
function _fxArtifact() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 2400, `z-index:${FX_Z.supreme - 1};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const rayLength = Math.max(r.width, r.height) * 0.75;

    _fxMakeArtifactFill(overlay, r);
    _fxMakeArtifactRays(overlay, cx, cy, rayLength);

    // Shower of gold stars across the whole grid
    _fxSpawnParticles({
        ...PARTICLES.artifactStars,
        count: 32, sizeMin: 14, sizeMax: 30,
        container: overlay,
        startX: cx, startY: cy,
        spreadX: r.width, spreadY: r.height,
        duration: 1600, cssClass: 'fx-artifact-star',
    });

    _fxMakeIcon(r.wrap, '🌟', cx, cy, 88,
        `z-index:${FX_Z.supreme + 1}; animation:fx-artifact-icon 1.8s ease-out forwards;`, 2200);

    Audio_Manager.playSFX('codex_of_completion');
}


// ============================================================
// ------------------- CURSED ITEM EFFECTS --------------------
// ============================================================

// Helper: creates the sickly green tint rect over the grid.
function _fxMakeCursedTint(container, r) {
    const tint = document.createElement('div');
    tint.className = 'fx-cursed-tint';
    tint.style.cssText = `
        position:absolute;
        left:${r.left}px; top:${r.top}px;
        width:${r.width}px; height:${r.height}px;
    `;
    container.appendChild(tint);
}

// ☠️ Cursed Reveal — sickly green skull flash + ✕ marks dissolve.
function _fxCursedReveal() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeCursedTint(overlay, r);
    _fxMakeIcon(r.wrap, '☠️', cx, cy, 72, 'animation:fx-skull-rise 1.1s ease-out forwards;', 1400);

    // Dissolving ✕ particles burst from the centre
    _fxSpawnParticles({
        ...PARTICLES.cursedCrosses,
        count: 16, sizeMin: 16, sizeMax: 26,
        container: overlay,
        startX: cx, startY: cy,
        spreadX: r.width, spreadY: r.height,
        duration: 900, cssClass: 'fx-cursed-cross',
    });

    Audio_Manager.playSFX('cursed_lens');
}

// Helper: spawns dark fog tendrils blooming from each corner.
function _fxMakeFogTendrils(container, r) {
    const corners = [
        { top: r.top, left: r.left },
        { top: r.top, left: r.right },
        { top: r.bottom, left: r.left },
        { top: r.bottom, left: r.right },
    ];
    corners.forEach((pos, i) => {
        const fog = document.createElement('div');
        fog.className = 'fx-cursed-fog';
        fog.style.cssText = `
            position:absolute;
            left:${pos.left}px; top:${pos.top}px;
            animation:fx-fog-bloom 1.2s ease-out ${i * 0.15}s forwards;
        `;
        container.appendChild(fog);
    });
}

// 💀 Cursed Time — dark miasma + clock hands spin wildly.
function _fxCursedTime() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1800, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeFogTendrils(overlay, r);
    _fxMakeIcon(r.wrap, '💀', cx, cy, 68, 'animation:fx-skull-rise 0.9s ease-out forwards;', 1400);

    Audio_Manager.playSFX('cursed_clock');
}

// Helper: creates the dark-red scan lines that creep down the grid.
function _fxMakeEyeScanLines(container, r) {
    for (let i = 0; i < 5; i++) {
        const line = document.createElement('div');
        line.className = 'fx-eye-scanline';
        line.style.cssText = `
            position:absolute;
            left:${r.left}px; width:${r.width}px;
            top:${r.top + (r.height / 5) * i}px; height:${r.height / 5}px;
            animation:fx-scanline-darken 0.5s ease-in ${0.6 + i * 0.1}s forwards;
        `;
        container.appendChild(line);
    }
}

// 👁️ Cursed Shield — demonic eye opens, then rows black out.
function _fxCursedShield() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeEyeScanLines(overlay, r);
    _fxMakeIcon(r.wrap, '👁️', cx, cy, 80, 'animation:fx-eye-open 1.3s ease-out forwards;', 1800);

    Audio_Manager.playSFX('demon_eye');
}

// Helper: creates one tidal wave div at the given pass index.
// Opacity decreases with each successive wave to fade them out.
function _fxMakeWave(container, r, pass) {
    const w = document.createElement('div');
    w.className = 'fx-tidal-wave';
    w.style.cssText = `
        position:absolute;
        top:${r.top}px; height:${r.height}px;
        left:${r.left - r.width}px; width:${r.width * 1.3}px;
        animation:fx-wave-sweep 0.7s ease-in forwards;
        --wave-dist:${r.width * 2.5}px;
        opacity:${0.7 - pass * 0.18};
    `;
    container.appendChild(w);
}

// 🌊 Tidal Wave — waves of blue sweep across the grid multiple times.
function _fxTidalWave() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 2000, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    // Three successive wave passes, each slightly delayed and more transparent
    for (let wave = 0; wave < 3; wave++) {
        setTimeout(() => _fxMakeWave(overlay, r, wave), wave * 280);
    }

    _fxMakeIcon(r.wrap, '🌊', cx, cy, 72,
        'animation:fx-icon-pop 0.55s ease-out 0.2s forwards; opacity:0;', 1200);

    Audio_Manager.playSFX('tidal_wave');
}

// Helper: creates the dark "sucked in" column strips for Vortex.
function _fxMakeVortexStrips(container, r) {
    const cols = cur?.grid?.[0]?.length || 5;
    const colW = r.width / cols;

    for (let i = 0; i < Math.min(cols, 8); i++) {
        const strip = document.createElement('div');
        strip.className = 'fx-vortex-strip';
        strip.style.cssText = `
            position:absolute;
            top:${r.top}px; height:${r.height}px;
            left:${r.left + colW * i}px; width:${colW}px;
            animation:fx-vortex-strip-swirl 0.9s ease-in ${i * 0.06}s forwards;
        `;
        container.appendChild(strip);
    }
}

// 🌪️ Vortex — spinning tornado sweeps columns.
function _fxVortex() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 2000, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    // Swirling debris particles spread across the whole grid
    _fxSpawnParticles({
        ...PARTICLES.vortexDebris,
        count: 28, sizeMin: 10, sizeMax: 20,
        container: overlay,
        startX: cx, startY: cy,
        spreadX: r.width * 0.8, spreadY: r.height * 0.8,
        duration: 1400, cssClass: 'fx-vortex-debris',
    });

    _fxMakeVortexStrips(overlay, r);
    _fxMakeIcon(r.wrap, '🌪️', cx, cy, 80, 'animation:fx-vortex-spin 1.4s ease-out forwards;', 1800);

    Audio_Manager.playSFX('vortex');
}

// Helper: detonates one explosion blast + shrapnel at a random grid position.
function _fxDetonateBlast(container, r) {
    const blast = document.createElement('div');
    blast.className = 'fx-chaos-blast';
    const blastColor = CHAOS_BLAST_COLOURS[Math.floor(Math.random() * CHAOS_BLAST_COLOURS.length)];
    blast.style.cssText = `
        position:absolute;
        left:${r.left + Math.random() * r.width}px;
        top:${r.top + Math.random() * r.height}px;
        --blast-color:${blastColor};
        animation:fx-chaos-explode 0.5s ease-out forwards;
    `;
    container.appendChild(blast);

    // Shrapnel particles radiating from the blast origin
    _fxSpawnParticles({
        ...PARTICLES.chaosShrapnel,
        colors: [blastColor, '#fff'],
        count: 8, sizeMin: 8, sizeMax: 16,
        container,
        startX: parseFloat(blast.style.left),
        startY: parseFloat(blast.style.top),
        spreadX: 50, spreadY: 50,
        duration: 600, cssClass: 'fx-chaos-shard',
    });
}

// 💥 Chaos Grid — multicolour explosions detonate across the entire grid.
function _fxChaosGrid() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 2200, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    // Eight blasts staggered across ~1.4 s
    for (let i = 0; i < 8; i++) {
        setTimeout(() => _fxDetonateBlast(overlay, r), i * 180);
    }

    _fxMakeIcon(r.wrap, '💥', cx, cy, 80,
        `z-index:${FX_Z.supreme}; animation:fx-artifact-icon 1.2s ease-out forwards;`, 1600);

    Audio_Manager.playSFX('chaos_grid');
}


// ============================================================
// ----------- KEYSTONE / PEARL EFFECTS -----------------------
// ============================================================

// Helper: spawns the stacked iridescent rings for pearl effects.
// `color` is a CSS hex color; ring border + glow inherit it.
function _fxMakePearlRings(container, cx, cy, color, maxSize) {
    for (let i = 0; i < 5; i++) {
        const ring = document.createElement('div');
        ring.className = 'fx-shield-ring'; // reuse shield-ring CSS geometry
        ring.style.cssText = `
            position:absolute; left:${cx}px; top:${cy}px;
            transform:translate(-50%,-50%) scale(0);
            border-color:${color};
            box-shadow:0 0 8px ${color};
            animation:fx-shield-ring-expand 0.9s ease-out ${i * 0.14}s forwards;
            --ring-max:${maxSize}px;
        `;
        container.appendChild(ring);
    }
}

// 🔵🟣⚪ Pearl effects — iridescent ripple burst.
// `color` drives ring tint and emoji selection via PEARL_VARIANTS.
function _fxPearl(color) {
    const variant = PEARL_VARIANTS[color];
    if (!variant) return;

    Audio_Manager.playSFX(variant.sfx);

    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1400);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const maxSize = Math.max(r.width, r.height) * 0.7;

    _fxMakePearlRings(overlay, cx, cy, color, maxSize);
    _fxMakeIcon(r.wrap, variant.emoji, cx, cy, 64,
        'animation:fx-icon-pop 0.6s ease-out forwards;', 1000);
}

// 🧙 The Witch — purple smoky swirl of arcane particles.
function _fxTheWitch() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 2000, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxSpawnParticles({
        ...PARTICLES.witchSmoke,
        count: 24, sizeMin: 12, sizeMax: 22,
        container: overlay,
        startX: cx, startY: cy,
        spreadX: r.width * 0.9, spreadY: r.height * 0.9,
        duration: 1400, cssClass: 'fx-artifact-star',
    });

    _fxMakeIcon(r.wrap, '🧙', cx, cy, 80, 'animation:fx-skull-rise 1.2s ease-out forwards;', 1600);

    Audio_Manager.playSFX('the_witch');
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

// 🕰️ Golden Clock — clock effect + persistent golden tint.
function _fxGoldenClock() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    // Reuse the standard clock visual, then layer a gold tint on top
    _fxClock();

    const overlay = _fxOverlay(r.wrap, 2000, `z-index:${FX_Z.base - 1};`);
    _fxMakeGoldTintFill(overlay, r);

    Audio_Manager.playSFX('golden_clock');
}

// Helper: creates the dark void veil that briefly obscures the grid.
function _fxMakeShadowVeil(container, r) {
    const veil = document.createElement('div');
    veil.style.cssText = `
        position:absolute;
        left:${r.left}px; top:${r.top}px;
        width:${r.width}px; height:${r.height}px;
        background:rgba(0,0,0,0);
        animation:fx-shadow-seal-veil 1.5s ease-in forwards;
    `;
    container.appendChild(veil);
}

// 🌑 Shadow Seal — dark void engulfs the puzzle, then disperses.
function _fxShadowSeal() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 2200, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeShadowVeil(overlay, r);

    // Dark void particles spreading from the centre
    _fxSpawnParticles({
        ...PARTICLES.shadowVoid,
        count: 20, sizeMin: 8, sizeMax: 18,
        container: overlay,
        startX: cx, startY: cy,
        spreadX: r.width, spreadY: r.height,
        duration: 1600, cssClass: 'fx-cursed-cross',
    });

    _fxMakeIcon(r.wrap, '🌑', cx, cy, 88,
        `z-index:${FX_Z.supreme}; animation:fx-artifact-icon 1.8s ease-out forwards;`, 2200);

    Audio_Manager.playSFX('shadow_seal');
}














// ============================================================
// ------------------- ENTRY POINT ----------------------------
// ============================================================
// Called from useItem() in inventory.js immediately after the
// item's game logic fires.  Maps a defId string to the correct
// visual effect function.  All _fx functions above are helpers
// to this dispatcher — nothing else should call them directly.
// ============================================================

function playItemEffect(defId) {
    if (!defId) return;

    // ── REVEAL ────────────────────────────────────────────────
    if (defId === 'reveal1') return _fxCandle();
    if (defId === 'reveal2') return _fxMagnifier();
    if (defId === 'reveal3') return _fxSpyglass();
    if (defId === 'reveal4') return _fxScanner();

    // ── MARK-WRONG ────────────────────────────────────────────
    if (defId === 'markWrong2') return _fxEraser();
    if (defId === 'markWrong4') return _fxSweeper();
    if (defId === 'markWrong6') return _fxErrorMagnet();
    if (defId === 'markWrong8') return _fxErrorGem();

    // ── ADD TIME ──────────────────────────────────────────────
    if (defId === 'addTime60') return _fxHourglass();
    if (defId === 'addTime300') return _fxStopwatch();
    if (defId === 'addTime600') return _fxClock();
    if (defId === 'addTime900') return _fxChronobolt();

    // ── UTILITY ───────────────────────────────────────────────
    if (defId === 'freeze') return _fxFreeze();
    if (defId === 'shield') return _fxShield();
    if (defId === 'rowSolve') return _fxRowSolve();
    if (defId === 'colSolve') return _fxColSolve();
    if (defId === 'scoutPrimer') return _fxScoutPrimer();
    if (defId === 'artifactComplete') return _fxArtifact();
    if (defId === 'mistakeEraser' ||
        defId === 'mistakeEraser4' ||
        defId === 'mistakeEraser6' ||
        defId === 'mistakeEraserAll') return _fxMistakeEraser(defId);

    // ── CURSED ────────────────────────────────────────────────
    if (defId === 'cursedReveal') return _fxCursedReveal();
    if (defId === 'cursedTime') return _fxCursedTime();
    if (defId === 'cursedShield') return _fxCursedShield();
    if (defId === 'cursedRowSolve') return _fxTidalWave();
    if (defId === 'cursedColSolve') return _fxVortex();
    if (defId === 'cursedRowCol') return _fxChaosGrid();

    // ── PEARLS ────────────────────────────────────────────────
    if (defId === 'pearlOfHaste') return _fxPearl('#88aaff');
    if (defId === 'pearlOfSwiftness') return _fxPearl('#cc88ff');
    if (defId === 'grandPearl') return _fxPearl('#e0e0e0');

    // ── KEYSTONES ─────────────────────────────────────────────
    if (defId === 'theWitch') return _fxTheWitch();
    if (defId === 'goldenClock') return _fxGoldenClock();
    if (defId === 'shadowSeal') return _fxShadowSeal();
}