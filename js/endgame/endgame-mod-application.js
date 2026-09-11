//  endgame-mod-application.js
//  Extracted from endgame-equipment-generator.js 2026-09-11 (Pass 6).
//  Owns everything that TURNS ROLLED MODS INTO A FINISHED ITEM:
//    - local-defense-mod restriction (_egFamilyAllowedOnBase)
//    - tier pool / weighted pick / mod assembly (_egEligibleTiers, _egPickTier,
//      _egRollInt, _egIsHybrid, _egBuildRolledStats, _egBuildModPool,
//      _egPickModFromPool, _egRollMods)
//    - item naming (_egBuildItemName + dictionaries). The naming code existed
//      twice in generator.js; the duplicate (which read the dictionary in the
//      wrong slot order) was deleted — this is the documented correct version.
//
//  Load order: after endgame-mod-name-words.js and all EG_MOD_TABLE_* files,
//  before endgame-equipment-generator.js. External users of these helpers
//  (crafting-bench / currency / essences / maps / player-stats) call them at
//  runtime only, so tag order only matters for the generator itself.
//
//------------------------------------------------------------------------
//-------------------LOCAL DEFENSE MOD RESTRICTION------------------------
//------------------------------------------------------------------------
// Local defense mods (armour / evasion / absorption) may only roll on base
// items that actually HAVE the stat — a "30% increased Armour" mod on an
// evasion-only base would be meaningless. Hybrid families count as local
// for every defense stat they touch, so hybrid_armour_evasion requires the
// base to have BOTH armour and evasion.
const EG_LOCAL_DEFENSE_FAMILY_STATS = {
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
function _egFamilyAllowedOnBase(familyId, defenses) {
    const needed = EG_LOCAL_DEFENSE_FAMILY_STATS[familyId];
    if (!needed) return true;
    if (!defenses) return false;
    return needed.every(stat => (defenses[stat] || 0) > 0);
}


//------------------------------------------------------------------------
//-------------------ELIGIBLE TIER POOL-----------------------------------
//------------------------------------------------------------------------
// For one mod family (e.g. flat_health), returns the subset of tiers whose
// ilvl requirement is met by itemLevel, as weighted entries.

function _egEligibleTiers(family, itemLevel) {
    return family.tiers.filter(t => t.ilvl <= itemLevel);
}


//------------------------------------------------------------------------
//-------------------WEIGHTED TIER PICKER---------------------------------
//------------------------------------------------------------------------
// Picks one tier from an array of tier objects using their .weight field.

function _egPickTier(tiers) {
    if (!tiers || tiers.length === 0) return null;
    const total = tiers.reduce((s, t) => s + t.weight, 0);
    let roll = Math.random() * total;
    for (const tier of tiers) {
        roll -= tier.weight;
        if (roll <= 0) return tier;
    }
    return tiers[tiers.length - 1];
}


//------------------------------------------------------------------------
//-------------------VALUE ROLLER-----------------------------------------
//------------------------------------------------------------------------
// Rolls an integer in [min, max] inclusive.

function _egRollInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}


//------------------------------------------------------------------------
//-------------------HYBRID DETECTOR--------------------------------------
//------------------------------------------------------------------------
// A mod family is hybrid when its tiers use min1/max1 + min2/max2.

function _egIsHybrid(tier) {
    // Dual-value mods are detected by the presence of a second range (min2).
    // Historical tables used `min`/`min2` (shield_bash, arcane_surge, channel)
    // while newer hybrids use `min1`/`min2`; treat either as hybrid so '#' and
    // '@' placeholders both get replaced.
    return tier.min2 !== undefined || tier.min1 !== undefined;
}


//------------------------------------------------------------------------
//-------------------STAT LINE BUILDER------------------------------------
//------------------------------------------------------------------------
// Given a mod family object and a rolled tier, builds the .rolledStats array.
//
// Your label convention:
//   single-stat  → '#' is the placeholder
//   hybrid       → '#' for first stat, '@' for second stat
//                  lines are separated by '\n' in the label string

function _egBuildRolledStats(family, tier) {
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


//------------------------------------------------------------------------
//-------------------MOD POOL BUILDER-------------------------------------
//------------------------------------------------------------------------
// Builds the pool of (familyId → { family, eligibleTiers }) entries
// that are available for this roll, excluding families already chosen.

function _egBuildModPool(modSection, itemLevel, chosenFamilyIds, defenses) {
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


//------------------------------------------------------------------------
//-------------------POOL WEIGHTED PICKER---------------------------------
//------------------------------------------------------------------------
// Picks one entry from the pool.  Weight = sum of eligible tier weights
// for that family (higher-ilvl items get access to rarer tiers, so the
// effective weight of a family shifts upward — this is intentional).

function _egPickModFromPool(pool) {
    if (pool.length === 0) return null;
    // Each pool entry contributes the weight of its BEST (lowest-tier-number)
    // eligible tier, so that higher-tier items feel meaningfully different.
    // Alternatively use total weight across tiers — both are defensible.
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


//------------------------------------------------------------------------
//-------------------MOD ASSEMBLER----------------------------------------
//------------------------------------------------------------------------
// Rolls prefixCount prefixes and suffixCount suffixes from the slot's mod table.
// Returns an array of resolved mod objects ready to attach to the item.

function _egRollMods(prefixCount, suffixCount, modTable, itemLevel, defenses) {
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


//------------------------------------------------------------------------
//-------------------ITEM NAME BUILDER------------------------------------
//------------------------------------------------------------------------
// common   → base name only
// uncommon → proper-language affix naming (see below)
// rare/epic→ random two-word name from EG_RARE_NAME_WORDS_* (PoE-style);
//            the base type stays visible via .baseName on the item
//
// Uncommon items use EG_MOD_NAME_WORDS (endgame-mod-tables.js), which
// provides grammatical name parts per mod family:
//   [enAdjective, enOfPhrase, deGenitive]
// EN: adjective before the noun + "of ..." after it
//     e.g. "Healthy Leather Cap of Vitality"
// DE: genitive post-position instead of inflected adjectives
//     e.g. "Lederkappe des Lebens und der Rüstung"

function _egModNameEntry(familyId) {
    return (typeof EG_MOD_NAME_WORDS !== 'undefined') ? EG_MOD_NAME_WORDS[familyId] : null;
}

// Fallback when a family has no dictionary entry: title-case the familyId,
// stripping generic segments ("flat_hybrid_map").
function _egModFallbackWord(familyId) {
    return familyId
        .split('_')
        .filter(w => !['flat', 'inc', 'hybrid', 'map'].includes(w))
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

// EN adjective for the prefix position, e.g. "Healthy".
function _egModAdjective(familyId) {
    const entry = _egModNameEntry(familyId);
    return entry ? entry[0] : _egModFallbackWord(familyId);
}

// EN "of ..." phrase for the suffix position, e.g. "of Vitality".
function _egModOfPhrase(familyId) {
    const entry = _egModNameEntry(familyId);
    return entry ? entry[1] : 'of ' + _egModFallbackWord(familyId);
}

// DE genitive post-position phrase, e.g. "des Lebens" / "der Rüstung".
function _egModDeGenitive(familyId) {
    const entry = _egModNameEntry(familyId);
    return entry ? entry[2] : 'des ' + _egModFallbackWord(familyId);
}

function _egBuildItemName(baseName, rarity, mods) {
    if (rarity === 'common' || mods.length === 0) return baseName;

    // rare/epic: PoE-style random two-word name ("Doom Bane").
    if (rarity === 'rare' || rarity === 'epic') return _egPickRareItemName();

    const prefixes = mods.filter(m => m.type === 'prefix');
    const suffixes = mods.filter(m => m.type === 'suffix');
    const pre = prefixes.length > 0 ? prefixes[0].familyId : null;
    const suf = suffixes.length > 0 ? suffixes[0].familyId : null;
    if (!pre && !suf) return baseName;

    if (LANG === 'de') {
        // German puts descriptors after the noun: "Lederkappe des Lebens".
        // With both affixes they are joined: "... des Lebens und des Feuers".
        const parts = [];
        if (pre) parts.push(_egModDeGenitive(pre));
        if (suf) parts.push(_egModDeGenitive(suf));
        return `${baseName} ${parts.join(' und ')}`;
    }

    const preStr = pre ? _egModAdjective(pre) + ' ' : '';
    const sufStr = suf ? ' ' + _egModOfPhrase(suf) : '';
    return `${preStr}${baseName}${sufStr}`.trim();
}


//------------------------------------------------------------------------
//-------------------RARE NAME DICTIONARIES-------------------------------
//------------------------------------------------------------------------
// PoE-style random names for rare/epic items: a word from the FIRST pool
// combined with a word from the SECOND pool, e.g. "Doom Bane".
// Each entry is [englishWord, germanWord]. The base type is still shown
// separately via .baseName, exactly like PoE handles rare names.

const EG_RARE_NAME_WORDS_FIRST = [
    ['Blood', 'Blut'],
    ['Storm', 'Sturm'],
    ['Ash', 'Asche'],
    ['Frost', 'Frost'],
    ['Doom', 'Verderben'],
    ['Grim', 'Grimm'],
    ['Shadow', 'Schatten'],
    ['Ember', 'Glut'],
    ['Thorn', 'Dorn'],
    ['Raven', 'Rabe'],
    ['Wolf', 'Wolf'],
    ['Iron', 'Eisen'],
    ['Bone', 'Knochen'],
    ['Mist', 'Nebel'],
    ['Sun', 'Sonne'],
    ['Moon', 'Mond'],
    ['Serpent', 'Schlange'],
    ['Veil', 'Schleier'],
    ['Hollow', 'Hohl'],
    ['Sorrow', 'Kummer'],
    ['Wrath', 'Zorn'],
    ['Gloom', 'Düster'],
    ['Pyre', 'Scheiterhaufen'],
    ['Wraith', 'Geist'],
    ['Dread', 'Schrecken'],
    ['Onyx', 'Onyx'],
    ['Crimson', 'Purpur'],
    ['Pale', 'Blass'],
    ['Silent', 'Still'],
];
const EG_RARE_NAME_WORDS_SECOND = [
    ['Bane', 'Fluch'],
    ['Song', 'Lied'],
    ['Grip', 'Griff'],
    ['Brand', 'Mal'],
    ['Coil', 'Ring'],
    ['Charm', 'Charm'],
    ['Whisper', 'Geflüster'],
    ['Howl', 'Heulen'],
    ['Seal', 'Siegel'],
    ['Crown', 'Krone'],
    ['Heart', 'Herz'],
    ['Edge', 'Klinge'],
    ['Call', 'Ruf'],
    ['Spark', 'Funke'],
    ['Shroud', 'Leichentuch'],
    ['Mark', 'Zeichen'],
    ['Knot', 'Knoten'],
    ['Wail', 'Klage'],
    ['Vow', 'Gelübde'],
    ['Sigil', 'Sigill'],
    ['Echo', 'Echo'],
    ['Tide', 'Flut'],
    ['Veil', 'Vorhang'],
    ['Bloom', 'Blüte'],
    ['Spire', 'Turm'],
    ['Shard', 'Scherbe'],
    ['Omen', 'Omen'],
    ['Wake', 'Wogen'],
    ['Gaze', 'Blick'],
    ['Maw', 'Rachen'],
];

function _egPickRareItemName() {
    const first = EG_RARE_NAME_WORDS_FIRST[Math.floor(Math.random() * EG_RARE_NAME_WORDS_FIRST.length)];
    const second = EG_RARE_NAME_WORDS_SECOND[Math.floor(Math.random() * EG_RARE_NAME_WORDS_SECOND.length)];
    return (LANG === 'de') ? `${first[1]} ${second[1]}` : `${first[0]} ${second[0]}`;
}
