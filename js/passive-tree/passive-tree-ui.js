//------------------------------------------------------------------------
//----------------------------CONSTANTS & STATE----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// These are set during _ptRender() and shared across all UI/renderer functions.
// Never access these before _ptRender() has completed at least once.

let _pt_container = null;  // #pt-canvas element — the outermost scrollable frame
let _pt_world = null;  // the zoomable/pannable world <div> inside the container
let _pt_svg = null;  // SVG overlay that holds all connection <line> elements
let _pt_nodesLayer = null;  // <div> layer that holds all node <div> elements
let _pt_tooltip = null;  // floating tooltip <div> that lives in document.body

// Element caches: populated by _ptDrawConnections / _ptDrawNodes,
// used by style helpers and search to avoid repeated DOM queries.
let _pt_nodeEls = {};   // skill id  →  node <div>
let _pt_connEls = {};   // conn id   →  SVG <line>

// NOTE: _pt_mouseDownTime and _pt_eventsBound are also part of this module's
// state but are declared in the canvas pan/zoom handler file, not here.




//------------------------------------------------------------------------
//-------------------------LOCALIZATION HELPER-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Picks between an English and German string based on the current language
// code. Centralises the `lang === 'de' ? de : en` pattern used all over
// the tooltip, search bar, and empty-state copy.
function _ptPickLang(lang, en, de) {
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
function _ptIsKeystoneNode(def) {
    if (!def) return false;
    return (
        (def.statKey && def.statKey.startsWith('keystone_')) ||
        (def.nameEn && def.nameEn.startsWith('Keystone:')) ||
        (def.nameDe && def.nameDe.startsWith('Schlüsselfertigkeit:'))
    );
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
function _ptStylePropsAllocated(isKeystone) {
    return {
        bg: isKeystone ? '#1a1000' : PT_COL_ALLOCATED_BG,
        border: isKeystone
            ? '2px solid #e8a020'
            : `2px solid ${PT_COL_ALLOCATED_BORDER}`,
        shadow: isKeystone
            ? '0 0 14px rgba(232,160,32,0.75), inset 0 0 6px rgba(0,0,0,0.4)'
            : '0 0 10px rgba(109,191,64,0.55), inset 0 0 4px rgba(0,0,0,0.3)',
        dotColor: isKeystone ? '#e8a020' : PT_COL_ALLOCATED_DOT,
        cursor: 'pointer',
    };
}

// --- unlockable (reachable but not yet taken) ---
function _ptStylePropsUnlockable(isStart, isKeystone) {
    // The start node gets a special golden border even in unlockable state
    const border = isStart
        ? `3px solid ${PT_COL_START}`
        : isKeystone
            ? '2px solid #c07818'
            : `2px solid ${PT_COL_UNLOCKED_BORDER}`;

    const shadow = isStart
        ? '0 0 12px rgba(255,215,0,0.6), inset 0 0 6px rgba(255,215,0,0.15)'
        : isKeystone
            ? '0 0 8px rgba(192,120,24,0.45), inset 0 0 4px rgba(0,0,0,0.4)'
            : '0 0 6px rgba(184,154,80,0.3), inset 0 0 4px rgba(0,0,0,0.4)';

    return {
        bg: isKeystone ? '#100800' : PT_COL_UNLOCKED_BG,
        border,
        shadow,
        dotColor: isStart ? PT_COL_START : isKeystone ? '#c07818' : PT_COL_UNLOCKED_DOT,
        cursor: 'pointer',
    };
}

// --- locked (not reachable) ---
function _ptStylePropsLocked() {
    return {
        bg: PT_COL_LOCKED_BG,
        border: `2px solid ${PT_COL_LOCKED_BORDER}`,
        shadow: 'none',
        dotColor: PT_COL_LOCKED_DOT,
        cursor: 'not-allowed',
    };
}

// Picks the correct style props for the given node id based on its current
// visual state (allocated / unlockable / locked) and type (keystone / start).
function _ptResolveNodeStyleProps(id) {
    const isStart = (id === PT_START_ID);
    const state = _ptGetNodeVisualState(id);
    const skill = _pt_skillMap[id];
    const def = skill ? skill._def : null;
    const isKeystone = _ptIsKeystoneNode(def);

    switch (state) {
        case 'allocated': return _ptStylePropsAllocated(isKeystone);
        case 'unlockable': return _ptStylePropsUnlockable(isStart, isKeystone);
        default: return _ptStylePropsLocked();       // 'locked'
    }
}

// Applies pre-resolved style props to the node's DOM element.
// Also sets opacity: locked nodes are dimmed to 0.45.
function _ptApplyNodeStyle(id) {
    const el = _pt_nodeEls[id];
    if (!el) return;

    const state = _ptGetNodeVisualState(id);
    const props = _ptResolveNodeStyleProps(id);

    el.style.background = props.bg;
    el.style.border = props.border;
    el.style.boxShadow = props.shadow;
    el.style.cursor = props.cursor;
    el.style.opacity = state === 'locked' ? '0.45' : '1';

    // The fallback dot (used when a node has no icon or emoji) also needs colouring
    const dot = el.querySelector('div.pt-dot');
    if (dot) dot.style.background = props.dotColor;
}




//------------------------------------------------------------------------
//---------------------CONNECTION STYLE HELPERS---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Resolves the stroke colour for a single connection line.
// Both-allocated connections get the bright allocated colour;
// everything else (one side active, neither active) uses the dimmer unlocked colour.
function _ptResolveConnColor(fromId, toId) {
    const alloc = _ptAllocated();
    if (alloc.has(fromId) && alloc.has(toId)) return PT_CONN_ALLOCATED;
    return PT_CONN_UNLOCKED;
}

// Writes the resolved stroke colour onto the SVG <line> element.
function _ptApplyConnStyle(connId, fromId, toId) {
    const line = _pt_connEls[connId];
    if (!line) return;
    line.setAttribute('stroke', _ptResolveConnColor(fromId, toId));
}

// Refreshes every node and connection to reflect the current allocation state.
// Call this after any allocation change (node click, undo, reset, etc.).
function _ptRefreshAllStyles() {
    _pt_skills.forEach(s => _ptApplyNodeStyle(s.id));
    _pt_conns.forEach(c => _ptApplyConnStyle(c.id, c.from, c.to));
    _ptRefreshPointsDisplay();
}




//------------------------------------------------------------------------
//------------------------NODE TOOLTIP HELPERS----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the localised display name for a node.
function _ptTooltipResolveName(skill, def, lang) {
    if (def) return _ptPickLang(lang, def.nameEn, def.nameDe || def.nameEn);
    return skill ? skill.name : `Skill ${skill?.id}`;
}

// Builds the localised description string (newlines → <br>).
function _ptTooltipResolveDesc(def, lang) {
    if (!def) return '';
    const raw = _ptPickLang(lang, def.descEn, def.descDe || def.descEn);
    return raw ? raw.replace(/\n/g, '<br>') : '';
}

// Builds the small status line shown at the bottom of the tooltip.
// Colour and wording vary by state and whether the node can still be removed.
function _ptTooltipBuildStatusHtml(id, state, lang) {
    if (state === 'allocated') {
        const canRemove = _ptIsDeallocatable(id);
        const color = canRemove ? '#6dbf40' : '#888';
        const text = canRemove
            ? _ptPickLang(lang, '✓ Active — Click to remove', '✓ Aktiv — Klicken zum Entfernen')
            : _ptPickLang(lang, '✓ Active — Cannot be removed', '✓ Aktiv — Kann nicht entfernt werden');
        return `<div style="margin-top:7px;font-size:11px;color:${color};">${text}</div>`;
    }

    if (state === 'unlockable') {
        const noPoints = _ptPoints() < 1;
        const color = noPoints ? '#c08030' : '#b89a50';
        const text = noPoints
            ? _ptPickLang(lang, '⚠ No points available', '⚠ Keine Punkte verfügbar')
            : _ptPickLang(lang, '▶ Click to unlock', '▶ Klicken zum Freischalten');
        return `<div style="margin-top:7px;font-size:11px;color:${color};">${text}</div>`;
    }

    // locked
    const lockedText = _ptPickLang(lang, '🔒 Locked', '🔒 Gesperrt');
    return `<div style="margin-top:7px;font-size:11px;color:#555;">${lockedText}</div>`;
}

// Assembles the full tooltip inner HTML from name, description, and status.
function _ptTooltipBuildHtml(id) {
    const skill = _pt_skillMap[id];
    const def = skill ? skill._def : null;
    const lang = _ptLang();
    const state = _ptGetNodeVisualState(id);

    const name = _ptTooltipResolveName(skill, def, lang);
    const desc = _ptTooltipResolveDesc(def, lang);
    const statusHtml = _ptTooltipBuildStatusHtml(id, state, lang);

    return `
        <div style="font-size:13px;font-weight:bold;color:#66fcf1;margin-bottom:5px;">${name}</div>
        ${desc ? `<div style="color:#bba870;">${desc}</div>` : ''}
        ${statusHtml}
    `;
}




//------------------------------------------------------------------------
//----------------------------NODE TOOLTIP--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Creates the singleton tooltip element and appends it to document.body.
// The tooltip starts invisible (opacity:0) and is shown by _ptShowTooltip().
function _ptCreateTooltip() {
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
function _ptPositionTooltip(mx, my) {
    if (!_pt_tooltip) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const tw = _pt_tooltip.offsetWidth || 260;
    const th = _pt_tooltip.offsetHeight || 100;
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
function _ptShowTooltip(id, mouseX, mouseY) {
    if (!_pt_tooltip) _pt_tooltip = _ptCreateTooltip();

    _pt_tooltip.innerHTML = _ptTooltipBuildHtml(id);
    _ptPositionTooltip(mouseX, mouseY);
    _pt_tooltip.style.opacity = '1';
}

// Fades the tooltip out (does not remove it from the DOM).
function _ptHideTooltip() {
    if (_pt_tooltip) _pt_tooltip.style.opacity = '0';
}




//------------------------------------------------------------------------
//-------------------BOUNDING BOX & LAYOUT HELPERS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the axis-aligned bounding box of all skill node positions.
// Used to size the world <div> and to compute the initial fit-to-view transform.
// Falls back to a sensible default when the tree has no nodes.
function _ptGetBounds() {
    if (!_pt_skills.length) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    _pt_skills.forEach(s => {
        if (s.x < minX) minX = s.x;
        if (s.y < minY) minY = s.y;
        if (s.x > maxX) maxX = s.x;
        if (s.y > maxY) maxY = s.y;
    });

    return { minX, minY, maxX, maxY };
}

// Converts skill-space bounds into the pixel offset needed to translate
// node/connection coordinates into the padded world <div>. Shared by
// _ptDrawConnections and _ptDrawNodes so both always agree on placement.
function _ptComputeOffsets(bounds) {
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
function _ptDrawConnection(conn, offsetX, offsetY) {
    const from = _pt_skillMap[conn.from];
    const to = _pt_skillMap[conn.to];
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
function _ptDrawConnections(bounds) {
    const { offsetX, offsetY } = _ptComputeOffsets(bounds);
    _pt_conns.forEach(conn => _ptDrawConnection(conn, offsetX, offsetY));
}




//------------------------------------------------------------------------
//------------------DRAW NODES — SHAPE HELPERS----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies the base CSS layout for a regular (circular) node.
function _ptApplyCircleShape(node, cx, cy, r) {
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
function _ptApplyDiamondShape(node, cx, cy, r) {
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
//------------------DRAW NODES — ICON HELPERS-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Counter-rotates the first child element of a keystone diamond node so that
// the icon or emoji appears upright despite the 45-degree parent rotation.
function _ptCounterRotateKeystoneChild(node) {
    const inner = node.firstChild;
    if (inner) inner.style.transform = 'rotate(-45deg)';
}

// Creates and appends an <img> icon element inside the node.
function _ptAppendImageIcon(node, iconSrc, isKeystone) {
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
    if (isKeystone) _ptCounterRotateKeystoneChild(node);
}

// Creates and appends an emoji <span> icon inside the node.
function _ptAppendEmojiIcon(node, emoji, isKeystone) {
    const span = document.createElement('span');
    span.textContent = emoji;
    span.style.cssText = `
        font-size: ${PT_NODE_RADIUS * 0.95}px;
        line-height: 1;
        pointer-events: none;
        user-select: none;
    `;
    node.appendChild(span);
    if (isKeystone) _ptCounterRotateKeystoneChild(node);
}

// Creates and appends the small coloured dot used as a fallback when a node
// has no icon and no emoji assigned.
function _ptAppendDotFallback(node, isKeystone) {
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
// The placeholder image 'axe-hammer-grey' is treated the same as no icon.
function _ptAppendNodeIcon(node, skill, def, isKeystone) {
    const icon = (def && def.icon) ? def.icon : skill.image;
    const isImageUrl = icon && (icon.startsWith('/') || icon.startsWith('http'));
    const isRealImg = isImageUrl && !icon.includes('axe-hammer-grey');
    const isEmoji = icon && !isImageUrl && !icon.includes('axe-hammer-grey');

    if (isRealImg) {
        _ptAppendImageIcon(node, icon, isKeystone);
    } else if (isEmoji) {
        _ptAppendEmojiIcon(node, icon, isKeystone);
    } else {
        _ptAppendDotFallback(node, isKeystone);
    }
}




//------------------------------------------------------------------------
//------------------DRAW NODES — EVENT HELPERS----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Attaches all mouse interaction handlers to a node element.
// Separated from the build loop so the logic is easy to read in isolation.
function _ptBindNodeEvents(node, skill, isKeystone) {
    const id = skill.id;

    node.addEventListener('mouseenter', e => {
        // Only scale up nodes that can be interacted with
        if (_ptGetNodeVisualState(id) !== 'locked') {
            node.style.transform = isKeystone ? 'rotate(45deg) scale(1.15)' : 'scale(1.15)';
            node.style.zIndex = '10';
        }
        _ptShowTooltip(id, e.clientX, e.clientY);
    });

    node.addEventListener('mousemove', e => {
        _ptPositionTooltip(e.clientX, e.clientY);
    });

    node.addEventListener('mouseleave', () => {
        // Restore the base transform (diamond must keep its 45-degree rotation)
        node.style.transform = isKeystone ? 'rotate(45deg)' : 'scale(1)';
        node.style.zIndex = '2';
        _ptHideTooltip();
    });

    // Record the timestamp on mousedown so the click handler can distinguish
    // a genuine click from the end of a canvas pan gesture.
    // (_pt_mouseDownTime is declared in the canvas pan-handling file.)
    node.addEventListener('mousedown', () => {
        _pt_mouseDownTime = Date.now();
    });

    node.addEventListener('click', e => {
        e.stopPropagation();
        // Ignore clicks that were actually long presses / drag releases
        if (Date.now() - _pt_mouseDownTime > 300) return;
        _ptOnNodeClick(id);
        _ptShowTooltip(id, e.clientX, e.clientY);
    });
}




//------------------------------------------------------------------------
//----------------------------DRAW NODES----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds and appends a single node <div> for the given skill.
// Shape, icon, and events are handled by the helpers above.
function _ptDrawNode(skill, offsetX, offsetY) {
    const cx = skill.x + offsetX;
    const cy = skill.y + offsetY;
    const isStart = (skill.id === PT_START_ID);
    const def = skill._def || null;
    const isKeystone = _ptIsKeystoneNode(def);
    // The start node is slightly larger than regular nodes
    const r = isStart ? PT_NODE_RADIUS * 1.4 : PT_NODE_RADIUS;

    const node = document.createElement('div');
    node.className = isKeystone ? 'pt-node pt-node-keystone' : 'pt-node';
    node.dataset.id = skill.id;

    // Apply the correct shape layout (circle vs rotated diamond)
    if (isKeystone) {
        _ptApplyDiamondShape(node, cx, cy, r);
    } else {
        _ptApplyCircleShape(node, cx, cy, r);
    }

    _ptAppendNodeIcon(node, skill, def, isKeystone);
    _ptBindNodeEvents(node, skill, isKeystone);

    _pt_nodesLayer.appendChild(node);
    _pt_nodeEls[skill.id] = node;
}

// Iterates over all skills and draws each one.
function _ptDrawNodes(bounds) {
    const { offsetX, offsetY } = _ptComputeOffsets(bounds);
    _pt_skills.forEach(skill => _ptDrawNode(skill, offsetX, offsetY));
}




//------------------------------------------------------------------------
//---------------------SEARCH — NODE HELPERS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the search haystack string for a single skill definition.
// All localised name, description, and statKey fields are concatenated so
// that the user can search in either language.
function _ptBuildSearchHaystack(def) {
    return [
        def.nameEn || '',
        def.nameDe || '',
        def.descEn || '',
        def.descDe || '',
        def.statKey || '',
    ].join(' ').toLowerCase();
}

// Applies a golden highlight to a node element that matched the search query.
function _ptApplySearchMatchStyle(el) {
    el.style.filter = 'drop-shadow(0 0 8px rgba(255,215,0,0.95)) drop-shadow(0 0 16px rgba(255,165,0,0.6))';
    el.style.opacity = '1';
    el.style.zIndex = '20';
}

// Dims a node element that did not match the search query.
function _ptApplySearchNoMatchStyle(el) {
    el.style.filter = 'brightness(0.3) saturate(0.3)';
    el.style.opacity = '0.35';
    el.style.zIndex = '1';
}

// Clears any search-related style overrides from a node element,
// restoring it to whatever the regular style helpers last set.
function _ptClearSearchNodeStyle(el) {
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
function _ptApplySearch(query) {
    const q = query.toLowerCase();

    _pt_skills.forEach(skill => {
        const el = _pt_nodeEls[skill.id];
        if (!el) return;

        if (!q) {
            _ptClearSearchNodeStyle(el);
            return;
        }

        const haystack = _ptBuildSearchHaystack(skill._def || {});
        if (haystack.includes(q)) {
            _ptApplySearchMatchStyle(el);
        } else {
            _ptApplySearchNoMatchStyle(el);
        }
    });

    // Fade all connection lines when a search is active so nodes read more clearly
    _pt_conns.forEach(conn => {
        const line = _pt_connEls[conn.id];
        if (!line) return;
        line.style.opacity = q ? '0.15' : '';
    });
}

// Convenience wrapper — resets the search to the empty state.
function _ptClearSearch() {
    _ptApplySearch('');
}

// Creates the search bar widget (wrapper + icon + input + clear button).
// The element is NOT appended to the DOM here; _ptInjectSearchBar() handles
// placement so the search bar always lands in the correct topbar slot.
function _ptCreateSearchBar() {
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

    // Decorative magnifier — not interactive
    const icon = document.createElement('span');
    icon.textContent = '🔍';
    icon.style.cssText = 'font-size:14px;opacity:0.7;pointer-events:none;';

    const input = document.createElement('input');
    input.id = 'pt-search-input';
    input.type = 'text';
    input.placeholder = _ptPickLang(_ptLang(), 'Search nodes…', 'Knoten suchen…');
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
        _ptClearSearch();
    });

    input.addEventListener('input', () => {
        const q = input.value.trim();
        clearBtn.style.display = q ? 'inline' : 'none';
        _ptApplySearch(q);
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

// Resets all module-level DOM state so a clean render can begin.
// The old container element is cloned (without event listeners) and swapped
// back into the DOM so that listeners added by _ptBindEvents() do not pile up.
function _ptResetRenderState() {
    const old = document.getElementById('pt-canvas');
    if (!old) { console.error('[PassiveTree] #pt-canvas not found'); return null; }

    _pt_container = old.cloneNode(false);
    old.parentNode.replaceChild(_pt_container, old);

    _pt_nodeEls = {};
    _pt_connEls = {};
    _pt_eventsBound = false;  // declared in the canvas pan-handling file

    // Remove any leftover tooltip from a previous render
    if (_pt_tooltip) { _pt_tooltip.remove(); _pt_tooltip = null; }

    _pt_container.innerHTML = '';
    _pt_container.style.cssText += `
        position: relative;
        overflow: hidden;
        cursor: grab;
        user-select: none;
    `;

    return _pt_container;
}

// Renders an error / empty state when the skill list failed to load.
function _ptRenderEmptyState() {
    const msg = _ptPickLang(_ptLang(), 'TREE COULD NOT BE LOADED', 'BAUM KONNTE NICHT GELADEN WERDEN');

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
function _ptCreateWorldDiv(worldW, worldH) {
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
function _ptCreateSvgOverlay(worldW, worldH) {
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
function _ptCreateNodesLayer(worldW, worldH) {
    const layer = document.createElement('div');
    layer.style.cssText = `
        position: absolute;
        top: 0; left: 0;
        width:  ${worldW}px;
        height: ${worldH}px;
    `;
    return layer;
}

// Injects search bar DOM children into the pre-existing #pt-search-wrap
// placeholder element in the topbar.  Only runs when the wrap is empty, so
// re-renders do not duplicate the search input.
function _ptInjectSearchBar() {
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

// Main render entry point.  Tears down any existing tree and rebuilds it
// from scratch using the current _pt_skills / _pt_conns data.
function _ptRender() {
    if (!_ptResetRenderState()) return;

    // Nothing to show — display a friendly error message instead
    if (!_pt_skills.length) {
        _ptRenderEmptyState();
        return;
    }

    _ptBuildAdjacency();

    // Guarantee the start node is always allocated on (re)load
    const allocOnLoad = _ptAllocated();
    if (!allocOnLoad.has(PT_START_ID)) allocOnLoad.add(PT_START_ID);

    // Size the world to fit all node positions plus padding
    const bounds = _ptGetBounds();
    const worldW = bounds.maxX - bounds.minX + (PT_PADDING + PT_NODE_RADIUS) * 2;
    const worldH = bounds.maxY - bounds.minY + (PT_PADDING + PT_NODE_RADIUS) * 2;

    // Build the layer stack: world → svg + nodesLayer
    _pt_world = _ptCreateWorldDiv(worldW, worldH);
    _pt_svg = _ptCreateSvgOverlay(worldW, worldH);
    _pt_nodesLayer = _ptCreateNodesLayer(worldW, worldH);

    _pt_world.appendChild(_pt_svg);
    _pt_world.appendChild(_pt_nodesLayer);
    _pt_container.appendChild(_pt_world);

    _ptDrawConnections(bounds);
    _ptDrawNodes(bounds);
    _ptRefreshAllStyles();
    _ptFitToView(bounds);
    _ptBindEvents();
    _ptInjectSearchBar();
}