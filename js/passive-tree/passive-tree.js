//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Special node IDs
// The Start node is always considered reachable / pre-allocated.
// Set PT_START_ID to match the "id" of your Start node in passive-tree-data.js
const PT_START_ID = 1;

// Layout dimensions
const PT_NODE_RADIUS = 22;
const PT_PADDING = 80;
const PT_CONN_WIDTH = 2;

// Zoom limits and step size
const PT_ZOOM_MIN = 0.25;
const PT_ZOOM_MAX = 3.0;
const PT_ZOOM_STEP = 0.12;

// Node colours — one set per state: locked / unlocked / allocated / start
const PT_COL_LOCKED_BG = '#111120';
const PT_COL_LOCKED_BORDER = '#3a3350';
const PT_COL_LOCKED_DOT = '#3a3350';
const PT_COL_UNLOCKED_BG = '#1a1a2e';
const PT_COL_UNLOCKED_BORDER = '#b89a50';
const PT_COL_UNLOCKED_DOT = '#b89a50';
const PT_COL_ALLOCATED_BG = '#1e2a10';
const PT_COL_ALLOCATED_BORDER = '#6dbf40';
const PT_COL_ALLOCATED_DOT = '#6dbf40';
const PT_COL_START = '#ffd700';

// Connection line colours — one per state
const PT_CONN_LOCKED = 'rgba(80,70,110,0.3)';
const PT_CONN_UNLOCKED = 'rgba(160,130,80,0.45)';
const PT_CONN_ALLOCATED = 'rgba(109,191,64,0.7)';

// Tracks which screen — and, if applicable, which world — to return to
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
function _ptInitSkills() {
    _pt_skills = TALENT_TREE_DATA.nodes.map(n => ({
        id: n.id,
        x: n.x,
        y: n.y,
        name: n.nameEn,    // used as the fallback display name
        image: n.icon || '',
        _def: n,           // full node definition kept for tooltip access
    }));

    _pt_skillMap = {};
    _pt_skills.forEach(s => { _pt_skillMap[s.id] = s; });
}

// Maps TALENT_TREE_DATA.connections into internal connection objects.
function _ptInitConnections() {
    _pt_conns = TALENT_TREE_DATA.connections.map(c => ({
        id: c.id,
        from: c.from,
        to: c.to,
        dotted: !!c.dotted,
    }));
}

// _ptInitTreeData — called once when the script loads.
// Populates all shared tree state from the TALENT_TREE_DATA constant.
function _ptInitTreeData() {
    _ptInitSkills();
    _ptInitConnections();
}

// Initialise immediately on script load.
_ptInitTreeData();


//------------------------------------------------------------------------
//-------------------PT MODULE--------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// PT is a lightweight module that exposes the public API used by the UI.
// Tree data is loaded once at startup above — PT itself has no data
// management responsibility, only rendering and skill lookup.

const PT = (() => {
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
function _ptShowLoadingPlaceholder(lang) {
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
function _ptUpdatePointsDisplay(lang, points) {
    const pointsEl = document.getElementById('pt-points');
    if (!pointsEl) return;

    pointsEl.textContent = t('pt_points_available').replace('{n}', points);
}

// buildPassiveTreeScreen — entry point called by the UI.
// Updates the points counter, shows a brief loading state,
// then triggers the full tree render.
function buildPassiveTreeScreen() {
    const lang = (typeof LANG !== 'undefined') ? LANG : 'en';
    const points = (typeof STATE !== 'undefined' && STATE.passiveTreePoints) || 0;

    _ptUpdatePointsDisplay(lang, points);
    _ptShowLoadingPlaceholder(lang);
    PT.reload();
}

// Opens the Probability Tree screen, remembering the current screen
// (via _ptReturnScreen / _ptReturnWorldIndex) so ptGoBack() can restore it.
// An optional returnScreen argument (e.g. 'screen-endgame-hub') overrides
// the return target — used when the tree is opened from the endgame hub.
function showPassiveTree(returnScreen) {
    if (typeof returnScreen === 'string') _ptReturnScreen = returnScreen;
    buildPassiveTreeScreen();
    screenHistory.push(_ptReturnScreen);
    switchScreen('screen-passive-tree');
}

// Called by the Probability Tree's BACK button (see ui-events.js).
// Unlike the generic goToPreviousScreen()/switchScreen() combo, this
// re-runs the actual screen-build function for the destination so that
// updated STATE.done / sprite position are reflected immediately.
function ptGoBack() {
    screenHistory.pop(); // discard the entry showPassiveTree() pushed

    if (_ptReturnScreen === 'screen-world-detail' && _ptReturnWorldIndex !== null) {
        showWorldDetail(_ptReturnWorldIndex);
    } else if (_ptReturnScreen === 'screen-map-view') {
        showMapView();
    } else if (_ptReturnScreen === 'screen-endgame-hub' && typeof showEndgameHub === 'function') {
        showEndgameHub();
    } else {
        switchScreen(_ptReturnScreen);
        if (typeof renderLevelSelect === 'function') renderLevelSelect();
    }
}


//------------------------------------------------------------------------
//-------------------ITEM GRANT HELPER------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Creates one item instance from a definition ID and adds it to the
// player's inventory. Saves state and refreshes the inventory panel.
// Does nothing if the defId does not exist in ITEM_DEFS.
function _ptGrantItem(defId) {
    const def = ITEM_DEFS[defId];
    if (!def) return;

    STATE.inventory.push({
        uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        defId: defId,
    });

    save();
    buildInventoryPanel();
}


//------------------------------------------------------------------------
//-------------------LEVEL COMPLETE REWARD HELPERS------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Shared roll for a single gear-node bonus drop: if the player has the
// given skill and the chance hits, grants the item and shows a toast.
// Used by the per-class reward helpers below to avoid repeating the
// hasSkill/random/grant/toast pattern for every gear node.
function _ptRollGearReward(skillStatKey, chance, itemDefId, msgKey) {
    if (!ptHasSkill(skillStatKey) || Math.random() >= chance) return;

    _ptGrantItem(itemDefId);
    showToast(t(msgKey));
}

// Statistician gear drops — base gear: 33% magnifier, improved: 33% error gem
function _ptApplyStatisticianRewards() {
    _ptRollGearReward('gear_of_the_statistician', 0.33, 'reveal2',
        'pt_gear_statistician_magnifier');

    _ptRollGearReward('improved_gear_of_the_statistician', 0.33, 'markWrong8',
        'pt_gear_statistician_errorgem');
}

// Mathmagician gear drops — base gear: 25% professor, improved: 15% chronobolt
function _ptApplyMathmagicianRewards() {
    _ptRollGearReward('gear_of_the_mathmagician', 0.25, 'mistakeEraser4',
        'pt_gear_mathmagician_professor');

    _ptRollGearReward('improved_gear_of_the_mathmagician', 0.15, 'addTime900',
        'pt_gear_mathmagician_chronobolt');
}

// Probabilist gear drops — base gear: 25% sweeper, improved: 15% error magnet
function _ptApplyProbabilistRewards() {
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
function _ptApplyLevelCompleteRewards() {
    switch (STATE.playerClass) {
        case 'statistician': _ptApplyStatisticianRewards(); break;
        case 'mathmagician': _ptApplyMathmagicianRewards(); break;
        case 'probabilist': _ptApplyProbabilistRewards(); break;
    }
}