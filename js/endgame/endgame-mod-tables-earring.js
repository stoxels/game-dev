//  endgame-mod-tables-earring.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
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
        mana_heal: {
            id: 'mana_heal',
            label: 'Mana Orbs restore an additional # Mana', labelDe: 'Mana-Orbs stellen zusätzlich # Mana wieder her',
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
                { tier: 1, min: 30, max: 40, weight: 210, ilvl: 78 },
                { tier: 2, min: 18, max: 29, weight: 420, ilvl: 35 },
                { tier: 3, min: 8, max: 17, weight: 840, ilvl: 1 }
            ]
        },
    
        mistake_not_count: {
            id: 'mistake_not_count',
            label: '#% Chance for Mistakes to not Count', labelDe: '#% Chance, dass Fehler nicht gewertet werden',
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




