//  endgame-mod-tables-weapon2.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
//------------------------------------------------------------------------
//-------------------WEAPON 2 (OFF-HAND / SHIELD) MODIFIER TABLE----------
//------------------------------------------------------------------------
// The off-hand slot accepts either a shield or an offhand item (focus,
// orb, tome, dagger-grip, etc). Players who dual-wield use two copies
// of EG_MOD_TABLE_WEAPON1 instead — this table is specifically for
// the protective/utility off-hand archetype.
//
// SHIELD identity:
//   The shield is the premier block slot — it has the highest block and
//   spell block values in the game, beating chest and shoulders. Its
//   local defences (flat armour, evasion, absorption) rival shoulders
//   scale. The shield-exclusive mod shield_bash lets it contribute to
//   offence: when the player blocks, there is a % chance the shield
//   slams back for damage. Absorption regen mods are strong here —
//   the shield is the front line of that layer.
//   Shields use EG_MOD_TABLE_SHIELD below — a defensive-only copy of
//   this table. The offhand-identity offensive mods (spell_damage,
//   inc_spell_damage, channel) are stripped from it since shields are
//   purely protective pieces; those mods remain reserved for actual
//   offhand items (focus, orb, tome) once those exist.
//
// OFFHAND identity:
//   An offhand item (focus, orb, tome, etc.) leans into spell damage,
//   mana sustain, and the exclusive channel mod — filling correct cells
//   consecutively charges a damage multiplier that fires on the next
//   melee strike or projectile. Rewards streak play the same way
//   precision (chest) does, but as burst output rather than regen.
//
// No attack speed (that's the main weapon), no cleave (main weapon),
// no accuracy (off-hand doesn't swing), no crit (kept to main weapon,
// amulet, bracers, arcane), no on-hit status effects (those come from
// the striking weapon and bracers). No puzzle quiz exclusives (gloves).
// No chain/splash/multishot (cloak/gloves), no pushback/overkill
// (shoulders), no stagger/grounded/first_step (pants/boots).

const EG_MOD_TABLE_WEAPON2 = {
    prefixes: {

        // --- LIFE & MANA ---
        // Shoulders scale — a large protective piece warrants solid pools.
        flat_health: {
            id: 'flat_health',
            label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
            tiers: [
                { tier: 1, min: 90, max: 109, weight: 100, ilvl: 80 },
                { tier: 2, min: 70, max: 89, weight: 250, ilvl: 65 },
                { tier: 3, min: 50, max: 69, weight: 500, ilvl: 45 },
                { tier: 4, min: 30, max: 49, weight: 1000, ilvl: 25 },
                { tier: 5, min: 10, max: 29, weight: 2000, ilvl: 1 }
            ]
        },
        flat_mana: {
            id: 'flat_mana',
            label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
            tiers: [
                { tier: 1, min: 65, max: 79, weight: 100, ilvl: 80 },
                { tier: 2, min: 50, max: 64, weight: 250, ilvl: 65 },
                { tier: 3, min: 35, max: 49, weight: 500, ilvl: 45 },
                { tier: 4, min: 20, max: 34, weight: 1000, ilvl: 25 },
                { tier: 5, min: 5, max: 19, weight: 2000, ilvl: 1 }
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

        // --- LOCAL DEFENCES ---
        // All three defence types — a shield can be built in any style.
        // Values match shoulders scale since both are major protective
        // pieces. A well-rolled shield competes with chest for raw
        // defensive contribution.
        flat_armour: {
            id: 'flat_armour',
            label: '+# to Armour', labelDe: '+# zu Rüstung',
            tiers: [
                { tier: 1, min: 120, max: 180, weight: 262, ilvl: 82 },
                { tier: 2, min: 72, max: 119, weight: 525, ilvl: 60 },
                { tier: 3, min: 30, max: 71, weight: 1050, ilvl: 30 },
                { tier: 4, min: 6, max: 29, weight: 2100, ilvl: 1 }
            ]
        },
        inc_armour: {
            id: 'inc_armour',
            label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
            tiers: [
                { tier: 1, min: 96, max: 120, weight: 262, ilvl: 82 },
                { tier: 2, min: 60, max: 95, weight: 525, ilvl: 60 },
                { tier: 3, min: 24, max: 59, weight: 1050, ilvl: 20 },
                { tier: 4, min: 6, max: 23, weight: 2100, ilvl: 1 }
            ]
        },
        flat_evasion: {
            id: 'flat_evasion',
            label: '+# to Evasion', labelDe: '+# zu Ausweichen',
            tiers: [
                { tier: 1, min: 120, max: 180, weight: 262, ilvl: 82 },
                { tier: 2, min: 72, max: 119, weight: 525, ilvl: 60 },
                { tier: 3, min: 30, max: 71, weight: 1050, ilvl: 30 },
                { tier: 4, min: 6, max: 29, weight: 2100, ilvl: 1 }
            ]
        },
        inc_evasion: {
            id: 'inc_evasion',
            label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
            tiers: [
                { tier: 1, min: 96, max: 120, weight: 262, ilvl: 82 },
                { tier: 2, min: 60, max: 95, weight: 525, ilvl: 60 },
                { tier: 3, min: 24, max: 59, weight: 1050, ilvl: 20 },
                { tier: 4, min: 6, max: 23, weight: 2100, ilvl: 1 }
            ]
        },
        flat_absorption: {
            id: 'flat_absorption',
            label: '+# to Absorption', labelDe: '+# zu Absorption',
            tiers: [
                { tier: 1, min: 96, max: 132, weight: 262, ilvl: 82 },
                { tier: 2, min: 60, max: 95, weight: 525, ilvl: 60 },
                { tier: 3, min: 24, max: 59, weight: 1050, ilvl: 30 },
                { tier: 4, min: 6, max: 23, weight: 2100, ilvl: 1 }
            ]
        },
        inc_absorption: {
            id: 'inc_absorption',
            label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
            tiers: [
                { tier: 1, min: 96, max: 120, weight: 262, ilvl: 82 },
                { tier: 2, min: 60, max: 95, weight: 525, ilvl: 60 },
                { tier: 3, min: 24, max: 59, weight: 1050, ilvl: 20 },
                { tier: 4, min: 6, max: 23, weight: 2100, ilvl: 1 }
            ]
        },

        // --- HYBRID LIFE / DEFENSE ---
        hybrid_life_armour: {
            id: 'hybrid_life_armour',
            label: '+# to Maximum Health\n+@ to Armour', labelDe: '+# zu maximalem Leben\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 42, max1: 54, min2: 48, max2: 72, weight: 170, ilvl: 78 },
                { tier: 2, min1: 30, max1: 41, min2: 30, max2: 47, weight: 425, ilvl: 50 },
                { tier: 3, min1: 18, max1: 29, min2: 18, max2: 29, weight: 850, ilvl: 25 },
                { tier: 4, min1: 6, max1: 17, min2: 6, max2: 17, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_life_evasion: {
            id: 'hybrid_life_evasion',
            label: '+# to Maximum Health\n+@ to Evasion', labelDe: '+# zu maximalem Leben\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 42, max1: 54, min2: 48, max2: 72, weight: 170, ilvl: 78 },
                { tier: 2, min1: 30, max1: 41, min2: 30, max2: 47, weight: 425, ilvl: 50 },
                { tier: 3, min1: 18, max1: 29, min2: 18, max2: 29, weight: 850, ilvl: 25 },
                { tier: 4, min1: 6, max1: 17, min2: 6, max2: 17, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_life_absorption: {
            id: 'hybrid_life_absorption',
            label: '+# to Maximum Health\n+@ to Absorption', labelDe: '+# zu maximalem Leben\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 42, max1: 54, min2: 36, max2: 54, weight: 170, ilvl: 78 },
                { tier: 2, min1: 30, max1: 41, min2: 24, max2: 35, weight: 425, ilvl: 50 },
                { tier: 3, min1: 18, max1: 29, min2: 12, max2: 23, weight: 850, ilvl: 25 },
                { tier: 4, min1: 6, max1: 17, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_armour: {
            id: 'hybrid_mana_armour',
            label: '+# to Maximum Mana\n+@ to Armour', labelDe: '+# zu maximalem Mana\n+@ zu Rüstung',
            tiers: [
                { tier: 1, min1: 30, max1: 42, min2: 48, max2: 72, weight: 170, ilvl: 78 },
                { tier: 2, min1: 22, max1: 29, min2: 30, max2: 47, weight: 425, ilvl: 50 },
                { tier: 3, min1: 12, max1: 20, min2: 18, max2: 29, weight: 850, ilvl: 25 },
                { tier: 4, min1: 5, max1: 11, min2: 6, max2: 17, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_evasion: {
            id: 'hybrid_mana_evasion',
            label: '+# to Maximum Mana\n+@ to Evasion', labelDe: '+# zu maximalem Mana\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 30, max1: 42, min2: 48, max2: 72, weight: 170, ilvl: 78 },
                { tier: 2, min1: 22, max1: 29, min2: 30, max2: 47, weight: 425, ilvl: 50 },
                { tier: 3, min1: 12, max1: 20, min2: 18, max2: 29, weight: 850, ilvl: 25 },
                { tier: 4, min1: 5, max1: 11, min2: 6, max2: 17, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_mana_absorption: {
            id: 'hybrid_mana_absorption',
            label: '+# to Maximum Mana\n+@ to Absorption', labelDe: '+# zu maximalem Mana\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 30, max1: 42, min2: 36, max2: 54, weight: 170, ilvl: 78 },
                { tier: 2, min1: 22, max1: 29, min2: 24, max2: 35, weight: 425, ilvl: 50 },
                { tier: 3, min1: 12, max1: 20, min2: 12, max2: 23, weight: 850, ilvl: 25 },
                { tier: 4, min1: 5, max1: 11, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },

        // --- HYBRID DEFENCES ---
        hybrid_armour_evasion: {
            id: 'hybrid_armour_evasion',
            label: '+# to Armour\n+@ to Evasion', labelDe: '+# zu Rüstung\n+@ zu Ausweichen',
            tiers: [
                { tier: 1, min1: 48, max1: 78, min2: 48, max2: 78, weight: 204, ilvl: 80 },
                { tier: 2, min1: 30, max1: 47, min2: 30, max2: 47, weight: 425, ilvl: 55 },
                { tier: 3, min1: 14, max1: 29, min2: 14, max2: 29, weight: 850, ilvl: 30 },
                { tier: 4, min1: 5, max1: 13, min2: 5, max2: 13, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_armour_absorption: {
            id: 'hybrid_armour_absorption',
            label: '+# to Armour\n+@ to Absorption', labelDe: '+# zu Rüstung\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 48, max1: 78, min2: 36, max2: 60, weight: 204, ilvl: 80 },
                { tier: 2, min1: 30, max1: 47, min2: 24, max2: 35, weight: 425, ilvl: 55 },
                { tier: 3, min1: 14, max1: 29, min2: 12, max2: 23, weight: 850, ilvl: 30 },
                { tier: 4, min1: 5, max1: 13, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },
        hybrid_evasion_absorption: {
            id: 'hybrid_evasion_absorption',
            label: '+# to Evasion\n+@ to Absorption', labelDe: '+# zu Ausweichen\n+@ zu Absorption',
            tiers: [
                { tier: 1, min1: 48, max1: 78, min2: 36, max2: 60, weight: 204, ilvl: 80 },
                { tier: 2, min1: 30, max1: 47, min2: 24, max2: 35, weight: 425, ilvl: 55 },
                { tier: 3, min1: 14, max1: 29, min2: 12, max2: 23, weight: 850, ilvl: 30 },
                { tier: 4, min1: 5, max1: 13, min2: 4, max2: 11, weight: 1700, ilvl: 1 }
            ]
        },

        // --- OFFHAND-IDENTITY: SPELL DAMAGE ---
        // An offhand focus or tome amplifies the caster's output.
        // Higher flat values than the amulet's spell_damage since the
        // offhand slot is dedicated to this role; lower than chest's
        // inc_spell_damage since that's a % multiplier. Both a flat
        // and % version exist so builds can choose synergy or ceiling.
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
                { tier: 1, min: 35, max: 50, weight: 80, ilvl: 82 },
                { tier: 2, min: 20, max: 34, weight: 200, ilvl: 62 },
                { tier: 3, min: 10, max: 19, weight: 460, ilvl: 38 },
                { tier: 4, min: 3, max: 9, weight: 1000, ilvl: 14 }
            ]
        },

        // --- OFFHAND-EXCLUSIVE: CHANNEL ---
        // The offhand focuses power between strikes. Each consecutive
        // correct cell fill without a mistake charges the channel,
        // adding a stacking flat damage bonus to the next hit (melee
        // strike or projectile). The stack count and bonus reset on
        // mistake or when the charged hit fires.
        // # is the damage added per stack, @ is the max stacks before
        // the hit automatically releases.
        // Distinct from precision (chest): precision is a sustained
        // regen/damage buff while cells are revealed; channel is a
        // burst payoff — save up, then spend. Complementary, not
        // redundant, and competing for prefix budget differently.
        channel: {
            id: 'channel',
            label: 'Each consecutive correct cell charges Channel\n(+# Damage per stack, releases at @ stacks or on next Hit)', labelDe: 'Jede korrekte Zelle lädt das Kanalisieren auf\n(+# Schaden pro Stapel, Auslösung bei @ Stapeln oder beim nächsten Treffer)',
            tiers: [
                { tier: 1, min: 12, max: 18, min2: 8, max2: 8, weight: 65, ilvl: 84 },
                { tier: 2, min: 7, max: 11, min2: 10, max2: 10, weight: 170, ilvl: 65 },
                { tier: 3, min: 3, max: 6, min2: 12, max2: 12, weight: 400, ilvl: 40 },
                { tier: 4, min: 1, max: 2, min2: 15, max2: 15, weight: 900, ilvl: 15 }
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
        // Strength is primary for shields (the bracing arm),
        // intelligence primary for offhand foci (the channelling hand).
        // Both roll at standard weights — either build path is valid.
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
        // Absorption regen — strong on shields since the shield IS the
        // absorption layer. Better weights than shoulders/chest.
        absorption_regen_rate: {
            id: 'absorption_regen_rate',
            label: '#% increased Absorption Regeneration Rate', labelDe: '#% erhöhte Absorptionsregeneration',
            tiers: [
                { tier: 1, min: 40, max: 58, weight: 110, ilvl: 80 },
                { tier: 2, min: 24, max: 39, weight: 260, ilvl: 58 },
                { tier: 3, min: 12, max: 23, weight: 560, ilvl: 32 },
                { tier: 4, min: 4, max: 11, weight: 1100, ilvl: 10 }
            ]
        },
        faster_absorption_regen_start: {
            id: 'faster_absorption_regen_start',
            label: 'Absorption begins Regenerating # second(s) sooner', labelDe: 'Absorption regeneriert # Sekunde(n) früher',
            tiers: [
                { tier: 1, min: 5.0, max: 6.5, weight: 80, ilvl: 82 },
                { tier: 2, min: 3.0, max: 4.9, weight: 200, ilvl: 60 },
                { tier: 3, min: 1.6, max: 2.9, weight: 480, ilvl: 35 },
                { tier: 4, min: 0.5, max: 1.5, weight: 1000, ilvl: 10 }
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

        // --- BLOCK & DODGE (shield + offhand) ---
        // The shield has the highest block values in the game — higher
        // than chest or shoulders since it is the dedicated blocking
        // piece. A player who invests in a shield and block-focused
        // passive tree can reach meaningful block caps purely through
        // this slot.
        block_chance: {
            id: 'block_chance',
            label: '+#% Chance to Block Attacks', labelDe: '+#% Chance, Angriffe zu blocken',
            tiers: [
                { tier: 1, min: 12, max: 18, weight: 100, ilvl: 80 },
                { tier: 2, min: 8, max: 11, weight: 250, ilvl: 58 },
                { tier: 3, min: 4, max: 7, weight: 550, ilvl: 32 },
                { tier: 4, min: 1, max: 3, weight: 1100, ilvl: 8 }
            ]
        },
        spell_block_chance: {
            id: 'spell_block_chance',
            label: '+#% Chance to Block Spells', labelDe: '+#% Chance, Zauber zu blocken',
            tiers: [
                { tier: 1, min: 9, max: 13, weight: 80, ilvl: 82 },
                { tier: 2, min: 5, max: 8, weight: 200, ilvl: 60 },
                { tier: 3, min: 3, max: 4, weight: 450, ilvl: 35 },
                { tier: 4, min: 1, max: 2, weight: 1000, ilvl: 10 }
            ]
        },
        block_recovery: {
            id: 'block_recovery',
            // Reduces the window after a block where you cannot deal damage.
            // Higher ceiling than shoulders/chest — the shield is the
            // dedicated block piece and should have the best recovery too.
            label: 'Recover from Blocks #% faster', labelDe: 'Erholung nach Blocken #% schneller',
            tiers: [
                { tier: 1, min: 45, max: 65, weight: 100, ilvl: 80 },
                { tier: 2, min: 28, max: 44, weight: 250, ilvl: 58 },
                { tier: 3, min: 14, max: 27, weight: 550, ilvl: 32 },
                { tier: 4, min: 4, max: 13, weight: 1100, ilvl: 8 }
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

        // --- SHIELD-EXCLUSIVE: SHIELD BASH ---
        // When the player blocks, the shield retaliates — there is a
        // % chance the block also deals a flat amount of physical damage
        // back to the attacker. Turns the passive act of blocking into
        // a conditional offensive trigger, rewarding players who build
        // high block chance as an attack vector rather than just defence.
        // The # value is the % chance to bash; the @ value is the
        // flat damage dealt. Competes with block_recovery and spell
        // block for suffix budget — a true trade-off between passive
        // protection and aggressive counter-play.
        shield_bash: {
            id: 'shield_bash',
            label: '#% Chance to deal @ Physical Damage when Blocking', labelDe: '#% Chance, beim Blocken @ physischen Schaden zu verursachen',
            tiers: [
                { tier: 1, min: 35, max: 50, min2: 80, max2: 120, weight: 75, ilvl: 84 },
                { tier: 2, min: 22, max: 34, min2: 48, max2: 79, weight: 190, ilvl: 64 },
                { tier: 3, min: 10, max: 21, min2: 24, max2: 47, weight: 440, ilvl: 40 },
                { tier: 4, min: 3, max: 9, min2: 8, max2: 23, weight: 960, ilvl: 15 }
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
}
};

