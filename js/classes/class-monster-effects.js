import { Audio_Manager } from '../audio/audio.js';
import { LANG } from '../translation/translations.js';
import { CLASS_SKILL_MONSTER_EFFECTS, CLASS_STAGGER_SECONDS } from './class-monster-effects-defs.js';

//------------------------------------------------------------------------
//-------------------CLASS SKILLS vs MONSTERS-----------------------------
//------------------------------------------------------------------------
// Class skills are puzzle helpers first, but in a fight they also act on the
// monsters on screen: they afflict them with debuffs (the same ones spells use,
// see combat-spell-debuff-defs.js), stagger them or push back their attack
// bars. The table and the tooltip text are in class-monster-effects-defs.js.
//
// The combat functions are read from globalThis on purpose: importing the
// combat engine from here would pull it into class-abilities' import chain and
// change the module evaluation order (hub-leveling would run before the loot
// requirements it reads). They are manifest exports, so they are always there.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------

// Poison from a class skill: share of the monster's maximum Life per second.
const CLASS_POISON_LIFE_SHARE = 0.015;
const MIN_POISON_DPS = 2;

//------------------------------------------------------------------------
//-------------------LOW-LEVEL HELPERS------------------------------------
//------------------------------------------------------------------------

// Living monsters on screen that can be affected.
function _livingMonsters() {
    return (globalThis._monsters || []).filter((m) => m && m.currentHP > 0 && !m.bossImmune);
}

// The monsters a skill reaches: everyone, or the target plus (rank - 1) others
// picked at random.
function _pickMonsters(who, rank) {
    const living = _livingMonsters();
    if (who === 'all') return living;
    const target = globalThis._getTarget();
    const first = (target && living.find((m) => m.id === target.id)) || living[0];
    if (!first) return [];
    const others = living.filter((m) => m !== first).sort(() => Math.random() - 0.5);
    return [first].concat(others.slice(0, Math.max(0, rank - 1)));
}

// Puts one effect entry (a debuff or an older ailment) on a monster.
function _applyOne(monster, entry) {
    if (entry.key === 'chill') { globalThis._applyMonsterAilment(monster, 'chill'); return; }
    if (entry.key === 'poison') {
        globalThis._applyMonsterAilment(monster, 'poison', Math.max(MIN_POISON_DPS, (monster.maxHP || 0) * CLASS_POISON_LIFE_SHARE));
        return;
    }
    for (let i = 0; i < (entry.stacks || 1); i++) globalThis._applySpellDebuff(monster, entry.key, { spellId: 'class_skill' });
}

//------------------------------------------------------------------------
//-------------------ENTRY POINT------------------------------------------
//------------------------------------------------------------------------

// Called when a class or ascendency skill is cast. Does nothing outside a fight.
export function _applyClassSkillMonsterEffects(skillKey, rank) {
    const row = CLASS_SKILL_MONSTER_EFFECTS[skillKey];
    if (!row || !globalThis._isActive()) return;
    const r = Math.max(1, Math.min(3, Number(rank) || 1));
    _pickMonsters(row.who, r).forEach((m) => {
        (row.apply || []).forEach((entry) => _applyOne(m, entry));
        if (row.stagger) {
            m.staggeredUntil = Date.now() + CLASS_STAGGER_SECONDS * 1000;
            globalThis._showStatusLabel(m.id, LANG === 'de' ? 'Betäubt!' : 'Staggered!');
            Audio_Manager.playSFX('monster_stunned');
        }
        if (row.rewind) {
            const back = (m.chargeMax || 0) * row.rewind[r - 1];
            m.currentCharge = Math.max(0, (m.currentCharge || 0) - back);
            globalThis._showStatusLabel(m.id, LANG === 'de' ? 'Zurückgespult!' : 'Rewound!');
        }
    });
}
