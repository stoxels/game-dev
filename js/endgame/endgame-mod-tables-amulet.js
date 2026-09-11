//  endgame-mod-tables-amulet.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
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
        mana_heal: {
            id: 'mana_heal',
            label: 'Mana Orbs restore an additional # Mana', labelDe: 'Mana-Orbs stellen zusätzlich # Mana wieder her',
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
                { tier: 1, min1: 40, max1: 60, min2: 110, max2: 150, weight: 120, ilvl: 80 },
                { tier: 2, min1: 24, max1: 38, min2: 70, max2: 108, weight: 250, ilvl: 60 },
                { tier: 3, min1: 12, max1: 22, min2: 36, max2: 68, weight: 500, ilvl: 35 },
                { tier: 4, min1: 4, max1: 10, min2: 16, max2: 34, weight: 1000, ilvl: 10 }
            ]
        },
        cold_damage: {
            id: 'cold_damage',
            label: 'Adds # to @ Cold Damage', labelDe: 'Fügt # bis @ Kälteschaden hinzu',
            tiers: [
                { tier: 1, min1: 36, max1: 52, min2: 100, max2: 136, weight: 120, ilvl: 80 },
                { tier: 2, min1: 22, max1: 34, min2: 64, max2: 98, weight: 250, ilvl: 60 },
                { tier: 3, min1: 10, max1: 20, min2: 32, max2: 62, weight: 500, ilvl: 35 },
                { tier: 4, min1: 4, max1: 8, min2: 14, max2: 30, weight: 1000, ilvl: 10 }
            ]
        },
        lightning_damage: {
            id: 'lightning_damage',
            label: 'Adds # to @ Lightning Damage', labelDe: 'Fügt # bis @ Blitzschaden hinzu',
            // Lightning has a wider min/max spread — high variance, high ceiling
            tiers: [
                { tier: 1, min1: 10, max1: 24, min2: 120, max2: 180, weight: 120, ilvl: 80 },
                { tier: 2, min1: 6, max1: 16, min2: 76, max2: 118, weight: 250, ilvl: 60 },
                { tier: 3, min1: 2, max1: 10, min2: 40, max2: 74, weight: 500, ilvl: 35 },
                { tier: 4, min1: 2, max1: 6, min2: 18, max2: 38, weight: 1000, ilvl: 10 }
            ]
        },
        shadow_damage: {
            id: 'shadow_damage',
            label: 'Adds # to @ Shadow Damage', labelDe: 'Fügt # bis @ Schattenschaden hinzu',
            // Shadow is rarer and slightly lower values — it has strong status effects
            tiers: [
                { tier: 1, min1: 30, max1: 44, min2: 80, max2: 116, weight: 80, ilvl: 82 },
                { tier: 2, min1: 18, max1: 28, min2: 50, max2: 78, weight: 180, ilvl: 62 },
                { tier: 3, min1: 8, max1: 16, min2: 24, max2: 48, weight: 380, ilvl: 38 },
                { tier: 4, min1: 2, max1: 6, min2: 10, max2: 22, weight: 800, ilvl: 12 }
            ]
        },

        // --- CRITICAL STRIKES ---
        crit_chance: {
            id: 'crit_chance',
            label: '+#% Critical Strike Chance', labelDe: '+#% kritische Trefferchance',
            tiers: [
                { tier: 1, min: 9, max: 12, weight: 100, ilvl: 80 },
                { tier: 2, min: 6, max: 8, weight: 220, ilvl: 60 },
                { tier: 3, min: 3, max: 5, weight: 500, ilvl: 35 },
                { tier: 4, min: 2, max: 2, weight: 1000, ilvl: 10 }
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
                { tier: 1, min: 35, max: 45, weight: 210, ilvl: 78 },
                { tier: 2, min: 22, max: 34, weight: 420, ilvl: 35 },
                { tier: 3, min: 10, max: 21, weight: 840, ilvl: 1 }
            ]
        },
        mistake_not_count: {
            id: 'mistake_not_count',
            label: '#% Chance for Mistakes to not Count', labelDe: '#% Chance, dass Fehler nicht gewertet werden',
            // Amulet-exclusive — powerful puzzle utility, kept very rare
            tiers: [
                { tier: 1, min: 12, max: 18, weight: 90, ilvl: 70 },
                { tier: 2, min: 6, max: 11, weight: 240, ilvl: 40 },
                { tier: 3, min: 2, max: 5, weight: 600, ilvl: 1 }
            ]
        },
    
        chance_for_new_question: {
            id: 'chance_for_new_question',
            label: '#% Chance to receive a new Question after failing one', labelDe: '#% Chance, nach einer falschen Antwort eine neue Frage zu erhalten',
            tiers: [
                { tier: 1, min: 30, max: 40, weight: 150, ilvl: 70 },
                { tier: 2, min: 18, max: 29, weight: 300, ilvl: 40 },
                { tier: 3, min: 8, max: 17, weight: 540, ilvl: 15 },
                { tier: 4, min: 2, max: 7, weight: 1080, ilvl: 1 }
            ]
        },
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
        ailment_duration: {
            id: 'ailment_duration',
            label: '#% increased Duration of Player-Applied Ailments', labelDe: '#% längere Dauer von durch den Spieler verursachten Leiden',
            tiers: [
                { tier: 1, min: 20, max: 35, weight: 100, ilvl: 70 },
                { tier: 2, min: 10, max: 19, weight: 300, ilvl: 30 },
                { tier: 3, min: 4, max: 9, weight: 800, ilvl: 1 }
            ]
        },
        ailment_effect: {
            id: 'ailment_effect',
            label: '#% increased Effect of Player-Applied Ailments', labelDe: '#% stärkere, durch den Spieler verursachte Leiden',
            tiers: [
                { tier: 1, min: 15, max: 25, weight: 100, ilvl: 70 },
                { tier: 2, min: 8, max: 14, weight: 300, ilvl: 30 },
                { tier: 3, min: 3, max: 7, weight: 800, ilvl: 1 }
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
                { tier: 1, min: 2, max: 2, weight: 240, ilvl: 65 },
                { tier: 2, min: 1, max: 1, weight: 720, ilvl: 1 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 8, max: 12, weight: 300, ilvl: 65 },
                { tier: 2, min: 3, max: 7, weight: 720, ilvl: 1 }
            ]
        },
    
        reveal_hint: {
            id: 'reveal_hint',
            label: '#% Chance to reveal a Hint on Exercise Questions', labelDe: '#% Chance, bei Übungsaufgaben einen Hinweis aufzudecken',
            tiers: [
                { tier: 1, min: 25, max: 35, weight: 120, ilvl: 70 },
                { tier: 2, min: 14, max: 24, weight: 300, ilvl: 40 },
                { tier: 3, min: 5, max: 13, weight: 720, ilvl: 1 }
            ]
        },
}
};



