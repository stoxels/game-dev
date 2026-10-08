import { EG_ATLAS_MAX_TIER } from '../endgame/endgame-atlas.js';
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


