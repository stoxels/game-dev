//------------------------------------------------------------------------
//-----------------STATISTICIAN-------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE KEYS-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Window-level state keys used by the Statistician class across ability calls.
// These persist for the duration of a puzzle level and are reset on new level start.
//
//   window._dataStrikePendingCount    — solve count stored while the Data Strike modal is open
//   window._dataStrikeRevealCap       — reveal cap stored while the Data Strike modal is open
//   window._dataStrikeUsesThisLevel   — how many times Data Strike has fired this level (god_of_statistics scaling)
//   window._momentumThisLevel         — how many times Momentum has triggered this level (exponential_growth scaling)

// Diagonal strike: maximum steps walked per direction before stopping.
const DIAG_STRIKE_MAX_STEPS = 3;

// Data Strike: default number of cells revealed per line when no cap is specified.
const DATA_STRIKE_DEFAULT_REVEAL_CAP = 5;

// Diagonal Strike: default caps when no passive bonuses are present.
const DIAG_STRIKE_DEFAULT_REVEAL_CAP = 3;
const DIAG_STRIKE_DEFAULT_MARK_CAP = 3;


//------------------------------------------------------------------------
//-------------------TEXT HELPERS------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _pluralLabel — picks the correct singular/plural word for a count, in the
//   current LANG. Used by every ability toast that reports "N things".
//
//   count                  : the number to check for singular vs plural
//   enSingular / enPlural  : English forms
//   deSingular / dePlural  : German forms
function _pluralLabel(count, enSingular, enPlural, deSingular, dePlural) {
    if (LANG === 'de') return count === 1 ? deSingular : dePlural;
    return count === 1 ? enSingular : enPlural;
}


//------------------------------------------------------------------------
//-------------------SHARED LINE SOLVE HELPERS----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _collectUnsolvedLines — scans the grid and returns a shuffled list of lines
//   (rows or columns) that still have at least one unrevealed filled cell.
//
//   type  : 'rows' | 'cols'
//   sol   : the solution grid (2D array of 0/1)
//   rows  : total row count
//   cols  : total col count
//
//   Returns an array of objects:
//     rows → [{ r, unrevealed: [colIndex, ...] }, ...]
//     cols → [{ c, unrevealed: [rowIndex, ...] }, ...]
function _collectUnsolvedLines(type, sol, rows, cols) {
    const candidates = [];

    if (type === 'rows') {
        for (let r = 0; r < rows; r++) {
            const unrevealed = [];
            for (let c = 0; c < cols; c++) {
                if (sol[r][c] === 1 && !revealedGrid[r][c] && userGrid[r][c] !== 1) {
                    unrevealed.push(c);
                }
            }
            if (unrevealed.length > 0) candidates.push({ r, unrevealed });
        }
    } else {
        for (let c = 0; c < cols; c++) {
            const unrevealed = [];
            for (let r = 0; r < rows; r++) {
                if (sol[r][c] === 1 && !revealedGrid[r][c] && userGrid[r][c] !== 1) {
                    unrevealed.push(r);
                }
            }
            if (unrevealed.length > 0) candidates.push({ c, unrevealed });
        }
    }

    // Shuffle so the same lines are not always picked first
    candidates.sort(() => Math.random() - 0.5);
    return candidates;
}

// _revealCappedCells — reveals up to `cap` randomly chosen cells from a single
//   unsolved line entry produced by _collectUnsolvedLines.
//
//   lineEntry : { r, unrevealed } for rows  OR  { c, unrevealed } for cols
//   type      : 'rows' | 'cols'
//   cap       : maximum number of cells to reveal
function _revealCappedCells(lineEntry, type, cap) {
    // Shuffle so the revealed cells are random within the line
    const indices = [...lineEntry.unrevealed].sort(() => Math.random() - 0.5);
    const toReveal = indices.slice(0, cap);

    toReveal.forEach(idx => {
        const r = type === 'rows' ? lineEntry.r : idx;
        const c = type === 'rows' ? idx : lineEntry.c;
        revealedGrid[r][c] = true;
        userGrid[r][c] = 1;
        renderCell(r, c);
        updClues(r, c);
    });
}

// _solveLinesCapped — reveals at most `cap` cells in each of `count` randomly
//   chosen unsolved lines of the given type.
//
//   type  : 'rows' | 'cols'
//   count : how many lines to solve
//   cap   : max cells revealed per line
//
//   Returns the number of lines that were actually solved (may be < count if
//   fewer unsolved lines exist).
function _solveLinesCapped(type, count, cap) {
    if (!cur) return 0;

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    const candidates = _collectUnsolvedLines(type, sol, rows, cols);
    const picked = candidates.slice(0, count);

    picked.forEach(lineEntry => _revealCappedCells(lineEntry, type, cap));

    return picked.length;
}


//------------------------------------------------------------------------
//-------------------VISUAL EFFECTS — DIVINE PROC-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _divineProcPlayAudio — plays the god_of_statistics proc SFX.
//   Falls back to 'momentum' chime if a dedicated god audio key is not registered.
function _divineProcPlayAudio() {
    if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
        try { Audio_Manager.playSFX('momentum'); } catch (e) { /* no-op if not registered */ }
    }
}

// _divineProcShakeBoard — adds a brief CSS shake animation to the puzzle board.
//   Forces a reflow between class removal and addition so the animation restarts
//   cleanly even if already playing.
function _divineProcShakeBoard() {
    const board = document.getElementById('ptable') || document.body;
    board.classList.remove('divine-shake');
    void board.offsetWidth; // force CSS reflow so the animation restarts
    board.classList.add('divine-shake');
    setTimeout(() => board.classList.remove('divine-shake'), 400);
}

// _divineProcSpawnParticles — creates the overlay container with a flash, a beam,
//   and 16 randomly-placed sparkle glyphs, then appends it to the body.
//   The container is self-cleaning after 1.5 seconds.
function _divineProcSpawnParticles() {
    const GLYPH_POOL = ['✨', '✦', '☀️', '🌟', '✟'];
    const SPARKLE_COUNT = 16;

    const container = document.createElement('div');
    container.className = 'divine-intervention-container';

    const flash = document.createElement('div');
    flash.className = 'divine-flash';
    container.appendChild(flash);

    const beam = document.createElement('div');
    beam.className = 'divine-beam';
    container.appendChild(beam);

    for (let i = 0; i < SPARKLE_COUNT; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'divine-sparkle';
        sparkle.textContent = GLYPH_POOL[Math.floor(Math.random() * GLYPH_POOL.length)];
        // Spread glyphs around the center of the viewport
        sparkle.style.left = `${40 + Math.random() * 20}%`;
        sparkle.style.top = `${30 + Math.random() * 40}%`;
        sparkle.style.animationDelay = `${Math.random() * 0.35}s`;
        container.appendChild(sparkle);
    }

    document.body.appendChild(container);
    setTimeout(() => container.remove(), 1500);
}

// _playDivineProcEffect — fires the full god_of_statistics proc animation:
//   plays audio, shakes the board, and spawns the particle overlay.
function _playDivineProcEffect() {
    _divineProcPlayAudio();
    _divineProcShakeBoard();
    _divineProcSpawnParticles();
}


//------------------------------------------------------------------------
//-------------------VISUAL EFFECTS — DATA STRIKE SLASH------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _slashEffectGetGridBounds — measures the pixel bounds of the puzzle grid
//   inside the scaler element, accounting for zoom.
//
//   wrap : the #puzzle-scaler DOM element
//   sol  : solution grid (used to find corner cell IDs)
//   zoom : current zoom level
//
//   Returns { gridTop, gridLeft, gridBottom, gridRight, gridH, gridW }
//   or null if corner cells cannot be found.
function _slashEffectGetGridBounds(wrap, sol, zoom) {
    const rows = sol.length;
    const cols = sol[0].length;
    const firstCell = document.getElementById('g-0-0');
    const lastCell = document.getElementById(`g-${rows - 1}-${cols - 1}`);
    if (!firstCell || !lastCell) { console.warn('slash bounds: missing corner cell', firstCell, lastCell); return null; }

    const wrapRect = wrap.getBoundingClientRect();
    const gridTop = (firstCell.getBoundingClientRect().top - wrapRect.top) / zoom;
    const gridLeft = (firstCell.getBoundingClientRect().left - wrapRect.left) / zoom;
    const gridBottom = (lastCell.getBoundingClientRect().bottom - wrapRect.top) / zoom;
    const gridRight = (lastCell.getBoundingClientRect().right - wrapRect.left) / zoom;

    return {
        gridTop,
        gridLeft,
        gridBottom,
        gridRight,
        gridH: gridBottom - gridTop,
        gridW: gridRight - gridLeft,
    };
}

// _slashEffectSpawnSlash — creates and appends a single animated slash element.
//
//   wrap     : parent element to append to
//   vertical : true → vertical slash, false → horizontal slash
//   bounds   : grid bounds object from _slashEffectGetGridBounds
//   index    : slash index (0-based) used for position and animation delay
//   total    : total number of slashes (used to distribute spacing)
function _slashEffectSpawnSlash(wrap, vertical, bounds, index, total) {
    const { gridTop, gridLeft, gridH, gridW } = bounds;
    const delay = index * 0.12;

    const slash = document.createElement('div');
    slash.style.cssText = `
        position: absolute;
        pointer-events: none;
        z-index: 300;
        border-radius: 3px;
        opacity: 0;
        animation: slash-sweep 0.55s ease-out forwards;
        animation-delay: ${delay}s;
        box-shadow: 0 0 18px 4px rgba(231,76,60,0.7), 0 0 40px 8px rgba(231,76,60,0.35);
    `;

    if (!vertical) {
        // Horizontal slash — evenly spaced across grid height
        const yPos = gridTop + (gridH / (total + 1)) * (index + 1) - 3;
        slash.style.left = gridLeft + 'px';
        slash.style.width = gridW + 'px';
        slash.style.top = yPos + 'px';
        slash.style.height = '6px';
        slash.style.background = 'linear-gradient(90deg, transparent 0%, #e74c3c 30%, #fff 50%, #e74c3c 70%, transparent 100%)';
    } else {
        // Vertical slash — evenly spaced across grid width
        const xPos = gridLeft + (gridW / (total + 1)) * (index + 1) - 3;
        slash.style.top = gridTop + 'px';
        slash.style.height = gridH + 'px';
        slash.style.left = xPos + 'px';
        slash.style.width = '6px';
        slash.style.background = 'linear-gradient(180deg, transparent 0%, #e74c3c 30%, #fff 50%, #e74c3c 70%, transparent 100%)';
    }

    wrap.appendChild(slash);
    setTimeout(() => slash.remove(), 900 + index * 120);
}

// _playSlashEffect — spawns three animated red slashes sweeping across the puzzle
//   grid to visualise a Data Strike.
//
//   vertical : true → vertical slashes (column strike), false → horizontal (row strike)
function _playSlashEffect(vertical = false) {
    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return;
    if (!wrap.style.position || wrap.style.position === 'static') wrap.style.position = 'relative';

    const sol = cur?.grid;
    if (!sol) return;

    requestAnimationFrame(() => {
        const zoom = currentZoom || 1;
        const bounds = _slashEffectGetGridBounds(wrap, sol, zoom);
        if (!bounds) return;

        const SLASH_COUNT = 3;
        for (let i = 0; i < SLASH_COUNT; i++) {
            _slashEffectSpawnSlash(wrap, vertical, bounds, i, SLASH_COUNT);
        }
    });
}


//------------------------------------------------------------------------
//-------------------VISUAL EFFECTS — DIAGONAL SLASH---------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _diagSlashGetCenterPoint — returns the logical pixel centre of the clicked
//   cell inside the #puzzle-scaler element, accounting for zoom.
//
//   wrap     : the #puzzle-scaler DOM element
//   row / col: clicked cell coordinates
//   zoom     : current zoom level
//
//   Returns { cx, cy } or null if the cell element is not found.
function _diagSlashGetCenterPoint(wrap, row, col, zoom) {
    const cellEl = document.getElementById(`g-${row}-${col}`);
    if (!cellEl) {
        console.warn('cellEl is missing');
        return null;
    }




    const wrapRect = wrap.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();

    return {
        cx: (cellRect.left + cellRect.width / 2 - wrapRect.left) / zoom,
        cy: (cellRect.top + cellRect.height / 2 - wrapRect.top) / zoom,
    };
}

// _diagSlashGetDiagLength — computes the diagonal length of the grid (used to
//   size the slash bars so they fully span the grid at any angle).
//
//   wrap : the #puzzle-scaler DOM element
//   sol  : solution grid (used to find corner cell IDs)
//   zoom : current zoom level
//
//   Returns the diagonal length in logical pixels, or null on failure.
function _diagSlashGetDiagLength(wrap, sol, zoom) {
    const rows = sol.length;
    const cols = sol[0].length;
    const firstCell = document.getElementById('g-0-0');
    const lastCell = document.getElementById(`g-${rows - 1}-${cols - 1}`);
    if (!firstCell || !lastCell) {
        console.warn('slash bounds: missing corner cell', firstCell, lastCell); return null;
    }

    const gridW = (lastCell.getBoundingClientRect().right - firstCell.getBoundingClientRect().left) / zoom;
    const gridH = (lastCell.getBoundingClientRect().bottom - firstCell.getBoundingClientRect().top) / zoom;

    // 1.15× overshoot so the slash always extends beyond the grid edges
    return Math.sqrt(gridW * gridW + gridH * gridH) * 1.15;
}

// _diagSlashMakeBar — creates a single slash bar element inside `container`,
//   rotated to `deg` degrees and delayed by `delay` seconds.
//
//   container : parent element to append the bar to
//   cx / cy   : centre point of the slash (aligned to the clicked cell)
//   diagLen   : total length of the bar
//   deg       : rotation angle in degrees
//   delay     : CSS animation-delay in seconds
function _diagSlashMakeBar(container, cx, cy, diagLen, deg, delay) {
    const bar = document.createElement('div');
    bar.style.cssText = `
        position: absolute;
        width: 5px;
        height: ${diagLen}px;
        left: ${cx - 2.5}px;
        top:  ${cy - diagLen / 2}px;
        transform-origin: center center;
        transform: rotate(${deg}deg);
        background: linear-gradient(
            180deg,
            transparent 0%,
            #e74c3c 20%,
            #ffffff 50%,
            #e74c3c 80%,
            transparent 100%
        );
        box-shadow: 0 0 10px 3px rgba(231,76,60,0.7), 0 0 24px 6px rgba(231,76,60,0.35);
        border-radius: 3px;
        opacity: 0;
        animation: diag-fade-in-out 0.65s ease-out ${delay}s forwards;
    `;
    container.appendChild(bar);
}

// _playDiagonalSlashEffect — spawns animated diagonal slash bar(s) anchored to the
//   clicked cell. The number of bars depends on diagonalCount (rank of the ability).
//
//   row / col      : clicked cell coordinates
//   diagonalCount  : 1 → main diagonal only (↘)
//                    2 → both diagonals (↘ + ↙)
//                    4 → both diagonals + horizontal + vertical
function _playDiagonalSlashEffect(row, col, diagonalCount) {
    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return;
    if (!wrap.style.position || wrap.style.position === 'static') wrap.style.position = 'relative';

    const sol = cur?.grid;
    if (!sol) return;

    requestAnimationFrame(() => {
        const zoom = currentZoom || 1;
        const center = _diagSlashGetCenterPoint(wrap, row, col, zoom);
        if (!center) return;

        const diagLen = _diagSlashGetDiagLength(wrap, sol, zoom);
        if (!diagLen) return;

        const { cx, cy } = center;

        const container = document.createElement('div');
        container.style.cssText = `
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 300;
            overflow: hidden;
        `;
        wrap.appendChild(container);

        _diagSlashMakeBar(container, cx, cy, diagLen, 135, 0);
        if (diagonalCount >= 2) _diagSlashMakeBar(container, cx, cy, diagLen, 45, 0.1);
        if (diagonalCount >= 4) {
            _diagSlashMakeBar(container, cx, cy, diagLen, 0, 0.05);
            _diagSlashMakeBar(container, cx, cy, diagLen, 90, 0.15);
        }

        setTimeout(() => container.remove(), 1200);
    });
}


//------------------------------------------------------------------------
//-------------------DATA STRIKE — MODAL HELPERS--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

//
//   count : number of lines that will be solved (shown in the prompt text)
// _dataStrikeOverlayHTML — builds and returns the inner HTML string for the
//   Data Strike row/column choice modal.
//
//   count : preview number of lines that will be solved
//   cap   : preview max cells revealed per line
function _dataStrikeOverlayHTML(count, cap) {
    const title = LANG === 'de' ? 'DATENHIEB' : 'DATA STRIKE';

    const lineWordEn = _pluralLabel(count, 'row', 'row(s)', '', '');
    const cellWordEn = _pluralLabel(cap, 'cell', 'cells', '', '');
    const lineWordDe = _pluralLabel(count, 'Zeile oder Spalte', 'Zeile(n) oder Spalte(n)', 'Zeile oder Spalte', 'Zeile(n) oder Spalte(n)');
    const cellWordDe = _pluralLabel(cap, 'Zelle', 'Zellen', 'Zelle', 'Zellen');

    let prompt = LANG === 'de'
        ? `Wähle: bis zu ${cap} ${cellWordDe} in ${count} zufälliger ${lineWordDe} aufdecken?`
        : `Choose: reveal up to ${cap} ${cellWordEn} in ${count} random row(s) or column(s)?`;

    if (_dataStrikeHasRandomBonusChance()) {
        prompt += LANG === 'de'
            ? ' (Chance auf mehr!)'
            : ' (chance for more!)';
    }

    const rowLabel = LANG === 'de' ? 'ZEILEN' : 'ROWS';
    const colLabel = LANG === 'de' ? 'SPALTEN' : 'COLS';
    const cancelLabel = LANG === 'de' ? 'ABBRECHEN' : 'CANCEL';

    return `
        <div class="ds-panel">
            <div class="ds-icon"></div>
            <div class="ds-title-plaque">
                <span class="ds-title-text">${title}</span>
            </div>
            <div class="ds-prompt">${prompt}</div>
            <div class="ds-btn-row">
                <button class="ds-btn ds-btn-rows" onclick="_dataStrikeResolve('rows')">${rowLabel}</button>
                <button class="ds-btn ds-btn-cols" onclick="_dataStrikeResolve('cols')">${colLabel}</button>
            </div>
            <button class="ds-cancel-btn" onclick="_dataStrikeCancel()">${cancelLabel}</button>
        </div>`;
}

// _dataStrikeShowOverlay — creates the modal backdrop, injects the choice HTML,
//   and appends it to the document body.
//
//   count : preview number of lines
//   cap   : preview reveal cap per line
function _dataStrikeShowOverlay(count, cap) {
    const overlay = document.createElement('div');
    overlay.id = 'data-strike-overlay';
    overlay.className = 'modal-bg show';
    overlay.style.cssText = 'z-index:3000;';
    overlay.innerHTML = _dataStrikeOverlayHTML(count, cap);
    document.body.appendChild(overlay);
}

// _dataStrikeRemoveOverlay — plays the Data Strike SFX and removes the modal from the DOM.
function _dataStrikeRemoveOverlay() {
    Audio_Manager.playSFX('dataStrike');
    const overlay = document.getElementById('data-strike-overlay');
    if (overlay) overlay.remove();
}

// _dataStrikeRefundCooldown — cancels any running cooldown interval for active1
//   and resets its remaining time to 0. Called when the player cancels Data Strike
//   so they are not penalised for opening the modal.
function _dataStrikeRefundCooldown() {
    const cd = cooldownState['active1'];
    if (cd.interval) {
        clearInterval(cd.interval);
        cd.interval = null;
    }
    cd.remaining = 0;
}


//------------------------------------------------------------------------
//-------------------DATA STRIKE — PASSIVE SCALING------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _dataStrikeApplyGodScaling — if god_of_statistics is active, each Data Strike
//   beyond the first this level grants +1 extra line to solve. Increments the
//   use counter for subsequent calls.
//
//   count : current base solve count
//   Returns the adjusted count.
function _dataStrikeApplyGodScaling(count) {
    if (!ptHasSkill('god_of_statistics')) return count;

    const uses = window._dataStrikeUsesThisLevel || 0;
    if (uses > 0) count += uses;

    return count;
}

// _dataStrikeRollExtraLines — rolls independent 25% chances for bonus lines to solve.
//   advanced_data_strike gives 1 roll; god_of_statistics gives 2 additional rolls.
//   Plays the divine proc visual on each roll attempt (regardless of outcome).
//
//   count : current solve count before extra rolls
//   Returns the final solve count after all rolls.
function _dataStrikeRollExtraLines(count) {
    let extraChances = 0;
    if (ptHasSkill('advanced_data_strike')) extraChances += 1;
    if (ptHasSkill('god_of_statistics')) extraChances += 2; // god = effective 50% via two 25% rolls

    for (let i = 0; i < extraChances; i++) {
        if (Math.random() < 0.25) count++;
        _playDivineProcEffect();
    }

    return count;
}


// _dataStrikePreviewCount — non-mutating preview of the deterministic part of
//   god_of_statistics count scaling, used to show an accurate number in the
//   modal BEFORE the player commits. Does not touch window._dataStrikeUsesThisLevel.
//   The random 25% bonus-line rolls are intentionally NOT previewed here.
function _dataStrikePreviewCount(baseCount) {
    let count = baseCount;
    if (ptHasSkill('god_of_statistics')) {
        const uses = window._dataStrikeUsesThisLevel || 0;
        if (uses > 0) count += uses;
    }
    return count;
}

// _dataStrikePreviewCap — non-mutating preview of the deterministic reveal-cap
//   bonuses (monte_carlo, correlation_matrix), used to show an accurate cap in
//   the modal BEFORE the player commits.
function _dataStrikePreviewCap(baseCap) {
    let cap = baseCap || DATA_STRIKE_DEFAULT_REVEAL_CAP;
    if (ptHasSkill('monte_carlo')) cap += 1;
    if (ptHasSkill('correlation_matrix')) cap += 1;
    return cap;
}

// _dataStrikeHasRandomBonusChance — true if a 25%+ roll for extra lines could
//   fire this activation. Used only to decide whether to show a "chance for
//   more" hint in the modal text.
function _dataStrikeHasRandomBonusChance() {
    return ptHasSkill('advanced_data_strike') || ptHasSkill('god_of_statistics');
}


// _dataStrikeCalculateFinalCount — applies all passive scaling to the raw solve
//   count stored at ability activation. Updates the level-use counter.
//
//   Returns the final number of lines to solve.
function _dataStrikeCalculateFinalCount() {
    let count = window._dataStrikePendingCount || 1;
    window._dataStrikePendingCount = null;

    count = _dataStrikeApplyGodScaling(count);

    // Increment use counter AFTER applying god scaling (scaling reads the old value)
    window._dataStrikeUsesThisLevel = (window._dataStrikeUsesThisLevel || 0) + 1;

    count = _dataStrikeRollExtraLines(count);

    return count;
}

// _dataStrikeCalculateRevealCap — computes the final per-line reveal cap by
//   applying passive bonuses on top of the base cap stored at ability activation.
//
//   Returns the final cap and clears the stored value.
function _dataStrikeCalculateRevealCap() {
    let cap = window._dataStrikeRevealCap || DATA_STRIKE_DEFAULT_REVEAL_CAP;
    if (ptHasSkill('monte_carlo')) cap += 1;
    if (ptHasSkill('correlation_matrix')) cap += 1;
    window._dataStrikeRevealCap = null;
    return cap;
}


//------------------------------------------------------------------------
//-------------------DATA STRIKE — MAIN FUNCTIONS------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _executeDataStrike — entry point for the Data Strike active ability.
//   Opens the row/column choice modal and stores the pending solve count and
//   reveal cap so _dataStrikeResolve can read them after the player chooses.
//   The modal itself is shown with PREVIEW numbers (deterministic passives
//   applied, random bonus rolls not applied) so the text matches what will
//   actually happen as closely as possible without spoiling RNG.
//
//   count     : base number of lines to solve
//   revealCap : base max cells to reveal per line
function _executeDataStrike(count, revealCap) {
    window._dataStrikePendingCount = count;
    window._dataStrikeRevealCap = revealCap || DATA_STRIKE_DEFAULT_REVEAL_CAP;

    const previewCount = _dataStrikePreviewCount(count);
    const previewCap = _dataStrikePreviewCap(window._dataStrikeRevealCap);

    _dataStrikeShowOverlay(previewCount, previewCap);
}

// _dataStrikeResolve — called by the modal's ROWS or COLS button.
//   Applies all passive scaling, solves the chosen line type, plays effects,
//   and checks for a win.
//
//   type : 'rows' | 'cols'
function _dataStrikeResolve(type) {
    _dataStrikeRemoveOverlay();

    const count = _dataStrikeCalculateFinalCount();
    const cap = _dataStrikeCalculateRevealCap();
    const solved = _solveLinesCapped(type, count, cap);

    // Play horizontal slashes for row strikes, vertical for column strikes
    _playSlashEffect(type === 'cols');

    if (solved > 0) {
        // Determine singular/plural label based on line type and count
        const label = type === 'rows'
            ? _pluralLabel(solved, 'row', 'rows', 'Zeile', 'Zeilen')
            : _pluralLabel(solved, 'column', 'columns', 'Spalte', 'Spalten');

        const msg = LANG === 'de'
            ? `⚔️ ${solved} ${label} gelöst!`
            : `⚔️ ${solved} ${label} solved!`;

        showToast(msg);
        checkWin();
    }
}

// _dataStrikeCancel — called by the modal's CANCEL button.
//   Closes the modal, restores ability state, and refunds the cooldown so the
//   player is not penalised for changing their mind.
function _dataStrikeCancel() {
    _dataStrikeRemoveOverlay();
    window._dataStrikePendingCount = null;

    _setAbilityMode(false);
    STATE.classActiveChoice = 'active1';

    _dataStrikeRefundCooldown();
    buildClassHUD();
}


//------------------------------------------------------------------------
//-------------------DIAGONAL STRIKE — CELL WALK HELPERS-----------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _diagStrikeGetCellResolver — returns the correct cell-resolve function based
//   on whether the diagonally_wrong passive is active.
//   _resolveCell    : handles both reveals and wrong-marks (diagonally_wrong)
//   _revealFilledCell : only reveals filled cells (default)
function _diagStrikeGetCellResolver() {
    return ptHasSkill('diagonally_wrong') ? _resolveCell : _revealFilledCell;
}

// _diagStrikeWalkDirections — walks a single set of direction pairs from the
//   origin cell and collects resolved cell IDs into `affected`.
//
//   originR / originC : starting cell coordinates
//   dirPairs          : array of [dr, dc] direction vectors to walk
//   rows / cols       : grid bounds
//   sol               : solution grid
//   affected          : output array — resolved cell IDs are pushed here
//   maxSteps          : how far to walk before stopping
function _diagStrikeWalkDirections(originR, originC, dirPairs, rows, cols, sol, affected, maxSteps) {
    const resolver = _diagStrikeGetCellResolver();

    dirPairs.forEach(([dr, dc]) => {
        let r = originR + dr;
        let c = originC + dc;
        let steps = 0;

        while (r >= 0 && r < rows && c >= 0 && c < cols && steps < maxSteps) {
            const id = resolver(r, c, sol);
            if (id) affected.push(id);
            r += dr;
            c += dc;
            steps++;
        }
    });
}

// _diagStrikeWalkDiagonals — resolves cells along diagonal directions from the
//   origin cell, stopping after DIAG_STRIKE_MAX_STEPS steps per direction.
//
//   diagonalCount >= 1 : main diagonal only (↘ ↖)
//   diagonalCount >= 2 : both diagonals    (↘ ↖ ↙ ↗)
function _diagStrikeWalkDiagonals(originR, originC, diagonalCount, rows, cols, sol, affected) {
    const allDirPairs = [
        [[1, 1], [-1, -1]],   // main diagonal ↘ ↖
        [[1, -1], [-1, 1]],   // anti-diagonal ↙ ↗
    ];

    // Flatten the direction pairs we need based on diagonalCount
    const activePairs = allDirPairs
        .slice(0, Math.min(diagonalCount, 2))
        .flat();

    _diagStrikeWalkDirections(originR, originC, activePairs, rows, cols, sol, affected, DIAG_STRIKE_MAX_STEPS);
}

// _diagStrikeProcessOriginCell — resolves the cell the player originally clicked.
function _diagStrikeProcessOriginCell(row, col, sol, affected) {
    const resolver = _diagStrikeGetCellResolver();
    const id = resolver(row, col, sol);
    if (id) affected.push(id);
}

// _diagStrikeProcessFullRow — resolves every cell in `row` (used for rank-3 / diagonalCount >= 4).
function _diagStrikeProcessFullRow(row, cols, sol, affected) {
    const resolver = _diagStrikeGetCellResolver();
    for (let c = 0; c < cols; c++) {
        const id = resolver(row, c, sol);
        if (id) affected.push(id);
    }
}

// _diagStrikeProcessFullCol — resolves every cell in `col` (used for rank-3 / diagonalCount >= 4).
function _diagStrikeProcessFullCol(col, rows, sol, affected) {
    const resolver = _diagStrikeGetCellResolver();
    for (let r = 0; r < rows; r++) {
        const id = resolver(r, col, sol);
        if (id) affected.push(id);
    }
}

// _diagStrikeCollectAffected — walks the diagonals from the origin cell, resolves
//   the origin cell itself, and (for rank 3 / diagonalCount >= 4) resolves the
//   full row and column through the origin. Shared by the main strike and the
//   god_of_statistics bonus repeat, which both need the identical cell set.
//
//   originR / originC : cell the strike is centred on
//   diagonalCount      : rank of the strike (controls which directions are walked)
//   rows / cols        : grid dimensions
//   sol                : solution grid
//
//   Returns the array of resolved cell IDs.
function _diagStrikeCollectAffected(originR, originC, diagonalCount, rows, cols, sol) {
    const affected = [];

    _diagStrikeWalkDiagonals(originR, originC, diagonalCount, rows, cols, sol, affected);
    _diagStrikeProcessOriginCell(originR, originC, sol, affected);

    if (diagonalCount >= 4) {
        _diagStrikeProcessFullRow(originR, cols, sol, affected);
        _diagStrikeProcessFullCol(originC, rows, sol, affected);
    }

    return affected;
}


//------------------------------------------------------------------------
//-------------------DIAGONAL STRIKE — CAP HELPERS-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _diagStrikeCalculateCaps — computes reveal and mark caps from the base values
//   plus any active passive bonuses.
//
//   baseRevealCap : raw reveal cap from the ability definition
//   Returns { revealCap, markCap }
function _diagStrikeCalculateCaps(baseRevealCap) {
    let revealCap = baseRevealCap || DIAG_STRIKE_DEFAULT_REVEAL_CAP;
    let markCap = DIAG_STRIKE_DEFAULT_MARK_CAP;

    // Each of these passives adds +1 to both caps
    if (ptHasSkill('random_diagonal')) { revealCap += 1; markCap += 1; }
    if (ptHasSkill('diagonal_witch')) { revealCap += 1; markCap += 1; }

    // god_of_statistics adds +2 to both caps
    if (ptHasSkill('god_of_statistics')) { revealCap += 2; markCap += 2; }

    return { revealCap, markCap };
}

// _diagStrikeUnrevealExcess — given a list of revealed cell IDs, un-reveals any
//   cells beyond `cap`, keeping the rest random (not always the first found).
//
//   revealedIds : array of cell ID strings for cells that were revealed
//   cap         : maximum number of reveals to keep
//   Returns the array of kept cell IDs (length <= cap).
function _diagStrikeUnrevealExcess(revealedIds, cap) {
    if (revealedIds.length <= cap) return revealedIds;

    const shuffled = [...revealedIds].sort(() => Math.random() - 0.5);

    shuffled.slice(cap).forEach(id => {
        const [, r, c] = id.split('-').map(Number);
        revealedGrid[r][c] = false;
        userGrid[r][c] = 0;
        renderCell(r, c);
        updClues(r, c);
    });

    return shuffled.slice(0, cap);
}

// _diagStrikeUnmarkExcess — un-marks empty cells beyond `cap` in the mark list.
//
//   markedIds : array of cell ID strings for cells that were marked
//   cap       : maximum number of marks to keep
//   affected  : the combined affected array — excess marked IDs are spliced out
//   Returns nothing; mutates `affected` directly.
function _diagStrikeUnmarkExcess(markedIds, cap, affected) {
    if (markedIds.length <= cap) return;

    const shuffled = [...markedIds].sort(() => Math.random() - 0.5);

    shuffled.slice(cap).forEach(id => {
        const [, r, c] = id.split('-').map(Number);
        if (userGrid[r][c] === 2) {
            userGrid[r][c] = 0;
            renderCell(r, c);
            questStat_classMarkUsed(1);
        }
        const idx = affected.indexOf(id);
        if (idx !== -1) affected.splice(idx, 1);
    });
}

// _diagStrikeRebuildAffected — after capping reveals, rebuilds the `affected`
//   array so it contains only kept reveals + any marks (no excess reveals).
//
//   affected    : the array to rebuild (mutated in place)
//   keptReveals : Set of kept reveal cell IDs
//   markedIds   : Set of marked cell IDs
function _diagStrikeRebuildAffected(affected, keptReveals, markedIds) {
    affected.length = 0;
    keptReveals.forEach(id => affected.push(id));
    markedIds.forEach(id => affected.push(id));
}

// _diagStrikeApplyCaps — applies both reveal and mark caps to the `affected`
//   array in place. Also triggers the diagonally_wrong wrong-cell marking pass
//   if that passive is active.
//
//   affected   : array of all resolved cell IDs (mutated in place)
//   sol        : solution grid
//   revealCap  : max reveals to keep
//   markCap    : max marks to keep
function _diagStrikeApplyCaps(affected, sol, revealCap, markCap) {
    // --- Reveal cap ---
    const revealedIds = _filterRevealedIds(affected, sol);
    if (revealedIds.length > revealCap) {
        const keptReveals = new Set(_diagStrikeUnrevealExcess(revealedIds, revealCap));
        const markedIds = new Set(_filterMarkedIds(affected, sol));
        _diagStrikeRebuildAffected(affected, keptReveals, markedIds);
    }

    // --- Mark cap (diagonally_wrong only) ---
    if (ptHasSkill('diagonally_wrong')) {
        const markedIds = _filterMarkedIds(affected, sol);
        _diagStrikeUnmarkExcess(markedIds, markCap, affected);
        // Now apply the wrong-mark pass on whatever cells remain
        _diagStrikeMarkWrong(affected, sol);
    }
}

// _diagStrikeMarkWrong — marks cells that the player incorrectly filled
//   (user placed a tile where the solution is empty) along the strike path.
//   Used exclusively by the diagonally_wrong passive.
//
//   affected : array of cell IDs along the strike path
//   sol      : solution grid
function _diagStrikeMarkWrong(affected, sol) {
    affected.forEach(id => {
        const [, r, c] = id.split('-').map(Number);
        if (sol[r][c] === 0 && userGrid[r][c] === 1) {
            userGrid[r][c] = 3; // wrong-mark state
            renderCell(r, c);
            trackAchStat('tilesMarkedWrong', 1);
        }
    });
}


//------------------------------------------------------------------------
//-------------------DIAGONAL STRIKE — BONUS REPEAT (god_of_statistics)--
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _diagStrikeBonusExecute — performs a full Diagonal Strike on the given target
//   cell, applying caps and all effects. Used by the bonus repeat proc.
//
//   targetR / targetC : coordinates of the randomly chosen bonus target
//   diagonalCount     : rank of the strike (controls which directions are walked)
//   revealCap         : reveal cap inherited from the triggering strike
//   markCap           : mark cap inherited from the triggering strike
//   rows / cols       : grid dimensions
//   sol               : solution grid
function _diagStrikeBonusExecute(targetR, targetC, diagonalCount, revealCap, markCap, rows, cols, sol) {
    const bonusAffected = _diagStrikeCollectAffected(targetR, targetC, diagonalCount, rows, cols, sol);

    _diagStrikeApplyCaps(bonusAffected, sol, revealCap, markCap);

    // Play effects centred on the new random target cell
    Audio_Manager.playSFX('diagonalStrike');
    _playDiagonalSlashEffect(targetR, targetC, diagonalCount);
    _applyCellEffect(bonusAffected, 'reveal');

    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();

    const bonusRevealed = _filterRevealedIds(bonusAffected, sol).length;

    const label = _pluralLabel(bonusRevealed, 'cell', 'cells', 'Zelle', 'Zellen');

    const msg = (LANG === 'de')
        ? `⚔️ Bonus-Schlag! ${bonusRevealed} ${label} mehr!`
        : `⚔️ Bonus Strike! ${bonusRevealed} more ${label}!`;

    showToast(msg);

    questStat_classRevealUsed(bonusRevealed);
    updateQuestStats('classAbilityUsedThisLevel', {});

    checkWin();
}

// _diagStrikeBonusRepeat — fired by god_of_statistics (50% chance after a strike).
//   Picks a random unrevealed filled cell and fires a full Diagonal Strike on it
//   after a short delay so the animations do not overlap.
//
//   diagonalCount : rank of the strike (passed through from the triggering call)
//   revealCap     : reveal cap to use for the bonus strike
//   markCap       : mark cap to use for the bonus strike
//   rows / cols   : grid dimensions
//   sol           : solution grid
function _diagStrikeBonusRepeat(diagonalCount, revealCap, markCap, rows, cols, sol) {
    // Gather all cells that are filled but not yet revealed
    const candidates = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 1 && !revealedGrid[r][c]) candidates.push([r, c]);
        }
    }
    if (!candidates.length) return;

    // Pick the target immediately so grid state cannot change before the delay resolves
    const [targetR, targetC] = candidates[Math.floor(Math.random() * candidates.length)];

    setTimeout(() => {
        _diagStrikeBonusExecute(targetR, targetC, diagonalCount, revealCap, markCap, rows, cols, sol);
    }, 1000);
}


//------------------------------------------------------------------------
//-------------------DIAGONAL STRIKE — MAIN FUNCTION---------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _executeDiagonalStrike — entry point for the Diagonal Strike active ability.
//   Resolves cells along diagonal directions through the clicked (row, col) cell,
//   applies passive scaling caps, plays visual effects, and checks for a win.
//
//   row           : clicked cell row index
//   col           : clicked cell column index
//   diagonalCount : rank of the strike (1 = one diagonal, 2 = both, 4 = both + H/V)
//   revealCap     : base max cells to reveal (passive bonuses are added on top)
//
//   Passive nodes respected:
//     diagonally_wrong   — also marks wrongly-filled cells along the path
//     random_diagonal    — +1 to both reveal and mark caps
//     diagonal_witch     — +1 to both reveal and mark caps
//     god_of_statistics  — +2 to both caps, 50% chance to fire a bonus repeat
function _executeDiagonalStrike(row, col, diagonalCount, revealCap) {
    Audio_Manager.playSFX('diagonalStrike');

    if (!cur) return;
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    // --- Collect all cells touched by the strike ---
    const affected = _diagStrikeCollectAffected(row, col, diagonalCount, rows, cols, sol);

    // --- Apply passive-scaled caps to reveals and marks ---
    const { revealCap: finalRevealCap, markCap: finalMarkCap } = _diagStrikeCalculateCaps(revealCap);
    _diagStrikeApplyCaps(affected, sol, finalRevealCap, finalMarkCap);

    // --- Play effects and resolve feedback ---
    _playDiagonalSlashEffect(row, col, diagonalCount);
    _applyCellEffect(affected, 'reveal');
    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();

    const diagRevealed = _filterRevealedIds(affected, sol).length;

    if (diagRevealed > 0) {
        trackAchStat('tilesRevealed', diagRevealed);

        const label = _pluralLabel(diagRevealed, 'cell', 'cells', 'Zelle', 'Zellen');

        const msg = (LANG === 'de')
            ? `⚔️ Diagonal-Schlag! ${diagRevealed} ${label} aufgedeckt.`
            : `⚔️ Diagonal Strike! ${diagRevealed} ${label} revealed.`;

        showToast(msg);
    } else {
        const msg = (LANG === 'de')
            ? `⚔️ Diagonal-Schlag! Nichts Neues gefunden.`
            : `⚔️ Diagonal Strike! Nothing new found.`;

        showToast(msg);
    }

    // --- god_of_statistics: 50% chance to fire a bonus repeat strike ---
    if (ptHasSkill('god_of_statistics') && Math.random() < 0.50) {
        Audio_Manager.playSFX('diagonalStrikeRepeat');
        _playDivineProcEffect();
        _diagStrikeBonusRepeat(diagonalCount, finalRevealCap, finalMarkCap, rows, cols, sol);
    }

    questStat_classRevealUsed(diagRevealed);
    updateQuestStats('classAbilityUsedThisLevel', {});

    checkWin();
}




//------------------------------------------------------------------------
//-------------------DIAGONAL STRIKE — AREA PREVIEW (while armed)--------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Live preview of the diagonal(s) shown while Diagonal Strike is armed,
// mirroring Field Scan's boundary preview (_fieldScanUpdatePreview in
// class-probabilist.js) and Arcane Reveal's radius preview
// (_arcaneReveal_updatePreview in class-mathmagician.js). Unlike those
// single-rectangle previews, Diagonal Strike needs 1, 2, or 4 static line
// bars depending on rank — so we keep an array of preview elements rather
// than a single outline element.

// Module state for the live preview lines.
let _diagStrikePreviewEls = [];
let _diagStrikePreviewKey = null; // last-rendered "row-col-diagonalCount", to skip redundant rebuilds

// _diagStrikeGetEffectiveDiagonalsForPreview — returns the diagonalCount
// for whatever rank Diagonal Strike is currently at. Kept separate from
// the main execute path since the preview fires before the ability itself
// (and thus before row/col are known). No passive scaling applies to
// diagonalCount itself (only revealCap/markCap get passive bonuses), so
// this is just a straight level lookup.
function _diagStrikeGetEffectiveDiagonalsForPreview() {
    const def = CLASS_DEFS?.statistician;
    if (!def) return 1;
    const level = STATE.classActive2Level || 1;
    const actData = def.active2.levels[level - 1];
    if (!actData) return 1;
    return actData.effect.diagonals || 1;
}

// _diagStrikeGetHoveredCell — resolves which grid cell is under the given
// viewport coordinates, or null if the cursor isn't over the grid at all.
function _diagStrikeGetHoveredCell(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    const cellEl = el?.closest('[id^="g-"]');
    if (!cellEl) return null;
    const m = cellEl.id.match(/^g-(\d+)-(\d+)$/);
    if (!m) return null;
    return { r: parseInt(m[1], 10), c: parseInt(m[2], 10) };
}

// _diagStrikeRemovePreviewEls — removes any currently-rendered preview
// elements without touching _diagStrikePreviewKey (used internally when
// rebuilding for a new hovered cell/rank).
function _diagStrikeRemovePreviewEls() {
    _diagStrikePreviewEls.forEach(el => el.remove());
    _diagStrikePreviewEls = [];
}

// _diagStrikeClearPreview — removes the live preview lines and resets the
// dedupe key. Called when Diagonal Strike is disarmed (cancelled, executed,
// or the player switches to a different ability/slot) and whenever the
// cursor leaves the grid while armed.
function _diagStrikeClearPreview() {
    _diagStrikePreviewKey = null;
    _diagStrikeRemovePreviewEls();
}

// _diagStrikePreviewMakeBar — creates a single static (non-animated)
// preview line inside `container`, rotated to `deg` degrees. Reuses the
// same centre point / length geometry as the real animated slash bars
// (_diagSlashMakeBar), just without the fade-in/out animation, since this
// one needs to persist for as long as the cell stays hovered.
function _diagStrikePreviewMakeBar(container, cx, cy, diagLen, deg) {
    const bar = document.createElement('div');
    bar.className = 'diag-strike-preview-line';
    bar.style.cssText = `
        width: 5px;
        height: ${diagLen}px;
        left: ${cx - 2.5}px;
        top: ${cy - diagLen / 2}px;
        transform: rotate(${deg}deg);
    `;
    container.appendChild(bar);
    return bar;
}

// _diagStrikeBuildPreviewBars — builds the preview line(s) anchored to the
// hovered cell. Direction count mirrors _playDiagonalSlashEffect exactly:
//   diagonalCount >= 1 : main diagonal only (135°)
//   diagonalCount >= 2 : + anti-diagonal (45°)
//   diagonalCount >= 4 : + horizontal (0°) and vertical (90°)
function _diagStrikeBuildPreviewBars(wrap, row, col, diagonalCount) {
    const sol = cur?.grid;
    if (!sol) return;

    const zoom = currentZoom || 1;
    const center = _diagSlashGetCenterPoint(wrap, row, col, zoom);
    if (!center) return;

    const diagLen = _diagSlashGetDiagLength(wrap, sol, zoom);
    if (!diagLen) return;

    const { cx, cy } = center;

    const container = document.createElement('div');
    container.className = 'diag-strike-preview-container';
    container.style.cssText = `
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 299;
        overflow: hidden;
    `;
    wrap.appendChild(container);
    _diagStrikePreviewEls.push(container);

    _diagStrikePreviewMakeBar(container, cx, cy, diagLen, 135);
    if (diagonalCount >= 2) _diagStrikePreviewMakeBar(container, cx, cy, diagLen, 45);
    if (diagonalCount >= 4) {
        _diagStrikePreviewMakeBar(container, cx, cy, diagLen, 0);
        _diagStrikePreviewMakeBar(container, cx, cy, diagLen, 90);
    }
}

// _diagStrikeUpdatePreview — called on every mousemove while any ability
// is armed (see targeting-reticle.js). No-ops unless Diagonal Strike
// specifically is the one armed. Rebuilds the preview line(s) to match
// whichever cell is currently hovered and the current rank's diagonal
// count, skipping the rebuild if neither has changed since the last move.
function _diagStrikeUpdatePreview(clientX, clientY) {
    const isArmed = activeAbilityMode
        && STATE.playerClass === 'statistician'
        && STATE.classActiveChoice === 'active2';

    if (!isArmed || !cur) { _diagStrikeClearPreview(); return; }

    const hovered = _diagStrikeGetHoveredCell(clientX, clientY);
    if (!hovered) { _diagStrikeClearPreview(); return; }

    const diagonalCount = _diagStrikeGetEffectiveDiagonalsForPreview();

    const key = `${hovered.r}-${hovered.c}-${diagonalCount}`;
    if (key === _diagStrikePreviewKey) return;
    _diagStrikePreviewKey = key;

    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return;
    if (!wrap.style.position || wrap.style.position === 'static') wrap.style.position = 'relative';

    _diagStrikeRemovePreviewEls();

    requestAnimationFrame(() => {
        _diagStrikeBuildPreviewBars(wrap, hovered.r, hovered.c, diagonalCount);
    });
}






//------------------------------------------------------------------------
//-------------------MOMENTUM — MAIN FUNCTION-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _statisticianTriggerMomentum — awards bonus time when the Momentum passive
//   fires (triggered externally after a correct-fill streak).
//
//   bonusSeconds : base time to add before passive scaling
//
//   Passive nodes respected:
//     chain_reaction     — +1s flat bonus
//     precise_momentum   — +2s flat bonus
//     exponential_growth — each prior Momentum this level adds +1s
//     god_of_statistics  — doubles the total bonus after all flat additions
function _statisticianTriggerMomentum(bonusSeconds) {
    correctFillStreak = 0;
    _momentumCollideParticles();

    let bonus = bonusSeconds;
    if (ptHasSkill('chain_reaction')) bonus += 1;
    if (ptHasSkill('precise_momentum')) bonus += 2;

    // exponential_growth: each prior Momentum trigger this level adds +1s
    if (ptHasSkill('exponential_growth')) {
        bonus += (window._momentumThisLevel || 0);
    }

    // god_of_statistics doubles the total bonus (applied last)
    if (ptHasSkill('god_of_statistics')) bonus *= 2;

    const before = timerSecs;
    timerSecs = Math.min(timerSecs + bonus, 3600);
    _trackTimerDelta(before, timerSecs);
    updTimer();

    const label = _pluralLabel(bonus, 'second', 'seconds', 'Sekunde', 'Sekunden');
    const msg = `⚔️ Momentum! +${bonus} ${label}`;

    showToast(msg);

    trackAchStat('timeAdded', bonus);
    trackAchStat('momentumTriggered');
    updateQuestStats('momentumTriggered', {});

    window._momentumThisLevel = (window._momentumThisLevel || 0) + 1;
    if (window._momentumThisLevel === 10) trackAchStat('statistician3MomentumOneLevel');

    Audio_Manager.playSFX('momentum');
    updateMomentumBar(0, 15); // reset momentum bar after it fires
}

//------------------------------------------------------------------------
//-------------------MOMENTUM — PARTICLE ACCELERATOR EFFECT--------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Visualises the Momentum streak as small particles that spawn from each
// correctly-filled cell and merge into a loop that travels around the
// grid's border (not the center) — kept out of the way of the puzzle
// itself, similar to how the Variance Shield dome (class-mathmagician.js,
// _varianceShield_reposition / _fxGetGridCorners) wraps the grid edges.
// On the streak reaching its cap, all particles fly to the center of the
// grid and collide, spawning a shockwave. On a mistake, particles freeze
// and fade out instead.

// How far outside the grid's actual edge the particle loop travels.
const MOMENTUM_ORBIT_PADDING_PX = 22;

let _momentumParticles = [];   // { el, startX, startY, dist, speed, progress }
let _momentumRafId = null;

// _momentumGetContainer — returns (creating if needed) the overlay that
// holds all momentum particles, positioned over the puzzle grid.
function _momentumGetContainer() {
    const wrap = document.getElementById('puzzle-scaler-wrap'); // was 'puzzle-scaler'
    if (!wrap) return null;
    if (!wrap.style.position || wrap.style.position === 'static') wrap.style.position = 'relative';

    let container = document.getElementById('momentum-particle-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'momentum-particle-container';
        container.style.cssText = `
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 280;
            overflow: visible;
        `;
        wrap.appendChild(container);
    }
    return container;
}

// _momentumGetBorderRect — returns the padded rectangle (relative to
// #puzzle-scaler, zoom-adjusted) that particles travel around, plus its
// perimeter length. Uses the same corner-cell approach as the Variance
// Shield dome (_varianceShield_reposition in class-mathmagician.js) so the
// loop hugs the grid border consistently regardless of zoom.
function _momentumGetBorderRect() {
    const r = typeof _fxGetPuzzleRectForWrap === 'function' ? _fxGetPuzzleRectForWrap() : null;
    if (!r) return null;

    const pad = MOMENTUM_ORBIT_PADDING_PX;
    return {
        x0: r.left - pad,
        y0: r.top - pad,
        w: r.width + pad * 2,
        h: r.height + pad * 2,
        perimeter: 2 * (r.width + pad * 2 + r.height + pad * 2),
    };
}

// _momentumPointAtDistance — walks clockwise from the top-left corner of
// `rect` by `dist` pixels (wrapping around the perimeter) and returns the
// {x, y} point landed on: top edge → right edge → bottom edge → left edge.
function _momentumPointAtDistance(rect, dist) {
    const { x0, y0, w, h, perimeter } = rect;
    let d = ((dist % perimeter) + perimeter) % perimeter; // normalise into [0, perimeter)

    if (d <= w) return { x: x0 + d, y: y0 };
    d -= w;
    if (d <= h) return { x: x0 + w, y: y0 + d };
    d -= h;
    if (d <= w) return { x: x0 + w - d, y: y0 + h };
    d -= w;
    return { x: x0, y: y0 + h - d };
}

// _momentumStartLoop — starts the shared requestAnimationFrame loop that
// advances every active particle. Stops itself once no particles remain.
function _momentumStartLoop() {
    const tick = () => {
        _momentumUpdateParticles();
        _momentumRafId = _momentumParticles.length > 0 ? requestAnimationFrame(tick) : null;
    };
    _momentumRafId = requestAnimationFrame(tick);
}

// _momentumUpdateParticles — advances each particle's position along the
// border loop, easing in from its spawn cell until it merges onto the path.
function _momentumUpdateParticles() {
    const rect = _momentumGetBorderRect();
    if (!rect) return;

    _momentumParticles.forEach(p => {
        p.dist += p.speed;
        p.progress = Math.min(1, p.progress + 0.045);

        const target = _momentumPointAtDistance(rect, p.dist);
        const x = p.startX + (target.x - p.startX) * p.progress;
        const y = p.startY + (target.y - p.startY) * p.progress;

        p.el.style.transform = `translate(${x}px, ${y}px)`;
    });
}

// _momentumSpawnParticle — spawns one particle at the given cell (or grid
// center if no cell is given) and hands it off to the border-loop. One
// call per correct fill; the number of live particles mirrors the
// momentum streak counter shown on the HUD.
//
//   row / col : the cell that was just correctly filled (optional)
function _momentumSpawnParticle(row, col) {
    if (STATE.playerClass !== 'statistician' || isClassless()) return;

    const wrap = document.getElementById('puzzle-scaler-wrap'); // was 'puzzle-scaler'
    const container = _momentumGetContainer();
    const sol = cur?.grid;
    const rect = _momentumGetBorderRect();
    if (!wrap || !container || !sol || !rect) return;

    const zoom = currentZoom || 1;
    let startX = rect.x0 + rect.w / 2;
    let startY = rect.y0 + rect.h / 2;

    if (row != null && col != null) {
        const cellEl = document.getElementById(`g-${row}-${col}`);
        if (cellEl) {
            const wrapRect = wrap.getBoundingClientRect();
            const cellRect = cellEl.getBoundingClientRect();
            startX = cellRect.left + cellRect.width / 2 - wrapRect.left; // no / zoom
            startY = cellRect.top + cellRect.height / 2 - wrapRect.top;  // no / zoom
        }
    }

    const el = document.createElement('div');
    el.className = 'momentum-particle';
    container.appendChild(el);

    _momentumParticles.push({
        el,
        startX,
        startY,
        dist: Math.random() * rect.perimeter,
        speed: (1.6 + Math.random() * 1.4) * (Math.random() < 0.5 ? 1 : -1),
        progress: 0,
    });

    if (!_momentumRafId) _momentumStartLoop();
}

// _momentumParticlesOnMistake — freezes and fades out all live particles.
// Called whenever the Statistician makes a mistake, since the streak (and
// its visual buildup) is broken.
function _momentumParticlesOnMistake() {
    if (!_momentumParticles.length) return;

    const particles = _momentumParticles;
    _momentumParticles = []; // detach from the border loop immediately

    particles.forEach(p => {
        const current = p.el.style.transform || '';
        p.el.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        p.el.style.transform = `${current} scale(0.15)`;
        p.el.style.opacity = '0';
        setTimeout(() => p.el.remove(), 320);
    });
}

// _momentumSpawnShockwave — spawns the expanding ring + flash at the grid
// center after all particles have collided.
function _momentumSpawnShockwave(cx, cy) {
    const container = _momentumGetContainer();
    if (!container) return;

    const wave = document.createElement('div');
    wave.className = 'momentum-shockwave';
    wave.style.left = cx + 'px';
    wave.style.top = cy + 'px';
    container.appendChild(wave);

    const flash = document.createElement('div');
    flash.className = 'momentum-flash';
    flash.style.left = cx + 'px';
    flash.style.top = cy + 'px';
    container.appendChild(flash);

    setTimeout(() => { wave.remove(); flash.remove(); }, 700);
}

// _momentumCollideParticles — fires when the Momentum streak reaches its
// cap. Sends every live particle flying in from the border loop to the
// grid center, then spawns the collision shockwave once they arrive.
function _momentumCollideParticles() {
    if (!_momentumParticles.length) return;

    const rect = _momentumGetBorderRect();

    const particles = _momentumParticles;
    _momentumParticles = []; // detach from the border loop immediately

    if (!rect) {
        particles.forEach(p => p.el.remove());
        return;
    }

    const cx = rect.x0 + rect.w / 2;
    const cy = rect.y0 + rect.h / 2;

    particles.forEach(p => {
        p.el.style.transition = `transform ${0.28 + Math.random() * 0.1}s cubic-bezier(.3,.6,.35,1), opacity 0.3s ease-in ${0.15 + Math.random() * 0.1}s`;
        void p.el.offsetWidth; // force reflow so the transition starts from the current position
        p.el.style.transform = `translate(${cx}px, ${cy}px) scale(0.3)`;
        p.el.style.opacity = '0';
    });

    setTimeout(() => {
        particles.forEach(p => p.el.remove());
        _momentumSpawnShockwave(cx, cy);
    }, 380);
}

// _momentumClearParticlesImmediate — instantly removes all particles with
// no animation. Called on level start / class reset.
function _momentumClearParticlesImmediate() {
    _momentumParticles.forEach(p => p.el.remove());
    _momentumParticles = [];
    if (_momentumRafId) {
        cancelAnimationFrame(_momentumRafId);
        _momentumRafId = null;
    }
}