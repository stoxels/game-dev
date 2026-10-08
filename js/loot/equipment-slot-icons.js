//------------------------------------------------------------------------
//-------------------SLOT ICONS-------------------------------------------
//------------------------------------------------------------------------
// The default emoji for each equipment slot, used on the grid overlay and in
// the stash when a base type does not set its own `icon` field.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
// CONSTANTS & STATE
//------------------------------------------------------------------------

// Slot type to default emoji. A base type overrides this with its own icon,
// e.g. axes get an axe instead of the generic sword.
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
