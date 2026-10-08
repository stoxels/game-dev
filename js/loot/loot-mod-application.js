import { LANG } from '../translation/translations.js';

//----------------------------------------------------------------------
//-------------------LOCAL DEFENSE MOD RESTRICTION----------------------
//----------------------------------------------------------------------

// Turns a slot's mod table into a finished set of rolled mods: the local-defense
// restriction, the eligible-tier pool, the weighted picks, the stat lines and
// the prefix/suffix assembler. Item naming lives in loot-mod-naming.js.

// Local defense mods (armour / evasion / absorption) may only roll on base
// items that actually HAVE the stat - a "30% increased Armour" mod on an
// evasion-only base would be meaningless. Hybrid families count as local
// for every defense stat they touch, so hybrid_armour_evasion requires the
// base to have BOTH armour and evasion.
export const EG_LOCAL_DEFENSE_FAMILY_STATS = {
    flat_armour: ['armour'],
    inc_armour: ['armour'],
    flat_evasion: ['evasion'],
    inc_evasion: ['evasion'],
    flat_absorption: ['absorption'],
    inc_absorption: ['absorption'],
    hybrid_life_armour: ['armour'],
    hybrid_mana_armour: ['armour'],
    hybrid_life_evasion: ['evasion'],
    hybrid_mana_evasion: ['evasion'],
    hybrid_life_absorption: ['absorption'],
    hybrid_mana_absorption: ['absorption'],
    hybrid_armour_evasion: ['armour', 'evasion'],
    hybrid_evasion_armour: ['armour', 'evasion'],
    hybrid_armour_absorption: ['armour', 'absorption'],
    hybrid_evasion_absorption: ['evasion', 'absorption'],
};

// Returns true when `familyId` is allowed to roll on a base with `defenses`.
// Families not listed here are always allowed.
export function _egFamilyAllowedOnBase(familyId, defenses) {
    const needed = EG_LOCAL_DEFENSE_FAMILY_STATS[familyId];
    if (!needed) return true;
    if (!defenses) return false;
    return needed.every(stat => (defenses[stat] || 0) > 0);
}


//----------------------------------------------------------------------
//-------------------ELIGIBLE TIER POOL---------------------------------
//----------------------------------------------------------------------
// For one mod family (e.g. flat_health), returns the subset of tiers whose
// ilvl requirement is met by itemLevel, as weighted entries.

export function _egEligibleTiers(family, itemLevel) {
    return family.tiers.filter(t => t.ilvl <= itemLevel);
}


//----------------------------------------------------------------------
//-------------------WEIGHTED TIER PICKER-------------------------------
//----------------------------------------------------------------------
// Picks one tier from an array of tier objects using their .weight field.

export function _egPickTier(tiers) {
    if (!tiers || tiers.length === 0) return null;
    const total = tiers.reduce((s, t) => s + t.weight, 0);
    let roll = Math.random() * total;
    for (const tier of tiers) {
        roll -= tier.weight;
        if (roll <= 0) return tier;
    }
    return tiers[tiers.length - 1];
}


//----------------------------------------------------------------------
//-------------------VALUE ROLLER---------------------------------------
//----------------------------------------------------------------------
// Rolls an integer in [min, max] inclusive.

export function _egRollInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}


//----------------------------------------------------------------------
//-------------------HYBRID DETECTOR------------------------------------
//----------------------------------------------------------------------
// A mod family is hybrid when its tiers use min1/max1 + min2/max2.

export function _egIsHybrid(tier) {
    // Dual-value mods are detected by the presence of a second range (min2).
    // Historical tables used `min`/`min2` (shield_bash, arcane_surge, channel)
    // while newer hybrids use `min1`/`min2`; treat either as hybrid so '#' and
    // '@' placeholders both get replaced.
    return tier.min2 !== undefined || tier.min1 !== undefined;
}


//----------------------------------------------------------------------
//-------------------STAT LINE BUILDER----------------------------------
//----------------------------------------------------------------------
// Given a mod family object and a rolled tier, builds the .rolledStats array.
//
// Your label convention:
//   single-stat  → '#' is the placeholder
//   hybrid       → '#' for first stat, '@' for second stat
//                  lines are separated by '\n' in the label string

export function _egBuildRolledStats(family, tier) {
    // Pick affix wording for the active language (falls back to EN).
    const label = (LANG === 'de' && family.labelDe) ? family.labelDe : family.label;

    if (_egIsHybrid(tier)) {
        const lines = label.split('\n');
        const lo1 = tier.min1 != null ? tier.min1 : tier.min;
        const hi1 = tier.max1 != null ? tier.max1 : tier.max;
        const val1 = _egRollInt(lo1, hi1);
        const val2 = _egRollInt(tier.min2, tier.max2);
        // NOTE: '#' must resolve to val1 and '@' to val2 on EVERY line.
        // Single-line hybrid labels ("Adds # to @ Fire Damage" or
        // "#% Chance to deal @ Physical Damage when Blocking") carry both
        // placeholders on one line; two-line hybrids carry one each.
        return [
            { key: family.id + '_1', label: (lines[0] || label).replace('#', val1).replace('@', val2), value: val1 },
            { key: family.id + '_2', label: (lines[1] || '').replace('#', val1).replace('@', val2), value: val2 },
        ];
    }

    // Single-stat mod
    const val = _egRollInt(tier.min, tier.max);
    return [
        { key: family.id, label: label.replace('#', val), value: val },
    ];
}


//----------------------------------------------------------------------
//-------------------MOD POOL BUILDER-----------------------------------
//----------------------------------------------------------------------
// Builds the pool of (familyId → { family, eligibleTiers }) entries
// that are available for this roll, excluding families already chosen.

export function _egBuildModPool(modSection, itemLevel, chosenFamilyIds, defenses) {
    const pool = [];
    for (const [familyId, family] of Object.entries(modSection)) {
        if (chosenFamilyIds.has(familyId)) continue;           // no duplicate families
        if (!_egFamilyAllowedOnBase(familyId, defenses)) continue; // local defense mods need the base stat
        const tiers = _egEligibleTiers(family, itemLevel);
        if (tiers.length === 0) continue;                      // none eligible at this ilvl
        pool.push({ familyId, family, tiers });
    }
    return pool;
}


//----------------------------------------------------------------------
//-------------------POOL WEIGHTED PICKER-------------------------------
//----------------------------------------------------------------------
// Picks one entry from the pool.  Weight = sum of eligible tier weights
// for that family (higher-ilvl items get access to rarer tiers, so the
// effective weight of a family shifts upward - this is intentional).

export function _egPickModFromPool(pool) {
    if (pool.length === 0) return null;
    // Each pool entry contributes the weight of its BEST (lowest-tier-number)
    // eligible tier, so that higher-tier items feel meaningfully different.
    // Alternatively use total weight across tiers - both are defensible.
    // We use the best eligible tier's weight to keep rare mods rare.
    const total = pool.reduce((s, e) => {
        const best = e.tiers.reduce((b, t) => t.tier < b.tier ? t : b, e.tiers[0]);
        return s + best.weight;
    }, 0);

    let roll = Math.random() * total;
    for (const entry of pool) {
        const best = entry.tiers.reduce((b, t) => t.tier < b.tier ? t : b, entry.tiers[0]);
        roll -= best.weight;
        if (roll <= 0) return entry;
    }
    return pool[pool.length - 1];
}


//----------------------------------------------------------------------
//-------------------MOD ASSEMBLER--------------------------------------
//----------------------------------------------------------------------
// Rolls prefixCount prefixes and suffixCount suffixes from the slot's mod table.
// Returns an array of resolved mod objects ready to attach to the item.

export function _egRollMods(prefixCount, suffixCount, modTable, itemLevel, defenses) {
    const chosen = [];
    const chosenFamilyIds = new Set();

    // ── Prefixes ──────────────────────────────────────────────────────
    const prefixSection = modTable.prefixes || {};
    for (let i = 0; i < prefixCount; i++) {
        const pool = _egBuildModPool(prefixSection, itemLevel, chosenFamilyIds, defenses);
        const entry = _egPickModFromPool(pool);
        if (!entry) break;

        const tier = _egPickTier(entry.tiers);
        if (!tier) break;

        chosenFamilyIds.add(entry.familyId);
        chosen.push({
            familyId: entry.familyId,
            type: 'prefix',
            tier: tier.tier,
            rolledStats: _egBuildRolledStats(entry.family, tier),
        });
    }

    // ── Suffixes ──────────────────────────────────────────────────────
    const suffixSection = modTable.suffixes || {};
    for (let i = 0; i < suffixCount; i++) {
        const pool = _egBuildModPool(suffixSection, itemLevel, chosenFamilyIds, defenses);
        const entry = _egPickModFromPool(pool);
        if (!entry) break;

        const tier = _egPickTier(entry.tiers);
        if (!tier) break;

        chosenFamilyIds.add(entry.familyId);
        chosen.push({
            familyId: entry.familyId,
            type: 'suffix',
            tier: tier.tier,
            rolledStats: _egBuildRolledStats(entry.family, tier),
        });
    }

    return chosen;
}
