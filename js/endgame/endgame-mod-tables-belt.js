//  endgame-mod-tables-belt.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
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
        // --- BELT-PRIMARY: MANA HEAL (flat) ---
        // Mirrors heart_heal — highest flat mana_heal values in the game.
        mana_heal: {
            id: 'mana_heal',
            label: 'Mana Orbs restore an additional # Mana', labelDe: 'Mana-Orbs stellen zusätzlich # Mana wieder her',
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
        // --- BELT-EXCLUSIVE: INCREASED MANA HEAL (% multiplier) ---
        // Mirrors inc_heart_heal — stacks with flat mana_heal on belt,
        // helmet, chest etc. The only slot this rolls on.
        inc_mana_heal: {
            id: 'inc_mana_heal',
            label: '#% increased Mana gained from Mana Orbs', labelDe: '#% erhöhte Manawiederherstellung durch Mana-Orbs',
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
                { tier: 1, min1: 48, max1: 62, min2: 46, max2: 70, weight: 170, ilvl: 78 },
                { tier: 2, min1: 34, max1: 47, min2: 26, max2: 44, weight: 425, ilvl: 50 },
                { tier: 3, min1: 19, max1: 32, min2: 12, max2: 25, weight: 850, ilvl: 25 },
                { tier: 4, min1: 6, max1: 18, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 48, max1: 62, min2: 46, max2: 70, weight: 170, ilvl: 78 },
                { tier: 2, min1: 34, max1: 47, min2: 26, max2: 44, weight: 425, ilvl: 50 },
                { tier: 3, min1: 19, max1: 32, min2: 12, max2: 25, weight: 850, ilvl: 25 },
                { tier: 4, min1: 6, max1: 18, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 48, max1: 62, min2: 34, max2: 53, weight: 170, ilvl: 78 },
                { tier: 2, min1: 34, max1: 47, min2: 19, max2: 32, weight: 425, ilvl: 50 },
                { tier: 3, min1: 19, max1: 32, min2: 10, max2: 18, weight: 850, ilvl: 25 },
                { tier: 4, min1: 6, max1: 18, min2: 2, max2: 8, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 34, max1: 46, min2: 46, max2: 70, weight: 170, ilvl: 78 },
                { tier: 2, min1: 22, max1: 32, min2: 26, max2: 44, weight: 425, ilvl: 50 },
                { tier: 3, min1: 12, max1: 20, min2: 12, max2: 25, weight: 850, ilvl: 25 },
                { tier: 4, min1: 4, max1: 11, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 34, max1: 46, min2: 46, max2: 70, weight: 170, ilvl: 78 },
                { tier: 2, min1: 22, max1: 32, min2: 26, max2: 44, weight: 425, ilvl: 50 },
                { tier: 3, min1: 12, max1: 20, min2: 12, max2: 25, weight: 850, ilvl: 25 },
                { tier: 4, min1: 4, max1: 11, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 34, max1: 46, min2: 34, max2: 53, weight: 170, ilvl: 78 },
                { tier: 2, min1: 22, max1: 32, min2: 19, max2: 32, weight: 425, ilvl: 50 },
                { tier: 3, min1: 12, max1: 20, min2: 10, max2: 18, weight: 850, ilvl: 25 },
                { tier: 4, min1: 4, max1: 11, min2: 2, max2: 8, weight: 1700, ilvl: 1 }
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
}
};


