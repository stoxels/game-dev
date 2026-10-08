import { t } from '../translation/translations.js';

//------------------------------------------------------------------------
//-------------------MONSTER DEFINITIONS----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// baseHP / baseDamage are level-1 values.
// chargeMax (seconds to fill the attack bar) does NOT scale with level.
// isBoss: true entries are only spawned via cur.hasBoss / cur.bosses.
//
// element: damage type of the monster's attacks ('fire'|'cold'|'lightning'|'shadow').
// Monsters without an element deal pure physical damage (only armour mitigates it).
// resistances: % reduction of incoming player damage per element (capped at 75%).
// Elemental monsters resist their own element.

export const EG_MONSTER_DEFS = {
    // TIER 1 - Weak / fast
    slime: {
        id: 'slime', name: t('eg_mon_slime'), emoji: '🟢',
        baseHP: 30, baseDamage: 8, chargeMax: 10, attackType: 'melee', // Melee only
        element: 'cold', resistances: { cold: 20 }
    },
    ghost: {
        id: 'ghost', name: t('eg_mon_ghost'), emoji: '👻',
        baseHP: 50, baseDamage: 2, chargeMax: 6, // Defaults to ranged
        element: 'shadow', resistances: { shadow: 20 }
    },
    bat: {
        id: 'bat', name: t('eg_mon_bat'), emoji: '🦇',
        baseHP: 25, baseDamage: 5, chargeMax: 5, attackType: 'melee' // Melee only
    },
    rat: {
        id: 'rat', name: t('eg_mon_rat'), emoji: '🐀',
        baseHP: 26, baseDamage: 3, chargeMax: 4, attackType: 'melee'
    },

    // TIER 2 - Medium / balanced
    crab: {
        id: 'crab', name: t('eg_mon_crab'), emoji: '🦀',
        baseHP: 70, baseDamage: 11, chargeMax: 12, attackType: 'melee'
    },
    snake: {
        id: 'snake', name: t('eg_mon_snake'), emoji: '🐍',
        baseHP: 59, baseDamage: 14, chargeMax: 14, attackType: 'both', // Uses random mix!
        element: 'arcane' // Polymorph chaos curse
    },
    skull: {
        id: 'skull', name: t('eg_mon_skull'), emoji: '💀',
        baseHP: 76, baseDamage: 10, chargeMax: 9,
        element: 'shadow', resistances: { shadow: 25 }
    },

    // TIER 3 - Tanky / hard-hitting
    golem: {
        id: 'golem', name: t('eg_mon_golem'), emoji: '🗿',
        baseHP: 86, baseDamage: 16, chargeMax: 15, attackType: 'melee'
    },
    dragon: {
        id: 'dragon', name: t('eg_mon_dragon'), emoji: '🐉',
        baseHP: 130, baseDamage: 22, chargeMax: 14, attackType: 'both', // Uses random mix!
        element: 'fire', resistances: { fire: 30 }
    },
    demon: {
        id: 'demon', name: t('eg_mon_demon'), emoji: '😈',
        baseHP: 108, baseDamage: 29, chargeMax: 16,
        element: 'shadow', resistances: { shadow: 30 }
    },
    golem_iron: {
        id: 'golem_iron', name: t('eg_mon_golem_iron'), emoji: '🤖',
        baseHP: 162, baseDamage: 13, chargeMax: 13, attackType: 'melee',
        element: 'lightning', resistances: { lightning: 30 }
    },
    werewolf: {
        id: 'werewolf', name: t('eg_mon_werewolf'), emoji: '🐺',
        baseHP: 97, baseDamage: 19, chargeMax: 11, attackType: 'both', // Uses random mix!
        element: 'arcane' // Polymorph chaos curse
    },
    ogre: {
        id: 'ogre', name: t('eg_mon_ogre'), emoji: '👹',
        baseHP: 119, baseDamage: 26, chargeMax: 18, attackType: 'melee'
    },

    // TIER 1 - Weak / fast
    beetle: {
        id: 'beetle',
        name: t('eg_mon_beetle'),
        emoji: '🪲',
        baseHP: 35,
        baseDamage: 6,
        chargeMax: 7,
        attackType: 'melee'
    },

    bee: {
        id: 'bee',
        name: t('eg_mon_bee'),
        emoji: '🐝',
        baseHP: 26,
        baseDamage: 8,
        chargeMax: 4,
        attackType: 'both',
        element: 'lightning',
        resistances: { lightning: 20 }
    },

    spider: {
        id: 'spider',
        name: t('eg_mon_spider'),
        emoji: '🕷️',
        baseHP: 28,
        baseDamage: 10,
        chargeMax: 6,
        attackType: 'melee',
        element: 'shadow',
        resistances: { shadow: 20 }
    },

    mosquito: {
        id: 'mosquito',
        name: t('eg_mon_mosquito'),
        emoji: '🦟',
        baseHP: 24,
        baseDamage: 6,
        chargeMax: 3,
        attackType: 'both'
    },

    // TIER 2 - Medium / balanced
    scorpion: {
        id: 'scorpion',
        name: t('eg_mon_scorpion'),
        emoji: '🦂',
        baseHP: 81,
        baseDamage: 13,
        chargeMax: 13,
        attackType: 'melee'
    },

    eye: {
        id: 'eye',
        name: t('eg_mon_eye'),
        emoji: '👁️',
        baseHP: 65,
        baseDamage: 16,
        chargeMax: 8,
        attackType: 'ranged',
        element: 'shadow',
        resistances: { shadow: 25 }
    },

    troll: {
        id: 'troll',
        name: t('eg_mon_troll'),
        emoji: '🧌',
        baseHP: 92,
        baseDamage: 14,
        chargeMax: 15,
        attackType: 'melee'
    },

    crystal: {
        id: 'crystal',
        name: t('eg_mon_crystal'),
        emoji: '💎',
        baseHP: 76,
        baseDamage: 11,
        chargeMax: 10,
        attackType: 'ranged',
        element: 'cold',
        resistances: { cold: 25 }
    },

    crocodile: {
        id: 'crocodile',
        name: t('eg_mon_crocodile'),
        emoji: '🐊',
        baseHP: 86,
        baseDamage: 18,
        chargeMax: 16,
        attackType: 'melee'
    },

    // TIER 3 - Tanky / hard-hitting
    brain: {
        id: 'brain',
        name: t('eg_mon_brain'),
        emoji: '🧠',
        baseHP: 140,
        baseDamage: 24,
        chargeMax: 18,
        attackType: 'ranged',
        element: 'shadow',
        resistances: { shadow: 30 }
    },

    oni: {
        id: 'oni',
        name: t('eg_mon_oni'),
        emoji: '👹',
        baseHP: 151,
        baseDamage: 27,
        chargeMax: 20,
        attackType: 'both',
        element: 'fire',
        resistances: { fire: 30 }
    },

    alien: {
        id: 'alien',
        name: t('eg_mon_alien'),
        emoji: '👾',
        baseHP: 119,
        baseDamage: 32,
        chargeMax: 16,
        attackType: 'both',
        element: 'lightning',
        resistances: { lightning: 30 }
    },

    rhino: {
        id: 'rhino',
        name: t('eg_mon_rhino'),
        emoji: '🦏',
        baseHP: 173,
        baseDamage: 22,
        chargeMax: 17,
        attackType: 'melee'
    },

    skull_lord: {
        id: 'skull_lord',
        name: t('eg_mon_skull_lord'),
        emoji: '☠️',
        baseHP: 135,
        baseDamage: 35,
        chargeMax: 15,
        attackType: 'ranged',
        element: 'shadow',
        resistances: { shadow: 30 }
    },

    bison: {
        id: 'bison',
        name: t('eg_mon_bison'),
        emoji: '🦬',
        baseHP: 184,
        baseDamage: 21,
        chargeMax: 18,
        attackType: 'melee'
    },

    // TIER 1 - Weak / fast

    ant: {
        id: 'ant',
        name: t('eg_mon_ant'),
        emoji: '🐜',
        baseHP: 24,
        baseDamage: 5,
        chargeMax: 4,
        attackType: 'melee'
    },

    ladybug: {
        id: 'ladybug',
        name: t('eg_mon_ladybug'),
        emoji: '🐞',
        baseHP: 26,
        baseDamage: 6,
        chargeMax: 5,
        attackType: 'both'
    },

    owl: {
        id: 'owl',
        name: t('eg_mon_owl'),
        emoji: '🦉',
        baseHP: 32,
        baseDamage: 8,
        chargeMax: 7,
        attackType: 'ranged'
    },

    frog: {
        id: 'frog',
        name: t('eg_mon_frog'),
        emoji: '🐸',
        baseHP: 30,
        baseDamage: 6,
        chargeMax: 5,
        attackType: 'melee',
        element: 'cold',
        resistances: { cold: 20 }
    },

    moth: {
        id: 'moth',
        name: t('eg_mon_moth'),
        emoji: '🦋',
        baseHP: 26,
        baseDamage: 10,
        chargeMax: 4,
        attackType: 'ranged'
    },

    // TIER 2 - Medium

    gorilla: {
        id: 'gorilla',
        name: t('eg_mon_gorilla'),
        emoji: '🦍',
        baseHP: 103,
        baseDamage: 16,
        chargeMax: 17,
        attackType: 'melee'
    },

    lion: {
        id: 'lion',
        name: t('eg_mon_lion'),
        emoji: '🦁',
        baseHP: 86,
        baseDamage: 19,
        chargeMax: 14,
        attackType: 'melee'
    },

    tiger: {
        id: 'tiger',
        name: t('eg_mon_tiger'),
        emoji: '🐅',
        baseHP: 81,
        baseDamage: 21,
        chargeMax: 12,
        attackType: 'both'
    },

    wizard: {
        id: 'wizard',
        name: t('eg_mon_wizard'),
        emoji: '🧙',
        baseHP: 76,
        baseDamage: 18,
        chargeMax: 9,
        attackType: 'ranged',
        element: 'lightning',
        resistances: { lightning: 25 }
    },

    genie: {
        id: 'genie',
        name: t('eg_mon_genie'),
        emoji: '🧞',
        baseHP: 92,
        baseDamage: 14,
        chargeMax: 10,
        attackType: 'both',
        element: 'lightning',
        resistances: { lightning: 25 }
    },

    pumpkin: {
        id: 'pumpkin',
        name: t('eg_mon_pumpkin'),
        emoji: '🎃',
        baseHP: 97,
        baseDamage: 13,
        chargeMax: 13,
        attackType: 'ranged',
        element: 'fire',
        resistances: { fire: 25 }
    },

    // TIER 3 - Strong

    vampire: {
        id: 'vampire',
        name: t('eg_mon_vampire'),
        emoji: '🧛',
        baseHP: 140,
        baseDamage: 29,
        chargeMax: 18,
        attackType: 'both',
        element: 'shadow',
        resistances: { shadow: 30 }
    },

    zombie: {
        id: 'zombie',
        name: t('eg_mon_zombie'),
        emoji: '🧟',
        baseHP: 194,
        baseDamage: 19,
        chargeMax: 17,
        attackType: 'melee',
        element: 'shadow',
        resistances: { shadow: 20 }
    },

    unicorn: {
        id: 'unicorn',
        name: t('eg_mon_unicorn'),
        emoji: '🦄',
        baseHP: 130,
        baseDamage: 27,
        chargeMax: 13,
        attackType: 'ranged',
        element: 'lightning',
        resistances: { lightning: 30 }
    },

    ufo: {
        id: 'ufo',
        name: t('eg_mon_ufo'),
        emoji: '🛸',
        baseHP: 151,
        baseDamage: 30,
        chargeMax: 13,
        attackType: 'both',
        element: 'lightning',
        resistances: { lightning: 30 }
    },

    volcano: {
        id: 'volcano',
        name: t('eg_mon_volcano'),
        emoji: '🌋',
        baseHP: 216,
        baseDamage: 24,
        chargeMax: 20,
        attackType: 'ranged',
        element: 'fire',
        resistances: { fire: 35 }
    },

    cyclone: {
        id: 'cyclone',
        name: t('eg_mon_cyclone'),
        emoji: '🌪️',
        baseHP: 135,
        baseDamage: 34,
        chargeMax: 12,
        attackType: 'both',
        element: 'lightning',
        resistances: { lightning: 30 }
    },

    meteor: {
        id: 'meteor',
        name: t('eg_mon_meteor'),
        emoji: '☄️',
        baseHP: 173,
        baseDamage: 38,
        chargeMax: 16,
        attackType: 'ranged',
        element: 'fire',
        resistances: { fire: 35 }
    },

    moon: {
        id: 'moon',
        name: t('eg_mon_moon'),
        emoji: '🌙',
        baseHP: 157,
        baseDamage: 29,
        chargeMax: 14,
        attackType: 'ranged',
        element: 'cold',
        resistances: { cold: 30 }
    },

    starspawn: {
        id: 'starspawn',
        name: t('eg_mon_starspawn'),
        emoji: '⭐',
        baseHP: 184,
        baseDamage: 35,
        chargeMax: 16,
        attackType: 'both',
        element: 'shadow',
        resistances: { shadow: 30 }
    }




};
