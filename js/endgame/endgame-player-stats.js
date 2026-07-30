//------------------------------------------------------------------------
//-------------------CONSTANTS & DATA DEFINITIONS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Player base stats
// These are the level-1 values before any equipment or passive bonuses apply.
// Future expansion: critChance, critMultiplier, fireDamage, coldDamage, lightningDamage, 
// fireResist, coldResist, lightningResist, armor, evasion, energyShield, strength, dexterity, intelligence, ...

// Life Regen, + Life from Hearts

const EG_PLAYER_STATS = {
    baseHP: 1000, // Starting HP for all monster levels
    baseDamage: 100, // Damage dealt per correct cell fill
    chargePushback: 1.5, // Seconds removed from a monster's charge bar on hit
};




//------------------------------------------------------------------------
//-------------------STAT AGGREGATION-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Maps every mod "key" produced by _egBuildRolledStats() (endgame-equipment-generator.js)
// to the stat bucket it feeds. Hybrid mods produce keys `${familyId}_1` / `${familyId}_2`;
// single-stat mods just use `familyId` directly.
const EG_STAT_KEY_MAP = {
    flat_health: { bucket: 'health', mode: 'add' },
    flat_mana: { bucket: 'mana', mode: 'add' },
    heart_heal: { bucket: 'heartHealFlat', mode: 'add' },
    inc_heart_heal: { bucket: 'heartHealIncPct', mode: 'add' },
    time_added: { bucket: 'timeAdded', mode: 'add' },

    flat_armour: { bucket: 'armourFlat', mode: 'add' },
    inc_armour: { bucket: 'armourIncPct', mode: 'add' },
    flat_evasion: { bucket: 'evasionFlat', mode: 'add' },
    inc_evasion: { bucket: 'evasionIncPct', mode: 'add' },
    flat_absorption: { bucket: 'absorptionFlat', mode: 'add' },
    inc_absorption: { bucket: 'absorptionIncPct', mode: 'add' },

    hybrid_life_armour_1: { bucket: 'health', mode: 'add' },
    hybrid_life_armour_2: { bucket: 'armourFlat', mode: 'add' },
    hybrid_mana_armour_1: { bucket: 'mana', mode: 'add' },
    hybrid_mana_armour_2: { bucket: 'armourFlat', mode: 'add' },
    hybrid_life_evasion_1: { bucket: 'health', mode: 'add' },
    hybrid_life_evasion_2: { bucket: 'evasionFlat', mode: 'add' },
    hybrid_mana_evasion_1: { bucket: 'mana', mode: 'add' },
    hybrid_mana_evasion_2: { bucket: 'evasionFlat', mode: 'add' },
    hybrid_life_absorption_1: { bucket: 'health', mode: 'add' },
    hybrid_life_absorption_2: { bucket: 'absorptionFlat', mode: 'add' },
    hybrid_mana_absorption_1: { bucket: 'mana', mode: 'add' },
    hybrid_mana_absorption_2: { bucket: 'absorptionFlat', mode: 'add' },
    hybrid_armour_evasion_1: { bucket: 'armourFlat', mode: 'add' },
    hybrid_armour_evasion_2: { bucket: 'evasionFlat', mode: 'add' },
    hybrid_evasion_armour_1: { bucket: 'evasionFlat', mode: 'add' },
    hybrid_evasion_armour_2: { bucket: 'armourFlat', mode: 'add' },
    hybrid_armour_absorption_1: { bucket: 'armourFlat', mode: 'add' },
    hybrid_armour_absorption_2: { bucket: 'absorptionFlat', mode: 'add' },
    hybrid_evasion_absorption_1: { bucket: 'evasionFlat', mode: 'add' },
    hybrid_evasion_absorption_2: { bucket: 'absorptionFlat', mode: 'add' },

    strength: { bucket: 'strength', mode: 'add' },
    agility: { bucket: 'agility', mode: 'add' },
    intelligence: { bucket: 'intelligence', mode: 'add' },

    life_regen: { bucket: 'lifeRegen', mode: 'add' },
    mana_regen: { bucket: 'manaRegen', mode: 'add' },
    mana_on_kill: { bucket: 'manaOnKill', mode: 'add' },
    absorption_on_kill: { bucket: 'absorptionOnKill', mode: 'add' },
    life_on_kill: { bucket: 'lifeOnKill', mode: 'add' },
    mana_on_mistake: { bucket: 'manaOnMistake', mode: 'add' },
    absorption_regen_rate: { bucket: 'absorptionRegenRatePct', mode: 'add' },
    faster_absorption_regen_start: { bucket: 'fasterAbsorptionRegenStart', mode: 'add' },

    fire_resist: { bucket: 'fireResist', mode: 'add' },
    cold_resist: { bucket: 'coldResist', mode: 'add' },
    lightning_resist: { bucket: 'lightningResist', mode: 'add' },
    shadow_resist: { bucket: 'shadowResist', mode: 'add' },
    arcane_resistance: { bucket: 'arcaneResistFlat', mode: 'add' },

    accuracy: { bucket: 'accuracy', mode: 'add' },
    mistake_count: { bucket: 'mistakeCount', mode: 'add' },
    focus: { bucket: 'focusPct', mode: 'add' },
    mistake_not_count: { bucket: 'mistakeNotCountPct', mode: 'add' },
    reveal_hint: { bucket: 'revealHintPct', mode: 'add' },
    chance_for_new_question: { bucket: 'chanceForNewQuestionPct', mode: 'add' },

    crit_chance: { bucket: 'critChance', mode: 'add' },
    crit_multiplier: { bucket: 'critMultiplierPct', mode: 'add' },

    flat_physical_damage_1: { bucket: 'physFlatMin', mode: 'add' },
    flat_physical_damage_2: { bucket: 'physFlatMax', mode: 'add' },
    inc_physical_damage: { bucket: 'physIncPct', mode: 'add' },

    fire_damage_1: { bucket: 'fireDmgMin', mode: 'add' },
    fire_damage_2: { bucket: 'fireDmgMax', mode: 'add' },
    cold_damage_1: { bucket: 'coldDmgMin', mode: 'add' },
    cold_damage_2: { bucket: 'coldDmgMax', mode: 'add' },
    lightning_damage_1: { bucket: 'lightningDmgMin', mode: 'add' },
    lightning_damage_2: { bucket: 'lightningDmgMax', mode: 'add' },
    shadow_damage_1: { bucket: 'shadowDmgMin', mode: 'add' },
    shadow_damage_2: { bucket: 'shadowDmgMax', mode: 'add' },

    spell_damage: { bucket: 'spellDamageFlat', mode: 'add' },
    inc_spell_damage: { bucket: 'spellDamageIncPct', mode: 'add' },

    life_leech: { bucket: 'lifeLeechPct', mode: 'add' },

    block_chance: { bucket: 'blockChance', mode: 'add' },
    spell_block_chance: { bucket: 'spellBlockChance', mode: 'add' },
    block_recovery: { bucket: 'blockRecoveryPct', mode: 'add' },
    dodge: { bucket: 'dodgeChance', mode: 'add' },
    spell_dodge: { bucket: 'spellDodgeChance', mode: 'add' },

    chance_to_ignite: { bucket: 'ignitePct', mode: 'add' },
    chance_to_freeze: { bucket: 'freezePct', mode: 'add' },
    chance_to_shock: { bucket: 'shockPct', mode: 'add' },
    chance_to_blind: { bucket: 'blindPct', mode: 'add' },
    chance_to_convert: { bucket: 'convertPct', mode: 'add' },

    attack_speed: { bucket: 'attackSpeed', mode: 'add' },
    cleave: { bucket: 'cleavePct', mode: 'add' },
    pierce: { bucket: 'piercePct', mode: 'add' },
    snipe: { bucket: 'snipePct', mode: 'add' },
    chain: { bucket: 'chainPct', mode: 'add' },
    splash_damage: { bucket: 'splashPct', mode: 'add' },
    multishot: { bucket: 'multishotPct', mode: 'add' },
    pushback: { bucket: 'pushbackFlat', mode: 'add' },
    overkill: { bucket: 'overkillPct', mode: 'add' },
    stagger: { bucket: 'staggerPct', mode: 'add' },
    preemptive_dodge: { bucket: 'preemptiveDodgePct', mode: 'add' },
    first_step: { bucket: 'firstStepSeconds', mode: 'add' },

    grounded_1: { bucket: 'groundedChancePct', mode: 'add' },
    grounded_2: { bucket: 'groundedReductionPct', mode: 'add' },
    shield_bash_1: { bucket: 'shieldBashChancePct', mode: 'add' },
    shield_bash_2: { bucket: 'shieldBashDamageFlat', mode: 'add' },
    channel_1: { bucket: 'channelDamagePerStack', mode: 'add' },
    channel_2: { bucket: 'channelMaxStacks', mode: 'max' },
    arcane_surge_1: { bucket: 'arcaneSurgeStreak', mode: 'min' },
    arcane_surge_2: { bucket: 'arcaneSurgeMana', mode: 'add' },
    mana_to_damage: { bucket: 'manaToDamagePct', mode: 'add' },
    echo_1: { bucket: 'echoChancePct', mode: 'add' },
    echo_2: { bucket: 'echoDamagePct', mode: 'add' },
    fate: { bucket: 'fatePct', mode: 'add' },
    warding: { bucket: 'wardingHP', mode: 'max' },
};

// Returns every non-empty equipped item as a flat array.
function _egGetAllEquippedItems() {
    if (typeof _egEquipped === 'undefined') return [];
    return Object.values(_egEquipped).filter(Boolean);
}

// Aggregates every equipped item's implicit defenses + rolled mods into one
// stats object. Recomputed on demand (cheap — ~19 slots, ≤6 mods each) so it
// never goes stale after an equip/unequip.
function _egComputePlayerStats() {
    const s = {
        health: 0, mana: 0,
        armourFlat: 0, armourIncPct: 0,
        evasionFlat: 0, evasionIncPct: 0,
        absorptionFlat: 0, absorptionIncPct: 0,
        strength: 0, agility: 0, intelligence: 0,
        lifeRegen: 0, manaRegen: 0,
        fireResist: 0, coldResist: 0, lightningResist: 0, shadowResist: 0, arcaneResistFlat: 0,
        accuracy: 0, mistakeCount: 0, focusPct: 0, mistakeNotCountPct: 0,
        revealHintPct: 0, chanceForNewQuestionPct: 0,
        critChance: 0, critMultiplierPct: 0,
        physFlatMin: 0, physFlatMax: 0, physIncPct: 0,
        fireDmgMin: 0, fireDmgMax: 0, coldDmgMin: 0, coldDmgMax: 0,
        lightningDmgMin: 0, lightningDmgMax: 0, shadowDmgMin: 0, shadowDmgMax: 0,
        spellDamageFlat: 0, spellDamageIncPct: 0,
        lifeLeechPct: 0,
        blockChance: 0, spellBlockChance: 0, blockRecoveryPct: 0,
        dodgeChance: 0, spellDodgeChance: 0,
        ignitePct: 0, freezePct: 0, shockPct: 0, blindPct: 0, convertPct: 0,
        attackSpeed: 0, cleavePct: 0, piercePct: 0, snipePct: 0, chainPct: 0, splashPct: 0,
        multishotPct: 0, pushbackFlat: 0, overkillPct: 0, staggerPct: 0, preemptiveDodgePct: 0,
        firstStepSeconds: 0, groundedChancePct: 0, groundedReductionPct: 0,
        shieldBashChancePct: 0, shieldBashDamageFlat: 0,
        channelDamagePerStack: 0, channelMaxStacks: 0,
        arcaneSurgeStreak: Infinity, arcaneSurgeMana: 0, manaToDamagePct: 0,
        echoChancePct: 0, echoDamagePct: 0, fatePct: 0, wardingHP: 0,
        manaOnKill: 0, absorptionOnKill: 0, lifeOnKill: 0, manaOnMistake: 0,
        heartHealFlat: 0, heartHealIncPct: 0, timeAdded: 0,
        absorptionRegenRatePct: 0, fasterAbsorptionRegenStart: 0,
    };

    _egGetAllEquippedItems().forEach(item => {
        if (item.defenses) {
            s.armourFlat += item.defenses.armour || 0;
            s.evasionFlat += item.defenses.evasion || 0;
            s.absorptionFlat += item.defenses.absorption || 0;
        }
        (Array.isArray(item.mods) ? item.mods : []).forEach(mod => {
            (Array.isArray(mod.rolledStats) ? mod.rolledStats : []).forEach(stat => {
                const entry = EG_STAT_KEY_MAP[stat.key];
                if (!entry || stat.value == null) return;
                const val = Number(stat.value) || 0;
                if (entry.mode === 'max') s[entry.bucket] = Math.max(s[entry.bucket], val);
                else if (entry.mode === 'min') s[entry.bucket] = Math.min(s[entry.bucket], val);
                else s[entry.bucket] += val;
            });
        });
    });

    if (s.arcaneSurgeStreak === Infinity) s.arcaneSurgeStreak = 0;

    // Attribute side-effects per the design notes above:
    // Str -> +2 life & +1 armour/point, Agi -> +1 accuracy & +1 evasion/point,
    // Int -> +2 mana & +1 spell damage/point.
    s.health += s.strength * 2;
    s.armourFlat += s.strength;
    s.accuracy += s.agility;
    s.evasionFlat += s.agility;
    s.mana += s.intelligence * 2;
    s.spellDamageFlat += s.intelligence;

    s.armour = Math.round(s.armourFlat * (1 + s.armourIncPct / 100));
    s.evasion = Math.round(s.evasionFlat * (1 + s.evasionIncPct / 100));
    s.absorption = Math.round(s.absorptionFlat * (1 + s.absorptionIncPct / 100));

    return s;
}


//------------------------------------------------------------------------
//-------------------COMBAT FORMULA HELPERS--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Flat % damage reduction from armour, diminishing returns, capped at 75%.
function _egCalcArmourMitigation(rawDamage, armour) {
    if (!armour) return rawDamage;
    const reductionPct = Math.min(0.75, armour / (armour + 100));
    return rawDamage * (1 - reductionPct);
}

// Converts evasion into a % chance to fully dodge an incoming hit, capped at 75%.
function _egCalcEvasionDodgeChance(evasion) {
    if (!evasion) return 0;
    return Math.min(75, (evasion / (evasion + 200)) * 100);
}

// Rolls a crit for the current hit. Returns the damage multiplier (1 = no crit).
function _egRollCrit(stats) {
    if (stats.critChance > 0 && Math.random() * 100 < stats.critChance) {
        return 1.5 + stats.critMultiplierPct / 100; // 150% base crit damage + bonus multiplier
    }
    return 1;
}

// Rolls the total flat elemental damage bonus (fire+cold+lightning+shadow) for one hit.
function _egGetElementalDamageBonus(stats) {
    const roll = (min, max) => (min > 0 || max > 0) ? min + Math.random() * (max - min) : 0;
    return roll(stats.fireDmgMin, stats.fireDmgMax)
        + roll(stats.coldDmgMin, stats.coldDmgMax)
        + roll(stats.lightningDmgMin, stats.lightningDmgMax)
        + roll(stats.shadowDmgMin, stats.shadowDmgMax);
}


//------------------------------------------------------------------------
//-------------------ABSORPTION SHIELD REGEN-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Absorption is a secondary HP layer. It starts regenerating 5s after the
// last hit, refilling gradually until it's back to the equipped max.

function _egCancelAbsorptionRegen() {
    if (_egPlayerAbsorptionRegenDelayTimer) { clearTimeout(_egPlayerAbsorptionRegenDelayTimer); _egPlayerAbsorptionRegenDelayTimer = null; }
    if (_egPlayerAbsorptionRegenInterval) { clearInterval(_egPlayerAbsorptionRegenInterval); _egPlayerAbsorptionRegenInterval = null; }
}

// Called on every hit taken — interrupts any in-progress regen and restarts the delay.
function _egScheduleAbsorptionRegen() {
    _egCancelAbsorptionRegen();
    _egPlayerAbsorptionRegenDelayTimer = setTimeout(() => {
        _egPlayerAbsorptionRegenInterval = setInterval(() => {
            if (!_egIsActive()) { _egCancelAbsorptionRegen(); return; }
            const max = _egComputePlayerStats().absorption;
            if (_egPlayerAbsorptionCurrent >= max) { _egCancelAbsorptionRegen(); return; }
            const step = Math.max(1, Math.round(max * 0.08));
            _egPlayerAbsorptionCurrent = Math.min(max, _egPlayerAbsorptionCurrent + step);
        }, 200);
    }, 5000);
}






/*

Regular modifier Stats that make sense in Stoxels (there can be some very special ones later on maybe)

Attributes: 
+Strength, +Agility, +Intelligence
     Strength gives +2 Life and +1 Armor per point of Strength
     Agility gives +1 Accuracy and + 1 Evasion per point of Agility
    Intelligence gives +2 Mana and +1 Spell Damage per point of Intelligence

Life:    
    +Health, 
    +Life Regeneration per Second, 
    + Life Leech on hit (small percentage of damage gets returned as life)
    + HeartHeal: increases the amount of health that heart items give (flat and multiplier?)

Mana: (TODO: Class Abilities will need to have a mana cost added for endgame)
     +Mana flat value 
     ManaRegen: Regenerate X mana every 5 seconds
     + Mana on kill

Defensives:
     +Armor (flat additive value), 
     local armor multiplier on item base (multiplies the item armor value of the item equipped in that slot), 
    armor reduces incoming damage of monster attacks by a certain amount, from ranged and melee monster attacks
 
    +Evasion(flat additive value), 
    local evasion multiplier on item base(multiplies the item evasion value of the item equipped in that slot)
    Evasion gives a chance (with poe like entropy?) that a monster misses the player when it attacks with ranged or melee attacks 

    + Absorption - a secondary layer of values on top of life (some monsters can ignore this absorption layer)
                - absorption starts slowly automatically regenrating back to full after 5 seconds of not taking a hit, but this regeneration is interrupted if the player gets attacked
                can have +Absorption, +fasterStartOfAbsorptionRegeneration, AbsorptionRegenrationRate (makes the absorption protection regenrate back up to full quicker)
                + absorption on kill


    + Block Chance and +Spell Block Chance - block completely negates the incoming damage for regular attacks or monster spells (monster abilities, spellblock)
                                            but when the player blocks he can no longer damage monsters for the next 5 seconds. So we can introduce a +BlockRecovery stat that reduces this time
                                            should be more deterministic than dodge/spell dodge
    + Dodge and +SpellDodge - chance to fully dodge and void damage from attacks or spells - similar to block but must be more random cause no block recovery downside

    + resistances against fire, cold, lightning, shadow damage (reduces the incoming elemental damage from monsters)



Puzzle Modifiers
    + AllowedMistakeCount - maps have limited mistake counts, players can increase this by wearing gear with +mistakecount
    + ChanceForMistakesToNotCount - percentage chance that a mistake does not count as mistake and does not increase the mistake counter (basically shield item effect?)
    + Time - maps have limited amount of time, players can increase that by using +time items
    + Focus - mistakes consume less time
    + Precision: each correctly revealed cell gives a small damage buff or mana regen or crit damage or life regen. lose all stacks of the buff on mistake


Quiz & Input Exercise Modifiers
    + Chance to receive a new question after failing a question 
    + Chance to automatically remove one wrong answer on multiple choice questions (shall stack with passive tree effect for chance to remove up to 2 wrong answers)
    + chance to show reveal hint on exercise questions




Damage stats: (damage of player projectiles should scale with ranged weapon slot damage, melee weapon is for "counterattack" damage when a monster strikes the player in melee (or attempts to incase we dodge or block or evade))
    + local physical damage flat value
    + local physical damage multiplier
    + critical strike chance for melee counterattacks or ranged attacks
    + critical damage for melee counterattacks or ranged attacks
    + multishot (since attack speed makes no sense) - chance to shoot two projectiles instead of one per reveal, maybe this can go higher than 100% to have 1 extra guaranteed and +chance for 2?)
    + splash damage - chance to hit multiple monsters in the same spawn location
    + fire damage
    + cold damage
    + lightning damage
    + shadow damage
    + Accuracy: less chance to miss the monster with counterattacks and projectiles

    + chance to ignite (ignite does fire damage over time to monster)
    + chance to freeze (freeze freezes the monster so it can not attack for X seconds)
    + chance to shock (shock increases the damage the monster receives for X seconds)
    + chance to convert (shadow damage status effect, converted monsters can shoot each other and deal damage to each other, for X seconds)
    + chance to blind: reduces monster accuracy

    +chain: chance to have projectiles bounce to a monster in a different spawn location (shall chains of chains occur?)

    + pushback: pushes monsters attack timer back by X additional seconds

    + overkill: chance to have overkill damage spread to a nearby monster



Damage of Spells: (TODO: All class abilities shall have a way to affect monsters on the screen, some deal damage, some apply status effects and other debuffs)
// +SpellDamage - flat increase to class ability damage against monsters
// *SpellDamage - multiplier of spell damage (should be lower values)




*/