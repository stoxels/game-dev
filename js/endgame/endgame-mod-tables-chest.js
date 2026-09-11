//  endgame-mod-tables-chest.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
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
        inc_health: {
            id: 'inc_health',
            label: '#% increased Maximum Health', labelDe: '#% erhöhtes maximales Leben',
            tiers: [
                { tier: 1, min: 8, max: 12, weight: 80, ilvl: 84 },
                { tier: 2, min: 5, max: 7, weight: 200, ilvl: 62 },
                { tier: 3, min: 3, max: 4, weight: 450, ilvl: 38 },
                { tier: 4, min: 2, max: 2, weight: 900, ilvl: 12 },
                { tier: 5, min: 1, max: 1, weight: 1800, ilvl: 1 }
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
        mana_heal: {
            id: 'mana_heal',
            label: 'Mana Orbs restore an additional # Mana', labelDe: 'Mana-Orbs stellen zusätzlich # Mana wieder her',
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
                { tier: 1, min: 192, max: 264, weight: 262, ilvl: 82 },
                { tier: 2, min: 120, max: 191, weight: 525, ilvl: 60 },
                { tier: 3, min: 60, max: 119, weight: 1050, ilvl: 30 },
                { tier: 4, min: 14, max: 59, weight: 2100, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 108, max: 144, weight: 262, ilvl: 82 },
                { tier: 2, min: 72, max: 107, weight: 525, ilvl: 60 },
                { tier: 3, min: 36, max: 71, weight: 1050, ilvl: 20 },
                { tier: 4, min: 10, max: 35, weight: 2100, ilvl: 1 }
            ]
        },
        flat_evasion: {
            id: 'flat_evasion',
            label: '+# to Evasion', labelDe: '+# zu Ausweichen',
            tiers: [
                { tier: 1, min: 192, max: 264, weight: 262, ilvl: 82 },
                { tier: 2, min: 120, max: 191, weight: 525, ilvl: 60 },
                { tier: 3, min: 60, max: 119, weight: 1050, ilvl: 30 },
                { tier: 4, min: 14, max: 59, weight: 2100, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 108, max: 144, weight: 262, ilvl: 82 },
                { tier: 2, min: 72, max: 107, weight: 525, ilvl: 60 },
                { tier: 3, min: 36, max: 71, weight: 1050, ilvl: 20 },
                { tier: 4, min: 10, max: 35, weight: 2100, ilvl: 1 }
            ]
        },
        flat_absorption: {
            id: 'flat_absorption',
            label: '+# to Absorption', labelDe: '+# zu Absorption',
            tiers: [
                { tier: 1, min: 156, max: 216, weight: 262, ilvl: 82 },
                { tier: 2, min: 96, max: 155, weight: 525, ilvl: 60 },
                { tier: 3, min: 48, max: 95, weight: 1050, ilvl: 30 },
                { tier: 4, min: 12, max: 47, weight: 2100, ilvl: 1 }
            ]
        },
        inc_absorption: {
            id: 'inc_absorption',
            label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
            tiers: [
                { tier: 1, min: 108, max: 144, weight: 262, ilvl: 82 },
                { tier: 2, min: 72, max: 107, weight: 525, ilvl: 60 },
                { tier: 3, min: 36, max: 71, weight: 1050, ilvl: 20 },
                { tier: 4, min: 10, max: 35, weight: 2100, ilvl: 1 }
            ]
        },

        // --- HYBRID LIFE & MANA / DEFENSES ---
        // Chest hybrid values are the largest of any slot.
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 60, max1: 78, min2: 78, max2: 108, weight: 170, ilvl: 78 },
                { tier: 2, min1: 42, max1: 59, min2: 48, max2: 77, weight: 425, ilvl: 50 },
                { tier: 3, min1: 24, max1: 41, min2: 24, max2: 47, weight: 850, ilvl: 25 },
                { tier: 4, min1: 10, max1: 23, min2: 10, max2: 23, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 43, max1: 58, min2: 78, max2: 108, weight: 170, ilvl: 78 },
                { tier: 2, min1: 29, max1: 42, min2: 48, max2: 77, weight: 425, ilvl: 50 },
                { tier: 3, min1: 17, max1: 28, min2: 24, max2: 47, weight: 850, ilvl: 25 },
                { tier: 4, min1: 6, max1: 16, min2: 10, max2: 23, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 60, max1: 78, min2: 78, max2: 108, weight: 170, ilvl: 78 },
                { tier: 2, min1: 42, max1: 59, min2: 48, max2: 77, weight: 425, ilvl: 50 },
                { tier: 3, min1: 24, max1: 41, min2: 24, max2: 47, weight: 850, ilvl: 25 },
                { tier: 4, min1: 10, max1: 23, min2: 10, max2: 23, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 43, max1: 58, min2: 78, max2: 108, weight: 170, ilvl: 78 },
                { tier: 2, min1: 29, max1: 42, min2: 48, max2: 77, weight: 425, ilvl: 50 },
                { tier: 3, min1: 17, max1: 28, min2: 24, max2: 47, weight: 850, ilvl: 25 },
                { tier: 4, min1: 6, max1: 16, min2: 10, max2: 23, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 60, max1: 78, min2: 60, max2: 86, weight: 170, ilvl: 78 },
                { tier: 2, min1: 42, max1: 59, min2: 38, max2: 59, weight: 425, ilvl: 50 },
                { tier: 3, min1: 24, max1: 41, min2: 19, max2: 37, weight: 850, ilvl: 25 },
                { tier: 4, min1: 10, max1: 23, min2: 7, max2: 18, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 43, max1: 58, min2: 60, max2: 86, weight: 170, ilvl: 78 },
                { tier: 2, min1: 29, max1: 42, min2: 38, max2: 59, weight: 425, ilvl: 50 },
                { tier: 3, min1: 17, max1: 28, min2: 19, max2: 37, weight: 850, ilvl: 25 },
                { tier: 4, min1: 6, max1: 16, min2: 7, max2: 18, weight: 1700, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENSES ---
        hybrid_armour_evasion: {
            id: 'hybrid_armour_evasion',
            label: '+# to Armour\n+@ to Evasion', labelDe: '+# zu Rüstung\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 84, max1: 120, min2: 84, max2: 120, weight: 204, ilvl: 80 },
                { tier: 2, min1: 50, max1: 83, min2: 50, max2: 83, weight: 425, ilvl: 55 },
                { tier: 3, min1: 24, max1: 49, min2: 24, max2: 49, weight: 850, ilvl: 30 },
                { tier: 4, min1: 7, max1: 23, min2: 7, max2: 23, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 84, max1: 120, min2: 66, max2: 96, weight: 204, ilvl: 80 },
                { tier: 2, min1: 50, max1: 83, min2: 41, max2: 65, weight: 425, ilvl: 55 },
                { tier: 3, min1: 24, max1: 49, min2: 19, max2: 40, weight: 850, ilvl: 30 },
                { tier: 4, min1: 7, max1: 23, min2: 6, max2: 18, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 84, max1: 120, min2: 66, max2: 96, weight: 204, ilvl: 80 },
                { tier: 2, min1: 50, max1: 83, min2: 41, max2: 65, weight: 425, ilvl: 55 },
                { tier: 3, min1: 24, max1: 49, min2: 19, max2: 40, weight: 850, ilvl: 30 },
                { tier: 4, min1: 7, max1: 23, min2: 6, max2: 18, weight: 1700, ilvl: 1 }
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
                { tier: 1, min: 4.0, max: 6.0, weight: 80, ilvl: 82 },
                { tier: 2, min: 2.4, max: 3.9, weight: 200, ilvl: 60 },
                { tier: 3, min: 1.0, max: 2.3, weight: 500, ilvl: 35 },
                { tier: 4, min: 0.3, max: 0.9, weight: 1000, ilvl: 10 }
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
            label: '#% Chance to Parry Attacks while holding [R]', labelDe: '#% Chance, Angriffe beim Halten von [R] zu parieren',
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




