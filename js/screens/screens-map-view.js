/*
    ========================================================================
    SCREENS-MAP-VIEW.JS
    ========================================================================
    Handles the "Map View" layout for level selection.

    Features:
    - Parchment-style world map with background image
    - Polyline SVG paths connecting worlds to the Cartographer's Outpost
    - Player sprite walks along the path when a world is clicked
    - After arriving, shows an "Enter World" button that transitions to
      the World Detail screen (screens-world-detail.js)
    - Toggle button in the level-select top bar to switch between
      classic list view and map view

    State persisted on STATE:
      STATE.mapViewEnabled        (boolean) — which view is active
      STATE.mapSpriteWorldIndex   (number|null) — where the sprite last stood
                                   null = at the Cartographer's Outpost
    ========================================================================
*/

'use strict';


//------------------------------------------------------------------------
//-------------------CONSTANTS & MAP DATA---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Aspect ratio of the background map image (width ÷ height).
// Update this value whenever the map image changes.
const MAP_IMAGE_ASPECT = 1376 / 768;

// Walking speed of the player sprite, in canvas pixels per second
// (calibrated for a ~1000px wide canvas).
const WALK_SPEED_PX_PER_SEC = 60;


// Minimum duration for a single waypoint-to-waypoint step, in milliseconds.
// Prevents imperceptibly fast micro-steps on very short segments.
const WALK_STEP_MIN_MS = 80;

// Fixed reference canvas size used ONLY for speed calculations, so walk
// speed stays constant regardless of actual window/canvas size.
const WALK_REF_WIDTH = 1000;
const WALK_REF_HEIGHT = WALK_REF_WIDTH / MAP_IMAGE_ASPECT;



// The home base position (Cartographer's Outpost).
// Coordinates are percentages of the background IMAGE (not the canvas element).
// (0,0) = top-left, (100,100) = bottom-right of the image.
const MAP_HOME_POS = { x: 7.6, y: 86.3 };

// World node positions and localized names.
// Index matches the world index (wi) used throughout the codebase.
// wi=13 is the special Nexus endgame hub.
// Coordinates are percentages of the background IMAGE.
const MAP_WORLD_POSITIONS = [
    { x: 25, y: 83.1, labelEN: "Probability Peaks", labelDE: "Probability Peaks" },
    { x: 34.5, y: 88.6, labelEN: "The Distribution Den", labelDE: "The Distribution Den" },
    { x: 14, y: 57, labelEN: "Sampling Savanna", labelDE: "Sampling Savanna" },
    { x: 42.8, y: 63.1, labelEN: "The Vortex of Possibilities", labelDE: "The Vortex of Possibilities" },
    { x: 64.3, y: 60.4, labelEN: "Regression Rift", labelDE: "Regression Rift" },
    { x: 61.6, y: 51.2, labelEN: "Frequency Forest", labelDE: "Frequency Forest" },
    { x: 73.3, y: 44.1, labelEN: "Stochapolis", labelDE: "Stochapolis" },
    { x: 78.0, y: 60.0, labelEN: "Hypothesis Hinterlands", labelDE: "Hypothesis Hinterlands" },
    { x: 87.0, y: 77.3, labelEN: "Data Delta", labelDE: "Data Delta" },
    { x: 91.5, y: 32.6, labelEN: "Parameter Plains", labelDE: "Parameter Plains" },
    { x: 71.1, y: 16.6, labelEN: "Null Hypothesis Void", labelDE: "Null Hypothesis Void" },
    { x: 37.5, y: 39.9, labelEN: "Bayesian Bay", labelDE: "Bayesian Bay" },
    { x: 35.1, y: 22.5, labelEN: "Expectation Plateau", labelDE: "Expectation Plateau" },
    { x: 49.6, y: 15.0, labelEN: "The Nexus", labelDE: "The Nexus" },
];

// Road segments that define the visual paths drawn on the map.
// Each segment connects two named nodes (n1 → n2) via a list of waypoints.
// Node names can be:
//   - 'home'         : the Cartographer's Outpost
//   - a number       : a world index (0-based)
//   - a string       : a named junction (fork point)
// The BFS pathfinder traverses this graph in both directions, so order
// of n1/n2 does not matter for routing — only the waypoint order matters
// for visual drawing and sprite movement direction.
// Coordinates are percentages of the background IMAGE.
const ROAD_SEGMENTS = [
    {
        n1: 'home',
        n2: 'fork01',
        waypoints: [
            { x: 7.6, y: 86.3 },  // ← Automatically added MAP_HOME_POS starting point
            { x: 11.9, y: 91.0 },
            { x: 13.0, y: 91.6 },
            { x: 15.5, y: 91.3 },
            { x: 17.4, y: 91.9 },
            { x: 19.7, y: 92.2 },
            { x: 21.5, y: 91.7 },
            { x: 24.8, y: 91.4 }, // ← Official junction point for 'fork01'
        ]
    },

    {
        n1: 'fork01',
        n2: 0, // World 1: Probability Peaks
        waypoints: [
            { x: 24.8, y: 91.4 }, // ← Automatically added fork01 junction point
            { x: 24.7, y: 88.7 },
            { x: 24.4, y: 84.8 },
            { x: 25.0, y: 83.1 }, // ← Automatically added World 1 position
        ]
    },

    {
        n1: 'fork01',
        n2: 1, // World 2: The Distribution Den
        waypoints: [
            { x: 24.8, y: 91.4 }, // ← Automatically added fork01 junction point
            { x: 26.6, y: 91.4 },
            { x: 28.0, y: 91.4 },
            { x: 29.6, y: 91.4 },
            { x: 30.9, y: 91.4 },
            { x: 33.8, y: 91.4 },
            { x: 34.5, y: 88.6 }, // ← Automatically added World 2 position
        ]
    },

    {
        n1: 'home',
        n2: 2, // World 3: Sampling Savanna
        waypoints: [
            { x: 7.6, y: 86.3 },  // ← Automatically added MAP_HOME_POS starting point
            { x: 7.4, y: 74.8 },
            { x: 7.6, y: 71.8 },
            { x: 8.3, y: 67.9 },
            { x: 10.6, y: 65.6 },
            { x: 12.4, y: 63.1 },
            { x: 13.9, y: 60.7 },
            { x: 13.4, y: 57.1 },
            { x: 14.0, y: 57.0 }, // ← Automatically added World 3 position
        ]
    },

    {
        n1: 1,
        n2: 3, // World 4: The Vortex of Possibilities
        waypoints: [
            { x: 34.5, y: 88.6 }, // ← Automatically added World 2 starting point
            { x: 34.0, y: 79.2 },
            { x: 35.1, y: 75.1 },
            { x: 37.1, y: 72.7 },
            { x: 39.0, y: 70.8 },
            { x: 41.3, y: 68.8 },
            { x: 43.9, y: 68.1 },
            { x: 45.4, y: 67.2 },
            { x: 48.5, y: 66.8 },
            { x: 49.2, y: 66.4 }, // ← Automatically added World 4 position
        ]
    },

    {
        n1: 3,
        n2: 'fork45',
        waypoints: [
            { x: 49.2, y: 66.4 }, // ← Automatically added World 4 starting point
            { x: 52.3, y: 64.9 },
            { x: 54.7, y: 63.8 },
            { x: 57.7, y: 61.6 },
            { x: 59.6, y: 59.2 },
            { x: 61.8, y: 56.4 }, // ← Official junction point for 'fork45'
        ]
    },

    {
        n1: 'fork45',
        n2: 4, // World 5: Regression Rift
        waypoints: [
            { x: 61.8, y: 56.4 }, // ← Automatically added fork45 junction point
            { x: 64.3, y: 60.4 }  // ← Automatically added World 5 position
        ]
    },

    {
        n1: 'fork45',
        n2: 5, // World 6: Frequency Forest
        waypoints: [
            { x: 61.8, y: 56.4 }, // ← Automatically added fork45 junction point
            { x: 61.6, y: 51.2 }  // ← Automatically added World 6 position
        ]
    },

    {
        n1: 'fork45',
        n2: 'fork67',
        waypoints: [
            { x: 61.8, y: 56.4 }, // ← Automatically added fork45 junction point
            { x: 66.5, y: 55.7 },
            { x: 69.1, y: 55.2 },
            { x: 71.4, y: 54.2 },
            { x: 74.0, y: 52.8 }, // ← Official junction point for 'fork67'
        ]
    },

    {
        n1: 4, // World 5: Regression Rift
        n2: 'fork67',
        waypoints: [
            { x: 64.3, y: 60.4 }, // ← Automatically added World 5 position
            { x: 74.0, y: 52.8 }  // ← Automatically added fork67 junction point
        ]
    },

    {
        n1: 5, // World 6: Frequency Forest
        n2: 'fork67',
        waypoints: [
            { x: 61.6, y: 51.2 }, // ← Automatically added World 6 position
            { x: 74.0, y: 52.8 }  // ← Automatically added fork67 junction point
        ]
    },

    {
        n1: 7, // World 8: Hypothesis Hinterlands
        n2: 8, // World 9: Data Delta
        waypoints: [
            { x: 78.0, y: 60.0 }, // ← Automatically added World 8 starting point
            { x: 78.8, y: 63.6 },
            { x: 80.0, y: 65.0 },
            { x: 81.3, y: 67.4 },
            { x: 82.6, y: 68.9 },
            { x: 84.4, y: 71.3 },
            { x: 85.5, y: 73.1 },
            { x: 86.8, y: 76.6 },
            { x: 87.0, y: 77.3 }, // ← Automatically added World 9 position
        ]
    },


    {
        n1: 'fork67',
        n2: 6, // World 7: Stochapolis
        waypoints: [
            { x: 74.0, y: 52.8 }, // ← Automatically added fork67 junction point
            { x: 73.3, y: 44.1 }  // ← Automatically added World 7 position
        ]
    },

    {
        n1: 'fork67',
        n2: 7, // World 8: Hypothesis Hinterlands
        waypoints: [
            { x: 74.0, y: 52.8 }, // ← Automatically added fork67 junction point
            { x: 78.0, y: 60.0 }  // ← Automatically added World 8 position
        ]
    },

    {
        n1: 'fork67',
        n2: 9, // World 10: Parameter Plains
        waypoints: [
            { x: 74.0, y: 52.8 }, // ← Automatically added fork67 junction point
            { x: 78.5, y: 51.9 },
            { x: 80.4, y: 50.4 },
            { x: 82.8, y: 48.7 },
            { x: 85.3, y: 47.0 },
            { x: 86.6, y: 44.9 },
            { x: 87.3, y: 41.3 },
            { x: 89.0, y: 38.0 },
            { x: 91.7, y: 32.8 },
            { x: 91.5, y: 32.6 }  // ← Automatically added World 10 position
        ]
    },

    {
        n1: 9, // World 10: Parameter Plains
        n2: 10, // World 11: Null Hypothesis Void
        waypoints: [
            { x: 91.5, y: 32.6 }, // ← Automatically added World 10 starting point
            { x: 85.9, y: 27.6 },
            { x: 81.1, y: 27.3 },
            { x: 77.3, y: 26.1 },
            { x: 75.0, y: 24.2 },
            { x: 73.1, y: 22.1 },
            { x: 71.0, y: 17.5 },
            { x: 71.1, y: 16.6 }  // ← Automatically added World 11 position
        ]
    },

    {
        n1: 10, // World 11: Null Hypothesis Void
        n2: 'junction1112nexus',
        waypoints: [
            { x: 71.1, y: 16.6 }, // ← Automatically added World 11 starting point
            { x: 67.2, y: 17.6 },
            { x: 64.9, y: 20.0 },
            { x: 61.3, y: 21.1 },
            { x: 58.7, y: 23.1 },
            { x: 56.3, y: 25.9 },
            { x: 53.7, y: 27.3 },
            { x: 51.3, y: 28.6 },
            { x: 48.4, y: 30.5 }, // ← Official junction point for 'junction1112nexus'
        ]
    },

    {
        n1: 'junction1112nexus',
        n2: 11, // World 12: Bayesian Bay
        waypoints: [
            { x: 48.4, y: 30.5 }, // ← Automatically added junction point
            { x: 37.5, y: 39.9 }  // ← Automatically added World 12 position
        ]
    },

    {
        n1: 'junction1112nexus',
        n2: 12, // World 13: Expectation Plateau
        waypoints: [
            { x: 48.4, y: 30.5 }, // ← Automatically added junction point
            { x: 35.1, y: 22.5 }  // ← Automatically added World 13 position
        ]
    },

    {
        n1: 'junction1112nexus',
        n2: 13, // World 14: The Nexus (Endgame Hub)
        waypoints: [
            { x: 48.4, y: 30.5 }, // ← Automatically added junction point
            { x: 49.6, y: 15.0 }  // ← Automatically added The Nexus position
        ]
    },

    {
        n1: 12, // World 13: Expectation Plateau
        n2: 11, // World 12: Bayesian Bay
        waypoints: [
            { x: 35.1, y: 22.5 }, // ← Automatically added World 13 starting point
            { x: 36.6, y: 25.1 },
            { x: 37.6, y: 28.7 },
            { x: 38.1, y: 30.9 },
            { x: 37.3, y: 34.9 },
            { x: 37.3, y: 38.4 },
            { x: 37.5, y: 39.9 }  // ← Automatically added World 12 position
        ]
    },




];


//------------------------------------------------------------------------
//-------------------MODULE STATE-----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// World index the sprite is currently standing at.
// null = sprite is at the Cartographer's Outpost (home).
let _mvCurrentWorldIdx = null;

// requestAnimationFrame handle for the active walk animation (used for cancellation).
let _mvWalkAnim = null;

// Whether a walk animation is currently in progress.
// Used to block new walks while one is already running.
let _mvWalking = false;

// Reference to the map canvas DOM element, cached after build.
let _mvCanvasEl = null;

// Queued redirect target while a walk is in progress. Only applied once
// the sprite reaches the next real road node, so it never leaves the roads.
let _mvPendingRedirect = null;


//------------------------------------------------------------------------
//-------------------COORDINATE HELPERS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Converts a position expressed as a percentage of the background IMAGE
 * into a percentage of the canvas element, accounting for letterboxing/pillarboxing
 * that occurs because the image is displayed with background-size: contain.
 *
 * @param {number} imgPctX  - X position as % of the image (0–100)
 * @param {number} imgPctY  - Y position as % of the image (0–100)
 * @param {HTMLElement} canvas - The map canvas DOM element
 * @returns {{ x: number, y: number }} Position as % of the canvas element
 */
function _imgPctToCanvasPct(imgPctX, imgPctY, canvas) {
    const cw = canvas.offsetWidth;
    const ch = canvas.offsetHeight;

    // Canvas not yet laid out — return raw values as a safe fallback
    if (!cw || !ch) return { x: imgPctX, y: imgPctY };

    const containerAspect = cw / ch;
    let imgW, imgH, imgX, imgY;

    if (containerAspect > MAP_IMAGE_ASPECT) {
        // Canvas is wider than the image → pillarboxed (black bars on left/right)
        imgH = ch;
        imgW = ch * MAP_IMAGE_ASPECT;
        imgX = (cw - imgW) / 2;
        imgY = 0;
    } else {
        // Canvas is taller than the image → letterboxed (black bars on top/bottom)
        imgW = cw;
        imgH = cw / MAP_IMAGE_ASPECT;
        imgX = 0;
        imgY = (ch - imgH) / 2;
    }

    const pxX = imgX + (imgPctX / 100) * imgW;
    const pxY = imgY + (imgPctY / 100) * imgH;

    return {
        x: (pxX / cw) * 100,
        y: (pxY / ch) * 100,
    };
}

/**
 * Positions a DOM element on the map canvas using image-space percentages.
 * Converts to canvas-space first to handle letterboxing correctly.
 *
 * @param {HTMLElement} el       - The element to position
 * @param {number} imgPctX       - X position as % of the image
 * @param {number} imgPctY       - Y position as % of the image
 * @param {HTMLElement} [canvas] - The canvas element; resolved from DOM if omitted
 */
function _applyPositionToElement(el, imgPctX, imgPctY, canvas) {
    if (!canvas) canvas = document.getElementById('mv-canvas');
    if (!canvas) return;

    const { x, y } = _imgPctToCanvasPct(imgPctX, imgPctY, canvas);
    el.style.left = x + '%';
    el.style.top = y + '%';
}

/**
 * Returns the label for a world node in the current language.
 *
 * @param {number} wi - World index
 * @returns {string}
 */
function _getWorldLabel(wi) {
    const pos = MAP_WORLD_POSITIONS[wi];
    return LANG === 'de' ? pos.labelDE : pos.labelEN;
}


//------------------------------------------------------------------------
//-------------------WORLD UNLOCK HELPERS---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Returns true if the player has completed the final level of a given world.
 *
 * @param {number} wi - World index
 * @returns {boolean}
 */
function _isWorldComplete(wi) {
    if (!STATE || !WORLDS || !WORLDS[wi]) return false;
    const finalGi = WORLD_START_GI[wi] + (WORLDS[wi].data.length - 1);
    return STATE.done && STATE.done.includes(finalGi);
}

/**
 * Returns true if the player is allowed to enter a given world.
 * Currently all worlds are unlocked (TEMP — for waypoint tuning).
 * Restore the commented block below to re-enable proper unlock logic.
 *
 * @param {number} wi - World index
 * @returns {boolean}
 */
function _isWorldAccessible(wi) {
    /*
    // World 0 requires tutorial completion
    if (wi === 0) return STATE && STATE.tutorialDone;

    // All other worlds require at least the first level of the previous world to be done
    if (!WORLDS || !WORLDS[wi - 1]) return false;
    const prevFirstGi = WORLD_START_GI[wi - 1];
    return STATE && STATE.done && STATE.done.includes(prevFirstGi);
    */

    return true; // TEMP: all worlds unlocked for waypoint tuning
}


/**
 * Returns true if every level in the given world has been completed at least once.
 */
function _isWorldFullyDone(wi) {
    if (!STATE || !WORLDS || !WORLDS[wi]) return false;
    const start = WORLD_START_GI[wi];
    return WORLDS[wi].data.every((_, li) => STATE.done && STATE.done.includes(start + li));
}

/**
 * Returns true if every level in the given world has had its bonus objective claimed.
 */
function _isWorldBonusComplete(wi) {
    if (!STATE || !WORLDS || !WORLDS[wi]) return false;
    const start = WORLD_START_GI[wi];
    return WORLDS[wi].data.every((_, li) => STATE.bonusDone && STATE.bonusDone.includes(start + li));
}

/**
 * Returns true if every level in the given world was cleared on Hard with
 * all five modifiers active (reuses isMaxCleared from screens-level-select.js).
 */
function _isWorldMaxCleared(wi) {
    if (!STATE || !WORLDS || !WORLDS[wi] || typeof isMaxCleared !== 'function') return false;
    const start = WORLD_START_GI[wi];
    return WORLDS[wi].data.every((_, li) => isMaxCleared(start + li));
}

/**
 * Returns the "healing" tier (0–3) for a world node's corruption-cleansing
 * visual effect — the land recovering from the void as the world is cleared:
 *   0 — not yet fully cleared: corruption remains, no effect
 *   1 — every level cleared at least once: nature begins to return
 *   2 — tier 1 + every bonus claimed: vines and leaves visibly sprout
 *   3 — tier 2 + every level max-cleared (Hard, all mods): full radiant bloom
 */
function _getWorldHealingTier(wi) {
    if (!_isWorldFullyDone(wi)) return 0;
    if (!_isWorldBonusComplete(wi)) return 1;
    if (!_isWorldMaxCleared(wi)) return 2;
    return 3;
}



//------------------------------------------------------------------------
//-------------------ROUTE FINDING (BFS)---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Normalises a node identifier to a string key used by the BFS adjacency map.
 * 'home' and null both represent the Cartographer's Outpost.
 *
 * @param {string|number|null} node
 * @returns {string}
 */
function _nodeToKey(node) {
    return (node === 'home' || node === null) ? 'home' : String(node);
}

/**
 * Builds a bidirectional adjacency map from ROAD_SEGMENTS.
 * Each entry maps a node key to an array of { neighbor, segment, reversed } objects.
 * 'reversed' is true when the sprite will travel from n2 to n1 (backwards along the segment).
 *
 * @returns {Map<string, Array>}
 */
function _buildRoadGraph() {
    const adj = new Map();

    const addEdge = (a, b, segment) => {
        const ka = _nodeToKey(a);
        const kb = _nodeToKey(b);
        if (!adj.has(ka)) adj.set(ka, []);
        if (!adj.has(kb)) adj.set(kb, []);
        adj.get(ka).push({ neighbor: kb, segment, reversed: false });
        adj.get(kb).push({ neighbor: ka, segment, reversed: true });
    };

    ROAD_SEGMENTS.forEach(seg => addEdge(seg.n1, seg.n2, seg));
    return adj;
}


function _routeSegmentsToWaypointsWithMarkers(routeSegments) {
    const points = [];
    const markers = []; // { index, key } — index into `points` that sits on a real graph node

    routeSegments.forEach(({ segment, reversed }) => {
        const wps = segment.waypoints || [];
        const segmentPoints = reversed ? [...wps].reverse() : [...wps];
        const startKey = _nodeToKey(reversed ? segment.n2 : segment.n1);
        const endKey = _nodeToKey(reversed ? segment.n1 : segment.n2);

        if (points.length === 0) {
            points.push(...segmentPoints);
            markers.push({ index: 0, key: startKey });
        } else {
            const last = points[points.length - 1];
            const first = segmentPoints[0];
            const isDuplicate = first && last.x === first.x && last.y === first.y;
            points.push(...(isDuplicate ? segmentPoints.slice(1) : segmentPoints));
        }
        markers.push({ index: points.length - 1, key: endKey });
    });

    return { points, markers };
}

function _findWalkPathWithMarkers(fromNode, toNode) {
    const adj = _buildRoadGraph();
    const startKey = _nodeToKey(fromNode);
    const endKey = _nodeToKey(toNode);

    if (startKey === endKey) return { points: [], markers: [] };

    const visited = new Set([startKey]);
    const queue = [{ node: startKey, path: [] }];

    while (queue.length) {
        const { node, path } = queue.shift();
        for (const { neighbor, segment, reversed } of (adj.get(node) || [])) {
            if (visited.has(neighbor)) continue;
            visited.add(neighbor);
            const newPath = [...path, { segment, reversed }];
            if (neighbor === endKey) return _routeSegmentsToWaypointsWithMarkers(newPath);
            queue.push({ node: neighbor, path: newPath });
        }
    }

    const startPos = (fromNode === null || fromNode === 'home') ? MAP_HOME_POS : MAP_WORLD_POSITIONS[fromNode];
    const endPos = (toNode === null || toNode === 'home') ? MAP_HOME_POS : MAP_WORLD_POSITIONS[toNode];
    if (!startPos || !endPos) return { points: [], markers: [] };

    return {
        points: [startPos, endPos],
        markers: [{ index: 0, key: startKey }, { index: 1, key: endKey }]
    };
}





/**
 * Flattens a BFS segment-path into an ordered array of {x, y} waypoints
 * that the sprite should walk through. Duplicate junction coordinates
 * at segment boundaries are de-duplicated to prevent stuttering.
 *
 * @param {Array<{ segment: object, reversed: boolean }>} routeSegments
 * @returns {Array<{ x: number, y: number }>}
 */
function _routeSegmentsToWaypoints(routeSegments) {
    const points = [];

    for (const { segment, reversed } of routeSegments) {
        const wps = segment.waypoints || [];

        // Reverse the waypoint array when travelling backwards along a segment
        const segmentPoints = reversed ? [...wps].reverse() : [...wps];

        if (points.length === 0) {
            points.push(...segmentPoints);
        } else {
            // Skip the first point of the new segment if it duplicates the last
            // accumulated point (this happens at every junction by design)
            const last = points[points.length - 1];
            const first = segmentPoints[0];
            const isDuplicate = first && last.x === first.x && last.y === first.y;
            points.push(...(isDuplicate ? segmentPoints.slice(1) : segmentPoints));
        }
    }

    return points;
}

/**
 * Uses BFS to find the shortest path through the road graph from
 * fromNode to toNode and returns it as an ordered waypoint array.
 * Falls back to a straight two-point path if no route is found.
 *
 * @param {string|number|null} fromNode - Starting node ('home', world index, or junction)
 * @param {string|number|null} toNode   - Destination node
 * @returns {Array<{ x: number, y: number }>} Ordered walk waypoints
 */
function _findWalkPath(fromNode, toNode) {
    const adj = _buildRoadGraph();
    const startKey = _nodeToKey(fromNode);
    const endKey = _nodeToKey(toNode);

    if (startKey === endKey) return [];

    const visited = new Set([startKey]);
    const queue = [{ node: startKey, path: [] }];

    while (queue.length) {
        const { node, path } = queue.shift();
        const neighbors = adj.get(node) || [];

        for (const { neighbor, segment, reversed } of neighbors) {
            if (visited.has(neighbor)) continue;

            visited.add(neighbor);
            const newPath = [...path, { segment, reversed }];

            if (neighbor === endKey) {
                return _routeSegmentsToWaypoints(newPath);
            }

            queue.push({ node: neighbor, path: newPath });
        }
    }

    // No route found in the graph — fall back to a straight-line teleport
    const startPos = (fromNode === null || fromNode === 'home') ? MAP_HOME_POS : MAP_WORLD_POSITIONS[fromNode];
    const endPos = (toNode === null || toNode === 'home') ? MAP_HOME_POS : MAP_WORLD_POSITIONS[toNode];
    if (!startPos || !endPos) return [];

    return [startPos, endPos];
}


//------------------------------------------------------------------------
//-------------------WALKING ANIMATION------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Eases a normalised time value t ∈ [0,1] using a smooth ease-in-out curve.
 * @param {number} t
 * @returns {number}
 */
function _easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Calculates the duration in milliseconds to walk a single waypoint segment,
 * based on WALK_SPEED_PX_PER_SEC and clamped to WALK_STEP_MIN_MS.
 *
 * @param {{ x: number, y: number }} startPos - Start position (image %)
 * @param {{ x: number, y: number }} endPos   - End position (image %)
 * @param {number} canvasW - Canvas width in pixels
 * @param {number} canvasH - Canvas height in pixels
 * @returns {number} Duration in milliseconds
 */
function _calcStepDurationMs(startPos, endPos) {
    const dx = (endPos.x - startPos.x) / 100 * WALK_REF_WIDTH;
    const dy = (endPos.y - startPos.y) / 100 * WALK_REF_HEIGHT;
    const distPx = Math.sqrt(dx * dx + dy * dy);
    return Math.max(WALK_STEP_MIN_MS, (distPx / WALK_SPEED_PX_PER_SEC) * 1000);
}

/**
 * Updates the sprite's horizontal flip based on which direction it is walking.
 * Uses the CSS `scale` property so it doesn't interfere with other transforms
 * (like the vertical bob animation).
 *
 * @param {HTMLElement} sprite
 * @param {{ x: number }} startPos
 * @param {{ x: number }} endPos
 */
function _updateSpriteDirection(sprite, startPos, endPos) {
    const img = sprite.querySelector('img');
    if (img) {
        img.style.scale = (endPos.x < startPos.x) ? '-1 1' : '1 1';
    }
}

/**
 * Runs a single rAF animation step that moves the sprite from startPos to endPos.
 * Calls onStepComplete when the step finishes, allowing the caller to chain the next step.
 *
 * @param {HTMLElement}  sprite       - The sprite element to move
 * @param {{ x, y }}     startPos     - Start waypoint (image %)
 * @param {{ x, y }}     endPos       - End waypoint (image %)
 * @param {number}       durationMs   - Duration of this step
 * @param {Function}     onStepComplete - Called when t reaches 1
 */
function _animateWalkStep(sprite, startPos, endPos, durationMs, onStepComplete) {
    const canvas = document.getElementById('mv-canvas');
    const startCanvas = _imgPctToCanvasPct(startPos.x, startPos.y, canvas);
    const endCanvas = _imgPctToCanvasPct(endPos.x, endPos.y, canvas);

    const startTime = performance.now();

    const step = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / durationMs, 1);
        const ease = _easeInOut(t);

        sprite.style.left = (startCanvas.x + (endCanvas.x - startCanvas.x) * ease) + '%';
        sprite.style.top = (startCanvas.y + (endCanvas.y - startCanvas.y) * ease) + '%';

        _updateSpriteDirection(sprite, startPos, endPos);

        if (t < 1) {
            _mvWalkAnim = requestAnimationFrame(step);
        } else {
            onStepComplete();
        }
    };

    _mvWalkAnim = requestAnimationFrame(step);
}

/**
 * Walks the sprite along a waypoint path, step by step.
 * Calls onComplete when the last waypoint is reached.
 *
 * @param {HTMLElement} sprite     - The sprite element
 * @param {Array<{ x, y }>} points - Ordered waypoints (image %)
 * @param {number}      segIdx     - Current waypoint index (recursive)
 * @param {Function}    onComplete - Called after the final step
 */
function _walkAlongPath(sprite, points, markers, segIdx, onComplete) {
    if (segIdx >= points.length - 1) {
        onComplete();
        return;
    }

    const startPos = points[segIdx];
    const endPos = points[segIdx + 1];
    const durationMs = _calcStepDurationMs(startPos, endPos);

    _animateWalkStep(sprite, startPos, endPos, durationMs, () => {
        const reachedIndex = segIdx + 1;
        const marker = markers.find(m => m.index === reachedIndex);

        if (marker && _mvPendingRedirect) {
            const pending = _mvPendingRedirect;
            _mvPendingRedirect = null;
            _continueWalkFromNode(sprite, marker.key, pending.target, pending.onArrived);
            return;
        }

        _walkAlongPath(sprite, points, markers, segIdx + 1, onComplete);
    });
}

function _continueWalkFromNode(sprite, fromNodeKey, target, onArrived) {
    const walkingBar = document.getElementById('mv-walking-bar');
    const { points, markers } = _findWalkPathWithMarkers(fromNodeKey, target);

    const finish = () => {
        _mvWalking = false;
        sprite.classList.remove('walking');
        if (walkingBar) walkingBar.classList.remove('show');
        if (typeof _stopAvatarWalkAnimation === 'function') _stopAvatarWalkAnimation();

        _mvCurrentWorldIdx = (target === 'home') ? null : target;
        _saveSpritePosition(_mvCurrentWorldIdx);

        if (typeof onArrived === 'function') onArrived();
    };

    if (points.length < 2) { finish(); return; }
    _walkAlongPath(sprite, points, markers, 0, finish);
}

/**
 * Saves the sprite's new world position to STATE and persists it.
 * Pass null for worldIdx to represent the home outpost.
 *
 * @param {number|null} worldIdx
 */
function _saveSpritePosition(worldIdx) {
    if (STATE) {
        STATE.mapSpriteWorldIndex = worldIdx;
        if (typeof save === 'function') save();
    }
}

/**
 * Starts a walk animation that moves the sprite to a destination world node.
 * Calls onArrived when the sprite reaches the destination.
 *
 * @param {number}   targetWorldIdx - Destination world index
 * @param {Function} onArrived      - Callback fired on arrival
 */
function _walkSpriteTo(targetWorldIdx, onArrived) {
    const sprite = document.getElementById('mv-sprite');
    if (!sprite) return;

    if (_mvWalking) {
        _mvPendingRedirect = { target: targetWorldIdx, onArrived };
        return;
    }

    _mvWalking = true;
    sprite.classList.add('walking');
    if (typeof _startAvatarWalkAnimation === 'function') _startAvatarWalkAnimation('mv-sprite-img');

    _continueWalkFromNode(sprite, _mvCurrentWorldIdx, targetWorldIdx, onArrived);
}





/**
 * Called when the sprite finishes walking to a world node.
 * Cleans up walk state and fires the onArrived callback.
 *
 * @param {HTMLElement}  sprite
 * @param {HTMLElement|null} walkingBar
 * @param {number}       targetWorldIdx
 * @param {Function}     onArrived
 */


/**
 * Starts a walk animation that returns the sprite to the home outpost.
 */
function _walkSpriteToHome() {
    const sprite = document.getElementById('mv-sprite');
    if (!sprite) return;

    if (_mvWalking) {
        _mvPendingRedirect = { target: 'home', onArrived: null };
        return;
    }

    _mvWalking = true;
    sprite.classList.add('walking');
    if (typeof _startAvatarWalkAnimation === 'function') _startAvatarWalkAnimation('mv-sprite-img');

    _continueWalkFromNode(sprite, _mvCurrentWorldIdx, 'home', null);
}

/**
 * Called when the sprite finishes walking back to the home outpost.
 * Cleans up walk state and updates position tracking.
 *
 * @param {HTMLElement} sprite
 */



//------------------------------------------------------------------------
//-------------------SPRITE BUILDER--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Creates and returns the player sprite DOM element.
 * The sprite image is sourced from _getPlayerCharacterImage() if available,
 * otherwise falls back to the default no-class sprite.
 *
 * @returns {HTMLElement}
 */
function _buildMapSprite() {
    const sprite = document.createElement('div');
    sprite.className = 'mv-sprite';
    sprite.id = 'mv-sprite';

    const img = document.createElement('img');
    img.id = 'mv-sprite-img';
    img.src = (typeof _getPlayerCharacterImage === 'function')
        ? _getPlayerCharacterImage()
        : 'images/sprites/Stox_noclass.png';
    img.alt = 'Player';
    img.draggable = false;

    sprite.appendChild(img);
    return sprite;
}

/**
 * Instantly positions the sprite at a given world (or at home if worldIdx is null).
 *
 * @param {HTMLElement}  sprite   - The sprite element
 * @param {number|null}  worldIdx - World index, or null for home
 */
function _placeSprite(sprite, worldIdx) {
    const pos = (worldIdx === null) ? MAP_HOME_POS : MAP_WORLD_POSITIONS[worldIdx];
    if (!pos || !sprite) return;

    const canvas = document.getElementById('mv-canvas');
    const { x, y } = _imgPctToCanvasPct(pos.x, pos.y, canvas);
    sprite.style.left = x + '%';
    sprite.style.top = y + '%';
}


//------------------------------------------------------------------------
//-------------------TOOLTIP----------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Returns the tooltip element, creating it if it doesn't exist yet.
 * The tooltip is appended to document.body to avoid clipping from overflow:hidden.
 *
 * @returns {HTMLElement}
 */
function _ensureTooltipElement() {
    let tip = document.getElementById('mv-tooltip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'mv-tooltip';
        tip.className = 'mv-tooltip';
        document.body.appendChild(tip);
    }
    return tip;
}

/**
 * Builds the inner HTML content for the world tooltip.
 *
 * @param {number}  wi       - World index
 * @param {boolean} isDone   - Whether the world is completed
 * @param {boolean} isLocked - Whether the world is locked
 * @returns {string} HTML string
 */
function _buildTooltipContent(wi, isDone, isLocked) {
    const label = _getWorldLabel(wi);
    let statusText;

    if (wi === 13) {
        // Nexus has special unlock text
        statusText = isLocked
            ? (LANG === 'de' ? '🔒 Schließe alle Welten ab' : '🔒 Clear all Worlds to unlock')
            : (LANG === 'de' ? '🌌 Betrete den Nexus' : '🌌 Enter the Nexus');
    } else {
        const worldData = WORLDS && WORLDS[wi];
        const levelCount = worldData ? worldData.data.length : '?';

        if (isDone) {
            statusText = LANG === 'de'
                ? `✓ Abgeschlossen · ${levelCount} Level`
                : `✓ Complete · ${levelCount} levels`;
        } else if (isLocked) {
            statusText = LANG === 'de' ? '🔒 Gesperrt' : '🔒 Locked';
        } else {
            statusText = LANG === 'de' ? `${levelCount} Level` : `${levelCount} levels`;
        }
    }

    return `<div class="mv-tooltip-title">${label}</div><div class="mv-tooltip-sub">${statusText}</div>`;
}

/**
 * Shows the world tooltip near the mouse cursor.
 *
 * @param {MouseEvent} e
 * @param {number}  wi
 * @param {boolean} isDone
 * @param {boolean} isLocked
 */
function _showWorldTooltip(e, wi, isDone, isLocked) {
    const tip = _ensureTooltipElement();
    tip.innerHTML = _buildTooltipContent(wi, isDone, isLocked);
    tip.classList.add('show');
    _trackTooltipToMouse(e);
}

/**
 * Moves the tooltip to follow the mouse cursor.
 *
 * @param {MouseEvent} e
 */
function _trackTooltipToMouse(e) {
    const tip = document.getElementById('mv-tooltip');
    if (!tip) return;
    tip.style.left = (e.clientX + 14) + 'px';
    tip.style.top = Math.min(e.clientY + 14, window.innerHeight - 80) + 'px';
}

/**
 * Hides the world tooltip.
 */
function _hideWorldTooltip() {
    const tip = document.getElementById('mv-tooltip');
    if (tip) tip.classList.remove('show');
}


//------------------------------------------------------------------------
//-------------------ENTER BUTTON-----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Creates the "Enter World" button that appears above a world node
 * after the sprite has walked to it. Dismisses itself when the player
 * clicks it (triggering world entry) or clicks elsewhere on the map.
 *
 * @param {number} wi - World index
 * @returns {HTMLButtonElement}
 */
function _buildEnterButton(wi) {
    const pos = MAP_WORLD_POSITIONS[wi];
    const label = _getWorldLabel(wi);
    const btnText = LANG === 'de' ? `▶ ${label} betreten` : `▶ Enter ${label}`;

    const canvas = document.getElementById('mv-canvas');
    const { x, y } = _imgPctToCanvasPct(pos.x, pos.y, canvas);

    const btn = document.createElement('button');
    btn.id = 'mv-enter-btn';
    btn.textContent = btnText;
    btn.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: calc(${y}% - 52px);
        transform: translateX(-50%);
        z-index: 10;
        font-family: var(--PX, monospace);
        font-size: 11px;
        padding: 5px 12px;
        background: #c8a84b;
        color: #1a0d00;
        border: none;
        cursor: pointer;
        letter-spacing: 1px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.7);
    `;

    btn.addEventListener('click', () => {
        btn.remove();
        if (typeof showWorldDetail === 'function') showWorldDetail(wi);
    });

    return btn;
}

/**
 * Registers a click-outside handler that dismisses the enter button
 * when the player clicks anywhere on the map canvas except the button itself.
 *
 * @param {HTMLButtonElement} btn
 */
function _registerEnterButtonDismiss(btn) {
    const canvas = document.getElementById('mv-canvas');
    if (!canvas) return;

    const dismiss = (e) => {
        if (e.target !== btn) {
            btn.remove();
            canvas.removeEventListener('click', dismiss);
        }
    };

    // Delay by one tick so the triggering click doesn't immediately dismiss the button
    setTimeout(() => canvas.addEventListener('click', dismiss), 50);
}

/**
 * Shows the "Enter World" button above the given world node.
 * Removes any previously shown enter button first.
 *
 * @param {number} wi - World index
 */
function _showEnterButton(wi) {
    const existing = document.getElementById('mv-enter-btn');
    if (existing) existing.remove();

    const pos = MAP_WORLD_POSITIONS[wi];
    if (!pos) return;

    const btn = _buildEnterButton(wi);
    const canvas = document.getElementById('mv-canvas');
    if (canvas) canvas.appendChild(btn);

    _registerEnterButtonDismiss(btn);
}


//------------------------------------------------------------------------
//-------------------WORLD NODE BUILDER----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Picks the icon character/string to display inside a world node ring.
 *
 * @param {number}  wi       - World index
 * @param {boolean} isDone   - World is completed
 * @param {boolean} isLocked - World is locked
 * @returns {string|number}
 */
function _getWorldNodeIcon(wi, isDone, isLocked) {
    if (wi === 13) return '🌌'; // Nexus always shows its galaxy icon
    if (isDone) return `${wi + 1}`;
    if (isLocked) return '🔒';
    return wi + 1;              // Display 1-based world number for unlocked worlds
}


/**
 * Builds the healing-effect HTML for a world node, layered behind the ring.
 */
function _buildWorldHealingEffectHtml(tier) {
    let html = `<div class="mv-heal-glow mv-heal-glow-${tier}"></div>`;

    if (tier >= 2) {
        html += `
            <div class="mv-heal-vines">
                <span class="mv-heal-leaf mv-heal-leaf-1">🌿</span>
                <span class="mv-heal-leaf mv-heal-leaf-2">🌿</span>
                <span class="mv-heal-leaf mv-heal-leaf-3">🍃</span>
            </div>`;
    }

    if (tier >= 3) {
        html += `
            <div class="mv-heal-bloom">
                <span class="mv-heal-petal mv-heal-petal-1">✨</span>
                <span class="mv-heal-petal mv-heal-petal-2">✨</span>
                <span class="mv-heal-petal mv-heal-petal-3">🌸</span>
                <span class="mv-heal-petal mv-heal-petal-4">🌸</span>
            </div>`;
    }

    return html;
}


/**
 * Applies the correct CSS state class (done / locked / available) to a world node.
 *
 * @param {HTMLElement} node
 * @param {boolean} isDone
 * @param {boolean} isLocked
 */
function _applyWorldNodeStateClass(node, isDone, isLocked, healingTier) {
    if (isDone) node.classList.add('done');
    else if (isLocked) node.classList.add('locked');
    else node.classList.add('available');

    if (healingTier > 0) node.classList.add('healing-tier-' + healingTier);
}

/**
 * Attaches mouse event listeners for the world tooltip to a node element.
 *
 * @param {HTMLElement} node
 * @param {number}  wi
 * @param {boolean} isDone
 * @param {boolean} isLocked
 */
function _attachNodeTooltipEvents(node, wi, isDone, isLocked) {
    node.addEventListener('mouseenter', (e) => _showWorldTooltip(e, wi, isDone, isLocked));
    node.addEventListener('mousemove', (e) => _trackTooltipToMouse(e));
    node.addEventListener('mouseleave', () => _hideWorldTooltip());
}

/**
 * Builds and returns a world node DOM element, fully configured with
 * position, state classes, icon, label, and event listeners.
 *
 * @param {{ x: number, y: number, labelEN: string, labelDE: string }} pos
 * @param {number} wi - World index
 * @returns {HTMLElement}
 */
function _buildWorldNode(pos, wi) {
    const canvas = document.getElementById('mv-canvas');
    const isDone = _isWorldComplete(wi);
    const isLocked = !_isWorldAccessible(wi);
    const healingTier = _getWorldHealingTier(wi); // Nexus (wi 13) safely returns 0

    const node = document.createElement('div');
    node.className = 'mv-world-node';
    node.dataset.wi = wi;
    node.dataset.imgX = pos.x;
    node.dataset.imgY = pos.y;

    _applyPositionToElement(node, pos.x, pos.y, canvas);
    _applyWorldNodeStateClass(node, isDone, isLocked, healingTier);

    const icon = _getWorldNodeIcon(wi, isDone, isLocked);
    const healingHtml = healingTier > 0 ? _buildWorldHealingEffectHtml(healingTier) : '';

    node.innerHTML = `
        ${healingHtml}
        <div class="mv-node-ring">${icon}</div>
    `;

    if (!isLocked) {
        node.addEventListener('click', () => _onWorldNodeClick(wi));
    }

    _attachNodeTooltipEvents(node, wi, isDone, isLocked);

    return node;
}


//------------------------------------------------------------------------
//-------------------WORLD NODE CLICK------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Handles a click on a world node.
 * Walks the sprite to the node and then shows the "Enter World" button.
 *
 * @param {number} wi - World index
 */
function _onWorldNodeClick(wi) {
    _walkSpriteTo(wi, () => _showEnterButton(wi));
}


//------------------------------------------------------------------------
//-------------------PATH DRAWING-----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Converts a single road segment's waypoints from image-% coordinates
 * to SVG pixel coordinates and returns an SVG points string.
 *
 * @param {Array<{ x, y }>} waypoints
 * @param {HTMLElement}     canvas
 * @param {number}          svgW - SVG viewBox width
 * @param {number}          svgH - SVG viewBox height
 * @returns {string} SVG points attribute value
 */
function _waypointsToSVGPoints(waypoints, canvas, svgW, svgH) {
    return waypoints.map(p => {
        const { x, y } = _imgPctToCanvasPct(p.x, p.y, canvas);
        return `${x / 100 * svgW} ${y / 100 * svgH}`;
    }).join(' ');
}

/**
 * Clears and redraws all road segments as SVG polylines.
 * Called once on build and again whenever the canvas resizes.
 *
 * @param {SVGElement} svg - The SVG layer element
 * @param {number}     w   - Canvas width in pixels
 * @param {number}     h   - Canvas height in pixels
 */
function _drawAllPaths(svg, w, h) {
    svg.innerHTML = '';
    const canvas = document.getElementById('mv-canvas');

    ROAD_SEGMENTS.forEach(segment => {
        if (!segment.waypoints || segment.waypoints.length === 0) return;

        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', _waypointsToSVGPoints(segment.waypoints, canvas, w, h));
        polyline.setAttribute('fill', 'none');
        polyline.classList.add('mv-path-segment');
        svg.appendChild(polyline);
    });
}


//------------------------------------------------------------------------
//-------------------MAP CANVAS BUILDER----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Creates and returns the SVG layer used for drawing road paths.
 * The SVG's viewBox is updated once the canvas has layout dimensions.
 *
 * @param {HTMLElement} canvas - Parent canvas element
 * @returns {SVGElement}
 */
function _buildPathsSVG(canvas) {
    // Path lines disabled — no longer drawing the SVG road overlay
    return null;
}

/**
 * Creates and returns the Cartographer's Outpost (home) marker element.
 * Clicking it walks the sprite back home.
 *
 * @returns {HTMLElement}
 */
function _buildHomeMarker() {
    const marker = document.createElement('div');
    marker.className = 'mv-home-marker';
    marker.style.left = MAP_HOME_POS.x + '%';
    marker.style.top = MAP_HOME_POS.y + '%';
    marker.textContent = '🛖';
    marker.style.cursor = 'pointer';
    marker.style.pointerEvents = 'auto';
    marker.addEventListener('click', () => {
        _walkSpriteToHome();
    });
    return marker;
}

/**
 * Creates and returns the outpost label element shown beneath the home marker.
 *
 * @returns {HTMLElement}
 */
function _buildOutpostLabel() {
    const label = document.createElement('div');
    label.className = 'mv-outpost-label';
    label.style.left = MAP_HOME_POS.x + '%';
    label.style.top = MAP_HOME_POS.y + '%';
    return label;
}

/**
 * Appends all world node elements to the canvas.
 * Nodes are skipped if their world data doesn't exist yet (except for the Nexus at wi=13).
 *
 * @param {HTMLElement} canvas
 */
function _appendWorldNodes(canvas) {
    MAP_WORLD_POSITIONS.forEach((pos, wi) => {
        // Skip worlds for which no data exists yet (but always include the Nexus)
        if (wi >= (WORLDS ? WORLDS.length : 0) && wi < 13) return;
        canvas.appendChild(_buildWorldNode(pos, wi));
    });
}

/**
 * Attaches a temporary dev-helper click listener that logs canvas coordinates
 * to the console in waypoint format. Remove when no longer needed.
 *
 * @param {HTMLElement} canvas
 */
function _attachWaypointDebugLogger(canvas) {
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const cw = canvas.offsetWidth;
        const ch = canvas.offsetHeight;

        const containerAspect = cw / ch;
        let imgW, imgH, imgX, imgY;

        if (containerAspect > MAP_IMAGE_ASPECT) {
            imgH = ch;
            imgW = ch * MAP_IMAGE_ASPECT;
            imgX = (cw - imgW) / 2;
            imgY = 0;
        } else {
            imgW = cw;
            imgH = cw / MAP_IMAGE_ASPECT;
            imgX = 0;
            imgY = (ch - imgH) / 2;
        }

        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const imgPctX = ((clickX - imgX) / imgW * 100).toFixed(1);
        const imgPctY = ((clickY - imgY) / imgH * 100).toFixed(1);

        //console.log(`{ x: ${imgPctX}, y: ${imgPctY} },`);
    });
}

/**
 * Sets up a ResizeObserver that repositions all map elements whenever
 * the canvas element changes size (e.g. window resize or layout change).
 *
 * @param {HTMLElement} canvas
 */
function _attachResizeObserver(canvas) {
    if (window._mvResizeObserver) window._mvResizeObserver.disconnect();
    window._mvResizeObserver = new ResizeObserver(() => _repositionAllMapElements());
    window._mvResizeObserver.observe(canvas);
}

/**
 * Repositions all map elements (nodes, home marker, sprite, paths) after
 * a canvas resize. Called by the ResizeObserver.
 */
function _repositionAllMapElements() {
    const canvas = document.getElementById('mv-canvas');
    if (!canvas) return;

    // Dismiss the "Enter World" button on resize (its position would otherwise drift)
    const enterBtn = document.getElementById('mv-enter-btn');
    if (enterBtn) enterBtn.remove();

    // Reposition world nodes using their stored image-% coordinates
    canvas.querySelectorAll('.mv-world-node').forEach(node => {
        _applyPositionToElement(node, parseFloat(node.dataset.imgX), parseFloat(node.dataset.imgY), canvas);
    });

    // Reposition home marker and outpost label
    const homeMarker = canvas.querySelector('.mv-home-marker');
    const outpostLabel = canvas.querySelector('.mv-outpost-label');
    if (homeMarker || outpostLabel) {
        const { x, y } = _imgPctToCanvasPct(MAP_HOME_POS.x, MAP_HOME_POS.y, canvas);
        if (homeMarker) { homeMarker.style.left = x + '%'; homeMarker.style.top = y + '%'; }
        if (outpostLabel) { outpostLabel.style.left = x + '%'; outpostLabel.style.top = y + '%'; }
    }

    // Reposition the sprite
    const sprite = document.getElementById('mv-sprite');
    if (sprite) _placeSprite(sprite, _mvCurrentWorldIdx);
}

/**
 * Builds the entire map canvas and all its child elements from scratch.
 * Clears any previous canvas content first.
 */
function _buildMapCanvas() {
    const wrap = document.getElementById('mv-canvas-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';

    // Main canvas div — fills the wrap, acts as the coordinate root for all children
    const canvas = document.createElement('div');
    canvas.className = 'mv-canvas';
    canvas.id = 'mv-canvas';
    canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%;';
    wrap.appendChild(canvas);
    _mvCanvasEl = canvas;

    _buildPathsSVG(canvas);
    canvas.appendChild(_buildHomeMarker());
    canvas.appendChild(_buildOutpostLabel());
    _appendWorldNodes(canvas);

    const sprite = _buildMapSprite();
    canvas.appendChild(sprite);

    _ensureTooltipElement();
    _placeSprite(sprite, _mvCurrentWorldIdx);

    _attachWaypointDebugLogger(canvas);  // TEMP — remove when waypoints are finalised
    _attachResizeObserver(canvas);
}


//------------------------------------------------------------------------
//-------------------TOP BAR----------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Populates the active mods row in the map view top bar.
 */
function _renderTopBarMods() {
    const modEl = document.getElementById('mv-ls-mods');
    const diffEl = document.getElementById('mv-ls-diff');
    if (!modEl || !diffEl) return;

    // Difficulty tag in its own line
    diffEl.textContent = t ? t('diff_' + curDiff) : curDiff;

    // Active mod abbreviations on the second line (empty string if none active)
    const active = Object.keys(curMods || {}).filter(m => curMods[m]);
    modEl.innerHTML = active
        .map(m => `<span class="mod-tag ${MOD_CLASSES[m] || 'diff'}">${MOD_LABELS[m] || m}</span>`)
        .join(' ');
}

/**
 * Renders the total score display in the map view top bar.
 */
function _renderTopBarScore() {
    const scoreEl = document.getElementById('mv-ls-score');
    if (scoreEl) {
        scoreEl.textContent =  (STATE ? STATE.totalScore : 0);
    }
}

/**
 * Renders the "points to next code" display in the map view top bar.
 */
function _renderTopBarNextCode() {
    const ptsNextEl = document.getElementById('mv-ls-pts-next');
    if (ptsNextEl && typeof buildNextCodeStr === 'function') {
        ptsNextEl.textContent = buildNextCodeStr();
    }
}

/**
 * Renders the player class / ascendency status widget in the map view top bar.
 */
function _renderTopBarClassStatus() {
    const classEl = document.getElementById('mv-class-status');
    if (!classEl) return;

    if (STATE && STATE.playerClass) {
        const def = CLASS_DEFS[STATE.playerClass];
        const asc = STATE.playerAscendency ? ASCENDENCY_DEFS[STATE.playerAscendency] : null;
        applyClassStatusActiveStyle(classEl, def, asc);
    } else {
        applyClassStatusEmptyStyle(classEl);
    }
}

/**
 * Shows or hides the quest log notification badge in the map view top bar.
 */
function _renderTopBarQuestBadge() {
    const badge = document.getElementById('mv-quest-log-badge');
    if (badge && typeof hasActiveQuestNotification === 'function') {
        badge.style.display = hasActiveQuestNotification() ? 'inline' : 'none';
    }
}

/**
 * Wires up the navigation buttons in the map view top bar.
 * Using .onclick assignment is intentional — it's safe to call multiple times
 * without accumulating duplicate event listeners.
 */
function _wireTopBarButtons() {
    const backBtn = document.getElementById('mv-btn-back');
    const questBtn = document.getElementById('mv-btn-quest-log');
    const treeBtn = document.getElementById('mv-btn-passive-tree');

    if (backBtn) backBtn.onclick = () => showSetup();
    if (questBtn) questBtn.onclick = () => showQuestLog();
    if (treeBtn) treeBtn.onclick = () => showPassiveTree();
}

/**
 * Builds / updates the entire map view top bar.
 * Renders all stat widgets and wires up navigation buttons.
 */
function _buildMapViewTopBar() {
    _renderTopBarMods();
    _renderTopBarScore();
    _renderTopBarNextCode();
    _renderTopBarClassStatus();
    _renderTopBarQuestBadge();
    _wireTopBarButtons();

    // Inject the character portrait into the top bar (defined externally)
    if (typeof renderLSCharacterAvatar === 'function') renderLSCharacterAvatar();
}


//------------------------------------------------------------------------
//-------------------LAYOUT TOGGLE----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Updates the text and active-state class of all map-view toggle buttons
 * based on the current view mode stored in STATE.
 */
function _updateToggleButtonLabels() {
    const isMap = STATE && STATE.mapViewEnabled;
    const label = isMap
        ? (LANG === 'de' ? 'LISTE' : 'LIST')
        : (LANG === 'de' ? 'KARTE' : 'MAP');

    ['btn-toggle-map-view', 'btn-toggle-map-view-mv'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.textContent = label;
        btn.classList.toggle('active-view', !!isMap);
    });
}

/**
 * Toggles between the classic level-select list view and the map view.
 * Persists the preference in STATE.mapViewEnabled and saves.
 */
function toggleMapView() {
    if (!STATE) return;

    STATE.mapViewEnabled = !STATE.mapViewEnabled;
    if (typeof save === 'function') save();

    if (STATE.mapViewEnabled) {
        showMapView();
    } else {
        _ptReturnScreen = 'screen-levels';
        _ptReturnWorldIndex = null;   
        switchScreen('screen-levels');
        if (typeof renderLevelSelect === 'function') renderLevelSelect();
    }

    _updateToggleButtonLabels();
}

/**
 * Initialises the map view toggle buttons.
 * Call this on DOMContentLoaded / after STATE has loaded.
 */
function initMapViewToggle() {
    _updateToggleButtonLabels();

    ['btn-toggle-map-view', 'btn-toggle-map-view-mv'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', toggleMapView);
    });
}


//------------------------------------------------------------------------
//-------------------ENTRY POINT------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Shows the map view screen.
 * Call this instead of renderLevelSelect() when STATE.mapViewEnabled is true.
 */
function showMapView() {
    _mvCurrentWorldIdx = (STATE && STATE.mapSpriteWorldIndex !== undefined)
        ? STATE.mapSpriteWorldIndex
        : null;
    _mvPendingRedirect = null;

    _ptReturnScreen = 'screen-map-view';
    _ptReturnWorldIndex = null;   

    _updateToggleButtonLabels();
    _buildMapViewTopBar();
    _buildMapCanvas();

    switchScreen('screen-map-view');
}