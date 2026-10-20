//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Endgame hub: mass-sell settings, protection rules, counts + the shared
// item-chip builder/registry. Defaults load from STATE at eval time. The
// lets are rebound by the modal save-path (hub-mass-sell-modal.js) and the
// item-level toggle (hub-topbar.js) via the accessors below.

// Phase 4 split: write-through globalThis accessors. The facade and sibling
// split modules rebind these lets through globalThis.<name> assignment
// (imported module bindings are read-only views) - the established
// step-9/step-10 pattern.
import { STATE } from '../state.js';
try { Object.defineProperty(globalThis, '_massSellKeepUnique', { get() { return _massSellKeepUnique; }, set(v) { _massSellKeepUnique = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_massSellKeep', { get() { return _massSellKeep; }, set(v) { _massSellKeep = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_massSellMinItemLevel', { get() { return _massSellMinItemLevel; }, set(v) { _massSellMinItemLevel = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_massSellMinReqLevel', { get() { return _massSellMinReqLevel; }, set(v) { _massSellMinReqLevel = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_showItemLevel', { get() { return _showItemLevel; }, set(v) { _showItemLevel = v; }, configurable: true }); } catch (e) {}

import { save } from '../state.js';
import { GAME_ART } from './endgame-art.js';
import { _showHubTooltip } from '../loot/loot-currency-tooltip.js';
import { _dndPickUp } from './endgame-hub-drag-and-drop.js';
import { _clearTooltip } from './endgame-hub-tooltips.js';
import { _isItemBlocked } from '../loot/loot-requirements.js';
import { saveHubState } from './hub-save.js';
import { INV_COLS, _inventory } from './hub-stash.js';

export const _chipRegistry = new Map();
export let _chipCounter = 0;


// ── Mass-sell filter state ──────────────────────────────────────────────
// Which rarities are PROTECTED from mass sell (true = keep, false = sell).
// Ordered low → high so the modal can simply iterate the array.
export const MASS_SELL_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'artifact', 'cursed'];
// Extra toggle: when true, unique items (isUnique) are never sold even if
// their underlying rarity would be sold.
export let _massSellKeepUnique = true;
// Map rarity → bool; initialised in _loadMassSellSettings().
export let _massSellKeep = null;
// Item level filter: keep items with itemLevel >= this value (0 = disabled)
export let _massSellMinItemLevel = 0;
// Required character level filter: keep items with requirements.level >= this value (0 = disabled)
export let _massSellMinReqLevel = 0;

// ── Item level display toggle ───────────────────────────────────────────
// true = show item level (itemLevel), false = show required character level (requirements.level)
export let _showItemLevel = true;
export function _defaultMassSellKeep() {
    return {
        common: false,
        uncommon: false,
        rare: true,
        epic: true,
        legendary: true,
        artifact: true,
        cursed: false,
    };
}
export function _normaliseMassSellKeep(raw) {
    const def = _defaultMassSellKeep();
    if (!raw || typeof raw !== 'object') return { ...def };
    const out = { ...def };
    for (const r of MASS_SELL_RARITIES) {
        if (typeof raw[r] === 'boolean') out[r] = raw[r];
    }
    return out;
}
export function _loadMassSellSettings() {
    _massSellKeep = _normaliseMassSellKeep(globalThis.STATE && globalThis.STATE.egMassSellKeep);
    if (typeof globalThis.STATE !== 'undefined' && typeof globalThis.STATE.egMassSellKeepUnique === 'boolean') {
        _massSellKeepUnique = globalThis.STATE.egMassSellKeepUnique;
    } else {
        _massSellKeepUnique = true;
    }
    if (typeof globalThis.STATE !== 'undefined' && typeof globalThis.STATE.egShowItemLevel === 'boolean') {
        _showItemLevel = globalThis.STATE.egShowItemLevel;
    }
    if (typeof globalThis.STATE !== 'undefined' && typeof globalThis.STATE.egMassSellMinItemLevel === 'number') {
        _massSellMinItemLevel = Math.max(0, Math.floor(globalThis.STATE.egMassSellMinItemLevel));
    } else {
        _massSellMinItemLevel = 0;
    }
    if (typeof globalThis.STATE !== 'undefined' && typeof globalThis.STATE.egMassSellMinReqLevel === 'number') {
        _massSellMinReqLevel = Math.max(0, Math.floor(globalThis.STATE.egMassSellMinReqLevel));
    } else {
        _massSellMinReqLevel = 0;
    }
}
export function _saveMassSellSettings() {
    if (typeof STATE !== 'undefined') {
        STATE.egMassSellKeep = { ..._massSellKeep };
        STATE.egMassSellKeepUnique = _massSellKeepUnique;
        STATE.egShowItemLevel = _showItemLevel;
        STATE.egMassSellMinItemLevel = _massSellMinItemLevel;
        STATE.egMassSellMinReqLevel = _massSellMinReqLevel;
        if (typeof save === 'function') try { save(); } catch (e) {}
    }
    // also persist via the main hub save path
    if (typeof saveHubState === 'function') try { saveHubState(); } catch (e) {}
}
// Returns true when the item should be KEPT (NOT sold) under the current filter.
// Protection is an OR across all active keep criteria: unique, rarity,
// itemLevel threshold and required-level threshold. This matches the live
// preview in _updateMassSellPreview so the confirmation counts and the
// actual sell agree.
export function _isProtectedFromMassSell(item) {
    if (!item) return true;
    if (_massSellKeepUnique && item.isUnique) return true;
    const rarity = (item.rarity || 'common').toLowerCase();
    if (_massSellKeep && _massSellKeep[rarity]) return true;
    // Item level filter: keep items with itemLevel >= minItemLevel (0 = disabled)
    if (_massSellMinItemLevel > 0 && item.itemLevel != null && item.itemLevel >= _massSellMinItemLevel) return true;
    // Required character level filter: keep items with requirements.level >= minReqLevel (0 = disabled)
    if (_massSellMinReqLevel > 0 && item.requirements && item.requirements.level != null && item.requirements.level >= _massSellMinReqLevel) return true;
    return false;
}
export function _massSellCounts() {
    let keep = 0, sell = 0;
    if (!globalThis._inventory) return { keep, sell };
    for (let r = 0; r < _inventory.length; r++) {
        for (let c = 0; c < INV_COLS; c++) {
            const it = _inventory[r][c];
            if (!it) continue;
            if (_isProtectedFromMassSell(it)) keep++; else sell++;
        }
    }
    return { keep, sell };
}
// Load mass-sell defaults immediately (STATE may already hold a save).
_loadMassSellSettings();

export function _buildItemChipHTML(item, size = 'normal') {
    const rarityClass = item.rarity ? `sx-rarity-${item.rarity}` : '';
    const sizeClass = size === 'large' ? 'sx-item-chip-large' : '';
    // Items whose stat requirements cannot currently be met get a red flag
    // (see _isItemBlocked in endgame-requirements.js).
    const blockedClass = _isItemBlocked(item) ? 'sx-req-blocked' : '';
    // Equipment items show either item level or required character level in the top-left corner of the slot.
    const itemLevel = item.itemLevel;
    const reqLevel = (item.requirements && item.requirements.level != null) ? item.requirements.level : item.itemLevel;
    const showLevel = _showItemLevel ? itemLevel : reqLevel;
    const ilvlBadge = (item.category === 'equip' && showLevel != null)
        ? `<span class="sx-item-ilvl">${showLevel}</span>`
        : '';
    // Map items show their map tier instead.
    const mapTierBadge = (item.category === 'map' && item.mapTier != null)
        ? `<span class="sx-item-ilvl eg-map-tier-badge">${item.mapTier}</span>`
        : '';
    const chipId = `sx-chip-${++_chipCounter}`;
    _chipRegistry.set(chipId, item);
    // Map items share one baseId ('atlas_map') - the art system resolves
    // the tier-specific art (map_tNN) for them.
    const artId = GAME_ART.artIdForItem(item);

    return `
<div class="sx-item-chip ${rarityClass} ${sizeClass} ${blockedClass}"
     id="${chipId}"
     onmousedown="_handleChipMouseDown(event, '${chipId}')"
     onmouseenter="_showTooltipFromChip('${chipId}', event)"
     onmousemove="_moveTooltip(event)"
     onmouseleave="_clearTooltip()">
    ${ilvlBadge}
    ${mapTierBadge}
    <span class="sx-item-chip-icon">${GAME_ART.html('item', artId, item.icon || '📦')}</span>
    <span class="sx-item-chip-name">${item.name || '???'}</span>
</div>`;
}



export function _showTooltipFromChip(chipId, e) {
    const item = _chipRegistry.get(chipId);
    if (item) {
        _showHubTooltip(item, e);
    }
}

// Mouse-down handler for item chips - initiates custom drag-and-drop
export function _handleChipMouseDown(e, chipId) {
    if (e.button !== 0) return; // left-click only
    const chip = document.getElementById(chipId);
    if (!chip) return;
    e.preventDefault();
    _clearTooltip();
    _dndPickUp(e, chip);
}
