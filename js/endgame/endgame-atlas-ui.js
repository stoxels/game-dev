//------------------------------------------------------------------------
//-------------------ENDGAME ATLAS SCREEN---------------------------------
//------------------------------------------------------------------------
// PoE-style atlas overview, presented like a classic WoW atlas dialog
// (faithful to the original Lua "Atlas of Azeroth" addon):
//   - Regions are SMALL SQUARE NODES with the tier numeral (I..XVI) inside
//   - The region name floats ABOVE the node, coloured by rarity band
//     (game rarity palette): tiers I–V uncommon green · VI–X rare blue ·
//     XI–XVI epic purple
//   - Each region requires its band's difficulty to clear (Easy / Normal /
//     Hard); runs finished on another difficulty do not count as completed
//     (the requirement is shown on map item tooltips, not on the nodes)
//   - Connections are thin DOTTED GREY LINES (gold once the region is done)
//   - Two mirrored continents: each of the four tier-1 corner regions
//     starts a linear path winding inward to the four tier-16 pinnacles
//   - Node states: ✔ completed (gold) · available (border highlight) ·
 //     locked (dimmed)
//   - Bottom-left of every node: number of matching maps in the map stash
//   - Hovering a node opens a custom tooltip naming the region's fixed
//     boss (emoji + name — the same guardian the region's map tooltips
//     name, see EG_ATLAS_REGION_BOSSES in
//     js/endgame/bosses/boss-rosters.js)
//   - Search box (top right): matching regions glow blue (pulsing node
//     frame + brightened name), including locked ones; matches by region
//     name and by tier numeral / number (e.g. 'XV' or '15')
//
// Entry point: showEndgameAtlas() — opens from the Probability Gate
// topbar button and from the Nexus of Worlds door.
//
// Dependencies (must be loaded before this file):
//   endgame-atlas.js — EG_ATLAS_NODES (x, y) / status helpers
//   screens.js       — switchScreen()
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------LAYOUT CONSTANTS-------------------------------------
//------------------------------------------------------------------------

// The atlas canvas is a fixed-size stage sized like the classic dialog
// (~1500×850). Node positions come straight from the atlas data
// (EG_ATLAS_TIER_POSITIONS offsets around the centre).
const EG_ATLAS_CANVAS_W = 1440;
const EG_ATLAS_CANVAS_H = 820;
const EG_ATLAS_CX = EG_ATLAS_CANVAS_W / 2;
const EG_ATLAS_CY = EG_ATLAS_CANVAS_H / 2;
const EG_ATLAS_LABEL_H = 15;        // reserved space above a node for its name

// Name of the global function the BACK button calls — set by
// showEndgameAtlas(backFn). Defaults to the Probability Gate.
let _egAtlasBackFn = 'showEndgameGate';

let _egAtlasSelectedNodeId = null;
let _egAtlasSearchQuery = '';
let _egAtlasStashCounts = {};

// View state: the atlas scales to fit the window by default and can be
// zoomed (mouse wheel / controls) and panned (mouse drag) freely.
let _egAtlasZoom = 1;
let _egAtlasZoomIsFit = true;
const EG_ATLAS_ZOOM_MIN = 0.35;
const EG_ATLAS_ZOOM_MAX = 3;


//------------------------------------------------------------------------
//-------------------HTML HELPERS-----------------------------------------
//------------------------------------------------------------------------

// Centre position of a node on the atlas canvas.
function _egAtlasNodeCenter(node) {
    return {
        x: EG_ATLAS_CX + (node.x || 0),
        y: EG_ATLAS_CY + (node.y || 0),
    };
}

// Node squares are small, like the classic atlas.
function _egAtlasNodeSize(tier) {
    if (tier >= EG_ATLAS_MAX_TIER) return { w: 38, h: 38 }; // pinnacle
    return { w: 30, h: 30 };
}

// Rarity band colour, straight from the game's rarity palette
// (RARITY_COLOR_MAP in item-pool.js):
//   tiers I–V   uncommon  #2ecc71 (green)
//   tiers VI–X  rare      #3498db (blue)
//   tiers XI–XVI epic     #c39bd3 (purple)
function _egAtlasTierGroupColor(tier) {
    if (tier <= 5) return '#2ecc71';   // uncommon
    if (tier <= 10) return '#3498db';  // rare
    return '#c39bd3';                  // epic
}



// Roman numerals for the tier inside the node square.
function _egAtlasRoman(tier) {
    const romans = (typeof EG_MAP_TIER_ROMANS !== 'undefined' && EG_MAP_TIER_ROMANS.length === EG_ATLAS_MAX_TIER)
        ? EG_MAP_TIER_ROMANS
        : ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
    return romans[tier - 1] || String(tier);
}

function _egAtlasNodeStatus(node) {
    if (egAtlasIsCompleted(node.id)) return 'completed';
    if (egAtlasIsUnlocked(node.id)) return 'available';
    return 'locked';
}

function _egAtlasStatusColor(status) {
    switch (status) {
        case 'completed': return '#f5d98a';
        case 'available': return '#f5f5f5';
        default: return '#62626e';
    }
}

function _egAtlasStatusLabel(status) {
    switch (status) {
        case 'completed': return `✔ ${t('eg_atlas_status_completed')}`;
        case 'available': return `? ${t('eg_atlas_status_available')}`;
        default: return `🔒 ${t('eg_atlas_status_locked')}`;
    }
}

// Resolves the fixed boss of an atlas region — the same deterministic
// blueprint lookup (egAtlasChainBlueprint) the map tooltips and the map
// launch code use, so the card always names the boss actually fought in
// that region's maps. Returns { id, name, emoji } or null when the boss
// cannot be resolved (unknown region / missing defs).
function _egAtlasNodeBoss(node) {
    if (!node || typeof egAtlasChainBlueprint !== 'function') return null;
    try {
        const bp = egAtlasChainBlueprint(node);
        if (!bp || !bp.bossId) return null;
        const def = (typeof EG_BOSS_DEFS !== 'undefined') ? EG_BOSS_DEFS[bp.bossId] : null;
        if (!def) return null;
        return { id: bp.bossId, name: def.name || bp.bossId, emoji: def.emoji || '💀' };
    } catch (e) {
        return null;
    }
}

// Counts the stashed map items per atlas region (like the classic atlas
// showed the number of map items in the player's bags on every node).
function egAtlasCountStashedMaps() {
    const counts = {};
    let stash = null;
    if (typeof _egMapStash !== 'undefined' && Array.isArray(_egMapStash)) stash = _egMapStash;
    else if (typeof STATE !== 'undefined' && STATE.egMapStash && Array.isArray(STATE.egMapStash)) stash = STATE.egMapStash;
    if (!stash) return counts;
    stash.forEach(tierGrid => {
        if (!Array.isArray(tierGrid)) return;
        tierGrid.forEach(row => {
            if (!Array.isArray(row)) return;
            row.forEach(item => {
                if (item && item.atlasNodeId) {
                    counts[item.atlasNodeId] = (counts[item.atlasNodeId] || 0) + 1;
                }
            });
        });
    });
    return counts;
}

// Builds one region node: a small square (tier numeral inside) with the
// region name floating above it. Hovering the node opens a custom
// tooltip naming the region's fixed boss (see _egAtlasNodeBoss).
function _egAtlasBuildNodeHTML(node) {
    const status = _egAtlasNodeStatus(node);
    const name = egAtlasNodeName(node);
    const size = _egAtlasNodeSize(node.tier);
    const c = _egAtlasNodeCenter(node);
    const col = _egAtlasTierGroupColor(node.tier);
    const roman = _egAtlasRoman(node.tier);
    const numeralSize = roman.length >= 4 ? 6 : roman.length === 3 ? 7 : roman.length === 2 ? 9 : 11;

    const marker = status === 'completed' ? '<span class="ega-node-done">✔</span>'
        : '';
    const count = (_egAtlasStashCounts && _egAtlasStashCounts[node.id]) || 0;
    const countHtml = count > 0 ? `<span class="ega-node-count">${count}</span>` : '';

    return `
<div class="ega-node ega-node-${status}"
     id="ega-node-${node.id}"
     style="left:${(c.x - size.w / 2).toFixed(1)}px; top:${(c.y - size.h / 2 - EG_ATLAS_LABEL_H).toFixed(1)}px; \
width:${size.w}px; height:${size.h + EG_ATLAS_LABEL_H}px;"
     onclick="_egAtlasSelectNode('${node.id}')"
     onmouseenter="if (typeof showGameTooltip === 'function') showGameTooltip(_egAtlasBuildNodeTooltipHTML('${node.id}'), event)"
     onmousemove="if (typeof moveGameTooltip === 'function') moveGameTooltip(event)"
     onmouseleave="if (typeof hideGameTooltip === 'function') hideGameTooltip()">
    <div class="ega-node-label" style="color:${col};">${name}</div>
    <div class="ega-node-box" style="width:${size.w}px; height:${size.h}px; --egcol:${col};">
        <span class="ega-node-numeral" style="font-size:${numeralSize}px; color:${col};">${roman}</span>
        ${marker}${countHtml}
    </div>
</div>`;
}

// Hover tooltip for one region node: names the region's fixed boss
// (emoji + name, the same red boss line the map-item tooltips show).
// Falls back to the generic boss label when the boss cannot be resolved.
function _egAtlasBuildNodeTooltipHTML(nodeId) {
    const node = (typeof egAtlasNodeById === 'function') ? egAtlasNodeById(nodeId) : null;
    if (!node) return '';
    const boss = _egAtlasNodeBoss(node);
    const bossLabel = boss ? `${boss.emoji} ${boss.name}` : t('eg_map_has_boss');
    return `
<div class="eg-tt-frame" style="--tt-border:#c8a84b;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">🗺</div>
        <div class="eg-tt-name" style="color:#f5d98a;">${egAtlasNodeName(node)}</div>
    </div>
    <div class="eg-tt-section">
        <div class="eg-tt-mod" style="color:#e74c3c;font-weight:700;">${bossLabel}</div>
    </div>
</div>`;
}

// Builds the whole SVG underlay: thin dotted connection lines, exactly
// like the classic atlas drew them between region coordinates.
function _egAtlasBuildLinksSVG() {
    let lines = '';
    const drawn = new Set();

    EG_ATLAS_NODES.forEach(node => {
        const c1 = _egAtlasNodeCenter(node);

        node.links.forEach(linkId => {
            // Each edge exists twice (bidirectional links) — draw once.
            const key = [node.id, linkId].sort().join('|');
            if (drawn.has(key)) return;
            drawn.add(key);

            const other = egAtlasNodeById(linkId);
            if (!other) return;

            const c2 = _egAtlasNodeCenter(other);
            const isRing = other.tier === node.tier;

            // Line brightness follows the better end's status.
            const best = [_egAtlasNodeStatus(node), _egAtlasNodeStatus(other)]
                .sort((a, b) => a === 'completed' ? -1 : b === 'completed' ? 1 : a === 'available' ? -1 : 1)[0];
            const color = best === 'completed' ? '#f5d98a'
                : best === 'available' ? '#cfcfd8'
                : '#8a8a96';
            const opacity = best === 'locked' ? 0.28 : best === 'available' ? 0.55 : 0.8;
            const width = isRing ? 1 : 1.2;

            lines += `<line x1="${c1.x.toFixed(1)}" y1="${c1.y.toFixed(1)}" x2="${c2.x.toFixed(1)}" y2="${c2.y.toFixed(1)}" \
stroke="${color}" stroke-width="${width}" stroke-dasharray="2 4" stroke-linecap="round" opacity="${opacity}"/>`;
        });
    });

    return `<svg class="ega-links-svg" width="${EG_ATLAS_CANVAS_W}" height="${EG_ATLAS_CANVAS_H}" \
viewBox="0 0 ${EG_ATLAS_CANVAS_W} ${EG_ATLAS_CANVAS_H}">${lines}</svg>`;
}

// Builds the header strip: progress and the search box.
function _egAtlasBuildHeaderHTML() {
    const prog = egAtlasProgress();
    const pct = prog.total > 0 ? Math.round(100 * prog.completed / prog.total) : 0;
    return `
<div class="ega-header">
    <div class="ega-header-top">
        <div class="ega-header-main">
            <div class="ega-header-line">
                <span class="ega-header-progress">
                    ${t('eg_atlas_progress')
                        .replace('{c}', prog.completed)
                        .replace('{n}', prog.total)}
                </span>
                <span class="ega-header-highest">
                    ${t('eg_atlas_highest_tier').replace('{n}', prog.highestTier)}
                </span>
            </div>
            <div class="ega-progress-track"><div class="ega-progress-fill" style="width:${pct}%"></div></div>
        </div>
        <input type="text" class="ega-search" id="ega-search"
               placeholder="${t('eg_atlas_search')}"
               value="${_egAtlasSearchQuery.replace(/"/g, '&quot;')}"
               oninput="_egAtlasSearch(this.value)">
    </div>
    ${_egAtlasBuildTierProgressHTML()}
</div>`;
}

// Per-tier progress strip: one cell per tier (I..XVI) showing
// "completed/total" regions, coloured by the tier's rarity band. Fully
// cleared tiers light up gold, untouched ones stay dim. Hovering a cell
// opens the shared tooltip with the tier's region list + statuses — so
// the sweep pacing of the atlas (which region of a tier is still missing)
// is visible at a glance.
function _egAtlasBuildTierProgressHTML() {
    const cells = [];
    for (let tier = 1; tier <= EG_ATLAS_MAX_TIER; tier++) {
        const nodes = EG_ATLAS_NODES.filter(n => n.tier === tier);
        const done = nodes.filter(n => egAtlasIsCompleted(n.id)).length;
        const cls = done === nodes.length ? 'ega-full' : (done === 0 ? 'ega-zero' : '');
        cells.push(`
    <div class="ega-tier-cell ${cls}" data-tier="${tier}"
         onmouseenter="if (typeof showGameTooltip === 'function') showGameTooltip(_egAtlasBuildTierTooltipHTML(${tier}), event)"
         onmousemove="if (typeof moveGameTooltip === 'function') moveGameTooltip(event)"
         onmouseleave="if (typeof hideGameTooltip === 'function') hideGameTooltip()">
        <span class="ega-tier-num" style="color:${_egAtlasTierGroupColor(tier)};">${_egAtlasRoman(tier)}</span>
        <span class="ega-tier-count">${done}/${nodes.length}</span>
    </div>`);
    }
    return `
    <div class="ega-tier-progress">
        <span class="ega-tier-progress-label">${t('eg_atlas_tier_progress')}</span>${cells.join('')}
    </div>`;
}

// Shared-tooltip content for one tier strip cell: every region of the tier
// with its status glyph and colour (✔ cleared · ? available · 🔒 locked).
function _egAtlasBuildTierTooltipHTML(tier) {
    const nodes = EG_ATLAS_NODES.filter(n => n.tier === tier);
    const done = nodes.filter(n => egAtlasIsCompleted(n.id)).length;
    const rows = nodes.map(n => {
        const status = _egAtlasNodeStatus(n);
        const glyph = status === 'completed' ? '✔' : status === 'available' ? '?' : '🔒';
        return `<div class="eg-tt-mod" style="color:${_egAtlasStatusColor(status)}">${glyph} ${egAtlasNodeName(n)}</div>`;
    }).join('');
    return `
<div class="eg-tt-frame" style="--tt-border:#c8a84b;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">🗺</div>
        <div class="eg-tt-name" style="color:#f5d98a;">${t('eg_map_tier_tt').replace('{n}', tier)} · ${done}/${nodes.length}</div>
    </div>
    <div class="eg-tt-section">${rows}</div>
</div>`;
}

// Assembles the full atlas screen body.
function _egAtlasBuildFullScreenHTML() {
    return `
<div class="ega-layout">
    <div class="eg-topbar">
        <button class="eg-back-btn" onclick="${_egAtlasBackFn}()">${t('btn_back')}</button>
        <span class="eg-topbar-title">${t('eg_atlas_title')}</span>
    </div>
    ${_egAtlasBuildHeaderHTML()}
    <div class="ega-frame">
        <div class="ega-viewport" id="ega-viewport">
            <div class="ega-zoom-wrap" id="ega-zoom-wrap">
                <div class="ega-canvas" id="ega-canvas"
                     style="width:${EG_ATLAS_CANVAS_W}px; height:${EG_ATLAS_CANVAS_H}px;">
                </div>
            </div>
        </div>
        <div class="ega-zoom-controls">
            <button class="ega-zoom-btn" onclick="_egAtlasZoomStep(-1)">−</button>
            <span class="ega-zoom-level" id="ega-zoom-level">100%</span>
            <button class="ega-zoom-btn" onclick="_egAtlasZoomStep(1)">+</button>
            <button class="ega-zoom-btn" onclick="_egAtlasZoomFit()" title="Fit to screen">⤢</button>
        </div>
    </div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------RENDER-----------------------------------------------
//------------------------------------------------------------------------

// Rebuilds canvas nodes/links.
function _egAtlasRender() {
    const canvas = document.getElementById('ega-canvas');
    if (!canvas) return;

    // Drop stale selection (keeps it when the node still exists).
    if (_egAtlasSelectedNodeId && !egAtlasNodeById(_egAtlasSelectedNodeId)) {
        _egAtlasSelectedNodeId = null;
    }

    _egAtlasStashCounts = egAtlasCountStashedMaps();

    canvas.innerHTML = `${_egAtlasBuildLinksSVG()}${EG_ATLAS_NODES.map(_egAtlasBuildNodeHTML).join('')}`;

    _egAtlasApplySearch();
    _egAtlasRefreshSelection();
}

// Centers the scrollable viewport on the atlas heart.
function _egAtlasCenterViewport() {
    const vp = document.querySelector('#screen-endgame-atlas .ega-viewport');
    const wrap = document.getElementById('ega-zoom-wrap');
    if (!vp || !wrap) return;
    vp.scrollLeft = Math.max(0, (wrap.offsetWidth - vp.clientWidth) / 2);
    vp.scrollTop = Math.max(0, (wrap.offsetHeight - vp.clientHeight) / 2);
}

//-------------------ZOOM & PAN-----------------------------------------

function _egAtlasViewportEl() {
    return document.querySelector('#screen-endgame-atlas .ega-viewport');
}

// Zoom level that shows the whole atlas inside the viewport.
function _egAtlasComputeFitZoom() {
    const vp = _egAtlasViewportEl();
    if (!vp || !vp.clientWidth) return 1;
    return Math.min(1,
        (vp.clientWidth - 8) / EG_ATLAS_CANVAS_W,
        (vp.clientHeight - 8) / EG_ATLAS_CANVAS_H);
}

// Reapplies the current zoom to the wrap/canvas elements.
function _egAtlasApplyZoomStyles() {
    const wrap = document.getElementById('ega-zoom-wrap');
    const canvas = document.getElementById('ega-canvas');
    if (wrap) {
        wrap.style.width = (EG_ATLAS_CANVAS_W * _egAtlasZoom) + 'px';
        wrap.style.height = (EG_ATLAS_CANVAS_H * _egAtlasZoom) + 'px';
    }
    if (canvas) canvas.style.transform = 'scale(' + _egAtlasZoom + ')';
    const lvl = document.getElementById('ega-zoom-level');
    if (lvl) lvl.textContent = Math.round(_egAtlasZoom * 100) + '%';
}

// Sets a new zoom level. With an anchor (viewport-relative x/y) the map
// point under the anchor stays fixed — zooming into the cursor position.
function _egAtlasSetZoom(z, ax, ay, isFit) {
    const vp = _egAtlasViewportEl();
    if (!vp) return;
    z = Math.max(EG_ATLAS_ZOOM_MIN, Math.min(EG_ATLAS_ZOOM_MAX, z));
    if (Math.abs(z - _egAtlasZoom) < 0.0005) return;

    const sx = vp.scrollLeft, sy = vp.scrollTop;
    const old = _egAtlasZoom;
    _egAtlasZoom = z;
    _egAtlasZoomIsFit = !!isFit;
    _egAtlasApplyZoomStyles();

    if (ax != null) {
        vp.scrollLeft = Math.max(0, (sx + ax) * z / old - ax);
        vp.scrollTop = Math.max(0, (sy + ay) * z / old - ay);
    }
}

// Steps zoom in/out around the viewport centre (the − / + buttons).
function _egAtlasZoomStep(dir) {
    const vp = _egAtlasViewportEl();
    const ax = vp ? vp.clientWidth / 2 : null;
    const ay = vp ? vp.clientHeight / 2 : null;
    _egAtlasSetZoom(_egAtlasZoom * (dir > 0 ? 1.25 : 1 / 1.25), ax, ay, false);
}

// Resets the view: zoom so the whole atlas fits, centered.
function _egAtlasZoomFit() {
    _egAtlasSetZoom(_egAtlasComputeFitZoom(), null, null, true);
    _egAtlasCenterViewport();
}

// Delegated wheel / drag-pan / resize handling. Attached once to the
// screen element (and window), so they survive the innerHTML refreshes.
function _egAtlasAttachViewHandlers(screen) {
    // Wheel = zoom around the cursor position.
    screen.addEventListener('wheel', (e) => {
        if (!e.target.closest('.ega-viewport')) return;
        e.preventDefault();
        const vp = _egAtlasViewportEl();
        if (!vp) return;
        const r = vp.getBoundingClientRect();
        const d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
        _egAtlasSetZoom(_egAtlasZoom * Math.pow(1.0018, -d), e.clientX - r.left, e.clientY - r.top, false);
    }, { passive: false });

    // Left-drag = pan.
    let pan = null;
    screen.addEventListener('mousedown', (e) => {
        const vp = e.target.closest('.ega-viewport');
        if (!vp || e.button !== 0) return;
        pan = { vp, x: e.clientX, y: e.clientY, sx: vp.scrollLeft, sy: vp.scrollTop, moved: false };
    });
    window.addEventListener('mousemove', (e) => {
        if (!pan) return;
        const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
        if (!pan.moved && Math.abs(dx) + Math.abs(dy) > 4) {
            pan.moved = true;
            pan.vp.classList.add('ega-panning');
        }
        if (pan.moved) {
            pan.vp.scrollLeft = pan.sx - dx;
            pan.vp.scrollTop = pan.sy - dy;
        }
    });
    window.addEventListener('mouseup', () => {
        if (!pan) return;
        if (pan.moved) {
            pan.vp.classList.remove('ega-panning');
            // Swallow the click that follows a pan so nodes are not selected.
            _egAtlasPanEndedAt = performance.now();
        }
        pan = null;
    });

    // Keep the fitted view fitted when the window changes size.
    window.addEventListener('resize', () => {
        if (_egAtlasZoomIsFit && document.getElementById('screen-endgame-atlas')?.classList.contains('active')) {
            _egAtlasSetZoom(_egAtlasComputeFitZoom(), null, null, true);
            _egAtlasCenterViewport();
        }
    });
}

let _egAtlasPanEndedAt = 0;

// Refreshes the selected-node outline without rebuilding the canvas.
function _egAtlasRefreshSelection() {
    document.querySelectorAll('.ega-node.selected').forEach(el => el.classList.remove('selected'));
    if (!_egAtlasSelectedNodeId) return;
    const el = document.getElementById(`ega-node-${_egAtlasSelectedNodeId}`);
    if (el) el.classList.add('selected');
}

// Click handler: pin a region (outline highlight). Clicks that end a
// pan drag are swallowed so panning never selects a node.
function _egAtlasSelectNode(nodeId) {
    if (performance.now() - _egAtlasPanEndedAt < 150) return;
    _egAtlasSelectedNodeId = (_egAtlasSelectedNodeId === nodeId) ? null : nodeId;
    _egAtlasRefreshSelection();
}

// Search: highlights matching regions with a glowing blue node frame
// (.ega-search-hit). Matches by localized region name AND by tier —
// either the roman numeral shown inside the nodes (e.g. 'XV',
// case-insensitive) or the plain tier number (e.g. '15', 'tier 15').
// Empty query clears the highlight.
function _egAtlasSearch(query) {
    _egAtlasSearchQuery = (query || '').trim();
    _egAtlasApplySearch();
}

// Resolves a search query to a tier number (0 when the query is not a
// tier): accepts the roman numerals I..XVI (case-insensitive, same set
// the nodes display) and plain numbers 1-16, optionally prefixed with
// 'tier' or 't' (e.g. 'tier 15', 't15').
function _egAtlasQueryTier(q) {
    if (!q) return 0;
    const numMatch = q.match(/^(?:t(?:ier)?\s*)?(\d{1,2})$/);
    if (numMatch) {
        const n = parseInt(numMatch[1], 10);
        return (n >= 1 && n <= EG_ATLAS_MAX_TIER) ? n : 0;
    }
    const romans = (typeof EG_MAP_TIER_ROMANS !== 'undefined' && EG_MAP_TIER_ROMANS.length === EG_ATLAS_MAX_TIER)
        ? EG_MAP_TIER_ROMANS.map(r => r.toLowerCase())
        : ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi'];
    const idx = romans.indexOf(q);
    return idx >= 0 ? idx + 1 : 0;
}

function _egAtlasApplySearch() {
    const canvas = document.getElementById('ega-canvas');
    if (!canvas) return;

    const q = _egAtlasSearchQuery.toLowerCase();
    const tierQ = _egAtlasQueryTier(q);
    EG_ATLAS_NODES.forEach(node => {
        const el = document.getElementById(`ega-node-${node.id}`);
        if (!el) return;
        const hit = (q && egAtlasNodeName(node).toLowerCase().includes(q))
            || (tierQ > 0 && node.tier === tierQ);
        el.classList.toggle('ega-search-hit', !!hit);
    });
}


//------------------------------------------------------------------------
//-------------------STYLES (INJECTED ONCE)-------------------------------
//------------------------------------------------------------------------

function _egAtlasEnsureStyles() {
    if (document.getElementById('ega-atlas-style')) return;

    const style = document.createElement('style');
    style.id = 'ega-atlas-style';
    style.textContent = `
        .ega-layout {
            width: 100%; height: 100%; display: flex; flex-direction: column;
            font-family: var(--PX, monospace); color: var(--accent2, #e8daef);
        }

        /* ── Header ─────────────────────────────────────────────────── */
        .ega-header {
            display: flex; flex-direction: column; align-items: stretch;
            gap: 7px; padding: 8px 16px;
            background: linear-gradient(180deg, rgba(34, 25, 9, 0.55), rgba(16, 12, 6, 0.35));
            border-bottom: 1px solid var(--border, #444);
        }
        .ega-header-top {
            display: flex; align-items: center; justify-content: space-between;
            gap: 18px; flex-wrap: wrap;
        }

        /* ── Per-tier progress strip ────────────────────────────────── */
        .ega-tier-progress {
            display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
        }
        .ega-tier-progress-label {
            font-size: 9px; letter-spacing: 1px; color: #9d93c9;
            margin-right: 6px;
        }
        .ega-tier-cell {
            display: inline-flex; align-items: center; justify-content: center;
            gap: 5px; min-width: 46px; height: 21px; padding: 0 7px;
            background: rgba(255, 255, 255, 0.045);
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 4px; cursor: default; user-select: none;
            font-family: var(--PX, monospace); box-sizing: border-box;
        }
        .ega-tier-cell .ega-tier-num { font-size: 8px; }
        .ega-tier-cell .ega-tier-count { font-size: 9px; color: #e8e4f0; }
        .ega-tier-cell:hover { border-color: #fff; }
        .ega-tier-cell.ega-zero { opacity: 0.55; }
        .ega-tier-cell.ega-full {
            border-color: rgba(245, 217, 138, 0.75);
            background: linear-gradient(180deg, rgba(88, 68, 22, 0.55), rgba(48, 37, 13, 0.55));
        }
        .ega-tier-cell.ega-full .ega-tier-count { color: #f5d98a; }
        .ega-header-main { display: flex; flex-direction: column; gap: 4px; min-width: 240px; }
        .ega-header-line { display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; }
        .ega-header-progress { font-size: 11px; letter-spacing: 1px; color: var(--accent, #c8a84b); }
        .ega-header-highest { font-size: 11px; letter-spacing: 1px; color: var(--accent, #c8a84b); opacity: 0.85; }
        .ega-progress-track {
            width: 300px; max-width: 40vw; height: 4px; border-radius: 2px;
            background: rgba(255, 255, 255, 0.08); overflow: hidden;
        }
        .ega-progress-fill {
            height: 100%; border-radius: 2px;
            background: linear-gradient(90deg, #8a6d2b, #f5d98a);
            transition: width 0.4s ease;
        }
        .ega-search {
            font-family: var(--PX, monospace); font-size: 9px; color: #e8e4f0;
            background: rgba(10, 10, 18, 0.9); border: 1px solid #555; border-radius: 4px;
            padding: 6px 10px; width: 190px; outline: none;
        }
        .ega-search:focus { border-color: #c8a84b; }
        .ega-search::placeholder { color: #7d7890; }

        /* ── Framed map area ────────────────────────────────────────── */
        .ega-frame {
            flex-grow: 1; margin: 10px 14px 12px; min-height: 0;
            border: 2px solid #6b5836; border-radius: 10px;
            box-shadow: inset 0 0 0 2px #1c160c, 0 0 0 1px #241c10;
            background: #0a0a15; overflow: hidden; position: relative;
        }
        .ega-viewport {
            width: 100%; height: 100%; overflow: auto; position: relative;
            display: flex;            /* centers the map when it fits */
            cursor: grab; user-select: none;
            background:
                radial-gradient(ellipse at 50% 48%, rgba(150, 115, 45, 0.08), transparent 55%),
                radial-gradient(ellipse at 50% 50%, rgba(55, 70, 140, 0.10), transparent 80%),
                #0a0a15;
        }
        .ega-viewport.ega-panning { cursor: grabbing; }
        .ega-zoom-wrap { position: relative; transform-origin: 0 0; margin: auto; flex-shrink: 0; }
        .ega-canvas {
            position: absolute; top: 0; left: 0; transform-origin: 0 0;
            background-image:
                radial-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1.6px),
                radial-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1.6px);
            background-size: 46px 46px, 46px 46px;
            background-position: 0 0, 23px 23px;
        }
        .ega-links-svg { position: absolute; inset: 0; pointer-events: none; }

        /* ── Nodes: small squares with the tier numeral inside ─────── */
        .ega-node {
            position: absolute; box-sizing: border-box; cursor: pointer; user-select: none;
            display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
        }
        .ega-node-label {
            font-size: 9px; line-height: 1.2; letter-spacing: 0.3px;
            max-width: 150px; text-align: center; margin-bottom: 3px;
            text-shadow: 1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000, 0 2px 2px #000;
            white-space: normal;
        }
        .ega-node-box {
            position: relative; box-sizing: border-box; flex-shrink: 0;
            background: rgba(16, 14, 10, 0.92);
            border: 1px solid #555; border-radius: 4px;
            display: flex; align-items: center; justify-content: center;
        }
        .ega-node-numeral {
            font-family: var(--PX, monospace); letter-spacing: 0;
            text-shadow: 1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000;
        }
        .ega-node:hover .ega-node-box { border-color: #fff; }
        .ega-node.selected .ega-node-box { outline: 1px solid #fff; outline-offset: 1px; }

        .ega-node-completed .ega-node-box {
            border-color: #f5d98a;
            background: linear-gradient(180deg, rgba(88, 68, 22, 0.95), rgba(48, 37, 13, 0.95));
        }
        .ega-node-available .ega-node-box { border-color: var(--egcol); }
        .ega-node-locked { opacity: 0.45; cursor: default; }
        .ega-node-locked:hover .ega-node-box { border-color: #555; }

        .ega-node-done {
            position: absolute; top: -6px; right: -6px;
            font-size: 8px; color: #111; background: #f5d98a;
            width: 13px; height: 13px; line-height: 13px; text-align: center;
            border-radius: 50%;
        }
        .ega-node-count {
            position: absolute; bottom: 1px; left: 3px;
            font-size: 7px; color: #fff; opacity: 0.9;
            text-shadow: 1px 1px 0 #000, -1px 1px 0 #000;
        }
        /* Boss tooltip is built with the shared eg-tt-* tooltip frame
           (see _egAtlasBuildNodeTooltipHTML) — nothing extra below the
           node square. */

        /* ── Search highlighting ───────────────────────────────────── */
        /* Placed after the node state rules so it wins the cascade. */
        .ega-search-hit .ega-node-box {
            border-color: #4aa3ff;
            animation: ega-search-pulse 1.6s ease-in-out infinite;
        }
        .ega-search-hit .ega-node-label { color: #8ecbff !important; }
        .ega-node-locked.ega-search-hit { opacity: 0.8; }
        @keyframes ega-search-pulse {
            0%, 100% { box-shadow: 0 0 0 1px rgba(74, 163, 255, 0.55), 0 0 10px 2px rgba(74, 163, 255, 0.35); }
            50%      { box-shadow: 0 0 0 2px rgba(74, 163, 255, 0.95), 0 0 16px 4px rgba(74, 163, 255, 0.60); }
        }

        /* ── Zoom controls ──────────────────────────────────────── */
        .ega-zoom-controls {
            position: absolute; right: 12px; bottom: 10px;
            display: flex; align-items: center; gap: 4px;
            background: rgba(13, 11, 20, 0.9); border: 1px solid #555;
            border-radius: 6px; padding: 3px 6px; z-index: 6;
        }
        .ega-zoom-btn {
            font-family: var(--PX, monospace); font-size: 10px; color: #e8e4f0;
            background: #1a1a2e; border: 1px solid #555; border-radius: 4px;
            padding: 4px 8px; cursor: pointer; line-height: 1;
        }
        .ega-zoom-btn:hover { border-color: #c8a84b; }
        .ega-zoom-level { font-size: 9px; color: #9d93c9; min-width: 40px; text-align: center; }
    `;
    document.head.appendChild(style);
}


//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP-------------------------------------
//------------------------------------------------------------------------

function _egAtlasCreateScreen() {
    _egAtlasEnsureStyles();
    const screen = document.createElement('div');
    screen.id = 'screen-endgame-atlas';
    screen.className = 'screen';
    screen.innerHTML = _egAtlasBuildFullScreenHTML();
    document.body.appendChild(screen);
    _egAtlasAttachViewHandlers(screen);
}

function ensureEndgameAtlasScreen() {
    if (!document.getElementById('screen-endgame-atlas')) _egAtlasCreateScreen();
}

// Entry point — opens the Atlas of Statistica screen.
// An optional backFn argument (name of a global function, e.g.
// 'showEndgameHub') overrides where the BACK button returns to — used
// when the atlas is opened from the endgame hub character sheet.
function showEndgameAtlas(backFn) {
    if (typeof backFn === 'string') _egAtlasBackFn = backFn;
    else _egAtlasBackFn = 'showEndgameGate';
    ensureEndgameAtlasScreen();

    if (typeof switchScreen === 'function') {
        switchScreen('screen-endgame-atlas');
    } else {
        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        document.getElementById('screen-endgame-atlas').style.display = 'block';
    }

    // Refresh header/canvas so completions from the last run show up,
    // then fit the whole atlas to the window and center it.
    const screen = document.getElementById('screen-endgame-atlas');
    screen.innerHTML = _egAtlasBuildFullScreenHTML();
    _egAtlasRender();
    _egAtlasZoomFit();
}
