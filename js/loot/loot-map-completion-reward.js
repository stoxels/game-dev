import { EG_ATLAS_MAX_TIER } from '../endgame/endgame-atlas.js';
import { egAddCurrency } from '../endgame/endgame-hub-drag-and-drop.js';
import { egSaveHubState } from '../endgame/endgame-hub.js';
import { _egAddItemToStash } from '../endgame/hub-stash.js';
import { _egGetPlayerLevel } from '../endgame/endgame-leveling.js';
import { _egGenerateEquipmentDrop } from './loot-equipment-generator.js';
import { _egAddMapToMapStash } from './loot-map-drops.js';
import { _egGenerateMapDrop } from './loot-maps.js';
import { egAddEssence } from './loot-essences-stash.js';
import { EG_CURRENCY_DEFS } from './loot-currency.js';
import { _EG_ESSENCE_FAMILIES } from './loot-essences.js';
import { EG_ESSENCE_DEFS } from './loot-essences-defs.js';

//----------------------------------------------------------------------
//------------------------MAP COMPLETION REWARD-------------------------
//----------------------------------------------------------------------

// What a finished map pays out: the reward pools, the per-tier essence
// hydration, and the roll that picks one. The pools are grown lazily from
// the currency and essence tables so a new currency or essence family is
// picked up without touching this file.

//-------------------MAP COMPLETION REWARD--------------------------------
//------------------------------------------------------------------------
// Every map rolls a random completion reward: 2–10 copies of one
// higher-grade orb or essence (orbs of transmutation / augmentation are
// excluded - too low level). The roll is baked in with the implicits so it
// is fixed per map item and shown in its tooltip. Higher tiers unlock the
// rarer entries via `minTier`.

export const EG_MAP_COMPLETION_REWARD_POOL = [
    // ── Orbs ─────────────────────────────────────────────────────
    { id: 'orb_alteration', weight: 280 },
    { id: 'orb_scouring',   weight: 170 },
    { id: 'orb_alchemy',    weight: 150 },
    { id: 'orb_chance',     weight: 120 },
    { id: 'orb_regal',      weight: 95 },
    { id: 'orb_chaos',      weight: 75 },
    { id: 'orb_annulment',  weight: 45 },
    { id: 'orb_exalted',    weight: 28 },
    { id: 'orb_divine',     weight: 14, minTier: 4 },
    { id: 'orb_ascension',  weight: 36, minTier: 5 },
    { id: 'orb_elevation',  weight: 8,  minTier: 6 },
    { id: 'orb_cataclysm',  weight: 5,  minTier: 8 },
    { id: 'mirror_of_kalandra', weight: 1, minTier: 10 },
];

// Map completion essences - one entry per per-modifier essence so every targeted
// essence family can appear as a map completion reward. Weight 5 keeps total
// essence weight comparable to original legacy pool (≈93×5 = 465 vs old 500).
// NOTE (module era): maps.js sits in an import cycle with essences.js (via
// currency/equipment-generator/implicits/.../gate) and can be evaluated while
// essences is still initializing, so the pool is hydrated lazily on first use
// instead of at module-eval time (classic linear order always had essences
// ready first; ES-module cycle order does not - typeof guards THROW there).
export const EG_MAP_COMPLETION_ESSENCE_POOL = [];
export function _egHydrateMapCompletionEssencePool() {
    if (EG_MAP_COMPLETION_ESSENCE_POOL.length) return EG_MAP_COMPLETION_ESSENCE_POOL;
    for (const fid of _EG_ESSENCE_FAMILIES) {
        EG_MAP_COMPLETION_ESSENCE_POOL.push({ id: 'essence_' + fid, weight: 5 });
    }
    return EG_MAP_COMPLETION_ESSENCE_POOL;
}

// Combined pool used at roll time - orbs plus dynamically built essence entries.
// Keep a static reference for backwards compat, but the live roll builds fresh
// so new essences (e.g. essence_inc_health) automatically appear.
export const EG_MAP_COMPLETION_REWARD_POOL_STATIC = EG_MAP_COMPLETION_REWARD_POOL.slice();
export function _egGetMapCompletionRewardPool() {
    const base = EG_MAP_COMPLETION_REWARD_POOL_STATIC.slice();
    const existingIds = new Set(base.map(e => e.id));
    // Live essence families (lazy hydration: cycle-safe in the module era).
    _egHydrateMapCompletionEssencePool();
    for (const e of EG_MAP_COMPLETION_ESSENCE_POOL) {
        if (!existingIds.has(e.id)) { base.push(e); existingIds.add(e.id); }
    }
    return base;
}

// Resolves a completion-reward def from either currency table.
export function _egGetCompletionRewardDef(id) {
    return EG_CURRENCY_DEFS[id] || EG_ESSENCE_DEFS[id] || null;
}

// Rolls the completion reward for a map → { id, count }. The count scales
// with map difficulty: higher tiers and more/higher-tier modifiers yield
// bigger payouts (≈2–3 for an easy low-tier map with few mods, up to 8–10
// for a fully modded max-tier map).
export function _egRollMapCompletionReward(map) {
    const tier = Math.max(1, Math.min(EG_ATLAS_MAX_TIER, map.mapTier || 1));
    const mods = Array.isArray(map.mods) ? map.mods : [];
    const livePool = (typeof _egGetMapCompletionRewardPool === 'function') ? _egGetMapCompletionRewardPool() : EG_MAP_COMPLETION_REWARD_POOL;
    const pool = livePool.filter(e => !e.minTier || tier >= e.minTier);
    const total = pool.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    let picked = pool[0];
    for (const entry of pool) {
        roll -= entry.weight;
        if (roll <= 0) { picked = entry; break; }
    }
    // Difficulty fraction: ~70% from atlas tier, ~30% from modifier load
    // (each mod counts its tier, capped so a full modded map saturates).
    const tierFrac = (tier - 1) / (EG_ATLAS_MAX_TIER - 1);
    const modLoad = mods.reduce((s, m) => s + ((Number(m && m.tier) || 1)), 0);
    const modFrac = Math.min(1, modLoad / 12);
    const difficulty = tierFrac * 0.7 + modFrac * 0.3;
    // 2 at zero difficulty up to 9, plus ±0/1 jitter → final range 2..10
    const count = Math.max(2, Math.min(10, Math.round(2 + difficulty * 7 + Math.random())));
    return { id: picked.id, count };
}


//-------------------GUARANTEED LOOT REWARDS-------------------------------
//------------------------------------------------------------------------
// Bonus objectives and inference quests pay out a fixed KIND of loot (an
// equipment piece, a core, an essence or an atlas map) rolled at a level
// that fits where the player is: helpful, never a jackpot. Equipment is
// capped at uncommon/rare, cores come from a level-gated pool (no mirror,
// ancient or elevation-tier orbs) and maps keep the quest's own tier.

export const EG_SCRIPTED_LOOT_KINDS = ['equipment', 'core', 'essence'];

// Cores a guaranteed reward may hand out: [id, weight, minLevel, minCount, maxCount].
const EG_SCRIPTED_CORE_POOL = [
    ['orb_transmutation', 40, 1, 2, 3],
    ['orb_augmentation', 40, 1, 2, 3],
    ['orb_alteration', 50, 1, 2, 3],
    ['orb_alchemy', 30, 6, 1, 2],
    ['orb_scouring', 25, 10, 1, 2],
    ['orb_chance', 25, 12, 1, 2],
    ['orb_blessing', 25, 16, 1, 2],
    ['orb_regal', 20, 22, 1, 2],
    ['orb_bloom', 12, 28, 1, 1],
    ['orb_annulment', 10, 30, 1, 1],
    ['orb_chaos', 14, 34, 1, 1],
    ['orb_exalted', 5, 50, 1, 1],
    ['orb_divine', 5, 50, 1, 1],
];

// Weighted pick over a list, weight read through `weightOf`.
function _egScriptedPick(list, weightOf) {
    const total = list.reduce((s, e) => s + weightOf(e), 0);
    let roll = Math.random() * total;
    for (const e of list) {
        roll -= weightOf(e);
        if (roll <= 0) return e;
    }
    return list[list.length - 1];
}

// The level guaranteed rewards are rolled at: the player's own level.
export function _egScriptedLootLevel() {
    return Math.max(1, Math.round(Number(_egGetPlayerLevel()) || 1));
}

// Grants one guaranteed loot reward straight into the hub stashes and
// returns { kind, icon, name, rarity, count } for the caller to display
// (null when nothing could be granted). kind: equipment | core | essence |
// map. `level` is the power level to roll at; `tier` only matters for maps.
export function egGrantScriptedLoot(kind, level, tier) {
    level = Math.max(1, Math.round(Number(level) || 1));
    if (typeof globalThis._egLoadHubState === 'function') globalThis._egLoadHubState();
    let result = null;
    if (kind === 'equipment') {
        const item = _egGenerateEquipmentDrop(level, Math.random() < 0.6 ? 'uncommon' : 'rare');
        if (item) {
            _egAddItemToStash(item);
            result = { kind, icon: item.icon, name: item.name, rarity: item.rarity, count: 1 };
        }
    } else if (kind === 'core') {
        const pool = EG_SCRIPTED_CORE_POOL.filter(e => level >= e[2] && EG_CURRENCY_DEFS[e[0]]);
        const [id, , , lo, hi] = _egScriptedPick(pool, e => e[1]);
        const def = EG_CURRENCY_DEFS[id];
        const count = lo + Math.floor(Math.random() * (hi - lo + 1));
        if (egAddCurrency(id, count, { name: def.name, icon: def.icon, rarity: 'currency', category: 'currency', description: def.description })) {
            result = { kind, icon: def.icon, name: def.name, rarity: 'currency', count };
        }
    } else if (kind === 'essence') {
        _egHydrateMapCompletionEssencePool();
        const entry = _egScriptedPick(EG_MAP_COMPLETION_ESSENCE_POOL, e => e.weight);
        const def = EG_ESSENCE_DEFS[entry.id];
        if (def && egAddEssence(entry.id, 1, def)) {
            result = { kind, icon: def.icon, name: def.name, rarity: 'essence', count: 1 };
        }
    } else if (kind === 'map') {
        const map = _egGenerateMapDrop(level, tier || 1);
        if (map && _egAddMapToMapStash(map)) {
            result = { kind, icon: map.icon || '🗺️', name: map.name, rarity: map.rarity || 'common', count: 1 };
        }
    }
    if (result) egSaveHubState();
    return result;
}

// Picks a loot kind for the bonus objective's non-puzzle-item outcomes.
export function _egRollScriptedLootKind() {
    return EG_SCRIPTED_LOOT_KINDS[Math.floor(Math.random() * EG_SCRIPTED_LOOT_KINDS.length)];
}
