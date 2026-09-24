// Mathmagician Arcane Reveal: candidate selection, preview, and reveal VFX.
// The class dispatcher and targeting reticle use the public entry points below.

import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { _adjacencyMatrixRefreshAll, renderCell } from '../grid.js';
import { _filterMarkedIds, _filterRevealedIds, _resolveCell } from './class-abilities.js';
import { CLASS_DEFS } from './class-defs.js';
import { _shuffleArray } from './class-probabilist.js';
import { ptHasSkill } from '../probability-tree/probability-tree-state-points.js';
import { getSkillCastRankClamped } from '../skills/skill-charms.js';
import { questStat_classMarkUsed, questStat_classRevealUsed, updateQuestStats } from '../inference/inference-stats.js';
import { STATE } from '../state.js';
import { cur } from '../state.js';

//------------------------------------------------------------------------
//----------------------MATHMAGICIAN SKILLS-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//----------------------------CONSTANTS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Arcane Reveal

// Arcane Reveal - three-stage arcane-mathematics sequence
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

//------------------------------------------------------------------------
//----------------------------UTILITY-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _shuffleArray (in-place Durstenfeld shuffle) is defined ONCE, in
// class-probabilist.js - the identical local copy was removed 2026-09 (it
// shadowed the other via load order).

// Returns a random element from the given array.
function _randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL - CANDIDATE SELECTION------------------
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
    // calls renderCell() - i.e. it performs the real reveal. Calling it at
    // candidate-collection time (before Stage 1 even starts) is what made
    // cells appear solved instantly. We now only build a plain id for
    // still-untouched cells, and defer the real _resolveCell() call to
    // _arcaneReveal_onCellRevealed(), which fires once Stage 3 finishes.
    const affected = [];
    finalCells.forEach(([r, c]) => {
        if (globalThis.userGrid[r][c] !== 0) return; // already resolved/marked - skip
        affected.push(`g-${r}-${c}`);
    });

    return affected;
}




//------------------------------------------------------------------------
//-------------------ARCANE REVEAL - DOM/GEOMETRY HELPERS-----------------
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
//-------------------ARCANE REVEAL - STAGE 1: INVOCATION------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Fires on the exact cell the player selected. A precise violet sigil
// traces the cell, corner runes flicker, and the energy condenses into a
// small blue-white point at the cell's center - the "origin" of the spell.

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
//-------------------ARCANE REVEAL - STAGE 2: FIELD FORMATION-------------
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
//-------------------ARCANE REVEAL - STAGE 3: REVELATION------------------
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

    // This is the actual data reveal - writes userGrid/revealedGrid and
    // calls renderCell(). Correctly deferred until Stage 3 finishes now,
    // instead of firing early inside _arcaneReveal_collectCells.
    const resolvedId = _resolveCell(r, c, sol);
    if (!resolvedId) return; // already resolved by the time we got here - skip

    globalThis._applyCellEffect([resolvedId], 'reveal');
    _spawnArcaneSparkles([resolvedId]);

    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();

    updateQuestStats('tilesRevealed', { count: 1 });
    trackAchStat('tilesRevealed', 1);
    questStat_classRevealUsed(1);
    updateQuestStats('classAbilityUsedThisLevel', {});

    globalThis.checkWin();
}

// Runs the staggered per-cell mark → beam → flash sequence for every
// revealed cell, radiating out visually from the origin cell.
function _arcaneReveal_revelationSequence(originRow, originCol, revealedIds, wrap, zoom, sol) {
    const originEl = _arcaneReveal_findCellElement(originRow, originCol);
    if (!originEl) {
        // No DOM anchor to draw beams from - resolve instantly instead.
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
                // No DOM to animate against for this cell - reveal it
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
//-------------------ARCANE REVEAL - SPARKLE VFX--------------------------
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
    const zoom = globalThis.currentZoom || 1;

    cellIds.slice(0, ARCANE_REVEAL_SPARKLE_LIMIT).forEach((id, i) => {
        _arcaneReveal_spawnSparklesForCell(id, i, wrap, wrapRect, zoom);
    });
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL - ORCHESTRATION------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Handles all post-burst logic for a single revealed cell:
// visual reveal, sparkles, passive adjacency refresh, stats, and win check.
// SUSPECTED DEAD: retained for the legacy reveal path; no current caller.
function _arcaneReveal_onBalloonBurst(id) {
    globalThis._applyCellEffect([id], 'reveal');
    _spawnArcaneSparkles([id]);

    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();

    updateQuestStats('tilesRevealed', { count: 1 });
    trackAchStat('tilesRevealed', 1);
    questStat_classRevealUsed(1);
    updateQuestStats('classAbilityUsedThisLevel', {});

    globalThis.checkWin();
}



// Applies arcane_exposure passive: marks all incorrect cells in the affected list.
// Only runs when the arcane_exposure passive node is active.
function _arcaneReveal_applyExposureMarks(markedIds) {
    if (markedIds.length === 0) return;

    markedIds.forEach(id => {
        const [, r, c] = id.split('-').map(Number);
        if (globalThis.userGrid[r][c] === 0) {
            globalThis.userGrid[r][c] = 2;
            renderCell(r, c);
            questStat_classMarkUsed(1);
        }
    });

    globalThis._applyCellEffect(markedIds, 'mark');
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL - AREA PREVIEW (while armed)-----------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Live dashed-square preview shown while Arcane Reveal is armed, mirroring
// Field Scan's boundary preview (_fieldScanUpdatePreview in
// class-probabilist.js). Unlike Field Scan's fixed NxN region, Arcane
// Reveal's area is a (radius*2+1) square *centred* on the hovered cell and
// simply clamped at the grid edges (never re-centred/shifted the way Field
// Scan's region is) - this matches _arcaneReveal_buildCandidatePools exactly.

// Module state for the live preview outline.
let _arcaneRevealPreviewEl = null;
let _arcaneRevealPreviewKey = null; // last-rendered region, to skip redundant rebuilds

// _arcaneReveal_getEffectiveRadiusForPreview - returns the current effective
// radius (base radius for the ability's rank + passive bonuses via
// _arcaneReveal_calcRadius) for whatever rank Arcane Reveal is at. Kept
// separate from the main execute path since the preview fires before the
// ability itself (and thus before row/col are known).
function _arcaneReveal_getEffectiveRadiusForPreview() {
    const def = CLASS_DEFS?.mathmagician;
    if (!def) return 1;
    // Effect rank follows the slotted charm when one is placed
    // (js/skills/skill-charms.js).
    let level = STATE.classActive1Level || 1;
    const charmRank = getSkillCastRankClamped('mathmagician_active1');
    if (charmRank) level = charmRank;
    const actData = def.active1.levels[level - 1];
    if (!actData) return 1;
    return _arcaneReveal_calcRadius(actData.effect.radius);
}

// _arcaneReveal_getHoveredCell - resolves which grid cell is under the given
// viewport coordinates, or null if the cursor isn't over the grid at all.
function _arcaneReveal_getHoveredCell(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    const cellEl = el?.closest('[id^="g-"]');
    if (!cellEl) return null;
    const m = cellEl.id.match(/^g-(\d+)-(\d+)$/);
    if (!m) return null;
    return { r: parseInt(m[1], 10), c: parseInt(m[2], 10) };
}

// _arcaneReveal_buildPreviewBounds - computes the pixel bounds (relative to
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
    const zoom = globalThis.currentZoom || 1;
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

// _arcaneReveal_buildPreviewEl - creates the dashed preview outline once and
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

// _arcaneReveal_clearPreview - removes the live preview outline. Called when
// Arcane Reveal is disarmed (cancelled, executed, or the player switches to
// a different ability/slot) and whenever the cursor leaves the grid while armed.
export function _arcaneReveal_clearPreview() {
    _arcaneRevealPreviewKey = null;
    if (_arcaneRevealPreviewEl) {
        _arcaneRevealPreviewEl.remove();
        _arcaneRevealPreviewEl = null;
    }
}

// _arcaneReveal_updatePreview - called on every mousemove while any ability
// is armed (see targeting-reticle.js). No-ops unless Arcane Reveal
// specifically is the one armed. Moves/resizes the dashed square to match
// the region currently centred under the cursor, clamped exactly the way
// _arcaneReveal_buildCandidatePools clamps it, so the preview always matches
// what will actually be revealed.
export function _arcaneReveal_updatePreview(clientX, clientY) {
    const isArmed = globalThis.activeAbilityMode
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
    if (key === _arcaneRevealPreviewKey) return; // region unchanged since last move - skip rebuild
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
//-------------------ARCANE REVEAL - MAIN FUNCTION-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _executeArcaneReveal - main entry point for the Arcane Reveal ability.
// Reveals up to maxReveals correct cells within radius steps of (row, col),
// including diagonals. Passive nodes can extend radius and reveal cap.
export function _executeArcaneReveal(row, col, radius, maxReveals = 4) {
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
        // No DOM to animate against - resolve everything instantly.
        revealedIds.forEach(id => _arcaneReveal_onCellRevealed(id, sol));
        _arcaneReveal_applyExposureMarks(markedIds);
        return;
    }
    if (!wrap.style.position || wrap.style.position === 'static') wrap.style.position = 'relative';

    // STAGE 1 - Invocation on the origin cell
    const originEl = _arcaneReveal_findCellElement(row, col);
    if (originEl) _arcaneReveal_playInvocation(originEl, wrap, globalThis.currentZoom || 1);

    // STAGE 2 - Field formation over the whole targeting square
    setTimeout(() => {
        const field = _arcaneReveal_playFieldFormation(startRow, startCol, endRow, endCol, wrap);

        // STAGE 3 - Revelation: mark → beam → flash for each chosen cell
        setTimeout(() => {
            _arcaneReveal_fadeField(field);
            _arcaneReveal_revelationSequence(row, col, revealedIds, wrap, globalThis.currentZoom || 1, sol);
            _arcaneReveal_applyExposureMarks(markedIds);
        }, ARCANE_REVEAL_FIELD_MS);
    }, ARCANE_REVEAL_INVOKE_MS);
}
