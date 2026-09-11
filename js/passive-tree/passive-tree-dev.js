//  passive-tree-dev.js
//  DEVELOPMENT SANDBOX PASSIVE TREE — deliberately NOT connected to gameplay.
//
//  Everything in this file is namespaced with _dpt_ / DPT_ so it can never
//  collide with the live passive tree (_pt_ / PT_). Allocations live in a
//  module-local Set persisted under their OWN localStorage key (never inside
//  the game save slots), no gameplay system reads from this tree, and no
//  achievements fire here. ptHasSkill() and the Convergence point pool are
//  untouched by design.
//
//  Node data comes from passive-tree-dev-data.js (same node syntax as the
//  live tree plus a 'tier' field, generated in a POE1-LIKE layout by
//  tools/generate-poe-layout-dev-data.py). The dev tree is currently in
//  LAYOUT MODE: real connections exist (wheel-and-spoke skeleton inherited
//  from the PoE1 tree data) but picking is display-only — allocations never
//  happen and no gameplay system reads from this tree. Real connections
//  will be hand-authored in "Passive Tree Editor.html" (project root) and
//  wired back into the game later.
//
//  Features:
//    • Category-cluster layout preview with cluster watermarks.
//    • Search bar (names / descriptions / statKeys, both languages).
//    • ♻ REFUND ALL and +10 POINTS sandbox controls (dev point pool is
//      independent of Convergence points on purpose).
//    • The full allocate / deallocate / branch-unspend machinery stays in
//      place and reactivates automatically once connections exist.
//
//  Load order in HTML: passive-tree-dev-data.js → passive-tree-dev.js



//------------------------------------------------------------------------
//---------------------------CONSTANTS & STATE----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// The Start node id — mirrors PT_START_ID in passive-tree.js.
const DPT_START_ID = 1;

// LAYOUT MODE: the PoE-style layout is a display preview. Connections are
// drawn and hover/tooltip works, but picking is disabled so nothing affects
// the (future) allocation state. Flip to false once connections are
// hand-authored and the tree should become playable in the sandbox.
const DPT_DISPLAY_ONLY = true;

// Sandbox starting pool of dev points (independent of Convergence).
const DPT_STARTING_POINTS = 100;

// localStorage key for the sandbox state (NOT part of the game saves).
const DPT_STORAGE_KEY = 'stoxels_dpt_sandbox_v2_poe_layout';

// Layout dimensions — mirrors the live tree.
const DPT_NODE_RADIUS = 22;
const DPT_PADDING = 80;

// Zoom limits and step size. MIN fits the full PoE-style world (~6600px wide)
// into a viewport on typical screens.
const DPT_ZOOM_MIN = 0.08;
const DPT_ZOOM_MAX = 3.0;
const DPT_ZOOM_STEP = 0.12;

// Node colours — one set per state: locked / unlocked / allocated / start.
const DPT_COL_LOCKED_BG = '#111120';
const DPT_COL_LOCKED_BORDER = '#3a3350';
const DPT_COL_LOCKED_DOT = '#3a3350';
const DPT_COL_UNLOCKED_BG = '#1a1a2e';
const DPT_COL_UNLOCKED_BORDER = '#b89a50';
const DPT_COL_UNLOCKED_DOT = '#b89a50';
const DPT_COL_ALLOCATED_BG = '#1e2a10';
const DPT_COL_ALLOCATED_BORDER = '#6dbf40';
const DPT_COL_ALLOCATED_DOT = '#6dbf40';
const DPT_COL_START = '#ffd700';

// Tree data + derived state (populated on script load / render).
let _dpt_skills = [];      // layout skill objects
let _dpt_skillMap = {};    // id → layout skill object
let _dpt_adjacency = {};   // id → Set of adjacent node ids (proximity k-NN)
let _dpt_links = [];       // [{ a, b }] unique undirected link list for drawing

// Sandbox allocation state (module-local, never touches STATE).
let _dpt_alloc = new Set([DPT_START_ID]);
let _dpt_points = DPT_STARTING_POINTS;

// DOM references + element caches (populated by _dptRender).
let _dpt_container = null;
let _dpt_world = null;
let _dpt_svg = null;
let _dpt_nodesLayer = null;
let _dpt_tooltip = null;
let _dpt_nodeEls = {};
let _dpt_connEls = {};

// Viewport transform state.
let _dpt_scale = 1.0;
let _dpt_tx = 0;
let _dpt_ty = 0;

// Pan / zoom gesture state.
let _dpt_dragging = false;
let _dpt_dragStartX = 0;
let _dpt_dragStartY = 0;
let _dpt_dragTxStart = 0;
let _dpt_dragTyStart = 0;
let _dpt_mouseDownTime = 0;
let _dpt_lastPinchDist = null;
let _dpt_abortController = null;
let _dpt_topbarBound = false;



//------------------------------------------------------------------------
//-------------------------LOCALIZATION HELPER-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the active UI language: 'de' or 'en'
function _dptLang() {
    return (typeof LANG !== 'undefined' && LANG === 'de') ? 'de' : 'en';
}



//------------------------------------------------------------------------
//----------------------TIER CLASSIFICATION--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// The dev tree uses an explicit 'tier' field on nodes when present
// ('start' | 'keystone' | 'notable' | 'travel' | 'small'), falling back to
// the statKey-prefix convention for real nodes without one.
function _dptIsKeystoneNode(def) {
    return !!(def && def.statKey && def.statKey.startsWith('keystone_'));
}

// Tier string used for sizing/shape:
// 'start' | 'keystone' | 'notable' | 'travel' | 'small' | 'node'
function _dptGetNodeTier(def) {
    if (def && def.tier) return def.tier;
    if (_dptIsKeystoneNode(def)) return 'keystone';
    if (def && def.statKey && def.statKey.startsWith('travel_')) return 'travel';
    return 'node';
}



//------------------------------------------------------------------------
//---------------------TREE DATA INITIALISATION----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Populates _dpt_skills / _dpt_skillMap from TALENT_TREE_DEV_DATA.
function _dptInitSkills() {
    _dpt_skills = TALENT_TREE_DEV_DATA.nodes.map(n => ({
        id: n.id,
        x: n.x,
        y: n.y,
        name: n.nameEn,
        image: n.icon || '',
        _def: n,
    }));
    _dpt_skillMap = {};
    _dpt_skills.forEach(s => { _dpt_skillMap[s.id] = s; });
}

// Builds the adjacency graph + link list from the generated connection data
// (inherited from the PoE1 tree skeleton). Each connection is {id, from, to}.
function _dptBuildAdjacency() {
    _dpt_adjacency = {};
    _dpt_skills.forEach(s => { _dpt_adjacency[s.id] = new Set(); });
    _dpt_links = [];
    const conns = (typeof TALENT_TREE_DEV_DATA !== 'undefined'
        && TALENT_TREE_DEV_DATA.connections) || [];
    const seen = new Set();
    conns.forEach(c => {
        const a = c.from, b = c.to;
        if (a == null || b == null || a === b) return;
        if (!_dpt_adjacency[a] || !_dpt_adjacency[b]) return;   // dangling guard
        _dpt_adjacency[a].add(b);
        _dpt_adjacency[b].add(a);
        const key = a < b ? a + ':' + b : b + ':' + a;
        if (!seen.has(key)) {
            seen.add(key);
            _dpt_links.push({ a, b });
        }
    });
}

// Initialises the data immediately on script load.
_dptInitSkills();



//------------------------------------------------------------------------
//--------------------------PERSISTENCE------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Loads the sandbox allocation state from its own storage key. Returns
// null when nothing (or something invalid) is stored.
function _dptLoadPersisted() {
    try {
        const raw = localStorage.getItem(DPT_STORAGE_KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== 'object') return null;
        return {
            points: Number.isFinite(obj.points) ? obj.points : DPT_STARTING_POINTS,
            allocated: Array.isArray(obj.allocated)
                ? obj.allocated.filter(id => Number.isFinite(id) && _dpt_skillMap[id])
                : [],
        };
    } catch (e) {
        return null;
    }
}

// Persists the sandbox state under its own key — deliberately NOT via the
// game's save() so save slots stay clean.
function _dptPersist() {
    try {
        localStorage.setItem(DPT_STORAGE_KEY, JSON.stringify({
            points: _dpt_points,
            allocated: [..._dpt_alloc],
        }));
    } catch (e) { /* storage unavailable — sandbox just won't persist */ }
}

// Restores the persisted sandbox state (called once when the screen opens).
// Allocation ids are sanitized against the current tree (stale ids from an
// older layout are dropped silently).
function _dptRestoreState() {
    const saved = _dptLoadPersisted();
    const validIds = new Set(_dpt_skills.map(s => s.id));
    if (saved) {
        _dpt_points = saved.points;
        _dpt_alloc = new Set((saved.allocated || []).filter(id => validIds.has(id)));
    } else {
        _dpt_points = DPT_STARTING_POINTS;
        _dpt_alloc = new Set([DPT_START_ID]);
    }
    // Start + class starts are permanent.
    _dpt_alloc.add(DPT_START_ID);
    _dpt_skills.forEach(s => {
        if (s._def && s._def.tier === 'start') _dpt_alloc.add(s.id);
    });
}



//------------------------------------------------------------------------
//-------------------------POINTS ACCOUNTING-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

function _dptSpendPoint() { _dpt_points = Math.max(0, _dpt_points - 1); _dptRefreshPointsDisplay(); }
function _dptRefundPoints(n) { _dpt_points += n; _dptRefreshPointsDisplay(); }

// Writes the available-points and allocated-count readouts.
function _dptRefreshPointsDisplay() {
    const pointsEl = document.getElementById('dpt-points');
    if (pointsEl) {
        pointsEl.textContent = t('dpt_points_available').replace('{n}', _dpt_points);
    }
    const countEl = document.getElementById('dpt-count');
    if (countEl) {
        countEl.textContent = t('dpt_count_label')
            .replace('{a}', _dpt_alloc.size)
            .replace('{b}', _dpt_skills.length);
    }
}



//------------------------------------------------------------------------
//-------------------------GRAPH TRAVERSAL---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// BFS over allocated nodes starting from startId. `availableSet` restricts
// both traversal and membership (mirrors the live tree's helper).
function _dptBfsReachable(startId, availableSet) {
    const visited = new Set();
    const queue = [startId];
    while (queue.length) {
        const cur = queue.pop();
        if (visited.has(cur)) continue;
        visited.add(cur);
        const adj = _dpt_adjacency[cur] || new Set();
        for (const nb of adj) {
            if (availableSet.has(nb) && !visited.has(nb)) queue.push(nb);
        }
    }
    return visited;
}



//------------------------------------------------------------------------
//---------------------UNLOCK / DE-ALLOCATE RULES--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// A node is UNLOCKABLE when it is not allocated and at least one adjacent
// node is allocated (or it is the Start node). Start-tier nodes (class
// starts) are permanently allocated and never unlockable.
function _dptIsUnlockable(id) {
    if (_dpt_alloc.has(id)) return false;
    if (id === DPT_START_ID) return true;
    const skill = _dpt_skillMap[id];
    if (skill && skill._def && skill._def.tier === 'start') return false;
    const neighbours = _dpt_adjacency[id] || new Set();
    for (const nb of neighbours) {
        if (_dpt_alloc.has(nb)) return true;
    }
    return false;
}

function _dptIsAllocated(id) {
    return _dpt_alloc.has(id);
}

// A node can be DE-ALLOCATED when removing it would NOT strand any other
// allocated node (same rule as the live tree).
function _dptIsDeallocatable(id) {
    if (!_dpt_alloc.has(id)) return false;
    if (id === DPT_START_ID) return false;
    const skill = _dpt_skillMap[id];
    if (skill && skill._def && skill._def.tier === 'start') return false;

    const testSet = new Set(_dpt_alloc);
    testSet.delete(id);
    if (!testSet.has(DPT_START_ID)) return true;

    const reachable = _dptBfsReachable(DPT_START_ID, testSet);
    for (const allocatedId of testSet) {
        if (!reachable.has(allocatedId)) return false;
    }
    return true;
}



//------------------------------------------------------------------------
//-----------------CLICK HANDLERS — ALLOC / DEALLOC / BRANCH---------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Normal click on an allocated node: deallocate when safe.
function _dptHandleDeallocation(id) {
    if (!_dptIsDeallocatable(id)) return false;
    _dpt_alloc.delete(id);
    _dptRefundPoints(1);
    _dptPersist();
    _dptRefreshAllStyles();
    return true;
}

// Normal click on an unlockable node: allocate when points remain.
function _dptHandleAllocation(id) {
    if (!_dptIsUnlockable(id)) return;
    if (_dpt_points < 1) return;
    _dpt_alloc.add(id);
    _dptSpendPoint();
    _dptPersist();
    _dptRefreshAllStyles();
}

// Shift+Click / Right-Click on an allocated node: unspend the node AND
// every allocation that would be stranded by its removal (branch respec).
function _dptUnspendBranch(id) {
    if (DPT_DISPLAY_ONLY) return;          // layout mode: nothing to unspend
    if (!_dpt_alloc.has(id) || id === DPT_START_ID) return;

    const testSet = new Set(_dpt_alloc);
    testSet.delete(id);
    const reachable = _dptBfsReachable(DPT_START_ID, testSet);
    const toRemove = [...testSet].filter(x => !reachable.has(x));
    toRemove.push(id);

    toRemove.forEach(x => _dpt_alloc.delete(x));
    _dptRefundPoints(toRemove.length);
    _dptPersist();
    _dptRefreshAllStyles();
    showToast(t('dpt_unspent_branch').replace('{n}', toRemove.length));
}

// Entry point for a plain left click on a node.
function _dptOnNodeClick(id) {
    if (DPT_DISPLAY_ONLY) return;          // layout mode: hover/tooltip only
    if (_dptIsAllocated(id)) {
        _dptHandleDeallocation(id);
        return;
    }
    _dptHandleAllocation(id);
}



//------------------------------------------------------------------------
//-------------------------VISUAL STATE QUERY------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns 'allocated' | 'unlockable' | 'locked' for a node id.
function _dptGetNodeVisualState(id) {
    if (_dptIsAllocated(id)) return 'allocated';
    if (DPT_DISPLAY_ONLY) {
        // Layout mode: show every node in its allocated tier colour so the
        // full PoE-style silhouette is readable. (Nothing is pickable.)
        return 'allocated';
    }
    if (_dptIsUnlockable(id)) return 'unlockable';
    return 'locked';
}



//------------------------------------------------------------------------
//-------------------------STYLE HELPERS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// --- allocated ---
function _dptStylePropsAllocated(tier) {
    if (tier === 'start') {
        // Start + class starts: permanently allocated, golden.
        return {
            bg: 'radial-gradient(circle at 50% 35%, #2d2306 0%, #171004 60%, #0d0900 100%)',
            border: '3px solid #ffd700',
            shadow: '0 0 14px rgba(255,215,0,0.55), inset 0 0 0 2px rgba(255,215,0,0.25)',
            dotColor: '#ffd700',
            cursor: 'default',
        };
    }
    if (tier === 'keystone') {
        return {
            bg: 'radial-gradient(circle at 50% 35%, #2a1804 0%, #140a00 60%, #0d0600 100%)',
            border: '3px solid #e8a020',
            shadow: '0 0 16px rgba(232,160,32,0.8), 0 0 4px rgba(232,160,32,0.5), '
                  + 'inset 0 0 0 2px rgba(232,160,32,0.35), inset 0 0 8px rgba(0,0,0,0.6)',
            dotColor: '#e8a020',
            cursor: 'pointer',
        };
    }
    if (tier === 'travel') {
        return {
            bg: '#16220e',
            border: `2px solid ${DPT_COL_ALLOCATED_BORDER}`,
            shadow: '0 0 6px rgba(109,191,64,0.4)',
            dotColor: DPT_COL_ALLOCATED_DOT,
            cursor: 'pointer',
        };
    }
    if (tier === 'notable') {
        return {
            bg: '#2a2410',
            border: '2px solid #d4b040',
            shadow: '0 0 10px rgba(212,176,64,0.5), inset 0 0 0 1px rgba(212,176,64,0.3)',
            dotColor: '#d4b040',
            cursor: 'default',
        };
    }
    if (tier === 'small') {
        return {
            bg: '#16220e',
            border: '2px solid #4f7a38',
            shadow: 'none',
            dotColor: '#4f7a38',
            cursor: 'default',
        };
    }
    return {
        bg: DPT_COL_ALLOCATED_BG,
        border: `2px solid ${DPT_COL_ALLOCATED_BORDER}`,
        shadow: '0 0 12px rgba(109,191,64,0.6), inset 0 0 0 1px rgba(109,191,64,0.35), inset 0 0 4px rgba(0,0,0,0.3)',
        dotColor: DPT_COL_ALLOCATED_DOT,
        cursor: 'pointer',
    };
}
function _dptStylePropsUnlockable(isStart, tier) {
    if (isStart || tier === 'start') {
        return {
            bg: DPT_COL_UNLOCKED_BG,
            border: `3px solid ${DPT_COL_START}`,
            shadow: '0 0 12px rgba(255,215,0,0.6), inset 0 0 6px rgba(255,215,0,0.15)',
            dotColor: DPT_COL_START,
            cursor: 'pointer',
        };
    }
    if (tier === 'keystone') {
        return {
            bg: 'radial-gradient(circle at 50% 35%, #201203 0%, #0f0700 60%, #0a0400 100%)',
            border: '3px solid #c07818',
            shadow: '0 0 10px rgba(192,120,24,0.5), inset 0 0 0 2px rgba(192,120,24,0.3), inset 0 0 8px rgba(0,0,0,0.6)',
            dotColor: '#c07818',
            cursor: 'pointer',
        };
    }
    if (tier === 'travel') {
        return {
            bg: '#151522',
            border: '2px solid #7a6a42',
            shadow: 'none',
            dotColor: '#7a6a42',
            cursor: 'pointer',
        };
    }
    if (tier === 'notable') {
        return {
            bg: '#1c1810',
            border: '2px solid #a08428',
            shadow: '0 0 7px rgba(160,132,40,0.35)',
            dotColor: '#a08428',
            cursor: 'pointer',
        };
    }
    return {
        bg: DPT_COL_UNLOCKED_BG,
        border: `2px solid ${DPT_COL_UNLOCKED_BORDER}`,
        shadow: '0 0 7px rgba(184,154,80,0.4), inset 0 0 0 1px rgba(184,154,80,0.3), inset 0 0 4px rgba(0,0,0,0.4)',
        dotColor: DPT_COL_UNLOCKED_DOT,
        cursor: 'pointer',
    };
}

// --- locked ---
function _dptStylePropsLocked() {
    return {
        bg: DPT_COL_LOCKED_BG,
        border: `2px solid ${DPT_COL_LOCKED_BORDER}`,
        shadow: 'none',
        dotColor: DPT_COL_LOCKED_DOT,
        cursor: 'not-allowed',
    };
}

// Tier caption + colors for the tooltip (start/keystone/notable/travel/small).
function _dptTierCaptionHtml(tier, lang) {
    if (tier === 'start') {
        const label = lang === 'de' ? 'KLASSENSTART' : 'CLASS START';
        return `<div style="font-size:10px;letter-spacing:1.5px;color:#ffd700;margin-bottom:3px;">${label}</div>`;
    }
    if (tier === 'keystone') {
        return `<div style="font-size:10px;letter-spacing:1.5px;color:#e8a020;margin-bottom:3px;">${t('dpt_node_keystone')}</div>`;
    }
    if (tier === 'notable') {
        const label = lang === 'de' ? 'NOTABLE' : 'NOTABLE';
        return `<div style="font-size:10px;letter-spacing:1.5px;color:#d4b040;margin-bottom:3px;">${label}</div>`;
    }
    if (tier === 'small') {
        const label = lang === 'de' ? 'KLEINER PASSIV' : 'SMALL PASSIVE';
        return `<div style="font-size:10px;letter-spacing:1.5px;color:#5a7a48;margin-bottom:3px;">${label}</div>`;
    }
    return '';   // travel + node tiers stay uncaptioned (as before)
}

// Picks the correct style props for the node's current state + tier.
function _dptResolveNodeStyleProps(id) {
    const isStart = (id === DPT_START_ID);
    const state = _dptGetNodeVisualState(id);
    const skill = _dpt_skillMap[id];
    const tier = _dptGetNodeTier(skill ? skill._def : null);

    switch (state) {
        case 'allocated': return _dptStylePropsAllocated(tier);
        case 'unlockable': return _dptStylePropsUnlockable(isStart, tier);
        default: return _dptStylePropsLocked();
    }
}

// Applies pre-resolved style props to a node element (locked → dimmed).
function _dptApplyNodeStyle(id) {
    const el = _dpt_nodeEls[id];
    if (!el) return;

    const state = _dptGetNodeVisualState(id);
    const props = _dptResolveNodeStyleProps(id);

    el.style.background = props.bg;
    el.style.border = props.border;
    el.style.boxShadow = props.shadow;
    el.style.cursor = props.cursor;
    el.style.opacity = state === 'locked' ? '0.45' : '1';

    const dot = el.querySelector('div.pt-dot');
    if (dot) dot.style.background = props.dotColor;
}

// Refreshes every node after any allocation change.
function _dptRefreshAllStyles() {
    _dpt_skills.forEach(s => _dptApplyNodeStyle(s.id));
    _dptRefreshPointsDisplay();
}



//------------------------------------------------------------------------
//---------------------------BOUNDS & CAMERA-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Axis-aligned bounding box of all node positions.
function _dptGetBounds() {
    if (!_dpt_skills.length) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    _dpt_skills.forEach(s => {
        if (s.x < minX) minX = s.x;
        if (s.y < minY) minY = s.y;
        if (s.x > maxX) maxX = s.x;
        if (s.y > maxY) maxY = s.y;
    });
    return { minX, minY, maxX, maxY };
}

// Shared skill-space → pixel offset for nodes and links.
function _dptComputeOffsets(bounds) {
    return {
        offsetX: DPT_PADDING + DPT_NODE_RADIUS - bounds.minX,
        offsetY: DPT_PADDING + DPT_NODE_RADIUS - bounds.minY,
    };
}

function _dptClampScale(rawScale) {
    return Math.min(DPT_ZOOM_MAX, Math.max(DPT_ZOOM_MIN, rawScale));
}

function _dptZoomToward(newScale, pivotX, pivotY) {
    const ratio = newScale / _dpt_scale;
    _dpt_tx = pivotX - ratio * (pivotX - _dpt_tx);
    _dpt_ty = pivotY - ratio * (pivotY - _dpt_ty);
    _dpt_scale = newScale;
}

function _dptSyncZoomBar() {
    const bar = document.getElementById('dpt-zoom-bar');
    if (bar) {
        const pct = (_dpt_scale - DPT_ZOOM_MIN) / (DPT_ZOOM_MAX - DPT_ZOOM_MIN);
        bar.value = Math.round(pct * 100);
    }
    const label = document.getElementById('dpt-zoom-label');
    if (label) label.textContent = Math.round(_dpt_scale * 100) + '%';
}

function _dptApplyTransform() {
    if (_dpt_world) {
        _dpt_world.style.transform =
            `translate(${_dpt_tx}px, ${_dpt_ty}px) scale(${_dpt_scale})`;
    }
    _dptSyncZoomBar();
}

// Fits the whole tree into the container (centred, no magic offsets —
// the dev tree has no "start corner" to anchor on).
function _dptFitToView(bounds) {
    const treeW = bounds.maxX - bounds.minX + DPT_PADDING * 2 + DPT_NODE_RADIUS * 2;
    const treeH = bounds.maxY - bounds.minY + DPT_PADDING * 2 + DPT_NODE_RADIUS * 2;
    const cW = _dpt_container.clientWidth || 800;
    const cH = _dpt_container.clientHeight || 600;

    // Fit the whole world into the viewport (PoE-style: you start zoomed out).
    _dpt_scale = Math.min(
        DPT_ZOOM_MAX,
        Math.max(DPT_ZOOM_MIN, Math.min(cW / treeW, cH / treeH))
    );
    const scaledW = treeW * _dpt_scale;
    const scaledH = treeH * _dpt_scale;

    // Node coordinates already include the padding offset (see
    // _dptComputeOffsets), so the world spans [0, treeW]×[0, treeH] —
    // plain centering is correct here. No extra offset term.
    _dpt_tx = (cW - scaledW) / 2;
    _dpt_ty = (cH - scaledH) / 2;
    _dptApplyTransform();
}



//------------------------------------------------------------------------
//-------------------------VIEWPORT INPUT----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

function _dptOnWheel(e) {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    const factor = 1 + dir * DPT_ZOOM_STEP;
    const newScale = _dptClampScale(_dpt_scale * factor);
    const rect = _dpt_container.getBoundingClientRect();
    _dptZoomToward(newScale, e.clientX - rect.left, e.clientY - rect.top);
    _dptApplyTransform();
}

function _dptOnMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.pt-node')) return;
    _dpt_dragging = true;
    _dpt_dragStartX = e.clientX;
    _dpt_dragStartY = e.clientY;
    _dpt_dragTxStart = _dpt_tx;
    _dpt_dragTyStart = _dpt_ty;
    _dpt_container.style.cursor = 'grabbing';
}

function _dptOnMouseMove(e) {
    if (!_dpt_dragging) return;
    _dpt_tx = _dpt_dragTxStart + (e.clientX - _dpt_dragStartX);
    _dpt_ty = _dpt_dragTyStart + (e.clientY - _dpt_dragStartY);
    _dptApplyTransform();
}

function _dptOnMouseUp() {
    if (!_dpt_dragging) return;
    _dpt_dragging = false;
    _dpt_container.style.cursor = 'grab';
}

function _dptTouchDistance(touches) {
    return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
    );
}

function _dptOnTouchStart(e) {
    if (e.touches.length === 1) {
        _dpt_dragging = true;
        _dpt_dragStartX = e.touches[0].clientX;
        _dpt_dragStartY = e.touches[0].clientY;
        _dpt_dragTxStart = _dpt_tx;
        _dpt_dragTyStart = _dpt_ty;
    }
    if (e.touches.length === 2) {
        _dpt_dragging = false;
        _dpt_lastPinchDist = _dptTouchDistance(e.touches);
    }
}

function _dptOnTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && _dpt_dragging) {
        _dpt_tx = _dpt_dragTxStart + (e.touches[0].clientX - _dpt_dragStartX);
        _dpt_ty = _dpt_dragTyStart + (e.touches[0].clientY - _dpt_dragStartY);
        _dptApplyTransform();
    }
    if (e.touches.length === 2 && _dpt_lastPinchDist !== null) {
        const dist = _dptTouchDistance(e.touches);
        const factor = dist / _dpt_lastPinchDist;
        _dpt_scale = _dptClampScale(_dpt_scale * factor);
        _dpt_lastPinchDist = dist;
        _dptApplyTransform();
    }
}

function _dptOnTouchEnd() {
    _dpt_dragging = false;
    _dpt_lastPinchDist = null;
}

// Registers all viewport listeners. Re-calls remove the previous set via
// AbortController. The zoom-bar lives in the (static) topbar and is bound
// exactly once by _dptBindTopbarButtons.
function _dptBindViewportEvents() {
    if (_dpt_abortController) _dpt_abortController.abort();
    _dpt_abortController = new AbortController();

    _dpt_container.addEventListener('wheel', _dptOnWheel, { passive: false });
    _dpt_container.addEventListener('mousedown', _dptOnMouseDown);
    window.addEventListener('mousemove', _dptOnMouseMove, { signal: _dpt_abortController.signal });
    window.addEventListener('mouseup', _dptOnMouseUp, { signal: _dpt_abortController.signal });
    _dpt_container.addEventListener('touchstart', _dptOnTouchStart, { passive: true });
    _dpt_container.addEventListener('touchmove', _dptOnTouchMove, { passive: false });
    _dpt_container.addEventListener('touchend', _dptOnTouchEnd);
    _dpt_container.addEventListener('click', () => _dptHideTooltip());
}



//------------------------------------------------------------------------
//---------------------------TOOLTIP---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

function _dptCreateTooltip() {
    const tt = document.createElement('div');
    tt.id = 'dpt-tooltip';
    tt.style.cssText = `
        position: fixed;
        z-index: 9999;
        pointer-events: none;
        max-width: 350px;
        background: rgba(10,10,20,0.97);
        border: 1px solid rgba(184,154,80,0.5);
        border-radius: 6px;
        padding: 10px 13px;
        font-family: var(--PX, monospace);
        font-size: 12px;
        color: #d4b870;
        box-shadow: 0 4px 18px rgba(0,0,0,0.7);
        line-height: 1.5;
        opacity: 0;
        transition: opacity 0.1s;
    `;
    document.body.appendChild(tt);
    return tt;
}

function _dptPositionTooltip(mx, my) {
    if (!_dpt_tooltip) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const tw = _dpt_tooltip.offsetWidth || 260;
    const th = _dpt_tooltip.offsetHeight || 100;
    const PAD = 14;

    let x = mx + PAD;
    let y = my - th / 2;
    if (x + tw > W - PAD) x = mx - tw - PAD;
    if (y < PAD) y = PAD;
    if (y + th > H - PAD) y = H - th - PAD;

    _dpt_tooltip.style.left = `${x}px`;
    _dpt_tooltip.style.top = `${y}px`;
}

function _dptShowTooltip(id, mouseX, mouseY) {
    if (!_dpt_tooltip) _dpt_tooltip = _dptCreateTooltip();
    _dpt_tooltip.innerHTML = _dptTooltipBuildHtml(id);
    _dptPositionTooltip(mouseX, mouseY);
    _dpt_tooltip.style.opacity = '1';
}

function _dptHideTooltip() {
    if (_dpt_tooltip) _dpt_tooltip.style.opacity = '0';
}

// Localised name / description helpers.
function _dptTooltipResolveName(skill, def, lang) {
    const pick = (en, de) => (lang === 'de' ? (de || en) : en);
    if (def) return pick(def.nameEn, def.nameDe);
    return skill ? skill.name : t('pt_skill_fallback').replace('{n}', skill ? skill.id : '?');
}

function _dptTooltipResolveDesc(def, lang) {
    if (!def) return '';
    const raw = lang === 'de' ? (def.descDe || def.descEn) : def.descEn;
    return raw ? raw.replace(/\n/g, '<br>') : '';
}

// Status line at the bottom of the tooltip.
function _dptTooltipBuildStatusHtml(id, state, lang) {
    if (DPT_DISPLAY_ONLY) {
        return `<div style="margin-top:7px;font-size:11px;color:#888;">LAYOUT PREVIEW — picking disabled</div>`;
    }
    if (state === 'allocated') {
        if (id === DPT_START_ID) {
            return `<div style="margin-top:7px;font-size:11px;color:#888;">${t('dpt_tooltip_start_node')}</div>`;
        }
        if (_dptIsDeallocatable(id)) {
            return `<div style="margin-top:7px;font-size:11px;color:#6dbf40;">${t('dpt_tooltip_active_removable')}</div>`;
        }
        return `<div style="margin-top:7px;font-size:11px;color:#c08030;">${t('dpt_tooltip_active_branch')}</div>`;
    }

    if (state === 'unlockable') {
        const noPoints = _dpt_points < 1;
        const color = noPoints ? '#c08030' : '#b89a50';
        const text = noPoints
            ? t('dpt_tooltip_no_points')
            : t('dpt_tooltip_click_unlock');
        return `<div style="margin-top:7px;font-size:11px;color:${color};">${text}</div>`;
    }

    return `<div style="margin-top:7px;font-size:11px;color:#555;">${t('dpt_tooltip_locked')}</div>`;
}

// Full tooltip HTML: tier caption (CLASS START / KEYSTONE / NOTABLE / SMALL
// PASSIVE / NODE), name, description, status.
function _dptTooltipBuildHtml(id) {
    const skill = _dpt_skillMap[id];
    const def = skill ? skill._def : null;
    const lang = _dptLang();
    const state = _dptGetNodeVisualState(id);

    const name = _dptTooltipResolveName(skill, def, lang);
    const desc = _dptTooltipResolveDesc(def, lang);
    const statusHtml = _dptTooltipBuildStatusHtml(id, state, lang);

    const tier = _dptGetNodeTier(def);
    let typeHtml = _dptTierCaptionHtml(tier, lang);
    if (!typeHtml && tier !== 'travel') {
        typeHtml = `<div style="font-size:10px;letter-spacing:1.5px;color:#93a7bd;margin-bottom:3px;">${t('dpt_node_node')}</div>`;
    }

    return `
        ${typeHtml}
        <div style="font-size:13px;font-weight:bold;color:#66fcf1;margin-bottom:5px;">${name}</div>
        ${desc ? `<div style="color:#bba870;">${desc}</div>` : ''}
        <div style="margin-top:6px;font-size:10px;letter-spacing:0.5px;color:#7d8da1;">ID ${id}${def && def.statKey ? ' · ' + def.statKey : ''}</div>
        ${statusHtml}
    `;
}



//------------------------------------------------------------------------
//---------------------------DRAWING---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Base CSS layout for a circular node.
function _dptApplyCircleShape(node, cx, cy, r) {
    node.style.cssText = `
        position: absolute;
        left: ${cx - r}px;
        top:  ${cy - r}px;
        width:  ${r * 2}px;
        height: ${r * 2}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, box-shadow 0.15s, transform 0.12s, opacity 0.15s;
        z-index: 2;
        box-sizing: border-box;
    `;
}

// Base CSS layout for a keystone (rotated-square) node.
function _dptApplyDiamondShape(node, cx, cy, r) {
    const side = r * 2 * 0.92;
    node.style.cssText = `
        position: absolute;
        left: ${cx - side / 2}px;
        top:  ${cy - side / 2}px;
        width:  ${side}px;
        height: ${side}px;
        border-radius: 4px;
        transform: rotate(45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, box-shadow 0.15s, transform 0.12s, opacity 0.15s;
        z-index: 2;
        box-sizing: border-box;
    `;
}

// Counter-rotates a keystone child so its icon stays upright.
function _dptCounterRotateKeystoneChild(node) {
    const inner = node.firstChild;
    if (inner) inner.style.transform = 'rotate(-45deg)';
}

function _dptAppendImageIcon(node, iconSrc, isKeystone) {
    const img = document.createElement('img');
    img.src = iconSrc;
    img.style.cssText = `
        width: 60%; height: 60%;
        object-fit: contain;
        image-rendering: pixelated;
        opacity: 0.85;
        pointer-events: none;
    `;
    node.appendChild(img);
    if (isKeystone) _dptCounterRotateKeystoneChild(node);
}

function _dptAppendEmojiIcon(node, emoji, isKeystone, scale) {
    const span = document.createElement('span');
    span.textContent = emoji;
    span.style.cssText = `
        font-size: ${DPT_NODE_RADIUS * 0.95 * (scale || 1)}px;
        line-height: 1;
        pointer-events: none;
        user-select: none;
    `;
    node.appendChild(span);
    if (isKeystone) _dptCounterRotateKeystoneChild(node);
}

function _dptAppendDotFallback(node, isKeystone) {
    const dot = document.createElement('div');
    dot.className = 'pt-dot';
    dot.style.cssText = `
        width: 6px; height: 6px;
        border-radius: 50%;
        opacity: 0.7;
        pointer-events: none;
    `;
    node.appendChild(dot);
    if (isKeystone) _dptCounterRotateKeystoneChild(node);
}

// Resolves the icon (image URL vs emoji vs none) and appends it.
function _dptAppendNodeIcon(node, skill, def, isKeystone, scale) {
    const icon = (def && def.icon) ? def.icon : skill.image;
    const isImageUrl = icon && (icon.startsWith('/') || icon.startsWith('http'));
    const isRealImg = isImageUrl && !icon.includes('axe-hammer-grey');
    const isEmoji = icon && !isImageUrl && !icon.includes('axe-hammer-grey');

    if (isRealImg) {
        _dptAppendImageIcon(node, icon, isKeystone);
    } else if (isEmoji) {
        _dptAppendEmojiIcon(node, icon, isKeystone, scale);
    } else {
        _dptAppendDotFallback(node, isKeystone);
    }
}

// Attaches hover / click / branch-unspend handlers to a node element.
function _dptBindNodeEvents(node, skill, isKeystone) {
    const id = skill.id;

    node.addEventListener('mouseenter', e => {
        if (_dptGetNodeVisualState(id) !== 'locked') {
            node.style.transform = isKeystone ? 'rotate(45deg) scale(1.15)' : 'scale(1.15)';
            node.style.zIndex = '10';
        }
        _dptShowTooltip(id, e.clientX, e.clientY);
    });

    node.addEventListener('mousemove', e => {
        _dptPositionTooltip(e.clientX, e.clientY);
    });

    node.addEventListener('mouseleave', () => {
        node.style.transform = isKeystone ? 'rotate(45deg)' : 'scale(1)';
        node.style.zIndex = '2';
        _dptHideTooltip();
    });

    node.addEventListener('mousedown', () => {
        _dpt_mouseDownTime = Date.now();
    });

    // Right-click on an allocated node → unspend it with its stranded branch.
    node.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        _dptUnspendBranch(id);
    });

    node.addEventListener('click', e => {
        e.stopPropagation();
        // Ignore clicks that were actually long presses / drag releases.
        if (Date.now() - _dpt_mouseDownTime > 300) return;
        if (e.shiftKey && _dpt_alloc.has(id) && id !== DPT_START_ID) {
            _dptUnspendBranch(id);
        } else {
            _dptOnNodeClick(id);
        }
        _dptShowTooltip(id, e.clientX, e.clientY);
    });
}

// Save-slot portrait behind a character-start node (def.sprite from the
// generated data). Rendered UNDER the node: appended to the layer before
// the node div, so DOM order stacks it beneath. The portrait sits further
// out along the start's radial direction (away from the tree center) so
// it never hides the node itself. sx/sy are the node's SKILL-space coords
// (tree center = origin) — the radial direction must come from those, not
// from the pixel position.
function _dptAppendSprite(def, cx, cy, r, sx, sy) {
    if (!def || !def.sprite) return;
    const img = document.createElement('img');
    img.src = def.sprite;
    img.alt = '';
    img.className = 'dpt-start-sprite';
    img.draggable = false;
    const size = Math.round(r * 2 * 4.5);
    let x = cx;
    let y = cy;
    const d = Math.hypot(sx, sy);
    if (d > 1) {
        const push = r * 4.5;               // outward offset from the node
        x = cx + (sx / d) * push;
        y = cy + (sy / d) * push;
    }
    img.style.width = size + 'px';
    img.style.height = size + 'px';
    img.style.left = Math.round(x - size / 2) + 'px';
    img.style.top = Math.round(y - size / 2) + 'px';
    _dpt_nodesLayer.appendChild(img);
}

// Builds and appends one node <div>.
// Sizes: start 1.4x · keystone 1.5x · notable 1.3x · travel/small 0.8x/0.75x.
function _dptDrawNode(skill, offsetX, offsetY) {
    const cx = skill.x + offsetX;
    const cy = skill.y + offsetY;
    const def = skill._def || null;
    const tier = _dptGetNodeTier(def);
    const isStart = (tier === 'start');          // character starts
    const isKeystone = (tier === 'keystone');

    const r = isStart ? DPT_NODE_RADIUS * 1.4
        : tier === 'keystone' ? DPT_NODE_RADIUS * 1.5
        : tier === 'notable' ? DPT_NODE_RADIUS * 1.3
        : tier === 'small' ? DPT_NODE_RADIUS * 0.75
        : tier === 'travel' ? DPT_NODE_RADIUS * 0.8
        : DPT_NODE_RADIUS * 1.12;

    const node = document.createElement('div');
    node.className = isKeystone ? 'pt-node pt-node-keystone'
        : tier === 'travel' ? 'pt-node pt-node-travel'
        : 'pt-node';
    node.dataset.id = skill.id;

    if (isKeystone) {
        _dptApplyDiamondShape(node, cx, cy, r);
    } else {
        _dptApplyCircleShape(node, cx, cy, r);
    }

    _dptAppendNodeIcon(node, skill, def, isKeystone, r / DPT_NODE_RADIUS);
    _dptBindNodeEvents(node, skill, isKeystone);

    _dptAppendSprite(def, cx, cy, r, skill.x, skill.y);
    _dpt_nodesLayer.appendChild(node);
    _dpt_nodeEls[skill.id] = node;
}


//------------------------------------------------------------------------
//-----------------------------SEARCH--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Search haystack: all localised names/descriptions + statKey.
function _dptBuildSearchHaystack(def) {
    return [
        def.nameEn || '',
        def.nameDe || '',
        def.descEn || '',
        def.descDe || '',
        def.statKey || '',
    ].join(' ').toLowerCase();
}

function _dptApplySearchMatchStyle(el) {
    el.style.filter = 'drop-shadow(0 0 8px rgba(255,215,0,0.95)) drop-shadow(0 0 16px rgba(255,165,0,0.6))';
    el.style.opacity = '1';
    el.style.zIndex = '20';
}

function _dptApplySearchNoMatchStyle(el) {
    el.style.filter = 'brightness(0.3) saturate(0.3)';
    el.style.opacity = '0.35';
    el.style.zIndex = '1';
}

function _dptClearSearchNodeStyle(el) {
    el.style.filter = '';
    el.style.opacity = '';
    el.style.zIndex = '2';
}

// Applies or clears a search query (matching nodes glow, others dim,
// scaffold links fade). Empty string restores the default look.
function _dptApplySearch(query) {
    const q = (query || '').toLowerCase();

    _dpt_skills.forEach(skill => {
        const el = _dpt_nodeEls[skill.id];
        if (!el) return;
        if (!q) {
            _dptClearSearchNodeStyle(el);
            return;
        }
        if (_dptBuildSearchHaystack(skill._def || {}).includes(q)) {
            _dptApplySearchMatchStyle(el);
        } else {
            _dptApplySearchNoMatchStyle(el);
        }
    });
}

// Creates the search bar widget (icon + input + clear button).
function _dptCreateSearchBar() {
    const wrap = document.createElement('div');
    wrap.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(10,10,20,0.88);
        border: 1px solid rgba(184,154,80,0.45);
        border-radius: 6px;
        padding: 5px 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    `;

    const icon = document.createElement('span');
    icon.textContent = '🔍';
    icon.style.cssText = 'font-size:14px;opacity:0.7;pointer-events:none;';

    const input = document.createElement('input');
    input.id = 'dpt-search-input';
    input.type = 'text';
    input.placeholder = t('dpt_search_placeholder');
    input.style.cssText = `
        background: transparent;
        border: none;
        outline: none;
        font-family: var(--PX, monospace);
        font-size: 12px;
        color: #d4b870;
        width: 200px;
        caret-color: #d4b870;
    `;
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('autocomplete', 'off');

    const clearBtn = document.createElement('span');
    clearBtn.textContent = '✕';
    clearBtn.style.cssText = `
        font-size: 11px;
        color: #888;
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 3px;
        transition: color 0.15s;
        display: none;
    `;
    clearBtn.addEventListener('mouseenter', () => clearBtn.style.color = '#d4b870');
    clearBtn.addEventListener('mouseleave', () => clearBtn.style.color = '#888');
    clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.style.display = 'none';
        _dptApplySearch('');
    });

    input.addEventListener('input', () => {
        const q = input.value.trim();
        clearBtn.style.display = q ? 'inline' : 'none';
        _dptApplySearch(q);
    });

    // Stop mousedown from bubbling to the canvas pan handler.
    input.addEventListener('mousedown', e => e.stopPropagation());

    wrap.appendChild(icon);
    wrap.appendChild(input);
    wrap.appendChild(clearBtn);
    return wrap;
}

// Injects the search bar into the static #dpt-search-wrap placeholder
// (idempotent — never duplicates children).
function _dptInjectSearchBar() {
    const existingWrap = document.getElementById('dpt-search-wrap');
    if (!existingWrap || existingWrap.hasChildNodes()) return;

    const searchBar = _dptCreateSearchBar();
    while (searchBar.firstChild) {
        existingWrap.appendChild(searchBar.firstChild);
    }
    existingWrap.style.cssText += ';display:flex;align-items:center;gap:8px;';
}



//------------------------------------------------------------------------
//-----------------------TOPBAR BUTTONS (once)-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Binds the sandbox-only topbar buttons once. Navigation (back) and the
// mode-select entry button are bound in ui-events.js instead.
function _dptBindTopbarButtons() {
    if (_dpt_topbarBound) return;
    _dpt_topbarBound = true;

    const addBtn = document.getElementById('btn-dpt-add-points');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            _dpt_points += 10;
            _dptPersist();
            _dptRefreshPointsDisplay();
            showToast(t('dpt_added_points'));
        });
    }

    const refundBtn = document.getElementById('btn-dpt-refund-all');
    if (refundBtn) {
        refundBtn.addEventListener('click', () => {
            const msg = _dptLang() === 'de'
                ? 'Alle Entwickler-Knoten außer dem Startknoten entfernen und die Punkte erstatten?'
                : 'Remove all dev allocations except the Start node and refund the points?';
            if (!window.confirm(msg)) return;
            _dptRefundAllPoints();
        });
    }

    const zoomBar = document.getElementById('dpt-zoom-bar');
    if (zoomBar) {
        zoomBar.addEventListener('mousedown', e => e.stopPropagation());
        zoomBar.addEventListener('input', () => {
            const pct = zoomBar.value / 100;
            const newScale = _dptClampScale(DPT_ZOOM_MIN + pct * (DPT_ZOOM_MAX - DPT_ZOOM_MIN));
            _dptZoomToward(newScale,
                _dpt_container.clientWidth / 2,
                _dpt_container.clientHeight / 2);
            _dptApplyTransform();
        });
    }
}



//------------------------------------------------------------------------
//---------------------------RESPEC (ALL)----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Full sandbox respec: everything except the Start node is refunded into
// the dev point pool. Called from the confirmed topbar button.
function _dptRefundAllPoints() {
    const refundable = [..._dpt_alloc].filter(id => {
        if (id === DPT_START_ID) return false;
        const skill = _dpt_skillMap[id];
        return !(skill && skill._def && skill._def.tier === 'start');
    });
    if (!refundable.length) return;

    refundable.forEach(id => _dpt_alloc.delete(id));
    _dptRefundPoints(refundable.length);
    _dptPersist();
    _dptRefreshAllStyles();
    showToast(t('dpt_refund_all_done').replace('{n}', refundable.length));
}



//------------------------------------------------------------------------
//-----------------------------RENDERER------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Tears down the previous render and returns a fresh container.
function _dptResetRenderState() {
    const old = document.getElementById('dpt-canvas');
    if (!old) { console.error('[DevPassiveTree] #dpt-canvas not found'); return null; }

    _dpt_container = old.cloneNode(false);
    old.parentNode.replaceChild(_dpt_container, old);

    _dpt_nodeEls = {};
    _dpt_connEls = {};

    if (_dpt_tooltip) { _dpt_tooltip.remove(); _dpt_tooltip = null; }

    _dpt_container.innerHTML = '';
    _dpt_container.style.cssText += `
        position: relative;
        overflow: hidden;
        cursor: grab;
        user-select: none;
    `;
    return _dpt_container;
}

function _dptCreateWorldDiv(worldW, worldH) {
    const world = document.createElement('div');
    world.id = 'dpt-world';
    world.style.cssText = `
        position: absolute;
        top: 0; left: 0;
        width:  ${worldW}px;
        height: ${worldH}px;
        transform-origin: 0 0;
        will-change: transform;
    `;
    return world;
}

function _dptCreateSvgOverlay(worldW, worldH) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = `
        position: absolute;
        top: 0; left: 0;
        width:  ${worldW}px;
        height: ${worldH}px;
        overflow: visible;
        pointer-events: none;
    `;
    svg.setAttribute('width', worldW);
    svg.setAttribute('height', worldH);
    return svg;
}

function _dptCreateNodesLayer(worldW, worldH) {
    const layer = document.createElement('div');
    layer.style.cssText = `
        position: absolute;
        top: 0; left: 0;
        width:  ${worldW}px;
        height: ${worldH}px;
    `;
    return layer;
}

// Draws one big translucent category label above a cluster origin.
function _dptDrawClusterLabel(text, x, y, color) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        font-family: var(--PX, monospace);
        font-size: 88px;
        letter-spacing: 14px;
        color: ${color};
        opacity: 0.18;
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
        z-index: 1;
    `;
    _dpt_nodesLayer.appendChild(el);
}

// Draws the connection lines (inherited PoE1 wheel-and-spoke skeleton) into
// the SVG overlay, pushed through the same skill-space→pixel offsets as the
// nodes so lines meet the node centers at any zoom/pan.
function _dptDrawLinks(offsetX, offsetY) {
    if (!_dpt_svg || !_dpt_links.length) return;
    const NS = 'http://www.w3.org/2000/svg';
    _dpt_links.forEach(({ a, b }) => {
        const sa = _dpt_skillMap[a], sb = _dpt_skillMap[b];
        if (!sa || !sb) return;
        const line = document.createElementNS(NS, 'line');
        line.setAttribute('x1', sa.x + offsetX);
        line.setAttribute('y1', sa.y + offsetY);
        line.setAttribute('x2', sb.x + offsetX);
        line.setAttribute('y2', sb.y + offsetY);
        line.setAttribute('stroke', '#2c2c40');
        line.setAttribute('stroke-width', '2.5');
        line.setAttribute('stroke-linecap', 'round');
        _dpt_svg.appendChild(line);
    });
}

// Main render entry point — rebuilds the whole sandbox tree.
function _dptRender() {
    if (!_dptResetRenderState()) return;

    if (!_dpt_skills.length) return;

    _dptBuildAdjacency();

    // Start + class starts are permanently allocated on (re)load.
    _dpt_alloc.add(DPT_START_ID);
    _dpt_skills.forEach(s => {
        if (s._def && s._def.tier === 'start') _dpt_alloc.add(s.id);
    });

    const bounds = _dptGetBounds();
    const worldW = bounds.maxX - bounds.minX + (DPT_PADDING + DPT_NODE_RADIUS) * 2;
    const worldH = bounds.maxY - bounds.minY + (DPT_PADDING + DPT_NODE_RADIUS) * 2;

    _dpt_world = _dptCreateWorldDiv(worldW, worldH);
    _dpt_svg = _dptCreateSvgOverlay(worldW, worldH);
    _dpt_nodesLayer = _dptCreateNodesLayer(worldW, worldH);

    _dpt_world.appendChild(_dpt_svg);
    _dpt_world.appendChild(_dpt_nodesLayer);
    _dpt_container.appendChild(_dpt_world);

    const { offsetX, offsetY } = _dptComputeOffsets(bounds);
    _dpt_skills.forEach(s => _dptDrawNode(s, offsetX, offsetY));
    _dptDrawLinks(offsetX, offsetY);

    _dptRefreshAllStyles();
    _dptFitToView(bounds);
    _dptBindViewportEvents();
    _dptInjectSearchBar();
    _dptBindTopbarButtons();
}



//------------------------------------------------------------------------
//-------------------------SCREEN NAVIGATION-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Entry point — restores the sandbox state, then renders.
function buildDevPassiveTreeScreen() {
    _dptRestoreState();
    _dptRender();
}

// Opens the dev tree screen from the select-mode screen. The screen is
// activated BEFORE rendering so the fit-to-view math sees the real canvas
// size (a hidden container reports clientWidth 0).
function showDevPassiveTree() {
    screenHistory.push('screen-mode-select');
    switchScreen('screen-dev-passive-tree');
    buildDevPassiveTreeScreen();
}

// BACK button — returns to the select-mode screen.
function dptGoBack() {
    screenHistory.pop(); // discard the entry showDevPassiveTree() pushed
    switchScreen('screen-mode-select');
}
