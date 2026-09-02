//------------------------------------------------------------------------
//-------------------MARK WRONG — ERASER / SWEEPER / ERROR MAGNET / ERROR GEM----------------------
//------------------------------------------------------------------------

// markWrong2 / markWrong4 / etc. — marks N random empty non-solution cells.
function _useMarkWrong(id, def) {
    // Blinding Truth keystone blocks all mark-wrong items entirely
    if (ptHasSkill('keystone_blinding_truth')) {
        return `${def.icon} ${t('itm_blocked_blinding_truth')}`;
    }

    const baseCount = parseInt(id.replace('markWrong', '')) || 2;
    const finalCount = _calcMarkWrongCount(baseCount);

    markWrongTiles(finalCount);
    playItemEffect(id);
    return `${def.icon} ${t('item_marked').replace('{n}', finalCount)}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

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
