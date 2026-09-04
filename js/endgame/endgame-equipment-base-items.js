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
// Enforced on every equip/unequip path by endgame-requirements.js
// (self-carrying allowed — attribute totals include gear bonuses).
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
// Maps each slotType to the default emoji used on the grid overlay and in
// the stash. Individual base types can override this via an `icon` field
// (e.g. axes get 🪓 instead of the generic sword).
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
    shield: '🛡️',
    ranged: '🏹',
};


//------------------------------------------------------------------------
//-------------------HELMET BASE TYPES------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_HEAD = [

    // ── Strength (Armour) ─────────────────────────────────────────────
    {
        id: 'helm_str_1', name: 'Leather Cap', nameDe: 'Lederkappe',
        archetype: 'strength', slotType: 'head',
        minLevel: 1,
        requirements: { level: 1, str: 14, agi: 0, int: 0 },
        defenses: { armour: 9, evasion: 0, absorption: 0 },
    },
    {
        id: 'helm_str_2', name: 'Iron Helm', nameDe: 'Eisenhelm',
        archetype: 'strength', slotType: 'head',
        minLevel: 4,
        requirements: { level: 4, str: 28, agi: 0, int: 0 },
        defenses: { armour: 26, evasion: 0, absorption: 0 },
    },
    {
        id: 'helm_str_3', name: 'Steel Sallet', nameDe: 'Stählerne Schappel',
        archetype: 'strength', slotType: 'head',
        minLevel: 9,
        requirements: { level: 9, str: 46, agi: 0, int: 0 },
        defenses: { armour: 58, evasion: 0, absorption: 0 },
    },
    {
        id: 'helm_str_4', name: 'Bascinet', nameDe: 'Beckenhaube',
        archetype: 'strength', slotType: 'head',
        minLevel: 16,
        requirements: { level: 16, str: 68, agi: 0, int: 0 },
        defenses: { armour: 115, evasion: 0, absorption: 0 },
    },
    {
        id: 'helm_str_5', name: 'Greathelm', nameDe: 'Großhelm',
        archetype: 'strength', slotType: 'head',
        minLevel: 25,
        requirements: { level: 25, str: 95, agi: 0, int: 0 },
        defenses: { armour: 210, evasion: 0, absorption: 0 },
    },

    // ── Agility (Evasion) ─────────────────────────────────────────────
    {
        id: 'helm_agi_1', name: 'Cloth Hood', nameDe: 'Stoffkapuze',
        archetype: 'agility', slotType: 'head',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 14, int: 0 },
        defenses: { armour: 0, evasion: 10, absorption: 0 },
    },
    {
        id: 'helm_agi_2', name: 'Leather Cowl', nameDe: 'Lederkapuze',
        archetype: 'agility', slotType: 'head',
        minLevel: 4,
        requirements: { level: 4, str: 0, agi: 28, int: 0 },
        defenses: { armour: 0, evasion: 28, absorption: 0 },
    },
    {
        id: 'helm_agi_3', name: 'Hunter\'s Hood', nameDe: 'Jägerkapuze',
        archetype: 'agility', slotType: 'head',
        minLevel: 9,
        requirements: { level: 9, str: 0, agi: 46, int: 0 },
        defenses: { armour: 0, evasion: 64, absorption: 0 },
    },
    {
        id: 'helm_agi_4', name: 'Silken Veil', nameDe: 'Seidenschleier',
        archetype: 'agility', slotType: 'head',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 68, int: 0 },
        defenses: { armour: 0, evasion: 126, absorption: 0 },
    },
    {
        id: 'helm_agi_5', name: 'Phantom Crown', nameDe: 'Phantomkrone',
        archetype: 'agility', slotType: 'head',
        minLevel: 25,
        requirements: { level: 25, str: 0, agi: 95, int: 0 },
        defenses: { armour: 0, evasion: 230, absorption: 0 },
    },

    // ── Intellect (Absorption) ────────────────────────────────────────
    {
        id: 'helm_int_1', name: 'Bronze Circlet', nameDe: 'Bronzereif',
        archetype: 'intellect', slotType: 'head',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 14 },
        defenses: { armour: 0, evasion: 0, absorption: 8 },
    },
    {
        id: 'helm_int_2', name: 'Silver Circlet', nameDe: 'Silberner Reif',
        archetype: 'intellect', slotType: 'head',
        minLevel: 4,
        requirements: { level: 4, str: 0, agi: 0, int: 28 },
        defenses: { armour: 0, evasion: 0, absorption: 22 },
    },
    {
        id: 'helm_int_3', name: 'Beaded Circlet', nameDe: 'Perlenreif',
        archetype: 'intellect', slotType: 'head',
        minLevel: 9,
        requirements: { level: 9, str: 0, agi: 0, int: 46 },
        defenses: { armour: 0, evasion: 0, absorption: 50 },
    },
    {
        id: 'helm_int_4', name: 'Bishop\'s Mitre', nameDe: 'Bischofsmitra',
        archetype: 'intellect', slotType: 'head',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 0, int: 68 },
        defenses: { armour: 0, evasion: 0, absorption: 98 },
    },
    {
        id: 'helm_int_5', name: 'Arcane Crown', nameDe: 'Arkankrone',
        archetype: 'intellect', slotType: 'head',
        minLevel: 25,
        requirements: { level: 25, str: 0, agi: 0, int: 95 },
        defenses: { armour: 0, evasion: 0, absorption: 180 },
    },

    // ── Str + Agi (Armour + Evasion) ──────────────────────────────────
    {
        id: 'helm_sa_1', name: 'Trapper Cap', nameDe: 'Fallenstellerkappe',
        archetype: 'str_agi', slotType: 'head',
        minLevel: 3,
        requirements: { level: 3, str: 16, agi: 16, int: 0 },
        defenses: { armour: 15, evasion: 15, absorption: 0 },
    },
    {
        id: 'helm_sa_2', name: 'Noble Bascinet', nameDe: 'Vornehme Beckenhaube',
        archetype: 'str_agi', slotType: 'head',
        minLevel: 11,
        requirements: { level: 11, str: 36, agi: 36, int: 0 },
        defenses: { armour: 56, evasion: 56, absorption: 0 },
    },
    {
        id: 'helm_sa_3', name: 'War Mask', nameDe: 'Kriegsmaske',
        archetype: 'str_agi', slotType: 'head',
        minLevel: 21,
        requirements: { level: 21, str: 58, agi: 58, int: 0 },
        defenses: { armour: 115, evasion: 115, absorption: 0 },
    },

    // ── Str + Int (Armour + Absorption) ───────────────────────────────
    {
        id: 'helm_si_1', name: 'Casque', nameDe: 'Kask',
        archetype: 'str_int', slotType: 'head',
        minLevel: 3,
        requirements: { level: 3, str: 16, agi: 0, int: 16 },
        defenses: { armour: 14, evasion: 0, absorption: 11 },
    },
    {
        id: 'helm_si_2', name: 'Knight Helm', nameDe: 'Ritterhelm',
        archetype: 'str_int', slotType: 'head',
        minLevel: 11,
        requirements: { level: 11, str: 36, agi: 0, int: 36 },
        defenses: { armour: 52, evasion: 0, absorption: 40 },
    },
    {
        id: 'helm_si_3', name: 'Crusader Greathelm', nameDe: 'Kreuzfahrer-Großhelm',
        archetype: 'str_int', slotType: 'head',
        minLevel: 21,
        requirements: { level: 21, str: 58, agi: 0, int: 58 },
        defenses: { armour: 108, evasion: 0, absorption: 82 },
    },

    // ── Agi + Int (Evasion + Absorption) ──────────────────────────────
    {
        id: 'helm_ai_1', name: 'Velvet Hood', nameDe: 'Samtkapuze',
        archetype: 'agi_int', slotType: 'head',
        minLevel: 3,
        requirements: { level: 3, str: 0, agi: 16, int: 16 },
        defenses: { armour: 0, evasion: 14, absorption: 11 },
    },
    {
        id: 'helm_ai_2', name: 'Sorcerer Cowl', nameDe: 'Magierkapuze',
        archetype: 'agi_int', slotType: 'head',
        minLevel: 11,
        requirements: { level: 11, str: 0, agi: 36, int: 36 },
        defenses: { armour: 0, evasion: 52, absorption: 40 },
    },
    {
        id: 'helm_ai_3', name: 'Phantom Veil', nameDe: 'Phantomschleier',
        archetype: 'agi_int', slotType: 'head',
        minLevel: 21,
        requirements: { level: 21, str: 0, agi: 58, int: 58 },
        defenses: { armour: 0, evasion: 108, absorption: 82 },
    },

    // ── Endgame: Strength ─────────────────────────────────────────────
    {
        id: 'helm_str_6', name: 'Ornate Greathelm', nameDe: 'Verzierter Großhelm',
        archetype: 'strength', slotType: 'head',
        minLevel: 40,
        requirements: { level: 40, str: 152, agi: 0, int: 0 },
        defenses: { armour: 360, evasion: 0, absorption: 0 },
    },
    {
        id: 'helm_str_7', name: 'Bulwark Helm', nameDe: 'Bollwerkhelm',
        archetype: 'strength', slotType: 'head',
        minLevel: 62,
        requirements: { level: 62, str: 238, agi: 0, int: 0 },
        defenses: { armour: 600, evasion: 0, absorption: 0 },
    },
    {
        id: 'helm_str_8', name: 'Titan Casque', nameDe: 'Titanenkask',
        archetype: 'strength', slotType: 'head',
        minLevel: 88,
        requirements: { level: 88, str: 338, agi: 0, int: 0 },
        defenses: { armour: 1000, evasion: 0, absorption: 0 },
    },

    // ── Endgame: Agility ──────────────────────────────────────────────
    {
        id: 'helm_agi_6', name: 'Shadowsewn Hood', nameDe: 'Schattengewirkte Kapuze',
        archetype: 'agility', slotType: 'head',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 152, int: 0 },
        defenses: { armour: 0, evasion: 395, absorption: 0 },
    },
    {
        id: 'helm_agi_7', name: 'Windrunner Cowl', nameDe: 'Windläuferkapuze',
        archetype: 'agility', slotType: 'head',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 238, int: 0 },
        defenses: { armour: 0, evasion: 660, absorption: 0 },
    },
    {
        id: 'helm_agi_8', name: 'Nightveil Crown', nameDe: 'Nachtschleierkrone',
        archetype: 'agility', slotType: 'head',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 338, int: 0 },
        defenses: { armour: 0, evasion: 1100, absorption: 0 },
    },

    // ── Endgame: Intellect ────────────────────────────────────────────
    {
        id: 'helm_int_6', name: 'Runic Diadem', nameDe: 'Runendiadem',
        archetype: 'intellect', slotType: 'head',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 152 },
        defenses: { armour: 0, evasion: 0, absorption: 310 },
    },
    {
        id: 'helm_int_7', name: 'Prophet\'s Circlet', nameDe: 'Reif des Propheten',
        archetype: 'intellect', slotType: 'head',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 0, int: 238 },
        defenses: { armour: 0, evasion: 0, absorption: 520 },
    },
    {
        id: 'helm_int_8', name: 'Archmage Crown', nameDe: 'Erzmagierkrone',
        archetype: 'intellect', slotType: 'head',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 0, int: 338 },
        defenses: { armour: 0, evasion: 0, absorption: 860 },
    },

    // ── Endgame: Hybrids ──────────────────────────────────────────────
    {
        id: 'helm_sa_4', name: 'Raider Warhelm', nameDe: 'Plünderer-Kriegshelm',
        archetype: 'str_agi', slotType: 'head',
        minLevel: 60,
        requirements: { level: 60, str: 166, agi: 166, int: 0 },
        defenses: { armour: 420, evasion: 420, absorption: 0 },
    },
    {
        id: 'helm_si_4', name: 'Sanctified Helm', nameDe: 'Geweihter Helm',
        archetype: 'str_int', slotType: 'head',
        minLevel: 60,
        requirements: { level: 60, str: 166, agi: 0, int: 166 },
        defenses: { armour: 400, evasion: 0, absorption: 305 },
    },
    {
        id: 'helm_ai_4', name: 'Aether Hood', nameDe: 'Ätherkapuze',
        archetype: 'agi_int', slotType: 'head',
        minLevel: 60,
        requirements: { level: 60, str: 0, agi: 166, int: 166 },
        defenses: { armour: 0, evasion: 400, absorption: 305 },
    },

    // ── Endgame II: Strength ──────────────────────────────────────────
    {
        id: 'helm_str_9', name: 'Warden Great Helm', nameDe: 'Wächter-Großhelm',
        archetype: 'strength', slotType: 'head',
        minLevel: 56,
        requirements: { level: 56, str: 212, agi: 0, int: 0 },
        defenses: { armour: 540, evasion: 0, absorption: 0 },
    },
    {
        id: 'helm_str_10', name: 'Doomward Great Helm', nameDe: 'Verdammnis-Großhelm',
        archetype: 'strength', slotType: 'head',
        minLevel: 66,
        requirements: { level: 66, str: 258, agi: 0, int: 0 },
        defenses: { armour: 680, evasion: 0, absorption: 0 },
    },

    // ── Endgame II: Agility ───────────────────────────────────────────
    {
        id: 'helm_agi_9', name: 'Veilwalker Hood', nameDe: 'Schleierwandler-Kapuze',
        archetype: 'agility', slotType: 'head',
        minLevel: 56,
        requirements: { level: 56, str: 0, agi: 212, int: 0 },
        defenses: { armour: 0, evasion: 595, absorption: 0 },
    },
    {
        id: 'helm_agi_10', name: 'Cowl of Silent Stars', nameDe: 'Kapuze der Schweigenden Sterne',
        archetype: 'agility', slotType: 'head',
        minLevel: 66,
        requirements: { level: 66, str: 0, agi: 258, int: 0 },
        defenses: { armour: 0, evasion: 750, absorption: 0 },
    },

    // ── Endgame II: Intellect ─────────────────────────────────────────
    {
        id: 'helm_int_9', name: 'Comet Circlet', nameDe: 'Kometenreif',
        archetype: 'intellect', slotType: 'head',
        minLevel: 56,
        requirements: { level: 56, str: 0, agi: 0, int: 212 },
        defenses: { armour: 0, evasion: 0, absorption: 465 },
    },
    {
        id: 'helm_int_10', name: 'Diadem of Deep Thought', nameDe: 'Diadem des Tiefen Denkens',
        archetype: 'intellect', slotType: 'head',
        minLevel: 66,
        requirements: { level: 66, str: 0, agi: 0, int: 258 },
        defenses: { armour: 0, evasion: 0, absorption: 585 },
    },
];



//------------------------------------------------------------------------
//-------------------EARRING BASE TYPES-----------------------------------
//------------------------------------------------------------------------
// Jewelry provides 0 base defenses, acting purely as affix carriers.
const EG_BASE_TYPES_EARRING = [
    {
        id: 'earring_1', name: 'Bronze Stud', nameDe: 'Bronze-Ohrstecker',
        archetype: 'any', slotType: 'earring',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_2', name: 'Silver Hoop', nameDe: 'Silber-Creole',
        archetype: 'agility', slotType: 'earring',
        minLevel: 8,
        requirements: { level: 8, str: 0, agi: 20, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_3', name: 'Pearl Drop', nameDe: 'Perlentropfen',
        archetype: 'intellect', slotType: 'earring',
        minLevel: 15,
        requirements: { level: 15, str: 0, agi: 0, int: 40 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_4', name: 'Gold Earring', nameDe: 'Goldener Ohrring',
        archetype: 'any', slotType: 'earring',
        minLevel: 23,
        requirements: { level: 23, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_5', name: 'Jeweled Earring', nameDe: 'Juwelenbesetzter Ohrring',
        archetype: 'any', slotType: 'earring',
        minLevel: 30,
        requirements: { level: 30, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_6', name: 'Obsidian Stud', nameDe: 'Obsidian-Ohrstecker',
        archetype: 'any', slotType: 'earring',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_7', name: 'Starlight Hoop', nameDe: 'Sternenlicht-Creole',
        archetype: 'any', slotType: 'earring',
        minLevel: 80,
        requirements: { level: 80, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    // ── Mid-game filler (35 – 70) ─────────────────────────────────────
    {
        id: 'earring_8', name: 'Gilded Stud', nameDe: 'Vergoldeter Ohrstecker',
        archetype: 'any', slotType: 'earring',
        minLevel: 35,
        requirements: { level: 35, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_9', name: 'Crystal Drop', nameDe: 'Kristalltropfen',
        archetype: 'intellect', slotType: 'earring',
        minLevel: 45,
        requirements: { level: 45, str: 0, agi: 0, int: 90 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_10', name: 'Moonstone Hoop', nameDe: 'Mondstein-Creole',
        archetype: 'agility', slotType: 'earring',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 120, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_11', name: 'Ruby Stud', nameDe: 'Rubin-Ohrstecker',
        archetype: 'strength', slotType: 'earring',
        minLevel: 60,
        requirements: { level: 60, str: 130, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_12', name: 'Sapphire Stud', nameDe: 'Saphir-Ohrstecker',
        archetype: 'intellect', slotType: 'earring',
        minLevel: 65,
        requirements: { level: 65, str: 0, agi: 0, int: 170 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_13', name: 'Emerald Hoop', nameDe: 'Smaragd-Creole',
        archetype: 'agility', slotType: 'earring',
        minLevel: 70,
        requirements: { level: 70, str: 0, agi: 190, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_14', name: 'Adamant Hoop', nameDe: 'Adamant-Creole',
        archetype: 'any', slotType: 'earring',
        minLevel: 75,
        requirements: { level: 75, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    // ── Endgame filler ─────────────────────────────────────────────────
    {
        id: 'earring_15', name: 'Astral Stud', nameDe: 'Astral-Ohrstecker',
        archetype: 'any', slotType: 'earring',
        minLevel: 85,
        requirements: { level: 85, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'earring_16', name: 'Void Earring', nameDe: 'Leerenohrring',
        archetype: 'any', slotType: 'earring',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
];



//------------------------------------------------------------------------
//-------------------CHEST BASE TYPES-------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_CHEST = [

    // ── Strength ──────────────────────────────────────────────────────
    {
        id: 'chest_str_1', name: 'Plate Vest', nameDe: 'Plattenweste',
        archetype: 'strength', slotType: 'chest',
        minLevel: 1,
        requirements: { level: 1, str: 16, agi: 0, int: 0 },
        defenses: { armour: 18, evasion: 0, absorption: 0 },
    },
    {
        id: 'chest_str_2', name: 'Chain Hauberk', nameDe: 'Kettenhemd',
        archetype: 'strength', slotType: 'chest',
        minLevel: 5,
        requirements: { level: 5, str: 32, agi: 0, int: 0 },
        defenses: { armour: 48, evasion: 0, absorption: 0 },
    },
    {
        id: 'chest_str_3', name: 'Steel Cuirass', nameDe: 'Stahlkürass',
        archetype: 'strength', slotType: 'chest',
        minLevel: 10,
        requirements: { level: 10, str: 52, agi: 0, int: 0 },
        defenses: { armour: 110, evasion: 0, absorption: 0 },
    },
    {
        id: 'chest_str_4', name: 'Full Plate', nameDe: 'Plattenrüstung',
        archetype: 'strength', slotType: 'chest',
        minLevel: 18,
        requirements: { level: 18, str: 76, agi: 0, int: 0 },
        defenses: { armour: 220, evasion: 0, absorption: 0 },
    },
    {
        id: 'chest_str_5', name: 'Fortress Plate', nameDe: 'Festungsplatte',
        archetype: 'strength', slotType: 'chest',
        minLevel: 28,
        requirements: { level: 28, str: 108, agi: 0, int: 0 },
        defenses: { armour: 400, evasion: 0, absorption: 0 },
    },

    // ── Agility ───────────────────────────────────────────────────────
    {
        id: 'chest_agi_1', name: 'Tattered Doublet', nameDe: 'Zerfetztes Wams',
        archetype: 'agility', slotType: 'chest',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 16, int: 0 },
        defenses: { armour: 0, evasion: 20, absorption: 0 },
    },
    {
        id: 'chest_agi_2', name: 'Leather Jerkin', nameDe: 'Lederwams',
        archetype: 'agility', slotType: 'chest',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 32, int: 0 },
        defenses: { armour: 0, evasion: 54, absorption: 0 },
    },
    {
        id: 'chest_agi_3', name: 'Scale Mail', nameDe: 'Schuppenpanzer',
        archetype: 'agility', slotType: 'chest',
        minLevel: 10,
        requirements: { level: 10, str: 0, agi: 52, int: 0 },
        defenses: { armour: 0, evasion: 122, absorption: 0 },
    },
    {
        id: 'chest_agi_4', name: 'Studded Leather', nameDe: 'Nietenleder',
        archetype: 'agility', slotType: 'chest',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 76, int: 0 },
        defenses: { armour: 0, evasion: 244, absorption: 0 },
    },
    {
        id: 'chest_agi_5', name: 'Shadow Garb', nameDe: 'Schattengewand',
        archetype: 'agility', slotType: 'chest',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 108, int: 0 },
        defenses: { armour: 0, evasion: 445, absorption: 0 },
    },

    // ── Intellect ─────────────────────────────────────────────────────
    {
        id: 'chest_int_1', name: 'Simple Robe', nameDe: 'Schlichte Robe',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 16 },
        // Starter gear: base absorption reduced by ~25% for balance.
        defenses: { armour: 0, evasion: 0, absorption: 12 },
    },
    {
        id: 'chest_int_2', name: 'Silk Robe', nameDe: 'Seidenrobe',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 0, int: 32 },
        defenses: { armour: 0, evasion: 0, absorption: 44 },
    },
    {
        id: 'chest_int_3', name: 'Scholar\'s Vestment', nameDe: 'Gelehrtenornat',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 10,
        requirements: { level: 10, str: 0, agi: 0, int: 52 },
        defenses: { armour: 0, evasion: 0, absorption: 100 },
    },
    {
        id: 'chest_int_4', name: 'Sage\'s Regalia', nameDe: 'Insignien des Weisen',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 0, int: 76 },
        defenses: { armour: 0, evasion: 0, absorption: 200 },
    },
    {
        id: 'chest_int_5', name: 'Arcane Mantle', nameDe: 'Arkanmantel',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 0, int: 108 },
        defenses: { armour: 0, evasion: 0, absorption: 365 },
    },

    // ── Str + Agi ─────────────────────────────────────────────────────
    {
        id: 'chest_sa_1', name: 'Brigandine', nameDe: 'Brigantine',
        archetype: 'str_agi', slotType: 'chest',
        minLevel: 3,
        requirements: { level: 3, str: 18, agi: 18, int: 0 },
        defenses: { armour: 28, evasion: 28, absorption: 0 },
    },
    {
        id: 'chest_sa_2', name: 'Battle Harness', nameDe: 'Kampfharnisch',
        archetype: 'str_agi', slotType: 'chest',
        minLevel: 13,
        requirements: { level: 13, str: 42, agi: 42, int: 0 },
        defenses: { armour: 110, evasion: 110, absorption: 0 },
    },
    {
        id: 'chest_sa_3', name: 'War Plate', nameDe: 'Kriegsplatte',
        archetype: 'str_agi', slotType: 'chest',
        minLevel: 24,
        requirements: { level: 24, str: 68, agi: 68, int: 0 },
        defenses: { armour: 225, evasion: 225, absorption: 0 },
    },

    // ── Str + Int ─────────────────────────────────────────────────────
    {
        id: 'chest_si_1', name: 'Ringmail', nameDe: 'Ringpanzer',
        archetype: 'str_int', slotType: 'chest',
        minLevel: 3,
        requirements: { level: 3, str: 18, agi: 0, int: 18 },
        defenses: { armour: 26, evasion: 0, absorption: 20 },
    },
    {
        id: 'chest_si_2', name: 'Plated Robe', nameDe: 'Plattenrobe',
        archetype: 'str_int', slotType: 'chest',
        minLevel: 13,
        requirements: { level: 13, str: 42, agi: 0, int: 42 },
        defenses: { armour: 100, evasion: 0, absorption: 78 },
    },
    {
        id: 'chest_si_3', name: 'Temple Armour', nameDe: 'Tempelrüstung',
        archetype: 'str_int', slotType: 'chest',
        minLevel: 24,
        requirements: { level: 24, str: 68, agi: 0, int: 68 },
        defenses: { armour: 206, evasion: 0, absorption: 160 },
    },

    // ── Agi + Int ─────────────────────────────────────────────────────
    {
        id: 'chest_ai_1', name: 'Silk Vest', nameDe: 'Seidenweste',
        archetype: 'agi_int', slotType: 'chest',
        minLevel: 3,
        requirements: { level: 3, str: 0, agi: 18, int: 18 },
        defenses: { armour: 0, evasion: 26, absorption: 20 },
    },
    {
        id: 'chest_ai_2', name: 'Conjurer\'s Silk', nameDe: 'Beschwörerseide',
        archetype: 'agi_int', slotType: 'chest',
        minLevel: 13,
        requirements: { level: 13, str: 0, agi: 42, int: 42 },
        defenses: { armour: 0, evasion: 100, absorption: 78 },
    },
    {
        id: 'chest_ai_3', name: 'Mystic Raiment', nameDe: 'Mystisches Gewand',
        archetype: 'agi_int', slotType: 'chest',
        minLevel: 24,
        requirements: { level: 24, str: 0, agi: 68, int: 68 },
        defenses: { armour: 0, evasion: 206, absorption: 160 },
    },

    // ── Endgame: Strength ─────────────────────────────────────────────
    {
        id: 'chest_str_6', name: 'Bastion Cuirass', nameDe: 'Bastionkürass',
        archetype: 'strength', slotType: 'chest',
        minLevel: 40,
        requirements: { level: 40, str: 155, agi: 0, int: 0 },
        defenses: { armour: 700, evasion: 0, absorption: 0 },
    },
    {
        id: 'chest_str_7', name: 'Adamant Plate', nameDe: 'Adamantplatte',
        archetype: 'strength', slotType: 'chest',
        minLevel: 62,
        requirements: { level: 62, str: 240, agi: 0, int: 0 },
        defenses: { armour: 1150, evasion: 0, absorption: 0 },
    },
    {
        id: 'chest_str_8', name: 'Colossus Plate', nameDe: 'Kolossplatte',
        archetype: 'strength', slotType: 'chest',
        minLevel: 88,
        requirements: { level: 88, str: 340, agi: 0, int: 0 },
        defenses: { armour: 1900, evasion: 0, absorption: 0 },
    },

    // ── Endgame: Agility ──────────────────────────────────────────────
    {
        id: 'chest_agi_6', name: 'Nightstalker Leather', nameDe: 'Nachtpirscherlederung',
        archetype: 'agility', slotType: 'chest',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 155, int: 0 },
        defenses: { armour: 0, evasion: 780, absorption: 0 },
    },
    {
        id: 'chest_agi_7', name: 'Spectral Jerkin', nameDe: 'Spektralwams',
        archetype: 'agility', slotType: 'chest',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 240, int: 0 },
        defenses: { armour: 0, evasion: 1290, absorption: 0 },
    },
    {
        id: 'chest_agi_8', name: 'Voidstalker Garb', nameDe: 'Leerenpirschergewand',
        archetype: 'agility', slotType: 'chest',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 340, int: 0 },
        defenses: { armour: 0, evasion: 2100, absorption: 0 },
    },

    // ── Endgame: Intellect ────────────────────────────────────────────
    {
        id: 'chest_int_6', name: 'Etherweave Robe', nameDe: 'Äthergewebe-Robe',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 155 },
        defenses: { armour: 0, evasion: 0, absorption: 640 },
    },
    {
        id: 'chest_int_7', name: 'Celestial Vestment', nameDe: 'Himmelsornat',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 0, int: 240 },
        defenses: { armour: 0, evasion: 0, absorption: 1060 },
    },
    {
        id: 'chest_int_8', name: 'Voidcloth Regalia', nameDe: 'Leerenstoff-Insignien',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 0, int: 340 },
        defenses: { armour: 0, evasion: 0, absorption: 1740 },
    },

    // ── Endgame: Hybrids ──────────────────────────────────────────────
    {
        id: 'chest_sa_4', name: 'Warlord Harness', nameDe: 'Kriegsfürstenharnisch',
        archetype: 'str_agi', slotType: 'chest',
        minLevel: 60,
        requirements: { level: 60, str: 170, agi: 170, int: 0 },
        defenses: { armour: 800, evasion: 800, absorption: 0 },
    },
    {
        id: 'chest_si_4', name: 'Consecrated Mail', nameDe: 'Geweihter Kettenpanzer',
        archetype: 'str_int', slotType: 'chest',
        minLevel: 60,
        requirements: { level: 60, str: 170, agi: 0, int: 170 },
        defenses: { armour: 730, evasion: 0, absorption: 570 },
    },
    {
        id: 'chest_ai_4', name: 'Whisperweave Silk', nameDe: 'Flüsterseide',
        archetype: 'agi_int', slotType: 'chest',
        minLevel: 60,
        requirements: { level: 60, str: 0, agi: 170, int: 170 },
        defenses: { armour: 0, evasion: 730, absorption: 570 },
    },

    // ── Endgame II: Strength ──────────────────────────────────────────
    {
        id: 'chest_str_9', name: 'Iron Bastion Plate', nameDe: 'Eiserne Bastionplatte',
        archetype: 'strength', slotType: 'chest',
        minLevel: 56,
        requirements: { level: 56, str: 216, agi: 0, int: 0 },
        defenses: { armour: 1050, evasion: 0, absorption: 0 },
    },
    {
        id: 'chest_str_10', name: 'Immortal Bulwark', nameDe: 'Unsterbliches Bollwerk',
        archetype: 'strength', slotType: 'chest',
        minLevel: 66,
        requirements: { level: 66, str: 264, agi: 0, int: 0 },
        defenses: { armour: 1320, evasion: 0, absorption: 0 },
    },

    // ── Endgame II: Agility ───────────────────────────────────────────
    {
        id: 'chest_agi_9', name: 'Mistdancer Jerkin', nameDe: 'Nebeltänzer-Wams',
        archetype: 'agility', slotType: 'chest',
        minLevel: 56,
        requirements: { level: 56, str: 0, agi: 216, int: 0 },
        defenses: { armour: 0, evasion: 1170, absorption: 0 },
    },
    {
        id: 'chest_agi_10', name: 'Garb of the Last Shadow', nameDe: 'Gewand des Letzten Schattens',
        archetype: 'agility', slotType: 'chest',
        minLevel: 66,
        requirements: { level: 66, str: 0, agi: 264, int: 0 },
        defenses: { armour: 0, evasion: 1470, absorption: 0 },
    },

    // ── Endgame II: Intellect ─────────────────────────────────────────
    {
        id: 'chest_int_9', name: 'Moonweave Vestment', nameDe: 'Mondgewebe-Ornat',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 56,
        requirements: { level: 56, str: 0, agi: 0, int: 216 },
        defenses: { armour: 0, evasion: 0, absorption: 960 },
    },
    {
        id: 'chest_int_10', name: 'Regalia of the Infinite Nexus', nameDe: 'Insignien des Unendlichen Nexus',
        archetype: 'intellect', slotType: 'chest',
        minLevel: 66,
        requirements: { level: 66, str: 0, agi: 0, int: 264 },
        defenses: { armour: 0, evasion: 0, absorption: 1210 },
    },
];


//------------------------------------------------------------------------
//-------------------GLOVES BASE TYPES------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_GLOVES = [

    // ── Strength ──────────────────────────────────────────────────────
    {
        id: 'gloves_str_1', name: 'Rusted Gauntlets', nameDe: 'Rostige Panzerhandschuhe',
        archetype: 'strength', slotType: 'gloves',
        minLevel: 1,
        requirements: { level: 1, str: 12, agi: 0, int: 0 },
        defenses: { armour: 7, evasion: 0, absorption: 0 },
    },
    {
        id: 'gloves_str_2', name: 'Iron Gauntlets', nameDe: 'Eiserne Panzerhandschuhe',
        archetype: 'strength', slotType: 'gloves',
        minLevel: 7,
        requirements: { level: 7, str: 26, agi: 0, int: 0 },
        defenses: { armour: 26, evasion: 0, absorption: 0 },
    },
    {
        id: 'gloves_str_3', name: 'War Gauntlets', nameDe: 'Kriegspanzerhandschuhe',
        archetype: 'strength', slotType: 'gloves',
        minLevel: 16,
        requirements: { level: 16, str: 52, agi: 0, int: 0 },
        defenses: { armour: 68, evasion: 0, absorption: 0 },
    },
    {
        id: 'gloves_str_4', name: 'Steel Gauntlets', nameDe: 'Stahlpanzerhandschuhe',
        archetype: 'strength', slotType: 'gloves',
        minLevel: 26,
        requirements: { level: 26, str: 82, agi: 0, int: 0 },
        defenses: { armour: 132, evasion: 0, absorption: 0 },
    },

    // ── Agility ───────────────────────────────────────────────────────
    {
        id: 'gloves_agi_1', name: 'Leather Gloves', nameDe: 'Lederhandschuhe',
        archetype: 'agility', slotType: 'gloves',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 12, int: 0 },
        defenses: { armour: 0, evasion: 8, absorption: 0 },
    },
    {
        id: 'gloves_agi_2', name: 'Poacher\'s Gloves', nameDe: 'Wildererhandschuhe',
        archetype: 'agility', slotType: 'gloves',
        minLevel: 7,
        requirements: { level: 7, str: 0, agi: 26, int: 0 },
        defenses: { armour: 0, evasion: 28, absorption: 0 },
    },
    {
        id: 'gloves_agi_3', name: 'Silken Wraps', nameDe: 'Seidenwickel',
        archetype: 'agility', slotType: 'gloves',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 52, int: 0 },
        defenses: { armour: 0, evasion: 74, absorption: 0 },
    },
    {
        id: 'gloves_agi_4', name: 'Assassin\'s Grip', nameDe: 'Griff des Assassins',
        archetype: 'agility', slotType: 'gloves',
        minLevel: 26,
        requirements: { level: 26, str: 0, agi: 82, int: 0 },
        defenses: { armour: 0, evasion: 144, absorption: 0 },
    },

    // ── Intellect ─────────────────────────────────────────────────────
    {
        id: 'gloves_int_1', name: 'Linen Mitts', nameDe: 'Leinenfäustlinge',
        archetype: 'intellect', slotType: 'gloves',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 12 },
        defenses: { armour: 0, evasion: 0, absorption: 6 },
    },
    {
        id: 'gloves_int_2', name: 'Wool Mittens', nameDe: 'Wollfäustlinge',
        archetype: 'intellect', slotType: 'gloves',
        minLevel: 7,
        requirements: { level: 7, str: 0, agi: 0, int: 26 },
        defenses: { armour: 0, evasion: 0, absorption: 20 },
    },
    {
        id: 'gloves_int_3', name: 'Scholar\'s Gloves', nameDe: 'Gelehrtenhandschuhe',
        archetype: 'intellect', slotType: 'gloves',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 0, int: 52 },
        defenses: { armour: 0, evasion: 0, absorption: 54 },
    },
    {
        id: 'gloves_int_4', name: 'Arcane Gauntlets', nameDe: 'Arkanpanzerhandschuhe',
        archetype: 'intellect', slotType: 'gloves',
        minLevel: 26,
        requirements: { level: 26, str: 0, agi: 0, int: 82 },
        defenses: { armour: 0, evasion: 0, absorption: 106 },
    },

    // ── Str + Agi ─────────────────────────────────────────────────────
    {
        id: 'gloves_sa_1', name: 'Braceguards', nameDe: 'Armschienen',
        archetype: 'str_agi', slotType: 'gloves',
        minLevel: 4,
        requirements: { level: 4, str: 14, agi: 14, int: 0 },
        defenses: { armour: 14, evasion: 14, absorption: 0 },
    },
    {
        id: 'gloves_sa_2', name: 'Plated Grips', nameDe: 'Gepanzerte Griffe',
        archetype: 'str_agi', slotType: 'gloves',
        minLevel: 18,
        requirements: { level: 18, str: 38, agi: 38, int: 0 },
        defenses: { armour: 62, evasion: 62, absorption: 0 },
    },

    // ── Str + Int ─────────────────────────────────────────────────────
    {
        id: 'gloves_si_1', name: 'Padded Fists', nameDe: 'Gepolsterte Fäuste',
        archetype: 'str_int', slotType: 'gloves',
        minLevel: 4,
        requirements: { level: 4, str: 14, agi: 0, int: 14 },
        defenses: { armour: 12, evasion: 0, absorption: 10 },
    },
    {
        id: 'gloves_si_2', name: 'Plated Mittens', nameDe: 'Plattenfäustlinge',
        archetype: 'str_int', slotType: 'gloves',
        minLevel: 18,
        requirements: { level: 18, str: 38, agi: 0, int: 38 },
        defenses: { armour: 52, evasion: 0, absorption: 42 },
    },

    // ── Agi + Int ─────────────────────────────────────────────────────
    {
        id: 'gloves_ai_1', name: 'Woven Wraps', nameDe: 'Gewebte Wickel',
        archetype: 'agi_int', slotType: 'gloves',
        minLevel: 4,
        requirements: { level: 4, str: 0, agi: 14, int: 14 },
        defenses: { armour: 0, evasion: 12, absorption: 10 },
    },
    {
        id: 'gloves_ai_2', name: 'Sorcerer\'s Fingers', nameDe: 'Fingerlinge des Magiers',
        archetype: 'agi_int', slotType: 'gloves',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 38, int: 38 },
        defenses: { armour: 0, evasion: 52, absorption: 42 },
    },

    // ── Endgame: Strength ─────────────────────────────────────────────
    {
        id: 'gloves_str_5', name: 'Fanged Gauntlets', nameDe: 'Reißzahn-Panzerhandschuhe',
        archetype: 'strength', slotType: 'gloves',
        minLevel: 40,
        requirements: { level: 40, str: 128, agi: 0, int: 0 },
        defenses: { armour: 230, evasion: 0, absorption: 0 },
    },
    {
        id: 'gloves_str_6', name: 'Siege Gauntlets', nameDe: 'Belagerungs-Panzerhandschuhe',
        archetype: 'strength', slotType: 'gloves',
        minLevel: 62,
        requirements: { level: 62, str: 200, agi: 0, int: 0 },
        defenses: { armour: 380, evasion: 0, absorption: 0 },
    },
    {
        id: 'gloves_str_7', name: 'Titan Grips', nameDe: 'Titangriffe',
        archetype: 'strength', slotType: 'gloves',
        minLevel: 88,
        requirements: { level: 88, str: 285, agi: 0, int: 0 },
        defenses: { armour: 620, evasion: 0, absorption: 0 },
    },

    // ── Endgame: Agility ──────────────────────────────────────────────
    {
        id: 'gloves_agi_5', name: 'Silkshadow Gloves', nameDe: 'Seidenschattenhandschuhe',
        archetype: 'agility', slotType: 'gloves',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 128, int: 0 },
        defenses: { armour: 0, evasion: 250, absorption: 0 },
    },
    {
        id: 'gloves_agi_6', name: 'Windstrike Gloves', nameDe: 'Windhieb-Handschuhe',
        archetype: 'agility', slotType: 'gloves',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 200, int: 0 },
        defenses: { armour: 0, evasion: 415, absorption: 0 },
    },
    {
        id: 'gloves_agi_7', name: 'Umbral Grips', nameDe: 'Schattengriffe',
        archetype: 'agility', slotType: 'gloves',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 285, int: 0 },
        defenses: { armour: 0, evasion: 680, absorption: 0 },
    },

    // ── Endgame: Intellect ────────────────────────────────────────────
    {
        id: 'gloves_int_5', name: 'Runebound Mitts', nameDe: 'Runengebundene Fäustlinge',
        archetype: 'intellect', slotType: 'gloves',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 128 },
        defenses: { armour: 0, evasion: 0, absorption: 185 },
    },
    {
        id: 'gloves_int_6', name: 'Astral Wraps', nameDe: 'Astralwickel',
        archetype: 'intellect', slotType: 'gloves',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 0, int: 200 },
        defenses: { armour: 0, evasion: 0, absorption: 305 },
    },
    {
        id: 'gloves_int_7', name: 'Voidtouched Mitts', nameDe: 'Leerenberührte Fäustlinge',
        archetype: 'intellect', slotType: 'gloves',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 0, int: 285 },
        defenses: { armour: 0, evasion: 0, absorption: 500 },
    },

    // ── Endgame: Hybrids ──────────────────────────────────────────────
    {
        id: 'gloves_sa_3', name: 'Skirmisher Grips', nameDe: 'Plänklergriffe',
        archetype: 'str_agi', slotType: 'gloves',
        minLevel: 60,
        requirements: { level: 60, str: 127, agi: 127, int: 0 },
        defenses: { armour: 220, evasion: 220, absorption: 0 },
    },
    {
        id: 'gloves_si_3', name: 'Zealot Mittens', nameDe: 'Eiferer-Fäustlinge',
        archetype: 'str_int', slotType: 'gloves',
        minLevel: 60,
        requirements: { level: 60, str: 127, agi: 0, int: 127 },
        defenses: { armour: 185, evasion: 0, absorption: 150 },
    },
    {
        id: 'gloves_ai_3', name: 'Mystic Grips', nameDe: 'Mystische Griffe',
        archetype: 'agi_int', slotType: 'gloves',
        minLevel: 60,
        requirements: { level: 60, str: 0, agi: 127, int: 127 },
        defenses: { armour: 0, evasion: 185, absorption: 150 },
    },

    // ── Endgame II: Strength ──────────────────────────────────────────
    {
        id: 'gloves_str_8', name: 'Ironfist Gauntlets', nameDe: 'Eisenfaust-Panzerhandschuhe',
        archetype: 'strength', slotType: 'gloves',
        minLevel: 52,
        requirements: { level: 52, str: 163, agi: 0, int: 0 },
        defenses: { armour: 300, evasion: 0, absorption: 0 },
    },
    {
        id: 'gloves_str_9', name: 'Doomfist Gauntlets', nameDe: 'Verdammnisfaust-Panzerhandschuhe',
        archetype: 'strength', slotType: 'gloves',
        minLevel: 66,
        requirements: { level: 66, str: 218, agi: 0, int: 0 },
        defenses: { armour: 430, evasion: 0, absorption: 0 },
    },

    // ── Endgame II: Agility ───────────────────────────────────────────
    {
        id: 'gloves_agi_8', name: 'Swiftstrike Gloves', nameDe: 'Flinkhieb-Handschuhe',
        archetype: 'agility', slotType: 'gloves',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 163, int: 0 },
        defenses: { armour: 0, evasion: 330, absorption: 0 },
    },
    {
        id: 'gloves_agi_9', name: 'Ghostgrip Gloves', nameDe: 'Geistgriff-Handschuhe',
        archetype: 'agility', slotType: 'gloves',
        minLevel: 66,
        requirements: { level: 66, str: 0, agi: 218, int: 0 },
        defenses: { armour: 0, evasion: 470, absorption: 0 },
    },

    // ── Endgame II: Intellect ─────────────────────────────────────────
    {
        id: 'gloves_int_8', name: 'Thoughtweave Mitts', nameDe: 'Gedankengewebe-Fäustlinge',
        archetype: 'intellect', slotType: 'gloves',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 0, int: 163 },
        defenses: { armour: 0, evasion: 0, absorption: 245 },
    },
    {
        id: 'gloves_int_9', name: 'Runeweave Mitts', nameDe: 'Runengewebe-Fäustlinge',
        archetype: 'intellect', slotType: 'gloves',
        minLevel: 66,
        requirements: { level: 66, str: 0, agi: 0, int: 218 },
        defenses: { armour: 0, evasion: 0, absorption: 350 },
    },
];


//------------------------------------------------------------------------
//-------------------BOOTS BASE TYPES-------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_BOOTS = [

    // ── Strength ──────────────────────────────────────────────────────
    {
        id: 'boots_str_1', name: 'Worn Sabatons', nameDe: 'Abgetragene Fußschienen',
        archetype: 'strength', slotType: 'boots',
        minLevel: 1,
        requirements: { level: 1, str: 12, agi: 0, int: 0 },
        defenses: { armour: 8, evasion: 0, absorption: 0 },
    },
    {
        id: 'boots_str_2', name: 'Iron Greaves', nameDe: 'Eiserne Beinschienen',
        archetype: 'strength', slotType: 'boots',
        minLevel: 7,
        requirements: { level: 7, str: 24, agi: 0, int: 0 },
        defenses: { armour: 28, evasion: 0, absorption: 0 },
    },
    {
        id: 'boots_str_3', name: 'Steel Sabatons', nameDe: 'Stählerne Fußschienen',
        archetype: 'strength', slotType: 'boots',
        minLevel: 15,
        requirements: { level: 15, str: 48, agi: 0, int: 0 },
        defenses: { armour: 70, evasion: 0, absorption: 0 },
    },
    {
        id: 'boots_str_4', name: 'Crusader Boots', nameDe: 'Kreuzfahrerstiefel',
        archetype: 'strength', slotType: 'boots',
        minLevel: 25,
        requirements: { level: 25, str: 78, agi: 0, int: 0 },
        defenses: { armour: 138, evasion: 0, absorption: 0 },
    },

    // ── Agility ───────────────────────────────────────────────────────
    {
        id: 'boots_agi_1', name: 'Soft Leather Shoes', nameDe: 'Weiche Lederschuhe',
        archetype: 'agility', slotType: 'boots',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 12, int: 0 },
        defenses: { armour: 0, evasion: 9, absorption: 0 },
    },
    {
        id: 'boots_agi_2', name: 'Hunter\'s Boots', nameDe: 'Jägerstiefel',
        archetype: 'agility', slotType: 'boots',
        minLevel: 7,
        requirements: { level: 7, str: 0, agi: 24, int: 0 },
        defenses: { armour: 0, evasion: 30, absorption: 0 },
    },
    {
        id: 'boots_agi_3', name: 'Scout\'s Boots', nameDe: 'Kundschafterstiefel',
        archetype: 'agility', slotType: 'boots',
        minLevel: 15,
        requirements: { level: 15, str: 0, agi: 48, int: 0 },
        defenses: { armour: 0, evasion: 76, absorption: 0 },
    },
    {
        id: 'boots_agi_4', name: 'Shadow Boots', nameDe: 'Schattenstiefel',
        archetype: 'agility', slotType: 'boots',
        minLevel: 25,
        requirements: { level: 25, str: 0, agi: 78, int: 0 },
        defenses: { armour: 0, evasion: 150, absorption: 0 },
    },

    // ── Intellect ─────────────────────────────────────────────────────
    {
        id: 'boots_int_1', name: 'Silk Slippers', nameDe: 'Seidenpantoffeln',
        archetype: 'intellect', slotType: 'boots',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 12 },
        defenses: { armour: 0, evasion: 0, absorption: 7 },
    },
    {
        id: 'boots_int_2', name: 'Scholar\'s Slippers', nameDe: 'Gelehrtenpantoffeln',
        archetype: 'intellect', slotType: 'boots',
        minLevel: 7,
        requirements: { level: 7, str: 0, agi: 0, int: 24 },
        defenses: { armour: 0, evasion: 0, absorption: 22 },
    },
    {
        id: 'boots_int_3', name: 'Arcane Sabatons', nameDe: 'Arkanfußschienen',
        archetype: 'intellect', slotType: 'boots',
        minLevel: 15,
        requirements: { level: 15, str: 0, agi: 0, int: 48 },
        defenses: { armour: 0, evasion: 0, absorption: 56 },
    },
    {
        id: 'boots_int_4', name: 'Sorcerer\'s Boots', nameDe: 'Magierstiefel',
        archetype: 'intellect', slotType: 'boots',
        minLevel: 25,
        requirements: { level: 25, str: 0, agi: 0, int: 78 },
        defenses: { armour: 0, evasion: 0, absorption: 110 },
    },

    // ── Str + Agi ─────────────────────────────────────────────────────
    {
        id: 'boots_sa_1', name: 'Studded Boots', nameDe: 'Nietenstiefel',
        archetype: 'str_agi', slotType: 'boots',
        minLevel: 4,
        requirements: { level: 4, str: 14, agi: 14, int: 0 },
        defenses: { armour: 16, evasion: 16, absorption: 0 },
    },
    {
        id: 'boots_sa_2', name: 'Cavalry Boots', nameDe: 'Kavalleriestiefel',
        archetype: 'str_agi', slotType: 'boots',
        minLevel: 19,
        requirements: { level: 19, str: 40, agi: 40, int: 0 },
        defenses: { armour: 70, evasion: 70, absorption: 0 },
    },

    // ── Str + Int ─────────────────────────────────────────────────────
    {
        id: 'boots_si_1', name: 'Templar Boots', nameDe: 'Templerstiefel',
        archetype: 'str_int', slotType: 'boots',
        minLevel: 4,
        requirements: { level: 4, str: 14, agi: 0, int: 14 },
        defenses: { armour: 14, evasion: 0, absorption: 11 },
    },
    {
        id: 'boots_si_2', name: 'Arcane Greaves', nameDe: 'Arkanbeinschienen',
        archetype: 'str_int', slotType: 'boots',
        minLevel: 19,
        requirements: { level: 19, str: 40, agi: 0, int: 40 },
        defenses: { armour: 62, evasion: 0, absorption: 48 },
    },

    // ── Agi + Int ─────────────────────────────────────────────────────
    {
        id: 'boots_ai_1', name: 'Woven Slippers', nameDe: 'Gewebte Pantoffeln',
        archetype: 'agi_int', slotType: 'boots',
        minLevel: 4,
        requirements: { level: 4, str: 0, agi: 14, int: 14 },
        defenses: { armour: 0, evasion: 14, absorption: 11 },
    },
    {
        id: 'boots_ai_2', name: 'Nomad\'s Boots', nameDe: 'Nomadenstiefel',
        archetype: 'agi_int', slotType: 'boots',
        minLevel: 19,
        requirements: { level: 19, str: 0, agi: 40, int: 40 },
        defenses: { armour: 0, evasion: 62, absorption: 48 },
    },

    // ── Endgame: Strength ─────────────────────────────────────────────
    {
        id: 'boots_str_5', name: 'Juggernaut Sabatons', nameDe: 'Kolossfußschienen',
        archetype: 'strength', slotType: 'boots',
        minLevel: 40,
        requirements: { level: 40, str: 125, agi: 0, int: 0 },
        defenses: { armour: 240, evasion: 0, absorption: 0 },
    },
    {
        id: 'boots_str_6', name: 'Bastion Greaves', nameDe: 'Bastionsbeinschienen',
        archetype: 'strength', slotType: 'boots',
        minLevel: 62,
        requirements: { level: 62, str: 195, agi: 0, int: 0 },
        defenses: { armour: 400, evasion: 0, absorption: 0 },
    },
    {
        id: 'boots_str_7', name: 'Titan Treads', nameDe: 'Titanenschritte',
        archetype: 'strength', slotType: 'boots',
        minLevel: 88,
        requirements: { level: 88, str: 278, agi: 0, int: 0 },
        defenses: { armour: 660, evasion: 0, absorption: 0 },
    },

    // ── Endgame: Agility ──────────────────────────────────────────────
    {
        id: 'boots_agi_5', name: 'Gale Striders', nameDe: 'Sturmstreiter-Schuhe',
        archetype: 'agility', slotType: 'boots',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 125, int: 0 },
        defenses: { armour: 0, evasion: 260, absorption: 0 },
    },
    {
        id: 'boots_agi_6', name: 'Panther Treads', nameDe: 'Panterschritte',
        archetype: 'agility', slotType: 'boots',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 195, int: 0 },
        defenses: { armour: 0, evasion: 430, absorption: 0 },
    },
    {
        id: 'boots_agi_7', name: 'Nightstalker Boots', nameDe: 'Nachtpirscherstiefel',
        archetype: 'agility', slotType: 'boots',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 278, int: 0 },
        defenses: { armour: 0, evasion: 710, absorption: 0 },
    },

    // ── Endgame: Intellect ────────────────────────────────────────────
    {
        id: 'boots_int_5', name: 'Aetherwalk Slippers', nameDe: 'Ätherwandler-Pantoffeln',
        archetype: 'intellect', slotType: 'boots',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 125 },
        defenses: { armour: 0, evasion: 0, absorption: 190 },
    },
    {
        id: 'boots_int_6', name: 'Starcaller Boots', nameDe: 'Sternenruferstiefel',
        archetype: 'intellect', slotType: 'boots',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 0, int: 195 },
        defenses: { armour: 0, evasion: 0, absorption: 315 },
    },
    {
        id: 'boots_int_7', name: 'Voidwalker Treads', nameDe: 'Leerenwandlerschritte',
        archetype: 'intellect', slotType: 'boots',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 0, int: 278 },
        defenses: { armour: 0, evasion: 0, absorption: 520 },
    },

    // ── Endgame: Hybrids ──────────────────────────────────────────────
    {
        id: 'boots_sa_3', name: 'Skirmisher Boots', nameDe: 'Plänklerstiefel',
        archetype: 'str_agi', slotType: 'boots',
        minLevel: 60,
        requirements: { level: 60, str: 127, agi: 127, int: 0 },
        defenses: { armour: 220, evasion: 220, absorption: 0 },
    },
    {
        id: 'boots_si_3', name: 'Templar Greaves', nameDe: 'Templerbeinschienen',
        archetype: 'str_int', slotType: 'boots',
        minLevel: 60,
        requirements: { level: 60, str: 127, agi: 0, int: 127 },
        defenses: { armour: 185, evasion: 0, absorption: 145 },
    },
    {
        id: 'boots_ai_3', name: 'Nomad Wraps', nameDe: 'Nomadenwickel',
        archetype: 'agi_int', slotType: 'boots',
        minLevel: 60,
        requirements: { level: 60, str: 0, agi: 127, int: 127 },
        defenses: { armour: 0, evasion: 185, absorption: 145 },
    },

    // ── Endgame II: Strength ──────────────────────────────────────────
    {
        id: 'boots_str_8', name: 'Ironclad Greaves', nameDe: 'Eisenharte Beinschienen',
        archetype: 'strength', slotType: 'boots',
        minLevel: 52,
        requirements: { level: 52, str: 158, agi: 0, int: 0 },
        defenses: { armour: 330, evasion: 0, absorption: 0 },
    },
    {
        id: 'boots_str_9', name: 'Colossus Sabatons', nameDe: 'Kolossfußplatten',
        archetype: 'strength', slotType: 'boots',
        minLevel: 66,
        requirements: { level: 66, str: 211, agi: 0, int: 0 },
        defenses: { armour: 450, evasion: 0, absorption: 0 },
    },

    // ── Endgame II: Agility ───────────────────────────────────────────
    {
        id: 'boots_agi_8', name: 'Cloudstride Boots', nameDe: 'Wolkenschritt-Stiefel',
        archetype: 'agility', slotType: 'boots',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 158, int: 0 },
        defenses: { armour: 0, evasion: 355, absorption: 0 },
    },
    {
        id: 'boots_agi_9', name: 'Zephyr Striders', nameDe: 'Zephyrstreiter-Schuhe',
        archetype: 'agility', slotType: 'boots',
        minLevel: 66,
        requirements: { level: 66, str: 0, agi: 211, int: 0 },
        defenses: { armour: 0, evasion: 490, absorption: 0 },
    },

    // ── Endgame II: Intellect ─────────────────────────────────────────
    {
        id: 'boots_int_8', name: 'Stargazer Slippers', nameDe: 'Sternengucker-Pantoffeln',
        archetype: 'intellect', slotType: 'boots',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 0, int: 158 },
        defenses: { armour: 0, evasion: 0, absorption: 260 },
    },
    {
        id: 'boots_int_9', name: 'Cometstep Boots', nameDe: 'Kometenschritt-Stiefel',
        archetype: 'intellect', slotType: 'boots',
        minLevel: 66,
        requirements: { level: 66, str: 0, agi: 0, int: 211 },
        defenses: { armour: 0, evasion: 0, absorption: 355 },
    },
];


//------------------------------------------------------------------------
//-------------------BELT BASE TYPES--------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_BELT = [

    // ── Strength ──────────────────────────────────────────────────────
    {
        id: 'belt_str_1', name: 'Heavy Belt', nameDe: 'Schwerer Gürtel',
        archetype: 'strength', slotType: 'belt',
        minLevel: 1,
        requirements: { level: 1, str: 10, agi: 0, int: 0 },
        defenses: { armour: 5, evasion: 0, absorption: 0 },
    },
    {
        id: 'belt_str_2', name: 'Knight\'s Girdle', nameDe: 'Rittergürtel',
        archetype: 'strength', slotType: 'belt',
        minLevel: 8,
        requirements: { level: 8, str: 26, agi: 0, int: 0 },
        defenses: { armour: 20, evasion: 0, absorption: 0 },
    },
    {
        id: 'belt_str_3', name: 'Plated Waistguard', nameDe: 'Plattenhüftschutz',
        archetype: 'strength', slotType: 'belt',
        minLevel: 18,
        requirements: { level: 18, str: 52, agi: 0, int: 0 },
        defenses: { armour: 52, evasion: 0, absorption: 0 },
    },
    {
        id: 'belt_str_4', name: 'Crusader\'s Girdle', nameDe: 'Kreuzfahrergürtel',
        archetype: 'strength', slotType: 'belt',
        minLevel: 28,
        requirements: { level: 28, str: 82, agi: 0, int: 0 },
        defenses: { armour: 102, evasion: 0, absorption: 0 },
    },

    // ── Agility ───────────────────────────────────────────────────────
    {
        id: 'belt_agi_1', name: 'Leather Strap', nameDe: 'Lederriemen',
        archetype: 'agility', slotType: 'belt',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 10, int: 0 },
        defenses: { armour: 0, evasion: 6, absorption: 0 },
    },
    {
        id: 'belt_agi_2', name: 'Braided Cord', nameDe: 'Geflochtene Schnur',
        archetype: 'agility', slotType: 'belt',
        minLevel: 8,
        requirements: { level: 8, str: 0, agi: 26, int: 0 },
        defenses: { armour: 0, evasion: 22, absorption: 0 },
    },
    {
        id: 'belt_agi_3', name: 'Shadow Sash', nameDe: 'Schattenscharpe',
        archetype: 'agility', slotType: 'belt',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 52, int: 0 },
        defenses: { armour: 0, evasion: 58, absorption: 0 },
    },
    {
        id: 'belt_agi_4', name: 'Silk Sash', nameDe: 'Seidenscharpe',
        archetype: 'agility', slotType: 'belt',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 82, int: 0 },
        defenses: { armour: 0, evasion: 114, absorption: 0 },
    },

    // ── Intellect ─────────────────────────────────────────────────────
    {
        id: 'belt_int_1', name: 'Cloth Belt', nameDe: 'Stoffgürtel',
        archetype: 'intellect', slotType: 'belt',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 10 },
        defenses: { armour: 0, evasion: 0, absorption: 5 },
    },
    {
        id: 'belt_int_2', name: 'Silk Girdle', nameDe: 'Seidengürtel',
        archetype: 'intellect', slotType: 'belt',
        minLevel: 8,
        requirements: { level: 8, str: 0, agi: 0, int: 26 },
        defenses: { armour: 0, evasion: 0, absorption: 16 },
    },
    {
        id: 'belt_int_3', name: 'Runed Cinch', nameDe: 'Runenverzierte Kordel',
        archetype: 'intellect', slotType: 'belt',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 0, int: 52 },
        defenses: { armour: 0, evasion: 0, absorption: 42 },
    },
    {
        id: 'belt_int_4', name: 'Arcane Sash', nameDe: 'Arkanscharpe',
        archetype: 'intellect', slotType: 'belt',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 0, int: 82 },
        defenses: { armour: 0, evasion: 0, absorption: 82 },
    },

    // ── Str + Agi ─────────────────────────────────────────────────────
    {
        id: 'belt_sa_1', name: 'Studded Belt', nameDe: 'Nietengürtel',
        archetype: 'str_agi', slotType: 'belt',
        minLevel: 5,
        requirements: { level: 5, str: 14, agi: 14, int: 0 },
        defenses: { armour: 10, evasion: 10, absorption: 0 },
    },
    {
        id: 'belt_sa_2', name: 'War Girdle', nameDe: 'Kriegsgürtel',
        archetype: 'str_agi', slotType: 'belt',
        minLevel: 22,
        requirements: { level: 22, str: 44, agi: 44, int: 0 },
        defenses: { armour: 46, evasion: 46, absorption: 0 },
    },

    // ── Str + Int ─────────────────────────────────────────────────────
    {
        id: 'belt_si_1', name: 'Plated Belt', nameDe: 'Plattengürtel',
        archetype: 'str_int', slotType: 'belt',
        minLevel: 5,
        requirements: { level: 5, str: 14, agi: 0, int: 14 },
        defenses: { armour: 9, evasion: 0, absorption: 7 },
    },
    {
        id: 'belt_si_2', name: 'Cleric\'s Sash', nameDe: 'Klerikerscharpe',
        archetype: 'str_int', slotType: 'belt',
        minLevel: 22,
        requirements: { level: 22, str: 44, agi: 0, int: 44 },
        defenses: { armour: 40, evasion: 0, absorption: 32 },
    },

    // ── Agi + Int ─────────────────────────────────────────────────────
    {
        id: 'belt_ai_1', name: 'Woven Cord', nameDe: 'Gewebte Schnur',
        archetype: 'agi_int', slotType: 'belt',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 14, int: 14 },
        defenses: { armour: 0, evasion: 9, absorption: 7 },
    },
    {
        id: 'belt_ai_2', name: 'Mystic Sash', nameDe: 'Mystische Scharpe',
        archetype: 'agi_int', slotType: 'belt',
        minLevel: 22,
        requirements: { level: 22, str: 0, agi: 44, int: 44 },
        defenses: { armour: 0, evasion: 40, absorption: 32 },
    },

    // ── Endgame: Strength ─────────────────────────────────────────────
    {
        id: 'belt_str_5', name: 'Warlord Girdle', nameDe: 'Kriegsfürstengürtel',
        archetype: 'strength', slotType: 'belt',
        minLevel: 40,
        requirements: { level: 40, str: 118, agi: 0, int: 0 },
        defenses: { armour: 178, evasion: 0, absorption: 0 },
    },
    {
        id: 'belt_str_6', name: 'Fortress Waistguard', nameDe: 'Festungshüftschutz',
        archetype: 'strength', slotType: 'belt',
        minLevel: 62,
        requirements: { level: 62, str: 182, agi: 0, int: 0 },
        defenses: { armour: 295, evasion: 0, absorption: 0 },
    },
    {
        id: 'belt_str_7', name: 'Titan Girdle', nameDe: 'Titanengürtel',
        archetype: 'strength', slotType: 'belt',
        minLevel: 88,
        requirements: { level: 88, str: 260, agi: 0, int: 0 },
        defenses: { armour: 485, evasion: 0, absorption: 0 },
    },

    // ── Endgame: Agility ──────────────────────────────────────────────
    {
        id: 'belt_agi_5', name: 'Serpent Sash', nameDe: 'Schlangenscharpe',
        archetype: 'agility', slotType: 'belt',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 118, int: 0 },
        defenses: { armour: 0, evasion: 198, absorption: 0 },
    },
    {
        id: 'belt_agi_6', name: 'Zephyr Cord', nameDe: 'Zephyrschnur',
        archetype: 'agility', slotType: 'belt',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 182, int: 0 },
        defenses: { armour: 0, evasion: 330, absorption: 0 },
    },
    {
        id: 'belt_agi_7', name: 'Umbral Sash', nameDe: 'Umbrascharpe',
        archetype: 'agility', slotType: 'belt',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 260, int: 0 },
        defenses: { armour: 0, evasion: 540, absorption: 0 },
    },

    // ── Endgame: Intellect ────────────────────────────────────────────
    {
        id: 'belt_int_5', name: 'Sigil Cinch', nameDe: 'Sigillen-Kordel',
        archetype: 'intellect', slotType: 'belt',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 118 },
        defenses: { armour: 0, evasion: 0, absorption: 143 },
    },
    {
        id: 'belt_int_6', name: 'Comet Cord', nameDe: 'Kometenschnur',
        archetype: 'intellect', slotType: 'belt',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 0, int: 182 },
        defenses: { armour: 0, evasion: 0, absorption: 238 },
    },
    {
        id: 'belt_int_7', name: 'Voidbind Sash', nameDe: 'Leerenbandscharpe',
        archetype: 'intellect', slotType: 'belt',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 0, int: 260 },
        defenses: { armour: 0, evasion: 0, absorption: 390 },
    },

    // ── Endgame: Hybrids ──────────────────────────────────────────────
    {
        id: 'belt_sa_3', name: 'Warmonger Belt', nameDe: 'Kriegstreiber-Gürtel',
        archetype: 'str_agi', slotType: 'belt',
        minLevel: 60,
        requirements: { level: 60, str: 120, agi: 120, int: 0 },
        defenses: { armour: 142, evasion: 142, absorption: 0 },
    },
    {
        id: 'belt_si_3', name: 'Inquisitor Belt', nameDe: 'Inquisitorgürtel',
        archetype: 'str_int', slotType: 'belt',
        minLevel: 60,
        requirements: { level: 60, str: 120, agi: 0, int: 120 },
        defenses: { armour: 119, evasion: 0, absorption: 95 },
    },
    {
        id: 'belt_ai_3', name: 'Oracle Cord', nameDe: 'Orakelschnur',
        archetype: 'agi_int', slotType: 'belt',
        minLevel: 60,
        requirements: { level: 60, str: 0, agi: 120, int: 120 },
        defenses: { armour: 0, evasion: 119, absorption: 95 },
    },

    // ── Endgame II: Strength ──────────────────────────────────────────
    {
        id: 'belt_str_8', name: 'Siege Girdle', nameDe: 'Belagerungsgürtel',
        archetype: 'strength', slotType: 'belt',
        minLevel: 52,
        requirements: { level: 52, str: 150, agi: 0, int: 0 },
        defenses: { armour: 265, evasion: 0, absorption: 0 },
    },
    {
        id: 'belt_str_9', name: 'Girdle of the Colossus', nameDe: 'Gürtel des Kolosses',
        archetype: 'strength', slotType: 'belt',
        minLevel: 66,
        requirements: { level: 66, str: 200, agi: 0, int: 0 },
        defenses: { armour: 333, evasion: 0, absorption: 0 },
    },

    // ── Endgame II: Agility ───────────────────────────────────────────
    {
        id: 'belt_agi_8', name: 'Featherstep Cord', nameDe: 'Federschritt-Schnur',
        archetype: 'agility', slotType: 'belt',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 150, int: 0 },
        defenses: { armour: 0, evasion: 295, absorption: 0 },
    },
    {
        id: 'belt_agi_9', name: 'Viperspine Sash', nameDe: 'Vippenwirbel-Scharpe',
        archetype: 'agility', slotType: 'belt',
        minLevel: 66,
        requirements: { level: 66, str: 0, agi: 200, int: 0 },
        defenses: { armour: 0, evasion: 370, absorption: 0 },
    },

    // ── Endgame II: Intellect ─────────────────────────────────────────
    {
        id: 'belt_int_8', name: 'Runebraid Cord', nameDe: 'Runengeflecht-Kordel',
        archetype: 'intellect', slotType: 'belt',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 0, int: 150 },
        defenses: { armour: 0, evasion: 0, absorption: 213 },
    },
    {
        id: 'belt_int_9', name: 'Galaxy Cord', nameDe: 'Galaxienschnur',
        archetype: 'intellect', slotType: 'belt',
        minLevel: 66,
        requirements: { level: 66, str: 0, agi: 0, int: 200 },
        defenses: { armour: 0, evasion: 0, absorption: 268 },
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
        id: 'wpn_1h_1', name: 'Rusted Sword', nameDe: 'Rostiges Schwert',
        archetype: 'strength', slotType: 'weapon', icon: '⚔️',
        minLevel: 1,
        requirements: { level: 1, str: 14, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 4, max: 10 }, attackIntervalSeconds: 4.5,
    },
    {
        id: 'wpn_1h_2', name: 'Hand Axe', nameDe: 'Handaxt',
        archetype: 'strength', slotType: 'weapon', icon: '🪓',
        minLevel: 4,
        requirements: { level: 4, str: 28, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 12, max: 28 }, attackIntervalSeconds: 7.1,
    },
    {
        id: 'wpn_1h_3', name: 'War Sword', nameDe: 'Kriegsschwert',
        archetype: 'strength', slotType: 'weapon', icon: '⚔️',
        minLevel: 10,
        requirements: { level: 10, str: 50, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 28, max: 58 }, attackIntervalSeconds: 7.7,
    },
    {
        id: 'wpn_1h_4', name: 'Gladius', nameDe: 'Gladius',
        archetype: 'strength', slotType: 'weapon', icon: '⚔️',
        minLevel: 19,
        requirements: { level: 19, str: 76, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 52, max: 108 }, attackIntervalSeconds: 7.7,
    },
    {
        id: 'wpn_1h_5', name: 'Eternal Sword', nameDe: 'Ewiges Schwert',
        archetype: 'strength', slotType: 'weapon', icon: '⚔️',
        minLevel: 29,
        requirements: { level: 29, str: 110, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 94, max: 192 }, attackIntervalSeconds: 8.3,
    },

    // ── Agility Melee (fast, lower damage) ────────────────────────────
    {
        id: 'wpn_agi_1', name: 'Worn Dagger', nameDe: 'Abgenutzter Dolch',
        archetype: 'agility', slotType: 'weapon', icon: '🗡️',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 14, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 3, max: 8 }, attackIntervalSeconds: 5.6,
    },
    {
        id: 'wpn_agi_2', name: 'Baselard', nameDe: 'Baselard',
        archetype: 'agility', slotType: 'weapon', icon: '🗡️',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 28, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 10, max: 22 }, attackIntervalSeconds: 5.6,
    },
    {
        id: 'wpn_agi_3', name: 'Rapier', nameDe: 'Rapier',
        archetype: 'agility', slotType: 'weapon', icon: '🗡️',
        minLevel: 12,
        requirements: { level: 12, str: 0, agi: 52, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 24, max: 48 }, attackIntervalSeconds: 5.9,
    },
    {
        id: 'wpn_agi_4', name: 'Stiletto', nameDe: 'Stiletto',
        archetype: 'agility', slotType: 'weapon', icon: '🗡️',
        minLevel: 22,
        requirements: { level: 22, str: 0, agi: 80, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 46, max: 90 }, attackIntervalSeconds: 5.9,
    },

    // ── Intellect (Wands / Staves) ────────────────────────────────────
    {
        id: 'wpn_int_1', name: 'Carved Wand', nameDe: 'Geschnitzter Zauberstab',
        archetype: 'intellect', slotType: 'weapon', icon: '🪄',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 14 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 5, max: 11 }, attackIntervalSeconds: 6.3,
    },
    {
        id: 'wpn_int_2', name: 'Gnarled Staff', nameDe: 'Knorriger Stab',
        archetype: 'intellect', slotType: 'weapon', icon: '🦯',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 0, int: 28 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 14, max: 30 }, attackIntervalSeconds: 7.1,
    },
    {
        id: 'wpn_int_3', name: 'Bronze Sceptre', nameDe: 'Bronzepter',
        archetype: 'intellect', slotType: 'weapon', icon: '🪄',
        minLevel: 12,
        requirements: { level: 12, str: 0, agi: 0, int: 52 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 32, max: 66 }, attackIntervalSeconds: 7.7,
    },
    {
        id: 'wpn_int_4', name: 'Elder Staff', nameDe: 'Stab der Ältesten',
        archetype: 'intellect', slotType: 'weapon', icon: '🦯',
        minLevel: 22,
        requirements: { level: 22, str: 0, agi: 0, int: 80 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 60, max: 122 }, attackIntervalSeconds: 8.3,
    },

    // ── Two-Handed (high damage, slow) ────────────────────────────────
    {
        id: 'wpn_2h_1', name: 'Greatsword', nameDe: 'Zweihänder',
        archetype: 'strength', slotType: 'weapon', icon: '⚔️',
        minLevel: 6,
        requirements: { level: 6, str: 36, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 18, max: 44 }, attackIntervalSeconds: 11.1,
    },
    {
        id: 'wpn_2h_2', name: 'Great Maul', nameDe: 'Kriegshammer',
        archetype: 'strength', slotType: 'weapon', icon: '🔨',
        minLevel: 15,
        requirements: { level: 15, str: 64, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 48, max: 110 }, attackIntervalSeconds: 11.8,
    },
    {
        id: 'wpn_2h_3', name: 'Great Axe', nameDe: 'Kriegsaxt',
        archetype: 'strength', slotType: 'weapon', icon: '🪓',
        minLevel: 26,
        requirements: { level: 26, str: 102, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 98, max: 220 }, attackIntervalSeconds: 12.5,
    },

    // ── Endgame: One-Handed Melee ─────────────────────────────────────
    {
        id: 'wpn_1h_6', name: 'Blade of Ruin', nameDe: 'Klinge des Verderbens',
        archetype: 'strength', slotType: 'weapon', icon: '⚔️',
        minLevel: 40,
        requirements: { level: 40, str: 152, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 150, max: 305 }, attackIntervalSeconds: 8.3,
    },
    {
        id: 'wpn_1h_7', name: 'Kingslayer', nameDe: 'Königsmörder',
        archetype: 'strength', slotType: 'weapon', icon: '⚔️',
        minLevel: 62,
        requirements: { level: 62, str: 235, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 232, max: 470 }, attackIntervalSeconds: 8.7,
    },
    {
        id: 'wpn_1h_8', name: 'Godforged Blade', nameDe: 'Gottgeschmiedete Klinge',
        archetype: 'strength', slotType: 'weapon', icon: '⚔️',
        minLevel: 88,
        requirements: { level: 88, str: 335, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 355, max: 720 }, attackIntervalSeconds: 9.1,
    },

    // ── Endgame: Agility Melee ────────────────────────────────────────
    {
        id: 'wpn_agi_5', name: 'Misericorde', nameDe: 'Misericorde',
        archetype: 'agility', slotType: 'weapon', icon: '🗡️',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 146, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 72, max: 140 }, attackIntervalSeconds: 5.9,
    },
    {
        id: 'wpn_agi_6', name: 'Nightfang', nameDe: 'Nachtreißzahn',
        archetype: 'agility', slotType: 'weapon', icon: '🗡️',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 226, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 112, max: 215 }, attackIntervalSeconds: 6.1,
    },
    {
        id: 'wpn_agi_7', name: 'Heartseeker', nameDe: 'Herzenssucher',
        archetype: 'agility', slotType: 'weapon', icon: '🗡️',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 322, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 172, max: 330 }, attackIntervalSeconds: 6.3,
    },

    // ── Endgame: Wands / Staves ───────────────────────────────────────
    {
        id: 'wpn_int_5', name: 'Archon Wand', nameDe: 'Arkonszauberstab',
        archetype: 'intellect', slotType: 'weapon', icon: '🪄',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 146 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 95, max: 190 }, attackIntervalSeconds: 8.3,
    },
    {
        id: 'wpn_int_6', name: 'Void Sceptre', nameDe: 'Leerenzepter',
        archetype: 'intellect', slotType: 'weapon', icon: '🪄',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 0, int: 226 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 148, max: 295 }, attackIntervalSeconds: 8.7,
    },
    {
        id: 'wpn_int_7', name: 'Staff of Eternity', nameDe: 'Stab der Ewigkeit',
        archetype: 'intellect', slotType: 'weapon', icon: '🦯',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 0, int: 322 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 228, max: 455 }, attackIntervalSeconds: 9.1,
    },

    // ── Endgame: Two-Handed ───────────────────────────────────────────
    {
        id: 'wpn_2h_4', name: 'Executioner Greatsword', nameDe: 'Henkerszweihänder',
        archetype: 'strength', slotType: 'weapon', icon: '⚔️',
        minLevel: 50,
        requirements: { level: 50, str: 196, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 175, max: 390 }, attackIntervalSeconds: 12.5,
    },
    {
        id: 'wpn_2h_5', name: 'Worldsplitter', nameDe: 'Weltenspalter',
        archetype: 'strength', slotType: 'weapon', icon: '🪓',
        minLevel: 85,
        requirements: { level: 85, str: 334, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 320, max: 720 }, attackIntervalSeconds: 13.3,
    },

    // ── Endgame II: One-Handed Melee ──────────────────────────────────
    {
        id: 'wpn_1h_9', name: 'Oblivion Edge', nameDe: 'Schneide des Vergessens',
        archetype: 'strength', slotType: 'weapon', icon: '⚔️',
        minLevel: 66,
        requirements: { level: 66, str: 260, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 258, max: 520 }, attackIntervalSeconds: 8.7,
    },

    // ── Endgame II: Agility Melee ─────────────────────────────────────
    {
        id: 'wpn_agi_8', name: 'Fang of the Swarm', nameDe: 'Reißzahn des Schwarms',
        archetype: 'agility', slotType: 'weapon', icon: '🗡️',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 193, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 99, max: 190 }, attackIntervalSeconds: 6.1,
    },

    // ── Endgame II: Wands / Staves ────────────────────────────────────
    {
        id: 'wpn_int_8', name: 'Staff of Echoes', nameDe: 'Stab der Echos',
        archetype: 'intellect', slotType: 'weapon', icon: '🦯',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 0, int: 193 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 130, max: 258 }, attackIntervalSeconds: 8.7,
    },

    // ── Endgame II: Two-Handed ────────────────────────────────────────
    {
        id: 'wpn_2h_6', name: 'Worldbreaker', nameDe: 'Weltenbrecher',
        archetype: 'strength', slotType: 'weapon', icon: '🔨',
        minLevel: 66,
        requirements: { level: 66, str: 250, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 262, max: 585 }, attackIntervalSeconds: 13.3,
    },
];

// ── Auto-fill weapon gaps: guarantee every level 1–90 has at least one base ──
(() => {
    const existingLevels = new Set(EG_BASE_TYPES_WEAPON.map(b => b.minLevel));
    const archCycle = ['strength', 'agility', 'intellect', 'strength'];
    const iconFor = { strength: '⚔️', agility: '🗡️', intellect: '🪄' };
    const nameFor = {
        strength: (lvl) => `Battle Blade ${lvl}`,
        agility:  (lvl) => `Swift Fang ${lvl}`,
        intellect:(lvl) => `Arcane Rod ${lvl}`,
    };
    const nameDeFor = {
        strength: (lvl) => `Kampfklinge ${lvl}`,
        agility:  (lvl) => `Flinker Fang ${lvl}`,
        intellect:(lvl) => `Arkanstab ${lvl}`,
    };
    for (let lvl = 1; lvl <= 90; lvl++) {
        if (existingLevels.has(lvl)) continue;
        const arch = archCycle[lvl % 4];
        // Every 8th strength entry becomes a two-hander for variety
        const isTwoHand = arch === 'strength' && (lvl % 8 === 3);
        // Rebalanced 2026: progressive 0.60@10 -> 0.85@88, so 88 ~390 not 296, 40 ~156 not 186
        let req;
        if (lvl <= 10) req = Math.round(14 + (lvl - 1) * 2.8);
        else {
            const t = Math.min(1, (lvl - 10) / 78);
            const factor = 0.60 + 0.25 * t;
            req = Math.round(20 + (lvl - 1) * 5 * factor);
        }
        const twoHandMult = isTwoHand ? 1.9 : 1; // 2H auto-bases hit ~1.9x harder (PoE-style)
        const dmgMin = Math.round((3.8 * lvl + 4) * twoHandMult);
        const dmgMax = Math.round((7.6 * lvl + 8) * twoHandMult);
        const baseInterval = arch === 'agility' ? 5.8 : arch === 'intellect' ? 7.2 : (isTwoHand ? 11.8 : 7.8);
        const interval = +(baseInterval + (lvl % 5) * 0.12).toFixed(1);
        EG_BASE_TYPES_WEAPON.push({
            id: `wpn_auto_${lvl}`,
            name: nameFor[arch](lvl),
            nameDe: nameDeFor[arch](lvl),
            archetype: arch,
            slotType: 'weapon',
            hands: isTwoHand ? 2 : 1,
            icon: isTwoHand ? '🔨' : (iconFor[arch] || '⚔️'),
            minLevel: lvl,
            requirements: { level: lvl, str: arch === 'strength' ? req : 0, agi: arch === 'agility' ? req : 0, int: arch === 'intellect' ? req : 0 },
            defenses: { armour: 0, evasion: 0, absorption: 0 },
            damage: { min: dmgMin, max: dmgMax },
            attackIntervalSeconds: interval,
        });
    }
})();

//------------------------------------------------------------------------
//-------------------WEAPON HAND CLASSIFICATION (PoE-STYLE)----------------
//------------------------------------------------------------------------
// Every melee weapon base carries `hands`: 1 (one-handed) or 2 (two-handed).
//   1H → weapon1 (main-hand) OR weapon2 (off-hand, dual-wield)
//   2H → weapon1 ONLY, and blocks the off-hand while equipped
// Staves are 2H (PoE-style); wands / sceptres / swords / axes / daggers are 1H.
// Static 2H bases are also rebalanced here: ~2x damage at a slower interval so
// 2H DPS lands ~1.6-1.7x a same-tier 1H (offense vs shield defense tradeoff).
(() => {
    const STAFF_IDS = new Set(['wpn_int_2', 'wpn_int_4', 'wpn_int_7', 'wpn_int_8']);
    for (const b of EG_BASE_TYPES_WEAPON) {
        if (b.hands === 1 || b.hands === 2) continue;
        if (/^wpn_2h/.test(b.id) || STAFF_IDS.has(b.id)) b.hands = 2;
        else b.hands = 1;
    }
    // Rebalance static 2H bases: double damage, quicken the slowest swings a touch.
    for (const b of EG_BASE_TYPES_WEAPON) {
        if (b.hands !== 2 || b._rebalanced2H) continue;
        if (b.damage) {
            b.damage = {
                min: Math.round(b.damage.min * 2),
                max: Math.round(b.damage.max * 2),
            };
        }
        if (typeof b.attackIntervalSeconds === 'number') {
            b.attackIntervalSeconds = Math.round(Math.max(9.8, b.attackIntervalSeconds - 1.2) * 10) / 10;
        }
        b._rebalanced2H = true;
    }
})();


//------------------------------------------------------------------------
//-------------------SHIELD BASE TYPES------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_SHIELD = [

    // ── Strength ──────────────────────────────────────────────────────
    {
        id: 'shield_str_1', name: 'Buckler', nameDe: 'Faustschild',
        archetype: 'strength', slotType: 'shield',
        minLevel: 1,
        requirements: { level: 1, str: 12, agi: 0, int: 0 },
        defenses: { armour: 12, evasion: 0, absorption: 0 },
        blockChance: 24,
    },
    {
        id: 'shield_str_2', name: 'Round Shield', nameDe: 'Rundschild',
        archetype: 'strength', slotType: 'shield',
        minLevel: 8,
        requirements: { level: 8, str: 32, agi: 0, int: 0 },
        defenses: { armour: 40, evasion: 0, absorption: 0 },
        blockChance: 26,
    },
    {
        id: 'shield_str_3', name: 'Heater Shield', nameDe: 'Heaterschild',
        archetype: 'strength', slotType: 'shield',
        minLevel: 18,
        requirements: { level: 18, str: 60, agi: 0, int: 0 },
        defenses: { armour: 96, evasion: 0, absorption: 0 },
        blockChance: 28,
    },
    {
        id: 'shield_str_4', name: 'Tower Shield', nameDe: 'Turmschild',
        archetype: 'strength', slotType: 'shield',
        minLevel: 28,
        requirements: { level: 28, str: 96, agi: 0, int: 0 },
        defenses: { armour: 190, evasion: 0, absorption: 0 },
        blockChance: 30,
    },

    // ── Intellect (Absorption) ────────────────────────────────────────
    {
        id: 'shield_int_1', name: 'Targe', nameDe: 'Tartsche',
        archetype: 'intellect', slotType: 'shield',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 12 },
        defenses: { armour: 0, evasion: 0, absorption: 10 },
        blockChance: 20,
    },
    {
        id: 'shield_int_2', name: 'Spirit Shield', nameDe: 'Geisterschild',
        archetype: 'intellect', slotType: 'shield',
        minLevel: 8,
        requirements: { level: 8, str: 0, agi: 0, int: 32 },
        defenses: { armour: 0, evasion: 0, absorption: 34 },
        blockChance: 22,
    },
    {
        id: 'shield_int_3', name: 'Aegis', nameDe: 'Ägis',
        archetype: 'intellect', slotType: 'shield',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 0, int: 60 },
        defenses: { armour: 0, evasion: 0, absorption: 80 },
        blockChance: 24,
    },
    {
        id: 'shield_int_4', name: 'Archon Shield', nameDe: 'Arkanschild',
        archetype: 'intellect', slotType: 'shield',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 0, int: 96 },
        defenses: { armour: 0, evasion: 0, absorption: 156 },
        blockChance: 26,
    },

    // ── Endgame: Strength ─────────────────────────────────────────────
    {
        id: 'shield_str_5', name: 'Bastion Shield', nameDe: 'Bastionsschild',
        archetype: 'strength', slotType: 'shield',
        minLevel: 40,
        requirements: { level: 40, str: 138, agi: 0, int: 0 },
        defenses: { armour: 330, evasion: 0, absorption: 0 },
        blockChance: 32,
    },
    {
        id: 'shield_str_6', name: 'Citadel Tower Shield', nameDe: 'Zitadellenturmschild',
        archetype: 'strength', slotType: 'shield',
        minLevel: 62,
        requirements: { level: 62, str: 214, agi: 0, int: 0 },
        defenses: { armour: 550, evasion: 0, absorption: 0 },
        blockChance: 34,
    },
    {
        id: 'shield_str_7', name: 'Immovable Aegis', nameDe: 'Unbewegliche Ägis',
        archetype: 'strength', slotType: 'shield',
        minLevel: 88,
        requirements: { level: 88, str: 303, agi: 0, int: 0 },
        defenses: { armour: 900, evasion: 0, absorption: 0 },
        blockChance: 36,
    },

    // ── Endgame: Intellect ────────────────────────────────────────────
    {
        id: 'shield_int_5', name: 'Runic Spirit Shield', nameDe: 'Runen-Geisterschild',
        archetype: 'intellect', slotType: 'shield',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 138 },
        defenses: { armour: 0, evasion: 0, absorption: 270 },
        blockChance: 28,
    },
    {
        id: 'shield_int_6', name: 'Astral Ward', nameDe: 'Astralschild',
        archetype: 'intellect', slotType: 'shield',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 0, int: 214 },
        defenses: { armour: 0, evasion: 0, absorption: 450 },
        blockChance: 30,
    },
    {
        id: 'shield_int_7', name: 'Eternity Sphere', nameDe: 'Kugel der Ewigkeit',
        archetype: 'intellect', slotType: 'shield',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 0, int: 303 },
        defenses: { armour: 0, evasion: 0, absorption: 740 },
        blockChance: 32,
    },
    // ── Filler – Strength & Intellect mid/endgame ──────────────────────
    {
        id: 'shield_str_8', name: 'Bulwark Shield', nameDe: 'Bollwerkschild',
        archetype: 'strength', slotType: 'shield',
        minLevel: 35,
        requirements: { level: 35, str: 118, agi: 0, int: 0 },
        defenses: { armour: 250, evasion: 0, absorption: 0 },
        blockChance: 31,
    },
    {
        id: 'shield_str_9', name: 'Guardian Shield', nameDe: 'Wächterschild',
        archetype: 'strength', slotType: 'shield',
        minLevel: 45,
        requirements: { level: 45, str: 160, agi: 0, int: 0 },
        defenses: { armour: 340, evasion: 0, absorption: 0 },
        blockChance: 31,
    },
    {
        id: 'shield_str_10', name: 'War Shield', nameDe: 'Kriegsschild',
        archetype: 'strength', slotType: 'shield',
        minLevel: 52,
        requirements: { level: 52, str: 185, agi: 0, int: 0 },
        defenses: { armour: 420, evasion: 0, absorption: 0 },
        blockChance: 33,
    },
    {
        id: 'shield_str_11', name: 'Aegis of Dawn', nameDe: 'Ägis der Morgenröte',
        archetype: 'strength', slotType: 'shield',
        minLevel: 70,
        requirements: { level: 70, str: 250, agi: 0, int: 0 },
        defenses: { armour: 680, evasion: 0, absorption: 0 },
        blockChance: 35,
    },
    {
        id: 'shield_str_12', name: 'Titan Wall', nameDe: 'Titanenwall',
        archetype: 'strength', slotType: 'shield',
        minLevel: 75,
        requirements: { level: 75, str: 270, agi: 0, int: 0 },
        defenses: { armour: 750, evasion: 0, absorption: 0 },
        blockChance: 35,
    },
    {
        id: 'shield_str_13', name: 'Eternal Bulwark', nameDe: 'Ewiges Bollwerk',
        archetype: 'strength', slotType: 'shield',
        minLevel: 80,
        requirements: { level: 80, str: 288, agi: 0, int: 0 },
        defenses: { armour: 820, evasion: 0, absorption: 0 },
        blockChance: 36,
    },
    {
        id: 'shield_int_8', name: 'Mystic Ward', nameDe: 'Mystischer Schild',
        archetype: 'intellect', slotType: 'shield',
        minLevel: 35,
        requirements: { level: 35, str: 0, agi: 0, int: 118 },
        defenses: { armour: 0, evasion: 0, absorption: 210 },
        blockChance: 27,
    },
    {
        id: 'shield_int_9', name: 'Glyph Shield', nameDe: 'Glyphen-Schild',
        archetype: 'intellect', slotType: 'shield',
        minLevel: 45,
        requirements: { level: 45, str: 0, agi: 0, int: 160 },
        defenses: { armour: 0, evasion: 0, absorption: 280 },
        blockChance: 27,
    },
    {
        id: 'shield_int_10', name: 'Rune Ward', nameDe: 'Runenschild',
        archetype: 'intellect', slotType: 'shield',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 0, int: 185 },
        defenses: { armour: 0, evasion: 0, absorption: 350 },
        blockChance: 29,
    },
    {
        id: 'shield_int_11', name: 'Celestial Barrier', nameDe: 'Himmelsbarriere',
        archetype: 'intellect', slotType: 'shield',
        minLevel: 70,
        requirements: { level: 70, str: 0, agi: 0, int: 250 },
        defenses: { armour: 0, evasion: 0, absorption: 560 },
        blockChance: 31,
    },
    {
        id: 'shield_int_12', name: 'Void Sphere', nameDe: 'Leerensphäre',
        archetype: 'intellect', slotType: 'shield',
        minLevel: 75,
        requirements: { level: 75, str: 0, agi: 0, int: 270 },
        defenses: { armour: 0, evasion: 0, absorption: 640 },
        blockChance: 31,
    },
    {
        id: 'shield_int_13', name: 'Aether Aegis', nameDe: 'Äther-Ägis',
        archetype: 'intellect', slotType: 'shield',
        minLevel: 80,
        requirements: { level: 80, str: 0, agi: 0, int: 288 },
        defenses: { armour: 0, evasion: 0, absorption: 690 },
        blockChance: 32,
    },
];


//------------------------------------------------------------------------
//-------------------RANGED WEAPON BASE TYPES-----------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_RANGED = [
    {
        id: 'ranged_1', name: 'Shortbow', nameDe: 'Kurzbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 14, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 4, max: 11 },
    },
    {
        id: 'ranged_2', name: 'Longbow', nameDe: 'Langbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 26, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 12, max: 28 },
    },
    {
        id: 'ranged_3', name: 'Recurve Bow', nameDe: 'Reflexbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 11,
        requirements: { level: 11, str: 0, agi: 46, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 28, max: 60 },
    },
    {
        id: 'ranged_4', name: 'Composite Bow', nameDe: 'Kompositbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 20,
        requirements: { level: 20, str: 0, agi: 72, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 52, max: 106 },
    },
    {
        id: 'ranged_5', name: 'War Bow', nameDe: 'Kriegsbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 30,
        requirements: { level: 30, str: 0, agi: 104, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 96, max: 194 },
    },
    {
        id: 'ranged_6', name: 'Hunter\'s Greatbow', nameDe: 'Großbogen des Jägers',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 139, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 150, max: 300 },
    },
    {
        id: 'ranged_7', name: 'Storm Bow', nameDe: 'Sturmbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 216, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 232, max: 465 },
    },
    {
        id: 'ranged_8', name: 'Celestial Longbow', nameDe: 'Himmelslangbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 306, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 355, max: 710 },
    },
    {
        id: 'ranged_9', name: 'Singularity Bow', nameDe: 'Singularitätsbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 66,
        requirements: { level: 66, str: 0, agi: 238, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 256, max: 512 },
    },
    // ── Filler – at least 13 more across all level brackets ────────────
    {
        id: 'ranged_10', name: 'Crude Bow', nameDe: 'Roher Bogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 3,
        requirements: { level: 3, str: 0, agi: 20, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 7, max: 16 },
    },
    {
        id: 'ranged_11', name: 'Light Bow', nameDe: 'Leichter Bogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 7,
        requirements: { level: 7, str: 0, agi: 32, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 16, max: 36 },
    },
    {
        id: 'ranged_12', name: 'Hunting Bow', nameDe: 'Jagdbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 15,
        requirements: { level: 15, str: 0, agi: 56, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 38, max: 78 },
    },
    {
        id: 'ranged_13', name: 'Battle Bow', nameDe: 'Schlachtbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 25,
        requirements: { level: 25, str: 0, agi: 88, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 72, max: 148 },
    },
    {
        id: 'ranged_14', name: 'Siege Bow', nameDe: 'Belagerungsbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 35,
        requirements: { level: 35, str: 0, agi: 120, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 120, max: 244 },
    },
    {
        id: 'ranged_15', name: 'Runed Bow', nameDe: 'Runenbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 45,
        requirements: { level: 45, str: 0, agi: 158, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 175, max: 350 },
    },
    {
        id: 'ranged_16', name: 'Ember Bow', nameDe: 'Glutbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 50,
        requirements: { level: 50, str: 0, agi: 176, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 195, max: 390 },
    },
    {
        id: 'ranged_17', name: 'Frost Bow', nameDe: 'Frostbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 55,
        requirements: { level: 55, str: 0, agi: 194, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 215, max: 430 },
    },
    {
        id: 'ranged_18', name: 'Thunder Bow', nameDe: 'Donnerbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 70,
        requirements: { level: 70, str: 0, agi: 254, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 276, max: 552 },
    },
    {
        id: 'ranged_19', name: 'Dusk Bow', nameDe: 'Dämmerungsbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 75,
        requirements: { level: 75, str: 0, agi: 270, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 300, max: 600 },
    },
    {
        id: 'ranged_20', name: 'Dawn Bow', nameDe: 'Morgengrauenbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 80,
        requirements: { level: 80, str: 0, agi: 286, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 325, max: 650 },
    },
    {
        id: 'ranged_21', name: 'Godwood Bow', nameDe: 'Götterholzbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 85,
        requirements: { level: 85, str: 0, agi: 298, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 340, max: 680 },
    },
    {
        id: 'ranged_22', name: 'Voidstrike Bow', nameDe: 'Leerenschlagbogen',
        archetype: 'agility', slotType: 'ranged',
        minLevel: 90,
        requirements: { level: 90, str: 0, agi: 315, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
        damage: { min: 365, max: 730 },
    },
];


//------------------------------------------------------------------------
//-------------------RING BASE TYPES--------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_RING = [
    {
        id: 'ring_1', name: 'Iron Ring', nameDe: 'Eisenring',
        archetype: 'any', slotType: 'ring',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_2', name: 'Garnet Ring', nameDe: 'Granatring',
        archetype: 'strength', slotType: 'ring',
        minLevel: 5,
        requirements: { level: 5, str: 18, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_3', name: 'Jade Ring', nameDe: 'Jadering',
        archetype: 'agility', slotType: 'ring',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 18, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_4', name: 'Sapphire Ring', nameDe: 'Saphirring',
        archetype: 'intellect', slotType: 'ring',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 0, int: 18 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_5', name: 'Gold Ring', nameDe: 'Goldring',
        archetype: 'str_agi', slotType: 'ring',
        minLevel: 12,
        requirements: { level: 12, str: 28, agi: 28, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_6', name: 'Amethyst Ring', nameDe: 'Amethystring',
        archetype: 'any', slotType: 'ring',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_7', name: 'Diamond Ring', nameDe: 'Diamantring',
        archetype: 'any', slotType: 'ring',
        minLevel: 27,
        requirements: { level: 27, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_8', name: 'Ruby Ring', nameDe: 'Rubinring',
        archetype: 'strength', slotType: 'ring',
        minLevel: 45,
        requirements: { level: 45, str: 120, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_9', name: 'Emerald Ring', nameDe: 'Smaragdring',
        archetype: 'agility', slotType: 'ring',
        minLevel: 60,
        requirements: { level: 60, str: 0, agi: 160, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_10', name: 'Voidstone Ring', nameDe: 'Leerensteinring',
        archetype: 'any', slotType: 'ring',
        minLevel: 90,
        requirements: { level: 90, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    // ── Mid-game filler (30 – 85) ─────────────────────────────────────
    {
        id: 'ring_11', name: 'Moon Ring', nameDe: 'Mondring',
        archetype: 'any', slotType: 'ring',
        minLevel: 30,
        requirements: { level: 30, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_12', name: 'Bloodstone Ring', nameDe: 'Blutsteinring',
        archetype: 'strength', slotType: 'ring',
        minLevel: 35,
        requirements: { level: 35, str: 70, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_13', name: 'Topaz Ring', nameDe: 'Topasring',
        archetype: 'any', slotType: 'ring',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_14', name: 'Aquamarine Ring', nameDe: 'Aquamarinring',
        archetype: 'intellect', slotType: 'ring',
        minLevel: 50,
        requirements: { level: 50, str: 0, agi: 0, int: 110 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_15', name: 'Obsidian Ring', nameDe: 'Obsidianring',
        archetype: 'any', slotType: 'ring',
        minLevel: 55,
        requirements: { level: 55, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_16', name: 'Starlight Ring', nameDe: 'Sternlichtring',
        archetype: 'any', slotType: 'ring',
        minLevel: 65,
        requirements: { level: 65, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_17', name: 'Titan Ring', nameDe: 'Titanenring',
        archetype: 'strength', slotType: 'ring',
        minLevel: 70,
        requirements: { level: 70, str: 180, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_18', name: 'Astral Ring', nameDe: 'Astralring',
        archetype: 'intellect', slotType: 'ring',
        minLevel: 75,
        requirements: { level: 75, str: 0, agi: 0, int: 190 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_19', name: 'Celestial Ring', nameDe: 'Himmelsring',
        archetype: 'any', slotType: 'ring',
        minLevel: 80,
        requirements: { level: 80, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'ring_20', name: 'Eternity Ring', nameDe: 'Ewigkeitsring',
        archetype: 'any', slotType: 'ring',
        minLevel: 85,
        requirements: { level: 85, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
];


//------------------------------------------------------------------------
//-------------------AMULET BASE TYPES------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_AMULET = [
    {
        id: 'amulet_1', name: 'Amber Amulet', nameDe: 'Bernstein-Amulett',
        archetype: 'any', slotType: 'amulet',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_2', name: 'Jade Amulet', nameDe: 'Jade-Amulett',
        archetype: 'any', slotType: 'amulet',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_3', name: 'Lapis Amulet', nameDe: 'Lapis-Amulett',
        archetype: 'intellect', slotType: 'amulet',
        minLevel: 10,
        requirements: { level: 10, str: 0, agi: 0, int: 30 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_4', name: 'Onyx Amulet', nameDe: 'Onyx-Amulett',
        archetype: 'strength', slotType: 'amulet',
        minLevel: 10,
        requirements: { level: 10, str: 30, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_5', name: 'Gold Amulet', nameDe: 'Gold-Amulett',
        archetype: 'any', slotType: 'amulet',
        minLevel: 20,
        requirements: { level: 20, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_6', name: 'Turquoise Amulet', nameDe: 'Türkis-Amulett',
        archetype: 'any', slotType: 'amulet',
        minLevel: 30,
        requirements: { level: 30, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_7', name: 'Opal Amulet', nameDe: 'Opal-Amulett',
        archetype: 'any', slotType: 'amulet',
        minLevel: 45,
        requirements: { level: 45, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_8', name: 'Phoenix Amulet', nameDe: 'Phönix-Amulett',
        archetype: 'strength', slotType: 'amulet',
        minLevel: 60,
        requirements: { level: 60, str: 160, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_9', name: 'Eclipse Amulet', nameDe: 'Finsternis-Amulett',
        archetype: 'any', slotType: 'amulet',
        minLevel: 90,
        requirements: { level: 90, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    // ── Mid / Endgame filler (35 – 85) ─────────────────────────────────
    {
        id: 'amulet_10', name: 'Carnelian Amulet', nameDe: 'Karneol-Amulett',
        archetype: 'strength', slotType: 'amulet',
        minLevel: 35,
        requirements: { level: 35, str: 75, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_11', name: 'Pearl Amulet', nameDe: 'Perlen-Amulett',
        archetype: 'any', slotType: 'amulet',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_12', name: 'Sapphire Amulet', nameDe: 'Saphir-Amulett',
        archetype: 'intellect', slotType: 'amulet',
        minLevel: 50,
        requirements: { level: 50, str: 0, agi: 0, int: 115 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_13', name: 'Ruby Amulet', nameDe: 'Rubin-Amulett',
        archetype: 'strength', slotType: 'amulet',
        minLevel: 55,
        requirements: { level: 55, str: 130, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_14', name: 'Moonstone Amulet', nameDe: 'Mondstein-Amulett',
        archetype: 'agility', slotType: 'amulet',
        minLevel: 65,
        requirements: { level: 65, str: 0, agi: 170, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_15', name: 'Starlight Amulet', nameDe: 'Sternlicht-Amulett',
        archetype: 'any', slotType: 'amulet',
        minLevel: 70,
        requirements: { level: 70, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_16', name: 'Dragon Amulet', nameDe: 'Drachen-Amulett',
        archetype: 'any', slotType: 'amulet',
        minLevel: 75,
        requirements: { level: 75, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_17', name: 'Astral Amulet', nameDe: 'Astral-Amulett',
        archetype: 'intellect', slotType: 'amulet',
        minLevel: 80,
        requirements: { level: 80, str: 0, agi: 0, int: 210 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'amulet_18', name: 'Void Amulet', nameDe: 'Leeren-Amulett',
        archetype: 'any', slotType: 'amulet',
        minLevel: 85,
        requirements: { level: 85, str: 0, agi: 0, int: 0 },
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
        id: 'pants_str_1', name: 'Rusted Greaves', nameDe: 'Rostige Beinschienen',
        archetype: 'strength', slotType: 'pants',
        minLevel: 1,
        requirements: { level: 1, str: 14, agi: 0, int: 0 },
        defenses: { armour: 15, evasion: 0, absorption: 0 },
    },
    {
        id: 'pants_str_2', name: 'Plated Legguards', nameDe: 'Plattenbeinschutz',
        archetype: 'strength', slotType: 'pants',
        minLevel: 6,
        requirements: { level: 6, str: 30, agi: 0, int: 0 },
        defenses: { armour: 40, evasion: 0, absorption: 0 },
    },
    {
        id: 'pants_str_3', name: 'Chausses', nameDe: 'Beinlinge',
        archetype: 'strength', slotType: 'pants',
        minLevel: 17,
        requirements: { level: 17, str: 72, agi: 0, int: 0 },
        defenses: { armour: 145, evasion: 0, absorption: 0 },
    },
    {
        id: 'pants_str_4', name: 'Plate Leggings', nameDe: 'Plattenleggings',
        archetype: 'strength', slotType: 'pants',
        minLevel: 26,
        requirements: { level: 26, str: 100, agi: 0, int: 0 },
        defenses: { armour: 310, evasion: 0, absorption: 0 },
    },

    // ── Agility ───────────────────────────────────────────────────────
    {
        id: 'pants_agi_1', name: 'Worn Britches', nameDe: 'Abgetragene Kniebundhose',
        archetype: 'agility', slotType: 'pants',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 14, int: 0 },
        defenses: { armour: 0, evasion: 16, absorption: 0 },
    },
    {
        id: 'pants_agi_2', name: 'Leather Leggings', nameDe: 'Lederleggings',
        archetype: 'agility', slotType: 'pants',
        minLevel: 6,
        requirements: { level: 6, str: 0, agi: 30, int: 0 },
        defenses: { armour: 0, evasion: 45, absorption: 0 },
    },
    {
        id: 'pants_agi_3', name: 'Hunter\'s Trousers', nameDe: 'Jägerhose',
        archetype: 'agility', slotType: 'pants',
        minLevel: 17,
        requirements: { level: 17, str: 0, agi: 72, int: 0 },
        defenses: { armour: 0, evasion: 160, absorption: 0 },
    },
    {
        id: 'pants_agi_4', name: 'Shadow Legwraps', nameDe: 'Schattenbeinwickel',
        archetype: 'agility', slotType: 'pants',
        minLevel: 26,
        requirements: { level: 26, str: 0, agi: 100, int: 0 },
        defenses: { armour: 0, evasion: 340, absorption: 0 },
    },

    // ── Intellect ─────────────────────────────────────────────────────
    {
        id: 'pants_int_1', name: 'Silk Pantaloons', nameDe: 'Seidenpluderhose',
        archetype: 'intellect', slotType: 'pants',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 14 },
        // Starter gear: base absorption reduced by 25% for balance.
        defenses: { armour: 0, evasion: 0, absorption: 9 },
    },
    {
        id: 'pants_int_2', name: 'Silk Skirt', nameDe: 'Seidenrock',
        archetype: 'intellect', slotType: 'pants',
        minLevel: 6,
        requirements: { level: 6, str: 0, agi: 0, int: 30 },
        defenses: { armour: 0, evasion: 0, absorption: 35 },
    },
    {
        id: 'pants_int_3', name: 'Sorcerer\'s Robes', nameDe: 'Roben des Magiers',
        archetype: 'intellect', slotType: 'pants',
        minLevel: 17,
        requirements: { level: 17, str: 0, agi: 0, int: 72 },
        defenses: { armour: 0, evasion: 0, absorption: 125 },
    },
    {
        id: 'pants_int_4', name: 'Arcane Legwraps', nameDe: 'Arkanbeinwickel',
        archetype: 'intellect', slotType: 'pants',
        minLevel: 26,
        requirements: { level: 26, str: 0, agi: 0, int: 100 },
        defenses: { armour: 0, evasion: 0, absorption: 260 },
    },

    // ── Endgame: Strength ─────────────────────────────────────────────
    {
        id: 'pants_str_5', name: 'Warlord Legplates', nameDe: 'Kriegsfürstenbeinplatten',
        archetype: 'strength', slotType: 'pants',
        minLevel: 40,
        requirements: { level: 40, str: 155, agi: 0, int: 0 },
        defenses: { armour: 540, evasion: 0, absorption: 0 },
    },
    {
        id: 'pants_str_6', name: 'Adamant Chausses', nameDe: 'Adamantbeinlinge',
        archetype: 'strength', slotType: 'pants',
        minLevel: 62,
        requirements: { level: 62, str: 240, agi: 0, int: 0 },
        defenses: { armour: 900, evasion: 0, absorption: 0 },
    },
    {
        id: 'pants_str_7', name: 'Colossus Legguards', nameDe: 'Kolossbeinschutz',
        archetype: 'strength', slotType: 'pants',
        minLevel: 88,
        requirements: { level: 88, str: 340, agi: 0, int: 0 },
        defenses: { armour: 1480, evasion: 0, absorption: 0 },
    },

    // ── Endgame: Agility ──────────────────────────────────────────────
    {
        id: 'pants_agi_5', name: 'Nightstalker Leggings', nameDe: 'Nachtpirscherleggings',
        archetype: 'agility', slotType: 'pants',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 155, int: 0 },
        defenses: { armour: 0, evasion: 590, absorption: 0 },
    },
    {
        id: 'pants_agi_6', name: 'Spectral Legwraps', nameDe: 'Spektralbeinwickel',
        archetype: 'agility', slotType: 'pants',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 240, int: 0 },
        defenses: { armour: 0, evasion: 985, absorption: 0 },
    },
    {
        id: 'pants_agi_7', name: 'Voidstalker Trousers', nameDe: 'Leerenpirscherhose',
        archetype: 'agility', slotType: 'pants',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 340, int: 0 },
        defenses: { armour: 0, evasion: 1620, absorption: 0 },
    },

    // ── Endgame: Intellect ────────────────────────────────────────────
    {
        id: 'pants_int_5', name: 'Etherweave Skirt', nameDe: 'Äthergewebe-Rock',
        archetype: 'intellect', slotType: 'pants',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 155 },
        defenses: { armour: 0, evasion: 0, absorption: 450 },
    },
    {
        id: 'pants_int_6', name: 'Celestial Pantaloons', nameDe: 'Himmelspluderhose',
        archetype: 'intellect', slotType: 'pants',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 0, int: 240 },
        defenses: { armour: 0, evasion: 0, absorption: 750 },
    },
    {
        id: 'pants_int_7', name: 'Voidcloth Robes', nameDe: 'Leerenstoffroben',
        archetype: 'intellect', slotType: 'pants',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 0, int: 340 },
        defenses: { armour: 0, evasion: 0, absorption: 1230 },
    },

    // ── Endgame II: Strength ──────────────────────────────────────────
    {
        id: 'pants_str_8', name: 'Guardian Legplates', nameDe: 'Wächterbeinplatten',
        archetype: 'strength', slotType: 'pants',
        minLevel: 56,
        requirements: { level: 56, str: 216, agi: 0, int: 0 },
        defenses: { armour: 810, evasion: 0, absorption: 0 },
    },
    {
        id: 'pants_str_9', name: 'Greaves of Convergence', nameDe: 'Beinschienen der Konvergenz',
        archetype: 'strength', slotType: 'pants',
        minLevel: 66,
        requirements: { level: 66, str: 264, agi: 0, int: 0 },
        defenses: { armour: 1020, evasion: 0, absorption: 0 },
    },

    // ── Endgame II: Agility ───────────────────────────────────────────
    {
        id: 'pants_agi_8', name: 'Windwhisper Leggings', nameDe: 'Windflüster-Leggings',
        archetype: 'agility', slotType: 'pants',
        minLevel: 56,
        requirements: { level: 56, str: 0, agi: 216, int: 0 },
        defenses: { armour: 0, evasion: 885, absorption: 0 },
    },
    {
        id: 'pants_agi_9', name: 'Trousers of the Event Horizon', nameDe: 'Hose des Ereignishorizonts',
        archetype: 'agility', slotType: 'pants',
        minLevel: 66,
        requirements: { level: 66, str: 0, agi: 264, int: 0 },
        defenses: { armour: 0, evasion: 1110, absorption: 0 },
    },

    // ── Endgame II: Intellect ─────────────────────────────────────────
    {
        id: 'pants_int_8', name: 'Dreamweave Skirt', nameDe: 'Traumgewebe-Rock',
        archetype: 'intellect', slotType: 'pants',
        minLevel: 56,
        requirements: { level: 56, str: 0, agi: 0, int: 216 },
        defenses: { armour: 0, evasion: 0, absorption: 675 },
    },
    {
        id: 'pants_int_9', name: 'Legwraps of Entropy', nameDe: 'Beinwickel der Entropie',
        archetype: 'intellect', slotType: 'pants',
        minLevel: 66,
        requirements: { level: 66, str: 0, agi: 0, int: 264 },
        defenses: { armour: 0, evasion: 0, absorption: 850 },
    },
];

//------------------------------------------------------------------------
//-------------------SHOULDERS BASE TYPES---------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_SHOULDERS = [
    {
        id: 'shoulders_str_1', name: 'Spaulders', nameDe: 'Schulterplatten',
        archetype: 'strength', slotType: 'shoulders',
        minLevel: 1,
        requirements: { level: 1, str: 22, agi: 0, int: 0 },
        defenses: { armour: 20, evasion: 0, absorption: 0 },
    },
    {
        id: 'shoulders_str_2', name: 'Pauldrons', nameDe: 'Pauldrons',
        archetype: 'strength', slotType: 'shoulders',
        minLevel: 16,
        requirements: { level: 16, str: 65, agi: 0, int: 0 },
        defenses: { armour: 110, evasion: 0, absorption: 0 },
    },
    {
        id: 'shoulders_agi_1', name: 'Padded Shoulders', nameDe: 'Gepolsterte Schultern',
        archetype: 'agility', slotType: 'shoulders',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 22, int: 0 },
        defenses: { armour: 0, evasion: 24, absorption: 0 },
    },
    {
        id: 'shoulders_agi_2', name: 'Epaulets', nameDe: 'Epauletten',
        archetype: 'agility', slotType: 'shoulders',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 65, int: 0 },
        defenses: { armour: 0, evasion: 125, absorption: 0 },
    },
    {
        id: 'shoulders_int_1', name: 'Shawl', nameDe: 'Schultertuch',
        archetype: 'intellect', slotType: 'shoulders',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 22 },
        defenses: { armour: 0, evasion: 0, absorption: 18 },
    },
    {
        id: 'shoulders_int_2', name: 'Silk Shoulderguards', nameDe: 'Seidenschulterschutz',
        archetype: 'intellect', slotType: 'shoulders',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 0, int: 65 },
        defenses: { armour: 0, evasion: 0, absorption: 90 },
    },

    // ── Endgame: Strength ─────────────────────────────────────────────
    {
        id: 'shoulders_str_3', name: 'Fortress Pauldrons', nameDe: 'Festungspauldrons',
        archetype: 'strength', slotType: 'shoulders',
        minLevel: 44,
        requirements: { level: 44, str: 179, agi: 0, int: 0 },
        defenses: { armour: 300, evasion: 0, absorption: 0 },
    },
    {
        id: 'shoulders_str_4', name: 'Titan Pauldrons', nameDe: 'Titanenpauldrons',
        archetype: 'strength', slotType: 'shoulders',
        minLevel: 80,
        requirements: { level: 80, str: 325, agi: 0, int: 0 },
        defenses: { armour: 560, evasion: 0, absorption: 0 },
    },

    // ── Endgame: Agility ──────────────────────────────────────────────
    {
        id: 'shoulders_agi_3', name: 'Stormwing Epaulets', nameDe: 'Sturmflügel-Epauletten',
        archetype: 'agility', slotType: 'shoulders',
        minLevel: 44,
        requirements: { level: 44, str: 0, agi: 179, int: 0 },
        defenses: { armour: 0, evasion: 340, absorption: 0 },
    },
    {
        id: 'shoulders_agi_4', name: 'Nightlord Epaulets', nameDe: 'Nachtfürsten-Epauletten',
        archetype: 'agility', slotType: 'shoulders',
        minLevel: 80,
        requirements: { level: 80, str: 0, agi: 325, int: 0 },
        defenses: { armour: 0, evasion: 640, absorption: 0 },
    },

    // ── Endgame: Intellect ────────────────────────────────────────────
    {
        id: 'shoulders_int_3', name: 'Astral Shawl', nameDe: 'Astralschultertuch',
        archetype: 'intellect', slotType: 'shoulders',
        minLevel: 44,
        requirements: { level: 44, str: 0, agi: 0, int: 179 },
        defenses: { armour: 0, evasion: 0, absorption: 245 },
    },
    {
        id: 'shoulders_int_4', name: 'Starweave Shoulderguards', nameDe: 'Sterngewebe-Schulterschutz',
        archetype: 'intellect', slotType: 'shoulders',
        minLevel: 80,
        requirements: { level: 80, str: 0, agi: 0, int: 325 },
        defenses: { armour: 0, evasion: 0, absorption: 460 },
    },

    // ── Endgame II: Strength ──────────────────────────────────────────
    {
        id: 'shoulders_str_5', name: 'Sentinel Pauldrons', nameDe: 'Wachpostenpauldrons',
        archetype: 'strength', slotType: 'shoulders',
        minLevel: 52,
        requirements: { level: 52, str: 214, agi: 0, int: 0 },
        defenses: { armour: 365, evasion: 0, absorption: 0 },
    },

    // ── Endgame II: Agility ───────────────────────────────────────────
    {
        id: 'shoulders_agi_5', name: 'Falconer Epaulets', nameDe: 'Falkner-Epauletten',
        archetype: 'agility', slotType: 'shoulders',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 214, int: 0 },
        defenses: { armour: 0, evasion: 413, absorption: 0 },
    },

    // ── Endgame II: Intellect ─────────────────────────────────────────
    {
        id: 'shoulders_int_5', name: 'Nebular Shawl', nameDe: 'Nebelschultertuch',
        archetype: 'intellect', slotType: 'shoulders',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 0, int: 214 },
        defenses: { armour: 0, evasion: 0, absorption: 298 },
    },
];

//------------------------------------------------------------------------
//-------------------CLOAK BASE TYPES-------------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_CLOAK = [
    {
        id: 'cloak_str_1', name: 'Heavy Cape', nameDe: 'Schwerer Umhang',
        archetype: 'strength', slotType: 'cloak',
        minLevel: 1,
        requirements: { level: 1, str: 24, agi: 0, int: 0 },
        defenses: { armour: 25, evasion: 0, absorption: 0 },
    },
    {
        id: 'cloak_agi_1', name: 'Mantle', nameDe: 'Mantel',
        archetype: 'agility', slotType: 'cloak',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 24, int: 0 },
        defenses: { armour: 0, evasion: 28, absorption: 0 },
    },
    {
        id: 'cloak_int_1', name: 'Drape', nameDe: 'Draperie',
        archetype: 'intellect', slotType: 'cloak',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 24 },
        defenses: { armour: 0, evasion: 0, absorption: 22 },
    },
    {
        id: 'cloak_any_1', name: 'Wrap', nameDe: 'Wickeltuch',
        archetype: 'str_agi', slotType: 'cloak',
        minLevel: 17,
        requirements: { level: 17, str: 45, agi: 45, int: 0 },
        defenses: { armour: 70, evasion: 70, absorption: 0 },
    },
    {
        id: 'cloak_any_2', name: 'Mystic Cloak', nameDe: 'Mystischer Umhang',
        archetype: 'agi_int', slotType: 'cloak',
        minLevel: 17,
        requirements: { level: 17, str: 0, agi: 45, int: 45 },
        defenses: { armour: 0, evasion: 70, absorption: 55 },
    },

    // ── Endgame: Strength ─────────────────────────────────────────────
    {
        id: 'cloak_str_2', name: 'Warlord Cape', nameDe: 'Kriegsfürstenumhang',
        archetype: 'strength', slotType: 'cloak',
        minLevel: 44,
        requirements: { level: 44, str: 135, agi: 0, int: 0 },
        defenses: { armour: 150, evasion: 0, absorption: 0 },
    },
    {
        id: 'cloak_str_3', name: 'Dragonscale Cape', nameDe: 'Drachenschuppenumhang',
        archetype: 'strength', slotType: 'cloak',
        minLevel: 80,
        requirements: { level: 80, str: 245, agi: 0, int: 0 },
        defenses: { armour: 290, evasion: 0, absorption: 0 },
    },

    // ── Endgame: Agility ──────────────────────────────────────────────
    {
        id: 'cloak_agi_2', name: 'Phantom Cloak', nameDe: 'Phantomumhang',
        archetype: 'agility', slotType: 'cloak',
        minLevel: 44,
        requirements: { level: 44, str: 0, agi: 135, int: 0 },
        defenses: { armour: 0, evasion: 168, absorption: 0 },
    },
    {
        id: 'cloak_agi_3', name: 'Nightwind Mantle', nameDe: 'Nachtwindmantel',
        archetype: 'agility', slotType: 'cloak',
        minLevel: 80,
        requirements: { level: 80, str: 0, agi: 245, int: 0 },
        defenses: { armour: 0, evasion: 325, absorption: 0 },
    },

    // ── Endgame: Intellect ────────────────────────────────────────────
    {
        id: 'cloak_int_2', name: 'Runed Drape', nameDe: 'Runendraperie',
        archetype: 'intellect', slotType: 'cloak',
        minLevel: 44,
        requirements: { level: 44, str: 0, agi: 0, int: 135 },
        defenses: { armour: 0, evasion: 0, absorption: 132 },
    },
    {
        id: 'cloak_int_3', name: 'Cosmic Drape', nameDe: 'Kosmische Draperie',
        archetype: 'intellect', slotType: 'cloak',
        minLevel: 80,
        requirements: { level: 80, str: 0, agi: 0, int: 245 },
        defenses: { armour: 0, evasion: 0, absorption: 255 },
    },

    // ── Endgame: Hybrids ──────────────────────────────────────────────
    {
        id: 'cloak_any_3', name: 'Champion Wrap', nameDe: 'Championwickeltuch',
        archetype: 'str_agi', slotType: 'cloak',
        minLevel: 60,
        requirements: { level: 60, str: 159, agi: 159, int: 0 },
        defenses: { armour: 260, evasion: 260, absorption: 0 },
    },
    {
        id: 'cloak_any_4', name: 'Aurora Cloak', nameDe: 'Auroraumhang',
        archetype: 'agi_int', slotType: 'cloak',
        minLevel: 60,
        requirements: { level: 60, str: 0, agi: 159, int: 159 },
        defenses: { armour: 0, evasion: 260, absorption: 205 },
    },

    // ── Endgame II: Strength ──────────────────────────────────────────
    {
        id: 'cloak_str_4', name: 'Rampart Cape', nameDe: 'Wallumhang',
        archetype: 'strength', slotType: 'cloak',
        minLevel: 52,
        requirements: { level: 52, str: 160, agi: 0, int: 0 },
        defenses: { armour: 185, evasion: 0, absorption: 0 },
    },

    // ── Endgame II: Agility ───────────────────────────────────────────
    {
        id: 'cloak_agi_4', name: 'Shroud of Whispers', nameDe: 'Schleier des Flüsterns',
        archetype: 'agility', slotType: 'cloak',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 160, int: 0 },
        defenses: { armour: 0, evasion: 208, absorption: 0 },
    },

    // ── Endgame II: Intellect ─────────────────────────────────────────
    {
        id: 'cloak_int_4', name: 'Zenith Drape', nameDe: 'Zenitdraperie',
        archetype: 'intellect', slotType: 'cloak',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 0, int: 160 },
        defenses: { armour: 0, evasion: 0, absorption: 163 },
    },
];

//------------------------------------------------------------------------
//-------------------BRACERS BASE TYPES-----------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_BRACERS = [
    {
        id: 'bracers_str_1', name: 'Steel Vambraces', nameDe: 'Stählerne Unterarmschienen',
        archetype: 'strength', slotType: 'bracers',
        minLevel: 1,
        requirements: { level: 1, str: 18, agi: 0, int: 0 },
        defenses: { armour: 12, evasion: 0, absorption: 0 },
    },
    {
        id: 'bracers_str_2', name: 'Plated Armguards', nameDe: 'Plattenarmschutz',
        archetype: 'strength', slotType: 'bracers',
        minLevel: 20,
        requirements: { level: 20, str: 70, agi: 0, int: 0 },
        defenses: { armour: 85, evasion: 0, absorption: 0 },
    },
    {
        id: 'bracers_agi_1', name: 'Leather Bindings', nameDe: 'Lederbindungen',
        archetype: 'agility', slotType: 'bracers',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 18, int: 0 },
        defenses: { armour: 0, evasion: 14, absorption: 0 },
    },
    {
        id: 'bracers_agi_2', name: 'Studded Cuffs', nameDe: 'Nietenmanschetten',
        archetype: 'agility', slotType: 'bracers',
        minLevel: 20,
        requirements: { level: 20, str: 0, agi: 70, int: 0 },
        defenses: { armour: 0, evasion: 95, absorption: 0 },
    },
    {
        id: 'bracers_int_1', name: 'Runed Bracer', nameDe: 'Runen-Armschiene',
        archetype: 'intellect', slotType: 'bracers',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 18 },
        defenses: { armour: 0, evasion: 0, absorption: 10 },
    },
    {
        id: 'bracers_int_2', name: 'Enchanted Wristbands', nameDe: 'Verzauberte Handgelenkbänder',
        archetype: 'intellect', slotType: 'bracers',
        minLevel: 20,
        requirements: { level: 20, str: 0, agi: 0, int: 70 },
        defenses: { armour: 0, evasion: 0, absorption: 65 },
    },

    // ── Endgame: Strength ─────────────────────────────────────────────
    {
        id: 'bracers_str_3', name: 'Warforge Vambraces', nameDe: 'Kriegsschmiede-Unterarmschienen',
        archetype: 'strength', slotType: 'bracers',
        minLevel: 44,
        requirements: { level: 44, str: 154, agi: 0, int: 0 },
        defenses: { armour: 185, evasion: 0, absorption: 0 },
    },
    {
        id: 'bracers_str_4', name: 'Colossus Vambraces', nameDe: 'Kolossunterarmschienen',
        archetype: 'strength', slotType: 'bracers',
        minLevel: 80,
        requirements: { level: 80, str: 280, agi: 0, int: 0 },
        defenses: { armour: 350, evasion: 0, absorption: 0 },
    },

    // ── Endgame: Agility ──────────────────────────────────────────────
    {
        id: 'bracers_agi_3', name: 'Serpent Bindings', nameDe: 'Schlangenbindungen',
        archetype: 'agility', slotType: 'bracers',
        minLevel: 44,
        requirements: { level: 44, str: 0, agi: 154, int: 0 },
        defenses: { armour: 0, evasion: 205, absorption: 0 },
    },
    {
        id: 'bracers_agi_4', name: 'Nightshade Bindings', nameDe: 'Nachtschattenbindungen',
        archetype: 'agility', slotType: 'bracers',
        minLevel: 80,
        requirements: { level: 80, str: 0, agi: 280, int: 0 },
        defenses: { armour: 0, evasion: 390, absorption: 0 },
    },

    // ── Endgame: Intellect ────────────────────────────────────────────
    {
        id: 'bracers_int_3', name: 'Astral Bracer', nameDe: 'Astral-Armschiene',
        archetype: 'intellect', slotType: 'bracers',
        minLevel: 44,
        requirements: { level: 44, str: 0, agi: 0, int: 154 },
        defenses: { armour: 0, evasion: 0, absorption: 140 },
    },
    {
        id: 'bracers_int_4', name: 'Cosmic Wristbands', nameDe: 'Kosmische Handgelenkbänder',
        archetype: 'intellect', slotType: 'bracers',
        minLevel: 80,
        requirements: { level: 80, str: 0, agi: 0, int: 280 },
        defenses: { armour: 0, evasion: 0, absorption: 265 },
    },

    // ── Endgame II: Strength ──────────────────────────────────────────
    {
        id: 'bracers_str_5', name: 'Bulwark Vambraces', nameDe: 'Bollwerk-Unterarmschienen',
        archetype: 'strength', slotType: 'bracers',
        minLevel: 52,
        requirements: { level: 52, str: 171, agi: 0, int: 0 },
        defenses: { armour: 222, evasion: 0, absorption: 0 },
    },

    // ── Endgame II: Agility ───────────────────────────────────────────
    {
        id: 'bracers_agi_5', name: 'Adder Bindings', nameDe: 'Natterbindungen',
        archetype: 'agility', slotType: 'bracers',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 171, int: 0 },
        defenses: { armour: 0, evasion: 247, absorption: 0 },
    },

    // ── Endgame II: Intellect ─────────────────────────────────────────
    {
        id: 'bracers_int_5', name: 'Sigil Wristbands', nameDe: 'Sigillen-Handgelenkbänder',
        archetype: 'intellect', slotType: 'bracers',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 0, int: 171 },
        defenses: { armour: 0, evasion: 0, absorption: 167 },
    },
];


//------------------------------------------------------------------------
//-------------------TALISMAN BASE TYPES----------------------------------
//------------------------------------------------------------------------
const EG_BASE_TYPES_TALISMAN = [
    {
        id: 'talisman_1', name: 'Bone Charm', nameDe: 'Knochenamulett',
        archetype: 'any', slotType: 'talisman',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_2', name: 'Wooden Fetish', nameDe: 'Holz-Fetisch',
        archetype: 'intellect', slotType: 'talisman',
        minLevel: 11,
        requirements: { level: 11, str: 0, agi: 0, int: 35 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_3', name: 'Ancient Relic', nameDe: 'Uraltes Relikt',
        archetype: 'any', slotType: 'talisman',
        minLevel: 21,
        requirements: { level: 21, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_4', name: 'Elder Talisman', nameDe: 'Talisman der Ältesten',
        archetype: 'any', slotType: 'talisman',
        minLevel: 31,
        requirements: { level: 31, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_5', name: 'Serpent Talisman', nameDe: 'Schlangentalisman',
        archetype: 'any', slotType: 'talisman',
        minLevel: 45,
        requirements: { level: 45, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_6', name: 'Idol of Ages', nameDe: 'Götze der Zeitalter',
        archetype: 'any', slotType: 'talisman',
        minLevel: 90,
        requirements: { level: 90, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    // ── Filler 45 → 90 (every 5–6 levels) ──────────────────────────────
    {
        id: 'talisman_7b', name: 'Bronze Totem', nameDe: 'Bronzetotem',
        archetype: 'any', slotType: 'talisman',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_7', name: 'Obsidian Talisman', nameDe: 'Obsidian-Talisman',
        archetype: 'any', slotType: 'talisman',
        minLevel: 50,
        requirements: { level: 50, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_8', name: 'Gilded Idol', nameDe: 'Vergoldeter Götze',
        archetype: 'strength', slotType: 'talisman',
        minLevel: 55,
        requirements: { level: 55, str: 125, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_9', name: 'Runed Totem', nameDe: 'Runentotem',
        archetype: 'intellect', slotType: 'talisman',
        minLevel: 60,
        requirements: { level: 60, str: 0, agi: 0, int: 145 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_10', name: 'Storm Talisman', nameDe: 'Sturmtalisman',
        archetype: 'agility', slotType: 'talisman',
        minLevel: 65,
        requirements: { level: 65, str: 0, agi: 165, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_11', name: 'Celestial Totem', nameDe: 'Himmelstotem',
        archetype: 'any', slotType: 'talisman',
        minLevel: 70,
        requirements: { level: 70, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_12', name: 'Astral Talisman', nameDe: 'Astraltalisman',
        archetype: 'intellect', slotType: 'talisman',
        minLevel: 75,
        requirements: { level: 75, str: 0, agi: 0, int: 200 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_13', name: 'Ebon Idol', nameDe: 'Ebenholzgötze',
        archetype: 'any', slotType: 'talisman',
        minLevel: 80,
        requirements: { level: 80, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_14', name: 'Void Talisman', nameDe: 'Leerentalisman',
        archetype: 'any', slotType: 'talisman',
        minLevel: 85,
        requirements: { level: 85, str: 0, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 0 },
    },
    {
        id: 'talisman_15', name: 'Heart of Eternity', nameDe: 'Herz der Ewigkeit',
        archetype: 'any', slotType: 'talisman',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 0, int: 0 },
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
        id: 'arcane_1', name: 'Crystal Orb', nameDe: 'Kristallkugel',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 1,
        requirements: { level: 1, str: 0, agi: 0, int: 25 },
        defenses: { armour: 0, evasion: 0, absorption: 15 },
    },
    {
        id: 'arcane_2', name: 'Prism', nameDe: 'Prisma',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 8,
        requirements: { level: 8, str: 0, agi: 0, int: 45 },
        defenses: { armour: 0, evasion: 0, absorption: 40 },
    },
    {
        id: 'arcane_3', name: 'Grimoire', nameDe: 'Grimoire',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 0, int: 75 },
        defenses: { armour: 0, evasion: 0, absorption: 95 },
    },
    {
        id: 'arcane_4', name: 'Forbidden Tome', nameDe: 'Verbotener Foliant',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 0, int: 110 },
        defenses: { armour: 0, evasion: 0, absorption: 180 },
    },
    {
        id: 'arcane_5', name: 'Astrolabe', nameDe: 'Astrolabium',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 157 },
        defenses: { armour: 0, evasion: 0, absorption: 315 },
    },
    {
        id: 'arcane_6', name: 'Astral Orb', nameDe: 'Astralkugel',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 0, int: 244 },
        defenses: { armour: 0, evasion: 0, absorption: 520 },
    },
    {
        id: 'arcane_7', name: 'Eye of the Void', nameDe: 'Auge der Leere',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 88,
        requirements: { level: 88, str: 0, agi: 0, int: 347 },
        defenses: { armour: 0, evasion: 0, absorption: 860 },
    },
    // ── Filler – smooth progression across all brackets ────────────────
    {
        id: 'arcane_8', name: 'Shimmering Shard', nameDe: 'Schimmernde Scherbe',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 12,
        requirements: { level: 12, str: 0, agi: 0, int: 55 },
        defenses: { armour: 0, evasion: 0, absorption: 65 },
    },
    {
        id: 'arcane_9', name: 'Arcane Globe', nameDe: 'Arkankugel',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 22,
        requirements: { level: 22, str: 0, agi: 0, int: 85 },
        defenses: { armour: 0, evasion: 0, absorption: 135 },
    },
    {
        id: 'arcane_10', name: 'Enchanted Codex', nameDe: 'Verzauberter Kodex',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 35,
        requirements: { level: 35, str: 0, agi: 0, int: 135 },
        defenses: { armour: 0, evasion: 0, absorption: 250 },
    },
    {
        id: 'arcane_11', name: 'Runed Lens', nameDe: 'Runenlinse',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 45,
        requirements: { level: 45, str: 0, agi: 0, int: 175 },
        defenses: { armour: 0, evasion: 0, absorption: 360 },
    },
    {
        id: 'arcane_12', name: 'Mystic Eye', nameDe: 'Mystisches Auge',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 50,
        requirements: { level: 50, str: 0, agi: 0, int: 195 },
        defenses: { armour: 0, evasion: 0, absorption: 400 },
    },
    {
        id: 'arcane_13', name: 'Chrono Orb', nameDe: 'Chronokugel',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 55,
        requirements: { level: 55, str: 0, agi: 0, int: 215 },
        defenses: { armour: 0, evasion: 0, absorption: 460 },
    },
    {
        id: 'arcane_14', name: 'Nebula Tome', nameDe: 'Nebelfoliant',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 65,
        requirements: { level: 65, str: 0, agi: 0, int: 260 },
        defenses: { armour: 0, evasion: 0, absorption: 580 },
    },
    {
        id: 'arcane_15', name: 'Starheart Focus', nameDe: 'Sternherz-Fokus',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 70,
        requirements: { level: 70, str: 0, agi: 0, int: 285 },
        defenses: { armour: 0, evasion: 0, absorption: 640 },
    },
    {
        id: 'arcane_16', name: 'Abyssal Prism', nameDe: 'Abgrundprisma',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 75,
        requirements: { level: 75, str: 0, agi: 0, int: 305 },
        defenses: { armour: 0, evasion: 0, absorption: 700 },
    },
    {
        id: 'arcane_17', name: 'Celestial Astrolabe', nameDe: 'Himmelsastrolabium',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 80,
        requirements: { level: 80, str: 0, agi: 0, int: 325 },
        defenses: { armour: 0, evasion: 0, absorption: 780 },
    },
    {
        id: 'arcane_18', name: 'Infinity Core', nameDe: 'Unendlichkeitskern',
        archetype: 'intellect', slotType: 'arcane',
        minLevel: 85,
        requirements: { level: 85, str: 0, agi: 0, int: 340 },
        defenses: { armour: 0, evasion: 0, absorption: 830 },
    },
];

//========================================================================
//-------------------ARMOR GAP AUTO-FILL----------------------------------
//========================================================================
// Ensures every armor slot has continuous progression for all 6 archetypes:
// raw: strength / agility / intellect
// hybrids: str_agi / str_int / agi_int
// Fills any gap >10 levels by interpolating defenses & requirements from
// existing entries. Also synthesizes missing hybrid families (pants,
// shoulders, bracers) from their raw components.
// Runs AFTER all base arrays are defined (placed before EG_ALL_BASE_TYPES).
(() => {
    const armorSlots = [
        { arr: EG_BASE_TYPES_HEAD, slot: 'head' },
        { arr: EG_BASE_TYPES_CHEST, slot: 'chest' },
        { arr: EG_BASE_TYPES_PANTS, slot: 'pants' },
        { arr: EG_BASE_TYPES_SHOULDERS, slot: 'shoulders' },
        { arr: EG_BASE_TYPES_CLOAK, slot: 'cloak' },
        { arr: EG_BASE_TYPES_BRACERS, slot: 'bracers' },
        { arr: EG_BASE_TYPES_GLOVES, slot: 'gloves' },
        { arr: EG_BASE_TYPES_BOOTS, slot: 'boots' },
        { arr: EG_BASE_TYPES_BELT, slot: 'belt' },
    ];
    const archetypes = ['strength','agility','intellect','str_agi','str_int','agi_int'];
    const archLabel = { strength:'Bulwark', agility:'Wind', intellect:'Arcane', str_agi:'Skirmisher', str_int:'Templar', agi_int:'Mystic' };
    const archLabelDe = { strength:'Bollwerk', agility:'Wind', intellect:'Arkan', str_agi:'Plänkler', str_int:'Templer', agi_int:'Mystiker' };
    const slotLabel = { head:'Helm', chest:'Cuirass', pants:'Legguards', shoulders:'Pauldrons', cloak:'Cloak', bracers:'Vambraces', gloves:'Grips', boots:'Greaves', belt:'Girdle' };
    const slotLabelDe = { head:'Helm', chest:'Kürass', pants:'Beinschutz', shoulders:'Pauldrons', cloak:'Umhang', bracers:'Armschienen', gloves:'Griffe', boots:'Beinschienen', belt:'Gürtel' };

    function interpFor(arr, arch, level) {
        const filtered = arr.filter(e => e.archetype === arch).sort((a,b)=>a.minLevel-b.minLevel);
        if (filtered.length===0) return null;
        for (let i=0;i<filtered.length;i++) if (filtered[i].minLevel===level) return { def: {...filtered[i].defenses}, req: {...filtered[i].requirements} };
        let lower=null, upper=null;
        for (let e of filtered) {
            if (e.minLevel < level) lower=e;
            else if (e.minLevel > level && !upper) { upper=e; break; }
        }
        if (lower && upper) {
            const t=(level - lower.minLevel)/(upper.minLevel - lower.minLevel);
            return {
                def: {
                    armour: Math.round(lower.defenses.armour + (upper.defenses.armour - lower.defenses.armour)*t),
                    evasion: Math.round(lower.defenses.evasion + (upper.defenses.evasion - lower.defenses.evasion)*t),
                    absorption: Math.round(lower.defenses.absorption + (upper.defenses.absorption - lower.defenses.absorption)*t),
                },
                req: {
                    level: level,
                    str: Math.round(lower.requirements.str + (upper.requirements.str - lower.requirements.str)*t),
                    agi: Math.round(lower.requirements.agi + (upper.requirements.agi - lower.requirements.agi)*t),
                    int: Math.round(lower.requirements.int + (upper.requirements.int - lower.requirements.int)*t),
                }
            };
        }
        if (lower && !upper) {
            if (filtered.length>=2) {
                const a=filtered[filtered.length-2], b=filtered[filtered.length-1];
                const span=b.minLevel - a.minLevel || 1;
                const slopeA=(b.defenses.armour - a.defenses.armour)/span;
                const slopeE=(b.defenses.evasion - a.defenses.evasion)/span;
                const slopeAb=(b.defenses.absorption - a.defenses.absorption)/span;
                const slopeS=(b.requirements.str - a.requirements.str)/span;
                const slopeAg=(b.requirements.agi - a.requirements.agi)/span;
                const slopeI=(b.requirements.int - a.requirements.int)/span;
                const d=level - b.minLevel;
                return {
                    def: {
                        armour: Math.max(0, Math.round(b.defenses.armour + slopeA*d)),
                        evasion: Math.max(0, Math.round(b.defenses.evasion + slopeE*d)),
                        absorption: Math.max(0, Math.round(b.defenses.absorption + slopeAb*d)),
                    },
                    req: {
                        level: level,
                        str: Math.max(0, Math.round(b.requirements.str + slopeS*d)),
                        agi: Math.max(0, Math.round(b.requirements.agi + slopeAg*d)),
                        int: Math.max(0, Math.round(b.requirements.int + slopeI*d)),
                    }
                };
            } else {
                const s=level / (lower.minLevel||1);
                return {
                    def: {
                        armour: Math.round(lower.defenses.armour*s),
                        evasion: Math.round(lower.defenses.evasion*s),
                        absorption: Math.round(lower.defenses.absorption*s),
                    },
                    req: {
                        level: level,
                        str: Math.round(lower.requirements.str*s),
                        agi: Math.round(lower.requirements.agi*s),
                        int: Math.round(lower.requirements.int*s),
                    }
                };
            }
        }
        if (!lower && upper) {
            if (filtered.length>=2) {
                const a=filtered[0], b=filtered[1];
                const span=b.minLevel - a.minLevel || 1;
                const d=level - a.minLevel;
                return {
                    def: {
                        armour: Math.max(0, Math.round(a.defenses.armour + (b.defenses.armour - a.defenses.armour)/span*d)),
                        evasion: Math.max(0, Math.round(a.defenses.evasion + (b.defenses.evasion - a.defenses.evasion)/span*d)),
                        absorption: Math.max(0, Math.round(a.defenses.absorption + (b.defenses.absorption - a.defenses.absorption)/span*d)),
                    },
                    req: {
                        level: level,
                        str: Math.max(0, Math.round(a.requirements.str + (b.requirements.str - a.requirements.str)/span*d)),
                        agi: Math.max(0, Math.round(a.requirements.agi + (b.requirements.agi - a.requirements.agi)/span*d)),
                        int: Math.max(0, Math.round(a.requirements.int + (b.requirements.int - a.requirements.int)/span*d)),
                    }
                };
            }
            return { def: {...upper.defenses}, req: { level: level, str: upper.requirements.str, agi: upper.requirements.agi, int: upper.requirements.int } };
        }
        return null;
    }

    function hybridFromRaw(slotArr, arch, level) {
        let resA=null, resB=null;
        if (arch==='str_agi') { resA=interpFor(slotArr,'strength',level); resB=interpFor(slotArr,'agility',level); }
        else if (arch==='str_int') { resA=interpFor(slotArr,'strength',level); resB=interpFor(slotArr,'intellect',level); }
        else if (arch==='agi_int') { resA=interpFor(slotArr,'agility',level); resB=interpFor(slotArr,'intellect',level); }
        if (!resA || !resB) return null;
        let def={}, req={ level: level, str:0, agi:0, int:0 };
        if (arch==='str_agi') {
            def={ armour: Math.round(resA.def.armour*0.62), evasion: Math.round(resB.def.evasion*0.62), absorption:0 };
            req.str=Math.round(resA.req.str*0.65); req.agi=Math.round(resB.req.agi*0.65);
        } else if (arch==='str_int') {
            def={ armour: Math.round(resA.def.armour*0.62), evasion:0, absorption: Math.round(resB.def.absorption*0.62) };
            req.str=Math.round(resA.req.str*0.65); req.int=Math.round(resB.req.int*0.65);
        } else {
            def={ armour:0, evasion: Math.round(resA.def.evasion*0.62), absorption: Math.round(resB.def.absorption*0.62) };
            req.agi=Math.round(resA.req.agi*0.65); req.int=Math.round(resB.req.int*0.65);
        }
        return { def, req };
    }

    for (let slotInfo of armorSlots) {
        const arr=slotInfo.arr;
        const slot=slotInfo.slot;
        for (let arch of archetypes) {
            let existing = arr.filter(e=>e.archetype===arch).sort((a,b)=>a.minLevel-b.minLevel);
            let desiredLevels=[];
            if (existing.length===0) {
                desiredLevels=[4,13,22,32,42,52,62,70,80,88];
            } else {
                let levels=existing.map(e=>e.minLevel).sort((a,b)=>a-b);
                let toAdd=new Set();
                let changed=true;
                while (changed) {
                    changed=false;
                    let cur=[...new Set([...levels, ...toAdd])].sort((a,b)=>a-b);
                    for (let i=0;i<cur.length-1;i++) {
                        if (cur[i+1]-cur[i] > 10) {
                            const mid=Math.floor((cur[i]+cur[i+1])/2);
                            if (!cur.includes(mid) && !toAdd.has(mid)) { toAdd.add(mid); changed=true; break; }
                        }
                    }
                    if (!changed) {
                        const maxLvl=Math.max(...cur);
                        if (maxLvl < 88) {
                            if (88 - maxLvl > 10) {
                                const mid=Math.floor((maxLvl+88)/2);
                                if (!cur.includes(mid)) { toAdd.add(mid); changed=true; }
                            } else if (!cur.includes(88)) { toAdd.add(88); changed=true; }
                        }
                    }
                }
                desiredLevels=[...toAdd];
            }
            for (let lvl of desiredLevels) {
                if (arr.some(e=>e.minLevel===lvl && e.archetype===arch)) continue;
                let interp=interpFor(arr, arch, lvl);
                if (!interp && (arch==='str_agi'||arch==='str_int'||arch==='agi_int')) {
                    interp=hybridFromRaw(arr, arch, lvl);
                }
                if (!interp) continue;
                const id=`${slot}_${arch}_${lvl}_auto`;
                const name=`${archLabel[arch]} ${slotLabel[slot]} ${lvl}`;
                const nameDe=`${archLabelDe[arch]}-${slotLabelDe[slot]} ${lvl}`;
                arr.push({
                    id: id,
                    name: name,
                    nameDe: nameDe,
                    archetype: arch,
                    slotType: slot,
                    minLevel: lvl,
                    requirements: interp.req,
                    defenses: interp.def,
                });
            }
        }
    }
})();


//------------------------------------------------------------------------
//-------------------COMBINED BASE TYPE POOL------------------------------
//------------------------------------------------------------------------
//========================================================================
//-------------------STAT REQUIREMENT REBALANCE (2026)----------------------
//========================================================================
// Enforces meaningful investment for 100 levels / 5 pts per level + gear.
// Progressive curves: early (10-40) forgiving ~0.60, ramps to 0.85 at 88 for pure and 0.55 for hybrid.
// Keeps early levels (<=10) untouched so starter gear remains free.
// Pure at 88 ~390 (was 338), hybrid at 60 ~166->~182 now requires gear.
(() => {
    // Progressive: factor grows from 0.60@10 to 0.85@88 for pure, 0.40->0.55 for hybrid. Jewelry scaled 0.10 lower.
    const pureForLvlArmor = (lvl) => {
        if (lvl <= 10) return null;
        const t = Math.min(1, (lvl - 10) / 78); // 0 at 10, 1 at 88
        const factor = 0.60 + 0.25 * t; // 0.60 -> 0.85
        return Math.round(20 + (lvl - 1) * 5 * factor);
    };
    const hybridForLvlArmor = (lvl) => {
        // Only rebalance hybrids from 40 onward; early hybrids stay free as originally
        if (lvl < 40) return null;
        return Math.round(20 + (lvl - 1) * 2.75); // linear 0.55 so 60->182 (+12), 88->259
    };
    const pureForLvlJewelry = (lvl) => {
        if (lvl <= 10) return null;
        const t = Math.min(1, (lvl - 10) / 78);
        const factor = 0.50 + 0.18 * t; // 0.50 -> 0.68
        return Math.round(16 + (lvl - 1) * 5 * factor);
    };
    const hybridForLvlJewelry = (lvl) => {
        if (lvl < 40) return null;
        return Math.round(16 + (lvl - 1) * 2.20);
    };
    const pureForLvl = (lvl, isJewelry) => isJewelry ? pureForLvlJewelry(lvl) : pureForLvlArmor(lvl);
    const hybridForLvl = (lvl, isJewelry) => isJewelry ? hybridForLvlJewelry(lvl) : hybridForLvlArmor(lvl);
    const JEWELRY_SLOTS = new Set(['ring','earring','amulet','talisman']);
    const ARMOR_SLOTS = new Set(['head','chest','pants','shoulders','cloak','bracers','gloves','boots','belt','weapon','shield','ranged','arcane']);

    function isPure(b) {
        return b.archetype === 'strength' || b.archetype === 'agility' || b.archetype === 'intellect';
    }
    function isHybrid(b) {
        return b.archetype === 'str_agi' || b.archetype === 'str_int' || b.archetype === 'agi_int';
    }

    const allArrays = [EG_BASE_TYPES_HEAD, EG_BASE_TYPES_CHEST, EG_BASE_TYPES_PANTS, EG_BASE_TYPES_SHOULDERS, EG_BASE_TYPES_CLOAK, EG_BASE_TYPES_BRACERS, EG_BASE_TYPES_GLOVES, EG_BASE_TYPES_BOOTS, EG_BASE_TYPES_BELT, EG_BASE_TYPES_WEAPON, EG_BASE_TYPES_SHIELD, EG_BASE_TYPES_ARCANE, EG_BASE_TYPES_RANGED, EG_BASE_TYPES_EARRING, EG_BASE_TYPES_RING, EG_BASE_TYPES_AMULET, EG_BASE_TYPES_TALISMAN];
    for (const arr of allArrays) {
        for (const b of arr) {
            const lvl = b.minLevel || b.requirements.level;
            if (lvl <= 10) continue;
            const isJewelry = JEWELRY_SLOTS.has(b.slotType);
            if (!ARMOR_SLOTS.has(b.slotType) && !isJewelry) continue;
            if (isPure(b)) {
                const neu = pureForLvl(lvl, isJewelry);
                if (neu == null) continue;
                // Only raise, never lower (keeps some jewelry flex items like any archetype 0-req untouched)
                const cur = b.archetype === 'strength' ? b.requirements.str : b.archetype === 'agility' ? b.requirements.agi : b.requirements.int;
                if (cur > 0 && neu > cur) {
                    if (b.archetype === 'strength') b.requirements.str = neu;
                    else if (b.archetype === 'agility') b.requirements.agi = neu;
                    else if (b.archetype === 'intellect') b.requirements.int = neu;
                } else if (cur === 0 && isJewelry && b.archetype !== 'any') {
                    // jewelry pure that was 0 stays 0? Keep original if archetype is any. For str/agi/int jewelry with 0 (shouldn't happen) keep 0.
                }
            } else if (isHybrid(b)) {
                const neu = hybridForLvl(lvl, isJewelry);
                if (neu == null) continue;
                const curStr = b.requirements.str || 0, curAgi = b.requirements.agi || 0, curInt = b.requirements.int || 0;
                const cur = Math.max(curStr,curAgi,curInt);
                if (neu > cur) {
                    if (b.archetype === 'str_agi') { b.requirements.str = neu; b.requirements.agi = neu; }
                    else if (b.archetype === 'str_int') { b.requirements.str = neu; b.requirements.int = neu; }
                    else if (b.archetype === 'agi_int') { b.requirements.agi = neu; b.requirements.int = neu; }
                }
            }
        }
    }

    // Add missing high-tier hybrid bases (70/80/88) for every armor slot that lacks them,
    // using the same hybridForLvl curve. Weapons/ranged are pure-only and excluded.
    const HYBRID_LEVELS = [70, 80, 88];
    const hybridSlots = [
        { arr: EG_BASE_TYPES_HEAD, slot: 'head' },
        { arr: EG_BASE_TYPES_CHEST, slot: 'chest' },
        { arr: EG_BASE_TYPES_PANTS, slot: 'pants' },
        { arr: EG_BASE_TYPES_SHOULDERS, slot: 'shoulders' },
        { arr: EG_BASE_TYPES_CLOAK, slot: 'cloak' },
        { arr: EG_BASE_TYPES_BRACERS, slot: 'bracers' },
        { arr: EG_BASE_TYPES_GLOVES, slot: 'gloves' },
        { arr: EG_BASE_TYPES_BOOTS, slot: 'boots' },
        { arr: EG_BASE_TYPES_BELT, slot: 'belt' },
    ];
    const archs = ['str_agi','str_int','agi_int'];
    const labelMap = { str_agi: 'Skirmisher', str_int: 'Templar', agi_int: 'Mystic' };
    for (const { arr, slot } of hybridSlots) {
        for (const arch of archs) {
            for (const lvl of HYBRID_LEVELS) {
                if (arr.some(e => e.archetype === arch && e.minLevel === lvl)) continue;
                const neu = hybridForLvl(lvl);
                const req = { level: lvl, str: 0, agi: 0, int: 0 };
                if (arch === 'str_agi') { req.str = neu; req.agi = neu; }
                else if (arch === 'str_int') { req.str = neu; req.int = neu; }
                else { req.agi = neu; req.int = neu; }
                // interpolated defenses from nearest pure relatives, scaled 0.62 (same as auto-fill)
                const pureA = arch === 'str_agi' ? 'strength' : arch === 'str_int' ? 'strength' : 'agility';
                const pureB = arch === 'str_agi' ? 'agility' : arch === 'str_int' ? 'intellect' : 'intellect';
                const getPureDef = (pure, lvl2) => {
                    const list = arr.filter(e => e.archetype === pure).sort((a,b)=>a.minLevel-b.minLevel);
                    let lower = null, upper = null;
                    for (const e of list) { if (e.minLevel <= lvl2) lower=e; if (e.minLevel >= lvl2 && !upper && e.minLevel>=lvl2) upper=e; }
                    const src = lower || upper;
                    return src ? src.defenses : { armour:0, evasion:0, absorption:0 };
                };
                const defA = getPureDef(pureA, lvl);
                const defB = getPureDef(pureB, lvl);
                let def = { armour:0, evasion:0, absorption:0 };
                if (arch === 'str_agi') def = { armour: Math.round((defA.armour||0)*0.62), evasion: Math.round((defB.evasion||0)*0.62), absorption:0 };
                else if (arch === 'str_int') def = { armour: Math.round((defA.armour||0)*0.62), evasion:0, absorption: Math.round((defB.absorption||0)*0.62) };
                else def = { armour:0, evasion: Math.round((defA.evasion||0)*0.62), absorption: Math.round((defB.absorption||0)*0.62) };
                arr.push({ id: `${slot}_${arch}_${lvl}_rebal`, name: `${labelMap[arch]} ${slot} ${lvl}`, nameDe: `${labelMap[arch]}-${slot} ${lvl}`, archetype: arch, slotType: slot, minLevel: lvl, requirements: req, defenses: def });
            }
        }
    }
})();


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
    const baseName = (LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
    const item = {
        // Identity
        id: `${base.id}_${Date.now()}`,
        baseId: base.id,
        name: baseName,
        icon: base.icon || EG_SLOT_ICONS[base.slotType] || '📦',
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
        ...(base.damage ? { damage: { ...base.damage }, attackIntervalSeconds: base.attackIntervalSeconds } : {}),
        ...(base.hands ? { hands: base.hands } : {}),
        ...(base.blockChance ? { blockChance: base.blockChance } : {}),
    };

    return item;
}