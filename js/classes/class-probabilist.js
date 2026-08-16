//------------------------------------------------------------------------
//------------------------PROBABILIST-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// This file handles all ability logic and visual effects for the Probabilist class.
// Abilities covered:
//   - Precision Mark  : marks empty cells in target rows/cols, fires arrow VFX
//   - Field Scan      : temporarily reveals a region of the grid with a beam sweep VFX
//   - Bayesian Insight: auto-marks cells with a crossbow-pull VFX
//   - Bayesian Reveal : permanently reveals a cell with a golden-orb descend VFX


//------------------------------------------------------------------------
//------------------------PRECISION MARK — LOGIC--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Computes the maximum number of cells Precision Mark is allowed to mark,
// based on the player's class level and any relevant passive skills.
function _precisionMarkComputeMarkCap() {
    const level = STATE.classActive1Level || 1;
    let markCap = 3 + (level * 2); // lv1→5, lv2→7, lv3→9
    if (ptHasSkill('probabilistic_sweep')) markCap += 1;
    if (ptHasSkill('expanded_inference')) markCap += 1;
    if (ptHasSkill('god_of_probabilities')) markCap += 2;
    return markCap;
}

// Computes the set of rows and columns that Precision Mark should target,
// starting from the clicked cell and expanding outward by extraLines.
function _precisionMarkBuildTargets(row, col, extraLines, rows, cols) {
    const targetRows = new Set([row]);
    const targetCols = new Set([col]);
    for (let i = 1; i <= extraLines; i++) {
        if (row - i >= 0) targetRows.add(row - i);
        if (row + i < rows) targetRows.add(row + i);
        if (col - i >= 0) targetCols.add(col - i);
        if (col + i < cols) targetCols.add(col + i);
    }
    return { targetRows, targetCols };
}

// Shuffles an array in-place using Fisher-Yates (used when randomly selecting
// which cells in a line get marked when the markCap is reached).
function _shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// _precisionMarkSelectLine — selects up to `markCap - affected.length` empty,
// unmarked cells from a single line (row or column) for Precision Mark to
// mark. Selection only — does NOT touch userGrid or render anything, since
// the ✕ now only appears once that cell's marking arrow actually lands (see
// _precisionMarkCommitMark). `claimed` tracks cells already picked by other
// lines in this same call, since userGrid itself isn't updated yet to do
// that bookkeeping for us.
function _precisionMarkSelectLine(cells, sol, markCap, affected, claimed) {
    const remaining = markCap - affected.length;
    if (remaining <= 0) return;
    const eligible = cells.filter(([r, c]) =>
        sol[r][c] === 0 && userGrid[r][c] === 0 && !claimed.has(`${r}-${c}`)
    );
    _shuffleArray(eligible);
    eligible.slice(0, remaining).forEach(([r, c]) => {
        claimed.add(`${r}-${c}`);
        affected.push(`g-${r}-${c}`);
    });
}

// _precisionMarkCommitMark — performs the actual userGrid mutation + render
// for one Precision Mark cell, called exactly when that cell's marking
// arrow lands. Re-checks the cell is still empty first, in case the player
// manually filled or marked it during the arrow's brief flight time.
function _precisionMarkCommitMark(id) {
    const [, r, c] = id.split('-').map(Number);
    if (userGrid[r][c] !== 0) return; // no longer eligible — leave it alone

    userGrid[r][c] = 2;
    renderCell(r, c);
    _applyCellEffect([id], 'mark');
}

// _precisionMarkApply — selects all cells Precision Mark will mark across
// the target rows/cols. Selection only; the actual mark is committed later,
// in sync with the VFX. Returns the list of affected cell id strings.
function _precisionMarkApply(targetRows, targetCols, rows, cols, sol, markCap) {
    const affected = [];
    const claimed = new Set();

    targetRows.forEach(r => {
        const cells = [];
        for (let c = 0; c < cols; c++) cells.push([r, c]);
        _precisionMarkSelectLine(cells, sol, markCap, affected, claimed);
    });
    targetCols.forEach(c => {
        const cells = [];
        for (let r = 0; r < rows; r++) cells.push([r, c]);
        _precisionMarkSelectLine(cells, sol, markCap, affected, claimed);
    });

    questStat_classMarkUsed(affected.length);
    return affected;
}

// Collects all filled but not yet player-filled cells within the Precision Mark
// target area, used by the momentum_of_certainty skill to start a bonus window.
function _precisionMarkCollectMomentumCells(targetRows, targetCols, rows, cols, sol) {
    const momentumCells = [];
    targetRows.forEach(r => {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 1 && userGrid[r][c] !== 1) momentumCells.push(`g-${r}-${c}`);
        }
    });
    targetCols.forEach(c => {
        for (let r = 0; r < rows; r++) {
            // Skip rows already added via targetRows to avoid duplicates
            if (sol[r][c] === 1 && userGrid[r][c] !== 1 && !targetRows.has(r)) {
                momentumCells.push(`g-${r}-${c}`);
            }
        }
    });
    return momentumCells;
}

// Sets a 5-second window during which the next correct fill in any of the
// affected cells grants +3 minutes (momentum_of_certainty skill perk).
function _precisionMarkStartMomentumWindow(affected) {
    const affectedSet = new Set(affected);
    window._pmMomentumActive = true;
    window._pmMomentumSet = affectedSet;
    window._pmMomentumTimeout = setTimeout(() => {
        window._pmMomentumActive = false;
        window._pmMomentumSet = null;
    }, 5000);
}

// Builds a pool of all rows and columns that still contain unmarked empty cells,
// used by _precisionMarkBonusLine to pick a random unsolved line.
function _precisionMarkBuildUnsolvedPool(rows, cols, sol) {
    const unsolvedRows = [];
    const unsolvedCols = [];

    for (let r = 0; r < rows; r++) {
        if ([...Array(cols).keys()].some(c => sol[r][c] === 0 && userGrid[r][c] === 0)) {
            unsolvedRows.push(r);
        }
    }
    for (let c = 0; c < cols; c++) {
        if ([...Array(rows).keys()].some(r => sol[r][c] === 0 && userGrid[r][c] === 0)) {
            unsolvedCols.push(c);
        }
    }

    return [
        ...unsolvedRows.map(r => ({ type: 'row', idx: r })),
        ...unsolvedCols.map(c => ({ type: 'col', idx: c })),
    ];
}

// Marks all remaining empty cells in a single randomly chosen unsolved row or column.
// Used as a bonus effect when a relevant skill proc fires.
function _precisionMarkBonusLine(rows, cols, sol, affected) {
    const pool = _precisionMarkBuildUnsolvedPool(rows, cols, sol);
    if (!pool.length) return;

    const pick = pool[Math.floor(Math.random() * pool.length)];

    if (pick.type === 'row') {
        for (let c = 0; c < cols; c++) {
            if (sol[pick.idx][c] === 0 && userGrid[pick.idx][c] === 0) {
                userGrid[pick.idx][c] = 2;
                renderCell(pick.idx, c);
                questStat_classMarkUsed(1);
                trackAchStat('tilesMarkedWrong', 1);
                affected.push(`g-${pick.idx}-${c}`);
            }
        }
    } else {
        for (let r = 0; r < rows; r++) {
            if (sol[r][pick.idx] === 0 && userGrid[r][pick.idx] === 0) {
                userGrid[r][pick.idx] = 2;
                renderCell(r, pick.idx);
                questStat_classMarkUsed(1);
                trackAchStat('tilesMarkedWrong', 1);
                affected.push(`g-${r}-${pick.idx}`);
            }
        }
    }

    showToast(`🎯 ${LANG === 'de' ? 'Bonus-Linie markiert!' : 'Bonus line marked!'}`);
}

// Main entry point for the Precision Mark ability.
// Marks empty cells in the target row/col and adjacent lines, then fires VFX.
function _executePrecisionMark(row, col, extraLines) {
    if (!cur) return;
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    const markCap = _precisionMarkComputeMarkCap();
    const { targetRows, targetCols } = _precisionMarkBuildTargets(row, col, extraLines, rows, cols);
    const affected = _precisionMarkApply(targetRows, targetCols, rows, cols, sol, markCap);

    _playPrecisionMarkEffect(row, col, affected);
    // (the _applyCellEffect(affected, 'mark') call that used to be here is gone —
    // it now fires per-cell, at impact, inside _precisionMarkCommitMark)
    showToast(`🎯 ${affected.length} ${LANG === 'de' ? 'Zellen markiert!' : 'cells marked!'}`);

    Audio_Manager.playSFX('precisionMark');
    trackAchStat('tilesMarkedWrong', affected.length);

    if (ptHasSkill('momentum_of_certainty')) {
        const momentumCells = _precisionMarkCollectMomentumCells(targetRows, targetCols, rows, cols, sol);
        if (momentumCells.length > 0) _precisionMarkStartMomentumWindow(momentumCells);
    }
}


//------------------------------------------------------------------------
//--------------------PRECISION MARK — VFX--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Charged arrow timing — deliberately much slower than the small marking
// arrows fired by _firePrecisionArrow, so it reads as a "wind-up" shot.
const PM_CHARGED_ARROW_SPEED_PX_S = 160;
const PM_CHARGED_ARROW_MIN_DURATION_S = 0.7;
const PM_CHARGED_ARROW_MAX_DURATION_S = 1.6;
const PM_CHARGED_TRAIL_INTERVAL_MS = 45;

// _pmGetSpriteOrigin — returns the on-screen centre of the player's avatar
// sprite, used as the launch point for the charged arrow. Checks the simple
// (puzzle-level) avatar first, then the full (monster-level) avatar. Falls
// back to bottom-centre of the viewport if neither is currently rendered.
function _pmGetSpriteOrigin() {
    const el = document.getElementById('avatar-sprite-img-simple')
        || document.getElementById('avatar-sprite-img');
    if (el) {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight - 40 };
}

// _pmChargedArrowTrailTick — spawns one fading comet-trail particle at the
// charged arrow's current on-screen position. Called on an interval while
// the arrow is in flight.
function _pmChargedArrowTrailTick(arrowEl) {
    const rect = arrowEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const spark = document.createElement('div');
    spark.className = 'pm-charged-trail';
    spark.style.cssText = `
        left: ${cx}px;
        top: ${cy}px;
    `;
    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), 520);
}

// _pmFireChargedArrow — animates the special charged arrow flying from
// (sx, sy) — the player sprite — to (tx, ty) — the clicked cell. Slower
// and larger than the small marking arrows, with a glowing comet trail.
// Calls onArrival() once it lands.
function _pmFireChargedArrow(sx, sy, tx, ty, onArrival) {
    const dx = tx - sx, dy = ty - sy;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const duration = Math.min(
        Math.max(dist / PM_CHARGED_ARROW_SPEED_PX_S, PM_CHARGED_ARROW_MIN_DURATION_S),
        PM_CHARGED_ARROW_MAX_DURATION_S
    );

    const arrow = document.createElement('div');
    arrow.className = 'pm-charged-arrow';
    arrow.textContent = '➤';
    arrow.style.cssText = `
        left: ${sx}px;
        top: ${sy}px;
        transform: translate(-50%, -50%) rotate(${angle}deg);
        transition: left ${duration}s cubic-bezier(0.3, 0, 0.6, 1),
                    top ${duration}s cubic-bezier(0.3, 0, 0.6, 1);
    `;
    document.body.appendChild(arrow);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        arrow.style.left = `${tx}px`;
        arrow.style.top = `${ty}px`;
    }));

    const trailInterval = setInterval(
        () => _pmChargedArrowTrailTick(arrow),
        PM_CHARGED_TRAIL_INTERVAL_MS
    );

    setTimeout(() => {
        clearInterval(trailInterval);
        arrow.remove();
        _playChargedArrowImpact(tx, ty);
        if (onArrival) onArrival();
    }, duration * 1000 + 30);
}

// _playChargedArrowImpact — bigger impact burst played when the charged
// arrow lands on the clicked cell (distinct from _playArrowImpact, which is
// the smaller burst used for the marking arrows).
function _playChargedArrowImpact(x, y) {
    const ring = document.createElement('div');
    ring.className = 'pm-charged-impact-ring';
    ring.style.cssText = `left: ${x}px; top: ${y}px;`;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 640);

    const flash = document.createElement('div');
    flash.className = 'pm-charged-impact-flash';
    flash.style.cssText = `left: ${x}px; top: ${y}px;`;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 480);
}




// _precisionMarkFireArrowsAtTargets — fires a small green marking arrow at
// every target cell, originating from (originX, originY) — the point where
// the charged arrow just landed. Each cell's ✕ is committed exactly when
// its own arrow lands, so the mark and the VFX stay in sync.
function _precisionMarkFireArrowsAtTargets(ids, originX, originY) {
    ids.forEach((id, i) => {
        const targetEl = document.getElementById(id);
        if (!targetEl) return;

        setTimeout(() => {
            const targetRect = targetEl.getBoundingClientRect();
            const tx = targetRect.left + targetRect.width / 2;
            const ty = targetRect.top + targetRect.height / 2;
            _firePrecisionArrow(originX, originY, tx, ty, () => _precisionMarkCommitMark(id));
        }, i * 70);
    });
}

// _playPrecisionMarkEffect — fires the full Precision Mark VFX sequence:
// a slow charged arrow flies from the player's sprite to the clicked cell,
// and once it lands, the green marking arrows fan out from that cell to
// every cell the ability just marked.
function _playPrecisionMarkEffect(clickRow, clickCol, affectedIds) {
    const clickEl = document.getElementById(`g-${clickRow}-${clickCol}`);
    if (!clickEl) return;

    const clickRect = clickEl.getBoundingClientRect();
    const tx = clickRect.left + clickRect.width / 2;
    const ty = clickRect.top + clickRect.height / 2;
    const origin = _pmGetSpriteOrigin();

    _pmFireChargedArrow(origin.x, origin.y, tx, ty, () => {
        if (affectedIds.length) _precisionMarkFireArrowsAtTargets(affectedIds, tx, ty);
    });
}

// Creates an arrow element and animates it flying from (sx, sy) to (tx, ty).
// Speed is ~420px/s, clamped between 0.18s and 0.7s flight time.
function _firePrecisionArrow(sx, sy, tx, ty, onImpact) {
    const dx = tx - sx, dy = ty - sy;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const duration = Math.min(Math.max(dist / 420, 0.18), 0.7);

    const arrow = document.createElement('div');
    arrow.className = 'pm-arrow';
    arrow.textContent = '➤';
    arrow.style.cssText = `
        position: fixed;
        left: ${sx}px;
        top: ${sy}px;
        transform: translate(-50%, -50%) rotate(${angle}deg);
        font-size: 16px;
        color: #00ff88;
        text-shadow: 0 0 8px #00ff88, 0 0 16px #00cc66;
        z-index: 9001;
        pointer-events: none;
        transition: left ${duration}s linear, top ${duration}s linear;
        will-change: left, top;
    `;
    document.body.appendChild(arrow);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        arrow.style.left = `${tx}px`;
        arrow.style.top = `${ty}px`;
    }));

    setTimeout(() => {
        arrow.remove();
        if (onImpact) onImpact();
        _playArrowImpact(tx, ty);
    }, duration * 1000 + 30);
}

// Plays a green ripple ring and radial flash at the arrow impact point.
function _playArrowImpact(x, y) {
    // Expanding ring
    const ring = document.createElement('div');
    ring.className = 'pm-impact-ring';
    ring.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 0;
        height: 0;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        z-index: 9002;
        pointer-events: none;
        animation: pm-impact 0.55s ease-out forwards;
    `;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 580);

    // Small radial flash on the cell
    const flash = document.createElement('div');
    flash.className = 'pm-impact-flash';
    flash.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, rgba(0,255,136,0.7) 0%, rgba(0,204,102,0) 70%);
        z-index: 9002;
        pointer-events: none;
        animation: pm-flash 0.4s ease-out forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 420);
}


//------------------------------------------------------------------------
//------------------------FIELD SCAN — LOGIC------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies passive skill modifiers to the base scan size and duration.
// wider_lens and panoramic_view each add 1 to scan size.
// photographic_memory adds 1 second to the duration.
function _fieldScanComputeEffectiveParams(scanSize, durationMs) {
    let effectiveSize = scanSize;
    let effectiveDuration = durationMs;
    if (ptHasSkill('wider_lens')) effectiveSize += 1;
    if (ptHasSkill('panoramic_view')) effectiveSize += 1;
    if (ptHasSkill('photographic_memory')) effectiveDuration += 1000;
    return { effectiveSize, effectiveDuration };
}

// Picks a random top-left corner so the scan region stays fully within grid bounds.

/*
function _fieldScanPickOrigin(scanSize, rows, cols) {
    const maxRow = Math.max(0, rows - scanSize);
    const maxCol = Math.max(0, cols - scanSize);
    return {
        startRow: Math.floor(Math.random() * (maxRow + 1)),
        startCol: Math.floor(Math.random() * (maxCol + 1)),
    };
}

*/

// Temporarily reveals all unrevealed cells in the scan region by adding CSS classes.
// Returns the DOM elements and their previous state for later restoration.

/*
function _fieldScanRevealRegion(startRow, startCol, scanSize, rows, cols, sol) {
    const scanned = [];
    const prevStates = [];

    for (let r = startRow; r < Math.min(startRow + scanSize, rows); r++) {
        for (let c = startCol; c < Math.min(startCol + scanSize, cols); c++) {
            if (userGrid[r][c] === 1 || revealedGrid[r][c]) continue;

            const el = document.getElementById(`g-${r}-${c}`);
            if (!el) continue;

            prevStates.push({ r, c });
            el.classList.remove('filled', 'marked', 'wrong-mark', 'revealed', 'questioned');
            el.classList.add(sol[r][c] === 1 ? 'filled' : 'marked', 'scan-reveal');
            scanned.push(el);
            questStat_fieldScanCellRevealed(1);
        }
    }

    return { scanned, prevStates };
}

*/

// Tracks the achievement for scanning 20 or more correct (filled) cells at once.
function _fieldScanCheckBigScanAchievement(prevStates, sol) {
    const correctInScan = prevStates.filter(({ r, c }) => sol[r][c] === 1).length;
    if (correctInScan >= 20) trackAchStat('probabilistBigScan');
}

// Handles the god_of_probabilities skill perk during scan restore:
// permanently reveals up to 3 random filled cells from the scan region.
function _fieldScanRestoreGodOfProbabilities(prevStates) {
    const filledInScan = prevStates.filter(({ r, c }) =>
        cur.grid[r][c] === 1 && !revealedGrid[r][c] && userGrid[r][c] !== 1
    );

    _shuffleArray(filledInScan);
    filledInScan.slice(0, 3).forEach(({ r, c }) => {
        revealedGrid[r][c] = true;
        userGrid[r][c] = 1;
        updClues(r, c);
        trackAchStat('tilesRevealed', 1);
        questStat_classRevealUsed(1);
        updateQuestStats('classAbilityUsedThisLevel', {});
    });

    _playDivineProcEffect();
}

// Fades out the scan-reveal cells one by one with a randomized stagger,
// then re-renders each cell to its actual state.
function _fieldScanFadeOutCells(scanned) {
    scanned.forEach(el => {
        setTimeout(() => {
            el.style.transition = 'opacity 0.25s ease-out, filter 0.25s ease-out';
            el.style.opacity = '0.3';
            el.style.filter = 'brightness(2) saturate(0)';
            setTimeout(() => {
                el.classList.remove('scan-reveal');
                el.style.transition = '';
                el.style.opacity = '';
                el.style.filter = '';
            }, 260);
        }, Math.random() * 180);
    });
}

// Restores all scanned cells to their real state after the scan timer expires.
// If god_of_probabilities is active, permanently keeps up to 3 filled cells first.
function _fieldScanRestore(scanned, prevStates) {
    if (ptHasSkill('god_of_probabilities')) {
        _fieldScanRestoreGodOfProbabilities(prevStates);
    }

    // Re-render all cells (correctly handles both kept and restored cells)
    prevStates.forEach(({ r, c }) => renderCell(r, c));

    _fieldScanFadeOutCells(scanned);
    showToast('🎯 Scan faded');
    buildClassHUD();
}

// Main entry point for the Field Scan ability.
// Temporarily reveals a random grid region and schedules its restoration.
// _executeFieldScan — main entry point for the (now targeted) Field Scan
// ability. Centers a scanSize x scanSize region on the clicked cell, then
// plays the "charge → split → rain down" VFX. The scan itself (beam sweep +
// temporary reveal) only actually triggers once every split arrow has landed.
function _executeFieldScan(row, col, scanSize, durationMs) {
    if (!cur) return;
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    const { effectiveSize, effectiveDuration } = _fieldScanComputeEffectiveParams(scanSize, durationMs);
    const { startRow, startCol } = _fieldScanComputeOrigin(row, col, effectiveSize, rows, cols);
    const targets = _fieldScanComputeTargets(startRow, startCol, effectiveSize, rows, cols, sol);

    if (targets.length === 0) {
        showToast(LANG === 'de' ? '🎯 Nichts zu scannen!' : '🎯 Nothing to scan!');
        return;
    }

    _fieldScanPlayTargetedVFX(targets, sol, startRow, startCol, effectiveSize, effectiveDuration);
}

// _fieldScanComputeOrigin — centers a scanSize x scanSize region on the
// clicked cell, clamped so the region never runs off the edge of the grid.
function _fieldScanComputeOrigin(row, col, scanSize, rows, cols) {
    const half = Math.floor((scanSize - 1) / 2);
    const maxRow = Math.max(0, rows - scanSize);
    const maxCol = Math.max(0, cols - scanSize);
    const startRow = Math.max(0, Math.min(maxRow, row - half));
    const startCol = Math.max(0, Math.min(maxCol, col - half));
    return { startRow, startCol };
}

// _fieldScanComputeTargets — selection only (no mutation): returns every
// cell inside the scan region eligible for the scan-reveal treatment (i.e.
// not already correctly filled or revealed). The length of this list is
// exactly how many drop-arrows will rain down onto the grid.
function _fieldScanComputeTargets(startRow, startCol, scanSize, rows, cols, sol) {
    const targets = [];
    for (let r = startRow; r < Math.min(startRow + scanSize, rows); r++) {
        for (let c = startCol; c < Math.min(startCol + scanSize, cols); c++) {
            if (userGrid[r][c] === 1 || revealedGrid[r][c]) continue;
            targets.push({ r, c });
        }
    }
    return targets;
}

// _fieldScanCommitCell — performs the actual DOM mutation for one Field Scan
// cell, called exactly when that cell's drop-arrow lands. Mirrors what the
// old (synchronous) _fieldScanRevealRegion used to do per cell, just staged
// in time with the VFX. Re-checks eligibility in case the player changed
// that exact cell during the brief flight.
function _fieldScanCommitCell(r, c, sol) {
    if (userGrid[r][c] === 1 || revealedGrid[r][c]) return null;

    const el = document.getElementById(`g-${r}-${c}`);
    if (!el) return null;

    el.classList.remove('filled', 'marked', 'wrong-mark', 'revealed', 'questioned');
    el.classList.add(sol[r][c] === 1 ? 'filled' : 'marked', 'scan-reveal');
    questStat_fieldScanCellRevealed(1);

    return el;
}


//------------------------------------------------------------------------
//---------------------FIELD SCAN — VFX----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Removes any leftover scan VFX elements from a previous ability cast.
function _scanBeamCleanupPreviousCast() {
    ['ability-scan-beam', 'ability-scan-outline', 'ability-scan-bar', 'scan-beam-style'].forEach(id => {
        document.getElementById(id)?.remove();
    });
}

// Computes the pixel bounds of the scan region within the puzzle scaler element,
// accounting for the current zoom level.
function _scanBeamBuildRegionBounds(startRow, startCol, scanSize, wrap) {
    const rows = cur?.grid?.length || 99;
    const cols = cur?.grid?.[0]?.length || 99;
    const endRow = Math.min(startRow + scanSize - 1, rows - 1);
    const endCol = Math.min(startCol + scanSize - 1, cols - 1);

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

// Injects the CSS keyframe animations needed for the scan beam effect.
// Returns the inserted style tag so it can be removed during cleanup.
function _scanBeamInjectKeyframes(durationMs, regionTop, regionHeight, beamH) {
    const travelDist = Math.max(0, regionHeight - beamH);
    const styleTag = document.createElement('style');
    styleTag.id = 'scan-beam-style';
    styleTag.textContent = `
        @keyframes scan-beam-move-dynamic {
            0%   { opacity: 0;   top: ${regionTop}px; }
            4%   { opacity: 1; }
            95%  { opacity: 1; }
            100% { opacity: 0;   top: ${regionTop + travelDist}px; }
        }
        @keyframes scan-outline-in {
            from { opacity: 0; clip-path: inset(0 100% 100% 0); }
            to   { opacity: 1; clip-path: inset(0 0% 0% 0); }
        }
        @keyframes scan-bar-deplete {
            from { transform: scaleX(1); }
            to   { transform: scaleX(0); }
        }
        @keyframes scan-cell-flash {
            0%   { background: rgba(74,222,128,0.55); }
            60%  { background: rgba(74,222,128,0.08); }
            100% { background: transparent; }
        }
        @keyframes scan-outline-fade {
            from { opacity: 1; }
            to   { opacity: 0; box-shadow: 0 0 24px 4px rgba(74,222,128,0.15); }
        }
    `;
    document.head.appendChild(styleTag);
    return styleTag;
}

// Creates and appends the animated green border outline for the scan region.
function _scanBeamCreateOutline(wrap, regionLeft, regionTop, regionWidth, regionHeight) {
    const outline = document.createElement('div');
    outline.id = 'ability-scan-outline';
    outline.style.cssText = `
        position: absolute;
        left: ${regionLeft}px;
        top: ${regionTop}px;
        width: ${regionWidth}px;
        height: ${regionHeight}px;
        pointer-events: none;
        z-index: 309;
        border: 1.5px solid rgba(74,222,128,0.85);
        box-shadow: 0 0 10px 1px rgba(74,222,128,0.35), inset 0 0 8px rgba(74,222,128,0.08);
        animation: scan-outline-in 0.35s cubic-bezier(0.22,1,0.36,1) forwards;
    `;
    wrap.appendChild(outline);
    return outline;
}

// Creates and appends the animated green beam that sweeps top-to-bottom.
function _scanBeamCreateBeam(wrap, regionLeft, regionTop, regionWidth, beamH, durationMs) {
    const beam = document.createElement('div');
    beam.id = 'ability-scan-beam';
    beam.style.cssText = `
        position: absolute;
        left: ${regionLeft}px;
        width: ${regionWidth}px;
        height: ${beamH}px;
        top: ${regionTop}px;
        pointer-events: none;
        z-index: 310;
        background: linear-gradient(180deg,
            rgba(74,222,128,0) 0%,
            rgba(74,222,128,0.18) 25%,
            rgba(74,222,128,0.55) 60%,
            rgba(150,255,200,1) 75%,
            rgba(200,255,230,0.9) 82%,
            rgba(74,222,128,0.15) 95%,
            rgba(74,222,128,0) 100%
        );
        box-shadow: 0 2px 18px 3px rgba(74,222,128,0.5), 0 0 6px 1px rgba(200,255,230,0.7);
        animation: scan-beam-move-dynamic ${durationMs}ms linear forwards;
    `;
    wrap.appendChild(beam);
    return beam;
}

// Creates and appends the countdown bar at the bottom of the scan region.
function _scanBeamCreateCountdownBar(wrap, regionLeft, regionBottom, regionWidth, durationMs) {
    const bar = document.createElement('div');
    bar.id = 'ability-scan-bar';
    bar.style.cssText = `
        position: absolute;
        left: ${regionLeft}px;
        top: ${regionBottom - 3}px;
        width: ${regionWidth}px;
        height: 3px;
        pointer-events: none;
        z-index: 312;
        background: linear-gradient(90deg, rgba(74,222,128,0.9), rgba(150,255,200,0.6));
        transform-origin: left center;
        box-shadow: 0 0 6px 1px rgba(74,222,128,0.6);
        animation: scan-bar-deplete ${durationMs}ms linear forwards;
        animation-delay: 200ms;
    `;
    wrap.appendChild(bar);
    return bar;
}

// Schedules a brief cell flash on each row of the scan region as the beam passes over it.
function _scanBeamScheduleRowFlashes(startRow, endRow, startCol, endCol, durationMs) {
    const rowCount = endRow - startRow + 1;
    for (let ri = 0; ri < rowCount; ri++) {
        const r = startRow + ri;
        const rowFraction = ri / Math.max(rowCount - 1, 1);
        const delay = rowFraction * (durationMs * 0.88);

        setTimeout(() => {
            for (let c = startCol; c <= endCol; c++) {
                const el = document.getElementById(`g-${r}-${c}`);
                if (!el) continue;
                const flashEl = document.createElement('div');
                flashEl.style.cssText = `
                    position: absolute; inset: 0; pointer-events: none;
                    z-index: 311; animation: scan-cell-flash 0.45s ease-out forwards;
                `;
                el.style.position = 'relative';
                el.appendChild(flashEl);
                setTimeout(() => flashEl.remove(), 480);
            }
        }, delay);
    }
}



// Module state for the live Field Scan boundary preview shown while armed.
let _fieldScanPreviewEl = null;
let _fieldScanPreviewKey = null; // last-rendered region, to skip redundant rebuilds

// _fieldScanGetEffectiveSizeForPreview — returns the current effective scan
// size (after passive bonuses) for whatever rank Field Scan is at. Kept
// separate from _fieldScanComputeEffectiveParams since the preview doesn't
// have a durationMs value yet (the ability hasn't fired).
function _fieldScanGetEffectiveSizeForPreview() {
    const def = CLASS_DEFS?.probabilist;
    if (!def) return 3;
    const level = STATE.classActive2Level || 1;
    const actData = def.active2.levels[level - 1];
    if (!actData) return 3;
    return _fieldScanComputeEffectiveParams(actData.effect.scanSize, actData.effect.scanDuration).effectiveSize;
}

// _fieldScanGetHoveredCell — resolves which grid cell is under the given
// viewport coordinates, or null if the cursor isn't over the grid at all.
function _fieldScanGetHoveredCell(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    const cellEl = el?.closest('[id^="g-"]');
    if (!cellEl) return null;
    const m = cellEl.id.match(/^g-(\d+)-(\d+)$/);
    if (!m) return null;
    return { r: parseInt(m[1], 10), c: parseInt(m[2], 10) };
}

// _fieldScanBuildPreviewEl — creates the dashed preview outline once and
// appends it to #puzzle-scaler. Reused across hover updates rather than
// recreated every mousemove.
function _fieldScanBuildPreviewEl(wrap) {
    if (_fieldScanPreviewEl) return _fieldScanPreviewEl;
    const el = document.createElement('div');
    el.id = 'fs-scan-preview-outline';
    el.className = 'fs-scan-preview-outline';
    wrap.appendChild(el);
    _fieldScanPreviewEl = el;
    return el;
}

// _fieldScanUpdatePreview — called on every mousemove while any ability is
// armed (see targeting-reticle.js). No-ops unless Field Scan specifically
// is the one armed. Moves/resizes the dashed rectangle to match whichever
// NxN region is currently centred under the cursor, using the exact same
// clamping logic _executeFieldScan itself uses (_fieldScanComputeOrigin),
// so the preview always matches what will actually be scanned.
function _fieldScanUpdatePreview(clientX, clientY) {
    const isArmed = activeAbilityMode
        && STATE.playerClass === 'probabilist'
        && STATE.classActiveChoice === 'active2';

    if (!isArmed || !cur) { _fieldScanClearPreview(); return; }

    const hovered = _fieldScanGetHoveredCell(clientX, clientY);
    if (!hovered) { _fieldScanClearPreview(); return; }

    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const scanSize = _fieldScanGetEffectiveSizeForPreview();
    const { startRow, startCol } = _fieldScanComputeOrigin(hovered.r, hovered.c, scanSize, rows, cols);

    const key = `${startRow}-${startCol}-${scanSize}`;
    if (key === _fieldScanPreviewKey) return; // region unchanged since last move — skip rebuild
    _fieldScanPreviewKey = key;

    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return;
    if (!wrap.style.position || wrap.style.position === 'static') wrap.style.position = 'relative';

    const bounds = _scanBeamBuildRegionBounds(startRow, startCol, scanSize, wrap);
    if (!bounds) { _fieldScanClearPreview(); return; }

    const el = _fieldScanBuildPreviewEl(wrap);
    el.style.left = `${bounds.regionLeft}px`;
    el.style.top = `${bounds.regionTop}px`;
    el.style.width = `${bounds.regionWidth}px`;
    el.style.height = `${bounds.regionHeight}px`;
}

// _fieldScanClearPreview — removes the live preview outline. Called when
// Field Scan is disarmed (cancelled, executed, or the player switches to a
// different ability/slot) and whenever the cursor leaves the grid while armed.
function _fieldScanClearPreview() {
    _fieldScanPreviewKey = null;
    if (_fieldScanPreviewEl) {
        _fieldScanPreviewEl.remove();
        _fieldScanPreviewEl = null;
    }
}





// Plays the full Field Scan visual effect:
// a sweeping green beam across the scan region with a border outline, countdown bar,
// per-row cell flashes, and a clean fade-out at the end.
function _playScanBeamEffect(startRow, startCol, scanSize, durationMs) {
    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return;

    if (!wrap.style.position || wrap.style.position === 'static') wrap.style.position = 'relative';

    _scanBeamCleanupPreviousCast();

    const bounds = _scanBeamBuildRegionBounds(startRow, startCol, scanSize, wrap);
    if (!bounds) return;

    const { regionTop, regionLeft, regionBottom, regionWidth, regionHeight } = bounds;
    const rows = cur?.grid?.length || 99;
    const endRow = Math.min(startRow + scanSize - 1, rows - 1);
    const endCol = Math.min(startCol + scanSize - 1, (cur?.grid?.[0]?.length || 99) - 1);
    const beamH = 28;

    const styleTag = _scanBeamInjectKeyframes(durationMs, regionTop, regionHeight, beamH);
    const outline = _scanBeamCreateOutline(wrap, regionLeft, regionTop, regionWidth, regionHeight);
    const beam = _scanBeamCreateBeam(wrap, regionLeft, regionTop, regionWidth, beamH, durationMs);
    const bar = _scanBeamCreateCountdownBar(wrap, regionLeft, regionBottom, regionWidth, durationMs);

    _scanBeamScheduleRowFlashes(startRow, endRow, startCol, endCol, durationMs);

    // Clean up beam and bar, fade out outline
    setTimeout(() => {
        beam.remove();
        bar.remove();
        outline.style.animation = 'scan-outline-fade 0.5s ease-out forwards';
        setTimeout(() => { outline.remove(); styleTag.remove(); }, 550);
    }, durationMs + 100);
}


// Field Scan charge bolt: sprite → timer
const FIELD_SCAN_CHARGE_SPEED_PX_S = 260;
const FIELD_SCAN_CHARGE_MIN_DURATION_S = 0.5;
const FIELD_SCAN_CHARGE_MAX_DURATION_S = 1.1;
const FIELD_SCAN_CHARGE_TRAIL_INTERVAL_MS = 40;

// Field Scan drop-arrows: timer → each target cell
const FIELD_SCAN_DROP_SPEED_PX_S = 700;
const FIELD_SCAN_DROP_MIN_DURATION_S = 0.35;
const FIELD_SCAN_DROP_MAX_DURATION_S = 0.65;

// _fieldScanGetTimerPos — returns the on-screen centre of the level timer
// element, used as the "split point" for the rain-down VFX. Falls back to
// top-centre of the viewport if the timer can't be found.
function _fieldScanGetTimerPos() {
    const el = document.getElementById('timer-val');
    if (el) {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return { x: window.innerWidth / 2, y: 60 };
}

// _fieldScanPlayTargetedVFX — full sequence: charge bolt sprite → timer,
// split into one drop-arrow per target cell, rain down, then (once every
// arrow has landed) the existing beam-sweep effect fires.
function _fieldScanPlayTargetedVFX(targets, sol, startRow, startCol, scanSize, durationMs) {
    const timerPos = _fieldScanGetTimerPos();
    const origin = _pmGetSpriteOrigin(); // shared sprite-origin helper, added for Precision Mark

    _fieldScanFireChargeArrow(origin.x, origin.y, timerPos.x, timerPos.y, () => {
        _fieldScanSplitAndRain(targets, sol, timerPos, startRow, startCol, scanSize, durationMs);
    });
}

// _fieldScanFireChargeArrow — animates the charge bolt flying from the
// player sprite to the timer. Visually distinct from Precision Mark's
// charged arrow: a dashed "data bolt" with a square-pixel trail instead of
// a solid arrowhead with a round comet trail.
function _fieldScanFireChargeArrow(sx, sy, tx, ty, onArrival) {
    const dx = tx - sx, dy = ty - sy;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const duration = Math.min(
        Math.max(dist / FIELD_SCAN_CHARGE_SPEED_PX_S, FIELD_SCAN_CHARGE_MIN_DURATION_S),
        FIELD_SCAN_CHARGE_MAX_DURATION_S
    );

    const bolt = document.createElement('div');
    bolt.className = 'fs-charge-bolt';
    bolt.textContent = '⇢';
    bolt.style.cssText = `
        left: ${sx}px;
        top: ${sy}px;
        transform: translate(-50%, -50%) rotate(${angle}deg);
        transition: left ${duration}s linear, top ${duration}s linear;
    `;
    document.body.appendChild(bolt);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        bolt.style.left = `${tx}px`;
        bolt.style.top = `${ty}px`;
    }));

    const trailInterval = setInterval(
        () => _fieldScanChargeTrailTick(bolt),
        FIELD_SCAN_CHARGE_TRAIL_INTERVAL_MS
    );

    setTimeout(() => {
        clearInterval(trailInterval);
        bolt.remove();
        _fieldScanPlaySplitBurst(tx, ty);
        if (onArrival) onArrival();
    }, duration * 1000 + 30);
}

// _fieldScanChargeTrailTick — spawns one fading square "data pixel" behind
// the charge bolt while it's in flight.
function _fieldScanChargeTrailTick(boltEl) {
    const rect = boltEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const px = document.createElement('div');
    px.className = 'fs-charge-trail';
    px.style.cssText = `left: ${cx}px; top: ${cy}px;`;
    document.body.appendChild(px);
    setTimeout(() => px.remove(), 420);
}

// _fieldScanPlaySplitBurst — brief radial burst at the timer when the
// charge bolt arrives and splits into the rain-down arrows.
function _fieldScanPlaySplitBurst(x, y) {
    const burst = document.createElement('div');
    burst.className = 'fs-split-burst';
    burst.style.cssText = `left: ${x}px; top: ${y}px;`;
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 500);

    Audio_Manager.playSFX('fieldScan');
}

// _fieldScanSplitAndRain — fires one drop-arrow per target cell, all
// originating from the timer position. Staggered (with a little jitter)
// for a natural "rain" feel. Once every drop-arrow has landed, the existing
// beam-sweep scan effect plays and the restore timer is scheduled.
function _fieldScanSplitAndRain(targets, sol, timerPos, startRow, startCol, scanSize, durationMs) {
    const scanned = [];
    const prevStates = [];
    let landed = 0;

    targets.forEach(({ r, c }, i) => {
        setTimeout(() => {
            const cellEl = document.getElementById(`g-${r}-${c}`);
            if (!cellEl) { landed++; return; }

            const rect = cellEl.getBoundingClientRect();
            const tx = rect.left + rect.width / 2;
            const ty = rect.top + rect.height / 2;

            _fieldScanFireDropArrow(timerPos.x, timerPos.y, tx, ty, () => {
                const el = _fieldScanCommitCell(r, c, sol);
                if (el) { scanned.push(el); prevStates.push({ r, c }); }

                landed++;
                if (landed === targets.length) {
                    _fieldScanFinishLanding(scanned, prevStates, sol, startRow, startCol, scanSize, durationMs);
                }
            });
        }, i * 45 + Math.random() * 30);
    });
}

// _fieldScanFireDropArrow — animates one small drop-arrow falling from the
// timer (sx, sy) onto a target cell (tx, ty), using an accelerating
// "gravity" ease so it reads as falling rather than flying flat. Calls
// onLand() the instant it touches down.
function _fieldScanFireDropArrow(sx, sy, tx, ty, onLand) {
    const dx = tx - sx, dy = ty - sy;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const duration = Math.min(
        Math.max(dist / FIELD_SCAN_DROP_SPEED_PX_S, FIELD_SCAN_DROP_MIN_DURATION_S),
        FIELD_SCAN_DROP_MAX_DURATION_S
    );

    const drop = document.createElement('div');
    drop.className = 'fs-drop-arrow';
    drop.textContent = '⌄';
    drop.style.cssText = `
        left: ${sx}px;
        top: ${sy}px;
        transform: translate(-50%, -50%) rotate(${angle}deg);
        transition: left ${duration}s cubic-bezier(0.55, 0.06, 0.68, 0.19),
                    top ${duration}s cubic-bezier(0.55, 0.06, 0.68, 0.19);
    `;
    document.body.appendChild(drop);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        drop.style.left = `${tx}px`;
        drop.style.top = `${ty}px`;
    }));

    setTimeout(() => {
        drop.remove();
        _fieldScanPlayLandPing(tx, ty);
        if (onLand) onLand();
    }, duration * 1000 + 20);
}

// _fieldScanPlayLandPing — tiny flash where a drop-arrow lands.
function _fieldScanPlayLandPing(x, y) {
    const ping = document.createElement('div');
    ping.className = 'fs-land-ping';
    ping.style.cssText = `left: ${x}px; top: ${y}px;`;
    document.body.appendChild(ping);
    setTimeout(() => ping.remove(), 380);
}

// _fieldScanFinishLanding — runs once every drop-arrow has landed: plays the
// existing beam-sweep VFX, shows the toast/achievement, and schedules the
// restore exactly as the old (instant) version did — just delayed until the
// rain-down has actually finished.
function _fieldScanFinishLanding(scanned, prevStates, sol, startRow, startCol, scanSize, durationMs) {
    _playScanBeamEffect(startRow, startCol, scanSize, durationMs);
    showToast(`🎯 Field Scan!`);
    _fieldScanCheckBigScanAchievement(prevStates, sol);

    setTimeout(() => _fieldScanRestore(scanned, prevStates), durationMs);
}



//------------------------------------------------------------------------
//----------------LEGACY SCAN BEAM (kept for reference)-------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Old simpler scan beam — a single glowing band that sweeps top-to-bottom.
// Kept here in case it is useful for other scan-like effects in the future.

/*
function _playScanBeamEffect_legacy(startRow, startCol, scanSize, durationMs) {
    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return;

    const prevPosition = wrap.style.position;
    if (!prevPosition || prevPosition === 'static') wrap.style.position = 'relative';

    const rows = cur?.grid?.length || 99;
    const endRow = Math.min(startRow + scanSize - 1, rows - 1);

    const topCellEl = document.getElementById(`g-${startRow}-${startCol}`);
    const botCellEl = document.getElementById(`g-${endRow}-${startCol}`);
    if (!topCellEl || !botCellEl) return;

    const wrapRect = wrap.getBoundingClientRect();
    const topRect  = topCellEl.getBoundingClientRect();
    const botRect  = botCellEl.getBoundingClientRect();
    const zoom     = currentZoom || 1;

    const regionTop    = (topRect.top    - wrapRect.top) / zoom;
    const regionBottom = (botRect.bottom - wrapRect.top) / zoom;
    const regionHeight = regionBottom - regionTop;
    const beamH        = 40;

    document.getElementById('ability-scan-beam')?.remove();
    document.getElementById('scan-beam-style')?.remove();

    const styleTag = document.createElement('style');
    styleTag.id    = 'scan-beam-style';
    styleTag.textContent = `
        @keyframes scan-beam-move-dynamic {
            0%   { opacity: 0;   top: ${regionTop}px; }
            6%   { opacity: 1; }
            94%  { opacity: 1; }
            100% { opacity: 0;   top: ${regionTop + Math.max(0, regionHeight - beamH)}px; }
        }
    `;
    document.head.appendChild(styleTag);

    const beam = document.createElement('div');
    beam.id    = 'ability-scan-beam';
    beam.style.cssText = `
        position: absolute;
        left: 0; right: 0;
        height: ${beamH}px;
        top: ${regionTop}px;
        pointer-events: none;
        z-index: 308;
        background: linear-gradient(180deg,
            rgba(39,174,96,0) 0%,
            rgba(39,174,96,0.55) 40%,
            rgba(150,255,200,0.85) 50%,
            rgba(39,174,96,0.55) 60%,
            rgba(39,174,96,0) 100%
        );
        box-shadow: 0 0 24px 6px rgba(39,174,96,0.4);
        animation: scan-beam-move-dynamic ${durationMs}ms linear forwards;
    `;

    wrap.appendChild(beam);
    setTimeout(() => { beam.remove(); styleTag.remove(); }, durationMs + 150);
}
*/


//------------------------------------------------------------------------
//--------------------BAYESIAN INSIGHT — VFX------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Spawns the given number of crossbow emojis spread evenly along the bottom
// of the screen. Returns an array of { el, x, y } objects.
function _bayesianInsightSpawnCrossbows(count) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const crossbows = [];

    for (let i = 0; i < count; i++) {
        const xPos = vw * (0.2 + (i / Math.max(count - 1, 1)) * 0.6);
        const yPos = vh - 32;

        const cb = document.createElement('div');
        cb.className = 'bayesian-crossbow';
        cb.textContent = '🏹';
        // Rotated -90° so the bow faces upward toward the grid
        cb.style.cssText = `
            left: ${xPos}px;
            top: ${yPos}px;
            transform: translate(-50%, -50%) rotate(-90deg);
            animation-delay: ${i * 60}ms;
        `;
        document.body.appendChild(cb);
        crossbows.push({ el: cb, x: xPos, y: yPos });
    }

    return crossbows;
}

// Finds the nearest crossbow to a given (cellX, cellY) screen position.
function _bayesianInsightFindNearestCrossbow(crossbows, cellX, cellY) {
    let nearest = crossbows[0], nearestDist = Infinity;
    crossbows.forEach(cb => {
        const d = Math.hypot(cb.x - cellX, cb.y - cellY);
        if (d < nearestDist) { nearestDist = d; nearest = cb; }
    });
    return nearest;
}

// Draws a chain line from (cellX, cellY) toward a crossbow at (cbX, cbY).
function _bayesianInsightDrawChain(cellX, cellY, cbX, cbY, duration) {
    const dx = cbX - cellX;
    const dy = cbY - cellY;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const chain = document.createElement('div');
    chain.className = 'bi-chain';
    chain.style.cssText = `
        left: ${cellX}px;
        top: ${cellY}px;
        width: ${dist}px;
        transform: rotate(${angle}deg);
        animation-duration: ${duration + 0.2}s;
    `;
    document.body.appendChild(chain);
    setTimeout(() => chain.remove(), (duration + 0.25) * 1000);
}

// Spawns an X mark at the cell and animates it flying toward the crossbow.
// On arrival, removes itself and plays the impact effect.
function _bayesianInsightFireXMark(cellX, cellY, cbX, cbY, duration) {
    const xMark = document.createElement('div');
    xMark.className = 'bi-x-mark';
    xMark.textContent = '✕';
    xMark.style.cssText = `
        left: ${cellX}px;
        top: ${cellY}px;
        transition: left ${duration}s linear, top ${duration}s linear;
        animation-duration: ${duration + 0.15}s;
        will-change: left, top;
    `;
    document.body.appendChild(xMark);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        xMark.style.left = `${cbX}px`;
        xMark.style.top = `${cbY}px`;
    }));

    setTimeout(() => {
        xMark.remove();
        _playBayesianImpact(cbX, cbY);
    }, duration * 1000 + 30);
}

// Fires the full chain-pull animation: draws the chain, then flies the X mark
// from the cell position to the crossbow position.
function _fireBayesianChainPull(cellX, cellY, cbX, cbY) {
    const dist = Math.hypot(cbX - cellX, cbY - cellY);
    const duration = Math.min(Math.max(dist / 180, 0.45), 1.4);

    _bayesianInsightDrawChain(cellX, cellY, cbX, cbY, duration);
    _bayesianInsightFireXMark(cellX, cellY, cbX, cbY, duration);
}

// Plays a purple ripple ring where the X mark arrives at the crossbow.
function _playBayesianImpact(x, y) {
    const ring = document.createElement('div');
    ring.className = 'bi-impact';
    ring.style.cssText = `left: ${x}px; top: ${y}px;`;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 480);
}

// Schedules the crossbow elements to disappear after all chain-pull animations finish.
function _bayesianInsightScheduleCrossbowRemoval(crossbows, cellCount) {
    const totalDur = 80 + cellCount * 55 + 900;
    setTimeout(() => {
        crossbows.forEach(cb => {
            cb.el.style.animation = 'crossbow-disappear 0.3s ease-in forwards';
            setTimeout(() => cb.el.remove(), 320);
        });
    }, totalDur);
}

// Plays the Bayesian Insight VFX: spawns crossbows along the bottom of the screen
// and fires chain-pull animations toward each auto-marked cell.
function _playBayesianInsightAnimation(markedCellIds) {
    if (!markedCellIds || !markedCellIds.length) return;

    const crossbowCount = Math.min(3, markedCellIds.length);
    const crossbows = _bayesianInsightSpawnCrossbows(crossbowCount);

    markedCellIds.forEach((id, idx) => {
        const cellEl = document.getElementById(id);
        if (!cellEl) return;

        const rect = cellEl.getBoundingClientRect();
        const cellX = rect.left + rect.width / 2;
        const cellY = rect.top + rect.height / 2;
        const nearest = _bayesianInsightFindNearestCrossbow(crossbows, cellX, cellY);

        setTimeout(() => _fireBayesianChainPull(cellX, cellY, nearest.x, nearest.y), 80 + idx * 55);
    });

    _bayesianInsightScheduleCrossbowRemoval(crossbows, markedCellIds.length);
}


//------------------------------------------------------------------------
//---------------------BAYESIAN REVEAL — VFX------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Spawns a trail of small gold particles above the orb's starting position.
// Particles fade out before the orb lands.
function _bayesianRevealSpawnTrailParticles(sx, sy) {
    for (let i = 0; i < 5; i++) {
        const trail = document.createElement('div');
        const offsetX = (Math.random() - 0.5) * 10;
        const trailY = sy + i * 18;
        trail.style.cssText = `
            position: fixed;
            left: ${sx + offsetX}px;
            top: ${trailY}px;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 220, 80, 0.7);
            box-shadow: 0 0 6px 2px rgba(255, 200, 0, 0.5);
            z-index: 9199;
            pointer-events: none;
            animation: bi-reveal-trail ${0.4 + i * 0.06}s ease-out ${i * 0.04}s forwards;
        `;
        document.body.appendChild(trail);
        setTimeout(() => trail.remove(), 600);
    }
}

// Creates and animates a golden orb descending from above the viewport
// to the target cell position.
function _bayesianRevealDropOrb(sx, sy, tx, ty, duration) {
    const orb = document.createElement('div');
    orb.className = 'bi-reveal-orb';
    orb.style.cssText = `
        position: fixed;
        left: ${sx}px;
        top: ${sy}px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, #fff8c0 0%, #ffd700 45%, #f39c12 100%);
        box-shadow: 0 0 10px 4px rgba(255, 215, 0, 0.8), 0 0 22px 8px rgba(255, 165, 0, 0.4);
        z-index: 9200;
        pointer-events: none;
        transition: left ${duration}s cubic-bezier(0.4, 0, 0.6, 1),
                    top  ${duration}s cubic-bezier(0.4, 0, 1, 1);
        will-change: left, top;
    `;
    document.body.appendChild(orb);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        orb.style.left = `${tx}px`;
        orb.style.top = `${ty}px`;
    }));

    setTimeout(() => {
        orb.remove();
        _playBayesianRevealImpact(tx, ty);
    }, duration * 1000 + 30);
}

// Plays the Bayesian Reveal VFX: a golden orb drops from above the viewport
// and lands on the revealed cell, followed by a warm golden burst.
function _playBayesianRevealEffect(cellEl) {
    const rect = cellEl.getBoundingClientRect();
    const tx = rect.left + rect.width / 2;
    const ty = rect.top + rect.height / 2;
    const sx = tx;
    const sy = -32; // start above the visible viewport
    const duration = Math.min(Math.max(Math.abs(ty - sy) / 600, 0.35), 0.9);

    _bayesianRevealSpawnTrailParticles(sx, sy);
    _bayesianRevealDropOrb(sx, sy, tx, ty, duration);
}

// Injects a per-spark keyframe animation if it hasn't been added yet.
function _bayesianRevealInjectSparkKeyframe(index, rad, dist) {
    const styleId = `bi-reveal-spark-style-${index}`;
    if (document.getElementById(styleId)) return;

    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = `
        @keyframes bi-reveal-spark-${index} {
            0%   { opacity: 1; transform: translate(-50%,-50%) translate(0,0) scale(1); }
            100% { opacity: 0; transform: translate(-50%,-50%)
                   translate(${Math.cos(rad) * dist}px, ${Math.sin(rad) * dist}px) scale(0.3); }
        }
    `;
    document.head.appendChild(s);
}

// Spawns the six star sparks that radiate outward from the golden impact point.
function _bayesianRevealImpactSparks(x, y) {
    const angles = [0, 60, 120, 180, 240, 300];
    angles.forEach((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const dist = 22 + Math.random() * 12;

        _bayesianRevealInjectSparkKeyframe(i, rad, dist);

        const spark = document.createElement('div');
        spark.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            background: #ffd700;
            box-shadow: 0 0 5px 2px rgba(255, 200, 0, 0.7);
            z-index: 9202;
            pointer-events: none;
            animation: bi-reveal-spark-${i} 0.5s ease-out forwards;
        `;
        document.body.appendChild(spark);
        setTimeout(() => spark.remove(), 540);
    });
}

// Plays the warm golden burst impact when the reveal orb lands:
// an expanding ring, a radial flash, and six radiating sparks.
function _playBayesianRevealImpact(x, y) {
    // Expanding ring
    const ring = document.createElement('div');
    ring.className = 'bi-reveal-ring';
    ring.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 0;
        height: 0;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        z-index: 9201;
        pointer-events: none;
        animation: bi-reveal-ring-anim 0.6s ease-out forwards;
    `;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 640);

    // Warm radial flash
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, rgba(255,240,100,0.85) 0%, rgba(255,165,0,0.4) 45%, rgba(255,165,0,0) 70%);
        z-index: 9201;
        pointer-events: none;
        animation: bi-reveal-flash 0.45s ease-out forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 480);

    _bayesianRevealImpactSparks(x, y);
}