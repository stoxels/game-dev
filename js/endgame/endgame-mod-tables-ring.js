//  endgame-mod-tables-ring.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
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
        mana_heal: {
            id: 'mana_heal',
            label: 'Mana Orbs restore an additional # Mana', labelDe: 'Mana-Orbs stellen zusätzlich # Mana wieder her',
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
                { tier: 1, min1: 28, max1: 44, min2: 80, max2: 116, weight: 120, ilvl: 80 },
                { tier: 2, min1: 16, max1: 26, min2: 50, max2: 78, weight: 250, ilvl: 60 },
                { tier: 3, min1: 8, max1: 14, min2: 24, max2: 48, weight: 500, ilvl: 35 },
                { tier: 4, min1: 2, max1: 6, min2: 10, max2: 22, weight: 1000, ilvl: 10 }
            ]
        },
        cold_damage: {
            id: 'cold_damage',
            label: 'Adds # to @ Cold Damage', labelDe: 'Fügt # bis @ Kälteschaden hinzu',
            tiers: [
                { tier: 1, min1: 24, max1: 40, min2: 72, max2: 104, weight: 120, ilvl: 80 },
                { tier: 2, min1: 14, max1: 22, min2: 44, max2: 70, weight: 250, ilvl: 60 },
                { tier: 3, min1: 6, max1: 12, min2: 22, max2: 42, weight: 500, ilvl: 35 },
                { tier: 4, min1: 2, max1: 4, min2: 8, max2: 20, weight: 1000, ilvl: 10 }
            ]
        },
        lightning_damage: {
            id: 'lightning_damage',
            label: 'Adds # to @ Lightning Damage', labelDe: 'Fügt # bis @ Blitzschaden hinzu',
            tiers: [
                { tier: 1, min1: 6, max1: 18, min2: 88, max2: 136, weight: 120, ilvl: 80 },
                { tier: 2, min1: 4, max1: 12, min2: 56, max2: 86, weight: 250, ilvl: 60 },
                { tier: 3, min1: 2, max1: 8, min2: 28, max2: 54, weight: 500, ilvl: 35 },
                { tier: 4, min1: 2, max1: 4, min2: 12, max2: 26, weight: 1000, ilvl: 10 }
            ]
        },
        shadow_damage: {
            id: 'shadow_damage',
            label: 'Adds # to @ Shadow Damage', labelDe: 'Fügt # bis @ Schattenschaden hinzu',
            tiers: [
                { tier: 1, min1: 20, max1: 32, min2: 56, max2: 88, weight: 80, ilvl: 82 },
                { tier: 2, min1: 12, max1: 18, min2: 34, max2: 54, weight: 180, ilvl: 62 },
                { tier: 3, min1: 6, max1: 10, min2: 16, max2: 32, weight: 380, ilvl: 38 },
                { tier: 4, min1: 2, max1: 4, min2: 6, max2: 14, weight: 800, ilvl: 12 }
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
                { tier: 1, min1: 25, max1: 35, min2: 35, max2: 50, weight: 60, ilvl: 85 },
                { tier: 2, min1: 16, max1: 24, min2: 22, max2: 34, weight: 160, ilvl: 66 },
                { tier: 3, min1: 8, max1: 15, min2: 12, max2: 21, weight: 380, ilvl: 42 },
                { tier: 4, min1: 2, max1: 7, min2: 5, max2: 11, weight: 880, ilvl: 15 }
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

