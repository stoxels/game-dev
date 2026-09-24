// Outlier Black Swan: Speedforce hyperspeed canvas, badge, and lifecycle.

import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { buildClassHUD } from './class-hud.js';

//------------------------------------------------------------------------
//-------------------BLACK SWAN - CONSTANTS-------------------------------
//------------------------------------------------------------------------

// Hyperspeed canvas star colors (used by Black Swan visual effect)
const BSW_STAR_COLORS = ['#ffffff', '#e8ccff', '#c4a8ff', '#ff6b6b', '#ffd93d', '#6bcfff'];

// How long the hyperspeed ramp-up animation takes (ms) before reaching full speed
const BSW_RAMP_DURATION_MS = 800;

// Number of star streaks rendered during the hyperspeed effect
const BSW_STAR_COUNT = 180;

// How many ms before the end of Black Swan to begin the canvas fade-out
const BSW_FADE_LEAD_MS = 500;


//------------------------------------------------------------------------
//-------------------BLACK SWAN - HYPERSPEED HELPERS---------------------
//------------------------------------------------------------------------

// Creates a single randomised star streak object for the hyperspeed canvas
function _bswCreateStar() {
    return {
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * 60 + 5,
        speed: 0.6 + Math.random() * 0.8,
        length: 30 + Math.random() * 120,
        opacity: 0.5 + Math.random() * 0.5,
        width: 0.5 + Math.random() * 1.5,
        color: BSW_STAR_COLORS[Math.floor(Math.random() * BSW_STAR_COLORS.length)],
    };
}

// Converts a CSS hex colour string and alpha value into an rgba() string
function _bswHexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

// Returns the pixel centre of the puzzle grid element (used as the vanishing point for streaks)
function _bswGetGridCenter(canvasWidth, canvasHeight) {
    const gridEl = document.getElementById('ptable') || document.getElementById('puzzle-scaler-wrap');
    if (gridEl) {
        const rect = gridEl.getBoundingClientRect();
        return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
    }
    return { cx: canvasWidth / 2, cy: canvasHeight / 2 };
}

// Returns the bounding rect of the puzzle grid, or null if not found.
// Used to clip the hyperspeed effect so it doesn't draw over the puzzle.
function _bswGetGridRect() {
    const gridEl = document.getElementById('ptable') || document.getElementById('puzzle-scaler-wrap');
    return gridEl ? gridEl.getBoundingClientRect() : null;
}

// Draws one frame of the radial vignette gradient behind the star streaks
function _bswDrawVignette(ctx, cx, cy, cw, ch) {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cw, ch) * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);
}

// Clips the canvas context so streaks only render outside the grid rectangle
function _bswApplyGridClip(ctx, cw, ch, gridRect) {
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    if (gridRect) {
        // Even-odd rule: the inner rect cuts a "hole" in the outer rect
        ctx.rect(gridRect.left, gridRect.top, gridRect.width, gridRect.height);
    }
    ctx.clip('evenodd');
}

// Draws and advances a single star streak, then recycles it if it has left the canvas
function _bswDrawAndAdvanceStar(ctx, stars, index, baseSpeed, speedFactor, cx, cy, cw, ch) {
    const s = stars[index];
    s.dist += baseSpeed * s.speed;

    const tailDist = Math.max(0, s.dist - s.length * speedFactor);
    const tx = cx + Math.cos(s.angle) * s.dist;
    const ty = cy + Math.sin(s.angle) * s.dist;
    const bx = cx + Math.cos(s.angle) * tailDist;
    const by = cy + Math.sin(s.angle) * tailDist;
    const alpha = Math.min(s.dist / 120, 1) * s.opacity;

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = _bswHexToRgba(s.color, alpha);
    ctx.lineWidth = s.width;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Recycle the star once it has fully left the canvas bounds
    const offCanvas = tx < -20 || tx > cw + 20 || ty < -20 || ty > ch + 20;
    if (offCanvas) stars[index] = _bswCreateStar();
}

// Fades the hyperspeed canvas out over 0.5 s, then removes it
function _blackSwanFadeOutHyperspeed() {
    const canvas = document.getElementById('black-swan-hyperspeed');
    if (!canvas) return;
    canvas.style.transition = 'opacity 0.5s ease-out';
    canvas.style.opacity = '0';
    setTimeout(() => _blackSwanStopHyperspeed(), 550);
}

// Cancels the animation loop and removes the hyperspeed canvas immediately
function _blackSwanStopHyperspeed() {
    const canvas = document.getElementById('black-swan-hyperspeed');
    if (!canvas) return;
    if (canvas._animId) globalThis.cancelAnimationFrame(canvas._animId);
    if (canvas._stopTimeout) clearTimeout(canvas._stopTimeout);
    if (canvas._onResize) window.removeEventListener('resize', canvas._onResize);
    canvas.remove();
}


//------------------------------------------------------------------------
//-------------------BLACK SWAN - HYPERSPEED MAIN------------------------
//------------------------------------------------------------------------

// Creates the full-screen canvas, spawns stars, runs the animation loop,
// and clips the effect so it never draws over the puzzle grid
function _blackSwanStartHyperspeed(durationMs) {
    _blackSwanStopHyperspeed(); // clean up any leftover canvas from a previous cast

    // --- Canvas setup ---
    const canvas = document.createElement('canvas');
    canvas.id = 'black-swan-hyperspeed';
    canvas.style.cssText = [
        'position:fixed',
        'inset:0',
        'width:100%',
        'height:100%',
        'pointer-events:none',
        'z-index:1',
        'opacity:0',
        'transition:opacity 0.4s ease-in',
    ].join(';');
    document.body.appendChild(canvas);

    // Trigger CSS fade-in (double rAF ensures the initial opacity:0 is painted first)
    requestAnimationFrame(() => requestAnimationFrame(() => { canvas.style.opacity = '1'; }));

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // --- Vanishing point & grid clip ---
    const { cx, cy } = _bswGetGridCenter(canvas.width, canvas.height);
    let gridRect = _bswGetGridRect();

    const stars = Array.from({ length: BSW_STAR_COUNT }, () => _bswCreateStar());
    const startTime = performance.now();
    let animId;

    // --- Resize handler: keep canvas and grid rect in sync ---
    canvas._onResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gridRect = _bswGetGridRect();
    };
    window.addEventListener('resize', canvas._onResize);

    // --- Per-frame draw function ---
    function draw(now) {
        const elapsed = now - startTime;
        const speedFactor = Math.min(elapsed / BSW_RAMP_DURATION_MS, 1);
        const baseSpeed = 6 + speedFactor * 22;
        const cw = canvas.width;
        const ch = canvas.height;

        ctx.clearRect(0, 0, cw, ch);
        _bswDrawVignette(ctx, cx, cy, cw, ch);

        // Clip streaks to the area outside the puzzle grid
        ctx.save();
        _bswApplyGridClip(ctx, cw, ch, gridRect);

        for (let i = 0; i < stars.length; i++) {
            _bswDrawAndAdvanceStar(ctx, stars, i, baseSpeed, speedFactor, cx, cy, cw, ch);
        }

        ctx.restore();

        animId = requestAnimationFrame(draw);
        canvas._animId = animId;
    }

    animId = requestAnimationFrame(draw);

    // Schedule the fade-out slightly before the effect ends so there is no hard cut
    canvas._stopTimeout = setTimeout(
        () => _blackSwanFadeOutHyperspeed(),
        Math.max(0, durationMs - BSW_FADE_LEAD_MS)
    );
}


//------------------------------------------------------------------------
//-------------------BLACK SWAN - HUD BADGE HELPERS----------------------
//------------------------------------------------------------------------

// Injects the Black Swan badge CSS into <head> once (idempotent)
function _blackSwanInjectBadgeStyles() {
    if (document.getElementById('black-swan-badge-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'black-swan-badge-styles';
    styleEl.textContent = `
        #black-swan-badge {
            display:inline-flex; align-items:center; gap:3px;
            background:rgba(231,76,60,0.18); border:1px solid #e74c3c;
            border-radius:5px; padding:2px 6px;
            font-family:var(--PX,monospace); font-size:10px; color:#e74c3c;
            animation:bsw-pulse 1s ease-in-out infinite; white-space:nowrap;
        }
        .bsw-icon  { font-size:11px; line-height:1; }
        .bsw-timer { font-variant-numeric:tabular-nums; letter-spacing:.03em; font-weight:bold; }
        @keyframes bsw-pulse {
            0%,100% { box-shadow:0 0 4px 1px rgba(231,76,60,0.4); }
            50%      { box-shadow:0 0 10px 3px rgba(231,76,60,0.75); }
        }
    `;
    document.head.appendChild(styleEl);
}

// Returns the best available parent element for the badge (handle > panel > null)
function _blackSwanGetBadgeParent() {
    return document.getElementById('class-hud-drag-handle')
        || document.getElementById('class-hud-panel')
        || null;
}

// Updates the countdown number inside an existing badge
function _blackSwanUpdateBadge(remainingSecs) {
    const el = document.getElementById('bsw-timer-val');
    if (el) el.textContent = `${Math.max(0, remainingSecs)}s`;
}

// Removes the Black Swan badge from the HUD
function _blackSwanRemoveBadge() {
    document.getElementById('black-swan-badge')?.remove();
}


//------------------------------------------------------------------------
//-------------------BLACK SWAN - HUD BADGE MAIN-------------------------
//------------------------------------------------------------------------

// Creates and appends the pulsing countdown badge to the class HUD.
// Called after buildClassHUD() so the handle element exists in the DOM.
function _blackSwanSpawnBadge(remainingSecs) {
    _blackSwanRemoveBadge();
    _blackSwanInjectBadgeStyles();

    const badge = document.createElement('div');
    badge.id = 'black-swan-badge';
    badge.innerHTML = `<span class="bsw-icon">📉</span><span class="bsw-timer" id="bsw-timer-val">${remainingSecs}s</span>`;

    const parent = _blackSwanGetBadgeParent();
    if (parent) parent.appendChild(badge);
}


//------------------------------------------------------------------------
//-------------------BLACK SWAN - MAIN FUNCTIONS-------------------------
//------------------------------------------------------------------------

// Tears down the Black Swan effect: stops timers, fades the canvas, removes badge, resumes BGM
export function _endBlackSwan(natural = false) {
    window._blackSwanActive = false;

    if (window._blackSwanTimeout) {
        clearTimeout(window._blackSwanTimeout);
        window._blackSwanTimeout = null;
    }
    if (window._blackSwanTickInterval) {
        clearInterval(window._blackSwanTickInterval);
        window._blackSwanTickInterval = null;
    }

    _blackSwanFadeOutHyperspeed();
    _blackSwanRemoveBadge();

    if (natural) {
        // Only track and announce when the effect ran its full duration
        trackAchStat('speedforceNaturalCompletions');
        globalThis.showToast(t('cls_speedforce_leave'));
        buildClassHUD();
    }

    Audio_Manager.stopSFX('speedforceEnter');
    Audio_Manager.toggleBGM(true); // resume background music
}

// Entry point: activates Black Swan (Speedforce mode) for durationMs milliseconds.
// Starts the hyperspeed overlay, countdown badge, and schedules the auto-end timeout.
export function _executeBlackSwan(durationMs) {
    window._blackSwanActive = true;
    window._blackSwanDurationMs = durationMs;
    window._blackSwanStartTime = Date.now();

    // Clear any stale timers from a previous cast
    if (window._blackSwanTimeout) clearTimeout(window._blackSwanTimeout);
    if (window._blackSwanTickInterval) clearInterval(window._blackSwanTickInterval);

    Audio_Manager.stopBGM(300); // 300 ms fade-out before speedforce audio takes over
    Audio_Manager.playSFX('speedforceEnter');
    trackAchStat('skillSpeedforceUsed');
    globalThis.showToast(t('cls_speedforce_enter'));

    _blackSwanStartHyperspeed(durationMs);

    // Badge is appended after buildClassHUD() has rebuilt the HUD handle element
    let remaining = Math.ceil(durationMs / 1000);
    setTimeout(() => _blackSwanSpawnBadge(remaining), 0);

    // Tick the badge countdown every second
    window._blackSwanTickInterval = setInterval(() => {
        remaining--;
        _blackSwanUpdateBadge(remaining);
        if (remaining <= 0) {
            clearInterval(window._blackSwanTickInterval);
            window._blackSwanTickInterval = null;
        }
    }, 1000);

    // Auto-end once the full duration has elapsed
    window._blackSwanTimeout = setTimeout(() => _endBlackSwan(true), durationMs);
}
