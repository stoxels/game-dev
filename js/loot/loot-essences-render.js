//----------------------------------------------------------------------
//--------------------------ESSENCE TAB PANEL---------------------------
//----------------------------------------------------------------------

// The whole essence tab: the fixed cell grid, the slot filter dropdown
// that dims incompatible essences, the hover previews on empty cells,
// and the stylesheet. The filter lives here because picking one
// re-renders this panel - a separate filter module would have to import
// this one back, so the two are kept together on purpose.

import { EG_ART } from '../endgame/endgame-art.js';
import { _dndBuildCurrencyChipHTML } from '../endgame/endgame-hub-drag-and-drop.js';
import { t } from '../translation/translations.js';
import { EG_ALL_BASE_TYPES } from './equipment-base-items.js';
import { EG_SLOT_MOD_TABLE_MAP } from './loot-equipment-mod-tables.js';
import { EG_ESSENCE_COLS, EG_ESSENCE_ROWS, _EG_ESSENCE_FAMILIES, _egEssenceCompatibleSlotTypes, _egEssenceIdForSlot, _egEssenceStash } from './loot-essences.js';
import { _egEssenceDefForId, _egEssenceResolveFamilyId } from './loot-essences-defs.js';
import { _egBuildEssenceDetailHTML } from './loot-essences-tooltip.js';
import {_egEligibleTiers, _egFamilyAllowedOnBase} from './loot-mod-application.js';


//----------------------------------------------------------------------
//-----------------------------FILTER STATE-----------------------------
//----------------------------------------------------------------------

// Which slot type the dropdown is set to: 'all', or one slotType like
// 'shield' or 'weapon'. Only this file reads or writes it.
let _egEssenceFilterSlotType = 'all';


//----------------------------------------------------------------------
//----------------------------FILTER HELPERS----------------------------
//----------------------------------------------------------------------

// Returns all slot types that have at least one essence compatible with them
export function _egGetEssenceFilterSlotTypes() {
    const slotTypes = new Set();
    for (const familyId of _EG_ESSENCE_FAMILIES) {
        const slots = _egEssenceCompatibleSlotTypes(familyId);
        for (const slot of slots) {
            if (_egEssenceCanApplyToSlotType(familyId, slot)) {
                slotTypes.add(slot);
            }
        }
    }
    return Array.from(slotTypes).sort();
}

// Checks if an essence (by familyId) is compatible with the current filter
export function _egEssenceMatchesFilter(familyId) {
    if (_egEssenceFilterSlotType === 'all') return true;
    const result = _egEssenceCanApplyToSlotType(familyId, _egEssenceFilterSlotType);
    return result;
}

// More thorough check: verifies the essence family can actually roll on at least one base of the filtered slot type
// (considers defense gating and ilvl eligibility, not just mod table presence)
export function _egEssenceCanApplyToSlotType(familyId, slotType) {
    if (typeof EG_SLOT_MOD_TABLE_MAP === 'undefined') {
        return false;
    }
    const getter = EG_SLOT_MOD_TABLE_MAP[slotType];
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

    if (typeof EG_ALL_BASE_TYPES === 'undefined') {
        return true;
    }

    for (const base of EG_ALL_BASE_TYPES) {
        if (base.slotType !== slotType) continue;
        const defenses = base.defenses || {};
        if (!_egFamilyAllowedOnBase(familyId, defenses)) continue;
        const sections = [modTable.prefixes || {}, modTable.suffixes || {}];
        for (const sec of sections) {
            const fam = sec[familyId];
            if (!fam) continue;
            const tiers = _egEligibleTiers(fam, base.minLevel || 1);
            if (tiers && tiers.length > 0) return true;
        }
    }
    return false;
}

// Sets the essence filter and re-renders the essence tab
export function _egSetEssenceFilter(slotType) {
    _egEssenceFilterSlotType = slotType;
    _egRenderEssenceStash();
    // Update the dropdown to reflect the current selection
    const select = document.getElementById('eg-essence-filter-select');
    if (select) select.value = slotType;
}


//----------------------------------------------------------------------
//------------------------------TAB MARKUP------------------------------
//----------------------------------------------------------------------

// Builds a single essence tab cell div (drop target) with empty-slot hover preview.
export function _egBuildEssenceCellHTML(row, col) {
    return `
<div class="eg-inv-cell eg-essence-cell"
     id="eg-essence-cell-${row}-${col}"
     data-row="${row}" data-col="${col}"
     data-eg-dropzone="essence"
     onmouseenter="_egOnEssenceCellEnter(${row}, ${col}, event)"
     onmousemove="_egOnEssenceCellMove(event)"
     onmouseleave="_egOnEssenceCellLeave()"
     ondragover="egDragOver(event)"
     ondrop="egDropOnEssence(event, ${row}, ${col})"
     ondragleave="egDragLeave(event)">
</div>`;
}

// Assembles the essence tab panel: label + the essence cell grid.
export function _egBuildEssenceTabHTML() {
    let cellsHTML = '';
    for (let r = 0; r < EG_ESSENCE_ROWS; r++) {
        for (let c = 0; c < EG_ESSENCE_COLS; c++) {
            cellsHTML += _egBuildEssenceCellHTML(r, c);
        }
    }
    // Build filter dropdown options
    const slotTypes = _egGetEssenceFilterSlotTypes();
    const slotLabel = (st) => {
        const key = 'eg_slot_' + st;
        try { const tr = t(key); if (tr && tr !== key) return tr; } catch (e) { }
        return st.charAt(0).toUpperCase() + st.slice(1);
    };
    let filterOptions = `<option value="all">${t('eg_essence_filter_all') || 'All'}</option>`;
    for (const st of slotTypes) {
        const selected = _egEssenceFilterSlotType === st ? ' selected' : '';
        filterOptions += `<option value="${st}"${selected}>${slotLabel(st)}</option>`;
    }

    return `
<div class="eg-panel eg-panel-essence">
    <div class="eg-panel-label">
        ${t('eg_essences_tab')}
        <select id="eg-essence-filter-select" class="eg-essence-filter-select" onchange="_egSetEssenceFilter(this.value)" data-tip-t="eg_essence_filter_title">
            ${filterOptions}
        </select>
    </div>
    <div class="eg-essence-grid" id="eg-essence-grid"
         style="grid-template-columns: repeat(${EG_ESSENCE_COLS}, 1fr);">
        ${cellsHTML}
    </div>
</div>`;
}


//----------------------------------------------------------------------
//----------------------------CELL RENDERING----------------------------
//----------------------------------------------------------------------

// Empty-slot hover preview - mirrors Orbs & Shards behavior.
export function _egOnEssenceCellEnter(row, col, e) {
    const stash = (typeof _egEssenceStash !== 'undefined') ? _egEssenceStash : null;
    const item = stash && stash[row] ? stash[row][col] : null;
    if (item) return; // occupied → chip's own onmouseenter handles tooltip
    const assignedId = _egEssenceIdForSlot(row, col);
    if (!assignedId) return; // decorative empty cell
    const def = _egEssenceDefForId(assignedId);
    if (!def) return;
    // Build tooltip from def (reuse currency/essence style)
    const ttName = def.name || assignedId;
    const ttIcon = def.icon || '🧬';
    const ttDesc = def.description || '';
    // heal missing category for display
    let essenceDetailHTML = '';
    try { essenceDetailHTML = _egBuildEssenceDetailHTML(def); } catch (err) { essenceDetailHTML = ''; }
    const html = `
<div class="eg-tt-frame" style="--tt-border:#b59248;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon" style="opacity:0.55;">${EG_ART.html('item', assignedId, ttIcon)}</div>
        <div class="eg-tt-name" style="color:#f5d98a; opacity:0.9;">${ttName}</div>
        <div class="eg-tt-rarity-line" style="color:#b59248;">${t('eg_rarity_essence')} - ${t('eg_empty_slot_hint') || 'Empty slot'}</div>
    </div>
    <div class="eg-tt-section"><div class="eg-tt-desc" style="opacity:0.85;">${ttDesc}</div></div>
    ${essenceDetailHTML}
</div>`;
    if (typeof showGameTooltip === 'function') globalThis.showGameTooltip(html, e);
}
export function _egOnEssenceCellMove(e) {
    const cell = e.currentTarget || (e.target.closest && e.target.closest('.eg-essence-cell'));
    if (!cell) return;
    const r = +cell.dataset.row, c = +cell.dataset.col;
    const stash = (typeof _egEssenceStash !== 'undefined') ? _egEssenceStash : null;
    const item = stash && stash[r] ? stash[r][c] : null;
    if (item) return;
    if (_egEssenceIdForSlot(r, c) && typeof moveGameTooltip === 'function') globalThis.moveGameTooltip(e);
}
export function _egOnEssenceCellLeave() {
    if (typeof hideGameTooltip === 'function') globalThis.hideGameTooltip();
}

// Re-renders a single cell in the essence tab grid (fixed-slot with placeholder).
export function _egRenderEssenceCell(row, col) {
    if (!_egEssenceStash[row]) return;
    const cell = document.getElementById(`eg-essence-cell-${row}-${col}`);
    if (!cell) return;
    const item = _egEssenceStash[row][col];
    const assignedId = _egEssenceIdForSlot(row, col);
    const def = assignedId ? _egEssenceDefForId(assignedId) : null;

    // Check filter compatibility
    let matchesFilter = true;
    if (!item && assignedId && def) {
        const familyId = _egEssenceResolveFamilyId(def);
        if (familyId && !_egEssenceMatchesFilter(familyId)) {
            matchesFilter = false;
        }
    } else if (item) {
        const familyId = _egEssenceResolveFamilyId(item);
        if (familyId && !_egEssenceMatchesFilter(familyId)) {
            matchesFilter = false;
        }
    }

    cell.classList.toggle('eg-essence-filtered-out', !matchesFilter);
    cell.style.pointerEvents = matchesFilter ? '' : 'none';

    // Hide filtered-out items completely (don't render chip)
    if (!matchesFilter) {
        cell.innerHTML = '';
        cell.classList.add('eg-essence-assigned-empty');
        cell.removeAttribute('data-empty-icon');
        cell.removeAttribute('data-tip');
        return;
    }

    if (item) {
        cell.innerHTML = _dndBuildCurrencyChipHTML(item);
        cell.classList.remove('eg-essence-assigned-empty');
        cell.removeAttribute('data-empty-icon');
        // The chip carries its own richer tooltip, so the cell-level one must go
        // - otherwise a leftover data-tip on the parent would keep winning the
        // closest() lookup for every child of the chip.
        cell.removeAttribute('data-tip');
    } else if (assignedId && def) {
        cell.innerHTML = '';
        cell.classList.add('eg-essence-assigned-empty');
        // Empty slots preview their essence art (dimmed via CSS) once
        // loaded, else the classic emoji ::after placeholder.
        const emptyArt = EG_ART ? EG_ART.url('item', assignedId) : null;
        if (emptyArt) {
            cell.removeAttribute('data-empty-icon');
            const img = document.createElement('img');
            img.src = emptyArt;
            img.alt = '';
            img.draggable = false;
            img.loading = 'lazy';
            img.decoding = 'async';
            img.className = 'eg-art-img eg-empty-slot-art';
            cell.appendChild(img);
        } else if (def.icon) {
            cell.setAttribute('data-empty-icon', def.icon);
        }
        cell.setAttribute('data-tip', globalThis._tipAttr(def.name || assignedId));
    } else {
        cell.innerHTML = '';
        cell.classList.remove('eg-essence-assigned-empty');
        cell.removeAttribute('data-empty-icon');
        cell.removeAttribute('data-tip');
    }
}

// Re-renders the entire essence tab grid.
export function _egRenderEssenceStash() {
    for (let r = 0; r < EG_ESSENCE_ROWS; r++) {
        for (let c = 0; c < EG_ESSENCE_COLS; c++) {
            _egRenderEssenceCell(r, c);
        }
    }
}

// Item art arrives asynchronously (images/items/manifest.json is fetched
// lazily on first use). Cells rendered with emoji fallbacks before that
// refresh here so they swap to art without needing a reload.
if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('eg-art-loaded', function () {
        try {
            if (document.getElementById('eg-essence-cell-0-0')) {
                _egRenderEssenceStash();
            }
        } catch (e) { /* essence tab not open - safe to ignore */ }
    });
}


//----------------------------------------------------------------------
//--------------------------------STYLES--------------------------------
//----------------------------------------------------------------------

(function _egInjectEssenceStyles() {
    if (document.getElementById('eg-essence-styles')) return;
    const style = document.createElement('style');
    style.id = 'eg-essence-styles';
    style.textContent = `
        /* Essence tab cells highlight while a drag hovers them */
        .eg-essence-cell.eg-dragover {
            outline: 2px solid #a0a0ff;
            background: rgba(100, 100, 255, 0.18);
        }
        /* Essence icon glow */
        .eg-item-chip.eg-rarity-essence .eg-item-chip-icon {
            filter: drop-shadow(0 0 4px #b06ae0);
        }
        /* PoE-style essence detail in tooltip */
        .eg-tt-essence-detail { padding-top: 6px; }
        .eg-tt-essence-title { color: #b59248; font-weight: 700; font-size: 0.82rem; margin-bottom: 5px; letter-spacing: 0.02em; }
        .eg-tt-essence-line { display: flex; gap: 6px; flex-wrap: wrap; font-size: 0.78rem; line-height: 1.45; padding: 3px 0; border-bottom: 1px solid rgba(181,146,72,0.08); }
        .eg-tt-essence-line:last-of-type { border-bottom: none; }
        .eg-tt-essence-slots { color: #9aa0b8; flex: 1 1 55%; min-width: 140px; white-space: normal; word-break: break-word; }
        .eg-tt-essence-mod { color: #f5d98a; font-weight: 600; white-space: normal; flex: 0 0 auto; word-break: break-word; overflow-wrap: anywhere; }
        .eg-tt-essence-mod.eg-tt-essence-random { color: #ccc; font-style: italic; font-weight: 400; }
        .eg-tt-essence-note { color: #7a7a8a; font-size: 0.70rem; line-height: 1.35; margin-top: 6px; font-style: italic; opacity: 0.9; }
        /* Empty assigned essence slot placeholder (mirrors currency) */
        .eg-essence-cell.eg-essence-assigned-empty {
            border: 1px dashed rgba(176,106,224,0.35);
            background: rgba(176,106,224,0.06);
            position: relative;
        }
        .eg-essence-cell.eg-essence-assigned-empty::after {
            content: attr(data-empty-icon);
            position: absolute;
            left: 50%; top: 50%;
            transform: translate(-50%,-50%);
            font-size: 1.1rem;
            opacity: 0.22;
            pointer-events: none;
        }
        .eg-essence-grid { gap: 4px; }
        .eg-essence-cell { position: relative; min-height: 38px; }
        .eg-panel-essence .eg-essence-grid { max-height: 560px; overflow-y: auto; padding-right: 4px; }
        .eg-panel-essence .eg-essence-grid::-webkit-scrollbar { width: 6px; }
        .eg-panel-essence .eg-essence-grid::-webkit-scrollbar-thumb { background: rgba(176,106,224,0.35); border-radius: 3px; }
        /* Essence filter dropdown */
        .eg-panel-label { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .eg-essence-filter-select {
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
        .eg-essence-filter-select:hover { border-color: var(--accent2); }
        .eg-essence-filter-select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 4px rgba(102,252,241,0.3); }
        /* Filtered-out essence cells (dimmed when filter is active) */
        .eg-essence-cell.eg-essence-filtered-out {
            opacity: 0.2;
        }
        .eg-essence-cell.eg-essence-filtered-out.eg-essence-assigned-empty {
            border-color: rgba(176,106,224,0.1);
            background: rgba(176,106,224,0.02);
        }
        .eg-essence-cell.eg-essence-filtered-out .eg-item-chip {
            opacity: 0.3;
            filter: grayscale(1);
        }
    `;
    document.head.appendChild(style);
})();
