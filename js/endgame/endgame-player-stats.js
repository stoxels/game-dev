import { Audio_Manager } from '../audio/audio.js';
import { LANG, t } from '../translation/translations.js';
import { EG_RESIST_CAP_PCT } from '../combat/combat-calculations-resistances.js';
import { EG_DEFLECT_BASE_DMG_PCT, EG_DEFLECT_BASE_PCT, EG_PARRY_BASE_PCT, _egGetDeflectChancePct, _egGetDeflectDamagePct, _egGetDualWieldParryChancePct, _egGetParryChancePct } from '../combat/encounter.js';
import { _egEquipped } from './endgame-hub.js';
import { _egGetPlayerLevel, _egSyncBaseAttributes } from './endgame-leveling.js';
import { _egGetActiveMapModValue, _egMapAbsorptionMult, _egMapAccuracyMult, _egMapActionSlowMult, _egMapAttackSpeedMult, _egMapBlockMult, _egMapEvasionMult, _egMapPlayerDefenceMult, _egMapSpellDamageMult } from './endgame-map-launch.js';
import {_egRollInt} from '../loot/loot-mod-application.js';
import { EG_MOD_TABLE_AMULET } from '../loot/loot-mod-tables-amulet.js';
import { EG_MOD_TABLE_ARCANE } from '../loot/loot-mod-tables-arcane.js';
import { EG_MOD_TABLE_BELT } from '../loot/loot-mod-tables-belt.js';
import { EG_MOD_TABLE_BOOTS } from '../loot/loot-mod-tables-boots.js';
import { EG_MOD_TABLE_BRACERS } from '../loot/loot-mod-tables-bracers.js';
import { EG_MOD_TABLE_CHEST } from '../loot/loot-mod-tables-chest.js';
import { EG_MOD_TABLE_CLOAK } from '../loot/loot-mod-tables-cloak.js';
import { EG_MOD_TABLE_EARRING } from '../loot/loot-mod-tables-earring.js';
import { EG_MOD_TABLE_GLOVES } from '../loot/loot-mod-tables-gloves.js';
import { EG_MOD_TABLE_HEAD } from '../loot/loot-mod-tables-head.js';
import { EG_MOD_TABLE_PANTS } from '../loot/loot-mod-tables-pants.js';
import { EG_MOD_TABLE_RING } from '../loot/loot-mod-tables-ring.js';
import { EG_MOD_TABLE_RANGED, EG_MOD_TABLE_SHIELD } from '../loot/loot-mod-tables-shield.js';
import { EG_MOD_TABLE_SHOULDERS } from '../loot/loot-mod-tables-shoulders.js';
import { EG_MOD_TABLE_TALISMAN } from '../loot/loot-mod-tables-talisman.js';
import { EG_MOD_TABLE_WEAPON_2H } from '../loot/loot-mod-tables-weapon-2h.js';
import { EG_MOD_TABLE_WEAPON1, EG_MOD_TABLE_WEAPON_1H } from '../loot/loot-mod-tables-weapon1.js';
import { EG_MOD_TABLE_WEAPON2 } from '../loot/loot-mod-tables-weapon2.js';
import { EG_PLAYER_BASE_ATTRIBUTES, _egIsDualWielding, _egIsTwoHandedWeapon } from '../loot/loot-requirements.js';
import { EG_ONSLAUGHT_SPEED_PCT, _egOnslaughtActive, _egSetRageDecayMult, EG_ENDURANCE_ARMOUR_PER_CHARGE, EG_ENDURANCE_BASE_MAX, EG_ENDURANCE_ELEM_RES_PER_CHARGE, EG_FRENZY_BASE_MAX, EG_FRENZY_DAMAGE_PER_CHARGE, EG_FRENZY_MELEE_SPEED_PER_CHARGE, _egGetEnduranceCharges, _egGetFrenzyCharges, _egGetRage, EG_FORTIFY_BASE_MAX, EG_POWER_BASE_MAX, EG_POWER_CRIT_PER_CHARGE, _egGetFortifyStacks, _egGetPowerCharges } from '../combat/combat-ailments-state.js';
import { EG_PX_PER_METER, _egGetEquippedWeaponInfo, _egIsMaceOrSceptre } from '../combat/combat-weapon-swing-config.js';
import { EG_MELEE_DAMAGE_MULT, EG_PLAYER_CHARGE_TIME_MULT, EG_PLAYER_ABS_MIN_CHARGE_TIME, EG_PLAYER_DEFAULT_ATTACK_INTERVAL, EG_PLAYER_MIN_ATTACK_INTERVAL, _egIsActive } from '../combat/combat-state.js';

//------------------------------------------------------------------------
//-------------------CONSTANTS & DATA DEFINITIONS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Player base stats
// These are the level-1 values before any equipment or passive bonuses apply.
// Future expansion: critChance, critMultiplier, fireDamage, coldDamage, lightningDamage, 
// fireResist, coldResist, lightningResist, armor, evasion, energyShield, strength, dexterity, intelligence, ...

// Life Regen, + Life from Hearts

export const EG_PLAYER_STATS = {
    baseHP: 100, // Starting HP for all monster levels
    baseMana: 60, // Starting mana pool before gear and attribute bonuses
    baseManaRegen: 1, // Mana regenerated every 5s before gear; shows in the sheet's Mana Regen stat
    baseDamage: 10, // Damage dealt per correct cell fill
    chargePushback: 1.5, // Seconds removed from a monster's charge bar on hit
};

// PoE-style weapon setups (see _egIsDualWielding in endgame-requirements.js):
// dual-wielding two 1H weapons sums both weapons' melee damage then scales by
// EG_DUAL_WIELD_DAMAGE_MULT (~1.4x a single 1H, below a 2H's ~1.6-1.7x), and
// grants EG_DUAL_WIELD_PARRY_PCT base parry chance WITHOUT holding the parry key
// (gear parry adds on top; successful projectile parries can still deflect).
export const EG_DUAL_WIELD_DAMAGE_MULT = 0.7;
export const EG_DUAL_WIELD_PARRY_PCT = 15;




//------------------------------------------------------------------------
//-------------------STAT AGGREGATION-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Maps every mod "key" produced by _egBuildRolledStats() (endgame-equipment-generator.js)
// to the stat bucket it feeds. Hybrid mods produce keys `${familyId}_1` / `${familyId}_2`;
// single-stat mods just use `familyId` directly.
export const EG_STAT_KEY_MAP = {
    // NOTE: flat_armour / inc_armour / flat_evasion / inc_evasion /
    // flat_absorption / inc_absorption (and the defense halves of the hybrid
    // families) are LOCAL modifiers - they only affect the base value of the
    // item they roll on. They are handled by _egGetItemEffectiveDefenses()
    // below and intentionally absent from this map.
    flat_health: { bucket: 'health', mode: 'add' },
    inc_health: { bucket: 'healthIncPct', mode: 'add' },
    flat_mana: { bucket: 'mana', mode: 'add' },
    heart_heal: { bucket: 'heartHealFlat', mode: 'add' },
    inc_heart_heal: { bucket: 'heartHealIncPct', mode: 'add' },
    mana_heal: { bucket: 'manaHealFlat', mode: 'add' },
    inc_mana_heal: { bucket: 'manaHealIncPct', mode: 'add' },
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

    // Unique-only: raise the resistance CAP for one element / all elements.
    max_fire_res: { bucket: 'fireResistMax', mode: 'add' },
    max_cold_res: { bucket: 'coldResistMax', mode: 'add' },
    max_lightning_res: { bucket: 'lightningResistMax', mode: 'add' },
    max_shadow_res: { bucket: 'shadowResistMax', mode: 'add' },
    max_all_res: { bucket: 'allResMax', mode: 'add' },

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
    cast_speed: { bucket: 'castSpeedPct', mode: 'add' },

    // High-level balance pass: gear sources for damage buckets that used to be
    // passive-tree only. All buckets already exist and are read by the combat code.
    inc_elemental_damage: { bucket: 'elementalDamageIncPct', mode: 'add' },
    inc_fire_damage: { bucket: 'fireDamageIncPct', mode: 'add' },
    inc_cold_damage: { bucket: 'coldDamageIncPct', mode: 'add' },
    inc_lightning_damage: { bucket: 'lightningDamageIncPct', mode: 'add' },
    inc_shadow_damage: { bucket: 'shadowDamageIncPct', mode: 'add' },
    pen_fire: { bucket: 'penFirePct', mode: 'add' },
    pen_cold: { bucket: 'penColdPct', mode: 'add' },
    pen_lightning: { bucket: 'penLightningPct', mode: 'add' },
    pen_shadow: { bucket: 'penShadowPct', mode: 'add' },
    projectile_damage: { bucket: 'projectileDamageIncPct', mode: 'add' },
    spell_crit_chance: { bucket: 'spellCritChancePct', mode: 'add' },
    spell_crit_multiplier: { bucket: 'spellCritMultiplierPct', mode: 'add' },

    // Support analogue of Spell Damage - feeds the magnitude of every SUPPORT
    // spell (heal / HoT / absorption restore). Read by _uspApplyHealingPower()
    // in js/skills/universal-spells.js, which leaves every capped buff axis
    // (guard / evade / ward / thorns) alone on purpose.
    healing_power: { bucket: 'healingPowerFlat', mode: 'add' },
    inc_healing_power: { bucket: 'healingPowerIncPct', mode: 'add' },

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
    ailment_duration: { bucket: 'ailmentDurationPct', mode: 'add' },
    ailment_effect: { bucket: 'ailmentEffectPct', mode: 'add' },

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

    parry: { bucket: 'parryChancePct', mode: 'add' },
    deflect: { bucket: 'deflectChancePct', mode: 'add' },
    deflect_damage: { bucket: 'deflectDamagePct', mode: 'add' },
    movement_speed: { bucket: 'movementSpeedPct', mode: 'add' },
};

// Shared-bucket → melee-channel counterpart for damage mods. Mods carrying
// these keys are routed per source slot: weapon items feed ONLY their melee
// counterpart, ranged items feed only the shared (projectile) bucket, and
// every other slot feeds both channels.
export const EG_MELEE_BUCKET_MAP = {
    physFlatMin: 'meleePhysMin',
    physFlatMax: 'meleePhysMax',
    physIncPct: 'meleePhysIncPct',
    fireDmgMin: 'meleeFireMin',
    fireDmgMax: 'meleeFireMax',
    coldDmgMin: 'meleeColdMin',
    coldDmgMax: 'meleeColdMax',
    lightningDmgMin: 'meleeLightningMin',
    lightningDmgMax: 'meleeLightningMax',
    shadowDmgMin: 'meleeShadowMin',
    shadowDmgMax: 'meleeShadowMax',
};

//------------------------------------------------------------------------
//-------------------MERGED STAT DISPLAY----------------------------------
//------------------------------------------------------------------------
// Mods that feed the same stat (e.g. a flat Health roll plus the Health
// half of a hybrid life+armour roll) are shown as ONE combined line
// instead of separate ones. Lines are grouped by their localized label
// template (label with all numeric values blanked out); the group's
// values are summed per placeholder position and re-inserted into the
// first-seen template, keeping the original line order. Lines without a
// numeric value and downside mods are never merged with normal mods.
// Returns [{ label: string, downside: bool, tierLabel: string }] for tooltip rendering.
// tierLabel is PoE-style affix tier badge: "P4" for prefix tier 4, "S1" for suffix tier 1,
// and "P2+S3" when multiple mods were merged into one combined line (including hybrids).
export function _egTryHealLegacyDualMod(mod) {
    // Legacy items rolled before the min/min2 -> min1/min2 fix stored a single
    // rolledStat whose label still contains the '@' placeholder and no second
    // stat was created, so the damage value was never shown and never counted
    // toward player stats. Heal in place so the tooltip and aggregation are correct.
    if (!mod || !Array.isArray(mod.rolledStats) || mod.rolledStats.length !== 1) return;
    const lab = mod.rolledStats[0] && mod.rolledStats[0].label;
    if (!lab || lab.indexOf('@') === -1) return;
    // Find the family definition for this mod so we can roll the missing @ value
    let family = null;
    let tierDef = null;
    const _egCollectModTables = () => {
        const out = [];
        if (typeof EG_MOD_TABLE_HEAD !== 'undefined') out.push(EG_MOD_TABLE_HEAD);
        if (typeof EG_MOD_TABLE_EARRING !== 'undefined') out.push(EG_MOD_TABLE_EARRING);
        if (typeof EG_MOD_TABLE_AMULET !== 'undefined') out.push(EG_MOD_TABLE_AMULET);
        if (typeof EG_MOD_TABLE_SHOULDERS !== 'undefined') out.push(EG_MOD_TABLE_SHOULDERS);
        if (typeof EG_MOD_TABLE_CLOAK !== 'undefined') out.push(EG_MOD_TABLE_CLOAK);
        if (typeof EG_MOD_TABLE_CHEST !== 'undefined') out.push(EG_MOD_TABLE_CHEST);
        if (typeof EG_MOD_TABLE_BRACERS !== 'undefined') out.push(EG_MOD_TABLE_BRACERS);
        if (typeof EG_MOD_TABLE_GLOVES !== 'undefined') out.push(EG_MOD_TABLE_GLOVES);
        if (typeof EG_MOD_TABLE_BELT !== 'undefined') out.push(EG_MOD_TABLE_BELT);
        if (typeof EG_MOD_TABLE_PANTS !== 'undefined') out.push(EG_MOD_TABLE_PANTS);
        if (typeof EG_MOD_TABLE_BOOTS !== 'undefined') out.push(EG_MOD_TABLE_BOOTS);
        if (typeof EG_MOD_TABLE_RING !== 'undefined') out.push(EG_MOD_TABLE_RING);
        if (typeof EG_MOD_TABLE_ARCANE !== 'undefined') out.push(EG_MOD_TABLE_ARCANE);
        if (typeof EG_MOD_TABLE_TALISMAN !== 'undefined') out.push(EG_MOD_TABLE_TALISMAN);
        if (typeof EG_MOD_TABLE_WEAPON1 !== 'undefined') out.push(EG_MOD_TABLE_WEAPON1);
        if (typeof EG_MOD_TABLE_WEAPON_1H !== 'undefined') out.push(EG_MOD_TABLE_WEAPON_1H);
        if (typeof EG_MOD_TABLE_WEAPON_2H !== 'undefined') out.push(EG_MOD_TABLE_WEAPON_2H);
        if (typeof EG_MOD_TABLE_WEAPON2 !== 'undefined') out.push(EG_MOD_TABLE_WEAPON2);
        if (typeof EG_MOD_TABLE_SHIELD !== 'undefined') out.push(EG_MOD_TABLE_SHIELD);
        if (typeof EG_MOD_TABLE_RANGED !== 'undefined') out.push(EG_MOD_TABLE_RANGED);
        return out;
    };
    for (const tbl of _egCollectModTables()) {
        const sections = [tbl.prefixes, tbl.suffixes];
        for (const sec of sections) {
            if (!sec || !sec[mod.familyId]) continue;
            family = sec[mod.familyId];
            if (family && Array.isArray(family.tiers)) {
                tierDef = family.tiers.find(t => t.tier === mod.tier);
                if (tierDef) break;
            }
        }
        if (tierDef) break;
    }
    // Fallback: if table lookup failed, try to use any attached family data or
    // infer a range from the existing value - at least hide the placeholder.
    if (!tierDef || tierDef.min2 == null) {
        // No tier info - replace stray '@' with '?' to avoid showing raw placeholder
        mod.rolledStats[0].label = lab.replace('@', '?');
        return;
    }
    const val2 = (typeof _egRollInt === 'function') ? _egRollInt(tierDef.min2, tierDef.max2) : Math.floor((tierDef.min2 + tierDef.max2) / 2);
    const val1 = mod.rolledStats[0].value;
    // Rebuild labels from the family so multi-line families (channel) split correctly
    if (family) {
        const rawLabel = (typeof LANG !== 'undefined' && LANG === 'de' && family.labelDe) ? family.labelDe : family.label;
        const lines = rawLabel.split('\n');
        const l1 = (lines[0] || rawLabel).replace('#', String(val1)).replace('@', String(val2));
        const l2 = (lines[1] || '').replace('#', String(val1)).replace('@', String(val2));
        mod.rolledStats = [
            { key: family.id + '_1', label: l1, value: val1 },
            { key: family.id + '_2', label: l2, value: val2 },
        ];
    } else {
        // Fallback - single-line replacement
        mod.rolledStats[0].label = lab.replace('@', String(val2));
        mod.rolledStats.push({ key: mod.familyId + '_2', label: '', value: val2 });
    }
}

export function _egBuildMergedModLines(mods) {
    // Heal legacy dual-stat mods that were saved with a stray '@' placeholder
    // (shield_bash / arcane_surge / channel rolled with min/min2 before fix).
    if (Array.isArray(mods)) {
        for (const m of mods) _egTryHealLegacyDualMod(m);
    }
    const NUM_RE = /-?\d[\d.,]*/g;
    const groups = [];
    const byKey = new Map();
    function _tierTag(mod) {
        const pfx = mod.type === 'prefix' ? 'P' : (mod.type === 'suffix' ? 'S' : '');
        const tier = mod.tier != null ? String(mod.tier) : '?';
        return pfx ? pfx + tier : tier;
    }
    (Array.isArray(mods) ? mods : []).forEach(mod => {
        if (!Array.isArray(mod.rolledStats)) return;
        mod.rolledStats.forEach(stat => {
            if (!stat || !stat.label) return;
            const downside = !!mod.isDownside;
            const matches = stat.label.match(NUM_RE);
            // Lines without any numeric value can't be meaningfully merged.
            if (!matches || matches.length === 0) {
                groups.push({ label: stat.label, downside, tierLabel: _tierTag(mod), contributions: [{ type: mod.type, tier: mod.tier, crafted: mod.crafted === true }] });
                return;
            }
            const key = (downside ? 'down' : 'norm') + '|' +
                stat.label.replace(NUM_RE, '\u0000');
            let g = byKey.get(key);
            if (!g) {
                g = { template: stat.label, slots: matches.map(() => []), count: 0, downside, contributions: [] };
                byKey.set(key, g);
                groups.push(g);
            }
            matches.forEach((raw, i) => {
                const v = parseFloat(String(raw).replace(',', '.'));
                if (!isNaN(v) && g.slots[i]) g.slots[i].push(v);
            });
            g.contributions.push({ type: mod.type, tier: mod.tier, crafted: mod.crafted === true });
            g.count++;
        });
    });

    return groups.map(g => {
        // Lines without any numeric value were pushed with { label } only
        // (no template/count/slots) - return them verbatim.
        if (g.template == null) return { label: g.label, downside: g.downside, tierLabel: g.tierLabel, contributions: g.contributions, crafted: (g.contributions || []).every(c => c.crafted) };
        let label;
        if (g.count <= 1) {
            label = g.template;
        } else {
            let idx = 0;
            label = g.template.replace(NUM_RE, () => {
                const vals = g.slots[idx++] || [];
                const sum = vals.reduce((a, b) => a + b, 0);
                return String(Math.round(sum * 100) / 100);
            });
        }
        const tierLabel = (g.contributions || []).map(c => {
            const pfx = c.type === 'prefix' ? 'P' : (c.type === 'suffix' ? 'S' : '');
            const tier = c.tier != null ? String(c.tier) : '?';
            return pfx ? pfx + tier : tier;
        }).join('+');
        return { label, downside: g.downside, tierLabel, contributions: g.contributions, crafted: (g.contributions || []).every(c => c.crafted) };
    });
}

// Returns every non-empty equipped item as a flat array.
export function _egGetAllEquippedItems() {
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
export const EG_LOCAL_DEFENSE_FLAT_KEYS = {
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

export const EG_LOCAL_DEFENSE_INC_KEYS = {
    inc_armour: 'armour',
    inc_evasion: 'evasion',
    inc_absorption: 'absorption',
};

// Computes an item's effective (local-modified) defenses.
// Returns { armour, evasion, absorption, modded: { armour, evasion, absorption } }
// where modded.<stat> is true when local mods altered that value - used by
// the tooltip to highlight already-increased values.
export function _egGetItemEffectiveDefenses(item) {
    const base = item.defenses || {};
    const out = {
        armour: base.armour || 0,
        evasion: base.evasion || 0,
        absorption: base.absorption || 0,
    };
    const inc = { armour: 0, evasion: 0, absorption: 0 };
    const modded = { armour: false, evasion: false, absorption: false };

    function applyLocalDefense(stat) {
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
    }
    (Array.isArray(item.mods) ? item.mods : []).forEach(mod => {
        (Array.isArray(mod.rolledStats) ? mod.rolledStats : []).forEach(applyLocalDefense);
    });
    // Implicits also contribute to local defenses (PoE-style)
    (Array.isArray(item.implicits) ? item.implicits : []).forEach(mod => {
        (Array.isArray(mod.rolledStats) ? mod.rolledStats : []).forEach(applyLocalDefense);
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
export const EG_LOCAL_DAMAGE_FLAT_KEYS = {
    flat_physical_damage_1: 'physMin',
    flat_physical_damage_2: 'physMax',
    fire_damage_1: 'fireMin',       fire_damage_2: 'fireMax',
    cold_damage_1: 'coldMin',       cold_damage_2: 'coldMax',
    lightning_damage_1: 'lightningMin', lightning_damage_2: 'lightningMax',
    shadow_damage_1: 'shadowMin',   shadow_damage_2: 'shadowMax',
};

export const EG_LOCAL_DAMAGE_INC_KEYS = {
    inc_physical_damage: 'physInc',
};

// Computes an item's effective (local-modified) damage ranges.
// Returns { physMin, physMax, fireMin, fireMax, coldMin, coldMax,
// lightningMin, lightningMax, shadowMin, shadowMax,
// modded: { phys, fire, cold, lightning, shadow } } where modded.<elem>
// is true when local mods altered that range - used by the tooltip to
// highlight already-increased values.
export function _egGetItemEffectiveDamage(item) {
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

    function applyDamage(stat) {
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
    }
    (Array.isArray(item.mods) ? item.mods : []).forEach(mod => {
        (Array.isArray(mod.rolledStats) ? mod.rolledStats : []).forEach(applyDamage);
    });
    (Array.isArray(item.implicits) ? item.implicits : []).forEach(mod => {
        (Array.isArray(mod.rolledStats) ? mod.rolledStats : []).forEach(applyDamage);
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

//------------------------------------------------------------------------
//-------------------LOCAL ITEM ATTACK INTERVAL---------------------------
//------------------------------------------------------------------------
// The weapon's "Fully charges in Xs" implicit is reduced by its own rolled
// "Melee charges #s faster" mod (attack_speed) - LOCAL in the same display
// sense as the damage ranges above - then shortened by
// EG_PLAYER_CHARGE_TIME_MULT. Clamped to EG_PLAYER_MIN_ATTACK_INTERVAL so
// it matches the combat interval in _egGetPlayerAttackIntervalBreakdown().
export function _egGetItemEffectiveAttackInterval(item) {
    const base = Number(item.attackIntervalSeconds);
    if (!isFinite(base)) return { base: null, interval: null, modded: false };

    let reduction = 0;
    function collectAS(mod) {
        (Array.isArray(mod.rolledStats) ? mod.rolledStats : []).forEach(stat => {
            if (stat.key !== 'attack_speed' || stat.value == null) return;
            reduction += Number(stat.value) || 0;
        });
    }
    (Array.isArray(item.mods) ? item.mods : []).forEach(collectAS);
    (Array.isArray(item.implicits) ? item.implicits : []).forEach(collectAS);

    const minInterval = (typeof EG_PLAYER_MIN_ATTACK_INTERVAL !== 'undefined')
        ? EG_PLAYER_MIN_ATTACK_INTERVAL : 2;
    let interval = Math.round(Math.max(minInterval, base - reduction) * 100) / 100;
    if (typeof EG_PLAYER_CHARGE_TIME_MULT !== 'undefined') {
        interval = Math.round(interval * EG_PLAYER_CHARGE_TIME_MULT * 100) / 100;
    }
    return {
        base,
        // Round away float subtraction noise (e.g. 5.6 - 0.2 = 5.4000000000000004)
        interval,
        modded: reduction > 0,
    };
}

//------------------------------------------------------------------------
//-------------------LOCAL ITEM BLOCK CHANCE------------------------------
//------------------------------------------------------------------------
// Shields carry a flat "Chance to Block" on the base type (item.blockChance).
// Rolled "+#% Chance to Block Attacks" suffixes are LOCAL in the PoE sense
// for shields: they directly increase the shield's own displayed block value
// (underneath the Armour/Evasion lines) instead of appearing only as a
// separate global stat. The tooltip highlights the combined value when local
// mods are present, matching the armour/evasion/damage local systems above.
// Effective = base + sum of block_chance mods on that item.
// Returns { value, base, added, modded } where modded signals the display
// should use .eg-tt-val-modified.
export function _egGetItemEffectiveBlockChance(item) {
    const base = Number(item.blockChance) || 0;
    if (!base) return { value: 0, base: 0, added: 0, modded: false };
    let added = 0;
    function collectBlock(mod) {
        (Array.isArray(mod.rolledStats) ? mod.rolledStats : []).forEach(stat => {
            if (stat.key !== 'block_chance' || stat.value == null) return;
            added += Number(stat.value) || 0;
        });
    }
    (Array.isArray(item.mods) ? item.mods : []).forEach(collectBlock);
    (Array.isArray(item.implicits) ? item.implicits : []).forEach(collectBlock);
    return {
        base,
        added,
        value: base + added,
        modded: added !== 0,
    };
}

// Aggregates every equipped item's implicit defenses + rolled mods into one
// stats object. Recomputed on demand (cheap - ~19 slots, ≤6 mods each) so it
// never goes stale after an equip/unequip.
export function _egComputePlayerStats() {
    const passiveTreeBonuses = _egSyncBaseAttributes() || {};
    const s = {
        // Flat maximum Life from allocated passive-tree nodes (effects
        // pipeline, e.g. reworked node 20031 Anvil Guard) seeds the very
        // same flat pool gear's flat_health feeds, so it aggregates with
        // gear/level bonuses before the % increased multiplier below.
        health: passiveTreeBonuses.healthFlat || 0, mana: passiveTreeBonuses.mana || 0,
        // % increased maximum Life/Mana from allocated passive-tree nodes ride
        // the same multiplicative buckets gear uses; they are never added to
        // the flat pools.
        healthIncPct: passiveTreeBonuses.healthIncPct || 0, manaIncPct: passiveTreeBonuses.manaIncPct || 0,
        // Blood Magic keystone (node 40001): "more" maximum Life multiplies
        // the whole composed pool after every increased source (applied
        // where max HP is built); manaRemoved zeroes the Mana pool;
        // spellsCostLife / spellCostIncPct are read in class-mana.js.
        healthMorePct: passiveTreeBonuses.healthMorePct || 0,
        manaRemoved: passiveTreeBonuses.manaRemoved || 0,
        // Butterfly Effect keystone downside: "less" maximum Mana. A multiplier
        // on the WHOLE pool (base + gear), applied in _getPlayerMaxMana().
        manaLessPct: passiveTreeBonuses.manaLessPct || 0,
        spellsCostLife: passiveTreeBonuses.spellsCostLife || 0,
        spellCostIncPct: passiveTreeBonuses.spellCostIncPct || 0,
        // Primal Flame keystone (node 350): fire conversion share and the
        // fire-only flag, read by _egApplyDamageConversion.
        damageToFirePct: passiveTreeBonuses.damageToFirePct || 0,
        onlyFireDamage: passiveTreeBonuses.onlyFireDamage || 0,
        // Colossus / ignite / fire / physical batch (see pt-effects.js).
        // The mace crit lines are added to the roll only for melee strikes
        // with a Mace or Sceptre; "gain physical as extra Fire" sums the
        // permanent channel with the timed one while its 5s window is open
        // (10s cycle counted from the encounter start).
        critChanceMeleeMacePct: passiveTreeBonuses.critChanceMeleeMacePct || 0,
        critMultiplierMeleeMacePct: passiveTreeBonuses.critMultiplierMeleeMacePct || 0,
        igniteDamageMorePct: passiveTreeBonuses.igniteDamageMorePct || 0,
        physDotMorePct: passiveTreeBonuses.physDotMorePct || 0,
        physAsExtraFirePct: (passiveTreeBonuses.physAsExtraFirePct || 0)
            + (_egFireSurgeActive() ? (passiveTreeBonuses.physAsExtraFireTimedPct || 0) : 0),
        crushPhysReductionPct: passiveTreeBonuses.crushPhysReductionPct || 0,
        // Projectile batch: damage multiplier + crit chance read in
        // _egCalcPlayerDamage, speed read in _egAnimatePlayerProjectile.
        // Bow-spell lines are tracked only - no Bow-tagged spell exists yet.
        projectileDamageIncPct: passiveTreeBonuses.projectileDamageIncPct || 0,
        projectileSpeedPct: passiveTreeBonuses.projectileSpeedPct || 0,
        projectileCritChancePct: passiveTreeBonuses.projectileCritChancePct || 0,
        projectileCritMultiplierPct: passiveTreeBonuses.projectileCritMultiplierPct || 0,
        bowSpellDamageIncPct: passiveTreeBonuses.bowSpellDamageIncPct || 0,
        bowSpellDotIncPct: passiveTreeBonuses.bowSpellDotIncPct || 0,
        // Stun avoidance (Stalwart Vigor nodes): tracked only - monsters cannot
        // stun the player yet; a future player-stun mechanic should roll this.
        stunAvoidPct: passiveTreeBonuses.stunAvoidPct || 0,
        manaOnProjectileHitPct: passiveTreeBonuses.manaOnProjectileHitPct || 0,
        lifeOnProjectileHit: passiveTreeBonuses.lifeOnProjectileHit || 0,
        lifeOnMeleeHit: passiveTreeBonuses.lifeOnMeleeHit || 0,
        dotIncPct: passiveTreeBonuses.dotIncPct || 0,
        shadowDamageIncPct: passiveTreeBonuses.shadowDamageIncPct || 0,
        damageIncPct: passiveTreeBonuses.damageIncPct || 0,
        critChanceDaggerPct: passiveTreeBonuses.critChanceDaggerPct || 0,
        spellCritChancePct: passiveTreeBonuses.spellCritChancePct || 0,
        spellCritMultiplierPct: passiveTreeBonuses.spellCritMultiplierPct || 0,
        chillEffectIncPct: passiveTreeBonuses.chillEffectIncPct || 0,
        absorptionLeechSpellPct: passiveTreeBonuses.absorptionLeechSpellPct || 0,
        absorptionLeechEffectIncPct: passiveTreeBonuses.absorptionLeechEffectIncPct || 0,
        physAsExtraShadowPct: passiveTreeBonuses.physAsExtraShadowPct || 0,
        lifeRecoupPct: passiveTreeBonuses.lifeRecoupPct || 0,
        daggerDamageIncPct: passiveTreeBonuses.daggerDamageIncPct || 0,
        daggerChargeSpeedPct: passiveTreeBonuses.daggerChargeSpeedPct || 0,
        lifeLeechAsAbsorption: passiveTreeBonuses.lifeLeechAsAbsorption || 0,
        absorptionNoRecharge: passiveTreeBonuses.absorptionNoRecharge || 0,
        lifeLeechEffectIncPct: passiveTreeBonuses.lifeLeechEffectIncPct || 0,
        dotIncDaggerPct: passiveTreeBonuses.dotIncDaggerPct || 0,
        critMultiplierDaggerPct: passiveTreeBonuses.critMultiplierDaggerPct || 0,
        poisonDurationPct: passiveTreeBonuses.poisonDurationPct || 0,
        critDotMultiPct: passiveTreeBonuses.critDotMultiPct || 0,
        skillEffectDurationPct: passiveTreeBonuses.skillEffectDurationPct || 0,
        lifeOnAttackHit: passiveTreeBonuses.lifeOnAttackHit || 0,
        lifeBurstOnProjectileHitChancePct: passiveTreeBonuses.lifeBurstOnProjectileHitChancePct || 0,
        bowSpellManaCostReducedPct: passiveTreeBonuses.bowSpellManaCostReducedPct || 0,
        manaOnMeleeHitChargedPct: passiveTreeBonuses.manaOnMeleeHitChargedPct || 0,
        parrySpellChancePct: passiveTreeBonuses.parrySpellChancePct || 0,
        critChanceMeleePct: passiveTreeBonuses.critChanceMeleePct || 0,
        projectileElementalDamageIncPct: passiveTreeBonuses.projectileElementalDamageIncPct || 0,
        // Vital Conduit keystone (node 291): "less" multipliers on Life
        // regeneration and Life leech, and the Absorption-recharge flag.
        lifeRegenLessPct: passiveTreeBonuses.lifeRegenLessPct || 0,
        lifeLeechLessPct: passiveTreeBonuses.lifeLeechLessPct || 0,
        absorptionRechargesLife: passiveTreeBonuses.absorptionRechargesLife || 0,
        glassClockTimerLessPct: passiveTreeBonuses.glassClockTimerLessPct || 0,
        glassClockGain: passiveTreeBonuses.glassClockGain || 0,
        noFillTimeGain: passiveTreeBonuses.noFillTimeGain || 0,
        mistakeTimeCostMorePct: passiveTreeBonuses.mistakeTimeCostMorePct || 0,
        marathon: passiveTreeBonuses.marathon || 0,
        // Flat bonus to fire/cold/lightning resistance (never shadow) and the
        // chance to avoid ailments while a hold-to-cast is running.
        allElementalResist: passiveTreeBonuses.allElementalResist || 0,
        castingAilmentAvoidPct: passiveTreeBonuses.castingAilmentAvoidPct || 0,
        bleedAvoidPct: passiveTreeBonuses.bleedAvoidPct || 0,
        poisonAvoidPct: passiveTreeBonuses.poisonAvoidPct || 0,
        shockAvoidPct: passiveTreeBonuses.shockAvoidPct || 0,
        igniteAvoidPct: passiveTreeBonuses.igniteAvoidPct || 0,
        chillAvoidPct: passiveTreeBonuses.chillAvoidPct || 0,
        elementalAilmentAvoidPct: passiveTreeBonuses.elementalAilmentAvoidPct || 0,
        // Flat Armour from the passive tree (reworked node 30516, Bulwark
        // Endurance) seeds the very same bucket gear and the Str side-effect
        // feed into, so it aggregates with them and passes through the same
        // final armour formula at the end of this function.
        armourFlat: passiveTreeBonuses.armourFlat || 0,
        armourIncPct: passiveTreeBonuses.armourIncPct || 0,
        // Tree evasion (nodes 383/30778/30779/94) joins the gear + Agi pool
        // and is scaled by the same final evasion formula below.
        evasionFlat: passiveTreeBonuses.evasionFlat || 0, evasionIncPct: passiveTreeBonuses.evasionIncPct || 0,
        absorptionFlat: passiveTreeBonuses.absorptionFlat || 0,
        absorptionIncPct: passiveTreeBonuses.absorptionIncPct || 0,
        // Attributes start from the character's base pool (endgame-requirements.js)
        // so the stats panel, derived side-effects and requirement checks all
        // agree on the same totals.
        strength: (typeof EG_PLAYER_BASE_ATTRIBUTES !== 'undefined') ? EG_PLAYER_BASE_ATTRIBUTES.str : 0,
        agility: (typeof EG_PLAYER_BASE_ATTRIBUTES !== 'undefined') ? EG_PLAYER_BASE_ATTRIBUTES.agi : 0,
        intelligence: (typeof EG_PLAYER_BASE_ATTRIBUTES !== 'undefined') ? EG_PLAYER_BASE_ATTRIBUTES.int : 0,
        // Flat Life regeneration per second from allocated passive-tree
        // nodes (effects pipeline, e.g. reworked node 129 Horizon Tracker)
        // seeds the very same bucket gear's life_regen feeds, so tree and
        // gear regen add up in _egTickLifeRegen().
        lifeRegen: passiveTreeBonuses.lifeRegenFlat || 0, manaRegen: EG_PLAYER_STATS.baseManaRegen, manaRegenIncPct: passiveTreeBonuses.manaRegenIncPct || 0,
        // Tree-sourced percentage Life regeneration per second (effects
        // pipeline, e.g. reworked node 30206). _egTickLifeRegen() adds both
        // buckets together each second, scaling this one by the CURRENT
        // maximum Life.
        lifeRegenPct: passiveTreeBonuses.lifeRegenPct || 0,
        // Fire / cold / lightning resistance from allocated passive-tree nodes seed
        // the very same buckets gear rolls into, so they aggregate, are shown
        // capped and obey the 75% cap / Elemental Weakness map mod exactly
        // like gear. Lightning is one of the four elements, so both sides read
        // it: gear's lightning_resist mods resolve into lightningResist (see
        // EG_STAT_KEY_MAP above) and _egCalcPlayerResistanceReduction mitigates
        // incoming lightning hits with it.
        fireResist: passiveTreeBonuses.fireResistFlat || 0,
        coldResist: passiveTreeBonuses.coldResistFlat || 0,
        lightningResist: passiveTreeBonuses.lightningResistFlat || 0, shadowResist: passiveTreeBonuses.shadowResistFlat || 0,
        // "Increased maximum Resistance" bonuses (uniques) - raise the per-
        // element resistance cap above the base 75%. allResMax applies to all
        // four elements at once.
        // Tree-sourced maximum Fire Resistance (effects pipeline, e.g.
        // reworked node 20068 Resolute Advance) seeds the very same bucket
        // gear's max_fire_res feeds, so both raise the cap together below.
        fireResistMax: passiveTreeBonuses.fireResistMax || 0,
        coldResistMax: passiveTreeBonuses.coldResistMax || 0,
        lightningResistMax: passiveTreeBonuses.lightningResistMax || 0,
        shadowResistMax: 0, allResMax: 0,
        // Tree "+% to all maximum Elemental Resistances" (node 250): fire,
        // cold and lightning only; read by _egGetPlayerResistCap.
        allElementalResistMax: passiveTreeBonuses.allElementalResistMax || 0,
        // accuracyIncPct ("increased Accuracy Rating", effects pipeline) is
        // applied to the aggregated rating AFTER the attribute side-effects
        // below, so it scales gear, tree and Agi accuracy together.
        accuracy: passiveTreeBonuses.accuracy || 0, accuracyIncPct: passiveTreeBonuses.accuracyIncPct || 0,
        mistakeCount: passiveTreeBonuses.mistakeCountTree || 0, focusPct: 0, mistakeNotCountPct: passiveTreeBonuses.mistakeNotCountTreePct || 0,
        // Puzzle <-> combat crossover lines (tree channels; each is read by its own hook).
        lifeOnLine: passiveTreeBonuses.lifeOnLine || 0,
        absorptionOnLine: passiveTreeBonuses.absorptionOnLine || 0,
        manaOnLine: passiveTreeBonuses.manaOnLine || 0,
        chargeOnLinePct: passiveTreeBonuses.chargeOnLinePct || 0,
        enduranceOnLinePct: passiveTreeBonuses.enduranceOnLinePct || 0,
        frenzyOnLinePct: passiveTreeBonuses.frenzyOnLinePct || 0,
        powerOnLinePct: passiveTreeBonuses.powerOnLinePct || 0,
        armourPerStreak: passiveTreeBonuses.armourPerStreak || 0,
        // Only counts while no mistake was made this level (block_flawless).
        blockFlawlessPct: (Number(globalThis.mistakeCount) || 0) === 0 ? (passiveTreeBonuses.blockFlawlessPct || 0) : 0,
        mistakeHeal: passiveTreeBonuses.mistakeHeal || 0,
        damagePerStreakPct: passiveTreeBonuses.damagePerStreakPct || 0,
        damageFlawlessPct: passiveTreeBonuses.damageFlawlessPct || 0,
        damageLowTimePct: passiveTreeBonuses.damageLowTimePct || 0,
        damageAfterLinePct: passiveTreeBonuses.damageAfterLinePct || 0,
        revealProjectileDamagePct: passiveTreeBonuses.revealProjectileDamagePct || 0,
        damageOnMistakePct: passiveTreeBonuses.damageOnMistakePct || 0,
        timeOnKill: passiveTreeBonuses.timeOnKill || 0,
        timeOnElite: passiveTreeBonuses.timeOnElite || 0,
        timerFreezeOnStun: passiveTreeBonuses.timerFreezeOnStun || 0,
        cellOnKillPct: passiveTreeBonuses.cellOnKillPct || 0,
        markOnKillPct: passiveTreeBonuses.markOnKillPct || 0,
        quickFillStreakPct: passiveTreeBonuses.quickFillStreakPct || 0,
        firstStepTreeSecs: passiveTreeBonuses.firstStepTreeSecs || 0,
        pickupLifetimeSecs: passiveTreeBonuses.pickupLifetimeSecs || 0,
        luckyTileRewardAmount: passiveTreeBonuses.luckyTileRewardAmount || 0,
        regenLowTimePct: passiveTreeBonuses.regenLowTimePct || 0,
        quizHintPct: passiveTreeBonuses.quizHintPct || 0,
        quizRetryPct: passiveTreeBonuses.quizRetryPct || 0,
        quizTimeSecs: passiveTreeBonuses.quizTimeSecs || 0,
        itemDropPct: passiveTreeBonuses.itemDropPct || 0,
        itemEffectPct: passiveTreeBonuses.itemEffectPct || 0,
        revealHintPct: 0, chanceForNewQuestionPct: 0,
        critChance: passiveTreeBonuses.critChanceFlat || 0, critMultiplierPct: passiveTreeBonuses.critMultiplierFlatPct || 0,
        physFlatMin: 0, physFlatMax: 0,
        // "+% increased physical damage" from the passive tree (reworked
        // notable 20032) seeds the shared projectile/spell bucket; the melee
        // seed below adds the same percentage so a physical melee strike is
        // never left out (each hit reads exactly one of the two buckets, so
        // nothing is counted twice).
        physIncPct: passiveTreeBonuses.physDamageIncPct || 0,
        fireDmgMin: 0, fireDmgMax: 0, coldDmgMin: 0, coldDmgMax: 0,
        lightningDmgMin: 0, lightningDmgMax: 0, shadowDmgMin: 0, shadowDmgMax: 0,
        // Melee-only damage channel - fed by the weapon slot's base damage
        // range and its "… to Melee Strikes" mods. Projectiles (cell reveals /
        // class abilities) read the shared buckets above; unscoped slots
        // (bracers/rings/amulet) feed BOTH channels.
        // The % bucket is seeded by the passive tree (reworked nodes 30195
        // Lesser Melee Force +12% and 30194 Lesser Champion's Might +16%) and
        // gear "% increased Physical Damage" mods add on top via
        // EG_MELEE_BUCKET_MAP.
        meleePhysMin: 0, meleePhysMax: 0,
        meleePhysIncPct: (passiveTreeBonuses.meleePhysIncPct || 0)
            + (passiveTreeBonuses.physDamageIncPct || 0),
        // Weapon-stance split from the passive tree (melee batch, effects
        // pipeline): only ONE applies per strike - Heavy with a two-handed
        // weapon equipped, one-handed otherwise (1H + shield, dual-wield or
        // unarmed). _egCalcPlayerMeleeDamage picks the side; both stack on
        // top of the generic meleePhysIncPct bucket above.
        meleePhys1HIncPct: passiveTreeBonuses.meleePhys1HIncPct || 0,
        meleePhysHeavyIncPct: passiveTreeBonuses.meleePhysHeavyIncPct || 0,
        isHeavyWeaponEquipped: _egGetAllEquippedItems().some(item => typeof _egIsTwoHandedWeapon === 'function' && _egIsTwoHandedWeapon(item)),
        // Passive tree "+% increased melee attack charge-up speed" (reworked
        // node 30197). Unlike the absolute-seconds attackSpeed bucket that
        // gear feeds, this is a percentage applied to the melee charge time
        // by _egGetPlayerAttackIntervalBreakdown() below. Nothing else reads it.
        meleeChargeSpeedPct: passiveTreeBonuses.meleeChargeSpeedPct || 0,
        // Weapon-family batch (effects pipeline, swords/axes): damage
        // multipliers read in _egCalcPlayerMeleeDamage, charge-up speed in
        // the attack interval; isSwordEquipped / isAxeEquipped are set from
        // the equipped weapon below. Accuracy-with-swords is folded into the
        // flat accuracy pool below, so it has no stat line of its own.
        meleePhysSwordIncPct: passiveTreeBonuses.meleePhysSwordIncPct || 0,
        meleePhysAxeIncPct: passiveTreeBonuses.meleePhysAxeIncPct || 0,
        swordChargeSpeedPct: passiveTreeBonuses.swordChargeSpeedPct || 0,
        ignorePhysReductionPct: passiveTreeBonuses.ignorePhysReductionPct || 0,
        intimidateChanceMeleePct: passiveTreeBonuses.intimidateChanceMeleePct || 0,
        intimidateMeleeAmpPct: passiveTreeBonuses.intimidateMeleeAmpPct || 0,
        // Bleed batch (effects pipeline): extra bleed chances and bleed
        // speed read in combat-ailments-core.js; regen rate in
        // _egTickLifeRegen.
        bleedChanceMeleePct: passiveTreeBonuses.bleedChanceMeleePct || 0,
        bleedChanceAttackPct: passiveTreeBonuses.bleedChanceAttackPct || 0,
        poisonChanceAttackPct: passiveTreeBonuses.poisonChanceAttackPct || 0,
        poisonDotMultiPct: passiveTreeBonuses.poisonDotMultiPct || 0,
        bleedSpeedPct: passiveTreeBonuses.bleedSpeedPct || 0,
        lifeRegenRatePct: passiveTreeBonuses.lifeRegenRatePct || 0,
        // Axe batch: charge-up speed while wielding an Axe, and Rage
        // (rage = live count, filled in below; see combat-ailments-state.js).
        axeChargeSpeedPct: passiveTreeBonuses.axeChargeSpeedPct || 0,
        rageOnHitAxe: passiveTreeBonuses.rageOnHitAxe || 0,
        rageMeleeMorePct: passiveTreeBonuses.rageMeleeMorePct || 0,
        rageMax: passiveTreeBonuses.rageMax || 0,
        rage: 0,
        // Mace / sceptre batch (nodes 30333/30334): damage with the family
        // (read in _egCalcPlayerMeleeDamage) and the new Area of Effect
        // stat (no consumer yet - future spell targeting areas).
        meleePhysMaceIncPct: passiveTreeBonuses.meleePhysMaceIncPct || 0,
        areaOfEffectPct: passiveTreeBonuses.areaOfEffectPct || 0,
        // Stun (mace batch): chance for charged mace/sceptre melee hits, and
        // the duration scaler for every stun / stagger you inflict.
        stunChanceMaceChargedPct: passiveTreeBonuses.stunChanceMaceChargedPct || 0,
        stunDurationPct: passiveTreeBonuses.stunDurationPct || 0,
        // Heavy-weapon stun batch (read in encounter-monster-damage.js and
        // _egCalcPlayerMeleeDamage).
        stunChanceHeavyPct: passiveTreeBonuses.stunChanceHeavyPct || 0,
        stunDurationHeavyPct: passiveTreeBonuses.stunDurationHeavyPct || 0,
        stunDoubleChancePct: passiveTreeBonuses.stunDoubleChancePct || 0,
        meleeDoubleDamageChancePct: passiveTreeBonuses.meleeDoubleDamageChancePct || 0,
        // Melee-spell batch: tracked only, no Melee-tagged spell exists yet.
        meleeSpellManaCostReducedPct: passiveTreeBonuses.meleeSpellManaCostReducedPct || 0,
        meleeSpellLifeCostPct: passiveTreeBonuses.meleeSpellLifeCostPct || 0,
        // Corpse explosion on melee kills (node 20045).
        meleeKillExplodeChancePct: passiveTreeBonuses.meleeKillExplodeChancePct || 0,
        isMaceEquipped: false,
        isDaggerEquipped: false,
        isSwordEquipped: false,
        isAxeEquipped: false,
        isStaffEquipped: false,
        staffBlockPct: passiveTreeBonuses.staffBlockPct || 0,
        staffSpellBlockPct: passiveTreeBonuses.staffSpellBlockPct || 0,
        shieldSpellBlockPct: passiveTreeBonuses.shieldSpellBlockPct || 0,
        isWandEquipped: false,
        attacksNeverMiss: passiveTreeBonuses.attacksNeverMiss || 0,
        movementSpeedLessPct: passiveTreeBonuses.movementSpeedLessPct || 0,
        noRepeatTarget: passiveTreeBonuses.noRepeatTarget || 0,
        singleElementMorePct: passiveTreeBonuses.singleElementMorePct || 0,
        lastElementResistPct: passiveTreeBonuses.lastElementResistPct || 0,
        absorptionStopsWhileAttacking: passiveTreeBonuses.absorptionStopsWhileAttacking || 0,
        absorptionRegenDelaySecs: passiveTreeBonuses.absorptionRegenDelaySecs || 0,
        evasionToArmour: passiveTreeBonuses.evasionToArmour || 0,
        agilityNoEvasion: passiveTreeBonuses.agilityNoEvasion || 0,
        lifeLeechInstant: passiveTreeBonuses.lifeLeechInstant || 0,
        lifeOnlyFromLeech: passiveTreeBonuses.lifeOnlyFromLeech || 0,
        windDancerLessPct: passiveTreeBonuses.windDancerLessPct || 0,
        windDancerEvadePct: passiveTreeBonuses.windDancerEvadePct || 0,
        windDancerMorePct: passiveTreeBonuses.windDancerMorePct || 0,
        lifeBecomesOne: passiveTreeBonuses.lifeBecomesOne || 0,
        shadowImmune: passiveTreeBonuses.shadowImmune || 0,
        chilledColdTaken: passiveTreeBonuses.chilledColdTaken || 0,
        damageToColdPct: passiveTreeBonuses.damageToColdPct || 0,
        onlyColdDamage: passiveTreeBonuses.onlyColdDamage || 0,
        bleedStackMax: passiveTreeBonuses.bleedStackMax || 0,
        bleedLessPct: passiveTreeBonuses.bleedLessPct || 0,
        absorptionRemoved: passiveTreeBonuses.absorptionRemoved || 0,
        manaToLifePct: passiveTreeBonuses.manaToLifePct || 0,
        elementalOverloadPct: passiveTreeBonuses.elementalOverloadPct || 0,
        critsNoExtraDamage: passiveTreeBonuses.critsNoExtraDamage || 0,
        dotMultiEqualsCrit: passiveTreeBonuses.dotMultiEqualsCrit || 0,
        nonCritNoAilments: passiveTreeBonuses.nonCritNoAilments || 0,
        absorptionRegenUninterrupted: passiveTreeBonuses.absorptionRegenUninterrupted || 0,
        absorptionRegenLessPct: passiveTreeBonuses.absorptionRegenLessPct || 0,
        armourDefendDouble: passiveTreeBonuses.armourDefendDouble || 0,
        maxDamageReductionCap: passiveTreeBonuses.maxDamageReductionCap || 0,
        spellDmgLowLifeMorePct: passiveTreeBonuses.spellDmgLowLifeMorePct || 0,
        damageFromManaPct: passiveTreeBonuses.damageFromManaPct || 0,
        ghostDance: passiveTreeBonuses.ghostDance || 0,
        ghostShroudMax: passiveTreeBonuses.ghostShroudMax || 0,
        ghostShroudRecoverPct: passiveTreeBonuses.ghostShroudRecoverPct || 0,
        blockDoubled: passiveTreeBonuses.blockDoubled || 0,
        blockedHitTakenPct: passiveTreeBonuses.blockedHitTakenPct || 0,
        damageToLightningPct: passiveTreeBonuses.damageToLightningPct || 0,
        onlyLightningDamage: passiveTreeBonuses.onlyLightningDamage || 0,
        lightningMaxMorePct: passiveTreeBonuses.lightningMaxMorePct || 0,
        lightningMinLessPct: passiveTreeBonuses.lightningMinLessPct || 0,
        cannotEvade: passiveTreeBonuses.cannotEvade || 0,
        cannotBeStunned: passiveTreeBonuses.cannotBeStunned || 0,
        pointBlankPct: passiveTreeBonuses.pointBlankPct || 0,
        blockMaxAttackLess: passiveTreeBonuses.blockMaxAttackLess || 0,
        blockMaxSpellLess: passiveTreeBonuses.blockMaxSpellLess || 0,
        spellBlockPerOvercap: passiveTreeBonuses.spellBlockPerOvercap || 0,
        dodgeChanceTreePct: passiveTreeBonuses.dodgeChanceTreePct || 0,
        armourLessPct: passiveTreeBonuses.armourLessPct || 0,
        absorptionLessPct: passiveTreeBonuses.absorptionLessPct || 0,
        spellCostFromAbsorption: passiveTreeBonuses.spellCostFromAbsorption || 0,
        strengthSpellDamage: passiveTreeBonuses.strengthSpellDamage || 0,
        lifeRegenToAbsorption: passiveTreeBonuses.lifeRegenToAbsorption || 0,
        preciseTechniquePct: passiveTreeBonuses.preciseTechniquePct || 0,
        neverCrit: passiveTreeBonuses.neverCrit || 0,
        impaleSpread: passiveTreeBonuses.impaleSpread || 0,
        impaleExtra: passiveTreeBonuses.impaleExtra || 0,
        impaleLockout: passiveTreeBonuses.impaleLockout || 0,
        secondaryDamagePct: passiveTreeBonuses.secondaryDamagePct || 0,
        pierceChanceTreePct: passiveTreeBonuses.pierceChanceTreePct || 0,
        pierceTargetsExtra: passiveTreeBonuses.pierceTargetsExtra || 0,
        chainChanceTreePct: passiveTreeBonuses.chainChanceTreePct || 0,
        chainCountExtra: passiveTreeBonuses.chainCountExtra || 0,
        forkChancePct: passiveTreeBonuses.forkChancePct || 0,
        forkExtraChancePct: passiveTreeBonuses.forkExtraChancePct || 0,
        multishotChanceTreePct: passiveTreeBonuses.multishotChanceTreePct || 0,
        isBowEquipped: false,
        onslaught: false,
        costEfficiencyPct: passiveTreeBonuses.costEfficiencyPct || 0,
        onslaughtEffectPct: passiveTreeBonuses.onslaughtEffectPct || 0,
        onslaughtOnKillPct: passiveTreeBonuses.onslaughtOnKillPct || 0,
        onslaughtDefencePct: passiveTreeBonuses.onslaughtDefencePct || 0,
        leechEffectRecentCritPct: passiveTreeBonuses.leechEffectRecentCritPct || 0,
        wandPhysAsLightningPct: passiveTreeBonuses.wandPhysAsLightningPct || 0,
        bowAoePct: passiveTreeBonuses.bowAoePct || 0,
        dmgFullAbsorptionPct: passiveTreeBonuses.dmgFullAbsorptionPct || 0,
        critMultiHeavy: passiveTreeBonuses.critMultiHeavy || 0,
        dmgVsLowLifePct: passiveTreeBonuses.dmgVsLowLifePct || 0,
        aoeRecentKillPct: passiveTreeBonuses.aoeRecentKillPct || 0,
        ailmentDurationTakenPct: passiveTreeBonuses.ailmentDurationTakenPct || 0,
        chillShockTakenPct: passiveTreeBonuses.chillShockTakenPct || 0,
        spellDotMultiPct: passiveTreeBonuses.spellDotMultiPct || 0,
        manaLeechAttackPct: passiveTreeBonuses.manaLeechAttackPct || 0,
        spellBlockFlat: passiveTreeBonuses.spellBlockFlat || 0,
        dmgRecentShockPct: passiveTreeBonuses.dmgRecentShockPct || 0,
        shockDurationPct: passiveTreeBonuses.shockDurationPct || 0,
        shockEffectPct: passiveTreeBonuses.shockEffectPct || 0,
        lifePulsePct: passiveTreeBonuses.lifePulsePct || 0,
        dotFasterPct: passiveTreeBonuses.dotFasterPct || 0,
        enduranceMin: passiveTreeBonuses.enduranceMin || 0,
        enduranceOnKillPct: passiveTreeBonuses.enduranceOnKillPct || 0,
        damagePerEndurancePct: passiveTreeBonuses.damagePerEndurancePct || 0,
        enduranceWhenHitPct: passiveTreeBonuses.enduranceWhenHitPct || 0,
        lowLifeRegenPct: passiveTreeBonuses.lowLifeRegenPct || 0,
        physTakenFlat: passiveTreeBonuses.physTakenFlat || 0,
        manaLeechEffectPct: passiveTreeBonuses.manaLeechEffectPct || 0,
        critVsBleedingPct: passiveTreeBonuses.critVsBleedingPct || 0,
        critMultiVsBleedingPct: passiveTreeBonuses.critMultiVsBleedingPct || 0,
        avoidPhysHitPct: passiveTreeBonuses.avoidPhysHitPct || 0,
        armourIfHitPct: passiveTreeBonuses.armourIfHitPct || 0,
        evasionIfNotHitPct: passiveTreeBonuses.evasionIfNotHitPct || 0,
        igniteFasterPct: passiveTreeBonuses.igniteFasterPct || 0,
        freezeDurationPct: passiveTreeBonuses.freezeDurationPct || 0,
        critVsShockedPct: passiveTreeBonuses.critVsShockedPct || 0,
        shadowResDouble: passiveTreeBonuses.shadowResDouble || 0,
        armourPerEndurancePct: passiveTreeBonuses.armourPerEndurancePct || 0,
        moveSpeedPerFrenzyPct: passiveTreeBonuses.moveSpeedPerFrenzyPct || 0,
        chargeSpeedPerFrenzyPct: passiveTreeBonuses.chargeSpeedPerFrenzyPct || 0,
        stunPerEndurancePct: passiveTreeBonuses.stunPerEndurancePct || 0,
        aoePerEndurancePct: passiveTreeBonuses.aoePerEndurancePct || 0,
        areaDamagePct: passiveTreeBonuses.areaDamagePct || 0,
        shieldElementalRes: passiveTreeBonuses.shieldElementalRes || 0,
        ailmentEffectTreePct: passiveTreeBonuses.ailmentEffectTreePct || 0,
        blindDurationPct: passiveTreeBonuses.blindDurationPct || 0,
        chillDurationPct: passiveTreeBonuses.chillDurationPct || 0,
        poisonChanceSpellPct: passiveTreeBonuses.poisonChanceSpellPct || 0,
        igniteDurationTakenPct: passiveTreeBonuses.igniteDurationTakenPct || 0,
        shockEffectTakenPct: passiveTreeBonuses.shockEffectTakenPct || 0,
        chillEffectTakenPct: passiveTreeBonuses.chillEffectTakenPct || 0,
        freezeDurationTakenPct: passiveTreeBonuses.freezeDurationTakenPct || 0,
        spellDotIncPct: passiveTreeBonuses.spellDotIncPct || 0,
        critPerPowerCharge: passiveTreeBonuses.critPerPowerCharge || 0,
        manaRegenPerPowerPct: passiveTreeBonuses.manaRegenPerPowerPct || 0,
        critMultiPerPowerCharge: passiveTreeBonuses.critMultiPerPowerCharge || 0,
        shieldCastSpeedPct: passiveTreeBonuses.shieldCastSpeedPct || 0,
        shieldSpellDamagePct: passiveTreeBonuses.shieldSpellDamagePct || 0,
        spellDamagePerPowerPct: passiveTreeBonuses.spellDamagePerPowerPct || 0,
        shieldAbsorptionPct: passiveTreeBonuses.shieldAbsorptionPct || 0,
        rageDecaySlowerPct: passiveTreeBonuses.rageDecaySlowerPct || 0,
        ragePerArmourPct: passiveTreeBonuses.ragePerArmourPct || 0,
        rageWhenHitAmount: passiveTreeBonuses.rageWhenHitAmount || 0,
        powerChargesMax: EG_POWER_BASE_MAX + (passiveTreeBonuses.powerChargesMax || 0),
        powerDurationPct: passiveTreeBonuses.powerDurationPct || 0,
        powerOnCritPct: passiveTreeBonuses.powerOnCritPct || 0,
        powerOnKillPct: passiveTreeBonuses.powerOnKillPct || 0,
        powerOnBlockPct: passiveTreeBonuses.powerOnBlockPct || 0,
        powerOnStunPct: passiveTreeBonuses.powerOnStunPct || 0,
        powerDamagePerChargePct: passiveTreeBonuses.powerDamagePerChargePct || 0,
        frenzyOnKillPct: passiveTreeBonuses.frenzyOnKillPct || 0,
        frenzyOnBlockPct: passiveTreeBonuses.frenzyOnBlockPct || 0,
        enduranceOnBlockPct: passiveTreeBonuses.enduranceOnBlockPct || 0,
        enduranceOnMeleeCritPct: passiveTreeBonuses.enduranceOnMeleeCritPct || 0,
        blindChancePct: passiveTreeBonuses.blindChancePct || 0,
        blindEffectIncPct: passiveTreeBonuses.blindEffectIncPct || 0,
        critChanceVsBlindedPct: passiveTreeBonuses.critChanceVsBlindedPct || 0,
        fortifyMax: EG_FORTIFY_BASE_MAX + (passiveTreeBonuses.fortifyMax || 0),
        fortifyDurationPct: passiveTreeBonuses.fortifyDurationPct || 0,
        fortifyOnStunPct: passiveTreeBonuses.fortifyOnStunPct || 0,
        fortifyEffectIncPct: passiveTreeBonuses.fortifyEffectIncPct || 0,
        fortifiedDefencePct: passiveTreeBonuses.fortifiedDefencePct || 0,
        stunChancePct: passiveTreeBonuses.stunChancePct || 0,
        riposteDamagePct: passiveTreeBonuses.riposteDamagePct || 0,
        riposteDurationPct: passiveTreeBonuses.riposteDurationPct || 0,
        poisonChanceDaggerPct: passiveTreeBonuses.poisonChanceDaggerPct || 0,
        daggerCritPoisons: passiveTreeBonuses.daggerCritPoisons || 0,
        powerCharges: 0,
        fortifyStacks: 0,
        critChanceSwordPct: passiveTreeBonuses.critChanceSwordPct || 0,
        critMultiplierSwordPct: passiveTreeBonuses.critMultiplierSwordPct || 0,
        critChanceAxePct: passiveTreeBonuses.critChanceAxePct || 0,
        critMultiplierAxePct: passiveTreeBonuses.critMultiplierAxePct || 0,
        staffDamageIncPct: passiveTreeBonuses.staffDamageIncPct || 0,
        staffChargeSpeedPct: passiveTreeBonuses.staffChargeSpeedPct || 0,
        critChanceStaffPct: passiveTreeBonuses.critChanceStaffPct || 0,
        critMultiplierStaffPct: passiveTreeBonuses.critMultiplierStaffPct || 0,
        wandDamageIncPct: passiveTreeBonuses.wandDamageIncPct || 0,
        wandChargeSpeedPct: passiveTreeBonuses.wandChargeSpeedPct || 0,
        critChanceWandPct: passiveTreeBonuses.critChanceWandPct || 0,
        critMultiplierWandPct: passiveTreeBonuses.critMultiplierWandPct || 0,
        dualDamageIncPct: passiveTreeBonuses.dualDamageIncPct || 0,
        dualChargeSpeedPct: passiveTreeBonuses.dualChargeSpeedPct || 0,
        dualAccuracyIncPct: passiveTreeBonuses.dualAccuracyIncPct || 0,
        dualCritChancePct: passiveTreeBonuses.dualCritChancePct || 0,
        dualCritMultiPct: passiveTreeBonuses.dualCritMultiPct || 0,
        dualCastSpeedPct: passiveTreeBonuses.dualCastSpeedPct || 0,
        dualSpellDamagePct: passiveTreeBonuses.dualSpellDamagePct || 0,
        dualMoveSpeedPct: passiveTreeBonuses.dualMoveSpeedPct || 0,
        dualBlockPct: passiveTreeBonuses.dualBlockPct || 0,
        physAsExtraColdPct: passiveTreeBonuses.physAsExtraColdPct || 0,
        physAsExtraLightningPct: passiveTreeBonuses.physAsExtraLightningPct || 0,
        freezeChancePct: passiveTreeBonuses.freezeChancePct || 0,
        shockChancePct: passiveTreeBonuses.shockChancePct || 0,
        penFirePct: passiveTreeBonuses.penFirePct || 0,
        penColdPct: passiveTreeBonuses.penColdPct || 0,
        penLightningPct: passiveTreeBonuses.penLightningPct || 0,
        penShadowPct: passiveTreeBonuses.penShadowPct || 0,
        penElementalPct: passiveTreeBonuses.penElementalPct || 0,
        meleeFireMin: 0, meleeFireMax: 0, meleeColdMin: 0, meleeColdMax: 0,
        meleeLightningMin: 0, meleeLightningMax: 0,
        meleeShadowMin: 0, meleeShadowMax: 0,
        spellDamageFlat: 0, spellDamageIncPct: passiveTreeBonuses.spellDamageIncPct || 0,
        // "% increased elemental damage" (passive tree only - no gear mod
        // feeds this bucket). Multiplies the ELEMENTAL share of a hit and
        // nothing else: both gear elemental channels (fireDmg*/meleeFire*)
        // roll it into their per-element breakdown in
        // combat-calculations.js, and universal-spells.js adds it to
        // elemental spells in calcUniversalSpellHit(). Physical shares are
        // never touched by it.
        elementalDamageIncPct: passiveTreeBonuses.elementalDamageIncPct || 0,
        // Fire / cold-only siblings of the buckets above, also passive-tree
        // only:
        //   <el>DamageIncPct - that element's share of
        //                       elementalDamageIncPct, read per element in
        //                       combat-calculations.js and calcUniversalSpellHit().
        //   <el>CastSpeedPct - cast speed that only applies while casting a
        //                       spell of that element (spell-casttime.js adds
        //                       it to castSpeedPct); every other element
        //                       ignores it.
        fireDamageIncPct: passiveTreeBonuses.fireDamageIncPct || 0,
        coldDamageIncPct: passiveTreeBonuses.coldDamageIncPct || 0,
        fireCastSpeedPct: passiveTreeBonuses.fireCastSpeedPct || 0,
        coldCastSpeedPct: passiveTreeBonuses.coldCastSpeedPct || 0,
        // Lightning's siblings of the two buckets above. Lightning is one of the
        // four EG_ELEMENTS, so both channels reach every channel:
        // lightningDamageIncPct scales the lightning share of melee strikes
        // and projectiles (combat-calculations.js, fed by the lightning damage
        // gear mods) plus every lightning-element spell (universal-spells.js), and
        // spell-casttime.js adds lightningCastSpeedPct on top of castSpeedPct
        // while casting a lightning spell.
        lightningDamageIncPct: passiveTreeBonuses.lightningDamageIncPct || 0,
        lightningCastSpeedPct: passiveTreeBonuses.lightningCastSpeedPct || 0,
        castSpeedPct: passiveTreeBonuses.castSpeedPct || 0,
        healingPowerFlat: 0, healingPowerIncPct: 0,
        // Tree-sourced life leech (effects pipeline, e.g. reworked grit
        // nodes 30257/30258): seeds the very same bucket gear's life_leech
        // feeds (add-mode, so both stack) - read by both damage calcs in
        // combat-calculations.js.
        lifeLeechPct: passiveTreeBonuses.lifeLeechPct || 0,
        // Melee-only leech from the tree (nodes 30257/30258/20043); applied in
        // _egCalcPlayerMeleeDamage on top of the gear bucket above.
        lifeLeechMeleePct: passiveTreeBonuses.lifeLeechMeleePct || 0,
        blockChance: 0, spellBlockChance: 0,
        // Tree-sourced block recovery (effects pipeline, e.g. reworked node
        // 30254) seeds the very same bucket gear's block_recovery feeds, so
        // both shorten the post-block lockout together in encounter-damage.
        blockRecoveryPct: passiveTreeBonuses.blockRecoveryPct || 0,
        // Tree-sourced conditional block chance (effects pipeline, e.g.
        // reworked node 30255): fires without a shield while dual-wielding
        // or holding one. Read by the block roll in _egPlayerTakeDamage.
        blockChanceTree: passiveTreeBonuses.blockChanceTree || 0,
        dodgeChance: 0, spellDodgeChance: 0,
        ignitePct: passiveTreeBonuses.igniteChancePct || 0, freezePct: passiveTreeBonuses.freezeChancePct || 0, shockPct: passiveTreeBonuses.shockChancePct || 0, blindPct: passiveTreeBonuses.blindChancePct || 0, convertPct: 0,
        ailmentDurationPct: 0, ailmentEffectPct: 0,
        // Per-ailment durations for YOUR ailments on enemies (effects
        // pipeline, e.g. reworked nodes 30252/30253): scale the monster-side
        // ignite/bleed durations in _egApplyMonsterAilment.
        igniteDurationPct: passiveTreeBonuses.igniteDurationPct || 0,
        bleedDurationPct: passiveTreeBonuses.bleedDurationPct || 0,
        // Shield batch (effects pipeline, e.g. reworked nodes 30374/285):
        // block chance that only exists while a shield is equipped (read in
        // _egPlayerTakeDamage), the on-kill Endurance Charge chance (read in
        // _egKillMonster) and the charge cap. The shield-conditional damage
        // and defence channels are folded in below / in the item loop.
        blockChanceShieldPct: passiveTreeBonuses.blockChanceShieldPct || 0,
        enduranceOnKillShieldPct: passiveTreeBonuses.enduranceOnKillShieldPct || 0,
        enduranceChargesMax: EG_ENDURANCE_BASE_MAX + (passiveTreeBonuses.enduranceChargesMax || 0),
        enduranceCharges: 0,
        // Frenzy Charges (combat-ailments-state.js): cap and duration scaler
        // from the tree; the live count and charge-derived bonuses are
        // folded in below.
        frenzyChargesMax: EG_FRENZY_BASE_MAX + (passiveTreeBonuses.frenzyChargesMax || 0),
        frenzyCharges: 0,
        frenzyDurationPct: passiveTreeBonuses.frenzyDurationPct || 0,
        evasionPerFrenzyChargePct: passiveTreeBonuses.evasionPerFrenzyChargePct || 0,
        frenzyDamageMorePct: 0,
        // Endurance batch (nodes 30344/30341): charge duration scaler and
        // per-charge Life regen, read in combat-ailments-state.js and
        // _egTickLifeRegen.
        enduranceDurationPct: passiveTreeBonuses.enduranceDurationPct || 0,
        lifeRegenPerEndurancePct: passiveTreeBonuses.lifeRegenPerEndurancePct || 0,
        isShieldEquipped: false,
        // Impale (heavy-weapon batch, effects pipeline, e.g. reworked nodes
        // 30268/240/8): chance, effect and duration scalers read by
        // _egApplyImpaleToHit in combat-ailments-core.js. Only heavy melee
        // hits can impale, so the chance is meaningless without the stance.
        impaleChanceHeavyPct: passiveTreeBonuses.impaleChanceHeavyPct || 0,
        impaleEffectHeavyPct: passiveTreeBonuses.impaleEffectHeavyPct || 0,
        impaleEffectFreshPct: passiveTreeBonuses.impaleEffectFreshPct || 0,
        impaleDurationPct: passiveTreeBonuses.impaleDurationPct || 0,
        // Retaliation ward (node 20036): a bleeding attacker cannot bleed you,
        // a burning one cannot ignite you - see _egTryRetaliationWard in
        // combat-ailments-core.js.
        retaliationWardBleed: passiveTreeBonuses.retaliationWardBleed || 0,
        retaliationWardIgnite: passiveTreeBonuses.retaliationWardIgnite || 0,
        // Champion's Vigor (reworked node 20033, legacy-table wired): bonus
        // melee strike range in meters, the melee splash base radius in px
        // it unlocks, and the increased AoE % scaling that radius - see
        // _egMeleeTargetInRange and _egTryMeleeSplashHit.
        meleeRangeM: passiveTreeBonuses.meleeRangeM || 0,
        meleeSplashBasePx: (passiveTreeBonuses.meleeSplashBaseM || 0) * EG_PX_PER_METER,
        meleeAoEPct: passiveTreeBonuses.meleeAoEPct || 0,
        attackSpeed: 0, cleavePct: 0, piercePct: 0, snipePct: 0, chainPct: 0, splashPct: 0,
        // Passive-tree percentage attack speed (reworked notable 20032):
        // the seconds-based attackSpeed bucket above stays gear-only; this
        // one shortens the melee charge proportionally in
        // _egGetPlayerAttackIntervalBreakdown().
        attackSpeedPct: passiveTreeBonuses.attackSpeedPct || 0,
        multishotPct: 0, pushbackFlat: 0, overkillPct: 0, staggerPct: 0, preemptiveDodgePct: 0,
        firstStepSeconds: 0, groundedChancePct: 0, groundedReductionPct: 0,
        shieldBashChancePct: 0, shieldBashDamageFlat: 0,
        // Flat physical retaliation against melee attackers from allocated
        // passive-tree nodes (effects pipeline, e.g. reworked node 13
        // Enhanced Rewards). Read by the flat-reflect hook in
        // _egPlayerTakeDamage (encounter-damage.js), next to Retribution.
        reflectPhysFlat: passiveTreeBonuses.reflectPhysFlat || 0,
        channelDamagePerStack: 0, channelMaxStacks: 0,
        arcaneSurgeStreak: Infinity, arcaneSurgeMana: 0, manaToDamagePct: 0,
        echoChancePct: 0, echoDamagePct: 0, fatePct: 0, wardingHP: 0,
        parryChancePct: 0, deflectChancePct: 0, deflectDamagePct: 0,
        movementSpeedPct: passiveTreeBonuses.movementSpeedPct || 0,
        manaOnKill: passiveTreeBonuses.manaOnKillFlat || 0, absorptionOnKill: passiveTreeBonuses.absorptionOnKillFlat || 0, lifeOnKill: passiveTreeBonuses.lifeOnKillFlat || 0, manaOnMistake: 0,
        heartHealFlat: passiveTreeBonuses.heartHealFlat || 0, heartHealIncPct: 0, manaHealFlat: 0, manaHealIncPct: passiveTreeBonuses.manaHealIncPct || 0, timeAdded: 0,
        heartSpawnIncPct: passiveTreeBonuses.heartSpawnIncPct || 0, manaSpawnIncPct: passiveTreeBonuses.manaSpawnIncPct || 0,
        absorptionRegenRatePct: passiveTreeBonuses.absorptionRegenRatePct || 0, fasterAbsorptionRegenStart: 0,
    };

    _egGetAllEquippedItems().forEach(item => {
        if (item.defenses) {
            // Use the LOCAL-modified values (base + flat, scaled by the
            // item's own "% increased" mods) - see _egGetItemEffectiveDefenses.
            const eff = _egGetItemEffectiveDefenses(item);
            // Shield batch (e.g. reworked node 30376): "% increased Defences
            // from equipped Shield" multiplies ONLY the shield's own
            // Armour / Evasion / Absorption, before the global % increased
            // buckets apply on top of the aggregated flat pools.
            const shieldDefMult = item.slotType === 'shield'
                ? 1 + (passiveTreeBonuses.shieldDefencePct || 0) / 100 : 1;
            s.armourFlat += eff.armour * shieldDefMult;
            s.evasionFlat += eff.evasion * shieldDefMult;
            s.absorptionFlat += eff.absorption * shieldDefMult
                * (item.slotType === 'shield' ? 1 + (passiveTreeBonuses.shieldAbsorptionPct || 0) / 100 : 1);
        }

        // Shields carry an implicit base block chance on the base type
        if (item.blockChance) {
            s.blockChance += item.blockChance;
        }

        // Damage routing per slot type: the ranged weapon's base range
        // feeds the projectile channel, the melee weapon's feeds the melee
        // channel. Other slots have no base damage.
        if (item.damage) {
            const min = item.damage.min || 0;
            const max = item.damage.max || 0;
            if (item.slotType === 'ranged') {
                s.physFlatMin += min;
                s.physFlatMax += max;
            } else if (item.slotType === 'weapon') {
                s.meleePhysMin += min;
                s.meleePhysMax += max;
            }
        }
        function applyStatsFromList(list) {
            (Array.isArray(list) ? list : []).forEach(mod => {
                (Array.isArray(mod.rolledStats) ? mod.rolledStats : []).forEach(stat => {
                    const entry = EG_STAT_KEY_MAP[stat.key];
                    if (!entry || stat.value == null) return;
                    const val = Number(stat.value) || 0;
                    // Legacy uniques stored percent-style values (e.g. -19.5 for
                    // "19.5% reduced Attack Speed") under attack_speed, which is
                    // a SECONDS bucket (real rolls are within +-3s). Applied as
                    // seconds they added ~20s to the charge time (~4x slower).
                    if (stat.key === 'attack_speed' && Math.abs(val) > 3) {
                        s.attackSpeedPct += val;
                        return;
                    }
                    const meleeBucket = EG_MELEE_BUCKET_MAP[entry.bucket];
                    if (meleeBucket) {
                        if (item.slotType !== 'ranged') s[meleeBucket] += val;
                        if (item.slotType !== 'weapon') s[entry.bucket] += val;
                    } else if (entry.mode === 'max') {
                        s[entry.bucket] = Math.max(s[entry.bucket], val);
                    } else if (entry.mode === 'min') {
                        s[entry.bucket] = Math.min(s[entry.bucket], val);
                    } else {
                        s[entry.bucket] += val;
                    }
                });
            });
        }
        applyStatsFromList(item.mods);
        applyStatsFromList(item.implicits);
    });

    // Shield batch (reworked nodes 30375/30374/30376/285): physical damage
    // that only applies while a shield is equipped. "Attack" damage rides
    // both the projectile and melee physical buckets (the tree's generic
    // physDamageIncPct does the same); "melee attack" damage only the melee
    // bucket.
    s.isShieldEquipped = _egGetAllEquippedItems().some(item => item.slotType === 'shield');
    if (s.isShieldEquipped) {
        const attackShield = passiveTreeBonuses.attackPhysShieldIncPct || 0;
        s.physIncPct += attackShield;
        s.meleePhysIncPct += attackShield + (passiveTreeBonuses.meleePhysShieldIncPct || 0);
    }

    // Dual-wield balance (PoE-style): two 1H weapons sum their base damage
    // and melee mods, then the strike total is scaled by
    // EG_DUAL_WIELD_DAMAGE_MULT (0.7) so dual-wield lands ~1.4x a single 1H -
    // below a 2H weapon's ~1.6-1.7x, trading raw damage for the parry bonus.
    // % increased multipliers are NOT scaled (only flat ranges are).
    if (typeof _egIsDualWielding === 'function' && _egIsDualWielding()) {
        const dw = (typeof EG_DUAL_WIELD_DAMAGE_MULT !== 'undefined') ? EG_DUAL_WIELD_DAMAGE_MULT : 0.7;
        s.isDualWielding = true;
        // Dual-wield tree lines fold into the shared channels while two
        // one-handed weapons are equipped (accuracy is applied further down).
        s.damageIncPct += s.dualDamageIncPct || 0;
        s.meleeChargeSpeedPct += s.dualChargeSpeedPct || 0;
        s.accuracyIncPct += s.dualAccuracyIncPct || 0;
        s.critChance += s.dualCritChancePct || 0;
        s.critMultiplierPct += s.dualCritMultiPct || 0;
        s.castSpeedPct += s.dualCastSpeedPct || 0;
        s.spellDamageIncPct += s.dualSpellDamagePct || 0;
        s.movementSpeedPct += s.dualMoveSpeedPct || 0;
        for (const k of ['meleePhysMin', 'meleePhysMax',
            'meleeFireMin', 'meleeFireMax', 'meleeColdMin', 'meleeColdMax',
            'meleeLightningMin', 'meleeLightningMax', 'meleeShadowMin', 'meleeShadowMax']) {
            s[k] = Math.round((s[k] || 0) * dw);
        }
    }

    // Manual-melee balance (Secret-of-Mana-style): manual strikes land far
    // less often than the old auto-strikes did, so the whole melee channel
    // (base ranges + "to Melee Strikes" mods, both channels for unscoped
    // slots) hits EG_MELEE_DAMAGE_MULT times harder. Applied here so the
    // char-sheet ranges and combat agree. % increased multipliers are NOT
    // scaled (only flat ranges are).
    if (typeof EG_MELEE_DAMAGE_MULT !== 'undefined' && EG_MELEE_DAMAGE_MULT !== 1) {
        const mm = EG_MELEE_DAMAGE_MULT;
        for (const k of ['meleePhysMin', 'meleePhysMax',
            'meleeFireMin', 'meleeFireMax', 'meleeColdMin', 'meleeColdMax',
            'meleeLightningMin', 'meleeLightningMax', 'meleeShadowMin', 'meleeShadowMax']) {
            s[k] = Math.round((s[k] || 0) * mm);
        }
    }

    // Roiling Tempest: the lightning damage range is skewed (min lower, max higher).
    if ((s.lightningMinLessPct || 0) > 0 || (s.lightningMaxMorePct || 0) > 0) {
        const minMult = 1 - Math.min(100, s.lightningMinLessPct || 0) / 100;
        const maxMult = 1 + Math.max(0, s.lightningMaxMorePct || 0) / 100;
        for (const k of ['meleeLightningMin', 'lightningDmgMin']) s[k] = Math.round((s[k] || 0) * minMult);
        for (const k of ['meleeLightningMax', 'lightningDmgMax']) s[k] = Math.round((s[k] || 0) * maxMult);
    }

    if (s.arcaneSurgeStreak === Infinity) s.arcaneSurgeStreak = 0;

    // Attribute side-effects per the design notes above:
    // Str -> +2 life & +1 armour/point, Agi -> +1 accuracy & +1 evasion/point,
    // Int -> +2 mana & +1 spell damage/point.
    s.health += s.strength * 2;
    s.armourFlat += s.strength;
    // Timed armour pulse from the passive tree (effects pipeline, e.g.
    // reworked node 337 Umbral Survey): flat Armour while a block landed in
    // the last 10 seconds. The timestamp lives on globalThis and is
    // refreshed by every successful block in _egPlayerTakeDamage, so the
    // pulse lapses on its own without any expiry bookkeeping here.
    if ((passiveTreeBonuses.blockArmorPulse || 0) > 0
        && Date.now() - (globalThis._egLastBlockAt || 0) < 10000) {
        s.armourFlat += passiveTreeBonuses.blockArmorPulse;
    }
    // Streak armour (armour_per_streak): flat Armour per 10 correct fills in a
    // row; the streak counter resets on every real mistake.
    if ((s.armourPerStreak || 0) > 0) {
        s.armourFlat += s.armourPerStreak * Math.floor((Number(globalThis.LEVEL_FLAGS && globalThis.LEVEL_FLAGS.fillRun) || 0) / 10);
    }
    // Endurance Charges (shield batch, node 285): live charges (shared 10s
    // timer, see combat-ailments-state.js) each add flat Armour and
    // all-elemental resistance. Flat Armour joins the pool BEFORE the %
    // increased multiplier below, like every other flat source.
    s.enduranceCharges = Math.max(_egGetEnduranceCharges(), Math.floor(Number(s.enduranceMin) || 0));
    s.rage = _egGetRage();
    // Rage tree extras: slower fade, Armour per Rage.
    _egSetRageDecayMult(1 + Math.max(0, s.rageDecaySlowerPct || 0) / 100);
    if (s.rage > 0 && (s.ragePerArmourPct || 0) > 0) s.armourIncPct += s.rage * s.ragePerArmourPct;
    if (s.enduranceCharges > 0) {
        s.armourFlat += EG_ENDURANCE_ARMOUR_PER_CHARGE * s.enduranceCharges;
        s.allElementalResist += EG_ENDURANCE_ELEM_RES_PER_CHARGE * s.enduranceCharges;
    }
    // Frenzy Charges: melee charge-up speed, projectile damage and the
    // tree's evasion-per-charge line scale with the live count.
    s.frenzyCharges = _egGetFrenzyCharges();
    if (s.frenzyCharges > 0) {
        s.meleeChargeSpeedPct += EG_FRENZY_MELEE_SPEED_PER_CHARGE * s.frenzyCharges;
        s.frenzyDamageMorePct = EG_FRENZY_DAMAGE_PER_CHARGE * s.frenzyCharges;
        s.evasionIncPct += (s.evasionPerFrenzyChargePct || 0) * s.frenzyCharges;
    }
    // Power Charges: crit chance (attacks and spells) and the tree's damage-per-charge line.
    s.powerCharges = _egGetPowerCharges();
    if (s.powerCharges > 0) {
        s.critChance += EG_POWER_CRIT_PER_CHARGE * s.powerCharges;
        s.spellCritChancePct = (s.spellCritChancePct || 0) + EG_POWER_CRIT_PER_CHARGE * s.powerCharges;
        s.damageIncPct = (s.damageIncPct || 0) + (s.powerDamagePerChargePct || 0) * s.powerCharges;
    }
    // Fortification: live stack count; the defences line applies while any stack is up.
    s.fortifyStacks = _egGetFortifyStacks();
    if (s.fortifyStacks > 0 && (s.fortifiedDefencePct || 0) > 0) {
        s.armourIncPct += s.fortifiedDefencePct;
        s.evasionIncPct += s.fortifiedDefencePct;
    }
    // Phase C-1: per-charge tree lines, shield / heavy-weapon conditionals and
    // the "recently" conditions (4s windows stamped by the combat code).
    if (s.enduranceCharges > 0) {
        s.armourIncPct += (s.armourPerEndurancePct || 0) * s.enduranceCharges;
        s.damageIncPct += (s.damagePerEndurancePct || 0) * s.enduranceCharges;
        s.areaOfEffectPct += (s.aoePerEndurancePct || 0) * s.enduranceCharges;
        s.stunDurationPct += (s.stunPerEndurancePct || 0) * s.enduranceCharges;
    }
    if (s.frenzyCharges > 0) {
        s.movementSpeedPct += (s.moveSpeedPerFrenzyPct || 0) * s.frenzyCharges;
        s.meleeChargeSpeedPct += (s.chargeSpeedPerFrenzyPct || 0) * s.frenzyCharges;
    }
    if (s.powerCharges > 0) {
        s.critChance += (s.critPerPowerCharge || 0) * s.powerCharges;
        s.spellCritChancePct = (s.spellCritChancePct || 0) + (s.critPerPowerCharge || 0) * s.powerCharges;
        s.critMultiplierPct += (s.critMultiPerPowerCharge || 0) * s.powerCharges;
        s.manaRegenIncPct += (s.manaRegenPerPowerPct || 0) * s.powerCharges;
        s.spellDamageIncPct += (s.spellDamagePerPowerPct || 0) * s.powerCharges;
    }
    if (s.isShieldEquipped) {
        s.allElementalResist += s.shieldElementalRes || 0;
        s.castSpeedPct += s.shieldCastSpeedPct || 0;
        s.spellDamageIncPct += s.shieldSpellDamagePct || 0;
    }
    if (s.isHeavyWeaponEquipped) s.critMultiplierPct += s.critMultiHeavy || 0;
    {
        const nowMs = Date.now();
        if (nowMs - (Number(globalThis._egLastKillAt) || 0) < 4000) s.areaOfEffectPct += s.aoeRecentKillPct || 0;
        if (nowMs - (Number(globalThis._egLastHitTakenAt) || 0) < 4000) s.armourIncPct += s.armourIfHitPct || 0;
        else s.evasionIncPct += s.evasionIfNotHitPct || 0;
        if ((s.dmgFullAbsorptionPct || 0) > 0) {
            const absMax = Math.round((s.absorptionFlat || 0) * (1 + (s.absorptionIncPct || 0) / 100));
            if (absMax > 0 && (Number(globalThis._egPlayerAbsorptionCurrent) || 0) >= absMax) s.damageIncPct += s.dmgFullAbsorptionPct;
        }
    }
    // Weapon family of the equipped melee weapon (swing-config resolver:
    // icon/name based, unknown melee weapons count as swords). Gates the
    // sword/axe tree lines; +accuracy with swords joins the flat pool here
    // so "increased Accuracy Rating" scales it like every other source.
    const weaponInfo = _egGetEquippedWeaponInfo();
    const weaponFamily = weaponInfo.family;
    s.isMaceEquipped = _egIsMaceOrSceptre(weaponInfo.item);
    s.isSwordEquipped = weaponFamily === 'sword';
    s.isAxeEquipped = weaponFamily === 'axe';
    s.isDaggerEquipped = weaponFamily === 'dagger';
    // Staves and Wands are separate families; sceptres count as Maces.
    s.isStaffEquipped = weaponFamily === 'staff';
    s.isWandEquipped = weaponFamily === 'wand' && !s.isMaceEquipped;
    s.isBowEquipped = weaponFamily === 'bow';
    // Phase C-2: wand / bow conditional lines, Onslaught, recent-crit leech.
    if (s.isWandEquipped) s.physAsExtraLightningPct = (s.physAsExtraLightningPct || 0) + (s.wandPhysAsLightningPct || 0);
    if (s.isBowEquipped) s.areaOfEffectPct += s.bowAoePct || 0;
    if (Date.now() - (Number(globalThis._egLastCritAt) || 0) < 4000) {
        s.lifeLeechEffectIncPct = (s.lifeLeechEffectIncPct || 0) + (s.leechEffectRecentCritPct || 0);
    }
    if (_egOnslaughtActive()) {
        const onsMult = 1 + Math.max(0, s.onslaughtEffectPct || 0) / 100;
        const onsSpeed = EG_ONSLAUGHT_SPEED_PCT * onsMult;
        s.movementSpeedPct += onsSpeed;
        s.meleeChargeSpeedPct += onsSpeed;
        s.castSpeedPct += onsSpeed;
        s.armourIncPct += s.onslaughtDefencePct || 0;
        s.evasionIncPct += s.onslaughtDefencePct || 0;
        s.onslaught = true;
    }
    // Stalwart Stance: reduced Movement Speed.
    if ((s.movementSpeedLessPct || 0) > 0) s.movementSpeedPct -= s.movementSpeedLessPct;
    if (s.isSwordEquipped) s.accuracy += passiveTreeBonuses.accuracySwordFlat || 0;
    s.accuracy += s.agility;
    // "Increased Accuracy Rating" multiplies the fully aggregated rating
    // (gear + tree flat + Agi) before the map-run multiplier and the
    // miss-chance formula downstream read it.
    if (s.accuracyIncPct) s.accuracy = Math.round(s.accuracy * (1 + s.accuracyIncPct / 100));
    // Iron Reflexes: Agility grants no Evasion Rating.
    if (!((s.agilityNoEvasion || 0) > 0)) s.evasionFlat += s.agility;
    s.mana += s.intelligence * 2;
    s.spellDamageFlat += s.intelligence;
    // Iron Will: Strength also adds flat Spell Damage like Intelligence.
    if ((s.strengthSpellDamage || 0) > 0) s.spellDamageFlat += s.strength;
    // Acrobatics: extra chance to Evade Attacks from the tree.
    s.dodgeChance = (s.dodgeChance || 0) + (s.dodgeChanceTreePct || 0);

    // Active map run: apply the "% reduced Spell Damage" mod to the fully
    // aggregated spell damage buckets (feeds reveal-projectile scaling).
    if (typeof _egMapSpellDamageMult === 'function') {
        const spMult = _egMapSpellDamageMult();
        if (spMult < 1) {
            s.spellDamageFlat = Math.round(s.spellDamageFlat * spMult);
            s.spellDamageIncPct = Math.round((s.spellDamageIncPct || 0) * spMult);
        }
    }

    // Level-up bonus: every level beyond 1 grants a permanent
    // +5 maximum Life and +2 maximum Mana.
    const lvlForBonus = (typeof _egGetPlayerLevel === 'function')
        ? Math.max(1, Number(_egGetPlayerLevel()) || 1) : 1;
    s.health += (lvlForBonus - 1) * 5;
    s.mana += (lvlForBonus - 1) * 2;

    // Apply % increased Health multiplicatively with base + flat health
    if (s.healthIncPct > 0) {
        s.health = Math.round(s.health * (1 + s.healthIncPct / 100));
    }

    // Same rule for Mana: % increased maximum Mana multiplies the fully
    // aggregated flat pool (passive tree + gear + Int + level bonus), so a
    // character sitting on 500 Mana with +8% reads 540, not 508.
    if (s.manaIncPct > 0) {
        s.mana = Math.round(s.mana * (1 + s.manaIncPct / 100));
    }

    // Blood Magic keystone: all Mana is removed (the pool is also zeroed in
    // class-mana.js, base Mana included). "More" Life is NOT applied here:
    // it multiplies the whole pool (base + gear + tree) where the maximum
    // is composed - _resetPlayerHP, _egSyncOverlayGearPools, level-up.
    if (s.manaRemoved > 0) s.mana = 0;

    // Cleansed Thoughts: Shadow Resistance is doubled (before the cap).
    if ((s.shadowResDouble || 0) > 0 && s.shadowResist > 0) s.shadowResist *= 2;
    s.armour = Math.round(s.armourFlat * (1 + s.armourIncPct / 100));
    s.evasion = Math.round(s.evasionFlat * (1 + s.evasionIncPct / 100));
    s.absorption = Math.round(s.absorptionFlat * (1 + s.absorptionIncPct / 100));
    // Keystones (batch 40): Iron Reflexes, Acrobatics / Phase Acrobatics, Ghost Dance, The Agnostic.
    if ((s.evasionToArmour || 0) > 0) { s.armour += s.evasion; s.evasion = 0; }
    if ((s.armourLessPct || 0) > 0) s.armour = Math.round(s.armour * (1 - Math.min(95, s.armourLessPct) / 100));
    if ((s.absorptionLessPct || 0) > 0) s.absorption = Math.round(s.absorption * (1 - Math.min(95, s.absorptionLessPct) / 100));
    if ((s.ghostDance || 0) > 0) s.absorption = Math.min(s.absorption, s.evasion);
    if ((s.absorptionRemoved || 0) > 0) s.absorption = 0;

    // Active map run: apply the "% reduced Armour, Evasion and Absorption" mod.
    if (typeof _egMapPlayerDefenceMult === 'function') {
        const defMult = _egMapPlayerDefenceMult();
        if (defMult < 1) {
            s.armour = Math.round(s.armour * defMult);
            s.evasion = Math.round(s.evasion * defMult);
            s.absorption = Math.round(s.absorption * defMult);
        }
    }

    // Active map run: single-defence reductions.
    if (typeof _egMapEvasionMult === 'function') {
        const evMult = _egMapEvasionMult();
        if (evMult < 1) s.evasion = Math.round(s.evasion * evMult);
    }
    if (typeof _egMapAbsorptionMult === 'function') {
        const abMult = _egMapAbsorptionMult();
        if (abMult < 1) s.absorption = Math.round(s.absorption * abMult);
    }
    if (typeof _egMapBlockMult === 'function') {
        const blMult = _egMapBlockMult();
        if (blMult < 1) {
            s.blockChance = Math.round((s.blockChance || 0) * blMult * 10) / 10;
            s.spellBlockChance = Math.round((s.spellBlockChance || 0) * blMult * 10) / 10;
        }
    }

    // Active map run: single-offence reductions.
    if (typeof _egMapAccuracyMult === 'function') {
        const accMult = _egMapAccuracyMult();
        if (accMult < 1) s.accuracy = Math.round((s.accuracy || 0) * accMult);
    }
    if (typeof _egMapAttackSpeedMult === 'function') {
        const asMult = _egMapAttackSpeedMult();
        if (asMult < 1) s.attackSpeed = Math.round((s.attackSpeed || 0) * asMult * 100) / 100;
    }

    return s;
}


//------------------------------------------------------------------------
//-------------------AUTO-ATTACK INTERVAL---------------------------------
//------------------------------------------------------------------------

// Base charge time (in seconds) to fully charge a manual melee strike.
// The equipped weapon's base type defines the interval via its
// attackIntervalSeconds implicit ("Fully charges in Xs"); the summed
// attack_speed mod values ("Melee charges #s faster") are then subtracted,
// clamped to a minimum so charging can't be spammed, and the result is
// shortened globally by EG_PLAYER_CHARGE_TIME_MULT for manual pacing.
// Full breakdown for display: { base, reduction, interval } where interval
// is the effective time-to-full-charge.
// weaponOverride: dual-wielding charges one bar per hand, each on its own
// weapon's base time (see _egGetPlayerAttackIntervalForHand).
export function _egGetPlayerAttackIntervalBreakdown(weaponOverride) {
    const defBase = EG_PLAYER_DEFAULT_ATTACK_INTERVAL;
    let base = defBase;
    // Only the melee weapon slot defines the manual-strike charge time -
    // ranged weapons scale the input-driven projectile channel instead.
    const weapon = weaponOverride || _egGetAllEquippedItems().find(it => it.slotType === 'weapon');
    if (weapon) {
        if (weapon.attackIntervalSeconds != null) {
            base = Number(weapon.attackIntervalSeconds) || defBase;
        } else if (weapon.attacksPerSecond != null) {
            // Legacy saves predate the rename - derive interval from aps
            base = Math.round((defBase / (Number(weapon.attacksPerSecond) || 1)) * 100) / 100;
        }
    }
    const stats = _egComputePlayerStats();
    const reduction = stats.attackSpeed || 0;
    let interval = Math.round(Math.max(EG_PLAYER_MIN_ATTACK_INTERVAL, base - reduction) * 100) / 100;

    // Manual pacing: the old auto-strike intervals become time-to-full-charge,
    // shortened globally so manual combat feels responsive.
    if (typeof EG_PLAYER_CHARGE_TIME_MULT !== 'undefined') {
        interval = Math.round(interval * EG_PLAYER_CHARGE_TIME_MULT * 100) / 100;
    }

    // Passive-tree percentage attack-speed channels - the manual melee charge
    // IS the game's attack cadence (see eg_statdesc_attackSpeed), so both
    // "+% increased melee attack charge-up speed" (30197, Lesser Champion's
    // Tempo) and the generic "+% increased Attack Speed" (20032, Champion's
    // Onslaught) shorten the same interval; they add up as one percentage,
    // applied on top of the global manual-pacing multiplier and before the
    // map-run slow, so a slowed run still slows the charge down. 100% floor.
    const chargeSpeedPct = (stats.meleeChargeSpeedPct || 0) + (stats.attackSpeedPct || 0)
        + (stats.isSwordEquipped ? (stats.swordChargeSpeedPct || 0) : 0)
        + (stats.isAxeEquipped ? (stats.axeChargeSpeedPct || 0) : 0)
        + (stats.isDaggerEquipped ? (stats.daggerChargeSpeedPct || 0) : 0)
        + (stats.isStaffEquipped ? (stats.staffChargeSpeedPct || 0) : 0)
        + (stats.isWandEquipped ? (stats.wandChargeSpeedPct || 0) : 0);
    if (chargeSpeedPct > 0) {
        interval = Math.round(interval * (1 - Math.min(chargeSpeedPct, 100) / 100) * 10000) / 10000;
    } else if (chargeSpeedPct < 0) {
        // Net "reduced Attack Speed" (e.g. unique downsides): longer charge.
        interval = Math.round(interval * (1 + Math.min(-chargeSpeedPct, 100) / 100) * 10000) / 10000;
    }
    // Never let stacked bonuses reach 0s (no charge = no attacks at all).
    interval = Math.max(EG_PLAYER_ABS_MIN_CHARGE_TIME, interval);

    // Active map run: Temporal Chains - you act #% slower.
    if (typeof _egMapActionSlowMult === 'function') {
        interval *= _egMapActionSlowMult();
    }
    interval = Math.round(interval * 10000) / 10000;

    return { base, reduction, interval };
}

export function _egGetPlayerAttackInterval() {
    return _egGetPlayerAttackIntervalBreakdown().interval;
}

// The weapon in a hand while dual-wielding (1 = main hand, 2 = off-hand);
// null when not dual-wielding or the hand is empty.
export function _egGetDualHandWeapon(hand) {
    if (typeof _egIsDualWielding !== 'function' || !_egIsDualWielding()) return null;
    if (typeof _egEquipped === 'undefined' || !_egEquipped) return null;
    return (hand === 2 ? _egEquipped.weapon2 : _egEquipped.weapon1) || null;
}

// Full-charge time of one hand's bar while dual-wielding: that weapon's own
// base time plus the shared attack-speed mods. Falls back to the single bar's
// interval when the hand has no weapon.
export function _egGetPlayerAttackIntervalForHand(hand) {
    const weapon = _egGetDualHandWeapon(hand);
    return _egGetPlayerAttackIntervalBreakdown(weapon || undefined).interval;
}

// Share (0..1) of the dual-wield strike total that one hand's blow carries,
// weighted by each weapon's base damage (even split when unknown). The two
// shares add up to 1, so landing both hands once deals the same total as the
// old single combined strike - the second bar adds rhythm, not extra damage.
export function _egDualHandShare(hand) {
    const avg = (w) => (w && w.damage) ? ((Number(w.damage.min) || 0) + (Number(w.damage.max) || 0)) / 2 : 0;
    const a = avg(_egGetDualHandWeapon(1));
    const b = avg(_egGetDualHandWeapon(2));
    if (!(a > 0) || !(b > 0)) return 0.5;
    return (hand === 2 ? b : a) / (a + b);
}

// Damage multiplier of the strike that is landing now: 1 normally, the struck
// hand's share while dual-wielding (the hand is stamped by the charge bar's
// _egConsumePlayerCharge at key-press time).
export function _egStrikeHandMult() {
    if (typeof _egIsDualWielding !== 'function' || !_egIsDualWielding()) return 1;
    return _egDualHandShare(globalThis._egStrikeHand === 2 ? 2 : 1);
}


//------------------------------------------------------------------------
//-------------------COMBAT FORMULA HELPERS--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Armour mitigation is damage-relative (PoE-style): the same armour value
// mitigates many small hits strongly but large hits weakly, so it never
// trivially caps once gear values grow and stays relevant at every level.
export const EG_ARMOUR_DAMAGE_FACTOR = 12;   // reduction% = armour / (armour + factor * rawDamage) - was 10, raised so armour is less dominant at high tiers (more challenging when lacking)
export const EG_ARMOUR_MAX_REDUCTION = 0.75; // hard cap on mitigation

// Returns armour's % reduction (0..EG_ARMOUR_MAX_REDUCTION) against a hit of
// the given raw size. Used by both the combat path and stat tooltips so the
// displayed value always matches what combat actually rolls.
export function _egCalcArmourReductionPct(armour, rawDamage) {
    const armourVal = Math.max(0, Number(armour) || 0);
    const dmg = Math.max(1, Number(rawDamage) || 1);
    return Math.min(EG_ARMOUR_MAX_REDUCTION, armourVal / (armourVal + EG_ARMOUR_DAMAGE_FACTOR * dmg));
}

export function _egCalcArmourMitigation(rawDamage, armour) {
    const reductionPct = _egCalcArmourReductionPct(armour, rawDamage);
    return rawDamage * (1 - reductionPct);
}

// Converts evasion into a % chance to fully dodge an incoming hit, capped at
// 75%. The benchmark constant scales with the ATTACKER's level (PoE-style):
// higher-level monsters are harder to dodge, so evasion keeps requiring
// upgrades instead of permanently sitting at the cap once gear values grow.
export const EG_EVASION_DODGE_K = 200;        // dodge% = evasion / (evasion + K) at monster level 1
export const EG_EVASION_LEVEL_GROWTH = 1.035; // per-level growth of the evasion benchmark (was 1.045 - retuned so 350 evasion = ~11% dodge at 90, ~50% at 30; was too punishing at 1.045, too generous at 1.03)
export const EG_EVASION_DODGE_CAP_PCT = 75;

export function _egCalcEvasionDodgeChance(evasion, monsterLevel) {
    if (!evasion) return 0;
    const lvl = Math.max(1, Number(monsterLevel) || 1);
    const k = EG_EVASION_DODGE_K * Math.pow(EG_EVASION_LEVEL_GROWTH, lvl - 1);
    return Math.min(EG_EVASION_DODGE_CAP_PCT, (evasion / (evasion + k)) * 100);
}

// Accuracy vs monster level → % chance for the player's attacks to miss.
// Miss chance scales linearly with the target's level and inversely with
// accuracy, clamped to a floor (never perfectly accurate) and a ceiling
// (attacks always have a chance to land). Applied identically to melee
// strikes and projectiles - see _egRollPlayerMiss in endgame-encounter.js.
//
// Every character additionally gains INNATE accuracy with their own level
// (PoE-style level scaling), so a fresh, under-geared character is not
// punished by the raw formula: at parity (player level ≈ monster level)
// even a naked character lands most hits, while accuracy investment from
// gear lets you comfortably fight content ABOVE your level. Fighting
// higher-level monsters without that investment now gets noticeably shaky
// (retuned: higher scale so gear matters for T16; innate slightly lowered).
export const EG_ACCURACY_MISS_SCALE = 185;   // miss% = scale * monsterLevel / effectiveAccuracy (was 150)
export const EG_ACCURACY_MISS_MIN_PCT = 5;   // never perfectly reliable
export const EG_ACCURACY_MISS_MAX_PCT = 60;  // attacks always retain some threat
export const EG_ACCURACY_INNATE_BASE = 25;       // innate accuracy at player level 1 (was 30)
export const EG_ACCURACY_INNATE_PER_LEVEL = 13;  // extra innate accuracy per player level (was 15)

export function _egGetInnateAccuracy() {
    const lvl = (typeof _egGetPlayerLevel === 'function')
        ? Math.max(1, Number(_egGetPlayerLevel()) || 1) : 1;
    return EG_ACCURACY_INNATE_BASE + EG_ACCURACY_INNATE_PER_LEVEL * (lvl - 1);
}

// ──────────────────────────────────────────────────────────────────────────
//  Drag-painting accuracy bonus - threshold-based reward for sustained
//  correct drags. More stacked cells = higher bonus, so a risky long
//  drag that finally lands feels good instead of whiffing for 0 damage.
//  Thresholds: >5  → tier 1, >10 → tier 2, >15 → tier 3 (highest).
//  Each tier adds flat accuracy AND a direct miss% reduction. Flat
//  miss reduction guarantees the bonus is felt even at high innate
//  accuracy where extra accuracy alone would be marginal.
// ──────────────────────────────────────────────────────────────────────────
export const EG_DRAG_ACCURACY_T1 = 6;   // >5 correct
export const EG_DRAG_ACCURACY_T2 = 11;  // >10 correct
export const EG_DRAG_ACCURACY_T3 = 16;  // >15 correct

export const EG_DRAG_ACCURACY_BONUS_T1 = 40;
export const EG_DRAG_ACCURACY_BONUS_T2 = 85;
export const EG_DRAG_ACCURACY_BONUS_T3 = 145;

export const EG_DRAG_MISS_REDUCTION_T1 = 6;   // percentage points
export const EG_DRAG_MISS_REDUCTION_T2 = 12;
export const EG_DRAG_MISS_REDUCTION_T3 = 19;

export function _egGetDragAccuracyBonus(stacks) {
    const n = Number(stacks) || 0;
    if (n >= EG_DRAG_ACCURACY_T3) return EG_DRAG_ACCURACY_BONUS_T3;
    if (n >= EG_DRAG_ACCURACY_T2) return EG_DRAG_ACCURACY_BONUS_T2;
    if (n >= EG_DRAG_ACCURACY_T1) return EG_DRAG_ACCURACY_BONUS_T1;
    return 0;
}

export function _egGetDragMissReduction(stacks) {
    const n = Number(stacks) || 0;
    if (n >= EG_DRAG_ACCURACY_T3) return EG_DRAG_MISS_REDUCTION_T3;
    if (n >= EG_DRAG_ACCURACY_T2) return EG_DRAG_MISS_REDUCTION_T2;
    if (n >= EG_DRAG_ACCURACY_T1) return EG_DRAG_MISS_REDUCTION_T1;
    return 0;
}

export function _egGetDragTier(stacks) {
    const n = Number(stacks) || 0;
    if (n >= EG_DRAG_ACCURACY_T3) return 3;
    if (n >= EG_DRAG_ACCURACY_T2) return 2;
    if (n >= EG_DRAG_ACCURACY_T1) return 1;
    return 0;
}

export function _egGetDragTierLabelKey(stacks) {
    const tier = _egGetDragTier(stacks);
    if (tier === 3) return 'eg_drag_t3';
    if (tier === 2) return 'eg_drag_t2';
    if (tier === 1) return 'eg_drag_t1';
    return null;
}

export function _egCalcAccuracyMissChance(accuracy, monsterLevel, dragStacks) {
    const lvl = Math.max(1, Number(monsterLevel) || 1);
    const bonus = _egGetDragAccuracyBonus(dragStacks);
    const acc = Math.max(0, Number(accuracy) || 0) + _egGetInnateAccuracy() + bonus;
    if (acc <= 0) return EG_ACCURACY_MISS_MAX_PCT;
    const raw = (EG_ACCURACY_MISS_SCALE * lvl) / acc;
    let miss = Math.max(EG_ACCURACY_MISS_MIN_PCT, Math.min(EG_ACCURACY_MISS_MAX_PCT, raw));
    const reduction = _egGetDragMissReduction(dragStacks);
    if (reduction > 0) miss = Math.max(EG_ACCURACY_MISS_MIN_PCT, miss - reduction);
    return miss;
}

// Rolls a crit for the current hit. Returns the damage multiplier (1 = no crit).
// `bonus` ({ chance, multiplierPct }) adds scoped extras to this one roll
// (e.g. the Mace / Sceptre melee crit lines) without touching the stats.
export function _egRollCrit(stats, bonus) {
    // Precise Technique: never deal Critical Strikes.
    if ((Number(stats.neverCrit) || 0) > 0) return 1;
    const chance = (stats.critChance || 0) + ((bonus && bonus.chance) || 0);
    if (chance > 0 && Math.random() * 100 < chance) {
        if (globalThis.RunStats) globalThis.RunStats.critTrial(chance, true);
        globalThis._egLastCritAt = Date.now();
        // Elemental Overload / Perfect Agony: the crit counts (ailments, "recently" lines)
        // but deals no extra damage. 1.0001 keeps the `> 1` crit tests true.
        if ((Number(stats.critsNoExtraDamage) || 0) > 0) return 1.0001;
        // 150% base crit damage + additive multiplier bonuses
        return 1.5 + ((stats.critMultiplierPct || 0) + ((bonus && bonus.multiplierPct) || 0)) / 100;
    }
    if (chance > 0 && globalThis.RunStats) globalThis.RunStats.critTrial(chance, false);
    return 1;
}

// Timed fire window of the Searing Surge notable (node 217): active for 5
// seconds out of every 10 seconds of the encounter, the first window opening
// after the first 10 seconds. The encounter clock is window._egEncounterStartAt
// (set in _egResetEncounterState, shifted by pauses in the tick support).
export function _egFireSurgeActive(now = Date.now()) {
    const start = Number(globalThis._egEncounterStartAt) || 0;
    if (!start) return false;
    const elapsed = now - start;
    return elapsed >= 10000 && (elapsed % 10000) < 5000;
}

// _egGetElementalDamageBonus (rolls the total flat elemental damage bonus
// for one hit) is defined ONCE, in endgame-combat-calculations.js (it sums
// _egRollElementalBreakdown - identical math). The copy that used to live
// here was removed 2026-09; it was silently shadowed by the later file via
// load order, so behaviour is unchanged.


//------------------------------------------------------------------------
//-------------------ABSORPTION SHIELD REGEN-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Absorption is a secondary HP layer. It starts regenerating after a delay
// since the last hit, refilling gradually until it's back to the equipped max.
// Gear: faster_absorption_regen_start shortens the delay (seconds),
// gear: absorption_regen_rate increases the refill speed (%).

// Base delay before regeneration starts (reduced by fasterAbsorptionRegenStart).
export const EG_ABSORPTION_REGEN_BASE_DELAY_MS = 18000; // was 12000 - 200 dmg hits at L41 every ~6s can no longer fully regen (needs 18s quiet)

// Base share of max Absorption restored per regen tick (scaled by absorptionRegenRatePct).
export const EG_ABSORPTION_REGEN_BASE_STEP_PCT = 0.04; // was 0.06 - 5s to full (was 3.3s), so even after delay a full shield takes longer

export function _egCancelAbsorptionRegen() {
    if (globalThis._egPlayerAbsorptionRegenDelayTimer) { clearTimeout(globalThis._egPlayerAbsorptionRegenDelayTimer); globalThis._egPlayerAbsorptionRegenDelayTimer = null; }
    if (globalThis._egPlayerAbsorptionRegenInterval) { clearInterval(globalThis._egPlayerAbsorptionRegenInterval); globalThis._egPlayerAbsorptionRegenInterval = null; }
}

// Called on every hit taken - interrupts any in-progress regen and restarts the delay.
export function _egScheduleAbsorptionRegen() {
    const stats = _egComputePlayerStats();
    // Wicked Ward: a regeneration that already began is not interrupted by damage.
    if ((Number(stats.absorptionRegenUninterrupted) || 0) > 0 && globalThis._egPlayerAbsorptionRegenInterval) return;
    _egCancelAbsorptionRegen();

    // Ghost Reaver keystone: Absorption does not recharge on its own.
    if ((Number(stats.absorptionNoRecharge) || 0) > 0) return;
    let delayMs = Math.max(0, EG_ABSORPTION_REGEN_BASE_DELAY_MS - (stats.fasterAbsorptionRegenStart || 0) * 1000);
    // Infinite Focus: regeneration begins a fixed number of seconds after damage.
    if ((Number(stats.absorptionRegenDelaySecs) || 0) > 0) delayMs = stats.absorptionRegenDelaySecs * 1000;
    // Active map run: Absorption recharges #% slower.
    if (typeof _egGetActiveMapModValue === 'function') {
        const slowPct = _egGetActiveMapModValue('map_slower_absorption');
        if (slowPct > 0) delayMs = Math.round(delayMs * (1 + slowPct / 100));
    }
    const rateMult = (1 + Math.min(100, stats.absorptionRegenRatePct || 0) / 100)
        * Math.max(0, 1 - Math.min(100, Number(stats.absorptionRegenLessPct) || 0) / 100);

    globalThis._egPlayerAbsorptionRegenDelayTimer = setTimeout(() => {
        if (_egIsActive() && globalThis._egPlayerAbsorptionCurrent < _egComputePlayerStats().absorption) {
            Audio_Manager.playSFX('absorption_regen');
        }
        // Vital Conduit keystone: the missing Absorption at the moment the
        // recharge starts is the budget that is paid out as Life instead.
        let lifeBudget = null;
        globalThis._egPlayerAbsorptionRegenInterval = setInterval(() => {
            if (!_egIsActive()) { _egCancelAbsorptionRegen(); return; }
            const live = _egComputePlayerStats();
            const max = live.absorption;
            // Overcharge: no regeneration while you are attacking (a hit landed in the last 2s).
            if ((Number(live.absorptionStopsWhileAttacking) || 0) > 0
                && Date.now() - (Number(globalThis._egLastPlayerAttackAt) || 0) < 2000) return;
            const toLife = (Number(live.absorptionRechargesLife) || 0) > 0;
            if (!toLife && globalThis._egPlayerAbsorptionCurrent >= max) { _egCancelAbsorptionRegen(); return; }
            const step = Math.max(1, Math.round(max * EG_ABSORPTION_REGEN_BASE_STEP_PCT * rateMult));
            if (toLife) {
                if (lifeBudget === null) lifeBudget = Math.max(0, max - globalThis._egPlayerAbsorptionCurrent);
                const noRegen = _egGetActiveMapModValue('map_no_regeneration') > 0;
                if (noRegen || lifeBudget <= 0 || globalThis.playerCurrentHP >= globalThis.playerMaxHP) {
                    _egCancelAbsorptionRegen();
                    return;
                }
                const heal = Math.min(step, lifeBudget);
                lifeBudget -= heal;
                globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + (globalThis._egLifeGain ? globalThis._egLifeGain(heal) : (heal)));
                if (typeof globalThis._renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
                return;
            }
            globalThis._egPlayerAbsorptionCurrent = Math.min(max, globalThis._egPlayerAbsorptionCurrent + step);
        }, 200);
    }, delayMs);
}






//------------------------------------------------------------------------
//-------------------STATS SUMMARY (DISPLAY)-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Human-readable labels + unit suffix for each stat bucket produced by
// _egComputePlayerStats(). Buckets not listed here are either internal/derived
// (armour/evasion/absorption totals, physFlatMin/Max, elemental dmg pairs)
// and are handled explicitly by _egBuildStatLine() instead.
export const EG_STAT_DISPLAY_LABELS = {
    health: { label: t('eg_stat_health'), suffix: '' },
    healthIncPct: { label: t('eg_stat_inc_health'), suffix: '%' },
    mana: { label: t('eg_stat_mana'), suffix: '' },
    manaIncPct: { label: t('eg_stat_inc_mana'), suffix: '%' },
    allElementalResist: { label: t('eg_stat_all_elemental_resist'), suffix: '%' },
    castingAilmentAvoidPct: { label: t('eg_stat_casting_ailment_avoid'), suffix: '%' },
    bleedAvoidPct: { label: t('eg_stat_bleed_avoid'), suffix: '%' },
    poisonAvoidPct: { label: t('eg_stat_poison_avoid'), suffix: '%' },
    shockAvoidPct: { label: t('eg_stat_shock_avoid'), suffix: '%' },
    igniteAvoidPct: { label: t('eg_stat_ignite_avoid'), suffix: '%' },
    chillAvoidPct: { label: t('eg_stat_chill_avoid'), suffix: '%' },
    elementalAilmentAvoidPct: { label: t('eg_stat_elemental_ailment_avoid'), suffix: '%' },
    strength: { label: t('eg_stat_strength'), suffix: '' },
    agility: { label: t('eg_stat_agility'), suffix: '' },
    intelligence: { label: t('eg_stat_intelligence'), suffix: '' },

    lifeRegen: { label: t('eg_stat_life_regen'), suffix: '/s' },
    manaRegen: { label: t('eg_stat_mana_regen'), suffix: '/5s' },
    manaRegenIncPct: { label: t('eg_stat_mana_regen_inc'), suffix: '%' },
    manaOnKill: { label: t('eg_stat_mana_on_kill'), suffix: '' },
    absorptionOnKill: { label: t('eg_stat_absorption_on_kill'), suffix: '' },
    lifeOnKill: { label: t('eg_stat_life_on_kill'), suffix: '' },
    manaOnMistake: { label: t('eg_stat_mana_on_mistake'), suffix: '' },
    heartHealFlat: { label: t('eg_stat_heart_heal'), suffix: '' },
    heartSpawnIncPct: { label: t('eg_stat_heart_spawn'), suffix: '%' },
    manaSpawnIncPct: { label: t('eg_stat_mana_spawn'), suffix: '%' },
    heartHealIncPct: { label: t('eg_stat_inc_heart_heal'), suffix: '%' },
    manaHealFlat: { label: t('eg_stat_mana_heal'), suffix: '' },
    manaHealIncPct: { label: t('eg_stat_inc_mana_heal'), suffix: '%' },
    timeAdded: { label: t('eg_stat_time_added'), suffix: 's' },

    fireResist: { label: t('eg_stat_fire_res'), suffix: '%' },
    coldResist: { label: t('eg_stat_cold_res'), suffix: '%' },
    lightningResist: { label: t('eg_stat_lightning_res'), suffix: '%' },
    shadowResist: { label: t('eg_stat_shadow_res'), suffix: '%' },

    accuracy: { label: t('eg_stat_accuracy'), suffix: '' },
    mistakeCount: { label: t('eg_stat_allowed_mistakes'), suffix: '' },
    focusPct: { label: t('eg_stat_focus'), suffix: '%' },
    mistakeNotCountPct: { label: t('eg_stat_mistake_ignore'), suffix: '%' },
    revealHintPct: { label: t('eg_stat_reveal_hint'), suffix: '%' },
    chanceForNewQuestionPct: { label: t('eg_stat_new_question'), suffix: '%' },

    critChance: { label: t('eg_stat_crit_chance'), suffix: '%' },
    critMultiplierPct: { label: t('eg_stat_crit_multi'), suffix: '%' },
    meleeRangeM: { label: t('eg_stat_melee_range'), suffix: 'm' },
    meleeAoEPct: { label: t('eg_stat_melee_aoe'), suffix: '%' },

    physIncPct: { label: t('eg_stat_inc_phys_dmg'), suffix: '%' },
    // Melee-only sibling of physIncPct: passive tree node 30195 plus gear
    // % physical mods on melee slots. Scaled onto melee strikes only
    // (see _egCalcPlayerMeleeDamage); the projectile channel never reads it.
    meleePhysIncPct: { label: t('eg_stat_inc_melee_phys_dmg'), suffix: '%' },
    igniteDurationPct: { label: t('eg_stat_ignite_duration'), suffix: '%' },
    bleedDurationPct: { label: t('eg_stat_bleed_duration'), suffix: '%' },
    blockChanceShieldPct: { label: t('eg_stat_block_shield'), suffix: '%' },
    enduranceOnKillShieldPct: { label: t('eg_stat_endurance_on_kill'), suffix: '%' },
    enduranceCharges: { label: t('eg_stat_endurance_charges'), suffix: '' },
    frenzyCharges: { label: t('eg_stat_frenzy_charges'), suffix: '' },
    frenzyChargesMax: { label: t('eg_stat_frenzy_max'), suffix: '' },
    frenzyDurationPct: { label: t('eg_stat_frenzy_duration'), suffix: '%' },
    evasionPerFrenzyChargePct: { label: t('eg_stat_evasion_per_frenzy'), suffix: '%' },
    enduranceChargesMax: { label: t('eg_stat_endurance_max'), suffix: '' },
    enduranceDurationPct: { label: t('eg_stat_endurance_duration'), suffix: '%' },
    lifeRegenPerEndurancePct: { label: t('eg_stat_life_regen_per_endurance'), suffix: '%' },
    impaleChanceHeavyPct: { label: t('eg_stat_impale_chance'), suffix: '%' },
    impaleEffectHeavyPct: { label: t('eg_stat_impale_effect'), suffix: '%' },
    impaleEffectFreshPct: { label: t('eg_stat_impale_effect_fresh'), suffix: '%' },
    impaleDurationPct: { label: t('eg_stat_impale_duration'), suffix: '%' },
    healthMorePct: { label: t('eg_stat_more_health'), suffix: '%' },
    manaRemoved: { label: t('eg_stat_mana_removed'), suffix: '' },
    manaLessPct: { label: t('eg_stat_less_mana'), suffix: '%' },
    spellsCostLife: { label: t('eg_stat_spells_cost_life'), suffix: '' },
    spellCostIncPct: { label: t('eg_stat_spell_cost_inc'), suffix: '%' },
    damageToFirePct: { label: t('eg_stat_damage_to_fire'), suffix: '%' },
    onlyFireDamage: { label: t('eg_stat_only_fire_damage'), suffix: '' },
    critChanceMeleeMacePct: { label: t('eg_stat_crit_chance_mace'), suffix: '%' },
    critMultiplierMeleeMacePct: { label: t('eg_stat_crit_multi_mace'), suffix: '%' },
    igniteDamageMorePct: { label: t('eg_stat_ignite_damage_more'), suffix: '%' },
    physDotMorePct: { label: t('eg_stat_phys_dot_more'), suffix: '%' },
    physAsExtraFirePct: { label: t('eg_stat_phys_as_fire'), suffix: '%' },
    crushPhysReductionPct: { label: t('eg_stat_crush_phys_reduction'), suffix: '%' },
    projectileDamageIncPct: { label: t('eg_stat_inc_projectile_damage'), suffix: '%' },
    projectileSpeedPct: { label: t('eg_stat_inc_projectile_speed'), suffix: '%' },
    projectileCritChancePct: { label: t('eg_stat_projectile_crit_chance'), suffix: '%' },
    projectileCritMultiplierPct: { label: t('eg_stat_projectile_crit_multi'), suffix: '%' },
    bowSpellDamageIncPct: { label: t('eg_stat_inc_bow_spell_damage'), suffix: '%' },
    bowSpellDotIncPct: { label: t('eg_stat_inc_bow_spell_dot'), suffix: '%' },
    stunAvoidPct: { label: t('eg_stat_stun_avoid'), suffix: '%' },
    manaOnProjectileHitPct: { label: t('eg_stat_mana_on_projectile_hit'), suffix: '' },
    lifeOnProjectileHit: { label: t('eg_stat_life_on_projectile_hit'), suffix: '' },
    lifeOnMeleeHit: { label: t('eg_stat_life_on_melee_hit'), suffix: '' },
    dotIncPct: { label: t('eg_stat_dot_inc'), suffix: '%' },
    shadowDamageIncPct: { label: t('eg_stat_shadow_damage_inc'), suffix: '%' },
    damageIncPct: { label: t('eg_stat_damage_inc'), suffix: '%' },
    critChanceDaggerPct: { label: t('eg_stat_crit_chance_dagger'), suffix: '%' },
    spellCritChancePct: { label: t('eg_stat_spell_crit_chance'), suffix: '%' },
    spellCritMultiplierPct: { label: t('eg_stat_spell_crit_multi'), suffix: '%' },
    chillEffectIncPct: { label: t('eg_stat_chill_effect_inc'), suffix: '%' },
    absorptionLeechSpellPct: { label: t('eg_stat_absorption_leech_spell'), suffix: '%' },
    absorptionLeechEffectIncPct: { label: t('eg_stat_absorption_leech_effect_inc'), suffix: '%' },
    physAsExtraShadowPct: { label: t('eg_stat_phys_as_shadow'), suffix: '%' },
    lifeRecoupPct: { label: t('eg_stat_life_recoup'), suffix: '%' },
    daggerDamageIncPct: { label: t('eg_stat_dagger_damage_inc'), suffix: '%' },
    daggerChargeSpeedPct: { label: t('eg_stat_dagger_charge_speed'), suffix: '%' },
    lifeLeechAsAbsorption: { label: t('eg_stat_leech_as_absorption'), suffix: '' },
    absorptionNoRecharge: { label: t('eg_stat_absorption_no_recharge'), suffix: '' },
    lifeLeechEffectIncPct: { label: t('eg_stat_leech_effect_inc'), suffix: '%' },
    dotIncDaggerPct: { label: t('eg_stat_dot_inc_dagger'), suffix: '%' },
    critMultiplierDaggerPct: { label: t('eg_stat_crit_multi_dagger'), suffix: '%' },
    poisonDurationPct: { label: t('eg_stat_poison_duration'), suffix: '%' },
    critDotMultiPct: { label: t('eg_stat_crit_dot_multi'), suffix: '%' },
    skillEffectDurationPct: { label: t('eg_stat_skill_effect_duration'), suffix: '%' },
    lifeOnAttackHit: { label: t('eg_stat_life_on_attack_hit'), suffix: '' },
    lifeBurstOnProjectileHitChancePct: { label: t('eg_stat_life_burst_projectile_hit'), suffix: '%' },
    bowSpellManaCostReducedPct: { label: t('eg_stat_bow_spell_mana_reduced'), suffix: '%' },
    manaOnMeleeHitChargedPct: { label: t('eg_stat_mana_on_melee_hit'), suffix: '' },
    parrySpellChancePct: { label: t('eg_stat_parry_spell_chance'), suffix: '%' },
    critChanceMeleePct: { label: t('eg_stat_crit_chance_melee'), suffix: '%' },
    projectileElementalDamageIncPct: { label: t('eg_stat_inc_projectile_elemental'), suffix: '%' },
    lifeRegenLessPct: { label: t('eg_stat_life_regen_less'), suffix: '%' },
    lifeLeechLessPct: { label: t('eg_stat_life_leech_less'), suffix: '%' },
    absorptionRechargesLife: { label: t('eg_stat_absorption_recharges_life'), suffix: '' },
    retaliationWardBleed: { label: t('eg_stat_retaliation_ward_bleed'), suffix: '' },
    retaliationWardIgnite: { label: t('eg_stat_retaliation_ward_ignite'), suffix: '' },
    meleePhys1HIncPct: { label: t('eg_stat_inc_melee_phys_1h'), suffix: '%' },
    meleePhysHeavyIncPct: { label: t('eg_stat_inc_melee_phys_heavy'), suffix: '%' },
    meleePhysSwordIncPct: { label: t('eg_stat_inc_melee_phys_sword'), suffix: '%' },
    meleePhysAxeIncPct: { label: t('eg_stat_inc_melee_phys_axe'), suffix: '%' },
    swordChargeSpeedPct: { label: t('eg_stat_sword_charge_speed'), suffix: '%' },
    ignorePhysReductionPct: { label: t('eg_stat_ignore_phys_reduction'), suffix: '%' },
    intimidateChanceMeleePct: { label: t('eg_stat_intimidate_chance'), suffix: '%' },
    intimidateMeleeAmpPct: { label: t('eg_stat_intimidate_amp'), suffix: '%' },
    bleedChanceMeleePct: { label: t('eg_stat_bleed_chance_melee'), suffix: '%' },
    bleedChanceAttackPct: { label: t('eg_stat_bleed_chance_attack'), suffix: '%' },
    poisonChanceAttackPct: { label: t('eg_stat_poison_chance_attack'), suffix: '%' },
    poisonDotMultiPct: { label: t('eg_stat_poison_dot_multi'), suffix: '%' },
    bleedSpeedPct: { label: t('eg_stat_bleed_speed'), suffix: '%' },
    lifeRegenRatePct: { label: t('eg_stat_life_regen_rate'), suffix: '%' },
    axeChargeSpeedPct: { label: t('eg_stat_axe_charge_speed'), suffix: '%' },
    attacksNeverMiss: { label: t('eg_stat_never_miss'), suffix: '' },
    movementSpeedLessPct: { label: t('eg_stat_movement_speed_less'), suffix: '%' },
    noRepeatTarget: { label: t('eg_stat_no_repeat_target'), suffix: '' },
    singleElementMorePct: { label: t('eg_stat_single_element_more'), suffix: '%' },
    lastElementResistPct: { label: t('eg_stat_last_element_resist'), suffix: '%' },
    absorptionStopsWhileAttacking: { label: t('eg_stat_absorption_stops_attacking'), suffix: '' },
    absorptionRegenDelaySecs: { label: t('eg_stat_absorption_regen_delay'), suffix: '%' },
    evasionToArmour: { label: t('eg_stat_evasion_to_armour'), suffix: '' },
    agilityNoEvasion: { label: t('eg_stat_agility_no_evasion'), suffix: '' },
    lifeLeechInstant: { label: t('eg_stat_life_leech_instant'), suffix: '' },
    lifeOnlyFromLeech: { label: t('eg_stat_life_only_leech'), suffix: '' },
    windDancerLessPct: { label: t('eg_stat_wind_dancer_less'), suffix: '%' },
    windDancerEvadePct: { label: t('eg_stat_wind_dancer_evade'), suffix: '%' },
    windDancerMorePct: { label: t('eg_stat_wind_dancer_more'), suffix: '%' },
    lifeBecomesOne: { label: t('eg_stat_life_becomes_one'), suffix: '' },
    shadowImmune: { label: t('eg_stat_shadow_immune'), suffix: '' },
    chilledColdTaken: { label: t('eg_stat_chilled_cold_taken'), suffix: '' },
    damageToColdPct: { label: t('eg_stat_damage_to_cold_pct'), suffix: '%' },
    onlyColdDamage: { label: t('eg_stat_only_cold_damage'), suffix: '' },
    bleedStackMax: { label: t('eg_stat_bleed_stack_max'), suffix: '' },
    bleedLessPct: { label: t('eg_stat_bleed_dmg_less'), suffix: '%' },
    absorptionRemoved: { label: t('eg_stat_absorption_removed'), suffix: '' },
    manaToLifePct: { label: t('eg_stat_mana_to_life'), suffix: '%' },
    elementalOverloadPct: { label: t('eg_stat_elemental_overload'), suffix: '%' },
    critsNoExtraDamage: { label: t('eg_stat_no_crit_damage'), suffix: '' },
    dotMultiEqualsCrit: { label: t('eg_stat_dot_multi_equals_crit'), suffix: '' },
    nonCritNoAilments: { label: t('eg_stat_non_crit_no_ailments'), suffix: '' },
    absorptionRegenUninterrupted: { label: t('eg_stat_absorption_regen_uninterrupted'), suffix: '' },
    absorptionRegenLessPct: { label: t('eg_stat_absorption_regen_less'), suffix: '%' },
    armourDefendDouble: { label: t('eg_stat_armour_defend_double'), suffix: '' },
    maxDamageReductionCap: { label: t('eg_stat_max_damage_reduction'), suffix: '%' },
    spellDmgLowLifeMorePct: { label: t('eg_stat_spell_dmg_low_life'), suffix: '%' },
    damageFromManaPct: { label: t('eg_stat_damage_from_mana'), suffix: '%' },
    ghostDance: { label: t('eg_stat_ghost_dance'), suffix: '' },
    ghostShroudMax: { label: t('eg_stat_ghost_shroud_max'), suffix: '' },
    ghostShroudRecoverPct: { label: t('eg_stat_ghost_shroud_recover'), suffix: '%' },
    blockDoubled: { label: t('eg_stat_block_doubled'), suffix: '' },
    blockedHitTakenPct: { label: t('eg_stat_blocked_hit_taken'), suffix: '%' },
    damageToLightningPct: { label: t('eg_stat_damage_to_lightning_pct'), suffix: '%' },
    onlyLightningDamage: { label: t('eg_stat_only_lightning_damage'), suffix: '' },
    lightningMaxMorePct: { label: t('eg_stat_lightning_max_more'), suffix: '%' },
    lightningMinLessPct: { label: t('eg_stat_lightning_min_less'), suffix: '%' },
    cannotEvade: { label: t('eg_stat_cannot_evade'), suffix: '' },
    cannotBeStunned: { label: t('eg_stat_cannot_be_stunned'), suffix: '' },
    pointBlankPct: { label: t('eg_stat_point_blank'), suffix: '%' },
    blockMaxAttackLess: { label: t('eg_stat_block_max_attack_less'), suffix: '%' },
    blockMaxSpellLess: { label: t('eg_stat_block_max_spell_less'), suffix: '%' },
    spellBlockPerOvercap: { label: t('eg_stat_spell_block_per_overcap'), suffix: '%' },
    dodgeChanceTreePct: { label: t('eg_stat_dodge_chance_tree'), suffix: '%' },
    armourLessPct: { label: t('eg_stat_armour_less'), suffix: '%' },
    absorptionLessPct: { label: t('eg_stat_absorption_less'), suffix: '%' },
    spellCostFromAbsorption: { label: t('eg_stat_spell_cost_from_absorption'), suffix: '' },
    strengthSpellDamage: { label: t('eg_stat_strength_spell_damage'), suffix: '' },
    lifeRegenToAbsorption: { label: t('eg_stat_life_regen_to_absorption'), suffix: '' },
    preciseTechniquePct: { label: t('eg_stat_precise_technique'), suffix: '%' },
    neverCrit: { label: t('eg_stat_never_crit'), suffix: '' },
    impaleSpread: { label: t('eg_stat_impale_spread'), suffix: '' },
    impaleExtra: { label: t('eg_stat_impale_extra'), suffix: '' },
    impaleLockout: { label: t('eg_stat_impale_lockout'), suffix: '' },
    secondaryDamagePct: { label: t('eg_stat_secondary_damage'), suffix: '%' },
    pierceChanceTreePct: { label: t('eg_stat_pierce_chance'), suffix: '%' },
    pierceTargetsExtra: { label: t('eg_stat_pierce_targets'), suffix: '%' },
    chainChanceTreePct: { label: t('eg_stat_chain_chance'), suffix: '%' },
    chainCountExtra: { label: t('eg_stat_chain_count'), suffix: '%' },
    forkChancePct: { label: t('eg_stat_fork_chance'), suffix: '%' },
    forkExtraChancePct: { label: t('eg_stat_fork_extra'), suffix: '%' },
    multishotChanceTreePct: { label: t('eg_stat_multishot_chance'), suffix: '%' },
    costEfficiencyPct: { label: t('eg_stat_cost_efficiency'), suffix: '%' },
    onslaughtEffectPct: { label: t('eg_stat_onslaught_effect'), suffix: '%' },
    onslaughtOnKillPct: { label: t('eg_stat_onslaught_on_kill'), suffix: '%' },
    onslaughtDefencePct: { label: t('eg_stat_onslaught_defences'), suffix: '%' },
    leechEffectRecentCritPct: { label: t('eg_stat_leech_effect_recent_crit'), suffix: '%' },
    wandPhysAsLightningPct: { label: t('eg_stat_wand_phys_as_lightning'), suffix: '%' },
    bowAoePct: { label: t('eg_stat_bow_aoe'), suffix: '%' },
    dmgFullAbsorptionPct: { label: t('eg_stat_dmg_full_absorption'), suffix: '%' },
    critMultiHeavy: { label: t('eg_stat_crit_multi_heavy'), suffix: '%' },
    dmgVsLowLifePct: { label: t('eg_stat_dmg_vs_low_life'), suffix: '%' },
    aoeRecentKillPct: { label: t('eg_stat_aoe_recent_kill'), suffix: '%' },
    ailmentDurationTakenPct: { label: t('eg_stat_ailment_duration_taken'), suffix: '%' },
    chillShockTakenPct: { label: t('eg_stat_chill_shock_effect_taken'), suffix: '%' },
    spellDotMultiPct: { label: t('eg_stat_spell_dot_multi'), suffix: '%' },
    manaLeechAttackPct: { label: t('eg_stat_mana_leech_attack'), suffix: '%' },
    spellBlockFlat: { label: t('eg_stat_spell_block_flat'), suffix: '%' },
    dmgRecentShockPct: { label: t('eg_stat_dmg_recent_shock'), suffix: '%' },
    shockDurationPct: { label: t('eg_stat_lightning_ailment_duration'), suffix: '%' },
    shockEffectPct: { label: t('eg_stat_shock_effect_inc'), suffix: '%' },
    lifePulsePct: { label: t('eg_stat_life_pulse'), suffix: '%' },
    dotFasterPct: { label: t('eg_stat_dot_faster'), suffix: '%' },
    enduranceMin: { label: t('eg_stat_endurance_min'), suffix: '' },
    enduranceOnKillPct: { label: t('eg_stat_endurance_on_kill_tree'), suffix: '%' },
    damagePerEndurancePct: { label: t('eg_stat_damage_per_endurance'), suffix: '%' },
    enduranceWhenHitPct: { label: t('eg_stat_endurance_when_hit'), suffix: '%' },
    lowLifeRegenPct: { label: t('eg_stat_low_life_regen_pct'), suffix: '%' },
    physTakenFlat: { label: t('eg_stat_phys_taken_flat'), suffix: '' },
    manaLeechEffectPct: { label: t('eg_stat_mana_leech_effect_inc'), suffix: '%' },
    critVsBleedingPct: { label: t('eg_stat_crit_vs_bleeding'), suffix: '%' },
    critMultiVsBleedingPct: { label: t('eg_stat_crit_multi_vs_bleeding'), suffix: '%' },
    avoidPhysHitPct: { label: t('eg_stat_avoid_phys_hit_pct'), suffix: '%' },
    armourIfHitPct: { label: t('eg_stat_armour_if_hit_recently'), suffix: '%' },
    evasionIfNotHitPct: { label: t('eg_stat_evasion_if_not_hit'), suffix: '%' },
    igniteFasterPct: { label: t('eg_stat_ignite_faster'), suffix: '%' },
    freezeDurationPct: { label: t('eg_stat_freeze_duration_inc'), suffix: '%' },
    critVsShockedPct: { label: t('eg_stat_crit_vs_shocked'), suffix: '%' },
    shadowResDouble: { label: t('eg_stat_shadow_res_double'), suffix: '' },
    armourPerEndurancePct: { label: t('eg_stat_armour_per_endurance'), suffix: '%' },
    moveSpeedPerFrenzyPct: { label: t('eg_stat_move_per_frenzy'), suffix: '%' },
    chargeSpeedPerFrenzyPct: { label: t('eg_stat_charge_per_frenzy'), suffix: '%' },
    stunPerEndurancePct: { label: t('eg_stat_stun_per_endurance'), suffix: '%' },
    aoePerEndurancePct: { label: t('eg_stat_aoe_per_endurance'), suffix: '%' },
    areaDamagePct: { label: t('eg_stat_area_damage_inc'), suffix: '%' },
    shieldElementalRes: { label: t('eg_stat_shield_elemental_res'), suffix: '%' },
    ailmentEffectTreePct: { label: t('eg_stat_ailment_effect_inc'), suffix: '%' },
    blindDurationPct: { label: t('eg_stat_blind_duration'), suffix: '%' },
    chillDurationPct: { label: t('eg_stat_cold_ailment_duration'), suffix: '%' },
    poisonChanceSpellPct: { label: t('eg_stat_poison_chance_spell'), suffix: '%' },
    igniteDurationTakenPct: { label: t('eg_stat_ignite_duration_taken'), suffix: '%' },
    shockEffectTakenPct: { label: t('eg_stat_shock_effect_taken'), suffix: '%' },
    chillEffectTakenPct: { label: t('eg_stat_chill_effect_taken'), suffix: '%' },
    freezeDurationTakenPct: { label: t('eg_stat_freeze_duration_taken'), suffix: '%' },
    spellDotIncPct: { label: t('eg_stat_spell_dot_inc'), suffix: '%' },
    critPerPowerCharge: { label: t('eg_stat_crit_per_power'), suffix: '%' },
    manaRegenPerPowerPct: { label: t('eg_stat_mana_regen_per_power'), suffix: '%' },
    critMultiPerPowerCharge: { label: t('eg_stat_crit_multi_per_power'), suffix: '%' },
    shieldCastSpeedPct: { label: t('eg_stat_shield_cast_speed'), suffix: '%' },
    shieldSpellDamagePct: { label: t('eg_stat_shield_spell_damage'), suffix: '%' },
    spellDamagePerPowerPct: { label: t('eg_stat_spell_damage_per_power'), suffix: '%' },
    shieldAbsorptionPct: { label: t('eg_stat_shield_absorption_inc'), suffix: '%' },
    rageDecaySlowerPct: { label: t('eg_stat_rage_decay'), suffix: '%' },
    ragePerArmourPct: { label: t('eg_stat_rage_armour'), suffix: '%' },
    rageWhenHitAmount: { label: t('eg_stat_rage_when_hit'), suffix: '' },
    powerChargesMax: { label: t('eg_stat_power_max'), suffix: '' },
    powerDurationPct: { label: t('eg_stat_power_duration'), suffix: '%' },
    powerOnCritPct: { label: t('eg_stat_power_on_crit'), suffix: '%' },
    powerOnKillPct: { label: t('eg_stat_power_on_kill'), suffix: '%' },
    powerOnBlockPct: { label: t('eg_stat_power_on_block'), suffix: '%' },
    powerOnStunPct: { label: t('eg_stat_power_on_stun'), suffix: '%' },
    powerDamagePerChargePct: { label: t('eg_stat_power_damage'), suffix: '%' },
    frenzyOnKillPct: { label: t('eg_stat_frenzy_on_kill'), suffix: '%' },
    frenzyOnBlockPct: { label: t('eg_stat_frenzy_on_block'), suffix: '%' },
    enduranceOnBlockPct: { label: t('eg_stat_endurance_on_block'), suffix: '%' },
    enduranceOnMeleeCritPct: { label: t('eg_stat_endurance_on_melee_crit'), suffix: '%' },
    blindChancePct: { label: t('eg_stat_blind_chance_tree'), suffix: '%' },
    blindEffectIncPct: { label: t('eg_stat_blind_effect'), suffix: '%' },
    critChanceVsBlindedPct: { label: t('eg_stat_crit_vs_blinded'), suffix: '%' },
    fortifyMax: { label: t('eg_stat_fortify_max'), suffix: '' },
    fortifyDurationPct: { label: t('eg_stat_fortify_duration'), suffix: '%' },
    fortifyOnStunPct: { label: t('eg_stat_fortify_on_stun'), suffix: '%' },
    fortifyEffectIncPct: { label: t('eg_stat_fortify_effect'), suffix: '%' },
    fortifiedDefencePct: { label: t('eg_stat_fortified_defences'), suffix: '%' },
    stunChancePct: { label: t('eg_stat_stun_chance_tree'), suffix: '%' },
    riposteDamagePct: { label: t('eg_stat_riposte_damage'), suffix: '%' },
    riposteDurationPct: { label: t('eg_stat_riposte_duration'), suffix: '%' },
    poisonChanceDaggerPct: { label: t('eg_stat_dagger_poison_chance'), suffix: '%' },
    daggerCritPoisons: { label: t('eg_stat_dagger_crit_poison'), suffix: '%' },
    powerCharges: { label: t('eg_stat_power_charges'), suffix: '' },
    fortifyStacks: { label: t('eg_stat_fortify_stacks'), suffix: '' },
    staffBlockPct: { label: t('eg_stat_staff_block'), suffix: '%' },
    staffSpellBlockPct: { label: t('eg_stat_staff_spell_block'), suffix: '%' },
    shieldSpellBlockPct: { label: t('eg_stat_shield_spell_block'), suffix: '%' },
    critChanceSwordPct: { label: t('eg_stat_crit_chance_sword'), suffix: '%' },
    critMultiplierSwordPct: { label: t('eg_stat_crit_multi_sword'), suffix: '%' },
    critChanceAxePct: { label: t('eg_stat_crit_chance_axe'), suffix: '%' },
    critMultiplierAxePct: { label: t('eg_stat_crit_multi_axe'), suffix: '%' },
    staffDamageIncPct: { label: t('eg_stat_staff_damage'), suffix: '%' },
    staffChargeSpeedPct: { label: t('eg_stat_staff_charge_speed'), suffix: '%' },
    critChanceStaffPct: { label: t('eg_stat_crit_chance_staff'), suffix: '%' },
    critMultiplierStaffPct: { label: t('eg_stat_crit_multi_staff'), suffix: '%' },
    wandDamageIncPct: { label: t('eg_stat_wand_damage'), suffix: '%' },
    wandChargeSpeedPct: { label: t('eg_stat_wand_charge_speed'), suffix: '%' },
    critChanceWandPct: { label: t('eg_stat_crit_chance_wand'), suffix: '%' },
    critMultiplierWandPct: { label: t('eg_stat_crit_multi_wand'), suffix: '%' },
    dualDamageIncPct: { label: t('eg_stat_dual_damage'), suffix: '%' },
    dualChargeSpeedPct: { label: t('eg_stat_dual_charge_speed'), suffix: '%' },
    dualAccuracyIncPct: { label: t('eg_stat_dual_accuracy'), suffix: '%' },
    dualCritChancePct: { label: t('eg_stat_dual_crit_chance'), suffix: '%' },
    dualCritMultiPct: { label: t('eg_stat_dual_crit_multi'), suffix: '%' },
    dualCastSpeedPct: { label: t('eg_stat_dual_cast_speed'), suffix: '%' },
    dualSpellDamagePct: { label: t('eg_stat_dual_spell_damage'), suffix: '%' },
    dualMoveSpeedPct: { label: t('eg_stat_dual_move_speed'), suffix: '%' },
    dualBlockPct: { label: t('eg_stat_dual_block'), suffix: '%' },
    physAsExtraColdPct: { label: t('eg_stat_phys_as_cold'), suffix: '%' },
    physAsExtraLightningPct: { label: t('eg_stat_phys_as_lightning'), suffix: '%' },
    freezeChancePct: { label: t('eg_stat_freeze_chance_tree'), suffix: '%' },
    shockChancePct: { label: t('eg_stat_shock_chance_tree'), suffix: '%' },
    penFirePct: { label: t('eg_stat_pen_fire'), suffix: '%' },
    penColdPct: { label: t('eg_stat_pen_cold'), suffix: '%' },
    penLightningPct: { label: t('eg_stat_pen_lightning'), suffix: '%' },
    penShadowPct: { label: t('eg_stat_pen_shadow'), suffix: '%' },
    penElementalPct: { label: t('eg_stat_pen_elemental'), suffix: '%' },
    rageOnHitAxe: { label: t('eg_stat_rage_on_hit'), suffix: '' },
    rageMeleeMorePct: { label: t('eg_stat_rage_effect'), suffix: '%' },
    rage: { label: t('eg_stat_rage'), suffix: '' },
    rageMax: { label: t('eg_stat_rage_max'), suffix: '' },
    meleePhysMaceIncPct: { label: t('eg_stat_inc_melee_phys_mace'), suffix: '%' },
    areaOfEffectPct: { label: t('eg_stat_area_of_effect'), suffix: '%' },
    stunChanceMaceChargedPct: { label: t('eg_stat_stun_chance_mace'), suffix: '%' },
    stunDurationPct: { label: t('eg_stat_stun_duration'), suffix: '%' },
    stunChanceHeavyPct: { label: t('eg_stat_stun_chance_heavy'), suffix: '%' },
    stunDurationHeavyPct: { label: t('eg_stat_stun_duration_heavy'), suffix: '%' },
    stunDoubleChancePct: { label: t('eg_stat_stun_double_chance'), suffix: '%' },
    meleeDoubleDamageChancePct: { label: t('eg_stat_melee_double_damage'), suffix: '%' },
    meleeSpellManaCostReducedPct: { label: t('eg_stat_melee_spell_mana_reduced'), suffix: '%' },
    meleeSpellLifeCostPct: { label: t('eg_stat_melee_spell_life_cost'), suffix: '%' },
    meleeKillExplodeChancePct: { label: t('eg_stat_melee_kill_explode'), suffix: '%' },
    // Melee charge-up speed (reworked node 30197): percentage shorter charge;
    // the resulting time is what the melee attackInterval line above shows.
    meleeChargeSpeedPct: { label: t('eg_stat_inc_melee_charge_speed'), suffix: '%' },
    // Generic passive-tree attack speed (reworked notable 20032), the
    // percentage sibling of the seconds-based attackSpeed line above.
    attackSpeedPct: { label: t('eg_stat_inc_attack_speed'), suffix: '%' },
    spellDamageFlat: { label: t('eg_stat_spell_damage'), suffix: '' },
    spellDamageIncPct: { label: t('eg_stat_inc_spell_damage'), suffix: '%' },
    elementalDamageIncPct: { label: t('eg_stat_inc_elemental_damage'), suffix: '%' },
    fireDamageIncPct: { label: t('eg_stat_inc_fire_damage'), suffix: '%' },
    coldDamageIncPct: { label: t('eg_stat_inc_cold_damage'), suffix: '%' },
    castSpeedPct: { label: t('eg_stat_cast_speed'), suffix: '%' },
    fireCastSpeedPct: { label: t('eg_stat_fire_cast_speed'), suffix: '%' },
    coldCastSpeedPct: { label: t('eg_stat_cold_cast_speed'), suffix: '%' },
    lightningDamageIncPct: { label: t('eg_stat_inc_lightning_damage'), suffix: '%' },
    lightningCastSpeedPct: { label: t('eg_stat_lightning_cast_speed'), suffix: '%' },
    healingPowerFlat: { label: t('eg_stat_healing_power'), suffix: '' },
    healingPowerIncPct: { label: t('eg_stat_inc_healing_power'), suffix: '%' },

    lifeLeechPct: { label: t('eg_stat_life_leech'), suffix: '%' },
    lifeLeechMeleePct: { label: t('eg_stat_life_leech_melee'), suffix: '%' },

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
    blockChanceTree: { label: t('eg_stat_block_dualshield'), suffix: '%' },
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

    parryChancePct: { label: t('eg_stat_parry'), suffix: '%' },
    deflectChancePct: { label: t('eg_stat_deflect_chance'), suffix: '%' },
    deflectDamagePct: { label: t('eg_stat_deflect_damage'), suffix: '%' },
    reflectPhysFlat: { label: t('eg_stat_reflect_damage'), suffix: '' },
    movementSpeedPct: { label: t('eg_stat_movement_speed'), suffix: '%' },

    absorptionRegenRatePct: { label: t('eg_stat_absorption_regen_rate'), suffix: '%' },
    fasterAbsorptionRegenStart: { label: t('eg_stat_faster_absorption_start'), suffix: 's' },
};

// Rounds a value for display: whole numbers stay whole, decimals get 1 digit.
export function _egFormatStatValue(val) {
    const rounded = Math.round(val * 10) / 10;
    return Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
}


//------------------------------------------------------------------------
//-------------------STAT LAYOUT (GROUPED DISPLAY)------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Defines WHERE each stat is shown on the hub equipment screen and how
// stats are grouped into categories:
//   offense - upper left corner block (damage, crit, projectiles, ...)
//   defense - upper right corner block (defences, life/mana, resistances)
//   puzzle  - center column between the paperdoll slots (mistakes/time,
//             quiz helpers)
// Buckets not listed in any category are silently omitted from display.
export const EG_STAT_LAYOUT = {
    offense: [
        { catKey: 'eg_statcat_attributes', buckets: ['strength', 'agility', 'intelligence'] },
        { catKey: 'eg_statcat_crit', buckets: ['critChance', 'critMultiplierPct'] },
        // Manual melee charge channel - independent from the projectile
        // channel above; fed only by the weapon slot (see _egComputePlayerStats).
        // 'dualWield' heads the section while two 1H weapons are equipped so
        // the combined-at-70% ranges below read correctly.
        { catKey: 'eg_statcat_melee', buckets: [
            'dualWield', 'attackInterval', 'attackSpeed', 'meleePhysRange', 'meleeFireRange', 'meleeColdRange',
            'meleeLightningRange',            'meleeShadowRange', 'meleePhysIncPct', 'meleePhys1HIncPct', 'meleePhysHeavyIncPct', 'meleePhysSwordIncPct', 'meleePhysAxeIncPct', 'meleePhysMaceIncPct', 'areaOfEffectPct', 'stunChanceMaceChargedPct', 'stunDurationPct', 'stunChanceHeavyPct', 'stunDurationHeavyPct', 'stunDoubleChancePct', 'meleeDoubleDamageChancePct', 'meleeKillExplodeChancePct', 'meleeSpellManaCostReducedPct', 'meleeSpellLifeCostPct', 'swordChargeSpeedPct', 'ignorePhysReductionPct', 'intimidateChanceMeleePct', 'intimidateMeleeAmpPct', 'axeChargeSpeedPct', 'rage', 'rageMax', 'rageOnHitAxe', 'attacksNeverMiss', 'movementSpeedLessPct', 'noRepeatTarget', 'singleElementMorePct', 'lastElementResistPct', 'absorptionStopsWhileAttacking', 'absorptionRegenDelaySecs', 'evasionToArmour', 'agilityNoEvasion', 'lifeLeechInstant', 'lifeOnlyFromLeech', 'windDancerLessPct', 'windDancerEvadePct', 'windDancerMorePct', 'lifeBecomesOne', 'shadowImmune', 'chilledColdTaken', 'damageToColdPct', 'onlyColdDamage', 'bleedStackMax', 'bleedLessPct', 'absorptionRemoved', 'manaToLifePct', 'elementalOverloadPct', 'critsNoExtraDamage', 'dotMultiEqualsCrit', 'nonCritNoAilments', 'absorptionRegenUninterrupted', 'absorptionRegenLessPct', 'armourDefendDouble', 'maxDamageReductionCap', 'spellDmgLowLifeMorePct', 'damageFromManaPct', 'ghostDance', 'ghostShroudMax', 'ghostShroudRecoverPct', 'blockDoubled', 'blockedHitTakenPct', 'damageToLightningPct', 'onlyLightningDamage', 'lightningMaxMorePct', 'lightningMinLessPct', 'cannotEvade', 'cannotBeStunned', 'pointBlankPct', 'blockMaxAttackLess', 'blockMaxSpellLess', 'spellBlockPerOvercap', 'dodgeChanceTreePct', 'armourLessPct', 'absorptionLessPct', 'spellCostFromAbsorption', 'strengthSpellDamage', 'lifeRegenToAbsorption', 'preciseTechniquePct', 'neverCrit', 'impaleSpread', 'impaleExtra', 'impaleLockout', 'secondaryDamagePct', 'pierceChanceTreePct', 'pierceTargetsExtra', 'chainChanceTreePct', 'chainCountExtra', 'forkChancePct', 'forkExtraChancePct', 'multishotChanceTreePct', 'costEfficiencyPct', 'onslaughtEffectPct', 'onslaughtOnKillPct', 'onslaughtDefencePct', 'leechEffectRecentCritPct', 'wandPhysAsLightningPct', 'bowAoePct', 'dmgFullAbsorptionPct', 'critMultiHeavy', 'dmgVsLowLifePct', 'aoeRecentKillPct', 'ailmentDurationTakenPct', 'chillShockTakenPct', 'spellDotMultiPct', 'manaLeechAttackPct', 'spellBlockFlat', 'dmgRecentShockPct', 'shockDurationPct', 'shockEffectPct', 'lifePulsePct', 'dotFasterPct', 'enduranceMin', 'enduranceOnKillPct', 'damagePerEndurancePct', 'enduranceWhenHitPct', 'lowLifeRegenPct', 'physTakenFlat', 'manaLeechEffectPct', 'critVsBleedingPct', 'critMultiVsBleedingPct', 'avoidPhysHitPct', 'armourIfHitPct', 'evasionIfNotHitPct', 'igniteFasterPct', 'freezeDurationPct', 'critVsShockedPct', 'shadowResDouble', 'armourPerEndurancePct', 'moveSpeedPerFrenzyPct', 'chargeSpeedPerFrenzyPct', 'stunPerEndurancePct', 'aoePerEndurancePct', 'areaDamagePct', 'shieldElementalRes', 'ailmentEffectTreePct', 'blindDurationPct', 'chillDurationPct', 'poisonChanceSpellPct', 'igniteDurationTakenPct', 'shockEffectTakenPct', 'chillEffectTakenPct', 'freezeDurationTakenPct', 'spellDotIncPct', 'critPerPowerCharge', 'manaRegenPerPowerPct', 'critMultiPerPowerCharge', 'shieldCastSpeedPct', 'shieldSpellDamagePct', 'spellDamagePerPowerPct', 'shieldAbsorptionPct', 'rageDecaySlowerPct', 'ragePerArmourPct', 'rageWhenHitAmount', 'rageMeleeMorePct', 'bleedChanceMeleePct', 'bleedChanceAttackPct', 'poisonChanceAttackPct', 'poisonDotMultiPct', 'bleedSpeedPct',
            'meleeChargeSpeedPct', 'attackSpeedPct', 'critChanceMeleePct', 'manaOnMeleeHitChargedPct', 'meleeRangeM', 'meleeAoEPct', 'critChanceMeleeMacePct', 'critMultiplierMeleeMacePct', 'crushPhysReductionPct', 'blindChancePct', 'blindEffectIncPct', 'critChanceVsBlindedPct', 'stunChancePct', 'riposteDamagePct', 'riposteDurationPct', 'poisonChanceDaggerPct', 'daggerCritPoisons', 'staffBlockPct', 'staffSpellBlockPct', 'shieldSpellBlockPct', 'critChanceSwordPct', 'critMultiplierSwordPct', 'critChanceAxePct', 'critMultiplierAxePct', 'staffDamageIncPct', 'staffChargeSpeedPct', 'critChanceStaffPct', 'critMultiplierStaffPct', 'wandDamageIncPct', 'wandChargeSpeedPct', 'critChanceWandPct', 'critMultiplierWandPct', 'dualDamageIncPct', 'dualChargeSpeedPct', 'dualAccuracyIncPct', 'dualCritChancePct', 'dualCritMultiPct', 'dualCastSpeedPct', 'dualSpellDamagePct', 'dualMoveSpeedPct', 'dualBlockPct'] },
        { catKey: 'eg_statcat_projectiles', buckets: [
            'physRange', 'fireRange', 'coldRange', 'lightningRange', 'shadowRange',
            'physIncPct', 'spellDamageFlat', 'spellDamageIncPct', 'elementalDamageIncPct', 'fireDamageIncPct',
            'coldDamageIncPct', 'lightningDamageIncPct',
            'projectileDamageIncPct', 'projectileSpeedPct', 'projectileCritChancePct', 'projectileCritMultiplierPct', 'projectileElementalDamageIncPct',
            'bowSpellDamageIncPct', 'bowSpellDotIncPct', 'bowSpellManaCostReducedPct', 'manaOnProjectileHitPct', 'lifeOnProjectileHit', 'lifeBurstOnProjectileHitChancePct', 'lifeOnMeleeHit', 'lifeOnAttackHit', 'dotIncPct', 'shadowDamageIncPct', 'damageIncPct', 'critChanceDaggerPct', 'spellCritChancePct', 'spellCritMultiplierPct', 'chillEffectIncPct', 'absorptionLeechSpellPct', 'absorptionLeechEffectIncPct', 'physAsExtraShadowPct', 'lifeRecoupPct', 'daggerDamageIncPct', 'daggerChargeSpeedPct', 'lifeLeechAsAbsorption', 'absorptionNoRecharge', 'skillEffectDurationPct', 'lifeLeechEffectIncPct', 'dotIncDaggerPct', 'critMultiplierDaggerPct', 'poisonDurationPct', 'critDotMultiPct',
            'healingPowerFlat', 'healingPowerIncPct',
            'accuracy', 'multishotPct', 'splashPct', 'chainPct',
            'piercePct', 'cleavePct', 'snipePct', 'overkillPct', 'staggerPct',
            'pushbackFlat'] },
        { catKey: 'eg_statcat_ailments', buckets: ['ignitePct', 'freezePct', 'shockPct', 'blindPct', 'convertPct', 'damageToFirePct', 'onlyFireDamage', 'physAsExtraFirePct', 'physAsExtraColdPct', 'physAsExtraLightningPct', 'freezeChancePct', 'shockChancePct', 'penFirePct', 'penColdPct', 'penLightningPct', 'penShadowPct', 'penElementalPct', 'igniteDamageMorePct', 'physDotMorePct', 'ailmentDurationPct', 'ailmentEffectPct', 'igniteDurationPct', 'bleedDurationPct', 'retaliationWardBleed', 'retaliationWardIgnite',
            'impaleChanceHeavyPct', 'impaleEffectHeavyPct', 'impaleEffectFreshPct', 'impaleDurationPct'] },
        { catKey: 'eg_statcat_arcane', buckets: [
            'castSpeedPct', 'fireCastSpeedPct', 'coldCastSpeedPct', 'lightningCastSpeedPct', 'echoChancePct', 'echoDamagePct', 'channelDamagePerStack',
            'channelMaxStacks', 'arcaneSurgeStreak', 'arcaneSurgeMana',
            'manaToDamagePct'] },
    ],
    defense: [
        { catKey: 'eg_statcat_defences', buckets: ['armour', 'evasion', 'absorption', 'stunAvoidPct', 'parrySpellChancePct'] },
        { catKey: 'eg_statcat_life_mana', buckets: [
            'health', 'healthMorePct', 'mana', 'manaRemoved', 'manaLessPct', 'spellsCostLife', 'spellCostIncPct', 'lifeRegen', 'lifeRegenRatePct', 'lifeRegenLessPct', 'manaRegen', 'manaRegenIncPct', 'lifeLeechPct', 'lifeLeechMeleePct', 'lifeLeechLessPct', 'absorptionRechargesLife',
            'lifeOnKill', 'manaOnKill', 'absorptionOnKill', 'manaOnMistake',
            'heartHealFlat', 'heartHealIncPct', 'heartSpawnIncPct', 'manaHealFlat', 'manaHealIncPct', 'manaSpawnIncPct', 'wardingHP'] },
        { catKey: 'eg_statcat_block_dodge', buckets: [
            'blockChance', 'spellBlockChance', 'blockChanceTree', 'blockRecoveryPct',
            'blockChanceShieldPct', 'powerCharges', 'powerChargesMax', 'powerDurationPct', 'powerOnCritPct', 'powerOnKillPct', 'powerOnBlockPct', 'powerOnStunPct', 'powerDamagePerChargePct', 'frenzyOnKillPct', 'frenzyOnBlockPct', 'enduranceOnBlockPct', 'enduranceOnMeleeCritPct', 'fortifyStacks', 'fortifyMax', 'fortifyDurationPct', 'fortifyOnStunPct', 'fortifyEffectIncPct', 'fortifiedDefencePct', 'frenzyCharges', 'frenzyChargesMax', 'frenzyDurationPct', 'evasionPerFrenzyChargePct', 'enduranceCharges', 'enduranceChargesMax', 'enduranceDurationPct', 'lifeRegenPerEndurancePct', 'enduranceOnKillShieldPct',
            'dodgeChance', 'spellDodgeChance', 'preemptiveDodgePct',
            'parryChancePct', 'deflectChancePct', 'deflectDamagePct', 'reflectPhysFlat',
            'fatePct', 'castingAilmentAvoidPct', 'bleedAvoidPct', 'poisonAvoidPct', 'shockAvoidPct', 'igniteAvoidPct', 'chillAvoidPct', 'elementalAilmentAvoidPct'] },
        { catKey: 'eg_statcat_resistances', buckets: [
            // 'allElementalResist' is deliberately NOT listed: it is folded
            // into the fire/cold/lightning lines by _egBuildStatLine, which is
            // the same value _egCalcPlayerResistanceReduction mitigates with.
            'fireResist', 'coldResist', 'lightningResist', 'shadowResist',] },
        { catKey: 'eg_statcat_recovery', buckets: [
            'absorptionRegenRatePct', 'fasterAbsorptionRegenStart',
            'groundedChancePct', 'groundedReductionPct',
            'shieldBashChancePct', 'shieldBashDamageFlat', 'movementSpeedPct'] },
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
export function _egBuildStatLine(bucket, stats) {
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

        // Dual-wield indicator (pseudo-bucket): rendered only while two 1H
        // weapons are equipped. The melee ranges below already reflect the
        // combined-at-70% scaling - this line says why.
        case 'dualWield': {
            if (typeof _egIsDualWielding !== 'function' || !_egIsDualWielding()) return null;
            line = { label: t('eg_stat_dual_wield'), value: t('eg_stat_dual_wield_value') };
            break;
        }

        // Effective melee charge time: weapon base minus the summed
        // attack_speed mods from gear, shortened by the global charge
        // pacing (always present - shown first in the "Melee Strikes"
        // category).
        case 'attackInterval': {
            if (typeof _egGetPlayerAttackIntervalBreakdown !== 'function') return null;
            const { interval } = _egGetPlayerAttackIntervalBreakdown();
            const value = `${_egFormatStatValue(interval)}s`;
            line = { label: t('eg_stat_attack_interval'), value };
            break;
        }

        // Physical + elemental damage ranges (projectile channel)
        case 'physRange':
            if (stats.physFlatMin > 0 || stats.physFlatMax > 0) {
                line = { label: t('eg_stat_phys_damage'), value: `${_egFormatStatValue(stats.physFlatMin)}–${_egFormatStatValue(stats.physFlatMax)}` };
            }
            break;
        // Melee-only damage ranges - same labels, grouped under the
        // "Melee Strikes" category so the two channels stay distinct
        case 'meleePhysRange':
            if (stats.meleePhysMin > 0 || stats.meleePhysMax > 0) {
                line = { label: t('eg_stat_phys_damage'), value: `${_egFormatStatValue(stats.meleePhysMin)}–${_egFormatStatValue(stats.meleePhysMax)}` };
            }
            break;
        case 'meleeFireRange': case 'meleeColdRange': case 'meleeLightningRange': case 'meleeShadowRange':
        case 'fireRange': case 'coldRange': case 'lightningRange': case 'shadowRange': {
            const pairMap = {
                fireRange: ['fireDmgMin', 'fireDmgMax'],
                coldRange: ['coldDmgMin', 'coldDmgMax'],
                lightningRange: ['lightningDmgMin', 'lightningDmgMax'],
                shadowRange: ['shadowDmgMin', 'shadowDmgMax'],
                meleeFireRange: ['meleeFireMin', 'meleeFireMax'],
                meleeColdRange: ['meleeColdMin', 'meleeColdMax'],
                meleeLightningRange: ['meleeLightningMin', 'meleeLightningMax'],
                meleeShadowRange: ['meleeShadowMin', 'meleeShadowMax'],
            };
            const [minKey, maxKey] = pairMap[bucket];
            if (stats[minKey] > 0 || stats[maxKey] > 0) {
                const base = bucket.startsWith('melee') ? bucket.charAt(5).toLowerCase() + bucket.slice(6) : bucket;
                const labelKey = { fireRange: 'eg_stat_fire_damage', coldRange: 'eg_stat_cold_damage', lightningRange: 'eg_stat_lightning_damage', shadowRange: 'eg_stat_shadow_damage' }[base];
                line = { label: t(labelKey), value: `${_egFormatStatValue(stats[minKey])}–${_egFormatStatValue(stats[maxKey])}` };
            }
            break;
        }

        // Parry / Deflect are always shown in the defensive block (even with
        // 0 gear) because they have meaningful baselines: 50% parry while
        // holding the parry key, 5% deflect on a successful projectile parry, 30%
        // deflect damage. Use the live baseline helpers when available so the
        // displayed total always matches combat. While dual-wielding, the
        // auto-parry (15% baseline + gear, no key needed) is shown first with
        // the held value in parentheses, mirroring the combat precedence.
        case 'parryChancePct': {
            const gear = stats.parryChancePct || 0;
            const held = (typeof _egGetParryChancePct === 'function')
                ? _egGetParryChancePct()
                : ((typeof EG_PARRY_BASE_PCT !== 'undefined' ? EG_PARRY_BASE_PCT : 50) + gear);
            const dual = (typeof _egIsDualWielding === 'function' && _egIsDualWielding());
            if (dual) {
                const auto = (typeof _egGetDualWieldParryChancePct === 'function')
                    ? _egGetDualWieldParryChancePct()
                    : ((typeof EG_DUAL_WIELD_PARRY_PCT !== 'undefined' ? EG_DUAL_WIELD_PARRY_PCT : 15) + gear);
                let suffix = 'while holding [R]';
                try { const s = t('eg_stat_parry_held_suffix'); if (s && s !== 'eg_stat_parry_held_suffix') suffix = s; } catch (e) {}
                line = { label: t('eg_stat_parry'), value: `${_egFormatStatValue(auto)}% (${_egFormatStatValue(held)}% ${suffix})` };
            } else {
                line = { label: t('eg_stat_parry'), value: `${_egFormatStatValue(held)}%` };
            }
            break;
        }
        case 'deflectChancePct': {
            const total = (typeof _egGetDeflectChancePct === 'function')
                ? _egGetDeflectChancePct()
                : ((typeof EG_DEFLECT_BASE_PCT !== 'undefined' ? EG_DEFLECT_BASE_PCT : 5) + (stats.deflectChancePct || 0));
            line = { label: t('eg_stat_deflect_chance'), value: `${_egFormatStatValue(total)}%` };
            break;
        }
        case 'deflectDamagePct': {
            const total = (typeof _egGetDeflectDamagePct === 'function')
                ? _egGetDeflectDamagePct()
                : ((typeof EG_DEFLECT_BASE_DMG_PCT !== 'undefined' ? EG_DEFLECT_BASE_DMG_PCT : 30) + (stats.deflectDamagePct || 0));
            line = { label: t('eg_stat_deflect_damage'), value: `${_egFormatStatValue(total)}%` };
            break;
        }

        // Elemental resistances - shown as the CAPPED (effective) value;
        // the uncapped gear total + the current cap are revealed on hover
        // (see _egBuildStatDescTooltipHTML in endgame-hub.js). The cap is
        // 75% base, raised by "increased maximum Resistance" uniques.
        case 'fireResist': case 'coldResist': case 'lightningResist': case 'shadowResist': {
            const element = bucket.replace('Resist', '');
            // "All Elemental Resistances" (passive tree) is a flat bonus that
            // raises fire, cold and lightning together - the three rollable
            // elements. It is folded in here so
            // the sheet never under-reports the mitigation the player gets.
            // Shadow resistance is explicitly out of its scope, and
            // _egCalcPlayerResistanceReduction uses the same split.
            const allElem = (element === 'shadow') ? 0 : Math.max(0, stats.allElementalResist || 0);
            const total = (stats[bucket] || 0) + allElem;
            const allElemMax = (element === 'shadow') ? 0 : (stats.allElementalResistMax || 0);
            if (!total && !(stats[bucket.replace('Resist', 'ResistMax')] || 0) && !stats.allResMax && !allElemMax) return null;
            const cap = (typeof EG_RESIST_CAP_PCT !== 'undefined' ? EG_RESIST_CAP_PCT : 75)
                + Math.max(0, (stats[element + 'ResistMax'] || 0) + (stats.allResMax || 0) + allElemMax);
            const shown = Math.min(Math.max(0, total), cap);
            line = { label: EG_STAT_DISPLAY_LABELS[bucket].label, value: `${_egFormatStatValue(shown)}%` };
            line.resTotal = Math.max(0, total);
            line.resCap = cap;
            break;
        }

        default: {
            const meta = EG_STAT_DISPLAY_LABELS[bucket];
            if (!meta) return null;
            const val = stats[bucket];
            if (!val || val === 0) return null;
            // Attributes are absolute totals (base + gear), not bonuses -
            // no "+" prefix so the number matches requirement checks.
            const isAttribute = bucket === 'strength' || bucket === 'agility' || bucket === 'intelligence';
            line = { label: meta.label, value: `${isAttribute ? '' : '+'}${_egFormatStatValue(val)}${meta.suffix}` };
        }
    }

    if (!line) return null;
    line.bucket = bucket;
    // Melee damage ranges share tooltips with their projectile counterparts
    // (eg_statdesc_meleeFireRange does not exist - fall back to eg_statdesc_fireRange)
    // Melee-only percentage stats whose non-melee counterpart means something
    // broader (physIncPct = ALL physical damage) carry their own description
    // key; the melee damage RANGES keep sharing their projectile counterpart.
    const MELEE_DESC_KEYS = {
        meleePhysIncPct: 'eg_statdesc_meleePhysIncPct',
        meleePhys1HIncPct: 'eg_statdesc_meleePhys1HIncPct',
        meleePhysHeavyIncPct: 'eg_statdesc_meleePhysHeavyIncPct',
        meleePhysSwordIncPct: 'eg_statdesc_meleePhysSwordIncPct',
        meleePhysAxeIncPct: 'eg_statdesc_meleePhysAxeIncPct',
        meleePhysMaceIncPct: 'eg_statdesc_meleePhysMaceIncPct',
        meleeChargeSpeedPct: 'eg_statdesc_meleeChargeSpeedPct',
    };
    const descBucket = bucket.startsWith('melee') ? bucket.charAt(5).toLowerCase() + bucket.slice(6) : bucket;
    line.descKey = MELEE_DESC_KEYS[bucket] || `eg_statdesc_${descBucket}`;
    return line;
}

// Aggregates all non-zero stats into the three screen regions defined by
// EG_STAT_LAYOUT. Returns { offense: [...], defense: [...], puzzle: [...] }
// where each side is an array of { title, lines: [{ label, value, descKey }] }.
export function _egBuildGroupedStats(stats) {
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
                                            but when the player blocks he cannot block again for the next 8 seconds. So we can introduce a +BlockRecovery stat that reduces this time
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

    + overkill: increases the overkill damage transferred to a nearby monster



Damage of Spells: (TODO: All class abilities shall have a way to affect monsters on the screen, some deal damage, some apply status effects and other debuffs)
// +SpellDamage - flat increase to class ability damage against monsters
// *SpellDamage - multiplier of spell damage (should be lower values)




*/



