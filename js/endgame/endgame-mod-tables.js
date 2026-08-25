//------------------------------------------------------------------------
//-------------------HELMET MODIFIER TABLE--------------------------------
//------------------------------------------------------------------------

// T1 is the highest/best tier.
// 'ilvl' is the minimum item level required for this tier to roll.
// 'weight' determines how common the roll is (higher = more common).
//
// LOCALIZATION: every mod family carries 'label' (EN) + 'labelDe' (DE).
// The display layer picks the right language at generation time
// (see _egBuildRolledStats in endgame-equipment-generator.js).
//
// EG_MOD_NAME_WORDS provides short family words used by the rare-item
// name builder (_egBuildItemName): [enWord, dePrefixWord, deGenitive].
// EN keeps the previously derived display words; DE uses natural gaming
// terms, e.g. "Feuerwiderstand-Kappe des Feuerwiderstands".
const EG_MOD_NAME_WORDS = {
    flat_health: ['Health', 'Leben', 'des Lebens'],
    flat_mana: ['Mana', 'Mana', 'des Manas'],
    heart_heal: ['Heart Heal', 'Herzheilung', 'der Herzheilung'],
    inc_heart_heal: ['Heart Heal', 'Herzheilung', 'der Herzheilung'],
    time_added: ['Time Added', 'Zeitzuwachs', 'des Zeitzuwachses'],
    flat_armour: ['Armour', 'Rüstung', 'der Rüstung'],
    inc_armour: ['Armour', 'Rüstung', 'der Rüstung'],
    flat_evasion: ['Evasion', 'Ausweichen', 'des Ausweichens'],
    inc_evasion: ['Evasion', 'Ausweichen', 'des Ausweichens'],
    flat_absorption: ['Absorption', 'Absorption', 'der Absorption'],
    inc_absorption: ['Absorption', 'Absorption', 'der Absorption'],
    hybrid_life_armour: ['Life Armour', 'Lebensrüstung', 'der Lebensrüstung'],
    hybrid_mana_armour: ['Mana Armour', 'Manarüstung', 'der Manarüstung'],
    hybrid_life_evasion: ['Life Evasion', 'Lebensausweichen', 'des Lebensausweichens'],
    hybrid_mana_evasion: ['Mana Evasion', 'Manaausweichen', 'des Manaausweichens'],
    hybrid_life_absorption: ['Life Absorption', 'Lebensabsorption', 'der Lebensabsorption'],
    hybrid_mana_absorption: ['Mana Absorption', 'Manaabsorption', 'der Manaabsorption'],
    hybrid_armour_evasion: ['Armour Evasion', 'Rüstungsausweichen', 'des Rüstungsausweichens'],
    hybrid_armour_absorption: ['Armour Absorption', 'Rüstungsabsorption', 'der Rüstungsabsorption'],
    hybrid_evasion_absorption: ['Evasion Absorption', 'Ausweichabsorption', 'der Ausweichabsorption'],
    hybrid_evasion_armour: ['Evasion Armour', 'Ausweichrüstung', 'der Ausweichrüstung'],
    strength: ['Strength', 'Stärke', 'der Stärke'],
    agility: ['Agility', 'Beweglichkeit', 'der Beweglichkeit'],
    intelligence: ['Intelligence', 'Intelligenz', 'der Intelligenz'],
    accuracy: ['Accuracy', 'Genauigkeit', 'der Genauigkeit'],
    life_regen: ['Life Regen', 'Lebensregeneration', 'der Lebensregeneration'],
    mana_regen: ['Mana Regen', 'Manaregeneration', 'der Manaregeneration'],
    fire_resist: ['Fire Resist', 'Feuerwiderstand', 'des Feuerwiderstands'],
    cold_resist: ['Cold Resist', 'Kältewiderstand', 'des Kältewiderstands'],
    lightning_resist: ['Lightning Resist', 'Blitzwiderstand', 'des Blitzwiderstands'],
    shadow_resist: ['Shadow Resist', 'Schattenwiderstand', 'des Schattenwiderstands'],
    arcane_resistance: ['Arcane Resistance', 'Arkanwiderstand', 'des Arkanwiderstands'],
    mistake_count: ['Mistake Count', 'Fehleranzahl', 'der Fehleranzahl'],
    mistake_not_count: ['Mistake Not Count', 'Fehlerfreiheit', 'der Fehlerfreiheit'],
    focus: ['Focus', 'Fokus', 'des Fokus'],
    life_leech: ['Life Leech', 'Lebensraub', 'des Lebensraubs'],
    absorption_on_kill: ['Absorption On Kill', 'Killabsorption', 'der Killabsorption'],
    absorption_regen_rate: ['Absorption Regen Rate', 'Absorptionsregeneration', 'der Absorptionsregeneration'],
    faster_absorption_regen_start: ['Faster Absorption Regen Start', 'Frühe Absorptionsregeneration', 'der frühen Absorptionsregeneration'],
    block_chance: ['Block Chance', 'Blockchance', 'der Blockchance'],
    spell_block_chance: ['Spell Block Chance', 'Zauberblockchance', 'der Zauberblockchance'],
    block_recovery: ['Block Recovery', 'Blockerholung', 'der Blockerholung'],
    chain: ['Chain', 'Kettenwirkung', 'der Kettenwirkung'],
    chance_for_new_question: ['Chance For New Question', 'Neue Frage', 'der neuen Frage'],
    chance_to_blind: ['Chance To Blind', 'Blendung', 'der Blendung'],
    chance_to_convert: ['Chance To Convert', 'Umwandlung', 'der Umwandlung'],
    chance_to_freeze: ['Chance To Freeze', 'Einfrieren', 'des Einfrierens'],
    chance_to_ignite: ['Chance To Ignite', 'Entzünden', 'des Entzündens'],
    chance_to_shock: ['Chance To Shock', 'Schock', 'des Schocks'],
    channel: ['Channel', 'Kanalisieren', 'des Kanalisierens'],
    cleave: ['Cleave', 'Flächenschlag', 'des Flächenschlags'],
    crit_chance: ['Crit Chance', 'Kritische Trefferchance', 'der kritischen Trefferchance'],
    crit_multiplier: ['Crit Multiplier', 'Kritischer Schaden', 'kritischen Schadens'],
    dodge: ['Dodge', 'Ausweichkunst', 'der Ausweichkunst'],
    echo: ['Echo', 'Nachhall', 'des Nachhalls'],
    fate: ['Fate', 'Schicksal', 'des Schicksals'],
    first_step: ['First Step', 'Erster Schritt', 'des ersten Schritts'],
    flat_physical_damage: ['Physical Damage', 'Physischer Schaden', 'physischen Schadens'],
    inc_physical_damage: ['Physical Damage', 'Physischer Schaden', 'physischen Schadens'],
    spell_damage: ['Spell Damage', 'Zauberschaden', 'des Zauberschadens'],
    inc_spell_damage: ['Spell Damage', 'Zauberschaden', 'des Zauberschadens'],
    mana_on_kill: ['Mana On Kill', 'Killmana', 'des Killmanas'],
    mana_on_mistake: ['Mana On Mistake', 'Fehlermana', 'des Fehlermanas'],
    mana_to_damage: ['Mana To Damage', 'Manawandlung', 'der Manawandlung'],
    multishot: ['Multishot', 'Mehrfachschuss', 'des Mehrfachschusses'],
    overkill: ['Overkill', 'Overkill', 'des Overkills'],
    pierce: ['Pierce', 'Durchschlag', 'des Durchschlags'],
    precision_damage: ['Precision Damage', 'Präzisionsschaden', 'des Präzisionsschadens'],
    precision_regen: ['Precision Regen', 'Präzisionsregeneration', 'der Präzisionsregeneration'],
    preemptive_dodge: ['Preemptive Dodge', 'Frühes Ausweichen', 'des frühen Ausweichens'],
    pushback: ['Pushback', 'Zurückdrängen', 'des Zurückdrängens'],
    reveal_hint: ['Reveal Hint', 'Hinweisgabe', 'der Hinweisgabe'],
    shield_bash: ['Shield Bash', 'Schildstoß', 'des Schildstoßes'],
    snipe: ['Snipe', 'Scharfschuss', 'des Scharfschusses'],
    splash_damage: ['Splash Damage', 'Flächenschaden', 'des Flächenschadens'],
    stagger: ['Stagger', 'Wanken', 'des Wankens'],
    warding: ['Warding', 'Abwehr', 'der Abwehr'],
    arcane_surge: ['Arcane Surge', 'Arkanwoge', 'der Arkanwoge'],
    cold_damage: ['Cold Damage', 'Kälteschaden', 'des Kälteschadens'],
    fire_damage: ['Fire Damage', 'Feuerschaden', 'des Feuerschadens'],
    lightning_damage: ['Lightning Damage', 'Blitzschaden', 'des Blitzschadens'],
    shadow_damage: ['Shadow Damage', 'Schattenschaden', 'des Schattenschadens'],
    life_on_kill: ['Life On Kill', 'Killleben', 'des Killlebens'],
    spell_dodge: ['Spell Dodge', 'Zauberausweichen', 'des Zauberausweichens'],
    attack_speed: ['Attack Speed', 'Angriffstempo', 'des Angriffstempos'],
    grounded: ['Grounded', 'Standfestigkeit', 'der Standfestigkeit'],
};

const EG_MOD_TABLE_HEAD = {
    prefixes: {
        // --- LIFE & MANA ---
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 90, max: 109, weight: 100, ilvl: 80 },
                { tier: 2, min: 70, max: 89, weight: 250, ilvl: 65 },
                { tier: 3, min: 50, max: 69, weight: 500, ilvl: 45 },
                { tier: 4, min: 30, max: 49, weight: 1000, ilvl: 25 },
                { tier: 5, min: 10, max: 29, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 65, max: 79, weight: 100, ilvl: 80 },
                { tier: 2, min: 50, max: 64, weight: 250, ilvl: 65 },
                { tier: 3, min: 35, max: 49, weight: 500, ilvl: 45 },
                { tier: 4, min: 20, max: 34, weight: 1000, ilvl: 25 },
                { tier: 5, min: 5, max: 19, weight: 2000, ilvl: 1 }
            ]
        },
        heart_heal: {
            id: 'heart_heal',
            label: 'Hearts heal for an additional # Health', labelDe: 'Herzen heilen zusätzlich um # Leben',
            tiers: [
                { tier: 1, min: 40, max: 50, weight: 200, ilvl: 75 },
                { tier: 2, min: 25, max: 39, weight: 400, ilvl: 40 },
                { tier: 3, min: 10, max: 24, weight: 800, ilvl: 10 }
            ]
        },

        // --- PUZZLE / UTILITY (Moved to Prefixes) ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 45, max: 60, weight: 100, ilvl: 78 },
                { tier: 2, min: 30, max: 44, weight: 300, ilvl: 50 },
                { tier: 3, min: 15, max: 29, weight: 600, ilvl: 15 }
            ]
        },

        // --- LOCAL DEFENSES (Armour, Evasion, Absorption) ---
        flat_armour: {
            id: 'flat_armour',
            label: '+# to Armour', labelDe: '+# zu Rüstung',
            tiers: [
                { tier: 1, min: 100, max: 150, weight: 150, ilvl: 82 },
                { tier: 2, min: 60, max: 99, weight: 300, ilvl: 60 },
                { tier: 3, min: 25, max: 59, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 24, weight: 1200, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 80, max: 100, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 79, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 49, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        flat_evasion: {
            id: 'flat_evasion',
            label: '+# to Evasion', labelDe: '+# zu Ausweichen',
            tiers: [
                { tier: 1, min: 100, max: 150, weight: 150, ilvl: 82 },
                { tier: 2, min: 60, max: 99, weight: 300, ilvl: 60 },
                { tier: 3, min: 25, max: 59, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 24, weight: 1200, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 80, max: 100, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 79, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 49, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        flat_absorption: {
            id: 'flat_absorption',
            label: '+# to Absorption', labelDe: '+# zu Absorption',
            tiers: [
                { tier: 1, min: 80, max: 110, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 79, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 49, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        inc_absorption: {
            id: 'inc_absorption',
            label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
            tiers: [
                { tier: 1, min: 80, max: 100, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 79, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 49, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },

        // --- HYBRID LIFE & MANA / DEFENSES ---
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 35, max1: 45, min2: 40, max2: 60, weight: 100, ilvl: 78 },
                { tier: 2, min1: 25, max1: 34, min2: 25, max2: 39, weight: 250, ilvl: 50 },
                { tier: 3, min1: 15, max1: 24, min2: 15, max2: 24, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 14, min2: 5, max2: 14, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 25, max1: 35, min2: 40, max2: 60, weight: 100, ilvl: 78 },
                { tier: 2, min1: 18, max1: 24, min2: 25, max2: 39, weight: 250, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 15, max2: 24, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 9, min2: 5, max2: 14, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 35, max1: 45, min2: 40, max2: 60, weight: 100, ilvl: 78 },
                { tier: 2, min1: 25, max1: 34, min2: 25, max2: 39, weight: 250, ilvl: 50 },
                { tier: 3, min1: 15, max1: 24, min2: 15, max2: 24, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 14, min2: 5, max2: 14, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 25, max1: 35, min2: 40, max2: 60, weight: 100, ilvl: 78 },
                { tier: 2, min1: 18, max1: 24, min2: 25, max2: 39, weight: 250, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 15, max2: 24, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 9, min2: 5, max2: 14, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 35, max1: 45, min2: 30, max2: 45, weight: 100, ilvl: 78 },
                { tier: 2, min1: 25, max1: 34, min2: 20, max2: 29, weight: 250, ilvl: 50 },
                { tier: 3, min1: 15, max1: 24, min2: 10, max2: 19, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 14, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 25, max1: 35, min2: 30, max2: 45, weight: 100, ilvl: 78 },
                { tier: 2, min1: 18, max1: 24, min2: 20, max2: 29, weight: 250, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 10, max2: 19, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 9, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENSES ---
        hybrid_armour_evasion: {
            id: 'hybrid_armour_evasion',
            label: '+# to Armour\n+@ to Evasion', labelDe: '+# zu Rüstung\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 40, max1: 65, min2: 40, max2: 65, weight: 120, ilvl: 80 },
                { tier: 2, min1: 25, max1: 39, min2: 25, max2: 39, weight: 250, ilvl: 55 },
                { tier: 3, min1: 12, max1: 24, min2: 12, max2: 24, weight: 500, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 4, max2: 11, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 40, max1: 65, min2: 30, max2: 50, weight: 120, ilvl: 80 },
                { tier: 2, min1: 25, max1: 39, min2: 20, max2: 29, weight: 250, ilvl: 55 },
                { tier: 3, min1: 12, max1: 24, min2: 10, max2: 19, weight: 500, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 40, max1: 65, min2: 30, max2: 50, weight: 120, ilvl: 80 },
                { tier: 2, min1: 25, max1: 39, min2: 20, max2: 29, weight: 250, ilvl: 55 },
                { tier: 3, min1: 12, max1: 24, min2: 10, max2: 19, weight: 500, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },


    },

    suffixes: {
        // --- ATTRIBUTES ---
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },

        // --- OFFENSE & RECOVERY ---
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 251, max: 400, weight: 150, ilvl: 80 },
                { tier: 2, min: 121, max: 250, weight: 300, ilvl: 60 },
                { tier: 3, min: 61, max: 120, weight: 600, ilvl: 40 },
                { tier: 4, min: 31, max: 60, weight: 1200, ilvl: 20 },
                { tier: 5, min: 10, max: 30, weight: 2400, ilvl: 1 }
            ]
        },
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 16, max: 25, weight: 150, ilvl: 78 },
                { tier: 2, min: 11, max: 15, weight: 300, ilvl: 55 },
                { tier: 3, min: 6, max: 10, weight: 600, ilvl: 35 },
                { tier: 4, min: 3, max: 5, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2400, ilvl: 1 }
            ]
        },
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 25, max: 35, weight: 150, ilvl: 78 },
                { tier: 2, min: 16, max: 24, weight: 300, ilvl: 55 },
                { tier: 3, min: 10, max: 15, weight: 600, ilvl: 35 },
                { tier: 4, min: 5, max: 9, weight: 1200, ilvl: 15 },
                { tier: 5, min: 2, max: 4, weight: 2400, ilvl: 1 }
            ]
        },

        // --- RESISTANCES ---
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 31, max: 35, weight: 150, ilvl: 82 },
                { tier: 2, min: 26, max: 30, weight: 300, ilvl: 65 },
                { tier: 3, min: 16, max: 25, weight: 600, ilvl: 40 },
                { tier: 4, min: 5, max: 15, weight: 1200, ilvl: 15 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 10, max: 15, weight: 150, ilvl: 75 },
                { tier: 2, min: 5, max: 9, weight: 400, ilvl: 15 }
            ]
        }
    }
};



//------------------------------------------------------------------------
//-------------------EARRING MODIFIER TABLE-------------------------------
//------------------------------------------------------------------------
// Earrings are small jewelry — no local armour/evasion/absorption.
// They focus on: life/mana pools, regen, leech, attributes,
// resistances, and puzzle utility. Values are smaller than helmet
// equivalents to reflect the slot's secondary status.
// Both earring slots (earring1, earring2) share this same table.

const EG_MOD_TABLE_EARRING = {
    prefixes: {

        // --- LIFE & MANA ---
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 60, max: 79, weight: 100, ilvl: 80 },
                { tier: 2, min: 45, max: 59, weight: 250, ilvl: 65 },
                { tier: 3, min: 30, max: 44, weight: 500, ilvl: 45 },
                { tier: 4, min: 15, max: 29, weight: 1000, ilvl: 25 },
                { tier: 5, min: 5, max: 14, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 45, max: 59, weight: 100, ilvl: 80 },
                { tier: 2, min: 33, max: 44, weight: 250, ilvl: 65 },
                { tier: 3, min: 22, max: 32, weight: 500, ilvl: 45 },
                { tier: 4, min: 11, max: 21, weight: 1000, ilvl: 25 },
                { tier: 5, min: 3, max: 10, weight: 2000, ilvl: 1 }
            ]
        },
        heart_heal: {
            id: 'heart_heal',
            label: 'Hearts heal for an additional # Health', labelDe: 'Herzen heilen zusätzlich um # Leben',
            tiers: [
                { tier: 1, min: 30, max: 40, weight: 200, ilvl: 75 },
                { tier: 2, min: 18, max: 29, weight: 400, ilvl: 40 },
                { tier: 3, min: 7, max: 17, weight: 800, ilvl: 10 }
            ]
        },

        // --- LEECH (earring-exclusive flavor) ---
        life_leech: {
            id: 'life_leech',
            label: 'Gain #% of Damage dealt as Life', labelDe: 'Erhalte #% des verursachten Schadens als Leben',
            tiers: [
                { tier: 1, min: 2, max: 3, weight: 80, ilvl: 82 },
                { tier: 2, min: 1, max: 2, weight: 200, ilvl: 60 },
                // T3 is expressed in tenths for display — store as float
                { tier: 3, min: 0.5, max: 0.9, weight: 500, ilvl: 15 }
            ]
        },
        mana_on_kill: {
            id: 'mana_on_kill',
            label: 'Gain # Mana on Kill', labelDe: 'Erhalte # Mana bei Kill',
            tiers: [
                { tier: 1, min: 12, max: 18, weight: 100, ilvl: 78 },
                { tier: 2, min: 7, max: 11, weight: 250, ilvl: 55 },
                { tier: 3, min: 3, max: 6, weight: 500, ilvl: 30 },
                { tier: 4, min: 1, max: 2, weight: 1000, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 30, max: 40, weight: 100, ilvl: 78 },
                { tier: 2, min: 18, max: 29, weight: 300, ilvl: 50 },
                { tier: 3, min: 8, max: 17, weight: 600, ilvl: 15 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 35, max: 42, weight: 200, ilvl: 80 },
                { tier: 2, min: 27, max: 34, weight: 400, ilvl: 65 },
                { tier: 3, min: 18, max: 26, weight: 800, ilvl: 45 },
                { tier: 4, min: 10, max: 17, weight: 1600, ilvl: 20 },
                { tier: 5, min: 3, max: 9, weight: 3200, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 35, max: 42, weight: 200, ilvl: 80 },
                { tier: 2, min: 27, max: 34, weight: 400, ilvl: 65 },
                { tier: 3, min: 18, max: 26, weight: 800, ilvl: 45 },
                { tier: 4, min: 10, max: 17, weight: 1600, ilvl: 20 },
                { tier: 5, min: 3, max: 9, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 35, max: 42, weight: 200, ilvl: 80 },
                { tier: 2, min: 27, max: 34, weight: 400, ilvl: 65 },
                { tier: 3, min: 18, max: 26, weight: 800, ilvl: 45 },
                { tier: 4, min: 10, max: 17, weight: 1600, ilvl: 20 },
                { tier: 5, min: 3, max: 9, weight: 3200, ilvl: 1 }
            ]
        },

        // --- REGEN ---
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 11, max: 18, weight: 150, ilvl: 78 },
                { tier: 2, min: 7, max: 10, weight: 300, ilvl: 55 },
                { tier: 3, min: 4, max: 6, weight: 600, ilvl: 35 },
                { tier: 4, min: 2, max: 3, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 1, weight: 2400, ilvl: 1 }
            ]
        },
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 18, max: 26, weight: 150, ilvl: 78 },
                { tier: 2, min: 11, max: 17, weight: 300, ilvl: 55 },
                { tier: 3, min: 6, max: 10, weight: 600, ilvl: 35 },
                { tier: 4, min: 3, max: 5, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2400, ilvl: 1 }
            ]
        },

        // --- RESISTANCES ---
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 36, max: 42, weight: 250, ilvl: 80 },
                { tier: 2, min: 27, max: 35, weight: 500, ilvl: 60 },
                { tier: 3, min: 17, max: 26, weight: 1000, ilvl: 35 },
                { tier: 4, min: 8, max: 16, weight: 2000, ilvl: 15 },
                { tier: 5, min: 3, max: 7, weight: 4000, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 36, max: 42, weight: 250, ilvl: 80 },
                { tier: 2, min: 27, max: 35, weight: 500, ilvl: 60 },
                { tier: 3, min: 17, max: 26, weight: 1000, ilvl: 35 },
                { tier: 4, min: 8, max: 16, weight: 2000, ilvl: 15 },
                { tier: 5, min: 3, max: 7, weight: 4000, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 36, max: 42, weight: 250, ilvl: 80 },
                { tier: 2, min: 27, max: 35, weight: 500, ilvl: 60 },
                { tier: 3, min: 17, max: 26, weight: 1000, ilvl: 35 },
                { tier: 4, min: 8, max: 16, weight: 2000, ilvl: 15 },
                { tier: 5, min: 3, max: 7, weight: 4000, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 25, max: 30, weight: 150, ilvl: 82 },
                { tier: 2, min: 18, max: 24, weight: 300, ilvl: 65 },
                { tier: 3, min: 10, max: 17, weight: 600, ilvl: 40 },
                { tier: 4, min: 3, max: 9, weight: 1200, ilvl: 15 }
            ]
        },

        // --- ACCURACY (fits jewelry well — a steady hand) ---
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 151, max: 250, weight: 150, ilvl: 80 },
                { tier: 2, min: 81, max: 150, weight: 300, ilvl: 60 },
                { tier: 3, min: 41, max: 80, weight: 600, ilvl: 40 },
                { tier: 4, min: 16, max: 40, weight: 1200, ilvl: 20 },
                { tier: 5, min: 5, max: 15, weight: 2400, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 8, max: 12, weight: 150, ilvl: 75 },
                { tier: 2, min: 3, max: 7, weight: 400, ilvl: 15 }
            ]
        }
    }
};




//------------------------------------------------------------------------
//-------------------AMULET MODIFIER TABLE--------------------------------
//------------------------------------------------------------------------
// Amulets are the prestige jewelry slot — they bridge offense and defense.
// They can roll elemental damage, crit, spell damage, and status effect
// chances alongside the usual life/mana/resist/attribute suffixes.
// No local armor/evasion/absorption — jewelry never grants those.
// Values are slightly higher than earring equivalents to reflect the
// importance of the slot.

const EG_MOD_TABLE_AMULET = {
    prefixes: {

        // --- LIFE & MANA POOLS ---
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 100, ilvl: 80 },
                { tier: 2, min: 50, max: 69, weight: 250, ilvl: 65 },
                { tier: 3, min: 35, max: 49, weight: 500, ilvl: 45 },
                { tier: 4, min: 18, max: 34, weight: 1000, ilvl: 25 },
                { tier: 5, min: 6, max: 17, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 50, max: 65, weight: 100, ilvl: 80 },
                { tier: 2, min: 36, max: 49, weight: 250, ilvl: 65 },
                { tier: 3, min: 24, max: 35, weight: 500, ilvl: 45 },
                { tier: 4, min: 12, max: 23, weight: 1000, ilvl: 25 },
                { tier: 5, min: 4, max: 11, weight: 2000, ilvl: 1 }
            ]
        },
        heart_heal: {
            id: 'heart_heal',
            label: 'Hearts heal for an additional # Health', labelDe: 'Herzen heilen zusätzlich um # Leben',
            tiers: [
                { tier: 1, min: 35, max: 45, weight: 200, ilvl: 75 },
                { tier: 2, min: 22, max: 34, weight: 400, ilvl: 40 },
                { tier: 3, min: 9, max: 21, weight: 800, ilvl: 10 }
            ]
        },

        // --- FLAT ELEMENTAL DAMAGE ---
        // Adds raw elemental damage to all player attacks (melee counterattack & ranged).
        // Stored as [min_roll, max_roll] damage range added per hit.
        fire_damage: {
            id: 'fire_damage',
            label: 'Adds # to @ Fire Damage', labelDe: 'Fügt # bis @ Feuerschaden hinzu',
            tiers: [
                { tier: 1, min1: 20, max1: 30, min2: 55, max2: 75, weight: 120, ilvl: 80 },
                { tier: 2, min1: 12, max1: 19, min2: 35, max2: 54, weight: 250, ilvl: 60 },
                { tier: 3, min1: 6, max1: 11, min2: 18, max2: 34, weight: 500, ilvl: 35 },
                { tier: 4, min1: 2, max1: 5, min2: 8, max2: 17, weight: 1000, ilvl: 10 }
            ]
        },
        cold_damage: {
            id: 'cold_damage',
            label: 'Adds # to @ Cold Damage', labelDe: 'Fügt # bis @ Kälteschaden hinzu',
            tiers: [
                { tier: 1, min1: 18, max1: 26, min2: 50, max2: 68, weight: 120, ilvl: 80 },
                { tier: 2, min1: 11, max1: 17, min2: 32, max2: 49, weight: 250, ilvl: 60 },
                { tier: 3, min1: 5, max1: 10, min2: 16, max2: 31, weight: 500, ilvl: 35 },
                { tier: 4, min1: 2, max1: 4, min2: 7, max2: 15, weight: 1000, ilvl: 10 }
            ]
        },
        lightning_damage: {
            id: 'lightning_damage',
            label: 'Adds # to @ Lightning Damage', labelDe: 'Fügt # bis @ Blitzschaden hinzu',
            // Lightning has a wider min/max spread — high variance, high ceiling
            tiers: [
                { tier: 1, min1: 5, max1: 12, min2: 60, max2: 90, weight: 120, ilvl: 80 },
                { tier: 2, min1: 3, max1: 8, min2: 38, max2: 59, weight: 250, ilvl: 60 },
                { tier: 3, min1: 1, max1: 5, min2: 20, max2: 37, weight: 500, ilvl: 35 },
                { tier: 4, min1: 1, max1: 3, min2: 9, max2: 19, weight: 1000, ilvl: 10 }
            ]
        },
        shadow_damage: {
            id: 'shadow_damage',
            label: 'Adds # to @ Shadow Damage', labelDe: 'Fügt # bis @ Schattenschaden hinzu',
            // Shadow is rarer and slightly lower values — it has strong status effects
            tiers: [
                { tier: 1, min1: 15, max1: 22, min2: 40, max2: 58, weight: 80, ilvl: 82 },
                { tier: 2, min1: 9, max1: 14, min2: 25, max2: 39, weight: 180, ilvl: 62 },
                { tier: 3, min1: 4, max1: 8, min2: 12, max2: 24, weight: 380, ilvl: 38 },
                { tier: 4, min1: 1, max1: 3, min2: 5, max2: 11, weight: 800, ilvl: 12 }
            ]
        },

        // --- CRITICAL STRIKES ---
        crit_chance: {
            id: 'crit_chance',
            label: '+#% Critical Strike Chance', labelDe: '+#% kritische Trefferchance',
            tiers: [
                { tier: 1, min: 6, max: 8, weight: 100, ilvl: 80 },
                { tier: 2, min: 4, max: 5, weight: 220, ilvl: 60 },
                { tier: 3, min: 2, max: 3, weight: 500, ilvl: 35 },
                { tier: 4, min: 1, max: 1, weight: 1000, ilvl: 10 }
            ]
        },
        crit_multiplier: {
            id: 'crit_multiplier',
            label: '+#% to Critical Strike Multiplier', labelDe: '+#% zum kritischen Schadensmultiplikator',
            tiers: [
                { tier: 1, min: 45, max: 60, weight: 80, ilvl: 82 },
                { tier: 2, min: 28, max: 44, weight: 180, ilvl: 62 },
                { tier: 3, min: 15, max: 27, weight: 400, ilvl: 40 },
                { tier: 4, min: 5, max: 14, weight: 900, ilvl: 15 }
            ]
        },

        // --- SPELL DAMAGE ---
        spell_damage: {
            id: 'spell_damage',
            label: '+# to Spell Damage', labelDe: '+# zu Zauberschaden',
            tiers: [
                { tier: 1, min: 55, max: 75, weight: 100, ilvl: 80 },
                { tier: 2, min: 35, max: 54, weight: 250, ilvl: 60 },
                { tier: 3, min: 18, max: 34, weight: 500, ilvl: 38 },
                { tier: 4, min: 7, max: 17, weight: 1000, ilvl: 15 },
                { tier: 5, min: 2, max: 6, weight: 2000, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 35, max: 45, weight: 100, ilvl: 78 },
                { tier: 2, min: 22, max: 34, weight: 300, ilvl: 50 },
                { tier: 3, min: 10, max: 21, weight: 600, ilvl: 15 }
            ]
        },
        mistake_not_count: {
            id: 'mistake_not_count',
            label: '#% Chance for Mistakes to not Count', labelDe: '#% Chance, dass Fehler nicht gewertet werden',
            // Amulet-exclusive — powerful puzzle utility, kept very rare
            tiers: [
                { tier: 1, min: 12, max: 18, weight: 40, ilvl: 85 },
                { tier: 2, min: 6, max: 11, weight: 120, ilvl: 65 },
                { tier: 3, min: 2, max: 5, weight: 350, ilvl: 15 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 38, max: 46, weight: 200, ilvl: 80 },
                { tier: 2, min: 29, max: 37, weight: 400, ilvl: 65 },
                { tier: 3, min: 20, max: 28, weight: 800, ilvl: 45 },
                { tier: 4, min: 11, max: 19, weight: 1600, ilvl: 20 },
                { tier: 5, min: 4, max: 10, weight: 3200, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 38, max: 46, weight: 200, ilvl: 80 },
                { tier: 2, min: 29, max: 37, weight: 400, ilvl: 65 },
                { tier: 3, min: 20, max: 28, weight: 800, ilvl: 45 },
                { tier: 4, min: 11, max: 19, weight: 1600, ilvl: 20 },
                { tier: 5, min: 4, max: 10, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 38, max: 46, weight: 200, ilvl: 80 },
                { tier: 2, min: 29, max: 37, weight: 400, ilvl: 65 },
                { tier: 3, min: 20, max: 28, weight: 800, ilvl: 45 },
                { tier: 4, min: 11, max: 19, weight: 1600, ilvl: 20 },
                { tier: 5, min: 4, max: 10, weight: 3200, ilvl: 1 }
            ]
        },

        // --- REGEN & RECOVERY ---
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 13, max: 20, weight: 150, ilvl: 78 },
                { tier: 2, min: 8, max: 12, weight: 300, ilvl: 55 },
                { tier: 3, min: 4, max: 7, weight: 600, ilvl: 35 },
                { tier: 4, min: 2, max: 3, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 1, weight: 2400, ilvl: 1 }
            ]
        },
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 20, max: 30, weight: 150, ilvl: 78 },
                { tier: 2, min: 13, max: 19, weight: 300, ilvl: 55 },
                { tier: 3, min: 7, max: 12, weight: 600, ilvl: 35 },
                { tier: 4, min: 3, max: 6, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2400, ilvl: 1 }
            ]
        },
        life_leech: {
            id: 'life_leech',
            label: 'Gain #% of Damage dealt as Life', labelDe: 'Erhalte #% des verursachten Schadens als Leben',
            tiers: [
                { tier: 1, min: 2, max: 3, weight: 80, ilvl: 82 },
                { tier: 2, min: 1, max: 2, weight: 200, ilvl: 60 },
                { tier: 3, min: 0.5, max: 0.9, weight: 500, ilvl: 15 }
            ]
        },
        absorption_on_kill: {
            id: 'absorption_on_kill',
            label: 'Gain # Absorption on Kill', labelDe: 'Erhalte # Absorption bei Kill',
            tiers: [
                { tier: 1, min: 20, max: 30, weight: 100, ilvl: 80 },
                { tier: 2, min: 12, max: 19, weight: 250, ilvl: 58 },
                { tier: 3, min: 6, max: 11, weight: 550, ilvl: 32 },
                { tier: 4, min: 2, max: 5, weight: 1100, ilvl: 1 }
            ]
        },

        // --- RESISTANCES ---
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 38, max: 44, weight: 250, ilvl: 80 },
                { tier: 2, min: 29, max: 37, weight: 500, ilvl: 60 },
                { tier: 3, min: 18, max: 28, weight: 1000, ilvl: 35 },
                { tier: 4, min: 9, max: 17, weight: 2000, ilvl: 15 },
                { tier: 5, min: 3, max: 8, weight: 4000, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 38, max: 44, weight: 250, ilvl: 80 },
                { tier: 2, min: 29, max: 37, weight: 500, ilvl: 60 },
                { tier: 3, min: 18, max: 28, weight: 1000, ilvl: 35 },
                { tier: 4, min: 9, max: 17, weight: 2000, ilvl: 15 },
                { tier: 5, min: 3, max: 8, weight: 4000, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 38, max: 44, weight: 250, ilvl: 80 },
                { tier: 2, min: 29, max: 37, weight: 500, ilvl: 60 },
                { tier: 3, min: 18, max: 28, weight: 1000, ilvl: 35 },
                { tier: 4, min: 9, max: 17, weight: 2000, ilvl: 15 },
                { tier: 5, min: 3, max: 8, weight: 4000, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 26, max: 32, weight: 150, ilvl: 82 },
                { tier: 2, min: 19, max: 25, weight: 300, ilvl: 65 },
                { tier: 3, min: 11, max: 18, weight: 600, ilvl: 40 },
                { tier: 4, min: 4, max: 10, weight: 1200, ilvl: 15 }
            ]
        },

        // --- STATUS EFFECT CHANCES ---
        // These are amulet-flavored — the enchanted pendant channels elemental/shadow power.
        // Values are % chance per hit to apply the status.
        chance_to_ignite: {
            id: 'chance_to_ignite',
            label: '#% Chance to Ignite on Hit', labelDe: '#% Chance auf Entzünden bei Treffer',
            tiers: [
                { tier: 1, min: 18, max: 25, weight: 100, ilvl: 80 },
                { tier: 2, min: 10, max: 17, weight: 250, ilvl: 58 },
                { tier: 3, min: 5, max: 9, weight: 550, ilvl: 32 },
                { tier: 4, min: 2, max: 4, weight: 1100, ilvl: 8 }
            ]
        },
        chance_to_freeze: {
            id: 'chance_to_freeze',
            label: '#% Chance to Freeze on Hit', labelDe: '#% Chance auf Einfrieren bei Treffer',
            tiers: [
                { tier: 1, min: 15, max: 22, weight: 100, ilvl: 80 },
                { tier: 2, min: 8, max: 14, weight: 250, ilvl: 58 },
                { tier: 3, min: 4, max: 7, weight: 550, ilvl: 32 },
                { tier: 4, min: 1, max: 3, weight: 1100, ilvl: 8 }
            ]
        },
        chance_to_shock: {
            id: 'chance_to_shock',
            label: '#% Chance to Shock on Hit', labelDe: '#% Chance auf Schock bei Treffer',
            tiers: [
                { tier: 1, min: 18, max: 25, weight: 100, ilvl: 80 },
                { tier: 2, min: 10, max: 17, weight: 250, ilvl: 58 },
                { tier: 3, min: 5, max: 9, weight: 550, ilvl: 32 },
                { tier: 4, min: 2, max: 4, weight: 1100, ilvl: 8 }
            ]
        },
        chance_to_blind: {
            id: 'chance_to_blind',
            label: '#% Chance to Blind on Hit', labelDe: '#% Chance auf Blendung bei Treffer',
            tiers: [
                { tier: 1, min: 20, max: 30, weight: 120, ilvl: 78 },
                { tier: 2, min: 12, max: 19, weight: 280, ilvl: 55 },
                { tier: 3, min: 6, max: 11, weight: 600, ilvl: 30 },
                { tier: 4, min: 2, max: 5, weight: 1200, ilvl: 8 }
            ]
        },
        chance_to_convert: {
            id: 'chance_to_convert',
            // Rarest status — very powerful, shadow-locked, no T5
            label: '#% Chance to Convert on Hit', labelDe: '#% Chance zur Umwandlung bei Treffer',
            tiers: [
                { tier: 1, min: 8, max: 12, weight: 50, ilvl: 84 },
                { tier: 2, min: 4, max: 7, weight: 130, ilvl: 65 },
                { tier: 3, min: 1, max: 3, weight: 350, ilvl: 15 }
            ]
        },

        // --- ACCURACY ---
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 181, max: 280, weight: 150, ilvl: 80 },
                { tier: 2, min: 101, max: 180, weight: 300, ilvl: 60 },
                { tier: 3, min: 51, max: 100, weight: 600, ilvl: 40 },
                { tier: 4, min: 21, max: 50, weight: 1200, ilvl: 20 },
                { tier: 5, min: 6, max: 20, weight: 2400, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 9, max: 14, weight: 150, ilvl: 75 },
                { tier: 2, min: 4, max: 8, weight: 400, ilvl: 15 }
            ]
        }
    }
};



//------------------------------------------------------------------------
//-------------------SHOULDERS MODIFIER TABLE-----------------------------
//------------------------------------------------------------------------
// Shoulders are a primary armour piece — emphasis on defenses, damage
// mitigation, and pushback/overkill as thematic offensive flavour.
// Block, dodge, and spell-versions live exclusively here and on the chest.
// Values match helmet scale since both are major armour slots.
// No elemental damage, no crit, no status effect chances, no leech.

const EG_MOD_TABLE_SHOULDERS = {
    prefixes: {

        // --- LIFE & MANA ---
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 90, max: 109, weight: 100, ilvl: 80 },
                { tier: 2, min: 70, max: 89, weight: 250, ilvl: 65 },
                { tier: 3, min: 50, max: 69, weight: 500, ilvl: 45 },
                { tier: 4, min: 30, max: 49, weight: 1000, ilvl: 25 },
                { tier: 5, min: 10, max: 29, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 65, max: 79, weight: 100, ilvl: 80 },
                { tier: 2, min: 50, max: 64, weight: 250, ilvl: 65 },
                { tier: 3, min: 35, max: 49, weight: 500, ilvl: 45 },
                { tier: 4, min: 20, max: 34, weight: 1000, ilvl: 25 },
                { tier: 5, min: 5, max: 19, weight: 2000, ilvl: 1 }
            ]
        },

        // --- LOCAL DEFENSES ---
        flat_armour: {
            id: 'flat_armour',
            label: '+# to Armour', labelDe: '+# zu Rüstung',
            tiers: [
                { tier: 1, min: 100, max: 150, weight: 150, ilvl: 82 },
                { tier: 2, min: 60, max: 99, weight: 300, ilvl: 60 },
                { tier: 3, min: 25, max: 59, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 24, weight: 1200, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 80, max: 100, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 79, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 49, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        flat_evasion: {
            id: 'flat_evasion',
            label: '+# to Evasion', labelDe: '+# zu Ausweichen',
            tiers: [
                { tier: 1, min: 100, max: 150, weight: 150, ilvl: 82 },
                { tier: 2, min: 60, max: 99, weight: 300, ilvl: 60 },
                { tier: 3, min: 25, max: 59, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 24, weight: 1200, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 80, max: 100, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 79, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 49, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        flat_absorption: {
            id: 'flat_absorption',
            label: '+# to Absorption', labelDe: '+# zu Absorption',
            tiers: [
                { tier: 1, min: 80, max: 110, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 79, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 49, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        inc_absorption: {
            id: 'inc_absorption',
            label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
            tiers: [
                { tier: 1, min: 80, max: 100, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 79, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 49, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },

        // --- HYBRID LIFE & MANA / DEFENSES ---
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 35, max1: 45, min2: 40, max2: 60, weight: 100, ilvl: 78 },
                { tier: 2, min1: 25, max1: 34, min2: 25, max2: 39, weight: 250, ilvl: 50 },
                { tier: 3, min1: 15, max1: 24, min2: 15, max2: 24, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 14, min2: 5, max2: 14, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 25, max1: 35, min2: 40, max2: 60, weight: 100, ilvl: 78 },
                { tier: 2, min1: 18, max1: 24, min2: 25, max2: 39, weight: 250, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 15, max2: 24, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 9, min2: 5, max2: 14, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 35, max1: 45, min2: 40, max2: 60, weight: 100, ilvl: 78 },
                { tier: 2, min1: 25, max1: 34, min2: 25, max2: 39, weight: 250, ilvl: 50 },
                { tier: 3, min1: 15, max1: 24, min2: 15, max2: 24, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 14, min2: 5, max2: 14, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 25, max1: 35, min2: 40, max2: 60, weight: 100, ilvl: 78 },
                { tier: 2, min1: 18, max1: 24, min2: 25, max2: 39, weight: 250, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 15, max2: 24, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 9, min2: 5, max2: 14, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 35, max1: 45, min2: 30, max2: 45, weight: 100, ilvl: 78 },
                { tier: 2, min1: 25, max1: 34, min2: 20, max2: 29, weight: 250, ilvl: 50 },
                { tier: 3, min1: 15, max1: 24, min2: 10, max2: 19, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 14, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 25, max1: 35, min2: 30, max2: 45, weight: 100, ilvl: 78 },
                { tier: 2, min1: 18, max1: 24, min2: 20, max2: 29, weight: 250, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 10, max2: 19, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 9, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENSES ---
        hybrid_armour_evasion: {
            id: 'hybrid_armour_evasion',
            label: '+# to Armour\n+@ to Evasion', labelDe: '+# zu Rüstung\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 40, max1: 65, min2: 40, max2: 65, weight: 120, ilvl: 80 },
                { tier: 2, min1: 25, max1: 39, min2: 25, max2: 39, weight: 250, ilvl: 55 },
                { tier: 3, min1: 12, max1: 24, min2: 12, max2: 24, weight: 500, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 4, max2: 11, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 40, max1: 65, min2: 30, max2: 50, weight: 120, ilvl: 80 },
                { tier: 2, min1: 25, max1: 39, min2: 20, max2: 29, weight: 250, ilvl: 55 },
                { tier: 3, min1: 12, max1: 24, min2: 10, max2: 19, weight: 500, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 40, max1: 65, min2: 30, max2: 50, weight: 120, ilvl: 80 },
                { tier: 2, min1: 25, max1: 39, min2: 20, max2: 29, weight: 250, ilvl: 55 },
                { tier: 3, min1: 12, max1: 24, min2: 10, max2: 19, weight: 500, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 45, max: 60, weight: 100, ilvl: 78 },
                { tier: 2, min: 30, max: 44, weight: 300, ilvl: 50 },
                { tier: 3, min: 15, max: 29, weight: 600, ilvl: 15 }
            ]
        },

        // --- SHOULDERS-EXCLUSIVE OFFENSIVE ---
        // "Bearing down" on enemies — pushing their charge timers back.
        pushback: {
            id: 'pushback',
            label: 'Hits push back Monster Charge Timers by an additional # seconds', labelDe: 'Treffer verzögern die Ansturm-Timer von Monstern um zusätzliche # Sekunden',
            tiers: [
                { tier: 1, min: 1.5, max: 2.0, weight: 80, ilvl: 84 },
                { tier: 2, min: 0.8, max: 1.4, weight: 200, ilvl: 62 },
                { tier: 3, min: 0.3, max: 0.7, weight: 500, ilvl: 35 },
                { tier: 4, min: 0.1, max: 0.2, weight: 1000, ilvl: 10 }
            ]
        },
        // Overkill damage bleeds into nearby spawn locations.
        overkill: {
            id: 'overkill',
            label: '#% Chance for Overkill Damage to spread to a nearby Monster', labelDe: '#% Chance, dass überschüssiger Schaden auf ein nahes Monster überspringt',
            tiers: [
                { tier: 1, min: 22, max: 30, weight: 80, ilvl: 82 },
                { tier: 2, min: 13, max: 21, weight: 200, ilvl: 60 },
                { tier: 3, min: 6, max: 12, weight: 450, ilvl: 35 },
                { tier: 4, min: 2, max: 5, weight: 1000, ilvl: 10 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },

        // --- REGEN & RECOVERY ---
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 16, max: 25, weight: 150, ilvl: 78 },
                { tier: 2, min: 11, max: 15, weight: 300, ilvl: 55 },
                { tier: 3, min: 6, max: 10, weight: 600, ilvl: 35 },
                { tier: 4, min: 3, max: 5, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2400, ilvl: 1 }
            ]
        },
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 25, max: 35, weight: 150, ilvl: 78 },
                { tier: 2, min: 16, max: 24, weight: 300, ilvl: 55 },
                { tier: 3, min: 10, max: 15, weight: 600, ilvl: 35 },
                { tier: 4, min: 5, max: 9, weight: 1200, ilvl: 15 },
                { tier: 5, min: 2, max: 4, weight: 2400, ilvl: 1 }
            ]
        },
        absorption_regen_rate: {
            id: 'absorption_regen_rate',
            // How quickly absorption refills once the delay has passed.
            // Expressed as % faster regeneration.
            label: '#% increased Absorption Regeneration Rate', labelDe: '#% erhöhte Absorptionsregeneration',
            tiers: [
                { tier: 1, min: 35, max: 50, weight: 120, ilvl: 80 },
                { tier: 2, min: 20, max: 34, weight: 280, ilvl: 58 },
                { tier: 3, min: 10, max: 19, weight: 600, ilvl: 32 },
                { tier: 4, min: 3, max: 9, weight: 1200, ilvl: 10 }
            ]
        },
        faster_absorption_regen_start: {
            id: 'faster_absorption_regen_start',
            // Reduces the delay before absorption starts regenerating after a hit.
            // Expressed as seconds reduced from the 5-second base delay.
            label: 'Absorption begins Regenerating # second(s) sooner', labelDe: 'Absorption regeneriert # Sekunde(n) früher',
            tiers: [
                { tier: 1, min: 2.0, max: 2.5, weight: 80, ilvl: 82 },
                { tier: 2, min: 1.0, max: 1.9, weight: 200, ilvl: 60 },
                { tier: 3, min: 0.5, max: 0.9, weight: 500, ilvl: 35 },
                { tier: 4, min: 0.1, max: 0.4, weight: 1000, ilvl: 10 }
            ]
        },

        // --- RESISTANCES ---
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 31, max: 35, weight: 150, ilvl: 82 },
                { tier: 2, min: 26, max: 30, weight: 300, ilvl: 65 },
                { tier: 3, min: 16, max: 25, weight: 600, ilvl: 40 },
                { tier: 4, min: 5, max: 15, weight: 1200, ilvl: 15 }
            ]
        },

        // --- BLOCK & DODGE (shoulders + chest only) ---
        block_chance: {
            id: 'block_chance',
            label: '+#% Chance to Block Attacks', labelDe: '+#% Chance, Angriffe zu blocken',
            tiers: [
                { tier: 1, min: 8, max: 12, weight: 100, ilvl: 80 },
                { tier: 2, min: 5, max: 7, weight: 250, ilvl: 58 },
                { tier: 3, min: 3, max: 4, weight: 550, ilvl: 32 },
                { tier: 4, min: 1, max: 2, weight: 1100, ilvl: 8 }
            ]
        },
        spell_block_chance: {
            id: 'spell_block_chance',
            label: '+#% Chance to Block Spells', labelDe: '+#% Chance, Zauber zu blocken',
            tiers: [
                { tier: 1, min: 6, max: 9, weight: 80, ilvl: 82 },
                { tier: 2, min: 4, max: 5, weight: 200, ilvl: 60 },
                { tier: 3, min: 2, max: 3, weight: 450, ilvl: 35 },
                { tier: 4, min: 1, max: 1, weight: 1000, ilvl: 10 }
            ]
        },
        block_recovery: {
            id: 'block_recovery',
            // Reduces the 5-second post-block window where you can't deal damage.
            label: 'Recover from Blocks #% faster', labelDe: 'Erholung nach Blocken #% schneller',
            tiers: [
                { tier: 1, min: 35, max: 50, weight: 100, ilvl: 80 },
                { tier: 2, min: 20, max: 34, weight: 250, ilvl: 58 },
                { tier: 3, min: 10, max: 19, weight: 550, ilvl: 32 },
                { tier: 4, min: 3, max: 9, weight: 1100, ilvl: 8 }
            ]
        },
        dodge: {
            id: 'dodge',
            label: '+#% Chance to Dodge Attacks', labelDe: '+#% Chance, Angriffen auszuweichen',
            tiers: [
                { tier: 1, min: 6, max: 9, weight: 100, ilvl: 80 },
                { tier: 2, min: 4, max: 5, weight: 250, ilvl: 58 },
                { tier: 3, min: 2, max: 3, weight: 550, ilvl: 32 },
                { tier: 4, min: 1, max: 1, weight: 1100, ilvl: 8 }
            ]
        },
        spell_dodge: {
            id: 'spell_dodge',
            label: '+#% Chance to Dodge Spells', labelDe: '+#% Chance, Zaubern auszuweichen',
            tiers: [
                { tier: 1, min: 5, max: 7, weight: 80, ilvl: 82 },
                { tier: 2, min: 3, max: 4, weight: 200, ilvl: 60 },
                { tier: 3, min: 2, max: 2, weight: 450, ilvl: 35 },
                { tier: 4, min: 1, max: 1, weight: 1000, ilvl: 10 }
            ]
        },

        // --- ACCURACY ---
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 251, max: 400, weight: 150, ilvl: 80 },
                { tier: 2, min: 121, max: 250, weight: 300, ilvl: 60 },
                { tier: 3, min: 61, max: 120, weight: 600, ilvl: 40 },
                { tier: 4, min: 31, max: 60, weight: 1200, ilvl: 20 },
                { tier: 5, min: 10, max: 30, weight: 2400, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 10, max: 15, weight: 150, ilvl: 75 },
                { tier: 2, min: 5, max: 9, weight: 400, ilvl: 15 }
            ]
        }
    }
};




//------------------------------------------------------------------------
//-------------------CLOAK MODIFIER TABLE---------------------------------
//------------------------------------------------------------------------
// Cloaks are flowing garments — they favour evasion over raw armour.
// Their thematic identity is concealment and mobility: dodge, blind,
// chain, multishot, and splash live here as exclusive or near-exclusive
// mods. No block (that's shoulders/chest). No elemental damage or crit
// (that's weapons/amulets). Evasion values are the best of any armour
// slot; armour and absorption values are slightly below helmet scale.

const EG_MOD_TABLE_CLOAK = {
    prefixes: {

        // --- LIFE & MANA ---
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 80, max: 99, weight: 100, ilvl: 80 },
                { tier: 2, min: 60, max: 79, weight: 250, ilvl: 65 },
                { tier: 3, min: 40, max: 59, weight: 500, ilvl: 45 },
                { tier: 4, min: 20, max: 39, weight: 1000, ilvl: 25 },
                { tier: 5, min: 7, max: 19, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 55, max: 70, weight: 100, ilvl: 80 },
                { tier: 2, min: 40, max: 54, weight: 250, ilvl: 65 },
                { tier: 3, min: 28, max: 39, weight: 500, ilvl: 45 },
                { tier: 4, min: 15, max: 27, weight: 1000, ilvl: 25 },
                { tier: 5, min: 4, max: 14, weight: 2000, ilvl: 1 }
            ]
        },

        // --- LOCAL DEFENSES ---
        // Evasion is the cloak's primary stat — highest values of any slot.
        flat_evasion: {
            id: 'flat_evasion',
            label: '+# to Evasion', labelDe: '+# zu Ausweichen',
            tiers: [
                { tier: 1, min: 120, max: 175, weight: 150, ilvl: 82 },
                { tier: 2, min: 75, max: 119, weight: 300, ilvl: 60 },
                { tier: 3, min: 35, max: 74, weight: 600, ilvl: 30 },
                { tier: 4, min: 8, max: 34, weight: 1200, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 90, max: 115, weight: 150, ilvl: 82 },
                { tier: 2, min: 60, max: 89, weight: 300, ilvl: 60 },
                { tier: 3, min: 30, max: 59, weight: 600, ilvl: 20 },
                { tier: 4, min: 8, max: 29, weight: 1200, ilvl: 1 }
            ]
        },
        // Armour is secondary on a cloak — slightly below helmet scale.
        flat_armour: {
            id: 'flat_armour',
            label: '+# to Armour', labelDe: '+# zu Rüstung',
            tiers: [
                { tier: 1, min: 80, max: 120, weight: 150, ilvl: 82 },
                { tier: 2, min: 45, max: 79, weight: 300, ilvl: 60 },
                { tier: 3, min: 18, max: 44, weight: 600, ilvl: 30 },
                { tier: 4, min: 4, max: 17, weight: 1200, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 65, max: 85, weight: 150, ilvl: 82 },
                { tier: 2, min: 40, max: 64, weight: 300, ilvl: 60 },
                { tier: 3, min: 15, max: 39, weight: 600, ilvl: 20 },
                { tier: 4, min: 4, max: 14, weight: 1200, ilvl: 1 }
            ]
        },
        flat_absorption: {
            id: 'flat_absorption',
            label: '+# to Absorption', labelDe: '+# zu Absorption',
            tiers: [
                { tier: 1, min: 65, max: 90, weight: 150, ilvl: 82 },
                { tier: 2, min: 40, max: 64, weight: 300, ilvl: 60 },
                { tier: 3, min: 18, max: 39, weight: 600, ilvl: 30 },
                { tier: 4, min: 4, max: 17, weight: 1200, ilvl: 1 }
            ]
        },
        inc_absorption: {
            id: 'inc_absorption',
            label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
            tiers: [
                { tier: 1, min: 65, max: 85, weight: 150, ilvl: 82 },
                { tier: 2, min: 40, max: 64, weight: 300, ilvl: 60 },
                { tier: 3, min: 15, max: 39, weight: 600, ilvl: 20 },
                { tier: 4, min: 4, max: 14, weight: 1200, ilvl: 1 }
            ]
        },

        // --- HYBRID LIFE & MANA / DEFENSES ---
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 35, max1: 45, min2: 50, max2: 70, weight: 100, ilvl: 78 },
                { tier: 2, min1: 25, max1: 34, min2: 30, max2: 49, weight: 250, ilvl: 50 },
                { tier: 3, min1: 15, max1: 24, min2: 15, max2: 29, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 14, min2: 5, max2: 14, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 25, max1: 35, min2: 50, max2: 70, weight: 100, ilvl: 78 },
                { tier: 2, min1: 18, max1: 24, min2: 30, max2: 49, weight: 250, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 15, max2: 29, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 9, min2: 5, max2: 14, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 35, max1: 45, min2: 35, max2: 55, weight: 100, ilvl: 78 },
                { tier: 2, min1: 25, max1: 34, min2: 20, max2: 34, weight: 250, ilvl: 50 },
                { tier: 3, min1: 15, max1: 24, min2: 10, max2: 19, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 14, min2: 4, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 35, max1: 45, min2: 28, max2: 42, weight: 100, ilvl: 78 },
                { tier: 2, min1: 25, max1: 34, min2: 17, max2: 27, weight: 250, ilvl: 50 },
                { tier: 3, min1: 15, max1: 24, min2: 8, max2: 16, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 14, min2: 3, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENSES ---
        // Evasion pairs are the premium hybrid on a cloak.
        hybrid_evasion_armour: {
            id: 'hybrid_evasion_armour',
            label: '+# to Evasion\n+@ to Armour', labelDe: '+# zu Ausweichen\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 50, max1: 75, min2: 35, max2: 55, weight: 120, ilvl: 80 },
                { tier: 2, min1: 30, max1: 49, min2: 20, max2: 34, weight: 250, ilvl: 55 },
                { tier: 3, min1: 15, max1: 29, min2: 10, max2: 19, weight: 500, ilvl: 30 },
                { tier: 4, min1: 5, max1: 14, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 50, max1: 75, min2: 28, max2: 42, weight: 120, ilvl: 80 },
                { tier: 2, min1: 30, max1: 49, min2: 17, max2: 27, weight: 250, ilvl: 55 },
                { tier: 3, min1: 15, max1: 29, min2: 8, max2: 16, weight: 500, ilvl: 30 },
                { tier: 4, min1: 5, max1: 14, min2: 3, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 35, max1: 55, min2: 28, max2: 42, weight: 120, ilvl: 80 },
                { tier: 2, min1: 20, max1: 34, min2: 17, max2: 27, weight: 250, ilvl: 55 },
                { tier: 3, min1: 10, max1: 19, min2: 8, max2: 16, weight: 500, ilvl: 30 },
                { tier: 4, min1: 3, max1: 9, min2: 3, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 45, max: 60, weight: 100, ilvl: 78 },
                { tier: 2, min: 30, max: 44, weight: 300, ilvl: 50 },
                { tier: 3, min: 15, max: 29, weight: 600, ilvl: 15 }
            ]
        },

        // --- CLOAK-EXCLUSIVE OFFENSIVE ---
        // Chain: projectiles bounce to an additional monster in a different
        // spawn location after hitting. The billowing cloak conceals the
        // ricocheting trajectory.
        chain: {
            id: 'chain',
            label: '#% Chance for Projectiles to Chain to an additional Monster', labelDe: '#% Chance, dass Projektile auf ein weiteres Monster überspringen',
            tiers: [
                { tier: 1, min: 25, max: 35, weight: 70, ilvl: 84 },
                { tier: 2, min: 15, max: 24, weight: 180, ilvl: 63 },
                { tier: 3, min: 7, max: 14, weight: 420, ilvl: 38 },
                { tier: 4, min: 2, max: 6, weight: 900, ilvl: 12 }
            ]
        },
        // Splash: each hit has a chance to damage all monsters sharing a
        // spawn location. A sweeping cloak clearing a cluster.
        splash_damage: {
            id: 'splash_damage',
            label: '#% Chance for Hits to deal Splash Damage to nearby Monsters', labelDe: '#% Chance, dass Treffer Flächenschaden an nahen Monstern verursachen',
            tiers: [
                { tier: 1, min: 22, max: 32, weight: 80, ilvl: 82 },
                { tier: 2, min: 13, max: 21, weight: 200, ilvl: 60 },
                { tier: 3, min: 6, max: 12, weight: 450, ilvl: 35 },
                { tier: 4, min: 2, max: 5, weight: 950, ilvl: 10 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },

        // --- REGEN & RECOVERY ---
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 16, max: 25, weight: 150, ilvl: 78 },
                { tier: 2, min: 11, max: 15, weight: 300, ilvl: 55 },
                { tier: 3, min: 6, max: 10, weight: 600, ilvl: 35 },
                { tier: 4, min: 3, max: 5, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2400, ilvl: 1 }
            ]
        },
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 25, max: 35, weight: 150, ilvl: 78 },
                { tier: 2, min: 16, max: 24, weight: 300, ilvl: 55 },
                { tier: 3, min: 10, max: 15, weight: 600, ilvl: 35 },
                { tier: 4, min: 5, max: 9, weight: 1200, ilvl: 15 },
                { tier: 5, min: 2, max: 4, weight: 2400, ilvl: 1 }
            ]
        },

        // --- RESISTANCES ---
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 31, max: 35, weight: 150, ilvl: 82 },
                { tier: 2, min: 26, max: 30, weight: 300, ilvl: 65 },
                { tier: 3, min: 16, max: 25, weight: 600, ilvl: 40 },
                { tier: 4, min: 5, max: 15, weight: 1200, ilvl: 15 }
            ]
        },

        // --- CLOAK-EXCLUSIVE: DODGE (not block — cloaks slip away) ---
        dodge: {
            id: 'dodge',
            label: '+#% Chance to Dodge Attacks', labelDe: '+#% Chance, Angriffen auszuweichen',
            tiers: [
                { tier: 1, min: 8, max: 12, weight: 100, ilvl: 80 },
                { tier: 2, min: 5, max: 7, weight: 250, ilvl: 58 },
                { tier: 3, min: 3, max: 4, weight: 550, ilvl: 32 },
                { tier: 4, min: 1, max: 2, weight: 1100, ilvl: 8 }
            ]
        },
        spell_dodge: {
            id: 'spell_dodge',
            label: '+#% Chance to Dodge Spells', labelDe: '+#% Chance, Zaubern auszuweichen',
            tiers: [
                { tier: 1, min: 6, max: 9, weight: 80, ilvl: 82 },
                { tier: 2, min: 4, max: 5, weight: 200, ilvl: 60 },
                { tier: 3, min: 2, max: 3, weight: 450, ilvl: 35 },
                { tier: 4, min: 1, max: 1, weight: 1000, ilvl: 10 }
            ]
        },
        // Cloak gets higher dodge values than shoulders since it's the
        // dedicated evasion/mobility slot. Shoulders get block as primary.

        // --- CLOAK-EXCLUSIVE: MULTISHOT & BLIND ---
        // Multishot: the cloak conceals an extra nocked arrow or bolt.
        multishot: {
            id: 'multishot',
            label: '+#% Chance to fire an additional Projectile', labelDe: '+#% Chance auf ein zusätzliches Projektil',
            tiers: [
                { tier: 1, min: 22, max: 32, weight: 80, ilvl: 82 },
                { tier: 2, min: 13, max: 21, weight: 200, ilvl: 62 },
                { tier: 3, min: 6, max: 12, weight: 480, ilvl: 38 },
                { tier: 4, min: 2, max: 5, weight: 1000, ilvl: 12 }
            ]
        },
        // Blind: the cloak whips shadow and dust into enemies' eyes.
        chance_to_blind: {
            id: 'chance_to_blind',
            label: '#% Chance to Blind on Hit', labelDe: '#% Chance auf Blendung bei Treffer',
            tiers: [
                { tier: 1, min: 22, max: 32, weight: 100, ilvl: 78 },
                { tier: 2, min: 13, max: 21, weight: 250, ilvl: 55 },
                { tier: 3, min: 6, max: 12, weight: 550, ilvl: 30 },
                { tier: 4, min: 2, max: 5, weight: 1100, ilvl: 8 }
            ]
        },

        // --- ACCURACY ---
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 251, max: 400, weight: 150, ilvl: 80 },
                { tier: 2, min: 121, max: 250, weight: 300, ilvl: 60 },
                { tier: 3, min: 61, max: 120, weight: 600, ilvl: 40 },
                { tier: 4, min: 31, max: 60, weight: 1200, ilvl: 20 },
                { tier: 5, min: 10, max: 30, weight: 2400, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 10, max: 15, weight: 150, ilvl: 75 },
                { tier: 2, min: 5, max: 9, weight: 400, ilvl: 15 }
            ]
        }
    }
};




//------------------------------------------------------------------------
//-------------------CHEST MODIFIER TABLE---------------------------------
//------------------------------------------------------------------------
// The chest is the largest and most important armour slot. It has the
// highest flat defence values of any slot, the strongest block values,
// and hosts some powerful exclusive mods: a spell damage multiplier
// (inscribed into the breastplate), precision (the stacking puzzle buff),
// and the heaviest absorption mods outside of dedicated shield builds.
// Block/dodge both appear here — the chest handles both archetypes.
// No elemental damage, crit, chain, splash, multishot, or pushback —
// those belong to weapons, amulets, and cloaks respectively.

const EG_MOD_TABLE_CHEST = {
    prefixes: {

        // --- LIFE & MANA ---
        // Chest has the highest life/mana flat values of any slot.
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 120, max: 150, weight: 100, ilvl: 80 },
                { tier: 2, min: 90, max: 119, weight: 250, ilvl: 65 },
                { tier: 3, min: 60, max: 89, weight: 500, ilvl: 45 },
                { tier: 4, min: 35, max: 59, weight: 1000, ilvl: 25 },
                { tier: 5, min: 12, max: 34, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 85, max: 110, weight: 100, ilvl: 80 },
                { tier: 2, min: 62, max: 84, weight: 250, ilvl: 65 },
                { tier: 3, min: 42, max: 61, weight: 500, ilvl: 45 },
                { tier: 4, min: 22, max: 41, weight: 1000, ilvl: 25 },
                { tier: 5, min: 7, max: 21, weight: 2000, ilvl: 1 }
            ]
        },
        heart_heal: {
            id: 'heart_heal',
            label: 'Hearts heal for an additional # Health', labelDe: 'Herzen heilen zusätzlich um # Leben',
            tiers: [
                { tier: 1, min: 50, max: 65, weight: 200, ilvl: 75 },
                { tier: 2, min: 32, max: 49, weight: 400, ilvl: 40 },
                { tier: 3, min: 14, max: 31, weight: 800, ilvl: 10 }
            ]
        },

        // --- LOCAL DEFENSES ---
        // All three defence types get the highest flat values of any slot.
        flat_armour: {
            id: 'flat_armour',
            label: '+# to Armour', labelDe: '+# zu Rüstung',
            tiers: [
                { tier: 1, min: 160, max: 220, weight: 150, ilvl: 82 },
                { tier: 2, min: 100, max: 159, weight: 300, ilvl: 60 },
                { tier: 3, min: 50, max: 99, weight: 600, ilvl: 30 },
                { tier: 4, min: 12, max: 49, weight: 1200, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 90, max: 120, weight: 150, ilvl: 82 },
                { tier: 2, min: 60, max: 89, weight: 300, ilvl: 60 },
                { tier: 3, min: 30, max: 59, weight: 600, ilvl: 20 },
                { tier: 4, min: 8, max: 29, weight: 1200, ilvl: 1 }
            ]
        },
        flat_evasion: {
            id: 'flat_evasion',
            label: '+# to Evasion', labelDe: '+# zu Ausweichen',
            tiers: [
                { tier: 1, min: 160, max: 220, weight: 150, ilvl: 82 },
                { tier: 2, min: 100, max: 159, weight: 300, ilvl: 60 },
                { tier: 3, min: 50, max: 99, weight: 600, ilvl: 30 },
                { tier: 4, min: 12, max: 49, weight: 1200, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 90, max: 120, weight: 150, ilvl: 82 },
                { tier: 2, min: 60, max: 89, weight: 300, ilvl: 60 },
                { tier: 3, min: 30, max: 59, weight: 600, ilvl: 20 },
                { tier: 4, min: 8, max: 29, weight: 1200, ilvl: 1 }
            ]
        },
        flat_absorption: {
            id: 'flat_absorption',
            label: '+# to Absorption', labelDe: '+# zu Absorption',
            tiers: [
                { tier: 1, min: 130, max: 180, weight: 150, ilvl: 82 },
                { tier: 2, min: 80, max: 129, weight: 300, ilvl: 60 },
                { tier: 3, min: 40, max: 79, weight: 600, ilvl: 30 },
                { tier: 4, min: 10, max: 39, weight: 1200, ilvl: 1 }
            ]
        },
        inc_absorption: {
            id: 'inc_absorption',
            label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
            tiers: [
                { tier: 1, min: 90, max: 120, weight: 150, ilvl: 82 },
                { tier: 2, min: 60, max: 89, weight: 300, ilvl: 60 },
                { tier: 3, min: 30, max: 59, weight: 600, ilvl: 20 },
                { tier: 4, min: 8, max: 29, weight: 1200, ilvl: 1 }
            ]
        },

        // --- HYBRID LIFE & MANA / DEFENSES ---
        // Chest hybrid values are the largest of any slot.
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 50, max1: 65, min2: 65, max2: 90, weight: 100, ilvl: 78 },
                { tier: 2, min1: 35, max1: 49, min2: 40, max2: 64, weight: 250, ilvl: 50 },
                { tier: 3, min1: 20, max1: 34, min2: 20, max2: 39, weight: 500, ilvl: 25 },
                { tier: 4, min1: 8, max1: 19, min2: 8, max2: 19, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 36, max1: 48, min2: 65, max2: 90, weight: 100, ilvl: 78 },
                { tier: 2, min1: 24, max1: 35, min2: 40, max2: 64, weight: 250, ilvl: 50 },
                { tier: 3, min1: 14, max1: 23, min2: 20, max2: 39, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 13, min2: 8, max2: 19, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 50, max1: 65, min2: 65, max2: 90, weight: 100, ilvl: 78 },
                { tier: 2, min1: 35, max1: 49, min2: 40, max2: 64, weight: 250, ilvl: 50 },
                { tier: 3, min1: 20, max1: 34, min2: 20, max2: 39, weight: 500, ilvl: 25 },
                { tier: 4, min1: 8, max1: 19, min2: 8, max2: 19, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 36, max1: 48, min2: 65, max2: 90, weight: 100, ilvl: 78 },
                { tier: 2, min1: 24, max1: 35, min2: 40, max2: 64, weight: 250, ilvl: 50 },
                { tier: 3, min1: 14, max1: 23, min2: 20, max2: 39, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 13, min2: 8, max2: 19, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 50, max1: 65, min2: 50, max2: 72, weight: 100, ilvl: 78 },
                { tier: 2, min1: 35, max1: 49, min2: 32, max2: 49, weight: 250, ilvl: 50 },
                { tier: 3, min1: 20, max1: 34, min2: 16, max2: 31, weight: 500, ilvl: 25 },
                { tier: 4, min1: 8, max1: 19, min2: 6, max2: 15, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 36, max1: 48, min2: 50, max2: 72, weight: 100, ilvl: 78 },
                { tier: 2, min1: 24, max1: 35, min2: 32, max2: 49, weight: 250, ilvl: 50 },
                { tier: 3, min1: 14, max1: 23, min2: 16, max2: 31, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 13, min2: 6, max2: 15, weight: 1000, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENSES ---
        hybrid_armour_evasion: {
            id: 'hybrid_armour_evasion',
            label: '+# to Armour\n+@ to Evasion', labelDe: '+# zu Rüstung\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 70, max1: 100, min2: 70, max2: 100, weight: 120, ilvl: 80 },
                { tier: 2, min1: 42, max1: 69, min2: 42, max2: 69, weight: 250, ilvl: 55 },
                { tier: 3, min1: 20, max1: 41, min2: 20, max2: 41, weight: 500, ilvl: 30 },
                { tier: 4, min1: 6, max1: 19, min2: 6, max2: 19, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 70, max1: 100, min2: 55, max2: 80, weight: 120, ilvl: 80 },
                { tier: 2, min1: 42, max1: 69, min2: 34, max2: 54, weight: 250, ilvl: 55 },
                { tier: 3, min1: 20, max1: 41, min2: 16, max2: 33, weight: 500, ilvl: 30 },
                { tier: 4, min1: 6, max1: 19, min2: 5, max2: 15, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 70, max1: 100, min2: 55, max2: 80, weight: 120, ilvl: 80 },
                { tier: 2, min1: 42, max1: 69, min2: 34, max2: 54, weight: 250, ilvl: 55 },
                { tier: 3, min1: 20, max1: 41, min2: 16, max2: 33, weight: 500, ilvl: 30 },
                { tier: 4, min1: 6, max1: 19, min2: 5, max2: 15, weight: 1000, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 45, max: 60, weight: 100, ilvl: 78 },
                { tier: 2, min: 30, max: 44, weight: 300, ilvl: 50 },
                { tier: 3, min: 15, max: 29, weight: 600, ilvl: 15 }
            ]
        },

        // --- CHEST-EXCLUSIVE: SPELL DAMAGE MULTIPLIER ---
        // A rune or inscription carved into the breastplate that amplifies
        // class ability power. % multiplier rather than flat — rarer and
        // more impactful than the amulet's flat spell_damage.
        inc_spell_damage: {
            id: 'inc_spell_damage',
            label: '#% increased Spell Damage', labelDe: '#% erhöhter Zauberschaden',
            tiers: [
                { tier: 1, min: 35, max: 50, weight: 70, ilvl: 84 },
                { tier: 2, min: 20, max: 34, weight: 180, ilvl: 64 },
                { tier: 3, min: 10, max: 19, weight: 420, ilvl: 40 },
                { tier: 4, min: 3, max: 9, weight: 950, ilvl: 15 }
            ]
        },

        // --- CHEST-EXCLUSIVE: ABSORPTION ON KILL ---
        // The chest absorbs the death energy of fallen enemies, replenishing
        // the absorption shield. Larger values than earring/amulet since this
        // is the biggest piece that most logically "soaks" that energy.
        absorption_on_kill: {
            id: 'absorption_on_kill',
            label: 'Gain # Absorption on Kill', labelDe: 'Erhalte # Absorption bei Kill',
            tiers: [
                { tier: 1, min: 35, max: 50, weight: 100, ilvl: 80 },
                { tier: 2, min: 20, max: 34, weight: 250, ilvl: 58 },
                { tier: 3, min: 10, max: 19, weight: 550, ilvl: 32 },
                { tier: 4, min: 3, max: 9, weight: 1100, ilvl: 1 }
            ]
        },

        // --- CHEST-EXCLUSIVE: LIFE LEECH ---
        // At chest-slot scale, life leech becomes a build-defining sustain
        // mechanic. Slightly higher ceiling than earring/amulet.
        life_leech: {
            id: 'life_leech',
            label: 'Gain #% of Damage dealt as Life', labelDe: 'Erhalte #% des verursachten Schadens als Leben',
            tiers: [
                { tier: 1, min: 2.5, max: 4, weight: 70, ilvl: 84 },
                { tier: 2, min: 1.5, max: 2.4, weight: 180, ilvl: 62 },
                { tier: 3, min: 0.8, max: 1.4, weight: 420, ilvl: 36 },
                { tier: 4, min: 0.3, max: 0.7, weight: 950, ilvl: 10 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },

        // --- REGEN & RECOVERY ---
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 20, max: 32, weight: 150, ilvl: 78 },
                { tier: 2, min: 13, max: 19, weight: 300, ilvl: 55 },
                { tier: 3, min: 7, max: 12, weight: 600, ilvl: 35 },
                { tier: 4, min: 3, max: 6, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2400, ilvl: 1 }
            ]
        },
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 30, max: 45, weight: 150, ilvl: 78 },
                { tier: 2, min: 20, max: 29, weight: 300, ilvl: 55 },
                { tier: 3, min: 12, max: 19, weight: 600, ilvl: 35 },
                { tier: 4, min: 5, max: 11, weight: 1200, ilvl: 15 },
                { tier: 5, min: 2, max: 4, weight: 2400, ilvl: 1 }
            ]
        },
        mana_on_kill: {
            id: 'mana_on_kill',
            label: 'Gain # Mana on Kill', labelDe: 'Erhalte # Mana bei Kill',
            tiers: [
                { tier: 1, min: 18, max: 28, weight: 100, ilvl: 78 },
                { tier: 2, min: 11, max: 17, weight: 250, ilvl: 55 },
                { tier: 3, min: 5, max: 10, weight: 550, ilvl: 30 },
                { tier: 4, min: 2, max: 4, weight: 1100, ilvl: 1 }
            ]
        },
        // Absorption regen mods — shared with shoulders, natural fit for
        // both torso pieces that most directly manage the absorption layer.
        absorption_regen_rate: {
            id: 'absorption_regen_rate',
            label: '#% increased Absorption Regeneration Rate', labelDe: '#% erhöhte Absorptionsregeneration',
            tiers: [
                { tier: 1, min: 40, max: 58, weight: 120, ilvl: 80 },
                { tier: 2, min: 24, max: 39, weight: 280, ilvl: 58 },
                { tier: 3, min: 12, max: 23, weight: 600, ilvl: 32 },
                { tier: 4, min: 4, max: 11, weight: 1200, ilvl: 10 }
            ]
        },
        faster_absorption_regen_start: {
            id: 'faster_absorption_regen_start',
            label: 'Absorption begins Regenerating # second(s) sooner', labelDe: 'Absorption regeneriert # Sekunde(n) früher',
            tiers: [
                { tier: 1, min: 2.0, max: 3.0, weight: 80, ilvl: 82 },
                { tier: 2, min: 1.2, max: 1.9, weight: 200, ilvl: 60 },
                { tier: 3, min: 0.5, max: 1.1, weight: 500, ilvl: 35 },
                { tier: 4, min: 0.1, max: 0.4, weight: 1000, ilvl: 10 }
            ]
        },

        // --- RESISTANCES ---
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 31, max: 35, weight: 150, ilvl: 82 },
                { tier: 2, min: 26, max: 30, weight: 300, ilvl: 65 },
                { tier: 3, min: 16, max: 25, weight: 600, ilvl: 40 },
                { tier: 4, min: 5, max: 15, weight: 1200, ilvl: 15 }
            ]
        },

        // --- BLOCK & DODGE ---
        // Chest gets the highest block values of any slot — it IS your
        // armour even without a dedicated shield. Slightly above shoulders.
        block_chance: {
            id: 'block_chance',
            label: '+#% Chance to Block Attacks', labelDe: '+#% Chance, Angriffe zu blocken',
            tiers: [
                { tier: 1, min: 10, max: 15, weight: 100, ilvl: 80 },
                { tier: 2, min: 6, max: 9, weight: 250, ilvl: 58 },
                { tier: 3, min: 3, max: 5, weight: 550, ilvl: 32 },
                { tier: 4, min: 1, max: 2, weight: 1100, ilvl: 8 }
            ]
        },
        spell_block_chance: {
            id: 'spell_block_chance',
            label: '+#% Chance to Block Spells', labelDe: '+#% Chance, Zauber zu blocken',
            tiers: [
                { tier: 1, min: 7, max: 11, weight: 80, ilvl: 82 },
                { tier: 2, min: 4, max: 6, weight: 200, ilvl: 60 },
                { tier: 3, min: 2, max: 3, weight: 450, ilvl: 35 },
                { tier: 4, min: 1, max: 1, weight: 1000, ilvl: 10 }
            ]
        },
        block_recovery: {
            id: 'block_recovery',
            label: 'Recover from Blocks #% faster', labelDe: 'Erholung nach Blocken #% schneller',
            tiers: [
                { tier: 1, min: 40, max: 60, weight: 100, ilvl: 80 },
                { tier: 2, min: 24, max: 39, weight: 250, ilvl: 58 },
                { tier: 3, min: 12, max: 23, weight: 550, ilvl: 32 },
                { tier: 4, min: 4, max: 11, weight: 1100, ilvl: 8 }
            ]
        },
        dodge: {
            id: 'dodge',
            label: '+#% Chance to Dodge Attacks', labelDe: '+#% Chance, Angriffen auszuweichen',
            tiers: [
                { tier: 1, min: 6, max: 9, weight: 100, ilvl: 80 },
                { tier: 2, min: 4, max: 5, weight: 250, ilvl: 58 },
                { tier: 3, min: 2, max: 3, weight: 550, ilvl: 32 },
                { tier: 4, min: 1, max: 1, weight: 1100, ilvl: 8 }
            ]
        },
        spell_dodge: {
            id: 'spell_dodge',
            label: '+#% Chance to Dodge Spells', labelDe: '+#% Chance, Zaubern auszuweichen',
            tiers: [
                { tier: 1, min: 5, max: 7, weight: 80, ilvl: 82 },
                { tier: 2, min: 3, max: 4, weight: 200, ilvl: 60 },
                { tier: 3, min: 2, max: 2, weight: 450, ilvl: 35 },
                { tier: 4, min: 1, max: 1, weight: 1000, ilvl: 10 }
            ]
        },

        // --- ACCURACY ---
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 251, max: 400, weight: 150, ilvl: 80 },
                { tier: 2, min: 121, max: 250, weight: 300, ilvl: 60 },
                { tier: 3, min: 61, max: 120, weight: 600, ilvl: 40 },
                { tier: 4, min: 31, max: 60, weight: 1200, ilvl: 20 },
                { tier: 5, min: 10, max: 30, weight: 2400, ilvl: 1 }
            ]
        },

        // --- CHEST-EXCLUSIVE: PRECISION ---
        // each correctly revealed cell gives
        // a stacking buff, all stacks lost on mistake. The chest is the
        // centrepiece slot so it's the right home for this high-skill,
        // high-reward puzzle modifier. The # value is the buff magnitude
        // per stack — the generator/runtime decides what the buff applies
        // to (damage, regen, crit) when the item rolls this mod.
        precision_damage: {
            id: 'precision_damage',
            label: 'Each correct cell grants a stack of Precision\n(+#% Damage per stack, lost on Mistake)', labelDe: 'Jede korrekte Zelle gewährt einen Präzisions-Stapel\n(+#% Schaden pro Stapel, geht bei einem Fehler verloren)',
            tiers: [
                { tier: 1, min: 2, max: 3, weight: 50, ilvl: 86 },
                { tier: 2, min: 1, max: 2, weight: 140, ilvl: 68 },
                { tier: 3, min: 1, max: 1, weight: 380, ilvl: 15 }
            ]
        },
        precision_regen: {
            id: 'precision_regen',
            label: 'Each correct cell grants a stack of Precision\n(+# Life Regenerated per second per stack, lost on Mistake)', labelDe: 'Jede korrekte Zelle gewährt einen Präzisions-Stapel\n(+# Lebensregeneration pro Sekunde pro Stapel, geht bei einem Fehler verloren)',
            tiers: [
                { tier: 1, min: 4, max: 6, weight: 60, ilvl: 84 },
                { tier: 2, min: 2, max: 3, weight: 160, ilvl: 65 },
                { tier: 3, min: 1, max: 1, weight: 400, ilvl: 15 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 10, max: 15, weight: 150, ilvl: 75 },
                { tier: 2, min: 5, max: 9, weight: 400, ilvl: 15 }
            ]
        }
    }
};




//------------------------------------------------------------------------
//-------------------BRACERS MODIFIER TABLE-------------------------------
//------------------------------------------------------------------------
// Bracers are wrist guards — the point where arm meets weapon. They are
// the melee-flavoured offensive slot: flat physical damage, crit chance
// and multiplier, and on-hit status effects (ignite/freeze/shock) all
// live here as either exclusives or primaries. Defence values are modest
// (smaller piece than helm/chest/shoulders) and comparable to the cloak.
// No block/dodge, no spell damage, no chain/splash/multishot/pushback,
// no absorption regen, no precision.

const EG_MOD_TABLE_BRACERS = {
    prefixes: {

        // --- LIFE & MANA ---
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 75, max: 95, weight: 100, ilvl: 80 },
                { tier: 2, min: 55, max: 74, weight: 250, ilvl: 65 },
                { tier: 3, min: 35, max: 54, weight: 500, ilvl: 45 },
                { tier: 4, min: 18, max: 34, weight: 1000, ilvl: 25 },
                { tier: 5, min: 6, max: 17, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 55, max: 70, weight: 100, ilvl: 80 },
                { tier: 2, min: 40, max: 54, weight: 250, ilvl: 65 },
                { tier: 3, min: 26, max: 39, weight: 500, ilvl: 45 },
                { tier: 4, min: 13, max: 25, weight: 1000, ilvl: 25 },
                { tier: 5, min: 4, max: 12, weight: 2000, ilvl: 1 }
            ]
        },

        // --- LOCAL DEFENSES ---
        // Smaller piece — values sit between cloak and chest.
        flat_armour: {
            id: 'flat_armour',
            label: '+# to Armour', labelDe: '+# zu Rüstung',
            tiers: [
                { tier: 1, min: 85, max: 125, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 84, weight: 300, ilvl: 60 },
                { tier: 3, min: 22, max: 49, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 21, weight: 1200, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 150, ilvl: 82 },
                { tier: 2, min: 45, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 44, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        flat_evasion: {
            id: 'flat_evasion',
            label: '+# to Evasion', labelDe: '+# zu Ausweichen',
            tiers: [
                { tier: 1, min: 85, max: 125, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 84, weight: 300, ilvl: 60 },
                { tier: 3, min: 22, max: 49, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 21, weight: 1200, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 150, ilvl: 82 },
                { tier: 2, min: 45, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 44, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        flat_absorption: {
            id: 'flat_absorption',
            label: '+# to Absorption', labelDe: '+# zu Absorption',
            tiers: [
                { tier: 1, min: 70, max: 100, weight: 150, ilvl: 82 },
                { tier: 2, min: 42, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 18, max: 41, weight: 600, ilvl: 30 },
                { tier: 4, min: 4, max: 17, weight: 1200, ilvl: 1 }
            ]
        },
        inc_absorption: {
            id: 'inc_absorption',
            label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 150, ilvl: 82 },
                { tier: 2, min: 45, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 44, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },

        // --- HYBRID LIFE / DEFENSE ---
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 32, max1: 42, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 22, max1: 31, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 12, max1: 21, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 11, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 32, max1: 42, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 22, max1: 31, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 12, max1: 21, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 11, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 32, max1: 42, min2: 28, max2: 44, weight: 100, ilvl: 78 },
                { tier: 2, min1: 22, max1: 31, min2: 16, max2: 27, weight: 250, ilvl: 50 },
                { tier: 3, min1: 12, max1: 21, min2: 8, max2: 15, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 11, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 22, max1: 30, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 15, max1: 21, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 8, max1: 14, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 3, max1: 7, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 22, max1: 30, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 15, max1: 21, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 8, max1: 14, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 3, max1: 7, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 22, max1: 30, min2: 28, max2: 44, weight: 100, ilvl: 78 },
                { tier: 2, min1: 15, max1: 21, min2: 16, max2: 27, weight: 250, ilvl: 50 },
                { tier: 3, min1: 8, max1: 14, min2: 8, max2: 15, weight: 500, ilvl: 25 },
                { tier: 4, min1: 3, max1: 7, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENSES ---
        hybrid_armour_evasion: {
            id: 'hybrid_armour_evasion',
            label: '+# to Armour\n+@ to Evasion', labelDe: '+# zu Rüstung\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 42, max1: 65, min2: 42, max2: 65, weight: 120, ilvl: 80 },
                { tier: 2, min1: 24, max1: 41, min2: 24, max2: 41, weight: 250, ilvl: 55 },
                { tier: 3, min1: 10, max1: 23, min2: 10, max2: 23, weight: 500, ilvl: 30 },
                { tier: 4, min1: 3, max1: 9, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 42, max1: 65, min2: 32, max2: 50, weight: 120, ilvl: 80 },
                { tier: 2, min1: 24, max1: 41, min2: 18, max2: 31, weight: 250, ilvl: 55 },
                { tier: 3, min1: 10, max1: 23, min2: 8, max2: 17, weight: 500, ilvl: 30 },
                { tier: 4, min1: 3, max1: 9, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 42, max1: 65, min2: 32, max2: 50, weight: 120, ilvl: 80 },
                { tier: 2, min1: 24, max1: 41, min2: 18, max2: 31, weight: 250, ilvl: 55 },
                { tier: 3, min1: 10, max1: 23, min2: 8, max2: 17, weight: 500, ilvl: 30 },
                { tier: 4, min1: 3, max1: 9, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },

        // --- BRACER-EXCLUSIVE: PHYSICAL DAMAGE ---
        // The most direct "arm strength" stat — bracers guide the blow.
        // Flat physical adds a fixed damage range to all attacks (melee
        // counterattack and ranged). The % multiplier scales everything
        // physical you already have, making it very powerful late game.
        flat_physical_damage: {
            id: 'flat_physical_damage',
            label: 'Adds # to @ Physical Damage', labelDe: 'Fügt # bis @ physischen Schaden hinzu',
            tiers: [
                { tier: 1, min1: 18, max1: 26, min2: 48, max2: 68, weight: 110, ilvl: 80 },
                { tier: 2, min1: 11, max1: 17, min2: 30, max2: 47, weight: 250, ilvl: 60 },
                { tier: 3, min1: 5, max1: 10, min2: 15, max2: 29, weight: 520, ilvl: 35 },
                { tier: 4, min1: 2, max1: 4, min2: 6, max2: 14, weight: 1050, ilvl: 8 }
            ]
        },
        inc_physical_damage: {
            id: 'inc_physical_damage',
            label: '#% increased Physical Damage', labelDe: '#% erhöhter physischer Schaden',
            tiers: [
                { tier: 1, min: 40, max: 55, weight: 90, ilvl: 82 },
                { tier: 2, min: 25, max: 39, weight: 220, ilvl: 62 },
                { tier: 3, min: 12, max: 24, weight: 500, ilvl: 38 },
                { tier: 4, min: 4, max: 11, weight: 1050, ilvl: 12 }
            ]
        },

        // --- BRACER-EXCLUSIVE: CRITICAL STRIKES ---
        // Bracers steady the hand and guide the killing blow.
        // Crit appears as a prefix here — on the amulet it was also a
        // prefix, so stacking both slots into crit is a deliberate build
        // path that costs prefix budget on two pieces.
        crit_chance: {
            id: 'crit_chance',
            label: '+#% Critical Strike Chance', labelDe: '+#% kritische Trefferchance',
            tiers: [
                { tier: 1, min: 5, max: 7, weight: 100, ilvl: 80 },
                { tier: 2, min: 3, max: 4, weight: 240, ilvl: 60 },
                { tier: 3, min: 2, max: 2, weight: 560, ilvl: 35 },
                { tier: 4, min: 1, max: 1, weight: 1100, ilvl: 10 }
            ]
        },
        crit_multiplier: {
            id: 'crit_multiplier',
            label: '+#% to Critical Strike Multiplier', labelDe: '+#% zum kritischen Schadensmultiplikator',
            tiers: [
                { tier: 1, min: 40, max: 55, weight: 80, ilvl: 82 },
                { tier: 2, min: 24, max: 39, weight: 190, ilvl: 62 },
                { tier: 3, min: 12, max: 23, weight: 430, ilvl: 40 },
                { tier: 4, min: 4, max: 11, weight: 950, ilvl: 15 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 45, max: 60, weight: 100, ilvl: 78 },
                { tier: 2, min: 30, max: 44, weight: 300, ilvl: 50 },
                { tier: 3, min: 15, max: 29, weight: 600, ilvl: 15 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },

        // --- REGEN & RECOVERY ---
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 16, max: 25, weight: 150, ilvl: 78 },
                { tier: 2, min: 11, max: 15, weight: 300, ilvl: 55 },
                { tier: 3, min: 6, max: 10, weight: 600, ilvl: 35 },
                { tier: 4, min: 3, max: 5, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2400, ilvl: 1 }
            ]
        },
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 25, max: 35, weight: 150, ilvl: 78 },
                { tier: 2, min: 16, max: 24, weight: 300, ilvl: 55 },
                { tier: 3, min: 10, max: 15, weight: 600, ilvl: 35 },
                { tier: 4, min: 5, max: 9, weight: 1200, ilvl: 15 },
                { tier: 5, min: 2, max: 4, weight: 2400, ilvl: 1 }
            ]
        },
        // Life leech as a suffix here — draining life through gauntlet
        // contact. Lower ceiling than the chest's prefix version since
        // this is a smaller piece and a suffix slot.
        life_leech: {
            id: 'life_leech',
            label: 'Gain #% of Damage dealt as Life', labelDe: 'Erhalte #% des verursachten Schadens als Leben',
            tiers: [
                { tier: 1, min: 2, max: 3, weight: 90, ilvl: 82 },
                { tier: 2, min: 1, max: 2, weight: 220, ilvl: 60 },
                { tier: 3, min: 0.5, max: 0.9, weight: 520, ilvl: 15 }
            ]
        },

        // --- RESISTANCES ---
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 31, max: 35, weight: 150, ilvl: 82 },
                { tier: 2, min: 26, max: 30, weight: 300, ilvl: 65 },
                { tier: 3, min: 16, max: 25, weight: 600, ilvl: 40 },
                { tier: 4, min: 5, max: 15, weight: 1200, ilvl: 15 }
            ]
        },

        // --- BRACER-EXCLUSIVE: ON-HIT STATUS EFFECTS ---
        // Delivered through direct arm/hand contact. Slightly higher values
        // than the amulet's enchanted versions — bracers ARE the point of
        // impact. Convert is absent here (that's shadow enchantment magic,
        // not raw physical contact), and blind lives on cloaks/amulets.
        chance_to_ignite: {
            id: 'chance_to_ignite',
            label: '#% Chance to Ignite on Hit', labelDe: '#% Chance auf Entzünden bei Treffer',
            tiers: [
                { tier: 1, min: 20, max: 28, weight: 110, ilvl: 80 },
                { tier: 2, min: 12, max: 19, weight: 270, ilvl: 58 },
                { tier: 3, min: 6, max: 11, weight: 580, ilvl: 32 },
                { tier: 4, min: 2, max: 5, weight: 1150, ilvl: 8 }
            ]
        },
        chance_to_freeze: {
            id: 'chance_to_freeze',
            label: '#% Chance to Freeze on Hit', labelDe: '#% Chance auf Einfrieren bei Treffer',
            tiers: [
                { tier: 1, min: 17, max: 24, weight: 110, ilvl: 80 },
                { tier: 2, min: 10, max: 16, weight: 270, ilvl: 58 },
                { tier: 3, min: 5, max: 9, weight: 580, ilvl: 32 },
                { tier: 4, min: 1, max: 4, weight: 1150, ilvl: 8 }
            ]
        },
        chance_to_shock: {
            id: 'chance_to_shock',
            label: '#% Chance to Shock on Hit', labelDe: '#% Chance auf Schock bei Treffer',
            tiers: [
                { tier: 1, min: 20, max: 28, weight: 110, ilvl: 80 },
                { tier: 2, min: 12, max: 19, weight: 270, ilvl: 58 },
                { tier: 3, min: 6, max: 11, weight: 580, ilvl: 32 },
                { tier: 4, min: 2, max: 5, weight: 1150, ilvl: 8 }
            ]
        },

        // --- ACCURACY ---
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 251, max: 400, weight: 150, ilvl: 80 },
                { tier: 2, min: 121, max: 250, weight: 300, ilvl: 60 },
                { tier: 3, min: 61, max: 120, weight: 600, ilvl: 40 },
                { tier: 4, min: 31, max: 60, weight: 1200, ilvl: 20 },
                { tier: 5, min: 10, max: 30, weight: 2400, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 10, max: 15, weight: 150, ilvl: 75 },
                { tier: 2, min: 5, max: 9, weight: 400, ilvl: 15 }
            ]
        }
    }
};

















//------------------------------------------------------------------------
//-------------------GLOVES MODIFIER TABLE--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//-------------------GLOVES MODIFIER TABLE--------------------------------
//------------------------------------------------------------------------
// Gloves are the hand-to-puzzle and hand-to-weapon interface. They share
// bracer-scale defences (modest flat values) and lean into accuracy,
// mana-on-kill, and life-leech as their offensive sustain flavour.
// Their exclusive identity is the quiz/puzzle interaction layer:
// reveal_hint (chance to show a hint on exercise questions) and
// chance_for_new_question (retry chance on failed quiz questions) only
// roll on gloves. Multishot also lives here as a prefix — the gloved
// hand that draws the extra arrow. No block/dodge, no pushback/overkill,
// no chain/splash, no spell damage multiplier, no crit, no status effect
// chance applications (those are bracers), no precision (that's chest).

const EG_MOD_TABLE_GLOVES = {
    prefixes: {

        // --- LIFE & MANA ---
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 75, max: 95, weight: 100, ilvl: 80 },
                { tier: 2, min: 55, max: 74, weight: 250, ilvl: 65 },
                { tier: 3, min: 35, max: 54, weight: 500, ilvl: 45 },
                { tier: 4, min: 18, max: 34, weight: 1000, ilvl: 25 },
                { tier: 5, min: 6, max: 17, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 55, max: 70, weight: 100, ilvl: 80 },
                { tier: 2, min: 40, max: 54, weight: 250, ilvl: 65 },
                { tier: 3, min: 26, max: 39, weight: 500, ilvl: 45 },
                { tier: 4, min: 13, max: 25, weight: 1000, ilvl: 25 },
                { tier: 5, min: 4, max: 12, weight: 2000, ilvl: 1 }
            ]
        },

        // --- LOCAL DEFENSES ---
        // Bracer-scale values — modest, not a primary defence slot.
        flat_armour: {
            id: 'flat_armour',
            label: '+# to Armour', labelDe: '+# zu Rüstung',
            tiers: [
                { tier: 1, min: 85, max: 125, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 84, weight: 300, ilvl: 60 },
                { tier: 3, min: 22, max: 49, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 21, weight: 1200, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 150, ilvl: 82 },
                { tier: 2, min: 45, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 44, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        flat_evasion: {
            id: 'flat_evasion',
            label: '+# to Evasion', labelDe: '+# zu Ausweichen',
            tiers: [
                { tier: 1, min: 85, max: 125, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 84, weight: 300, ilvl: 60 },
                { tier: 3, min: 22, max: 49, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 21, weight: 1200, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 150, ilvl: 82 },
                { tier: 2, min: 45, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 44, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        flat_absorption: {
            id: 'flat_absorption',
            label: '+# to Absorption', labelDe: '+# zu Absorption',
            tiers: [
                { tier: 1, min: 70, max: 100, weight: 150, ilvl: 82 },
                { tier: 2, min: 42, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 18, max: 41, weight: 600, ilvl: 30 },
                { tier: 4, min: 4, max: 17, weight: 1200, ilvl: 1 }
            ]
        },
        inc_absorption: {
            id: 'inc_absorption',
            label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 150, ilvl: 82 },
                { tier: 2, min: 45, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 44, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },

        // --- HYBRID LIFE / DEFENSE ---
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 32, max1: 42, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 22, max1: 31, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 12, max1: 21, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 11, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 32, max1: 42, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 22, max1: 31, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 12, max1: 21, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 11, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 32, max1: 42, min2: 28, max2: 44, weight: 100, ilvl: 78 },
                { tier: 2, min1: 22, max1: 31, min2: 16, max2: 27, weight: 250, ilvl: 50 },
                { tier: 3, min1: 12, max1: 21, min2: 8, max2: 15, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 11, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 22, max1: 30, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 15, max1: 21, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 8, max1: 14, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 3, max1: 7, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 22, max1: 30, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 15, max1: 21, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 8, max1: 14, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 3, max1: 7, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 22, max1: 30, min2: 28, max2: 44, weight: 100, ilvl: 78 },
                { tier: 2, min1: 15, max1: 21, min2: 16, max2: 27, weight: 250, ilvl: 50 },
                { tier: 3, min1: 8, max1: 14, min2: 8, max2: 15, weight: 500, ilvl: 25 },
                { tier: 4, min1: 3, max1: 7, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENSES ---
        hybrid_armour_evasion: {
            id: 'hybrid_armour_evasion',
            label: '+# to Armour\n+@ to Evasion', labelDe: '+# zu Rüstung\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 42, max1: 65, min2: 42, max2: 65, weight: 120, ilvl: 80 },
                { tier: 2, min1: 24, max1: 41, min2: 24, max2: 41, weight: 250, ilvl: 55 },
                { tier: 3, min1: 10, max1: 23, min2: 10, max2: 23, weight: 500, ilvl: 30 },
                { tier: 4, min1: 3, max1: 9, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 42, max1: 65, min2: 32, max2: 50, weight: 120, ilvl: 80 },
                { tier: 2, min1: 24, max1: 41, min2: 18, max2: 31, weight: 250, ilvl: 55 },
                { tier: 3, min1: 10, max1: 23, min2: 8, max2: 17, weight: 500, ilvl: 30 },
                { tier: 4, min1: 3, max1: 9, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 42, max1: 65, min2: 32, max2: 50, weight: 120, ilvl: 80 },
                { tier: 2, min1: 24, max1: 41, min2: 18, max2: 31, weight: 250, ilvl: 55 },
                { tier: 3, min1: 10, max1: 23, min2: 8, max2: 17, weight: 500, ilvl: 30 },
                { tier: 4, min1: 3, max1: 9, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },

        // --- GLOVES-EXCLUSIVE: LIFE LEECH (as prefix) ---
        // Bracers have leech as a suffix. Gloves carry it as a prefix,
        // making the two slots intentionally compete for the same budget
        // differently. The bare hand draws life through the grip.
        // Ceiling is slightly below bracers' suffix version — prefix slot
        // is more valuable budget-wise, so we keep the raw number a touch
        // lower to preserve balance across both pieces.
        life_leech: {
            id: 'life_leech',
            label: 'Gain #% of Damage dealt as Life', labelDe: 'Erhalte #% des verursachten Schadens als Leben',
            tiers: [
                { tier: 1, min: 1.8, max: 2.8, weight: 90, ilvl: 82 },
                { tier: 2, min: 1.0, max: 1.7, weight: 220, ilvl: 60 },
                { tier: 3, min: 0.4, max: 0.9, weight: 520, ilvl: 15 }
            ]
        },

        // --- GLOVES-EXCLUSIVE: MULTISHOT ---
        // The gloved hand that draws and nocks the extra arrow.
        // Cloak has multishot as a suffix. Gloves carry it as a prefix —
        // a deliberate counterpart that lets dedicated ranged builds stack
        // both pieces at a real cost to their prefix budgets.
        // Values are on par with cloak's suffix version.
        multishot: {
            id: 'multishot',
            label: '+#% Chance to fire an additional Projectile', labelDe: '+#% Chance auf ein zusätzliches Projektil',
            tiers: [
                { tier: 1, min: 22, max: 32, weight: 80, ilvl: 82 },
                { tier: 2, min: 13, max: 21, weight: 200, ilvl: 62 },
                { tier: 3, min: 6, max: 12, weight: 480, ilvl: 38 },
                { tier: 4, min: 2, max: 5, weight: 1000, ilvl: 12 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 45, max: 60, weight: 100, ilvl: 78 },
                { tier: 2, min: 30, max: 44, weight: 300, ilvl: 50 },
                { tier: 3, min: 15, max: 29, weight: 600, ilvl: 15 }
            ]
        },

        // --- GLOVES-EXCLUSIVE: QUIZ RETRY ---
        // The gloved hand that reaches for a fresh question card.
        // From player stats: "Chance to receive a new question after
        // failing a question." Exclusive to gloves — they interact with
        // the puzzle directly.
        chance_for_new_question: {
            id: 'chance_for_new_question',
            label: '#% Chance to receive a new Question after failing one', labelDe: '#% Chance, nach einer falschen Antwort eine neue Frage zu erhalten',
            tiers: [
                { tier: 1, min: 30, max: 40, weight: 60, ilvl: 84 },
                { tier: 2, min: 18, max: 29, weight: 160, ilvl: 65 },
                { tier: 3, min: 8, max: 17, weight: 380, ilvl: 40 },
                { tier: 4, min: 2, max: 7, weight: 850, ilvl: 15 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },

        // --- REGEN & RECOVERY ---
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 16, max: 25, weight: 150, ilvl: 78 },
                { tier: 2, min: 11, max: 15, weight: 300, ilvl: 55 },
                { tier: 3, min: 6, max: 10, weight: 600, ilvl: 35 },
                { tier: 4, min: 3, max: 5, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2400, ilvl: 1 }
            ]
        },
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 25, max: 35, weight: 150, ilvl: 78 },
                { tier: 2, min: 16, max: 24, weight: 300, ilvl: 55 },
                { tier: 3, min: 10, max: 15, weight: 600, ilvl: 35 },
                { tier: 4, min: 5, max: 9, weight: 1200, ilvl: 15 },
                { tier: 5, min: 2, max: 4, weight: 2400, ilvl: 1 }
            ]
        },

        // --- GLOVES-PRIMARY: MANA ON KILL ---
        // The finishing touch — the hand that delivers the killing blow
        // draws mana from the fallen enemy. Earring and chest have this
        // too, but it's a primary identity stat for gloves since it
        // rewards aggressive puzzle play and kill speed. Higher ceiling
        // than earring, on par with chest.
        mana_on_kill: {
            id: 'mana_on_kill',
            label: 'Gain # Mana on Kill', labelDe: 'Erhalte # Mana bei Kill',
            tiers: [
                { tier: 1, min: 18, max: 28, weight: 100, ilvl: 78 },
                { tier: 2, min: 11, max: 17, weight: 250, ilvl: 55 },
                { tier: 3, min: 5, max: 10, weight: 550, ilvl: 30 },
                { tier: 4, min: 2, max: 4, weight: 1100, ilvl: 1 }
            ]
        },

        // --- GLOVES-PRIMARY: ABSORPTION ON KILL ---
        // The gauntlet absorbs the struck enemy's vitality on death.
        // Gloves feel natural for kill-triggered effects, so this sits
        // here alongside mana_on_kill as a companion sustain stat.
        // Values match chest-suffix scale since the same logic applies.
        absorption_on_kill: {
            id: 'absorption_on_kill',
            label: 'Gain # Absorption on Kill', labelDe: 'Erhalte # Absorption bei Kill',
            tiers: [
                { tier: 1, min: 35, max: 50, weight: 100, ilvl: 80 },
                { tier: 2, min: 20, max: 34, weight: 250, ilvl: 58 },
                { tier: 3, min: 10, max: 19, weight: 550, ilvl: 32 },
                { tier: 4, min: 3, max: 9, weight: 1100, ilvl: 1 }
            ]
        },

        // --- GLOVES-PRIMARY: ACCURACY ---
        // The steady, gloved grip that guides every shot and swing.
        // Accuracy is a meaningful secondary identity here — bracers and
        // other armour slots have it as a minor suffix, but on gloves it
        // rolls with slightly better weights, making them a natural home
        // for accuracy-focused builds. Values identical to helmet/bracers.
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 251, max: 400, weight: 130, ilvl: 80 },
                { tier: 2, min: 121, max: 250, weight: 260, ilvl: 60 },
                { tier: 3, min: 61, max: 120, weight: 530, ilvl: 40 },
                { tier: 4, min: 31, max: 60, weight: 1050, ilvl: 20 },
                { tier: 5, min: 10, max: 30, weight: 2100, ilvl: 1 }
            ]
        },

        // --- RESISTANCES ---
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 31, max: 35, weight: 150, ilvl: 82 },
                { tier: 2, min: 26, max: 30, weight: 300, ilvl: 65 },
                { tier: 3, min: 16, max: 25, weight: 600, ilvl: 40 },
                { tier: 4, min: 5, max: 15, weight: 1200, ilvl: 15 }
            ]
        },

        // --- GLOVES-EXCLUSIVE: REVEAL HINT ---
        // From player stats: "chance to show reveal hint on exercise
        // questions." The gloved hand that reaches into the puzzle and
        // pulls back the corner of the answer. Gloves-only — the most
        // direct thematic fit for a piece that literally interfaces with
        // the puzzle grid. Very powerful for quiz modes so it's kept rare
        // and capped at 3 tiers.
        reveal_hint: {
            id: 'reveal_hint',
            label: '#% Chance to reveal a Hint on Exercise Questions', labelDe: '#% Chance, bei Übungsaufgaben einen Hinweis aufzudecken',
            tiers: [
                { tier: 1, min: 25, max: 35, weight: 50, ilvl: 84 },
                { tier: 2, min: 14, max: 24, weight: 140, ilvl: 65 },
                { tier: 3, min: 5, max: 13, weight: 360, ilvl: 15 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 10, max: 15, weight: 150, ilvl: 75 },
                { tier: 2, min: 5, max: 9, weight: 400, ilvl: 15 }
            ]
        }
    }
};


//------------------------------------------------------------------------
//-------------------BELT MODIFIER TABLE----------------------------------
//------------------------------------------------------------------------
// The belt girds the body — it is the premier sustain and vitality slot.
// It has the highest flat life values of any non-chest piece and the
// strongest heart_heal numbers in the game. The belt-exclusive
// inc_heart_heal (% multiplier on heart healing) makes it the
// centrepiece of any heart-focused sustain build. life_on_kill sits
// here as a natural partner to gloves' mana_on_kill — the belt absorbs
// the fallen enemy's vitality directly.
//
// Defences are modest (bracers/gloves scale) — a belt is not a major
// armour piece, but it does carry all three defence types since it wraps
// the whole torso. No block/dodge, no crit, no status effect chances,
// no chain/splash/multishot, no spell damage, no quiz exclusives, no
// pushback/overkill, no precision. Strength is the primary attribute
// here — a heavy belt implies physical bulk.

const EG_MOD_TABLE_BELT = {
    prefixes: {

        // --- LIFE & MANA ---
        // Belt has the highest flat life of any non-chest slot.
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 100, max: 125, weight: 100, ilvl: 80 },
                { tier: 2, min: 75, max: 99, weight: 250, ilvl: 65 },
                { tier: 3, min: 50, max: 74, weight: 500, ilvl: 45 },
                { tier: 4, min: 25, max: 49, weight: 1000, ilvl: 25 },
                { tier: 5, min: 8, max: 24, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 65, max: 82, weight: 100, ilvl: 80 },
                { tier: 2, min: 48, max: 64, weight: 250, ilvl: 65 },
                { tier: 3, min: 32, max: 47, weight: 500, ilvl: 45 },
                { tier: 4, min: 16, max: 31, weight: 1000, ilvl: 25 },
                { tier: 5, min: 5, max: 15, weight: 2000, ilvl: 1 }
            ]
        },

        // --- BELT-PRIMARY: HEART HEAL (flat) ---
        // Highest flat heart_heal values in the game. The belt is the
        // "flask slot" equivalent — it defines how well you recover.
        heart_heal: {
            id: 'heart_heal',
            label: 'Hearts heal for an additional # Health', labelDe: 'Herzen heilen zusätzlich um # Leben',
            tiers: [
                { tier: 1, min: 55, max: 70, weight: 150, ilvl: 75 },
                { tier: 2, min: 38, max: 54, weight: 320, ilvl: 50 },
                { tier: 3, min: 22, max: 37, weight: 650, ilvl: 28 },
                { tier: 4, min: 8, max: 21, weight: 1300, ilvl: 1 }
            ]
        },

        // --- BELT-EXCLUSIVE: INCREASED HEART HEAL (% multiplier) ---
        // A % multiplier on all heart healing received — stacks with the
        // flat heart_heal on belt, helmet, chest, amulet etc. The only
        // slot this rolls on. Dedicated heart builds will want both this
        // and a high flat heart_heal prefix, costing the full prefix budget.
        inc_heart_heal: {
            id: 'inc_heart_heal',
            label: '#% increased healing received from Hearts', labelDe: '#% erhöhte Heilung durch Herzen',
            tiers: [
                { tier: 1, min: 40, max: 55, weight: 70, ilvl: 84 },
                { tier: 2, min: 25, max: 39, weight: 180, ilvl: 65 },
                { tier: 3, min: 12, max: 24, weight: 420, ilvl: 40 },
                { tier: 4, min: 4, max: 11, weight: 950, ilvl: 15 }
            ]
        },

        // --- LOCAL DEFENSES ---
        // Modest values — bracers/gloves scale.
        flat_armour: {
            id: 'flat_armour',
            label: '+# to Armour', labelDe: '+# zu Rüstung',
            tiers: [
                { tier: 1, min: 85, max: 125, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 84, weight: 300, ilvl: 60 },
                { tier: 3, min: 22, max: 49, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 21, weight: 1200, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 150, ilvl: 82 },
                { tier: 2, min: 45, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 44, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        flat_evasion: {
            id: 'flat_evasion',
            label: '+# to Evasion', labelDe: '+# zu Ausweichen',
            tiers: [
                { tier: 1, min: 85, max: 125, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 84, weight: 300, ilvl: 60 },
                { tier: 3, min: 22, max: 49, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 21, weight: 1200, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 150, ilvl: 82 },
                { tier: 2, min: 45, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 44, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        flat_absorption: {
            id: 'flat_absorption',
            label: '+# to Absorption', labelDe: '+# zu Absorption',
            tiers: [
                { tier: 1, min: 70, max: 100, weight: 150, ilvl: 82 },
                { tier: 2, min: 42, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 18, max: 41, weight: 600, ilvl: 30 },
                { tier: 4, min: 4, max: 17, weight: 1200, ilvl: 1 }
            ]
        },
        inc_absorption: {
            id: 'inc_absorption',
            label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 150, ilvl: 82 },
                { tier: 2, min: 45, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 44, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },

        // --- HYBRID LIFE / DEFENSE ---
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 40, max1: 52, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 28, max1: 39, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 16, max1: 27, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 15, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 40, max1: 52, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 28, max1: 39, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 16, max1: 27, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 15, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 40, max1: 52, min2: 28, max2: 44, weight: 100, ilvl: 78 },
                { tier: 2, min1: 28, max1: 39, min2: 16, max2: 27, weight: 250, ilvl: 50 },
                { tier: 3, min1: 16, max1: 27, min2: 8, max2: 15, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 15, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 28, max1: 38, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 18, max1: 27, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 3, max1: 9, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 28, max1: 38, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 18, max1: 27, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 3, max1: 9, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 28, max1: 38, min2: 28, max2: 44, weight: 100, ilvl: 78 },
                { tier: 2, min1: 18, max1: 27, min2: 16, max2: 27, weight: 250, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 8, max2: 15, weight: 500, ilvl: 25 },
                { tier: 4, min1: 3, max1: 9, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENSES ---
        hybrid_armour_evasion: {
            id: 'hybrid_armour_evasion',
            label: '+# to Armour\n+@ to Evasion', labelDe: '+# zu Rüstung\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 42, max1: 65, min2: 42, max2: 65, weight: 120, ilvl: 80 },
                { tier: 2, min1: 24, max1: 41, min2: 24, max2: 41, weight: 250, ilvl: 55 },
                { tier: 3, min1: 10, max1: 23, min2: 10, max2: 23, weight: 500, ilvl: 30 },
                { tier: 4, min1: 3, max1: 9, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 42, max1: 65, min2: 32, max2: 50, weight: 120, ilvl: 80 },
                { tier: 2, min1: 24, max1: 41, min2: 18, max2: 31, weight: 250, ilvl: 55 },
                { tier: 3, min1: 10, max1: 23, min2: 8, max2: 17, weight: 500, ilvl: 30 },
                { tier: 4, min1: 3, max1: 9, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 42, max1: 65, min2: 32, max2: 50, weight: 120, ilvl: 80 },
                { tier: 2, min1: 24, max1: 41, min2: 18, max2: 31, weight: 250, ilvl: 55 },
                { tier: 3, min1: 10, max1: 23, min2: 8, max2: 17, weight: 500, ilvl: 30 },
                { tier: 4, min1: 3, max1: 9, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 45, max: 60, weight: 100, ilvl: 78 },
                { tier: 2, min: 30, max: 44, weight: 300, ilvl: 50 },
                { tier: 3, min: 15, max: 29, weight: 600, ilvl: 15 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        // Strength is the primary attribute for belts — a heavy buckled
        // belt implies raw physical bulk. It rolls with better weight
        // here than agility or intelligence.
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 160, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 320, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 650, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1300, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 2600, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },

        // --- REGEN & RECOVERY ---
        // life_regen is a primary stat for belts — best weights of any
        // armour slot. The belt "sustains" the body passively.
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 20, max: 30, weight: 120, ilvl: 78 },
                { tier: 2, min: 13, max: 19, weight: 250, ilvl: 55 },
                { tier: 3, min: 7, max: 12, weight: 520, ilvl: 35 },
                { tier: 4, min: 3, max: 6, weight: 1050, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2100, ilvl: 1 }
            ]
        },
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 25, max: 35, weight: 150, ilvl: 78 },
                { tier: 2, min: 16, max: 24, weight: 300, ilvl: 55 },
                { tier: 3, min: 10, max: 15, weight: 600, ilvl: 35 },
                { tier: 4, min: 5, max: 9, weight: 1200, ilvl: 15 },
                { tier: 5, min: 2, max: 4, weight: 2400, ilvl: 1 }
            ]
        },

        // --- BELT-EXCLUSIVE: LIFE ON KILL ---
        // The belt absorbs the fallen enemy's vitality directly —
        // the counterpart to gloves' mana_on_kill. Together they form
        // a kill-triggered sustain pair that rewards aggressive play.
        // Higher ceiling than mana_on_kill since life is more scarce.
        life_on_kill: {
            id: 'life_on_kill',
            label: 'Gain # Life on Kill', labelDe: 'Erhalte # Leben bei Kill',
            tiers: [
                { tier: 1, min: 30, max: 45, weight: 100, ilvl: 78 },
                { tier: 2, min: 18, max: 29, weight: 250, ilvl: 55 },
                { tier: 3, min: 9, max: 17, weight: 550, ilvl: 30 },
                { tier: 4, min: 3, max: 8, weight: 1100, ilvl: 1 }
            ]
        },

        // --- RESISTANCES ---
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 31, max: 35, weight: 150, ilvl: 82 },
                { tier: 2, min: 26, max: 30, weight: 300, ilvl: 65 },
                { tier: 3, min: 16, max: 25, weight: 600, ilvl: 40 },
                { tier: 4, min: 5, max: 15, weight: 1200, ilvl: 15 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 10, max: 15, weight: 150, ilvl: 75 },
                { tier: 2, min: 5, max: 9, weight: 400, ilvl: 15 }
            ]
        }
    }
};


//------------------------------------------------------------------------
//-------------------PANTS MODIFIER TABLE---------------------------------
//------------------------------------------------------------------------
// Pants are the lower body — legs carry the fighter forward. They sit
// between the belt (primary sustain) in thematic
// identity. Their defensive emphasis is evasion (you move your legs to
// avoid blows) while still offering all three defence types. Life values
// are belt-adjacent — a large piece that wraps the thighs and hips.
// Defences are bracer/gloves scale since the legs are less armoured
// than chest or shoulders.
//
// Pants-exclusive mods:
//   stagger — chance on hit to delay a monster's charge timer by briefly
//             staggering them (disrupting their footing). Similar in
//             concept to pushback (shoulders) but more volatile —
//             stagger is a short random interrupt rather than a fixed
//             pushback amount.
//   preemptive_dodge — chance to automatically dodge the very first
//                      attack from any monster that hasn't yet hit the
//                      player this map. The legs are coiled, ready.
//                      Resets per monster instance.
//
// No block/spell block (that's shoulders/chest), no crit, no status
// effect applications (bracers), no chain/splash/multishot (cloak/gloves),
// no spell damage (chest), no precision (chest), no quiz exclusives
// (gloves), no heart_heal multiplier (belt), no pushback/overkill
// (shoulders), no life_on_kill (belt-exclusive).

const EG_MOD_TABLE_PANTS = {
    prefixes: {

        // --- LIFE & MANA ---
        // Belt-adjacent flat life — a large lower-body piece.
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 95, max: 120, weight: 100, ilvl: 80 },
                { tier: 2, min: 70, max: 94, weight: 250, ilvl: 65 },
                { tier: 3, min: 45, max: 69, weight: 500, ilvl: 45 },
                { tier: 4, min: 22, max: 44, weight: 1000, ilvl: 25 },
                { tier: 5, min: 7, max: 21, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 62, max: 80, weight: 100, ilvl: 80 },
                { tier: 2, min: 46, max: 61, weight: 250, ilvl: 65 },
                { tier: 3, min: 30, max: 45, weight: 500, ilvl: 45 },
                { tier: 4, min: 15, max: 29, weight: 1000, ilvl: 25 },
                { tier: 5, min: 5, max: 14, weight: 2000, ilvl: 1 }
            ]
        },
        heart_heal: {
            id: 'heart_heal',
            label: 'Hearts heal for an additional # Health', labelDe: 'Herzen heilen zusätzlich um # Leben',
            tiers: [
                { tier: 1, min: 45, max: 58, weight: 200, ilvl: 75 },
                { tier: 2, min: 28, max: 44, weight: 400, ilvl: 40 },
                { tier: 3, min: 12, max: 27, weight: 800, ilvl: 10 }
            ]
        },

        // --- LOCAL DEFENSES ---
        // Evasion is the pants' primary defence — the legs evade.
        // Flat evasion values are slightly above bracer/gloves scale,
        // below the cloak's dedicated evasion numbers.
        flat_evasion: {
            id: 'flat_evasion',
            label: '+# to Evasion', labelDe: '+# zu Ausweichen',
            tiers: [
                { tier: 1, min: 100, max: 145, weight: 150, ilvl: 82 },
                { tier: 2, min: 62, max: 99, weight: 300, ilvl: 60 },
                { tier: 3, min: 28, max: 61, weight: 600, ilvl: 30 },
                { tier: 4, min: 6, max: 27, weight: 1200, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 75, max: 95, weight: 150, ilvl: 82 },
                { tier: 2, min: 48, max: 74, weight: 300, ilvl: 60 },
                { tier: 3, min: 22, max: 47, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 21, weight: 1200, ilvl: 1 }
            ]
        },
        flat_armour: {
            id: 'flat_armour',
            label: '+# to Armour', labelDe: '+# zu Rüstung',
            tiers: [
                { tier: 1, min: 85, max: 125, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 84, weight: 300, ilvl: 60 },
                { tier: 3, min: 22, max: 49, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 21, weight: 1200, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 150, ilvl: 82 },
                { tier: 2, min: 45, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 44, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        flat_absorption: {
            id: 'flat_absorption',
            label: '+# to Absorption', labelDe: '+# zu Absorption',
            tiers: [
                { tier: 1, min: 70, max: 100, weight: 150, ilvl: 82 },
                { tier: 2, min: 42, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 18, max: 41, weight: 600, ilvl: 30 },
                { tier: 4, min: 4, max: 17, weight: 1200, ilvl: 1 }
            ]
        },
        inc_absorption: {
            id: 'inc_absorption',
            label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 150, ilvl: 82 },
                { tier: 2, min: 45, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 44, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },

        // --- HYBRID LIFE / DEFENSE ---
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 38, max1: 50, min2: 45, max2: 65, weight: 100, ilvl: 78 },
                { tier: 2, min1: 26, max1: 37, min2: 28, max2: 44, weight: 250, ilvl: 50 },
                { tier: 3, min1: 14, max1: 25, min2: 12, max2: 27, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 13, min2: 4, max2: 11, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 26, max1: 36, min2: 45, max2: 65, weight: 100, ilvl: 78 },
                { tier: 2, min1: 17, max1: 25, min2: 28, max2: 44, weight: 250, ilvl: 50 },
                { tier: 3, min1: 9, max1: 16, min2: 12, max2: 27, weight: 500, ilvl: 25 },
                { tier: 4, min1: 3, max1: 8, min2: 4, max2: 11, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 38, max1: 50, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 26, max1: 37, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 14, max1: 25, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 13, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 26, max1: 36, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 17, max1: 25, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 9, max1: 16, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 3, max1: 8, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 38, max1: 50, min2: 28, max2: 44, weight: 100, ilvl: 78 },
                { tier: 2, min1: 26, max1: 37, min2: 16, max2: 27, weight: 250, ilvl: 50 },
                { tier: 3, min1: 14, max1: 25, min2: 8, max2: 15, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 13, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 26, max1: 36, min2: 28, max2: 44, weight: 100, ilvl: 78 },
                { tier: 2, min1: 17, max1: 25, min2: 16, max2: 27, weight: 250, ilvl: 50 },
                { tier: 3, min1: 9, max1: 16, min2: 8, max2: 15, weight: 500, ilvl: 25 },
                { tier: 4, min1: 3, max1: 8, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENSES ---
        // Evasion pairs are the premium hybrid — pants' primary stat.
        hybrid_evasion_armour: {
            id: 'hybrid_evasion_armour',
            label: '+# to Evasion\n+@ to Armour', labelDe: '+# zu Ausweichen\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 48, max1: 72, min2: 38, max2: 58, weight: 120, ilvl: 80 },
                { tier: 2, min1: 28, max1: 47, min2: 22, max2: 37, weight: 250, ilvl: 55 },
                { tier: 3, min1: 12, max1: 27, min2: 10, max2: 21, weight: 500, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 48, max1: 72, min2: 28, max2: 44, weight: 120, ilvl: 80 },
                { tier: 2, min1: 28, max1: 47, min2: 16, max2: 27, weight: 250, ilvl: 55 },
                { tier: 3, min1: 12, max1: 27, min2: 8, max2: 15, weight: 500, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 38, max1: 58, min2: 28, max2: 44, weight: 120, ilvl: 80 },
                { tier: 2, min1: 22, max1: 37, min2: 16, max2: 27, weight: 250, ilvl: 55 },
                { tier: 3, min1: 10, max1: 21, min2: 8, max2: 15, weight: 500, ilvl: 30 },
                { tier: 4, min1: 3, max1: 9, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 45, max: 60, weight: 100, ilvl: 78 },
                { tier: 2, min: 30, max: 44, weight: 300, ilvl: 50 },
                { tier: 3, min: 15, max: 29, weight: 600, ilvl: 15 }
            ]
        },

        // --- PANTS-EXCLUSIVE: STAGGER ---
        // A wide stance disrupts the monster's footing on impact —
        // each hit has a chance to stagger the target, freezing its
        // charge timer for a brief window before it resumes.
        // Distinct from shoulders' pushback (which always reduces the
        // timer by a fixed amount): stagger is a shorter guaranteed
        // window, useful for buying reaction time rather than raw delay.
        stagger: {
            id: 'stagger',
            label: '#% Chance to Stagger a Monster on Hit\n(Pauses their Charge Timer for 1 second)', labelDe: '#% Chance, ein Monster bei Treffer ins Wanken zu bringen\n(pausiert dessen Ansturm-Timer für 1 Sekunde)',
            tiers: [
                { tier: 1, min: 22, max: 30, weight: 80, ilvl: 84 },
                { tier: 2, min: 13, max: 21, weight: 200, ilvl: 63 },
                { tier: 3, min: 6, max: 12, weight: 460, ilvl: 38 },
                { tier: 4, min: 2, max: 5, weight: 1000, ilvl: 12 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        // Agility is the primary attribute for pants — nimble legs.
        // Rolls with better weight than strength or intelligence here.
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 160, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 320, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 650, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1300, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 2600, ilvl: 1 }
            ]
        },
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },

        // --- REGEN & RECOVERY ---
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 18, max: 28, weight: 150, ilvl: 78 },
                { tier: 2, min: 12, max: 17, weight: 300, ilvl: 55 },
                { tier: 3, min: 6, max: 11, weight: 600, ilvl: 35 },
                { tier: 4, min: 3, max: 5, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2400, ilvl: 1 }
            ]
        },
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 25, max: 35, weight: 150, ilvl: 78 },
                { tier: 2, min: 16, max: 24, weight: 300, ilvl: 55 },
                { tier: 3, min: 10, max: 15, weight: 600, ilvl: 35 },
                { tier: 4, min: 5, max: 9, weight: 1200, ilvl: 15 },
                { tier: 5, min: 2, max: 4, weight: 2400, ilvl: 1 }
            ]
        },

        // --- DODGE (pants' identity defence suffix) ---
        // The legs are what carry you out of harm's way. Pants get dodge
        // on par with cloak values — both are mobility-focused pieces,
        // but cloaks are the dedicated evasion slot so their flat evasion
        // numbers are still higher. Dodge values match cloak's suffix tier.
        dodge: {
            id: 'dodge',
            label: '+#% Chance to Dodge Attacks', labelDe: '+#% Chance, Angriffen auszuweichen',
            tiers: [
                { tier: 1, min: 8, max: 12, weight: 100, ilvl: 80 },
                { tier: 2, min: 5, max: 7, weight: 250, ilvl: 58 },
                { tier: 3, min: 3, max: 4, weight: 550, ilvl: 32 },
                { tier: 4, min: 1, max: 2, weight: 1100, ilvl: 8 }
            ]
        },
        spell_dodge: {
            id: 'spell_dodge',
            label: '+#% Chance to Dodge Spells', labelDe: '+#% Chance, Zaubern auszuweichen',
            tiers: [
                { tier: 1, min: 6, max: 9, weight: 80, ilvl: 82 },
                { tier: 2, min: 4, max: 5, weight: 200, ilvl: 60 },
                { tier: 3, min: 2, max: 3, weight: 450, ilvl: 35 },
                { tier: 4, min: 1, max: 1, weight: 1000, ilvl: 10 }
            ]
        },

        // --- RESISTANCES ---
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 31, max: 35, weight: 150, ilvl: 82 },
                { tier: 2, min: 26, max: 30, weight: 300, ilvl: 65 },
                { tier: 3, min: 16, max: 25, weight: 600, ilvl: 40 },
                { tier: 4, min: 5, max: 15, weight: 1200, ilvl: 15 }
            ]
        },

        // --- ACCURACY ---
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 251, max: 400, weight: 150, ilvl: 80 },
                { tier: 2, min: 121, max: 250, weight: 300, ilvl: 60 },
                { tier: 3, min: 61, max: 120, weight: 600, ilvl: 40 },
                { tier: 4, min: 31, max: 60, weight: 1200, ilvl: 20 },
                { tier: 5, min: 10, max: 30, weight: 2400, ilvl: 1 }
            ]
        },

        // --- PANTS-EXCLUSIVE: PREEMPTIVE DODGE ---
        // The legs are always coiled, reading an enemy's stance.
        // The first attack from any monster that hasn't yet struck the
        // player this encounter is automatically dodged — a reactive
        // reflex that rewards aggression (you engage first, you dodge
        // their opening blow). Resets per-monster, not per-map.
        // Kept as a chance rather than guaranteed to preserve tension.
        preemptive_dodge: {
            id: 'preemptive_dodge',
            label: '#% Chance to automatically Dodge the first Attack from each Monster', labelDe: '#% Chance, dem ersten Angriff jedes Monsters automatisch auszuweichen',
            tiers: [
                { tier: 1, min: 35, max: 50, weight: 70, ilvl: 84 },
                { tier: 2, min: 20, max: 34, weight: 180, ilvl: 65 },
                { tier: 3, min: 8, max: 19, weight: 420, ilvl: 40 },
                { tier: 4, min: 2, max: 7, weight: 950, ilvl: 15 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 10, max: 15, weight: 150, ilvl: 75 },
                { tier: 2, min: 5, max: 9, weight: 400, ilvl: 15 }
            ]
        }
    }
};

//------------------------------------------------------------------------
//-------------------BOOTS MODIFIER TABLE---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//-------------------BOOTS MODIFIER TABLE---------------------------------
//------------------------------------------------------------------------
// Boots are solid, grounded footwear — they are about stability and
// readiness rather than mobility. Their primary defence is armour
// (hard soles, reinforced toe caps) rather than evasion (that's pants
// and cloaks). Life values are slightly below pants — boots are a
// smaller piece. Defences sit at bracer/gloves scale.
//
// Boots-exclusive mods:
//   grounded — when a monster's charge attack lands, there is a chance
//              the damage is reduced by a flat amount. Your planted feet
//              brace the impact. Distinct from block (full negation with
//              downtime), dodge (full avoidance, random), and armour
//              (always-on reduction) — grounded only fires on charge
//              hits specifically, but the reduction is significant.
//   first_step — at the start of each map, monsters do not charge for
//                the first # seconds. Your boots carry you into the
//                fight before enemies find their footing. A powerful
//                opener stat that rewards fast early play.
//
// No block/dodge (those are shoulders/chest/cloak/pants), no crit,
// no status effects (bracers), no chain/splash/multishot (cloak/gloves),
// no spell damage (chest), no precision (chest), no quiz exclusives
// (gloves), no stagger/preemptive_dodge (pants), no heart_heal
// multiplier (belt), no pushback/overkill (shoulders).

const EG_MOD_TABLE_BOOTS = {
    prefixes: {

        // --- LIFE & MANA ---
        // Slightly below pants scale — boots are a smaller piece.
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 85, max: 108, weight: 100, ilvl: 80 },
                { tier: 2, min: 62, max: 84, weight: 250, ilvl: 65 },
                { tier: 3, min: 40, max: 61, weight: 500, ilvl: 45 },
                { tier: 4, min: 20, max: 39, weight: 1000, ilvl: 25 },
                { tier: 5, min: 6, max: 19, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 55, max: 72, weight: 100, ilvl: 80 },
                { tier: 2, min: 40, max: 54, weight: 250, ilvl: 65 },
                { tier: 3, min: 26, max: 39, weight: 500, ilvl: 45 },
                { tier: 4, min: 13, max: 25, weight: 1000, ilvl: 25 },
                { tier: 5, min: 4, max: 12, weight: 2000, ilvl: 1 }
            ]
        },
        heart_heal: {
            id: 'heart_heal',
            label: 'Hearts heal for an additional # Health', labelDe: 'Herzen heilen zusätzlich um # Leben',
            tiers: [
                { tier: 1, min: 38, max: 52, weight: 200, ilvl: 75 },
                { tier: 2, min: 24, max: 37, weight: 400, ilvl: 40 },
                { tier: 3, min: 10, max: 23, weight: 800, ilvl: 10 }
            ]
        },

        // --- LOCAL DEFENSES ---
        // Armour is the boots' primary defence — hard soles and
        // reinforced construction. Slightly above bracer/gloves scale,
        // below chest/shoulders.
        flat_armour: {
            id: 'flat_armour',
            label: '+# to Armour', labelDe: '+# zu Rüstung',
            tiers: [
                { tier: 1, min: 95, max: 138, weight: 150, ilvl: 82 },
                { tier: 2, min: 58, max: 94, weight: 300, ilvl: 60 },
                { tier: 3, min: 26, max: 57, weight: 600, ilvl: 30 },
                { tier: 4, min: 6, max: 25, weight: 1200, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 75, max: 95, weight: 150, ilvl: 82 },
                { tier: 2, min: 48, max: 74, weight: 300, ilvl: 60 },
                { tier: 3, min: 22, max: 47, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 21, weight: 1200, ilvl: 1 }
            ]
        },
        flat_evasion: {
            id: 'flat_evasion',
            label: '+# to Evasion', labelDe: '+# zu Ausweichen',
            tiers: [
                { tier: 1, min: 85, max: 125, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 84, weight: 300, ilvl: 60 },
                { tier: 3, min: 22, max: 49, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 21, weight: 1200, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 150, ilvl: 82 },
                { tier: 2, min: 45, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 44, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        flat_absorption: {
            id: 'flat_absorption',
            label: '+# to Absorption', labelDe: '+# zu Absorption',
            tiers: [
                { tier: 1, min: 70, max: 100, weight: 150, ilvl: 82 },
                { tier: 2, min: 42, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 18, max: 41, weight: 600, ilvl: 30 },
                { tier: 4, min: 4, max: 17, weight: 1200, ilvl: 1 }
            ]
        },
        inc_absorption: {
            id: 'inc_absorption',
            label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 150, ilvl: 82 },
                { tier: 2, min: 45, max: 69, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 44, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },

        // --- HYBRID LIFE / DEFENSE ---
        // Armour pairs are the premium hybrid on boots.
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 34, max1: 45, min2: 42, max2: 62, weight: 100, ilvl: 78 },
                { tier: 2, min1: 22, max1: 33, min2: 24, max2: 41, weight: 250, ilvl: 50 },
                { tier: 3, min1: 12, max1: 21, min2: 11, max2: 23, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 11, min2: 3, max2: 10, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 23, max1: 32, min2: 42, max2: 62, weight: 100, ilvl: 78 },
                { tier: 2, min1: 15, max1: 22, min2: 24, max2: 41, weight: 250, ilvl: 50 },
                { tier: 3, min1: 8, max1: 14, min2: 11, max2: 23, weight: 500, ilvl: 25 },
                { tier: 4, min1: 2, max1: 7, min2: 3, max2: 10, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 34, max1: 45, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 22, max1: 33, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 12, max1: 21, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 11, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 23, max1: 32, min2: 38, max2: 58, weight: 100, ilvl: 78 },
                { tier: 2, min1: 15, max1: 22, min2: 22, max2: 37, weight: 250, ilvl: 50 },
                { tier: 3, min1: 8, max1: 14, min2: 10, max2: 21, weight: 500, ilvl: 25 },
                { tier: 4, min1: 2, max1: 7, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 34, max1: 45, min2: 28, max2: 44, weight: 100, ilvl: 78 },
                { tier: 2, min1: 22, max1: 33, min2: 16, max2: 27, weight: 250, ilvl: 50 },
                { tier: 3, min1: 12, max1: 21, min2: 8, max2: 15, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 11, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 23, max1: 32, min2: 28, max2: 44, weight: 100, ilvl: 78 },
                { tier: 2, min1: 15, max1: 22, min2: 16, max2: 27, weight: 250, ilvl: 50 },
                { tier: 3, min1: 8, max1: 14, min2: 8, max2: 15, weight: 500, ilvl: 25 },
                { tier: 4, min1: 2, max1: 7, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENSES ---
        // Armour pairs are premium here — boots' primary stat.
        hybrid_armour_evasion: {
            id: 'hybrid_armour_evasion',
            label: '+# to Armour\n+@ to Evasion', labelDe: '+# zu Rüstung\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 48, max1: 72, min2: 38, max2: 58, weight: 120, ilvl: 80 },
                { tier: 2, min1: 28, max1: 47, min2: 22, max2: 37, weight: 250, ilvl: 55 },
                { tier: 3, min1: 12, max1: 27, min2: 10, max2: 21, weight: 500, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 48, max1: 72, min2: 28, max2: 44, weight: 120, ilvl: 80 },
                { tier: 2, min1: 28, max1: 47, min2: 16, max2: 27, weight: 250, ilvl: 55 },
                { tier: 3, min1: 12, max1: 27, min2: 8, max2: 15, weight: 500, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 38, max1: 58, min2: 28, max2: 44, weight: 120, ilvl: 80 },
                { tier: 2, min1: 22, max1: 37, min2: 16, max2: 27, weight: 250, ilvl: 55 },
                { tier: 3, min1: 10, max1: 21, min2: 8, max2: 15, weight: 500, ilvl: 30 },
                { tier: 4, min1: 3, max1: 9, min2: 2, max2: 7, weight: 1000, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 45, max: 60, weight: 100, ilvl: 78 },
                { tier: 2, min: 30, max: 44, weight: 300, ilvl: 50 },
                { tier: 3, min: 15, max: 29, weight: 600, ilvl: 15 }
            ]
        },

        // --- BOOTS-EXCLUSIVE: GROUNDED ---
        // Planted feet brace a monster's charge impact — when a charge
        // attack lands, there is a chance the damage is reduced by a
        // flat amount. Unlike armour (always-on, scales with value) and
        // block (full negation with a recovery downside), grounded is a
        // probabilistic partial reduction that fires specifically on
        // charge hits. Most threatening damage in the game comes from
        // charges, so even a moderate reduction has real value.
        grounded: {
            id: 'grounded',
            label: '#% Chance to reduce incoming Charge damage by @%', labelDe: '#% Chance, eingehenden Ansturm-Schaden um @% zu verringern',
            tiers: [
                { tier: 1, min: 35, max: 50, min2: 40, max2: 55, weight: 80, ilvl: 84 },
                { tier: 2, min: 22, max: 34, min2: 26, max2: 39, weight: 200, ilvl: 63 },
                { tier: 3, min: 10, max: 21, min2: 14, max2: 25, weight: 460, ilvl: 38 },
                { tier: 4, min: 3, max: 9, min2: 6, max2: 13, weight: 1000, ilvl: 12 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        // Strength is primary for boots — solid, planted, heavy footwear.
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 160, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 320, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 650, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1300, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 2600, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },

        // --- REGEN & RECOVERY ---
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 16, max: 25, weight: 150, ilvl: 78 },
                { tier: 2, min: 11, max: 15, weight: 300, ilvl: 55 },
                { tier: 3, min: 6, max: 10, weight: 600, ilvl: 35 },
                { tier: 4, min: 3, max: 5, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2400, ilvl: 1 }
            ]
        },
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 25, max: 35, weight: 150, ilvl: 78 },
                { tier: 2, min: 16, max: 24, weight: 300, ilvl: 55 },
                { tier: 3, min: 10, max: 15, weight: 600, ilvl: 35 },
                { tier: 4, min: 5, max: 9, weight: 1200, ilvl: 15 },
                { tier: 5, min: 2, max: 4, weight: 2400, ilvl: 1 }
            ]
        },

        // --- RESISTANCES ---
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 31, max: 35, weight: 150, ilvl: 82 },
                { tier: 2, min: 26, max: 30, weight: 300, ilvl: 65 },
                { tier: 3, min: 16, max: 25, weight: 600, ilvl: 40 },
                { tier: 4, min: 5, max: 15, weight: 1200, ilvl: 15 }
            ]
        },

        // --- ACCURACY ---
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 251, max: 400, weight: 150, ilvl: 80 },
                { tier: 2, min: 121, max: 250, weight: 300, ilvl: 60 },
                { tier: 3, min: 61, max: 120, weight: 600, ilvl: 40 },
                { tier: 4, min: 31, max: 60, weight: 1200, ilvl: 20 },
                { tier: 5, min: 10, max: 30, weight: 2400, ilvl: 1 }
            ]
        },

        // --- BOOTS-EXCLUSIVE: FIRST STEP ---
        // Your boots carry you into the fight before enemies have found
        // their footing. At the start of each map, monsters do not begin
        // charging for the first # seconds — a window to deal damage
        // freely and establish an early lead. Rewards players who engage
        // aggressively from the opening cell. Does not stack with multiple
        // boots (only one boot slot), but pairs naturally with grounded
        // for a full charge-disruption build.
        first_step: {
            id: 'first_step',
            label: 'Monsters do not Charge for the first # seconds of each Map', labelDe: 'Monster führen in den ersten # Sekunden jeder Karte keinen Ansturm durch',
            tiers: [
                { tier: 1, min: 12, max: 18, weight: 70, ilvl: 84 },
                { tier: 2, min: 7, max: 11, weight: 180, ilvl: 65 },
                { tier: 3, min: 3, max: 6, weight: 420, ilvl: 40 },
                { tier: 4, min: 1, max: 2, weight: 950, ilvl: 15 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 10, max: 15, weight: 150, ilvl: 75 },
                { tier: 2, min: 5, max: 9, weight: 400, ilvl: 15 }
            ]
        }
    }
};

//------------------------------------------------------------------------
//-------------------RING MODIFIER TABLE----------------------------------
//------------------------------------------------------------------------
// Shared between ring1 and ring2

// Rings are magical conduits in permanent skin contact — always active,
// always channelling. They are pure stat jewelry with no local defences
// (no armour/evasion/absorption). Values sit between earring and amulet
// scale — rings are significant but the amulet remains the prestige slot.
// Both ring slots (ring1, ring2) share this table, making it possible
// to double up on any mod at the cost of two ring slots.
//
// Ring-exclusive mods:
//   mana_on_mistake — the ring pulses with energy when you err,
//                     converting the mistake into a mana surge. A
//                     risk/reward mod that softens mistake punishment
//                     and rewards builds that can afford to make them.
//                     Pairs naturally with mistake_count and focus.
//   echo — a % chance that damage dealt resonates through the ring,
//          firing a delayed second hit for a fraction of the original
//          damage. Stacking two rings with echo lets both proc
//          independently — a genuine build-enabling double-ring path.
//
// No local defences, no block/dodge, no spell damage multiplier,
// no precision, no quiz exclusives, no heart_heal multiplier,
// no pushback/overkill/stagger/grounded/first_step, no chain/splash,
// no multishot. Elemental damage, crit, and status effects are absent
// here — those are amulet and bracer/weapon territory. Rings focus on
// resource sustain, attributes, resistances, and their two unique
// passive-trigger exclusives.

const EG_MOD_TABLE_RING = {
    prefixes: {

        // --- LIFE & MANA ---
        // Between earring and amulet scale.
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 65, max: 84, weight: 100, ilvl: 80 },
                { tier: 2, min: 48, max: 64, weight: 250, ilvl: 65 },
                { tier: 3, min: 32, max: 47, weight: 500, ilvl: 45 },
                { tier: 4, min: 16, max: 31, weight: 1000, ilvl: 25 },
                { tier: 5, min: 5, max: 15, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 48, max: 62, weight: 100, ilvl: 80 },
                { tier: 2, min: 34, max: 47, weight: 250, ilvl: 65 },
                { tier: 3, min: 22, max: 33, weight: 500, ilvl: 45 },
                { tier: 4, min: 11, max: 21, weight: 1000, ilvl: 25 },
                { tier: 5, min: 3, max: 10, weight: 2000, ilvl: 1 }
            ]
        },
        heart_heal: {
            id: 'heart_heal',
            label: 'Hearts heal for an additional # Health', labelDe: 'Herzen heilen zusätzlich um # Leben',
            tiers: [
                { tier: 1, min: 32, max: 42, weight: 200, ilvl: 75 },
                { tier: 2, min: 20, max: 31, weight: 400, ilvl: 40 },
                { tier: 3, min: 8, max: 19, weight: 800, ilvl: 10 }
            ]
        },

        // --- LEECH ---
        // Rings channel life back through skin contact on every hit.
        life_leech: {
            id: 'life_leech',
            label: 'Gain #% of Damage dealt as Life', labelDe: 'Erhalte #% des verursachten Schadens als Leben',
            tiers: [
                { tier: 1, min: 2, max: 3, weight: 80, ilvl: 82 },
                { tier: 2, min: 1, max: 2, weight: 200, ilvl: 60 },
                { tier: 3, min: 0.5, max: 0.9, weight: 500, ilvl: 15 }
            ]
        },

        // --- FLAT ELEMENTAL DAMAGE ---
        // Rings as elemental foci — smaller values than amulet since
        // they're a secondary jewelry slot, but two rings can stack.
        fire_damage: {
            id: 'fire_damage',
            label: 'Adds # to @ Fire Damage', labelDe: 'Fügt # bis @ Feuerschaden hinzu',
            tiers: [
                { tier: 1, min1: 14, max1: 22, min2: 40, max2: 58, weight: 120, ilvl: 80 },
                { tier: 2, min1: 8, max1: 13, min2: 25, max2: 39, weight: 250, ilvl: 60 },
                { tier: 3, min1: 4, max1: 7, min2: 12, max2: 24, weight: 500, ilvl: 35 },
                { tier: 4, min1: 1, max1: 3, min2: 5, max2: 11, weight: 1000, ilvl: 10 }
            ]
        },
        cold_damage: {
            id: 'cold_damage',
            label: 'Adds # to @ Cold Damage', labelDe: 'Fügt # bis @ Kälteschaden hinzu',
            tiers: [
                { tier: 1, min1: 12, max1: 20, min2: 36, max2: 52, weight: 120, ilvl: 80 },
                { tier: 2, min1: 7, max1: 11, min2: 22, max2: 35, weight: 250, ilvl: 60 },
                { tier: 3, min1: 3, max1: 6, min2: 11, max2: 21, weight: 500, ilvl: 35 },
                { tier: 4, min1: 1, max1: 2, min2: 4, max2: 10, weight: 1000, ilvl: 10 }
            ]
        },
        lightning_damage: {
            id: 'lightning_damage',
            label: 'Adds # to @ Lightning Damage', labelDe: 'Fügt # bis @ Blitzschaden hinzu',
            tiers: [
                { tier: 1, min1: 3, max1: 9, min2: 44, max2: 68, weight: 120, ilvl: 80 },
                { tier: 2, min1: 2, max1: 6, min2: 28, max2: 43, weight: 250, ilvl: 60 },
                { tier: 3, min1: 1, max1: 4, min2: 14, max2: 27, weight: 500, ilvl: 35 },
                { tier: 4, min1: 1, max1: 2, min2: 6, max2: 13, weight: 1000, ilvl: 10 }
            ]
        },
        shadow_damage: {
            id: 'shadow_damage',
            label: 'Adds # to @ Shadow Damage', labelDe: 'Fügt # bis @ Schattenschaden hinzu',
            tiers: [
                { tier: 1, min1: 10, max1: 16, min2: 28, max2: 44, weight: 80, ilvl: 82 },
                { tier: 2, min1: 6, max1: 9, min2: 17, max2: 27, weight: 180, ilvl: 62 },
                { tier: 3, min1: 3, max1: 5, min2: 8, max2: 16, weight: 380, ilvl: 38 },
                { tier: 4, min1: 1, max1: 2, min2: 3, max2: 7, weight: 800, ilvl: 12 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 32, max: 42, weight: 100, ilvl: 78 },
                { tier: 2, min: 20, max: 31, weight: 300, ilvl: 50 },
                { tier: 3, min: 9, max: 19, weight: 600, ilvl: 15 }
            ]
        },

        // --- RING-EXCLUSIVE: MANA ON MISTAKE ---
        // The ring pulses with captured energy when you err — converting
        // the penalty of a mistake into a mana surge. A risk/reward mod
        // that rewards builds built around absorbing mistakes rather than
        // avoiding them. Pairs naturally with mistake_count (more chances
        // to trigger) and focus (mistakes cost less time, so you can
        // afford to lean into this). Two rings with this mod let both
        // fire independently per mistake.
        mana_on_mistake: {
            id: 'mana_on_mistake',
            label: 'Gain # Mana when you make a Mistake', labelDe: 'Erhalte # Mana, wenn du einen Fehler machst',
            tiers: [
                { tier: 1, min: 40, max: 58, weight: 80, ilvl: 82 },
                { tier: 2, min: 24, max: 39, weight: 200, ilvl: 62 },
                { tier: 3, min: 11, max: 23, weight: 460, ilvl: 38 },
                { tier: 4, min: 3, max: 10, weight: 1000, ilvl: 12 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 36, max: 44, weight: 200, ilvl: 80 },
                { tier: 2, min: 28, max: 35, weight: 400, ilvl: 65 },
                { tier: 3, min: 19, max: 27, weight: 800, ilvl: 45 },
                { tier: 4, min: 10, max: 18, weight: 1600, ilvl: 20 },
                { tier: 5, min: 3, max: 9, weight: 3200, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 36, max: 44, weight: 200, ilvl: 80 },
                { tier: 2, min: 28, max: 35, weight: 400, ilvl: 65 },
                { tier: 3, min: 19, max: 27, weight: 800, ilvl: 45 },
                { tier: 4, min: 10, max: 18, weight: 1600, ilvl: 20 },
                { tier: 5, min: 3, max: 9, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 36, max: 44, weight: 200, ilvl: 80 },
                { tier: 2, min: 28, max: 35, weight: 400, ilvl: 65 },
                { tier: 3, min: 19, max: 27, weight: 800, ilvl: 45 },
                { tier: 4, min: 10, max: 18, weight: 1600, ilvl: 20 },
                { tier: 5, min: 3, max: 9, weight: 3200, ilvl: 1 }
            ]
        },

        // --- REGEN & RECOVERY ---
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 12, max: 19, weight: 150, ilvl: 78 },
                { tier: 2, min: 8, max: 11, weight: 300, ilvl: 55 },
                { tier: 3, min: 4, max: 7, weight: 600, ilvl: 35 },
                { tier: 4, min: 2, max: 3, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 1, weight: 2400, ilvl: 1 }
            ]
        },
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 20, max: 28, weight: 150, ilvl: 78 },
                { tier: 2, min: 12, max: 19, weight: 300, ilvl: 55 },
                { tier: 3, min: 7, max: 11, weight: 600, ilvl: 35 },
                { tier: 4, min: 3, max: 6, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2400, ilvl: 1 }
            ]
        },
        mana_on_kill: {
            id: 'mana_on_kill',
            label: 'Gain # Mana on Kill', labelDe: 'Erhalte # Mana bei Kill',
            tiers: [
                { tier: 1, min: 14, max: 22, weight: 100, ilvl: 78 },
                { tier: 2, min: 8, max: 13, weight: 250, ilvl: 55 },
                { tier: 3, min: 4, max: 7, weight: 550, ilvl: 30 },
                { tier: 4, min: 1, max: 3, weight: 1100, ilvl: 1 }
            ]
        },
        absorption_on_kill: {
            id: 'absorption_on_kill',
            label: 'Gain # Absorption on Kill', labelDe: 'Erhalte # Absorption bei Kill',
            tiers: [
                { tier: 1, min: 18, max: 28, weight: 100, ilvl: 80 },
                { tier: 2, min: 10, max: 17, weight: 250, ilvl: 58 },
                { tier: 3, min: 5, max: 9, weight: 550, ilvl: 32 },
                { tier: 4, min: 2, max: 4, weight: 1100, ilvl: 1 }
            ]
        },

        // --- RESISTANCES ---
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 38, max: 44, weight: 250, ilvl: 80 },
                { tier: 2, min: 29, max: 37, weight: 500, ilvl: 60 },
                { tier: 3, min: 18, max: 28, weight: 1000, ilvl: 35 },
                { tier: 4, min: 9, max: 17, weight: 2000, ilvl: 15 },
                { tier: 5, min: 3, max: 8, weight: 4000, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 38, max: 44, weight: 250, ilvl: 80 },
                { tier: 2, min: 29, max: 37, weight: 500, ilvl: 60 },
                { tier: 3, min: 18, max: 28, weight: 1000, ilvl: 35 },
                { tier: 4, min: 9, max: 17, weight: 2000, ilvl: 15 },
                { tier: 5, min: 3, max: 8, weight: 4000, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 38, max: 44, weight: 250, ilvl: 80 },
                { tier: 2, min: 29, max: 37, weight: 500, ilvl: 60 },
                { tier: 3, min: 18, max: 28, weight: 1000, ilvl: 35 },
                { tier: 4, min: 9, max: 17, weight: 2000, ilvl: 15 },
                { tier: 5, min: 3, max: 8, weight: 4000, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 26, max: 32, weight: 150, ilvl: 82 },
                { tier: 2, min: 19, max: 25, weight: 300, ilvl: 65 },
                { tier: 3, min: 11, max: 18, weight: 600, ilvl: 40 },
                { tier: 4, min: 4, max: 10, weight: 1200, ilvl: 15 }
            ]
        },

        // --- ACCURACY ---
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 151, max: 250, weight: 150, ilvl: 80 },
                { tier: 2, min: 81, max: 150, weight: 300, ilvl: 60 },
                { tier: 3, min: 41, max: 80, weight: 600, ilvl: 40 },
                { tier: 4, min: 16, max: 40, weight: 1200, ilvl: 20 },
                { tier: 5, min: 5, max: 15, weight: 2400, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 8, max: 12, weight: 150, ilvl: 75 },
                { tier: 2, min: 3, max: 7, weight: 400, ilvl: 15 }
            ]
        },

        // --- RING-EXCLUSIVE: ECHO ---
        // The ring resonates with each blow — a % chance that damage
        // dealt fires a delayed second instance for a fraction of the
        // original hit. The echo hits independently and can trigger its
        // own on-hit effects (leech, status chances from bracers, etc).
        // Two rings with echo proc independently, making it a genuine
        // double-ring build path at significant suffix budget cost.
        // The # value is the echo damage as a % of the original hit.
        echo: {
            id: 'echo',
            label: '#% Chance for Hits to Echo for @% of their Damage', labelDe: '#% Chance, dass Treffer mit @% ihres Schadens nachhallen',
            tiers: [
                { tier: 1, min: 25, max: 35, min2: 35, max2: 50, weight: 60, ilvl: 85 },
                { tier: 2, min: 16, max: 24, min2: 22, max2: 34, weight: 160, ilvl: 66 },
                { tier: 3, min: 8, max: 15, min2: 12, max2: 21, weight: 380, ilvl: 42 },
                { tier: 4, min: 2, max: 7, min2: 5, max2: 11, weight: 880, ilvl: 15 }
            ]
        }
    }
};

//------------------------------------------------------------------------
//-------------------ARCANE MODIFIER TABLE--------------------------------
//------------------------------------------------------------------------
// The Arcane slot holds a sigil — an inscribed mark of invoked power.
// It is an offensive magical utility slot: it bends combat rules rather
// than simply adding stats. Mana is its primary resource; damage
// amplification and mana-fuelled effects are its output identity.
// No local defences. Values sit at amulet/ring scale.
//
// Arcane-exclusive mods:
//   arcane_surge — after a streak of # consecutive correct cells with
//                  no mistake, the sigil fires and grants a burst of
//                  mana. Rewards precision and focus. The streak counter
//                  resets on any mistake. Pairs naturally with precision
//                  (chest) for builds that reward long mistake-free runs.
//   mana_to_damage — a % of your current mana is added as flat bonus
//                    damage to your next hit, then that mana is consumed.
//                    A high-risk, high-reward conversion: hoarding mana
//                    for a single empowered strike. Pairs with high mana
//                    pool builds (flat_mana, mana_regen across slots).
//
// No block/dodge, no local defences, no precision (chest), no quiz
// exclusives (gloves), no heart_heal multiplier (belt), no charge
// interaction mods (boots/pants/shoulders), no echo (rings).

const EG_MOD_TABLE_ARCANE = {
    prefixes: {

        // --- MANA (primary resource for this slot) ---
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 55, max: 72, weight: 100, ilvl: 80 },
                { tier: 2, min: 38, max: 54, weight: 250, ilvl: 65 },
                { tier: 3, min: 24, max: 37, weight: 500, ilvl: 45 },
                { tier: 4, min: 12, max: 23, weight: 1000, ilvl: 25 },
                { tier: 5, min: 4, max: 11, weight: 2000, ilvl: 1 }
            ]
        },
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 60, max: 78, weight: 100, ilvl: 80 },
                { tier: 2, min: 44, max: 59, weight: 250, ilvl: 65 },
                { tier: 3, min: 28, max: 43, weight: 500, ilvl: 45 },
                { tier: 4, min: 14, max: 27, weight: 1000, ilvl: 25 },
                { tier: 5, min: 4, max: 13, weight: 2000, ilvl: 1 }
            ]
        },

        // --- SPELL DAMAGE ---
        // The sigil amplifies class ability power directly.
        spell_damage: {
            id: 'spell_damage',
            label: '+# to Spell Damage', labelDe: '+# zu Zauberschaden',
            tiers: [
                { tier: 1, min: 60, max: 80, weight: 100, ilvl: 80 },
                { tier: 2, min: 38, max: 59, weight: 250, ilvl: 60 },
                { tier: 3, min: 20, max: 37, weight: 500, ilvl: 38 },
                { tier: 4, min: 8, max: 19, weight: 1000, ilvl: 15 },
                { tier: 5, min: 2, max: 7, weight: 2000, ilvl: 1 }
            ]
        },
        inc_spell_damage: {
            id: 'inc_spell_damage',
            label: '#% increased Spell Damage', labelDe: '#% erhöhter Zauberschaden',
            tiers: [
                { tier: 1, min: 30, max: 44, weight: 80, ilvl: 82 },
                { tier: 2, min: 18, max: 29, weight: 200, ilvl: 62 },
                { tier: 3, min: 8, max: 17, weight: 460, ilvl: 38 },
                { tier: 4, min: 2, max: 7, weight: 1000, ilvl: 14 }
            ]
        },

        // --- ELEMENTAL DAMAGE ---
        // Sigils channel raw elemental force — slightly below amulet
        // values since the arcane slot is more utility than raw offense.
        fire_damage: {
            id: 'fire_damage',
            label: 'Adds # to @ Fire Damage', labelDe: 'Fügt # bis @ Feuerschaden hinzu',
            tiers: [
                { tier: 1, min1: 16, max1: 24, min2: 44, max2: 62, weight: 110, ilvl: 80 },
                { tier: 2, min1: 10, max1: 15, min2: 28, max2: 43, weight: 240, ilvl: 60 },
                { tier: 3, min1: 5, max1: 9, min2: 14, max2: 27, weight: 490, ilvl: 35 },
                { tier: 4, min1: 2, max1: 4, min2: 6, max2: 13, weight: 980, ilvl: 10 }
            ]
        },
        cold_damage: {
            id: 'cold_damage',
            label: 'Adds # to @ Cold Damage', labelDe: 'Fügt # bis @ Kälteschaden hinzu',
            tiers: [
                { tier: 1, min1: 14, max1: 22, min2: 40, max2: 56, weight: 110, ilvl: 80 },
                { tier: 2, min1: 8, max1: 13, min2: 25, max2: 39, weight: 240, ilvl: 60 },
                { tier: 3, min1: 4, max1: 7, min2: 12, max2: 24, weight: 490, ilvl: 35 },
                { tier: 4, min1: 1, max1: 3, min2: 5, max2: 11, weight: 980, ilvl: 10 }
            ]
        },
        lightning_damage: {
            id: 'lightning_damage',
            label: 'Adds # to @ Lightning Damage', labelDe: 'Fügt # bis @ Blitzschaden hinzu',
            tiers: [
                { tier: 1, min1: 4, max1: 10, min2: 48, max2: 74, weight: 110, ilvl: 80 },
                { tier: 2, min1: 2, max1: 7, min2: 30, max2: 47, weight: 240, ilvl: 60 },
                { tier: 3, min1: 1, max1: 4, min2: 15, max2: 29, weight: 490, ilvl: 35 },
                { tier: 4, min1: 1, max1: 2, min2: 6, max2: 14, weight: 980, ilvl: 10 }
            ]
        },
        shadow_damage: {
            id: 'shadow_damage',
            label: 'Adds # to @ Shadow Damage', labelDe: 'Fügt # bis @ Schattenschaden hinzu',
            tiers: [
                { tier: 1, min1: 12, max1: 18, min2: 32, max2: 50, weight: 75, ilvl: 82 },
                { tier: 2, min1: 7, max1: 11, min2: 20, max2: 31, weight: 170, ilvl: 62 },
                { tier: 3, min1: 3, max1: 6, min2: 9, max2: 19, weight: 360, ilvl: 38 },
                { tier: 4, min1: 1, max1: 2, min2: 3, max2: 8, weight: 780, ilvl: 12 }
            ]
        },

        // --- CRITICAL STRIKES ---
        crit_chance: {
            id: 'crit_chance',
            label: '+#% Critical Strike Chance', labelDe: '+#% kritische Trefferchance',
            tiers: [
                { tier: 1, min: 5, max: 7, weight: 100, ilvl: 80 },
                { tier: 2, min: 3, max: 4, weight: 220, ilvl: 60 },
                { tier: 3, min: 2, max: 2, weight: 500, ilvl: 35 },
                { tier: 4, min: 1, max: 1, weight: 1000, ilvl: 10 }
            ]
        },
        crit_multiplier: {
            id: 'crit_multiplier',
            label: '+#% to Critical Strike Multiplier', labelDe: '+#% zum kritischen Schadensmultiplikator',
            tiers: [
                { tier: 1, min: 40, max: 55, weight: 80, ilvl: 82 },
                { tier: 2, min: 24, max: 39, weight: 190, ilvl: 62 },
                { tier: 3, min: 12, max: 23, weight: 430, ilvl: 40 },
                { tier: 4, min: 4, max: 11, weight: 950, ilvl: 15 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 32, max: 42, weight: 100, ilvl: 78 },
                { tier: 2, min: 20, max: 31, weight: 300, ilvl: 50 },
                { tier: 3, min: 9, max: 19, weight: 600, ilvl: 15 }
            ]
        },

        // --- ARCANE-EXCLUSIVE: ARCANE SURGE ---
        // After a streak of # consecutive correct cells without a
        // mistake, the sigil ignites and grants a burst of mana.
        // The streak counter resets on any mistake. The # value is
        // the streak length required; the @ value is the mana granted.
        // Shorter streaks on higher tiers — rarer items fire sooner.
        // Pairs naturally with precision (chest) and focus (many slots)
        // for builds that thrive on long mistake-free runs.
        arcane_surge: {
            id: 'arcane_surge',
            label: 'After # consecutive correct cells, gain @ Mana', labelDe: 'Nach # aufeinanderfolgenden korrekten Zellen erhältst du @ Mana',
            tiers: [
                { tier: 1, min: 5, max: 5, min2: 80, max2: 110, weight: 70, ilvl: 84 },
                { tier: 2, min: 7, max: 7, min2: 55, max2: 79, weight: 180, ilvl: 65 },
                { tier: 3, min: 10, max: 10, min2: 32, max2: 54, weight: 420, ilvl: 40 },
                { tier: 4, min: 15, max: 15, min2: 15, max2: 31, weight: 950, ilvl: 15 }
            ]
        },

        // --- ARCANE-EXCLUSIVE: MANA TO DAMAGE ---
        // A % of your current mana is converted to flat bonus damage
        // on your next hit, consuming that mana in the process.
        // Rewards hoarding mana for an empowered strike. High mana
        // pool builds (stacking flat_mana and mana_regen across slots)
        // get the most out of this — the conversion fires once per hit
        // and recharges as mana refills. The # value is the conversion %.
        mana_to_damage: {
            id: 'mana_to_damage',
            label: '#% of current Mana added as Damage on next Hit\n(that Mana is then consumed)', labelDe: '#% des aktuellen Manas werden dem nächsten Treffer als Schaden hinzugefügt\n(dieses Mana wird danach verbraucht)',
            tiers: [
                { tier: 1, min: 18, max: 25, weight: 70, ilvl: 84 },
                { tier: 2, min: 11, max: 17, weight: 180, ilvl: 65 },
                { tier: 3, min: 5, max: 10, weight: 420, ilvl: 40 },
                { tier: 4, min: 2, max: 4, weight: 950, ilvl: 15 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 36, max: 44, weight: 200, ilvl: 80 },
                { tier: 2, min: 28, max: 35, weight: 400, ilvl: 65 },
                { tier: 3, min: 19, max: 27, weight: 800, ilvl: 45 },
                { tier: 4, min: 10, max: 18, weight: 1600, ilvl: 20 },
                { tier: 5, min: 3, max: 9, weight: 3200, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 36, max: 44, weight: 200, ilvl: 80 },
                { tier: 2, min: 28, max: 35, weight: 400, ilvl: 65 },
                { tier: 3, min: 19, max: 27, weight: 800, ilvl: 45 },
                { tier: 4, min: 10, max: 18, weight: 1600, ilvl: 20 },
                { tier: 5, min: 3, max: 9, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 36, max: 44, weight: 200, ilvl: 80 },
                { tier: 2, min: 28, max: 35, weight: 400, ilvl: 65 },
                { tier: 3, min: 19, max: 27, weight: 800, ilvl: 45 },
                { tier: 4, min: 10, max: 18, weight: 1600, ilvl: 20 },
                { tier: 5, min: 3, max: 9, weight: 3200, ilvl: 1 }
            ]
        },

        // --- REGEN & RECOVERY ---
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 22, max: 32, weight: 130, ilvl: 78 },
                { tier: 2, min: 14, max: 21, weight: 270, ilvl: 55 },
                { tier: 3, min: 8, max: 13, weight: 550, ilvl: 35 },
                { tier: 4, min: 3, max: 7, weight: 1100, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2200, ilvl: 1 }
            ]
        },
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 12, max: 19, weight: 150, ilvl: 78 },
                { tier: 2, min: 8, max: 11, weight: 300, ilvl: 55 },
                { tier: 3, min: 4, max: 7, weight: 600, ilvl: 35 },
                { tier: 4, min: 2, max: 3, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 1, weight: 2400, ilvl: 1 }
            ]
        },
        life_leech: {
            id: 'life_leech',
            label: 'Gain #% of Damage dealt as Life', labelDe: 'Erhalte #% des verursachten Schadens als Leben',
            tiers: [
                { tier: 1, min: 2, max: 3, weight: 80, ilvl: 82 },
                { tier: 2, min: 1, max: 2, weight: 200, ilvl: 60 },
                { tier: 3, min: 0.5, max: 0.9, weight: 500, ilvl: 15 }
            ]
        },

        // --- RESISTANCES ---
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 38, max: 44, weight: 250, ilvl: 80 },
                { tier: 2, min: 29, max: 37, weight: 500, ilvl: 60 },
                { tier: 3, min: 18, max: 28, weight: 1000, ilvl: 35 },
                { tier: 4, min: 9, max: 17, weight: 2000, ilvl: 15 },
                { tier: 5, min: 3, max: 8, weight: 4000, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 38, max: 44, weight: 250, ilvl: 80 },
                { tier: 2, min: 29, max: 37, weight: 500, ilvl: 60 },
                { tier: 3, min: 18, max: 28, weight: 1000, ilvl: 35 },
                { tier: 4, min: 9, max: 17, weight: 2000, ilvl: 15 },
                { tier: 5, min: 3, max: 8, weight: 4000, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 38, max: 44, weight: 250, ilvl: 80 },
                { tier: 2, min: 29, max: 37, weight: 500, ilvl: 60 },
                { tier: 3, min: 18, max: 28, weight: 1000, ilvl: 35 },
                { tier: 4, min: 9, max: 17, weight: 2000, ilvl: 15 },
                { tier: 5, min: 3, max: 8, weight: 4000, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 26, max: 32, weight: 150, ilvl: 82 },
                { tier: 2, min: 19, max: 25, weight: 300, ilvl: 65 },
                { tier: 3, min: 11, max: 18, weight: 600, ilvl: 40 },
                { tier: 4, min: 4, max: 10, weight: 1200, ilvl: 15 }
            ]
        },

        // --- ACCURACY ---
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 151, max: 250, weight: 150, ilvl: 80 },
                { tier: 2, min: 81, max: 150, weight: 300, ilvl: 60 },
                { tier: 3, min: 41, max: 80, weight: 600, ilvl: 40 },
                { tier: 4, min: 16, max: 40, weight: 1200, ilvl: 20 },
                { tier: 5, min: 5, max: 15, weight: 2400, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 8, max: 12, weight: 150, ilvl: 75 },
                { tier: 2, min: 3, max: 7, weight: 400, ilvl: 15 }
            ]
        }
    }
};




//------------------------------------------------------------------------
//-------------------TALISMAN MODIFIER TABLE------------------------------
//------------------------------------------------------------------------
// The Talisman is a carried ward — a protective charm that bends
// survival rules rather than amplifying offense. It is the defensive
// magical utility slot: fate manipulation, elemental warding, and
// death prevention are its identity. No local defences. Values sit
// at amulet/ring scale, leaning slightly more defensive.
//
// Talisman-exclusive mods:
//   arcane_resistance — flat reduction to ALL elemental damage received
//                       (fire, cold, lightning, shadow) simultaneously.
//                       Unique mechanic — every other resistance mod in
//                       the game is element-specific. A single talisman
//                       mod that shores up every element at once, at a
//                       lower value than any single resist could reach.
//   warding — once per map, the talisman absorbs a killing blow and
//             leaves you at # health instead of dying. Resets each map.
//             The rarest and most powerful survival mod in the game.
//             Only one talisman slot exists so it cannot be doubled up.
//   fate — % chance to completely negate any incoming hit. More random
//          than block (deterministic with downtime) and dodge (evasion-
//          based) — fate is pure luck, but it applies to everything
//          including charge hits, spells, and attacks with no downside
//          on proc. Low chances kept intentionally to prevent it
//          trivialising combat.
//
// No local defences, no offense mods, no crit, no elemental damage
// added, no spell damage, no quiz exclusives, no precision, no echo,
// no arcane_surge, no mana_to_damage.

const EG_MOD_TABLE_TALISMAN = {
    prefixes: {

        // --- LIFE (primary for a protective charm) ---
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 70, max: 90, weight: 100, ilvl: 80 },
                { tier: 2, min: 50, max: 69, weight: 250, ilvl: 65 },
                { tier: 3, min: 32, max: 49, weight: 500, ilvl: 45 },
                { tier: 4, min: 16, max: 31, weight: 1000, ilvl: 25 },
                { tier: 5, min: 5, max: 15, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 50, max: 64, weight: 100, ilvl: 80 },
                { tier: 2, min: 35, max: 49, weight: 250, ilvl: 65 },
                { tier: 3, min: 22, max: 34, weight: 500, ilvl: 45 },
                { tier: 4, min: 10, max: 21, weight: 1000, ilvl: 25 },
                { tier: 5, min: 3, max: 9, weight: 2000, ilvl: 1 }
            ]
        },
        heart_heal: {
            id: 'heart_heal',
            label: 'Hearts heal for an additional # Health', labelDe: 'Herzen heilen zusätzlich um # Leben',
            tiers: [
                { tier: 1, min: 34, max: 46, weight: 200, ilvl: 75 },
                { tier: 2, min: 21, max: 33, weight: 400, ilvl: 40 },
                { tier: 3, min: 9, max: 20, weight: 800, ilvl: 10 }
            ]
        },

        // --- TALISMAN-EXCLUSIVE: ARCANE RESISTANCE ---
        // A flat reduction applied to all elemental damage types at once
        // (fire, cold, lightning, shadow). Every other resistance mod in
        // the game targets a single element. This trades raw per-element
        // ceiling for universal coverage — invaluable for builds that
        // struggle to cap multiple resistances simultaneously.
        // The # value is the flat damage reduced per hit per element.
        arcane_resistance: {
            id: 'arcane_resistance',
            label: 'Reduce all Elemental Damage taken by #', labelDe: 'Verringert allen erlittenen Elementarschaden um #',
            tiers: [
                { tier: 1, min: 18, max: 25, weight: 70, ilvl: 84 },
                { tier: 2, min: 11, max: 17, weight: 180, ilvl: 65 },
                { tier: 3, min: 5, max: 10, weight: 420, ilvl: 40 },
                { tier: 4, min: 2, max: 4, weight: 950, ilvl: 15 }
            ]
        },

        // --- TALISMAN-EXCLUSIVE: WARDING ---
        // Once per map, when an incoming hit would reduce your health
        // to zero or below, the talisman absorbs the blow and leaves
        // you at # health instead. The ward shatters and does not
        // refresh until the next map begins. The rarest survival mod
        // in the game — kept to very low weights and high ilvl floors.
        // The # value is the health you're left with after the ward fires.
        warding: {
            id: 'warding',
            label: 'Once per Map, survive a killing blow with # Health remaining', labelDe: 'Einmal pro Karte überlebst du einen tödlichen Treffer mit # Restleben',
            tiers: [
                { tier: 1, min: 80, max: 120, weight: 30, ilvl: 88 },
                { tier: 2, min: 40, max: 79, weight: 90, ilvl: 72 },
                { tier: 3, min: 15, max: 39, weight: 240, ilvl: 55 },
                { tier: 4, min: 1, max: 14, weight: 600, ilvl: 15 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 32, max: 42, weight: 100, ilvl: 78 },
                { tier: 2, min: 20, max: 31, weight: 300, ilvl: 50 },
                { tier: 3, min: 9, max: 19, weight: 600, ilvl: 15 }
            ]
        },
        mistake_not_count: {
            id: 'mistake_not_count',
            label: '#% Chance for Mistakes to not Count', labelDe: '#% Chance, dass Fehler nicht gewertet werden',
            tiers: [
                { tier: 1, min: 12, max: 18, weight: 40, ilvl: 85 },
                { tier: 2, min: 6, max: 11, weight: 120, ilvl: 65 },
                { tier: 3, min: 2, max: 5, weight: 350, ilvl: 15 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 36, max: 44, weight: 200, ilvl: 80 },
                { tier: 2, min: 28, max: 35, weight: 400, ilvl: 65 },
                { tier: 3, min: 19, max: 27, weight: 800, ilvl: 45 },
                { tier: 4, min: 10, max: 18, weight: 1600, ilvl: 20 },
                { tier: 5, min: 3, max: 9, weight: 3200, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 36, max: 44, weight: 200, ilvl: 80 },
                { tier: 2, min: 28, max: 35, weight: 400, ilvl: 65 },
                { tier: 3, min: 19, max: 27, weight: 800, ilvl: 45 },
                { tier: 4, min: 10, max: 18, weight: 1600, ilvl: 20 },
                { tier: 5, min: 3, max: 9, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 36, max: 44, weight: 200, ilvl: 80 },
                { tier: 2, min: 28, max: 35, weight: 400, ilvl: 65 },
                { tier: 3, min: 19, max: 27, weight: 800, ilvl: 45 },
                { tier: 4, min: 10, max: 18, weight: 1600, ilvl: 20 },
                { tier: 5, min: 3, max: 9, weight: 3200, ilvl: 1 }
            ]
        },

        // --- REGEN & RECOVERY ---
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 14, max: 22, weight: 130, ilvl: 78 },
                { tier: 2, min: 9, max: 13, weight: 270, ilvl: 55 },
                { tier: 3, min: 5, max: 8, weight: 550, ilvl: 35 },
                { tier: 4, min: 2, max: 4, weight: 1100, ilvl: 15 },
                { tier: 5, min: 1, max: 1, weight: 2200, ilvl: 1 }
            ]
        },
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 20, max: 28, weight: 150, ilvl: 78 },
                { tier: 2, min: 12, max: 19, weight: 300, ilvl: 55 },
                { tier: 3, min: 7, max: 11, weight: 600, ilvl: 35 },
                { tier: 4, min: 3, max: 6, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2400, ilvl: 1 }
            ]
        },
        absorption_on_kill: {
            id: 'absorption_on_kill',
            label: 'Gain # Absorption on Kill', labelDe: 'Erhalte # Absorption bei Kill',
            tiers: [
                { tier: 1, min: 18, max: 28, weight: 100, ilvl: 80 },
                { tier: 2, min: 10, max: 17, weight: 250, ilvl: 58 },
                { tier: 3, min: 5, max: 9, weight: 550, ilvl: 32 },
                { tier: 4, min: 2, max: 4, weight: 1100, ilvl: 1 }
            ]
        },

        // --- RESISTANCES ---
        // All four elements represented — the talisman wards against
        // everything. Slightly better weights than other jewelry since
        // resistance is this slot's primary defensive identity.
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 40, max: 46, weight: 220, ilvl: 80 },
                { tier: 2, min: 30, max: 39, weight: 440, ilvl: 60 },
                { tier: 3, min: 19, max: 29, weight: 880, ilvl: 35 },
                { tier: 4, min: 9, max: 18, weight: 1760, ilvl: 15 },
                { tier: 5, min: 3, max: 8, weight: 3520, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 40, max: 46, weight: 220, ilvl: 80 },
                { tier: 2, min: 30, max: 39, weight: 440, ilvl: 60 },
                { tier: 3, min: 19, max: 29, weight: 880, ilvl: 35 },
                { tier: 4, min: 9, max: 18, weight: 1760, ilvl: 15 },
                { tier: 5, min: 3, max: 8, weight: 3520, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 40, max: 46, weight: 220, ilvl: 80 },
                { tier: 2, min: 30, max: 39, weight: 440, ilvl: 60 },
                { tier: 3, min: 19, max: 29, weight: 880, ilvl: 35 },
                { tier: 4, min: 9, max: 18, weight: 1760, ilvl: 15 },
                { tier: 5, min: 3, max: 8, weight: 3520, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 28, max: 34, weight: 130, ilvl: 82 },
                { tier: 2, min: 20, max: 27, weight: 270, ilvl: 65 },
                { tier: 3, min: 12, max: 19, weight: 540, ilvl: 40 },
                { tier: 4, min: 4, max: 11, weight: 1080, ilvl: 15 }
            ]
        },

        // --- TALISMAN-EXCLUSIVE: FATE ---
        // Pure luck woven into the charm — a % chance that any incoming
        // hit is simply negated entirely. No downtime, no resource cost,
        // no element restriction. Applies to attacks, spells, and charge
        // hits equally. Deliberately kept at low % values — fate is a
        // background whisper of protection, not a reliable mechanic.
        // Pairs with warding for the ultimate survival-focused talisman.
        fate: {
            id: 'fate',
            label: '#% Chance to negate any incoming Hit', labelDe: '#% Chance, einen beliebigen eingehenden Treffer zu negieren',
            tiers: [
                { tier: 1, min: 8, max: 12, weight: 60, ilvl: 86 },
                { tier: 2, min: 4, max: 7, weight: 160, ilvl: 68 },
                { tier: 3, min: 2, max: 3, weight: 400, ilvl: 46 },
                { tier: 4, min: 1, max: 1, weight: 950, ilvl: 15 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 8, max: 12, weight: 150, ilvl: 75 },
                { tier: 2, min: 3, max: 7, weight: 400, ilvl: 15 }
            ]
        }
    }
};

//------------------------------------------------------------------------
//-------------------WEAPON 1 (MAIN HAND / MELEE) MODIFIER TABLE----------
//------------------------------------------------------------------------
// The melee weapon is the primary offensive slot for the auto-strike
// system. Every X seconds the player automatically charges the targeted
// monster and lands a melee strike — the weapon defines how often this
// happens (attack_speed) and how hard it hits (physical damage, elemental
// damage, crit). Projectiles from cell reveals fire independently.
//
// Attack speed is expressed as seconds reduced from the base strike
// cooldown — higher values mean more frequent strikes.
//
// Physical and elemental damage values are the highest of any equipment
// slot since this is the dedicated melee damage piece. Bracers add flat
// physical/elemental to ALL hits (including projectiles); the weapon's
// damage only applies to melee strikes, so the ceiling is set higher
// to compensate for the narrower trigger condition.
//
// Status effect chances are higher than bracers for the same reason:
// bracers proc on every cell reveal, the weapon only procs on the
// periodic auto-strike. Higher per-hit chance, lower total frequency.
//
// Cleave is weapon-exclusive: a sweeping strike that hits all monsters
// sharing the same spawn location as the target.
//
// No local armour/evasion/absorption (weapon slot never grants those).
// No block/dodge, no puzzle utility beyond the standard set, no spell
// damage, no precision, no quiz exclusives, no absorption regen.
// Accuracy applies here — melee strikes can miss.

const EG_MOD_TABLE_WEAPON1 = {
    prefixes: {

        // --- ATTACK SPEED ---
        // The defining stat of the melee weapon slot — reduces the
        // cooldown between auto-strikes. The # value is seconds removed
        // from the base cooldown. Stacking multiple attack speed sources
        // from weapon + passive tree creates a meaningful build path.
        // Kept as a prefix so it competes with physical/elemental damage
        // for budget — you can't have everything.
        attack_speed: {
            id: 'attack_speed',
            label: 'Melee Strikes occur #s more often', labelDe: 'Nahkampfschläge erfolgen #s häufiger',
            tiers: [
                { tier: 1, min: 1.8, max: 2.5, weight: 80, ilvl: 82 },
                { tier: 2, min: 1.1, max: 1.7, weight: 200, ilvl: 62 },
                { tier: 3, min: 0.5, max: 1.0, weight: 460, ilvl: 38 },
                { tier: 4, min: 0.2, max: 0.4, weight: 1000, ilvl: 1 }
            ]
        },

        // --- FLAT PHYSICAL DAMAGE ---
        // The weapon's raw cutting or blunt force — a fixed damage range
        // added to every melee strike. Higher ceiling than bracers since
        // this is the dedicated melee slot and strikes fire less often
        // than cell reveals.
        flat_physical_damage: {
            id: 'flat_physical_damage',
            label: 'Adds # to @ Physical Damage to Melee Strikes', labelDe: 'Fügt Nahkampfschlägen # bis @ physischen Schaden hinzu',
            tiers: [
                { tier: 1, min1: 28, max1: 40, min2: 75, max2: 105, weight: 110, ilvl: 80 },
                { tier: 2, min1: 17, max1: 27, min2: 48, max2: 74, weight: 250, ilvl: 60 },
                { tier: 3, min1: 8, max1: 16, min2: 24, max2: 47, weight: 520, ilvl: 35 },
                { tier: 4, min1: 3, max1: 7, min2: 10, max2: 23, weight: 1050, ilvl: 1 }
            ]
        },

        // --- % INCREASED PHYSICAL DAMAGE ---
        // Scales all physical damage on strikes — the more flat physical
        // you have from weapon, bracers, and passives, the more valuable
        // this becomes. A multiplier prefix competing with attack_speed
        // and elemental damage for prefix slots creates meaningful choices.
        inc_physical_damage: {
            id: 'inc_physical_damage',
            label: '#% increased Physical Damage', labelDe: '#% erhöhter physischer Schaden',
            tiers: [
                { tier: 1, min: 55, max: 75, weight: 90, ilvl: 82 },
                { tier: 2, min: 35, max: 54, weight: 220, ilvl: 62 },
                { tier: 3, min: 18, max: 34, weight: 500, ilvl: 38 },
                { tier: 4, min: 6, max: 17, weight: 1050, ilvl: 1 }
            ]
        },

        // --- FLAT ELEMENTAL DAMAGE ---
        // Elemental damage added to melee strikes — higher ceiling than
        // amulet and ring equivalents since those apply to all hits
        // while this applies only to the periodic melee strike.
        // Builds can choose to go physical (flat_physical + inc_physical)
        // or elemental (one of the four element prefixes + status effects
        // in suffix slots) — or mix. Only one element can be a prefix
        // at a time given the 3-prefix budget shared with attack_speed
        // and inc_physical.
        fire_damage: {
            id: 'fire_damage',
            label: 'Adds # to @ Fire Damage to Melee Strikes', labelDe: 'Fügt Nahkampfschlägen # bis @ Feuerschaden hinzu',
            tiers: [
                { tier: 1, min1: 28, max1: 42, min2: 78, max2: 108, weight: 110, ilvl: 80 },
                { tier: 2, min1: 17, max1: 27, min2: 50, max2: 77, weight: 250, ilvl: 60 },
                { tier: 3, min1: 8, max1: 16, min2: 26, max2: 49, weight: 500, ilvl: 35 },
                { tier: 4, min1: 3, max1: 7, min2: 11, max2: 25, weight: 1000, ilvl: 1 }
            ]
        },
        cold_damage: {
            id: 'cold_damage',
            label: 'Adds # to @ Cold Damage to Melee Strikes', labelDe: 'Fügt Nahkampfschlägen # bis @ Kälteschaden hinzu',
            tiers: [
                { tier: 1, min1: 24, max1: 38, min2: 70, max2: 98, weight: 110, ilvl: 80 },
                { tier: 2, min1: 14, max1: 23, min2: 44, max2: 69, weight: 250, ilvl: 60 },
                { tier: 3, min1: 7, max1: 13, min2: 22, max2: 43, weight: 500, ilvl: 35 },
                { tier: 4, min1: 2, max1: 6, min2: 9, max2: 21, weight: 1000, ilvl: 1 }
            ]
        },
        lightning_damage: {
            id: 'lightning_damage',
            label: 'Adds # to @ Lightning Damage to Melee Strikes', labelDe: 'Fügt Nahkampfschlägen # bis @ Blitzschaden hinzu',
            // Lightning has a wide spread — high variance, high ceiling.
            tiers: [
                { tier: 1, min1: 7, max1: 18, min2: 85, max2: 128, weight: 110, ilvl: 80 },
                { tier: 2, min1: 4, max1: 12, min2: 54, max2: 84, weight: 250, ilvl: 60 },
                { tier: 3, min1: 2, max1: 7, min2: 28, max2: 53, weight: 500, ilvl: 35 },
                { tier: 4, min1: 1, max1: 4, min2: 12, max2: 27, weight: 1000, ilvl: 1 }
            ]
        },
        shadow_damage: {
            id: 'shadow_damage',
            label: 'Adds # to @ Shadow Damage to Melee Strikes', labelDe: 'Fügt Nahkampfschlägen # bis @ Schattenschaden hinzu',
            // Shadow is rarer — lower weight, slightly lower values,
            // but its status effect (convert) is the most powerful.
            tiers: [
                { tier: 1, min1: 20, max1: 32, min2: 56, max2: 82, weight: 75, ilvl: 82 },
                { tier: 2, min1: 12, max1: 19, min2: 36, max2: 55, weight: 170, ilvl: 62 },
                { tier: 3, min1: 6, max1: 11, min2: 18, max2: 35, weight: 370, ilvl: 38 },
                { tier: 4, min1: 2, max1: 5, min2: 7, max2: 17, weight: 800, ilvl: 1 }
            ]
        },

        // --- CRITICAL STRIKES ---
        // Weapon is the natural home for the highest crit values in the
        // game — the blow itself is what crits. Higher ceiling than
        // amulet, bracers, and arcane since those are secondary sources.
        // Crit as a prefix means stacking crit_chance + crit_multiplier
        // both occupy prefix slots, creating a real trade-off against
        // physical/elemental damage and attack_speed.
        crit_chance: {
            id: 'crit_chance',
            label: '+#% Critical Strike Chance', labelDe: '+#% kritische Trefferchance',
            tiers: [
                { tier: 1, min: 8, max: 12, weight: 90, ilvl: 80 },
                { tier: 2, min: 5, max: 7, weight: 220, ilvl: 60 },
                { tier: 3, min: 3, max: 4, weight: 520, ilvl: 35 },
                { tier: 4, min: 1, max: 2, weight: 1050, ilvl: 1 }
            ]
        },
        crit_multiplier: {
            id: 'crit_multiplier',
            label: '+#% to Critical Strike Multiplier', labelDe: '+#% zum kritischen Schadensmultiplikator',
            tiers: [
                { tier: 1, min: 55, max: 75, weight: 70, ilvl: 82 },
                { tier: 2, min: 35, max: 54, weight: 175, ilvl: 62 },
                { tier: 3, min: 18, max: 34, weight: 400, ilvl: 40 },
                { tier: 4, min: 6, max: 17, weight: 900, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 45, max: 60, weight: 100, ilvl: 78 },
                { tier: 2, min: 30, max: 44, weight: 300, ilvl: 50 },
                { tier: 3, min: 15, max: 29, weight: 600, ilvl: 1 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        // Strength is primary for a melee weapon — raw physical power.
        // Better weight than agility or intelligence on this slot.
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 160, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 320, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 650, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1300, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 2600, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },

        // --- ACCURACY ---
        // Melee strikes can miss — accuracy is a meaningful suffix here.
        // The weapon is the most natural home for melee accuracy, so it
        // rolls with the best weights of any slot for this stat.
        // Values are higher than bracers/gloves/armour slots — if you
        // want reliable melee strikes, invest prefix budget in accuracy
        // or accept occasional misses.
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 301, max: 450, weight: 120, ilvl: 80 },
                { tier: 2, min: 151, max: 300, weight: 240, ilvl: 60 },
                { tier: 3, min: 76, max: 150, weight: 500, ilvl: 40 },
                { tier: 4, min: 36, max: 75, weight: 1000, ilvl: 20 },
                { tier: 5, min: 10, max: 35, weight: 2000, ilvl: 1 }
            ]
        },

        // --- LIFE LEECH ---
        // The blade draws life from the wound. Higher ceiling than
        // bracers/earring/ring equivalents — melee strikes fire less
        // often but are larger single instances of damage, making
        // leech per-hit more impactful here. Still lower than the
        // chest's prefix version since that is a larger slot.
        life_leech: {
            id: 'life_leech',
            label: 'Gain #% of Melee Strike Damage as Life', labelDe: 'Erhalte #% des Nahkampfschadens als Leben',
            tiers: [
                { tier: 1, min: 2.5, max: 4.0, weight: 80, ilvl: 82 },
                { tier: 2, min: 1.5, max: 2.4, weight: 200, ilvl: 60 },
                { tier: 3, min: 0.8, max: 1.4, weight: 480, ilvl: 35 },
                { tier: 4, min: 0.3, max: 0.7, weight: 1000, ilvl: 1 }
            ]
        },

        // --- ON-HIT STATUS EFFECTS ---
        // Delivered through the weapon itself on every melee strike.
        // Higher % values than bracers (which proc on any hit including
        // the frequent cell-reveal projectiles) to compensate for the
        // lower strike frequency — the weapon hits hard and less often,
        // so each hit should have a meaningful chance to apply a status.
        // All five status effects are available: the weapon is the
        // primary melee tool and can be built toward any elemental path.
        chance_to_ignite: {
            id: 'chance_to_ignite',
            label: '#% Chance to Ignite on Melee Strike', labelDe: '#% Chance auf Entzünden bei Nahkampfschlag',
            tiers: [
                { tier: 1, min: 28, max: 40, weight: 100, ilvl: 80 },
                { tier: 2, min: 18, max: 27, weight: 250, ilvl: 58 },
                { tier: 3, min: 9, max: 17, weight: 550, ilvl: 32 },
                { tier: 4, min: 3, max: 8, weight: 1100, ilvl: 1 }
            ]
        },
        chance_to_freeze: {
            id: 'chance_to_freeze',
            label: '#% Chance to Freeze on Melee Strike', labelDe: '#% Chance auf Einfrieren bei Nahkampfschlag',
            tiers: [
                { tier: 1, min: 24, max: 35, weight: 100, ilvl: 80 },
                { tier: 2, min: 15, max: 23, weight: 250, ilvl: 58 },
                { tier: 3, min: 7, max: 14, weight: 550, ilvl: 32 },
                { tier: 4, min: 2, max: 6, weight: 1100, ilvl: 1 }
            ]
        },
        chance_to_shock: {
            id: 'chance_to_shock',
            label: '#% Chance to Shock on Melee Strike', labelDe: '#% Chance auf Schock bei Nahkampfschlag',
            tiers: [
                { tier: 1, min: 28, max: 40, weight: 100, ilvl: 80 },
                { tier: 2, min: 18, max: 27, weight: 250, ilvl: 58 },
                { tier: 3, min: 9, max: 17, weight: 550, ilvl: 32 },
                { tier: 4, min: 3, max: 8, weight: 1100, ilvl: 1 }
            ]
        },
        chance_to_blind: {
            id: 'chance_to_blind',
            label: '#% Chance to Blind on Melee Strike', labelDe: '#% Chance auf Blendung bei Nahkampfschlag',
            tiers: [
                { tier: 1, min: 30, max: 45, weight: 110, ilvl: 78 },
                { tier: 2, min: 19, max: 29, weight: 270, ilvl: 55 },
                { tier: 3, min: 10, max: 18, weight: 580, ilvl: 30 },
                { tier: 4, min: 3, max: 9, weight: 1150, ilvl: 1 }
            ]
        },
        chance_to_convert: {
            id: 'chance_to_convert',
            // Shadow-locked, rarest status — only the most powerful
            // shadow weapon can compel a monster to turn on its allies.
            label: '#% Chance to Convert on Melee Strike', labelDe: '#% Chance zur Umwandlung bei Nahkampfschlag',
            tiers: [
                { tier: 1, min: 12, max: 18, weight: 45, ilvl: 84 },
                { tier: 2, min: 7, max: 11, weight: 120, ilvl: 65 },
                { tier: 3, min: 2, max: 6, weight: 320, ilvl: 1 }
            ]
        },

        // --- WEAPON-EXCLUSIVE: CLEAVE ---
        // A wide sweeping strike that hits every monster sharing the
        // same spawn location as the target. Since each spawn location
        // can hold multiple monsters, this turns the melee strike from
        // a single-target hit into a cluster-clearing blow.
        // Competes with status effects and leech for suffix budget —
        // you can cleave, or you can reliably ignite, but not both
        // on the same suffix slots. Higher tier values make cleave a
        // build-defining mechanic for dense spawn locations.
        cleave: {
            id: 'cleave',
            label: '#% Chance for Melee Strikes to hit all Monsters\nin the target\'s Spawn Location', labelDe: '#% Chance, dass Nahkampfschläge alle Monster\nam Spawnpunkt des Ziels treffen',
            tiers: [
                { tier: 1, min: 35, max: 50, weight: 75, ilvl: 84 },
                { tier: 2, min: 22, max: 34, weight: 190, ilvl: 64 },
                { tier: 3, min: 10, max: 21, weight: 440, ilvl: 40 },
                { tier: 4, min: 3, max: 9, weight: 950, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 1 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 10, max: 15, weight: 150, ilvl: 75 },
                { tier: 2, min: 5, max: 9, weight: 400, ilvl: 1 }
            ]
        }
    }
};

//------------------------------------------------------------------------
//-------------------WEAPON 2 (OFF-HAND / SHIELD) MODIFIER TABLE----------
//------------------------------------------------------------------------
// The off-hand slot accepts either a shield or an offhand item (focus,
// orb, tome, dagger-grip, etc). Players who dual-wield use two copies
// of EG_MOD_TABLE_WEAPON1 instead — this table is specifically for
// the protective/utility off-hand archetype.
//
// SHIELD identity:
//   The shield is the premier block slot — it has the highest block and
//   spell block values in the game, beating chest and shoulders. Its
//   local defences (flat armour, evasion, absorption) rival shoulders
//   scale. The shield-exclusive mod shield_bash lets it contribute to
//   offence: when the player blocks, there is a % chance the shield
//   slams back for damage. Absorption regen mods are strong here —
//   the shield is the front line of that layer.
//   Shields use EG_MOD_TABLE_SHIELD below — a defensive-only copy of
//   this table. The offhand-identity offensive mods (spell_damage,
//   inc_spell_damage, channel) are stripped from it since shields are
//   purely protective pieces; those mods remain reserved for actual
//   offhand items (focus, orb, tome) once those exist.
//
// OFFHAND identity:
//   An offhand item (focus, orb, tome, etc.) leans into spell damage,
//   mana sustain, and the exclusive channel mod — filling correct cells
//   consecutively charges a damage multiplier that fires on the next
//   melee strike or projectile. Rewards streak play the same way
//   precision (chest) does, but as burst output rather than regen.
//
// No attack speed (that's the main weapon), no cleave (main weapon),
// no accuracy (off-hand doesn't swing), no crit (kept to main weapon,
// amulet, bracers, arcane), no on-hit status effects (those come from
// the striking weapon and bracers). No puzzle quiz exclusives (gloves).
// No chain/splash/multishot (cloak/gloves), no pushback/overkill
// (shoulders), no stagger/grounded/first_step (pants/boots).

const EG_MOD_TABLE_WEAPON2 = {
    prefixes: {

        // --- LIFE & MANA ---
        // Shoulders scale — a large protective piece warrants solid pools.
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 90, max: 109, weight: 100, ilvl: 80 },
                { tier: 2, min: 70, max: 89, weight: 250, ilvl: 65 },
                { tier: 3, min: 50, max: 69, weight: 500, ilvl: 45 },
                { tier: 4, min: 30, max: 49, weight: 1000, ilvl: 25 },
                { tier: 5, min: 10, max: 29, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 65, max: 79, weight: 100, ilvl: 80 },
                { tier: 2, min: 50, max: 64, weight: 250, ilvl: 65 },
                { tier: 3, min: 35, max: 49, weight: 500, ilvl: 45 },
                { tier: 4, min: 20, max: 34, weight: 1000, ilvl: 25 },
                { tier: 5, min: 5, max: 19, weight: 2000, ilvl: 1 }
            ]
        },
        heart_heal: {
            id: 'heart_heal',
            label: 'Hearts heal for an additional # Health', labelDe: 'Herzen heilen zusätzlich um # Leben',
            tiers: [
                { tier: 1, min: 45, max: 58, weight: 200, ilvl: 75 },
                { tier: 2, min: 28, max: 44, weight: 400, ilvl: 40 },
                { tier: 3, min: 12, max: 27, weight: 800, ilvl: 10 }
            ]
        },

        // --- LOCAL DEFENCES ---
        // All three defence types — a shield can be built in any style.
        // Values match shoulders scale since both are major protective
        // pieces. A well-rolled shield competes with chest for raw
        // defensive contribution.
        flat_armour: {
            id: 'flat_armour',
            label: '+# to Armour', labelDe: '+# zu Rüstung',
            tiers: [
                { tier: 1, min: 100, max: 150, weight: 150, ilvl: 82 },
                { tier: 2, min: 60, max: 99, weight: 300, ilvl: 60 },
                { tier: 3, min: 25, max: 59, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 24, weight: 1200, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 80, max: 100, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 79, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 49, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        flat_evasion: {
            id: 'flat_evasion',
            label: '+# to Evasion', labelDe: '+# zu Ausweichen',
            tiers: [
                { tier: 1, min: 100, max: 150, weight: 150, ilvl: 82 },
                { tier: 2, min: 60, max: 99, weight: 300, ilvl: 60 },
                { tier: 3, min: 25, max: 59, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 24, weight: 1200, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 80, max: 100, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 79, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 49, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        flat_absorption: {
            id: 'flat_absorption',
            label: '+# to Absorption', labelDe: '+# zu Absorption',
            tiers: [
                { tier: 1, min: 80, max: 110, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 79, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 49, weight: 600, ilvl: 30 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },
        inc_absorption: {
            id: 'inc_absorption',
            label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
            tiers: [
                { tier: 1, min: 80, max: 100, weight: 150, ilvl: 82 },
                { tier: 2, min: 50, max: 79, weight: 300, ilvl: 60 },
                { tier: 3, min: 20, max: 49, weight: 600, ilvl: 20 },
                { tier: 4, min: 5, max: 19, weight: 1200, ilvl: 1 }
            ]
        },

        // --- HYBRID LIFE / DEFENSE ---
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 35, max1: 45, min2: 40, max2: 60, weight: 100, ilvl: 78 },
                { tier: 2, min1: 25, max1: 34, min2: 25, max2: 39, weight: 250, ilvl: 50 },
                { tier: 3, min1: 15, max1: 24, min2: 15, max2: 24, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 14, min2: 5, max2: 14, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 35, max1: 45, min2: 40, max2: 60, weight: 100, ilvl: 78 },
                { tier: 2, min1: 25, max1: 34, min2: 25, max2: 39, weight: 250, ilvl: 50 },
                { tier: 3, min1: 15, max1: 24, min2: 15, max2: 24, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 14, min2: 5, max2: 14, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 35, max1: 45, min2: 30, max2: 45, weight: 100, ilvl: 78 },
                { tier: 2, min1: 25, max1: 34, min2: 20, max2: 29, weight: 250, ilvl: 50 },
                { tier: 3, min1: 15, max1: 24, min2: 10, max2: 19, weight: 500, ilvl: 25 },
                { tier: 4, min1: 5, max1: 14, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 25, max1: 35, min2: 40, max2: 60, weight: 100, ilvl: 78 },
                { tier: 2, min1: 18, max1: 24, min2: 25, max2: 39, weight: 250, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 15, max2: 24, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 9, min2: 5, max2: 14, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 25, max1: 35, min2: 40, max2: 60, weight: 100, ilvl: 78 },
                { tier: 2, min1: 18, max1: 24, min2: 25, max2: 39, weight: 250, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 15, max2: 24, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 9, min2: 5, max2: 14, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 25, max1: 35, min2: 30, max2: 45, weight: 100, ilvl: 78 },
                { tier: 2, min1: 18, max1: 24, min2: 20, max2: 29, weight: 250, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 10, max2: 19, weight: 500, ilvl: 25 },
                { tier: 4, min1: 4, max1: 9, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENCES ---
        hybrid_armour_evasion: {
            id: 'hybrid_armour_evasion',
            label: '+# to Armour\n+@ to Evasion', labelDe: '+# zu Rüstung\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 40, max1: 65, min2: 40, max2: 65, weight: 120, ilvl: 80 },
                { tier: 2, min1: 25, max1: 39, min2: 25, max2: 39, weight: 250, ilvl: 55 },
                { tier: 3, min1: 12, max1: 24, min2: 12, max2: 24, weight: 500, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 4, max2: 11, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 40, max1: 65, min2: 30, max2: 50, weight: 120, ilvl: 80 },
                { tier: 2, min1: 25, max1: 39, min2: 20, max2: 29, weight: 250, ilvl: 55 },
                { tier: 3, min1: 12, max1: 24, min2: 10, max2: 19, weight: 500, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 40, max1: 65, min2: 30, max2: 50, weight: 120, ilvl: 80 },
                { tier: 2, min1: 25, max1: 39, min2: 20, max2: 29, weight: 250, ilvl: 55 },
                { tier: 3, min1: 12, max1: 24, min2: 10, max2: 19, weight: 500, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 3, max2: 9, weight: 1000, ilvl: 1 }
            ]
        },

        // --- OFFHAND-IDENTITY: SPELL DAMAGE ---
        // An offhand focus or tome amplifies the caster's output.
        // Higher flat values than the amulet's spell_damage since the
        // offhand slot is dedicated to this role; lower than chest's
        // inc_spell_damage since that's a % multiplier. Both a flat
        // and % version exist so builds can choose synergy or ceiling.
        spell_damage: {
            id: 'spell_damage',
            label: '+# to Spell Damage', labelDe: '+# zu Zauberschaden',
            tiers: [
                { tier: 1, min: 60, max: 80, weight: 100, ilvl: 80 },
                { tier: 2, min: 38, max: 59, weight: 250, ilvl: 60 },
                { tier: 3, min: 20, max: 37, weight: 500, ilvl: 38 },
                { tier: 4, min: 8, max: 19, weight: 1000, ilvl: 15 },
                { tier: 5, min: 2, max: 7, weight: 2000, ilvl: 1 }
            ]
        },
        inc_spell_damage: {
            id: 'inc_spell_damage',
            label: '#% increased Spell Damage', labelDe: '#% erhöhter Zauberschaden',
            tiers: [
                { tier: 1, min: 35, max: 50, weight: 80, ilvl: 82 },
                { tier: 2, min: 20, max: 34, weight: 200, ilvl: 62 },
                { tier: 3, min: 10, max: 19, weight: 460, ilvl: 38 },
                { tier: 4, min: 3, max: 9, weight: 1000, ilvl: 14 }
            ]
        },

        // --- OFFHAND-EXCLUSIVE: CHANNEL ---
        // The offhand focuses power between strikes. Each consecutive
        // correct cell fill without a mistake charges the channel,
        // adding a stacking flat damage bonus to the next hit (melee
        // strike or projectile). The stack count and bonus reset on
        // mistake or when the charged hit fires.
        // # is the damage added per stack, @ is the max stacks before
        // the hit automatically releases.
        // Distinct from precision (chest): precision is a sustained
        // regen/damage buff while cells are revealed; channel is a
        // burst payoff — save up, then spend. Complementary, not
        // redundant, and competing for prefix budget differently.
        channel: {
            id: 'channel',
            label: 'Each consecutive correct cell charges Channel\n(+# Damage per stack, releases at @ stacks or on next Hit)', labelDe: 'Jede korrekte Zelle lädt das Kanalisieren auf\n(+# Schaden pro Stapel, Auslösung bei @ Stapeln oder beim nächsten Treffer)',
            tiers: [
                { tier: 1, min: 12, max: 18, min2: 8, max2: 8, weight: 65, ilvl: 84 },
                { tier: 2, min: 7, max: 11, min2: 10, max2: 10, weight: 170, ilvl: 65 },
                { tier: 3, min: 3, max: 6, min2: 12, max2: 12, weight: 400, ilvl: 40 },
                { tier: 4, min: 1, max: 2, min2: 15, max2: 15, weight: 900, ilvl: 15 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 45, max: 60, weight: 100, ilvl: 78 },
                { tier: 2, min: 30, max: 44, weight: 300, ilvl: 50 },
                { tier: 3, min: 15, max: 29, weight: 600, ilvl: 15 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        // Strength is primary for shields (the bracing arm),
        // intelligence primary for offhand foci (the channelling hand).
        // Both roll at standard weights — either build path is valid.
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },

        // --- REGEN & RECOVERY ---
        life_regen: {
            id: 'life_regen',
            label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
            tiers: [
                { tier: 1, min: 16, max: 25, weight: 150, ilvl: 78 },
                { tier: 2, min: 11, max: 15, weight: 300, ilvl: 55 },
                { tier: 3, min: 6, max: 10, weight: 600, ilvl: 35 },
                { tier: 4, min: 3, max: 5, weight: 1200, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2400, ilvl: 1 }
            ]
        },
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 25, max: 35, weight: 150, ilvl: 78 },
                { tier: 2, min: 16, max: 24, weight: 300, ilvl: 55 },
                { tier: 3, min: 10, max: 15, weight: 600, ilvl: 35 },
                { tier: 4, min: 5, max: 9, weight: 1200, ilvl: 15 },
                { tier: 5, min: 2, max: 4, weight: 2400, ilvl: 1 }
            ]
        },
        // Absorption regen — strong on shields since the shield IS the
        // absorption layer. Better weights than shoulders/chest.
        absorption_regen_rate: {
            id: 'absorption_regen_rate',
            label: '#% increased Absorption Regeneration Rate', labelDe: '#% erhöhte Absorptionsregeneration',
            tiers: [
                { tier: 1, min: 40, max: 58, weight: 110, ilvl: 80 },
                { tier: 2, min: 24, max: 39, weight: 260, ilvl: 58 },
                { tier: 3, min: 12, max: 23, weight: 560, ilvl: 32 },
                { tier: 4, min: 4, max: 11, weight: 1100, ilvl: 10 }
            ]
        },
        faster_absorption_regen_start: {
            id: 'faster_absorption_regen_start',
            label: 'Absorption begins Regenerating # second(s) sooner', labelDe: 'Absorption regeneriert # Sekunde(n) früher',
            tiers: [
                { tier: 1, min: 2.5, max: 3.0, weight: 80, ilvl: 82 },
                { tier: 2, min: 1.5, max: 2.4, weight: 200, ilvl: 60 },
                { tier: 3, min: 0.8, max: 1.4, weight: 480, ilvl: 35 },
                { tier: 4, min: 0.2, max: 0.7, weight: 1000, ilvl: 10 }
            ]
        },

        // --- RESISTANCES ---
        fire_resist: {
            id: 'fire_resist',
            label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        cold_resist: {
            id: 'cold_resist',
            label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        lightning_resist: {
            id: 'lightning_resist',
            label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
            tiers: [
                { tier: 1, min: 42, max: 48, weight: 250, ilvl: 80 },
                { tier: 2, min: 36, max: 41, weight: 500, ilvl: 60 },
                { tier: 3, min: 24, max: 35, weight: 1000, ilvl: 35 },
                { tier: 4, min: 12, max: 23, weight: 2000, ilvl: 15 },
                { tier: 5, min: 5, max: 11, weight: 4000, ilvl: 1 }
            ]
        },
        shadow_resist: {
            id: 'shadow_resist',
            label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
            tiers: [
                { tier: 1, min: 31, max: 35, weight: 150, ilvl: 82 },
                { tier: 2, min: 26, max: 30, weight: 300, ilvl: 65 },
                { tier: 3, min: 16, max: 25, weight: 600, ilvl: 40 },
                { tier: 4, min: 5, max: 15, weight: 1200, ilvl: 15 }
            ]
        },

        // --- BLOCK & DODGE (shield + offhand) ---
        // The shield has the highest block values in the game — higher
        // than chest or shoulders since it is the dedicated blocking
        // piece. A player who invests in a shield and block-focused
        // passive tree can reach meaningful block caps purely through
        // this slot.
        block_chance: {
            id: 'block_chance',
            label: '+#% Chance to Block Attacks', labelDe: '+#% Chance, Angriffe zu blocken',
            tiers: [
                { tier: 1, min: 12, max: 18, weight: 100, ilvl: 80 },
                { tier: 2, min: 8, max: 11, weight: 250, ilvl: 58 },
                { tier: 3, min: 4, max: 7, weight: 550, ilvl: 32 },
                { tier: 4, min: 1, max: 3, weight: 1100, ilvl: 8 }
            ]
        },
        spell_block_chance: {
            id: 'spell_block_chance',
            label: '+#% Chance to Block Spells', labelDe: '+#% Chance, Zauber zu blocken',
            tiers: [
                { tier: 1, min: 9, max: 13, weight: 80, ilvl: 82 },
                { tier: 2, min: 5, max: 8, weight: 200, ilvl: 60 },
                { tier: 3, min: 3, max: 4, weight: 450, ilvl: 35 },
                { tier: 4, min: 1, max: 2, weight: 1000, ilvl: 10 }
            ]
        },
        block_recovery: {
            id: 'block_recovery',
            // Reduces the window after a block where you cannot deal damage.
            // Higher ceiling than shoulders/chest — the shield is the
            // dedicated block piece and should have the best recovery too.
            label: 'Recover from Blocks #% faster', labelDe: 'Erholung nach Blocken #% schneller',
            tiers: [
                { tier: 1, min: 45, max: 65, weight: 100, ilvl: 80 },
                { tier: 2, min: 28, max: 44, weight: 250, ilvl: 58 },
                { tier: 3, min: 14, max: 27, weight: 550, ilvl: 32 },
                { tier: 4, min: 4, max: 13, weight: 1100, ilvl: 8 }
            ]
        },
        dodge: {
            id: 'dodge',
            label: '+#% Chance to Dodge Attacks', labelDe: '+#% Chance, Angriffen auszuweichen',
            tiers: [
                { tier: 1, min: 6, max: 9, weight: 100, ilvl: 80 },
                { tier: 2, min: 4, max: 5, weight: 250, ilvl: 58 },
                { tier: 3, min: 2, max: 3, weight: 550, ilvl: 32 },
                { tier: 4, min: 1, max: 1, weight: 1100, ilvl: 8 }
            ]
        },
        spell_dodge: {
            id: 'spell_dodge',
            label: '+#% Chance to Dodge Spells', labelDe: '+#% Chance, Zaubern auszuweichen',
            tiers: [
                { tier: 1, min: 5, max: 7, weight: 80, ilvl: 82 },
                { tier: 2, min: 3, max: 4, weight: 200, ilvl: 60 },
                { tier: 3, min: 2, max: 2, weight: 450, ilvl: 35 },
                { tier: 4, min: 1, max: 1, weight: 1000, ilvl: 10 }
            ]
        },

        // --- SHIELD-EXCLUSIVE: SHIELD BASH ---
        // When the player blocks, the shield retaliates — there is a
        // % chance the block also deals a flat amount of physical damage
        // back to the attacker. Turns the passive act of blocking into
        // a conditional offensive trigger, rewarding players who build
        // high block chance as an attack vector rather than just defence.
        // The # value is the % chance to bash; the @ value is the
        // flat damage dealt. Competes with block_recovery and spell
        // block for suffix budget — a true trade-off between passive
        // protection and aggressive counter-play.
        shield_bash: {
            id: 'shield_bash',
            label: '#% Chance to deal @ Physical Damage when Blocking', labelDe: '#% Chance, beim Blocken @ physischen Schaden zu verursachen',
            tiers: [
                { tier: 1, min: 35, max: 50, min2: 80, max2: 120, weight: 75, ilvl: 84 },
                { tier: 2, min: 22, max: 34, min2: 48, max2: 79, weight: 190, ilvl: 64 },
                { tier: 3, min: 10, max: 21, min2: 24, max2: 47, weight: 440, ilvl: 40 },
                { tier: 4, min: 3, max: 9, min2: 8, max2: 23, weight: 960, ilvl: 15 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 15 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 10, max: 15, weight: 150, ilvl: 75 },
                { tier: 2, min: 5, max: 9, weight: 400, ilvl: 15 }
            ]
        }
    }
};

//------------------------------------------------------------------------
//-------------------SHIELD MODIFIER TABLE--------------------------------
//------------------------------------------------------------------------
// Defensive-only derivative of EG_MOD_TABLE_WEAPON2. Shields must not
// roll offensive stats (spell damage / channel are offhand-item identity,
// attack mods live on WEAPON1), so those families are stripped here while
// everything else — local defences, block & dodge suffixes, shield_bash,
// attributes, regen and utility — carries over unchanged.

const EG_MOD_TABLE_SHIELD = (() => {
    const offensivePrefixIds = ['spell_damage', 'inc_spell_damage', 'channel'];
    return {
        prefixes: Object.fromEntries(
            Object.entries(EG_MOD_TABLE_WEAPON2.prefixes)
                .filter(([id]) => !offensivePrefixIds.includes(id))
        ),
        suffixes: { ...EG_MOD_TABLE_WEAPON2.suffixes },
    };
})();

// In: endgame-mod-tables.js
// Replace the empty EG_MOD_TABLE_RANGED at the bottom of the file

const EG_MOD_TABLE_RANGED = {
    prefixes: {

        // --- FLAT PHYSICAL DAMAGE ---
        // Lower ceiling than melee weapon since projectiles fire on
        // every correct cell reveal — high frequency compensates.
        flat_physical_damage: {
            id: 'flat_physical_damage',
            label: 'Adds # to @ Physical Damage to Projectiles', labelDe: 'Fügt Projektilen # bis @ physischen Schaden hinzu',
            tiers: [
                { tier: 1, min1: 14, max1: 22, min2: 38, max2: 56, weight: 110, ilvl: 80 },
                { tier: 2, min1: 8, max1: 13, min2: 24, max2: 37, weight: 250, ilvl: 60 },
                { tier: 3, min1: 4, max1: 7, min2: 12, max2: 23, weight: 520, ilvl: 35 },
                { tier: 4, min1: 1, max1: 3, min2: 5, max2: 11, weight: 1050, ilvl: 1 }
            ]
        },

        // --- % INCREASED PHYSICAL DAMAGE ---
        inc_physical_damage: {
            id: 'inc_physical_damage',
            label: '#% increased Physical Damage', labelDe: '#% erhöhter physischer Schaden',
            tiers: [
                { tier: 1, min: 40, max: 55, weight: 90, ilvl: 82 },
                { tier: 2, min: 25, max: 39, weight: 220, ilvl: 62 },
                { tier: 3, min: 12, max: 24, weight: 500, ilvl: 38 },
                { tier: 4, min: 4, max: 11, weight: 1050, ilvl: 1 }
            ]
        },

        // --- FLAT ELEMENTAL DAMAGE ---
        // Lower than melee weapon, on par with amulet/ring since
        // projectiles fire frequently. Choose one element per build
        // — a prefix slot competes with physical damage and crit.
        fire_damage: {
            id: 'fire_damage',
            label: 'Adds # to @ Fire Damage to Projectiles', labelDe: 'Fügt Projektilen # bis @ Feuerschaden hinzu',
            tiers: [
                { tier: 1, min1: 15, max1: 24, min2: 42, max2: 60, weight: 110, ilvl: 80 },
                { tier: 2, min1: 9, max1: 14, min2: 26, max2: 41, weight: 250, ilvl: 60 },
                { tier: 3, min1: 4, max1: 8, min2: 13, max2: 25, weight: 500, ilvl: 35 },
                { tier: 4, min1: 1, max1: 3, min2: 5, max2: 12, weight: 1000, ilvl: 1 }
            ]
        },
        cold_damage: {
            id: 'cold_damage',
            label: 'Adds # to @ Cold Damage to Projectiles', labelDe: 'Fügt Projektilen # bis @ Kälteschaden hinzu',
            tiers: [
                { tier: 1, min1: 13, max1: 20, min2: 36, max2: 52, weight: 110, ilvl: 80 },
                { tier: 2, min1: 8, max1: 12, min2: 22, max2: 35, weight: 250, ilvl: 60 },
                { tier: 3, min1: 4, max1: 7, min2: 11, max2: 21, weight: 500, ilvl: 35 },
                { tier: 4, min1: 1, max1: 3, min2: 4, max2: 10, weight: 1000, ilvl: 1 }
            ]
        },
        lightning_damage: {
            id: 'lightning_damage',
            label: 'Adds # to @ Lightning Damage to Projectiles', labelDe: 'Fügt Projektilen # bis @ Blitzschaden hinzu',
            tiers: [
                { tier: 1, min1: 4, max1: 10, min2: 46, max2: 70, weight: 110, ilvl: 80 },
                { tier: 2, min1: 2, max1: 6, min2: 28, max2: 45, weight: 250, ilvl: 60 },
                { tier: 3, min1: 1, max1: 4, min2: 14, max2: 27, weight: 500, ilvl: 35 },
                { tier: 4, min1: 1, max1: 2, min2: 5, max2: 13, weight: 1000, ilvl: 1 }
            ]
        },
        shadow_damage: {
            id: 'shadow_damage',
            label: 'Adds # to @ Shadow Damage to Projectiles', labelDe: 'Fügt Projektilen # bis @ Schattenschaden hinzu',
            tiers: [
                { tier: 1, min1: 11, max1: 17, min2: 30, max2: 46, weight: 75, ilvl: 82 },
                { tier: 2, min1: 6, max1: 10, min2: 18, max2: 29, weight: 170, ilvl: 62 },
                { tier: 3, min1: 3, max1: 5, min2: 9, max2: 17, weight: 370, ilvl: 38 },
                { tier: 4, min1: 1, max1: 2, min2: 3, max2: 8, weight: 800, ilvl: 1 }
            ]
        },

        // --- CRITICAL STRIKES ---
        // On par with bracers — projectiles fire often so crit chance
        // translates to frequent procs. Intentionally below melee weapon
        // ceiling since ranged already benefits from sheer frequency.
        crit_chance: {
            id: 'crit_chance',
            label: '+#% Critical Strike Chance', labelDe: '+#% kritische Trefferchance',
            tiers: [
                { tier: 1, min: 6, max: 9, weight: 90, ilvl: 80 },
                { tier: 2, min: 4, max: 5, weight: 220, ilvl: 60 },
                { tier: 3, min: 2, max: 3, weight: 520, ilvl: 35 },
                { tier: 4, min: 1, max: 1, weight: 1050, ilvl: 1 }
            ]
        },
        crit_multiplier: {
            id: 'crit_multiplier',
            label: '+#% to Critical Strike Multiplier', labelDe: '+#% zum kritischen Schadensmultiplikator',
            tiers: [
                { tier: 1, min: 45, max: 62, weight: 70, ilvl: 82 },
                { tier: 2, min: 28, max: 44, weight: 175, ilvl: 62 },
                { tier: 3, min: 14, max: 27, weight: 400, ilvl: 40 },
                { tier: 4, min: 5, max: 13, weight: 900, ilvl: 1 }
            ]
        },

        // --- RANGED-EXCLUSIVE: PIERCE ---
        // The projectile passes through its primary target and continues
        // to hit the next monster behind it (in a different spawn
        // location along the same trajectory). A single-target reveal
        // becomes a two-for-one when pierce fires, making it especially
        // strong on dense maps. Does not chain further — only one extra
        // target. Competes with elemental damage and crit for prefix
        // budget.
        pierce: {
            id: 'pierce',
            label: '#% Chance for Projectiles to Pierce through\ntheir target and hit another Monster', labelDe: '#% Chance, dass Projektile ihr Ziel durchbohren und\nein weiteres Monster treffen',
            tiers: [
                { tier: 1, min: 28, max: 40, weight: 75, ilvl: 84 },
                { tier: 2, min: 17, max: 27, weight: 190, ilvl: 64 },
                { tier: 3, min: 8, max: 16, weight: 440, ilvl: 40 },
                { tier: 4, min: 2, max: 7, weight: 960, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        time_added: {
            id: 'time_added',
            label: '+# Seconds to Map Timer', labelDe: '+# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 45, max: 60, weight: 100, ilvl: 78 },
                { tier: 2, min: 30, max: 44, weight: 300, ilvl: 50 },
                { tier: 3, min: 15, max: 29, weight: 600, ilvl: 1 }
            ]
        }
    },

    suffixes: {

        // --- ATTRIBUTES ---
        // Agility is primary for a ranged weapon — the steady aim and
        // quick draw. Rolls with better weight than strength or intelligence.
        agility: {
            id: 'agility',
            label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 160, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 320, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 650, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1300, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 2600, ilvl: 1 }
            ]
        },
        strength: {
            id: 'strength',
            label: '+# to Strength', labelDe: '+# zu Stärke',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },
        intelligence: {
            id: 'intelligence',
            label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
            tiers: [
                { tier: 1, min: 43, max: 50, weight: 200, ilvl: 80 },
                { tier: 2, min: 35, max: 42, weight: 400, ilvl: 65 },
                { tier: 3, min: 25, max: 34, weight: 800, ilvl: 45 },
                { tier: 4, min: 15, max: 24, weight: 1600, ilvl: 20 },
                { tier: 5, min: 5, max: 14, weight: 3200, ilvl: 1 }
            ]
        },

        // --- ACCURACY ---
        // Projectiles can miss — the highest-weight accuracy slot after
        // the melee weapon. A ranged build should invest here to make
        // every reveal count. Better weights than bracers/armour slots.
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 301, max: 450, weight: 130, ilvl: 80 },
                { tier: 2, min: 151, max: 300, weight: 260, ilvl: 60 },
                { tier: 3, min: 76, max: 150, weight: 530, ilvl: 40 },
                { tier: 4, min: 36, max: 75, weight: 1050, ilvl: 20 },
                { tier: 5, min: 10, max: 35, weight: 2100, ilvl: 1 }
            ]
        },

        // --- LIFE LEECH ---
        // Each projectile drains a fraction of the damage dealt as life.
        // Lower ceiling than the melee weapon's leech suffix since
        // projectiles fire much more often — the frequent procs more
        // than compensate for the smaller per-hit %.
        life_leech: {
            id: 'life_leech',
            label: 'Gain #% of Projectile Damage as Life', labelDe: 'Erhalte #% des Projektilschadens als Leben',
            tiers: [
                { tier: 1, min: 1.5, max: 2.5, weight: 80, ilvl: 82 },
                { tier: 2, min: 0.8, max: 1.4, weight: 200, ilvl: 60 },
                { tier: 3, min: 0.4, max: 0.7, weight: 480, ilvl: 35 },
                { tier: 4, min: 0.1, max: 0.3, weight: 1000, ilvl: 10 }
            ]
        },

        // --- ON-HIT STATUS EFFECTS ---
        // Lower % than the melee weapon because projectiles fire on
        // every correct cell reveal — even modest chances produce many
        // procs over a map. Balanced around roughly the same expected
        // procs-per-map as the melee weapon's higher-per-hit values.
        chance_to_ignite: {
            id: 'chance_to_ignite',
            label: '#% Chance to Ignite on Projectile Hit', labelDe: '#% Chance auf Entzünden bei Projekiltreffer',
            tiers: [
                { tier: 1, min: 16, max: 24, weight: 100, ilvl: 80 },
                { tier: 2, min: 10, max: 15, weight: 250, ilvl: 58 },
                { tier: 3, min: 5, max: 9, weight: 550, ilvl: 32 },
                { tier: 4, min: 2, max: 4, weight: 1100, ilvl: 8 }
            ]
        },
        chance_to_freeze: {
            id: 'chance_to_freeze',
            label: '#% Chance to Freeze on Projectile Hit', labelDe: '#% Chance auf Einfrieren bei Projekiltreffer',
            tiers: [
                { tier: 1, min: 13, max: 20, weight: 100, ilvl: 80 },
                { tier: 2, min: 8, max: 12, weight: 250, ilvl: 58 },
                { tier: 3, min: 4, max: 7, weight: 550, ilvl: 32 },
                { tier: 4, min: 1, max: 3, weight: 1100, ilvl: 1 }
            ]
        },
        chance_to_shock: {
            id: 'chance_to_shock',
            label: '#% Chance to Shock on Projectile Hit', labelDe: '#% Chance auf Schock bei Projekiltreffer',
            tiers: [
                { tier: 1, min: 16, max: 24, weight: 100, ilvl: 80 },
                { tier: 2, min: 10, max: 15, weight: 250, ilvl: 58 },
                { tier: 3, min: 5, max: 9, weight: 550, ilvl: 32 },
                { tier: 4, min: 2, max: 4, weight: 1100, ilvl: 1 }
            ]
        },
        chance_to_blind: {
            id: 'chance_to_blind',
            label: '#% Chance to Blind on Projectile Hit', labelDe: '#% Chance auf Blendung bei Projekiltreffer',
            tiers: [
                { tier: 1, min: 18, max: 27, weight: 110, ilvl: 78 },
                { tier: 2, min: 11, max: 17, weight: 270, ilvl: 55 },
                { tier: 3, min: 5, max: 10, weight: 580, ilvl: 30 },
                { tier: 4, min: 2, max: 4, weight: 1150, ilvl: 1 }
            ]
        },
        chance_to_convert: {
            id: 'chance_to_convert',
            label: '#% Chance to Convert on Projectile Hit', labelDe: '#% Chance zur Umwandlung bei Projekiltreffer',
            tiers: [
                { tier: 1, min: 7, max: 11, weight: 45, ilvl: 84 },
                { tier: 2, min: 4, max: 6, weight: 120, ilvl: 65 },
                { tier: 3, min: 1, max: 3, weight: 320, ilvl: 1 }
            ]
        },

        // --- RANGED-EXCLUSIVE: SNIPE ---
        // When the targeted monster is the only occupant of its spawn
        // location (no allies sharing the cell), the shot is a Snipe
        // and deals bonus damage. Rewards targeting isolated monsters
        // over clustered ones, creating a genuine decision: pierce/splash
        // rewards hitting groups, snipe rewards isolating targets.
        // The # value is the % bonus damage on a Snipe.
        snipe: {
            id: 'snipe',
            label: 'Projectiles deal #% more Damage against Monsters\nthat are alone in their Spawn Location (Snipe)', labelDe: 'Projektile verursachen #% mehr Schaden gegen Monster,\ndie allein an ihrem Spawnpunkt stehen (Scharfschuss)',
            tiers: [
                { tier: 1, min: 45, max: 65, weight: 75, ilvl: 84 },
                { tier: 2, min: 28, max: 44, weight: 190, ilvl: 64 },
                { tier: 3, min: 14, max: 27, weight: 440, ilvl: 40 },
                { tier: 4, min: 5, max: 13, weight: 960, ilvl: 1 }
            ]
        },

        // --- PUZZLE / UTILITY ---
        mistake_count: {
            id: 'mistake_count',
            label: '+# to Allowed Mistake Count', labelDe: '+# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 25, ilvl: 85 },
                { tier: 2, min: 1, max: 1, weight: 100, ilvl: 1 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 10, max: 15, weight: 150, ilvl: 75 },
                { tier: 2, min: 5, max: 9, weight: 400, ilvl: 1 }
            ]
        }
    }
};