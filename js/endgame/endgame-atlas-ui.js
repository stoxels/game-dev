//------------------------------------------------------------------------
//-------------------ENDGAME ATLAS SCREEN---------------------------------
//------------------------------------------------------------------------
// PoE-style atlas overview screen:
//   - One column per map tier (1..16), regions rendered as nodes
//   - SVG connection lines between linked regions
//   - Node states: completed (gold ✔) / available (lit) / locked (dim)
//   - Hover tooltip per node, click for a details panel at the bottom
//   - Header shows atlas completion progress and highest cleared tier
//
// Entry point: showEndgameAtlas() — opens from the Probability Gate
// topbar button and from the Nexus of Worlds door.
// Back navigation returns to the Probability Gate (the map device hub).
//
// Dependencies (must be loaded before this file):
//   endgame-atlas.js — EG_ATLAS_NODES / status helpers
//   screens.js       — switchScreen()
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------LAYOUT CONSTANTS-------------------------------------
//------------------------------------------------------------------------

const EG_ATLAS_COL_W = 134;   // horizontal distance between tiers
const EG_ATLAS_ROW_H = 108;   // vertical distance between slots
const EG_ATLAS_PAD_X = 70;
const EG_ATLAS_PAD_Y = 46;
const EG_ATLAS_NODE_W = 112;
const EG_ATLAS_NODE_H = 78;

let _egAtlasSelectedNodeId = null;


function _egAtlasNodeX(node) {
    return EG_ATLAS_PAD_X + (node.tier - 1) * EG_ATLAS_COL_W;
}

function _egAtlasNodeY(node) {
    return EG_ATLAS_PAD_Y + node.slot * EG_ATLAS_ROW_H;
}


//------------------------------------------------------------------------
//-------------------HTML HELPERS-----------------------------------------
//------------------------------------------------------------------------

function _egAtlasNodeStatus(node) {
    if (egAtlasIsCompleted(node.id)) return 'completed';
    if (egAtlasIsUnlocked(node.id)) return 'available';
    return 'locked';
}

function _egAtlasStatusColor(status) {
    switch (status) {
        case 'completed': return '#f5d98a';
        case 'available': return '#7fd67f';
        default: return '#555';
    }
}

function _egAtlasStatusLabel(status) {
    switch (status) {
        case 'completed': return `✔ ${t('eg_atlas_status_completed')}`;
        case 'available': return t('eg_atlas_status_available');
        default: return `🔒 ${t('eg_atlas_status_locked')}`;
    }
}

// Builds one region node div.
function _egAtlasBuildNodeHTML(node) {
    const status = _egAtlasNodeStatus(node);
    const name = egAtlasNodeName(node);
    const checkmark = status === 'completed' ? '<span class="ega-node-check">✔</span>' : '';

    return `
<div class="ega-node ega-${status}"
     id="ega-node-${node.id}"
     style="left:${_egAtlasNodeX(node)}px; top:${_egAtlasNodeY(node)}px;"
     onclick="_egAtlasSelectNode('${node.id}')"
     onmouseenter="_egAtlasShowNodeTooltip('${node.id}', event)"
     onmousemove="typeof moveGameTooltip === 'function' && moveGameTooltip(event)"
     onmouseleave="typeof hideGameTooltip === 'function' && hideGameTooltip()">
    <div class="ega-node-tier">T${node.tier}</div>
    ${checkmark}
    <div class="ega-node-name">${name}</div>
</div>`;
}

// Builds all SVG connection lines (behind the nodes).
function _egAtlasBuildLinksSVG() {
    const width = _egAtlasLayoutWidth();
    const height = _egAtlasLayoutHeight();
    let lines = '';
    const drawn = new Set();

    EG_ATLAS_NODES.forEach(node => {
        const x1 = _egAtlasNodeX(node) + EG_ATLAS_NODE_W / 2;
        const y1 = _egAtlasNodeY(node) + EG_ATLAS_NODE_H / 2;

        node.links.forEach(linkId => {
            // Each edge exists twice (bidirectional links) — draw once.
            const key = [node.id, linkId].sort().join('|');
            if (drawn.has(key)) return;
            drawn.add(key);

            const other = egAtlasNodeById(linkId);
            if (!other) return;

            const x2 = _egAtlasNodeX(other) + EG_ATLAS_NODE_W / 2;
            const y2 = _egAtlasNodeY(other) + EG_ATLAS_NODE_H / 2;

            // Line brightness follows the better end's status.
            const best = [_egAtlasNodeStatus(node), _egAtlasNodeStatus(other)]
                .sort((a, b) => a === 'completed' ? -1 : b === 'completed' ? 1 : a === 'available' ? -1 : 1)[0];
            const color = _egAtlasStatusColor(best);
            const opacity = best === 'locked' ? 0.25 : 0.55;
            const litClass = (best === 'completed') ? ' ega-link-completed' : '';

            lines += `<line class="ega-link${litClass}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" \
style="stroke:${color}; opacity:${opacity};"></line>`;
        });
    });

    return `<svg class="ega-links-svg" width="${width}" height="${height}">${lines}</svg>`;
}

function _egAtlasLayoutWidth() {
    return EG_ATLAS_PAD_X * 2 + (EG_ATLAS_MAX_TIER - 1) * EG_ATLAS_COL_W + EG_ATLAS_NODE_W;
}

function _egAtlasLayoutHeight() {
    const maxSlots = Math.max(...EG_ATLAS_TIER_NAMES.map(n => n.length));
    return EG_ATLAS_PAD_Y * 2 + (maxSlots - 1) * EG_ATLAS_ROW_H + EG_ATLAS_NODE_H;
}

// Builds the header strip: title, progress and legend.
function _egAtlasBuildHeaderHTML() {
    const prog = egAtlasProgress();
    return `
<div class="ega-header">
    <span class="ega-header-progress">
        ${t('eg_atlas_progress')
            .replace('{c}', prog.completed)
            .replace('{n}', prog.total)}
        <span class="ega-header-highest">
            ${t('eg_atlas_highest_tier').replace('{n}', prog.highestTier)}
        </span>
    </span>
    <span class="ega-legend">
        <span class="ega-legend-item"><span class="ega-swatch ega-sw-completed"></span>${t('eg_atlas_status_completed')}</span>
        <span class="ega-legend-item"><span class="ega-swatch ega-sw-available"></span>${t('eg_atlas_status_available')}</span>
        <span class="ega-legend-item"><span class="ega-swatch ega-sw-locked"></span>${t('eg_atlas_status_locked')}</span>
    </span>
</div>`;
}

// Builds the bottom details panel for the currently selected node.
function _egAtlasBuildDetailsHTML() {
    const node = egAtlasNodeById(_egAtlasSelectedNodeId);
    if (!node) {
        return `<div class="ega-details empty">${t('eg_atlas_select_hint')}</div>`;
    }

    const status = _egAtlasNodeStatus(node);
    const color = _egAtlasStatusColor(status);
    const monsterLevel = node.tier * 4;

    const connections = node.links
        .map(id => egAtlasNodeById(id))
        .filter(Boolean)
        .sort((a, b) => a.tier - b.tier || a.slot - b.slot)
        .map(other => {
            const st = _egAtlasNodeStatus(other);
            return `<span class="ega-conn ega-${st}" onclick="_egAtlasSelectNode('${other.id}')">\
${egAtlasNodeName(other)} <small>T${other.tier}</small></span>`;
        })
        .join('');

    const hint = (status === 'locked')
        ? `<div class="ega-details-hint">${t('eg_atlas_locked_hint')}</div>`
        : (status === 'completed'
            ? `<div class="ega-details-hint done">${t('eg_atlas_completed_hint')}</div>`
            : `<div class="ega-details-hint avail">${t('eg_atlas_run_hint')}</div>`);

    return `
<div class="ega-details">
    <div class="ega-details-title" style="color:${color};">
        ${egAtlasNodeName(node)}
        <small>· T${node.tier} · ${t('eg_map_monster_level_tt').replace('{n}', monsterLevel)}</small>
    </div>
    <div class="ega-details-status" style="color:${color};">${_egAtlasStatusLabel(status)}</div>
    ${hint}
    <div class="ega-details-conns">${connections}</div>
</div>`;
}

// Assembles the full atlas screen body.
function _egAtlasBuildFullScreenHTML() {
    return `
<div class="ega-layout">
    <div class="eg-topbar">
        <button class="eg-back-btn" onclick="showEndgameGate()">${t('btn_back')}</button>
        <span class="eg-topbar-title">${t('eg_atlas_title')}</span>
    </div>
    ${_egAtlasBuildHeaderHTML()}
    <div class="ega-viewport">
        <div class="ega-canvas" id="ega-canvas"
             style="width:${_egAtlasLayoutWidth()}px; height:${_egAtlasLayoutHeight()}px;">
        </div>
    </div>
    <div id="ega-details-panel"></div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------RENDER-----------------------------------------------
//------------------------------------------------------------------------

// Rebuilds canvas nodes/links and the details panel.
function _egAtlasRender() {
    const canvas = document.getElementById('ega-canvas');
    if (!canvas) return;

    // Drop stale selection (keeps selection when the node still exists).
    if (_egAtlasSelectedNodeId && !egAtlasNodeById(_egAtlasSelectedNodeId)) {
        _egAtlasSelectedNodeId = null;
    }

    canvas.innerHTML = `${_egAtlasBuildLinksSVG()}${EG_ATLAS_NODES.map(_egAtlasBuildNodeHTML).join('')}`;

    const panel = document.getElementById('ega-details-panel');
    if (panel) panel.innerHTML = _egAtlasBuildDetailsHTML();
}

// Click handler: select a node and refresh its highlight + details panel.
function _egAtlasSelectNode(nodeId) {
    _egAtlasSelectedNodeId = nodeId;

    document.querySelectorAll('.ega-node.selected').forEach(el => el.classList.remove('selected'));
    const el = document.getElementById(`ega-node-${nodeId}`);
    if (el) el.classList.add('selected');

    const panel = document.getElementById('ega-details-panel');
    if (panel) {
        panel.innerHTML = _egAtlasBuildDetailsHTML();
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Hover tooltip body for a node (uses the shared floating game tooltip).
function _egAtlasShowNodeTooltip(nodeId, event) {
    const node = egAtlasNodeById(nodeId);
    if (!node || typeof showGameTooltip !== 'function') return;

    const status = _egAtlasNodeStatus(node);
    const color = _egAtlasStatusColor(status);
    const html = `
<strong style="color:${color};">${egAtlasNodeName(node)}</strong><br>
<span style="color:#ccc;">${t('eg_map_tier_tt').replace('{n}', node.tier)}
 · ${t('eg_map_monster_level_tt').replace('{n}', node.tier * 4)}</span><br>
<span style="color:${color};">${_egAtlasStatusLabel(status)}</span>`;

    showGameTooltip(html, event);
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

        .ega-header {
            display: flex; align-items: center; justify-content: space-between;
            gap: 14px; padding: 8px 18px; flex-wrap: wrap;
            background: rgba(20, 15, 5, 0.35); border-bottom: 1px solid var(--border, #444);
        }
        .ega-header-progress { font-size: 12px; letter-spacing: 1px; color: var(--accent, #c8a84b); }
        .ega-header-highest { margin-left: 14px; opacity: 0.85; }
        .ega-legend { display: flex; align-items: center; gap: 14px; font-size: 9px; letter-spacing: 1px; }
        .ega-legend-item { display: inline-flex; align-items: center; gap: 5px; color: var(--accent2, #ccc); }
        .ega-swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
        .ega-sw-completed { background: #f5d98a; box-shadow: 0 0 6px rgba(245,217,138,.7); }
        .ega-sw-available { background: #7fd67f; }
        .ega-sw-locked { background: #555; }

        .ega-viewport {
            flex-grow: 1; overflow: auto; position: relative;
            background:
                radial-gradient(ellipse at 50% 0%, rgba(200,168,75,0.06), transparent 60%),
                var(--bg, #0d0d17);
        }
        .ega-canvas { position: relative; min-width: 100%; min-height: 100%; }
        .ega-links-svg { position: absolute; inset: 0; pointer-events: none; }
        .ega-link { stroke-width: 2; }
        .ega-link-completed { filter: drop-shadow(0 0 3px rgba(245,217,138,0.7)); }

        .ega-node {
            position: absolute; width: 112px; height: 78px; box-sizing: border-box;
            padding: 6px 7px; cursor: pointer; user-select: none;
            background: rgba(20, 16, 8, 0.92); border: 1px solid #555; border-radius: 6px;
            transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
        }
        .ega-node:hover { transform: translateY(-2px); z-index: 3; }
        .ega-node.selected { outline: 2px solid #fff; z-index: 4; }

        .ega-available { border-color: #7fd67f; box-shadow: 0 0 10px rgba(127,214,127,0.25); }
        .ega-completed { border-color: #f5d98a; background: rgba(64, 52, 16, 0.92); box-shadow: 0 0 12px rgba(245,217,138,0.35); }
        .ega-locked { opacity: 0.45; cursor: default; }
        .ega-locked:hover { transform: none; }

        .ega-node-tier {
            position: absolute; top: -8px; left: -8px;
            font-size: 9px; padding: 1px 5px; border-radius: 3px;
            background: var(--surface, #1a1a2e); border: 1px solid var(--border2, #555);
            color: var(--accent, #c8a84b);
        }
        .ega-completed .ega-node-tier { border-color: #f5d98a; color: #f5d98a; }
        .ega-node-check {
            position: absolute; top: -8px; right: -8px;
            font-size: 11px; color: #111; background: #f5d98a;
            width: 18px; height: 18px; line-height: 18px; text-align: center;
            border-radius: 50%; box-shadow: 0 0 8px rgba(245,217,138,0.8);
        }
        .ega-node-name {
            font-size: 9px; line-height: 1.35; letter-spacing: 0.5px;
            color: var(--accent2, #ddd); margin-top: 8px; word-wrap: break-word;
        }
        .ega-completed .ega-node-name { color: #f5d98a; }

        #ega-details-panel { flex-shrink: 0; border-top: 1px solid var(--border, #444); }
        .ega-details { padding: 10px 18px 14px; background: rgba(20, 15, 5, 0.5); }
        .ega-details.empty { font-size: 10px; color: var(--accent2, #999); letter-spacing: 1px; }
        .ega-details-title { font-size: 13px; letter-spacing: 1px; }
        .ega-details-title small { color: var(--accent2, #aaa); font-size: 9px; }
        .ega-details-status { font-size: 10px; margin-top: 3px; letter-spacing: 1px; }
        .ega-details-hint { font-size: 9px; color: var(--accent2, #999); margin-top: 4px; }
        .ega-details-hint.done { color: #f5d98a; }
        .ega-details-hint.avail { color: #7fd67f; }
        .ega-details-conns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .ega-conn {
            font-size: 9px; padding: 3px 8px; cursor: pointer;
            border: 1px solid var(--border2, #555); border-radius: 3px;
            color: var(--accent2, #ccc);
        }
        .ega-conn small { opacity: 0.6; }
        .ega-conn.ega-completed { border-color: #f5d98a; color: #f5d98a; }
        .ega-conn.ega-available { border-color: #7fd67f; color: #7fd67f; }
        .ega-conn.ega-locked { opacity: 0.5; cursor: default; }
        .ega-conn:hover:not(.ega-locked) { filter: brightness(1.25); }
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
}

function ensureEndgameAtlasScreen() {
    if (!document.getElementById('screen-endgame-atlas')) _egAtlasCreateScreen();
}

// Entry point — opens the Atlas of Worlds screen.
function showEndgameAtlas() {
    ensureEndgameAtlasScreen();

    if (typeof switchScreen === 'function') {
        switchScreen('screen-endgame-atlas');
    } else {
        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        document.getElementById('screen-endgame-atlas').style.display = 'block';
    }

    // Refresh header/canvas so completions from the last run show up.
    const screen = document.getElementById('screen-endgame-atlas');
    screen.innerHTML = _egAtlasBuildFullScreenHTML();
    _egAtlasRender();
}
