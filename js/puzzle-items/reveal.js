//------------------------------------------------------------------------
//-------------------REVEAL — CANDLE / MAGNIFIER / SPYGLASS / SCANNER----------------------
//------------------------------------------------------------------------

// reveal1 / reveal2 / reveal3 / reveal4 — reveals N random solution cells.
function _useReveal(id, def) {
    questStat_revealItemUsed();

    const baseCount = parseInt(id.replace('reveal', '')) || 1;
    const finalCount = _calcRevealCount(baseCount);

    revealTiles(finalCount, 'item');
    playItemEffect(id);

    const msgKey = finalCount > 1 ? 'item_revealed_pl' : 'item_revealed';
    return `${def.icon} ${t(msgKey).replace('{n}', finalCount)}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

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
