import { egAtlasNodeById, egAtlasNodeName, egAtlasPickNodeIdForTier } from '../endgame/endgame-atlas.js';
import { _egRerollItemModValues } from './loot-currency-item-edits.js';
import { EG_MOD_CAPS, _egRollModCounts } from './loot-equipment-generator.js';
import {_egBuildItemName} from './loot-mod-naming.js';
import { _egAddOneModToMap, _egRemoveOneModFromMap, _egRerollMapMods } from './loot-maps.js';
import { _egWithImplicits } from './loot-map-implicits.js';
import { EG_MAP_MOD_TABLES } from './loot-map-mod-tables.js';
import { EG_MAX_MAP_TIER, _egMapTierMonsterLevel, _egPickMapBaseName } from './loot-map-config.js';

//----------------------------------------------------------------------
//-------------------------ORBS APPLIED TO MAPS-------------------------
//----------------------------------------------------------------------

// Currency that acts on a map rather than on gear: which orb may touch a
// map, and what each one does to it. The orb-to-action table is here; the
// map builder it drives lives in the generator.

//-------------------ORBS APPLIED TO MAPS---------------------------------
//------------------------------------------------------------------------
// Mirrors the orb semantics from endgame-currency.js, but rolls from the
// MAP modifier tables. Looked up by orb id when an orb is used on a map.

export const EG_MAP_CURRENCY_RULES = {
    orb_transmutation: {
        canApply(map) { return map.rarity === 'common'; },
        apply(map) {
            const { prefixCount, suffixCount } = _egRollModCounts('uncommon');
            return _egRerollMapMods(map, 'uncommon', prefixCount, suffixCount);
        },
    },
    orb_alteration: {
        canApply(map) { return map.rarity === 'uncommon'; },
        apply(map) {
            const { prefixCount, suffixCount } = _egRollModCounts('uncommon');
            return _egRerollMapMods(map, 'uncommon', prefixCount, suffixCount);
        },
    },
    orb_augmentation: {
        canApply(map) { return map.rarity === 'uncommon' && (map.mods || []).length === 1; },
        apply(map) {
            const updated = _egAddOneModToMap(map, 'uncommon');
            const name = _egBuildItemName(updated.baseName || updated.name, updated.rarity, updated.mods);
            return { ...updated, name };
        },
    },
    orb_regal: {
        canApply(map) { return map.rarity === 'uncommon'; },
        apply(map) {
            const updated = _egAddOneModToMap({ ...map, rarity: 'rare' }, 'rare');
            const name = _egBuildItemName(updated.baseName || updated.name, 'rare', updated.mods);
            return { ...updated, rarity: 'rare', name };
        },
    },
    orb_alchemy: {
        canApply(map) { return map.rarity === 'common'; },
        apply(map) {
            const { prefixCount, suffixCount } = _egRollModCounts('rare');
            return _egRerollMapMods(map, 'rare', prefixCount, suffixCount);
        },
    },
    orb_chaos: {
        canApply(map) { return map.rarity === 'rare'; },
        apply(map) {
            const { prefixCount, suffixCount } = _egRollModCounts('rare');
            return _egRerollMapMods(map, 'rare', prefixCount, suffixCount);
        },
    },
    orb_scouring: {
        canApply(map) { return map.rarity !== 'common'; },
        apply(map) {
            return _egWithImplicits({ ...map, rarity: 'common', mods: [], name: map.baseName || map.name });
        },
    },
    orb_exalted: {
        canApply(map) {
            if (map.rarity !== 'rare' && map.rarity !== 'epic') return false;
            return (map.mods || []).length < EG_MOD_CAPS.epic.maxTotal;
        },
        apply(map) {
            const updated = _egAddOneModToMap({ ...map, rarity: 'epic' }, 'epic');
            const name = _egBuildItemName(updated.baseName || updated.name, 'epic', updated.mods);
            return { ...updated, rarity: 'epic', name };
        },
    },
    orb_ascension: {
        canApply(map) { return map.rarity === 'common'; },
        apply(map) {
            const { prefixCount, suffixCount } = _egRollModCounts('epic');
            return _egRerollMapMods(map, 'epic', prefixCount, suffixCount);
        },
    },
    orb_elevation: {
        canApply(map) {
            if (map.rarity !== 'rare') return false;
            return (map.mods || []).length < EG_MOD_CAPS.epic.maxTotal;
        },
        apply(map) {
            const updated = _egAddOneModToMap({ ...map, rarity: 'epic' }, 'epic');
            const name = _egBuildItemName(updated.baseName || updated.name, 'epic', updated.mods);
            return { ...updated, rarity: 'epic', name };
        },
    },
    orb_cataclysm: {
        canApply(map) { return map.rarity === 'epic'; },
        apply(map) {
            const { prefixCount, suffixCount } = _egRollModCounts('epic');
            return _egRerollMapMods(map, 'epic', prefixCount, suffixCount);
        },
    },
    orb_chance: {
        canApply(map) { return map.rarity === 'common'; },
        apply(map) {
            const roll = Math.random();
            const rarity = roll < 0.60 ? 'uncommon' : (roll < 0.90 ? 'rare' : 'epic');
            const { prefixCount, suffixCount } = _egRollModCounts(rarity);
            return _egRerollMapMods(map, rarity, prefixCount, suffixCount);
        },
    },
    orb_annulment: {
        canApply(map) { return (map.mods || []).length > 0; },
        apply(map) {
            return _egRemoveOneModFromMap(map);
        },
    },
    // Re-rolls the values of all map modifiers within their current tiers.
    orb_divine: {
        canApply(map) { return (map.mods || []).length > 0; },
        apply(map) {
            const updated = _egRerollItemModValues(map, EG_MAP_MOD_TABLES);
            return _egWithImplicits(updated);
        },
    },
    // Orb of Horizons: raises the map's tier by one (max tier 16).
    // Atlas region, base name band and implicits are re-derived from the new tier.
    orb_horizons: {
        canApply(map) { return (map.mapTier || 1) < EG_MAX_MAP_TIER; },
        apply(map) {
            const newTier = Math.min(EG_MAX_MAP_TIER, (map.mapTier || 1) + 1);
            let atlasNodeId = null;
            let baseName = null;
            if (typeof egAtlasPickNodeIdForTier === 'function') {
                atlasNodeId = egAtlasPickNodeIdForTier(newTier);
                const node = atlasNodeId ? egAtlasNodeById(atlasNodeId) : null;
                if (node) baseName = egAtlasNodeName(node);
            }
            if (!baseName) baseName = _egPickMapBaseName(newTier);
            const name = _egBuildItemName(baseName, map.rarity, map.mods || []);
            // Re-derive item/monster level so drops and mod rolls inside the
            // upgraded map match the new tier's curve value.
            const newLevel = _egMapTierMonsterLevel(newTier);
            return _egWithImplicits({
                ...map,
                mapTier: newTier,
                monsterLevel: newLevel,
                itemLevel: newLevel,
                atlasNodeId, baseName, name,
            });
        },
    },
    mirror_of_kalandra: {
        canApply() { return true; },
    },
};


