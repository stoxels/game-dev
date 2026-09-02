//------------------------------------------------------------------------
//-------------------SHADOW SEAL----------------------
//------------------------------------------------------------------------

// shadowSeal — sets the timer to exactly 5 min, permanently hides all
// clues for the rest of the level, and mass-marks 75 % of empty cells.
function _useShadowSeal(id, def) {
    questStat_shadowSealUsed();
    if (!cur) return '';

    // 1. Hard-set the timer to exactly 5 minutes
    const before = timerSecs;
    timerSecs = 300;
    _trackTimerDelta(before, timerSecs);

    // 2. Permanently hide all row and column clues for this level
    window._shadowSealActive = true;
    document.querySelectorAll('.row-clue, .col-clue, [class*="rct-"], [class*="cch-"]')
        .forEach(el => el.classList.add('clue-blackout'));

    // 3. Mark 75% of all empty non-solution cells as wrong
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    const cands = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 0 && (userGrid[r][c] === 0 || userGrid[r][c] === 3) && !wrongGrid?.[r]?.[c]) {
                cands.push([r, c]);
            }
        }
    }

    const markCount = Math.floor(cands.length * 0.75);
    shuffle(cands);
    const affected = [];
    cands.slice(0, markCount).forEach(([r, c]) => {
        userGrid[r][c] = 2;
        systemMarkedGrid[r][c] = true;
        renderCell(r, c);
        affected.push(`g-${r}-${c}`);
    });
    _applyCellEffect(affected, 'mark');

    playItemEffect(id);
    return `${def.icon} ${t('itm_shadow_seal_used').replace('{n}', markCount)}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

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
