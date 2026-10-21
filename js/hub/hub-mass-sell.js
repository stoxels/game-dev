//------------------------------------------------------------------------
//-------------------MASS SELL SETTINGS & ITEM CHIPS----------------------
//------------------------------------------------------------------------
// Mass-sell protection rules (rarity, unique, level filters), the counts
// shown in the sell modal, and the shared item-chip builder and registry.
// Settings load from STATE at module load. Other files (the sell modal, the
// item-level toggle) reassign the lets below through the globalThis accessors.
//------------------------------------------------------------------------

try { Object.defineProperty(globalThis, '_massSellKeepUnique', { get() { return _massSellKeepUnique; }, set(v) { _massSellKeepUnique = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_massSellKeep', { get() { return _massSellKeep; }, set(v) { _massSellKeep = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_massSellMinItemLevel', { get() { return _massSellMinItemLevel; }, set(v) { _massSellMinItemLevel = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_massSellMinReqLevel', { get() { return _massSellMinReqLevel; }, set(v) { _massSellMinReqLevel = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_showItemLevel', { get() { return _showItemLevel; }, set(v) { _showItemLevel = v; }, configurable: true }); } catch (e) {}

import { STATE, save } from '../state.js';
import { GAME_ART } from '../combat/combat-art.js';
import { _showHubTooltip } from '../loot/loot-currency-tooltip.js';
import { _dndPickUp } from './hub-drag-and-drop.js';
import { _clearTooltip } from './hub-tooltips.js';
import { _isItemBlocked } from '../loot/loot-requirements.js';
import { saveHubState } from './hub-save.js';
import { INV_COLS, _inventory } from './hub-stash.js';


//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------

// Item chips on screen, by chip id (looked up by hover and drag handlers).
export const _chipRegistry = new Map();
export let _chipCounter = 0;

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

// Item level display toggle: true = show item level (itemLevel), false = show required character level (requirements.level)
export let _showItemLevel = true;

//------------------------------------------------------------------------
//-------------------SETTINGS & PROTECTION RULES--------------------------
//------------------------------------------------------------------------

// The factory protection setting for each rarity.
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

// Cleans a saved keep-map: unknown or non-boolean entries fall back to defaults.
export function _normaliseMassSellKeep(raw) {
    const def = _defaultMassSellKeep();
    if (!raw || typeof raw !== 'object') return { ...def };
    const out = { ...def };
    for (const r of MASS_SELL_RARITIES) {
        if (typeof raw[r] === 'boolean') out[r] = raw[r];
    }
    return out;
}

// Reads the mass-sell and item-level settings out of STATE (reads go through
// globalThis because this runs while the module is still loading).
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
// Writes the settings into STATE and saves, then saves the hub as well.
export function _saveMassSellSettings() {
    if (STATE) {
        STATE.egMassSellKeep = { ..._massSellKeep };
        STATE.egMassSellKeepUnique = _massSellKeepUnique;
        STATE.egShowItemLevel = _showItemLevel;
        STATE.egMassSellMinItemLevel = _massSellMinItemLevel;
        STATE.egMassSellMinReqLevel = _massSellMinReqLevel;
        try { save(); } catch (e) {}
    }
    try { saveHubState(); } catch (e) {}
}

// True when the item should be KEPT (not sold). Any one active keep rule
// protects it: unique, rarity, item-level threshold or required-level
// threshold. Matches the live preview in _updateMassSellPreview, so the
// confirmation counts and the actual sell agree.
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

// Counts stash items that would be kept vs sold under the current rules.
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
// Load the settings right away (STATE may already hold a save).
_loadMassSellSettings();


//------------------------------------------------------------------------
//-------------------ITEM CHIPS-------------------------------------------
//------------------------------------------------------------------------

// Builds the HTML for one item chip and registers the item under a new
// chip id so the hover and drag handlers can find it again.
export function _buildItemChipHTML(item, size = 'normal') {
    const rarityClass = item.rarity ? `sx-rarity-${item.rarity}` : '';
    const sizeClass = size === 'large' ? 'sx-item-chip-large' : '';
    // Items whose stat requirements cannot currently be met get a red flag
    // (see _isItemBlocked in loot-requirements.js).
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

// Shows the hover tooltip for the item behind a chip id.
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
