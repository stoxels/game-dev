//  endgame-mod-tables-cloak.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
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
        inc_health: {
            id: 'inc_health',
            label: '#% increased Maximum Health', labelDe: '#% erhöhtes maximales Leben',
            tiers: [
                { tier: 1, min: 6, max: 9, weight: 80, ilvl: 84 },
                { tier: 2, min: 4, max: 5, weight: 200, ilvl: 62 },
                { tier: 3, min: 3, max: 3, weight: 450, ilvl: 38 },
                { tier: 4, min: 2, max: 2, weight: 900, ilvl: 12 },
                { tier: 5, min: 1, max: 1, weight: 1800, ilvl: 1 }
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
                { tier: 1, min: 144, max: 210, weight: 262, ilvl: 82 },
                { tier: 2, min: 90, max: 143, weight: 525, ilvl: 60 },
                { tier: 3, min: 42, max: 89, weight: 1050, ilvl: 30 },
                { tier: 4, min: 10, max: 41, weight: 2100, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 108, max: 138, weight: 262, ilvl: 82 },
                { tier: 2, min: 72, max: 107, weight: 525, ilvl: 60 },
                { tier: 3, min: 36, max: 71, weight: 1050, ilvl: 20 },
                { tier: 4, min: 10, max: 35, weight: 2100, ilvl: 1 }
            ]
        },
        // Armour is secondary on a cloak — slightly below helmet scale.
        flat_armour: {
            id: 'flat_armour',
            label: '+# to Armour', labelDe: '+# zu Rüstung',
            tiers: [
                { tier: 1, min: 96, max: 144, weight: 262, ilvl: 82 },
                { tier: 2, min: 54, max: 95, weight: 525, ilvl: 60 },
                { tier: 3, min: 22, max: 53, weight: 1050, ilvl: 30 },
                { tier: 4, min: 5, max: 20, weight: 2100, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 78, max: 102, weight: 262, ilvl: 82 },
                { tier: 2, min: 48, max: 77, weight: 525, ilvl: 60 },
                { tier: 3, min: 18, max: 47, weight: 1050, ilvl: 20 },
                { tier: 4, min: 5, max: 17, weight: 2100, ilvl: 1 }
            ]
        },
        flat_absorption: {
            id: 'flat_absorption',
            label: '+# to Absorption', labelDe: '+# zu Absorption',
            tiers: [
                { tier: 1, min: 78, max: 108, weight: 262, ilvl: 82 },
                { tier: 2, min: 48, max: 77, weight: 525, ilvl: 60 },
                { tier: 3, min: 22, max: 47, weight: 1050, ilvl: 30 },
                { tier: 4, min: 5, max: 20, weight: 2100, ilvl: 1 }
            ]
        },
        inc_absorption: {
            id: 'inc_absorption',
            label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
            tiers: [
                { tier: 1, min: 78, max: 102, weight: 262, ilvl: 82 },
                { tier: 2, min: 48, max: 77, weight: 525, ilvl: 60 },
                { tier: 3, min: 18, max: 47, weight: 1050, ilvl: 20 },
                { tier: 4, min: 5, max: 17, weight: 2100, ilvl: 1 }
            ]
        },

        // --- HYBRID LIFE & MANA / DEFENSES ---
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 42, max1: 54, min2: 60, max2: 84, weight: 170, ilvl: 78 },
                { tier: 2, min1: 30, max1: 41, min2: 36, max2: 59, weight: 425, ilvl: 50 },
                { tier: 3, min1: 18, max1: 29, min2: 18, max2: 35, weight: 850, ilvl: 25 },
                { tier: 4, min1: 6, max1: 17, min2: 6, max2: 17, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 30, max1: 42, min2: 60, max2: 84, weight: 170, ilvl: 78 },
                { tier: 2, min1: 22, max1: 29, min2: 36, max2: 59, weight: 425, ilvl: 50 },
                { tier: 3, min1: 12, max1: 20, min2: 18, max2: 35, weight: 850, ilvl: 25 },
                { tier: 4, min1: 5, max1: 11, min2: 6, max2: 17, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 42, max1: 54, min2: 42, max2: 66, weight: 170, ilvl: 78 },
                { tier: 2, min1: 30, max1: 41, min2: 24, max2: 41, weight: 425, ilvl: 50 },
                { tier: 3, min1: 18, max1: 29, min2: 12, max2: 23, weight: 850, ilvl: 25 },
                { tier: 4, min1: 6, max1: 17, min2: 5, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 42, max1: 54, min2: 34, max2: 50, weight: 170, ilvl: 78 },
                { tier: 2, min1: 30, max1: 41, min2: 20, max2: 32, weight: 425, ilvl: 50 },
                { tier: 3, min1: 18, max1: 29, min2: 10, max2: 19, weight: 850, ilvl: 25 },
                { tier: 4, min1: 6, max1: 17, min2: 4, max2: 8, weight: 1700, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENSES ---
        // Evasion pairs are the premium hybrid on a cloak.
        hybrid_evasion_armour: {
            id: 'hybrid_evasion_armour',
            label: '+# to Evasion\n+@ to Armour', labelDe: '+# zu Ausweichen\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 60, max1: 90, min2: 42, max2: 66, weight: 204, ilvl: 80 },
                { tier: 2, min1: 36, max1: 59, min2: 24, max2: 41, weight: 425, ilvl: 55 },
                { tier: 3, min1: 18, max1: 35, min2: 12, max2: 23, weight: 850, ilvl: 30 },
                { tier: 4, min1: 6, max1: 17, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 60, max1: 90, min2: 34, max2: 50, weight: 204, ilvl: 80 },
                { tier: 2, min1: 36, max1: 59, min2: 20, max2: 32, weight: 425, ilvl: 55 },
                { tier: 3, min1: 18, max1: 35, min2: 10, max2: 19, weight: 850, ilvl: 30 },
                { tier: 4, min1: 6, max1: 17, min2: 4, max2: 8, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 42, max1: 66, min2: 34, max2: 50, weight: 204, ilvl: 80 },
                { tier: 2, min1: 24, max1: 41, min2: 20, max2: 32, weight: 425, ilvl: 55 },
                { tier: 3, min1: 12, max1: 23, min2: 10, max2: 19, weight: 850, ilvl: 30 },
                { tier: 4, min1: 4, max1: 11, min2: 4, max2: 8, weight: 1700, ilvl: 1 }
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




