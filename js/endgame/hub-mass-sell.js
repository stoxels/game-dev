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
try { Object.defineProperty(globalThis, '_egMassSellKeepUnique', { get() { return _egMassSellKeepUnique; }, set(v) { _egMassSellKeepUnique = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egMassSellKeep', { get() { return _egMassSellKeep; }, set(v) { _egMassSellKeep = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egMassSellMinItemLevel', { get() { return _egMassSellMinItemLevel; }, set(v) { _egMassSellMinItemLevel = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egMassSellMinReqLevel', { get() { return _egMassSellMinReqLevel; }, set(v) { _egMassSellMinReqLevel = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egShowItemLevel', { get() { return _egShowItemLevel; }, set(v) { _egShowItemLevel = v; }, configurable: true }); } catch (e) {}

import { save } from '../state.js';
import { EG_ART } from './endgame-art.js';
import { _egShowTooltip } from '../loot/loot-currency.js';
import { _dndPickUp } from './endgame-hub-drag-and-drop.js';
import { _egClearTooltip } from './endgame-hub-tooltips.js';
import { _egIsItemBlocked } from '../loot/loot-requirements.js';
import { egSaveHubState } from './hub-save.js';
import { EG_INV_COLS, _egInventory } from './hub-stash.js';

export const _egChipRegistry = new Map();
export let _egChipCounter = 0;


// ── Mass-sell filter state ──────────────────────────────────────────────
// Which rarities are PROTECTED from mass sell (true = keep, false = sell).
// Ordered low → high so the modal can simply iterate the array.
export const EG_MASS_SELL_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'artifact', 'cursed'];
// Extra toggle: when true, unique items (isUnique) are never sold even if
// their underlying rarity would be sold.
export let _egMassSellKeepUnique = true;
// Map rarity → bool; initialised in _egLoadMassSellSettings().
export let _egMassSellKeep = null;
// Item level filter: keep items with itemLevel >= this value (0 = disabled)
export let _egMassSellMinItemLevel = 0;
// Required character level filter: keep items with requirements.level >= this value (0 = disabled)
export let _egMassSellMinReqLevel = 0;

// ── Item level display toggle ───────────────────────────────────────────
// true = show item level (itemLevel), false = show required character level (requirements.level)
export let _egShowItemLevel = true;
export function _egDefaultMassSellKeep() {
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
export function _egNormaliseMassSellKeep(raw) {
    const def = _egDefaultMassSellKeep();
    if (!raw || typeof raw !== 'object') return { ...def };
    const out = { ...def };
    for (const r of EG_MASS_SELL_RARITIES) {
        if (typeof raw[r] === 'boolean') out[r] = raw[r];
    }
    return out;
}
export function _egLoadMassSellSettings() {
    _egMassSellKeep = _egNormaliseMassSellKeep(globalThis.STATE && globalThis.STATE.egMassSellKeep);
    if (typeof globalThis.STATE !== 'undefined' && typeof globalThis.STATE.egMassSellKeepUnique === 'boolean') {
        _egMassSellKeepUnique = globalThis.STATE.egMassSellKeepUnique;
    } else {
        _egMassSellKeepUnique = true;
    }
    if (typeof globalThis.STATE !== 'undefined' && typeof globalThis.STATE.egShowItemLevel === 'boolean') {
        _egShowItemLevel = globalThis.STATE.egShowItemLevel;
    }
    if (typeof globalThis.STATE !== 'undefined' && typeof globalThis.STATE.egMassSellMinItemLevel === 'number') {
        _egMassSellMinItemLevel = Math.max(0, Math.floor(globalThis.STATE.egMassSellMinItemLevel));
    } else {
        _egMassSellMinItemLevel = 0;
    }
    if (typeof globalThis.STATE !== 'undefined' && typeof globalThis.STATE.egMassSellMinReqLevel === 'number') {
        _egMassSellMinReqLevel = Math.max(0, Math.floor(globalThis.STATE.egMassSellMinReqLevel));
    } else {
        _egMassSellMinReqLevel = 0;
    }
}
export function _egSaveMassSellSettings() {
    if (typeof STATE !== 'undefined') {
        STATE.egMassSellKeep = { ..._egMassSellKeep };
        STATE.egMassSellKeepUnique = _egMassSellKeepUnique;
        STATE.egShowItemLevel = _egShowItemLevel;
        STATE.egMassSellMinItemLevel = _egMassSellMinItemLevel;
        STATE.egMassSellMinReqLevel = _egMassSellMinReqLevel;
        if (typeof save === 'function') try { save(); } catch (e) {}
    }
    // also persist via the main hub save path
    if (typeof egSaveHubState === 'function') try { egSaveHubState(); } catch (e) {}
}
// Returns true when the item should be KEPT (NOT sold) under the current filter.
// Protection is an OR across all active keep criteria: unique, rarity,
// itemLevel threshold and required-level threshold. This matches the live
// preview in _egUpdateMassSellPreview so the confirmation counts and the
// actual sell agree.
export function _egIsProtectedFromMassSell(item) {
    if (!item) return true;
    if (_egMassSellKeepUnique && item.isUnique) return true;
    const rarity = (item.rarity || 'common').toLowerCase();
    if (_egMassSellKeep && _egMassSellKeep[rarity]) return true;
    // Item level filter: keep items with itemLevel >= minItemLevel (0 = disabled)
    if (_egMassSellMinItemLevel > 0 && item.itemLevel != null && item.itemLevel >= _egMassSellMinItemLevel) return true;
    // Required character level filter: keep items with requirements.level >= minReqLevel (0 = disabled)
    if (_egMassSellMinReqLevel > 0 && item.requirements && item.requirements.level != null && item.requirements.level >= _egMassSellMinReqLevel) return true;
    return false;
}
export function _egMassSellCounts() {
    let keep = 0, sell = 0;
    if (!globalThis._egInventory) return { keep, sell };
    for (let r = 0; r < _egInventory.length; r++) {
        for (let c = 0; c < EG_INV_COLS; c++) {
            const it = _egInventory[r][c];
            if (!it) continue;
            if (_egIsProtectedFromMassSell(it)) keep++; else sell++;
        }
    }
    return { keep, sell };
}
// Load mass-sell defaults immediately (STATE may already hold a save).
_egLoadMassSellSettings();

export function _egBuildItemChipHTML(item, size = 'normal') {
    const rarityClass = item.rarity ? `eg-rarity-${item.rarity}` : '';
    const sizeClass = size === 'large' ? 'eg-item-chip-large' : '';
    // Items whose stat requirements cannot currently be met get a red flag
    // (see _egIsItemBlocked in endgame-requirements.js).
    const blockedClass = _egIsItemBlocked(item) ? 'eg-req-blocked' : '';
    // Equipment items show either item level or required character level in the top-left corner of the slot.
    const itemLevel = item.itemLevel;
    const reqLevel = (item.requirements && item.requirements.level != null) ? item.requirements.level : item.itemLevel;
    const showLevel = _egShowItemLevel ? itemLevel : reqLevel;
    const ilvlBadge = (item.category === 'equip' && showLevel != null)
        ? `<span class="eg-item-ilvl">${showLevel}</span>`
        : '';
    // Map items show their map tier instead.
    const mapTierBadge = (item.category === 'map' && item.mapTier != null)
        ? `<span class="eg-item-ilvl eg-map-tier-badge">${item.mapTier}</span>`
        : '';
    const chipId = `egchip-${++_egChipCounter}`;
    _egChipRegistry.set(chipId, item);

    return `
<div class="eg-item-chip ${rarityClass} ${sizeClass} ${blockedClass}"
     id="${chipId}"
     onmousedown="_egHandleChipMouseDown(event, '${chipId}')"
     onmouseenter="_egShowTooltipFromChip('${chipId}', event)"
     onmousemove="_egMoveTooltip(event)"
     onmouseleave="_egClearTooltip()">
    ${ilvlBadge}
    ${mapTierBadge}
    <span class="eg-item-chip-icon">${EG_ART.html('item', item.baseId, item.icon || '📦')}</span>
    <span class="eg-item-chip-name">${item.name || '???'}</span>
</div>`;
}



export function _egShowTooltipFromChip(chipId, e) {
    const item = _egChipRegistry.get(chipId);
    if (item) {
        _egShowTooltip(item, e);
    }
}

// Mouse-down handler for item chips - initiates custom drag-and-drop
export function _egHandleChipMouseDown(e, chipId) {
    if (e.button !== 0) return; // left-click only
    const chip = document.getElementById(chipId);
    if (!chip) return;
    e.preventDefault();
    _egClearTooltip();
    _dndPickUp(e, chip);
}
