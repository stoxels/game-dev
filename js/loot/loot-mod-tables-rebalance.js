//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Scales the three primary-attribute affixes down across every equipment
// table. For a level-100 character with 5 points, gear strength/agility/
// intelligence used to roll 43-50 on tier 1, about 60% of what a pure-stat
// build reaches. At 0.70 that is 30-35: gear supplements, never replaces.
const ATTRIBUTE_AFFIX_SCALE = 0.70;

// The only affix families this rebalance touches.
const ATTRIBUTE_AFFIX_FAMILIES = new Set(['strength', 'agility', 'intelligence']);

// Every equipment table to walk, named by the part of the table name that
// follows the EG_MOD_TABLE_ prefix.
const REBALANCED_TABLE_NAMES = [
    'HEAD', 'EARRING', 'AMULET', 'SHOULDERS', 'CLOAK', 'CHEST', 'BRACERS',
    'GLOVES', 'BELT', 'PANTS', 'BOOTS', 'RING', 'ARCANE', 'TALISMAN',
    'WEAPON1', 'WEAPON2', 'SHIELD', 'RANGED',
];

//------------------------------------------------------------------------
//-------------------ATTRIBUTE AFFIX REBALANCE----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Collects the equipment tables this module can reach by bare name and scales
// the attribute affix tiers inside them. Runs once at load time and mutates
// the tables in place, so each table stays defined in one place.

// KNOWN INERT: the lookup uses eval() on a bare name, which resolves against
// the global object. The tables are module exports, not published on
// globalThis, so every lookup throws and is swallowed, and no number changes.
// Real imports would activate a 30% affix nerf — a balance decision. Ledger.
(() => {
    const tables = [];
    for (const name of REBALANCED_TABLE_NAMES) {
        const key = 'EG_MOD_TABLE_' + name;
        try {
            const table = eval(key);
            if (table) tables.push(table);
        } catch (e) {
            // Name not reachable as a global — skip this table.
        }
    }

    for (const table of tables) {
        if (!table) continue;
        for (const section of [table.prefixes, table.suffixes]) {
            if (!section) continue;
            for (const [familyId, family] of Object.entries(section)) {
                if (!ATTRIBUTE_AFFIX_FAMILIES.has(familyId)) continue;
                for (const tier of (family.tiers || [])) {
                    if (tier.min != null) tier.min = Math.max(1, Math.round(tier.min * ATTRIBUTE_AFFIX_SCALE));
                    if (tier.max != null) tier.max = Math.max(tier.min || 1, Math.round(tier.max * ATTRIBUTE_AFFIX_SCALE));
                }
            }
        }
    }
})();
