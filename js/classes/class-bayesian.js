import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { _adjacencyMatrixRefreshAll, renderCell, updClues } from '../grid.js';
import { stopTimer, timesUp, updTimer } from '../timer/timer.js';
import { t } from '../translation/translations.js';
import { _setAbilityMode } from './class-abilities.js';
import { cooldownState } from './class-cooldown-state.js';
import { hideLsClassTooltip } from './class-hud-levelselect-tooltip.js';
import { buildClassHUD, hideHUDTooltip } from './class-hud.js';
import { ptHasSkill } from '../probability-tree/probability-tree-state-points.js';
import { questStat_classMarkUsed, questStat_classRevealUsed, updateQuestStats } from '../inference/inference-stats.js';
import { cur } from '../state.js';

//------------------------------------------------------------------------
//-----------------BAYESIAN CLASS-----------------------------------------
//------------------------------------------------------------------------



//------------------------------------------------------------------------
//-----------------CONSTANTS & STATE--------------------------------------
//------------------------------------------------------------------------

// The placement fuse starts at seven seconds and ticks once per second until cleanup.
const BAYES_FUSE_SECONDS = 7;
const BAYES_FUSE_PENALTY = 60;
const BAYES_ELIMINATION_REACH = 5;



//------------------------------------------------------------------------
//-----------------BAYES TRAPS--------------------------------------------
//------------------------------------------------------------------------
// Selection chooses trap types; placement starts the fuse.
// Detonation applies placed traps, then charges a penalty for each unplaced slot.
// Runtime state stays on window so the HUD and mouse handlers share it.
// title-bindings.js calls cleanup by name, so its bridge remains explicit.



//------------------------------------------------------------------------
//-----------------TRAP TYPE DEFINITIONS----------------------------------
//------------------------------------------------------------------------

// Returns the icon, color, label, and hint for one trap type.
function _bayesTrapTypeInfo(type) {
    const defs = {
        reveal: {
            icon: '🪤',
            color: '#27ae60',
            label: t('cls_trap_reveal'),
            hint: t('cls_trap_reveal_hint'),
        },
        elimination: {
            icon: '💣',
            color: '#e74c3c',
            label: t('cls_trap_elimination'),
            hint: t('cls_trap_elim_hint'),
        },
        protection: {
            icon: '🔰',
            color: '#f39c12',
            label: t('cls_trap_protection'),
            hint: t('cls_trap_protect_hint'),
        },
    };
    return defs[type] || { icon: '❓', color: '#aaa', label: type, hint: '' };
}



//------------------------------------------------------------------------
//-----------------SELECTION UI-------------------------------------------
//------------------------------------------------------------------------

// Builds the queue summary shown above the trap type buttons.
function _buildQueuedTrapsHTML(trapsQueue) {
    if (trapsQueue.length === 0) return '';

    const chips = trapsQueue.map(t => {
        const info = _bayesTrapTypeInfo(t.type);
        return `<span class="bayes-queued-chip" style="color:${info.color};
                     border:1px solid ${info.color}55;">${info.icon} ${info.label}</span>`;
    }).join('');

    const label = t('cls_already_chosen');

    return `<div class="bayes-queued">
                <div class="bayes-queued-label">${label}</div>
                ${chips}
            </div>`;
}

// Builds one button for each trap type available in the current slot.
function _buildTrapTypeButtonsHTML(availableTraps) {
    return `<div class="bayes-trap-list">` + availableTraps.map(type => {
        const info = _bayesTrapTypeInfo(type);
        return `
            <button onclick="_bayesTrapsSelectType('${type}')"
                class="bayes-trap-btn" style="--trap-color:${info.color};">
                ${info.icon} <span class="bayes-trap-btn-name">${info.label}</span>
                <span class="bayes-trap-btn-hint">${info.hint}</span>
            </button>`;
    }).join('') + `</div>`;
}

// Builds the selection overlay for the current trap queue.
function _buildSelectOverlayHTML(state) {
    const title = t('cls_bayes_traps_title');
    const selected = state.trapsQueue.length;
    const prompt = t('cls_trap_prompt')
        .replace('{a}', selected + 1)
        .replace('{b}', state.trapCount);
    const cancelLabel = t('cls_cancel');

    const trapBtns = _buildTrapTypeButtonsHTML(state.availableTraps);
    const queuedHTML = _buildQueuedTrapsHTML(state.trapsQueue);

    return `
        <div class="modal-box bayes-modal">
            <div class="bayes-modal-title">🧪 ${title}</div>
            <div class="bayes-modal-prompt">${prompt}</div>
            ${queuedHTML}
            ${trapBtns}
            <button onclick="_bayesTrapsCancel()" class="bayes-modal-cancel">${cancelLabel}</button>
        </div>`;
}



//------------------------------------------------------------------------
//-----------------SELECTION PHASE----------------------------------------
//------------------------------------------------------------------------

// Shows the selection overlay for the next trap slot.
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

// Adds the chosen trap type and advances to the next slot or placement.
export function _bayesTrapsSelectType(type) {
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
//-----------------FUSE & PLACEMENT HUD-----------------------------------
//------------------------------------------------------------------------

// Refreshes the cursor follower and cell countdown labels once per fuse tick.
function _bayesTrapsTickFuseDisplay() {
    _bayesTrapsUpdateCursorFollower();
    _bayesTrapsRefreshGridIndicators();
}

// Starts the fuse and detonates unplaced traps when it reaches zero.
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
//-----------------PLACEMENT PHASE----------------------------------------
//------------------------------------------------------------------------

// Moves from trap selection to grid placement.
// Removes the overlay, starts the fuse, and creates the cursor follower.
function _bayesTrapsStartPlacementPhase() {
    document.getElementById('bayes-traps-overlay')?.remove();

    const state = window._bayesTrapsState;
    if (!state) return;

    state.phase = 'place';
    state.currentTrapIdx = 0;

    _bayesTrapsStartFuse();
    _bayesTrapsCreateCursorFollower();

    const firstTrap = _bayesTrapTypeInfo(state.trapsQueue[0].type);
    globalThis.showToast(t('cls_trap_place_first')
        .replace('{b}', state.trapCount)
        .replace('{l}', `${firstTrap.icon} ${firstTrap.label}`)
        .replace('{f}', BAYES_FUSE_SECONDS));
}

// Places the next trap when the player clicks a cell during placement.
// Returns true when the click belongs to this placement flow.
export function _bayesTrapPlacementClick(row, col) {
    const state = window._bayesTrapsState;
    if (!state || state.phase !== 'place') return false;

    // All slots already placed - absorb the click but do nothing
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
        // All traps placed - remove the hand follower but keep the fuse ticking on the grid
        document.getElementById('bayes-trap-cursor-follower')?.remove();
        globalThis.showToast(t('cls_traps_placed').replace('{n}', state.placedCount));
        trackAchStat('bayesTrapsAllPlaced');
    } else {
        // Prompt for the next trap in the queue
        const nextInfo = _bayesTrapTypeInfo(state.trapsQueue[state.currentTrapIdx].type);
        globalThis.showToast(t('cls_trap_next')
            .replace('{a}', state.currentTrapIdx + 1)
            .replace('{b}', state.trapCount)
            .replace('{l}', `${nextInfo.icon} ${nextInfo.label}`));
        _bayesTrapsUpdateCursorFollower();
    }

    return true;
}



//------------------------------------------------------------------------
//-----------------DETONATION HELPERS-------------------------------------
//------------------------------------------------------------------------

// Fires explosions and activates every trap placed on the grid.
function _bayesTrapsFirePlacedTraps(trapsQueue) {
    trapsQueue
        .filter(t => t.placed && t.r !== null)
        .forEach(trap => {
            _bayesTrapAnimateExplosion(trap.r, trap.c, trap.type);
            _bayesTrapActivate(trap.type, trap.r, trap.c);
        });
}

// Applies the time penalty for unplaced traps and returns their count.
function _bayesTrapsApplyUnplacedPenalty(trapsQueue) {
    const unplaced = trapsQueue.filter(t => !t.placed).length;
    if (unplaced === 0) {
        globalThis.showToast(t('cls_traps_detonated'));
        return 0;
    }

    const penalty = unplaced * BAYES_FUSE_PENALTY;
    globalThis.timerSecs = Math.max(0, globalThis.timerSecs - penalty);
    updTimer();

    globalThis.showToast(t('cls_traps_inhand')
        .replace('{n}', unplaced)
        .replace('{p}', penalty));

    // Brief red flash on the penalty display
    const flashEl = document.getElementById('pen-flash');
    if (flashEl) {
        flashEl.classList.add('show');
        setTimeout(() => flashEl.classList.remove('show'), 350);
    }

    return unplaced;
}



//------------------------------------------------------------------------
//-----------------DETONATION---------------------------------------------
//------------------------------------------------------------------------

// Resolves the fuse: activates placed traps, charges penalties, and checks the result.
function _bayesTrapsDetonateUnplaced() {
    const state = window._bayesTrapsState;
    if (!state) return;

    _bayesTrapsFirePlacedTraps(state.trapsQueue);
    _bayesTrapsApplyUnplacedPenalty(state.trapsQueue);

    _bayesTrapsCleanup(true);
    Audio_Manager.playSFX('bayesTrapExplosion');

    globalThis.checkWin();

    if (globalThis.timerSecs <= 0 && !globalThis.dead) {
        globalThis.dead = true;
        stopTimer();
        timesUp();
    }
}



//------------------------------------------------------------------------
//-----------------CANCEL & CLEANUP---------------------------------------
//------------------------------------------------------------------------

// Cancels the active flow and charges the placement penalty when needed.
export function _bayesTrapsCancel() {
    document.getElementById('bayes-traps-overlay')?.remove();

    const state = window._bayesTrapsState;

    if (state && state.phase === 'place') {
        // Penalties apply even on manual cancel during placement
        _bayesTrapsApplyUnplacedPenalty(state.trapsQueue);
    } else {
        // Cancelled before placement started - just reset cooldown cleanly
        _setAbilityMode(false);
        const cd = cooldownState['active3'];
        if (cd?.interval) { clearInterval(cd.interval); cd.interval = null; }
        if (cd) cd.remaining = 0;
        globalThis.showToast(`🧪 ${t('cls_cancelled')}`);
    }

    _bayesTrapsCleanup(true);
}

// Clears timers, removes Bayes Traps UI, and resets ability mode.
// Pass false to skip an unnecessary HUD rebuild during setup.
export function _bayesTrapsCleanup(buildHUD = true) {
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
//-----------------ENTRY POINTS-------------------------------------------
//------------------------------------------------------------------------

// Starts Bayes Traps by clearing old state and opening trap selection.
export function _executeBayesTraps(trapCount, availableTraps) {
    if (!cur) return;
    hideHUDTooltip();
    hideLsClassTooltip();

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
//-----------------TRAP EFFECT DISPATCH-----------------------------------
//------------------------------------------------------------------------

// Routes a detonated trap to the effect for its type.
function _bayesTrapActivate(type, row, col) {
    switch (type) {
        case 'reveal': _bayesTrapReveal(row, col); break;
        case 'elimination': _bayesTrapElimination(row, col); break;
        case 'protection': _bayesTrapProtection(row, col); break;
    }
}



//------------------------------------------------------------------------
//-----------------TRAP EFFECTS-------------------------------------------
//------------------------------------------------------------------------

// Reveals correct unfilled cells in the surrounding 3×3 area.
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
            if (sol[r][c] === 1 && !globalThis.revealedGrid[r][c] && globalThis.userGrid[r][c] !== 1) {
                globalThis.revealedGrid[r][c] = true;
                globalThis.userGrid[r][c] = 1;
                renderCell(r, c);
                updClues(r, c);
                affected.push(`g-${r}-${c}`);
            }
        }
    }

    if (affected.length > 0) {
        globalThis._applyCellEffect(affected, 'reveal');
        trackAchStat('tilesRevealed', affected.length);
        questStat_classRevealUsed(affected.length);
        updateQuestStats('classAbilityUsedThisLevel', {});
        globalThis.checkWin();
    }

    // Refresh adjacency matrix overlay if the passive skill is active
    if (ptHasSkill('adjacency_matrix')) {
        _adjacencyMatrixRefreshAll();
    }
}

// Marks wrong empty cells in each cardinal direction from the blast.
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
            if (sol[r][c] === 0 && (globalThis.userGrid[r][c] === 0 || globalThis.userGrid[r][c] === 3) && !globalThis.wrongGrid[r][c]) {
                globalThis.userGrid[r][c] = 2; // ✕ mark
                questStat_classMarkUsed(1);
                renderCell(r, c);
                trackAchStat('tilesMarkedWrong', 1);
            }
        }
    }
}

// Registers the placement row and column as protected lines.
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
//-----------------PROTECTION VISUALS-------------------------------------
//------------------------------------------------------------------------

// Adds one shield icon to a cell when it does not already have one.
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

// Adds shield icons to every cell in one row or column.
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

// Removes one protection line while preserving icons shared with the other axis.
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

//------------------------------------------------------------------------
//-----------------PROTECTION INTERCEPTION--------------------------------
//------------------------------------------------------------------------

// Consumes one matching protection line before a wrong fill is registered.
export function _bayesTrapProtectionIntercept(row, col) {
    const lines = window._bayesTrapProtectedLines;
    if (!lines || lines.size === 0) return false;

    const rowKey = `row:${row}`;
    const colKey = `col:${col}`;
    const matchKey = lines.has(rowKey) ? rowKey : lines.has(colKey) ? colKey : null;
    if (!matchKey) return false;

    // Auto-mark the wrong cell with ✕ instead of counting a mistake
    if (globalThis.userGrid[row][col] === 0) {
        globalThis.userGrid[row][col] = 2;
        renderCell(row, col);
        questStat_classMarkUsed(1);
    }

    // Consume this line's protection (one protection = one intercept)
    lines.delete(matchKey);
    const [type, idxStr] = matchKey.split(':');
    _bayesTrapRemoveProtectionVisual(type, parseInt(idxStr, 10));

    const lineWord = (type === 'row' ? t('cls_row_word') : t('cls_col_word')) + ' ' + (parseInt(idxStr, 10) + 1);
    globalThis.showToast(t('cls_protect_triggered').replace('{line}', lineWord));

    Audio_Manager.playSFX('varianceShield');
    return true;
}



//------------------------------------------------------------------------
//-----------------GRID INDICATORS----------------------------------------
//------------------------------------------------------------------------

// Draws a planted trap's countdown and icon on its cell.
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

// Updates the countdown text on planted trap indicators.
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
//-----------------CURSOR FOLLOWER----------------------------------------
//------------------------------------------------------------------------

// Builds the cursor follower markup from the timer and trap icon.
function _buildCursorFollowerHTML(info, fuseRemaining) {
    return `
        <div style="font-size:14px; font-family:var(--PX, monospace); color:#e74c3c;
                    margin-bottom:4px; text-shadow:1px 1px 2px rgba(0,0,0,0.8);">
            ${fuseRemaining}s
        </div>
        <div>${info.icon}</div>
    `;
}

// Creates the cursor follower and keeps it positioned over the pointer.
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

// Refreshes or removes the cursor follower as placement advances.
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
//-----------------EXPLOSION ANIMATIONS-----------------------------------
//------------------------------------------------------------------------

// Injects the shared explosion keyframes once per page.
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

// Builds the visual container for one trap explosion type.
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

// Shows a type-specific explosion over a cell and removes it afterward.
function _bayesTrapAnimateExplosion(row, col, type) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

    _bayesTrapsInjectExplosionStyles();

    const fxContainer = _bayesTrapBuildExplosionFX(type);
    el.appendChild(fxContainer);
    setTimeout(() => fxContainer.remove(), 650);
}

