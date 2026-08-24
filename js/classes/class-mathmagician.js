//------------------------------------------------------------------------
//----------------------MATHMAGICIAN SKILLS-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//----------------------------CONSTANTS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Arcane Reveal

// Arcane Reveal — three-stage arcane-mathematics sequence
const ARCANE_REVEAL_INVOKE_MS = 1000;         // Stage 1: invocation sigil on origin cell
const ARCANE_REVEAL_FIELD_MS = 1000;          // Stage 2: field formation + magical sweep
const ARCANE_REVEAL_MARK_STAGGER_MS = 250;   // Stage 3: delay between each cell's rune mark
const ARCANE_REVEAL_MARK_TO_BEAM_MS = 300;   // Stage 3: pause between mark and beam firing
const ARCANE_REVEAL_BEAM_TRAVEL_MS = 420;    // Stage 3: beam travel time, must match CSS
const ARCANE_REVEAL_FIELD_FADE_MS = 1000;     // How long the field overlay takes to dissolve
const ARCANE_REVEAL_FLASH_CLEANUP_MS = 1000;  // Cleanup delay after a cell's reveal flash

const ARCANE_REVEAL_SPARKLE_LIMIT = 20;      // Max cells that spawn dissolve sparkles
const ARCANE_REVEAL_SPARKLE_COLORS = ['#d8b4fe', '#a855f7', '#8be9ff', '#e0f7ff'];
const ARCANE_REVEAL_SPARKLE_CHARS = ['Σ', 'π', '√', '∆', '∫', '✦'];

const ARCANE_REVEAL_SYMBOLS = ['Σ', 'π', '√', '∞', '∆', '∫', 'θ', '∂', 'x²', '1/n'];
const ARCANE_REVEAL_FIELD_SYMBOL_COUNT = 10; // Floating equation fragments during Stage 2

// Absolute Zero
const ABSOLUTE_ZERO_FROST_BONUS_MS = 500;   // Duration bonus per frost passive node
const ABSOLUTE_ZERO_FADE_OUT_MS = 800;   // How long the blizzard overlay fades out
const ABSOLUTE_ZERO_FLOOR_CLEANUP_MS = 500;   // How long before frozen floor is removed after CSS transition
const ABSOLUTE_ZERO_STALAGMITE_GROW_MS = 400;  // grow-in time for a mistake stalagmite
const ABSOLUTE_ZERO_THAW_MS = 700;             // melt-away time when frost/stalagmite clears

// Blizzard Effect
const BLIZZARD_FLAKE_COUNT = 60;
const BLIZZARD_FLAKE_CHARS = ['❄', '❅', '❆', '✦', '·'];
const BLIZZARD_FLAKE_MIN_SIZE_PX = 10;
const BLIZZARD_FLAKE_MAX_EXTRA_PX = 14;
const BLIZZARD_FLAKE_MIN_DURATION_S = 1.5;
const BLIZZARD_FLAKE_MAX_EXTRA_S = 2;
const BLIZZARD_FLAKE_MAX_DELAY_S = 0.5;


//------------------------------------------------------------------------
//----------------------------UTILITY-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Performs an in-place Durstenfeld shuffle on the given array.
function _shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Returns a random element from the given array.
function _randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL — CANDIDATE SELECTION------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies passive skill bonuses to the base max-reveal count.
// arcane_echo and resonant_reveal each add +1 to the reveal cap.
function _arcaneReveal_calcMaxReveals(baseMax) {
    let max = baseMax;
    if (ptHasSkill('arcane_echo')) max += 1;
    if (ptHasSkill('resonant_reveal')) max += 1;
    return max;
}

// Applies passive skill bonuses to the base radius.
// god_of_math adds +1 to the effective radius.
function _arcaneReveal_calcRadius(baseRadius) {
    return baseRadius + (ptHasSkill('god_of_math') ? 1 : 0);
}

// Separates all cells inside the radius into correct and incorrect candidate pools.
// Returns { correctCandidates, incorrectCandidates }.
function _arcaneReveal_buildCandidatePools(row, col, radius, rows, cols, sol) {
    const correctCandidates = [];
    const incorrectCandidates = [];
    const hasExposure = ptHasSkill('arcane_exposure');

    for (let r = Math.max(0, row - radius); r <= Math.min(rows - 1, row + radius); r++) {
        for (let c = Math.max(0, col - radius); c <= Math.min(cols - 1, col + radius); c++) {
            if (sol[r][c] === 1) {
                correctCandidates.push([r, c]);
            } else if (sol[r][c] === 0 && hasExposure) {
                // Only collect incorrect cells when arcane_exposure passive is active
                incorrectCandidates.push([r, c]);
            }
        }
    }

    return { correctCandidates, incorrectCandidates };
}

// Collects and returns the final list of cell IDs to be affected by Arcane Reveal.
// Correct cells are shuffled and capped at maxReveals; incorrect cells are added in full.
function _arcaneReveal_collectCells(row, col, radius, rows, cols, sol, maxReveals) {
    const { correctCandidates, incorrectCandidates } =
        _arcaneReveal_buildCandidatePools(row, col, radius, rows, cols, sol);

    // Shuffle so the reveal cap picks random cells rather than always top-left
    _shuffleArray(correctCandidates);
    const limitedCorrect = correctCandidates.slice(0, maxReveals);

    const finalCells = [...limitedCorrect, ...incorrectCandidates];

    // NOTE: we intentionally do NOT call _resolveCell() here anymore.
    // _resolveCell() is what actually writes to userGrid/revealedGrid and
    // calls renderCell() — i.e. it performs the real reveal. Calling it at
    // candidate-collection time (before Stage 1 even starts) is what made
    // cells appear solved instantly. We now only build a plain id for
    // still-untouched cells, and defer the real _resolveCell() call to
    // _arcaneReveal_onCellRevealed(), which fires once Stage 3 finishes.
    const affected = [];
    finalCells.forEach(([r, c]) => {
        if (userGrid[r][c] !== 0) return; // already resolved/marked — skip
        affected.push(`g-${r}-${c}`);
    });

    return affected;
}


function _arcaneReveal_findCellElement(row, col) {
    return (
        document.getElementById(`g-${row}-${col}`) ||
        document.querySelector(`#game-grid [id$="-${row}-${col}"]`) ||
        document.querySelector(`.grid-board [id$="-${row}-${col}"]`) ||
        document.querySelector(`.grid-cell[id$="-${row}-${col}"]`) ||
        document.querySelector(`.tile[id$="-${row}-${col}"]`) ||
        document.querySelector(`.cell[id$="-${row}-${col}"]`) ||
        document.getElementById(`${row}-${col}`)
    );
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL — DOM/GEOMETRY HELPERS-----------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

function _arcaneReveal_findCellElement(row, col) {
    return (
        document.getElementById(`g-${row}-${col}`) ||
        document.querySelector(`#game-grid [id$="-${row}-${col}"]`) ||
        document.querySelector(`.grid-board [id$="-${row}-${col}"]`) ||
        document.querySelector(`.grid-cell[id$="-${row}-${col}"]`) ||
        document.querySelector(`.tile[id$="-${row}-${col}"]`) ||
        document.querySelector(`.cell[id$="-${row}-${col}"]`) ||
        document.getElementById(`${row}-${col}`)
    );
}

// Returns a cell's pixel bounds relative to #puzzle-scaler, zoom-adjusted.
// Shared by every stage so the sigil/field/beams/marks all line up exactly.
function _arcaneReveal_getCellBounds(el, wrap, zoom) {
    const wrapRect = wrap.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return {
        left: (rect.left - wrapRect.left) / zoom,
        top: (rect.top - wrapRect.top) / zoom,
        width: rect.width / zoom,
        height: rect.height / zoom,
    };
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL — STAGE 1: INVOCATION------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Fires on the exact cell the player selected. A precise violet sigil
// traces the cell, corner runes flicker, and the energy condenses into a
// small blue-white point at the cell's center — the "origin" of the spell.

function _arcaneReveal_playInvocation(originEl, wrap, zoom) {
    const b = _arcaneReveal_getCellBounds(originEl, wrap, zoom);

    const sigil = document.createElement('div');
    sigil.className = 'arcane-invoke-sigil';
    sigil.style.left = `${b.left}px`;
    sigil.style.top = `${b.top}px`;
    sigil.style.width = `${b.width}px`;
    sigil.style.height = `${b.height}px`;
    sigil.innerHTML = `
        <div class="arcane-invoke-border"></div>
        <div class="arcane-invoke-frame"></div>
        <div class="arcane-invoke-core"></div>
    `;

    ['tl', 'tr', 'bl', 'br'].forEach(pos => {
        const rune = document.createElement('div');
        rune.className = `arcane-invoke-rune arcane-invoke-rune-${pos}`;
        rune.textContent = _randomFrom(ARCANE_REVEAL_SYMBOLS);
        sigil.appendChild(rune);
    });

    wrap.appendChild(sigil);
    setTimeout(() => sigil.remove(), ARCANE_REVEAL_INVOKE_MS + 250);
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL — STAGE 2: FIELD FORMATION-------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Draws the full targeting square as a translucent arcane diagram: glowing
// perimeter, faint interior grid lines, floating equation fragments, and a
// diagonal cyan-violet sweep that "reads" the field.

function _arcaneReveal_playFieldFormation(startRow, startCol, endRow, endCol, wrap) {
    const bounds = _arcaneReveal_buildPreviewBounds(startRow, startCol, endRow, endCol, wrap);
    if (!bounds) return null;

    const field = document.createElement('div');
    field.className = 'arcane-field';
    field.style.left = `${bounds.regionLeft}px`;
    field.style.top = `${bounds.regionTop}px`;
    field.style.width = `${bounds.regionWidth}px`;
    field.style.height = `${bounds.regionHeight}px`;
    field.innerHTML = `
        <div class="arcane-field-border"></div>
        <div class="arcane-field-grid"></div>
        <div class="arcane-field-sweep"></div>
    `;

    for (let i = 0; i < ARCANE_REVEAL_FIELD_SYMBOL_COUNT; i++) {
        const sym = document.createElement('div');
        sym.className = 'arcane-field-symbol';
        sym.textContent = _randomFrom(ARCANE_REVEAL_SYMBOLS);
        sym.style.left = `${5 + Math.random() * 90}%`;
        sym.style.top = `${5 + Math.random() * 90}%`;
        sym.style.animationDelay = `${Math.random() * 0.6}s`;
        field.appendChild(sym);
    }

    wrap.appendChild(field);
    return field;
}

// Dissolves the field overlay once Stage 3 begins.
function _arcaneReveal_fadeField(field) {
    if (!field) return;
    field.classList.add('fading');
    setTimeout(() => field.remove(), ARCANE_REVEAL_FIELD_FADE_MS);
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL — STAGE 3: REVELATION------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// For each chosen cell (staggered): a small rune mark appears, then a thin
// blue-white beam fires from the origin cell to it (a temporary arcane
// constellation), then the cell flashes and its data is actually revealed.

function _arcaneReveal_spawnCellMark(el, wrap, zoom) {
    const b = _arcaneReveal_getCellBounds(el, wrap, zoom);
    const mark = document.createElement('div');
    mark.className = 'arcane-cell-mark';
    mark.style.left = `${b.left}px`;
    mark.style.top = `${b.top}px`;
    mark.style.width = `${b.width}px`;
    mark.style.height = `${b.height}px`;
    mark.innerHTML = `<span class="arcane-cell-mark-rune">${_randomFrom(ARCANE_REVEAL_SYMBOLS)}</span>`;
    wrap.appendChild(mark);
    return mark;
}

function _arcaneReveal_spawnBeam(fromX, fromY, toX, toY, wrap) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const beam = document.createElement('div');
    beam.className = 'arcane-beam';
    beam.style.left = `${fromX}px`;
    beam.style.top = `${fromY}px`;
    beam.style.width = `${dist}px`;
    beam.style.transform = `rotate(${angle}deg)`;
    beam.style.animationDuration = `${ARCANE_REVEAL_BEAM_TRAVEL_MS}ms`;

    wrap.appendChild(beam);
    return beam;
}

function _arcaneReveal_spawnCellFlash(el, wrap, zoom) {
    const b = _arcaneReveal_getCellBounds(el, wrap, zoom);
    const flash = document.createElement('div');
    flash.className = 'arcane-cell-flash';
    flash.style.left = `${b.left}px`;
    flash.style.top = `${b.top}px`;
    flash.style.width = `${b.width}px`;
    flash.style.height = `${b.height}px`;
    wrap.appendChild(flash);
    setTimeout(() => flash.remove(), ARCANE_REVEAL_FLASH_CLEANUP_MS);
}

// Handles all post-reveal logic for a single cell: visual reveal, dissolve
// sparkles, passive adjacency refresh, stats, and win check.
// (Same responsibilities as the old _arcaneReveal_onBalloonBurst.)
function _arcaneReveal_onCellRevealed(id, sol) {
    const [, r, c] = id.split('-').map(Number);

    // This is the actual data reveal — writes userGrid/revealedGrid and
    // calls renderCell(). Correctly deferred until Stage 3 finishes now,
    // instead of firing early inside _arcaneReveal_collectCells.
    const resolvedId = _resolveCell(r, c, sol);
    if (!resolvedId) return; // already resolved by the time we got here — skip

    _applyCellEffect([resolvedId], 'reveal');
    _spawnArcaneSparkles([resolvedId]);

    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();

    updateQuestStats('tilesRevealed', { count: 1 });
    trackAchStat('tilesRevealed', 1);
    questStat_classRevealUsed(1);
    updateQuestStats('classAbilityUsedThisLevel', {});

    checkWin();
}

// Runs the staggered per-cell mark → beam → flash sequence for every
// revealed cell, radiating out visually from the origin cell.
function _arcaneReveal_revelationSequence(originRow, originCol, revealedIds, wrap, zoom, sol) {
    const originEl = _arcaneReveal_findCellElement(originRow, originCol);
    if (!originEl) {
        // No DOM anchor to draw beams from — resolve instantly instead.
        revealedIds.forEach(id => _arcaneReveal_onCellRevealed(id, sol));
        return;
    }

    const originB = _arcaneReveal_getCellBounds(originEl, wrap, zoom);
    const originCx = originB.left + originB.width / 2;
    const originCy = originB.top + originB.height / 2;

    revealedIds.forEach((id, index) => {
        setTimeout(() => {
            const [, r, c] = id.split('-').map(Number);
            const cellEl = _arcaneReveal_findCellElement(r, c);
            if (!cellEl) {
                // No DOM to animate against for this cell — reveal it
                // immediately rather than leaving it stranded.
                _arcaneReveal_onCellRevealed(id, sol);
                return;
            }

            const mark = _arcaneReveal_spawnCellMark(cellEl, wrap, zoom);

            setTimeout(() => {
                const b = _arcaneReveal_getCellBounds(cellEl, wrap, zoom);
                const cx = b.left + b.width / 2;
                const cy = b.top + b.height / 2;
                const beam = _arcaneReveal_spawnBeam(originCx, originCy, cx, cy, wrap);

                setTimeout(() => {
                    beam.remove();
                    mark.remove();
                    _arcaneReveal_spawnCellFlash(cellEl, wrap, zoom);
                    // Reveal this cell's data right as its own flash plays,
                    // so cells fill in one-by-one as their beams land
                    // instead of all appearing together at the very end.
                    _arcaneReveal_onCellRevealed(id, sol);
                }, ARCANE_REVEAL_BEAM_TRAVEL_MS);
            }, ARCANE_REVEAL_MARK_TO_BEAM_MS);
        }, index * ARCANE_REVEAL_MARK_STAGGER_MS);
    });
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL — SPARKLE VFX--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Creates a single sparkle element positioned within the scaler at (cx, cy)
// with slight random offsets, a random colour, and a random burst duration.
function _arcaneReveal_createSparkleElement(cx, cy) {
    const sp = document.createElement('div');
    sp.className = 'arcane-sparkle';
    sp.textContent = _randomFrom(ARCANE_REVEAL_SPARKLE_CHARS);
    sp.style.cssText = `
        position: absolute;
        left: ${cx + (Math.random() - 0.5) * 28}px;
        top:  ${cy + (Math.random() - 0.5) * 20}px;
        color: ${_randomFrom(ARCANE_REVEAL_SPARKLE_COLORS)};
        font-size: 16px;
        pointer-events: none;
        z-index: 310;
        user-select: none;
        animation: sparkle-burst ${0.5 + Math.random() * 0.4}s ease-out forwards;
    `;
    return sp;
}

// Spawns a small cluster of sparkles for a single cell ID, positioned inside
// the puzzle-scaler element and offset from the cell centre.
function _arcaneReveal_spawnSparklesForCell(cellId, index, wrap, wrapRect, zoom) {
    const el = document.getElementById(cellId);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cx = (rect.left + rect.width / 2 - wrapRect.left) / zoom;
    const cy = (rect.top + rect.height / 2 - wrapRect.top) / zoom;

    const count = 2 + Math.floor(Math.random() * 2);
    for (let j = 0; j < count; j++) {
        setTimeout(() => {
            const sp = _arcaneReveal_createSparkleElement(cx, cy);
            wrap.appendChild(sp);
            setTimeout(() => sp.remove(), 900);
        }, index * 18 + j * 40);
    }
}

// Spawns sparkle emojis rising from each revealed cell.
// Capped at ARCANE_REVEAL_SPARKLE_LIMIT cells to avoid visual overwhelm.
function _spawnArcaneSparkles(cellIds) {
    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return;

    // Ensure the scaler element acts as a positioning context
    if (!wrap.style.position || wrap.style.position === 'static') {
        wrap.style.position = 'relative';
    }

    const wrapRect = wrap.getBoundingClientRect();
    const zoom = currentZoom || 1;

    cellIds.slice(0, ARCANE_REVEAL_SPARKLE_LIMIT).forEach((id, i) => {
        _arcaneReveal_spawnSparklesForCell(id, i, wrap, wrapRect, zoom);
    });
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL — ORCHESTRATION------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Handles all post-burst logic for a single revealed cell:
// visual reveal, sparkles, passive adjacency refresh, stats, and win check.
function _arcaneReveal_onBalloonBurst(id) {
    _applyCellEffect([id], 'reveal');
    _spawnArcaneSparkles([id]);

    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();

    updateQuestStats('tilesRevealed', { count: 1 });
    trackAchStat('tilesRevealed', 1);
    questStat_classRevealUsed(1);
    updateQuestStats('classAbilityUsedThisLevel', {});

    checkWin();
}



// Applies arcane_exposure passive: marks all incorrect cells in the affected list.
// Only runs when the arcane_exposure passive node is active.
function _arcaneReveal_applyExposureMarks(markedIds) {
    if (markedIds.length === 0) return;

    markedIds.forEach(id => {
        const [, r, c] = id.split('-').map(Number);
        if (userGrid[r][c] === 0) {
            userGrid[r][c] = 2;
            renderCell(r, c);
            questStat_classMarkUsed(1);
        }
    });

    _applyCellEffect(markedIds, 'mark');
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL — AREA PREVIEW (while armed)-----------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Live dashed-square preview shown while Arcane Reveal is armed, mirroring
// Field Scan's boundary preview (_fieldScanUpdatePreview in
// class-probabilist.js). Unlike Field Scan's fixed NxN region, Arcane
// Reveal's area is a (radius*2+1) square *centred* on the hovered cell and
// simply clamped at the grid edges (never re-centred/shifted the way Field
// Scan's region is) — this matches _arcaneReveal_buildCandidatePools exactly.

// Module state for the live preview outline.
let _arcaneRevealPreviewEl = null;
let _arcaneRevealPreviewKey = null; // last-rendered region, to skip redundant rebuilds

// _arcaneReveal_getEffectiveRadiusForPreview — returns the current effective
// radius (base radius for the ability's rank + passive bonuses via
// _arcaneReveal_calcRadius) for whatever rank Arcane Reveal is at. Kept
// separate from the main execute path since the preview fires before the
// ability itself (and thus before row/col are known).
function _arcaneReveal_getEffectiveRadiusForPreview() {
    const def = CLASS_DEFS?.mathmagician;
    if (!def) return 1;
    const level = STATE.classActive1Level || 1;
    const actData = def.active1.levels[level - 1];
    if (!actData) return 1;
    return _arcaneReveal_calcRadius(actData.effect.radius);
}

// _arcaneReveal_getHoveredCell — resolves which grid cell is under the given
// viewport coordinates, or null if the cursor isn't over the grid at all.
function _arcaneReveal_getHoveredCell(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    const cellEl = el?.closest('[id^="g-"]');
    if (!cellEl) return null;
    const m = cellEl.id.match(/^g-(\d+)-(\d+)$/);
    if (!m) return null;
    return { r: parseInt(m[1], 10), c: parseInt(m[2], 10) };
}

// _arcaneReveal_buildPreviewBounds — computes the pixel bounds (relative to
// #puzzle-scaler, zoom-adjusted) of the clamped square region running from
// (startRow, startCol) to (endRow, endCol) inclusive. Same corner-cell
// approach as _scanBeamBuildRegionBounds in class-probabilist.js, just
// generalised to take explicit start/end instead of a fixed size, since
// Arcane Reveal's region can be clamped independently on each edge.
function _arcaneReveal_buildPreviewBounds(startRow, startCol, endRow, endCol, wrap) {
    const topCellEl = document.getElementById(`g-${startRow}-${startCol}`);
    const botCellEl = document.getElementById(`g-${endRow}-${startCol}`);
    const rightCellEl = document.getElementById(`g-${startRow}-${endCol}`);
    if (!topCellEl || !botCellEl || !rightCellEl) return null;

    const wrapRect = wrap.getBoundingClientRect();
    const zoom = currentZoom || 1;
    const topRect = topCellEl.getBoundingClientRect();
    const botRect = botCellEl.getBoundingClientRect();
    const rightRect = rightCellEl.getBoundingClientRect();

    const regionTop = (topRect.top - wrapRect.top) / zoom;
    const regionLeft = (topRect.left - wrapRect.left) / zoom;
    const regionBottom = (botRect.bottom - wrapRect.top) / zoom;
    const regionRight = (rightRect.right - wrapRect.left) / zoom;

    return {
        regionTop,
        regionLeft,
        regionBottom,
        regionRight,
        regionWidth: regionRight - regionLeft,
        regionHeight: regionBottom - regionTop,
    };
}

// _arcaneReveal_buildPreviewEl — creates the dashed preview outline once and
// appends it to #puzzle-scaler. Reused across hover updates rather than
// recreated every mousemove.
function _arcaneReveal_buildPreviewEl(wrap) {
    if (_arcaneRevealPreviewEl) return _arcaneRevealPreviewEl;
    const el = document.createElement('div');
    el.id = 'arcane-reveal-preview-outline';
    el.className = 'arcane-reveal-preview-outline';
    wrap.appendChild(el);
    _arcaneRevealPreviewEl = el;
    return el;
}

// _arcaneReveal_clearPreview — removes the live preview outline. Called when
// Arcane Reveal is disarmed (cancelled, executed, or the player switches to
// a different ability/slot) and whenever the cursor leaves the grid while armed.
function _arcaneReveal_clearPreview() {
    _arcaneRevealPreviewKey = null;
    if (_arcaneRevealPreviewEl) {
        _arcaneRevealPreviewEl.remove();
        _arcaneRevealPreviewEl = null;
    }
}

// _arcaneReveal_updatePreview — called on every mousemove while any ability
// is armed (see targeting-reticle.js). No-ops unless Arcane Reveal
// specifically is the one armed. Moves/resizes the dashed square to match
// the region currently centred under the cursor, clamped exactly the way
// _arcaneReveal_buildCandidatePools clamps it, so the preview always matches
// what will actually be revealed.
function _arcaneReveal_updatePreview(clientX, clientY) {
    const isArmed = activeAbilityMode
        && STATE.playerClass === 'mathmagician'
        && STATE.classActiveChoice === 'active1';

    if (!isArmed || !cur) { _arcaneReveal_clearPreview(); return; }

    const hovered = _arcaneReveal_getHoveredCell(clientX, clientY);
    if (!hovered) { _arcaneReveal_clearPreview(); return; }

    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const radius = _arcaneReveal_getEffectiveRadiusForPreview();

    const startRow = Math.max(0, hovered.r - radius);
    const endRow = Math.min(rows - 1, hovered.r + radius);
    const startCol = Math.max(0, hovered.c - radius);
    const endCol = Math.min(cols - 1, hovered.c + radius);

    const key = `${startRow}-${startCol}-${endRow}-${endCol}`;
    if (key === _arcaneRevealPreviewKey) return; // region unchanged since last move — skip rebuild
    _arcaneRevealPreviewKey = key;

    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return;
    if (!wrap.style.position || wrap.style.position === 'static') wrap.style.position = 'relative';

    const bounds = _arcaneReveal_buildPreviewBounds(startRow, startCol, endRow, endCol, wrap);
    if (!bounds) { _arcaneReveal_clearPreview(); return; }

    const el = _arcaneReveal_buildPreviewEl(wrap);
    el.style.left = `${bounds.regionLeft}px`;
    el.style.top = `${bounds.regionTop}px`;
    el.style.width = `${bounds.regionWidth}px`;
    el.style.height = `${bounds.regionHeight}px`;
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL — MAIN FUNCTION-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _executeArcaneReveal — main entry point for the Arcane Reveal ability.
// Reveals up to maxReveals correct cells within radius steps of (row, col),
// including diagonals. Passive nodes can extend radius and reveal cap.
function _executeArcaneReveal(row, col, radius, maxReveals = 4) {
    if (!cur) return;

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    const effectiveMaxReveals = _arcaneReveal_calcMaxReveals(maxReveals);
    const effectiveRadius = _arcaneReveal_calcRadius(radius);

    const startRow = Math.max(0, row - effectiveRadius);
    const endRow = Math.min(rows - 1, row + effectiveRadius);
    const startCol = Math.max(0, col - effectiveRadius);
    const endCol = Math.min(cols - 1, col + effectiveRadius);

    const affected = _arcaneReveal_collectCells(row, col, effectiveRadius, rows, cols, sol, effectiveMaxReveals);
    const revealedIds = _filterRevealedIds(affected, sol);
    const markedIds = ptHasSkill('arcane_exposure') ? _filterMarkedIds(affected, sol) : [];

    Audio_Manager.playSFX('arcaneReveal');

    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) {
        // No DOM to animate against — resolve everything instantly.
        revealedIds.forEach(id => _arcaneReveal_onCellRevealed(id, sol));
        _arcaneReveal_applyExposureMarks(markedIds);
        return;
    }
    if (!wrap.style.position || wrap.style.position === 'static') wrap.style.position = 'relative';

    // STAGE 1 — Invocation on the origin cell
    const originEl = _arcaneReveal_findCellElement(row, col);
    if (originEl) _arcaneReveal_playInvocation(originEl, wrap, currentZoom || 1);

    // STAGE 2 — Field formation over the whole targeting square
    setTimeout(() => {
        const field = _arcaneReveal_playFieldFormation(startRow, startCol, endRow, endCol, wrap);

        // STAGE 3 — Revelation: mark → beam → flash for each chosen cell
        setTimeout(() => {
            _arcaneReveal_fadeField(field);
            _arcaneReveal_revelationSequence(row, col, revealedIds, wrap, currentZoom || 1, sol);
            _arcaneReveal_applyExposureMarks(markedIds);
        }, ARCANE_REVEAL_FIELD_MS);
    }, ARCANE_REVEAL_INVOKE_MS);
}

//------------------------------------------------------------------------
//-------------------VARIANCE SHIELD — ARCANE BUBBLE VFX------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const VARIANCE_SHIELD_DOME_PADDING_PX = 5; // how far the dome bulges past the actual grid edges

// Tracks the pending DOM-removal timeout so a reactivated dome can cancel
// a stale removal scheduled from a previous fade-out.
let _varianceShieldRemovalTimer = null;

// Positions the fixed dome to match the grid's current screen rect,
// using only the corner cells (g-0-0 / g-{lastRow}-{lastCol}) — same
// approach as _fxShieldBorderAdd's _repositionShieldBorder, so clue
// number gutters are never included and zoom/transform can't skew it.

function _varianceShield_reposition() {
    const bubble = document.getElementById('variance-shield-bubble');
    // Use the wrap-relative rect helper (item_effects.js) instead of manual
    // zoom-divided math — the bubble now lives in #puzzle-scaler-wrap
    // (unscaled), so no currentZoom division should ever be applied here.
    // This mirrors the fix for #fx-shield-border, which had the exact same
    // bug: dividing by currentZoom at high zoom levels produced wildly
    // incorrect `left` values.
    const r = typeof _fxGetPuzzleRectForWrap === 'function' ? _fxGetPuzzleRectForWrap() : null;
    if (!bubble || !r) return;

    const pad = VARIANCE_SHIELD_DOME_PADDING_PX;

    bubble.style.left = `${r.left - pad}px`;
    bubble.style.top = `${r.top - pad}px`;
    bubble.style.width = `${r.width + pad * 2}px`;
    bubble.style.height = `${r.height + pad * 2}px`;
}

// Creates (or re-uses) the dome element, attaches it to <body> as a
// fixed-position overlay tracking the grid, and fades it in.
function _varianceShield_spawnBubble() {

    const existing = document.getElementById('variance-shield-bubble');
    if (existing && (existing.classList.contains('shattering') || existing.classList.contains('vs-pending-impact'))) return;

    if (_varianceShieldRemovalTimer) {
        clearTimeout(_varianceShieldRemovalTimer);
        _varianceShieldRemovalTimer = null;
    }

    let bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) {
        bubble = document.createElement('div');
        bubble.id = 'variance-shield-bubble';
        bubble.innerHTML = `
            <div class="vs-bubble-glow"></div>
            <div class="vs-bubble-glass"></div>
            <div class="vs-bubble-runes"></div>
            <div class="vs-bubble-inner-ring"></div>
            <div class="vs-bubble-rim"></div>
        `;
        // Attach to the WRAP (unscaled), not the scaler — see
        // _varianceShield_reposition() for why. Coordinates written there
        // are now wrap-relative and must NOT be divided by currentZoom.
        const wrapEl = document.getElementById('puzzle-scaler-wrap');
        if (wrapEl) {
            if (!wrapEl.style.position || wrapEl.style.position === 'static') {
                wrapEl.style.position = 'relative';
            }
            wrapEl.appendChild(bubble);
        } else {
            document.body.appendChild(bubble); // fallback, shouldn't normally hit
        }

        const wrap = document.getElementById('puzzle-scaler-wrap');
        bubble._reposition = _varianceShield_reposition;
        if (wrap) {
            wrap.addEventListener('scroll', _varianceShield_reposition, { passive: true });
        }
    }

    setTimeout(() => {
        if (bubble._reposition) bubble._reposition();
        bubble.classList.add('active');
    }, 50);
}

// Fades the bubble out, cleans up its tracking listeners, and removes it
// once no shield stacks remain.
function _varianceShield_removeBubble() {
    const bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) return;
    if (bubble.classList.contains('shattering') || bubble.classList.contains('vs-pending-impact')) return;

    bubble.classList.remove('active');

    if (_varianceShieldRemovalTimer) clearTimeout(_varianceShieldRemovalTimer);
    _varianceShieldRemovalTimer = setTimeout(() => {
        const el = document.getElementById('variance-shield-bubble');
        if (el && !el.classList.contains('active')) {
            const wrap = document.getElementById('puzzle-scaler-wrap');
            if (el._reposition) {
                if (wrap) {
                    wrap.removeEventListener('scroll', el._reposition);
                    wrap.removeEventListener('wheel', el._reposition);
                }
                window.removeEventListener('resize', el._reposition);
            }
            el.remove();
        }
        _varianceShieldRemovalTimer = null;
    }, 1000);
}

// Shows/hides the dome based on current shield stack count.
// Call this any time window._classFreeMistakes changes.
function _varianceShield_updateVisibility() {
    if (window._vsSuppressAutoHide) return; // a meteor is currently resolving this exact mistake — don't interfere

    const stacks = window._classFreeMistakes || 0;
    if (STATE.playerClass === 'mathmagician' && stacks > 0) {
        _varianceShield_spawnBubble();
    } else {
        _varianceShield_removeBubble();
    }
}

function _varianceShield_playCometImpact(impactPoint) {
    const bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) return;

    const impact = document.createElement('div');
    impact.className = 'vs-comet-impact';

    if (impactPoint) {
        const rect = bubble.getBoundingClientRect();
        impact.style.left = `${impactPoint.x - rect.left}px`;
        impact.style.top = `${impactPoint.y - rect.top}px`;
    } else {
        const rad = Math.random() * Math.PI * 2;
        const radiusX = bubble.offsetWidth / 2;
        const radiusY = bubble.offsetHeight / 2;
        impact.style.left = `calc(50% + ${Math.cos(rad) * radiusX}px)`;
        impact.style.top = `calc(50% + ${Math.sin(rad) * radiusY}px)`;
    }

    bubble.appendChild(impact);
    setTimeout(() => impact.remove(), 500);
}



//------------------------------------------------------------------------
//-------------------VARIANCE SHIELD — METEOR IMPACT VFX------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const VARIANCE_SHIELD_METEOR_FLIGHT_MS = 1100;    // Time for meteor to travel from offscreen to the bubble
const VARIANCE_SHIELD_METEOR_OFFSCREEN_PX = 150; // How far past the viewport edge the meteor starts
const VARIANCE_SHIELD_SHATTER_MS = 650;          // Duration of the bubble shatter animation before removal

// Picks a random point just outside one of the four viewport edges.
function _varianceShield_pickMeteorStart() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const edge = Math.floor(Math.random() * 4); // 0=top,1=right,2=bottom,3=left
    switch (edge) {
        case 0: return { x: Math.random() * w, y: -VARIANCE_SHIELD_METEOR_OFFSCREEN_PX };
        case 1: return { x: w + VARIANCE_SHIELD_METEOR_OFFSCREEN_PX, y: Math.random() * h };
        case 2: return { x: Math.random() * w, y: h + VARIANCE_SHIELD_METEOR_OFFSCREEN_PX };
        default: return { x: -VARIANCE_SHIELD_METEOR_OFFSCREEN_PX, y: Math.random() * h };
    }
}

// Spawns a meteor flying in from offscreen toward the bubble's current
// on-screen center, then fires onImpact once it arrives.
function _varianceShield_spawnMeteor(onImpact) {
    const bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) { if (onImpact) onImpact(null); return; }

    const rect = bubble.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    const start = _varianceShield_pickMeteorStart();

    const angleRad = Math.atan2(targetY - start.y, targetX - start.x);
    const angleDeg = angleRad * (180 / Math.PI);

    const meteor = document.createElement('div');
    meteor.className = 'vs-meteor';
    meteor.style.left = `${targetX}px`;
    meteor.style.top = `${targetY}px`;
    meteor.style.setProperty('--start-x', `${start.x - targetX}px`);
    meteor.style.setProperty('--start-y', `${start.y - targetY}px`);
    meteor.style.setProperty('--travel-angle', `${angleDeg}deg`);
    meteor.style.animationDuration = `${VARIANCE_SHIELD_METEOR_FLIGHT_MS}ms`;

    document.body.appendChild(meteor);

    setTimeout(() => {
        meteor.remove();
        if (onImpact) onImpact({ x: targetX, y: targetY });
    }, VARIANCE_SHIELD_METEOR_FLIGHT_MS);
}

// Plays the bubble-shatter animation (used when the last shield stack breaks),
// then removes the bubble from the DOM once the animation finishes.
function _varianceShield_shatterBubble() {
    const bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) return;

    if (_varianceShieldRemovalTimer) {
        clearTimeout(_varianceShieldRemovalTimer);
        _varianceShieldRemovalTimer = null;
    }

    bubble.classList.remove('active');
    bubble.classList.add('shattering');

    _varianceShieldRemovalTimer = setTimeout(() => {
        const el = document.getElementById('variance-shield-bubble');
        if (el) {
            const wrap = document.getElementById('puzzle-scaler-wrap');
            if (el._reposition) {
                if (wrap) {
                    wrap.removeEventListener('scroll', el._reposition);
                    wrap.removeEventListener('wheel', el._reposition);
                }
                window.removeEventListener('resize', el._reposition);
            }
            el.remove();
        }
        _varianceShieldRemovalTimer = null;
    }, VARIANCE_SHIELD_SHATTER_MS);
}

// _varianceShield_absorbMistake — call this from game.js at the exact
// moment a free mistake is consumed by the shield (i.e. right where
// window._classFreeMistakes gets decremented), INSTEAD of calling
// _varianceShield_updateVisibility() at that spot. Flies a meteor in
// from offscreen, flashes an impact where it hits, and shatters the
// bubble if that was the last stack.
function _varianceShield_absorbMistake() {
    const stacksRemaining = window._classFreeMistakes || 0;
    const bubble = document.getElementById('variance-shield-bubble');

    if (bubble) bubble.classList.add('vs-pending-impact');

    _varianceShield_spawnMeteor((impactPoint) => {
        if (bubble) bubble.classList.remove('vs-pending-impact');
        window._vsSuppressAutoHide = false; // meteor resolved — outside visibility syncs can run again

        _varianceShield_playCometImpact(impactPoint);

        if (stacksRemaining <= 0) {
            _varianceShield_shatterBubble();
        }
    });
}









//------------------------------------------------------------------------
//-------------------ABSOLUTE ZERO — HELPERS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Calculates the effective freeze duration after applying passive bonuses.
// prolonged_frost and deep_freeze each add ABSOLUTE_ZERO_FROST_BONUS_MS.
function _arcaneFreeze_calcDuration(baseDurationMs) {
    let duration = baseDurationMs;
    if (ptHasSkill('prolonged_frost')) duration += ABSOLUTE_ZERO_FROST_BONUS_MS;
    if (ptHasSkill('deep_freeze')) duration += ABSOLUTE_ZERO_FROST_BONUS_MS;
    return duration;
}

// Creates (or re-uses) the frozen floor DOM element and activates it.
// Forces a reflow so the CSS transition fires correctly from its initial state.
function _arcaneFreeze_spawnFrozenFloor() {
    let frozenFloor = document.getElementById('ability-frozen-floor');
    if (!frozenFloor) {
        frozenFloor = document.createElement('div');
        frozenFloor.id = 'ability-frozen-floor';
        document.body.appendChild(frozenFloor);
    }

    void frozenFloor.offsetWidth; // Force reflow so the transition fires from the start
    frozenFloor.classList.add('active');
}

// Smoothly removes the frozen floor element by stripping the active class
// and waiting for the CSS transition to finish before removing from DOM.
function _arcaneFreeze_removeFrozenFloor() {
    const frozenFloor = document.getElementById('ability-frozen-floor');
    if (!frozenFloor) return;

    frozenFloor.classList.remove('active');
    setTimeout(() => {
        // Double-check it's still inactive before removing (safety guard)
        if (frozenFloor && !frozenFloor.classList.contains('active')) {
            frozenFloor.remove();
        }
    }, ABSOLUTE_ZERO_FLOOR_CLEANUP_MS);
}

// Starts the freeze countdown ticker, updating the timer display every second.
// Returns the interval handle so it can be cleared when the freeze ends.
function _arcaneFreeze_startCountdown(totalSecs) {
    let remaining = totalSecs;
    const interval = setInterval(() => {
        remaining--;
        const el = document.getElementById('timer-val');
        if (el) el.textContent = `❄️ ${remaining}s`;
        if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return interval;
}

// Restores normal game timer state and cleans up all freeze visuals.
function _arcaneFreeze_end(tick) {
    timerFrozen = false;
    window._freezeActive = false;

    clearInterval(tick);
    updTimer();
    buildClassHUD();

    _arcaneFreeze_removeFrozenFloor();
    // Frost tiles are intentionally left in place — they now persist for
    // the rest of the level, just like stalagmites, and only clear via
    // _arcaneFreeze_clearAllFrostAndStalagmites() on win/lose/leave.
}


//------------------------------------------------------------------------
//-------------------ABSOLUTE ZERO — BLIZZARD VFX------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Creates a single randomised snowflake element for the blizzard overlay.
function _blizzard_createFlake(overlay) {
    const flake = document.createElement('div');
    flake.className = 'blizzard-flake';
    flake.textContent = _randomFrom(BLIZZARD_FLAKE_CHARS);

    flake.style.left = (Math.random() * 100) + 'vw';
    flake.style.fontSize = (BLIZZARD_FLAKE_MIN_SIZE_PX + Math.random() * BLIZZARD_FLAKE_MAX_EXTRA_PX) + 'px';
    flake.style.animationDuration = (BLIZZARD_FLAKE_MIN_DURATION_S + Math.random() * BLIZZARD_FLAKE_MAX_EXTRA_S) + 's';
    flake.style.animationDelay = (Math.random() * BLIZZARD_FLAKE_MAX_DELAY_S) + 's';

    overlay.appendChild(flake);
}

// Starts a spaced interval that spawns BLIZZARD_FLAKE_COUNT flakes over durationMs,
// then clears itself when all flakes have been spawned.
function _blizzard_startSpawnLoop(overlay, durationMs) {
    const spawnInterval = durationMs / BLIZZARD_FLAKE_COUNT;
    let spawned = 0;

    const spawnTimer = setInterval(() => {
        if (spawned >= BLIZZARD_FLAKE_COUNT) {
            clearInterval(spawnTimer);
            return;
        }
        spawned++;
        _blizzard_createFlake(overlay);
    }, spawnInterval);
}

// Fades out and removes the overlay and tint elements after durationMs.
function _blizzard_scheduleFadeOut(overlay, tint, durationMs) {
    setTimeout(() => {
        overlay.style.transition = `opacity ${ABSOLUTE_ZERO_FADE_OUT_MS}ms`;
        tint.style.transition = `opacity ${ABSOLUTE_ZERO_FADE_OUT_MS}ms`;
        overlay.style.opacity = '0';
        tint.style.opacity = '0';

        setTimeout(() => {
            overlay.remove();
            tint.remove();
        }, ABSOLUTE_ZERO_FADE_OUT_MS);
    }, durationMs);
}

// _startBlizzardEffect — creates the full blizzard visual overlay for Absolute Zero.
// Spawns a snowflake blizzard and an ice-tint screen wash for the given duration.
function _startBlizzardEffect(durationMs) {
    // Clear any leftover blizzard from a previous cast
    document.getElementById('ability-blizzard-overlay')?.remove();
    document.getElementById('ability-ice-tint')?.remove();

    const tint = document.createElement('div');
    tint.id = 'ability-ice-tint';
    document.body.appendChild(tint);

    const overlay = document.createElement('div');
    overlay.id = 'ability-blizzard-overlay';
    document.body.appendChild(overlay);

    _blizzard_startSpawnLoop(overlay, durationMs);
    _blizzard_scheduleFadeOut(overlay, tint, durationMs);
}




//------------------------------------------------------------------------
//-------------------ABSOLUTE ZERO — FROZEN TILE VFX----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Persistent per-cell ice: a light frost crust on cells correctly filled
// while Absolute Zero is active, and a large stalagmite on cells where a
// mistake was absorbed by the freeze. Both persist until the freeze ends
// naturally (thaw animation, see _arcaneFreeze_thawAllFrostAndStalagmites)
// or the level ends outright — win, defeat, or leaving via LEVELS
// (instant removal, see _arcaneFreeze_clearAllFrostAndStalagmites).

// Tracks which cells currently carry each overlay type, so cleanup never
// depends on querying the live grid DOM (cells may already be gone by the
// time cleanup runs, e.g. mid screen-transition).
function _arcaneFreeze_resetTileTrackers() {
    window._frostedTileCells = new Set();     // "row-col" keys with persistent frost
    window._stalagmiteTileCells = new Set();  // "row-col" keys with a stalagmite
}

// Adds a light, persistent frost crust to a correctly-filled cell.
// Called from handleCorrectFill() (mouse-button-handlers.js) whenever a
// correct fill lands while window._freezeActive is true.
function _arcaneFreeze_applyPersistentFrost(row, col) {
    const key = `${row}-${col}`;
    if (!window._frostedTileCells) window._frostedTileCells = new Set();
    if (window._frostedTileCells.has(key)) return; // already frosted

    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;

    if (!el.style.position || el.style.position === 'static') {
        el.style.position = 'relative';
    }

    const overlay = document.createElement('div');
    overlay.className = 'frost-tile-overlay';
    el.appendChild(overlay);

    window._frostedTileCells.add(key);
}

// Spawns a large icy stalagmite on a cell where a mistake was absorbed by
// the freeze. Called from tryAbsorbWithFreeze() (mouse-button-handlers.js).
function _arcaneFreeze_spawnStalagmite(row, col) {
    const key = `${row}-${col}`;
    if (!window._stalagmiteTileCells) window._stalagmiteTileCells = new Set();
    if (window._stalagmiteTileCells.has(key)) return; // already has one

    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;

    if (!el.style.position || el.style.position === 'static') {
        el.style.position = 'relative';
    }

    const overlay = document.createElement('div');
    overlay.className = 'stalagmite-tile-overlay';
    el.appendChild(overlay);

    window._stalagmiteTileCells.add(key);
}

// Plays the melt-away transition on every persistently-frosted cell, then
// removes the frost overlays once the animation finishes. Used when
// Absolute Zero expires naturally (see _arcaneFreeze_end).
// NOTE: stalagmites are intentionally NOT cleared here — they persist
// until their specific wrong mark is cleared (see
// _arcaneFreeze_clearStalagmiteIfWrongMarkGone) or the level ends outright
// (see _arcaneFreeze_clearAllFrostAndStalagmites).
function _arcaneFreeze_thawFrost() {
    const frostCells = window._frostedTileCells || new Set();

    frostCells.forEach(key => {
        const [r, c] = key.split('-').map(Number);
        const el = document.getElementById(`g-${r}-${c}`);
        const overlay = el?.querySelector('.frost-tile-overlay');
        overlay?.classList.add('thawing');
    });

    setTimeout(() => {
        frostCells.forEach(key => {
            const [r, c] = key.split('-').map(Number);
            document.getElementById(`g-${r}-${c}`)?.querySelector('.frost-tile-overlay')?.remove();
        });
        window._frostedTileCells = new Set();
    }, ABSOLUTE_ZERO_THAW_MS);
}

// Absolute Zero: if a cell's stalagmite (from a mistake made during a
// freeze) is still present but the wrong mark itself has since been
// cleared by some other system (mistake eraser item, undo, etc.), thaw
// and remove just that one stalagmite. Called from renderCell() in
// grid.js on every render, so it works no matter what cleared the mark.
function _arcaneFreeze_clearStalagmiteIfWrongMarkGone(row, col) {
    if (!window._stalagmiteTileCells) return;
    const key = `${row}-${col}`;
    if (!window._stalagmiteTileCells.has(key)) return;
    if (wrongGrid[row][col]) return; // still wrong — keep the stalagmite

    const el = document.getElementById(`g-${row}-${col}`);
    const overlay = el?.querySelector('.stalagmite-tile-overlay');
    if (overlay) {
        overlay.classList.add('thawing');
        setTimeout(() => overlay.remove(), ABSOLUTE_ZERO_THAW_MS);
    }
    window._stalagmiteTileCells.delete(key);
}

// Instantly strips every frost/stalagmite overlay with no animation.
// Called whenever the level ends outright — win, defeat, or the player
// leaving through the LEVELS button — so nothing lingers into the next
// level or the overlay screens.
function _arcaneFreeze_clearAllFrostAndStalagmites() {
    document.querySelectorAll('.frost-tile-overlay, .stalagmite-tile-overlay')
        .forEach(el => el.remove());
    _arcaneFreeze_resetTileTrackers();
}




//------------------------------------------------------------------------
//-------------------ABSOLUTE ZERO — MAIN FUNCTION------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _executeArcaneFreeze — main entry point for the Absolute Zero ability.
// Freezes the game timer for durationMs (modified by passives).
// While frozen, wrong fills cost zero time (window._freezeActive flag).
function _executeArcaneFreeze(durationMs) {
    const effectiveDuration = _arcaneFreeze_calcDuration(durationMs);

    // Set freeze state flags
    timerFrozen = true;
    window._freezeActive = true;
    window._freezeCorrFills = 0; // Tracks correct fills during freeze (for frozen_resilience passive)

    _arcaneFreeze_resetTileTrackers(); 

    _arcaneFreeze_spawnFrozenFloor();
    _startBlizzardEffect(effectiveDuration);
    if (typeof playFreezeCountdownOverlay === 'function') playFreezeCountdownOverlay(effectiveDuration);
    updTimer();

    const secs = Math.ceil(effectiveDuration / 1000);
    showToast(t('cls_absolute_zero').replace('{n}', secs));
    Audio_Manager.playSFX('absoluteZero');

    // Track clutch freezes (used when timer is critically low)
    if (timerSecs <= 10) trackAchStat('freezeClutches');

    const tick = _arcaneFreeze_startCountdown(secs);
    setTimeout(() => _arcaneFreeze_end(tick), effectiveDuration);
}