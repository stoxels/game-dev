//  endgame-mod-tables-shield.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
//------------------------------------------------------------------------
//-------------------SHIELD MODIFIER TABLE--------------------------------
//------------------------------------------------------------------------
// Defensive-only derivative of EG_MOD_TABLE_WEAPON2. Shields must not
// roll offensive stats (spell damage / channel are offhand-item identity,
// attack mods live on WEAPON1), so those families are stripped here while
// everything else — local defences, block & dodge suffixes, shield_bash,
// attributes, regen and utility — carries over unchanged.

const EG_MOD_TABLE_SHIELD = (() => {
    const offensivePrefixIds = ['spell_damage', 'inc_spell_damage', 'channel'];
    return {
        prefixes: Object.fromEntries(
            Object.entries(EG_MOD_TABLE_WEAPON2.prefixes)
                .filter(([id]) => !offensivePrefixIds.includes(id))
        ),
        suffixes: { ...EG_MOD_TABLE_WEAPON2.suffixes,
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
},
    };
})();

// In: endgame-mod-tables.js
// Replace the empty EG_MOD_TABLE_RANGED at the bottom of the file

const EG_MOD_TABLE_RANGED = {
    prefixes: {

        // --- FLAT PHYSICAL DAMAGE ---
        // Lower ceiling than melee weapon since projectiles fire on
        // every correct cell reveal — high frequency compensates.
        flat_physical_damage: {
            id: 'flat_physical_damage',
            label: 'Adds # to @ Physical Damage to Projectiles', labelDe: 'Fügt Projektilen # bis @ physischen Schaden hinzu',
            tiers: [
                { tier: 1, min1: 28, max1: 44, min2: 76, max2: 112, weight: 110, ilvl: 80 },
                { tier: 2, min1: 16, max1: 26, min2: 48, max2: 74, weight: 250, ilvl: 60 },
                { tier: 3, min1: 8, max1: 14, min2: 24, max2: 46, weight: 520, ilvl: 35 },
                { tier: 4, min1: 2, max1: 6, min2: 10, max2: 22, weight: 1050, ilvl: 1 }
            ]
        },

        // --- % INCREASED PHYSICAL DAMAGE ---
        inc_physical_damage: {
            id: 'inc_physical_damage',
            label: '#% increased Physical Damage', labelDe: '#% erhöhter physischer Schaden',
            tiers: [
                { tier: 1, min: 64, max: 88, weight: 90, ilvl: 82 },
                { tier: 2, min: 40, max: 62, weight: 220, ilvl: 62 },
                { tier: 3, min: 19, max: 38, weight: 500, ilvl: 38 },
                { tier: 4, min: 6, max: 18, weight: 1050, ilvl: 1 }
            ]
        },

        // --- FLAT ELEMENTAL DAMAGE ---
        // Lower than melee weapon, on par with amulet/ring since
        // projectiles fire frequently. Choose one element per build
        // — a prefix slot competes with physical damage and crit.
        fire_damage: {
            id: 'fire_damage',
            label: 'Adds # to @ Fire Damage to Projectiles', labelDe: 'Fügt Projektilen # bis @ Feuerschaden hinzu',
            tiers: [
                { tier: 1, min1: 30, max1: 48, min2: 84, max2: 120, weight: 110, ilvl: 80 },
                { tier: 2, min1: 18, max1: 28, min2: 52, max2: 82, weight: 250, ilvl: 60 },
                { tier: 3, min1: 8, max1: 16, min2: 26, max2: 50, weight: 500, ilvl: 35 },
                { tier: 4, min1: 2, max1: 6, min2: 10, max2: 24, weight: 1000, ilvl: 1 }
            ]
        },
        cold_damage: {
            id: 'cold_damage',
            label: 'Adds # to @ Cold Damage to Projectiles', labelDe: 'Fügt Projektilen # bis @ Kälteschaden hinzu',
            tiers: [
                { tier: 1, min1: 26, max1: 40, min2: 72, max2: 104, weight: 110, ilvl: 80 },
                { tier: 2, min1: 16, max1: 24, min2: 44, max2: 70, weight: 250, ilvl: 60 },
                { tier: 3, min1: 8, max1: 16, min2: 22, max2: 42, weight: 500, ilvl: 35 },
                { tier: 4, min1: 2, max1: 6, min2: 8, max2: 20, weight: 1000, ilvl: 1 }
            ]
        },
        lightning_damage: {
            id: 'lightning_damage',
            label: 'Adds # to @ Lightning Damage to Projectiles', labelDe: 'Fügt Projektilen # bis @ Blitzschaden hinzu',
            tiers: [
                { tier: 1, min1: 8, max1: 20, min2: 92, max2: 140, weight: 110, ilvl: 80 },
                { tier: 2, min1: 4, max1: 12, min2: 56, max2: 90, weight: 250, ilvl: 60 },
                { tier: 3, min1: 2, max1: 8, min2: 28, max2: 54, weight: 500, ilvl: 35 },
                { tier: 4, min1: 2, max1: 4, min2: 10, max2: 26, weight: 1000, ilvl: 1 }
            ]
        },
        shadow_damage: {
            id: 'shadow_damage',
            label: 'Adds # to @ Shadow Damage to Projectiles', labelDe: 'Fügt Projektilen # bis @ Schattenschaden hinzu',
            tiers: [
                { tier: 1, min1: 22, max1: 34, min2: 60, max2: 92, weight: 75, ilvl: 82 },
                { tier: 2, min1: 12, max1: 20, min2: 36, max2: 58, weight: 170, ilvl: 62 },
                { tier: 3, min1: 6, max1: 10, min2: 18, max2: 34, weight: 370, ilvl: 38 },
                { tier: 4, min1: 2, max1: 4, min2: 6, max2: 16, weight: 800, ilvl: 1 }
            ]
        },

        // --- CRITICAL STRIKES ---
        // On par with bracers — projectiles fire often so crit chance
        // translates to frequent procs. Intentionally below melee weapon
        // ceiling since ranged already benefits from sheer frequency.
        crit_chance: {
            id: 'crit_chance',
            label: '+#% Critical Strike Chance', labelDe: '+#% kritische Trefferchance',
            tiers: [
                { tier: 1, min: 9, max: 14, weight: 90, ilvl: 80 },
                { tier: 2, min: 6, max: 8, weight: 220, ilvl: 60 },
                { tier: 3, min: 3, max: 5, weight: 520, ilvl: 35 },
                { tier: 4, min: 2, max: 2, weight: 1050, ilvl: 1 }
            ]
        },
        crit_multiplier: {
            id: 'crit_multiplier',
            label: '+#% to Critical Strike Multiplier', labelDe: '+#% zum kritischen Schadensmultiplikator',
            tiers: [
                { tier: 1, min: 45, max: 62, weight: 70, ilvl: 82 },
                { tier: 2, min: 28, max: 44, weight: 175, ilvl: 62 },
                { tier: 3, min: 14, max: 27, weight: 400, ilvl: 40 },
                { tier: 4, min: 5, max: 13, weight: 900, ilvl: 1 }
            ]
        },

        // --- RANGED-EXCLUSIVE: PIERCE ---
        // The projectile passes through its primary target and continues
        // to hit the next monster behind it (in a different spawn
        // location along the same trajectory). A single-target reveal
        // becomes a two-for-one when pierce fires, making it especially
        // strong on dense maps. Does not chain further — only one extra
        // target. Competes with elemental damage and crit for prefix
        // budget.
        pierce: {
            id: 'pierce',
            label: '#% Chance for Projectiles to Pierce through\ntheir target and hit another Monster', labelDe: '#% Chance, dass Projektile ihr Ziel durchbohren und\nein weiteres Monster treffen',
            tiers: [
                { tier: 1, min: 28, max: 40, weight: 75, ilvl: 84 },
                { tier: 2, min: 17, max: 27, weight: 190, ilvl: 64 },
                { tier: 3, min: 8, max: 16, weight: 440, ilvl: 40 },
                { tier: 4, min: 2, max: 7, weight: 960, ilvl: 1 }
            ]
        },
},

    suffixes: {

        // --- ATTRIBUTES ---
        // Agility is primary for a ranged weapon — the steady aim and
        // quick draw. Rolls with better weight than strength or intelligence.
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

        // --- ACCURACY ---
        // Projectiles can miss — the highest-weight accuracy slot after
        // the melee weapon. A ranged build should invest here to make
        // every reveal count. Better weights than bracers/armour slots.
        accuracy: {
            id: 'accuracy',
            label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
            tiers: [
                { tier: 1, min: 301, max: 450, weight: 130, ilvl: 80 },
                { tier: 2, min: 151, max: 300, weight: 260, ilvl: 60 },
                { tier: 3, min: 76, max: 150, weight: 530, ilvl: 40 },
                { tier: 4, min: 36, max: 75, weight: 1050, ilvl: 20 },
                { tier: 5, min: 10, max: 35, weight: 2100, ilvl: 1 }
            ]
        },

        // --- LIFE LEECH ---
        // Each projectile drains a fraction of the damage dealt as life.
        // Lower ceiling than the melee weapon's leech suffix since
        // projectiles fire much more often — the frequent procs more
        // than compensate for the smaller per-hit %.
        life_leech: {
            id: 'life_leech',
            label: 'Gain #% of Projectile Damage as Life', labelDe: 'Erhalte #% des Projektilschadens als Leben',
            tiers: [
                { tier: 1, min: 1.5, max: 2.5, weight: 80, ilvl: 82 },
                { tier: 2, min: 0.8, max: 1.4, weight: 200, ilvl: 60 },
                { tier: 3, min: 0.4, max: 0.7, weight: 480, ilvl: 35 },
                { tier: 4, min: 0.1, max: 0.3, weight: 1000, ilvl: 10 }
            ]
        },

        // --- ON-HIT STATUS EFFECTS ---
        // Lower % than the melee weapon because projectiles fire on
        // every correct cell reveal — even modest chances produce many
        // procs over a map. Balanced around roughly the same expected
        // procs-per-map as the melee weapon's higher-per-hit values.
        chance_to_ignite: {
            id: 'chance_to_ignite',
            label: '#% Chance to Ignite on Projectile Hit', labelDe: '#% Chance auf Entzünden bei Projekiltreffer',
            tiers: [
                { tier: 1, min: 16, max: 24, weight: 100, ilvl: 80 },
                { tier: 2, min: 10, max: 15, weight: 250, ilvl: 58 },
                { tier: 3, min: 5, max: 9, weight: 550, ilvl: 32 },
                { tier: 4, min: 2, max: 4, weight: 1100, ilvl: 8 }
            ]
        },
        chance_to_freeze: {
            id: 'chance_to_freeze',
            label: '#% Chance to Freeze on Projectile Hit', labelDe: '#% Chance auf Einfrieren bei Projekiltreffer',
            tiers: [
                { tier: 1, min: 13, max: 20, weight: 100, ilvl: 80 },
                { tier: 2, min: 8, max: 12, weight: 250, ilvl: 58 },
                { tier: 3, min: 4, max: 7, weight: 550, ilvl: 32 },
                { tier: 4, min: 1, max: 3, weight: 1100, ilvl: 1 }
            ]
        },
        chance_to_shock: {
            id: 'chance_to_shock',
            label: '#% Chance to Shock on Projectile Hit', labelDe: '#% Chance auf Schock bei Projekiltreffer',
            tiers: [
                { tier: 1, min: 16, max: 24, weight: 100, ilvl: 80 },
                { tier: 2, min: 10, max: 15, weight: 250, ilvl: 58 },
                { tier: 3, min: 5, max: 9, weight: 550, ilvl: 32 },
                { tier: 4, min: 2, max: 4, weight: 1100, ilvl: 1 }
            ]
        },
        chance_to_blind: {
            id: 'chance_to_blind',
            label: '#% Chance to Blind on Projectile Hit', labelDe: '#% Chance auf Blendung bei Projekiltreffer',
            tiers: [
                { tier: 1, min: 18, max: 27, weight: 110, ilvl: 78 },
                { tier: 2, min: 11, max: 17, weight: 270, ilvl: 55 },
                { tier: 3, min: 5, max: 10, weight: 580, ilvl: 30 },
                { tier: 4, min: 2, max: 4, weight: 1150, ilvl: 1 }
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
            label: '#% Chance to Convert on Projectile Hit', labelDe: '#% Chance zur Umwandlung bei Projekiltreffer',
            tiers: [
                { tier: 1, min: 7, max: 11, weight: 45, ilvl: 84 },
                { tier: 2, min: 4, max: 6, weight: 120, ilvl: 65 },
                { tier: 3, min: 1, max: 3, weight: 320, ilvl: 1 }
            ]
        },

        // --- RANGED-EXCLUSIVE: SNIPE ---
        // When the targeted monster is the only occupant of its spawn
        // location (no allies sharing the cell), the shot is a Snipe
        // and deals bonus damage. Rewards targeting isolated monsters
        // over clustered ones, creating a genuine decision: pierce/splash
        // rewards hitting groups, snipe rewards isolating targets.
        // The # value is the % bonus damage on a Snipe.
        snipe: {
            id: 'snipe',
            label: 'Projectiles deal #% more Damage against Monsters\nthat are alone in their Spawn Location (Snipe)', labelDe: 'Projektile verursachen #% mehr Schaden gegen Monster,\ndie allein an ihrem Spawnpunkt stehen (Scharfschuss)',
            tiers: [
                { tier: 1, min: 45, max: 65, weight: 75, ilvl: 84 },
                { tier: 2, min: 28, max: 44, weight: 190, ilvl: 64 },
                { tier: 3, min: 14, max: 27, weight: 440, ilvl: 40 },
                { tier: 4, min: 5, max: 13, weight: 960, ilvl: 1 }
            ]
        },
}
};

