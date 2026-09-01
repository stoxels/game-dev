//------------------------------------------------------------------------
//-------------------ENDGAME MAP ITEMS (PoE-STYLE)------------------------
//------------------------------------------------------------------------
// Rollable map items that drop from monsters and are played through the
// Probability Gate map device.
//
//   - Maps roll rarity + modifiers exactly like equipment:
//       common (0 mods), uncommon (max 1 pre / 1 suf),
//       rare (max 3 pre / 3 suf), epic (max 3 pre / 3 suf).
//   - Every mod family belongs to one of three categories (`affects`):
//       'player'  — weakens the player character
//       'monster' — strengthens the monsters
//       'puzzle'  — changes puzzle behaviour
//   - Maps drop on the grid like loot; claiming one inserts it into the
//     map stash (_egMapStash) shown on the Probability Gate screen.
//
// Load AFTER endgame-equipment-generator.js (reuses _egRollRarity,
// _egRollModCounts, _egRollMods, _egBuildItemName, _egPickTier,
// _egBuildModPool, _egPickModFromPool, EG_MOD_CAPS)
// and AFTER endgame-hub-drag-and-drop.js (needs _egMapStash render helpers).
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONFIGURATION----------------------------------------
//------------------------------------------------------------------------

const EG_MAP_DROP_CHANCE_NORMAL = 0.055;  // 5.5% per normal monster kill (scaled by Quantity bonus while on a map) — buffed +10%
const EG_MAP_DROP_CHANCE_BOSS = 0.44;    // 44% per boss kill (also scaled by Quantity; boss always drops at least one map) — buffed +10%

// Highest possible map tier (cap for tier upgrades via the Orb of Horizons).
const EG_MAX_MAP_TIER = 16;

// Base run objectives per tier. T16 is the ceiling: at most 6 puzzles and
// 4 questions. Lower tiers ramp down smoothly in four bands so early maps
// stay short:
//   puzzles:   T1–4 → 2 · T5–8 → 3 · T9–12 → 4 · T13–15 → 5 · T16 → 6
//   questions: T1–5 → 1 · T6–10 → 2 · T11–15 → 3 · T16 → 4
// Rolled map modifiers (map_required_puzzles / map_extra_questions) stack
// on top of these bases and can push beyond the cap (clamp 20). Tiers above
// EG_MAX_MAP_TIER only exist on the testing screen, which hardcodes its own
// counts and ignores these helpers.
function egMapBasePuzzlesForTier(tier) {
    const t = Math.max(1, Math.min(EG_MAX_MAP_TIER, Math.round(tier || 1))); 
    return Math.max(1, Math.min(6, 2 + Math.floor((t - 1) * 4 / 15))); 
}
function egMapBaseQuestionsForTier(tier) {
    const t = Math.max(1, Math.min(EG_MAX_MAP_TIER, Math.round(tier || 1))); 
    return Math.max(1, Math.min(4, 1 + Math.floor((t - 1) * 3 / 15))); 
}

// Base time limit per tier — derived FROM the objective ramp so early tiers
// get proportionally less time:
//   300 s fixed overhead (drops, transitions, boss intro)
//   + tier * 30 s (kill & content-density budget; T1 +30 → T16 +480)
//   + puzzles * 150 s (tracks the 2→6 puzzle ramp)
//   + questions * 30 s (tracks the 1→4 question ramp)
// T1 ≈ 11:00 (old 16:00), T8 ≈ 17:30 (old 23:00), T16 = 30:00 (old 31:00 —
// ceiling unchanged, since T16 objectives did not change). The time cost of
// one puzzle stays ~2.5 min at every tier, so difficulty grows only through
// objective count and monster density.
function egMapBaseDurationForTier(tier) {
    const t = Math.max(1, Math.min(EG_MAX_MAP_TIER, Math.round(tier || 1))); 
    return 300 + t * 30 + egMapBasePuzzlesForTier(t) * 150 + egMapBaseQuestionsForTier(t) * 30; 
}

// Base mistake budget per tier — also tracks the objective ramp: roughly one
// allowed mistake per objective, so the per-puzzle forgiveness stays constant
// while the absolute budget grows with the ramp (T1: 6, T16: 10 — ceiling
// unchanged). The map_fewer_mistakes modifier applies on top (min 3).
function egMapBaseMistakesForTier(tier) {
    return 4 + egMapBasePuzzlesForTier(tier); 
}

// PoE-style convex monster-level curve per map tier.
// Early tiers climb fast (quick leveling through the low tiers), late
// tiers stretch out. Tier 16 sits at monster level 90 so a character can
// keep earning meaningful XP all the way to the level-100 cap (the XP
// safe band at pl 100 still reaches monster level ~91, so T16 stays
// near-full XP even for end-of-campaign characters).
// Tiers beyond EG_MAX_MAP_TIER only exist on the test screen; they extend
// gently and clamp at EG_ENDGAME_MONSTER_LEVEL_CAP.
const EG_MAP_TIER_MONSTER_LEVELS = [
    /* T1 */ 3, /* T2 */ 6, /* T3 */ 10, /* T4 */ 14,
    /* T5 */ 19, /* T6 */ 24, /* T7 */ 30, /* T8 */ 36,
    /* T9 */ 43, /* T10 */ 50, /* T11 */ 57, /* T12 */ 64,
    /* T13 */ 71, /* T14 */ 78, /* T15 */ 84, /* T16 */ 90,
];
const EG_ENDGAME_MONSTER_LEVEL_CAP = 95;

// Monster level for a given map tier (curve lookup + gentle extension).
function _egMapTierMonsterLevel(tier) {
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
function _egRollMapTier(monsterLevel) {
    const mLvl = Math.max(1, Math.round(monsterLevel || 1));
    for (let t = 0; t < EG_MAP_TIER_MONSTER_LEVELS.length; t++) {
        if (mLvl <= EG_MAP_TIER_MONSTER_LEVELS[t]) return t + 1;
    }
    return EG_MAX_MAP_TIER;
}

// Map base names grouped by tier band. The band containing the rolled tier
// is chosen at random from all bands that cover it.
const EG_MAP_BASE_NAMES = [
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

function _egPickMapBaseName(mapTier) {
    const bands = EG_MAP_BASE_NAMES.filter(b => mapTier >= b.minTier && mapTier <= b.maxTier);
    const band = bands.length > 0
        ? bands[Math.floor(Math.random() * bands.length)]
        : EG_MAP_BASE_NAMES[0];
    return (LANG === 'de') ? band.nameDe : band.name;
}


//------------------------------------------------------------------------
//-------------------MAP MODIFIER TABLES----------------------------------
//------------------------------------------------------------------------
// Same schema as the equipment tables in endgame-mod-tables.js, plus an
// `affects` tag per family: 'player' | 'monster' | 'puzzle'.
// T1 = best/highest roll. 'weight' higher = more common. 'ilvl' gates tiers.

const EG_MAP_MOD_TABLES = {

    prefixes: {

        // ── Monster-strengthening ────────────────────────────────────
        map_monster_life: {
            id: 'map_monster_life', affects: 'monster',
            label: 'Monsters have +#% more Life', labelDe: 'Monster haben +#% mehr Leben',
            tiers: [
                { tier: 1, min: 68, max: 83, weight: 100, ilvl: 60 },
                { tier: 2, min: 47, max: 65, weight: 300, ilvl: 35 },
                { tier: 3, min: 26, max: 44, weight: 700, ilvl: 12 },
                { tier: 4, min: 13, max: 23, weight: 1400, ilvl: 1 },
            ],
        },
        map_monster_damage: {
            id: 'map_monster_damage', affects: 'monster',
            label: 'Monsters deal +#% more Damage', labelDe: 'Monster verursachen +#% mehr Schaden',
            tiers: [
                { tier: 1, min: 62, max: 78, weight: 100, ilvl: 60 },
                { tier: 2, min: 42, max: 60, weight: 300, ilvl: 35 },
                { tier: 3, min: 23, max: 39, weight: 700, ilvl: 12 },
                { tier: 4, min: 10, max: 21, weight: 1400, ilvl: 1 },
            ],
        },
        map_monster_speed: {
            id: 'map_monster_speed', affects: 'monster',
            label: 'Monsters attack #% faster', labelDe: 'Monster greifen #% schneller an',
            tiers: [
                { tier: 1, min: 57, max: 73, weight: 90, ilvl: 55 },
                { tier: 2, min: 36, max: 55, weight: 280, ilvl: 30 },
                { tier: 3, min: 18, max: 34, weight: 650, ilvl: 10 },
                { tier: 4, min: 8, max: 16, weight: 1300, ilvl: 1 },
            ],
        },
        map_extra_monsters: {
            id: 'map_extra_monsters', affects: 'monster',
            label: '+# Monsters in this Map', labelDe: '+# Monster in dieser Karte',
            tiers: [
                { tier: 1, min: 26, max: 32, weight: 80, ilvl: 50 },
                { tier: 2, min: 14, max: 25, weight: 350, ilvl: 20 },
                { tier: 3, min: 6, max: 13, weight: 900, ilvl: 1 },
            ],
        },

        // ── Player-weakening ─────────────────────────────────────────
        map_player_life: {
            id: 'map_player_life', affects: 'player',
            label: '#% reduced maximum Life', labelDe: '#% reduziertes maximales Leben',
            tiers: [
                { tier: 1, min: 55, max: 65, weight: 100, ilvl: 55 },
                { tier: 2, min: 34, max: 53, weight: 320, ilvl: 28 },
                { tier: 3, min: 16, max: 32, weight: 750, ilvl: 8 },
                { tier: 4, min: 6, max: 14, weight: 1400, ilvl: 1 },
            ],
        },
        map_player_damage: {
            id: 'map_player_damage', affects: 'player',
            label: '#% reduced Damage', labelDe: '#% reduzierter Schaden',
            tiers: [
                { tier: 1, min: 55, max: 65, weight: 100, ilvl: 55 },
                { tier: 2, min: 32, max: 52, weight: 320, ilvl: 28 },
                { tier: 3, min: 14, max: 31, weight: 750, ilvl: 8 },
                { tier: 4, min: 5, max: 13, weight: 1400, ilvl: 1 },
            ],
        },
        map_player_defences: {
            id: 'map_player_defences', affects: 'player',
            label: '#% reduced Armour, Evasion and Absorption', labelDe: '#% reduzierte Rüstung, Ausweichen und Absorption',
            tiers: [
                { tier: 1, min: 52, max: 65, weight: 90, ilvl: 50 },
                { tier: 2, min: 31, max: 51, weight: 300, ilvl: 25 },
                { tier: 3, min: 13, max: 30, weight: 700, ilvl: 6 },
                { tier: 4, min: 5, max: 12, weight: 1300, ilvl: 1 },
            ],
        },
        map_melee_damage: {
            id: 'map_melee_damage', affects: 'player',
            label: '#% reduced Melee Attack Damage', labelDe: '#% reduzierter Nahkampfangriffsschaden',
            tiers: [
                { tier: 1, min: 52, max: 65, weight: 90, ilvl: 50 },
                { tier: 2, min: 31, max: 51, weight: 300, ilvl: 25 },
                { tier: 3, min: 13, max: 30, weight: 700, ilvl: 6 },
                { tier: 4, min: 5, max: 12, weight: 1300, ilvl: 1 },
            ],
        },
        map_projectile_damage: {
            id: 'map_projectile_damage', affects: 'player',
            label: '#% reduced Projectile Damage', labelDe: '#% reduzierter Projektilschaden',
            tiers: [
                { tier: 1, min: 52, max: 65, weight: 90, ilvl: 50 },
                { tier: 2, min: 31, max: 51, weight: 300, ilvl: 25 },
                { tier: 3, min: 13, max: 30, weight: 700, ilvl: 6 },
                { tier: 4, min: 5, max: 12, weight: 1300, ilvl: 1 },
            ],
        },

        // ── Curses & Defences-down (PoE-style) ───────────────────────
        map_elem_weakness: {
            id: 'map_elem_weakness', affects: 'player',
            label: 'Elemental Weakness — #% reduced all Resistances', labelDe: 'Elementarschwäche – #% reduziert alle Widerstände',
            tiers: [
                { tier: 1, min: 52, max: 65, weight: 90, ilvl: 52 },
                { tier: 2, min: 32, max: 51, weight: 310, ilvl: 26 },
                { tier: 3, min: 13, max: 31, weight: 760, ilvl: 1 },
            ],
        },
        map_temporal_chains: {
            id: 'map_temporal_chains', affects: 'player',
            label: 'Temporal Chains — you act #% slower', labelDe: 'Zeitketten – du handelst #% langsamer',
            tiers: [
                { tier: 1, min: 39, max: 49, weight: 85, ilvl: 54 },
                { tier: 2, min: 23, max: 36, weight: 300, ilvl: 28 },
                { tier: 3, min: 10, max: 21, weight: 720, ilvl: 1 },
            ],
        },
        map_vulnerability: {
            id: 'map_vulnerability', affects: 'player',
            label: 'Vulnerability — you take #% increased Damage', labelDe: 'Verwundbarkeit – du erleidest #% erhöhten Schaden',
            tiers: [
                { tier: 1, min: 46, max: 58, weight: 90, ilvl: 50 },
                { tier: 2, min: 26, max: 44, weight: 310, ilvl: 24 },
                { tier: 3, min: 10, max: 23, weight: 750, ilvl: 1 },
            ],
        },
        map_no_regeneration: {
            id: 'map_no_regeneration', affects: 'player',
            label: 'No Life Regeneration', labelDe: 'Keine Lebensregeneration',
            tiers: [
                { tier: 1, min: 1, max: 1, weight: 120, ilvl: 40 },
            ],
        },
        map_reduced_recovery: {
            id: 'map_reduced_recovery', affects: 'player',
            label: '#% less Life gained from Kills', labelDe: '#% weniger Leben durch Kills',
            tiers: [
                { tier: 1, min: 78, max: 98, weight: 95, ilvl: 48 },
                { tier: 2, min: 46, max: 77, weight: 320, ilvl: 22 },
                { tier: 3, min: 20, max: 44, weight: 800, ilvl: 1 },
            ],
        },
        map_mistake_damage: {
            id: 'map_mistake_damage', affects: 'player',
            label: 'Making a Mistake deals #% of maximum Life as Damage', labelDe: 'Fehler verursachen #% des maximalen Lebens als Schaden',
            tiers: [
                { tier: 1, min: 10, max: 16, weight: 100, ilvl: 46 },
                { tier: 2, min: 5, max: 9, weight: 330, ilvl: 20 },
                { tier: 3, min: 3, max: 4, weight: 800, ilvl: 1 },
            ],
        },
        map_reduced_evasion: {
            id: 'map_reduced_evasion', affects: 'player',
            label: '#% reduced Evasion', labelDe: '#% reduzierte Ausweichen',
            tiers: [
                { tier: 1, min: 58, max: 72, weight: 95, ilvl: 46 },
                { tier: 2, min: 32, max: 57, weight: 320, ilvl: 20 },
                { tier: 3, min: 13, max: 31, weight: 780, ilvl: 1 },
            ],
        },
        map_reduced_absorption: {
            id: 'map_reduced_absorption', affects: 'player',
            label: '#% reduced maximum Absorption', labelDe: '#% reduzierte maximale Absorption',
            tiers: [
                { tier: 1, min: 58, max: 72, weight: 95, ilvl: 46 },
                { tier: 2, min: 32, max: 57, weight: 320, ilvl: 20 },
                { tier: 3, min: 13, max: 31, weight: 780, ilvl: 1 },
            ],
        },

        // ── Offence & sustain curses ─────────────────────────────────
        map_reduced_accuracy: {
            id: 'map_reduced_accuracy', affects: 'player',
            label: '#% reduced Accuracy', labelDe: '#% reduzierte Genauigkeit',
            tiers: [
                { tier: 1, min: 46, max: 58, weight: 95, ilvl: 44 },
                { tier: 2, min: 26, max: 44, weight: 320, ilvl: 18 },
                { tier: 3, min: 10, max: 23, weight: 800, ilvl: 1 },
            ],
        },
        map_reduced_attack_speed: {
            id: 'map_reduced_attack_speed', affects: 'player',
            label: '#% less Attack Speed', labelDe: '#% weniger Angriffsgeschwindigkeit',
            tiers: [
                { tier: 1, min: 32, max: 43, weight: 90, ilvl: 50 },
                { tier: 2, min: 18, max: 31, weight: 310, ilvl: 24 },
                { tier: 3, min: 8, max: 16, weight: 770, ilvl: 1 },
            ],
        },
        map_chilling_aura: {
            id: 'map_chilling_aura', affects: 'player',
            label: 'An icy Aura permanently Chills you', labelDe: 'Eine eisige Aura kühlt dich dauerhaft',
            tiers: [
                { tier: 1, min: 1, max: 1, weight: 110, ilvl: 46 },
            ],
        },
        map_longer_lockout: {
            id: 'map_longer_lockout', affects: 'player',
            label: 'Block Lockouts last #% longer', labelDe: 'Blockaussperrungen dauern #% länger',
            tiers: [
                { tier: 1, min: 58, max: 72, weight: 95, ilvl: 42 },
                { tier: 2, min: 32, max: 57, weight: 320, ilvl: 16 },
                { tier: 3, min: 13, max: 31, weight: 800, ilvl: 1 },
            ],
        },
        map_slower_absorption: {
            id: 'map_slower_absorption', affects: 'player',
            label: 'Absorption recharges #% slower', labelDe: 'Absorption lädt #% langsamer wieder auf',
            tiers: [
                { tier: 1, min: 65, max: 84, weight: 95, ilvl: 40 },
                { tier: 2, min: 39, max: 64, weight: 320, ilvl: 14 },
                { tier: 3, min: 16, max: 38, weight: 800, ilvl: 1 },
            ],
        },
        map_longer_ailments: {
            id: 'map_longer_ailments', affects: 'player',
            label: 'Ailments on you last #% longer', labelDe: 'Zustände auf dir dauern #% länger',
            tiers: [
                { tier: 1, min: 52, max: 65, weight: 95, ilvl: 46 },
                { tier: 2, min: 32, max: 51, weight: 320, ilvl: 20 },
                { tier: 3, min: 13, max: 31, weight: 780, ilvl: 1 },
            ],
        },
        map_increased_dot: {
            id: 'map_increased_dot', affects: 'player',
            label: '#% increased Damage over Time taken', labelDe: '#% erhöhter erlittener Schaden über Zeit',
            tiers: [
                { tier: 1, min: 46, max: 58, weight: 95, ilvl: 42 },
                { tier: 2, min: 26, max: 44, weight: 320, ilvl: 16 },
                { tier: 3, min: 10, max: 23, weight: 800, ilvl: 1 },
            ],
        },
        map_freezing_hits: {
            id: 'map_freezing_hits', affects: 'player',
            label: 'Monster Cold Hits have a #% chance to Freeze you', labelDe: 'Kältetreffer von Monstern haben #% Chance dich einzufrieren',
            tiers: [
                { tier: 1, min: 32, max: 46, weight: 90, ilvl: 44 },
                { tier: 2, min: 16, max: 31, weight: 310, ilvl: 18 },
                { tier: 3, min: 6, max: 14, weight: 780, ilvl: 1 },
            ],
        },
        map_mana_costs: {
            id: 'map_mana_costs', affects: 'player',
            label: 'Class Abilities cost #% more Mana', labelDe: 'Klassenfähigkeiten kosten +#% mehr Mana',
            tiers: [
                { tier: 1, min: 52, max: 72, weight: 95, ilvl: 38 },
                { tier: 2, min: 32, max: 51, weight: 320, ilvl: 12 },
                { tier: 3, min: 13, max: 31, weight: 800, ilvl: 1 },
            ],
        },

        // ── Puzzle behaviour ─────────────────────────────────────────
        map_puzzle_cells: {
            id: 'map_puzzle_cells', affects: 'puzzle',
            label: '#% larger Puzzle Grids', labelDe: '#% größere Rätselgitter',
            tiers: [
                { tier: 1, min: 31, max: 39, weight: 90, ilvl: 45 },
                { tier: 2, min: 18, max: 30, weight: 330, ilvl: 18 },
                { tier: 3, min: 8, max: 17, weight: 800, ilvl: 1 },
            ],
        },
        map_required_puzzles: {
            id: 'map_required_puzzles', affects: 'puzzle',
            label: '+# required Puzzles', labelDe: '+# benötigte Rätsel',
            tiers: [
                { tier: 1, min: 3, max: 4, weight: 120, ilvl: 40 },
                { tier: 2, min: 1, max: 1, weight: 850, ilvl: 1 },
            ],
        },

        // ── Elemental Hazards (player-only environmental effects) ────
        // The rolled value is the hazard INTENSITY (%): it scales hazard
        // damage, spawn counts and frequency. Mitigated by the matching
        // player resistance — see endgame-hazards.js.
        map_hazard_lava: {
            id: 'map_hazard_lava', affects: 'player',
            label: 'Lava Balls surround the Puzzle (#% intensity)', labelDe: 'Lavakugeln umgeben das Rätsel (#% Intensität)',
            tiers: [
                { tier: 1, min: 104, max: 130, weight: 90, ilvl: 60 },
                { tier: 2, min: 65, max: 98, weight: 300, ilvl: 30 },
                { tier: 3, min: 32, max: 58, weight: 800, ilvl: 1 },
            ],
        },
        map_hazard_blizzard: {
            id: 'map_hazard_blizzard', affects: 'player',
            label: 'Blizzard — Icicles rain from above (#% intensity)', labelDe: 'Blizzard — Eiszapfen regnen von oben (#% Intensität)',
            tiers: [
                { tier: 1, min: 104, max: 130, weight: 90, ilvl: 60 },
                { tier: 2, min: 65, max: 98, weight: 300, ilvl: 30 },
                { tier: 3, min: 32, max: 58, weight: 800, ilvl: 1 },
            ],
        },
        map_hazard_firewall: {
            id: 'map_hazard_firewall', affects: 'player',
            label: 'Fire Walls sweep across the Map (#% intensity)', labelDe: 'Feuerwände fegen über die Karte (#% Intensität)',
            tiers: [
                { tier: 1, min: 104, max: 130, weight: 85, ilvl: 60 },
                { tier: 2, min: 65, max: 98, weight: 290, ilvl: 30 },
                { tier: 3, min: 32, max: 58, weight: 780, ilvl: 1 },
            ],
        },
        map_hazard_meteor: {
            id: 'map_hazard_meteor', affects: 'player',
            label: 'Meteor Barrages bombard the Map (#% intensity)', labelDe: 'Meteorsalven bombardieren die Karte (#% Intensität)',
            tiers: [
                { tier: 1, min: 104, max: 130, weight: 85, ilvl: 62 },
                { tier: 2, min: 65, max: 98, weight: 290, ilvl: 32 },
                { tier: 3, min: 32, max: 58, weight: 780, ilvl: 1 },
            ],
        },
    },

    suffixes: {

        // ── Monster-strengthening ────────────────────────────────────
        map_monster_resistances: {
            id: 'map_monster_resistances', affects: 'monster',
            label: 'Monsters have +#% to all Resistances', labelDe: 'Monster haben +#% zu allen Widerständen',
            tiers: [
                { tier: 1, min: 58, max: 68, weight: 100, ilvl: 55 },
                { tier: 2, min: 39, max: 57, weight: 320, ilvl: 30 },
                { tier: 3, min: 21, max: 38, weight: 720, ilvl: 8 },
                { tier: 4, min: 8, max: 20, weight: 1350, ilvl: 1 },
            ],
        },
        // NOTE: `map_boss_chance` was removed — boss presence is a pure implicit
        // (see `_egRollMapBossStatus` / `_egWithImplicits`). It remains in
        // `EG_MAP_MOD_REWARDS` for legacy maps that already rolled it, but it
        // no longer appears on new maps so orbs cannot influence the boss roll.

        // ── Monster behaviour (PoE-style) ─────────────────────────────
        map_monster_crit: {
            id: 'map_monster_crit', affects: 'monster',
            label: 'Monsters have +#% chance to deal Double Damage', labelDe: 'Monster haben +#% Chance auf doppelten Schaden',
            tiers: [
                { tier: 1, min: 32, max: 46, weight: 90, ilvl: 52 },
                { tier: 2, min: 16, max: 31, weight: 310, ilvl: 26 },
                { tier: 3, min: 5, max: 13, weight: 760, ilvl: 1 },
            ],
        },
        map_monster_avoid_ailments: {
            id: 'map_monster_avoid_ailments', affects: 'monster',
            label: 'Monsters have +#% chance to Avoid Ailments', labelDe: 'Monster haben +#% Chance, Zustände zu vermeiden',
            tiers: [
                { tier: 1, min: 65, max: 78, weight: 95, ilvl: 46 },
                { tier: 2, min: 39, max: 64, weight: 320, ilvl: 20 },
                { tier: 3, min: 16, max: 38, weight: 780, ilvl: 1 },
            ],
        },
        map_monster_regen: {
            id: 'map_monster_regen', affects: 'monster',
            label: 'Monsters regenerate #% of their Life per second', labelDe: 'Monster regenerieren #% ihres Lebens pro Sekunde',
            tiers: [
                { tier: 1, min: 8, max: 12, weight: 95, ilvl: 50 },
                { tier: 2, min: 4, max: 6, weight: 320, ilvl: 24 },
                { tier: 3, min: 1, max: 3, weight: 800, ilvl: 1 },
            ],
        },
        map_monster_explosions: {
            id: 'map_monster_explosions', affects: 'monster',
            label: 'Monsters explode on death, dealing #% of their Life as damage', labelDe: 'Monster explodieren beim Tod und verursachen #% ihres Lebens als Schaden',
            tiers: [
                { tier: 1, min: 26, max: 39, weight: 90, ilvl: 54 },
                { tier: 2, min: 13, max: 25, weight: 310, ilvl: 28 },
                { tier: 3, min: 5, max: 12, weight: 760, ilvl: 1 },
            ],
        },
        map_monster_ailments: {
            id: 'map_monster_ailments', affects: 'monster',
            label: 'Monster Hits have +#% chance to inflict Ailments', labelDe: 'Monsterangriffe haben +#% Chance auf Zustände',
            tiers: [
                { tier: 1, min: 39, max: 52, weight: 95, ilvl: 48 },
                { tier: 2, min: 20, max: 38, weight: 320, ilvl: 22 },
                { tier: 3, min: 6, max: 18, weight: 800, ilvl: 1 },
            ],
        },
        map_monster_puzzle_aggro: {
            id: 'map_monster_puzzle_aggro', affects: 'monster',
            label: 'Monster Attacks have +#% chance to strike the Puzzle', labelDe: 'Monsterangriffe treffen +#% häufiger das Rätsel',
            tiers: [
                { tier: 1, min: 20, max: 26, weight: 95, ilvl: 44 },
                { tier: 2, min: 10, max: 18, weight: 320, ilvl: 18 },
                { tier: 3, min: 4, max: 9, weight: 800, ilvl: 1 },
            ],
        },
        map_reflect_melee: {
            id: 'map_reflect_melee', affects: 'monster',
            label: 'Monsters reflect #% of Melee Damage dealt to them', labelDe: 'Monster reflektieren #% des erlittenen Nahkampfschadens',
            tiers: [
                { tier: 1, min: 26, max: 39, weight: 85, ilvl: 56 },
                { tier: 2, min: 13, max: 25, weight: 300, ilvl: 30 },
                { tier: 3, min: 5, max: 12, weight: 750, ilvl: 1 },
            ],
        },
        map_boss_enrage: {
            id: 'map_boss_enrage', affects: 'monster',
            label: 'Bosses Enrage below 30% Life, dealing #% more Damage', labelDe: 'Bosse fallen unter 30% Leben in Raserei und verursachen #% mehr Schaden',
            tiers: [
                { tier: 1, min: 65, max: 91, weight: 90, ilvl: 50 },
                { tier: 2, min: 39, max: 64, weight: 320, ilvl: 24 },
                { tier: 3, min: 20, max: 38, weight: 780, ilvl: 1 },
            ],
        },
        map_armour_pierce: {
            id: 'map_armour_pierce', affects: 'monster',
            label: 'Monster Hits pierce #% of your Armour', labelDe: 'Monsterangriffe durchdringen #% deiner Rüstung',
            tiers: [
                { tier: 1, min: 52, max: 72, weight: 95, ilvl: 48 },
                { tier: 2, min: 26, max: 51, weight: 320, ilvl: 22 },
                { tier: 3, min: 10, max: 25, weight: 800, ilvl: 1 },
            ],
        },
        map_monster_ambush: {
            id: 'map_monster_ambush', affects: 'monster',
            label: 'Monsters start with a #% charged Attack Bar', labelDe: 'Monster starten mit #% geladener Angriffsleiste',
            tiers: [
                { tier: 1, min: 52, max: 72, weight: 90, ilvl: 50 },
                { tier: 2, min: 26, max: 51, weight: 320, ilvl: 24 },
                { tier: 3, min: 10, max: 25, weight: 780, ilvl: 1 },
            ],
        },

        // ── Monster escalation ────────────────────────────────────────
        map_monster_ethereal: {
            id: 'map_monster_ethereal', affects: 'monster',
            label: 'Monsters have #% chance to evade your Melee Attacks', labelDe: 'Monster haben #% Chance Nahkampfangriffen auszuweichen',
            tiers: [
                { tier: 1, min: 20, max: 29, weight: 95, ilvl: 48 },
                { tier: 2, min: 10, max: 18, weight: 320, ilvl: 22 },
                { tier: 3, min: 4, max: 9, weight: 800, ilvl: 1 },
            ],
        },
        map_boss_life: {
            id: 'map_boss_life', affects: 'monster',
            label: 'Bosses have +% increased Life', labelDe: 'Bosse haben +% mehr Leben',
            tiers: [
                { tier: 1, min: 58, max: 78, weight: 95, ilvl: 46 },
                { tier: 2, min: 32, max: 57, weight: 320, ilvl: 20 },
                { tier: 3, min: 13, max: 31, weight: 790, ilvl: 1 },
            ],
        },
        map_monster_snowball: {
            id: 'map_monster_snowball', affects: 'monster',
            label: 'Monsters gain #% Damage each time they hit you', labelDe: 'Monster erhalten +% Schaden, jedes Mal wenn sie dich treffen',
            tiers: [
                { tier: 1, min: 16, max: 23, weight: 90, ilvl: 50 },
                { tier: 2, min: 8, max: 14, weight: 310, ilvl: 24 },
                { tier: 3, min: 3, max: 6, weight: 780, ilvl: 1 },
            ],
        },
        map_monster_second_wind: {
            id: 'map_monster_second_wind', affects: 'monster',
            label: 'Non-Boss Monsters have a #% chance to resurrect at 25% Life', labelDe: 'Nicht-Boss-Monster haben #% Chance, mit 25% Leben wieder aufzuerstehen',
            tiers: [
                { tier: 1, min: 52, max: 72, weight: 90, ilvl: 52 },
                { tier: 2, min: 32, max: 51, weight: 310, ilvl: 26 },
                { tier: 3, min: 13, max: 31, weight: 780, ilvl: 1 },
            ],
        },
        map_monster_desperation: {
            id: 'map_monster_desperation', affects: 'monster',
            label: 'Wounded Monsters below 25% Life deal #% more Damage', labelDe: 'Verwundete Monster unter 25% Leben verursachen +% mehr Schaden',
            tiers: [
                { tier: 1, min: 46, max: 65, weight: 95, ilvl: 42 },
                { tier: 2, min: 26, max: 44, weight: 320, ilvl: 16 },
                { tier: 3, min: 10, max: 25, weight: 800, ilvl: 1 },
            ],
        },

        // ── Player-weakening ─────────────────────────────────────────
        map_fewer_mistakes: {
            id: 'map_fewer_mistakes', affects: 'player',
            label: '#% reduced Allowed Mistakes', labelDe: '#% reduzierte erlaubte Fehler',
            tiers: [
                { tier: 1, min: 84, max: 98, weight: 90, ilvl: 50 },
                { tier: 2, min: 52, max: 83, weight: 340, ilvl: 22 },
                { tier: 3, min: 20, max: 51, weight: 850, ilvl: 1 },
            ],
        },
        map_less_time: {
            id: 'map_less_time', affects: 'player',
            label: '#% reduced Map Time', labelDe: '#% reduzierte Kartenzeit',
            tiers: [
                { tier: 1, min: 84, max: 98, weight: 100, ilvl: 50 },
                { tier: 2, min: 58, max: 83, weight: 340, ilvl: 22 },
                { tier: 3, min: 26, max: 57, weight: 850, ilvl: 1 },
            ],
        },
        map_item_reveal_damage: {
            id: 'map_item_reveal_damage', affects: 'player',
            label: 'Reveals from Items deal #% less Damage', labelDe: 'Aufdeckungen von Items verursachen #% weniger Schaden',
            tiers: [
                { tier: 1, min: 52, max: 65, weight: 100, ilvl: 48 },
                { tier: 2, min: 32, max: 51, weight: 330, ilvl: 24 },
                { tier: 3, min: 13, max: 31, weight: 780, ilvl: 6 },
                { tier: 4, min: 5, max: 12, weight: 1400, ilvl: 1 },
            ],
        },
        map_ability_reveal_damage: {
            id: 'map_ability_reveal_damage', affects: 'player',
            label: 'Reveals from Abilities deal #% less Damage', labelDe: 'Aufdeckungen von Fähigkeiten verursachen #% weniger Schaden',
            tiers: [
                { tier: 1, min: 52, max: 65, weight: 100, ilvl: 48 },
                { tier: 2, min: 32, max: 51, weight: 330, ilvl: 24 },
                { tier: 3, min: 13, max: 31, weight: 780, ilvl: 6 },
                { tier: 4, min: 5, max: 12, weight: 1400, ilvl: 1 },
            ],
        },
        map_spell_damage: {
            id: 'map_spell_damage', affects: 'player',
            label: '#% reduced Spell Damage', labelDe: '#% reduzierter Magieschaden',
            tiers: [
                { tier: 1, min: 52, max: 65, weight: 100, ilvl: 46 },
                { tier: 2, min: 32, max: 51, weight: 330, ilvl: 20 },
                { tier: 3, min: 13, max: 31, weight: 780, ilvl: 1 },
            ],
        },
        map_less_time_gained: {
            id: 'map_less_time_gained', affects: 'player',
            label: '#% less Time gained from Item and Ability effects', labelDe: '#% weniger Zeit durch Item- und Fähigkeitseffekte',
            tiers: [
                { tier: 1, min: 52, max: 65, weight: 100, ilvl: 46 },
                { tier: 2, min: 32, max: 51, weight: 330, ilvl: 20 },
                { tier: 3, min: 13, max: 31, weight: 780, ilvl: 1 },
            ],
        },
        map_mana_penalty: {
            id: 'map_mana_penalty', affects: 'player',
            label: '#% reduced Mana gained', labelDe: '#% reduziertes erhaltenes Mana',
            tiers: [
                { tier: 1, min: 29, max: 39, weight: 100, ilvl: 48 },
                { tier: 2, min: 16, max: 27, weight: 330, ilvl: 20 },
                { tier: 3, min: 6, max: 14, weight: 780, ilvl: 1 },
            ],
        },
        map_blood_magic: {
            id: 'map_blood_magic', affects: 'player',
            label: 'Blood Magic — Class Abilities cost Life instead of Mana', labelDe: 'Blutmagie – Klassenfähigkeiten kosten Leben statt Mana',
            tiers: [
                { tier: 1, min: 1, max: 1, weight: 90, ilvl: 30 },
            ],
        },
        map_quiz_damage: {
            id: 'map_quiz_damage', affects: 'player',
            label: 'Incorrect Answers deal #% of maximum Life as Damage', labelDe: 'Falsche Antworten verursachen #% des maximalen Lebens als Schaden',
            tiers: [
                { tier: 1, min: 13, max: 20, weight: 100, ilvl: 44 },
                { tier: 2, min: 6, max: 12, weight: 330, ilvl: 18 },
                { tier: 3, min: 3, max: 5, weight: 800, ilvl: 1 },
            ],
        },
        map_reduced_block: {
            id: 'map_reduced_block', affects: 'player',
            label: '#% reduced Block Chance', labelDe: '#% reduzierte Blockchance',
            tiers: [
                { tier: 1, min: 52, max: 65, weight: 95, ilvl: 46 },
                { tier: 2, min: 26, max: 51, weight: 320, ilvl: 20 },
                { tier: 3, min: 10, max: 25, weight: 780, ilvl: 1 },
            ],
        },

        // ── Run economy ───────────────────────────────────────────────
        map_time_leech: {
            id: 'map_time_leech', affects: 'player',
            label: 'Monster Hits drain # seconds of Map Time', labelDe: 'Monsterangriffe entziehen # Sekunden Kartenzeit',
            tiers: [
                { tier: 1, min: 4, max: 6, weight: 90, ilvl: 48 },
                { tier: 2, min: 3, max: 3, weight: 320, ilvl: 22 },
                { tier: 3, min: 1, max: 1, weight: 800, ilvl: 1 },
            ],
        },
        map_fewer_pickups: {
            id: 'map_fewer_pickups', affects: 'player',
            label: '#% fewer Pickups appear on the Grid', labelDe: '#% weniger Aufsammelbares erscheint auf dem Gitter',
            tiers: [
                { tier: 1, min: 46, max: 65, weight: 95, ilvl: 36 },
                { tier: 2, min: 26, max: 44, weight: 320, ilvl: 10 },
                { tier: 3, min: 10, max: 25, weight: 800, ilvl: 1 },
            ],
        },
        map_blood_pact: {
            id: 'map_blood_pact', affects: 'player',
            label: 'Blood Pact — each solved Puzzle drains #% of maximum Life', labelDe: 'Blutpakt – jedes gelöste Rätsel entzieht #% des maximalen Lebens',
            tiers: [
                { tier: 1, min: 8, max: 13, weight: 90, ilvl: 50 },
                { tier: 2, min: 4, max: 6, weight: 320, ilvl: 24 },
                { tier: 3, min: 1, max: 3, weight: 790, ilvl: 1 },
            ],
        },

        // ── Puzzle behaviour ─────────────────────────────────────────
        map_extra_questions: {
            id: 'map_extra_questions', affects: 'puzzle',
            label: '+# additional Quiz Questions per Puzzle', labelDe: '+# zusätzliche Quizfragen pro Rätsel',
            tiers: [
                { tier: 1, min: 4, max: 5, weight: 110, ilvl: 42 },
                { tier: 2, min: 3, max: 3, weight: 380, ilvl: 16 },
                { tier: 3, min: 1, max: 1, weight: 900, ilvl: 1 },
            ],
        },

        // ── Elemental Hazards (player-only environmental effects) ────
        map_hazard_lightning: {
            id: 'map_hazard_lightning', affects: 'player',
            label: 'Lightning Storms strike around the Puzzle (#% intensity)', labelDe: 'Gewitterstürme schlagen um das Rätsel ein (#% Intensität)',
            tiers: [
                { tier: 1, min: 104, max: 130, weight: 90, ilvl: 60 },
                { tier: 2, min: 65, max: 98, weight: 300, ilvl: 30 },
                { tier: 3, min: 32, max: 58, weight: 800, ilvl: 1 },
            ],
        },
        map_hazard_darkness: {
            id: 'map_hazard_darkness', affects: 'player',
            label: 'Dark Clouds obscure the Map (#% thickness)', labelDe: 'Dunkle Wolken verdunkeln die Karte (#% Dicke)',
            tiers: [
                { tier: 1, min: 104, max: 130, weight: 100, ilvl: 55 },
                { tier: 2, min: 65, max: 98, weight: 320, ilvl: 28 },
                { tier: 3, min: 32, max: 58, weight: 820, ilvl: 1 },
            ],
        },
        map_hazard_arcane: {
            id: 'map_hazard_arcane', affects: 'player',
            label: 'Arcane Storms sweep across the Map (#% intensity)', labelDe: 'Arkanstürme fegen über die Karte (#% Intensität)',
            tiers: [
                { tier: 1, min: 104, max: 130, weight: 85, ilvl: 62 },
                { tier: 2, min: 65, max: 98, weight: 290, ilvl: 32 },
                { tier: 3, min: 32, max: 58, weight: 780, ilvl: 1 },
            ],
        },
        map_hazard_volatile: {
            id: 'map_hazard_volatile', affects: 'player',
            label: 'Volatile Wisps hunt you down (#% intensity)', labelDe: 'Flüchtige Irrlichter jagen dich (#% Intensität)',
            tiers: [
                { tier: 1, min: 104, max: 130, weight: 85, ilvl: 64 },
                { tier: 2, min: 65, max: 98, weight: 280, ilvl: 34 },
                { tier: 3, min: 32, max: 58, weight: 760, ilvl: 1 },
            ],
        },
        map_hazard_frostnova: {
            id: 'map_hazard_frostnova', affects: 'player',
            label: 'Frost Novas erupt around you (#% intensity)', labelDe: 'Frostnovas brechen um dich herum hervor (#% Intensität)',
            tiers: [
                { tier: 1, min: 104, max: 130, weight: 85, ilvl: 58 },
                { tier: 2, min: 65, max: 98, weight: 290, ilvl: 30 },
                { tier: 3, min: 32, max: 58, weight: 780, ilvl: 1 },
            ],
        },
        map_hazard_cyclone: {
            id: 'map_hazard_cyclone', affects: 'player',
            label: 'Cyclones race across the Map (#% intensity)', labelDe: 'Zyklone rasen über die Karte (#% Intensität)',
            tiers: [
                { tier: 1, min: 104, max: 130, weight: 85, ilvl: 58 },
                { tier: 2, min: 65, max: 98, weight: 290, ilvl: 28 },
                { tier: 3, min: 32, max: 58, weight: 780, ilvl: 1 },
            ],
        },
        map_hazard_delirium: {
            id: 'map_hazard_delirium', affects: 'player',
            label: 'Delirium Mist spreads periodically (#% intensity)', labelDe: 'Delirium-Nebel breitet sich periodisch aus (#% Intensität)',
            tiers: [
                { tier: 1, min: 104, max: 130, weight: 80, ilvl: 64 },
                { tier: 2, min: 65, max: 98, weight: 280, ilvl: 34 },
                { tier: 3, min: 32, max: 58, weight: 760, ilvl: 1 },
            ],
        },
    },
};

// Resolves the `affects` category of a rolled map mod.
function _egMapModAffects(familyId) {
    const fam = EG_MAP_MOD_TABLES.prefixes[familyId] || EG_MAP_MOD_TABLES.suffixes[familyId];
    return fam ? fam.affects : 'monster';
}


//------------------------------------------------------------------------
//-------------------MAP MOD REWARD BONUSES-------------------------------
//------------------------------------------------------------------------
// Every mod family grants run-wide reward bonuses on top of its danger:
//   xp       — % more experience from kills
//   quantity — % higher chance for loot/currency/item drops
//   rarity   — % weight boost for non-common rarities when items drop
// Values are indexed by (tier - 1); T1 = strongest roll. More dangerous
// maps are therefore always strictly more rewarding, PoE-style.

const EG_MAP_MOD_REWARDS = {
    // ── Monster-strengthening ────────────────────────────────────
    map_monster_life:        { xp: [20, 14, 8, 4], quantity: [15, 11, 5, 3], rarity: [11, 7, 4, 1] },
    map_monster_damage:      { xp: [20, 14, 8, 4], quantity: [15, 11, 5, 3], rarity: [11, 7, 4, 1] },
    map_monster_speed:       { xp: [18, 12, 7, 4],  quantity: [14, 9, 5, 3], rarity: [9, 7, 4, 1] },
    map_extra_monsters:      { xp: [27, 19, 12],    quantity: [22, 15, 9],   rarity: [15, 9, 5] },
    map_monster_resistances: { xp: [19, 14, 8, 4], quantity: [15, 11, 5, 3], rarity: [11, 7, 4, 1] },
    map_monster_crit:         { xp: [27, 19, 12],   quantity: [22, 15, 9],   rarity: [18, 12, 7] },
    map_monster_avoid_ailments: { xp: [20, 14, 8], quantity: [16, 11, 5],    rarity: [12, 7, 3] },
    map_monster_regen:        { xp: [24, 16, 9],   quantity: [19, 12, 7],    rarity: [15, 9, 4] },
    map_monster_explosions:   { xp: [30, 20, 14],  quantity: [23, 16, 9],   rarity: [19, 12, 5] },
    map_monster_ailments:     { xp: [23, 15, 9],   quantity: [18, 12, 7],    rarity: [14, 8, 4] },
    map_monster_puzzle_aggro: { xp: [22, 15, 8],   quantity: [16, 11, 5],    rarity: [12, 7, 3] },
    map_reflect_melee:        { xp: [31, 22, 14],  quantity: [24, 16, 11],   rarity: [20, 14, 7] },
    map_boss_chance:          { xp: [27, 19, 11],   quantity: [22, 15, 8],   rarity: [20, 14, 7] },
    map_boss_enrage:          { xp: [26, 18, 11],   quantity: [20, 14, 8],   rarity: [16, 11, 5] },
    map_armour_pierce:        { xp: [23, 16, 9],   quantity: [18, 12, 7],    rarity: [14, 8, 4] },
    map_monster_ambush:       { xp: [24, 16, 11],   quantity: [19, 12, 7],    rarity: [15, 9, 4] },
    map_monster_ethereal:     { xp: [22, 15, 9],   quantity: [16, 11, 7],    rarity: [12, 8, 4] },
    map_boss_life:            { xp: [26, 18, 11],   quantity: [20, 14, 8],   rarity: [16, 11, 5] },
    map_monster_snowball:     { xp: [27, 19, 12],   quantity: [22, 15, 9],   rarity: [18, 11, 5] },
    map_monster_second_wind:  { xp: [28, 19, 12],   quantity: [22, 15, 9],   rarity: [18, 11, 5] },
    map_monster_desperation:  { xp: [20, 14, 8],   quantity: [15, 9, 5],    rarity: [11, 7, 3] },
    map_hazard_firewall:      { xp: [32, 23, 15],  quantity: [26, 18, 11],   rarity: [22, 15, 8] },
    map_hazard_cyclone:       { xp: [31, 22, 14],  quantity: [24, 16, 11],   rarity: [20, 14, 7] },
    map_hazard_delirium:      { xp: [35, 24, 16],  quantity: [28, 19, 12],   rarity: [24, 16, 9] },

    // ── Player-weakening ─────────────────────────────────────────
    map_player_life:         { xp: [22, 15, 8, 4], quantity: [16, 12, 7, 3], rarity: [12, 8, 4, 1] },
    map_player_damage:       { xp: [22, 15, 8, 4], quantity: [16, 12, 7, 3], rarity: [12, 8, 4, 1] },
    map_player_defences:     { xp: [19, 14, 7, 4], quantity: [15, 9, 5, 3], rarity: [11, 7, 4, 1] },
    map_melee_damage:        { xp: [18, 12, 7, 3],  quantity: [14, 9, 5, 3], rarity: [9, 5, 3, 1] },
    map_projectile_damage:   { xp: [18, 12, 7, 3],  quantity: [14, 9, 5, 3], rarity: [9, 5, 3, 1] },
    map_fewer_mistakes:      { xp: [23, 15, 8],    quantity: [19, 12, 7],    rarity: [15, 8, 4] },
    map_less_time:           { xp: [20, 14, 7],    quantity: [16, 11, 5],    rarity: [12, 7, 4] },
    map_item_reveal_damage:  { xp: [18, 12, 7, 3],  quantity: [14, 9, 5, 3], rarity: [9, 5, 3, 1] },
    map_ability_reveal_damage: { xp: [18, 12, 7, 3], quantity: [14, 9, 5, 3], rarity: [9, 5, 3, 1] },
    map_spell_damage:        { xp: [18, 12, 7],     quantity: [14, 9, 5],    rarity: [9, 5, 3] },
    map_less_time_gained:    { xp: [18, 12, 7],     quantity: [14, 9, 5],    rarity: [9, 5, 3] },
    map_mana_penalty:        { xp: [18, 11, 5],     quantity: [14, 8, 4],    rarity: [9, 5, 3] },
    map_blood_magic:         { xp: [22],           quantity: [18],          rarity: [12] },
    map_elem_weakness:       { xp: [27, 19, 12],    quantity: [22, 15, 9],   rarity: [18, 12, 7] },
    map_temporal_chains:     { xp: [30, 20, 14],   quantity: [24, 16, 9],   rarity: [20, 14, 7] },
    map_vulnerability:       { xp: [28, 20, 12],    quantity: [23, 16, 9],   rarity: [19, 12, 7] },
    map_no_regeneration:     { xp: [24],           quantity: [19],          rarity: [15] },
    map_reduced_recovery:    { xp: [20, 14, 8],    quantity: [16, 11, 7],    rarity: [12, 8, 4] },
    map_mistake_damage:      { xp: [26, 18, 11],    quantity: [20, 14, 8],   rarity: [16, 11, 5] },
    map_reduced_evasion:     { xp: [19, 12, 7],     quantity: [15, 9, 5],    rarity: [11, 7, 3] },
    map_reduced_absorption:  { xp: [19, 12, 7],     quantity: [15, 9, 5],    rarity: [11, 7, 3] },
    map_quiz_damage:         { xp: [22, 15, 8],    quantity: [16, 11, 5],    rarity: [14, 8, 4] },
    map_reduced_block:       { xp: [19, 12, 7],     quantity: [15, 9, 5],    rarity: [11, 7, 3] },
    map_reduced_accuracy:    { xp: [18, 12, 7],     quantity: [14, 8, 4],    rarity: [9, 5, 3] },
    map_reduced_attack_speed: { xp: [24, 16, 9],   quantity: [19, 12, 7],    rarity: [15, 9, 4] },
    map_chilling_aura:       { xp: [26],           quantity: [20],          rarity: [16] },
    map_longer_lockout:      { xp: [19, 12, 7],     quantity: [15, 9, 5],    rarity: [11, 7, 3] },
    map_slower_absorption:   { xp: [20, 14, 8],    quantity: [16, 11, 5],    rarity: [12, 7, 3] },
    map_longer_ailments:     { xp: [23, 15, 9],    quantity: [18, 12, 7],    rarity: [14, 8, 4] },
    map_increased_dot:       { xp: [22, 15, 8],    quantity: [16, 11, 5],    rarity: [12, 7, 3] },
    map_freezing_hits:       { xp: [24, 16, 11],    quantity: [19, 12, 7],    rarity: [15, 9, 4] },
    map_mana_costs:          { xp: [20, 14, 8],    quantity: [16, 11, 5],    rarity: [12, 7, 3] },
    map_time_leech:          { xp: [30, 20, 14],   quantity: [23, 16, 9],   rarity: [18, 12, 5] },
    map_fewer_pickups:       { xp: [19, 12, 7],     quantity: [15, 9, 5],    rarity: [11, 5, 3] },
    map_blood_pact:          { xp: [32, 22, 14],   quantity: [26, 16, 11],   rarity: [22, 14, 8] },

    // ── Puzzle behaviour ─────────────────────────────────────────
    map_puzzle_cells:        { xp: [16, 11, 5],     quantity: [12, 8, 4],     rarity: [9, 5, 3] },
    map_required_puzzles:    { xp: [27, 15],       quantity: [23, 12],       rarity: [16, 9] },
    map_extra_questions:     { xp: [23, 15, 8],    quantity: [19, 12, 7],    rarity: [14, 8, 5] },

    // ── Elemental Hazards — very rewarding: they demand active play
    //    (dodging) AND resistance stacking to mitigate.
    map_hazard_lava:         { xp: [32, 23, 15],   quantity: [26, 18, 11],   rarity: [22, 15, 8] },
    map_hazard_lightning:    { xp: [32, 23, 15],   quantity: [26, 18, 11],   rarity: [22, 15, 8] },
    map_hazard_blizzard:     { xp: [30, 20, 14],   quantity: [23, 16, 9],   rarity: [19, 14, 7] },
    map_hazard_darkness:     { xp: [24, 16, 9],    quantity: [19, 12, 7],    rarity: [15, 9, 5] },
    map_hazard_arcane:       { xp: [35, 24, 16],   quantity: [28, 19, 12],   rarity: [24, 16, 9] },
    map_hazard_meteor:       { xp: [32, 23, 15],   quantity: [26, 18, 11],   rarity: [22, 15, 8] },
    map_hazard_volatile:     { xp: [34, 23, 16],   quantity: [27, 19, 11],   rarity: [22, 15, 8] },
    map_hazard_frostnova:    { xp: [31, 22, 14],   quantity: [24, 16, 9],   rarity: [19, 14, 7] },
};

// Resolves the reward triple of one mod at a given tier.
function _egGetMapModRewards(familyId, tier) {
    const r = EG_MAP_MOD_REWARDS[familyId];
    if (!r) return { xp: 0, quantity: 0, rarity: 0 };
    const idx = Math.max(0, Math.min(r.xp.length - 1, (tier || 1) - 1));
    return { xp: r.xp[idx] || 0, quantity: r.quantity[idx] || 0, rarity: r.rarity[idx] || 0 };
}

// Sums the reward bonuses of all mods on a map → { xp, quantity, rarity }.
function _egGetMapRewardBonuses(map) {
    const total = { xp: 0, quantity: 0, rarity: 0 };
    if (!map || !Array.isArray(map.mods)) return total;
    map.mods.forEach(mod => {
        const rw = _egGetMapModRewards(mod.familyId, mod.tier);
        total.xp += rw.xp;
        total.quantity += rw.quantity;
        total.rarity += rw.rarity;
    });
    return total;
}

// Computes the expected gold reward range for completing a map.
// Returns { min, max, avg } based on map tier and modifier load.
function _egGetMapGoldRewardRange(map) {
    const tier = Math.max(1, map.mapTier || 1);
    const mods = Array.isArray(map.mods) ? map.mods : [];
    const tierFrac = (tier - 1) / 15; // EG_MAX_MAP_TIER - 1
    const modLoad = mods.reduce((s, m) => s + ((Number(m && m.tier) || 1)), 0);
    const modFrac = Math.min(1, modLoad / 12);
    const difficulty = tierFrac * 0.7 + modFrac * 0.3;
    const baseGold = 50 + difficulty * 450;
    const variance = 50; // (Math.random() - 0.5) * 100 -> ±50
    return {
        min: Math.max(50, Math.round(baseGold - variance)),
        max: Math.round(baseGold + variance),
        avg: Math.round(baseGold)
    };
}


//------------------------------------------------------------------------
//-------------------MAP COMPLETION REWARD--------------------------------
//------------------------------------------------------------------------
// Every map rolls a random completion reward: 2–10 copies of one
// higher-grade orb or essence (orbs of transmutation / augmentation are
// excluded — too low level). The roll is baked in with the implicits so it
// is fixed per map item and shown in its tooltip. Higher tiers unlock the
// rarer entries via `minTier`.

const EG_MAP_COMPLETION_REWARD_POOL = [
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

// Map completion essences — one entry per per-modifier essence so every targeted
// essence family can appear as a map completion reward. Weight 5 keeps total
// essence weight comparable to original legacy pool (≈93×5 = 465 vs old 500).
const EG_MAP_COMPLETION_ESSENCE_POOL = (typeof _EG_ESSENCE_FAMILIES !== 'undefined'
    ? _EG_ESSENCE_FAMILIES.map(fid => ({ id: 'essence_' + fid, weight: 5 }))
    : []);

// Combined pool used at roll time — orbs plus dynamically built essence entries.
// Keep a static reference for backwards compat, but the live roll builds fresh
// so new essences (e.g. essence_inc_health) automatically appear.
const EG_MAP_COMPLETION_REWARD_POOL_STATIC = EG_MAP_COMPLETION_REWARD_POOL.slice();
function _egGetMapCompletionRewardPool() {
    const base = EG_MAP_COMPLETION_REWARD_POOL_STATIC.slice();
    const existingIds = new Set(base.map(e => e.id));
    // Prefer live _EG_ESSENCE_FAMILIES if available (maps.js loads before essences.js)
    if (typeof _EG_ESSENCE_FAMILIES !== 'undefined' && Array.isArray(_EG_ESSENCE_FAMILIES)) {
        for (const fid of _EG_ESSENCE_FAMILIES) {
            const id = 'essence_' + fid;
            if (!existingIds.has(id)) { base.push({ id, weight: 5 }); existingIds.add(id); }
        }
    } else {
        for (const e of EG_MAP_COMPLETION_ESSENCE_POOL) {
            if (!existingIds.has(e.id)) base.push(e);
        }
    }
    return base;
}

// Resolves a completion-reward def from either currency table.
function _egGetCompletionRewardDef(id) {
    return EG_CURRENCY_DEFS[id] || EG_ESSENCE_DEFS[id] || null;
}

// Rolls the completion reward for a map → { id, count }. The count scales
// with map difficulty: higher tiers and more/higher-tier modifiers yield
// bigger payouts (≈2–3 for an easy low-tier map with few mods, up to 8–10
// for a fully modded max-tier map).
function _egRollMapCompletionReward(map) {
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


//------------------------------------------------------------------------
//-------------------MAP IMPLICITS-----------------------------------------
//------------------------------------------------------------------------
// Maps carry five implicit values derived from their tier and shaped by
// specific mods. They are baked into the item at generation/reroll time so
// the tooltip always shows exactly what the run will demand:
//   puzzles          — required puzzles to solve
//   questions        — quiz questions to answer correctly
//   mistakes         — allowed mistake count
//   durationSeconds  — total map time limit
//   sizeMix          — puzzle count per grid-size bucket
//                      (small / medium / large / massive)

// Grid-size buckets (same thresholds as _gridSizeBucket in quests-stats.js).
// Used by the run launcher to filter story puzzles and to steer the
// generated-puzzle sizes.
const EG_GRID_SIZE_BUCKETS = {
    small:   [1, 99],
    medium:  [100, 199],
    large:   [200, 399],
    massive: [400, Infinity],
};

// Derives how many of the map's puzzles fall into each grid-size bucket.
// Higher tiers shift weight toward large/massive grids; a "% larger Puzzle
// Grids" mod (largerPct) pushes the mix further up. The counts always sum
// to the tier's base puzzle count.
function _egRollMapSizeMix(tier, largerPct) {
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
// immutable implicit so tooltips can state it definitively — orbs/mods
// MUST NOT be able to remove it.
function _egRollMapBossStatus(map) {
    return { hasBoss: true, maxBosses: 1 };
}

function _egRollMapImplicits(map) {
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
function _egWithImplicits(map) {
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


//------------------------------------------------------------------------
//-------------------MAP GENERATOR-----------------------------------------
//------------------------------------------------------------------------

// Rolls a full map item. Rarity and prefix/suffix counts use the exact same
// rollers as equipment so maps behave identically (max 3 pre + 3 suf = 6 mods).
// `tierOverride` (optional) forces the map tier — used by the atlas-aware
// drop logic so maps found during a run match the active node's graph.
// `opts.forceNormal` skips the rarity/mod rolls entirely and produces a
// plain Normal (white) map with no modifiers — used for the vendor's free
// starter map so a fresh character always gets an unmodified baseline run.
function _egGenerateMapDrop(monsterLevel = 1, tierOverride = null, opts = null) {
    monsterLevel = Math.max(1, Math.round(monsterLevel || 1));

    // Forced atlas region (PoE-style drop rules): the drop code resolves
    // the exact region a map may come from — tier and item level derive
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
// The tier is rolled directly from the allowed set — deriving it from the
// monster level via ceil(level/4) could never produce the lower connected
// tier and made higher tiers vanishingly rare.
// The share of drops from connected tiers scales with the active node's
// tier: low-tier maps find neighbouring regions far more often so early
// players unlock the atlas (and climb tiers) quickly, while high-tier runs
// stay focused on their own tier.
// Resolves the atlas REGION a map dropped inside the active run comes from
// (PoE-style drop rules — see egAtlasDropNodeIds in endgame-atlas.js):
//   normal kill: linked regions of the same or a lower tier + the active
//                region itself + completed regions at or below the active
//                tier
//   boss kill:   additionally linked regions one tier higher — bosses are
//                the only source that climbs the atlas
// Returns a node id, or null when no device run is active / the atlas
// module isn't loaded (callers then fall back to legacy tier rolling).
// Boss kills favour the +1-tier climb regions (see egAtlasPickDropNodeId).
function _egResolveAtlasDropTarget(isBoss) {
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
function _egRerollMapMods(map, rarity, prefixCount, suffixCount) {
    const mods = _egRollMods(prefixCount, suffixCount, EG_MAP_MOD_TABLES, map.itemLevel || map.monsterLevel || 1, null);
    const name = _egBuildItemName(map.baseName || map.name, rarity, mods);
    return _egWithImplicits({ ...map, rarity, mods, name });
}

// Adds ONE new mod (prefix or suffix, whichever has room) to a map.
function _egAddOneModToMap(map, rarityForCaps) {
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
function _egRemoveOneModFromMap(map) {
    const existing = map.mods || [];
    if (existing.length === 0) return map;
    const index = Math.floor(Math.random() * existing.length);
    const mods = existing.filter((_, i) => i !== index);
    const name = _egBuildItemName(map.baseName || map.name, map.rarity, mods);
    return _egWithImplicits({ ...map, mods, name });
}


//------------------------------------------------------------------------
//-------------------ORBS APPLIED TO MAPS---------------------------------
//------------------------------------------------------------------------
// Mirrors the orb semantics from endgame-currency.js, but rolls from the
// MAP modifier tables. Looked up by orb id when an orb is used on a map.

const EG_MAP_CURRENCY_RULES = {
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


//------------------------------------------------------------------------
//-------------------MAP GRID DROPS---------------------------------------
//------------------------------------------------------------------------
// Maps land on the grid when monsters die. Claiming a map drop banks it
// directly into the Probability Gate map stash (_egMapStash).

const _egMapDrops = new Map();          // "row-col" → map item
let _egMapStashFullToastAt = 0;         // throttle for the stash-full toast

// Returns true when the gate screen map stash has at least one free slot.
// Per-tier stashes are infinite (auto-expand), so this is always true.
// Kept for legacy vendor / claim callers that guard before adding.
function _egMapStashHasFreeSlot(tier) {
    return true;
}
// Writes a map into the first free cell of its tier's stash (infinite).
// Returns true on success. If item has a mapTier, it routes to that tier;
// otherwise falls back to tierOverride or the active tab.
function _egAddMapToMapStash(item, tierOverride) {
    if (!item) return false;
    let tier = tierOverride != null ? tierOverride : (item.mapTier != null ? item.mapTier : (_egMapStashActiveTier || 1));
    tier = Math.max(1, Math.min(EG_MAP_TIER_COUNT || 16, Math.round(tier)));
    try {
        if (typeof _egFindFreeMapCellForTier === 'function' && typeof _egGetMapTierGrid === 'function') {
            const pos = _egFindFreeMapCellForTier(tier);
            _egGetMapTierGrid(tier)[pos.r][pos.c] = item;
            // if the target tier is currently visible, render that cell; otherwise just sync count
            if (tier === (_egMapStashActiveTier || 1) && document.getElementById('eg-map-stash-grid')) {
                // ensure grid has enough DOM rows — rebuild if needed
                const gridLen = _egGetMapTierGrid(tier).length;
                const domCells = document.querySelectorAll('.eg-map-stash-cell').length;
                const needed = gridLen * EG_MAP_STASH_COLS;
                if (domCells < needed && typeof _egRebuildMapStashGrid === 'function') {
                    _egRebuildMapStashGrid();
                } else {
                    _egRenderMapStashCell(pos.r, pos.c);
                }
            } else if (typeof _egUpdateMapStashTabCounts === 'function') {
                _egUpdateMapStashTabCounts();
            }
            return true;
        }
    } catch(e) {}
    // fallback flat grid (should not happen after migration)
    for (let r = 0; r < EG_MAP_STASH_ROWS; r++) {
        for (let c = 0; c < EG_MAP_STASH_COLS; c++) {
            if (!_egMapStash[r][c]) {
                _egMapStash[r][c] = item;
                _egRenderMapStashCell(r, c);
                return true;
            }
        }
    }
    return false;
}

// Called by the kill handlers in endgame-encounter.js.
// PoE-style sustain: while running a map the drop chance is multiplied by the
// active map's Quantity bonus (EG_MAP_MOD_REWARDS.quantity). Harder maps
// (more / higher-tier mods) therefore sustain maps much better.
function _egTryDropMap(isBoss, monsterLevel) {
    // Resolve Quantity multiplier from the active device map, if any.
    let qtyMult = 1;
    if (typeof _egMapLootQuantityMult === 'function') {
        qtyMult = _egMapLootQuantityMult();
    } else if (typeof _egActiveMapItem !== 'undefined' && _egActiveMapItem
        && typeof _egGetMapRewardBonuses === 'function') {
        const rw = _egGetMapRewardBonuses(_egActiveMapItem);
        qtyMult = 1 + (rw.quantity || 0) / 100;
    }

    // PoE-style drop rules: the atlas region a dropped map belongs to is
    // resolved per kill source (see _egResolveAtlasDropTarget). When no
    // device run is active this is null and the legacy tier roll applies.
    const targetNodeId = _egResolveAtlasDropTarget(isBoss);

    if (isBoss) {
        // Bosses always drop at least one map. When running a difficult map
        // (high Quantity) they have a bonus chance for a second map.
        const map = _egGenerateMapDrop(monsterLevel, null, { atlasNodeId: targetNodeId });
        if (typeof _egSpawnMapDrop === 'function') _egSpawnMapDrop(map);
        if (qtyMult > 1) {
            const extraChance = Math.min(0.35, (qtyMult - 1) * 0.30);
            if (Math.random() < extraChance) {
                const extra = _egGenerateMapDrop(monsterLevel, null, { atlasNodeId: targetNodeId });
                if (typeof _egSpawnMapDrop === 'function') _egSpawnMapDrop(extra);
            }
        }
        return;
    }

    const baseChance = Math.min(1, EG_MAP_DROP_CHANCE_NORMAL * qtyMult);
    if (Math.random() > baseChance) return;

    const map = _egGenerateMapDrop(monsterLevel, null, { atlasNodeId: targetNodeId });
    if (typeof _egSpawnMapDrop === 'function') _egSpawnMapDrop(map);
}

// Places a map drop on an eligible grid cell (mirrors _egSpawnLootDrop).
function _egSpawnMapDrop(map) {
    if (!_egIsActive() || !map) return;
    if (_egMapDrops.size >= 1) return; // one map drop on the board at a time

    const pool = typeof _egBuildPickupEligiblePool === 'function'
        ? _egBuildPickupEligiblePool()
        : [];
    const filtered = typeof _egCellHasAnyDrop === 'function'
        ? pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c))
        : pool;
    if (filtered.length === 0) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;

    _egMapDrops.set(key, map);

    // Overlay visual — reuses the loot overlay styling with a map tint class.
    // Glow class follows the map's own rarity color.
    const el = document.getElementById(`g-${r}-${c}`);
    if (el) {
        const span = document.createElement('span');
        span.className = `eg-pickup-overlay eg-pickup-rarity-${map.rarity || 'common'} eg-loot-overlay eg-mapdrop-overlay`;
        span.id = `eg-mapdrop-${r}-${c}`;
        span.textContent = map.icon || '🗺️';
        el.appendChild(span);
    }

    // Auto-expire after the shared loot lifetime (pause-aware).
    const lifetime = EG_LOOT_DROP_LIFETIME_MS;
    if (typeof _egScheduleTrackedExpiry === 'function') {
        _egScheduleTrackedExpiry(_egMapDrops, key, map, lifetime, `eg-mapdrop-${r}-${c}`, _egRemoveMapDropOverlay);
    } else {
        const timer = setTimeout(() => {
            if (_egMapDrops.get(key) === map) {
                _egMapDrops.delete(key);
                _egRemoveMapDropOverlay(key);
            }
        }, lifetime);
        if (typeof _egPickupTimers !== 'undefined') _egPickupTimers.push(timer);
        if (typeof _egStartDropExpireCountdown === 'function') {
            _egStartDropExpireCountdown(`eg-mapdrop-${r}-${c}`, lifetime);
        }
    }
}

function _egRemoveMapDropOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-mapdrop-${r}-${c}`);
    if (span) span.remove();
}

function _egAnimateMapDropClaim(row, col, item) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = typeof _egGetElementCentre === 'function' ? _egGetElementCentre(el) : { x: 0, y: 0 };
    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater';
    floater.textContent = item.icon || '🗺️';
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// Called from _egCheckAllClaims (mouse-button-handlers.js) and
// _egAutoClaimDropsOnReveal (endgame-grid-pickups.js). Banks the claimed map
// straight into the Probability Gate map stash.
function _egCheckMapDropClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const map = _egMapDrops.get(key);
    if (!map) return false;

    // Tiered stashes are infinite — no capacity check needed.

    if (typeof _egCancelTrackedExpiry === 'function') _egCancelTrackedExpiry(_egMapDrops, key, map);
    _egMapDrops.delete(key);
    _egRemoveMapDropOverlay(key);
    _egAnimateMapDropClaim(row, col, map);

    _egAddMapToMapStash(map);

    // Track for the leave-map summary screen (mirrors _egTrackRunCurrency)
    if (typeof _egRunMaps !== 'undefined') _egRunMaps.push(map);

    Audio_Manager.playSFX('player_equip_pickup');
    showToast(t('eg_map_claimed')
        .replace('{icon}', map.icon || '')
        .replace('{name}', map.name)
        .replace('{tier}', map.mapTier != null ? map.mapTier : '?'), _egRarityToastColor(map.rarity));
    egSaveHubState();
    return true;
}

// Called from _egDiscardAllDrops (mouse-button-handlers.js).
function _egDiscardMapDrop(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egMapDrops.has(key)) return;
    const map = _egMapDrops.get(key);
    if (typeof _egCancelTrackedExpiry === 'function') _egCancelTrackedExpiry(_egMapDrops, key, map);
    _egMapDrops.delete(key);
    _egRemoveMapDropOverlay(key);
    if (typeof _egAnimatePickupDiscard === 'function') {
        _egAnimatePickupDiscard(row, col, { emoji: map.icon || '🗺️' });
    }
    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Banks any unclaimed map drops still sitting on the grid. Called on
// map leave / forfeit / defeat so maps never silently vanish when the run ends.
function _egBankUnclaimedMapDrops() {
    if (_egMapDrops.size === 0) return;
    let banked = 0;
    for (const [, map] of Array.from(_egMapDrops.entries())) {
        if (_egAddMapToMapStash(map)) banked++;
    }
    _egMapDrops.clear();
    document.querySelectorAll('[id^="eg-mapdrop-"]').forEach(el => el.remove());
    if (banked > 0) egSaveHubState();
}

// Clears all active map drops from the board (called by _egStopPickupSpawner).
function _egStopMapDrops() {
    if (typeof _egCancelTrackedExpiry === 'function') {
        Array.from(_egMapDrops.entries()).forEach(([key, map]) => _egCancelTrackedExpiry(_egMapDrops, key, map));
    }
    _egMapDrops.forEach((map, key) => _egRemoveMapDropOverlay(key));
    _egMapDrops.clear();
}

// Carries unclaimed map drops into the next chained puzzle
// (mirrors _egReplaceCarriedLootDrops / _egReplaceCarriedCurrencyDrops).
function _egReplaceCarriedMapDrops(maps) {
    if (!maps || maps.length === 0) return;

    maps.forEach(map => {
        if (_egMapDrops.size >= 1) return;

        const pool = typeof _egBuildPickupEligiblePool === 'function'
            ? _egBuildPickupEligiblePool()
            : [];
        const filtered = typeof _egCellHasAnyDrop === 'function'
            ? pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c))
            : pool;
        if (filtered.length === 0) return;

        const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
        const key = `${r}-${c}`;

        _egMapDrops.set(key, map);

        const el = document.getElementById(`g-${r}-${c}`);
        if (el) {
            const span = document.createElement('span');
            span.className = `eg-pickup-overlay eg-pickup-rarity-${map.rarity || 'common'} eg-loot-overlay eg-mapdrop-overlay`;
            span.id = `eg-mapdrop-${r}-${c}`;
            span.textContent = map.icon || '🗺️';
            el.appendChild(span);
        }

        const lifetime = typeof EG_LOOT_DROP_LIFETIME_MS !== 'undefined' ? EG_LOOT_DROP_LIFETIME_MS : 60000;
        if (typeof _egScheduleTrackedExpiry === 'function') {
            _egScheduleTrackedExpiry(_egMapDrops, key, map, lifetime, `eg-mapdrop-${r}-${c}`, _egRemoveMapDropOverlay);
        } else {
            const timer = setTimeout(() => {
                if (_egMapDrops.get(key) === map) {
                    _egMapDrops.delete(key);
                    _egRemoveMapDropOverlay(key);
                }
            }, lifetime);
            if (typeof _egPickupTimers !== 'undefined') _egPickupTimers.push(timer);
            if (typeof _egStartDropExpireCountdown === 'function') {
                _egStartDropExpireCountdown(`eg-mapdrop-${r}-${c}`, lifetime);
            }
        }
    });
}


//------------------------------------------------------------------------
//-------------------MAP TOOLTIP------------------------------------------
//------------------------------------------------------------------------

// Builds the tooltip body for map items. Mods are grouped by their
// `affects` category with distinct colors:
//   monster → orange, player → red, puzzle → blue.
function _egBuildMapTooltipBodyHTML(item) {
    const RARITY_COLOR_MAP = {
        common: { border: '#7a7a7a', color: '#b0b0b0' },
        uncommon: { border: '#2ecc71', color: '#2ecc71' },
        rare: { border: '#3498db', color: '#3498db' },
        epic: { border: '#9b59b6', color: '#c39bd3' },
    };
    const rarity = item.rarity || 'common';
    const rc = RARITY_COLOR_MAP[rarity] || RARITY_COLOR_MAP.common;

    const groups = { monster: [], player: [], puzzle: [] };
    const groupMods = { monster: [], player: [], puzzle: [] };
    (item.mods || []).forEach(mod => {
        const affects = _egMapModAffects(mod.familyId);
        if (!groupMods[affects]) groupMods[affects] = [];
        groupMods[affects].push(mod);
    });
    Object.keys(groupMods).forEach(affects => {
        // Mods sharing the same stat are merged into one combined line.
        groups[affects] = _egBuildMergedModLines(groupMods[affects]);
    });

    const hideTier = !!item.isUnique;
    const sectionHTML = (titleKey, entries, color) => {
        if (entries.length === 0) return '';
        return `
    <div class="eg-tt-section">
        <div class="eg-tt-group-title" style="color:${color};">${t(titleKey)}</div>
        ${entries.map(e => {
            const tierBadge = hideTier ? '' : `<span class="eg-tt-mod-tier">${e.tierLabel || ''}</span>`;
            return `<div class="eg-tt-mod" style="color:${color};"><span class="eg-tt-mod-label">${e.label}</span>${tierBadge}</div>`;
        }).join('')}
    </div>`;
    };

    const noModsHTML = (item.mods || []).length === 0
        ? `<div class="eg-tt-section"><div class="eg-tt-desc">${t('eg_map_unmodified')}</div></div>`
        : '';

    // ── Implicit values ──────────────────────────────────────────────
    const imp = item.implicits || _egRollMapImplicits(item);
    const fmtDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const implicitLines = [
        t('eg_map_implicit_puzzles').replace('{n}', imp.puzzles),
        t('eg_map_implicit_questions').replace('{n}', imp.questions),
        t('eg_map_implicit_mistakes').replace('{n}', imp.mistakes),
        t('eg_map_implicit_duration').replace('{time}', fmtDuration(imp.durationSeconds)),
        t('eg_map_monster_level_tt').replace('{n}', item.monsterLevel ?? item.itemLevel ?? 1),
    ];

    if (imp.sizeMix) {
        implicitLines.push(t('eg_map_implicit_sizemix')
            .replace('{s}', imp.sizeMix.small || 0)
            .replace('{m}', imp.sizeMix.medium || 0)
            .replace('{l}', imp.sizeMix.large || 0)
            .replace('{x}', imp.sizeMix.massive || 0));
    }

    // ── Boss encounter line (baked into implicits) ───────────────────────
    const bossHas = imp.hasBoss;
    const bossCount = imp.maxBosses || 0;
    if (bossHas && bossCount > 0) {
        const bossLabel = bossCount > 1
            ? t('eg_map_boss_count').replace('{n}', bossCount)
            : t('eg_map_has_boss');
        implicitLines.push(`<span style="color:#e74c3c;font-weight:700;">${bossLabel}</span>`);
    } else if (bossHas === false) {
        implicitLines.push(`<span style="color:#888;">${t('eg_map_no_boss')}</span>`);
    } else {
        // Legacy map without boss implicits: fall back to tier heuristic
        const legacyHasBoss = (item.mapTier || 1) >= 2;
        // Without baked status we show the probabilistic hint rather than a definitive Yes.
        if (!legacyHasBoss) {
            implicitLines.push(`<span style="color:#888;">${t('eg_map_no_boss')}</span>`);
        } else {
            // For legacy maps tier 2+ we cannot know definitively; show that a boss *may* appear.
            // Prefer the definitive label if the global base chance is available.
            implicitLines.push(`<span style="color:#e74c3c;font-weight:700;">${t('eg_map_has_boss')}</span><span style="color:#888; font-size:0.85em;"> (${(typeof EG_MAP_BASE_BOSS_CHANCE !== 'undefined' ? EG_MAP_BASE_BOSS_CHANCE : 50)}%)</span>`);
        }
    }

    // ── Reward bonuses (from mods) + completion reward ───────────────
    const rw = _egGetMapRewardBonuses(item);
    const rewardLines = [];
    if (imp.completionReward) {
        const crDef = _egGetCompletionRewardDef(imp.completionReward.id);
        if (crDef) {
            rewardLines.push(t('eg_map_completion_reward')
                .replace('{icon}', crDef.icon || '💰')
                .replace('{n}', imp.completionReward.count)
                .replace('{name}', crDef.name));
        }
    }
    // Gold completion reward (innate, not from mods)
    const goldRange = _egGetMapGoldRewardRange(item);
    if (goldRange.avg > 0) {
        rewardLines.push(t('eg_map_gold_reward_tooltip')
            .replace('{min}', goldRange.min.toLocaleString())
            .replace('{max}', goldRange.max.toLocaleString())
            .replace('{avg}', goldRange.avg.toLocaleString()));
    }
    if (rw.xp > 0) rewardLines.push(t('eg_map_reward_xp').replace('{n}', rw.xp));
    if (rw.quantity > 0) rewardLines.push(t('eg_map_reward_quantity').replace('{n}', rw.quantity));
    if (rw.quantity > 0) {
        const mapDropLabel = (typeof t === 'function' && t('eg_map_reward_map_drops') !== 'eg_map_reward_map_drops')
            ? t('eg_map_reward_map_drops').replace('{n}', rw.quantity)
            : `+${rw.quantity}% increased Map Drops`;
        rewardLines.push(mapDropLabel);
    }
    if (rw.rarity > 0) rewardLines.push(t('eg_map_reward_rarity').replace('{n}', rw.rarity));
    const rewardsHTML = rewardLines.length === 0 ? '' : `
    <div class="eg-tt-section">
        <div class="eg-tt-group-title" style="color:#f5d98a;">${t('eg_map_reward_title')}</div>
        ${rewardLines.map(l => `<div class="eg-tt-mod" style="color:#f5d98a;">${l}</div>`).join('')}
    </div>`;

    // ── Atlas completion status ────────────────────────────────────────
    let atlasStatusHTML = '';
    try {
        let atlasNode = null;
        if (item.atlasNodeId && typeof egAtlasNodeById === 'function') {
            atlasNode = egAtlasNodeById(item.atlasNodeId);
        }
        if (!atlasNode && typeof _egAtlasResolveNodeForMap === 'function') {
            atlasNode = _egAtlasResolveNodeForMap(item);
        }
        if (atlasNode && typeof egAtlasIsCompleted === 'function') {
            const completed = egAtlasIsCompleted(atlasNode.id);
            const color = completed ? '#f5d98a' : '#aaa';
            const label = completed ? t('eg_map_atlas_completed') : t('eg_map_atlas_not_completed');
            const regionName = (typeof egAtlasNodeName === 'function') ? egAtlasNodeName(atlasNode) : atlasNode.name;
            // Required difficulty (region tier band → easy / normal / hard).
            // When the currently selected game difficulty doesn't match and
            // the region is not completed yet, warn in red — such a run
            // would not count as an atlas clear.
            const reqDiff = atlasNode.difficulty
                || (typeof egAtlasTierDifficulty === 'function' ? egAtlasTierDifficulty(atlasNode.tier) : 'normal');
            const diffColors = { easy: '#2ecc71', normal: '#3498db', hard: '#c39bd3' };
            const diffLineHTML = `<div class="eg-tt-desc" style="color:${diffColors[reqDiff] || '#f5d98a'}; font-size:0.85em;">⚖️ ${t('eg_map_atlas_requires_diff').replace('{d}', t('diff_' + reqDiff))}</div>`;
            let mismatchHTML = '';
            if (!completed) {
                const runDiff = (typeof curDiff !== 'undefined' && curDiff) ? curDiff : 'normal';
                if (runDiff !== reqDiff) {
                    mismatchHTML = `<div class="eg-tt-desc" style="color:#e74c3c; font-size:0.85em;">${t('eg_map_atlas_diff_mismatch').replace('{d}', t('diff_' + runDiff))}</div>`;
                }
            }
            atlasStatusHTML = `
    <div class="eg-tt-section" style="border-left:2px solid ${color}; padding-left:8px;">
        <div class="eg-tt-mod" style="color:${color}; font-weight:700;">${label}</div>
        <div class="eg-tt-desc" style="color:#ccc; font-size:0.85em;">${regionName} · ${t('eg_map_tier_tt').replace('{n}', atlasNode.tier)}</div>
        ${diffLineHTML}
        ${mismatchHTML}
    </div>`;
        }
    } catch (e) { /* ignore tooltip atlas errors */ }

    return `
<div class="eg-tt-frame eg-map-frame" style="--tt-border:${rc.border};">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">${item.icon || '🗺️'}</div>
        <div class="eg-tt-name" style="color:${rc.color};">${item.name || '???'}</div>
        ${(item.baseName && item.baseName !== item.name)
            ? `<div class="eg-tt-basename" style="opacity:.7;">${item.baseName}</div>` : ''}
        <div class="eg-tt-rarity-line" style="color:${rc.border};">${t('eg_maps_label')} · ${t('eg_map_tier_tt').replace('{n}', item.mapTier ?? 1)}</div>
    </div>
    ${atlasStatusHTML}
    <div class="eg-tt-section">
        <div class="eg-tt-group-title" style="color:#f5d98a;">${t('eg_map_implicits_title')}</div>
        ${implicitLines.map(l => `<div class="eg-tt-implicit">${l}</div>`).join('')}
    </div>
    ${rewardsHTML}
    ${sectionHTML('eg_map_mods_monster', groups.monster, '#e67e22')}
    ${sectionHTML('eg_map_mods_player', groups.player, '#e74c3c')}
    ${sectionHTML('eg_map_mods_puzzle', groups.puzzle, '#5b9cf6')}
    ${noModsHTML}
</div>`;
}


//------------------------------------------------------------------------
//-------------------CSS INJECTION-----------------------------------------
//------------------------------------------------------------------------

(function _egInjectMapStyles() {
    if (document.getElementById('eg-map-item-styles')) return;
    const style = document.createElement('style');
    style.id = 'eg-map-item-styles';
    style.textContent = `
        /* Gate screen: spacing for the runes & orbs row between device and map stash */
        .eg-gate-currency-section { margin-top: 12px; }
        .eg-gate-currency-section .eg-currency-strip { border: 1px solid var(--border); border-radius: 6px; }
        /* Map drops on the puzzle grid get a golden shimmer to stand out */
        .eg-mapdrop-overlay {
            text-shadow: 0 0 6px rgba(245, 217, 138, 0.9), 0 0 12px rgba(245, 217, 138, 0.5);
        }
        /* Group titles inside the map tooltip */
        .eg-tt-group-title { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 2px; }
        .eg-tt-mod { font-size: 0.85rem; padding: 1px 0; }
        /* Map tier badge on item chips */
        .eg-item-ilvl.eg-map-tier-badge { color: #f5d98a; }
    `;
    document.head.appendChild(style);
})();

//------------------------------------------------------------------------
//-------------------LEGACY MAP BOSS HEALING-------------------------------
//------------------------------------------------------------------------
// Older saves stored maps without `implicits.hasBoss` — and maps created
// before the "every map ends in a boss fight" rule may have it baked as
// false. Patch every persisted map so the boss fight is guaranteed: maps
// without implicits roll fresh ones (boss always present), and a baked
// hasBoss:false is upgraded to true (maxBosses 1).
function _egHealMapBossImplicits(map) {
    if (!map || typeof map !== 'object') return map;
    if (!map.implicits || typeof map.implicits !== 'object') {
        map.implicits = _egRollMapImplicits(map);
        return map;
    }
    if (map.implicits.hasBoss == null) {
        const bossStatus = _egRollMapBossStatus(map);
        map.implicits.hasBoss = bossStatus.hasBoss;
        map.implicits.maxBosses = bossStatus.maxBosses;
    } else if (!map.implicits.hasBoss) {
        // Migration: the current design guarantees a boss in every map.
        map.implicits.hasBoss = true;
        map.implicits.maxBosses = Math.max(1, map.implicits.maxBosses || 1);
    }
    return map;
}

function _egMigrateMapBossImplicits() {
    try {
        if (typeof _egMapStash !== 'undefined' && Array.isArray(_egMapStash)) {
            // tiered check
            const isTiered = (typeof _egIsTieredMapStash === 'function' && _egIsTieredMapStash(_egMapStash));
            if (isTiered) {
                for (let ti = 0; ti < _egMapStash.length; ti++) {
                    const tierGrid = _egMapStash[ti];
                    if (!Array.isArray(tierGrid)) continue;
                    for (let r = 0; r < tierGrid.length; r++) {
                        if (!Array.isArray(tierGrid[r])) continue;
                        for (let c = 0; c < tierGrid[r].length; c++) {
                            const it = tierGrid[r][c];
                            if (it && it.category === 'map') _egHealMapBossImplicits(it);
                        }
                    }
                }
            } else {
                for (let r = 0; r < _egMapStash.length; r++) {
                    if (!Array.isArray(_egMapStash[r])) continue;
                    for (let c = 0; c < _egMapStash[r].length; c++) {
                        const it = _egMapStash[r][c];
                        if (it && it.category === 'map') _egHealMapBossImplicits(it);
                    }
                }
            }
        }
        if (typeof _egMapSlotItem !== 'undefined' && _egMapSlotItem && _egMapSlotItem.category === 'map') {
            _egHealMapBossImplicits(_egMapSlotItem);
        }
        // Also patch the hub state's saved copy so next save is clean.
        if (typeof STATE !== 'undefined' && STATE) {
            const stash = STATE.egMapStash;
            if (Array.isArray(stash)) {
                const isTieredS = (typeof _egIsTieredMapStash === 'function' && _egIsTieredMapStash(stash));
                if (isTieredS) {
                    stash.forEach(tierGrid => {
                        if (!Array.isArray(tierGrid)) return;
                        tierGrid.forEach(row => {
                            if (!Array.isArray(row)) return;
                            row.forEach(it => { if (it && it.category === 'map') _egHealMapBossImplicits(it); });
                        });
                    });
                } else {
                    stash.forEach(row => {
                        if (!Array.isArray(row)) return;
                        row.forEach(it => { if (it && it.category === 'map') _egHealMapBossImplicits(it); });
                    });
                }
            }
            if (STATE.egMapSlotItem && STATE.egMapSlotItem.category === 'map') {
                _egHealMapBossImplicits(STATE.egMapSlotItem);
            }
        }
    } catch (e) { /* ignore migration errors */ }
}
_egMigrateMapBossImplicits();
// Wrap future loads so slot switches also heal.
(function _egPatchHubLoadForBoss() {
    try {
        if (typeof _egLoadHubState === 'function' && !_egLoadHubState._bossPatched) {
            const orig = _egLoadHubState;
            const patched = function() {
                const ret = orig.apply(this, arguments);
                try { _egMigrateMapBossImplicits(); } catch (e) {}
                return ret;
            };
            patched._bossPatched = true;
            // Preserve the patched flag on the original for idempotency checks
            orig._bossPatched = true;
            _egLoadHubState = patched;
        }
    } catch (e) { /* ignore */ }
})();
