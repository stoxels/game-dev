import { _egCurrencyDefForId, _egCurrencySlotForId, _egCurrencyStash } from '../endgame/endgame-hub.js';
import { _egCraftingBenchCostFor } from './loot-crafting-costs.js';
import { EG_MOD_CAPS } from './loot-equipment-generator.js';
import { _egGetModTable } from './loot-equipment-mod-tables.js';
import {_egFamilyAllowedOnBase} from './loot-mod-application.js';
import { EG_CRAFTED_MOD_CAPS } from './loot-crafting-bench-state.js';

//------------------------------------------------------------------------
//-------------------COSTS & CURRENCY--------------------------------------
//------------------------------------------------------------------------

// Returns whether the stash contains every currency stack in a cost list.
export function _egCraftingBenchCanAfford(costs) {
    return costs.every(cost => _egCraftCurrencyCount(cost.id) >= cost.count);
}

// Formats a cost list for the compact tier button label.
export function _egCraftingBenchCostLabel(costs) {
    return costs.map(cost => {
        const def = _egCurrencyDefForId(cost.id) || {};
        const icon = def.icon || '🪙';
        return `${icon}×${cost.count}`;
    }).join(' + ');
}

// Formats a cost list for the tier button's explanatory tooltip.
export function _egCraftingBenchCostTooltip(costs) {
    return costs.map(cost => {
        const def = _egCurrencyDefForId(cost.id) || {};
        const icon = def.icon || '🪙';
        const name = def.name || cost.id;
        return `${cost.count}x ${icon} ${name}`;
    }).join(' + ');
}

// Adds one Scouring Orb when a craft replaces an existing crafted modifier.
export function _egCraftingBenchEffectiveCosts(entry, tier) {
    const base = _egCraftingBenchCostFor(entry.familyId, tier.tier);
    if (!entry.isReplace) return base;
    const costs = base.map(cost => ({ ...cost }));
    const scour = costs.find(cost => cost.id === 'orb_scouring');
    if (scour) scour.count += 1;
    else costs.push({ id: 'orb_scouring', count: 1 });
    return costs;
}

// Counts the currency assigned to one crafting currency id.
export function _egCraftCurrencyCount(id) {
    const pos = _egCurrencySlotForId(id);
    return pos && _egCurrencyStash[pos.r] && _egCurrencyStash[pos.r][pos.c]
        ? (_egCurrencyStash[pos.r][pos.c].count || 0) : 0;
}

//------------------------------------------------------------------------
//-------------------MODIFIER CAPACITY------------------------------------
//------------------------------------------------------------------------

// Counts crafted modifiers of one prefix/suffix type on an item.
export function _egCountCraftedMods(item, type) {
    return (item.mods || []).filter(mod => mod.type === type && mod.crafted === true).length;
}

// Counts naturally rolled modifiers of one prefix/suffix type on an item.
export function _egCountRegularMods(item, type) {
    return (item.mods || []).filter(mod => mod.type === type && mod.crafted !== true).length;
}

// Summarizes capacity and whether a type can be added or re-rolled.
export function _egCraftingBenchTypeState(item, type) {
    const crafted = _egCountCraftedMods(item, type);
    const regular = _egCountRegularMods(item, type);
    const caps = EG_MOD_CAPS[item.rarity];
    let maxForType;
    if (item.rarity === 'common') {
        maxForType = EG_CRAFTED_MOD_CAPS[type === 'prefix' ? 'maxPre' : 'maxSuf'];
    } else {
        maxForType = caps ? (type === 'prefix' ? caps.maxPre : caps.maxSuf) : 0;
    }
    const roomToAdd = (regular + crafted) < maxForType;
    const hasCrafted = crafted > 0;
    return { crafted, regular, maxForType, roomToAdd, hasCrafted, craftable: roomToAdd || hasCrafted };
}

// Returns whether an item is ordinary equipment with a craftable affix type.
export function _egCraftingBenchCanUseItem(item) {
    if (!item || item.category !== 'equip' || item.isUnique) return false;
    if (!item.slotType) return false;
    const table = _egGetModTable(item);
    if (!table) return false;
    return _egCraftingBenchTypeState(item, 'prefix').craftable
        || _egCraftingBenchTypeState(item, 'suffix').craftable;
}

// Builds the eligible prefix/suffix families and tiers for an item.
export function _egCraftingBenchFamilies(item) {
    if (!item || !item.slotType) return [];
    const table = _egGetModTable(item);
    if (!table) return [];

    const naturalFamilies = new Set((item.mods || [])
        .filter(mod => mod.crafted !== true)
        .map(mod => mod.familyId));
    const itemLevel = item.itemLevel || 1;
    const defenses = item.defenses || {};

    const result = [];
    for (const type of ['prefix', 'suffix']) {
        const state = _egCraftingBenchTypeState(item, type);
        if (!state.craftable) continue;
        const section = table[type + 'es'] || {};

        for (const [familyId, family] of Object.entries(section)) {
            if (naturalFamilies.has(familyId)) continue;
            if (!_egFamilyAllowedOnBase(familyId, defenses)) continue;

            const tiers = (family.tiers || [])
                .map(tier => ({ ...tier, eligible: tier.ilvl <= itemLevel }))
                .filter(tier => tier.eligible);

            if (tiers.length) {
                result.push({ familyId, family, type, tiers, isReplace: state.hasCrafted });
            }
        }
    }
    return result;
}
