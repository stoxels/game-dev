//  endgame-mod-tables-pants.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
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
        inc_health: {
            id: 'inc_health',
            label: '#% increased Maximum Health', labelDe: '#% erhöhtes maximales Leben',
            tiers: [
                { tier: 1, min: 7, max: 10, weight: 80, ilvl: 84 },
                { tier: 2, min: 5, max: 6, weight: 200, ilvl: 62 },
                { tier: 3, min: 3, max: 4, weight: 450, ilvl: 38 },
                { tier: 4, min: 2, max: 2, weight: 900, ilvl: 12 },
                { tier: 5, min: 1, max: 1, weight: 1800, ilvl: 1 }
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
        mana_heal: {
            id: 'mana_heal',
            label: 'Mana Orbs restore an additional # Mana', labelDe: 'Mana-Orbs stellen zusätzlich # Mana wieder her',
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
                { tier: 1, min: 120, max: 174, weight: 262, ilvl: 82 },
                { tier: 2, min: 74, max: 119, weight: 525, ilvl: 60 },
                { tier: 3, min: 34, max: 73, weight: 1050, ilvl: 30 },
                { tier: 4, min: 7, max: 32, weight: 2100, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 90, max: 114, weight: 262, ilvl: 82 },
                { tier: 2, min: 58, max: 89, weight: 525, ilvl: 60 },
                { tier: 3, min: 26, max: 56, weight: 1050, ilvl: 20 },
                { tier: 4, min: 6, max: 25, weight: 2100, ilvl: 1 }
            ]
        },
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
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 46, max1: 60, min2: 54, max2: 78, weight: 170, ilvl: 78 },
                { tier: 2, min1: 31, max1: 44, min2: 34, max2: 53, weight: 425, ilvl: 50 },
                { tier: 3, min1: 17, max1: 30, min2: 14, max2: 32, weight: 850, ilvl: 25 },
                { tier: 4, min1: 5, max1: 16, min2: 5, max2: 13, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 31, max1: 43, min2: 54, max2: 78, weight: 170, ilvl: 78 },
                { tier: 2, min1: 20, max1: 30, min2: 34, max2: 53, weight: 425, ilvl: 50 },
                { tier: 3, min1: 11, max1: 19, min2: 14, max2: 32, weight: 850, ilvl: 25 },
                { tier: 4, min1: 4, max1: 10, min2: 5, max2: 13, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 46, max1: 60, min2: 46, max2: 70, weight: 170, ilvl: 78 },
                { tier: 2, min1: 31, max1: 44, min2: 26, max2: 44, weight: 425, ilvl: 50 },
                { tier: 3, min1: 17, max1: 30, min2: 12, max2: 25, weight: 850, ilvl: 25 },
                { tier: 4, min1: 5, max1: 16, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 31, max1: 43, min2: 46, max2: 70, weight: 170, ilvl: 78 },
                { tier: 2, min1: 20, max1: 30, min2: 26, max2: 44, weight: 425, ilvl: 50 },
                { tier: 3, min1: 11, max1: 19, min2: 12, max2: 25, weight: 850, ilvl: 25 },
                { tier: 4, min1: 4, max1: 10, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 46, max1: 60, min2: 34, max2: 53, weight: 170, ilvl: 78 },
                { tier: 2, min1: 31, max1: 44, min2: 19, max2: 32, weight: 425, ilvl: 50 },
                { tier: 3, min1: 17, max1: 30, min2: 10, max2: 18, weight: 850, ilvl: 25 },
                { tier: 4, min1: 5, max1: 16, min2: 2, max2: 8, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 31, max1: 43, min2: 34, max2: 53, weight: 170, ilvl: 78 },
                { tier: 2, min1: 20, max1: 30, min2: 19, max2: 32, weight: 425, ilvl: 50 },
                { tier: 3, min1: 11, max1: 19, min2: 10, max2: 18, weight: 850, ilvl: 25 },
                { tier: 4, min1: 4, max1: 10, min2: 2, max2: 8, weight: 1700, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENSES ---
        // Evasion pairs are the premium hybrid — pants' primary stat.
        hybrid_evasion_armour: {
            id: 'hybrid_evasion_armour',
            label: '+# to Evasion\n+@ to Armour', labelDe: '+# zu Ausweichen\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 58, max1: 86, min2: 46, max2: 70, weight: 204, ilvl: 80 },
                { tier: 2, min1: 34, max1: 56, min2: 26, max2: 44, weight: 425, ilvl: 55 },
                { tier: 3, min1: 14, max1: 32, min2: 12, max2: 25, weight: 850, ilvl: 30 },
                { tier: 4, min1: 5, max1: 13, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 58, max1: 86, min2: 34, max2: 53, weight: 204, ilvl: 80 },
                { tier: 2, min1: 34, max1: 56, min2: 19, max2: 32, weight: 425, ilvl: 55 },
                { tier: 3, min1: 14, max1: 32, min2: 10, max2: 18, weight: 850, ilvl: 30 },
                { tier: 4, min1: 5, max1: 13, min2: 2, max2: 8, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 46, max1: 70, min2: 34, max2: 53, weight: 204, ilvl: 80 },
                { tier: 2, min1: 26, max1: 44, min2: 19, max2: 32, weight: 425, ilvl: 55 },
                { tier: 3, min1: 12, max1: 25, min2: 10, max2: 18, weight: 850, ilvl: 30 },
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

        // --- PANTS-EXCLUSIVE: STAGGER ---
        // A wide stance disrupts the monster's footing on impact —
        // each hit has a chance to stagger the target, freezing its
        // charge timer for a brief window before it resumes.
        // Distinct from shoulders' pushback (which always reduces the
        // timer by a fixed amount): stagger is a shorter guaranteed
        // window, useful for buying reaction time rather than raw delay.
        stagger: {
            id: 'stagger',
            label: '#% Chance to Stagger a Monster on Hit\n(Pauses their Charge Timer for 2.5 seconds)', labelDe: '#% Chance, ein Monster bei Treffer ins Wanken zu bringen\n(pausiert dessen Ansturm-Timer für 2,5 Sekunden)',
            tiers: [
                { tier: 1, min: 30, max: 40, weight: 80, ilvl: 84 },
                { tier: 2, min: 20, max: 29, weight: 200, ilvl: 63 },
                { tier: 3, min: 10, max: 19, weight: 460, ilvl: 38 },
                { tier: 4, min: 4, max: 9, weight: 1000, ilvl: 12 }
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
}
};

