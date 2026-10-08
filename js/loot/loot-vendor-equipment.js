import { t, LANG } from '../translation/translations.js';
import { EG_ALL_BASE_TYPES } from './equipment-base-items.js';
import { EG_SLOT_ICONS } from './equipment-slot-icons.js';
import { EG_PLAYER_BASE_ATTRIBUTES, _egComputeLoadoutAttributes, _egFormatRequirementPart } from './loot-requirements.js';
import { _egClearTooltip } from '../endgame/endgame-hub-tooltips.js';
import { _egShowTooltip } from './loot-currency-tooltip.js';
import { _egAddItemToStash, _egEquipped } from '../endgame/endgame-hub.js';
import { _egGetPlayerLevel } from '../endgame/endgame-leveling.js';
import { _egvBuildCardHTML, _egvIconHTML, _egvPurchase, _egvRefreshGoldDisplay, _egvRefreshTabContent } from './loot-vendor-shared.js';

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Base types given away for free in the Starter Gear tab - basic level 1
// starter gear so new players can gear up without gold. No longer part
// of the Base Items tab.
export const EG_VENDOR_FREE_BASE_IDS = new Set([
    'wpn_1h_1',    // Rusted Sword (level 1 melee)
    'ranged_1',    // Shortbow (level 1 ranged)
    'chest_str_1', // Plate Vest (level 1 chest, pure armour)
    'pants_str_1', // Rusted Greaves (level 1 pants, armour)
    'chest_agi_1', // Tattered Doublet (level 1 chest, evasion)
    'pants_agi_1', // Worn Britches (level 1 pants, evasion)
    'chest_int_1', // Simple Robe (level 1 chest, absorption)
    'pants_int_1', // Silk Pantaloons (level 1 pants, absorption)
]);

// Returns an equipment base's gold price from its item level.
function _egvBaseItemPrice(base) {
    return Math.round(90 + Math.pow(base.minLevel || 1, 1.78) * 2.3);
}

// Slot filter for the Base Items tab; 'all' shows every slot.
let _egvBaseFilterSlot = 'all';

//------------------------------------------------------------------------
//-------------------STARTER GEAR TAB (FREE)-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------//------------------------------------------------------------------------

// Builds the free starter-gear cards in canonical slot order.
export function _egvBuildStarterTabHTML() {
    const slotOrder = _egvGetSlotOrder();
    const starterBases = EG_ALL_BASE_TYPES.filter(b => EG_VENDOR_FREE_BASE_IDS.has(b.id));
    // No filter - always show all 8 starter items, sorted by slot order
    starterBases.sort((a, b) => slotOrder.indexOf(a.slotType) - slotOrder.indexOf(b.slotType) || a.minLevel - b.minLevel);

    const cards = starterBases.map(base => {
        const name = (LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
        const missing = _egvGetMissingRequirements(base);
        return _egvBuildCardHTML({
            icon: _egvIconHTML(base.id, base.icon || EG_SLOT_ICONS[base.slotType] || '📦'),
            title: name,
            subtitle: `${t(`eg_slot_${base.slotType}`)} · ${t('eg_item_level').replace('{n}', base.minLevel)}`,
            desc: _egvBuildReqSummaryText(base),
            price: 0,
            buyCall: `_egvBuyBaseItem('${base.id}')`,
            extraAttrs: ` onmouseenter="_egvShowBaseTooltip('${base.id}', event)" onmouseleave="_egvHideBaseTooltip()"`,
            blockedReason: missing.length ? t('eg_vendor_cannot_equip').replace('{list}', missing.join(', ')) : '',
        });
    }).join('');

    return `<div class="egv-cards egv-cards-base">${cards}</div>`;
}

//------------------------------------------------------------------------
//-------------------BASE ITEMS TAB-----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Canonical slot order - first appearance inside EG_ALL_BASE_TYPES.
export function _egvGetSlotOrder() {
    const order = [];
    EG_ALL_BASE_TYPES.forEach(base => {
        if (!order.includes(base.slotType)) order.push(base.slotType);
    });
    return order;
}

// Requirement check against the player's live attributes/level.
// Returns a list of localized deficit strings ("Level 12", "5 Agi").
function _egvGetMissingRequirements(base) {
    const req = base.requirements || {};
    const missing = [];

    let level = _egGetPlayerLevel();
    if (level == null) level = EG_PLAYER_BASE_ATTRIBUTES.level;
    level = level == null ? Infinity : level;
    if ((req.level || 0) > level) {
        missing.push(_egFormatRequirementPart('level', req.level - level));
    }

    let attrs = { str: 0, agi: 0, int: 0 };
    const equippedList = Object.values(_egEquipped).filter(Boolean);
    attrs = _egComputeLoadoutAttributes(equippedList);
    ['str', 'agi', 'int'].forEach(stat => {
        if ((req[stat] || 0) > attrs[stat]) {
            missing.push(`${Math.round(req[stat] - attrs[stat])} ${t(`eg_attr_${stat}`)}`);
        }
    });

    return missing;
}

// Short "Requires ..." summary line for a base type.
function _egvBuildReqSummaryText(base) {
    const req = base.requirements || {};
    const parts = [];
    if ((req.level || 0) > 0) parts.push(t('eg_req_level').replace('{n}', req.level));
    ['str', 'agi', 'int'].forEach(stat => {
        if ((req[stat] || 0) > 0) parts.push(`${req[stat]} ${t(`eg_attr_${stat}`)}`);
    });
    return parts.length ? `${t('eg_vendor_requires')} ${parts.join(' · ')}` : '';
}

// Applies the slot filter chosen by the Base tab dropdown.
export function _egvSetBaseFilter(value) {
    _egvBaseFilterSlot = value;
    _egvRenderBaseListOnly();
}

// Re-renders only the base item list + filter controls (keeps focus/state).
export function _egvRenderBaseListOnly() {
    _egvHideBaseTooltip(); // hovered card may be replaced by the re-render
    const listEl = document.getElementById('egv-base-list');
    if (listEl) listEl.innerHTML = _egvBuildBaseListHTML();
    // Also refresh the filter dropdown selected state
    const sel = document.getElementById('egv-base-filter-select');
    if (sel) sel.value = _egvBaseFilterSlot;
    _egvRefreshGoldDisplay();
}

// Returns non-starter bases after the current filter and sort rules.
function _egvGetFilteredSortedBases() {
    // Exclude free starter gear - now in its own tab
    let bases = EG_ALL_BASE_TYPES.filter(b => !EG_VENDOR_FREE_BASE_IDS.has(b.id));

    if (_egvBaseFilterSlot !== 'all') {
        bases = bases.filter(b => b.slotType === _egvBaseFilterSlot);
    }

    // Auto-sort: highest item level on top (descending). When filtering by
    // a single slot, this surfaces the best bases for that slot first.
    // When showing all slots, still group by slot order but with highest
    // ilvl first within each slot group.
    const slotOrder = _egvGetSlotOrder();
    if (_egvBaseFilterSlot === 'all') {
        bases.sort((a, b) => slotOrder.indexOf(a.slotType) - slotOrder.indexOf(b.slotType)
            || b.minLevel - a.minLevel);
    } else {
        bases.sort((a, b) => b.minLevel - a.minLevel);
    }
    return bases;
}

// Builds the Base tab's slot-filter dropdown options.
function _egvBuildBaseFilterOptionsHTML() {
    const slotOrder = _egvGetSlotOrder();
    const options = [`<option value="all"${_egvBaseFilterSlot === 'all' ? ' selected' : ''}>${t('eg_vendor_filter_all')}</option>`];
    slotOrder.forEach(slot => {
        const selected = _egvBaseFilterSlot === slot ? ' selected' : '';
        options.push(`<option value="${slot}"${selected}>${t(`eg_slot_${slot}`)}</option>`);
    });
    return options.join('');
}

// Builds the filterable, non-starter equipment base list.
export function _egvBuildBaseTabHTML() {
    return `
<div class="egv-base-wrap">
    <div class="egv-base-controls">
        <label class="egv-base-control-label">
            <span>${t('eg_vendor_filter_type')}</span>
            <select id="egv-base-filter-select" onchange="_egvSetBaseFilter(this.value)">${_egvBuildBaseFilterOptionsHTML()}</select>
        </label>
    </div>
    <div class="egv-base-list" id="egv-base-list">${_egvBuildBaseListHTML()}</div>
</div>`;
}

// Builds the card markup for the current equipment base list.
function _egvBuildBaseListHTML() {
    const bases = _egvGetFilteredSortedBases();
    const cards = bases.map(base => {
        const name = (LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
        const missing = _egvGetMissingRequirements(base);
        const price = EG_VENDOR_FREE_BASE_IDS.has(base.id) ? 0 : _egvBaseItemPrice(base);
        return _egvBuildCardHTML({
            icon: _egvIconHTML(base.id, base.icon || EG_SLOT_ICONS[base.slotType] || '📦'),
            title: name,
            subtitle: `${t(`eg_slot_${base.slotType}`)} · ${t('eg_item_level').replace('{n}', base.minLevel)}`,
            desc: _egvBuildReqSummaryText(base),
            price,
            buyCall: `_egvBuyBaseItem('${base.id}')`,
            extraAttrs: ` onmouseenter="_egvShowBaseTooltip('${base.id}', event)" onmouseleave="_egvHideBaseTooltip()"`,
            blockedReason: missing.length
                ? t('eg_vendor_cannot_equip').replace('{list}', missing.join(', '))
                : '',
        });
    }).join('');
    return `<div class="egv-cards egv-cards-base">${cards}</div>`;
}

// Builds a preview/purchase item object from an equipment base type -
// used both for vendor purchases and for the mouseover stat tooltip.
export function _egvBuildBaseItemFromBase(base) {
    const baseName = (LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
    return {
        id: `${base.id}_preview`,
        baseId: base.id,
        name: baseName,
        icon: base.icon || EG_SLOT_ICONS[base.slotType] || '📦',
        category: 'equip',
        slotType: base.slotType,
        archetype: base.archetype,
        rarity: 'common',
        itemLevel: base.minLevel,
        requirements: { ...base.requirements },
        defenses: { ...base.defenses },
        ...(base.damage ? { damage: { ...base.damage }, attackIntervalSeconds: base.attackIntervalSeconds } : {}),
        ...(base.hands ? { hands: base.hands } : {}),
        ...(base.blockChance ? { blockChance: base.blockChance } : {}),
    };
}

// Shows the shared floating equipment tooltip (from endgame-hub.js) for a
// base type card. Holding Alt also compares against the equipped item.
export function _egvShowBaseTooltip(baseId, e) {
    const base = EG_ALL_BASE_TYPES.find(b => b.id === baseId);
    if (!base) return;
    _egShowTooltip(_egvBuildBaseItemFromBase(base), e);
}

// Hides the shared equipment tooltip.
export function _egvHideBaseTooltip() {
    _egClearTooltip();
}

// Buys a specific equipment base type as a fresh common (white) item at its
// minimum item level and places it in the first free hub inventory slot.
export function _egvBuyBaseItem(baseId) {
    const base = EG_ALL_BASE_TYPES.find(b => b.id === baseId);
    if (!base) return;
    const price = EG_VENDOR_FREE_BASE_IDS.has(baseId) ? 0 : _egvBaseItemPrice(base);

    if (!_egvPurchase(price, () => {
        const item = _egvBuildBaseItemFromBase(base);
        item.id = `${base.id}_${Date.now()}`;
        // Free starter gear sells for nothing - prevents a buy-free/sell-shard loop.
        if (price === 0) item.noSellValue = true;

        // The stash helper expands the grid itself when no slot is free, so
        // there is no manual first-free-cell fallback here any more.
        _egAddItemToStash(item);
        return true;
    })) return;

    const name = (LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
    globalThis.showToast(t('eg_vendor_bought_generic')
        .replace('{icon}', base.icon || EG_SLOT_ICONS[base.slotType] || '📦')
        .replace('{name}', name));
    _egvRefreshTabContent();
    _egvHideBaseTooltip(); // card re-render may swallow the mouseleave event
}
