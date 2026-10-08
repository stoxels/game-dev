import { egAtlasDropNodeIds, egAtlasNodeById, egAtlasNodeName, egAtlasPickDropNodeId, egAtlasPickNodeIdForTier } from '../endgame/endgame-atlas.js';
import { EG_MOD_CAPS, _egRollModCounts, _egRollRarity } from './loot-equipment-generator.js';
import { _egActiveMapItem } from '../endgame/endgame-map-launch.js';
import {_egBuildItemName} from './loot-mod-naming.js';
import {_egBuildModPool, _egBuildRolledStats, _egPickModFromPool, _egPickTier, _egRollMods} from './loot-mod-application.js';
import { _egWithImplicits } from './loot-map-implicits.js';
import { EG_MAX_MAP_TIER, _egMapTierMonsterLevel, _egPickMapBaseName, _egRollMapTier } from './loot-map-config.js';
import { EG_MAP_MOD_TABLES } from './loot-map-mod-tables.js';

//----------------------------------------------------------------------
//----------------------------MAP GENERATOR-----------------------------
//----------------------------------------------------------------------

// Builds a map item: rarity, affix count, the affixes themselves, the atlas
// node it points at, and the three reroll verbs the crafting bench drives.

//-------------------MAP GENERATOR-----------------------------------------
//------------------------------------------------------------------------

// Rolls a full map item. Rarity and prefix/suffix counts use the exact same
// rollers as equipment so maps behave identically (max 3 pre + 3 suf = 6 mods).
// `tierOverride` (optional) forces the map tier - used by the atlas-aware
// drop logic so maps found during a run match the active node's graph.
// `opts.forceNormal` skips the rarity/mod rolls entirely and produces a
// plain Normal (white) map with no modifiers - used for the vendor's free
// starter map so a fresh character always gets an unmodified baseline run.
export function _egGenerateMapDrop(monsterLevel = 1, tierOverride = null, opts = null) {
    monsterLevel = Math.max(1, Math.round(monsterLevel || 1));

    // Forced atlas region (PoE-style drop rules): the drop code resolves
    // the exact region a map may come from - tier and item level derive
    // from it. Atlas tier override: keep item level / mod rolls consistent
    // with the forced tier (tier N ≈ curve level, inverse of _egRollMapTier).
    let mapTier;
    let forcedNode = null;
    if (opts && opts.atlasNodeId && typeof egAtlasNodeById === 'function') {
        forcedNode = egAtlasNodeById(opts.atlasNodeId) || null;
    }
    if (forcedNode) {
        mapTier = forcedNode.tier;
        monsterLevel = _egMapTierMonsterLevel(mapTier);
    } else if (tierOverride != null) {
        mapTier = Math.max(1, Math.min(EG_MAX_MAP_TIER, Math.round(tierOverride)));
        monsterLevel = _egMapTierMonsterLevel(mapTier);
    } else {
        mapTier = _egRollMapTier(monsterLevel);
    }

    if (opts && opts.forceNormal) {
        let normalName = null;
        let atlasNodeId = null;
        if (forcedNode) {
            atlasNodeId = forcedNode.id;
            normalName = egAtlasNodeName(forcedNode);
        } else if (typeof egAtlasPickNodeIdForTier === 'function') {
            atlasNodeId = egAtlasPickNodeIdForTier(mapTier);
            const node = atlasNodeId ? egAtlasNodeById(atlasNodeId) : null;
            if (node) normalName = egAtlasNodeName(node);
        }
        if (!normalName) normalName = _egPickMapBaseName(mapTier);
        const name = _egBuildItemName(normalName, 'common', []);
        return _egWithImplicits({
            id: `map_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            baseId: 'atlas_map',
            name,
            baseName: normalName,
            icon: '🗺️',

            category: 'map',
            type: 'map',
            rarity: 'common',

            mapTier,
            atlasNodeId,
            itemLevel: monsterLevel,
            monsterLevel,
            mods: [],
        });
    }

    const rarity = _egRollRarity();
    const { prefixCount, suffixCount } = _egRollModCounts(rarity);
    const mods = (prefixCount + suffixCount) > 0
        ? _egRollMods(prefixCount, suffixCount, EG_MAP_MOD_TABLES, monsterLevel, null)
        : [];

    // Prefer a concrete atlas region for this tier; fall back to the
    // legacy band-based name roll when the atlas module isn't loaded.
    let baseName = null;
    let atlasNodeId = null;
    if (forcedNode) {
        atlasNodeId = forcedNode.id;
        baseName = egAtlasNodeName(forcedNode);
    } else if (typeof egAtlasPickNodeIdForTier === 'function') {
        atlasNodeId = egAtlasPickNodeIdForTier(mapTier);
        const node = atlasNodeId ? egAtlasNodeById(atlasNodeId) : null;
        if (node) baseName = egAtlasNodeName(node);
    }
    if (!baseName) baseName = _egPickMapBaseName(mapTier);

    const name = _egBuildItemName(baseName, rarity, mods);

    return _egWithImplicits({
        id: `map_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        baseId: 'atlas_map',
        name,
        baseName,
        icon: '🗺️',

        category: 'map',
        type: 'map',
        rarity,

        mapTier,
        atlasNodeId,
        itemLevel: monsterLevel,
        monsterLevel,
        mods,
    });
}

// While a device run is active with a known atlas region, dropped maps are
// restricted to the active node's own tier plus its connected tiers
// (PoE-style: you find your own tier and directly adjacent regions).
// The tier is rolled directly from the allowed set - deriving it from the
// monster level via ceil(level/4) could never produce the lower connected
// tier and made higher tiers vanishingly rare.
// The share of drops from connected tiers scales with the active node's
// tier: low-tier maps find neighbouring regions far more often so early
// players unlock the atlas (and climb tiers) quickly, while high-tier runs
// stay focused on their own tier.
// Resolves the atlas REGION a map dropped inside the active run comes from
// (PoE-style drop rules - see egAtlasDropNodeIds in endgame-atlas.js):
//   normal kill: linked regions of the same or a lower tier + the active
//                region itself + completed regions at or below the active
//                tier
//   boss kill:   additionally linked regions one tier higher - bosses are
//                the only source that climbs the atlas
// Returns a node id, or null when no device run is active / the atlas
// module isn't loaded (callers then fall back to legacy tier rolling).
// Boss kills favour the +1-tier climb regions (see egAtlasPickDropNodeId).
export function _egResolveAtlasDropTarget(isBoss) {
    if (typeof _egActiveMapItem === 'undefined' || !_egActiveMapItem || !_egActiveMapItem.atlasNodeId) return null;

    if (typeof egAtlasPickDropNodeId === 'function') {
        return egAtlasPickDropNodeId(_egActiveMapItem.atlasNodeId, isBoss);
    }
    if (typeof egAtlasDropNodeIds !== 'function') return null;

    const pool = egAtlasDropNodeIds(_egActiveMapItem.atlasNodeId, isBoss);
    if (!pool || pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

// Rerolls ALL mods of a map at the given rarity/counts (orb support).
export function _egRerollMapMods(map, rarity, prefixCount, suffixCount) {
    const mods = _egRollMods(prefixCount, suffixCount, EG_MAP_MOD_TABLES, map.itemLevel || map.monsterLevel || 1, null);
    const name = _egBuildItemName(map.baseName || map.name, rarity, mods);
    return _egWithImplicits({ ...map, rarity, mods, name });
}

// Adds ONE new mod (prefix or suffix, whichever has room) to a map.
export function _egAddOneModToMap(map, rarityForCaps) {
    const existing = map.mods || [];
    const chosenFamilyIds = new Set(existing.map(m => m.familyId));
    const prefixCount = existing.filter(m => m.type === 'prefix').length;
    const suffixCount = existing.filter(m => m.type === 'suffix').length;
    const cap = EG_MOD_CAPS[rarityForCaps];

    const sections = [];
    if (prefixCount < cap.maxPre) sections.push({ type: 'prefix', pool: EG_MAP_MOD_TABLES.prefixes });
    if (suffixCount < cap.maxSuf) sections.push({ type: 'suffix', pool: EG_MAP_MOD_TABLES.suffixes });
    if (sections.length === 0) return map;

    const chosen = sections[Math.floor(Math.random() * sections.length)];
    const pool = _egBuildModPool(chosen.pool, map.itemLevel || map.monsterLevel || 1, chosenFamilyIds, null);
    const entry = _egPickModFromPool(pool);
    if (!entry) return map;

    const tier = _egPickTier(entry.tiers);
    const newMod = {
        familyId: entry.familyId,
        type: chosen.type,
        tier: tier.tier,
        rolledStats: _egBuildRolledStats(entry.family, tier),
    };

    return _egWithImplicits({ ...map, mods: [...existing, newMod] });
}

// Removes ONE random modifier from a map (Annulment semantics).
export function _egRemoveOneModFromMap(map) {
    const existing = map.mods || [];
    if (existing.length === 0) return map;
    const index = Math.floor(Math.random() * existing.length);
    const mods = existing.filter((_, i) => i !== index);
    const name = _egBuildItemName(map.baseName || map.name, map.rarity, mods);
    return _egWithImplicits({ ...map, mods, name });
}


