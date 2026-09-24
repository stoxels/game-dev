import { t } from '../translation/translations.js';
import { EG_ART } from '../endgame/endgame-art.js';
import { _ptAllocated, _ptBuildAdjacency, _ptGetNodeVisualState, _ptIsDeallocatable, _ptLang, _ptOnNodeClick, _ptPoints, _ptRefreshPointsDisplay, ensurePassiveTreeRoot } from './probability-tree-state-points.js';
import { getPassiveTreeRootId, isPassiveTreeStartNode } from './probability-tree.js';
import { isPassiveTreeNodeReworked } from './probability-tree-rework.js';
import { _ptBindEvents, _ptFitToView } from './probability-tree-viewport.js';
import { PT_COL_ALLOCATED_BG, PT_COL_ALLOCATED_BORDER, PT_COL_ALLOCATED_DOT, PT_COL_LOCKED_BG, PT_COL_LOCKED_BORDER, PT_COL_LOCKED_DOT, PT_COL_START, PT_COL_UNLOCKED_BG, PT_COL_UNLOCKED_BORDER, PT_COL_UNLOCKED_DOT, PT_CONN_ALLOCATED, PT_CONN_UNLOCKED, PT_CONN_WIDTH, PT_NODE_RADIUS, PT_PADDING } from './probability-tree.js';
//------------------------------------------------------------------------
//----------------------------CONSTANTS & STATE----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// These are set during _ptRender() and shared across all UI/renderer functions.
// Never access these before _ptRender() has completed at least once.

export let _pt_container = null;  // #pt-canvas element - the outermost scrollable frame
export let _pt_world = null;  // the zoomable/pannable world <div> inside the container
export let _pt_svg = null;  // SVG overlay that holds all connection <line> elements
export let _pt_nodesLayer = null;  // <div> layer that holds all node <div> elements
export let _pt_tooltip = null;  // floating tooltip <div> that lives in document.body

// Element caches: populated by _ptDrawConnections / _ptDrawNodes,
// used by style helpers and search to avoid repeated DOM queries.
export let _pt_nodeEls = {};   // skill id  →  node <div>
export let _pt_connEls = {};   // conn id   →  SVG <line>

const PT_NODE_POOL_LIMIT = 256;
const PT_CONN_POOL_LIMIT = 512;
const PT_VIRTUAL_OVERSCAN_PX = 320;
const PT_OVERVIEW_SCALE = 0.35;
const PT_STYLE_PROPS_LOCKED = Object.freeze({
    bg: PT_COL_LOCKED_BG,
    border: `2px solid ${PT_COL_LOCKED_BORDER}`,
    shadow: 'none',
    dotColor: PT_COL_LOCKED_DOT,
    cursor: 'not-allowed',
});
let _pt_boundsSkills = null;
let _pt_boundsCache = null;
let _pt_sceneSkills = null;
let _pt_sceneConnections = null;
let _pt_renderLayout = null;
let _pt_connectionById = new Map();
let _pt_connectionMeta = [];
let _pt_nodePool = [];
let _pt_connPool = [];
let _pt_nodeEventsBound = false;
let _pt_hoveredNodeId = null;
let _pt_searchQuery = '';
let _pt_pendingSearchQuery = '';
let _pt_searchMatches = new Set();
let _pt_searchFrame = 0;
let _pt_tooltipNodeId = null;
let _pt_tooltipHtml = '';
let _pt_tooltipWidth = 0;
let _pt_tooltipHeight = 0;
const PT_TEMP_REWORK_NODE_COPY = true;

// NOTE: _pt_mouseDownTime is also part of this module's
// state but is declared in the canvas pan/zoom handler file, not here.




//------------------------------------------------------------------------
//-------------------------LOCALIZATION HELPER-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Picks between an English and German string based on the current language
// code. Centralises the `lang === 'de' ? de : en` pattern used all over
// the tooltip, search bar, and empty-state copy.
export function _ptPickLang(lang, en, de) {
    return lang === 'de' ? de : en;
}




//------------------------------------------------------------------------
//----------------------KEYSTONE DETECTION HELPER------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true when a skill definition qualifies as a keystone node.
// Keystones use a diamond shape and a different colour palette.
// A node is a keystone when its statKey starts with 'keystone_', or when
// either localised name starts with the expected prefix string.
export function _ptIsKeystoneNode(def) {
    if (!def) return false;
    return (
        (def.statKey && def.statKey.startsWith('keystone_')) ||
        (def.nameEn && def.nameEn.startsWith('Keystone:')) ||
        (def.nameDe && def.nameDe.startsWith('Schlüsselfertigkeit:'))
    );
}



//------------------------------------------------------------------------
//----------------------NODE TIER CLASSIFICATION-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// The visual/importance tiers used by the development layout.
export const PT_TIER_START = 'start';
export const PT_TIER_TRAVEL = 'travel';
export const PT_TIER_NOTABLE = 'notable';
export const PT_TIER_KEYSTONE = 'keystone';
export const PT_TIER_SMALL = 'small';

export function _ptGetNodeTier(def) {
    if (def && def.tier) return def.tier;
    if (_ptIsKeystoneNode(def)) return PT_TIER_KEYSTONE;
    if (def && def.statKey && def.statKey.startsWith('travel_')) return PT_TIER_TRAVEL;
    return PT_TIER_NOTABLE;
}




//------------------------------------------------------------------------
//---------------------NODE STYLE HELPERS---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Each helper below returns a plain style object for one specific node
// category (allocated / unlockable / locked).  _ptResolveNodeStyleProps()
// picks the right helper and merges the result with any start-node overrides.
// _ptApplyNodeStyle() is the only function that actually touches the DOM.

// --- allocated ---
export function _ptStylePropsAllocated(tier) {
    if (tier === PT_TIER_START) {
        return {
            bg: 'radial-gradient(circle at 50% 35%, #2d2306 0%, #171004 60%, #0d0900 100%)',
            border: '3px solid #ffd700',
            shadow: '0 0 14px rgba(255,215,0,0.55), inset 0 0 0 2px rgba(255,215,0,0.25)',
            dotColor: '#ffd700',
            cursor: 'default',
        };
    }
    if (tier === PT_TIER_KEYSTONE) {
        return {
            bg: 'radial-gradient(circle at 50% 35%, #2a1804 0%, #140a00 60%, #0d0600 100%)',
            border: '3px solid #e8a020',
            shadow: '0 0 16px rgba(232,160,32,0.8), 0 0 4px rgba(232,160,32,0.5), '
                  + 'inset 0 0 0 2px rgba(232,160,32,0.35), inset 0 0 8px rgba(0,0,0,0.6)',
            dotColor: '#e8a020',
            cursor: 'pointer',
        };
    }
    // Notable: the standard allocated look plus a subtle inner ring
    if (tier === PT_TIER_NOTABLE) {
        return {
            bg: PT_COL_ALLOCATED_BG,
            border: `2px solid ${PT_COL_ALLOCATED_BORDER}`,
            shadow: '0 0 12px rgba(109,191,64,0.6), inset 0 0 0 1px rgba(109,191,64,0.35), inset 0 0 4px rgba(0,0,0,0.3)',
            dotColor: PT_COL_ALLOCATED_DOT,
            cursor: 'pointer',
        };
    }
    if (tier === PT_TIER_TRAVEL) {
        return {
            bg: '#16220e',
            border: `2px solid ${PT_COL_ALLOCATED_BORDER}`,
            shadow: '0 0 6px rgba(109,191,64,0.4)',
            dotColor: PT_COL_ALLOCATED_DOT,
            cursor: 'pointer',
        };
    }
    if (tier === PT_TIER_SMALL) {
        return {
            bg: '#16220e',
            border: '2px solid #4f7a38',
            shadow: 'none',
            dotColor: '#4f7a38',
            cursor: 'pointer',
        };
    }
    return {
        bg: PT_COL_ALLOCATED_BG,
        border: `2px solid ${PT_COL_ALLOCATED_BORDER}`,
        shadow: '0 0 12px rgba(109,191,64,0.6), inset 0 0 0 1px rgba(109,191,64,0.35), inset 0 0 4px rgba(0,0,0,0.3)',
        dotColor: PT_COL_ALLOCATED_DOT,
        cursor: 'pointer',
    };
}

// --- unlockable (reachable but not yet taken) ---
export function _ptStylePropsUnlockable(isStart, tier) {
    // The start node gets a special golden border even in unlockable state
    if (isStart) {
        return {
            bg: PT_COL_UNLOCKED_BG,
            border: `3px solid ${PT_COL_START}`,
            shadow: '0 0 12px rgba(255,215,0,0.6), inset 0 0 6px rgba(255,215,0,0.15)',
            dotColor: PT_COL_START,
            cursor: 'pointer',
        };
    }
    // Keystone: dark ember gem with warm amber frame
    if (tier === PT_TIER_KEYSTONE) {
        return {
            bg: 'radial-gradient(circle at 50% 35%, #201203 0%, #0f0700 60%, #0a0400 100%)',
            border: '3px solid #c07818',
            shadow: '0 0 10px rgba(192,120,24,0.5), inset 0 0 0 2px rgba(192,120,24,0.3), inset 0 0 8px rgba(0,0,0,0.6)',
            dotColor: '#c07818',
            cursor: 'pointer',
        };
    }
    // Notable: golden frame with a faint inner ring - richer than travel
    if (tier === PT_TIER_NOTABLE) {
        return {
            bg: PT_COL_UNLOCKED_BG,
            border: `2px solid ${PT_COL_UNLOCKED_BORDER}`,
            shadow: '0 0 7px rgba(184,154,80,0.4), inset 0 0 0 1px rgba(184,154,80,0.3), inset 0 0 4px rgba(0,0,0,0.4)',
            dotColor: PT_COL_UNLOCKED_DOT,
            cursor: 'pointer',
        };
    }
    // Travel: small and muted
    return {
        bg: '#151522',
        border: '2px solid #7a6a42',
        shadow: 'none',
        dotColor: '#7a6a42',
        cursor: 'pointer',
    };
}

// --- locked (not reachable) ---
export function _ptStylePropsLocked() {
    return PT_STYLE_PROPS_LOCKED;
}

// Picks the correct style props for the given node id based on its current
// visual state (allocated / unlockable / locked) and its tier
// (travel / notable / keystone).
export function _ptResolveNodeStyleProps(id, state = _ptGetNodeVisualState(id)) {
    const isStart = isPassiveTreeStartNode(id);
    const isSelectedStart = id === getPassiveTreeRootId();
    const skill = globalThis._pt_skillMap[id];
    const def = skill ? skill._def : null;
    const tier = _ptGetNodeTier(def);

    switch (state) {
        case 'allocated': return isSelectedStart
            ? _ptStylePropsAllocated(PT_TIER_START)
            : _ptStylePropsAllocated(tier);
        case 'unlockable': return _ptStylePropsUnlockable(isStart, tier);
        default: return _ptStylePropsLocked();       // 'locked'
    }
}

// Applies pre-resolved style props to the node's DOM element.
// Also sets opacity: locked nodes are dimmed to 0.45.
export function _ptApplyNodeStyle(id) {
    const el = _pt_nodeEls[id];
    if (!el) return;

    const state = _ptGetNodeVisualState(id);
    const props = _ptResolveNodeStyleProps(id, state);
    const rootId = getPassiveTreeRootId();
    el.classList.toggle('pt-node-selected-character-start', id === rootId);

    el.style.background = props.bg;
    el.style.border = props.border;
    el.style.boxShadow = props.shadow;
    el.style.cursor = props.cursor;
    el.style.opacity = state === 'locked' ? '0.45' : '1';

    const skill = globalThis._pt_skillMap[id];
    const dot = skill && skill._iconEl && skill._iconEl.classList.contains('pt-dot') ? skill._iconEl : null;
    if (dot) dot.style.background = props.dotColor;

    if (!_pt_searchQuery) {
        _ptClearSearchNodeStyle(el);
    } else if (_pt_searchMatches.has(id)) {
        _ptApplySearchMatchStyle(el);
    } else {
        _ptApplySearchNoMatchStyle(el);
    }
}




//------------------------------------------------------------------------
//---------------------CONNECTION STYLE HELPERS---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Resolves the stroke colour for a single connection line.
// Both-allocated connections get the bright allocated colour;
// everything else (one side active, neither active) uses the dimmer unlocked colour.
export function _ptResolveConnColor(fromId, toId) {
    const alloc = _ptAllocated();
    if (alloc.has(fromId) && alloc.has(toId)) return PT_CONN_ALLOCATED;
    return PT_CONN_UNLOCKED;
}

// Writes the resolved stroke colour onto the SVG <line> element.
export function _ptApplyConnStyle(connId, fromId, toId) {
    const line = _pt_connEls[connId];
    if (!line) return;
    line.setAttribute('stroke', _ptResolveConnColor(fromId, toId));
}

// Refreshes every node and connection to reflect the current allocation state.
// Call this after any allocation change (node click, undo, reset, etc.).
export function _ptRefreshAllStyles(affectedIds) {
    if (affectedIds) {
        affectedIds.forEach(id => _ptApplyNodeStyle(id));
        globalThis._pt_conns.forEach(connection => {
            if (affectedIds.has(connection.from) || affectedIds.has(connection.to)) {
                _ptApplyConnStyle(connection.id, connection.from, connection.to);
            }
        });
    } else {
        Object.keys(_pt_nodeEls).forEach(id => _ptApplyNodeStyle(Number(id)));
        Object.keys(_pt_connEls).forEach(id => {
            const connection = _pt_connectionById.get(id);
            if (connection) _ptApplyConnStyle(connection.id, connection.from, connection.to);
        });
    }
    _ptRefreshPointsDisplay();
}




//------------------------------------------------------------------------
//------------------------NODE TOOLTIP HELPERS----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the localised display name for a node.
export function _ptTooltipResolveName(skill, def, lang) {
    if (def) return _ptPickLang(lang, def.nameEn, def.nameDe || def.nameEn);
    return skill ? skill.name : t('pt_skill_fallback').replace('{n}', skill?.id);
}

// Builds the localised description string (newlines → <br>).
export function _ptTooltipResolveDesc(def, lang) {
    if (!def) return '';
    const raw = _ptPickLang(lang, def.descEn, def.descDe || def.descEn);
    return raw ? raw.replace(/\n/g, '<br>') : '';
}

// Builds the small status line shown at the bottom of the tooltip.
// Colour and wording vary by state and whether the node can still be removed.
export function _ptTooltipBuildStatusHtml(id, state, lang) {
    if (state === 'allocated') {
        const canRemove = _ptIsDeallocatable(id);
        const color = canRemove ? '#6dbf40' : '#888';
        const text = canRemove
            ? t('pt_tooltip_active_removable')
            : t('pt_tooltip_active_not_removable');
        return `<div style="margin-top:7px;font-size:11px;color:${color};">${text}</div>`;
    }

    if (state === 'unlockable') {
        const noPoints = _ptPoints() < 1;
        const color = noPoints ? '#c08030' : '#b89a50';
        const text = noPoints
            ? t('pt_tooltip_no_points')
            : t('pt_tooltip_click_unlock');
        return `<div style="margin-top:7px;font-size:11px;color:${color};">${text}</div>`;
    }

    // locked
    const lockedText = t('pt_tooltip_locked');
    return `<div style="margin-top:7px;font-size:11px;color:#555;">${lockedText}</div>`;
}

// Assembles the full tooltip inner HTML from name, description, and status.
export function _ptTooltipBuildHtml(id) {
    const skill = globalThis._pt_skillMap[id];
    const def = skill ? skill._def : null;
    const lang = _ptLang();
    const state = _ptGetNodeVisualState(id);

    const name = _ptTooltipResolveName(skill, def, lang);
    const desc = _ptTooltipResolveDesc(def, lang);
    const statusHtml = _ptTooltipBuildStatusHtml(id, state, lang);
    const reworkHtml = isPassiveTreeNodeReworked(id)
        ? ''
        : `<div style="margin-top:6px;font-size:10px;letter-spacing:1px;color:#ff5d7e;">${lang === 'de' ? 'NICHT VOLLSTÄNDIG ÜBERARBEITET' : 'NOT FULLY REWORKED'}</div>`;

    // Tier caption above the name - keystones and notables introduce
    // themselves, plain travel markers stay uncaptioned.
    const tier = _ptGetNodeTier(def);
    let typeHtml = '';
    if (tier === PT_TIER_START) {
        typeHtml = `<div style="font-size:10px;letter-spacing:1.5px;color:#ffd700;margin-bottom:3px;">${lang === 'de' ? 'KLASSENSTART' : 'CLASS START'}</div>`;
    } else if (tier === PT_TIER_KEYSTONE) {
        typeHtml = `<div style="font-size:10px;letter-spacing:1.5px;color:#e8a020;margin-bottom:3px;">${t('pt_node_keystone')}</div>`;
    } else if (tier === PT_TIER_SMALL) {
        typeHtml = `<div style="font-size:10px;letter-spacing:1.5px;color:#5a7a48;margin-bottom:3px;">${lang === 'de' ? 'KLEINER PASSIV' : 'SMALL PASSIVE'}</div>`;
    } else if (tier === PT_TIER_NOTABLE) {
        typeHtml = `<div style="font-size:10px;letter-spacing:1.5px;color:#93a7bd;margin-bottom:3px;">${t('pt_node_notable')}</div>`;
    }

    return `
        ${typeHtml}
        <div style="font-size:13px;font-weight:bold;color:#66fcf1;margin-bottom:5px;">${name}</div>
        ${desc ? `<div style="color:#bba870;">${desc}</div>` : ''}
        <div style="margin-top:6px;font-size:10px;letter-spacing:0.5px;color:#7d8da1;">ID ${id}${def && def.statKey ? ' · ' + def.statKey : ''}</div>
        ${reworkHtml}
        ${statusHtml}
    `;
}




//------------------------------------------------------------------------
//----------------------------NODE TOOLTIP--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Creates the singleton tooltip element and appends it to document.body.
// The tooltip starts invisible (opacity:0) and is shown by _ptShowTooltip().
export function _ptCreateTooltip() {
    const tt = document.createElement('div');
    tt.id = 'pt-tooltip';
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

// Clamps the tooltip position so it never overflows the viewport edges.
export function _ptPositionTooltip(mx, my) {
    if (!_pt_tooltip) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const tw = _pt_tooltipWidth || _pt_tooltip.offsetWidth || 260;
    const th = _pt_tooltipHeight || _pt_tooltip.offsetHeight || 100;
    const PAD = 14;

    let x = mx + PAD;
    let y = my - th / 2;

    // Flip to the left of the cursor if it would overflow the right edge
    if (x + tw > W - PAD) x = mx - tw - PAD;
    // Clamp vertically so it never goes off-screen top or bottom
    if (y < PAD) y = PAD;
    if (y + th > H - PAD) y = H - th - PAD;

    _pt_tooltip.style.left = `${x}px`;
    _pt_tooltip.style.top = `${y}px`;
}

// Populates the tooltip with content for the given node and makes it visible.
export function _ptShowTooltip(id, mouseX, mouseY) {
    if (!_pt_tooltip) _pt_tooltip = _ptCreateTooltip();

    const html = _ptTooltipBuildHtml(id);
    if (_pt_tooltipNodeId !== id || _pt_tooltipHtml !== html) {
        _pt_tooltip.innerHTML = html;
        _pt_tooltipNodeId = id;
        _pt_tooltipHtml = html;
        _pt_tooltipWidth = _pt_tooltip.offsetWidth || 260;
        _pt_tooltipHeight = _pt_tooltip.offsetHeight || 100;
    }
    _ptPositionTooltip(mouseX, mouseY);
    _pt_tooltip.style.opacity = '1';
}

// Fades the tooltip out (does not remove it from the DOM).
export function _ptHideTooltip() {
    _pt_hoveredNodeId = null;
    if (_pt_tooltip) _pt_tooltip.style.opacity = '0';
}




//------------------------------------------------------------------------
//-------------------BOUNDING BOX & LAYOUT HELPERS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the axis-aligned bounding box of all skill node positions.
// Used to size the world <div> and to compute the initial fit-to-view transform.
// Falls back to a sensible default when the tree has no nodes.
export function _ptGetBounds() {
    if (!globalThis._pt_skills.length) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    if (_pt_boundsSkills === globalThis._pt_skills && _pt_boundsCache) return _pt_boundsCache;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    globalThis._pt_skills.forEach(s => {
        if (s.x < minX) minX = s.x;
        if (s.y < minY) minY = s.y;
        if (s.x > maxX) maxX = s.x;
        if (s.y > maxY) maxY = s.y;
    });

    _pt_boundsSkills = globalThis._pt_skills;
    _pt_boundsCache = { minX, minY, maxX, maxY };
    return _pt_boundsCache;
}

// Converts skill-space bounds into the pixel offset needed to translate
// node/connection coordinates into the padded world <div>. Shared by
// _ptDrawConnections and _ptDrawNodes so both always agree on placement.
export function _ptComputeOffsets(bounds) {
    return {
        offsetX: PT_PADDING + PT_NODE_RADIUS - bounds.minX,
        offsetY: PT_PADDING + PT_NODE_RADIUS - bounds.minY,
    };
}




//------------------------------------------------------------------------
//------------------------DRAW CONNECTIONS--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Creates one SVG <line> element for a single connection and registers it
// in _pt_connEls so style helpers can update it later.
export function _ptDrawConnection(conn, offsetX, offsetY) {
    const from = globalThis._pt_skillMap[conn.from];
    const to = globalThis._pt_skillMap[conn.to];
    if (!from || !to) return;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', from.x + offsetX);
    line.setAttribute('y1', from.y + offsetY);
    line.setAttribute('x2', to.x + offsetX);
    line.setAttribute('y2', to.y + offsetY);
    line.setAttribute('stroke-width', PT_CONN_WIDTH);
    line.setAttribute('stroke-linecap', 'round');

    // Dotted lines visually indicate optional or special connections
    if (conn.dotted) line.setAttribute('stroke-dasharray', '5,5');

    _pt_svg.appendChild(line);
    _pt_connEls[conn.id] = line;
}

// Iterates over all connections and draws each one.
export function _ptDrawConnections(bounds) {
    const { offsetX, offsetY } = _ptComputeOffsets(bounds);
    globalThis._pt_conns.forEach(conn => _ptDrawConnection(conn, offsetX, offsetY));
}

function _ptAcquireConnectionElement() {
    const line = _pt_connPool.pop() || document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.removeAttribute('x1');
    line.removeAttribute('y1');
    line.removeAttribute('x2');
    line.removeAttribute('y2');
    line.removeAttribute('stroke-width');
    line.removeAttribute('stroke-linecap');
    line.removeAttribute('stroke-dasharray');
    line.removeAttribute('stroke');
    line.style.opacity = '';
    return line;
}

function _ptMountConnection(meta, target) {
    if (_pt_connEls[meta.connection.id]) return;
    const line = _ptAcquireConnectionElement();
    line.setAttribute('x1', meta.x1);
    line.setAttribute('y1', meta.y1);
    line.setAttribute('x2', meta.x2);
    line.setAttribute('y2', meta.y2);
    line.setAttribute('stroke-width', PT_CONN_WIDTH);
    line.setAttribute('stroke-linecap', 'round');
    if (meta.connection.dotted) line.setAttribute('stroke-dasharray', '5,5');
    line.style.opacity = _pt_searchQuery ? '0.15' : '';
    target.appendChild(line);
    _pt_connEls[meta.connection.id] = line;
    _ptApplyConnStyle(meta.connection.id, meta.connection.from, meta.connection.to);
}

function _ptUnmountConnection(id) {
    const line = _pt_connEls[id];
    if (!line) return;
    line.remove();
    delete _pt_connEls[id];
    if (_pt_connPool.length < PT_CONN_POOL_LIMIT) _pt_connPool.push(line);
}




//------------------------------------------------------------------------
//------------------DRAW NODES - SHAPE HELPERS----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies the base CSS layout for a regular (circular) node.
export function _ptApplyCircleShape(node, cx, cy, r) {
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

// Applies the base CSS layout for a keystone (diamond) node.
// The diamond is achieved by rotating a square 45 degrees.
// A slightly smaller side length keeps the diamond inside the same footprint
// as a regular node at the same radius.
export function _ptApplyDiamondShape(node, cx, cy, r) {
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




//------------------------------------------------------------------------
//------------------DRAW NODES - ICON HELPERS-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Counter-rotates the first child element of a keystone diamond node so that
// the icon or emoji appears upright despite the 45-degree parent rotation.
export function _ptCounterRotateKeystoneChild(node) {
    const inner = node.firstChild;
    if (inner) inner.style.transform = 'rotate(-45deg)';
}

// Creates and appends an <img> icon element inside the node.
// `smooth` disables the pixelated upscaling used for pixel-art portraits -
// detailed item art (images/passives/, images/keystones/) renders smooth.
export function _ptAppendImageIcon(node, iconSrc, isKeystone, smooth) {
    const img = document.createElement('img');
    img.src = iconSrc;
    img.alt = '';
    img.draggable = false;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.style.cssText = `
        width: 60%; height: 60%;
        object-fit: contain;
        image-rendering: ${smooth ? 'auto' : 'pixelated'};
        opacity: 0.85;
        pointer-events: none;
    `;
    node.appendChild(img);
    if (isKeystone) _ptCounterRotateKeystoneChild(node);
}

// Creates and appends an emoji <span> icon inside the node.
// `scale` scales the emoji with the node's tier size (1 = regular node).
export function _ptAppendEmojiIcon(node, emoji, isKeystone, scale) {
    const span = document.createElement('span');
    span.textContent = emoji;
    span.style.cssText = `
        font-size: ${PT_NODE_RADIUS * 0.95 * (scale || 1)}px;
        line-height: 1;
        pointer-events: none;
        user-select: none;
    `;
    node.appendChild(span);
    if (isKeystone) _ptCounterRotateKeystoneChild(node);
}

// Creates and appends the small coloured dot used as a fallback when a node
// has no icon and no emoji assigned.
export function _ptAppendDotFallback(node, isKeystone) {
    const dot = document.createElement('div');
    dot.className = 'pt-dot';
    dot.style.cssText = `
        width: 6px; height: 6px;
        border-radius: 50%;
        opacity: 0.7;
        pointer-events: none;
    `;
    node.appendChild(dot);
    if (isKeystone) _ptCounterRotateKeystoneChild(node);
}

// Resolves which icon string to use for a skill, preferring the definition
// data over the layout data, then delegates to the right append helper.
// Item art (images/items/, keyed by node statKey) wins over emoji when
// present; everything else behaves exactly as before.
// The placeholder image 'axe-hammer-grey' is treated the same as no icon.
// `scale` scales emoji icons with the node's tier size.
export function _ptAppendNodeIcon(node, skill, def, isKeystone, scale) {
    if (isPassiveTreeStartNode(skill.id)) {
        const img = document.createElement('img');
        img.src = 'images/passives/class_start.webp';
        img.alt = '';
        img.className = 'pt-class-start-art';
        img.draggable = false;
        img.decoding = 'async';
        node.appendChild(img);
        return;
    }
    const artKey = (def && def.statKey) || (skill && skill.statKey) || null;
    const legacyArtKey = artKey && artKey.startsWith('travel_') ? artKey.slice(7) : null;
    const artUrl = artKey ? (EG_ART.url('item', artKey) || (legacyArtKey && EG_ART.url('item', legacyArtKey))) : null;
    if (artUrl) {
        _ptAppendImageIcon(node, artUrl, isKeystone, true);
        return;
    }
    // Art not available (yet) - remember the key so the late-arrival refresh
    // below can swap the fallback without redrawing the whole tree.
    if (artKey) node.dataset.ptArtPending = artKey;
    const icon = (def && def.icon) ? def.icon : skill.image;
    const isImageUrl = icon && (icon.startsWith('/') || icon.startsWith('http'));
    const isRealImg = isImageUrl && !icon.includes('axe-hammer-grey');
    const isEmoji = icon && !isImageUrl && !icon.includes('axe-hammer-grey');

    if (isRealImg) {
        _ptAppendImageIcon(node, icon, isKeystone);
    } else if (isEmoji) {
        _ptAppendEmojiIcon(node, icon, isKeystone, scale);
    } else {
        _ptAppendDotFallback(node, isKeystone);
    }
}

export function _ptAppendStartSprite(skill, def, cx, cy, r, target = _pt_nodesLayer) {
    const src = (def && def.sprite) || skill.sprite;
    if (!src) return;
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.className = 'pt-start-sprite';
    img.draggable = false;
    const size = Math.round(r * 2 * 4.5);
    let x = cx;
    let y = cy;
    const distance = Math.hypot(skill.x, skill.y);
    if (distance > 1) {
        const push = r * 4.5;
        x += (skill.x / distance) * push;
        y += (skill.y / distance) * push;
    }
    img.style.width = size + 'px';
    img.style.height = size + 'px';
    img.style.left = Math.round(x - size / 2) + 'px';
    img.style.top = Math.round(y - size / 2) + 'px';
    target.appendChild(img);
    return img;
}

// Swaps emoji fallbacks for item art that arrived after the tree was drawn
// (images/items/manifest.json is fetched lazily on first use). Node elements
// contain exactly one child (the icon), so replacing it is safe - shape,
// styles and events live on the node element itself.
export function _ptRefreshPendingArt() {
    if (typeof document === 'undefined' || !_pt_nodesLayer || !_pt_nodesLayer.isConnected) return;
    const pending = _pt_nodesLayer.querySelectorAll('[data-pt-art-pending]');
    pending.forEach(function (el) {
        if (!el.isConnected) return;
        const key = el.getAttribute('data-pt-art-pending');
        const legacyKey = key && key.startsWith('travel_') ? key.slice(7) : null;
        const u = key ? (EG_ART.url('item', key) || (legacyKey && EG_ART.url('item', legacyKey))) : null;
        if (!u) return;
        el.removeAttribute('data-pt-art-pending');
        while (el.firstChild) el.removeChild(el.firstChild);
        _ptAppendImageIcon(el, u, el.classList.contains('pt-node-keystone'), true);
    });
}

if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('eg-art-loaded', function () {
        try { _ptRefreshPendingArt(); } catch (e) { /* tree not open - safe to ignore */ }
    });
}




function _ptBuildReworkNodeTemplate(id) {
    const skill = globalThis._pt_skillMap[id];
    const def = skill ? skill._def : null;
    if (!def) return '';

    const lang = _ptLang();
    const name = _ptTooltipResolveName(skill, def, lang);
    const stats = _ptPickLang(lang, def.descEn, def.descDe || def.descEn) || 'No current stats.';
    const connectionCount = Array.isArray(globalThis._pt_conns)
        ? globalThis._pt_conns.filter(connection => connection.from === id || connection.to === id).length
        : 0;
    const lines = [
        `Node ID: ${id}`,
        `Node name: ${name}`,
    ];
    if (def.tier) lines.push(`Tier: ${def.tier}`);
    if (def.statKey) lines.push(`Stat key: ${def.statKey}`);
    lines.push(`Connections: ${connectionCount || 'none (add one in the Passive Tree Editor)'}`);
    lines.push('Current stats:', stats, '', 'This node shall receive the following changes:');
    return lines.join('\n');
}

function _ptCopyReworkTextFallback(text) {
    if (typeof document.execCommand !== 'function') return false;
    const previousFocus = document.activeElement;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    try {
        return document.execCommand('copy');
    } catch {
        return false;
    } finally {
        textarea.remove();
        if (previousFocus && typeof previousFocus.focus === 'function') {
            try { previousFocus.focus({ preventScroll: true }); } catch { previousFocus.focus(); }
        }
    }
}

function _ptCopyReworkText(text) {
    const protocol = typeof location !== 'undefined' ? location.protocol : '';
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null;
    if (protocol !== 'file:' && clipboard && typeof clipboard.writeText === 'function') {
        try {
            return Promise.resolve(clipboard.writeText(text))
                .then(() => true)
                .catch(() => _ptCopyReworkTextFallback(text));
        } catch {
            return Promise.resolve(_ptCopyReworkTextFallback(text));
        }
    }
    return Promise.resolve(_ptCopyReworkTextFallback(text));
}

//------------------------------------------------------------------------
//------------------DRAW NODES - EVENT HELPERS----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Attaches all mouse interaction handlers to a node element.
// Separated from the build loop so the logic is easy to read in isolation.
export function _ptBindNodeEvents() {
    if (_pt_nodeEventsBound || !_pt_container) return;
    _pt_nodeEventsBound = true;

    _pt_container.addEventListener('mouseover', event => {
        const node = event.target.closest('.pt-node');
        if (!node || (event.relatedTarget && node.contains(event.relatedTarget))) return;
        const id = Number(node.dataset.id);
        if (_pt_hoveredNodeId !== null && _pt_hoveredNodeId !== id) {
            const previous = _pt_nodeEls[_pt_hoveredNodeId];
            if (previous) {
                previous.style.transform = previous.classList.contains('pt-node-keystone') ? 'rotate(45deg)' : 'scale(1)';
                previous.style.zIndex = '2';
            }
        }
        _pt_hoveredNodeId = id;
        if (_ptGetNodeVisualState(id) !== 'locked') {
            node.style.transform = node.classList.contains('pt-node-keystone') ? 'rotate(45deg) scale(1.15)' : 'scale(1.15)';
            node.style.zIndex = '10';
        }
        _ptShowTooltip(id, event.clientX, event.clientY);
    });

    _pt_container.addEventListener('mousemove', event => {
        if (event.target.closest('.pt-node')) _ptPositionTooltip(event.clientX, event.clientY);
    });

    _pt_container.addEventListener('mouseout', event => {
        const node = event.target.closest('.pt-node');
        if (!node || (event.relatedTarget && node.contains(event.relatedTarget))) return;
        node.style.transform = node.classList.contains('pt-node-keystone') ? 'rotate(45deg)' : 'scale(1)';
        node.style.zIndex = '2';
        _ptHideTooltip();
    });

    _pt_container.addEventListener('mousedown', event => {
        if (event.target.closest('.pt-node')) globalThis._pt_mouseDownTime = Date.now();
    });

    _pt_container.addEventListener('contextmenu', event => {
        if (!PT_TEMP_REWORK_NODE_COPY) return;
        const node = event.target.closest('.pt-node');
        if (!node) return;
        event.preventDefault();
        event.stopPropagation();
        const text = _ptBuildReworkNodeTemplate(Number(node.dataset.id));
        if (!text) return;
        void _ptCopyReworkText(text).then(copied => {
            if (typeof globalThis.showToast !== 'function') return;
            globalThis.showToast(copied ? 'Node rework template copied.' : 'Could not copy node rework template.');
        });
    });

    _pt_container.addEventListener('click', event => {
        const node = event.target.closest('.pt-node');
        if (!node) {
            _ptHideTooltip();
            return;
        }
        if (event.button !== 0) return;
        event.stopPropagation();
        if (Date.now() - globalThis._pt_mouseDownTime > 300) return;
        const id = Number(node.dataset.id);
        _ptOnNodeClick(id);
        _ptShowTooltip(id, event.clientX, event.clientY);
    });
}




//------------------------------------------------------------------------
//----------------------------DRAW NODES----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds and appends a single node <div> for the given skill.
// Shape, icon, and events are handled by the helpers above.
// Node size follows the three-tier hierarchy (Path of Exile style):
//   keystone  1.5x - ornate amber gems, build-defining choices
//   notable   1.12x - the regular mechanical pickups
//   travel    0.8x - small connectors (statKey prefix 'travel_')
// The start node keeps its dedicated 2.8x size.
function _ptGetNodeRadius(skill) {
    const def = skill._def || null;
    const tier = _ptGetNodeTier(def);
    if (isPassiveTreeStartNode(skill.id)) return PT_NODE_RADIUS * 2.8;
    if (tier === PT_TIER_KEYSTONE) return PT_NODE_RADIUS * 1.5;
    if (tier === PT_TIER_NOTABLE) return PT_NODE_RADIUS * 1.3;
    if (tier === PT_TIER_TRAVEL) return PT_NODE_RADIUS * 0.8;
    if (tier === PT_TIER_SMALL) return PT_NODE_RADIUS * 0.75;
    return PT_NODE_RADIUS * 1.12;
}

function _ptResetNodeElement(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    node.className = '';
    node.removeAttribute('style');
    delete node.dataset.id;
    delete node.dataset.ptRework;
    delete node.dataset.ptArtPending;
}

function _ptAcquireNodeElement() {
    const node = _pt_nodePool.pop() || document.createElement('div');
    _ptResetNodeElement(node);
    return node;
}

function _ptMountNode(skill, target) {
    if (_pt_nodeEls[skill.id]) return _pt_nodeEls[skill.id];
    const cx = skill._worldX;
    const cy = skill._worldY;
    const isStart = isPassiveTreeStartNode(skill.id);
    const def = skill._def || null;
    const tier = _ptGetNodeTier(def);
    const isKeystone = tier === PT_TIER_KEYSTONE;
    const isReworked = isPassiveTreeNodeReworked(skill.id);
    const r = skill._renderRadius || _ptGetNodeRadius(skill);
    const node = _ptAcquireNodeElement();

    node.className = isKeystone ? 'pt-node pt-node-keystone'
        : isStart ? 'pt-node pt-node-start'
        : tier === PT_TIER_TRAVEL ? 'pt-node pt-node-travel'
        : tier === PT_TIER_SMALL ? 'pt-node pt-node-small'
        : 'pt-node';
    if (skill.id === getPassiveTreeRootId()) node.classList.add('pt-node-selected-character-start');
    if (!isReworked) node.classList.add('pt-node-unreworked');
    node.dataset.id = skill.id;
    node.dataset.ptRework = isReworked ? 'reworked' : 'unreworked';

    if (isKeystone) _ptApplyDiamondShape(node, cx, cy, r);
    else _ptApplyCircleShape(node, cx, cy, r);

    skill._spriteEl = _ptAppendStartSprite(skill, def, cx, cy, r, target) || null;
    _ptAppendNodeIcon(node, skill, def, isKeystone, r / PT_NODE_RADIUS);
    skill._iconEl = node.firstElementChild;
    target.appendChild(node);
    _pt_nodeEls[skill.id] = node;
    _ptApplyNodeStyle(skill.id);
    return node;
}

function _ptUnmountNode(id) {
    const node = _pt_nodeEls[id];
    if (!node) return;
    const skill = globalThis._pt_skillMap[id];
    if (_pt_hoveredNodeId === id) _ptHideTooltip();
    if (skill && skill._spriteEl) {
        skill._spriteEl.remove();
        skill._spriteEl = null;
    }
    if (skill) skill._iconEl = null;
    node.remove();
    delete _pt_nodeEls[id];
    if (_pt_nodePool.length < PT_NODE_POOL_LIMIT) _pt_nodePool.push(node);
}

export function _ptDrawNode(skill, offsetX, offsetY) {
    skill._worldX = skill.x + offsetX;
    skill._worldY = skill.y + offsetY;
    skill._renderRadius = _ptGetNodeRadius(skill);
    _ptMountNode(skill, _pt_nodesLayer);
}

export function _ptDrawNodes(bounds) {
    const { offsetX, offsetY } = _ptComputeOffsets(bounds);
    globalThis._pt_skills.forEach(skill => _ptDrawNode(skill, offsetX, offsetY));
}




//------------------------------------------------------------------------
//---------------------SEARCH - NODE HELPERS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the search haystack string for a single skill definition.
// All localised name, description, and statKey fields are concatenated so
// that the user can search in either language.
export function _ptBuildSearchHaystack(def) {
    return [
        def.nameEn || '',
        def.nameDe || '',
        def.descEn || '',
        def.descDe || '',
        def.statKey || '',
    ].join(' ').toLowerCase();
}

// Applies a golden highlight to a node element that matched the search query.
export function _ptApplySearchMatchStyle(el) {
    el.style.filter = 'drop-shadow(0 0 8px rgba(255,215,0,0.95)) drop-shadow(0 0 16px rgba(255,165,0,0.6))';
    el.style.opacity = '1';
    el.style.zIndex = '20';
}

// Dims a node element that did not match the search query.
export function _ptApplySearchNoMatchStyle(el) {
    el.style.filter = 'brightness(0.3) saturate(0.3)';
    el.style.opacity = '0.35';
    el.style.zIndex = '1';
}

// Clears any search-related style overrides from a node element,
// restoring it to whatever the regular style helpers last set.
export function _ptClearSearchNodeStyle(el) {
    el.style.filter = '';
    el.style.opacity = '';
    el.style.zIndex = '2';
}




//------------------------------------------------------------------------
//----------------------------SEARCH--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies or clears a search query across all node and connection elements.
// Matching nodes glow; non-matching nodes are dimmed; connections are faded.
// Passing an empty string clears the search and restores default appearance.
export function _ptApplySearch(query) {
    const q = query.trim().toLowerCase();
    _pt_searchQuery = q;
    _pt_pendingSearchQuery = q;
    _pt_searchMatches = new Set();

    if (q) {
        globalThis._pt_skills.forEach(skill => {
            if (skill._searchText && skill._searchText.includes(q)) _pt_searchMatches.add(skill.id);
        });
    }

    Object.keys(_pt_nodeEls).forEach(id => {
        const el = _pt_nodeEls[id];
        if (!q) _ptClearSearchNodeStyle(el);
        else if (_pt_searchMatches.has(Number(id))) _ptApplySearchMatchStyle(el);
        else _ptApplySearchNoMatchStyle(el);
    });

    Object.keys(_pt_connEls).forEach(id => {
        _pt_connEls[id].style.opacity = q ? '0.15' : '';
    });
}

function _ptScheduleSearch(query) {
    _pt_pendingSearchQuery = query.trim().toLowerCase();
    if (_pt_searchFrame) return;
    const run = () => {
        _pt_searchFrame = 0;
        _ptApplySearch(_pt_pendingSearchQuery);
    };
    if (typeof requestAnimationFrame === 'function') _pt_searchFrame = requestAnimationFrame(run);
    else _pt_searchFrame = setTimeout(run, 0);
}

function _ptCancelScheduledSearch() {
    if (!_pt_searchFrame) return;
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(_pt_searchFrame);
    else clearTimeout(_pt_searchFrame);
    _pt_searchFrame = 0;
}

// Convenience wrapper - resets the search to the empty state.
export function _ptClearSearch() {
    _ptApplySearch('');
}

// Creates the search bar widget (wrapper + icon + input + clear button).
// The element is NOT appended to the DOM here; _ptInjectSearchBar() handles
// placement so the search bar always lands in the correct topbar slot.
export function _ptCreateSearchBar() {
    const wrap = document.createElement('div');
    wrap.id = 'pt-search-wrap';
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

    // Decorative magnifier - not interactive
    const icon = document.createElement('span');
    icon.textContent = '🔍';
    icon.style.cssText = 'font-size:14px;opacity:0.7;pointer-events:none;';

    const input = document.createElement('input');
    input.id = 'pt-search-input';
    input.type = 'text';
    input.placeholder = t('pt_search_placeholder');
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

    // Highlight the clear button on hover
    clearBtn.addEventListener('mouseenter', () => clearBtn.style.color = '#d4b870');
    clearBtn.addEventListener('mouseleave', () => clearBtn.style.color = '#888');

    clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.style.display = 'none';
        _ptScheduleSearch('');
    });

    input.addEventListener('input', () => {
        const q = input.value.trim();
        clearBtn.style.display = q ? 'inline' : 'none';
        _ptScheduleSearch(q);
    });

    // Stop mousedown from bubbling to the canvas pan handler
    input.addEventListener('mousedown', e => e.stopPropagation());

    wrap.appendChild(icon);
    wrap.appendChild(input);
    wrap.appendChild(clearBtn);
    return wrap;
}




//------------------------------------------------------------------------
//-----------------------------RENDERER-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

export function _ptResetRenderState() {
    const container = document.getElementById('pt-canvas');
    if (!container) { console.error('[PassiveTree] #pt-canvas not found'); return null; }
    if (_pt_container && _pt_container !== container) _pt_nodeEventsBound = false;
    _pt_container = container;
    _pt_container.style.position = 'relative';
    _pt_container.style.overflow = 'hidden';
    _pt_container.style.cursor = 'grab';
    _pt_container.style.userSelect = 'none';
    _ptHideTooltip();

    const dataChanged = _pt_sceneSkills !== globalThis._pt_skills
        || _pt_sceneConnections !== globalThis._pt_conns;
    if (!dataChanged) return _pt_container;

    _ptCancelScheduledSearch();
    _pt_container.innerHTML = '';
    _pt_world = null;
    _pt_svg = null;
    _pt_nodesLayer = null;
    _pt_nodeEls = Object.create(null);
    _pt_connEls = Object.create(null);
    _pt_nodePool = [];
    _pt_connPool = [];
    _pt_boundsSkills = null;
    _pt_boundsCache = null;
    _pt_renderLayout = null;
    _pt_connectionById = new Map();
    _pt_connectionMeta = [];
    _pt_searchQuery = '';
    _pt_pendingSearchQuery = '';
    _pt_searchMatches = new Set();
    _pt_tooltipNodeId = null;
    _pt_tooltipHtml = '';
    _pt_tooltipWidth = 0;
    _pt_tooltipHeight = 0;
    _pt_sceneSkills = globalThis._pt_skills;
    _pt_sceneConnections = globalThis._pt_conns;
    const input = document.getElementById('pt-search-input');
    if (input) input.value = '';
    return _pt_container;
}

// Renders an error / empty state when the skill list failed to load.
export function _ptRenderEmptyState() {
    const msg = t('pt_tree_load_failed');

    _pt_container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;
            justify-content:center;height:100%;gap:18px;opacity:0.55;">
            <div style="font-family:var(--PX,monospace);font-size:13px;
                color:var(--accent2,#aaa);letter-spacing:2px;text-align:center;">
                ${msg}
            </div>
        </div>`;
}

// Creates the world <div> that is panned/zoomed via CSS transform.
export function _ptCreateWorldDiv(worldW, worldH) {
    const world = document.createElement('div');
    world.id = 'pt-world';
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

// Creates the SVG overlay that all connection <line> elements live in.
export function _ptCreateSvgOverlay(worldW, worldH) {
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

// Creates the <div> layer that node elements are placed into.
export function _ptCreateNodesLayer(worldW, worldH) {
    const layer = document.createElement('div');
    layer.style.cssText = `
        position: absolute;
        top: 0; left: 0;
        width: ${worldW}px;
        height: ${worldH}px;
    `;
    return layer;
}

function _ptPrepareRenderLayout(bounds) {
    const { offsetX, offsetY } = _ptComputeOffsets(bounds);
    const worldW = bounds.maxX - bounds.minX + (PT_PADDING + PT_NODE_RADIUS) * 2;
    const worldH = bounds.maxY - bounds.minY + (PT_PADDING + PT_NODE_RADIUS) * 2;
    const skillMap = globalThis._pt_skillMap;

    globalThis._pt_skills.forEach(skill => {
        skill._worldX = skill.x + offsetX;
        skill._worldY = skill.y + offsetY;
        skill._renderRadius = _ptGetNodeRadius(skill);
        skill._searchText = _ptBuildSearchHaystack(skill._def || {});
    });

    _pt_connectionById = new Map();
    _pt_connectionMeta = [];
    globalThis._pt_conns.forEach(connection => {
        _pt_connectionById.set(connection.id, connection);
        const from = skillMap[connection.from];
        const to = skillMap[connection.to];
        if (!from || !to) return;
        _pt_connectionMeta.push({
            connection,
            x1: from._worldX,
            y1: from._worldY,
            x2: to._worldX,
            y2: to._worldY,
            minX: Math.min(from._worldX, to._worldX),
            maxX: Math.max(from._worldX, to._worldX),
            minY: Math.min(from._worldY, to._worldY),
            maxY: Math.max(from._worldY, to._worldY),
        });
    });

    _pt_renderLayout = { bounds, offsetX, offsetY, worldW, worldH };
    return _pt_renderLayout;
}

export function _ptUpdateVirtualViewport(scale, tx, ty) {
    if (!_pt_renderLayout || !_pt_container) return { nodes: 0, connections: 0 };
    const width = _pt_container.clientWidth;
    const height = _pt_container.clientHeight;
    if (!(scale > 0) || !(width > 0) || !(height > 0)) return { nodes: 0, connections: 0 };

    const safeScale = Math.max(0.01, scale);
    const margin = Math.max(160, Math.min(1200, PT_VIRTUAL_OVERSCAN_PX / safeScale));
    const minX = -margin - tx / safeScale;
    const maxX = width / safeScale - tx / safeScale + margin;
    const minY = -margin - ty / safeScale;
    const maxY = height / safeScale - ty / safeScale + margin;
    const visibleNodes = [];
    const visibleConnections = [];
    const visibleNodeIds = new Set();
    const visibleConnectionIds = new Set();

    globalThis._pt_skills.forEach(skill => {
        const radius = skill._renderRadius || 0;
        if (skill._worldX + radius < minX || skill._worldX - radius > maxX) return;
        if (skill._worldY + radius < minY || skill._worldY - radius > maxY) return;
        visibleNodes.push(skill);
        visibleNodeIds.add(skill.id);
    });

    _pt_connectionMeta.forEach(meta => {
        if (meta.maxX < minX || meta.minX > maxX || meta.maxY < minY || meta.minY > maxY) return;
        visibleConnections.push(meta);
        visibleConnectionIds.add(meta.connection.id);
    });

    Object.keys(_pt_nodeEls).forEach(id => {
        if (!visibleNodeIds.has(Number(id))) _ptUnmountNode(Number(id));
    });
    Object.keys(_pt_connEls).forEach(id => {
        if (!visibleConnectionIds.has(Number(id))) _ptUnmountConnection(Number(id));
    });

    const nodeFragment = document.createDocumentFragment();
    const connectionFragment = document.createDocumentFragment();
    visibleNodes.forEach(skill => {
        if (!_pt_nodeEls[skill.id]) _ptMountNode(skill, nodeFragment);
    });
    visibleConnections.forEach(meta => {
        if (!_pt_connEls[meta.connection.id]) _ptMountConnection(meta, connectionFragment);
    });
    if (nodeFragment.firstChild) _pt_nodesLayer.appendChild(nodeFragment);
    if (connectionFragment.firstChild) _pt_svg.appendChild(connectionFragment);

    _pt_world.classList.toggle('pt-overview', safeScale < PT_OVERVIEW_SCALE);
    return { nodes: visibleNodeIds.size, connections: visibleConnectionIds.size };
}

// Injects search bar DOM children into the pre-existing #pt-search-wrap
// placeholder element in the topbar.  Only runs when the wrap is empty, so
// re-renders do not duplicate the search input.
export function _ptInjectSearchBar() {
    const existingWrap = document.getElementById('pt-search-wrap');
    if (!existingWrap || existingWrap.hasChildNodes()) return;

    const searchBar = _ptCreateSearchBar();
    // Move children rather than replacing the element so external CSS rules
    // targeting #pt-search-wrap continue to apply.
    while (searchBar.firstChild) {
        existingWrap.appendChild(searchBar.firstChild);
    }
    existingWrap.style.cssText = searchBar.style.cssText;
}

export function _ptRender() {
    if (!_ptResetRenderState()) return;

    if (!globalThis._pt_skills.length) {
        _ptRenderEmptyState();
        return;
    }

    _ptBuildAdjacency();
    ensurePassiveTreeRoot();

    const bounds = _ptGetBounds();
    if (!_pt_renderLayout) _ptPrepareRenderLayout(bounds);
    const { worldW, worldH } = _pt_renderLayout;

    if (!_pt_world || !_pt_svg || !_pt_nodesLayer) {
        _pt_world = _ptCreateWorldDiv(worldW, worldH);
        _pt_svg = _ptCreateSvgOverlay(worldW, worldH);
        _pt_nodesLayer = _ptCreateNodesLayer(worldW, worldH);
        _pt_world.appendChild(_pt_svg);
        _pt_world.appendChild(_pt_nodesLayer);
        _pt_container.appendChild(_pt_world);
    } else {
        _pt_world.style.width = worldW + 'px';
        _pt_world.style.height = worldH + 'px';
        _pt_svg.style.width = worldW + 'px';
        _pt_svg.style.height = worldH + 'px';
        _pt_svg.setAttribute('width', worldW);
        _pt_svg.setAttribute('height', worldH);
        _pt_nodesLayer.style.width = worldW + 'px';
        _pt_nodesLayer.style.height = worldH + 'px';
        if (!_pt_world.isConnected) _pt_container.appendChild(_pt_world);
    }

    _ptBindNodeEvents();
    _ptInjectSearchBar();
    _ptBindEvents();
    _ptFitToView(bounds);
    _ptRefreshAllStyles();
}