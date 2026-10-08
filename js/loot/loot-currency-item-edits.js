//----------------------------------------------------------------------
//-------------CURRENCY ITEM EDITS (MOD SURGERY PRIMITIVES)-------------
//----------------------------------------------------------------------

// The four low-level item edits every crafting orb builds on: full
// reroll, add-one-mod, reroll-values-in-place and remove-one-mod.
// Maps reuse the reroll-values half (loot-maps.js), so it is the
// only part of this file that leaves the orb table.

import { EG_MOD_CAPS } from './loot-equipment-generator.js';
import { _egGetModTable } from './loot-equipment-mod-tables.js';
import {_egBuildItemName} from './loot-mod-naming.js';
import {_egBuildModPool, _egBuildRolledStats, _egPickModFromPool, _egPickTier, _egRollMods} from './loot-mod-application.js';


// Rerolls an item's mods entirely at the given rarity/counts.
export function _egRerollItemMods(item, rarity, prefixCount, suffixCount) {
    const modTable = _egGetModTable(item);
    const mods = modTable ? _egRollMods(prefixCount, suffixCount, modTable, item.itemLevel || 1, item.defenses) : [];
    const name = _egBuildItemName(item.baseName || item.name, rarity, mods);
    return { ...item, rarity, mods, name };
}

// Adds ONE new mod (prefix or suffix, whichever has room) to an item,
// respecting the mod caps of the given rarity. Returns the item unchanged
// if no eligible mod/slot was found.
export function _egAddOneModToItem(item, rarityForCaps) {
    const modTable = _egGetModTable(item);
    if (!modTable) return item;

    const existing = item.mods || [];
    const chosenFamilyIds = new Set(existing.map(m => m.familyId));
    const prefixCount = existing.filter(m => m.type === 'prefix').length;
    const suffixCount = existing.filter(m => m.type === 'suffix').length;
    const cap = EG_MOD_CAPS[rarityForCaps];

    const sections = [];
    if (prefixCount < cap.maxPre) sections.push({ type: 'prefix', pool: modTable.prefixes });
    if (suffixCount < cap.maxSuf) sections.push({ type: 'suffix', pool: modTable.suffixes });
    if (sections.length === 0) return item;

    const chosen = sections[Math.floor(Math.random() * sections.length)];
    const pool = _egBuildModPool(chosen.pool, item.itemLevel || 1, chosenFamilyIds, item.defenses);
    const entry = _egPickModFromPool(pool);
    if (!entry) return item;

    const tier = _egPickTier(entry.tiers);
    const newMod = {
        familyId: entry.familyId,
        type: chosen.type,
        tier: tier.tier,
        rolledStats: _egBuildRolledStats(entry.family, tier),
    };

    return { ...item, mods: [...existing, newMod] };
}

// Re-rolls the numeric VALUES of every modifier within its existing tier
// (Divine Orb semantics). Families, tiers and rarity are kept untouched.
export function _egRerollItemModValues(item, modTable) {
    if (!modTable) return item;
    const mods = (item.mods || []).map(mod => {
        const section = mod.type === 'prefix' ? modTable.prefixes : modTable.suffixes;
        const family = section && (section[mod.familyId]
            || Object.values(section).find(f => f.id === mod.familyId));
        const tierObj = family && family.tiers.find(tr => tr.tier === mod.tier);
        if (!family || !tierObj) return mod; // unknown family/tier - keep as-is
        return { ...mod, rolledStats: _egBuildRolledStats(family, tierObj) };
    });
    return { ...item, mods };
}

// Removes ONE random modifier from an item (Annulment semantics).
// Rarity is kept untouched, even if fewer mods than the cap remain.
export function _egRemoveOneModFromItem(item) {
    const existing = item.mods || [];
    if (existing.length === 0) return item;
    const index = Math.floor(Math.random() * existing.length);
    const mods = existing.filter((_, i) => i !== index);
    const name = _egBuildItemName(item.baseName || item.name, item.rarity, mods);
    return { ...item, mods, name };
}
