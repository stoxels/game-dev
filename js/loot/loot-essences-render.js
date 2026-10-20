//----------------------------------------------------------------------
//--------------------------ESSENCE TAB PANEL---------------------------
//----------------------------------------------------------------------

// The whole essence tab: the fixed cell grid, the slot filter dropdown
// that dims incompatible essences, the hover previews on empty cells,
// and the stylesheet. The filter lives here because picking one
// re-renders this panel - a separate filter module would have to import
// this one back, so the two are kept together on purpose.

import { GAME_ART } from '../combat/combat-art.js';
import { _dndBuildCurrencyChipHTML } from '../hub/hub-drag-and-drop.js';
import { t } from '../translation/translations.js';
import { ALL_BASE_TYPES } from './equipment-base-items.js';
import { SLOT_MOD_TABLE_MAP } from './loot-equipment-mod-tables.js';
import { ESSENCE_COLS, ESSENCE_ROWS, _ESSENCE_FAMILIES, _essenceCompatibleSlotTypes, _essenceIdForSlot, _essenceStash } from './loot-essences.js';
import { _essenceDefForId, _essenceResolveFamilyId } from './loot-essences-defs.js';
import { _buildEssenceDetailHTML } from './loot-essences-tooltip.js';
import {_eligibleTiers, _familyAllowedOnBase} from './loot-mod-application.js';


//----------------------------------------------------------------------
//-----------------------------FILTER STATE-----------------------------
//----------------------------------------------------------------------

// Which slot type the dropdown is set to: 'all', or one slotType like
// 'shield' or 'weapon'. Only this file reads or writes it.
let _essenceFilterSlotType = 'all';


//----------------------------------------------------------------------
//----------------------------FILTER HELPERS----------------------------
//----------------------------------------------------------------------

// Returns all slot types that have at least one essence compatible with them
export function _getEssenceFilterSlotTypes() {
    const slotTypes = new Set();
    for (const familyId of _ESSENCE_FAMILIES) {
        const slots = _essenceCompatibleSlotTypes(familyId);
        for (const slot of slots) {
            if (_essenceCanApplyToSlotType(familyId, slot)) {
                slotTypes.add(slot);
            }
        }
    }
    return Array.from(slotTypes).sort();
}

// Checks if an essence (by familyId) is compatible with the current filter
export function _essenceMatchesFilter(familyId) {
    if (_essenceFilterSlotType === 'all') return true;
    const result = _essenceCanApplyToSlotType(familyId, _essenceFilterSlotType);
    return result;
}

// More thorough check: verifies the essence family can actually roll on at least one base of the filtered slot type
// (considers defense gating and ilvl eligibility, not just mod table presence)
export function _essenceCanApplyToSlotType(familyId, slotType) {
    if (typeof SLOT_MOD_TABLE_MAP === 'undefined') {
        return false;
    }
    const getter = SLOT_MOD_TABLE_MAP[slotType];
    if (!getter) {
        return false;
    }
    let modTable = null;
    try { modTable = getter(); } catch (e) {
        return false;
    }
    if (!modTable) {
        return false;
    }

    const hasFamily = (modTable.prefixes && modTable.prefixes[familyId]) || (modTable.suffixes && modTable.suffixes[familyId]);
    if (!hasFamily) {
        return false;
    }

    if (typeof ALL_BASE_TYPES === 'undefined') {
        return true;
    }

    for (const base of ALL_BASE_TYPES) {
        if (base.slotType !== slotType) continue;
        const defenses = base.defenses || {};
        if (!_familyAllowedOnBase(familyId, defenses)) continue;
        const sections = [modTable.prefixes || {}, modTable.suffixes || {}];
        for (const sec of sections) {
            const fam = sec[familyId];
            if (!fam) continue;
            const tiers = _eligibleTiers(fam, base.minLevel || 1);
            if (tiers && tiers.length > 0) return true;
        }
    }
    return false;
}

// Sets the essence filter and re-renders the essence tab
export function _setEssenceFilter(slotType) {
    _essenceFilterSlotType = slotType;
    _renderEssenceStash();
    // Update the dropdown to reflect the current selection
    const select = document.getElementById('sx-essence-filter-select');
    if (select) select.value = slotType;
}


//----------------------------------------------------------------------
//------------------------------TAB MARKUP------------------------------
//----------------------------------------------------------------------

// Builds a single essence tab cell div (drop target) with empty-slot hover preview.
export function _buildEssenceCellHTML(row, col) {
    return `
<div class="sx-inv-cell sx-essence-cell"
     id="sx-essence-cell-${row}-${col}"
     data-row="${row}" data-col="${col}"
     data-eg-dropzone="essence"
     onmouseenter="_onEssenceCellEnter(${row}, ${col}, event)"
     onmousemove="_onEssenceCellMove(event)"
     onmouseleave="_onEssenceCellLeave()"
     ondragover="hubDragOver(event)"
     ondrop="hubDropOnEssence(event, ${row}, ${col})"
     ondragleave="hubDragLeave(event)">
</div>`;
}

// Assembles the essence tab panel: label + the essence cell grid.
export function _buildEssenceTabHTML() {
    let cellsHTML = '';
    for (let r = 0; r < ESSENCE_ROWS; r++) {
        for (let c = 0; c < ESSENCE_COLS; c++) {
            cellsHTML += _buildEssenceCellHTML(r, c);
        }
    }
    // Build filter dropdown options
    const slotTypes = _getEssenceFilterSlotTypes();
    const slotLabel = (st) => {
        const key = 'eg_slot_' + st;
        try { const tr = t(key); if (tr && tr !== key) return tr; } catch (e) { }
        return st.charAt(0).toUpperCase() + st.slice(1);
    };
    let filterOptions = `<option value="all">${t('eg_essence_filter_all') || 'All'}</option>`;
    for (const st of slotTypes) {
        const selected = _essenceFilterSlotType === st ? ' selected' : '';
        filterOptions += `<option value="${st}"${selected}>${slotLabel(st)}</option>`;
    }

    return `
<div class="sx-panel sx-panel-essence">
    <div class="sx-panel-label">
        ${t('eg_essences_tab')}
        <select id="sx-essence-filter-select" class="sx-essence-filter-select" onchange="_setEssenceFilter(this.value)" data-tip-t="eg_essence_filter_title">
            ${filterOptions}
        </select>
    </div>
    <div class="sx-essence-grid" id="sx-essence-grid"
         style="grid-template-columns: repeat(${ESSENCE_COLS}, 1fr);">
        ${cellsHTML}
    </div>
</div>`;
}


//----------------------------------------------------------------------
//----------------------------CELL RENDERING----------------------------
//----------------------------------------------------------------------

// Empty-slot hover preview - mirrors Orbs & Shards behavior.
export function _onEssenceCellEnter(row, col, e) {
    const stash = (typeof _essenceStash !== 'undefined') ? _essenceStash : null;
    const item = stash && stash[row] ? stash[row][col] : null;
    if (item) return; // occupied → chip's own onmouseenter handles tooltip
    const assignedId = _essenceIdForSlot(row, col);
    if (!assignedId) return; // decorative empty cell
    const def = _essenceDefForId(assignedId);
    if (!def) return;
    // Build tooltip from def (reuse currency/essence style)
    const ttName = def.name || assignedId;
    const ttIcon = def.icon || '🧬';
    const ttDesc = def.description || '';
    // heal missing category for display
    let essenceDetailHTML = '';
    try { essenceDetailHTML = _buildEssenceDetailHTML(def); } catch (err) { essenceDetailHTML = ''; }
    const html = `
<div class="sx-tt-frame" style="--tt-border:#b59248;">
    <div class="sx-tt-header">
        <div class="sx-tt-icon" style="opacity:0.55;">${GAME_ART.html('item', assignedId, ttIcon)}</div>
        <div class="sx-tt-name" style="color:#f5d98a; opacity:0.9;">${ttName}</div>
        <div class="sx-tt-rarity-line" style="color:#b59248;">${t('eg_rarity_essence')} - ${t('eg_empty_slot_hint') || 'Empty slot'}</div>
    </div>
    <div class="sx-tt-section"><div class="sx-tt-desc" style="opacity:0.85;">${ttDesc}</div></div>
    ${essenceDetailHTML}
</div>`;
    if (typeof showGameTooltip === 'function') globalThis.showGameTooltip(html, e);
}
export function _onEssenceCellMove(e) {
    const cell = e.currentTarget || (e.target.closest && e.target.closest('.sx-essence-cell'));
    if (!cell) return;
    const r = +cell.dataset.row, c = +cell.dataset.col;
    const stash = (typeof _essenceStash !== 'undefined') ? _essenceStash : null;
    const item = stash && stash[r] ? stash[r][c] : null;
    if (item) return;
    if (_essenceIdForSlot(r, c) && typeof moveGameTooltip === 'function') globalThis.moveGameTooltip(e);
}
export function _onEssenceCellLeave() {
    if (typeof hideGameTooltip === 'function') globalThis.hideGameTooltip();
}

// Re-renders a single cell in the essence tab grid (fixed-slot with placeholder).
export function _renderEssenceCell(row, col) {
    if (!_essenceStash[row]) return;
    const cell = document.getElementById(`sx-essence-cell-${row}-${col}`);
    if (!cell) return;
    const item = _essenceStash[row][col];
    const assignedId = _essenceIdForSlot(row, col);
    const def = assignedId ? _essenceDefForId(assignedId) : null;

    // Check filter compatibility
    let matchesFilter = true;
    if (!item && assignedId && def) {
        const familyId = _essenceResolveFamilyId(def);
        if (familyId && !_essenceMatchesFilter(familyId)) {
            matchesFilter = false;
        }
    } else if (item) {
        const familyId = _essenceResolveFamilyId(item);
        if (familyId && !_essenceMatchesFilter(familyId)) {
            matchesFilter = false;
        }
    }

    cell.classList.toggle('sx-essence-filtered-out', !matchesFilter);
    cell.style.pointerEvents = matchesFilter ? '' : 'none';

    // Hide filtered-out items completely (don't render chip)
    if (!matchesFilter) {
        cell.innerHTML = '';
        cell.classList.add('sx-essence-assigned-empty');
        cell.removeAttribute('data-empty-icon');
        cell.removeAttribute('data-tip');
        return;
    }

    if (item) {
        cell.innerHTML = _dndBuildCurrencyChipHTML(item);
        cell.classList.remove('sx-essence-assigned-empty');
        cell.removeAttribute('data-empty-icon');
        // The chip carries its own richer tooltip, so the cell-level one must go
        // - otherwise a leftover data-tip on the parent would keep winning the
        // closest() lookup for every child of the chip.
        cell.removeAttribute('data-tip');
    } else if (assignedId && def) {
        cell.innerHTML = '';
        cell.classList.add('sx-essence-assigned-empty');
        // Empty slots preview their essence art (dimmed via CSS) once
        // loaded, else the classic emoji ::after placeholder.
        const emptyArt = GAME_ART ? GAME_ART.url('item', assignedId) : null;
        if (emptyArt) {
            cell.removeAttribute('data-empty-icon');
            const img = document.createElement('img');
            img.src = emptyArt;
            img.alt = '';
            img.draggable = false;
            img.loading = 'lazy';
            img.decoding = 'async';
            img.className = 'sx-art-img sx-empty-slot-art';
            cell.appendChild(img);
        } else if (def.icon) {
            cell.setAttribute('data-empty-icon', def.icon);
        }
        cell.setAttribute('data-tip', globalThis._tipAttr(def.name || assignedId));
    } else {
        cell.innerHTML = '';
        cell.classList.remove('sx-essence-assigned-empty');
        cell.removeAttribute('data-empty-icon');
        cell.removeAttribute('data-tip');
    }
}

// Re-renders the entire essence tab grid.
export function _renderEssenceStash() {
    for (let r = 0; r < ESSENCE_ROWS; r++) {
        for (let c = 0; c < ESSENCE_COLS; c++) {
            _renderEssenceCell(r, c);
        }
    }
}

// Item art arrives asynchronously (images/items/manifest.json is fetched
// lazily on first use). Cells rendered with emoji fallbacks before that
// refresh here so they swap to art without needing a reload.
if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('sx-art-loaded', function () {
        try {
            if (document.getElementById('sx-essence-cell-0-0')) {
                _renderEssenceStash();
            }
        } catch (e) { /* essence tab not open - safe to ignore */ }
    });
}


//----------------------------------------------------------------------
//--------------------------------STYLES--------------------------------
//----------------------------------------------------------------------

(function _injectEssenceStyles() {
    if (document.getElementById('sx-essence-styles')) return;
    const style = document.createElement('style');
    style.id = 'sx-essence-styles';
    style.textContent = `
        /* Essence tab cells highlight while a drag hovers them */
        .sx-essence-cell.sx-dragover {
            outline: 2px solid #a0a0ff;
            background: rgba(100, 100, 255, 0.18);
        }
        /* Essence icon glow */
        .sx-item-chip.sx-rarity-essence .sx-item-chip-icon {
            filter: drop-shadow(0 0 4px #b06ae0);
        }
        /* Essence detail in tooltip */
        .sx-tt-essence-detail { padding-top: 6px; }
        .sx-tt-essence-title { color: #b59248; font-weight: 700; font-size: 0.82rem; margin-bottom: 5px; letter-spacing: 0.02em; }
        .sx-tt-essence-line { display: flex; gap: 6px; flex-wrap: wrap; font-size: 0.78rem; line-height: 1.45; padding: 3px 0; border-bottom: 1px solid rgba(181,146,72,0.08); }
        .sx-tt-essence-line:last-of-type { border-bottom: none; }
        .sx-tt-essence-slots { color: #9aa0b8; flex: 1 1 55%; min-width: 140px; white-space: normal; word-break: break-word; }
        .sx-tt-essence-mod { color: #f5d98a; font-weight: 600; white-space: normal; flex: 0 0 auto; word-break: break-word; overflow-wrap: anywhere; }
        .sx-tt-essence-mod.sx-tt-essence-random { color: #ccc; font-style: italic; font-weight: 400; }
        .sx-tt-essence-note { color: #7a7a8a; font-size: 0.70rem; line-height: 1.35; margin-top: 6px; font-style: italic; opacity: 0.9; }
        /* Empty assigned essence slot placeholder (mirrors currency) */
        .sx-essence-cell.sx-essence-assigned-empty {
            border: 1px dashed rgba(176,106,224,0.35);
            background: rgba(176,106,224,0.06);
            position: relative;
        }
        .sx-essence-cell.sx-essence-assigned-empty::after {
            content: attr(data-empty-icon);
            position: absolute;
            left: 50%; top: 50%;
            transform: translate(-50%,-50%);
            font-size: 1.1rem;
            opacity: 0.22;
            pointer-events: none;
        }
        .sx-essence-grid { gap: 4px; }
        .sx-essence-cell { position: relative; min-height: 38px; }
        .sx-panel-essence .sx-essence-grid { max-height: 560px; overflow-y: auto; padding-right: 4px; }
        .sx-panel-essence .sx-essence-grid::-webkit-scrollbar { width: 6px; }
        .sx-panel-essence .sx-essence-grid::-webkit-scrollbar-thumb { background: rgba(176,106,224,0.35); border-radius: 3px; }
        /* Essence filter dropdown */
        .sx-panel-label { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .sx-essence-filter-select {
            font-family: var(--PX);
            font-size: 12px;
            letter-spacing: 1px;
            padding: 2px 6px;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--accent);
            cursor: pointer;
            min-width: 100px;
        }
        .sx-essence-filter-select:hover { border-color: var(--accent2); }
        .sx-essence-filter-select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 4px rgba(102,252,241,0.3); }
        /* Filtered-out essence cells (dimmed when filter is active) */
        .sx-essence-cell.sx-essence-filtered-out {
            opacity: 0.2;
        }
        .sx-essence-cell.sx-essence-filtered-out.sx-essence-assigned-empty {
            border-color: rgba(176,106,224,0.1);
            background: rgba(176,106,224,0.02);
        }
        .sx-essence-cell.sx-essence-filtered-out .sx-item-chip {
            opacity: 0.3;
            filter: grayscale(1);
        }
    `;
    document.head.appendChild(style);
})();
