/*
    ========================================================================
    SCREENS-WORLD-LEVELS.JS
    ========================================================================
    Handles the per-world level selection screen in Map View.
    Reusable for all 13 worlds.

    Configuration data (background images, node positions, etc.) lives in
    screens-world-levels-config.js (WD_WORLD_CONFIGS).

    STATE:
      STATE.wdSpriteLevel[wi]  — last level index sprite was at (null = entrance)

    SECTION ORDER:
      1. Constants & Module State
      2. Coordinate Helpers
      3. Road Graph Building
      4. Road Pathfinding (BFS)
      5. Road Path Drawing (SVG)
      6. Level Node State Checks
      7. Level Node Effect HTML Builders
      8. Level Node Builder
      9. Entrance Marker
     10. Sprite Building & Placement
     11. Sprite Walk Animation
     12. Top Bar
     13. Canvas Building & Resize
     14. Enter Button
     15. Tooltip
     16. Dev Tools
     17. State Sync (External API)
     18. Entry Point
    ========================================================================
*/

'use strict';


//------------------------------------------------------------------------
//-------------------CONSTANTS & MODULE STATE------------------------------
//------------------------------------------------------------------------

// Fallback aspect ratio used when a world config doesn't define imageAspect
const WD_DEFAULT_IMAGE_ASPECT = 16 / 9;

// How fast the player sprite walks across the canvas, in pixels per second
const WD_WALK_SPEED_PX_PER_SEC = 80;

// Currently open world index (0-based), or null if screen not built yet
let _wdCurrentWi = null;

// Level index the sprite is currently standing on (null = at entrance)
let _wdCurrentLevelIdx = null;

// True while a walk animation is in progress — blocks new walk requests
let _wdWalking = false;

// requestAnimationFrame handle for the current walk animation (used to cancel it)
let _wdWalkAnim = null;

let _wdPendingRedirect = null;


//------------------------------------------------------------------------
//-------------------COORDINATE HELPERS------------------------------------
//------------------------------------------------------------------------
// The background image uses background-size:contain, which means it may be
// pillarboxed (bars on left/right) or letterboxed (bars on top/bottom)
// depending on how the canvas aspect ratio compares to the image aspect ratio.
//
// Node positions in WD_WORLD_CONFIGS are defined as image-relative percentages
// (0,0 = top-left of the IMAGE). These helpers convert those into
// canvas-relative percentages (0,0 = top-left of the CANVAS DIV), so that
// elements placed using CSS left/top actually land on the correct image pixel.

/**
 * Returns the pixel rect (width, height, x offset, y offset) of the image
 * within the canvas, accounting for pillarbox / letterbox bars.
 */
function _wdGetImageRectInCanvas(canvasWidth, canvasHeight, imageAspect) {
    const containerAspect = canvasWidth / canvasHeight;
    let imgW, imgH, imgX, imgY;

    if (containerAspect > imageAspect) {
        // Pillarboxed: image is narrower than the canvas — bars left & right
        imgH = canvasHeight;
        imgW = canvasHeight * imageAspect;
        imgX = (canvasWidth - imgW) / 2;
        imgY = 0;
    } else {
        // Letterboxed: image is shorter than the canvas — bars top & bottom
        imgW = canvasWidth;
        imgH = canvasWidth / imageAspect;
        imgX = 0;
        imgY = (canvasHeight - imgH) / 2;
    }

    return { imgW, imgH, imgX, imgY };
}

/**
 * Converts image-relative percentages into canvas-relative percentages.
 * Use this for positioning any node, marker, or sprite whose position is
 * defined as image-relative coordinates in WD_WORLD_CONFIGS.
 */
function _wdImgPctToCanvasPct(imgPctX, imgPctY, canvas, cfg) {
    const cw = canvas.offsetWidth;
    const ch = canvas.offsetHeight;

    // Canvas has no size yet — return the raw values as a safe fallback
    if (!cw || !ch) return { x: imgPctX, y: imgPctY };

    const aspect = (cfg && cfg.imageAspect) ? cfg.imageAspect : WD_DEFAULT_IMAGE_ASPECT;
    const { imgW, imgH, imgX, imgY } = _wdGetImageRectInCanvas(cw, ch, aspect);

    const pxX = imgX + (imgPctX / 100) * imgW;
    const pxY = imgY + (imgPctY / 100) * imgH;

    return { x: (pxX / cw) * 100, y: (pxY / ch) * 100 };
}


//------------------------------------------------------------------------
//-------------------ROAD GRAPH BUILDING-----------------------------------
//------------------------------------------------------------------------
// The road network is always a linear chain: entrance → node[0] → … → node[last].
// Two optional config hooks allow conditional road visibility without
// breaking the strictly linear unlock logic:
//
//   nodes[i].hideRoad: true
//       Skips drawing the auto-generated segment that leads INTO node i.
//
//   cfg.extraRoads: [{ from, to, waypoints?, showAfter? }]
//       Additional segments drawn alongside the linear chain.
//       'from'/'to' are 'entrance' or 0-based node indices.
//       If showAfter is set (a 0-based level index), the segment only appears
//       once that level is marked done — useful for shortcuts that unlock later.

/**
 * Returns the image-relative {x, y} position of a node reference.
 * nodeRef can be 'entrance', null (treated as entrance), or a 0-based index.
 */
function _wdGetNodePos(cfg, nodeRef) {
    if (nodeRef === null || nodeRef === 'entrance') return cfg.entrancePos;
    return cfg.nodes[nodeRef];
}

/**
 * Builds one linear road segment (entrance → node[0], node[0] → node[1], etc.).
 * Returns null if the node has hideRoad set, skipping that segment.
 */
function _wdBuildLinearSegment(cfg, i) {
    if (cfg.nodes[i].hideRoad) return null;

    const n1 = i === 0 ? 'entrance' : i - 1;
    const n2 = i;
    const startPos = i === 0 ? cfg.entrancePos : cfg.nodes[i - 1];
    const endPos = cfg.nodes[i];

    // Use node-defined waypoints if present, otherwise fall back to a straight line
    const waypoints = cfg.nodes[i].waypoints
        ? cfg.nodes[i].waypoints
        : [startPos, endPos];

    return { n1, n2, waypoints };
}

/**
 * Checks whether an extra road segment's showAfter condition is currently met.
 * Returns true if there is no showAfter, or if that level is already done.
 */
function _wdIsExtraRoadVisible(extra, wi) {
    if (extra.showAfter === undefined) return true;
    const gi = WORLD_START_GI[wi] + extra.showAfter;
    return !!(STATE && STATE.done && STATE.done.includes(gi));
}

/**
 * Builds a road segment object for one entry in cfg.extraRoads.
 */
function _wdBuildExtraSegment(cfg, extra) {
    const waypoints = extra.waypoints
        ? extra.waypoints
        : [_wdGetNodePos(cfg, extra.from), _wdGetNodePos(cfg, extra.to)];

    return { n1: extra.from, n2: extra.to, waypoints };
}

/**
 * Builds the full list of road segments that should currently be drawn:
 * the linear chain (minus hideRoad nodes) plus any visible extraRoads.
 * Returns an array of { n1, n2, waypoints } objects.
 */
function _wdBuildRoads(cfg, wi) {
    const roads = [];

    // Linear chain
    for (let i = 0; i < cfg.nodes.length; i++) {
        const seg = _wdBuildLinearSegment(cfg, i);
        if (seg) roads.push(seg);
    }

    // Extra / conditional segments
    if (cfg.extraRoads) {
        for (const extra of cfg.extraRoads) {
            if (_wdIsExtraRoadVisible(extra, wi)) {
                roads.push(_wdBuildExtraSegment(cfg, extra));
            }
        }
    }

    return roads;
}


//------------------------------------------------------------------------
//-------------------ROAD PATHFINDING (BFS)--------------------------------
//------------------------------------------------------------------------
// Given the current road graph, finds the shortest walk path between any
// two nodes using a simple BFS over the bidirectional adjacency map.

/**
 * Returns a stable string key for a node reference ('entrance' or index).
 * Used as Map keys in the BFS adjacency structure.
 */
function _wdNodeKey(n) {
    return (n === 'entrance' || n === null) ? 'entrance' : String(n);
}

/**
 * Builds a bidirectional adjacency map from a list of road segments.
 * Each entry stores the segment and whether it was reversed (for waypoint ordering).
 */
function _wdBuildRoadAdjacency(roads) {
    const adj = new Map();

    const addEdge = (a, b, seg) => {
        const ka = _wdNodeKey(a);
        const kb = _wdNodeKey(b);
        if (!adj.has(ka)) adj.set(ka, []);
        if (!adj.has(kb)) adj.set(kb, []);
        adj.get(ka).push({ neighbor: kb, seg, reversed: false });
        adj.get(kb).push({ neighbor: ka, seg, reversed: true });
    };

    roads.forEach(seg => addEdge(seg.n1, seg.n2, seg));
    return adj;
}

/**
 * Runs BFS from startKey to endKey over the adjacency map.
 * Returns an ordered list of { seg, reversed } entries, or null if no path exists.
 */
function _wdBfsFindPath(adj, startKey, endKey) {
    if (startKey === endKey) return [];

    const visited = new Set([startKey]);
    const queue = [{ node: startKey, path: [] }];

    while (queue.length) {
        const { node, path } = queue.shift();
        for (const { neighbor, seg, reversed } of (adj.get(node) || [])) {
            if (visited.has(neighbor)) continue;
            visited.add(neighbor);
            const newPath = [...path, { seg, reversed }];
            if (neighbor === endKey) return newPath;
            queue.push({ node: neighbor, path: newPath });
        }
    }

    return null; // No path found
}

function _wdFlattenRouteToPointsWithMarkers(routeSegs) {
    const points = [];
    const markers = [];

    for (const { seg, reversed } of routeSegs) {
        const wps = reversed ? [...seg.waypoints].reverse() : [...seg.waypoints];
        const startKey = _wdNodeKey(reversed ? seg.n2 : seg.n1);
        const endKey = _wdNodeKey(reversed ? seg.n1 : seg.n2);

        if (points.length === 0) {
            points.push(...wps);
            markers.push({ index: 0, key: startKey });
        } else {
            const last = points[points.length - 1];
            const first = wps[0];
            const isDupe = first
                && Math.abs(last.x - first.x) < 0.01
                && Math.abs(last.y - first.y) < 0.01;
            points.push(...(isDupe ? wps.slice(1) : wps));
        }
        markers.push({ index: points.length - 1, key: endKey });
    }

    return { points, markers };
}

function _wdFindWalkPathWithMarkers(wi, fromNode, toNode) {
    const cfg = WD_WORLD_CONFIGS[wi];
    if (!cfg) return { points: [], markers: [] };

    const roads = _wdBuildRoads(cfg, wi);
    const adj = _wdBuildRoadAdjacency(roads);
    const startKey = _wdNodeKey(fromNode);
    const endKey = _wdNodeKey(toNode);

    const routeSegs = _wdBfsFindPath(adj, startKey, endKey);
    if (routeSegs) return _wdFlattenRouteToPointsWithMarkers(routeSegs);

    const startPos = _wdGetNodePos(cfg, fromNode);
    const endPos = _wdGetNodePos(cfg, toNode);
    if (!startPos || !endPos) return { points: [], markers: [] };

    return {
        points: [startPos, endPos],
        markers: [{ index: 0, key: startKey }, { index: 1, key: endKey }]
    };
}


/**
 * Flattens a BFS route (list of { seg, reversed }) into an ordered list of
 * {x, y} waypoints, deduplicating the shared point where segments connect.
 */
function _wdFlattenRouteToPoints(routeSegs) {
    const points = [];
    for (const { seg, reversed } of routeSegs) {
        const wps = reversed ? [...seg.waypoints].reverse() : [...seg.waypoints];
        if (points.length === 0) {
            points.push(...wps);
        } else {
            // Skip the first waypoint of each new segment if it duplicates the last
            const last = points[points.length - 1];
            const first = wps[0];
            const isDupe = first
                && Math.abs(last.x - first.x) < 0.01
                && Math.abs(last.y - first.y) < 0.01;
            points.push(...(isDupe ? wps.slice(1) : wps));
        }
    }
    return points;
}

/**
 * Finds the full walk path (list of image-relative {x, y} waypoints) between
 * two nodes in a world. fromNode/toNode are 'entrance', null, or a 0-based index.
 * Falls back to a direct straight line if no route exists in the current graph.
 */
function _wdFindWalkPath(wi, fromNode, toNode) {
    const cfg = WD_WORLD_CONFIGS[wi];
    if (!cfg) return [];

    const roads = _wdBuildRoads(cfg, wi);
    const adj = _wdBuildRoadAdjacency(roads);
    const startKey = _wdNodeKey(fromNode);
    const endKey = _wdNodeKey(toNode);

    const routeSegs = _wdBfsFindPath(adj, startKey, endKey);
    if (routeSegs) return _wdFlattenRouteToPoints(routeSegs);

    // Fallback: straight line between the two positions
    const startPos = _wdGetNodePos(cfg, fromNode);
    const endPos = _wdGetNodePos(cfg, toNode);
    return (startPos && endPos) ? [startPos, endPos] : [];
}


//------------------------------------------------------------------------
//-------------------ROAD PATH DRAWING (SVG)-------------------------------
//------------------------------------------------------------------------

/**
 * Converts a single image-relative waypoint into an absolute SVG coordinate
 * string for use in a polyline 'points' attribute.
 */
function _wdWaypointToSvgPoint(point, canvas, cfg, svgWidth, svgHeight) {
    const { x, y } = _wdImgPctToCanvasPct(point.x, point.y, canvas, cfg);
    return `${x / 100 * svgWidth} ${y / 100 * svgHeight}`;
}

/**
 * Returns true if a node has been reached by the player (entrance is always
 * reached; level nodes are reached once done or currently occupied by the sprite).
 */
function _wdIsNodeReached(n, wi) {
    if (n === 'entrance') return true;
    const gi = WORLD_START_GI[wi] + n;
    if (STATE && STATE.done && STATE.done.includes(gi)) return true;
    return _wdCurrentLevelIdx === n;
}

/**
 * Draws one road segment as an SVG polyline onto the given SVG element.
 * Adds the 'travelled' class if both endpoints have been reached.
 */
function _wdDrawRoadSegment(svg, seg, canvas, cfg, w, h, wi) {
    if (!seg.waypoints || seg.waypoints.length < 2) return;

    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute(
        'points',
        seg.waypoints.map(p => _wdWaypointToSvgPoint(p, canvas, cfg, w, h)).join(' ')
    );
    polyline.setAttribute('fill', 'none');
    polyline.classList.add('wd-path-segment');

    if (_wdIsNodeReached(seg.n1, wi) && _wdIsNodeReached(seg.n2, wi)) {
        polyline.classList.add('travelled');
    }

    svg.appendChild(polyline);
}

/**
 * Clears and redraws all road segments for the current world onto the SVG.
 */
function _wdDrawAllPaths(svg, wi, w, h) {
    svg.innerHTML = '';
    const cfg = WD_WORLD_CONFIGS[wi];
    if (!cfg) return;

    const canvas = document.getElementById('wd-canvas');
    const roads = _wdBuildRoads(cfg, wi);
    roads.forEach(seg => _wdDrawRoadSegment(svg, seg, canvas, cfg, w, h, wi));
}

/**
 * Re-reads the canvas size, updates the SVG viewBox, and redraws all paths.
 * Call this after the sprite moves or the canvas is resized.
 */
function _wdRefreshPaths(wi) {
    const svg = document.getElementById('wd-paths-svg');
    const canvas = document.getElementById('wd-canvas');
    if (!svg || !canvas) return;

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    _wdDrawAllPaths(svg, wi, w, h);
}


//------------------------------------------------------------------------
//-------------------LEVEL NODE STATE CHECKS-------------------------------
//------------------------------------------------------------------------

/**
 * Returns true if the given level index is a "convergence" node —
 * a special milestone placed roughly 1/3 and 2/3 through the world,
 * but never on the very last level. Mirrors the logic in screens-level-select.js.
 */
function _wdIsConvergenceNode(li, world) {
    if (world.data.length <= 2) return false;
    if (li === world.data.length - 1) return false;
    const c1 = Math.floor((world.data.length - 1) * (1 / 3));
    const c2 = Math.floor((world.data.length - 1) * (2 / 3));
    return li === c1 || li === c2;
}

/**
 * Returns true if the given level is accessible to the player.
 * Level 0 requires the tutorial to be done; all others require the previous level.
 */
function _wdIsLevelUnlocked(li, gi) {
    if (li === 0) return !!(STATE && STATE.tutorialDone);
    return !!(STATE && STATE.done && STATE.done.includes(gi - 1));
}

/**
 * Returns true if the given level is blocked by an unsolved Probability Gate.
 */
function _wdIsMathGated(gi) {
    return typeof isGatedLevel === 'function' && isGatedLevel(gi) && !isMathGatePassed(gi);
}

/**
 * Returns the icon string to show inside a level node's circle.
 * Convergence nodes show a leaf when not done; locked nodes show a lock.
 * All other states show the level number.
 */
function _wdGetNodeIcon(li, isDone, isLocked, isLastInWorld, isConvergence) {
    if (isLastInWorld) return `${li + 1}`;
    if (isDone) return `${li + 1}`;
    if (isLocked) return '🔒';
    if (isConvergence) return '🌿';
    return li + 1;
}


//------------------------------------------------------------------------
//-------------------LEVEL NODE EFFECT HTML BUILDERS-----------------------
//------------------------------------------------------------------------
// Each builder returns an HTML string for one of the special node effects.
// These are layered inside the node's effects container.
//
// LAYER ORDER (bottom to top):
//   1. Stoxel Aura      — void energy knot, present on EVERY node
//   2. Convergence      — green gyro rings (convergence nodes only)
//   3. Math Gate        — red cyber cage (math-gated nodes only)
//   4. Ascension        — purple star + gold beams (last node of world only)
//   5. Node Circle      — the actual clickable icon, always on top

/**
 * Builds the Stoxel Aura effect — a tangled orb of void energy visible on
 * every level node. This represents an uncleansed Stoxel corrupting the land.
 *
 * States:
 *   default (unsolved) — full crackling purple/red void energy, sparks, knot
 *   done (solved)      — aura collapses to a faint, calm residual glow
 *   locked             — slightly dimmed but still present (not yet reachable)
 *
 * The SVG uses overlapping elliptical paths to mimic the interlocking band
 * structure visible in the reference images. Sparks are small animated circles
 * placed around the perimeter.
 */
function _wdBuildStoxelAuraHtml(isDone) {
    const healedClass = isDone ? ' wd-stoxel-aura--healed' : '';

    return `
        <div class="wd-stoxel-aura${healedClass}">
            <!-- Outer crackling void glow -->
            <div class="wd-stoxel-void-glow"></div>

            <!-- The interlocking band knot (SVG) — viewBox matches the larger inset wrapper -->
            <svg class="wd-stoxel-knot-svg" viewBox="0 0 104 104" overflow="visible">
                <defs>
                    <filter id="stoxelGlow" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="3.5" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                <!-- 5 interlocking bands — thicker and denser to match the reference image -->
                <!-- Band 1: primary red loop -->
                <ellipse class="wd-stoxel-band wd-stoxel-band-1"
                    cx="52" cy="52" rx="36" ry="18"
                    fill="none" stroke-width="5" filter="url(#stoxelGlow)"/>

                <!-- Band 2: purple loop, rotated ~60deg by CSS -->
                <ellipse class="wd-stoxel-band wd-stoxel-band-2"
                    cx="52" cy="52" rx="36" ry="18"
                    fill="none" stroke-width="4.5" filter="url(#stoxelGlow)"/>

                <!-- Band 3: dark violet loop, rotated ~120deg by CSS -->
                <ellipse class="wd-stoxel-band wd-stoxel-band-3"
                    cx="52" cy="52" rx="36" ry="18"
                    fill="none" stroke-width="4" filter="url(#stoxelGlow)"/>

                <!-- Band 4: outer wide loop for density -->
                <ellipse class="wd-stoxel-band wd-stoxel-band-4"
                    cx="52" cy="52" rx="44" ry="22"
                    fill="none" stroke-width="3.5" filter="url(#stoxelGlow)"/>

                <!-- Band 5: thin inner tight loop -->
                <ellipse class="wd-stoxel-band wd-stoxel-band-5"
                    cx="52" cy="52" rx="22" ry="11"
                    fill="none" stroke-width="3" filter="url(#stoxelGlow)"/>

                <!-- Core volumetric glow -->
                <ellipse class="wd-stoxel-core"
                    cx="52" cy="52" rx="18" ry="18"
                    filter="url(#stoxelGlow)"/>

                <!-- 12 spark particles spread around the full perimeter -->
                <!--
                <circle class="wd-stoxel-spark wd-spark-0"  cx="52"  cy="4"   r="2.5"/>
                <circle class="wd-stoxel-spark wd-spark-1"  cx="82"  cy="14"  r="2"/>
                <circle class="wd-stoxel-spark wd-spark-2"  cx="100" cy="40"  r="2.5"/>
                <circle class="wd-stoxel-spark wd-spark-3"  cx="96"  cy="72"  r="2"/>
                <circle class="wd-stoxel-spark wd-spark-4"  cx="74"  cy="96"  r="2.5"/>
                <circle class="wd-stoxel-spark wd-spark-5"  cx="38"  cy="100" r="2"/>
                <circle class="wd-stoxel-spark wd-spark-6"  cx="8"   cy="80"  r="2.5"/>
                <circle class="wd-stoxel-spark wd-spark-7"  cx="4"   cy="46"  r="2"/>
                <circle class="wd-stoxel-spark wd-spark-8"  cx="18"  cy="14"  r="2.5"/>
                <circle class="wd-stoxel-spark wd-spark-9"  cx="68"  cy="6"   r="2"/>
                <circle class="wd-stoxel-spark wd-spark-10" cx="102" cy="58"  r="2.5"/>
                <circle class="wd-stoxel-spark wd-spark-11" cx="14"  cy="62"  r="2"/> -->
            </svg>

            <!-- 6 lightning crackle bolts radiating outward in all directions -->
            <div class="wd-stoxel-crackle wd-crackle-a"></div>
            <div class="wd-stoxel-crackle wd-crackle-b"></div>
            <div class="wd-stoxel-crackle wd-crackle-c"></div>
            <div class="wd-stoxel-crackle wd-crackle-d"></div>
            <div class="wd-stoxel-crackle wd-crackle-e"></div>
            <div class="wd-stoxel-crackle wd-crackle-f"></div>
        </div>
    `;
}

/**
 * Builds the HTML for the glowing tree SVG that appears on a completed
 * convergence node. Returns an empty string if the node is not yet done.
 */
function _wdBuildConvergenceTreeHtml(isDone) {
    if (!isDone) return '';
    return `
        <div class="wd-3d-beam-tree">
            <div class="wd-tree-backdrop-shadow"></div>
            <svg class="wd-tree-glow-svg" viewBox="0 0 100 160">
                <path class="wd-tree-branch trunk"    d="M50,160 Q50,95 50,35"     fill="none" />
                <path class="wd-tree-branch twig"     d="M50,130 Q30,110 15,100"   fill="none" />
                <path class="wd-tree-branch twig"     d="M50,115 Q70,95 85,85"     fill="none" />
                <path class="wd-tree-branch twig"     d="M50,85 Q25,65 18,50"      fill="none" />
                <path class="wd-tree-branch twig"     d="M50,70 Q75,50 82,35"      fill="none" />
                <path class="wd-tree-branch twig"     d="M50,48 Q32,32 30,15"      fill="none" />
                <path class="wd-tree-branch twig-sub" d="M30,110 Q18,118 8,115"    fill="none" />
                <path class="wd-tree-branch twig-sub" d="M70,93 Q82,98 92,92"      fill="none" />
                <path class="wd-tree-branch twig-sub" d="M32,56 Q20,46 22,32"      fill="none" />
                <circle class="wd-tree-leaf" cx="15" cy="100" r="5"   />
                <circle class="wd-tree-leaf" cx="85" cy="85"  r="5"   />
                <circle class="wd-tree-leaf" cx="18" cy="50"  r="5.5" />
                <circle class="wd-tree-leaf" cx="82" cy="35"  r="5.5" />
                <circle class="wd-tree-leaf" cx="30" cy="15"  r="5"   />
                <circle class="wd-tree-leaf" cx="50" cy="35"  r="6"   />
                <circle class="wd-tree-leaf" cx="8"  cy="115" r="4"   />
                <circle class="wd-tree-leaf" cx="92" cy="92"  r="4"   />
                <circle class="wd-tree-leaf" cx="22" cy="32"  r="4.5" />
                <circle class="wd-tree-leaf" cx="30" cy="110" r="3.5" />
                <circle class="wd-tree-leaf" cx="70" cy="93"  r="3.5" />
                <circle class="wd-tree-leaf" cx="32" cy="38"  r="4"   />
            </svg>
        </div>
    `;
}

/**
 * Builds the full convergence effect HTML: three spinning 3D rings plus the
 * optional glowing tree (shown only once the level is completed).
 */
function _wdBuildConvergenceHtml(isDone) {
    const treeHtml = _wdBuildConvergenceTreeHtml(isDone);
    return `
        <div class="wd-convergence-3d-wrapper">
            ${treeHtml}
            <div class="wd-3d-ring wd-3d-ring-x"></div>
            <div class="wd-3d-ring wd-3d-ring-y"></div>
            <div class="wd-3d-ring wd-3d-ring-z"></div>
            <div class="wd-3d-glow"></div>
        </div>
    `;
}

/**
 * Builds the Math Gate effect HTML: a red "cyber lockdown cage" with rings
 * and a hex shield, shown when this level is blocked by a Probability Gate.
 */
function _wdBuildMathGateHtml() {
    return `
        <div class="wd-mathgate-3d-wrapper">
            <div class="wd-gate-ring wd-gate-ring-horiz"></div>
            <div class="wd-gate-ring wd-gate-ring-vert"></div>
            <div class="wd-gate-shield-hex"></div>
            <div class="wd-gate-warning-glow"></div>
        </div>
    `;
}

/**
 * Builds the SVG beam lines that rise from each spike of the ascension star.
 * Only shown once the level is completed. Returns empty string otherwise.
 *
 * Spike tip coordinates (for a 5-pointed star centered at 70,130, outerR=44):
 *   spike0 top:         (70,    86)
 *   spike1 upper-right: (111.8, 116.4)
 *   spike2 lower-right: (95.9,  165.6)
 *   spike3 lower-left:  (44.1,  165.6)
 *   spike4 upper-left:  (28.2,  116.4)
 */
function _wdBuildAscensionBeamsHtml(isDone) {
    if (!isDone) return '';
    return `
        <g class="wd-asc-beams">
            <line class="wd-asc-beam"         x1="70"    y1="86"    x2="70"    y2="16" stroke="url(#ascBeamGrad0)" stroke-width="4"   stroke-linecap="round"/>
            <line class="wd-asc-beam delay-1" x1="111.8" y1="116.4" x2="111.8" y2="46" stroke="url(#ascBeamGrad1)" stroke-width="3.5" stroke-linecap="round"/>
            <line class="wd-asc-beam delay-2" x1="95.9"  y1="165.6" x2="95.9"  y2="95" stroke="url(#ascBeamGrad2)" stroke-width="3.5" stroke-linecap="round"/>
            <line class="wd-asc-beam delay-3" x1="44.1"  y1="165.6" x2="44.1"  y2="95" stroke="url(#ascBeamGrad3)" stroke-width="3.5" stroke-linecap="round"/>
            <line class="wd-asc-beam delay-4" x1="28.2"  y1="116.4" x2="28.2"  y2="46" stroke="url(#ascBeamGrad4)" stroke-width="3.5" stroke-linecap="round"/>
        </g>
    `;
}

/**
 * Builds the SVG <defs> block for the ascension effect:
 * per-spike gradient definitions and glow filters.
 */
function _wdBuildAscensionDefsHtml() {
    return `
        <defs>
            <linearGradient id="ascBeamGrad0" x1="70"    y1="86"    x2="70"    y2="16" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stop-color="#f1c40f" stop-opacity="1" />
                <stop offset="100%" stop-color="#f1c40f" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="ascBeamGrad1" x1="111.8" y1="116.4" x2="111.8" y2="46" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stop-color="#f1c40f" stop-opacity="1" />
                <stop offset="100%" stop-color="#f1c40f" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="ascBeamGrad2" x1="95.9"  y1="165.6" x2="95.9"  y2="95" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stop-color="#f1c40f" stop-opacity="1" />
                <stop offset="100%" stop-color="#f1c40f" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="ascBeamGrad3" x1="44.1"  y1="165.6" x2="44.1"  y2="95" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stop-color="#f1c40f" stop-opacity="1" />
                <stop offset="100%" stop-color="#f1c40f" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="ascBeamGrad4" x1="28.2"  y1="116.4" x2="28.2"  y2="46" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stop-color="#f1c40f" stop-opacity="1" />
                <stop offset="100%" stop-color="#f1c40f" stop-opacity="0" />
            </linearGradient>
            <filter id="ascStarGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            <filter id="ascBeamGlow" x="-200%" y="-200%" width="500%" height="500%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
    `;
}

/**
 * Builds the full ascension effect HTML: a purple 5-pointed star SVG with
 * optional golden beams rising from each spike (shown once the level is done).
 */
function _wdBuildAscensionHtml(isDone) {
    const defsHtml = _wdBuildAscensionDefsHtml();
    const beamsHtml = _wdBuildAscensionBeamsHtml(isDone);

    return `
        <div class="wd-ascension-3d-wrapper">
            <svg class="wd-asc-effects-svg" viewBox="0 0 140 200" overflow="visible">
                ${defsHtml}

                <!-- Golden beams behind the star (only when done) -->
                <g filter="url(#ascBeamGlow)">
                    ${beamsHtml}
                </g>

                <!-- Ambient purple glow behind the star center -->
                <circle cx="70" cy="130" r="38"
                        fill="rgba(155, 89, 182, 0.35)"
                        filter="url(#ascStarGlow)"
                        class="wd-asc-core-glow"/>

                <!-- 5-pointed star shape (outer fill + inner crisp outline) -->
                <g class="wd-asc-star-group" filter="url(#ascStarGlow)">
                    <path class="wd-asc-star-shape"
                          d="M70.0,86.0 L80.6,115.4 L111.8,116.4 L87.1,135.6 L95.9,165.6 L70.0,148.0 L44.1,165.6 L52.9,135.6 L28.2,116.4 L59.4,115.4 Z"
                          fill="rgba(155, 89, 182, 0.55)"
                          stroke="#c39bd3"
                          stroke-width="2.5"
                          stroke-linejoin="round" />
                    <path class="wd-asc-star-inner"
                          d="M70.0,86.0 L80.6,115.4 L111.8,116.4 L87.1,135.6 L95.9,165.6 L70.0,148.0 L44.1,165.6 L52.9,135.6 L28.2,116.4 L59.4,115.4 Z"
                          fill="none"
                          stroke="#e8daef"
                          stroke-width="1"
                          stroke-linejoin="round" />
                </g>
            </svg>
        </div>
    `;
}

/**
 * Builds the complete inner HTML for a level node's effects container.
 * The stoxel aura is always present (bottom layer). Special effects
 * (convergence rings, math gate cage, ascension star) layer on top of it.
 * The node circle always sits on the very top.
 *
 * Layer order (bottom → top):
 *   stoxelHtml → convergenceHtml → gateHtml → ascensionHtml → circle
 */
function _wdBuildNodeEffectsHtml(icon, stoxelHtml, convergenceHtml, gateHtml, ascensionHtml) {
    return `
        <div class="wd-node-effects-container">
            ${stoxelHtml}
            ${convergenceHtml}
            ${gateHtml}
            ${ascensionHtml}
            <div class="wd-node-circle">${icon}</div>
        </div>
    `;
}

/**
 * Builds the inner HTML for a standard level node.
 * Even plain nodes carry the stoxel aura — it is a universal world feature.
 */
function _wdBuildPlainNodeHtml(icon, stoxelHtml) {
    return `
        <div class="wd-node-effects-container">
            ${stoxelHtml}
            <div class="wd-node-circle">${icon}</div>
        </div>
    `;
}


//------------------------------------------------------------------------
//-------------------LEVEL NODE BUILDER------------------------------------
//------------------------------------------------------------------------

// Returns true if the player has beaten this level on Hard with ALL modifiers active.

function _wdIsMaxCleared(gi) {
    const hs = STATE && STATE.levelHS && STATE.levelHS[gi];
    if (!hs) return false;
    return hs.diff === 'hard' &&
        hs.mods &&
        hs.mods.timetrial &&
        hs.mods.hardcore &&
        hs.mods.ironman &&
        hs.mods.classless &&
        hs.mods.treeless;
}

function _wdApplyNodeStateClasses(node, isDone, isLocked, isLastInWorld, isConvergence, isMathGated, isMaxCleared) {
    if (isDone) node.classList.add('done');
    else if (isLocked) node.classList.add('locked');
    if (isLastInWorld) node.classList.add('ascension');
    if (isConvergence) node.classList.add('convergence');
    if (isMathGated) node.classList.add('math-gated');
    if (isMaxCleared) node.classList.add('max-cleared');
}

/**
 * Stores image-relative coordinates in the node's dataset and immediately
 * positions it on the canvas using canvas-relative CSS percentages.
 */
function _wdPositionNodeOnCanvas(node, wi, pos) {
    node.dataset.imgX = pos.x;
    node.dataset.imgY = pos.y;

    const canvas = document.getElementById('wd-canvas');
    const cfg = WD_WORLD_CONFIGS[wi];
    const pct = _wdImgPctToCanvasPct(pos.x, pos.y, canvas, cfg);
    node.style.left = pct.x + '%';
    node.style.top = pct.y + '%';
}

/**
 * Wires up mouse tooltip events on a level node element.
 */
function _wdWireNodeTooltip(node, wi, li, isDone, isLocked, isLastInWorld, isConvergence, isMaxCleared) {
    node.addEventListener('mouseenter', (e) => _wdShowTooltip(e, wi, li, isDone, isLocked, isLastInWorld, isConvergence, isMaxCleared));
    node.addEventListener('mousemove', (e) => _wdMoveTooltip(e));
    node.addEventListener('mouseleave', () => _wdHideTooltip());
}

/**
 * Builds a complete level node element: creates the div, applies classes,
 * sets inner HTML (with or without special effects), positions it on the
 * canvas, and wires up click and tooltip handlers.
 */
function _wdBuildLevelNode(wi, li, pos) {
    const gi = WORLD_START_GI[wi] + li;
    const world = WORLDS && WORLDS[wi];

    // Determine state flags
    const isDone = !!(STATE && STATE.done && STATE.done.includes(gi));
    const isUnlocked = _wdIsLevelUnlocked(li, gi);
    const isLocked = !isUnlocked;
    const isLastInWorld = !!(world && li === world.data.length - 1);
    const isConvergence = !!(world && _wdIsConvergenceNode(li, world));
    const isMathGated = _wdIsMathGated(gi);

    const isMaxCleared = _wdIsMaxCleared(gi);
    const icon = isMaxCleared ? '👑' : _wdGetNodeIcon(li, isDone, isLocked, isLastInWorld, isConvergence);

    // Create the element and apply positioning / state classes
    const node = document.createElement('div');
    node.className = 'wd-level-node';
    node.dataset.li = li;
    _wdPositionNodeOnCanvas(node, wi, pos);
    _wdApplyNodeStateClasses(node, isDone, isLocked, isLastInWorld, isConvergence, isMathGated, isMaxCleared);

    // Build inner HTML — the stoxel aura is universal; special effects layer on top
    const stoxelHtml = _wdBuildStoxelAuraHtml(isDone);

    if (isConvergence || isMathGated || isLastInWorld) {
        const convergenceHtml = isConvergence ? _wdBuildConvergenceHtml(isDone) : '';
        const gateHtml = isMathGated ? _wdBuildMathGateHtml() : '';
        const ascensionHtml = isLastInWorld ? _wdBuildAscensionHtml(isDone) : '';
        node.innerHTML = _wdBuildNodeEffectsHtml(icon, stoxelHtml, convergenceHtml, gateHtml, ascensionHtml);
    } else {
        node.innerHTML = _wdBuildPlainNodeHtml(icon, stoxelHtml);
    }

    // Wire up interaction
    if (!isLocked) {
        node.addEventListener('click', () => _wdOnLevelNodeClick(wi, li));
    }
    _wdWireNodeTooltip(node, wi, li, isDone, isLocked, isLastInWorld, isConvergence, isMaxCleared);

    return node;
}


//------------------------------------------------------------------------
//-------------------ENTRANCE MARKER---------------------------------------
//------------------------------------------------------------------------

/**
 * Builds the clickable 🛖 entrance marker element, positioned on the canvas
 * at the world's entrancePos. Clicking it walks the sprite back to the start.
 */
function _wdBuildEntranceMarker(wi, cfg, canvas) {
    const marker = document.createElement('div');
    marker.className = 'wd-entrance-marker';

    // Store image-relative coords in dataset for later repositioning on resize
    marker.dataset.imgX = cfg.entrancePos.x;
    marker.dataset.imgY = cfg.entrancePos.y;

    const pct = _wdImgPctToCanvasPct(cfg.entrancePos.x, cfg.entrancePos.y, canvas, cfg);
    marker.style.left = pct.x + '%';
    marker.style.top = pct.y + '%';

    marker.textContent = '🛖';
    marker.style.cursor = 'pointer';
    marker.style.pointerEvents = 'auto';
    marker.title = LANG === 'de' ? 'Zurück zum Eingang' : 'Back to entrance';

    marker.addEventListener('click', () => {
        if (!_wdWalking) _wdWalkSpriteToEntrance();
    });

    return marker;
}


//------------------------------------------------------------------------
//-------------------SPRITE BUILDING & PLACEMENT---------------------------
//------------------------------------------------------------------------

/**
 * Creates the player sprite DOM element (wrapper div + character image).
 * The image source is determined by the active player character, if available.
 */
function _wdBuildSprite() {
    const sprite = document.createElement('div');
    sprite.className = 'wd-sprite';
    sprite.id = 'wd-sprite';

    const img = document.createElement('img');
    img.id = 'wd-sprite-img';
    img.src = (typeof _getPlayerCharacterImage === 'function')
        ? _getPlayerCharacterImage()
        : 'images/sprites/Stox_noclass.png';
    img.alt = 'Player';
    img.draggable = false;

    sprite.appendChild(img);
    return sprite;
}

/**
 * Instantly moves the sprite element to the position of the given level index
 * (or to the entrance if levelIdx is null). No animation — used for initial placement.
 */
function _wdPlaceSprite(sprite, wi, levelIdx) {
    const cfg = WD_WORLD_CONFIGS[wi];
    if (!cfg || !sprite) return;

    const pos = (levelIdx === null) ? cfg.entrancePos : cfg.nodes[levelIdx];
    if (!pos) return;

    const canvas = document.getElementById('wd-canvas');
    const { x, y } = _wdImgPctToCanvasPct(pos.x, pos.y, canvas, cfg);
    sprite.style.left = x + '%';
    sprite.style.top = y + '%';
}


//------------------------------------------------------------------------
//-------------------SPRITE WALK ANIMATION---------------------------------
//------------------------------------------------------------------------

/**
 */
// Fixed reference width used ONLY for speed calculations (per-world aspect
// ratio applied), so walk speed stays constant regardless of window size.
const WD_WALK_REF_WIDTH = 1000;

function _wdGetSegmentDurationMs(startPos, endPos, wi) {
    const cfg = WD_WORLD_CONFIGS[wi];
    const aspect = (cfg && cfg.imageAspect) ? cfg.imageAspect : WD_DEFAULT_IMAGE_ASPECT;
    const refW = WD_WALK_REF_WIDTH;
    const refH = refW / aspect;

    const dx = (endPos.x - startPos.x) / 100 * refW;
    const dy = (endPos.y - startPos.y) / 100 * refH;
    return Math.max(60, (Math.sqrt(dx * dx + dy * dy) / WD_WALK_SPEED_PX_PER_SEC) * 1000);
}

/**
 * Smooth ease-in-out curve for sprite movement (t in [0, 1]).
 */
function _wdEaseInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Updates the sprite's CSS position and horizontal facing direction for one
 * animation frame. ease is the pre-computed eased progress value (0–1).
 */
function _wdUpdateSpriteFrame(sprite, startPos, endPos, ease) {
    const rawX = startPos.x + (endPos.x - startPos.x) * ease;
    const rawY = startPos.y + (endPos.y - startPos.y) * ease;

    const canvas = document.getElementById('wd-canvas');
    const cfg = WD_WORLD_CONFIGS[_wdCurrentWi];
    const pct = _wdImgPctToCanvasPct(rawX, rawY, canvas, cfg);
    sprite.style.left = pct.x + '%';
    sprite.style.top = pct.y + '%';

    // Flip the sprite image to face the direction of travel
    const img = sprite.querySelector('img');
    if (img) img.style.scale = (endPos.x < startPos.x) ? '-1 1' : '1 1';
}

function _wdWalkAlongPoints(points, markers, segIdx, onComplete) {
    const sprite = document.getElementById('wd-sprite');

    if (segIdx >= points.length - 1) {
        sprite.classList.remove('walking');
        if (typeof _stopAvatarWalkAnimation === 'function') _stopAvatarWalkAnimation();
        if (onComplete) onComplete();
        return;
    }

    const startPos = points[segIdx];
    const endPos = points[segIdx + 1];
    const durationMs = _wdGetSegmentDurationMs(startPos, endPos, _wdCurrentWi);
    const startTime = performance.now();

    const step = (now) => {
        const t = Math.min((now - startTime) / durationMs, 1);
        const ease = _wdEaseInOut(t);
        _wdUpdateSpriteFrame(sprite, startPos, endPos, ease);

        if (t < 1) {
            _wdWalkAnim = requestAnimationFrame(step);
        } else {
            const reachedIndex = segIdx + 1;
            const marker = markers.find(m => m.index === reachedIndex);

            if (marker && _wdPendingRedirect) {
                const pending = _wdPendingRedirect;
                _wdPendingRedirect = null;
                _wdContinueWalkFromNode(marker.key, pending.targetLevelIdx, pending.onArrived);
                return;
            }

            _wdWalkAlongPoints(points, markers, segIdx + 1, onComplete);
        }
    };

    _wdWalkAnim = requestAnimationFrame(step);
}



function _wdContinueWalkFromNode(fromNodeKey, targetLevelIdx, onArrived) {
    const wi = _wdCurrentWi;
    const { points, markers } = _wdFindWalkPathWithMarkers(wi, fromNodeKey, targetLevelIdx);

    const finish = () => {
        _wdWalking = false;
        _wdCurrentLevelIdx = targetLevelIdx;
        _wdPersistSpritePos(wi, targetLevelIdx);
        _wdRefreshPaths(wi);
        if (onArrived) onArrived();
    };

    if (points.length < 2) { finish(); return; }
    _wdWalkAlongPoints(points, markers, 0, finish);
}



/**
 * Saves the sprite's current level position to STATE and triggers a save.
 */
function _wdPersistSpritePos(wi, levelIdx) {
    if (!STATE) return;
    if (!STATE.wdSpriteLevel) STATE.wdSpriteLevel = {};
    STATE.wdSpriteLevel[wi] = levelIdx;
    if (typeof save === 'function') save();
}



function _wdWalkSpriteTo(wi, targetLevelIdx, onArrived) {
    if (_wdWalking) {
        _wdPendingRedirect = { targetLevelIdx, onArrived };
        return;
    }

    _wdWalking = true;
    const fromNode = _wdCurrentLevelIdx === null ? 'entrance' : _wdCurrentLevelIdx;

    const sprite = document.getElementById('wd-sprite');
    sprite.classList.add('walking');
    if (typeof _startAvatarWalkAnimation === 'function') _startAvatarWalkAnimation('wd-sprite-img');

    _wdContinueWalkFromNode(fromNode, targetLevelIdx, onArrived);
}

function _wdWalkSpriteToEntrance() {
    if (_wdWalking) {
        _wdPendingRedirect = { targetLevelIdx: null, onArrived: null };
        return;
    }

    _wdWalking = true;
    const fromNode = _wdCurrentLevelIdx === null ? 'entrance' : _wdCurrentLevelIdx;

    const sprite = document.getElementById('wd-sprite');
    sprite.classList.add('walking');
    if (typeof _startAvatarWalkAnimation === 'function') _startAvatarWalkAnimation('wd-sprite-img');

    _wdContinueWalkFromNode(fromNode, null, null);
}


//------------------------------------------------------------------------
//-------------------TOP BAR-----------------------------------------------
//------------------------------------------------------------------------

/**
 * Resolves the localised display name for a world.
 */
function _wdGetWorldName(wi) {
    const world = WORLDS && WORLDS[wi];
    if (!world) return `World ${wi + 1}`;
    return (LANG === 'de' && world.labelDE) ? world.labelDE : world.label;
}

/**
 * Updates the world-detail top bar: sets the screen title and world name label.
 */
function _wdBuildTopBar(wi) {
    const titleEl = document.getElementById('wd-title-text');
    if (titleEl) titleEl.textContent = LANG === 'de' ? 'WELTKARTE' : 'WORLD MAP';

    const nameEl = document.getElementById('wd-world-name');
    if (nameEl) nameEl.textContent = _wdGetWorldName(wi);
}

/**
 * Called from HTML via onclick="wdGoBackToMap()".
 * Cancels any in-progress walk animation and returns to the overworld map screen.
 */
function wdGoBackToMap() {
    if (_wdWalking) {
        cancelAnimationFrame(_wdWalkAnim);
        _wdWalkAnim = null;
        _wdWalking = false;
    }
    if (typeof showMapView === 'function') showMapView();
    else switchScreen('screen-map-view');
}


//------------------------------------------------------------------------
//-------------------CANVAS BUILDING & RESIZE------------------------------
//------------------------------------------------------------------------

/**
 * Creates the background canvas div (world image via CSS) and the SVG
 * overlay element used for drawing road path polylines.
 * Returns { canvas, svg } so both can be populated immediately after.
 */
function _wdCreateCanvasElement(cfg) {
    const canvas = document.createElement('div');
    canvas.className = 'wd-canvas';
    canvas.id = 'wd-canvas';
    canvas.style.cssText = `
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        background-image: url('${cfg.bgImage}');
        background-size: contain;
        background-position: center center;
        background-repeat: no-repeat;
        background-color: #1a1200;
    `;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('wd-paths-svg');
    svg.id = 'wd-paths-svg';
    canvas.appendChild(svg);

    return { canvas, svg };
}

/**
 * Appends all level node elements for a world to the canvas.
 * Respects both the config's node list length and the world's actual level count.
 */
function _wdAppendLevelNodes(canvas, wi, cfg, levelCount) {
    const count = Math.min(cfg.nodes.length, levelCount);
    for (let li = 0; li < count; li++) {
        canvas.appendChild(_wdBuildLevelNode(wi, li, cfg.nodes[li]));
    }
}

/**
 * Repositions all dynamic canvas elements (level nodes, entrance marker,
 * sprite, road paths) to match the current canvas size.
 * Called on resize and after the initial build.
 */
function _wdRepositionAll(wi) {
    const canvas = document.getElementById('wd-canvas');
    if (!canvas) return;
    const cfg = WD_WORLD_CONFIGS[wi];
    if (!cfg) return;

    // Level nodes — each stores its image-relative coords in dataset
    canvas.querySelectorAll('.wd-level-node').forEach(node => {
        const { x, y } = _wdImgPctToCanvasPct(
            parseFloat(node.dataset.imgX),
            parseFloat(node.dataset.imgY),
            canvas, cfg
        );
        node.style.left = x + '%';
        node.style.top = y + '%';
    });

    // Entrance marker
    const entranceMarker = canvas.querySelector('.wd-entrance-marker');
    if (entranceMarker) {
        const { x, y } = _wdImgPctToCanvasPct(cfg.entrancePos.x, cfg.entrancePos.y, canvas, cfg);
        entranceMarker.style.left = x + '%';
        entranceMarker.style.top = y + '%';
    }

    // Player sprite
    const sprite = document.getElementById('wd-sprite');
    if (sprite) _wdPlaceSprite(sprite, wi, _wdCurrentLevelIdx);

    // Road path SVG
    _wdRefreshPaths(wi);
}

/**
 * Attaches a ResizeObserver to the canvas so that _wdRepositionAll is called
 * automatically whenever the canvas element changes size.
 */
function _wdObserveCanvasResize(canvas, wi) {
    if (window._wdResizeObserver) window._wdResizeObserver.disconnect();
    window._wdResizeObserver = new ResizeObserver(() => _wdRepositionAll(wi));
    window._wdResizeObserver.observe(canvas);
}

/**
 * Performs the first layout pass after the canvas is added to the DOM:
 * sets the SVG viewBox, draws paths, and places the sprite.
 * Deferred to a rAF so the browser has computed element sizes first.
 */
function _wdInitialLayout(canvas, svg, wi, sprite) {
    requestAnimationFrame(() => {
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        _wdDrawAllPaths(svg, wi, w, h);
        _wdPlaceSprite(sprite, wi, _wdCurrentLevelIdx);
        _wdRepositionAll(wi);
    });
}

/**
 * Builds the full world-detail canvas: background, SVG paths, entrance
 * marker, level nodes, and player sprite. Also sets up the resize observer
 * and the dev-tool click logger. Clears any previous canvas content first.
 */
function _wdBuildCanvas(wi) {
    const wrap = document.getElementById('wd-canvas-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';

    const cfg = WD_WORLD_CONFIGS[wi];
    if (!cfg) {
        wrap.innerHTML = `<div style="color:#f5e9c8;padding:20px;font-family:monospace;">You need to complete all other worlds first!</div>`;
        return;
    }

    const world = WORLDS && WORLDS[wi];
    const levelCount = world ? world.data.length : cfg.nodes.length;

    const { canvas, svg } = _wdCreateCanvasElement(cfg);
    wrap.appendChild(canvas);

    canvas.appendChild(_wdBuildEntranceMarker(wi, cfg, canvas));
    _wdAppendLevelNodes(canvas, wi, cfg, levelCount);

    const sprite = _wdBuildSprite();
    canvas.appendChild(sprite);

    _wdInitialLayout(canvas, svg, wi, sprite);

    // Dev tool: clicking the background canvas itself logs image-relative coords
    canvas.addEventListener('click', (e) => {
        if (e.target !== canvas) return;
        _wdLogClickCoords(e, wi, cfg, canvas);
    });

    _wdObserveCanvasResize(canvas, wi);
    _wdEnsureTooltip();
}


//------------------------------------------------------------------------
//-------------------ENTER BUTTON------------------------------------------
//------------------------------------------------------------------------

/**
 * Builds the "Enter Level X-Y" button element and positions it above the
 * given level node on the canvas.
 */
function _wdCreateEnterButton(wi, li, cfg) {
    const pos = cfg.nodes[li];
    const btnText = LANG === 'de'
        ? `▶ Level ${wi + 1}-${li + 1} betreten`
        : `▶ Enter Level ${wi + 1}-${li + 1}`;

    const btn = document.createElement('button');
    btn.id = 'wd-enter-btn';
    btn.textContent = btnText;

    const canvas = document.getElementById('wd-canvas');
    const pct = _wdImgPctToCanvasPct(pos.x, pos.y, canvas, cfg);
    btn.style.cssText = `
        position: absolute;
        left: ${pct.x}%;
        top: calc(${pct.y}% - 56px);
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

    return btn;
}

/**
 * Wires up the enter button's click handler: removes the button and starts the level.
 */
function _wdWireEnterButtonClick(btn, gi) {
    btn.addEventListener('click', () => {
        btn.remove();
        if (typeof startLevel === 'function') startLevel(gi);
    });
}

/**
 * Wires up a dismiss handler so that clicking anywhere on the canvas
 * (but not on the button itself) removes the button.
 * Uses a short timeout to avoid the same click that opened the button dismissing it.
 */
function _wdWireEnterButtonDismiss(btn) {
    const dismiss = (e) => {
        if (e.target !== btn) {
            btn.remove();
            document.getElementById('wd-canvas')?.removeEventListener('click', dismiss);
        }
    };
    setTimeout(() => {
        document.getElementById('wd-canvas')?.addEventListener('click', dismiss);
    }, 50);
}

/**
 * Shows the "Enter Level X-Y" button above the given level node, replacing
 * any previously open enter button.
 */
function _wdShowEnterButton(wi, li) {
    const existing = document.getElementById('wd-enter-btn');
    if (existing) existing.remove();

    const cfg = WD_WORLD_CONFIGS[wi];
    if (!cfg || !cfg.nodes[li]) return;

    const gi = WORLD_START_GI[wi] + li;
    const btn = _wdCreateEnterButton(wi, li, cfg);
    _wdWireEnterButtonClick(btn, gi);
    _wdWireEnterButtonDismiss(btn);

    const canvas = document.getElementById('wd-canvas');
    if (canvas) canvas.appendChild(btn);
}

/**
 * Handles a click on a level node: dismisses any open enter button, walks
 * the sprite to the clicked node, then shows the enter button on arrival.
 * Ignored while a walk animation is already in progress.
 */
function _wdOnLevelNodeClick(wi, li) {

    const existing = document.getElementById('wd-enter-btn');
    if (existing) existing.remove();

    _wdWalkSpriteTo(wi, li, () => _wdShowEnterButton(wi, li));
}


//------------------------------------------------------------------------
//-------------------TOOLTIP-----------------------------------------------
//------------------------------------------------------------------------

/**
 * Ensures the tooltip element exists in the DOM, creating it if needed.
 * Reuses the overworld map tooltip CSS class (mv-tooltip).
 */
function _wdEnsureTooltip() {
    let tip = document.getElementById('wd-tooltip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'wd-tooltip';
        tip.className = 'mv-tooltip';
        document.body.appendChild(tip);
    }
    return tip;
}

/**
 * Returns the type-label prefix string for the tooltip title
 * (e.g. "⚗️ ASCENSION · " or "🌿 CONVERGENCE · ").
 * Returns empty string for standard nodes.
 */
function _wdGetTooltipTypeLabel(isLastInWorld, isConvergence) {
    if (isLastInWorld) return LANG === 'de' ? '⚗️ AUFSTIEG · ' : '⚗️ ASCENSION · ';
    if (isConvergence) return LANG === 'de' ? '🌿 KONVERGENZ · ' : '🌿 CONVERGENCE · ';
    return '';
}

/**
 * Resolves the localised hint string for a level, if one is defined.
 */
function _wdGetLevelHint(wi, li) {
    const world = WORLDS && WORLDS[wi];
    const levelData = world && world.data[li];
    if (!levelData) return '';
    return (LANG === 'de' && levelData.hintDE) ? levelData.hintDE : (levelData.hint || '');
}

// Maps modifier keys → short display labels (mirrors screens-level-select.js)
const WD_MOD_LABELS = { timetrial: 'TT', hardcore: 'HC', ironman: 'IM', classless: 'CL', treeless: 'TR' };
const WD_MOD_CLASSES = { timetrial: 'tt', hardcore: 'hc', ironman: 'im', classless: 'cl', treeless: 'tl' };
const WD_BONUS_ICONS = {
    nomiss: '✨', fast: '⚡', noitem: '🎒', quiz: '🧠', combo: '🔥', lowmiss: '🎯',
    noitem_nomiss: '🎒✨', noitem_fast: '🎒⚡'
};
const WD_DIFF_TIERS = ['easy', 'normal', 'hard'];
const WD_STAR_FILLED = '⭐';
const WD_STAR_EMPTY = '☆';
const WD_STAR_MOD = '★';

/**
 * Returns a star string for a level's best run (mirrors getStars in screens-level-select.js).
 */
function _wdGetStars(gi) {
    const hs = STATE && STATE.levelHS && STATE.levelHS[gi];
    if (!hs) return '';
    const diffIndex = WD_DIFF_TIERS.indexOf(hs.diff || 'easy');
    const starCount = Math.max(1, diffIndex + 1);
    const modCount = hs.mods ? Object.values(hs.mods).filter(Boolean).length : 0;
    return WD_STAR_FILLED.repeat(starCount) + WD_STAR_EMPTY.repeat(3 - starCount) +
        (modCount ? ' ' + WD_STAR_MOD.repeat(modCount) : '');
}

/**
 * Builds HTML tag pills for the mods used in the player's best run.
 */
function _wdBuildTooltipModTags(hs) {
    if (!hs || !hs.mods) return '';
    const active = Object.keys(hs.mods).filter(m => hs.mods[m]);
    if (!active.length) return '';
    const tags = active.map(m =>
        `<span class="wd-tip-mod-tag ${WD_MOD_CLASSES[m] || ''}">${WD_MOD_LABELS[m] || m}</span>`
    ).join('');
    const diff = (hs.diff || 'normal').slice(0, 1).toUpperCase();
    return `<div class="wd-tip-mods">${tags}<span class="wd-tip-mod-tag diff">${diff}</span></div>`;
}

/**
 * Builds the status line text for the tooltip based on the level's state.
 */
function _wdGetTooltipStatusText(gi, isDone, isLocked) {
    if (_wdIsMathGated(gi)) {
        return LANG === 'de'
            ? '⚠️ WAHRSCHEINLICHKEITSTOR UNGELÖST'
            : '⚠️ PROBABILITY GATE UNSOLVED';
    }
    const hs = STATE && STATE.levelHS && STATE.levelHS[gi];
    if (isDone && hs) {
        return LANG === 'de'
            ? `✓ Abgeschlossen · Bestes Ergebnis: ${hs.score}`
            : `✓ Complete · Best score: ${hs.score}`;
    }
    if (isLocked) {
        return LANG === 'de' ? '🔒 Gesperrt' : '🔒 Locked';
    }
    return LANG === 'de' ? 'Noch nicht abgeschlossen' : 'Not yet completed';
}

/**
 * Populates and shows the enriched tooltip for a level node on mouseenter.
 */
function _wdShowTooltip(e, wi, li, isDone, isLocked, isLastInWorld, isConvergence, isMaxCleared) {
    const tip = _wdEnsureTooltip();
    const gi = WORLD_START_GI[wi] + li;
    const hs = STATE && STATE.levelHS && STATE.levelHS[gi];
    const world = WORLDS && WORLDS[wi];
    const levelData = world && world.data[li];

    const typeLabel = _wdGetTooltipTypeLabel(isLastInWorld, isConvergence);
    const statusText = _wdGetTooltipStatusText(gi, isDone, isLocked);
    const hint = _wdGetLevelHint(wi, li);

    // Stars
    const stars = isDone ? _wdGetStars(gi) : '';

    // Modifier tags row
    const modTagsHtml = _wdBuildTooltipModTags(hs);

    // Bonus objective
    let bonusHtml = '';
    if (levelData && levelData.bonusType !== undefined) {
        const bIcon = WD_BONUS_ICONS[levelData.bonusType || 'nomiss'] || '🎯';
        const bonusLabel = (LANG === 'de' && levelData.bonusHintDE) ? levelData.bonusHintDE
            : (levelData.bonusHint || (LANG === 'de' ? 'Level abschließen' : 'Complete the level'));
        if (STATE && STATE.bonusDone && STATE.bonusDone.includes(gi)) {
            bonusHtml = `<div class="wd-tip-bonus done">${bIcon} ${LANG === 'de' ? 'Bonus erledigt ✓' : 'Bonus claimed ✓'}</div>`;
        } else if (!isLocked) {
            bonusHtml = `<div class="wd-tip-bonus">${bIcon} ${bonusLabel}</div>`;
        }
    }

    // Grid size
    const p = levelData;
    let gridSize = '';
    if (p && !isLocked) {
        const gs = p.grid ? `${p.grid.length}×${p.grid[0].length}` : (world && world.size ? `${world.size}×${world.size}` : '');
        if (gs) gridSize = `<span class="wd-tip-grid">${gs}</span>`;
    }

    // Max-cleared crown line
    const maxLine = isMaxCleared
        ? `<div class="wd-tip-max">👑 ${LANG === 'de' ? 'VOLLSTÄNDIG GEMEISTERT' : 'MAX CLEARED'}</div>`
        : '';

    tip.innerHTML = `
        <div class="wd-tip-header">
            <span class="mv-tooltip-title">${typeLabel}${wi + 1}-${li + 1}${hint ? ' · ' + hint : ''}</span>
            ${gridSize}
        </div>
        ${maxLine}
        <div class="mv-tooltip-sub">${statusText}</div>
        ${stars ? `<div class="wd-tip-stars">${stars}</div>` : ''}
        ${modTagsHtml}
        ${bonusHtml}
    `;
    tip.classList.add('show');
    _wdMoveTooltip(e);
}

/**
 * Repositions the tooltip to follow the mouse cursor.
 */
function _wdMoveTooltip(e) {
    const tip = document.getElementById('wd-tooltip');
    if (!tip) return;
    tip.style.left = (e.clientX + 14) + 'px';
    tip.style.top = Math.min(e.clientY + 14, window.innerHeight - 80) + 'px';
}

/**
 * Hides the tooltip.
 */
function _wdHideTooltip() {
    const tip = document.getElementById('wd-tooltip');
    if (tip) tip.classList.remove('show');
}


//------------------------------------------------------------------------
//-------------------DEV TOOLS---------------------------------------------
//------------------------------------------------------------------------

/**
 * Logs image-relative click coordinates to the console in a format ready
 * to paste directly into WD_WORLD_CONFIGS. Click the canvas background
 * (not a node) to trigger this. Useful when tuning node positions.
 */
function _wdLogClickCoords(e, wi, cfg, canvas) {
    const rect = canvas.getBoundingClientRect();
    const aspect = cfg.imageAspect || WD_DEFAULT_IMAGE_ASPECT;
    const { imgW, imgH, imgX, imgY } = _wdGetImageRectInCanvas(rect.width, rect.height, aspect);

    const x = (((e.clientX - rect.left) - imgX) / imgW * 100).toFixed(1);
    const y = (((e.clientY - rect.top) - imgY) / imgH * 100).toFixed(1);
    console.log(`WD wi=${wi}: { x: ${x}, y: ${y} },`);
}


//------------------------------------------------------------------------
//-------------------STATE SYNC (EXTERNAL API)-----------------------------
//------------------------------------------------------------------------

/**
 * Syncs the sprite position in STATE to a given global level index (gi).
 * Call this externally (e.g. after a level is completed) to keep the sprite
 * on the correct node when the world screen is opened next.
 *
 * Iterates through all worlds to find which one owns gi, then writes the
 * corresponding local level index into STATE.wdSpriteLevel[wi].
 */
function _wdSyncSpriteToLevel(gi) {
    for (let wi = 0; wi < WORLDS.length; wi++) {
        const start = WORLD_START_GI[wi];
        const world = WORLDS[wi];
        if (gi >= start && gi < start + world.data.length) {
            const li = gi - start;
            if (!STATE.wdSpriteLevel) STATE.wdSpriteLevel = {};
            STATE.wdSpriteLevel[wi] = li;
            if (typeof save === 'function') save();
            break;
        }
    }
}


//------------------------------------------------------------------------
//-------------------ENTRY POINT-------------------------------------------
//------------------------------------------------------------------------

/**
 * Opens the world-detail screen for the given world.
 * Called from screens-map-view.js when the player clicks "Enter [World]".
 * wi — 0-based world index.
 */
function showWorldDetail(wi) {
    _wdCurrentWi = wi;

    _wdCurrentLevelIdx = (STATE && STATE.wdSpriteLevel && STATE.wdSpriteLevel[wi] !== undefined)
        ? STATE.wdSpriteLevel[wi]
        : null;
    _wdPendingRedirect = null;

    _ptReturnScreen = 'screen-world-detail';
    _ptReturnWorldIndex = wi;  

    _wdBuildTopBar(wi);
    _wdBuildCanvas(wi);
    switchScreen('screen-world-detail');
}