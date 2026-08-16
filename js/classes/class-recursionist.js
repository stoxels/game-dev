//------------------------------------------------------------------------
//--------------------ASCENDENCY SKILL IMPLEMENTATIONS-------------------
//----------------------------RECURSIONIST CLASS-------------------------
//------------------------------------------------------------------------
/*
    Handles all logic for the Recursionist class abilities:
      - Residual Totem: plants a totem that periodically reveals correct cells
      - Degrees of Freedom: lets the player correct mistake cells and recover time
//------------------------------------------------------------------------  
*/


//------------------------------------------------------------------------
// -------------------STATE & CONSTANTS------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Active totem instances: { id, row, col, radius, charges, fireIntervalSecs, timeout }
window._residualTotems = [];

// Active DoF selection session: { correctCount, recoverPct, picked: [], active: bool }
window._dofSession = null;

// Tracks cells that were reverted by Degrees of Freedom (used to skip cleanup in renderCell)
window._dofRevertedCells = new Set();


//------------------------------------------------------------------------
// -------------------SHARED HELPERS---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns all cells in the current grid that the player marked wrong
function _getMistakeCells() {
    if (!cur) return [];
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const cells = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (wrongGrid[r][c]) cells.push({ r, c });
    return cells;
}

// Returns the time penalty (in seconds) logged for cell (r, c) without removing it
function _getMistakePenalty(r, c) {
    if (!window._mistakeLog) return 0;
    const entry = window._mistakeLog.find(e => e.r === r && e.c === c);
    return entry ? entry.penaltySecs : 0;
}

// Returns the time penalty for cell (r, c) and removes the entry from the log
function _consumeMistakePenalty(r, c) {
    if (!window._mistakeLog) return 0;
    const idx = window._mistakeLog.findIndex(e => e.r === r && e.c === c);
    if (idx === -1) return 0;
    const pen = window._mistakeLog[idx].penaltySecs;
    window._mistakeLog.splice(idx, 1);
    return pen;
}

// Returns the mistake cell closest (Manhattan distance) to a given grid position
function _getNearestMistakeCell(row, col, mistakeCells) {
    let best = mistakeCells[0];
    let bestDist = Infinity;
    mistakeCells.forEach(({ r, c }) => {
        const dist = Math.abs(r - row) + Math.abs(c - col);
        if (dist < bestDist) { bestDist = dist; best = { r, c }; }
    });
    return best;
}


//------------------------------------------------------------------------
// -------------------RESIDUAL TOTEM: ENTRY POINT--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/*
    Called when the player activates the Residual Totem skill.
    Enforces the totem cap, then plants a new totem at the nearest
    mistake cell (or the clicked cell if no mistakes exist).
*/
function _executeResidual(row, col, effect) {

    // Check if the clicked cell is actually a marked mistake
    if (!wrongGrid[row][col]) {
        showToast('💀 Residual Totem can only be planted on a mistake cell!');
        _refundCooldown('active3'); // Assuming active3 is the slot for this skill
        return;
    }

    const { beamRadius, charges, fires, maxTotems = 1 } = effect;

    _enforceTotemCap(maxTotems);

    const spawnPos = _resolveTotemSpawnPosition(row, col);
    const totemId = _generateTotemId();

    _spawnResidualTotem(totemId, spawnPos.row, spawnPos.col, beamRadius, charges, fires);
    trackAchStat('skillResidualUsed');
}

// Removes the oldest totem if we are already at the totem cap
function _enforceTotemCap(maxTotems) {
    if (window._residualTotems.length >= maxTotems) {
        const oldest = window._residualTotems[0];
        if (oldest) _clearSpecificTotem(oldest.id);
    }
}

// Decides where to place the totem: nearest mistake cell, or the clicked cell
function _resolveTotemSpawnPosition(clickRow, clickCol) {
    const mistakes = _getMistakeCells();
    if (mistakes.length === 0) return { row: clickRow, col: clickCol };
    const nearest = _getNearestMistakeCell(clickRow, clickCol, mistakes);
    return { row: nearest.r, col: nearest.c };
}

// Generates a collision-safe unique ID string for a new totem
function _generateTotemId() {
    return `totem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}


//------------------------------------------------------------------------
// -------------------RESIDUAL TOTEM: LIFECYCLE----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/*
    Creates a totem, adds it to the DOM and the global list, then
    schedules its first shot after a 3-second delay.
*/
function _spawnResidualTotem(id, row, col, radius, charges, fireIntervalSecs) {
    _residualTotemAddDOM(id, row, col, charges);
    showToast(`💀 Residual Totem planted! ${charges} charges, fires in 3s then every ${fireIntervalSecs}s.`);
    Audio_Manager.playSFX('residualSummon');

    const totem = { id, row, col, radius, charges, fireIntervalSecs, timeout: null };
    window._residualTotems.push(totem);

    totem.timeout = setTimeout(() => _residualTotemShoot(id), 3000);
}

/*
    Fires one beam from the totem, decrements its charge counter,
    then either schedules the next shot or clears the totem when empty.
*/
function _residualTotemShoot(id) {
    const totem = _findTotemById(id);
    if (!totem) return;

    const fired = _residualTotemFireOne(totem.row, totem.col, totem.radius);
    totem.charges--;

    _residualTotemUpdateDOM(totem.id, totem.row, totem.col, totem.charges);
    _showTotemShotToast(fired, totem.charges);

    if (totem.charges <= 0) {
        _clearSpecificTotem(id);
        return;
    }

    totem.timeout = setTimeout(() => _residualTotemShoot(id), totem.fireIntervalSecs * 1000);
}

// Returns the totem object with the given id, or undefined if not found
function _findTotemById(id) {
    return window._residualTotems.find(t => t.id === id);
}

// Displays the appropriate toast after a totem shot
function _showTotemShotToast(fired, chargesLeft) {
    const chargeLabel = `(${chargesLeft} charge${chargesLeft !== 1 ? 's' : ''} left)`;
    if (fired) {
        showToast(`💀 Residual Beam! 1 cell revealed. ${chargeLabel}`);
    } else {
        showToast(`💀 Residual Beam! No cells in range. ${chargeLabel}`);
    }
}

/*
    Removes a specific totem: cancels its scheduled shot, strips DOM
    elements, and removes it from the global list.
*/
function _clearSpecificTotem(id) {
    const idx = window._residualTotems.findIndex(t => t.id === id);
    if (idx === -1) return;

    const { row, col, timeout } = window._residualTotems[idx];
    if (timeout) clearTimeout(timeout);

    _residualTotemRemoveDOM(id, row, col);
    renderCell(row, col);
    Audio_Manager.playSFX('residualDespawn');

    window._residualTotems.splice(idx, 1);
}

// Removes all active totems (e.g. on level reset)
function _clearAllResidualTotems() {
    if (!window._residualTotems || window._residualTotems.length === 0) return;
    for (let i = window._residualTotems.length - 1; i >= 0; i--) {
        _clearSpecificTotem(window._residualTotems[i].id);
    }
    window._residualTotems = [];
}


//------------------------------------------------------------------------
// -------------------RESIDUAL TOTEM: BEAM LOGIC---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/*
    Finds the closest unrevealed correct cell within beam radius and
    reveals exactly one of them. Returns true if a cell was found.
*/
function _residualTotemFireOne(row, col, radius) {
    if (!cur) return false;

    const target = _findNearestRevealableCell(row, col, radius);
    if (!target) return false;

    _residualDrawBeam(row, col, target.r, target.c, () => {
        _revealCellFromTotem(target.r, target.c);
    });

    return true;
}

// Scans the radius around (row, col) and returns the closest unrevealed correct cell
function _findNearestRevealableCell(row, col, radius) {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const candidates = [];

    for (let r = Math.max(0, row - radius); r <= Math.min(rows - 1, row + radius); r++) {
        for (let c = Math.max(0, col - radius); c <= Math.min(cols - 1, col + radius); c++) {
            if (r === row && c === col) continue;
            if (sol[r][c] === 1 && !revealedGrid[r][c] && userGrid[r][c] !== 1) {
                candidates.push({ r, c, dist: Math.abs(r - row) + Math.abs(c - col) });
            }
        }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.dist - b.dist);
    return candidates[0];
}

// Applies the reveal to a cell and fires all relevant side-effects
function _revealCellFromTotem(r, c) {
    revealedGrid[r][c] = true;
    userGrid[r][c] = 1;
    renderCell(r, c);
    updClues(r, c);
    trackAchStat('tilesRevealed', 1);
    trackAchStat('residualBeamsFired');
    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
    questStat_classRevealUsed(1);
    updateQuestStats('classAbilityUsedThisLevel', {});
    checkWin();
}

/*
    Draws an SVG beam line from the totem cell to the target cell,
    plays the reveal sound, then fades the beam out and calls onComplete.
*/
function _residualDrawBeam(fromRow, fromCol, toRow, toCol, onComplete) {
    Audio_Manager.playSFX('residualReveal');

    const fromEl = document.getElementById(`g-${fromRow}-${fromCol}`);
    const toEl = document.getElementById(`g-${toRow}-${toCol}`);
    if (!fromEl || !toEl) { onComplete(); return; }

    const beamSvg = _buildBeamSvg(fromEl, toEl);
    document.body.appendChild(beamSvg);

    // Reveal cell after travel delay, then fade the beam
    setTimeout(() => {
        onComplete();
        setTimeout(() => _fadeOutElement(beamSvg, 0.04, 0.07), 650);
    }, 350);
}

// Builds and returns a positioned SVG element containing the beam line
function _buildBeamSvg(fromEl, toEl) {
    const fr = fromEl.getBoundingClientRect();
    const tr = toEl.getBoundingClientRect();

    const x1 = fr.left + fr.width / 2;
    const y1 = fr.top + fr.height / 2;
    const x2 = tr.left + tr.width / 2;
    const y2 = tr.top + tr.height / 2;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 100vw; height: 100vh;
        pointer-events: none; z-index: 9000; overflow: visible;
    `;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#bb8fce');
    line.setAttribute('stroke-width', '30');
    line.setAttribute('stroke-linecap', 'round');
    line.style.filter = 'drop-shadow(0 0 4px #8e44ad)';

    svg.appendChild(line);
    return svg;
}

// Fades an element out by decrementing its opacity each frame, then removes it
function _fadeOutElement(el, startOpacity, step) {
    let opacity = startOpacity;
    const fade = () => {
        opacity -= step;
        el.style.opacity = opacity;
        if (opacity > 0) requestAnimationFrame(fade);
        else el.remove();
    };
    requestAnimationFrame(fade);
}


//------------------------------------------------------------------------
// -------------------RESIDUAL TOTEM: DOM MANAGEMENT-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Adds the skull icon + charge badge overlay to the totem's grid cell
function _residualTotemAddDOM(id, row, col, charges) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;

    el.classList.add('residual-totem');

    const marker = document.createElement('span');
    marker.className = 'residual-totem-icon';
    marker.id = `residual-totem-marker-${id}`;
    marker.textContent = '💀';

    const badge = document.createElement('span');
    badge.className = 'residual-totem-badge';
    badge.id = `residual-totem-badge-${id}`;
    badge.textContent = charges;
    marker.appendChild(badge);

    el.appendChild(marker);
}

// Updates the charge badge number shown on the totem cell
function _residualTotemUpdateDOM(id, row, col, charges) {
    const badge = document.getElementById(`residual-totem-badge-${id}`);
    if (badge) badge.textContent = charges;

    const el = document.getElementById(`g-${row}-${col}`);
    if (el) el.setAttribute('title', `💀 Residual Totem (${charges} charges)`);
}

// Strips the totem overlay from the cell — only removes the class if no
// other totems share the same cell (edge case with overlapping placements)
function _residualTotemRemoveDOM(id, row, col) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;

    const otherTotemsOnCell = window._residualTotems.filter(
        t => t.row === row && t.col === col && t.id !== id
    );
    if (otherTotemsOnCell.length === 0) {
        el.classList.remove('residual-totem');
        el.removeAttribute('title');
    }

    const marker = document.getElementById(`residual-totem-marker-${id}`);
    if (marker) marker.remove();
}


//------------------------------------------------------------------------
// -------------------DEGREES OF FREEDOM: ENTRY POINT---------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/*
    Called when the player activates Degrees of Freedom.
    If no mistake cells exist the cooldown is immediately refunded.
    Otherwise, mistake cells are highlighted and the player is prompted
    to click up to correctCount of them.
*/
function _executeDegreesOfFreedom(row, col, effect) {
    const { correctCount, recoverPct } = effect;

    const mistakes = _getMistakeCells();
    if (mistakes.length === 0) {
        showToast('💀 No mistake cells to correct!');
        _refundCooldown('active4');
        return;
    }

    window._dofSession = { correctCount, recoverPct, picked: [] };

    _dofHighlightMistakeCells(mistakes);
    _dofShowSelectionToast(correctCount);
    _dofRegisterEscapeListener();
}

// Immediately resets a cooldown slot so the player is not penalised
function _refundCooldown(slotKey) {
    const cd = cooldownState[slotKey];
    if (cd.interval) { clearInterval(cd.interval); cd.interval = null; }
    cd.remaining = 0;
    buildClassHUD();
}

// Adds pick-target highlights and penalty badges to all mistake cells
function _dofHighlightMistakeCells(mistakes) {
    mistakes.forEach(({ r, c }) => {
        const el = document.getElementById(`g-${r}-${c}`);
        if (!el) return;

        el.classList.add('dof-pick-target');

        const pen = _getMistakePenalty(r, c);
        const badge = document.createElement('span');
        badge.className = 'dof-penalty-badge';
        badge.id = `dof-badge-${r}-${c}`;
        badge.textContent = pen > 0 ? `${pen}s` : '0s';
        el.appendChild(badge);
    });
}

// Shows the initial instruction toast for Degrees of Freedom
function _dofShowSelectionToast(correctCount) {
    const maxStr = correctCount === 1 ? '1 mistake cell' : `up to ${correctCount} mistake cells`;
    showToast(`💀 Degrees of Freedom — click ${maxStr} to correct. Esc to cancel.`);
}

// Registers the Escape key listener that cancels the selection session
function _dofRegisterEscapeListener() {
    window._dofEscListener = (e) => {
        if (e.key === 'Escape') _cancelDegreesOfFreedom(false);
    };
    document.addEventListener('keydown', window._dofEscListener);
}


//------------------------------------------------------------------------
// -------------------DEGREES OF FREEDOM: CLICK HANDLER-------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/*
    Intercepts grid clicks while a DoF session is active.
    Returns true if the click was consumed (caller should return early).
*/
function _dofHandleClick(row, col) {
    if (!window._dofSession) return false;

    const session = window._dofSession;

    // Only mistake cells that haven't been picked yet are valid targets
    if (!wrongGrid[row][col]) return false;
    if (session.picked.find(p => p.r === row && p.c === col)) return true;

    _dofSelectCell(row, col, session);
    trackAchStat('skillDoFUsed');
    questStat_mistakesRemoved(1);

    if (session.picked.length >= session.correctCount) {
        _confirmDegreesOfFreedom();
    }

    return true;
}

// Marks a cell as selected in the session and updates its visual state
function _dofSelectCell(row, col, session) {
    session.picked.push({ r: row, c: col });

    const el = document.getElementById(`g-${row}-${col}`);
    if (el) {
        el.classList.remove('dof-pick-target');
        el.classList.add('dof-pick-selected');
    }

    const remaining = session.correctCount - session.picked.length;
    if (remaining > 0) {
        showToast(`💀 Selected ${session.picked.length}/${session.correctCount}. Click ${remaining} more — or Esc to cancel.`);
    }
}


//------------------------------------------------------------------------
// -------------------DEGREES OF FREEDOM: CONFIRMATION--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/*
    Confirms the current DoF selection: consumes mistake penalties,
    calculates time recovery, plays the fire animation on each cell,
    then resets cells to empty after the animation finishes.
*/
function _confirmDegreesOfFreedom() {
    if (!window._dofSession) return;
    const { picked, recoverPct } = window._dofSession;

    _cleanupDofSession();

    if (picked.length === 0) {
        showToast('💀 No cells selected.');
        return;
    }

    const pickedData = _buildPickedData(picked, recoverPct);
    const totalRecovered = pickedData.reduce((sum, p) => sum + p.recovered, 0);
    const recoverPctLabel = Math.round(recoverPct * 100);

    _applyTimeRecovery(totalRecovered);
    _dofPlayFireAnimations(pickedData);

    Audio_Manager.playSFX('arcaneReveal');
    Audio_Manager.playSFX('dofBurn');

    showToast(`💀 Degrees of Freedom! ${picked.length} cell(s) corrected. +${totalRecovered}s recovered (${recoverPctLabel}%).`);

    if (totalRecovered >= 300) trackAchStat('doftimerecovered');

    setTimeout(() => {
        if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
        checkWin();
        buildClassHUD();
    }, FIRE_DURATION_MS + 100);
}

// How long (ms) the fire animation burns before the cell changes state
const FIRE_DURATION_MS = 3200;

// Consumes penalties for each picked cell and calculates individual recovery amounts
function _buildPickedData(picked, recoverPct) {
    return picked.map(({ r, c }) => {
        const pen = _consumeMistakePenalty(r, c);
        const recovered = Math.round(pen * recoverPct);
        return { r, c, recovered };
    });
}

// Adds recovered seconds to the game timer (capped at 3600s)
function _applyTimeRecovery(totalRecovered) {
    if (totalRecovered <= 0) return;
    timerSecs = Math.min(timerSecs + totalRecovered, 3600);
    updTimer();
}

// Starts the fire animation on each picked cell; resets the cell after the animation ends
function _dofPlayFireAnimations(pickedData) {
    pickedData.forEach(({ r, c }) => {
        _dofSpawnFire(r, c, FIRE_DURATION_MS, () => {
            wrongGrid[r][c] = false;
            userGrid[r][c] = 0;
            _applyDofRevertedStyle(r, c);
        });
    });
}

// Cancels the DoF session and optionally refunds the cooldown
function _cancelDegreesOfFreedom(silent) {
    _cleanupDofSession();
    if (!silent) {
        showToast('💀 Degrees of Freedom cancelled.');
        _refundCooldown('active4');
    }
}

// Strips all DoF highlight classes/badges and removes the escape listener
function _cleanupDofSession() {
    document.querySelectorAll('.dof-pick-target, .dof-pick-selected').forEach(el => {
        el.classList.remove('dof-pick-target', 'dof-pick-selected');
    });
    document.querySelectorAll('[id^="dof-badge-"]').forEach(el => el.remove());

    if (window._dofEscListener) {
        document.removeEventListener('keydown', window._dofEscListener);
        window._dofEscListener = null;
    }
    window._dofSession = null;
}

// Applies a faint purple "reverted" overlay to a cell after DoF clears it.
// renderCell() will remove this class when the player refills the cell.
function _applyDofRevertedStyle(r, c) {
    renderCell(r, c); // reset to clean visual state first

    const el = document.getElementById(`g-${r}-${c}`);
    if (!el) return;

    el.classList.add('dof-reverted');
    window._dofRevertedCells.add(`${r}-${c}`);
}


//------------------------------------------------------------------------
// -------------------DEGREES OF FREEDOM: FIRE ANIMATION------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/*
    Spawns a purple flame animation over a grid cell for durationMs,
    then calls onComplete when the animation ends.

    Structure:
      - An absolutely-positioned container div is placed over the cell
      - Inside: one SVG with a filter-warped flame shape (outer, inner, core)
        and a floating ember particle system
*/
function _dofSpawnFire(row, col, durationMs, onComplete) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) { onComplete(); return; }

    const rect = el.getBoundingClientRect();
    const container = _buildFireContainer(rect);
    const { svg, turb } = _buildFlameSvg(rect, row, col);
    const embers = _buildEmbers(container, rect.width * 2, rect.height * 3.6);

    container.appendChild(svg);
    document.body.appendChild(container);

    _animateFire(container, svg, turb, embers, rect.width * 2, rect.height * 3.6, durationMs, onComplete);
}

// Creates and positions the fixed container div that holds the flame
function _buildFireContainer(rect) {
    const cellSize = rect.width;
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        left: ${rect.left - cellSize * 0.5}px;
        top:  ${rect.top - cellSize * 2.5}px;
        width:  ${rect.width * 2}px;
        height: ${rect.height * 3.6}px;
        pointer-events: none;
        z-index: 8000;
        overflow: visible;
    `;
    return container;
}

// Builds the SVG element containing all flame paths and their filters/gradients
function _buildFlameSvg(rect, row, col) {
    const W = rect.width * 2;
    const H = rect.height * 3.6;
    const svgNS = 'http://www.w3.org/2000/svg';

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.cssText = `
        position: absolute; inset: 0;
        width: 100%; height: 100%; overflow: visible;
    `;

    const { defs, turb } = _buildFlameDefsAndFilters(svgNS, W, H, row, col);
    svg.appendChild(defs);

    // Four nested flame shapes from outermost to hottest core
    svg.appendChild(_makeFlame(svgNS, W, H, 1.1, 0.92, 2, `fg-outer-${row}-${col}`, 0.55, 'flame-glow'));
    svg.appendChild(_makeFlame(svgNS, W, H, 1.0, 0.88, 0, `fg-outer-${row}-${col}`, 0.92, 'flame-warp'));
    svg.appendChild(_makeFlame(svgNS, W, H, 0.65, 0.72, H * 0.08, `fg-inner-${row}-${col}`, 0.88, 'flame-warp'));
    svg.appendChild(_makeFlame(svgNS, W, H, 0.32, 0.58, H * 0.14, `fg-core-${row}-${col}`, 0.80, 'flame-warp'));

    return { svg, turb };
}

// Builds the <defs> block: warp filter, glow filter, and three gradient fills
function _buildFlameDefsAndFilters(svgNS, W, H, row, col) {
    const defs = document.createElementNS(svgNS, 'defs');

    // Turbulence displacement filter — makes flame edges ripple organically
    const { filter: warpFilter, turb } = _buildWarpFilter(svgNS, row, col);
    const glowFilter = _buildGlowFilter(svgNS);

    defs.appendChild(warpFilter);
    defs.appendChild(glowFilter);
    defs.appendChild(_makeLinearGradient(svgNS, `fg-outer-${row}-${col}`, [
        ['0%', '#2d004d', 1],
        ['30%', '#6b0fa0', 1],
        ['60%', '#a020d0', 1],
        ['85%', '#cc66ff', 0.85],
        ['100%', '#f0c0ff', 0],
    ]));
    defs.appendChild(_makeLinearGradient(svgNS, `fg-inner-${row}-${col}`, [
        ['0%', '#4a0070', 1],
        ['40%', '#9b34cc', 1],
        ['75%', '#e080ff', 0.9],
        ['100%', '#ffffff', 0],
    ]));
    defs.appendChild(_makeLinearGradient(svgNS, `fg-core-${row}-${col}`, [
        ['0%', '#7700bb', 1],
        ['50%', '#dd88ff', 1],
        ['100%', '#ffffff', 0],
    ]));

    return { defs, turb };
}

// Creates the feTurbulence + feDisplacementMap filter used to warp the flame shape
function _buildWarpFilter(svgNS, row, col) {
    const filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', 'flame-warp');
    filter.setAttribute('x', '-30%'); filter.setAttribute('y', '-30%');
    filter.setAttribute('width', '160%'); filter.setAttribute('height', '160%');

    const turb = document.createElementNS(svgNS, 'feTurbulence');
    turb.setAttribute('type', 'turbulence');
    turb.setAttribute('baseFrequency', '0.035 0.06');
    turb.setAttribute('numOctaves', '3');
    turb.setAttribute('seed', '2');
    turb.setAttribute('result', 'noise');
    turb.id = `ft-${row}-${col}`;

    const disp = document.createElementNS(svgNS, 'feDisplacementMap');
    disp.setAttribute('in', 'SourceGraphic');
    disp.setAttribute('in2', 'noise');
    disp.setAttribute('scale', '18');
    disp.setAttribute('xChannelSelector', 'R');
    disp.setAttribute('yChannelSelector', 'G');

    filter.appendChild(turb);
    filter.appendChild(disp);
    return { filter, turb };
}

// Creates the blur + merge glow filter applied to the outermost flame layer
function _buildGlowFilter(svgNS) {
    const filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', 'flame-glow');
    filter.setAttribute('x', '-40%'); filter.setAttribute('y', '-40%');
    filter.setAttribute('width', '180%'); filter.setAttribute('height', '180%');

    const blur = document.createElementNS(svgNS, 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '6');
    blur.setAttribute('result', 'blur');

    const merge = document.createElementNS(svgNS, 'feMerge');
    const n1 = document.createElementNS(svgNS, 'feMergeNode');
    n1.setAttribute('in', 'blur');
    const n2 = document.createElementNS(svgNS, 'feMergeNode');
    n2.setAttribute('in', 'SourceGraphic');
    merge.appendChild(n1);
    merge.appendChild(n2);

    filter.appendChild(blur);
    filter.appendChild(merge);
    return filter;
}

// Creates a vertical linear gradient SVG element from an array of [offset, color, opacity] stops
function _makeLinearGradient(svgNS, id, stops) {
    const grad = document.createElementNS(svgNS, 'linearGradient');
    grad.setAttribute('id', id);
    grad.setAttribute('x1', '0'); grad.setAttribute('y1', '1');
    grad.setAttribute('x2', '0'); grad.setAttribute('y2', '0');
    stops.forEach(([offset, color, opacity]) => {
        const stop = document.createElementNS(svgNS, 'stop');
        stop.setAttribute('offset', offset);
        stop.setAttribute('stop-color', color);
        stop.setAttribute('stop-opacity', opacity ?? 1);
        grad.appendChild(stop);
    });
    return grad;
}

/*
    Builds a single teardrop flame path using cubic bezier curves.
    scaleX / scaleY shrink the shape for inner/core layers.
    yShift raises the shape so inner layers appear higher.
    filterRef applies the warp or glow filter.
*/
function _makeFlame(svgNS, W, H, scaleX, scaleY, yShift, gradId, opacity, filterRef) {
    const bx = W / 2;
    const by = H;
    const hw = (W * 0.42) * scaleX;
    const ht = H * scaleY;

    const d = [
        `M ${bx} ${by + yShift}`,
        `C ${bx - hw} ${by + yShift}, ${bx - hw * 1.1} ${by - ht * 0.3 + yShift}, ${bx - hw * 0.55} ${by - ht * 0.6 + yShift}`,
        `C ${bx - hw * 0.25} ${by - ht * 0.82 + yShift}, ${bx} ${by - ht + yShift}, ${bx} ${by - ht + yShift}`,
        `C ${bx} ${by - ht + yShift}, ${bx + hw * 0.25} ${by - ht * 0.82 + yShift}, ${bx + hw * 0.55} ${by - ht * 0.6 + yShift}`,
        `C ${bx + hw * 1.1} ${by - ht * 0.3 + yShift}, ${bx + hw} ${by + yShift}, ${bx} ${by + yShift}`,
        'Z',
    ].join(' ');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', `url(#${gradId})`);
    path.setAttribute('opacity', opacity);
    if (filterRef) path.setAttribute('filter', `url(#${filterRef})`);
    return path;
}


//------------------------------------------------------------------------
// -------------------DEGREES OF FREEDOM: EMBER PARTICLES-----------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const EMBER_COUNT = 16;
const EMBER_COLORS = ['#e0a0ff', '#cc66ff', '#ffffff', '#bb44ee'];

// Creates and returns an array of ember particle objects (div + animation state)
function _buildEmbers(container, W, H) {
    const embers = [];
    for (let i = 0; i < EMBER_COUNT; i++) {
        const size = 2 + Math.random() * 4;
        const el = document.createElement('div');
        el.style.cssText = `
            position: absolute;
            width: ${size}px; height: ${size}px;
            border-radius: 50%;
            background: ${EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)]};
            pointer-events: none;
            filter: blur(0.5px);
            opacity: 0;
        `;
        container.appendChild(el);
        embers.push({
            el,
            x: W * (0.25 + Math.random() * 0.5),
            y: H * 0.7,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -(1.5 + Math.random() * 2.5),
            life: 0,
            maxLife: 800 + Math.random() * 600,
            delay: Math.random() * 1200,
        });
    }
    return embers;
}

// Advances all ember particles by one frame, respawning them when their lifetime expires
function _tickEmbers(embers, elapsed, gAlpha, W, H) {
    embers.forEach(em => {
        const localElapsed = elapsed - em.delay;
        if (localElapsed < 0) { em.el.style.opacity = 0; return; }

        em.life += 16;
        if (em.life > em.maxLife) {
            _respawnEmber(em, W, H);
        }

        em.x += em.vx;
        em.y += em.vy;
        em.vx += (Math.random() - 0.5) * 0.15; // gentle horizontal drift

        const lifeT = em.life / em.maxLife;
        const alpha = Math.sin(lifeT * Math.PI) * 0.9 * gAlpha;
        em.el.style.left = `${em.x}px`;
        em.el.style.top = `${em.y}px`;
        em.el.style.opacity = Math.max(0, alpha);
    });
}

// Resets an ember's position and velocity for its next life cycle
function _respawnEmber(em, W, H) {
    em.x = W * (0.25 + Math.random() * 0.5);
    em.y = H * (0.65 + Math.random() * 0.1);
    em.vx = (Math.random() - 0.5) * 1.2;
    em.vy = -(1.5 + Math.random() * 2.5);
    em.life = 0;
    em.maxLife = 600 + Math.random() * 700;
}


//------------------------------------------------------------------------
// -------------------DEGREES OF FREEDOM: ANIMATION LOOP------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Calculates global opacity: fade in for first 12%, hold, fade out in last 10%
function _fireGlobalAlpha(progress) {
    if (progress < 0.12) return progress / 0.12;
    if (progress > 0.90) return 1 - ((progress - 0.90) / 0.10);
    return 1;
}

/*
    Main rAF loop for the fire animation.
    - Ripples the turbulence filter to make flame edges wobble
    - Applies a gentle breathing scale to the whole flame
    - Advances ember particles
    - Fades the entire effect in/out
*/
function _animateFire(container, svg, turb, embers, W, H, durationMs, onComplete) {
    const startTime = performance.now();
    let turbPhase = 0;
    let animId;

    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const gAlpha = _fireGlobalAlpha(progress);

        // Animate the turbulence to make flame edges ripple
        turbPhase += 0.008;
        turb.setAttribute('baseFrequency',
            `${0.032 + Math.sin(turbPhase) * 0.008} ${0.058 + Math.cos(turbPhase * 0.7) * 0.01}`
        );

        // Subtle breathing scale on the SVG
        const breathe = 1 + 0.04 * Math.sin(elapsed / 220);
        svg.style.transform = `scaleX(${breathe})`;
        svg.style.transformOrigin = '50% 100%';
        svg.style.opacity = gAlpha;

        _tickEmbers(embers, elapsed, gAlpha, W, H);

        if (progress < 1) {
            animId = requestAnimationFrame(tick);
        } else {
            cancelAnimationFrame(animId);
            container.remove();
            onComplete();
        }
    }

    animId = requestAnimationFrame(tick);
}


//------------------------------------------------------------------------
// -------------------RESET HANDLER----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Called on level start/reset — clears all active Recursionist state
function resetRecursionistState() {
    _clearAllResidualTotems();
    _cancelDegreesOfFreedom(true); // silent cancel, no cooldown refund
}