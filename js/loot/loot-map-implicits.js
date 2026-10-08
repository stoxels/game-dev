import { _egRollMapBossStatus, _egRollMapSizeMix } from './loot-map-implicit-parts.js';
import { egMapBaseDurationForTier, egMapBaseMistakesForTier, egMapBasePuzzlesForTier, egMapBaseQuestionsForTier } from './loot-map-config.js';
import { _egRollMapCompletionReward } from './loot-map-completion-reward.js';

//----------------------------------------------------------------------
//----------------------------MAP IMPLICITS-----------------------------
//----------------------------------------------------------------------

// The built-in properties every map carries: its grid size, whether it
// ends in a boss, and the free-form implicit lines. These are rolled once
// when the map is generated and then travel with it, unlike the affixes.

// Maps carry five implicit values derived from their tier and shaped by
// specific mods. They are baked into the item at generation/reroll time so
// the tooltip always shows exactly what the run will demand:
//   puzzles          - required puzzles to solve
//   questions        - quiz questions to answer correctly
//   mistakes         - allowed mistake count
//   durationSeconds  - total map time limit
//   sizeMix          - puzzle count per grid-size bucket
//                      (small / medium / large / massive)


export function _egRollMapImplicits(map) {
    const tier = Math.max(1, map.mapTier || 1);
    let puzzles = egMapBasePuzzlesForTier(tier);
    let questions = egMapBaseQuestionsForTier(tier);
    let mistakes = egMapBaseMistakesForTier(tier);
    let duration = egMapBaseDurationForTier(tier);
    let largerPct = 0;

    (Array.isArray(map.mods) ? map.mods : []).forEach(mod => {
        const val = (Array.isArray(mod.rolledStats) && mod.rolledStats.length > 0)
            ? (Number(mod.rolledStats[0].value) || 0) : 0;
        switch (mod.familyId) {
            case 'map_required_puzzles':
                puzzles = Math.min(20, puzzles + val);
                break;
            case 'map_extra_questions':
                questions = Math.min(20, questions + val);
                break;
            case 'map_fewer_mistakes':
                mistakes = Math.max(3, Math.floor(mistakes * (1 - val / 100)));
                break;
            case 'map_less_time':
                duration = Math.max(300, Math.round(duration * (1 - val / 100)));
                break;
            case 'map_puzzle_cells':
                largerPct = val;
                break;
        }
    });

    const sizeMix = _egRollMapSizeMix(tier, largerPct);

    const bossStatus = _egRollMapBossStatus(map);

    return {
        puzzles, questions, mistakes, durationSeconds: duration, sizeMix,
        completionReward: _egRollMapCompletionReward(map),
        hasBoss: bossStatus.hasBoss,
        maxBosses: bossStatus.maxBosses,
    };
}

// Returns the map with freshly computed implicits (used after every roll).
// Boss status is an implicit that must remain immutable once created: if the
// map already carries `implicits.hasBoss`, preserve it so orbs cannot reroll
// whether the map has a boss (only brand-new maps without implicits roll a
// fresh boss value).
export function _egWithImplicits(map) {
    const prevImp = map.implicits;
    const prevHasBoss = prevImp != null ? prevImp.hasBoss : null;
    const prevMaxBosses = prevImp != null ? prevImp.maxBosses : null;
    const rolled = _egRollMapImplicits(map);
    if (prevHasBoss != null) {
        rolled.hasBoss = !!prevHasBoss;
        rolled.maxBosses = prevMaxBosses != null ? prevMaxBosses : (prevHasBoss ? 1 : 0);
        if (!rolled.hasBoss) rolled.maxBosses = 0;
        else if (rolled.maxBosses < 1) rolled.maxBosses = 1;
    }
    return { ...map, implicits: rolled };
}
