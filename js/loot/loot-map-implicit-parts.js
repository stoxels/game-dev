import { egMapBasePuzzlesForTier } from './loot-map-config.js';
import { egAtlasChainBlueprintForMap } from '../endgame/endgame-atlas.js';
//----------------------------------------------------------------------
//-----------------------MAP SIZE AND BOSS ROLLS------------------------
//----------------------------------------------------------------------

// The two rolls that decide a map's footprint and its boss fight. Split
// out because the implicit builder, the generator and the map launcher all
// need them and none of them owns the other.

// Grid-size buckets (same thresholds as _gridSizeBucket in inference-stats.js).
// Used by the run launcher to filter story puzzles and to steer the
// generated-puzzle sizes.
export const EG_GRID_SIZE_BUCKETS = {
    small:   [1, 99],
    medium:  [100, 199],
    large:   [200, 399],
    massive: [400, Infinity],
};

// Derives how many of the map's puzzles fall into each grid-size bucket.
// Higher tiers shift weight toward large/massive grids; a "% larger Puzzle
// Grids" mod (largerPct) pushes the mix further up. The counts always sum
// to the tier's base puzzle count.
export function _egRollMapSizeMix(tier, largerPct) {
    const t = Math.max(1, tier || 1);
    const total = egMapBasePuzzlesForTier(t);

    let weights = {
        small:   Math.max(0.05, 0.50 - t * 0.04),
        medium:  0.32,
        large:   Math.min(0.35, 0.10 + t * 0.02),
        massive: Math.min(0.25, Math.max(0, (t - 4) * 0.025)),
    };

    // The larger-grids mod drains weight out of small/medium and feeds
    // it into large/massive.
    const bonus = Math.max(0, largerPct || 0) / 100;
    if (bonus > 0) {
        const drainS = weights.small * Math.min(0.9, bonus);
        const drainM = weights.medium * Math.min(0.6, bonus * 0.8);
        weights.small -= drainS;
        weights.medium -= drainM;
        weights.large += (drainS + drainM) * 0.65;
        weights.massive += (drainS + drainM) * 0.35;
    }

    // Largest-remainder apportionment → integer counts summing to `total`
    const buckets = Object.keys(weights);
    const raw = {};
    let assigned = 0;
    buckets.forEach(b => {
        raw[b] = weights[b] * total;
        const fl = Math.floor(raw[b]);
        weights[b] = fl;
        assigned += fl;
    });
    const remainder = total - assigned;
    buckets.sort((a, b2) => (raw[b2] % 1) - (raw[a] % 1));
    for (let i = 0; i < remainder; i++) weights[buckets[i % buckets.length]]++;

    return weights;
}

// Every device map ends in a boss fight: the boss arena opens once all
// other objectives (kills / puzzles / questions) are done (see
// _egCanLeaveMap in endgame-encounter-chain.js). The status is baked as an
// immutable implicit so tooltips can state it definitively - orbs/mods
// MUST NOT be able to remove it.
export function _egRollMapBossStatus(map) {
    return { hasBoss: true, maxBosses: 1 };
}

// Resolves the specific boss assigned to a map item. Every atlas region has
// one fixed boss (EG_ATLAS_REGION_BOSSES); the same lookup the launch code
// uses (egAtlasChainBlueprintForMap), so a tooltip always names the boss
// actually fought in the arena. Returns { id, name, emoji } or null when the
// map has no atlas region / the boss def is unknown.
export function _egResolveMapBoss(mapItem) {
    if (!mapItem || typeof egAtlasChainBlueprintForMap !== 'function') return null;
    try {
        const bp = egAtlasChainBlueprintForMap(mapItem);
        if (!bp || !bp.bossId) return null;
        const def = (typeof EG_BOSS_DEFS !== 'undefined') ? globalThis.EG_BOSS_DEFS[bp.bossId] : null;
        if (!def) return null;
        return { id: bp.bossId, name: def.name || bp.bossId, emoji: def.emoji || '💀' };
    } catch (e) {
        return null;
    }
}
