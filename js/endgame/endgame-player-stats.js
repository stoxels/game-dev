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
    baseHP: 100, // Starting HP for all monster levels
    baseMana: 60, // Starting mana pool before gear and attribute bonuses
    baseDamage: 10, // Damage dealt per correct cell fill
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
    // NOTE: flat_armour / inc_armour / flat_evasion / inc_evasion /
    // flat_absorption / inc_absorption (and the defense halves of the hybrid
    // families) are LOCAL modifiers — they only affect the base value of the
    // item they roll on. They are handled by _egGetItemEffectiveDefenses()
    // below and intentionally absent from this map.
    flat_health: { bucket: 'health', mode: 'add' },
    flat_mana: { bucket: 'mana', mode: 'add' },
    heart_heal: { bucket: 'heartHealFlat', mode: 'add' },
    inc_heart_heal: { bucket: 'heartHealIncPct', mode: 'add' },
    time_added: { bucket: 'timeAdded', mode: 'add' },

    hybrid_life_armour_1: { bucket: 'health', mode: 'add' },
    hybrid_mana_armour_1: { bucket: 'mana', mode: 'add' },
    hybrid_life_evasion_1: { bucket: 'health', mode: 'add' },
    hybrid_mana_evasion_1: { bucket: 'mana', mode: 'add' },
    hybrid_life_absorption_1: { bucket: 'health', mode: 'add' },
    hybrid_mana_absorption_1: { bucket: 'mana', mode: 'add' },

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

//------------------------------------------------------------------------
//-------------------LOCAL ITEM DEFENSES----------------------------------
//------------------------------------------------------------------------
// Flat and "% increased" armour / evasion / absorption mods are LOCAL in the
// Path of Exile sense: they only modify the base defense values of the very
// item they rolled on, not the character-wide totals.
//
// Effective item value = round((base + localFlat) * (1 + localIncPct / 100)).
const EG_LOCAL_DEFENSE_FLAT_KEYS = {
    flat_armour: 'armour',
    flat_evasion: 'evasion',
    flat_absorption: 'absorption',
    // Defense halves of hybrid families (key suffix _2 / _1 per stat order)
    hybrid_life_armour_2: 'armour',   hybrid_mana_armour_2: 'armour',
    hybrid_life_evasion_2: 'evasion', hybrid_mana_evasion_2: 'evasion',
    hybrid_life_absorption_2: 'absorption', hybrid_mana_absorption_2: 'absorption',
    hybrid_armour_evasion_1: 'armour', hybrid_armour_evasion_2: 'evasion',
    hybrid_evasion_armour_1: 'evasion', hybrid_evasion_armour_2: 'armour',
    hybrid_armour_absorption_1: 'armour', hybrid_armour_absorption_2: 'absorption',
    hybrid_evasion_absorption_1: 'evasion', hybrid_evasion_absorption_2: 'absorption',
};

const EG_LOCAL_DEFENSE_INC_KEYS = {
    inc_armour: 'armour',
    inc_evasion: 'evasion',
    inc_absorption: 'absorption',
};

// Computes an item's effective (local-modified) defenses.
// Returns { armour, evasion, absorption, modded: { armour, evasion, absorption } }
// where modded.<stat> is true when local mods altered that value — used by
// the tooltip to highlight already-increased values.
function _egGetItemEffectiveDefenses(item) {
    const base = item.defenses || {};
    const out = {
        armour: base.armour || 0,
        evasion: base.evasion || 0,
        absorption: base.absorption || 0,
    };
    const inc = { armour: 0, evasion: 0, absorption: 0 };
    const modded = { armour: false, evasion: false, absorption: false };

    (Array.isArray(item.mods) ? item.mods : []).forEach(mod => {
        (Array.isArray(mod.rolledStats) ? mod.rolledStats : []).forEach(stat => {
            if (stat.value == null) return;
            const val = Number(stat.value) || 0;
            if (val === 0) return;
            const flatStat = EG_LOCAL_DEFENSE_FLAT_KEYS[stat.key];
            if (flatStat && out[flatStat] > 0) {
                out[flatStat] += val;
                modded[flatStat] = true;
                return;
            }
            const incStat = EG_LOCAL_DEFENSE_INC_KEYS[stat.key];
            if (incStat && out[incStat] > 0) {
                inc[incStat] += val;
                modded[incStat] = true;
            }
        });
    });

    ['armour', 'evasion', 'absorption'].forEach(stat => {
        out[stat] = Math.round(out[stat] * (1 + inc[stat] / 100));
    });

    out.modded = modded;
    return out;
}

//------------------------------------------------------------------------
//-------------------LOCAL ITEM DAMAGE------------------------------------
//------------------------------------------------------------------------
// Weapon damage mods are LOCAL in the Path of Exile sense (for display
// purposes): flat added Physical / elemental damage and "% increased
// Physical Damage" rolled on a weapon are baked into the weapon's own
// damage ranges shown in its tooltip.
//
// Effective value = round((base + localFlat) * (1 + localIncPct / 100))
// for Physical; elemental ranges are pure local flat adds (never scaled
// by % increased Physical), matching the combat order in
// _egCalcPlayerDamage() where elemental damage is added AFTER the
// % increased Physical multiplier.
const EG_LOCAL_DAMAGE_FLAT_KEYS = {
    flat_physical_damage_1: 'physMin',
    flat_physical_damage_2: 'physMax',
    fire_damage_1: 'fireMin',       fire_damage_2: 'fireMax',
    cold_damage_1: 'coldMin',       cold_damage_2: 'coldMax',
    lightning_damage_1: 'lightningMin', lightning_damage_2: 'lightningMax',
    shadow_damage_1: 'shadowMin',   shadow_damage_2: 'shadowMax',
};

const EG_LOCAL_DAMAGE_INC_KEYS = {
    inc_physical_damage: 'physInc',
};

// Computes an item's effective (local-modified) damage ranges.
// Returns { physMin, physMax, fireMin, fireMax, coldMin, coldMax,
// lightningMin, lightningMax, shadowMin, shadowMax,
// modded: { phys, fire, cold, lightning, shadow } } where modded.<elem>
// is true when local mods altered that range — used by the tooltip to
// highlight already-increased values.
function _egGetItemEffectiveDamage(item) {
    const base = item.damage || {};
    const out = {
        physMin: base.min || 0,
        physMax: base.max || 0,
        fireMin: 0, fireMax: 0,
        coldMin: 0, coldMax: 0,
        lightningMin: 0, lightningMax: 0,
        shadowMin: 0, shadowMax: 0,
    };
    let physIncPct = 0;
    const modded = { phys: false, fire: false, cold: false, lightning: false, shadow: false };

    (Array.isArray(item.mods) ? item.mods : []).forEach(mod => {
        (Array.isArray(mod.rolledStats) ? mod.rolledStats : []).forEach(stat => {
            if (stat.value == null) return;
            const val = Number(stat.value) || 0;
            if (val === 0) return;
            const flatStat = EG_LOCAL_DAMAGE_FLAT_KEYS[stat.key];
            if (flatStat) {
                out[flatStat] += val;
                modded[flatStat.replace(/(Min|Max)$/, '')] = true;
                return;
            }
            const incKey = EG_LOCAL_DAMAGE_INC_KEYS[stat.key];
            if (incKey && out.physMax > 0) {
                physIncPct += val;
                modded.phys = true;
            }
        });
    });

    out.physMin = Math.round(out.physMin * (1 + physIncPct / 100));
    out.physMax = Math.round(out.physMax * (1 + physIncPct / 100));

    // Safety: never let a range invert (e.g. after rounding).
    ['fire', 'cold', 'lightning', 'shadow'].forEach(elem => {
        if (out[elem + 'Min'] > out[elem + 'Max']) out[elem + 'Max'] = out[elem + 'Min'];
    });
    if (out.physMin > out.physMax) out.physMax = out.physMin;

    out.modded = modded;
    return out;
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
        // Attributes start from the character's base pool (endgame-requirements.js)
        // so the stats panel, derived side-effects and requirement checks all
        // agree on the same totals.
        strength: (typeof EG_PLAYER_BASE_ATTRIBUTES !== 'undefined') ? EG_PLAYER_BASE_ATTRIBUTES.str : 0,
        agility: (typeof EG_PLAYER_BASE_ATTRIBUTES !== 'undefined') ? EG_PLAYER_BASE_ATTRIBUTES.agi : 0,
        intelligence: (typeof EG_PLAYER_BASE_ATTRIBUTES !== 'undefined') ? EG_PLAYER_BASE_ATTRIBUTES.int : 0,
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
            // Use the LOCAL-modified values (base + flat, scaled by the
            // item's own "% increased" mods) — see _egGetItemEffectiveDefenses.
            const eff = _egGetItemEffectiveDefenses(item);
            s.armourFlat += eff.armour;
            s.evasionFlat += eff.evasion;
            s.absorptionFlat += eff.absorption;
        }

        // Shields carry an implicit base block chance on the base type
        if (item.blockChance) {
            s.blockChance += item.blockChance;
        }

        // NEW — weapon's own base damage range feeds into the same physical damage buckets as gear mods
        if (item.damage) {
            s.physFlatMin += item.damage.min || 0;
            s.physFlatMax += item.damage.max || 0;
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

    // Level-up bonus: every level beyond 1 grants a permanent
    // +5 maximum Life and +2 maximum Mana.
    const lvlForBonus = (typeof _egGetPlayerLevel === 'function')
        ? Math.max(1, Number(_egGetPlayerLevel()) || 1) : 1;
    s.health += (lvlForBonus - 1) * 5;
    s.mana += (lvlForBonus - 1) * 2;

    s.armour = Math.round(s.armourFlat * (1 + s.armourIncPct / 100));
    s.evasion = Math.round(s.evasionFlat * (1 + s.evasionIncPct / 100));
    s.absorption = Math.round(s.absorptionFlat * (1 + s.absorptionIncPct / 100));

    // Active map run: apply the "% reduced Armour, Evasion and Absorption" mod.
    if (typeof _egMapPlayerDefenceMult === 'function') {
        const defMult = _egMapPlayerDefenceMult();
        if (defMult < 1) {
            s.armour = Math.round(s.armour * defMult);
            s.evasion = Math.round(s.evasion * defMult);
            s.absorption = Math.round(s.absorption * defMult);
        }
    }

    return s;
}


//------------------------------------------------------------------------
//-------------------AUTO-ATTACK INTERVAL---------------------------------
//------------------------------------------------------------------------

// Base charge time (in seconds) between automatic melee strikes.
// The equipped weapon's base type defines the interval via its
// attackIntervalSeconds implicit ("Attacks every Xs"); the summed
// attack_speed mod values ("Melee Strikes occur #s more often") are then
// subtracted, clamped to a minimum so strikes can't be spammed.
function _egGetPlayerAttackInterval() {
    const defBase = EG_PLAYER_DEFAULT_ATTACK_INTERVAL;
    let base = defBase;
    const weapons = _egGetAllEquippedItems().filter(it =>
        it.slotType === 'weapon' || it.slotType === 'ranged');
    if (weapons.length) {
        const w = weapons[0];
        if (w.attackIntervalSeconds != null) {
            base = Number(w.attackIntervalSeconds) || defBase;
        } else if (w.attacksPerSecond != null) {
            // Legacy saves predate the rename — derive interval from aps
            base = defBase / (Number(w.attacksPerSecond) || 1);
        }
    }
    const reduction = _egComputePlayerStats().attackSpeed || 0;
    return Math.max(EG_PLAYER_MIN_ATTACK_INTERVAL, base - reduction);
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
// Absorption is a secondary HP layer. It starts regenerating 10s after the
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
    }, 10000);
}






//------------------------------------------------------------------------
//-------------------STATS SUMMARY (DISPLAY)-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Human-readable labels + unit suffix for each stat bucket produced by
// _egComputePlayerStats(). Buckets not listed here are either internal/derived
// (armour/evasion/absorption totals, physFlatMin/Max, elemental dmg pairs)
// and are handled explicitly by _egBuildStatLine() instead.
const EG_STAT_DISPLAY_LABELS = {
    health: { label: t('eg_stat_health'), suffix: '' },
    mana: { label: t('eg_stat_mana'), suffix: '' },
    strength: { label: t('eg_stat_strength'), suffix: '' },
    agility: { label: t('eg_stat_agility'), suffix: '' },
    intelligence: { label: t('eg_stat_intelligence'), suffix: '' },

    lifeRegen: { label: t('eg_stat_life_regen'), suffix: '/s' },
    manaRegen: { label: t('eg_stat_mana_regen'), suffix: '/5s' },
    manaOnKill: { label: t('eg_stat_mana_on_kill'), suffix: '' },
    absorptionOnKill: { label: t('eg_stat_absorption_on_kill'), suffix: '' },
    lifeOnKill: { label: t('eg_stat_life_on_kill'), suffix: '' },
    manaOnMistake: { label: t('eg_stat_mana_on_mistake'), suffix: '' },
    heartHealFlat: { label: t('eg_stat_heart_heal'), suffix: '' },
    heartHealIncPct: { label: t('eg_stat_inc_heart_heal'), suffix: '%' },
    timeAdded: { label: t('eg_stat_time_added'), suffix: 's' },

    fireResist: { label: t('eg_stat_fire_res'), suffix: '%' },
    coldResist: { label: t('eg_stat_cold_res'), suffix: '%' },
    lightningResist: { label: t('eg_stat_lightning_res'), suffix: '%' },
    shadowResist: { label: t('eg_stat_shadow_res'), suffix: '%' },
    arcaneResistFlat: { label: t('eg_stat_arcane_res'), suffix: '' },

    accuracy: { label: t('eg_stat_accuracy'), suffix: '' },
    mistakeCount: { label: t('eg_stat_allowed_mistakes'), suffix: '' },
    focusPct: { label: t('eg_stat_focus'), suffix: '%' },
    mistakeNotCountPct: { label: t('eg_stat_mistake_ignore'), suffix: '%' },
    revealHintPct: { label: t('eg_stat_reveal_hint'), suffix: '%' },
    chanceForNewQuestionPct: { label: t('eg_stat_new_question'), suffix: '%' },

    critChance: { label: t('eg_stat_crit_chance'), suffix: '%' },
    critMultiplierPct: { label: t('eg_stat_crit_multi'), suffix: '%' },

    physIncPct: { label: t('eg_stat_inc_phys_dmg'), suffix: '%' },
    spellDamageFlat: { label: t('eg_stat_spell_damage'), suffix: '' },
    spellDamageIncPct: { label: t('eg_stat_inc_spell_damage'), suffix: '%' },

    lifeLeechPct: { label: t('eg_stat_life_leech'), suffix: '%' },

    blockChance: { label: t('eg_tt_block_chance'), suffix: '%' },
    spellBlockChance: { label: t('eg_stat_spell_block_chance'), suffix: '%' },
    blockRecoveryPct: { label: t('eg_stat_block_recovery'), suffix: '%' },
    dodgeChance: { label: t('eg_stat_dodge_chance'), suffix: '%' },
    spellDodgeChance: { label: t('eg_stat_spell_dodge_chance'), suffix: '%' },

    ignitePct: { label: t('eg_stat_ignite'), suffix: '%' },
    freezePct: { label: t('eg_stat_freeze'), suffix: '%' },
    shockPct: { label: t('eg_stat_shock'), suffix: '%' },
    blindPct: { label: t('eg_stat_blind'), suffix: '%' },
    convertPct: { label: t('eg_stat_convert'), suffix: '%' },

    attackSpeed: { label: t('eg_stat_attack_speed'), suffix: '' },
    cleavePct: { label: t('eg_stat_cleave'), suffix: '%' },
    piercePct: { label: t('eg_stat_pierce'), suffix: '%' },
    snipePct: { label: t('eg_stat_snipe'), suffix: '%' },
    chainPct: { label: t('eg_stat_chain'), suffix: '%' },
    splashPct: { label: t('eg_stat_splash'), suffix: '%' },
    multishotPct: { label: t('eg_stat_multishot'), suffix: '%' },
    pushbackFlat: { label: t('eg_stat_pushback'), suffix: 's' },
    overkillPct: { label: t('eg_stat_overkill'), suffix: '%' },
    staggerPct: { label: t('eg_stat_stagger'), suffix: '%' },
    preemptiveDodgePct: { label: t('eg_stat_preemptive_dodge'), suffix: '%' },
    firstStepSeconds: { label: t('eg_stat_first_step'), suffix: 's' },

    groundedChancePct: { label: t('eg_stat_grounded_chance'), suffix: '%' },
    groundedReductionPct: { label: t('eg_stat_grounded_reduction'), suffix: '%' },
    shieldBashChancePct: { label: t('eg_stat_shield_bash_chance'), suffix: '%' },
    shieldBashDamageFlat: { label: t('eg_stat_shield_bash_damage'), suffix: '' },
    channelDamagePerStack: { label: t('eg_stat_channel_damage'), suffix: '' },
    channelMaxStacks: { label: t('eg_stat_channel_max_stacks'), suffix: '' },
    arcaneSurgeStreak: { label: t('eg_stat_arcane_surge_streak'), suffix: '' },
    arcaneSurgeMana: { label: t('eg_stat_arcane_surge_mana'), suffix: '' },
    manaToDamagePct: { label: t('eg_stat_mana_to_damage'), suffix: '%' },
    echoChancePct: { label: t('eg_stat_echo_chance'), suffix: '%' },
    echoDamagePct: { label: t('eg_stat_echo_damage'), suffix: '%' },
    fatePct: { label: t('eg_stat_fate'), suffix: '%' },
    wardingHP: { label: t('eg_stat_warding'), suffix: '' },

    absorptionRegenRatePct: { label: t('eg_stat_absorption_regen_rate'), suffix: '%' },
    fasterAbsorptionRegenStart: { label: t('eg_stat_faster_absorption_start'), suffix: 's' },
};

// Rounds a value for display: whole numbers stay whole, decimals get 1 digit.
function _egFormatStatValue(val) {
    const rounded = Math.round(val * 10) / 10;
    return Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
}


//------------------------------------------------------------------------
//-------------------STAT LAYOUT (GROUPED DISPLAY)------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Defines WHERE each stat is shown on the hub equipment screen and how
// stats are grouped into categories:
//   offense — upper left corner block (damage, crit, projectiles, ...)
//   defense — upper right corner block (defences, life/mana, resistances)
//   puzzle  — center column between the paperdoll slots (mistakes/time,
//             quiz helpers)
// Buckets not listed in any category are silently omitted from display.
const EG_STAT_LAYOUT = {
    offense: [
        { catKey: 'eg_statcat_attributes', buckets: ['strength', 'agility', 'intelligence'] },
        { catKey: 'eg_statcat_damage', buckets: [
            'physRange', 'fireRange', 'coldRange', 'lightningRange', 'shadowRange',
            'physIncPct', 'spellDamageFlat', 'spellDamageIncPct'] },
        { catKey: 'eg_statcat_crit', buckets: ['critChance', 'critMultiplierPct'] },
        { catKey: 'eg_statcat_projectiles', buckets: [
            'accuracy', 'attackSpeed', 'multishotPct', 'splashPct', 'chainPct',
            'piercePct', 'cleavePct', 'snipePct', 'overkillPct', 'staggerPct',
            'pushbackFlat'] },
        { catKey: 'eg_statcat_ailments', buckets: ['ignitePct', 'freezePct', 'shockPct', 'blindPct', 'convertPct'] },
        { catKey: 'eg_statcat_arcane', buckets: [
            'echoChancePct', 'echoDamagePct', 'channelDamagePerStack',
            'channelMaxStacks', 'arcaneSurgeStreak', 'arcaneSurgeMana',
            'manaToDamagePct', 'fatePct'] },
    ],
    defense: [
        { catKey: 'eg_statcat_defences', buckets: ['armour', 'evasion', 'absorption'] },
        { catKey: 'eg_statcat_life_mana', buckets: [
            'health', 'mana', 'lifeRegen', 'manaRegen', 'lifeLeechPct',
            'lifeOnKill', 'manaOnKill', 'absorptionOnKill', 'manaOnMistake',
            'heartHealFlat', 'heartHealIncPct', 'wardingHP'] },
        { catKey: 'eg_statcat_block_dodge', buckets: [
            'blockChance', 'spellBlockChance', 'blockRecoveryPct',
            'dodgeChance', 'spellDodgeChance', 'preemptiveDodgePct'] },
        { catKey: 'eg_statcat_resistances', buckets: [
            'fireResist', 'coldResist', 'lightningResist', 'shadowResist',
            'arcaneResistFlat'] },
        { catKey: 'eg_statcat_recovery', buckets: [
            'absorptionRegenRatePct', 'fasterAbsorptionRegenStart',
            'groundedChancePct', 'groundedReductionPct',
            'shieldBashChancePct', 'shieldBashDamageFlat'] },
    ],
    puzzle: [
        { catKey: 'eg_statcat_mistakes_time', buckets: [
            'mistakeCount', 'mistakeNotCountPct', 'focusPct', 'timeAdded',
            'firstStepSeconds'] },
        { catKey: 'eg_statcat_quiz', buckets: ['revealHintPct', 'chanceForNewQuestionPct'] },
    ],
};

// Builds a single display line for a stat bucket. Handles the derived /
// combined pseudo-buckets (armour/evasion/absorption totals and the damage
// ranges) explicitly; everything else falls through to EG_STAT_DISPLAY_LABELS.
// Returns null when the stat's aggregated value is zero.
function _egBuildStatLine(bucket, stats) {
    let line = null;

    switch (bucket) {
        // Derived defensive totals (flat + % increased already applied)
        case 'armour':
            if (stats.armour > 0) line = { label: t('eg_tt_armour'), value: `${_egFormatStatValue(stats.armour)}` };
            break;
        case 'evasion':
            if (stats.evasion > 0) line = { label: t('eg_tt_evasion'), value: `${_egFormatStatValue(stats.evasion)}` };
            break;
        case 'absorption':
            if (stats.absorption > 0) line = { label: t('eg_tt_absorption'), value: `${_egFormatStatValue(stats.absorption)}` };
            break;

        // Physical + elemental damage ranges
        case 'physRange':
            if (stats.physFlatMin > 0 || stats.physFlatMax > 0) {
                line = { label: t('eg_stat_phys_damage'), value: `${_egFormatStatValue(stats.physFlatMin)}–${_egFormatStatValue(stats.physFlatMax)}` };
            }
            break;
        case 'fireRange': case 'coldRange': case 'lightningRange': case 'shadowRange': {
            const pairMap = {
                fireRange: ['fireDmgMin', 'fireDmgMax'],
                coldRange: ['coldDmgMin', 'coldDmgMax'],
                lightningRange: ['lightningDmgMin', 'lightningDmgMax'],
                shadowRange: ['shadowDmgMin', 'shadowDmgMax'],
            };
            const [minKey, maxKey] = pairMap[bucket];
            if (stats[minKey] > 0 || stats[maxKey] > 0) {
                const labelKey = { fireRange: 'eg_stat_fire_damage', coldRange: 'eg_stat_cold_damage', lightningRange: 'eg_stat_lightning_damage', shadowRange: 'eg_stat_shadow_damage' }[bucket];
                line = { label: t(labelKey), value: `${_egFormatStatValue(stats[minKey])}–${_egFormatStatValue(stats[maxKey])}` };
            }
            break;
        }

        default: {
            const meta = EG_STAT_DISPLAY_LABELS[bucket];
            if (!meta) return null;
            const val = stats[bucket];
            if (!val || val === 0) return null;
            // Attributes are absolute totals (base + gear), not bonuses —
            // no "+" prefix so the number matches requirement checks.
            const isAttribute = bucket === 'strength' || bucket === 'agility' || bucket === 'intelligence';
            line = { label: meta.label, value: `${isAttribute ? '' : '+'}${_egFormatStatValue(val)}${meta.suffix}` };
        }
    }

    if (!line) return null;
    line.bucket = bucket;
    line.descKey = `eg_statdesc_${bucket}`;
    return line;
}

// Aggregates all non-zero stats into the three screen regions defined by
// EG_STAT_LAYOUT. Returns { offense: [...], defense: [...], puzzle: [...] }
// where each side is an array of { title, lines: [{ label, value, descKey }] }.
function _egBuildGroupedStats(stats) {
    const out = { offense: [], defense: [], puzzle: [] };

    Object.entries(EG_STAT_LAYOUT).forEach(([side, categories]) => {
        categories.forEach(cat => {
            const lines = cat.buckets
                .map(b => _egBuildStatLine(b, stats))
                .filter(Boolean);
            if (lines.length > 0) out[side].push({ title: t(cat.catKey), lines });
        });
    });

    return out;
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



