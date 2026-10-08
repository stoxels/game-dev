//----------------------------------------------------------------------
//---------------------------MAP MOD SUFFIXES---------------------------
//----------------------------------------------------------------------

// The half of EG_MAP_MOD_TABLES holding suffixes. Same schema as the
// prefixes file: an `affects` tag plus a tier ladder per family.

//----------------------------------------------------------------------
//---------------------------MAP MOD SUFFIXES---------------------------
//----------------------------------------------------------------------


export const EG_MAP_MOD_SUFFIXES = {

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
        // NOTE: `map_boss_chance` was removed - boss presence is a pure implicit
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
        // Spellproof: forces melee engagement - spells / reveal projectiles
        // are heavily resisted, melee strikes hit at full force. Makes the
        // melee channel mandatory on these runs instead of optional.
        map_monster_spellproof: {
            id: 'map_monster_spellproof', affects: 'monster',
            label: 'Monsters take #% reduced damage from Spells and Projectiles', labelDe: 'Monster erleiden #% weniger Schaden durch Zauber und Projektile',
            tiers: [
                { tier: 1, min: 75, max: 79, weight: 95, ilvl: 48 },
                { tier: 2, min: 55, max: 74, weight: 320, ilvl: 22 },
                { tier: 3, min: 35, max: 54, weight: 800, ilvl: 1 },
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
            label: 'Blood Magic - Class Abilities cost Life instead of Mana', labelDe: 'Blutmagie – Klassenfähigkeiten kosten Leben statt Mana',
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
            label: 'Blood Pact - each solved Puzzle drains #% of maximum Life', labelDe: 'Blutpakt – jedes gelöste Rätsel entzieht #% des maximalen Lebens',
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
};

