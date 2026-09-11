//  endgame-mod-tables-arcane.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
//------------------------------------------------------------------------
//-------------------ARCANE MODIFIER TABLE--------------------------------
//------------------------------------------------------------------------
// The Arcane slot holds a sigil — an inscribed mark of invoked power.
// It is an offensive magical utility slot: it bends combat rules rather
// than simply adding stats. Mana is its primary resource; damage
// amplification and mana-fuelled effects are its output identity.
// No local defences. Values sit at amulet/ring scale.
//
// Arcane-exclusive mods:
//   arcane_surge — after a streak of # consecutive correct cells with
//                  no mistake, the sigil fires and grants a burst of
//                  mana. Rewards precision and focus. The streak counter
//                  resets on any mistake. Pairs naturally with precision
//                  (chest) for builds that reward long mistake-free runs.
//   mana_to_damage — a % of your current mana is added as flat bonus
//                    damage to your next hit, then that mana is consumed.
//                    A high-risk, high-reward conversion: hoarding mana
//                    for a single empowered strike. Pairs with high mana
//                    pool builds (flat_mana, mana_regen across slots).
//
// No block/dodge, no local defences, no precision (chest), no quiz
// exclusives (gloves), no heart_heal multiplier (belt), no charge
// interaction mods (boots/pants/shoulders), no echo (rings).

const EG_MOD_TABLE_ARCANE = {
    prefixes: {

        // Individual class-ability cooldown reductions.
        cooldown_tail_risk: { id: 'cooldown_tail_risk', label: 'Tail Risk Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_speedforce: { id: 'cooldown_speedforce', label: 'Speedforce Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_regression_to_prior: { id: 'cooldown_regression_to_prior', label: 'Regression to Prior Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_significance_threshold: { id: 'cooldown_significance_threshold', label: 'Significance Threshold Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_residual: { id: 'cooldown_residual', label: 'Residual Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_degrees_of_freedom: { id: 'cooldown_degrees_of_freedom', label: 'Degrees of Freedom Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_state_rollback: { id: 'cooldown_state_rollback', label: 'State Rollback Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_transition_matrix: { id: 'cooldown_transition_matrix', label: 'Transition Matrix Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_bayes_traps: { id: 'cooldown_bayes_traps', label: 'Bayes Traps Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_type_i_error_shield: { id: 'cooldown_type_i_error_shield', label: 'Type I Error Shield Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_brownian_motion: { id: 'cooldown_brownian_motion', label: 'Brownian Motion Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_drifter: { id: 'cooldown_drifter', label: 'Drifter Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },

        cooldown_arcane_reveal: { id: 'cooldown_arcane_reveal', label: 'Arcane Reveal Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_absolute_zero: { id: 'cooldown_absolute_zero', label: 'Absolute Zero Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_data_strike: { id: 'cooldown_data_strike', label: 'Data Strike Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_diagonal_strike: { id: 'cooldown_diagonal_strike', label: 'Diagonal Strike Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_precision_shot: { id: 'cooldown_precision_shot', label: 'Precision Shot Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        cooldown_rain_of_arrows: { id: 'cooldown_rain_of_arrows', label: 'Rain Of Arrows Cooldown Recovery: # seconds', tiers: [{ tier: 1, min: 45, max: 60, weight: 45, ilvl: 84 }, { tier: 2, min: 30, max: 44, weight: 120, ilvl: 64 }, { tier: 3, min: 15, max: 29, weight: 300, ilvl: 40 }, { tier: 4, min: 5, max: 14, weight: 720, ilvl: 15 }] },
        // --- MANA (primary resource for this slot) ---
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 55, max: 72, weight: 100, ilvl: 80 },
                { tier: 2, min: 38, max: 54, weight: 250, ilvl: 65 },
                { tier: 3, min: 24, max: 37, weight: 500, ilvl: 45 },
                { tier: 4, min: 12, max: 23, weight: 1000, ilvl: 25 },
                { tier: 5, min: 4, max: 11, weight: 2000, ilvl: 1 }
            ]
        },
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 60, max: 78, weight: 100, ilvl: 80 },
                { tier: 2, min: 44, max: 59, weight: 250, ilvl: 65 },
                { tier: 3, min: 28, max: 43, weight: 500, ilvl: 45 },
                { tier: 4, min: 14, max: 27, weight: 1000, ilvl: 25 },
                { tier: 5, min: 4, max: 13, weight: 2000, ilvl: 1 }
            ]
        },
        inc_health: {
            id: 'inc_health',
            label: '#% increased Maximum Health', labelDe: '#% erhöhtes maximales Leben',
            tiers: [
                { tier: 1, min: 5, max: 8, weight: 80, ilvl: 84 },
                { tier: 2, min: 3, max: 4, weight: 200, ilvl: 62 },
                { tier: 3, min: 2, max: 3, weight: 450, ilvl: 38 },
                { tier: 4, min: 1, max: 2, weight: 900, ilvl: 12 },
                { tier: 5, min: 1, max: 1, weight: 1800, ilvl: 1 }
            ]
        },

        // --- SPELL DAMAGE ---
        // The sigil amplifies class ability power directly.
        spell_damage: {
            id: 'spell_damage',
            label: '+# to Spell Damage', labelDe: '+# zu Zauberschaden',
            tiers: [
                { tier: 1, min: 60, max: 80, weight: 100, ilvl: 80 },
                { tier: 2, min: 38, max: 59, weight: 250, ilvl: 60 },
                { tier: 3, min: 20, max: 37, weight: 500, ilvl: 38 },
                { tier: 4, min: 8, max: 19, weight: 1000, ilvl: 15 },
                { tier: 5, min: 2, max: 7, weight: 2000, ilvl: 1 }
            ]
        },
        inc_spell_damage: {
            id: 'inc_spell_damage',
            label: '#% increased Spell Damage', labelDe: '#% erhöhter Zauberschaden',
            tiers: [
                { tier: 1, min: 30, max: 44, weight: 80, ilvl: 82 },
                { tier: 2, min: 18, max: 29, weight: 200, ilvl: 62 },
                { tier: 3, min: 8, max: 17, weight: 460, ilvl: 38 },
                { tier: 4, min: 2, max: 7, weight: 1000, ilvl: 14 }
            ]
        },

        // --- ELEMENTAL DAMAGE ---
        // Sigils channel raw elemental force — slightly below amulet
        // values since the arcane slot is more utility than raw offense.
        fire_damage: {
            id: 'fire_damage',
            label: 'Adds # to @ Fire Damage', labelDe: 'Fügt # bis @ Feuerschaden hinzu',
            tiers: [
                { tier: 1, min1: 32, max1: 48, min2: 88, max2: 124, weight: 110, ilvl: 80 },
                { tier: 2, min1: 20, max1: 30, min2: 56, max2: 86, weight: 240, ilvl: 60 },
                { tier: 3, min1: 10, max1: 18, min2: 28, max2: 54, weight: 490, ilvl: 35 },
                { tier: 4, min1: 4, max1: 8, min2: 12, max2: 26, weight: 980, ilvl: 10 }
            ]
        },
        cold_damage: {
            id: 'cold_damage',
            label: 'Adds # to @ Cold Damage', labelDe: 'Fügt # bis @ Kälteschaden hinzu',
            tiers: [
                { tier: 1, min1: 28, max1: 44, min2: 80, max2: 112, weight: 110, ilvl: 80 },
                { tier: 2, min1: 16, max1: 26, min2: 50, max2: 78, weight: 240, ilvl: 60 },
                { tier: 3, min1: 8, max1: 14, min2: 24, max2: 48, weight: 490, ilvl: 35 },
                { tier: 4, min1: 2, max1: 6, min2: 10, max2: 22, weight: 980, ilvl: 10 }
            ]
        },
        lightning_damage: {
            id: 'lightning_damage',
            label: 'Adds # to @ Lightning Damage', labelDe: 'Fügt # bis @ Blitzschaden hinzu',
            tiers: [
                { tier: 1, min1: 8, max1: 20, min2: 96, max2: 148, weight: 110, ilvl: 80 },
                { tier: 2, min1: 4, max1: 14, min2: 60, max2: 94, weight: 240, ilvl: 60 },
                { tier: 3, min1: 2, max1: 8, min2: 30, max2: 58, weight: 490, ilvl: 35 },
                { tier: 4, min1: 2, max1: 4, min2: 12, max2: 28, weight: 980, ilvl: 10 }
            ]
        },
        shadow_damage: {
            id: 'shadow_damage',
            label: 'Adds # to @ Shadow Damage', labelDe: 'Fügt # bis @ Schattenschaden hinzu',
            tiers: [
                { tier: 1, min1: 24, max1: 36, min2: 64, max2: 100, weight: 75, ilvl: 82 },
                { tier: 2, min1: 14, max1: 22, min2: 40, max2: 62, weight: 170, ilvl: 62 },
                { tier: 3, min1: 6, max1: 12, min2: 18, max2: 38, weight: 360, ilvl: 38 },
                { tier: 4, min1: 2, max1: 4, min2: 6, max2: 16, weight: 780, ilvl: 12 }
            ]
        },

        // --- CRITICAL STRIKES ---
        crit_chance: {
            id: 'crit_chance',
            label: '+#% Critical Strike Chance', labelDe: '+#% kritische Trefferchance',
            tiers: [
                { tier: 1, min: 8, max: 11, weight: 100, ilvl: 80 },
                { tier: 2, min: 5, max: 6, weight: 220, ilvl: 60 },
                { tier: 3, min: 3, max: 3, weight: 500, ilvl: 35 },
                { tier: 4, min: 2, max: 2, weight: 1000, ilvl: 10 }
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
                { tier: 1, min: 32, max: 42, weight: 210, ilvl: 78 },
                { tier: 2, min: 20, max: 31, weight: 420, ilvl: 35 },
                { tier: 3, min: 9, max: 19, weight: 840, ilvl: 1 }
            ]
        },

        // --- ARCANE-EXCLUSIVE: ARCANE SURGE ---
        // After a streak of # consecutive correct cells without a
        // mistake, the sigil ignites and grants a burst of mana.
        // The streak counter resets on any mistake. The # value is
        // the streak length required; the @ value is the mana granted.
        // Shorter streaks on higher tiers — rarer items fire sooner.
        // Pairs naturally with precision (chest) and focus (many slots)
        // for builds that thrive on long mistake-free runs.
        arcane_surge: {
            id: 'arcane_surge',
            label: 'After # consecutive correct cells, gain @ Mana', labelDe: 'Nach # aufeinanderfolgenden korrekten Zellen erhältst du @ Mana',
            tiers: [
                { tier: 1, min: 5, max: 5, min2: 80, max2: 110, weight: 70, ilvl: 84 },
                { tier: 2, min: 7, max: 7, min2: 55, max2: 79, weight: 180, ilvl: 65 },
                { tier: 3, min: 10, max: 10, min2: 32, max2: 54, weight: 420, ilvl: 40 },
                { tier: 4, min: 15, max: 15, min2: 15, max2: 31, weight: 950, ilvl: 15 }
            ]
        },

        // --- ARCANE-EXCLUSIVE: MANA TO DAMAGE ---
        // A % of your current mana is converted to flat bonus damage
        // on your next hit, consuming that mana in the process.
        // Rewards hoarding mana for an empowered strike. High mana
        // pool builds (stacking flat_mana and mana_regen across slots)
        // get the most out of this — the conversion fires once per hit
        // and recharges as mana refills. The # value is the conversion %.
        mana_to_damage: {
            id: 'mana_to_damage',
            label: '#% of current Mana added as Damage on next Hit\n(that Mana is then consumed)', labelDe: '#% des aktuellen Manas werden dem nächsten Treffer als Schaden hinzugefügt\n(dieses Mana wird danach verbraucht)',
            tiers: [
                { tier: 1, min: 18, max: 25, weight: 70, ilvl: 84 },
                { tier: 2, min: 11, max: 17, weight: 180, ilvl: 65 },
                { tier: 3, min: 5, max: 10, weight: 420, ilvl: 40 },
                { tier: 4, min: 2, max: 4, weight: 950, ilvl: 15 }
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
        mana_regen: {
            id: 'mana_regen',
            label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
            tiers: [
                { tier: 1, min: 22, max: 32, weight: 130, ilvl: 78 },
                { tier: 2, min: 14, max: 21, weight: 270, ilvl: 55 },
                { tier: 3, min: 8, max: 13, weight: 550, ilvl: 35 },
                { tier: 4, min: 3, max: 7, weight: 1100, ilvl: 15 },
                { tier: 5, min: 1, max: 2, weight: 2200, ilvl: 1 }
            ]
        },
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
        life_leech: {
            id: 'life_leech',
            label: 'Gain #% of Damage dealt as Life', labelDe: 'Erhalte #% des verursachten Schadens als Leben',
            tiers: [
                { tier: 1, min: 2, max: 3, weight: 80, ilvl: 82 },
                { tier: 2, min: 1, max: 2, weight: 200, ilvl: 60 },
                { tier: 3, min: 0.5, max: 0.9, weight: 500, ilvl: 15 }
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




