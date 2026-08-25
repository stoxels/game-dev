//------------------------------------------------------------------------
//-------------------CONSTANTS & DATA DEFINITIONS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Monster level scaling 
// Applied per level above 1. 
const EG_LEVEL_HP_SCALE = 0.12; // +12% HP per level above 1
const EG_LEVEL_DAMAGE_SCALE = 0.12; // +12% damage per level above 1

// Hard cap on how many monsters (including bosses) can be alive simultaneously.
// New spawns are silently dropped until a slot opens.
const EG_MAX_CONCURRENT_MONSTERS = 4;



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

const EG_MONSTER_DEFS = {
    // TIER 1 — Weak / fast
    slime: {
        id: 'slime', name: t('eg_mon_slime'), emoji: '🟢',
        baseHP: 30, baseDamage: 5, chargeMax: 10, attackType: 'melee', // Melee only
        element: 'cold', resistances: { cold: 20 }
    },
    ghost: {
        id: 'ghost', name: t('eg_mon_ghost'), emoji: '👻',
        baseHP: 50, baseDamage: 1, chargeMax: 6, // Defaults to ranged
        element: 'shadow', resistances: { shadow: 20 }
    },
    bat: {
        id: 'bat', name: t('eg_mon_bat'), emoji: '🦇',
        baseHP: 25, baseDamage: 3, chargeMax: 5, attackType: 'melee' // Melee only
    },
    rat: {
        id: 'rat', name: t('eg_mon_rat'), emoji: '🐀',
        baseHP: 20, baseDamage: 2, chargeMax: 4, attackType: 'melee'
    },

    // TIER 2 — Medium / balanced
    crab: {
        id: 'crab', name: t('eg_mon_crab'), emoji: '🦀',
        baseHP: 65, baseDamage: 7, chargeMax: 12, attackType: 'melee'
    },
    snake: {
        id: 'snake', name: t('eg_mon_snake'), emoji: '🐍',
        baseHP: 55, baseDamage: 9, chargeMax: 14, attackType: 'both', // Uses random mix!
        element: 'arcane' // Polymorph chaos curse
    },
    skull: {
        id: 'skull', name: t('eg_mon_skull'), emoji: '💀',
        baseHP: 70, baseDamage: 6, chargeMax: 9,
        element: 'shadow', resistances: { shadow: 25 }
    },

    // TIER 3 — Tanky / hard-hitting
    golem: {
        id: 'golem', name: t('eg_mon_golem'), emoji: '🗿',
        baseHP: 80, baseDamage: 10, chargeMax: 20, attackType: 'melee'
    },
    dragon: {
        id: 'dragon', name: t('eg_mon_dragon'), emoji: '🐉',
        baseHP: 120, baseDamage: 14, chargeMax: 18, attackType: 'both', // Uses random mix!
        element: 'fire', resistances: { fire: 30 }
    },
    demon: {
        id: 'demon', name: t('eg_mon_demon'), emoji: '😈',
        baseHP: 100, baseDamage: 18, chargeMax: 22,
        element: 'shadow', resistances: { shadow: 30 }
    },
    golem_iron: {
        id: 'golem_iron', name: t('eg_mon_golem_iron'), emoji: '🤖',
        baseHP: 150, baseDamage: 8, chargeMax: 16, attackType: 'melee',
        element: 'lightning', resistances: { lightning: 30 }
    },
    werewolf: {
        id: 'werewolf', name: t('eg_mon_werewolf'), emoji: '🐺',
        baseHP: 90, baseDamage: 12, chargeMax: 11, attackType: 'both', // Uses random mix!
        element: 'arcane' // Polymorph chaos curse
    },
    ogre: {
        id: 'ogre', name: t('eg_mon_ogre'), emoji: '👹',
        baseHP: 110, baseDamage: 16, chargeMax: 25, attackType: 'melee'
    },

    // TIER 1 — Weak / fast
    beetle: {
        id: 'beetle',
        name: t('eg_mon_beetle'),
        emoji: '🪲',
        baseHP: 35,
        baseDamage: 4,
        chargeMax: 7,
        attackType: 'melee'
    },

    bee: {
        id: 'bee',
        name: t('eg_mon_bee'),
        emoji: '🐝',
        baseHP: 22,
        baseDamage: 5,
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
        baseDamage: 6,
        chargeMax: 6,
        attackType: 'melee',
        element: 'shadow',
        resistances: { shadow: 20 }
    },

    mosquito: {
        id: 'mosquito',
        name: t('eg_mon_mosquito'),
        emoji: '🦟',
        baseHP: 18,
        baseDamage: 4,
        chargeMax: 3,
        attackType: 'both'
    },

    // TIER 2 — Medium / balanced
    scorpion: {
        id: 'scorpion',
        name: t('eg_mon_scorpion'),
        emoji: '🦂',
        baseHP: 75,
        baseDamage: 8,
        chargeMax: 13,
        attackType: 'melee'
    },

    eye: {
        id: 'eye',
        name: t('eg_mon_eye'),
        emoji: '👁️',
        baseHP: 60,
        baseDamage: 10,
        chargeMax: 8,
        attackType: 'ranged',
        element: 'shadow',
        resistances: { shadow: 25 }
    },

    troll: {
        id: 'troll',
        name: t('eg_mon_troll'),
        emoji: '🧌',
        baseHP: 85,
        baseDamage: 9,
        chargeMax: 15,
        attackType: 'melee'
    },

    crystal: {
        id: 'crystal',
        name: t('eg_mon_crystal'),
        emoji: '💎',
        baseHP: 70,
        baseDamage: 7,
        chargeMax: 10,
        attackType: 'ranged',
        element: 'cold',
        resistances: { cold: 25 }
    },

    crocodile: {
        id: 'crocodile',
        name: t('eg_mon_crocodile'),
        emoji: '🐊',
        baseHP: 80,
        baseDamage: 11,
        chargeMax: 16,
        attackType: 'melee'
    },

    // TIER 3 — Tanky / hard-hitting
    brain: {
        id: 'brain',
        name: t('eg_mon_brain'),
        emoji: '🧠',
        baseHP: 130,
        baseDamage: 15,
        chargeMax: 18,
        attackType: 'ranged',
        element: 'shadow',
        resistances: { shadow: 30 }
    },

    oni: {
        id: 'oni',
        name: t('eg_mon_oni'),
        emoji: '👹',
        baseHP: 140,
        baseDamage: 17,
        chargeMax: 20,
        attackType: 'both',
        element: 'fire',
        resistances: { fire: 30 }
    },

    alien: {
        id: 'alien',
        name: t('eg_mon_alien'),
        emoji: '👾',
        baseHP: 110,
        baseDamage: 20,
        chargeMax: 16,
        attackType: 'both',
        element: 'lightning',
        resistances: { lightning: 30 }
    },

    rhino: {
        id: 'rhino',
        name: t('eg_mon_rhino'),
        emoji: '🦏',
        baseHP: 160,
        baseDamage: 14,
        chargeMax: 24,
        attackType: 'melee'
    },

    skull_lord: {
        id: 'skull_lord',
        name: t('eg_mon_skull_lord'),
        emoji: '☠️',
        baseHP: 125,
        baseDamage: 22,
        chargeMax: 21,
        attackType: 'ranged',
        element: 'shadow',
        resistances: { shadow: 30 }
    },

    bison: {
        id: 'bison',
        name: t('eg_mon_bison'),
        emoji: '🦬',
        baseHP: 170,
        baseDamage: 13,
        chargeMax: 26,
        attackType: 'melee'
    },

    // TIER 1 — Weak / fast

    ant: {
        id: 'ant',
        name: t('eg_mon_ant'),
        emoji: '🐜',
        baseHP: 24,
        baseDamage: 3,
        chargeMax: 4,
        attackType: 'melee'
    },

    ladybug: {
        id: 'ladybug',
        name: t('eg_mon_ladybug'),
        emoji: '🐞',
        baseHP: 26,
        baseDamage: 4,
        chargeMax: 5,
        attackType: 'both'
    },

    owl: {
        id: 'owl',
        name: t('eg_mon_owl'),
        emoji: '🦉',
        baseHP: 32,
        baseDamage: 5,
        chargeMax: 7,
        attackType: 'ranged'
    },

    frog: {
        id: 'frog',
        name: t('eg_mon_frog'),
        emoji: '🐸',
        baseHP: 30,
        baseDamage: 4,
        chargeMax: 5,
        attackType: 'melee',
        element: 'cold',
        resistances: { cold: 20 }
    },

    moth: {
        id: 'moth',
        name: t('eg_mon_moth'),
        emoji: '🦋',
        baseHP: 20,
        baseDamage: 6,
        chargeMax: 4,
        attackType: 'ranged'
    },

    // TIER 2 — Medium

    gorilla: {
        id: 'gorilla',
        name: t('eg_mon_gorilla'),
        emoji: '🦍',
        baseHP: 95,
        baseDamage: 10,
        chargeMax: 17,
        attackType: 'melee'
    },

    lion: {
        id: 'lion',
        name: t('eg_mon_lion'),
        emoji: '🦁',
        baseHP: 80,
        baseDamage: 12,
        chargeMax: 14,
        attackType: 'melee'
    },

    tiger: {
        id: 'tiger',
        name: t('eg_mon_tiger'),
        emoji: '🐅',
        baseHP: 75,
        baseDamage: 13,
        chargeMax: 12,
        attackType: 'both'
    },

    wizard: {
        id: 'wizard',
        name: t('eg_mon_wizard'),
        emoji: '🧙',
        baseHP: 70,
        baseDamage: 11,
        chargeMax: 9,
        attackType: 'ranged',
        element: 'lightning',
        resistances: { lightning: 25 }
    },

    genie: {
        id: 'genie',
        name: t('eg_mon_genie'),
        emoji: '🧞',
        baseHP: 85,
        baseDamage: 9,
        chargeMax: 10,
        attackType: 'both',
        element: 'lightning',
        resistances: { lightning: 25 }
    },

    pumpkin: {
        id: 'pumpkin',
        name: t('eg_mon_pumpkin'),
        emoji: '🎃',
        baseHP: 90,
        baseDamage: 8,
        chargeMax: 13,
        attackType: 'ranged',
        element: 'fire',
        resistances: { fire: 25 }
    },

    // TIER 3 — Strong

    vampire: {
        id: 'vampire',
        name: t('eg_mon_vampire'),
        emoji: '🧛',
        baseHP: 130,
        baseDamage: 18,
        chargeMax: 18,
        attackType: 'both',
        element: 'shadow',
        resistances: { shadow: 30 }
    },

    zombie: {
        id: 'zombie',
        name: t('eg_mon_zombie'),
        emoji: '🧟',
        baseHP: 180,
        baseDamage: 12,
        chargeMax: 24,
        attackType: 'melee',
        element: 'shadow',
        resistances: { shadow: 20 }
    },

    unicorn: {
        id: 'unicorn',
        name: t('eg_mon_unicorn'),
        emoji: '🦄',
        baseHP: 120,
        baseDamage: 17,
        chargeMax: 15,
        attackType: 'ranged',
        element: 'lightning',
        resistances: { lightning: 30 }
    },

    ufo: {
        id: 'ufo',
        name: t('eg_mon_ufo'),
        emoji: '🛸',
        baseHP: 140,
        baseDamage: 19,
        chargeMax: 16,
        attackType: 'both',
        element: 'lightning',
        resistances: { lightning: 30 }
    },

    volcano: {
        id: 'volcano',
        name: t('eg_mon_volcano'),
        emoji: '🌋',
        baseHP: 200,
        baseDamage: 15,
        chargeMax: 28,
        attackType: 'ranged',
        element: 'fire',
        resistances: { fire: 35 }
    },

    cyclone: {
        id: 'cyclone',
        name: t('eg_mon_cyclone'),
        emoji: '🌪️',
        baseHP: 125,
        baseDamage: 21,
        chargeMax: 14,
        attackType: 'both',
        element: 'lightning',
        resistances: { lightning: 30 }
    },

    meteor: {
        id: 'meteor',
        name: t('eg_mon_meteor'),
        emoji: '☄️',
        baseHP: 160,
        baseDamage: 24,
        chargeMax: 20,
        attackType: 'ranged',
        element: 'fire',
        resistances: { fire: 35 }
    },

    moon: {
        id: 'moon',
        name: t('eg_mon_moon'),
        emoji: '🌙',
        baseHP: 145,
        baseDamage: 18,
        chargeMax: 17,
        attackType: 'ranged',
        element: 'cold',
        resistances: { cold: 30 }
    },

    starspawn: {
        id: 'starspawn',
        name: t('eg_mon_starspawn'),
        emoji: '⭐',
        baseHP: 170,
        baseDamage: 22,
        chargeMax: 22,
        attackType: 'both',
        element: 'shadow',
        resistances: { shadow: 30 }
    }




};






//------------------------------------------------------------------------
//-------------------MONSTER FACTORY--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the scaled stats for a monster at the given level.
// Accepts either a string id (looks up EG_MONSTER_DEFS) or a def object directly.
function _egBuildMonster(defOrId, level = 1) {
    const def = (typeof defOrId === 'string') ? EG_MONSTER_DEFS[defOrId] : defOrId;

    // FIX: If it's not a standard monster, check if it's a boss and route to the boss factory
    if (!def && typeof defOrId === 'string' && typeof EG_BOSS_DEFS !== 'undefined' && EG_BOSS_DEFS[defOrId]) {
        return _egBuildBoss(defOrId, level);
    }

    if (!def) { console.warn('Unknown monster id:', defOrId); return null; }

    const lvl = Math.max(1, level);
    const hpScale = 1 + EG_LEVEL_HP_SCALE * (lvl - 1);
    const dmgScale = 1 + EG_LEVEL_DAMAGE_SCALE * (lvl - 1);

    const maxHP = Math.round(def.baseHP * hpScale);
    const damage = Math.round(def.baseDamage * dmgScale);

    return {
        id: `${def.id}_${++_egMonsterSpawnCounter}`,
        name: def.name,
        emoji: def.emoji,
        level: lvl,
        maxHP,
        currentHP: maxHP,
        chargeMax: def.chargeMax,
        currentCharge: 0,
        damageValue: damage,
        attackType: def.attackType || 'ranged', // Added fallback tracking
        element: def.element || null,
        resistances: def.resistances || null
    };
}