//------------------------------------------------------------------------
//-------------------ENDGAME ITEM GENERATOR-------------------------------
//------------------------------------------------------------------------
// Overrides _egGenerateEquipmentDrop() from endgame-equipment-base-items.js.
// Load this file AFTER endgame-equipment-base-items.js and AFTER all
// EG_MOD_TABLE_* files.
//
// RARITY LADDER:
//   common   (white)  — 0 mods
//   uncommon (green)  — 1–2 mods  (max 1 prefix, max 1 suffix)
//   rare     (blue)   — 1–4 mods  (max 3 prefix, max 3 suffix)
//   epic     (purple) — 1–6 mods  (max 3 prefix, max 3 suffix)
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONFIGURATION----------------------------------------
//------------------------------------------------------------------------

const EG_ITEM_RARITY_TABLE = [
    { rarity: 'common', weight: 550 },
    { rarity: 'uncommon', weight: 290 },
    { rarity: 'rare', weight: 130 },
    { rarity: 'epic', weight: 60 },
];

const EG_MOD_CAPS = {
    common: { maxPre: 0, maxSuf: 0, maxTotal: 0 },
    uncommon: { maxPre: 1, maxSuf: 1, maxTotal: 2 },
    rare: { maxPre: 3, maxSuf: 3, maxTotal: 4 },
    epic: { maxPre: 3, maxSuf: 3, maxTotal: 6 },
};

// Maps every slotType value (from endgame-equipment-base-items.js) to its
// mod table.  weapon1/weapon2/ranged share separate tables because melee,
// off-hand, and ranged have different mod pools.
// NOTE: slotType 'weapon' covers both weapon1 and weapon2 slots; we map
// 'weapon' → WEAPON1 by default.  If you distinguish them by baseId prefix
// you can extend _egGetModTable() below.
const EG_SLOT_MOD_TABLE_MAP = {
    head: () => EG_MOD_TABLE_HEAD,
    earring: () => EG_MOD_TABLE_EARRING,
    amulet: () => EG_MOD_TABLE_AMULET,
    shoulders: () => EG_MOD_TABLE_SHOULDERS,
    cloak: () => EG_MOD_TABLE_CLOAK,
    chest: () => EG_MOD_TABLE_CHEST,
    bracers: () => EG_MOD_TABLE_BRACERS,
    gloves: () => EG_MOD_TABLE_GLOVES,
    belt: () => EG_MOD_TABLE_BELT,
    pants: () => EG_MOD_TABLE_PANTS,
    boots: () => EG_MOD_TABLE_BOOTS,
    ring: () => EG_MOD_TABLE_RING,
    arcane: () => EG_MOD_TABLE_ARCANE,
    talisman: () => EG_MOD_TABLE_TALISMAN,
    weapon: () => EG_MOD_TABLE_WEAPON1,   // melee + shields
    ranged: () => EG_MOD_TABLE_RANGED,
};


//------------------------------------------------------------------------
//-------------------MOD TABLE ACCESSOR-----------------------------------
//------------------------------------------------------------------------
// Returns the correct mod table object for a given base item.
// Extend the weapon branch here if you want shields to use WEAPON2.

function _egGetModTable(base) {
    const getter = EG_SLOT_MOD_TABLE_MAP[base.slotType];
    if (!getter) return null;
    try { return getter(); }
    catch (e) { return null; }  // table constant not yet defined — safe fallback
}


//------------------------------------------------------------------------
//-------------------RARITY ROLLER----------------------------------------
//------------------------------------------------------------------------

function _egRollRarity() {
    const total = EG_ITEM_RARITY_TABLE.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    for (const entry of EG_ITEM_RARITY_TABLE) {
        roll -= entry.weight;
        if (roll <= 0) return entry.rarity;
    }
    return 'common';
}


//------------------------------------------------------------------------
//-------------------MOD COUNT ROLLER-------------------------------------
//------------------------------------------------------------------------
// Returns { prefixCount, suffixCount } for the given rarity.

function _egRollModCounts(rarity) {
    const cap = EG_MOD_CAPS[rarity];
    if (!cap || cap.maxTotal === 0) return { prefixCount: 0, suffixCount: 0 };

    if (rarity === 'uncommon') {
        const roll = Math.random();
        if (roll < 0.34) return { prefixCount: 1, suffixCount: 0 };
        if (roll < 0.67) return { prefixCount: 0, suffixCount: 1 };
        return { prefixCount: 1, suffixCount: 1 };
    }

    // rare / epic: roll a total count in [1, maxTotal], then distribute
    const total = 1 + Math.floor(Math.random() * cap.maxTotal);
    let prefixCount = 0;
    let suffixCount = 0;
    for (let i = 0; i < total; i++) {
        const canPre = prefixCount < cap.maxPre;
        const canSuf = suffixCount < cap.maxSuf;
        if (canPre && canSuf) {
            if (Math.random() < 0.5) prefixCount++; else suffixCount++;
        } else if (canPre) {
            prefixCount++;
        } else {
            suffixCount++;
        }
    }
    return { prefixCount, suffixCount };
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
    return tier.min1 !== undefined;
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
        const val1 = _egRollInt(tier.min1, tier.max1);
        const val2 = _egRollInt(tier.min2, tier.max2);
        return [
            { key: family.id + '_1', label: (lines[0] || label).replace('#', val1).replace('@', val1), value: val1 },
            { key: family.id + '_2', label: (lines[1] || '').replace('#', val2).replace('@', val2), value: val2 },
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

function _egBuildModPool(modSection, itemLevel, chosenFamilyIds) {
    const pool = [];
    for (const [familyId, family] of Object.entries(modSection)) {
        if (chosenFamilyIds.has(familyId)) continue;           // no duplicate families
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

function _egRollMods(prefixCount, suffixCount, modTable, itemLevel) {
    const chosen = [];
    const chosenFamilyIds = new Set();

    // ── Prefixes ──────────────────────────────────────────────────────
    const prefixSection = modTable.prefixes || {};
    for (let i = 0; i < prefixCount; i++) {
        const pool = _egBuildModPool(prefixSection, itemLevel, chosenFamilyIds);
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
        const pool = _egBuildModPool(suffixSection, itemLevel, chosenFamilyIds);
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
// uncommon → first mod label word prepended or appended
// rare/epic → "(first prefix label-word) BaseName (first suffix label-word)"
//
// Because your mod entries have no separate display name we derive a short
// descriptor from the familyId by converting underscores to spaces and
// title-casing, e.g. "flat_health" → "Health", "fire_resist" → "Fire Resist".
// EG_MOD_NAME_WORDS (endgame-mod-tables.js) provides localized words:
//   [enWord, dePrefixWord, deGenitiveSuffix]

function _egModNameEntry(familyId) {
    return (typeof EG_MOD_NAME_WORDS !== 'undefined') ? EG_MOD_NAME_WORDS[familyId] : null;
}

function _egModDisplayWord(familyId) {
    const entry = _egModNameEntry(familyId);
    if (entry) return LANG === 'de' ? entry[1] : entry[0];
    return familyId
        .split('_')
        .filter(w => !['flat', 'inc', 'hybrid'].includes(w))   // strip generic prefixes
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

// Suffix connector for composed names: EN "of X", DE genitive "des/der X".
function _egModSuffixWord(familyId) {
    const entry = _egModNameEntry(familyId);
    if (!entry) return 'of ' + _egModDisplayWord(familyId);
    return LANG === 'de' ? entry[2] : 'of ' + entry[0];
}

function _egBuildItemName(baseName, rarity, mods) {
    if (rarity === 'common' || mods.length === 0) return baseName;

    const prefixes = mods.filter(m => m.type === 'prefix');
    const suffixes = mods.filter(m => m.type === 'suffix');

    const pre = prefixes.length > 0 ? _egModDisplayWord(prefixes[0].familyId) + ' ' : '';
    const suf = suffixes.length > 0 ? ' ' + _egModSuffixWord(suffixes[0].familyId) : '';
    return `${pre}${baseName}${suf}`.trim();
}


//------------------------------------------------------------------------
//-------------------MAIN DROP GENERATOR (OVERRIDE)-----------------------
//------------------------------------------------------------------------
// Signature matches the original in endgame-equipment-base-items.js.

function _egGenerateEquipmentDrop(monsterLevel = 1) {

    // ── 1. Pick base type ────────────────────────────────────────────
    let eligible = EG_ALL_BASE_TYPES.filter(b => b.minLevel <= monsterLevel);
    if (eligible.length === 0) eligible = EG_ALL_BASE_TYPES;
    const base = eligible[Math.floor(Math.random() * eligible.length)];

    // ── 2. Roll rarity ───────────────────────────────────────────────
    const rarity = _egRollRarity();

    // ── 3. Get the mod table for this slot ───────────────────────────
    const modTable = _egGetModTable(base);

    // ── 4. Roll mod counts ───────────────────────────────────────────
    const { prefixCount, suffixCount } = _egRollModCounts(rarity);

    // ── 5. Roll mods (skip if no table or common) ────────────────────
    const mods = (modTable && (prefixCount + suffixCount) > 0)
        ? _egRollMods(prefixCount, suffixCount, modTable, monsterLevel)
        : [];

    // ── 6. Build display name ────────────────────────────────────────
    const baseName = (LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
    const name = _egBuildItemName(baseName, rarity, mods);

    // ── 7. Assemble item object ──────────────────────────────────────
    return {
        id: `${base.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        baseId: base.id,
        name,
        baseName,
        icon: EG_SLOT_ICONS[base.slotType] || '📦',

        category: 'equip',
        slotType: base.slotType,
        archetype: base.archetype,
        rarity,

        itemLevel: monsterLevel,
        requirements: { ...base.requirements },
        defenses: { ...base.defenses },

        ...(base.damage ? { damage: { ...base.damage }, attacksPerSecond: base.attacksPerSecond } : {}),
        ...(base.blockChance ? { blockChance: base.blockChance } : {}),

        mods,
    };
}