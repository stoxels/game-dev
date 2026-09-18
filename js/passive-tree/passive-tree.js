import { renderLevelSelect } from '../screens/screens-level-select.js';
import { showMapView } from '../screens/screens-map-view.js';
import { showWorldDetail } from '../screens/screens-world-levels.js';
import { switchScreen } from '../screens/screens.js';
import { save } from '../state.js';
import { pauseTimer, resumeTimer } from '../timer.js';
import { LANG, t } from '../translation/translations.js';
import { PassiveTracker } from './passive-tracker.js';
import { TALENT_TREE_DATA } from './passive-tree-data.js';
import { ptHasSkill } from './passive-tree-state-points.js';
import { _ptRender } from './passive-tree-ui.js';
//--- Phase 3 step 5: live accessors (external write sites stay untouched) ---
try { Object.defineProperty(globalThis, '_ptReturnScreen', { get() { return _ptReturnScreen; }, set(v) { _ptReturnScreen = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_ptReturnWorldIndex', { get() { return _ptReturnWorldIndex; }, set(v) { _ptReturnWorldIndex = v; }, configurable: true }); } catch (e) {}
//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Special node IDs
// The Start node is always considered reachable / pre-allocated.
// Set PT_START_ID to match the "id" of your Start node in passive-tree-data.js
export const PT_START_ID = 1;

// Layout dimensions
export const PT_NODE_RADIUS = 22;
export const PT_PADDING = 80;
export const PT_CONN_WIDTH = 2;

// Zoom limits and step size
export const PT_ZOOM_MIN = 0.25;
export const PT_ZOOM_MAX = 3.0;
export const PT_ZOOM_STEP = 0.12;

// Node colours - one set per state: locked / unlocked / allocated / start
export const PT_COL_LOCKED_BG = '#111120';
export const PT_COL_LOCKED_BORDER = '#3a3350';
export const PT_COL_LOCKED_DOT = '#3a3350';
export const PT_COL_UNLOCKED_BG = '#1a1a2e';
export const PT_COL_UNLOCKED_BORDER = '#b89a50';
export const PT_COL_UNLOCKED_DOT = '#b89a50';
export const PT_COL_ALLOCATED_BG = '#1e2a10';
export const PT_COL_ALLOCATED_BORDER = '#6dbf40';
export const PT_COL_ALLOCATED_DOT = '#6dbf40';
export const PT_COL_START = '#ffd700';

// Connection line colours - one per state
export const PT_CONN_LOCKED = 'rgba(80,70,110,0.3)';
export const PT_CONN_UNLOCKED = 'rgba(160,130,80,0.45)';
export const PT_CONN_ALLOCATED = 'rgba(109,191,64,0.7)';

// Tracks which screen - and, if applicable, which world - to return to
// after closing the Probability Tree. Kept up to date by showWorldDetail(),
// showMapView(), and toggleMapView()'s classic-view branch.
let _ptReturnScreen = 'screen-levels';
let _ptReturnWorldIndex = null;


//------------------------------------------------------------------------
//-------------------TREE DATA INITIALISATION-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// These functions populate the shared _pt_skills, _pt_conns, and
// _pt_skillMap globals that are declared in passive-tree-ui.js.
// TALENT_TREE_DATA is the constant defined in passive-tree-data.js.
// Load order in HTML must be: passive-tree-data.js → passive-tree.js → passive-tree-ui.js

// Maps TALENT_TREE_DATA.nodes into internal skill objects and builds
// the _pt_skillMap lookup table for fast id-based access.
export function _ptInitSkills() {
    globalThis._pt_skills = TALENT_TREE_DATA.nodes.map(n => ({
        id: n.id,
        x: n.x,
        y: n.y,
        name: n.nameEn,    // used as the fallback display name
        image: n.icon || '',
        _def: n,           // full node definition kept for tooltip access
    }));

    globalThis._pt_skillMap = {};
    globalThis._pt_skills.forEach(s => { globalThis._pt_skillMap[s.id] = s; });
}

// Maps TALENT_TREE_DATA.connections into internal connection objects.
export function _ptInitConnections() {
    globalThis._pt_conns = TALENT_TREE_DATA.connections.map(c => ({
        id: c.id,
        from: c.from,
        to: c.to,
        dotted: !!c.dotted,
    }));
}

// _ptInitTreeData - called once when the script loads.
// Populates all shared tree state from the TALENT_TREE_DATA constant.
export function _ptInitTreeData() {
    _ptInitSkills();
    _ptInitConnections();
}

// Initialise once the document is ready (deferred). At module-eval time
// this would run during passive-tree-state-points' import phase, i.e.
// BEFORE its accessor prologue exists: globalThis._pt_skills = ... would
// create a plain property that the prologue then REPLACES with a getter
// to the still-empty module binding - silently discarding the data (the
// classic script order populated after the shared declarations existed).
if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    // 'loading' AND 'interactive' both mean DCL has not fired yet;
    // deferred module scripts execute at 'interactive', so checking
    // for 'loading' only would run this inside the import phase and
    // the write would be clobbered by state-points' accessor prologue.

    document.addEventListener('DOMContentLoaded', _ptInitTreeData);
} else {
    _ptInitTreeData();
}


//------------------------------------------------------------------------
//-------------------PT MODULE--------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// PT is a lightweight module that exposes the public API used by the UI.
// Tree data is loaded once at startup above - PT itself has no data
// management responsibility, only rendering and skill lookup.

export const PT = (() => {
    return {
        // Triggers a full re-render of the tree canvas.
        reload: _ptRender,

        // Returns true if the player has allocated the node with the given statKey.
        hasSkill: ptHasSkill,
    };
})();


//------------------------------------------------------------------------
//-------------------SCREEN BUILD & NAVIGATION----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Renders a loading placeholder into the canvas element.
// Called at the start of buildPassiveTreeScreen so the user never sees
// a blank panel while the tree is initialising.
export function _ptShowLoadingPlaceholder(lang) {
    const canvas = document.getElementById('pt-canvas');
    if (!canvas) return;

    canvas.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;
            height:100%;font-family:var(--PX,monospace);font-size:12px;
            color:var(--accent2,#aaa);letter-spacing:2px;opacity:0.6;">
            ${t('pt_loading')}
        </div>`;
}

// Writes the current available-points count into the points display element.
export function _ptUpdatePointsDisplay(lang, points) {
    const pointsEl = document.getElementById('pt-points');
    if (!pointsEl) return;

    pointsEl.textContent = t('pt_points_available').replace('{n}', points);
}

// buildPassiveTreeScreen - entry point called by the UI.
// Updates the points counter, shows a brief loading state,
// then triggers the full tree render.
export function buildPassiveTreeScreen() {
    const lang = (typeof LANG !== 'undefined') ? LANG : 'en';
    const points = (typeof globalThis.STATE !== 'undefined' && globalThis.STATE.passiveTreePoints) || 0;

    _ptUpdatePointsDisplay(lang, points);
    _ptShowLoadingPlaceholder(lang);
    PT.reload();
}

// Opens the Probability Tree screen, remembering the current screen
// (via _ptReturnScreen / _ptReturnWorldIndex) so ptGoBack() can restore it.
// An optional returnScreen argument (e.g. 'screen-endgame-hub') overrides
// the return target - used when the tree is opened from the endgame hub.
export function showPassiveTree(returnScreen) {
    if (typeof returnScreen === 'string') _ptReturnScreen = returnScreen;
    buildPassiveTreeScreen();
    globalThis.screenHistory.push(_ptReturnScreen);
    switchScreen('screen-passive-tree');
}

// Called by the Probability Tree's BACK button (see ui-events.js).
// Unlike the generic goToPreviousScreen()/switchScreen() combo, this
// re-runs the actual screen-build function for the destination so that
// updated STATE.done / sprite position are reflected immediately.
export function ptGoBack() {
    // Game-overlay close (K keybind mid-puzzle) - never touches the menu
    // return path: the paused run continues exactly where it was.
    if (_ptGameOverlay) { closeTreeToGame(); return; }
    globalThis.screenHistory.pop(); // discard the entry showPassiveTree() pushed

    if (_ptReturnScreen === 'screen-world-detail' && _ptReturnWorldIndex !== null) {
        showWorldDetail(_ptReturnWorldIndex);
    } else if (_ptReturnScreen === 'screen-map-view') {
        showMapView();
    } else if (_ptReturnScreen === 'screen-endgame-hub' && typeof globalThis.showEndgameHub === 'function') {
        globalThis.showEndgameHub();
    } else if (_ptReturnScreen === 'screen-levels' && typeof renderLevelSelect === 'function') {
        switchScreen(_ptReturnScreen);
        renderLevelSelect();
    } else {
        switchScreen(_ptReturnScreen);
    }
}


//------------------------------------------------------------------------
//-------------------GAME OVERLAY MODE (K KEYBIND)-------------------------
//------------------------------------------------------------------------
// Same pattern as the character-sheet overlay (B, see endgame-hub.js) and
// the spell-book pause (P): K mid-puzzle pauses the run silently (no pause
// overlay), hides the body-anchored avatars (they would float above the
// tree), and K (or BACK) returns straight to the running puzzle exactly
// where it was. Points spent in the tree save immediately (see
// _ptHandleAllocation), so the run continues with the new allocation -
// effects that read ptHasSkill() live apply at once, level-start effects
// (timer bonuses etc.) take effect on the next level.

export let _ptGameOverlay = false;
// True only if THIS overlay open paused the game (a pause menu may already
// have been up when K was pressed - then pause state is left untouched).
export let _ptOverlayPaused = false;

// True while the tree is open as an overlay over a running puzzle.
export function isTreeGameOverlay() {
    return _ptGameOverlay === true;
}

// Silently pauses the run WITHOUT the pause overlay. No-op unless a level
// is actually running.
export function _ptOverlayPause() {
    _ptOverlayPaused = false;
    try {
        if (typeof globalThis.dead !== 'undefined' && globalThis.dead) return;
        if (typeof globalThis.cur === 'undefined' || !globalThis.cur) return;
        if (typeof globalThis._gamePaused !== 'undefined' && globalThis._gamePaused) return;  // pause menu already up
        if (typeof pauseTimer === 'function') pauseTimer();
        globalThis._gamePaused = true;
        if (typeof globalThis._egOnPause === 'function') { try { globalThis._egOnPause(); } catch (e) {} }
        _ptOverlayPaused = true;
    } catch (e) {}
}

// Resumes a run paused by _ptOverlayPause. Never touches pause state owned
// by someone else (pause menu, tutorial lessons, spell book).
export function _ptOverlayResume() {
    if (!_ptOverlayPaused) return;
    _ptOverlayPaused = false;
    try {
        globalThis._gamePaused = false;
        if (typeof globalThis._egOnResume === 'function') { try { globalThis._egOnResume(); } catch (e) {} }
        if (typeof resumeTimer === 'function') resumeTimer();
    } catch (e) {}
}

export function _ptHideAvatars() {
    try { if (typeof globalThis._hidePlayerAvatarSimple === 'function') globalThis._hidePlayerAvatarSimple(); } catch (e) {}
    try { if (typeof globalThis._hidePlayerAvatar === 'function') globalThis._hidePlayerAvatar(); } catch (e) {}
}

export function _ptShowAvatars() {
    try { if (typeof globalThis._showPlayerAvatarSimple === 'function') globalThis._showPlayerAvatarSimple(); } catch (e) {}
    try { if (typeof globalThis._showPlayerAvatar === 'function') globalThis._showPlayerAvatar(); } catch (e) {}
}

// Opens the tree over a running puzzle (K keybind path). Skips the menu
// screen-history push - the overlay close path restores the game directly.
export function openTreeFromGame() {
    _ptGameOverlay = true;
    _ptReturnScreen = 'screen-game';
    _ptOverlayPause();
    _ptHideAvatars();
    try {
        buildPassiveTreeScreen();
    } catch (e) {
        // Build failed: unwind so the run is never left paused with no
        // overlay on top (the keybind handler retries cleanly on next K).
        _ptShowAvatars();
        _ptOverlayResume();
        _ptGameOverlay = false;
        throw e;
    }
    if (typeof switchScreen === 'function') switchScreen('screen-passive-tree');
    else document.getElementById('screen-passive-tree').style.display = 'block';
}

// Closes the overlay and returns to the running puzzle exactly where it was.
export function closeTreeToGame() {
    _ptGameOverlay = false;
    if (typeof switchScreen === 'function') switchScreen('screen-game');
    _ptShowAvatars();
    // Newly allocated nodes: refresh the in-puzzle tracker so it picks up
    // newly relevant effects at once (no init() - that would reset the
    // per-level counters mid-puzzle).
    try {
        if (typeof PassiveTracker !== 'undefined' && PassiveTracker.refreshVisibility) {
            PassiveTracker.refreshVisibility();
        }
    } catch (e) {}
    _ptOverlayResume();
}

// K keybind: toggles the tree over a running puzzle, or opens it from menu
// screens (existing return-screen behaviour untouched there).
// NOTE: unlike ability hotkeys this deliberately does NOT use
// _abilityHotkeysBlocked() - that gate blocks classless characters, but the
// tree needs no class (same reason B opens the sheet classless). Only real
// blockers are checked: modals, question overlays, text input (already
// filtered by the dispatcher) and death.
// Phase 3 step 5: this file now evaluates as a module BEFORE keybinds.js
    // (classic load order had it after), so the guard below was always true at
    // eval time and would now silently be false. Defer to DOMContentLoaded -
    // by then the full global surface exists and gameplay has not started
    // (same pattern as tutorial-quest.js's _tqIntegrate). NOTE: deferred
    // module scripts execute at readyState 'interactive', so 'loading' alone
    // is not enough - both pre-complete states must wait (the skill-hotbar P
    // bug was this exact miss).
    if (typeof document !== 'undefined' && document.readyState !== 'complete') {
        document.addEventListener('DOMContentLoaded', _ptWireKeybinds);
    } else {
        _ptWireKeybinds();
    }
    export function _ptWireKeybinds() {
    if (typeof globalThis.onKeybindAction === 'function') {
    globalThis.onKeybindAction('passive-tree', () => {
        // Toggle-close: the tree screen is not a .modal-bg, so the shared
        // hotkey gate would not know about it - check first, like P does.
        try {
            if (document.getElementById('screen-passive-tree')?.classList.contains('active')) {
                ptGoBack();
                return false;
            }
        } catch (e) {}
        // The character-sheet overlay owns its own stack (its tree button is
        // hidden by design) - B closes it first, K stays out of the way.
        try {
            if (typeof globalThis.isHubGameOverlay === 'function' && globalThis.isHubGameOverlay()) return false;
        } catch (e) {}
        // A question modal (quiz / math gate / scouts primer) is a fixed
        // overlay that would float above the tree screen - answer it first.
        try {
            if (document.getElementById('quiz-overlay')?.classList.contains('show')) return false;
            if (document.getElementById('mg-modal')?.classList.contains('show')) return false;
            if (document.getElementById('primer-overlay')) return false;
        } catch (e) {}
        // Any modal backdrop (spell book, pause dialogs, ...) owns the keys.
        try {
            if (document.querySelector('.modal-bg.show, .cs-overlay.show, #class-selection-overlay.show')) return false;
        } catch (e) {}
        try { if (typeof globalThis.dead !== 'undefined' && globalThis.dead) return false; } catch (e) {}
        // Overlay open: only from a live game screen. Any other screen
        // (mode-select, Nexus, level select, hub, ...) keeps the menu path -
        // with the CURRENT screen as the return target, so a stale
        // _ptReturnScreen (e.g. 'screen-game' left over from an earlier
        // overlay open) can never strand the BACK button.
        const gameActive = document.getElementById('screen-game')?.classList.contains('active');
        if (gameActive && typeof globalThis.cur !== 'undefined' && globalThis.cur) {
            try { openTreeFromGame(); } catch (e) {}
            return false;
        }
        try {
            const activeId = document.querySelector('.screen.active')?.id;
            showPassiveTree(activeId || undefined);
        } catch (e) { try { showPassiveTree(); } catch (e2) {} }
        return false;
    });
    }
}


//------------------------------------------------------------------------
//-------------------ITEM GRANT HELPER------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Creates one item instance from a definition ID and adds it to the
// player's inventory. Saves state and refreshes the inventory panel.
// Does nothing if the defId does not exist in ITEM_DEFS.
export function _ptGrantItem(defId) {
    const def = globalThis.ITEM_DEFS[defId];
    if (!def) return;

    globalThis.STATE.inventory.push({
        uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        defId: defId,
    });

    save();
    globalThis.buildInventoryPanel();
}


//------------------------------------------------------------------------
//-------------------LEVEL COMPLETE REWARD HELPERS------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Shared roll for a single gear-node bonus drop: if the player has the
// given skill and the chance hits, grants the item and shows a toast.
// Used by the per-class reward helpers below to avoid repeating the
// hasSkill/random/grant/toast pattern for every gear node.
export function _ptRollGearReward(skillStatKey, chance, itemDefId, msgKey) {
    if (!ptHasSkill(skillStatKey) || Math.random() >= chance) return;

    _ptGrantItem(itemDefId);
    globalThis.showToast(t(msgKey));
}

// Statistician gear drops - base gear: 33% magnifier, improved: 33% error gem
export function _ptApplyStatisticianRewards() {
    _ptRollGearReward('gear_of_the_statistician', 0.33, 'reveal2',
        'pt_gear_statistician_magnifier');

    _ptRollGearReward('improved_gear_of_the_statistician', 0.33, 'markWrong8',
        'pt_gear_statistician_errorgem');
}

// Mathmagician gear drops - base gear: 25% professor, improved: 15% chronobolt
export function _ptApplyMathmagicianRewards() {
    _ptRollGearReward('gear_of_the_mathmagician', 0.25, 'tutor4',
        'pt_gear_mathmagician_professor');

    _ptRollGearReward('improved_gear_of_the_mathmagician', 0.15, 'addTime900',
        'pt_gear_mathmagician_chronobolt');
}

// Probabilist gear drops - base gear: 25% sweeper, improved: 15% error magnet
export function _ptApplyProbabilistRewards() {
    _ptRollGearReward('gear_of_the_probabilist', 0.25, 'markWrong4',
        'pt_gear_probabilist_sweeper');

    _ptRollGearReward('improved_gear_of_the_probabilist', 0.15, 'markWrong6',
        'pt_gear_probabilist_errormagnet');
}


//------------------------------------------------------------------------
//-------------------LEVEL COMPLETE REWARDS (MAIN)------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Called when the player completes a level.
// Routes to the correct per-class reward helper based on STATE.playerClass.
// Each class has its own gear nodes that provide randomised item drops.
export function _ptApplyLevelCompleteRewards() {
    switch (globalThis.STATE.playerClass) {
        case 'statistician': _ptApplyStatisticianRewards(); break;
        case 'mathmagician': _ptApplyMathmagicianRewards(); break;
        case 'probabilist': _ptApplyProbabilistRewards(); break;
    }
}