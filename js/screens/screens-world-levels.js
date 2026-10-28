import { Audio_Manager } from '../audio/audio.js';
import { save } from '../state.js';
import { LANG, t } from '../translation/translations.js';
import { _renderTopBarClassStatus, _renderTopBarNextCode, _renderTopBarQuestBadge, _renderTopBarScore, _renderTopBarTreePoints, _wireTopBarButtons, showMapView } from './screens-map-view.js';
import { WD_WORLD_CONFIGS } from './screens-world-levels-config.js';
import { switchScreen } from './screens.js';
import { STATE } from '../state.js';
import { coopAnchor, coopAvailable, coopCleared, coopFriend, coopName, startCoopEncounter } from '../storyline/coop-levels.js';
import { ensureAffinityButton } from '../storyline/affinity-panel.js';
import { getAffinityPoints } from '../storyline/companion-affinity.js';
import { COMPANION_CAST, COMPANION_LOOKS, companionSceneTitle } from '../storyline/companion-scenes.js';
/*
    ========================================================================
    SCREENS-WORLD-LEVELS.JS
    ========================================================================
    Handles the per-world level selection screen in Map View.
    Reusable for all 14 worlds.

    Configuration data (background images, node positions, etc.) lives in
    screens-world-levels-config.js (WD_WORLD_CONFIGS).

    STATE:
      STATE.wdSpriteLevel[wi]  - last level index sprite was at (null = entrance)

    SECTION ORDER:
      1. Constants & Module State
      2. Shared DOM Lookups
      3. Coordinate Helpers
      4. Road Graph Building
      5. Road Pathfinding (BFS)
      6. Road Path Drawing (SVG)
      7. Level Node State Checks
      8. Level Node Effect HTML Builders
      9. Level Node Builder
     10. Entrance Marker
     11. Sprite Building & Placement
     12. Sprite Walk Animation
     13. Top Bar
     14. Canvas Building & Resize
     15. Enter Button
     16. Tooltip
     17. Dev Tools
     18. State Sync (External API)
     19. Entry Point
    ========================================================================
*/

'use strict';


//------------------------------------------------------------------------
//-------------------CONSTANTS & MODULE STATE------------------------------
//------------------------------------------------------------------------

// Fallback aspect ratio used when a world config doesn't define imageAspect
const WD_DEFAULT_IMAGE_ASPECT = 16 / 9;

// How fast the player sprite walks across the canvas, in pixels per second
const WD_WALK_SPEED_PX_PER_SEC = 96;

// Fixed reference width used ONLY for speed calculations (per-world aspect
// ratio applied), so walk speed stays constant regardless of window size.
const WD_WALK_REF_WIDTH = 1000;

// Maps modifier keys → short display labels / CSS classes for the tooltip (mirrors screens-level-select.js)
const WD_MOD_LABELS = { timetrial: 'TT', hardcore: 'HC', ironman: 'IM', classless: 'CL', treeless: 'TR', superTutor: 'PROFESSOR' };
const WD_MOD_CLASSES = { timetrial: 'tt', hardcore: 'hc', ironman: 'im', classless: 'cl', treeless: 'tl' };
const WD_BONUS_ICONS = {
    nomiss: '✨', fast: '⚡', noitem: '🎒', quiz: '🧠', gauntlet: '⚔️', combo: '🔥', lowmiss: '🎯',
    noitem_nomiss: '🎒✨', noitem_fast: '🎒⚡'
};
const WD_DIFF_TIERS = ['easy', 'normal', 'hard'];
const WD_STAR_FILLED = '⭐';
const WD_STAR_EMPTY = '☆';
const WD_STAR_MOD = '★';

// Currently open world index (0-based), or null if screen not built yet
export let _wdCurrentWi = null;

// Level index the sprite is currently standing on (null = at entrance)
let _wdCurrentLevelIdx = null;

// True while a walk animation is in progress - blocks new walk requests
let _wdWalking = false;

// requestAnimationFrame handle for the current walk animation (used to cancel it)
let _wdWalkAnim = null;

// Queued { targetLevelIdx, onArrived } redirect requested while a walk was already in progress
let _wdPendingRedirect = null;


//------------------------------------------------------------------------
//-------------------SHARED DOM LOOKUPS-------------------------------------
//------------------------------------------------------------------------
// Tiny wrappers around the repeated getElementById calls used throughout
// this file, so the element IDs only live in one place.

/**
 * The world-detail background canvas element.
 */
function _wdGetCanvas() {
    return document.getElementById('wd-canvas');
}

/**
 * The player sprite element.
 */
function _wdGetSprite() {
    return document.getElementById('wd-sprite');
}

/**
 * The tooltip element, without creating it. Use _wdEnsureTooltip() instead
 * if the tooltip needs to exist (e.g. before populating and showing it).
 */
function _wdGetTooltipEl() {
    return document.getElementById('wd-tooltip');
}


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
        // Pillarboxed: image is narrower than the canvas - bars left & right
        imgH = canvasHeight;
        imgW = canvasHeight * imageAspect;
        imgX = (canvasWidth - imgW) / 2;
        imgY = 0;
    } else {
        // Letterboxed: image is shorter than the canvas - bars top & bottom
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

    // Canvas has no size yet - return the raw values as a safe fallback
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
//       once that level is marked done - useful for shortcuts that unlock later.

/**
 * Returns the image-relative {x, y} position of a node reference.
 * nodeRef can be 'entrance', null (treated as entrance), or a 0-based index.
 */
function _wdGetNodePos(cfg, nodeRef) {
    if (nodeRef === null || nodeRef === 'entrance') return cfg.entrancePos;
    if (nodeRef === 'trial') return cfg.trialNode;
    if (nodeRef === 'ascension') return cfg.ascensionNode;
    if (typeof nodeRef === 'string' && nodeRef.startsWith('comp:')) {
        return (cfg.companionNodes || []).concat(cfg.coopNodes || [], cfg.aftermathNodes || [], cfg.revealNodes || []).find(c => 'comp:' + c.id === nodeRef);
    }
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
    const gi = globalThis.WORLD_START_GI[wi] + extra.showAfter;
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
 * the linear chain (minus hideRoad nodes), any visible extraRoads, and the
 * spur from the world's 66% convergence milestone level to its Convergence
 * Trial node (so the off-road trial site is visibly connected to the map).
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

    // Convergence Trial spur: 66% milestone level → trial node.
    // 'trial' is only ever a segment endpoint (the trial node itself is not
    // part of the BFS walk graph - trial entry goes through its own click
    // flow), but the endpoint key feeds _wdIsNodeReached so the spur can
    // render as 'travelled' once the trial is cleared.
    if (cfg.trialNode && _wdTrialNodeForWorld(wi)) {
        const triggers = (typeof globalThis._trialTriggerLevels === 'function') ? globalThis._trialTriggerLevels(wi) : null;
        const fromLi = (triggers && triggers[1] != null && cfg.nodes[triggers[1]]) ? triggers[1] : (cfg.nodes.length - 1);
        const fromPos = cfg.nodes[fromLi] || cfg.entrancePos;
        roads.push({
            n1: fromLi,
            n2: 'trial',
            waypoints: [fromPos, cfg.trialNode],
        });
    }

    // Ascension Trial spur: the road goes on after the world's last level.
    if (cfg.ascensionNode && _wdAscensionNodeForWorld(wi)) {
        const world = globalThis.WORLDS && globalThis.WORLDS[wi];
        const lastLi = Math.min(cfg.nodes.length, world ? world.data.length : cfg.nodes.length) - 1;
        roads.push({
            n1: lastLi,
            n2: 'ascension',
            waypoints: [cfg.nodes[lastLi], cfg.ascensionNode],
        });
    }

    // Companion meeting spurs: a short side road from the anchor level to each node.
    for (const cn of _wdCompanionNodesForWorld(wi)) {
        roads.push({
            n1: cn.from,
            n2: 'comp:' + cn.id,
            waypoints: [cfg.nodes[cn.from], cn],
        });
    }

    // The story chain continues past the meeting: the road to a co-op encounter
    // starts at the story node it follows, and the road to the scene after it
    // starts at the encounter (level -> story node -> co-op -> scene after).
    for (const cn of _wdCoopNodesForWorld(wi)) {
        const story = (cfg.companionNodes || []).find(c => c.id === coopAnchor(cn.id));
        roads.push({
            n1: story ? 'comp:' + story.id : cn.from,
            n2: 'comp:' + cn.id,
            waypoints: [story || cfg.nodes[cn.from], cn],
        });
    }
    for (const an of _wdAftermathNodesForWorld(wi)) {
        const coop = (cfg.coopNodes || []).find(c => c.id === an.coop);
        roads.push({
            n1: coop ? 'comp:' + coop.id : an.from,
            n2: 'comp:' + an.id,
            waypoints: [coop || cfg.nodes[an.from], an],
        });
    }
    // A hero's secret half is told at the story node of its world: the road starts there.
    for (const rn of _wdRevealNodesForWorld(wi)) {
        const story = (cfg.companionNodes || []).find(c => c.id === rn.after);
        roads.push({
            n1: story ? 'comp:' + story.id : rn.from,
            n2: 'comp:' + rn.id,
            waypoints: [story || cfg.nodes[rn.from], rn],
        });
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

/**
 * Flattens a BFS route (list of { seg, reversed }) into an ordered list of
 * {x, y} waypoints plus a parallel list of node markers ({ index, key }),
 * deduplicating the shared point where segments connect. The markers let
 * a walk animation detect when the sprite has passed through a specific node.
 */
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

/**
 * Finds the full walk path between two nodes in a world, including node
 * markers for each waypoint reached. fromNode/toNode are 'entrance', null,
 * or a 0-based index. Falls back to a direct straight line (with start/end
 * markers only) if no route exists in the current graph.
 */
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
 * Marker-free variant of _wdFlattenRouteToPointsWithMarkers - same point
 * list, without the per-node marker bookkeeping.
 */
function _wdFlattenRouteToPoints(routeSegs) {
    return _wdFlattenRouteToPointsWithMarkers(routeSegs).points;
}

/**
 * Marker-free variant of _wdFindWalkPathWithMarkers - same point list,
 * without the per-node marker bookkeeping.
 */
// SUSPECTED DEAD: retained legacy marker-free path finder; no current consumer.
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
 * reached; level nodes are reached once done or currently occupied by the sprite;
 * the 'trial' endpoint is reached once the world's Convergence Trial is unlocked or done).
 */
function _wdIsNodeReached(n, wi) {
    if (n === 'entrance') return true;
    if (n === 'trial') {
        // Lit once the trial is unlocked (not only when cleared), so the spur
        // reads as a real, open road to the trial node.
        return ((typeof globalThis._isTrialDone === 'function') && globalThis._isTrialDone(wi))
            || ((typeof globalThis._isTrialUnlocked === 'function') && globalThis._isTrialUnlocked(wi));
    }
    // A companion node only exists once its anchor level is cleared, so its
    // spur is always lit.
    if (typeof n === 'string' && n.startsWith('comp:')) return true;
    if (n === 'ascension') {
        return ((typeof globalThis._isAscensionTrialDone === 'function') && globalThis._isAscensionTrialDone(wi))
            || ((typeof globalThis._isAscensionTrialUnlocked === 'function') && globalThis._isAscensionTrialUnlocked(wi));
    }
    const gi = globalThis.WORLD_START_GI[wi] + n;
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

    const canvas = _wdGetCanvas();
    const roads = _wdBuildRoads(cfg, wi);
    roads.forEach(seg => _wdDrawRoadSegment(svg, seg, canvas, cfg, w, h, wi));
}

/**
 * Re-reads the canvas size, updates the SVG viewBox, and redraws all paths.
 * Call this after the sprite moves or the canvas is resized.
 */
function _wdRefreshPaths(wi) {
    const svg = document.getElementById('wd-paths-svg');
    const canvas = _wdGetCanvas();
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
 * Convergence milestones no longer live on campaign puzzle levels (Leveling
 * Rework): every former convergence node is a regular puzzle node now -
 * milestones moved to Convergence Trial nodes (see js/campaign-trials.js).
 * Always false; kept because node building / tooltips still call it.
 */
function _wdIsConvergenceNode(li, world) {
    return false;
}

/**
 * Returns true if the given level is accessible to the player.
 * Unlock rules: every WORLD is open once the tutorial is done, but the LEVELS
 * inside a world follow a linear progression path (level N+1 needs level N
 * done; level 0 needs the tutorial). The Nexus World additionally requires
 * the whole campaign (worlds 1..13) to be finished first.
 */
function _wdIsLevelUnlocked(li, gi, wi) {
    if (typeof wi === 'number' && typeof globalThis.isNexusWorld === 'function' && globalThis.isNexusWorld(wi)) {
        if (typeof globalThis.isNexusWorldUnlocked === 'function' && !globalThis.isNexusWorldUnlocked()) return false;
    }
    if (li === 0) return !!(STATE && STATE.tutorialDone);
    return !!(STATE && STATE.done && STATE.done.includes(gi - 1));
}

/**
 * Returns true if the given level is blocked by an unsolved Probability Gate.
 */
function _wdIsMathGated(gi) {
    return typeof globalThis.isGatedLevel === 'function' && globalThis.isGatedLevel(gi) && !globalThis.isMathGatePassed(gi);
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
//   1. Stoxel Aura      - void energy knot, present on EVERY node
//   2. Convergence      - green gyro rings (convergence nodes only)
//   3. Math Gate        - red cyber cage (math-gated nodes only)
//   4. Ascension        - purple star + gold beams (last node of world only)
//   5. Node Circle      - the actual clickable icon, always on top

/**
 * Builds the Stoxel Aura effect - a tangled orb of void energy visible on
 * every level node. This represents an uncleansed Stoxel corrupting the land.
 *
 * States:
 *   default (unsolved) - full crackling purple/red void energy, sparks, knot
 *   done (solved)      - aura collapses to a faint, calm residual glow
 *   locked             - slightly dimmed but still present (not yet reachable)
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

            <!-- The interlocking band knot (SVG) - viewBox matches the larger inset wrapper -->
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

                <!-- 5 interlocking bands - thicker and denser to match the reference image -->
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
 * Builds the HTML for the glowing tree SVG that rises behind a completed
 * convergence node: rooted trunk, layered canopy, leaf clusters, sparkles
 * and drifting motes. Returns an empty string if the node is not yet done.
 */
function _wdBuildConvergenceTreeHtml(isDone) {
    if (!isDone) return '';
    return `
        <div class="wd-3d-beam-tree">
            <div class="wd-tree-backdrop-shadow"></div>
            <svg class="wd-tree-glow-svg" viewBox="0 0 120 180">
                <defs>
                    <radialGradient id="wdTreeCanopy" cx="50%" cy="38%" r="65%">
                        <stop offset="0%"  stop-color="#8dff6e" />
                        <stop offset="45%" stop-color="#2ecc71" />
                        <stop offset="100%" stop-color="rgba(13,59,34,0.95)" />
                    </radialGradient>
                    <linearGradient id="wdTreeTrunk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stop-color="#4fce7d" />
                        <stop offset="55%"  stop-color="#2a7a48" />
                        <stop offset="100%" stop-color="#123620" />
                    </linearGradient>
                    <radialGradient id="wdTreeGround" cx="50%" cy="50%" r="50%">
                        <stop offset="0%"   stop-color="rgba(46,204,113,0.55)" />
                        <stop offset="100%" stop-color="rgba(46,204,113,0)" />
                    </radialGradient>
                </defs>
                <ellipse cx="60" cy="170" rx="46" ry="10" fill="url(#wdTreeGround)" />
                <ellipse cx="60" cy="169" rx="34" ry="6" fill="#0e2f1c" opacity="0.85" />
                <path d="M60,166 Q46,168 34,176 L38,180 Q50,174 60,174 Z" fill="#17452a" />
                <path d="M60,166 Q74,168 86,176 L82,180 Q70,174 60,174 Z" fill="#17452a" />
                <path d="M53,172 C54,145 52,118 47,88 L55,86 C60,116 61,145 63,172 Z" fill="url(#wdTreeTrunk)" />
                <path d="M57,166 C58,142 56,116 52,94" fill="none" stroke="#8dff6e" stroke-width="1.6" stroke-linecap="round" opacity="0.55" />
                <path d="M54.5,166 C55.5,142 54,118 50,96" fill="none" stroke="#0b2416" stroke-width="1.6" stroke-linecap="round" opacity="0.6" />
                <path class="wd-tree-branch twig"     d="M54,142 Q40,134 28,124" fill="none" />
                <path class="wd-tree-branch twig"     d="M60,134 Q74,126 86,116" fill="none" />
                <path class="wd-tree-branch twig"     d="M52,114 Q40,104 32,90"  fill="none" />
                <path class="wd-tree-branch twig"     d="M58,106 Q70,96 78,82"   fill="none" />
                <path class="wd-tree-branch twig"     d="M50,94 Q42,82 38,68"    fill="none" />
                <path class="wd-tree-branch twig"     d="M56,88 Q64,76 68,62"    fill="none" />
                <path class="wd-tree-branch twig-sub" d="M52,86 Q52,68 55,52"    fill="none" />
                <path class="wd-tree-branch twig-sub" d="M40,132 Q33,128 27,128"  fill="none" />
                <path class="wd-tree-branch twig-sub" d="M72,124 Q79,120 85,120"  fill="none" />
                <path class="wd-tree-branch twig-sub" d="M41,102 Q35,96 31,90"   fill="none" />
                <path class="wd-tree-branch twig-sub" d="M69,94 Q75,88 79,82"    fill="none" />
                <path class="wd-tree-branch twig-sub" d="M44,80 Q40,74 39,68"    fill="none" />
                <path class="wd-tree-branch twig-sub" d="M62,74 Q66,68 67,62"    fill="none" />
                <ellipse cx="36" cy="60" rx="23" ry="19" fill="url(#wdTreeCanopy)" />
                <ellipse cx="84" cy="58" rx="23" ry="19" fill="url(#wdTreeCanopy)" />
                <ellipse cx="60" cy="36" rx="27" ry="22" fill="url(#wdTreeCanopy)" />
                <ellipse cx="60" cy="60" rx="19" ry="15" fill="#0a2e1b" opacity="0.5" />
                <circle class="wd-tree-leaf" cx="18" cy="52" r="4"   />
                <circle class="wd-tree-leaf" cx="24" cy="38" r="3.5" />
                <circle class="wd-tree-leaf" cx="36" cy="24" r="4"   />
                <circle class="wd-tree-leaf" cx="50" cy="18" r="3.5" />
                <circle class="wd-tree-leaf" cx="64" cy="16" r="4"   />
                <circle class="wd-tree-leaf" cx="78" cy="20" r="3.5" />
                <circle class="wd-tree-leaf" cx="92" cy="30" r="4"   />
                <circle class="wd-tree-leaf" cx="102" cy="44" r="3.5" />
                <circle class="wd-tree-leaf" cx="104" cy="60" r="4"   />
                <circle class="wd-tree-leaf" cx="96" cy="72" r="3.5" />
                <circle class="wd-tree-leaf" cx="84" cy="78" r="4"   />
                <circle class="wd-tree-leaf" cx="70" cy="80" r="3"   />
                <circle class="wd-tree-leaf" cx="56" cy="78" r="3"   />
                <circle class="wd-tree-leaf" cx="42" cy="76" r="3.5" />
                <circle class="wd-tree-leaf" cx="28" cy="68" r="3"   />
                <circle class="wd-tree-leaf" cx="16" cy="64" r="3.5" />
                <circle class="wd-tree-leaf-pale" cx="46" cy="34" r="3"   />
                <circle class="wd-tree-leaf-pale" cx="66" cy="30" r="3"   />
                <circle class="wd-tree-leaf-pale" cx="58" cy="50" r="2.5" />
                <circle class="wd-tree-leaf-pale" cx="74" cy="52" r="2.5" />
                <circle class="wd-tree-leaf-pale" cx="40" cy="56" r="2.5" />
                <g transform="translate(30,30)"><path class="wd-tree-sparkle" d="M-4,0H4M0,-4V4" /></g>
                <g transform="translate(90,40)"><path class="wd-tree-sparkle" d="M-4,0H4M0,-4V4" /></g>
                <g transform="translate(60,14)"><path class="wd-tree-sparkle" d="M-3,0H3M0,-3V3" /></g>
                <circle class="wd-tree-mote" cx="44" cy="120" r="2" style="animation-delay: 0s;" />
                <circle class="wd-tree-mote" cx="76" cy="128" r="2" style="animation-delay: 1.1s;" />
                <circle class="wd-tree-mote" cx="60" cy="140" r="2" style="animation-delay: 2.2s;" />
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
            <radialGradient id="ascStarFace" cx="50%" cy="42%" r="65%">
                <stop offset="0%"   stop-color="#f5e6ff" />
                <stop offset="35%"  stop-color="#c39bd3" />
                <stop offset="70%"  stop-color="#7d3c98" />
                <stop offset="100%" stop-color="rgba(74,20,110,0.9)" />
            </radialGradient>
            <radialGradient id="ascCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stop-color="#ffffff" />
                <stop offset="40%"  stop-color="#ffe97a" />
                <stop offset="100%" stop-color="rgba(241,196,15,0)" />
            </radialGradient>
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
 * Builds the rising gold ember dots shown once an ascension node is done.
 * Returns an empty string while the trial is still open.
 */
function _wdBuildAscensionEmbersHtml(isDone) {
    if (!isDone) return '';
    return `
        <g class="wd-asc-embers" filter="url(#ascBeamGlow)">
            <circle class="wd-asc-ember" cx="58" cy="150" r="2" />
            <circle class="wd-asc-ember delay-1" cx="82" cy="145" r="2" />
            <circle class="wd-asc-ember delay-2" cx="70" cy="160" r="2" />
        </g>
    `;
}

/**
 * Builds the full ascension effect HTML: a faceted crystal star with a
 * glowing core gem, orbiting sparkles, and golden beams plus rising embers
 * once the trial is done.
 */
function _wdBuildAscensionHtml(isDone) {
    const defsHtml = _wdBuildAscensionDefsHtml();
    const beamsHtml = _wdBuildAscensionBeamsHtml(isDone);
    const embersHtml = _wdBuildAscensionEmbersHtml(isDone);

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

                <!-- Faceted crystal star (gradient face + gold rim + crisp inner outline) -->
                <g class="wd-asc-star-group" filter="url(#ascStarGlow)">
                    <path class="wd-asc-star-shape"
                          d="M70.0,86.0 L80.6,115.4 L111.8,116.4 L87.1,135.6 L95.9,165.6 L70.0,148.0 L44.1,165.6 L52.9,135.6 L28.2,116.4 L59.4,115.4 Z"
                          fill="url(#ascStarFace)"
                          stroke="#f7dc6f"
                          stroke-width="2.5"
                          stroke-linejoin="round" />
                    <g class="wd-asc-facets" stroke="#ffffff" stroke-width="1" opacity="0.35">
                        <line x1="70" y1="130" x2="70"    y2="86" />
                        <line x1="70" y1="130" x2="111.8" y2="116.4" />
                        <line x1="70" y1="130" x2="95.9"  y2="165.6" />
                        <line x1="70" y1="130" x2="44.1"  y2="165.6" />
                        <line x1="70" y1="130" x2="28.2"  y2="116.4" />
                    </g>
                    <path class="wd-asc-star-inner"
                          d="M70.0,86.0 L80.6,115.4 L111.8,116.4 L87.1,135.6 L95.9,165.6 L70.0,148.0 L44.1,165.6 L52.9,135.6 L28.2,116.4 L59.4,115.4 Z"
                          fill="none"
                          stroke="#f5eef8"
                          stroke-width="1"
                          stroke-linejoin="round" />
                    <circle class="wd-asc-core-gem" cx="70" cy="130" r="10" fill="url(#ascCore)" />
                    <circle cx="70" cy="130" r="3.5" fill="#ffffff" />
                </g>

                <!-- Orbiting sparkles circling the star -->
                <g class="wd-asc-orbit" filter="url(#ascStarGlow)">
                    <circle class="wd-asc-orbit-dot" cx="70"  cy="78"  r="2.5" />
                    <circle class="wd-asc-orbit-dot" cx="115" cy="156" r="2" />
                    <circle class="wd-asc-orbit-dot" cx="25"  cy="156" r="2" />
                </g>

                <!-- Rising embers (only when done) -->
                ${embersHtml}
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
 * Even plain nodes carry the stoxel aura - it is a universal world feature.
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

/**
 * Returns true if the player has beaten this level on Hard with ALL modifiers active.
 */
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

/**
 * Applies the CSS state classes (done/locked/ascension/convergence/etc.) to
 * a level node element based on its computed state flags.
 */
function _wdApplyNodeStateClasses(node, isDone, isLocked, isLastInWorld, isConvergence, isMathGated, isMaxCleared, isNexusPoint) {
    if (isDone) node.classList.add('done');
    else if (isLocked) node.classList.add('locked');
    if (isLastInWorld) node.classList.add('ascension');
    // The Nexus Point keeps the ascension visuals (gold ring) but carries its
    // own marker class so it can be styled / labelled distinctly.
    if (isNexusPoint) node.classList.add('nexus-point');
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

    const canvas = _wdGetCanvas();
    const cfg = WD_WORLD_CONFIGS[wi];
    const pct = _wdImgPctToCanvasPct(pos.x, pos.y, canvas, cfg);
    node.style.left = pct.x + '%';
    node.style.top = pct.y + '%';
}

/**
 * Wires up mouse tooltip events on a level node element.
 */
function _wdWireNodeTooltip(node, wi, li, isDone, isLocked, isLastInWorld, isConvergence, isMaxCleared, isNexusPoint) {
    node.addEventListener('mouseenter', (e) => _wdShowTooltip(e, wi, li, isDone, isLocked, isLastInWorld, isConvergence, isMaxCleared, isNexusPoint));
    node.addEventListener('mousemove', (e) => _wdMoveTooltip(e));
    node.addEventListener('mouseleave', () => _wdHideTooltip());
}

/**
 * Builds a complete level node element: creates the div, applies classes,
 * sets inner HTML (with or without special effects), positions it on the
 * canvas, and wires up click and tooltip handlers.
 */
function _wdBuildLevelNode(wi, li, pos) {
    const gi = globalThis.WORLD_START_GI[wi] + li;
    const world = globalThis.WORLDS && globalThis.WORLDS[wi];

    // Determine state flags
    const isDone = !!(STATE && STATE.done && STATE.done.includes(gi));
    const isUnlocked = _wdIsLevelUnlocked(li, gi, wi);
    const isLocked = !isUnlocked;
    const isNexusPoint = typeof globalThis.isNexusPointLevel === 'function' && globalThis.isNexusPointLevel(wi, li);
    // Only the Nexus Point still wears the ascension look; every other world ends in a
    // normal level followed by its own Ascension Trial node.
    const isLastInWorld = isNexusPoint;
    const isConvergence = !!(world && _wdIsConvergenceNode(li, world));
    const isMathGated = _wdIsMathGated(gi);

    const isMaxCleared = _wdIsMaxCleared(gi);
    const icon = isMaxCleared ? '👑' : _wdGetNodeIcon(li, isDone, isLocked, isLastInWorld, isConvergence);

    // Syla - Nature's Aid: forest levels get a nature badge so the player
    // knows her vegetation bonus will trigger in this level.
    const isSylaForest = globalThis._charIs('syla') && !!(world && world.data[li] && world.data[li].isForestLevel);

    // Create the element and apply positioning / state classes
    const node = document.createElement('div');
    node.className = 'wd-level-node';
    node.dataset.li = li;
    _wdPositionNodeOnCanvas(node, wi, pos);
    _wdApplyNodeStateClasses(node, isDone, isLocked, isLastInWorld, isConvergence, isMathGated, isMaxCleared, isNexusPoint);

    // Build inner HTML - the stoxel aura is universal; special effects layer on top
    const stoxelHtml = _wdBuildStoxelAuraHtml(isDone);

    if (isConvergence || isMathGated || isLastInWorld) {
        const convergenceHtml = isConvergence ? _wdBuildConvergenceHtml(isDone) : '';
        const gateHtml = isMathGated ? _wdBuildMathGateHtml() : '';
        const ascensionHtml = isLastInWorld ? _wdBuildAscensionHtml(isDone) : '';
        node.innerHTML = _wdBuildNodeEffectsHtml(icon, stoxelHtml, convergenceHtml, gateHtml, ascensionHtml);
    } else {
        node.innerHTML = _wdBuildPlainNodeHtml(icon, stoxelHtml);
    }
    if (isSylaForest) node.insertAdjacentHTML('beforeend', '<div class="wd-syla-badge">🌿</div>');

    // Wire up interaction
    if (!isLocked) {
        node.addEventListener('click', () => _wdOnLevelNodeClick(wi, li));
    }
    _wdWireNodeTooltip(node, wi, li, isDone, isLocked, isLastInWorld, isConvergence, isMaxCleared, isNexusPoint);

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
    marker.setAttribute('data-tip-t', 'scr_back_to_entrance');
    marker.setAttribute('aria-label', t('scr_back_to_entrance'));

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
 * Gameplay default: move-down art (never the menu portrait - the menu
 * portrait stays reserved for save slots, level-select topbar and
 * quiz/exercise modals). Falls back to the no-class portrait only for
 * variants without directional art.
 */
function _wdBuildSprite() {
    const sprite = document.createElement('div');
    sprite.className = 'wd-sprite';
    sprite.id = 'wd-sprite';

    const img = document.createElement('img');
    img.id = 'wd-sprite-img';
    img.src = (typeof globalThis._getPlayerPuzzleDefaultImage === 'function')
        ? globalThis._getPlayerPuzzleDefaultImage()
        : ((typeof globalThis._getPlayerCharacterImage === 'function')
            ? globalThis._getPlayerCharacterImage()
            : 'images/sprites/Stox_noclass.webp');
    img.alt = 'Player';
    img.draggable = false;

    sprite.appendChild(img);
    if (typeof globalThis._animSetDefaultDownImage === 'function') {
        try { globalThis._animSetDefaultDownImage(img); } catch (e) {}
    }
    if (typeof globalThis._startAvatarIdleAnimation === 'function') {
        setTimeout(() => { try { globalThis._startAvatarIdleAnimation('wd-sprite-img'); } catch (e) {} }, 0);
    }
    return sprite;
}

/**
 * Instantly moves the sprite element to the position of the given level index
 * (or to the entrance if levelIdx is null). No animation - used for initial placement.
 */
function _wdPlaceSprite(sprite, wi, levelIdx) {
    const cfg = WD_WORLD_CONFIGS[wi];
    if (!cfg || !sprite) return;

    const pos = _wdGetNodePos(cfg, levelIdx);
    if (!pos) return;

    const canvas = _wdGetCanvas();
    const { x, y } = _wdImgPctToCanvasPct(pos.x, pos.y, canvas, cfg);
    sprite.style.left = x + '%';
    sprite.style.top = y + '%';
}


//------------------------------------------------------------------------
//-------------------SPRITE WALK ANIMATION---------------------------------
//------------------------------------------------------------------------

/**
 * Computes how long (ms) the sprite should take to walk one segment, based
 * on WD_WALK_SPEED_PX_PER_SEC and a fixed reference canvas width so speed
 * stays constant regardless of actual window size.
 */
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
 * Dominant-axis travel direction for a world-detail segment (image-% space).
 * Used to pick the directional walk set (up/down/left/right) instead of
 * the old menu-portrait/omni fallback.
 */
function _wdDirectionForSegment(startPos, endPos) {
    const dx = (endPos.x || 0) - (startPos.x || 0);
    const dy = (endPos.y || 0) - (startPos.y || 0);
    if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
}

/**
 * Updates the sprite's CSS position and facing direction for one
 * animation frame. ease is the pre-computed eased progress value (0–1).
 * Directional walk art is drawn facing its travel direction, so it must
 * NEVER be mirrored (same Trix left/right fix as the overworld map).
 * Only the omni right-facing fallback keeps the horizontal flip.
 */
function _wdUpdateSpriteFrame(sprite, startPos, endPos, ease) {
    const rawX = startPos.x + (endPos.x - startPos.x) * ease;
    const rawY = startPos.y + (endPos.y - startPos.y) * ease;

    const canvas = _wdGetCanvas();
    const cfg = WD_WORLD_CONFIGS[_wdCurrentWi];
    const pct = _wdImgPctToCanvasPct(rawX, rawY, canvas, cfg);
    sprite.style.left = pct.x + '%';
    sprite.style.top = pct.y + '%';

    const dir = _wdDirectionForSegment(startPos, endPos);
    const st = (typeof STATE !== 'undefined' && STATE) ? STATE : null;
    const char = st ? st.playerCharacter : null;
    const variant = st ? (st.playerAscendency || st.playerClass || 'noclass') : 'noclass';
    let directional = false;
    if (typeof globalThis._animHasDirectionalWalkSync === 'function' && char) {
        directional = globalThis._animHasDirectionalWalkSync(char, variant, dir);
    }
    if (!directional && typeof globalThis._animWalkIsDirectionalFor === 'function' && globalThis._animWalkIsDirectionalFor('wd-sprite-img')) {
        directional = true;
    }
    const img = sprite.querySelector('img');
    if (!img) return;
    if (directional) {
        img.style.scale = '1 1';
        return;
    }
    img.style.scale = (dir === 'left') ? '-1 1' : '1 1';
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

/**
 * Animates the sprite along a sequence of waypoints, one segment at a time.
 * If a redirect was requested mid-walk (_wdPendingRedirect) and this segment
 * lands on a road-graph node, breaks off into a fresh path toward the new
 * target instead of continuing to the original destination.
 * Note: this function and _wdContinueWalkFromNode call each other by design
 * (each walk leg can trigger a redirect, and each redirect starts a new leg).
 */
function _wdWalkAlongPoints(points, markers, segIdx, onComplete) {
    const sprite = _wdGetSprite();

    if (segIdx >= points.length - 1) {
        sprite.classList.remove('walking');
        if (typeof globalThis._stopAvatarWalkAnimation === 'function') globalThis._stopAvatarWalkAnimation();
        if (onComplete) onComplete();
        return;
    }

    const startPos = points[segIdx];
    const endPos = points[segIdx + 1];
    const durationMs = _wdGetSegmentDurationMs(startPos, endPos, _wdCurrentWi);
    const dir = _wdDirectionForSegment(startPos, endPos);
    const startTime = globalThis.performance.now();

    const step = (now) => {
        const t = Math.min((now - startTime) / durationMs, 1);
        const ease = _wdEaseInOut(t);
        _wdUpdateSpriteFrame(sprite, startPos, endPos, ease);

        // Drive the directional walk set EVERY FRAME while the glide runs -
        // same pattern as the WASD tick. _playAvatarWalkAnimation no-ops when
        // the same loop already runs, and _scheduleAvatarWalkIdle() re-arms
        // its short idle-debounce timer; calling it only once per segment
        // let that timer fire mid-glide, snapping the sprite back to idle
        // art for the rest of the walk ("sprite runs but never animates").
        if (typeof globalThis._playAvatarWalkAnimation === 'function') {
            try { globalThis._playAvatarWalkAnimation('wd-sprite-img', dir); }
            catch (e) {}
        }

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

/**
 * Finds the walk path from a given node to the target level and starts (or
 * continues) the walk animation along it. Finalizes STATE/position once the
 * destination is reached.
 */
function _wdContinueWalkFromNode(fromNodeKey, targetLevelIdx, onArrived) {
    const wi = _wdCurrentWi;
    const { points, markers } = _wdFindWalkPathWithMarkers(wi, fromNodeKey, targetLevelIdx);

    const finish = () => {
        _wdWalking = false;
        const sprite = _wdGetSprite();
        if (sprite) sprite.classList.remove('walking');
        if (typeof globalThis._stopAvatarWalkAnimation === 'function') globalThis._stopAvatarWalkAnimation();

        _wdCurrentLevelIdx = targetLevelIdx;
        _wdPersistSpritePos(wi, targetLevelIdx);
        _wdRefreshPaths(wi);
        if (onArrived) onArrived();
    };

    if (points.length < 2) { finish(); return; }
    _wdWalkAlongPoints(points, markers, 0, finish);
}

/**
 * Starts walking the sprite from its current position to the given level
 * node. If a walk is already in progress, queues this as a redirect instead
 * of starting a second animation.
 */
function _wdWalkSpriteTo(wi, targetLevelIdx, onArrived) {
    if (_wdWalking) {
        _wdPendingRedirect = { targetLevelIdx, onArrived };
        return;
    }

    _wdWalking = true;
    const fromNode = _wdCurrentLevelIdx === null ? 'entrance' : _wdCurrentLevelIdx;

    const sprite = _wdGetSprite();
    sprite.classList.add('walking');
    if (typeof globalThis._startAvatarWalkAnimation === 'function') globalThis._startAvatarWalkAnimation('wd-sprite-img');

    _wdContinueWalkFromNode(fromNode, targetLevelIdx, onArrived);
}

/**
 * Starts walking the sprite back to the entrance. Same redirect-queueing
 * behavior as _wdWalkSpriteTo when a walk is already in progress.
 */
function _wdWalkSpriteToEntrance() {
    if (_wdWalking) {
        _wdPendingRedirect = { targetLevelIdx: null, onArrived: null };
        return;
    }

    _wdWalking = true;
    const fromNode = _wdCurrentLevelIdx === null ? 'entrance' : _wdCurrentLevelIdx;

    const sprite = _wdGetSprite();
    sprite.classList.add('walking');
    if (typeof globalThis._startAvatarWalkAnimation === 'function') globalThis._startAvatarWalkAnimation('wd-sprite-img');

    _wdContinueWalkFromNode(fromNode, null, null);
}


//------------------------------------------------------------------------
//-------------------TOP BAR-----------------------------------------------
//------------------------------------------------------------------------

/**
 * Resolves the localised display name for a world.
 */
function _wdGetWorldName(wi) {
    const world = globalThis.WORLDS && globalThis.WORLDS[wi];
    if (!world) return t('scr_world_n').replace('{n}', wi + 1);
    return (LANG === 'de' && world.labelDE) ? world.labelDE : world.label;
}

/**
 * Updates the world-detail top bar: sets the screen title and world name label.
 */
function _wdBuildTopBar(wi) {
    // The one difference vs the overworld topbar: the plaque carries the
    // CURRENT WORLD NAME instead of the SELECT LEVEL title.
    const plaque = document.getElementById('wd-title-plaque');
    if (plaque) {
        plaque.textContent = _wdGetWorldName(wi);
        _wdFitPlaqueText(plaque);
        // The screen may still be display:none during the first call (clientWidth 0
        // hides any overflow), so re-fit once it is actually laid out.
        requestAnimationFrame(function () { _wdFitPlaqueText(plaque); });
    }

    // Everything else mirrors the overworld map-view topbar exactly
    // (same populate helpers, wd- prefixed ids, same visuals).
    _renderTopBarScore('wd');
    _renderTopBarNextCode('wd');
    _renderTopBarClassStatus('wd');
    _renderTopBarQuestBadge('wd');
    _renderTopBarTreePoints('wd');
    _wireTopBarButtons('wd');
    ensureAffinityButton();
    // Class-change token entry button - only visible while a token is held.
    if (typeof globalThis.updateClassChangeButtons === 'function') globalThis.updateClassChangeButtons();

    if (typeof globalThis.renderMapViewCharacterPortrait === 'function') globalThis.renderMapViewCharacterPortrait('wd');
}

/**
 * Fits the world-name text inside the plaque: starts from the CSS-clamped
 * font-size and shrinks (with letter-spacing scaled to match) until the name
 * fits without overflow. Long localized names (e.g. "The Vortex of
 * Possibilities") can exceed the clamp's capacity at narrow widths.
 */
function _wdFitPlaqueText(plaque) {
    if (!plaque) return;
    // Re-derive from the CSS clamp each run so repeat calls (e.g. after the
    // screen becomes visible) start from the natural size, not the last fit.
    plaque.style.fontSize = '';
    plaque.style.letterSpacing = '';
    const cs = globalThis.getComputedStyle(plaque);
    let size = parseFloat(cs.fontSize);
    const min = 9;
    let guard = 0;
    while (size > min && plaque.scrollWidth > plaque.clientWidth && guard < 30) {
        size -= 1;
        plaque.style.fontSize = size + 'px';
        plaque.style.letterSpacing = (size * 0.15) + 'px';
        guard++;
    }
}

/**
 * Called from HTML via onclick="wdGoBackToMap()".
 * Cancels any in-progress walk animation and returns to the overworld map screen.
 */
export function wdGoBackToMap() {
    if (_wdWalking) {
        globalThis.cancelAnimationFrame(_wdWalkAnim);
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
 * Afterwards appends the world's Convergence Trial node (if configured).
 */
function _wdAppendLevelNodes(canvas, wi, cfg, levelCount) {
    const count = Math.min(cfg.nodes.length, levelCount);
    for (let li = 0; li < count; li++) {
        canvas.appendChild(_wdBuildLevelNode(wi, li, cfg.nodes[li]));
    }
    const trialPos = _wdTrialNodeForWorld(wi);
    if (trialPos) canvas.appendChild(_wdBuildTrialNode(wi, trialPos));
    const ascPos = _wdAscensionNodeForWorld(wi);
    if (ascPos) canvas.appendChild(_wdBuildAscensionNode(wi, ascPos));
    for (const cn of _wdCompanionNodesForWorld(wi)) canvas.appendChild(_wdBuildCompanionNode(wi, cn));
    for (const cn of _wdCoopNodesForWorld(wi)) canvas.appendChild(_wdBuildCoopNode(wi, cn));
    for (const an of _wdAftermathNodesForWorld(wi)) canvas.appendChild(_wdBuildAftermathNode(wi, an, AFTERMATH_LOOK));
    for (const rn of _wdRevealNodesForWorld(wi)) canvas.appendChild(_wdBuildAftermathNode(wi, rn, REVEAL_LOOK));
}

//------------------------------------------------------------------------
//-------------------COMPANION NODES (MEETING SCENES)----------------------
//------------------------------------------------------------------------
// Optional nodes where the player's hero meets one of the other two heroes
// (scripts in js/storyline/companion-scenes.js). Config:
// WD_WORLD_CONFIGS[wi].companionNodes = [{ id, from, x, y }].

/**
 * Returns the world's companion nodes that should be on the map: the scene
 * has a script for the picked character and the level it hangs off is cleared.
 */
function _wdCompanionNodesForWorld(wi) {
    const cfg = WD_WORLD_CONFIGS[wi];
    if (!cfg || !cfg.companionNodes || !STATE) return [];
    return cfg.companionNodes.filter(cn => {
        if (!cfg.nodes[cn.from] || !globalThis.getCompanionPairing(cn.id)) return false;
        return STATE.done && STATE.done.includes(globalThis.WORLD_START_GI[wi] + cn.from);
    });
}

/**
 * Returns the heroes a meeting scene has besides the player, as cast entries
 * ({ name, ... }): one hero, or two when the script has a second companion.
 */
function _wdMeetingCast(pairing) {
    return [pairing.companion, pairing.companion2].filter(Boolean)
        .map(id => ({ id, ...globalThis.COMPANION_CAST[id] }));
}

/**
 * Builds the face(s) shown in a meeting node's circle: one face, or two side
 * by side (each in its own half) when two heroes are at the meeting.
 */
function _wdMeetingFacesHtml(pairing) {
    const faces = _wdMeetingCast(pairing).map(({ id }) => {
        const cap = id.charAt(0).toUpperCase() + id.slice(1);
        const look = pairing.looks[id];
        const img = `<img class="wd-companion-face" src="animations/${cap}/idle/${look}/down/${cap}_${look}_idle_down_1.webp" alt="" draggable="false">`;
        return pairing.companion2 ? `<span class="wd-companion-half">${img}</span>` : img;
    });
    return pairing.companion2 ? `<div class="wd-companion-duo">${faces.join('')}</div>` : faces[0];
}

/**
 * Joins the names of the heroes at a meeting: "Stox" or "Stox & Syla".
 */
function _wdMeetingNames(cast) {
    return cast.map(c => c.name).join(' & ');
}

/**
 * Builds a companion node: the companion's face (or both faces) in the circle,
 * green once the meeting has been watched. Clicking walks the sprite there and
 * offers the "talk" button.
 */
function _wdBuildCompanionNode(wi, cn) {
    const pairing = globalThis.getCompanionPairing(cn.id);
    const cast = _wdMeetingCast(pairing);
    const node = document.createElement('div');
    node.className = 'wd-level-node wd-companion-node';
    node.dataset.companionNode = cn.id;
    _wdPositionNodeOnCanvas(node, wi, cn);

    const isDone = globalThis.hasMetCompanion(cn.id);
    if (isDone) node.classList.add('done');
    node.innerHTML = _wdBuildNodeEffectsHtml(_wdMeetingFacesHtml(pairing), '', '', '', '');

    node.addEventListener('click', () => {
        const existing = document.getElementById('wd-enter-btn');
        if (existing) existing.remove();
        _wdWalkSpriteTo(wi, 'comp:' + cn.id, () => _wdShowCompanionButton(wi, cn, cast));
    });
    node.addEventListener('mouseenter', (e) => _wdShowCompanionTooltip(e, cn.id, cast, isDone));
    node.addEventListener('mousemove', (e) => _wdMoveTooltip(e));
    node.addEventListener('mouseleave', () => _wdHideTooltip());
    return node;
}

/**
 * Counts a world's story meetings and co-op encounters for the world tooltip:
 * how many exist for the picked hero and how many were watched / cleared.
 * Returns { meetings: { done, total }, coops: { done, total } }.
 */
export function wdStoryProgress(wi) {
    const cfg = WD_WORLD_CONFIGS[wi];
    const meetings = ((cfg && cfg.companionNodes) || []).filter(cn => !!globalThis.getCompanionPairing(cn.id));
    const coops = ((cfg && cfg.coopNodes) || []).filter(cn => !!coopFriend(cn.id));
    return {
        meetings: { done: meetings.filter(cn => globalThis.hasMetCompanion(cn.id)).length, total: meetings.length },
        coops: { done: coops.filter(cn => coopCleared(cn.id)).length, total: coops.length },
    };
}

/**
 * Returns the world's co-op nodes that should be on the map: the player has a
 * friend for the encounter, has watched the meeting it follows, and the level
 * it hangs off is cleared.
 */
function _wdCoopNodesForWorld(wi) {
    const cfg = WD_WORLD_CONFIGS[wi];
    if (!cfg || !cfg.coopNodes || !STATE) return [];
    return cfg.coopNodes.filter(cn => cfg.nodes[cn.from] && coopAvailable(cn.id)
        && !!STATE.done && STATE.done.includes(globalThis.WORLD_START_GI[wi] + cn.from));
}

/**
 * Builds a co-op node: the friend's face with a gold ring, ticked once the
 * encounter was cleared. Clicking walks the sprite there and offers to play.
 */
function _wdBuildCoopNode(wi, cn) {
    const friend = coopFriend(cn.id);
    const cast = COMPANION_CAST[friend];
    const look = COMPANION_LOOKS[friend].base;
    const cap = friend.charAt(0).toUpperCase() + friend.slice(1);
    const node = document.createElement('div');
    node.className = 'wd-level-node wd-companion-node wd-coop-node';
    node.dataset.coopNode = cn.id;
    _wdPositionNodeOnCanvas(node, wi, cn);
    const isDone = coopCleared(cn.id);
    if (isDone) node.classList.add('done');
    node.style.boxShadow = '0 0 0 3px #ffd93d, 0 0 14px 2px #ffd93d';
    const face = `<img class="wd-companion-face" src="animations/${cap}/idle/${look}/down/${cap}_${look}_idle_down_1.webp" alt="" draggable="false">`;
    node.innerHTML = _wdBuildNodeEffectsHtml(face, '', '', '', '');
    node.addEventListener('click', () => {
        const existing = document.getElementById('wd-enter-btn');
        if (existing) existing.remove();
        _wdWalkSpriteTo(wi, 'comp:' + cn.id, () => _wdShowCoopButton(wi, cn, cast));
    });
    node.addEventListener('mouseenter', (e) => _wdShowCoopTooltip(e, cn.id, cast, isDone));
    node.addEventListener('mousemove', (e) => _wdMoveTooltip(e));
    node.addEventListener('mouseleave', () => _wdHideTooltip());
    return node;
}

/**
 * Shows the "Play with <hero>" button above a co-op node; pressing it opens the encounter.
 */
function _wdShowCoopButton(wi, cn, cast) {
    const existing = document.getElementById('wd-enter-btn');
    if (existing) existing.remove();
    const cfg = WD_WORLD_CONFIGS[wi];
    const canvas = _wdGetCanvas();
    const pct = _wdImgPctToCanvasPct(cn.x, cn.y, canvas, cfg);
    const btn = document.createElement('button');
    btn.id = 'wd-enter-btn';
    btn.textContent = (LANG === 'de' ? '▶ Gemeinsam mit ' + cast.name : '▶ Play with ' + cast.name);
    btn.style.cssText = `
        position: absolute;
        left: ${pct.x}%;
        top: calc(${pct.y}% - 56px);
        transform: translateX(-50%);
        z-index: 10;
        font-family: var(--PX, monospace);
        font-size: 11px;
        padding: 5px 12px;
        background: #9a7a1f;
        color: #fff8dc;
        border: none;
        cursor: pointer;
        letter-spacing: 1px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.7);
    `;
    btn.addEventListener('click', () => {
        btn.remove();
        startCoopEncounter(cn.id);
    });
    _wdWireEnterButtonDismiss(btn);
    if (canvas) canvas.appendChild(btn);
}

// How the two kinds of scene node look: the scene after a co-op (green) and a
// hero's secret half (violet).
const AFTERMATH_LOOK = {
    cls: 'wd-aftermath-node', attr: 'aftermathNode', ring: '#7fe0b0', button: '#2f7a5a', icon: '📜',
    en: 'After your adventure together', de: 'Nach dem gemeinsamen Abenteuer',
};
const REVEAL_LOOK = {
    cls: 'wd-reveal-node', attr: 'revealNode', ring: '#c8a0ff', button: '#6a4a9a', icon: '🗝️',
    en: 'Something they have not told you yet', de: 'Etwas, das sie dir noch nicht erzählt haben',
};

/**
 * Returns the world's secret-half scene nodes that should be on the map: the
 * teller is another hero, the player's hero has enough affinity with them, the story node
 * of the world was watched, and the scene has a script for the picked character.
 */
function _wdRevealNodesForWorld(wi) {
    const cfg = WD_WORLD_CONFIGS[wi];
    if (!cfg || !cfg.revealNodes || !STATE) return [];
    return cfg.revealNodes.filter(rn => cfg.nodes[rn.from] && rn.teller !== STATE.playerCharacter
        && getAffinityPoints(STATE.companionAffinity, STATE.playerCharacter, rn.teller) >= rn.needPoints
        && globalThis.hasMetCompanion(rn.after) && !!globalThis.getCompanionPairing(rn.id));
}

/**
 * Returns the world's "after the co-op" scene nodes that should be on the map:
 * the encounter they follow was cleared and the scene has a script for the
 * picked character.
 */
function _wdAftermathNodesForWorld(wi) {
    const cfg = WD_WORLD_CONFIGS[wi];
    if (!cfg || !cfg.aftermathNodes || !STATE) return [];
    return cfg.aftermathNodes.filter(an => cfg.nodes[an.from] && coopCleared(an.coop)
        && !!globalThis.getCompanionPairing(an.id));
}

/**
 * Builds an after-the-co-op scene node: the friend's face with a soft green
 * ring, ticked once the scene was watched. Clicking walks the sprite there and
 * offers the "talk" button.
 */
function _wdBuildAftermathNode(wi, an, style) {
    const pairing = globalThis.getCompanionPairing(an.id);
    const cast = COMPANION_CAST[pairing.companion];
    const cap = pairing.companion.charAt(0).toUpperCase() + pairing.companion.slice(1);
    const look = pairing.looks[pairing.companion];
    const node = document.createElement('div');
    node.className = 'wd-level-node wd-companion-node ' + style.cls;
    node.dataset[style.attr] = an.id;
    _wdPositionNodeOnCanvas(node, wi, an);
    const isDone = globalThis.hasMetCompanion(an.id);
    if (isDone) node.classList.add('done');
    node.style.boxShadow = `0 0 0 3px ${style.ring}, 0 0 14px 2px ${style.ring}`;
    const face = `<img class="wd-companion-face" src="animations/${cap}/idle/${look}/down/${cap}_${look}_idle_down_1.webp" alt="" draggable="false">`;
    node.innerHTML = _wdBuildNodeEffectsHtml(face, '', '', '', '');
    node.addEventListener('click', () => {
        const existing = document.getElementById('wd-enter-btn');
        if (existing) existing.remove();
        _wdWalkSpriteTo(wi, 'comp:' + an.id, () => _wdShowAftermathButton(wi, an, cast, style));
    });
    node.addEventListener('mouseenter', (e) => {
        const tip = _wdEnsureTooltip();
        const de = LANG === 'de';
        const label = de ? style.de : style.en;
        tip.innerHTML = `<div class="wd-tip-title">${style.icon} ${cast.name}</div>`
            + `<div class="wd-tip-status">${isDone ? (de ? 'Gehört ✓' : 'Heard ✓') : label}</div>`;
        tip.classList.add('show');
        _wdMoveTooltip(e);
    });
    node.addEventListener('mousemove', (e) => _wdMoveTooltip(e));
    node.addEventListener('mouseleave', () => _wdHideTooltip());
    return node;
}

/**
 * Shows the "Talk to <hero>" button above an after-the-co-op node; pressing it
 * plays the scene and then redraws the map.
 */
function _wdShowAftermathButton(wi, an, cast, style) {
    const existing = document.getElementById('wd-enter-btn');
    if (existing) existing.remove();
    const cfg = WD_WORLD_CONFIGS[wi];
    const canvas = _wdGetCanvas();
    const pct = _wdImgPctToCanvasPct(an.x, an.y, canvas, cfg);
    const btn = document.createElement('button');
    btn.id = 'wd-enter-btn';
    btn.textContent = (LANG === 'de' ? '▶ Mit ' + cast.name + ' sprechen' : '▶ Talk to ' + cast.name);
    btn.style.cssText = `
        position: absolute;
        left: ${pct.x}%;
        top: calc(${pct.y}% - 56px);
        transform: translateX(-50%);
        z-index: 10;
        font-family: var(--PX, monospace);
        font-size: 11px;
        padding: 5px 12px;
        background: ${style.button};
        color: #f4fff8;
        border: none;
        cursor: pointer;
        letter-spacing: 1px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.7);
    `;
    btn.addEventListener('click', () => {
        btn.remove();
        globalThis.playCompanionScene(an.id, () => showWorldDetail(wi));
    });
    _wdWireEnterButtonDismiss(btn);
    if (canvas) canvas.appendChild(btn);
}

/**
 * Co-op node tooltip: the encounter's name, the friend and whether it was cleared.
 */
function _wdShowCoopTooltip(e, coopId, cast, isDone) {
    const tip = _wdEnsureTooltip();
    const de = LANG === 'de';
    const status = isDone ? (de ? 'Gemeinsam geschafft ✓' : 'Cleared together ✓') : (de ? 'Gemeinsame Begegnung' : 'Co-op encounter');
    tip.innerHTML = `<div class="wd-tip-title">🤝 ${coopName(coopId)}</div>`
        + `<div class="wd-tip-status">${(de ? 'Mit ' : 'With ') + cast.name} · ${status}</div>`;
    tip.classList.add('show');
    _wdMoveTooltip(e);
}

/**
 * Shows the "Talk to <hero>" button above a companion node; pressing it
 * plays the meeting and then redraws the map.
 */
function _wdShowCompanionButton(wi, cn, cast) {
    const existing = document.getElementById('wd-enter-btn');
    if (existing) existing.remove();

    const cfg = WD_WORLD_CONFIGS[wi];
    const canvas = _wdGetCanvas();
    const pct = _wdImgPctToCanvasPct(cn.x, cn.y, canvas, cfg);

    const btn = document.createElement('button');
    btn.id = 'wd-enter-btn';
    const names = _wdMeetingNames(cast);
    btn.textContent = (LANG === 'de' ? '▶ Mit ' + names + ' sprechen' : '▶ Talk to ' + names);
    btn.style.cssText = `
        position: absolute;
        left: ${pct.x}%;
        top: calc(${pct.y}% - 56px);
        transform: translateX(-50%);
        z-index: 10;
        font-family: var(--PX, monospace);
        font-size: 11px;
        padding: 5px 12px;
        background: #2f5f9a;
        color: #eaf4ff;
        border: none;
        cursor: pointer;
        letter-spacing: 1px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.7);
    `;
    btn.addEventListener('click', () => {
        btn.remove();
        _wdPlayStoryWithCatchUp(wi, { key: cn.id, meet: cn.id });
    });
    _wdWireEnterButtonDismiss(btn);
    if (canvas) canvas.appendChild(btn);
}

/**
 * Companion-node tooltip: the meeting's name, who is there and whether it was
 * seen. A meeting without a name falls back to the heroes' names as the title.
 */
function _wdShowCompanionTooltip(e, sceneId, cast, isDone) {
    const tip = _wdEnsureTooltip();
    const de = LANG === 'de';
    const names = _wdMeetingNames(cast);
    const title = companionSceneTitle(sceneId, LANG) || names;
    const status = de
        ? (isDone ? 'Getroffen ✓' : 'Optionale Begegnung')
        : (isDone ? 'Met ✓' : 'Optional meeting');
    tip.innerHTML = `<div class="wd-tip-title">💬 ${title}</div>`
        + `<div class="wd-tip-status">${(de ? 'Mit ' : 'With ') + names} · ${status}</div>`;
    tip.classList.add('show');
    _wdMoveTooltip(e);
}

/**
 * Every story scene (companion meeting or home visit) the player can watch
 * right now, in world order. Entries are { key, meet }.
 */
function _wdStoryChain() {
    const chain = [];
    WD_WORLD_CONFIGS.forEach((cfg, wi) => {
        for (const cn of _wdCompanionNodesForWorld(wi)) chain.push({ key: cn.id, meet: cn.id });
    });
    return chain;
}

/**
 * True when the player has watched this scene, or chose to skip it when
 * asked ("Skip them" in the catch-up prompt).
 */
function _wdStoryEntryHandled(entry) {
    return globalThis.hasMetCompanion(entry.meet)
        || globalThis.hasSeen('story_declined', { sceneId: entry.key });
}

/**
 * Plays one story scene and then calls onDone.
 */
function _wdPlayStoryEntry(entry, onDone) {
    globalThis.playCompanionScene(entry.meet, onDone);
}

/**
 * Plays the missed scenes one after the other, then redraws the map.
 */
function _wdPlayMissedStories(wi, missed) {
    if (!missed.length) { showWorldDetail(wi); return; }
    _wdPlayStoryEntry(missed[0], () => _wdPlayMissedStories(wi, missed.slice(1)));
}

/**
 * Plays a story scene. If earlier scenes were never watched, first asks
 * whether to watch them: "yes" plays them and returns to the map (the scene
 * is not started), "no" remembers they were skipped and plays this scene.
 */
function _wdPlayStoryWithCatchUp(wi, entry) {
    const chain = _wdStoryChain();
    const idx = chain.findIndex(e => e.key === entry.key);
    const missed = _wdStoryEntryHandled(entry) ? []
        : chain.slice(0, Math.max(idx, 0)).filter(e => !_wdStoryEntryHandled(e));
    const playThis = () => _wdPlayStoryEntry(entry, () => showWorldDetail(wi));
    if (!missed.length) { playThis(); return; }
    globalThis.askStoryCatchUp(
        missed.length,
        () => _wdPlayMissedStories(wi, missed),
        () => {
            missed.forEach(e => globalThis.markSeen('story_declined', { sceneId: e.key }));
            playThis();
        }
    );
}

/**
 * Returns the Ascension Trial node position for a world, or null when the
 * world has none (the Nexus World) or the trial system is absent.
 */
function _wdAscensionNodeForWorld(wi) {
    const cfg = (typeof WD_WORLD_CONFIGS !== 'undefined') ? WD_WORLD_CONFIGS[wi] : null;
    if (!cfg || !cfg.ascensionNode) return null;
    if (typeof globalThis._trialWorlds === 'function' && globalThis._trialWorlds().indexOf(wi) === -1) return null;
    return cfg.ascensionNode;
}

/**
 * Builds the Ascension Trial node that follows a world's last level: same
 * base classes as a level node, with the purple ascension star on top and
 * an "A" in the circle. It opens once the world's last level is cleared.
 */
function _wdBuildAscensionNode(wi, pos) {
    const node = document.createElement('div');
    node.className = 'wd-level-node wd-trial-node ascension';
    node.dataset.ascensionTrial = wi;
    _wdPositionNodeOnCanvas(node, wi, pos);

    const isDone = (typeof globalThis._isAscensionTrialDone === 'function') && globalThis._isAscensionTrialDone(wi);
    const isLocked = (typeof globalThis._isAscensionTrialUnlocked === 'function') ? !globalThis._isAscensionTrialUnlocked(wi) : true;
    if (isDone) node.classList.add('done');
    else if (isLocked) node.classList.add('locked');

    const icon = isLocked ? '🔒' : 'A';
    node.innerHTML = _wdBuildNodeEffectsHtml(icon, _wdBuildStoxelAuraHtml(isDone), '', '', _wdBuildAscensionHtml(isDone));

    if (!isLocked) node.addEventListener('click', () => _wdOnAscensionNodeClick(wi));
    node.addEventListener('mouseenter', (e) => _wdShowAscensionTooltip(e, wi, isDone, isLocked));
    node.addEventListener('mousemove', (e) => _wdMoveTooltip(e));
    node.addEventListener('mouseleave', () => _wdHideTooltip());
    return node;
}

/**
 * Handles a click on the Ascension Trial node: drops any open enter button,
 * walks the sprite along the road from the last level, then shows the
 * enter button on arrival.
 */
function _wdOnAscensionNodeClick(wi) {
    const existing = document.getElementById('wd-enter-btn');
    if (existing) existing.remove();
    _wdWalkSpriteTo(wi, 'ascension', () => _wdShowAscensionEnterButton(wi));
}

/**
 * Shows the "Enter Ascension Trial" button above the Ascension Trial node.
 */
function _wdShowAscensionEnterButton(wi) {
    const existing = document.getElementById('wd-enter-btn');
    if (existing) existing.remove();

    const cfg = WD_WORLD_CONFIGS[wi];
    const pos = cfg && cfg.ascensionNode;
    if (!pos) return;

    const name = (typeof globalThis._ascensionTrialName === 'function') ? globalThis._ascensionTrialName(wi) : ('Ascension Trial - World ' + (wi + 1));
    const rawEnter = (typeof t === 'function') ? t('scr_enter_trial') : null;
    const btnText = (rawEnter && rawEnter !== 'scr_enter_trial')
        ? rawEnter.replace('{n}', name) : ('Enter ' + name);

    const btn = document.createElement('button');
    btn.id = 'wd-enter-btn';
    btn.textContent = btnText;

    const canvas = _wdGetCanvas();
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
        background: #7a4fc0;
        color: #f3eaff;
        border: none;
        cursor: pointer;
        letter-spacing: 1px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.7);
    `;
    btn.addEventListener('click', () => {
        btn.remove();
        if (typeof globalThis._launchAscensionTrial === 'function') globalThis._launchAscensionTrial(wi);
    });
    _wdWireEnterButtonDismiss(btn);
    if (canvas) canvas.appendChild(btn);
}

/**
 * Ascension Trial tooltip: trial name, status, monster level / boss preview
 * and a note that it ends in a boss fight.
 */
function _wdShowAscensionTooltip(e, wi, isDone, isLocked) {
    const tip = _wdEnsureTooltip();
    const name = (typeof globalThis._ascensionTrialName === 'function') ? globalThis._ascensionTrialName(wi) : ('Ascension Trial - World ' + (wi + 1));
    let status = isLocked ? t('scr_locked') : (isDone ? t('scr_trial_done') : t('scr_not_completed'));
    if (!status || status.indexOf('scr_') === 0) {
        status = isLocked ? 'Locked' : (isDone ? 'Completed' : 'Not completed');
    }
    let detail = '';
    if (!isLocked && typeof globalThis._trialMonsterLevel === 'function') {
        const ml = globalThis._trialMonsterLevel(wi, true);
        let bossName = '';
        try {
            const def = globalThis.BOSS_DEFS && globalThis.BOSS_DEFS[globalThis._trialBossId(wi, 1)];
            if (def) bossName = ' · ' + (def.emoji ? def.emoji + ' ' : '') + (def.name || '');
        } catch (err) { /* boss preview is optional */ }
        const lvlLabel = t('scr_trial_level');
        detail = `<div class="wd-tip-sub">${(lvlLabel && lvlLabel !== 'scr_trial_level' ? lvlLabel : 'Monster level')}: ${ml}${bossName}</div>`;
    }
    let hint = '';
    if (!isLocked && !isDone) {
        const rawAsc = t('scr_ascension_trial_hint');
        hint = `<div class="wd-tip-bonus">${(rawAsc && rawAsc !== 'scr_ascension_trial_hint') ? rawAsc : '⚗️ Trial chain - ends in a boss fight'}</div>`;
    }
    const badge = t('scr_ascension_badge');
    tip.innerHTML = `<div class="wd-tip-title">${(badge && badge.indexOf('scr_') !== 0 ? badge + ' · ' : '⚗️ ')}${name}</div>`
        + `<div class="wd-tip-status">${status}</div>${detail}${hint}`;
    tip.classList.add('show');
    _wdMoveTooltip(e);
}

/**
 * Returns the Convergence Trial node position for a world, or null when the
 * world has no trial (e.g. the Nexus World) or the trial system is absent.
 */
function _wdTrialNodeForWorld(wi) {
    const cfg = (typeof WD_WORLD_CONFIGS !== 'undefined') ? WD_WORLD_CONFIGS[wi] : null;
    if (!cfg || !cfg.trialNode) return null;
    if (typeof globalThis._trialWorlds === 'function' && globalThis._trialWorlds().indexOf(wi) === -1) return null;
    return cfg.trialNode;
}

/**
 * Builds the Convergence Trial node element: same base classes as a level
 * node (so resize/reposition picks it up automatically) plus the
 * convergence ring styling, a 🌿 icon and trial tooltip / enter flow.
 */
function _wdBuildTrialNode(wi, pos) {
    const node = document.createElement('div');
    node.className = 'wd-level-node wd-trial-node';
    node.dataset.trial = wi;
    _wdPositionNodeOnCanvas(node, wi, pos);

    const isDone = (typeof globalThis._isTrialDone === 'function') && globalThis._isTrialDone(wi);
    const isLocked = (typeof globalThis._isTrialUnlocked === 'function') ? !globalThis._isTrialUnlocked(wi) : false;
    if (isDone) node.classList.add('done');
    else if (isLocked) node.classList.add('locked');
    node.classList.add('convergence');

    // Cleared trials show a "T" (not the world number, which read like a level).
    const icon = isDone ? 'T' : (isLocked ? '🔒' : '🌿');
    const stoxelHtml = (typeof _wdBuildStoxelAuraHtml === 'function') ? _wdBuildStoxelAuraHtml(isDone) : '';
    const convHtml = (typeof _wdBuildConvergenceHtml === 'function') ? _wdBuildConvergenceHtml(isDone) : '';
    node.innerHTML = (typeof _wdBuildNodeEffectsHtml === 'function')
        ? _wdBuildNodeEffectsHtml(icon, stoxelHtml, convHtml, '', '')
        : `<span>${icon}</span>`;

    if (!isLocked) {
        node.addEventListener('click', () => _wdOnTrialNodeClick(wi));
    }
    node.addEventListener('mouseenter', (e) => _wdShowTrialTooltip(e, wi, isDone, isLocked));
    node.addEventListener('mousemove', (e) => _wdMoveTooltip(e));
    node.addEventListener('mouseleave', () => _wdHideTooltip());
    return node;
}

/**
 * Handles a click on a Convergence Trial node: drops any open enter button,
 * walks the sprite along the roads (via the spur off the 66% level) to the
 * trial node, then shows the trial enter button on arrival - same flow as a
 * level node.
 */
function _wdOnTrialNodeClick(wi) {
    const existing = document.getElementById('wd-enter-btn');
    if (existing) existing.remove();
    _wdWalkSpriteTo(wi, 'trial', () => _wdShowTrialEnterButton(wi));
}

/**
 * Shows the "Enter Convergence Trial N" button above the trial node.
 */
function _wdShowTrialEnterButton(wi) {
    const existing = document.getElementById('wd-enter-btn');
    if (existing) existing.remove();

    const cfg = WD_WORLD_CONFIGS[wi];
    const pos = cfg && cfg.trialNode;
    if (!pos) return;

    const name = (typeof globalThis._trialName === 'function') ? globalThis._trialName(wi) : ('Convergence Trial ' + (wi + 1));
    const rawEnter = (typeof t === 'function') ? t('scr_enter_trial') : null;
    const btnText = (rawEnter && rawEnter !== 'scr_enter_trial')
        ? rawEnter.replace('{n}', name) : ('Enter ' + name);

    const btn = document.createElement('button');
    btn.id = 'wd-enter-btn';
    btn.textContent = btnText;

    const canvas = _wdGetCanvas();
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
        background: #2f7d4f;
        color: #eafff0;
        border: none;
        cursor: pointer;
        letter-spacing: 1px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.7);
    `;
    btn.addEventListener('click', () => {
        btn.remove();
        if (typeof globalThis._launchCampaignTrial === 'function') globalThis._launchCampaignTrial(wi);
    });
    _wdWireEnterButtonDismiss(btn);
    if (canvas) canvas.appendChild(btn);
}

/**
 * Trial-node tooltip: trial name, status, monster level / boss preview and
 * the first-clear reward note.
 */
function _wdShowTrialTooltip(e, wi, isDone, isLocked) {
    const tip = _wdEnsureTooltip();
    const name = (typeof globalThis._trialName === 'function') ? globalThis._trialName(wi) : ('Convergence Trial ' + (wi + 1));
    let status = '';
    if (isLocked) status = t('scr_locked');
    else if (isDone) status = t('scr_trial_done');
    else status = t('scr_not_completed');
    if (!status || status.indexOf('scr_') === 0) {
        status = isLocked ? 'Locked' : (isDone ? 'Completed' : 'Not completed');
    }
    let detail = '';
    if (!isLocked && typeof globalThis._trialMonsterLevel === 'function') {
        const ml = globalThis._trialMonsterLevel(wi, false);
        let bossName = '';
        try {
            if (typeof globalThis._trialBossId === 'function' && typeof globalThis.BOSS_DEFS !== 'undefined' && globalThis.BOSS_DEFS) {
                const def = globalThis.BOSS_DEFS[globalThis._trialBossId(wi, 0)];
                if (def) bossName = ' · ' + (def.emoji ? def.emoji + ' ' : '') + (def.name || '');
            }
        } catch (err) {}
        const lvlLabel = (typeof t === 'function' ? t('scr_trial_level') : null);
        detail = `<div class="wd-tip-sub">${(lvlLabel && lvlLabel !== 'scr_trial_level' ? lvlLabel : 'Monster level')}: ${ml}${bossName}</div>`;
    }
    let reward = '';
    if (!isLocked && !isDone) {
        const rw = (typeof t === 'function') ? t('scr_trial_reward') : null;
        reward = `<div class="wd-tip-bonus">${(rw && rw !== 'scr_trial_reward' ? rw : '🌿 First clear: +1 passive point')}</div>`;
    }
    const badge = (typeof t === 'function' ? t('scr_convergence_badge') : null);
    tip.innerHTML = `<div class="wd-tip-title">${(badge && badge.indexOf('scr_') !== 0 ? badge + ' · ' : '🌿 ')}${name}</div>`
        + `<div class="wd-tip-status">${status}</div>${detail}${reward}`;
    // The tooltip is opacity-driven via .mv-tooltip.show - use the class,
    // NOT an inline display style, or the tip stays invisible (opacity 0).
    tip.classList.add('show');
    _wdMoveTooltip(e);
}

/**
 * Repositions all dynamic canvas elements (level nodes, entrance marker,
 * sprite, road paths) to match the current canvas size.
 * Called on resize and after the initial build.
 */
function _wdRepositionAll(wi) {
    const canvas = _wdGetCanvas();
    if (!canvas) return;
    const cfg = WD_WORLD_CONFIGS[wi];
    if (!cfg) return;

    // Level nodes - each stores its image-relative coords in dataset
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
    const sprite = _wdGetSprite();
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
    window._wdResizeObserver = new globalThis.ResizeObserver(() => _wdRepositionAll(wi));
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
        wrap.innerHTML = `<div style="color:#f5e9c8;padding:20px;font-family:monospace;">${t('scr_need_other_worlds')}</div>`;
        return;
    }

    const world = globalThis.WORLDS && globalThis.WORLDS[wi];
    const levelCount = world ? world.data.length : cfg.nodes.length;

    const { canvas, svg } = _wdCreateCanvasElement(cfg);
    wrap.appendChild(canvas);

    canvas.appendChild(_wdBuildEntranceMarker(wi, cfg, canvas));
    _wdAppendLevelNodes(canvas, wi, cfg, levelCount);

    const sprite = _wdBuildSprite();
    canvas.appendChild(sprite);

    _wdInitialLayout(canvas, svg, wi, sprite);

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
    const isNexusPoint = typeof globalThis.isNexusPointLevel === 'function' && globalThis.isNexusPointLevel(wi, li);
    const rawNexusLabel = t('scr_enter_nexus_point');
    const btnText = isNexusPoint && rawNexusLabel !== 'scr_enter_nexus_point'
        ? rawNexusLabel
        : t('scr_enter_level').replace('{lvl}', `${wi + 1}-${li + 1}`);

    const btn = document.createElement('button');
    btn.id = 'wd-enter-btn';
    btn.textContent = btnText;

    const canvas = _wdGetCanvas();
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
        if (typeof globalThis.startLevel === 'function') globalThis.startLevel(gi);
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

    const gi = globalThis.WORLD_START_GI[wi] + li;
    const btn = _wdCreateEnterButton(wi, li, cfg);
    _wdWireEnterButtonClick(btn, gi);
    _wdWireEnterButtonDismiss(btn);

    const canvas = _wdGetCanvas();
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
    let tip = _wdGetTooltipEl();
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
 * (e.g. "⚗️ ASCENSION · ", "🌌 NEXUS POINT · " or "🌿 CONVERGENCE · ").
 * Returns empty string for standard nodes.
 */
function _wdGetTooltipTypeLabel(isLastInWorld, isConvergence, isNexusPoint) {
    if (isNexusPoint) return `${t('scr_nexus_point_badge')} · `;
    if (isLastInWorld) return `${t('scr_ascension_badge')} · `;
    if (isConvergence) return `${t('scr_convergence_badge')} · `;
    return '';
}

/**
 * Resolves the localised hint string for a level, if one is defined.
 */
function _wdGetLevelHint(wi, li) {
    const world = globalThis.WORLDS && globalThis.WORLDS[wi];
    const levelData = world && world.data[li];
    if (!levelData) return '';
    return (LANG === 'de' && levelData.hintDE) ? levelData.hintDE : (levelData.hint || '');
}

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
    // The temporary Professor beta flag is never shown on a level's tooltip.
    const active = Object.keys(hs.mods).filter(m => hs.mods[m] && m !== 'superTutor');
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
        return t('scr_gate_unsolved');
    }
    const hs = STATE && STATE.levelHS && STATE.levelHS[gi];
    if (isDone && hs) {
        return t('scr_level_done_best').replace('{n}', hs.score);
    }
    if (isLocked) {
        return t('scr_locked');
    }
    return t('scr_not_completed');
}

/**
 * Builds the bonus-objective row for the tooltip (icon + label, or the
 * "claimed" state). Returns empty string if the level has no bonus, or is
 * locked and the bonus hasn't already been claimed.
 */
function _wdBuildTooltipBonusHtml(gi, levelData, isLocked) {
    if (!levelData || levelData.bonusType === undefined) return '';

    const bIcon = WD_BONUS_ICONS[levelData.bonusType || 'nomiss'] || '🎯';
    const bonusLabel = (LANG === 'de' && levelData.bonusHintDE) ? levelData.bonusHintDE
        : (levelData.bonusHint || t('ls_complete_level'));

    if (STATE && STATE.bonusDone && STATE.bonusDone.includes(gi)) {
        return `<div class="wd-tip-bonus done">${bIcon} ${t('scr_bonus_claimed_tip')}</div>`;
    }
    if (!isLocked) {
        return `<div class="wd-tip-bonus">${bIcon} ${bonusLabel}</div>`;
    }
    return '';
}

/**
 * Builds the grid-size pill shown in the tooltip header (e.g. "9×9").
 * Returns empty string if the level is locked or has no grid/world size data.
 */
function _wdBuildTooltipGridHtml(levelData, world, isLocked) {
    if (!levelData || isLocked) return '';
    const gs = levelData.grid
        ? `${levelData.grid.length}×${levelData.grid[0].length}`
        : (world && world.size ? `${world.size}×${world.size}` : '');
    return gs ? `<span class="wd-tip-grid">${gs}</span>` : '';
}

/**
 * Populates and shows the enriched tooltip for a level node on mouseenter.
 */
function _wdShowTooltip(e, wi, li, isDone, isLocked, isLastInWorld, isConvergence, isMaxCleared, isNexusPoint) {
    const tip = _wdEnsureTooltip();
    const gi = globalThis.WORLD_START_GI[wi] + li;
    const hs = STATE && STATE.levelHS && STATE.levelHS[gi];
    const world = globalThis.WORLDS && globalThis.WORLDS[wi];
    const levelData = world && world.data[li];
    if (typeof isNexusPoint === 'undefined' && typeof globalThis.isNexusPointLevel === 'function') {
        isNexusPoint = globalThis.isNexusPointLevel(wi, li);
    }

    const typeLabel = _wdGetTooltipTypeLabel(isLastInWorld, isConvergence, isNexusPoint);
    const statusText = _wdGetTooltipStatusText(gi, isDone, isLocked);
    const hint = _wdGetLevelHint(wi, li);

    const stars = isDone ? _wdGetStars(gi) : '';
    const modTagsHtml = _wdBuildTooltipModTags(hs);
    const bonusHtml = _wdBuildTooltipBonusHtml(gi, levelData, isLocked);
    const gridSize = _wdBuildTooltipGridHtml(levelData, world, isLocked);

    // Max-cleared crown line
    const maxLine = isMaxCleared
        ? `<div class="wd-tip-max">👑 ${t('scr_max_cleared')}</div>`
        : '';

    // Syla - Nature's Aid note on forest levels
    const sylaLine = (globalThis._charIs('syla') && levelData && levelData.isForestLevel)
        ? `<div class="wd-tip-bonus syla">🌿 ${t('scr_syla_forest_tip')}</div>`
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
        ${sylaLine}
    `;
    tip.classList.add('show');
    _wdMoveTooltip(e);
}

/**
 * Repositions the tooltip to follow the mouse cursor.
 */
function _wdMoveTooltip(e) {
    const tip = _wdGetTooltipEl();
    if (!tip) return;
    const rect = tip.getBoundingClientRect();
    let x = e.clientX + 14;
    let y = e.clientY + 14;
    if (x + rect.width > window.innerWidth - 8) {
        x = Math.max(8, e.clientX - rect.width - 12);
    }
    if (y + rect.height > window.innerHeight - 8) {
        y = Math.max(8, window.innerHeight - rect.height - 8);
    }
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
}

/**
 * Hides the tooltip.
 */
function _wdHideTooltip() {
    const tip = _wdGetTooltipEl();
    if (tip) tip.classList.remove('show');
}


//------------------------------------------------------------------------
//-------------------DEV TOOLS---------------------------------------------
//------------------------------------------------------------------------


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
export function _wdSyncSpriteToLevel(gi) {
    for (let wi = 0; wi < globalThis.WORLDS.length; wi++) {
        const start = globalThis.WORLD_START_GI[wi];
        const world = globalThis.WORLDS[wi];
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
 * wi - 0-based world index.
 */
export function showWorldDetail(wi) {
    // Per-world level selection: same overworld music as the map view.
    if (typeof Audio_Manager !== 'undefined') Audio_Manager.playBGM('overworld');
    _wdCurrentWi = wi;

    _wdCurrentLevelIdx = (STATE && STATE.wdSpriteLevel && STATE.wdSpriteLevel[wi] !== undefined)
        ? STATE.wdSpriteLevel[wi]
        : null;
    _wdPendingRedirect = null;

    globalThis._ptReturnScreen = 'screen-world-detail';
    globalThis._ptReturnWorldIndex = wi;

    _wdBuildTopBar(wi);
    _wdBuildCanvas(wi);
    switchScreen('screen-world-detail');
}

/**
 * For the win screen: the story scene (companion meeting or home visit) that
 * hangs off the level `gi` the player just cleared, if the player's hero has
 * one they have not watched yet. Returns { wi, id } or null.
 */
export function getWinStoryTarget(gi) {
    for (let wi = 0; wi < WD_WORLD_CONFIGS.length; wi++) {
        const cfg = WD_WORLD_CONFIGS[wi];
        for (const cn of (cfg.companionNodes || [])) {
            if (globalThis.WORLD_START_GI[wi] + cn.from !== gi) continue;
            if (!globalThis.getCompanionPairing(cn.id) || globalThis.hasMetCompanion(cn.id)) continue;
            return { wi, id: cn.id };
        }
    }
    return null;
}

/**
 * Opens a world map and walks to the given story node, as if the player had
 * clicked it (used by the win screen's STORY button).
 */
export function wdOpenStoryNode(wi, id) {
    showWorldDetail(wi);
    setTimeout(() => {
        const node = document.querySelector('.wd-companion-node[data-companion-node="' + id + '"]');
        if (node) node.click();
    }, 700);
}
