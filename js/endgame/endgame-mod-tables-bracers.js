//  endgame-mod-tables-bracers.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
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
                { tier: 1, min: 102, max: 150, weight: 262, ilvl: 82 },
                { tier: 2, min: 60, max: 101, weight: 525, ilvl: 60 },
                { tier: 3, min: 26, max: 59, weight: 1050, ilvl: 30 },
                { tier: 4, min: 6, max: 25, weight: 2100, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 84, max: 108, weight: 262, ilvl: 82 },
                { tier: 2, min: 54, max: 83, weight: 525, ilvl: 60 },
                { tier: 3, min: 24, max: 53, weight: 1050, ilvl: 20 },
                { tier: 4, min: 6, max: 23, weight: 2100, ilvl: 1 }
            ]
        },
        flat_evasion: {
            id: 'flat_evasion',
            label: '+# to Evasion', labelDe: '+# zu Ausweichen',
            tiers: [
                { tier: 1, min: 102, max: 150, weight: 262, ilvl: 82 },
                { tier: 2, min: 60, max: 101, weight: 525, ilvl: 60 },
                { tier: 3, min: 26, max: 59, weight: 1050, ilvl: 30 },
                { tier: 4, min: 6, max: 25, weight: 2100, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 84, max: 108, weight: 262, ilvl: 82 },
                { tier: 2, min: 54, max: 83, weight: 525, ilvl: 60 },
                { tier: 3, min: 24, max: 53, weight: 1050, ilvl: 20 },
                { tier: 4, min: 6, max: 23, weight: 2100, ilvl: 1 }
            ]
        },
        flat_absorption: {
            id: 'flat_absorption',
            label: '+# to Absorption', labelDe: '+# zu Absorption',
            tiers: [
                { tier: 1, min: 84, max: 120, weight: 262, ilvl: 82 },
                { tier: 2, min: 50, max: 83, weight: 525, ilvl: 60 },
                { tier: 3, min: 22, max: 49, weight: 1050, ilvl: 30 },
                { tier: 4, min: 5, max: 20, weight: 2100, ilvl: 1 }
            ]
        },
        inc_absorption: {
            id: 'inc_absorption',
            label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
            tiers: [
                { tier: 1, min: 84, max: 108, weight: 262, ilvl: 82 },
                { tier: 2, min: 54, max: 83, weight: 525, ilvl: 60 },
                { tier: 3, min: 24, max: 53, weight: 1050, ilvl: 20 },
                { tier: 4, min: 6, max: 23, weight: 2100, ilvl: 1 }
            ]
        },

        // --- HYBRID LIFE / DEFENSE ---
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 38, max1: 50, min2: 46, max2: 70, weight: 170, ilvl: 78 },
                { tier: 2, min1: 26, max1: 37, min2: 26, max2: 44, weight: 425, ilvl: 50 },
                { tier: 3, min1: 14, max1: 25, min2: 12, max2: 25, weight: 850, ilvl: 25 },
                { tier: 4, min1: 5, max1: 13, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 38, max1: 50, min2: 46, max2: 70, weight: 170, ilvl: 78 },
                { tier: 2, min1: 26, max1: 37, min2: 26, max2: 44, weight: 425, ilvl: 50 },
                { tier: 3, min1: 14, max1: 25, min2: 12, max2: 25, weight: 850, ilvl: 25 },
                { tier: 4, min1: 5, max1: 13, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 38, max1: 50, min2: 34, max2: 53, weight: 170, ilvl: 78 },
                { tier: 2, min1: 26, max1: 37, min2: 19, max2: 32, weight: 425, ilvl: 50 },
                { tier: 3, min1: 14, max1: 25, min2: 10, max2: 18, weight: 850, ilvl: 25 },
                { tier: 4, min1: 5, max1: 13, min2: 2, max2: 8, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 26, max1: 36, min2: 46, max2: 70, weight: 170, ilvl: 78 },
                { tier: 2, min1: 18, max1: 25, min2: 26, max2: 44, weight: 425, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 12, max2: 25, weight: 850, ilvl: 25 },
                { tier: 4, min1: 4, max1: 8, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 26, max1: 36, min2: 46, max2: 70, weight: 170, ilvl: 78 },
                { tier: 2, min1: 18, max1: 25, min2: 26, max2: 44, weight: 425, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 12, max2: 25, weight: 850, ilvl: 25 },
                { tier: 4, min1: 4, max1: 8, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 26, max1: 36, min2: 34, max2: 53, weight: 170, ilvl: 78 },
                { tier: 2, min1: 18, max1: 25, min2: 19, max2: 32, weight: 425, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 10, max2: 18, weight: 850, ilvl: 25 },
                { tier: 4, min1: 4, max1: 8, min2: 2, max2: 8, weight: 1700, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENSES ---
        hybrid_armour_evasion: {
            id: 'hybrid_armour_evasion',
            label: '+# to Armour\n+@ to Evasion', labelDe: '+# zu Rüstung\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 50, max1: 78, min2: 50, max2: 78, weight: 204, ilvl: 80 },
                { tier: 2, min1: 29, max1: 49, min2: 29, max2: 49, weight: 425, ilvl: 55 },
                { tier: 3, min1: 12, max1: 28, min2: 12, max2: 28, weight: 850, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 50, max1: 78, min2: 38, max2: 60, weight: 204, ilvl: 80 },
                { tier: 2, min1: 29, max1: 49, min2: 22, max2: 37, weight: 425, ilvl: 55 },
                { tier: 3, min1: 12, max1: 28, min2: 10, max2: 20, weight: 850, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 2, max2: 8, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 50, max1: 78, min2: 38, max2: 60, weight: 204, ilvl: 80 },
                { tier: 2, min1: 29, max1: 49, min2: 22, max2: 37, weight: 425, ilvl: 55 },
                { tier: 3, min1: 12, max1: 28, min2: 10, max2: 20, weight: 850, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 2, max2: 8, weight: 1700, ilvl: 1 }
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
                { tier: 1, min1: 36, max1: 52, min2: 96, max2: 136, weight: 110, ilvl: 80 },
                { tier: 2, min1: 22, max1: 34, min2: 60, max2: 94, weight: 250, ilvl: 60 },
                { tier: 3, min1: 10, max1: 20, min2: 30, max2: 58, weight: 520, ilvl: 35 },
                { tier: 4, min1: 4, max1: 8, min2: 12, max2: 28, weight: 1050, ilvl: 8 }
            ]
        },
        inc_physical_damage: {
            id: 'inc_physical_damage',
            label: '#% increased Physical Damage', labelDe: '#% erhöhter physischer Schaden',
            tiers: [
                { tier: 1, min: 64, max: 88, weight: 90, ilvl: 82 },
                { tier: 2, min: 40, max: 62, weight: 220, ilvl: 62 },
                { tier: 3, min: 19, max: 38, weight: 500, ilvl: 38 },
                { tier: 4, min: 6, max: 18, weight: 1050, ilvl: 12 }
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
                { tier: 1, min: 8, max: 11, weight: 100, ilvl: 80 },
                { tier: 2, min: 5, max: 6, weight: 240, ilvl: 60 },
                { tier: 3, min: 3, max: 3, weight: 560, ilvl: 35 },
                { tier: 4, min: 2, max: 2, weight: 1100, ilvl: 10 }
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
                { tier: 1, min: 45, max: 60, weight: 210, ilvl: 78 },
                { tier: 2, min: 30, max: 44, weight: 420, ilvl: 35 },
                { tier: 3, min: 15, max: 29, weight: 840, ilvl: 1 }
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
                { tier: 1, min: 2, max: 2, weight: 240, ilvl: 65 },
                { tier: 2, min: 1, max: 1, weight: 720, ilvl: 1 }
            ]
        },
        focus: {
            id: 'focus',
            label: 'Mistakes consume #% less Time', labelDe: 'Fehler verbrauchen #% weniger Zeit',
            tiers: [
                { tier: 1, min: 10, max: 15, weight: 300, ilvl: 65 },
                { tier: 2, min: 5, max: 9, weight: 720, ilvl: 1 }
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

        parry: {
            id: 'parry',
            label: '#% Chance to Parry Attacks while holding [E]', labelDe: '#% Chance, Angriffe beim Halten von [E] zu parieren',
            tiers: [
                { tier: 1, min: 12, max: 18, weight: 100, ilvl: 80 },
                { tier: 2, min: 6, max: 11, weight: 240, ilvl: 40 },
                { tier: 3, min: 2, max: 5, weight: 600, ilvl: 1 }
            ]
        },
        deflect: {
            id: 'deflect',
            label: '#% Chance to Deflect Projectiles on Parry', labelDe: '#% Chance, Projektile bei Parade umzulenken',
            tiers: [
                { tier: 1, min: 8, max: 12, weight: 100, ilvl: 80 },
                { tier: 2, min: 4, max: 7, weight: 250, ilvl: 45 },
                { tier: 3, min: 1, max: 3, weight: 550, ilvl: 10 }
            ]
        },
        deflect_damage: {
            id: 'deflect_damage',
            label: '#% increased Damage of Deflected Projectiles', labelDe: '#% erhöhter Schaden umgelenkter Projektile',
            tiers: [
                { tier: 1, min: 21, max: 30, weight: 80, ilvl: 82 },
                { tier: 2, min: 12, max: 20, weight: 200, ilvl: 58 },
                { tier: 3, min: 5, max: 11, weight: 500, ilvl: 30 },
                { tier: 4, min: 2, max: 4, weight: 1000, ilvl: 10 }
            ]
        },
}
};

















