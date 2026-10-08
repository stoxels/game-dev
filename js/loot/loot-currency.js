//----------------------------------------------------------------------
//-----------------------CURRENCY ORB DEFINITIONS-----------------------
//----------------------------------------------------------------------

// The orb table: one entry per currency, carrying its canApply/apply
// semantics. The mod surgery these orbs build on lives in
// loot-currency-item-edits.js. Names and descriptions are re-bound
// to t() below so a language switch restyles every orb at once.

import { t } from '../translation/translations.js';
import { EG_MOD_CAPS, _egRollModCounts } from './loot-equipment-generator.js';
import { _egGetModTable } from './loot-equipment-mod-tables.js';
import { _egAddOneModToItem, _egRemoveOneModFromItem, _egRerollItemMods, _egRerollItemModValues } from './loot-currency-item-edits.js';
import { _egRerollImplicits } from './loot-implicits.js';
import {_egBuildItemName} from './loot-mod-naming.js';
import { EG_UNIQUE_ITEMS, _egBuildUniqueItem } from './unique-items.js';


export const EG_CURRENCY_DEFS = {

    orb_transmutation: {
        id: 'orb_transmutation', name: t('eg_orb_transmutation'), icon: '🔷',
        description: t('eg_orb_transmutation_desc'),
        canApply(item) { return item.rarity === 'common'; },
        apply(item) {
            const { prefixCount, suffixCount } = _egRollModCounts('uncommon');
            return _egRerollItemMods(item, 'uncommon', prefixCount, suffixCount);
        },
    },

    orb_alteration: {
        id: 'orb_alteration', name: t('eg_orb_alteration'), icon: '🔵',
        description: t('eg_orb_alteration_desc'),
        canApply(item) { return item.rarity === 'uncommon'; },
        apply(item) {
            const { prefixCount, suffixCount } = _egRollModCounts('uncommon');
            return _egRerollItemMods(item, 'uncommon', prefixCount, suffixCount);
        },
        // Shift-chaining can immediately fill a one-modifier result with an
        // Augmentation Orb instead of consuming another Alteration Orb.
        chainFallback(item) {
            return item.rarity === 'uncommon' && (item.mods || []).length === 1
                ? 'orb_augmentation' : null;
        },
    },

    orb_augmentation: {
        id: 'orb_augmentation', name: t('eg_orb_augmentation'), icon: '🔹',
        description: t('eg_orb_augmentation_desc'),
        canApply(item) { return item.rarity === 'uncommon' && (item.mods || []).length === 1; },
        apply(item) {
            const updated = _egAddOneModToItem(item, 'uncommon');
            const name = _egBuildItemName(updated.baseName || updated.name, updated.rarity, updated.mods);
            return { ...updated, name };
        },
    },

    orb_regal: {
        id: 'orb_regal', name: t('eg_orb_regal'), icon: '🟣',
        description: t('eg_orb_regal_desc'),
        canApply(item) { return item.rarity === 'uncommon'; },
        apply(item) {
            const updated = _egAddOneModToItem({ ...item, rarity: 'rare' }, 'rare');
            const name = _egBuildItemName(updated.baseName || updated.name, 'rare', updated.mods);
            return { ...updated, rarity: 'rare', name };
        },
    },

    orb_alchemy: {
        id: 'orb_alchemy', name: t('eg_orb_alchemy'), icon: '🟡',
        description: t('eg_orb_alchemy_desc'),
        // On a rare item this consumes a Scouring Orb as part of the same
        // action, then immediately rolls a fresh rare item.
        canApply(item) {
            return item.rarity === 'common' || (item.rarity === 'rare' && !item.isUnique);
        },
        apply(item) {
            const { prefixCount, suffixCount } = _egRollModCounts('rare');
            return _egRerollItemMods(item, 'rare', prefixCount, suffixCount);
        },
        requiresExtraCurrency(item) {
            return item.rarity === 'rare' && !item.isUnique ? 'orb_scouring' : null;
        },
    },

    orb_chaos: {
        id: 'orb_chaos', name: t('eg_orb_chaos'), icon: '🟠',
        description: t('eg_orb_chaos_desc'),
        canApply(item) { return item.rarity === 'rare'; },
        apply(item) {
            const { prefixCount, suffixCount } = _egRollModCounts('rare');
            return _egRerollItemMods(item, 'rare', prefixCount, suffixCount);
        },
    },

    orb_scouring: {
        id: 'orb_scouring', name: t('eg_orb_scouring'), icon: '⚪',
        description: t('eg_orb_scouring_desc'),
        canApply(item) { return item.rarity !== 'common' && !item.isUnique; },
        apply(item) {
            return { ...item, rarity: 'common', mods: [], name: item.baseName || item.name };
        },
    },

    orb_exalted: {
        id: 'orb_exalted', name: t('eg_orb_exalted'), icon: '🔴',
        description: t('eg_orb_exalted_desc'),
        canApply(item) {
            if (item.rarity !== 'rare' && item.rarity !== 'epic') return false;
            return (item.mods || []).length < EG_MOD_CAPS.epic.maxTotal;
        },
        apply(item) {
            const updated = _egAddOneModToItem({ ...item, rarity: 'epic' }, 'epic');
            const name = _egBuildItemName(updated.baseName || updated.name, 'epic', updated.mods);
            return { ...updated, rarity: 'epic', name };
        },
    },

    // Re-rolls the values of all modifiers within their current tiers.
    orb_divine: {
        id: 'orb_divine', name: t('eg_orb_divine'), icon: '🌟',
        description: t('eg_orb_divine_desc'),
        canApply(item) { return (item.mods || []).length > 0 && !item.isUnique; },
        apply(item) {
            return _egRerollItemModValues(item, _egGetModTable(item));
        },
    },

    // Common -> Epic directly ("alchemy for epic").
    orb_ascension: {
        id: 'orb_ascension', name: t('eg_orb_ascension'), icon: '🔮',
        description: t('eg_orb_ascension_desc'),
        // On an epic item this consumes a Scouring Orb as part of the same
        // action, then immediately rolls a fresh epic item.
        canApply(item) {
            return item.rarity === 'common' || (item.rarity === 'epic' && !item.isUnique);
        },
        apply(item) {
            const { prefixCount, suffixCount } = _egRollModCounts('epic');
            return _egRerollItemMods(item, 'epic', prefixCount, suffixCount);
        },
        requiresExtraCurrency(item) {
            return item.rarity === 'epic' && !item.isUnique ? 'orb_scouring' : null;
        },
    },

    // Rare -> Epic: keeps existing modifiers and adds one new modifier.
    orb_elevation: {
        id: 'orb_elevation', name: t('eg_orb_elevation'), icon: '✨',
        description: t('eg_orb_elevation_desc'),
        canApply(item) {
            if (item.rarity !== 'rare') return false;
            return (item.mods || []).length < EG_MOD_CAPS.epic.maxTotal;
        },
        apply(item) {
            const updated = _egAddOneModToItem({ ...item, rarity: 'epic' }, 'epic');
            const name = _egBuildItemName(updated.baseName || updated.name, 'epic', updated.mods);
            return { ...updated, rarity: 'epic', name };
        },
    },

    // Full stat reroll on an already-epic item ("chaos for epic").
    orb_cataclysm: {
        id: 'orb_cataclysm', name: t('eg_orb_cataclysm'), icon: '💥',
        description: t('eg_orb_cataclysm_desc'),
        canApply(item) { return item.rarity === 'epic'; },
        apply(item) {
            const { prefixCount, suffixCount } = _egRollModCounts('epic');
            return _egRerollItemMods(item, 'epic', prefixCount, suffixCount);
        },
    },

    // Common -> random rarity (uncommon/rare/epic), like PoE's Chance Orb.
    // Very rarely forges a unique of the same slot instead (Ancient Orb behaviour).
    orb_chance: {
        id: 'orb_chance', name: t('eg_orb_chance'), icon: '🎲',
        description: t('eg_orb_chance_desc'),
        canApply(item) { return item.rarity === 'common'; },
        apply(item) {
            // ~2.5% chance to act like an Ancient Orb - eligible uniques are
            // same slotType with required level <= source item's level.
            const UNIQUE_CHANCE = 0.025;
            if (Math.random() < UNIQUE_CHANCE
                && typeof _egGetAncientOrbEligibleUniques === 'function'
                && typeof _egBuildUniqueItem === 'function') {
                const elig = _egGetAncientOrbEligibleUniques(item);
                if (elig.length > 0) {
                    const def = elig[Math.floor(Math.random() * elig.length)];
                    const lvl = item.itemLevel || (item.requirements && item.requirements.level) || def.minLevel || 1;
                    return _egBuildUniqueItem(def, lvl);
                }
            }
            const roll = Math.random();
            const rarity = roll < 0.60 ? 'uncommon' : (roll < 0.90 ? 'rare' : 'epic');
            const { prefixCount, suffixCount } = _egRollModCounts(rarity);
            return _egRerollItemMods(item, rarity, prefixCount, suffixCount);
        },
    },

    // Removes ONE random modifier (rarity is kept).
    orb_annulment: {
        id: 'orb_annulment', name: t('eg_orb_annulment'), icon: '✂️',
        description: t('eg_orb_annulment_desc'),
        canApply(item) { return (item.mods || []).length > 0 && !item.isUnique; },
        apply(item) {
            return _egRemoveOneModFromItem(item);
        },
    },

    // Blessing Orb - rerolls the numeric values of an item's IMPLICIT modifiers (PoE Blessed Orb).
    // Only orb that can touch implicits; regular orbs preserve them.
    orb_blessing: {
        id: 'orb_blessing', name: t('eg_orb_blessing'), icon: '🙏',
        description: t('eg_orb_blessing_desc'),
        canApply(item) {
            return item.category === 'equip' && !item.isUnique
                && Array.isArray(item.implicits) && item.implicits.length > 0;
        },
        apply(item) {
            if (typeof _egRerollImplicits === 'function') return _egRerollImplicits(item);
            return item;
        },
    },

    // MAP ONLY - raises a map's tier by one. Equipment can never be a
    // target (canApply rejects non-maps); maps route through the dedicated
    // EG_MAP_CURRENCY_RULES entry in endgame-maps.js.
    orb_horizons: {
        id: 'orb_horizons', name: t('eg_orb_horizons'), icon: '🌌',
        description: t('eg_orb_horizons_desc'),
        canApply(item) { return item.category === 'map'; },
        apply(item) { return item; }, // unused - see EG_MAP_CURRENCY_RULES
    },

    // Creates a copy of an item in the next free inventory slot.
    // The copy is a fully independent item that can be modified further
    // with any other currency.
    mirror_of_kalandra: {
        id: 'mirror_of_kalandra', name: t('eg_orb_mirror'), icon: '🪞',
        description: t('eg_orb_mirror_desc'),
        isMirror: true,
        canApply(item) { return item.category === 'equip' && !item.isUnique; },
    },

    // Adds one modifier to a rare item (stays rare). Also works on an uncommon
    // item with 1 modifier to fill its second slot - the budget Exalted for
    // blue/green gear. Mirrors the requested "about as common as Regal" niche.
    orb_bloom: {
        id: 'orb_bloom', name: t('eg_orb_bloom'), icon: '🌸',
        description: t('eg_orb_bloom_desc'),
        canApply(item) {
            if (item.category !== 'equip' || item.isUnique) return false;
            if (item.rarity === 'rare') return (item.mods || []).length < EG_MOD_CAPS.rare.maxTotal;
            if (item.rarity === 'uncommon') return (item.mods || []).length < EG_MOD_CAPS.uncommon.maxTotal;
            return false;
        },
        apply(item) {
            // stays at the same rarity - only the mod count grows
            const updated = _egAddOneModToItem(item, item.rarity);
            const name = _egBuildItemName(updated.baseName || updated.name, updated.rarity, updated.mods);
            return { ...updated, name };
        },
    },

    // Reforges an item into a random unique of the same slot whose required
    // level is <= the source item's required level. Very rare drop + shard merge.
    orb_ancient: {
        id: 'orb_ancient', name: t('eg_orb_ancient'), icon: '🏺',
        description: t('eg_orb_ancient_desc'),
        canApply(item) {
            if (item.category !== 'equip' || item.isUnique) return false;
            const elig = (typeof _egGetAncientOrbEligibleUniques === 'function')
                ? _egGetAncientOrbEligibleUniques(item) : [];
            return elig.length > 0;
        },
        apply(item) {
            const elig = (typeof _egGetAncientOrbEligibleUniques === 'function')
                ? _egGetAncientOrbEligibleUniques(item) : [];
            if (elig.length === 0) return item;
            const def = elig[Math.floor(Math.random() * elig.length)];
            const lvl = item.itemLevel || (item.requirements && item.requirements.level) || def.minLevel || 1;
            if (typeof _egBuildUniqueItem === 'function') {
                return _egBuildUniqueItem(def, lvl);
            }
            return item;
        },
    },
};

for (const [id, def] of Object.entries(EG_CURRENCY_DEFS)) {
    const nameKey = id === 'mirror_of_kalandra' ? 'eg_orb_mirror' : `eg_${id}`;
    Object.defineProperties(def, {
        name: { enumerable: true, get: () => t(nameKey) },
        description: { enumerable: true, get: () => t(`${nameKey}_desc`) },
    });
}

// Helper: eligible uniques for Ancient Orb - same slotType and required level <= source
export function _egGetAncientOrbEligibleUniques(item) {
    if (!item || typeof EG_UNIQUE_ITEMS === 'undefined' || !Array.isArray(EG_UNIQUE_ITEMS)) return [];
    const slot = item.slotType;
    if (!slot) return [];
    const srcLevel = (item.requirements && typeof item.requirements.level === 'number')
        ? item.requirements.level
        : (typeof item.itemLevel === 'number' ? item.itemLevel : 1);
    return EG_UNIQUE_ITEMS.filter(u => {
        if (u.slotType !== slot) return false;
        const reqLevel = (u.requirements && typeof u.requirements.level === 'number')
            ? u.requirements.level
            : (typeof u.minLevel === 'number' ? u.minLevel : 0);
        return reqLevel <= srcLevel;
    });
}
