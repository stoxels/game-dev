//------------------------------------------------------------------------
//--------------------ASCENDENCY SKILL IMPLEMENTATIONS-------------------
//-------------------------------BAYESIAN CLASS---------------------------
//------------------------------------------------------------------------



//------------------------------------------------------------------------
//----------------------------------CONSTANTS-----------------------------
//------------------------------------------------------------------------

const BAYES_FUSE_SECONDS = 7;  // seconds the player has to place all traps before detonation
const BAYES_FUSE_PENALTY = 60;  // seconds deducted per unplaced trap at detonation
const BAYES_ELIMINATION_REACH = 5;   // how many cells the elimination trap scans in each cardinal direction



//------------------------------------------------------------------------
//-------------------------------BAYES TRAPS------------------------------
//------------------------------------------------------------------------
//
//  Flow overview:
//    Phase 1 – Select:    player picks a trap type for each of their N slots
//    Phase 2 – Place:     fuse starts; player clicks grid cells to plant each trap
//    Detonation:          fuse expires (or all placed) → effects fire, penalties applied
//
//  Global state lives on window._bayesTrapsState so it survives across calls.
//  window._bayesTrapProtectedLines tracks active protection lines (row/col keys).
//



//------------------------------------------------------------------------
//---------------------------TRAP TYPE DEFINITIONS------------------------
//------------------------------------------------------------------------

// Returns the display metadata for a given trap type string.
// Used by UI builders and effect handlers throughout the file.
function _bayesTrapTypeInfo(type) {
    const defs = {
        reveal: {
            icon: '🪤',
            color: '#27ae60',
            label: LANG === 'de' ? 'Enthüllungsfalle' : 'Reveal Trap',
            hint: LANG === 'de'
                ? 'Enthüllt korrekte Zellen im Radius 1'
                : 'Reveals correct cells in radius 1',
        },
        elimination: {
            icon: '💣',
            color: '#e74c3c',
            label: LANG === 'de' ? 'Eliminierungsfalle' : 'Elimination Trap',
            hint: LANG === 'de'
                ? 'Markiert falsche leere Zellen horizontal und vertikal bis zu 5 Zellen entfernt'
                : 'Marks wrong empty cells horizontally and vertically up to 5 cells away',
        },
        protection: {
            icon: '🔰',
            color: '#f39c12',
            label: LANG === 'de' ? 'Schutzfalle' : 'Protection Trap',
            hint: LANG === 'de'
                ? 'Schützt die gesamte Zeile & Spalte vor Fehlern'
                : 'Protects the entire row & column from mistakes',
        },
    };
    return defs[type] || { icon: '❓', color: '#aaa', label: type, hint: '' };
}



//------------------------------------------------------------------------
//------------------PHASE 1 HELPERS – TRAP SELECTION UI------------------
//------------------------------------------------------------------------

// Builds the HTML for the "already chosen" queue summary shown above the type buttons.
// Returns an empty string if nothing has been chosen yet.
function _buildQueuedTrapsHTML(trapsQueue) {
    if (trapsQueue.length === 0) return '';

    const queuedLabels = trapsQueue.map(t => {
        const info = _bayesTrapTypeInfo(t.type);
        return `<span style="color:${info.color}">${info.icon} ${info.label}</span>`;
    }).join('  ');

    const label = LANG === 'de' ? 'Bereits gewählt' : 'Already chosen';

    return `<div style="font-family:var(--PX);font-size:9px;color:#aaa;
                        margin-bottom:10px;line-height:1.8;">
                ${label}: ${queuedLabels}
            </div>`;
}

// Builds one selection button per available trap type.
function _buildTrapTypeButtonsHTML(availableTraps) {
    return availableTraps.map(type => {
        const info = _bayesTrapTypeInfo(type);
        return `
            <button onclick="_bayesTrapsSelectType('${type}')"
                style="font-family:var(--PX); font-size:9px; background:transparent;
                       border:1px solid ${info.color}; color:${info.color};
                       padding:8px 14px; cursor:pointer; letter-spacing:1px;
                       margin:4px; border-radius:4px; display:block; width:90%;
                       text-align:left; line-height:1.6;">
                ${info.icon} <strong>${info.label}</strong><br>
                <span style="opacity:.7; font-size:8px;">${info.hint}</span>
            </button>`;
    }).join('');
}

// Assembles the full inner HTML for the trap selection overlay modal.
function _buildSelectOverlayHTML(state) {
    const title = LANG === 'de' ? 'BAYES-FALLEN' : 'BAYES TRAPS';
    const selected = state.trapsQueue.length;
    const prompt = LANG === 'de'
        ? `Wähle einen Typ für Falle ${selected + 1} von ${state.trapCount}:`
        : `Choose a type for trap ${selected + 1} of ${state.trapCount}:`;
    const cancelLabel = LANG === 'de' ? 'ABBRECHEN' : 'CANCEL';

    const trapBtns = _buildTrapTypeButtonsHTML(state.availableTraps);
    const queuedHTML = _buildQueuedTrapsHTML(state.trapsQueue);

    return `
        <div class="modal-box" style="text-align:center; border-left:4px solid #27ae60;
             max-width:380px; max-height:80vh; overflow-y:auto;">
            <div style="font-family:var(--PX);font-size:13px;color:#27ae60;
                        letter-spacing:2px;margin-bottom:6px;">
                🧪 ${title}
            </div>
            <div style="font-family:var(--PX);font-size:10px;color:var(--accent2);
                        margin-bottom:12px;line-height:1.8;">
                ${prompt}
            </div>
            ${queuedHTML}
            <div style="display:flex;flex-direction:column;align-items:center;">
                ${trapBtns}
            </div>
            <div style="margin-top:14px;">
                <button onclick="_bayesTrapsCancel()"
                    style="font-family:var(--PX);font-size:9px;background:transparent;
                           border:1px solid #444;color:#555;padding:5px 14px;
                           cursor:pointer;letter-spacing:1px;">
                    ${cancelLabel}
                </button>
            </div>
        </div>`;
}



//------------------------------------------------------------------------
//----------------------PHASE 1 – TRAP SELECTION PHASE-------------------
//------------------------------------------------------------------------

// Shows the type-selection overlay for the next trap slot.
// Called on entry and again after each selection until all slots are filled.
function _bayesTrapsShowSelectPhase() {
    document.getElementById('bayes-traps-overlay')?.remove();

    const state = window._bayesTrapsState;
    if (!state) return;

    const overlay = document.createElement('div');
    overlay.id = 'bayes-traps-overlay';
    overlay.className = 'modal-bg show';
    overlay.style.cssText = 'z-index:3000;';
    overlay.innerHTML = _buildSelectOverlayHTML(state);

    document.body.appendChild(overlay);
    Audio_Manager.playSFX('bayesTrapSelect');
}

// Called by the type buttons in the overlay.
// Adds the chosen type to the queue and either shows the next slot or starts placement.
function _bayesTrapsSelectType(type) {
    const state = window._bayesTrapsState;
    if (!state || state.phase !== 'select') return;

    state.trapsQueue.push({ type, placed: false, r: null, c: null });

    if (state.trapsQueue.length < state.trapCount) {
        _bayesTrapsShowSelectPhase();      // more slots to fill
    } else {
        _bayesTrapsStartPlacementPhase();  // all chosen → move on
    }
}



//------------------------------------------------------------------------
//------------------PHASE 2 HELPERS – FUSE & PLACEMENT HUD---------------
//------------------------------------------------------------------------

// Ticks every second while the fuse burns.
// Updates both the cursor follower and the per-cell countdown labels.
function _bayesTrapsTickFuseDisplay() {
    _bayesTrapsUpdateCursorFollower();
    _bayesTrapsRefreshGridIndicators();
}

// Starts the fuse countdown interval.
// Calls _bayesTrapsDetonateUnplaced when time runs out.
function _bayesTrapsStartFuse() {
    const state = window._bayesTrapsState;
    if (!state) return;

    state.fuseRemaining = BAYES_FUSE_SECONDS;
    state.fuseTimer = setInterval(() => {
        if (!window._bayesTrapsState) { clearInterval(state.fuseTimer); return; }

        state.fuseRemaining--;
        _bayesTrapsTickFuseDisplay();

        if (state.fuseRemaining <= 0) {
            clearInterval(state.fuseTimer);
            state.fuseTimer = null;
            _bayesTrapsDetonateUnplaced();
        }
    }, 1000);
}



//------------------------------------------------------------------------
//----------------------PHASE 2 – TRAP PLACEMENT PHASE-------------------
//------------------------------------------------------------------------

// Transitions from the selection overlay to the grid placement phase.
// Removes the overlay, switches state.phase, spawns the cursor follower, and starts the fuse.
function _bayesTrapsStartPlacementPhase() {
    document.getElementById('bayes-traps-overlay')?.remove();

    const state = window._bayesTrapsState;
    if (!state) return;

    state.phase = 'place';
    state.currentTrapIdx = 0;

    _bayesTrapsStartFuse();
    _bayesTrapsCreateCursorFollower();

    const firstTrap = _bayesTrapTypeInfo(state.trapsQueue[0].type);
    showToast(LANG === 'de'
        ? `🧪 Platziere Falle 1/${state.trapCount}: ${firstTrap.icon} ${firstTrap.label} — ${BAYES_FUSE_SECONDS}s Zündschnur!`
        : `🧪 Place trap 1/${state.trapCount}: ${firstTrap.icon} ${firstTrap.label} — ${BAYES_FUSE_SECONDS}s fuse!`);
}

// Called from Mousebutton_Handlers.js when the player clicks a grid cell during placement.
// Returns true if the click was consumed (caller should return early).
function _bayesTrapPlacementClick(row, col) {
    const state = window._bayesTrapsState;
    if (!state || state.phase !== 'place') return false;

    // All slots already placed — absorb the click but do nothing
    if (state.currentTrapIdx >= state.trapCount) return true;

    // Record the placement position for this trap slot
    const trap = state.trapsQueue[state.currentTrapIdx];
    trap.r = row;
    trap.c = col;
    trap.placed = true;
    state.placedCount++;

    _bayesTrapDrawIndicator(row, col, trap.type);

    state.currentTrapIdx++;

    if (state.currentTrapIdx >= state.trapCount) {
        // All traps placed — remove the hand follower but keep the fuse ticking on the grid
        document.getElementById('bayes-trap-cursor-follower')?.remove();
        showToast(LANG === 'de'
            ? `🧪 Alle ${state.placedCount} Falle(n) platziert! Warten auf Detonation...`
            : `🧪 All ${state.placedCount} trap(s) placed! Waiting for detonation...`);
        trackAchStat('bayesTrapsAllPlaced');
    } else {
        // Prompt for the next trap in the queue
        const nextInfo = _bayesTrapTypeInfo(state.trapsQueue[state.currentTrapIdx].type);
        showToast(LANG === 'de'
            ? `🧪 Falle ${state.currentTrapIdx + 1}/${state.trapCount}: ${nextInfo.icon} ${nextInfo.label}`
            : `🧪 Trap ${state.currentTrapIdx + 1}/${state.trapCount}: ${nextInfo.icon} ${nextInfo.label}`);
        _bayesTrapsUpdateCursorFollower();
    }

    return true;
}



//------------------------------------------------------------------------
//-------------------DETONATION HELPERS-----------------------------------
//------------------------------------------------------------------------

// Fires explosion animations and activates game effects for all traps that were placed on the grid.
function _bayesTrapsFirePlacedTraps(trapsQueue) {
    trapsQueue
        .filter(t => t.placed && t.r !== null)
        .forEach(trap => {
            _bayesTrapAnimateExplosion(trap.r, trap.c, trap.type);
            _bayesTrapActivate(trap.type, trap.r, trap.c);
        });
}

// Applies the time penalty for each trap that was never placed, then shows feedback.
// Returns the number of unplaced traps (0 if all were placed).
function _bayesTrapsApplyUnplacedPenalty(trapsQueue) {
    const unplaced = trapsQueue.filter(t => !t.placed).length;
    if (unplaced === 0) {
        showToast(LANG === 'de' ? '🧪 💥 Alle Fallen explodiert!' : '🧪 💥 All traps detonated!');
        return 0;
    }

    const penalty = unplaced * BAYES_FUSE_PENALTY;
    timerSecs = Math.max(0, timerSecs - penalty);
    updTimer();

    showToast(LANG === 'de'
        ? `🧪 💥 ${unplaced} Falle(n) in der Hand explodiert! -${penalty}s`
        : `🧪 💥 ${unplaced} trap(s) detonated in hand! -${penalty}s`);

    // Brief red flash on the penalty display
    const flashEl = document.getElementById('pen-flash');
    if (flashEl) {
        flashEl.classList.add('show');
        setTimeout(() => flashEl.classList.remove('show'), 350);
    }

    return unplaced;
}



//------------------------------------------------------------------------
//-------------------------------DETONATION-------------------------------
//------------------------------------------------------------------------

// Triggered when the fuse reaches zero.
// Fires all placed traps, penalises unplaced ones, then resolves win/death state.
function _bayesTrapsDetonateUnplaced() {
    const state = window._bayesTrapsState;
    if (!state) return;

    _bayesTrapsFirePlacedTraps(state.trapsQueue);
    _bayesTrapsApplyUnplacedPenalty(state.trapsQueue);

    _bayesTrapsCleanup(true);
    Audio_Manager.playSFX('bayesTrapExplosion');

    checkWin();

    if (timerSecs <= 0 && !dead) {
        dead = true;
        stopTimer();
        timesUp();
    }
}



//------------------------------------------------------------------------
//---------------------------CANCEL & CLEANUP-----------------------------
//------------------------------------------------------------------------

// Player-initiated cancel. Applies the unplaced penalty if already in placement phase.
function _bayesTrapsCancel() {
    document.getElementById('bayes-traps-overlay')?.remove();

    const state = window._bayesTrapsState;

    if (state && state.phase === 'place') {
        // Penalties apply even on manual cancel during placement
        _bayesTrapsApplyUnplacedPenalty(state.trapsQueue);
    } else {
        // Cancelled before placement started — just reset cooldown cleanly
        _setAbilityMode(false);
        const cd = cooldownState['active3'];
        if (cd?.interval) { clearInterval(cd.interval); cd.interval = null; }
        if (cd) cd.remaining = 0;
        showToast(LANG === 'de' ? '🧪 Abgebrochen.' : '🧪 Cancelled.');
    }

    _bayesTrapsCleanup(true);
}

// Full teardown: clears the fuse timer, removes all DOM nodes, and resets ability mode.
// Pass buildHUD=false during the initial setup cancel to avoid an unnecessary HUD rebuild.
function _bayesTrapsCleanup(buildHUD = true) {
    const state = window._bayesTrapsState;
    if (state?.fuseTimer) {
        clearInterval(state.fuseTimer);
        state.fuseTimer = null;
    }
    window._bayesTrapsState = null;

    // Remove overlay and HUD elements
    document.getElementById('bayes-traps-overlay')?.remove();
    document.getElementById('bayes-trap-hud')?.remove();

    // Remove mouse-move listener and the cursor follower node
    if (window._bayesTrapMouseMoveHandler) {
        window.removeEventListener('mousemove', window._bayesTrapMouseMoveHandler);
        window._bayesTrapMouseMoveHandler = null;
    }
    document.getElementById('bayes-trap-cursor-follower')?.remove();

    // Remove countdown indicators from all cells (but leave protection shield icons)
    document.querySelectorAll('.bayes-trap-indicator:not(.bayes-trap-indicator-protection)')
        .forEach(el => el.remove());

    _setAbilityMode(false);
    if (buildHUD) buildClassHUD();
}



//------------------------------------------------------------------------
//-----------------------------ENTRY POINT--------------------------------
//------------------------------------------------------------------------

// Starts the Bayes Traps ability flow.
// Resets any lingering previous activation, initialises state, then opens the selection overlay.
function _executeBayesTraps(trapCount, availableTraps) {
    if (!cur) return;
    if (typeof hideHUDTooltip === 'function') hideHUDTooltip();
    if (typeof hideLsClassTooltip === 'function') hideLsClassTooltip();

    // Wipe any leftover state from a previous activation before starting fresh
    _bayesTrapsCleanup(false);

    window._bayesTrapsState = {
        trapCount,
        availableTraps: [...availableTraps],
        trapsQueue: [],   // filled one slot at a time during phase 'select'
        phase: 'select',
        fuseTimer: null,
        fuseRemaining: BAYES_FUSE_SECONDS,
        placedCount: 0,
        currentTrapIdx: 0,
    };

    _bayesTrapsShowSelectPhase();
    trackAchStat('skillBayesTrapsUsed');
}



//------------------------------------------------------------------------
//---------------------------TRAP EFFECT DISPATCH------------------------
//------------------------------------------------------------------------

// Routes detonation to the correct effect handler based on trap type.
function _bayesTrapActivate(type, row, col) {
    switch (type) {
        case 'reveal': _bayesTrapReveal(row, col); break;
        case 'elimination': _bayesTrapElimination(row, col); break;
        case 'protection': _bayesTrapProtection(row, col); break;
    }
}



//------------------------------------------------------------------------
//-----------------------------TRAP EFFECTS-------------------------------
//------------------------------------------------------------------------

// Reveal Trap: fills in correct unfilled cells within a 1-step radius (8 neighbours + self).
function _bayesTrapReveal(row, col) {
    if (!cur) return;
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const affected = [];

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const r = row + dr, c = col + dc;
            if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
            if (sol[r][c] === 1 && !revealedGrid[r][c] && userGrid[r][c] !== 1) {
                revealedGrid[r][c] = true;
                userGrid[r][c] = 1;
                renderCell(r, c);
                updClues(r, c);
                affected.push(`g-${r}-${c}`);
            }
        }
    }

    if (affected.length > 0) {
        _applyCellEffect(affected, 'reveal');
        trackAchStat('tilesRevealed', affected.length);
        questStat_classRevealUsed(affected.length);
        updateQuestStats('classAbilityUsedThisLevel', {});
        checkWin();
    }

    // Refresh adjacency matrix overlay if the passive skill is active
    if (typeof _adjacencyMatrixRefreshAll === 'function' && ptHasSkill('adjacency_matrix')) {
        _adjacencyMatrixRefreshAll();
    }
}

// Elimination Trap: marks wrong empty cells (sol===0) in the four cardinal directions,
// up to BAYES_ELIMINATION_REACH steps away from the detonation cell.
function _bayesTrapElimination(row, col) {
    if (!cur) return;
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    for (const [dr, dc] of dirs) {
        for (let step = 1; step <= BAYES_ELIMINATION_REACH; step++) {
            const r = row + dr * step;
            const c = col + dc * step;
            if (r < 0 || r >= rows || c < 0 || c >= cols) break;

            // Only mark cells that are empty/unflagged and not already confirmed wrong
            if (sol[r][c] === 0 && (userGrid[r][c] === 0 || userGrid[r][c] === 3) && !wrongGrid[r][c]) {
                userGrid[r][c] = 2; // ✕ mark
                questStat_classMarkUsed(1);
                renderCell(r, c);
                trackAchStat('tilesMarkedWrong', 1);
            }
        }
    }
}

// Protection Trap: registers the row and column of the placement cell as protected lines.
// Protected lines intercept the next wrong fill on that row/col (see _bayesTrapProtectionIntercept).
function _bayesTrapProtection(row, col) {
    if (!window._bayesTrapProtectedLines) window._bayesTrapProtectedLines = new Set();

    const rowKey = `row:${row}`;
    const colKey = `col:${col}`;

    if (!window._bayesTrapProtectedLines.has(rowKey)) {
        window._bayesTrapProtectedLines.add(rowKey);
        _bayesTrapApplyProtectionVisual('row', row);
    }
    if (!window._bayesTrapProtectedLines.has(colKey)) {
        window._bayesTrapProtectedLines.add(colKey);
        _bayesTrapApplyProtectionVisual('col', col);
    }
}



//------------------------------------------------------------------------
//-------------------PROTECTION TRAP VISUALS------------------------------
//------------------------------------------------------------------------

// Adds the shield icon span to a single cell element if it doesn't already have one.
function _bayesTrapAddShieldIconToCell(el) {
    if (el.querySelector('.bayes-trap-indicator-protection')) return;

    const info = _bayesTrapTypeInfo('protection');
    const span = document.createElement('span');
    span.className = 'bayes-trap-indicator bayes-trap-indicator-protection';
    span.textContent = info.icon;
    span.style.cssText = `
        position: absolute !important; top: 2px !important; right: 2px !important;
        font-size: 11px !important; line-height: 1 !important; pointer-events: none !important;
        opacity: .85 !important; background: transparent !important; background-color: transparent !important;
        border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important;
        width: auto !important; height: auto !important; display: inline-block !important; z-index: 5 !important;
    `;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(span);
}

// Adds shield icons to every cell in the given row or column.
function _bayesTrapApplyProtectionVisual(type, idx) {
    if (!cur) return;
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    if (type === 'row') {
        for (let c = 0; c < cols; c++) {
            const el = document.getElementById(`g-${idx}-${c}`);
            if (el) _bayesTrapAddShieldIconToCell(el);
        }
    } else {
        for (let r = 0; r < rows; r++) {
            const el = document.getElementById(`g-${r}-${idx}`);
            if (el) _bayesTrapAddShieldIconToCell(el);
        }
    }
}

// Removes protection visuals from every cell in the given row or column.
// Respects overlapping protections: a cell that is still covered by the other axis
// keeps its shield icon.
function _bayesTrapRemoveProtectionVisual(type, idx) {
    if (!cur) return;
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const lines = window._bayesTrapProtectedLines || new Set();

    if (type === 'row') {
        for (let c = 0; c < cols; c++) {
            const el = document.getElementById(`g-${idx}-${c}`);
            if (!el) continue;
            el.classList.remove('bayes-protect-line');
            // Only remove the icon if the column direction isn't also protected
            if (!lines.has(`col:${c}`)) {
                el.querySelector('.bayes-trap-indicator-protection')?.remove();
            }
        }
    } else {
        for (let r = 0; r < rows; r++) {
            const el = document.getElementById(`g-${r}-${idx}`);
            if (!el) continue;
            el.classList.remove('bayes-protect-line');
            // Only remove the icon if the row direction isn't also protected
            if (!lines.has(`row:${r}`)) {
                el.querySelector('.bayes-trap-indicator-protection')?.remove();
            }
        }
    }
}

// Called from mousebutton_handlers.js before registering a wrong fill.
// Returns true if a Protection Trap intercepted the mistake (caller should skip the error logic).
function _bayesTrapProtectionIntercept(row, col) {
    const lines = window._bayesTrapProtectedLines;
    if (!lines || lines.size === 0) return false;

    const rowKey = `row:${row}`;
    const colKey = `col:${col}`;
    const matchKey = lines.has(rowKey) ? rowKey : lines.has(colKey) ? colKey : null;
    if (!matchKey) return false;

    // Auto-mark the wrong cell with ✕ instead of counting a mistake
    if (userGrid[row][col] === 0) {
        userGrid[row][col] = 2;
        renderCell(row, col);
        questStat_classMarkUsed(1);
    }

    // Consume this line's protection (one protection = one intercept)
    lines.delete(matchKey);
    const [type, idxStr] = matchKey.split(':');
    _bayesTrapRemoveProtectionVisual(type, parseInt(idxStr, 10));

    showToast(`🛡️ ${LANG === 'de'
        ? `Schutzfalle ausgelöst! Fehler blockiert in ${type === 'row' ? 'Zeile' : 'Spalte'} ${parseInt(idxStr, 10) + 1}`
        : `Protection Trap triggered! Mistake blocked in ${type} ${parseInt(idxStr, 10) + 1}`}`);

    if (window.Audio_Manager) Audio_Manager.playSFX('varianceShield');
    return true;
}



//------------------------------------------------------------------------
//-----------------------GRID CELL INDICATORS-----------------------------
//------------------------------------------------------------------------

// Draws the countdown + icon overlay on a cell immediately after it is planted.
// The countdown label is updated each second by _bayesTrapsRefreshGridIndicators.
function _bayesTrapDrawIndicator(row, col, type) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;

    // Clear any existing indicator on this cell before drawing the new one
    el.querySelectorAll('.bayes-trap-indicator').forEach(e => e.remove());

    const info = _bayesTrapTypeInfo(type);
    const secs = window._bayesTrapsState ? window._bayesTrapsState.fuseRemaining : 0;

    const span = document.createElement('span');
    span.className = 'bayes-trap-indicator';
    span.innerHTML = `
        <span class="bayes-trap-time"
              style="font-size:8px; display:block; color:#e74c3c; text-align:center;
                     font-family:var(--PX, monospace); line-height:1; margin-bottom:1px;
                     text-shadow:1px 1px 1px rgba(0,0,0,0.7);">${secs}s</span>
        <span class="bayes-trap-icon" style="display:block; text-align:center;">${info.icon}</span>
    `;
    span.style.cssText = `
        position: absolute !important; top: 50% !important; left: 50% !important;
        transform: translate(-50%, -50%) !important;
        font-size: 11px !important; line-height: 1 !important; pointer-events: none !important;
        opacity: .85 !important; background: transparent !important; background-color: transparent !important;
        border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important;
        width: 100% !important; height: auto !important; display: inline-block !important; z-index: 5 !important;
    `;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(span);
}

// Updates only the countdown text on every already-placed indicator.
// Called every second by _bayesTrapsTickFuseDisplay to avoid full redraws.
function _bayesTrapsRefreshGridIndicators() {
    const state = window._bayesTrapsState;
    if (!state) return;

    state.trapsQueue.forEach(trap => {
        if (!trap.placed || trap.r === null) return;
        const el = document.getElementById(`g-${trap.r}-${trap.c}`);
        if (!el) return;
        const timeEl = el.querySelector('.bayes-trap-time');
        if (timeEl) timeEl.textContent = `${state.fuseRemaining}s`;
    });
}



//------------------------------------------------------------------------
//-----------------------------CURSOR FOLLOWER----------------------------
//------------------------------------------------------------------------

// Builds the innerHTML string for the cursor follower (timer + icon stacked vertically).
function _buildCursorFollowerHTML(info, fuseRemaining) {
    return `
        <div style="font-size:14px; font-family:var(--PX, monospace); color:#e74c3c;
                    margin-bottom:4px; text-shadow:1px 1px 2px rgba(0,0,0,0.8);">
            ${fuseRemaining}s
        </div>
        <div>${info.icon}</div>
    `;
}

// Creates the cursor-following trap icon and attaches the mousemove listener.
// The follower displays the current trap type and remaining fuse time.
function _bayesTrapsCreateCursorFollower() {
    document.getElementById('bayes-trap-cursor-follower')?.remove();

    const follower = document.createElement('div');
    follower.id = 'bayes-trap-cursor-follower';
    follower.style.cssText = `
        position: fixed; pointer-events: none; z-index: 10000;
        font-size: 20px; transform: translate(14px, 14px);
        line-height: 1; opacity: 0.9; transition: opacity 0.1s;
        display: flex; flex-direction: column; align-items: center;
    `;

    const state = window._bayesTrapsState;
    if (state?.trapsQueue[state.currentTrapIdx]) {
        const info = _bayesTrapTypeInfo(state.trapsQueue[state.currentTrapIdx].type);
        follower.innerHTML = _buildCursorFollowerHTML(info, state.fuseRemaining);
    }

    document.body.appendChild(follower);

    // Keep the follower glued to the mouse pointer
    window._bayesTrapMouseMoveHandler = (e) => {
        const foll = document.getElementById('bayes-trap-cursor-follower');
        if (foll) {
            foll.style.left = e.clientX + 'px';
            foll.style.top = e.clientY + 'px';
        }
    };
    window.addEventListener('mousemove', window._bayesTrapMouseMoveHandler);
}

// Refreshes the follower's content (type icon + fuse countdown).
// Removes the follower if all traps have already been placed.
function _bayesTrapsUpdateCursorFollower() {
    const follower = document.getElementById('bayes-trap-cursor-follower');
    const state = window._bayesTrapsState;

    if (follower && state?.trapsQueue[state.currentTrapIdx]) {
        const info = _bayesTrapTypeInfo(state.trapsQueue[state.currentTrapIdx].type);
        follower.innerHTML = _buildCursorFollowerHTML(info, state.fuseRemaining);
    } else if (follower) {
        follower.remove();
    }
}



//------------------------------------------------------------------------
//---------------------------EXPLOSION ANIMATIONS-------------------------
//------------------------------------------------------------------------

// Injects the shared CSS keyframe block for all trap explosion types.
// Only runs once per page; subsequent calls are no-ops.
function _bayesTrapsInjectExplosionStyles() {
    if (document.getElementById('bayes-explosion-styles')) return;

    const styleNode = document.createElement('style');
    styleNode.id = 'bayes-explosion-styles';
    styleNode.textContent = `
        @keyframes bayes-reveal-burst {
            0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 1; filter: drop-shadow(0 0 2px #27ae60); }
            50%  { background: rgba(39, 174, 96, 0.4); border: 2px solid #27ae60; }
            100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
        }
        @keyframes bayes-elim-spark {
            0%   { transform: translate(-50%, -50%) scale(0.2) rotate(0deg); opacity: 1; color: #e74c3c; font-size: 10px; }
            50%  { opacity: 1; text-shadow: 0 0 8px #e74c3c; }
            100% { transform: translate(-50%, -50%) scale(2.2) rotate(180deg); opacity: 0; color: #f39c12; font-size: 24px; }
        }
        @keyframes bayes-protect-pulse {
            0%   { transform: translate(-50%, -50%) scale(0.8); opacity: 1; box-shadow: 0 0 0 0px rgba(243, 156, 18, 0.8); }
            40%  { opacity: 0.9; }
            100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; box-shadow: 0 0 4px 12px rgba(243, 156, 18, 0); }
        }
    `;
    document.head.appendChild(styleNode);
}

// Builds a typed visual effect container element for the given trap type.
function _bayesTrapBuildExplosionFX(type) {
    const fxContainer = document.createElement('div');
    fxContainer.style.cssText = `
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none; z-index: 50;
    `;

    switch (type) {
        case 'reveal':
            // Green radar shockwave ring expanding outward
            fxContainer.style.cssText += `
                width: 100%; height: 100%; border-radius: 50%;
                animation: bayes-reveal-burst 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
            `;
            break;

        case 'elimination':
            // Fiery combustion symbol bursting outward
            fxContainer.textContent = '💥';
            fxContainer.style.cssText += `
                animation: bayes-elim-spark 0.45s ease-out forwards;
                font-family: Arial, sans-serif;
            `;
            break;

        case 'protection':
            // Golden protective aura ring
            fxContainer.style.cssText += `
                width: 70%; height: 70%; border-radius: 4px;
                border: 2px solid #f39c12;
                animation: bayes-protect-pulse 0.6s ease-out forwards;
            `;
            break;
    }

    return fxContainer;
}

// Spawns a type-specific visual explosion directly over the detonated cell and auto-removes it.
function _bayesTrapAnimateExplosion(row, col, type) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

    _bayesTrapsInjectExplosionStyles();

    const fxContainer = _bayesTrapBuildExplosionFX(type);
    el.appendChild(fxContainer);
    setTimeout(() => fxContainer.remove(), 650);
}



//------------------------------------------------------------------------
//------------------------TYPE I ERROR SHIELD-----------------------------
//------------------------------------------------------------------------
//
//  The Type I Error Shield secretly marks a set of random empty (sol===0)
//  cells as shielded. If the player tries to fill a shielded cell by
//  mistake, the shield intercepts the error, auto-marks ✕, and optionally
//  reveals a bonus correct cell on the same row/column.
//



//------------------------------------------------------------------------
//------------TYPE I ERROR SHIELD HELPERS---------------------------------
//------------------------------------------------------------------------

// Returns a shuffled list of every empty (sol===0), unrevealed, unshielded cell on the grid.
function _typeIGetEligibleCells() {
    if (!cur) return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const shielded = window._typeIShieldedCells || new Set();
    const eligible = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 0
                && revealedGrid[r][c] !== true
                && !shielded.has(`${r}-${c}`)) {
                eligible.push([r, c]);
            }
        }
    }

    // Fisher-Yates shuffle for uniform random seeding
    for (let i = eligible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }

    return eligible;
}

// Registers and animates a set of cells as shielded.
// Each cell gets a staggered matrix-flash animation on placement.
function _typeISeedShieldedCells(cells) {
    cells.forEach(([r, c], index) => {
        window._typeIShieldedCells.add(`${r}-${c}`);

        const cellEl = document.getElementById(`g-${r}-${c}`);
        if (!cellEl) return;

        // Stagger bursts so they don't all fire simultaneously
        setTimeout(() => {
            const matrixFlash = document.createElement('div');
            matrixFlash.style.cssText = `
                position: absolute; inset: 0; background: rgba(46, 204, 113, 0.4);
                z-index: 10; pointer-events: none; border-radius: inherit;
                animation: type1-matrix-sweep 0.8s ease-out forwards;
            `;
            if (getComputedStyle(cellEl).position === 'static') cellEl.style.position = 'relative';
            cellEl.appendChild(matrixFlash);
            setTimeout(() => matrixFlash.remove(), 800);
        }, index * 120);
    });
}

// Injects a unique CSS keyframe for a single shard's trajectory and returns the animation name.
function _typeIInjectShardKeyframe(row, col, shardIndex, tx, ty, rotation) {
    const animName = `shard-fly-${row}-${col}-${shardIndex}`;
    if (!document.getElementById(animName)) {
        const style = document.createElement('style');
        style.id = animName;
        style.textContent = `
            @keyframes ${animName} {
                0%   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                100% { transform: translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0) rotate(${rotation}deg); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    return animName;
}

// Creates a single glowing shard element flying outward at the given angle and velocity.
function _typeICreateShardElement(row, col, shardIndex) {
    const angle = (shardIndex / 8) * 2 * Math.PI + (Math.random() * 0.4 - 0.2);
    const velocity = 30 + Math.random() * 30;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;
    const rotation = Math.random() * 360 + 180;

    const shard = document.createElement('div');
    shard.style.cssText = `
        position: absolute; top: 50%; left: 50%;
        width: 4px; height: 4px; background: #2ecc71;
        box-shadow: 0 0 6px #2ecc71, 0 0 2px #fff;
        border-radius: ${Math.random() > 0.5 ? '0px' : '50%'};
        transform: translate(-50%, -50%);
        opacity: 1;
    `;

    const animName = _typeIInjectShardKeyframe(row, col, shardIndex, tx, ty, rotation);
    shard.style.animation = `${animName} 0.6s cubic-bezier(0.1, 0.8, 0.25, 1) forwards`;
    return shard;
}



//------------------------------------------------------------------------
//--------------------TYPE I ERROR SHIELD – MAIN FUNCTIONS---------------
//------------------------------------------------------------------------

// Activates the shield: picks eligible empty cells, seeds them, and plays the animation.
function _executeTypeIShield(seedCount, bonusReveal) {
    if (!cur) return;

    if (!window._typeIShieldedCells) window._typeIShieldedCells = new Set();
    window._typeIBonusReveal = bonusReveal;

    const eligible = _typeIGetEligibleCells();

    if (eligible.length === 0) {
        showToast(LANG === 'de' ? '🛡️ Keine Zellen zum Beschildern!' : '🛡️ No cells available to shield!');
        _setAbilityMode(false);
        const cd = cooldownState['active4'];
        if (cd?.interval) { clearInterval(cd.interval); cd.interval = null; }
        if (cd) cd.remaining = 0;
        buildClassHUD();
        return;
    }

    const toSeed = eligible.slice(0, Math.min(seedCount, eligible.length));
    _typeISeedShieldedCells(toSeed);

    const bonusNote = bonusReveal
        ? (LANG === 'de' ? ' (+Enthüllung bei Auslösung)' : ' (+reveal on trigger)')
        : '';

    showToast(`🛡️ ${LANG === 'de'
        ? `Fehler 1. Art Schild: ${toSeed.length} Zelle(n) beschildert${bonusNote}`
        : `Type I Error Shield: ${toSeed.length} cell(s) shielded${bonusNote}`}`);

    Audio_Manager.playSFX('type1errorShieldHide');
    buildClassHUD();
    trackAchStat('skillType1ErrorShieldUsed');
}

// Called from mousebutton_handlers.js before registering a wrong fill.
// Returns true if a shielded cell intercepted the mistake (caller should skip the error logic).
function _typeIShieldIntercept(row, col) {
    const cells = window._typeIShieldedCells;
    if (!cells || cells.size === 0) return false;

    const key = `${row}-${col}`;
    if (!cells.has(key)) return false;

    cells.delete(key);

    userGrid[row][col] = 2; // ✕
    renderCell(row, col);
    trackAchStat('tilesMarkedWrong', 1);

    _typeIShowShieldBreakEffect(row, col);

    showToast(LANG === 'de'
        ? '🧪 Fehler 1. Art - Schutz ausgelöst!'
        : 'Type I Error - Shield triggered!');

    Audio_Manager.playSFX('type1errorShieldBreak');
    trackAchStat('type1Intercepts');

    if (window._typeIBonusReveal) {
        _typeIBonusRevealCell(row, col);
    }

    return true;
}

// Spawns the particle shatter explosion when a hidden shield breaks.
function _typeIShowShieldBreakEffect(row, col) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

    const container = document.createElement('div');
    container.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none; z-index: 100; overflow: visible;
    `;
    el.appendChild(container);

    // Spawn 8 shards flying outward in evenly-spaced angles
    const SHARD_COUNT = 8;
    for (let i = 0; i < SHARD_COUNT; i++) {
        container.appendChild(_typeICreateShardElement(row, col, i));
    }

    // Central shield icon that expands and fades out simultaneously
    const shieldWave = document.createElement('div');
    shieldWave.textContent = '🛡️';
    shieldWave.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        font-size: 16px; text-shadow: 0 0 8px #2ecc71;
        animation: type1-shield-shatter 0.5s ease-out forwards;
    `;
    container.appendChild(shieldWave);

    // Clean up all injected elements after animation completes
    setTimeout(() => {
        container.remove();
        document.querySelectorAll(`[id^="shard-fly-${row}-${col}-"]`).forEach(s => s.remove());
    }, 650);
}

// Reveals one random correct cell on the same row or column as the triggered shield.
// Runs only when the shield was set up with bonusReveal=true.
function _typeIBonusRevealCell(row, col) {
    if (!cur) return;
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const candidates = [];

    // Collect unrevealed correct cells in the same row
    for (let c = 0; c < cols; c++) {
        if (sol[row][c] === 1 && !revealedGrid[row][c] && userGrid[row][c] !== 1)
            candidates.push([row, c]);
    }
    // Collect unrevealed correct cells in the same column
    for (let r = 0; r < rows; r++) {
        if (r === row) continue;
        if (sol[r][col] === 1 && !revealedGrid[r][col] && userGrid[r][col] !== 1)
            candidates.push([r, col]);
    }

    if (!candidates.length) return;

    const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
    revealedGrid[r][c] = true;
    userGrid[r][c] = 1;
    renderCell(r, c);
    updClues(r, c);
    trackAchStat('tilesRevealed', 1);
    _applyCellEffect([`g-${r}-${c}`], 'reveal');

    showToast(LANG === 'de'
        ? '🛡️ Typ-I-Bonus: 1 korrekte Zelle enthüllt!'
        : 'Type I bonus: 1 correct cell revealed!');

    questStat_classRevealUsed(1);
    updateQuestStats('classAbilityUsedThisLevel', {});

    checkWin();
}