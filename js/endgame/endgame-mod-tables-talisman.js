//  endgame-mod-tables-talisman.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
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
        mana_heal: {
            id: 'mana_heal',
            label: 'Mana Orbs restore an additional # Mana', labelDe: 'Mana-Orbs stellen zusätzlich # Mana wieder her',
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
                { tier: 1, min: 32, max: 42, weight: 210, ilvl: 78 },
                { tier: 2, min: 20, max: 31, weight: 420, ilvl: 35 },
                { tier: 3, min: 9, max: 19, weight: 840, ilvl: 1 }
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

