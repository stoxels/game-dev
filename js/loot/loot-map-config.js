import { LANG } from '../translation/translations.js';

//----------------------------------------------------------------------
//--------------------------MAP CONFIGURATION---------------------------
//----------------------------------------------------------------------

// The static shape of a map item: how often one drops, how many puzzles,
// questions, minutes and mistakes each tier allows, the monster level
// curve, and the name fragments a rolled map draws from. Pure data plus the
// small helpers that read it; nothing here knows how a map is built.

//-------------------CONFIGURATION----------------------------------------
//------------------------------------------------------------------------

export const EG_MAP_DROP_CHANCE_NORMAL = 0.055;  // 5.5% per normal monster kill (scaled by Quantity bonus while on a map) - buffed +10%
export const EG_MAP_DROP_CHANCE_BOSS = 0.44;    // 44% per boss kill (also scaled by Quantity; boss always drops at least one map) - buffed +10%

// Highest possible map tier (cap for tier upgrades via the Orb of Horizons).
export const EG_MAX_MAP_TIER = 16;

// Base run objectives per tier. T16 is the ceiling: at most 6 puzzles and
// 4 questions. Lower tiers ramp down smoothly in four bands so early maps
// stay short:
//   puzzles:   T1–4 → 2 · T5–8 → 3 · T9–12 → 4 · T13–15 → 5 · T16 → 6
//   questions: T1–5 → 1 · T6–10 → 2 · T11–15 → 3 · T16 → 4
// Rolled map modifiers (map_required_puzzles / map_extra_questions) stack
// on top of these bases and can push beyond the cap (clamp 20). Tiers above
// EG_MAX_MAP_TIER only exist on the testing screen, which hardcodes its own
// counts and ignores these helpers.
export function egMapBasePuzzlesForTier(tier) {
    const t = Math.max(1, Math.min(EG_MAX_MAP_TIER, Math.round(tier || 1))); 
    return Math.max(1, Math.min(6, 2 + Math.floor((t - 1) * 4 / 15))); 
}
export function egMapBaseQuestionsForTier(tier) {
    const t = Math.max(1, Math.min(EG_MAX_MAP_TIER, Math.round(tier || 1))); 
    return Math.max(1, Math.min(4, 1 + Math.floor((t - 1) * 3 / 15))); 
}

// Base time limit per tier - derived FROM the objective ramp so early tiers
// get proportionally less time:
//   300 s fixed overhead (drops, transitions, boss intro)
//   + tier * 30 s (kill & content-density budget; T1 +30 → T16 +480)
//   + puzzles * 150 s (tracks the 2→6 puzzle ramp)
//   + questions * 30 s (tracks the 1→4 question ramp)
// T1 ≈ 11:00 (old 16:00), T8 ≈ 17:30 (old 23:00), T16 = 30:00 (old 31:00 -
// ceiling unchanged, since T16 objectives did not change). The time cost of
// one puzzle stays ~2.5 min at every tier, so difficulty grows only through
// objective count and monster density.
export function egMapBaseDurationForTier(tier) {
    const t = Math.max(1, Math.min(EG_MAX_MAP_TIER, Math.round(tier || 1))); 
    return 300 + t * 30 + egMapBasePuzzlesForTier(t) * 150 + egMapBaseQuestionsForTier(t) * 30; 
}

// Base mistake budget per tier - also tracks the objective ramp: roughly one
// allowed mistake per objective, so the per-puzzle forgiveness stays constant
// while the absolute budget grows with the ramp (T1: 6, T16: 10 - ceiling
// unchanged). The map_fewer_mistakes modifier applies on top (min 3).
export function egMapBaseMistakesForTier(tier) {
    return 4 + egMapBasePuzzlesForTier(tier); 
}

// PoE-style monster-level curve per map tier.
//
// The atlas now begins at the level the CAMPAIGN ends (see
// EG_LEVELING_CONFIG.campaignEndLevel = 68), exactly like Path of Exile's
// first maps: Tier 1 monsters are level 68, and the curve climbs gently to
// Tier 16 at level 90. A character arriving from the campaign is therefore
// on-level for T1 (full XP) instead of 60+ levels over it.
// Tier 16 sits at 90 so a character can keep earning meaningful XP deep into
// the late 90s (the XP safe band at pl 100 still reaches monster level ~91).
// Tiers beyond EG_MAX_MAP_TIER only exist on the test screen; they extend
// gently and clamp at EG_ENDGAME_MONSTER_LEVEL_CAP.
export const EG_MAP_TIER_MONSTER_LEVELS = [
    /* T1 */ 68, /* T2 */ 69, /* T3 */ 71, /* T4 */ 72,
    /* T5 */ 74, /* T6 */ 75, /* T7 */ 77, /* T8 */ 78,
    /* T9 */ 80, /* T10 */ 81, /* T11 */ 83, /* T12 */ 84,
    /* T13 */ 86, /* T14 */ 87, /* T15 */ 89, /* T16 */ 90,
];
export const EG_ENDGAME_MONSTER_LEVEL_CAP = 95;

// Monster level for a given map tier (curve lookup + gentle extension).
export function _egMapTierMonsterLevel(tier) {
    const t = Math.max(1, Math.round(tier || 1));
    if (t <= EG_MAP_TIER_MONSTER_LEVELS.length) {
        return EG_MAP_TIER_MONSTER_LEVELS[t - 1];
    }
    const topTier = EG_MAP_TIER_MONSTER_LEVELS.length;
    const topLevel = EG_MAP_TIER_MONSTER_LEVELS[topTier - 1];
    return Math.min(EG_ENDGAME_MONSTER_LEVEL_CAP, topLevel + (t - topTier));
}

// Map tier is derived from the monster level of the killing blow context:
// the lowest tier whose curve value covers the monster level.
export function _egRollMapTier(monsterLevel) {
    const mLvl = Math.max(1, Math.round(monsterLevel || 1));
    for (let t = 0; t < EG_MAP_TIER_MONSTER_LEVELS.length; t++) {
        if (mLvl <= EG_MAP_TIER_MONSTER_LEVELS[t]) return t + 1;
    }
    return EG_MAX_MAP_TIER;
}

// Map base names grouped by tier band. The band containing the rolled tier
// is chosen at random from all bands that cover it.
export const EG_MAP_BASE_NAMES = [
    { minTier: 1, maxTier: 4, name: 'Gaussian Grasslands', nameDe: 'Gaußsche Graslande' },
    { minTier: 1, maxTier: 4, name: 'Variance Valley', nameDe: 'Varianztal' },
    { minTier: 1, maxTier: 4, name: 'Frequency Fields', nameDe: 'Frequenzfelder' },
    { minTier: 1, maxTier: 4, name: 'Sampling Savanna Depths', nameDe: 'Tiefe Sampling-Savanne' },
    { minTier: 3, maxTier: 8, name: 'Bayesian Bayou', nameDe: 'Bayes-Bucht' },
    { minTier: 3, maxTier: 8, name: 'Markov Marsh', nameDe: 'Markow-Sumpf' },
    { minTier: 3, maxTier: 8, name: 'Regression Rift Annex', nameDe: 'Regressions-Rift Annex' },
    { minTier: 5, maxTier: 12, name: 'Hypothesis Hinterlands', nameDe: 'Hypothesen-Hinterland' },
    { minTier: 5, maxTier: 12, name: 'Stochastic Stronghold', nameDe: 'Stochastische Festung' },
    { minTier: 5, maxTier: 12, name: 'Entropy Excavation', nameDe: 'Entropie-Excavation' },
    { minTier: 9, maxTier: 16, name: 'Null Hypothesis Void Pocket', nameDe: 'Nullhypothesis-Leerenblase' },
    { minTier: 9, maxTier: 16, name: 'Distribution Den Depths', nameDe: 'Tiefen der Verteilungshöhle' },
    { minTier: 11, maxTier: 16, name: 'The Infinite Nexus', nameDe: 'Der Unendliche Nexus' },
    { minTier: 13, maxTier: 16, name: 'Core of Convergence', nameDe: 'Kern der Konvergenz' },
    { minTier: 14, maxTier: 16, name: 'Vortex of Possibilities: Overload', nameDe: 'Wirbel der Möglichkeiten: Überladung' },
];

export function _egPickMapBaseName(mapTier) {
    const bands = EG_MAP_BASE_NAMES.filter(b => mapTier >= b.minTier && mapTier <= b.maxTier);
    const band = bands.length > 0
        ? bands[Math.floor(Math.random() * bands.length)]
        : EG_MAP_BASE_NAMES[0];
    return (LANG === 'de') ? band.nameDe : band.name;
}


