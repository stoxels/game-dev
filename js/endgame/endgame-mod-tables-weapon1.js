//  endgame-mod-tables-weapon1.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
//------------------------------------------------------------------------
//-------------------WEAPON 1 (MAIN HAND / MELEE) MODIFIER TABLE----------
//------------------------------------------------------------------------
// The melee weapon is the primary offensive slot for the auto-strike
// system. Every X seconds the player automatically charges the targeted
// monster and lands a melee strike — the weapon defines how often this
// happens (attack_speed) and how hard it hits (physical damage, elemental
// damage, crit). Projectiles from cell reveals fire independently.
//
// Attack speed is expressed as seconds reduced from the base strike
// cooldown — higher values mean more frequent strikes.
//
// Physical and elemental damage values are the highest of any equipment
// slot since this is the dedicated melee damage piece. Bracers add flat
// physical/elemental to ALL hits (including projectiles); the weapon's
// damage only applies to melee strikes, so the ceiling is set higher
// to compensate for the narrower trigger condition.
//
// Status effect chances are higher than bracers for the same reason:
// bracers proc on every cell reveal, the weapon only procs on the
// periodic auto-strike. Higher per-hit chance, lower total frequency.
//
// Cleave is weapon-exclusive: a sweeping strike that hits all monsters
// sharing the same spawn location as the target.
//
// No local armour/evasion/absorption (weapon slot never grants those).
// No block/dodge, no puzzle utility beyond the standard set, no spell
// damage, no precision, no quiz exclusives, no absorption regen.
// Accuracy applies here — melee strikes can miss.

const EG_MOD_TABLE_WEAPON1 = {
    prefixes: {

        // --- ATTACK SPEED ---
        // The defining stat of the melee weapon slot — reduces the
        // cooldown between auto-strikes. The # value is seconds removed
        // from the base cooldown. Stacking multiple attack speed sources
        // from weapon + passive tree creates a meaningful build path.
        // Kept as a prefix so it competes with physical/elemental damage
        // for budget — you can't have everything.
        attack_speed: {
            id: 'attack_speed',
            label: 'Melee Strikes occur #s more often', labelDe: 'Nahkampfschläge erfolgen #s häufiger',
            tiers: [
                { tier: 1, min: 1.8, max: 2.5, weight: 80, ilvl: 82 },
                { tier: 2, min: 1.1, max: 1.7, weight: 200, ilvl: 62 },
                { tier: 3, min: 0.5, max: 1.0, weight: 460, ilvl: 38 },
                { tier: 4, min: 0.2, max: 0.4, weight: 1000, ilvl: 1 }
            ]
        },

        // --- FLAT PHYSICAL DAMAGE ---
        // The weapon's raw cutting or blunt force — a fixed damage range
        // added to every melee strike. Higher ceiling than bracers since
        // this is the dedicated melee slot and strikes fire less often
        // than cell reveals.
        flat_physical_damage: {
            id: 'flat_physical_damage',
            label: 'Adds # to @ Physical Damage to Melee Strikes', labelDe: 'Fügt Nahkampfschlägen # bis @ physischen Schaden hinzu',
            tiers: [
                { tier: 1, min1: 56, max1: 80, min2: 150, max2: 210, weight: 170, ilvl: 80 },
                { tier: 2, min1: 34, max1: 54, min2: 96, max2: 148, weight: 380, ilvl: 60 },
                { tier: 3, min1: 16, max1: 32, min2: 48, max2: 94, weight: 520, ilvl: 35 },
                { tier: 4, min1: 6, max1: 14, min2: 20, max2: 46, weight: 1050, ilvl: 1 }
            ]
        },

        // --- % INCREASED PHYSICAL DAMAGE ---
        // Scales all physical damage on strikes — the more flat physical
        // you have from weapon, bracers, and passives, the more valuable
        // this becomes. A multiplier prefix competing with attack_speed
        // and elemental damage for prefix slots creates meaningful choices.
        inc_physical_damage: {
            id: 'inc_physical_damage',
            label: '#% increased Physical Damage', labelDe: '#% erhöhter physischer Schaden',
            tiers: [
                { tier: 1, min: 88, max: 120, weight: 140, ilvl: 82 },
                { tier: 2, min: 56, max: 86, weight: 330, ilvl: 62 },
                { tier: 3, min: 29, max: 54, weight: 500, ilvl: 38 },
                { tier: 4, min: 10, max: 27, weight: 1050, ilvl: 1 }
            ]
        },

        // --- FLAT ELEMENTAL DAMAGE ---
        // Elemental damage added to melee strikes — higher ceiling than
        // amulet and ring equivalents since those apply to all hits
        // while this applies only to the periodic melee strike.
        // Builds can choose to go physical (flat_physical + inc_physical)
        // or elemental (one of the four element prefixes + status effects
        // in suffix slots) — or mix. Only one element can be a prefix
        // at a time given the 3-prefix budget shared with attack_speed
        // and inc_physical.
        fire_damage: {
            id: 'fire_damage',
            label: 'Adds # to @ Fire Damage to Melee Strikes', labelDe: 'Fügt Nahkampfschlägen # bis @ Feuerschaden hinzu',
            tiers: [
                { tier: 1, min1: 56, max1: 84, min2: 156, max2: 216, weight: 170, ilvl: 80 },
                { tier: 2, min1: 34, max1: 54, min2: 100, max2: 154, weight: 380, ilvl: 60 },
                { tier: 3, min1: 16, max1: 32, min2: 52, max2: 98, weight: 500, ilvl: 35 },
                { tier: 4, min1: 6, max1: 14, min2: 22, max2: 50, weight: 1000, ilvl: 1 }
            ]
        },
        cold_damage: {
            id: 'cold_damage',
            label: 'Adds # to @ Cold Damage to Melee Strikes', labelDe: 'Fügt Nahkampfschlägen # bis @ Kälteschaden hinzu',
            tiers: [
                { tier: 1, min1: 48, max1: 76, min2: 140, max2: 196, weight: 170, ilvl: 80 },
                { tier: 2, min1: 28, max1: 46, min2: 88, max2: 138, weight: 380, ilvl: 60 },
                { tier: 3, min1: 14, max1: 26, min2: 44, max2: 86, weight: 500, ilvl: 35 },
                { tier: 4, min1: 4, max1: 12, min2: 18, max2: 42, weight: 1000, ilvl: 1 }
            ]
        },
        lightning_damage: {
            id: 'lightning_damage',
            label: 'Adds # to @ Lightning Damage to Melee Strikes', labelDe: 'Fügt Nahkampfschlägen # bis @ Blitzschaden hinzu',
            // Lightning has a wide spread — high variance, high ceiling.
            tiers: [
                { tier: 1, min1: 14, max1: 36, min2: 170, max2: 256, weight: 160, ilvl: 80 },
                { tier: 2, min1: 8, max1: 24, min2: 108, max2: 168, weight: 370, ilvl: 60 },
                { tier: 3, min1: 4, max1: 14, min2: 56, max2: 106, weight: 500, ilvl: 35 },
                { tier: 4, min1: 2, max1: 8, min2: 24, max2: 54, weight: 1000, ilvl: 1 }
            ]
        },
        shadow_damage: {
            id: 'shadow_damage',
            label: 'Adds # to @ Shadow Damage to Melee Strikes', labelDe: 'Fügt Nahkampfschlägen # bis @ Schattenschaden hinzu',
            // Shadow is rarer — lower weight, slightly lower values,
            // but its status effect (convert) is the most powerful.
            tiers: [
                { tier: 1, min1: 40, max1: 64, min2: 112, max2: 164, weight: 115, ilvl: 82 },
                { tier: 2, min1: 24, max1: 38, min2: 72, max2: 110, weight: 260, ilvl: 62 },
                { tier: 3, min1: 12, max1: 22, min2: 36, max2: 70, weight: 370, ilvl: 38 },
                { tier: 4, min1: 4, max1: 10, min2: 14, max2: 34, weight: 800, ilvl: 1 }
            ]
        },

        // --- CRITICAL STRIKES ---
        // Weapon is the natural home for the highest crit values in the
        // game — the blow itself is what crits. Higher ceiling than
        // amulet, bracers, and arcane since those are secondary sources.
        // Crit as a prefix means stacking crit_chance + crit_multiplier
        // both occupy prefix slots, creating a real trade-off against
        // physical/elemental damage and attack_speed.
        crit_chance: {
            id: 'crit_chance',
            label: '+#% Critical Strike Chance', labelDe: '+#% kritische Trefferchance',
            tiers: [
                { tier: 1, min: 12, max: 18, weight: 90, ilvl: 80 },
                { tier: 2, min: 8, max: 11, weight: 220, ilvl: 60 },
                { tier: 3, min: 5, max: 6, weight: 520, ilvl: 35 },
                { tier: 4, min: 2, max: 3, weight: 1050, ilvl: 1 }
            ]
        },
        crit_multiplier: {
            id: 'crit_multiplier',
            label: '+#% to Critical Strike Multiplier', labelDe: '+#% zum kritischen Schadensmultiplikator',
            tiers: [
                { tier: 1, min: 55, max: 75, weight: 70, ilvl: 82 },
                { tier: 2, min: 35, max: 54, weight: 175, ilvl: 62 },
                { tier: 3, min: 18, max: 34, weight: 400, ilvl: 40 },
                { tier: 4, min: 6, max: 17, weight: 900, ilvl: 1 }
            ]
        },
},

    suffixes: {

        // --- ATTRIBUTES ---
        // Strength is primary for a melee weapon — raw physical power.
        // Better weight than agility or intelligence on this slot.
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

        // --- ACCURACY ---
        // Melee strikes can miss — accuracy is a meaningful suffix here.
        // The weapon is the most natural home for melee accuracy, so it
        // rolls with the best weights of any slot for this stat.
        // Values are higher than bracers/gloves/armour slots — if you
        // want reliable melee strikes, invest prefix budget in accuracy
        // or accept occasional misses.
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 301, max: 450, weight: 120, ilvl: 80 },
                { tier: 2, min: 151, max: 300, weight: 240, ilvl: 60 },
                { tier: 3, min: 76, max: 150, weight: 500, ilvl: 40 },
                { tier: 4, min: 36, max: 75, weight: 1000, ilvl: 20 },
                { tier: 5, min: 10, max: 35, weight: 2000, ilvl: 1 }
            ]
        },

        // --- LIFE LEECH ---
        // The blade draws life from the wound. Higher ceiling than
        // bracers/earring/ring equivalents — melee strikes fire less
        // often but are larger single instances of damage, making
        // leech per-hit more impactful here. Still lower than the
        // chest's prefix version since that is a larger slot.
        life_leech: {
            id: 'life_leech',
            label: 'Gain #% of Melee Strike Damage as Life', labelDe: 'Erhalte #% des Nahkampfschadens als Leben',
            tiers: [
                { tier: 1, min: 2.5, max: 4.0, weight: 80, ilvl: 82 },
                { tier: 2, min: 1.5, max: 2.4, weight: 200, ilvl: 60 },
                { tier: 3, min: 0.8, max: 1.4, weight: 480, ilvl: 35 },
                { tier: 4, min: 0.3, max: 0.7, weight: 1000, ilvl: 1 }
            ]
        },

        // --- ON-HIT STATUS EFFECTS ---
        // Delivered through the weapon itself on every melee strike.
        // Higher % values than bracers (which proc on any hit including
        // the frequent cell-reveal projectiles) to compensate for the
        // lower strike frequency — the weapon hits hard and less often,
        // so each hit should have a meaningful chance to apply a status.
        // All five status effects are available: the weapon is the
        // primary melee tool and can be built toward any elemental path.
        chance_to_ignite: {
            id: 'chance_to_ignite',
            label: '#% Chance to Ignite on Melee Strike', labelDe: '#% Chance auf Entzünden bei Nahkampfschlag',
            tiers: [
                { tier: 1, min: 28, max: 40, weight: 100, ilvl: 80 },
                { tier: 2, min: 18, max: 27, weight: 250, ilvl: 58 },
                { tier: 3, min: 9, max: 17, weight: 550, ilvl: 32 },
                { tier: 4, min: 3, max: 8, weight: 1100, ilvl: 1 }
            ]
        },
        chance_to_freeze: {
            id: 'chance_to_freeze',
            label: '#% Chance to Freeze on Melee Strike', labelDe: '#% Chance auf Einfrieren bei Nahkampfschlag',
            tiers: [
                { tier: 1, min: 24, max: 35, weight: 100, ilvl: 80 },
                { tier: 2, min: 15, max: 23, weight: 250, ilvl: 58 },
                { tier: 3, min: 7, max: 14, weight: 550, ilvl: 32 },
                { tier: 4, min: 2, max: 6, weight: 1100, ilvl: 1 }
            ]
        },
        chance_to_shock: {
            id: 'chance_to_shock',
            label: '#% Chance to Shock on Melee Strike', labelDe: '#% Chance auf Schock bei Nahkampfschlag',
            tiers: [
                { tier: 1, min: 28, max: 40, weight: 100, ilvl: 80 },
                { tier: 2, min: 18, max: 27, weight: 250, ilvl: 58 },
                { tier: 3, min: 9, max: 17, weight: 550, ilvl: 32 },
                { tier: 4, min: 3, max: 8, weight: 1100, ilvl: 1 }
            ]
        },
        chance_to_blind: {
            id: 'chance_to_blind',
            label: '#% Chance to Blind on Melee Strike', labelDe: '#% Chance auf Blendung bei Nahkampfschlag',
            tiers: [
                { tier: 1, min: 30, max: 45, weight: 110, ilvl: 78 },
                { tier: 2, min: 19, max: 29, weight: 270, ilvl: 55 },
                { tier: 3, min: 10, max: 18, weight: 580, ilvl: 30 },
                { tier: 4, min: 3, max: 9, weight: 1150, ilvl: 1 }
            ]
        },
        ailment_duration: {
            id: 'ailment_duration',
            label: '#% increased Duration of Player-Applied Ailments', labelDe: '#% längere Dauer von durch den Spieler verursachten Leiden',
            tiers: [
                { tier: 1, min: 20, max: 35, weight: 100, ilvl: 70 },
                { tier: 2, min: 10, max: 19, weight: 300, ilvl: 30 },
                { tier: 3, min: 4, max: 9, weight: 800, ilvl: 1 }
            ]
        },
        ailment_effect: {
            id: 'ailment_effect',
            label: '#% increased Effect of Player-Applied Ailments', labelDe: '#% stärkere, durch den Spieler verursachte Leiden',
            tiers: [
                { tier: 1, min: 15, max: 25, weight: 100, ilvl: 70 },
                { tier: 2, min: 8, max: 14, weight: 300, ilvl: 30 },
                { tier: 3, min: 3, max: 7, weight: 800, ilvl: 1 }
            ]
        },
        chance_to_convert: {
            id: 'chance_to_convert',
            // Shadow-locked, rarest status — only the most powerful
            // shadow weapon can compel a monster to turn on its allies.
            label: '#% Chance to Convert on Melee Strike', labelDe: '#% Chance zur Umwandlung bei Nahkampfschlag',
            tiers: [
                { tier: 1, min: 12, max: 18, weight: 45, ilvl: 84 },
                { tier: 2, min: 7, max: 11, weight: 120, ilvl: 65 },
                { tier: 3, min: 2, max: 6, weight: 320, ilvl: 1 }
            ]
        },

        // --- WEAPON-EXCLUSIVE: CLEAVE ---
        // A wide sweeping strike that hits every monster sharing the
        // same spawn location as the target. Since each spawn location
        // can hold multiple monsters, this turns the melee strike from
        // a single-target hit into a cluster-clearing blow.
        // Competes with status effects and leech for suffix budget —
        // you can cleave, or you can reliably ignite, but not both
        // on the same suffix slots. Higher tier values make cleave a
        // build-defining mechanic for dense spawn locations.
        cleave: {
            id: 'cleave',
            label: '#% Chance for Melee Strikes to hit all Monsters\nin the target\'s Spawn Location', labelDe: '#% Chance, dass Nahkampfschläge alle Monster\nam Spawnpunkt des Ziels treffen',
            tiers: [
                { tier: 1, min: 35, max: 50, weight: 75, ilvl: 84 },
                { tier: 2, min: 22, max: 34, weight: 190, ilvl: 64 },
                { tier: 3, min: 10, max: 21, weight: 440, ilvl: 40 },
                { tier: 4, min: 3, max: 9, weight: 950, ilvl: 1 }
            ]
        },
}
};

// One-handed melee table (main-hand + dual-wield off-hand). Identical to the
// legacy WEAPON1 pool — kept as an alias so old references keep working.
const EG_MOD_TABLE_WEAPON_1H = EG_MOD_TABLE_WEAPON1;

// 1H-exclusive: Parry (dual-wield defense identity). Two-handed weapons are
// pure offense and can never roll this — choosing 2H means giving up parry,
// exactly like giving up block by dropping the shield.
EG_MOD_TABLE_WEAPON_1H.suffixes.parry = {
    id: 'parry',
    label: '#% Chance to Parry Attacks while holding [R]', labelDe: '#% Chance, Angriffe beim Halten von [R] zu parieren',
    tiers: [
        { tier: 1, min: 12, max: 18, weight: 100, ilvl: 80 },
        { tier: 2, min: 6, max: 11, weight: 240, ilvl: 40 },
        { tier: 3, min: 2, max: 5, weight: 600, ilvl: 1 }
    ]
};

