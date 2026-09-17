//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Slot-type -> default emoji, used on the grid overlay and in the stash.
// Individual base types can override this via an `icon` field.

//-------------------ENDGAME EQUIPMENT BASE ITEMS-------------------------
//------------------------------------------------------------------------
// Defines all equipment base types in the game, grouped by slot.
// Base types have NO affixes - they are raw templates. Affixes (modifiers
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
// Enforced on every equip/unequip path by endgame-requirements.js
// (self-carrying allowed - attribute totals include gear bonuses).
//
// ENTRY POINT:
//   _egGenerateEquipmentDrop(monsterLevel = 1)
//   → picks a random base type appropriate for the given level,
//     wraps it into a full item object, and returns it.
//
// ADDING NEW BASE TYPES:
//   Push a new entry into the appropriate EG_BASE_TYPES_* array.
//   No other files need changing - the generator samples all arrays.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------ICONS PER SLOT---------------------------------------
//------------------------------------------------------------------------
// Maps each slotType to the default emoji used on the grid overlay and in
// the stash. Individual base types can override this via an `icon` field
// (e.g. axes get 🪓 instead of the generic sword).
export const EG_SLOT_ICONS = {
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
    shield: '🛡️',
    ranged: '🏹',
};
