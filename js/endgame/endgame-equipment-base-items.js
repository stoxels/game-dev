//------------------------------------------------------------------------
//-------------------ENDGAME EQUIPMENT BASE ITEMS-------------------------
//------------------------------------------------------------------------
// Defines all equipment base types in the game, grouped by slot.
// Base types have NO affixes — they are raw templates. Affixes (modifiers
// like +life, +damage, resistances) will be added by a separate crafting /
// loot-generation layer in a future step.
//
// STAT ARCHETYPES (determines primary defensive value + requirement skew):
//   strength  → flat Armour             (high Str req)
//   agility   → flat Evasion            (high Agi req)
//   intellect → flat Absorption         (high Int req)  [energy shield equivalent]
//   str_agi   → Armour + Evasion        (split Str/Agi req)
//   str_int   → Armour + Absorption     (split Str/Int req)
//   agi_int   → Evasion + Absorption    (split Agi/Int req)
//
// DEFENSIVE VALUES per base type represent the raw numbers at the item's
// minimum item level. A future scaling layer can multiply these by an
// ilvl factor when generating actual drops.
//
// REQUIREMENTS: Level, Str, Agi, Int. Values are set per base type.
// Items without a requirement for a stat have that stat set to 0.
// A future system will compare these against actual player stats.
//
// ENTRY POINT:
//   _egGenerateEquipmentDrop(monsterLevel = 1)
//   → picks a random base type appropriate for the given level,
//     wraps it into a full item object, and returns it.
//
// ADDING NEW BASE TYPES:
//   Push a new entry into the appropriate EG_BASE_TYPES_* array.
//   No other files need changing — the generator samples all arrays.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------ICONS PER SLOT---------------------------------------
//------------------------------------------------------------------------
// Maps each slotType to the emoji used on the grid overlay and in the stash.
const EG_SLOT_ICONS = {
    head: '👑',
    earring: '💎',
    amulet: '📿',
    shoulders: '🪶',
    cloak: '🧥',
    chest: '🥋',
    bracers: '🦾',
    gloves: '🧤',
    belt: '🔗',
    pants: '👖',
    boots: '👢',
    ring: '💍',
    arcane: '🔮',
    talisman: '🪬',
    weapon: '⚔️',
    ranged: '🏹',
};


//------------------------------------------------------------------------
//-------------------HELMET BASE TYPES------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_HEAD = [

    // ── Strength (Armour) ─────────────────────────────────────────────
    {
        id: 'helm_str_1', name: 'Sample Space Cap',
        archetype: 'strength', slotType: 'head',
        minLevel: 1,
        requirements: { level: 1, str: 14, agi: 0, int: 0 },
        defenses: { armour: 9, evasion: 0, absorption: 0 },
    },
    {
        id: 'helm_str_2', name: 'Deterministic Helm',
        archetype: 'strength', slotType: 'head',
        minLevel: 4,
        requirements: { level: 4, str: 28, agi: 0, int: 0 },
        defenses: { armour: 26, evasion: 0, absorption: 0 },
    },
    {
        id: 'helm_str_3', name: 'Hardened Variance Crest',
        archetype: 'strength', slotType: 'head',
        minLevel: 9,
        requirements: { level: 9, str: 46, agi: 0, int: 0 },
        defenses: { armour: 58, evasion: 0, absorption: 0 },
    },
    {
        id: 'helm_str_4', name: 'Absolute Certain Bascinet',
        archetype: 'strength', slotType: 'head',
        minLevel: 16,
        requirements: { level: 16, str: 68, agi: 0, int: 0 },
        defenses: { armour: 115, evasion: 0, absorption: 0 },
    },
    {
        id: 'helm_str_5', name: 'Null-Set Greathelm',
        archetype: 'strength', slotType: 'head',
        minLevel: 25,
        requirements: { level: 25, str: 95, agi: 0, int: 0 },
        defenses: { armour: 210, evasion: 0, absorption: 0 },
    },

    // ── Agility (Evasion) ─────────────────────────────────────────────
    {
        id: 'helm_agi_1', name: 'Confidence Interval Hood',
        archetype: 'agility', slotType: 'head',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 14, int: 0 },
        defenses: { armour: 0, evasion: 10, absorption: 0 },
    },
    {
        id: 'helm_agi_2', name: 'Evasive Prior Cowl',
        archetype: 'agility', slotType: 'head',
        minLevel: 4,
        requirements: { level: 4, str: 0, agi: 28, int: 0 },
        defenses: { armour: 0, evasion: 28, absorption: 0 },
    },
    {
        id: 'helm_agi_3', name: 'Stochastic Shadow Mask',
        archetype: 'agility', slotType: 'head',
        minLevel: 9,
        requirements: { level: 9, str: 0, agi: 46, int: 0 },
        defenses: { armour: 0, evasion: 64, absorption: 0 },
    },
    {
        id: 'helm_agi_4', name: 'Skewness Veil',
        archetype: 'agility', slotType: 'head',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 68, int: 0 },
        defenses: { armour: 0, evasion: 126, absorption: 0 },
    },
    {
        id: 'helm_agi_5', name: 'Outlier Phantom Crown',
        archetype: 'agility', slotType: 'head',
        minLevel: 25,
        requirements: { level: 25, str: 0, agi: 95, int: 0 },
        defenses: { armour: 0, evasion: 230, absorption: 0 },
    },

    // ── Intellect (Absorption) ────────────────────────────────────────
    {
        id: 'helm_int_1', name: 'Probability Circlet',
        archetype: 'intellect', slotType: 'head',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 14 },
        defenses: { armour: 0, evasion: 0, absorption: 8 },
    },
    {
        id: 'helm_int_2', name: 'Bayesian Diadem',
        archetype: 'intellect', slotType: 'head',
        minLevel: 4,
        requirements: { level: 4, str: 0, agi: 0, int: 28 },
        defenses: { armour: 0, evasion: 0, absorption: 22 },
    },
    {
        id: 'helm_int_3', name: 'Inference Corona',
        archetype: 'intellect', slotType: 'head',
        minLevel: 9,
        requirements: { level: 9, str: 0, agi: 0, int: 46 },
        defenses: { armour: 0, evasion: 0, absorption: 50 },
    },
    {
        id: 'helm_int_4', name: 'Null Hypothesis Mitre',
        archetype: 'intellect', slotType: 'head',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 0, int: 68 },
        defenses: { armour: 0, evasion: 0, absorption: 98 },
    },
    {
        id: 'helm_int_5', name: 'Eigenvalue Arcane Helm',
        archetype: 'intellect', slotType: 'head',
        minLevel: 25,
        requirements: { level: 25, str: 0, agi: 0, int: 95 },
        defenses: { armour: 0, evasion: 0, absorption: 180 },
    },

    // ── Str + Agi (Armour + Evasion) ──────────────────────────────────
    {
        id: 'helm_sa_1', name: 'Mixed Distribution Cap',
        archetype: 'str_agi', slotType: 'head',
        minLevel: 3,
        requirements: { level: 3, str: 16, agi: 16, int: 0 },
        defenses: { armour: 15, evasion: 15, absorption: 0 },
    },
    {
        id: 'helm_sa_2', name: 'Bivariate Bascinet',
        archetype: 'str_agi', slotType: 'head',
        minLevel: 11,
        requirements: { level: 11, str: 36, agi: 36, int: 0 },
        defenses: { armour: 56, evasion: 56, absorption: 0 },
    },
    {
        id: 'helm_sa_3', name: 'Covariance War Mask',
        archetype: 'str_agi', slotType: 'head',
        minLevel: 21,
        requirements: { level: 21, str: 58, agi: 58, int: 0 },
        defenses: { armour: 115, evasion: 115, absorption: 0 },
    },

    // ── Str + Int (Armour + Absorption) ───────────────────────────────
    {
        id: 'helm_si_1', name: 'Expected Value Casque',
        archetype: 'str_int', slotType: 'head',
        minLevel: 3,
        requirements: { level: 3, str: 16, agi: 0, int: 16 },
        defenses: { armour: 14, evasion: 0, absorption: 11 },
    },
    {
        id: 'helm_si_2', name: 'Markov Chain Helm',
        archetype: 'str_int', slotType: 'head',
        minLevel: 11,
        requirements: { level: 11, str: 36, agi: 0, int: 36 },
        defenses: { armour: 52, evasion: 0, absorption: 40 },
    },
    {
        id: 'helm_si_3', name: 'Convergence Greathelm',
        archetype: 'str_int', slotType: 'head',
        minLevel: 21,
        requirements: { level: 21, str: 58, agi: 0, int: 58 },
        defenses: { armour: 108, evasion: 0, absorption: 82 },
    },

    // ── Agi + Int (Evasion + Absorption) ──────────────────────────────
    {
        id: 'helm_ai_1', name: 'Residual Hood',
        archetype: 'agi_int', slotType: 'head',
        minLevel: 3,
        requirements: { level: 3, str: 0, agi: 16, int: 16 },
        defenses: { armour: 0, evasion: 14, absorption: 11 },
    },
    {
        id: 'helm_ai_2', name: 'Standard Error Cowl',
        archetype: 'agi_int', slotType: 'head',
        minLevel: 11,
        requirements: { level: 11, str: 0, agi: 36, int: 36 },
        defenses: { armour: 0, evasion: 52, absorption: 40 },
    },
    {
        id: 'helm_ai_3', name: 'Regression Phantom Veil',
        archetype: 'agi_int', slotType: 'head',
        minLevel: 21,
        requirements: { level: 21, str: 0, agi: 58, int: 58 },
        defenses: { armour: 0, evasion: 108, absorption: 82 },
    },
];



//------------------------------------------------------------------------
//-------------------EARRING BASE TYPES-----------------------------------
//------------------------------------------------------------------------
// Jewelry provides 0 base defenses, acting purely as affix carriers.
const EG_BASE_TYPES_EARRING = [
    {
        id: 'earring_1', name: 'Stud of the Mode',
        archetype: 'any', slotType: 'earring',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_2', name: 'Median Hoop',
        archetype: 'agility', slotType: 'earring',
        minLevel: 8,
        requirements: { level: 8, str: 0, agi: 20, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_3', name: 'Mean Drop',
        archetype: 'intellect', slotType: 'earring',
        minLevel: 15,
        requirements: { level: 15, str: 0, agi: 0, int: 40 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_4', name: 'Standard Error Earring',
        archetype: 'any', slotType: 'earring',
        minLevel: 23,
        requirements: { level: 23, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_5', name: 'Variance Gem',
        archetype: 'any', slotType: 'earring',
        minLevel: 30,
        requirements: { level: 30, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
];



//------------------------------------------------------------------------
//-------------------CHEST BASE TYPES-------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_CHEST = [

    // ── Strength ──────────────────────────────────────────────────────
    {
        id: 'chest_str_1', name: 'Crude Armour Plate',
        archetype: 'strength', slotType: 'chest',
        minLevel: 1,
        requirements: { level: 1, str: 16, agi: 0, int: 0 },
        defenses: { armour: 18, evasion: 0, absorption: 0 },
    },
    {
        id: 'chest_str_2', name: 'Inertia Hauberk',
        archetype: 'strength', slotType: 'chest',
        minLevel: 5,
        requirements: { level: 5, str: 32, agi: 0, int: 0 },
        defenses: { armour: 48, evasion: 0, absorption: 0 },
    },
    {
        id: 'chest_str_3', name: 'Rigid Body Cuirass',
        archetype: 'strength', slotType: 'chest',
        minLevel: 10,
        requirements: { level: 10, str: 52, agi: 0, int: 0 },
        defenses: { armour: 110, evasion: 0, absorption: 0 },
    },
    {
        id: 'chest_str_4', name: 'Deterministic Full Plate',
        archetype: 'strength', slotType: 'chest',
        minLevel: 18,
        requirements: { level: 18, str: 76, agi: 0, int: 0 },
        defenses: { armour: 220, evasion: 0, absorption: 0 },
    },
    {
        id: 'chest_str_5', name: 'Null-Set Fortress Armour',
        archetype: 'strength', slotType: 'chest',
        minLevel: 28,
        requirements: { level: 28, str: 108, agi: 0, int: 0 },
        defenses: { armour: 400, evasion: 0, absorption: 0 },
    },

    // ── Agility ───────────────────────────────────────────────────────
    {
        id: 'chest_agi_1', name: 'Sparse Matrix Doublet',
        archetype: 'agility', slotType: 'chest',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 16, int: 0 },
        defenses: { armour: 0, evasion: 20, absorption: 0 },
    },
    {
        id: 'chest_agi_2', name: 'Permutation Leather',
        archetype: 'agility', slotType: 'chest',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 32, int: 0 },
        defenses: { armour: 0, evasion: 54, absorption: 0 },
    },
    {
        id: 'chest_agi_3', name: 'Stochastic Scale Mail',
        archetype: 'agility', slotType: 'chest',
        minLevel: 10,
        requirements: { level: 10, str: 0, agi: 52, int: 0 },
        defenses: { armour: 0, evasion: 122, absorption: 0 },
    },
    {
        id: 'chest_agi_4', name: 'Skewed Distribution Vest',
        archetype: 'agility', slotType: 'chest',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 76, int: 0 },
        defenses: { armour: 0, evasion: 244, absorption: 0 },
    },
    {
        id: 'chest_agi_5', name: 'Outlier Shadow Raiment',
        archetype: 'agility', slotType: 'chest',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 108, int: 0 },
        defenses: { armour: 0, evasion: 445, absorption: 0 },
    },

    // ── Intellect ─────────────────────────────────────────────────────
    {
        id: 'chest_int_1', name: 'Probability Field Robe',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 16 },
        defenses: { armour: 0, evasion: 0, absorption: 16 },
    },
    {
        id: 'chest_int_2', name: 'Posterior Silk Garment',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 0, int: 32 },
        defenses: { armour: 0, evasion: 0, absorption: 44 },
    },
    {
        id: 'chest_int_3', name: 'Gaussian Weave Vestment',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 10,
        requirements: { level: 10, str: 0, agi: 0, int: 52 },
        defenses: { armour: 0, evasion: 0, absorption: 100 },
    },
    {
        id: 'chest_int_4', name: 'Conjugate Prior Regalia',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 0, int: 76 },
        defenses: { armour: 0, evasion: 0, absorption: 200 },
    },
    {
        id: 'chest_int_5', name: 'Eigenspace Arcane Mantle',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 0, int: 108 },
        defenses: { armour: 0, evasion: 0, absorption: 365 },
    },

    // ── Str + Agi ─────────────────────────────────────────────────────
    {
        id: 'chest_sa_1', name: 'Mixed-Sample Brigandine',
        archetype: 'str_agi', slotType: 'chest',
        minLevel: 3,
        requirements: { level: 3, str: 18, agi: 18, int: 0 },
        defenses: { armour: 28, evasion: 28, absorption: 0 },
    },
    {
        id: 'chest_sa_2', name: 'Bivariate Battle Coat',
        archetype: 'str_agi', slotType: 'chest',
        minLevel: 13,
        requirements: { level: 13, str: 42, agi: 42, int: 0 },
        defenses: { armour: 110, evasion: 110, absorption: 0 },
    },
    {
        id: 'chest_sa_3', name: 'Covariance War Plate',
        archetype: 'str_agi', slotType: 'chest',
        minLevel: 24,
        requirements: { level: 24, str: 68, agi: 68, int: 0 },
        defenses: { armour: 225, evasion: 225, absorption: 0 },
    },

    // ── Str + Int ─────────────────────────────────────────────────────
    {
        id: 'chest_si_1', name: 'Prior Probability Mail',
        archetype: 'str_int', slotType: 'chest',
        minLevel: 3,
        requirements: { level: 3, str: 18, agi: 0, int: 18 },
        defenses: { armour: 26, evasion: 0, absorption: 20 },
    },
    {
        id: 'chest_si_2', name: 'Recursive Plated Robe',
        archetype: 'str_int', slotType: 'chest',
        minLevel: 13,
        requirements: { level: 13, str: 42, agi: 0, int: 42 },
        defenses: { armour: 100, evasion: 0, absorption: 78 },
    },
    {
        id: 'chest_si_3', name: 'Stationary Process Armour',
        archetype: 'str_int', slotType: 'chest',
        minLevel: 24,
        requirements: { level: 24, str: 68, agi: 0, int: 68 },
        defenses: { armour: 206, evasion: 0, absorption: 160 },
    },

    // ── Agi + Int ─────────────────────────────────────────────────────
    {
        id: 'chest_ai_1', name: 'Residual Error Vest',
        archetype: 'agi_int', slotType: 'chest',
        minLevel: 3,
        requirements: { level: 3, str: 0, agi: 18, int: 18 },
        defenses: { armour: 0, evasion: 26, absorption: 20 },
    },
    {
        id: 'chest_ai_2', name: 'Standard Deviation Silk',
        archetype: 'agi_int', slotType: 'chest',
        minLevel: 13,
        requirements: { level: 13, str: 0, agi: 42, int: 42 },
        defenses: { armour: 0, evasion: 100, absorption: 78 },
    },
    {
        id: 'chest_ai_3', name: 'Kernel Density Raiment',
        archetype: 'agi_int', slotType: 'chest',
        minLevel: 24,
        requirements: { level: 24, str: 0, agi: 68, int: 68 },
        defenses: { armour: 0, evasion: 206, absorption: 160 },
    },
];


//------------------------------------------------------------------------
//-------------------GLOVES BASE TYPES------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_GLOVES = [

    // ── Strength ──────────────────────────────────────────────────────
    {
        id: 'gloves_str_1', name: 'Iron Frequency Gauntlets',
        archetype: 'strength', slotType: 'gloves',
        minLevel: 1,
        requirements: { level: 1, str: 12, agi: 0, int: 0 },
        defenses: { armour: 7, evasion: 0, absorption: 0 },
    },
    {
        id: 'gloves_str_2', name: 'Mode-Locked War Gauntlets',
        archetype: 'strength', slotType: 'gloves',
        minLevel: 7,
        requirements: { level: 7, str: 26, agi: 0, int: 0 },
        defenses: { armour: 26, evasion: 0, absorption: 0 },
    },
    {
        id: 'gloves_str_3', name: 'Variance-Forged Crushers',
        archetype: 'strength', slotType: 'gloves',
        minLevel: 16,
        requirements: { level: 16, str: 52, agi: 0, int: 0 },
        defenses: { armour: 68, evasion: 0, absorption: 0 },
    },
    {
        id: 'gloves_str_4', name: 'Deterministic Steel Fists',
        archetype: 'strength', slotType: 'gloves',
        minLevel: 26,
        requirements: { level: 26, str: 82, agi: 0, int: 0 },
        defenses: { armour: 132, evasion: 0, absorption: 0 },
    },

    // ── Agility ───────────────────────────────────────────────────────
    {
        id: 'gloves_agi_1', name: 'Permutation Leather Grips',
        archetype: 'agility', slotType: 'gloves',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 12, int: 0 },
        defenses: { armour: 0, evasion: 8, absorption: 0 },
    },
    {
        id: 'gloves_agi_2', name: 'Tail-Risk Fingerless Gloves',
        archetype: 'agility', slotType: 'gloves',
        minLevel: 7,
        requirements: { level: 7, str: 0, agi: 26, int: 0 },
        defenses: { armour: 0, evasion: 28, absorption: 0 },
    },
    {
        id: 'gloves_agi_3', name: 'Confidence Interval Wraps',
        archetype: 'agility', slotType: 'gloves',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 52, int: 0 },
        defenses: { armour: 0, evasion: 74, absorption: 0 },
    },
    {
        id: 'gloves_agi_4', name: 'Outlier Shadow Grasp',
        archetype: 'agility', slotType: 'gloves',
        minLevel: 26,
        requirements: { level: 26, str: 0, agi: 82, int: 0 },
        defenses: { armour: 0, evasion: 144, absorption: 0 },
    },

    // ── Intellect ─────────────────────────────────────────────────────
    {
        id: 'gloves_int_1', name: 'Posterior Probability Gloves',
        archetype: 'intellect', slotType: 'gloves',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 12 },
        defenses: { armour: 0, evasion: 0, absorption: 6 },
    },
    {
        id: 'gloves_int_2', name: 'Likelihood Ratio Mittens',
        archetype: 'intellect', slotType: 'gloves',
        minLevel: 7,
        requirements: { level: 7, str: 0, agi: 0, int: 26 },
        defenses: { armour: 0, evasion: 0, absorption: 20 },
    },
    {
        id: 'gloves_int_3', name: 'Conjugate Prior Hands',
        archetype: 'intellect', slotType: 'gloves',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 0, int: 52 },
        defenses: { armour: 0, evasion: 0, absorption: 54 },
    },
    {
        id: 'gloves_int_4', name: 'Stationary Kernel Gauntlets',
        archetype: 'intellect', slotType: 'gloves',
        minLevel: 26,
        requirements: { level: 26, str: 0, agi: 0, int: 82 },
        defenses: { armour: 0, evasion: 0, absorption: 106 },
    },

    // ── Str + Agi ─────────────────────────────────────────────────────
    {
        id: 'gloves_sa_1', name: 'Mixed-Sample Braceguards',
        archetype: 'str_agi', slotType: 'gloves',
        minLevel: 4,
        requirements: { level: 4, str: 14, agi: 14, int: 0 },
        defenses: { armour: 14, evasion: 14, absorption: 0 },
    },
    {
        id: 'gloves_sa_2', name: 'Bivariate Grip Plating',
        archetype: 'str_agi', slotType: 'gloves',
        minLevel: 18,
        requirements: { level: 18, str: 38, agi: 38, int: 0 },
        defenses: { armour: 62, evasion: 62, absorption: 0 },
    },

    // ── Str + Int ─────────────────────────────────────────────────────
    {
        id: 'gloves_si_1', name: 'Expected Value Fists',
        archetype: 'str_int', slotType: 'gloves',
        minLevel: 4,
        requirements: { level: 4, str: 14, agi: 0, int: 14 },
        defenses: { armour: 12, evasion: 0, absorption: 10 },
    },
    {
        id: 'gloves_si_2', name: 'Recursion Plated Mittens',
        archetype: 'str_int', slotType: 'gloves',
        minLevel: 18,
        requirements: { level: 18, str: 38, agi: 0, int: 38 },
        defenses: { armour: 52, evasion: 0, absorption: 42 },
    },

    // ── Agi + Int ─────────────────────────────────────────────────────
    {
        id: 'gloves_ai_1', name: 'Residual Shadow Wraps',
        archetype: 'agi_int', slotType: 'gloves',
        minLevel: 4,
        requirements: { level: 4, str: 0, agi: 14, int: 14 },
        defenses: { armour: 0, evasion: 12, absorption: 10 },
    },
    {
        id: 'gloves_ai_2', name: 'Density Estimate Fingers',
        archetype: 'agi_int', slotType: 'gloves',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 38, int: 38 },
        defenses: { armour: 0, evasion: 52, absorption: 42 },
    },
];


//------------------------------------------------------------------------
//-------------------BOOTS BASE TYPES-------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_BOOTS = [

    // ── Strength ──────────────────────────────────────────────────────
    {
        id: 'boots_str_1', name: 'Crude Iron Treads',
        archetype: 'strength', slotType: 'boots',
        minLevel: 1,
        requirements: { level: 1, str: 12, agi: 0, int: 0 },
        defenses: { armour: 8, evasion: 0, absorption: 0 },
    },
    {
        id: 'boots_str_2', name: 'Moment Flux Greaves',
        archetype: 'strength', slotType: 'boots',
        minLevel: 7,
        requirements: { level: 7, str: 24, agi: 0, int: 0 },
        defenses: { armour: 28, evasion: 0, absorption: 0 },
    },
    {
        id: 'boots_str_3', name: 'Variance-Plate Stompers',
        archetype: 'strength', slotType: 'boots',
        minLevel: 15,
        requirements: { level: 15, str: 48, agi: 0, int: 0 },
        defenses: { armour: 70, evasion: 0, absorption: 0 },
    },
    {
        id: 'boots_str_4', name: 'Null-Set Ironclad Boots',
        archetype: 'strength', slotType: 'boots',
        minLevel: 25,
        requirements: { level: 25, str: 78, agi: 0, int: 0 },
        defenses: { armour: 138, evasion: 0, absorption: 0 },
    },

    // ── Agility ───────────────────────────────────────────────────────
    {
        id: 'boots_agi_1', name: 'Sparse-Set Running Shoes',
        archetype: 'agility', slotType: 'boots',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 12, int: 0 },
        defenses: { armour: 0, evasion: 9, absorption: 0 },
    },
    {
        id: 'boots_agi_2', name: 'Stochastic Striders',
        archetype: 'agility', slotType: 'boots',
        minLevel: 7,
        requirements: { level: 7, str: 0, agi: 24, int: 0 },
        defenses: { armour: 0, evasion: 30, absorption: 0 },
    },
    {
        id: 'boots_agi_3', name: 'Random Walk Boots',
        archetype: 'agility', slotType: 'boots',
        minLevel: 15,
        requirements: { level: 15, str: 0, agi: 48, int: 0 },
        defenses: { armour: 0, evasion: 76, absorption: 0 },
    },
    {
        id: 'boots_agi_4', name: 'Critical Path Shadows',
        archetype: 'agility', slotType: 'boots',
        minLevel: 25,
        requirements: { level: 25, str: 0, agi: 78, int: 0 },
        defenses: { armour: 0, evasion: 150, absorption: 0 },
    },

    // ── Intellect ─────────────────────────────────────────────────────
    {
        id: 'boots_int_1', name: 'Probability Field Slippers',
        archetype: 'intellect', slotType: 'boots',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 12 },
        defenses: { armour: 0, evasion: 0, absorption: 7 },
    },
    {
        id: 'boots_int_2', name: 'Posterior Arcane Treads',
        archetype: 'intellect', slotType: 'boots',
        minLevel: 7,
        requirements: { level: 7, str: 0, agi: 0, int: 24 },
        defenses: { armour: 0, evasion: 0, absorption: 22 },
    },
    {
        id: 'boots_int_3', name: 'Eigenfunction Sabatons',
        archetype: 'intellect', slotType: 'boots',
        minLevel: 15,
        requirements: { level: 15, str: 0, agi: 0, int: 48 },
        defenses: { armour: 0, evasion: 0, absorption: 56 },
    },
    {
        id: 'boots_int_4', name: 'Convergence Series Boots',
        archetype: 'intellect', slotType: 'boots',
        minLevel: 25,
        requirements: { level: 25, str: 0, agi: 0, int: 78 },
        defenses: { armour: 0, evasion: 0, absorption: 110 },
    },

    // ── Str + Agi ─────────────────────────────────────────────────────
    {
        id: 'boots_sa_1', name: 'Bivariate War Boots',
        archetype: 'str_agi', slotType: 'boots',
        minLevel: 4,
        requirements: { level: 4, str: 14, agi: 14, int: 0 },
        defenses: { armour: 16, evasion: 16, absorption: 0 },
    },
    {
        id: 'boots_sa_2', name: 'Mixed Estimator Treads',
        archetype: 'str_agi', slotType: 'boots',
        minLevel: 19,
        requirements: { level: 19, str: 40, agi: 40, int: 0 },
        defenses: { armour: 70, evasion: 70, absorption: 0 },
    },

    // ── Str + Int ─────────────────────────────────────────────────────
    {
        id: 'boots_si_1', name: 'Markov Plated Boots',
        archetype: 'str_int', slotType: 'boots',
        minLevel: 4,
        requirements: { level: 4, str: 14, agi: 0, int: 14 },
        defenses: { armour: 14, evasion: 0, absorption: 11 },
    },
    {
        id: 'boots_si_2', name: 'Recursive Arcane Greaves',
        archetype: 'str_int', slotType: 'boots',
        minLevel: 19,
        requirements: { level: 19, str: 40, agi: 0, int: 40 },
        defenses: { armour: 62, evasion: 0, absorption: 48 },
    },

    // ── Agi + Int ─────────────────────────────────────────────────────
    {
        id: 'boots_ai_1', name: 'Residual Drift Slippers',
        archetype: 'agi_int', slotType: 'boots',
        minLevel: 4,
        requirements: { level: 4, str: 0, agi: 14, int: 14 },
        defenses: { armour: 0, evasion: 14, absorption: 11 },
    },
    {
        id: 'boots_ai_2', name: 'Tail Distribution Striders',
        archetype: 'agi_int', slotType: 'boots',
        minLevel: 19,
        requirements: { level: 19, str: 0, agi: 40, int: 40 },
        defenses: { armour: 0, evasion: 62, absorption: 48 },
    },
];


//------------------------------------------------------------------------
//-------------------BELT BASE TYPES--------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_BELT = [

    // ── Strength ──────────────────────────────────────────────────────
    {
        id: 'belt_str_1', name: 'Heavy Chain Estimator',
        archetype: 'strength', slotType: 'belt',
        minLevel: 1,
        requirements: { level: 1, str: 10, agi: 0, int: 0 },
        defenses: { armour: 5, evasion: 0, absorption: 0 },
    },
    {
        id: 'belt_str_2', name: 'Markov Chain Girdle',
        archetype: 'strength', slotType: 'belt',
        minLevel: 8,
        requirements: { level: 8, str: 26, agi: 0, int: 0 },
        defenses: { armour: 20, evasion: 0, absorption: 0 },
    },
    {
        id: 'belt_str_3', name: 'Variance-Plated Waistguard',
        archetype: 'strength', slotType: 'belt',
        minLevel: 18,
        requirements: { level: 18, str: 52, agi: 0, int: 0 },
        defenses: { armour: 52, evasion: 0, absorption: 0 },
    },
    {
        id: 'belt_str_4', name: 'Null-Hypothesis Sash',
        archetype: 'strength', slotType: 'belt',
        minLevel: 28,
        requirements: { level: 28, str: 82, agi: 0, int: 0 },
        defenses: { armour: 102, evasion: 0, absorption: 0 },
    },

    // ── Agility ───────────────────────────────────────────────────────
    {
        id: 'belt_agi_1', name: 'Thin-Tailed Strap',
        archetype: 'agility', slotType: 'belt',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 10, int: 0 },
        defenses: { armour: 0, evasion: 6, absorption: 0 },
    },
    {
        id: 'belt_agi_2', name: 'Permutation Cord',
        archetype: 'agility', slotType: 'belt',
        minLevel: 8,
        requirements: { level: 8, str: 0, agi: 26, int: 0 },
        defenses: { armour: 0, evasion: 22, absorption: 0 },
    },
    {
        id: 'belt_agi_3', name: 'Outlier Shadow Belt',
        archetype: 'agility', slotType: 'belt',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 52, int: 0 },
        defenses: { armour: 0, evasion: 58, absorption: 0 },
    },
    {
        id: 'belt_agi_4', name: 'Stochastic Evasion Sash',
        archetype: 'agility', slotType: 'belt',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 82, int: 0 },
        defenses: { armour: 0, evasion: 114, absorption: 0 },
    },

    // ── Intellect ─────────────────────────────────────────────────────
    {
        id: 'belt_int_1', name: 'Probability Strip',
        archetype: 'intellect', slotType: 'belt',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 10 },
        defenses: { armour: 0, evasion: 0, absorption: 5 },
    },
    {
        id: 'belt_int_2', name: 'Posterior Mana Girdle',
        archetype: 'intellect', slotType: 'belt',
        minLevel: 8,
        requirements: { level: 8, str: 0, agi: 0, int: 26 },
        defenses: { armour: 0, evasion: 0, absorption: 16 },
    },
    {
        id: 'belt_int_3', name: 'Gaussian Field Cinch',
        archetype: 'intellect', slotType: 'belt',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 0, int: 52 },
        defenses: { armour: 0, evasion: 0, absorption: 42 },
    },
    {
        id: 'belt_int_4', name: 'Eigenvector Arcane Sash',
        archetype: 'intellect', slotType: 'belt',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 0, int: 82 },
        defenses: { armour: 0, evasion: 0, absorption: 82 },
    },

    // ── Str + Agi ─────────────────────────────────────────────────────
    {
        id: 'belt_sa_1', name: 'Bivariate Studded Belt',
        archetype: 'str_agi', slotType: 'belt',
        minLevel: 5,
        requirements: { level: 5, str: 14, agi: 14, int: 0 },
        defenses: { armour: 10, evasion: 10, absorption: 0 },
    },
    {
        id: 'belt_sa_2', name: 'Covariance War Girdle',
        archetype: 'str_agi', slotType: 'belt',
        minLevel: 22,
        requirements: { level: 22, str: 44, agi: 44, int: 0 },
        defenses: { armour: 46, evasion: 46, absorption: 0 },
    },

    // ── Str + Int ─────────────────────────────────────────────────────
    {
        id: 'belt_si_1', name: 'Expected Value Plate Belt',
        archetype: 'str_int', slotType: 'belt',
        minLevel: 5,
        requirements: { level: 5, str: 14, agi: 0, int: 14 },
        defenses: { armour: 9, evasion: 0, absorption: 7 },
    },
    {
        id: 'belt_si_2', name: 'Posterior Plate Sash',
        archetype: 'str_int', slotType: 'belt',
        minLevel: 22,
        requirements: { level: 22, str: 44, agi: 0, int: 44 },
        defenses: { armour: 40, evasion: 0, absorption: 32 },
    },

    // ── Agi + Int ─────────────────────────────────────────────────────
    {
        id: 'belt_ai_1', name: 'Residual Shadow Cord',
        archetype: 'agi_int', slotType: 'belt',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 14, int: 14 },
        defenses: { armour: 0, evasion: 9, absorption: 7 },
    },
    {
        id: 'belt_ai_2', name: 'Kernel Flux Sash',
        archetype: 'agi_int', slotType: 'belt',
        minLevel: 22,
        requirements: { level: 22, str: 0, agi: 44, int: 44 },
        defenses: { armour: 0, evasion: 40, absorption: 32 },
    },
];


//------------------------------------------------------------------------
//-------------------WEAPON BASE TYPES------------------------------------
//------------------------------------------------------------------------
// Weapons currently have no defensive values.
// The `damage` object gives the base physical damage range (min / max).
// Sub-type determines icon and what slot it occupies.
//------------------------------------------------------------------------
const EG_BASE_TYPES_WEAPON = [

    // ── One-Handed Melee (slotType: weapon) ───────────────────────────
    {
        id: 'wpn_1h_1', name: 'Crude Probability Sword',
        archetype: 'strength', slotType: 'weapon',
        minLevel: 1,
        requirements: { level: 1, str: 14, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 4, max: 10 }, attacksPerSecond: 1.5,
    },
    {
        id: 'wpn_1h_2', name: 'Sample Variance Axe',
        archetype: 'strength', slotType: 'weapon',
        minLevel: 4,
        requirements: { level: 4, str: 28, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 12, max: 28 }, attacksPerSecond: 1.4,
    },
    {
        id: 'wpn_1h_3', name: 'Estimator War Sword',
        archetype: 'strength', slotType: 'weapon',
        minLevel: 10,
        requirements: { level: 10, str: 50, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 28, max: 58 }, attacksPerSecond: 1.3,
    },
    {
        id: 'wpn_1h_4', name: 'Null-Set Gladius',
        archetype: 'strength', slotType: 'weapon',
        minLevel: 19,
        requirements: { level: 19, str: 76, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 52, max: 108 }, attacksPerSecond: 1.3,
    },
    {
        id: 'wpn_1h_5', name: 'Singularity Spire',
        archetype: 'strength', slotType: 'weapon',
        minLevel: 29,
        requirements: { level: 29, str: 110, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 94, max: 192 }, attacksPerSecond: 1.2,
    },

    // ── Agility Melee (fast, lower damage) ────────────────────────────
    {
        id: 'wpn_agi_1', name: 'Residual Dagger',
        archetype: 'agility', slotType: 'weapon',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 14, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 3, max: 8 }, attacksPerSecond: 1.8,
    },
    {
        id: 'wpn_agi_2', name: 'Confidence Interval Blade',
        archetype: 'agility', slotType: 'weapon',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 28, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 10, max: 22 }, attacksPerSecond: 1.8,
    },
    {
        id: 'wpn_agi_3', name: 'Skewness Rapier',
        archetype: 'agility', slotType: 'weapon',
        minLevel: 12,
        requirements: { level: 12, str: 0, agi: 52, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 24, max: 48 }, attacksPerSecond: 1.7,
    },
    {
        id: 'wpn_agi_4', name: 'Critical Point Stiletto',
        archetype: 'agility', slotType: 'weapon',
        minLevel: 22,
        requirements: { level: 22, str: 0, agi: 80, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 46, max: 90 }, attacksPerSecond: 1.7,
    },

    // ── Intellect (Wands / Staves) ────────────────────────────────────
    {
        id: 'wpn_int_1', name: 'Posterior Wand',
        archetype: 'intellect', slotType: 'weapon',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 14 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 5, max: 11 }, attacksPerSecond: 1.6,
    },
    {
        id: 'wpn_int_2', name: 'Eigenvalue Staff',
        archetype: 'intellect', slotType: 'weapon',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 0, int: 28 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 14, max: 30 }, attacksPerSecond: 1.4,
    },
    {
        id: 'wpn_int_3', name: 'Markov Sceptre',
        archetype: 'intellect', slotType: 'weapon',
        minLevel: 12,
        requirements: { level: 12, str: 0, agi: 0, int: 52 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 32, max: 66 }, attacksPerSecond: 1.3,
    },
    {
        id: 'wpn_int_4', name: 'Gaussian Process Staff',
        archetype: 'intellect', slotType: 'weapon',
        minLevel: 22,
        requirements: { level: 22, str: 0, agi: 0, int: 80 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 60, max: 122 }, attacksPerSecond: 1.2,
    },

    // ── Two-Handed (high damage, slow) ────────────────────────────────
    {
        id: 'wpn_2h_1', name: 'Frequency Distribution Greatsword',
        archetype: 'strength', slotType: 'weapon',
        minLevel: 6,
        requirements: { level: 6, str: 36, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 18, max: 44 }, attacksPerSecond: 0.9,
    },
    {
        id: 'wpn_2h_2', name: 'Law of Large Numbers Maul',
        archetype: 'strength', slotType: 'weapon',
        minLevel: 15,
        requirements: { level: 15, str: 64, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 48, max: 110 }, attacksPerSecond: 0.85,
    },
    {
        id: 'wpn_2h_3', name: 'Central Limit Theorem Axe',
        archetype: 'strength', slotType: 'weapon',
        minLevel: 26,
        requirements: { level: 26, str: 102, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 98, max: 220 }, attacksPerSecond: 0.8,
    },
];


//------------------------------------------------------------------------
//-------------------SHIELD BASE TYPES------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_SHIELD = [

    // ── Strength ──────────────────────────────────────────────────────
    {
        id: 'shield_str_1', name: 'Crude Sample Buckler',
        archetype: 'strength', slotType: 'weapon',
        minLevel: 1,
        requirements: { level: 1, str: 12, agi: 0, int: 0 },
        defenses: { armour: 12, evasion: 0, absorption: 0 },
        blockChance: 24,
    },
    {
        id: 'shield_str_2', name: 'Estimator War Shield',
        archetype: 'strength', slotType: 'weapon',
        minLevel: 8,
        requirements: { level: 8, str: 32, agi: 0, int: 0 },
        defenses: { armour: 40, evasion: 0, absorption: 0 },
        blockChance: 26,
    },
    {
        id: 'shield_str_3', name: 'Moment Generating Bulwark',
        archetype: 'strength', slotType: 'weapon',
        minLevel: 18,
        requirements: { level: 18, str: 60, agi: 0, int: 0 },
        defenses: { armour: 96, evasion: 0, absorption: 0 },
        blockChance: 28,
    },
    {
        id: 'shield_str_4', name: 'Empirical Fortress Shield',
        archetype: 'strength', slotType: 'weapon',
        minLevel: 28,
        requirements: { level: 28, str: 96, agi: 0, int: 0 },
        defenses: { armour: 190, evasion: 0, absorption: 0 },
        blockChance: 30,
    },

    // ── Intellect (Absorption) ────────────────────────────────────────
    {
        id: 'shield_int_1', name: 'Probability Field Targe',
        archetype: 'intellect', slotType: 'weapon',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 12 },
        defenses: { armour: 0, evasion: 0, absorption: 10 },
        blockChance: 20,
    },
    {
        id: 'shield_int_2', name: 'Posterior Ward',
        archetype: 'intellect', slotType: 'weapon',
        minLevel: 8,
        requirements: { level: 8, str: 0, agi: 0, int: 32 },
        defenses: { armour: 0, evasion: 0, absorption: 34 },
        blockChance: 22,
    },
    {
        id: 'shield_int_3', name: 'Gaussian Resonance Aegis',
        archetype: 'intellect', slotType: 'weapon',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 0, int: 60 },
        defenses: { armour: 0, evasion: 0, absorption: 80 },
        blockChance: 24,
    },
    {
        id: 'shield_int_4', name: 'Null-Set Arcane Bastion',
        archetype: 'intellect', slotType: 'weapon',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 0, int: 96 },
        defenses: { armour: 0, evasion: 0, absorption: 156 },
        blockChance: 26,
    },
];


//------------------------------------------------------------------------
//-------------------RANGED WEAPON BASE TYPES-----------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_RANGED = [
    {
        id: 'ranged_1', name: 'Sparse Distribution Shortbow',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 14, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 4, max: 11 }, attacksPerSecond: 1.8,
    },
    {
        id: 'ranged_2', name: 'Normal Distribution Longbow',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 26, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 12, max: 28 }, attacksPerSecond: 1.6,
    },
    {
        id: 'ranged_3', name: 'Poisson Process Recurve',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 11,
        requirements: { level: 11, str: 0, agi: 46, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 28, max: 60 }, attacksPerSecond: 1.6,
    },
    {
        id: 'ranged_4', name: 'Confidence Band Composite',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 20,
        requirements: { level: 20, str: 0, agi: 72, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 52, max: 106 }, attacksPerSecond: 1.5,
    },
    {
        id: 'ranged_5', name: 'Maximum Likelihood Warbow',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 30,
        requirements: { level: 30, str: 0, agi: 104, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 96, max: 194 }, attacksPerSecond: 1.4,
    },
];


//------------------------------------------------------------------------
//-------------------RING BASE TYPES--------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_RING = [
    {
        id: 'ring_1', name: 'Crude Sample Ring',
        archetype: 'any', slotType: 'ring',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_2', name: 'Iron Loop of Frequency',
        archetype: 'strength', slotType: 'ring',
        minLevel: 5,
        requirements: { level: 5, str: 18, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_3', name: 'Band of Residual Error',
        archetype: 'agility', slotType: 'ring',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 18, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_4', name: 'Probability Signet',
        archetype: 'intellect', slotType: 'ring',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 0, int: 18 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_5', name: 'Covariance Band',
        archetype: 'str_agi', slotType: 'ring',
        minLevel: 12,
        requirements: { level: 12, str: 28, agi: 28, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_6', name: 'Loop of Standard Deviation',
        archetype: 'any', slotType: 'ring',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_7', name: 'Signet of the Outlier',
        archetype: 'any', slotType: 'ring',
        minLevel: 27,
        requirements: { level: 27, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
];


//------------------------------------------------------------------------
//-------------------AMULET BASE TYPES------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_AMULET = [
    {
        id: 'amulet_1', name: 'Crude Frequency Pendant',
        archetype: 'any', slotType: 'amulet',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_2', name: 'Necklace of Conditional Expectation',
        archetype: 'any', slotType: 'amulet',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_3', name: 'Bayesian Pendant',
        archetype: 'intellect', slotType: 'amulet',
        minLevel: 10,
        requirements: { level: 10, str: 0, agi: 0, int: 30 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_4', name: 'Chain of Central Tendency',
        archetype: 'strength', slotType: 'amulet',
        minLevel: 10,
        requirements: { level: 10, str: 30, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_5', name: 'Talisman of Convergence',
        archetype: 'any', slotType: 'amulet',
        minLevel: 20,
        requirements: { level: 20, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_6', name: 'Pendant of the Central Limit',
        archetype: 'any', slotType: 'amulet',
        minLevel: 30,
        requirements: { level: 30, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
];


//------------------------------------------------------------------------
//-------------------PANTS BASE TYPES-------------------------------------
//------------------------------------------------------------------------
// Pants have high defensive values, second only to Chest armor.
const EG_BASE_TYPES_PANTS = [
    // ── Strength ──────────────────────────────────────────────────────
    {
        id: 'pants_str_1', name: 'Axiom Greaves',
        archetype: 'strength', slotType: 'pants',
        minLevel: 1,
        requirements: { level: 1, str: 14, agi: 0, int: 0 },
        defenses: { armour: 15, evasion: 0, absorption: 0 },
    },
    {
        id: 'pants_str_2', name: 'Theorem Platelegs',
        archetype: 'strength', slotType: 'pants',
        minLevel: 6,
        requirements: { level: 6, str: 30, agi: 0, int: 0 },
        defenses: { armour: 40, evasion: 0, absorption: 0 },
    },
    {
        id: 'pants_str_3', name: 'Orthogonal Chausses',
        archetype: 'strength', slotType: 'pants',
        minLevel: 17,
        requirements: { level: 17, str: 72, agi: 0, int: 0 },
        defenses: { armour: 145, evasion: 0, absorption: 0 },
    },
    {
        id: 'pants_str_4', name: 'Matrix Ironlegs',
        archetype: 'strength', slotType: 'pants',
        minLevel: 26,
        requirements: { level: 26, str: 100, agi: 0, int: 0 },
        defenses: { armour: 310, evasion: 0, absorption: 0 },
    },

    // ── Agility ───────────────────────────────────────────────────────
    {
        id: 'pants_agi_1', name: 'Scatterplot Britches',
        archetype: 'agility', slotType: 'pants',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 14, int: 0 },
        defenses: { armour: 0, evasion: 16, absorption: 0 },
    },
    {
        id: 'pants_agi_2', name: 'Lognormal Leggings',
        archetype: 'agility', slotType: 'pants',
        minLevel: 6,
        requirements: { level: 6, str: 0, agi: 30, int: 0 },
        defenses: { armour: 0, evasion: 45, absorption: 0 },
    },
    {
        id: 'pants_agi_3', name: 'Heteroscedastic Trousers',
        archetype: 'agility', slotType: 'pants',
        minLevel: 17,
        requirements: { level: 17, str: 0, agi: 72, int: 0 },
        defenses: { armour: 0, evasion: 160, absorption: 0 },
    },
    {
        id: 'pants_agi_4', name: 'Asymptotic Shadowpants',
        archetype: 'agility', slotType: 'pants',
        minLevel: 26,
        requirements: { level: 26, str: 0, agi: 100, int: 0 },
        defenses: { armour: 0, evasion: 340, absorption: 0 },
    },

    // ── Intellect ─────────────────────────────────────────────────────
    {
        id: 'pants_int_1', name: 'Fractal Pantaloons',
        archetype: 'intellect', slotType: 'pants',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 14 },
        defenses: { armour: 0, evasion: 0, absorption: 12 },
    },
    {
        id: 'pants_int_2', name: 'Tensor Skirt',
        archetype: 'intellect', slotType: 'pants',
        minLevel: 6,
        requirements: { level: 6, str: 0, agi: 0, int: 30 },
        defenses: { armour: 0, evasion: 0, absorption: 35 },
    },
    {
        id: 'pants_int_3', name: 'Polynomial Robes',
        archetype: 'intellect', slotType: 'pants',
        minLevel: 17,
        requirements: { level: 17, str: 0, agi: 0, int: 72 },
        defenses: { armour: 0, evasion: 0, absorption: 125 },
    },
    {
        id: 'pants_int_4', name: 'Manifold Legwraps',
        archetype: 'intellect', slotType: 'pants',
        minLevel: 26,
        requirements: { level: 26, str: 0, agi: 0, int: 100 },
        defenses: { armour: 0, evasion: 0, absorption: 260 },
    },
];

//------------------------------------------------------------------------
//-------------------SHOULDERS BASE TYPES---------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_SHOULDERS = [
    {
        id: 'shoulders_str_1', name: 'Convex Spaulders',
        archetype: 'strength', slotType: 'shoulders',
        minLevel: 1,
        requirements: { level: 1, str: 22, agi: 0, int: 0 },
        defenses: { armour: 20, evasion: 0, absorption: 0 },
    },
    {
        id: 'shoulders_str_2', name: 'Isometric Pauldrons',
        archetype: 'strength', slotType: 'shoulders',
        minLevel: 16,
        requirements: { level: 16, str: 65, agi: 0, int: 0 },
        defenses: { armour: 110, evasion: 0, absorption: 0 },
    },
    {
        id: 'shoulders_agi_1', name: 'Tangent Pads',
        archetype: 'agility', slotType: 'shoulders',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 22, int: 0 },
        defenses: { armour: 0, evasion: 24, absorption: 0 },
    },
    {
        id: 'shoulders_agi_2', name: 'Spline Epaulets',
        archetype: 'agility', slotType: 'shoulders',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 65, int: 0 },
        defenses: { armour: 0, evasion: 125, absorption: 0 },
    },
    {
        id: 'shoulders_int_1', name: 'Homomorphism Shawl',
        archetype: 'intellect', slotType: 'shoulders',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 22 },
        defenses: { armour: 0, evasion: 0, absorption: 18 },
    },
    {
        id: 'shoulders_int_2', name: 'Isomorphism Shoulderguards',
        archetype: 'intellect', slotType: 'shoulders',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 0, int: 65 },
        defenses: { armour: 0, evasion: 0, absorption: 90 },
    },
];

//------------------------------------------------------------------------
//-------------------CLOAK BASE TYPES-------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_CLOAK = [
    {
        id: 'cloak_str_1', name: 'Heavy Distribution Cape',
        archetype: 'strength', slotType: 'cloak',
        minLevel: 1,
        requirements: { level: 1, str: 24, agi: 0, int: 0 },
        defenses: { armour: 25, evasion: 0, absorption: 0 },
    },
    {
        id: 'cloak_agi_1', name: 'Bernoulli Mantle',
        archetype: 'agility', slotType: 'cloak',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 24, int: 0 },
        defenses: { armour: 0, evasion: 28, absorption: 0 },
    },
    {
        id: 'cloak_int_1', name: 'P-Value Drape',
        archetype: 'intellect', slotType: 'cloak',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 24 },
        defenses: { armour: 0, evasion: 0, absorption: 22 },
    },
    {
        id: 'cloak_any_1', name: 'Chi-Square Wrap',
        archetype: 'str_agi', slotType: 'cloak',
        minLevel: 17,
        requirements: { level: 17, str: 45, agi: 45, int: 0 },
        defenses: { armour: 70, evasion: 70, absorption: 0 },
    },
    {
        id: 'cloak_any_2', name: 'Z-Score Cloak',
        archetype: 'agi_int', slotType: 'cloak',
        minLevel: 17,
        requirements: { level: 17, str: 0, agi: 45, int: 45 },
        defenses: { armour: 0, evasion: 70, absorption: 55 },
    },
];

//------------------------------------------------------------------------
//-------------------BRACERS BASE TYPES-----------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_BRACERS = [
    {
        id: 'bracers_str_1', name: 'Scalar Vambraces',
        archetype: 'strength', slotType: 'bracers',
        minLevel: 1,
        requirements: { level: 1, str: 18, agi: 0, int: 0 },
        defenses: { armour: 12, evasion: 0, absorption: 0 },
    },
    {
        id: 'bracers_str_2', name: 'Determinant Armguards',
        archetype: 'strength', slotType: 'bracers',
        minLevel: 20,
        requirements: { level: 20, str: 70, agi: 0, int: 0 },
        defenses: { armour: 85, evasion: 0, absorption: 0 },
    },
    {
        id: 'bracers_agi_1', name: 'Covariate Bindings',
        archetype: 'agility', slotType: 'bracers',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 18, int: 0 },
        defenses: { armour: 0, evasion: 14, absorption: 0 },
    },
    {
        id: 'bracers_agi_2', name: 'Parameter Cuffs',
        archetype: 'agility', slotType: 'bracers',
        minLevel: 20,
        requirements: { level: 20, str: 0, agi: 70, int: 0 },
        defenses: { armour: 0, evasion: 95, absorption: 0 },
    },
    {
        id: 'bracers_int_1', name: 'Coefficient Brace',
        archetype: 'intellect', slotType: 'bracers',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 18 },
        defenses: { armour: 0, evasion: 0, absorption: 10 },
    },
    {
        id: 'bracers_int_2', name: 'Intercept Wristbands',
        archetype: 'intellect', slotType: 'bracers',
        minLevel: 20,
        requirements: { level: 20, str: 0, agi: 0, int: 70 },
        defenses: { armour: 0, evasion: 0, absorption: 65 },
    },
];


//------------------------------------------------------------------------
//-------------------TALISMAN BASE TYPES----------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_TALISMAN = [
    {
        id: 'talisman_1', name: 'Markov Charm',
        archetype: 'any', slotType: 'talisman',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_2', name: 'Poisson Fetish',
        archetype: 'intellect', slotType: 'talisman',
        minLevel: 11,
        requirements: { level: 11, str: 0, agi: 0, int: 35 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_3', name: 'Bayes Relic',
        archetype: 'any', slotType: 'talisman',
        minLevel: 21,
        requirements: { level: 21, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_4', name: 'Monte Carlo Talisman',
        archetype: 'any', slotType: 'talisman',
        minLevel: 31,
        requirements: { level: 31, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
];

//------------------------------------------------------------------------
//-------------------ARCANE (OFF-HAND) BASE TYPES-------------------------
//------------------------------------------------------------------------
// Arcane items typically act as off-hand caster focuses (high Intellect).
// Depending on your mechanics, they could provide flat absorption or just carry stats.
const EG_BASE_TYPES_ARCANE = [
    {
        id: 'arcane_1', name: 'Orb of Regression',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 25 },
        defenses: { armour: 0, evasion: 0, absorption: 15 },
    },
    {
        id: 'arcane_2', name: 'Prism of Fourier',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 8,
        requirements: { level: 8, str: 0, agi: 0, int: 45 },
        defenses: { armour: 0, evasion: 0, absorption: 40 },
    },
    {
        id: 'arcane_3', name: 'Cipher of Laplace',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 0, int: 75 },
        defenses: { armour: 0, evasion: 0, absorption: 95 },
    },
    {
        id: 'arcane_4', name: 'Tome of Stochastics',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 0, int: 110 },
        defenses: { armour: 0, evasion: 0, absorption: 180 },
    },
];



//------------------------------------------------------------------------
//-------------------COMBINED BASE TYPE POOL------------------------------
//------------------------------------------------------------------------
// All base types in one flat array. The generator samples from this.
// To bias certain slot types to drop more often, repeat their entries
// or add per-slot weighting in _egGenerateEquipmentDrop below.
const EG_ALL_BASE_TYPES = [
    ...EG_BASE_TYPES_HEAD,
    ...EG_BASE_TYPES_CHEST,
    ...EG_BASE_TYPES_PANTS,
    ...EG_BASE_TYPES_SHOULDERS,
    ...EG_BASE_TYPES_CLOAK,
    ...EG_BASE_TYPES_BRACERS,
    ...EG_BASE_TYPES_GLOVES,
    ...EG_BASE_TYPES_BOOTS,
    ...EG_BASE_TYPES_BELT,
    ...EG_BASE_TYPES_WEAPON,
    ...EG_BASE_TYPES_SHIELD,
    ...EG_BASE_TYPES_ARCANE,
    ...EG_BASE_TYPES_RANGED,
    ...EG_BASE_TYPES_EARRING,
    ...EG_BASE_TYPES_RING,
    ...EG_BASE_TYPES_AMULET,
    ...EG_BASE_TYPES_TALISMAN,
];





//------------------------------------------------------------------------
//-------------------EQUIPMENT DROP GENERATOR-----------------------------
//------------------------------------------------------------------------
// _egGenerateEquipmentDrop(monsterLevel)
//
// Called by _egSpawnLootDrop() in endgame-grid-pickups.js whenever a
// monster dies and the drop-chance roll succeeds.
//
// Steps:
//   1. Filter the base type pool to entries whose minLevel ≤ monsterLevel.
//   2. Pick one uniformly at random.
//   3. Scale defensive values by ilvl.
//   4. Wrap into a full item object compatible with the hub stash / DnD system.
//
// Returns a plain item object; never returns null (falls back to the
// lowest-level item in the pool if nothing else qualifies).
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//-------------------EQUIPMENT DROP GENERATOR-----------------------------
//------------------------------------------------------------------------
function _egGenerateEquipmentDrop(monsterLevel = 1) {
    // Filter to base types the current monster level can drop.
    let eligible = EG_ALL_BASE_TYPES.filter(b => b.minLevel <= monsterLevel);

    // Fallback — should only trigger at ilvl 0 or if pool is misconfigured.
    if (eligible.length === 0) eligible = EG_ALL_BASE_TYPES;

    const base = eligible[Math.floor(Math.random() * eligible.length)];

    // Build the full item object.
    const item = {
        // Identity
        id: `${base.id}_${Date.now()}`,
        baseId: base.id,
        name: base.name,
        icon: EG_SLOT_ICONS[base.slotType] || '📦',
        // Classification
        category: 'equip',
        slotType: base.slotType,
        archetype: base.archetype,
        rarity: 'common',       // base drops are always Normal (white) rarity

        // Level & requirements
        itemLevel: monsterLevel, // We keep this so the item knows what level monster dropped it
        requirements: { ...base.requirements },

        // Defenses (Unscaled, raw copy from the base template)
        defenses: { ...base.defenses },

        // Weapons get their raw damage range attached as-is
        ...(base.damage ? { damage: { ...base.damage }, attacksPerSecond: base.attacksPerSecond } : {}),
        ...(base.blockChance ? { blockChance: base.blockChance } : {}),
    };

    return item;
}