//------------------------------------------------------------------------
//-------------------ENDGAME IMPLICITS (PoE-STYLE)------------------------
//------------------------------------------------------------------------
// Base types now carry ONE (sometimes two) built-in beneficial implicit
// modifier that scales with the base's required level (NOT item level).
//   - Values are rolled from a level-interpolated range — higher required
//     level ⇒ strictly stronger implicits (decently strong at endgame).
//   - Regular currency orbs NEVER touch implicits; only the Blessing Orb
//     may reroll them.
//   - Load after endgame-equipment-base-items.js (needs EG_SLOT_ICONS) and
//     before endgame-equipment-generator.js (generator calls the roll helper)
//     and before endgame-player-stats.js (stats aggregation reads implicits).
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------SCALED FAMILY DEFINITIONS-----------------------------
//------------------------------------------------------------------------
// Each family defines a localized label template ('#' is the sole numeric
// placeholder, hybrid families use '#'+'@' and split labels with '\n') and
// the value ranges at the extremes of the level ladder:
//   lo — rolled when base required level == 1
//   hi — rolled when base required level == 90 (clamped above)
// Between those, min and max are linearly interpolated by t.
// Values are intentionally strong — roughly 60-80% of a top-tier explicit
// affix at endgame, and ~30% at level 1 so early implicits feel real.

const EG_IMPLICIT_FAMILIES = {
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
    // Local defenses — require base to have the stat (filtered like explicit locals)
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
        // hybrid values — min1/max1 = low of physical range, min2/max2 = high
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
        label: 'Melee Strikes occur #s more often', labelDe: 'Nahkampfschläge erfolgen #s häufiger',
        // float seconds — stored as integer tenths? Keep 2 decimals display.
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


//------------------------------------------------------------------------
//-------------------POOL BY SLOT------------------------------------------
//------------------------------------------------------------------------
// Each slot lists candidate familyIds. The generator samples uniformly from
// the subset that is actually allowed on the base (local-defense implicits
// need the base to have the stat). Jewelry never carries local implicits.

const EG_IMPLICIT_POOL_BY_SLOT = {
    head:      ['flat_health','flat_mana','fire_resist','cold_resist','lightning_resist','shadow_resist','strength','agility','intelligence','inc_armour','inc_evasion','inc_absorption','life_regen'],
    chest:     ['flat_health','flat_mana','fire_resist','cold_resist','lightning_resist','shadow_resist','strength','agility','intelligence','inc_armour','inc_evasion','inc_absorption','life_regen','mana_regen'],
    gloves:    ['flat_health','accuracy','crit_chance','strength','agility','intelligence','inc_armour','inc_evasion','inc_absorption','attack_speed','spell_damage'],
    boots:     ['flat_health','dodge','strength','agility','inc_armour','inc_evasion','inc_absorption','life_regen','mana_regen'],
    pants:     ['flat_health','flat_mana','strength','agility','intelligence','inc_armour','inc_evasion','inc_absorption','life_regen'],
    belt:      ['flat_health','flat_mana','strength','agility','intelligence','fire_resist','cold_resist','lightning_resist','life_regen','mana_regen'],
    shoulders: ['flat_health','strength','agility','intelligence','fire_resist','cold_resist','lightning_resist','inc_armour','inc_evasion','inc_absorption'],
    cloak:     ['flat_health','flat_mana','dodge','shadow_resist','fire_resist','cold_resist','lightning_resist','inc_evasion','inc_absorption'],
    bracers:   ['flat_health','accuracy','crit_chance','strength','agility','inc_armour','inc_evasion','attack_speed'],
    // jewelry — global only, never local
    earring:   ['flat_health','flat_mana','strength','agility','intelligence','fire_resist','cold_resist','lightning_resist','shadow_resist','life_regen','mana_regen','crit_chance','spell_damage','accuracy'],
    ring:      ['flat_health','flat_mana','strength','agility','intelligence','fire_resist','cold_resist','lightning_resist','shadow_resist','life_regen','mana_regen','crit_chance','spell_damage','accuracy'],
    amulet:    ['flat_health','flat_mana','strength','agility','intelligence','fire_resist','cold_resist','lightning_resist','shadow_resist','crit_chance','crit_multiplier','spell_damage','accuracy'],
    talisman:  ['flat_health','flat_mana','strength','agility','intelligence','fire_resist','cold_resist','lightning_resist','dodge','crit_chance','spell_damage'],
    arcane:    ['flat_health','flat_mana','intelligence','spell_damage','crit_chance','crit_multiplier','accuracy','mana_regen','cooldown_arcane_reveal','cooldown_absolute_zero','cooldown_data_strike','cooldown_diagonal_strike','cooldown_precision_shot','cooldown_rain_of_arrows','cooldown_tail_risk','cooldown_speedforce','cooldown_regression_to_prior','cooldown_significance_threshold','cooldown_residual','cooldown_degrees_of_freedom','cooldown_state_rollback','cooldown_transition_matrix','cooldown_bayes_traps','cooldown_type_i_error_shield','cooldown_brownian_motion','cooldown_drifter'],
    weapon:    ['inc_physical_damage','flat_physical_damage','crit_chance','crit_multiplier','attack_speed','accuracy','spell_damage'],
    shield:    ['block_chance','flat_health','strength','inc_armour','inc_absorption','life_regen','spell_damage'],
    ranged:    ['flat_physical_damage','inc_physical_damage','crit_chance','crit_multiplier','accuracy','attack_speed','spell_damage'],
};


//------------------------------------------------------------------------
//-------------------SCALING HELPERS---------------------------------------
//------------------------------------------------------------------------

const EG_IMPLICIT_LEVEL_MIN = 1;
const EG_IMPLICIT_LEVEL_MAX = 90;

function _egImplicitClampLevel(lvl) {
    const n = Number(lvl) || 1;
    return Math.max(EG_IMPLICIT_LEVEL_MIN, Math.min(EG_IMPLICIT_LEVEL_MAX, n));
}

function _egImplicitLerp(a, b, t) {
    return a + (b - a) * t;
}

function _egImplicitIsLocalDefense(familyId) {
    return familyId === 'inc_armour' || familyId === 'inc_evasion' || familyId === 'inc_absorption';
}

function _egImplicitAllowedOnBase(familyId, defenses) {
    if (!_egImplicitIsLocalDefense(familyId)) return true;
    if (!defenses) return false;
    if (familyId === 'inc_armour') return (defenses.armour || 0) > 0;
    if (familyId === 'inc_evasion') return (defenses.evasion || 0) > 0;
    if (familyId === 'inc_absorption') return (defenses.absorption || 0) > 0;
    return true;
}

// Returns { min, max } or { min1,max1,min2,max2 } interpolated for reqLevel
function _egGetImplicitRange(family, reqLevel) {
    const lvl = _egImplicitClampLevel(reqLevel);
    const t = (lvl - EG_IMPLICIT_LEVEL_MIN) / (EG_IMPLICIT_LEVEL_MAX - EG_IMPLICIT_LEVEL_MIN);
    const lo = family.lo, hi = family.hi;
    if (lo.min1 !== undefined) {
        return {
            min1: Math.round(_egImplicitLerp(lo.min1, hi.min1, t)),
            max1: Math.round(_egImplicitLerp(lo.max1, hi.max1, t)),
            min2: Math.round(_egImplicitLerp(lo.min2, hi.min2, t)),
            max2: Math.round(_egImplicitLerp(lo.max2, hi.max2, t)),
        };
    }
    if (family.isFloat) {
        return {
            min: Math.round(_egImplicitLerp(lo.min, hi.min, t) * 10) / 10,
            max: Math.round(_egImplicitLerp(lo.max, hi.max, t) * 10) / 10,
        };
    }
    return {
        min: Math.round(_egImplicitLerp(lo.min, hi.min, t)),
        max: Math.round(_egImplicitLerp(lo.max, hi.max, t)),
    };
}

function _egRollImplicitValue(range) {
    if (range.min1 !== undefined) {
        const v1 = range.min1 + Math.floor(Math.random() * (range.max1 - range.min1 + 1));
        const v2 = range.min2 + Math.floor(Math.random() * (range.max2 - range.min2 + 1));
        return { v1, v2 };
    }
    if (Number.isFinite(range.min) && range.min % 1 !== 0 || range.max % 1 !== 0) {
        // float range (attack_speed)
        const lo = Math.min(range.min, range.max);
        const hi = Math.max(range.min, range.max);
        const v = Math.round((lo + Math.random() * (hi - lo)) * 10) / 10;
        return { v };
    }
    const lo = Math.min(range.min, range.max);
    const hi = Math.max(range.min, range.max);
    const v = lo + Math.floor(Math.random() * (hi - lo + 1));
    return { v };
}

function _egBuildImplicitRolledStats(family, reqLevel) {
    const range = _egGetImplicitRange(family, reqLevel);
    const label = (typeof LANG !== 'undefined' && LANG === 'de' && family.labelDe) ? family.labelDe : family.label;
    if (range.min1 !== undefined) {
        const { v1, v2 } = _egRollImplicitValue(range);
        // hybrid: label contains both # and @
        return [
            { key: family.id + '_1', label: label.replace('#', v1).replace('@', v2), value: v1 },
            { key: family.id + '_2', label: label.replace('#', v1).replace('@', v2), value: v2 },
        ];
    }
    const { v } = _egRollImplicitValue(range);
    return [
        { key: family.id, label: label.replace('#', v), value: v },
    ];
}


//------------------------------------------------------------------------
//-------------------ROLL ENTRY POINT--------------------------------------
//------------------------------------------------------------------------
// Picks 1 implicit for the given base, scaled by base.requirements.level.
// Returns array of implicit objects: [{ familyId, tier:'implicit', isImplicit:true, rolledStats }]

function _egRollImplicitsForBase(base) {
    if (!base || !base.slotType) return [];
    const reqLevel = (base.requirements && base.requirements.level) || base.minLevel || 1;
    const pool = EG_IMPLICIT_POOL_BY_SLOT[base.slotType] || EG_IMPLICIT_POOL_BY_SLOT.head;
    // Filter pool to only families allowed on this base (local defense check)
    const eligible = pool.filter(fid => {
        const fam = EG_IMPLICIT_FAMILIES[fid];
        if (!fam) return false;
        return _egImplicitAllowedOnBase(fid, base.defenses);
    });
    if (eligible.length === 0) return [];
    // Most items get 1 implicit; high-tier bases (req >= 60) get a small chance for a second distinct implicit
    const implicitCount = (reqLevel >= 75 && Math.random() < 0.18) ? 2 : 1;
    const chosen = [];
    const used = new Set();
    for (let i = 0; i < implicitCount; i++) {
        const candidates = eligible.filter(fid => !used.has(fid));
        if (candidates.length === 0) break;
        const fid = candidates[Math.floor(Math.random() * candidates.length)];
        used.add(fid);
        const fam = EG_IMPLICIT_FAMILIES[fid];
        const range = _egGetImplicitRange(fam, reqLevel);
        // Safety: range sanity
        if (range.min == null && range.min1 == null) continue;
        const rolledStats = _egBuildImplicitRolledStats(fam, reqLevel);
        chosen.push({
            familyId: fid,
            tier: 'implicit',
            isImplicit: true,
            rolledStats,
            reqLevel,
        });
    }
    return chosen;
}

// Rerolls numeric values of existing implicits, keeping the same families.
// Used by the Blessing Orb. Values are freshly sampled from the SAME
// reqLevel-scaled range (so the orb can high-roll or low-roll within tier).
function _egRerollImplicits(item) {
    if (!item || !Array.isArray(item.implicits) || item.implicits.length === 0) return item;
    const reqLevel = (item.requirements && item.requirements.level) || item.itemLevel || 1;
    const newImplicits = item.implicits.map(imp => {
        const fam = EG_IMPLICIT_FAMILIES[imp.familyId];
        if (!fam) return imp;
        const rolledStats = _egBuildImplicitRolledStats(fam, reqLevel);
        return { ...imp, rolledStats, reqLevel };
    });
    return { ...item, implicits: newImplicits };
}

// Helper for tooltip merging — returns merged implicit lines (like _egBuildMergedModLines but for implicits)
function _egBuildMergedImplicitLines(implicits) {
    // Reuse the same merging logic as explicit mods when available
    if (typeof _egBuildMergedModLines === 'function' && Array.isArray(implicits) && implicits.length) {
        // Map implicits to pseudo-mods so the merger can handle them; tag them as implicit for styling
        return _egBuildMergedModLines(implicits.map(i => ({ ...i, isImplicit: true })));
    }
    // Fallback simple
    const out = [];
    (implicits || []).forEach(imp => {
        (imp.rolledStats || []).forEach(s => {
            if (s && s.label) out.push({ label: s.label, downside: false, tierLabel: 'Implicit', contributions: [{ type:'implicit', tier:'I'}] });
        });
    });
    return out;
}

// Heals a legacy item that was saved before implicits existed: generates implicits
// from its baseId/requirements when none are present. Returns the healed item.
function _egHealItemImplicits(item) {
    if (!item || item.category !== 'equip' || item.isUnique) return item;
    if (Array.isArray(item.implicits) && item.implicits.length > 0) return item;
    try {
        if (typeof _egRollImplicitsForBase !== 'function') return item;
        let base = null;
        if (typeof EG_ALL_BASE_TYPES !== 'undefined' && Array.isArray(EG_ALL_BASE_TYPES) && item.baseId) {
            base = EG_ALL_BASE_TYPES.find(b => b.id === item.baseId) || null;
        }
        if (!base) {
            // synthesize a minimal base from item itself
            base = { slotType: item.slotType || 'head', requirements: item.requirements || { level: item.itemLevel || 1 }, defenses: item.defenses || {}, minLevel: (item.requirements && item.requirements.level) || 1 };
        }
        const implicits = _egRollImplicitsForBase(base);
        if (implicits && implicits.length) item.implicits = implicits;
        else if (!Array.isArray(item.implicits)) item.implicits = [];
    } catch (e) { if (!Array.isArray(item.implicits)) item.implicits = []; }
    return item;
}
