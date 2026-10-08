//------------------------------------------------------------------------
//-------------------WORLD PROTOTYPE (EXPERIMENTAL)------------------------
//------------------------------------------------------------------------
// A self-contained, top-down free-walking prototype used to evaluate
// whether a Zelda-style traversable world works for STOXELS.
//
// DELIBERATELY ISOLATED from the live game:
//   * real ES module, own scope, no imports from game code
//   * no reference to any game global (STATE, cur, switchScreen, ...)
//   * no save/state writes, no audio, no achievements
//   * mounts its own <section> into the DOM and removes it on exit
//   * the ONLY game-facing touchpoints are the two exported functions
//     below, which the Select Mode card calls.
//
// The backdrop is the EXISTING painted world art, used as-is. No new
// art is produced here: this file only proves whether free movement,
// a scrolling camera and depth sorting feel right over that painting.
//
// Entry point: showWorldProto()  (wired to the Select Mode card)
//------------------------------------------------------------------------

'use strict';

//========================================================================
// CONFIG
//========================================================================

const WP_BG = 'images/Bayesian-Bay.webp';

// Natural size of the source painting; the world is rendered at
// WORLD_SCALE x this so there is room to scroll a full screen away.
const WP_NATURAL_W = 1376;
const WP_NATURAL_H = 768;
const WP_WORLD_SCALE = 2.0;

// Player tuning (world pixels per second).
const WP_WALK_SPEED = 210;
const WP_FRAME_MS = 150; // matches the game's walk cadence

// Characters/classes available to the prototype picker.
const WP_CHARS = ['Stox', 'Syla', 'Trix'];
const WP_VARIANTS = [
    'noclass', 'statistician', 'mathmagician', 'probabilist',
    'actuary', 'bayesian', 'markovian', 'outlier',
    'random_walker', 'recursionist',
];

// Preferred spawn, in normalized world coords. Must sit clear of every
// WP_BLOCKERS rect - wpUnstick() enforces that at mount time so a later
// blocker edit can never leave the player wedged inside geometry.
const WP_SPAWN = { x: 0.20, y: 0.34 };

//========================================================================
// BLOCKERS  (hand-placed for the prototype - see notes)
//========================================================================
// Fractional rects in WORLD space (0..1 of the scaled painting).
// These are provisional and exist only so the camera/scroll feel can be
// judged. Marking real terrain needs an artist's eye, so these are meant
// to be replaced once the walkable layout is decided.
//
// The default set is deliberately sparse: two water edges and the big
// central chasm of the painting, so scrolling has an obvious limit.
const WP_BLOCKERS = [
    { x: 0.00, y: 0.62, w: 0.30, h: 0.38 },  // left water shelf
    { x: 0.72, y: 0.00, w: 0.28, h: 0.22 },  // upper right ridge
    { x: 0.40, y: 0.44, w: 0.22, h: 0.22 },  // central void
];

//========================================================================
// STATE
//========================================================================

let wp_root = null;      // the mounted <section>
let wp_canvas = null;
let wp_ctx = null;
let wp_raf = 0;
let wp_running = false;

// Player
let wp_px = 0.5;         // world position, normalized 0..1
let wp_py = 0.5;
let wp_dir = 'down';
let wp_frame = 0;
let wp_lastTick = 0;
let wp_moving = false;

// Camera (in world pixels)
let wp_camX = 0;
let wp_camY = 0;
let wp_viewW = 0;
let wp_viewH = 0;

// Character selection
let wp_char = 'Stox';
let wp_variant = 'noclass';

// Assets
let wp_bgImg = null;
const wp_frameCache = new Map(); // `${char}|${variant}|${dir}|${i}` -> HTMLImageElement

//========================================================================
// ASSET LOADING
//========================================================================

/** Loads the backdrop painting once; resolves regardless of failure. */
function wpLoadBackground() {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { wp_bgImg = img; resolve(true); };
        img.onerror = () => { wp_bgImg = null; resolve(false); };
        img.src = WP_BG;
    });
}

/**
 * Builds the frame URL list for a walk cycle, matching the game's
 * animations/<Char>/walk/<variant>/<dir>/<...>_1..N.webp convention.
 * N is discovered by probing upward from 1 until a miss.
 */
function wpFrameUrls(char, variant, dir) {
    const base = `animations/${char}/walk/${variant}/${dir}/${char}_${variant}_walk_${dir}`;
    return { base, ext: '.webp' };
}

function wpLoadFrame(char, variant, dir, i) {
    const key = `${char}|${variant}|${dir}|${i}`;
    if (wp_frameCache.has(key)) return wp_frameCache.get(key);

    const { base, ext } = wpFrameUrls(char, variant, dir);
    const img = new Image();
    img.src = `${base}_${i}${ext}`;
    // A miss simply yields a null-ish image; the player still renders
    // (as an empty slot) rather than crashing the prototype.
    wp_frameCache.set(key, img);
    return img;
}

/** Preloads frames 1..n for the current character, best effort. */
function wpPrimeFrames(char, variant, n) {
    for (const dir of ['down', 'left', 'right', 'up']) {
        for (let i = 1; i <= n; i++) wpLoadFrame(char, variant, dir, i);
    }
}

//========================================================================
// GEOMETRY
//========================================================================

function wpWorldW() { return WP_NATURAL_W * WP_WORLD_SCALE; }
function wpWorldH() { return WP_NATURAL_H * WP_WORLD_SCALE; }

/** Player position in world pixels. Feet-anchored. */
function wpPlayerX() { return wp_px * wpWorldW(); }
function wpPlayerY() { return wp_py * wpWorldH(); }

function wpBlocked(x, y) {
    const box = { x: x - 17, y: y - 18, w: 34, h: 18 };
    for (const b of WP_BLOCKERS) {
        const bx = b.x * wpWorldW();
        const by = b.y * wpWorldH();
        const bw = b.w * wpWorldW();
        const bh = b.h * wpWorldH();
        if (box.x < bx + bw && box.x + box.w > bx &&
            box.y < by + bh && box.y + box.h > by) {
            return true;
        }
    }
    return false;
}

/**
 * Returns a spawn point that is not inside any blocker. Tries the
 * preferred spawn first, then spirals outward on a coarse grid. Without
 * this, editing WP_BLOCKERS could drop the player inside geometry,
 * where both movement axes are blocked and the sprite is stuck.
 */
function wpUnstick(x, y) {
    if (!wpBlocked(x, y)) return { x, y };
    const step = 0.02;
    for (let ring = 1; ring <= 25; ring++) {
        const r = ring * step;
        for (let a = 0; a < 16; a++) {
            const ang = (a / 16) * Math.PI * 2;
            const nx = x + Math.cos(ang) * r;
            const ny = y + Math.sin(ang) * r;
            if (nx < 0 || nx > 1 || ny < 0 || ny > 1) continue;
            if (!wpBlocked(nx * wpWorldW(), ny * wpWorldH())) {
                return { x: nx, y: ny };
            }
        }
    }
    return { x, y };
}

//========================================================================
// INPUT
//========================================================================

const wp_keys = new Set();

function wpOnKeyDown(e) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
        wp_keys.add(k);
        e.preventDefault();
        if (k === 'escape') wpExit();
    }
    if (k === 'escape') wpExit();
}

function wpOnKeyUp(e) {
    wp_keys.delete(e.key.toLowerCase());
}

/** Movement vector from the held keys, normalised. */
function wpMoveVector() {
    let dx = 0, dy = 0;
    if (wp_keys.has('arrowleft') || wp_keys.has('a')) dx -= 1;
    if (wp_keys.has('arrowright') || wp_keys.has('d')) dx += 1;
    if (wp_keys.has('arrowup') || wp_keys.has('w')) dy -= 1;
    if (wp_keys.has('arrowdown') || wp_keys.has('s')) dy += 1;
    if (dx === 0 && dy === 0) return null;
    const len = Math.hypot(dx, dy);
    return { dx: dx / len, dy: dy / len };
}

/** Facing from the movement vector, with horizontal priority. */
function wpDirFromVector(v) {
    if (Math.abs(v.dx) >= Math.abs(v.dy)) {
        return v.dx < 0 ? 'left' : 'right';
    }
    return v.dy < 0 ? 'up' : 'down';
}

//========================================================================
// CAMERA
//========================================================================

function wpResize() {
    if (!wp_canvas) return;
    const rect = wp_canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    wp_viewW = Math.max(320, Math.floor(rect.width));
    wp_viewH = Math.max(240, Math.floor(rect.height));
    wp_canvas.width = Math.floor(wp_viewW * dpr);
    wp_canvas.height = Math.floor(wp_viewH * dpr);
    wp_canvas.style.width = wp_viewW + 'px';
    wp_canvas.style.height = wp_viewH + 'px';
    wp_ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Clamps the camera so the world never shows empty space. */
function wpClampCamera() {
    const maxX = Math.max(0, wpWorldW() - wp_viewW);
    const maxY = Math.max(0, wpWorldH() - wp_viewH);
    wp_camX = Math.max(0, Math.min(maxX, wp_camX));
    wp_camY = Math.max(0, Math.min(maxY, wp_camY));
}

function wpUpdateCamera(dt) {
    const targetX = wpPlayerX() - wp_viewW / 2;
    const targetY = wpPlayerY() - wp_viewH / 2;
    // Light smoothing so the camera trails the player.
    const k = Math.min(1, dt * 6);
    wp_camX += (targetX - wp_camX) * k;
    wp_camY += (targetY - wp_camY) * k;
    wpClampCamera();
}

//========================================================================
// UPDATE
//========================================================================

function wpUpdate(dt) {
    const v = wpMoveVector();
    wp_moving = !!v;

    if (v) {
        wp_dir = wpDirFromVector(v);
        const step = WP_WALK_SPEED * dt;
        const nx = wpPlayerX() + v.dx * step;
        const ny = wpPlayerY() + v.dy * step;
        // Axis-separated so sliding along a blocker feels smooth.
        if (!wpBlocked(nx, wpPlayerY())) wp_px = nx / wpWorldW();
        if (!wpBlocked(wpPlayerX(), ny)) wp_py = ny / wpWorldH();
        // Keep inside the painting.
        wp_px = Math.max(0, Math.min(1, wp_px));
        wp_py = Math.max(0, Math.min(1, wp_py));
    }

    // Advance the walk frame on a fixed cadence, like the game does.
    const now = performance.now();
    if (wp_moving && now - wp_lastTick >= WP_FRAME_MS) {
        wp_lastTick = now;
        wp_frame = (wp_frame + 1) % 4;
    } else if (!wp_moving) {
        wp_frame = 0;
    }

    wpUpdateCamera(dt);
}

//========================================================================
// RENDER
//========================================================================

function wpRender() {
    const ctx = wp_ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, wp_viewW, wp_viewH);
    ctx.fillStyle = '#120d1c';
    ctx.fillRect(0, 0, wp_viewW, wp_viewH);

    ctx.save();
    ctx.translate(-Math.round(wp_camX), -Math.round(wp_camY));

    // Backdrop: the existing painting, drawn at world scale.
    if (wp_bgImg) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(wp_bgImg, 0, 0, wpWorldW(), wpWorldH());
    }

    // Blocker overlay - shows the provisional collision areas so the
    // layout can be judged and corrected.
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = '#ff3b6b';
    for (const b of WP_BLOCKERS) {
        ctx.fillRect(b.x * wpWorldW(), b.y * wpWorldH(),
            b.w * wpWorldW(), b.h * wpWorldH());
    }
    ctx.restore();

    // World bounds.
    ctx.strokeStyle = 'rgba(180,140,255,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, wpWorldW(), wpWorldH());

    wpRenderPlayer(ctx);
    ctx.restore();

    wpRenderHud(ctx);
}

function wpRenderPlayer(ctx) {
    const x = wpPlayerX();
    const y = wpPlayerY();

    // Draw the walk frame anchored at the feet. Natural art is 160x356;
    // scale it to a readable on-screen height (~150 world px).
    const targetH = 150;
    const src = wpLoadFrame(wp_char, wp_variant, wp_dir, wp_frame + 1);
    const dw = (src.naturalWidth || 160) * (targetH / (src.naturalHeight || 356));
    const dh = targetH;

    // Soft ground shadow so the sprite sits in the world.
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, dw * 0.32, dh * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (src.naturalWidth) {
        ctx.drawImage(src, x - dw / 2, y - dh, dw, dh);
    } else {
        // Placeholder while art loads / if missing.
        ctx.fillStyle = 'rgba(200,170,255,0.6)';
        ctx.fillRect(x - dw / 2, y - dh, dw, dh);
    }
}

function wpRenderHud(ctx) {
    ctx.save();
    ctx.font = '13px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textBaseline = 'top';
    const label = `proto  ${wp_char}/${wp_variant}  dir:${wp_dir}  ` +
        `x:${wp_px.toFixed(2)} y:${wp_py.toFixed(2)}  ` +
        `cam:${Math.round(wp_camX)},${Math.round(wp_camY)}  ` +
        `frame:${wp_frame + 1}  ${wp_moving ? 'walking' : 'idle'}`;
    ctx.fillText(label, 12, 10);
    ctx.restore();
}

//========================================================================
// LOOP
//========================================================================

let wp_lastTime = 0;

function wpLoop(now) {
    if (!wp_running) return;
    const dt = Math.min(0.05, (now - wp_lastTime) / 1000 || 0);
    wp_lastTime = now;
    wpUpdate(dt);
    wpRender();
    wp_raf = requestAnimationFrame(wpLoop);
}

//========================================================================
// UI CHROME
//========================================================================

function wpBuildRoot() {
    const sec = document.createElement('section');
    sec.id = 'world-proto';
    sec.className = 'wp-root';

    sec.innerHTML = `
        <div class="wp-stage">
            <canvas class="wp-canvas"></canvas>
        </div>
        <div class="wp-topbar">
            <button class="wp-back" type="button">&#9664; BACK</button>
            <span class="wp-title">WORLD PROTOTYPE &mdash; Bayesian Bay</span>
            <span class="wp-spacer"></span>
            <label class="wp-field">
                <span>Char</span>
                <select class="wp-char">
                    ${WP_CHARS.map((c) => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </label>
            <label class="wp-field">
                <span>Class</span>
                <select class="wp-variant">
                    ${WP_VARIANTS.map((v) => `<option value="${v}">${v}</option>`).join('')}
                </select>
            </label>
        </div>
        <div class="wp-hint">
            WASD / arrows to walk &middot; Esc to go back &middot;
            red areas are provisional collision
        </div>
    `;
    return sec;
}

function wpWireUi(root) {
    root.querySelector('.wp-back').addEventListener('click', () => wpExit());

    const charSel = root.querySelector('.wp-char');
    charSel.value = wp_char;
    charSel.addEventListener('change', (e) => {
        wp_char = e.target.value;
        wpPrimeFrames(wp_char, wp_variant, 4);
    });

    const varSel = root.querySelector('.wp-variant');
    varSel.value = wp_variant;
    varSel.addEventListener('change', (e) => {
        wp_variant = e.target.value;
        wpPrimeFrames(wp_char, wp_variant, 4);
    });

    window.addEventListener('keydown', wpOnKeyDown);
    window.addEventListener('keyup', wpOnKeyUp);
    window.addEventListener('resize', wpResize);
}

//========================================================================
// LIFECYCLE
//========================================================================

/** Tears the prototype down completely. Safe to call twice. */
function wpExit() {
    if (!wp_running && !wp_root) return;
    wp_running = false;
    if (wp_raf) cancelAnimationFrame(wp_raf);
    wp_raf = 0;

    window.removeEventListener('keydown', wpOnKeyDown);
    window.removeEventListener('keyup', wpOnKeyUp);
    window.removeEventListener('resize', wpResize);

    if (wp_root && wp_root.parentElement) {
        wp_root.parentElement.removeChild(wp_root);
    }
    wp_root = null;
    wp_canvas = null;
    wp_ctx = null;

    // Hand control back to Select Mode without touching game state.
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const back = document.getElementById('screen-mode-select');
    if (back) back.classList.add('active');
}

/**
 * Mounts the prototype. Idempotent - calling it while already open
 * just re-focuses.
 */
export function showWorldProto() {
    if (wp_running) return;

    // Hide every game screen without calling switchScreen (keeps the
    // prototype from depending on any game global).
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));

    wp_root = wpBuildRoot();
    document.body.appendChild(wp_root);

    wp_canvas = wp_root.querySelector('.wp-canvas');
    wp_ctx = wp_canvas.getContext('2d');

    const spawn = wpUnstick(WP_SPAWN.x * wpWorldW(), WP_SPAWN.y * wpWorldH());
    wp_px = spawn.x / wpWorldW();
    wp_py = spawn.y / wpWorldH();
    wp_dir = 'down';
    wp_frame = 0;
    wp_moving = false;
    wp_camX = 0;
    wp_camY = 0;

    wpResize();
    wpWireUi(wp_root);

    wpLoadBackground();
    wpPrimeFrames(wp_char, wp_variant, 4);

    wp_running = true;
    wp_lastTime = performance.now();
    wp_raf = requestAnimationFrame(wpLoop);
}

//========================================================================
// SELECT MODE CARD WIRING
//========================================================================

/**
 * Binds the Select Mode card. Called once from the game's boot code
 * (or lazily on first click). Kept separate from showWorldProto so the
 * entry point stays trivially auditable.
 */
export function initWorldProto() {
    const btn = document.getElementById('btn-world-proto');
    if (!btn) return;
    if (btn.dataset.wpBound === '1') return;
    btn.dataset.wpBound = '1';
    btn.addEventListener('click', () => showWorldProto());
}

// Self-bind on import: the prototype owns its own wiring, so no existing
// game file has to know it exists. The card lives in index.html.
//
// Module-eval timing: deferred module scripts run at readyState
// 'interactive', not 'loading', so testing for 'loading' alone would bind
// inside the import phase. Both 'loading' and 'interactive' mean
// DOMContentLoaded has not fired yet, so wait for it; only a post-load
// evaluation ('complete') binds immediately. Same idiom as skill-hotbar.
(function _wpAutoBind() {
    const bind = () => initWorldProto();
    if (document.readyState !== 'complete') {
        document.addEventListener('DOMContentLoaded', bind, { once: true });
    } else {
        bind();
    }
})();
