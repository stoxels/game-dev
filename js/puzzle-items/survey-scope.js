//------------------------------------------------------------------------
//-------------------SURVEY SCOPE----------------------
//------------------------------------------------------------------------

// surveyScope — reveals every correct cell inside one random 3×3 area.
// Unlike the reveal family (random single tiles) this guarantees spatial
// density: the whole window is surveyed at once. Blocked by the Ergodic
// Field keystone and The Oracle, like every programmatic reveal.
function _useSurveyScope(id, def) {
    // Ergodic Field (291) and The Oracle (300) disable all auto-reveals
    if (ptHasSkill('keystone_ergodic_field') || window._oracleActive) {
        return `${def.icon} ${t('itm_blocked_ergodic')}`;
    }

    questStat_revealItemUsed();

    if (!cur) return '';
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const win = 3;

    // Pick a 3×3 window that contains at least one revealable cell.
    // A handful of random attempts is plenty — the board is rarely so
    // complete that every window is exhausted.
    let area = null;
    for (let attempt = 0; attempt < 12; attempt++) {
        const top = Math.floor(Math.random() * Math.max(1, rows - win + 1));
        const left = Math.floor(Math.random() * Math.max(1, cols - win + 1));
        const cells = _collectScopeCells(sol, rows, cols, top, left, win);
        if (cells.length > 0) {
            area = { top, left, cells };
            break;
        }
    }
    if (!area) {
        playItemEffect(id);
        return `${def.icon} ${t('item_scope_none')}`;
    }

    // Reveal every collected cell in the window
    const affected = [];
    area.cells.forEach(([r, c]) => {
        revealedGrid[r][c] = true;
        userGrid[r][c] = 1;
        renderCell(r, c);
        updClues(r, c);
        affected.push(`g-${r}-${c}`);
    });

    _applyCellEffect(affected, 'reveal');
    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
    trackAchStat('tilesRevealed', affected.length);
    if (affected.length > 0) _incDirect('lifetimeTilesRevealed', affected.length);

    // Hand the chosen window to the visual effect before the fx fires
    window._surveyScopeFxArea = { top: area.top, left: area.left, win };

    playItemEffect(id);
    checkWin();
    return `${def.icon} ${t('item_scope_done').replace('{n}', affected.length)}`;
}

// Collects the revealable cells ([row, col] pairs) inside the win×win
// window whose top-left corner is (top, left), clamped to the grid.
// Revealable = correct solution cell not yet filled or revealed by the player.
function _collectScopeCells(sol, rows, cols, top, left, win) {
    const bottom = Math.min(rows - 1, top + win - 1);
    const right = Math.min(cols - 1, left + win - 1);
    const cells = [];
    for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
            if (sol[r][c] === 1 && userGrid[r][c] !== 1 && !revealedGrid[r][c]) {
                cells.push([r, c]);
            }
        }
    }
    return cells;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Injects the Survey Scope keyframes once (guarded by a sentinel style tag).
function _ensureSurveyScopeStyles() {
    if (document.getElementById('fx-survey-scope-style')) return;
    const style = document.createElement('style');
    style.id = 'fx-survey-scope-style';
    style.textContent = `
        @keyframes fx-scope-frame {
            0%   { transform: scale(0.4);  opacity: 0; }
            30%  { transform: scale(1.05); opacity: 1; }
            70%  { transform: scale(1);    opacity: 1; }
            100% { transform: scale(1.12); opacity: 0; }
        }
        @keyframes fx-scope-lens {
            0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 0; }
            35%  { transform: translate(-50%,-50%) scale(1);   opacity: 1; }
            100% { transform: translate(-50%,-50%) scale(0.4); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// 🔬 Survey Scope — a cyan bracket frame locks onto the 3×3 window,
// rings ripple out from its centre and sparkles shower the area.
function _fxSurveyScope() {
    const r = _fxGetPuzzleRect();
    if (!r) return;
    _ensureSurveyScopeStyles();

    const sol = cur?.grid;
    if (!sol) return;
    const rows = sol.length;
    const cols = sol[0].length;

    // Window chosen by the use handler; fall back to the grid centre.
    const a = window._surveyScopeFxArea || {
        top: Math.max(0, Math.floor(rows / 2) - 1),
        left: Math.max(0, Math.floor(cols / 2) - 1),
        win: 3,
    };
    window._surveyScopeFxArea = null;

    const win = a.win || 3;
    const bottom = Math.min(rows - 1, a.top + win - 1);
    const right = Math.min(cols - 1, a.left + win - 1);
    const cw = r.width / cols;
    const ch = r.height / rows;

    const x = r.left + a.left * cw;
    const y = r.top + a.top * ch;
    const w = (right - a.left + 1) * cw;
    const h = (bottom - a.top + 1) * ch;
    const cx = x + w / 2;
    const cy = y + h / 2;

    const overlay = _fxOverlay(r.wrap, 1600, `z-index:${FX_Z.above};`);

    // Bracketed frame around the surveyed window
    const frame = document.createElement('div');
    frame.className = 'fx-survey-scope-frame';
    frame.style.cssText = `
        position:absolute;
        left:${x}px; top:${y}px;
        width:${w}px; height:${h}px;
        pointer-events:none;
        border:3px solid #7df9ff;
        border-radius:8px;
        box-shadow:0 0 14px #7df9ff, inset 0 0 18px rgba(125,249,255,0.35);
        animation:fx-scope-frame 1.4s ease-out forwards;
    `;
    overlay.appendChild(frame);

    // Two rings rippling from the window centre (shared ring helper)
    const ringSize = Math.max(w, h);
    _fxMakeRing(overlay, cx, cy, 'fx-spyglass-ring', ringSize, 0.15, 'fx-ring-expand');
    _fxMakeRing(overlay, cx, cy, 'fx-spyglass-ring', ringSize, 0.4, 'fx-ring-expand');

    // Sparkle shower confined to the window
    _fxSpawnParticles({
        ...PARTICLES.gemSparkles,
        count: 16, sizeMin: 10, sizeMax: 18,
        container: overlay,
        startX: cx, startY: cy,
        spreadX: w, spreadY: h,
        duration: 1100, cssClass: 'fx-gem-spark',
    });

    // Lens icon popping at the centre
    _fxMakeIcon(r.wrap, '🔬', cx, cy, 54, 'animation:fx-scope-lens 1.2s ease-out forwards;', 1400);

    Audio_Manager.playSFX('scanner');
}
