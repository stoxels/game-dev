//  endgame-mod-tables-boots.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
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
//   first_step — when a monster spawns, it does not charge-up its
//                attacks for the first # seconds. Your boots give you
//                an edge against fresh spawns before they find their
//                footing. A powerful stat that rewards aggressive
//                play against newly arrived enemies.
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
        mana_heal: {
            id: 'mana_heal',
            label: 'Mana Orbs restore an additional # Mana', labelDe: 'Mana-Orbs stellen zusätzlich # Mana wieder her',
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
                { tier: 1, min: 114, max: 166, weight: 262, ilvl: 82 },
                { tier: 2, min: 70, max: 113, weight: 525, ilvl: 60 },
                { tier: 3, min: 31, max: 68, weight: 1050, ilvl: 30 },
                { tier: 4, min: 7, max: 30, weight: 2100, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 90, max: 114, weight: 262, ilvl: 82 },
                { tier: 2, min: 58, max: 89, weight: 525, ilvl: 60 },
                { tier: 3, min: 26, max: 56, weight: 1050, ilvl: 20 },
                { tier: 4, min: 6, max: 25, weight: 2100, ilvl: 1 }
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
        // Armour pairs are the premium hybrid on boots.
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 41, max1: 54, min2: 50, max2: 74, weight: 170, ilvl: 78 },
                { tier: 2, min1: 26, max1: 40, min2: 29, max2: 49, weight: 425, ilvl: 50 },
                { tier: 3, min1: 14, max1: 25, min2: 13, max2: 28, weight: 850, ilvl: 25 },
                { tier: 4, min1: 5, max1: 13, min2: 4, max2: 12, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 28, max1: 38, min2: 50, max2: 74, weight: 170, ilvl: 78 },
                { tier: 2, min1: 18, max1: 26, min2: 29, max2: 49, weight: 425, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 13, max2: 28, weight: 850, ilvl: 25 },
                { tier: 4, min1: 2, max1: 8, min2: 4, max2: 12, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 41, max1: 54, min2: 46, max2: 70, weight: 170, ilvl: 78 },
                { tier: 2, min1: 26, max1: 40, min2: 26, max2: 44, weight: 425, ilvl: 50 },
                { tier: 3, min1: 14, max1: 25, min2: 12, max2: 25, weight: 850, ilvl: 25 },
                { tier: 4, min1: 5, max1: 13, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 28, max1: 38, min2: 46, max2: 70, weight: 170, ilvl: 78 },
                { tier: 2, min1: 18, max1: 26, min2: 26, max2: 44, weight: 425, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 12, max2: 25, weight: 850, ilvl: 25 },
                { tier: 4, min1: 2, max1: 8, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 41, max1: 54, min2: 34, max2: 53, weight: 170, ilvl: 78 },
                { tier: 2, min1: 26, max1: 40, min2: 19, max2: 32, weight: 425, ilvl: 50 },
                { tier: 3, min1: 14, max1: 25, min2: 10, max2: 18, weight: 850, ilvl: 25 },
                { tier: 4, min1: 5, max1: 13, min2: 2, max2: 8, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 28, max1: 38, min2: 34, max2: 53, weight: 170, ilvl: 78 },
                { tier: 2, min1: 18, max1: 26, min2: 19, max2: 32, weight: 425, ilvl: 50 },
                { tier: 3, min1: 10, max1: 17, min2: 10, max2: 18, weight: 850, ilvl: 25 },
                { tier: 4, min1: 2, max1: 8, min2: 2, max2: 8, weight: 1700, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENSES ---
        // Armour pairs are premium here — boots' primary stat.
        hybrid_armour_evasion: {
            id: 'hybrid_armour_evasion',
            label: '+# to Armour\n+@ to Evasion', labelDe: '+# zu Rüstung\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 58, max1: 86, min2: 46, max2: 70, weight: 204, ilvl: 80 },
                { tier: 2, min1: 34, max1: 56, min2: 26, max2: 44, weight: 425, ilvl: 55 },
                { tier: 3, min1: 14, max1: 32, min2: 12, max2: 25, weight: 850, ilvl: 30 },
                { tier: 4, min1: 5, max1: 13, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 58, max1: 86, min2: 34, max2: 53, weight: 204, ilvl: 80 },
                { tier: 2, min1: 34, max1: 56, min2: 19, max2: 32, weight: 425, ilvl: 55 },
                { tier: 3, min1: 14, max1: 32, min2: 10, max2: 18, weight: 850, ilvl: 30 },
                { tier: 4, min1: 5, max1: 13, min2: 2, max2: 8, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
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
                { tier: 1, min1: 35, max1: 50, min2: 40, max2: 55, weight: 80, ilvl: 84 },
                { tier: 2, min1: 22, max1: 34, min2: 26, max2: 39, weight: 200, ilvl: 63 },
                { tier: 3, min1: 10, max1: 21, min2: 14, max2: 25, weight: 460, ilvl: 38 },
                { tier: 4, min1: 3, max1: 9, min2: 6, max2: 13, weight: 1000, ilvl: 12 }
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
        // their footing. When a monster spawns, it does not begin charging
        // its attacks for the first # seconds — a window to deal damage
        // freely before it finds its rhythm. Rewards players who engage
        // aggressively against fresh spawns. Does not stack with multiple
        // boots (only one boot slot), but pairs naturally with grounded
        // for a full charge-disruption build.
        first_step: {
            id: 'first_step',
            label: 'Monsters do not Charge-up their Attacks for the first # seconds after Spawning', labelDe: 'Monster laden ihre Angriffe in den ersten # Sekunden nach dem Erscheinen nicht auf',
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

        // --- BOOTS-EXCLUSIVE: MOVEMENT SPEED (PoE-style) ---
        // Flat % increased movement speed for your on-screen avatar.
        // Affects WASD travel — crucial for dodging
        // telegraphed hazards like Fire Walls. PoE values: 10–35% in
        // 5% steps; higher tiers are rarer. Caps at ~35% per boot
        // (only one boot slot, so at most 35%).
        movement_speed: {
            id: 'movement_speed',
            label: '#% increased Movement Speed', labelDe: '#% erhöhte Bewegungsgeschwindigkeit',
            tiers: [
                { tier: 1, min: 30, max: 35, weight: 240, ilvl: 80 },
                { tier: 2, min: 25, max: 29, weight: 450, ilvl: 60 },
                { tier: 3, min: 20, max: 24, weight: 900, ilvl: 35 },
                { tier: 4, min: 15, max: 19, weight: 1800, ilvl: 15 },
                { tier: 5, min: 10, max: 14, weight: 3600, ilvl: 1 }
            ]
        },
}
};

