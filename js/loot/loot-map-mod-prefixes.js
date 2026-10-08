//----------------------------------------------------------------------
//---------------------------MAP MOD PREFIXES---------------------------
//----------------------------------------------------------------------

// The half of EG_MAP_MOD_TABLES holding prefixes. Each family declares an
// `affects` tag ('player' | 'monster' | 'puzzle') plus its tier ladder:
  // T1 = best/highest roll. 'weight' higher = more common. 'ilvl' gates tiers.

//----------------------------------------------------------------------
//---------------------------MAP MOD PREFIXES---------------------------
//----------------------------------------------------------------------


export const EG_MAP_MOD_PREFIXES = {

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
            label: 'Elemental Weakness - #% reduced all Resistances', labelDe: 'Elementarschwäche – #% reduziert alle Widerstände',
            tiers: [
                { tier: 1, min: 52, max: 65, weight: 90, ilvl: 52 },
                { tier: 2, min: 32, max: 51, weight: 310, ilvl: 26 },
                { tier: 3, min: 13, max: 31, weight: 760, ilvl: 1 },
            ],
        },
        map_temporal_chains: {
            id: 'map_temporal_chains', affects: 'player',
            label: 'Temporal Chains - you act #% slower', labelDe: 'Zeitketten – du handelst #% langsamer',
            tiers: [
                { tier: 1, min: 39, max: 49, weight: 85, ilvl: 54 },
                { tier: 2, min: 23, max: 36, weight: 300, ilvl: 28 },
                { tier: 3, min: 10, max: 21, weight: 720, ilvl: 1 },
            ],
        },
        map_vulnerability: {
            id: 'map_vulnerability', affects: 'player',
            label: 'Vulnerability - you take #% increased Damage', labelDe: 'Verwundbarkeit – du erleidest #% erhöhten Schaden',
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
        // player resistance - see endgame-hazards.js.
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
            label: 'Blizzard - Icicles rain from above (#% intensity)', labelDe: 'Blizzard - Eiszapfen regnen von oben (#% Intensität)',
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
};

