import { t, LANG } from '../translation/translations.js';
import { ALL_BASE_TYPES } from './equipment-base-items.js';
import { _baseWeaponFields } from './equipment-base-types.js';
import { SLOT_ICONS } from './equipment-slot-icons.js';
import { PLAYER_BASE_ATTRIBUTES, _computeLoadoutAttributes, _formatRequirementPart } from './loot-requirements.js';
import { _clearTooltip } from '../hub/hub-tooltips.js';
import { _showHubTooltip } from './loot-currency-tooltip.js';
import { _addItemToStash, _equipped } from '../hub/hub.js';
import { _getPlayerLevel } from '../hub/hub-leveling.js';
import { _rollImplicitsForBase } from './loot-implicits.js';
import { _vendorBuildCardHTML, _vendorIconHTML, _vendorPurchase, _vendorRefreshGoldDisplay, _vendorRefreshTabContent } from './loot-vendor-shared.js';

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Base types given away for free in the Starter Gear tab - basic level 1
// starter gear so new players can gear up without gold. No longer part
// of the Base Items tab.
export const VENDOR_FREE_BASE_IDS = new Set([
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
function _vendorBaseItemPrice(base) {
    return Math.round(90 + Math.pow(base.minLevel || 1, 1.78) * 2.3);
}

// Slot filter for the Base Items tab; 'all' shows every slot.
let _vendorBaseFilterSlot = 'all';
// Weapon-type sub-filter (only shown while the slot filter is 'weapon').
let _vendorBaseFilterWeaponType = 'all';

// "Usable only" toggle: hides bases the player cannot equip right now.
let _vendorBaseFilterUsable = false;
// Defence-type filter: 'all' or a key from VENDOR_DEFENSE_TYPES.
let _vendorBaseFilterDefense = 'all';

// Defence filter value -> the exact set of defence stats a base must have.
const VENDOR_DEFENSE_TYPES = {
    armour: ['armour'],
    evasion: ['evasion'],
    absorption: ['absorption'],
    armour_evasion: ['armour', 'evasion'],
    armour_absorption: ['armour', 'absorption'],
    evasion_absorption: ['evasion', 'absorption'],
};

// True when the base's non-zero defence stats are exactly the chosen set.
function _vendorMatchesDefenseType(base, key) {
    const want = VENDOR_DEFENSE_TYPES[key];
    if (!want) return true;
    const def = base.defenses || {};
    const have = ['armour', 'evasion', 'absorption'].filter(k => (def[k] || 0) > 0);
    return have.length === want.length && want.every(k => have.includes(k));
}

const VENDOR_WEAPON_TYPES = ['sword', 'axe', 'mace', 'dagger', 'wand', 'staff'];

// Weapon family for the sub-filter. The art icon decides it (same rule the
// swing animations use); sceptres count as maces like in the passive tree.
function _vendorWeaponType(base) {
    const icon = String(base.icon || '');
    if (/sceptre|scepter|zepter/i.test(`${base.name || ''} ${base.nameDe || ''}`)) return 'mace';
    if (icon === '🪓') return 'axe';
    if (icon === '🔨') return 'mace';
    if (icon === '🦯') return 'staff';
    if (icon === '🪄') return 'wand';
    if (icon === '🗡️') return 'dagger';
    return 'sword';
}

//------------------------------------------------------------------------
//-------------------STARTER GEAR TAB (FREE)-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------//------------------------------------------------------------------------

// Builds the free starter-gear cards in canonical slot order.
export function _vendorBuildStarterTabHTML() {
    const slotOrder = _vendorGetSlotOrder();
    const starterBases = ALL_BASE_TYPES.filter(b => VENDOR_FREE_BASE_IDS.has(b.id));
    // No filter - always show all 8 starter items, sorted by slot order
    starterBases.sort((a, b) => slotOrder.indexOf(a.slotType) - slotOrder.indexOf(b.slotType) || a.minLevel - b.minLevel);

    const cards = starterBases.map(base => {
        const name = (LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
        const missing = _vendorGetMissingRequirements(base);
        return _vendorBuildCardHTML({
            icon: _vendorIconHTML(base.id, base.icon || SLOT_ICONS[base.slotType] || '📦'),
            title: name,
            subtitle: `${t(`eg_slot_${base.slotType}`)} · ${t('eg_item_level').replace('{n}', base.minLevel)}`,
            desc: _vendorBuildReqSummaryText(base),
            price: 0,
            buyCall: `_vendorBuyBaseItem('${base.id}')`,
            extraAttrs: ` onmouseenter="_vendorShowBaseTooltip('${base.id}', event)" onmouseleave="_vendorHideBaseTooltip()"`,
            blockedReason: missing.length ? t('eg_vendor_cannot_equip').replace('{list}', missing.join(', ')) : '',
        });
    }).join('');

    return `<div class="sx-vendor-cards sx-vendor-cards-base">${cards}</div>`;
}

//------------------------------------------------------------------------
//-------------------BASE ITEMS TAB-----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Canonical slot order - first appearance inside ALL_BASE_TYPES.
export function _vendorGetSlotOrder() {
    const order = [];
    ALL_BASE_TYPES.forEach(base => {
        if (!order.includes(base.slotType)) order.push(base.slotType);
    });
    return order;
}

// Requirement check against the player's live attributes/level.
// Returns a list of localized deficit strings ("Level 12", "5 Agi").
function _vendorGetMissingRequirements(base) {
    const req = base.requirements || {};
    const missing = [];

    let level = _getPlayerLevel();
    if (level == null) level = PLAYER_BASE_ATTRIBUTES.level;
    level = level == null ? Infinity : level;
    if ((req.level || 0) > level) {
        missing.push(_formatRequirementPart('level', req.level - level));
    }

    let attrs = { str: 0, agi: 0, int: 0 };
    const equippedList = Object.values(_equipped).filter(Boolean);
    attrs = _computeLoadoutAttributes(equippedList);
    ['str', 'agi', 'int'].forEach(stat => {
        if ((req[stat] || 0) > attrs[stat]) {
            missing.push(`${Math.round(req[stat] - attrs[stat])} ${t(`eg_attr_${stat}`)}`);
        }
    });

    return missing;
}

// Short "Requires ..." summary line for a base type.
function _vendorBuildReqSummaryText(base) {
    const req = base.requirements || {};
    const parts = [];
    if ((req.level || 0) > 0) parts.push(t('eg_req_level').replace('{n}', req.level));
    ['str', 'agi', 'int'].forEach(stat => {
        if ((req[stat] || 0) > 0) parts.push(`${req[stat]} ${t(`eg_attr_${stat}`)}`);
    });
    return parts.length ? `${t('eg_vendor_requires')} ${parts.join(' · ')}` : '';
}

// Applies the slot filter chosen by the Base tab dropdown.
export function _vendorSetBaseFilter(value) {
    _vendorBaseFilterSlot = value;
    _vendorBaseFilterWeaponType = 'all';
    // A defence filter picked earlier must not silently stay on where its chips are hidden.
    if (!_vendorSlotHasDefences()) _vendorBaseFilterDefense = 'all';
    _vendorRenderBaseListOnly();
}

// Applies the weapon-type sub-filter (swords, axes, maces, ...).
export function _vendorSetWeaponTypeFilter(value) {
    _vendorBaseFilterWeaponType = value;
    _vendorRenderBaseListOnly();
}

// Toggles the "usable only" filter button.
export function _vendorToggleUsableFilter() {
    _vendorBaseFilterUsable = !_vendorBaseFilterUsable;
    _vendorRenderBaseListOnly();
}

// Applies the defence-type dropdown (armour, evasion, absorption, hybrids).
export function _vendorSetDefenseFilter(value) {
    _vendorBaseFilterDefense = value;
    _vendorRenderBaseListOnly();
}

// Re-renders only the base item list + filter controls (keeps focus/state).
export function _vendorRenderBaseListOnly() {
    _vendorHideBaseTooltip(); // hovered card may be replaced by the re-render
    const listEl = document.getElementById('sx-vendor-base-list');
    if (listEl) listEl.innerHTML = _vendorBuildBaseListHTML();
    // Redraw the filter column so the chosen chips and the slot-specific groups match
    const controls = document.getElementById('sx-vendor-base-controls');
    if (controls) controls.innerHTML = _vendorBuildBaseControlsInnerHTML();
    _vendorRefreshGoldDisplay();
}

// Returns non-starter bases after the current filter and sort rules.
function _vendorGetFilteredSortedBases() {
    // Exclude free starter gear - now in its own tab
    let bases = ALL_BASE_TYPES.filter(b => !VENDOR_FREE_BASE_IDS.has(b.id));

    if (_vendorBaseFilterSlot !== 'all') {
        bases = bases.filter(b => b.slotType === _vendorBaseFilterSlot);
    }
    if (_vendorBaseFilterSlot === 'weapon' && _vendorBaseFilterWeaponType !== 'all') {
        bases = bases.filter(b => _vendorWeaponType(b) === _vendorBaseFilterWeaponType);
    }

    if (_vendorBaseFilterDefense !== 'all') {
        bases = bases.filter(b => _vendorMatchesDefenseType(b, _vendorBaseFilterDefense));
    }
    if (_vendorBaseFilterUsable) {
        bases = bases.filter(b => _vendorGetMissingRequirements(b).length === 0);
    }

    // Auto-sort: lowest item level on top (ascending), so players see what
    // they can use first. When showing all slots, still group by slot order
    // with the lowest ilvl first within each slot group.
    const slotOrder = _vendorGetSlotOrder();
    if (_vendorBaseFilterSlot === 'all') {
        bases.sort((a, b) => slotOrder.indexOf(a.slotType) - slotOrder.indexOf(b.slotType)
            || a.minLevel - b.minLevel);
    } else {
        bases.sort((a, b) => a.minLevel - b.minLevel);
    }
    return bases;
}

// True when any base in the chosen slot carries a defence stat (armour, evasion, absorption), so the
// defence filter only shows where it means something (not for weapons, rings, ...).
function _vendorSlotHasDefences() {
    return ALL_BASE_TYPES.some(b => !VENDOR_FREE_BASE_IDS.has(b.id)
        && (_vendorBaseFilterSlot === 'all' || b.slotType === _vendorBaseFilterSlot)
        && ['armour', 'evasion', 'absorption'].some(k => ((b.defenses || {})[k] || 0) > 0));
}

// One filter chip of the base-items filter column.
function _vendorBaseChip(label, on, call) {
    return `<button type="button" class="sx-vendor-filter-btn${on ? ' sx-vendor-filter-btn-on' : ''}" onclick="${call}">${label}</button>`;
}

// A titled group of chips in the filter column.
function _vendorBaseChipGroup(title, chips) {
    return `<div class="sx-vendor-filter-group"><div class="sx-vendor-filter-title">${title}</div><div class="sx-vendor-filter-chips">${chips}</div></div>`;
}

// Builds the filter column of the base tab: slot, weapon type (weapons only), defence (armour only), usable.
function _vendorBuildBaseControlsInnerHTML() {
    const slotChips = [_vendorBaseChip(t('eg_vendor_filter_all'), _vendorBaseFilterSlot === 'all', "_vendorSetBaseFilter('all')")]
        .concat(_vendorGetSlotOrder().map(slot => _vendorBaseChip(t(`eg_slot_${slot}`), _vendorBaseFilterSlot === slot, `_vendorSetBaseFilter('${slot}')`))).join('');
    let html = _vendorBaseChipGroup(t('eg_vendor_filter_type'), slotChips);
    if (_vendorBaseFilterSlot === 'weapon') {
        const weaponChips = [_vendorBaseChip(t('eg_vendor_weapon_type_all'), _vendorBaseFilterWeaponType === 'all', "_vendorSetWeaponTypeFilter('all')")]
            .concat(VENDOR_WEAPON_TYPES.map(wt => _vendorBaseChip(t(`eg_vendor_weapon_type_${wt}`), _vendorBaseFilterWeaponType === wt, `_vendorSetWeaponTypeFilter('${wt}')`))).join('');
        html += _vendorBaseChipGroup(t('eg_vendor_weapon_type'), weaponChips);
    }
    if (_vendorSlotHasDefences()) {
        const defChips = [_vendorBaseChip(t('eg_vendor_defense_all'), _vendorBaseFilterDefense === 'all', "_vendorSetDefenseFilter('all')")]
            .concat(Object.keys(VENDOR_DEFENSE_TYPES).map(key => _vendorBaseChip(t(`eg_vendor_defense_${key}`), _vendorBaseFilterDefense === key, `_vendorSetDefenseFilter('${key}')`))).join('');
        html += _vendorBaseChipGroup(t('eg_vendor_defense_type'), defChips);
    }
    return html + `<button type="button" id="sx-vendor-usable-btn" class="sx-vendor-filter-btn sx-vendor-usable${_vendorBaseFilterUsable ? ' sx-vendor-filter-btn-on' : ''}" onclick="_vendorToggleUsableFilter()">${t('eg_vendor_usable_only')}</button>`;
}

// Builds the filterable, non-starter equipment base list.
export function _vendorBuildBaseTabHTML() {
    return `
<div class="sx-vendor-base-wrap">
    <div class="sx-vendor-base-list" id="sx-vendor-base-list">${_vendorBuildBaseListHTML()}</div>
    <div class="sx-vendor-base-controls" id="sx-vendor-base-controls">${_vendorBuildBaseControlsInnerHTML()}</div>
</div>`;
}

// Builds the card markup for the current equipment base list.
function _vendorBuildBaseListHTML() {
    const bases = _vendorGetFilteredSortedBases();
    const cards = bases.map(base => {
        const name = (LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
        const missing = _vendorGetMissingRequirements(base);
        const price = VENDOR_FREE_BASE_IDS.has(base.id) ? 0 : _vendorBaseItemPrice(base);
        return _vendorBuildCardHTML({
            icon: _vendorIconHTML(base.id, base.icon || SLOT_ICONS[base.slotType] || '📦'),
            title: name,
            subtitle: `${t(`eg_slot_${base.slotType}`)} · ${t('eg_item_level').replace('{n}', base.minLevel)}`,
            desc: _vendorBuildReqSummaryText(base),
            price,
            buyCall: `_vendorBuyBaseItem('${base.id}')`,
            extraAttrs: ` onmouseenter="_vendorShowBaseTooltip('${base.id}', event)" onmouseleave="_vendorHideBaseTooltip()"`,
            blockedReason: missing.length
                ? t('eg_vendor_cannot_equip').replace('{list}', missing.join(', '))
                : '',
        });
    }).join('');
    return `<div class="sx-vendor-cards sx-vendor-cards-base">${cards}</div>`;
}

// Builds a preview/purchase item object from an equipment base type -
// used both for vendor purchases and for the mouseover stat tooltip.
export function _vendorBuildBaseItemFromBase(base) {
    const baseName = (LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
    return {
        id: `${base.id}_preview`,
        baseId: base.id,
        name: baseName,
        baseName,
        icon: base.icon || SLOT_ICONS[base.slotType] || '📦',
        category: 'equip',
        slotType: base.slotType,
        archetype: base.archetype,
        rarity: 'common',
        itemLevel: Math.max(base.minLevel || 1, _getPlayerLevel()),
        requirements: { ...base.requirements },
        defenses: { ...base.defenses },
        ..._baseWeaponFields(base),
        ...(base.hands ? { hands: base.hands } : {}),
        ...(base.blockChance ? { blockChance: base.blockChance } : {}),
    };
}

// Shows the shared floating equipment tooltip (from hub.js) for a
// base type card. Holding Alt also compares against the equipped item.
export function _vendorShowBaseTooltip(baseId, e) {
    const base = ALL_BASE_TYPES.find(b => b.id === baseId);
    if (!base) return;
    _showHubTooltip(_vendorBuildBaseItemFromBase(base), e);
}

// Hides the shared equipment tooltip.
export function _vendorHideBaseTooltip() {
    _clearTooltip();
}

// Buys a specific equipment base type as a fresh common (white) item at the
// player's character level (never below the base's minimum) and places it in the first free hub inventory slot.
export function _vendorBuyBaseItem(baseId) {
    const base = ALL_BASE_TYPES.find(b => b.id === baseId);
    if (!base) return;
    const price = VENDOR_FREE_BASE_IDS.has(baseId) ? 0 : _vendorBaseItemPrice(base);

    if (!_vendorPurchase(price, () => {
        const item = _vendorBuildBaseItemFromBase(base);
        item.id = `${base.id}_${Date.now()}`;
        // Bought bases get their implicit modifier rolled now (not in the preview, so the tooltip never shows a fake roll).
        item.implicits = _rollImplicitsForBase(base) || [];
        // Free starter gear sells for nothing - prevents a buy-free/sell-shard loop.
        if (price === 0) item.noSellValue = true;

        // The stash helper expands the grid itself when no slot is free, so
        // there is no manual first-free-cell fallback here any more.
        _addItemToStash(item);
        return true;
    })) return;

    const name = (LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
    globalThis.showToast(t('eg_vendor_bought_generic')
        .replace('{icon}', base.icon || SLOT_ICONS[base.slotType] || '📦')
        .replace('{name}', name));
    _vendorRefreshTabContent();
    _vendorHideBaseTooltip(); // card re-render may swallow the mouseleave event
}
