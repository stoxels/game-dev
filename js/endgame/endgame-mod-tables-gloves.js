//  endgame-mod-tables-gloves.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
//------------------------------------------------------------------------
//-------------------GLOVES MODIFIER TABLE--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//-------------------GLOVES MODIFIER TABLE--------------------------------
//------------------------------------------------------------------------
// Gloves are the hand-to-puzzle and hand-to-weapon interface. They share
// bracer-scale defences (modest flat values) and lean into accuracy,
// mana-on-kill, and life-leech as their offensive sustain flavour.
// Their exclusive identity is the quiz/puzzle interaction layer:
// reveal_hint (chance to show a hint on exercise questions) and
// chance_for_new_question (retry chance on failed quiz questions) only
// roll on gloves. Multishot also lives here as a prefix — the gloved
// hand that draws the extra arrow. No block/dodge, no pushback/overkill,
// no chain/splash, no spell damage multiplier, no crit, no status effect
// chance applications (those are bracers), no precision (that's chest).

const EG_MOD_TABLE_GLOVES = {
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
        // Bracer-scale values — modest, not a primary defence slot.
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

        // --- GLOVES-EXCLUSIVE: LIFE LEECH (as prefix) ---
        // Bracers have leech as a suffix. Gloves carry it as a prefix,
        // making the two slots intentionally compete for the same budget
        // differently. The bare hand draws life through the grip.
        // Ceiling is slightly below bracers' suffix version — prefix slot
        // is more valuable budget-wise, so we keep the raw number a touch
        // lower to preserve balance across both pieces.
        life_leech: {
            id: 'life_leech',
            label: 'Gain #% of Damage dealt as Life', labelDe: 'Erhalte #% des verursachten Schadens als Leben',
            tiers: [
                { tier: 1, min: 1.8, max: 2.8, weight: 90, ilvl: 82 },
                { tier: 2, min: 1.0, max: 1.7, weight: 220, ilvl: 60 },
                { tier: 3, min: 0.4, max: 0.9, weight: 520, ilvl: 15 }
            ]
        },

        // --- GLOVES-EXCLUSIVE: MULTISHOT ---
        // The gloved hand that draws and nocks the extra arrow.
        // Cloak has multishot as a suffix. Gloves carry it as a prefix —
        // a deliberate counterpart that lets dedicated ranged builds stack
        // both pieces at a real cost to their prefix budgets.
        // Values are on par with cloak's suffix version.
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

        // --- GLOVES-EXCLUSIVE: QUIZ RETRY ---
        // The gloved hand that reaches for a fresh question card.
        // From player stats: "Chance to receive a new question after
        // failing a question." Exclusive to gloves — they interact with
        // the puzzle directly.
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

        mistake_not_count: {
            id: 'mistake_not_count',
            label: '#% Chance for Mistakes to not Count', labelDe: '#% Chance, dass Fehler nicht gewertet werden',
            tiers: [
                { tier: 1, min: 12, max: 18, weight: 90, ilvl: 70 },
                { tier: 2, min: 6, max: 11, weight: 240, ilvl: 40 },
                { tier: 3, min: 2, max: 5, weight: 600, ilvl: 1 }
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

        // --- GLOVES-PRIMARY: MANA ON KILL ---
        // The finishing touch — the hand that delivers the killing blow
        // draws mana from the fallen enemy. Earring and chest have this
        // too, but it's a primary identity stat for gloves since it
        // rewards aggressive puzzle play and kill speed. Higher ceiling
        // than earring, on par with chest.
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

        // --- GLOVES-PRIMARY: ABSORPTION ON KILL ---
        // The gauntlet absorbs the struck enemy's vitality on death.
        // Gloves feel natural for kill-triggered effects, so this sits
        // here alongside mana_on_kill as a companion sustain stat.
        // Values match chest-suffix scale since the same logic applies.
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

        // --- GLOVES-PRIMARY: ACCURACY ---
        // The steady, gloved grip that guides every shot and swing.
        // Accuracy is a meaningful secondary identity here — bracers and
        // other armour slots have it as a minor suffix, but on gloves it
        // rolls with slightly better weights, making them a natural home
        // for accuracy-focused builds. Values identical to helmet/bracers.
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 251, max: 400, weight: 130, ilvl: 80 },
                { tier: 2, min: 121, max: 250, weight: 260, ilvl: 60 },
                { tier: 3, min: 61, max: 120, weight: 530, ilvl: 40 },
                { tier: 4, min: 31, max: 60, weight: 1050, ilvl: 20 },
                { tier: 5, min: 10, max: 30, weight: 2100, ilvl: 1 }
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

        // --- GLOVES-EXCLUSIVE: REVEAL HINT ---
        // From player stats: "chance to show reveal hint on exercise
        // questions." The gloved hand that reaches into the puzzle and
        // pulls back the corner of the answer. Gloves-only — the most
        // direct thematic fit for a piece that literally interfaces with
        // the puzzle grid. Very powerful for quiz modes so it's kept rare
        // and capped at 3 tiers.
        reveal_hint: {
            id: 'reveal_hint',
            label: '#% Chance to reveal a Hint on Exercise Questions', labelDe: '#% Chance, bei Übungsaufgaben einen Hinweis aufzudecken',
            tiers: [
                { tier: 1, min: 25, max: 35, weight: 120, ilvl: 70 },
                { tier: 2, min: 14, max: 24, weight: 300, ilvl: 40 },
                { tier: 3, min: 5, max: 13, weight: 720, ilvl: 1 }
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


