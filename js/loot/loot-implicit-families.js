//----------------------------------------------------------------------
//------------------------IMPLICIT FAMILY TABLE-------------------------
//----------------------------------------------------------------------

// The data half of the implicit system. The rebalance IIFE at the bottom
// trims the top of the three pure stats so no base carries one alone.

// Each family defines a localized label template ('#' is the sole numeric
// placeholder, hybrid families use '#'+'@' and split labels with '\n') and
// the value ranges at the extremes of the level ladder:
//   lo - rolled when base required level == 1
//   hi - rolled when base required level == 90 (clamped above)
// Between those, min and max are linearly interpolated by t.
// Values are intentionally strong - roughly 60-80% of a top-tier explicit
// affix at endgame, and ~30% at level 1 so early implicits feel real.
export const EG_IMPLICIT_FAMILIES = {
    flat_health: {
        id: 'flat_health',
        label: '+# to Maximum Health', labelDe: '+# zu maximalem Leben',
        lo: { min: 12, max: 18 }, hi: { min: 68, max: 85 },
    },
    flat_mana: {
        id: 'flat_mana',
        label: '+# to Maximum Mana', labelDe: '+# zu maximalem Mana',
        lo: { min: 8, max: 13 }, hi: { min: 44, max: 62 },
    },
    strength: {
        id: 'strength',
        label: '+# to Strength', labelDe: '+# zu Stärke',
        lo: { min: 4, max: 6 }, hi: { min: 16, max: 22 },
    },
    agility: {
        id: 'agility',
        label: '+# to Agility', labelDe: '+# zu Beweglichkeit',
        lo: { min: 4, max: 6 }, hi: { min: 16, max: 22 },
    },
    intelligence: {
        id: 'intelligence',
        label: '+# to Intelligence', labelDe: '+# zu Intelligenz',
        lo: { min: 4, max: 6 }, hi: { min: 16, max: 22 },
    },
    fire_resist: {
        id: 'fire_resist',
        label: '+#% to Fire Resistance', labelDe: '+#% Feuerwiderstand',
        lo: { min: 7, max: 11 }, hi: { min: 22, max: 28 },
    },
    cold_resist: {
        id: 'cold_resist',
        label: '+#% to Cold Resistance', labelDe: '+#% Kältewiderstand',
        lo: { min: 7, max: 11 }, hi: { min: 22, max: 28 },
    },
    lightning_resist: {
        id: 'lightning_resist',
        label: '+#% to Lightning Resistance', labelDe: '+#% Blitzwiderstand',
        lo: { min: 7, max: 11 }, hi: { min: 22, max: 28 },
    },
    shadow_resist: {
        id: 'shadow_resist',
        label: '+#% to Shadow Resistance', labelDe: '+#% Schattenwiderstand',
        lo: { min: 5, max: 8 }, hi: { min: 15, max: 21 },
    },
    life_regen: {
        id: 'life_regen',
        label: 'Regenerate # Life per second', labelDe: 'Regeneriere # Leben pro Sekunde',
        lo: { min: 1, max: 2 }, hi: { min: 8, max: 12 },
    },
    mana_regen: {
        id: 'mana_regen',
        label: 'Regenerate # Mana every 5 seconds', labelDe: 'Regeneriere alle 5 Sekunden # Mana',
        lo: { min: 2, max: 4 }, hi: { min: 10, max: 16 },
    },
    // Local defenses - require base to have the stat (filtered like explicit locals)
    inc_armour: {
        id: 'inc_armour',
        label: '#% increased Armour', labelDe: '#% erhöhte Rüstung',
        lo: { min: 12, max: 18 }, hi: { min: 55, max: 80 },
    },
    inc_evasion: {
        id: 'inc_evasion',
        label: '#% increased Evasion', labelDe: '#% erhöhtes Ausweichen',
        lo: { min: 12, max: 18 }, hi: { min: 55, max: 80 },
    },
    inc_absorption: {
        id: 'inc_absorption',
        label: '#% increased Absorption', labelDe: '#% erhöhte Absorption',
        lo: { min: 12, max: 18 }, hi: { min: 55, max: 80 },
    },
    // Offense
    inc_physical_damage: {
        id: 'inc_physical_damage',
        label: '#% increased Physical Damage', labelDe: '#% erhöhter physischer Schaden',
        lo: { min: 8, max: 13 }, hi: { min: 38, max: 55 },
    },
    flat_physical_damage: {
        id: 'flat_physical_damage',
        label: 'Adds # to @ Physical Damage', labelDe: 'Fügt # bis @ physischen Schaden hinzu',
        // hybrid values - min1/max1 = low of physical range, min2/max2 = high
        lo: { min1: 2, max1: 4, min2: 5, max2: 9 }, hi: { min1: 14, max1: 22, min2: 28, max2: 44 },
    },
    crit_chance: {
        id: 'crit_chance',
        label: '+#% Critical Strike Chance', labelDe: '+#% kritische Trefferchance',
        lo: { min: 1, max: 2 }, hi: { min: 4, max: 6 },
    },
    crit_multiplier: {
        id: 'crit_multiplier',
        label: '+#% to Critical Strike Multiplier', labelDe: '+#% zum kritischen Schadensmultiplikator',
        lo: { min: 8, max: 12 }, hi: { min: 28, max: 40 },
    },
    spell_damage: {
        id: 'spell_damage',
        label: '+# to Spell Damage', labelDe: '+# zu Zauberschaden',
        lo: { min: 4, max: 7 }, hi: { min: 18, max: 28 },
    },
    accuracy: {
        id: 'accuracy',
        label: '+# to Accuracy', labelDe: '+# zu Genauigkeit',
        lo: { min: 12, max: 20 }, hi: { min: 80, max: 120 },
    },
    attack_speed: {
        id: 'attack_speed',
        label: 'Melee charges #s faster', labelDe: 'Nahkampf lädt #s schneller auf',
        // float seconds - stored as integer tenths? Keep 2 decimals display.
        lo: { min: 0.2, max: 0.4 }, hi: { min: 0.9, max: 1.4 },
        isFloat: true,
    },
    block_chance: {
        id: 'block_chance',
        label: '+#% to Block Chance', labelDe: '+#% Blockchance',
        lo: { min: 1, max: 2 }, hi: { min: 4, max: 6 },
    },
    dodge: {
        id: 'dodge',
        label: '+#% to Dodge Chance', labelDe: '+#% Ausweichchance',
        lo: { min: 2, max: 3 }, hi: { min: 6, max: 9 },
    },
};

// Rebalance 2026: implicits str/agi/int hi 16-22 -> 12-16 (factor ~0.73) so gear doesn't carry top pure alone.
(() => {
    const fams = ['strength','agility','intelligence'];
    for (const k of fams) {
        const fam = EG_IMPLICIT_FAMILIES[k];
        if (!fam || !fam.hi) continue;
        fam.hi.min = Math.round(fam.hi.min * 0.73);
        fam.hi.max = Math.round(fam.hi.max * 0.73);
        // lo stays 4-6 as starter feel
    }
})();
