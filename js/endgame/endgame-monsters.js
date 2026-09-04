//------------------------------------------------------------------------
//-------------------CONSTANTS & DATA DEFINITIONS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Monster level scaling 
// Applied per level above 1. 
const EG_LEVEL_HP_SCALE = 0.28; // +28% HP per level above 1 — tuned for T1-easy / T16-spongy curve (see _egGetTierBalance)
const EG_LEVEL_DAMAGE_SCALE = 0.26; // +26% damage per level above 1 — raised from 0.12 so high tiers stay threatening even with on-level gear; T1 eased via tier balance

// Hard cap on how many monsters (including bosses) can be alive simultaneously.
// New spawns are silently dropped until a slot opens.
const EG_MAX_CONCURRENT_MONSTERS = 6;

// Tier-aware balance curve: T1 is easy (no gear), mid tiers ramp to normal,
// high tiers become explicitly dangerous/spongy when undergeared.
// Returns { hp, dmg, charge } multipliers for the given monster level.
// Smooth lerp so tier transitions feel continuous, not stepped.
// Anchors tuned so adequate gear (ilvl≈mlvl) feels: T1 easy (TTD~140s, TTK~6),
// T4 forgiving, T7-8 normal (TTD~60s, TTK~4), T13 challenging, T16 hard but doable (~40s).
// Lacking gear (-12 ilvl, -5 lvl) then feels 2-3x harder and 1.8-2x spongy.
function _egGetTierBalance(lvl) {
    const l = Math.max(1, Number(lvl) || 1);
    // dmg: peaks at mid (T7-8) then plateaus so T16 adequate stays ~40s not 28s
    const dmgAnchors = [[1,0.62],[3,0.70],[14,0.95],[30,1.30],[36,1.35],[50,1.30],[64,1.20],[78,1.22],[90,1.18]];
    const hpAnchors  = [[1,0.60],[3,0.73],[14,0.91],[30,0.98],[36,1.03],[50,1.08],[64,1.17],[78,1.17],[90,1.16]];
    const chargeAnchors = [[1,1.18],[14,1.10],[30,1.00],[50,0.92],[71,0.88],[90,0.85]];
    function lerp(anchors, x) {
        if (x <= anchors[0][0]) return anchors[0][1];
        if (x >= anchors[anchors.length-1][0]) return anchors[anchors.length-1][1];
        for (let i=0;i<anchors.length-1;i++) {
            const [x0,y0]=anchors[i], [x1,y1]=anchors[i+1];
            if (x>=x0 && x<=x1) {
                const t=(x-x0)/(x1-x0);
                return y0 + (y1-y0)*t;
            }
        }
        return anchors[anchors.length-1][1];
    }
    return {
        hp: lerp(hpAnchors, l),
        dmg: lerp(dmgAnchors, l),
        charge: lerp(chargeAnchors, l)
    };
}



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
        baseHP: 20, baseDamage: 3, chargeMax: 4, attackType: 'melee'
    },

    // TIER 2 — Medium / balanced
    crab: {
        id: 'crab', name: t('eg_mon_crab'), emoji: '🦀',
        baseHP: 65, baseDamage: 11, chargeMax: 12, attackType: 'melee'
    },
    snake: {
        id: 'snake', name: t('eg_mon_snake'), emoji: '🐍',
        baseHP: 55, baseDamage: 14, chargeMax: 14, attackType: 'both', // Uses random mix!
        element: 'arcane' // Polymorph chaos curse
    },
    skull: {
        id: 'skull', name: t('eg_mon_skull'), emoji: '💀',
        baseHP: 70, baseDamage: 10, chargeMax: 9,
        element: 'shadow', resistances: { shadow: 25 }
    },

    // TIER 3 — Tanky / hard-hitting
    golem: {
        id: 'golem', name: t('eg_mon_golem'), emoji: '🗿',
        baseHP: 80, baseDamage: 16, chargeMax: 15, attackType: 'melee'
    },
    dragon: {
        id: 'dragon', name: t('eg_mon_dragon'), emoji: '🐉',
        baseHP: 120, baseDamage: 22, chargeMax: 14, attackType: 'both', // Uses random mix!
        element: 'fire', resistances: { fire: 30 }
    },
    demon: {
        id: 'demon', name: t('eg_mon_demon'), emoji: '😈',
        baseHP: 100, baseDamage: 29, chargeMax: 16,
        element: 'shadow', resistances: { shadow: 30 }
    },
    golem_iron: {
        id: 'golem_iron', name: t('eg_mon_golem_iron'), emoji: '🤖',
        baseHP: 150, baseDamage: 13, chargeMax: 13, attackType: 'melee',
        element: 'lightning', resistances: { lightning: 30 }
    },
    werewolf: {
        id: 'werewolf', name: t('eg_mon_werewolf'), emoji: '🐺',
        baseHP: 90, baseDamage: 19, chargeMax: 11, attackType: 'both', // Uses random mix!
        element: 'arcane' // Polymorph chaos curse
    },
    ogre: {
        id: 'ogre', name: t('eg_mon_ogre'), emoji: '👹',
        baseHP: 110, baseDamage: 26, chargeMax: 18, attackType: 'melee'
    },

    // TIER 1 — Weak / fast
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
        baseHP: 22,
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
        baseHP: 18,
        baseDamage: 6,
        chargeMax: 3,
        attackType: 'both'
    },

    // TIER 2 — Medium / balanced
    scorpion: {
        id: 'scorpion',
        name: t('eg_mon_scorpion'),
        emoji: '🦂',
        baseHP: 75,
        baseDamage: 13,
        chargeMax: 13,
        attackType: 'melee'
    },

    eye: {
        id: 'eye',
        name: t('eg_mon_eye'),
        emoji: '👁️',
        baseHP: 60,
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
        baseHP: 85,
        baseDamage: 14,
        chargeMax: 15,
        attackType: 'melee'
    },

    crystal: {
        id: 'crystal',
        name: t('eg_mon_crystal'),
        emoji: '💎',
        baseHP: 70,
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
        baseHP: 80,
        baseDamage: 18,
        chargeMax: 16,
        attackType: 'melee'
    },

    // TIER 3 — Tanky / hard-hitting
    brain: {
        id: 'brain',
        name: t('eg_mon_brain'),
        emoji: '🧠',
        baseHP: 130,
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
        baseHP: 140,
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
        baseHP: 110,
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
        baseHP: 160,
        baseDamage: 22,
        chargeMax: 17,
        attackType: 'melee'
    },

    skull_lord: {
        id: 'skull_lord',
        name: t('eg_mon_skull_lord'),
        emoji: '☠️',
        baseHP: 125,
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
        baseHP: 170,
        baseDamage: 21,
        chargeMax: 18,
        attackType: 'melee'
    },

    // TIER 1 — Weak / fast

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
        baseHP: 20,
        baseDamage: 10,
        chargeMax: 4,
        attackType: 'ranged'
    },

    // TIER 2 — Medium

    gorilla: {
        id: 'gorilla',
        name: t('eg_mon_gorilla'),
        emoji: '🦍',
        baseHP: 95,
        baseDamage: 16,
        chargeMax: 17,
        attackType: 'melee'
    },

    lion: {
        id: 'lion',
        name: t('eg_mon_lion'),
        emoji: '🦁',
        baseHP: 80,
        baseDamage: 19,
        chargeMax: 14,
        attackType: 'melee'
    },

    tiger: {
        id: 'tiger',
        name: t('eg_mon_tiger'),
        emoji: '🐅',
        baseHP: 75,
        baseDamage: 21,
        chargeMax: 12,
        attackType: 'both'
    },

    wizard: {
        id: 'wizard',
        name: t('eg_mon_wizard'),
        emoji: '🧙',
        baseHP: 70,
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
        baseHP: 85,
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
        baseHP: 90,
        baseDamage: 13,
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
        baseHP: 180,
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
        baseHP: 120,
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
        baseHP: 140,
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
        baseHP: 200,
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
        baseHP: 125,
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
        baseHP: 160,
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
        baseHP: 145,
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
        baseHP: 170,
        baseDamage: 35,
        chargeMax: 16,
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
// hpMult: optional multiplier for boss max HP only (e.g., 500k HP test mode);
// damage is left at its normal scaled value.
function _egBuildMonster(defOrId, level = 1, hpMult = 1) {
    const def = (typeof defOrId === 'string') ? EG_MONSTER_DEFS[defOrId] : defOrId;

    // FIX: If it's not a standard monster, check if it's a boss and route to the boss factory
    if (!def && typeof defOrId === 'string' && typeof EG_BOSS_DEFS !== 'undefined' && EG_BOSS_DEFS[defOrId]) {
        const boss = _egBuildBoss(defOrId, level, hpMult);
        if (boss) boss.isBoss = true;
        return boss;
    }

    if (!def) { console.warn('Unknown monster id:', defOrId); return null; }

    const lvl = Math.max(1, level);
    // Tier-aware balance: T1 is forgiving (no gear yet), difficulty ramps
    // smoothly so adequate gear feels normal, lacking feels spongy/dangerous,
    // outgearing feels easy. Multipliers are smooth, not stepped, to avoid
    // abrupt walls between tiers.
    const tierBalance = _egGetTierBalance(lvl);
    const hpScale = (1 + EG_LEVEL_HP_SCALE * (lvl - 1)) * tierBalance.hp;
    const dmgScale = (1 + EG_LEVEL_DAMAGE_SCALE * (lvl - 1)) * tierBalance.dmg;

    const maxHP = Math.round(def.baseHP * hpScale);
    const damage = Math.round(def.baseDamage * dmgScale);

    // Charge bar scales down with level so high-level monsters attack faster.
    // ~62% faster at L90 (0.38x), ~28% faster at L41 (0.72x), clamped to 2.2s minimum.
    // Tier balance also makes T1 slower (+18%) and T14+ faster (-7%). Together this
    // prevents absorption from fully outregenerating 200 dmg hits at L41.
    const levelChargeMult = Math.max(0.35, 1 - 0.007 * (lvl - 1)) * tierBalance.charge;
    const scaledCharge = Math.max(2.2, def.chargeMax * levelChargeMult);

    const monster = {
        id: `${def.id}_${++_egMonsterSpawnCounter}`,
        baseId: def.id, // unsuffixed def id — used for EG_ART image lookups
        name: def.name,
        emoji: def.emoji,
        level: lvl,
        maxHP,
        currentHP: maxHP,
        chargeMax: scaledCharge,
        currentCharge: 0,
        damageValue: damage,
        attackType: def.attackType || 'ranged', // Added fallback tracking
        element: def.element || null,
        resistances: def.resistances || null
    };

    // Active map run: apply the rolled monster-strengthening mods.
    if (typeof _egApplyMapModsToMonster === 'function') _egApplyMapModsToMonster(monster);

    return monster;
}